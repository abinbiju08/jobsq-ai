from fastapi import APIRouter
from groq import Groq
from pydantic import BaseModel
from supabase import create_client
import os, re
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Basic bad word list as first fast filter
BAD_WORDS = [
    "fuck","shit","bitch","asshole","bastard","damn","crap","dick","pussy",
    "nigger","nigga","faggot","slut","whore","cunt","idiot","stupid","retard",
    "kill yourself","kys","hate you","go die","spam","scam","porn","sex","naked"
]

class ModerateRequest(BaseModel):
    message: str
    user_id: str
    room: str

class BanRequest(BaseModel):
    user_id: str
    banned_by: str

def quick_filter(text: str) -> bool:
    """Fast check before calling AI"""
    text_lower = text.lower()
    for word in BAD_WORDS:
        if word in text_lower:
            return True
    return False

async def ai_moderate(message: str) -> dict:
    """Use Groq to check if message is appropriate"""
    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{
                "role": "system",
                "content": """You are a content moderator for a professional job-seeking community chat.
Analyze the message and respond with ONLY a JSON object:
{"allowed": true/false, "reason": "brief reason if blocked"}

Block messages that contain:
- Profanity or abusive language
- Hate speech or discrimination  
- Spam or promotional content
- Threats or harassment
- Sexually explicit content
- Completely irrelevant/nonsense content

Allow messages that are:
- Job-related discussions
- Career advice
- Technical questions
- Professional networking
- General career chat"""
            }, {
                "role": "user",
                "content": f"Message: {message}"
            }],
            temperature=0.1,
            max_tokens=100
        )
        raw = response.choices[0].message.content.strip()
        if '<think>' in raw:
            raw = raw.split('</think>')[-1].strip()
        # Extract JSON
        import json
        start = raw.find('{')
        end = raw.rfind('}')
        if start != -1 and end != -1:
            result = json.loads(raw[start:end+1])
            return result
        return {"allowed": True, "reason": ""}
    except:
        return {"allowed": True, "reason": ""}

@router.post("/check")
async def check_message(req: ModerateRequest):
    """Check if message is appropriate before saving"""
    # Step 1: Quick bad word filter
    if quick_filter(req.message):
        # Log blocked message
        try:
            supabase.table("blocked_messages").insert({
                "user_id": req.user_id,
                "room": req.room,
                "message": req.message,
                "reason": "Bad language detected",
                "blocked_by": "auto-filter"
            }).execute()
        except: pass
        return {"allowed": False, "reason": "Please keep the conversation respectful and professional."}

    # Step 2: AI moderation for edge cases
    result = await ai_moderate(req.message)
    if not result.get("allowed", True):
        try:
            supabase.table("blocked_messages").insert({
                "user_id": req.user_id,
                "room": req.room,
                "message": req.message,
                "reason": result.get("reason", "Inappropriate content"),
                "blocked_by": "ai-moderator"
            }).execute()
        except: pass
        return {
            "allowed": False,
            "reason": result.get("reason", "Message not allowed. Keep it professional.")
        }

    return {"allowed": True, "reason": ""}

@router.get("/stats")
async def get_stats():
    """Admin stats"""
    try:
        total_msgs = supabase.table("community_messages").select("id", count="exact").execute()
        blocked = supabase.table("blocked_messages").select("id", count="exact").execute()
        rooms = supabase.table("community_messages").select("room").execute()
        room_counts = {}
        for msg in (rooms.data or []):
            r = msg.get("room","")
            room_counts[r] = room_counts.get(r, 0) + 1
        return {
            "total_messages": total_msgs.count or 0,
            "blocked_messages": blocked.count or 0,
            "messages_by_room": room_counts
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/messages")
async def get_all_messages(room: str = None, limit: int = 50):
    """Admin - get all messages"""
    try:
        query = supabase.table("community_messages").select("*").order("created_at", desc=True).limit(limit)
        if room:
            query = query.eq("room", room)
        result = query.execute()
        return result.data or []
    except Exception as e:
        return {"error": str(e)}

@router.get("/blocked")
async def get_blocked_messages(limit: int = 50):
    """Admin - get blocked messages"""
    try:
        result = supabase.table("blocked_messages").select("*").order("created_at", desc=True).limit(limit).execute()
        return result.data or []
    except Exception as e:
        return {"error": str(e)}

@router.delete("/message/{msg_id}")
async def delete_message(msg_id: int):
    """Admin - delete a message"""
    try:
        supabase.table("community_messages").delete().eq("id", msg_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/ban")
async def ban_user(req: BanRequest):
    """Admin - ban a user"""
    try:
        supabase.table("banned_users").insert({
            "user_id": req.user_id,
            "banned_by": req.banned_by,
        }).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/banned")
async def get_banned():
    """Admin - get banned users"""
    try:
        result = supabase.table("banned_users").select("*").execute()
        return result.data or []
    except Exception as e:
        return {"error": str(e)}

@router.delete("/ban/{user_id}")
async def unban_user(user_id: str):
    """Admin - unban a user"""
    try:
        supabase.table("banned_users").delete().eq("user_id", user_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/check-ban/{user_id}")
async def check_ban(user_id: str):
    """Check if user is banned"""
    try:
        result = supabase.table("banned_users").select("*").eq("user_id", user_id).execute()
        return {"banned": len(result.data) > 0}
    except:
        return {"banned": False}