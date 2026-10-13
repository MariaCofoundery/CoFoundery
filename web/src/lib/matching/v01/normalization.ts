/**
 * Normalisierung `matching-normalization-v0.1` (Spec §12, getestet als N-DICTIONARY in v03).
 *
 *   RAW VALUE (bleibt unverändert, wird nie überschrieben)
 *     -> generische Normalisierung (generic2)
 *     -> Wörterbuch (eingefroren; kennen beide Begriffe einen Schlüssel, entscheidet das Wörterbuch)
 *     -> Match-Repräsentation { key, toks }
 *
 * Exakte Portierung von normalization_v01.py (Wörterbuch-Schicht), normalization_v02.py (generic2,
 * Orte) und normalization_v03.py (Text-Token). Paritätstest: __tests__/normalization.test.ts.
 * Kein LLM, keine Embeddings, kein Fuzzy-Matching.
 */
import {
  INDUSTRY_SYNONYMS,
  LOCATION_ALIASES,
  LOCATION_NOISE,
  LOCATION_SUFFIXES,
  LOCATION_WILDCARDS,
  LOCATION_WILDCARD_TOKENS,
  STOPWORDS,
  TOPIC_SYNONYMS,
} from "@/lib/matching/v01/dictionary";
import { STEM_MIN, TEXT_MIN_LEN } from "@/lib/matching/v01/version";

export type TermKind = "industry" | "topic";

/** Normalisierter Begriff. `raw` bleibt für Anzeige und Reasons erhalten. */
export type NormalizedTerm = { raw: string; key: string | null; toks: readonly string[] };

/** Normalisierter Ort. `wild` = Angabe ohne konkreten Ort (DACH, bundesweit, remote …). */
export type NormalizedPlace = { raw: string; key: string | null; toks: readonly string[] | null; wild: boolean };

const WILDCARD_KEY = "loc:*";

function umlauts(s: string): string {
  return s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Python str.split() nach dem Ersetzen aller Nicht-Alphanumerischen durch Leerzeichen. */
function splitAlnum(s: string): string[] {
  return s.split(/[^a-z0-9]+/).filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Wörterbuch-Schicht (normalization_v01, Stufe "synonym")
// ---------------------------------------------------------------------------
function singularV01(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.length > 4 && token.endsWith("s") && !["ss", "us", "is", "os"].some((e) => token.endsWith(e))) {
    return token.slice(0, -1);
  }
  return token;
}

/** v01 `generic`: Schlüssel für die Wörterbuch-Suche. */
export function genericV01(text: string | null | undefined): string {
  let s = umlauts((text ?? "").normalize("NFKC").toLowerCase());
  s = s.replace(/&/g, " und ");
  return splitAlnum(s).map(singularV01).join(" ");
}

function buildIndex(table: ReadonlyArray<readonly [string, readonly string[]]>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, forms] of table) for (const f of forms) out.set(genericV01(f), key);
  return out;
}

const IND_INDEX = buildIndex(INDUSTRY_SYNONYMS);
const TOP_INDEX = buildIndex(TOPIC_SYNONYMS);
const LOC_INDEX = buildIndex(LOCATION_ALIASES);
const WILD_SET = new Set(LOCATION_WILDCARDS.map(genericV01));
const SUFFIX_RE = new RegExp(`(?:\\s+(?:${LOCATION_SUFFIXES.join("|")}))+$`);

function dictionaryTerm(text: string, kind: TermKind): string {
  const g = genericV01(text);
  return (kind === "industry" ? IND_INDEX : TOP_INDEX).get(g) ?? g;
}

function dictionaryLocation(text: string): string | null {
  if (!text || !text.trim()) return null;
  const g = genericV01(text);
  if (WILD_SET.has(g)) return WILDCARD_KEY;
  const direct = LOC_INDEX.get(g);
  if (direct !== undefined) return direct;
  const stripped = g.replace(SUFFIX_RE, "").trim();
  if (WILD_SET.has(stripped)) return WILDCARD_KEY;
  return LOC_INDEX.get(stripped) ?? stripped;
}

// ---------------------------------------------------------------------------
// generic2 (normalization_v02)
// ---------------------------------------------------------------------------
function camelSplit(text: string): string {
  // "HealthTech" -> "Health Tech": Leerzeichen zwischen Klein- und Großbuchstabe (ohne Lookbehind, ES2017).
  return text.replace(/([a-zäöü])([A-ZÄÖÜ])/g, "$1 $2");
}

function stem(tok: string): string {
  for (const suf of ["ies", "es", "s", "en", "e", "n"]) {
    if (tok.length - suf.length >= 4 && tok.endsWith(suf)) {
      if (suf === "ies") return tok.slice(0, -3) + "y";
      if (suf === "s" && ["ss", "us", "is"].some((e) => tok.endsWith(e))) return tok;
      return tok.slice(0, -suf.length);
    }
  }
  return tok;
}

/** generic2-Token eines Freitexts. */
export function generic2Tokens(text: string | null | undefined): string[] {
  const s = umlauts(camelSplit(text ?? "").normalize("NFKC").toLowerCase());
  return splitAlnum(s)
    .filter((t) => !STOPWORDS.has(t))
    .map(stem);
}

function commonPrefix(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

/** Generischer Vergleich zweier Token-Folgen: gleich, Teilmenge oder gemeinsamer Wortstamm ≥ 6. */
export function tokensMatch(x: readonly string[], y: readonly string[]): boolean {
  if (x.length === 0 || y.length === 0) return false;
  if (x.length === y.length && x.every((t, i) => t === y[i])) return true;
  const sx = new Set(x);
  const sy = new Set(y);
  const [small, big] = sx.size <= sy.size ? [sx, sy] : [sy, sx];
  if ([...small].every((t) => big.has(t)) && [...small].some((t) => t.length >= 3)) return true;
  for (const a of sx) for (const b of sy) if (commonPrefix(a, b) >= STEM_MIN) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Begriffe (Modus "dict+generic2")
// ---------------------------------------------------------------------------
export function normalizeTerm(raw: string, kind: TermKind): NormalizedTerm {
  const k = dictionaryTerm(raw, kind);
  const known = k.startsWith("ind:") || k.startsWith("top:");
  return { raw, key: known ? k : null, toks: generic2Tokens(raw) };
}

/** Leere und reine Leerraum-Werte fallen weg; die Reihenfolge bleibt (Duplikate zählen wie im Original). */
export function normalizeTerms(values: readonly string[] | null | undefined, kind: TermKind): NormalizedTerm[] {
  return (values ?? []).filter((v) => typeof v === "string" && v.trim().length > 0).map((v) => normalizeTerm(v, kind));
}

export function sameTerm(a: NormalizedTerm, b: NormalizedTerm): boolean {
  if (a.key !== null && b.key !== null) return a.key === b.key;
  return tokensMatch(a.toks, b.toks);
}

/** Anzahl der Begriffe aus `needles`, die in `hay` vorkommen. */
export function countCovered(needles: readonly NormalizedTerm[], hay: readonly NormalizedTerm[]): number {
  return needles.filter((n) => hay.some((h) => sameTerm(n, h))).length;
}

// ---------------------------------------------------------------------------
// Orte
// ---------------------------------------------------------------------------
/** null = keine Angabe. */
export function normalizePlace(raw: string | null | undefined): NormalizedPlace | null {
  if (!raw || !raw.trim()) return null;
  const k = dictionaryLocation(raw);
  if (k === WILDCARD_KEY) return { raw, key: null, toks: null, wild: true };
  if (k !== null && k.startsWith("loc:")) return { raw, key: k, toks: null, wild: false };
  const tokens = splitAlnum(umlauts(raw.normalize("NFKC").toLowerCase()));
  if (tokens.length > 0 && tokens.every((t) => LOCATION_WILDCARD_TOKENS.has(t))) return { raw, key: null, toks: null, wild: true };
  const toks = tokens.filter((t) => !LOCATION_NOISE.has(t) && t.length >= 3);
  if (toks.length === 0) return { raw, key: null, toks: null, wild: true };
  return { raw, key: null, toks, wild: false };
}

/** true / false / null (unbekannt). Ein Platzhalter erfüllt keinen konkreten Ort. */
export function samePlace(p: NormalizedPlace | null, q: NormalizedPlace | null): boolean | null {
  if (p === null || q === null) return null;
  if (p.wild && q.wild) return null;
  if (p.wild || q.wild) return false;
  if (p.key !== null && q.key !== null) return p.key === q.key;
  if (p.toks !== null && q.toks !== null) {
    const qs = new Set(q.toks);
    return p.toks.some((t) => qs.has(t));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Text-Schicht (normalization_v03, CONNECT text_relevance)
// ---------------------------------------------------------------------------
/** Token aus Titel, Beschreibung, Themen (Mindestlänge 3), sortiert für deterministische Summen. */
export function textTokens(...texts: ReadonlyArray<string | readonly string[] | null | undefined>): string[] {
  const out = new Set<string>();
  for (const t of texts) {
    const parts = Array.isArray(t) ? (t as readonly string[]) : t ? [t as string] : [];
    for (const part of parts) for (const tok of generic2Tokens(part)) if (tok.length >= TEXT_MIN_LEN) out.add(tok);
  }
  return [...out].sort();
}

/** Gleich, oder gemeinsamer Wortstamm ≥ 6. */
export function tokenMatch(a: string, b: string): boolean {
  return a === b || commonPrefix(a, b) >= STEM_MIN;
}
