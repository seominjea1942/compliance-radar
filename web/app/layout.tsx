import type { Metadata } from "next";
import { Inter, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/*
 * Variables are named by role, not by typeface, so swapping a face means
 * changing the import here and nothing else. globals.css maps these onto the
 * Tailwind font utilities.
 */
const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});
const ui = Inter({
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
    <html lang="en" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>
        {/*
          The ambient canvas, once for the whole app. Decorative and inert:
          aria-hidden, no pointer events, and behind everything at z -1.
        */}
        <div className="canvas-layer" aria-hidden>
          <div className="canvas-pool canvas-pool-soft" />
          <div className="canvas-pool canvas-pool-deep" />
        </div>
        {children}
      </body>
    </html>
  );
}
