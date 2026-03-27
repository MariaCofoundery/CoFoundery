import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { ProductShell } from "@/features/navigation/ProductShell";
import { createClient } from "@/lib/supabase/server";

const spectral = localFont({
  src: [
    { path: "./fonts/spectral-v15-latin-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/spectral-v15-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/spectral-v15-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-spectral",
  display: "swap",
});

const unbounded = localFont({
  src: [
    { path: "./fonts/unbounded-v12-latin-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/unbounded-v12-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/unbounded-v12-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CoFoundery Align | Co-Founder Matching mit Werte-Fokus",
  description:
    "CoFoundery Align verbindet Mitgründer:innen nach Werten, Vision und Arbeitsstil. Werte zuerst – Fähigkeiten als Ergänzung.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roleViews = user
    ? await getDashboardRoleViews(user.id).catch(() => ({
        hasFounder: false,
        hasAdvisor: false,
        roles: [],
      }))
    : {
        hasFounder: false,
        hasAdvisor: false,
        roles: [],
      };
  const displayName =
    user?.user_metadata?.display_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <html lang="de" className={`${spectral.variable} ${unbounded.variable}`}>
      <body>
        <ProductShell
          hasFounder={roleViews.hasFounder}
          hasAdvisor={roleViews.hasAdvisor}
          displayName={displayName}
        >
          {children}
        </ProductShell>
      </body>
    </html>
  );
}
