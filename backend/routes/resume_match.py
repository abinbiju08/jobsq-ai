from fastapi import APIRouter, UploadFile, File
from supabase import create_client
from groq import Groq
import PyPDF2, io, os, json
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_text(file_bytes):
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"PDF error: {e}")
        return ""

def parse_json_safe(raw: str) -> dict:
    """Try multiple ways to extract JSON from model response"""
    raw = raw.strip()

    # Strip thinking tags
    if '<think>' in raw:
        raw = raw.split('</think>')[-1].strip()

    # Strip markdown code blocks
    if '```json' in raw:
        raw = raw.split('```json')[1].split('```')[0].strip()
    elif '```' in raw:
        raw = raw.split('```')[1].strip()

    # Find JSON object in response
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1:
        raw = raw[start:end+1]

    return json.loads(raw)

@router.post("/match-jobs")
async def match_jobs(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        resume_text = extract_text(pdf_bytes)

        if not resume_text:
            return {"error": "Could not read PDF", "analysis": {}, "jobs": []}

        print(f"Extracted {len(resume_text)} chars from resume")

        # Try primary model
        analysis = None
        models_to_try = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]

        for model in models_to_try:
            try:
                print(f"Trying model: {model}")
                response = groq_client.chat.completions.create(
                    model=model,
                    messages=[{
                        "role": "user",
                        "content": f"""Extract skills and roles from this resume. Reply with JSON only:
{{"skills":["skill1","skill2","skill3","skill4","skill5"],"suitable_roles":["role1","role2","role3"],"experience_years":1,"strengths":["strength1","strength2"],"search_keywords":["keyword1","keyword2","keyword3","keyword4","keyword5"]}}

Resume text:
{resume_text[:2000]}"""
                    }],
                    temperature=0.1,
                    max_tokens=500
                )

                raw = response.choices[0].message.content
                print(f"Raw response ({len(raw)} chars): {raw[:200]}")

                if raw and raw.strip():
                    analysis = parse_json_safe(raw)
                    print(f"Parsed analysis: {analysis}")
                    break

            except Exception as e:
                print(f"Model {model} failed: {e}")
                continue

        # Fallback if all models fail
        if not analysis:
            print("All models failed, using keyword extraction fallback")
            words = resume_text.lower().split()
            common_skills = ["python","java","react","node","sql","aws","docker","javascript","typescript","flutter","kotlin","swift","machine learning","data science","devops","git"]
            found_skills = [s for s in common_skills if s in resume_text.lower()][:5] or ["software development"]
            analysis = {
                "skills": found_skills,
                "suitable_roles": ["Software Engineer", "Developer", "IT Professional"],
                "experience_years": 1,
                "strengths": ["Technical skills", "Problem solving"],
                "search_keywords": found_skills[:5]
            }

        # Fetch jobs from Supabase
        result = supabase.table("jobs").select(
            "id,title,company,location,city,job_type,salary,category,posted_at,url,logo,description"
        ).order("created_at", desc=True).limit(100).execute()

        all_jobs = result.data or []
        print(f"Fetched {len(all_jobs)} jobs from DB")

        all_terms = [s.lower().strip() for s in (
            analysis.get('skills', []) +
            analysis.get('search_keywords', []) +
            analysis.get('suitable_roles', [])
        ) if len(s) > 1]

        scored_jobs = []
        for job in all_jobs:
            title = (job.get('title') or '').lower()
            desc = (job.get('description') or '').lower()
            score = 0
            matched = []
            for term in all_terms:
                if term in title:
                    score += 20
                    if term not in matched: matched.append(term)
                elif term in desc:
                    score += 8
                    if term not in matched: matched.append(term)
            job['matchScore'] = min(score, 99)
            job['matchedSkills'] = matched[:4]
            scored_jobs.append(job)

        scored_jobs.sort(key=lambda x: x['matchScore'], reverse=True)
        return {"analysis": analysis, "jobs": scored_jobs[:25]}

    except Exception as e:
        print(f"Error: {e}")
        import traceback; traceback.print_exc()
        return {"error": str(e), "analysis": {}, "jobs": []}