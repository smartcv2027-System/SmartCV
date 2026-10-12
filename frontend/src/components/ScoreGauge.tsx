"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";

interface ScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  layout?: "horizontal" | "vertical";
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ 
  score, 
  size = "md", 
  showLabel = true,
  layout = "horizontal"
}) => {
  const { t } = useLanguage();

  const getColor = (s: number) => {
    if (s >= 75) return "text-emerald-600 bg-emerald-50 border-emerald-200 ring-emerald-500/20";
    if (s >= 50) return "text-amber-600 bg-amber-50 border-amber-200 ring-amber-500/20";
    return "text-rose-600 bg-rose-50 border-rose-200 ring-rose-500/20";
  };

  const getBadgeColor = (s: number) => {
    if (s >= 75) return "bg-emerald-500 text-white";
    if (s >= 50) return "bg-amber-500 text-white";
    return "bg-rose-500 text-white";
  };

  const getStatusText = (s: number) => {
    if (s >= 85) return t.gauge.exceptionalMatch;
    if (s >= 75) return t.gauge.strongMatch;
    if (s >= 50) return t.gauge.moderateMatch;
    return t.gauge.growthMatch;
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold rounded-md",
    md: "px-3 py-1.5 text-sm font-bold rounded-lg",
    lg: "px-4 py-2 text-lg font-extrabold rounded-xl"
  };

  const isVertical = layout === "vertical";

  return (
    <div className={`inline-flex ${isVertical ? "flex-col items-start gap-1" : "items-center gap-2"}`}>
      <div className={`inline-flex items-center gap-1.5 border shadow-xs ${getColor(score)} ${sizeClasses[size]}`}>
        <bdi dir="ltr">{score}%</bdi>
      </div>
      {showLabel && (
        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shadow-xs ${getBadgeColor(score)} whitespace-normal leading-tight`}>
          {getStatusText(score)}
        </span>
      )}
    </div>
  );
};

