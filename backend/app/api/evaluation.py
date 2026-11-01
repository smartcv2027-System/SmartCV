from typing import Optional
import os
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from fastapi.responses import FileResponse
from app.models.models import User, UserRole
from app.schemas.schemas import ModelEvaluationReport
from app.api.deps import require_roles
from app.ai.evaluator import run_comparative_evaluation, generate_benchmark_csv
from app.ai.evaluation.ground_truth_evaluator import run_ground_truth_evaluation
from app.ai.evaluation.ablation_runner import run_ablation_study

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

@router.get("/ground-truth")
def get_ground_truth_evaluation(
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Executes and returns the 50-pair independent ground-truth ranking validation:
    - Quadratic Weighted Cohen's Kappa (inter-rater reliability)
    - Spearman's rho (Mean +/- Std across 5 jobs)
    - nDCG@5 (Mean +/- Std across 5 jobs)
    - Precision@5 (Mean +/- Std across 5 jobs)
    - Per-job performance breakdowns across 5 Saudi tech requisitions
    - Publication LaTeX Table 7.8
    """
    report = run_ground_truth_evaluation()
    return report

@router.get("/ground-truth/csv")
def download_ground_truth_csv(
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Exports the 50-pair independent human ground-truth benchmark dataset (CSV)
    including Evaluator 1, Evaluator 2, and Adjudicated Consensus ratings.
    """
    csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "evaluation_data", "annotations.csv")
    csv_path = os.path.abspath(csv_path)
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Ground-truth annotations CSV not found")
    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename="smartcv_ground_truth_50_pairs.csv"
    )

@router.get("/ablation")
def get_ablation_evaluation(
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECRUITER]))
):
    """
    Executes and returns the 7 architectural ablation configurations and qualitative edge-case deep dives:
    - Pure SBERT (1.0, 0.0, 0.0)
    - Pure TF-IDF (0.0, 1.0, 0.0)
    - Pure Skill Overlap (0.0, 0.0, 1.0)
    - SBERT + TF-IDF (0.7143, 0.2857, 0.0)
    - SBERT + Skills (0.6250, 0.0, 0.3750)
    - TF-IDF + Skills (0.0, 0.4000, 0.6000)
    - Full Triple Hybrid (0.50, 0.20, 0.30)
    - 4 Curated Qualitative Edge-Case Deep Dives (Failure modes & recovery analyses)
    - Publication LaTeX Table 7.9
    """
    report = run_ablation_study()
    return report




