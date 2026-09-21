"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Wartet darauf, dass die KI fertig ist.
 *
 * WARUM SO WENIG: Der Arbeiter läuft auf einem anderen Rechner und holt sich
 * Aufgaben im Sekundenrhythmus ab. Die Seite kann also nicht auf ein Ergebnis
 * warten - sie kann nur nachsehen. Dieses Bauteil tut genau das und nichts
 * weiter: Es lädt die Seite neu, solange ein Auftrag offen ist.
 *
 * Kein eigener Abruf, keine zweite Datenquelle: `router.refresh()` holt
 * dieselbe Seite, die auch beim ersten Aufruf gerendert wurde - und damit
 * entscheidet weiterhin der Server, was angezeigt wird. Ein eigener Abruf
 * hätte eine zweite Stelle geschaffen, an der steht, wann ein Auftrag fertig
 * ist.
 *
 * UND ES HÖRT VON SELBST AUF. Eine Seite, die sich für immer neu lädt, ist
 * eine Seite, die im Hintergrund eines Telefons den Akku leert - der Auftrag
 * gilt nach zehn Minuten ohnehin als verwaist.
 */

const EVERY_MS = 3_000;
const GIVE_UP_AFTER_MS = 90_000;

export function ProposalWatcher({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > GIVE_UP_AFTER_MS) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, EVERY_MS);

    return () => clearInterval(timer);
  }, [router]);

  return <>{children}</>;
}
