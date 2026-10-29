"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markConnectSuggestionsSeenAction } from "./connectSuggestionActions";

/**
 * Setzt die Vorschlaege auf "gesehen", sobald die Liste auf dem Bildschirm
 * steht, und frischt die Navigation auf, damit die Zahl verschwindet.
 */
export function ConnectMarkSuggestionsSeen({ newCount }: { newCount: number }) {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (newCount < 1 || started.current) return;
    started.current = true;
    void markConnectSuggestionsSeenAction().then((result) => {
      if (result.ok) router.refresh();
    });
  }, [newCount, router]);

  return null;
}
