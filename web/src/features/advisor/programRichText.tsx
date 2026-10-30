import type { ReactNode } from "react";

/**
 * Einfache Formatierung fuer den Willkommenstext einer Programmseite - ohne
 * HTML. Erlaubt sind **fett**, *kursiv*, ++groesser++ (bis zu drei Stufen), --kleiner-- (bis zu zwei), Listen mit
 * "- " und Absaetze durch Leerzeilen. Alles andere bleibt Text; es gibt keine Links und kein HTML, damit
 * eine Organisation auf ihrer Seite nichts einschleusen kann, das wie eine
 * Anwendungsseite aussieht oder woanders hinfuehrt.
 */
/**
 * Groessenstufen: ++Text++ (eine Stufe groesser), +++Text+++ (zwei), ++++Text++++ (drei);
 * --Text-- (eine Stufe kleiner), ---Text--- (zwei). Die Knoepfe im Editor zaehlen die Stufen;
 * von Hand tippen geht genauso.
 */
const BIGGER = ["", "text-[1.25em] font-semibold leading-snug", "text-[1.6em] font-semibold leading-tight", "text-[2.1em] font-bold leading-tight"];
const SMALLER = ["", "text-[0.85em]", "text-[0.7em]"];

function inline(text: string): ReactNode[] {
  return text.split(/(\+{2,4}[^+\n]+\+{2,4}|-{2,3}[^-\n]+-{2,3}|\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, index) => {
    const plus = part.match(/^(\+{2,4})([^+\n]+)\1$/);
    if (plus) return <span key={index} className={BIGGER[plus[1].length - 1]}>{plus[2]}</span>;
    const minus = part.match(/^(-{2,3})([^-\n]+)\1$/);
    if (minus) return <span key={index} className={SMALLER[minus[1].length - 1]}>{minus[2]}</span>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function ProgramRichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        if (lines.every((line) => /^\s*[-•]\s+/.test(line))) {
          return (
            <ul key={index} className="mt-2 list-disc space-y-1 pl-5 first:mt-0">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*[-•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="mt-2 first:mt-0">
            {lines.map((line, i) => (
              <span key={i}>
                {i > 0 ? <br /> : null}
                {inline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
