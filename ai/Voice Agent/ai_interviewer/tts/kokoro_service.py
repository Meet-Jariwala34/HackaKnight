"""TTS factory. Wraps pipecat's built-in Kokoro integration — local,
streaming, no API key. Swap the voice via Settings/env."""

from __future__ import annotations

from pipecat.services.kokoro.tts import KokoroTTSService

from ai_interviewer.config.settings import Settings


def create_kokoro_tts_service(settings: Settings) -> KokoroTTSService:
    return KokoroTTSService(settings=KokoroTTSService.Settings(voice=settings.kokoro_voice))
