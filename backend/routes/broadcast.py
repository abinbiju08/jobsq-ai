from fastapi import APIRouter, HTTPException
from supabase import create_client
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

ADMIN_EMAILS = os.getenv("ADMIN_EMAILS", "abinbiju08@gmail.com").split(",")

TYPE_META = {
    "Hiring":       { "color": "#00e5a0", "border": "rgba(0,229,160,0.25)",   "bg": "rgba(0,229,160,0.08)",   "icon": "ti-briefcase"  },
    "Internship":   { "color": "#7c6ff7", "border": "rgba(124,111,247,0.25)", "bg": "rgba(124,111,247,0.08)", "icon": "ti-school"     },
    "Top MNC":      { "color": "#f5a623", "border": "rgba(245,166,35,0.25)",  "bg": "rgba(245,166,35,0.08)",  "icon": "ti-building"   },
    "Scholarship":  { "color": "#3b82f6", "border": "rgba(59,130,246,0.25)",  "bg": "rgba(59,130,246,0.08)",  "icon": "ti-award"      },
    "Off campus":   { "color": "#ec4899", "border": "rgba(236,72,153,0.25)",  "bg": "rgba(236,72,153,0.08)",  "icon": "ti-calendar"   },
    "Announcement": { "color": "#14b8a6", "border": "rgba(20,184,166,0.25)",  "bg": "rgba(20,184,166,0.08)",  "icon": "ti-speakerphone"},
}

class BroadcastCreate(BaseModel):
    type:        str
    rooms:       List[str] = ["all"]
    headline:    str
    details:     str = ""
    link:        str = ""
    link_label:  str = "Apply now"
    pinned:      bool = False
    pin_days:    int = 7
    admin_email: str

@router.post("/")
async def create_broadcast(data: BroadcastCreate):
    if data.admin_email.strip() not in [e.strip() for e in ADMIN_EMAILS]:
        raise HTTPException(status_code=403, detail="Not authorized")
    expires_at = None
    if data.pinned and data.pin_days > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=data.pin_days)).isoformat()
    result = supabase.table("broadcasts").insert({
        "type":       data.type,
        "rooms":      data.rooms,
        "headline":   data.headline,
        "details":    data.details,
        "link":       data.link,
        "link_label": data.link_label,
        "pinned":     data.pinned,
        "pin_days":   data.pin_days,
        "expires_at": expires_at,
    }).execute()
    return {"success": True, "broadcast": result.data[0] if result.data else {}}

@router.get("/")
async def get_broadcasts(room: str = "all"):
    """Get active broadcasts for a specific room or all rooms."""
    now = datetime.now(timezone.utc).isoformat()
    result = supabase.table("broadcasts")\
        .select("*")\
        .order("pinned", desc=True)\
        .order("created_at", desc=True)\
        .limit(20)\
        .execute()

    broadcasts = []
    for b in (result.data or []):
        if b.get("expires_at") and b["expires_at"] < now:
            continue
        rooms = b.get("rooms", ["all"])
        if "all" not in rooms and room not in rooms:
            continue
        meta = TYPE_META.get(b["type"], TYPE_META["Announcement"])
        broadcasts.append({**b, **meta})

    return {"success": True, "broadcasts": broadcasts}

@router.delete("/{broadcast_id}")
async def delete_broadcast(broadcast_id: str, admin_email: str):
    if admin_email.strip() not in [e.strip() for e in ADMIN_EMAILS]:
        raise HTTPException(status_code=403, detail="Not authorized")
    supabase.table("broadcasts").delete().eq("id", broadcast_id).execute()
    return {"success": True}
