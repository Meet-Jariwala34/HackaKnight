import json
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Optional imports for handling file uploads (PDF and Images)
try:
    from pypdf import PdfReader

    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False

try:
    from PIL import Image
    import pytesseract

    OCR_SUPPORT = True
except ImportError:
    OCR_SUPPORT = False

# ==========================================================================
# Stopwords & Taxonomies
# ==========================================================================
_STOPWORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
    'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him',
    'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'me', 'more',
    'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some',
    'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will',
    'with', 'you', 'your', 'yours', 'yourself', 'yourselves',
}

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*(?:\+\+|#)?")

DOMAIN_SKILLS = {
    "Full Stack Development": {
        "javascript", "typescript", "react", "angular", "vue", "node", "express", "next.js",
        "html", "css", "tailwind", "bootstrap", "rest api", "graphql", "sql", "postgresql",
        "mongodb", "mysql", "redis", "docker", "kubernetes", "git", "ci cd", "aws", "azure",
        "gcp", "microservices", "websocket", "jwt", "oauth", "unit testing", "webpack", "redux",
    },
    "Cybersecurity": {
        "network security", "penetration testing", "vulnerability assessment", "siem", "ids",
        "ips", "firewall", "encryption", "cryptography", "malware analysis", "incident response",
        "threat intelligence", "owasp", "nist", "iso 27001", "soc", "wireshark", "metasploit",
        "burp suite", "nmap", "kali linux", "zero trust", "iam", "risk assessment", "compliance",
        "gdpr", "forensics", "reverse engineering", "sql injection", "phishing", "ceh", "cissp",
    },
    "Game Development": {
        "unity", "unreal engine", "c++", "csharp", "game design", "3d modeling", "animation",
        "physics engine", "shader", "opengl", "directx", "vulkan", "level design", "game ai",
        "multiplayer networking", "blender", "maya", "sprite", "collision detection",
        "game loop", "rendering pipeline", "vr", "ar", "mobile game development", "gameplay",
    },
    "AI/ML Engineering": {
        "python", "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
        "scikit-learn", "pandas", "numpy", "nlp", "computer vision", "neural network", "cnn",
        "rnn", "transformer", "llm", "reinforcement learning", "model deployment", "mlops",
        "feature engineering", "hyperparameter tuning", "data pipeline", "sql", "hugging face",
        "generative ai", "prompt engineering", "vector database", "docker", "aws sagemaker",
    },
    "HR": {
        "talent acquisition", "recruitment", "onboarding", "employee relations",
        "performance management", "compensation and benefits", "hris", "workday", "ats",
        "payroll", "labor law", "diversity and inclusion", "conflict resolution",
        "employee engagement", "training and development", "succession planning",
        "workforce planning", "hr policies", "exit interview", "background check",
    },
    "Data Science": {
        "python", "r", "sql", "machine learning", "statistics", "pandas", "numpy",
        "scikit-learn", "data visualization", "tableau", "power bi", "a/b testing",
        "predictive modeling", "data pipelines", "big data", "spark", "hadoop", "etl",
    },
    "Marketing": {
        "seo", "sem", "google ads", "meta ads", "content strategy", "email marketing",
        "marketing automation", "hubspot", "a/b testing", "conversion rate", "analytics",
        "social media marketing", "brand strategy", "copywriting", "crm", "google analytics",
    },
}

SYNONYMS = {
    "js": "javascript", "ts": "typescript", "k8s": "kubernetes", "ml": "machine learning",
    "ai": "artificial intelligence", "dl": "deep learning", "nn": "neural network",
    "cv": "computer vision", "nlp": "natural language processing", "db": "database",
    "ci/cd": "ci cd", "ux": "user experience", "ui": "user interface", "iam": "identity access management",
    "pen testing": "penetration testing", "pentest": "penetration testing", "infosec": "cybersecurity",
    "hr": "human resources", "ats": "applicant tracking system", "sql injection": "sql injection",
    "unreal": "unreal engine", "genai": "generative ai", "llms": "llm",
}

JD_FLUFF_WORDS = {
    "looking", "seeking", "hiring", "experience", "experienced", "familiarity", "familiar",
    "preferred", "required", "requirement", "requirements", "skilled", "skills", "background",
    "hands", "strong", "systems", "processes", "process", "plus", "comfortable", "building",
    "consuming", "like", "years", "must", "ability", "able", "role", "responsibilities",
    "responsible", "candidate", "team", "join", "work", "working", "knowledge", "understanding",
}

FRESHER_SIGNALS = {
    "fresher", "entry level", "entry-level", "recent graduate", "final year", "b.tech",
    "b.e.", "bachelor", "graduate student", "undergraduate", "intern", "internship",
    "no prior experience", "aspiring", "seeking my first", "campus placement",
}


def _normalize(text):
    lowered = text.lower()
    for variant, canonical in SYNONYMS.items():
        lowered = re.sub(r'\b' + re.escape(variant) + r'\b', canonical, lowered)
    return lowered


# ==========================================================================
# File Extraction Utilities
# ==========================================================================
def extract_text_from_file(file_path):
    """Automatically extracts text from a PDF or Image (JPG/PNG) file path."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = file_path.lower().split('.')[-1]
    extracted_text = ""

    if ext == 'pdf':
        if not PDF_SUPPORT:
            raise ImportError("Please install 'pypdf' package to parse PDF files (pip install pypdf).")
        reader = PdfReader(file_path)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

    elif ext in ['jpg', 'jpeg', 'png']:
        if not OCR_SUPPORT:
            raise ImportError(
                "Please install 'Pillow' and 'pytesseract' for image OCR (pip install Pillow pytesseract).")
        image = Image.open(file_path)
        extracted_text = pytesseract.image_to_string(image)
    else:
        raise ValueError("Unsupported file format. Please provide a .pdf, .jpg, or .png file.")

    return extracted_text


class ResumeBuilder:
    STRONG_ACTION_VERBS = {
        "built", "led", "developed", "designed", "implemented", "architected", "optimized",
        "automated", "reduced", "increased", "launched", "delivered", "managed", "created",
        "improved", "streamlined", "spearheaded", "engineered", "deployed", "mentored",
        "negotiated", "resolved", "coordinated", "trained", "achieved", "drove", "scaled",
    }

    def __init__(self):
        self.stop_words = _STOPWORDS

    def _tokenize(self, text):
        return _WORD_RE.findall(text.lower())

    def parse_resume(self, text):
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        emails = re.findall(email_pattern, text)

        phone_pattern = r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        phones = re.findall(phone_pattern, text)

        text_for_terms = re.sub(email_pattern, ' ', text)
        text_for_terms = re.sub(phone_pattern, ' ', text_for_terms)
        words = self._tokenize(text_for_terms)
        filtered_words = [w for w in words if w not in self.stop_words and len(w) > 2]

        return {
            "email": emails[0] if emails else "Not found",
            "phone": phones[0] if phones else "Not found",
            "key_terms": list(dict.fromkeys(filtered_words))[:30],
            "raw_text": text,
        }

    def detect_domain(self, resume_text, job_description=""):
        combined = _normalize(resume_text + " " + job_description)
        best_domain, best_score = "General", 0
        for domain, skills in DOMAIN_SKILLS.items():
            score = sum(1 for skill in skills if re.search(r'\b' + re.escape(skill) + r'\b', combined))
            if score > best_score:
                best_domain, best_score = domain, score
        return best_domain

    def compute_domain_ats_score(self, resume_text, job_description):
        if not resume_text.strip() or not job_description.strip():
            return 0.0, [], []

        norm_resume = _normalize(resume_text)
        norm_jd = _normalize(job_description)

        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([norm_jd, norm_resume])
        semantic_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0] * 100

        count_vectorizer = CountVectorizer(stop_words='english', ngram_range=(1, 2))
        jd_counts = count_vectorizer.fit_transform([norm_jd]).toarray()[0]
        jd_terms = count_vectorizer.get_feature_names_out()

        candidates = [(term, count) for term, count in zip(jd_terms, jd_counts) if count > 0 and len(term) > 2]
        candidates = [
            (term, count) for term, count in candidates
            if not any(word in JD_FLUFF_WORDS for word in term.split())
        ]
        candidates.sort(key=lambda t: (t[0].count(' '), -t[1]))
        jd_keywords = [term for term, _ in candidates[:20]]

        matched_keywords = [kw for kw in jd_keywords if re.search(r'\b' + re.escape(kw) + r'\b', norm_resume)]
        missing_keywords = [kw for kw in jd_keywords if kw not in matched_keywords]

        keyword_match_score = (len(matched_keywords) / len(jd_keywords) * 100) if jd_keywords else semantic_score
        final_ats_score = round((0.35 * semantic_score) + (0.65 * keyword_match_score), 2)

        return min(final_ats_score, 100.0), matched_keywords, missing_keywords

    def find_missing_domain_skills(self, resume_text, domain, limit=8):
        if domain not in DOMAIN_SKILLS:
            return []
        norm_resume = _normalize(resume_text)
        missing = [
            skill for skill in DOMAIN_SKILLS[domain]
            if not re.search(r'\b' + re.escape(skill) + r'\b', norm_resume)
        ]
        return sorted(missing)[:limit]

    def detect_experience_level(self, resume_text):
        lowered = resume_text.lower()
        if re.search(r'\b(\d+)\+?\s*(?:years?|yrs?)\b', lowered):
            years_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)', lowered)
            if any(int(y) >= 1 for y in years_matches):
                return "Experienced"
        if any(signal in lowered for signal in FRESHER_SIGNALS):
            return "Fresher"
        return "Experienced"

    def analyze_to_json(self, resume_text, job_description, domain=None, experience_level=None):
        if not domain:
            domain = self.detect_domain(resume_text, job_description)
        if not experience_level:
            experience_level = self.detect_experience_level(resume_text)

        parsed_data = self.parse_resume(resume_text)
        ats_score, matched, missing = self.compute_domain_ats_score(resume_text, job_description)

        output_dict = {
            "domain_focus": domain,
            "experience_level": experience_level,
            "contact_info": {
                "email": parsed_data["email"],
                "phone": parsed_data["phone"],
            },
            "ats_evaluation": {
                "score_percentage": ats_score,
                "matched_keywords": matched,
                "missing_keywords": missing,
            }
        }
        return json.dumps(output_dict, indent=4)


# ==========================================================================
# Execution Block with File Upload Integration
# ==========================================================================
if __name__ == "__main__":
    bot = ResumeBuilder()

    print("=== Automated ATS Resume Analyzer (File Upload Mode) ===")

    # User provides file path instead of manual typing
    file_path = input("Enter the path to your resume file (.pdf, .jpg, .png): ").strip().strip('"')

    try:
        user_resume = extract_text_from_file(file_path)
        print("[Success] Resume text automatically parsed from file.")
    except Exception as e:
        print(f"[Error reading file]: {e}")
        user_resume = ""

    print("\nEnter or paste the Job Description text (press Enter twice or type END on a new line when finished):")
    jd_lines = []
    while True:
        try:
            line = input()
            if line.strip() == "END":
                break
            jd_lines.append(line)
        except EOFError:
            break
    user_jd = "\n".join(jd_lines)

    if user_resume.strip():
        result_json = bot.analyze_to_json(user_resume, user_jd)
        print("\n================== ANALYSIS RESULT ==================")
        print(result_json)
    else:
        print("\n[Aborted] Cannot run analysis due to empty resume text extraction.")