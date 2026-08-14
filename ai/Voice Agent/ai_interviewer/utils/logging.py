"""Structured event logging for the voice pipeline.

Never pass API keys/tokens as fields. Free-text candidate speech should be
truncated by the caller before logging (see interviewer.py) rather than
logged in full.
"""

from __future__ import annotations

import logging

_logger = logging.getLogger("ai_interviewer")


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def log_event(event: str, **fields: object) -> None:
    """Emit a structured event line, e.g. QUESTION_GENERATED action=... topic=..."""
    rendered = " ".join(f"{key}={value!r}" for key, value in fields.items())
    _logger.info("%s %s", event, rendered)
