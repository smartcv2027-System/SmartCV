import pytest
from app.ai.preprocessor import clean_text, tokenize, preprocess_for_tfidf, extract_sections
from app.ai.taxonomy import extract_skills_from_text
from app.ai.matcher import SmartCVMatcher
from app.ai.xai_explainer import XAIExplainer
from app.ai.evaluator import run_comparative_evaluation

def test_text_cleaning_and_tokenization():
    raw = "Hello! Check https://example.com and contact test@kku.edu.sa for Python & FastAPI."
    cleaned = clean_text(raw)
    assert "https" not in cleaned
    assert "test@kku.edu.sa" not in cleaned
    assert "Python" in cleaned
    
    tokens = tokenize("Machine Learning & Data Analysis")
    assert "machine" in tokens
    assert "learning" in tokens
    assert "data" in tokens
    assert "analysis" in tokens

def test_skill_extraction_with_evidence():
    text = """
    EXPERIENCE
    Worked as an intern developing REST APIs using FastAPI and querying PostgreSQL databases.
    Implemented data visualization dashboards with Power BI.
    """
    skills = extract_skills_from_text(text)
    skill_names = [s["skill_name"] for s in skills]
    
    assert "FastAPI" in skill_names
    assert "PostgreSQL" in skill_names
    assert "Power BI" in skill_names
    
    # Check evidence extraction
    fastapi_skill = next(s for s in skills if s["skill_name"] == "FastAPI")
    assert "FastAPI" in fastapi_skill["evidence_text"]
    assert fastapi_skill["confidence_score"] > 0.8

def test_matcher_two_layer_and_hybrid():
    matcher = SmartCVMatcher()
    resume = "Senior student skilled in Python, Machine Learning, SQL, and FastAPI."
    job = "Hiring Junior AI Engineer with Python, Machine Learning, and SQL skills."
    
    res = matcher.match_resume_to_job(
        resume_text=resume,
        job_text=job,
        matched_skills_count=3,
        total_job_skills_count=3
    )
    
    assert res["compatibility_score"] > 50.0
    assert res["recommendation_status"] in ["Strong Match", "Good Match"]
    assert "tfidf_score" in res
    assert "bert_score" in res

def test_sbert_strict_mode_no_silent_fallback(monkeypatch):
    from app.ai.matcher import SmartCVMatcher, SBERTModelError
    import app.ai.matcher as matcher_module

    matcher = SmartCVMatcher()

    # Simulate SBERT model failure
    def mock_broken_get_sbert():
        raise SBERTModelError("Simulated neural model failure")

    monkeypatch.setattr(matcher_module, "get_sbert_model", mock_broken_get_sbert)

    # In strict mode, compute_sbert_similarity MUST raise SBERTModelError and NOT return fake character TF-IDF
    with pytest.raises(SBERTModelError):
        matcher.compute_sbert_similarity("Python developer", "Hiring Python developer")

def test_xai_explainer():
    explainer = XAIExplainer()
    job_skills = [
        {"skill_id": 1, "skill_name": "Python", "skill_type": "technical", "requirement_type": "required", "weight": 1.5},
        {"skill_id": 2, "skill_name": "Docker", "skill_type": "tool", "requirement_type": "required", "weight": 1.0}
    ]
    candidate_skills = [
        {"skill_id": 1, "skill_name": "Python", "skill_type": "technical", "evidence_text": "Proficient in Python programming."}
    ]
    match_metrics = {
        "compatibility_score": 65.0,
        "bert_score": 70.0,
        "tfidf_score": 60.0,
        "recommendation_status": "Good Match"
    }
    
    matched, missing, expl, fb = explainer.explain_match("Junior Developer", job_skills, candidate_skills, match_metrics)
    
    assert len(matched) == 1
    assert matched[0]["skill_name"] == "Python"
    assert len(missing) == 1
    assert missing[0]["skill_name"] == "Docker"
    assert "score_reason" in expl
    assert "feedback_text" in fb
    assert len(fb["missing_skill_recommendations"]) > 0

def test_comparative_evaluation():
    report = run_comparative_evaluation()
    assert "metrics" in report
    assert len(report["metrics"]) == 3
    assert report["total_samples"] == 36
    assert report["relevant_samples"] == 22
    assert report["negative_control_samples"] == 14
    
    # Assert scoring metrics across models
    tfidf_m = report["metrics"][0]
    sbert_m = report["metrics"][1]
    hybrid_m = report["metrics"][2]
    
    assert tfidf_m["mean_score_relevant"] > 0
    assert sbert_m["mean_score_relevant"] > 60.0
    assert hybrid_m["mean_score_relevant"] > 60.0
    
    # Negative controls must be heavily penalized
    assert tfidf_m["mean_score_negative"] < 10.0
    assert hybrid_m["mean_score_negative"] < 15.0
    
    # SmartCV Hybrid must demonstrate superior discrimination margin (Delta > 50%)
    assert hybrid_m["discrimination_margin"] > 50.0
    assert hybrid_m["discrimination_margin"] >= sbert_m["discrimination_margin"]
    
    # Assert track breakdown across 6 KKU tracks
    assert "track_breakdown" in report
    assert len(report["track_breakdown"]) == 6
    
    # Assert qualitative case studies (RQ1 vocabulary mismatch)
    assert "case_studies" in report
    assert len(report["case_studies"]) == 3
    assert any(cs["id"] == "SE-02" for cs in report["case_studies"])
    
    # Assert Thesis Chapter 7 publication text and LaTeX table
    assert "thesis_chapter_text" in report
    assert "Chapter 7: PROJECT TESTING (EVALUATION)" in report["thesis_chapter_text"]
    assert "latex_table" in report
    assert r"\begin{table}" in report["latex_table"]
    assert "tab:smartcv_evaluation" in report["latex_table"]

def test_evaluation_track_filter_and_csv():
    from app.ai.evaluator import generate_benchmark_csv
    
    # Test track filtering
    report_ai = run_comparative_evaluation(selected_track="AI & Machine Learning")
    assert report_ai["total_samples"] == 6
    assert report_ai["relevant_samples"] == 5
    assert report_ai["negative_control_samples"] == 1
    
    # Test CSV generation
    csv_text = generate_benchmark_csv()
    assert "sample_id,track,ground_truth_label" in csv_text
    assert "AI-01" in csv_text
    assert "NEG-01" in csv_text
    lines = csv_text.strip().split("\n")
    # 1 header + 36 samples = 37 lines
    assert len(lines) == 37


def test_skill_alias_normalization():
    from app.ai.taxonomy import normalize_skill_name
    assert normalize_skill_name("k8s") == "Kubernetes"
    assert normalize_skill_name("js") == "JavaScript"
    assert normalize_skill_name("ts") == "TypeScript"
    assert normalize_skill_name("postgres") == "PostgreSQL"
    assert normalize_skill_name("cpp") == "C++"
    assert normalize_skill_name("c#") == "C#"
    assert normalize_skill_name(".net") == ".NET"
    assert normalize_skill_name("ml") == "Machine Learning"
    assert normalize_skill_name("dl") == "Deep Learning"
    assert normalize_skill_name("nlp") == "Natural Language Processing (NLP)"

def test_symbol_safe_skill_extraction():
    text = "Proficient in C++, C#, .NET Core, and CI/CD pipelines."
    skills = extract_skills_from_text(text)
    names = [s["skill_name"] for s in skills]
    
    assert "C++" in names
    assert "C#" in names
    assert ".NET" in names
    assert "CI/CD Pipelines" in names
    
    cpp_skill = next(s for s in skills if s["skill_name"] == "C++")
    assert "C++" in cpp_skill["evidence_text"]

def test_acronym_collision_guards():
    text = "This resume is for John C. Doe who likes to go hiking in the park and read a book."
    skills = extract_skills_from_text(text)
    names = [s["skill_name"] for s in skills]
    
    # Crucial negative tests: should NOT trigger false positives
    assert "Information Systems" not in names
    assert "C" not in names
    assert "Go" not in names
    assert "Computer Vision" not in names

def test_longest_match_and_bullet_harvesting():
    text = """
    PROJECTS
    • Spearheaded Natural Language Processing and Deep Learning architecture development for customer analytics.
    • Managed containerized deployments across AWS and Kubernetes.
    """
    skills = extract_skills_from_text(text)
    names = [s["skill_name"] for s in skills]
    
    assert "Natural Language Processing (NLP)" in names
    assert "Deep Learning" in names
    assert "AWS" in names
    assert "Kubernetes" in names
    
    nlp_skill = next(s for s in skills if s["skill_name"] == "Natural Language Processing (NLP)")
    # Leading bullet point symbol must be stripped
    assert not nlp_skill["evidence_text"].startswith("•")
    assert "Natural Language Processing" in nlp_skill["evidence_text"]
    assert nlp_skill["confidence_score"] >= 0.90

