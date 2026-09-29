"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnswerFieldV21, type DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import type { SectionView } from "@/features/instruments/v21/questionnaireDataV21";
import { completenessV21, type AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import type { AnswerableItem } from "@/features/instruments/v21/answersV21";
import { clearAnswer, saveAnswer, submitScope } from "@/features/instruments/align/answerActions";
import type { AssessmentScope } from "@/features/instruments/align/registries";

type SaveState = "idle" | "saving" | "saved" | "incomplete" | "error";

type Props = {
  scope: AssessmentScope;
  sections: SectionView[];
  /** Was die Antwortprüfung je Frage braucht - ohne die ganze Registratur. */
  answerable: Record<string, AnswerableItem>;
  initialAnswers: Record<string, DraftV21>;
  submitted: boolean;
};

/**
 * Der Fragebogen - für beide Bögen.
 *
 * ---------------------------------------------------------------------------
 * ES WIRD LAUFEND GESPEICHERT
 * ---------------------------------------------------------------------------
 *
 * Kein „Weiter“-Knopf, der eine Seite abschließt. Wer beim Ausfüllen etwas
 * verliert, füllt kein zweites Mal aus.
 *
 * EINE HALBE EINGABE IST KEIN FEHLER. Der Autospeicher feuert mitten hinein;
 * wer „bitte beschreiben“ ankreuzt, bekam früher eine rote Meldung, bevor der
 * Cursor im Feld war. „Mittendrin“ heißt jetzt: nicht speichern, nicht
 * meckern, und vor allem nicht überschreiben, was schon dasteht.
 *
 * KEIN FORTSCHRITT IN PROZENT. Die Anzeige sagt „12 von 16 beantwortet“ und
 * sonst nichts. Keine Auswertung beim Ausfüllen, am Ende keine Zahl.
 */
export function Questionnaire({
  scope, sections, answerable, initialAnswers, submitted,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, DraftV21>>(initialAnswers);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingAfterSubmit, setMissingAfterSubmit] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [submitting, setSubmitting] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const allItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  /** Die Einträge, an denen Anschlussfragen hängen. */
  const basisEntries = useMemo(() => {
    const entries = (answers.L01?.value as { entries?: { entryId: string; text: string }[] })
      ?.entries;
    return (entries ?? []).filter((entry) => entry.text.trim() !== "");
  }, [answers]);

  const visible = useMemo(
    () => allItems.filter((item) => !item.basisItemId || basisEntries.length > 0),
    [allItems, basisEntries],
  );

  const answered = visible.filter((item) => {
    const draft = answers[item.itemId];
    return (
      Boolean(draft?.missingCode) ||
      completenessV21(item.itemId, draft?.value, answerable[item.itemId]) === "complete"
    );
  }).length;

  const persist = useCallback(
    (itemId: string, draft: DraftV21) => {
      clearTimeout(timers.current[itemId]);

      const stand =
        draft.missingCode !== undefined
          ? "complete"
          : completenessV21(itemId, draft.value, answerable[itemId]);

      if (stand === "incomplete") {
        setStates((current) => ({ ...current, [itemId]: "incomplete" }));
        return;
      }

      timers.current[itemId] = setTimeout(async () => {
        setStates((current) => ({ ...current, [itemId]: "saving" }));
        try {
          const result =
            stand === "empty"
              ? await clearAnswer(scope, itemId)
              : await saveAnswer(scope, {
                  blockId: itemId,
                  ...(draft.missingCode
                    ? { missingCode: draft.missingCode }
                    : { value: draft.value }),
                } as AlignmentAnswerV21);

          setStates((current) => ({ ...current, [itemId]: result.ok ? "saved" : "error" }));
          setErrors((current) => ({ ...current, [itemId]: result.ok ? "" : result.reason }));
        } catch {
          // Wirft die Serveraktion, blieb die Anzeige sonst fuer immer auf
          // "wird gespeichert". Das sieht aus wie Speichern und ist keines.
          setStates((current) => ({ ...current, [itemId]: "error" }));
          setErrors((current) => ({ ...current, [itemId]: "unreachable" }));
        }
      }, 600);
    },
    [scope, answerable],
  );

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
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Es fehlen noch {missingAfterSubmit.length} Antworten. Für jede Frage gibt es
          auch eine Antwort, die das Nichtbeantworten benennt — du musst nichts
          hinschreiben, was du nicht meinst.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          Unter jeder Frage stehen Antworten wie „kann ich noch nicht einschätzen“.
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
                  data-item-id={item.itemId}
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
                    {state === "incomplete" && (
                      <span className="text-slate-400">noch nicht vollständig</span>
                    )}
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

      {/* Abgeben ist das Letzte, was man tut - der Knopf steht hinter der
          letzten Frage und nicht ueber der ersten. */}
      {!isSubmitted && (
        <div className="border-t border-slate-200 pt-6">
          <button
            type="button"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={async () => {
              setSubmitting(true);
              const result = await submitScope(scope);
              setSubmitting(false);
              if (result.ok) {
                setIsSubmitted(true);
                setMissingAfterSubmit([]);
              } else {
                setMissingAfterSubmit(result.missing ?? []);
              }
            }}
          >
            {submitting ? "wird abgegeben…" : "Abgeben"}
          </button>
          <p className="mt-2 text-sm text-slate-600">
            Danach lassen sich die Antworten nicht mehr ändern.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * `option_needs_text` ist für uns eine brauchbare Auskunft und für die Person
 * davor keine. Die Kennung bleibt in der Antwort der Serverfunktion.
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
    case "incomplete_value_case":
      return "Bitte beide Anliegen bewerten und einen Weg wählen.";
    case "venture_ambiguous":
      return "Du bist in mehreren Vorhaben — bitte wähle oben eins aus.";
    case "unreachable":
      return "Keine Verbindung — deine Eingabe steht noch da, ist aber nicht gespeichert.";
    default:
      return "Das konnte nicht gespeichert werden.";
  }
}
