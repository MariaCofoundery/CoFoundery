"use client";

import { useLocale, useTranslations } from "next-intl";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { getSpeechRecognitionLocale } from "@/i18n/presentationLocale";
import type { CommitmentLabDiscussionMarker } from "@/features/commitmentLab/commitmentLabModel";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionConstructor = new () => Recognition;

const MarkerContext = createContext<{
  markers: Set<CommitmentLabDiscussionMarker>;
  toggle: (marker: CommitmentLabDiscussionMarker) => void;
} | null>(null);

export function CommitmentLabMarkerProvider({
  initialMarkers,
  children,
}: {
  initialMarkers: CommitmentLabDiscussionMarker[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState(initialMarkers);
  const markers = useMemo(() => new Set(selected), [selected]);
  function toggle(marker: CommitmentLabDiscussionMarker) {
    setSelected((current) => current.includes(marker)
      ? current.filter((entry) => entry !== marker)
      : current.length < 3 ? [...current, marker] : current);
  }
  return <MarkerContext.Provider value={{ markers, toggle }}>{children}</MarkerContext.Provider>;
}

export function CommitmentLabMarkerToggle({ marker }: { marker: CommitmentLabDiscussionMarker }) {
  const t = useTranslations("teams.commitmentLab.markers");
  const context = useContext(MarkerContext);
  if (!context) return null;
  const checked = context.markers.has(marker);
  const disabled = !checked && context.markers.size >= 3;
  return (
    <label className={`mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${checked ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-600"} ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        name="discussionMarkers"
        value={marker}
        checked={checked}
        disabled={disabled}
        onChange={() => context.toggle(marker)}
        className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
      />
      {t("toggle")}
    </label>
  );
}

export function CommitmentLabSpeechTextarea({
  id,
  name,
  defaultValue = "",
  placeholder,
  rows = 4,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  const t = useTranslations("teams.commitmentLab.speech");
  const locale = useLocale();
  const [text, setText] = useState(defaultValue);
  const [listening, setListening] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const ref = useRef<Recognition | null>(null);
  function toggle() {
    if (listening) return ref.current?.stop();
    const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) return setUnavailable(true);
    const recognition = new Constructor();
    recognition.lang = getSpeechRecognitionLocale(locale);
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).filter((result) => result.isFinal).map((result) => result[0]?.transcript ?? "").join(" ").trim();
      if (transcript) setText((current) => `${current.trim()}${current.trim() ? " " : ""}${transcript}`);
    };
    recognition.onerror = () => { setUnavailable(true); setListening(false); };
    recognition.onend = () => setListening(false);
    ref.current = recognition;
    setUnavailable(false);
    setListening(true);
    recognition.start();
  }
  return (
    <div className="mt-2">
      <textarea id={id} name={name} value={text} onChange={(event) => setText(event.target.value)} maxLength={5000} rows={rows} placeholder={placeholder} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggle} aria-pressed={listening} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
          {listening ? t("stop") : t("start")}
        </button>
        {listening ? <span role="status" className="text-xs text-slate-600">{t("listening")}</span> : null}
        {unavailable ? <span role="status" className="text-xs text-slate-600">{t("unavailable")}</span> : null}
      </div>
    </div>
  );
}

export function CommitmentLabDiscussionComposer({
  action,
  parentEntryId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  parentEntryId?: string;
}) {
  const t = useTranslations("teams.commitmentLab.discussion");
  return (
    <form action={action} className="mt-4">
      {parentEntryId ? <input type="hidden" name="parentEntryId" value={parentEntryId} /> : null}
      <label className="sr-only" htmlFor={`commitment-discussion-${parentEntryId ?? "root"}`}>{parentEntryId ? t("replyLabel") : t("postLabel")}</label>
      <CommitmentLabSpeechTextarea id={`commitment-discussion-${parentEntryId ?? "root"}`} name="body" placeholder={parentEntryId ? t("replyPlaceholder") : t("postPlaceholder")} rows={parentEntryId ? 3 : 4} />
      <ReportActionButton type="submit" variant={parentEntryId ? "utility" : "primary"} className="mt-3 min-h-11">{parentEntryId ? t("reply") : t("post")}</ReportActionButton>
    </form>
  );
}
