"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, format, getLocalizedError } from "@/lib/i18n";
import { api } from "@/lib/api";
import {
  Brain, Lock, Mail, User, Phone, ArrowRight,
  CheckCircle2, AlertCircle, Eye, EyeOff, Briefcase, GraduationCap, AtSign,
  KeyRound, RefreshCw, X
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
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

  // OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Client validation & Password Policy
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  const isUsernameValid = username.length === 0 || usernameRegex.test(username);
  const isPasswordMatch = confirmPassword.length === 0 || password === confirmPassword;

  // Password rules
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordPolicyMet = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const currentRegistrationData = {
    username: username.trim(),
    full_name: fullName.trim(),
    email: email.trim(),
    password,
    role_type: roleType,
    phone: phone.trim() || undefined,
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
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

    if (!isPasswordPolicyMet) {
      setError(
        t.common.activeLanguage === "العربية"
          ? "يرجى استيفاء كافة شروط ومعايير كلمة المرور الموضحة أدناه."
          : "Please satisfy all password policy criteria outlined below."
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

    setIsSendingOtp(true);
    try {
      const res = await api.requestRegisterOTP(currentRegistrationData);
      setMaskedEmail(res.email_masked || email.trim());
      setShowOtpModal(true);
      setResendCooldown(60);
      setOtpCode("");
      setOtpError(null);
    } catch (err: any) {
      setError(getLocalizedError(err, t));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      const res = await api.requestRegisterOTP(currentRegistrationData);
      setMaskedEmail(res.email_masked || email.trim());
      setResendCooldown(60);
    } catch (err: any) {
      setOtpError(getLocalizedError(err, t));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (otpCode.trim().length !== 6) {
      setOtpError(
        t.common.activeLanguage === "العربية"
          ? "يرجى إدخال رمز التحقق المكون من 6 أرقام."
          : "Please enter the 6-digit verification code."
      );
      return;
    }

    setIsVerifying(true);
    try {
      const authRes = await api.verifyRegisterOTP(email.trim(), otpCode.trim(), currentRegistrationData);
      setSession(authRes.access_token, authRes.user);

      // Redirect to appropriate dashboard based on chosen role
      if (roleType === "recruiter") {
        router.push("/recruiter");
      } else {
        router.push("/applicant");
      }
    } catch (err: any) {
      setOtpError(getLocalizedError(err, t));
    } finally {
      setIsVerifying(false);
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
      <form onSubmit={handleRequestOtp} className="p-6 md:p-8 rounded-2xl glass-card border border-slate-200 shadow-xs space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {t.auth.selectRole} <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRoleType("applicant")}
              className={`p-3 rounded-xl border text-start transition-all flex items-center gap-3 cursor-pointer ${
                roleType === "applicant"
                  ? "border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20"
                  : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                roleType === "applicant" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  {t.common.activeLanguage === "العربية" ? "طالب / خريج" : "Applicant / Student"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t.common.activeLanguage === "العربية" ? "بوابة الخريجين والتقديم" : "Apply & view matches"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRoleType("recruiter")}
              className={`p-3 rounded-xl border text-start transition-all flex items-center gap-3 cursor-pointer ${
                roleType === "recruiter"
                  ? "border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20"
                  : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                roleType === "recruiter" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">
                  {t.common.activeLanguage === "العربية" ? "مسؤول توظيف" : "Recruiter"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {t.common.activeLanguage === "العربية" ? "نشر وظائف وفرز مرشحين" : "Post jobs & screen"}
                </p>
              </div>
            </button>
          </div>
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
                onChange={(e) => setUsername(e.target.value)}
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
                  ? "اسم المستخدم يجب أن يكون بالإنجليزية والأرقام أو (_) فقط."
                  : "Letters, numbers, or underscores only (3–30 chars)."}
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
                minLength={8}
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

        {/* Password Policy Checklist */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-brand-600" />
            {t.auth.passwordPolicyTitle}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>{t.auth.policyMinLength}</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${hasUpper && hasLower ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${hasUpper && hasLower ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>{t.auth.policyUpperLower}</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>{t.auth.policyNumber}</span>
            </div>
            <div className={`flex items-center gap-1.5 transition-colors ${hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${hasSpecial ? 'text-emerald-600' : 'text-slate-300'}`} />
              <span>{t.auth.policySpecial}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSendingOtp}
          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
        >
          {isSendingOtp ? (
            <span>{t.auth.sendingOtp}</span>
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

      {/* 2-Step OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 relative">
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 border border-brand-200/60 flex items-center justify-center mx-auto shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t.auth.otpModalTitle}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed px-2">
                {format(t.auth.otpModalSubtitle, { email: maskedEmail })}
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {otpError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{otpError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 text-center">
                  {t.auth.otpInputPlaceholder}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-[10px] text-2xl font-mono py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50 font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className="text-brand-600 hover:text-brand-700 font-bold disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0
                      ? format(t.auth.resendIn, { seconds: resendCooldown })
                      : t.auth.resendCode}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="text-slate-500 hover:text-slate-700 text-xs"
                >
                  {t.auth.changeDetails}
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying || otpCode.length !== 6}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? (
                  <span>{t.auth.verifyingCode}</span>
                ) : (
                  <>
                    <span>{t.auth.verifyAndCreate}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
