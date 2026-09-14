import re
from typing import List, Dict, Any, Tuple, Optional

# ============================================================================
# Canonical Skill Aliases and Acronym Normalization Map
# ============================================================================
SKILL_ALIASES: Dict[str, str] = {
    # Programming Languages & Core Technologies
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "py": "Python",
    "python3": "Python",
    "cpp": "C++",
    "c++": "C++",
    "cplusplus": "C++",
    "c#": "C#",
    "csharp": "C#",
    "cs": "C#",
    ".net": ".NET",
    "dotnet": ".NET",
    "asp.net": ".NET",
    "golang": "Go",
    "go": "Go",
    "reactjs": "React",
    "react.js": "React",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "angularjs": "Angular",

    # AI, Machine Learning & Data Science
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "dl": "Deep Learning",
    "deep learning": "Deep Learning",
    "nlp": "Natural Language Processing (NLP)",
    "natural language processing": "Natural Language Processing (NLP)",
    "computer vision": "Computer Vision",
    "cv": "Computer Vision",
    "tf": "TensorFlow",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "torch": "PyTorch",
    "sklearn": "Scikit-Learn",
    "scikit-learn": "Scikit-Learn",
    "sbert": "BERT / Transformers",
    "sentence-bert": "BERT / Transformers",
    "transformers": "BERT / Transformers",
    "huggingface": "BERT / Transformers",
    "llm": "Generative AI / LLMs",
    "llms": "Generative AI / LLMs",
    "genai": "Generative AI / LLMs",
    "generative ai": "Generative AI / LLMs",
    "xai": "Explainable AI (XAI)",
    "explainable ai": "Explainable AI (XAI)",
    "shap": "Explainable AI (XAI)",
    "lime": "Explainable AI (XAI)",

    # Databases, Cloud & DevOps
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mysql": "SQL",
    "sqlite": "SQL",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "docker": "Docker",
    "containerization": "Docker",
    "ci/cd": "CI/CD Pipelines",
    "cicd": "CI/CD Pipelines",
    "ci-cd": "CI/CD Pipelines",
    "continuous integration": "CI/CD Pipelines",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "Google Cloud (GCP)",
    "google cloud": "Google Cloud (GCP)",
    "azure": "Microsoft Azure",
    "microsoft azure": "Microsoft Azure",
    "powerbi": "Power BI",
    "power bi": "Power BI",
    "pbi": "Power BI",
    "tableau": "Tableau",
    "rest": "REST APIs",
    "rest api": "REST APIs",
    "restful": "REST APIs",
    "git": "Git / GitHub",
    "github": "Git / GitHub",
    "gitlab": "Git / GitHub",
}

def normalize_skill_name(raw_name: str) -> str:
    """
    Normalizes a skill string or alias to its canonical taxonomy name.
    e.g. 'k8s' -> 'Kubernetes', 'JS' -> 'JavaScript', 'c++' -> 'C++'
    """
    cleaned = raw_name.strip()
    lowered = cleaned.lower()
    
    if lowered in SKILL_ALIASES:
        return SKILL_ALIASES[lowered]
        
    for skill in DEFAULT_SKILLS_TAXONOMY:
        if skill["name"].lower() == lowered:
            return skill["name"]
            
    return cleaned


# ============================================================================
# Default Taxonomy with Symbol-Safe & Context-Guarded Patterns
# ============================================================================
DEFAULT_SKILLS_TAXONOMY: List[Dict[str, Any]] = [
    # Technical Skills - Programming & Frameworks
    {
        "name": "Python", 
        "type": "technical", 
        "patterns": [r"\bpython\b", r"\bpython3\b"], 
        "desc": "Python programming language and ecosystem"
    },
    {
        "name": "Java", 
        "type": "technical", 
        "patterns": [r"\bjava\b"], 
        "desc": "Java programming language (JVM ecosystem)"
    },
    {
        "name": "C++", 
        "type": "technical", 
        "patterns": [
            r"(?<![\w#+])(?:c\+\+|cpp)(?![\w#+])", 
            r"\bcplusplus\b"
        ], 
        "desc": "C++ systems programming language"
    },
    {
        "name": "C#", 
        "type": "technical", 
        "patterns": [
            r"(?<![\w#+])(?:c#|csharp)(?![\w#+])"
        ], 
        "desc": "C# .NET programming language"
    },
    {
        "name": "C", 
        "type": "technical", 
        "patterns": [
            (r"(?<![\w#+])C(?![\w#+])(?=\s*(?:programming|language|developer|compiler|code)\b)", 0),
            (r"(?<![\w#+])C(?=\s*[,/]\s*(?:C\+\+|Java|Python|Rust|Assembly|Go)\b)", 0),
            r"\bANSI\s+C\b",
            r"\bEmbedded\s+C\b"
        ], 
        "desc": "C procedural systems language"
    },
    {
        "name": "Go", 
        "type": "technical", 
        "patterns": [
            r"\bgolang\b",
            (r"(?<![\w])Go(?![\w])(?=\s*(?:programming|language|developer|backend)\b)", 0),
            (r"(?<![\w])Go(?=\s*[,/]\s*(?:Python|Java|Rust|C\+\+)\b)", 0)
        ], 
        "desc": "Go (Golang) backend programming language"
    },
    {
        "name": "Rust", 
        "type": "technical", 
        "patterns": [r"\brust\b(?:\s+(?:programming|language|developer))?", r"\bcargo\b"], 
        "desc": "Rust memory-safe systems programming language"
    },
    {
        "name": "JavaScript", 
        "type": "technical", 
        "patterns": [
            r"\bjavascript\b", 
            r"\bvanilla\s+js\b", 
            (r"(?<![\w])JS(?![\w])", 0),
            r"\bjs\b"
        ], 
        "desc": "JavaScript web development language"
    },
    {
        "name": "TypeScript", 
        "type": "technical", 
        "patterns": [
            r"\btypescript\b", 
            (r"(?<![\w])TS(?![\w])", 0),
            r"\bts\b"
        ], 
        "desc": "Typed superset of JavaScript"
    },
    {
        "name": "SQL", 
        "type": "technical", 
        "patterns": [r"\bsql\b", r"\bmysql\b", r"\bsqlite\b", r"\brdbms\b"], 
        "desc": "Structured Query Language & relational DBs"
    },
    {
        "name": "React", 
        "type": "technical", 
        "patterns": [r"\breact\b", r"\breact\.?js\b"], 
        "desc": "React front-end library and UI ecosystem"
    },
    {
        "name": "Next.js", 
        "type": "technical", 
        "patterns": [r"\bnext\.?js\b", r"\bnextjs\b"], 
        "desc": "Next.js React server-rendered framework"
    },
    {
        "name": "FastAPI", 
        "type": "technical", 
        "patterns": [r"\bfastapi\b"], 
        "desc": "FastAPI modern asynchronous Python backend framework"
    },
    {
        "name": "Django", 
        "type": "technical", 
        "patterns": [r"\bdjango\b", r"\bdjango\s+rest\b"], 
        "desc": "Django full-stack Python framework"
    },
    {
        "name": "Node.js", 
        "type": "technical", 
        "patterns": [r"\bnode\.?js\b", r"\bnodejs\b", r"\bexpress\.?js\b"], 
        "desc": "Node.js JavaScript server runtime"
    },
    {
        "name": "HTML/CSS", 
        "type": "technical", 
        "patterns": [r"\bhtml5?\b", r"\bcss3?\b", r"\btailwind(?:css)?\b", r"\bbootstrap\b"], 
        "desc": "Web markup, styling languages, and CSS frameworks"
    },
    {
        "name": ".NET", 
        "type": "technical", 
        "patterns": [
            r"(?<![\w])(?:\.net|dotnet|asp\.net)(?![\w])", 
            r"\b\.net\s+core\b"
        ], 
        "desc": "Microsoft .NET framework and runtime"
    },

    # Technical Skills - AI / Data Science / ML
    {
        "name": "Machine Learning", 
        "type": "technical", 
        "patterns": [
            r"\bmachine learning\b", 
            (r"(?<![\w])ML(?![\w])", 0),
            r"\bml\s+(?:engineer|model|algorithm|pipeline)\b"
        ], 
        "desc": "Machine learning algorithms and predictive modeling"
    },
    {
        "name": "Deep Learning", 
        "type": "technical", 
        "patterns": [
            r"\bdeep learning\b", 
            (r"(?<![\w])DL(?![\w])", 0),
            r"\bneural networks?\b",
            r"\bdl\s+(?:engineer|model|architecture)\b"
        ], 
        "desc": "Deep neural networks and modern architectures"
    },
    {
        "name": "Natural Language Processing (NLP)", 
        "type": "technical", 
        "patterns": [
            r"\bnatural language processing\b", 
            (r"(?<![\w])NLP(?![\w])", 0),
            r"\bnlp\s+(?:engineer|model|pipeline)\b"
        ], 
        "desc": "Text analysis, parsing, and linguistic AI"
    },
    {
        "name": "Computer Vision", 
        "type": "technical", 
        "patterns": [
            r"\bcomputer vision\b", 
            r"\bopencv\b", 
            r"\byolo(?:v\d+)?\b", 
            r"\bimage processing\b", 
            r"\bobject detection\b",
            r"\b(?:ai|ml|dl)[/-]cv\b",
            r"\bcv[/-](?:ai|ml|dl)\b",
            (r"(?<![\w])CV\s+(?:engineer|model|researcher|algorithm|pipeline)\b", 0)
        ], 
        "desc": "Image/video recognition and visual AI models"
    },
    {
        "name": "Generative AI / LLMs", 
        "type": "technical", 
        "patterns": [
            r"\bgenerative ai\b", 
            r"\bgenai\b", 
            r"\bllms?\b", 
            r"\blarge language models?\b", 
            r"\brag\b", 
            r"\bprompt engineering\b"
        ], 
        "desc": "Large Language Models, RAG, and generative foundations"
    },
    {
        "name": "TensorFlow", 
        "type": "technical", 
        "patterns": [r"\btensorflow\b", (r"(?<![\w])TF(?![\w])", 0), r"\bkeras\b"], 
        "desc": "TensorFlow and Keras open-source ML platform"
    },
    {
        "name": "PyTorch", 
        "type": "technical", 
        "patterns": [r"\bpytorch\b", r"\btorch\b"], 
        "desc": "PyTorch deep learning framework"
    },
    {
        "name": "Scikit-Learn", 
        "type": "technical", 
        "patterns": [r"\bscikit-learn\b", r"\bsklearn\b"], 
        "desc": "Scikit-Learn statistical ML package"
    },
    {
        "name": "BERT / Transformers", 
        "type": "technical", 
        "patterns": [
            r"\bbert\b", 
            r"\btransformers\b", 
            r"\bsentence-bert\b", 
            r"\bsbert\b", 
            r"\bhuggingface\b"
        ], 
        "desc": "Transformer language models & contextual dense embeddings"
    },
    {
        "name": "Explainable AI (XAI)", 
        "type": "technical", 
        "patterns": [
            r"\bexplainable ai\b", 
            r"\bxai\b", 
            r"\bshap\b", 
            r"\blime\b", 
            r"\bmodel interpretability\b"
        ], 
        "desc": "Model interpretability, attribution, and transparency"
    },
    {
        "name": "Data Analysis", 
        "type": "technical", 
        "patterns": [
            r"\bdata analysis\b", 
            r"\bdata analytics\b", 
            r"\bpandas\b", 
            r"\bnumpy\b", 
            r"\bexploratory data analysis\b",
            r"\beda\b"
        ], 
        "desc": "Exploratory data analysis & statistical computing"
    },
    {
        "name": "Data Visualization", 
        "type": "technical", 
        "patterns": [
            r"\bdata visualization\b", 
            r"\bmatplotlib\b", 
            r"\bseaborn\b", 
            r"\bplotly\b"
        ], 
        "desc": "Visual storytelling and charting"
    },

    # Tools, DevOps & Infrastructure
    {
        "name": "Git / GitHub", 
        "type": "tool", 
        "patterns": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b", r"\bversion control\b"], 
        "desc": "Version control systems and collaborative workflows"
    },
    {
        "name": "Docker", 
        "type": "tool", 
        "patterns": [r"\bdocker\b", r"\bcontainerization\b", r"\bdockerfile\b"], 
        "desc": "Containerization platform"
    },
    {
        "name": "Kubernetes", 
        "type": "tool", 
        "patterns": [r"\bkubernetes\b", r"\bk8s\b"], 
        "desc": "Container orchestration system"
    },
    {
        "name": "CI/CD Pipelines", 
        "type": "tool", 
        "patterns": [
            r"(?<![\w])ci/cd(?![\w])", 
            r"\bcicd\b", 
            r"\bci-cd\b", 
            r"\bcontinuous integration\b", 
            r"\bcontinuous deployment\b",
            r"\bgithub actions\b",
            r"\bjenkins\b"
        ], 
        "desc": "Continuous integration and automated delivery pipelines"
    },
    {
        "name": "REST APIs", 
        "type": "tool", 
        "patterns": [
            r"\brest\s*apis?\b", 
            r"\brestful\b", 
            r"\bapi\s+design\b", 
            r"\bapi\s+development\b"
        ], 
        "desc": "RESTful web services and API design"
    },
    {
        "name": "PostgreSQL", 
        "type": "tool", 
        "patterns": [r"\bpostgresql\b", r"\bpostgres\b"], 
        "desc": "Relational open-source SQL database"
    },
    {
        "name": "MongoDB", 
        "type": "tool", 
        "patterns": [r"\bmongodb\b", r"\bnosql\b"], 
        "desc": "NoSQL document database"
    },
    {
        "name": "AWS", 
        "type": "tool", 
        "patterns": [r"\baws\b", r"\bamazon web services\b", r"\bec2\b", r"\bs3\b"], 
        "desc": "Amazon Web Services cloud computing platform"
    },
    {
        "name": "Google Cloud (GCP)", 
        "type": "tool", 
        "patterns": [r"\bgcp\b", r"\bgoogle cloud\b", r"\bbigquery\b"], 
        "desc": "Google Cloud Platform"
    },
    {
        "name": "Microsoft Azure", 
        "type": "tool", 
        "patterns": [r"\bazure\b", r"\bmicrosoft azure\b"], 
        "desc": "Microsoft Azure cloud computing platform"
    },
    {
        "name": "Linux", 
        "type": "tool", 
        "patterns": [r"\blinux\b", r"\bubuntu\b", r"\bbash\b", r"\bshell scripting\b"], 
        "desc": "Linux operating system and shell environment"
    },
    {
        "name": "Power BI", 
        "type": "tool", 
        "patterns": [r"\bpower bi\b", r"\bpowerbi\b", r"\bpbi\b"], 
        "desc": "Microsoft Power BI business analytics & dashboards"
    },
    {
        "name": "Tableau", 
        "type": "tool", 
        "patterns": [r"\btableau\b"], 
        "desc": "Tableau visual data analytics platform"
    },
    {
        "name": "Jupyter Notebooks", 
        "type": "tool", 
        "patterns": [r"\bjupyter\b", r"\bipynb\b"], 
        "desc": "Interactive computational notebooks"
    },

    # Soft Skills
    {
        "name": "Team Collaboration", 
        "type": "soft", 
        "patterns": [r"\bteamwork\b", r"\bcollaboration\b", r"\bteam player\b", r"\bcross-functional\b"], 
        "desc": "Cross-functional collaborative team effectiveness"
    },
    {
        "name": "Communication", 
        "type": "soft", 
        "patterns": [r"\bcommunication\b", r"\bpresentation\b", r"\bwritten skills\b", r"\bverbal communication\b"], 
        "desc": "Verbal, written, and presentation clarity"
    },
    {
        "name": "Problem Solving", 
        "type": "soft", 
        "patterns": [r"\bproblem solving\b", r"\bcritical thinking\b", r"\banalytical thinking\b", r"\btroubleshooting\b"], 
        "desc": "Analytical reasoning and structured issue resolution"
    },
    {
        "name": "Adaptability", 
        "type": "soft", 
        "patterns": [r"\badaptability\b", r"\bflexibility\b", r"\bfast learner\b", r"\bcontinuous learning\b"], 
        "desc": "Agility in fast-paced technology environments"
    },
    {
        "name": "Time Management", 
        "type": "soft", 
        "patterns": [r"\btime management\b", r"\bmultitasking\b", r"\bprioritization\b", r"\bdeadline driven\b"], 
        "desc": "Efficient project scheduling and milestone execution"
    },
    {
        "name": "Leadership", 
        "type": "soft", 
        "patterns": [r"\bleadership\b", r"\bmentoring\b", r"\bteam lead\b", r"\binitiative\b"], 
        "desc": "Team coordination, mentoring, and technical leadership"
    },

    # Academic & Professional Domain Knowledge
    {
        "name": "Information Systems", 
        "type": "domain", 
        "patterns": [
            r"\binformation systems\b", 
            r"\bmanagement information systems\b", 
            (r"(?<![\w])MIS(?![\w])", 0),
            (r"(?<![\w])CIS(?![\w])", 0)
        ], 
        "desc": "Enterprise information architecture and business systems"
    },
    {
        "name": "Software Engineering", 
        "type": "domain", 
        "patterns": [
            r"\bsoftware engineering\b", 
            r"\bsdlc\b", 
            r"\bdesign patterns\b", 
            r"\boop\b", 
            r"\bclean architecture\b"
        ], 
        "desc": "Software lifecycle, patterns, and development methodologies"
    },
    {
        "name": "Agile / Scrum", 
        "type": "domain", 
        "patterns": [r"\bagile\b", r"\bscrum\b", r"\bkanban\b", r"\bsprint planning\b"], 
        "desc": "Agile sprint ceremonies, backlog grooming, and Scrum"
    },
    {
        "name": "Cybersecurity Basics", 
        "type": "domain", 
        "patterns": [
            r"\bcybersecurity\b", 
            r"\binformation security\b", 
            r"\bencryption\b", 
            r"\bauthentication\b", 
            r"\baccess control\b", 
            r"\bvulnerability\b"
        ], 
        "desc": "Security, encryption, access control, and threat mitigation"
    },
    {
        "name": "Database Design", 
        "type": "domain", 
        "patterns": [
            r"\bdatabase design\b", 
            r"\ber diagram\b", 
            r"\bnormalization\b", 
            r"\bschema design\b", 
            r"\bdata modeling\b"
        ], 
        "desc": "Relational schema modeling, normalization, and indexing"
    },
    {
        "name": "Cloud Computing", 
        "type": "domain", 
        "patterns": [r"\bcloud computing\b", r"\bserverless\b", r"\bcloud infrastructure\b", r"\biaas\b", r"\bpaas\b"], 
        "desc": "Cloud deployment, virtualization, and distributed systems"
    },

    # Civil, Structural & General Engineering Domain Skills
    {
        "name": "AutoCAD",
        "type": "tool",
        "patterns": [r"\bautocad\b", (r"(?<![\w])CAD(?![\w])", 0)],
        "desc": "Computer-aided design and drafting software"
    },
    {
        "name": "Civil Engineering",
        "type": "domain",
        "patterns": [r"\bcivil engineering\b"],
        "desc": "Civil infrastructure, structural design, and construction"
    },
    {
        "name": "Structural Analysis",
        "type": "domain",
        "patterns": [r"\bstructural analysis\b", r"\bstructural (?:design|modeling|calculations?)\b", r"\betabs\b"],
        "desc": "Structural load modeling, stress analysis, and structural mechanics"
    },
    {
        "name": "Construction Surveying",
        "type": "domain",
        "patterns": [r"\bconstruction surveying\b", r"\bsite surveying\b", r"\bsurveying\b"],
        "desc": "Land surveying, site layout, and elevation measurements"
    },
    {
        "name": "Site Supervision",
        "type": "domain",
        "patterns": [r"\bsite supervision\b", r"\bconstruction supervision\b"],
        "desc": "On-site construction oversight and contractor coordination"
    },
    {
        "name": "Cost Estimation",
        "type": "domain",
        "patterns": [r"\bcost estimation\b", r"\bquantity surveying\b", r"\bbill of quantities\b", (r"(?<![\w])BOQ(?![\w])", 0)],
        "desc": "Construction and project budgeting, cost estimation, and BOQ"
    },
    {
        "name": "Quality Assurance",
        "type": "domain",
        "patterns": [r"\bquality assurance\b", (r"(?<![\w])QA(?:\s*/\s*QC)?(?![\w])", 0), r"\bquality control\b"],
        "desc": "Quality assurance protocols, material testing, and compliance inspection"
    },
    {
        "name": "Project Management",
        "type": "domain",
        "patterns": [r"\bproject management\b", r"\bproject scheduling\b", r"\bproject planning\b"],
        "desc": "Project scheduling, resource allocation, and milestone delivery"
    },

    # Business, Finance & Accounting Domain Skills
    {
        "name": "Accounting",
        "type": "domain",
        "patterns": [r"\baccounting\b", r"\bgeneral ledger\b", r"\bbalance sheet\b"],
        "desc": "Financial accounting principles, ledger bookkeeping, and reporting"
    },
    {
        "name": "Financial Auditing",
        "type": "domain",
        "patterns": [r"\bfinancial auditing\b", r"\bauditing\b", r"\baudit compliance\b"],
        "desc": "Financial statement audit, compliance checks, and internal controls"
    },
    {
        "name": "VAT Compliance",
        "type": "domain",
        "patterns": [r"\bvat compliance\b", (r"(?<![\w])VAT(?![\w])", 0), r"\bvalue-added tax\b", r"\bzatca\b", r"\bzakat\b"],
        "desc": "Value-added tax, Zakat, and Saudi ZATCA regulatory compliance"
    },
    {
        "name": "Tax Preparation",
        "type": "domain",
        "patterns": [r"\btax preparation\b", r"\btax compliance\b", r"\btax returns?\b"],
        "desc": "Corporate tax return preparation and filing"
    },
    {
        "name": "Financial Analysis",
        "type": "domain",
        "patterns": [r"\bfinancial statement analysis\b", r"\bfinancial analysis\b", r"\bfinancial modeling\b", r"\bcash flows?\b"],
        "desc": "Financial modeling, ratio analysis, and cash flow projections"
    },
    {
        "name": "Bank Reconciliation",
        "type": "domain",
        "patterns": [r"\bbank reconciliation\b"],
        "desc": "Bank statement balancing and transaction reconciliation"
    },
    {
        "name": "Excel",
        "type": "tool",
        "patterns": [r"\bexcel\b", r"\bmicrosoft excel\b", r"\bspreadsheets?\b"],
        "desc": "Microsoft Excel spreadsheet modeling and data management"
    }
]


# ============================================================================
# Enhanced Verbatim Sentence & Bullet-Point Harvesting
# ============================================================================
def find_evidence_sentence(text: str, match_span: Tuple[int, int]) -> str:
    """
    Extracts the full, coherent sentence or bullet point containing the match span.
    Strips leading bullet symbols (•, -, *, numbers) while preserving verbatim context.
    Truncates gracefully at word boundaries if excessively long (> 240 chars).
    """
    start, end = match_span
    if not text or start < 0 or end > len(text):
        return ""

    # 1. Expand outward to line boundaries (newlines or text boundaries)
    line_start = text.rfind("\n", 0, start)
    line_start = 0 if line_start == -1 else line_start + 1

    line_end = text.find("\n", end)
    line_end = len(text) if line_end == -1 else line_end

    line_text = text[line_start:line_end].strip()

    # 2. Check if the line contains multiple sentences (delimited by ". ", "! ", "? ")
    rel_start = start - line_start
    rel_end = end - line_start

    prev_period = -1
    for m in re.finditer(r'(?<=[.!?])\s+', line_text[:rel_start]):
        prev_period = m.end()

    next_period = len(line_text)
    m = re.search(r'[.!?](?:\s+|$)', line_text[rel_end:])
    if m:
        next_period = rel_end + m.end()

    sent_start = 0 if prev_period == -1 else prev_period
    sent_end = next_period

    snippet = line_text[sent_start:sent_end].strip()
    if not snippet:
        snippet = line_text

    # 3. Strip leading bullet points or enumeration: '•', '-', '*', '1.', '2)', etc.
    cleaned_snippet = re.sub(r'^[•\-\*\u2022\u2023\u25E6\u2043\u2219\t ]+(?:\d+[\.\)])?\s*', '', snippet)
    if not cleaned_snippet:
        cleaned_snippet = snippet

    # 4. Truncate gracefully if excessively long (> 240 chars)
    if len(cleaned_snippet) > 240:
        s_crop = max(0, start - line_start - 90)
        e_crop = min(len(line_text), end - line_start + 90)

        s_space = line_text.rfind(" ", 0, s_crop)
        if s_space != -1 and s_space > 0:
            s_crop = s_space + 1
        e_space = line_text.find(" ", e_crop)
        if e_space != -1:
            e_crop = e_space

        cropped = line_text[s_crop:e_crop].strip()
        cleaned_snippet = f"...{cropped}..."

    return cleaned_snippet if cleaned_snippet else text[start:end]


# ============================================================================
# Layer 2: Section-Aware Open-Domain Extractor
# ============================================================================
def extract_skills_from_sections(text: str) -> List[Dict[str, Any]]:
    """
    Open-domain skill extractor that locates dedicated skills sections
    (e.g., 'SKILLS', 'TECHNICAL SKILLS', 'PROFESSIONAL SKILLS', 'FINANCIAL & BUSINESS SKILLS', 'CORE COMPETENCIES')
    and extracts individual bulleted or comma-separated items even if not in the pre-defined taxonomy.
    """
    if not text:
        return []

    section_regex = re.compile(
        r'(?:(?:TECHNICAL|PROFESSIONAL|FINANCIAL\s*&\s*BUSINESS|ENGINEERING|CORE|KEY)\s+)?(?:SKILLS|COMPETENCIES|EXPERTISE)\b[:\s]*(.*?)(?=(?:\b(?:EXPERIENCE|WORK\s+EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS|PUBLICATIONS|AWARDS|LANGUAGES|REFERENCES)\b|\Z))',
        re.DOTALL | re.IGNORECASE
    )

    found_skills = []
    seen_names = set()

    for match in section_regex.finditer(text):
        section_content = match.group(1).strip()
        lines = section_content.splitlines()

        for line in lines:
            line_str = line.strip()
            if not line_str or len(line_str) < 3:
                continue

            # Strip leading bullet points, numbers, or dashes
            clean_line = re.sub(r'^[•\-\*\u2022\u2023\u25E6\u2043\u2219\t ]+(?:\d+[\.\)])?\s*', '', line_str).strip()
            if not clean_line or len(clean_line) < 3:
                continue

            # Check if line has a category prefix, e.g., "Civil Engineering: AutoCAD, Structural Analysis..."
            inferred_type = "technical"
            items_text = clean_line

            if ":" in clean_line:
                prefix, rest = clean_line.split(":", 1)
                prefix_lower = prefix.strip().lower()
                if any(w in prefix_lower for w in ["soft", "interpersonal", "personal"]):
                    inferred_type = "soft"
                elif any(w in prefix_lower for w in ["tool", "software", "technologies", "platforms"]):
                    inferred_type = "tool"
                elif any(w in prefix_lower for w in ["domain", "engineering", "civil", "accounting", "finance", "business"]):
                    inferred_type = "domain"
                else:
                    inferred_type = "technical"
                items_text = rest.strip()

            # Split comma-separated items or bulleted phrases
            raw_items = re.split(r'[,;•|]\s*', items_text)
            for item in raw_items:
                item_clean = item.strip()
                # Clean parenthetical explanations, e.g. "AutoCAD (2D & 3D drafting)" -> "AutoCAD"
                item_clean = re.sub(r'\s*\([^)]*\)', '', item_clean).strip()
                item_clean = item_clean.strip(".-* \t")

                # Validate item length and word count (skills are typically 1 to 4 words, len 2 to 45 chars)
                words = item_clean.split()
                if not (2 <= len(item_clean) <= 45 and 1 <= len(words) <= 5):
                    continue

                # Filter out pure digits, stop words, or header words
                lower_val = item_clean.lower()
                if lower_val in {"and", "or", "etc", "skills", "experience", "years", "proficient in", "knowledge of"}:
                    continue

                if lower_val not in seen_names:
                    seen_names.add(lower_val)
                    found_skills.append({
                        "skill_name": item_clean,
                        "skill_type": inferred_type,
                        "description": f"{item_clean} (Extracted from resume skills section)",
                        "confidence_score": 0.95,
                        "evidence_text": clean_line,
                        "source": "parsed"
                    })

    return found_skills


# ============================================================================
# Main Two-Layer Skill Extraction Engine
# ============================================================================
def extract_skills_from_text(text: str, custom_taxonomy: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Two-Layer Hybrid Skill Extraction:
    - Layer 1: Canonical Symbol-Safe Taxonomy Matcher (C++, .NET, CI/CD, AutoCAD, etc.)
    - Layer 2: Section-Aware Heading Parser (discovers unmapped open-domain skills in SKILLS sections)
    """
    if not text:
        return []

    if custom_taxonomy is not None:
        taxonomy = list(DEFAULT_SKILLS_TAXONOMY)
        canonical_names = {s["name"].lower() for s in taxonomy}
        for item in custom_taxonomy:
            if item["name"].lower() not in canonical_names:
                taxonomy.append(item)
                canonical_names.add(item["name"].lower())
    else:
        taxonomy = DEFAULT_SKILLS_TAXONOMY
    
    # 1. Collect all match instances across the text
    matches = []
    
    for skill_def in taxonomy:
        name = skill_def["name"]
        skill_type = skill_def.get("type", "technical")
        desc = skill_def.get("desc", "")
        patterns = skill_def.get("patterns", [rf"\b{re.escape(name.lower())}\b"])
        
        for p in patterns:
            if isinstance(p, tuple):
                pattern_str, flags = p
                regex = re.compile(pattern_str, flags)
            elif isinstance(p, re.Pattern):
                regex = p
            else:
                pattern_str = str(p)
                regex = re.compile(pattern_str, re.IGNORECASE)
            
            for m in regex.finditer(text):
                start, end = m.span()
                matched_str = m.group(0)
                span_len = end - start
                
                # Assign confidence based on extraction strength
                matched_lower = matched_str.strip().lower()
                name_lower = name.lower()
                if matched_lower == name_lower:
                    conf = 0.98
                elif matched_lower in SKILL_ALIASES:
                    conf = 0.93
                elif span_len >= 8:
                    conf = 0.95
                else:
                    conf = 0.88
                    
                matches.append({
                    "start": start,
                    "end": end,
                    "span_len": span_len,
                    "matched_text": matched_str,
                    "skill_name": name,
                    "skill_type": skill_type,
                    "desc": desc,
                    "confidence": conf
                })

    # 2. Greedy Longest-Match Phrase Precedence
    # Sort matches by span_len DESCENDING so composite phrases take precedence
    matches.sort(key=lambda x: x["span_len"], reverse=True)

    claimed_spans: List[Tuple[int, int]] = []
    selected_skills: Dict[str, Dict[str, Any]] = {}

    for cand in matches:
        start, end = cand["start"], cand["end"]
        
        # Check for overlap with already claimed spans
        overlaps = False
        for c_start, c_end in claimed_spans:
            if max(start, c_start) < min(end, c_end):
                overlaps = True
                break
                
        if overlaps:
            continue
            
        # Non-overlapping: claim span
        claimed_spans.append((start, end))
        
        s_name = cand["skill_name"]
        if s_name not in selected_skills:
            evidence = find_evidence_sentence(text, (start, end))
            selected_skills[s_name] = {
                "skill_name": s_name,
                "skill_type": cand["skill_type"],
                "description": cand["desc"],
                "confidence_score": cand["confidence"],
                "evidence_text": evidence,
                "source": "parsed"
            }
        else:
            # If already registered, update if this occurrence has higher confidence
            if cand["confidence"] > selected_skills[s_name]["confidence_score"]:
                selected_skills[s_name]["confidence_score"] = cand["confidence"]
                selected_skills[s_name]["evidence_text"] = find_evidence_sentence(text, (start, end))

    # 3. Layer 2: Section-Aware Open-Domain Extractor
    # Complements canonical matches with novel domain skills explicitly declared in resume skills sections
    section_skills = extract_skills_from_sections(text)
    for sec_s in section_skills:
        name_key = sec_s["skill_name"].strip().lower()
        # Only add if not already covered by canonical taxonomy match
        if not any(k.strip().lower() == name_key for k in selected_skills.keys()):
            selected_skills[sec_s["skill_name"]] = sec_s

    return list(selected_skills.values())
