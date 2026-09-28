"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnswerFieldV21, type DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import type { SectionView } from "@/features/instruments/v21/questionnaireDataV21";
import {
  clearAnswerV21,
  saveAnswerV21,
  submitV21,
} from "@/features/instruments/v21/answerActionsV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

type SaveState = "idle" | "saving" | "saved" | "error";

type Props = {
  sections: SectionView[];
  initialAnswers: Record<string, DraftV21>;
  submitted: boolean;
};

/**
 * Der Fragebogen v2.1.
 *
 * ---------------------------------------------------------------------------
 * ES WIRD LAUFEND GESPEICHERT, UND NICHTS GEHT VERLOREN
 * ---------------------------------------------------------------------------
 *
 * Kein „Weiter“-Knopf, der eine Seite abschließt. 36 Fragen werden in mehreren
 * Sitzungen beantwortet - wer dabei etwas verliert, füllt den Bogen kein
 * zweites Mal aus.
 *
 * KEIN FORTSCHRITT IN PROZENT EINER PUNKTZAHL. Die Anzeige sagt „12 von 34
 * beantwortet“ und sonst nichts. Es gibt keinen Zwischenstand, keine
 * Auswertung beim Ausfüllen und am Ende keine Zahl.
 *
 * DER ABSCHICK-KNOPF STEHT UNTEN. Am 28.09.2026 gemeldet: „Wenn man den
 * Fragebogen aufmacht, kommt gleich ganz oben dieser Knopf - der sollte dort
 * nicht sein.“ Stimmt: Abgeben ist das Letzte, was man tut.
 */
export function QuestionnaireV21({ sections, initialAnswers, submitted }: Props) {
  const [answers, setAnswers] = useState<Record<string, DraftV21>>(initialAnswers);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingAfterSubmit, setMissingAfterSubmit] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [submitting, setSubmitting] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const allItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  /** Die Grenzen aus L01 - daran hängen L02 und L03. */
  const basisEntries = useMemo(() => {
    const entries = (answers.L01?.value as { entries?: { entryId: string; text: string }[] })
      ?.entries;
    return (entries ?? []).filter((entry) => entry.text.trim() !== "");
  }, [answers]);

  /**
   * Welche Fragen diese Person überhaupt sieht.
   *
   * Ohne eine Grenze in L01 gibt es kein „diese Grenze“ - dann erscheinen die
   * Anschlussfragen nicht, und sie werden auch nicht verlangt.
   */
  const visible = useMemo(
    () => allItems.filter((item) => !item.basisItemId || basisEntries.length > 0),
    [allItems, basisEntries],
  );

  const answered = visible.filter((item) => {
    const draft = answers[item.itemId];
    return Boolean(draft?.missingCode) || hasContent(draft?.value);
  }).length;

  const persist = useCallback((itemId: string, draft: DraftV21) => {
    clearTimeout(timers.current[itemId]);
    timers.current[itemId] = setTimeout(async () => {
      setStates((current) => ({ ...current, [itemId]: "saving" }));

      const empty = draft.missingCode === undefined && !hasContent(draft.value);
      const result = empty
        ? await clearAnswerV21(itemId)
        : await saveAnswerV21({
            blockId: itemId,
            ...(draft.missingCode ? { missingCode: draft.missingCode } : { value: draft.value }),
          } as AlignmentAnswerV21);

      setStates((current) => ({ ...current, [itemId]: result.ok ? "saved" : "error" }));
      setErrors((current) => ({ ...current, [itemId]: result.ok ? "" : result.reason }));
    }, 600);
  }, []);

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 py-3 backdrop-blur">
        <p className="text-sm text-slate-600">
          {answered} von {visible.length} beantwortet
        </p>
        {isSubmitted && (
          <p className="mt-1 text-sm font-medium text-slate-900">
            Abgegeben. Antworten lassen sich nicht mehr ändern.
          </p>
        )}
      </div>

      {missingAfterSubmit.length > 0 && (
        // NICHT NUR „UNVOLLSTÄNDIG“. Der Hinweis sagt dazu, dass es für jede
        // Frage eine Antwort gibt, die das Nichtbeantworten benennt - sonst
        // sucht jemand nach einer Meinung, die er nicht hat.
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Es fehlen noch {missingAfterSubmit.length} Antworten. Für jede Frage gibt es
          auch eine Antwort, die das Nichtbeantworten benennt — du musst nichts
          hinschreiben, was du nicht meinst.
        </p>
      )}

      {/* EINMAL, NICHT BEI JEDER FRAGE. Gemessen am 28.09.2026: Zwei
          Erklärsätze erschienen je 24-mal. Ein Satz, der bei jeder Frage
          wiederholt wird, wird nach der dritten nicht mehr gelesen. */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          Unter jeder Frage stehen Antworten wie „habe ich noch nicht entschieden“.
          Das sind vollwertige Antworten, keine Notlösungen — es ist besser, sie zu
          wählen, als etwas anzukreuzen, das du nicht meinst.
        </p>
      </div>

      {sections.map((section) => {
        const shown = section.items.filter(
          (item) => !item.basisItemId || basisEntries.length > 0,
        );
        if (shown.length === 0) return null;

        return (
          <section key={section.section} className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">{section.section}</h2>

            {shown.map((item) => {
              const draft = answers[item.itemId] ?? {};
              const state = states[item.itemId] ?? "idle";
              return (
                <div
                  key={item.itemId}
                  className={[
                    "rounded-xl border p-5",
                    missingAfterSubmit.includes(item.itemId)
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  <p className="text-base text-slate-900">{item.prompt}</p>
                  {item.hint && <p className="mt-1 text-sm text-slate-500">{item.hint}</p>}

                  <div className="mt-4">
                    <AnswerFieldV21
                      item={item}
                      draft={draft}
                      basisEntries={basisEntries}
                      disabled={isSubmitted}
                      onChange={(next) => {
                        setAnswers((current) => ({ ...current, [item.itemId]: next }));
                        persist(item.itemId, next);
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs">
                    {state === "saving" && <span className="text-slate-500">wird gespeichert…</span>}
                    {state === "saved" && <span className="text-slate-500">gespeichert</span>}
                    {state === "error" && (
                      <span className="text-rose-700">{errorText(errors[item.itemId])}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      {!isSubmitted && (
        <div className="border-t border-slate-200 pt-6">
          <button
            type="button"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={async () => {
              setSubmitting(true);
              const result = await submitV21();
              setSubmitting(false);
              if (result.ok) {
                setIsSubmitted(true);
                setMissingAfterSubmit([]);
              } else {
                setMissingAfterSubmit(result.missing ?? []);
              }
            }}
          >
            {submitting ? "wird abgegeben…" : "Fragebogen abgeben"}
          </button>
          <p className="mt-2 text-sm text-slate-600">
            Danach lassen sich die Antworten nicht mehr ändern. Markieren, worüber du
            sprechen möchtest, kannst du weiterhin.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Warum die Fehlermeldung übersetzt wird.
 *
 * `option_needs_text` ist für uns eine brauchbare Auskunft und für die Person
 * davor keine. Der Grund steht trotzdem als Kennung in der Antwort der
 * Serverfunktion - er gehört ins Protokoll, nicht auf den Bildschirm.
 */
function errorText(reason?: string): string {
  switch (reason) {
    case "option_needs_text":
      return "Bitte beschreibe kurz, was du meinst.";
    case "exclusive_option_with_others":
      return "Diese Antwort schließt die anderen aus.";
    case "missing_currency":
      return "Bitte wähle eine Währung.";
    case "missing_unit":
      return "Bitte gib eine Einheit an.";
    case "incomplete_window":
      return "Bitte Tag, Uhrzeit und Zeitzone angeben.";
    case "person_without_name":
      return "Bitte benenne die Person oder die geplante Rolle.";
    case "empty_text":
      return "Da steht noch nichts.";
    case "entry_without_id":
    case "follow_up_points_nowhere":
      return "Diese Antwort gehört zu einer Grenze, die es nicht mehr gibt.";
    case "follow_up_without_basis":
      return "Nenne zuerst eine Grenze weiter oben.";
    case "incomplete_value_case":
      return "Bitte beide Anliegen bewerten und einen Weg wählen.";
    case "priority_not_chosen":
      return "Der Vorrang muss unter den gewählten Antworten sein.";
    default:
      return "Das konnte nicht gespeichert werden.";
  }
}

/** Ein angefangenes, aber leeres Feld ist noch keine Antwort. */
function hasContent(value: Record<string, unknown> | undefined): boolean {
  if (!value) return false;
  return Object.values(value).some((entry) => {
    if (entry === undefined || entry === null) return false;
    if (typeof entry === "string") return entry.trim() !== "";
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === "object") return Object.keys(entry).length > 0;
    return true;
  });
}
