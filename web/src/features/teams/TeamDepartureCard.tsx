import { getLocale, getTranslations } from "next-intl/server";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { chooseTeamDepartureAction } from "@/features/teams/teamDepartureActions";
import { TEAM_DEPARTURE_CHOICES, type OpenTeamDeparture } from "@/features/teams/teamDepartureData";

/**
 * "Eine Person hat das Team verlassen. Wie geht es weiter?"
 *
 * Alle Verbleibenden entscheiden gemeinsam. Die Wahl jeder Person ist fuer die anderen
 * sichtbar; sind sie uneins, bleibt die Frage offen. Nichts wird fuer sie entschieden und
 * nichts geloescht. Kein Name der gehenden Person - sie steht nicht im Eintrag.
 */
export async function TeamDepartureCard({
  teamId,
  currentUserId,
  members,
  departures,
}: {
  teamId: string;
  currentUserId: string;
  members: Array<{ userId: string; displayName: string }>;
  departures: OpenTeamDeparture[];
}) {
  if (departures.length === 0) return null;
  const [t, locale] = await Promise.all([getTranslations("teams.departure"), getLocale()]);
  const dateFormat = new Intl.DateTimeFormat(getPresentationLocale(locale), { dateStyle: "medium" });
  return (
    <>
      {departures.map((departure) => {
        const own = departure.choices.find((entry) => entry.userId === currentUserId)?.choice ?? null;
        const action = chooseTeamDepartureAction.bind(null, teamId, departure.id);
        const split = new Set(departure.choices.filter((entry) => entry.choice !== "later").map((entry) => entry.choice)).size > 1;
        return (
          <section
            key={departure.id}
            id="team-austritt"
            aria-labelledby={`departure-title-${departure.id}`}
            className="mt-5 scroll-mt-24 rounded-[24px] border border-[#e4e2f0] bg-white p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#5f5e7a]">{t("eyebrow", { date: dateFormat.format(new Date(departure.leftAt)) })}</p>
            <h2 id={`departure-title-${departure.id}`} className="mt-1 text-xl font-semibold text-[#0b1f3a]">{t("title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("intro")}</p>

            <form action={action} className="mt-4 grid gap-2 sm:grid-cols-3">
              {TEAM_DEPARTURE_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="submit"
                  name="choice"
                  value={choice}
                  aria-pressed={own === choice}
                  className={`min-h-12 rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] ${own === choice ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#e4e2f0] bg-white text-[#0b1f3a] hover:bg-[#f7f6fb]"}`}
                >
                  {t(`choices.${choice}.label`)}
                  <span className={`mt-0.5 block text-xs font-normal ${own === choice ? "text-white/80" : "text-slate-600"}`}>{t(`choices.${choice}.help`)}</span>
                </button>
              ))}
            </form>

            <h3 className="mt-5 text-sm font-semibold text-slate-900">{t("whoChose")}</h3>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {members.map((member) => {
                const choice = departure.choices.find((entry) => entry.userId === member.userId)?.choice ?? null;
                return (
                  <li key={member.userId} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f6fb] px-3 py-2 text-sm text-slate-800">
                    <span className="min-w-0 truncate">{member.displayName}{member.userId === currentUserId ? ` (${t("you")})` : ""}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-600">{choice ? t(`choices.${choice}.short`) : t("notChosen")}</span>
                  </li>
                );
              })}
            </ul>
            {split ? <p role="status" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("split")}</p> : null}
            <p className="mt-4 text-xs leading-5 text-slate-500">{t("note")}</p>
          </section>
        );
      })}
    </>
  );
}
