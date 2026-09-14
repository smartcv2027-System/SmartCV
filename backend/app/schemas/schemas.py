from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    full_name: str
    email: EmailStr
    role_type: str = "applicant"
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role_type: str = "applicant"  # Restricted to applicant or recruiter during registration
    phone: Optional[str] = None

class UserLogin(BaseModel):
    username: str = Field(..., description="Username or email address")
    password: str

class UserResponse(UserBase):
    user_id: int
    status: str
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None

# --- Candidate Profile Schemas ---
class CandidateProfileBase(BaseModel):
    student_id: Optional[str] = None
    major: Optional[str] = None
    university: Optional[str] = "King Khalid University"
    gpa: Optional[str] = None
    career_level: Optional[str] = "Fresh Graduate / Student"
    profile_summary: Optional[str] = None

class CandidateProfileCreate(CandidateProfileBase):
    pass

class CandidateProfileResponse(CandidateProfileBase):
    candidate_id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Skill Schemas ---
class SkillBase(BaseModel):
    skill_name: str
    skill_type: str = "technical"
    description: Optional[str] = None
    is_active: bool = True

class SkillCreate(SkillBase):
    pass

class SkillUpdate(BaseModel):
    skill_name: Optional[str] = None
    skill_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SkillResponse(SkillBase):
    skill_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Job Skills & Job Schemas ---
class JobSkillCreate(BaseModel):
    skill_name: str
    skill_type: str = "technical"
    requirement_type: str = "required"  # 'required' or 'preferred'
    weight: float = 1.0
    minimum_level: Optional[str] = None

class JobSkillResponse(BaseModel):
    job_skill_id: int
    skill_id: int
    skill_name: str
    skill_type: str
    requirement_type: str
    weight: float
    minimum_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class JobCreate(BaseModel):
    job_title: str
    required_education: Optional[str] = "Bachelor's Degree in Computer Science / Information Systems"
    job_summary: Optional[str] = None
    required_experience: Optional[str] = "Entry Level / 0-2 Years"
    employment_type: Optional[str] = "Full-Time"
    location: Optional[str] = "Abha, Saudi Arabia"
    raw_job_text: str
    skills: List[JobSkillCreate] = []

class JobResponse(BaseModel):
    job_id: int
    posted_by: int
    file_id: Optional[int] = None
    file_name: Optional[str] = None
    job_title: str
    required_education: Optional[str] = None
    job_summary: Optional[str] = None
    required_experience: Optional[str] = None
    employment_type: Optional[str] = None
    location: Optional[str] = None
    raw_job_text: str
    status: str
    created_at: datetime
    skills: List[JobSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)

class JobFileParseResponse(BaseModel):
    suggested_title: str
    extracted_text: str
    detected_skills: List[str] = []
    file_name: str
    file_size_kb: int
    checksum: Optional[str] = None

# --- Candidate Skills & Resume Schemas ---
class CandidateSkillResponse(BaseModel):
    candidate_skill_id: int
    skill_id: int
    skill_name: str
    skill_type: str
    evidence_text: Optional[str] = None
    confidence_score: float
    source: str

    model_config = ConfigDict(from_attributes=True)

class ResumeResponse(BaseModel):
    resume_id: int
    candidate_id: int
    file_id: Optional[int] = None
    resume_title: Optional[str] = None
    raw_text: str
    parsed_status: str
    is_default: bool
    created_at: datetime
    candidate_name: Optional[str] = None
    skills: List[CandidateSkillResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Matching & Explainability Schemas ---
class MatchedSkillItem(BaseModel):
    skill_id: int
    skill_name: str
    skill_type: str
    evidence_text: Optional[str] = None
    contribution_score: float = 1.0

class MissingSkillItem(BaseModel):
    skill_id: int
    skill_name: str
    skill_type: str
    requirement_type: str = "required"
    improvement_note: Optional[str] = None

class ExplanationDetail(BaseModel):
    explanation_id: Optional[int] = None
    explanation_text: str
    score_reason: Optional[str] = None
    matched_skill_summary: Optional[str] = None
    missing_skill_summary: Optional[str] = None

class ApplicantFeedbackDetail(BaseModel):
    feedback_id: Optional[int] = None
    feedback_text: str
    improvement_items: Optional[List[Dict[str, Any]]] = None
    missing_skill_recommendations: Optional[List[Dict[str, Any]]] = None
    generated_at: Optional[datetime] = None

class MatchResultDetail(BaseModel):
    result_id: int
    job_id: int
    job_title: str
    candidate_id: int
    candidate_name: str
    resume_id: int
    rank_position: Optional[int] = None
    tfidf_score: float
    bert_score: float
    compatibility_score: float
    recommendation_status: str
    matched_skills: List[MatchedSkillItem] = []
    missing_skills: List[MissingSkillItem] = []
    explanation: Optional[ExplanationDetail] = None
    feedback: Optional[ApplicantFeedbackDetail] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MatchJobRequest(BaseModel):
    job_id: int
    resume_ids: Optional[List[int]] = None  # None means all default resumes
    weight_sbert: Optional[float] = None
    weight_tfidf: Optional[float] = None
    weight_skills: Optional[float] = None

class JobRankingSummary(BaseModel):
    job_id: int
    job_title: str
    total_candidates: int
    top_compatibility_score: float
    weights_used: Optional[Dict[str, float]] = None
    results: List[MatchResultDetail]

# --- Admin & Audit Schemas ---
class AuditLogResponse(BaseModel):
    log_id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action_type: str
    entity_name: Optional[str] = None
    entity_id: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ModelMetric(BaseModel):
    model_name: str
    mean_score_relevant: float
    mean_score_negative: float
    discrimination_margin: float
    latency_ms: float
    description: str

class ModelEvaluationReport(BaseModel):
    dataset_name: str
    total_samples: int
    relevant_samples: int
    negative_control_samples: int
    metrics: List[ModelMetric]
    track_breakdown: List[Dict[str, Any]]
    case_studies: List[Dict[str, Any]] = []
    thesis_chapter_text: Optional[str] = None
    latex_table: Optional[str] = None
    generated_at: datetime
