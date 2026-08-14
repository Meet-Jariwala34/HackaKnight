"""Environment-driven configuration. No secrets or model names hardcoded elsewhere."""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _env(name: str, default: str | None = None, *, required: bool = False) -> str:
    value = os.environ.get(name, default)
    if required and not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value or ""


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_model: str
    groq_eval_model: str

    whisper_model: str
    whisper_device: str
    whisper_compute_type: str

    kokoro_voice: str

    # Optional: URL of the backend's WebSocket endpoint. Empty = notifications
    # are a no-op, engine runs fully standalone (see BackendNotifier).
    backend_ws_url: str

    log_level: str

    @classmethod
    def load(cls) -> "Settings":
        return cls(
            groq_api_key=_env("GROQ_API_KEY", required=True),
            groq_model=_env("GROQ_MODEL", "llama-3.3-70b-versatile"),
            groq_eval_model=_env("GROQ_EVAL_MODEL", "llama-3.3-70b-versatile"),
            whisper_model=_env("WHISPER_MODEL", "distil-medium.en"),
            whisper_device=_env("WHISPER_DEVICE", "auto"),
            whisper_compute_type=_env("WHISPER_COMPUTE_TYPE", "default"),
            kokoro_voice=_env("KOKORO_VOICE", "af_heart"),
            backend_ws_url=_env("BACKEND_WS_URL", ""),
            log_level=_env("LOG_LEVEL", "INFO"),
        )
