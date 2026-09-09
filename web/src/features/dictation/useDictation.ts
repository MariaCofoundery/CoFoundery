"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSpeechRecognitionLocale } from "@/i18n/presentationLocale";

/**
 * Diktat fuer Freitextfelder - eine Implementierung fuer alle Stellen.
 *
 * Die Logik lag zuletzt in vier Komponenten mit vier Reifegraden nebeneinander;
 * die ausgereifteste (Produkt-Feedback) ist hier hergezogen und die anderen
 * folgen. Der Unterschied ist nicht Kosmetik: Wer nur `continuous = false`
 * setzt, bekommt nach dem ersten Satz Stille - und genau das ist beim Erzaehlen
 * einer laengeren Sache der Normalfall.
 *
 * Drei Eigenschaften, die das Feld erst brauchbar machen:
 *
 *   Fortlaufend    Die Browser-Erkennung beendet sich nach kurzer Stille von
 *                  selbst. Solange die Person nicht gestoppt hat, wird neu
 *                  gestartet ("paused" statt "aus").
 *   Zwischenstand  `interimResults` zeigt Gesagtes schon waehrend des
 *                  Sprechens. Ohne das wirkt das Feld eingefroren.
 *   Eigenes Ende   Nach `DICTATION_INACTIVITY_MS` ohne Sprache endet die
 *                  Aufnahme selbst - ein offenes Mikrofon soll niemand
 *                  versehentlich laufen lassen.
 *
 * Bewusst nur die Browser-API, kein Dienst: Nichts vom Diktierten verlaesst das
 * Geraet ueber unsere Wege, und es entsteht keine Auftragsverarbeitung. Was der
 * Browser selbst serverseitig erkennt (Chrome tut das), liegt beim Browser der
 * Person - deshalb nennt die Oberflaeche das Diktat eine Browser-Funktion.
 *
 * Die Copy kommt als `copy` herein statt ueber useTranslations: Der Hook soll
 * nicht festlegen, in welchem Namensraum die Texte einer Seite liegen.
 */

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

/** "unknown" bis der Client geprueft hat - der Server weiss es nicht. */
export type SpeechSupportState = "unknown" | "supported" | "unsupported";

export type DictationStatus = "idle" | "listening" | "paused" | "ended" | "error";

export type DictationErrorKey = "permission" | "microphone" | "aborted" | "noSpeech" | "generic";

export type DictationCopy = {
  listening: string;
  accepted: string;
  startFailed: string;
  restartFailed: string;
  unsupported: string;
  error: (key: DictationErrorKey) => string;
};

export type DictationHandle = {
  supportState: SpeechSupportState;
  active: boolean;
  status: DictationStatus;
  message: string | null;
  toggle: () => void;
};

const DICTATION_INACTIVITY_MS = 9000;
const DICTATION_RESTART_MS = 250;

export function useDictation({
  value,
  onChange,
  locale,
  copy,
}: {
  value: string;
  onChange: (value: string) => void;
  locale: string;
  copy: DictationCopy;
}): DictationHandle {
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

  // Getipptes waehrend der Aufnahme wuerde sonst vom naechsten Zwischenstand
  // ueberschrieben: Der Basiswert friert ein, solange das Mikrofon laeuft.
  useEffect(() => {
    if (speechActive) return;
    baseValueRef.current = value;
  }, [speechActive, value]);

  // Ein laufendes Mikrofon darf einen Seitenwechsel nicht ueberleben.
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
      setSpeechMessage(copy.accepted);
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
    finishDictationSession("ended", copy.accepted);
    recognitionRef.current?.stop();
  }

  function startDictation() {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor(window);
    if (!SpeechRecognitionCtor) {
      setSpeechMessage(copy.unsupported);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getSpeechRecognitionLocale(locale);
    recognition.onresult = handleSpeechResult;
    recognition.onerror = (event) => {
      // Stille ist kein Fehler, solange die Person nicht gestoppt hat.
      if (event.error === "no-speech" && shouldKeepListeningRef.current) {
        setDictationStatus("paused");
        setSpeechMessage(null);
        return;
      }

      finishDictationSession("error", copy.error(mapSpeechErrorKey(event.error)));
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
            finishDictationSession("error", copy.restartFailed);
          }
        }, DICTATION_RESTART_MS);
        return;
      }

      if (dictationStatus !== "error") {
        finishDictationSession("ended", copy.accepted);
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
      setSpeechMessage(copy.listening);
      scheduleInactivityTimeout();
    } catch {
      finishDictationSession("error", copy.startFailed);
    }
  }

  function toggleDictation() {
    if (speechActive) {
      stopDictation();
      return;
    }

    startDictation();
  }

  return {
    supportState: speechSupportState,
    active: speechActive,
    status: dictationStatus,
    message: speechMessage,
    toggle: toggleDictation,
  };
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

export function appendSpeechChunk(currentText: string, nextChunk: string) {
  const trimmedChunk = nextChunk.trim();
  if (!trimmedChunk) return currentText;
  if (!currentText.trim()) return trimmedChunk;
  return `${currentText.trim()} ${trimmedChunk}`;
}

/**
 * Diktiertes haengt hinten an, getrennt durch eine Leerzeile - was jemand
 * vorher getippt hat, bleibt unangetastet und bleibt als eigener Absatz
 * erkennbar.
 */
export function mergeSpeechIntoValue(
  baseValue: string,
  finalizedChunk: string,
  interimChunk: string
) {
  const pieces = [baseValue.trim(), finalizedChunk.trim(), interimChunk.trim()].filter(Boolean);
  if (pieces.length === 0) return "";
  return pieces.join(baseValue.trim() ? "\n\n" : " ");
}

export function mapSpeechErrorKey(error: string): DictationErrorKey {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "permission";
    case "audio-capture":
      return "microphone";
    case "aborted":
      return "aborted";
    case "no-speech":
      return "noSpeech";
    default:
      return "generic";
  }
}
