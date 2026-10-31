from typing import List, Dict, Any
import numpy as np
from sklearn.metrics import cohen_kappa_score, confusion_matrix

def compute_quadratic_weighted_kappa(
    evaluator_1_ratings: List[int], 
    evaluator_2_ratings: List[int],
    labels: List[int] = None
) -> Dict[str, Any]:
    """
    Computes Quadratic Weighted Cohen's Kappa (kappa_w) to measure inter-rater agreement
    between Evaluator 1 and Evaluator 2 before adjudication of disagreements.
    
    Formula:
        kappa_w = 1 - (sum(w_ij * O_ij) / sum(w_ij * E_ij))
        where w_ij = (i - j)^2 / (k - 1)^2
        
    Returns:
        Dict containing:
        - kappa: float (Quadratic weighted kappa)
        - unweighted_kappa: float (Standard unweighted kappa)
        - exact_agreement_rate: float (Percentage of identical ratings)
        - total_pairs: int
        - confusion_matrix: List[List[int]]
        - agreement_level: str (Interpretation according to Landis & Koch, 1977)
    """
    if len(evaluator_1_ratings) != len(evaluator_2_ratings):
        raise ValueError("Evaluator rating lists must have identical lengths.")
        
    n = len(evaluator_1_ratings)
    if n == 0:
        return {
            "kappa": float("nan"),
            "unweighted_kappa": float("nan"),
            "exact_agreement_rate": 0.0,
            "total_pairs": 0,
            "confusion_matrix": [],
            "agreement_level": "Undefined"
        }
        
    if labels is None:
        labels = [0, 1, 2, 3]
        
    qw_kappa = cohen_kappa_score(evaluator_1_ratings, evaluator_2_ratings, labels=labels, weights="quadratic")
    raw_kappa = cohen_kappa_score(evaluator_1_ratings, evaluator_2_ratings, labels=labels)
    
    # Exact agreement
    exact_matches = sum(1 for a, b in zip(evaluator_1_ratings, evaluator_2_ratings) if a == b)
    exact_rate = round(float(exact_matches / n) * 100.0, 2)
    
    cm = confusion_matrix(evaluator_1_ratings, evaluator_2_ratings, labels=labels).tolist()
    
    # Landis & Koch (1977) benchmark interpretations
    if qw_kappa > 0.80:
        level = "Almost Perfect Agreement"
    elif qw_kappa > 0.60:
        level = "Substantial Agreement"
    elif qw_kappa > 0.40:
        level = "Moderate Agreement"
    elif qw_kappa > 0.20:
        level = "Fair Agreement"
    else:
        level = "Slight / Poor Agreement"
        
    return {
        "quadratic_weighted_kappa": round(float(qw_kappa), 4),
        "unweighted_kappa": round(float(raw_kappa), 4),
        "exact_agreement_rate": exact_rate,
        "exact_matches_count": exact_matches,
        "total_pairs": n,
        "confusion_matrix": cm,
        "agreement_level": level
    }
