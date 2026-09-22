import type { CapabilityEntry } from "@/features/capability/capabilityTypes";

/**
 * Faehigkeiten und Verantwortungswuensche im Founderprofil.
 *
 * WAS HIER STEHT: je Bereich die Stufe, der Verantwortungswunsch und die
 * ANZAHL der Belege.
 *
 * WAS HIER NICHT STEHT: die Belege selbst. Und das ist die wichtigste
 * Entscheidung dieses Bauteils.
 *
 * Diese Seite ist zum Ausdrucken und Weitergeben gedacht - ein Accelerator hat
 * danach gefragt. Die Erzaehlungen aus dem Interview sind aber genau das, was
 * nie geteilt wird: Frage 3 des Katalogs fragt ausdruecklich nach dem Leben
 * ausserhalb der Erwerbsarbeit, und dort stehen dann Pflege, Ehrenamt,
 * Familie. Wer sein Profil weitergibt, will seine Faehigkeiten weitergeben,
 * nicht diese Geschichten. Sie bleiben da, wo sie hingehoeren: auf der eigenen
 * Profilseite.
 *
 * Die ANZAHL zu nennen ist trotzdem richtig - sie sagt, dass hinter dem Haken
 * ein Ereignis steht, ohne es zu erzaehlen. Genau das unterscheidet CoFoundery
 * von einer Skill-Liste.
 */
export function FounderProfileCapability({
  entries,
  copy,
}: {
  entries: CapabilityEntry[];
  copy: {
    title: string;
    intro: string;
    areaLabel: (areaId: string) => string;
    levelLabel: (level: number) => string;
    wishLabel: (wish: string) => string;
    evidenceCount: (count: number) => string;
    noLevel: string;
  };
}) {
  if (entries.length === 0) return null;

  return (
    <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-6 print:rounded-none print:border-none print:px-0">
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">{copy.intro}</p>

      <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
            <span className="text-sm font-medium text-slate-900">{copy.areaLabel(entry.area_id)}</span>
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>
                {entry.application_level !== null ? copy.levelLabel(entry.application_level) : copy.noLevel}
              </span>
              {entry.ownership_wish ? (
                <span className="text-slate-800">{copy.wishLabel(entry.ownership_wish)}</span>
              ) : null}
              {entry.evidence.length > 0 ? (
                <span className="text-xs text-slate-500">{copy.evidenceCount(entry.evidence.length)}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
