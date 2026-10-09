import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";
import "./globals.css";

const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow-condensed", display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Juggle Dude — Keep it up, dude.", template: "%s | Juggle Dude" },
  description: site.description,
  applicationName: site.name,
  ...(site.url ? { metadataBase: new URL(site.url) } : {}),
  openGraph: { title: "Juggle Dude — Keep it up, dude.", description: site.description, type: "website", locale: "en_GB", siteName: site.name },
};

export const viewport: Viewport = { themeColor: "#f3f4ed" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main-content" className="sr-only fixed top-3 left-3 z-50 rounded-lg bg-ink px-5 py-3 text-paper focus:not-sr-only">Skip to content</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
