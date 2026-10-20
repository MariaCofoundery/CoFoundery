import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOwnConnectProfile } from "@/features/connect/connectData";
import { getOwnDiscoveryProfile } from "@/features/discovery/discoveryData";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { normalizeProfileRoles } from "@/features/profile/profileRoles";

/**
 * "Deine Rollen im Überblick": drei verschiedene Dinge, die alle "Rolle" heißen - an einer Stelle
 * erklärt und je mit dem Weg dorthin, wo man sie ändert.
 *
 *   Zugang    - Founder oder Advisor: steuert, welche Bereiche dir angeboten werden (keine Berechtigung).
 *   FIND      - Funktionen im Gründungsteam (Tech, Product, ...): was du einbringst und suchst.
 *   Connect   - wer du im Netzwerk bist (Expert:in, Mentor:in, ...): beschreibend, ändert nichts.
 *
 * Sie werden hier nicht zusammengelegt: Es sind verschiedene Aussagen mit verschiedener Sichtbarkeit,
 * und die eine setzt die andere nicht voraus. FIND und Connect erscheinen nur, wenn es dort schon ein
 * Profil gibt.
 */
export async function RolesOverview({ client, userId }: { client: SupabaseClient; userId: string }) {
  const t = await getTranslations("capability");
  const tFind = await getTranslations("discovery");
  const tConnect = await getTranslations("connect");
  const [basics, find, connect] = await Promise.all([
    getProfileBasicsRow(client, userId).catch(() => null),
    getOwnDiscoveryProfile(userId, client as never).catch(() => null),
    getOwnConnectProfile(client, userId).catch(() => null),
  ]);
  const account = normalizeProfileRoles(basics?.roles);
  const chip = "inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900";
  const none = <span className="text-sm text-slate-500">{t("identity.rolesOverview.none")}</span>;

  const rows: { key: string; title: string; text: string; chips: string[]; href: string | null }[] = [
    {
      key: "access",
      title: t("identity.rolesOverview.access.title"),
      text: t("identity.rolesOverview.access.text"),
      chips: account.map((role) => t(`identity.rolesOverview.access.${role}`)),
      href: null,
    },
    ...(find
      ? [{
          key: "find",
          title: t("identity.rolesOverview.find.title"),
          text: t("identity.rolesOverview.find.text"),
          chips: [
            ...find.ownRoles.map((role) => tFind(`roles.${role}`)),
          ],
          href: "/discovery/profile",
        }]
      : []),
    ...(connect
      ? [{
          key: "connect",
          title: t("identity.rolesOverview.connect.title"),
          text: t("identity.rolesOverview.connect.text"),
          chips: (connect.network_roles ?? []).map((role) => tConnect(`roles.${role}`)),
          href: "/connect/profile",
        }]
      : []),
  ];

  return (
    <section aria-labelledby="roles-overview-title" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 id="roles-overview-title" className="text-sm font-semibold text-slate-900">{t("identity.rolesOverview.title")}</h3>
      <dl className="mt-3 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-1 py-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
            <dt>
              <span className="block text-sm font-semibold text-slate-900">{row.title}</span>
              <span className="block text-xs leading-5 text-slate-500">{row.text}</span>
            </dt>
            <dd className="flex flex-wrap gap-2">{row.chips.length > 0 ? row.chips.map((chipText) => <span key={chipText} className={chip}>{chipText}</span>) : none}</dd>
            {row.href ? (
              <Link href={row.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">
                {t("identity.rolesOverview.change")}
              </Link>
            ) : (
              <Link href="/profile?step=identity#roles" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">
                {t("identity.rolesOverview.change")}
              </Link>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
