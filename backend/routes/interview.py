from fastapi import APIRouter
from groq import Groq
import os, json, re
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def clean_json(raw: str) -> str:
    raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()
    raw = re.sub(r'```(?:json)?\s*', '', raw)
    raw = raw.replace('```', '').strip()
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1:
        raw = raw[start:end+1]
    # Auto-close truncated brackets
    open_braces = raw.count('{') - raw.count('}')
    open_brackets = raw.count('[') - raw.count(']')
    if open_brackets > 0:
        raw += ']' * open_brackets
    if open_braces > 0:
        raw += '}' * open_braces
    return raw

def call_groq(system: str, user: str, max_tokens: int = 1024) -> dict:
    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user}
        ],
        temperature=0.2,
        max_tokens=max_tokens
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(clean_json(raw))

SYS = "Return ONLY valid complete JSON. No markdown, no prose, no think tags. Use real accurate data."

# ── QUESTIONS ─────────────────────────────────────────────────────
@router.post("/questions")
async def generate_questions(data: dict):
    role    = data.get("role","")
    company = data.get("company","")
    level   = data.get("level","")
    mode    = data.get("mode","HR Round")
    try:
        co = f" at {company}" if company and company!="Any Company" else ""
        result = call_groq(SYS,
            f'Generate 5 {mode} questions for {role}{co}, {level}.\n'
            f'JSON: {{"questions":["Q1?","Q2?","Q3?","Q4?","Q5?"],"opening":"Hi, I am your AI interviewer for {role}. Let us begin."}}',
            500)
        return {"success":True,"data":result}
    except Exception as e:
        return {"success":False,"error":str(e)}

# ── EVALUATE ──────────────────────────────────────────────────────
@router.post("/evaluate")
async def evaluate_answer(data: dict):
    role     = data.get("role","")
    mode     = data.get("mode","")
    question = data.get("question","")[:150]
    answer   = data.get("answer","")[:300]
    try:
        result = call_groq(SYS,
            f'Evaluate this {mode} answer for {role}.\nQ:{question}\nA:{answer}\n'
            f'Score 0-100 honestly. JSON:\n'
            f'{{"score":INT,"star_s":BOOL,"star_t":BOOL,"star_a":BOOL,"star_r":BOOL,'
            f'"strengths":"good point","weaknesses":"missing part","ideal":"improvement","followup":"follow-up?"}}',
            400)
        return {"success":True,"data":result}
    except Exception as e:
        return {"success":False,"error":str(e)}

# ── REPORT ────────────────────────────────────────────────────────
@router.post("/report")
async def generate_report(data: dict):
    role    = data.get("role","")
    mode    = data.get("mode","")
    company = data.get("company","")
    level   = data.get("level","")
    answers = data.get("answers",[])
    scores  = data.get("scores",[])
    try:
        avg = round(sum(scores)/len(scores)) if scores else 65
        qa  = " | ".join([f'Q:{a["q"][:40]} A:{a["a"][:50]}' for a in answers[:3]])
        result = call_groq(SYS,
            f'Report for {role} {mode}, score {avg}/100. QA:{qa}\n'
            f'JSON:{{"overall_score":{avg},"readiness":"verdict","confidence_level":"Low/Medium/High",'
            f'"verdict":"2 honest sentences","strengths":["s1","s2","s3"],'
            f'"improvements":["i1","i2","i3"],"practice_areas":["a1","a2"],"recommendation":"advice"}}',
            500)
        return {"success":True,"data":result}
    except Exception as e:
        return {"success":False,"error":str(e)}

# ── CAREER INTELLIGENCE ───────────────────────────────────────────
@router.post("/career-intelligence")
async def career_intelligence(data: dict):
    role = data.get("role","")
    try:
        # Part 1 — risk + outlook — kept very short
        p1 = call_groq(
            "Return ONLY valid JSON with real accurate data for the given job role. No examples, no placeholders.",
            f'''Real AI automation risk for "{role}" in India 2025.
JSON (use real % not placeholder):
{{
"ai_replacement_risk":REAL_INT,
"risk_level":"Low/Medium/High",
"risk_color":"#00e5a0 or #f5a623 or #ff4d6d",
"risk_timeline":"specific year/timeline",
"what_ai_takes":["task1","task2","task3"],
"what_stays_human":["skill1","skill2","skill3"],
"safer_pivot_roles":["role1","role2","role3"],
"future_outlook":{{
"demand_2025":"High/Medium/Low",
"demand_2027":"High/Medium/Low",
"demand_2030":"High/Medium/Low/Evolving",
"salary_trend":"real trend",
"top_industries":["i1","i2","i3"],
"emerging_subroles":["s1","s2","s3"]
}}
}}''',
            900)

        # Part 2 — tools + tips — kept very short
        p2 = call_groq(
            "Return ONLY valid JSON with real tool names for the given job role. No placeholders.",
            f'''Top 5 real AI tools for "{role}" in 2025 + survival tips.
JSON:
{{
"ai_tools":[
{{"name":"RealTool1","purpose":"how {role} uses it","priority":"Must learn","time":"X weeks","free":true}},
{{"name":"RealTool2","purpose":"use","priority":"Must learn","time":"X weeks","free":false}},
{{"name":"RealTool3","purpose":"use","priority":"Good to know","time":"X weeks","free":true}},
{{"name":"RealTool4","purpose":"use","priority":"Good to know","time":"X weeks","free":false}},
{{"name":"RealTool5","purpose":"use","priority":"Optional","time":"X weeks","free":true}}
],
"survival_tips":["tip1 for {role}","tip2","tip3"],
"verdict":"2 honest sentences about {role} future in India"
}}''',
            900)

        return {"success":True,"data":{"role":role,**p1,**p2}}

    except json.JSONDecodeError as e:
        return {"success":False,"error":f"JSON parse error: {str(e)}"}
    except Exception as e:
        return {"success":False,"error":str(e)}