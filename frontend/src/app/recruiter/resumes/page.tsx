"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api, Resume } from "@/lib/api";
import {
  Users,
  FileText,
  Sparkles,
  User,
  Clock,
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

export default function CandidatePoolPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reparsingId, setReparsingId] = useState<number | null>(null);
  const [reparsingAll, setReparsingAll] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
        text: `Successfully re-extracted skills across ${res.updated_count} candidate resumes!`,
        type: "success",
      });
      await loadResumes();
    } catch (err: any) {
      console.error("Failed to reparse all resumes:", err);
      setActionMessage({
        text: err.message || "Failed to re-extract skills across candidate resumes.",
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
        text: `Re-extracted ${updated.skills?.length || 0} skills for candidate "${updated.candidate_name || '#' + updated.candidate_id}"!`,
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
      const data = await api.getResumes();
      setResumes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Get top skills across all resumes for quick filtering
  const allSkills = useMemo(() => {
    const skillMap = new Map<string, number>();
    resumes.forEach(r => {
      r.skills?.forEach(s => {
        const name = s.skill_name;
        skillMap.set(name, (skillMap.get(name) || 0) + 1);
      });
    });
    return Array.from(skillMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }, [resumes]);

  // Filtered resumes
  const filteredResumes = useMemo(() => {
    return resumes.filter(r => {
      const matchesSearch =
        !searchQuery ||
        (r.candidate_name && r.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.resume_title && r.resume_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.skills?.some(s => s.skill_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSkill =
        !selectedSkillFilter ||
        r.skills?.some(s => s.skill_name.toLowerCase() === selectedSkillFilter.toLowerCase());

      return matchesSearch && matchesSkill;
    });
  }, [resumes, searchQuery, selectedSkillFilter]);

  const totalSkillsCount = useMemo(() => {
    const set = new Set<string>();
    resumes.forEach(r => r.skills?.forEach(s => set.add(s.skill_name.toLowerCase())));
    return set.size;
  }, [resumes]);

  return (
    <div className="space-y-8">

      {/* Page Title & System Role Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            Candidate Talent Pool
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and review candidate profiles and resumes submitted via the Applicant Portal with automatic NLP skill extraction.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleReparseAll}
            disabled={reparsingAll}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-all disabled:opacity-60"
            title="Re-run structural verification & hybrid NLP skill extraction across all candidate resumes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reparsingAll ? "animate-spin text-brand-600" : "text-slate-500"}`} />
            <span>{reparsingAll ? "Extracting..." : "Re-extract All Skills"}</span>
          </button>
          <Link
            href="/recruiter"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
          >
            <Briefcase className="w-4 h-4" />
            <span>Screen Against Jobs</span>
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
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700 text-base font-bold ml-3">
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
            Candidate Self-Submission Model
          </p>
          <p className="text-blue-700 leading-relaxed">
            Per system access rules, resumes are uploaded directly by applicants through their student/applicant portal. Recruiters have read-only access to browse profiles, inspect parsed NLP tokens and extracted skills, and run XAI screening algorithms.
          </p>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{resumes.length}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Candidates</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {resumes.filter(r => r.parsed_status?.toLowerCase() === "parsed").length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">NLP Parsed Resumes</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalSkillsCount}</div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Extracted Skills Mapped</div>
          </div>
        </div>
      </div>

      {/* Candidate Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, resume title, or skill (e.g. Python, Docker)..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedSkillFilter && (
            <button
              onClick={() => setSelectedSkillFilter(null)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <span>Filtered: <strong className="text-brand-700">{selectedSkillFilter}</strong></span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Top Skill Filter Pills */}
        {allSkills.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Quick Filter:
            </span>
            {allSkills.map((skill) => (
              <button
                key={skill}
                onClick={() => setSelectedSkillFilter(selectedSkillFilter === skill ? null : skill)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${selectedSkillFilter === skill
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Candidate Pool Table */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            Candidate Profiles ({filteredResumes.length})
          </h2>
          <span className="text-xs text-slate-400 font-medium">Automatic NLP tokenization & skill taxonomy matching</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading candidate pool...
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No candidates found matching your criteria</p>
            <p className="text-[11px] text-slate-400">Try clearing filters or search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Candidate</th>
                  <th className="py-3 px-3">Resume Document</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Extracted Skills</th>
                  <th className="py-3 px-3">Submission Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResumes.map((res) => (
                  <tr key={res.resume_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div>{res.candidate_name || `Candidate #${res.candidate_id}`}</div>
                          <div className="text-[10px] text-slate-400 font-normal">ID: #{res.candidate_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{res.resume_title || "resume.pdf"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 uppercase">
                        {res.parsed_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {res.skills && res.skills.slice(0, 4).map((s) => (
                          <span
                            key={s.candidate_skill_id}
                            onClick={() => setSelectedSkillFilter(s.skill_name)}
                            className="cursor-pointer bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors"
                            title={s.evidence_text ? `Confidence: ${Math.round((s.confidence_score ?? 1.0) * 100)}% • Evidence: "${s.evidence_text}"` : `Confidence: ${Math.round((s.confidence_score ?? 1.0) * 100)}%`}
                          >
                            {s.skill_name}
                          </span>
                        ))}
                        {res.skills && res.skills.length > 4 && (
                          <span className="text-[10px] text-slate-400">+{res.skills.length - 4} more</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                      {res.created_at ? new Date(res.created_at).toLocaleDateString() : "Recent"}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReparseSingle(res.resume_id)}
                          disabled={reparsingId === res.resume_id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                          title="Re-run NLP skill extraction with open-domain sections"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${reparsingId === res.resume_id ? "animate-spin text-purple-600" : "text-slate-500"}`} />
                          <span className="hidden xl:inline">{reparsingId === res.resume_id ? "Extracting..." : "Re-extract"}</span>
                        </button>
                        <button
                          onClick={() => handleDownload(res.resume_id, res.resume_title)}
                          disabled={downloadingId === res.resume_id}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                          title="Download original CV document"
                        >
                          <Download className={`w-3.5 h-3.5 ${downloadingId === res.resume_id ? "animate-bounce text-brand-600" : ""}`} />
                          <span className="hidden lg:inline">Download</span>
                        </button>
                        <button
                          onClick={() => setSelectedResume(res)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <Link
                          href={`/recruiter?candidate_id=${res.candidate_id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <span>Screen</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Candidate Profile & Raw Text Modal */}
      {selectedResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedResume.candidate_name || `Candidate #${selectedResume.candidate_id}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Document: {selectedResume.resume_title || "resume.pdf"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReparseSingle(selectedResume.resume_id)}
                  disabled={reparsingId === selectedResume.resume_id}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all border border-purple-200 disabled:opacity-60"
                  title="Re-run structural verification and open-domain skill extraction"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reparsingId === selectedResume.resume_id ? "animate-spin text-purple-600" : ""}`} />
                  <span>{reparsingId === selectedResume.resume_id ? "Re-extracting..." : "Re-extract Skills"}</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedResume.resume_id, selectedResume.resume_title)}
                  disabled={downloadingId === selectedResume.resume_id}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Download authentic CV file"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === selectedResume.resume_id ? "animate-bounce text-brand-600" : ""}`} />
                  <span>{downloadingId === selectedResume.resume_id ? "Downloading..." : "Download CV"}</span>
                </button>
                <button
                  onClick={() => setSelectedResume(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
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
                    Extracted Skills & Context Evidence ({selectedResume.skills?.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Confidence scored via NLP</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {selectedResume.skills && selectedResume.skills.length > 0 ? (
                    selectedResume.skills.map((s) => (
                      <div
                        key={s.candidate_skill_id}
                        className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200 hover:border-brand-300 transition-all flex flex-col justify-between gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{s.skill_name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                            {Math.round((s.confidence_score ?? 1.0) * 100)}% Match
                          </span>
                        </div>
                        {s.evidence_text ? (
                          <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded-lg border border-slate-100 font-mono italic leading-relaxed">
                            "{s.evidence_text}"
                          </p>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Extracted via canonical taxonomy</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic col-span-2">No skills extracted yet</span>
                  )}
                </div>
              </div>

              {/* Parsed Raw Text */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Parsed Text Content
                </span>
                <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {selectedResume.raw_text || "No text available."}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedResume.resume_id, selectedResume.resume_title)}
                  disabled={downloadingId === selectedResume.resume_id}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === selectedResume.resume_id ? "animate-bounce text-brand-600" : "text-slate-500"}`} />
                  <span>{downloadingId === selectedResume.resume_id ? "Downloading..." : "Download File"}</span>
                </button>
                <Link
                  href={`/recruiter?candidate_id=${selectedResume.candidate_id}`}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-brand-500/20"
                >
                  <span>Screen Candidate</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <button
                onClick={() => setSelectedResume(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
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
