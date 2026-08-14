"""Live pipeline processors that turn InterviewState + QuestionManager into
an actual conversation turn.

Two small processors instead of one: each has a single responsibility and
sits at the natural seam for it — one before the LLM (decide + rewrite
context), one after (record what was actually said). Splitting them also
means neither has to buffer frames flowing in both directions.

NOTE ON PIPECAT API SURFACE: targets pipecat-ai 1.7's universal LLM context
(`pipecat.processors.aggregators.llm_context.LLMContext`, carried downstream
in `LLMContextFrame`), confirmed against the installed package. This API has
moved fast across pipecat versions before — re-check `LLMContextFrame` /
`LLMContextAggregatorPair` against the pinned pipecat-ai version in
requirements.txt before upgrading.
"""

from __future__ import annotations

from pipecat.frames.frames import LLMContextFrame, LLMFullResponseEndFrame, LLMFullResponseStartFrame, LLMTextFrame
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor

from ai_interviewer.interview.interview_state import InterviewPhase, InterviewState
from ai_interviewer.interview.prompts import build_messages
from ai_interviewer.interview.question_manager import QuestionManager
from ai_interviewer.notify.backend_notifier import BackendNotifier
from ai_interviewer.utils.logging import log_event


class InterviewTurnManager(FrameProcessor):
    """Between the user context aggregator and the LLM service."""

    def __init__(self, state: InterviewState, question_manager: QuestionManager, notifier: BackendNotifier) -> None:
        super().__init__()
        self._state = state
        self._question_manager = question_manager
        self._notifier = notifier
        self._started = False

    async def process_frame(self, frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMContextFrame) and direction == FrameDirection.DOWNSTREAM:
            self._prepare_turn(frame)

        await self.push_frame(frame, direction)

    def _prepare_turn(self, frame: LLMContextFrame) -> None:
        if not self._started:
            self._started = True
        else:
            candidate_text = self._latest_user_text(frame.context.messages)
            if candidate_text:
                quality = self._state.record_answer(candidate_text, topic=self._state.active_topic)
                log_event("CANDIDATE_TRANSCRIPT", text=candidate_text[:200])
                self._notifier.send_event(
                    "answer_recorded",
                    {
                        "phase": self._state.phase.value,
                        "topic": self._state.active_topic,
                        "quality": quality.value,
                        "text": candidate_text,
                    },
                )

        decision = self._question_manager.decide_next(self._state)
        self._state.pending_topic = decision.topic
        self._state.pending_is_follow_up = decision.is_follow_up

        log_event(
            "FOLLOW_UP_GENERATED" if decision.is_follow_up else "QUESTION_GENERATED",
            action=decision.action, topic=decision.topic, difficulty=decision.difficulty,
        )

        messages = build_messages(self._state.config, self._state, decision)
        frame.context.set_messages(messages)

    @staticmethod
    def _latest_user_text(messages: list[dict]) -> str:
        for message in reversed(messages):
            if message.get("role") == "user":
                content = message["content"]
                return content if isinstance(content, str) else str(content)
        return ""


class QuestionRecorder(FrameProcessor):
    """Between the LLM service and TTS. Records the phrased question once complete."""

    def __init__(self, state: InterviewState, notifier: BackendNotifier) -> None:
        super().__init__()
        self._state = state
        self._notifier = notifier
        self._buffer = ""

    async def process_frame(self, frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMFullResponseStartFrame):
            self._buffer = ""
        elif isinstance(frame, LLMTextFrame):
            self._buffer += frame.text
        elif isinstance(frame, LLMFullResponseEndFrame):
            self._finalize()

        await self.push_frame(frame, direction)

    def _finalize(self) -> None:
        text = self._buffer.strip()
        self._buffer = ""
        if not text:
            return
        self._state.record_question(
            text, topic=self._state.pending_topic, is_follow_up=self._state.pending_is_follow_up
        )
        log_event("LLM_RESPONSE", phase=self._state.phase.value, chars=len(text))
        self._notifier.send_event(
            "question_asked",
            {
                "phase": self._state.phase.value,
                "topic": self._state.pending_topic,
                "is_follow_up": self._state.pending_is_follow_up,
                "question_number": self._state.primary_question_count,
                "text": text,
            },
        )
