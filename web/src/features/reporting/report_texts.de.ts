import {
  type DimensionDefinition,
  type DiffClass,
  type ReportDimension,
} from "@/features/reporting/types";

const BASE_THRESHOLDS = {
  lowMax: 2.5,
  highMin: 4.5,
} as const;

const BASE_DIFF_THRESHOLDS = {
  smallMax: 1.0,
  mediumMax: 2.0,
} as const;

export const DIMENSION_DEFINITIONS_DE: Record<ReportDimension, DimensionDefinition> = {
  Vision: {
    id: "Vision",
    name: "Vision",
    axisLeft: "Substanz",
    axisRight: "Skalierung",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "substanz-hueter",
        name: "Substanz-Hüter",
        superpower: "Du baust ein tragfähiges Fundament und schützt Unabhängigkeit.",
        caution: "Bei sehr schnellen Marktfenstern kann zu viel Absicherung Tempo kosten.",
        descriptionShort:
          "Du priorisierst ein belastbares Geschäftsmodell mit klarer Wertschöpfung, statt Wachstum um jeden Preis.",
      },
      mid: {
        id: "real-strategist",
        name: "Real-Strategist",
        superpower: "Du kombinierst Ambition mit wirtschaftlicher Vernunft.",
        caution: "In kritischen Phasen braucht es klare Prioritäten statt Mittelweg.",
        descriptionShort:
          "Du balancierst Substanz und Skalierung so, dass Wachstum möglich bleibt, ohne die operative Stabilität zu verlieren.",
      },
      high: {
        id: "unicorn-architekt",
        name: "Unicorn-Architekt",
        superpower: "Du erzeugst Momentum und denkst Marktführerschaft groß.",
        caution: "Ohne Gegengewicht kann Fundament und Kultur zu kurz kommen.",
        descriptionShort:
          "Du priorisierst schnelle Skalierung, aggressive Marktbewegung und Reichweite als strategischen Hebel.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Wachstumsmomente wollt ihr bewusst gemeinsam triggern?",
      MEDIUM: "Welche KPI entscheidet, wann ihr von Substanz auf Skalierung umschaltet?",
      LARGE: "Wo braucht ihr klare Guardrails, damit Tempo und Stabilität zusammen funktionieren?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag zeigt sich das bei Budget-, Hiring- und Priorisierungsentscheidungen mit Fokus auf langfristige Tragfähigkeit.",
      mid: "Im Alltag wirkt ihr strategisch flexibel: Ihr testet Chancen, ohne die wirtschaftliche Realität aus dem Blick zu verlieren.",
      high: "Im Alltag priorisiert ihr Time-to-Market, schnelle Iterationen und Reichweite.",
      low_high_pair:
        "Unter Druck kann eine Beschleuniger-Absicherer-Dynamik entstehen. Das ist stark, wenn ihr klare Entscheidungspfade vereinbart.",
    },
  },
  Entscheidung: {
    id: "Entscheidung",
    name: "Entscheidung",
    axisLeft: "Analyse",
    axisRight: "Tempo",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "daten-analyst",
        name: "Daten-Analyst",
        superpower: "Du minimierst Fehlentscheidungen durch Fakten und Logik.",
        caution: "Bei hohem Entscheidungsdruck drohen Verzögerungen.",
        descriptionShort: "Fundierte Entscheidungen mit hoher Nachvollziehbarkeit.",
      },
      mid: {
        id: "pragmatiker",
        name: "Pragmatiker",
        superpower: "Du triffst gute Entscheidungen mit solidem Timing.",
        caution: "Bei komplexen Weichenstellungen können Details untergehen.",
        descriptionShort: "Daten und Instinkt in balancierter Kombination.",
      },
      high: {
        id: "intuitions-treiber",
        name: "Intuitions-Treiber",
        superpower: "Du hältst das Team handlungsfähig und schnell.",
        caution: "Ohne Checkpoint können Kurswechsel unnötig teuer werden.",
        descriptionShort: "Schnelle Entscheidungen und iterative Korrektur.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Entscheidungstypen wollt ihr künftig weiter im gleichen Takt treffen?",
      MEDIUM: "Wo gilt 70%-Entscheidung, wo braucht ihr zwingend Evidenz?",
      LARGE: "Wie eskaliert ihr Entscheidungen, wenn Analyse und Tempo frontal kollidieren?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag dominieren klare Entscheidungsvorlagen, längere Abwägung und belastbare Evidenz.",
      mid: "Im Alltag entscheidet ihr zügig, mit bewusst gesetzten Analysepunkten.",
      high: "Im Alltag zählt Momentum: testen, lernen, nachschärfen.",
      low_high_pair:
        "Unter Druck kann der eine als Bremse, der andere als Beschleuniger wirken. Mit klaren Entscheidungsregeln wird daraus ein Vorteil.",
    },
  },
  Risiko: {
    id: "Risiko",
    name: "Risikoprofil",
    axisLeft: "Sicherheit",
    axisRight: "Wagnis",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "sicherheits-anker",
        name: "Sicherheits-Anker",
        superpower: "Du stabilisierst Runway und Handlungsfähigkeit in Krisen.",
        caution: "Zu viel Vorsicht kann strategische Chancen verhindern.",
        descriptionShort: "Konservativer Umgang mit Unsicherheit.",
      },
      mid: {
        id: "risiko-manager",
        name: "Risiko-Manager",
        superpower: "Du gehst kalkulierte Risiken mit Plan B.",
        caution: "In starken Marktphasen kann zu viel Absicherung Tempo kosten.",
        descriptionShort: "Wagnisse mit Sicherheitsnetz.",
      },
      high: {
        id: "high-stakes-pionier",
        name: "High-Stakes-Pionier",
        superpower: "Du nutzt Unsicherheit als strategischen Hebel.",
        caution: "Ohne finanzielle Leitplanken kann das Team überhitzen.",
        descriptionShort: "Hohe Risikobereitschaft bei großem Chancenfokus.",
      },
    },
    reflectionQuestions: {
      SMALL: "Bei welchen Risiken seid ihr bereits klar auf einer Linie?",
      MEDIUM: "Welche Risiken akzeptiert ihr nur mit definiertem Exit-Szenario?",
      LARGE: "Welche finanziellen Trigger lösen bei euch automatisch einen Strategiewechsel aus?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag zeigt sich das in Pufferplanung, konservativen Forecasts und stringenter Kostenkontrolle.",
      mid: "Im Alltag trefft ihr mutige Schritte mit klaren Sicherheitsmechanismen.",
      high: "Im Alltag priorisiert ihr Chancenfenster und aggressivere Experimente.",
      low_high_pair:
        "Unter Druck treffen Sicherheits- und Angriffslogik direkt aufeinander. Eine gemeinsame Risikomatrix verhindert Grundsatzkonflikte.",
    },
  },
  Autonomie: {
    id: "Autonomie",
    name: "Autonomie",
    axisLeft: "Synchronität",
    axisRight: "Autarkie",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "team-synchronisator",
        name: "Team-Synchronisator",
        superpower: "Du hältst Alignment und Teamenergie hoch.",
        caution: "Zu viel Abstimmung kann Deep-Work-Zeit blockieren.",
        descriptionShort: "Hohe Nähe und kurze Abstimmungszyklen.",
      },
      mid: {
        id: "kollaborations-profi",
        name: "Kollaborations-Profi",
        superpower: "Du balancierst Austausch und Eigenverantwortung.",
        caution: "In Stressphasen droht Unschärfe bei Rollen und Erwartung.",
        descriptionShort: "Flexibler Wechsel zwischen Team-Time und Fokusphasen.",
      },
      high: {
        id: "autarkie-spezialist",
        name: "Autarkie-Spezialist",
        superpower: "Du lieferst stark in eigenverantwortlichen Arbeitsmodi.",
        caution: "Ohne Check-ins kann das gemeinsame Bild auseinanderlaufen.",
        descriptionShort: "Hohe operative Freiheit und asynchrone Zusammenarbeit.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Zusammenarbeitsmuster funktionieren bei euch bereits zuverlässig?",
      MEDIUM: "Welche festen Check-ins reichen, damit Freiheit und Transparenz zusammenpassen?",
      LARGE: "Welche Mindeststruktur braucht ihr, damit Autonomie nicht zu Entkopplung wird?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag zeigt sich das in enger Taktung, häufiger Rückkopplung und hoher Erreichbarkeit.",
      mid: "Im Alltag wechselt ihr bewusst zwischen Abstimmungs- und Umsetzungsphasen.",
      high: "Im Alltag dominieren Ownership, asynchrone Übergaben und Fokusblöcke.",
      low_high_pair:
        "Unter Druck prallen Nähe- und Freiheitsbedürfnis aufeinander. Ein klarer Kommunikationsrhythmus entschärft das zuverlässig.",
    },
  },
  Verbindlichkeit: {
    id: "Verbindlichkeit",
    name: "Verbindlichkeit",
    axisLeft: "Nachhaltigkeit",
    axisRight: "Maximaler Einsatz",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "agilitaets-fan",
        name: "Agilitäts-Fan",
        superpower: "Du hältst Prioritäten flexibel und anpassungsfähig.",
        caution: "Zu viel Flexibilität kann als mangelnde Verlässlichkeit wirken.",
        descriptionShort: "Hohe Beweglichkeit bei wechselnden Prioritäten.",
      },
      mid: {
        id: "verlaesslicher-partner",
        name: "Verlässlicher Partner",
        superpower: "Du bist belastbar und in Zusagen klar.",
        caution: "Du trägst schnell zu viel, wenn Erwartungshaltung unklar bleibt.",
        descriptionShort: "Verbindlichkeit mit realistischem Leistungsmodus.",
      },
      high: {
        id: "radical-performer",
        name: "Radical Performer",
        superpower: "Du setzt auf klare Delivery und hohen Einsatz.",
        caution: "Dauerhafter Hochmodus kann Burnout-Risiko erhöhen.",
        descriptionShort: "Maximaler Leistungsanspruch und Ergebnisfokus.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Verbindlichkeitsregeln laufen bei euch bereits sauber?",
      MEDIUM: "Wie macht ihr früh sichtbar, wenn Zusagen kippen?",
      LARGE: "Welche Definition von Verbindlichkeit gilt verbindlich für beide?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag werden Deadlines eher als Orientierung mit Anpassungsfenster gelesen.",
      mid: "Im Alltag gelten Zusagen, mit proaktiver Kommunikation bei Abweichungen.",
      high: "Im Alltag dominiert ein hoher Lieferanspruch mit klarer Priorisierung.",
      low_high_pair:
        "Unter Druck entsteht schnell Frust über unterschiedliche Zusagen-Logik. Eine explizite Erwartungsvereinbarung ist hier Pflicht.",
    },
  },
  Konflikt: {
    id: "Konflikt",
    name: "Konflikt",
    axisLeft: "Diplomatie",
    axisRight: "Direktheit",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "harmonic-diplomat",
        name: "Harmonic Diplomat",
        superpower: "Du schützt psychologische Sicherheit im Team.",
        caution: "Harte Themen können zu spät adressiert werden.",
        descriptionShort: "Konflikte werden empathisch und bedacht moderiert.",
      },
      mid: {
        id: "konstruktiver-kritiker",
        name: "Konstruktiver Kritiker",
        superpower: "Du verbindest Klarheit mit Lösungsfokus.",
        caution: "In emotionalen Situationen kann Sachlichkeit kühl wirken.",
        descriptionShort: "Direktes, strukturiertes Konfliktmanagement.",
      },
      high: {
        id: "radical-honest",
        name: "Radical Honest",
        superpower: "Du klärst Spannungen schnell und klar.",
        caution: "Direktheit braucht Vertrauen, sonst wirkt sie destruktiv.",
        descriptionShort: "Offene, ungefilterte Konfrontation zur Klärung.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Konfliktregeln stärken eure Zusammenarbeit bereits heute?",
      MEDIUM: "Wie gebt ihr kritisches Feedback, ohne die Zusammenarbeit zu beschädigen?",
      LARGE: "Welche Eskalationsregel verhindert, dass Konflikte persönlich werden?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag werden Spannungen eher indirekt oder mit Verzögerung adressiert.",
      mid: "Im Alltag werden Konflikte zügig und lösungsorientiert bearbeitet.",
      high: "Im Alltag werden Reibungen direkt benannt und schnell ausgetragen.",
      low_high_pair:
        "Unter Druck treffen Schutzbedürfnis und Direktheit frontal aufeinander. Ein klarer Feedback-Rahmen macht den Unterschied.",
    },
  },
};

export const VALUES_ARCHETYPES_DE = {
  impact_idealist: {
    id: "impact_idealist",
    name: "Impact-Idealist",
    identity:
      "Deine Integrität ist dein Kompass. Du priorisierst Wirkung und ethische Klarheit auch unter Druck.",
    warning:
      "In Überlebensphasen können harte Kompromisse im Team zu Spannungen führen.",
  },
  verantwortungs_stratege: {
    id: "verantwortungs_stratege",
    name: "Verantwortungs-Stratege",
    identity:
      "Du suchst die Schnittmenge aus wirtschaftlichem Erfolg und gesellschaftlicher Verantwortung.",
    warning:
      "Wenn du zu viele Perspektiven gleichzeitig balancierst, steigt Entscheidungsdruck.",
  },
  business_pragmatiker: {
    id: "business_pragmatiker",
    name: "Business-Pragmatiker",
    identity:
      "Du priorisierst wirtschaftliche Schlagkraft und Entscheidbarkeit im Alltag.",
    warning:
      "Ohne wertebasiertes Korrektiv kann kurzfristige Effizienz langfristig Vertrauen kosten.",
  },
} as const;

export function getDiffClass(diff: number, dimension: ReportDimension): DiffClass {
  const thresholds = DIMENSION_DEFINITIONS_DE[dimension].diffThresholds;
  if (diff < thresholds.smallMax) return "SMALL";
  if (diff <= thresholds.mediumMax) return "MEDIUM";
  return "LARGE";
}
