"use client";

import React from "react";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-md mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          &copy; {currentYear} SmartCV. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
