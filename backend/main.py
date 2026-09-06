from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import jobs, resume, auth
from routes import resume_match
from routes import chatbot_route
from routes import resume_builder
from routes import tracker
from routes import alerts
from scraper.job_scraper import start_scheduler, scrape_and_save
from routes import interview
import uvicorn
import asyncio

app = FastAPI(title="JobsQ AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://jobsq-ai.vercel.app",
        "https://*.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router,          prefix="/jobs",    tags=["jobs"])
app.include_router(resume.router,        prefix="/resume",  tags=["resume"])
app.include_router(auth.router,          prefix="/auth",    tags=["auth"])
app.include_router(resume_match.router,  prefix="/match",   tags=["resume-match"])
app.include_router(chatbot_route.router, prefix="/ai",      tags=["chatbot"])
app.include_router(resume_builder.router,prefix="/builder", tags=["resume-builder"])
app.include_router(tracker.router,       prefix="/tracker", tags=["tracker"])
app.include_router(alerts.router,        prefix="/alerts",  tags=["alerts"])
app.include_router(interview.router,     prefix="/interview")

@app.get("/")
def root():
    return {"message": "JobsQ AI API is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("startup")
async def startup_event():
    start_scheduler()
    print("Running initial job scrape...")
    asyncio.create_task(scrape_and_save())

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)