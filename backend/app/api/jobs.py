import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Job, Skill, JobSkill, User, UserRole, AuditLog, UploadedFile
from app.schemas.schemas import JobCreate, JobResponse, JobSkillResponse, JobFileParseResponse
from app.api.deps import get_current_user, require_roles
from app.ai.taxonomy import extract_skills_from_text
from app.core.file_utils import (
    validate_and_read_upload,
    save_file_to_disk,
    delete_file_from_disk,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_KB
)

router = APIRouter()

def _format_job_response(job: Job) -> JobResponse:
    skills_resp = []
    for js in job.job_skills:
        skills_resp.append(JobSkillResponse(
            job_skill_id=js.job_skill_id,
            skill_id=js.skill_id,
            skill_name=js.skill.skill_name,
            skill_type=js.skill.skill_type,
            requirement_type=js.requirement_type,
            weight=js.weight,
            minimum_level=js.minimum_level
        ))
    
    return JobResponse(
        job_id=job.job_id,
        posted_by=job.posted_by,
        file_id=job.file_id,
        file_name=job.file.file_name if job.file else None,
        job_title=job.job_title,
        required_education=job.required_education,
        job_summary=job.job_summary,
        required_experience=job.required_experience,
        employment_type=job.employment_type,
        location=job.location,
        raw_job_text=job.raw_job_text,
        status=job.status,
        created_at=job.created_at,
        skills=skills_resp
    )

def _infer_job_title(filename: str, extracted_text: str) -> str:
    lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
    if lines:
        first_line = lines[0]
        if 3 <= len(first_line) <= 80:
            return first_line
    base = os.path.splitext(filename)[0]
    cleaned = base.replace("_", " ").replace("-", " ").title()
    return cleaned if cleaned else "Untitled Job Posting"

@router.get("/", response_model=List[JobResponse])
def get_jobs(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload
    query = (
        db.query(Job)
        .options(
            joinedload(Job.file),
            joinedload(Job.job_skills).joinedload(JobSkill.skill)
        )
    )
    if status_filter:
        query = query.filter(Job.status == status_filter)
    jobs = query.order_by(Job.created_at.desc()).all()
    return [_format_job_response(job) for job in jobs]

@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    job = (
        db.query(Job)
        .options(
            joinedload(Job.file),
            joinedload(Job.job_skills).joinedload(JobSkill.skill)
        )
        .filter(Job.job_id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _format_job_response(job)

@router.post("/", response_model=JobResponse)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    job = Job(
        posted_by=current_user.user_id,
        job_title=job_in.job_title,
        required_education=job_in.required_education,
        job_summary=job_in.job_summary or (job_in.raw_job_text[:200] + "..."),
        required_experience=job_in.required_experience,
        employment_type=job_in.employment_type,
        location=job_in.location,
        raw_job_text=job_in.raw_job_text,
        status="open"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Process skills
    if job_in.skills:
        for s_in in job_in.skills:
            skill = db.query(Skill).filter(Skill.skill_name.ilike(s_in.skill_name)).first()
            if not skill:
                skill = Skill(
                    skill_name=s_in.skill_name,
                    skill_type=s_in.skill_type,
                    description=f"Skill: {s_in.skill_name}"
                )
                db.add(skill)
                db.flush()

            js = JobSkill(
                job_id=job.job_id,
                skill_id=skill.skill_id,
                requirement_type=s_in.requirement_type,
                weight=s_in.weight,
                minimum_level=s_in.minimum_level
            )
            db.add(js)
    else:
        extracted = extract_skills_from_text(job_in.raw_job_text)
        for ext_s in extracted:
            skill = db.query(Skill).filter(Skill.skill_name.ilike(ext_s["skill_name"])).first()
            if not skill:
                skill = Skill(
                    skill_name=ext_s["skill_name"],
                    skill_type=ext_s["skill_type"],
                    description=ext_s.get("description")
                )
                db.add(skill)
                db.flush()

            js = JobSkill(
                job_id=job.job_id,
                skill_id=skill.skill_id,
                requirement_type="required",
                weight=1.0
            )
            db.add(js)

    db.commit()
    db.refresh(job)

    db.commit()
    db.refresh(job)

    # Log audit event
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_CREATED",
        entity_name="Job",
        entity_id=job.job_id,
        description=f"Created job posting: '{job.job_title}' with {len(job.job_skills)} requirements."
    )
    db.add(log)
    db.commit()

    return _format_job_response(job)

@router.post("/upload", response_model=JobResponse)
async def create_job_from_file(
    file: UploadFile = File(...),
    job_title: Optional[str] = Form(None),
    required_education: Optional[str] = Form("Bachelor's Degree in Computer Science / Information Systems"),
    required_experience: Optional[str] = Form("Entry Level / 0-2 Years"),
    employment_type: Optional[str] = Form("Full-Time"),
    location: Optional[str] = Form("Abha, Saudi Arabia"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Creates a new Job posting directly from an uploaded job description file (PDF, DOCX, TXT).
    Validates extension and size, checks for duplicates, extracts skills, and saves file metadata.
    """
    upload_data = await validate_and_read_upload(file, expected_document_type="job")
    checksum = upload_data["checksum"]
    extracted_text = upload_data["extracted_text"]

    # Duplicate detection: check if open job exists with same file checksum
    existing_job = (
        db.query(Job)
        .join(UploadedFile, Job.file_id == UploadedFile.file_id)
        .filter(UploadedFile.checksum == checksum, Job.status == "open")
        .first()
    )
    if existing_job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A job posting with an identical description file already exists (Job #{existing_job.job_id}: '{existing_job.job_title}')."
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

    final_title = job_title.strip() if job_title and job_title.strip() else _infer_job_title(upload_data["filename"], extracted_text)

    job = Job(
        posted_by=current_user.user_id,
        file_id=up_file.file_id,
        job_title=final_title,
        required_education=required_education,
        job_summary=extracted_text[:200] + "...",
        required_experience=required_experience,
        employment_type=employment_type,
        location=location,
        raw_job_text=extracted_text,
        status="open"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Auto-extract skills from extracted text
    extracted_skills = extract_skills_from_text(extracted_text)
    for ext_s in extracted_skills:
        skill = db.query(Skill).filter(Skill.skill_name.ilike(ext_s["skill_name"])).first()
        if not skill:
            skill = Skill(
                skill_name=ext_s["skill_name"],
                skill_type=ext_s["skill_type"],
                description=ext_s.get("description")
            )
            db.add(skill)
            db.commit()
            db.refresh(skill)

        js = JobSkill(
            job_id=job.job_id,
            skill_id=skill.skill_id,
            requirement_type="required",
            weight=1.0
        )
        db.add(js)

    db.commit()
    db.refresh(job)

    # Audit log
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_CREATED_FROM_FILE",
        entity_name="Job",
        entity_id=job.job_id,
        description=f"Created job posting '{job.job_title}' from file '{file.filename}' with {len(job.job_skills)} extracted skills."
    )
    db.add(log)
    db.commit()

    return _format_job_response(job)

@router.put("/{job_id}/upload", response_model=JobResponse)
async def replace_job_file(
    job_id: int,
    file: UploadFile = File(...),
    job_title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Replaces the attached job description file for an existing job posting.
    Deletes the old physical file, updates the UploadedFile record, re-parses text,
    and refreshes extracted skill requirements.
    """
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Ownership verification: recruiters can only replace their own jobs; Admin can replace any
    if current_user.role_type == UserRole.RECRUITER and job.posted_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only replace files for job postings that you created."
        )

    upload_data = await validate_and_read_upload(file)
    checksum = upload_data["checksum"]
    extracted_text = upload_data["extracted_text"]

    # Reject if identical file uploaded
    if job.file and job.file.checksum == checksum:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is byte-for-byte identical to the current job description file."
        )

    # Delete previous physical file from disk if it exists
    if job.file and job.file.storage_path:
        delete_file_from_disk(job.file.storage_path)

    # Save new physical file
    new_storage_path = save_file_to_disk(upload_data["storage_name"], upload_data["file_bytes"])

    # Update or create UploadedFile record
    if job.file:
        up_file = job.file
        up_file.file_name = upload_data["filename"]
        up_file.file_type = upload_data["file_type"]
        up_file.mime_type = upload_data["mime_type"]
        up_file.storage_path = new_storage_path
        up_file.file_size_kb = upload_data["size_kb"]
        up_file.checksum = checksum
        up_file.uploaded_by = current_user.user_id
    else:
        up_file = UploadedFile(
            uploaded_by=current_user.user_id,
            file_name=upload_data["filename"],
            file_type=upload_data["file_type"],
            mime_type=upload_data["mime_type"],
            storage_path=new_storage_path,
            file_size_kb=upload_data["size_kb"],
            checksum=checksum
        )
        db.add(up_file)
        db.commit()
        db.refresh(up_file)
        job.file_id = up_file.file_id

    # Update job raw text and title if provided
    job.raw_job_text = extracted_text
    job.job_summary = extracted_text[:200] + "..."
    if job_title and job_title.strip():
        job.job_title = job_title.strip()

    # Clear previous skills and re-populate from new document
    for old_js in list(job.job_skills):
        db.delete(old_js)
    db.commit()

    extracted_skills = extract_skills_from_text(extracted_text)
    for ext_s in extracted_skills:
        skill = db.query(Skill).filter(Skill.skill_name.ilike(ext_s["skill_name"])).first()
        if not skill:
            skill = Skill(
                skill_name=ext_s["skill_name"],
                skill_type=ext_s["skill_type"],
                description=ext_s.get("description")
            )
            db.add(skill)
            db.commit()
            db.refresh(skill)

        js = JobSkill(
            job_id=job.job_id,
            skill_id=skill.skill_id,
            requirement_type="required",
            weight=1.0
        )
        db.add(js)

    db.commit()
    db.refresh(job)

    # Audit log
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_FILE_REPLACED",
        entity_name="Job",
        entity_id=job.job_id,
        description=f"Replaced file for job #{job.job_id} '{job.job_title}' with '{file.filename}'. Re-extracted {len(job.job_skills)} skills."
    )
    db.add(log)
    db.commit()

    return _format_job_response(job)

@router.post("/parse-file", response_model=JobFileParseResponse)
async def parse_job_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Parses a job description file on-the-fly and returns the suggested title,
    extracted text, and detected skills so the recruiter can preview and edit
    them in form fields before creating the job.
    """
    upload_data = await validate_and_read_upload(file, expected_document_type="job")
    extracted_text = upload_data["extracted_text"]

    suggested_title = _infer_job_title(upload_data["filename"], extracted_text)
    detected_skills = extract_skills_from_text(extracted_text)
    skill_names = [s["skill_name"] for s in detected_skills]

    return JobFileParseResponse(
        suggested_title=suggested_title,
        extracted_text=extracted_text,
        detected_skills=skill_names,
        file_name=upload_data["filename"],
        file_size_kb=upload_data["size_kb"],
        checksum=upload_data["checksum"]
    )

@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Ownership verification: Recruiters can only delete their own jobs; Admin can delete any
    if current_user.role_type == UserRole.RECRUITER and job.posted_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete job postings that you created."
        )

    # Physical disk cleanup if file attached
    if job.file:
        if job.file.storage_path:
            delete_file_from_disk(job.file.storage_path)
        db.delete(job.file)

    name = job.job_title
    db.delete(job)
    
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_DELETED",
        entity_name="Job",
        entity_id=job_id,
        description=f"Deleted job posting #{job_id}: '{name}'"
    )
    db.add(log)
    db.commit()
    
    return {"message": "Job deleted successfully"}
