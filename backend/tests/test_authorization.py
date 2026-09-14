import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db
from app.models.models import User, UserRole, Job, CandidateProfile, Resume, MatchResult
from app.core.security import create_access_token, get_password_hash

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    """Generates valid JWT tokens for each role from canonical personas."""
    return {
        "recruiter_sarah": create_access_token(subject=1, role="recruiter"),
        "applicant_fahad": create_access_token(subject=2, role="applicant"),
        "admin_laila": create_access_token(subject=3, role="admin"),
    }

def test_unauthenticated_access_returns_401():
    """Endpoints requiring authentication must return 401 when called without credentials."""
    unauth_endpoints = [
        ("GET", "/api/v1/auth/me"),
        ("POST", "/api/v1/matching/run"),
        ("GET", "/api/v1/matching/job/1"),
        ("GET", "/api/v1/matching/result/1"),
        ("GET", "/api/v1/resumes/"),
        ("GET", "/api/v1/admin/audit-logs"),
    ]
    for method, path in unauth_endpoints:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json={})
        assert resp.status_code == 401, f"Expected 401 for {method} {path}, got {resp.status_code}"

def test_applicant_role_restrictions(auth_tokens):
    """Applicants must be forbidden from administrative, recruiting, and batch-matching operations."""
    app_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    # 1. Applicant cannot run matching
    r1 = client.post("/api/v1/matching/run", json={"job_id": 1}, headers=app_headers)
    assert r1.status_code == 403, f"Expected 403, got {r1.status_code}"

    # 2. Applicant cannot view overall job rankings
    r2 = client.get("/api/v1/matching/job/1", headers=app_headers)
    assert r2.status_code == 403, f"Expected 403, got {r2.status_code}"

    # 3. Applicant cannot post a job
    r3 = client.post("/api/v1/jobs/", json={
        "job_title": "Unauthorized Job",
        "raw_job_text": "Sample text",
        "skills": []
    }, headers=app_headers)
    assert r3.status_code == 403, f"Expected 403, got {r3.status_code}"

    # 4. Applicant cannot access audit logs
    r4 = client.get("/api/v1/admin/audit-logs", headers=app_headers)
    assert r4.status_code == 403, f"Expected 403, got {r4.status_code}"

    # 5. Applicant cannot modify skills taxonomy
    r5 = client.post("/api/v1/admin/skills", json={
        "skill_name": "UnauthorizedSkill",
        "skill_type": "technical"
    }, headers=app_headers)
    assert r5.status_code == 403, f"Expected 403, got {r5.status_code}"

def test_applicant_cannot_view_another_candidates_match_result(auth_tokens):
    """An applicant attempting to view another applicant's match dossier must receive 403."""
    app_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}
    
    # Run matching as recruiter first so results exist
    rec_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    run_resp = client.post("/api/v1/matching/run", json={"job_id": 1}, headers=rec_headers)
    assert run_resp.status_code == 200
    results = run_resp.json()["results"]
    assert len(results) > 0

    # Find a result that does NOT belong to candidate_id 1 (Fahad's candidate_id is 1)
    other_result = None
    for r in results:
        if r["candidate_id"] != 1:
            other_result = r
            break

    if other_result:
        # Fahad attempts to access another candidate's private result
        res_resp = client.get(f"/api/v1/matching/result/{other_result['result_id']}", headers=app_headers)
        assert res_resp.status_code == 403
        assert "not authorized to view this match result" in res_resp.json()["detail"].lower()

def test_recruiter_role_restrictions(auth_tokens):
    """Recruiters cannot upload resumes, access admin audit logs, or edit the taxonomy."""
    rec_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}

    # 1. Recruiter cannot upload resumes (Enforced by Candidate Self-Submission Model)
    files = [("files", ("test.txt", b"Resume content", "text/plain"))]
    r1 = client.post("/api/v1/resumes/upload", headers=rec_headers, files=files)
    assert r1.status_code == 403
    assert "recruiters are not permitted to upload" in r1.json()["detail"].lower()

    # 2. Recruiter cannot view system-wide audit logs
    r2 = client.get("/api/v1/admin/audit-logs", headers=rec_headers)
    assert r2.status_code == 403

    # 3. Recruiter cannot add skills to taxonomy
    r3 = client.post("/api/v1/admin/skills", json={
        "skill_name": "RecruiterSkill",
        "skill_type": "technical"
    }, headers=rec_headers)
    assert r3.status_code == 403

def test_recruiter_job_deletion_ownership(auth_tokens):
    """Recruiters can only delete jobs they personally posted; attempts on other recruiters' jobs return 403."""
    # Create a secondary recruiter Nouf
    nouf_resp = client.post("/api/v1/auth/register", json={
        "username": "nouf_recruiter_auth",
        "full_name": "Nouf Al-Otaibi",
        "email": "nouf.auth@kku.edu.sa",
        "password": "Password123!",
        "role_type": "recruiter"
    })
    # If already exists, login
    if nouf_resp.status_code == 200:
        token_nouf = client.post("/api/v1/auth/login-json", json={
            "username": "nouf_recruiter_auth",
            "password": "Password123!"
        }).json()["access_token"]
    else:
        token_nouf = client.post("/api/v1/auth/login-json", json={
            "username": "nouf_recruiter_auth",
            "password": "Password123!"
        }).json()["access_token"]
    
    nouf_headers = {"Authorization": f"Bearer {token_nouf}"}
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}

    # 1. Sarah creates a job
    create_resp = client.post("/api/v1/jobs/", json={
        "job_title": "Sarah Dedicated Position",
        "raw_job_text": "Requirements: Python, FastAPI.",
        "skills": []
    }, headers=sarah_headers)
    assert create_resp.status_code == 200
    job_id = create_resp.json()["job_id"]

    # 2. Nouf attempts to delete Sarah's job -> must be rejected with 403
    del_forbidden = client.delete(f"/api/v1/jobs/{job_id}", headers=nouf_headers)
    assert del_forbidden.status_code == 403
    assert "you can only delete job postings that you created" in del_forbidden.json()["detail"].lower()

    # 3. Sarah deletes her own job -> must succeed with 200
    del_ok = client.delete(f"/api/v1/jobs/{job_id}", headers=sarah_headers)
    assert del_ok.status_code == 200
    assert "deleted successfully" in del_ok.json()["message"].lower()

def test_admin_superuser_authorization(auth_tokens):
    """Admin has full operational access across audit logs, taxonomy, and job management."""
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin_laila']}"}

    # 1. Admin can view audit logs
    r1 = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert r1.status_code == 200
    assert isinstance(r1.json(), list)

    # 2. Admin can create and delete a skill
    unique_skill = "QuantumAI_RBAC_Test"
    r2 = client.post("/api/v1/admin/skills", json={
        "skill_name": unique_skill,
        "skill_type": "technical",
        "description": "Test skill"
    }, headers=admin_headers)
    assert r2.status_code in [200, 400]
    if r2.status_code == 200:
        skill_id = r2.json()["skill_id"]
        # Delete skill
        r_del = client.delete(f"/api/v1/admin/skills/{skill_id}", headers=admin_headers)
        assert r_del.status_code == 200

    # 3. Admin can view any job rankings and any candidate results
    r3 = client.get("/api/v1/matching/job/1", headers=admin_headers)
    assert r3.status_code == 200
