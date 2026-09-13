def reminder(predicted_date, today):

    if today >= predicted_date:
        print("\nYour period may have started.")

        answer = input(
            "Did your period start today? (yes/no): "
        )

        answer = answer.lower()

        while answer not in ("yes", "no"):
            print("Please enter yes or no.")
            answer = input(
                "Did your period start today? (yes/no): "
            ).lower()

        return answer

    return "not_due"