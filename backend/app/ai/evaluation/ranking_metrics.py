import math
import numpy as np
from typing import List, Union
from scipy import stats

def compute_spearman_rho(predicted_scores: List[float], ground_truth: List[int]) -> float:
    """
    Computes Spearman's rank correlation coefficient (rho) using scipy.stats.spearmanr.
    
    Handles ties by assigning fractional average ranks.
    Edge cases handled:
    - If all ground truth values are identical (zero variance), correlation is undefined -> returns NaN.
    - If all predicted scores are identical (zero variance), correlation is undefined -> returns NaN.
    - If fewer than 2 elements, returns NaN.
    """
    if len(predicted_scores) < 2 or len(ground_truth) < 2:
        return float("nan")
        
    # Check for zero variance in either array
    if len(set(ground_truth)) <= 1 or len(set(predicted_scores)) <= 1:
        return float("nan")
        
    res = stats.spearmanr(predicted_scores, ground_truth)
    rho = getattr(res, "statistic", None)
    if rho is None:
        rho = res[0]  # Backward compatibility for older scipy tuple returns
        
    return float(rho) if not np.isnan(rho) else float("nan")


def compute_ndcg_at_k(predicted_scores: List[float], ground_truth: List[int], k: int = 5) -> float:
    """
    Computes Normalized Discounted Cumulative Gain at rank K (nDCG@K) using exponential gain.
    
    Formula:
        DCG@K = sum_{i=1}^K (2^{rel_i} - 1) / log2(i + 1)
        nDCG@K = DCG@K / IDCG@K
        
    Edge cases handled:
    - Stable tie-breaking for equal predicted scores using item index.
    - If IDCG == 0 (all ground truth relevance ratings are 0), returns 0.0 by predefined convention.
    - If K <= 0 or empty input, returns 0.0.
    """
    n = len(predicted_scores)
    if n == 0 or len(ground_truth) == 0 or k <= 0:
        return 0.0
        
    actual_k = min(k, n)
    
    # Stable sort: primary key = -score (descending), secondary key = index (ascending for stability)
    ranked_indices = sorted(range(n), key=lambda idx: (-predicted_scores[idx], idx))
    
    # Compute DCG@K
    dcg = 0.0
    for rank_pos in range(actual_k):
        item_idx = ranked_indices[rank_pos]
        rel = ground_truth[item_idx]
        gain = (2.0 ** rel) - 1.0
        discount = math.log2((rank_pos + 1) + 1.0)
        dcg += gain / discount
        
    # Compute Ideal DCG (IDCG@K)
    sorted_relevance = sorted(ground_truth, reverse=True)
    idcg = 0.0
    for rank_pos in range(actual_k):
        rel = sorted_relevance[rank_pos]
        gain = (2.0 ** rel) - 1.0
        discount = math.log2((rank_pos + 1) + 1.0)
        idcg += gain / discount
        
    if idcg <= 0.0:
        return 0.0
        
    return float(np.clip(dcg / idcg, 0.0, 1.0))


def compute_precision_at_k(
    predicted_scores: List[float], 
    ground_truth: List[int], 
    k: int = 5, 
    relevance_threshold: int = 2
) -> float:
    """
    Computes Precision at rank K (Precision@K).
    
    A candidate is defined as relevant if ground_truth >= relevance_threshold (Default: 2, Medium or High match).
    
    Formula:
        Precision@K = |{i in [1, K] | rel_i >= threshold}| / K
        
    Edge cases handled:
    - Stable tie-breaking using item index.
    - If K <= 0 or empty input, returns 0.0.
    """
    n = len(predicted_scores)
    if n == 0 or len(ground_truth) == 0 or k <= 0:
        return 0.0
        
    actual_k = min(k, n)
    
    # Stable sort by predicted score descending
    ranked_indices = sorted(range(n), key=lambda idx: (-predicted_scores[idx], idx))
    
    relevant_count = 0
    for rank_pos in range(actual_k):
        item_idx = ranked_indices[rank_pos]
        if ground_truth[item_idx] >= relevance_threshold:
            relevant_count += 1
            
    return float(relevant_count / float(k))


def compute_sample_std(values: List[float], ddof: int = 1) -> float:
    """
    Computes the sample standard deviation with Bessel's correction (ddof=1).
    
    Formula:
        s = sqrt( sum((x_j - x_bar)^2) / (N - 1) )
        
    If N <= 1, returns 0.0. Ignores NaN values if computing over partially valid arrays.
    """
    valid_vals = [v for v in values if not np.isnan(v)]
    if len(valid_vals) <= 1:
        return 0.0
    return float(np.std(valid_vals, ddof=ddof))
