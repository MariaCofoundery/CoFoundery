/**
 * Analyse der erzaehlten Aufgabe.
 *
 * Die Person erzaehlt, was sie verantwortet hat; das System ordnet zu. Sie
 * soll nicht selbst klassifizieren muessen - das hat den Blick auf
 * Arbeitsbereiche verengt, obwohl es um Staerken geht.
 *
 * Bewusst als Schnittstelle mit auswechselbarer Implementierung:
 *
 *   `rules`  kuratierte Begriffe je Bereich. Vollstaendig erklaerbar, kein
 *            Datenabfluss, passt zur bisherigen Methode des Produkts - die
 *            Modell-Dokumente betonen an vielen Stellen "regelbasiert" und
 *            "keine Blackbox". Erkennt aber keine Umschreibungen.
 *
 *   `model`  ein Sprachmodell, spaeter zuschaltbar. Erst damit lassen sich
 *            Staerken ableiten: "du bleibst an einem langen Prozess dran"
 *            steht in keiner Begriffsliste. Kostet die erste externe
 *            Abhaengigkeit und braucht eine eigene Einwilligung, weil
 *            Nutzertext das System verlaesst.
 *
 * Deshalb traegt das Ergebnis `engine` mit: Wer eine Zuordnung sieht, soll
 * wissen, woher sie kommt. Und `strength` ist vorbereitet, bleibt bei den
 * Regeln aber null - eine Auswahlliste waere soziale Erwuenschtheit ohne
 * Gegengewicht und muesste spaeter wieder weichen.
 */

export type AreaSuggestion = {
  areaId: string;
  /** Die Begriffe, die zu diesem Vorschlag gefuehrt haben. Nie eine Blackbox. */
  matchedTerms: string[];
};

export type NarrativeAnalysis = {
  areas: AreaSuggestion[];
  /** Abgeleitete Staerke. Null, solange die Regel-Engine laeuft. */
  strength: string | null;
  engine: "rules" | "model";
};

export type NarrativeAnalyzer = (input: {
  narrative: string;
  locale: string;
}) => Promise<NarrativeAnalysis>;

/**
 * Kuratierte Begriffe je Bereich, deutsch und englisch gemischt, weil Founder
 * im Deutschen ohnehin englische Fachbegriffe verwenden.
 *
 * Bewusst im Code und nicht in der Datenbank: Das sind Erkennungshilfen, keine
 * Vokabulardefinition. Die area_id muss aber mit dem Vokabular in der
 * Datenbank uebereinstimmen - ein Test prueft das gegen die Migration.
 *
 * Absichtlich sparsam. Ein Begriff gehoert nur hierher, wenn er fuer den
 * Bereich einigermassen kennzeichnend ist. "Projekt" oder "Team" waeren
 * wertlos, weil sie ueberall vorkommen.
 */
const AREA_TERMS: Record<string, string[]> = {
  customer_discovery: ["kundeninterview", "customer discovery", "nutzerinterview", "kundengespräch", "problemvalidierung"],
  user_research: ["user research", "usability", "nutzerforschung", "interviewstudie", "testnutzer"],
  market_analysis: ["marktanalyse", "wettbewerbsanalyse", "market research", "konkurrenz", "marktgröße", "benchmark"],
  target_segments: ["zielgruppe", "segmentierung", "segment", "persona", "icp"],
  industry_domain: ["branchenwissen", "domänenwissen", "fachbereich", "regulierte branche"],

  product_discovery: ["product discovery", "problem-solution", "hypothese getestet", "discovery-phase"],
  product_management: ["product management", "produktmanagement", "backlog", "roadmap gepflegt", "product owner", "priorisierung von features"],
  product_strategy: ["produktstrategie", "product strategy", "roadmap entwickelt", "produktvision"],
  ux_design: ["ux", "interface", "design system", "wireframe", "nutzerführung", "figma"],
  prototyping: ["prototyp", "prototype", "mockup", "klickdummy", "mvp gebaut"],

  business_model: ["geschäftsmodell", "business model", "erlösmodell", "revenue model"],
  pricing: ["pricing", "preismodell", "preisgestaltung", "monetarisierung", "tarif"],
  positioning: ["positionierung", "positioning", "wertversprechen", "value proposition", "messaging"],
  strategic_planning: ["strategische planung", "jahresplanung", "okr", "strategieprozess"],

  software_engineering: ["entwickelt", "programmiert", "software", "backend", "frontend", "code", "api gebaut", "deployment"],
  technical_architecture: ["architektur", "architecture", "systemdesign", "skalierung", "microservice", "infrastruktur"],
  data_analytics: ["datenanalyse", "analytics", "dashboard gebaut", "sql", "data pipeline", "kennzahlen ausgewertet"],
  ai_ml: ["machine learning", "ml-modell", "ki-modell", "llm", "training", "neural"],
  hardware_production: ["hardware", "produktion", "fertigung", "prototyping in der werkstatt", "lieferkette"],
  service_delivery: ["service delivery", "leistungserbringung", "projektauslieferung", "kundenprojekt umgesetzt"],

  b2b_sales: ["b2b", "vertrieb", "sales", "vertragsverhandlung", "enterprise-kunde", "angebot erstellt", "pipeline", "abschluss", "kaltakquise"],
  b2c_growth: ["b2c", "endkunden", "akquise", "conversion", "funnel", "onboarding-rate", "growth"],
  marketing_brand: ["marketing", "marke", "brand", "kampagne", "content", "pr", "kommunikation nach außen"],
  performance_marketing: ["performance marketing", "google ads", "meta ads", "paid", "cac", "roas", "sea"],
  partnerships: ["partnerschaft", "partnership", "kooperation", "business development", "reseller", "allianz"],
  customer_success: ["customer success", "kundenbetreuung", "retention", "churn", "support aufgebaut"],
  community: ["community", "meetup", "veranstaltung organisiert", "forum", "ambassador"],

  financial_planning: ["finanzplanung", "forecast", "budget", "liquiditätsplanung", "cashflow", "runway"],
  unit_economics: ["unit economics", "deckungsbeitrag", "marge", "ltv", "stückkosten"],
  accounting_controlling: ["buchhaltung", "controlling", "jahresabschluss", "accounting", "steuerberater"],
  fundraising: ["fundraising", "finanzierungsrunde", "pitch deck", "investorengespräch", "seed-runde", "term sheet"],
  investor_relations: ["investor relations", "investorenreporting", "gesellschafterversammlung", "board-meeting"],

  operations: ["operations", "abläufe", "logistik", "betrieb organisiert", "tagesgeschäft"],
  process_design: ["prozess", "process", "tooling", "automatisiert", "workflow eingeführt"],
  recruiting: ["recruiting", "hiring", "stellenausschreibung", "bewerbungsgespräch", "eingestellt"],
  people_management: ["geführt", "teamleitung", "mitarbeitergespräch", "people management", "disziplinarisch"],
  org_design: ["organisationsaufbau", "org design", "rollenmodell", "aufbauorganisation", "team strukturiert"],

  corporate_legal: ["gesellschaftsvertrag", "vertragsrecht", "gmbh", "beteiligungsvertrag", "agb", "legal"],
  ip: ["patent", "marke angemeldet", "ip", "schutzrecht", "trademark"],
  data_protection: ["datenschutz", "dsgvo", "gdpr", "avv", "verarbeitungsverzeichnis"],
  compliance_regulatory: ["compliance", "regulatorik", "zulassung", "aufsicht", "audit bestanden"],
  security: ["security", "informationssicherheit", "penetrationstest", "iso 27001", "zugriffskonzept"],
};

/** Fuer den Drift-Test: die Bereiche, fuer die Begriffe hinterlegt sind. */
export const ANALYZED_AREA_IDS = Object.keys(AREA_TERMS);

const MAX_SUGGESTIONS = 3;

/**
 * Regelbasierte Analyse. Zaehlt Treffer je Bereich und gibt die staerksten
 * zurueck, jeweils mit den Begriffen, die dazu gefuehrt haben.
 *
 * Findet sie nichts, kommt eine leere Liste zurueck. Das ist der haeufige
 * Fall und wird nicht verschleiert - die Oberflaeche fragt dann nach einer
 * Zuordnung, statt eine schlechte zu behaupten.
 */
export const analyzeNarrativeWithRules: NarrativeAnalyzer = async ({ narrative }) => {
  const haystack = narrative.toLocaleLowerCase("de-DE");

  const scored = Object.entries(AREA_TERMS)
    .map(([areaId, terms]) => ({
      areaId,
      matchedTerms: terms.filter((term) => haystack.includes(term)),
    }))
    .filter((candidate) => candidate.matchedTerms.length > 0)
    .sort(
      (a, b) =>
        b.matchedTerms.length - a.matchedTerms.length ||
        // Bei Gleichstand der laengere Treffer: "b2b" schlaegt nicht
        // "vertragsverhandlung", weil der spezifischere Begriff mehr ueber
        // die Taetigkeit sagt.
        Math.max(...b.matchedTerms.map((t) => t.length)) -
          Math.max(...a.matchedTerms.map((t) => t.length))
    )
    .slice(0, MAX_SUGGESTIONS);

  return {
    areas: scored,
    // Regeln koennen keine Staerke formulieren. Der Platz bleibt leer, bis ein
    // Sprachmodell dahinter tritt.
    strength: null,
    engine: "rules",
  };
};
