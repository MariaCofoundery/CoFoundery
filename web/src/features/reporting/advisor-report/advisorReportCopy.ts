import type {
  AdvisorDimensionKey,
  AdvisorInterventionType,
} from "@/features/reporting/advisor-report/advisorReportTypes";

export interface AdvisorDimensionCopy {
  title: string;
  tensionRisk: {
    opposite: string;
    mixed: string;
    blindSpot: string;
    alignedExtreme: string;
  };
  strengthPotential: {
    complementary: string;
    aligned: string;
  };
  tippingPoint: {
    highRisk: string;
    mediumRisk: string;
    blindSpot: string;
  };
  moderationQuestion: {
    default: string;
  };
  observationMarkers: {
    opposite: string[];
    mixed: string[];
    blindSpot: string[];
    aligned: string[];
  };
  interventionTitle: string;
  interventionObjective: string;
  interventionPrompt: string;
  interventionType: AdvisorInterventionType;
  stabilityRationale: string;
  stabilityConstraint: string;
}

export const ADVISOR_DIMENSION_COPY: Record<AdvisorDimensionKey, AdvisorDimensionCopy> = {
  Unternehmenslogik: {
    title: "Strategische Richtung",
    tensionRisk: {
      opposite:
        "Die beiden lesen dieselbe Lage nach unterschiedlichen unternehmerischen Massstaeben. Wachstum, Hebel und Absicherung werden nicht nach derselben Logik priorisiert.",
      mixed:
        "Die strategische Richtung wirkt nicht offen gegensaetzlich, aber auch nicht selbsterklaerend deckungsgleich. Ohne feste Kriterien verschieben sich Prioritaeten situativ.",
      blindSpot:
        "Das Risiko liegt hier weniger im Gegensatz als in einer gemeinsamen Schieflage. Beide ziehen Strategie in dieselbe Richtung, ohne Gegenpruefung aus dem Team selbst.",
      alignedExtreme:
        "Die gemeinsame Richtung gibt Tempo, kann aber denselben Kurs zu schnell zum Standard machen. Damit fehlen fruehe Korrekturen.",
    },
    strengthPotential: {
      complementary:
        "Der Unterschied kann strategische Breite schaffen, wenn eine Person Hebel oeffnet und die andere Substanz absichert.",
      aligned:
        "Die gemeinsame Richtung entlastet das Team, solange Priorisierungskriterien explizit bleiben und nicht nur still mitlaufen.",
    },
    tippingPoint: {
      highRisk:
        "Kritisch wird es, wenn dieselben Ziele zwar benannt werden, aber in konkreten Priorisierungen gegeneinander laufen.",
      mediumRisk:
        "Ein Kipppunkt ist erreicht, sobald Richtungsfragen wiederholt neu bewertet werden und dadurch operative Entscheidungen haengen bleiben.",
      blindSpot:
        "Ein Kipppunkt ist erreicht, wenn beide dieselbe strategische Wette verlaengern, obwohl Markt- oder Team-Signale dagegen sprechen.",
    },
    moderationQuestion: {
      default:
        "Nach welchen Kriterien priorisiert ihr, wenn Wachstum, Wirkung und Stabilitaet nicht gleichzeitig erreichbar sind?",
    },
    observationMarkers: {
      opposite: [
        "Prioritaeten wirken abgestimmt, verschieben sich aber in Einzelfragen deutlich.",
        "Strategische Diskussionen drehen sich um Richtung, obwohl formal ueber Tempo gesprochen wird.",
      ],
      mixed: [
        "Richtungsfragen werden mehrfach neu aufgerufen, ohne dass ein klares Kriterium sichtbar wird.",
        "Operative Entscheidungen bleiben haengen, weil die strategische Leitlinie nicht stabil genug ist.",
      ],
      blindSpot: [
        "Warnsignale gegen den gemeinsamen Kurs werden spaet ernst genommen.",
        "Gegenargumente tauchen erst auf, wenn bereits Folgekosten entstanden sind.",
      ],
      aligned: [
        "Strategische Prioritaeten bleiben auch unter Druck konsistent.",
      ],
    },
    interventionTitle: "Priorisierungssystem klaeren",
    interventionObjective:
      "Die strategischen Kriterien explizit machen, nach denen Richtung, Wachstum und Absicherung geordnet werden.",
    interventionPrompt:
      "Definiert 2 bis 3 feste Kriterien, nach denen ihr strategische Zielkonflikte priorisiert.",
    interventionType: "prioritization_system",
    stabilityRationale:
      "Diese Dimension entlastet das Team derzeit, weil strategische Priorisierung nicht sichtbar gegeneinander arbeitet.",
    stabilityConstraint:
      "Stabil bleibt das nur, solange Richtungsentscheidungen nicht still ueber dieselben impliziten Annahmen laufen.",
  },
  Risikoorientierung: {
    title: "Umgang mit Risiko",
    tensionRisk: {
      opposite:
        "Dieselbe Unsicherheit wird nicht gleich gelesen. Was fuer eine Person noch vertretbar ist, wirkt fuer die andere bereits zu offen.",
      mixed:
        "Die Risikoschwelle ist nicht identisch. Ohne klare Guardrails kippt dieselbe Lage situativ zwischen Vorstoss und Bremse.",
      blindSpot:
        "Das Risiko liegt hier in gemeinsamer Unter- oder Ueberschaetzung. Beide bewegen sich in dieselbe Richtung, ohne interne Gegenkraft.",
      alignedExtreme:
        "Die gemeinsame Risikologik gibt Klarheit, kann aber Grenzwerte unscharf machen, wenn beide gleich ticken.",
    },
    strengthPotential: {
      complementary:
        "Der Unterschied kann robust sein, wenn eine Person Chancen oeffnet und die andere Belastbarkeit und Begrenzung sauber prueft.",
      aligned:
        "Eine gemeinsame Risikoschwelle entlastet Entscheidungen, solange sie nicht blind fuer Gegenindikatoren macht.",
    },
    tippingPoint: {
      highRisk:
        "Kritisch wird es, wenn Chancen- und Schadensbild auseinanderlaufen und Entscheidungen deshalb nicht dieselbe Risikopruefung durchlaufen.",
      mediumRisk:
        "Ein Kipppunkt ist erreicht, sobald dieselbe Wette fuer eine Person noch Test und fuer die andere schon Ueberzug ist.",
      blindSpot:
        "Ein Kipppunkt ist erreicht, wenn Warnzeichen erst unter Zeitdruck neu bewertet werden.",
    },
    moderationQuestion: {
      default:
        "Was ist fuer euch ein vertretbarer Test, und ab wann ist es kein Test mehr, sondern Ueberzug?",
    },
    observationMarkers: {
      opposite: [
        "Chancen- und Schadensbild driften in derselben Entscheidung auseinander.",
        "Absicherungen werden fuer die eine Seite zur Voraussetzung, fuer die andere zur Blockade.",
      ],
      mixed: [
        "Risiko wird je nach Situation mal frueh begrenzt und mal zu offen gehalten.",
        "Entscheidungen brauchen Nachverhandlungen, weil die Risikoschwelle nicht stabil genug ist.",
      ],
      blindSpot: [
        "Warnzeichen werden erst spaet als relevant behandelt.",
        "Korrekturen kommen erst, wenn bereits Zeit- oder Glaubwuerdigkeitskosten entstanden sind.",
      ],
      aligned: [
        "Das Team nutzt aehnliche Risikokriterien und kommt dadurch schneller zu klaren Guardrails.",
      ],
    },
    interventionTitle: "Risikogrenzen definieren",
    interventionObjective:
      "Gemeinsame Guardrails fuer Tests, Commitments und Eskalationsschwellen festlegen.",
    interventionPrompt:
      "Legt fest, welche Signale automatisch zu einer Neubewertung von Risiko fuehren.",
    interventionType: "risk_guardrails",
    stabilityRationale:
      "Diese Dimension traegt derzeit, weil Risiko nicht sichtbar gegeneinander ausgehandelt werden muss.",
    stabilityConstraint:
      "Tragfaehig bleibt das nur, wenn gemeinsame Risikoannahmen regelmaessig gegen reale Signale geprueft werden.",
  },
  Entscheidungslogik: {
    title: "Entscheidungsreife",
    tensionRisk: {
      opposite:
        "Die beiden haben nicht dieselbe Schwelle dafuer, wann etwas entscheidungsreif ist. Das erzeugt wiederholte Schleifen im selben Thema.",
      mixed:
        "Der Unterschied wirkt zunaechst moderat, wird aber relevant, sobald Tempo und Prueftiefe nicht explizit verteilt sind.",
      blindSpot:
        "Das Risiko liegt hier in gemeinsamer Schieflage. Beide schliessen Entscheidungen zu frueh oder halten sie zu lange offen.",
      alignedExtreme:
        "Die gleiche Entscheidungslogik beschleunigt, kann aber Gegenpruefung oder Abschlussdisziplin zu einseitig machen.",
    },
    strengthPotential: {
      complementary:
        "Der Unterschied kann produktiv sein, wenn eine Person Tempo und Urteil einbringt und die andere Prueftiefe und Gegenfragen.",
      aligned:
        "Eine aehnliche Reifeschwelle entlastet Entscheidungen, solange Korrekturen nicht aus dem Blick geraten.",
    },
    tippingPoint: {
      highRisk:
        "Kritisch wird es, wenn Entscheidungen scheinbar geschlossen sind, spaeter aber erneut geoeffnet werden.",
      mediumRisk:
        "Ein Kipppunkt ist erreicht, sobald dieselbe Entscheidung fuer eine Person fertig und fuer die andere noch offen ist.",
      blindSpot:
        "Ein Kipppunkt ist erreicht, wenn beide denselben Modus ueberziehen: zu viel Tempo oder zu viel Aufschub.",
    },
    moderationQuestion: {
      default: "Woran ist fuer euch sichtbar, dass eine Entscheidung ausreichend vorbereitet ist?",
    },
    observationMarkers: {
      opposite: [
        "Dieselbe Frage taucht nach vermeintlichem Abschluss erneut auf.",
        "Entscheidungen werden mehrfach gefuehrt, weil Reife unterschiedlich gelesen wird.",
      ],
      mixed: [
        "Vorbereitung und Abschluss sind nicht klar genug getrennt.",
        "Eine Person fordert frueher Entscheidung, die andere frueher Absicherung.",
      ],
      blindSpot: [
        "Entscheidungen werden systematisch zu frueh geschlossen oder zu lange vertagt.",
        "Korrekturen kommen wiederholt zu spaet ins Verfahren.",
      ],
      aligned: [
        "Das Team arbeitet mit einer aehnlichen Schwelle fuer Entscheidungsreife.",
      ],
    },
    interventionTitle: "Entscheidungsregeln festlegen",
    interventionObjective:
      "Klar machen, wer vorbereitet, wer widerspricht und woran Reife und Abschluss einer Entscheidung erkennbar sind.",
    interventionPrompt:
      "Definiert eine gemeinsame Reifeschwelle und einen klaren Schlusspunkt fuer Entscheidungen.",
    interventionType: "decision_rules",
    stabilityRationale:
      "Diese Dimension traegt aktuell, weil Entscheidungen nicht sichtbar an unterschiedlichen Reifeschwellen haengen.",
    stabilityConstraint:
      "Stabil bleibt das nur, wenn Tempo und Gegenpruefung auch unter Druck ausbalanciert bleiben.",
  },
  Commitment: {
    title: "Verbindlichkeit und Einsatz",
    tensionRisk: {
      opposite:
        "Die beiden verbinden mit Einsatz und Verbindlichkeit nicht automatisch dasselbe. Dadurch werden Fairness und Verantwortung unterschiedlich gelesen.",
      mixed:
        "Der Unterschied wirkt im Alltag oft klein, wird aber unter Last schnell zu einer Frage von Erwartung statt nur Verfuegbarkeit.",
      blindSpot:
        "Das Risiko liegt in gemeinsamer Schieflage. Beide normalisieren zu viel oder zu wenig Einsatz, ohne fruehe Gegensteuerung.",
      alignedExtreme:
        "Gemeinsamer hoher oder niedriger Einsatz kann entlasten, aber auch unrealistische Normalwerte setzen.",
    },
    strengthPotential: {
      complementary:
        "Der Unterschied kann tragfaehig sein, wenn hoher Zug und klare Begrenzung offen verhandelt werden.",
      aligned:
        "Eine aehnliche Commitment-Logik entlastet das Team, solange Mehrbelastung nicht still zur Pflicht wird.",
    },
    tippingPoint: {
      highRisk:
        "Kritisch wird es, wenn Einsatz moralisch statt operativ verhandelt wird.",
      mediumRisk:
        "Ein Kipppunkt ist erreicht, sobald Zusatzlast erwartet, aber nicht explizit vereinbart wird.",
      blindSpot:
        "Ein Kipppunkt ist erreicht, wenn beide dieselbe Ueber- oder Unterlast normalisieren und erst spaet korrigieren.",
    },
    moderationQuestion: {
      default: "Was ist bei euch verbindlich, und was ist freiwilliger Mehrbeitrag?",
    },
    observationMarkers: {
      opposite: [
        "Verfuegbarkeit wird implizit vorausgesetzt und spaeter als Ungleichgewicht erlebt.",
        "Zusatzlast wird von beiden unterschiedlich als normal oder ausserordentlich gelesen.",
      ],
      mixed: [
        "Ueberlast bleibt unausgesprochen, weil Erwartungen nicht sauber getrennt sind.",
        "Fairnessdebatten entstehen erst, wenn bereits Frust im System ist.",
      ],
      blindSpot: [
        "Hoher Zusatzaufwand oder zu wenig Zug bleibt zu lange unkommentiert.",
        "Verantwortung wird still zu eng oder zu weit gezogen.",
      ],
      aligned: [
        "Das Team arbeitet mit aehnlichen Erwartungen an Verbindlichkeit und Einsatz.",
      ],
    },
    interventionTitle: "Rollen und Verfuegbarkeit klaeren",
    interventionObjective:
      "Explizit machen, welches Einsatzniveau verbindlich ist und wie Verantwortung realistisch verteilt wird.",
    interventionPrompt:
      "Haltet fest, was verbindliche Verantwortung ist und wo Mehrbeitrag bewusst vereinbart werden muss.",
    interventionType: "roles_clarity",
    stabilityRationale:
      "Diese Dimension entlastet das Team derzeit, weil Einsatz und Verbindlichkeit aehnlich gelesen werden.",
    stabilityConstraint:
      "Tragfaehig bleibt das nur, wenn hohe Last nicht still in implizite Erwartungen kippt.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    title: "Arbeitsmodus und Mitsicht",
    tensionRisk: {
      opposite:
        "Die beiden haben nicht dieselbe Vorstellung davon, wie sichtbar Arbeit sein muss und wie viel Eigenraum gut funktioniert.",
      mixed:
        "Der Unterschied ist nicht maximal, erzeugt aber schnell operative Reibung, wenn Mitsicht und Eigenraum nicht explizit geregelt sind.",
      blindSpot:
        "Das Risiko liegt in gemeinsamer Schieflage. Beide setzen auf viel Eigenraum oder viel Rueckkopplung und merken die Nebenwirkungen zu spaet.",
      alignedExtreme:
        "Ein gemeinsamer Arbeitsmodus gibt Tempo oder Stabilitaet, kann aber denselben blinden Fleck im Betrieb erzeugen.",
    },
    strengthPotential: {
      complementary:
        "Der Unterschied kann produktiv sein, wenn eine Person Autonomie staerkt und die andere Mitsicht und Uebergaben stabilisiert.",
      aligned:
        "Ein aehnlicher Arbeitsmodus entlastet das Team, solange Informationsfluss und Verantwortung klar bleiben.",
    },
    tippingPoint: {
      highRisk:
        "Kritisch wird es, wenn die eine Seite Mikromanagement erlebt und die andere Blindflug.",
      mediumRisk:
        "Ein Kipppunkt ist erreicht, sobald Verantwortung doppelt liegt oder sichtbar unbesetzt bleibt.",
      blindSpot:
        "Ein Kipppunkt ist erreicht, wenn beide denselben Modus ueberziehen und dadurch Wissen oder Tempo verloren geht.",
    },
    moderationQuestion: {
      default: "Was muss gemeinsam sichtbar sein, und was darf ohne Rueckkopplung laufen?",
    },
    observationMarkers: {
      opposite: [
        "Verantwortungen sind doppelt oder ungedeckt.",
        "Der Informationsstand driftet auseinander, obwohl alle an denselben Themen arbeiten.",
      ],
      mixed: [
        "Uebergaben erzeugen Reibung, weil Mitsicht und Eigenraum nicht gleich definiert sind.",
        "Abstimmungsbedarf taucht zu spaet oder zu haeufig auf.",
      ],
      blindSpot: [
        "Zu viel Eigenraum oder zu viel Abstimmung wird erst als Problem erkannt, wenn Tempo oder Transparenz schon gelitten haben.",
        "Nebenwirkungen des gewaehlten Arbeitsmodus werden erst unter Last sichtbar.",
      ],
      aligned: [
        "Der Arbeitsmodus ist aktuell anschlussfaehig und erzeugt wenig sichtbare Reibung.",
      ],
    },
    interventionTitle: "Zusammenarbeitsregeln schaerfen",
    interventionObjective:
      "Klar machen, welche Sichtbarkeit, Abstimmung und Uebergabe fuer das Team verbindlich sind.",
    interventionPrompt:
      "Definiert sichtbar, was synchron laufen muss und wo autonome Verantwortung beginnt.",
    interventionType: "collaboration_rules",
    stabilityRationale:
      "Diese Dimension traegt derzeit, weil der Arbeitsmodus nicht sichtbar gegeneinander arbeitet.",
    stabilityConstraint:
      "Stabil bleibt das nur, wenn Uebergaben und Mitsicht auch mit wachsender Komplexitaet funktionieren.",
  },
  Konfliktstil: {
    title: "Bearbeitung von Spannung",
    tensionRisk: {
      opposite:
        "Die beiden oeffnen Spannung nicht im selben Takt und nicht in derselben Form. Schon das Ansprechen selbst kann zur Reibung werden.",
      mixed:
        "Der Unterschied wirkt im Alltag oft handhabbar, wird aber unter Druck schnell zum Thema von Timing und Form.",
      blindSpot:
        "Das Risiko liegt in gemeinsamer Schieflage. Beide gehen Spannungen zu direkt oder zu spaet an und korrigieren sich nicht selbst.",
      alignedExtreme:
        "Ein gemeinsamer Konfliktmodus schafft Klarheit oder Ruhe, kann aber denselben Eskalations- oder Verzugsfehler reproduzieren.",
    },
    strengthPotential: {
      complementary:
        "Der Unterschied kann robust sein, wenn eine Person Spannung frueh markiert und die andere sie einordnet, ohne sie zu verdraengen.",
      aligned:
        "Ein aehnlicher Konfliktstil entlastet das Team, solange Timing und Form nicht zum blinden Fleck werden.",
    },
    tippingPoint: {
      highRisk:
        "Kritisch wird es, wenn nicht mehr der Inhalt, sondern die Form der Klaerung selbst zum Konflikt wird.",
      mediumRisk:
        "Ein Kipppunkt ist erreicht, sobald fuer eine Person etwas zu frueh und fuer die andere zu spaet auf den Tisch kommt.",
      blindSpot:
        "Ein Kipppunkt ist erreicht, wenn beide denselben Konfliktmodus ueberziehen und dadurch Eskalation oder Stau erzeugen.",
    },
    moderationQuestion: {
      default: "Was muss sofort auf den Tisch, und was darf erst sortiert werden?",
    },
    observationMarkers: {
      opposite: [
        "Ein Thema kommt fuer die eine Seite zu frueh und fuer die andere zu spaet.",
        "Konflikte werden ueber Timing oder Ton gefuehrt statt ueber den eigentlichen Inhalt.",
      ],
      mixed: [
        "Spannungen werden nicht im selben Takt geoeffnet.",
        "Rueckmeldungen werden unterschiedlich schnell als klaerend oder belastend erlebt.",
      ],
      blindSpot: [
        "Spannungen werden systematisch zu hart oder zu spaet bearbeitet.",
        "Konflikte erzeugen erst Folgekosten, bevor sie sichtbar gemacht werden.",
      ],
      aligned: [
        "Spannung wird in aehnlicher Form bearbeitet und muss selten ueber das Verfahren selbst verhandelt werden.",
      ],
    },
    interventionTitle: "Konfliktregeln festlegen",
    interventionObjective:
      "Timing, Form und Eskalationsweg fuer strittige Themen explizit machen.",
    interventionPrompt:
      "Legt fest, welche Themen sofort angesprochen werden und welches Format fuer schwerere Spannung gilt.",
    interventionType: "conflict_rules",
    stabilityRationale:
      "Diese Dimension traegt derzeit, weil Spannung nicht sichtbar ueber Form und Timing eskaliert.",
    stabilityConstraint:
      "Tragfaehig bleibt das nur, wenn der gemeinsame Konfliktmodus nicht selbst zum blinden Fleck wird.",
  },
};
