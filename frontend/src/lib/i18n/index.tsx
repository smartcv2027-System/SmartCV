"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { en } from "./en";
import { ar } from "./ar";
import type { Language, Direction, Translations } from "./types";

interface LanguageContextType {
  language: Language;
  direction: Direction;
  dir: Direction;
  t: Translations;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  format: (template: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "smartcv_lang";
const DEFAULT_LANG: Language = "ar";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  // Read stored language on client mount safely
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === "ar" || stored === "en") {
        setLanguageState(stored);
      }
    } catch {
      // localStorage may be unavailable or restricted
    }
    setMounted(true);
  }, []);

  // Synchronize document attributes and localStorage when language updates
  useEffect(() => {
    if (typeof document !== "undefined") {
      const nextDir: Direction = language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = language;
      document.documentElement.dir = nextDir;
      try {
        localStorage.setItem(STORAGE_KEY, language);
      } catch {
        // ignore storage errors
      }
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === "ar" ? "en" : "ar"));
  }, []);

  const direction: Direction = language === "ar" ? "rtl" : "ltr";
  const t: Translations = language === "ar" ? ar : en;

  const value = useMemo(
    () => ({
      language,
      direction,
      dir: direction,
      t,
      setLanguage,
      toggleLanguage,
      format,
    }),
    [language, direction, t, setLanguage, toggleLanguage, format]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export function format(template: string, vars?: Record<string, string | number>): string {
  if (!template || !vars) return template || "";
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}

export * from "./types";
export * from "./glossary";
