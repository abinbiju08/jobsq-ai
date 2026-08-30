from fastapi import APIRouter
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

@router.get("/")
async def get_jobs(category: str = None, job_type: str = None, search: str = None):
    query = supabase.table("jobs").select("*").order("created_at", desc=True)
    if category and category != "All":
        query = query.eq("category", category)
    if job_type and job_type != "All":
        query = query.eq("job_type", job_type)
    if search:
        query = query.ilike("title", f"%{search}%")
    result = query.execute()
    return result.data

@router.get("/{job_id}")
async def get_job(job_id: int):
    result = supabase.table("jobs").select("*").eq("id", job_id).execute()
    return result.data[0] if result.data else {}
