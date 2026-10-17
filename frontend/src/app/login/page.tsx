"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, getLocalizedError } from "@/lib/i18n";
import { Brain, Lock, User, ArrowRight, UserCheck, ShieldCheck, Briefcase } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, switchPersona, isLoading } = useAuth();
  const { t } = useLanguage();
  
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(usernameOrEmail, password);
      router.push("/");
    } catch (err: any) {
      setError(getLocalizedError(err, t));
    }
  };

  const handleQuickLogin = async (role: "recruiter" | "applicant" | "admin") => {
    setError(null);
    try {
      await switchPersona(role);
      if (role === "recruiter") router.push("/recruiter");
      else if (role === "applicant") router.push("/applicant");
      else router.push("/admin");
    } catch (err: any) {
      setError(getLocalizedError(err, t));
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
          <Brain className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">{t.auth.signInTitle}</h2>
        <p className="text-xs text-slate-500">{t.auth.signInSubtitle}</p>
      </div>

      {/* Demo Quick Logins */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-center">
          {t.auth.demoQuickLogin}
        </span>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => handleQuickLogin("recruiter")}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-brand-50 border border-slate-200 hover:border-brand-300 text-xs font-bold text-slate-800 flex items-center justify-between transition-all shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-brand-600" />
              <div className="text-start">
                <p className="leading-tight">
                  <bdi>Ghadi Mohammed Ali Asiri</bdi>
                </p>
                <p className="text-[10px] text-slate-500 font-normal">
                  <span dir="ltr">@ghadi_recruiter</span> &bull; {t.auth.loginAsRecruiter}
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
          </button>

          <button
            onClick={() => handleQuickLogin("applicant")}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-800 flex items-center justify-between transition-all shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <div className="text-start">
                <p className="leading-tight">
                  <bdi>Reema Yahya Alfaifi</bdi>
                </p>
                <p className="text-[10px] text-slate-500 font-normal">
                  <span dir="ltr">@reema_applicant</span> &bull; {t.auth.loginAsApplicant}
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
          </button>

          <button
            onClick={() => handleQuickLogin("admin")}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-xs font-bold text-slate-800 flex items-center justify-between transition-all shadow-xs group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <div className="text-start">
                <p className="leading-tight">
                  <bdi>Raneem Khalid Alzhrani</bdi>
                </p>
                <p className="text-[10px] text-slate-500 font-normal">
                  <span dir="ltr">@raneem_admin</span> &bull; {t.auth.loginAsAdmin}
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Manual Login Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass-card border border-slate-200 space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">{t.auth.usernameOrEmail}</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder={t.auth.usernamePlaceholder}
              required
              className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">{t.auth.password}</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.auth.passwordPlaceholder}
              required
              className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? t.auth.signingIn : t.auth.signInAction}
        </button>

        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            {t.auth.noAccount}{" "}
            <Link href="/register" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
              {t.auth.registerLink}
            </Link>
          </p>
        </div>
      </form>

    </div>
  );
}
