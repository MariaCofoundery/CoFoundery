import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { getIncomingOpenDiscoveryIntroRequestCount } from "@/features/discovery/discoveryIntroData";
import { getIncomingPendingConnectContactCount, getUnreadConnectMessageCount } from "@/features/connect/connectData";
import { getPersonCore } from "@/features/profile/personCoreData";
import { getOwnProfileImage } from "@/features/profile/profileData";
import { ProductShell } from "@/features/navigation/ProductShell";
import { getResearchConsentState } from "@/features/research/consent";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequestLocale } from "@/i18n/getLocale";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getMessages } from "@/i18n/messages";
import { DEFAULT_PUBLIC_APP_ORIGIN, getPublicAppOrigin } from "@/lib/publicAppOrigin";
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
  metadataBase: new URL(getPublicAppOrigin() || DEFAULT_PUBLIC_APP_ORIGIN),
  title: "CoFoundery Align | Co-Founder Matching mit Werte-Fokus",
  description:
    "CoFoundery Align verbindet Mitgründer:innen nach Werten, Vision und Arbeitsstil. Werte zuerst – Fähigkeiten als Ergänzung.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [roleViews, personCore, profileImage, hasConnect, hasConnectAccount, incomingOpenRequestCount, incomingConnectContactCount, unreadConnectMessageCount, researchConsentState] = user
    ? await Promise.all([
        getDashboardRoleViews(user.id).catch(() => ({
          hasFounder: false,
          hasAdvisor: false,
          roles: [],
        })),
        getPersonCore(supabase, user.id).catch(() => null),
        getOwnProfileImage(supabase, user.id).catch(() => ({ avatarId: null, imageUrl: null })),
        Promise.resolve(supabase.rpc("is_network_member")).then(({ data }) => data === true).catch(() => false),
        Promise.resolve(supabase.rpc("has_network_account")).then(({ data }) => data === true).catch(() => false),
        getIncomingOpenDiscoveryIntroRequestCount(user.id).catch(() => 0),
        getIncomingPendingConnectContactCount(supabase, user.id).catch(() => 0),
        getUnreadConnectMessageCount(supabase).catch(() => 0),
        getResearchConsentState(supabase as unknown as SupabaseClient, user.id).catch(() => "undecided" as const),
      ])
    : [
        {
          hasFounder: false,
          hasAdvisor: false,
          roles: [],
        },
        null,
        { avatarId: null, imageUrl: null },
        false,
        false,
        0,
        0,
        0,
        "undecided" as const,
      ];
  // Der Kern ist die einzige Datenquelle fuer den Namen; vorher konkurrierten
  // hier profiles und network_profiles. Die beiden Auth-Metadaten-Stufen und
  // das E-Mail-Praefix bleiben als reine Anzeige-Rueckfaelle fuer Menschen,
  // die noch nichts eingetragen haben - sie werden nie in den Kern geschrieben.
  const displayName =
    personCore?.display_name?.trim() ||
    user?.user_metadata?.display_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <html lang={locale} className={`${spectral.variable} ${unbounded.variable}`}>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <ProductShell
            hasFounder={roleViews.hasFounder}
            hasAdvisor={roleViews.hasAdvisor}
            hasConnect={hasConnect}
            hasConnectAccount={hasConnectAccount}
            displayName={displayName}
            avatarId={profileImage.avatarId}
            avatarImageUrl={profileImage.imageUrl}
            incomingOpenRequestCount={incomingOpenRequestCount}
            incomingConnectContactCount={incomingConnectContactCount}
            unreadConnectMessageCount={unreadConnectMessageCount}
            researchConsentState={researchConsentState}
          >
            {children}
          </ProductShell>
        </I18nProvider>
      </body>
    </html>
  );
}
