import type { Metadata } from "next";
import "./globals.css";
import { Unbounded, Spectral } from "next/font/google";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "500", "700"],
});

const spectral = Spectral({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CoFoundery Align | Co-Founder Matching mit Werte-Fokus",
  description:
    "CoFoundery Align verbindet Mitgründer:innen nach Werten, Vision und Arbeitsstil. Werte zuerst – Fähigkeiten als Ergänzung.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${unbounded.variable} ${spectral.variable}`}>
      <body>{children}</body>
    </html>
  );
}