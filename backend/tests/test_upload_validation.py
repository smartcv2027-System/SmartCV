import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db
from app.models.models import User, UserRole, Job, CandidateProfile, Resume, UploadedFile
from app.core.security import create_access_token
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    """Generates valid JWT tokens for test roles."""
    return {
        "recruiter_sarah": create_access_token(subject=1, role="recruiter"),
        "applicant_fahad": create_access_token(subject=2, role="applicant"),
        "admin_laila": create_access_token(subject=3, role="admin"),
    }

@pytest.fixture
def second_recruiter_token():
    """Registers or logs in a second recruiter to test ownership authorization."""
    client.post("/api/v1/auth/register", json={
        "username": "recruiter_two_upload",
        "full_name": "Second Recruiter",
        "email": "recruiter2.upload@kku.edu.sa",
        "password": "Password123!",
        "role_type": "recruiter"
    })
    token = client.post("/api/v1/auth/login-json", json={
        "username": "recruiter_two_upload",
        "password": "Password123!"
    }).json()["access_token"]
    return token

@pytest.fixture
def second_applicant_token():
    """Registers or logs in a second applicant to test resume ownership authorization."""
    client.post("/api/v1/auth/register", json={
        "username": "applicant_two_upload",
        "full_name": "Second Applicant",
        "email": "applicant2.upload@kku.edu.sa",
        "password": "Password123!",
        "role_type": "applicant"
    })
    token = client.post("/api/v1/auth/login-json", json={
        "username": "applicant_two_upload",
        "password": "Password123!"
    }).json()["access_token"]
    return token


def test_file_extension_whitelist(auth_tokens):
    """Disallowed file extensions (.exe, .png, .py) must be rejected with 400 Bad Request."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    disallowed_files = [
        ("malicious.exe", b"MZ executable binary content", "application/x-msdownload"),
        ("document.png", b"\x89PNG\r\n\x1a\nfakeimagecontent", "image/png"),
        ("script.py", b"print('hello world')", "text/x-python"),
    ]

    for fname, content, mime in disallowed_files:
        # 1. Job upload endpoint
        r1 = client.post(
            "/api/v1/jobs/upload",
            headers=sarah_headers,
            files={"file": (fname, io.BytesIO(content), mime)}
        )
        assert r1.status_code == 400, f"Expected 400 for {fname} on /jobs/upload, got {r1.status_code}"
        assert "unsupported file type" in r1.json()["detail"].lower()

        # 2. Job parse-file endpoint
        r2 = client.post(
            "/api/v1/jobs/parse-file",
            headers=sarah_headers,
            files={"file": (fname, io.BytesIO(content), mime)}
        )
        assert r2.status_code == 400, f"Expected 400 for {fname} on /jobs/parse-file, got {r2.status_code}"

        # 3. Resume upload endpoint
        r3 = client.post(
            "/api/v1/resumes/upload",
            headers=fahad_headers,
            files=[("files", (fname, io.BytesIO(content), mime))]
        )
        assert r3.status_code == 400, f"Expected 400 for {fname} on /resumes/upload, got {r3.status_code}"
        assert "unsupported file type" in r3.json()["detail"].lower()


def test_oversized_file_rejected(auth_tokens):
    """Files exceeding 5 MiB limit must be rejected with 400 Bad Request."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    oversized_bytes = b"A" * (5 * 1024 * 1024 + 1024)  # 5 MiB + 1 KB

    # 1. Job upload
    r_job = client.post(
        "/api/v1/jobs/upload",
        headers=sarah_headers,
        files={"file": ("large_job_desc.txt", io.BytesIO(oversized_bytes), "text/plain")}
    )
    assert r_job.status_code == 400
    assert "maximum allowed limit" in r_job.json()["detail"].lower()

    # 2. Resume upload
    r_res = client.post(
        "/api/v1/resumes/upload",
        headers=fahad_headers,
        files=[("files", ("large_resume.txt", io.BytesIO(oversized_bytes), "text/plain"))]
    )
    assert r_res.status_code == 400
    assert "maximum allowed limit" in r_res.json()["detail"].lower()


def test_empty_file_rejected(auth_tokens):
    """Empty files (0 bytes) must be rejected with 400 Bad Request."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    r_job = client.post(
        "/api/v1/jobs/upload",
        headers=sarah_headers,
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    )
    assert r_job.status_code == 400
    assert "empty" in r_job.json()["detail"].lower()

    r_res = client.post(
        "/api/v1/resumes/upload",
        headers=fahad_headers,
        files=[("files", ("empty_resume.txt", io.BytesIO(b""), "text/plain"))]
    )
    assert r_res.status_code == 400
    assert "empty" in r_res.json()["detail"].lower()


def test_valid_job_upload_and_duplicate_prevention(auth_tokens):
    """Valid job document is parsed, saved to disk, and duplicate upload of same file to open job is rejected."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}

    job_text = (
        "Job Title: Senior Data Engineer\n"
        "Requirements:\n"
        "- Strong expertise in Python, SQL, and Apache Spark\n"
        "- Experience with Docker and FastApi\n"
        "- Bachelor's degree in Computer Science or related field\n"
    ).encode("utf-8")

    # 1. Upload new job description file
    resp = client.post(
        "/api/v1/jobs/upload",
        headers=sarah_headers,
        data={
            "job_title": "Senior Data Engineer Unique",
            "employment_type": "Full-Time",
            "location": "Abha, Saudi Arabia"
        },
        files={"file": ("data_engineer_spec.txt", io.BytesIO(job_text), "text/plain")}
    )
    assert resp.status_code == 200, resp.text
    job_data = resp.json()
    job_id = job_data["job_id"]
    assert job_data["file_id"] is not None
    assert job_data["file_name"] == "data_engineer_spec.txt"
    assert any(s["skill_name"].lower() == "python" for s in job_data["skills"])

    # 2. Duplicate upload of identical file to an open job must return 400
    dup_resp = client.post(
        "/api/v1/jobs/upload",
        headers=sarah_headers,
        data={"job_title": "Another Posting Same File"},
        files={"file": ("data_engineer_spec.txt", io.BytesIO(job_text), "text/plain")}
    )
    assert dup_resp.status_code == 400
    assert "identical description file already exists" in dup_resp.json()["detail"].lower()

    # Clean up created test job
    client.delete(f"/api/v1/jobs/{job_id}", headers=sarah_headers)


def test_job_file_replacement_and_disk_cleanup(auth_tokens):
    """Replacing a job file removes old physical file from disk, updates database, and refreshes skills."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}

    initial_job_text = (
        "Title: Full Stack Dev\n"
        "Required skills: Python, React, JavaScript\n"
    ).encode("utf-8")

    # 1. Create job with initial file
    create_resp = client.post(
        "/api/v1/jobs/upload",
        headers=sarah_headers,
        data={"job_title": "Full Stack Dev Replacement Test"},
        files={"file": ("v1_description.txt", io.BytesIO(initial_job_text), "text/plain")}
    )
    assert create_resp.status_code == 200
    job_id = create_resp.json()["job_id"]
    old_file_id = create_resp.json()["file_id"]

    # Verify physical file was created on disk
    db = next(get_db())
    old_file_record = db.query(UploadedFile).filter(UploadedFile.file_id == old_file_id).first()
    assert old_file_record is not None
    old_path = old_file_record.storage_path
    assert os.path.exists(old_path), f"Expected old file at {old_path} to exist on disk"

    # 2. Attempt replacing with the EXACT same file -> must return 400 (identical)
    same_resp = client.put(
        f"/api/v1/jobs/{job_id}/upload",
        headers=sarah_headers,
        files={"file": ("v1_description.txt", io.BytesIO(initial_job_text), "text/plain")}
    )
    assert same_resp.status_code == 400
    assert "byte-for-byte identical" in same_resp.json()["detail"].lower()

    # 3. Replace with revised job description containing different skills
    revised_job_text = (
        "Title: Lead Cloud Architect\n"
        "Required skills: Kubernetes, Docker, Terraform, AWS\n"
    ).encode("utf-8")

    rep_resp = client.put(
        f"/api/v1/jobs/{job_id}/upload",
        headers=sarah_headers,
        data={"job_title": "Lead Cloud Architect"},
        files={"file": ("v2_cloud_architect.txt", io.BytesIO(revised_job_text), "text/plain")}
    )
    assert rep_resp.status_code == 200
    rep_data = rep_resp.json()
    assert rep_data["job_title"] == "Lead Cloud Architect"
    assert rep_data["file_name"] == "v2_cloud_architect.txt"

    # Verify old physical file was unlinked/deleted from disk
    assert not os.path.exists(old_path), f"Old file at {old_path} should have been unlinked"
    db.close()

    # Verify new physical file exists
    fresh_db = next(get_db())
    try:
        new_file_record = fresh_db.query(UploadedFile).filter(UploadedFile.file_id == rep_data["file_id"]).first()
        assert new_file_record is not None
        new_path = new_file_record.storage_path
        assert os.path.exists(new_path), f"New file at {new_path} must exist on disk"
    finally:
        fresh_db.close()

    # Verify skills refreshed
    skills = [s["skill_name"].lower() for s in rep_data["skills"]]
    assert any("docker" in s or "kubernetes" in s for s in skills)

    # Clean up job
    client.delete(f"/api/v1/jobs/{job_id}", headers=sarah_headers)
    assert not os.path.exists(new_path), f"New file at {new_path} should be cleaned up after job deletion"


def test_job_file_replacement_authorization(auth_tokens, second_recruiter_token):
    """Only the job owner or admin can replace a job's file; unauthorized recruiters get 403."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    admin_headers = {"Authorization": f"Bearer {auth_tokens['admin_laila']}"}
    rec2_headers = {"Authorization": f"Bearer {second_recruiter_token}"}

    job_text = b"Job Title: Python Developer\nRequirements: Python, SQL, REST APIs\nResponsibilities: Build microservices."
    create_resp = client.post(
        "/api/v1/jobs/upload",
        headers=sarah_headers,
        data={"job_title": "Sarah Private Job For Auth"},
        files={"file": ("sarah_job.txt", io.BytesIO(job_text), "text/plain")}
    )
    assert create_resp.status_code == 200
    job_id = create_resp.json()["job_id"]

    new_text = b"Job Title: Java Developer\nRequirements: Java, Spring Boot\nResponsibilities: Maintain enterprise backend."

    # 1. Second recruiter tries to replace file -> 403 Forbidden
    forb_resp = client.put(
        f"/api/v1/jobs/{job_id}/upload",
        headers=rec2_headers,
        files={"file": ("unauthorized_replace.txt", io.BytesIO(new_text), "text/plain")}
    )
    assert forb_resp.status_code == 403
    assert "you can only replace files for job postings that you created" in forb_resp.json()["detail"].lower()

    # 2. Admin replaces file -> 200 OK
    admin_resp = client.put(
        f"/api/v1/jobs/{job_id}/upload",
        headers=admin_headers,
        files={"file": ("admin_replace.txt", io.BytesIO(new_text), "text/plain")}
    )
    assert admin_resp.status_code == 200
    assert admin_resp.json()["file_name"] == "admin_replace.txt"

    # Clean up
    client.delete(f"/api/v1/jobs/{job_id}", headers=sarah_headers)


def test_candidate_resume_duplicate_detection(auth_tokens):
    """Candidate cannot upload the byte-for-byte identical resume twice."""
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    resume_text = (
        "Fahad Al-Qahtani\n"
        "Education: BS in Computer Science, King Khalid University\n"
        "Skills: Python, FastAPI, Docker, SQL\n"
    ).encode("utf-8")

    # 1. First upload succeeds
    r1 = client.post(
        "/api/v1/resumes/upload",
        headers=fahad_headers,
        files=[("files", ("fahad_cv.txt", io.BytesIO(resume_text), "text/plain"))]
    )
    assert r1.status_code == 200
    res_data = r1.json()
    assert len(res_data) == 1
    resume_id = res_data[0]["resume_id"]

    # 2. Second upload with identical content returns 400
    r2 = client.post(
        "/api/v1/resumes/upload",
        headers=fahad_headers,
        files=[("files", ("fahad_cv.txt", io.BytesIO(resume_text), "text/plain"))]
    )
    assert r2.status_code == 400
    assert "already uploaded this resume" in r2.json()["detail"].lower()

    # Clean up resume
    client.delete(f"/api/v1/resumes/{resume_id}", headers=fahad_headers)


def test_resume_deletion_and_disk_cleanup(auth_tokens, second_applicant_token):
    """Deleting a resume removes physical file from disk and enforces applicant ownership."""
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}
    app2_headers = {"Authorization": f"Bearer {second_applicant_token}"}

    resume_text = b"Candidate: Fahad Al-Qahtani\nEducation: KKU Computer Science\nSkills: React, TypeScript, Next.js\nExperience: Frontend Developer."

    # 1. Fahad uploads resume
    upload_resp = client.post(
        "/api/v1/resumes/upload",
        headers=fahad_headers,
        files=[("files", ("fahad_frontend.txt", io.BytesIO(resume_text), "text/plain"))]
    )
    assert upload_resp.status_code == 200
    resume_id = upload_resp.json()[0]["resume_id"]
    file_id = upload_resp.json()[0]["file_id"]

    # Verify physical file exists
    db = next(get_db())
    file_record = db.query(UploadedFile).filter(UploadedFile.file_id == file_id).first()
    assert file_record is not None
    storage_path = file_record.storage_path
    assert os.path.exists(storage_path), f"Expected resume file at {storage_path} to exist"
    db.close()

    # 2. Second applicant attempts to delete Fahad's resume -> 403 Forbidden
    forb_del = client.delete(f"/api/v1/resumes/{resume_id}", headers=app2_headers)
    assert forb_del.status_code == 403

    # 3. Fahad deletes his own resume -> 200 OK
    del_ok = client.delete(f"/api/v1/resumes/{resume_id}", headers=fahad_headers)
    assert del_ok.status_code == 200

    # Verify physical file was removed
    assert not os.path.exists(storage_path), f"Resume file at {storage_path} should have been unlinked"
