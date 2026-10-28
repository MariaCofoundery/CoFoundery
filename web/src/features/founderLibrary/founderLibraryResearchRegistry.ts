import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * Studien, auf die sich Hinweise im Produkt stuetzen.
 *
 * Nur Quellen, die jemand gefunden und geoeffnet hat. Eine Zeile je Quelle:
 * Angaben zur Quelle selbst stehen hier, die Einordnung ("was sie traegt, was
 * nicht") in founderLibrary.json. Stichprobenzahlen und Mittelwerte stehen
 * absichtlich NICHT hier, bis jemand sie im Volltext gegengelesen hat
 * (docs/research/phase-13/13.5-quellen-konfliktthemen.md).
 */
export type FounderLibraryResearchSource = {
  id: "kozusznik_euwema_2025";
  authors: string;
  year: number;
  title: string;
  venue: string;
  doi: string;
  url: string;
  /** Wofuer das Produkt die Quelle nutzt. */
  supports: "conflict_topics";
};

export const FOUNDER_LIBRARY_RESEARCH_SOURCES: readonly FounderLibraryResearchSource[] = [
  {
    id: "kozusznik_euwema_2025",
    authors: "Kozusznik, M. W., & Euwema, M.",
    year: 2025,
    title: "Conflict Issues in Start-up Co-founders: Typology and Measurement",
    venue: "Negotiation and Conflict Management Research, 18(3), 237–277",
    doi: "10.34891/mvb8-sm62",
    url: "https://ncmr.lps.library.cmu.edu/article/id/880/",
    supports: "conflict_topics",
  },
] as const;

export type FounderLibraryResearchTopicKey = FounderSetupItemKey;
