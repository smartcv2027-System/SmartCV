"""
SmartCV Independent Human Ground-Truth Evaluation Package.
Provides modules for benchmark loading, ranking metrics, inter-rater reliability,
and model ranking evaluation across the 50-pair ground-truth dataset.
"""

from app.ai.evaluation.ranking_metrics import (
    compute_spearman_rho,
    compute_ndcg_at_k,
    compute_precision_at_k,
    compute_sample_std
)
from app.ai.evaluation.inter_rater import compute_quadratic_weighted_kappa
from app.ai.evaluation.benchmark_loader import load_benchmark_data
from app.ai.evaluation.ground_truth_evaluator import run_ground_truth_evaluation

__all__ = [
    "compute_spearman_rho",
    "compute_ndcg_at_k",
    "compute_precision_at_k",
    "compute_sample_std",
    "compute_quadratic_weighted_kappa",
    "load_benchmark_data",
    "run_ground_truth_evaluation"
]
