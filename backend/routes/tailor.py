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
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

load_dotenv()

try:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class TailorSavedRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str
    company: str = "Company"
    resume_text: str = ""

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
        elif ch in ('\u2013', '\u2014'): result += '-'
        elif ch in ('\u2018', '\u2019'): result += "'"
        elif ch in ('\u201c', '\u201d'): result += '"'
        elif ch in ('\u2022', '\u00b7'): result += '-'
        else: result += ' '
    return ' '.join(result.split())

def clean_contact(contact):
    if not contact:
        return ""
    if isinstance(contact, dict):
        parts = []
        if contact.get('email'): parts.append(contact['email'])
        if contact.get('phone'): parts.append(contact['phone'])
        if contact.get('location'): parts.append(contact['location'])
        if contact.get('linkedin'): parts.append(contact['linkedin'])
        if contact.get('github'): parts.append(contact['github'])
        return '  |  '.join(parts)
    return clean(str(contact))

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

def filter_skills(skills: list) -> list:
    """Remove non-technical words from skills list"""
    if not skills:
        return []
    
    # Definite blacklist - never allow these
    blacklist = {
        'developers','developer','f2f','face','period','senior','lead','mandatory',
        'expertise','overview','preferred','preffered','bengaluru','bangalore','mumbai',
        'delhi','hyderabad','chennai','pune','kolkata','india','remote','hybrid','onsite',
        'immediate','joiners','joining','experience','years','year','month','months',
        'interview','hiring','actively','looking','required','must','good','strong',
        'knowledge','ability','team','work','role','position','job','apply','mode',
        'location','office','wfh','wfo','notice','important','urgent','opportunity',
        'opening','vacancy','profile','candidate','candidates','requirement','requirements',
        'epertise','overview','f2f','face to face','indore','goinstacare','care','united',
        'states','families','providers','specifically','industry','wil','non','focuses',
        'growing','mode','required','oppor','before','interview','joiners','interview',
        'actively','period','senior','lead','mandatory','overview','preferred','face',
        'developers','f2f','bengaluru','languages','english','hindi','kannada','tamil',
        'malayalam','telugu','marathi','punjabi','gujarati','bengali','odia','assamese',
        'declaration','i','hereby','certify','true','best'
    }
    
    # Real tech skills - if ANY of these appear in the skill string, it passes
    tech_whitelist = [
        'python','java','javascript','typescript','kotlin','swift','dart','rust','go',
        'php','ruby','scala','c++','c#','react','angular','vue','next','nuxt','html',
        'css','sass','scss','tailwind','bootstrap','redux','webpack','vite','jquery',
        'node','django','flask','fastapi','spring','express','laravel','rails','fiber',
        'graphql','rest','grpc','websocket','oauth','jwt','api','sdk',
        'mysql','postgresql','mongodb','redis','sqlite','oracle','sql','nosql',
        'elasticsearch','cassandra','dynamodb','firebase','supabase','prisma',
        'aws','azure','gcp','docker','kubernetes','jenkins','terraform','ansible',
        'git','github','gitlab','bitbucket','linux','nginx','apache','ci/cd',
        'tensorflow','pytorch','pandas','numpy','opencv','nlp','machine learning',
        'deep learning','langchain','openai','scikit','keras',
        'flutter','android','ios','xcode','expo','react native',
        'microservices','devops','agile','scrum','figma','photoshop','jira',
        'selenium','jest','pytest','junit','postman','cypress','playwright',
        '.net','golang','kafka','rabbitmq','celery','nginx','redis','graphql',
        'wordpress','shopify','woocommerce','magento','drupal','strapi',
        'solidity','blockchain','web3','smart contract',
        'power bi','tableau','excel','pandas','matplotlib','seaborn',
        'full stack','fullstack','frontend','backend','mobile','web development',
        'object oriented','oop','mvc','mvvm','microservice','restful',
        'data structures','algorithms','design patterns','system design',
        'testing','automation','debugging','deployment','cloud','serverless'
    ]
    
    result = []
    seen = set()
    
    for skill in skills:
        if not skill:
            continue
        s = str(skill).strip()
        sl = s.lower().strip()
        
        # Skip empty or too short
        if len(s) < 2:
            continue
        
        # Skip if in blacklist
        if sl in blacklist:
            continue
        
        # Skip if already added
        if sl in seen:
            continue
        
        # Check if it contains a known tech term
        is_tech = any(tech in sl for tech in tech_whitelist)
        
        # Allow special char skills (C++, C#, .NET, Node.js)
        has_special = any(c in s for c in ['+', '#', '.', '/'])
        
        # Allow short uppercase acronyms (AWS, GCP, SQL, API)
        is_acronym = len(s) <= 5 and s.replace('.','').replace('#','').replace('+','').isupper()
        
        if is_tech or has_special or is_acronym:
            result.append(s)
            seen.add(sl)
    
    return result if result else []

def generate_tailored_pdf(tailored: dict, job_title: str, company: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
        rightMargin=15*mm, leftMargin=15*mm,
        topMargin=12*mm, bottomMargin=12*mm)
    story = []

    # Styles
    name_s = ParagraphStyle('n', fontSize=20, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=3,
                alignment=TA_CENTER, leading=24)
    contact_s = ParagraphStyle('c', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#444444'), spaceAfter=2, alignment=TA_CENTER)
    sec_s = ParagraphStyle('s', fontSize=10.5, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceBefore=8, spaceAfter=3)
    body_s = ParagraphStyle('b', fontSize=9.5, fontName='Helvetica',
                textColor=colors.HexColor('#222222'), spaceAfter=3, leading=14)
    bullet_s = ParagraphStyle('bl', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#333333'), spaceAfter=2,
                leftIndent=10, leading=13)
    jobt_s = ParagraphStyle('jt', fontSize=10, fontName='Helvetica-Bold',
                textColor=colors.HexColor('#1a1a2e'), spaceAfter=0)
    jobs_s = ParagraphStyle('js', fontSize=8.5, fontName='Helvetica',
                textColor=colors.HexColor('#555555'), spaceAfter=3)
    kw_s = ParagraphStyle('kw', fontSize=9, fontName='Helvetica',
                textColor=colors.HexColor('#2c3e50'), spaceAfter=2, leading=13)

    def hr():
        return HRFlowable(width="100%", thickness=1,
                    color=colors.HexColor('#1a1a2e'), spaceAfter=4)

    def section(title):
        story.append(Paragraph(title, sec_s))
        story.append(hr())

    # ── NAME & CONTACT ──
    story.append(Paragraph(clean(tailored.get('name', 'Candidate Name')), name_s))
    
    contact_line = clean_contact(tailored.get('contact', ''))
    if contact_line:
        story.append(Paragraph(contact_line, contact_s))
    
    linkedin = clean(tailored.get('linkedin', ''))
    github = clean(tailored.get('github', ''))
    links = []
    if linkedin: links.append(f"LinkedIn: {linkedin}")
    if github: links.append(f"GitHub: {github}")
    if links:
        story.append(Paragraph('  |  '.join(links), contact_s))
    
    story.append(Spacer(1, 4))

    # ── PROFESSIONAL SUMMARY ──
    if tailored.get('summary'):
        section('PROFESSIONAL SUMMARY')
        story.append(Paragraph(clean(tailored['summary']), body_s))

    # ── TECHNICAL SKILLS ──
    skills = filter_skills(tailored.get('skills', []))
    if skills:
        section('TECHNICAL SKILLS')
        rows = [skills[i:i+5] for i in range(0, len(skills), 5)]
        for row in rows:
            story.append(Paragraph('   |   '.join([clean(s) for s in row if s]), kw_s))

    # ── WORK EXPERIENCE ──
    experience = tailored.get('experience', [])
    if experience:
        section('WORK EXPERIENCE')
        for exp in experience:
            # Title and duration on same line
            title = clean(exp.get('title', ''))
            duration = clean(exp.get('duration', ''))
            company_name = clean(exp.get('company', ''))
            
            story.append(Paragraph(f"<b>{title}</b>", jobt_s))
            story.append(Paragraph(f"{company_name}  |  {duration}", jobs_s))
            
            for bullet in exp.get('bullets', []):
                b = clean(bullet).strip('- ').strip()
                if b:
                    story.append(Paragraph(f"\u2022  {b}", bullet_s))
            story.append(Spacer(1, 4))

    # ── PROJECTS ──
    projects = tailored.get('projects', [])
    if projects:
        section('PROJECTS')
        for proj in projects:
            name = clean(proj.get('name', ''))
            desc = clean(proj.get('description', ''))
            tech = clean(proj.get('tech', ''))
            if name:
                story.append(Paragraph(f"<b>{name}</b>", jobt_s))
            if tech:
                story.append(Paragraph(f"Tech: {tech}", jobs_s))
            if desc:
                story.append(Paragraph(f"\u2022  {desc}", bullet_s))
            story.append(Spacer(1, 3))

    # ── EDUCATION ──
    education = tailored.get('education', [])
    if education:
        section('EDUCATION')
        for edu in education:
            degree = clean(edu.get('degree', ''))
            institution = clean(edu.get('institution', ''))
            year = clean(edu.get('year', ''))
            story.append(Paragraph(f"<b>{degree}</b>", jobt_s))
            story.append(Paragraph(f"{institution}  |  {year}", jobs_s))

    # ── CERTIFICATIONS ──
    certs = tailored.get('certifications', [])
    if certs:
        section('CERTIFICATIONS')
        for cert in certs:
            story.append(Paragraph(f"\u2022  {clean(str(cert))}", bullet_s))

    # ── LANGUAGES ──
    languages = tailored.get('languages', [])
    if languages:
        section('LANGUAGES')
        story.append(Paragraph('  |  '.join([clean(l) for l in languages if l]), kw_s))

    # ── DECLARATION ──
    declaration = clean(tailored.get('declaration', ''))
    if declaration:
        section('DECLARATION')
        story.append(Paragraph(declaration, body_s))

    doc.build(story)
    return buffer.getvalue()


def generate_tailored_docx(tailored: dict, job_title: str, company: str) -> bytes:
    if not DOCX_AVAILABLE:
        raise ImportError('python-docx not installed')

    doc = Document()
    for section in doc.sections:
        section.top_margin = section.bottom_margin = Pt(30)
        section.left_margin = section.right_margin = Pt(45)

    def clean_text(text):
        if not text: return ""
        return str(text).encode('ascii', 'ignore').decode().strip()

    def add_section_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(title)
        run.bold = True
        run.font.size = Pt(10.5)
        run.font.color.rgb = RGBColor(26, 26, 46)
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '6')
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), '1a1a2e')
        pBdr.append(bottom)
        pPr.append(pBdr)

    # Name
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(clean_text(tailored.get('name', '')))
    r.bold = True
    r.font.size = Pt(20)

    # Contact
    contact_val = clean_contact(tailored.get('contact', ''))
    if contact_val:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(clean_text(contact_val))
        r.font.size = Pt(9)

    linkedin = clean_text(tailored.get('linkedin', ''))
    github = clean_text(tailored.get('github', ''))
    links = []
    if linkedin: links.append(f"LinkedIn: {linkedin}")
    if github: links.append(f"GitHub: {github}")
    if links:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run('  |  '.join(links))
        r.font.size = Pt(9)

    # Summary
    if tailored.get('summary'):
        add_section_heading('PROFESSIONAL SUMMARY')
        p = doc.add_paragraph(clean_text(tailored['summary']))
        p.runs[0].font.size = Pt(9.5)

    # Skills
    skills = filter_skills(tailored.get('skills', []))
    if skills:
        add_section_heading('TECHNICAL SKILLS')
        rows = [skills[i:i+5] for i in range(0, len(skills), 5)]
        for row in rows:
            p = doc.add_paragraph('   |   '.join([clean_text(s) for s in row if s]))
            p.runs[0].font.size = Pt(9)

    # Experience
    experience = tailored.get('experience', [])
    if experience:
        add_section_heading('WORK EXPERIENCE')
        for exp in experience:
            p = doc.add_paragraph()
            r = p.add_run(clean_text(exp.get('title', '')))
            r.bold = True
            r.font.size = Pt(10)
            p2 = doc.add_paragraph()
            r2 = p2.add_run(f"{clean_text(exp.get('company',''))}  |  {clean_text(exp.get('duration',''))}")
            r2.font.size = Pt(8.5)
            r2.font.color.rgb = RGBColor(85, 85, 85)
            for bullet in exp.get('bullets', []):
                b = clean_text(bullet).strip('- ').strip()
                if b:
                    bp = doc.add_paragraph(style='List Bullet')
                    br = bp.add_run(b)
                    br.font.size = Pt(9)

    # Projects
    projects = tailored.get('projects', [])
    if projects:
        add_section_heading('PROJECTS')
        for proj in projects:
            if proj.get('name'):
                p = doc.add_paragraph()
                r = p.add_run(clean_text(proj.get('name', '')))
                r.bold = True
                r.font.size = Pt(10)
            if proj.get('tech'):
                p = doc.add_paragraph(f"Tech: {clean_text(proj.get('tech',''))}")
                p.runs[0].font.size = Pt(8.5)
            if proj.get('description'):
                bp = doc.add_paragraph(style='List Bullet')
                br = bp.add_run(clean_text(proj.get('description', '')))
                br.font.size = Pt(9)

    # Education
    education = tailored.get('education', [])
    if education:
        add_section_heading('EDUCATION')
        for edu in education:
            p = doc.add_paragraph()
            r = p.add_run(clean_text(edu.get('degree', '')))
            r.bold = True
            r.font.size = Pt(10)
            p2 = doc.add_paragraph(f"{clean_text(edu.get('institution',''))}  |  {clean_text(edu.get('year',''))}")
            p2.runs[0].font.size = Pt(8.5)

    # Certifications
    certs = tailored.get('certifications', [])
    if certs:
        add_section_heading('CERTIFICATIONS')
        for cert in certs:
            bp = doc.add_paragraph(style='List Bullet')
            br = bp.add_run(clean_text(str(cert)))
            br.font.size = Pt(9)

    # Languages
    languages = tailored.get('languages', [])
    if languages:
        add_section_heading('LANGUAGES')
        p = doc.add_paragraph('  |  '.join([clean_text(l) for l in languages if l]))
        p.runs[0].font.size = Pt(9)

    # Declaration
    declaration = tailored.get('declaration', '')
    if declaration:
        add_section_heading('DECLARATION')
        p = doc.add_paragraph(clean_text(declaration))
        p.runs[0].font.size = Pt(9)

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
        print(f"Resume text preview: {resume_text[:500]}")
        if not resume_text or len(resume_text) < 30:
            resume_text = f"Candidate applying for {job_title}."

        # Basic score
        resume_words = set(re.findall(r'\b\w+\b', resume_text.lower()))
        jd_words = set(re.findall(r'\b\w+\b', job_description.lower()))
        common = resume_words & jd_words
        original_score = min(80, max(20, int(len(common) / max(len(jd_words), 1) * 200)))

        prompt = f"""You are an expert ATS resume writer. Extract the complete resume and tailor it for the job.

RESUME TEXT (extract EVERYTHING exactly):
{resume_text[:3000]}

JOB TITLE: {job_title}
JOB DESCRIPTION:
{job_description[:1200]}

TASK:
1. Extract name, phone, email, city, LinkedIn URL, GitHub URL exactly from resume
2. Extract ALL work experience - every job, every bullet point word for word
3. Extract ALL projects with name, tech stack, description
4. Extract ALL education details
5. Extract ALL certifications
6. Extract languages spoken (like English, Hindi etc)
7. Extract declaration if present
8. Take existing skills from resume, add ONLY real missing technical skills from JD (programming languages, frameworks, tools like Docker, AWS, etc - NOT words like 'remote', 'senior', 'immediate', 'f2f', 'bengaluru')
9. Write a powerful 3-sentence professional summary targeting {job_title}

Return complete JSON:
{{
  "name": "full name",
  "contact": "email | phone | city",
  "linkedin": "linkedin url or empty string",
  "github": "github url or empty string",
  "summary": "3 sentence professional summary for {job_title}",
  "skills": ["ALL technical skills from resume", "ONLY real tech skills missing from JD"],
  "experience": [
    {{
      "title": "exact job title",
      "company": "exact company",
      "duration": "exact dates",
      "bullets": ["exact bullet 1", "exact bullet 2", "every single bullet"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "tech": "tech stack used",
      "description": "exact description"
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
  "languages": ["English", "Hindi"],
  "declaration": "I hereby declare that the above information is true to the best of my knowledge.",
  "keywords_added": ["only real tech skills added"]
}}"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a JSON API. Return only valid JSON. Never add non-technical words to skills array."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )

        raw = response.choices[0].message.content.strip()
        print(f"RAW AI: {raw[:200]}")
        tailored = parse_ai_response(raw)

        # Filter skills
        tailored['skills'] = filter_skills(tailored.get('skills', []))
        keywords_added = tailored.get('keywords_added', [])
        tailored_score = min(97, original_score + len(filter_skills(keywords_added)) * 3)

        pdf_bytes = generate_tailored_pdf(tailored, job_title, company)
        filename = f"tailored_{job_title.replace(' ', '_')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "x-keywords-added": json.dumps(filter_skills(keywords_added)),
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
    try:
        resume_bytes = await resume_file.read()
        resume_text = extract_pdf_text(resume_bytes)
        if not resume_text or len(resume_text) < 30:
            resume_text = f"Candidate applying for {job_title}."

        prompt = f"""Extract complete resume and tailor for job. Return JSON only.

RESUME: {resume_text[:3000]}
JOB: {job_title}
JD: {job_description[:800]}

Extract everything: name, contact, linkedin, github, summary (3 sentences for {job_title}), skills (existing + real technical skills from JD only), experience (all bullets), projects (name/tech/description), education, certifications, languages, declaration.

Skill rules: Only add real tech like Python/React/Docker/AWS. Never add words like remote/senior/f2f/bengaluru."""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )

        tailored = parse_ai_response(response.choices[0].message.content.strip())
        tailored['skills'] = filter_skills(tailored.get('skills', []))

        docx_bytes = generate_tailored_docx(tailored, job_title, company)
        filename = f"tailored_{job_title.replace(' ', '_')}.docx"

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

        prompt = f"""Extract complete resume and tailor for job. Return JSON only.
Resume: {resume_text[:2500]}
Job: {data.job_title}
Only add real technical skills from JD. Never add non-tech words."""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "Return only valid JSON with all resume sections."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )

        tailored = parse_ai_response(response.choices[0].message.content.strip())
        tailored['skills'] = filter_skills(tailored.get('skills', []))

        pdf_bytes = generate_tailored_pdf(tailored, data.job_title, data.company)
        filename = f"tailored_{data.job_title.replace(' ', '_')}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "x-keywords-added": json.dumps([]),
                "x-original-score": "50",
                "x-tailored-score": "75",
                "Access-Control-Expose-Headers": "x-keywords-added,x-original-score,x-tailored-score"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))