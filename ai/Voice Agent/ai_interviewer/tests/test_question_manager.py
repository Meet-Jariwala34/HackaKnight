import unittest

from ai_interviewer.interview.interview_state import InterviewPhase, InterviewState
from ai_interviewer.interview.question_manager import QuestionManager
from ai_interviewer.models.interview_config import Difficulty, InterviewConfig, InterviewType


def make_state(max_questions: int = 3) -> InterviewState:
    config = InterviewConfig(
        candidate_name="Rahul",
        target_role="Backend Developer",
        experience="3 years",
        skills=["Python", "FastAPI", "Docker"],
        difficulty=Difficulty.MEDIUM,
        interview_type=InterviewType.TECHNICAL,
        max_questions=max_questions,
    )
    return InterviewState(config=config)


class TestQuestionManager(unittest.TestCase):
    def setUp(self):
        self.qm = QuestionManager()

    def test_opening_sequence(self):
        state = make_state()

        greet = self.qm.decide_next(state)
        self.assertEqual(greet.action, "greet")
        self.assertEqual(state.phase, InterviewPhase.GREETING)

        confirm = self.qm.decide_next(state)
        self.assertEqual(confirm.action, "confirm_background")
        self.assertEqual(state.phase, InterviewPhase.INTRODUCTION)

        first_question = self.qm.decide_next(state)
        self.assertEqual(first_question.action, "ask_question")
        self.assertEqual(state.phase, InterviewPhase.QUESTIONING)

    def test_vague_answer_triggers_follow_up(self):
        state = make_state()
        self.qm.decide_next(state)  # greet
        self.qm.decide_next(state)  # confirm_background
        decision = self.qm.decide_next(state)  # first question
        state.record_question("Q1", topic=decision.topic, is_follow_up=False)
        state.record_answer("not sure", topic=decision.topic)

        follow_up = self.qm.decide_next(state)
        self.assertEqual(follow_up.action, "follow_up")
        self.assertTrue(follow_up.is_follow_up)
        self.assertEqual(follow_up.topic, decision.topic)

    def test_does_not_follow_up_twice_in_a_row(self):
        state = make_state()
        self.qm.decide_next(state)
        self.qm.decide_next(state)
        decision = self.qm.decide_next(state)
        state.record_question("Q1", topic=decision.topic, is_follow_up=False)
        state.record_answer("not sure", topic=decision.topic)

        follow_up = self.qm.decide_next(state)
        self.assertEqual(follow_up.action, "follow_up")
        state.record_question("F1", topic=follow_up.topic, is_follow_up=True)
        state.record_answer("still not sure", topic=follow_up.topic)

        next_decision = self.qm.decide_next(state)
        self.assertNotEqual(next_decision.action, "follow_up")

    def test_strong_answer_bumps_difficulty(self):
        state = make_state()
        self.qm.decide_next(state)
        self.qm.decide_next(state)
        decision = self.qm.decide_next(state)
        state.record_question("Q1", topic=decision.topic, is_follow_up=False)
        strong_answer = " ".join(["detailed"] * 45)
        state.record_answer(strong_answer, topic=decision.topic)

        next_decision = self.qm.decide_next(state)
        self.assertEqual(next_decision.difficulty, "hard")

    def test_closes_after_question_budget(self):
        state = make_state(max_questions=3)
        self.qm.decide_next(state)  # greet
        self.qm.decide_next(state)  # confirm_background
        decision = self.qm.decide_next(state)  # first primary question
        for _ in range(3):
            state.record_question(f"Q-{decision.topic}", topic=decision.topic, is_follow_up=False)
            state.record_answer("A reasonable answer about the topic at hand.", topic=decision.topic)
            decision = self.qm.decide_next(state)

        final = decision
        self.assertEqual(final.action, "final_question")
        self.assertEqual(state.phase, InterviewPhase.FINAL_QUESTIONS)

        closing = self.qm.decide_next(state)
        self.assertEqual(closing.action, "close_interview")
        self.assertEqual(state.phase, InterviewPhase.CLOSING)

    def test_never_repeats_a_covered_topic(self):
        state = make_state(max_questions=5)
        self.qm.decide_next(state)
        self.qm.decide_next(state)
        seen_topics = []
        decision = self.qm.decide_next(state)
        while decision.action == "ask_question":
            seen_topics.append(decision.topic)
            state.record_question(f"Q-{decision.topic}", topic=decision.topic, is_follow_up=False)
            state.record_answer("A reasonably complete and specific answer.", topic=decision.topic)
            decision = self.qm.decide_next(state)
        self.assertEqual(len(seen_topics), len(set(seen_topics)))


if __name__ == "__main__":
    unittest.main()
