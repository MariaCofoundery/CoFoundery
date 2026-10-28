"use client";

import { useState, useTransition } from "react";
import { setFinancingNoteAction } from "@/features/financing/financingActions";
import { FINANCING_NOTE_MAX } from "@/features/financing/financingModel";

/**
 * Teamnotiz zu einer Frage. Gespeichert wird beim Verlassen des Feldes oder mit dem Knopf;
 * der Stand daneben sagt, ob es angekommen ist. Alle aktuellen Mitglieder sehen und aendern sie.
 */
export function FinancingNote({
  teamId,
  questionKey,
  question,
  initial,
  labels,
}: {
  teamId: string;
  questionKey: string;
  question: string;
  initial: string;
  labels: { placeholder: string; save: string; saved: string; saving: string; error: string; unsaved: string };
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const id = `financing-note-${questionKey}`;
  const dirty = value.trim() !== saved.trim();

  function save() {
    if (!dirty || pending) return;
    const text = value;
    startTransition(async () => {
      const result = await setFinancingNoteAction(teamId, questionKey, text);
      if (result.ok) {
        setSaved(text);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-[#f7f6fb] px-4 py-3">
      <label htmlFor={id} className="block text-[15px] font-medium text-[#0b1f3a]">{question}</label>
      <textarea
        id={id}
        value={value}
        maxLength={FINANCING_NOTE_MAX}
        rows={3}
        placeholder={labels.placeholder}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        className="mt-2 w-full rounded-xl border border-[#e4e2f0] bg-white px-3 py-2 text-sm text-[#0b1f3a] focus:border-[#6d49e0] focus:outline-none focus:ring-2 focus:ring-[#efeafc]"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="min-h-9 rounded-full border border-[#e4e2f0] bg-white px-4 text-[13px] font-bold text-[#0b1f3a] transition hover:bg-[#efeafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] disabled:opacity-50"
        >
          {pending ? labels.saving : labels.save}
        </button>
        <span role="status" className="text-xs text-[#5f5e7a]">
          {failed ? <span className="text-rose-700">{labels.error}</span> : pending ? labels.saving : dirty ? labels.unsaved : value.trim() ? labels.saved : ""}
        </span>
      </div>
    </div>
  );
}
