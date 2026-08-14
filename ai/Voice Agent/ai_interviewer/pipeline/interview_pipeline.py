"""Builds the real-time Pipecat pipeline:

    transport.input() -> STT -> [drop empty transcripts] -> user context
        -> InterviewTurnManager (decide + rewrite context)
        -> LLM (Groq, streaming)
        -> QuestionRecorder (record what was asked)
        -> TTS -> transport.output() -> assistant context

Turn detection and interruption handling are pipecat-native, not
reimplemented: VAD is configured via `create_vad_analyzer()` (the caller
wires it into their transport's VADParams — transport construction is an
integration boundary, see README), and barge-in is a single
`PipelineParams(allow_interruptions=True)` flag. Pipecat cancels in-flight
TTS/LLM work on user speech automatically; there is no separate
interruption-handling module to write.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams
from pipecat.frames.frames import BotStoppedSpeakingFrame, LLMContextFrame, TranscriptionFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.processors.filters.function_filter import FunctionFilter
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.transports.base_transport import BaseTransport

from ai_interviewer.config.settings import Settings
from ai_interviewer.interview.interview_state import InterviewPhase, InterviewState
from ai_interviewer.interview.interviewer import InterviewTurnManager, QuestionRecorder
from ai_interviewer.interview.question_manager import QuestionManager
from ai_interviewer.llm.groq_client import create_groq_llm_service
from ai_interviewer.notify.backend_notifier import BackendNotifier
from ai_interviewer.stt.faster_whisper_service import create_whisper_stt_service, is_meaningful_transcript
from ai_interviewer.tts.kokoro_service import create_kokoro_tts_service

# Candidate must be silent this long before their turn is considered done.
# Lower = snappier turn-taking; higher = fewer accidental cutoffs on
# candidates who pause mid-thought. Tune per deployment.
VAD_STOP_SECS = 0.6
VAD_START_SECS = 0.2
VAD_CONFIDENCE = 0.7


def create_vad_analyzer() -> SileroVADAnalyzer:
    """VAD analyzer for the caller to wire into their transport's TransportParams."""
    return SileroVADAnalyzer(
        params=VADParams(confidence=VAD_CONFIDENCE, start_secs=VAD_START_SECS, stop_secs=VAD_STOP_SECS)
    )


class _EndOfInterviewWatcher(FrameProcessor):
    """Signals `done` once the closing message has finished playing."""

    def __init__(self, state: InterviewState, done: asyncio.Event) -> None:
        super().__init__()
        self._state = state
        self._done = done

    async def process_frame(self, frame, direction: FrameDirection) -> None:
        await super().process_frame(frame, direction)
        if isinstance(frame, BotStoppedSpeakingFrame) and self._state.phase == InterviewPhase.CLOSING:
            self._done.set()
        await self.push_frame(frame, direction)


@dataclass
class PipelineHandle:
    task: PipelineTask
    done: asyncio.Event
    kickoff: callable  # async () -> None; queues the frame that makes the bot speak first


def build_pipeline(
    transport: BaseTransport, state: InterviewState, settings: Settings, notifier: BackendNotifier
) -> PipelineHandle:
    stt = create_whisper_stt_service(settings)
    llm = create_groq_llm_service(settings)
    tts = create_kokoro_tts_service(settings)

    context = LLMContext(messages=[])
    context_aggregator = LLMContextAggregatorPair(context)

    async def _keep_frame(frame) -> bool:
        if isinstance(frame, TranscriptionFrame):
            return is_meaningful_transcript(frame.text)
        return True

    done = asyncio.Event()

    pipeline = Pipeline([
        transport.input(),
        stt,
        FunctionFilter(filter=_keep_frame),
        context_aggregator.user(),
        InterviewTurnManager(state, QuestionManager(), notifier),
        llm,
        QuestionRecorder(state, notifier),
        tts,
        transport.output(),
        context_aggregator.assistant(),
        _EndOfInterviewWatcher(state, done),
    ])

    # enable_rtvi=False: RTVI is Daily's client-server handshake protocol for
    # their RTVI client SDK. We're not using it — InterviewEngine is the
    # direct programmatic interface — and leaving it on makes PipelineTask
    # wait for an "on_client_ready" message that a non-RTVI transport never
    # sends, stalling the whole pipeline.
    task = PipelineTask(
        pipeline,
        params=PipelineParams(allow_interruptions=True, enable_metrics=True),
        enable_rtvi=False,
    )

    async def kickoff() -> None:
        # No user turn has happened yet, so there's no LLMContextFrame flowing
        # through the pipeline to trigger InterviewTurnManager. Push one
        # directly, wrapping the same (still-empty) shared context — it flows
        # through the pipeline exactly like a real user-turn frame would.
        await task.queue_frames([LLMContextFrame(context=context)])

    return PipelineHandle(task=task, done=done, kickoff=kickoff)
