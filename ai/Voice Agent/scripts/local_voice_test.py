

import asyncio
import os

import pyaudio
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams

from ai_interviewer.config.settings import Settings
from ai_interviewer.models.interview_config import InterviewConfig
from ai_interviewer.pipeline.engine import InterviewEngine
from ai_interviewer.pipeline.interview_pipeline import create_vad_analyzer


def _pick_input_device() -> int:
    override = os.environ.get("MIC_DEVICE_INDEX")
    if override is not None:
        return int(override)

    pa = pyaudio.PyAudio()
    try:
        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            name = info["name"]
            if info["maxInputChannels"] > 0 and "microphone" in name.lower() and "stereo mix" not in name.lower():
                print(f"Using input device {i}: {name}")
                return i
        default = pa.get_default_input_device_info()
        print(f"No device matching 'Microphone' found — falling back to default: {default['name']}")
        return default["index"]
    finally:
        pa.terminate()


async def main() -> None:
    config = InterviewConfig(
        candidate_name="Nitya",
        target_role="Machine Learning Engineer",
        target_company="Google",
        experience="3 years",
        skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        job_description="Backend engineer responsible for building scalable, reliable APIs.",
        difficulty="medium",
        interview_type="mixed",
        max_questions=4,
    )

    transport = LocalAudioTransport(
        LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            input_device_index=_pick_input_device(),
            vad_analyzer=create_vad_analyzer(),
        )
    )

    engine = InterviewEngine(config, transport, settings=Settings.load())
    print("Starting interview — speak after the greeting. Ctrl+C to stop early.")
    await engine.start()

    evaluation = await engine.finish()
    print("\n--- EVALUATION ---")
    print(evaluation.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
