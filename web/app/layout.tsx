import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
/*
 * Geist's own mono, not another foundry's. The mono is structural here rather
 * than decorative -- section labels, the spec strip, the topic ledger, the
 * trust stamp -- so it has to sit at the same x-height and weight as the sans
 * beside it, which only a companion face does.
 */
const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-ui",
});

export const metadata: Metadata = {
  title: "Shopbell",
  description: "Silence is the product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
