"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Job, JobRankingSummary, MatchResultDetail, JobApplication } from "@/lib/api";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ExplanationModal } from "@/components/ExplanationModal";
import {
  Brain,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Sliders,
  FileText,
  Layers,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertCircle,
  Users,
  Star,
  XCircle,
  CheckCircle2,
  Search,
  Filter
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-context";
import { useLanguage, format } from "@/lib/i18n";
import { Pagination } from "@/components/Pagination";

export default function CandidateRankingPage() {
  const { showAlert } = useConfirm();
  const { t } = useLanguage();
  const params = useParams();
  const jobId = Number(params?.jobId);

  const [job, setJob] = useState<Job | null>(null);
  const [rankingData, setRankingData] = useState<JobRankingSummary | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedResult, setSelectedResult] = useState<MatchResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);

  // Dynamic Recruiter Weight Tuning State
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [weightSbert, setWeightSbert] = useState(50);
  const [weightTfidf, setWeightTfidf] = useState(20);
  const [weightSkills, setWeightSkills] = useState(30);

  // Search, Filtering & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  async function loadData() {
    setLoading(true);
    try {
      const [jobData, rankData, appsData] = await Promise.all([
        api.getJob(jobId),
        api.getJobRanking(jobId).catch(() => null),
        api.getJobApplications(jobId).catch(() => [])
      ]);
      setJob(jobData);
      setRankingData(rankData);
      setApplications(appsData);
      if (rankData?.weights_used) {
        setWeightSbert(Math.round(rankData.weights_used.sbert * 100));
        setWeightTfidf(Math.round(rankData.weights_used.tfidf * 100));
        setWeightSkills(Math.round(rankData.weights_used.skills * 100));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRunMatching = async (overrideWeights?: { sbert: number; tfidf: number; skills: number }) => {
    setScreening(true);
    const s = overrideWeights ? overrideWeights.sbert : weightSbert;
    const tfidfVal = overrideWeights ? overrideWeights.tfidf : weightTfidf;
    const k = overrideWeights ? overrideWeights.skills : weightSkills;

    try {
      const newRankData = await api.runMatching(jobId, undefined, {
        weight_sbert: s / 100.0,
        weight_tfidf: tfidfVal / 100.0,
        weight_skills: k / 100.0
      });
      setRankingData(newRankData);
    } catch (err: any) {
      await showAlert({
        title: t.matching.screeningFailed,
        message: err.message || t.common.unexpectedError,
        variant: "danger",
      });
    } finally {
      setScreening(false);
    }
  };

  const applyPreset = (s: number, tfidfVal: number, k: number) => {
    setWeightSbert(s);
    setWeightTfidf(tfidfVal);
    setWeightSkills(k);
    handleRunMatching({ sbert: s, tfidf: tfidfVal, skills: k });
  };

  const resetToDefault = () => {
    applyPreset(50, 20, 30);
  };

  const handleUpdateStatus = async (
    result: MatchResultDetail,
    newStatus: "applied" | "screened" | "reviewed" | "shortlisted" | "rejected"
  ) => {
    if (!result.application_id) return;
    try {
      await api.updateApplicationStatus(result.application_id, newStatus);
      setRankingData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          results: prev.results.map((r) =>
            r.result_id === result.result_id ? { ...r, application_status: newStatus } : r
          )
        };
      });
      setApplications((prev) =>
        prev.map((a) =>
          a.application_id === result.application_id ? { ...a, status: newStatus } : a
        )
      );
    } catch (err: any) {
      await showAlert({
        title: t.common.error,
        message: err.message || t.common.unexpectedError,
        variant: "danger"
      });
    }
  };

  const totalWeight = weightSbert + weightTfidf + weightSkills;

  // Filtered and paginated ranking results
  const filteredResults = useMemo(() => {
    if (!rankingData?.results) return [];
    return rankingData.results.filter((res) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        res.candidate_name?.toLowerCase().includes(q) ||
        res.matched_skills?.some((s) => s.skill_name.toLowerCase().includes(q));

      const status = res.application_status || (res.compatibility_score !== undefined ? "screened" : "applied");
      const matchesDecision =
        decisionFilter === "all" || status.toLowerCase() === decisionFilter.toLowerCase();

      let matchesTier = true;
      if (tierFilter === "strong") {
        matchesTier = res.compatibility_score >= 70;
      } else if (tierFilter === "good") {
        matchesTier = res.compatibility_score >= 50 && res.compatibility_score < 70;
      } else if (tierFilter === "low") {
        matchesTier = res.compatibility_score < 50;
      }

      return matchesSearch && matchesDecision && matchesTier;
    });
  }, [rankingData?.results, searchQuery, decisionFilter, tierFilter]);

  // Reset to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, decisionFilter, tierFilter]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

  // Counts for decision categories
  const counts = useMemo(() => {
    const list = rankingData?.results || [];
    return {
      all: list.length,
      shortlisted: list.filter((r) => r.application_status === "shortlisted").length,
      screened: list.filter((r) => !r.application_status || r.application_status === "screened").length,
      reviewed: list.filter((r) => r.application_status === "reviewed").length,
      rejected: list.filter((r) => r.application_status === "rejected").length,
    };
  }, [rankingData?.results]);

  const hasActiveFilters = searchQuery || decisionFilter !== "all" || tierFilter !== "all";

  const resetFilters = () => {
    setSearchQuery("");
    setDecisionFilter("all");
    setTierFilter("all");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="text-center py-16 space-y-3">
        <Brain className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Back Link & Job Header */}
      <div className="space-y-4">
        <Link
          href="/recruiter"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t.matching.backToDashboard}
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{job?.job_title}</h1>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {job?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>{job?.location}</span>
              <span>&bull;</span>
              <span>{job?.employment_type}</span>
              <span>&bull;</span>
              <span>{format(t.matching.targetSkillsCount, { count: job?.skills.length || 0 })}</span>
              <span>&bull;</span>
              <span className="font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
                {format(t.matching.totalApplicantsCount, { count: applications.length })}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowWeightTuner(!showWeightTuner)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${showWeightTuner
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.matching.weightTuningBtn}</span>
              {showWeightTuner ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => handleRunMatching()}
              disabled={screening || applications.length === 0}
              title={applications.length === 0 ? t.matching.noApplicantsYet : undefined}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-brand-500/20 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${screening ? "animate-spin" : ""}`} />
              {screening ? t.matching.evaluatingResumes : t.matching.reCalculateAction}
            </button>
          </div>
        </div>

        {applications.length === 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 font-medium animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{t.matching.noApplicantsYet}</span>
          </div>
        )}
      </div>

      {/* Dynamic Recruiter Weight Tuning Panel */}
      {showWeightTuner && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-5 animate-in fade-in duration-200 border border-indigo-900/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Sliders className="w-3 h-3" /> {t.matching.dynamicArchitectureTitle}
              </div>
              <h3 className="text-base font-extrabold text-white">{t.matching.adjustHybridWeights}</h3>
              <p className="text-xs text-slate-300">
                {t.matching.hybridWeightsDesc}
              </p>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-semibold me-1">{t.matching.presetsLabel}</span>
              <button
                onClick={() => applyPreset(50, 20, 30)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
              >
                {t.matching.presetBalanced}
              </button>
              <button
                onClick={() => applyPreset(20, 10, 70)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
              >
                {t.matching.presetSkillFirst}
              </button>
              <button
                onClick={() => applyPreset(70, 10, 20)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
              >
                {t.matching.presetSemanticDeep}
              </button>
              <button
                onClick={() => applyPreset(20, 60, 20)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
              >
                {t.matching.presetLexicalStrict}
              </button>
              <button
                onClick={resetToDefault}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                title={t.matching.resetToDefault}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">

            {/* SBERT Slider */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-indigo-300 flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" /> {t.matching.sbertSliderLabel}
                </span>
                <span className="text-sm font-black text-indigo-300" dir="ltr">{weightSbert}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weightSbert}
                onChange={(e) => setWeightSbert(Number(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">{t.matching.sbertSliderDesc}</p>
            </div>

            {/* TF-IDF Slider */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-sky-300 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-sky-400" /> {t.matching.tfidfSliderLabel}
                </span>
                <span className="text-sm font-black text-sky-300" dir="ltr">{weightTfidf}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weightTfidf}
                onChange={(e) => setWeightTfidf(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">{t.matching.tfidfSliderDesc}</p>
            </div>

            {/* Skills Slider */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> {t.matching.skillsSliderLabel}
                </span>
                <span className="text-sm font-black text-emerald-300" dir="ltr">{weightSkills}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weightSkills}
                onChange={(e) => setWeightSkills(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">{t.matching.skillsSliderDesc}</p>
            </div>

          </div>

          {/* Normalized Weight Bar and Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/10">
            <div className="w-full sm:w-2/3 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-300 font-bold">
                <span>{t.matching.normalizedRatio}</span>
                <span dir="ltr">
                  SBERT: {Math.round((weightSbert / Math.max(1, totalWeight)) * 100)}% •
                  TF-IDF: {Math.round((weightTfidf / Math.max(1, totalWeight)) * 100)}% •
                  Skills: {Math.round((weightSkills / Math.max(1, totalWeight)) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                <div style={{ width: `${(weightSbert / Math.max(1, totalWeight)) * 100}%` }} className="bg-indigo-500 h-full" />
                <div style={{ width: `${(weightTfidf / Math.max(1, totalWeight)) * 100}%` }} className="bg-sky-400 h-full" />
                <div style={{ width: `${(weightSkills / Math.max(1, totalWeight)) * 100}%` }} className="bg-emerald-400 h-full" />
              </div>
            </div>

            <button
              onClick={() => handleRunMatching()}
              disabled={screening}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition-all shrink-0 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${screening ? "animate-spin" : ""}`} />
              <span>{t.matching.applyAndReRank}</span>
            </button>
          </div>
        </div>
      )}

      {/* Target Skills Required for this Role */}
      {job && (
        <div className="p-4 rounded-xl glass-card border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider me-2">{t.matching.targetSkills}</span>
            {job.skills.map((s) => (
              <span
                key={s.job_skill_id}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border ${s.requirement_type === "required"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-brand-50 text-brand-700 border-brand-200"
                  }`}
              >
                {s.skill_name} <span className="opacity-70 text-[9px]">({s.requirement_type})</span>
              </span>
            ))}
          </div>

          {rankingData?.weights_used && (
            <div className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-lg border border-slate-200" dir="ltr">
              Active Weights: SBERT {Math.round(rankingData.weights_used.sbert * 100)}% • TF-IDF {Math.round(rankingData.weights_used.tfidf * 100)}% • Skills {Math.round(rankingData.weights_used.skills * 100)}%
            </div>
          )}
        </div>
      )}

      {/* Candidate Ranking Table (Figure 5.2.1.5) */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {format(t.matching.rankedCandidates, { count: rankingData?.results.length || 0 })}
            </h2>
            <p className="text-xs text-slate-500">
              {t.matching.rankedCandidatesSubtitle}
            </p>
          </div>
          {rankingData?.results.length ? (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              {format(t.matching.topCompatibility, { score: rankingData.top_compatibility_score })}
            </span>
          ) : null}
        </div>

        {/* Ranking Toolbar: Search, Decision Filter Pills & Compatibility Tier */}
        {rankingData?.results && rankingData.results.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.pagination.searchPlaceholder}
                  className="w-full ps-9 pe-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                >
                  <option value="all">{t.pagination.filterByTier}</option>
                  <option value="strong">{t.pagination.strongMatchTier}</option>
                  <option value="good">{t.pagination.goodMatchTier}</option>
                  <option value="low">{t.pagination.lowMatchTier}</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shrink-0"
                  >
                    {t.pagination.resetFilters}
                  </button>
                )}
              </div>
            </div>

            {/* Decision Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider me-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> {t.matching.decisionCol}:
              </span>
              <button
                onClick={() => setDecisionFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  decisionFilter === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.pagination.all} ({counts.all})
              </button>
              <button
                onClick={() => setDecisionFilter("shortlisted")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                  decisionFilter === "shortlisted"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                {t.applicant.statusShortlisted} ({counts.shortlisted})
              </button>
              <button
                onClick={() => setDecisionFilter("screened")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  decisionFilter === "screened"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                {t.applicant.statusScreened} ({counts.screened})
              </button>
              <button
                onClick={() => setDecisionFilter("rejected")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                  decisionFilter === "rejected"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                }`}
              >
                <XCircle className="w-3 h-3" />
                {t.applicant.statusRejected} ({counts.rejected})
              </button>
            </div>
          </div>
        )}

        {(!rankingData?.results || rankingData.results.length === 0) ? (
          <div className="text-center py-12 space-y-3">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              {applications.length === 0 ? t.matching.noApplicantsYet : t.matching.noCandidatesYet}
            </p>
            {applications.length > 0 && (
              <button
                onClick={() => handleRunMatching()}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {t.matching.runScreeningNow}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-start text-xs table-auto">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 text-start w-px whitespace-nowrap">{t.matching.rankCol}</th>
                  <th className="py-3 px-3 text-start min-w-[140px]">{t.matching.candidateCol}</th>
                  <th className="py-3 px-3 text-start min-w-[100px]">{t.matching.compatibilityCol}</th>
                  <th className="py-3 px-3 text-start w-px whitespace-nowrap">{t.matching.sbertCol}</th>
                  <th className="py-3 px-3 text-start w-px whitespace-nowrap">{t.matching.tfidfCol}</th>
                  <th className="py-3 px-3 text-start min-w-[180px]">{t.matching.matchedSkillsCol}</th>
                  <th className="py-3 px-3 text-start min-w-[180px]">{t.matching.missingSkillsCol}</th>
                  <th className="py-3 px-3 text-start min-w-[150px]">{t.matching.decisionCol}</th>
                  <th className="py-3 px-3 text-end w-px whitespace-nowrap">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedResults.map((res) => (
                  <tr key={res.result_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-3 font-extrabold text-slate-900 w-px whitespace-nowrap">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black ${res.rank_position === 1
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                          : res.rank_position === 2
                            ? "bg-slate-200 text-slate-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                        {res.rank_position || 1}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-bold text-slate-900">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900"><bdi>{res.candidate_name}</bdi></p>
                        <p className="text-[10px] text-slate-400 font-normal">{format(t.matching.candidateId, { id: res.candidate_id })}</p>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <ScoreGauge score={res.compatibility_score} size="sm" layout="vertical" />
                    </td>
                    <td className="py-4 px-3 font-bold text-indigo-600 w-px whitespace-nowrap">
                      <bdi dir="ltr">{res.bert_score}%</bdi>
                    </td>
                    <td className="py-4 px-3 font-bold text-sky-600 w-px whitespace-nowrap">
                      <bdi dir="ltr">{res.tfidf_score}%</bdi>
                    </td>
                    <td className="py-4 px-3 max-w-[240px]">
                      {res.matched_skills.length === 0 ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <div
                          className="flex flex-wrap items-center gap-1"
                          title={res.matched_skills.map((s) => s.skill_name).join(", ")}
                        >
                          {res.matched_skills.slice(0, 3).map((s, idx) => (
                            <span key={idx} className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-medium border border-emerald-200 whitespace-nowrap">
                              <bdi>{s.skill_name}</bdi>
                            </span>
                          ))}
                          {res.matched_skills.length > 3 && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded font-semibold cursor-help whitespace-nowrap">
                              +{res.matched_skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 max-w-[240px]">
                      {res.missing_skills.length === 0 ? (
                        <span className="text-emerald-600 font-bold text-xs">—</span>
                      ) : (
                        <div
                          className="flex flex-wrap items-center gap-1"
                          title={res.missing_skills.map((s) => s.skill_name).join(", ")}
                        >
                          {res.missing_skills.slice(0, 2).map((s, idx) => (
                            <span key={idx} className="bg-rose-50 text-rose-700 text-[10px] px-1.5 py-0.5 rounded font-medium border border-rose-200 whitespace-nowrap">
                              <bdi>{s.skill_name}</bdi>
                            </span>
                          ))}
                          {res.missing_skills.length > 2 && (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded font-semibold cursor-help whitespace-nowrap">
                              +{res.missing_skills.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {res.application_status === "shortlisted" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-purple-500 fill-purple-500" />
                            {t.applicant.statusShortlisted}
                          </span>
                        ) : res.application_status === "rejected" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            {t.applicant.statusRejected}
                          </span>
                        ) : res.application_status === "reviewed" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-sky-500" />
                            {t.applicant.statusReviewed}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {t.applicant.statusScreened}
                          </span>
                        )}

                        {/* Quick Decision Action Buttons */}
                        {res.application_id && (
                          <div className="flex items-center gap-0.5 ms-1">
                            {res.application_status !== "shortlisted" && (
                              <button
                                onClick={() => handleUpdateStatus(res, "shortlisted")}
                                title={t.matching.shortlistBtn}
                                className="p-1 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {res.application_status !== "rejected" && (
                              <button
                                onClick={() => handleUpdateStatus(res, "rejected")}
                                title={t.matching.rejectBtn}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(res.application_status === "shortlisted" || res.application_status === "rejected") && (
                              <button
                                onClick={() => handleUpdateStatus(res, "screened")}
                                title={t.matching.resetStatusBtn}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-end w-px whitespace-nowrap">
                      <button
                        onClick={() => setSelectedResult(res)}
                        className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1"
                      >
                        <Brain className="w-3.5 h-3.5" /> {t.matching.explainBtn}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredResults.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemName={t.pagination.itemsCandidates}
          />
        </>
        )}
      </div>

      {/* Candidate Explanation Modal & Printable Dossier */}
      <ExplanationModal
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />

    </div>
  );
}
