import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MainWrapper } from "@/components/MainWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartCV — Explainable AI System for Resume Screening & Job Matching",
  description: "King Khalid University - Explainable AI (XAI) System for Resume Screening and Job Matching prototype.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ConfirmProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <MainWrapper>
                {children}
              </MainWrapper>
              <Footer />
            </div>
          </ConfirmProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
