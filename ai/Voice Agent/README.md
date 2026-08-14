# AI Interview Engine

Real-time voice mock-interview AI: Pipecat + Faster-Whisper (STT) + Groq (LLM) + Kokoro (TTS).
This is the AI/voice layer only — no frontend, backend, database, auth, or UI. It exposes a
Python interface for another application to drive.

## Architecture

```
Candidate mic (via caller-supplied Pipecat transport)
      │
      ▼
 WhisperSTTService (faster-whisper, local)
      │  drops empty/near-silent transcripts (no_speech_prob + text filter)
      ▼
 user context aggregator (Pipecat) ── finalizes a candidate turn on VAD silence
      │
      ▼
 InterviewTurnManager  ← records the answer into InterviewState,
      │                   asks QuestionManager (pure Python) for the next move,
      │                   rewrites the LLM context to a bounded window
      ▼
 GroqLLMService (streaming)  ── phrases that move as natural spoken text
      │
      ▼
 QuestionRecorder  ← records the phrased question into InterviewState
      │
      ▼
 KokoroTTSService (local, streaming) ── speaks as soon as the first sentence is ready
      │
      ▼
 transport.output() → candidate hears the interviewer
```

At session end, a separate one-shot call (`interview/evaluator.py`) reads the full transcript
and produces a structured `InterviewEvaluation` — this never runs mid-interview.

### Why a Python state machine decides, not a second LLM call

The spec asks for interview "decisions" (follow-up vs. new topic, difficulty, phase) to be kept
separate from the spoken response. The obvious way is a second LLM call per turn returning JSON —
but that doubles latency on the voice path and requires parsing/repairing model JSON mid-turn.
Instead, `interview/question_manager.py` is a deterministic rule set over `InterviewState`
(topics covered, consecutive follow-ups, a word-count/hedge-phrase answer-quality heuristic). It
decides the move in Python, in microseconds, then hands the LLM a one-line instruction
("ask a follow-up about X because the last answer was vague"). The LLM's only job is turning an
already-made decision into natural phrasing — one Groq call per turn, full streaming preserved,
and no hidden chain-of-thought is ever requested from the model.

The answer-quality heuristic is intentionally simple (`ponytail:` marked in
`interview_state.py`) — upgrade path is a fast small-model classification call if it proves too
coarse.

### Context management

`InterviewState` is the source of truth; the LLM never sees it directly. Each turn,
`InterviewTurnManager` rewrites the Pipecat LLM context to exactly:
`[base persona prompt, turn directive (state summary + current move), last 3 Q/A pairs]` — see
`prompts.build_messages()`. This is a hard bound: prompt size doesn't grow with interview length,
because the running Pipecat context is deliberately overwritten every turn rather than left to
accumulate.

### Turn detection & interruption (barge-in)

Not reimplemented — configured. `pipeline/interview_pipeline.py` exposes
`create_vad_analyzer()` (Silero VAD, tuned via `VAD_START_SECS`/`VAD_STOP_SECS`/`VAD_CONFIDENCE`)
for the caller to wire into their transport's `TransportParams`, and the pipeline task is built
with `PipelineParams(allow_interruptions=True)`. Pipecat's context aggregator + VAD already
implement "wait for silence to end a turn" and "cancel in-flight LLM/TTS on new speech"; writing
that ourselves would just be a worse copy of what's already installed.

### Latency

- STT, LLM, and TTS are all streaming/local services from Pipecat's service layer — no component
  waits for a full upstream result before starting its own work (Kokoro starts speaking on the
  first completed sentence, not the full LLM response).
- The evaluator's non-streaming Groq call is entirely off the live voice path — it runs once,
  after `finish()` is called.
- The per-turn decision is a pure-Python rule evaluation (no LLM round trip), keeping the
  "decision" step off the latency budget entirely.

## Project structure

```
ai_interviewer/
├── pipeline/
│   ├── interview_pipeline.py   # builds the Pipecat Pipeline/PipelineTask, VAD config
│   └── engine.py               # InterviewEngine — the public integration interface
├── interview/
│   ├── interview_state.py      # InterviewPhase, InterviewState, answer-quality heuristic
│   ├── question_manager.py     # deterministic next-move strategy
│   ├── interviewer.py          # live FrameProcessors: InterviewTurnManager, QuestionRecorder
│   ├── prompts.py               # system prompt + per-turn directive + evaluation prompt
│   └── evaluator.py             # end-of-session structured evaluation
├── llm/groq_client.py           # Groq service factory (pipeline) + retrying JSON client (eval)
├── stt/faster_whisper_service.py
├── tts/kokoro_service.py
├── notify/backend_notifier.py   # WebSocket client that pushes live events to your backend
├── models/
│   ├── interview_config.py      # InterviewConfig, Difficulty, InterviewType (pydantic)
│   └── evaluation.py            # InterviewEvaluation (pydantic)
├── config/settings.py           # env-driven Settings
├── utils/logging.py             # structured event logging
└── tests/
```

`pipeline/turn_detection.py` and `pipeline/interruptions.py` from a "typical" layout were
deliberately not created — both are pure Pipecat configuration (VADParams,
`allow_interruptions=True`), not code we own, so they live inline in `interview_pipeline.py`
instead of as near-empty wrapper files.

## Interview lifecycle

```
INITIALIZING → GREETING → INTRODUCTION → QUESTIONING ⇄ FOLLOW_UP → FINAL_QUESTIONS → CLOSING
```

Transitions are driven by `QuestionManager.decide_next()`, called once per candidate turn.
`FOLLOW_UP` can only repeat once consecutively (`consecutive_follow_ups` guard) — no infinite
clarification loops. `QUESTIONING → FINAL_QUESTIONS` triggers when the question budget
(`InterviewConfig.max_questions`) is spent or topics run out after a minimum number of questions.

## Integration interface

```python
from ai_interviewer.config.settings import Settings
from ai_interviewer.models.interview_config import InterviewConfig
from ai_interviewer.pipeline.engine import InterviewEngine
from ai_interviewer.pipeline.interview_pipeline import create_vad_analyzer

config = InterviewConfig(
    candidate_name="Rahul",
    target_role="Backend Developer",
    target_company="Google",
    experience="3 years",
    skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
    job_description="Backend engineer responsible for building scalable APIs...",
    difficulty="hard",
    interview_type="mixed",
)

# `transport` is a Pipecat BaseTransport supplied by the calling application
# (WebRTC/WebSocket/Daily/etc.) — building and hosting it is outside this
# engine's scope. Construct it with create_vad_analyzer() for turn detection.
transport = ...  # e.g. SmallWebRTCTransport(..., params=TransportParams(vad_analyzer=create_vad_analyzer(), ...))

engine = InterviewEngine(config, transport, settings=Settings.load())
await engine.start()          # pipeline runs live; interviewer speaks first
...                            # candidate talks through the transport's mic input
evaluation = await engine.finish()   # waits for a natural close, then evaluates
```

If the caller bridges audio manually instead of via a full Pipecat transport (e.g. their own
WebSocket protocol), use `await engine.process_candidate_input(audio_bytes, sample_rate)` to
push raw PCM into the running pipeline.

`engine.state` (an `InterviewState`) is readable at any point for progress/observability without
waiting for `finish()`.

Everything else — accepting connections, authenticating the candidate, storing the config,
persisting the evaluation, rendering a UI — is explicitly the calling application's job.

## Backend integration (WebSocket)

No database, no REST API — this engine pushes everything to your backend over a single
WebSocket, as a client connecting **out** to a URL you host. Set `BACKEND_WS_URL` and every
`InterviewEngine` session connects there automatically; leave it blank and the engine runs fully
standalone (nothing to connect to = every notification is a no-op, confirmed by
`test_backend_notifier.py`'s "disabled" tests and used as-is by `scripts/local_voice_test.py`).

**Your backend's only job**: host a WebSocket endpoint at that URL and read JSON messages shaped
like this:

```json
{
  "event": "question_asked",
  "session_id": "6e3c...",
  "timestamp": "2026-08-13T12:24:00.226638+00:00",
  "data": { "...": "event-specific fields, see below" }
}
```

| event | when | `data` |
|---|---|---|
| `session_started` | once, when `engine.start()` is called | `candidate_name`, `target_role`, `interview_type`, `difficulty`, `max_questions` |
| `question_asked` | after each interviewer turn finishes phrasing | `phase`, `topic`, `is_follow_up`, `question_number`, `text` |
| `answer_recorded` | after each candidate turn is transcribed | `phase`, `topic`, `quality` (`vague`/`adequate`/`strong`/`empty`), `text` |
| `interview_completed` | once, at the end of `engine.finish()` | the full `InterviewEvaluation`, i.e. `overall_score`, `strengths`, `recommendation`, etc. |

`session_id` is either auto-generated (`uuid4`) or supplied by you —
`InterviewEngine(config, transport, session_id="your-own-id")` — so you can correlate it with
whatever session record your backend already tracks.

**Delivery characteristics, so you know what to build around**: `question_asked` and
`answer_recorded` are sent fire-and-forget (never block the live voice pipeline — a slow or
down backend can't add latency to the conversation). `interview_completed` is awaited with one
retry before the connection closes, since losing the final result matters more than the extra
latency. None of this is a durable queue: if your backend is down for the *entire* interview,
events are dropped (logged locally, engine keeps running regardless — see
`BackendNotifier`'s module docstring for the full trade-off discussion). Fine for a single
backend instance; if you need guaranteed delivery, put a queue (e.g. Redis, SQS) behind your
WebSocket endpoint's message handler rather than trying to make the socket itself durable.

**Try it before your real backend exists**: `python scripts/mock_backend_ws_server.py` starts a
throwaway WebSocket server on `ws://localhost:8765` that just prints everything it receives. Set
`BACKEND_WS_URL=ws://localhost:8765` and run `scripts/local_voice_test.py` — you'll see each
event print in the mock server's terminal in real time.

## Configuration

Copy `.env.example` to `.env` and fill in `GROQ_API_KEY`. Every other setting has a sane default
and is read once in `config/settings.py` — no model names or paths are hardcoded elsewhere.

## Dependencies

See `requirements.txt`: `pipecat-ai` (with `groq`, `whisper`, `kokoro`, `silero` extras), `groq`,
`pydantic`, `python-dotenv`, `websockets`. Deliberately minimal — everything else (retries, JSON
parsing, structured config, env loading) is stdlib or already covered by these five. `websockets`
was already a transitive dependency of `pipecat-ai`; declared directly since `notify/` now
imports it itself, not just relies on it being pulled in incidentally.

## Tests

```bash
pip install -r requirements.txt
python -m unittest discover ai_interviewer/tests
```

Pure-logic tests (`test_interview_config`, `test_interview_state`, `test_question_manager`,
`test_evaluator`, `test_groq_client`, `test_backend_notifier`) only need `pydantic`,
`python-dotenv`, `groq`, and `websockets` — they run and pass without
`pipecat-ai`/`faster-whisper`/`kokoro-onnx` installed (verified locally). Groq API calls and the
WebSocket connection are mocked throughout `test_backend_notifier.py`; a real (unmocked)
round-trip against an actual `websockets.serve()` server has also been manually verified — see
`scripts/mock_backend_ws_server.py`, which is that same real server made reusable for you to
check your own setup against.

The Pipecat `FrameProcessor` glue in `interview/interviewer.py` and the pipeline wiring in
`pipeline/interview_pipeline.py` are intentionally thin — the substantive logic they call
(`InterviewState`, `QuestionManager`, `prompts`) is fully covered above and doesn't need
`pipecat-ai` installed to test. The pipeline construction and a live turn (real Groq call, real
Kokoro synthesis, against a fake in-process transport) have been manually verified with the full
dependency set installed — see "A note on the Pipecat API surface" below for what that surfaced.

## Running locally

STT/TTS models download on first use (`faster-whisper` and `kokoro-onnx` both fetch weights
automatically, a few hundred MB combined). No GPU required; set `WHISPER_DEVICE=cuda` if one's
available.

If your default Python is very new (this was built against 3.14, where `faster-whisper`'s
`ctranslate2` dependency and `pyaudio` didn't have prebuilt wheels yet), use a 3.11/3.12
virtualenv instead of fighting source builds:

```bash
py -3.12 -m venv .venv
.venv\Scripts\activate        # Windows; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env   # fill in GROQ_API_KEY — never put real secrets in .env.example
python -m unittest discover ai_interviewer/tests
```

Running an actual live voice session additionally requires a transport (see Integration
Interface above) — that piece is provided by the calling application, not this repo.

## A note on the Pipecat API surface

Verified against a real install (pipecat-ai 1.7.0, Python 3.12): the pipeline builds, links all 9
processors in the right order, and a live run does a real Groq call + real Kokoro synthesis and
correctly records state. Two things worth knowing if you're touching this code:

- **Context API**: pipecat-ai 1.7 uses the "universal" LLM context
  (`pipecat.processors.aggregators.llm_context.LLMContext`, carried in `LLMContextFrame`,
  aggregated via `LLMContextAggregatorPair`) — not the older `OpenAILLMContext` /
  `create_context_aggregator()` pattern some tutorials still show. `interview/interviewer.py` and
  `pipeline/interview_pipeline.py` target the current one. Pipecat's context API has moved fast
  across versions before, so re-check this against the installed version's changelog if imports
  break after an upgrade.
- **`enable_rtvi=False` is required**: `PipelineTask` defaults to `enable_rtvi=True`, which
  auto-inserts an `RTVIProcessor` expecting Daily's RTVI client handshake
  (`on_client_ready`/`set_bot_ready`). Since `InterviewEngine` is a direct programmatic interface,
  not an RTVI-client-driven bot, leaving this on stalls the entire pipeline — `StartFrame` never
  reaches the end because nothing sends the handshake it's waiting for. `pipeline/interview_pipeline.py`
  explicitly disables it.
