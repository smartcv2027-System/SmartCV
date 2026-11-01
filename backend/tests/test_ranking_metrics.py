import math
import numpy as np
import pytest
from app.ai.evaluation.ranking_metrics import (
    compute_spearman_rho,
    compute_ndcg_at_k,
    compute_precision_at_k,
    compute_sample_std
)

def test_spearman_rho_perfect_and_inverse():
    # Perfect positive monotonic correlation
    pred_asc = [10.0, 20.0, 30.0, 40.0, 50.0]
    truth_asc = [0, 1, 2, 2, 3]
    rho = compute_spearman_rho(pred_asc, truth_asc)
    assert not np.isnan(rho)
    assert rho > 0.95

    # Inverse correlation
    pred_desc = [50.0, 40.0, 30.0, 20.0, 10.0]
    rho_inv = compute_spearman_rho(pred_desc, truth_asc)
    assert not np.isnan(rho_inv)
    assert rho_inv < -0.95

def test_spearman_rho_edge_cases():
    # Constant ground truth (zero variance) -> undefined / NaN
    constant_truth = [2, 2, 2, 2, 2]
    scores = [10.0, 25.0, 30.0, 15.0, 50.0]
    assert np.isnan(compute_spearman_rho(scores, constant_truth))

    # Constant predicted scores (zero variance) -> undefined / NaN
    constant_scores = [50.0, 50.0, 50.0, 50.0, 50.0]
    truth = [0, 1, 2, 3, 1]
    assert np.isnan(compute_spearman_rho(constant_scores, truth))

    # Empty or single element
    assert np.isnan(compute_spearman_rho([], []))
    assert np.isnan(compute_spearman_rho([1.0], [1]))

def test_ndcg_at_k_perfect_and_worst():
    # Perfect ranking matches ideal ordering
    scores = [90.0, 80.0, 70.0, 60.0, 50.0]
    truth = [3, 2, 2, 1, 0]
    ndcg = compute_ndcg_at_k(scores, truth, k=5)
    assert pytest.approx(ndcg, 0.0001) == 1.0

    # Reversed ranking
    reversed_scores = [50.0, 60.0, 70.0, 80.0, 90.0]
    ndcg_rev = compute_ndcg_at_k(reversed_scores, truth, k=5)
    assert 0.0 <= ndcg_rev < 1.0

def test_ndcg_at_k_all_zeros_edge_case():
    # When all ground truth ratings are 0, IDCG = 0, predefined return is 0.0
    scores = [90.0, 80.0, 70.0, 60.0, 50.0]
    all_zero_truth = [0, 0, 0, 0, 0]
    assert compute_ndcg_at_k(scores, all_zero_truth, k=5) == 0.0

def test_precision_at_k():
    scores = [90.0, 80.0, 70.0, 60.0, 50.0]
    # Top 5 contains: 3, 2, 1, 0, 2 -> 3 candidates >= threshold 2
    truth = [3, 2, 1, 0, 2]
    prec = compute_precision_at_k(scores, truth, k=5, relevance_threshold=2)
    assert pytest.approx(prec, 0.0001) == 3.0 / 5.0  # 0.60

def test_sample_std():
    # Standard deviation with ddof=1
    vals = [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]
    s = compute_sample_std(vals, ddof=1)
    expected_s = np.std(vals, ddof=1)
    assert pytest.approx(s, 0.0001) == expected_s

    # Single or empty element -> 0.0
    assert compute_sample_std([5.0]) == 0.0
    assert compute_sample_std([]) == 0.0
