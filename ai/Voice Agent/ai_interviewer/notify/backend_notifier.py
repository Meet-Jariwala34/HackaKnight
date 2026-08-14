"""Pushes live interview events to the caller's backend over a WebSocket.

This is a client, not a server: it connects OUT to a URL the backend hosts.
Nothing is stored here and no port is opened by this process — once the
backend exposes a WebSocket endpoint, pointing BACKEND_WS_URL at it is the
entire integration.

Best-effort by design: a slow or unreachable backend must never add latency
to, or interrupt, the live voice pipeline. See README "Backend integration"
for the event protocol and the durability trade-off of doing this over a
single WebSocket instead of a retryable webhook.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

import websockets
from websockets.asyncio.client import ClientConnection

logger = logging.getLogger(__name__)

_CONNECT_TIMEOUT_SECONDS = 3.0
_SEND_TIMEOUT_SECONDS = 2.0


class BackendNotifier:
    """One instance per interview session.

    If `ws_url` is empty, every method is a no-op — the engine works fully
    standalone (e.g. scripts/local_voice_test.py) with no backend at all.
    """

    def __init__(self, ws_url: str, session_id: str) -> None:
        self._ws_url = ws_url
        self._session_id = session_id
        self._connection: ClientConnection | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._ws_url)

    def send_event(self, event: str, data: dict) -> None:
        """Fire-and-forget: schedules the send and returns immediately, so a
        stalled backend connection can never block the live pipeline. Use
        this from the real-time voice path (question_asked, answer_recorded).
        """
        if not self.enabled:
            return
        asyncio.create_task(self._send(event, data))

    async def send_event_and_wait(self, event: str, data: dict) -> None:
        """Awaits the send (including its one retry) before returning. Use
        this off the real-time path — e.g. the final `interview_completed`
        event in `InterviewEngine.finish()` — where losing the message to a
        race against `close()` matters more than the extra latency."""
        if not self.enabled:
            return
        await self._send(event, data)

    async def _send(self, event: str, data: dict, *, _retried: bool = False) -> None:
        message = json.dumps(
            {
                "event": event,
                "session_id": self._session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": data,
            }
        )
        try:
            connection = await self._get_connection()
            await asyncio.wait_for(connection.send(message), timeout=_SEND_TIMEOUT_SECONDS)
        except Exception as exc:
            self._connection = None
            if not _retried:
                logger.warning("Backend WS send failed, retrying once: %s", exc)
                await self._send(event, data, _retried=True)
            else:
                logger.error("Backend WS send failed after retry, dropping event %r: %s", event, exc)

    async def _get_connection(self) -> ClientConnection:
        if self._connection is None:
            self._connection = await asyncio.wait_for(
                websockets.connect(self._ws_url), timeout=_CONNECT_TIMEOUT_SECONDS
            )
        return self._connection

    async def close(self) -> None:
        if self._connection is not None:
            try:
                await self._connection.close()
            except Exception as exc:
                logger.debug("Error closing backend WS connection: %s", exc)
            self._connection = None
