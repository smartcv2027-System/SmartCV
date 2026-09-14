"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Brain,
  Briefcase,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  Sliders,
  Scale,
  Award,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="w-full flex flex-col">

      {/* ==================================================================== */}
      {/* 1. HERO SECTION (Full Page Width - Crisp White Surface)              */}
      {/* ==================================================================== */}
      <section className="w-full bg-white border-b border-slate-200/80 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">

          {/* Platform Category Badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Explainable AI (XAI) Talent Matching Platform</span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Explainable AI for{" "}
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Resume Screening & Matching
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-3xl mx-auto">
            A transparent, two-layer hybrid AI system integrating{" "}
            <strong className="font-semibold text-slate-800">Sentence-BERT semantic embeddings</strong> with{" "}
            <strong className="font-semibold text-slate-800">TF-IDF lexical scoring</strong>, skill gap diagnostics, and actionable feedback for university graduates.
          </p>

          {/* Dynamic Call-to-Action based strictly on Authentication & Role */}
          <div className="pt-2">
            {!user ? (
              /* Logged-Out Visitors: Public Entry Points */
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/register"
                  className="px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200/80 shadow-xs flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-brand-600" />
                  <span>Create Account</span>
                </Link>
              </div>
            ) : (
              /* Logged-In Users: Single Action Button Matching Active Role */
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  <span>Signed in as:</span>
                  <strong className="font-bold text-slate-900">{user.full_name}</strong>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-brand-100 text-brand-700">
                    {user.role_type}
                  </span>
                </div>

                {user.role_type === "recruiter" && (
                  <Link
                    href="/recruiter"
                    className="px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Briefcase className="w-5 h-5" />
                    <span>Enter Recruiter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                {user.role_type === "applicant" && (
                  <Link
                    href="/applicant"
                    className="px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>Enter Applicant Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}

                {user.role_type === "admin" && (
                  <Link
                    href="/admin"
                    className="px-7 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-500/25 flex items-center gap-2.5 transition-all hover:scale-105 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>Enter Administrator Review</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2. CORE FEATURES SECTION (Full Page Width - Cool Slate Surface)      */}
      {/* ==================================================================== */}
      <section className="w-full bg-slate-100/90 border-b border-slate-200/80 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
              System Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Key Features of the Explainable AI Architecture
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Engineered to overcome black-box opacity and arbitrary resume rejection through transparent algorithmic design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Feature 1: Two-Layer Hybrid Matching */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Two-Layer Hybrid Matching</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Combines dense Sentence-BERT semantic embeddings (<code className="text-[11px] font-mono bg-slate-100 px-1 py-0.5 rounded">all-MiniLM-L6-v2</code>) with exact TF-IDF lexical frequency to prevent synonym misses and keyword stuffing.
              </p>
            </div>

            {/* Feature 2: Verbatim Quote Citations */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Verbatim Evidence Harvesting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every matched skill presented to recruiters includes an unedited sentence quote extracted directly from the candidate's resume, guaranteeing human-auditable verification.
              </p>
            </div>

            {/* Feature 3: Dynamic Weight Tuning */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Dynamic Recruiter Weight Sliders</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recruiters can adjust model weights (SBERT, TF-IDF, Skills) with one-click presets to re-rank candidate pools based on specific requisition priorities.
              </p>
            </div>

            {/* Feature 4: Candidate Skill Gap Feedback */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Actionable Student Diagnostics</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provides early-career students with transparent diagnostics detailing missing required vs. preferred skills and tailored recommendations for capstone projects and certifications.
              </p>
            </div>

            {/* Feature 5: Continuous Compatibility Scoring */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Continuous Scoring (0%–100%)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Avoids brittle binary accept/reject classification. Generates smooth compatibility scores with proven discrimination margins (<code className="text-[11px] font-mono bg-slate-100 px-1 py-0.5 rounded">Δ &gt; 45%</code>) against out-of-domain applicants.
              </p>
            </div>

            {/* Feature 6: Immutable Audit Trails */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3">
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Relational Audit Logging</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every file upload, matching execution, and parameter override is permanently recorded in relational audit log tables, strictly aligned with Saudi Personal Data Protection Law (PDPL).
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. HOW SMARTCV WORKS SECTION (Full Page Width - Light Pastel Gradient)*/}
      {/* ==================================================================== */}
      <section className="w-full bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-brand-50/70 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              System Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How SmartCV Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              A step-by-step pipeline from candidate submission to explainable recruiter review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">

            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-white/95 border border-indigo-100/80 shadow-xs hover:shadow-md transition-all space-y-3.5 relative">
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-900">Role-Based Sign-In</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Users authenticate securely as either an Applicant, Recruiter, or University Administrator with distinct role permissions.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-white/95 border border-indigo-100/80 shadow-xs hover:shadow-md transition-all space-y-3.5 relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-900">Submit or Post</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applicants upload resumes in PDF, Word, or TXT. Recruiters create job specifications via form or document upload.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-white/95 border border-indigo-100/80 shadow-xs hover:shadow-md transition-all space-y-3.5 relative">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-900">NLP Extraction</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Symbol-safe parser extracts technical skills (<code className="text-[10px] bg-slate-100 text-slate-800 border border-slate-200/60 px-1 py-0.5 rounded font-mono">C++</code>, <code className="text-[10px] bg-slate-100 text-slate-800 border border-slate-200/60 px-1 py-0.5 rounded font-mono">.NET</code>), experience, and dense SBERT embeddings.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-white/95 border border-indigo-100/80 shadow-xs hover:shadow-md transition-all space-y-3.5 relative">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                4
              </div>
              <h4 className="font-bold text-sm text-slate-900">Explainable Matching</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hybrid engine ranks candidates, presents quote-level evidence dossiers, and provides students with clear growth diagnostics.
              </p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
