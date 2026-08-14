import unittest

from pydantic import ValidationError

from ai_interviewer.models.interview_config import Difficulty, InterviewConfig, InterviewType


def make_config(**overrides) -> InterviewConfig:
    defaults = dict(
        candidate_name="Rahul",
        target_role="Backend Developer",
        target_company="Google",
        experience="3 years",
        skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        job_description="Backend engineer responsible for building scalable APIs.",
        difficulty=Difficulty.HARD,
        interview_type=InterviewType.MIXED,
    )
    defaults.update(overrides)
    return InterviewConfig(**defaults)


class TestInterviewConfig(unittest.TestCase):
    def test_valid_config(self):
        config = make_config()
        self.assertEqual(config.candidate_name, "Rahul")
        self.assertEqual(config.difficulty, Difficulty.HARD)
        self.assertEqual(config.interview_type, InterviewType.MIXED)

    def test_defaults(self):
        config = InterviewConfig(candidate_name="Sam", target_role="QA Engineer", experience="1 year")
        self.assertEqual(config.difficulty, Difficulty.MEDIUM)
        self.assertEqual(config.interview_type, InterviewType.MIXED)
        self.assertEqual(config.skills, [])
        self.assertIsNone(config.target_company)
        self.assertEqual(config.max_questions, 8)

    def test_blank_candidate_name_rejected(self):
        with self.assertRaises(ValidationError):
            make_config(candidate_name="   ")

    def test_skills_are_trimmed_and_blanks_dropped(self):
        config = make_config(skills=[" Python ", "", "  ", "Go"])
        self.assertEqual(config.skills, ["Python", "Go"])

    def test_max_questions_bounds(self):
        with self.assertRaises(ValidationError):
            make_config(max_questions=2)
        with self.assertRaises(ValidationError):
            make_config(max_questions=25)

    def test_invalid_interview_type_rejected(self):
        with self.assertRaises(ValidationError):
            make_config(interview_type="not_a_type")


if __name__ == "__main__":
    unittest.main()
