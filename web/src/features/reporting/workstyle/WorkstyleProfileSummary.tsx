import type { AppLocale } from "@/i18n/config";
import { reportText, workstyleAreas } from "./display";
import { WorkstyleGlance } from "@/features/reporting/workstyle/WorkstyleGlance";
import { validProductProfile, type ProductProfile } from "@/features/reporting/workstyle/model";
import { individualNarratives } from "@/features/reporting/workstyle/narrative";

/**
 * „Wie du arbeitest" auf „Das bist du" - die Kurzfassung (Phase 1, Profil).
 *
 * Vorher stand hier der vollstaendige Einzelreport: Einfuehrung, Karten,
 * „Was auffaellt" (dieselben Saetze wie darunter), Bereich fuer Bereich,
 * Frage, Methodik, Anhang. Er steht jetzt unter „Details & Methodik" und auf
 * der eigenen Berichtsseite - unveraendert.
 *
 * Hier je Bereich genau EIN Satz (auf der Karte), dazu zwei Dinge, die die
 * Karten nicht sagen:
 *   - wo die Antworten durchgehend in eine Richtung zeigen (alle Situationen
 *     im selben Antwortbereich) - nur die Bereichsnamen, kein zweiter Satz;
 *   - wo es von der Situation abhaengt: je Pol EINE konkrete Situation aus
 *     den eigenen Antworten (`SITUATIONS`), damit „je nach Situation" einen
 *     Inhalt bekommt.
 * Dieselbe Auswertung wie ueberall (`narrative.ts`); hier wird nichts neu
 * gerechnet und nichts gedeutet.
 */
export function WorkstyleProfileSummary({ profile, locale = "de" }: { profile: ProductProfile; locale?: AppLocale }) {
  if (!validProductProfile(profile)) return null;
  const areas = workstyleAreas(locale);
  const name = (key: string) => areas.find((area) => area.key === key)?.team ?? key;
  const narratives = individualNarratives(profile, locale);

  const consistent = narratives.filter(
    ({ narrative: n }) => n.pattern.kind === "direction" && n.pattern.band !== "middle" && n.pattern.strength === "all",
  );
  const mixed = narratives.flatMap(({ area, narrative: n }) => {
    if (n.pattern.kind !== "mixed") return [];
    // Je Pol die erste Situation - Pole vor der Mitte, damit der Unterschied sichtbar wird.
    const poles = n.situations.filter((s) => s.band !== "middle");
    const shown = (poles.length > 0 ? poles : n.situations).map((s) => ({ label: s.label, item: s.items[0] }));
    return [{ key: area.key, claim: n.claim, shown }];
  });

  return (
    <div className="space-y-6">
      <WorkstyleGlance
        locale={locale}
        people={[{ id: profile.person_id, name: reportText(locale, "Du", "You"), profile }]}
        title={reportText(locale, "Auf einen Blick", "At a glance")}
        headingId="profile-ws-glance"
      />

      {consistent.length > 0 ? (
        <p className="text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-900">
            {reportText(locale, "Durchgehend in eine Richtung: ", "Consistently in one direction: ")}
          </span>
          {consistent.map(({ area }) => name(area.key)).join(" · ")}
        </p>
      ) : null}

      {mixed.length > 0 ? (
        <section aria-labelledby="profile-ws-mixed" className="rounded-2xl border border-slate-200 bg-white/80 p-5">
          <h3 id="profile-ws-mixed" className="text-sm font-semibold text-slate-900">
            {reportText(locale, "Wo es bei dir von der Situation abhängt", "Where it depends on the situation for you")}
          </h3>
          <ul className="mt-3 space-y-3">
            {mixed.map((entry) => (
              <li key={entry.key} data-claim={entry.claim} className="text-sm leading-6 text-slate-700">
                <span className="font-medium text-slate-900">{name(entry.key)}</span>
                <ul className="mt-1 space-y-0.5">
                  {entry.shown.map((s) => (
                    <li key={s.label}>
                      {s.label}: {s.item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
