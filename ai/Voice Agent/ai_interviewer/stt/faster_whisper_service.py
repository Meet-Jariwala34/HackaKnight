"""STT factory. Wraps pipecat's built-in Faster-Whisper integration rather
than reimplementing model loading/transcription — swap the model or device
via Settings/env, no code changes needed elsewhere.
"""

from __future__ import annotations

from pipecat.services.whisper.stt import WhisperSTTService

from ai_interviewer.config.settings import Settings

# Segments whose Whisper no-speech probability exceeds this are dropped
# before they ever become a TranscriptionFrame. Filters out breathing,
# background noise, and dead air without a separate VAD pass.
_NO_SPEECH_PROB_THRESHOLD = 0.6


def create_whisper_stt_service(settings: Settings) -> WhisperSTTService:
    return WhisperSTTService(
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
        settings=WhisperSTTService.Settings(
            model=settings.whisper_model, no_speech_prob=_NO_SPEECH_PROB_THRESHOLD
        ),
    )


def is_meaningful_transcript(text: str) -> bool:
    """Defense-in-depth filter for empty/whitespace transcripts reaching the LLM."""
    return bool(text and text.strip())
