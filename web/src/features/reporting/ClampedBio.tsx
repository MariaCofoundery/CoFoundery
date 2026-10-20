"use client";

import { useState } from "react";

/**
 * Der Über-mich-Text im Kopf: am Telefon auf vier Zeilen gekürzt, mit
 * „Mehr lesen". Ab `sm` und im Ausdruck steht immer der ganze Text - gekürzt
 * wird nur, was an einem schmalen Bildschirm den Kopf in die Länge zieht.
 * Bis zur Grenze ist der Text kurz genug und bekommt keinen Knopf.
 */
const CLAMP_FROM_LENGTH = 180;

export function ClampedBio({
  text,
  className,
  moreLabel,
  lessLabel,
}: {
  text: string;
  className: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_FROM_LENGTH;
  return (
    <div>
      <p className={`${className} ${long && !open ? "line-clamp-4 sm:line-clamp-none print:line-clamp-none" : ""}`}>{text}</p>
      {long ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="no-print mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 sm:hidden"
        >
          {open ? lessLabel : moreLabel}
        </button>
      ) : null}
    </div>
  );
}
