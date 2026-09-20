# SmartCV: Explainable AI System for Resume Screening and Job Matching

**King Khalid University — College of Computer Science**  
*Department of Informatics and Computer Systems (Academic Year 2025–26 / 1446–1447)*  
*Project Supervised by: Dr. Areej Alshafi & Dr. Nada Alasbali*  
*Authors: Ghadi Mohammed Ali Asiri (444809895), Reema Yahya Alfaifi (444809769), Raneem Khalid Alzhrani (444808554)*

---

## 📌 Project Overview

**SmartCV** is an Explainable Artificial Intelligence (XAI) platform designed for transparent, accountable resume screening and candidate–job matching. Developed for King Khalid University's Capstone Graduation Project, SmartCV solves the "black-box" dilemma in automated hiring by providing verifiable, quote-level evidence and continuous compatibility scoring:

1. **Layer 1: TF-IDF Lexical Model** — Term frequency–inverse document frequency baseline for exact technical keyword matching.
2. **Layer 2: Sentence-BERT Semantic Model (`all-MiniLM-L6-v2`)** — Dense contextual embeddings capturing deep semantic similarity even when phrasing differs.
3. **Hybrid Compatibility Scorer** — Dynamic ensemble combining:
   $$\text{Compatibility} = w_{\text{sbert}} \cdot S_{\text{semantic}} + w_{\text{tfidf}} \cdot S_{\text{lexical}} + w_{\text{skills}} \cdot S_{\text{skills}}$$
   *(Default: $50\%$ SBERT, $20\%$ TF-IDF, $30\%$ Skills — customizable by recruiters in real time).*
4. **Explainable AI (XAI) & Structured Feedback Engine** — Verbatim resume quote citations for matched skills, identified skill gaps, and personalized curriculum recommendations for early-career students.
5. **Role-Based Access Control (RBAC)** — Strictly demarcated workflows for **Recruiters**, **Applicants**, and **System Administrators** with 14 relational database tables and immutable audit logs.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16.3.5+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn.
- **AI & NLP Engine**: `sentence-transformers` (`all-MiniLM-L6-v2`), `scikit-learn`, `nltk`, `pdfplumber`, `pypdf`, `python-docx`.
- **Database**: Multi-dialect support for **SQLite** (local zero-config), **MySQL**, and **Supabase (PostgreSQL)**.
- **Containerization**: Docker, Docker Compose, multi-stage Alpine & Python-slim builds.

---

## 🚀 Quick Start Guide

Choose the startup method that fits your environment:

### Option 1: One-Click Local Startup (Recommended — No Docker Required)

| Terminal / Environment | Command |
|---|---|
| **Git Bash (MINGW64)** | `./start-local.sh` or `./start-local.bat` |
| **Command Prompt (CMD)** | `start-local.bat` *(or double-click `start-local.bat` in File Explorer)* |
| **PowerShell** | `.\start-local.ps1` |

**What this does automatically:**
1. Starts the FastAPI backend at **`http://127.0.0.1:8000`** with live-reload.
2. Starts the Next.js frontend at **`http://localhost:3000`**.
3. Automatically launches your default web browser to the SmartCV portal.

---

### Option 2: Docker & Docker Compose (Containerized Deployment)

> [!NOTE]
> **Prerequisite**: Requires [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) (or Docker on Linux/macOS) installed and running. If your terminal returns `bash: docker: command not found`, use **Option 1** above or install Docker Desktop.

To build and run both frontend and backend in isolated containers:
```bash
docker compose up --build
```
- **Web Application**: http://localhost:3000
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Backend Healthcheck**: http://localhost:8000/health

*(To run with an isolated PostgreSQL database container instead of SQLite: `docker compose --profile with-postgres up --build`)*

---

### Option 3: Manual Step-by-Step Setup

#### 1. Backend Setup & Startup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows (CMD / PowerShell):
.\.venv\Scripts\activate
# On Git Bash / Linux / macOS:
source .venv/Scripts/activate  # or source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed demonstration data (15 candidates, 6 enterprise jobs, 90 AI matches)
python -m app.seed --force

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation will be available at: **http://127.0.0.1:8000/docs**

#### 2. Frontend Setup & Startup
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
Open **http://localhost:3000** in your browser.

---

## 👥 Demo Personas & Credentials

| Persona | Name | Role | Username | Password | Features to Explore |
|---|---|---|---|---|---|
| **Recruiter** | Sarah Al-Ghamdi | `recruiter` | `sarah_recruiter` | `password123` | View 6 tech jobs, review ranked applicants, tune AI weights, export dossiers, create jobs |
| **Applicant** | Fahad Al-Qahtani | `applicant` | `fahad_applicant` | `password123` | View resume overview, inspect extracted skills with evidence quotes, view feedback |
| **Administrator** | Laila Al-Asmari | `admin` | `laila_admin` | `admin123` | Evaluation dashboard, 1-click LaTeX thesis table export, CSV dataset download, audit logs |

> **Note**: Users can sign in using either their **Username** or **Email Address**. The navigation bar also features a **Demo Role Switcher** dropdown for instantaneous switching between personas without signing out.

---

## 📊 Pre-Seeded Demonstration Corpus

The database comes pre-populated with realistic, graduation-project-grade demonstration data modeled after the Saudi and regional technology sectors:

- **15 Authentic Candidate Profiles**:
  - 13 Computer Science, Information Systems, AI, Cybersecurity, and Software Engineering graduates across King Khalid University (KKU), King Saud University (KSU), and KFUPM.
  - 2 Negative Control Profiles (Civil Engineering & Accounting/Auditing) demonstrating model discrimination against out-of-domain applicants.
- **6 Enterprise Tech Job Postings**:
  1. *Junior AI & Machine Learning Engineer* (Riyadh, Hybrid)
  2. *Junior Front-End Web Developer* (Next.js & React, Abha / Remote)
  3. *Cloud & DevOps Infrastructure Engineer* (AWS, Docker, K8s, Riyadh)
  4. *Cybersecurity SOC Analyst & Defense Specialist* (SIEM, Abha / Hybrid)
  5. *Data Engineer & Business Intelligence Specialist* (SQL, Power BI, Jeddah)
  6. *Full-Stack Software Engineer* (FastAPI, React, PostgreSQL, Riyadh)
- **90 Pre-Calculated AI Matches**: Full $15 \times 6$ candidate–job matrix pre-computed with Sentence-BERT, TF-IDF, verbatim evidence quotes, and XAI summaries.
- **Physical Resume Files**: Stored in `backend/uploads/` so downloading or viewing resumes in the browser always succeeds without 404s.

---

## 🗄️ Database Configuration (Multi-Dialect)

SmartCV supports SQLite, MySQL, and PostgreSQL (including Supabase). Copy `backend/.env.example` to `backend/.env`:

* **SQLite (Default Zero-Config)**:
  ```env
  DATABASE_URL="sqlite:///./smartcv.db"
  ```
* **Supabase / PostgreSQL Cloud**:
  ```env
  DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"
  SUPABASE_URL="https://[ref].supabase.co"
  SUPABASE_KEY="eyJhbGci..."
  ```
* **MySQL (Local / AWS RDS)**:
  ```env
  DATABASE_URL="mysql+pymysql://root:password@localhost:3306/smartcv?charset=utf8mb4"
  ```

---

## 🧪 Testing & Academic Evaluation

### Automated Regression Suite
Run the 45 backend unit, integration, and AI evaluation tests:
```bash
cd backend
.\.venv\Scripts\pytest -v
```
All **45/45 tests pass (100%)** covering:
- Authentication & JWT token validation
- Role-based authorization & permission enforcement (RBAC)
- Upload validation (whitelists, file replacement, duplicate detection)
- Structural ATS verification (CV and job description section validation)
- AI matching, Sentence-BERT strict mode, XAI explainability, and LaTeX generator

### Thesis Evaluation Dashboard
Visit **http://localhost:3000/admin/evaluation** (logged in as `laila_admin`) to inspect:
- **Continuous Compatibility Distributions**: Empirical analysis comparing TF-IDF, Sentence-BERT, and the Hybrid model across a standardized 36-pair KKU benchmark corpus.
- **Discrimination Margins ($\Delta$)**: Verification of the hybrid model's ability to clearly separate qualified candidates from negative controls ($\Delta > 45\%$).
- **LaTeX Thesis Exporter**: 1-click generation of publication-ready LaTeX tables (`tab:smartcv_evaluation`) directly formatted for Chapter 7 of the graduation thesis.
- **Benchmark CSV Dataset**: Downloadable ground-truth corpus with all lexical, semantic, and hybrid compatibility scores.

---

## ☁️ Cloud Deployment & Automated CI/CD (100% Free Tier)

SmartCV is production-ready for zero-cost cloud hosting ($0.00 / month forever) with automated CI/CD:

| Operational Tier | Platform | Free Resources | Role |
|---|---|---|---|
| **Frontend Web App** | **Vercel** | 100 GB Bandwidth, Global Edge CDN | Next.js 16.3.5 App Router |
| **AI & Backend Service** | **Render.com** | 750 Instance Hours/Mo, 512 MB RAM | FastAPI + Sentence-BERT Engine |
| **Cloud Relational DB** | **Supabase** | 500 MB PostgreSQL, Session Pooler | 15 Relational Tables & Audit Logs |
| **Automated CI/CD** | **GitHub Actions** | Native Git-driven Continuous Delivery | Runs 45 tests & deploys on `git push` |

* **1-Click Backend Deployment**: Connect your GitHub repository to [Render.com](https://render.com) using the included [`render.yaml`](file:///d:/workspace/2026_2027/FirstSemester/KKU/SmartCV/SmartCV/render.yaml) Blueprint.
* **1-Click Frontend Deployment**: Import the `frontend` folder into [Vercel](https://vercel.com) and set `NEXT_PUBLIC_API_URL=https://<your-backend>.onrender.com/api/v1`.
* **Zero Out-of-Memory Risk**: PyTorch is pre-configured with the CPU-only wheel and single-worker concurrency, consuming ~360 MB RAM (comfortably below Render's 512 MB free tier limit).

