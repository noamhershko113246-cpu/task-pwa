import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Task PWA",
  description: "Task Management Application",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// יצירת ספק (Context) מקומי ריק כדי לרצות את פונקציית useToast בזמן ה-Build
const ToastContext = React.createContext<any>(null);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className={`${inter.className} min-h-full bg-slate-950 text-slate-50 antialiased flex flex-col overflow-y-auto`}>
        
        {/* עטיפה פשוטה שמספקת Context ולא דורשת ייבוא של אף ספרייה חיצונית */}
        <ToastContext.Provider value={{}}>
          <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
            <main className="flex-1 flex flex-col w-full h-full py-6">
              {children}
            </main>
          </div>
        </ToastContext.Provider>

      </body>
    </html>
  );
}