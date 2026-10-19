"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import { AnswerFieldV21, type DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import { completenessV21, type AlignmentAnswerV21, type AnswerableItem } from "@/features/instruments/v21/answersV21";
import type { ItemView } from "@/features/instruments/v21/questionnaireDataV21";
import { clearBetaAnswer, saveBetaAnswer, submitBeta } from "@/features/modules/ventureBeta/actions";
import { StepShell } from "@/features/modules/ui/StepShell";
import type { AppLocale } from "@/i18n/config";

/**
 * Der Flow von Venture Alignment (Beta): 19 Fragen in acht ruhigen Bloecken.
 *
 * Eine Frage je Karte, Autospeichern je Frage, eine Abgabe am Ende. Kein Fortschrittsbalken, keine
 * Zaehlung („x von y"), keine Prozent, keine Wertung. Die privaten Betragsfelder erscheinen unter ihrer
 * Hauptfrage, deutlich als „nur fuer dich" gekennzeichnet - sie sind freiwillig und erreichen nie den
 * Teamvergleich.
 *
 * SPEICHERN WIE IM BESTAND: Erst wenn eine Antwort vollstaendig ist, wird gespeichert (`completenessV21`);
 * eine zurueckgenommene Antwort wird geloescht. Abgeben geht erst, wenn jede Core-Frage beantwortet ist -
 * notfalls mit einem Auslassungsgrund.
 *
 * Der Flow kennt keine Zahl ueber den Fortschritt ausser, ob „Abgeben" moeglich ist. Eine Frage ist nie
 * „fehlend" - sie ist noch offen.
 */
type Earlier = Record<string, { value?: Record<string, unknown> | null; missingCode?: string | null }>;
type Block = { key: string; section: string; itemIds: readonly string[] };

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

export function BetaFlow({
  ventureId,
  blocks,
  items,
  answerables,
  initial,
  earlier,
  earlierSource,
  coreIds,
  privateIds,
}: {
  ventureId: string;
  blocks: readonly Block[];
  items: ItemView[];
  answerables: AnswerableItem[];
  initial: Record<string, DraftV21>;
  /** Der Ausgangspunkt, falls der Entwurf von dort stammt - nur zur Kennzeichnung. */
  earlier: Earlier | null;
  earlierSource: "takeover" | "previous" | null;
  coreIds: readonly string[];
  privateIds: readonly string[];
}) {
  const t = useTranslations("ventureBeta");
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
  const viewById = Object.fromEntries(items.map((item) => [item.itemId, item]));

  const isComplete = (itemId: string, draft: DraftV21 | undefined) =>
    Boolean(draft?.missingCode) || completenessV21(itemId, draft?.value, byId[itemId]) === "complete";

  const setState = (itemId: string, state: SaveState) => setStates((current) => ({ ...current, [itemId]: state }));

  function persist(itemId: string, next: DraftV21 | null) {
    clearTimeout(timers.current[itemId]);
    const kind = !next
      ? "clear"
      : next.missingCode
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
          ? await clearBetaAnswer(ventureId, itemId)
          : await saveBetaAnswer(
              ventureId,
              (kind === "missing"
                ? { blockId: itemId, missingCode: next?.missingCode }
                : { blockId: itemId, value: next?.value }) as AlignmentAnswerV21
            ).catch(() => ({ ok: false as const }));
      setState(itemId, result.ok ? (kind === "clear" ? "idle" : "saved") : "failed");
    }, SAVE_DELAY_MS);
  }

  function onChange(itemId: string, next: DraftV21) {
    setDrafts((current) => ({ ...current, [itemId]: next }));
    setError(null);
    persist(itemId, next);

    // Ein privater Betrag gehoert zu seiner Hauptfrage: Passt die Antwort dort nicht mehr, faellt er weg.
    for (const privateId of privateIds) {
      const view = viewById[privateId];
      if (view?.basisItemId !== itemId) continue;
      const chosen = (next.value as { optionId?: string } | undefined)?.optionId;
      const stillAllowed = Boolean(chosen) && (view.basisOptionIds ?? []).includes(chosen as string);
      if (!stillAllowed && drafts[privateId]) {
        setDrafts((current) => {
          const copy = { ...current };
          delete copy[privateId];
          return copy;
        });
        persist(privateId, null);
      }
    }
  }

  const allComplete = coreIds.every((itemId) => isComplete(itemId, drafts[itemId]));
  const busy = Object.values(states).some((state) => state === "saving" || state === "failed");

  async function submit() {
    setSubmitting(true);
    setError(null);
    const result = await submitBeta(ventureId).catch(() => ({ ok: false as const, reason: "submit_failed" }));
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

  const statusLine = (itemId: string) => (
    <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-slate-500" aria-live="polite">
      {states[itemId] === "saving" ? <span>{t("flow.saving")}</span> : null}
      {states[itemId] === "saved" ? <span>{t("flow.saved")}</span> : null}
      {states[itemId] === "failed" ? <span role="alert">{t("flow.notSaved")}</span> : null}
      {earlierSource && same(itemId) ? <span>{t(`same.${earlierSource}`)}</span> : null}
    </p>
  );

  const blockDone = (block: Block) => block.itemIds.every((itemId) => isComplete(itemId, drafts[itemId]));
  const steps = [
    ...blocks.map((block) => ({ key: block.key, label: t(`blocks.${block.key}.title`), done: blockDone(block) })),
    { key: "submit", label: t("flow.submit"), done: false },
  ];

  const renderStep = (key: string) => {
    if (key === "submit") {
      return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <p className="text-sm leading-6 text-slate-600">{t("flow.submitHint")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("flow.submitDoesNotShare")}</p>
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
    const block = blocks.find((entry) => entry.key === key);
    if (!block) return null;
    return (
        <section aria-labelledby={`beta-block-${block.key}`}>
          <h2 id={`beta-block-${block.key}`} className="text-sm font-semibold text-violet-700">
            {t(`blocks.${block.key}.title`)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t(`blocks.${block.key}.lead`)}</p>

          <div className="mt-4 space-y-4">
            {block.itemIds.map((itemId) => {
              const item = viewById[itemId];
              if (!item) return null;
              const attached = privateIds.filter((privateId) => viewById[privateId]?.basisItemId === itemId);
              return (
                <article key={itemId} data-item-id={itemId} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-xl font-semibold leading-snug text-slate-950">
                    {alignmentDisplayText(item.prompt, locale)}
                  </h3>
                  {item.hint ? (
                    <p className="mt-1 text-sm leading-6 text-slate-600">{alignmentDisplayText(item.hint, locale)}</p>
                  ) : null}
                  <div className="mt-4">
                    <AnswerFieldV21
                      item={item}
                      draft={drafts[itemId] ?? {}}
                      onChange={(next) => onChange(itemId, next)}
                      disabled={submitting}
                    />
                  </div>
                  {statusLine(itemId)}

                  {attached.map((privateId) => {
                    const privateItem = viewById[privateId]!;
                    const chosen = (drafts[itemId]?.value as { optionId?: string } | undefined)?.optionId;
                    // Erst zeigen, wenn die Hauptfrage einen Betrag zulaesst.
                    if (!chosen || !(privateItem.basisOptionIds ?? []).includes(chosen)) return null;
                    return (
                      <div key={privateId} data-private-item={privateId} className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("flow.privateBadge")}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-800">{alignmentDisplayText(privateItem.prompt, locale)}</p>
                        <div className="mt-3">
                          <AnswerFieldV21
                            item={privateItem}
                            draft={drafts[privateId] ?? {}}
                            onChange={(next) => onChange(privateId, next)}
                            disabled={submitting}
                          />
                        </div>
                        {statusLine(privateId)}
                      </div>
                    );
                  })}
                </article>
              );
            })}
          </div>
        </section>
    );
  };

  return <StepShell steps={steps} renderStep={renderStep} privacyNote={t("flow.privacyNote")} />;
}
