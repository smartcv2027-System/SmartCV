"use client";

import React from "react";
import { MatchResultDetail } from "@/lib/api";
import { ScoreGauge } from "./ScoreGauge";
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Brain, 
  Sparkles, 
  Layers, 
  Quote, 
  Info,
  Printer
} from "lucide-react";

interface ExplanationModalProps {
  result: MatchResultDetail | null;
  onClose: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:static print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:border-none print:w-full">
        
        {/* Printable Academic Header (Visible on print only) */}
        <div className="hidden print:block p-6 border-b-2 border-slate-900 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                King Khalid University
              </h1>
              <p className="text-xs text-slate-600 font-semibold">
                College of Computer Science • Department of Informatics & Computer Systems
              </p>
              <p className="text-sm font-bold text-indigo-700 mt-1">
                SmartCV: Candidate Screening & Evaluation Dossier
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Generated: {new Date().toLocaleDateString()}</p>
              <p className="font-bold text-slate-800">Status: {result.recommendation_status}</p>
            </div>
          </div>
        </div>

        {/* Modal Header (Screen view) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">{result.candidate_name}</h3>
                <span className="text-xs text-slate-500 font-medium">• Rank #{result.rank_position || 1}</span>
              </div>
              <p className="text-xs text-slate-500">Evaluation for: <span className="font-semibold text-slate-700">{result.job_title}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              title="Print or export candidate dossier as PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Dossier</span>
            </button>
            <ScoreGauge score={result.compatibility_score} size="md" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 print:overflow-visible print:p-0">
          
          {/* Candidate Profile Details (Print view) */}
          <div className="hidden print:grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500">Candidate Name:</p>
              <p className="text-sm font-black text-slate-900">{result.candidate_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Target Position:</p>
              <p className="text-sm font-black text-slate-900">{result.job_title}</p>
            </div>
            <div>
              <p className="text-slate-500">Overall Compatibility Score:</p>
              <p className="text-lg font-black text-indigo-700">{result.compatibility_score}% ({result.recommendation_status})</p>
            </div>
            <div>
              <p className="text-slate-500">Screening Pipeline:</p>
              <p className="text-xs font-bold text-slate-800">Two-Layer Hybrid (SBERT 50% + TF-IDF 20% + Skills 30%)</p>
            </div>
          </div>

          {/* Transparent Score Breakdown Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 print:text-slate-900">
              <Layers className="w-4 h-4 text-brand-600 print:hidden" />
              Transparent Scoring Breakdown (Two-Layer Model)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              {/* Layer 2: SBERT */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white print:border-slate-300 print:bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1 print:text-slate-900">
                    <Brain className="w-3.5 h-3.5 text-indigo-600 print:hidden" /> Layer 2: Semantic (S-BERT)
                  </span>
                  <span className="text-sm font-extrabold text-indigo-600 print:text-slate-900">{result.bert_score}%</span>
                </div>
                <div className="w-full bg-indigo-100 h-2 rounded-full overflow-hidden mb-2 print:hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${result.bert_score}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sentence-BERT contextual embedding alignment (Weight: 50%).
                </p>
              </div>

              {/* Layer 1: TF-IDF */}
              <div className="p-4 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white print:border-slate-300 print:bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1 print:text-slate-900">
                    <FileText className="w-3.5 h-3.5 text-sky-600 print:hidden" /> Layer 1: Lexical (TF-IDF)
                  </span>
                  <span className="text-sm font-extrabold text-sky-600 print:text-slate-900">{result.tfidf_score}%</span>
                </div>
                <div className="w-full bg-sky-100 h-2 rounded-full overflow-hidden mb-2 print:hidden">
                  <div className="bg-sky-600 h-full rounded-full" style={{ width: `${result.tfidf_score}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Keyword term-frequency cosine similarity (Weight: 20%).
                </p>
              </div>

              {/* Skill Match Overlap */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white print:border-slate-300 print:bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1 print:text-slate-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 print:hidden" /> Skill Overlap
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600 print:text-slate-900">
                    {result.matched_skills.length} / {result.matched_skills.length + result.missing_skills.length}
                  </span>
                </div>
                <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden mb-2 print:hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full" 
                    style={{ 
                      width: `${(result.matched_skills.length / Math.max(1, result.matched_skills.length + result.missing_skills.length)) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Target job requirements explicitly verified (Weight: 30%).
                </p>
              </div>
            </div>
          </div>

          {/* AI Justification & Score Reason */}
          {result.explanation && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h5 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5 print:text-slate-900">
                <Info className="w-4 h-4 text-brand-600 print:hidden" />
                Explainable AI Summary
              </h5>
              <p className="text-xs text-slate-700 leading-relaxed font-medium mb-2">
                {result.explanation.explanation_text}
              </p>
              {result.explanation.score_reason && (
                <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200/60">
                  {result.explanation.score_reason}
                </p>
              )}
            </div>
          )}

          {/* Matched Skills with Resume Evidence Snippets */}
          <div>
            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5 print:text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 print:hidden" />
              Verified Matched Skills ({result.matched_skills.length})
            </h4>

            {result.matched_skills.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No specific skill matches detected.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.matched_skills.map((ms, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 print:bg-white print:border-slate-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded-md print:bg-slate-100 print:text-slate-900">
                        {ms.skill_name}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold uppercase print:text-slate-600">
                        {ms.skill_type} • +{ms.contribution_score} pt
                      </span>
                    </div>
                    {ms.evidence_text && (
                      <p className="text-[11px] text-slate-600 flex items-start gap-1">
                        <Quote className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5 print:hidden" />
                        <span className="italic line-clamp-2 print:line-clamp-none">"{ms.evidence_text}"</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missing Skills & Gap Analysis */}
          <div>
            <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-1.5 print:text-slate-900">
              <AlertCircle className="w-4 h-4 text-rose-600 print:hidden" />
              Skill Gaps / Missing Requirements ({result.missing_skills.length})
            </h4>

            {result.missing_skills.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium">All requested job skills are present in the candidate profile!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.missing_skills.map((ms, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 print:bg-white print:border-slate-300">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-rose-900 bg-rose-100/80 px-2 py-0.5 rounded-md print:bg-slate-100 print:text-slate-900">
                        {ms.skill_name}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        ms.requirement_type === "required" ? "bg-rose-200 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {ms.requirement_type}
                      </span>
                    </div>
                    {ms.improvement_note && (
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {ms.improvement_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transparency & Audit Compliance Note */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Algorithmic Transparency & Fairness Statement:</p>
            <p>
              SmartCV employs unsupervised Information Extraction (NLP) and Sentence-BERT semantic representation. No demographic attributes (gender, age, nationality) are utilized in ranking computation. All ratings are derived strictly from verifiable skill overlap and dense semantic context matching against job requirements.
            </p>
          </div>

        </div>

        {/* Modal Footer (Screen view) */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/80 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print / Save Dossier PDF</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            Close Explanation
          </button>
        </div>

      </div>
    </div>
  );
};
