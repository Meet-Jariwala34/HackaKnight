"""Explicit interview lifecycle and conversational memory.

State is the source of truth for "what's happened so far". The LLM is only
ever shown a compact projection of it (see `context_summary` /
`recent_history`) rather than the full transcript, so prompt size stays
bounded regardless of interview length.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from ai_interviewer.models.interview_config import InterviewConfig, InterviewType

# Standard behavioral themes drawn on for HR/behavioral and mixed interviews.
_BEHAVIORAL_THEMES = [
    "ownership",
    "conflict_resolution",
    "teamwork",
    "leadership",
    "handling_failure",
    "prioritization_under_pressure",
]

_HEDGE_PHRASES = (
    "i don't know",
    "i'm not sure",
    "not really sure",
    "maybe",
    "i guess",
    "something like that",
    "not familiar",
)


class InterviewPhase(str, Enum):
    INITIALIZING = "initializing"
    GREETING = "greeting"
    INTRODUCTION = "introduction"
    QUESTIONING = "questioning"
    FOLLOW_UP = "follow_up"
    FINAL_QUESTIONS = "final_questions"
    CLOSING = "closing"
    COMPLETED = "completed"


class AnswerQuality(str, Enum):
    EMPTY = "empty"
    VAGUE = "vague"
    ADEQUATE = "adequate"
    STRONG = "strong"


def assess_answer_quality(text: str) -> AnswerQuality:
    """Cheap heuristic, not a semantic judgment.

    ponytail: word-count + hedge-phrase heuristic, not an LLM classification.
    Good enough to steer follow-up vs. move-on decisions without a second
    model call on the voice-latency path. Upgrade to a small fast-model
    classification call only if this proves too coarse in practice.
    """
    stripped = text.strip()
    if not stripped:
        return AnswerQuality.EMPTY

    lowered = stripped.lower()
    word_count = len(stripped.split())
    has_hedge = any(phrase in lowered for phrase in _HEDGE_PHRASES)

    if word_count < 6 or (has_hedge and word_count < 20):
        return AnswerQuality.VAGUE
    if word_count >= 40 and not has_hedge:
        return AnswerQuality.STRONG
    return AnswerQuality.ADEQUATE


@dataclass
class Turn:
    role: str  # "interviewer" | "candidate"
    text: str
    topic: str | None = None
    is_follow_up: bool = False


@dataclass
class InterviewState:
    config: InterviewConfig
    phase: InterviewPhase = InterviewPhase.INITIALIZING
    current_difficulty: str = ""

    turns: list[Turn] = field(default_factory=list)
    topics_covered: list[str] = field(default_factory=list)
    topics_planned: list[str] = field(default_factory=list)

    primary_question_count: int = 0
    follow_up_count: int = 0

    observations: list[str] = field(default_factory=list)
    notable_claims: list[str] = field(default_factory=list)
    last_answer_quality: AnswerQuality | None = None

    active_topic: str | None = None
    consecutive_follow_ups: int = 0

    # Turn-scoped handoff between the pre-LLM and post-LLM pipeline processors:
    # set by InterviewTurnManager right after a decision, consumed by
    # QuestionRecorder once the LLM finishes phrasing that decision.
    pending_topic: str | None = None
    pending_is_follow_up: bool = False

    def __post_init__(self) -> None:
        if not self.current_difficulty:
            self.current_difficulty = self.config.difficulty.value
        if not self.topics_planned:
            self.topics_planned = self._plan_topics()

    def _plan_topics(self) -> list[str]:
        topics = list(self.config.skills)
        if self.config.interview_type in (InterviewType.BEHAVIORAL, InterviewType.MIXED):
            topics.extend(_BEHAVIORAL_THEMES)
        return topics or ["general background"]

    @property
    def topics_remaining(self) -> list[str]:
        return [t for t in self.topics_planned if t not in self.topics_covered]

    @property
    def questions_remaining(self) -> int:
        return max(0, self.config.max_questions - self.primary_question_count)

    def record_question(self, text: str, *, topic: str | None, is_follow_up: bool) -> None:
        self.turns.append(Turn(role="interviewer", text=text, topic=topic, is_follow_up=is_follow_up))
        if is_follow_up:
            self.follow_up_count += 1
            self.consecutive_follow_ups += 1
        else:
            self.primary_question_count += 1
            self.consecutive_follow_ups = 0
            self.active_topic = topic
        if topic and topic not in self.topics_covered:
            self.topics_covered.append(topic)

    def record_answer(self, text: str, *, topic: str | None = None) -> AnswerQuality:
        self.turns.append(Turn(role="candidate", text=text, topic=topic))
        quality = assess_answer_quality(text)
        self.last_answer_quality = quality
        if quality == AnswerQuality.VAGUE:
            self.observations.append(f"Vague/incomplete answer on: {topic or 'current topic'}")
        elif quality == AnswerQuality.STRONG and len(text.strip()) > 0:
            self.notable_claims.append(text.strip()[:280])
        return quality

    def recent_history(self, n_pairs: int = 3) -> list[Turn]:
        """Last N interviewer/candidate exchanges, for LLM context — not the full transcript."""
        return self.turns[-(n_pairs * 2):]

    def context_summary(self) -> str:
        """Compact, LLM-facing digest of state so far. Deliberately not the raw transcript."""
        lines = [
            f"Phase: {self.phase.value}",
            f"Primary questions asked: {self.primary_question_count}/{self.config.max_questions}",
            f"Current difficulty: {self.current_difficulty}",
            f"Topics covered: {', '.join(self.topics_covered) or 'none yet'}",
            f"Topics not yet covered: {', '.join(self.topics_remaining) or 'none'}",
        ]
        if self.observations:
            lines.append("Observations: " + "; ".join(self.observations[-3:]))
        return "\n".join(lines)
