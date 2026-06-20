// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: { default: "StockAI", template: "%s | StockAI" },
  description: "Generate prompt, keywords & metadata untuk Adobe Stock — powered by Claude AI",
  keywords: ["adobe stock", "AI generator", "vector prompt", "stock photography", "AI tools"],
  authors: [{ name: "StockAI" }],
  openGraph: {
    title: "StockAI — AI Asset Generator untuk Adobe Stock",
    description: "Generate prompt, keywords & metadata untuk Adobe Stock dalam hitungan detik",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}