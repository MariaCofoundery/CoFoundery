import { workstyleSetupHref } from "./setupHandoff";
import { SignatureOverview } from "@/features/reporting/workstyle/SignatureOverview";
import Link from "next/link";
import {
  teamPatterns,
  validProductTeam,
  type ProductTeam,
} from "@/features/reporting/workstyle/model";
import { WorkstyleSignature } from "@/features/reporting/workstyle/WorkstyleSignature";
import {
  ComponentMatrix,
  ComponentSummary,
} from "@/features/reporting/workstyle/ComponentMatrix";
import { alignmentPatterns } from "@/features/reporting/workstyle/alignmentModel";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import setupCopy from "../../../../messages/de/teams.json";
import "@/features/reporting/workstyle/report.css";

export function TeamWorkstyleReport({ team, canDiscuss = false }: { team: ProductTeam; canDiscuss?: boolean }) {
  if (!validProductTeam(team))
    return (
      <p>
        Die freigegebenen Arbeitsprofile sind noch nicht gemeinsam auswertbar.
      </p>
    );
  const patterns = teamPatterns(team.people);
  const alignment = alignmentPatterns(team.people);
  const visibleAlignment = alignment.filter((a) =>
    a.entries.some((e) => e.entry),
  );
  const agenda = [
    ...patterns
      .filter(
        (p) =>
          p.category === "DIFFERENT_PATTERN" ||
          p.category === "INSUFFICIENT_DATA",
      )
      .map((p) => p.question),
    ...alignment
      .filter((a) => a.different)
      .slice(0, 3)
      .map(
        (a) =>
          `Welche gemeinsame Absprache braucht ihr zu dieser Frage: ${a.item.prompt}`,
      ),
  ];
  if (!agenda.length)
    agenda.push(
      "In welcher konkreten Situation möchtet ihr prüfen, ob eure ähnlichen Antworten auch eure Zusammenarbeit beschreiben?",
    );
  return (
    <div className="ws-report space-y-12" lang="de">
      <section>
        <h2 className="text-2xl font-semibold">Auf einen Blick</h2>
        <p className="mt-3 leading-7">
          {team.people.map((p) => p.name).join(" · ")}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Dieser Report stellt eure Selbstauskünfte gegenüber. Das
          Workstyle-Instrument ist noch nicht validiert. Unterschiede sind
          Gesprächsanlässe; mögliche Ergänzungen sind Hypothesen für eure
          Zusammenarbeit.
        </p>
        <SignatureOverview
          people={team.people.map((p) => ({
            id: p.person_id,
            name: p.name,
            profile: p.workstyle,
          }))}
        />
        <ComponentSummary team={team} />
        <ol className="mt-5 list-decimal space-y-3 pl-5">
          {agenda.slice(0, 5).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <nav
          className="ws-no-print mt-5 flex flex-wrap gap-4 text-sm underline"
          aria-label="Reportabschnitte"
        >
          <a href="#arbeitsweisen">Wie ihr arbeitet</a>
          <a href="#komponenten">Team-Komponenten</a>
          <a href="#venture">Venture Alignment</a>
          <a href="#vereinbarungen">Vereinbarungen</a>
          <a href="#agenda">Gesprächsagenda</a>
        </nav>
      </section>
      <section id="arbeitsweisen">
        <h2 className="mb-6 text-2xl font-semibold">Wie ihr arbeitet</h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {patterns.map((p) => (
            <article
              key={p.key}
              className="ws-text-card rounded-2xl border border-slate-200 bg-white p-5"
            >
              <h3 className="font-semibold">{p.team}</h3>
              <p className="mt-3 text-sm leading-6">{p.summary}</p>
              <p className="mt-2 text-sm text-slate-600">
                Ähnlich beantwortete Situationen: {p.similar}. Unterschiedliche
                Antwortbereiche: {p.different}. Noch nicht gemeinsam
                beschrieben: {p.missing}.
              </p>
              {p.groups.map((g) => (
                <div
                  key={g.prompt}
                  className="mt-4 border-t border-slate-200 pt-3"
                >
                  <p className="text-sm leading-6">{g.prompt}</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {g.groups.map((group) => (
                      <li key={group.band}>
                        <b>{group.names.join(", ")}</b>:{" "}
                        {group.answers.join(" / ")}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {p.complement && (
                <p className="mt-3 text-sm leading-6">{p.complement.text}</p>
              )}
              <p className="mt-4 text-sm font-medium">{p.question}</p>
              {canDiscuss && <Link className="ws-no-print mt-3 inline-block text-sm underline" href={workstyleSetupHref(team.team_id, p.key)}>Im Founder Setup besprechen</Link>}
            </article>
          ))}
        </div>
        <WorkstyleSignature
          people={team.people.map((p) => ({
            id: p.person_id,
            name: p.name,
            profile: p.workstyle,
          }))}
        />
      </section>
      <ComponentMatrix team={team} />
      <section id="venture">
        <h2 className="text-2xl font-semibold">Was ihr aufbauen wollt</h2>
        <p className="mt-3 leading-7 text-slate-600">
          Venture Alignment zeigt Erwartungen an dieses konkrete Vorhaben. Nicht
          sichtbare Antworten sind keine Aussage über die Person.
        </p>
        {!visibleAlignment.length && (
          <p className="mt-4 text-sm">
            Für dieses Vorhaben sind noch keine Venture-Antworten sichtbar.
            Eigene Angaben und Freigaben findet ihr im{" "}
            <Link
              className="underline"
              href={`/founder-alignment/vorhaben?venture=${team.team_id}`}
            >
              Venture Alignment
            </Link>
            .
          </p>
        )}
        {[...new Set(visibleAlignment.map((a) => a.item.section))].map(
          (section) => (
            <section key={section} className="mt-6">
              <h3 className="text-lg font-semibold">
                {section.replace(/^[A-Z/]+ – /, "")}
              </h3>
              {visibleAlignment
                .filter((a) => a.item.section === section)
                .map((a) => (
                  <article
                    key={a.item.itemId}
                    className="ws-text-card mt-4 rounded-xl border border-slate-200 p-4"
                  >
                    <h4 className="text-sm font-semibold">{a.status}</h4>
                    <p className="mt-2 text-sm leading-6">{a.item.prompt}</p>
                    {a.ambiguous && (
                      <p className="mt-2 text-sm">
                        Diese frühere Frage bezieht sich auf eine andere Person.
                        Bei mehreren Mitgründenden ist nicht eindeutig, wer
                        gemeint war; deshalb wird daraus kein Teamvergleich
                        abgeleitet.
                      </p>
                    )}
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {a.entries.map((e) => (
                        <div key={e.personId}>
                          <h5 className="text-sm font-semibold">{e.name}</h5>
                          {e.entry ? (
                            <ReportViewV21
                              sections={[{ section: "", entries: [e.entry] }]}
                            />
                          ) : (
                            <p className="mt-1 text-sm text-slate-500">
                              Keine Antwort sichtbar.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
            </section>
          ),
        )}
      </section>
      <section id="vereinbarungen">
        <h2 className="text-2xl font-semibold">
          Wie ihr es miteinander regelt
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Gemeinsam bestätigte Vereinbarungen aus Founder Setup. Sie bleiben von
          den Workstyle-Selbstauskünften getrennt.
        </p>
        {team.setup.length ? (
          <div className="mt-5 grid gap-4">
            {team.setup.map((s) => (
              <article
                key={s.item_key}
                className="ws-text-card rounded-xl border border-slate-200 p-4"
              >
                <h3 className="font-semibold">
                  {(setupCopy.setup.items as Record<string, { title: string }>)[
                    s.item_key
                  ]?.title ?? s.item_key}
                </h3>
                <p className="mt-2 text-sm">
                  {(setupCopy.setup.outcomes as Record<string, string>)[
                    s.resolution_status
                  ] ?? s.resolution_status}
                </p>
                {s.note && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                    {s.note}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Bestätigt:{" "}
                  {new Date(s.confirmed_at).toLocaleDateString("de-DE")}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm">
            Es sind keine gemeinsam bestätigten Vereinbarungen sichtbar.
          </p>
        )}
        {team.setup_available && (
          <Link
            className="ws-no-print mt-4 inline-block underline"
            href={`/teams/${team.team_id}/setup`}
          >
            Founder Setup gemeinsam klären
          </Link>
        )}
      </section>
      <section id="agenda">
        <h2 className="text-2xl font-semibold">Eure Gesprächsagenda</h2>
        <p className="mt-2 text-sm text-slate-600">
          Zuerst unterschiedliche oder noch offene Arbeitsweisen, danach
          unterschiedliche Venture-Erwartungen. Keine Bewertung ihrer Schwere.
        </p>
        <ol className="mt-4 list-decimal space-y-4 pl-5">
          {agenda.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
        <p className="mt-5">
          Haltet fest, welche Absprache ihr ausprobiert und wann ihr sie
          gemeinsam überprüft.
        </p>
      </section>
    </div>
  );
}
