import unittest

from ai_interviewer.interview.interview_state import AnswerQuality, InterviewPhase, InterviewState, assess_answer_quality
from ai_interviewer.models.interview_config import Difficulty, InterviewConfig, InterviewType


def make_state(**overrides) -> InterviewState:
    config = InterviewConfig(
        candidate_name="Rahul",
        target_role="Backend Developer",
        experience="3 years",
        skills=["Python", "FastAPI"],
        difficulty=Difficulty.MEDIUM,
        interview_type=InterviewType.MIXED,
        max_questions=overrides.pop("max_questions", 8),
    )
    return InterviewState(config=config, **overrides)


class TestAnswerQuality(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(assess_answer_quality(""), AnswerQuality.EMPTY)
        self.assertEqual(assess_answer_quality("   "), AnswerQuality.EMPTY)

    def test_vague_short(self):
        self.assertEqual(assess_answer_quality("Not sure"), AnswerQuality.VAGUE)

    def test_vague_hedge(self):
        text = "I guess maybe I would probably try something like connection pooling"
        self.assertEqual(assess_answer_quality(text), AnswerQuality.VAGUE)

    def test_adequate(self):
        text = "I would use a connection pool sized to the expected concurrent load."
        self.assertEqual(assess_answer_quality(text), AnswerQuality.ADEQUATE)

    def test_strong(self):
        text = " ".join(["word"] * 45)
        self.assertEqual(assess_answer_quality(text), AnswerQuality.STRONG)


class TestInterviewState(unittest.TestCase):
    def test_initial_phase(self):
        state = make_state()
        self.assertEqual(state.phase, InterviewPhase.INITIALIZING)
        self.assertEqual(state.current_difficulty, "medium")

    def test_topics_planned_include_skills_and_behavioral_themes(self):
        state = make_state()
        self.assertIn("Python", state.topics_planned)
        self.assertIn("ownership", state.topics_planned)

    def test_technical_only_excludes_behavioral_themes(self):
        state = make_state()
        state.config = state.config.model_copy(update={"interview_type": InterviewType.TECHNICAL})
        state.topics_planned = state._plan_topics()
        self.assertNotIn("ownership", state.topics_planned)

    def test_record_question_tracks_counts_and_topics(self):
        state = make_state()
        state.record_question("Tell me about a time you owned a project.", topic="ownership", is_follow_up=False)
        self.assertEqual(state.primary_question_count, 1)
        self.assertIn("ownership", state.topics_covered)
        self.assertEqual(state.active_topic, "ownership")

    def test_follow_up_does_not_change_active_topic_or_primary_count(self):
        state = make_state()
        state.record_question("Q1", topic="Python", is_follow_up=False)
        state.record_question("Follow-up", topic="Python", is_follow_up=True)
        self.assertEqual(state.primary_question_count, 1)
        self.assertEqual(state.follow_up_count, 1)
        self.assertEqual(state.consecutive_follow_ups, 1)
        self.assertEqual(state.active_topic, "Python")

    def test_record_answer_flags_vague_observation(self):
        state = make_state()
        state.record_answer("not sure", topic="Python")
        self.assertEqual(state.last_answer_quality, AnswerQuality.VAGUE)
        self.assertTrue(any("Python" in obs for obs in state.observations))

    def test_topics_remaining_shrinks_as_covered(self):
        state = make_state()
        before = len(state.topics_remaining)
        state.record_question("Q1", topic="Python", is_follow_up=False)
        self.assertEqual(len(state.topics_remaining), before - 1)

    def test_context_summary_is_bounded_and_readable(self):
        state = make_state()
        state.record_question("Q1", topic="Python", is_follow_up=False)
        summary = state.context_summary()
        self.assertIn("Python", summary)
        self.assertIn("Phase:", summary)

    def test_recent_history_bounded(self):
        state = make_state()
        for i in range(10):
            state.record_question(f"Q{i}", topic="Python", is_follow_up=False)
            state.record_answer(f"A{i}", topic="Python")
        self.assertEqual(len(state.recent_history(n_pairs=3)), 6)


if __name__ == "__main__":
    unittest.main()
