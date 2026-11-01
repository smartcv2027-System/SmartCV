import os
import csv
import json
from typing import Dict, Any, List

def get_evaluation_data_dir() -> str:
    """Returns absolute path to backend/evaluation_data directory."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../evaluation_data"))
    if not os.path.isdir(base_dir):
        # Fallback to current working directory relative path
        alt_dir = os.path.abspath(os.path.join(os.getcwd(), "evaluation_data"))
        if os.path.isdir(alt_dir):
            return alt_dir
        alt_backend_dir = os.path.abspath(os.path.join(os.getcwd(), "backend/evaluation_data"))
        if os.path.isdir(alt_backend_dir):
            return alt_backend_dir
    return base_dir

def load_benchmark_data(data_dir: str = None) -> Dict[str, Any]:
    """
    Loads and validates the 50-pair independent ground-truth evaluation benchmark.
    
    Returns:
        Dict containing:
        - "config": Parsed evaluation_config.json
        - "jobs": List of 5 job dictionaries
        - "resumes": Dict mapping resume_id -> resume dictionary (10 resumes)
        - "annotations": List of 50 annotation records
        - "pairs_by_job": Dict mapping job_id -> List of 10 pairs with resume data & consensus ratings
    """
    if data_dir is None:
        data_dir = get_evaluation_data_dir()
        
    config_path = os.path.join(data_dir, "evaluation_config.json")
    jobs_path = os.path.join(data_dir, "jobs.json")
    resumes_path = os.path.join(data_dir, "resumes.json")
    annotations_path = os.path.join(data_dir, "annotations.csv")
    
    for path, name in [
        (config_path, "evaluation_config.json"),
        (jobs_path, "jobs.json"),
        (resumes_path, "resumes.json"),
        (annotations_path, "annotations.csv")
    ]:
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Benchmark file '{name}' not found at: {path}")
            
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
        
    with open(jobs_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)
        
    with open(resumes_path, "r", encoding="utf-8") as f:
        resumes_list = json.load(f)
        
    resumes_by_id = {r["id"]: r for r in resumes_list}
    jobs_by_id = {j["id"]: j for j in jobs}
    
    annotations = []
    with open(annotations_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            annotations.append({
                "pair_id": row["pair_id"].strip(),
                "job_id": row["job_id"].strip(),
                "resume_id": row["resume_id"].strip(),
                "evaluator_1": int(row["evaluator_1"]),
                "evaluator_2": int(row["evaluator_2"]),
                "consensus_label": int(row["consensus_label"]),
                "notes": row.get("notes", "").strip()
            })
            
    # Validate integrity
    if len(annotations) != 50:
        raise ValueError(f"Expected exactly 50 benchmark pairs, found {len(annotations)}.")
    if len(jobs) != 5:
        raise ValueError(f"Expected exactly 5 job descriptions, found {len(jobs)}.")
    if len(resumes_by_id) != 10:
        raise ValueError(f"Expected exactly 10 candidate resumes, found {len(resumes_by_id)}.")
        
    pairs_by_job: Dict[str, List[Dict[str, Any]]] = {j["id"]: [] for j in jobs}
    for ann in annotations:
        jid = ann["job_id"]
        rid = ann["resume_id"]
        if jid not in jobs_by_id:
            raise KeyError(f"Annotation references unknown job_id '{jid}'")
        if rid not in resumes_by_id:
            raise KeyError(f"Annotation references unknown resume_id '{rid}'")
            
        pairs_by_job[jid].append({
            "pair_id": ann["pair_id"],
            "job": jobs_by_id[jid],
            "resume": resumes_by_id[rid],
            "evaluator_1": ann["evaluator_1"],
            "evaluator_2": ann["evaluator_2"],
            "consensus_label": ann["consensus_label"],
            "notes": ann["notes"]
        })
        
    return {
        "config": config,
        "jobs": jobs,
        "resumes": resumes_by_id,
        "annotations": annotations,
        "pairs_by_job": pairs_by_job
    }
