"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

export interface ConfirmOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
}

export interface AlertOptions {
  title: string;
  message: string | React.ReactNode;
  buttonText?: string;
  variant?: "danger" | "warning" | "info" | "success";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info" | "success";
    isAlertOnly?: boolean;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "danger",
        isAlertOnly: false,
        resolve,
      });
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.buttonText || "OK",
        cancelText: undefined,
        variant: options.variant || "info",
        isAlertOnly: true,
        resolve: () => resolve(),
      });
    });
  }, []);

  const handleConfirm = () => {
    modalState.resolve?.(true);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    modalState.resolve?.(false);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={{ confirm, showAlert }}>
      {children}
      {modalState.isOpen && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText={modalState.confirmText}
          cancelText={modalState.isAlertOnly ? undefined : modalState.cancelText}
          variant={modalState.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
