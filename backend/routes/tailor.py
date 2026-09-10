from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from supabase import create_client
from groq import Groq
from pydantic import BaseModel
import PyPDF2, io, os, json, re, unicodedata
from dotenv import load_dotenv
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle, KeepTogether

load_dotenv()
router = APIRouter()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ─────────────────────────────────────────────
# PDF TEXT + URL EXTRACTION
# ─────────────────────────────────────────────

def extract_pdf_text(file_bytes: bytes) -> str:
    text = ""
    urls_found = []

    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
            if "/Annots" in page:
                for annot in page["/Annots"]:
                    obj = annot.get_object()
                    if obj.get("/Subtype") == "/Link":
                        uri = obj.get("/A", {}).get("/URI", "")
                        if uri and uri not in urls_found:
                            urls_found.append(uri)
    except Exception as e:
        print(f"PyPDF2 error: {e}")

    try:
        import pymupdf
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            for link in page.get_links():
                uri = link.get("uri", "")
                if uri and uri not in urls_found:
                    urls_found.append(uri)
        doc.close()
    except Exception as e:
        print(f"pymupdf error: {e}")

    if urls_found:
        text += "\n\nEXTRACTED_LINKS:\n"
        for url in urls_found:
            if "linkedin" in url.lower():
                text += f"LinkedIn: {url}\n"
            elif "github" in url.lower():
                text += f"GitHub: {url}\n"
            else:
                text += f"{url}\n"

    url_pattern = r'(https?://(?:www\.)?(?:linkedin\.com/in/|github\.com/)[^\s\)\]>\"\']+)'
    for u in re.findall(url_pattern, text):
        if u not in urls_found:
            urls_found.append(u)
            if "linkedin" in u.lower():
                text += f"\nLinkedIn: {u}"
            elif "github" in u.lower():
                text += f"\nGitHub: {u}"

    print(f"Resume text length: {len(text)}")
    print(f"Resume text preview:\n{text[:800]}")
    print(f"URLs found: {urls_found}")
    return text.strip()


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def clean(text) -> str:
    if not text:
        return ""
    replacements = {
        '\u2022': '-', '\u2023': '-', '\u25cf': '-', '\u2013': '-',
        '\u2014': '-', '\u2018': "'", '\u2019': "'", '\u201c': '"',
        '\u201d': '"', '\u2026': '...', '\u00e9': 'e', '\u00e0': 'a',
        '\u00e8': 'e', '\u00ea': 'e', '\u00f6': 'o', '\u00fc': 'u',
    }
    cleaned = ""
    for ch in str(text):
        cat = unicodedata.category(ch)
        if ch in replacements:
            cleaned += replacements[ch]
        elif cat.startswith('C') and ch not in ('\n', '\t', ' '):
            cleaned += ' '
        elif ord(ch) > 127:
            cleaned += ''
        else:
            cleaned += ch
    return ' '.join(cleaned.split()).strip()

def clean_contact(contact: str) -> str:
    if not contact:
        return ""
    parts = [p.strip() for p in re.split(r'\s*\|\s*', contact)]
    seen, unique = set(), []
    for p in parts:
        key = re.sub(r'\s+', '', p.lower())
        if key and key not in seen:
            unique.append(p)
            seen.add(key)
    return ' | '.join(unique)

def extract_keywords(text: str) -> set:
    words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#./\-]{1,20}\b', text.lower())
    stop = {
        'the','and','for','with','that','this','from','your','have','will',
        'our','all','are','can','not','but','job','work','team','role','etc',
        'using','used','good','able','must','into','over','also','been','more'
    }
    return {w for w in words if w not in stop and len(w) > 2}

def parse_ai_response(raw: str) -> dict:
    raw = raw.strip()
    if '```' in raw:
        for part in raw.split('```'):
            part = part.strip().lstrip('json').strip()
            if part.startswith('{'):
                raw = part
                break
    start = raw.find('{')
    end = raw.rfind('}')
    if start == -1 or end == -1:
        return {}
    try:
        return json.loads(raw[start:end+1])
    except Exception as e:
        print(f"JSON parse error: {e}")
        return {}

BAD_SKILL_WORDS = {
    'developer','developers','senior','lead','mandatory','expertise','overview',
    'preferred','immediate','joiners','joining','experience','years','year',
    'month','months','interview','hiring','required','must','good','strong',
    'knowledge','ability','team','work','role','position','job','apply','mode',
    'location','office','notice','urgent','opportunity','opening','vacancy',
    'profile','candidate','candidates','requirement','requirements','communication',
    'problem','solving','analytical','thinking','management','leadership',
    'verbal','written','interpersonal','client','stakeholder','cross','functional',
    'f2f','face','period','bengaluru','bangalore','mumbai','delhi','hyderabad',
    'chennai','pune','kolkata','india','remote','hybrid','onsite','wfh','wfo'
}

def filter_skills(skills: list) -> list:
    if not skills:
        return []
    filtered, seen = [], set()
    for skill in skills:
        if not skill:
            continue
        s = str(skill).strip()
        s_lower = s.lower()
        if s_lower in seen or s_lower in BAD_SKILL_WORDS:
            continue
        if len(s) < 2 or len(s) > 40:
            continue
        # Allow if has special chars (C++, Node.js, etc), all caps acronym, or >= 2 chars tech name
        has_special = any(c in s for c in ['.', '+', '#', '/', '-'])
        is_acronym = s.isupper() and 2 <= len(s) <= 6
        if has_special or is_acronym or (len(s) >= 2 and not any(w in s_lower for w in BAD_SKILL_WORDS)):
            filtered.append(s)
            seen.add(s_lower)
    return filtered


# ─────────────────────────────────────────────
# AI PROMPT
# ─────────────────────────────────────────────

def build_tailor_prompt(resume_text: str, job_title: str, job_description: str) -> str:
    return f"""You are a professional resume writer and ATS expert. Tailor the resume for the job below.

RESUME TEXT (extract every detail — name, contact, linkedin, github, all jobs, all projects, all education, all certs):
{resume_text[:3500]}

TARGET JOB TITLE: {job_title}

JOB DESCRIPTION:
{job_description[:1500]}

STRICT RULES:
1. LINKEDIN: Search for linkedin.com/in/ anywhere in resume text or EXTRACTED_LINKS section. Copy the FULL URL exactly.
2. GITHUB: Search for github.com/ anywhere in resume text or EXTRACTED_LINKS section. Copy the FULL URL exactly.
3. SKILLS: Start with ALL skills from the candidate's resume. Then REMOVE skills irrelevant to this job. Then ADD relevant tech skills from JD that are missing. Keep only technical skills (frameworks, languages, tools, databases). No soft skills, no generic words.
4. EXPERIENCE: Keep ALL jobs. Keep ALL bullet points. Only rephrase bullets where it naturally adds JD keywords.
5. PROJECTS: Extract ALL projects. Keep them all.
6. EDUCATION: Copy exactly as in resume.
7. CERTIFICATIONS: Copy exactly as in resume.
8. LANGUAGES: Copy exactly as in resume.
9. SUMMARY: Write 2-3 sentences tailored specifically for "{job_title}".
10. interview_keywords: The 6 most critical TECHNICAL terms from the JD (real tool/framework/language names only, no generic words).
11. Return ONLY valid JSON. No markdown, no explanation, no extra text.

JSON FORMAT:
{{
  "name": "Full Name",
  "contact": "phone | email@example.com | City, Country",
  "linkedin": "https://linkedin.com/in/username",
  "github": "https://github.com/username",
  "summary": "Tailored 2-3 sentence summary for {job_title}",
  "skills": ["JavaScript", "React.js", "Node.js", "Python", "MySQL", "Git"],
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "period": "Mar 2025 - Present",
      "location": "City",
      "bullets": [
        "Engineered and maintained production-level web apps using React.js",
        "Designed RESTful APIs with MVC, HTTP standards, JSON and Axios"
      ]
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "tech": "React, Node.js, MySQL",
      "description": "Brief description of what it does and your role",
      "link": "https://github.com/username/project or empty string"
    }}
  ],
  "education": [
    {{
      "degree": "B.Tech - Computer Science & Engineering",
      "institution": "University Name",
      "year": "2024",
      "grade": "8.5 CGPA"
    }}
  ],
  "certifications": ["React Native Development - Udemy", "Java Full Stack - Global Quest"],
  "languages": ["English", "Malayalam"],
  "keywords_added": ["Docker", "TypeScript"],
  "interview_keywords": ["React.js", "Spring Boot", "REST API", "MySQL", "Node.js", "Git"]
}}"""


# ─────────────────────────────────────────────
# PDF GENERATOR
# ─────────────────────────────────────────────

def generate_tailored_pdf(tailored: dict, job_title: str, company: str) -> bytes:
    buffer = io.BytesIO()
    PAGE_W = A4[0]
    MARGIN = 18 * mm
    CONTENT_W = PAGE_W - 2 * MARGIN

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=MARGIN, leftMargin=MARGIN,
        topMargin=14*mm, bottomMargin=14*mm
    )

    PURPLE  = colors.HexColor('#5b50d6')
    DARK    = colors.HexColor('#1a1a2e')
    GREY    = colors.HexColor('#444444')
    LGREY   = colors.HexColor('#666666')

    # ── Styles ──────────────────────────────────────────────
    name_s = ParagraphStyle('name',
        fontSize=20, fontName='Helvetica-Bold',
        textColor=DARK, spaceAfter=4, alignment=TA_CENTER)

    contact_s = ParagraphStyle('contact',
        fontSize=9, fontName='Helvetica',
        textColor=GREY, spaceAfter=2, alignment=TA_CENTER, leading=13)

    link_s = ParagraphStyle('link',
        fontSize=9, fontName='Helvetica',
        textColor=PURPLE, spaceAfter=8, alignment=TA_CENTER, leading=13)

    sec_title_s = ParagraphStyle('sec',
        fontSize=10, fontName='Helvetica-Bold',
        textColor=DARK, spaceBefore=10, spaceAfter=0,
        leading=14)

    body_s = ParagraphStyle('body',
        fontSize=9.5, fontName='Helvetica',
        textColor=GREY, spaceAfter=4, leading=14,
        alignment=TA_JUSTIFY)

    bullet_s = ParagraphStyle('bullet',
        fontSize=9.5, fontName='Helvetica',
        textColor=GREY, leftIndent=12, firstLineIndent=0,
        spaceAfter=2, leading=13)

    jobtitle_s = ParagraphStyle('jobtitle',
        fontSize=10, fontName='Helvetica-Bold',
        textColor=DARK, spaceAfter=1, leading=13)

    jobsub_s = ParagraphStyle('jobsub',
        fontSize=9, fontName='Helvetica',
        textColor=LGREY, spaceAfter=3, leading=12)

    projname_s = ParagraphStyle('projname',
        fontSize=10, fontName='Helvetica-Bold',
        textColor=DARK, spaceAfter=1, leading=13)

    projsub_s = ParagraphStyle('projsub',
        fontSize=9, fontName='Helvetica',
        textColor=PURPLE, spaceAfter=2, leading=12)

    skill_s = ParagraphStyle('skill',
        fontSize=9.5, fontName='Helvetica',
        textColor=GREY, leading=13)

    story = []

    def hr(thick=0.6, color=PURPLE, before=2, after=4):
        story.append(Spacer(1, before))
        story.append(HRFlowable(width='100%', thickness=thick, color=color, spaceAfter=after))

    def section(title):
        story.append(Paragraph(clean(title), sec_title_s))
        story.append(HRFlowable(width='100%', thickness=0.5, color=PURPLE, spaceAfter=5))

    def bullet(text):
        t = clean(str(text)).lstrip('-•* ').strip()
        if t:
            story.append(Paragraph(f'• {t}', bullet_s))

    # ── NAME ────────────────────────────────────────────────
    story.append(Paragraph(clean(tailored.get('name', '')), name_s))

    # ── CONTACT ─────────────────────────────────────────────
    contact = clean_contact(clean(tailored.get('contact', '')))
    if contact:
        story.append(Paragraph(contact, contact_s))

    # ── LINKEDIN | GITHUB ───────────────────────────────────
    linkedin = clean(tailored.get('linkedin', ''))
    github   = clean(tailored.get('github', ''))
    links_parts = []
    if linkedin:
        links_parts.append(f'LinkedIn: {linkedin}')
    if github:
        links_parts.append(f'GitHub: {github}')
    if links_parts:
        story.append(Paragraph(' | '.join(links_parts), link_s))

    hr(thick=1.5, before=2, after=6)

    # ── SUMMARY ─────────────────────────────────────────────
    summary = clean(tailored.get('summary', ''))
    if summary:
        section('PROFESSIONAL SUMMARY')
        story.append(Paragraph(summary, body_s))
        story.append(Spacer(1, 2))

    # ── SKILLS ──────────────────────────────────────────────
    skills = filter_skills(tailored.get('skills', []))
    if skills:
        section('TECHNICAL SKILLS')
        # 3-column table, even columns, no borders
        cols = 3
        rows = [skills[i:i+cols] for i in range(0, len(skills), cols)]
        while len(rows[-1]) < cols:
            rows[-1].append('')
        col_w = CONTENT_W / cols
        table_data = [
            [Paragraph(f'• {clean(c)}' if c else '', skill_s) for c in row]
            for row in rows
        ]
        t = Table(table_data, colWidths=[col_w] * cols)
        t.setStyle(TableStyle([
            ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING',   (0, 0), (-1, -1), 0),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
            ('TOPPADDING',    (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(t)
        story.append(Spacer(1, 4))

    # ── EXPERIENCE ──────────────────────────────────────────
    experience = tailored.get('experience', [])
    if experience:
        section('WORK EXPERIENCE')
        for exp in experience:
            if not isinstance(exp, dict):
                continue
            title  = clean(exp.get('title', exp.get('role', '')))
            comp   = clean(exp.get('company', exp.get('organization', '')))
            period = clean(exp.get('period', exp.get('duration', exp.get('dates', ''))))
            loc    = clean(exp.get('location', ''))
            sub    = ' | '.join(filter(None, [comp, period, loc]))
            bullets = exp.get('bullets', exp.get('responsibilities', exp.get('achievements', [])))
            if isinstance(bullets, str):
                bullets = [bullets]

            block = []
            if title:
                block.append(Paragraph(title, jobtitle_s))
            if sub:
                block.append(Paragraph(sub, jobsub_s))
            for b in bullets:
                t = clean(str(b)).lstrip('-•* ').strip()
                if t:
                    block.append(Paragraph(f'• {t}', bullet_s))
            if exp.get('description') and not bullets:
                block.append(Paragraph(f'• {clean(exp["description"])}', bullet_s))
            if block:
                story.append(KeepTogether(block))
                story.append(Spacer(1, 4))

    # ── PROJECTS ────────────────────────────────────────────
    projects = tailored.get('projects', [])
    if projects:
        section('PROJECTS')
        for proj in projects:
            if not isinstance(proj, dict):
                bullet(str(proj))
                continue
            name_p = clean(proj.get('name', proj.get('title', '')))
            tech   = clean(proj.get('tech', proj.get('technologies', proj.get('stack', ''))))
            desc   = clean(proj.get('description', proj.get('details', '')))
            link   = clean(proj.get('link', proj.get('url', proj.get('github', ''))))
            pbulls = proj.get('bullets', proj.get('highlights', []))
            if isinstance(pbulls, str):
                pbulls = [pbulls]

            block = []
            if name_p:
                block.append(Paragraph(name_p, projname_s))
            if tech:
                block.append(Paragraph(tech, projsub_s))
            if desc:
                block.append(Paragraph(f'• {desc}', bullet_s))
            for b in pbulls:
                t = clean(str(b)).lstrip('-•* ').strip()
                if t:
                    block.append(Paragraph(f'• {t}', bullet_s))
            if link:
                block.append(Paragraph(f'Link: {link}', jobsub_s))
            if block:
                story.append(KeepTogether(block))
                story.append(Spacer(1, 4))

    # ── EDUCATION ───────────────────────────────────────────
    education = tailored.get('education', [])
    if education:
        section('EDUCATION')
        for edu in education:
            if not isinstance(edu, dict):
                bullet(str(edu))
                continue
            deg  = clean(edu.get('degree', edu.get('qualification', '')))
            inst = clean(edu.get('institution', edu.get('university', edu.get('college', ''))))
            yr   = clean(edu.get('year', edu.get('period', edu.get('graduation', ''))))
            gr   = clean(edu.get('grade', edu.get('gpa', edu.get('cgpa', edu.get('percentage', '')))))
            sub  = ' | '.join(filter(None, [inst, yr, gr]))
            if deg:
                story.append(Paragraph(deg, jobtitle_s))
            if sub:
                story.append(Paragraph(sub, jobsub_s))
            story.append(Spacer(1, 2))

    # ── CERTIFICATIONS ──────────────────────────────────────
    certs = tailored.get('certifications', tailored.get('certificates', []))
    if certs:
        section('CERTIFICATIONS')
        for cert in certs:
            t = cert if isinstance(cert, str) else cert.get('name', str(cert))
            bullet(t)

    # ── LANGUAGES ───────────────────────────────────────────
    langs = tailored.get('languages', [])
    if langs:
        section('LANGUAGES')
        lang_text = ' | '.join([
            clean(l) if isinstance(l, str) else clean(l.get('language', str(l)))
            for l in langs
        ])
        story.append(Paragraph(lang_text, body_s))

    doc.build(story)
    return buffer.getvalue()


# ─────────────────────────────────────────────
# DOCX GENERATOR (mirrors PDF exactly)
# ─────────────────────────────────────────────

def generate_tailored_docx(tailored: dict, job_title: str, company: str) -> bytes:
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    PURPLE_RGB = RGBColor(91, 80, 214)
    DARK_RGB   = RGBColor(26, 26, 46)
    GREY_RGB   = RGBColor(68, 68, 68)
    LGREY_RGB  = RGBColor(102, 102, 102)

    doc = Document()
    for sec in doc.sections:
        sec.top_margin    = Cm(1.5)
        sec.bottom_margin = Cm(1.5)
        sec.left_margin   = Cm(2.0)
        sec.right_margin  = Cm(2.0)

    # Remove default paragraph spacing
    from docx.styles.style import _ParagraphStyle
    normal = doc.styles['Normal']
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.space_after  = Pt(0)

    def para(text='', align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=2):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after  = Pt(space_after)
        if text:
            p.add_run(clean(text))
        return p

    def run(p, text, bold=False, italic=False, size=10, color=None):
        r = p.add_run(clean(str(text)))
        r.bold   = bold
        r.italic = italic
        r.font.size = Pt(size)
        if color:
            r.font.color.rgb = color
        return r

    def section_heading(title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after  = Pt(1)
        r = p.add_run(title)
        r.bold = True
        r.font.size = Pt(11)
        r.font.color.rgb = DARK_RGB
        # Purple bottom border
        pPr = p._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'single')
        bottom.set(qn('w:sz'), '6')
        bottom.set(qn('w:space'), '1')
        bottom.set(qn('w:color'), '5b50d6')
        pBdr.append(bottom)
        pPr.append(pBdr)

    def add_bullet(text):
        t = clean(str(text)).lstrip('-•* ').strip()
        if not t:
            return
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after  = Pt(2)
        p.paragraph_format.left_indent  = Cm(0.4)
        r = p.add_run(f'• {t}')
        r.font.size = Pt(10)
        r.font.color.rgb = GREY_RGB

    def no_borders_table(tbl):
        tbl_pr = tbl._tbl.get_or_add_tblPr()
        tbl_borders = OxmlElement('w:tblBorders')
        for border_name in ['top','left','bottom','right','insideH','insideV']:
            b = OxmlElement(f'w:{border_name}')
            b.set(qn('w:val'), 'none')
            tbl_borders.append(b)
        tbl_pr.append(tbl_borders)

    # ── NAME ────────────────────────────────────────────────
    p = para(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=3)
    run(p, tailored.get('name', ''), bold=True, size=20, color=DARK_RGB)

    # ── CONTACT ─────────────────────────────────────────────
    contact = clean_contact(clean(tailored.get('contact', '')))
    if contact:
        p = para(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
        run(p, contact, size=9, color=GREY_RGB)

    # ── LINKEDIN | GITHUB ───────────────────────────────────
    linkedin = clean(tailored.get('linkedin', ''))
    github   = clean(tailored.get('github', ''))
    links_parts = []
    if linkedin:
        links_parts.append(f'LinkedIn: {linkedin}')
    if github:
        links_parts.append(f'GitHub: {github}')
    if links_parts:
        p = para(align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6)
        run(p, ' | '.join(links_parts), size=9, color=PURPLE_RGB)

    # ── SUMMARY ─────────────────────────────────────────────
    summary = clean(tailored.get('summary', ''))
    if summary:
        section_heading('PROFESSIONAL SUMMARY')
        p = para(space_after=4)
        run(p, summary, size=10, color=GREY_RGB)

    # ── SKILLS ──────────────────────────────────────────────
    skills = filter_skills(tailored.get('skills', []))
    if skills:
        section_heading('TECHNICAL SKILLS')
        cols = 3
        rows = [skills[i:i+cols] for i in range(0, len(skills), cols)]
        while len(rows[-1]) < cols:
            rows[-1].append('')
        tbl = doc.add_table(rows=len(rows), cols=cols)
        tbl.style = 'Table Grid'
        for ri, row in enumerate(rows):
            for ci, skill in enumerate(row):
                cell = tbl.rows[ri].cells[ci]
                cell.text = ''
                cp = cell.paragraphs[0]
                cp.paragraph_format.space_after = Pt(2)
                cp.paragraph_format.space_before = Pt(2)
                r = cp.add_run(f'• {clean(skill)}' if skill else '')
                r.font.size = Pt(10)
                r.font.color.rgb = GREY_RGB
        no_borders_table(tbl)

    # ── EXPERIENCE ──────────────────────────────────────────
    experience = tailored.get('experience', [])
    if experience:
        section_heading('WORK EXPERIENCE')
        for exp in experience:
            if not isinstance(exp, dict):
                continue
            title  = clean(exp.get('title', exp.get('role', '')))
            comp   = clean(exp.get('company', ''))
            period = clean(exp.get('period', exp.get('duration', '')))
            loc    = clean(exp.get('location', ''))
            sub    = ' | '.join(filter(None, [comp, period, loc]))
            bullets = exp.get('bullets', exp.get('responsibilities', []))
            if isinstance(bullets, str):
                bullets = [bullets]

            if title:
                p = para(space_before=4, space_after=1)
                run(p, title, bold=True, size=10, color=DARK_RGB)
            if sub:
                p = para(space_after=2)
                run(p, sub, size=9, color=LGREY_RGB)
            for b in bullets:
                add_bullet(b)

    # ── PROJECTS ────────────────────────────────────────────
    projects = tailored.get('projects', [])
    if projects:
        section_heading('PROJECTS')
        for proj in projects:
            if not isinstance(proj, dict):
                add_bullet(str(proj))
                continue
            name_p = clean(proj.get('name', proj.get('title', '')))
            tech   = clean(proj.get('tech', proj.get('technologies', '')))
            desc   = clean(proj.get('description', ''))
            link   = clean(proj.get('link', proj.get('url', '')))
            pbulls = proj.get('bullets', [])
            if isinstance(pbulls, str):
                pbulls = [pbulls]

            if name_p:
                p = para(space_before=4, space_after=1)
                run(p, name_p, bold=True, size=10, color=DARK_RGB)
            if tech:
                p = para(space_after=2)
                run(p, tech, size=9, color=PURPLE_RGB)
            if desc:
                add_bullet(desc)
            for b in pbulls:
                add_bullet(b)
            if link:
                p = para(space_after=2)
                run(p, f'Link: {link}', size=9, color=LGREY_RGB)

    # ── EDUCATION ───────────────────────────────────────────
    education = tailored.get('education', [])
    if education:
        section_heading('EDUCATION')
        for edu in education:
            if not isinstance(edu, dict):
                add_bullet(str(edu))
                continue
            deg  = clean(edu.get('degree', ''))
            inst = clean(edu.get('institution', edu.get('university', '')))
            yr   = clean(edu.get('year', ''))
            gr   = clean(edu.get('grade', edu.get('cgpa', '')))
            sub  = ' | '.join(filter(None, [inst, yr, gr]))
            if deg:
                p = para(space_before=4, space_after=1)
                run(p, deg, bold=True, size=10, color=DARK_RGB)
            if sub:
                p = para(space_after=2)
                run(p, sub, size=9, color=LGREY_RGB)

    # ── CERTIFICATIONS ──────────────────────────────────────
    certs = tailored.get('certifications', [])
    if certs:
        section_heading('CERTIFICATIONS')
        for c in certs:
            add_bullet(c if isinstance(c, str) else c.get('name', str(c)))

    # ── LANGUAGES ───────────────────────────────────────────
    langs = tailored.get('languages', [])
    if langs:
        section_heading('LANGUAGES')
        lang_text = ' | '.join([
            clean(l) if isinstance(l, str) else clean(l.get('language', str(l)))
            for l in langs
        ])
        p = para(space_after=4)
        run(p, lang_text, size=10, color=GREY_RGB)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()


# ─────────────────────────────────────────────
# SHARED TAILOR LOGIC
# ─────────────────────────────────────────────

def run_tailor_ai(resume_text: str, job_title: str, job_description: str):
    """Run AI tailoring and return (tailored_dict, keywords_added, interview_kws, orig_score, tailored_score)"""
    resume_kws = extract_keywords(resume_text)
    jd_kws     = extract_keywords(job_description + ' ' + job_title)
    missing    = jd_kws - resume_kws
    orig_score = min(95, int((len(resume_kws & jd_kws) / max(len(jd_kws), 1)) * 100))

    prompt = build_tailor_prompt(resume_text, job_title, job_description)

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": "You are a JSON-only API. Return valid JSON exactly matching the schema. No markdown. No explanation."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=4096
    )

    raw = response.choices[0].message.content.strip()
    print(f"RAW AI response (first 400): {raw[:400]}")
    tailored = parse_ai_response(raw)
    if not tailored:
        raise HTTPException(status_code=500, detail="AI response parsing failed. Please try again.")

    tailored['skills']   = filter_skills(tailored.get('skills', []))
    keywords_added       = filter_skills(tailored.get('keywords_added', []))
    interview_kws        = tailored.get('interview_keywords', list(missing)[:8])
    # Filter interview_kws — remove generic words
    interview_kws        = [k for k in interview_kws if len(k) > 1 and k.lower() not in BAD_SKILL_WORDS][:8]

    tailored_kws    = extract_keywords(json.dumps(tailored))
    new_matched     = tailored_kws & jd_kws
    tailored_score  = min(97, int((len(new_matched) / max(len(jd_kws), 1)) * 100))
    if tailored_score <= orig_score:
        tailored_score = min(97, orig_score + max(3, len(keywords_added) * 2))

    return tailored, keywords_added, interview_kws, orig_score, tailored_score

def make_headers(filename, keywords_added, interview_kws, orig_score, tailored_score):
    return {
        "Content-Disposition": f"attachment; filename={filename}",
        "x-keywords-added":    json.dumps(keywords_added),
        "x-interview-keywords": json.dumps(interview_kws),
        "x-original-score":    str(orig_score),
        "x-tailored-score":    str(tailored_score),
        "Access-Control-Expose-Headers": "x-keywords-added,x-interview-keywords,x-original-score,x-tailored-score"
    }


# ─────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────

class TailorSavedRequest(BaseModel):
    user_id: str
    job_title: str
    job_description: str
    company: str = "Company"
    resume_text: str = ""
    output_format: str = "pdf"   # "pdf" or "docx"


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.post("/tailor")
async def tailor_resume(
    resume_file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    company: str = Form(default="Company"),
    user_id: str = Form(...),
    output_format: str = Form(default="pdf")
):
    try:
        resume_bytes = await resume_file.read()
        resume_text  = extract_pdf_text(resume_bytes)
        if not resume_text or len(resume_text) < 30:
            raise HTTPException(status_code=400, detail="Could not read PDF content.")

        tailored, kw_added, int_kws, orig, new = run_tailor_ai(resume_text, job_title, job_description)

        if output_format == "docx":
            content  = generate_tailored_docx(tailored, job_title, company)
            media    = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"tailored_{job_title.replace(' ','_')}.docx"
        else:
            content  = generate_tailored_pdf(tailored, job_title, company)
            media    = "application/pdf"
            filename = f"tailored_{job_title.replace(' ','_')}.pdf"

        return StreamingResponse(io.BytesIO(content), media_type=media,
                                 headers=make_headers(filename, kw_added, int_kws, orig, new))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"TAILOR ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tailor-saved")
async def tailor_saved_resume(data: TailorSavedRequest):
    try:
        resume_text = data.resume_text
        if not resume_text:
            try:
                file_bytes  = supabase.storage.from_("resumes").download(f"{data.user_id}/resume.pdf")
                resume_text = extract_pdf_text(file_bytes)
            except Exception as e:
                print(f"Storage error: {e}")

        if not resume_text:
            raise HTTPException(status_code=400, detail="No resume found. Please upload your resume first.")

        tailored, kw_added, int_kws, orig, new = run_tailor_ai(resume_text, data.job_title, data.job_description)

        if data.output_format == "docx":
            content  = generate_tailored_docx(tailored, data.job_title, data.company)
            media    = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"tailored_{data.job_title.replace(' ','_')}.docx"
        else:
            content  = generate_tailored_pdf(tailored, data.job_title, data.company)
            media    = "application/pdf"
            filename = f"tailored_{data.job_title.replace(' ','_')}.pdf"

        return StreamingResponse(io.BytesIO(content), media_type=media,
                                 headers=make_headers(filename, kw_added, int_kws, orig, new))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"TAILOR-SAVED ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tailor-docx")
async def tailor_resume_docx(
    resume_file: UploadFile = File(...),
    job_title: str = Form(...),
    job_description: str = Form(...),
    company: str = Form(default="Company"),
    user_id: str = Form(...)
):
    """Dedicated DOCX endpoint — uses same AI logic as PDF."""
    try:
        resume_bytes = await resume_file.read()
        resume_text  = extract_pdf_text(resume_bytes)
        if not resume_text or len(resume_text) < 30:
            raise HTTPException(status_code=400, detail="Could not read PDF.")

        tailored, kw_added, int_kws, orig, new = run_tailor_ai(resume_text, job_title, job_description)

        content  = generate_tailored_docx(tailored, job_title, company)
        media    = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"tailored_{job_title.replace(' ','_')}.docx"

        return StreamingResponse(io.BytesIO(content), media_type=media,
                                 headers=make_headers(filename, kw_added, int_kws, orig, new))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"TAILOR-DOCX ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-resume")
async def save_resume(
    resume_file: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        file_bytes   = await resume_file.read()
        storage_path = f"{user_id}/resume.pdf"
        supabase.storage.from_("resumes").upload(
            storage_path, file_bytes,
            {"content-type": "application/pdf", "upsert": "true"}
        )
        supabase.table("user_resumes").upsert({
            "user_id":      user_id,
            "file_name":    resume_file.filename,
            "file_size":    len(file_bytes),
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
        file_bytes = supabase.storage.from_("resumes").download(f"{user_id}/resume.pdf")
        text = extract_pdf_text(file_bytes)
        return {"text": text, "success": True}
    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}