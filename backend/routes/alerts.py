from fastapi import APIRouter, Query, BackgroundTasks
from supabase import create_client
from pydantic import BaseModel
from groq import Groq
from typing import Optional
import os, smtplib, json, re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")

class AlertCreate(BaseModel):
    user_id: str
    user_email: str
    user_name: Optional[str] = ""
    roles: list = []
    locations: list = []
    job_types: list = []
    min_salary: Optional[str] = ""
    active: Optional[bool] = True

def strip_html(text: str) -> str:
    if not text: return ""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&[a-z]+;', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:600]

def send_email(to_email: str, subject: str, html_body: str):
    if not SMTP_EMAIL or not SMTP_PASS:
        print("SMTP not configured — skipping email")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"JobsQ AI <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SMTP_EMAIL, SMTP_PASS)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

@router.get("/")
async def get_alert(user_id: str = Query(...)):
    try:
        result = supabase.table("job_alerts").select("*").eq("user_id", user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        return {"error": str(e)}

@router.post("/")
async def create_alert(data: AlertCreate):
    try:
        existing = supabase.table("job_alerts").select("id").eq("user_id", data.user_id).execute()
        payload = {
            "user_id": data.user_id, "user_email": data.user_email,
            "user_name": data.user_name, "roles": data.roles,
            "locations": data.locations, "job_types": data.job_types,
            "min_salary": data.min_salary, "active": data.active,
        }
        if existing.data:
            result = supabase.table("job_alerts").update(payload).eq("user_id", data.user_id).execute()
        else:
            result = supabase.table("job_alerts").insert(payload).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.delete("/")
async def delete_alert(user_id: str = Query(...)):
    try:
        supabase.table("job_alerts").delete().eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/notifications")
async def get_notifications(user_id: str = Query(...)):
    try:
        result = supabase.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
        return result.data or []
    except Exception as e:
        return {"error": str(e)}

@router.patch("/notifications/{notif_id}/read")
async def mark_read(notif_id: int):
    try:
        supabase.table("notifications").update({"read": True}).eq("id", notif_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/check-and-notify")
async def check_and_notify(background_tasks: BackgroundTasks):
    try:
        alerts = supabase.table("job_alerts").select("*").eq("active", True).execute()
        if not alerts.data:
            return {"message": "No active alerts"}
        sent = 0
        for alert in alerts.data:
            roles = alert.get("roles", [])
            locations = alert.get("locations", [])
            matching_jobs = []
            seen = set()
            for role in roles[:3]:
                query = supabase.table("jobs").select("id,title,company,location,salary,job_type,url,created_at").ilike("title", f"%{role}%").order("created_at", desc=True).limit(10).execute()
                for job in (query.data or []):
                    if job["id"] not in seen:
                        if locations:
                            job_loc = (job.get("location") or "").lower()
                            if not any(loc.lower() in job_loc for loc in locations):
                                continue
                        seen.add(job["id"])
                        matching_jobs.append(job)
            if matching_jobs:
                supabase.table("notifications").insert({
                    "user_id": alert["user_id"],
                    "message": f"{len(matching_jobs)} new jobs match your alert for: {chr(44).join(roles[:2])}",
                    "job_count": len(matching_jobs),
                    "read": False
                }).execute()
                sent += 1
        return {"success": True, "alerts_processed": len(alerts.data), "emails_sent": sent}
    except Exception as e:
        return {"error": str(e)}

@router.post("/salary-predict")
async def predict_salary(data: dict):
    """AI-powered salary prediction"""
    try:
        job_title = data.get("job_title", "")
        skills = data.get("skills", [])
        location = data.get("location", "India")
        experience = data.get("experience_years", "1-3")

        prompt = f"""Predict salary range for this job in India. Return ONLY valid JSON with NO markdown:
{{"min_salary":"X LPA","max_salary":"Y LPA","avg_salary":"Z LPA","currency":"INR","period":"per annum","market_insight":"one sentence about market demand","skills_that_increase_salary":["skill1","skill2","skill3"]}}

Job Title: {job_title}
Key Skills: {", ".join(skills[:8]) if skills else "General"}
Location: {location}
Experience: {experience} years"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, max_tokens=400
        )
        raw = response.choices[0].message.content.strip()
        if "<think>" in raw: raw = raw.split("</think>")[-1].strip()
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else parts[0]
            raw = raw.replace("json","").strip()
        start = raw.find("{"); end = raw.rfind("}")
        if start != -1 and end != -1: raw = raw[start:end+1]
        result = json.loads(raw)
        return {"success": True, "salary": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/skill-gap")
async def analyze_skill_gap(data: dict):
    """Analyze skill gap between user skills and job requirements"""
    try:
        user_skills = data.get("user_skills", [])
        job_title = data.get("job_title", "")
        job_description = data.get("job_description", "")

        if not user_skills:
            return {"success": False, "error": "No skills provided. Please upload your resume first."}

        # Strip HTML from job description
        job_description_clean = strip_html(job_description)

        prompt = f"""Analyze the skill gap between this candidate and job. Return ONLY valid JSON with NO markdown, NO extra text:
{{"matched_skills":["skill1","skill2"],"missing_skills":["skill1","skill2"],"match_percentage":75,"priority_skills":[{{"skill":"skill1","reason":"why this skill matters for this role","learn_url":"https://www.coursera.org/search?query=skill1","time_to_learn":"2 weeks"}},{{"skill":"skill2","reason":"why important","learn_url":"https://www.udemy.com/courses/search/?q=skill2","time_to_learn":"1 month"}}],"overall_assessment":"2 sentence assessment of candidate fit","recommendation":"clear advice on whether to apply and what to improve"}}

Candidate Skills: {", ".join(user_skills[:15])}
Job Title: {job_title}
Job Description: {job_description_clean if job_description_clean else "Not provided - base on job title only"}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2, max_tokens=900
        )
        raw = response.choices[0].message.content.strip()
        if "<think>" in raw: raw = raw.split("</think>")[-1].strip()
        if "```" in raw:
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else parts[0]
            raw = raw.replace("json","").strip()
        start = raw.find("{"); end = raw.rfind("}")
        if start != -1 and end != -1: raw = raw[start:end+1]
        result = json.loads(raw)
        return {"success": True, "analysis": result}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"AI response parsing failed: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}