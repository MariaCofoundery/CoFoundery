import type { AppLocale } from "@/i18n/config";
import { reportText, workstyleAreas } from "./display";
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
 * 2. reportText(locale, "Deine Arbeitsweise auf einen Blick", "Your workstyle at a glance") (6 Bereichskarten)
 * 3. "Was bei dir besonders auffaellt" (nur getragene Richtungen; sonst entfaellt)
 * 4. Bereich fuer Bereich (Kernsatz; Einzelheiten eingeklappt)
 * 5. "Eine Frage fuer dich" (genau eine)
 * 6. reportText(locale, "So liest du das", "How to read this report")
 * 7. Anhang mit allen Antworten (eingeklappt; Druck nur in `full`)
 *
 * Seit Phase 10B keine Alltagsableitungen ueber die Situationen hinaus und
 * keine Saetze ueber Wirkung auf andere - das misst die Selbstauskunft nicht.
 * Jede Aussage traegt `data-claim` (interne Regel-ID, siehe narrative.ts).
 */
export function IndividualWorkstyle({
  profile,
  name: suppliedName,
  locale = "de",
  full = false,
  perspective = "self",
}: {
  profile: ProductProfile;
  name?: string;
  locale?: AppLocale;
  full?: boolean;
  /** "other": eine freigegebene Ansicht fuer jemand anderen (Advisor). */
  perspective?: "self" | "other";
}) {
  if (!validProductProfile(profile)) return null;
  const name = suppliedName ?? reportText(locale, "Du", "You");
  const narratives = individualNarratives(profile, locale).map(entry => ({...entry, area: workstyleAreas(locale).find(a => a.key === entry.area.key)!}));
  // Getragene Richtungen (nicht "teils/teils") in fester Bereichsreihenfolge -
  // keine Gewichtung, keine Auswahl nach "Wichtigkeit". Hoechstens drei.
  const findings = narratives.filter(({ narrative: n }) => n.pattern.kind === "direction" && n.pattern.band !== "middle").slice(0, 3);
  const question = questionForYou(profile, locale);
  const other = perspective === "other";
  return (
    <div className={`ws-report space-y-10 ${full ? "ws-print-full" : ""}`} lang={locale}>
      <p className="max-w-3xl text-base leading-7 text-slate-700">
        {other
          ? locale === "en" ? `This report describes how ${name} approaches everyday work situations, based on their own responses. The descriptions address ${name} directly.` : `So geht ${name} in typischen Situationen des Gründeralltags vor – nach eigenen Antworten. Die Beschreibungen sind an ${name} gerichtet formuliert.`
          : reportText(locale, "So gehst du in typischen Situationen des Gründeralltags vor – nach deinen eigenen Antworten. Kein Test mit richtig oder falsch, sondern ein Bild, über das du nachdenken und sprechen kannst.", "This report describes how you approach everyday situations, based on your own responses. There are no right or wrong answers. Use it to reflect and start a conversation.")}
      </p>

      <WorkstyleGlance
        locale={locale}
        people={[{ id: profile.person_id, name, profile }]}
        title={other ? reportText(locale, "Arbeitsweise auf einen Blick", "Workstyle at a glance") : reportText(locale, "Deine Arbeitsweise auf einen Blick", "Your workstyle at a glance")}
      />

      {findings.length > 0 && (
        <section aria-labelledby="ws-findings-title" className="ws-text-card rounded-3xl border border-violet-100 bg-violet-50/50 p-5 sm:p-6">
          <h2 id="ws-findings-title" className="text-xl font-semibold text-slate-950">
            {other ? reportText(locale, "Was besonders auffällt", "Patterns in the responses") : reportText(locale, "Was bei dir besonders auffällt", "Patterns in your responses")}
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
        <h2 id="ws-areas-title" className="text-xl font-semibold text-slate-950">{reportText(locale, "Bereich für Bereich", "Each area in detail")}</h2>
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
                      {reportText(locale, "Die Situationen im Einzelnen", "The situations in detail")}
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
                        {locale === "en" ? `${n.missing} ${n.missing === 1 ? "situation has" : "situations have"} the response “I cannot assess this yet”. These are not included here.` : <>Bei {n.missing === 1 ? "einer Situation" : `${n.missing} Situationen`} {n.missing === 1 ? "steht" : "stehen"} „Kann ich noch nicht einschätzen“ – sie zählen hier nicht mit.</>}
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
            {other ? reportText(locale, "Eine Frage zum Weiterdenken", "A question to reflect on") : reportText(locale, "Eine Frage für dich", "A question to reflect on")}
          </h2>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-800">{question.question}</p>
        </section>
      )}

      <section aria-labelledby="ws-method-title" className="ws-text-card rounded-2xl border border-slate-200 bg-white/70 p-5">
        <h2 id="ws-method-title" className="text-base font-semibold">{reportText(locale, "So liest du das", "How to read this report")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {other
            ? locale === "en" ? `Everything here comes from ${name}’s responses to specific work situations.` : `Alles hier stammt aus den Antworten von ${name} zu konkreten Arbeitssituationen.`
            : reportText(locale, "Alles hier stammt aus deinen eigenen Antworten zu konkreten Arbeitssituationen.", "Everything here comes from your own responses to specific work situations.")}{" "}
          {reportText(locale, "Es beschreibt, wie in diesen Situationen typischerweise vorgegangen wird – keine Persönlichkeit, keine Eignung und keine Rangfolge. Das Instrument ist noch in Entwicklung und nicht validiert.", "It describes typical approaches in these situations, not personality or suitability, and does not rank people. The instrument is still in development and has not been validated.")}{" "}
          {other
            ? reportText(locale, "Wie dieses Vorgehen bei anderen ankommt, misst der Bericht nicht.", "This report does not measure how other people experience this approach.")
            : reportText(locale, "Wie dein Vorgehen bei anderen ankommt, misst der Bericht nicht – das lässt sich nur im Gespräch herausfinden.", "This report does not measure how other people experience your approach. That is something to explore in a conversation.")}
        </p>
      </section>

      <details className="ws-appendix rounded-2xl border border-slate-200 bg-white/70 p-4" open={full}>
        <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
          {reportText(locale, "Alle Antworten im Detail", "All responses in detail")}
        </summary>
        <div className="mt-5">
          <WorkstyleSignature locale={locale} people={[{ id: profile.person_id, name, profile }]} />
        </div>
      </details>
    </div>
  );
}
