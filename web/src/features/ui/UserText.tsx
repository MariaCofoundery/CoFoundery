import { Fragment, type ReactNode } from "react";
import { parseUserText, type UserTextPart } from "@/features/ui/userTextMarkup";

function render(parts: UserTextPart[]): ReactNode {
  return parts.map((part, index) =>
    part.kind === "text" ? (
      <Fragment key={index}>{part.text}</Fragment>
    ) : part.kind === "strong" ? (
      <strong key={index} className="font-semibold">{render(part.children)}</strong>
    ) : (
      <em key={index}>{render(part.children)}</em>
    )
  );
}

/**
 * Eingegebener Text mit `**fett**` und `*kursiv*` / `_kursiv_` (siehe `userText.ts`). Steht dort, wo
 * vorher der Text selbst stand; Zeilenumbrueche erhaelt weiter das umgebende Element. Ohne Hooks -
 * auf dem Server und im Browser gleich.
 */
export function UserText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return <>{render(parseUserText(text))}</>;
}
