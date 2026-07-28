import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // 1. להוסיף את הייבוא הזה בראש הקובץ

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Task PWA",
  description: "Task Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={inter.className}>
        <Providers> {/* 2. לעטוף כאן */}
          {children}
        </Providers> {/* 3. ולסגור כאן */}
      </body>
    </html>
  );
}