import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/*
 * Variables are named by role, not by typeface, so swapping a face means
 * changing the import here and nothing else. globals.css maps these onto the
 * Tailwind font utilities.
 */
const ui = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-ui",
});

export const metadata: Metadata = {
  title: "Compliance Radar",
  description: "Silence is the product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
