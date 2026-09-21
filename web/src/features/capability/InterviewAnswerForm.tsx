"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { DictatedTextarea } from "@/features/dictation/DictatedTextarea";

import {
  autosaveInterviewAnswerAction,
  saveInterviewAnswerAction,
  skipInterviewQuestionAction,
} from "./capabilityInterviewActions";
import { NARRATIVE_MAX_LENGTH, NARRATIVE_MIN_LENGTH } from "./capabilityTypes";

/**
 * Das Antwortfeld.
 *
 * ZWEI EBENEN SPEICHERN, und beide braucht es - Marias Vorgabe vom 21.09.2026
 * war "automatisch gespeichert, falls was abstuerzt" UND "speichern, falls man
 * nicht alles auf einmal beantworten will":
 *
 *   SOFORT IM BROWSER. Jede Aenderung landet in `localStorage`. Das kostet
 *   keine Leitung, funktioniert ohne Netz und deckt genau den Fall ab, den
 *   Maria genannt hat: Fenster zu, Akku leer, Seite neu geladen.
 *
 *   VERZOEGERT AUF DEM SERVER. Zweieinhalb Sekunden nach dem letzten
 *   Tastendruck, und nur ab zehn Zeichen (die Datenbank verlangt es, und drei
 *   Buchstaben sind kein Satz). Das deckt den anderen Fall ab: anderes Geraet,
 *   anderer Browser, geloeschte Websitedaten.
 *
 * WARUM BEIDES UND NICHT NUR DER SERVER: Ein Zwischenspeichern bei jedem
 * Tastendruck waere eine Anfrage pro Buchstabe. Und warum nicht nur der
 * Browser: `localStorage` ist in einem privaten Fenster leer, auf dem Telefon
 * nach Wochen weg und auf einem anderen Geraet nie da.
 *
 * WENN BEIDE AUSEINANDERLIEGEN, WIRD ES GESAGT. Wer mit 300 getippten Zeichen
 * die Verbindung verliert, hat auf dem Server vielleicht nur 100. Den
 * laengeren Stand still zu verwerfen waere der schlimmste Fall von allen -
 * also wird der Browserstand wiederhergestellt und ein Satz dazu gezeigt.
 */

const AUTOSAVE_DELAY_MS = 2_500;

type SaveState = "idle" | "local" | "saving" | "saved" | "failed";

function draftKey(sessionId: string, turnId: string) {
  return `cofoundery.interview.${sessionId}.${turnId}`;
}

function readDraft(key: string) {
  // Ein privates Fenster, geloeschte Websitedaten, ein Browser mit
  // abgeschaltetem Speicher: Jeder Zugriff kann werfen, und dann gibt es eben
  // keinen Zwischenstand.
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nichts zu tun: Ein liegengebliebener Zwischenstand wird beim naechsten
    // Mal ueberschrieben.
  }
}

export function InterviewAnswerForm({
  sessionId,
  turnId,
  savedAnswer,
  followUps,
  isLastQuestion,
}: {
  sessionId: string;
  turnId: string;
  /** Was auf dem Server steht - leer, solange nichts gespeichert wurde. */
  savedAnswer: string;
  /** Die geschriebenen Nachfragen zu dieser Frage. */
  followUps: readonly string[];
  isLastQuestion: boolean;
}) {
  const t = useTranslations("capability");
  const key = draftKey(sessionId, turnId);

  const [value, setValue] = useState(savedAnswer);
  const [restored, setRestored] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(savedAnswer ? "saved" : "idle");
  // Was zuletzt wirklich auf dem Server ankam - damit unveraenderter Text
  // keine Anfrage ausloest.
  const lastSaved = useRef(savedAnswer);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Beim Aufbau: Gibt es einen Browserstand, der LAENGER ist als das, was auf
  // dem Server steht, hat jemand geschrieben und es ist nicht angekommen.
  useEffect(() => {
    const draft = readDraft(key);
    if (draft && draft.trim().length > savedAnswer.trim().length) {
      setValue(draft);
      setRestored(true);
      setSaveState("local");
    }
  }, [key, savedAnswer]);

  // Der verzoegerte Gang zum Server. Aufgeraeumt bei jeder Aenderung, damit
  // waehrend des Tippens nichts losgeht.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    const trimmed = value.trim();
    if (trimmed === lastSaved.current.trim()) return;
    if (trimmed.length < NARRATIVE_MIN_LENGTH) return;
    if (trimmed.length > NARRATIVE_MAX_LENGTH) return;

    timer.current = setTimeout(() => {
      setSaveState("saving");
      void autosaveInterviewAnswerAction({ turnId, answer: trimmed })
        .then((result) => {
          if (!result.saved) {
            // Der Browserstand bleibt liegen - er ist jetzt die einzige Kopie.
            setSaveState("failed");
            return;
          }
          lastSaved.current = trimmed;
          setSaveState("saved");
          setRestored(false);
        })
        .catch(() => setSaveState("failed"));
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, turnId]);

  const onChange = (next: string) => {
    setValue(next);
    const stored = writeDraft(key, next);
    // "local" heisst: in diesem Browser gesichert, noch nicht auf dem Server.
    // Das ist die ehrliche Auskunft - "gespeichert" waere hier zu viel.
    if (next.trim() !== lastSaved.current.trim()) setSaveState(stored ? "local" : "failed");
  };

  const tooShort = value.trim().length > 0 && value.trim().length < NARRATIVE_MIN_LENGTH;
  const showFollowUps = value.trim().length >= NARRATIVE_MIN_LENGTH;

  return (
    <div>
      <form action={saveInterviewAnswerAction} onSubmit={() => clearDraft(key)}>
        <input type="hidden" name="turnId" value={turnId} />

        <label htmlFor="answer" className="block text-sm font-medium text-slate-900">
          {t("interview.answerLabel")}
        </label>
        <div className="mt-2">
          <DictatedTextarea
            id="answer"
            name="answer"
            defaultValue={value}
            rows={7}
            maxLength={NARRATIVE_MAX_LENGTH}
            placeholder={t("interview.answerPlaceholder")}
            className="min-h-40 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6"
            onValueChange={onChange}
          />
        </div>

        {/* Der Zustand des Speicherns, in Worten und nicht als Symbol: "local"
            und "saved" sind zwei verschiedene Zusagen, und ein Haken koennte
            beide bedeuten. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5">
          <span
            role="status"
            className={saveState === "failed" ? "text-amber-800" : "text-slate-500"}
          >
            {saveState === "saved"
              ? t("interview.saveStateSaved")
              : saveState === "saving"
                ? t("interview.saveStateSaving")
                : saveState === "local"
                  ? t("interview.saveStateLocal")
                  : saveState === "failed"
                    ? t("interview.saveStateFailed")
                    : t("interview.saveStateIdle")}
          </span>
          <span className="text-slate-400">
            {t("interview.answerHint", { min: NARRATIVE_MIN_LENGTH })}
          </span>
        </div>

        {restored ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            {t("interview.restored")}
          </p>
        ) : null}

        {/* DIE NACHFRAGEN KOMMEN NACH DEM SCHREIBEN, nicht davor. Vorher waeren
            sie drei Fragen gleichzeitig und niemand faengt an; danach sind sie
            das, was sie sein sollen - ein Nachhaken an derselben Geschichte.
            Sie verlaengern dieselbe Antwort und werden keine eigene Station:
            Sechzehn Stationen statt acht waeren eine Stunde. */}
        {showFollowUps && followUps.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-800">
              {t("interview.followUpTitle")}
            </p>
            <ul className="mt-2 grid gap-2">
              {followUps.map((followUp) => (
                <li key={followUp} className="text-sm leading-6 text-slate-700">
                  {followUp}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {t("interview.followUpHint")}
            </p>
          </div>
        ) : null}

        {tooShort ? (
          <p className="mt-3 text-sm leading-6 text-amber-800">
            {t("interview.tooShort", { min: NARRATIVE_MIN_LENGTH })}
          </p>
        ) : null}

        {/* Zwei Absendeknoepfe mit demselben Namen und verschiedenen Werten -
            gewoehnliches HTML, kein JavaScript noetig. Der gedrueckte Knopf
            steht in den Formulardaten. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="mode"
            // Bei der letzten Frage schliesst derselbe Knopf ab: Sonst bliebe
            // das Gespraech bei einer Frage stehen, zu der es keine naechste
            // gibt.
            value={isLastQuestion ? "complete" : "next"}
            disabled={tooShort}
            className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLastQuestion ? t("interview.submitLast") : t("interview.submit")}
          </button>
          <button
            type="submit"
            name="mode"
            value="pause"
            disabled={tooShort}
            className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 disabled:opacity-50"
          >
            {t("interview.pause")}
          </button>
        </div>
      </form>

      {/* Ein eigenes Formular: Ein Formular in einem Formular ist ungueltiges
          HTML. Ueberspringen nimmt den getippten Text nicht mit - das ist
          gewollt, denn es heisst "hierzu habe ich nichts". */}
      <form action={skipInterviewQuestionAction} className="mt-3">
        <input type="hidden" name="turnId" value={turnId} />
        <button
          type="submit"
          className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
        >
          {t("interview.skip")}
        </button>
      </form>
    </div>
  );
}
