import asyncio
import json
import unittest
from unittest.mock import AsyncMock, patch

from ai_interviewer.notify.backend_notifier import BackendNotifier


class TestBackendNotifierDisabled(unittest.IsolatedAsyncioTestCase):
    async def test_no_url_means_no_connection_attempt(self):
        with patch("ai_interviewer.notify.backend_notifier.websockets.connect") as mock_connect:
            notifier = BackendNotifier("", "session-1")
            self.assertFalse(notifier.enabled)
            notifier.send_event("question_asked", {"text": "hi"})
            await notifier.send_event_and_wait("interview_completed", {"overall_score": 80})
            await notifier.close()
        mock_connect.assert_not_called()


class TestBackendNotifierEnabled(unittest.IsolatedAsyncioTestCase):
    def _mock_connect(self):
        connection = AsyncMock()
        patcher = patch("ai_interviewer.notify.backend_notifier.websockets.connect", AsyncMock(return_value=connection))
        return patcher, connection

    async def test_send_event_and_wait_delivers_message(self):
        patcher, connection = self._mock_connect()
        with patcher:
            notifier = BackendNotifier("ws://backend.example/ws", "session-1")
            await notifier.send_event_and_wait("interview_completed", {"overall_score": 80})

        connection.send.assert_awaited_once()
        sent = json.loads(connection.send.await_args.args[0])
        self.assertEqual(sent["event"], "interview_completed")
        self.assertEqual(sent["session_id"], "session-1")
        self.assertEqual(sent["data"], {"overall_score": 80})
        self.assertIn("timestamp", sent)

    async def test_reuses_connection_across_sends(self):
        patcher, connection = self._mock_connect()
        with patcher as mock_connect:
            notifier = BackendNotifier("ws://backend.example/ws", "session-1")
            await notifier.send_event_and_wait("question_asked", {"text": "q1"})
            await notifier.send_event_and_wait("answer_recorded", {"text": "a1"})

        mock_connect.assert_awaited_once()
        self.assertEqual(connection.send.await_count, 2)

    async def test_fire_and_forget_send_event_eventually_delivers(self):
        patcher, connection = self._mock_connect()
        with patcher:
            notifier = BackendNotifier("ws://backend.example/ws", "session-1")
            notifier.send_event("question_asked", {"text": "q1"})
            pending = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
            await asyncio.gather(*pending)

        connection.send.assert_awaited_once()

    async def test_send_failure_retries_once_then_gives_up_without_raising(self):
        connection = AsyncMock()
        connection.send.side_effect = ConnectionError("dropped")
        with patch("ai_interviewer.notify.backend_notifier.websockets.connect", AsyncMock(return_value=connection)):
            notifier = BackendNotifier("ws://backend.example/ws", "session-1")
            await notifier.send_event_and_wait("question_asked", {"text": "q1"})  # must not raise

        self.assertEqual(connection.send.await_count, 2)  # original attempt + one retry

    async def test_connect_failure_does_not_raise(self):
        with patch(
            "ai_interviewer.notify.backend_notifier.websockets.connect",
            AsyncMock(side_effect=OSError("connection refused")),
        ):
            notifier = BackendNotifier("ws://backend.example/ws", "session-1")
            await notifier.send_event_and_wait("session_started", {})  # must not raise


if __name__ == "__main__":
    unittest.main()
