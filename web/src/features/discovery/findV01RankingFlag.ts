import "server-only";

/**
 * Server-Flag für FIND Matching v0.1 als Rankingpfad (E3b) und die dazugehörige
 * Produktschicht (E3c: Capability-Freigabe, Reasons, Transparenzhinweis).
 *
 * Nur `true` schaltet ein; fehlt die Variable oder hat sie einen anderen Wert, gilt
 * die heutige Suche. Bewusst kein NEXT_PUBLIC_-Name: Der Client erfährt den Wert nie.
 * Eigenes Modul, damit Seiten das Flag lesen können, ohne den Rankingpfad einzubinden.
 */
export const FIND_V01_RANKING_FLAG = "MATCHING_FIND_V01_RANKING_ENABLED";

export function isFindV01RankingEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const raw = env[FIND_V01_RANKING_FLAG];
  return typeof raw === "string" && raw.trim().toLowerCase() === "true";
}
