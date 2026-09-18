"use client";

/**
 * Drucken laesst nur der Browser sich sagen - eine Serverkomponente kann das
 * nicht. Deshalb dieses eine Bauteil statt eines Knopfes, der nichts tut.
 *
 * Der Browser kann es ausserdem besser als jede erzeugte Datei: Er kennt
 * Papierformat, Raender und die Schriften, die auf der Seite stehen.
 */
export function PrintButton({ label, className }: { label: string; className: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
