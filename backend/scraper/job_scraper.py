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
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")

INDIA_CITIES = [
    "Bangalore", "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Chennai",
    "Delhi", "Noida", "Gurgaon", "Gurugram", "Kolkata", "Kochi",
    "Ahmedabad", "Coimbatore", "Jaipur", "Lucknow", "Trivandrum",
    "Thiruvananthapuram", "Mysore", "Nagpur", "Chandigarh"
]

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
    # City specific - Kerala
    {"query": "Software Developer Kochi Kerala", "category": "IT & Software"},
    {"query": "IT Jobs Kozhikode Kerala", "category": "IT & Software"},
    {"query": "Software Engineer Thrissur Kerala", "category": "IT & Software"},
    {"query": "IT Jobs Kannur Kerala", "category": "IT & Software"},
    {"query": "Developer Palakkad Kerala", "category": "IT & Software"},
    {"query": "Software Engineer Malappuram Kerala", "category": "IT & Software"},
]

def make_external_id(source: str, title: str, company: str) -> str:
    """Create unique ID to prevent duplicates"""
    key = f"{source}_{title}_{company}".lower().strip()
    return hashlib.md5(key.encode()).hexdigest()

def extract_city(location: str) -> str:
    if not location: return "India"
    loc = location.lower()
    for city in INDIA_CITIES:
        if city.lower() in loc:
            return city
    if "bengaluru" in loc: return "Bangalore"
    if "bombay" in loc: return "Mumbai"
    if "madras" in loc: return "Chennai"
    if "ncr" in loc or "new delhi" in loc: return "Delhi NCR"
    if "gurugram" in loc: return "Gurgaon"
    return "India"

def get_posted_at(posted_str: str) -> str:
    if not posted_str: return "Recently"
    try:
        dt = datetime.fromisoformat(posted_str.replace("Z", "+00:00"))
        diff = datetime.now(timezone.utc) - dt
        hours = int(diff.total_seconds() / 3600)
        if hours < 1: return "Just now"
        if hours < 24: return f"{hours}h ago"
        if hours < 168: return f"{hours//24}d ago"
        return f"{hours//168}w ago"
    except:
        return "Recently"

def is_duplicate(existing_jobs: list, title: str, company: str) -> bool:
    """Check if similar job already exists"""
    title_lower = title.lower().strip()
    company_lower = company.lower().strip()
    for job in existing_jobs:
        if (job.get("title","").lower().strip() == title_lower and
            job.get("company","").lower().strip() == company_lower):
            return True
    return False

# ── SOURCE 1: Adzuna India ──
async def fetch_adzuna(query: str, category: str) -> list:
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        return []
    results = []
    try:
        async with httpx.AsyncClient() as client:
            for page in [1, 2]:
                res = await client.get(
                    f"https://api.adzuna.com/v1/api/jobs/in/search/{page}",
                    params={
                        "app_id": ADZUNA_APP_ID,
                        "app_key": ADZUNA_APP_KEY,
                        "results_per_page": 20,
                        "what": query,
                        "content-type": "application/json"
                    },
                    timeout=15.0
                )
                if res.status_code != 200:
                    break
                jobs = res.json().get("results", [])
                for job in jobs:
                    location = job.get("location", {})
                    area = location.get("area", [])
                    city_raw = area[-1] if area else "India"
                    city = extract_city(city_raw)
                    title = job.get("title", "")
                    company = job.get("company", {}).get("display_name", "Company")
                    min_sal = job.get("salary_min")
                    max_sal = job.get("salary_max")
                    salary = "Not disclosed"
                    if min_sal and max_sal:
                        if min_sal > 100000:
                            salary = f"₹{int(min_sal/100000):.0f}-{int(max_sal/100000):.0f} LPA"
                        else:
                            salary = f"₹{int(min_sal):,}-₹{int(max_sal):,}"
                    results.append({
                        "external_id": f"adzuna_{job.get('id',make_external_id('adzuna',title,company))}",
                        "title": title,
                        "company": company,
                        "location": f"{city}, India",
                        "city": city,
                        "country": "India",
                        "job_type": "Full-time",
                        "salary": salary,
                        "category": category,
                        "description": (job.get("description") or "")[:800],
                        "source": "Adzuna",
                        "url": job.get("redirect_url", ""),
                        "logo": "",
                        "posted_at": get_posted_at(job.get("created", "")),
                        "is_active": True,
                    })
                await asyncio.sleep(0.5)
    except Exception as e:
        print(f"    Adzuna error: {e}")
    return results

# ── SOURCE 2: Remotive (Remote jobs) ──
async def fetch_remotive(query: str, category: str) -> list:
    results = []
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://remotive.com/api/remote-jobs",
                params={"search": query, "limit": 15},
                timeout=15.0
            )
            if res.status_code == 200:
                for job in res.json().get("jobs", []):
                    title = job.get("title", "")
                    company = job.get("company_name", "")
                    results.append({
                        "external_id": f"remotive_{job.get('id', make_external_id('remotive',title,company))}",
                        "title": title,
                        "company": company,
                        "location": "Remote - India",
                        "city": "Remote",
                        "country": "India",
                        "job_type": "Remote",
                        "salary": (job.get("salary") or "Not disclosed")[:50],
                        "category": category,
                        "description": (job.get("description") or "")[:800],
                        "source": "Remotive",
                        "url": job.get("url", ""),
                        "logo": job.get("company_logo", ""),
                        "posted_at": get_posted_at(job.get("publication_date", "")),
                        "is_active": True,
                    })
    except Exception as e:
        print(f"    Remotive error: {e}")
    return results

# ── SOURCE 3: Jobicy ──
async def fetch_jobicy(query: str, category: str) -> list:
    results = []
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                "https://jobicy.com/api/v2/remote-jobs",
                params={"tag": query.split()[0].lower(), "count": 10},
                timeout=15.0
            )
            if res.status_code == 200:
                for job in res.json().get("jobs", []):
                    title = job.get("jobTitle", "")
                    company = job.get("companyName", "")
                    results.append({
                        "external_id": f"jobicy_{job.get('id', make_external_id('jobicy',title,company))}",
                        "title": title,
                        "company": company,
                        "location": "Remote - India",
                        "city": "Remote",
                        "country": "India",
                        "job_type": "Remote",
                        "salary": str(job.get("annualSalaryMin") or "Not disclosed")[:50],
                        "category": category,
                        "description": (job.get("jobDescription") or "")[:800],
                        "source": "Jobicy",
                        "url": job.get("url", ""),
                        "logo": job.get("companyLogo", ""),
                        "posted_at": get_posted_at(job.get("pubDate", "")),
                        "is_active": True,
                    })
    except Exception as e:
        print(f"    Jobicy error: {e}")
    return results

# ── SOURCE 4: Technopark Kerala ──
async def fetch_technopark() -> list:
    results = []
    urls_to_try = [
        "https://technopark.org/job-search",
        "https://technopark.org/careers",
        "https://technopark.org/job-opportunities",
    ]
    try:
        async with httpx.AsyncClient() as client:
            for url in urls_to_try:
                res = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
                    timeout=15.0,
                    follow_redirects=True
                )
                if res.status_code != 200:
                    continue
                soup = BeautifulSoup(res.text, "html.parser")
                # Try all possible job listing selectors
                job_items = (
                    soup.find_all("div", class_="job-item") or
                    soup.find_all("div", class_="career-item") or
                    soup.find_all("div", class_="views-row") or
                    soup.find_all("tr", class_="odd") or
                    soup.find_all("tr", class_="even") or
                    soup.find_all("article") or
                    soup.find_all("li", class_=["job", "career", "vacancy"])
                )
                if not job_items:
                    # Try finding all links that look like job postings
                    links = soup.find_all("a", href=True)
                    job_links = [l for l in links if "job" in l.get("href","").lower() and l.text.strip()]
                    for i, link in enumerate(job_links[:15]):
                        title = link.text.strip()
                        if len(title) < 5: continue
                        results.append({
                            "external_id": make_external_id("technopark", title, "Technopark"),
                            "title": title,
                            "company": "Technopark Company",
                            "location": "Thiruvananthapuram, India",
                            "city": "Thiruvananthapuram",
                            "country": "India",
                            "job_type": "Full-time",
                            "salary": "Not disclosed",
                            "category": "IT & Software",
                            "description": "",
                            "source": "Technopark Kerala",
                            "url": f"https://technopark.org{link.get('href','')}",
                            "logo": "",
                            "posted_at": "Recently",
                            "is_active": True,
                        })
                else:
                    for i, item in enumerate(job_items[:20]):
                        title_el = item.find(["h2","h3","h4","a","strong","td"])
                        company_el = item.find(class_=["company","employer","field-company","views-field-field-company"])
                        title = title_el.text.strip() if title_el else ""
                        company = company_el.text.strip() if company_el else "Technopark Company"
                        if len(title) < 5: continue
                        results.append({
                            "external_id": make_external_id("technopark", title, company),
                            "title": title,
                            "company": company,
                            "location": "Thiruvananthapuram, India",
                            "city": "Thiruvananthapuram",
                            "country": "India",
                            "job_type": "Full-time",
                            "salary": "Not disclosed",
                            "category": "IT & Software",
                            "description": "",
                            "source": "Technopark Kerala",
                            "url": url,
                            "logo": "",
                            "posted_at": "Recently",
                            "is_active": True,
                        })
                if results:
                    break
    except Exception as e:
        print(f"    Technopark error: {e}")
    return results

# ── SOURCE 5: Infopark Kerala ──
async def fetch_infopark() -> list:
    results = []
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
                    soup.find_all("tr", class_="job") or
                    soup.find_all("div", class_="views-row")
                )
                for i, item in enumerate(job_items[:20]):
                    title_el = item.find(["h2","h3","h4","a","td"])
                    title = title_el.text.strip() if title_el else f"IT Job {i+1}"
                    if len(title) < 3: continue
                    results.append({
                        "external_id": make_external_id("infopark", title, "Infopark"),
                        "title": title,
                        "company": "Infopark Company",
                        "location": "Kochi, India",
                        "city": "Kochi",
                        "country": "India",
                        "job_type": "Full-time",
                        "salary": "Not disclosed",
                        "category": "IT & Software",
                        "description": "",
                        "source": "Infopark Kerala",
                        "url": "https://infopark.in/job-search",
                        "logo": "",
                        "posted_at": "Recently",
                        "is_active": True,
                    })
    except Exception as e:
        print(f"    Infopark error: {e}")
    return results

async def scrape_and_save():
    print(f"\n🔄 Job scrape started at {datetime.now().strftime('%H:%M:%S')}...")
    total_saved = 0
    all_jobs = []

    # Fetch by category
    for item in SEARCH_QUERIES:
        query = item["query"]
        category = item["category"]
        print(f"  [{category}] {query}...")

        adzuna = await fetch_adzuna(query, category)
        remotive = await fetch_remotive(query, category)
        jobicy = await fetch_jobicy(query, category)

        print(f"    Adzuna:{len(adzuna)} Remotive:{len(remotive)} Jobicy:{len(jobicy)}")
        all_jobs.extend(adzuna + remotive + jobicy)
        await asyncio.sleep(1)

    # Fetch Kerala specific
    print("  Fetching Technopark Kerala...")
    technopark = await fetch_technopark()
    print(f"    Got {len(technopark)} jobs")
    all_jobs.extend(technopark)

    print("  Fetching Infopark Kerala...")
    infopark = await fetch_infopark()
    print(f"    Got {len(infopark)} jobs")
    all_jobs.extend(infopark)

    # Deduplicate by title+company before saving
    seen = set()
    unique_jobs = []
    for job in all_jobs:
        key = f"{job.get('title','').lower().strip()}_{job.get('company','').lower().strip()}"
        if key not in seen and len(job.get('title','')) > 2:
            seen.add(key)
            unique_jobs.append(job)

    print(f"  Total unique jobs: {len(unique_jobs)} (from {len(all_jobs)} raw)")

    # Save to Supabase
    for job in unique_jobs:
        try:
            clean = {k: v for k, v in job.items() if v is not None and v != ""}
            supabase.table("jobs").upsert(clean, on_conflict="external_id").execute()
            total_saved += 1
        except Exception as e:
            pass  # Skip duplicates silently

    print(f"✅ Done! Saved {total_saved} unique India jobs\n")

def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scrape_and_save, "interval", hours=2, id="job_scraper")
    scheduler.start()
    print("✅ Scheduler started — scraping every 2 hours")
    return scheduler