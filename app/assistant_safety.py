UNSAFE_MEDICAL_PHRASES = (
    "do i have pcos",
    "do i have endometriosis",
    "do i have infertility",
    "diagnose me",
    "diagnose my",
    "what disease do i have",
    "is this a hormonal disorder",
    "do i have a hormonal disorder",
    "what hormonal disorder do i have",
    "cure my",
    "treat my",
)


def is_unsafe_medical_request(message: str) -> bool:
    normalized = " ".join(message.lower().split())
    return any(phrase in normalized for phrase in UNSAFE_MEDICAL_PHRASES)


UNSAFE_MEDICAL_RESPONSE = (
    "I can't diagnose or treat medical conditions. For concerning symptoms or "
    "persistent changes, please speak with a qualified healthcare professional."
)
