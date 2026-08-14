"""End-of-session evaluation. Deliberately separate from the live interviewer:
a different prompt, a non-streaming call, and it runs once after the
conversation is over rather than on every turn.
"""

from __future__ import annotations

import logging

from pydantic import ValidationError

from ai_interviewer.config.settings import Settings
from ai_interviewer.interview.interview_state import InterviewState
from ai_interviewer.interview.prompts import build_evaluation_prompt
from ai_interviewer.llm.groq_client import GroqCompletionClient, LLMError
from ai_interviewer.models.evaluation import InterviewEvaluation
from ai_interviewer.utils.logging import log_event

logger = logging.getLogger(__name__)


class Evaluator:
    def __init__(self, settings: Settings, client: GroqCompletionClient | None = None) -> None:
        self._client = client or GroqCompletionClient(settings)

    async def evaluate(self, state: InterviewState) -> InterviewEvaluation:
        log_event("EVALUATION_STARTED", questions=state.primary_question_count)

        if not any(t.role == "candidate" for t in state.turns):
            evaluation = self._empty_interview_fallback(state)
            log_event("EVALUATION_COMPLETED", overall_score=evaluation.overall_score, fallback=True)
            return evaluation

        messages = build_evaluation_prompt(state.config, state)
        try:
            data = await self._client.complete_json(messages, temperature=0.2)
            data.setdefault("questions_asked", state.primary_question_count)
            data.setdefault("topics_covered", state.topics_covered)
            evaluation = InterviewEvaluation(**data)
        except (LLMError, ValidationError) as exc:
            logger.error("Evaluation generation failed, returning fallback: %s", exc)
            evaluation = self._error_fallback(state)

        log_event("EVALUATION_COMPLETED", overall_score=evaluation.overall_score)
        return evaluation

    def _empty_interview_fallback(self, state: InterviewState) -> InterviewEvaluation:
        return InterviewEvaluation(
            overall_score=0,
            communication_score=0,
            interview_summary="The interview ended before the candidate answered any questions.",
            recommendation="Not assessable — no candidate responses were recorded.",
            questions_asked=state.primary_question_count,
            topics_covered=state.topics_covered,
        )

    def _error_fallback(self, state: InterviewState) -> InterviewEvaluation:
        return InterviewEvaluation(
            overall_score=0,
            communication_score=0,
            interview_summary="Automated evaluation failed and could not be generated.",
            recommendation="Manual review required — evaluator service error.",
            questions_asked=state.primary_question_count,
            topics_covered=state.topics_covered,
        )
