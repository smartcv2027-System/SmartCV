from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base
from app.api import auth, jobs, resumes, matching, admin, evaluation

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SmartCV: Explainable AI (XAI) System for Resume Screening and Job Matching (King Khalid University)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
cors_origins = settings.BACKEND_CORS_ORIGINS or ["*"]
is_wildcard = "*" in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if not is_wildcard else None,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(jobs.router, prefix=f"{settings.API_V1_STR}/jobs", tags=["Job Postings"])
app.include_router(resumes.router, prefix=f"{settings.API_V1_STR}/resumes", tags=["Resumes & NLP"])
app.include_router(matching.router, prefix=f"{settings.API_V1_STR}/matching", tags=["Matching & Explainability"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Administration & Audit"])
app.include_router(evaluation.router, prefix=f"{settings.API_V1_STR}/evaluation", tags=["ML Evaluation"])

@app.get("/")
def root():
    return {
        "system": "SmartCV API",
        "version": "1.0.0",
        "status": "online",
        "description": "Explainable AI System for Resume Screening & Job Matching",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}
