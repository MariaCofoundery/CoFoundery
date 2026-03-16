import Link from "next/link";
import { type CSSProperties } from "react";
import {
  FOUNDER_CONVERSATION_GUIDE_CHAPTERS,
  FOUNDER_VALUES_CONVERSATION_BLOCK,
} from "@/features/reporting/founderConversationGuide";
import { type ConversationGuidePreviewState } from "@/features/reporting/debugFounderPreviewData";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  preview: ConversationGuidePreviewState;
  workbookHref: string;
  embedded?: boolean;
};

export function DebugConversationGuidePreview({
  preview,
  workbookHref,
  embedded = false,
}: Props) {
  const founderPairLabel = `${preview.founderAName} × ${preview.founderBName}`;
  const containerClassName = embedded
    ? "w-full"
    : "min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#fbf8ff_28%,#ffffff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8";
  const innerClassName = embedded ? "w-full" : "mx-auto max-w-6xl";

  return (
    <div
      className={containerClassName}
      style={
        {
          "--brand-primary": "#67e8f9",
          "--brand-accent": "#7c3aed",
        } as CSSProperties
      }
    >
      <div className={innerClassName}>
        <section className="rounded-[36px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-8 border-b border-slate-200 pb-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <object
                  data="/cofoundery-align-logo.svg"
                  type="image/svg+xml"
                  aria-label="CoFoundery Align Logo"
                  className="h-10 w-auto max-w-[190px]"
                />
                <h1 className="mt-6 text-3xl font-semibold text-slate-950 md:text-4xl">
                  {t("Gespraech vorbereiten")}
                </h1>
                <p className="mt-3 text-lg font-medium text-slate-800">{founderPairLabel}</p>
                <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-700">
                  {t(
                    "Dieser Gespraechsleitfaden hilft euch, die wichtigsten Erkenntnisse aus eurem Report gemeinsam zu reflektieren. Nehmt euch etwa 60–90 Minuten Zeit und besprecht die Fragen offen miteinander. Ziel ist nicht sofortige Einigung, sondern ein klares Verstaendnis eurer Perspektiven."
                  )}
                </p>
              </div>

              <div className="rounded-[28px] border border-[color:var(--brand-primary)]/20 bg-[linear-gradient(180deg,rgba(103,232,249,0.10)_0%,rgba(124,58,237,0.06)_100%)] p-5 md:max-w-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {t("Preview-Kontext")}
                </p>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  {t(preview.reportHeadline)}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t(preview.scenarioNote)}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-8">
            {FOUNDER_CONVERSATION_GUIDE_CHAPTERS.map((chapter, index) => {
              const override = preview.chapterOverrides[chapter.id];
              const chapterContainerClass =
                index % 4 === 0
                  ? "border-[color:var(--brand-primary)]/22 bg-[linear-gradient(180deg,rgba(103,232,249,0.12)_0%,rgba(255,255,255,0.95)_100%)]"
                  : index % 4 === 2
                    ? "border-[color:var(--brand-accent)]/16 bg-[linear-gradient(180deg,rgba(124,58,237,0.10)_0%,rgba(255,255,255,0.95)_100%)]"
                    : "border-slate-200/90 bg-white/95";
              const chapterLabelColor =
                index % 4 === 2 ? "text-[color:var(--brand-accent)]" : "text-[color:var(--brand-primary)]";

              return (
                <section
                  key={chapter.id}
                  className={`rounded-[32px] border p-7 md:p-8 ${chapterContainerClass}`}
                >
                  <div className="max-w-3xl">
                    <p className={`text-[11px] uppercase tracking-[0.22em] ${chapterLabelColor}`}>
                      Kapitel {index + 1}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 md:text-[30px]">
                      {t(chapter.title)}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-slate-700">{t(chapter.context)}</p>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.92fr)]">
                    <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {t("Reflexionsfragen")}
                      </p>
                      <ol className="mt-4 space-y-4">
                        {(override?.reflectionQuestions ?? chapter.reflectionQuestions).map((question) => (
                          <li
                            key={question}
                            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-7 text-slate-700"
                          >
                            {t(question)}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-[28px] border-2 border-[color:var(--brand-accent)]/22 bg-[linear-gradient(180deg,rgba(124,58,237,0.12)_0%,rgba(255,255,255,0.96)_100%)] p-6 shadow-[0_12px_28px_rgba(124,58,237,0.08)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-accent)]">
                        {t("Entscheidungsfrage")}
                      </p>
                      <div className="mt-4 h-px w-16 bg-[color:var(--brand-accent)]/30" />
                      <p className="mt-4 text-base leading-8 text-slate-800">
                        {t(override?.decisionQuestion ?? chapter.decisionQuestion)}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}

            {preview.showValuesConversationBlock ? (
              <section className="rounded-[32px] border border-[color:var(--brand-accent)]/16 bg-[linear-gradient(180deg,rgba(124,58,237,0.08)_0%,rgba(255,255,255,0.96)_100%)] p-7 md:p-8">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--brand-accent)]">
                  Zusatzmodul
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  {t(FOUNDER_VALUES_CONVERSATION_BLOCK.title)}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
                  {t(FOUNDER_VALUES_CONVERSATION_BLOCK.intro)}
                </p>
                <ul className="mt-6 space-y-4">
                  {FOUNDER_VALUES_CONVERSATION_BLOCK.questions.map((question) => (
                    <li
                      key={question}
                      className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-sm leading-7 text-slate-700"
                    >
                      {t(question)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <section className="mt-10 rounded-[28px] border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/6 p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {t("Nach eurem Gespraech")}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              {t(
                "Wenn ihr eure wichtigsten Perspektiven geklaert habt, koennt ihr im naechsten Schritt konkrete Vereinbarungen fuer eure Zusammenarbeit festhalten."
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={workbookHref}
                className="inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-[color:var(--brand-primary-hover)]"
              >
                {t("Arbeitsdokument starten")}
              </Link>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
