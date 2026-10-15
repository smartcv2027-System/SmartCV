from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.models.models import (
    JobApplication, Job, CandidateProfile, Resume, User, UserRole, AuditLog, MatchResult
)
from app.schemas.schemas import JobApplicationCreate, JobApplicationResponse, JobApplicationStatusUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()

def _format_application_response(app: JobApplication) -> JobApplicationResponse:
    cand_name = "Anonymous"
    if app.candidate and app.candidate.user:
        cand_name = app.candidate.user.full_name

    job_title = app.job.job_title if app.job else f"Job #{app.job_id}"
    resume_title = app.resume.resume_title if app.resume else None

    compat_score = None
    rec_status = None
    res_id = None
    if app.match_result:
        compat_score = app.match_result.compatibility_score
        rec_status = app.match_result.recommendation_status
        res_id = app.match_result.result_id

    return JobApplicationResponse(
        application_id=app.application_id,
        job_id=app.job_id,
        job_title=job_title,
        candidate_id=app.candidate_id,
        candidate_name=cand_name,
        resume_id=app.resume_id,
        resume_title=resume_title,
        status=app.status,
        cover_letter=app.cover_letter,
        applied_at=app.applied_at,
        compatibility_score=compat_score,
        recommendation_status=rec_status,
        result_id=res_id
    )

@router.post("/jobs/{job_id}/apply", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: int,
    app_in: Optional[JobApplicationCreate] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.APPLICANT, UserRole.ADMIN]))
):
    """
    Submits a candidate job application for an open job posting with their parsed CV.
    Enforces profile existence, active resume verification, job status, and duplicate prevention.
    """
    cand = current_user.candidate_profile
    if not cand:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile not found. Please complete your applicant profile first."
        )

    # 1. Verify job exists and is open
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found.")

    if job.status != "open":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is no longer accepting new applications."
        )

    # 2. Check for duplicate application
    existing_app = (
        db.query(JobApplication)
        .filter(
            JobApplication.job_id == job_id,
            JobApplication.candidate_id == cand.candidate_id
        )
        .first()
    )
    if existing_app:
        formatted_date = existing_app.applied_at.strftime("%Y-%m-%d %H:%M") if existing_app.applied_at else ""
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have already applied for '{job.job_title}' on {formatted_date}."
        )

    # 3. Select active resume
    resume = None
    if app_in and app_in.resume_id:
        resume = (
            db.query(Resume)
            .filter(Resume.resume_id == app_in.resume_id, Resume.candidate_id == cand.candidate_id)
            .first()
        )
    if not resume:
        # Default active resume
        resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == cand.candidate_id, Resume.is_default == True)
            .first()
        )
    if not resume:
        # Any resume
        resume = (
            db.query(Resume)
            .filter(Resume.candidate_id == cand.candidate_id)
            .order_by(Resume.created_at.desc())
            .first()
        )

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must upload and parse a CV before applying for positions."
        )

    cover_note = app_in.cover_letter if app_in else None

    # 4. Create JobApplication record
    new_application = JobApplication(
        job_id=job.job_id,
        candidate_id=cand.candidate_id,
        resume_id=resume.resume_id,
        status="applied",
        cover_letter=cover_note
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    # 5. Audit Log
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_APPLICATION_SUBMITTED",
        entity_name="JobApplication",
        entity_id=new_application.application_id,
        description=f"Applicant '{current_user.full_name}' applied to Job #{job.job_id} '{job.job_title}' with resume '{resume.resume_title}'."
    )
    db.add(log)
    db.commit()

    # Re-query with eager relationships
    reloaded = (
        db.query(JobApplication)
        .options(
            joinedload(JobApplication.job),
            joinedload(JobApplication.candidate).joinedload(CandidateProfile.user),
            joinedload(JobApplication.resume),
            joinedload(JobApplication.match_result)
        )
        .filter(JobApplication.application_id == new_application.application_id)
        .first()
    )
    return _format_application_response(reloaded)

@router.get("/my", response_model=List[JobApplicationResponse])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.APPLICANT, UserRole.ADMIN]))
):
    """
    Returns all job applications submitted by the logged-in candidate with
    their current application statuses and match scores/feedback if screened.
    """
    if not current_user.candidate_profile:
        return []

    cand_id = current_user.candidate_profile.candidate_id
    apps = (
        db.query(JobApplication)
        .options(
            joinedload(JobApplication.job),
            joinedload(JobApplication.candidate).joinedload(CandidateProfile.user),
            joinedload(JobApplication.resume),
            joinedload(JobApplication.match_result)
        )
        .filter(JobApplication.candidate_id == cand_id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )
    return [_format_application_response(a) for a in apps]

@router.get("/job/{job_id}", response_model=List[JobApplicationResponse])
def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Retrieves all candidate applications submitted for a specific job posting.
    Recruiters are authorized only for jobs they posted (Admins can view all).
    """
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    if current_user.role_type == UserRole.RECRUITER and job.posted_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only view applications for your own job postings."
        )

    apps = (
        db.query(JobApplication)
        .options(
            joinedload(JobApplication.job),
            joinedload(JobApplication.candidate).joinedload(CandidateProfile.user),
            joinedload(JobApplication.resume),
            joinedload(JobApplication.match_result)
        )
        .filter(JobApplication.job_id == job_id)
        .order_by(JobApplication.applied_at.desc())
        .all()
    )
    return [_format_application_response(a) for a in apps]

@router.delete("/{application_id}", status_code=status.HTTP_200_OK)
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a candidate to withdraw their submitted application, or a recruiter/admin to dismiss it.
    """
    app = db.query(JobApplication).filter(JobApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Authorization
    is_owner_applicant = (
        current_user.role_type == UserRole.APPLICANT and
        current_user.candidate_profile and
        app.candidate_id == current_user.candidate_profile.candidate_id
    )
    is_job_recruiter = (
        current_user.role_type == UserRole.RECRUITER and
        app.job and
        app.job.posted_by == current_user.user_id
    )
    is_admin = current_user.role_type == UserRole.ADMIN

    if not (is_owner_applicant or is_job_recruiter or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to withdraw this application.")

    job_title = app.job.job_title if app.job else "Job"
    db.delete(app)

    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_APPLICATION_WITHDRAWN",
        entity_name="JobApplication",
        entity_id=application_id,
        description=f"Application #{application_id} for '{job_title}' was withdrawn/deleted by {current_user.full_name}."
    )
    db.add(log)
    db.commit()

    return {"message": "Application withdrawn successfully."}

VALID_APPLICATION_STATUSES = {"applied", "screened", "reviewed", "shortlisted", "rejected"}

@router.patch("/{application_id}/status", response_model=JobApplicationResponse)
def update_application_status(
    application_id: int,
    status_in: JobApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Updates the candidate application lifecycle status (e.g., 'reviewed', 'shortlisted', 'rejected').
    Authorized for the recruiter who created the job opening, or an administrator.
    """
    target_status = status_in.status.lower().strip()
    if target_status not in VALID_APPLICATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid application status '{status_in.status}'. Allowed statuses: {sorted(list(VALID_APPLICATION_STATUSES))}."
        )

    app = db.query(JobApplication).filter(JobApplication.application_id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Authorization check: only the job poster or admin can update status
    if current_user.role_type == UserRole.RECRUITER and app.job and app.job.posted_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only update application statuses for job postings that you created."
        )

    old_status = app.status
    app.status = target_status
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)

    # Audit log
    job_title = app.job.job_title if app.job else f"Job #{app.job_id}"
    cand_name = app.candidate.user.full_name if app.candidate and app.candidate.user else f"Candidate #{app.candidate_id}"
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="JOB_APPLICATION_STATUS_UPDATED",
        entity_name="JobApplication",
        entity_id=application_id,
        description=f"Status for {cand_name}'s application to '{job_title}' updated from '{old_status}' to '{target_status}' by {current_user.full_name}."
    )
    db.add(log)
    db.commit()

    reloaded = (
        db.query(JobApplication)
        .options(
            joinedload(JobApplication.job),
            joinedload(JobApplication.candidate).joinedload(CandidateProfile.user),
            joinedload(JobApplication.resume),
            joinedload(JobApplication.match_result)
        )
        .filter(JobApplication.application_id == application_id)
        .first()
    )
    return _format_application_response(reloaded)
