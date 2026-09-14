"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, ArrowRight, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

interface RoleGuardProps {
  allowedRoles: ("applicant" | "recruiter" | "admin")[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Verifying authorization permissions...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Authentication Required</h2>
        <p className="text-xs text-slate-600 mb-6">
          You need to sign in with an authorized account to view this page.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
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
          403 Forbidden • Access Restricted
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Unauthorized Area</h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Your account role (<span className="font-semibold text-slate-800 capitalize">{user.role_type}</span>) does not have permission to view this section. This page is restricted to:{" "}
          <span className="font-semibold text-brand-700 capitalize">{allowedRoles.join(", ")}</span>.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={roleLanding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            Go to My Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
