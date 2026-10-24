"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api, Resume, Job, JobApplication } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import {
  Users,
  FileText,
  Sparkles,
  User,
  Eye,
  X,
  Search,
  Filter,
  CheckCircle2,
  Briefcase,
  Info,
  ArrowUpRight,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Pagination } from "@/components/Pagination";

export default function CandidatePoolPage() {
  const { t, format } = useLanguage();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [modalTargetJobId, setModalTargetJobId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reparsingId, setReparsingId] = useState<number | null>(null);
  const [reparsingAll, setReparsingAll] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [parsedStatusFilter, setParsedStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    loadResumes();
  }, []);

  async function handleDownload(resumeId: number, filename?: string) {
    try {
      setDownloadError(null);
      setDownloadingId(resumeId);
      await api.downloadResumeFile(resumeId, filename);
    } catch (err: any) {
      console.error("Failed to download resume:", err);
      setDownloadError(err.message || "Could not download resume file.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleReparseAll() {
    try {
      setReparsingAll(true);
      setActionMessage(null);
      const res = await api.reparseAllResumes();
      setActionMessage({
        text: t.common.activeLanguage === "العربية"
          ? `تمت إعادة استخراج المهارات بنجاح لـ ${res.updated_count} سيرة ذاتية!`
          : `Successfully re-extracted skills across ${res.updated_count} candidate resumes!`,
        type: "success",
      });
      await loadResumes();
    } catch (err: any) {
      console.error("Failed to reparse all resumes:", err);
      setActionMessage({
        text: err.message || (t.common.activeLanguage === "العربية" ? "فشلت إعادة استخراج المهارات." : "Failed to re-extract skills."),
        type: "error",
      });
    } finally {
      setReparsingAll(false);
    }
  }

  async function handleReparseSingle(resumeId: number) {
    try {
      setReparsingId(resumeId);
      setActionMessage(null);
      const updated = await api.reparseResume(resumeId);
      setActionMessage({
        text: t.common.activeLanguage === "العربية"
          ? `تم استخراج ${updated.skills?.length || 0} مهارة للمرشح "${updated.candidate_name || '#' + updated.candidate_id}"!`
          : `Re-extracted ${updated.skills?.length || 0} skills for candidate "${updated.candidate_name || '#' + updated.candidate_id}"!`,
        type: "success",
      });
      await loadResumes();
      if (selectedResume && selectedResume.resume_id === resumeId) {
        setSelectedResume(updated);
      }
    } catch (err: any) {
      console.error("Failed to reparse candidate resume:", err);
      setActionMessage({
        text: err.message || "Failed to re-extract skills for candidate.",
        type: "error",
      });
    } finally {
      setReparsingId(null);
    }
  }

  async function loadResumes() {
    try {
      setLoading(true);
      const [resumesData, jobsData] = await Promise.all([
        api.getResumes(),
        api.getJobs(),
      ]);
      setResumes(resumesData);
      setJobs(jobsData);

      // Fetch applications across all recruiter jobs
      if (jobsData.length > 0) {
        const settled = await Promise.allSettled(
          jobsData.map((j) => api.getJobApplications(j.job_id))
        );
        const allApps: JobApplication[] = [];
        settled.forEach((r) => {
          if (r.status === "fulfilled" && Array.isArray(r.value)) {
            allApps.push(...r.value);
          }
        });
        setApplications(allApps);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Group applications by candidate_id for fast lookup
  const candidateAppsMap = useMemo(() => {
    const map = new Map<number, JobApplication[]>();
    applications.forEach((app) => {
      const existing = map.get(app.candidate_id) || [];
      existing.push(app);
      map.set(app.candidate_id, existing);
    });
    return map;
  }, [applications]);

  // Set of resume_ids and candidate_ids associated with submitted JobApplications
  const applicantResumeIds = useMemo(() => {
    const rIds = new Set<number>();
    const cIds = new Set<number>();
    applications.forEach((app) => {
      if (app.resume_id) rIds.add(app.resume_id);
      if (app.candidate_id) cIds.add(app.candidate_id);
    });
    return { rIds, cIds };
  }, [applications]);

  // Only resumes belonging to job applicants (used in an application or default resume of an applicant)
  const applicantResumes = useMemo(() => {
    return resumes.filter(
      (r) =>
        applicantResumeIds.rIds.has(r.resume_id) ||
        (applicantResumeIds.cIds.has(r.candidate_id) && r.is_default)
    );
  }, [resumes, applicantResumeIds]);

  // Get top skills across job applicant resumes for quick filtering
  const allSkills = useMemo(() => {
    const skillMap = new Map<string, number>();
    applicantResumes.forEach(r => {
      r.skills?.forEach(s => {
        const name = s.skill_name;
        skillMap.set(name, (skillMap.get(name) || 0) + 1);
      });
    });
    return Array.from(skillMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }, [applicantResumes]);

  // Filtered resumes (restricted to job_applicant resumes)
  const filteredResumes = useMemo(() => {
    return applicantResumes.filter(r => {
      const matchesSearch =
        !searchQuery ||
        (r.candidate_name && r.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.resume_title && r.resume_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.skills?.some(s => s.skill_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSkill =
        !selectedSkillFilter ||
        r.skills?.some(s => s.skill_name.toLowerCase() === selectedSkillFilter.toLowerCase());

      const matchesStatus =
        parsedStatusFilter === "all" ||
        (r.parsed_status && r.parsed_status.toLowerCase() === parsedStatusFilter.toLowerCase());

      const candApps = candidateAppsMap.get(r.candidate_id) || [];

      // Filter by specific job opening
      const matchesJob =
        selectedJobFilter === "all" ||
        (selectedJobFilter === "any_job" && candApps.length > 0) ||
        candApps.some(a => String(a.job_id) === selectedJobFilter);

      // Filter by application lifecycle status (either within the selected job or across any job)
      const relevantApps =
        selectedJobFilter !== "all" && selectedJobFilter !== "any_job"
          ? candApps.filter(a => String(a.job_id) === selectedJobFilter)
          : candApps;

      const matchesAppStatus =
        appStatusFilter === "all" ||
        (appStatusFilter === "has_applied" && relevantApps.length > 0) ||
        relevantApps.some(a => a.status?.toLowerCase() === appStatusFilter.toLowerCase());

      return matchesSearch && matchesSkill && matchesStatus && matchesJob && matchesAppStatus;
    });
  }, [applicantResumes, searchQuery, selectedSkillFilter, parsedStatusFilter, selectedJobFilter, appStatusFilter, candidateAppsMap]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSkillFilter, parsedStatusFilter, selectedJobFilter, appStatusFilter]);

  const paginatedResumes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResumes.slice(start, start + pageSize);
  }, [filteredResumes, currentPage, pageSize]);

  const totalSkillsCount = useMemo(() => {
    const set = new Set<string>();
    applicantResumes.forEach(r => r.skills?.forEach(s => set.add(s.skill_name.toLowerCase())));
    return set.size;
  }, [applicantResumes]);

  return (
    <div className="space-y-8">

      {/* Page Title & System Role Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            <span>{t.resumes.pageTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.resumes.pageSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleReparseAll}
            disabled={reparsingAll}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all disabled:opacity-60 cursor-pointer"
            title="Re-run structural verification & hybrid NLP skill extraction across all candidate resumes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reparsingAll ? "animate-spin text-brand-600" : "text-slate-500"}`} />
            <span>{reparsingAll ? t.common.loading : (t.common.activeLanguage === "العربية" ? "إعادة استخراج كافة المهارات" : "Re-extract All Skills")}</span>
          </button>
          <Link
            href="/recruiter"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>{t.recruiter.runMatchingBtn}</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
          actionMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700 text-base font-bold ms-3 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Info Banner: Role Clarification based on System Use-Case */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-bold">
            {t.common.activeLanguage === "العربية" ? "نموذج التقديم الذاتي للمرشحين" : "Candidate Self-Submission Model"}
          </p>
          <p className="text-blue-700 leading-relaxed">
            {t.common.activeLanguage === "العربية"
              ? "وفق قواعد الوصول للنظام، تُرفع السير الذاتية مباشرة من قِبل المتقدمين عبر بوابتهم الخاصة. يملك مسؤولو التوظيف صلاحية استعراض الملفات، فحص مهارات NLP المستخرجة، وتشغيل خوارزميات الفرز التفسيرية."
              : "Per system access rules, resumes are uploaded directly by applicants through their student/applicant portal. Recruiters have read-only access to browse profiles, inspect parsed NLP tokens and extracted skills, and run XAI screening algorithms."}
          </p>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{applicantResumes.length}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.recruiter.totalResumesParsed}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {applicantResumes.filter(r => r.parsed_status?.toLowerCase() === "parsed").length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {t.common.activeLanguage === "العربية" ? "السير الذاتية المحللة" : "NLP Parsed Resumes"}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalSkillsCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.admin.totalSkillsInTaxonomy}</div>
          </div>
        </div>
      </div>

      {/* Candidate Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.resumes.candidateSearchPlaceholder}
              className="w-full ps-10 pe-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label={t.common.close}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Job Opening */}
            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer max-w-[230px]"
            >
              <option value="all">
                {t.common.activeLanguage === "العربية" ? "كل الوظائف (جميع المتقدمين)" : "All Jobs (All Applicants)"}
              </option>
              {jobs.map((j) => (
                <option key={j.job_id} value={String(j.job_id)}>
                  {t.common.activeLanguage === "العربية" ? `متقدمو: ${j.job_title}` : `Job: ${j.job_title}`}
                </option>
              ))}
            </select>

            {/* Filter by Application Status (Shortlisted, Screened, Applied, etc.) */}
            <select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="all">
                {t.common.activeLanguage === "العربية" ? "كل حالات التقديم" : "All Application Statuses"}
              </option>
              <option value="shortlisted">
                {t.common.activeLanguage === "العربية" ? "القائمة المختصرة (Shortlisted)" : "Shortlisted"}
              </option>
              <option value="screened">
                {t.common.activeLanguage === "العربية" ? "تم الفرز بالذكاء الاصطناعي (Screened)" : "AI Screened"}
              </option>
              <option value="reviewed">
                {t.common.activeLanguage === "العربية" ? "تمت المراجعة (Reviewed)" : "Reviewed"}
              </option>
              <option value="applied">
                {t.common.activeLanguage === "العربية" ? "بانتظار الفرز (Applied)" : "Applied (Pending Screening)"}
              </option>
              <option value="rejected">
                {t.common.activeLanguage === "العربية" ? "مرفوض (Rejected)" : "Rejected"}
              </option>
            </select>

            {/* Filter by NLP Parsing Status */}
            <select
              value={parsedStatusFilter}
              onChange={(e) => setParsedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="all">{t.pagination.filterByStatus}</option>
              <option value="parsed">{t.applicant.parsedAndActive}</option>
              <option value="pending">Pending</option>
            </select>

            {(selectedSkillFilter || selectedJobFilter !== "all" || appStatusFilter !== "all" || parsedStatusFilter !== "all") && (
              <button
                onClick={() => {
                  setSelectedSkillFilter(null);
                  setSelectedJobFilter("all");
                  setAppStatusFilter("all");
                  setParsedStatusFilter("all");
                  setSearchQuery("");
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.common.activeLanguage === "العربية" ? "مسح الفلاتر" : "Reset Filters"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Skill Filter Pills */}
        {allSkills.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 me-1">
              <Filter className="w-3 h-3" /> {t.common.filter}:
            </span>
            {allSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => setSelectedSkillFilter(selectedSkillFilter === skill ? null : skill)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedSkillFilter === skill
                    ? "bg-brand-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <bdi>{skill}</bdi>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Pool Table */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            {t.resumes.parsedCandidatesTitle} ({filteredResumes.length})
          </h2>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            {t.common.activeLanguage === "العربية" ? "معالجة آلية وتطابق مع شجرة المهارات القياسية" : "Automatic NLP tokenization & skill taxonomy matching"}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            {t.common.loading}
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">{t.common.noData}</p>
            <p className="text-[11px] text-slate-400">
              {t.common.activeLanguage === "العربية" ? "جرب مسح فلاتر البحث." : "Try clearing filters or search terms."}
            </p>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto pb-2">
              <table className="w-full min-w-[1050px] text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider text-start whitespace-nowrap">
                    <th className="py-3 px-3 text-start">{t.recruiter.candidateNameHeader}</th>
                    <th className="py-3 px-3 text-start">{t.resumes.dropzoneTitle}</th>
                    <th className="py-3 px-3 text-start">
                      {t.common.activeLanguage === "العربية" ? "طلبات التوظيف والحالة" : "Job Applications & Status"}
                    </th>
                    <th className="py-3 px-3 text-start">{t.resumes.extractedSkillsCount.replace(" ({count})", "")}</th>
                    <th className="py-3 px-3 text-start">{t.recruiter.dateHeader}</th>
                    <th className="py-3 px-3 text-end">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedResumes.map((res) => {
                    const candApps = candidateAppsMap.get(res.candidate_id) || [];
                    const displayApps =
                      selectedJobFilter !== "all" && selectedJobFilter !== "any_job" && selectedJobFilter !== "no_job"
                        ? candApps.filter((a) => String(a.job_id) === selectedJobFilter)
                        : candApps;

                    const getStatusBadgeStyle = (status: string) => {
                      switch (status.toLowerCase()) {
                        case "shortlisted":
                          return "bg-emerald-50 text-emerald-700 border-emerald-200";
                        case "screened":
                          return "bg-indigo-50 text-indigo-700 border-indigo-200";
                        case "reviewed":
                          return "bg-amber-50 text-amber-700 border-amber-200";
                        case "rejected":
                          return "bg-rose-50 text-rose-700 border-rose-200";
                        default:
                          return "bg-blue-50 text-blue-700 border-blue-200";
                      }
                    };

                    return (
                      <tr key={res.resume_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div>
                                <bdi>{res.candidate_name || `Candidate #${res.candidate_id}`}</bdi>
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">ID: #{res.candidate_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span><bdi>{res.resume_title || "resume.pdf"}</bdi></span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 min-w-[220px]">
                          {displayApps.length > 0 ? (
                            <div className="flex flex-col gap-1 max-w-[240px]">
                              {displayApps.slice(0, 2).map((app) => (
                                <Link
                                  key={app.application_id}
                                  href={`/recruiter/matching/${app.job_id}`}
                                  className="inline-flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[10px] transition-colors"
                                  title={app.job_title}
                                >
                                  <span className="font-semibold text-slate-700 truncate">
                                    <bdi>{app.job_title}</bdi>
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase border text-[9px] shrink-0 ${getStatusBadgeStyle(app.status)}`}>
                                    {app.status}
                                  </span>
                                </Link>
                              ))}
                              {displayApps.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-medium ps-1">
                                  +{displayApps.length - 2} {t.common.activeLanguage === "العربية" ? "وظائف أخرى" : "more jobs"}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic whitespace-nowrap">
                              {t.common.activeLanguage === "العربية" ? "لم يتقدم بعد" : "No applications"}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 min-w-[240px]">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {res.skills && res.skills.slice(0, 4).map((s) => (
                              <span
                                key={s.candidate_skill_id}
                                onClick={() => setSelectedSkillFilter(s.skill_name)}
                                className="cursor-pointer bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors whitespace-nowrap"
                              >
                                <bdi>{s.skill_name}</bdi>
                              </span>
                            ))}
                            {res.skills && res.skills.length > 4 && (
                              <span className="text-[10px] text-slate-400">+{res.skills.length - 4}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {res.created_at ? new Date(res.created_at).toLocaleDateString() : "Recent"}
                        </td>
                        <td className="py-3.5 px-3 text-end whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleReparseSingle(res.resume_id)}
                              disabled={reparsingId === res.resume_id}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Re-run NLP skill extraction"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${reparsingId === res.resume_id ? "animate-spin text-purple-600" : "text-slate-500"}`} />
                              <span>{reparsingId === res.resume_id ? t.common.loading : (t.common.activeLanguage === "العربية" ? "إعادة استخراج" : "Re-extract")}</span>
                            </button>
                            <button
                              onClick={() => handleDownload(res.resume_id, res.resume_title)}
                              disabled={downloadingId === res.resume_id}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Download original CV document"
                            >
                              <Download className={`w-3.5 h-3.5 shrink-0 ${downloadingId === res.resume_id ? "animate-bounce text-brand-600" : ""}`} />
                              <span>{t.common.activeLanguage === "العربية" ? "تحميل" : "Download"}</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedResume(res);
                                const firstAppJobId = candApps.length > 0 ? candApps[0].job_id : (jobs[0]?.job_id || null);
                                setModalTargetJobId(
                                  selectedJobFilter !== "all" && selectedJobFilter !== "any_job"
                                    ? Number(selectedJobFilter)
                                    : firstAppJobId
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" /> {t.common.viewDetails}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredResumes.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName={t.pagination.itemsCandidates}
            />
          </>
        )}
      </div>

      {/* Candidate Profile & Raw Text Modal */}
      {selectedResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    <bdi>{selectedResume.candidate_name || `Candidate #${selectedResume.candidate_id}`}</bdi>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t.common.activeLanguage === "العربية" ? "المستند:" : "Document:"} <bdi>{selectedResume.resume_title || "resume.pdf"}</bdi>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReparseSingle(selectedResume.resume_id)}
                  disabled={reparsingId === selectedResume.resume_id}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all border border-purple-200 disabled:opacity-60 cursor-pointer"
                  title="Re-run structural verification and open-domain skill extraction"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reparsingId === selectedResume.resume_id ? "animate-spin text-purple-600" : ""}`} />
                  <span>{reparsingId === selectedResume.resume_id ? t.common.loading : (t.common.activeLanguage === "العربية" ? "إعادة استخراج المهارات" : "Re-extract Skills")}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedResume.resume_id, selectedResume.resume_title)}
                  disabled={downloadingId === selectedResume.resume_id}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download authentic CV file"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === selectedResume.resume_id ? "animate-bounce text-brand-600" : ""}`} />
                  <span>{downloadingId === selectedResume.resume_id ? t.common.loading : (t.common.activeLanguage === "العربية" ? "تحميل السيرة الذاتية" : "Download CV")}</span>
                </button>
                <button
                  onClick={() => setSelectedResume(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label={t.common.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Extracted Skills Section with Verbatim Evidence Quotes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    {t.feedback.matchedSkillsTitle} ({selectedResume.skills?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {t.common.activeLanguage === "العربية" ? "ثقة الاستخراج محسوبة عبر NLP" : "Confidence scored via NLP"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pe-1">
                  {selectedResume.skills && selectedResume.skills.length > 0 ? (
                    selectedResume.skills.map((s) => (
                      <div
                        key={s.candidate_skill_id}
                        className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200 hover:border-brand-300 transition-all flex flex-col justify-between gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            <bdi>{s.skill_name}</bdi>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                            <bdi dir="ltr">{Math.round((s.confidence_score ?? 1.0) * 100)}%</bdi>
                          </span>
                        </div>
                        {s.evidence_text ? (
                          <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded-lg border border-slate-100 font-mono italic leading-relaxed">
                            &ldquo;<bdi>{s.evidence_text}</bdi>&rdquo;
                          </p>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {t.common.activeLanguage === "العربية" ? "مستخرجة عبر التصنيف القياسي" : "Extracted via canonical taxonomy"}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic col-span-2">{t.resumes.noSkillsFound}</span>
                  )}
                </div>
              </div>

              {/* Parsed Raw Text */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  {t.resumes.viewParsedText}
                </span>
                <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {selectedResume.raw_text || t.common.noData}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownload(selectedResume.resume_id, selectedResume.resume_title)}
                  disabled={downloadingId === selectedResume.resume_id}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === selectedResume.resume_id ? "animate-bounce text-brand-600" : "text-slate-500"}`} />
                  <span>{downloadingId === selectedResume.resume_id ? t.common.loading : (t.common.activeLanguage === "العربية" ? "تحميل الملف" : "Download File")}</span>
                </button>
                {(() => {
                  const selectedCandApps = candidateAppsMap.get(selectedResume.candidate_id) || [];
                  const targetJobId = modalTargetJobId || selectedCandApps[0]?.job_id || jobs[0]?.job_id;
                  return (
                    <>
                      {selectedCandApps.length > 1 && (
                        <select
                          value={targetJobId || ""}
                          onChange={(e) => setModalTargetJobId(Number(e.target.value))}
                          className="px-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[200px] truncate"
                        >
                          {selectedCandApps.map((app) => (
                            <option key={app.application_id} value={app.job_id}>
                              {app.job_title}
                            </option>
                          ))}
                        </select>
                      )}
                      <Link
                        href={targetJobId ? `/recruiter/matching/${targetJobId}` : "/recruiter"}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shadow-brand-500/20 cursor-pointer"
                      >
                        <span>{t.recruiter.runMatchingBtn}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </Link>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedResume(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
