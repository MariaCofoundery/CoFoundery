export const FOUNDER_LIBRARY_UPDATE_STATUSES = [
  "consultation",
  "promulgated",
  "in_force",
] as const;

export type FounderLibraryUpdateStatus = (typeof FOUNDER_LIBRARY_UPDATE_STATUSES)[number];
export type FounderLibraryUpdateCategory = "ai_data" | "data" | "consumer_sales";
export type FounderLibraryUpdateJurisdiction = "germany";

export type FounderLibraryUpdate = {
  id: string;
  jurisdiction: FounderLibraryUpdateJurisdiction;
  category: FounderLibraryUpdateCategory;
  status: FounderLibraryUpdateStatus;
  date: string;
  sourceLabel: "Gesetze im Internet";
  sourceUrl: string;
};

export type LocalizedFounderLibraryUpdate = FounderLibraryUpdate & {
  title: string;
  relevance: string;
};

export const FOUNDER_LIBRARY_UPDATES = [
  {
    id: "ki_mig_2026",
    jurisdiction: "germany",
    category: "ai_data",
    status: "in_force",
    date: "2026-07-29",
    sourceLabel: "Gesetze im Internet",
    sourceUrl: "https://www.gesetze-im-internet.de/ki-mig/BJNR0DF0B0026.html",
  },
  {
    id: "dadg_2026",
    jurisdiction: "germany",
    category: "data",
    status: "in_force",
    date: "2026-05-30",
    sourceLabel: "Gesetze im Internet",
    sourceUrl: "https://www.gesetze-im-internet.de/dadg/BJNR09D0B0026.html",
  },
  {
    id: "electronic_withdrawal_function_2026",
    jurisdiction: "germany",
    category: "consumer_sales",
    status: "in_force",
    date: "2026-06-19",
    sourceLabel: "Gesetze im Internet",
    sourceUrl: "https://www.gesetze-im-internet.de/bgb/__356a.html",
  },
] as const satisfies readonly FounderLibraryUpdate[];

export type FounderLibraryOfficialSource = {
  id: "federal_law_gazette" | "laws_on_the_internet" | "dip" | "eur_lex";
  url: string;
};

export const FOUNDER_LIBRARY_OFFICIAL_SOURCES = [
  { id: "federal_law_gazette", url: "https://www.recht.bund.de/" },
  { id: "laws_on_the_internet", url: "https://www.gesetze-im-internet.de/" },
  { id: "dip", url: "https://dip.bundestag.de/" },
  { id: "eur_lex", url: "https://eur-lex.europa.eu/" },
] as const satisfies readonly FounderLibraryOfficialSource[];

export function sortFounderLibraryUpdates<T extends FounderLibraryUpdate>(updates: readonly T[]) {
  return [...updates].sort((left, right) => right.date.localeCompare(left.date));
}
