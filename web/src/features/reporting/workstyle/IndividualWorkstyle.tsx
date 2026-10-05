import { WorkstyleGlance } from "@/features/reporting/workstyle/WorkstyleGlance";
import { validProductProfile, type ProductProfile } from "@/features/reporting/workstyle/model";
import { individualNarratives, questionForYou } from "@/features/reporting/workstyle/narrative";
import { WorkstyleSignature } from "@/features/reporting/workstyle/WorkstyleSignature";
import "@/features/reporting/workstyle/report.css";

/**
 * Der Einzelreport (workstyle-report/1.0.0).
 *
 * Phase 11.7B - neue Gliederung, gleiche Aussagenlogik:
 * 1. kurze Einfuehrung
 * 2. "Deine Arbeitsweise auf einen Blick" (6 Bereichskarten)
 * 3. "Was bei dir besonders auffaellt" (nur getragene Richtungen; sonst entfaellt)
 * 4. Bereich fuer Bereich (Kernsatz; Einzelheiten eingeklappt)
 * 5. "Eine Frage fuer dich" (genau eine)
 * 6. "So liest du das"
 * 7. Anhang mit allen Antworten (eingeklappt; Druck nur in `full`)
 *
 * Seit Phase 10B keine Alltagsableitungen ueber die Situationen hinaus und
 * keine Saetze ueber Wirkung auf andere - das misst die Selbstauskunft nicht.
 * Jede Aussage traegt `data-claim` (interne Regel-ID, siehe narrative.ts).
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
  // Getragene Richtungen (nicht "teils/teils") in fester Bereichsreihenfolge -
  // keine Gewichtung, keine Auswahl nach "Wichtigkeit". Hoechstens drei.
  const findings = narratives.filter(({ narrative: n }) => n.pattern.kind === "direction" && n.pattern.band !== "middle").slice(0, 3);
  const question = questionForYou(profile);
  const other = perspective === "other";
  return (
    <div className={`ws-report space-y-10 ${full ? "ws-print-full" : ""}`} lang="de">
      <p className="max-w-3xl text-base leading-7 text-slate-700">
        {other
          ? `So geht ${name} in typischen Situationen des Gründeralltags vor – nach eigenen Antworten. Die Beschreibungen sind an ${name} gerichtet formuliert.`
          : "So gehst du in typischen Situationen des Gründeralltags vor – nach deinen eigenen Antworten. Kein Test mit richtig oder falsch, sondern ein Bild, über das du nachdenken und sprechen kannst."}
      </p>

      <WorkstyleGlance
        people={[{ id: profile.person_id, name, profile }]}
        title={other ? "Arbeitsweise auf einen Blick" : "Deine Arbeitsweise auf einen Blick"}
      />

      {findings.length > 0 && (
        <section aria-labelledby="ws-findings-title" className="ws-text-card rounded-3xl border border-violet-100 bg-violet-50/50 p-5 sm:p-6">
          <h2 id="ws-findings-title" className="text-xl font-semibold text-slate-950">
            {other ? "Was besonders auffällt" : "Was bei dir besonders auffällt"}
          </h2>
          <ul className="mt-4 space-y-3">
            {findings.map(({ area, narrative: n }) => (
              <li key={area.key} data-claim={n.claim} className="text-base leading-7 text-slate-800">
                <span className="font-semibold text-slate-950">{area.team}: </span>
                {n.core}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="ws-areas-title">
        <h2 id="ws-areas-title" className="text-xl font-semibold text-slate-950">Bereich für Bereich</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {narratives.map(({ area, narrative: n }) => {
            const hasDetails = n.situations.length > 0 || n.itemNotes.length > 0 || n.missing > 0;
            return (
              <section
                key={area.key}
                className="ws-text-card rounded-2xl border border-slate-200 bg-white p-5"
                aria-labelledby={`ws-area-${area.key}`}
                data-claim={n.claim}
              >
                <h3 id={`ws-area-${area.key}`} className="text-base font-semibold text-slate-950">
                  {area.team}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-800">{n.core}</p>
                {n.exception && <p className="mt-2 text-sm leading-6 text-slate-600">{n.exception}</p>}
                {n.note && <p className="mt-2 text-xs leading-5 text-slate-500">{n.note}</p>}
                {hasDetails && (
                  <details className="ws-details mt-3 border-t border-slate-100 pt-3" open={full}>
                    <summary className="cursor-pointer text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                      Die Situationen im Einzelnen
                    </summary>
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
                    {n.itemNotes.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                        {n.itemNotes.map((note) => (
                          <li key={note.claim} data-claim={note.claim}>
                            {note.text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {n.missing > 0 && (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Bei {n.missing === 1 ? "einer Situation" : `${n.missing} Situationen`} {n.missing === 1 ? "steht" : "stehen"} „Kann ich noch
                        nicht einschätzen“ – sie zählen hier nicht mit.
                      </p>
                    )}
                  </details>
                )}
              </section>
            );
          })}
        </div>
      </section>

      {question && (
        <section aria-labelledby="ws-question-title" className="ws-text-card rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50/70 to-violet-50/60 p-5 sm:p-6" data-claim={question.claim}>
          <h2 id="ws-question-title" className="text-xl font-semibold text-slate-950">
            {other ? "Eine Frage zum Weiterdenken" : "Eine Frage für dich"}
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-800">{question.question}</p>
        </section>
      )}

      <section aria-labelledby="ws-method-title" className="ws-text-card rounded-2xl border border-slate-200 bg-white/70 p-5">
        <h2 id="ws-method-title" className="text-base font-semibold">So liest du das</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {other
            ? `Alles hier stammt aus den Antworten von ${name} zu konkreten Arbeitssituationen.`
            : "Alles hier stammt aus deinen eigenen Antworten zu konkreten Arbeitssituationen."}{" "}
          Es beschreibt, wie in diesen Situationen typischerweise vorgegangen wird – keine Persönlichkeit, keine Eignung
          und keine Rangfolge. Das Instrument ist noch in Entwicklung und nicht validiert.{" "}
          {other
            ? "Wie dieses Vorgehen bei anderen ankommt, misst der Bericht nicht."
            : "Wie dein Vorgehen bei anderen ankommt, misst der Bericht nicht – das lässt sich nur im Gespräch herausfinden."}
        </p>
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
