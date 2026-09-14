import re
from typing import Dict, Any, List, Tuple

def verify_cv_structure(text: str) -> Tuple[bool, int, List[str], Dict[str, Any]]:
    """
    Validates whether plain text adheres to standard CV / Resume structure.
    
    Returns:
        Tuple of:
            - is_valid (bool): True if document meets structural criteria
            - structure_score (int): 0 - 100 ATS completeness score
            - missing_sections (List[str]): List of missing essential components
            - metadata (Dict[str, Any]): Detailed audit signals (word count, detected sections)
    """
    if not text or len(text.strip()) == 0:
        return False, 0, ["Document is empty or contains no readable text."], {}

    words = text.split()
    word_count = len(words)

    if word_count < 10:
        return (
            False, 
            min(20, word_count * 2), 
            [f"Document has only {word_count} words (minimum 10 words required for a CV)."], 
            {"word_count": word_count}
        )

    # 1. Contact Information Patterns
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text))
    has_phone = bool(re.search(r'(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', text))

    # 2. Section Heading Matchers (Case-insensitive multi-pattern)
    has_education = bool(re.search(
        r'\b(?:EDUCATION|ACADEMIC\s+BACKGROUND|DEGREES?|UNIVERSITY|COLLEGE|DIPLOMA|ACADEMICS)\b', 
        text, re.IGNORECASE
    ))
    has_skills = bool(re.search(
        r'\b(?:(?:TECHNICAL|PROFESSIONAL|FINANCIAL|CORE|ENGINEERING|KEY)?\s*SKILLS|COMPETENCIES|EXPERTISE)\b', 
        text, re.IGNORECASE
    ))
    has_experience = bool(re.search(
        r'\b(?:WORK\s+EXPERIENCE|EXPERIENCE|PROJECTS|EMPLOYMENT\s+HISTORY|INTERNSHIPS?|PRACTICUM)\b', 
        text, re.IGNORECASE
    ))
    has_summary = bool(re.search(
        r'\b(?:SUMMARY|PROFESSIONAL\s+SUMMARY|PROFILE|OBJECTIVE|ABOUT\s+ME)\b', 
        text, re.IGNORECASE
    ))

    # 3. Structural Scoring Weights (Total: 100)
    score = 0
    missing = []

    # Contact Details (25 pts)
    if has_email:
        score += 15
    else:
        missing.append("Email address")

    if has_phone:
        score += 10
    else:
        missing.append("Phone number")

    # Core Sections (75 pts)
    if has_education:
        score += 25
    else:
        missing.append("Education section")

    if has_skills:
        score += 30
    else:
        missing.append("Skills / Competencies section")

    if has_experience:
        score += 20
    else:
        missing.append("Experience or Projects section")

    metadata = {
        "word_count": word_count,
        "has_email": has_email,
        "has_phone": has_phone,
        "has_education": has_education,
        "has_skills": has_skills,
        "has_experience": has_experience,
        "has_summary": has_summary,
        "structure_score": score
    }

    # Minimum threshold: Score >= 35 and must have at least one core section
    is_valid = (score >= 35) and (has_education or has_skills or has_experience)
    return is_valid, score, missing, metadata


def verify_job_structure(text: str) -> Tuple[bool, int, List[str], Dict[str, Any]]:
    """
    Validates whether plain text follows a legitimate Job Description structure.
    
    Returns:
        Tuple of:
            - is_valid (bool): True if document meets structural criteria
            - structure_score (int): 0 - 100 job posting completeness score
            - missing_sections (List[str]): List of missing essential components
            - metadata (Dict[str, Any]): Detailed audit signals
    """
    if not text or len(text.strip()) == 0:
        return False, 0, ["Job posting document is empty."], {}

    words = text.split()
    word_count = len(words)

    if word_count < 8:
        return (
            False, 
            min(20, word_count * 2), 
            [f"Job posting has only {word_count} words (minimum 8 words required)."], 
            {"word_count": word_count}
        )

    # 1. Structural Section Matchers
    has_title_header = bool(re.search(
        r'\b(?:JOB\s+TITLE|TITLE|POSITION|ROLE|OVERVIEW|ABOUT\s+THE\s+ROLE|SUMMARY|WE\s+ARE\s+HIRING)\b', 
        text, re.IGNORECASE
    ))
    has_responsibilities = bool(re.search(
        r'\b(?:RESPONSIBILITIES|KEY\s+DUTIES|DUTIES|WHAT\s+YOU\'?LL\s+DO|TASKS|ROLE\s+DELIVERABLES)\b', 
        text, re.IGNORECASE
    ))
    has_requirements = bool(re.search(
        r'\b(?:REQUIREMENTS|QUALIFICATIONS|WHAT\s+WE\'?RE\s+LOOKING\s+FOR|SKILLS\s+REQUIRED|MUST\s+HAVE|MINIMUM\s+REQUIREMENTS|REQUIRED\s+SKILLS|SKILLS)\b', 
        text, re.IGNORECASE
    ))

    # 2. Scoring (Total: 100)
    score = 0
    missing = []

    if has_title_header:
        score += 30
    else:
        missing.append("Job title or role overview")

    if has_responsibilities:
        score += 35
    else:
        missing.append("Responsibilities or duties section")

    if has_requirements:
        score += 35
    else:
        missing.append("Requirements or qualifications section")

    metadata = {
        "word_count": word_count,
        "has_title_header": has_title_header,
        "has_responsibilities": has_responsibilities,
        "has_requirements": has_requirements,
        "structure_score": score
    }

    # Minimum threshold: Score >= 30 and at least Responsibilities or Requirements present
    is_valid = (score >= 30) and (has_responsibilities or has_requirements)
    return is_valid, score, missing, metadata
