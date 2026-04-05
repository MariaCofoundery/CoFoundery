"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS,
  type ProductFeedbackAssistanceChoice,
  type ProductFeedbackSource,
} from "@/features/feedback/productFeedback";
import { submitProductFeedbackAction } from "@/features/feedback/actions";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type ProductFeedbackEntryProps = {
  source: ProductFeedbackSource;
  invitationId?: string | null;
  variant: "nav" | "workbook";
  triggerClassName?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechSupportState = "unknown" | "supported" | "unsupported";
type DictationStatus = "idle" | "listening" | "paused" | "ended" | "error";

const DEFAULT_SPEECH_LANGUAGE = "de-DE";
const DICTATION_INACTIVITY_MS = 9000;
const DICTATION_RESTART_MS = 250;

export function ProductFeedbackEntry({
  source,
  invitationId = null,
  variant,
  triggerClassName,
}: ProductFeedbackEntryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === "nav" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={triggerClassName}
        >
          {t("Feedback")}
        </button>
      ) : (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 print:hidden">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("Feedback")}</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">
            {t("Kurzer Check: Hat euch das wirklich weitergebracht?")}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            {t(
              "Ich baue CoFoundery gerade aktiv weiter — dein Feedback hilft mir extrem, das Tool wirklich besser zu machen."
            )}
          </p>
          <div className="mt-5">
            <ReportActionButton onClick={() => setIsOpen(true)}>
              {t("Feedback geben")}
            </ReportActionButton>
          </div>
        </section>
      )}

      {isOpen ? (
        <ProductFeedbackDialog
          invitationId={invitationId}
          source={source}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}

function ProductFeedbackDialog({
  source,
  invitationId,
  onClose,
}: {
  source: ProductFeedbackSource;
  invitationId: string | null;
  onClose: () => void;
}) {
  const [q1Value, setQ1Value] = useState("");
  const [q2Value, setQ2Value] = useState("");
  const [q3Value, setQ3Value] = useState("");
  const [q4Choice, setQ4Choice] = useState<ProductFeedbackAssistanceChoice | null>(null);
  const [q4OtherText, setQ4OtherText] = useState("");
  const [q5Text, setQ5Text] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const titleId = useMemo(
    () => `product-feedback-title-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function handleSubmit() {
    if (!q1Value.trim() || !q2Value.trim() || !q3Value.trim()) {
      setError(t("Bitte beantworte zuerst die drei Fragen, die fuer mich besonders wichtig sind."));
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await submitProductFeedbackAction({
        source,
        invitationId,
        q1Value,
        q2Value,
        q3Value,
        q4Choice,
        q4OtherText,
        q5Text,
      });

      if (!result.ok) {
        setError(
          result.reason === "invalid_input"
            ? t("Bitte pruefe deine Antworten noch einmal.")
            : t("Das Feedback konnte gerade nicht gespeichert werden.")
        );
        return;
      }

      setSubmitted(true);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label={t("Feedback schliessen")}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className="relative flex min-h-full w-full items-start justify-center overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6"
      >
        <div
          className="flex w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200/90 bg-white/98 shadow-[0_24px_80px_rgba(15,23,42,0.22)] max-h-[90dvh] sm:max-h-[88dvh]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="shrink-0 border-b border-slate-200/80 px-6 py-6 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("Feedback")}</p>
                <h2 id={titleId} className="mt-3 text-2xl font-semibold text-slate-950">
                  {t("Kurzer Produkt-Check")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                  {t(
                    "Ich freue mich wirklich ueber dein Feedback — vor allem, was dir geholfen hat, was unklar war und was noch fehlt."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label={t("Feedback schliessen")}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 overscroll-contain sm:px-8 sm:py-8">
            {submitted ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6">
                <p className="text-lg font-semibold text-emerald-900">
                  {t("Danke — das hilft mir wirklich weiter.")}
                </p>
                <div className="mt-5">
                  <ReportActionButton onClick={onClose} variant="utility">
                    {t("Schliessen")}
                  </ReportActionButton>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-5">
                  <FeedbackTextarea
                    id="q1"
                    label={t("1. Was war fuer dich der wertvollste Moment im Tool?")}
                    value={q1Value}
                    onChange={setQ1Value}
                    required
                  />
                  <FeedbackTextarea
                    id="q2"
                    label={t("2. Wo hat es sich nicht klar oder unnoetig kompliziert angefuehlt?")}
                    value={q2Value}
                    onChange={setQ2Value}
                    required
                  />
                  <FeedbackTextarea
                    id="q3"
                    label={t(
                      "3. Was muesste sich aendern, damit du sagen wuerdest: Das hat mir wirklich geholfen?"
                    )}
                    value={q3Value}
                    onChange={setQ3Value}
                    required
                  />
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/75 p-5">
                  <p className="text-sm font-semibold text-slate-950">
                    {t("4. Wobei wuerdest du dir noch mehr Unterstuetzung wuenschen?")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS.map((option) => {
                      const isActive = q4Choice === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setQ4Choice(option.value)}
                          className={`rounded-full border px-3 py-2 text-sm transition ${
                            isActive
                              ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/12 text-slate-950"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {t(option.label)}
                        </button>
                      );
                    })}
                  </div>
                  {q4Choice === "anderes" ? (
                    <div className="mt-4">
                      <FeedbackTextarea
                        id="q4-other"
                        label={t("Was genau fehlt dir noch?")}
                        value={q4OtherText}
                        onChange={setQ4OtherText}
                        rows={4}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-8">
                  <FeedbackTextarea
                    id="q5"
                    label={t("5. Gibt es noch etwas, das du mir sagen moechtest?")}
                    value={q5Text}
                    onChange={setQ5Text}
                    rows={5}
                  />
                </div>

                {error ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-6 text-slate-500">
                    {t("Die ersten drei Fragen sind fuer mich besonders wichtig, alles andere ist optional.")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ReportActionButton onClick={onClose} variant="utility">
                      {t("Abbrechen")}
                    </ReportActionButton>
                    <ReportActionButton onClick={handleSubmit} disabled={isPending}>
                      {isPending ? t("Speichere...") : t("Feedback senden")}
                    </ReportActionButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackTextarea({
  id,
  label,
  value,
  onChange,
  required = false,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}) {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseValueRef = useRef(value);
  const finalTranscriptRef = useRef("");
  const speechSupportState = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot
  );
  const [speechActive, setSpeechActive] = useState(false);
  const [dictationStatus, setDictationStatus] = useState<DictationStatus>("idle");
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);

  useEffect(() => {
    if (speechActive) return;
    baseValueRef.current = value;
  }, [speechActive, value]);

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      clearDictationTimers(inactivityTimeoutRef, restartTimeoutRef);
      recognitionRef.current?.abort();
    };
  }, []);

  function scheduleInactivityTimeout() {
    clearTimeoutIfSet(inactivityTimeoutRef);
    inactivityTimeoutRef.current = setTimeout(() => {
      shouldKeepListeningRef.current = false;
      clearTimeoutIfSet(restartTimeoutRef);
      setSpeechActive(false);
      setDictationStatus("ended");
      setSpeechMessage(t("Text uebernommen. Du kannst direkt weiter diktieren."));
      recognitionRef.current?.stop();
    }, DICTATION_INACTIVITY_MS);
  }

  function finishDictationSession(status: DictationStatus, message: string | null) {
    shouldKeepListeningRef.current = false;
    clearDictationTimers(inactivityTimeoutRef, restartTimeoutRef);
    setSpeechActive(false);
    setDictationStatus(status);
    setSpeechMessage(message);
  }

  function handleSpeechResult(event: SpeechRecognitionEventLike) {
    let finalizedChunk = finalTranscriptRef.current;
    let interimChunk = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript?.trim();
      if (!transcript) continue;

      if (result.isFinal) {
        finalizedChunk = appendSpeechChunk(finalizedChunk, transcript);
      } else {
        interimChunk = appendSpeechChunk(interimChunk, transcript);
      }
    }

    finalTranscriptRef.current = finalizedChunk;
    setDictationStatus("listening");
    setSpeechMessage(null);
    scheduleInactivityTimeout();
    onChange(mergeSpeechIntoValue(baseValueRef.current, finalizedChunk, interimChunk));
  }

  function stopDictation() {
    finishDictationSession("ended", t("Text uebernommen. Du kannst direkt weiter diktieren."));
    recognitionRef.current?.stop();
  }

  function startDictation() {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor(window);
    if (!SpeechRecognitionCtor) {
      setSpeechMessage(t("Diktieren ist in diesem Browser nicht verfuegbar."));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = DEFAULT_SPEECH_LANGUAGE;
    recognition.onresult = handleSpeechResult;
    recognition.onerror = (event) => {
      if (event.error === "no-speech" && shouldKeepListeningRef.current) {
        setDictationStatus("paused");
        setSpeechMessage(null);
        return;
      }

      finishDictationSession("error", mapSpeechError(event.error));
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        setDictationStatus("paused");
        setSpeechMessage(null);
        clearTimeoutIfSet(restartTimeoutRef);
        restartTimeoutRef.current = setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;

          try {
            recognition.start();
            setSpeechActive(true);
            setDictationStatus("listening");
            setSpeechMessage(null);
          } catch {
            finishDictationSession("error", t("Die Aufnahme konnte nicht erneut gestartet werden."));
          }
        }, DICTATION_RESTART_MS);
        return;
      }

      if (dictationStatus !== "error") {
        finishDictationSession("ended", t("Text uebernommen. Du kannst direkt weiter diktieren."));
      }
    };

    baseValueRef.current = value;
    finalTranscriptRef.current = "";
    shouldKeepListeningRef.current = true;
    clearDictationTimers(inactivityTimeoutRef, restartTimeoutRef);
    recognitionRef.current?.abort();
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setSpeechActive(true);
      setDictationStatus("listening");
      setSpeechMessage(t("Ich hoere zu ..."));
      scheduleInactivityTimeout();
    } catch {
      finishDictationSession("error", t("Die Aufnahme konnte gerade nicht gestartet werden."));
    }
  }

  function toggleDictation() {
    if (speechActive) {
      stopDictation();
      return;
    }

    startDictation();
  }

  const showMicButton = speechSupportState !== "unsupported";
  const showListeningBadge = speechActive || dictationStatus === "paused";

  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-slate-950">
        {label}
        {required ? <span className="ml-1 text-[color:var(--brand-accent)]">*</span> : null}
      </span>
      <div className="relative mt-3">
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm leading-7 text-slate-800 outline-none transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary)]/20"
        />
        {showMicButton ? (
          <button
            type="button"
            onClick={toggleDictation}
            className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
              speechActive
                ? "border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10 text-[color:var(--brand-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            }`}
            aria-label={speechActive ? t("Diktat stoppen") : t("Diktat starten")}
            title={speechActive ? t("Diktat stoppen") : t("Diktat starten")}
          >
            <MicIcon active={speechActive} />
          </button>
        ) : null}
        {showListeningBadge ? (
          <div className="pointer-events-none absolute left-4 top-3 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/92 px-2.5 py-1 text-[11px] text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
            <span
              className={`h-2 w-2 rounded-full ${
                speechActive ? "bg-[color:var(--brand-primary)]" : "bg-amber-400"
              }`}
            />
            <span>{speechActive ? t("Aufnahme laeuft") : t("Wartet auf Sprache")}</span>
          </div>
        ) : null}
      </div>
      {speechSupportState === "unsupported" ? (
        <p className="mt-2 text-xs leading-6 text-slate-500">
          {t("Diktieren ist in diesem Browser leider nicht verfuegbar.")}
        </p>
      ) : speechMessage ? (
        <p
          className={`mt-2 text-xs leading-6 ${
            dictationStatus === "error" ? "text-rose-600" : speechActive ? "text-[color:var(--brand-primary)]" : "text-slate-500"
          }`}
        >
          {speechMessage}
        </p>
      ) : null}
    </label>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </svg>
  );
}

function getSpeechRecognitionConstructor(windowObject: Window) {
  const extendedWindow = windowObject as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return extendedWindow.SpeechRecognition ?? extendedWindow.webkitSpeechRecognition ?? null;
}

function subscribeToSpeechSupport() {
  return () => {};
}

function getSpeechSupportSnapshot(): SpeechSupportState {
  if (typeof window === "undefined") return "unknown";
  return getSpeechRecognitionConstructor(window) ? "supported" : "unsupported";
}

function getSpeechSupportServerSnapshot(): SpeechSupportState {
  return "unknown";
}

function clearTimeoutIfSet(timeoutRef: { current: ReturnType<typeof setTimeout> | null }) {
  if (timeoutRef.current === null) return;
  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function clearDictationTimers(
  inactivityTimeoutRef: { current: ReturnType<typeof setTimeout> | null },
  restartTimeoutRef: { current: ReturnType<typeof setTimeout> | null }
) {
  clearTimeoutIfSet(inactivityTimeoutRef);
  clearTimeoutIfSet(restartTimeoutRef);
}

function appendSpeechChunk(currentText: string, nextChunk: string) {
  const trimmedChunk = nextChunk.trim();
  if (!trimmedChunk) return currentText;
  if (!currentText.trim()) return trimmedChunk;
  return `${currentText.trim()} ${trimmedChunk}`;
}

function mergeSpeechIntoValue(baseValue: string, finalizedChunk: string, interimChunk: string) {
  const pieces = [baseValue.trim(), finalizedChunk.trim(), interimChunk.trim()].filter(Boolean);
  if (pieces.length === 0) return "";
  return pieces.join(baseValue.trim() ? "\n\n" : " ");
}

function mapSpeechError(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Der Mikrofonzugriff wurde nicht freigegeben.";
    case "audio-capture":
      return "Es konnte kein Mikrofon gefunden werden.";
    case "aborted":
      return "Die Aufnahme wurde beendet.";
    case "no-speech":
      return "Es wurde gerade keine Sprache erkannt.";
    default:
      return "Die Sprachaufnahme konnte gerade nicht verarbeitet werden.";
  }
}
