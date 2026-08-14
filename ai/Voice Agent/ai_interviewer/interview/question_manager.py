"""Deterministic interview strategy: what to do next, decided in Python.

This is the "decision" half of the decision/speech split (see prompts.py for
the "speech" half). Keeping it as plain rules over InterviewState — rather
than asking the LLM to emit a JSON decision each turn — means one Groq call
per turn instead of two, and no hidden chain-of-thought is ever requested
from the model. The LLM only turns an already-made decision into natural
spoken phrasing.
"""

from __future__ import annotations

from dataclasses import dataclass

from ai_interviewer.interview.interview_state import AnswerQuality, InterviewPhase, InterviewState

_DIFFICULTY_LADDER = ["easy", "medium", "hard", "expert"]
_MAX_CONSECUTIVE_FOLLOW_UPS = 1
_MIN_QUESTIONS_BEFORE_EARLY_CLOSE = 3


@dataclass(frozen=True)
class Decision:
    action: str  # greet | confirm_background | ask_question | follow_up | final_question | close_interview
    topic: str | None
    difficulty: str
    is_follow_up: bool
    reason: str


class QuestionManager:
    """Stateless strategy over an InterviewState instance."""

    def decide_next(self, state: InterviewState) -> Decision:
        if state.phase == InterviewPhase.INITIALIZING:
            state.phase = InterviewPhase.GREETING
            return Decision("greet", None, state.current_difficulty, False, "interview start")

        if state.phase == InterviewPhase.GREETING:
            state.phase = InterviewPhase.INTRODUCTION
            return Decision(
                "confirm_background", "candidate_background", state.current_difficulty, False,
                "confirm role and experience before diving into questions",
            )

        if state.phase == InterviewPhase.INTRODUCTION:
            state.phase = InterviewPhase.QUESTIONING

        if state.phase == InterviewPhase.FINAL_QUESTIONS:
            state.phase = InterviewPhase.CLOSING
            return Decision("close_interview", None, state.current_difficulty, False, "wrap up")

        if state.phase == InterviewPhase.CLOSING:
            return Decision("close_interview", None, state.current_difficulty, False, "already closing")

        self._adapt_difficulty(state)

        if state.primary_question_count >= state.config.max_questions and state.consecutive_follow_ups == 0:
            state.phase = InterviewPhase.FINAL_QUESTIONS
            return Decision(
                "final_question", None, state.current_difficulty, False,
                "reached the planned question budget",
            )

        quality = state.last_answer_quality
        if (
            quality == AnswerQuality.VAGUE
            and state.consecutive_follow_ups < _MAX_CONSECUTIVE_FOLLOW_UPS
            and state.primary_question_count > 0
        ):
            state.phase = InterviewPhase.FOLLOW_UP
            return Decision(
                "follow_up", state.active_topic, state.current_difficulty, True,
                "candidate's last answer was vague or incomplete",
            )

        if quality == AnswerQuality.STRONG and state.consecutive_follow_ups == 0 and state.primary_question_count > 0:
            state.phase = InterviewPhase.FOLLOW_UP
            return Decision(
                "follow_up", state.active_topic, state.current_difficulty, True,
                "candidate gave a strong answer worth probing deeper",
            )

        state.phase = InterviewPhase.QUESTIONING
        next_topic = self._next_topic(state)
        if next_topic is None and state.primary_question_count >= _MIN_QUESTIONS_BEFORE_EARLY_CLOSE:
            state.phase = InterviewPhase.FINAL_QUESTIONS
            return Decision("final_question", None, state.current_difficulty, False, "no topics left to cover")

        return Decision(
            "ask_question", next_topic, state.current_difficulty, False,
            "move to a new relevant topic",
        )

    def _next_topic(self, state: InterviewState) -> str | None:
        remaining = state.topics_remaining
        return remaining[0] if remaining else None

    def _adapt_difficulty(self, state: InterviewState) -> None:
        idx = _DIFFICULTY_LADDER.index(state.current_difficulty)
        if state.last_answer_quality == AnswerQuality.STRONG and idx < len(_DIFFICULTY_LADDER) - 1:
            state.current_difficulty = _DIFFICULTY_LADDER[idx + 1]
        elif state.last_answer_quality == AnswerQuality.VAGUE and idx > 0:
            state.current_difficulty = _DIFFICULTY_LADDER[idx - 1]
