import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { Notice } from "@/components/notice";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "EstiMate", template: "%s | EstiMate" },
  description: "Track tasks, log hours, and see how accurate your estimates are.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          <Suspense>
            <Notice />
          </Suspense>
          {children}
        </main>
        <footer className="bg-nav py-3 text-center text-xs text-slate-400">EstiMate</footer>
      </body>
    </html>
  );
}
