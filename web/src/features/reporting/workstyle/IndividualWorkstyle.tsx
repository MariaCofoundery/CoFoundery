import { SignatureOverview } from "@/features/reporting/workstyle/SignatureOverview";
import { validProductProfile, type ProductProfile } from "@/features/reporting/workstyle/model";
import { individualNarratives } from "@/features/reporting/workstyle/narrative";
import { WorkstyleSignature } from "@/features/reporting/workstyle/WorkstyleSignature";
import "@/features/reporting/workstyle/report.css";

/**
 * Der Einzelreport (workstyle-report/1.0.0).
 *
 * Seit Phase 10: je Bereich eine Kernaussage aus dem Antwortmuster des ganzen
 * Bereichs (nicht mehr aus einem einzelnen Item), bei gemischtem Muster die
 * konkreten Situationen. Seit Phase 10B keine Alltagsableitungen und keine
 * Saetze ueber Wirkung auf andere mehr - das misst die Selbstauskunft nicht;
 * der Bericht sagt es einmal ausdruecklich. Jede Aussage traegt `data-claim`
 * (interne Regel-ID, siehe narrative.ts).
 *
 * Alle Einzelantworten stehen in einem Anhang: auf dem Bildschirm
 * aufklappbar, im Druck nur in der ausfuehrlichen Fassung (`full`).
 */
export function IndividualWorkstyle({
  profile,
  name = "Du",
  full = false,
  perspective = "self",
}: {
  profile: ProductProfile;
  name?: string;
  full?: boolean;
  /** "other": eine freigegebene Ansicht fuer jemand anderen (Advisor). */
  perspective?: "self" | "other";
}) {
  if (!validProductProfile(profile)) return null;
  const narratives = individualNarratives(profile);
  return (
    <div className={`ws-report space-y-8${full ? " ws-print-full" : ""}`} lang="de">
      <p className="max-w-3xl text-sm leading-6 text-slate-600">
        {perspective === "other"
          ? `Selbstauskunft von ${name} zu konkreten Arbeitssituationen. Die Beschreibungen sind an ${name} gerichtet formuliert.`
          : "Deine Selbstauskunft zu konkreten Arbeitssituationen."}{" "}
        Sie beschreibt typische Arbeitsweisen in diesen Situationen – keine Persönlichkeit, keine Eignung und keine
        Rangfolge. Das Instrument ist noch in Entwicklung und nicht validiert.{" "}
        {perspective === "other"
          ? "Wie dieses Vorgehen bei anderen ankommt, misst der Bericht nicht."
          : "Wie dein Vorgehen bei anderen ankommt, misst der Bericht nicht – das lässt sich nur im Gespräch herausfinden."}
      </p>

      <SignatureOverview people={[{ id: profile.person_id, name, profile }]} />

      <section aria-labelledby="ws-areas-title">
        <h2 id="ws-areas-title" className="text-xl font-semibold">
          {perspective === "other" ? `Wie ${name} arbeitet – Bereich für Bereich` : "Wie du arbeitest – Bereich für Bereich"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {narratives.map(({ area, narrative: n }) => (
            <section
              key={area.key}
              className="ws-text-card rounded-2xl border border-slate-200 bg-white p-5"
              aria-labelledby={`ws-area-${area.key}`}
              data-claim={n.claim}
            >
              <h3 id={`ws-area-${area.key}`} className="font-semibold">
                {area.title}
              </h3>
              <p className="mt-3 text-sm leading-6">{n.core}</p>
              {n.situations.length > 0 && (
                <dl className="mt-3 space-y-2 text-sm leading-6">
                  {n.situations.map((s) => (
                    <div key={s.label}>
                      <dt className="font-medium text-slate-800">{s.label}:</dt>
                      <dd className="text-slate-700">{s.items.join("; ")}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {n.exception && <p className="mt-2 text-sm leading-6 text-slate-700">{n.exception}</p>}
              {n.itemNotes.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {n.itemNotes.map((note) => (
                    <li key={note.claim} data-claim={note.claim}>
                      {note.text}
                    </li>
                  ))}
                </ul>
              )}
              {n.note && <p className="mt-2 text-xs leading-5 text-slate-500">{n.note}</p>}
              {n.missing > 0 && (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Zu {n.missing === 1 ? "einer Situation" : `${n.missing} Situationen`} in diesem Bereich liegt keine
                  Einschätzung vor. Sie fließen nicht ein und zählen nicht als „teils/teils“.
                </p>
              )}
              {n.question && (
                <p className="mt-4 border-t border-slate-200 pt-3 text-sm leading-6">
                  <span className="font-medium">Zum Weiterdenken: </span>
                  {n.question}
                </p>
              )}
            </section>
          ))}
        </div>
      </section>

      <details className="ws-appendix rounded-2xl border border-slate-200 bg-white/70 p-4" open={full}>
        <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
          Alle Antworten im Detail
        </summary>
        <div className="mt-5">
          <WorkstyleSignature people={[{ id: profile.person_id, name, profile }]} />
        </div>
      </details>
    </div>
  );
}
