import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

def test_root_and_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"
    
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"

def test_login_and_token():
    # 1. Login with username as Sarah (Recruiter)
    resp = client.post("/api/v1/auth/login-json", json={
        "username": "sarah_recruiter",
        "password": "password123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["username"] == "sarah_recruiter"
    assert data["user"]["role_type"] == "recruiter"

    # 2. Login with email fallback for backward compatibility
    resp_fallback = client.post("/api/v1/auth/login-json", json={
        "username": "sarah.recruiter@tech.sa",
        "password": "password123"
    })
    assert resp_fallback.status_code == 200
    assert resp_fallback.json()["user"]["username"] == "sarah_recruiter"

def test_jobs_api():
    resp = client.get("/api/v1/jobs/")
    assert resp.status_code == 200
    jobs = resp.json()
    assert len(jobs) > 0
    assert "job_title" in jobs[0]
    assert len(jobs[0]["skills"]) > 0

def test_matching_and_ranking():
    # Fetch job list
    jobs_resp = client.get("/api/v1/jobs/")
    job_id = jobs_resp.json()[0]["job_id"]
    
    # Authenticate as Sarah (Recruiter)
    token = create_access_token(subject=1, role="recruiter")
    headers = {"Authorization": f"Bearer {token}"}

    # Trigger matching run for this job
    run_resp = client.post("/api/v1/matching/run", json={"job_id": job_id}, headers=headers)
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["total_candidates"] > 0
    assert len(run_data["results"]) > 0

    # Get ranking for this job
    rank_resp = client.get(f"/api/v1/matching/job/{job_id}", headers=headers)
    assert rank_resp.status_code == 200
    rank_data = rank_resp.json()
    assert rank_data["total_candidates"] > 0
    assert len(rank_data["results"]) > 0
    
    top_candidate = rank_data["results"][0]
    assert top_candidate["compatibility_score"] > 0
    assert "matched_skills" in top_candidate
    assert "missing_skills" in top_candidate
    assert top_candidate["explanation"] is not None

def test_evaluation_report():
    # Generate token for Laila (Admin)
    token = create_access_token(subject=3, role="admin")
    headers = {"Authorization": f"Bearer {token}"}
    
    resp = client.get("/api/v1/evaluation/report", headers=headers)
    assert resp.status_code == 200
    report = resp.json()
    assert "metrics" in report
    assert len(report["metrics"]) == 3
    assert report["total_samples"] == 36
    assert "latex_table" in report
    assert r"\begin{table}" in report["latex_table"]

    # Test GET /api/v1/evaluation/latex
    latex_resp = client.get("/api/v1/evaluation/latex", headers=headers)
    assert latex_resp.status_code == 200
    latex_data = latex_resp.json()
    assert "latex_code" in latex_data
    assert "tab:smartcv_evaluation" in latex_data["latex_code"]
    assert latex_data["total_samples"] == 36

def test_matching_with_custom_weights():
    # Fetch job list
    jobs_resp = client.get("/api/v1/jobs/")
    job_id = jobs_resp.json()[0]["job_id"]
    
    token = create_access_token(subject=1, role="recruiter")
    headers = {"Authorization": f"Bearer {token}"}

    # Run matching with custom recruiter weights: 70% SBERT, 10% TFIDF, 20% Skills
    run_resp = client.post("/api/v1/matching/run", json={
        "job_id": job_id,
        "weight_sbert": 0.70,
        "weight_tfidf": 0.10,
        "weight_skills": 0.20
    }, headers=headers)
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert "weights_used" in run_data
    assert run_data["weights_used"]["sbert"] == 0.7
    assert run_data["weights_used"]["tfidf"] == 0.1
    assert run_data["weights_used"]["skills"] == 0.2
    assert run_data["total_candidates"] > 0

def test_end_to_end_personas():
    # 1. Test Recruiter Persona: Sarah Al-Ghamdi with username
    resp_sarah = client.post("/api/v1/auth/login-json", json={
        "username": "sarah_recruiter",
        "password": "password123"
    })
    assert resp_sarah.status_code == 200
    token_sarah = resp_sarah.json()["access_token"]
    assert resp_sarah.json()["user"]["role_type"] == "recruiter"
    assert resp_sarah.json()["user"]["username"] == "sarah_recruiter"

    # Sarah views jobs
    jobs = client.get("/api/v1/jobs/", headers={"Authorization": f"Bearer {token_sarah}"}).json()
    assert len(jobs) > 0

    # 2. Test Applicant Persona: Fahad Al-Qahtani with username
    resp_fahad = client.post("/api/v1/auth/login-json", json={
        "username": "fahad_applicant",
        "password": "password123"
    })
    assert resp_fahad.status_code == 200
    assert resp_fahad.json()["user"]["role_type"] == "applicant"
    assert resp_fahad.json()["user"]["username"] == "fahad_applicant"

    # 3. Test Admin Persona: Laila Al-Asmari with username
    resp_laila = client.post("/api/v1/auth/login-json", json={
        "username": "laila_admin",
        "password": "admin123"
    })
    assert resp_laila.status_code == 200
    token_laila = resp_laila.json()["access_token"]
    assert resp_laila.json()["user"]["role_type"] == "admin"
    assert resp_laila.json()["user"]["username"] == "laila_admin"

    # Laila checks audit logs
    audit_resp = client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {token_laila}"})
    assert audit_resp.status_code == 200
    assert len(audit_resp.json()) > 0

def test_user_registration_and_validation():
    # 1. Successful new applicant self-registration
    new_username = "reem_engineer"
    new_email = "reem.engineer@kku.edu.sa"
    reg_resp = client.post("/api/v1/auth/register", json={
        "username": new_username,
        "full_name": "Reem Al-Qahtani",
        "email": new_email,
        "password": "StrongPassword123!",
        "role_type": "applicant",
        "phone": "+966 59 123 9999"
    })
    # If user already registered in previous run, check either 200 or 400
    assert reg_resp.status_code in [200, 400]
    if reg_resp.status_code == 200:
        reg_data = reg_resp.json()
        assert reg_data["username"] == new_username
        assert reg_data["role_type"] == "applicant"

    # 2. Login with newly registered username
    login_resp = client.post("/api/v1/auth/login-json", json={
        "username": new_username,
        "password": "StrongPassword123!"
    })
    assert login_resp.status_code == 200
    assert login_resp.json()["user"]["username"] == new_username

    # 3. Reject duplicate username (case-insensitive)
    dup_user = client.post("/api/v1/auth/register", json={
        "username": "REEM_ENGINEER",
        "full_name": "Reem Duplicate",
        "email": "unique_email_123@kku.edu.sa",
        "password": "password123",
        "role_type": "applicant"
    })
    assert dup_user.status_code == 400
    assert "username already exists" in dup_user.json()["detail"].lower()

    # 4. Reject duplicate email (case-insensitive)
    dup_email = client.post("/api/v1/auth/register", json={
        "username": "unique_user_999",
        "full_name": "Unique Person",
        "email": new_email.upper(),
        "password": "password123",
        "role_type": "applicant"
    })
    assert dup_email.status_code == 400
    assert "email already exists" in dup_email.json()["detail"].lower()

    # 5. Reject self-registration for 'admin' role
    admin_reg = client.post("/api/v1/auth/register", json={
        "username": "fake_admin",
        "full_name": "Fake Administrator",
        "email": "fake.admin@kku.edu.sa",
        "password": "password123",
        "role_type": "admin"
    })
    assert admin_reg.status_code == 400
    assert "admin role cannot be self-registered" in admin_reg.json()["detail"].lower()

    # 6. Reject invalid username format (e.g. spaces or special chars)
    invalid_user = client.post("/api/v1/auth/register", json={
        "username": "bad user@name!",
        "full_name": "Invalid Username",
        "email": "invalid.format@kku.edu.sa",
        "password": "password123",
        "role_type": "applicant"
    })
    assert invalid_user.status_code == 422

def test_recruiter_forbidden_from_uploading_resumes():
    # 1. Login as Sarah (Recruiter)
    resp = client.post("/api/v1/auth/login-json", json={
        "username": "sarah_recruiter",
        "password": "password123"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    # 2. Attempt to upload a resume as recruiter -> must be forbidden (HTTP 403)
    files = [
        ("files", ("test_resume.txt", b"Candidate Resume content with Python skills", "text/plain"))
    ]
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert upload_resp.status_code == 403
    assert "recruiters are not permitted to upload" in upload_resp.json()["detail"].lower()

def test_applicant_allowed_to_upload_resumes():
    # 1. Login as Fahad (Applicant)
    resp = client.post("/api/v1/auth/login-json", json={
        "username": "fahad_applicant",
        "password": "password123"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Applicant can upload resumes
    unique_content = (
        f"Fahad Al-Harbi\n"
        f"Email: fahad.applicant.test@example.com | Phone: +966501234567\n"
        f"EDUCATION: Bachelor of Science in Computer Science, King Khalid University, 2025\n"
        f"CORE SKILLS: Python, Docker, SQL, FastAPI, PostgreSQL, Git, Machine Learning\n"
        f"EXPERIENCE & PROJECTS: Backend Developer Intern. Developed RESTful APIs and microservices. Test ID {uuid.uuid4()}"
    ).encode("utf-8")
    files = [
        ("files", ("fahad_cv.txt", unique_content, "text/plain"))
    ]
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        headers=headers,
        files=files
    )
    assert upload_resp.status_code == 200
    assert len(upload_resp.json()) > 0
    assert upload_resp.json()[0]["parsed_status"].lower() == "parsed"
    
    # Clean up uploaded test resume
    resume_id = upload_resp.json()[0]["resume_id"]
    client.delete(f"/api/v1/resumes/{resume_id}", headers=headers)

def test_recruiter_parse_job_file():
    # 1. Login as Sarah (Recruiter)
    resp = client.post("/api/v1/auth/login-json", json={
        "username": "sarah_recruiter",
        "password": "password123"
    })
    token = resp.json()["access_token"]

    # 2. Parse job document on-the-fly
    file_content = b"Senior Data Scientist Position\n\nWe need a talented data scientist with strong Python, Machine Learning, and SQL skills."
    parse_resp = client.post(
        "/api/v1/jobs/parse-file",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("job_description.txt", file_content, "text/plain")}
    )
    assert parse_resp.status_code == 200
    data = parse_resp.json()
    assert "Senior Data Scientist" in data["suggested_title"] or len(data["suggested_title"]) > 0
    assert "extracted_text" in data
    assert "Python" in data["detected_skills"]

def test_recruiter_create_job_via_file_upload():
    # 1. Login as Sarah (Recruiter)
    resp = client.post("/api/v1/auth/login-json", json={
        "username": "sarah_recruiter",
        "password": "password123"
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create job posting by uploading a file with unique content
    file_content = f"Cloud DevOps Engineer\n\nMust have hands-on experience with Docker, Kubernetes, and AWS. Ref: {uuid.uuid4()}".encode("utf-8")
    create_resp = client.post(
        "/api/v1/jobs/upload",
        headers=headers,
        files={"file": ("devops_job.txt", file_content, "text/plain")},
        data={
            "job_title": "Cloud DevOps Engineer",
            "required_education": "Bachelor in CS",
            "required_experience": "3+ years",
            "employment_type": "Full-Time",
            "location": "Abha, Saudi Arabia"
        }
    )
    assert create_resp.status_code == 200
    job_data = create_resp.json()
    assert job_data["job_title"] == "Cloud DevOps Engineer"
    assert "Docker" in [s["skill_name"] for s in job_data["skills"]]

    # Clean up uploaded test job
    job_id = job_data["job_id"]
    client.delete(f"/api/v1/jobs/{job_id}", headers=headers)

def test_evaluation_endpoints():
    token = create_access_token(subject=1, role="recruiter")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test /evaluation/report
    report_resp = client.get("/api/v1/evaluation/report", headers=headers)
    assert report_resp.status_code == 200
    report = report_resp.json()
    assert report["total_samples"] == 36
    assert len(report["metrics"]) == 3
    assert report["metrics"][2]["discrimination_margin"] > 50.0

    # 2. Test /evaluation/latex
    latex_resp = client.get("/api/v1/evaluation/latex", headers=headers)
    assert latex_resp.status_code == 200
    latex_data = latex_resp.json()
    assert "latex_code" in latex_data
    assert "tab:smartcv_evaluation" in latex_data["latex_code"]

    # 3. Test /evaluation/thesis-chapter
    chapter_resp = client.get("/api/v1/evaluation/thesis-chapter", headers=headers)
    assert chapter_resp.status_code == 200
    chapter_data = chapter_resp.json()
    assert "Chapter 7: PROJECT TESTING (EVALUATION)" in chapter_data["chapter_title"]
    assert "7.1 Metrics" in chapter_data["text"]
    assert "7.4 Results" in chapter_data["text"]



    # 4. Test /evaluation/csv download
    csv_resp = client.get("/api/v1/evaluation/csv", headers=headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    assert "kku_smartcv_benchmark_36.csv" in csv_resp.headers["content-disposition"]
    assert "sample_id,track,ground_truth_label" in csv_resp.text






