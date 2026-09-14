const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface User {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role_type: "recruiter" | "applicant" | "admin";
  phone?: string;
  status: string;
  created_at: string;
}

export interface RegisterData {
  username: string;
  full_name: string;
  email: string;
  password: string;
  role_type: "applicant" | "recruiter";
  phone?: string;
}

export interface JobSkill {
  job_skill_id: number;
  skill_id: number;
  skill_name: string;
  skill_type: string;
  requirement_type: string;
  weight: number;
  minimum_level?: string;
}

export interface Job {
  job_id: number;
  posted_by: number;
  file_id?: number;
  file_name?: string;
  job_title: string;
  required_education?: string;
  job_summary?: string;
  required_experience?: string;
  employment_type?: string;
  location?: string;
  raw_job_text: string;
  status: string;
  created_at: string;
  skills: JobSkill[];
}

export interface JobFileParseResponse {
  suggested_title: string;
  extracted_text: string;
  detected_skills: string[];
  file_name: string;
  file_size_kb: number;
  checksum?: string;
}

export interface CandidateSkill {
  candidate_skill_id: number;
  skill_id: number;
  skill_name: string;
  skill_type: string;
  evidence_text?: string;
  confidence_score: number;
  source: string;
}

export interface Resume {
  resume_id: number;
  candidate_id: number;
  file_id?: number;
  resume_title?: string;
  raw_text: string;
  parsed_status: string;
  is_default: boolean;
  created_at: string;
  candidate_name?: string;
  skills: CandidateSkill[];
}

export interface MatchedSkillItem {
  skill_id: number;
  skill_name: string;
  skill_type: string;
  evidence_text?: string;
  contribution_score: number;
}

export interface MissingSkillItem {
  skill_id: number;
  skill_name: string;
  skill_type: string;
  requirement_type: string;
  improvement_note?: string;
}

export interface ExplanationDetail {
  explanation_id?: number;
  explanation_text: string;
  score_reason?: string;
  matched_skill_summary?: string;
  missing_skill_summary?: string;
}

export interface MissingSkillRec {
  skill_name: string;
  requirement_type: string;
  recommended_course: string;
  suggested_project: string;
  certification: string;
}

export interface ImprovementItem {
  category: string;
  priority: string;
  recommendation: string;
}

export interface ApplicantFeedbackDetail {
  feedback_id?: number;
  feedback_text: string;
  improvement_items?: ImprovementItem[];
  missing_skill_recommendations?: MissingSkillRec[];
  generated_at?: string;
}

export interface MatchResultDetail {
  result_id: number;
  job_id: number;
  job_title: string;
  candidate_id: number;
  candidate_name: string;
  resume_id: number;
  rank_position?: number;
  tfidf_score: number;
  bert_score: number;
  compatibility_score: number;
  recommendation_status: "Strong Match" | "Good Match" | "Low Match";
  matched_skills: MatchedSkillItem[];
  missing_skills: MissingSkillItem[];
  explanation?: ExplanationDetail;
  feedback?: ApplicantFeedbackDetail;
  created_at: string;
}

export interface JobRankingSummary {
  job_id: number;
  job_title: string;
  total_candidates: number;
  top_compatibility_score: number;
  weights_used?: {
    sbert: number;
    tfidf: number;
    skills: number;
  };
  results: MatchResultDetail[];
}

export interface Skill {
  skill_id: number;
  skill_name: string;
  skill_type: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  log_id: number;
  user_id?: number;
  user_name?: string;
  action_type: string;
  entity_name?: string;
  entity_id?: number;
  description?: string;
  created_at: string;
}

export interface ModelMetric {
  model_name: string;
  mean_score_relevant: number;
  mean_score_negative: number;
  discrimination_margin: number;
  latency_ms: number;
  description: string;
  score_distribution?: {
    min: number;
    max: number;
    std_dev: number;
  };
}

export interface TrackBreakdownItem {
  track_name: string;
  sample_count: number;
  tfidf_mean: number;
  sbert_mean: number;
  hybrid_mean: number;
}

export interface QualitativeCaseStudy {
  id: string;
  track: string;
  job_title: string;
  resume_snippet: string;
  job_snippet: string;
  tfidf_score: number;
  sbert_score: number;
  hybrid_score: number;
  explanation: string;
}

export interface ModelEvaluationReport {
  dataset_name: string;
  total_samples: number;
  relevant_samples: number;
  negative_control_samples: number;
  metrics: ModelMetric[];
  track_breakdown: TrackBreakdownItem[];
  case_studies: QualitativeCaseStudy[];
  latex_table?: string;
  thesis_chapter_text?: string;
  generated_at: string;
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  // Auth
  async login(usernameOrEmail: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login-json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameOrEmail, password })
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    return res.json();
  },

  async register(data: RegisterData): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  // Jobs
  async getJobs(): Promise<Job[]> {
    const res = await fetch(`${API_BASE}/jobs/`);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  async getJob(id: number): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    if (!res.ok) throw new Error("Failed to fetch job");
    return res.json();
  },

  async createJob(jobData: any): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData)
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to create job");
    return res.json();
  },

  async createJobFromFile(formData: FormData): Promise<Job> {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
    const res = await fetch(`${API_BASE}/jobs/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to create job from file");
    return res.json();
  },

  async parseJobFile(formData: FormData): Promise<JobFileParseResponse> {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
    const res = await fetch(`${API_BASE}/jobs/parse-file`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to parse job file");
    return res.json();
  },

  async replaceJobFile(jobId: number, formData: FormData): Promise<Job> {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
    const res = await fetch(`${API_BASE}/jobs/${jobId}/upload`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to replace job description file");
    return res.json();
  },

  async deleteJob(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete job");
  },

  // Resumes
  async getResumes(): Promise<Resume[]> {
    const res = await fetch(`${API_BASE}/resumes/`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch resumes");
    return res.json();
  },

  async uploadResumes(formData: FormData): Promise<Resume[]> {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
    const res = await fetch(`${API_BASE}/resumes/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to upload resume(s)");
    return res.json();
  },

  async downloadResumeFile(resumeId: number, filename?: string): Promise<void> {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
    const res = await fetch(`${API_BASE}/resumes/${resumeId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      let errDetail = "Failed to download resume file";
      try {
        const errJson = await res.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch (_) {}
      throw new Error(errDetail);
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename || `resume_${resumeId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async reparseResume(resumeId: number): Promise<Resume> {
    const res = await fetch(`${API_BASE}/resumes/${resumeId}/reparse`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to re-parse resume");
    }
    return res.json();
  },

  async reparseAllResumes(): Promise<{ message: string; updated_count: number }> {
    const res = await fetch(`${API_BASE}/resumes/reparse-all`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to batch re-parse resumes");
    }
    return res.json();
  },

  // Matching & XAI
  async runMatching(
    jobId: number, 
    resumeIds?: number[],
    weights?: { weight_sbert?: number; weight_tfidf?: number; weight_skills?: number }
  ): Promise<JobRankingSummary> {
    const res = await fetch(`${API_BASE}/matching/run`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        job_id: jobId, 
        resume_ids: resumeIds,
        weight_sbert: weights?.weight_sbert,
        weight_tfidf: weights?.weight_tfidf,
        weight_skills: weights?.weight_skills
      })
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to run matching");
    return res.json();
  },

  async getJobRanking(jobId: number): Promise<JobRankingSummary> {
    const res = await fetch(`${API_BASE}/matching/job/${jobId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch job ranking");
    return res.json();
  },

  async getMatchResult(resultId: number): Promise<MatchResultDetail> {
    const res = await fetch(`${API_BASE}/matching/result/${resultId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch match result");
    return res.json();
  },

  async getMyCandidateResults(): Promise<MatchResultDetail[]> {
    const res = await fetch(`${API_BASE}/matching/candidate/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch candidate results");
    return res.json();
  },

  // Admin & Audit
  async getAuditLogs(actionFilter?: string): Promise<AuditLog[]> {
    const url = actionFilter
      ? `${API_BASE}/admin/audit-logs?action_filter=${actionFilter}`
      : `${API_BASE}/admin/audit-logs`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  async getSkills(): Promise<Skill[]> {
    const res = await fetch(`${API_BASE}/admin/skills`);
    if (!res.ok) throw new Error("Failed to fetch skills");
    return res.json();
  },

  async createSkill(skillData: any): Promise<Skill> {
    const res = await fetch(`${API_BASE}/admin/skills`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(skillData)
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to add skill");
    return res.json();
  },

  async updateSkill(id: number, skillData: any): Promise<Skill> {
    const res = await fetch(`${API_BASE}/admin/skills/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(skillData)
    });
    if (!res.ok) throw new Error("Failed to update skill");
    return res.json();
  },

  async deleteSkill(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/skills/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to delete skill");
  },

  async getStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  // Evaluation
  async getEvaluationReport(track?: string): Promise<ModelEvaluationReport> {
    const url = new URL(`${API_BASE}/evaluation/report`);
    if (track) url.searchParams.append("track", track);
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch model evaluation report");
    return res.json();
  },

  async getEvaluationLatex(track?: string): Promise<{ table_id: string; latex_code: string; total_samples: number }> {
    const url = new URL(`${API_BASE}/evaluation/latex`);
    if (track) url.searchParams.append("track", track);
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch LaTeX table");
    return res.json();
  },

  async getThesisChapter(track?: string): Promise<{ chapter_title: string; text: string; total_samples: number }> {
    const url = new URL(`${API_BASE}/evaluation/thesis-chapter`);
    if (track) url.searchParams.append("track", track);
    const res = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch thesis chapter text");
    return res.json();
  },

  async downloadBenchmarkCsv(track?: string): Promise<void> {
    const url = new URL(`${API_BASE}/evaluation/csv`);
    if (track) url.searchParams.append("track", track);
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcv_token") : null;
    const res = await fetch(url.toString(), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error("Failed to download benchmark CSV");
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "kku_smartcv_benchmark_36.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};
