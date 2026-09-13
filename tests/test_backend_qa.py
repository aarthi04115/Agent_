import sys
from pathlib import Path
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import api
from app.database import create_database, create_user, get_user_by_email, save_user_period_date, get_user_period_dates

create_database()


def get_client_for_test(email="daughter@example.com", role="user", name="Test Daughter"):
    existing = get_user_by_email(email)
    if existing is None:
        user_id = create_user(name, email, api.password_context.hash("password123"), role)
        existing = (user_id, name, email, "password123", role)
    
    token = api.create_access_token(existing[0])
    client = TestClient(api.app)
    headers = {"Authorization": f"Bearer {token}"}
    return client, headers, existing


def test_auth_registration_and_login():
    client = TestClient(api.app)
    email = "qadaughter_reg@cyclecare.test"
    # Register daughter
    reg_res = client.post("/register", json={
        "name": "QA Daughter",
        "email": email,
        "password": "password123",
        "role": "user"
    })
    assert reg_res.status_code in (200, 409)

    # Login daughter
    login_res = client.post("/login", json={
        "email": email,
        "password": "password123"
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "user"


def test_daughter_period_recording_and_duplicate_prevention():
    client, headers, _ = get_client_for_test(email="daughter101@test.com", role="user")
    
    # Record period date
    res = client.post("/periods", json={"start_date": "2026-08-01"}, headers=headers)
    assert res.status_code in (200, 409)
    if res.status_code == 200:
        assert res.json()["start_date"] == "2026-08-01"

    # Attempt duplicate period date
    dup_res = client.post("/periods", json={"start_date": "2026-08-01"}, headers=headers)
    assert dup_res.status_code == 409
    assert "already recorded" in dup_res.json()["detail"]


def test_cycle_calculation_and_prediction():
    client, headers, user = get_client_for_test(email="daughter102@test.com", role="sister")
    save_user_period_date(user[0], "2026-06-01")
    save_user_period_date(user[0], "2026-06-30")  # 29 day cycle

    res = client.get("/periods", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["average_cycle"] == 29.0
    assert data["predicted_next_period"] == "2026-07-29"


def test_mom_role_rbac_restrictions():
    client, mom_headers, _ = get_client_for_test(email="mom_rbac@test.com", role="mom", name="Mom User")

    # Mom attempting to record period directly -> 403 Forbidden
    res_period = client.post("/periods", json={"start_date": "2026-09-01"}, headers=mom_headers)
    assert res_period.status_code == 403

    # Mom attempting to access daughter reminders -> 403 Forbidden
    res_reminders = client.get("/reminders", headers=mom_headers)
    assert res_reminders.status_code == 403

    # Mom viewing family dashboard -> 200 OK
    res_family = client.get("/family/periods", headers=mom_headers)
    assert res_family.status_code == 200


def test_assistant_period_record_confirmation_workflow():
    client, headers, _ = get_client_for_test(email="confirm_test@test.com", role="user")

    # Asking assistant to log period without confirm=True
    res_unconfirmed = client.post("/assistant", json={
        "message": "My period started today",
        "confirm": False
    }, headers=headers)
    assert res_unconfirmed.status_code == 200
    unconfirmed_data = res_unconfirmed.json()
    assert unconfirmed_data.get("action") == "confirm_record_period"
    assert "record" in unconfirmed_data["response"].lower()

    # Asking assistant to log period with confirm=True
    res_confirmed = client.post("/assistant", json={
        "message": "My period started today",
        "confirm": True
    }, headers=headers)
    assert res_confirmed.status_code == 200
    assert "recorded" in res_confirmed.json()["response"].lower()


def test_ai_medical_safety_interception():
    client, headers, _ = get_client_for_test(email="safety_test@test.com", role="user")

    unsafe_queries = [
        "Do I have PCOS?",
        "Diagnose my hormonal disorder",
        "How can I cure my endometriosis?"
    ]
    for query in unsafe_queries:
        res = client.post("/assistant", json={"message": query}, headers=headers)
        assert res.status_code == 200
        assert "can't diagnose or treat medical conditions" in res.json()["response"]


def test_cross_user_isolation():
    client1, headers1, u1 = get_client_for_test(email="user401@test.com", role="user")
    client2, headers2, u2 = get_client_for_test(email="user402@test.com", role="user")

    # User 1 records period
    save_user_period_date(u1[0], "2026-05-10")

    # User 2 checks period history
    res2 = client2.get("/periods", headers=headers2)
    assert res2.status_code == 200
    assert "2026-05-10" not in res2.json()["periods"]
