import { PROBLEM_DESCRIPTION_MAX } from "@/features/connect/connectTypes";

/**
 * Das optionale Feld "Was weisst du schon, was hast du versucht?".
 *
 * Es bekommt keine eigene Spalte: Es wird als beschrifteter Absatz an die
 * Beschreibung gehaengt. So braucht es keine Migration, und es gilt dieselbe
 * Sichtbarkeit und dieselbe Loeschung wie fuer die Beschreibung selbst.
 */
export const PROBLEM_TRIED_MAX = 400;

/** Der Absatz beginnt mit dieser Zeile; die Ansicht kann ihn daran erkennen. */
export const PROBLEM_TRIED_LABEL = "Schon versucht:";

export type ComposedProblemDescription =
  | { ok: true; description: string }
  | { ok: false; reason: "tried_too_long" | "too_long" };

/**
 * Die Beschreibung bleibt fuer sich geprueft (Mindestlaenge); hier wird nur
 * der Anhang geprueft und die Gesamtlaenge gegen die Grenze der Spalte.
 * Ein leeres Feld fuegt nichts hinzu.
 */
export function composeProblemDescription(
  description: string,
  tried: string
): ComposedProblemDescription {
  const main = description.trim();
  const extra = tried.trim();
  if (!extra) return { ok: true, description: main };
  if (extra.length > PROBLEM_TRIED_MAX) return { ok: false, reason: "tried_too_long" };
  const composed = `${main}\n\n${PROBLEM_TRIED_LABEL} ${extra}`;
  if (composed.length > PROBLEM_DESCRIPTION_MAX) return { ok: false, reason: "too_long" };
  return { ok: true, description: composed };
}
