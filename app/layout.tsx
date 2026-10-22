import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const inter = Inter({ subsets: ["latin"] });

// Link-preview card: a static 1200x630 image in /public (the unit logo on the app's dark surface).
const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: `${SITE_NAME} – סמל היחידה` };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – ניהול משימות לצוות`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["ניהול משימות", "משימות לצוות", "לוח משימות", "אפליקציית משימות", "PWA"],
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} – ניהול משימות לצוות`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – ניהול משימות לצוות`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  inLanguage: "he",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
};

// viewport-fit=cover is what makes env(safe-area-inset-*) report real values on iPhone (notch /
// home indicator). Without it every env() in the app (BottomNav, toasts, sheets) silently
// evaluates to 0 — see globals.css for the matching left/right inset padding in landscape.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={inter.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
