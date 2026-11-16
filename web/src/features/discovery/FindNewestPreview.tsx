import { getTranslations } from "next-intl/server";
import { getDiscoveryExploreProfilesForCurrentUser } from "@/features/discovery/discoveryData";

/**
 * "Neu in Find" fuer alle, die noch unsichtbar sind (Entwurf 16.11.2026): die drei neuesten Suchenden, OHNE Namen, nach Datum und nicht nach Passung,
 * ohne Punkte. Namen und Profile sieht, wer sein eigenes Profil veroeffentlicht hat - vorher gibt es nur einen Eindruck. Scheitert die Abfrage
 * (etwa weil noch kein Profil existiert), bleibt die Karte einfach weg.
 */
export async function FindNewestPreview({ userId }: { userId: string }) {
  const t = await getTranslations("discovery");
  let candidates: Awaited<ReturnType<typeof getDiscoveryExploreProfilesForCurrentUser>>["candidates"] = [];
  try {
    candidates = (await getDiscoveryExploreProfilesForCurrentUser(userId)).candidates.slice(0, 3);
  } catch {
    return null;
  }
  if (candidates.length === 0) return null;
  const roleLabels = (roles: readonly string[]) => roles.slice(0, 2).map((role) => t(`roles.${role}`)).join(" · ");
  return (
    <section data-find-newest className="mb-5" aria-labelledby="find-newest-title">
      <h2 id="find-newest-title" className="text-xl font-semibold text-[#0b1f3a]">{t("newest.title")}</h2>
      <p className="mt-1 text-[15px] text-slate-700">{t("newest.lead")}</p>
      <ul className="mt-3 grid gap-3 lg:grid-cols-3">
        {candidates.map(({ profile }, index) => {
          const brings = roleLabels(profile.ownRoles);
          const seeks = roleLabels(profile.seekingRoles);
          return (
            <li key={index} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-lg font-bold text-violet-800">?</span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold text-slate-950">{[brings, profile.locationRegion].filter(Boolean).join(" · ") || t("newest.someone")}</span>
                {seeks ? <span className="mt-1 block text-[14px] leading-5 text-slate-700">{t("newest.seeks", { roles: seeks })}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px] leading-5 text-slate-600">{t("newest.note")}</p>
    </section>
  );
}
