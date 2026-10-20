/**
 * Der Stärken-Wortschatz: 28 Themen in vier Bereichen (20.10.2026).
 *
 * ANGELEHNT AN DIE IDEE, NICHT AN DIE TEXTE: Eigene Namen und eigene
 * Beschreibungen, auf Gründungs- und Arbeitsalltag zugeschnitten. Die Themen
 * beschreiben VERHALTEN ("wie du an Dinge herangehst"), keine Fachgebiete -
 * die stehen im Capability-Bereich.
 *
 * KEINE RANGFOLGE, KEIN TYP, KEINE ZAHL: Ein Thema ist belegt oder nicht, und
 * wie gut es belegt ist, sagt `evidenceLevel` in drei Worten. Niemand hat "ein
 * Top-5-Profil".
 *
 * DIE TEXTE (Name, "zeigt sich", "hilft", Gesprächsimpuls) stehen in
 * `messages/<locale>/strengths.json` unter `themes.items.<id>`.
 */
export const STRENGTH_DOMAINS = ["execute", "influence", "relate", "think"] as const;
export type StrengthDomain = (typeof STRENGTH_DOMAINS)[number];

export const STRENGTH_THEMES_BY_DOMAIN = {
  execute: ["keep_going", "reliable", "build_structure", "move_fast", "thorough", "take_ownership", "hold_focus"],
  influence: ["convince", "speak_plainly", "inspire", "negotiate", "make_visible", "kick_off", "decide"],
  relate: ["empathize", "build_trust", "connect", "develop_others", "resolve_conflict", "build_cohesion", "listen"],
  think: ["spot_patterns", "learn_fast", "generate_ideas", "envision_future", "break_down", "spot_opportunities", "experiment"],
} as const satisfies Record<StrengthDomain, readonly string[]>;

export const STRENGTH_THEME_IDS = STRENGTH_DOMAINS.flatMap((domain) => STRENGTH_THEMES_BY_DOMAIN[domain]);
export type StrengthThemeId = (typeof STRENGTH_THEMES_BY_DOMAIN)[StrengthDomain][number];

export function isStrengthTheme(value: unknown): value is StrengthThemeId {
  return typeof value === "string" && (STRENGTH_THEME_IDS as readonly string[]).includes(value);
}

export function domainOfTheme(theme: StrengthThemeId): StrengthDomain {
  return STRENGTH_DOMAINS.find((domain) => (STRENGTH_THEMES_BY_DOMAIN[domain] as readonly string[]).includes(theme))!;
}

/**
 * Wie gut ein Thema belegt ist - keine Stärke-Ausprägung.
 *   clear - in mindestens drei verschiedenen Situationen
 *   shown - in zwei
 *   hint  - in einer
 */
export type EvidenceLevel = "clear" | "shown" | "hint";

export function evidenceLevelFor(distinctSituations: number): EvidenceLevel {
  if (distinctSituations >= 3) return "clear";
  if (distinctSituations === 2) return "shown";
  return "hint";
}
