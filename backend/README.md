# SmartCV: Explainable AI (XAI) Backend API Service

**King Khalid University — College of Computer Science**  
*Graduation Project: Transparent Resume Screening & Job Matching*

SmartCV Backend API service powered by **Python 3.11**, **FastAPI**, **SQLAlchemy 2.0**, and **Sentence-BERT (`all-MiniLM-L6-v2`)**.

---

### Key API Endpoints
- **Interactive Swagger Documentation**: `/docs`
- **ReDoc API Explorer**: `/redoc`
- **Service Health Check**: `/health`
- **API Base Route**: `/api/v1`

---

### Core Environment Variables
Configure the following in your environment or hosting provider (Render / Supabase):
- `DATABASE_URL`: Supabase PostgreSQL connection string (Session/Transaction Pooler recommended)
- `SECRET_KEY`: Cryptographic signing key for JWT access tokens
- `BACKEND_CORS_ORIGINS`: Allowed frontend domains (e.g. `https://your-app.vercel.app,*`)
- `SEED_ON_STARTUP`: `true` (auto-creates tables and seeds 15 KKU candidate profiles and 6 tech jobs)
- `WORKERS`: `1` (ensures memory usage stays strictly within ~360 MB)

---

### Local Testing & Execution
```bash
# Activate virtual environment
.\.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux / macOS

# Run test suite
pytest -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
