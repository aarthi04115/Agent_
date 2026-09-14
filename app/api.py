import os
import sqlite3
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, field_validator

from app.ai import AIConfigurationError, AIProviderError, AIService
from app.assistant_safety import UNSAFE_MEDICAL_RESPONSE, is_unsafe_medical_request
from app.assistant_tools import record_period, schedule_reminder
from app.assistant_intent import is_personal_data_question
from app.personal_data import format_personal_cycle_context, get_personal_cycle_data

from app.database import (
    create_database,
    create_user,
    get_family_period_dates,
    get_user_by_email,
    get_user_by_id,
    get_user_period_dates,
    get_reminder_settings,
    get_user_notifications,
    replace_user_notifications,
    save_reminder_settings,
    save_user_period_date,
)

from app.cycle import (
    calculate_average_cycle,
    predict_next_period
)


app = FastAPI()
create_database()
cors_origins_raw = os.getenv("CORS_ORIGINS")
if cors_origins_raw:
    allowed_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
else:
    allowed_origins = [
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:19006",
        "http://localhost:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("MENSTRUAL_AGENT_SECRET", "change-this-secret-before-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def seed_demo_users():
    demo_password = os.getenv("CYCLECARE_DEMO_PASSWORD", "cyclecare123")
    demo_users = (
        ("Harini", "harini@cyclecare.local", "user"),
        ("Hemalatha", "hemalatha@cyclecare.local", "mom")
    )

    for name, email, role in demo_users:
        if get_user_by_email(email) is None:
            create_user(name, email, password_context.hash(demo_password), role)


if os.getenv("CYCLECARE_SEED_DEMO") == "1":
    seed_demo_users()


# -------------------------
# Request model
# -------------------------

class PeriodRequest(BaseModel):
    start_date: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ReminderSettingsRequest(BaseModel):
    period_checkin_enabled: bool
    upcoming_enabled: bool
    upcoming_timing: str
    timezone: str = "Asia/Kolkata"


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    confirm: bool = False

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message must not be empty")
        return value


class AssistantResponse(BaseModel):
    response: str
    action: str | None = None


ASSISTANT_SYSTEM_PROMPT = (
    "You are CycleCare's wellness assistant. Provide concise, general menstrual "
    "cycle and wellness information. Do not diagnose medical conditions or "
    "present cycle predictions as certain. For concerning symptoms, recommend "
    "speaking with a qualified healthcare professional. Use only verified "
    "personal data included by CycleCare. Never invent dates or calculations."
)

EMPTY_PERSONAL_DATA_RESPONSE = (
    "You don't have any period dates recorded yet."
)


ai_service = AIService()


def create_access_token(user_id):
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expires_at},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def current_user(token=Depends(oauth2_scheme)):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
    except (JWTError, ValueError):
        raise credentials_error

    user = get_user_by_id(user_id)
    if user is None:
        raise credentials_error

    return user


def target_daughter(user=Depends(current_user)):
    if user[4] == "user":
        return user
    if user[4] == "mom":
        rows = get_family_period_dates()
        if not rows:
            raise HTTPException(status_code=400, detail="No daughter accounts found to manage.")
        target_id = rows[0][0]
        return get_user_by_id(target_id)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only daughters and moms can access this"
    )


def period_result(user_id):
    rows = get_user_period_dates(user_id)
    period_dates = [datetime.strptime(row[0], "%Y-%m-%d") for row in rows]
    result = {
        "periods": [row[0] for row in rows],
        "cycle_lengths": [
            (period_dates[index].date() - period_dates[index - 1].date()).days
            for index in range(1, len(period_dates))
        ],
        "average_cycle": None,
        "predicted_next_period": None,
        "current_cycle_day": None
    }

    if period_dates:
        result["current_cycle_day"] = max(
            1,
            (datetime.today().date() - period_dates[-1].date()).days + 1
        )

    if len(period_dates) >= 2:
        average_cycle = calculate_average_cycle(period_dates)
        next_period = predict_next_period(period_dates[-1], average_cycle)
        result["average_cycle"] = round(average_cycle, 2)
        result["predicted_next_period"] = next_period.strftime("%Y-%m-%d")

    return result


def reminder_settings_result(user_id):
    row = get_reminder_settings(user_id)
    if row is None:
        save_reminder_settings(
            user_id,
            True,
            True,
            "3_days",
            "Asia/Kolkata",
            datetime.utcnow().isoformat()
        )
        row = get_reminder_settings(user_id)

    return {
        "period_checkin_enabled": bool(row[0]),
        "upcoming_enabled": bool(row[1]),
        "upcoming_timing": row[2],
        "timezone": row[3],
        "updated_at": row[4]
    }


def reconcile_notifications_for_user(user_id):
    settings = reminder_settings_result(user_id)
    result = period_result(user_id)
    prediction = result["predicted_next_period"]
    notifications = []

    if prediction:
        try:
            timezone = ZoneInfo(settings["timezone"])
        except ZoneInfoNotFoundError:
            timezone = ZoneInfo("Asia/Kolkata")

        prediction_date = datetime.strptime(prediction, "%Y-%m-%d").date()
        now = datetime.now(timezone)

        def add_notification(notification_type, target_date):
            scheduled = datetime.combine(
                target_date,
                time(hour=9),
                timezone
            )
            if scheduled >= now:
                notifications.append({
                    "notification_type": notification_type,
                    "scheduled_for": scheduled.isoformat(),
                    "prediction_date": prediction
                })

        if settings["period_checkin_enabled"]:
            add_notification("period_checkin", prediction_date)

        if settings["upcoming_enabled"]:
            if settings["upcoming_timing"] in ("3_days", "both"):
                add_notification("upcoming_3_days", prediction_date - timedelta(days=3))
            if settings["upcoming_timing"] in ("1_day", "both"):
                add_notification("upcoming_1_day", prediction_date - timedelta(days=1))

    replace_user_notifications(
        user_id,
        notifications,
        datetime.utcnow().isoformat()
    )
    return notifications


def notification_payload(row):
    return {
        "id": row[0],
        "notification_type": row[1],
        "scheduled_for": row[2],
        "prediction_date": row[3],
        "status": row[4]
    }


# -------------------------
# Home endpoint
# -------------------------

@app.get("/")
def home():
    return {
        "message": "Menstrual Agent API is running"
    }


@app.post(
    "/assistant",
    response_model=AssistantResponse,
    response_model_exclude_none=True
)
def assistant(request: AssistantRequest, user=Depends(current_user)):
    try:
        if is_unsafe_medical_request(request.message):
            return AssistantResponse(response=UNSAFE_MEDICAL_RESPONSE)

        lowered_message = request.message.lower()
        record_requested = any(phrase in lowered_message for phrase in (
            "my period started today",
            "period started today",
            "record my period today",
            "log my period today",
        ))
        
        target_user = target_daughter(user)
        
        if record_requested:
            if not request.confirm:
                return AssistantResponse(
                    response="Would you like me to record today as the start of your period?",
                    action="confirm_record_period"
                )

            tool_result = record_period(
                target_user,
                datetime.today().strftime("%Y-%m-%d")
            )
            if not tool_result["inserted"]:
                return AssistantResponse(
                    response="Today's period date is already recorded."
                )
            schedule_reminder(target_user[0], reconcile_notifications_for_user)
            cycle_data = tool_result["cycle_data"]
            prediction = cycle_data["predicted_next_period"]
            prediction_text = (
                f" Your next estimated period is {prediction}."
                if prediction else " Record another period to receive a new estimate."
            )
            return AssistantResponse(
                response=f"Period recorded successfully.{prediction_text}"
            )

        prompt = request.message
        if is_personal_data_question(request.message):
            personal_data = get_personal_cycle_data(target_user[0])
            if not personal_data["period_history"]:
                return AssistantResponse(response=EMPTY_PERSONAL_DATA_RESPONSE)
            prompt = (
                f"{format_personal_cycle_context(personal_data)}\n\n"
                f"User question: {request.message}"
            )

        response = ai_service.generate_response(
            prompt,
            system_prompt=ASSISTANT_SYSTEM_PROMPT
        )
    except AIConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except AIProviderError as error:
        raise HTTPException(
            status_code=502,
            detail="The AI provider is temporarily unavailable."
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="The assistant could not process the request."
        ) from error

    return AssistantResponse(response=response)


@app.post("/register")
def register(request: RegisterRequest):
    role = request.role.lower()
    if role not in ("user", "mom"):
        raise HTTPException(status_code=400, detail="Role must be user or mom")
    if not request.password:
        raise HTTPException(status_code=400, detail="Password is required")

    try:
        user_id = create_user(
            request.name,
            request.email.lower(),
            password_context.hash(request.password),
            role
        )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Email is already registered")

    return {"id": user_id, "name": request.name, "email": request.email.lower(), "role": role}


@app.post("/login")
def login(request: LoginRequest):
    user = get_user_by_email(request.email.lower())
    if user is None or not password_context.verify(request.password, user[3]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "access_token": create_access_token(user[0]),
        "token_type": "bearer",
        "user": {
            "id": user[0],
            "name": user[1],
            "email": user[2],
            "role": user[4]
        }
    }


# -------------------------
# GET all period dates
# -------------------------

@app.get("/periods")
def get_periods(user=Depends(current_user)):
    return period_result(user[0])


# -------------------------
# POST a new period date
# -------------------------

@app.post("/periods")
def add_period(period: PeriodRequest, user=Depends(target_daughter)):

    # 1. Validate the date
    try:
        date_obj = datetime.strptime(
            period.start_date,
            "%Y-%m-%d"
        )

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date. Use YYYY-MM-DD.")

    # 2. Convert to consistent database format
    formatted_date = date_obj.strftime(
        "%Y-%m-%d"
    )

    # 3. Save the period date for the authenticated daughter
    inserted = save_user_period_date(user[0], formatted_date)
    if not inserted:
        raise HTTPException(status_code=409, detail="This period date is already recorded")

    result = period_result(user[0])
    reconcile_notifications_for_user(user[0])
    return {
        "message": "Period recorded successfully",
        "start_date": formatted_date,
        "average_cycle": result["average_cycle"],
        "predicted_next_period": result["predicted_next_period"]
    }


@app.get("/reminders/settings")
def get_reminder_settings_endpoint(user=Depends(target_daughter)):
    return reminder_settings_result(user[0])


@app.put("/reminders/settings")
def update_reminder_settings(request: ReminderSettingsRequest,
                             user=Depends(target_daughter)):
    if request.upcoming_timing not in ("3_days", "1_day", "both"):
        raise HTTPException(
            status_code=400,
            detail="upcoming_timing must be 3_days, 1_day, or both"
        )

    try:
        ZoneInfo(request.timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=400, detail="Unknown timezone")

    save_reminder_settings(
        user[0],
        request.period_checkin_enabled,
        request.upcoming_enabled,
        request.upcoming_timing,
        request.timezone,
        datetime.utcnow().isoformat()
    )
    reconcile_notifications_for_user(user[0])
    return reminder_settings_result(user[0])


@app.get("/reminders")
def get_reminders(user=Depends(target_daughter)):
    notifications = reconcile_notifications_for_user(user[0])
    rows = get_user_notifications(user[0])
    return {"reminders": [notification_payload(row) for row in rows]}


@app.post("/reminders/reconcile")
def reconcile_reminders(user=Depends(target_daughter)):
    reconcile_notifications_for_user(user[0])
    rows = get_user_notifications(user[0])
    return {"reminders": [notification_payload(row) for row in rows]}


@app.get("/family/periods")
def get_family_periods(user=Depends(current_user)):

    family = {}
    for user_id, name, role, start_date in get_family_period_dates():
        family.setdefault(user_id, {"name": name, "role": role, "periods": []})
        family[user_id]["periods"].append(start_date)

    for user_id, details in family.items():
        result = period_result(user_id)
        details["average_cycle"] = result["average_cycle"]
        details["predicted_next_period"] = result["predicted_next_period"]
        details["current_cycle_day"] = result["current_cycle_day"]

    return {"family": list(family.values())}