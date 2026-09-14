from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.models import User, UserRole, CandidateProfile, AuditLog
from app.schemas.schemas import UserCreate, UserRegister, UserResponse, Token, UserLogin
from app.api.deps import get_current_user

router = APIRouter()

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
            university="King Khalid University",
            career_level="Student / Early Career"
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

    access_token = create_access_token(subject=user.user_id, role=user.role_type.value)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
