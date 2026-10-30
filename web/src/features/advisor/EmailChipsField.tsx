"use client";

import { useRef, useState } from "react";

/**
 * Mehrere E-Mail-Adressen eintragen: tippen, mit Enter, Komma oder "Hinzufuegen"
 * uebernehmen, mehrere auf einmal einfuegen. Jede Adresse ist ein Chip mit
 * "x". Beim Absenden geht jede als eigenes Feld `email` mit; was noch im
 * Eingabefeld steht, geht als `emailDraft` mit, damit nichts verloren geht.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function EmailChipsField({
  label,
  addLabel,
  removeLabel,
  hint,
  invalidLabel,
  maxCount = 20,
}: {
  label: string;
  addLabel: string;
  /** Mit {email} als Platzhalter. */
  removeLabel: string;
  hint: string;
  invalidLabel: string;
  maxCount?: number;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const parts = raw
      .split(/[\s,;]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return true;
    const bad = parts.filter((part) => !LOOKS_LIKE_EMAIL.test(part));
    const good = parts.filter((part) => LOOKS_LIKE_EMAIL.test(part));
    setEmails((current) => [...new Set([...current, ...good])].slice(0, maxCount));
    setInvalid(bad.length > 0);
    setDraft(bad.join(" "));
    return bad.length === 0;
  }

  return (
    <div>
      <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{label}</span>
      <div
        className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 rounded-full bg-violet-50 py-1 pl-3 pr-1 text-sm font-medium text-violet-900">
            {email}
            <input type="hidden" name="email" value={email} />
            <button
              type="button"
              aria-label={removeLabel.replace("{email}", email)}
              onClick={() => setEmails((current) => current.filter((entry) => entry !== email))}
              className="grid h-6 w-6 place-items-center rounded-full text-violet-700 hover:bg-violet-100"
            >
              <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          name="emailDraft"
          type="text"
          inputMode="email"
          autoComplete="off"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === ";") {
              event.preventDefault();
              commit(draft);
            }
            if (event.key === "Backspace" && draft === "" && emails.length > 0) {
              setEmails((current) => current.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (/[\s,;]/.test(text.trim())) {
              event.preventDefault();
              commit(`${draft} ${text}`);
            }
          }}
          aria-invalid={invalid}
          className="min-h-10 min-w-[12rem] flex-1 bg-transparent px-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => commit(draft)}
          className="inline-flex min-h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {addLabel}
        </button>
      </div>
      {invalid ? <p role="alert" className="mt-1 text-xs text-rose-700">{invalidLabel}</p> : <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}
