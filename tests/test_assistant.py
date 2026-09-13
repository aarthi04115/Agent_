import os
import sys
from types import SimpleNamespace
from unittest.mock import patch
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import api
from app.ai import AIService


class FakeCompletions:
    def __init__(self, content="Test response"):
        self.calls = []
        self.content = content

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self.content))]
        )


def client_for_user(user_id=1, role="sister"):
    user = (user_id, "Aarthi", "aarthi@example.com", "unused", role)
    token = api.create_access_token(user_id)
    client = TestClient(api.app)
    return client, {"Authorization": f"Bearer {token}"}, user


def test_personal_question_uses_authenticated_user_data():
    fake = FakeCompletions()
    client, headers, user = client_for_user()
    rows = [("2026-06-10",), ("2026-07-09",)]

    with patch.object(api, "get_user_by_id", return_value=user), \
            patch("app.personal_data.get_user_period_dates", return_value=rows), \
            patch.object(api, "ai_service", AIService(client=SimpleNamespace(
                chat=SimpleNamespace(completions=fake)
            ))):
        response = client.post(
            "/assistant",
            json={"message": "What is my average cycle?"},
            headers=headers,
        )

    assert response.status_code == 200
    prompt = fake.calls[0]["messages"][-1]["content"]
    assert "2026-06-10" in prompt
    assert "2026-07-09" in prompt
    assert "29.0" in prompt
    assert "2026-08-07" in prompt
    assert "user_id" not in prompt


def test_empty_personal_history_is_safe():
    client, headers, user = client_for_user()

    with patch.object(api, "get_user_by_id", return_value=user), \
            patch("app.personal_data.get_user_period_dates", return_value=[]):
        response = client.post(
            "/assistant",
            json={"message": "When was my last period?"},
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json() == {
        "response": "You don't have any period dates recorded yet."
    }


def test_assistant_auth_and_provider_errors_are_safe():
    client, headers, user = client_for_user()

    with patch.dict(os.environ, {"AI_API_KEY": ""}), \
            patch.object(api, "get_user_by_id", return_value=user), \
            patch.object(api, "ai_service", AIService()):
        missing_key = client.post(
            "/assistant",
            json={"message": "What is a menstrual cycle?"},
            headers=headers,
        )

    assert missing_key.status_code == 503
    assert client.post(
        "/assistant", json={"message": "Hello"}
    ).status_code == 401
    assert client.post(
        "/assistant", json={"message": "   "}, headers=headers
    ).status_code == 422
