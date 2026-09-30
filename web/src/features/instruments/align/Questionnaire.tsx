"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnswerFieldV21, type DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import type { SectionView } from "@/features/instruments/v21/questionnaireDataV21";
import { completenessV21, type AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import type { AnswerableItem } from "@/features/instruments/v21/answersV21";
import { clearAnswer, saveAnswer, submitScope } from "@/features/instruments/align/answerActions";
import {
  noteItemAnswered,
  noteItemSeen,
} from "@/features/instruments/v21/itemViewActions";
import type { AssessmentScope } from "@/features/instruments/align/registries";

type SaveState = "idle" | "saving" | "saved" | "incomplete" | "error";

type Props = {
  scope: AssessmentScope;
  /**
   * Zu welchem Vorhaben die Antworten gehören.
   *
   * Beim Arbeitsprofil `null`. Beim Venture-Bogen muss es MITKOMMEN: Wer in
   * zwei Vorhaben ist, hat auf der Seite davor gewählt, und ohne diese Angabe
   * würde die Serveraktion neu raten - und bei mehreren aufgeben.
   */
  ventureId?: string | null;
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
  scope, ventureId = null, sections, answerable, initialAnswers, submitted,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, DraftV21>>(initialAnswers);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missingAfterSubmit, setMissingAfterSubmit] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(submitted);
  const [submitting, setSubmitting] = useState(false);
  /** Warum die Abgabe nicht geklappt hat. Leer heißt: kein Versuch gescheitert. */
  const [submitError, setSubmitError] = useState("");

  /**
   * Steht etwas auf dem Schirm, das nicht in der Datenbank ist?
   *
   * DANN DARF NICHT ABGEGEBEN WERDEN. Sonst friert die Abgabe einen Stand
   * ein, den die Person vor sich sieht und der so nirgends gespeichert ist -
   * und danach laesst er sich nicht mehr ändern.
   */
  const nichtGespeichert = () =>
    Object.entries(states).filter(([, state]) => state === "error" || state === "saving");
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

  /**
   * Die Messung für den Pretest - und sie darf das Ausfüllen nicht stören.
   *
   * ---------------------------------------------------------------------------
   * SIE FEHLTE FÜR GENAU DIE BÖGEN, DIE VORGELEGT WERDEN
   * ---------------------------------------------------------------------------
   *
   * Aufgezeichnet wurde bisher nur v2.1. Die fachliche Durchsicht verlangt für
   * den Pilot Ausfülldauer, Auslassungsgründe und Abbruchstellen - „das darf
   * nicht durch bloßes Bauchgefühl entschieden werden“ steht dort wörtlich.
   * Ohne diese Zeilen hätte die Auswertung nach dem Pilot null Zeilen
   * geliefert, und gemerkt hätte man es erst danach.
   *
   * Kein await im Klickpfad, kein Blockieren, keine Fehlermeldung: Eine
   * Messung, die den gemessenen Vorgang behindert, misst am Ende sich selbst.
   */
  const gesehen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const frisch = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => entry.target.getAttribute("data-item-id"))
          .filter(
            (itemId): itemId is string => Boolean(itemId) && !gesehen.current.has(itemId!),
          );
        if (frisch.length === 0) return;
        for (const itemId of frisch) gesehen.current.add(itemId);
        void noteItemSeen(frisch, scope, ventureId ?? undefined).catch(() => {});
      },
      // Halb sichtbar reicht: Wer eine Frage nur beim Scrollen streift, hat sie
      // nicht gelesen - wer sie zur Haelfte vor sich hat, schon.
      { threshold: 0.5 },
    );

    for (const node of document.querySelectorAll("[data-item-id]")) observer.observe(node);
    return () => observer.disconnect();
  }, [scope, ventureId, sections]);

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
              ? await clearAnswer(scope, itemId, ventureId ?? undefined)
              : await saveAnswer(
                  scope,
                  {
                    blockId: itemId,
                    ...(draft.missingCode
                      ? { missingCode: draft.missingCode }
                      : { value: draft.value }),
                  } as AlignmentAnswerV21,
                  ventureId ?? undefined,
                );

          setStates((current) => ({ ...current, [itemId]: result.ok ? "saved" : "error" }));
          setErrors((current) => ({ ...current, [itemId]: result.ok ? "" : result.reason }));
          if (result.ok && stand === "complete") {
            void noteItemAnswered(itemId, scope, ventureId ?? undefined).catch(() => {});
          }
        } catch {
          // Wirft die Serveraktion, blieb die Anzeige sonst fuer immer auf
          // "wird gespeichert". Das sieht aus wie Speichern und ist keines.
          setStates((current) => ({ ...current, [itemId]: "error" }));
          setErrors((current) => ({ ...current, [itemId]: "unreachable" }));
        }
      }, 600);
    },
    [scope, ventureId, answerable],
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

            {shown.map((item, index) => {
              const draft = answers[item.itemId] ?? {};
              const state = states[item.itemId] ?? "idle";
              // EINMAL UEBER DER GRUPPE, NICHT SECHSMAL. S01a bis S01f fragen
              // dasselbe ueber je ein anderes Ziel; die Frage sechsmal zu
              // wiederholen waere Laerm, sie wegzulassen liesse sechs Saetze
              // ohne Frage stehen.
              const gruppenfrage =
                item.groupPrompt && item.groupPrompt !== shown[index - 1]?.groupPrompt
                  ? item.groupPrompt
                  : null;
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
                  {gruppenfrage && (
                    <p className="mb-3 border-b border-slate-200 pb-3 text-base font-medium text-slate-900">
                      {gruppenfrage}
                    </p>
                  )}
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
                    {state === "saving" && <span className="text-slate-500">Speichern …</span>}
                    {state === "saved" && <span className="text-slate-500">Gespeichert</span>}
                    {state === "incomplete" && (
                      <span className="text-slate-400">noch nicht vollständig</span>
                    )}
                    {state === "error" && (
                      <span className="text-rose-700">
                        {errorText(errors[item.itemId])}{" "}
                        {/* WIEDERHOLEN STEHT DANEBEN, NICHT IRGENDWO. Ein
                            Fehler ohne Ausweg zwingt dazu, die Antwort noch
                            einmal anzuklicken - und wer das tut, weiss nicht,
                            ob er sie damit aendert oder nur wiederholt. */}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => persist(item.itemId, answers[item.itemId] ?? {})}
                        >
                          Erneut versuchen
                        </button>
                      </span>
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
              if (nichtGespeichert().length > 0) {
                setSubmitError("unsaved");
                return;
              }
              setSubmitting(true);
              setSubmitError("");
              try {
                const result = await submitScope(scope, ventureId ?? undefined);
                if (result.ok) {
                  setIsSubmitted(true);
                  setMissingAfterSubmit([]);
                } else {
                  setMissingAfterSubmit(result.missing ?? []);
                  // Fehlende Antworten stehen an den Fragen selbst. Alles
                  // andere - ein abgewiesener Schreibversuch, ein Lesefehler -
                  // stand vorher NIRGENDS: Der Knopf sprang zurueck, und es
                  // sah aus, als haette man nichts getan.
                  if (result.reason !== "incomplete") setSubmitError(result.reason);
                }
              } catch {
                // OHNE DAS BLIEB DER KNOPF FUER IMMER AUF "wird abgegeben".
                // Gemeldet am 30.09.2026. Beim Speichern war es schon
                // abgefangen, beim Abgeben nicht - und da faellt es am
                // meisten auf, weil man danach wartet.
                setSubmitError("unreachable");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Profil wird erstellt…" : "Founder-Profil erstellen"}
          </button>
          <p className="mt-2 text-sm text-slate-600">
            Mit dem Absenden schließt du diesen Durchgang ab.
          </p>

          {submitError && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {submitErrorText(submitError)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * `option_needs_text` ist für uns eine brauchbare Auskunft und für die Person
 * davor keine. Die Kennung bleibt in der Antwort der Serverfunktion.
 */
/**
 * Was bei einer gescheiterten Abgabe dastehen soll.
 *
 * Getrennt von `errorText`, weil es andere Fehler sind: Dort geht es um eine
 * einzelne Antwort, hier um den ganzen Durchgang. Und in beiden Fällen gilt
 * derselbe Satz - die Antworten sind noch da.
 */
function submitErrorText(reason: string): string {
  switch (reason) {
    case "unsaved":
      return "Eine Antwort ist noch nicht gespeichert. Bitte warte kurz oder versuche sie erneut zu speichern.";
    case "unreachable":
      return "Das hat gerade nicht geklappt. Deine Antworten sind noch da. Bitte versuche es erneut.";
    case "no_permission":
      return "Dieser Fragebogen ist für dein Konto nicht freigeschaltet. Deine Antworten sind noch da.";
    case "venture_ambiguous":
      return "Du bist in mehreren Vorhaben — bitte wähle oben eins aus.";
    default:
      return "Das hat gerade nicht geklappt. Deine Antworten sind noch da. Bitte versuche es erneut.";
  }
}

function errorText(reason?: string): string {
  switch (reason) {
    case "option_needs_text":
      return "Bitte beschreibe kurz, was du meinst.";
    case "exclusive_option_with_others":
      return "Diese Antwort schließt die anderen aus.";
    case "too_many_options":
      return "Bitte höchstens zwei auswählen.";
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
      return "Verbindung unterbrochen — diese Änderung ist noch nicht gespeichert.";
    case "no_permission":
      return "Dieser Fragebogen ist für dein Konto nicht freigeschaltet.";
    default:
      return "Das konnte nicht gespeichert werden.";
  }
}
