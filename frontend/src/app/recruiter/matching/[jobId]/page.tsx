"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Job, JobRankingSummary, MatchResultDetail } from "@/lib/api";
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
  RotateCcw
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-context";
import { useLanguage, format } from "@/lib/i18n";

export default function CandidateRankingPage() {
  const { showAlert } = useConfirm();
  const { t } = useLanguage();
  const params = useParams();
  const jobId = Number(params?.jobId);

  const [job, setJob] = useState<Job | null>(null);
  const [rankingData, setRankingData] = useState<JobRankingSummary | null>(null);
  const [selectedResult, setSelectedResult] = useState<MatchResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);

  // Dynamic Recruiter Weight Tuning State
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [weightSbert, setWeightSbert] = useState(50);
  const [weightTfidf, setWeightTfidf] = useState(20);
  const [weightSkills, setWeightSkills] = useState(30);

  useEffect(() => {
    if (jobId) {
      loadData();
    }
  }, [jobId]);

  async function loadData() {
    setLoading(true);
    try {
      const [jobData, rankData] = await Promise.all([
        api.getJob(jobId),
        api.getJobRanking(jobId)
      ]);
      setJob(jobData);
      setRankingData(rankData);
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

  const totalWeight = weightSbert + weightTfidf + weightSkills;

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
            <p className="text-xs text-slate-500">
              {job?.location} • {job?.employment_type} • {format(t.matching.targetSkillsCount, { count: job?.skills.length || 0 })}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowWeightTuner(!showWeightTuner)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
                showWeightTuner 
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
              disabled={screening}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-brand-500/20 transition-all shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${screening ? "animate-spin" : ""}`} />
              {screening ? t.matching.evaluatingResumes : t.matching.reCalculateAction}
            </button>
          </div>
        </div>
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
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border ${
                  s.requirement_type === "required"
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

        {(!rankingData?.results || rankingData.results.length === 0) ? (
          <div className="text-center py-12 space-y-3">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">{t.matching.noCandidatesYet}</p>
            <button
              onClick={() => handleRunMatching()}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
            >
              {t.matching.runScreeningNow}
            </button>
          </div>
        ) : (
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
                  <th className="py-3 px-3 text-end w-px whitespace-nowrap">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankingData.results.map((res) => (
                  <tr key={res.result_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-3 font-extrabold text-slate-900 w-px whitespace-nowrap">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black ${
                        res.rank_position === 1
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
