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
    language:        str
    code:            str
    stdin:           str = ""
    expected_output: str = ""  # for strict comparison

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
    Strictly compares actual stdout against expected output.
    Wrong output = Wrong Answer, not Accepted.
    """
    try:
        prompt = f"""You are a strict {data.language} code interpreter and judge.

LANGUAGE: {data.language}
STDIN:
{data.stdin or "(none)"}

CODE:
{data.code}

TASK:
1. Trace through the code exactly, step by step
2. Determine the EXACT stdout the code would produce given the stdin
3. If there is a syntax error, runtime error or exception — report it accurately
4. Be STRICT — if the code has logic errors or produces wrong output, report it honestly

Return ONLY valid JSON, no markdown:
{{
  "stdout": "exact output the code produces, empty string if error",
  "stderr": "exact error message if any, empty string if no error",
  "status": "Accepted or Runtime Error or Compilation Error or Wrong Answer",
  "time": "0.05",
  "memory": "9216",
  "error_type": "SyntaxError or TypeError or NameError etc, empty if no error"
}}

Be ACCURATE and HONEST. If the code is incomplete, has bugs, or produces wrong output — say so.
Never return "Accepted" if the code has errors or produces incorrect output."""

        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": "You are a strict code execution judge. Return only valid JSON. Never be lenient — report errors and wrong output accurately."},
                {"role": "user", "content": prompt}
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

        stdout   = result.get("stdout", "").strip()
        stderr   = result.get("stderr", "").strip()
        status   = result.get("status", "Runtime Error")
        has_err  = bool(stderr) or status not in ("Accepted", "Wrong Answer")

        # Strict output comparison against expected output
        passed = False
        if not has_err and stdout:
            if data.expected_output:
                # Normalize both outputs for comparison (strip trailing whitespace/newlines)
                actual   = stdout.strip().replace("\r\n", "\n").replace("\r", "\n")
                expected = data.expected_output.strip().replace("\r\n", "\n").replace("\r", "\n")
                passed = (actual == expected)
                if not passed:
                    status = "Wrong Answer"
            else:
                # No expected output provided — trust AI status but never auto-accept incomplete code
                passed = (status == "Accepted") and not has_err and len(stdout) > 0
        elif has_err:
            passed = False
            status = result.get("status", "Runtime Error")

        return {
            "success":   True,
            "status":    status,
            "stdout":    stdout,
            "stderr":    stderr,
            "passed":    passed,
            "time":      result.get("time", "0.05"),
            "memory":    result.get("memory", "9216"),
            "simulated": True,
            "expected":  data.expected_output.strip() if data.expected_output else "",
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

        # Auto-save basic public profile if not exists (so user appears on leaderboard)
        try:
            existing_prof = supabase.table("public_profiles")                .select("user_id")                .eq("user_id", data.user_id)                .execute()
            if not existing_prof.data:
                # Fetch email from auth
                auth_user = supabase.auth.admin.get_user_by_id(data.user_id)
                email = auth_user.user.email if auth_user and auth_user.user else ""
                display_name = email.split("@")[0] if email else f"Coder#{data.user_id[:6]}"
                supabase.table("public_profiles").insert({
                    "user_id":      data.user_id,
                    "display_name": display_name,
                    "email":        email,
                    "open_to_work": False,
                    "avatar_color": "#7c6ff7",
                    "bio":          "",
                }).execute()
        except Exception as ep:
            print(f"Profile auto-create skipped: {ep}")

        # Auto-save to public_profiles so user appears on leaderboard
        try:
            ep = supabase.table("public_profiles").select("user_id").eq("user_id", data.user_id).execute()
            if not ep.data:
                au = supabase.auth.admin.get_user_by_id(data.user_id)
                em = au.user.email if au and au.user else ""
                dn = em.split("@")[0] if em else f"Coder#{data.user_id[:6]}"
                supabase.table("public_profiles").insert({
                    "user_id": data.user_id, "display_name": dn,
                    "email": em, "open_to_work": False,
                    "avatar_color": "#7c6ff7", "bio": "",
                }).execute()
        except Exception as ep2:
            print(f"Profile auto-create: {ep2}")

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
    """Top 20 users for a given language with public profile info."""
    try:
        result = supabase.table("skill_scores")\
            .select("user_id, xp, problems_solved, last_solved_at")\
            .eq("language", language.lower())\
            .order("xp", desc=True)\
            .limit(20)\
            .execute()

        user_ids = [row["user_id"] for row in (result.data or [])]
        profiles = {}
        if user_ids:
            prof_result = supabase.table("public_profiles")\
                .select("user_id, display_name, email, open_to_work, avatar_color, bio")\
                .in_("user_id", user_ids)\
                .execute()
            for p in (prof_result.data or []):
                profiles[p["user_id"]] = p

        leaderboard = []
        for i, row in enumerate(result.data or []):
            badge   = get_badge(row.get("xp", 0))
            uid     = row["user_id"]
            profile = profiles.get(uid, {})
            leaderboard.append({
                "rank":            i + 1,
                "user_id":         uid,
                "display_name":    profile.get("display_name") or f"Coder#{uid[:6]}",
                "email":           profile.get("email", ""),
                "open_to_work":    profile.get("open_to_work", False),
                "avatar_color":    profile.get("avatar_color", "#7c6ff7"),
                "bio":             profile.get("bio", ""),
                "xp":              row.get("xp", 0),
                "problems_solved": row.get("problems_solved", 0),
                "last_solved_at":  row.get("last_solved_at"),
                "badge":           badge,
            })

        return {"success": True, "leaderboard": leaderboard}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/global-leaderboard")
async def get_global_leaderboard():
    """Top coders across ALL languages combined."""
    try:
        result = supabase.table("skill_scores")\
            .select("user_id, xp, problems_solved, language")\
            .execute()

        user_totals = {}
        for row in (result.data or []):
            uid = row["user_id"]
            if uid not in user_totals:
                user_totals[uid] = {"xp": 0, "problems_solved": 0, "languages": []}
            user_totals[uid]["xp"] += row.get("xp", 0)
            user_totals[uid]["problems_solved"] += row.get("problems_solved", 0)
            if row.get("xp", 0) > 0:
                user_totals[uid]["languages"].append(row["language"])

        sorted_users = sorted(user_totals.items(), key=lambda x: x[1]["xp"], reverse=True)[:20]

        user_ids = [uid for uid, _ in sorted_users]
        profiles = {}
        if user_ids:
            prof_result = supabase.table("public_profiles")\
                .select("user_id, display_name, email, open_to_work, avatar_color, bio")\
                .in_("user_id", user_ids)\
                .execute()
            for p in (prof_result.data or []):
                profiles[p["user_id"]] = p

        leaderboard = []
        for i, (uid, data) in enumerate(sorted_users):
            badge   = get_badge(data["xp"])
            profile = profiles.get(uid, {})
            leaderboard.append({
                "rank":            i + 1,
                "user_id":         uid,
                "display_name":    profile.get("display_name") or f"Coder#{uid[:6]}",
                "email":           profile.get("email", ""),
                "open_to_work":    profile.get("open_to_work", False),
                "avatar_color":    profile.get("avatar_color", "#7c6ff7"),
                "bio":             profile.get("bio", ""),
                "xp":              data["xp"],
                "problems_solved": data["problems_solved"],
                "languages":       data["languages"],
                "badge":           badge,
            })

        return {"success": True, "leaderboard": leaderboard}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UpdateProfileRequest(BaseModel):
    user_id:      str
    display_name: str = ""
    open_to_work: bool = False
    avatar_color: str = "#7c6ff7"
    bio:          str = ""
    email:        str = ""

@router.post("/update-profile")
async def update_profile(data: UpdateProfileRequest):
    """Update public profile for leaderboard visibility."""
    try:
        supabase.table("public_profiles").upsert({
            "user_id":      data.user_id,
            "display_name": data.display_name,
            "open_to_work": data.open_to_work,
            "avatar_color": data.avatar_color,
            "bio":          data.bio,
            "email":        data.email,
            "updated_at":   "now()",
        }, on_conflict="user_id").execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-rank/{user_id}/{language}")
async def get_my_rank(user_id: str, language: str):
    """Get a user's rank position for a language."""
    try:
        result = supabase.table("skill_scores")\
            .select("user_id, xp")\
            .eq("language", language.lower())\
            .order("xp", desc=True)\
            .execute()

        rows  = result.data or []
        rank  = next((i+1 for i, r in enumerate(rows) if r["user_id"] == user_id), None)
        total = len(rows)
        pct   = round((1 - (rank or total) / max(total, 1)) * 100) if rank else 0

        return {"success": True, "rank": rank, "total": total, "percentile": pct}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))