"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import { AnswerFieldV21, type DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import { completenessV21, type AlignmentAnswerV21, type AnswerableItem } from "@/features/instruments/v21/answersV21";
import type { ItemView } from "@/features/instruments/v21/questionnaireDataV21";
import { clearTradeoffAnswer, saveTradeoffAnswer, submitTradeoffs } from "@/features/modules/tradeoffs/actions";
import { StepShell } from "@/features/modules/ui/StepShell";
import type { AppLocale } from "@/i18n/config";

/**
 * Der Flow fuer die vier Situationen von „Werte & Zielkonflikte".
 *
 * Schlank und freiwillig: vier Karten, jede mit dem vorhandenen `value_case`-
 * Feld (`AnswerFieldV21` - dasselbe wie im Vorhaben-Fragebogen), Autospeichern je
 * Situation, eine Abgabe. Kein Fortschrittsbalken, keine Zaehlung, keine
 * Wertung. Nach dem Abgeben erscheint die eigene Zusammenfassung (die Seite
 * liest neu).
 *
 * SPEICHERN WIE IM BESTAND: Erst wenn eine Antwort vollstaendig ist (beide
 * Gewichte und ein Weg), wird gespeichert - eine halbe Antwort ist noch keine
 * (`completenessV21`). Eine zurueckgenommene Antwort wird geloescht.
 */
type Earlier = Record<string, { value?: Record<string, unknown> | null; missingCode?: string | null }>;

const SAVE_DELAY_MS = 700;

type SaveState = "idle" | "saving" | "saved" | "failed";

/** Gleicher Inhalt, unabhaengig von der Reihenfolge der Schluessel. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function TradeoffsFlow({
  ventureId,
  items,
  answerables,
  initial,
  earlier,
  earlierSource,
}: {
  ventureId: string;
  items: ItemView[];
  answerables: AnswerableItem[];
  initial: Record<string, DraftV21>;
  /** Der Ausgangspunkt, falls der Entwurf von dort stammt - nur zur Kennzeichnung. */
  earlier: Earlier | null;
  earlierSource: "legacy" | "previous" | null;
}) {
  const t = useTranslations("ventureTradeoffs");
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const [drafts, setDrafts] = useState<Record<string, DraftV21>>(initial);
  const [states, setStates] = useState<Record<string, SaveState>>(() =>
    Object.fromEntries(Object.keys(initial).map((itemId) => [itemId, "saved" as SaveState]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const byId = Object.fromEntries(answerables.map((item) => [item.itemId, item]));

  const isComplete = (itemId: string, draft: DraftV21 | undefined) =>
    Boolean(draft?.missingCode) || completenessV21(itemId, draft?.value, byId[itemId]) === "complete";

  const setState = (itemId: string, state: SaveState) => setStates((current) => ({ ...current, [itemId]: state }));

  function onChange(itemId: string, next: DraftV21) {
    setDrafts((current) => ({ ...current, [itemId]: next }));
    setError(null);
    clearTimeout(timers.current[itemId]);

    const kind = next.missingCode
      ? "missing"
      : completenessV21(itemId, next.value, byId[itemId]) === "complete"
        ? "value"
        : completenessV21(itemId, next.value, byId[itemId]) === "empty"
          ? "clear"
          : null;
    // Halb ausgefuellt: noch nichts speichern.
    if (!kind) return setState(itemId, "idle");

    setState(itemId, "saving");
    timers.current[itemId] = setTimeout(async () => {
      const result =
        kind === "clear"
          ? await clearTradeoffAnswer(ventureId, itemId)
          : await saveTradeoffAnswer(
              ventureId,
              (kind === "missing"
                ? { blockId: itemId, missingCode: next.missingCode }
                : { blockId: itemId, value: next.value }) as AlignmentAnswerV21
            ).catch(() => ({ ok: false as const }));
      setState(itemId, result.ok ? (kind === "clear" ? "idle" : "saved") : "failed");
    }, SAVE_DELAY_MS);
  }

  const allComplete = items.every((item) => isComplete(item.itemId, drafts[item.itemId]));
  const busy = Object.values(states).some((state) => state === "saving" || state === "failed");

  async function submit() {
    setSubmitting(true);
    setError(null);
    const result = await submitTradeoffs(ventureId).catch(() => ({ ok: false as const, reason: "submit_failed" }));
    setSubmitting(false);
    if (result.ok) return router.refresh();
    setError(result.reason === "incomplete" ? t("flow.errors.incomplete") : t("flow.errors.generic"));
  }

  const same = (itemId: string) => {
    const before = earlier?.[itemId];
    const now = drafts[itemId];
    if (!before || !now) return false;
    return canonical({ v: before.value ?? null, m: before.missingCode ?? null }) === canonical({ v: now.value ?? null, m: now.missingCode ?? null });
  };

  const steps = [
    ...items.map((item, index) => ({
      key: item.itemId,
      label: t("flow.situation", { index: index + 1 }),
      done: isComplete(item.itemId, drafts[item.itemId]),
    })),
    { key: "submit", label: t("flow.submit"), done: false },
  ];

  const renderStep = (key: string) => {
    if (key === "submit") {
      return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <p className="text-sm leading-6 text-slate-600">{t("flow.submitHint")}</p>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-slate-800">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={!allComplete || busy || submitting}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t("flow.submitPending") : t("flow.submit")}
          </button>
        </div>
      );
    }
    const item = items.find((entry) => entry.itemId === key);
    if (!item) return null;
    return (
        <section data-item-id={item.itemId} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("flow.situation", { index: items.findIndex((entry) => entry.itemId === item.itemId) + 1 })}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-slate-950">
            {alignmentDisplayText(item.prompt, locale)}
          </h2>
          <div className="mt-4">
            <AnswerFieldV21
              item={item}
              draft={drafts[item.itemId] ?? {}}
              onChange={(next) => onChange(item.itemId, next)}
              disabled={submitting}
            />
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-slate-500" aria-live="polite">
            {states[item.itemId] === "saving" ? <span>{t("flow.saving")}</span> : null}
            {states[item.itemId] === "saved" ? <span>{t("flow.saved")}</span> : null}
            {states[item.itemId] === "failed" ? <span role="alert">{t("flow.notSaved")}</span> : null}
            {earlierSource && same(item.itemId) ? <span>{t(`same.${earlierSource}`)}</span> : null}
          </p>
        </section>
    );
  };

  return <StepShell steps={steps} renderStep={renderStep} privacyNote={t("flow.privacyNote")} />;
}
