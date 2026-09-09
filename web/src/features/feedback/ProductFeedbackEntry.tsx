"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import {
  PRODUCT_FEEDBACK_ASSISTANCE_OPTIONS,
  type ProductFeedbackAssistanceChoice,
  type ProductFeedbackSource,
} from "@/features/feedback/productFeedback";
import { submitProductFeedbackAction } from "@/features/feedback/actions";
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

function ProductFeedbackDialog({
  source,
  invitationId,
  onClose,
}: {
  source: ProductFeedbackSource;
  invitationId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("feedback");
  const [q1Value, setQ1Value] = useState("");
  const [q2Value, setQ2Value] = useState("");
  const [q3Value, setQ3Value] = useState("");
  const [q4Choice, setQ4Choice] = useState<ProductFeedbackAssistanceChoice | null>(null);
  const [q4OtherText, setQ4OtherText] = useState("");
  const [q5Text, setQ5Text] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();

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
      setError(t("requiredError"));
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
            ? t("invalidError")
            : t("saveError")
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
        aria-label={t("close")}
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
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t("trigger")}</p>
                <h2 id={titleId} className="mt-3 text-2xl font-semibold text-slate-950">
                  {t("dialogTitle")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                  {t("dialogText")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label={t("close")}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 overscroll-contain sm:px-8 sm:py-8">
            {submitted ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6">
                <p className="text-lg font-semibold text-emerald-900">
                  {t("thanks")}
                </p>
                <div className="mt-5">
                  <ReportActionButton onClick={onClose} variant="utility">
                    {t("done")}
                  </ReportActionButton>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-5">
                  <FeedbackTextarea
                    id="q1"
                    label={t("questions.q1")}
                    value={q1Value}
                    onChange={setQ1Value}
                    required
                  />
                  <FeedbackTextarea
                    id="q2"
                    label={t("questions.q2")}
                    value={q2Value}
                    onChange={setQ2Value}
                    required
                  />
                  <FeedbackTextarea
                    id="q3"
                    label={t("questions.q3")}
                    value={q3Value}
                    onChange={setQ3Value}
                    required
                  />
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/75 p-5">
                  <p className="text-sm font-semibold text-slate-950">
                    {t("questions.q4")}
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
                          {t(`assistance.${option.value}`)}
                        </button>
                      );
                    })}
                  </div>
                  {q4Choice === "anderes" ? (
                    <div className="mt-4">
                      <FeedbackTextarea
                        id="q4-other"
                        label={t("questions.q4Other")}
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
                    label={t("questions.q5")}
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
                    {t("requiredHint")}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <ReportActionButton onClick={onClose} variant="utility">
                      {t("cancel")}
                    </ReportActionButton>
                    <ReportActionButton onClick={handleSubmit} disabled={isPending}>
                      {isPending ? t("saving") : t("submit")}
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
          rows={rows}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm leading-7 text-slate-800 outline-none transition focus:border-[color:var(--brand-primary)] focus:ring-2 focus:ring-[color:var(--brand-primary)]/20"
        />
        <DictationButton dictation={dictation} />
        <DictationBadge dictation={dictation} />
      </div>
      <DictationMessage dictation={dictation} />
    </label>
  );
}
