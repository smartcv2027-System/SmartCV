"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, AuditLog } from "@/lib/api";
import { 
  ShieldCheck, 
  ArrowLeft, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity,
  Layers
} from "lucide-react";
import { useLanguage, format } from "@/lib/i18n";

export default function AuditLogsPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterAction, setFilterAction] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [filterAction]);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(filterAction || undefined);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" /> {t.common.back}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{t.admin.auditExplorerTitle}</h1>
            <p className="text-xs text-slate-500">
              {t.admin.auditExplorerDesc}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
              {format(t.admin.recordedEventsCount, { count: logs.length })}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.admin.searchAuditPlaceholder}
            className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-500 bg-white font-medium"
          >
            <option value="">{t.admin.allActionTypes}</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="USER_REGISTERED">USER_REGISTERED</option>
            <option value="MATCHING_EXECUTED">MATCHING_EXECUTED</option>
            <option value="JOB_APPLICATION_SUBMITTED">JOB_APPLICATION_SUBMITTED</option>
            <option value="JOB_APPLICATION_STATUS_UPDATED">JOB_APPLICATION_STATUS_UPDATED</option>
            <option value="JOB_APPLICATION_WITHDRAWN">JOB_APPLICATION_WITHDRAWN</option>
            <option value="RESUME_UPLOADED">RESUME_UPLOADED</option>
            <option value="RESUME_REPARSED">RESUME_REPARSED</option>
            <option value="RESUMES_REPARSED_ALL">RESUMES_REPARSED_ALL</option>
            <option value="RESUME_DELETED">RESUME_DELETED</option>
            <option value="JOB_CREATED">JOB_CREATED</option>
            <option value="JOB_CREATED_FROM_FILE">JOB_CREATED_FROM_FILE</option>
            <option value="JOB_FILE_REPLACED">JOB_FILE_REPLACED</option>
            <option value="JOB_DELETED">JOB_DELETED</option>
            <option value="SKILL_ADDED">SKILL_ADDED</option>
            <option value="SKILL_UPDATED">SKILL_UPDATED</option>
            <option value="SKILL_DELETED">SKILL_DELETED</option>
            <option value="DATABASE_SEEDED_MULTI_TRACK">DATABASE_SEEDED_MULTI_TRACK</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-6 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 text-start">{t.admin.logIdHeader}</th>
                <th className="py-3 px-3 text-start">{t.admin.timestampHeader}</th>
                <th className="py-3 px-3 text-start">{t.admin.actionHeader}</th>
                <th className="py-3 px-3 text-start">{t.admin.triggeredByHeader}</th>
                <th className="py-3 px-3 text-start">{t.admin.entityHeader}</th>
                <th className="py-3 px-3 text-start">{t.admin.detailsHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-500">#{log.log_id}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-medium">
                    <span dir="ltr">{new Date(log.created_at).toLocaleString()}</span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-purple-700">
                    <span className="bg-purple-50 text-purple-800 text-[10px] px-2 py-0.5 rounded-md border border-purple-200">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-800"><bdi>{log.user_name}</bdi></td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">{log.entity_name || "-"}</td>
                  <td className="py-3.5 px-3 text-slate-700 max-w-md">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
