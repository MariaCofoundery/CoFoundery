import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasFounderDiscoveryAccess } from "@/features/discovery/discoveryAccess";

/**
 * Die Bearbeitungsseite des Profils in vier Gruppen statt sieben Schritten:
 *
 *   Übersicht · Über mich (Angaben, Ressourcen) · Align (Können, Stärken, Richtung) ·
 *   Sichtbarkeit · Find · Connect
 *
 * Find und Connect führen zu ihren eigenen Seiten (dort liegen die Angaben, die nur dort gelten) und
 * erscheinen nur, wenn es den Zugang gibt. Die Schritte von `/profile?step=…` bleiben unverändert
 * erreichbar - die Gruppen sortieren sie nur.
 */
import { profileTabState, type Sub } from "@/features/profile/profileTabState";
export { profileTabState };

export async function ProfileTabs({
  step,
  current,
  hasFind,
  hasConnect,
}: {
  step: string | null;
  current?: "direction";
  hasFind: boolean;
  hasConnect: boolean;
}) {
  const t = await getTranslations("capability");
  const state = profileTabState(step, current);

  const tabs: { key: string; href: string; label: string; active: boolean }[] = [
    { key: "overview", href: "/profile", label: t("profileTabs.overview"), active: state.group === "overview" },
    { key: "about", href: "/profile?step=identity", label: t("profileTabs.about"), active: state.group === "about" },
    { key: "align", href: "/profile?step=areas", label: t("profileTabs.align"), active: state.group === "align" },
    { key: "visibility", href: "/profile?step=sichtbarkeit", label: t("profileTabs.visibility"), active: state.group === "visibility" },
    ...(hasFind ? [{ key: "find", href: "/discovery/profile", label: t("profileTabs.find"), active: false }] : []),
    ...(hasConnect ? [{ key: "connect", href: "/connect/profile", label: t("profileTabs.connect"), active: false }] : []),
  ];

  const subs: { key: Sub; href: string; label: string }[] | null =
    state.group === "about"
      ? [
          { key: "identity", href: "/profile?step=identity", label: t("profileTabs.sub.identity") },
          { key: "resources", href: "/profile?step=resources", label: t("profileTabs.sub.resources") },
        ]
      : state.group === "align"
        ? [
            { key: "capability", href: "/profile?step=areas", label: t("profileTabs.sub.capability") },
            { key: "strengths", href: "/profile?step=strengths", label: t("profileTabs.sub.strengths") },
            { key: "direction", href: "/profile/direction", label: t("profileTabs.sub.direction") },
          ]
        : null;

  return (
    <div className="mt-6">
      <nav aria-label={t("profileTabs.label")} className="flex flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm transition ${
              tab.active ? "brand-here font-semibold" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {subs ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t("profileTabs.subLabel")}>
          {subs.map((sub) => (
            <li key={sub.key}>
              <Link
                href={sub.href}
                aria-current={state.sub === sub.key ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
                  state.sub === sub.key ? "border-violet-300 bg-violet-50 font-semibold text-violet-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {sub.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Dieselben Tabs für Seiten, die die beiden Zugänge nicht selbst laden (z. B. Richtung). */
export async function ProfileTabsForUser({
  client,
  userId,
  step = null,
  current,
}: {
  client: SupabaseClient;
  userId: string;
  step?: string | null;
  current?: "direction";
}) {
  const [hasConnect, hasFind] = await Promise.all([
    Promise.resolve(client.rpc("is_network_member")).then(({ data }) => data === true).catch(() => false),
    hasFounderDiscoveryAccess(userId, client as never).catch(() => false),
  ]);
  return <ProfileTabs step={step} current={current} hasFind={hasFind} hasConnect={hasConnect} />;
}
