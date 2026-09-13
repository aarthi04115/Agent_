from datetime import datetime

from app.cycle import calculate_average_cycle, predict_next_period
from app.database import get_user_period_dates


def get_personal_cycle_data(user_id: int) -> dict:
    """Return only the authenticated user's deterministic cycle information."""
    rows = get_user_period_dates(user_id)
    period_dates = [datetime.strptime(row[0], "%Y-%m-%d") for row in rows]
    period_history = [date.strftime("%Y-%m-%d") for date in period_dates]
    cycle_lengths = [
        (period_dates[index] - period_dates[index - 1]).days
        for index in range(1, len(period_dates))
    ]

    average_cycle = None
    predicted_next_period = None
    variation = None
    pattern_summary = "not enough records"
    if len(period_dates) >= 2:
        average_cycle = round(calculate_average_cycle(period_dates), 2)
        predicted_next_period = predict_next_period(
            period_dates[-1],
            average_cycle
        ).strftime("%Y-%m-%d")
        variation = max(cycle_lengths) - min(cycle_lengths)
        pattern_summary = "varied" if variation > 2 else "fairly consistent"

    return {
        "period_history": period_history,
        "cycle_lengths": cycle_lengths,
        "average_cycle": average_cycle,
        "predicted_next_period": predicted_next_period,
        "cycle_variation": variation,
        "pattern_summary": pattern_summary,
    }


def format_personal_cycle_context(cycle_data: dict) -> str:
    """Format verified values for the AI without exposing internal identifiers."""
    history = cycle_data["period_history"]
    if not history:
        return "Personal cycle data: no period dates are recorded."

    return "\n".join([
        "Personal cycle data (verified by CycleCare):",
        f"- Recorded periods: {', '.join(history)}",
        f"- Cycle lengths: {cycle_data['cycle_lengths'] or 'not enough records'}",
        f"- Average cycle: {cycle_data['average_cycle'] or 'not enough records'}",
        f"- Predicted next period: {cycle_data['predicted_next_period'] or 'not enough records'}",
        f"- Pattern summary: {cycle_data['pattern_summary']}",
    ])
