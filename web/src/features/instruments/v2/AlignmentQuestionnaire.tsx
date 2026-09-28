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

type Draft = {
  value?: AlignmentAnswerValue;
  missingCode?: AlignmentAnswer["missingCode"];
};
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
  const [submitting, setSubmitting] = useState(false);
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
          : await saveAlignmentAnswer(
              module,
              {
                blockId,
                answerFormat,
                ...(draft.missingCode ? { missingCode: draft.missingCode } : { value: draft.value }),
              } as AlignmentAnswer,
              {}
            );

        setStates((current) => ({ ...current, [blockId]: result.ok ? "saved" : "error" }));
        setErrors((current) => ({ ...current, [blockId]: result.ok ? "" : result.reason }));
      }, 600);
    },
    [module]
  );

  return (
    <div className="space-y-10">
      {/* NUR DER STAND, KEIN KNOPF. Am 28.09.2026 gemeldet: "Wenn man den
          Fragebogen aufmacht, kommt gleich ganz oben dieser Knopf Fragebogen
          abschicken - der sollte dort nicht sein." Stimmt: Abgeben ist das
          Letzte, was man tut, und ganz oben steht es vor der ersten Antwort.
          Der Knopf steht jetzt am Ende, hinter der letzten Frage. */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 py-3 backdrop-blur">
        <p className="text-sm text-slate-600">
          {t("shell.progress", { answered, total: blocks.length })}
        </p>
        {isSubmitted && (
          <p className="mt-1 text-sm font-medium text-slate-900">{t("shell.submitted")}</p>
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

      {/* EINMAL, NICHT BEI JEDER FRAGE. Und nur noch die eine Erklaerung: Der
          Hinweis zur Gespraechsmarkierung steht jetzt dort, wo markiert wird -
          am eigenen Report. */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>{t("missing.hint")}</p>
      </div>

      {sections.map((section) => (
        <section key={section.key} className="space-y-6">
          {section.label && (
            <h2 className="text-lg font-semibold text-slate-900">{section.label}</h2>
          )}
          {/* Die Bedingung gilt fuer den ganzen Abschnitt. Sie ueber jede Frage
              zu schreiben macht sie zur Randnotiz, die niemand mehr liest -
              gemessen: viermal derselbe Satz bei T und D. */}
          {section.blocks[0]?.condition && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              {section.blocks[0].condition}
            </p>
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
                <p className="mb-4 text-base text-slate-900">{entry.prompt}</p>

                <AlignmentAnswerField
                  blockId={entry.blockId}
                  answerFormat={entry.answerFormat}
                  scaleLabels={entry.scaleLabels}
                  offeredMissing={entry.offeredMissing}
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
      {/* HIER GEHOERT ER HIN: hinter der letzten Frage. */}
      {!isSubmitted && (
        <div className="border-t border-slate-200 pt-6">
          <button
            type="button"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={async () => {
              setSubmitting(true);
              const result = await submitAlignmentModule(module, step);
              setSubmitting(false);
              if (result.ok) {
                setIsSubmitted(true);
                setMissingAfterSubmit([]);
              } else {
                setMissingAfterSubmit(result.missing ?? []);
              }
            }}
          >
            {submitting ? t("shell.submitting") : t("shell.submit")}
          </button>
          <p className="mt-2 text-sm text-slate-600">{t("shell.submitHint")}</p>
        </div>
      )}
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
