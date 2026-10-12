import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MainWrapper } from "@/components/MainWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

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
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${inter.variable} ${cairo.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var lang = localStorage.getItem('smartcv_lang') || 'ar';
                document.documentElement.lang = lang;
                document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
              } catch(e) {}
            })()`,
          }}
        />
      </head>
      <body>
        <LanguageProvider>
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
        </LanguageProvider>
      </body>
    </html>
  );
}
