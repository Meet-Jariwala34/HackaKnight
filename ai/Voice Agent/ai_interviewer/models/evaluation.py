"""Structured output of the end-of-interview evaluation."""

from __future__ import annotations

from pydantic import BaseModel, Field


class InterviewEvaluation(BaseModel):
    """Final assessment produced by the evaluator from the transcript.

    Behavioral fields are optional and left empty (not zero) for purely
    technical interviews, since a 0 would misrepresent "not assessed" as
    "assessed and failed".
    """

    overall_score: int = Field(ge=0, le=100)
    technical_score: int | None = Field(default=None, ge=0, le=100)
    communication_score: int = Field(ge=0, le=100)
    problem_solving_score: int | None = Field(default=None, ge=0, le=100)
    behavioral_score: int | None = Field(default=None, ge=0, le=100)

    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    missing_knowledge_areas: list[str] = Field(default_factory=list)
    improvement_areas: list[str] = Field(default_factory=list)
    detailed_feedback: list[str] = Field(default_factory=list)

    interview_summary: str = ""
    recommendation: str = ""

    questions_asked: int = 0
    topics_covered: list[str] = Field(default_factory=list)
