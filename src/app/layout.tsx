import type { Metadata } from "next";
import localFont from "next/font/local";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const vazirmatn = localFont({
  src: "../../public/fonts/Vazirmatn[wght].woff2",
  variable: "--font-vazirmatn",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "فیتا | ردیاب رژیم و سلامت",
  description: "همراه روزانه برای ثبت وعده‌ها و ساخت عادت‌های سالم‌تر",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full`}>
      <body className="min-h-full">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
