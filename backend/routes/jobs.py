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
    search:   str = Query(None),
    location: str = Query(None),
    limit:    int = Query(50),
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

        result = query.order("created_at", desc=True).limit(limit).execute()
        print(f"Jobs fetched: {len(result.data)}")
        return result.data or []

    except Exception as e:
        print(f"Jobs fetch error: {e}")
        return []

@router.get("/map-counts")
async def get_map_counts(
    role:    str = Query(None),
    country: str = Query("India"),
    state:   str = Query(None)
):
    try:
        query = supabase.table("jobs").select("city, latitude, longitude, title")

        if role and role.strip() and role.lower() not in ["all", ""]:
            role_clean = role.strip()
            key_words = [w for w in role_clean.split() if len(w) > 3 and w.lower() not in
                         {"developer","engineer","manager","analyst","senior","junior","lead","india"}]
            if key_words:
                query = query.ilike("title", f"%{key_words[0]}%")
            else:
                query = query.ilike("title", f"%{role_clean}%")

        if state and state.strip():
            query = query.ilike("location", f"%{state}%")

        result = query.execute()

        city_data = {}
        skip = {"none", "remote", "", "india", "worldwide", "global", "anywhere", "not specified"}

        for job in result.data:
            city = (job.get("city") or "").strip()
            if not city or city.lower() in skip or len(city) < 2:
                continue
            lat = job.get("latitude")
            lng = job.get("longitude")
            if city not in city_data:
                city_data[city] = {"count": 0, "lat": lat, "lng": lng}
            city_data[city]["count"] += 1
            if not city_data[city]["lat"] and lat:
                city_data[city]["lat"] = lat
                city_data[city]["lng"] = lng

        cities = [
            {
                "city":  city,
                "count": data["count"],
                "lat":   data["lat"],
                "lng":   data["lng"],
            }
            for city, data in city_data.items()
            if data["count"] > 0
        ]
        cities.sort(key=lambda x: x["count"], reverse=True)

        return {
            "total":   len(result.data),
            "by_city": {c["city"]: c["count"] for c in cities},
            "cities":  cities,   
            "role":    role or "all",
        }
    except Exception as e:
        print(f"Map counts error: {e}")
        return {"error": str(e), "total": 0, "by_city": {}, "cities": []}

@router.get("/{job_id}")
async def get_job(job_id: int):
    result = supabase.table("jobs").select("*").eq("id", job_id).execute()
    return result.data[0] if result.data else {}
