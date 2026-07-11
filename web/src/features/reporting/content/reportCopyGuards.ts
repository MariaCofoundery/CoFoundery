export type ReportCopyIssueKind =
  | "forbidden_phrase"
  | "hard_percentage_claim"
  | "german_residue";

export type ReportCopyIssue = {
  kind: ReportCopyIssueKind;
  match: string;
  index: number;
  excerpt: string;
};

const FORBIDDEN_ENGLISH_PHRASES = [
  "perfect match",
  "bad match",
  "diagnosis",
  "low performer",
  "weak founder",
] as const;

const HARD_PERCENTAGE_CLAIM_PATTERN =
  /\b(?:100|[1-9]\d?)\s?%\s+(?:match|compatible|compatibility|fit|certainty|guarantee|success|suitable|suitability)\b/gi;

const GERMAN_RESIDUE_TERMS = [
  "Gründung",
  "Gruendung",
  "Gründer",
  "Gruender",
  "Gründerteam",
  "Gruenderteam",
  "Spannungsfeld",
  "Gespräch",
  "Gespraech",
  "Gesprächsimpuls",
  "Gespraechsimpuls",
  "Gesprächsimpulse",
  "Gespraechsimpulse",
  "Klärung",
  "Klaerung",
  "Entscheidung",
  "Entscheidungen",
  "Arbeitsdynamik",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTermPattern(term: string) {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(term)}(?![\\p{L}\\p{N}_])`, "giu");
}

function createExcerpt(text: string, index: number, length: number) {
  const start = Math.max(0, index - 32);
  const end = Math.min(text.length, index + length + 32);
  return text.slice(start, end).trim();
}

function collectPatternIssues(
  text: string,
  pattern: RegExp,
  kind: ReportCopyIssueKind
): ReportCopyIssue[] {
  const issues: ReportCopyIssue[] = [];
  for (const match of text.matchAll(pattern)) {
    const matchedText = match[0];
    const index = match.index ?? 0;
    issues.push({
      kind,
      match: matchedText,
      index,
      excerpt: createExcerpt(text, index, matchedText.length),
    });
  }
  return issues;
}

export function findForbiddenEnglishReportPhrases(text: string): ReportCopyIssue[] {
  return FORBIDDEN_ENGLISH_PHRASES.flatMap((phrase) =>
    collectPatternIssues(text, createTermPattern(phrase), "forbidden_phrase")
  );
}

export function findHardPercentageClaims(text: string): ReportCopyIssue[] {
  return collectPatternIssues(text, HARD_PERCENTAGE_CLAIM_PATTERN, "hard_percentage_claim");
}

export function findGermanResidueInEnglishReportCopy(text: string): ReportCopyIssue[] {
  return GERMAN_RESIDUE_TERMS.flatMap((term) =>
    collectPatternIssues(text, createTermPattern(term), "german_residue")
  );
}

export function findEnglishReportCopyQualityIssues(text: string): ReportCopyIssue[] {
  return [
    ...findForbiddenEnglishReportPhrases(text),
    ...findHardPercentageClaims(text),
    ...findGermanResidueInEnglishReportCopy(text),
  ].sort((a, b) => a.index - b.index || a.match.localeCompare(b.match));
}
