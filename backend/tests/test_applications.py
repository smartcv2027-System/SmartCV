import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    """Generates valid JWT tokens for each role from canonical personas."""
    return {
        "recruiter_sarah": create_access_token(subject=1, role="recruiter"),
        "applicant_fahad": create_access_token(subject=2, role="applicant"),
        "admin_laila": create_access_token(subject=3, role="admin"),
    }

def test_applicant_apply_to_job_flow(auth_tokens):
    """
    Verifies that:
    1. An applicant can successfully apply to an open job.
    2. Attempting to apply again to the same job returns 400 Bad Request (Duplicate prevention).
    3. The application is listed in GET /api/v1/applications/my.
    4. The recruiter can see the applicant in GET /api/v1/applications/job/{job_id}.
    """
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}

    # Step 1: Sarah creates a new fresh job with 0 applications
    job_resp = client.post("/api/v1/jobs/", json={
        "job_title": "AI Quality Assurance Automation Specialist",
        "raw_job_text": "Requirements: Python, Pytest, Machine Learning validation, CI/CD.",
        "skills": [
            {"skill_name": "Python", "requirement_type": "required", "weight": 1.0},
            {"skill_name": "Machine Learning", "requirement_type": "required", "weight": 1.0}
        ]
    }, headers=sarah_headers)
    assert job_resp.status_code == 200, f"Expected 200, got {job_resp.status_code}: {job_resp.text}"
    job_id = job_resp.json()["job_id"]

    # Step 2: Fahad applies to this new job
    apply_resp = client.post(f"/api/v1/applications/jobs/{job_id}/apply", headers=fahad_headers)
    assert apply_resp.status_code == 201, f"Expected 201, got {apply_resp.status_code}: {apply_resp.text}"
    app_data = apply_resp.json()
    assert app_data["job_id"] == job_id
    assert app_data["status"] == "applied"
    assert "application_id" in app_data
    app_id = app_data["application_id"]

    # Step 3: Duplicate application attempt must return 400 Bad Request
    dup_resp = client.post(f"/api/v1/applications/jobs/{job_id}/apply", headers=fahad_headers)
    assert dup_resp.status_code == 400
    assert "already applied" in dup_resp.json()["detail"].lower()

    # Step 4: Candidate retrieves their own applications
    my_apps_resp = client.get("/api/v1/applications/my", headers=fahad_headers)
    assert my_apps_resp.status_code == 200
    my_apps = my_apps_resp.json()
    assert any(a["job_id"] == job_id for a in my_apps)

    # Step 5: Recruiter views applicants for this job
    job_apps_resp = client.get(f"/api/v1/applications/job/{job_id}", headers=sarah_headers)
    assert job_apps_resp.status_code == 200
    job_apps = job_apps_resp.json()
    assert len(job_apps) == 1
    assert "Fahad" in job_apps[0]["candidate_name"]

    # Step 6: Candidate withdraws their application
    withdraw_resp = client.delete(f"/api/v1/applications/{app_id}", headers=fahad_headers)
    assert withdraw_resp.status_code == 200
    assert "withdrawn successfully" in withdraw_resp.json()["message"].lower()

    # Step 7: Clean up test job
    client.delete(f"/api/v1/jobs/{job_id}", headers=sarah_headers)

def test_matching_requires_job_applications(auth_tokens):
    """
    Verifies that:
    1. Running matching on a job with 0 applications raises 400 Bad Request.
    2. Once an applicant applies, matching succeeds and processes ONLY the submitted applicants.
    """
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    # Step 1: Create a job with 0 applications
    job_resp = client.post("/api/v1/jobs/", json={
        "job_title": "Isolated Zero Applicant Test Job",
        "raw_job_text": "Requirements: Python, SQL, Cloud.",
        "skills": [
            {"skill_name": "Python", "requirement_type": "required", "weight": 1.0}
        ]
    }, headers=sarah_headers)
    assert job_resp.status_code == 200, f"Expected 200, got {job_resp.status_code}: {job_resp.text}"
    job_id = job_resp.json()["job_id"]

    # Step 2: Attempt matching before any applicant applies -> Must return 400 Bad Request
    match_fail_resp = client.post("/api/v1/matching/run", json={"job_id": job_id}, headers=sarah_headers)
    assert match_fail_resp.status_code == 400
    assert "no candidates have applied" in match_fail_resp.json()["detail"].lower()

    # Step 3: Fahad applies to this job
    apply_resp = client.post(f"/api/v1/applications/jobs/{job_id}/apply", headers=fahad_headers)
    assert apply_resp.status_code == 201

    # Step 4: Run matching now -> Must succeed and return strictly 1 candidate (Fahad)
    match_ok_resp = client.post("/api/v1/matching/run", json={"job_id": job_id}, headers=sarah_headers)
    assert match_ok_resp.status_code == 200
    match_data = match_ok_resp.json()
    assert match_data["total_candidates"] == 1, f"Expected exactly 1 applicant, got {match_data['total_candidates']}"
    assert "Fahad" in match_data["results"][0]["candidate_name"]

    # Step 5: Clean up test job
    client.delete(f"/api/v1/jobs/{job_id}", headers=sarah_headers)

def test_recruiter_cannot_apply_to_job(auth_tokens):
    """Only candidates (applicant role) can submit job applications."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    resp = client.post("/api/v1/applications/jobs/1/apply", headers=sarah_headers)
    assert resp.status_code == 403

def test_candidate_without_cv_cannot_apply():
    """An applicant who has not yet uploaded/parsed a CV cannot submit a job application."""
    uid = uuid.uuid4().hex[:6]
    # Register a new applicant without CV
    reg_resp = client.post("/api/v1/auth/register", json={
        "username": f"nocv_{uid}",
        "full_name": "No CV Applicant",
        "email": f"nocv_{uid}@kku.edu.sa",
        "password": "Password123!",
        "role_type": "applicant"
    })
    assert reg_resp.status_code == 200
    token = client.post("/api/v1/auth/login-json", json={
        "username": f"nocv_{uid}",
        "password": "Password123!"
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt apply
    resp = client.post("/api/v1/applications/jobs/1/apply", headers=headers)
    assert resp.status_code == 400
    assert "upload and parse a cv" in resp.json()["detail"].lower()
