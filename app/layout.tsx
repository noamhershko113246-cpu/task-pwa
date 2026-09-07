import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

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
    // suppressHydrationWarning is required here: THEME_INIT_SCRIPT adds class="dark" to
    // this element (via a blocking inline <script>) *before* React hydrates, based on
    // localStorage — a value the server can't know when it renders this same tag with no
    // class at all. Without this flag, React's hydration "fixes" that mismatch by wiping
    // the class right back off immediately after hydrating, which is exactly why dark mode
    // would work the instant you pick it in Settings (that runs after hydration) but silently
    // revert to light on every fresh load/reopen (the class added pre-hydration got erased).
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme (or system default) before first paint — avoids a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}