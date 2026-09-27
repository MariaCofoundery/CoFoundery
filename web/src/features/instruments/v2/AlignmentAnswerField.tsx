"use client";

import { useTranslations } from "next-intl";
import type { ContextBlock, ValueCase } from "@/features/instruments/v2/contextRegistryV2";
import type { AlignmentAnswer, AlignmentAnswerValue, StoredAnswerFormat } from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * Ein Block, wie er auf dem Bildschirm aussieht.
 *
 * ---------------------------------------------------------------------------
 * DIE AUSLASSUNGSGRÜNDE STEHEN BEI DEN ANTWORTEN, NICHT DANEBEN
 * ---------------------------------------------------------------------------
 *
 * Kein „überspringen"-Link, kein ausgegrauter Text am Rand. „Noch offen" und
 * „möchte ich nicht angeben" sind Antworten mit eigener Bedeutung und werden
 * so angeboten - als gleichwertige Auswahl im selben Block.
 *
 * Das ist keine Geschmacksfrage. Wer das Auslassen wegdrückt, bekommt
 * Gefälligkeitsantworten: Jemand klickt irgendetwas, um weiterzukommen, und
 * die Auswertung liest es als Meinung. Ein sichtbares „noch offen" ist für
 * das Produkt sogar die nützlichere Antwort - es benennt genau die Stelle,
 * über die zwei Gründer sprechen sollten.
 */

type Draft = { value?: AlignmentAnswerValue; missingCode?: AlignmentAnswer["missingCode"] };

type Props = {
  blockId: string;
  answerFormat: StoredAnswerFormat;
  /**
   * Beschriftungen und Auslassungsgruende kommen als Eigenschaften herein,
   * nicht als Import. Sonst laege die vollstaendige Registratur - alle 107
   * Bloecke - im Bundle jedes Browsers, nur um fuenf Beschriftungen zu
   * kennen.
   */
  scaleLabels: string[];
  offeredMissing: NonNullable<AlignmentAnswer["missingCode"]>[];
  block?: ContextBlock;
  valueCase?: ValueCase;
  draft: Draft;
  onChange: (next: Draft) => void;
  disabled?: boolean;
};

const boxClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 " +
  "focus:border-slate-500 focus:outline-none disabled:bg-slate-50";

export function AlignmentAnswerField({
  answerFormat, scaleLabels, offeredMissing, block, valueCase, draft, onChange, disabled,
}: Props) {
  const t = useTranslations("alignment");
  const value = (draft.value ?? {}) as Record<string, unknown>;
  const patch = (next: Record<string, unknown>) =>
    onChange({ value: { ...value, ...next } as AlignmentAnswerValue });

  return (
    <div className="space-y-4">
      <div className={draft.missingCode ? "opacity-40" : undefined}>
        {renderInput()}
      </div>
      <MissingChoices
        offered={offeredMissing}
        chosen={draft.missingCode}
        disabled={disabled}
        onPick={(code) => onChange(code ? { missingCode: code } : { value: draft.value })}
      />
    </div>
  );

  function renderInput() {
    switch (answerFormat) {
      case "F":
      case "C":
      case "importance_rating":
        return (
          <Scale
            labels={scaleLabels}
            chosen={typeof value.scale === "number" ? value.scale : null}
            disabled={disabled}
            onPick={(scale) => patch({ scale })}
          />
        );

      case "single_choice":
        return (
          <div className="space-y-2">
            {(block?.options ?? []).map((option) => (
              <Choice
                key={option.value}
                label={option.value}
                checked={value.option === option.value}
                disabled={disabled}
                onPick={() => patch({ option: option.value })}
              />
            ))}
            {needsText(value.option) && (
              <input
                className={boxClass}
                placeholder={t("fields.otherText")}
                value={String(value.text ?? "")}
                disabled={disabled}
                onChange={(event) => patch({ text: event.target.value })}
              />
            )}
          </div>
        );

      case "multi_choice": {
        const picked = Array.isArray(value.options) ? (value.options as string[]) : [];
        return (
          <div className="space-y-2">
            {(block?.options ?? []).map((option) => (
              <Choice
                key={option.value}
                label={option.value}
                kind="checkbox"
                checked={picked.includes(option.value)}
                disabled={disabled}
                onPick={() =>
                  patch({
                    options: picked.includes(option.value)
                      ? picked.filter((entry) => entry !== option.value)
                      : [...picked, option.value],
                  })
                }
              />
            ))}
            {picked.some(needsText) && (
              <input
                className={boxClass}
                placeholder={t("fields.otherText")}
                value={String(value.text ?? "")}
                disabled={disabled}
                onChange={(event) => patch({ text: event.target.value })}
              />
            )}
          </div>
        );
      }

      case "free_text":
        return (
          <textarea
            className={boxClass}
            rows={3}
            placeholder={block?.hint ?? t("fields.text")}
            value={String(value.text ?? "")}
            disabled={disabled}
            onChange={(event) => patch({ text: event.target.value })}
          />
        );

      case "structured_text": {
        const fields = (value.fields ?? {}) as Record<string, string>;
        // Die Teilfelder stehen im Eingabehinweis der Quelle: „Ergebnis,
        // erkennbare Erfüllung, Zieldatum".
        const parts = (block?.hint ?? "").replace(/^Freitext:\s*/, "").split(",").map((entry) => entry.trim());
        return (
          <div className="space-y-2">
            {parts.map((part) => (
              <input
                key={part}
                className={boxClass}
                placeholder={part}
                value={fields[part] ?? ""}
                disabled={disabled}
                onChange={(event) => patch({ fields: { ...fields, [part]: event.target.value } })}
              />
            ))}
          </div>
        );
      }

      case "number_range":
        return (
          <Range
            unit={block?.unit ?? ""}
            min={value.min}
            max={value.max}
            disabled={disabled}
            onChange={(next) => patch({ ...next, unit: block?.unit ?? "" })}
          />
        );

      case "money_range":
        return (
          <div className="space-y-2">
            <Range min={value.min} max={value.max} disabled={disabled}
              onChange={(next) => patch({ ...next, currency: String(value.currency ?? "EUR") })} />
            <div className="flex gap-2">
              <input
                className={`${boxClass} w-28`}
                aria-label={t("fields.currency")}
                value={String(value.currency ?? "EUR")}
                disabled={disabled}
                onChange={(event) => patch({ currency: event.target.value })}
              />
              {/* Brutto oder netto - ohne das ist der Betrag nicht vergleichbar,
                  und die Quelle verlangt die Kennzeichnung ausdrücklich. */}
              <select
                className={`${boxClass} w-40`}
                aria-label={t("fields.basis")}
                value={String(value.basis ?? "")}
                disabled={disabled}
                onChange={(event) => patch({ basis: event.target.value || undefined })}
              >
                <option value="">{t("fields.basis")}</option>
                <option value="brutto">{t("fields.brutto")}</option>
                <option value="netto">{t("fields.netto")}</option>
              </select>
            </div>
          </div>
        );

      case "person_number_range": {
        const per = Array.isArray(value.per)
          ? (value.per as { recipient?: string; min?: number; max?: number }[])
          : [{}];
        const write = (next: typeof per) => patch({ per: next, unit: block?.unit ?? "" });
        return (
          <div className="space-y-3">
            {per.map((entry, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <input
                  className={boxClass}
                  placeholder={t("fields.recipient")}
                  value={entry.recipient ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    write(per.map((one, at) => (at === index ? { ...one, recipient: event.target.value } : one)))
                  }
                />
                <Range unit={block?.unit ?? ""} min={entry.min} max={entry.max} disabled={disabled}
                  onChange={(next) => write(per.map((one, at) => (at === index ? { ...one, ...next } : one)))} />
              </div>
            ))}
            <button type="button" className="text-sm text-slate-600 underline" disabled={disabled}
              onClick={() => write([...per, {}])}>
              {t("fields.addRecipient")}
            </button>
          </div>
        );
      }

      case "time_windows": {
        const windows = Array.isArray(value.windows)
          ? (value.windows as { days?: string[]; from?: string; to?: string }[])
          : [{ days: [] }];
        const write = (next: typeof windows) => patch({ windows: next });
        return (
          <div className="space-y-3">
            {windows.map((entry, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <input
                  className={`${boxClass} w-48`}
                  placeholder={t("fields.days")}
                  value={(entry.days ?? []).join(", ")}
                  disabled={disabled}
                  onChange={(event) =>
                    write(windows.map((one, at) =>
                      at === index
                        ? { ...one, days: event.target.value.split(",").map((day) => day.trim()).filter(Boolean) }
                        : one))
                  }
                />
                <input type="time" className={`${boxClass} w-32`} aria-label={t("fields.from")}
                  value={entry.from ?? ""} disabled={disabled}
                  onChange={(event) => write(windows.map((one, at) => (at === index ? { ...one, from: event.target.value } : one)))} />
                <input type="time" className={`${boxClass} w-32`} aria-label={t("fields.to")}
                  value={entry.to ?? ""} disabled={disabled}
                  onChange={(event) => write(windows.map((one, at) => (at === index ? { ...one, to: event.target.value } : one)))} />
              </div>
            ))}
            <button type="button" className="text-sm text-slate-600 underline" disabled={disabled}
              onClick={() => write([...windows, { days: [] }])}>
              {t("fields.addWindow")}
            </button>
          </div>
        );
      }

      case "date":
        return (
          <input type="date" className={`${boxClass} w-48`} aria-label={t("fields.date")}
            value={String(value.date ?? "")} disabled={disabled}
            onChange={(event) => patch({ date: event.target.value })} />
        );

      case "value_case":
        return (
          <div className="space-y-5">
            {/* BEIDE ANLIEGEN GETRENNT, und zuerst - damit die getroffene Wahl
                das Urteil nicht nachträglich rechtfertigen muss. */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700">{t("values.concerns")}</p>
              {(valueCase?.concerns ?? []).map((concern, index) => (
                <div key={concern.key} className="space-y-2">
                  <p className="text-sm text-slate-700">{concern.label}</p>
                  <Scale
                    labels={scaleLabels}
                    chosen={Number(value[index === 0 ? "importanceA" : "importanceB"]) || null}
                    disabled={disabled}
                    onPick={(scale) => patch({ [index === 0 ? "importanceA" : "importanceB"]: scale })}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{t("values.pathQuestion")}</p>
              {(valueCase?.paths ?? []).map((path) => (
                <Choice key={path.key} label={path.label} checked={value.path === path.key}
                  disabled={disabled} onPick={() => patch({ path: path.key })} />
              ))}
              {value.path === "other" && (
                <input className={boxClass} placeholder={t("fields.otherText")}
                  value={String(value.text ?? "")} disabled={disabled}
                  onChange={(event) => patch({ text: event.target.value })} />
              )}
            </div>
          </div>
        );
    }
  }

  function needsText(option: unknown): boolean {
    return (block?.options ?? []).some(
      (entry) => entry.value === option && entry.requiresText
    );
  }
}

function Scale({
  labels, chosen, disabled, onPick,
}: { labels: string[]; chosen: number | null; disabled?: boolean; onPick: (scale: number) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {labels.map((label, index) => {
        const step = index + 1;
        const active = chosen === step;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onPick(step)}
            className={[
              "rounded-lg border px-3 py-2 text-left text-sm transition",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Choice({
  label, checked, disabled, onPick, kind = "radio",
}: { label: string; checked: boolean; disabled?: boolean; onPick: () => void; kind?: "radio" | "checkbox" }) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm",
        checked ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white hover:border-slate-500",
      ].join(" ")}
    >
      <input type={kind} checked={checked} disabled={disabled} onChange={onPick} className="mt-1" />
      <span className="text-slate-800">{label}</span>
    </label>
  );
}

function Range({
  unit, min, max, disabled, onChange,
}: {
  unit?: string;
  min: unknown;
  max: unknown;
  disabled?: boolean;
  onChange: (next: { min?: number; max?: number }) => void;
}) {
  const t = useTranslations("alignment");
  const read = (raw: string) => (raw.trim() === "" ? undefined : Number(raw));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number" min={0} className={`${boxClass} w-28`} aria-label={t("fields.min")}
        value={typeof min === "number" ? String(min) : ""} disabled={disabled}
        onChange={(event) => onChange({ min: read(event.target.value), max: typeof max === "number" ? max : undefined })}
      />
      <span className="text-sm text-slate-500">{t("fields.to")}</span>
      <input
        type="number" min={0} className={`${boxClass} w-28`} aria-label={t("fields.max")}
        value={typeof max === "number" ? String(max) : ""} disabled={disabled}
        onChange={(event) => onChange({ min: typeof min === "number" ? min : undefined, max: read(event.target.value) })}
      />
      {unit ? <span className="text-sm text-slate-600">{unit}</span> : null}
    </div>
  );
}

/**
 * Die Auslassungsgründe - als Antworten, nicht als Ausweg.
 *
 * Nochmal wählen hebt die Wahl auf: Wer sich verklickt hat, soll nicht den
 * Umweg über eine erfundene Antwort nehmen müssen.
 */
function MissingChoices({
  offered, chosen, disabled, onPick,
}: {
  offered: NonNullable<AlignmentAnswer["missingCode"]>[];
  chosen: AlignmentAnswer["missingCode"];
  disabled?: boolean;
  onPick: (code: AlignmentAnswer["missingCode"] | null) => void;
}) {
  const t = useTranslations("alignment");
  if (offered.length === 0) return null;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {t("missing.heading")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {offered.map((code) => (
          <button
            key={code}
            type="button"
            disabled={disabled}
            aria-pressed={chosen === code}
            onClick={() => onPick(chosen === code ? null : code)}
            className={[
              "rounded-full border px-3 py-1.5 text-sm transition",
              chosen === code
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-500",
            ].join(" ")}
          >
            {t(`missing.${code}`)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{t("missing.hint")}</p>
    </div>
  );
}
