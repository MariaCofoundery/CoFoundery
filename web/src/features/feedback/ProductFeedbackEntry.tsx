"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { FEEDBACK_IMPORTANCE, FEEDBACK_KINDS, feedbackContextOf, type FeedbackImportance, type FeedbackKind, type FeedbackMoment, type ProductFeedbackSource } from "@/features/feedback/feedbackModel";
import { submitFeedbackAction } from "@/features/feedback/actions";
// Das Diktat lag hier zuerst und ist von hier nach @/features/dictation
// gezogen, weil inzwischen mehrere Felder es brauchen.
import {
  DictationBadge,
  DictationButton,
  DictationMessage,
  useDictationCopy,
} from "@/features/dictation/DictationControls";
import { useDictation } from "@/features/dictation/useDictation";

type ProductFeedbackEntryProps = {
  source: ProductFeedbackSource;
  invitationId?: string | null;
  variant: "nav" | "workbook";
  triggerClassName?: string;
};

export function ProductFeedbackEntry({
  source,
  invitationId = null,
  variant,
  triggerClassName,
}: ProductFeedbackEntryProps) {
  const t = useTranslations("feedback");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === "nav" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={triggerClassName}
        >
          {t("trigger")}
        </button>
      ) : (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 print:hidden">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("trigger")}</p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">
            {t("workbookTitle")}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            {t("workbookText")}
          </p>
          <div className="mt-5">
            <ReportActionButton onClick={() => setIsOpen(true)}>
              {t("giveFeedback")}
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

/**
 * Das Feedback-Panel (Entwurf vom 09.11.2026, freigegeben): eine Art, ein Text, der Ort, optional die Wichtigkeit und
 * ein ausdrueckliches "darf angeschrieben werden". Am Computer ein Panel rechts - die Seite dahinter bleibt sichtbar
 * und bedienbar; auf dem Handy ein Blatt von unten. Der Ort kommt aus der Adresse (der Server bestimmt ihn noch einmal).
 */
export function ProductFeedbackDialog({
  source,
  invitationId,
  onClose,
  initialKind = null,
  moment = null,
}: {
  source: ProductFeedbackSource;
  invitationId: string | null;
  onClose: () => void;
  /** Aus einer kleinen Frage: "Ja" = hat geholfen, "Nicht so" = unklar. */
  initialKind?: FeedbackKind | null;
  /** Aus einer kleinen Frage: wozu das Feedback gehoert. */
  moment?: FeedbackMoment | null;
}) {
  const t = useTranslations("feedback");
  const pathname = usePathname();
  const [kind, setKind] = useState<FeedbackKind | null>(initialKind);
  const [message, setMessage] = useState("");
  const [importance, setImportance] = useState<FeedbackImportance | null>(null);
  const [mayContact, setMayContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [compact, setCompact] = useState(false);
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const context = feedbackContextOf(pathname ?? "");
  const where = [t(`areas.${context.area}`), context.sub ? t(`subs.${context.area}_${context.sub}`) : null].filter(Boolean).join(" › ");

  // Die Handy-Fassung folgt der Fensterbreite (wie sm in Tailwind).
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Es schliesst nur das Panel - nicht zugleich ein Seitenpanel dahinter.
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  // Nur das Blatt auf dem Handy haelt die Seite an. Am Computer bleibt sie bedienbar.
  useEffect(() => {
    if (!compact) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [compact]);

  function handleSubmit() {
    if (!kind) return setError(t("panel.kindRequired"));
    if (!message.trim()) return setError(t("panel.textRequired"));
    setError(null);
    startTransition(async () => {
      const result = await submitFeedbackAction({
        source,
        invitationId,
        kind,
        message,
        importance,
        mayContact,
        pathname,
        device: compact ? "phone" : "desktop",
        moment,
      });
      if (!result.ok) {
        setError(result.reason === "invalid_input" ? t("invalidError") : t("saveError"));
        return;
      }
      setSubmitted(true);
    });
  }

  function writeMore() {
    setKind(null);
    setMessage("");
    setImportance(null);
    setMayContact(false);
    setSubmitted(false);
  }

  const copy = kind ? { question: t(`panel.kinds.${kind}.question`), placeholder: t(`panel.kinds.${kind}.placeholder`), hint: t(`panel.kinds.${kind}.hint`) } : { question: t("panel.genericQuestion"), placeholder: "", hint: t("panel.genericHint") };
  const seg = (on: boolean) =>
    `min-h-10 flex-1 rounded-[9px] px-2 text-[13.5px] font-semibold transition ${on ? "bg-white text-[#14152B] shadow-sm" : "text-[#4A4D68] hover:text-[#14152B]"}`;

  return (
    <>
      {compact ? <button type="button" aria-label={t("close")} onClick={onClose} className="fixed inset-0 z-[119] cursor-default bg-[#14152B]/40" /> : null}
      <aside
        role="dialog"
        aria-modal={compact ? true : undefined}
        aria-labelledby={titleId}
        className={`work-ui fixed z-[120] flex flex-col bg-white text-[#14152B] ${
          compact
            ? "inset-x-0 bottom-0 top-28 rounded-t-3xl"
            : "bottom-0 right-0 top-0 w-[440px] max-w-full border-l border-[#DCDEEC] shadow-[-18px_0_44px_-18px_rgba(20,21,43,0.28)]"
        }`}
      >
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-[#EEF0F7] px-6 pb-4 pt-5">
          {compact ? <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-[#C9CCE0]" /> : null}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-brand text-[24px] font-bold leading-tight outline-none">
                {t("panel.title")}
              </h2>
              <p className="mt-1 text-[13.5px] leading-5 text-[#4A4D68]">{t("panel.subtitle")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl leading-none text-[#3C3F5A] hover:bg-slate-100"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <p className="flex items-center gap-2 rounded-xl bg-[#F4F5FB] px-3 py-2 text-[13px] text-[#3C3F5A]">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6D49E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>
              {t("panel.context")} <b className="text-[#14152B]">{where}</b>
            </span>
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-1 flex-col items-start gap-3.5 overflow-y-auto px-7 py-9">
            <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-[#E3F5EC]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14683F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </span>
            <p role="status" className="font-brand text-2xl font-bold leading-tight">{t("panel.thanksTitle")}</p>
            <p className="text-[14.5px] leading-6 text-[#3C3F5A]">{t("panel.thanksText")}</p>
            <div className="mt-2 flex flex-wrap gap-2.5">
              <button type="button" onClick={writeMore} className="min-h-11 rounded-xl border border-[#C9CCE0] bg-white px-4 text-sm font-semibold hover:bg-slate-50">{t("panel.writeMore")}</button>
              <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B3BC8]">{t("done")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto overscroll-contain px-6 pb-2 pt-5">
              <fieldset className="grid gap-2.5">
                <legend className="mb-2.5 text-sm font-bold">{t("panel.whatAbout")}</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  {FEEDBACK_KINDS.map((entry) => (
                    <label
                      key={entry}
                      className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-[14px] border-2 px-3 py-2 focus-within:ring-2 focus-within:ring-[#6D49E0] ${
                        kind === entry ? "border-[#6D49E0] bg-[#F3EFFE]" : "border-[#E1E3EF] bg-white hover:border-[#C9CCE0]"
                      }`}
                    >
                      <input type="radio" name="feedback-kind" value={entry} checked={kind === entry} onChange={() => setKind(entry)} className="sr-only" />
                      <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${KIND_TONE[entry].bg}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KIND_TONE[entry].stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={KIND_TONE[entry].icon} />
                        </svg>
                      </span>
                      <span className="text-sm font-bold">{t(`panel.kinds.${entry}.name`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <FeedbackTextarea id="feedback-message" label={copy.question} hint={copy.hint} placeholder={copy.placeholder} value={message} onChange={setMessage} required rows={5} />

              <fieldset>
                <legend className="mb-2 text-sm font-bold">
                  {t("panel.importance")} <span className="font-normal text-[#5A5D78]">{t("panel.optional")}</span>
                </legend>
                <div role="group" className="flex gap-1 rounded-xl bg-[#EEF0F7] p-1">
                  {FEEDBACK_IMPORTANCE.map((entry) => (
                    <button key={entry} type="button" aria-pressed={importance === entry} onClick={() => setImportance(importance === entry ? null : entry)} className={seg(importance === entry)}>
                      {t(`panel.importanceLevels.${entry}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-[#EEF0F7] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[19px] text-[#3C3F5A]">
                <input type="checkbox" checked={mayContact} onChange={(event) => setMayContact(event.target.checked)} className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                <span>
                  <b className="text-[#14152B]">{t("panel.contactTitle")}</b> {t("panel.contactText")}
                </span>
              </label>
              {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`min-w-0 text-xs leading-[17px] text-[#5A5D78] ${compact ? "basis-full" : "flex-1 basis-40"}`}>{t("nameNotice")}</p>
                <button type="button" onClick={onClose} className={`min-h-11 rounded-xl border border-[#C9CCE0] bg-white px-4 text-sm font-semibold hover:bg-slate-50 ${compact ? "flex-1" : ""}`}>{t("cancel")}</button>
                <button type="button" onClick={handleSubmit} disabled={isPending} className={`min-h-11 rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B3BC8] disabled:opacity-60 ${compact ? "flex-1" : ""}`}>
                  {isPending ? t("saving") : t("panel.send")}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/** Symbol und Farbton je Art (Zierde - der Name steht daneben). */
const KIND_TONE: Record<FeedbackKind, { bg: string; stroke: string; icon: string }> = {
  help: { bg: "bg-[#E3F5EC]", stroke: "#14683F", icon: "m5 12.5 4.5 4.5L19 7.5" },
  unclear: { bg: "bg-[#FFF0D6]", stroke: "#8A4B00", icon: "M9.2 9.2a3 3 0 1 1 4.2 2.7c-.9.4-1.4 1-1.4 2M12 17.5h.01" },
  bug: { bg: "bg-[#FDE3E3]", stroke: "#9B1C1C", icon: "M12 7v6M12 17h.01M10.3 3.6 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0z" },
  missing: { bg: "bg-[#E3DBFC]", stroke: "#4B2FB8", icon: "M12 5v14M5 12h14" },
};

function FeedbackTextarea({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  required = false,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  const locale = useLocale();
  const copy = useDictationCopy();
  const dictation = useDictation({ value, onChange, locale, copy });

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
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm leading-7 text-slate-800 outline-none transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary)]/20"
        />
        <DictationButton dictation={dictation} />
        <DictationBadge dictation={dictation} />
      </div>
      <DictationMessage dictation={dictation} />
      {hint ? <span className="mt-1.5 block text-[12.5px] font-normal leading-[18px] text-[#5A5D78]">{hint}</span> : null}
    </label>
  );
}
