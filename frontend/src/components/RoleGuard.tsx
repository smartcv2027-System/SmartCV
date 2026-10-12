"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, getRoleLabel } from "@/lib/i18n";
import { ShieldAlert, ArrowRight, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

interface RoleGuardProps {
  allowedRoles: ("applicant" | "recruiter" | "admin")[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();
  const { t, format } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">{t.common.loading}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {t.common.activeLanguage === "العربية" ? "تسجيل الدخول مطلوب" : "Authentication Required"}
        </h2>
        <p className="text-xs text-slate-600 mb-6">
          {t.common.activeLanguage === "العربية" 
            ? "يجب عليك تسجيل الدخول بحساب مخوّل للوصول إلى هذه الصفحة."
            : "You need to sign in with an authorized account to view this page."}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
        >
          <span>{t.nav.signIn}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>
    );
  }

  const hasAccess = allowedRoles.includes(user.role_type as any);

  if (!hasAccess) {
    const roleLanding = {
      recruiter: "/recruiter",
      applicant: "/applicant",
      admin: "/admin"
    }[user.role_type] || "/";

    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white border border-rose-100 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold mb-3">
          403 Forbidden &bull; {t.errors.unauthorized}
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {t.common.activeLanguage === "العربية" ? "منطقة غير مصرح بها" : "Unauthorized Area"}
        </h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {t.common.activeLanguage === "العربية" ? (
            <>
              نوع حسابك الحالي (<span className="font-semibold text-slate-800">{getRoleLabel(user.role_type, t)}</span>) لا يملك صلاحية عرض هذا القسم. هذه الصفحة مخصصة لـ:{" "}
              <span className="font-semibold text-brand-700">
                {allowedRoles.map((r) => getRoleLabel(r, t)).join("، ")}
              </span>.
            </>
          ) : (
            <>
              Your account role (<span className="font-semibold text-slate-800 capitalize">{user.role_type}</span>) does not have permission to view this section. This page is restricted to:{" "}
              <span className="font-semibold text-brand-700 capitalize">{allowedRoles.join(", ")}</span>.
            </>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={roleLanding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            <span>{t.common.activeLanguage === "العربية" ? "العودة إلى لوحتي" : "Go to My Dashboard"}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
