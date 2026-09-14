"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, RegisterData, api } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  register: (data: RegisterData) => Promise<User>;
  switchPersona: (role: "recruiter" | "applicant" | "admin") => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS = {
  recruiter: { username: "sarah_recruiter", pass: "password123" },
  applicant: { username: "fahad_applicant", pass: "password123" },
  admin: { username: "laila_admin", pass: "admin123" },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("smartcv_token");
    const savedUser = localStorage.getItem("smartcv_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("smartcv_token");
        localStorage.removeItem("smartcv_user");
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (usernameOrEmail: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(usernameOrEmail, pass);
      localStorage.setItem("smartcv_token", res.access_token);
      localStorage.setItem("smartcv_user", JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const newUser = await api.register(data);
      // Auto login after successful registration
      await login(data.username, data.password);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const switchPersona = async (role: "recruiter" | "applicant" | "admin") => {
    const creds = DEMO_USERS[role];
    if (creds) {
      await login(creds.username, creds.pass);
    }
  };

  const logout = () => {
    localStorage.removeItem("smartcv_token");
    localStorage.removeItem("smartcv_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, switchPersona, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
