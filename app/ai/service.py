import os
from typing import Any

from dotenv import load_dotenv
from groq import Groq

load_dotenv()


class AIConfigurationError(RuntimeError):
    """Raised when the server-side AI configuration is incomplete."""


class AIProviderError(RuntimeError):
    """Raised when the configured provider cannot generate a response."""


class AIService:
    """Small provider boundary for server-side text generation."""

    def __init__(self, api_key: str | None = None, model: str | None = None,
                 client: Any | None = None):
        self._api_key = api_key or os.getenv("AI_API_KEY")
        self.model = model or os.getenv("AI_MODEL", "llama-3.1-8b-instant")
        self._client = client

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client
        if not self._api_key:
            raise AIConfigurationError(
                "AI_API_KEY is not configured on the server."
            )
        self._client = Groq(api_key=self._api_key)
        return self._client

    def generate_response(self, prompt: str, system_prompt: str | None = None) -> str:
        if not prompt or not prompt.strip():
            raise ValueError("prompt must not be empty")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = self._get_client().chat.completions.create(
                model=self.model,
                messages=messages,
            )
        except AIConfigurationError:
            raise
        except Exception as error:
            raise AIProviderError("AI provider request failed.") from error

        return response.choices[0].message.content or ""
