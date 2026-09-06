from fastapi import APIRouter, Query
from supabase import create_client
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

class ApplicationCreate(BaseModel):
    user_id: str
    job_title: str
    company: str
    location: Optional[str] = ""
    job_url: Optional[str] = ""
    salary: Optional[str] = ""
    job_type: Optional[str] = ""
    status: Optional[str] = "Applied"  # Applied | Interview | Offer | Rejected
    notes: Optional[str] = ""
    applied_date: Optional[str] = ""

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[str] = None

@router.get("/")
async def get_applications(user_id: str = Query(...)):
    try:
        result = supabase.table("job_applications").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data or []
    except Exception as e:
        return {"error": str(e)}

@router.post("/")
async def add_application(data: ApplicationCreate):
    try:
        result = supabase.table("job_applications").insert({
            "user_id": data.user_id,
            "job_title": data.job_title,
            "company": data.company,
            "location": data.location,
            "job_url": data.job_url,
            "salary": data.salary,
            "job_type": data.job_type,
            "status": data.status,
            "notes": data.notes,
            "applied_date": data.applied_date,
        }).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.patch("/{app_id}")
async def update_application(app_id: int, data: ApplicationUpdate):
    try:
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        result = supabase.table("job_applications").update(update_data).eq("id", app_id).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.delete("/{app_id}")
async def delete_application(app_id: int):
    try:
        supabase.table("job_applications").delete().eq("id", app_id).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/stats")
async def get_stats(user_id: str = Query(...)):
    try:
        result = supabase.table("job_applications").select("status").eq("user_id", user_id).execute()
        data = result.data or []
        stats = {"Applied": 0, "Interview": 0, "Offer": 0, "Rejected": 0, "total": len(data)}
        for row in data:
            s = row.get("status", "Applied")
            if s in stats:
                stats[s] += 1
        return stats
    except Exception as e:
        return {"error": str(e)}