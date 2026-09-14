from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import (
    Job, Resume, MatchResult, MatchedSkill, MissingSkill, 
    ExplanationSummary, ApplicantFeedback, CandidateSkill, Skill,
    User, UserRole, AuditLog
)
from app.schemas.schemas import (
    MatchJobRequest, JobRankingSummary, MatchResultDetail,
    MatchedSkillItem, MissingSkillItem, ExplanationDetail, 
    ApplicantFeedbackDetail
)
from app.api.deps import get_current_user, require_roles
from app.ai.matcher import SmartCVMatcher, SBERTModelError
from app.ai.xai_explainer import XAIExplainer

router = APIRouter()

def _build_match_result_detail(res: MatchResult) -> MatchResultDetail:
    cand_name = "Anonymous"
    if res.candidate and res.candidate.user:
        cand_name = res.candidate.user.full_name
        
    matched_items = []
    for ms in res.matched_skills:
        matched_items.append(MatchedSkillItem(
            skill_id=ms.skill_id,
            skill_name=ms.skill.skill_name if ms.skill else "Skill",
            skill_type=ms.skill.skill_type if ms.skill else "technical",
            evidence_text=ms.evidence_text,
            contribution_score=ms.contribution_score
        ))

    missing_items = []
    for ms in res.missing_skills:
        missing_items.append(MissingSkillItem(
            skill_id=ms.skill_id,
            skill_name=ms.skill.skill_name if ms.skill else "Skill",
            skill_type=ms.skill.skill_type if ms.skill else "technical",
            requirement_type=ms.requirement_type,
            improvement_note=ms.improvement_note
        ))

    expl_detail = None
    if res.explanation_summary:
        expl_detail = ExplanationDetail(
            explanation_id=res.explanation_summary.explanation_id,
            explanation_text=res.explanation_summary.explanation_text,
            score_reason=res.explanation_summary.score_reason,
            matched_skill_summary=res.explanation_summary.matched_skill_summary,
            missing_skill_summary=res.explanation_summary.missing_skill_summary
        )

    fb_detail = None
    if res.applicant_feedback:
        fb_detail = ApplicantFeedbackDetail(
            feedback_id=res.applicant_feedback.feedback_id,
            feedback_text=res.applicant_feedback.feedback_text,
            improvement_items=res.applicant_feedback.improvement_items,
            missing_skill_recommendations=res.applicant_feedback.missing_skill_recommendations,
            generated_at=res.applicant_feedback.generated_at
        )

    return MatchResultDetail(
        result_id=res.result_id,
        job_id=res.job_id,
        job_title=res.job.job_title if res.job else "",
        candidate_id=res.candidate_id,
        candidate_name=cand_name,
        resume_id=res.resume_id,
        rank_position=res.rank_position,
        tfidf_score=res.tfidf_score,
        bert_score=res.bert_score,
        compatibility_score=res.compatibility_score,
        recommendation_status=res.recommendation_status,
        matched_skills=matched_items,
        missing_skills=missing_items,
        explanation=expl_detail,
        feedback=fb_detail,
        created_at=res.created_at
    )

@router.post("/run", response_model=JobRankingSummary)
def run_job_matching(
    match_req: MatchJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    """
    Executes two-layer semantic screening + XAI explanation generation
    for candidate resumes against the selected job post.
    """
    job = db.query(Job).filter(Job.job_id == match_req.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Fetch candidate resumes
    query = db.query(Resume)
    if match_req.resume_ids:
        query = query.filter(Resume.resume_id.in_(match_req.resume_ids))
    else:
        # Default to all default resumes
        query = query.filter(Resume.is_default == True)
        
    resumes = query.all()
    if not resumes:
        raise HTTPException(status_code=400, detail="No resumes available for matching")

    # Clear previous match results for this job via ORM to cascade delete explanation and feedback
    old_results = db.query(MatchResult).filter(MatchResult.job_id == job.job_id).all()
    for old_r in old_results:
        db.delete(old_r)
    db.commit()

    matcher = SmartCVMatcher(
        weight_sbert=match_req.weight_sbert,
        weight_tfidf=match_req.weight_tfidf,
        weight_skills=match_req.weight_skills
    )
    explainer = XAIExplainer()

    job_skills_data = [
        {
            "skill_id": js.skill_id,
            "skill_name": js.skill.skill_name,
            "skill_type": js.skill.skill_type,
            "requirement_type": js.requirement_type,
            "weight": js.weight
        }
        for js in job.job_skills
    ]

    scored_candidates = []

    for resume in resumes:
        cand_skills_data = [
            {
                "skill_id": cs.skill_id,
                "skill_name": cs.skill.skill_name,
                "skill_type": cs.skill.skill_type,
                "evidence_text": cs.evidence_text
            }
            for cs in resume.candidate_skills
        ]

        # Calculate matched skills count for scoring
        cand_skill_names = {s["skill_name"].lower() for s in cand_skills_data}
        matched_count = sum(1 for js in job_skills_data if js["skill_name"].lower() in cand_skill_names)
        
        # Match resume against job
        try:
            match_out = matcher.match_resume_to_job(
                resume_text=resume.raw_text,
                job_text=job.raw_job_text,
                matched_skills_count=matched_count,
                total_job_skills_count=len(job_skills_data)
            )
        except SBERTModelError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Sentence-BERT Semantic Engine Error: {str(e)}"
            )

        # XAI Explanations
        matched_s, missing_s, expl_sum, app_fb = explainer.explain_match(
            job_title=job.job_title,
            job_skills=job_skills_data,
            candidate_skills=cand_skills_data,
            match_metrics=match_out
        )

        scored_candidates.append({
            "resume": resume,
            "match_out": match_out,
            "matched_s": matched_s,
            "missing_s": missing_s,
            "expl_sum": expl_sum,
            "app_fb": app_fb
        })

    # Sort descending by compatibility score
    scored_candidates.sort(key=lambda x: x["match_out"]["compatibility_score"], reverse=True)

    # Clear previous match results for this job to maintain fresh rankings and 1-to-1 integrity
    existing_results = db.query(MatchResult).filter(MatchResult.job_id == job.job_id).all()
    for er in existing_results:
        db.delete(er)
    db.commit()

    saved_results = []
    for rank_idx, item in enumerate(scored_candidates, 1):
        resume = item["resume"]
        mo = item["match_out"]

        res_record = MatchResult(
            job_id=job.job_id,
            candidate_id=resume.candidate_id,
            resume_id=resume.resume_id,
            rank_position=rank_idx,
            tfidf_score=mo["tfidf_score"],
            bert_score=mo["bert_score"],
            compatibility_score=mo["compatibility_score"],
            recommendation_status=mo["recommendation_status"]
        )
        db.add(res_record)
        db.commit()
        db.refresh(res_record)

        # Add matched skills
        for ms in item["matched_s"]:
            if ms["skill_id"]:
                db.add(MatchedSkill(
                    result_id=res_record.result_id,
                    skill_id=ms["skill_id"],
                    evidence_text=ms.get("evidence_text"),
                    contribution_score=ms.get("contribution_score", 1.0)
                ))

        # Add missing skills
        for ms in item["missing_s"]:
            if ms["skill_id"]:
                db.add(MissingSkill(
                    result_id=res_record.result_id,
                    skill_id=ms["skill_id"],
                    requirement_type=ms.get("requirement_type", "required"),
                    improvement_note=ms.get("improvement_note")
                ))

        # Add explanation summary
        expl = item["expl_sum"]
        db.add(ExplanationSummary(
            result_id=res_record.result_id,
            explanation_text=expl["explanation_text"],
            score_reason=expl["score_reason"],
            matched_skill_summary=expl["matched_skill_summary"],
            missing_skill_summary=expl["missing_skill_summary"]
        ))

        # Add applicant feedback
        fb = item["app_fb"]
        db.add(ApplicantFeedback(
            result_id=res_record.result_id,
            candidate_id=resume.candidate_id,
            feedback_text=fb["feedback_text"],
            improvement_items=fb["improvement_items"],
            missing_skill_recommendations=fb["missing_skill_recommendations"]
        ))

        db.commit()
        db.refresh(res_record)
        saved_results.append(res_record)

    # Log Audit
    log = AuditLog(
        user_id=current_user.user_id,
        action_type="MATCHING_EXECUTED",
        entity_name="Job",
        entity_id=job.job_id,
        description=f"Screened {len(resumes)} candidate resumes for Job #{job.job_id} '{job.job_title}'. Top candidate score: {saved_results[0].compatibility_score}%."
    )
    db.add(log)
    db.commit()

    detail_results = [_build_match_result_detail(r) for r in saved_results]
    return JobRankingSummary(
        job_id=job.job_id,
        job_title=job.job_title,
        total_candidates=len(detail_results),
        top_compatibility_score=detail_results[0].compatibility_score if detail_results else 0.0,
        weights_used={
            "sbert": round(float(matcher.weight_sbert), 3),
            "tfidf": round(float(matcher.weight_tfidf), 3),
            "skills": round(float(matcher.weight_skills), 3)
        },
        results=detail_results
    )

@router.get("/job/{job_id}", response_model=JobRankingSummary)
def get_job_ranking(
    job_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.RECRUITER, UserRole.ADMIN]))
):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    results = (
        db.query(MatchResult)
        .filter(MatchResult.job_id == job_id)
        .order_by(MatchResult.rank_position.asc())
        .all()
    )
    
    detail_results = [_build_match_result_detail(r) for r in results]
    top_score = detail_results[0].compatibility_score if detail_results else 0.0

    return JobRankingSummary(
        job_id=job.job_id,
        job_title=job.job_title,
        total_candidates=len(detail_results),
        top_compatibility_score=top_score,
        results=detail_results
    )

@router.get("/result/{result_id}", response_model=MatchResultDetail)
def get_match_result(
    result_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = db.query(MatchResult).filter(MatchResult.result_id == result_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Match result not found")

    # Ownership check: applicants can only view their own match results
    if current_user.role_type == UserRole.APPLICANT:
        if not current_user.candidate_profile or res.candidate_id != current_user.candidate_profile.candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this match result."
            )

    return _build_match_result_detail(res)

@router.get("/candidate/me", response_model=List[MatchResultDetail])
def get_my_candidate_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.APPLICANT, UserRole.ADMIN]))
):
    if not current_user.candidate_profile:
        return []
    cand_id = current_user.candidate_profile.candidate_id
    results = (
        db.query(MatchResult)
        .filter(MatchResult.candidate_id == cand_id)
        .order_by(MatchResult.created_at.desc())
        .all()
    )
    return [_build_match_result_detail(r) for r in results]
