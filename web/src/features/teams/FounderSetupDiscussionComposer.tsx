"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { getSpeechRecognitionLocale } from "@/i18n/presentationLocale";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function FounderSetupDiscussionComposer({
  action,
  parentEntryId,
  compact = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  parentEntryId?: string;
  compact?: boolean;
}) {
  const t = useTranslations("teams.setup.discussion");
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function toggleDictation() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError(true);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = getSpeechRecognitionLocale(locale);
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setBody((current) => `${current.trim()}${current.trim() ? " " : ""}${transcript}`);
    };
    recognition.onerror = () => {
      setSpeechError(true);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechError(false);
    setListening(true);
    recognition.start();
  }

  return (
    <form action={action} className={compact ? "mt-3" : "mt-5"}>
      {parentEntryId ? <input type="hidden" name="parentEntryId" value={parentEntryId} /> : null}
      <label className="sr-only" htmlFor={`discussion-${parentEntryId ?? "root"}`}>
        {parentEntryId ? t("replyLabel") : t("postLabel")}
      </label>
      <textarea
        id={`discussion-${parentEntryId ?? "root"}`}
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={5000}
        rows={compact ? 3 : 4}
        placeholder={parentEntryId ? t("replyPlaceholder") : t("postPlaceholder")}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ReportActionButton type="submit" variant={compact ? "utility" : "primary"} disabled={!body.trim()}>
          {parentEntryId ? t("replyAction") : t("postAction")}
        </ReportActionButton>
        <button
          type="button"
          onClick={toggleDictation}
          className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
          aria-pressed={listening}
        >
          {listening ? t("dictationStop") : t("dictationStart")}
        </button>
        {listening ? <span role="status" className="text-xs text-slate-600">{t("dictationListening")}</span> : null}
        {speechError ? <span role="status" className="text-xs text-slate-600">{t("dictationUnavailable")}</span> : null}
      </div>
    </form>
  );
}
