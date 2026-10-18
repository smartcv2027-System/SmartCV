"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, getRoleLabel } from "@/lib/i18n";
import { 
  Briefcase, 
  Users, 
  Brain, 
  ShieldCheck, 
  Sliders, 
  Activity, 
  UserCircle, 
  Sparkles, 
  LogOut,
  LogIn,
  UserPlus,
  Home,
  Menu,
  X,
  ChevronRight,
  Languages
} from "lucide-react";
import { useConfirm } from "@/lib/confirm-context";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { confirm } = useConfirm();
  const { language, dir, toggleLanguage, t, format } = useLanguage();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({
      title: t.confirm.signOutTitle,
      message: format(t.confirm.signOutMessage, { name: user?.full_name || "" }),
      confirmText: t.confirm.signOutConfirm,
      cancelText: t.confirm.signOutCancel,
      variant: "warning",
    });
    if (ok) {
      logout();
      setIsDrawerOpen(false);
    }
  };

  // Close drawer automatically on route navigation
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Lock background body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-brand-800 to-indigo-600 bg-clip-text text-transparent">
                      {t.nav.brandName}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                      {t.nav.brandTag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">{t.nav.brandSubtitle}</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links based on Role */}
            <nav className="hidden md:flex items-center gap-1.5">
              {user?.role_type === "recruiter" && (
                <>
                  <Link
                    href="/recruiter"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/recruiter") && !isActive("/recruiter/jobs") && !isActive("/recruiter/resumes")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    {t.nav.recruiterWorkspace}
                  </Link>
                  <Link
                    href="/recruiter/jobs"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/recruiter/jobs")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    {t.nav.jobs}
                  </Link>
                  <Link
                    href="/recruiter/resumes"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/recruiter/resumes")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    {t.nav.resumes}
                  </Link>
                </>
              )}

              {user?.role_type === "applicant" && (
                <>
                  <Link
                    href="/applicant"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/applicant")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <UserCircle className="w-4 h-4" />
                    {t.nav.applicantDashboard}
                  </Link>
                </>
              )}

              {user?.role_type === "admin" && (
                <>
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/admin") && !isActive("/admin/users") && !isActive("/admin/audit-logs") && !isActive("/admin/skills") && !isActive("/admin/evaluation")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    {t.nav.adminConsole}
                  </Link>
                  <Link
                    href="/admin/users"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/admin/users")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    {t.nav.manageUsers}
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/admin/audit-logs")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {t.nav.auditLogs}
                  </Link>
                  <Link
                    href="/admin/skills"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/admin/skills")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    {t.nav.skillsTaxonomy}
                  </Link>
                  {/* Hidden for now:
                  <Link
                    href="/admin/evaluation"
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isActive("/admin/evaluation")
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    {t.nav.evaluation}
                  </Link>
                  */}
                </>
              )}
            </nav>

            {/* Actions: Language Switcher + User Status / Auth Actions / Mobile Trigger */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Language Switcher Button (Desktop & Mobile) */}
              <button
                onClick={toggleLanguage}
                aria-label={t.common.switchLanguage}
                title={t.common.switchLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/90 bg-slate-50/80 hover:bg-brand-50 hover:border-brand-300 text-slate-700 hover:text-brand-700 text-xs font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer"
              >
                <Languages className="w-4 h-4 text-brand-600" />
                <span className="font-semibold">{language === "ar" ? "English" : "العربية"}</span>
              </button>

              {/* Desktop Auth Controls */}
              {user ? (
                <div className="hidden sm:flex items-center gap-3 ps-2 border-s border-slate-200/70">
                  <div className="text-start">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{user.full_name}</p>
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-brand-50 text-brand-700 border border-brand-200/60">
                      {getRoleLabel(user.role_type, t)}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title={t.nav.signOut}
                    aria-label={t.nav.signOut}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 ps-2 border-s border-slate-200/70">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {t.nav.signIn}
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all hover:scale-105"
                  >
                    {t.nav.register}
                  </Link>
                </div>
              )}

              {/* Mobile Drawer Trigger Button */}
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                aria-label={t.nav.menu}
                aria-expanded={isDrawerOpen}
              >
                {isDrawerOpen ? (
                  <X className="w-5 h-5 text-slate-800" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-800" />
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* RESPONSIVE MOBILE DRAWER NAVIGATION                                  */}
      {/* ==================================================================== */}

      {/* Backdrop Overlay */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 start-0 z-50 h-full w-4/5 max-w-sm bg-white shadow-2xl border-e border-slate-200/90 flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          isDrawerOpen
            ? "translate-x-0"
            : dir === "rtl"
            ? "translate-x-full"
            : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  {t.nav.brandName}
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-700">
                  {t.nav.brandTag}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{t.nav.brandSubtitle}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card (When Logged In) */}
        {user && (
          <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-br from-brand-50/70 to-indigo-50/50 border border-brand-100/80 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-200/80 text-brand-800">
                    {getRoleLabel(user.role_type, t)}
                  </span>
                  {user.username && (
                    <span className="text-[11px] text-slate-500 truncate" dir="ltr">@{user.username}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drawer Scrollable Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          
          {/* Main Navigation Section */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
              {t.nav.menu}
            </span>

            {/* Home Link */}
            <Link
              href="/"
              onClick={() => setIsDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                pathname === "/"
                  ? "bg-brand-50 text-brand-700 font-bold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-slate-500" />
                <span>{t.nav.home}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
            </Link>

            {/* Role-Specific Navigation */}
            {user?.role_type === "recruiter" && (
              <>
                <Link
                  href="/recruiter"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/recruiter") && !isActive("/recruiter/jobs") && !isActive("/recruiter/resumes")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-brand-600" />
                    <span>{t.nav.recruiterWorkspace}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>

                <Link
                  href="/recruiter/jobs"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/recruiter/jobs")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>{t.nav.jobs}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>

                <Link
                  href="/recruiter/resumes"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/recruiter/resumes")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>{t.nav.resumes}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>
              </>
            )}

            {user?.role_type === "applicant" && (
              <Link
                href="/applicant"
                onClick={() => setIsDrawerOpen(false)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                  isActive("/applicant")
                    ? "bg-brand-50 text-brand-700 font-bold"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle className="w-4 h-4 text-emerald-600" />
                  <span>{t.nav.applicantDashboard}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
              </Link>
            )}

            {user?.role_type === "admin" && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/admin") && !isActive("/admin/users") && !isActive("/admin/audit-logs") && !isActive("/admin/skills") && !isActive("/admin/evaluation")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>{t.nav.adminConsole}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>

                <Link
                  href="/admin/users"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/admin/users")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>{t.nav.manageUsers}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>

                <Link
                  href="/admin/audit-logs"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/admin/audit-logs")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span>{t.nav.auditLogs}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>

                <Link
                  href="/admin/skills"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/admin/skills")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{t.nav.skillsTaxonomy}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>

                {/* Hidden for now:
                <Link
                  href="/admin/evaluation"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    isActive("/admin/evaluation")
                      ? "bg-brand-50 text-brand-700 font-bold"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Brain className="w-4 h-4 text-indigo-600" />
                    <span>{t.nav.evaluation}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 rtl:rotate-180" />
                </Link>
                */}
              </>
            )}
          </div>

          {/* Account Actions for Logged Out Visitors */}
          {!user && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                {t.nav.menu}
              </span>

              <Link
                href="/login"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.nav.signIn}</span>
              </Link>

              <Link
                href="/register"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200/80 flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4 text-brand-600" />
                <span>{t.nav.register}</span>
              </Link>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-rose-200/60 cursor-pointer"
            >
              <LogOut className="w-4 h-4 rtl:rotate-180" />
              <span>{t.nav.signOut} ({user.full_name})</span>
            </button>
          ) : (
            <p className="text-center text-[11px] text-slate-400 font-medium">
              {t.nav.brandName} {t.nav.brandSubtitle}
            </p>
          )}
        </div>

      </div>
    </>
  );
};
