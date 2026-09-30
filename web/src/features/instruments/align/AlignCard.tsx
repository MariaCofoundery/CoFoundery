import Link from "next/link";
import type { AlignDashboardState } from "@/features/instruments/align/dashboardData";
import { screenSet } from "@/features/instruments/align/screens";
import type { AssessmentScope } from "@/features/instruments/align/registries";

/**
 * Der Weg zu den beiden Bögen - vom Dashboard aus.
 *
 * ---------------------------------------------------------------------------
 * ZWEI BÖGEN, ZWEI KÄSTEN, EIN ABSCHNITT
 * ---------------------------------------------------------------------------
 *
 * Nebeneinander, weil sie zusammengehören, und getrennt, weil ihre Gültigkeit
 * eine andere ist: Das Arbeitsprofil gilt für die Person, die Zusagen gelten
 * für ein Vorhaben. Ein gemeinsamer Fortschrittsbalken über beide („16 von
 * 52“) würde jemanden halbfertig aussehen lassen, der das eine fertig hat und
 * mit dem anderen noch gar nicht angefangen.
 *
 * ---------------------------------------------------------------------------
 * DIE ZAHLEN HIER SIND ANZAHLEN, KEINE ERGEBNISSE
 * ---------------------------------------------------------------------------
 *
 * „9 von 16 beantwortet“ ist ein Stand, keine Auswertung. Das ist der einzige
 * Zahlentyp, den es in Align gibt - und er steht hier, damit man weiß, ob man
 * noch etwas zu tun hat.
 */
/**
 * Wie viele Schritte ein Bogen hat.
 *
 * ---------------------------------------------------------------------------
 * SCHRITTE UND NICHT FRAGEN
 * ---------------------------------------------------------------------------
 *
 * Hier stand „43 Fragen zu Zielen, Zusagen, Regeln und Grenzen". Zwei Fehler
 * in einer Zeile: Die 43 zählte die zurückgezogene S01 mit, die niemand mehr
 * vorgelegt bekommt — im Bericht stand daneben „von 42". Und das UX-Review
 * Teil 2, Abschnitt 14, will die Einzelfragenzahl gar nicht mehr sehen:
 * „stattdessen Abschnittsfortschritt / Steps".
 *
 * Gezählt wird, was die Person vor sich haben wird, und die Zahl steht an
 * einer Stelle — in der Bildschirmdatei, aus der auch der Fragebogen zählt.
 */
function schritte(scope: AssessmentScope): number {
  return screenSet(scope, () => true).screens.length;
}

export function AlignCard({ state }: { state: AlignDashboardState }) {
  const mehrere = state.ventures.length > 1;

  return (
    <section
      id="dashboard-block-align"
      className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
      aria-labelledby="dashboard-align-title"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
        Vor dem Gründen
      </p>
      <h2 id="dashboard-align-title" className="mt-2 text-2xl font-semibold text-slate-950">
        Zwei Fragebögen
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[11px] font-normal text-amber-900">
          im Test
        </span>
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Einer über dich, einer über euer Vorhaben. Beide sind Selbstauskunft — es gibt
        keine Punktzahl und kein Ergebnis, sondern eure Antworten nebeneinander und
        Fragen, über die ihr sprechen könnt.
      </p>

      {/* DER SATZ, DER DIE EIGENTLICHE SORGE BEANTWORTET. Wer nicht weiss, ob
          sein bisheriger Report verschwindet, entscheidet nicht ueber die neue
          Fassung, sondern ueber das Risiko. */}
      {state.hasPrevious && (
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Deine bisherigen Antworten und dein Report bleiben —{" "}
          <Link href="/me/profile" className="underline">
            hier
          </Link>
          , unverändert und auch weiterhin.
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">Wie du arbeitest</p>
          <p className="mt-1 text-xs text-slate-500">
            {state.profile.submitted
              ? "abgegeben"
              : state.profile.started
                ? "angefangen"
                : `${schritte("founder_profile")} Schritte, gilt unabhängig vom Vorhaben`}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href="/founder-alignment/profil" className="text-slate-900 underline">
              {state.profile.started ? "Weiter ausfüllen" : "Anfangen"}
            </Link>
            {state.profile.submitted && (
              <>
                <Link
                  href="/founder-alignment/profil/antworten"
                  className="text-slate-900 underline"
                >
                  Deine Antworten
                </Link>
                {/* "Wonach du suchst" fuehrt jetzt nach FIND: Dort steht die
                    Suche, und zwar vollstaendig - mit praktischem Rahmen,
                    Faehigkeiten und Arbeitsweisen. */}
                <Link href="/discovery/suche" className="text-slate-900 underline">
                  Wonach du suchst
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">Was du aufbauen willst</p>

          {/* NOCH KEIN VORHABEN IST KEIN FEHLER. Es entsteht auf der
              Fragebogenseite - hier steht nur, wohin es geht. */}
          {state.ventures.length === 0 ? (
            <>
              <p className="mt-1 text-xs text-slate-500">
                Zeit, Geld, Ziele und Regeln — für ein Vorhaben, nicht allgemein.
              </p>
              <Link
                href="/founder-alignment/vorhaben"
                className="mt-3 inline-block text-sm text-slate-900 underline"
              >
                Anfangen
              </Link>
            </>
          ) : (
            <ul className="mt-2 space-y-3">
              {state.ventures.map((venture) => (
                <li key={venture.id}>
                  {/* Der Name steht nur dabei, wenn es mehrere gibt. Bei einem
                      einzigen waere „Ohne Namen“ ein Vorwurf. */}
                  {mehrere && (
                    <p className="text-xs font-medium text-slate-700">
                      {venture.name ?? "Ohne Namen"}
                      {venture.alone && <span className="text-slate-500"> — nur du</span>}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {venture.submitted
                      ? "abgegeben"
                      : venture.started
                        ? "angefangen"
                        : `${schritte("venture_alignment")} Abschnitte zu Zielen, Zusagen, Regeln und Grenzen`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={`/founder-alignment/vorhaben?venture=${encodeURIComponent(venture.id)}`}
                      className="text-slate-900 underline"
                    >
                      {venture.started ? "Weiter ausfüllen" : "Anfangen"}
                    </Link>
                    {venture.submitted && (
                      <Link
                        href={`/founder-alignment/vorhaben/antworten?venture=${encodeURIComponent(venture.id)}`}
                        className="text-slate-900 underline"
                      >
                        Deine Antworten
                      </Link>
                    )}
                  </div>
                  {/* DER EINZIGE ROTE PUNKT IN DIESEM KASTEN. Er steht fuer
                      etwas, das sich geaendert hat, seit die Person zuletzt
                      hingesehen hat - nicht fuer ein Ergebnis. */}
                  {venture.confirm && (
                    <Link
                      href={`/founder-alignment/vorhaben/bestaetigen?venture=${encodeURIComponent(venture.id)}`}
                      className="mt-2 inline-block rounded-lg bg-amber-100 px-3 py-1 text-xs text-amber-900 underline"
                    >
                      Jemand ist dazugekommen — sieh deine Angaben noch einmal an
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(state.profile.submitted || state.ventures.some((venture) => venture.submitted)) && (
        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-900">Nebeneinander</p>
          {state.partners.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              Noch niemand, mit dem du verbunden bist. Vergleichen könnt ihr euch, sobald
              ihr beide abgegeben und einander freigegeben habt.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {state.partners.map((partner) => (
                <li key={partner.userId} className="text-sm">
                  {partner.ready ? (
                    <Link
                      href={`/founder-alignment/vergleich/${partner.userId}`}
                      className="text-slate-900 underline"
                    >
                      mit {partner.label} vergleichen
                    </Link>
                  ) : (
                    <span className="text-slate-500">
                      {partner.label} — hat noch nichts freigegeben
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
