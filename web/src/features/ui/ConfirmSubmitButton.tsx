"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Ein Absende-Knopf, der beim ersten Klick nachfragt.
 *
 * Gebaut fuer eine Stelle, an der ein Klick unwiderruflich Text vernichtete:
 * das Entfernen eines erzaehlten Belegs. Das Konto zu loeschen verlangt in
 * diesem Produkt, ein Wort abzutippen - fuer den laengsten selbst
 * geschriebenen Text galt gar nichts.
 *
 * Kein `window.confirm`: Das sieht in jedem Browser anders aus, ist nicht
 * uebersetzbar und wirkt wie ein Systemfehler. Stattdessen zwei Klicks mit
 * einer Frage dazwischen, die man auch wieder abbrechen kann.
 *
 * Ohne JavaScript bleibt es ein gewoehnlicher Absende-Knopf - dann fehlt die
 * Rueckfrage, aber der Weg funktioniert. Lieber ohne Rueckfrage loeschen
 * koennen als einen toten Knopf sehen.
 */
export function ConfirmSubmitButton({
  label,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  question,
  className,
  confirmClassName,
}: {
  label: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  question: string;
  className: string;
  confirmClassName: string;
}) {
  const { pending } = useFormStatus();
  const [asking, setAsking] = useState(false);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // Der Fokus wandert auf die Bestaetigung, damit die Rueckfrage auch ohne
  // Maus ankommt und nicht nur optisch erscheint.
  useEffect(() => {
    if (asking) confirmRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={className}>
        {label}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-3">
      <span role="alert" className="text-xs leading-5 text-slate-700">
        {question}
      </span>
      <button
        ref={confirmRef}
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className={`${confirmClassName} disabled:cursor-wait disabled:opacity-65`}
      >
        {pending ? pendingLabel : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="text-xs font-semibold text-slate-500 underline underline-offset-2"
      >
        {cancelLabel}
      </button>
    </span>
  );
}
