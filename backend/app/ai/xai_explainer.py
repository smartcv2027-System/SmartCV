from typing import Dict, Any, List, Tuple

RECOMMENDED_RESOURCES = {
    "Python": {
        "course": "Python for Data Science and Machine Learning Bootcamp",
        "project": "Build an automated ETL pipeline or REST API using FastAPI",
        "cert": "PCEP - Certified Entry-Level Python Programmer"
    },
    "SQL": {
        "course": "Advanced PostgreSQL & Query Optimization",
        "project": "Design a normalized database schema with complex analytical queries and window functions",
        "cert": "PostgreSQL Professional Certification"
    },
    "React": {
        "course": "Full-Stack Modern React & Next.js Masterclass",
        "project": "Build a responsive candidate management dashboard with Tailwind CSS",
        "cert": "Meta Front-End Developer Professional Certificate"
    },
    "Machine Learning": {
        "course": "Machine Learning Specialization by Andrew Ng (DeepLearning.AI)",
        "project": "Implement end-to-end classification pipeline with cross-validation and hyperparameter tuning",
        "cert": "TensorFlow Developer Certificate / AWS Machine Learning Specialty"
    },
    "Natural Language Processing (NLP)": {
        "course": "NLP with Transformers and HuggingFace",
        "project": "Create a semantic search engine using Sentence-BERT embeddings",
        "cert": "DeepLearning.AI NLP Specialization"
    },
    "Docker": {
        "course": "Docker & Containerization for Developers",
        "project": "Containerize a multi-service web application with docker-compose",
        "cert": "Docker Certified Associate (DCA)"
    },
    "Power BI": {
        "course": "Microsoft Power BI Data Analyst (PL-300)",
        "project": "Create an interactive KPI dashboard tracking recruitment and business metrics",
        "cert": "Microsoft Certified: Power BI Data Analyst Associate"
    },
    "Git / GitHub": {
        "course": "Version Control with Git & GitHub",
        "project": "Publish a clean, well-documented open-source repository with CI/CD GitHub Actions",
        "cert": "GitHub Foundations Certification"
    }
}

class XAIExplainer:
    def explain_match(
        self,
        job_title: str,
        job_skills: List[Dict[str, Any]],
        candidate_skills: List[Dict[str, Any]],
        match_metrics: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any], Dict[str, Any]]:
        """
        Computes XAI matched/missing skills, explanation summary, and applicant feedback.
        
        Returns:
            (matched_skills, missing_skills, explanation_summary, applicant_feedback)
        """
        # Map candidate skills by lowercase name
        candidate_skill_map = {cs["skill_name"].lower(): cs for cs in candidate_skills}
        
        matched_skills = []
        missing_skills = []
        
        for js in job_skills:
            js_name = js["skill_name"]
            js_lower = js_name.lower()
            req_type = js.get("requirement_type", "required")
            weight = js.get("weight", 1.0)
            
            if js_lower in candidate_skill_map:
                cand_skill = candidate_skill_map[js_lower]
                matched_skills.append({
                    "skill_id": js.get("skill_id"),
                    "skill_name": js_name,
                    "skill_type": js.get("skill_type", "technical"),
                    "evidence_text": cand_skill.get("evidence_text", f"Mentioned in candidate profile/resume: '{js_name}'."),
                    "contribution_score": round(weight * 1.25, 2)
                })
            else:
                resource = RECOMMENDED_RESOURCES.get(js_name, {
                    "course": f"Foundational {js_name} Course",
                    "project": f"Develop a small prototype demonstrating {js_name} competency",
                    "cert": f"{js_name} Skill Assessment"
                })
                missing_skills.append({
                    "skill_id": js.get("skill_id"),
                    "skill_name": js_name,
                    "skill_type": js.get("skill_type", "technical"),
                    "requirement_type": req_type,
                    "improvement_note": f"Target requirement for '{job_title}'. Suggested action: {resource['project']}."
                })

        # Calculate breakdown summaries
        score = match_metrics.get("compatibility_score", 0.0)
        sbert_score = match_metrics.get("bert_score", 0.0)
        tfidf_score = match_metrics.get("tfidf_score", 0.0)
        status = match_metrics.get("recommendation_status", "Good Match")
        
        matched_names = [m["skill_name"] for m in matched_skills]
        missing_required = [m["skill_name"] for m in missing_skills if m["requirement_type"] == "required"]
        missing_preferred = [m["skill_name"] for m in missing_skills if m["requirement_type"] == "preferred"]

        matched_summary = f"Matched {len(matched_skills)} skill(s): {', '.join(matched_names) if matched_names else 'None'}."
        missing_summary = f"Missing {len(missing_required)} required skill(s) ({', '.join(missing_required) if missing_required else 'None'}) and {len(missing_preferred)} preferred skill(s) ({', '.join(missing_preferred) if missing_preferred else 'None'})."
        
        score_reason = (
            f"Compatibility score of {score}% reflects a {sbert_score}% semantic contextual alignment (Sentence-BERT) "
            f"and a {tfidf_score}% keyword match (TF-IDF), with {len(matched_skills)}/{len(job_skills) if job_skills else 1} target skills verified."
        )
        
        if score >= 75.0:
            justification = f"Candidate shows strong qualification alignment for {job_title}. Extensive coverage in key technical competencies with strong contextual relevance."
        elif score >= 50.0:
            justification = f"Candidate meets core qualifications for {job_title} with solid foundational knowledge, but has minor skill gaps in specialized or preferred areas."
        else:
            justification = f"Candidate has foundational qualifications but lacks several core required technical competencies needed for the {job_title} position."

        explanation_summary = {
            "explanation_text": justification,
            "score_reason": score_reason,
            "matched_skill_summary": matched_summary,
            "missing_skill_summary": missing_summary
        }

        # Generate structured applicant feedback
        improvement_items = []
        missing_recommendations = []

        if missing_required:
            improvement_items.append({
                "category": "Core Technical Gaps",
                "priority": "High",
                "recommendation": f"Prioritize learning {', '.join(missing_required)}. These are mandatory criteria for {job_title} roles."
            })
            
        if missing_preferred:
            improvement_items.append({
                "category": "Competitive Edge (Preferred Skills)",
                "priority": "Medium",
                "recommendation": f"Enhance profile by exploring {', '.join(missing_preferred)} to stand out against competing applicants."
            })

        improvement_items.append({
            "category": "Resume Formatting & Evidence",
            "priority": "Actionable",
            "recommendation": "Quantify project impact with clear metrics (e.g., 'improved latency by 20%', 'delivered capstone project to 100+ users') and ensure explicit technical keywords are highlighted in project descriptions."
        })

        for ms in missing_skills:
            s_name = ms["skill_name"]
            res = RECOMMENDED_RESOURCES.get(s_name, {
                "course": f"Introductory {s_name} Workshop",
                "project": f"Build a practical mini-project applying {s_name}",
                "cert": f"{s_name} Skill Badge"
            })
            missing_recommendations.append({
                "skill_name": s_name,
                "requirement_type": ms["requirement_type"],
                "recommended_course": res["course"],
                "suggested_project": res["project"],
                "certification": res["cert"]
            })

        feedback_text = (
            f"Dear Applicant, your resume achieved a compatibility score of {score}% ({status}) for the {job_title} position. "
            f"You demonstrated strong proficiency in {', '.join(matched_names[:3]) if matched_names else 'academic fundamentals'}. "
            f"To strengthen your application for future recruitment cycles, review the structured recommendations below."
        )

        applicant_feedback = {
            "feedback_text": feedback_text,
            "improvement_items": improvement_items,
            "missing_skill_recommendations": missing_recommendations
        }

        return matched_skills, missing_skills, explanation_summary, applicant_feedback
