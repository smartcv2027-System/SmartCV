from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from app.models.models import User, UserRole
from app.schemas.schemas import ModelEvaluationReport
from app.api.deps import require_roles
from app.ai.evaluator import run_comparative_evaluation, generate_benchmark_csv

router = APIRouter()

@router.get("/report", response_model=ModelEvaluationReport)
def get_evaluation_report(
    track: Optional[str] = Query(None, description="Optional KKU Track to filter evaluation"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Executes and returns comparative scoring & discrimination metrics between:
    1. Baseline Keyword-Based (TF-IDF)
    2. Advanced Semantic Model (Sentence-BERT)
    3. SmartCV Hybrid Ensemble
    Calculates discrimination margins (Delta = Mean_Relevant - Mean_Negative).
    """
    report = run_comparative_evaluation(selected_track=track)
    return report

@router.get("/latex")
def get_evaluation_latex(
    track: Optional[str] = Query(None, description="Optional KKU Track to filter evaluation"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Returns publication-ready LaTeX code for Chapter 7 evaluation tables
    (Table 7.1: Model Comparison, Table 7.2: Track Breakdown).
    """
    report = run_comparative_evaluation(selected_track=track)
    return {
        "table_id": "tab:smartcv_evaluation",
        "latex_code": report.get("latex_table", ""),
        "total_samples": report.get("total_samples", 36),
        "generated_at": report.get("generated_at")
    }

@router.get("/thesis-chapter")
def get_thesis_chapter(
    track: Optional[str] = Query(None, description="Optional KKU Track to filter evaluation"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Returns the complete, publication-grade academic text for:
    Chapter 7: PROJECT TESTING (EVALUATION)
    Formatted for direct inclusion into KKU Graduation Project Report.
    """
    report = run_comparative_evaluation(selected_track=track)
    return {
        "chapter_title": "Chapter 7: PROJECT TESTING (EVALUATION)",
        "text": report.get("thesis_chapter_text", ""),
        "total_samples": report.get("total_samples", 36),
        "generated_at": report.get("generated_at")
    }

@router.get("/csv")
def download_benchmark_csv(
    track: Optional[str] = Query(None, description="Optional KKU Track to filter evaluation"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Exports and downloads the complete standardized benchmark dataset (N=36)
    with model scores and ground truth annotations as a CSV file.
    """
    report = run_comparative_evaluation(selected_track=track)
    csv_content = generate_benchmark_csv(report)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=kku_smartcv_benchmark_36.csv"
        }
    )


