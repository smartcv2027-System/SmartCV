"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  api, 
  ModelEvaluationReport, 
  ModelMetric, 
  QualitativeCaseStudy,
  GroundTruthEvaluationReport,
  GroundTruthSummaryMetric,
  GroundTruthPerJobEvaluation,
  AblationReport,
  AblationConfigMetric,
  EdgeCaseDeepDive
} from "@/lib/api";
import { 
  Brain, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  Award,
  Copy,
  Code,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Layers,
  ShieldCheck,
  Zap,
  TrendingUp,
  X,
  Sliders,
  FileSpreadsheet,
  Target,
  BarChart3,
  Users2,
  FileText,
  AlertTriangle,
  HelpCircle,
  Briefcase
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-context";
import { useLanguage, format } from "@/lib/i18n";

export default function ModelEvaluationPage() {
  const { showAlert } = useConfirm();
  const { t } = useLanguage();

  // Active Evaluation View: "groundTruth" (50 Pairs) | "ablation" (Ablation & Error Analysis) | "discrimination" (36 Pairs)
  const [activeTab, setActiveTab] = useState<"groundTruth" | "ablation" | "discrimination">("groundTruth");

  // Ground-Truth State (50 Pairs)
  const [gtReport, setGtReport] = useState<GroundTruthEvaluationReport | null>(null);
  const [loadingGt, setLoadingGt] = useState(true);
  const [runningGt, setRunningGt] = useState(false);
  const [copiedGtLatex, setCopiedGtLatex] = useState(false);
  const [showGtLatexCode, setShowGtLatexCode] = useState(false);
  const [downloadingGtCsv, setDownloadingGtCsv] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>("JOB-01");

  // Ablation & Error Analysis State
  const [ablationReport, setAblationReport] = useState<AblationReport | null>(null);
  const [loadingAblation, setLoadingAblation] = useState(true);
  const [runningAblation, setRunningAblation] = useState(false);
  const [copiedAblationLatex, setCopiedAblationLatex] = useState(false);
  const [showAblationLatexCode, setShowAblationLatexCode] = useState(false);

  // Discrimination State (36 Pairs)
  const [report, setReport] = useState<ModelEvaluationReport | null>(null);
  const [loadingDiscrim, setLoadingDiscrim] = useState(true);
  const [runningDiscrim, setRunningDiscrim] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [showLatexCode, setShowLatexCode] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Thesis Chapter 7 Modal State
  const [showThesisModal, setShowThesisModal] = useState(false);
  const [thesisText, setThesisText] = useState("");
  const [loadingThesis, setLoadingThesis] = useState(false);
  const [copiedThesis, setCopiedThesis] = useState(false);

  const KKU_TRACKS = [
    { id: "all", label: "All Benchmark Tracks (N=36)" },
    { id: "AI & Machine Learning", label: "AI & Machine Learning" },
    { id: "Software Engineering & Full-Stack", label: "Software Engineering" },
    { id: "Data Science & Analytics", label: "Data Science" },
    { id: "Cybersecurity & Network Systems", label: "Cybersecurity" },
    { id: "Cloud DevOps & Systems Administration", label: "Cloud DevOps" },
    { id: "Cross-Domain Negative Controls", label: "Negative Controls" },
  ];

  useEffect(() => {
    loadGroundTruthReport();
    loadAblationReport();
    loadDiscrimReport(selectedTrack);
  }, []);

  useEffect(() => {
    loadDiscrimReport(selectedTrack);
  }, [selectedTrack]);

  async function loadGroundTruthReport() {
    setLoadingGt(true);
    try {
      const data = await api.getGroundTruthReport();
      setGtReport(data);
    } catch (err) {
      console.error("Failed to load ground truth report:", err);
    } finally {
      setLoadingGt(false);
    }
  }

  async function loadAblationReport() {
    setLoadingAblation(true);
    try {
      const data = await api.getAblationReport();
      setAblationReport(data);
    } catch (err) {
      console.error("Failed to load ablation report:", err);
    } finally {
      setLoadingAblation(false);
    }
  }

  async function loadDiscrimReport(track: string) {
    setLoadingDiscrim(true);
    try {
      const data = await api.getEvaluationReport(track === "all" ? undefined : track);
      setReport(data);
    } catch (err) {
      console.error("Failed to load discrimination report:", err);
    } finally {
      setLoadingDiscrim(false);
    }
  }

  const handleRerunGt = async () => {
    setRunningGt(true);
    try {
      const data = await api.getGroundTruthReport();
      setGtReport(data);
    } catch (err: any) {
      await showAlert({
        title: "Evaluation Failed",
        message: err.message || "Failed to re-run ground-truth evaluation",
        variant: "danger",
      });
    } finally {
      setRunningGt(false);
    }
  };

  const handleRerunAblation = async () => {
    setRunningAblation(true);
    try {
      const data = await api.getAblationReport();
      setAblationReport(data);
    } catch (err: any) {
      await showAlert({
        title: "Ablation Failed",
        message: err.message || "Failed to re-run ablation study",
        variant: "danger",
      });
    } finally {
      setRunningAblation(false);
    }
  };

  const handleRerunDiscrim = async () => {
    setRunningDiscrim(true);
    try {
      const data = await api.getEvaluationReport(selectedTrack === "all" ? undefined : selectedTrack);
      setReport(data);
    } catch (err: any) {
      await showAlert({
        title: "Evaluation Failed",
        message: err.message || "Failed to re-run benchmark evaluation",
        variant: "danger",
      });
    } finally {
      setRunningDiscrim(false);
    }
  };

  const handleCopyGtLatex = () => {
    if (!gtReport?.latex_table) return;
    navigator.clipboard.writeText(gtReport.latex_table);
    setCopiedGtLatex(true);
    setTimeout(() => setCopiedGtLatex(false), 3000);
  };

  const handleCopyAblationLatex = () => {
    if (!ablationReport?.latex_table) return;
    navigator.clipboard.writeText(ablationReport.latex_table);
    setCopiedAblationLatex(true);
    setTimeout(() => setCopiedAblationLatex(false), 3000);
  };

  const handleCopyLatex = () => {
    if (!report?.latex_table) return;
    navigator.clipboard.writeText(report.latex_table);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 3000);
  };

  const handleDownloadGtCsv = async () => {
    setDownloadingGtCsv(true);
    try {
      await api.downloadGroundTruthCsv();
    } catch (err: any) {
      await showAlert({
        title: "Download Failed",
        message: err.message || "Failed to download ground-truth CSV dataset",
        variant: "danger",
      });
    } finally {
      setDownloadingGtCsv(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      await api.downloadBenchmarkCsv(selectedTrack === "all" ? undefined : selectedTrack);
    } catch (err: any) {
      await showAlert({
        title: "Download Failed",
        message: err.message || "Failed to download CSV dataset",
        variant: "danger",
      });
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleOpenThesisModal = async () => {
    setShowThesisModal(true);
    if (!thesisText) {
      setLoadingThesis(true);
      try {
        const res = await api.getThesisChapter(selectedTrack === "all" ? undefined : selectedTrack);
        setThesisText(res.text);
      } catch (err) {
        console.error(err);
        setThesisText(report?.thesis_chapter_text || "Error loading chapter text.");
      } finally {
        setLoadingThesis(false);
      }
    }
  };

  const handleCopyThesis = () => {
    if (!thesisText) return;
    navigator.clipboard.writeText(thesisText);
    setCopiedThesis(true);
    setTimeout(() => setCopiedThesis(false), 3000);
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const isInitialLoading = 
    (activeTab === "groundTruth" && loadingGt && !gtReport) ||
    (activeTab === "ablation" && loadingAblation && !ablationReport) ||
    (activeTab === "discrimination" && loadingDiscrim && !report);

  if (isInitialLoading) {
    return (
      <div className="text-center py-24 space-y-4">
        <Brain className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-700 font-bold">
          {activeTab === "ablation"
            ? "Evaluating 7 Architecture Ablations across 50 Pairs..."
            : activeTab === "groundTruth" 
            ? "Evaluating 50 Resume-Job Pairs with Independent Ground-Truth..." 
            : "Executing Scoring & Discrimination Benchmarks..."}
        </p>
        <p className="text-xs text-slate-500">
          Calculating Spearman&apos;s ρ, nDCG@5, Precision@5 & Component Ablation Metrics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t.common.back}
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
          <div className="absolute end-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -me-20 -mt-20"></div>
          
          <div className="space-y-2 relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> KKU B.Sc. Graduation Project • Academic Evaluation
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {activeTab === "ablation" 
                ? t.admin.ablationTitle 
                : activeTab === "groundTruth" 
                ? t.admin.groundTruthTitle 
                : "Scoring, Ranking & Discrimination Evaluation"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {activeTab === "ablation"
                ? t.admin.ablationSubtitle
                : activeTab === "groundTruth" 
                ? t.admin.groundTruthSubtitle 
                : "Empirical validation comparing TF-IDF Lexical Cosine, Sentence-BERT Semantic Cosine, and the SmartCV Hybrid Model. Measures compatibility score separation and candidate ranking effectiveness."}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
            <button
              onClick={handleOpenThesisModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all cursor-pointer"
              title="View & copy publication-ready text for Chapter 7"
            >
              <BookOpen className="w-4 h-4" />
              {t.admin.chapter7Btn}
            </button>

            {activeTab === "ablation" ? (
              <>
                <button
                  onClick={handleCopyAblationLatex}
                  disabled={!ablationReport?.latex_table}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    copiedAblationLatex 
                      ? "bg-emerald-600 text-white" 
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  }`}
                  title="Copy Table 7.9 LaTeX for Thesis Section 7.4.3"
                >
                  {copiedAblationLatex ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Code className="w-4 h-4 text-indigo-300" />}
                  {copiedAblationLatex ? t.admin.latexCopied : t.admin.copyTable79LatexBtn}
                </button>

                <button
                  onClick={handleRerunAblation}
                  disabled={runningAblation}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${runningAblation ? "animate-spin" : ""}`} />
                  {runningAblation ? t.admin.scoringProgress : t.admin.reRunBtn}
                </button>
              </>
            ) : activeTab === "groundTruth" ? (
              <>
                <button
                  onClick={handleDownloadGtCsv}
                  disabled={downloadingGtCsv}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
                  title="Download the 50-pair human ground truth dataset with annotations (CSV)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {downloadingGtCsv ? t.common.loading : t.admin.downloadGroundTruthCsvBtn}
                </button>

                <button
                  onClick={handleCopyGtLatex}
                  disabled={!gtReport?.latex_table}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    copiedGtLatex 
                      ? "bg-emerald-600 text-white" 
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  }`}
                  title="Copy Table 7.8 LaTeX for Thesis Section 7.4.2"
                >
                  {copiedGtLatex ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Code className="w-4 h-4 text-indigo-300" />}
                  {copiedGtLatex ? t.admin.latexCopied : t.admin.copyTable78LatexBtn}
                </button>

                <button
                  onClick={handleRerunGt}
                  disabled={runningGt}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${runningGt ? "animate-spin" : ""}`} />
                  {runningGt ? t.admin.scoringProgress : t.admin.reRunBtn}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDownloadCsv}
                  disabled={downloadingCsv}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
                  title="Download standardized benchmark dataset with ground-truth and scores"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {downloadingCsv ? t.common.loading : t.admin.datasetCsvBtn}
                </button>

                <button
                  onClick={handleCopyLatex}
                  disabled={!report?.latex_table}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    copiedLatex 
                      ? "bg-emerald-600 text-white" 
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  }`}
                  title="Copy publication LaTeX tables for Thesis Section 7.4"
                >
                  {copiedLatex ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Code className="w-4 h-4 text-indigo-300" />}
                  {copiedLatex ? t.admin.latexCopied : t.admin.latexTablesBtn}
                </button>

                <button
                  onClick={handleRerunDiscrim}
                  disabled={runningDiscrim}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${runningDiscrim ? "animate-spin" : ""}`} />
                  {runningDiscrim ? t.admin.scoringProgress : t.admin.reRunBtn}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Study Navigation Tabs (3 Dedicated Sections) */}
      <div className="flex border-b border-slate-200 gap-3 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("groundTruth")}
          className={`pb-3.5 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "groundTruth"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>{t.admin.tabGroundTruth}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-black">
            Section 7.4.2
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ablation")}
          className={`pb-3.5 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "ablation"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t.admin.tabAblation}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-black">
            Section 7.4.3 & 7.4.4
          </span>
        </button>

        <button
          onClick={() => setActiveTab("discrimination")}
          className={`pb-3.5 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "discrimination"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t.admin.tabDiscrimination}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            Section 7.4.1
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: INDEPENDENT GROUND-TRUTH RANKING VALIDATION (N=50)                 */}
      {/* ========================================================================= */}
      {activeTab === "groundTruth" && gtReport && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Inter-Rater Reliability Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-lg border border-indigo-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t.admin.almostPerfect}
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {t.admin.interRaterTitle}
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Two independent evaluators blindly assessed all 50 candidate-job pairs using a standardized 4-level rubric without knowledge of system predictions. {t.admin.adjudicationNote}
                </p>
              </div>

              {/* Statistical Reliability Metrics */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[130px]">
                  <p className="text-[10px] uppercase font-bold text-slate-300">{t.admin.interRaterKappa}</p>
                  <p className="text-2xl font-black text-amber-300 mt-0.5">
                    κ<sub>w</sub> = {gtReport.inter_rater_reliability.quadratic_weighted_kappa.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-emerald-300 font-bold mt-0.5">Landis & Koch (1977)</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[120px]">
                  <p className="text-[10px] uppercase font-bold text-slate-300">{t.admin.rawAgreement}</p>
                  <p className="text-2xl font-black text-emerald-300 mt-0.5">
                    {gtReport.inter_rater_reliability.exact_agreement_rate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                    {gtReport.inter_rater_reliability.exact_matches_count} / {gtReport.inter_rater_reliability.total_pairs} pairs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Ranking Evaluation Table (Table 7.8) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                    Table 7.8
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {t.admin.table78Title}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {t.admin.table78Subtitle}
                </p>
              </div>

              <button
                onClick={() => setShowGtLatexCode(!showGtLatexCode)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <Code className="w-3.5 h-3.5" />
                {showGtLatexCode ? t.admin.hideLatexCode : t.admin.viewPublicationLatex}
                {showGtLatexCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3 px-3 text-start">{t.admin.modelArchitectureCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.spearmanCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.ndcgCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.precisionCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.groundingXaiCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gtReport.summary_metrics.map((m: GroundTruthSummaryMetric, idx: number) => {
                    const isHybrid = idx === 2;
                    const isSbert = idx === 1;
                    return (
                      <tr 
                        key={idx} 
                        className={`transition-colors ${isHybrid ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-50/80"}`}
                      >
                        <td className="py-4 px-3">
                          <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                            {isHybrid && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                            {m.model_name}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {isHybrid 
                              ? "50% Dense SBERT + 20% Lexical TF-IDF + 30% Taxonomy Coverage"
                              : isSbert 
                              ? "Dense semantic cosine similarity (all-MiniLM-L6-v2)" 
                              : "Lexical keyword overlap with cosine similarity"}
                          </p>
                        </td>
                        
                        {/* Spearman's Rho */}
                        <td className="py-4 px-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {m.spearman_rho_mean !== null ? m.spearman_rho_mean.toFixed(4) : "N/A"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ± {m.spearman_rho_std.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">Rank alignment (ties adjusted)</p>
                        </td>

                        {/* nDCG@5 */}
                        <td className="py-4 px-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-emerald-700 font-mono">
                              {m.ndcg_at_5_mean.toFixed(4)}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ± {m.ndcg_at_5_std.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">Top-5 exponential gain</p>
                        </td>

                        {/* Precision@5 */}
                        <td className="py-4 px-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-indigo-700 font-mono">
                              {(m.precision_at_5_mean * 100).toFixed(1)}%
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ± {(m.precision_at_5_std * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">Relevance threshold ≥ 2</p>
                        </td>

                        {/* Grounding & Verification */}
                        <td className="py-4 px-3">
                          {isHybrid ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3.5 h-3.5" /> High Agreement (Optimal)
                            </span>
                          ) : isSbert ? (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center gap-1 w-fit">
                              <Zap className="w-3.5 h-3.5" /> Moderate-High Rank
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold w-fit">
                              High Rank Variance
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expandable Table 7.8 LaTeX Code */}
            {showGtLatexCode && gtReport.latex_table && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    LaTeX Publication Source: Table 7.8 (Independent Ground-Truth Validation)
                  </span>
                  <button
                    onClick={handleCopyGtLatex}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedGtLatex ? "Copied!" : "Copy LaTeX"}
                  </button>
                </div>
                <pre className="text-[11px] font-mono p-4 bg-slate-900/90 rounded-xl overflow-x-auto text-emerald-300 leading-relaxed border border-slate-800">
                  {gtReport.latex_table}
                </pre>
              </div>
            )}
          </div>

          {/* Metric Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Spearman Rank Correlation Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ranking Metric</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  Tie-Adjusted
                </span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Spearman&apos;s Rank Correlation (ρ)</h3>
                <p className="text-[11px] text-slate-500 mt-1">Measures monotonicity between predicted scores and human consensus rank.</p>
              </div>
              <div className="space-y-2.5 pt-2">
                {gtReport.summary_metrics.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={idx === 2 ? "text-indigo-700 font-black" : "text-slate-600"}>{m.model_name.split(" ")[0]}</span>
                      <span className="font-mono">{m.spearman_rho_mean?.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === 2 ? "bg-indigo-600" : idx === 1 ? "bg-indigo-400" : "bg-slate-300"}`} 
                        style={{ width: `${Math.max(0, (m.spearman_rho_mean ?? 0) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* nDCG@5 Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Information Retrieval</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Top-5 Cutoff
                </span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Normalized Discounted Gain (nDCG@5)</h3>
                <p className="text-[11px] text-slate-500 mt-1">Evaluates quality of the top-5 ranked candidates with exponential relevance gain.</p>
              </div>
              <div className="space-y-2.5 pt-2">
                {gtReport.summary_metrics.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={idx === 2 ? "text-emerald-700 font-black" : "text-slate-600"}>{m.model_name.split(" ")[0]}</span>
                      <span className="font-mono">{m.ndcg_at_5_mean.toFixed(4)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === 2 ? "bg-emerald-600" : idx === 1 ? "bg-emerald-400" : "bg-slate-300"}`} 
                        style={{ width: `${Math.max(0, m.ndcg_at_5_mean * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Precision@5 Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recruitment Precision</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  Relevance ≥ 2
                </span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Precision at Rank 5 (P@5)</h3>
                <p className="text-[11px] text-slate-500 mt-1">Percentage of top-5 retrieved candidates rated Medium (2) or High (3) match.</p>
              </div>
              <div className="space-y-2.5 pt-2">
                {gtReport.summary_metrics.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={idx === 2 ? "text-amber-700 font-black" : "text-slate-600"}>{m.model_name.split(" ")[0]}</span>
                      <span className="font-mono">{(m.precision_at_5_mean * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === 2 ? "bg-amber-500" : idx === 1 ? "bg-amber-400" : "bg-slate-300"}`} 
                        style={{ width: `${Math.max(0, m.precision_at_5_mean * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Job-by-Job Ranking Breakdown (The 5 Saudi Technology Jobs) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                  Per-Job Analysis
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  {t.admin.perJobSectionTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t.admin.perJobSectionSubtitle}
              </p>
            </div>

            <div className="space-y-4">
              {gtReport.per_job_evaluations.map((job: GroundTruthPerJobEvaluation) => {
                const isExpanded = expandedJobId === job.job_id;
                return (
                  <div 
                    key={job.job_id} 
                    className="border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-sm"
                  >
                    {/* Job Card Header */}
                    <div className="p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors"
                      onClick={() => toggleJobExpansion(job.job_id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono text-xs font-black">
                          {job.job_id}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{job.job_title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {job.candidate_count} candidates evaluated • Human Consensus Ranks
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Quick Metrics Chips */}
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-bold text-slate-700">
                            Hybrid ρ: {job.models["SmartCV Hybrid Ensemble"]?.spearman_rho?.toFixed(4) ?? "N/A"}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-800">
                            nDCG@5: {job.models["SmartCV Hybrid Ensemble"]?.ndcg_at_5?.toFixed(4) ?? "N/A"}
                          </span>
                        </div>

                        <button
                          className="text-slate-400 hover:text-slate-600 p-1"
                          aria-label="Toggle Job Breakdown"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Job Breakdown Table */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-200 bg-white space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-start text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                                <th className="py-2.5 px-3 text-start">Model Architecture</th>
                                <th className="py-2.5 px-3 text-center">Spearman ρ</th>
                                <th className="py-2.5 px-3 text-center">nDCG@5</th>
                                <th className="py-2.5 px-3 text-center">Precision@5</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {Object.entries(job.models).map(([mname, mres], midx) => {
                                const isHybrid = mname.includes("Hybrid");
                                return (
                                  <tr key={midx} className={isHybrid ? "bg-indigo-50/50 font-bold" : ""}>
                                    <td className="py-2.5 px-3 text-slate-800">
                                      {mname}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono">
                                      {mres.spearman_rho !== null ? mres.spearman_rho.toFixed(4) : "N/A"}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-emerald-700">
                                      {mres.ndcg_at_5.toFixed(4)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-indigo-700">
                                      {(mres.precision_at_5 * 100).toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Candidates Scores Inspection Table */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                              <Users2 className="w-3.5 h-3.5 text-indigo-600" /> Candidate Consensus Scores (10 Resumes)
                            </span>
                            <span className="text-[10px] text-slate-400">Scale: 0 (Not Relevant) to 3 (High Match)</span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                            <table className="w-full text-start text-[11px]">
                              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                                <tr>
                                  <th className="py-2 px-3 text-start">Candidate</th>
                                  <th className="py-2 px-3 text-center">Consensus Label</th>
                                  <th className="py-2 px-3 text-center">TF-IDF Score</th>
                                  <th className="py-2 px-3 text-center">SBERT Score</th>
                                  <th className="py-2 px-3 text-center">Hybrid Score</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono">
                                {Array.from({ length: 10 }).map((_, cIdx) => {
                                  const cLabel = job.consensus_labels[cIdx];
                                  const tfidfScore = job.models["Baseline Keyword (TF-IDF)"]?.scores[cIdx] ?? 0;
                                  const sbertScore = job.models["Advanced Semantic (Sentence-BERT)"]?.scores[cIdx] ?? 0;
                                  const hybridScore = job.models["SmartCV Hybrid Ensemble"]?.scores[cIdx] ?? 0;
                                  const resId = `RES-${String(cIdx + 1).padStart(2, "0")}`;
                                  
                                  const labelBg = cLabel === 3 
                                    ? "bg-emerald-100 text-emerald-800" 
                                    : cLabel === 2 
                                    ? "bg-indigo-100 text-indigo-800" 
                                    : cLabel === 1 
                                    ? "bg-amber-100 text-amber-800" 
                                    : "bg-slate-100 text-slate-600";

                                  return (
                                    <tr key={cIdx} className="hover:bg-slate-50/80">
                                      <td className="py-1.5 px-3 font-sans font-bold text-slate-800">
                                        {resId}
                                      </td>
                                      <td className="py-1.5 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${labelBg}`}>
                                          {cLabel} {cLabel === 3 ? "★ High" : cLabel === 2 ? "✓ Med" : cLabel === 1 ? "• Low" : "✗ None"}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-3 text-center text-slate-600">
                                        {tfidfScore.toFixed(1)}%
                                      </td>
                                      <td className="py-1.5 px-3 text-center text-indigo-700">
                                        {sbertScore.toFixed(1)}%
                                      </td>
                                      <td className="py-1.5 px-3 text-center font-bold text-emerald-700">
                                        {hybridScore.toFixed(1)}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4-Level Relevance Rubric Reference Box */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                {t.admin.rubricTitle}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">Scale 0</span>
                <p className="font-bold text-slate-900 mt-1">Not Relevant</p>
                <p className="text-[11px] text-slate-500">No meaningful alignment with required skills or experience.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Scale 1</span>
                <p className="font-bold text-slate-900 mt-1">Low Match</p>
                <p className="text-[11px] text-slate-500">Minimal overlap in skills or adjacent background.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">Scale 2</span>
                <p className="font-bold text-slate-900 mt-1">Medium Match</p>
                <p className="text-[11px] text-slate-500">Meets core competencies and required degree credentials.</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Scale 3</span>
                <p className="font-bold text-slate-900 mt-1">High Match</p>
                <p className="text-[11px] text-slate-500">Strong technical alignment, required skills, and direct experience.</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPONENT ABLATION & ERROR ANALYSIS (SECTIONS 7.4.3 & 7.4.4)      */}
      {/* ========================================================================= */}
      {activeTab === "ablation" && ablationReport && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Ablation Overview Explainer Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-900/40 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                Ablation Methodology
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Empirical Justification of Ensemble Weights (50% SBERT, 20% TF-IDF, 30% Skills)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              To scientifically prove why the SmartCV ensemble outperforms individual models, we evaluate 7 distinct configurations: 
              single components (pure SBERT, pure TF-IDF, pure Skills), two-way proportional ablations (removing one component while maintaining relative ratios), 
              and the proposed full hybrid architecture.
            </p>
          </div>

          {/* Table 7.9: Component Ablation Study */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">
                    Table 7.9
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {t.admin.table79Title}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {t.admin.table79Subtitle}
                </p>
              </div>

              <button
                onClick={() => setShowAblationLatexCode(!showAblationLatexCode)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <Code className="w-3.5 h-3.5" />
                {showAblationLatexCode ? t.admin.hideLatexCode : t.admin.viewPublicationLatex}
                {showAblationLatexCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3 px-3 text-start">Ablation Configuration</th>
                    <th className="py-3 px-3 text-center">{t.admin.weightsCol}</th>
                    <th className="py-3 px-3 text-center">{t.admin.spearmanCol}</th>
                    <th className="py-3 px-3 text-center">{t.admin.ndcgCol}</th>
                    <th className="py-3 px-3 text-center">{t.admin.precisionCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ablationReport.ablation_configurations.map((cfg: AblationConfigMetric, idx: number) => {
                    const isFull = cfg.config_id === "full_hybrid";
                    const isPure = cfg.config_id.startsWith("pure_");
                    const w = cfg.weights;
                    return (
                      <tr 
                        key={idx} 
                        className={`transition-colors ${isFull ? "bg-indigo-50/60 font-bold hover:bg-indigo-50/90" : "hover:bg-slate-50/80"}`}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {isFull && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                            <span className="font-extrabold text-slate-900">{cfg.config_name}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cfg.description}</p>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[11px]">
                            ({(w.sbert * 100).toFixed(0)}%, {(w.tfidf * 100).toFixed(0)}%, {(w.skills * 100).toFixed(0)}%)
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono font-bold">
                          {cfg.spearman_rho_mean !== null ? (
                            <span className={isFull ? "text-indigo-900 font-black" : "text-slate-800"}>
                              {cfg.spearman_rho_mean.toFixed(4)} <span className="text-[10px] text-slate-400 font-normal">± {cfg.spearman_rho_std.toFixed(4)}</span>
                            </span>
                          ) : "N/A"}
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {cfg.ndcg_at_5_mean.toFixed(4)} <span className="text-[10px] text-slate-400 font-normal">± {cfg.ndcg_at_5_std.toFixed(4)}</span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono font-bold text-indigo-700">
                          {(cfg.precision_at_5_mean * 100).toFixed(1)}% <span className="text-[10px] text-slate-400 font-normal">± {(cfg.precision_at_5_std * 100).toFixed(1)}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expandable Table 7.9 LaTeX Code */}
            {showAblationLatexCode && ablationReport.latex_table && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    LaTeX Publication Source: Table 7.9 (Model Component Ablation Study)
                  </span>
                  <button
                    onClick={handleCopyAblationLatex}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedAblationLatex ? "Copied!" : "Copy LaTeX"}
                  </button>
                </div>
                <pre className="text-[11px] font-mono p-4 bg-slate-900/90 rounded-xl overflow-x-auto text-emerald-300 leading-relaxed border border-slate-800">
                  {ablationReport.latex_table}
                </pre>
              </div>
            )}
          </div>

          {/* Qualitative Edge-Case Deep Dives (Section 7.4.4) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-900 font-mono text-[10px] font-bold">
                  Section 7.4.4
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  {t.admin.edgeCasesTitle}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t.admin.edgeCasesSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {ablationReport.edge_case_deep_dives.map((ec: EdgeCaseDeepDive, idx: number) => {
                const labelBg = ec.human_consensus_label === 3 
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                  : ec.human_consensus_label === 2 
                  ? "bg-indigo-100 text-indigo-800 border-indigo-200" 
                  : ec.human_consensus_label === 1 
                  ? "bg-amber-100 text-amber-800 border-amber-200" 
                  : "bg-slate-100 text-slate-600 border-slate-200";

                return (
                  <div 
                    key={idx} 
                    className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between hover:bg-white transition-all shadow-sm"
                  >
                    <div className="space-y-3">
                      {/* Badge Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[11px] font-black">
                            {ec.case_id}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {ec.failure_mode}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${labelBg}`}>
                          Human Verdict: {ec.human_label_meaning}
                        </span>
                      </div>

                      {/* Job & Candidate Identity */}
                      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                        <p className="text-[11px] text-slate-500">
                          <strong className="text-slate-800">Target Role:</strong> {ec.job_id} &bull; {ec.job_title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <strong className="text-slate-800">Candidate:</strong> {ec.resume_id} &bull; {ec.candidate_title}
                        </p>
                      </div>

                      {/* Score Comparison Matrix */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1 font-mono">
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <p className="text-[9px] uppercase font-bold text-slate-400">TF-IDF</p>
                          <p className="font-extrabold text-slate-700 mt-0.5">{ec.pure_tfidf_score.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <p className="text-[9px] uppercase font-bold text-slate-400">SBERT</p>
                          <p className="font-extrabold text-indigo-700 mt-0.5">{ec.pure_sbert_score.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-slate-200">
                          <p className="text-[9px] uppercase font-bold text-slate-400">Skills</p>
                          <p className="font-extrabold text-amber-700 mt-0.5">{ec.pure_skills_score.toFixed(1)}%</p>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                          <p className="text-[9px] uppercase font-bold text-emerald-800">Hybrid</p>
                          <p className="font-black text-emerald-800 mt-0.5">{ec.hybrid_score.toFixed(1)}%</p>
                        </div>
                      </div>

                      {/* Quoted Snippet */}
                      <div className="p-3 rounded-xl bg-white/80 border border-slate-200 text-[11px] italic text-slate-600 line-clamp-3">
                        &ldquo;{ec.resume_snippet}&rdquo;
                      </div>
                    </div>

                    {/* Academic Architectural Analysis */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-950 leading-relaxed font-medium">
                      {ec.analysis}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CURRICULUM DISCRIMINATION EVALUATION (N=36)                         */}
      {/* ========================================================================= */}
      {activeTab === "discrimination" && report && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Track Selection Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 ps-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" /> {t.admin.filterTrack}
            </span>
            {KKU_TRACKS.map((tTrack) => (
              <button
                key={tTrack.id}
                onClick={() => setSelectedTrack(tTrack.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTrack === tTrack.id
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {tTrack.label}
              </button>
            ))}
          </div>

          {/* Dataset & Benchmark Scope Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" /> {report.dataset_name}
              </span>
              <span className="text-slate-300">•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                {format(t.admin.totalPairs, { count: report.total_samples })}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                {format(t.admin.targetProfiles, { count: report.relevant_samples })}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                {format(t.admin.negativeControls, { count: report.negative_control_samples })}
              </span>
            </div>

            <div className="text-slate-500 font-medium text-[11px]">
              {t.admin.academicFocus}
            </div>
          </div>

          {/* Primary Architectural Comparison Table (Table 7.1) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">Table 7.1</span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {t.admin.table71Title}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {t.admin.table71Subtitle}
                </p>
              </div>

              <button
                onClick={() => setShowLatexCode(!showLatexCode)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <Code className="w-3.5 h-3.5" />
                {showLatexCode ? t.admin.hideLatexCode : t.admin.viewPublicationLatex}
                {showLatexCode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3 px-3 text-start">{t.admin.modelArchitectureCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.relevantMeanCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.negativeMeanCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.discriminationMarginCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.latencyCol}</th>
                    <th className="py-3 px-3 text-start">{t.admin.groundingXaiCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {report.metrics.map((m: ModelMetric, idx: number) => {
                    const isHybrid = idx === 2;
                    const isSbert = idx === 1;
                    return (
                      <tr key={idx} className={`transition-colors ${isHybrid ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-50/80"}`}>
                        <td className="py-4 px-3">
                          <div>
                            <span className="font-extrabold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                              {isHybrid && <Award className="w-4 h-4 text-amber-500 shrink-0" />}
                              {m.model_name}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{m.description}</p>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-sm font-extrabold text-emerald-700">
                            {m.mean_score_relevant}%
                          </span>
                          <p className="text-[10px] text-slate-400">Target matches</p>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-sm font-extrabold text-slate-600">
                            {m.mean_score_negative}%
                          </span>
                          <p className="text-[10px] text-slate-400">Unrelated baselines</p>
                        </td>
                        <td className="py-4 px-3">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-sm border"
                            style={{
                              backgroundColor: isHybrid ? "#EEF2FF" : isSbert ? "#F0FDF4" : "#F8FAFC",
                              borderColor: isHybrid ? "#C7D2FE" : isSbert ? "#BBF7D0" : "#E2E8F0",
                              color: isHybrid ? "#3730A3" : isSbert ? "#166534" : "#475569"
                            }}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{m.discrimination_margin}%
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                            {isHybrid ? "Optimal Separation" : isSbert ? "Strong Separation" : "Keyword Fragile"}
                          </p>
                        </td>
                        <td className="py-4 px-3 font-mono text-slate-600 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold">{m.latency_ms} ms</span> / doc
                        </td>
                        <td className="py-4 px-3">
                          {isHybrid ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3.5 h-3.5" /> Triple Grounded (XAI)
                            </span>
                          ) : isSbert ? (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-bold flex items-center gap-1 w-fit">
                              <Zap className="w-3.5 h-3.5" /> Dense Semantic Vector
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold w-fit">
                              Lexical Exact Terms Only
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expandable LaTeX Code Box */}
            {showLatexCode && report.latex_table && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    LaTeX Tables: Table 7.1 (Model Comparison) & Table 7.2 (Track Breakdown)
                  </span>
                  <button
                    onClick={handleCopyLatex}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedLatex ? "Copied!" : "Copy LaTeX"}
                  </button>
                </div>
                <pre className="text-[11px] font-mono p-4 bg-slate-900/90 rounded-xl overflow-x-auto text-emerald-300 leading-relaxed border border-slate-800">
                  {report.latex_table}
                </pre>
              </div>
            )}
          </div>

          {/* Model Score Separation Visual Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {report.metrics.map((m: ModelMetric, idx: number) => {
              const isHybrid = idx === 2;
              return (
                <div 
                  key={idx} 
                  className={`p-6 rounded-3xl border shadow-sm space-y-5 transition-all ${
                    isHybrid 
                      ? "bg-gradient-to-b from-indigo-50/80 to-white border-indigo-200 ring-2 ring-indigo-500/20" 
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isHybrid && <Award className="w-4 h-4 text-indigo-600" />}
                        <h3 className="text-sm font-extrabold text-slate-900">{m.model_name}</h3>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{m.description}</p>
                    </div>
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl shrink-0 ${
                      isHybrid ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                    }`}>
                      Δ +{m.discrimination_margin}%
                    </span>
                  </div>

                  {/* Score Comparison Bars */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold text-[11px]">
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Target Matches Mean
                        </span>
                        <span className="text-emerald-700 font-extrabold">{m.mean_score_relevant}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, m.mean_score_relevant)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-bold text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <X className="w-3 h-3 text-rose-500" /> Negative Controls Mean
                        </span>
                        <span className="text-slate-600 font-extrabold">{m.mean_score_negative}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, m.mean_score_negative)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Statistical Details */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Latency</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{m.latency_ms} ms</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Min Score</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{m.score_distribution?.min ?? 0}%</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/50">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Max Score</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{m.score_distribution?.max ?? 100}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Track-by-Track Scoring Breakdown (Table 7.2) */}
          {report.track_breakdown && report.track_breakdown.length > 0 && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">Table 7.2</span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Mean Compatibility Scores by KKU Academic Track
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Demonstrating model robustness across core Computer Science specializations and clean rejection of negative control profiles.
              </p>

              <div className="overflow-x-auto mt-3">
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                      <th className="py-3 px-3 text-start">King Khalid University Track</th>
                      <th className="py-3 px-3 text-center">Benchmark Samples</th>
                      <th className="py-3 px-3 text-center">TF-IDF Mean</th>
                      <th className="py-3 px-3 text-center">Sentence-BERT Mean</th>
                      <th className="py-3 px-3 text-center">SmartCV Hybrid Mean</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {report.track_breakdown.map((t, idx) => {
                      const isNegative = t.track_name.includes("Negative");
                      return (
                        <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${isNegative ? "bg-rose-50/30" : ""}`}>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-slate-900">{t.track_name}</span>
                            {isNegative && (
                              <span className="ms-2 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                                Baseline Control
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-600">
                            {t.sample_count} pairs
                          </td>
                          <td className="py-3.5 px-3 text-center font-extrabold text-slate-700">
                            {t.tfidf_mean}%
                          </td>
                          <td className="py-3.5 px-3 text-center font-extrabold text-indigo-700">
                            {t.sbert_mean}%
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                              isNegative 
                                ? "bg-slate-100 text-slate-600" 
                                : "bg-indigo-100 text-indigo-900 border border-indigo-200"
                            }`}>
                              {t.hybrid_mean}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vocabulary Mismatch & Semantic Resilience Demonstration (RQ1 Case Studies) */}
          {report.case_studies && report.case_studies.length > 0 && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">RQ1 Case Studies</span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Vocabulary Mismatch Demonstration & Semantic Resilience
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Qualitative evidence demonstrating why keyword-only matching fails when equivalent concepts are phrased differently.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {report.case_studies.map((cs: QualitativeCaseStudy, idx: number) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[11px] font-extrabold">
                          {cs.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {cs.track}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-900">{cs.job_title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2">
                          &ldquo;{cs.resume_snippet}&rdquo;
                        </p>
                      </div>

                      {/* Comparative Scores Bar */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-500">TF-IDF (Lexical):</span>
                          <span className="font-bold text-slate-700">{cs.tfidf_score}%</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-500">Sentence-BERT (Semantic):</span>
                          <span className="font-bold text-indigo-700">{cs.sbert_score}%</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100">
                          <span className="font-bold text-indigo-950">SmartCV Hybrid:</span>
                          <span className="font-black text-emerald-600 text-xs">{cs.hybrid_score}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed font-medium">
                      {cs.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Answers to Project Research Questions (RQ1 - RQ4) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white shadow-xl space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                <Brain className="w-3.5 h-3.5" /> Project Chapter 7 Empirical Findings
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Answers to Project Research Questions (RQ1 – RQ4)
              </h2>
              <p className="text-xs text-slate-300">
                Grounding the B.Sc. graduation project defense in empirically gathered data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition-colors">
                <h3 className="font-extrabold text-amber-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs">RQ1</span>
                  Semantic Context vs. Lexical Sparsity
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Sentence-BERT consistently outperforms TF-IDF on candidate profiles with vocabulary mismatch (e.g., &ldquo;distributed microservices&rdquo; vs &ldquo;Backend Developer&rdquo;), elevating compatibility scores from <strong>15.6% to 75.3%</strong> and proving dense vector contextual resilience.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition-colors">
                <h3 className="font-extrabold text-emerald-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs">RQ2</span>
                  Skill Taxonomy Anchoring & Hallucination Prevention
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Integrating explicit rule-based skill taxonomy coverage (30% weight) prevents dense embedding semantic drift. It ensures that candidates missing mandatory technical requirements are penalised transparently regardless of stylistic prose.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition-colors">
                <h3 className="font-extrabold text-indigo-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs">RQ3</span>
                  Discrimination Margin & Friction Reduction
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  The SmartCV Hybrid model achieves an empirical discrimination margin of <strong>Δ = +55.4%</strong> between target matches (66.1%) and negative controls (10.8%), completely eliminating false acceptances while avoiding arbitrary classification thresholds.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 hover:bg-white/10 transition-colors">
                <h3 className="font-extrabold text-purple-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-xs">RQ4</span>
                  Computational Efficiency for Production Screening
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Inference latency averages <strong>18 milliseconds per document</strong> for the dense semantic model and <strong>2.2 milliseconds</strong> for TF-IDF. This enables real-time candidate ranking across hundreds of applicants within interactive UI response boundaries.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Thesis Chapter 7 Modal */}
      {showThesisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Chapter 7: PROJECT TESTING (EVALUATION)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Publication-ready graduation report text formatted for direct inclusion into SmartCV_Project 2.docx
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyThesis}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    copiedThesis 
                      ? "bg-emerald-600 text-white" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {copiedThesis ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  {copiedThesis ? "Copied to Clipboard!" : "Copy Full Chapter"}
                </button>
                <button
                  onClick={() => setShowThesisModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-800 leading-relaxed bg-slate-50/50 whitespace-pre-wrap select-text">
              {loadingThesis ? (
                <div className="py-20 text-center space-y-3">
                  <Brain className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="font-bold text-slate-600">Generating Thesis Chapter 7 Text...</p>
                </div>
              ) : (
                thesisText || report?.thesis_chapter_text || "No chapter text available."
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>Ready for copy-paste into Word / LaTeX thesis manuscript</span>
              <button
                onClick={() => setShowThesisModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
