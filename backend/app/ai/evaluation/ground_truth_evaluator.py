import time
import numpy as np
from typing import Dict, Any, List
from app.ai.matcher import SmartCVMatcher, get_sbert_model
from app.ai.taxonomy import extract_skills_from_text
from app.ai.evaluation.benchmark_loader import load_benchmark_data
from app.ai.evaluation.ranking_metrics import (
    compute_spearman_rho,
    compute_ndcg_at_k,
    compute_precision_at_k,
    compute_sample_std
)
from app.ai.evaluation.inter_rater import compute_quadratic_weighted_kappa

def run_ground_truth_evaluation(data_dir: str = None) -> Dict[str, Any]:
    """
    Executes the independent human ground-truth ranking evaluation across the 50-pair benchmark.
    
    Evaluates:
    1. Baseline Keyword (TF-IDF + Cosine Similarity)
    2. Dense Semantic (Sentence-BERT + Cosine Similarity)
    3. SmartCV Hybrid Ensemble (50% SBERT + 20% TF-IDF + 30% Skill Overlap)
    
    Computes per-job metrics and aggregates Mean +/- Sample Standard Deviation across 5 jobs.
    """
    benchmark = load_benchmark_data(data_dir=data_dir)
    config = benchmark["config"]
    jobs = benchmark["jobs"]
    pairs_by_job = benchmark["pairs_by_job"]
    annotations = benchmark["annotations"]
    
    # 1. Inter-Rater Reliability prior to adjudication
    e1_ratings = [a["evaluator_1"] for a in annotations]
    e2_ratings = [a["evaluator_2"] for a in annotations]
    inter_rater_results = compute_quadratic_weighted_kappa(e1_ratings, e2_ratings)
    
    # 2. Initialize real SmartCVMatcher with frozen configuration weights
    frozen_weights = config.get("hybrid_weights", {"sbert": 0.50, "tfidf": 0.20, "skills": 0.30})
    matcher = SmartCVMatcher(
        weight_sbert=frozen_weights["sbert"],
        weight_tfidf=frozen_weights["tfidf"],
        weight_skills=frozen_weights["skills"]
    )
    
    # Pre-warm SBERT model
    _ = get_sbert_model()
    
    k_eval = config.get("ndcg_k", 5)
    prec_thresh = config.get("precision_relevance_threshold", 2)
    
    model_names = [
        "Baseline Keyword (TF-IDF)",
        "Advanced Semantic (Sentence-BERT)",
        "SmartCV Hybrid Ensemble"
    ]
    
    per_job_results = []
    
    # Accumulators across the 5 jobs
    job_metrics: Dict[str, Dict[str, List[float]]] = {
        m: {"spearman": [], "ndcg_at_5": [], "precision_at_5": []}
        for m in model_names
    }
    
    for job in jobs:
        jid = job["id"]
        jtitle = job["title"]
        jtext = job["description"]
        required_skills = [s.lower() for s in job.get("required_skills", [])]
        pairs = pairs_by_job[jid]
        
        consensus_labels = [p["consensus_label"] for p in pairs]
        
        # Compute model scores for each of the 10 resumes
        tfidf_scores = []
        sbert_scores = []
        hybrid_scores = []
        
        for p in pairs:
            rtext = p["resume"]["text"]
            
            # TF-IDF Cosine
            t_sim = matcher.compute_tfidf_similarity(rtext, jtext) * 100.0
            tfidf_scores.append(round(float(t_sim), 2))
            
            # Sentence-BERT Cosine
            s_sim = matcher.compute_sbert_similarity(rtext, jtext) * 100.0
            sbert_scores.append(round(float(s_sim), 2))
            
            # Hybrid Score using genuine project taxonomy matching
            cand_skills = extract_skills_from_text(rtext)
            cand_skill_names = {s["skill_name"].lower() for s in cand_skills}
            matched_count = len(cand_skill_names.intersection(required_skills))
            total_required = max(1, len(required_skills))
            
            hybrid_res = matcher.match_resume_to_job(rtext, jtext, matched_count, total_required)
            hybrid_scores.append(round(float(hybrid_res["compatibility_score"]), 2))
            
        scores_by_model = {
            "Baseline Keyword (TF-IDF)": tfidf_scores,
            "Advanced Semantic (Sentence-BERT)": sbert_scores,
            "SmartCV Hybrid Ensemble": hybrid_scores
        }
        
        job_eval_entry = {
            "job_id": jid,
            "job_title": jtitle,
            "candidate_count": len(pairs),
            "consensus_labels": consensus_labels,
            "models": {}
        }
        
        for mname, scores in scores_by_model.items():
            rho = compute_spearman_rho(scores, consensus_labels)
            ndcg = compute_ndcg_at_k(scores, consensus_labels, k=k_eval)
            prec = compute_precision_at_k(scores, consensus_labels, k=k_eval, relevance_threshold=prec_thresh)
            
            job_metrics[mname]["spearman"].append(rho)
            job_metrics[mname]["ndcg_at_5"].append(ndcg)
            job_metrics[mname]["precision_at_5"].append(prec)
            
            job_eval_entry["models"][mname] = {
                "scores": scores,
                "spearman_rho": round(rho, 4) if not np.isnan(rho) else None,
                "ndcg_at_5": round(ndcg, 4),
                "precision_at_5": round(prec, 4)
            }
            
        per_job_results.append(job_eval_entry)
        
    # Aggregate Mean and Sample Standard Deviation across 5 jobs
    summary_metrics = []
    for mname in model_names:
        m_rhos = job_metrics[mname]["spearman"]
        m_ndcgs = job_metrics[mname]["ndcg_at_5"]
        m_precs = job_metrics[mname]["precision_at_5"]
        
        valid_rhos = [r for r in m_rhos if r is not None and not np.isnan(r)]
        rho_mean = float(np.mean(valid_rhos)) if valid_rhos else float("nan")
        rho_std = compute_sample_std(valid_rhos, ddof=1)
        
        ndcg_mean = float(np.mean(m_ndcgs))
        ndcg_std = compute_sample_std(m_ndcgs, ddof=1)
        
        prec_mean = float(np.mean(m_precs))
        prec_std = compute_sample_std(m_precs, ddof=1)
        
        summary_metrics.append({
            "model_name": mname,
            "spearman_rho_mean": round(rho_mean, 4) if not np.isnan(rho_mean) else None,
            "spearman_rho_std": round(rho_std, 4),
            "ndcg_at_5_mean": round(ndcg_mean, 4),
            "ndcg_at_5_std": round(ndcg_std, 4),
            "precision_at_5_mean": round(prec_mean, 4),
            "precision_at_5_std": round(prec_std, 4)
        })
        
    report = {
        "benchmark_pairs_total": len(annotations),
        "jobs_evaluated_count": len(jobs),
        "inter_rater_reliability": inter_rater_results,
        "per_job_evaluations": per_job_results,
        "summary_metrics": summary_metrics,
        "latex_table": generate_ground_truth_latex_table(summary_metrics, inter_rater_results)
    }
    
    return report

def generate_ground_truth_latex_table(summary_metrics: List[Dict[str, Any]], inter_rater: Dict[str, Any]) -> str:
    """Generates publication-quality LaTeX table for thesis documentation."""
    kappa_val = inter_rater.get("quadratic_weighted_kappa", 0.0)
    lines = [
        r"% --- Table 7.8: Independent Ground-Truth Ranking Validation ---",
        r"\begin{table}[htbp]",
        r"\centering",
        rf"\caption{{Independent Human Ground-Truth Evaluation on 50 Resume--Job Pairs (Inter-Rater $\kappa_w = {kappa_val:.4f}$)}}",
        r"\label{tab:ground_truth_validation}",
        r"\begin{tabular}{lccc}",
        r"\hline",
        r"\textbf{Ranking Model} & \textbf{Spearman's $\rho$ (Mean $\pm$ Std)} & \textbf{nDCG@5 (Mean $\pm$ Std)} & \textbf{Precision@5 (Mean $\pm$ Std)} \\",
        r"\hline"
    ]
    for sm in summary_metrics:
        name = sm["model_name"]
        rho_str = f"{sm['spearman_rho_mean']:.4f} \\pm {sm['spearman_rho_std']:.4f}" if sm['spearman_rho_mean'] is not None else "N/A"
        ndcg_str = f"{sm['ndcg_at_5_mean']:.4f} \\pm {sm['ndcg_at_5_std']:.4f}"
        prec_str = f"{sm['precision_at_5_mean']:.4f} \\pm {sm['precision_at_5_std']:.4f}"
        
        if "Hybrid" in name:
            lines.append(rf"\textbf{{{name}}} & \textbf{{{rho_str}}} & \textbf{{{ndcg_str}}} & \textbf{{{prec_str}}} \\")
        else:
            lines.append(rf"{name} & {rho_str} & {ndcg_str} & {prec_str} \\")
            
    lines.extend([
        r"\hline",
        r"\end{tabular}",
        r"\end{table}"
    ])
    return "\n".join(lines)

if __name__ == "__main__":
    report = run_ground_truth_evaluation()
    print("================================================================================")
    print("      SmartCV 50-Pair Independent Ground-Truth Ranking Evaluation Report        ")
    print("================================================================================")
    irr = report["inter_rater_reliability"]
    print(f"Inter-Rater Reliability (Quadratic Weighted Cohen's Kappa): {irr['quadratic_weighted_kappa']:.4f} ({irr['agreement_level']})")
    print(f"Raw Exact Agreement: {irr['exact_agreement_rate']}% ({irr['exact_matches_count']}/{irr['total_pairs']} pairs)")
    print("--------------------------------------------------------------------------------")
    print(f"{'Model Architecture':<36} | {'Spearman rho':<18} | {'nDCG@5':<16} | {'Precision@5':<16}")
    print("--------------------------------------------------------------------------------")
    for sm in report["summary_metrics"]:
        rho_txt = f"{sm['spearman_rho_mean']:.4f} +/- {sm['spearman_rho_std']:.4f}"
        ndcg_txt = f"{sm['ndcg_at_5_mean']:.4f} +/- {sm['ndcg_at_5_std']:.4f}"
        prec_txt = f"{sm['precision_at_5_mean']:.4f} +/- {sm['precision_at_5_std']:.4f}"
        print(f"{sm['model_name']:<36} | {rho_txt:<18} | {ndcg_txt:<16} | {prec_txt:<16}")
    print("================================================================================")
    print("\nPer-Job Performance Breakdown:")
    for pj in report["per_job_evaluations"]:
        print(f"\n[Job {pj['job_id']}: {pj['job_title']}]")
        for mname, mres in pj["models"].items():
            print(f"  - {mname:<34}: rho={mres['spearman_rho']}, nDCG@5={mres['ndcg_at_5']:.4f}, P@5={mres['precision_at_5']:.4f}")
