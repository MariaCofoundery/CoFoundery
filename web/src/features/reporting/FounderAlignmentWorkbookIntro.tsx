import Link from "next/link";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  type FounderAlignmentWorkbookHighlights,
} from "@/features/reporting/founderAlignmentWorkbook";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  reportHref: string;
  workbookHref: string;
  dashboardHref?: string;
  highlights: FounderAlignmentWorkbookHighlights;
};

function getSuggestedTopics(highlights: FounderAlignmentWorkbookHighlights) {
  return highlights.prioritizedStepIds
    .slice(0, 2)
    .map((stepId) => FOUNDER_ALIGNMENT_WORKBOOK_STEPS.find((step) => step.id === stepId)?.title)
    .filter((title): title is string => Boolean(title));
}

export function FounderAlignmentWorkbookIntro({
  reportHref,
  workbookHref,
  dashboardHref = "/dashboard",
  highlights,
}: Props) {
  const suggestedTopics = getSuggestedTopics(highlights);

  return (
    <section className="mx-auto max-w-4xl rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Workbook</p>
      <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
        {t("Bevor ihr ins Workbook geht")}
      </h1>
      <div className="mt-4 max-w-3xl space-y-3 text-sm leading-7 text-slate-700">
        <p>
          {t(
            "Euer Report zeigt, wo ihr aehnlich denkt, wo Unterschiede liegen und was ihr vor dem Start klaeren solltet."
          )}
        </p>
        <p>
          {t(
            "Im Workbook macht ihr daraus konkrete Regeln fuer eure Zusammenarbeit."
          )}
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {t("So koennt ihr damit arbeiten")}
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>{t("Ihr koennt das gemeinsam machen oder euch erst einzeln orientieren.")}</li>
            <li>{t("Ihr muesst nicht alles auf einmal klaeren.")}</li>
            <li>{t("Wichtiger als Tempo ist, dass ihr an den richtigen Punkten sauber werdet.")}</li>
            <li>{t("Euer Stand bleibt erhalten, ihr koennt spaeter weiterarbeiten.")}</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.98)_100%)] p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {t("Fokus statt Ueberforderung")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t(
                "Nehmt euch zuerst die Themen vor, die fuer euch gerade am wichtigsten sind."
              )}
            </p>
            {suggestedTopics.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-slate-200/70 bg-white p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {t("Optional spaeter")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {t(
                "Wenn ihr moechtet, koennt ihr spaeter auch eine dritte Person dazuholen, zum Beispiel einen Advisor oder Coach."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ReportActionButton href={workbookHref}>{t("Workbook starten")}</ReportActionButton>
        <ReportActionButton href={dashboardHref} variant="utility">
          {t("Spaeter starten")}
        </ReportActionButton>
        <Link
          href={reportHref}
          className="text-sm text-slate-500 transition hover:text-slate-900 sm:ml-auto"
        >
          {t("Zurueck zum Matching-Report")}
        </Link>
      </div>
    </section>
  );
}
