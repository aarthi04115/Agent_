PERSONAL_INTENT_PHRASES = (
    "my last period",
    "my period history",
    "my recorded periods",
    "my periods",
    "my average cycle",
    "my recent cycles",
    "my cycle length",
    "my next period",
    "my next predicted period",
    "my predicted period",
    "when was my period",
    "when is my next period",
    "show my history",
)


def is_personal_data_question(message: str) -> bool:
    normalized = " ".join(message.lower().split())
    return any(phrase in normalized for phrase in PERSONAL_INTENT_PHRASES)
