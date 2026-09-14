"use client";

import React, { useEffect } from "react";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  X, 
  Loader2 
} from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      iconBg: "bg-rose-100 text-rose-600",
      icon: <AlertTriangle className="w-6 h-6" />,
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 focus:ring-rose-500",
    },
    warning: {
      iconBg: "bg-amber-100 text-amber-600",
      icon: <AlertCircle className="w-6 h-6" />,
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 focus:ring-amber-500",
    },
    info: {
      iconBg: "bg-indigo-100 text-indigo-600",
      icon: <Info className="w-6 h-6" />,
      confirmBtn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 focus:ring-indigo-500",
    },
    success: {
      iconBg: "bg-emerald-100 text-emerald-600",
      icon: <CheckCircle2 className="w-6 h-6" />,
      confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 focus:ring-emerald-500",
    },
  };

  const config = variantConfig[variant] || variantConfig.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      
      {/* Click outside to cancel */}
      <div 
        className="fixed inset-0" 
        onClick={() => !isLoading && onCancel()} 
        aria-hidden="true" 
      />

      {/* Modal Dialog Card */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-6 space-y-5 overflow-hidden animate-in zoom-in-95 duration-200 z-10"
      >
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}>
              {config.icon}
            </div>
            <div>
              <h3 id="confirm-modal-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {title}
              </h3>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Message */}
        <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-1 ${config.confirmBtn}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
