import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Resume, UploadedFile, CandidateProfile, CandidateSkill, Skill, User, UserRole, AuditLog
from app.schemas.schemas import ResumeResponse, CandidateSkillResponse
from app.api.deps import get_current_user, require_roles
from app.ai.parser import parse_document
from app.ai.taxonomy import extract_skills_from_text
from app.core.config import settings
from app.core.file_utils import (
    validate_and_read_upload,
    save_file_to_disk,
    delete_file_from_disk
)

router = APIRouter()

def _format_resume_response(resume: Resume, db: Session) -> ResumeResponse:
    cand_name = "Anonymous Candidate"
    if resume.candidate and resume.candidate.user:
        cand_name = resume.candidate.user.full_name

    skills_resp = []
    for cs in resume.candidate_skills:
        skills_resp.append(CandidateSkillResponse(
            candidate_skill_id=cs.candidate_skill_id,
            skill_id=cs.skill_id,
            skill_name=cs.skill.skill_name,
            skill_type=cs.skill.skill_type,
            evidence_text=cs.evidence_text,
            confidence_score=cs.confidence_score,
            source=cs.source
        ))

    return ResumeResponse(
        resume_id=resume.resume_id,
        candidate_id=resume.candidate_id,
        file_id=resume.file_id,
        resume_title=resume.resume_title or "Untitled Resume",
        raw_text=resume.raw_text,
        parsed_status=resume.parsed_status,
        is_default=resume.is_default,
        created_at=resume.created_at,
        candidate_name=cand_name,
        skills=skills_resp
    )

@router.get("/", response_model=List[ResumeResponse])
def get_resumes(
    candidate_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Resume)
    
    # If applicant, only view own resumes
    if current_user.role_type == UserRole.APPLICANT:
        if current_user.candidate_profile:
            query = query.filter(Resume.candidate_id == current_user.candidate_profile.candidate_id)
        else:
            return []
    elif candidate_id:
        query = query.filter(Resume.candidate_id == candidate_id)

    resumes = query.order_by(Resume.created_at.desc()).all()
    return [_format_resume_response(r, db) for r in resumes]

@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    if current_user.role_type == UserRole.APPLICANT:
        if not current_user.candidate_profile or resume.candidate_id != current_user.candidate_profile.candidate_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this resume")
            
    return _format_resume_response(resume, db)

@router.get("/{resume_id}/download")
def download_resume_file(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download authentic uploaded resume file (PDF, DOCX, TXT).
    Enforces candidate authorization check:
    - Applicants can only download their own resumes.
    - Recruiters and Admins can download any candidate resume for evaluation.
    """
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if current_user.role_type == UserRole.APPLICANT:
        if not current_user.candidate_profile or resume.candidate_id != current_user.candidate_profile.candidate_id:
            raise HTTPException(status_code=403, detail="Not authorized to download this resume")

    if not resume.file or not resume.file.storage_path or not os.path.exists(resume.file.storage_path):
        raise HTTPException(status_code=404, detail="Physical resume file not found on disk")

    filename = resume.file.file_name or f"resume_{resume_id}.pdf"
    media_type = resume.file.mime_type or "application/octet-stream"

    return FileResponse(
        path=resume.file.storage_path,
        filename=filename,
        media_type=media_type
    )

@router.post("/reparse-all")
def reparse_all_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Re-parses all candidate resumes across the database using the two-layer
    extraction engine (canonical taxonomy + section-aware discovery) and auto-registers
    any novel skills into the database.
    """
    resumes = db.query(Resume).all()
    db_skills = db.query(Skill).filter(Skill.is_active == True).all()
    custom_taxonomy = [
        {"name": s.skill_name, "type": s.skill_type or "technical", "desc": s.description or f"{s.skill_name} skill"}
        for s in db_skills
    ]

    updated_count = 0
    for resume in resumes:
        if not resume.raw_text:
            continue

        # Remove previous parsed skills
        db.query(CandidateSkill).filter(
            CandidateSkill.resume_id == resume.resume_id,
            CandidateSkill.source == "parsed"
        ).delete()

        # Two-layer hybrid extraction
        extracted_skills = extract_skills_from_text(resume.raw_text, custom_taxonomy=custom_taxonomy)
        for s_data in extracted_skills:
            skill = db.query(Skill).filter(Skill.skill_name.ilike(s_data["skill_name"])).first()
            if not skill:
                skill = Skill(
                    skill_name=s_data["skill_name"],
                    skill_type=s_data.get("skill_type", "technical"),
                    description=s_data.get("description", f"{s_data['skill_name']} skill"),
                    is_active=True
                )
                db.add(skill)
                db.commit()
                db.refresh(skill)

            cand_skill = CandidateSkill(
                candidate_id=resume.candidate_id,
                resume_id=resume.resume_id,
                skill_id=skill.skill_id,
                evidence_text=s_data.get("evidence_text"),
                confidence_score=s_data.get("confidence_score", 1.0),
                source="parsed"
            )
            db.add(cand_skill)

        resume.parsed_status = "parsed"
        updated_count += 1

    db.commit()

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="RESUMES_REPARSED_ALL",
        entity_name="Resume",
        entity_id=None,
        description=f"Batch re-parsed {updated_count} candidate resumes using two-layer hybrid extraction engine."
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Successfully re-parsed and refreshed {updated_count} candidate resumes.",
        "updated_count": updated_count
    }

@router.post("/{resume_id}/reparse", response_model=ResumeResponse)
def reparse_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-parses an individual resume using the two-layer hybrid extraction engine.
    Applicants may only re-parse their own resume. Recruiters and Admins can re-parse any candidate.
    """
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if current_user.role_type == UserRole.APPLICANT:
        if not current_user.candidate_profile or resume.candidate_id != current_user.candidate_profile.candidate_id:
            raise HTTPException(status_code=403, detail="Not authorized to re-parse this resume")

    db_skills = db.query(Skill).filter(Skill.is_active == True).all()
    custom_taxonomy = [
        {"name": s.skill_name, "type": s.skill_type or "technical", "desc": s.description or f"{s.skill_name} skill"}
        for s in db_skills
    ]

    # Delete existing parsed skills
    db.query(CandidateSkill).filter(
        CandidateSkill.resume_id == resume.resume_id,
        CandidateSkill.source == "parsed"
    ).delete()

    # Re-extract
    extracted_skills = extract_skills_from_text(resume.raw_text, custom_taxonomy=custom_taxonomy)
    for s_data in extracted_skills:
        skill = db.query(Skill).filter(Skill.skill_name.ilike(s_data["skill_name"])).first()
        if not skill:
            skill = Skill(
                skill_name=s_data["skill_name"],
                skill_type=s_data.get("skill_type", "technical"),
                description=s_data.get("description", f"{s_data['skill_name']} skill"),
                is_active=True
            )
            db.add(skill)
            db.commit()
            db.refresh(skill)

        cand_skill = CandidateSkill(
            candidate_id=resume.candidate_id,
            resume_id=resume.resume_id,
            skill_id=skill.skill_id,
            evidence_text=s_data.get("evidence_text"),
            confidence_score=s_data.get("confidence_score", 1.0),
            source="parsed"
        )
        db.add(cand_skill)

    resume.parsed_status = "parsed"
    db.commit()
    db.refresh(resume)

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="RESUME_REPARSED",
        entity_name="Resume",
        entity_id=resume.resume_id,
        description=f"Re-parsed resume #{resume.resume_id} for candidate #{resume.candidate_id} ({len(extracted_skills)} skills extracted)."
    )
    db.add(log)
    db.commit()

    return _format_resume_response(resume, db)

@router.post("/upload", response_model=List[ResumeResponse])
async def upload_resumes(
    files: List[UploadFile] = File(...),
    target_candidate_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Multi-file resume upload endpoint supporting PDF, DOCX, and TXT files.
    Enforces format whitelist, 5 MiB size cap, and duplicate detection.
    Restricted: Recruiters cannot upload candidate resumes (Applicants only).
    """
    if current_user.role_type == UserRole.RECRUITER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recruiters are not permitted to upload candidate resumes. Resumes must be submitted directly by applicants through the applicant portal."
        )

    results = []

    # Load all active skills from database to enrich taxonomy
    db_skills = db.query(Skill).filter(Skill.is_active == True).all()
    custom_taxonomy = [
        {
            "name": s.skill_name,
            "type": s.skill_type or "technical",
            "desc": s.description or f"{s.skill_name} skill"
        }
        for s in db_skills
    ]

    # Determine candidate profile
    cand_profile = None
    if current_user.role_type == UserRole.APPLICANT:
        cand_profile = current_user.candidate_profile
        if not cand_profile:
            cand_profile = CandidateProfile(user_id=current_user.user_id)
            db.add(cand_profile)
            db.commit()
            db.refresh(cand_profile)
    elif target_candidate_id:
        cand_profile = db.query(CandidateProfile).filter(CandidateProfile.candidate_id == target_candidate_id).first()

    for file in files:
        upload_data = await validate_and_read_upload(file, expected_document_type="cv")
        checksum = upload_data["checksum"]
        extracted_text = upload_data["extracted_text"]

        # If admin uploaded without target, create placeholder candidate
        if not cand_profile:
            extracted_name = os.path.splitext(file.filename)[0].replace("_", " ").replace("-", " ").title()
            email_synthetic = f"candidate_{checksum[:8]}@kku.edu.sa"
            username_synthetic = f"cand_{checksum[:8].lower()}"
            
            temp_user = db.query(User).filter(User.username == username_synthetic).first()
            if not temp_user:
                temp_user = User(
                    username=username_synthetic,
                    full_name=extracted_name,
                    email=email_synthetic,
                    password_hash="temp_placeholder",
                    role_type=UserRole.APPLICANT,
                    status="active"
                )
                db.add(temp_user)
                db.commit()
                db.refresh(temp_user)
            
            cand_prof_new = db.query(CandidateProfile).filter(CandidateProfile.user_id == temp_user.user_id).first()
            if not cand_prof_new:
                cand_prof_new = CandidateProfile(
                    user_id=temp_user.user_id,
                    university="King Khalid University",
                    major="Information Systems / Computer Science",
                    career_level="Student / Fresh Graduate"
                )
                db.add(cand_prof_new)
                db.commit()
                db.refresh(cand_prof_new)
            assigned_candidate_id = cand_prof_new.candidate_id
        else:
            assigned_candidate_id = cand_profile.candidate_id

        # Duplicate resume detection for this candidate
        duplicate = (
            db.query(Resume)
            .join(UploadedFile, Resume.file_id == UploadedFile.file_id)
            .filter(
                Resume.candidate_id == assigned_candidate_id,
                UploadedFile.checksum == checksum
            )
            .first()
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You have already uploaded this resume: '{upload_data['filename']}'."
            )

        # Save physical file to disk
        storage_path = save_file_to_disk(upload_data["storage_name"], upload_data["file_bytes"])

        # Create UploadedFile record
        up_file = UploadedFile(
            uploaded_by=current_user.user_id,
            file_name=upload_data["filename"],
            file_type=upload_data["file_type"],
            mime_type=upload_data["mime_type"],
            storage_path=storage_path,
            file_size_kb=upload_data["size_kb"],
            checksum=checksum
        )
        db.add(up_file)
        db.commit()
        db.refresh(up_file)

        # Create Resume record
        resume = Resume(
            candidate_id=assigned_candidate_id,
            file_id=up_file.file_id,
            resume_title=upload_data["filename"],
            raw_text=extracted_text,
            parsed_status="parsed",
            is_default=True
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)

        # Skill Extraction
        extracted_skills = extract_skills_from_text(extracted_text, custom_taxonomy=custom_taxonomy)
        for s_data in extracted_skills:
            skill = db.query(Skill).filter(Skill.skill_name.ilike(s_data["skill_name"])).first()
            if not skill:
                skill = Skill(
                    skill_name=s_data["skill_name"],
                    skill_type=s_data["skill_type"],
                    description=s_data.get("description")
                )
                db.add(skill)
                db.commit()
                db.refresh(skill)

            cand_skill = CandidateSkill(
                candidate_id=assigned_candidate_id,
                resume_id=resume.resume_id,
                skill_id=skill.skill_id,
                evidence_text=s_data.get("evidence_text"),
                confidence_score=s_data.get("confidence_score", 1.0),
                source="parsed"
            )
            db.add(cand_skill)

        db.commit()
        db.refresh(resume)

        # Log Audit
        log = AuditLog(
            user_id=current_user.user_id,
            action_type="RESUME_UPLOADED",
            entity_name="Resume",
            entity_id=resume.resume_id,
            description=f"Uploaded and parsed resume '{file.filename}' for candidate #{assigned_candidate_id} (extracted {len(extracted_skills)} skills)."
        )
        db.add(log)
        db.commit()

        results.append(_format_resume_response(resume, db))

    return results

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.resume_id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if current_user.role_type == UserRole.APPLICANT:
        if not current_user.candidate_profile or resume.candidate_id != current_user.candidate_profile.candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this resume."
            )

    # Physical disk cleanup
    if resume.file:
        if resume.file.storage_path:
            delete_file_from_disk(resume.file.storage_path)
        db.delete(resume.file)

    db.delete(resume)
    db.commit()

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="RESUME_DELETED",
        entity_name="Resume",
        entity_id=resume_id,
        description=f"Deleted resume #{resume_id} and associated files."
    )
    db.add(log)
    db.commit()

    return {"message": "Resume deleted successfully"}
