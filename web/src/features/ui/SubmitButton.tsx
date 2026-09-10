"use client";

import { useFormStatus } from "react-dom";

/**
 * Ein Absende-Knopf, der waehrend des Absendens sperrt und es sagt.
 *
 * Lag bis 10.09.2026 als `ConnectSubmitButton` unter features/connect. Der
 * Name war der Grund, warum ausserhalb von Connect niemand ihn benutzt hat:
 * 70 Absende-Knoepfe im Produkt hatten keinen Pending-Zustand, fuenf
 * Formularseiten gar keine Rueckmeldung - darunter das laengste Formular
 * ueberhaupt. Am Bauteil lag es nicht.
 *
 * Was er leistet: `disabled` waehrend `pending` verhindert das doppelte
 * Absenden, und der Text wechselt, damit man weiss, dass der Klick angekommen
 * ist. Bei mehreren Knoepfen in einem Formular unterscheidet `intent`, welcher
 * gedrueckt wurde - so zeigt nur dieser den Pending-Text.
 */
export function SubmitButton({
  intent,
  label,
  pendingLabel,
  className,
  fieldName = "intent",
  formAction,
}: {
  intent?: string;
  label: string;
  pendingLabel: string;
  className: string;
  fieldName?: string;
  /**
   * Fuer Formulare mit zwei Zielen - etwa "speichern" und "veroeffentlichen".
   * Zusammen mit `intent` bleibt erkennbar, welcher Knopf gedrueckt wurde,
   * sonst zeigten beide gleichzeitig "laeuft".
   */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending, data } = useFormStatus();
  const activeIntent = data?.get(fieldName);
  const showsPending = pending && (!intent || activeIntent === intent);
  return (
    <button
      type="submit"
      name={intent ? fieldName : undefined}
      value={intent}
      formAction={formAction}
      disabled={pending}
      aria-disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-65`}
    >
      {showsPending ? pendingLabel : label}
    </button>
  );
}
