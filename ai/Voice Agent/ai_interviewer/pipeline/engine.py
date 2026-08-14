"""Public entry point for the AI interview engine.

    engine = InterviewEngine(config, transport)
    await engine.start()
    ...
    evaluation = await engine.finish()

`transport` is any Pipecat `BaseTransport` (WebRTC, WebSocket, Daily, etc.)
supplied by the caller — building/hosting that transport is an integration
concern (frontend/backend), outside this engine's scope. Construct it with
`create_vad_analyzer()` (see interview_pipeline.py) for turn detection to work.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

from pipecat.transports.base_transport import BaseTransport
from pipecat.workers.runner import WorkerRunner

from ai_interviewer.config.settings import Settings
from ai_interviewer.interview.evaluator import Evaluator
from ai_interviewer.interview.interview_state import InterviewState
from ai_interviewer.models.evaluation import InterviewEvaluation
from ai_interviewer.models.interview_config import InterviewConfig
from ai_interviewer.notify.backend_notifier import BackendNotifier
from ai_interviewer.pipeline.interview_pipeline import PipelineHandle, build_pipeline
from ai_interviewer.utils.logging import configure_logging, log_event

logger = logging.getLogger(__name__)

# Upper bound so a stuck session (e.g. transport never signals bot-stopped)
# can't hang `finish()` forever.
_MAX_INTERVIEW_SECONDS = 60 * 60


class InterviewEngine:
    def __init__(
        self,
        config: InterviewConfig,
        transport: BaseTransport,
        *,
        settings: Settings | None = None,
        session_id: str | None = None,
    ) -> None:
        self.config = config
        self.state = InterviewState(config=config)
        self.settings = settings or Settings.load()
        configure_logging(self.settings.log_level)

        self.session_id = session_id or str(uuid.uuid4())
        self._notifier = BackendNotifier(self.settings.backend_ws_url, self.session_id)

        self._transport = transport
        self._handle: PipelineHandle | None = None
        self._run_task: asyncio.Task | None = None
        self._evaluator = Evaluator(self.settings)

    async def start(self) -> None:
        """Builds and starts the pipeline, then makes the interviewer speak first."""
        self._handle = build_pipeline(self._transport, self.state, self.settings, self._notifier)
        runner = WorkerRunner()
        self._run_task = asyncio.create_task(runner.run(self._handle.task))
        log_event("INTERVIEW_STARTED", candidate=self.config.candidate_name, role=self.config.target_role)
        self._notifier.send_event(
            "session_started",
            {
                "candidate_name": self.config.candidate_name,
                "target_role": self.config.target_role,
                "interview_type": self.config.interview_type.value,
                "difficulty": self.config.difficulty.value,
                "max_questions": self.config.max_questions,
            },
        )
        await self._handle.kickoff()

    async def finish(self) -> InterviewEvaluation:
        """Waits for the interview to reach its natural close, stops the
        pipeline, and runs the end-of-session evaluation. Safe to call even
        if the interview ended abruptly (disconnect, error) — evaluation
        runs on whatever transcript was captured."""
        if self._handle is None:
            raise RuntimeError("InterviewEngine.start() must be called before finish()")

        try:
            await asyncio.wait_for(self._handle.done.wait(), timeout=_MAX_INTERVIEW_SECONDS)
        except asyncio.TimeoutError:
            logger.warning("Interview did not reach a natural close within the time limit; evaluating anyway")

        await self._handle.task.cancel()
        if self._run_task:
            await self._run_task

        log_event("INTERVIEW_COMPLETED", questions=self.state.primary_question_count)
        evaluation = await self._evaluator.evaluate(self.state)

        await self._notifier.send_event_and_wait("interview_completed", evaluation.model_dump())
        await self._notifier.close()

        return evaluation

    async def process_candidate_input(self, audio_chunk: bytes, sample_rate: int, num_channels: int = 1) -> None:
        """Convenience path for callers bridging their own audio transport
        (e.g. a custom WebSocket server) instead of a full Pipecat transport
        that captures audio itself."""
        from pipecat.frames.frames import InputAudioRawFrame

        if self._handle is None:
            raise RuntimeError("InterviewEngine.start() must be called before process_candidate_input()")
        frame = InputAudioRawFrame(audio=audio_chunk, sample_rate=sample_rate, num_channels=num_channels)
        await self._handle.task.queue_frame(frame)
