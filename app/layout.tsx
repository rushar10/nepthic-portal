import "@/ui/fonts.css";
import "@/ui/styles.css";
import "@/ui/glow/glow.css";
import "./admin.css";
import "@/ui/ux/ux.css";
import "./portal.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

/* Root of the Nepthic Admin Portal. Never indexed (also sent as an X-Robots-Tag header on
   every response, and robots.txt disallows everything). Dark by default. */
export const metadata: Metadata = {
  title: { default: "Nepthic Admin", template: "%s · Nepthic Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
  appleWebApp: { capable: true, title: "Nepthic Admin", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0E0B14", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = (await cookies()).get("nep_portal_theme")?.value;
  const theme = saved === "light" ? "light" : "dark";
  return (
    <html lang="en-AU" data-theme={theme}>
      <body className="site-adm">{children}</body>
    </html>
  );
}
