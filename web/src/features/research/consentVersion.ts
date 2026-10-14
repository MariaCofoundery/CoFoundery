import { createHash } from "node:crypto";

/**
 * Zwei verschiedene Dinge, zwei verschiedene Konstanten.
 *
 * FACHLICHE VERSION (`research_consent_v1`): wofür eingewilligt wird - pseudonyme
 * `research_events` mit fester Positivliste. Sie steht an jedem Forschungsereignis
 * und wird von der Datenbank erzwungen. Sie ändert sich nur, wenn sich der Umfang
 * der Verarbeitung ändert.
 *
 * TEXTREVISION (`research_consent_copy_…`): welcher Wortlaut angezeigt wurde. Sie
 * ändert sich mit jeder inhaltlichen Änderung der Einwilligungstexte - auch wenn
 * der Umfang gleich bleibt oder enger wird. DE und EN gehören zur selben Revision;
 * die angezeigte Sprache wird bei jeder Entscheidung getrennt gespeichert.
 *
 * Bis zum 14.10.2026 wurde keine Textrevision gespeichert. Entscheidungen davor
 * haben deshalb keinen Audit-Eintrag - und bekommen auch rückwirkend keinen
 * (docs/research-consent-copy-history.md).
 */
export const RESEARCH_CONSENT_VERSION = "research_consent_v1";
export const RESEARCH_CONSENT_COPY_REVISION = "research_consent_copy_2026-10-14";

export const RESEARCH_CONSENT_LOCALES = ["de", "en"] as const;
export type ResearchConsentLocale = (typeof RESEARCH_CONSENT_LOCALES)[number];

/**
 * Wo entschieden wird. Beide Stellen zeigen verschiedene Texte, also gehört die
 * Stelle zum Nachweis dazu.
 */
export const RESEARCH_CONSENT_SURFACES = ["notice", "settings"] as const;
export type ResearchConsentSurface = (typeof RESEARCH_CONSENT_SURFACES)[number];

/** Die Schlüssel aus `messages/<locale>/researchConsent.json`, die die jeweilige Stelle zeigt. */
export const RESEARCH_CONSENT_COPY_KEYS: Readonly<Record<ResearchConsentSurface, readonly string[]>> = {
  notice: ["notice.eyebrow", "notice.title", "notice.body", "notice.decline", "notice.accept"],
  settings: ["settings.title", "settings.description", "settings.activate", "settings.withdraw", "settings.withdrawal"],
};

function lookup(messages: unknown, dottedKey: string): string {
  let node = messages;
  for (const part of dottedKey.split(".")) {
    if (!node || typeof node !== "object" || !(part in node)) throw new Error(`Einwilligungstext fehlt: ${dottedKey}`);
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") throw new Error(`Einwilligungstext ist kein Text: ${dottedKey}`);
  return node;
}

/**
 * Kanonische Form der angezeigten Einwilligungstexte einer Stelle: die Schlüssel
 * in fester Reihenfolge mit ihrem Wortlaut. Gehasht wird die Quelle, aus der die
 * Oberfläche rendert - nicht das Browser-HTML.
 */
export function canonicalResearchConsentCopy(messages: unknown, surface: ResearchConsentSurface): string {
  return JSON.stringify(RESEARCH_CONSENT_COPY_KEYS[surface].map((key) => [key, lookup(messages, key)]));
}

export function researchConsentCopySha256(messages: unknown, surface: ResearchConsentSurface): string {
  return createHash("sha256").update(canonicalResearchConsentCopy(messages, surface), "utf8").digest("hex");
}
