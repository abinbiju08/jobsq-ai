from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from groq import Groq
from supabase import create_client
from pydantic import BaseModel
import os, json, io, re
from dotenv import load_dotenv
import PyPDF2
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER

load_dotenv()
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class TailorSavedRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str
    company: str = "Company"
    resume_text: str = ""

def extract_keywords(text):
    words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.]*\b', text.lower())
    stopwords = {'the','a','an','and','or','but','in','on','at','to','for','of','with',
                'by','is','are','was','be','this','that','we','you','have','has','will',
                'can','our','your','they','from','as','it','its','not','all','been'}
    return {w for w in words if len(w) > 2 and w not in stopwords}

def extract_pdf_text(file_bytes: bytes) -> str:
    text = ""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
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

def clean(text):
    if not text:
        return ""
    result = ""
    for ch in str(text):
        if ord(ch) < 128:
            result += ch
        elif ch in ('\u2013', '\u2014'):
            result += '-'
        elif ch in ('\u2018', '\u2019'):
            result += "'"
        elif ch in ('\u201c', '\u201d'):
            result += '"'
        elif ch in ('\u2022', '\u00b7'):
            result += '-'
        else:
            result += ' '
    return ' '.join(result.split())

def parse_ai_response(raw: str) -> dict:
    if '<think>' in raw:
        raw = raw.split('</think>')[-1].strip()
    raw = raw.replace('```json', '').replace('```', '').strip()
    depth = 0
    start_pos = -1
    end_pos = -1
    in_string = False
    i = 0
    while i < len(raw):
        ch = raw[i]
        if ch == '\\' and in_string:
            i += 2
            continue
        if ch == '"':
            in_string = not in_string
        elif not in_string:
            if ch == '{':
                if depth == 0:
                    start_pos = i
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end_pos = i + 1
                    break
        i += 1
    if start_pos == -1 or end_pos == -1:
        raise ValueError(f"No JSON in response: {raw[:200]}")
    json_str = raw[start_pos:end_pos]
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    return json.loads(json_str)

def generate_tailored_pdf(tailored: dict, job_title: str, company: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=18*mm, leftMargin=18*mm,
        topMargin=14*mm, bottomMargin=14*mm)
    story = []

    name_s = ParagraphStyle('n', fontSize=20, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=4,
                alignment=TA_CENTER, leading=24)
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

    story.append(Paragraph(clean(tailored.get('name', 'Candidate')), name_s))
    if tailored.get('contact'):
        story.append(Paragraph(clean(tailored['contact']), contact_s))
    story.append(hr_green())

    if tailored.get('summary'):
        story.append(Paragraph('PROFESSIONAL SUMMARY', sec_s))
        story.append(hr())
        story.append(Paragraph(clean(tailored['summary']), body_s))

    skills = tailored.get('skills', [])
    if skills:
        story.append(Paragraph('SKILLS', sec_s))
        story.append(hr())
        rows = [skills[i:i+6] for i in range(0, len(skills), 6)]
        for row in rows:
            story.append(Paragraph('   |   '.join([clean(s) for s in row if s]), body_s))

    experience = tailored.get('experience', [])
    if experience:
        story.append(Paragraph('EXPERIENCE', sec_s))
        story.append(hr())
        for exp in experience:
            story.append(Paragraph(clean(exp.get('title', '')), jobt_s))
            parts = []
            if exp.get('company'): parts.append(clean(exp['company']))
            if exp.get('duration'): parts.append(clean(exp['duration']))
            story.append(Paragraph('  |  '.join(parts), jobs_s))
            for bullet in exp.get('bullets', []):
                b = clean(bullet).strip('- ').strip()
                if b:
                    story.append(Paragraph(f'- {b}', bullet_s))
            story.append(Spacer(1, 4))

    education = tailored.get('education', [])
    if education:
        story.append(Paragraph('EDUCATION', sec_s))
        story.append(hr())
        for edu in education:
            story.append(Paragraph(
                f"{clean(edu.get('degree',''))} - {clean(edu.get('institution',''))}", jobt_s))
            if edu.get('year'):
                story.append(Paragraph(clean(edu['year']), jobs_s))

    # Projects
    projects = tailored.get('projects', [])
    if projects:
        story.append(Paragraph('PROJECTS', sec_s))
        story.append(hr())
        for proj in projects:
            if proj.get('name'):
                story.append(Paragraph(clean(proj.get('name', '')), jobt_s))
            if proj.get('description'):
                story.append(Paragraph(f"- {clean(proj.get('description',''))}", bullet_s))
            story.append(Spacer(1, 3))

    # Certifications
    certs = tailored.get('certifications', [])
    if certs:
        story.append(Paragraph('CERTIFICATIONS', sec_s))
        story.append(hr())
        for cert in certs:
            story.append(Paragraph(f"- {clean(str(cert))}", bullet_s))

    doc.build(story)
    return buffer.getvalue()

def generate_tailored_docx(tailored: dict, job_title: str, company: str) -> bytes:
    from docx import Document
    from docx.shared import Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()

    # Remove default margins
    for section in doc.sections:
        section.top_margin = section.bottom_margin = Pt(36)
        section.left_margin = section.right_margin = Pt(50)

    def add_heading(text, color='00a572'):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text.upper())
        run.bold = True
        run.font.size = Pt(10.5)
        r, g, b = int(color[:2],16), int(color[2:4],16), int(color[4:],16)
        run.font.color.rgb = RGBColor(r, g, b)
        # Add border below
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '4')
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), color)
        pBdr.append(bottom)
        pPr.append(pBdr)

    def clean_text(text):
        if not text: return ""
        return str(text).encode('ascii', 'ignore').decode().strip()

    # Name
    name_para = doc.add_paragraph()
    name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_run = name_para.add_run(clean_text(tailored.get('name', '')))
    name_run.bold = True
    name_run.font.size = Pt(20)

    # Contact
    if tailored.get('contact'):
        contact_para = doc.add_paragraph()
        contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_run = contact_para.add_run(clean_text(tailored['contact']))
        contact_run.font.size = Pt(9)
        contact_run.font.color.rgb = RGBColor(85, 85, 85)

    # Summary
    if tailored.get('summary'):
        add_heading('Professional Summary')
        p = doc.add_paragraph(clean_text(tailored['summary']))
        p.paragraph_format.space_after = Pt(4)

    # Skills
    skills = tailored.get('skills', [])
    if skills:
        add_heading('Skills')
        rows = [skills[i:i+6] for i in range(0, len(skills), 6)]
        for row in rows:
            p = doc.add_paragraph('   |   '.join([clean_text(s) for s in row if s]))
            p.paragraph_format.space_after = Pt(2)

    # Experience
    experience = tailored.get('experience', [])
    if experience:
        add_heading('Experience')
        for exp in experience:
            p = doc.add_paragraph()
            r = p.add_run(clean_text(exp.get('title', '')))
            r.bold = True
            r.font.size = Pt(10)
            sub = doc.add_paragraph()
            sub.paragraph_format.space_after = Pt(2)
            sr = sub.add_run(f"{clean_text(exp.get('company',''))}  |  {clean_text(exp.get('duration',''))}")
            sr.font.size = Pt(8.5)
            sr.font.color.rgb = RGBColor(100, 100, 100)
            for bullet in exp.get('bullets', []):
                b = clean_text(bullet).strip('- ').strip()
                if b:
                    bp = doc.add_paragraph(style='List Bullet')
                    bp.paragraph_format.space_after = Pt(1)
                    br = bp.add_run(b)
                    br.font.size = Pt(9)

    # Projects
    projects = tailored.get('projects', [])
    if projects:
        add_heading('Projects')
        for proj in projects:
            if proj.get('name'):
                p = doc.add_paragraph()
                r = p.add_run(clean_text(proj.get('name', '')))
                r.bold = True
                r.font.size = Pt(10)
            if proj.get('description'):
                dp = doc.add_paragraph(style='List Bullet')
                dr = dp.add_run(clean_text(proj.get('description', '')))
                dr.font.size = Pt(9)

    # Education
    education = tailored.get('education', [])
    if education:
        add_heading('Education')
        for edu in education:
            p = doc.add_paragraph()
            r = p.add_run(f"{clean_text(edu.get('degree',''))} - {clean_text(edu.get('institution',''))}")
            r.bold = True
            r.font.size = Pt(10)
            if edu.get('year'):
                yp = doc.add_paragraph(clean_text(edu['year']))
                yp.paragraph_format.space_after = Pt(2)
                yp.runs[0].font.size = Pt(8.5)
                yp.runs[0].font.color.rgb = RGBColor(100, 100, 100)

    # Certifications
    certs = tailored.get('certifications', [])
    if certs:
        add_heading('Certifications')
        for cert in certs:
            cp = doc.add_paragraph(style='List Bullet')
            cr = cp.add_run(clean_text(str(cert)))
            cr.font.size = Pt(9)

    buffer = io.BytesIO()
    doc.save(buffer)
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
        resume_bytes = await resume_file.read()
        resume_text = extract_pdf_text(resume_bytes)
        print(f"Resume text length: {len(resume_text)}")
        if not resume_text or len(resume_text) < 30:
            resume_text = f"Candidate applying for {job_title} role."

        resume_kws = extract_keywords(resume_text)
        jd_kws = extract_keywords(job_description + " " + job_title)
        matched = resume_kws & jd_kws
        missing = jd_kws - resume_kws
        original_score = min(95, int((len(matched) / max(len(jd_kws), 1)) * 100))

        prompt = f"""Extract ALL content from this resume and return as JSON. Include every single section.

RESUME (extract everything from this):
{resume_text[:3000]}

JOB: {job_title} at {company}
KEYWORDS TO ADD TO SKILLS: {', '.join(list(missing)[:12])}

STRICT RULES:
- Copy EVERY bullet point exactly as written
- Copy ALL projects, certifications, achievements
- Copy ALL experience entries with ALL their bullets
- Copy ALL education entries
- Only ADD missing keywords to skills list
- Only CHANGE the summary section
- Do NOT remove anything from the original resume

Return complete JSON:
{{
  "name": "full name from resume",
  "contact": "email | phone | location | linkedin from resume",
  "summary": "2 sentences targeting {job_title}",
  "skills": ["ALL existing skills from resume", "plus {', '.join(list(missing)[:8])}"],
  "experience": [
    {{
      "title": "exact job title",
      "company": "exact company name",
      "duration": "exact date range",
      "bullets": ["every bullet point exactly as written", "include all of them"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "project description exactly as written"
    }}
  ],
  "education": [
    {{
      "degree": "exact degree",
      "institution": "exact institution",
      "year": "exact year"
    }}
  ],
  "certifications": ["cert 1", "cert 2"],
  "keywords_added": ["new keywords added"]
}}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a JSON API. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=3000
        )

        raw = response.choices[0].message.content.strip()
        print(f"RAW AI: {raw[:200]}")
        tailored = parse_ai_response(raw)

        tailored_kws = extract_keywords(json.dumps(tailored))
        new_matched = tailored_kws & jd_kws
        tailored_score = min(97, int((len(new_matched) / max(len(jd_kws), 1)) * 100))
        if tailored_score <= original_score:
            tailored_score = min(97, original_score + len(tailored.get('keywords_added', [])) * 2)

        pdf_bytes = generate_tailored_pdf(tailored, job_title, company)
        filename = f"tailored_{job_title.replace(' ', '_')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "x-keywords-added": json.dumps(tailored.get('keywords_added', [])),
                "x-original-score": str(original_score),
                "x-tailored-score": str(tailored_score),
                "Access-Control-Expose-Headers": "x-keywords-added,x-original-score,x-tailored-score"
            }
        )

    except Exception as e:
        import traceback
        print(f"TAILOR ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tailor-docx")
async def tailor_resume_docx(
    resume_file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    company: str = Form(default="Company"),
    user_id: str = Form(...)
):
    """Same as /tailor but returns DOCX instead of PDF"""
    try:
        resume_bytes = await resume_file.read()
        resume_text = extract_pdf_text(resume_bytes)
        if not resume_text or len(resume_text) < 30:
            resume_text = f"Candidate applying for {job_title} role."

        resume_kws = extract_keywords(resume_text)
        jd_kws = extract_keywords(job_description + " " + job_title)
        missing = jd_kws - resume_kws

        prompt = f"""Extract ALL content from this resume and return as JSON. Include every section.

RESUME:
{resume_text[:3000]}

JOB: {job_title} at {company}
KEYWORDS TO ADD TO SKILLS: {', '.join(list(missing)[:12])}

Return complete JSON with all resume data, adding keywords to skills only.
Keys: name, contact, summary (2 sentences for {job_title}), skills, experience (with all bullets), projects, education, certifications, keywords_added"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {{"role": "system", "content": "Return only valid JSON."}},
                {{"role": "user", "content": prompt}}
            ],
            temperature=0.1,
            max_tokens=3000
        )

        tailored = parse_ai_response(response.choices[0].message.content.strip())
        docx_bytes = generate_tailored_docx(tailored, job_title, company)
        filename = f"tailored_{job_title.replace(' ','_')}.docx"

        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        import traceback
        print(f"DOCX ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-resume")
async def save_resume(
    resume_file: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        file_bytes = await resume_file.read()
        storage_path = f"{user_id}/resume.pdf"
        supabase.storage.from_("resumes").upload(
            storage_path, file_bytes,
            {"content-type": "application/pdf", "upsert": "true"}
        )
        supabase.table("user_resumes").upsert({
            "user_id": user_id,
            "file_name": resume_file.filename,
            "file_size": len(file_bytes),
            "storage_path": storage_path,
        }, on_conflict="user_id").execute()
        return {"success": True, "file_name": resume_file.filename, "file_size": len(file_bytes)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/resume-info/{user_id}")
async def get_resume_info(user_id: str):
    try:
        result = supabase.table("user_resumes").select("*").eq("user_id", user_id).execute()
        return result.data[0] if result.data else None
    except:
        return None


@router.get("/resume-text/{user_id}")
async def get_resume_text(user_id: str):
    try:
        storage_path = f"{user_id}/resume.pdf"
        file_bytes = supabase.storage.from_("resumes").download(storage_path)
        text = extract_pdf_text(file_bytes)
        return {"text": text, "success": True}
    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}


@router.post("/tailor-saved")
async def tailor_saved_resume(data: TailorSavedRequest):
    try:
        resume_text = data.resume_text
        if not resume_text:
            try:
                file_bytes = supabase.storage.from_("resumes").download(f"{data.user_id}/resume.pdf")
                resume_text = extract_pdf_text(file_bytes)
            except:
                pass
        if not resume_text:
            raise HTTPException(status_code=400, detail="No resume found.")

        resume_kws = extract_keywords(resume_text)
        jd_kws = extract_keywords(data.job_description + " " + data.job_title)
        missing = jd_kws - resume_kws
        original_score = min(95, int((len(resume_kws & jd_kws) / max(len(jd_kws), 1)) * 100))

        prompt = f"""Resume optimizer. Return JSON only.
Resume: {resume_text[:2000]}
Job: {data.job_title}
Add to skills: {', '.join(list(missing)[:12])}
Return: {{"name":"","contact":"","summary":"2 sentences for {data.job_title}","skills":[],"experience":[],"education":[],"keywords_added":[]}}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=3000
        )

        tailored = parse_ai_response(response.choices[0].message.content.strip())
        tailored_kws = extract_keywords(json.dumps(tailored))
        new_matched = tailored_kws & jd_kws
        tailored_score = min(97, int((len(new_matched) / max(len(jd_kws), 1)) * 100))
        if tailored_score <= original_score:
            tailored_score = min(97, original_score + len(tailored.get('keywords_added', [])) * 2)

        pdf_bytes = generate_tailored_pdf(tailored, data.job_title, data.company)
        filename = f"tailored_{data.job_title.replace(' ', '_')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "x-keywords-added": json.dumps(tailored.get('keywords_added', [])),
                "x-original-score": str(original_score),
                "x-tailored-score": str(tailored_score),
                "Access-Control-Expose-Headers": "x-keywords-added,x-original-score,x-tailored-score"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))