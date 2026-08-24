"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";

type Props = {
  reportHref: string;
  decisionRulesHref: string;
  collaborationConflictHref: string;
  dashboardHref?: string;
};

export function FounderAlignmentWorkbookIntro({
  reportHref,
  decisionRulesHref,
  collaborationConflictHref,
  dashboardHref = "/dashboard",
}: Props) {
  const wt = useTranslations("workbook");
  const introSteps = [
    { title: wt("intro.steps.choose.title"), description: wt("intro.steps.choose.description") },
    {
      title: wt("intro.steps.understand.title"),
      description: wt("intro.steps.understand.description"),
    },
    { title: wt("intro.steps.continue.title"), description: wt("intro.steps.continue.description") },
  ];
  const topics = [
    {
      key: "decision_rules",
      href: decisionRulesHref,
      title: wt("intro.topics.decisionRules.title"),
      description: wt("intro.topics.decisionRules.description"),
    },
    {
      key: "collaboration_conflict",
      href: collaborationConflictHref,
      title: wt("intro.topics.collaborationConflict.title"),
      description: wt("intro.topics.collaborationConflict.description"),
    },
  ];

  return (
    <section className="mx-auto max-w-4xl rounded-[32px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{wt("intro.eyebrow")}</p>
      <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
        {wt("intro.title")}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{wt("intro.description")}</p>

      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {introSteps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-[22px] border border-slate-200/80 bg-slate-50/65 p-5"
          >
            <span className="text-xs font-semibold text-violet-700">{index + 1}</span>
            <h2 className="mt-2 text-base font-semibold text-slate-950">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
          </li>
        ))}
      </ol>

      <div className="mt-7">
        <ReportActionButton href="#deep-dive-topics">{wt("intro.chooseTopic")}</ReportActionButton>
      </div>

      <div id="deep-dive-topics" className="mt-12 scroll-mt-24 border-t border-slate-200 pt-9">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-950">
          {wt("intro.topics.title")}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {topics.map((topic) => (
            <article
              key={topic.key}
              className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
            >
              <h3 className="text-lg font-semibold text-slate-950">{topic.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{topic.description}</p>
              <div className="mt-5">
                <ReportActionButton href={topic.href}>{wt("intro.topics.open")}</ReportActionButton>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6">
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
