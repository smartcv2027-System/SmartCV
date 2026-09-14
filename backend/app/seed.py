import os
import sys
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, CandidateProfile, UploadedFile, Resume, 
    Job, Skill, JobSkill, CandidateSkill, MatchResult, 
    MatchedSkill, MissingSkill, ExplanationSummary, 
    ApplicantFeedback, AuditLog
)
from app.ai.taxonomy import DEFAULT_SKILLS_TAXONOMY, extract_skills_from_text
from app.ai.matcher import SmartCVMatcher
from app.ai.xai_explainer import XAIExplainer

def seed_database(force_reseed: bool = False):
    """
    Seeds the SmartCV database with:
    1. Standard Skills Taxonomy
    2. Core Personas (Sarah Al-Ghamdi, Fahad Al-Qahtani, Laila Al-Asmari)
    3. 15 Authentic Candidate Profiles across 6 KKU degree specializations
    4. 6 Enterprise Tech Job Descriptions (Saudi & regional tech markets)
    5. Real AI Match Calculations & XAI Explanations for all 14 database tables
    6. Physical Resume Files stored in settings.UPLOAD_DIR
    """
    print("Ensuring database schema is up-to-date...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Check if already seeded unless forced
    existing_sarah = db.query(User).filter(User.email == "sarah.recruiter@tech.sa").first()
    candidate_count = db.query(CandidateProfile).count()
    job_count = db.query(Job).count()

    if not force_reseed and existing_sarah and candidate_count >= 10 and job_count >= 5:
        print(f"Database is already seeded with {candidate_count} candidates and {job_count} jobs.")
        db.close()
        return

    if force_reseed:
        print("Force reseed requested. Clearing existing application data...")
        from sqlalchemy import text
        if settings.is_sqlite:
            db.execute(text("PRAGMA foreign_keys = OFF;"))
            db.commit()
        db.query(AuditLog).delete()
        db.query(ApplicantFeedback).delete()
        db.query(ExplanationSummary).delete()
        db.query(MissingSkill).delete()
        db.query(MatchedSkill).delete()
        db.query(MatchResult).delete()
        db.query(CandidateSkill).delete()
        db.query(JobSkill).delete()
        db.query(Resume).delete()
        db.query(Job).delete()
        db.query(UploadedFile).delete()
        db.query(CandidateProfile).delete()
        db.query(User).delete()
        db.commit()
        if settings.is_sqlite:
            db.execute(text("PRAGMA foreign_keys = ON;"))
            db.commit()


    # ------------------------------------------------------------------------
    # 1. Skills Taxonomy
    # ------------------------------------------------------------------------
    print("Seeding skills taxonomy...")
    for item in DEFAULT_SKILLS_TAXONOMY:
        existing_s = db.query(Skill).filter(Skill.skill_name.ilike(item["name"])).first()
        if not existing_s:
            s = Skill(
                skill_name=item["name"],
                skill_type=item["type"],
                description=item.get("desc", f"{item['name']} skill"),
                is_active=True
            )
            db.add(s)
    db.commit()

    # ------------------------------------------------------------------------
    # 2. System Core Personas (Sarah, Fahad, Laila)
    # ------------------------------------------------------------------------
    print("Seeding core administrative and recruiter personas...")
    sarah = db.query(User).filter(User.username == "sarah_recruiter").first()
    if not sarah:
        sarah = User(
            username="sarah_recruiter",
            full_name="Sarah Al-Ghamdi",
            email="sarah.recruiter@tech.sa",
            password_hash=get_password_hash("password123"),
            role_type=UserRole.RECRUITER,
            phone="+966 50 123 4567",
            status="active"
        )
        db.add(sarah)
        db.commit()
        db.refresh(sarah)

    fahad = db.query(User).filter(User.username == "fahad_applicant").first()
    if not fahad:
        fahad = User(
            username="fahad_applicant",
            full_name="Fahad Al-Qahtani",
            email="fahad.applicant@kku.edu.sa",
            password_hash=get_password_hash("password123"),
            role_type=UserRole.APPLICANT,
            phone="+966 55 987 6543",
            status="active"
        )
        db.add(fahad)
        db.commit()
        db.refresh(fahad)

    laila = db.query(User).filter(User.username == "laila_admin").first()
    if not laila:
        laila = User(
            username="laila_admin",
            full_name="Laila Al-Asmari",
            email="laila.admin@kku.edu.sa",
            password_hash=get_password_hash("admin123"),
            role_type=UserRole.ADMIN,
            phone="+966 54 321 0987",
            status="active"
        )
        db.add(laila)
        db.commit()
        db.refresh(laila)

    # ------------------------------------------------------------------------
    # 3. 15 Authentic Candidate Profiles & Resumes
    # ------------------------------------------------------------------------
    print("Seeding 15 authentic candidate profiles across KKU degree specializations...")

    CANDIDATES_METADATA = [
        {
            "username": "fahad_applicant",
            "full_name": "Fahad Al-Qahtani",
            "email": "fahad.applicant@kku.edu.sa",
            "phone": "+966 55 987 6543",
            "student_id": "444809895",
            "major": "Information Systems",
            "university": "King Khalid University",
            "gpa": "4.78 / 5.0",
            "career_level": "Senior Student / Fresh Graduate",
            "summary": "Information Systems senior specializing in AI, Machine Learning, and Sentence-BERT with hands-on capstone project experience on explainable recruitment screening.",
            "filename": "Fahad_AlQahtani_CV.txt",
            "resume_text": """FAHAD AL-QAHTANI
Abha, Saudi Arabia | fahad.applicant@kku.edu.sa | +966 55 987 6543
LinkedIn: linkedin.com/in/fahad-kku | GitHub: github.com/fahad-kku

EDUCATION
Bachelor of Science in Information Systems | King Khalid University, Abha, KSA
Graduation: May 2026 | GPA: 4.78 / 5.0
Relevant Coursework: Machine Learning, Database Design, Natural Language Processing, Software Engineering.

TECHNICAL SKILLS
- Programming: Python, SQL, C++, JavaScript
- AI & Machine Learning: Machine Learning, Sentence-BERT, Scikit-Learn, PyTorch, Data Analysis, Pandas, NumPy
- Web & Tools: FastAPI, PostgreSQL, Git / GitHub, Power BI, Jupyter Notebooks
- Soft Skills: Team Collaboration, Problem Solving, Analytical Thinking

ACADEMIC PROJECTS
- SmartCV Explainable AI Recruitment Screening System (Capstone Project):
  Built an NLP matching prototype using Python, FastAPI, and Sentence-BERT to compute semantic compatibility scores between student resumes and job descriptions.
- Predictive Analytics for Retail Consumer Demand:
  Trained Scikit-Learn regression models on 20,000+ sales transactions; visualized performance metrics using Power BI dashboards.
- University Portal Relational Database:
  Designed a 3NF normalized PostgreSQL database schema with role-based access control and automated indexing."""
        },
        {
            "username": "nouf_otaibi",
            "full_name": "Nouf Al-Otaibi",
            "email": "nouf.otaibi@kku.edu.sa",
            "phone": "+966 56 111 2233",
            "student_id": "444809769",
            "major": "Computer Science",
            "university": "King Khalid University",
            "gpa": "4.90 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Full-Stack Web Developer specialized in Next.js 14, React, TypeScript, and accessible responsive user interfaces.",
            "filename": "Nouf_AlOtaibi_Frontend_CV.txt",
            "resume_text": """NOUF AL-OTAIBI
Abha, Saudi Arabia | nouf.otaibi@kku.edu.sa | +966 56 111 2233
GitHub: github.com/nouf-dev | Portfolio: nouf-web.dev

EDUCATION
Bachelor of Science in Computer Science | King Khalid University
Graduation: January 2026 | GPA: 4.90 / 5.0 (First Class Honors)

TECHNICAL SKILLS
- Front-End: React, Next.js, TypeScript, JavaScript, HTML/CSS, Tailwind CSS
- Back-End & Data: Node.js, REST APIs, PostgreSQL, Git / GitHub, Docker
- Soft Skills: Problem Solving, UI/UX Empathy, Team Collaboration, Communication

PROJECTS
- Academic Student Portal & Portfolio:
  Engineered full-stack responsive web application utilizing Next.js 14, TypeScript, Tailwind CSS, and React Server Components.
- Multi-Tenant E-Commerce REST API:
  Developed Node.js backend with PostgreSQL and Docker containerization; integrated Stripe API payments."""
        },
        {
            "username": "omar_shehri",
            "full_name": "Omar Al-Shehri",
            "email": "omar.shehri@kku.edu.sa",
            "phone": "+966 57 444 5566",
            "student_id": "444808554",
            "major": "Information Systems",
            "university": "King Khalid University",
            "gpa": "4.65 / 5.0",
            "career_level": "Senior Student",
            "summary": "Data & Business Intelligence Analyst with deep expertise in SQL, PostgreSQL, Power BI dashboards, and data normalization.",
            "filename": "Omar_AlShehri_Database_CV.txt",
            "resume_text": """OMAR AL-SHEHRI
Abha, Saudi Arabia | omar.shehri@kku.edu.sa | +966 57 444 5566

EDUCATION
Bachelor of Science in Information Systems | King Khalid University
Expected Graduation: 2026 | GPA: 4.65 / 5.0

TECHNICAL SKILLS
- Data & Databases: SQL, PostgreSQL, Database Design, Data Modeling, Data Analysis, Power BI, Excel
- Programming: Python, HTML/CSS
- Tools: Git / GitHub, Jupyter Notebooks
- Soft Skills: Team Collaboration, Critical Thinking, Time Management

PROJECTS
- Enterprise Database Normalization & Query Tuning:
  Implemented normalized PostgreSQL database handling 50k+ student academic records; optimized slow joins using composite B-tree indexes.
- College Performance KPI Dashboard:
  Designed interactive Power BI business intelligence dashboards tracking graduation rates and departmental employment KPIs."""
        },
        {
            "username": "reem_ghamdi",
            "full_name": "Reem Al-Ghamdi",
            "email": "reem.ghamdi@kku.edu.sa",
            "phone": "+966 53 222 3344",
            "student_id": "444801122",
            "major": "Computer Science (Cybersecurity Track)",
            "university": "King Khalid University",
            "gpa": "4.85 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Cybersecurity and SOC defense specialist with hands-on experience in network traffic analysis, Wireshark, Linux hardening, and Saudi NCA compliance.",
            "filename": "Reem_AlGhamdi_Cybersecurity_CV.txt",
            "resume_text": """REEM AL-GHAMDI
Abha / Riyadh, Saudi Arabia | reem.ghamdi@kku.edu.sa | +966 53 222 3344
LinkedIn: linkedin.com/in/reem-security

EDUCATION
Bachelor of Science in Computer Science (Cybersecurity Specialization) | King Khalid University
Graduation: January 2026 | GPA: 4.85 / 5.0

TECHNICAL SKILLS
- Security: Information Security, Network Security, Wireshark, Incident Response, Ethical Hacking, SIEM
- Systems & Tools: Linux, Python, Bash, Nmap, Metasploit, Git / GitHub
- Soft Skills: Analytical Investigation, Problem Solving, Team Collaboration

PROJECTS & CERTIFICATIONS
- Network Intrusion Detection & Incident Response Lab:
  Analyzed anomalous packet captures using Wireshark and configured automated Snort alert rules on Ubuntu Linux.
- NCA Cybersecurity Framework Compliance Audit:
  Conducted mock security posture review against Saudi National Cybersecurity Authority Essential Cybersecurity Controls (ECC)."""
        },
        {
            "username": "saad_dossary",
            "full_name": "Saad Al-Dossary",
            "email": "saad.dossary@kfupm.edu.sa",
            "phone": "+966 50 888 9900",
            "student_id": "202108740",
            "major": "Computer Science",
            "university": "King Fahd University of Petroleum & Minerals (KFUPM)",
            "gpa": "4.75 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Cloud DevOps Engineer passionate about containerization, Kubernetes cluster orchestration, and automated CI/CD pipelines on AWS.",
            "filename": "Saad_AlDossary_DevOps_CV.txt",
            "resume_text": """SAAD AL-DOSSARY
Dhahran / Riyadh, Saudi Arabia | saad.dossary@kfupm.edu.sa | +966 50 888 9900
GitHub: github.com/saad-cloud | LinkedIn: linkedin.com/in/saad-dossary

EDUCATION
Bachelor of Science in Computer Science | KFUPM, Dhahran
Graduation: January 2026 | GPA: 4.75 / 5.0

TECHNICAL SKILLS
- Cloud & DevOps: Docker, Kubernetes, AWS, CI/CD Pipelines, Linux, Bash, Microsoft Azure
- Programming: Python, Go, YAML
- Tools: Git / GitHub, Terraform, Prometheus
- Soft Skills: Reliability, Problem Solving, Team Collaboration

PROJECTS
- Automated Microservices Kubernetes Cluster on AWS:
  Deployed highly available multi-node Kubernetes cluster using Docker containers and GitLab CI/CD pipelines with zero-downtime rolling updates.
- Infrastructure-as-Code AWS Provisioning:
  Automated VPC, EC2, and RDS database provisioning using modular Terraform scripts."""
        },
        {
            "username": "halah_zahrani",
            "full_name": "Halah Al-Zahrani",
            "email": "halah.zahrani@kku.edu.sa",
            "phone": "+966 55 333 4455",
            "student_id": "444807766",
            "major": "Computer Science",
            "university": "King Khalid University",
            "gpa": "4.88 / 5.0",
            "career_level": "Senior Student",
            "summary": "Computer Vision and Deep Learning researcher with extensive experience in OpenCV, PyTorch, YOLO object detection, and CNNs.",
            "filename": "Halah_AlZahrani_ComputerVision_CV.txt",
            "resume_text": """HALAH AL-ZAHRANI
Abha, Saudi Arabia | halah.zahrani@kku.edu.sa | +966 55 333 4455

EDUCATION
Bachelor of Science in Computer Science | King Khalid University
Expected Graduation: May 2026 | GPA: 4.88 / 5.0

TECHNICAL SKILLS
- AI & Vision: Computer Vision, Deep Learning, OpenCV, PyTorch, YOLO object detection, TensorFlow, Machine Learning
- Programming: Python, C++
- Tools: Git / GitHub, Google Colab, Jupyter Notebooks
- Soft Skills: Scientific Rigor, Problem Solving, Presentation Skills

PROJECTS
- Real-Time Traffic & Plate Recognition System:
  Trained YOLOv8 and PyTorch models for vehicle detection and OpenCV for automated license plate recognition; achieved 94% mAP.
- Medical Image Segmentation via Deep Convolutional Networks:
  Developed U-Net architecture in PyTorch for automated lesion segmentation in biomedical scans."""
        },
        {
            "username": "rakan_harbi",
            "full_name": "Rakan Al-Harbi",
            "email": "rakan.harbi@ksu.edu.sa",
            "phone": "+966 54 777 8899",
            "student_id": "442103980",
            "major": "Software Engineering",
            "university": "King Saud University",
            "gpa": "4.62 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Software Engineer specialized in enterprise Java backend, Spring Boot microservices, PostgreSQL, and scalable REST APIs.",
            "filename": "Rakan_AlHarbi_SoftwareEng_CV.txt",
            "resume_text": """RAKAN AL-HARBI
Riyadh, Saudi Arabia | rakan.harbi@ksu.edu.sa | +966 54 777 8899
GitHub: github.com/rakan-dev

EDUCATION
Bachelor of Science in Software Engineering | King Saud University, Riyadh
Graduation: January 2026 | GPA: 4.62 / 5.0

TECHNICAL SKILLS
- Back-End: Java, Spring Boot, PostgreSQL, SQL, REST APIs, Docker, Object-Oriented Design
- Front-End: React, JavaScript, HTML/CSS
- Tools: Git / GitHub, Maven, Postman, Linux
- Soft Skills: Software Architecture, Problem Solving, Teamwork

PROJECTS
- Distributed Banking Transactions Engine:
  Engineered resilient REST API microservice utilizing Java, Spring Boot, and PostgreSQL with ACID-compliant concurrency locking.
- Hospital Appointments Booking Portal:
  Developed full-stack web application featuring Java Spring backend and React client."""
        },
        {
            "username": "bayan_shahrani",
            "full_name": "Bayan Al-Shahrani",
            "email": "bayan.shahrani@kku.edu.sa",
            "phone": "+966 59 123 7890",
            "student_id": "444806543",
            "major": "Information Systems",
            "university": "King Khalid University",
            "gpa": "4.72 / 5.0",
            "career_level": "Senior Student",
            "summary": "Data Scientist skilled in statistical modeling, Scikit-Learn, Pandas, NumPy, Power BI, and predictive time-series forecasting.",
            "filename": "Bayan_AlShahrani_DataScience_CV.txt",
            "resume_text": """BAYAN AL-SHAHRANI
Abha, Saudi Arabia | bayan.shahrani@kku.edu.sa | +966 59 123 7890

EDUCATION
Bachelor of Science in Information Systems | King Khalid University
Expected Graduation: May 2026 | GPA: 4.72 / 5.0

TECHNICAL SKILLS
- Data Science: Data Analysis, Machine Learning, Scikit-Learn, Pandas, NumPy, Data Visualization, Power BI
- Database & Code: Python, SQL, PostgreSQL, Jupyter Notebooks
- Soft Skills: Data Storytelling, Problem Solving, Communication

PROJECTS
- Healthcare Patient Readmission Prediction:
  Built Random Forest and Logistic Regression models using Scikit-Learn and Pandas on 15k patient records to forecast 30-day readmission risk.
- Interactive Regional Economic Dashboard:
  Developed comprehensive Power BI reporting suite connected to PostgreSQL database."""
        },
        {
            "username": "yazeed_mutairi",
            "full_name": "Yazeed Al-Mutairi",
            "email": "yazeed.mutairi@kku.edu.sa",
            "phone": "+966 58 444 1122",
            "student_id": "444803399",
            "major": "Computer Engineering",
            "university": "King Khalid University",
            "gpa": "4.58 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Computer Engineer with background in C, C++, Linux kernel programming, systems architecture, and embedded microcontrollers.",
            "filename": "Yazeed_AlMutairi_Systems_CV.txt",
            "resume_text": """YAZEED AL-MUTAIRI
Abha, Saudi Arabia | yazeed.mutairi@kku.edu.sa | +966 58 444 1122

EDUCATION
Bachelor of Science in Computer Engineering | King Khalid University
Graduation: January 2026 | GPA: 4.58 / 5.0

TECHNICAL SKILLS
- Systems: C, C++, Linux, Git / GitHub, Problem Solving, Python
- Architecture: Microcontroller Programming, Operating Systems, Computer Architecture
- Soft Skills: Analytical Thinking, Troubleshooting, Team Collaboration

PROJECTS
- Embedded IoT Sensor Telemetry on Linux:
  Wrote multithreaded C application to read hardware sensor signals and transmit telemetry over TCP sockets on embedded Linux board.
- Custom Memory Allocator in C++:
  Designed pooled block memory allocator in C++ demonstrating efficient heap fragmentation management."""
        },
        {
            "username": "lulwah_subaie",
            "full_name": "Lulwah Al-Subaie",
            "email": "lulwah.subaie@kku.edu.sa",
            "phone": "+966 54 888 3322",
            "student_id": "444805544",
            "major": "Computer Science",
            "university": "King Khalid University",
            "gpa": "4.92 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Quality Assurance and Test Automation Engineer skilled in PyTest, Selenium, API automated testing, and CI/CD integration.",
            "filename": "Lulwah_AlSubaie_QA_CV.txt",
            "resume_text": """LULWAH AL-SUBAIE
Abha / Riyadh, Saudi Arabia | lulwah.subaie@kku.edu.sa | +966 54 888 3322

EDUCATION
Bachelor of Science in Computer Science | King Khalid University
Graduation: January 2026 | GPA: 4.92 / 5.0 (First Class Honors)

TECHNICAL SKILLS
- QA & Testing: Automated Testing, PyTest, Selenium, Postman, CI/CD Pipelines, REST APIs
- Languages: Python, JavaScript, HTML/CSS, SQL
- Tools: Git / GitHub, Docker, Jira
- Soft Skills: Attention to Detail, Problem Solving, Communication

PROJECTS
- End-to-End Automated Regression Test Suite:
  Engineered automated testing framework with PyTest and Selenium WebDriver covering 120+ user journeys for web portal.
- REST API Automated Test Pipeline:
  Configured GitHub Actions CI/CD workflow executing automated Newman / Postman API tests on every pull request."""
        },
        {
            "username": "tariq_amri",
            "full_name": "Tariq Al-Amri",
            "email": "tariq.amri@kku.edu.sa",
            "phone": "+966 56 777 4433",
            "student_id": "444804455",
            "major": "Software Engineering",
            "university": "King Khalid University",
            "gpa": "4.69 / 5.0",
            "career_level": "Senior Student",
            "summary": "Cross-Platform Mobile Application Developer experienced with Flutter, Dart, React, Firebase, and REST API integration.",
            "filename": "Tariq_AlAmri_Mobile_CV.txt",
            "resume_text": """TARIQ AL-AMRI
Abha, Saudi Arabia | tariq.amri@kku.edu.sa | +966 56 777 4433
GitHub: github.com/tariq-apps

EDUCATION
Bachelor of Science in Software Engineering | King Khalid University
Expected Graduation: May 2026 | GPA: 4.69 / 5.0

TECHNICAL SKILLS
- Mobile & Web: Flutter, Dart, React, JavaScript, HTML/CSS, REST APIs
- Backend & Cloud: Firebase, Node.js, Git / GitHub
- Soft Skills: User Centric Design, Problem Solving, Team Collaboration

PROJECTS
- Asir Tourism Guide Mobile App:
  Built cross-platform iOS and Android mobile app using Flutter and Dart with real-time Firebase Firestore synchronization.
- University Student Events Platform:
  Developed responsive web interface using React and REST APIs."""
        },
        {
            "username": "mona_hajri",
            "full_name": "Mona Al-Hajri",
            "email": "mona.hajri@kku.edu.sa",
            "phone": "+966 53 999 1100",
            "student_id": "444802211",
            "major": "Information Technology",
            "university": "King Khalid University",
            "gpa": "4.74 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Cloud Administrator and Systems Specialist with practical skills in Microsoft Azure, Linux administration, Docker, and Bash scripting.",
            "filename": "Mona_AlHajri_CloudAdmin_CV.txt",
            "resume_text": """MONA AL-HAJRI
Abha, Saudi Arabia | mona.hajri@kku.edu.sa | +966 53 999 1100

EDUCATION
Bachelor of Science in Information Technology | King Khalid University
Graduation: January 2026 | GPA: 4.74 / 5.0

TECHNICAL SKILLS
- Cloud & OS: Microsoft Azure, Linux, Docker, Bash, CI/CD Pipelines
- Networking & Tools: Git / GitHub, Network Security, Python
- Soft Skills: System Reliability, Problem Solving, Teamwork

PROJECTS
- Azure Cloud High-Availability Migration:
  Architected secure virtual network in Microsoft Azure hosting load-balanced Ubuntu Linux web servers with automated Bash deployment scripts.
- Containerized Development Environment:
  Packaged microservices into Docker images managed via Git / GitHub repository workflows."""
        },
        {
            "username": "abdulaziz_ghamdi",
            "full_name": "Abdulaziz Al-Ghamdi",
            "email": "abdulaziz.ghamdi@kku.edu.sa",
            "phone": "+966 55 666 8877",
            "student_id": "444801998",
            "major": "Information Systems",
            "university": "King Khalid University",
            "gpa": "4.61 / 5.0",
            "career_level": "Senior Student",
            "summary": "NLP enthusiast with strong skills in Python, Transformers, BERT, PyTorch, and text classification.",
            "filename": "Abdulaziz_AlGhamdi_NLP_CV.txt",
            "resume_text": """ABDULAZIZ AL-GHAMDI
Abha, Saudi Arabia | abdulaziz.ghamdi@kku.edu.sa | +966 55 666 8877

EDUCATION
Bachelor of Science in Information Systems | King Khalid University
Expected Graduation: 2026 | GPA: 4.61 / 5.0

TECHNICAL SKILLS
- NLP & AI: Natural Language Processing (NLP), BERT / Transformers, Machine Learning, PyTorch, Python, SQL
- Tools: Git / GitHub, Jupyter Notebooks, Hugging Face
- Soft Skills: Analytical Thinking, Team Collaboration

PROJECTS
- Arabic Sentiment Analysis with Transformers:
  Fine-tuned Arabic BERT transformer models on social media reviews using PyTorch and Hugging Face; achieved 89% accuracy.
- Automated Job Requirement Keyword Extraction:
  Implemented Python NLP pipeline utilizing regex tokenization and TF-IDF for resume parsing."""
        },
        {
            "username": "khaled_garni",
            "full_name": "Khaled Al-Garni",
            "email": "khaled.garni@kku.edu.sa",
            "phone": "+966 50 111 9988",
            "student_id": "443209112",
            "major": "Civil Engineering",
            "university": "King Khalid University",
            "gpa": "3.85 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Civil Engineer specialized in structural concrete analysis, AutoCAD drafting, site surveying, and project construction supervision (Negative Control Baseline).",
            "filename": "Khaled_AlGarni_CivilEng_CV.txt",
            "resume_text": """KHALED AL-GARNI
Abha, Saudi Arabia | khaled.garni@kku.edu.sa | +966 50 111 9988

EDUCATION
Bachelor of Science in Civil Engineering | King Khalid University
Graduation: January 2026 | GPA: 3.85 / 5.0

PROFESSIONAL SKILLS
- Civil Engineering: AutoCAD, Structural Analysis, Concrete Testing, Construction Surveying, Project Scheduling, Soil Mechanics, Site Supervision, Cost Estimation
- Soft Skills: Physical Stamina, Project Management, Contractor Coordination

EXPERIENCE & PROJECTS
- Senior Highway & Bridge Structural Design:
  Performed structural load modeling in ETABS and produced detailed architectural drafting drawings in AutoCAD.
- Concrete Quality Assurance Testing:
  Conducted slump tests, compressive strength evaluations, and curing inspections across commercial construction sites in Asir region."""
        },
        {
            "username": "fatima_sulaiman",
            "full_name": "Fatima Al-Sulaiman",
            "email": "fatima.sulaiman@kku.edu.sa",
            "phone": "+966 55 222 7766",
            "student_id": "443108552",
            "major": "Accounting & Financial Management",
            "university": "King Khalid University",
            "gpa": "4.15 / 5.0",
            "career_level": "Fresh Graduate",
            "summary": "Accountant and Financial Auditor with expertise in general ledger accounting, corporate tax, VAT compliance, and Excel financial modeling (Negative Control Baseline).",
            "filename": "Fatima_AlSulaiman_Accounting_CV.txt",
            "resume_text": """FATIMA AL-SULAIMAN
Abha / Riyadh, Saudi Arabia | fatima.sulaiman@kku.edu.sa | +966 55 222 7766

EDUCATION
Bachelor of Science in Accounting | King Khalid University
Graduation: January 2026 | GPA: 4.15 / 5.0

FINANCIAL & BUSINESS SKILLS
- Accounting: Financial Auditing, General Ledger, VAT Compliance, Tax Preparation, IFRS Standards, Financial Statement Analysis, Bank Reconciliation, Excel
- Soft Skills: Numerical Accuracy, Ethical Compliance, Discretion, Time Management

EXPERIENCE & PROJECTS
- Corporate VAT & Zakat Compliance Audit:
  Prepared quarterly value-added tax returns and reconciled bank statements for commercial clients adhering to ZATCA regulations.
- Three-Statement Financial Forecast Model:
  Built dynamic financial modeling templates in Microsoft Excel to project 5-year cash flows and balance sheet ratios."""
        }
    ]

    seeded_resumes = []
    for cdata in CANDIDATES_METADATA:
        # 1. User
        user = db.query(User).filter(User.username == cdata["username"]).first()
        if not user:
            user = User(
                username=cdata["username"],
                full_name=cdata["full_name"],
                email=cdata["email"],
                password_hash=get_password_hash("password123"),
                role_type=UserRole.APPLICANT,
                phone=cdata["phone"],
                status="active"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # 2. CandidateProfile
        prof = db.query(CandidateProfile).filter(CandidateProfile.user_id == user.user_id).first()
        if not prof:
            prof = CandidateProfile(
                user_id=user.user_id,
                student_id=cdata["student_id"],
                major=cdata["major"],
                university=cdata["university"],
                gpa=cdata["gpa"],
                career_level=cdata["career_level"],
                profile_summary=cdata["summary"]
            )
            db.add(prof)
            db.commit()
            db.refresh(prof)

        # 3. Physical Resume File on Disk
        file_path = os.path.join(settings.UPLOAD_DIR, cdata["filename"])
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(cdata["resume_text"].strip())

        file_size_kb = max(1, os.path.getsize(file_path) // 1024)

        up_file = db.query(UploadedFile).filter(
            UploadedFile.uploaded_by == user.user_id,
            UploadedFile.file_name == cdata["filename"]
        ).first()

        if not up_file:
            up_file = UploadedFile(
                uploaded_by=user.user_id,
                file_name=cdata["filename"],
                file_type="txt",
                mime_type="text/plain",
                storage_path=file_path,
                file_size_kb=file_size_kb,
                checksum=f"seed_hash_{user.user_id}_{cdata['student_id']}"
            )
            db.add(up_file)
            db.commit()
            db.refresh(up_file)

        # 4. Resume record
        res = db.query(Resume).filter(Resume.candidate_id == prof.candidate_id).first()
        if not res:
            res = Resume(
                candidate_id=prof.candidate_id,
                file_id=up_file.file_id,
                resume_title=cdata["filename"],
                raw_text=cdata["resume_text"].strip(),
                parsed_status="parsed",
                is_default=True
            )
            db.add(res)
            db.commit()
            db.refresh(res)

        # 5. Extract and populate candidate skills
        db.query(CandidateSkill).filter(CandidateSkill.resume_id == res.resume_id).delete()
        skills_ext = extract_skills_from_text(res.raw_text)
        for s in skills_ext:
            s_obj = db.query(Skill).filter(Skill.skill_name.ilike(s["skill_name"])).first()
            if not s_obj:
                s_obj = Skill(
                    skill_name=s["skill_name"],
                    skill_type=s.get("skill_type", "technical"),
                    description=s.get("description", f"{s['skill_name']} skill"),
                    is_active=True
                )
                db.add(s_obj)
                db.commit()
                db.refresh(s_obj)

            cs = CandidateSkill(
                candidate_id=prof.candidate_id,
                resume_id=res.resume_id,
                skill_id=s_obj.skill_id,
                evidence_text=s["evidence_text"],
                confidence_score=s["confidence_score"],
                source="parsed"
            )
            db.add(cs)
        db.commit()
        seeded_resumes.append((prof, res))

    # ------------------------------------------------------------------------
    # 4. 6 Enterprise Tech Job Postings
    # ------------------------------------------------------------------------
    print("Seeding 6 enterprise tech job postings with explicit skill requirements...")

    JOBS_DATA = [
        {
            "job_title": "Junior AI & Machine Learning Engineer",
            "location": "Riyadh, Saudi Arabia (Hybrid)",
            "required_education": "Bachelor of Science in Computer Science, Artificial Intelligence, or Information Systems",
            "required_experience": "Entry Level / 0-2 Years",
            "job_summary": "Build, evaluate, and deploy machine learning and NLP models using Python, PyTorch, FastAPI, and PostgreSQL for predictive enterprise intelligence.",
            "raw_text": """We are seeking a high-potential Junior AI & Machine Learning Engineer to join our Applied AI and Data Intelligence team in Riyadh, supporting Saudi Vision 2030 digital transformation.

KEY RESPONSIBILITIES:
- Develop and evaluate predictive machine learning pipelines using Python, PyTorch, and Scikit-Learn.
- Build and fine-tune Natural Language Processing (NLP) models using BERT and Transformer architectures.
- Collaborate with software engineers to deploy algorithms as robust microservices via FastAPI and PostgreSQL.
- Perform exploratory data analysis and query operational databases using SQL.
- Participate in code reviews using Git / GitHub.

REQUIREMENTS & QUALIFICATIONS:
- Bachelor's degree in Computer Science, AI, Information Systems, or closely related discipline.
- Strong programming foundation in Python and SQL.
- Proven coursework or project experience in Machine Learning, PyTorch, and Scikit-Learn.
- Familiarity with FastAPI, Natural Language Processing (NLP), and PostgreSQL.
- Excellent Team Collaboration and analytical Problem Solving abilities.""",
            "skills": [
                ("Python", "required", 1.5),
                ("Machine Learning", "required", 1.5),
                ("PyTorch", "required", 1.4),
                ("SQL", "required", 1.2),
                ("Natural Language Processing (NLP)", "preferred", 1.1),
                ("FastAPI", "preferred", 1.0),
                ("PostgreSQL", "preferred", 1.0),
                ("Scikit-Learn", "preferred", 1.0),
                ("Git / GitHub", "required", 0.9),
                ("Team Collaboration", "required", 0.8),
                ("Problem Solving", "required", 0.8)
            ]
        },
        {
            "job_title": "Junior Front-End Web Developer",
            "location": "Riyadh, Saudi Arabia (Remote Available)",
            "required_education": "Bachelor of Science in Computer Science, Software Engineering, or Web Technology",
            "required_experience": "Entry Level / 0-2 Years",
            "job_summary": "Develop modern, accessible, and high-performance user interfaces using React, Next.js 14, TypeScript, and Tailwind CSS.",
            "raw_text": """Join our Digital Products division as a Junior Front-End Web Developer building mission-critical public portals and enterprise dashboards.

KEY RESPONSIBILITIES:
- Build responsive, accessible web interfaces utilizing Next.js 14, React, TypeScript, and Tailwind CSS.
- Integrate frontend client state with backend REST APIs and handle asynchronous data loading.
- Maintain code quality, component documentation, and automated UI testing via Git / GitHub workflows.

REQUIREMENTS & QUALIFICATIONS:
- Bachelor's degree in Computer Science, Software Engineering, or related technical field.
- Proficiency in JavaScript, TypeScript, React, Next.js, and HTML/CSS.
- Hands-on experience with Tailwind CSS and Git / GitHub.
- Strong understanding of REST APIs and client-side performance optimization.
- Proactive Problem Solving and clear Communication skills.""",
            "skills": [
                ("React", "required", 1.5),
                ("Next.js", "required", 1.5),
                ("TypeScript", "required", 1.3),
                ("JavaScript", "required", 1.1),
                ("HTML/CSS", "required", 1.0),
                ("REST APIs", "preferred", 1.0),
                ("Git / GitHub", "preferred", 1.0),
                ("Problem Solving", "required", 0.8),
                ("Communication", "required", 0.8)
            ]
        },
        {
            "job_title": "Cloud & DevOps Infrastructure Engineer",
            "location": "Abha, Saudi Arabia (On-site / Hybrid)",
            "required_education": "Bachelor of Science in Computer Science, Cloud Computing, or Network Engineering",
            "required_experience": "Entry Level / 0-2 Years",
            "job_summary": "Automate cloud infrastructure deployments, containerize applications with Docker, and orchestrate Kubernetes clusters on AWS and Azure.",
            "raw_text": """Our Infrastructure & Platform Engineering department is recruiting a Cloud & DevOps Infrastructure Engineer based in Abha.

KEY RESPONSIBILITIES:
- Containerize microservice applications using Docker and orchestrate workloads with Kubernetes.
- Design, test, and maintain automated CI/CD Pipelines for zero-downtime application releases.
- Provision and monitor secure cloud resources across AWS and Microsoft Azure.
- Write automation scripts using Python and Bash on enterprise Linux servers.

REQUIREMENTS & QUALIFICATIONS:
- Bachelor's degree in Computer Science, Cloud Computing, or Network Systems.
- Practical experience with Docker, Kubernetes, AWS, and Linux administration.
- Familiarity with CI/CD Pipelines and automated testing.
- Scripting knowledge in Python or Bash.
- Strong drive for system reliability, Team Collaboration, and Problem Solving.""",
            "skills": [
                ("Docker", "required", 1.5),
                ("Kubernetes", "required", 1.5),
                ("AWS", "required", 1.3),
                ("CI/CD Pipelines", "required", 1.2),
                ("Linux", "required", 1.2),
                ("Python", "preferred", 1.0),
                ("Microsoft Azure", "preferred", 1.0),
                ("Git / GitHub", "required", 1.0),
                ("Team Collaboration", "required", 0.8),
                ("Problem Solving", "required", 0.8)
            ]
        },
        {
            "job_title": "Cybersecurity SOC Analyst & Defense Specialist",
            "location": "Riyadh, Saudi Arabia (NCA Partner)",
            "required_education": "Bachelor of Science in Cybersecurity, Information Assurance, or Computer Science",
            "required_experience": "Entry Level / 0-2 Years",
            "job_summary": "Monitor security operations center (SOC) telemetry, investigate network intrusions, analyze packet captures with Wireshark, and enforce NCA controls.",
            "raw_text": """We are seeking an alert, detail-oriented Cybersecurity SOC Analyst to safeguard national digital assets within our 24/7 Security Operations Center in Riyadh.

KEY RESPONSIBILITIES:
- Monitor and triage security events, alerts, and anomalous traffic across corporate networks.
- Conduct deep packet inspection and protocol analysis using Wireshark and network security monitoring tools.
- Triage potential security breaches, perform initial Incident Response, and document forensic timelines.
- Maintain and harden Linux servers against emerging cyber threat vectors.
- Support compliance auditing against Saudi National Cybersecurity Authority (NCA) regulations.

REQUIREMENTS & QUALIFICATIONS:
- Bachelor's degree in Cybersecurity, Information Security, or Computer Science.
- Firm understanding of Information Security principles, Network Security architectures, and TCP/IP protocols.
- Hands-on lab experience with Wireshark, Linux, and Python for security scripting.
- Knowledge of Ethical Hacking methodologies and common web vulnerabilities.
- Strong analytical vigilance, Problem Solving, and Team Collaboration.""",
            "skills": [
                ("Information Security", "required", 1.5),
                ("Network Security", "required", 1.5),
                ("Wireshark", "required", 1.3),
                ("Linux", "required", 1.2),
                ("Python", "preferred", 1.0),
                ("Ethical Hacking", "preferred", 1.0),
                ("Git / GitHub", "preferred", 0.8),
                ("Problem Solving", "required", 0.9),
                ("Team Collaboration", "required", 0.8)
            ]
        },
        {
            "job_title": "Data Engineer & Business Intelligence Specialist",
            "location": "Riyadh, Saudi Arabia (Financial Sector)",
            "required_education": "Bachelor of Science in Information Systems, Data Science, or Computer Science",
            "required_experience": "Entry Level / 0-2 Years",
            "job_summary": "Design normalized transactional and analytical database models, automate ETL pipelines, and create executive KPI dashboards in Power BI.",
            "raw_text": """Our Enterprise Analytics practice is hiring a Data Engineer & Business Intelligence Specialist to build modern data warehousing pipelines and business intelligence assets.

KEY RESPONSIBILITIES:
- Model and maintain relational database schemas utilizing PostgreSQL and advanced SQL.
- Design, implement, and monitor automated ETL data extraction and loading scripts using Python.
- Create interactive, visually compelling business intelligence dashboards in Power BI for executive leadership.
- Partner with business stakeholders to translate strategic questions into actionable data metrics.

REQUIREMENTS & QUALIFICATIONS:
- Bachelor's degree in Information Systems, Computer Science, Data Science, or related discipline.
- Mastery of SQL querying, database indexing, and PostgreSQL administration.
- Advanced proficiency in Power BI dashboard design and Data Visualization.
- Experience writing data manipulation scripts with Python and Pandas.
- High attention to data accuracy and strong analytical Problem Solving skills.""",
            "skills": [
                ("SQL", "required", 1.5),
                ("PostgreSQL", "required", 1.4),
                ("Power BI", "required", 1.4),
                ("Python", "required", 1.2),
                ("Data Analysis", "required", 1.2),
                ("Database Design", "preferred", 1.0),
                ("Data Visualization", "preferred", 1.0),
                ("Git / GitHub", "preferred", 0.8),
                ("Problem Solving", "required", 0.8)
            ]
        },
        {
            "job_title": "Full-Stack Software Engineer",
            "location": "Al-Khobar, Saudi Arabia (Hybrid)",
            "required_education": "Bachelor of Science in Software Engineering or Computer Science",
            "required_experience": "Entry Level / 0-2 Years",
            "job_summary": "Architect and deliver scalable enterprise web applications and resilient microservices using Java, Python, React, PostgreSQL, and Docker.",
            "raw_text": """Our software engineering team in Al-Khobar develops enterprise SaaS solutions for the energy and logistics sectors.

KEY RESPONSIBILITIES:
- Engineer robust backend microservices utilizing Java, Python, and PostgreSQL.
- Build clean, intuitive web applications using React, TypeScript, and modern styling frameworks.
- Containerize application components using Docker and manage deployments across staging environments.
- Practice test-driven development, code reviews, and API documentation with Git / GitHub.

REQUIREMENTS & QUALIFICATIONS:
- Bachelor's degree in Software Engineering or Computer Science.
- Solid programming proficiency in Java or Python.
- Frontend development experience with React and JavaScript/TypeScript.
- Experience with relational databases, specifically PostgreSQL and SQL.
- Familiarity with Docker, REST APIs, and Object-Oriented Design.
- Strong team player with proactive Problem Solving mindset.""",
            "skills": [
                ("Java", "required", 1.4),
                ("Python", "required", 1.3),
                ("React", "required", 1.3),
                ("PostgreSQL", "required", 1.2),
                ("REST APIs", "required", 1.2),
                ("Docker", "preferred", 1.0),
                ("Git / GitHub", "required", 1.0),
                ("Problem Solving", "required", 0.8)
            ]
        }
    ]

    seeded_jobs = []
    for jdata in JOBS_DATA:
        job = db.query(Job).filter(Job.job_title == jdata["job_title"]).first()
        if not job:
            job = Job(
                posted_by=sarah.user_id,
                job_title=jdata["job_title"],
                required_education=jdata["required_education"],
                job_summary=jdata["job_summary"],
                required_experience=jdata["required_experience"],
                employment_type="Full-Time",
                location=jdata["location"],
                raw_job_text=jdata["raw_text"].strip(),
                status="open"
            )
            db.add(job)
            db.commit()
            db.refresh(job)

        # Populate JobSkills
        db.query(JobSkill).filter(JobSkill.job_id == job.job_id).delete()
        for s_name, req_type, w in jdata["skills"]:
            s_obj = db.query(Skill).filter(Skill.skill_name.ilike(s_name)).first()
            if s_obj:
                js = JobSkill(
                    job_id=job.job_id,
                    skill_id=s_obj.skill_id,
                    requirement_type=req_type,
                    weight=w
                )
                db.add(js)
        db.commit()
        seeded_jobs.append(job)

    # ------------------------------------------------------------------------
    # 5. Pre-Compute AI Matching Results & XAI Explanations
    # ------------------------------------------------------------------------
    print("Pre-calculating AI compatibility scores and XAI explanations for all jobs...")
    matcher = SmartCVMatcher()
    explainer = XAIExplainer()

    for job in seeded_jobs:
        # Fetch job skills
        job_skills_data = [
            {
                "skill_id": js.skill_id,
                "skill_name": js.skill.skill_name,
                "skill_type": js.skill.skill_type,
                "requirement_type": js.requirement_type,
                "weight": js.weight
            }
            for js in job.job_skills
        ]

        # Match each candidate resume
        for prof, resume in seeded_resumes:
            cand_skills_data = [
                {
                    "skill_id": cs.skill_id,
                    "skill_name": cs.skill.skill_name,
                    "skill_type": cs.skill.skill_type,
                    "evidence_text": cs.evidence_text
                }
                for cs in resume.candidate_skills
            ]

            cand_names = {s["skill_name"].lower() for s in cand_skills_data}
            matched_count = sum(1 for js in job_skills_data if js["skill_name"].lower() in cand_names)
            total_skills_count = max(1, len(job_skills_data))

            match_out = matcher.match_resume_to_job(
                resume_text=resume.raw_text,
                job_text=job.raw_job_text,
                matched_skills_count=matched_count,
                total_job_skills_count=total_skills_count
            )

            matched_s, missing_s, expl_sum, app_fb = explainer.explain_match(
                job_title=job.job_title,
                job_skills=job_skills_data,
                candidate_skills=cand_skills_data,
                match_metrics=match_out
            )

            # Check if match result already exists
            mr = db.query(MatchResult).filter(
                MatchResult.job_id == job.job_id,
                MatchResult.candidate_id == prof.candidate_id
            ).first()

            if not mr:
                mr = MatchResult(
                    job_id=job.job_id,
                    candidate_id=prof.candidate_id,
                    resume_id=resume.resume_id,
                    tfidf_score=match_out["tfidf_score"],
                    bert_score=match_out["bert_score"],
                    compatibility_score=match_out["compatibility_score"],
                    recommendation_status=match_out["recommendation_status"]
                )
                db.add(mr)
                db.commit()
                db.refresh(mr)
            else:
                mr.tfidf_score = match_out["tfidf_score"]
                mr.bert_score = match_out["bert_score"]
                mr.compatibility_score = match_out["compatibility_score"]
                mr.recommendation_status = match_out["recommendation_status"]
                db.commit()

            # Clean and repopulate matched and missing skills
            db.query(MatchedSkill).filter(MatchedSkill.result_id == mr.result_id).delete()
            for ms in matched_s:
                if ms.get("skill_id"):
                    db.add(MatchedSkill(
                        result_id=mr.result_id,
                        skill_id=ms["skill_id"],
                        evidence_text=ms.get("evidence_text"),
                        contribution_score=ms.get("contribution_score", 0.0)
                    ))

            db.query(MissingSkill).filter(MissingSkill.result_id == mr.result_id).delete()
            for ms in missing_s:
                if ms.get("skill_id"):
                    db.add(MissingSkill(
                        result_id=mr.result_id,
                        skill_id=ms["skill_id"],
                        requirement_type=ms.get("requirement_type", "preferred"),
                        improvement_note=ms.get("improvement_note")
                    ))

            # Explanation summary
            db.query(ExplanationSummary).filter(ExplanationSummary.result_id == mr.result_id).delete()
            db.add(ExplanationSummary(
                result_id=mr.result_id,
                explanation_text=expl_sum["explanation_text"],
                score_reason=expl_sum["score_reason"],
                matched_skill_summary=expl_sum["matched_skill_summary"],
                missing_skill_summary=expl_sum["missing_skill_summary"]
            ))

            # Applicant feedback
            db.query(ApplicantFeedback).filter(ApplicantFeedback.result_id == mr.result_id).delete()
            db.add(ApplicantFeedback(
                result_id=mr.result_id,
                candidate_id=prof.candidate_id,
                feedback_text=app_fb["feedback_text"],
                improvement_items=app_fb.get("improvement_items", []),
                missing_skill_recommendations=app_fb.get("missing_skill_recommendations", [])
            ))
            db.commit()

        # Re-rank candidates for this job
        job_results = db.query(MatchResult).filter(
            MatchResult.job_id == job.job_id
        ).order_by(MatchResult.compatibility_score.desc()).all()

        for rank_idx, r in enumerate(job_results, 1):
            r.rank_position = rank_idx
        db.commit()

    # ------------------------------------------------------------------------
    # 6. Audit Log
    # ------------------------------------------------------------------------
    db.add(AuditLog(
        user_id=laila.user_id,
        action_type="DATABASE_SEEDED_MULTI_TRACK",
        entity_name="Database",
        entity_id=1,
        description=f"SmartCV initialized and seeded with 15 authentic candidate profiles across KKU degree specializations and 6 enterprise tech jobs."
    ))
    db.commit()
    db.close()
    print("Database seeding completed successfully!")
    print(f"Total: 15 Candidates, 6 Jobs, {len(CANDIDATES_METADATA) * len(JOBS_DATA)} Pre-Computed AI Match Results.")

if __name__ == "__main__":
    force = "--force" in sys.argv or "--reset" in sys.argv
    seed_database(force_reseed=force)

