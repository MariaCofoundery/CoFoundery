"use client";

import { useEffect, useState } from "react";

/**
 * Teamraum-Seiten: Hat jemand die Seite gespeichert, waehrend du sie bearbeitet hast, lehnt die
 * Datenbank deine Fassung ab (org_page_changed) - nichts wird still ueberschrieben. Damit dein Text
 * dabei nicht verloren geht, legt dieses Stueck ihn beim Absenden in den Sitzungsspeicher dieses
 * Browsers und zeigt ihn nach der Ablehnung zum Kopieren. Nach erfolgreichem Speichern wird er
 * geloescht. Ohne Speicher (privates Fenster) fehlt nur diese Hilfe, die Seite funktioniert.
 */
export function PageDraftKeeper({
  formId,
  storageKey,
  conflict,
  saved,
  title,
  hint,
}: {
  formId: string;
  storageKey: string;
  conflict: boolean;
  saved: boolean;
  title: string;
  hint: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const remember = () => {
      const body = form?.elements.namedItem("body");
      try {
        if (body instanceof HTMLTextAreaElement) sessionStorage.setItem(storageKey, body.value);
      } catch {
        // Kein Speicher - dann eben ohne Sicherung.
      }
    };
    form?.addEventListener("submit", remember);
    let kept: string | null = null;
    try {
      if (saved) sessionStorage.removeItem(storageKey);
      else if (conflict) kept = sessionStorage.getItem(storageKey);
    } catch {
      kept = null;
    }
    // Erst nach dem Laden lesbar (Sitzungsspeicher gibt es nur im Browser).
    if (kept) queueMicrotask(() => setDraft(kept));
    return () => form?.removeEventListener("submit", remember);
  }, [formId, storageKey, conflict, saved]);

  if (!draft) return null;
  return (
    <div role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-amber-900">{hint}</p>
      <textarea readOnly value={draft} rows={8} className="mt-2 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-800" />
    </div>
  );
}
