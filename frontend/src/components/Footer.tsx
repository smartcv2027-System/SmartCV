"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-md mt-auto py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          {t.footer.copyright}
        </p>
      </div>
    </footer>
  );
};

