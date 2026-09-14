import httpx
import asyncio
import os
import hashlib
from supabase import create_client
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone
from bs4 import BeautifulSoup

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")

INDIA_CITIES = [
    "Bangalore", "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Chennai",
    "Delhi", "Noida", "Gurgaon", "Gurugram", "Kolkata", "Kochi",
    "Ahmedabad", "Coimbatore", "Jaipur", "Lucknow", "Trivandrum",
    "Thiruvananthapuram", "Mysore", "Nagpur", "Chandigarh",
    "Bhubaneswar", "Indore", "Vadodara", "Surat", "Visakhapatnam",
    "Mangalore", "Hubli", "Kozhikode", "Calicut", "Thrissur",
    "Kannur", "Palakkad", "Malappuram", "Kottayam", "Ernakulam",
]

# City coordinate map for accurate map display
CITY_COORDS = {
    "Bangalore":          (12.9716, 77.5946),
    "Bengaluru":          (12.9716, 77.5946),
    "Hyderabad":          (17.3850, 78.4867),
    "Mumbai":             (19.0760, 72.8777),
    "Pune":               (18.5204, 73.8567),
    "Chennai":            (13.0827, 80.2707),
    "Delhi":              (28.6139, 77.2090),
    "Delhi NCR":          (28.6139, 77.2090),
    "Noida":              (28.5355, 77.3910),
    "Gurgaon":            (28.4595, 77.0266),
    "Gurugram":           (28.4595, 77.0266),
    "Kolkata":            (22.5726, 88.3639),
    "Kochi":              (9.9312,  76.2673),
    "Ernakulam":          (9.9312,  76.2673),
    "Ahmedabad":          (23.0225, 72.5714),
    "Coimbatore":         (11.0168, 76.9558),
    "Jaipur":             (26.9124, 75.7873),
    "Lucknow":            (26.8467, 80.9462),
    "Trivandrum":         (8.5241,  76.9366),
    "Thiruvananthapuram": (8.5241,  76.9366),
    "Mysore":             (12.2958, 76.6394),
    "Nagpur":             (21.1458, 79.0882),
    "Chandigarh":         (30.7333, 76.7794),
    "Bhubaneswar":        (20.2961, 85.8245),
    "Indore":             (22.7196, 75.8577),
    "Vadodara":           (22.3072, 73.1812),
    "Surat":              (21.1702, 72.8311),
    "Visakhapatnam":      (17.6868, 83.2185),
    "Mangalore":          (12.9141, 74.8560),
    "Kozhikode":          (11.2588, 75.7804),
    "Calicut":            (11.2588, 75.7804),
    "Thrissur":           (10.5276, 76.2144),
    "Kannur":             (11.8745, 75.3704),
    "Palakkad":           (10.7867, 76.6548),
    "Malappuram":         (11.0510, 76.0711),
    "Kottayam":           (9.5916,  76.5222),
    "Remote":             (20.5937, 78.9629),
}

SEARCH_QUERIES = [
    # IT & Software
    {"query": "React Developer", "category": "IT & Software"},
    {"query": "Python Developer", "category": "IT & Software"},
    {"query": "Full Stack Developer", "category": "IT & Software"},
    {"query": "Data Scientist", "category": "IT & Software"},
    {"query": "DevOps Engineer", "category": "IT & Software"},
    {"query": "Java Developer", "category": "IT & Software"},
    {"query": "Node.js Developer", "category": "IT & Software"},
    {"query": "Machine Learning Engineer", "category": "IT & Software"},
    {"query": "Android Developer", "category": "IT & Software"},
    {"query": "Software Engineer", "category": "IT & Software"},
    {"query": "Flutter Developer", "category": "IT & Software"},
    {"query": "Cloud Engineer AWS", "category": "IT & Software"},
    {"query": "Cybersecurity Analyst", "category": "IT & Software"},
    {"query": "QA Engineer", "category": "IT & Software"},
    {"query": "UI UX Designer", "category": "IT & Software"},
    # Healthcare
    {"query": "Staff Nurse India", "category": "Healthcare"},
    {"query": "Doctor MBBS India", "category": "Healthcare"},
    {"query": "Pharmacist India", "category": "Healthcare"},
    {"query": "Medical Lab Technician India", "category": "Healthcare"},
    {"query": "Physiotherapist India", "category": "Healthcare"},
    {"query": "Healthcare Manager India", "category": "Healthcare"},
    # Finance
    {"query": "Finance Manager India", "category": "Finance"},
    {"query": "Chartered Accountant India", "category": "Finance"},
    {"query": "Investment Analyst India", "category": "Finance"},
    {"query": "Financial Analyst India", "category": "Finance"},
    {"query": "Bank Manager India", "category": "Finance"},
    {"query": "Audit Manager India", "category": "Finance"},
    # Engineering
    {"query": "Civil Engineer India", "category": "Engineering"},
    {"query": "Mechanical Engineer India", "category": "Engineering"},
    {"query": "Electrical Engineer India", "category": "Engineering"},
    {"query": "Chemical Engineer India", "category": "Engineering"},
    {"query": "Structural Engineer India", "category": "Engineering"},
    {"query": "Production Engineer India", "category": "Engineering"},
    {"query": "Automobile Engineer India", "category": "Engineering"},
    # Marketing
    {"query": "Digital Marketing India", "category": "Marketing"},
    {"query": "SEO Specialist India", "category": "Marketing"},
    {"query": "Content Marketing India", "category": "Marketing"},
    {"query": "Social Media Manager India", "category": "Marketing"},
    {"query": "Brand Manager India", "category": "Marketing"},
    # Sales
    {"query": "Sales Manager India", "category": "Sales"},
    {"query": "Business Development Manager India", "category": "Sales"},
    {"query": "Account Executive India", "category": "Sales"},
    {"query": "Sales Executive India", "category": "Sales"},
    # Education
    {"query": "Teacher India", "category": "Education"},
    {"query": "Professor India", "category": "Education"},
    {"query": "Online Tutor India", "category": "Education"},
    {"query": "Training Manager India", "category": "Education"},
    # City specific — major hubs
    {"query": "Software Developer Bangalore", "category": "IT & Software"},
    {"query": "Software Developer Hyderabad", "category": "IT & Software"},
    {"query": "Software Developer Mumbai", "category": "IT & Software"},
    {"query": "Software Developer Pune", "category": "IT & Software"},
    {"query": "Software Developer Chennai", "category": "IT & Software"},
    {"query": "Software Developer Delhi", "category": "IT & Software"},
    {"query": "Software Developer Noida", "category": "IT & Software"},
    # City specific — Kerala
    {"query": "Software Developer Kochi Kerala", "category": "IT & Software"},
    {"query": "IT Jobs Kozhikode Kerala", "category": "IT & Software"},
    {"query": "Software Engineer Thrissur Kerala", "category": "IT & Software"},
    {"query": "IT Jobs Kannur Kerala", "category": "IT & Software"},
    {"query": "Developer Palakkad Kerala", "category": "IT & Software"},
    {"query": "Software Engineer Malappuram Kerala", "category": "IT & Software"},
    {"query": "Python Developer Kochi", "category": "IT & Software"},
    {"query": "React Developer Kochi", "category": "IT & Software"},
    {"query": "Java Developer Kochi", "category": "IT & Software"},
    {"query": "Full Stack Developer Kochi", "category": "IT & Software"},
    {"query": "Data Scientist Bangalore", "category": "IT & Software"},
    {"query": "DevOps Hyderabad", "category": "IT & Software"},
    {"query": "Machine Learning Mumbai", "category": "IT & Software"},
]

def make_external_id(source: str, title: str, company: str) -> str:
    key = f"{source}_{title}_{company}".lower().strip()
    return hashlib.md5(key.encode()).hexdigest()

def extract_city(location: str) -> str:
    if not location:
        return ""
    loc = location.lower()
    # Check all known cities
    for city in INDIA_CITIES:
        if city.lower() in loc:
            return city
    # Common aliases
    if "bengaluru" in loc: return "Bangalore"
    if "bombay" in loc:    return "Mumbai"
    if "madras" in loc:    return "Chennai"
    if "ncr" in loc or "new delhi" in loc: return "Delhi NCR"
    if "gurugram" in loc:  return "Gurgaon"
    if "ernakulam" in loc: return "Kochi"
    if "calicut" in loc:   return "Kozhikode"
    if "trivandrum" in loc: return "Thiruvananthapuram"
    # Return empty string — let the map skip these instead of showing "India"
    return ""

def get_coords(city: str):
    """Return lat/lng for a city."""
    return CITY_COORDS.get(city, None)

def get_posted_at(posted_str: str) -> str:
    if not posted_str: return "Recently"
    try:
        dt = datetime.fromisoformat(posted_str.replace("Z", "+00:00"))
        diff = datetime.now(timezone.utc) - dt
        hours = int(diff.total_seconds() / 3600)
        if hours < 1:   return "Just now"
        if hours < 24:  return f"{hours}h ago"
        if hours < 168: return f"{hours//24}d ago"
        return f"{hours//168}w ago"
    except:
        return "Recently"

# ── SOURCE 1: Adzuna India ──────────────────────────────────────────
async def fetch_adzuna(query: str, category: str) -> list:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        return []
    results = []
    try:
        async with httpx.AsyncClient() as client:
            # Fetch 5 pages × 50 results = up to 250 jobs per query
            for page in range(1, 6):
                res = await client.get(
                    f"https://api.adzuna.com/v1/api/jobs/in/search/{page}",
                    params={
                        "app_id":           ADZUNA_APP_ID,
                        "app_key":          ADZUNA_APP_KEY,
                        "results_per_page": 50,   # max allowed by Adzuna
                        "what":             query,
                        "content-type":     "application/json",
                    },
                    timeout=15.0
                )
                if res.status_code != 200:
                    break
                jobs = res.json().get("results", [])
                if not jobs:
                    break  # no more pages
                for job in jobs:
                    location  = job.get("location", {})
                    area      = location.get("area", [])
                    city_raw  = " ".join(area) if area else ""
                    city      = extract_city(city_raw)
                    if not city:
                        # Try display_name
                        city = extract_city(location.get("display_name", ""))
                    title   = job.get("title", "")
                    company = job.get("company", {}).get("display_name", "Company")
                    min_sal = job.get("salary_min")
                    max_sal = job.get("salary_max")
                    salary  = "Not disclosed"
                    if min_sal and max_sal:
                        if min_sal > 100000:
                            salary = f"₹{int(min_sal/100000):.0f}-{int(max_sal/100000):.0f} LPA"
                        else:
                            salary = f"₹{int(min_sal):,}-₹{int(max_sal):,}"
                    coords = get_coords(city) if city else None
                    results.append({
                        "external_id": f"adzuna_{job.get('id', make_external_id('adzuna',title,company))}",
                        "title":       title,
                        "company":     company,
                        "location":    f"{city}, India" if city else "India",
                        "city":        city or "India",
                        "country":     "India",
                        "job_type":    "Full-time",
                        "salary":      salary,
                        "category":    category,
                        "description": (job.get("description") or "")[:800],
                        "source":      "Adzuna",
                        "url":         job.get("redirect_url", ""),
                        "logo":        "",
                        "posted_at":   get_posted_at(job.get("created", "")),
                        "latitude":    coords[0] if coords else None,
                        "longitude":   coords[1] if coords else None,
                        "is_active":   True,
                    })
                await asyncio.sleep(0.3)
    except Exception as e:
        print(f"    Adzuna error: {e}")
    return results

# ── SOURCE 2: Remotive ──────────────────────────────────────────────
async def fetch_remotive(query: str, category: str) -> list:
    results = []
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://remotive.com/api/remote-jobs",
                params={"search": query, "limit": 20},
                timeout=15.0
            )
            if res.status_code == 200:
                for job in res.json().get("jobs", []):
                    title   = job.get("title", "")
                    company = job.get("company_name", "")
                    coords  = CITY_COORDS.get("Remote")
                    results.append({
                        "external_id": f"remotive_{job.get('id', make_external_id('remotive',title,company))}",
                        "title":       title,
                        "company":     company,
                        "location":    "Remote - India",
                        "city":        "Remote",
                        "country":     "India",
                        "job_type":    "Remote",
                        "salary":      (job.get("salary") or "Not disclosed")[:50],
                        "category":    category,
                        "description": (job.get("description") or "")[:800],
                        "source":      "Remotive",
                        "url":         job.get("url", ""),
                        "logo":        job.get("company_logo", ""),
                        "posted_at":   get_posted_at(job.get("publication_date", "")),
                        "latitude":    coords[0] if coords else None,
                        "longitude":   coords[1] if coords else None,
                        "is_active":   True,
                    })
    except Exception as e:
        print(f"    Remotive error: {e}")
    return results

# ── SOURCE 3: Jobicy ────────────────────────────────────────────────
async def fetch_jobicy(query: str, category: str) -> list:
    results = []
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://jobicy.com/api/v2/remote-jobs",
                params={"tag": query.split()[0].lower(), "count": 15},
                timeout=15.0
            )
            if res.status_code == 200:
                for job in res.json().get("jobs", []):
                    title   = job.get("jobTitle", "")
                    company = job.get("companyName", "")
                    coords  = CITY_COORDS.get("Remote")
                    results.append({
                        "external_id": f"jobicy_{job.get('id', make_external_id('jobicy',title,company))}",
                        "title":       title,
                        "company":     company,
                        "location":    "Remote - India",
                        "city":        "Remote",
                        "country":     "India",
                        "job_type":    "Remote",
                        "salary":      str(job.get("annualSalaryMin") or "Not disclosed")[:50],
                        "category":    category,
                        "description": (job.get("jobDescription") or "")[:800],
                        "source":      "Jobicy",
                        "url":         job.get("url", ""),
                        "logo":        job.get("companyLogo", ""),
                        "posted_at":   get_posted_at(job.get("pubDate", "")),
                        "latitude":    coords[0] if coords else None,
                        "longitude":   coords[1] if coords else None,
                        "is_active":   True,
                    })
    except Exception as e:
        print(f"    Jobicy error: {e}")
    return results

# ── SOURCE 4: Technopark Kerala ─────────────────────────────────────
async def fetch_technopark() -> list:
    results = []
    urls_to_try = [
        "https://technopark.org/job-search",
        "https://technopark.org/careers",
        "https://technopark.org/job-opportunities",
    ]
    coords = CITY_COORDS.get("Thiruvananthapuram")
    try:
        async with httpx.AsyncClient() as client:
            for url in urls_to_try:
                res = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                    timeout=15.0,
                    follow_redirects=True
                )
                if res.status_code != 200:
                    continue
                soup = BeautifulSoup(res.text, "html.parser")
                job_items = (
                    soup.find_all("div", class_="job-item") or
                    soup.find_all("div", class_="career-item") or
                    soup.find_all("div", class_="views-row") or
                    soup.find_all("tr",  class_="odd") or
                    soup.find_all("tr",  class_="even") or
                    soup.find_all("article") or
                    soup.find_all("li",  class_=["job","career","vacancy"])
                )
                if not job_items:
                    links = soup.find_all("a", href=True)
                    job_links = [l for l in links if "job" in l.get("href","").lower() and l.text.strip()]
                    for i, link in enumerate(job_links[:20]):
                        title = link.text.strip()
                        if len(title) < 5: continue
                        results.append({
                            "external_id": make_external_id("technopark", title, "Technopark"),
                            "title":       title,
                            "company":     "Technopark Company",
                            "location":    "Thiruvananthapuram, India",
                            "city":        "Thiruvananthapuram",
                            "country":     "India",
                            "job_type":    "Full-time",
                            "salary":      "Not disclosed",
                            "category":    "IT & Software",
                            "description": "",
                            "source":      "Technopark Kerala",
                            "url":         f"https://technopark.org{link.get('href','')}",
                            "logo":        "",
                            "posted_at":   "Recently",
                            "latitude":    coords[0] if coords else None,
                            "longitude":   coords[1] if coords else None,
                            "is_active":   True,
                        })
                else:
                    for i, item in enumerate(job_items[:25]):
                        title_el   = item.find(["h2","h3","h4","a","strong","td"])
                        company_el = item.find(class_=["company","employer","field-company","views-field-field-company"])
                        title   = title_el.text.strip() if title_el else ""
                        company = company_el.text.strip() if company_el else "Technopark Company"
                        if len(title) < 5: continue
                        results.append({
                            "external_id": make_external_id("technopark", title, company),
                            "title":       title,
                            "company":     company,
                            "location":    "Thiruvananthapuram, India",
                            "city":        "Thiruvananthapuram",
                            "country":     "India",
                            "job_type":    "Full-time",
                            "salary":      "Not disclosed",
                            "category":    "IT & Software",
                            "description": "",
                            "source":      "Technopark Kerala",
                            "url":         url,
                            "logo":        "",
                            "posted_at":   "Recently",
                            "latitude":    coords[0] if coords else None,
                            "longitude":   coords[1] if coords else None,
                            "is_active":   True,
                        })
                if results: break
    except Exception as e:
        print(f"    Technopark error: {e}")
    return results

# ── SOURCE 5: Infopark Kerala ───────────────────────────────────────
async def fetch_infopark() -> list:
    results = []
    coords = CITY_COORDS.get("Kochi")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://infopark.in/job-search",
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                timeout=15.0,
                follow_redirects=True
            )
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                job_items = (
                    soup.find_all("div", class_="job-item") or
                    soup.find_all("div", class_="job-list") or
                    soup.find_all("tr",  class_="job") or
                    soup.find_all("div", class_="views-row")
                )
                for i, item in enumerate(job_items[:25]):
                    title_el = item.find(["h2","h3","h4","a","td"])
                    title = title_el.text.strip() if title_el else f"IT Job {i+1}"
                    if len(title) < 3: continue
                    results.append({
                        "external_id": make_external_id("infopark", title, "Infopark"),
                        "title":       title,
                        "company":     "Infopark Company",
                        "location":    "Kochi, India",
                        "city":        "Kochi",
                        "country":     "India",
                        "job_type":    "Full-time",
                        "salary":      "Not disclosed",
                        "category":    "IT & Software",
                        "description": "",
                        "source":      "Infopark Kerala",
                        "url":         "https://infopark.in/job-search",
                        "logo":        "",
                        "posted_at":   "Recently",
                        "latitude":    coords[0] if coords else None,
                        "longitude":   coords[1] if coords else None,
                        "is_active":   True,
                    })
    except Exception as e:
        print(f"    Infopark error: {e}")
    return results

# ── MAIN SCRAPER ────────────────────────────────────────────────────
async def scrape_and_save():
    print(f"\n🔄 Job scrape started at {datetime.now().strftime('%H:%M:%S')}...")
    total_saved = 0
    all_jobs    = []

    for item in SEARCH_QUERIES:
        query    = item["query"]
        category = item["category"]
        print(f"  [{category}] {query}...")

        adzuna   = await fetch_adzuna(query, category)
        remotive = await fetch_remotive(query, category)
        jobicy   = await fetch_jobicy(query, category)

        print(f"    Adzuna:{len(adzuna)} Remotive:{len(remotive)} Jobicy:{len(jobicy)}")
        all_jobs.extend(adzuna + remotive + jobicy)
        await asyncio.sleep(1)

    print("  Fetching Technopark Kerala...")
    technopark = await fetch_technopark()
    print(f"    Got {len(technopark)} jobs")
    all_jobs.extend(technopark)

    print("  Fetching Infopark Kerala...")
    infopark = await fetch_infopark()
    print(f"    Got {len(infopark)} jobs")
    all_jobs.extend(infopark)

    # Deduplicate by external_id first, then title+company
    seen_ids  = set()
    seen_keys = set()
    unique_jobs = []
    for job in all_jobs:
        eid = job.get("external_id", "")
        key = f"{job.get('title','').lower().strip()}_{job.get('company','').lower().strip()}"
        if eid in seen_ids or key in seen_keys:
            continue
        if len(job.get("title", "")) < 3:
            continue
        seen_ids.add(eid)
        seen_keys.add(key)
        unique_jobs.append(job)

    print(f"  Total unique jobs: {len(unique_jobs)} (from {len(all_jobs)} raw)")

    # Upsert to Supabase in batches of 50
    batch_size = 50
    for i in range(0, len(unique_jobs), batch_size):
        batch = unique_jobs[i:i+batch_size]
        try:
            clean_batch = [{k: v for k, v in job.items() if v is not None} for job in batch]
            supabase.table("jobs").upsert(clean_batch, on_conflict="external_id").execute()
            total_saved += len(batch)
        except Exception as e:
            # Fallback: save one by one
            for job in batch:
                try:
                    clean = {k: v for k, v in job.items() if v is not None}
                    supabase.table("jobs").upsert(clean, on_conflict="external_id").execute()
                    total_saved += 1
                except:
                    pass

    print(f"✅ Done! Saved {total_saved} unique India jobs\n")

def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scrape_and_save, "interval", minutes=15, id="job_scraper")
    scheduler.start()
    print("✅ Scheduler started — scraping every 15 minutes")
    return scheduler


# ── MANUAL TRIGGER ENDPOINT ─────────────────────────────────────────
from fastapi import APIRouter as _APIRouter
trigger_router = _APIRouter()

@trigger_router.post("/scrape/trigger")
async def trigger_scrape():
    """Manually trigger a scrape cycle — use this to force immediate update."""
    import asyncio
    asyncio.create_task(scrape_and_save())
    return {"success": True, "message": "Scrape started in background"}

@trigger_router.get("/scrape/trigger")
async def trigger_scrape_get():
    """GET version — visit in browser to trigger scrape."""
    import asyncio
    asyncio.create_task(scrape_and_save())
    return {"success": True, "message": "Scrape started — check Render logs for progress"}