import type { ReactNode } from "react";

/**
 * Der Grund des Problembereichs: Nacht mit langsam wandernden Lichtflaechen.
 *
 * Eine Huelle statt eines Seitenlayouts: Jede Seite behaelt ihr eigenes
 * `main`. Was man darauf liest oder ausfuellt, steht auf Karten aus dunklem Glas
 * (`problem-card`). Deren Palette legt das Stylesheet um, damit die
 * bestehenden Bausteine unveraendert bleiben. Die Bewegung stoppt mit "Bewegung reduzieren".
 */
export function ProblemNight({ children }: { children: ReactNode }) {
  return <div className="problem-night">{children}</div>;
}
