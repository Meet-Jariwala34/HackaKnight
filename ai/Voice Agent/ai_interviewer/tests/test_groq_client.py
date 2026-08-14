import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import groq

from ai_interviewer.config.settings import Settings
from ai_interviewer.llm.groq_client import GroqCompletionClient, LLMError


def make_settings() -> Settings:
    return Settings(
        groq_api_key="test-key",
        groq_model="llama-3.3-70b-versatile",
        groq_eval_model="llama-3.3-70b-versatile",
        whisper_model="distil-medium.en",
        whisper_device="cpu",
        whisper_compute_type="default",
        kokoro_voice="af_heart",
        backend_ws_url="",
        log_level="INFO",
    )


def _completion_response(content: str) -> MagicMock:
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    return response


class TestGroqCompletionClient(unittest.IsolatedAsyncioTestCase):
    @patch("ai_interviewer.llm.groq_client.groq.AsyncGroq")
    async def test_successful_json_completion(self, mock_async_groq):
        mock_client = mock_async_groq.return_value
        mock_client.chat.completions.create = AsyncMock(
            return_value=_completion_response('{"overall_score": 80}')
        )
        client = GroqCompletionClient(make_settings())

        result = await client.complete_json([{"role": "user", "content": "evaluate"}])

        self.assertEqual(result, {"overall_score": 80})

    @patch("ai_interviewer.llm.groq_client.asyncio.sleep", new_callable=AsyncMock)
    @patch("ai_interviewer.llm.groq_client.groq.AsyncGroq")
    async def test_retries_on_transient_error_then_succeeds(self, mock_async_groq, _mock_sleep):
        mock_client = mock_async_groq.return_value
        request = MagicMock()
        transient = groq.APIConnectionError(request=request)
        mock_client.chat.completions.create = AsyncMock(
            side_effect=[transient, _completion_response('{"overall_score": 55}')]
        )
        client = GroqCompletionClient(make_settings())

        result = await client.complete_json([{"role": "user", "content": "evaluate"}])

        self.assertEqual(result, {"overall_score": 55})
        self.assertEqual(mock_client.chat.completions.create.await_count, 2)

    @patch("ai_interviewer.llm.groq_client.asyncio.sleep", new_callable=AsyncMock)
    @patch("ai_interviewer.llm.groq_client.groq.AsyncGroq")
    async def test_raises_llm_error_after_max_attempts(self, mock_async_groq, _mock_sleep):
        mock_client = mock_async_groq.return_value
        request = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=groq.APIConnectionError(request=request)
        )
        client = GroqCompletionClient(make_settings())

        with self.assertRaises(LLMError):
            await client.complete_json([{"role": "user", "content": "evaluate"}])
        self.assertEqual(mock_client.chat.completions.create.await_count, 3)

    @patch("ai_interviewer.llm.groq_client.groq.AsyncGroq")
    async def test_non_retryable_api_status_error_raises_immediately(self, mock_async_groq):
        mock_client = mock_async_groq.return_value
        response = MagicMock(status_code=400, headers={})
        mock_client.chat.completions.create = AsyncMock(
            side_effect=groq.APIStatusError("bad request", response=response, body=None)
        )
        client = GroqCompletionClient(make_settings())

        with self.assertRaises(LLMError):
            await client.complete_json([{"role": "user", "content": "evaluate"}])
        self.assertEqual(mock_client.chat.completions.create.await_count, 1)

    @patch("ai_interviewer.llm.groq_client.asyncio.sleep", new_callable=AsyncMock)
    @patch("ai_interviewer.llm.groq_client.groq.AsyncGroq")
    async def test_non_json_content_raises_llm_error(self, mock_async_groq, _mock_sleep):
        mock_client = mock_async_groq.return_value
        mock_client.chat.completions.create = AsyncMock(return_value=_completion_response("not json"))
        client = GroqCompletionClient(make_settings())

        with self.assertRaises(LLMError):
            await client.complete_json([{"role": "user", "content": "evaluate"}])


if __name__ == "__main__":
    unittest.main()
