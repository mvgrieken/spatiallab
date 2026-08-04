import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SpatialLab — Small experiments about AI and the physical world",
    template: "%s — SpatialLab",
  },
  description:
    "Small, working browser experiments exploring what AI can infer from the physical world. No app required.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "SpatialLab",
    title: "SpatialLab — Small experiments about AI and the physical world",
    description:
      "Small, working browser experiments exploring what AI can infer from the physical world. No app required.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "SpatialLab — Small experiments about AI and the physical world",
    description:
      "Small, working browser experiments exploring what AI can infer from the physical world. No app required.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
