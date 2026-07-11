"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  FOUNDER_ALIGNMENT_WORKBOOK_STEPS,
  type FounderAlignmentWorkbookHighlights,
} from "@/features/reporting/founderAlignmentWorkbook";

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
  const wt = useTranslations("workbook");
  const suggestedTopics = getSuggestedTopics(highlights);

  return (
    <section className="mx-auto max-w-4xl rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{wt("common.workbook")}</p>
      <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
        {wt("intro.title")}
      </h1>
      <div className="mt-4 max-w-3xl space-y-3 text-sm leading-7 text-slate-700">
        <p>{wt("intro.reportShows")}</p>
        <p>{wt("intro.rules")}</p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {wt("intro.howToWork")}
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li>{wt("intro.workTogether")}</li>
            <li>{wt("intro.notEverything")}</li>
            <li>{wt("intro.rightPoints")}</li>
            <li>{wt("intro.savedState")}</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.98)_100%)] p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              {wt("intro.focus")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {wt("intro.focusDescription")}
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
              {wt("intro.optionalLater")}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {wt("intro.advisorLater")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ReportActionButton href={workbookHref}>{wt("intro.start")}</ReportActionButton>
        <ReportActionButton href={dashboardHref} variant="utility">
          {wt("intro.later")}
        </ReportActionButton>
        <Link
          href={reportHref}
          className="text-sm text-slate-500 transition hover:text-slate-900 sm:ml-auto"
        >
          {wt("common.backToMatchingReport")}
        </Link>
      </div>
    </section>
  );
}
