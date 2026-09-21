"use client";

import { useFormStatus } from "react-dom";

/**
 * "Darüber möchte ich sprechen" - ein Knopf, der sofort umschaltet.
 *
 * GEMELDET AM 21.09.2026: "Immer wenn ich geklickt habe, darüber möchte ich
 * sprechen, hat er diese Seite im Prinzip noch mal ein bisschen neu geladen.
 * Und das war irgendwie ein unangenehmes User-Gefühl. Ich glaube, es wäre
 * schöner, wenn man den Button drückt und es ist einfach nur so ein ganz
 * einfacher Klick."
 *
 * ZWEI URSACHEN, ZWEI REPARATUREN. Die eine lag in der Aktion: Sie leitete
 * auf dieselbe Adresse mit `#conversation-marker` weiter, also eine echte
 * Navigation samt Sprung zum Anker. Das steht dort.
 *
 * Die andere liegt hier: Auch ohne Weiterleitung dauert eine Server-Aktion
 * einen Moment, und solange blieb der Knopf auf dem alten Stand. Ein Schalter,
 * der nach dem Drücken noch das Alte anzeigt, fühlt sich kaputt an.
 *
 * WARUM `useFormStatus` UND NICHT `useOptimistic`: Weil das Formular seine
 * Server-Aktion behalten soll. Mit `useOptimistic` müsste die Aktion des
 * Formulars eine Client-Funktion sein - und ohne Javascript tut die nichts.
 * So schickt das Formular auch dann ab, wenn nichts geladen wurde: Der Knopf
 * schaltet eben erst mit der Antwort um. Der Stand kommt weiterhin vom Server,
 * hier wird nur die Zeit dazwischen überbrückt.
 */
export function ConversationMarkerButton({
  marked,
  markLabel,
  unmarkLabel,
  className,
}: {
  marked: boolean;
  markLabel: string;
  unmarkLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  // Während es läuft, zeigt der Knopf schon das Ziel: Gedrückt heißt
  // umgeschaltet.
  const shown = pending ? !marked : marked;
  return (
    <button
      type="submit"
      aria-pressed={shown}
      // `aria-busy` statt `disabled`: Ein Vorlesegerät soll sagen, dass es
      // läuft, und der Knopf soll seinen Platz und seinen Fokus behalten.
      aria-busy={pending}
      disabled={pending}
      className={`${className} disabled:cursor-wait`}
    >
      {shown ? unmarkLabel : markLabel}
    </button>
  );
}
