from fastapi import APIRouter, Query
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

@router.get("/")
async def get_jobs(
    category: str = Query(None),
    job_type: str = Query(None),
    search: str = Query(None),
    location: str = Query(None),
):
    try:
        query = supabase.table("jobs").select("*")

        if category and category != "All":
            query = query.eq("category", category)
        if job_type and job_type != "All":
            query = query.eq("job_type", job_type)
        if search and search.strip():
            query = query.ilike("title", f"%{search}%")
        if location and location.strip() and location.lower() not in ["india","all",""]:
            query = query.or_(f"city.ilike.%{location}%,location.ilike.%{location}%")

        result = query.order("created_at", desc=True).limit(20).execute()
        print(f"Jobs fetched: {len(result.data)}")
        return result.data or []

    except Exception as e:
        print(f"Jobs fetch error: {e}")
        return []

@router.get("/map-counts")
async def get_map_counts(
    role: str = Query(None),
    country: str = Query("India"),
    state: str = Query(None)
):
    try:
        query = supabase.table("jobs").select("city,location,category,title")

        # Only filter by role if it's a specific search
        if role and role.strip() and role.lower() not in ["software developer","developer","all",""]:
            # Search by first meaningful word
            words = [w for w in role.split() if len(w) > 2]
            if words:
                query = query.ilike("title", f"%{words[0]}%")

        if state and state.strip():
            query = query.ilike("location", f"%{state}%")

        result = query.execute()

        city_counts = {}
        skip = {"none","remote","","india","worldwide","global","anywhere","not specified"}
        for job in result.data:
            city = (job.get("city") or "").strip()
            if city and city.lower() not in skip and len(city) > 2:
                city_counts[city] = city_counts.get(city, 0) + 1

        return {
            "total": len(result.data),
            "by_city": city_counts,
            "role": role or "all",
        }
    except Exception as e:
        print(f"Map counts error: {e}")
        return {"error": str(e), "total": 0, "by_city": {}}

@router.get("/{job_id}")
async def get_job(job_id: int):
    result = supabase.table("jobs").select("*").eq("id", job_id).execute()
    return result.data[0] if result.data else {}