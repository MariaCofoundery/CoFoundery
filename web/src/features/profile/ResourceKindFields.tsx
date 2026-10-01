"use client";

import { useState } from "react";

/**
 * Art und Satz einer Ressource - und das Beispiel, das zur Art passt.
 *
 * EINE CLIENT-KOMPONENTE SEIT PHASE 6 (01.10.2026). Vorher kam der Platzhalter
 * serverseitig fest mit: Wer von „Netzwerk" auf „Zugang" wechselte, sah weiter
 * das Netzwerk-Beispiel. Mehr tut diese Komponente nicht - gespeichert wird
 * weiterhin ueber das Formular drumherum, mit denselben Feldnamen.
 */
export function ResourceKindFields({
  kinds,
  initialKind,
  label,
  labelMax,
  fieldClassName,
  copy,
}: {
  kinds: { kind: string; label: string; example: string }[];
  initialKind: string;
  label: string;
  labelMax: number;
  fieldClassName: string;
  copy: { kindField: string; labelField: string; labelHint: string };
}) {
  const [kind, setKind] = useState(initialKind);
  const example = kinds.find((entry) => entry.kind === kind)?.example ?? "";

  return (
    <div className="grid gap-4">
      <label className="block text-sm font-medium text-slate-900">
        {copy.kindField}
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className={fieldClassName}
        >
          {kinds.map((entry) => (
            <option key={entry.kind} value={entry.kind}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-900">
        {copy.labelField}
        <input
          name="label"
          defaultValue={label}
          maxLength={labelMax}
          placeholder={example}
          className={fieldClassName}
        />
        <span className="mt-1 block text-xs leading-5 text-slate-500">{copy.labelHint}</span>
      </label>
    </div>
  );
}
