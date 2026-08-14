"""Groq abstraction: one factory for the streaming pipeline LLM, one thin
async client for the one-shot (non-streaming) evaluation call.

Model names are never hardcoded outside Settings — swapping models is an
env var change, not a code change.
"""

from __future__ import annotations

import asyncio
import json
import logging

import groq

from ai_interviewer.config.settings import Settings

logger = logging.getLogger(__name__)

_RETRYABLE = (groq.APIConnectionError, groq.APITimeoutError, groq.RateLimitError)
_MAX_ATTEMPTS = 3
_BASE_BACKOFF_SECONDS = 1.5


class LLMError(Exception):
    """Raised when the Groq API fails after retries. Callers should degrade
    gracefully rather than crash the session."""


def create_groq_llm_service(settings: Settings) -> "GroqLLMService":
    """LLM node for the real-time voice pipeline (streaming).

    Local import: pipecat is only needed for the live pipeline, not for
    GroqCompletionClient (used by the evaluator), so importing this module
    doesn't drag in the pipecat dependency for callers that only evaluate.
    """
    from pipecat.services.groq.llm import GroqLLMService

    return GroqLLMService(
        api_key=settings.groq_api_key, settings=GroqLLMService.Settings(model=settings.groq_model)
    )


class GroqCompletionClient:
    """Non-streaming completions for the evaluator, off the voice-latency path."""

    def __init__(self, settings: Settings) -> None:
        self._client = groq.AsyncGroq(api_key=settings.groq_api_key)
        self._model = settings.groq_eval_model

    async def complete_json(self, messages: list[dict], *, temperature: float = 0.2) -> dict:
        """Runs a chat completion constrained to JSON output, with retries.

        Raises LLMError if the API keeps failing or the model returns text
        that isn't valid JSON after all attempts.
        """
        last_error: Exception | None = None
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    temperature=temperature,
                    response_format={"type": "json_object"},
                    timeout=30,
                )
                content = response.choices[0].message.content
                return json.loads(content)
            except _RETRYABLE as exc:
                last_error = exc
                logger.warning("Groq API transient error (attempt %d/%d): %s", attempt, _MAX_ATTEMPTS, exc)
                await asyncio.sleep(_BASE_BACKOFF_SECONDS * attempt)
            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning("Groq returned non-JSON content (attempt %d/%d)", attempt, _MAX_ATTEMPTS)
            except groq.APIStatusError as exc:
                logger.error("Groq API error (non-retryable): %s", exc)
                raise LLMError(f"Groq API error: {exc}") from exc

        raise LLMError(f"Groq completion failed after {_MAX_ATTEMPTS} attempts: {last_error}")
