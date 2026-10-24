import type { Translations } from "./types";

/**
 * SmartCV XAI Terminology & Domain Mappers
 * Decouples canonical database / API enum values from localized UI display labels.
 */

export const getRoleLabel = (role: string | undefined | null, t: Translations): string => {
  if (!role) return "";
  switch (role.toLowerCase()) {
    case "recruiter":
      return t.roles.recruiter;
    case "applicant":
      return t.roles.applicant;
    case "admin":
      return t.roles.admin;
    default:
      return role;
  }
};

export const getRecommendationStatusLabel = (
  status: string | undefined | null,
  t: Translations
): string => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("strong") || s.includes("exceptional") || s.includes("high")) {
    return t.gauge.strongMatch;
  }
  if (s.includes("good") || s.includes("moderate")) {
    return t.gauge.moderateMatch;
  }
  if (s.includes("low") || s.includes("development") || s.includes("growth")) {
    return t.gauge.growthMatch;
  }
  return status;
};

export const getSkillTypeLabel = (
  type: string | undefined | null,
  contextOrLang: Translations | "ar" | "en"
): string => {
  if (!type) return "";
  const lower = type.toLowerCase();
  const isArabic = typeof contextOrLang === "string" 
    ? contextOrLang === "ar"
    : (contextOrLang as any).common?.activeLanguage === "العربية" || (contextOrLang as any).admin?.technicalCat === "تقنية";

  if (lower === "technical") return isArabic ? "تقنية" : "Technical";
  if (lower === "soft") return isArabic ? "شخصية / ناعمة" : "Soft Skill";
  if (lower === "tool") return isArabic ? "أدوات وDevOps" : "Tools & DevOps";
  if (lower === "domain") return isArabic ? "معرفة تخصصية" : "Domain Specific";
  return type;
};

export const getRequirementTypeLabel = (
  type: string | undefined | null,
  t: Translations
): string => {
  if (!type) return "";
  const lower = type.toLowerCase();
  if (lower === "required") return t.common.required;
  if (lower === "preferred") return t.common.optional;
  return type;
};

export const getLocalizedError = (err: any, t: Translations): string => {
  const msg = typeof err === "string" ? err : err?.message || "";
  if (!msg) return t.common.unexpectedError;
  const lower = msg.toLowerCase();
  if (lower.includes("credentials") || lower.includes("invalid password") || lower.includes("not found")) {
    return t.errors.invalidCredentials;
  }
  if (lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("permission")) {
    return t.errors.unauthorized;
  }
  if (lower.includes("network") || lower.includes("failed to fetch") || lower.includes("connection")) {
    return t.errors.networkError;
  }
  if (lower.includes("empty") || lower.includes("0 byte")) {
    return t.errors.fileEmpty;
  }
  if (lower.includes("exceeds") || lower.includes("too large") || lower.includes("limit of 5")) {
    return t.errors.fileTooLarge;
  }
  if (lower.includes("unsupported file") || lower.includes("allowed file formats")) {
    return t.errors.fileUnsupportedType;
  }
  if (lower.includes("professional summary") || lower.includes("missing 'professional summary'")) {
    return t.errors.missingSummary;
  }
  return msg;
};
