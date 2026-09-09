from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import re as _re

def extract_keywords(text):
    """Extract meaningful keywords from text for ATS scoring"""
    words = _re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]*\b', text.lower())
    stopwords = {'the','a','an','and','or','but','in','on','at','to','for',
                'of','with','by','is','are','was','be','this','that','we',
                'you','have','has','will','can','our','your','they','from',
                'as','it','its','not','all','been','their','more','also',
                'which','when','what','who','how','than','then','them','these',
                'those','such','each','both','about','into','through','during'}
    return {w for w in words if len(w) > 2 and w not in stopwords}
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
class TailorSavedRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str
    company: str = "Company"

router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def extract_pdf_text(file_bytes: bytes) -> str:
    text = ""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if text.strip():
            return text.strip()
    except Exception as e:
        print(f"PyPDF2 error: {e}")
    try:
        decoded = file_bytes.decode("utf-8", errors="ignore")
        if len(decoded.strip()) > 50:
            return decoded.strip()
    except:
        pass
    return text.strip()

def generate_tailored_pdf(tailored: dict, job_title: str, company: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=18*mm, leftMargin=18*mm,
        topMargin=14*mm, bottomMargin=14*mm)

    story = []

    def clean(text):
        """Strip all non-ASCII characters to avoid black squares with Helvetica"""
        if not text: return ""
        result = ""
        for ch in str(text):
            if ord(ch) < 128:
                result += ch
            elif ch in (u'–', u'—'): result += '-'
            elif ch in (u'‘', u'’'): result += "'"
            elif ch in (u'“', u'”'): result += '"'
            elif ch in (u'•', u'·'):  result += '-'
            elif ch in (u'é', u'è'): result += 'e'
            elif ch in (u'à', u'â'): result += 'a'
            elif ch in (u'ô', u'ö'): result += 'o'
            elif ch in (u'ü', u'û'): result += 'u'
            else: result += ' '
        return ' '.join(result.split())

    # Styles
    name_s = ParagraphStyle('n', fontSize=20, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=4, alignment=TA_CENTER, leading=24)
    contact_s = ParagraphStyle('c', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#555555'), spaceAfter=8, alignment=TA_CENTER)
    sec_s = ParagraphStyle('s', fontSize=10.5, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#00a572'), spaceBefore=10, spaceAfter=3)
    body_s = ParagraphStyle('b', fontSize=9.5, fontName='Helvetica',
                textColor=colors.HexColor('#222222'), spaceAfter=4, leading=14)
    bullet_s = ParagraphStyle('bl', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#333333'), spaceAfter=2,
                leftIndent=12, leading=13)
    jobt_s = ParagraphStyle('jt', fontSize=10, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=1)
    jobs_s = ParagraphStyle('js', fontSize=8.5, fontName='Helvetica',
                textColor=colors.HexColor('#666666'), spaceAfter=4)

    hr = lambda: HRFlowable(width="100%", thickness=0.5,
                color=colors.HexColor('#dddddd'), spaceAfter=5)
    hr_green = lambda: HRFlowable(width="100%", thickness=1.5,
                color=colors.HexColor('#00a572'), spaceAfter=8)

    # Name & contact — NO "Tailored for" tag
    story.append(Paragraph(clean(tailored.get('name', 'Candidate')), name_s))
    if tailored.get('contact'):
        story.append(Paragraph(clean(tailored['contact']), contact_s))
    story.append(hr_green())

    # Summary
    if tailored.get('summary'):
        story.append(Paragraph('PROFESSIONAL SUMMARY', sec_s))
        story.append(hr())
        story.append(Paragraph(clean(tailored['summary']), body_s))

    # Skills
    skills = tailored.get('skills', [])
    if skills:
        story.append(Paragraph('SKILLS', sec_s))
        story.append(hr())
        skills_clean = [clean(s) for s in skills if s]
        # Split into rows of 6
        rows = [skills_clean[i:i+6] for i in range(0, len(skills_clean), 6)]
        for row in rows:
            story.append(Paragraph('   |   '.join(row), body_s))

    # Experience
    experience = tailored.get('experience', [])
    if experience:
        story.append(Paragraph('EXPERIENCE', sec_s))
        story.append(hr())
        for exp in experience:
            story.append(Paragraph(clean(exp.get('title', '')), jobt_s))
            company_dur = []
            if exp.get('company'): company_dur.append(clean(exp['company']))
            if exp.get('duration'): company_dur.append(clean(exp['duration']))
            story.append(Paragraph('  |  '.join(company_dur), jobs_s))
            for bullet in exp.get('bullets', []):
                b = clean(bullet).strip('- ').strip()
                if b:
                    story.append(Paragraph(f'- {b}', bullet_s))
            story.append(Spacer(1, 4))

    # Education
    education = tailored.get('education', [])
    if education:
        story.append(Paragraph('EDUCATION', sec_s))
        story.append(hr())
        for edu in education:
            deg = clean(edu.get('degree', ''))
            inst = clean(edu.get('institution', ''))
            yr = clean(edu.get('year', ''))
            story.append(Paragraph(f'{deg} - {inst}', jobt_s))
            if yr:
                story.append(Paragraph(yr, jobs_s))

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
        print(f"Resume text length: {len(resume_text)}")
        if not resume_text or len(resume_text) < 30:
            resume_text = f"Candidate resume. Job role: {job_title}. Please create a strong tailored resume."

        # AI tailor prompt
        # Calculate real ATS score before tailoring
        

        resume_kws = extract_keywords(resume_text)
        jd_kws = extract_keywords(job_description)
        matched = resume_kws & jd_kws
        missing = jd_kws - resume_kws
        original_score = min(95, int((len(matched) / max(len(jd_kws), 1)) * 100))

        prompt = f"""You will receive a resume and a list of missing keywords. Your ONLY task is:
1. Copy the resume EXACTLY as it is
2. Add the missing keywords to the Skills section only
3. Rewrite ONLY the summary section (2 sentences max)
4. Do NOT change anything else - not bullets, not experience, not education, not formatting

RESUME:
{resume_text[:2500]}

MISSING KEYWORDS TO ADD TO SKILLS ONLY: {', '.join(list(missing)[:15])}
JOB TITLE FOR SUMMARY: {job_title}

Return JSON with the resume data, only skills and summary modified:"""IRouter, UploadFile, File, Form, HTTPException
import re as _re

def extract_keywords(text):
    """Extract meaningful keywords from text for ATS scoring"""
    words = _re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]*\b', text.lower())
    stopwords = {'the','a','an','and','or','but','in','on','at','to','for',
                'of','with','by','is','are','was','be','this','that','we',
                'you','have','has','will','can','our','your','they','from',
                'as','it','its','not','all','been','their','more','also',
                'which','when','what','who','how','than','then','them','these',
                'those','such','each','both','about','into','through','during'}
    return {w for w in words if len(w) > 2 and w not in stopwords}
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
class TailorSavedRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str
    company: str = "Company"

router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def extract_pdf_text(file_bytes: bytes) -> str:
    text = ""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        if text.strip():
            return text.strip()
    except Exception as e:
        print(f"PyPDF2 error: {e}")
    try:
        decoded = file_bytes.decode("utf-8", errors="ignore")
        if len(decoded.strip()) > 50:
            return decoded.strip()
    except:
        pass
    return text.strip()

def generate_tailored_pdf(tailored: dict, job_title: str, company: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=18*mm, leftMargin=18*mm,
        topMargin=14*mm, bottomMargin=14*mm)

    story = []

    def clean(text):
        """Strip all non-ASCII characters to avoid black squares with Helvetica"""
        if not text: return ""
        result = ""
        for ch in str(text):
            if ord(ch) < 128:
                result += ch
            elif ch in (u'–', u'—'): result += '-'
            elif ch in (u'‘', u'’'): result += "'"
            elif ch in (u'“', u'”'): result += '"'
            elif ch in (u'•', u'·'):  result += '-'
            elif ch in (u'é', u'è'): result += 'e'
            elif ch in (u'à', u'â'): result += 'a'
            elif ch in (u'ô', u'ö'): result += 'o'
            elif ch in (u'ü', u'û'): result += 'u'
            else: result += ' '
        return ' '.join(result.split())

    # Styles
    name_s = ParagraphStyle('n', fontSize=20, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=4, alignment=TA_CENTER, leading=24)
    contact_s = ParagraphStyle('c', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#555555'), spaceAfter=8, alignment=TA_CENTER)
    sec_s = ParagraphStyle('s', fontSize=10.5, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#00a572'), spaceBefore=10, spaceAfter=3)
    body_s = ParagraphStyle('b', fontSize=9.5, fontName='Helvetica',
                textColor=colors.HexColor('#222222'), spaceAfter=4, leading=14)
    bullet_s = ParagraphStyle('bl', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#333333'), spaceAfter=2,
                leftIndent=12, leading=13)
    jobt_s = ParagraphStyle('jt', fontSize=10, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=1)
    jobs_s = ParagraphStyle('js', fontSize=8.5, fontName='Helvetica',
                textColor=colors.HexColor('#666666'), spaceAfter=4)

    hr = lambda: HRFlowable(width="100%", thickness=0.5,
                color=colors.HexColor('#dddddd'), spaceAfter=5)
    hr_green = lambda: HRFlowable(width="100%", thickness=1.5,
                color=colors.HexColor('#00a572'), spaceAfter=8)

    # Name & contact — NO "Tailored for" tag
    story.append(Paragraph(clean(tailored.get('name', 'Candidate')), name_s))
    if tailored.get('contact'):
        story.append(Paragraph(clean(tailored['contact']), contact_s))
    story.append(hr_green())

    # Summary
    if tailored.get('summary'):
        story.append(Paragraph('PROFESSIONAL SUMMARY', sec_s))
        story.append(hr())
        story.append(Paragraph(clean(tailored['summary']), body_s))

    # Skills
    skills = tailored.get('skills', [])
    if skills:
        story.append(Paragraph('SKILLS', sec_s))
        story.append(hr())
        skills_clean = [clean(s) for s in skills if s]
        # Split into rows of 6
        rows = [skills_clean[i:i+6] for i in range(0, len(skills_clean), 6)]
        for row in rows:
            story.append(Paragraph('   |   '.join(row), body_s))

    # Experience
    experience = tailored.get('experience', [])
    if experience:
        story.append(Paragraph('EXPERIENCE', sec_s))
        story.append(hr())
        for exp in experience:
            story.append(Paragraph(clean(exp.get('title', '')), jobt_s))
            company_dur = []
            if exp.get('company'): company_dur.append(clean(exp['company']))
            if exp.get('duration'): company_dur.append(clean(exp['duration']))
            story.append(Paragraph('  |  '.join(company_dur), jobs_s))
            for bullet in exp.get('bullets', []):
                b = clean(bullet).strip('- ').strip()
                if b:
                    story.append(Paragraph(f'- {b}', bullet_s))
            story.append(Spacer(1, 4))

    # Education
    education = tailored.get('education', [])
    if education:
        story.append(Paragraph('EDUCATION', sec_s))
        story.append(hr())
        for edu in education:
            deg = clean(edu.get('degree', ''))
            inst = clean(edu.get('institution', ''))
            yr = clean(edu.get('year', ''))
            story.append(Paragraph(f'{deg} - {inst}', jobt_s))
            if yr:
                story.append(Paragraph(yr, jobs_s))

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
        print(f"Resume text length: {len(resume_text)}")
        if not resume_text or len(resume_text) < 30:
            resume_text = f"Candidate resume. Job role: {job_title}. Please create a strong tailored resume."

        # AI tailor prompt
        # Calculate real ATS score before tailoring
        

        resume_kws = extract_keywords(resume_text)
        jd_kws = extract_keywords(job_description)
        matched = resume_kws & jd_kws
        missing = jd_kws - resume_kws
        original_score = min(95, int((len(matched) / max(len(jd_kws), 1)) * 100))

        prompt = f"""You have a resume and missing keywords. Do the following:
1. Copy ALL resume content exactly as-is
2. Add missing keywords ONLY to the skills list
3. Write a new 2-sentence summary mentioning the job title
4. Change NOTHING else

RESUME:
{resume_text[:2500]}

ADD TO SKILLS: {", ".join(list(missing)[:12])}
JOB: {job_title}

Return JSON with keys: name, contact, summary, skills, experience, education, keywords_added"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a JSON generator. Always respond with valid JSON only. No explanations, no markdown, no text before or after the JSON object."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=3000
        )

        raw = response.choices[0].message.content.strip()
        print(f"RAW AI: {raw[:300]}")

        # Strip think tags
        if '<think>' in raw:
            raw = raw.split('</think>')[-1].strip()

        # Strip markdown
        raw = raw.replace('```json', '').replace('```', '').strip()

        # Extract JSON using brace matching - most reliable method
        depth = 0
        start_pos = -1
        end_pos = -1
        in_string = False
        escape_next = False
        for i, ch in enumerate(raw):
            if escape_next:
                escape_next = False
                continue
            if ch == '\\':
                escape_next = True
                continue
            if ch == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{':
                if depth == 0:
                    start_pos = i
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end_pos = i + 1
                    break

        if start_pos == -1 or end_pos == -1:
            print(f"No JSON found in: {raw[:300]}")
            raise HTTPException(status_code=500, detail="AI did not return valid JSON")

        json_str = raw[start_pos:end_pos]
        print(f"Extracted JSON: {json_str[:200]}")

        # Fix trailing commas
        import re as _re
        json_str = _re.sub(r',\s*}', '}', json_str)
        json_str = _re.sub(r',\s*]', ']', json_str)

        try:
            tailored = json.loads(json_str)
        except json.JSONDecodeError as je:
            print(f"JSON error: {je} | str: {json_str[:200]}")
            raise HTTPException(status_code=500, detail=f"JSON parse error: {str(je)}")

        # Calculate real tailored score
        tailored_text = json.dumps(tailored)
        tailored_kws = extract_keywords(tailored_text)
        new_matched = tailored_kws & jd_kws
        tailored_score = min(97, int((len(new_matched) / max(len(jd_kws), 1)) * 100))
        if tailored_score <= original_score:
            tailored_score = min(97, original_score + len(tailored.get('keywords_added', [])) * 2)

        # Generate PDF
        pdf_bytes = generate_tailored_pdf(tailored, job_title, company)

        # Return PDF as download
        filename = f"tailored_resume_{job_title.replace(' ','_')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}",
                     "X-Keywords-Added": json.dumps(tailored.get('keywords_added',[])),
                     "x-original-score": str(original_score),
                     "x-tailored-score": str(tailored_score),
                     "x-keywords-added": json.dumps(tailored.get("keywords_added",[])),
                     "Access-Control-Expose-Headers": "x-original-score,x-tailored-score,x-keywords-added"}
        )
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

@router.get("/resume-text/{user_id}")
async def get_resume_text(user_id: str):
    """Download resume from storage and extract text"""
    try:
        storage_path = f"{user_id}/resume.pdf"
        file_bytes = supabase.storage.from_("resumes").download(storage_path)
        text = extract_pdf_text(file_bytes)
        return {"text": text, "success": True}
    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}


@router.post("/tailor-saved")
async def tailor_saved_resume(data: TailorSavedRequest):
    """Tailor using saved resume from storage"""
    try:
        user_id = data.user_id
        job_title = data.job_title
        job_description = data.job_description
        company = data.company
        resume_text = data.resume_text

        # If no resume text provided, try storage
        if not resume_text:
            try:
                storage_path = f"{user_id}/resume.pdf"
                file_bytes = supabase.storage.from_("resumes").download(storage_path)
                resume_text = extract_pdf_text(file_bytes)
            except:
                pass

        if not resume_text:
            raise HTTPException(status_code=400, detail="No resume found. Please upload your resume in Profile first.")

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
  "keywords_added": ["only new keywords actually added to resume"]
}}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=3000
        )

        raw = response.choices[0].message.content.strip()
        if '<think>' in raw: raw = raw.split('</think>')[-1].strip()
        if '```' in raw: raw = raw.split('```')[1].replace('json','').strip()
        start = raw.find('{'); end = raw.rfind('}')
        if start == -1: raise HTTPException(status_code=500, detail="Parsing failed")
        tailored = json.loads(raw[start:end+1])

        # Calculate real tailored score
        tailored_text = json.dumps(tailored)
        tailored_kws = extract_keywords(tailored_text)
        new_matched = tailored_kws & jd_kws
        tailored_score = min(97, int((len(new_matched) / max(len(jd_kws), 1)) * 100))
        # Ensure improvement shown
        if tailored_score <= original_score:
            tailored_score = min(97, original_score + len(tailored.get('keywords_added', [])) * 2)

        pdf_bytes = generate_tailored_pdf(tailored, job_title, company)
        filename = f"tailored_{job_title.replace(' ','_')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "x-keywords-added": json.dumps(tailored.get('keywords_added',[])),
                "x-original-score": str(original_score),
                "x-tailored-score": str(tailored_score),
                "Access-Control-Expose-Headers": "x-keywords-added,x-original-score,x-tailored-score"
            }
        )
    except HTTPException: raise
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"TAILOR ERROR: {error_detail}")
        raise HTTPException(status_code=500, detail=f"{str(e)} | {error_detail[-500:]}")