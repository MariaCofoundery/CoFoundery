import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import type { SelfValuesProfile } from "@/features/reporting/types";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  participantAName: string;
  participantBName: string;
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
  valuesProfileA?: SelfValuesProfile | null;
  valuesProfileB?: SelfValuesProfile | null;
  workbookHref: string;
  teamContext?: TeamContext | null;
  reportContext?: "invitation" | "matching_session";
  showUnlockSection?: boolean;
};

export function FounderMatchingView({
  participantAName,
  participantBName,
  teamContext,
  reportContext = "invitation",
  showUnlockSection = true,
}: Props) {
  const effectiveTeamContext = teamContext ?? "pre_founder";
  const isSessionReport = reportContext === "matching_session";

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t(isSessionReport ? "Dynamik-Report" : "Matching-Report")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
            {t(isSessionReport ? "Euer Dynamik-Report ist fertig." : "Euer Alignment-Report ist fertig.")}
          </h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
            {t(
              isSessionReport
                ? "Dieser Snapshot zeigt euch erste gemeinsame Muster fuer ein gutes Gespraech ueber Zusammenarbeit."
                : "Hier ist ein erster kurzer Einblick in eure Zusammenarbeit."
            )}
          </p>
          <p className="mt-6 text-[12px] uppercase tracking-[0.16em] text-slate-500">
            {t(`${participantAName} und ${participantBName} · ${teamContextLabel(effectiveTeamContext)}`)}
          </p>
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/70 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {t("Erster Eindruck")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t("Ihr habt eine starke Uebereinstimmung in eurer Vision.")}
            </p>
          </article>

          <article className="rounded-[22px] border border-amber-200/80 bg-amber-50/70 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-700">
              {t("Spannungsfeld")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t("Gleichzeitig zeigen sich Unterschiede in eurem Entscheidungsstil.")}
            </p>
          </article>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-700">
          {t(
            isSessionReport
              ? "Nutzt diese Punkte als Ausgangspunkt fuer ein ruhiges Gespraech ueber Rollen, Erwartungen und Zusammenarbeit."
              : "Die entscheidenden Punkte fuer eure Zusammenarbeit seht ihr im vollstaendigen Report."
          )}
        </p>

        {showUnlockSection ? (
          <div id="report-paywall-placeholder" className="mt-8 rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {t("Freischaltung")}
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950">
              {t("Dieser Team-Report ist noch nicht freigeschaltet.")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t("Die Freischaltung fuer diesen Legacy-Report ist noch nicht aktiv.")}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              {t("Wenn ein Advisor oder Accelerator den Report fuer euch freischaltet, ist er fuer das Team verfuegbar.")}
            </p>
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {t("Freischaltung kommt bald. Bis dahin bleibt der PDF-Export fuer diesen Report deaktiviert.")}
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-[24px] border border-emerald-200/80 bg-emerald-50/70 p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
              {t("Session-Snapshot")}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t("Dieser Report wurde aus eurer Matching-Session erstellt. Er erzeugt keine Einladung, keine Relationship und kein Workbook.")}
            </p>
          </div>
        )}
      </section>

      {showUnlockSection ? (
        <section className="page-section mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white/92 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            {t("Vollstaendiger Report")}
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            {t("Der vollstaendige Report wird nach der Freischaltung sichtbar.")}
          </p>
        </section>
      ) : null}
    </>
  );
}

function teamContextLabel(teamContext: TeamContext) {
  return teamContext === "existing_team" ? "Bestehendes Team" : "Founder-Matching";
}
