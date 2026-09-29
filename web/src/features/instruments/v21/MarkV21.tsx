"use client";

import { useState, useTransition } from "react";
import {
  setDiscussionMarkV21,
  type MarkScope,
} from "@/features/instruments/v21/markActionsV21";

/**
 * Der Haken am eigenen Bericht.
 *
 * Er sagt nichts über die Antwort aus - nur, dass die Person darüber sprechen
 * möchte. Deshalb steht er hier und nicht im Fragebogen: Beim Ausfüllen weiß
 * niemand, was ein Thema wird.
 */
export function MarkV21({
  itemId,
  initial,
  scope = "v21",
  ventureId,
}: {
  itemId: string;
  initial: boolean;
  /** Welcher Bogen - ohne Angabe v2.1, so wie die Seiten es bisher taten. */
  scope?: MarkScope;
  ventureId?: string;
}) {
  const [marked, setMarked] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  return (
    <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={marked}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.checked;
          // Sofort umschalten, damit der Haken nicht hängt. Bleibt das
          // Speichern aus, springt er zurück UND sagt es - ein Haken, der
          // stillschweigend zurückfällt, sieht aus wie ein Klickfehler.
          setMarked(next);
          setFailed(false);
          start(async () => {
            const result = await setDiscussionMarkV21(itemId, next, scope, ventureId);
            if (!result.ok) {
              setMarked(!next);
              setFailed(true);
            }
          });
        }}
      />
      darüber möchte ich sprechen
      {failed && <span className="text-rose-700">— nicht gespeichert</span>}
    </label>
  );
}
