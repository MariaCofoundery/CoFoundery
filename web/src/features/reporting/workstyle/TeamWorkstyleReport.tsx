import { workstyleSetupHref } from "./setupHandoff";
import Link from "next/link";
import {
  AREAS,
  distinctNames,
  validProductTeam,
  type AreaKey,
  type ProductTeam,
} from "@/features/reporting/workstyle/model";
import { teamAreaFinding, teamCard, type TeamAreaFinding } from "@/features/reporting/workstyle/narrative";
import { WorkstyleGlance } from "@/features/reporting/workstyle/WorkstyleGlance";
import { WorkstyleSignature } from "@/features/reporting/workstyle/WorkstyleSignature";
import { ComponentMatrix, openResponsibilityRows } from "@/features/reporting/workstyle/ComponentMatrix";
import { alignmentPatterns, readoutText } from "@/features/reporting/workstyle/alignmentModel";
import capabilityCopy from "../../../../messages/de/capability.json";
import setupCopy from "../../../../messages/de/teams.json";
import "@/features/reporting/workstyle/report.css";

type ConversationCard = { label: string; question: string; context: string | null; href: string | null; claim: string };

const areaName = (key: string) => (capabilityCopy.areaLabels as Record<string, string>)[key] ?? key;

/** Ein kurzer Satz je Bereichskarte - nie staerker als der Text darunter. */
const GLANCE_LINE: Record<TeamAreaFinding["kind"], string> = {
  similar: "Hier liegt ihr nah beieinander.",
  nuance: "Hier liegt ihr überwiegend nah beieinander.",
  opposite: "Hier geht ihr teils unterschiedlich heran.",
  insufficient: "Noch zu wenige gemeinsame Antworten.",
};

const DETAILS_SUMMARY_CLASS =
  "cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";

/**
 * Der Teamreport (workstyle-report/1.0.0) fuer 2-4 Founder.
 *
 * Die Frage ist nicht "Wie gut passt ihr?", sondern "Wie koennte eure
 * Zusammenarbeit aussehen - und worueber lohnt sich ein Gespraech?".
 *
 * Phase 11.7B - neue Gliederung, gleiche Befundlogik:
 * 1. "Euer Zusammenspiel auf einen Blick" (eine Spur je Person, auch zu zweit)
 * 2. "Was bei euch aehnlich ist" (nur gemeinsame klare Richtungen)
 * 3. "Wo ihr unterschiedlich an Dinge herangeht" (nur Gegenpole; Nuancen nicht prominent)
 * 4. "Hier lohnt sich ein Gespraech" (3-6 Karten, nicht nummeriert, keine Rangliste)
 * 5. Bereich fuer Bereich (eingeklappt)
 * 6. Faehigkeiten & Verantwortung
 * 7. Was ihr aufbauen wollt
 * 8. Was ihr bereits vereinbart habt
 * 9. "So lest ihr das"
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
    return <p>Die geteilten Arbeitsprofile sind noch nicht gemeinsam auswertbar.</p>;
  const team = { ...input, people: distinctNames(input.people) };
  const members = team.people.map((p) => ({ person_id: p.person_id, name: p.name, profile: p.workstyle }));
  const people = members.map((m) => ({ id: m.person_id, name: m.name, profile: m.profile }));
  const findings = AREAS.map((area) => ({ area, finding: teamAreaFinding(members, area.key) }));
  const similar = findings.filter(({ finding }) => finding.kind === "similar" && /SIMILAR\.(UPPER|LOWER)/.test(finding.claim));
  const close = findings.filter(({ finding }) => finding.kind === "similar" && finding.claim.endsWith("NO_DIRECTION"));
  const opposite = findings.filter(({ finding }) => finding.kind === "opposite");
  const alignment = alignmentPatterns(team.people);
  const answered = alignment.filter((a) => a.entries.some((e) => e.entry));
  const differing = answered.filter((a) => a.different || a.ambiguous);
  const similarVenture = answered.filter((a) => !a.different && !a.ambiguous && a.status === "Ähnliche Erwartungen");
  const incomplete = answered.filter((a) => a.status === "Noch offen");
  const setupHref = (area: AreaKey) => (canDiscuss ? workstyleSetupHref(team.team_id, area) : null);
  const rolesHref = canDiscuss ? `/teams/${encodeURIComponent(team.team_id)}/setup/roles_responsibilities` : null;

  // --- Gespraechskarten: jede aus einem Befund, feste Reihenfolge, keine Rangliste ---
  const workstyleCards: ConversationCard[] = opposite.map(({ area, finding }) => ({
    ...teamCard(area.key),
    context: finding.situations[0] ? `Etwa: ${finding.situations[0].label}.` : null,
    href: setupHref(area.key),
    claim: finding.claim,
  }));
  const otherCards: ConversationCard[] = [
    ...openResponsibilityRows(team.people, team.taxonomy.areas).slice(0, 2).map((row) => ({
      label: "Verantwortung",
      question: row.states.includes("OPEN_INTERNAL")
        ? `Für ${areaName(row.area.area_id)} möchte bisher niemand Verantwortung übernehmen. Wer kümmert sich – oder lösen wir es extern?`
        : `Für ${areaName(row.area.area_id)} möchten mehrere Verantwortung übernehmen. Wer verantwortet es, und wer unterstützt?`,
      context: null,
      href: rolesHref,
      claim: row.states.includes("OPEN_INTERNAL") ? "CAPABILITY.OPEN_INTERNAL" : "CAPABILITY.MULTI_COVERED",
    })),
    ...[...new Set(differing.filter((a) => a.different).map((a) => a.item.section))].slice(0, 2).map((section) => ({
      label: "Vorhaben",
      question: `Ihr erwartet bei „${section.replace(/^[A-Z/]+ – /, "")}“ Unterschiedliches. Was soll für euer Vorhaben gelten?`,
      context: null,
      href: null,
      claim: `VENTURE.DIFFERENT.${section}`,
    })),
  ];
  // Hoechstens sechs Karten; Verantwortung und Vorhaben behalten bis zu zwei
  // Plaetze, auch wenn sich die Arbeitsweisen in allen Bereichen unterscheiden.
  const cards: ConversationCard[] = [
    ...workstyleCards.slice(0, 6 - Math.min(2, otherCards.length)),
    ...otherCards,
  ].slice(0, 6);
  // Weniger als drei Befunde: gemeinsame Richtungen, dann die uebrigen Bereiche
  // in fester Reihenfolge - als Einladung, nicht als Befund.
  for (const { area, finding } of [...similar, ...findings.filter((f) => !similar.includes(f) && !opposite.includes(f))]) {
    if (cards.length >= 3) break;
    cards.push({
      label: teamCard(area.key).label,
      question: finding.kind === "similar" && finding.question ? finding.question : teamCard(area.key).question,
      context: null,
      href: setupHref(area.key),
      claim: `AGENDA.${finding.claim}`,
    });
  }
  const shownCards = cards.slice(0, 6);

  return (
    <div className={`ws-report space-y-12 ${full ? "ws-print-full" : ""}`} lang="de">
      <WorkstyleGlance
        people={people}
        title="Euer Zusammenspiel auf einen Blick"
        intro={`Eine Spur je Person: so liegen ${new Intl.ListFormat("de", { type: "conjunction" }).format(team.people.map((p) => p.name))} in den sechs Bereichen nebeneinander – nach euren eigenen Antworten.`}
        sentences={Object.fromEntries(findings.map(({ area, finding }) => [area.key, GLANCE_LINE[finding.kind]]))}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="ws-similar-title" className="ws-text-card rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 id="ws-similar-title" className="text-xl font-semibold text-slate-950">Was bei euch ähnlich ist</h2>
          {similar.length ? (
            <ul className="mt-3 space-y-3">
              {similar.map(({ area, finding }) => (
                <li key={area.key} className="text-sm leading-6 text-slate-800" data-claim={finding.claim}>
                  <span className="font-semibold text-slate-950">{area.team}: </span>
                  {finding.summary}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">In keinem Bereich zeigen eure Antworten gemeinsam klar in eine Richtung.</p>
          )}
          {close.length > 0 && (
            <p className="mt-3 text-sm leading-6 text-slate-600">Nah beieinander liegt ihr außerdem bei: {close.map(({ area }) => area.team).join(", ")}.</p>
          )}
        </section>
        <section aria-labelledby="ws-differ-title" className="ws-text-card rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 id="ws-differ-title" className="text-xl font-semibold text-slate-950">Wo ihr unterschiedlich an Dinge herangeht</h2>
          {opposite.length ? (
            <ul className="mt-3 space-y-3">
              {opposite.map(({ area, finding }) => (
                <li key={area.key} className="text-sm leading-6 text-slate-800" data-claim={finding.claim}>
                  <span className="font-semibold text-slate-950">{area.team}: </span>
                  {finding.summary}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Deutliche Unterschiede gibt es in euren Antworten nicht. Kleinere Unterschiede stehen unten Bereich für Bereich.
            </p>
          )}
        </section>
      </div>

      <section id="gespraech" aria-labelledby="ws-talk-title">
        <h2 id="ws-talk-title" className="text-2xl font-semibold tracking-tight text-slate-950">Hier lohnt sich ein Gespräch</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Jede Frage ergibt sich aus euren Antworten, euren Angaben zu Verantwortung oder euren Erwartungen an das Vorhaben.
          Die Reihenfolge ist keine Rangfolge.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shownCards.map((card) => (
            <li key={card.question} className="ws-talk-card ws-text-card flex flex-col rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-4" data-claim={card.claim}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">{card.label}</p>
              <p className="mt-2 text-base font-medium leading-7 text-slate-900">{card.question}</p>
              {card.context && <p className="mt-2 text-xs leading-5 text-slate-500">{card.context}</p>}
              {card.href && (
                <Link className="ws-no-print mt-auto pt-3 text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950" href={card.href}>
                  Im Founder Setup festhalten
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          Haltet fest, welche Absprache ihr ausprobiert und wann ihr sie gemeinsam überprüft. Eine Absprache gilt erst, wenn
          alle sie im Founder Setup bestätigt haben.
        </p>
      </section>

      <section id="arbeitsweisen" aria-labelledby="ws-work-title">
        <h2 id="ws-work-title" className="text-2xl font-semibold tracking-tight text-slate-950">Bereich für Bereich</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Die Einzelheiten je Bereich – aufklappen, wenn ihr tiefer einsteigen wollt. Gruppen erscheinen in der Reihenfolge
          der Antwortskala, nicht nach Größe.
        </p>
        <div className="mt-4 grid gap-3">
          {findings.map(({ area, finding }) => (
            <AreaDetails key={area.key} title={area.team} finding={finding} href={setupHref(area.key)} open={full} />
          ))}
        </div>
        <details className="ws-appendix mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4" open={full}>
          <summary className={DETAILS_SUMMARY_CLASS}>Alle Antworten im Detail</summary>
          <div className="mt-5">
            <WorkstyleSignature people={people} />
          </div>
        </details>
      </section>

      <ComponentMatrix people={team.people} areas={team.taxonomy.areas} />

      <section id="venture" aria-labelledby="ws-venture-title">
        <h2 id="ws-venture-title" className="text-2xl font-semibold tracking-tight text-slate-950">Was ihr aufbauen wollt</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Getrennt von euren Arbeitsweisen: eure Wünsche und Erwartungen an dieses konkrete Vorhaben – kein beobachtetes
          Verhalten und noch keine Vereinbarung. Fehlende Antworten sind keine Aussage über eine Person.
        </p>
        {!answered.length ? (
          <p className="mt-4 text-sm">
            Für dieses Vorhaben hat noch niemand Antworten abgegeben. Abgegebene Antworten sehen alle im Team.
            {/* Phase 12C.1C: Der Fragebogen ist ein Founder-Weg - Advisors (canDiscuss=false) sehen keinen CTA. */}
            {canDiscuss ? (
              <>
                {" "}
                <Link className="underline" href={`/founder-alignment/vorhaben?venture=${team.team_id}`}>
                  Zum Fragebogen
                </Link>
              </>
            ) : null}
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
                      <article key={a.item.itemId} className="ws-text-card mt-3 rounded-xl border border-slate-200 bg-white p-4">
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
            {similarVenture.length > 0 && (
              <details className="ws-appendix mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4" open={full}>
                <summary className={DETAILS_SUMMARY_CLASS}>Ähnlich beantwortete Fragen ({similarVenture.length})</summary>
                <ul className="mt-4 space-y-2 text-sm leading-6">
                  {similarVenture.map((a) => (
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
        <h2 id="ws-setup-title" className="text-2xl font-semibold tracking-tight text-slate-950">Was ihr bereits vereinbart habt</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Nur Vereinbarungen aus Founder Setup, die alle aktuellen Mitglieder bestätigt haben. Alles andere ist noch nicht
          vereinbart – auch dort, wo ihr ähnlich antwortet.
        </p>
        {team.setup.length ? (
          <div className="mt-5 grid gap-4">
            {team.setup.map((s) => (
              <article key={s.item_key} className="ws-text-card rounded-xl border border-slate-200 bg-white p-4">
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

      <section aria-labelledby="ws-team-method-title" className="ws-text-card rounded-2xl border border-slate-200 bg-white/70 p-5">
        <h2 id="ws-team-method-title" className="text-base font-semibold">So lest ihr das</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Dieser Bericht stellt eure Selbstauskünfte nebeneinander. Er sagt nicht, wie gut ihr zusammenpasst, sondern zeigt,
          wie eure Zusammenarbeit aussehen könnte und worüber sich ein Gespräch lohnt. Ähnlichkeit ist kein Ziel, ein
          Unterschied kein Makel – beides sind Gesprächsanlässe, keine Bewertung. Wie euer Vorgehen beim jeweils anderen
          ankommt, misst der Bericht nicht. Das Workstyle-Instrument ist noch in Entwicklung.
        </p>
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

function AreaDetails({ title, finding, href, open }: { title: string; finding: TeamAreaFinding; href: string | null; open: boolean }) {
  return (
    <details className="ws-details ws-text-card rounded-2xl border border-slate-200 bg-white p-4" data-claim={finding.claim} open={open}>
      <summary className={`${DETAILS_SUMMARY_CLASS} ws-summary-keep`}>
        <span className="text-base font-semibold text-slate-950">{title}</span>
        <span className="ml-2 text-sm font-normal text-slate-500">{GLANCE_LINE[finding.kind]}</span>
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-800">{finding.summary}</p>
      {finding.situations.map((s) => (
        <div key={s.item} className="mt-3 border-t border-slate-100 pt-3">
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
      {finding.hypothesis && <p className="mt-3 text-sm leading-6 text-slate-700">{finding.hypothesis}</p>}
      {finding.question && <p className="mt-3 text-sm font-medium leading-6">{finding.question}</p>}
      {href && finding.question && (
        <Link className="ws-no-print mt-2 inline-block text-sm underline" href={href}>
          Im Founder Setup festhalten
        </Link>
      )}
    </details>
  );
}
