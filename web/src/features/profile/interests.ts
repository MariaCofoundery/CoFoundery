/**
 * Wofuer jemand hier ist - eine Absicht, keine Berechtigung.
 *
 * Gesetzt im Einstieg, aenderbar im Profil, gespeichert in `person_core.interests`.
 * Sie oeffnet und schliesst nichts: Rollen liegen in `profiles`, Zugaenge und
 * Freigaben in ihren eigenen Tabellen. Sie steuert allein, was die Startseite
 * vorschlaegt („Das kannst du auch").
 */
export const INTEREST_AREAS = ["align", "find", "connect", "advise"] as const;
export type InterestArea = (typeof INTEREST_AREAS)[number];

export function isInterestArea(value: unknown): value is InterestArea {
  return typeof value === "string" && (INTEREST_AREAS as readonly string[]).includes(value);
}

/** Nur bekannte Werte, ohne Doppelte, in fester Reihenfolge. */
export function parseInterests(values: readonly unknown[]): InterestArea[] {
  const wanted = new Set(values.filter(isInterestArea));
  return INTEREST_AREAS.filter((area) => wanted.has(area));
}

/**
 * Die Absicht („Suche", „Selbsttest", „Begleiten" ...) aus dem, was die Person im Einstieg ohnehin gesagt hat.
 *
 * Bis 21.10.2026 wurde sie zusaetzlich einzeln gefragt („Was moechtest du hier als Erstes tun?"), obwohl der
 * Einstieg am Ende schon fragt, womit man anfangen will. Gelesen wird `profiles.intention` nirgends
 * ausser in der Vollstaendigkeitspruefung des Kernprofils - die Frage war eine Pflichtangabe ohne Folge. Die
 * Werte bleiben die bisherigen, damit bestehende Profile gueltig sind.
 */
export function intentionForOnboarding(plan: string, startArea: string): "Suche" | "Selbsttest" | "Begleiten" {
  if (plan === "advisor") return "Begleiten";
  return startArea === "find" ? "Suche" : "Selbsttest";
}

/**
 * Was der Einstieg aus der Planwahl und der Startwahl ableitet.
 *
 * Wer „gruenden" waehlt, hat Align und Find gesagt - beides gehoert zu dem Satz
 * dort. Wer begleiten waehlt, Advise. Wer nur vernetzen will, Connect. Hat
 * jemand am Ende ausdruecklich mit Connect angefangen, steht das dabei.
 */
export function interestsForPlan(plan: string, startArea: string): InterestArea[] {
  const set: string[] = [];
  if (plan === "founder" || plan === "both") set.push("align", "find");
  if (plan === "advisor" || plan === "both") set.push("advise");
  if (plan === "connect") set.push("connect");
  if (startArea) set.push(startArea === "advisor" ? "advise" : startArea);
  return parseInterests(set);
}
