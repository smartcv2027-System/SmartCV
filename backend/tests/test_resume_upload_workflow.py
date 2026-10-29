import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db
from app.models.models import Resume, CandidateProfile
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    return {
        "recruiter_sarah": create_access_token(subject=1, role="recruiter"),
        "applicant_fahad": create_access_token(subject=2, role="applicant"),
        "admin_laila": create_access_token(subject=3, role="admin"),
    }

@pytest.fixture
def second_applicant_token():
    client.post("/api/v1/auth/register", json={
        "username": "applicant_test_runner",
        "full_name": "Test Runner Applicant",
        "email": "runner.applicant@kku.edu.sa",
        "password": "Password123!",
        "role_type": "applicant"
    })
    token = client.post("/api/v1/auth/login-json", json={
        "username": "applicant_test_runner",
        "password": "Password123!"
    }).json()["access_token"]
    return token

SAMPLE_CV_TEXT = (
    "Reema Al-Qahtani\n"
    "Student ID: 442109999\n"
    "PROFESSIONAL SUMMARY\n"
    "Aspiring software engineer skilled in full-stack Python development and cloud systems.\n"
    "EDUCATION\n"
    "Bachelor of Science in Computer Science, King Khalid University (GPA: 4.80/5.0)\n"
    "EXPERIENCE\n"
    "Software Intern at KKU IT Center\n"
    "SKILLS\n"
    "Python, FastAPI, React, Docker, PostgreSQL, Git\n"
).encode("utf-8")

def test_parse_resume_file(auth_tokens):
    """POST /api/v1/resumes/parse-file extracts profile and skills on the fly."""
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    resp = client.post(
        "/api/v1/resumes/parse-file",
        headers=fahad_headers,
        files={"file": ("fahad_sample_cv.txt", io.BytesIO(SAMPLE_CV_TEXT), "text/plain")}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["suggested_title"] == "fahad_sample_cv.txt"
    assert data["file_id"] is not None
    assert "fastapi" in [s.lower() for s in data["detected_skills"]] or "python" in [s.lower() for s in data["detected_skills"]]
    assert data["checksum"] is not None

def test_save_parsed_resume(auth_tokens):
    """POST /api/v1/resumes/save-parsed saves the reviewed resume and updates candidate profile."""
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}

    # 1. Parse file first to get file_id and checksum
    parse_resp = client.post(
        "/api/v1/resumes/parse-file",
        headers=fahad_headers,
        files={"file": ("fahad_reviewed_cv.txt", io.BytesIO(SAMPLE_CV_TEXT), "text/plain")}
    )
    assert parse_resp.status_code == 200
    parsed_data = parse_resp.json()

    # 2. Save with user edits
    save_payload = {
        "resume_title": "Fahad Custom FullStack CV",
        "raw_text": parsed_data["extracted_text"],
        "file_id": parsed_data["file_id"],
        "file_name": parsed_data["file_name"],
        "file_size_kb": parsed_data["file_size_kb"],
        "checksum": parsed_data["checksum"],
        "skills": ["Python", "FastAPI", "React", "Docker", "Machine Learning"],
        "candidate_name": "Reema Al-Qahtani",
        "student_id": "442109999",
        "university": "King Khalid University",
        "major": "Computer Science",
        "gpa": "4.85",
        "career_level": "Entry Level",
        "profile_summary": "Custom reviewed summary for Fahad."
    }

    save_resp = client.post(
        "/api/v1/resumes/save-parsed",
        headers=fahad_headers,
        json=save_payload
    )
    assert save_resp.status_code == 200
    saved_data = save_resp.json()
    assert saved_data["resume_title"] == "Fahad Custom FullStack CV"
    assert saved_data["is_default"] is True
    skill_names = [s["skill_name"] for s in saved_data["skills"]]
    assert "Machine Learning" in skill_names
    assert "FastAPI" in skill_names

def test_save_parsed_resume_recruiter_forbidden(auth_tokens):
    """Only applicants (or admins) can save resumes via /save-parsed."""
    sarah_headers = {"Authorization": f"Bearer {auth_tokens['recruiter_sarah']}"}
    save_payload = {
        "resume_title": "Recruiter Attempt",
        "raw_text": "Sample text",
        "skills": ["Python"]
    }
    resp = client.post(
        "/api/v1/resumes/save-parsed",
        headers=sarah_headers,
        json=save_payload
    )
    assert resp.status_code == 403

def test_update_resume(auth_tokens, second_applicant_token):
    """PUT /api/v1/resumes/{resume_id} allows owner to edit title, profile fields, and skills."""
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}
    other_headers = {"Authorization": f"Bearer {second_applicant_token}"}

    # Fahad parses and saves a resume
    parse_resp = client.post(
        "/api/v1/resumes/parse-file",
        headers=fahad_headers,
        files={"file": ("fahad_for_edit.txt", io.BytesIO(SAMPLE_CV_TEXT), "text/plain")}
    )
    resume = client.post(
        "/api/v1/resumes/save-parsed",
        headers=fahad_headers,
        json={
            "resume_title": "Original Title",
            "raw_text": parse_resp.json()["extracted_text"],
            "file_id": parse_resp.json()["file_id"],
            "skills": ["Python", "SQL"]
        }
    ).json()
    resume_id = resume["resume_id"]

    # 1. Other applicant cannot update Fahad's resume
    forbidden_resp = client.put(
        f"/api/v1/resumes/{resume_id}",
        headers=other_headers,
        json={"resume_title": "Hacked Title"}
    )
    assert forbidden_resp.status_code == 403

    # 2. Fahad updates his resume
    update_resp = client.put(
        f"/api/v1/resumes/{resume_id}",
        headers=fahad_headers,
        json={
            "resume_title": "Updated Professional CV",
            "skills": ["Python", "SQL", "Kubernetes", "Redis"],
            "gpa": "4.90",
            "major": "Artificial Intelligence"
        }
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["resume_title"] == "Updated Professional CV"
    skill_names = [s["skill_name"] for s in updated_data["skills"]]
    assert "Kubernetes" in skill_names
    assert "Redis" in skill_names

def test_replace_resume_file(auth_tokens, second_applicant_token):
    """PUT /api/v1/resumes/{resume_id}/upload replaces CV document, re-extracting text & skills."""
    fahad_headers = {"Authorization": f"Bearer {auth_tokens['applicant_fahad']}"}
    other_headers = {"Authorization": f"Bearer {second_applicant_token}"}

    parse_resp = client.post(
        "/api/v1/resumes/parse-file",
        headers=fahad_headers,
        files={"file": ("fahad_initial.txt", io.BytesIO(SAMPLE_CV_TEXT), "text/plain")}
    )
    resume = client.post(
        "/api/v1/resumes/save-parsed",
        headers=fahad_headers,
        json={
            "resume_title": "Initial CV",
            "raw_text": parse_resp.json()["extracted_text"],
            "file_id": parse_resp.json()["file_id"],
            "skills": ["Python"]
        }
    ).json()
    resume_id = resume["resume_id"]

    NEW_CV_TEXT = (
        "Fahad Al-Qahtani - Cloud Engineer\n"
        "PROFESSIONAL SUMMARY\n"
        "DevOps and Cloud infrastructure specialist with deep Kubernetes expertise.\n"
        "EDUCATION\n"
        "King Khalid University, Computer Science\n"
        "SKILLS\n"
        "Kubernetes, Docker, Terraform, AWS, Linux\n"
    ).encode("utf-8")

    # 1. Other applicant cannot replace file
    forb_resp = client.put(
        f"/api/v1/resumes/{resume_id}/upload",
        headers=other_headers,
        files={"file": ("unauth.txt", io.BytesIO(NEW_CV_TEXT), "text/plain")}
    )
    assert forb_resp.status_code == 403

    # 2. Fahad replaces file
    replace_resp = client.put(
        f"/api/v1/resumes/{resume_id}/upload",
        headers=fahad_headers,
        files={"file": ("fahad_cloud_specialist.txt", io.BytesIO(NEW_CV_TEXT), "text/plain")}
    )
    assert replace_resp.status_code == 200
    rep_data = replace_resp.json()
    assert rep_data["resume_title"] == "fahad_cloud_specialist.txt"
    skill_names = [s["skill_name"].lower() for s in rep_data["skills"]]
    assert any("kubernetes" in s or "linux" in s for s in skill_names)

    # 3. Duplicate replacement rejected
    dup_resp = client.put(
        f"/api/v1/resumes/{resume_id}/upload",
        headers=fahad_headers,
        files={"file": ("fahad_cloud_specialist.txt", io.BytesIO(NEW_CV_TEXT), "text/plain")}
    )
    assert dup_resp.status_code == 400
