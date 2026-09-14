"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, MatchResultDetail } from "@/lib/api";
import { ScoreGauge } from "@/components/ScoreGauge";
import { 
  Lightbulb, 
  ArrowLeft, 
  BookOpen, 
  Code, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  FileCheck,
  GraduationCap
} from "lucide-react";

export default function ApplicantFeedbackPage() {
  const params = useParams();
  const resultId = Number(params?.resultId);

  const [result, setResult] = useState<MatchResultDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (resultId) {
      loadData();
    }
  }, [resultId]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.getMatchResult(resultId);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-xs text-slate-500 font-bold">
        Loading personalized feedback...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-xs text-slate-500 font-bold">Feedback record not found.</p>
        <Link href="/applicant" className="text-xs font-bold text-brand-600">Return to Portal</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Back Link */}
      <div>
        <Link
          href="/applicant"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Applications
        </Link>
      </div>

      {/* Header Banner (Figure 5.2.1.7) */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Explainable AI Feedback Report
            </div>
            <h1 className="text-2xl font-black">{result.candidate_name}</h1>
            <p className="text-xs text-emerald-100">
              Evaluation for: <span className="font-bold text-white">{result.job_title}</span>
            </p>
          </div>
          <ScoreGauge score={result.compatibility_score} size="lg" />
        </div>

        {result.feedback && (
          <p className="text-xs text-emerald-50 leading-relaxed font-medium bg-white/10 p-4 rounded-2xl border border-white/10">
            {result.feedback.feedback_text}
          </p>
        )}
      </div>

      {/* Actionable Improvement Items */}
      {result.feedback?.improvement_items && (
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-extrabold text-slate-900">High-Impact Improvement Areas</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {result.feedback.improvement_items.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/80 flex items-start gap-3">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0 mt-0.5 ${
                  item.priority === "High"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : item.priority === "Medium"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-brand-100 text-brand-700 border border-brand-200"
                }`}>
                  {item.priority} Priority
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.category}</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Skill Recommendations (Courses, Projects, Certifications) */}
      {result.feedback?.missing_skill_recommendations && result.feedback.missing_skill_recommendations.length > 0 && (
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-slate-900">
                Tailored Skill Development Recommendations ({result.feedback.missing_skill_recommendations.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">To qualify for future openings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.feedback.missing_skill_recommendations.map((rec, idx) => (
              <div key={idx} className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-emerald-900">{rec.skill_name}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {rec.requirement_type}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Recommended Course:</strong> {rec.recommended_course}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <Code className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Suggested Project:</strong> {rec.suggested_project}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <Award className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Target Certification:</strong> {rec.certification}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Strengths Recap */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Verified Strengths in This Evaluation ({result.matched_skills.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {result.matched_skills.map((s, idx) => (
            <span key={idx} className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              {s.skill_name}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
