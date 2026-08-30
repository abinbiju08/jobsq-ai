from fastapi import APIRouter, UploadFile, File
import google.generativeai as genai
import PyPDF2
import io, os, json
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

def extract_text(file_bytes, filename):
    text = ""
    if filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            text += page.extract_text() or ""
    else:
        text = file_bytes.decode("utf-8", errors="ignore")
    return text

@router.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = extract_text(content, file.filename)

    prompt = f"""
    Analyze this resume and return ONLY a JSON object with these exact keys:
    {{
      "ats_score": <number 0-100>,
      "matched_keywords": ["keyword1", "keyword2"],
      "missing_keywords": ["keyword1", "keyword2"],
      "sections": {{"experience": <0-100>, "skills": <0-100>, "education": <0-100>, "formatting": <0-100>}},
      "top_matches": [
        {{"title": "Job Title", "company": "Company", "match": <0-100>, "salary": "salary range"}},
        {{"title": "Job Title", "company": "Company", "match": <0-100>, "salary": "salary range"}},
        {{"title": "Job Title", "company": "Company", "match": <0-100>, "salary": "salary range"}}
      ],
      "suggestions": "specific improvement tips"
    }}

    Resume text:
    {text[:3000]}
    """

    response = model.generate_content(prompt)
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
