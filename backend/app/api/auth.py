from datetime import datetime, timedelta
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.models import User, UserRole, CandidateProfile, AuditLog, EmailVerification
from app.schemas.schemas import UserCreate, UserRegister, UserResponse, Token, UserLogin, RequestOTPResponse, VerifyOTPRequest
from app.core.email import send_otp_email
from app.api.deps import get_current_user

router = APIRouter()

def _mask_email(email: str) -> str:
    """Masks an email for secure presentation, e.g. s***7@gmail.com."""
    try:
        parts = email.split("@")
        if len(parts) != 2:
            return email
        user_part, domain_part = parts
        if len(user_part) <= 2:
            masked_user = user_part[0] + "***"
        else:
            masked_user = user_part[0] + "***" + user_part[-1]
        return f"{masked_user}@{domain_part}"
    except Exception:
        return email


@router.post("/register/request-otp", response_model=RequestOTPResponse)
def request_registration_otp(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Validates proposed registration data, generates a 6-digit OTP code,
    and sends it via Gmail SMTP to the specified email address.
    """
    username_clean = user_in.username.strip().lower()
    email_clean = user_in.email.strip().lower()

    if user_in.role_type.lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin role cannot be self-registered."
        )

    # Check username uniqueness
    existing_username = db.query(User).filter(func.lower(User.username) == username_clean).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists."
        )

    # Check email uniqueness
    existing_email = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Rate limiting: check for existing active OTP within last 60 seconds
    now = datetime.utcnow()
    recent_otp = (
        db.query(EmailVerification)
        .filter(
            func.lower(EmailVerification.email) == email_clean,
            EmailVerification.created_at >= now - timedelta(seconds=60)
        )
        .first()
    )
    if recent_otp:
        seconds_left = 60 - int((now - recent_otp.created_at).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {max(1, seconds_left)} seconds before requesting a new code."
        )

    # Generate 6-digit random code
    otp_code = "".join(secrets.choice("0123456789") for _ in range(6))
    expires_at = now + timedelta(minutes=10)

    # Remove any prior verifications for this email
    db.query(EmailVerification).filter(func.lower(EmailVerification.email) == email_clean).delete()

    verification_rec = EmailVerification(
        email=email_clean,
        otp_code=otp_code,
        attempts=0,
        expires_at=expires_at,
        created_at=now
    )
    db.add(verification_rec)
    db.commit()

    # Dispatch email via Gmail SMTP
    send_otp_email(
        recipient_email=email_clean,
        recipient_name=user_in.full_name.strip(),
        otp_code=otp_code
    )

    return RequestOTPResponse(
        message="Verification code sent successfully.",
        email_masked=_mask_email(email_clean),
        expires_in_seconds=600
    )


@router.post("/register/verify-otp", response_model=Token)
def verify_otp_and_register(verify_req: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Verifies the submitted 6-digit OTP code against the database.
    Upon verification, creates the user and profile atomically and returns a JWT token.
    """
    email_clean = verify_req.email.strip().lower()
    otp_code_clean = verify_req.otp_code.strip()
    user_in = verify_req.registration_data
    username_clean = user_in.username.strip().lower()

    # Find verification record
    verification_rec = (
        db.query(EmailVerification)
        .filter(func.lower(EmailVerification.email) == email_clean)
        .first()
    )
    if not verification_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found for this email. Please request a new code."
        )

    # Check expiration
    if verification_rec.expires_at < datetime.utcnow():
        db.delete(verification_rec)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new code."
        )

    # Check max failed attempts
    if verification_rec.attempts >= 5:
        db.delete(verification_rec)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new verification code."
        )

    # Verify code match
    if verification_rec.otp_code != otp_code_clean:
        verification_rec.attempts += 1
        db.commit()
        remaining = 5 - verification_rec.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Final check on duplicates before insertion
    if db.query(User).filter(func.lower(User.username) == username_clean).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered.")
    if db.query(User).filter(func.lower(User.email) == email_clean).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

    role = UserRole.RECRUITER if user_in.role_type.lower() == "recruiter" else UserRole.APPLICANT

    # Create User
    new_user = User(
        username=username_clean,
        full_name=user_in.full_name.strip(),
        email=email_clean,
        password_hash=get_password_hash(user_in.password),
        role_type=role,
        phone=user_in.phone,
        status="active",
        last_login_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # If applicant, create candidate profile
    if role == UserRole.APPLICANT:
        cand_prof = CandidateProfile(
            user_id=new_user.user_id,
            university=None,
            career_level=None
        )
        db.add(cand_prof)
        db.commit()

    # Log action
    log = AuditLog(
        user_id=new_user.user_id,
        action_type="USER_REGISTERED_VERIFIED",
        entity_name="User",
        entity_id=new_user.user_id,
        description=f"User @{new_user.username} verified email ({new_user.email}) and registered as {new_user.role_type.value}."
    )
    db.add(log)

    # Delete verification record
    db.delete(verification_rec)
    db.commit()

    # Issue JWT token for seamless auto-login
    token_str = create_access_token(subject=new_user.user_id, role=new_user.role_type.value)
    user_response = UserResponse.model_validate(new_user)

    return Token(
        access_token=token_str,
        token_type="bearer",
        user=user_response
    )


@router.post("/register", response_model=UserResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    username_clean = user_in.username.strip().lower()
    email_clean = user_in.email.strip().lower()

    # Restrict admin role from self-registration
    if user_in.role_type.lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin role cannot be self-registered. Only assignable by existing administrators."
        )

    # Validate username uniqueness (case-insensitive)
    existing_username = db.query(User).filter(func.lower(User.username) == username_clean).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists."
        )

    # Validate email uniqueness (case-insensitive)
    existing_email = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    role = UserRole.APPLICANT
    if user_in.role_type.lower() == "recruiter":
        role = UserRole.RECRUITER
    elif user_in.role_type.lower() == "applicant":
        role = UserRole.APPLICANT
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Only 'applicant' and 'recruiter' are allowed."
        )

    user = User(
        username=username_clean,
        full_name=user_in.full_name.strip(),
        email=email_clean,
        password_hash=get_password_hash(user_in.password),
        role_type=role,
        phone=user_in.phone,
        status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If applicant, create candidate profile automatically
    if role == UserRole.APPLICANT:
        cand_prof = CandidateProfile(
            user_id=user.user_id,
            university=None,
            career_level=None
        )
        db.add(cand_prof)
        db.commit()

    # Log action
    log = AuditLog(
        user_id=user.user_id,
        action_type="USER_REGISTERED",
        entity_name="User",
        entity_id=user.user_id,
        description=f"New user registered: @{user.username} ({user.full_name}, {user.role_type.value})"
    )
    db.add(log)
    db.commit()

    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    ident = form_data.username.strip().lower()
    user = db.query(User).filter(
        or_(
            func.lower(User.username) == ident,
            func.lower(User.email) == ident
        )
    ).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Record login audit
    log = AuditLog(
        user_id=user.user_id,
        action_type="USER_LOGIN",
        entity_name="User",
        entity_id=user.user_id,
        description=f"User logged in: @{user.username} ({user.full_name})"
    )
    db.add(log)
    db.commit()

    access_token = create_access_token(subject=user.user_id, role=user.role_type.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login-json", response_model=Token)
def login_json(creds: UserLogin, db: Session = Depends(get_db)):
    ident = creds.username.strip().lower()
    user = db.query(User).filter(
        or_(
            func.lower(User.username) == ident,
            func.lower(User.email) == ident
        )
    ).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Record login audit
    log = AuditLog(
        user_id=user.user_id,
        action_type="USER_LOGIN",
        entity_name="User",
        entity_id=user.user_id,
        description=f"User logged in: @{user.username} ({user.full_name})"
    )
    db.add(log)
    db.commit()

    access_token = create_access_token(subject=user.user_id, role=user.role_type.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
