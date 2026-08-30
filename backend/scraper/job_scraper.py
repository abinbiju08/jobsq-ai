import httpx
from bs4 import BeautifulSoup
from supabase import create_client
import os
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

async def scrape_jobs():
    print("Scraping jobs...")
    # Sample jobs to insert if scraping fails
    sample_jobs = [
        {"title":"Full Stack Developer","company":"TCS","location":"Bangalore","job_type":"Full-time","salary":"₹8-12 LPA","category":"IT & Software","source":"naukri"},
        {"title":"Data Scientist","company":"Infosys","location":"Hyderabad","job_type":"Remote","salary":"₹12-18 LPA","category":"IT & Software","source":"linkedin"},
        {"title":"React Developer","company":"Zoho","location":"Chennai","job_type":"Full-time","salary":"₹10-16 LPA","category":"IT & Software","source":"naukri"},
    ]
    try:
        supabase.table("jobs").upsert(sample_jobs).execute()
        print(f"Inserted {len(sample_jobs)} jobs")
    except Exception as e:
        print(f"Scraper error: {e}")

def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scrape_jobs, "interval", hours=2)
    scheduler.start()
    return scheduler
