"""Candidate-facing configuration for a single interview session."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class InterviewType(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXPERT = "expert"


class InterviewConfig(BaseModel):
    """Everything the interviewer needs to personalize a session.

    Supplied by the caller (frontend/backend) before the pipeline starts —
    this module never sources these values itself.
    """

    candidate_name: str = Field(min_length=1, max_length=100)
    target_role: str = Field(min_length=1, max_length=150)
    target_company: str | None = Field(default=None, max_length=150)
    experience: str = Field(min_length=1, max_length=100)
    skills: list[str] = Field(default_factory=list, max_length=50)
    job_description: str | None = Field(default=None, max_length=8000)
    difficulty: Difficulty = Difficulty.MEDIUM
    interview_type: InterviewType = InterviewType.MIXED

    # Soft cap on how many primary questions the interview asks before
    # moving to closing. Follow-ups don't count against this.
    max_questions: int = Field(default=8, ge=3, le=20)

    @field_validator("skills")
    @classmethod
    def _clean_skills(cls, skills: list[str]) -> list[str]:
        return [s.strip() for s in skills if s.strip()]

    @field_validator("candidate_name", "target_role", "experience")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value
