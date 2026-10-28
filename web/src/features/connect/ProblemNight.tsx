import type { ReactNode } from "react";

/**
 * Der Grund des Problembereichs: Nacht mit langsam wandernden Lichtflaechen.
 *
 * Eine Huelle statt eines Seitenlayouts: Jede Seite behaelt ihr eigenes
 * `main`. Was man darauf liest oder ausfuellt, steht auf hellen Karten
 * (`problem-paper`), damit die bestehenden Bausteine unveraendert lesbar
 * bleiben. Die Bewegung stoppt mit "Bewegung reduzieren".
 */
export function ProblemNight({ children }: { children: ReactNode }) {
  return <div className="problem-night">{children}</div>;
}
