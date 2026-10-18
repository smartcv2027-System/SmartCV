from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_password_hash
from app.models.models import Skill, AuditLog, User, Job, Resume, MatchResult, UserRole, CandidateProfile
from app.schemas.schemas import (
    SkillResponse, SkillCreate, SkillUpdate, AuditLogResponse,
    UserResponse, AdminUserCreate, AdminUserUpdate
)
from app.api.deps import require_roles, get_current_user

router = APIRouter()

@router.get("/users", response_model=List[UserResponse])
def get_users(
    role_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(User)
    if role_filter:
        try:
            role_enum = UserRole(role_filter.lower())
            query = query.filter(User.role_type == role_enum)
        except ValueError:
            pass
    if status_filter:
        query = query.filter(func.lower(User.status) == status_filter.lower())
    return query.order_by(User.created_at.desc()).all()

@router.post("/users", response_model=UserResponse)
def create_user_admin(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    username_clean = user_in.username.strip().lower()
    email_clean = user_in.email.strip().lower()

    if db.query(User).filter(func.lower(User.username) == username_clean).first():
        raise HTTPException(status_code=400, detail="A user with this username already exists.")
    if db.query(User).filter(func.lower(User.email) == email_clean).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    try:
        role_enum = UserRole(user_in.role_type.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role_type. Must be applicant, recruiter, or admin.")

    new_user = User(
        username=username_clean,
        full_name=user_in.full_name.strip(),
        email=email_clean,
        password_hash=get_password_hash(user_in.password),
        role_type=role_enum,
        phone=user_in.phone,
        status=user_in.status or "active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if role_enum == UserRole.APPLICANT:
        cand_prof = CandidateProfile(
            user_id=new_user.user_id,
            university="King Khalid University",
            career_level="Fresh Graduate / Student"
        )
        db.add(cand_prof)
        db.commit()

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="USER_CREATED",
        entity_name="User",
        entity_id=new_user.user_id,
        description=f"Admin created user @{new_user.username} ({new_user.full_name}, role: {new_user.role_type.value})."
    )
    db.add(log)
    db.commit()

    return new_user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_admin(
    user_id: int,
    user_in: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    target_user = db.query(User).filter(User.user_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.email is not None:
        email_clean = user_in.email.strip().lower()
        existing_email = db.query(User).filter(
            func.lower(User.email) == email_clean,
            User.user_id != user_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Another user with this email already exists.")
        target_user.email = email_clean

    if user_in.full_name is not None:
        target_user.full_name = user_in.full_name.strip()

    if user_in.phone is not None:
        target_user.phone = user_in.phone

    if user_in.role_type is not None:
        try:
            new_role = UserRole(user_in.role_type.lower())
            target_user.role_type = new_role
            if new_role == UserRole.APPLICANT and not target_user.candidate_profile:
                db.add(CandidateProfile(
                    user_id=target_user.user_id,
                    university="King Khalid University",
                    career_level="Fresh Graduate / Student"
                ))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role_type.")

    if user_in.status is not None:
        target_user.status = user_in.status.lower()

    if user_in.password:
        target_user.password_hash = get_password_hash(user_in.password)

    db.commit()
    db.refresh(target_user)

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="USER_UPDATED",
        entity_name="User",
        entity_id=target_user.user_id,
        description=f"Admin updated user @{target_user.username} (role: {target_user.role_type.value}, status: {target_user.status})."
    )
    db.add(log)
    db.commit()

    return target_user

@router.delete("/users/{user_id}")
def delete_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    target_user = db.query(User).filter(User.user_id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    if target_user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own active administrator account.")

    uname = target_user.username
    fname = target_user.full_name
    db.delete(target_user)

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="USER_DELETED",
        entity_name="User",
        entity_id=user_id,
        description=f"Admin deleted user @{uname} ({fname})."
    )
    db.add(log)
    db.commit()
    return {"message": "User deleted successfully"}

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    action_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(AuditLog)
    if action_filter:
        query = query.filter(AuditLog.action_type == action_filter)
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    result = []
    for log in logs:
        u_name = "System"
        if log.user:
            u_name = f"{log.user.full_name} ({log.user.role_type.value})"
        result.append(AuditLogResponse(
            log_id=log.log_id,
            user_id=log.user_id,
            user_name=u_name,
            action_type=log.action_type,
            entity_name=log.entity_name,
            entity_id=log.entity_id,
            description=log.description,
            created_at=log.created_at
        ))
    return result

@router.get("/skills", response_model=List[SkillResponse])
def get_skills_taxonomy(
    skill_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Skill)
    if skill_type:
        query = query.filter(Skill.skill_type == skill_type)
    return query.order_by(Skill.skill_name.asc()).all()

@router.post("/skills", response_model=SkillResponse)
def add_skill_taxonomy(
    skill_in: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(Skill).filter(Skill.skill_name.ilike(skill_in.skill_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists in taxonomy")

    skill = Skill(
        skill_name=skill_in.skill_name,
        skill_type=skill_in.skill_type,
        description=skill_in.description,
        is_active=skill_in.is_active
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="SKILL_ADDED",
        entity_name="Skill",
        entity_id=skill.skill_id,
        description=f"Admin added new skill '{skill.skill_name}' (type: {skill.skill_type}) to taxonomy."
    )
    db.add(log)
    db.commit()

    return skill

@router.put("/skills/{skill_id}", response_model=SkillResponse)
def update_skill_taxonomy(
    skill_id: int,
    skill_in: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    skill = db.query(Skill).filter(Skill.skill_id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    if skill_in.skill_name is not None:
        skill.skill_name = skill_in.skill_name
    if skill_in.skill_type is not None:
        skill.skill_type = skill_in.skill_type
    if skill_in.description is not None:
        skill.description = skill_in.description
    if skill_in.is_active is not None:
        skill.is_active = skill_in.is_active

    db.commit()
    db.refresh(skill)

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="SKILL_UPDATED",
        entity_name="Skill",
        entity_id=skill.skill_id,
        description=f"Admin updated skill '{skill.skill_name}' (type: {skill.skill_type}, active: {skill.is_active})."
    )
    db.add(log)
    db.commit()

    return skill

@router.delete("/skills/{skill_id}")
def delete_skill_taxonomy(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    skill = db.query(Skill).filter(Skill.skill_id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    name = skill.skill_name
    db.delete(skill)
    
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="SKILL_DELETED",
        entity_name="Skill",
        entity_id=skill_id,
        description=f"Admin deleted skill '{name}' from taxonomy."
    )
    db.add(log)
    db.commit()
    return {"message": "Skill deleted successfully"}

@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    total_users = db.query(User).count()
    recruiters = db.query(User).filter(User.role_type == UserRole.RECRUITER).count()
    applicants = db.query(User).filter(User.role_type == UserRole.APPLICANT).count()
    total_jobs = db.query(Job).count()
    total_resumes = db.query(Resume).count()
    total_matches = db.query(MatchResult).count()
    total_skills = db.query(Skill).count()

    return {
        "total_users": total_users,
        "recruiters": recruiters,
        "applicants": applicants,
        "total_jobs": total_jobs,
        "total_resumes": total_resumes,
        "total_matches": total_matches,
        "total_skills": total_skills
    }
