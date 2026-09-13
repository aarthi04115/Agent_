from datetime import datetime
from typing import Callable

from app.cycle import calculate_average_cycle, predict_next_period
from app.database import save_user_period_date
from app.personal_data import get_personal_cycle_data


def get_period_history(user_id: int) -> dict:
    """Read the authenticated user's cycle data without changing the database."""
    return get_personal_cycle_data(user_id)


def calculate_cycle(period_history: list[str]) -> dict:
    dates = [datetime.strptime(value, "%Y-%m-%d") for value in period_history]
    lengths = [
        (dates[index] - dates[index - 1]).days
        for index in range(1, len(dates))
    ]
    average = round(calculate_average_cycle(dates), 2) if len(dates) >= 2 else None
    return {"cycle_lengths": lengths, "average_cycle": average}


def predict_period(period_history: list[str], average_cycle: float | None = None) -> str | None:
    if not period_history:
        return None
    if average_cycle is None:
        calculated = calculate_cycle(period_history)
        average_cycle = calculated["average_cycle"]
    if average_cycle is None:
        return None
    last_date = datetime.strptime(period_history[-1], "%Y-%m-%d")
    return predict_next_period(last_date, average_cycle).strftime("%Y-%m-%d")


def record_period(user: tuple, start_date: str) -> dict:
    """Record only for an authenticated daughter after explicit confirmation."""
    if user[4] not in ("user", "sister"):
        raise PermissionError("Only daughter accounts can record periods")

    try:
        parsed_date = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError as error:
        raise ValueError("Invalid date. Use YYYY-MM-DD.") from error

    formatted_date = parsed_date.strftime("%Y-%m-%d")
    inserted = save_user_period_date(user[0], formatted_date)
    return {
        "inserted": inserted,
        "start_date": formatted_date,
        "cycle_data": get_period_history(user[0]),
    }


def schedule_reminder(user_id: int, scheduler: Callable[[int], object]) -> object:
    """Delegate scheduling to the existing reminder service boundary."""
    return scheduler(user_id)
