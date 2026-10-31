import pytest
from app.ai.evaluation.inter_rater import compute_quadratic_weighted_kappa

def test_inter_rater_perfect_agreement():
    e1 = [0, 1, 2, 3, 0, 1, 2, 3]
    e2 = [0, 1, 2, 3, 0, 1, 2, 3]
    res = compute_quadratic_weighted_kappa(e1, e2)
    assert res["quadratic_weighted_kappa"] == 1.0
    assert res["exact_agreement_rate"] == 100.0
    assert res["agreement_level"] == "Almost Perfect Agreement"

def test_inter_rater_quadratic_penalty():
    # 1-point differences vs 3-point differences
    e1 = [0, 1, 2, 3]
    e2_minor = [1, 2, 3, 2]  # Off by 1
    e2_major = [3, 2, 1, 0]  # Severe disagreement

    res_minor = compute_quadratic_weighted_kappa(e1, e2_minor)
    res_major = compute_quadratic_weighted_kappa(e1, e2_major)

    assert res_minor["quadratic_weighted_kappa"] > res_major["quadratic_weighted_kappa"]

def test_inter_rater_mismatched_lengths():
    with pytest.raises(ValueError):
        compute_quadratic_weighted_kappa([1, 2], [1])
