"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api, Job } from "@/lib/api";
import { useLanguage, format, getLocalizedError } from "@/lib/i18n";
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Sparkles, 
  MapPin, 
  Layers, 
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-context";

export default function JobsPage() {
  const { confirm } = useConfirm();
  const { t, format } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [creationMode, setCreationMode] = useState<"fields" | "file">("fields");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileParsing, setFileParsing] = useState(false);
  const [fileParseSuccess, setFileParseSuccess] = useState<string | null>(null);
  const [fileParseError, setFileParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Replace File Modal State
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replacingJob, setReplacingJob] = useState<Job | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceParsing, setReplaceParsing] = useState(false);
  const [replacePreview, setReplacePreview] = useState<{ suggested_title: string; detected_skills: string[] } | null>(null);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceSuccess, setReplaceSuccess] = useState<string | null>(null);
  const [isReplaceDragOver, setIsReplaceDragOver] = useState(false);

  const [title, setTitle] = useState("");
  const [education, setEducation] = useState("Bachelor's Degree in Computer Science / Information Systems");
  const [experience, setExperience] = useState("Entry Level / 0-2 Years");
  const [location, setLocation] = useState("Abha, Saudi Arabia");
  const [employmentType, setEmploymentType] = useState("Full-Time");
  const [rawText, setRawText] = useState("");
  const [skillsInput, setSkillsInput] = useState("Python, Machine Learning, SQL, FastAPI, PostgreSQL");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const data = await api.getJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const skillList = skillsInput
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map((s, idx) => ({
          skill_name: s,
          skill_type: "technical",
          requirement_type: idx < 3 ? "required" : "preferred",
          weight: 1.0
        }));

      await api.createJob({
        job_title: title,
        required_education: education,
        job_summary: rawText.slice(0, 180) + "...",
        required_experience: experience,
        employment_type: employmentType,
        location: location,
        raw_job_text: rawText,
        skills: skillList
      });

      setIsModalOpen(false);
      setTitle("");
      setRawText("");
      setSelectedFile(null);
      setFileParseSuccess(null);
      await loadJobs();
    } catch (err: any) {
      alert(err.message || "Failed to create job posting");
    } finally {
      setSubmitting(false);
    }
  };

  const validateJobDocumentFile = (file: File): string | null => {
    if (file.size === 0) {
      return t.errors.fileEmpty;
    }
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return t.errors.fileTooLarge;
    }
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return t.errors.fileUnsupportedType;
    }
    return null;
  };

  const handleFileSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const validationError = validateJobDocumentFile(file);
    if (validationError) {
      setFileParseError(validationError);
      setFileParseSuccess(null);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFileParsing(true);
    setFileParseSuccess(null);
    setFileParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const parsed = await api.parseJobFile(formData);

      setTitle(parsed.suggested_title || file.name.replace(/\.[^/.]+$/, ""));
      if (parsed.detected_skills && parsed.detected_skills.length > 0) {
        setSkillsInput(parsed.detected_skills.join(", "));
      }
      if (parsed.extracted_text) {
        setRawText(parsed.extracted_text);
      }
      setFileParseSuccess(
        t.common.activeLanguage === "العربية"
          ? `تم استخراج محتوى الملف بنجاح! تم رصد ${parsed.detected_skills?.length || 0} مهارة.`
          : `Document parsed successfully! Detected ${parsed.detected_skills?.length || 0} target skills.`
      );
    } catch (err: any) {
      setFileParseError(getLocalizedError(err, t));
      setSelectedFile(null);
    } finally {
      setFileParsing(false);
    }
  };

  const handleCreateFromFileDirectly = async () => {
    if (!selectedFile) return;
    setSubmitting(true);
    setFileParseError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (location) formData.append("location", location);
      if (employmentType) formData.append("employment_type", employmentType);
      if (education) formData.append("required_education", education);

      await api.createJobFromFile(formData);
      setIsModalOpen(false);
      setSelectedFile(null);
      setFileParseSuccess(null);
      setFileParseError(null);
      await loadJobs();
    } catch (err: any) {
      setFileParseError(getLocalizedError(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (jobId: number) => {
    const target = jobs.find((j) => j.job_id === jobId);
    const ok = await confirm({
      title: t.jobs.deleteConfirmTitle,
      message: format(t.jobs.deleteConfirmMsg, { title: target?.job_title || "" }),
      confirmText: t.common.delete,
      cancelText: t.common.cancel,
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.deleteJob(jobId);
      await loadJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplaceFileSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    const validationError = validateJobDocumentFile(file);
    if (validationError) {
      setReplaceError(validationError);
      setReplaceSuccess(null);
      setReplaceFile(null);
      setReplacePreview(null);
      return;
    }

    setReplaceFile(file);
    setReplaceError(null);
    setReplaceSuccess(null);
    setReplaceParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const parsed = await api.parseJobFile(formData);
      setReplacePreview({
        suggested_title: parsed.suggested_title,
        detected_skills: parsed.detected_skills
      });
    } catch (err: any) {
      setReplaceError(getLocalizedError(err, t));
      setReplacePreview(null);
    } finally {
      setReplaceParsing(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!replacingJob || !replaceFile) return;
    setReplaceSubmitting(true);
    setReplaceError(null);
    try {
      const formData = new FormData();
      formData.append("file", replaceFile);
      await api.replaceJobFile(replacingJob.job_id, formData);
      setReplaceSuccess(
        t.common.activeLanguage === "العربية"
          ? "تم تحديث واستبدال ملف الوظيفة وإعادة استخراج المهارات بنجاح!"
          : "Job description file replaced and skills re-extracted successfully!"
      );
      setTimeout(() => {
        setIsReplaceModalOpen(false);
        setReplacingJob(null);
        setReplaceFile(null);
        setReplacePreview(null);
        setReplaceSuccess(null);
        loadJobs();
      }, 1000);
    } catch (err: any) {
      setReplaceError(getLocalizedError(err, t));
    } finally {
      setReplaceSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t.jobs.pageTitle}</h1>
          <p className="text-xs text-slate-500">
            {t.jobs.pageSubtitle}
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setFileParseSuccess(null);
            setFileParseError(null);
            setSelectedFile(null);
          }}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> {t.jobs.createNewJob}
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job.job_id} className="p-6 rounded-2xl glass-card border border-slate-200 shadow-xs flex flex-col justify-between hover:border-brand-300 transition-all space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{job.job_title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || "Abha, KSA"}</span>
                    <span>&bull;</span>
                    <span className="font-semibold text-slate-600">{job.employment_type || "Full-Time"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                    {format(t.matching.totalApplicantsCount, { count: job.applications_count || 0 })}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {job.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {job.job_summary || job.raw_job_text}
              </p>

              {/* Skills Tags */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  {t.jobs.skillsSection} ({job.skills.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map((s) => (
                    <span
                      key={s.job_skill_id}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${
                        s.requirement_type === "required"
                          ? "bg-slate-100 text-slate-800 border-slate-200"
                          : "bg-brand-50 text-brand-700 border-brand-200"
                      }`}
                    >
                      <bdi>{s.skill_name}</bdi> <span className="opacity-60 text-[9px]">({s.requirement_type})</span>
                    </span>
                  ))}
                </div>
              </div>
              {/* Attached file badge if created/replaced via file */}
              {job.file_name && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 text-[11px] font-medium">
                  <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span className="truncate">
                    {t.common.activeLanguage === "العربية" ? "الملف المرفق:" : "Attached File:"} <bdi>{job.file_name}</bdi>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(job.job_id)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t.common.delete}
                </button>
                <button
                  onClick={() => {
                    setReplacingJob(job);
                    setReplaceFile(null);
                    setReplacePreview(null);
                    setReplaceError(null);
                    setReplaceSuccess(null);
                    setIsReplaceModalOpen(true);
                  }}
                  className="text-xs text-slate-600 hover:text-brand-600 font-semibold flex items-center gap-1 p-1 transition-colors cursor-pointer"
                  title="Upload updated job description file"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-brand-600" />
                  <span>{t.common.activeLanguage === "العربية" ? "استبدال الملف" : "Replace File"}</span>
                </button>
              </div>

              <Link
                href={`/recruiter/matching/${job.job_id}`}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>{t.recruiter.runMatchingBtn}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Job Modal with Dual Mode */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-extrabold text-slate-900">{t.jobs.createNewJob}</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={t.common.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-4">
              <button
                type="button"
                onClick={() => setCreationMode("fields")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  creationMode === "fields"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {t.common.activeLanguage === "العربية" ? "1. إدخال يدوي للحقول" : "1. Input Fields (Manual Entry)"}
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("file")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  creationMode === "file"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {t.common.activeLanguage === "العربية" ? "2. رفع ملف الوظيفة (PDF/DOCX/TXT)" : "2. Upload Job File (PDF / DOCX / TXT)"}
              </button>
            </div>

            {/* Tab 2: Upload File Mode */}
            {creationMode === "file" ? (
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  className={`p-8 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-3 ${
                    isDragOver
                      ? "border-brand-500 bg-brand-50/60 scale-[1.01]"
                      : "border-slate-300 hover:border-brand-400 bg-slate-50/50"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center shadow-xs">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">
                      {t.common.activeLanguage === "العربية" ? "رفع مستند الوصف الوظيفي" : "Upload Job Description Document"}
                    </h4>
                    <p className="text-slate-500 text-[11px]">
                      {t.common.activeLanguage === "العربية"
                        ? "اختر أو اسحب ملف PDF أو Word أو نصي. سيقوم محرك NLP باستخراج المهارات تلقائياً."
                        : "Select or drop a PDF, Word (DOCX), or Text file. Our NLP engine will extract text and target skills automatically."}
                    </p>
                  </div>
                  <label className="cursor-pointer px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold inline-flex items-center gap-2 shadow-xs transition-all">
                    <UploadCloud className="w-4 h-4" />
                    <span>{t.resumes.browseFilesBtn}</span>
                    <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={(e) => handleFileSelect(e.target.files)} className="hidden" />
                  </label>
                </div>

                {fileParsing && (
                  <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center gap-2 font-bold animate-pulse">
                    <Sparkles className="w-4 h-4" />
                    {t.resumes.parsingProgress}
                  </div>
                )}

                {fileParseError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{fileParseError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFileParseError(null)}
                      className="text-rose-500 hover:text-rose-800 text-base font-bold"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {fileParseSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{fileParseSuccess}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 space-y-1 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <p><span className="font-bold">{t.jobs.titleLabel}:</span> {title || "Untitled Job"}</p>
                      <p><span className="font-bold">{t.jobs.requiredSkillsLabel}:</span> {skillsInput || "None"}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCreationMode("fields")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] cursor-pointer"
                      >
                        {t.common.activeLanguage === "العربية" ? "مراجعة وتعديل في النموذج &larr;" : "Review & Edit in Fields Form &rarr;"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateFromFileDirectly}
                        disabled={submitting}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? t.common.loading : (t.common.activeLanguage === "العربية" ? "نشر الوظيفة مباشرة" : "Publish Job Directly")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 1: Manual Input Fields Form */
              <form onSubmit={handleCreateJob} className="p-6 overflow-y-auto space-y-4 text-xs">
                {fileParseSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-2 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {t.common.activeLanguage === "العربية" 
                      ? "تم ملء الحقول تلقائياً من الملف المرفوع. يمكنك ضبط القيم قبل الحفظ."
                      : "Fields auto-populated from uploaded file. You can adjust values before saving."}
                  </div>
                )}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.jobs.titleLabel}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.jobs.titlePlaceholder}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t.common.activeLanguage === "العربية" ? "الموقع" : "Location"}
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {t.common.activeLanguage === "العربية" ? "نوع التوظيف" : "Employment Type"}
                    </label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                    >
                      <option value="Full-Time">{t.common.activeLanguage === "العربية" ? "دوام كامل" : "Full-Time"}</option>
                      <option value="Part-Time">{t.common.activeLanguage === "العربية" ? "دوام جزئي" : "Part-Time"}</option>
                      <option value="Internship">{t.common.activeLanguage === "العربية" ? "تدريب تعاوني" : "Internship"}</option>
                      <option value="Contract">{t.common.activeLanguage === "العربية" ? "عقد مؤقت" : "Contract"}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.jobs.requiredSkillsLabel}</label>
                  <input
                    type="text"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="Python, Machine Learning, SQL, FastAPI"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t.common.activeLanguage === "العربية"
                      ? "المهارات الأولى ستُعتبر مهارات إلزامية، وما بعدها مهارات مفضلة."
                      : "First skills will be flagged as required; subsequent as preferred."}
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t.jobs.descLabel}</label>
                  <textarea
                    rows={5}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={t.jobs.descPlaceholder}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white font-mono text-[11px]"
                  ></textarea>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? t.jobs.savingJob : t.jobs.saveJob}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Replace Job File Modal */}
      {isReplaceModalOpen && replacingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {t.common.activeLanguage === "العربية" ? "استبدال ملف الوصف الوظيفي" : "Replace Job Description File"}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-sm">
                    {t.feedback.jobHeader} {replacingJob.job_title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  setReplacingJob(null);
                  setReplaceFile(null);
                  setReplacePreview(null);
                  setReplaceError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label={t.common.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsReplaceDragOver(true); }}
                onDragLeave={() => setIsReplaceDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsReplaceDragOver(false);
                  handleReplaceFileSelect(e.dataTransfer.files);
                }}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-2.5 ${
                  isReplaceDragOver
                    ? "border-brand-500 bg-brand-50/60 scale-[1.01]"
                    : "border-slate-300 hover:border-brand-400 bg-slate-50/50"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {t.common.activeLanguage === "العربية" ? "اختر المستند البديل" : "Select Replacement Document"}
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    {t.common.activeLanguage === "العربية" ? "الصيغ المدعومة: PDF أو DOCX أو TXT. بحد أقصى 5 ميجابايت." : "Supported formats: PDF, DOCX, or TXT. Maximum 5 MiB."}
                  </p>
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold inline-flex items-center gap-2 shadow-xs transition-all text-xs">
                  <UploadCloud className="w-4 h-4" />
                  <span>{t.resumes.browseFilesBtn}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => handleReplaceFileSelect(e.target.files)}
                    className="hidden"
                  />
                </label>
                {replaceFile && (
                  <p className="text-[11px] font-semibold text-brand-700 pt-1">
                    <bdi>{replaceFile.name} ({(replaceFile.size / 1024).toFixed(0)} KB)</bdi>
                  </p>
                )}
              </div>

              {replaceParsing && (
                <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center gap-2 font-bold animate-pulse text-xs">
                  <Sparkles className="w-4 h-4 text-brand-600 animate-spin" />
                  {t.resumes.parsingProgress}
                </div>
              )}

              {replaceError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{replaceError}</span>
                </div>
              )}

              {replaceSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{replaceSuccess}</span>
                </div>
              )}

              {replacePreview && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                    {t.common.activeLanguage === "العربية" ? "معاينة استخراج الملف الجديد" : "New Document Extraction Preview"}
                  </h5>
                  <div className="text-[11px] space-y-1">
                    <p><span className="font-semibold text-slate-600">{t.jobs.titleLabel}:</span> {replacePreview.suggested_title}</p>
                    <p><span className="font-semibold text-slate-600">{t.jobs.skillsSection}:</span> {replacePreview.detected_skills.join(", ") || "None detected"}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  setReplacingJob(null);
                  setReplaceFile(null);
                  setReplacePreview(null);
                  setReplaceError(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={!replaceFile || replaceSubmitting || replaceParsing}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/20 cursor-pointer"
              >
                {replaceSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t.common.loading}
                  </>
                ) : (
                  t.common.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
