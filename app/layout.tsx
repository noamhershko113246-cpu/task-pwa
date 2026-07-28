export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Providers>
          {/* ודא שכל רכיב אפליקטיבי (כמו Navbar/Sidebar) נמצא אך ורק כאן, בפנים! */}
          {children}
        </Providers>
      </body>
    </html>
  );
}