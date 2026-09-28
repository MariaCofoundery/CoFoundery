"use client";

import type { ItemView } from "@/features/instruments/v21/questionnaireDataV21";
import type { MissingCode } from "@/features/instruments/v21/registryV21";

/**
 * Eine Frage, wie sie auf dem Bildschirm aussieht.
 *
 * ---------------------------------------------------------------------------
 * DIE AUSLASSUNGSGRÜNDE STEHEN BEI DEN ANTWORTEN, NICHT DANEBEN
 * ---------------------------------------------------------------------------
 *
 * Kein „überspringen“-Link, kein ausgegrauter Text am Rand. „Habe ich noch
 * nicht entschieden“ und „möchte ich nicht angeben“ sind Antworten mit eigener
 * Bedeutung und werden so angeboten - als gleichwertige Auswahl.
 *
 * Wer das Auslassen wegdrückt, bekommt Gefälligkeitsantworten: Jemand klickt
 * irgendetwas, um weiterzukommen, und die Auswertung liest es als Meinung. Ein
 * sichtbares „noch nicht entschieden“ ist für das Produkt sogar die
 * nützlichere Antwort - es benennt genau die Stelle, über die zwei Gründer
 * sprechen sollten.
 *
 * DIE BESCHRIFTUNGEN KOMMEN ALS EIGENSCHAFTEN HEREIN, nicht als Import. Sonst
 * läge die vollständige Registratur im Bundle jedes Browsers, nur um ein paar
 * Sätze anzuzeigen.
 */

export type DraftV21 = {
  value?: Record<string, unknown>;
  missingCode?: MissingCode;
};

type Props = {
  item: ItemView;
  draft: DraftV21;
  onChange: (next: DraftV21) => void;
  /** Die Einträge aus L01, an denen L02/L03 hängen. */
  basisEntries?: { entryId: string; text: string }[];
  disabled?: boolean;
};

const box =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 " +
  "focus:border-slate-500 focus:outline-none disabled:bg-slate-50";

const optionRow =
  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm " +
  "transition-colors hover:bg-slate-50";

export function AnswerFieldV21({ item, draft, onChange, basisEntries = [], disabled }: Props) {
  const value = draft.value ?? {};
  const patch = (next: Record<string, unknown>) =>
    onChange({ value: { ...value, ...next } });
  /** Ein Wert ersetzt den Auslassungsgrund - beides zusammen wäre eine Lüge. */
  const setValue = (next: Record<string, unknown>) => onChange({ value: next });

  return (
    <div className="space-y-4">
      <div className={draft.missingCode ? "opacity-40" : undefined}>{renderInput()}</div>
      <MissingChoices
        offered={item.offeredMissing}
        chosen={draft.missingCode}
        disabled={disabled}
        onChoose={(code) =>
          onChange(code === draft.missingCode ? {} : { missingCode: code })
        }
      />
    </div>
  );

  function renderInput() {
    switch (item.answerFormat) {
      case "ordinal_choice":
      case "single_choice":
        return <SingleChoice />;
      case "multi_choice":
      case "multi_choice_priority":
        return <MultiChoice />;
      case "value_case":
        return <ValueCase />;
      case "money_range":
        return <MoneyRange />;
      case "number_range":
        return <NumberRange />;
      case "person_number_range":
        return <PerPerson />;
      case "time_windows":
        return <TimeWindows />;
      case "date":
        return <DateField />;
      case "structured_text":
        return <SingleText />;
      case "free_text_repeatable":
        return <RepeatableText />;
      case "free_text_per_entry":
        return <PerEntryText />;
    }
  }

  // -------------------------------------------------------------------------

  function SingleChoice() {
    const chosen = value.optionId as string | undefined;
    return (
      <div className="space-y-2">
        {item.options.map((option) => (
          <label
            key={option.optionId}
            className={`${optionRow} ${
              chosen === option.optionId ? "border-slate-900 bg-slate-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name={item.itemId}
              className="mt-0.5"
              checked={chosen === option.optionId}
              disabled={disabled}
              onChange={() => setValue({ optionId: option.optionId })}
            />
            <span className="flex-1">
              {option.label}
              {option.requiresText && chosen === option.optionId && (
                <input
                  className={`${box} mt-2`}
                  placeholder="bitte beschreiben"
                  value={(value.text as string) ?? ""}
                  disabled={disabled}
                  onChange={(event) => patch({ text: event.target.value })}
                />
              )}
            </span>
          </label>
        ))}
      </div>
    );
  }

  function MultiChoice() {
    const chosen = (value.optionIds as string[] | undefined) ?? [];
    const texts = (value.texts as Record<string, string> | undefined) ?? {};
    const exclusive = item.options.find((option) => option.exclusive)?.optionId;

    const toggle = (optionId: string) => {
      const isExclusive = optionId === exclusive;
      // „Keine zusätzliche Absicherung“ neben drei angekreuzten Absicherungen
      // ist ein Widerspruch. Die Oberfläche löst ihn auf, statt ihn beim
      // Speichern als Fehlermeldung zurückzuwerfen.
      const next = chosen.includes(optionId)
        ? chosen.filter((entry) => entry !== optionId)
        : isExclusive
          ? [optionId]
          : [...chosen.filter((entry) => entry !== exclusive), optionId];

      const cleanedTexts = Object.fromEntries(
        Object.entries(texts).filter(([key]) => next.includes(key)),
      );
      const priority = value.priorityOptionId as string | undefined;
      setValue({
        optionIds: next,
        ...(Object.keys(cleanedTexts).length > 0 ? { texts: cleanedTexts } : {}),
        // Ein Vorrang über eine abgewählte Option ist keine Präferenz mehr.
        ...(priority && next.includes(priority) ? { priorityOptionId: priority } : {}),
      });
    };

    return (
      <div className="space-y-2">
        {item.options.map((option) => (
          <label
            key={option.optionId}
            className={`${optionRow} ${
              chosen.includes(option.optionId) ? "border-slate-900 bg-slate-50" : "border-slate-200"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={chosen.includes(option.optionId)}
              disabled={disabled}
              onChange={() => toggle(option.optionId)}
            />
            <span className="flex-1">
              {option.label}
              {option.requiresText && chosen.includes(option.optionId) && (
                <input
                  className={`${box} mt-2`}
                  placeholder="bitte beschreiben"
                  value={texts[option.optionId] ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    patch({ texts: { ...texts, [option.optionId]: event.target.value } })
                  }
                />
              )}
            </span>
          </label>
        ))}

        {item.followup && chosen.length > 1 && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-800">{item.followup.question}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {item.followup.optional ? "freiwillig" : ""}
            </p>
            <div className="mt-2 space-y-1">
              {item.options
                .filter((option) => chosen.includes(option.optionId))
                .map((option) => (
                  <label key={option.optionId} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`${item.itemId}-priority`}
                      checked={value.priorityOptionId === option.optionId}
                      disabled={disabled}
                      onChange={() => patch({ priorityOptionId: option.optionId })}
                    />
                    {option.label}
                  </label>
                ))}
              {item.followup.other && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="radio"
                    name={`${item.itemId}-priority`}
                    checked={value.priorityOptionId === undefined}
                    disabled={disabled}
                    onChange={() => {
                      const { priorityOptionId: _drop, ...rest } = value;
                      setValue(rest);
                    }}
                  />
                  {item.followup.other}
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /**
   * Zwei Wichtigkeiten und ein Weg.
   *
   * Getrennt bewertet und ausdrücklich NICHT als ein Schieberegler zwischen
   * zwei Polen: Beide Anliegen dürfen sehr wichtig sein. Genau daran erkennt
   * man die Menschen, für die der Fall wirklich schwer ist.
   */
  function ValueCase() {
    const paths = [
      { key: "A", label: item.concerns?.[0] ?? "das erste Anliegen" },
      { key: "B", label: item.concerns?.[1] ?? "das zweite Anliegen" },
      { key: "other", label: "etwas anderes" },
      { key: "unknown", label: "ich kann das noch nicht entscheiden" },
    ];
    return (
      <div className="space-y-5">
        {(["A", "B"] as const).map((side, index) => (
          <div key={side}>
            <p className="text-sm text-slate-800">{item.concerns?.[index]}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(item.ratingOptions ?? []).map((label, rank) => {
                const key = side === "A" ? "importanceA" : "importanceB";
                const active = value[key] === rank + 1;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ [key]: rank + 1 })}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="text-sm text-slate-800">
            Welchen Weg würdest du unter diesen Bedingungen zuerst wählen?
          </p>
          <div className="mt-2 space-y-2">
            {paths.map((path) => (
              <label
                key={path.key}
                className={`${optionRow} ${
                  value.path === path.key ? "border-slate-900 bg-slate-50" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name={`${item.itemId}-path`}
                  className="mt-0.5"
                  checked={value.path === path.key}
                  disabled={disabled}
                  onChange={() => patch({ path: path.key })}
                />
                <span className="flex-1">{path.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function MoneyRange() {
    return (
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          className={box}
          placeholder="Betrag"
          value={(value.amount as number | undefined) ?? ""}
          disabled={disabled}
          onChange={(event) =>
            patch({
              amount: event.target.value === "" ? undefined : Number(event.target.value),
              // Ein Betrag ohne Währung ist keine Angabe - Beträge
              // verschiedener Länder dürfen nicht verglichen werden.
              currency: (value.currency as string) ?? "EUR",
            })
          }
        />
        <select
          className={`${box} w-28`}
          value={(value.currency as string) ?? "EUR"}
          disabled={disabled}
          onChange={(event) => patch({ currency: event.target.value })}
        >
          {["EUR", "CHF", "USD", "GBP"].map((code) => (
            <option key={code}>{code}</option>
          ))}
        </select>
      </div>
    );
  }

  function NumberRange() {
    const unit = "Stunden pro Woche";
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            className={`${box} w-32`}
            placeholder="0"
            value={(value.number as number | undefined) ?? ""}
            disabled={disabled}
            onChange={(event) =>
              patch({
                number: event.target.value === "" ? undefined : Number(event.target.value),
                unit,
              })
            }
          />
          <span className="text-sm text-slate-600">{unit}</span>
        </div>
        <input
          className={box}
          placeholder="Falls der Umfang schwankt: unter welchen Bedingungen? (freiwillig)"
          value={(value.condition as string) ?? ""}
          disabled={disabled}
          onChange={(event) => patch({ condition: event.target.value })}
        />
      </div>
    );
  }

  /** Je Person eine Erwartung - „keine feste Stundenerwartung“ ist eine davon. */
  function PerPerson() {
    const rows =
      (value.perPerson as { person: string; number: number | null; unit: string }[] | undefined) ??
      [{ person: "", number: null, unit: "Stunden pro Woche" }];
    const write = (next: typeof rows) => setValue({ perPerson: next });

    return (
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <input
              className={`${box} flex-1 min-w-40`}
              placeholder="Person oder geplante Rolle"
              value={row.person}
              disabled={disabled}
              onChange={(event) =>
                write(rows.map((entry, at) =>
                  at === index ? { ...entry, person: event.target.value } : entry))
              }
            />
            <input
              type="number"
              min={0}
              className={`${box} w-24`}
              placeholder="Std."
              value={row.number ?? ""}
              disabled={disabled || row.number === null}
              onChange={(event) =>
                write(rows.map((entry, at) =>
                  at === index
                    ? {
                        ...entry,
                        number: event.target.value === "" ? null : Number(event.target.value),
                        unit: "Stunden pro Woche",
                      }
                    : entry))
              }
            />
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={row.number === null}
                disabled={disabled}
                onChange={(event) =>
                  write(rows.map((entry, at) =>
                    at === index
                      ? { ...entry, number: event.target.checked ? null : 0, unit: "Stunden pro Woche" }
                      : entry))
                }
              />
              {item.options[0]?.label ?? "keine feste Erwartung"}
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                className="text-xs text-slate-500 underline"
                disabled={disabled}
                onClick={() => write(rows.filter((_, at) => at !== index))}
              >
                entfernen
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-slate-700 underline"
          disabled={disabled}
          onClick={() => write([...rows, { person: "", number: null, unit: "Stunden pro Woche" }])}
        >
          weitere Person
        </button>
      </div>
    );
  }

  /**
   * Zeitfenster - mit Zeitzone, und die ist vorbelegt.
   *
   * „Dienstag 18 bis 20 Uhr“ ist ohne Zeitzone keine Verabredung, sondern eine
   * Einladung zum Missverständnis. Vorbelegt aus dem Browser, damit niemand
   * sie von Hand suchen muss - und trotzdem änderbar.
   */
  function TimeWindows() {
    const here =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Europe/Berlin";
    const windows =
      (value.windows as { day: string; from: string; to: string; timezone: string }[] | undefined) ??
      [{ day: "Montag", from: "", to: "", timezone: here }];
    const write = (next: typeof windows) => setValue({ windows: next });
    const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

    return (
      <div className="space-y-2">
        {windows.map((window, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              className={`${box} w-36`}
              value={window.day}
              disabled={disabled}
              onChange={(event) =>
                write(windows.map((entry, at) =>
                  at === index ? { ...entry, day: event.target.value } : entry))
              }
            >
              {days.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
            {(["from", "to"] as const).map((which) => (
              <input
                key={which}
                type="time"
                className={`${box} w-28`}
                value={window[which]}
                disabled={disabled}
                onChange={(event) =>
                  write(windows.map((entry, at) =>
                    at === index ? { ...entry, [which]: event.target.value } : entry))
                }
              />
            ))}
            <input
              className={`${box} w-48`}
              value={window.timezone}
              disabled={disabled}
              onChange={(event) =>
                write(windows.map((entry, at) =>
                  at === index ? { ...entry, timezone: event.target.value } : entry))
              }
            />
            {windows.length > 1 && (
              <button
                type="button"
                className="text-xs text-slate-500 underline"
                disabled={disabled}
                onClick={() => write(windows.filter((_, at) => at !== index))}
              >
                entfernen
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-slate-700 underline"
          disabled={disabled}
          onClick={() => write([...windows, { day: "Montag", from: "", to: "", timezone: here }])}
        >
          weiteres Zeitfenster
        </button>
      </div>
    );
  }

  function DateField() {
    return (
      <input
        type="date"
        className={`${box} w-48`}
        value={(value.date as string) ?? ""}
        disabled={disabled}
        onChange={(event) => setValue({ date: event.target.value })}
      />
    );
  }

  function SingleText() {
    return (
      <textarea
        className={box}
        rows={3}
        value={(value.text as string) ?? ""}
        disabled={disabled}
        onChange={(event) => setValue({ text: event.target.value })}
      />
    );
  }

  /**
   * Mehrere Einträge - jeder mit einer eigenen Kennung.
   *
   * Die Kennung ist der Punkt: L02 und L03 hängen sich daran, nicht an den
   * Text. Wer eine Grenze umformuliert, entwurzelt sonst seine eigenen
   * Anschlussantworten.
   */
  function RepeatableText() {
    const entries =
      (value.entries as { entryId: string; text: string }[] | undefined) ?? [];
    const write = (next: typeof entries) => setValue({ entries: next });

    return (
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={entry.entryId} className="flex items-start gap-2">
            <textarea
              className={box}
              rows={2}
              value={entry.text}
              disabled={disabled}
              onChange={(event) =>
                write(entries.map((row, at) =>
                  at === index ? { ...row, text: event.target.value } : row))
              }
            />
            <button
              type="button"
              className="mt-2 text-xs text-slate-500 underline"
              disabled={disabled}
              onClick={() => write(entries.filter((_, at) => at !== index))}
            >
              entfernen
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-slate-700 underline"
          disabled={disabled}
          onClick={() =>
            write([...entries, { entryId: `e${Date.now().toString(36)}`, text: "" }])
          }
        >
          {entries.length === 0 ? "eine Grenze nennen" : "weitere Grenze"}
        </button>
      </div>
    );
  }

  /** Eine Antwort je zuvor genannter Grenze - die Grenze steht als Überschrift dabei. */
  function PerEntryText() {
    const perEntry = (value.perEntry as Record<string, string> | undefined) ?? {};
    return (
      <div className="space-y-3">
        {basisEntries.map((entry) => (
          <div key={entry.entryId}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {entry.text}
            </p>
            <textarea
              className={`${box} mt-1`}
              rows={2}
              value={perEntry[entry.entryId] ?? ""}
              disabled={disabled}
              onChange={(event) =>
                setValue({ perEntry: { ...perEntry, [entry.entryId]: event.target.value } })
              }
            />
          </div>
        ))}
      </div>
    );
  }
}

function MissingChoices({
  offered,
  chosen,
  onChoose,
  disabled,
}: {
  offered: { code: MissingCode; label: string }[];
  chosen?: MissingCode;
  onChoose: (code: MissingCode) => void;
  disabled?: boolean;
}) {
  if (offered.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {offered.map((entry) => (
        <button
          key={entry.code}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(entry.code)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            chosen === entry.code
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
