"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api, Job, Resume, JobRankingSummary, MatchResultDetail } from "@/lib/api";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ExplanationModal } from "@/components/ExplanationModal";
import { 
  Briefcase, 
  FileText, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  PlusCircle, 
  UploadCloud, 
  CheckCircle2,
  TrendingUp,
  Brain,
  Award
} from "lucide-react";

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [rankingsMap, setRankingsMap] = useState<Record<number, JobRankingSummary>>({});
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedResult, setSelectedResult] = useState<MatchResultDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [jobsData, resumesData] = await Promise.all([
          api.getJobs(),
          api.getResumes()
        ]);
        setJobs(jobsData);
        setResumes(resumesData);

        if (jobsData.length > 0) {
          setSelectedJobId(jobsData[0].job_id);

          // Fetch rankings across all active jobs in parallel for true top match computation
          const settled = await Promise.allSettled(
            jobsData.map((j) => api.getJobRanking(j.job_id))
          );
          const map: Record<number, JobRankingSummary> = {};
          settled.forEach((res) => {
            if (res.status === "fulfilled" && res.value) {
              map[res.value.job_id] = res.value;
            }
          });
          setRankingsMap(map);
        }
      } catch (err) {
        console.error("Failed to load recruiter dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute the absolute highest candidate match achieved across ALL active jobs
  const overallTopMatch = useMemo<MatchResultDetail | null>(() => {
    let best: MatchResultDetail | null = null;
    Object.values(rankingsMap).forEach((summary) => {
      if (summary.results && summary.results.length > 0) {
        const top = summary.results[0];
        if (!best || top.compatibility_score > best.compatibility_score) {
          best = top;
        }
      }
    });
    return best;
  }, [rankingsMap]);

  // Selected job entity and its ranking results
  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.job_id === selectedJobId) || (jobs.length > 0 ? jobs[0] : null);
  }, [jobs, selectedJobId]);

  const currentRanking = useMemo(() => {
    return selectedJobId ? rankingsMap[selectedJobId] : null;
  }, [rankingsMap, selectedJobId]);

  const currentMatches = currentRanking?.results || [];

  return (
    <div className="space-y-8">
      
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Recruiter Control Center
          </div>
          <h1 className="text-2xl font-black">Recruiter Dashboard (Sarah)</h1>
          <p className="text-xs text-slate-300">
            Screen candidates with transparent two-layer AI scoring & NLP explainability.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/recruiter/resumes"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all border border-white/10"
          >
            <UploadCloud className="w-4 h-4" /> View Candidate Pool
          </Link>
          <Link
            href="/recruiter/jobs"
            className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-brand-500/20"
          >
            <PlusCircle className="w-4 h-4" /> Post New Job
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards (Figure 5.2.1.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate Resumes</p>
            <h3 className="text-3xl font-extrabold text-slate-900">{resumes.length}</h3>
            <p className="text-[11px] text-emerald-600 font-medium">Ready for semantic screening</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Job Posts</p>
            <h3 className="text-3xl font-extrabold text-slate-900">{jobs.length}</h3>
            <p className="text-[11px] text-indigo-600 font-medium">Tagged with skill taxonomies</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* Dynamic & Contextual Top Match Score Card */}
        <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1 max-w-[calc(100%-3.5rem)]">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Match Score</p>
              {overallTopMatch && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-600" />
                  Top Match
                </span>
              )}
            </div>
            <h3 className="text-3xl font-extrabold text-emerald-600">
              {overallTopMatch ? `${Math.round(overallTopMatch.compatibility_score)}%` : "--"}
            </h3>
            {overallTopMatch ? (
              <div className="space-y-0.5">
                <p className="text-[11px] text-slate-600 font-medium truncate" title={`${overallTopMatch.candidate_name} • ${overallTopMatch.job_title}`}>
                  <span className="font-bold text-slate-900">{overallTopMatch.candidate_name}</span>
                  <span className="text-slate-400 mx-1">•</span>
                  <span className="text-slate-500">{overallTopMatch.job_title}</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  S-BERT: {Math.round(overallTopMatch.bert_score)}% • TF-IDF: {Math.round(overallTopMatch.tfidf_score)}%
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium">No candidate screenings yet</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Jobs & Quick Matching Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Active Job Postings & Match Rankings</h2>
            <p className="text-xs text-slate-500">Select a target job description to screen candidate resumes.</p>
          </div>
          <Link
            href="/recruiter/jobs"
            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
          >
            Manage All Jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div key={job.job_id} className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-extrabold text-slate-900">{job.job_title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {job.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {job.job_summary || job.raw_job_text}
                </p>

                {/* Skills Chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.skills.slice(0, 5).map((s) => (
                    <span
                      key={s.job_skill_id}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        s.requirement_type === "required"
                          ? "bg-slate-100 text-slate-800 border border-slate-200"
                          : "bg-brand-50 text-brand-700 border border-brand-100"
                      }`}
                    >
                      {s.skill_name}
                    </span>
                  ))}
                  {job.skills.length > 5 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md text-slate-400 font-medium">
                      +{job.skills.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{job.location}</span>
                <Link
                  href={`/recruiter/matching/${job.job_id}`}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Brain className="w-3.5 h-3.5 text-brand-400" />
                  Run Matching & Rankings
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screened Candidate Rankings with Interactive Job Selector */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Candidate Rankings</span>
              {selectedJob && currentMatches.length > 0 && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {currentMatches.length} Screened
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Automated screening results with Explainable AI justifications for target opening.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Interactive Job Selector Dropdown */}
            {jobs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="dashboard-job-select" className="text-xs font-bold text-slate-500 shrink-0">
                  Target Job:
                </label>
                <select
                  id="dashboard-job-select"
                  value={selectedJobId || ""}
                  onChange={(e) => setSelectedJobId(Number(e.target.value))}
                  className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm max-w-[240px] truncate"
                >
                  {jobs.map((j) => (
                    <option key={j.job_id} value={j.job_id}>
                      {j.job_title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedJob && (
              <Link
                href={`/recruiter/matching/${selectedJob.job_id}`}
                className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-brand-500/20 transition-all shrink-0"
              >
                <Brain className="w-3.5 h-3.5 text-white" />
                <span>Full Ranking & Tuning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Quick Switch Job Pills */}
        {jobs.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Quick Filter:
            </span>
            {jobs.map((j) => (
              <button
                key={j.job_id}
                onClick={() => setSelectedJobId(j.job_id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 ${
                  selectedJobId === j.job_id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {j.job_title}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading candidate rankings...
          </div>
        ) : currentMatches.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <Brain className="w-8 h-8 text-slate-300 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-700">
                No screening runs recorded yet for "{selectedJob?.job_title}"
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Run two-layer AI matching to rank candidate resumes against this job's competencies.
              </p>
            </div>
            {selectedJob && (
              <Link
                href={`/recruiter/matching/${selectedJob.job_id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run AI Screening Now</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Compatibility</th>
                  <th className="py-3 px-3">SBERT Semantic</th>
                  <th className="py-3 px-3">TF-IDF Lexical</th>
                  <th className="py-3 px-3">Matched Skills</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentMatches.map((res) => (
                  <tr key={res.result_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">#{res.rank_position || 1}</td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">{res.candidate_name}</td>
                    <td className="py-3.5 px-3">
                      <ScoreGauge score={res.compatibility_score} size="sm" />
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-indigo-600">{Math.round(res.bert_score)}%</td>
                    <td className="py-3.5 px-3 font-semibold text-sky-600">{Math.round(res.tfidf_score)}%</td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {res.matched_skills.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                            {s.skill_name}
                          </span>
                        ))}
                        {res.matched_skills.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{res.matched_skills.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedResult(res)}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-all"
                      >
                        Explain Score
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      <ExplanationModal
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />

    </div>
  );
}

