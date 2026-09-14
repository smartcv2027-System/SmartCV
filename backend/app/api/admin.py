from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Skill, AuditLog, User, Job, Resume, MatchResult, UserRole
from app.schemas.schemas import SkillResponse, SkillCreate, SkillUpdate, AuditLogResponse
from app.api.deps import require_roles, get_current_user

router = APIRouter()

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
