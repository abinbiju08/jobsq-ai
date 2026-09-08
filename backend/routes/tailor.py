from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from groq import Groq
from supabase import create_client
from pydantic import BaseModel
import os, json, re, io
from dotenv import load_dotenv
import PyPDF2
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from fastapi.responses import StreamingResponse

load_dotenv()
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except:
        return ""

def generate_tailored_pdf(tailored: dict, job_title: str, company: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=20*mm, leftMargin=20*mm,
        topMargin=15*mm, bottomMargin=15*mm)

    styles = getSampleStyleSheet()
    name_style = ParagraphStyle('Name', fontSize=20, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1a1a2e'), spaceAfter=2, alignment=TA_CENTER)
    contact_style = ParagraphStyle('Contact', fontSize=9, fontName='Helvetica',
        textColor=colors.HexColor('#666666'), spaceAfter=8, alignment=TA_CENTER)
    section_style = ParagraphStyle('Section', fontSize=11, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#00a572'), spaceBefore=10, spaceAfter=4)
    body_style = ParagraphStyle('Body', fontSize=9.5, fontName='Helvetica',
        textColor=colors.HexColor('#333333'), spaceAfter=4, leading=14)
    bullet_style = ParagraphStyle('Bullet', fontSize=9.5, fontName='Helvetica',
        textColor=colors.HexColor('#333333'), spaceAfter=3, leftIndent=12, leading=13)
    job_title_style = ParagraphStyle('JobTitle', fontSize=10, fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1a1a2e'), spaceAfter=1)
    job_sub_style = ParagraphStyle('JobSub', fontSize=9, fontName='Helvetica',
        textColor=colors.HexColor('#666666'), spaceAfter=3)

    story = []

    # Name & contact
    name = tailored.get('name', 'Candidate Name')
    contact = tailored.get('contact', '')
    story.append(Paragraph(name, name_style))
    if contact:
        story.append(Paragraph(contact, contact_style))
    story.append(HRFlowable(width="100%", thickness=1.5,
        color=colors.HexColor('#00a572'), spaceAfter=6))

    # Tailored note
    story.append(Paragraph(
        f'<font color="#7c6ff7"><b>Tailored for:</b></font> {job_title} at {company}',
        ParagraphStyle('Note', fontSize=8.5, fontName='Helvetica',
            textColor=colors.HexColor('#7c6ff7'), spaceAfter=8,
            borderColor=colors.HexColor('#7c6ff7'), borderWidth=0.5,
            borderPadding=4, backColor=colors.HexColor('#f5f3ff'))))

    # Summary
    summary = tailored.get('summary', '')
    if summary:
        story.append(Paragraph('PROFESSIONAL SUMMARY', section_style))
        story.append(HRFlowable(width="100%", thickness=0.5,
            color=colors.HexColor('#e0e0e0'), spaceAfter=4))
        story.append(Paragraph(summary, body_style))

    # Skills
    skills = tailored.get('skills', [])
    if skills:
        story.append(Paragraph('SKILLS', section_style))
        story.append(HRFlowable(width="100%", thickness=0.5,
            color=colors.HexColor('#e0e0e0'), spaceAfter=4))
        skills_text = ' • '.join(skills)
        story.append(Paragraph(skills_text, body_style))

    # Experience
    experience = tailored.get('experience', [])
    if experience:
        story.append(Paragraph('EXPERIENCE', section_style))
        story.append(HRFlowable(width="100%", thickness=0.5,
            color=colors.HexColor('#e0e0e0'), spaceAfter=4))
        for exp in experience:
            story.append(Paragraph(
                f"<b>{exp.get('title','')}</b>", job_title_style))
            story.append(Paragraph(
                f"{exp.get('company','')} | {exp.get('duration','')}",
                job_sub_style))
            for bullet in exp.get('bullets', []):
                story.append(Paragraph(f"• {bullet}", bullet_style))
            story.append(Spacer(1, 4))

    # Education
    education = tailored.get('education', [])
    if education:
        story.append(Paragraph('EDUCATION', section_style))
        story.append(HRFlowable(width="100%", thickness=0.5,
            color=colors.HexColor('#e0e0e0'), spaceAfter=4))
        for edu in education:
            story.append(Paragraph(
                f"<b>{edu.get('degree','')}</b> — {edu.get('institution','')}",
                job_title_style))
            if edu.get('year'):
                story.append(Paragraph(edu['year'], job_sub_style))

    doc.build(story)
    return buffer.getvalue()

@router.post("/tailor")
async def tailor_resume(
    resume_file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    company: str = Form(default="Company"),
    user_id: str = Form(...)
):
    try:
        # Extract resume text
        resume_bytes = await resume_file.read()
        resume_text = extract_pdf_text(resume_bytes)
        if not resume_text:
            raise HTTPException(status_code=400, detail="Could not read resume PDF")

        # AI tailor prompt
        prompt = f"""You are an expert resume writer and ATS specialist.

ORIGINAL RESUME:
{resume_text[:3000]}

JOB TITLE: {job_title}
COMPANY: {company}
JOB DESCRIPTION:
{job_description[:2000]}

Analyze the resume and job description, then create a tailored resume that:
1. Rewrites the professional summary to align with this specific role
2. Adds missing keywords from the job description naturally
3. Reorders and emphasizes relevant skills
4. Adjusts experience bullet points to highlight relevant achievements
5. Keeps all facts true — only rephrase and add keywords, never fabricate

Return ONLY a valid JSON object:
{{
  "name": "candidate full name from resume",
  "contact": "email | phone | location from resume",
  "summary": "rewritten professional summary tailored to {job_title} at {company}",
  "skills": ["skill1", "skill2", "skill3", "...all skills including missing ones from JD"],
  "experience": [
    {{
      "title": "job title",
      "company": "company name",
      "duration": "date range",
      "bullets": ["achievement bullet 1 with keywords", "achievement bullet 2", "achievement bullet 3"]
    }}
  ],
  "education": [
    {{
      "degree": "degree name",
      "institution": "university/college name",
      "year": "graduation year"
    }}
  ],
  "keywords_added": ["keyword1", "keyword2", "keyword3"],
  "original_score": 45,
  "tailored_score": 82
}}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )

        raw = response.choices[0].message.content.strip()
        if '<think>' in raw:
            raw = raw.split('</think>')[-1].strip()
        if '```' in raw:
            raw = raw.split('```')[1].replace('json','').strip()
        start = raw.find('{')
        end = raw.rfind('}')
        if start == -1 or end == -1:
            raise HTTPException(status_code=500, detail="AI response parsing failed")

        tailored = json.loads(raw[start:end+1])

        # Generate PDF
        pdf_bytes = generate_tailored_pdf(tailored, job_title, company)

        # Return PDF as download
        filename = f"tailored_resume_{job_title.replace(' ','_')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}",
                     "X-Keywords-Added": json.dumps(tailored.get('keywords_added',[])),
                     "X-Original-Score": str(tailored.get('original_score', 0)),
                     "X-Tailored-Score": str(tailored.get('tailored_score', 0))}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-resume")
async def save_resume(
    resume_file: UploadFile = File(...),
    user_id: str = Form(...)
):
    """Save resume to Supabase storage"""
    try:
        file_bytes = await resume_file.read()
        storage_path = f"{user_id}/resume.pdf"

        # Upload to Supabase storage
        supabase.storage.from_("resumes").upload(
            storage_path, file_bytes,
            {"content-type": "application/pdf", "upsert": "true"}
        )

        # Save metadata
        supabase.table("user_resumes").upsert({
            "user_id": user_id,
            "file_name": resume_file.filename,
            "file_size": len(file_bytes),
            "storage_path": storage_path,
        }, on_conflict="user_id").execute()

        return {"success": True, "path": storage_path,
                "file_name": resume_file.filename, "file_size": len(file_bytes)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/resume-info/{user_id}")
async def get_resume_info(user_id: str):
    """Get saved resume info for a user"""
    try:
        result = supabase.table("user_resumes").select("*").eq("user_id", user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        return None


@router.post("/tailor-saved")
async def tailor_saved_resume(data: dict):
    """Tailor using saved resume from storage"""
    try:
        user_id = data.get("user_id")
        job_title = data.get("job_title", "")
        job_description = data.get("job_description", "")
        company = data.get("company", "Company")

        # Get resume from storage
        storage_path = f"{user_id}/resume.pdf"
        file_bytes = supabase.storage.from_("resumes").download(storage_path)

        resume_text = extract_pdf_text(file_bytes)
        if not resume_text:
            raise HTTPException(status_code=400, detail="Could not read saved resume")

        prompt = f"""You are an expert resume writer and ATS specialist.

ORIGINAL RESUME:
{resume_text[:3000]}

JOB TITLE: {job_title}
COMPANY: {company}
JOB DESCRIPTION:
{job_description[:2000]}

Create a tailored resume. Return ONLY valid JSON:
{{
  "name": "candidate name",
  "contact": "email | phone | location",
  "summary": "rewritten summary for this role",
  "skills": ["all relevant skills + missing ones from JD"],
  "experience": [{{"title":"","company":"","duration":"","bullets":["bullet1","bullet2"]}}],
  "education": [{{"degree":"","institution":"","year":""}}],
  "keywords_added": ["keyword1","keyword2","keyword3"],
  "original_score": 50,
  "tailored_score": 85
}}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )

        raw = response.choices[0].message.content.strip()
        if '<think>' in raw: raw = raw.split('</think>')[-1].strip()
        if '```' in raw: raw = raw.split('```')[1].replace('json','').strip()
        start = raw.find('{'); end = raw.rfind('}')
        if start == -1: raise HTTPException(status_code=500, detail="Parsing failed")
        tailored = json.loads(raw[start:end+1])

        pdf_bytes = generate_tailored_pdf(tailored, job_title, company)
        filename = f"tailored_{job_title.replace(' ','_')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Keywords-Added": json.dumps(tailored.get('keywords_added',[])),
                "X-Original-Score": str(tailored.get('original_score',0)),
                "X-Tailored-Score": str(tailored.get('tailored_score',0)),
                "Access-Control-Expose-Headers": "X-Keywords-Added,X-Original-Score,X-Tailored-Score"
            }
        )
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))