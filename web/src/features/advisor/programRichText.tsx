import type { ReactNode } from "react";

/**
 * Einfache Formatierung fuer den Willkommenstext einer Programmseite - ohne
 * HTML. Erlaubt sind **fett**, *kursiv*, ++groesser++, --kleiner--, Listen mit
 * "- " und Absaetze durch Leerzeilen. Alles andere bleibt Text; es gibt keine Links und kein HTML, damit
 * eine Organisation auf ihrer Seite nichts einschleusen kann, das wie eine
 * Anwendungsseite aussieht oder woanders hinfuehrt.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\+\+[^+\n]+\+\+|--[^-\n]+--|\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, index) => {
    if (part.startsWith("++") && part.endsWith("++") && part.length > 4) return <span key={index} className="text-[1.35em] font-semibold leading-tight">{part.slice(2, -2)}</span>;
    if (part.startsWith("--") && part.endsWith("--") && part.length > 4) return <span key={index} className="text-[0.82em]">{part.slice(2, -2)}</span>;
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
