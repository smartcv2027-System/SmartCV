import pytest
import numpy as np
from app.ai.evaluation.ablation_runner import (
    ABLATION_CONFIGS,
    QUALITATIVE_EDGE_CASES,
    run_ablation_study
)

def test_ablation_configurations_count_and_weights():
    """Verify that all 7 ablation setups are defined and weights sum to approximately 1.0."""
    assert len(ABLATION_CONFIGS) == 7
    expected_ids = [
        "pure_sbert",
        "pure_tfidf",
        "pure_skills",
        "no_skills",
        "no_tfidf",
        "no_sbert",
        "full_hybrid"
    ]
    for cfg in ABLATION_CONFIGS:
        assert cfg["id"] in expected_ids
        w = cfg["weights"]
        total_w = w["sbert"] + w["tfidf"] + w["skills"]
        assert pytest.approx(total_w, abs=1e-3) == 1.0

def test_ablation_execution_and_metrics_bounds():
    """Verify that run_ablation_study executes cleanly and produces bounded metrics."""
    report = run_ablation_study()
    assert report["benchmark_pairs_total"] == 50
    assert report["jobs_evaluated_count"] == 5
    assert len(report["ablation_configurations"]) == 7
    assert len(report["edge_case_deep_dives"]) == 4
    assert r"\begin{table}" in report["latex_table"]

    for res in report["ablation_configurations"]:
        assert "config_id" in res
        assert "config_name" in res
        assert "spearman_rho_mean" in res
        if res["spearman_rho_mean"] is not None:
            assert -1.0 <= res["spearman_rho_mean"] <= 1.0
            assert res["spearman_rho_std"] >= 0.0

        assert 0.0 <= res["ndcg_at_5_mean"] <= 1.0
        assert res["ndcg_at_5_std"] >= 0.0

        assert 0.0 <= res["precision_at_5_mean"] <= 1.0
        assert res["precision_at_5_std"] >= 0.0

def test_qualitative_edge_cases_structure():
    """Verify the 4 qualitative failure modes are structurally complete."""
    assert len(QUALITATIVE_EDGE_CASES) == 4
    for ec in QUALITATIVE_EDGE_CASES:
        assert "case_id" in ec
        assert "failure_mode" in ec
        assert "job_id" in ec
        assert "resume_id" in ec
        assert ec["human_consensus_label"] in [0, 1, 2, 3]
        assert len(ec["resume_snippet"]) > 20
        assert len(ec["analysis"]) > 50
        assert 0.0 <= ec["pure_sbert_score"] <= 100.0
        assert 0.0 <= ec["pure_tfidf_score"] <= 100.0
        assert 0.0 <= ec["pure_skills_score"] <= 100.0
        assert 0.0 <= ec["hybrid_score"] <= 100.0
