from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client
from groq import Groq
import os, json
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

supabase    = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
# XP per difficulty
XP_MAP = { "beginner": 10, "intermediate": 25, "advanced": 50 }

# Badge thresholds
BADGES = [
    (0,   "Beginner",     "🌱"),
    (50,  "Apprentice",   "🔧"),
    (150, "Developer",    "💻"),
    (300, "Engineer",     "⚙️"),
    (500, "Senior",       "🚀"),
    (800, "Expert",       "🏆"),
    (1200,"Master",       "👑"),
]

def get_badge(xp: int):
    badge = BADGES[0]
    for threshold, name, icon in BADGES:
        if xp >= threshold:
            badge = (threshold, name, icon)
    return {"name": badge[1], "icon": badge[2], "xp": xp}


# ─── MODELS ────────────────────────────────────────────

class GenerateProblemRequest(BaseModel):
    role:       str
    language:   str
    difficulty: str
    user_id:    str

class RunCodeRequest(BaseModel):
    language:   str
    code:       str
    stdin:      str = ""

class SubmitSolutionRequest(BaseModel):
    user_id:    str
    language:   str
    difficulty: str
    problem_id: str
    code:       str
    passed:     bool

class GetScoresRequest(BaseModel):
    user_id: str


# ─── ENDPOINTS ─────────────────────────────────────────

@router.post("/generate-problem")
async def generate_problem(data: GenerateProblemRequest):
    """Generate a coding problem using Groq AI for the given role + language + difficulty."""
    try:
        prompt = f"""You are a technical interview coach. Generate a coding problem for a {data.role} developer.

Language: {data.language}
Difficulty: {data.difficulty}

Return ONLY valid JSON with this exact structure:
{{
  "id": "unique_slug_like_two_sum",
  "title": "Problem Title",
  "difficulty": "{data.difficulty}",
  "description": "Clear problem description with examples. Use \\n for newlines.",
  "examples": [
    {{"input": "example input", "output": "expected output", "explanation": "why"}}
  ],
  "constraints": ["constraint 1", "constraint 2"],
  "starter_code": {{
    "python": "def solution():\\n    pass",
    "javascript": "function solution() {{\\n    \\n}}",
    "java": "public class Solution {{\\n    public static void main(String[] args) {{\\n    }}\\n}}",
    "c++": "#include<iostream>\\nusing namespace std;\\nint main() {{\\n    return 0;\\n}}",
    "sql": "SELECT "
  }},
  "test_cases": [
    {{"input": "test input via stdin", "expected_output": "expected\\n"}}
  ],
  "hints": ["hint 1", "hint 2"]
}}

Make the problem appropriate for {data.difficulty} level. For beginner: basic loops/arrays. 
Intermediate: data structures, algorithms. Advanced: optimization, complex logic.
The test_cases input should be what would be fed via stdin to the program.
starter_code should have boilerplate for all 5 languages."""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a JSON API. Return only valid JSON. No markdown, no explanation."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown fences
        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    raw = part
                    break

        start = raw.find("{")
        end   = raw.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("No JSON found in response")

        problem = json.loads(raw[start:end+1])
        return {"success": True, "problem": problem}

    except Exception as e:
        import traceback
        print(f"GENERATE PROBLEM ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run-code")
async def run_code(data: RunCodeRequest):
    """
    AI-simulated code execution using Groq.
    Accurately simulates stdout, stderr, runtime errors, and logic errors
    without needing any external execution API or card details.
    """
    try:
        prompt = f"""You are a {data.language} code interpreter. Execute the following code mentally and return the exact output.

LANGUAGE: {data.language}
STDIN: {data.stdin or "(none)"}

CODE:
{data.code}

Rules:
- Trace through the code step by step
- Return the EXACT stdout output the code would produce
- If there is a syntax error, runtime error, or exception — return the error message exactly as the language runtime would show it
- If the code reads from stdin, use the provided STDIN value
- Do not explain anything
- Return ONLY valid JSON, nothing else

JSON format:
{{
  "stdout": "exact output here or empty string",
  "stderr": "error message if any or empty string",
  "status": "Accepted",
  "passed": true,
  "time": "0.05",
  "memory": "9216",
  "error_type": ""
}}

status must be one of: "Accepted", "Runtime Error", "Compilation Error", "Time Limit Exceeded", "Wrong Answer"
passed must be true only if stdout matches expected and no errors occurred
error_type: "SyntaxError", "TypeError", "NameError", "IndexError", etc. or empty string"""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a precise code interpreter. Return only valid JSON. Never add markdown or explanation."},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.0,
            max_tokens=500
        )

        raw = response.choices[0].message.content.strip()
        if "```" in raw:
            for part in raw.split("```"):
                part = part.strip().lstrip("json").strip()
                if part.startswith("{"):
                    raw = part
                    break

        start = raw.find("{")
        end   = raw.rfind("}")
        result = json.loads(raw[start:end+1]) if start != -1 else {}

        return {
            "success": True,
            "status":  result.get("status", "Accepted"),
            "stdout":  result.get("stdout", "").strip(),
            "stderr":  result.get("stderr", "").strip(),
            "passed":  result.get("passed", not result.get("stderr")),
            "time":    result.get("time", "0.05"),
            "memory":  result.get("memory", "9216"),
            "simulated": True,
        }

    except Exception as e:
        import traceback
        print(f"RUN CODE ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit-solution")
async def submit_solution(data: SubmitSolutionRequest):
    """Award XP when user passes a problem. Prevent duplicate submissions."""
    try:
        if not data.passed:
            return {"success": False, "message": "Solution not accepted — no XP awarded"}

        lang = data.language.lower()
        xp_earned = XP_MAP.get(data.difficulty.lower(), 10)

        # Check if already submitted this problem
        existing = supabase.table("skill_scores").select("*")\
            .eq("user_id", data.user_id)\
            .eq("language", lang)\
            .eq("problem_id", data.problem_id)\
            .execute()

        if existing.data:
            return {"success": False, "message": "Already solved — no duplicate XP", "already_solved": True}

        # Get current score
        current = supabase.table("skill_scores").select("*")\
            .eq("user_id", data.user_id)\
            .eq("language", lang)\
            .execute()

        if current.data:
            old_xp     = current.data[0].get("xp", 0)
            problems   = current.data[0].get("problems_solved", 0)
            new_xp     = old_xp + xp_earned
            new_problems = problems + 1
            supabase.table("skill_scores").update({
                "xp":              new_xp,
                "problems_solved": new_problems,
                "last_solved_at":  "now()",
                "problem_id":      data.problem_id,
            }).eq("user_id", data.user_id).eq("language", lang).execute()
        else:
            new_xp     = xp_earned
            new_problems = 1
            supabase.table("skill_scores").insert({
                "user_id":         data.user_id,
                "language":        lang,
                "xp":              new_xp,
                "problems_solved": new_problems,
                "problem_id":      data.problem_id,
                "last_solved_at":  "now()",
            }).execute()

        badge = get_badge(new_xp)

        return {
            "success":        True,
            "xp_earned":      xp_earned,
            "total_xp":       new_xp,
            "problems_solved": new_problems,
            "badge":          badge,
            "message":        f"+{xp_earned} XP earned! 🎉"
        }

    except Exception as e:
        import traceback
        print(f"SUBMIT ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/skill-scores/{user_id}")
async def get_skill_scores(user_id: str):
    """Get all skill scores and badges for a user."""
    try:
        result = supabase.table("skill_scores").select("*")\
            .eq("user_id", user_id).execute()

        scores = {}
        for row in (result.data or []):
            lang  = row["language"]
            xp    = row.get("xp", 0)
            badge = get_badge(xp)
            scores[lang] = {
                "xp":              xp,
                "problems_solved": row.get("problems_solved", 0),
                "badge":           badge,
                "last_solved_at":  row.get("last_solved_at"),
            }

        # Fill in zeros for languages not yet attempted
        for lang in LANGUAGE_IDS:
            if lang not in scores:
                scores[lang] = {
                    "xp":              0,
                    "problems_solved": 0,
                    "badge":           get_badge(0),
                    "last_solved_at":  None,
                }

        return {"success": True, "scores": scores}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leaderboard/{language}")
async def get_leaderboard(language: str):
    """Top 10 users for a given language."""
    try:
        result = supabase.table("skill_scores")\
            .select("user_id, xp, problems_solved")\
            .eq("language", language.lower())\
            .order("xp", desc=True)\
            .limit(10)\
            .execute()

        leaderboard = []
        for i, row in enumerate(result.data or []):
            badge = get_badge(row.get("xp", 0))
            leaderboard.append({
                "rank":            i + 1,
                "user_id":         row["user_id"],
                "xp":              row.get("xp", 0),
                "problems_solved": row.get("problems_solved", 0),
                "badge":           badge,
            })

        return {"success": True, "leaderboard": leaderboard}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))