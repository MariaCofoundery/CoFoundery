/**
 * Branchen, und die Wörter, an denen man sie im Lebenslauf erkennt.
 *
 * WARUM HIER UND NICHT IN DER DATENBANK:
 *   `person_core.industries` ist freier Text - hoechstens fuenf Eintraege, die
 *   die Person selbst formuliert. Diese Liste definiert kein Vokabular, sie
 *   schlaegt nur Formulierungen vor. Genau wie die Begriffe in
 *   `narrativeAnalysis` sind das Erkennungshilfen, keine Wahrheit ueber
 *   Menschen. Deshalb braucht es keine Migration.
 *
 * WARUM ES SIE UEBERHAUPT GIBT:
 *   Fuer Kompetenzen existierte schon ein kuratiertes Vokabular - die 43
 *   Bereiche des Capability-Modells mit ihren Begriffen. Fuer Branchen gab es
 *   nichts. Ein Freitextfeld, in das jede Person etwas anderes schreibt
 *   ("SaaS", "Software as a Service", "Softwarebranche"), laesst sich weder
 *   abgleichen noch durchsuchen.
 *
 * Die Beschriftung steht in `capability.industryLabels.<key>`, damit sie neben
 * den Bereichsbeschriftungen wohnt und denselben Uebersetzungsweg nimmt.
 *
 * Die Suchwoerter sind klein geschrieben und deutsch wie englisch gemischt:
 * Lebenslaeufe sind gemischt, auch deutsche.
 */

export const CV_INDUSTRY_KEYS = [
  "software_saas", "fintech", "insurance", "banking", "healthcare", "biotech_pharma",
  "medtech", "education", "hr_work", "real_estate", "construction", "mobility",
  "logistics", "automotive", "ecommerce", "retail", "consumer_goods", "food_beverage",
  "agriculture", "energy", "sustainability", "manufacturing", "robotics", "electronics",
  "telecommunications", "media_publishing", "gaming", "advertising", "consulting",
  "public_sector", "nonprofit", "legal_services", "tourism_hospitality", "sports",
  "fashion", "security_defense", "research_academia", "chemicals",
] as const;

export type CvIndustryKey = (typeof CV_INDUSTRY_KEYS)[number];

/**
 * Absichtlich sparsam, nach derselben Regel wie bei den Bereichen: Ein Wort
 * gehoert nur hierher, wenn es fuer die Branche einigermassen kennzeichnend
 * ist. "Digital" oder "Kunde" waeren wertlos, weil sie ueberall stehen.
 */
export const INDUSTRY_TERMS: Record<CvIndustryKey, readonly string[]> = {
  software_saas: ["saas", "software as a service", "softwarehaus", "it-dienstleist", "softwareunternehmen"],
  fintech: ["fintech", "zahlungsverkehr", "payment provider", "kreditvergabe", "finanztechnologie"],
  insurance: ["versicherung", "insurtech", "rückversicher", "assekuranz"],
  banking: ["bank", "sparkasse", "kreditinstitut", "investmentbank"],
  healthcare: ["gesundheitswesen", "healthcare", "krankenhaus", "klinik", "arztpraxis", "healthtech", "pflegedienst"],
  biotech_pharma: ["biotech", "pharma", "arzneimittel", "life science", "wirkstoff"],
  medtech: ["medizintechnik", "medtech", "medical device", "diagnostik"],
  education: ["edtech", "hochschule", "weiterbildung", "e-learning", "lernplattform", "bildungsträger"],
  hr_work: ["hrtech", "personaldienstleist", "zeitarbeit", "jobplattform", "personalvermittlung"],
  real_estate: ["immobilien", "proptech", "hausverwaltung", "maklerbüro"],
  construction: ["bauwesen", "bauunternehmen", "architekturbüro", "bauträger", "tiefbau"],
  mobility: ["mobilität", "öpnv", "verkehrsbetrieb", "carsharing", "bahnbranche"],
  logistics: ["logistik", "spedition", "fracht", "lagerhaltung", "fulfillment"],
  automotive: ["automotive", "automobil", "fahrzeugbau", "automobilzulieferer"],
  ecommerce: ["e-commerce", "ecommerce", "onlinehandel", "online-shop", "marktplatz", "d2c"],
  retail: ["einzelhandel", "großhandel", "filialbetrieb", "handelsunternehmen"],
  consumer_goods: ["konsumgüter", "consumer goods", "fmcg", "markenartikel"],
  food_beverage: ["lebensmittel", "gastronomie", "foodtech", "getränke", "restaurantbetrieb", "brauerei"],
  agriculture: ["landwirtschaft", "agrar", "agritech", "forstwirtschaft"],
  energy: ["energieversorg", "photovoltaik", "windkraft", "netzbetreiber", "wasserstoff", "stadtwerke"],
  sustainability: ["nachhaltigkeit", "klimaschutz", "kreislaufwirtschaft", "co2-", "esg"],
  manufacturing: ["maschinenbau", "anlagenbau", "produktionsbetrieb", "fertigungsindustrie"],
  robotics: ["robotik", "robotics", "automatisierungstechnik", "cobot"],
  electronics: ["halbleiter", "semiconductor", "leiterplatte", "sensorik", "elektronikfertigung"],
  telecommunications: ["telekommunikation", "mobilfunk", "netzausbau", "glasfaser"],
  media_publishing: ["verlag", "redaktion", "journalis", "rundfunk", "medienhaus"],
  gaming: ["spieleentwicklung", "games-branche", "esport", "game studio"],
  advertising: ["werbeagentur", "mediaagentur", "kreativagentur", "digitalagentur"],
  consulting: ["unternehmensberatung", "beratungsgesellschaft", "wirtschaftsprüf", "strategieberatung"],
  public_sector: ["öffentliche verwaltung", "behörde", "ministerium", "kommunalverwaltung", "govtech"],
  nonprofit: ["gemeinnützig", "non-profit", "nonprofit", "stiftung", "ngo"],
  legal_services: ["kanzlei", "rechtsberatung", "legal tech", "notariat"],
  tourism_hospitality: ["tourismus", "reiseveranstalter", "hotellerie", "hospitality", "veranstaltungsbranche"],
  sports: ["sportverein", "fitnessbranche", "sporttech", "profisport"],
  fashion: ["modebranche", "bekleidung", "textilindustrie", "fashion"],
  security_defense: ["verteidigung", "rüstung", "bundeswehr", "sicherheitsdienst"],
  research_academia: ["forschungsinstitut", "universität", "fraunhofer", "max-planck", "promotion"],
  chemicals: ["chemieindustrie", "werkstoff", "kunststoffverarbeitung", "chemiepark"],
};
