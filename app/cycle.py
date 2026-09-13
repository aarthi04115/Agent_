from datetime import datetime, timedelta


def calculate_average_cycle(period_dates):
    total_days = 0

    for i in range(1, len(period_dates)):
        difference = period_dates[i] - period_dates[i - 1]
        total_days += difference.days

    average_cycle = total_days / (len(period_dates) - 1)

    return average_cycle


def predict_next_period(last_date, average_cycle):
    cycle_days = round(average_cycle)

    predicted_date = last_date + timedelta(days=cycle_days)

    return predicted_date