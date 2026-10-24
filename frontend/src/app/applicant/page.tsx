"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { api, Resume, MatchResultDetail, Job, JobApplication } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useLanguage, format, getLocalizedError } from "@/lib/i18n";
import { useConfirm } from "@/lib/confirm-context";
import {
  UserCheck,
  FileText,
  Sparkles,
  ArrowRight,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  UploadCloud,
  ChevronRight,
  Download,
  RefreshCw,
  ShieldCheck,
  Briefcase,
  MapPin,
  Clock,
  Send,
  Layers,
  Star,
  XCircle,
  Search,
  Filter
} from "lucide-react";
import { Pagination } from "@/components/Pagination";

export default function ApplicantPortalPage() {
  const { user, refreshUser } = useAuth();
  const { confirm } = useConfirm();
  const { t } = useLanguage();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [myResults, setMyResults] = useState<MatchResultDetail[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [activeTab, setActiveTab] = useState<"applications" | "jobs">("applications");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 1 (Applications) Filtering & Pagination
  const [searchApps, setSearchApps] = useState("");
  const [statusFilterApps, setStatusFilterApps] = useState("all");
  const [currentPageApps, setCurrentPageApps] = useState(1);
  const pageSizeApps = 6;

  // Tab 2 (Explore Jobs) Filtering & Pagination
  const [searchJobs, setSearchJobs] = useState("");
  const [workModeFilterJobs, setWorkModeFilterJobs] = useState("all");
  const [appliedFilterJobs, setAppliedFilterJobs] = useState("all");
  const [currentPageJobs, setCurrentPageJobs] = useState(1);
  const pageSizeJobs = 6;

  const renderStatusBadge = (status: string, hasScore: boolean) => {
    if (status === "shortlisted") {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 inline-flex items-center gap-1">
          <Star className="w-2.5 h-2.5 fill-purple-600 text-purple-600" />
          {t.applicant.statusShortlisted}
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 inline-flex items-center gap-1">
          <XCircle className="w-2.5 h-2.5 text-rose-600" />
          {t.applicant.statusRejected}
        </span>
      );
    }
    if (status === "reviewed") {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 inline-flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5 text-sky-600" />
          {t.applicant.statusReviewed}
        </span>
      );
    }
    if (status === "screened" || hasScore) {
      return (
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
          {t.applicant.statusScreened}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 inline-flex items-center gap-1">
        <Clock className="w-2.5 h-2.5 text-amber-600" />
        {t.applicant.statusApplied}
      </span>
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [resumesData, resultsData, jobsData, appsData] = await Promise.all([
        api.getResumes().catch(() => []),
        api.getMyCandidateResults().catch(() => []),
        api.getJobs().catch(() => []),
        api.getMyApplications().catch(() => [])
      ]);
      setResumes(resumesData);
      setMyResults(resultsData);
      setJobs(jobsData);
      setApplications(appsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // 1. Client-Side Validation: Empty file (0 bytes)
    if (file.size === 0) {
      setUploadStatus({
        type: "error",
        message: t.errors.fileEmpty
      });
      if (e.target) e.target.value = "";
      return;
    }

    // 2. Client-Side Validation: Maximum file size (5 MiB = 5,242,880 bytes)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadStatus({
        type: "error",
        message: t.errors.fileTooLarge
      });
      if (e.target) e.target.value = "";
      return;
    }

    // 3. Client-Side Validation: Whitelisted file extensions
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setUploadStatus({
        type: "error",
        message: t.errors.fileUnsupportedType
      });
      if (e.target) e.target.value = "";
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const uploaded = await api.uploadResumes(formData);
      const updatedApps = uploaded?.[0]?.updated_applications_count || 0;
      const successMsg = updatedApps > 0
        ? format(t.applicant.uploadSuccessWithApps, { filename: file.name, count: updatedApps })
        : format(t.applicant.uploadSuccess, { filename: file.name });
      setUploadStatus({
        type: "success",
        message: successMsg
      });
      await Promise.all([loadData(), refreshUser()]);
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: getLocalizedError(err, t)
      });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleReparse = async () => {
    if (!defaultResume) return;
    try {
      setReparsing(true);
      setUploadStatus(null);
      const updated = await api.reparseResume(defaultResume.resume_id);
      setUploadStatus({
        type: "success",
        message: format(t.applicant.reparseSuccess, { count: updated.skills?.length || 0 })
      });
      await Promise.all([loadData(), refreshUser()]);
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: getLocalizedError(err, t)
      });
    } finally {
      setReparsing(false);
    }
  };

  const handleApply = async (job: Job) => {
    if (!defaultResume) {
      setUploadStatus({
        type: "error",
        message: t.applicant.cvRequiredToApply
      });
      fileInputRef.current?.click();
      return;
    }

    const ok = await confirm({
      title: format(t.applicant.applyConfirmTitle, { title: job.job_title }),
      message: format(t.applicant.applyConfirmMessage, { filename: defaultResume.resume_title || "CV" }),
      confirmText: t.applicant.applyNowBtn,
      cancelText: t.common.cancel,
      variant: "info",
    });

    if (!ok) return;

    setApplyingJobId(job.job_id);
    setUploadStatus(null);
    try {
      await api.applyToJob(job.job_id);
      setUploadStatus({
        type: "success",
        message: format(t.applicant.applySuccess, { title: job.job_title })
      });
      await loadData();
      setActiveTab("applications");
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: getLocalizedError(err, t)
      });
    } finally {
      setApplyingJobId(null);
    }
  };

  const defaultResume = resumes.length > 0 ? resumes[0] : null;

  // Set of job IDs already applied to
  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  // Tab 1: Filtered and paginated applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const q = searchApps.toLowerCase().trim();
      const matchesSearch = !q || app.job_title?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilterApps === "all" || app.status?.toLowerCase() === statusFilterApps.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchApps, statusFilterApps]);

  useEffect(() => {
    setCurrentPageApps(1);
  }, [searchApps, statusFilterApps]);

  const paginatedApplications = useMemo(() => {
    const start = (currentPageApps - 1) * pageSizeApps;
    return filteredApplications.slice(start, start + pageSizeApps);
  }, [filteredApplications, currentPageApps, pageSizeApps]);

  // Tab 2: Filtered and paginated jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchJobs.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.job_title?.toLowerCase().includes(q) ||
        job.job_summary?.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q) ||
        job.skills?.some((s) => s.skill_name.toLowerCase().includes(q));

      const matchesWorkMode =
        workModeFilterJobs === "all" ||
        job.employment_type?.toLowerCase() === workModeFilterJobs.toLowerCase();

      const hasApplied = job.has_applied || appliedJobIds.has(job.job_id);
      const matchesApplied =
        appliedFilterJobs === "all" ||
        (appliedFilterJobs === "applied" && hasApplied) ||
        (appliedFilterJobs === "unapplied" && !hasApplied);

      return matchesSearch && matchesWorkMode && matchesApplied;
    });
  }, [jobs, searchJobs, workModeFilterJobs, appliedFilterJobs, appliedJobIds]);

  useEffect(() => {
    setCurrentPageJobs(1);
  }, [searchJobs, workModeFilterJobs, appliedFilterJobs]);

  const paginatedJobs = useMemo(() => {
    const start = (currentPageJobs - 1) * pageSizeJobs;
    return filteredJobs.slice(start, start + pageSizeJobs);
  }, [filteredJobs, currentPageJobs, pageSizeJobs]);

  return (
    <div className="space-y-8">

      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
            <GraduationCap className="w-3.5 h-3.5" /> {t.applicant.portalBadge}
          </div>
          <h1 className="text-2xl font-black">{format(t.applicant.welcomeGreeting, { name: user?.full_name || user?.username || "Student" })}</h1>
          <p className="text-xs text-emerald-100">
            {t.applicant.kkuStudentDept}
          </p>
        </div>

        <div>
          <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all">
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? t.applicant.uploadingAndParsing : t.applicant.uploadResumeBtn}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              disabled={uploading}
              onChange={handleUploadResume}
            />
          </label>
        </div>
      </div>

      {uploadStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${uploadStatus.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
        >
          <div className="flex items-center gap-2">
            {uploadStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
          <button
            onClick={() => setUploadStatus(null)}
            className={`text-base font-bold ${uploadStatus.type === "success"
              ? "text-emerald-500 hover:text-emerald-800"
              : "text-rose-500 hover:text-rose-800"
              }`}
          >
            &times;
          </button>
        </div>
      )}

      {/* Profile & Default Resume Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Profile Card */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              {(user?.full_name || user?.username || "ST").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900"><bdi>{user?.full_name}</bdi></h3>
              <p className="text-xs text-slate-500"><bdi dir="ltr">{user?.email}</bdi></p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.universityLabel}</span>
              <span className="font-bold text-slate-800">
                {user?.candidate_profile?.university || t.common.noData}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.majorLabel}</span>
              <span className="font-bold text-slate-800">
                {user?.candidate_profile?.major || t.common.noData}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.gpaLabel}</span>
              <span className="font-bold text-emerald-600">
                <bdi dir="ltr">{user?.candidate_profile?.gpa || t.common.noData}</bdi>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.statusLabel}</span>
              <span className="font-bold text-slate-800">
                {user?.candidate_profile?.career_level || t.common.noData}
              </span>
            </div>
          </div>
        </div>

        {/* Uploaded Resume Status */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm md:col-span-2 space-y-4 flex flex-col justify-between">
          {defaultResume ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-600" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      <bdi>{defaultResume.resume_title || "My_Resume.pdf"}</bdi>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleReparse}
                      disabled={reparsing}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-200 disabled:opacity-60 cursor-pointer"
                      title="Re-run structural verification & skill extraction"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reparsing ? "animate-spin text-purple-600" : "text-purple-500"}`} />
                      <span>{reparsing ? t.applicant.reparsingBtn : t.applicant.reparseBtn}</span>
                    </button>
                    <button
                      onClick={() => api.downloadResumeFile(defaultResume.resume_id, defaultResume.resume_title)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Download uploaded CV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.applicant.downloadCvBtn}</span>
                    </button>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      {t.applicant.atsVerified}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t.applicant.parsedAndActive}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.applicant.nlpParsedDesc}
                </p>

                {/* Extracted Skills Chips */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    {format(t.applicant.verifiedSkillsTitle, { count: defaultResume.skills?.length || 0 })}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {defaultResume.skills?.map((s) => (
                      <span
                        key={s.candidate_skill_id}
                        className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                        title={s.evidence_text ? `Evidence: "${s.evidence_text}"` : undefined}
                      >
                        {s.skill_name}
                      </span>
                    ))}
                    {(!defaultResume.skills || defaultResume.skills.length === 0) && (
                      <span className="text-xs text-slate-400 italic">
                        {t.applicant.noSkillsExtracted}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{defaultResume.created_at ? new Date(defaultResume.created_at).toLocaleDateString() : t.applicant.lastUpdated}</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t.applicant.readyForScreening}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      {t.applicant.noResumeUploaded}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {t.applicant.awaitingCvUpload}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.applicant.noResumeDesc}
                </p>

                <div className="pt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploading ? t.applicant.uploadingAndParsing : t.applicant.uploadResumePromptBtn}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>PDF, DOCX, TXT (Max 5MB)</span>
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  {t.applicant.uploadRequiredBadge}
                </span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Tabs Navigation: Applications & Transparency vs Explore Jobs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("applications")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === "applications"
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t.applicant.applicationsTab}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "applications" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
            {applications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === "jobs"
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t.applicant.browseJobsTab}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeTab === "jobs" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
            {jobs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Submitted Applications & Screened Feedback */}
      {activeTab === "applications" && (
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{t.applicant.myApplicationsTitle}</h2>
              <p className="text-xs text-slate-500">
                {t.applicant.myApplicationsSubtitle}
              </p>
            </div>
          </div>

          {applications.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchApps}
                    onChange={(e) => setSearchApps(e.target.value)}
                    placeholder={t.pagination.searchPlaceholder}
                    className="w-full ps-8 pe-4 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {searchApps && (
                    <button
                      onClick={() => setSearchApps("")}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setStatusFilterApps("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilterApps === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                  >
                    {t.pagination.all} ({applications.length})
                  </button>
                  <button
                    onClick={() => setStatusFilterApps("shortlisted")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${statusFilterApps === "shortlisted"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                      }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {t.applicant.statusShortlisted}
                  </button>
                  <button
                    onClick={() => setStatusFilterApps("screened")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilterApps === "screened"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                  >
                    {t.applicant.statusScreened}
                  </button>
                  <button
                    onClick={() => setStatusFilterApps("applied")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilterApps === "applied"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                      }`}
                  >
                    {t.applicant.statusApplied}
                  </button>
                </div>
              </div>
            </div>
          )}

          {applications.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-3">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{t.applicant.noApplicationsYet}</p>
              <button
                onClick={() => setActiveTab("jobs")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>{t.applicant.browseJobsTab}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          ) : paginatedApplications.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600">{t.pagination.noResults}</p>
              <button
                onClick={() => {
                  setSearchApps("");
                  setStatusFilterApps("all");
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                {t.pagination.resetFilters}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedApplications.map((app) => {
                  // Find matching result if screened
                  const matchRes = myResults.find((r) => r.job_id === app.job_id);
                  const score = app.compatibility_score ?? matchRes?.compatibility_score;
                  const resultId = app.result_id ?? matchRes?.result_id;

                  return (
                    <div key={app.application_id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900">{app.job_title}</h4>
                              {renderStatusBadge(app.status, score !== undefined)}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {format(t.applicant.appliedAtCol, { date: app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "" })} &bull; {format(t.applicant.applicationIdBadge, { id: app.application_id })}
                            </p>
                          </div>
                          {score !== undefined && (
                            <ScoreGauge score={score} size="sm" />
                          )}
                        </div>

                        {matchRes?.explanation ? (
                          <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                            {matchRes.explanation.explanation_text}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            {app.status === "screened"
                              ? "AI screening calculation completed. Click below to inspect your detailed evaluation."
                              : "Your application is successfully queued. The recruiter will screen applications using the SmartCV AI engine."}
                          </p>
                        )}

                        {matchRes && (
                          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                            <span className="font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {format(t.applicant.matchedCount, { count: matchRes.matched_skills.length })}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {format(t.applicant.gapsCount, { count: matchRes.missing_skills.length })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          CV: <bdi className="font-semibold text-slate-600">{app.resume_title || "Default CV"}</bdi>
                        </span>

                        {resultId ? (
                          <Link
                            href={`/applicant/feedback/${resultId}`}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-emerald-200" />
                            <span>{t.applicant.viewFeedbackBtn}</span>
                            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                          </Link>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            {app.status === "shortlisted"
                              ? t.applicant.statusShortlisted
                              : app.status === "rejected"
                                ? t.applicant.statusRejected
                                : app.status === "reviewed"
                                  ? t.applicant.statusReviewed
                                  : t.applicant.statusApplied}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPageApps}
                totalItems={filteredApplications.length}
                pageSize={pageSizeApps}
                onPageChange={setCurrentPageApps}
                itemName={t.pagination.itemsApplications}
              />
            </>
          )}
        </div>
      )}

      {/* Tab 2: Explore Available Jobs & Apply */}
      {activeTab === "jobs" && (
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{t.applicant.exploreJobsTitle}</h2>
              <p className="text-xs text-slate-500">
                {t.applicant.exploreJobsSubtitle}
              </p>
            </div>
          </div>

          {/* Jobs Filter Toolbar */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchJobs}
                  onChange={(e) => setSearchJobs(e.target.value)}
                  placeholder={t.pagination.searchPlaceholder}
                  className="w-full ps-8 pe-4 py-1.5 bg-white rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {searchJobs && (
                  <button
                    onClick={() => setSearchJobs("")}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <select
                  value={workModeFilterJobs}
                  onChange={(e) => setWorkModeFilterJobs(e.target.value)}
                  className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">{t.pagination.filterByWorkMode}</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>

                <select
                  value={appliedFilterJobs}
                  onChange={(e) => setAppliedFilterJobs(e.target.value)}
                  className="px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">{t.pagination.filterByApplication}</option>
                  <option value="unapplied">{t.pagination.notAppliedYet}</option>
                  <option value="applied">{t.pagination.alreadyApplied}</option>
                </select>

                {(searchJobs || workModeFilterJobs !== "all" || appliedFilterJobs !== "all") && (
                  <button
                    onClick={() => {
                      setSearchJobs("");
                      setWorkModeFilterJobs("all");
                      setAppliedFilterJobs("all");
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  >
                    {t.pagination.resetFilters}
                  </button>
                )}
              </div>
            </div>
          </div>

          {!defaultResume && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t.applicant.uploadRequiredBanner}</span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploading ? t.applicant.uploadingAndParsing : t.applicant.uploadResumeBtn}</span>
              </button>
            </div>
          )}

          {paginatedJobs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600">{t.pagination.noResults}</p>
              <button
                onClick={() => {
                  setSearchJobs("");
                  setWorkModeFilterJobs("all");
                  setAppliedFilterJobs("all");
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                {t.pagination.resetFilters}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedJobs.map((job) => {
                  const hasApplied = job.has_applied || appliedJobIds.has(job.job_id);
                  const isApplying = applyingJobId === job.job_id;

                  return (
                    <div key={job.job_id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-extrabold text-slate-900 leading-snug">{job.job_title}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || "Abha, KSA"}</span>
                              <span>&bull;</span>
                              <span className="font-semibold text-slate-600">{job.employment_type || "Full-Time"}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {job.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {job.job_summary || job.raw_job_text}
                        </p>

                        {/* Target Skills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job.skills?.slice(0, 6).map((s) => (
                            <span
                              key={s.job_skill_id}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${s.requirement_type === "required"
                                ? "bg-slate-100 text-slate-800 border border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                            >
                              <bdi>{s.skill_name}</bdi>
                            </span>
                          ))}
                          {(job.skills?.length || 0) > 6 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md text-slate-400 font-medium">
                              +{job.skills.length - 6}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {job.applications_count ? format(t.applicant.applicationsCountBadge, { count: job.applications_count }) : "0 applicants"}
                        </span>

                        {hasApplied ? (
                          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t.applicant.appliedBadge}</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApply(job)}
                            disabled={isApplying}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                          >
                            <Send className={`w-3.5 h-3.5 ${isApplying ? "animate-spin" : ""}`} />
                            <span>{isApplying ? "Applying..." : t.applicant.applyNowBtn}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPageJobs}
                totalItems={filteredJobs.length}
                pageSize={pageSizeJobs}
                onPageChange={setCurrentPageJobs}
                itemName={t.pagination.itemsJobs}
              />
            </>
          )}
        </div>
      )}

    </div>
  );
}
