from fastapi import APIRouter, UploadFile, File
from supabase import create_client
from groq import Groq
import PyPDF2, io, os, json
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def extract_text(file_bytes, filename):
    text = ""
    if filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            text += page.extract_text() or ""
    else:
        text = file_bytes.decode("utf-8", errors="ignore")
    return text.strip()

@router.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    content = await file.read()
    text = extract_text(content, file.filename)

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{
            "role": "user",
            "content": f"""Analyze this resume and return ONLY valid JSON, no markdown, no thinking:
{{
  "ats_score": <0-100>,
  "matched_keywords": ["skill1","skill2","skill3","skill4","skill5"],
  "missing_keywords": ["gap1","gap2","gap3"],
  "sections": {{"experience":<0-100>,"skills":<0-100>,"education":<0-100>,"formatting":<0-100>}},
  "search_keywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
  "suitable_roles": ["role1","role2","role3"],
  "suggestions": "specific improvement tips"
}}

Resume:
{text[:3000]}"""
        }],
        temperature=0.1,
        max_tokens=800
    )

    raw = response.choices[0].message.content.strip()
    if '<think>' in raw:
        raw = raw.split('</think>')[-1].strip()
    if '```' in raw:
        raw = raw.split('```')[1].replace('json','').strip()
    analysis = json.loads(raw)

    all_terms = [k.lower().strip() for k in (
        analysis.get('search_keywords', []) +
        analysis.get('suitable_roles', []) +
        analysis.get('matched_keywords', [])[:3]
    ) if len(k) > 1]

    scored = []
    seen = set()

    for term in all_terms[:3]:
        try:
            res = supabase.table("jobs").select(
                "id,title,company,location,salary,job_type,url"
            ).ilike("title", f"%{term}%").limit(10).execute()
            for job in (res.data or []):
                if job['id'] not in seen:
                    seen.add(job['id'])
                    title_lower = (job.get('title') or '').lower()
                    match_count = sum(1 for t in all_terms if t in title_lower)
                    scored.append({
                        "title": job.get('title',''),
                        "company": job.get('company',''),
                        "match": min(70 + match_count * 10, 99),
                        "salary": job.get('salary','Not disclosed'),
                        "location": job.get('location',''),
                        "url": job.get('url',''),
                        "job_type": job.get('job_type','')
                    })
        except: pass

    if len(scored) < 3:
        res = supabase.table("jobs").select(
            "id,title,company,location,salary,job_type,url"
        ).order("created_at", desc=True).limit(10).execute()
        for job in (res.data or []):
            if job['id'] not in seen:
                seen.add(job['id'])
                scored.append({
                    "title": job.get('title',''),
                    "company": job.get('company',''),
                    "match": 65,
                    "salary": job.get('salary','Not disclosed'),
                    "location": job.get('location',''),
                    "url": job.get('url',''),
                    "job_type": job.get('job_type','')
                })

    scored.sort(key=lambda x: x['match'], reverse=True)
    analysis['top_matches'] = scored[:5]
    return analysis