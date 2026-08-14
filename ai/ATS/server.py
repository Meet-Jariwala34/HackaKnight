import json
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from project import ResumeBuilder

app = FastAPI(title="ATS Resume Analyzer")
bot = ResumeBuilder()


class AnalysisRequest(BaseModel):
    resume_text: str
    job_description: str
    domain: str | None = None


@app.post("/analyze")
def analyze(request: AnalysisRequest):
    raw_result = bot.analyze_to_json(
        request.resume_text,
        request.job_description,
        request.domain,
    )
    try:
        return json.loads(raw_result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="ResumeBuilder returned malformed JSON")


if __name__ == "__main__":
    print("Server running at http://0.0.0.0:8000")
    print("API docs available at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
