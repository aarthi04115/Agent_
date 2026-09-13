from datetime import datetime
from app.api import app

from database import (
    create_database,
    save_period_date,
    get_period_dates
)

from cycle import (
    calculate_average_cycle,
    predict_next_period
)

from reminder import reminder


def main():

    # 1. Make sure database exists
    create_database()

    # 2. Ask user for a new period date
    start_date = input(
        "Enter your period start date (DD/MM/YYYY): "
    )
    try:
        date_obj = datetime.strptime(
            start_date,
            "%d/%m/%Y"
        )
    except ValueError:
        print("Invalid date. Please use DD/MM/YYYY.")
        return

    # 3. Validate the date
    date_obj = datetime.strptime(
        start_date,
        "%d/%m/%Y"
    )

    # 4. Save it in database
    save_period_date(
        date_obj.strftime("%Y-%m-%d")
    )

    # 5. Get all previous dates
    rows = get_period_dates()

    # 6. Convert database strings to datetime
    period_dates = []

    for row in rows:
        date_obj = datetime.strptime(
            row[0],
            "%Y-%m-%d"
        )

        period_dates.append(date_obj)

    # 7. Show history
    print("\nYour period history:")

    for date in period_dates:
        print(date.strftime("%d/%m/%Y"))

    # 8. Calculate cycle
    if len(period_dates) >= 2:

        average_cycle = calculate_average_cycle(
            period_dates
        )

        print(
            "\nAverage cycle:",
            round(average_cycle, 2),
            "days"
        )

        # 9. Predict next period
        last_date = period_dates[-1]

        next_period = predict_next_period(
            last_date,
            average_cycle
        )

        print(
            "Predicted next period:",
            next_period.strftime("%d/%m/%Y")
        )

        # 10. Check reminder
        today = datetime.today()

        answer = reminder(
            next_period,
            today
        )
        if(answer == "yes"):
            save_period_date(
                today.strftime("%Y-%m-%d")
            )

            rows = get_period_dates()
            period_dates = [
                datetime.strptime(row[0], "%Y-%m-%d")
                for row in rows
            ]

            updated_average_cycle = calculate_average_cycle(
                period_dates
            )
            updated_next_period = predict_next_period(
                period_dates[-1],
                updated_average_cycle
            )

            print("Period recorded successfully.")
            print(
                "Updated average cycle:",
                round(updated_average_cycle, 2),
                "days"
            )
            print(
                "New predicted next period:",
                updated_next_period.strftime("%d/%m/%Y")
            )
        elif(answer == "no"):
            print("Your period was not recorded.")
        else:
            print("No reminder due today.")
    else:
        print(
            "\nAdd at least one more period date "
            "to calculate your cycle."
        )


if __name__ == "__main__":
    main()