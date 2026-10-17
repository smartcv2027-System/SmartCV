"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, getLocalizedError } from "@/lib/i18n";
import { 
  Brain, Lock, Mail, User, Phone, ArrowRight, 
  CheckCircle2, AlertCircle, Eye, EyeOff, Briefcase, GraduationCap, AtSign 
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { t } = useLanguage();

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
      setError(
        t.common.activeLanguage === "العربية"
          ? "اسم المستخدم يجب أن يكون بين 3 و30 حرفاً باللغة الإنجليزية والأرقام أو الرمز (_) فقط."
          : "Username must be 3–30 characters and contain only letters, numbers, or underscores (_)."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        t.common.activeLanguage === "العربية"
          ? "كلمة المرور يجب أن تتكون من 6 خانات على الأقل."
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        t.common.activeLanguage === "العربية"
          ? "كلمتا المرور غير متطابقتين."
          : "Passwords do not match."
      );
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
      setError(getLocalizedError(err, t));
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
          <Brain className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">{t.auth.createAccountTitle}</h2>
        <p className="text-xs text-slate-500">
          {t.auth.createAccountSubtitle}
        </p>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-2xl glass-card border border-slate-200 shadow-xs space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">{t.auth.selectRole}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRoleType("applicant")}
              className={`p-3.5 rounded-xl border text-start transition-all flex flex-col justify-between gap-2 cursor-pointer ${
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
                <p className="text-xs font-bold">{t.roles.applicant}</p>
                <p className="text-[11px] text-slate-500">
                  {t.common.activeLanguage === "العربية" ? "طالب / خريج باحث عن فرصة" : "Student / Job Seeker"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoleType("recruiter")}
              className={`p-3.5 rounded-xl border text-start transition-all flex flex-col justify-between gap-2 cursor-pointer ${
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
                <p className="text-xs font-bold">{t.roles.recruiter}</p>
                <p className="text-[11px] text-slate-500">
                  {t.common.activeLanguage === "العربية" ? "إدارة المواهب والتوظيف" : "Talent Acquisition / HR"}
                </p>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 italic">
            {t.common.activeLanguage === "العربية"
              ? "* ملاحظة: حسابات مدراء النظام تُنشأ وتُدار مركزياً بواسطة إدارة الجامعة."
              : "* Note: System Administrator accounts are restricted and provisioned by administrators only."}
          </p>
        </div>

        {/* Username & Full Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.auth.username} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                id="register-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder={t.auth.usernameInputPlaceholder}
                required
                className={`w-full ps-9 pe-3 py-2.5 rounded-xl border text-xs text-slate-800 focus:outline-none focus:ring-2 bg-white ${
                  !isUsernameValid
                    ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500"
                    : "border-slate-200 focus:ring-brand-500/20 focus:border-brand-500"
                }`}
              />
            </div>
            {!isUsernameValid && (
              <p className="text-[10px] text-rose-600 mt-1">
                {t.common.activeLanguage === "العربية"
                  ? "3–30 خانة، أحرف إنجليزية وأرقام وشرطة سفلية فقط."
                  : "3–30 characters, letters, digits, and underscores only."}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.auth.fullName} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                id="register-fullname"
                name="name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.auth.fullNamePlaceholder}
                required
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.auth.email} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                required
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.common.activeLanguage === "العربية" ? "رقم الجوال (اختياري)" : "Phone Number (Optional)"}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 50 123 4567"
                dir="ltr"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-start"
              />
            </div>
          </div>
        </div>

        {/* Password & Confirm Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.auth.password} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                required
                minLength={6}
                className="w-full ps-9 pe-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.common.activeLanguage === "العربية" ? "تأكيد كلمة المرور" : "Confirm Password"} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
                required
                className={`w-full ps-9 pe-3 py-2.5 rounded-xl border text-xs text-slate-800 focus:outline-none focus:ring-2 bg-white ${
                  !isPasswordMatch
                    ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500"
                    : "border-slate-200 focus:ring-brand-500/20 focus:border-brand-500"
                }`}
              />
            </div>
            {!isPasswordMatch && (
              <p className="text-[10px] text-rose-600 mt-1">
                {t.common.activeLanguage === "العربية" ? "كلمتا المرور غير متطابقتين." : "Passwords do not match."}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <span>{t.auth.creatingAccount}</span>
          ) : (
            <>
              <span>{t.auth.registerAction}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
            </>
          )}
        </button>

        {/* Link back to login */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            {t.auth.alreadyHaveAccount}{" "}
            <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
              {t.auth.signInLink}
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
