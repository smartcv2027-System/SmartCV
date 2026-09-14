import re
from typing import List, Dict, Any

# Common stop words for English recruitment domain
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", 
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", 
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", 
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", 
    "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", 
    "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", 
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", 
    "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
}

def clean_text(text: str) -> str:
    """
    Cleans raw text by removing URLs, non-ascii noise, multiple spaces,
    and standardizing whitespace.
    """
    if not text:
        return ""
    
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', ' ', text)
    # Remove email addresses
    text = re.sub(r'\S+@\S+', ' ', text)
    # Remove special symbols but keep dashes and dots for terms like C++, C#, .NET, Node.js
    text = re.sub(r'[^\w\s\+\#\.\-\,\/]', ' ', text)
    # Replace multiple whitespaces and newlines with a single space
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def tokenize(text: str) -> List[str]:
    """
    Tokenizes cleaned text into lowercase word tokens.
    """
    cleaned = clean_text(text).lower()
    # Split on whitespace and basic delimiters
    tokens = re.findall(r'[a-zA-Z0-9\+\#\.\-]+', cleaned)
    return tokens

def preprocess_for_tfidf(text: str) -> str:
    """
    Complete preprocessing pipeline for TF-IDF:
    Cleaning -> Tokenizing -> Stop-word removal -> Lemmatization/Standardization
    """
    tokens = tokenize(text)
    filtered = [t for t in tokens if t not in STOP_WORDS and len(t) > 1]
    return " ".join(filtered)

def extract_sections(text: str) -> Dict[str, str]:
    """
    Segments resume or job description into standard functional sections.
    """
    sections = {
        "summary": "",
        "skills": "",
        "experience": "",
        "education": "",
        "projects": "",
        "certifications": ""
    }
    
    header_patterns = {
        "summary": r"(summary|objective|about me|profile)",
        "skills": r"(skills|technical skills|competencies|technologies|expertise)",
        "experience": r"(experience|work experience|employment|internships|work history)",
        "education": r"(education|academic background|qualifications|degrees)",
        "projects": r"(projects|academic projects|key projects|capstone)",
        "certifications": r"(certifications|certificates|courses|awards|licenses)"
    }
    
    lines = text.splitlines()
    current_section = "summary"
    buffer = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        matched_sec = None
        for sec_name, pattern in header_patterns.items():
            if re.match(rf"^(#+|\d+\.|\*|-)?\s*{pattern}\s*[:\-]?\s*$", stripped, re.IGNORECASE):
                matched_sec = sec_name
                break
        
        if matched_sec:
            if buffer:
                sections[current_section] += " " + " ".join(buffer)
                buffer = []
            current_section = matched_sec
        else:
            buffer.append(stripped)
            
    if buffer:
        sections[current_section] += " " + " ".join(buffer)
        
    for k in sections:
        sections[k] = sections[k].strip()
        
    return sections
