import numpy as np
import pytest
from app.ai.evaluation.benchmark_loader import load_benchmark_data
from app.ai.evaluation.ground_truth_evaluator import run_ground_truth_evaluation

def test_benchmark_data_integrity():
    data = load_benchmark_data()
    assert len(data["jobs"]) == 5
    assert len(data["resumes"]) == 10
    assert len(data["annotations"]) == 50
    assert len(data["pairs_by_job"]) == 5

    for jid, pairs in data["pairs_by_job"].items():
        assert len(pairs) == 10
        for p in pairs:
            assert p["evaluator_1"] in [0, 1, 2, 3]
            assert p["evaluator_2"] in [0, 1, 2, 3]
            assert p["consensus_label"] in [0, 1, 2, 3]

def test_ground_truth_evaluation_pipeline_execution():
    """
    Verifies that the independent human ground-truth ranking evaluation pipeline
    executes without error and produces mathematically bounded metric outputs.
    Note: In accordance with scientific integrity guidelines, this test asserts
    structural validity and boundaries without assuming in advance which model wins.
    """
    report = run_ground_truth_evaluation()
    
    assert report["benchmark_pairs_total"] == 50
    assert report["jobs_evaluated_count"] == 5

    # 1. Verify Inter-Rater Reliability metrics
    irr = report["inter_rater_reliability"]
    assert "quadratic_weighted_kappa" in irr
    assert -1.0 <= irr["quadratic_weighted_kappa"] <= 1.0
    assert 0.0 <= irr["exact_agreement_rate"] <= 100.0
    assert irr["total_pairs"] == 50

    # 2. Verify Per-Job Model Evaluations
    per_job = report["per_job_evaluations"]
    assert len(per_job) == 5

    expected_models = [
        "Baseline Keyword (TF-IDF)",
        "Advanced Semantic (Sentence-BERT)",
        "SmartCV Hybrid Ensemble"
    ]

    for pj in per_job:
        assert len(pj["consensus_labels"]) == 10
        assert pj["candidate_count"] == 10
        
        for mname in expected_models:
            assert mname in pj["models"]
            m_res = pj["models"][mname]
            
            # Scores must have 10 values
            assert len(m_res["scores"]) == 10
            
            # Spearman rho: either float in [-1, 1] or None if undefined/NaN
            if m_res["spearman_rho"] is not None:
                assert -1.0 <= m_res["spearman_rho"] <= 1.0
                
            # nDCG@5 in [0, 1]
            assert 0.0 <= m_res["ndcg_at_5"] <= 1.0
            
            # Precision@5 in [0, 1]
            assert 0.0 <= m_res["precision_at_5"] <= 1.0

    # 3. Verify Aggregated Summary Metrics across 5 jobs
    summary = report["summary_metrics"]
    assert len(summary) == 3

    for sm in summary:
        assert sm["model_name"] in expected_models
        if sm["spearman_rho_mean"] is not None:
            assert -1.0 <= sm["spearman_rho_mean"] <= 1.0
        assert 0.0 <= sm["ndcg_at_5_mean"] <= 1.0
        assert 0.0 <= sm["precision_at_5_mean"] <= 1.0
        assert sm["spearman_rho_std"] >= 0.0
        assert sm["ndcg_at_5_std"] >= 0.0
        assert sm["precision_at_5_std"] >= 0.0

    # 4. Verify LaTeX Table Output
    latex_tbl = report["latex_table"]
    assert r"\begin{table}" in latex_tbl
    assert "tab:ground_truth_validation" in latex_tbl
    assert r"\end{table}" in latex_tbl
