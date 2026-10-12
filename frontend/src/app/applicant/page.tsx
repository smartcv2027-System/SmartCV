"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Resume, MatchResultDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ScoreGauge } from "@/components/ScoreGauge";
import { useLanguage, format, getLocalizedError } from "@/lib/i18n";
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
  ShieldCheck
} from "lucide-react";

export default function ApplicantPortalPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [myResults, setMyResults] = useState<MatchResultDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [resumesData, resultsData] = await Promise.all([
          api.getResumes(),
          api.getMyCandidateResults()
        ]);
        setResumes(resumesData);
        setMyResults(resultsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
      await api.uploadResumes(formData);
      setUploadStatus({
        type: "success",
        message: format(t.applicant.uploadSuccess, { filename: file.name })
      });
      const [resumesData, resultsData] = await Promise.all([
        api.getResumes(),
        api.getMyCandidateResults()
      ]);
      setResumes(resumesData);
      setMyResults(resultsData);
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
      const [resumesData, resultsData] = await Promise.all([
        api.getResumes(),
        api.getMyCandidateResults()
      ]);
      setResumes(resumesData);
      setMyResults(resultsData);
    } catch (err: any) {
      setUploadStatus({
        type: "error",
        message: getLocalizedError(err, t)
      });
    } finally {
      setReparsing(false);
    }
  };

  const defaultResume = resumes.length > 0 ? resumes[0] : null;

  return (
    <div className="space-y-8">

      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
            <GraduationCap className="w-3.5 h-3.5" /> {t.applicant.portalBadge}
          </div>
          <h1 className="text-2xl font-black">{format(t.applicant.welcomeGreeting, { name: user?.full_name || "Fahad Al-Qahtani" })}</h1>
          <p className="text-xs text-emerald-100">
            {t.applicant.kkuStudentDept}
          </p>
        </div>

        <div>
          <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all">
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? t.applicant.uploadingAndParsing : t.applicant.uploadResumeBtn}</span>
            <input
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
              {user?.full_name?.substring(0, 2).toUpperCase() || "FA"}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900"><bdi>{user?.full_name}</bdi></h3>
              <p className="text-xs text-slate-500"><bdi dir="ltr">{user?.email}</bdi></p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.universityLabel}</span>
              <span className="font-bold text-slate-800">{t.applicant.kkuName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.majorLabel}</span>
              <span className="font-bold text-slate-800">{t.applicant.isMajor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.gpaLabel}</span>
              <span className="font-bold text-emerald-600"><bdi dir="ltr">4.78 / 5.0</bdi></span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t.applicant.statusLabel}</span>
              <span className="font-bold text-slate-800">{t.applicant.seniorStudent}</span>
            </div>
          </div>
        </div>

        {/* Uploaded Resume Status */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm md:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  <bdi>{defaultResume?.resume_title || "Fahad_AlQahtani_CV.pdf"}</bdi>
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {defaultResume && (
                  <>
                    <button
                      onClick={handleReparse}
                      disabled={reparsing}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-purple-200 disabled:opacity-60"
                      title="Re-run structural verification & skill extraction"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reparsing ? "animate-spin text-purple-600" : "text-purple-500"}`} />
                      <span>{reparsing ? t.applicant.reparsingBtn : t.applicant.reparseBtn}</span>
                    </button>
                    <button
                      onClick={() => api.downloadResumeFile(defaultResume.resume_id, defaultResume.resume_title)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Download uploaded CV"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t.applicant.downloadCvBtn}</span>
                    </button>
                  </>
                )}
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
                {format(t.applicant.verifiedSkillsTitle, { count: defaultResume?.skills.length || 0 })}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {defaultResume?.skills.map((s) => (
                  <span
                    key={s.candidate_skill_id}
                    className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    title={s.evidence_text ? `Evidence: "${s.evidence_text}"` : undefined}
                  >
                    {s.skill_name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{t.applicant.lastUpdated}</span>
            <span className="text-brand-600 font-bold">{t.applicant.readyForScreening}</span>
          </div>
        </div>

      </div>

      {/* Screened Job Applications & Structured Feedback Table */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">{t.applicant.screeningsTitle}</h2>
            <p className="text-xs text-slate-500">
              {t.applicant.screeningsSubtitle}
            </p>
          </div>
        </div>

        {myResults.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            {t.applicant.noMatchesYet}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myResults.map((res) => (
              <div key={res.result_id} className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{res.job_title}</h4>
                      <p className="text-[11px] text-slate-400">{format(t.applicant.screeningResultId, { id: res.result_id })}</p>
                    </div>
                    <ScoreGauge score={res.compatibility_score} size="sm" />
                  </div>

                  <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                    {res.explanation?.explanation_text || "AI screening evaluation summary generated."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {format(t.applicant.matchedCount, { count: res.matched_skills.length })}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {format(t.applicant.gapsCount, { count: res.missing_skills.length })}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Link
                    href={`/applicant/feedback/${res.result_id}`}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-200" />
                    {t.applicant.viewFeedbackBtn}
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
