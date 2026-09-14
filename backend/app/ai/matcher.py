import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.ai.preprocessor import preprocess_for_tfidf, clean_text
from app.core.config import settings

# Global cache for SentenceTransformer model
_sbert_model = None

class SBERTModelError(RuntimeError):
    """Raised when Sentence-BERT embedding model fails to initialize or encode in strict mode."""
    pass

def get_sbert_model():
    """
    Lazy loader for SentenceTransformer model in strict mode.
    Raises SBERTModelError if the model cannot be loaded.
    """
    global _sbert_model
    if _sbert_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Load standard all-MiniLM-L6-v2
            _sbert_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            raise SBERTModelError(
                f"Failed to load SentenceTransformer ('all-MiniLM-L6-v2'): {e}. "
                "Strict mode requires genuine Sentence-BERT neural embeddings; silent fallback is disabled."
            ) from e
    return _sbert_model

class SmartCVMatcher:
    def __init__(self, weight_sbert: float = None, weight_tfidf: float = None, weight_skills: float = None):
        self.weight_sbert = weight_sbert if weight_sbert is not None else settings.WEIGHT_SBERT
        self.weight_tfidf = weight_tfidf if weight_tfidf is not None else settings.WEIGHT_TFIDF
        self.weight_skills = weight_skills if weight_skills is not None else settings.WEIGHT_SKILLS
        
        # Ensure weights sum to 1.0
        total_w = self.weight_sbert + self.weight_tfidf + self.weight_skills
        if total_w > 0:
            self.weight_sbert /= total_w
            self.weight_tfidf /= total_w
            self.weight_skills /= total_w

    def compute_tfidf_similarity(self, resume_text: str, job_text: str) -> float:
        """
        Layer 1: TF-IDF Baseline Cosine Similarity
        """
        clean_resume = preprocess_for_tfidf(resume_text)
        clean_job = preprocess_for_tfidf(job_text)
        
        if not clean_resume or not clean_job:
            return 0.0
            
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
        try:
            tfidf_matrix = vectorizer.fit_transform([clean_resume, clean_job])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(np.clip(sim, 0.0, 1.0))
        except Exception:
            return 0.0

    def compute_sbert_similarity(self, resume_text: str, job_text: str) -> float:
        """
        Layer 2: Sentence-BERT Semantic Cosine Similarity (Strict Mode).
        Computes dense contextual semantic similarity using all-MiniLM-L6-v2 embeddings.
        Raises SBERTModelError if neural encoding fails; silent character TF-IDF fallback is disabled.
        """
        clean_resume = clean_text(resume_text)
        clean_job = clean_text(job_text)
        
        if not clean_resume or not clean_job:
            return 0.0
            
        model = get_sbert_model()
        try:
            embeddings = model.encode(
                [clean_resume, clean_job], 
                convert_to_numpy=True, 
                normalize_embeddings=True
            )
            sim = np.dot(embeddings[0], embeddings[1])
            return float(np.clip(sim, 0.0, 1.0))
        except Exception as e:
            raise SBERTModelError(f"Sentence-BERT encoding failed: {e}") from e


    def compute_skill_overlap_ratio(self, matched_count: int, total_required: int) -> float:
        """
        Calculates skill match ratio between resume and required job skills.
        """
        if total_required <= 0:
            return 1.0 if matched_count > 0 else 0.5
        return float(np.clip(matched_count / total_required, 0.0, 1.0))

    def calculate_hybrid_score(
        self, 
        tfidf_score: float, 
        bert_score: float, 
        skill_overlap: float
    ) -> Tuple[float, str]:
        """
        Computes weighted hybrid compatibility score and recommendation status.
        """
        compatibility_score = (
            (self.weight_sbert * bert_score) +
            (self.weight_tfidf * tfidf_score) +
            (self.weight_skills * skill_overlap)
        )
        # Normalize to percentage scale (0 to 100)
        percentage = round(float(compatibility_score * 100), 2)
        
        if percentage >= 75.0:
            status = "Strong Match"
        elif percentage >= 50.0:
            status = "Good Match"
        else:
            status = "Low Match"
            
        return percentage, status

    def match_resume_to_job(
        self, 
        resume_text: str, 
        job_text: str, 
        matched_skills_count: int, 
        total_job_skills_count: int
    ) -> Dict[str, Any]:
        """
        Executes full two-layer matching + hybrid scoring.
        """
        tfidf_sim = self.compute_tfidf_similarity(resume_text, job_text)
        bert_sim = self.compute_sbert_similarity(resume_text, job_text)
        skill_ratio = self.compute_skill_overlap_ratio(matched_skills_count, total_job_skills_count)
        
        comp_score, status = self.calculate_hybrid_score(tfidf_sim, bert_sim, skill_ratio)
        
        return {
            "tfidf_score": round(float(tfidf_sim * 100), 2),
            "bert_score": round(float(bert_sim * 100), 2),
            "skill_overlap_ratio": round(float(skill_ratio * 100), 2),
            "compatibility_score": comp_score,
            "recommendation_status": status,
            "weights": {
                "sbert": self.weight_sbert,
                "tfidf": self.weight_tfidf,
                "skills": self.weight_skills
            }
        }
