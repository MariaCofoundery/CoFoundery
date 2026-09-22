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
  /**
   * Eine Arbeitsweise, die in der Erzaehlung sichtbar wurde - MIT Beleg.
   *
   * SEIT DEM 22.09.2026 EIN OBJEKT statt eines blossen Satzes: Das Feld wurde
   * bis dahin ausgelesen und weggeworfen, es gab also keinen Ort dafuer und
   * niemandem fiel auf, dass nichts es stuetzte. Jetzt wird es zu einem
   * Vorschlag, den ein Mensch bestaetigt - und dann braucht es dieselbe
   * Zitatpflicht wie jeder andere Vorschlag.
   */
  strength: { statement: string; quote: string } | null;
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

  // AUSSENAUFTRITT & MODERATION, nachgetragen am 21.09.2026 - und der Grund
  // dafuer ist ein Fehler von mir: Die fuenf Bereiche sind an jenem Tag ins
  // Vokabular und in beide Sprachbundles gekommen, aber NICHT hierher. Damit
  // konnte die Erkennung sie nie vorschlagen, und nach dem ersten echten
  // Interview lautete die Rueckmeldung: "das waren wirklich nur die Hard
  // Skills". Genau so sah es aus - die Verhaltensseite war unsichtbar.
  //
  // DIESE BEGRIFFE SEHEN ANDERS AUS ALS DIE OBEN, und das ist Absicht. Die
  // fachlichen Bereiche kommen in Erzaehlungen als Fachwort vor ("Pricing",
  // "DSGVO", "Roadmap"). Verhalten kommt als TAETIGKEIT vor: Niemand sagt
  // "ich habe Facilitation gemacht", man sagt "ich habe das Gespraech
  // moderiert". Deshalb stehen hier Verben und Wendungen.
  //
  // Und weiterhin sparsam: "geredet" oder "gesprochen" allein waere
  // wertlos - das steht in jeder zweiten Antwort.
  public_speaking: [
    "vortrag", "präsentiert", "präsentation", "vor der gruppe", "vor allen",
    "auf der bühne", "pitch gehalten", "keynote", "moderiert vor", "rede",
    "elternabend", "podium", "kamera", "webinar",
  ],
  facilitation: [
    "moderiert", "moderation", "workshop geleitet", "durch die entscheidung",
    "runde geführt", "vermittelt zwischen", "retrospektive", "geleitet durch",
    "diskussion geführt",
  ],
  networking: [
    "netzwerk aufgebaut", "kontakte hergestellt", "kontakt hergestellt",
    "in verbindung gebracht", "vermittelt an", "tür geöffnet", "türen geöffnet",
    "empfehlung weitergegeben", "kennengelernt auf",
  ],
  difficult_conversations: [
    "angesprochen", "unangenehme", "unangenehm", "konflikt", "feedback gegeben",
    "kritik", "klare ansage", "schwieriges gespräch", "widerstand",
    "erwartung klargestellt", "gekündigt", "trennung",
  ],
  teaching_mentoring: [
    "eingearbeitet", "angeleitet", "erklärt", "beigebracht", "mentoring",
    "mentorin", "mentor", "ausgebildet", "schulung", "onboarding begleitet",
    "geübt mit",
  ],
};

/** Fuer den Drift-Test: die Bereiche, fuer die Begriffe hinterlegt sind. */
export const ANALYZED_AREA_IDS = Object.keys(AREA_TERMS);

const MAX_SUGGESTIONS = 3;

/**
 * Die Zuordnung selbst, ohne Drumherum.
 *
 * Herausgeloest am 19.09.2026, weil der Lebenslauf-Abgleich dieselbe Zuordnung
 * braucht - nur mit mehr Vorschlaegen, weil ein Lebenslauf mehr Stationen
 * enthaelt als eine erzaehlte Aufgabe. Zwei Begriffslisten nebeneinander waeren
 * sofort zwei Wahrheiten gewesen, die auseinanderlaufen.
 */
export function scoreAreasByTerms(text: string, limit: number): AreaSuggestion[] {
  const haystack = text.toLocaleLowerCase("de-DE");

  return Object.entries(AREA_TERMS)
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
    .slice(0, limit);
}

/**
 * Regelbasierte Analyse. Zaehlt Treffer je Bereich und gibt die staerksten
 * zurueck, jeweils mit den Begriffen, die dazu gefuehrt haben.
 *
 * Findet sie nichts, kommt eine leere Liste zurueck. Das ist der haeufige
 * Fall und wird nicht verschleiert - die Oberflaeche fragt dann nach einer
 * Zuordnung, statt eine schlechte zu behaupten.
 */
export const analyzeNarrativeWithRules: NarrativeAnalyzer = async ({ narrative }) => ({
  areas: scoreAreasByTerms(narrative, MAX_SUGGESTIONS),
  // Regeln koennen keine Staerke formulieren. Der Platz bleibt leer, bis ein
  // Sprachmodell dahinter tritt.
  strength: null,
  engine: "rules",
});
