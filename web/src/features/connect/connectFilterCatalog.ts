/**
 * Vorschlaege fuer die Filter "Thema" und "Ort" auf der Connect-Uebersicht.
 *
 * Die Eintraege in Connect sind Freitext - jede Person schreibt ihre Themen und
 * Orte selbst. Der Katalog ist deshalb nur eine Auswahlhilfe: Die Felder nehmen
 * auch eigenen Text. Gefiltert wird immer per Textsuche ("enthaelt"), nie ueber
 * eine feste Kennung, sonst fiele jeder Eintrag durch, der "B2B-Vertrieb" statt
 * "Vertrieb" schreibt.
 */
export type TopicEntry = { label: string; terms: readonly string[] };

export const CONNECT_TOPICS: readonly TopicEntry[] = [
  { label: "Strategie & Geschäftsmodell", terms: ["strategie", "geschäftsmodell", "business model"] },
  { label: "Vertrieb", terms: ["vertrieb", "sales"] },
  { label: "Marketing & Marke", terms: ["marketing", "marke", "branding"] },
  { label: "Kundengewinnung", terms: ["kundengewinnung", "kunden", "pilotkunden", "lead"] },
  { label: "Produktentwicklung", terms: ["produktentwicklung", "produkt", "product"] },
  { label: "Software & Technik", terms: ["software", "technik", "entwicklung", "programmier", "tech"] },
  { label: "KI & Daten", terms: ["ki ", "künstliche intelligenz", "daten", "machine learning", "ai "] },
  { label: "Design & UX", terms: ["design", "ux", "nutzererfahrung"] },
  { label: "Recht & Verträge", terms: ["recht", "vertrag", "verträge", "jurist"] },
  { label: "Datenschutz", terms: ["datenschutz", "dsgvo", "privacy"] },
  { label: "Patente & Schutzrechte", terms: ["patent", "schutzrecht", "marken", "urheber"] },
  { label: "Steuern & Buchhaltung", terms: ["steuer", "buchhaltung", "buchführung"] },
  { label: "Finanzierung & Investoren", terms: ["finanzierung", "investor", "invest", "kapital", "business angel"] },
  { label: "Förderung & Zuschüsse", terms: ["förder", "zuschuss", "zuschüsse", "stipendium"] },
  { label: "Gründung & Anteile", terms: ["gründung", "anteile", "gesellschaft", "gmbh"] },
  { label: "Team & Personal", terms: ["team", "personal", "recruiting", "mitarbeit"] },
  { label: "Führung", terms: ["führung", "leadership"] },
  { label: "Operations & Prozesse", terms: ["operations", "prozess", "organisation"] },
  { label: "Einkauf & Lieferketten", terms: ["einkauf", "lieferkette", "lieferant"] },
  { label: "Produktion & Hardware", terms: ["produktion", "hardware", "fertigung"] },
  { label: "Logistik", terms: ["logistik", "versand"] },
  { label: "E-Commerce & Handel", terms: ["e-commerce", "onlinehandel", "handel", "shop"] },
  { label: "Pitch & Präsentation", terms: ["pitch", "präsentation"] },
  { label: "Netzwerk & Kontakte", terms: ["netzwerk", "kontakt", "vermittl", "intro"] },
  { label: "Mentoring & Coaching", terms: ["mentoring", "coaching", "sparring", "beratung"] },
  { label: "Community-Aufbau", terms: ["community", "gemeinschaft"] },
  { label: "Internationalisierung", terms: ["international", "export", "ausland"] },
  { label: "Nachfolge & Übernahme", terms: ["nachfolge", "übernahme", "unternehmenskauf"] },
  { label: "Forschung & Wissenschaft", terms: ["forschung", "wissenschaft", "hochschule", "universität"] },
  { label: "Nachhaltigkeit & Klima", terms: ["nachhaltig", "klima", "umwelt", "kreislauf"] },
  { label: "Energie", terms: ["energie", "solar", "wind", "wärme"] },
  { label: "Mobilität", terms: ["mobilität", "verkehr", "fahrzeug"] },
  { label: "Gesundheit & Pflege", terms: ["gesundheit", "pflege", "medizin", "health"] },
  { label: "Bildung & Weiterbildung", terms: ["bildung", "weiterbildung", "lernen", "schule"] },
  { label: "Handwerk", terms: ["handwerk", "bau", "betrieb"] },
  { label: "Industrie & Mittelstand", terms: ["industrie", "mittelstand", "maschinenbau"] },
  { label: "Immobilien & Bau", terms: ["immobilie", "bau", "wohnen"] },
  { label: "Landwirtschaft & Ernährung", terms: ["landwirtschaft", "ernährung", "food", "lebensmittel"] },
  { label: "Tourismus & Gastronomie", terms: ["tourismus", "gastronomie", "hotel", "restaurant"] },
  { label: "Finanzdienstleistungen", terms: ["fintech", "finanzdienst", "versicherung", "bank"] },
  { label: "Medien & Inhalte", terms: ["medien", "content", "video", "podcast"] },
  { label: "Soziales & Gemeinwohl", terms: ["sozial", "gemeinwohl", "ehrenamt", "non-profit"] },
  { label: "Öffentliche Hand & Verwaltung", terms: ["öffentlich", "verwaltung", "kommune", "behörde"] },
  { label: "Freelancing & Selbstständigkeit", terms: ["freelanc", "freiberuf", "selbstständig"] },
];

export type PlaceEntry = { label: string; terms: readonly string[]; kind: "region" | "state" | "city" };

/** Bundesland mit den groesseren Staedten, die in Ortsangaben typischerweise stehen. */
const STATES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["Baden-Württemberg", ["Stuttgart", "Karlsruhe", "Mannheim", "Freiburg", "Heidelberg", "Ulm", "Tübingen"]],
  ["Bayern", ["München", "Nürnberg", "Augsburg", "Regensburg", "Würzburg", "Ingolstadt", "Erlangen"]],
  ["Berlin", []],
  ["Brandenburg", ["Potsdam", "Cottbus", "Frankfurt (Oder)"]],
  ["Bremen", ["Bremerhaven"]],
  ["Hamburg", []],
  ["Hessen", ["Frankfurt", "Wiesbaden", "Darmstadt", "Kassel", "Offenbach"]],
  ["Mecklenburg-Vorpommern", ["Rostock", "Schwerin", "Greifswald"]],
  ["Niedersachsen", ["Hannover", "Braunschweig", "Oldenburg", "Osnabrück", "Göttingen"]],
  ["Nordrhein-Westfalen", ["Köln", "Düsseldorf", "Dortmund", "Essen", "Bonn", "Münster", "Aachen", "Bochum"]],
  ["Rheinland-Pfalz", ["Mainz", "Koblenz", "Trier", "Kaiserslautern"]],
  ["Saarland", ["Saarbrücken"]],
  ["Sachsen", ["Leipzig", "Dresden", "Chemnitz"]],
  ["Sachsen-Anhalt", ["Magdeburg", "Halle"]],
  ["Schleswig-Holstein", ["Kiel", "Lübeck", "Flensburg"]],
  ["Thüringen", ["Erfurt", "Jena", "Weimar"]],
];

export const CONNECT_PLACES: readonly PlaceEntry[] = [
  { label: "Deutschlandweit", terms: ["deutschland", "bundesweit", "deutschlandweit"], kind: "region" },
  { label: "DACH", terms: ["dach", "österreich", "schweiz"], kind: "region" },
  { label: "Europa", terms: ["europa", "eu"], kind: "region" },
  ...STATES.map(([state, cities]) => ({ label: state, terms: [state.toLowerCase(), ...cities.map((city) => city.toLowerCase())], kind: "state" as const })),
  // Stadtstaaten stehen oben schon als Bundesland; hier die uebrigen groesseren Staedte einzeln.
  ...STATES.flatMap(([, cities]) => cities.map((city) => ({ label: city, terms: [city.toLowerCase()], kind: "city" as const }))),
];

const norm = (value: string) => value.trim().toLowerCase();

/** Suchbegriffe fuer eine Eingabe: ein Katalogeintrag wird aufgefaltet, freier Text bleibt wie er ist. */
export function topicTerms(input: string): string[] {
  const value = norm(input);
  if (!value) return [];
  const entry = CONNECT_TOPICS.find((item) => norm(item.label) === value);
  return entry ? [...entry.terms] : [value];
}
export function placeTerms(input: string): string[] {
  const value = norm(input);
  if (!value) return [];
  const entry = CONNECT_PLACES.find((item) => norm(item.label) === value);
  return entry ? [...entry.terms] : [value];
}

/** Katalog und bereits genutzte Werte, ohne Doppelte (Gross-/Kleinschreibung egal). */
export function mergeSuggestions(catalog: readonly string[], inUse: readonly string[]) {
  const seen = new Set(catalog.map(norm));
  return [...catalog, ...inUse.filter((value) => value.trim() && !seen.has(norm(value)) && (seen.add(norm(value)), true))];
}

/** Ein Suchbegriff darf in eine PostgREST-Bedingung, ohne sie zu veraendern. */
export function safeTerm(term: string) {
  return term.replace(/[,()*%_\\":]/g, " ").replace(/\s+/g, " ").trim();
}
/** `or`-Bedingung ueber mehrere Begriffe fuer ein Textfeld; null, wenn nichts Brauchbares uebrig bleibt. */
export function orIlike(column: string, terms: readonly string[]) {
  const parts = [...new Set(terms.map(safeTerm).filter((term) => term.length >= 2))].map((term) => `${column}.ilike.*${term}*`);
  return parts.length ? parts.join(",") : null;
}
