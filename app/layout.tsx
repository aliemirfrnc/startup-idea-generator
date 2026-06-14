import "./globals.css";

export const metadata = {
  title: "Startup Fikir Üretici",
  description: "AI destekli startup fikri üretme ve değerlendirme aracı",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
