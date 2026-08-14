import unittest
from unittest.mock import AsyncMock

from ai_interviewer.interview.evaluator import Evaluator
from ai_interviewer.interview.interview_state import InterviewState
from ai_interviewer.llm.groq_client import LLMError
from ai_interviewer.models.interview_config import Difficulty, InterviewConfig, InterviewType

VALID_EVAL_JSON = {
    "overall_score": 78,
    "technical_score": 82,
    "communication_score": 74,
    "problem_solving_score": 80,
    "behavioral_score": None,
    "strengths": ["Clear explanation of API design trade-offs"],
    "weaknesses": ["Limited depth on database indexing"],
    "missing_knowledge_areas": ["Query optimization"],
    "improvement_areas": ["Practice explaining trade-offs concisely"],
    "detailed_feedback": ["Handled the connection pooling follow-up well."],
    "interview_summary": "Solid backend fundamentals with room to grow on data layer depth.",
    "recommendation": "Lean hire.",
}


def make_state() -> InterviewState:
    config = InterviewConfig(
        candidate_name="Rahul",
        target_role="Backend Developer",
        experience="3 years",
        skills=["Python", "FastAPI"],
        difficulty=Difficulty.HARD,
        interview_type=InterviewType.TECHNICAL,
    )
    state = InterviewState(config=config)
    state.record_question("How would you design a rate limiter?", topic="Python", is_follow_up=False)
    state.record_answer("I'd use a token bucket backed by Redis with a sliding window.", topic="Python")
    return state


class TestEvaluator(unittest.IsolatedAsyncioTestCase):
    async def test_successful_evaluation_parses_into_model(self):
        client = AsyncMock()
        client.complete_json.return_value = dict(VALID_EVAL_JSON)
        evaluator = Evaluator(settings=None, client=client)

        evaluation = await evaluator.evaluate(make_state())

        self.assertEqual(evaluation.overall_score, 78)
        self.assertEqual(evaluation.recommendation, "Lean hire.")
        self.assertEqual(evaluation.questions_asked, 1)
        client.complete_json.assert_awaited_once()

    async def test_llm_error_returns_fallback_not_crash(self):
        client = AsyncMock()
        client.complete_json.side_effect = LLMError("groq down")
        evaluator = Evaluator(settings=None, client=client)

        evaluation = await evaluator.evaluate(make_state())

        self.assertEqual(evaluation.overall_score, 0)
        self.assertIn("Manual review", evaluation.recommendation)

    async def test_malformed_response_returns_fallback_not_crash(self):
        client = AsyncMock()
        client.complete_json.return_value = {"not": "the schema we expect"}
        evaluator = Evaluator(settings=None, client=client)

        evaluation = await evaluator.evaluate(make_state())

        self.assertEqual(evaluation.overall_score, 0)

    async def test_empty_interview_skips_llm_call(self):
        config = InterviewConfig(candidate_name="Sam", target_role="QA", experience="1 year")
        state = InterviewState(config=config)
        client = AsyncMock()
        evaluator = Evaluator(settings=None, client=client)

        evaluation = await evaluator.evaluate(state)

        client.complete_json.assert_not_awaited()
        self.assertEqual(evaluation.overall_score, 0)


if __name__ == "__main__":
    unittest.main()
