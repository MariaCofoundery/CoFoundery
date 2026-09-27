"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlignmentAnswerField } from "@/features/instruments/v2/AlignmentAnswerField";
import type { AlignmentSectionView } from "@/features/instruments/v2/alignmentQuestionnaireData";
import type { AlignmentAnswer, AlignmentAnswerValue } from "@/features/instruments/v2/alignmentAnswersV2";
import {
  clearAlignmentAnswer,
  saveAlignmentAnswer,
  submitAlignmentModule,
} from "@/features/instruments/v2/alignmentAnswerActions";
import type { AlignmentModule } from "@/features/instruments/v2/alignmentProgress";

type Draft = { value?: AlignmentAnswerValue; missingCode?: AlignmentAnswer["missingCode"] };
type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  module: AlignmentModule;
  step?: 1 | 2;
  sections: AlignmentSectionView[];
  initialAnswers: Record<string, Draft>;
  submitted: boolean;
};

/**
 * Der Fragebogen v2.
 *
 * ---------------------------------------------------------------------------
 * ES WIRD LAUFEND GESPEICHERT, UND NICHTS GEHT VERLOREN
 * ---------------------------------------------------------------------------
 *
 * Kein „Weiter"-Knopf, der eine Seite abschließt. Der Fragebogen hat 24 bis 39
 * Blöcke und wird in mehreren Sitzungen ausgefüllt - wer dabei etwas verliert,
 * füllt ihn kein zweites Mal aus.
 *
 * WAS NICHT GEZÄHLT WIRD, IST DER FORTSCHRITT IN PROZENT EINER PUNKTZAHL. Die
 * Anzeige sagt „12 von 24 beantwortet" und sonst nichts. Es gibt keinen
 * Zwischenstand, keine Auswertung beim Ausfüllen und am Ende keine Zahl.
 */
export function AlignmentQuestionnaire({
  module, step, sections, initialAnswers, submitted,
}: Props) {
  const t = useTranslations("alignment");
  const [answers, setAnswers] = useState<Record<string, Draft>>(initialAnswers);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingAfterSubmit, setMissingAfterSubmit] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const blocks = useMemo(() => sections.flatMap((section) => section.blocks), [sections]);
  const answered = blocks.filter((entry) => {
    const draft = answers[entry.blockId];
    return Boolean(draft?.missingCode) || draft?.value !== undefined;
  }).length;

  const persist = useCallback(
    (blockId: string, answerFormat: string, draft: Draft) => {
      clearTimeout(timers.current[blockId]);
      timers.current[blockId] = setTimeout(async () => {
        setStates((current) => ({ ...current, [blockId]: "saving" }));

        const empty = draft.missingCode === undefined && !hasContent(draft.value);
        const result = empty
          ? await clearAlignmentAnswer(module, blockId)
          : await saveAlignmentAnswer(module, {
              blockId,
              answerFormat,
              ...(draft.missingCode ? { missingCode: draft.missingCode } : { value: draft.value }),
            } as AlignmentAnswer);

        setStates((current) => ({ ...current, [blockId]: result.ok ? "saved" : "error" }));
        setErrors((current) => ({ ...current, [blockId]: result.ok ? "" : result.reason }));
      }, 600);
    },
    [module]
  );

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 py-3 backdrop-blur">
        <p className="text-sm text-slate-600">
          {t("shell.progress", { answered, total: blocks.length })}
        </p>
        {isSubmitted ? (
          <p className="text-sm font-medium text-slate-900">{t("shell.submitted")}</p>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={async () => {
              const result = await submitAlignmentModule(module, step);
              if (result.ok) {
                setIsSubmitted(true);
                setMissingAfterSubmit([]);
              } else {
                setMissingAfterSubmit(result.missing ?? []);
              }
            }}
          >
            {t("shell.submit")}
          </button>
        )}
      </div>

      {missingAfterSubmit.length > 0 && (
        // NICHT NUR „UNVOLLSTÄNDIG". Der Hinweis sagt dazu, dass es für jede
        // Frage eine Antwort gibt, die das Nichtbeantworten benennt - sonst
        // sucht jemand nach einer Meinung, die er nicht hat.
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("shell.incomplete", { count: missingAfterSubmit.length })}
        </p>
      )}

      {sections.map((section) => (
        <section key={section.key} className="space-y-6">
          {section.label && (
            <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
          )}
          {section.blocks.map((entry) => {
            const draft = answers[entry.blockId] ?? {};
            const state = states[entry.blockId] ?? "idle";
            return (
              <div
                key={entry.blockId}
                className={[
                  "rounded-xl border p-5",
                  missingAfterSubmit.includes(entry.blockId)
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                {entry.condition && (
                  // Teil der Messversion, nicht Verzierung: ohne sie misst die
                  // Präferenz etwas anderes.
                  <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {entry.condition}
                  </p>
                )}
                <p className="mb-4 text-base text-slate-900">{entry.prompt}</p>

                <AlignmentAnswerField
                  blockId={entry.blockId}
                  answerFormat={entry.answerFormat}
                  scaleLabels={entry.scaleLabels}
                  offeredMissing={entry.offeredMissing.filter((code) => code !== "technical")}
                  block={entry.block}
                  valueCase={entry.valueCase}
                  draft={draft}
                  disabled={isSubmitted}
                  onChange={(next) => {
                    setAnswers((current) => ({ ...current, [entry.blockId]: next }));
                    persist(entry.blockId, entry.answerFormat, next);
                  }}
                />

                <div className="mt-3 flex items-center gap-3 text-xs">
                  {state === "saving" && <span className="text-slate-500">{t("shell.saving")}</span>}
                  {state === "saved" && <span className="text-slate-500">{t("shell.saved")}</span>}
                  {state === "error" && (
                    <span className="text-rose-700">{errors[entry.blockId]}</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** Ein angefangenes, aber leeres Feld ist noch keine Antwort. */
function hasContent(value: AlignmentAnswerValue | undefined): boolean {
  if (!value) return false;
  return Object.values(value as Record<string, unknown>).some((entry) => {
    if (entry === undefined || entry === null) return false;
    if (typeof entry === "string") return entry.trim() !== "";
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === "object") return Object.keys(entry).length > 0;
    return true;
  });
}
