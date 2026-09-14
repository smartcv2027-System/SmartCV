---
title: SmartCV Backend API
emoji: 📄
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# SmartCV: Explainable AI (XAI) System for Resume Screening & Job Matching

**King Khalid University — College of Computer Science**

SmartCV Backend API service powered by **FastAPI**, **SQLAlchemy 2.0**, and **Sentence-BERT (`all-MiniLM-L6-v2`)** for transparent candidate-job matching and explainable AI scoring.

### API Endpoints
- **Swagger Documentation**: `/docs`
- **ReDoc Documentation**: `/redoc`
- **Health Check**: `/health`
- **API Base**: `/api/v1`

### Environment Variables
Configure the following in your Space **Settings -> Variables and secrets**:
- `DATABASE_URL`: Supabase PostgreSQL connection string
- `SECRET_KEY`: JWT secret token
- `BACKEND_CORS_ORIGINS`: Allowed origins (e.g. `https://your-app.vercel.app,*`)
- `SEED_ON_STARTUP`: `false` (or `true` on first launch to auto-seed KKU benchmark corpus)
