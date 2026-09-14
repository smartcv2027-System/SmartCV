import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.taxonomy import extract_skills_from_text
from app.ai.parser import parse_document
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    return {
        "recruiter": create_access_token(subject=1, role="recruiter"),
        "applicant_1": create_access_token(subject=2, role="applicant"),
        "admin": create_access_token(subject=3, role="admin"),
    }

def test_dynamic_taxonomy_and_symbol_safety():
    """Verify that both canonical symbol-safe skills and custom DB skills are extracted."""
    text = "Proficient in C++, .NET, CI/CD Pipelines, and modern GraphQL APIs."
    custom = [
        {"name": "GraphQL", "type": "technical", "desc": "GraphQL Query Language"}
    ]
    skills = extract_skills_from_text(text, custom_taxonomy=custom)
    skill_names = {s["skill_name"] for s in skills}

    assert "C++" in skill_names
    assert ".NET" in skill_names
    assert "CI/CD Pipelines" in skill_names
    assert "GraphQL" in skill_names

    # Ensure evidence sentences are captured
    for s in skills:
        assert s["evidence_text"] is not None

def test_layout_aware_parser_txt_fallback():
    """Verify document parser extracts clean plain text from bytes."""
    content = b"Candidate Name: John Doe\nEducation: King Khalid University\nSkills: Python, Docker, SQL"
    parsed_text, file_type, file_size_kb, checksum = parse_document("resume.txt", content)
    assert "Candidate Name: John Doe" in parsed_text
    assert "King Khalid University" in parsed_text
    assert file_type == "txt"
    assert file_size_kb >= 0
    assert len(checksum) == 64

def test_resume_download_endpoint_authorization(auth_tokens):
    """Test resume file download endpoint RBAC and error handling."""
    recruiter_headers = {"Authorization": f"Bearer {auth_tokens['recruiter']}"}
    applicant_headers = {"Authorization": f"Bearer {auth_tokens['applicant_1']}"}

    # 1. Non-existent resume should return 404
    resp_404 = client.get("/api/v1/resumes/99999/download", headers=recruiter_headers)
    assert resp_404.status_code == 404
    assert "Resume not found" in resp_404.json()["detail"]

    # 2. Unauthorized request without token
    resp_unauth = client.get("/api/v1/resumes/1/download")
    assert resp_unauth.status_code == 401

    # 3. Recruiter downloads existing Resume #1
    resp_recruiter = client.get("/api/v1/resumes/1/download", headers=recruiter_headers)
    assert resp_recruiter.status_code == 200
    assert len(resp_recruiter.content) > 0
    assert "attachment" in resp_recruiter.headers.get("content-disposition", "") or "Fahad_AlQahtani" in resp_recruiter.headers.get("content-disposition", "")

    # 4. Applicant #1 downloads own Resume #1
    resp_app1 = client.get("/api/v1/resumes/1/download", headers=applicant_headers)
    assert resp_app1.status_code == 200
    assert len(resp_app1.content) > 0

def test_cv_structural_verification_valid_and_invalid():
    """Test ATS structure validator for CVs."""
    from app.ai.validator import verify_cv_structure

    # 1. Valid structured CV
    valid_cv = (
        "Khaled Al-Garni\n"
        "Email: khaled.garni@kku.edu.sa | Phone: +966 50 111 9988\n"
        "EDUCATION:\n"
        "Bachelor of Science in Civil Engineering, King Khalid University.\n"
        "PROFESSIONAL SKILLS:\n"
        "AutoCAD, Structural Analysis, Concrete Testing, Site Supervision.\n"
        "EXPERIENCE & PROJECTS:\n"
        "Supervised structural drafting and concrete compressive strength testing.\n"
    )
    is_valid, score, missing_sections, metadata = verify_cv_structure(valid_cv)
    assert is_valid is True
    assert score >= 70
    assert len(missing_sections) == 0

    # 2. Too short document (< 10 words)
    short_doc = "Shopping list: milk, bread, butter, eggs, cheese, apples."
    is_valid_short, score_short, missing_short, _ = verify_cv_structure(short_doc)
    assert is_valid_short is False
    assert any("minimum 10 words" in s for s in missing_short)

    # 3. Long document without CV sections (> 10 words)
    random_doc = (
        "This is an informal memo regarding the upcoming department quarterly financial review meeting. "
        "All team members should please prepare their monthly slide decks and bring notes regarding budget items. "
        "Please note that the cafeteria will be closed during lunch hours tomorrow for kitchen sanitization. "
        "Kindly reach out to office administration if you need parking passes or security access cards."
    )
    is_valid_bad, score_bad, missing_bad, _ = verify_cv_structure(random_doc)
    assert is_valid_bad is False
    assert score_bad < 40
    assert any("Education" in s for s in missing_bad)
    assert any("Skills" in s for s in missing_bad)
    assert any("Experience" in s for s in missing_bad)

def test_job_structural_verification_valid_and_invalid():
    """Test ATS structure validator for Job Descriptions."""
    from app.ai.validator import verify_job_structure

    # 1. Valid Job Description
    valid_job = (
        "Senior Civil Engineer Position Overview\n"
        "We are hiring a Senior Civil Engineer for infrastructure projects in Asir.\n"
        "Key Responsibilities:\n"
        "- Manage site operations and structural inspections.\n"
        "- Coordinate with contractors and ensure concrete quality standards.\n"
        "Requirements & Qualifications:\n"
        "- Bachelor's degree in Civil Engineering.\n"
        "- 3+ years experience with AutoCAD and structural drafting.\n"
    )
    is_valid, score, missing_sections, metadata = verify_job_structure(valid_job)
    assert is_valid is True
    assert score >= 70
    assert len(missing_sections) == 0

    # 2. Too short text (< 8 words)
    short_job = "Quick note: Meeting tomorrow."
    is_valid_short, score_short, missing_short, _ = verify_job_structure(short_job)
    assert is_valid_short is False
    assert any("minimum 8 words" in s for s in missing_short)

    # 3. Long text missing job structure (> 30 words)
    random_text = (
        "The quick brown fox jumps over the lazy dog repeatedly across the green meadow under the sunny sky. "
        "A second fox joins the group while wandering through the northern forest looking for berries and nuts. "
        "No further activities were recorded during this peaceful afternoon observation period."
    )
    is_valid_bad, score_bad, missing_bad, _ = verify_job_structure(random_text)
    assert is_valid_bad is False
    assert any("Responsibilities" in s for s in missing_bad)
    assert any("Requirements" in s for s in missing_bad)

def test_khaled_civil_engineering_extraction():
    """Verify Khaled Al-Garni's CV extracts domain-specific Civil Engineering skills."""
    with open("uploads/Khaled_AlGarni_CivilEng_CV.txt", "r", encoding="utf-8") as f:
        cv_text = f.read()

    extracted = extract_skills_from_text(cv_text)
    skill_names = {s["skill_name"] for s in extracted}

    assert "AutoCAD" in skill_names
    assert "Structural Analysis" in skill_names
    assert "Civil Engineering" in skill_names
    assert "Concrete Testing" in skill_names
    assert "Site Supervision" in skill_names
    assert len(skill_names) >= 8

def test_reparse_endpoints_and_rbac(auth_tokens):
    """Test POST /api/v1/resumes/{id}/reparse and POST /api/v1/resumes/reparse-all."""
    recruiter_headers = {"Authorization": f"Bearer {auth_tokens['recruiter']}"}
    applicant_headers = {"Authorization": f"Bearer {auth_tokens['applicant_1']}"}

    # 1. Applicant cannot reparse all resumes (403)
    resp_reparse_all_forbidden = client.post("/api/v1/resumes/reparse-all", headers=applicant_headers)
    assert resp_reparse_all_forbidden.status_code == 403

    # 2. Recruiter can reparse single resume #14 (Khaled)
    resp_single = client.post("/api/v1/resumes/14/reparse", headers=recruiter_headers)
    assert resp_single.status_code == 200
    data = resp_single.json()
    extracted_names = {s["skill_name"] for s in data["skills"]}
    assert "AutoCAD" in extracted_names
    assert "Structural Analysis" in extracted_names

    # 3. Recruiter re-parses all resumes
    resp_all = client.post("/api/v1/resumes/reparse-all", headers=recruiter_headers)
    assert resp_all.status_code == 200
    all_data = resp_all.json()
    assert all_data["updated_count"] >= 14

