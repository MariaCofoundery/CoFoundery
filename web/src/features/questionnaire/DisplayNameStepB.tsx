"use client";

import { useState } from "react";
import { saveDisplayNameB } from "@/features/questionnaire/actionsB";

type Props = {
  sessionId: string;
  defaultLabel?: string;
};

export function DisplayNameStepB({ sessionId, defaultLabel = "Person B" }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    setSaving(true);
    await saveDisplayNameB(sessionId, value.trim() ? value.trim() : defaultLabel);
    setSaving(false);
    window.location.reload();
  };

  return (
    <section className="rounded-2xl border border-[color:var(--line)] bg-white p-6">
      <h1 className="text-2xl font-semibold text-[color:var(--ink)]">Wie möchtest du genannt werden?</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Optional. Wenn leer, verwenden wir &quot;{defaultLabel}&quot;.
      </p>
      <div className="mt-4 grid gap-3">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={defaultLabel}
          className="rounded-xl border border-[color:var(--line)] px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-xl bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Speichern..." : "Weiter"}
        </button>
      </div>
    </section>
  );
}
