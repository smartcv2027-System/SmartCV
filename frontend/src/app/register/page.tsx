"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  Brain, Lock, Mail, User, Phone, ArrowRight, 
  CheckCircle2, AlertCircle, Eye, EyeOff, Briefcase, GraduationCap, AtSign 
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleType, setRoleType] = useState<"applicant" | "recruiter">("applicant");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client validation
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  const isUsernameValid = username.length === 0 || usernameRegex.test(username);
  const isPasswordMatch = confirmPassword.length === 0 || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation checks
    if (!usernameRegex.test(username)) {
      setError("Username must be 3–30 characters and contain only letters, numbers, or underscores (_).");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register({
        username: username.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role_type: roleType,
        phone: phone.trim() || undefined,
      });

      // Redirect to appropriate dashboard based on chosen role
      if (roleType === "recruiter") {
        router.push("/recruiter");
      } else {
        router.push("/applicant");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
          <Brain className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Create your SmartCV Account</h2>
        <p className="text-xs text-slate-500">
          King Khalid University Explainable AI Resume Screening & Matching Platform
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-2xl glass-card border border-slate-200 shadow-sm space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Select Account Role</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRoleType("applicant")}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                roleType === "applicant"
                  ? "bg-emerald-50/70 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
                {roleType === "applicant" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </div>
              <div>
                <p className="text-xs font-bold">Applicant</p>
                <p className="text-[11px] text-slate-500">Student / Job Seeker</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoleType("recruiter")}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                roleType === "recruiter"
                  ? "bg-brand-50/70 border-brand-500 text-brand-950 ring-2 ring-brand-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-1.5 rounded-lg bg-brand-100 text-brand-700">
                  <Briefcase className="w-4 h-4" />
                </div>
                {roleType === "recruiter" && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
              </div>
              <div>
                <p className="text-xs font-bold">Recruiter</p>
                <p className="text-[11px] text-slate-500">Talent Acquisition / HR</p>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 italic">
            * Note: System Administrator accounts are restricted and provisioned by administrators only.
          </p>
        </div>

        {/* Username & Full Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. fahad_cs"
                required
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs text-slate-800 focus:outline-none focus:ring-2 bg-white ${
                  !isUsernameValid
                    ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500"
                    : "border-slate-200 focus:ring-brand-500/20 focus:border-brand-500"
                }`}
              />
            </div>
            {!isUsernameValid && (
              <p className="text-[10px] text-rose-600 mt-1">3–30 characters, letters, digits, and underscores only.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Fahad Al-Qahtani"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fahad@kku.edu.sa"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 50 123 4567"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs text-slate-800 focus:outline-none focus:ring-2 bg-white ${
                  !isPasswordMatch
                    ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500"
                    : "border-slate-200 focus:ring-brand-500/20 focus:border-brand-500"
                }`}
              />
            </div>
            {!isPasswordMatch && (
              <p className="text-[10px] text-rose-600 mt-1">Passwords do not match.</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {isLoading ? (
            <span>Creating account...</span>
          ) : (
            <>
              <span>Create Account & Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {/* Link back to login */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
