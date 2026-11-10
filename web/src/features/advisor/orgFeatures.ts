/**
 * Welche Bereiche eine Organisation eingeschaltet hat.
 *
 * Immer dabei, ohne Auswahl: Teams aufnehmen, das Programm mit Teamkarten, Meilensteine und Updates,
 * Mitglieder und Profil. Schaltbar sind die sieben hier. "Aus" verbirgt, loescht nichts; fuer Teams
 * gilt es in der Datenbank (org_feature_enabled), diese Datei sorgt nur dafuer, dass die Oberflaeche
 * dasselbe sagt.
 */
export const ORG_FEATURES = ["plan", "materials", "learning", "experts", "orgdata", "success", "funding"] as const;
export type OrgFeature = (typeof ORG_FEATURES)[number];

/** Die kleine Vorbelegung neuer Organisationen; sie steht auch in create_advisor_org. */
export const DEFAULT_NEW_ORG_FEATURES: OrgFeature[] = ["plan", "materials", "learning"];

/** Reiter der Organisation, die an einem Bereich haengen. */
export const FEATURE_OF_TAB: Partial<Record<string, OrgFeature>> = {
  plan: "plan",
  materials: "materials",
  learning: "learning",
  experts: "experts",
  // Die Partnerliste (ehemals Experten-Liste, 20270416120000) haengt am selben Bereich.
  partners: "experts",
  // Foerderauflagen (20270314120000): nur fuer gefoerderte Programme, standardmaessig aus.
  funding: "funding",
};

export const isOrgFeature = (value: string): value is OrgFeature => (ORG_FEATURES as readonly string[]).includes(value);

export function hasOrgFeature(org: { features: string[] }, feature: OrgFeature) {
  return org.features.includes(feature);
}

/** Ist der Reiter sichtbar? Reiter ohne zugehoerigen Bereich sind es immer. */
export function tabEnabled(org: { features: string[] }, tab: string) {
  const feature = FEATURE_OF_TAB[tab];
  return !feature || hasOrgFeature(org, feature);
}
