"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, AuditLog } from "@/lib/api";
import { 
  ShieldCheck, 
  Users, 
  Briefcase, 
  FileText, 
  Sparkles, 
  Brain, 
  ArrowRight, 
  Activity,
  CheckCircle2,
  Clock,
  Layers
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, logsData] = await Promise.all([
          api.getStats(),
          api.getAuditLogs()
        ]);
        setStats(statsData);
        setRecentLogs(logsData.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      
      {/* Header Banner (Figure 5.2.1.8) */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Technical Administration & Governance
          </div>
          <h1 className="text-2xl font-black">Admin Review Panel (Laila)</h1>
          <p className="text-xs text-purple-200">
            System health monitoring, audit log traceability, skills taxonomy governance, and ML benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/evaluation"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
          >
            <Brain className="w-4 h-4" /> Run ML Benchmark
          </Link>
        </div>
      </div>

      {/* Stats KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
          <h3 className="text-2xl font-black text-slate-900">{stats?.total_users || 0}</h3>
          <p className="text-[10px] text-slate-500">{stats?.recruiters || 0} Recruiters, {stats?.applicants || 0} Candidates</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Job Openings</p>
          <h3 className="text-2xl font-black text-slate-900">{stats?.total_jobs || 0}</h3>
          <p className="text-[10px] text-indigo-600 font-medium">Active screening targets</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Screened Resumes</p>
          <h3 className="text-2xl font-black text-slate-900">{stats?.total_resumes || 0}</h3>
          <p className="text-[10px] text-emerald-600 font-medium">{stats?.total_matches || 0} total evaluations</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Skills Taxonomy</p>
          <h3 className="text-2xl font-black text-slate-900">{stats?.total_skills || 0}</h3>
          <p className="text-[10px] text-purple-600 font-medium">Active competencies</p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/audit-logs"
          className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5 text-brand-600" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">
            Audit Log Explorer
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Inspect all system operations, resume uploads, candidate rankings, and access events for traceability.
          </p>
          <span className="text-xs font-bold text-brand-600 inline-flex items-center gap-1">
            View Audit Trail <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <Link
          href="/admin/skills"
          className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
            Skills Taxonomy Manager
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Add, update, or categorize skills across Technical, Soft, Tool, and Domain categories.
          </p>
          <span className="text-xs font-bold text-purple-600 inline-flex items-center gap-1">
            Manage Skills <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>

        <Link
          href="/admin/evaluation"
          className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Model Evaluation & Benchmarks
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Compare TF-IDF baseline vs Sentence-BERT semantic model vs SmartCV Hybrid accuracy and confusion matrices.
          </p>
          <span className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1">
            Run Benchmark <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </Link>
      </div>

      {/* Recent System Events (Figure 5.2.1.8) */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Recent System Audit Events</h2>
            <p className="text-xs text-slate-500">Live operational events logged in PostgreSQL.</p>
          </div>
          <Link href="/admin/audit-logs" className="text-xs font-bold text-purple-600 hover:text-purple-800">
            All Logs →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentLogs.map((log) => (
            <div key={log.log_id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0"></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{log.action_type}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{log.user_name}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{log.description}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
