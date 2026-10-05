import { workstyleSetupHref } from "./setupHandoff";
import { SignatureOverview } from "@/features/reporting/workstyle/SignatureOverview";
import Link from "next/link";
import {
  AREAS,
  distinctNames,
  validProductTeam,
  type AreaKey,
  type ProductTeam,
} from "@/features/reporting/workstyle/model";
import { teamAreaFinding, type TeamAreaFinding } from "@/features/reporting/workstyle/narrative";
import { WorkstyleSignature } from "@/features/reporting/workstyle/WorkstyleSignature";
import { ComponentMatrix, ComponentSummary } from "@/features/reporting/workstyle/ComponentMatrix";
import { componentRows } from "@/features/reporting/workstyle/componentsModel";
import { alignmentPatterns, readoutText } from "@/features/reporting/workstyle/alignmentModel";
import capabilityCopy from "../../../../messages/de/capability.json";
import setupCopy from "../../../../messages/de/teams.json";
import "@/features/reporting/workstyle/report.css";

type AgendaItem = { text: string; source: string; href: string | null; claim: string };

const areaName = (key: string) => (capabilityCopy.areaLabels as Record<string, string>)[key] ?? key;

/**
 * Der Teamreport (workstyle-report/1.0.0) fuer 2-4 Founder.
 *
 * Die Frage ist nicht "Wie gut passt ihr?", sondern "Wie koennte eure
 * Zusammenarbeit aussehen - und was solltet ihr frueh besprechen?".
 *
 * Seit Phase 10:
 * - Die Gespraechsagenda steht vorn und entsteht nur aus tatsaechlichen
 *   Befunden (Gegenpole, gemeinsame Richtungen, offene Verantwortung,
 *   unterschiedliche Venture-Erwartungen) - nicht mehr eine Frage je Bereich.
 * - Interaktionshypothesen nur bei echten Gegenpolen, immer als Moeglichkeit
 *   mit Arbeitskontext und Gespraechsfrage. Nuancen werden als Nuancen benannt.
 * - Jede Venture-Frage steht nur einmal im Text; aehnlich beantwortete Fragen
 *   und alle Einzelantworten stehen im Anhang (Druck nur in `full`).
 */
export function TeamWorkstyleReport({
  team: input,
  canDiscuss = false,
  full = false,
}: {
  team: ProductTeam;
  canDiscuss?: boolean;
  full?: boolean;
}) {
  if (!validProductTeam(input))
    return <p>Die freigegebenen Arbeitsprofile sind noch nicht gemeinsam auswertbar.</p>;
  const team = { ...input, people: distinctNames(input.people) };
  const members = team.people.map((p) => ({ person_id: p.person_id, name: p.name, profile: p.workstyle }));
  const findings = AREAS.map((area) => ({ area, finding: teamAreaFinding(members, area.key) }));
  const alignment = alignmentPatterns(team.people);
  const answered = alignment.filter((a) => a.entries.some((e) => e.entry));
  const differing = answered.filter((a) => a.different || a.ambiguous);
  const similar = answered.filter((a) => !a.different && !a.ambiguous && a.status === "Ähnliche Erwartungen");
  const incomplete = answered.filter((a) => a.status === "Noch offen");
  const setupHref = (area: AreaKey) => (canDiscuss ? workstyleSetupHref(team.team_id, area) : null);

  // --- Agenda: jede Frage aus einem Befund ---
  const agenda: AgendaItem[] = [];
  for (const { area, finding } of findings)
    if (finding.kind === "opposite" && finding.question)
      agenda.push({ text: finding.question, source: area.team, href: setupHref(area.key), claim: finding.claim });
  const rows = componentRows(team.people, team.taxonomy.areas).filter((r) => r.cells.some((c) => c.entry));
  const rolesHref = canDiscuss ? `/teams/${encodeURIComponent(team.team_id)}/setup/roles_responsibilities` : null;
  const open = rows.filter((r) => r.states.includes("OPEN_INTERNAL"));
  if (open.length)
    agenda.push({
      text: `${open.map((r) => areaName(r.area.area_id)).join(", ")}: Das sollte im Team liegen, aber bisher möchte es niemand verantworten. Wer kümmert sich darum?`,
      source: "Verantwortung",
      href: rolesHref,
      claim: "CAPABILITY.OPEN_INTERNAL",
    });
  for (const r of rows.filter((r) => r.states.includes("MULTI_COVERED")))
    agenda.push({
      text: `${areaName(r.area.area_id)}: Mehrere möchten das verantworten. Wer verantwortet es, und wer unterstützt?`,
      source: "Verantwortung",
      href: rolesHref,
      claim: "CAPABILITY.MULTI_COVERED",
    });
  for (const a of differing.filter((a) => a.different).slice(0, 3))
    agenda.push({
      text: `Ihr habt unterschiedlich geantwortet: „${a.item.prompt}“ Welche Erwartung soll für euer Vorhaben gelten?`,
      source: "Vorhaben",
      href: null,
      claim: `VENTURE.DIFFERENT.${a.item.itemId}`,
    });
  for (const { area, finding } of findings)
    if (finding.kind === "similar" && finding.question)
      agenda.push({ text: finding.question, source: area.team, href: setupHref(area.key), claim: finding.claim });
  if (!agenda.length)
    agenda.push({
      text: "In welcher konkreten Situation möchtet ihr prüfen, ob eure ähnlichen Antworten auch eure Zusammenarbeit beschreiben?",
      source: "Zusammenarbeit",
      href: null,
      claim: "AGENDA.NO_FINDING",
    });
  const shownAgenda = agenda.slice(0, 8);

  return (
    <div className={`ws-report space-y-12 ${full ? "ws-print-full" : ""}`} lang="de">
      <section aria-labelledby="ws-glance-title">
        <h2 id="ws-glance-title" className="text-2xl font-semibold">Auf einen Blick</h2>
        <p className="mt-3 leading-7">{team.people.map((p) => p.name).join(" · ")}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Dieser Bericht stellt eure Selbstauskünfte nebeneinander. Er sagt nicht, wie gut ihr zusammenpasst, sondern
          zeigt, wie eure Zusammenarbeit aussehen könnte und was ihr früh besprechen solltet. Ähnlichkeiten und
          Unterschiede sind Gesprächsanlässe, keine Bewertung. Das Workstyle-Instrument ist noch in Entwicklung.
        </p>
        <SignatureOverview people={members.map((m) => ({ id: m.person_id, name: m.name, profile: m.profile }))} />
        <ComponentSummary team={team} />
        <nav className="ws-no-print mt-5 flex flex-wrap gap-4 text-sm underline" aria-label="Reportabschnitte">
          <a href="#agenda">Worüber ihr sprechen solltet</a>
          <a href="#arbeitsweisen">Wie ihr arbeitet</a>
          <a href="#komponenten">Fähigkeiten & Verantwortung</a>
          <a href="#venture">Was ihr aufbauen wollt</a>
          <a href="#vereinbarungen">Was ihr vereinbart habt</a>
        </nav>
      </section>

      <section id="agenda" aria-labelledby="ws-agenda-title">
        <h2 id="ws-agenda-title" className="text-2xl font-semibold">Worüber ihr früh sprechen solltet</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Jede Frage ergibt sich aus einem Befund weiter unten – zuerst gegensätzliche Arbeitsweisen, dann offene
          Verantwortung und unterschiedliche Erwartungen an das Vorhaben. Die Reihenfolge ist keine Rangfolge der
          Schwere.
        </p>
        <ol className="mt-4 list-decimal space-y-4 pl-5">
          {shownAgenda.map((q) => (
            <li key={q.text} className="pl-1 leading-7" data-claim={q.claim}>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{q.source}</span>
              <br />
              {q.text}
              {q.href && (
                <>
                  {" "}
                  <Link className="ws-no-print text-sm underline" href={q.href}>
                    Im Founder Setup besprechen
                  </Link>
                </>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm leading-6">
          Haltet fest, welche Absprache ihr ausprobiert und wann ihr sie gemeinsam überprüft. Eine Absprache gilt erst,
          wenn alle sie im Founder Setup bestätigt haben.
        </p>
      </section>

      <section id="arbeitsweisen" aria-labelledby="ws-work-title">
        <h2 id="ws-work-title" className="mb-2 text-2xl font-semibold">Wie ihr arbeitet</h2>
        <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-600">
          Wie ihr typischerweise in konkreten Arbeitssituationen vorgeht. Gruppen erscheinen in der Reihenfolge der
          Antwortskala, nicht nach Größe – eine einzelne abweichende Antwort ist genauso gültig wie die anderen.
        </p>
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {findings.map(({ area, finding }) => (
            <AreaCard key={area.key} title={area.team} finding={finding} href={setupHref(area.key)} />
          ))}
        </div>
        <details className="ws-appendix rounded-2xl border border-slate-200 bg-white/70 p-4" open={full}>
          <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
            Alle Antworten im Detail
          </summary>
          <div className="mt-5">
            <WorkstyleSignature people={members.map((m) => ({ id: m.person_id, name: m.name, profile: m.profile }))} />
          </div>
        </details>
      </section>

      <ComponentMatrix team={team} />

      <section id="venture" aria-labelledby="ws-venture-title">
        <h2 id="ws-venture-title" className="text-2xl font-semibold">Was ihr aufbauen wollt</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Getrennt von euren Arbeitsweisen: eure Wünsche und Erwartungen an dieses konkrete Vorhaben – kein beobachtetes
          Verhalten und noch keine Vereinbarung. Nicht sichtbare Antworten sind keine Aussage über eine Person.
        </p>
        {!answered.length ? (
          <p className="mt-4 text-sm">
            Für dieses Vorhaben sind noch keine Antworten sichtbar. Eigene Angaben und Freigaben findet ihr unter{" "}
            <Link className="underline" href={`/founder-alignment/vorhaben?venture=${team.team_id}`}>
              Was ihr aufbauen wollt
            </Link>
            .
          </p>
        ) : (
          <>
            {differing.length > 0 ? (
              [...new Set(differing.map((a) => a.item.section))].map((section) => (
                <section key={section} className="mt-6">
                  <h3 className="text-lg font-semibold">{section.replace(/^[A-Z/]+ – /, "")}</h3>
                  {differing
                    .filter((a) => a.item.section === section)
                    .map((a) => (
                      <article key={a.item.itemId} className="ws-text-card mt-3 rounded-xl border border-slate-200 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{a.status}</p>
                        <p className="mt-1 text-sm font-medium leading-6">{a.item.prompt}</p>
                        {a.ambiguous && (
                          <p className="mt-2 text-sm leading-6">
                            Diese Frage bezieht sich auf eine einzelne andere Person. Bei mehr als zwei Foundern ist
                            nicht eindeutig, wer gemeint war; deshalb wird daraus kein Teamvergleich abgeleitet.
                          </p>
                        )}
                        <ul className="mt-2 space-y-1 text-sm leading-6">
                          {groupedAnswers(a.entries).map((g) => (
                            <li key={g.names.join()}>
                              <span className="font-medium">{g.names.join(", ")}:</span> {g.text}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                </section>
              ))
            ) : (
              <p className="mt-4 text-sm">In den gemeinsam beantworteten Fragen habt ihr ähnliche Erwartungen.</p>
            )}
            {incomplete.length > 0 && (
              <p className="mt-4 text-sm text-slate-600">
                Zu {incomplete.length === 1 ? "einer Frage" : `${incomplete.length} Fragen`} liegen noch nicht von allen
                Antworten vor.
              </p>
            )}
            {similar.length > 0 && (
              <details className="ws-appendix mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4" open={full}>
                <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                  Ähnlich beantwortete Fragen ({similar.length})
                </summary>
                <ul className="mt-4 space-y-2 text-sm leading-6">
                  {similar.map((a) => (
                    <li key={a.item.itemId}>
                      {a.item.prompt} <span className="text-slate-600">– {readoutText(a.entries[0].entry)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      <section id="vereinbarungen" aria-labelledby="ws-setup-title">
        <h2 id="ws-setup-title" className="text-2xl font-semibold">Was ihr bereits vereinbart habt</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Nur Vereinbarungen aus Founder Setup, die alle aktuellen Mitglieder bestätigt haben. Alles andere ist noch nicht
          vereinbart – auch dort, wo ihr ähnlich antwortet.
        </p>
        {team.setup.length ? (
          <div className="mt-5 grid gap-4">
            {team.setup.map((s) => (
              <article key={s.item_key} className="ws-text-card rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold">
                  {(setupCopy.setup.items as Record<string, { title: string }>)[s.item_key]?.title ?? s.item_key}
                </h3>
                <p className="mt-2 text-sm">
                  {(setupCopy.setup.outcomes as Record<string, string>)[s.resolution_status] ?? s.resolution_status}
                </p>
                {s.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{s.note}</p>}
                <p className="mt-2 text-xs text-slate-500">Bestätigt am {new Date(s.confirmed_at).toLocaleDateString("de-DE")}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm">Es gibt noch keine Vereinbarungen, die alle aktuellen Mitglieder bestätigt haben.</p>
        )}
        {team.setup_available && (
          <Link className="ws-no-print mt-4 inline-block underline" href={`/teams/${team.team_id}/setup`}>
            Founder Setup öffnen
          </Link>
        )}
      </section>
    </div>
  );
}

/**
 * Gleiche Antworten zusammengefasst, in der Reihenfolge der Personen - nicht
 * nach Gruppengroesse. Eine einzelne Antwort steht gleichwertig neben einer
 * Gruppe; es gibt keine Mehrheit.
 */
function groupedAnswers(entries: { personId: string; name: string; entry: Parameters<typeof readoutText>[0] }[]) {
  const groups: { names: string[]; text: string }[] = [];
  for (const e of entries) {
    const text = readoutText(e.entry) ?? "Keine Antwort sichtbar";
    const group = groups.find((g) => g.text === text);
    if (group) group.names.push(e.name);
    else groups.push({ names: [e.name], text });
  }
  return groups;
}

function AreaCard({ title, finding, href }: { title: string; finding: TeamAreaFinding; href: string | null }) {
  return (
    <article className="ws-text-card rounded-2xl border border-slate-200 bg-white p-5" data-claim={finding.claim}>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6">{finding.summary}</p>
      {finding.situations.map((s) => (
        <div key={s.item} className="mt-4 border-t border-slate-200 pt-3">
          <p className="text-sm font-medium leading-6">{s.label.charAt(0).toUpperCase() + s.label.slice(1)}</p>
          <ul className="mt-1 space-y-1 text-sm leading-6">
            {s.groups.map((g) => (
              <li key={g.names.join()}>
                <span className="font-medium">{g.names.join(", ")}:</span> {g.answers.join(" / ")}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {finding.hypothesis && <p className="mt-4 text-sm leading-6">{finding.hypothesis}</p>}
      {finding.question && (
        <p className="mt-3 text-sm font-medium leading-6">{finding.question}</p>
      )}
      {href && finding.question && (
        <Link className="ws-no-print mt-3 inline-block text-sm underline" href={href}>
          Im Founder Setup besprechen
        </Link>
      )}
    </article>
  );
}
