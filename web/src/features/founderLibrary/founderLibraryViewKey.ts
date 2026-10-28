export type FounderLibraryViewKey = "glossary" | "updates" | "research";

/** Die Ansicht aus ?view= - alles Unbekannte ist das Glossar. */
export function founderLibraryViewFrom(value: string | undefined): FounderLibraryViewKey {
  return value === "updates" || value === "research" ? value : "glossary";
}
