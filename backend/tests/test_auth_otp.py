import pytest
import io
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db
from app.models.models import User, EmailVerification

client = TestClient(app)

def test_registration_otp_request_and_verify_flow():
    uid = uuid.uuid4().hex[:6]
    email = f"test_{uid}@example.com"
    username = f"user_{uid}"
    
    reg_data = {
        "username": username,
        "full_name": "Test Verified User",
        "email": email,
        "password": "Password123!",
        "role_type": "applicant",
        "phone": "+966501112233"
    }

    # 1. Request OTP
    req_resp = client.post("/api/v1/auth/register/request-otp", json=reg_data)
    assert req_resp.status_code == 200, req_resp.text
    data = req_resp.json()
    assert "email_masked" in data
    assert data["expires_in_seconds"] == 600

    # 2. Duplicate email/username before verify is rejected
    dup_resp = client.post("/api/v1/auth/register/request-otp", json=reg_data)
    # Rate limited to 60s
    assert dup_resp.status_code == 429

    # 3. Retrieve generated OTP directly from test DB to verify
    db = next(get_db())
    ver_rec = db.query(EmailVerification).filter(EmailVerification.email == email).first()
    assert ver_rec is not None
    otp_code = ver_rec.otp_code
    assert len(otp_code) == 6
    db.close()

    # 4. Wrong OTP should return 400
    bad_resp = client.post("/api/v1/auth/register/verify-otp", json={
        "email": email,
        "otp_code": "000000",
        "registration_data": reg_data
    })
    assert bad_resp.status_code == 400
    assert "invalid verification code" in bad_resp.json()["detail"].lower()

    # 5. Correct OTP should succeed and return Token
    good_resp = client.post("/api/v1/auth/register/verify-otp", json={
        "email": email,
        "otp_code": otp_code,
        "registration_data": reg_data
    })
    assert good_resp.status_code == 200, good_resp.text
    token_data = good_resp.json()
    assert "access_token" in token_data
    assert token_data["user"]["username"] == username
    assert token_data["user"]["candidate_profile"] is not None

    # 6. Re-using same OTP should fail (it was deleted)
    reuse_resp = client.post("/api/v1/auth/register/verify-otp", json={
        "email": email,
        "otp_code": otp_code,
        "registration_data": reg_data
    })
    assert reuse_resp.status_code == 400

