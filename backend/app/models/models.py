import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, 
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserRole(str, enum.Enum):
    RECRUITER = "recruiter"
    APPLICANT = "applicant"
    ADMIN = "admin"

class SkillType(str, enum.Enum):
    TECHNICAL = "technical"
    SOFT = "soft"
    TOOL = "tool"
    DOMAIN = "domain"

class RequirementType(str, enum.Enum):
    REQUIRED = "required"
    PREFERRED = "preferred"

class RecommendationStatus(str, enum.Enum):
    STRONG_MATCH = "Strong Match"
    GOOD_MATCH = "Good Match"
    LOW_MATCH = "Low Match"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_type = Column(SAEnum(UserRole), nullable=False, default=UserRole.APPLICANT)
    phone = Column(String(50), nullable=True)
    status = Column(String(50), default="active")
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    candidate_profile = relationship("CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="poster", cascade="all, delete-orphan")
    uploaded_files = relationship("UploadedFile", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    candidate_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(100), nullable=True)
    major = Column(String(255), nullable=True)
    university = Column(String(255), default="King Khalid University")
    gpa = Column(String(20), nullable=True)
    career_level = Column(String(50), default="Fresh Graduate / Student")
    profile_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="candidate_profile")
    resumes = relationship("Resume", back_populates="candidate", cascade="all, delete-orphan")
    candidate_skills = relationship("CandidateSkill", back_populates="candidate", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="candidate", cascade="all, delete-orphan")
    applicant_feedbacks = relationship("ApplicantFeedback", back_populates="candidate", cascade="all, delete-orphan")

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    file_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    uploaded_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=True)
    mime_type = Column(String(100), nullable=True)
    storage_path = Column(String(500), nullable=False)
    file_size_kb = Column(Integer, nullable=True)
    checksum = Column(String(64), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    uploader = relationship("User", back_populates="uploaded_files")
    resumes = relationship("Resume", back_populates="file")
    jobs = relationship("Job", back_populates="file")

class Resume(Base):
    __tablename__ = "resumes"

    resume_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.candidate_id", ondelete="CASCADE"), nullable=False)
    file_id = Column(Integer, ForeignKey("uploaded_files.file_id", ondelete="SET NULL"), nullable=True)
    resume_title = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=False)
    parsed_status = Column(String(50), default="parsed")
    is_default = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    candidate = relationship("CandidateProfile", back_populates="resumes")
    file = relationship("UploadedFile", back_populates="resumes")
    candidate_skills = relationship("CandidateSkill", back_populates="resume", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="resume", cascade="all, delete-orphan")

class Job(Base):
    __tablename__ = "jobs"

    job_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    posted_by = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    file_id = Column(Integer, ForeignKey("uploaded_files.file_id", ondelete="SET NULL"), nullable=True)
    job_title = Column(String(255), nullable=False)
    required_education = Column(String(255), nullable=True)
    job_summary = Column(Text, nullable=True)
    required_experience = Column(String(100), nullable=True)
    employment_type = Column(String(100), default="Full-Time")
    location = Column(String(255), default="Abha, Saudi Arabia")
    raw_job_text = Column(Text, nullable=False)
    status = Column(String(50), default="open")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    poster = relationship("User", back_populates="jobs")
    file = relationship("UploadedFile", back_populates="jobs")
    job_skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="job", cascade="all, delete-orphan")

class Skill(Base):
    __tablename__ = "skills"

    skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    skill_name = Column(String(150), unique=True, index=True, nullable=False)
    skill_type = Column(String(50), default="technical")  # 'technical', 'soft', 'tool', 'domain'
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    candidate_skills = relationship("CandidateSkill", back_populates="skill", cascade="all, delete-orphan")
    job_skills = relationship("JobSkill", back_populates="skill", cascade="all, delete-orphan")
    matched_skills = relationship("MatchedSkill", back_populates="skill", cascade="all, delete-orphan")
    missing_skills = relationship("MissingSkill", back_populates="skill", cascade="all, delete-orphan")

class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    candidate_skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.candidate_id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)
    evidence_text = Column(Text, nullable=True)
    confidence_score = Column(Float, default=1.0)
    source = Column(String(50), default="parsed")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    candidate = relationship("CandidateProfile", back_populates="candidate_skills")
    resume = relationship("Resume", back_populates="candidate_skills")
    skill = relationship("Skill", back_populates="candidate_skills")

class JobSkill(Base):
    __tablename__ = "job_skills"

    job_skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)
    requirement_type = Column(String(50), default="required")  # 'required' or 'preferred'
    weight = Column(Float, default=1.0)
    minimum_level = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job = relationship("Job", back_populates="job_skills")
    skill = relationship("Skill", back_populates="job_skills")

class MatchResult(Base):
    __tablename__ = "match_results"

    result_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.job_id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.candidate_id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.resume_id", ondelete="CASCADE"), nullable=False)
    rank_position = Column(Integer, nullable=True)
    tfidf_score = Column(Float, default=0.0)
    bert_score = Column(Float, default=0.0)
    compatibility_score = Column(Float, nullable=False)
    recommendation_status = Column(String(50), default="Good Match")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job = relationship("Job", back_populates="match_results")
    candidate = relationship("CandidateProfile", back_populates="match_results")
    resume = relationship("Resume", back_populates="match_results")
    matched_skills = relationship("MatchedSkill", back_populates="match_result", cascade="all, delete-orphan")
    missing_skills = relationship("MissingSkill", back_populates="match_result", cascade="all, delete-orphan")
    explanation_summary = relationship("ExplanationSummary", back_populates="match_result", uselist=False, cascade="all, delete-orphan")
    applicant_feedback = relationship("ApplicantFeedback", back_populates="match_result", uselist=False, cascade="all, delete-orphan")

class MatchedSkill(Base):
    __tablename__ = "matched_skills"

    matched_skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    result_id = Column(Integer, ForeignKey("match_results.result_id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)
    evidence_text = Column(Text, nullable=True)
    contribution_score = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    match_result = relationship("MatchResult", back_populates="matched_skills")
    skill = relationship("Skill", back_populates="matched_skills")

class MissingSkill(Base):
    __tablename__ = "missing_skills"

    missing_skill_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    result_id = Column(Integer, ForeignKey("match_results.result_id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)
    requirement_type = Column(String(50), default="required")
    improvement_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    match_result = relationship("MatchResult", back_populates="missing_skills")
    skill = relationship("Skill", back_populates="missing_skills")

class ExplanationSummary(Base):
    __tablename__ = "explanation_summaries"

    explanation_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    result_id = Column(Integer, ForeignKey("match_results.result_id", ondelete="CASCADE"), unique=True, nullable=False)
    explanation_text = Column(Text, nullable=False)
    score_reason = Column(Text, nullable=True)
    matched_skill_summary = Column(Text, nullable=True)
    missing_skill_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    match_result = relationship("MatchResult", back_populates="explanation_summary")

class ApplicantFeedback(Base):
    __tablename__ = "applicant_feedback"

    feedback_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    result_id = Column(Integer, ForeignKey("match_results.result_id", ondelete="CASCADE"), unique=True, nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.candidate_id", ondelete="CASCADE"), nullable=False)
    feedback_text = Column(Text, nullable=False)
    improvement_items = Column(JSON, nullable=True)  # List of actionable suggestions
    missing_skill_recommendations = Column(JSON, nullable=True)  # Courses/certifications/projects
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    match_result = relationship("MatchResult", back_populates="applicant_feedback")
    candidate = relationship("CandidateProfile", back_populates="applicant_feedbacks")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False)
    entity_name = Column(String(100), nullable=True)
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
