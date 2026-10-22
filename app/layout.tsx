import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://guba-engineering.pages.dev"),
  title: { default: "GUBA Engineering Investment Group", template: "%s | GUBA" },
  description: "Engineering progress through secure infrastructure, enterprise technology, and professional capability building.",
  keywords: ["GUBA", "engineering Ethiopia", "enterprise technology", "cyber security", "digital infrastructure"],
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "GUBA Engineering Investment Group", description: "Engineering progress. Empowering growth.", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "GUBA Engineering Investment Group" }] },
  twitter: { card: "summary_large_image", title: "GUBA Engineering Investment Group", description: "Engineering progress. Empowering growth.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
