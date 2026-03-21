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
    name: "Unternehmenslogik",
    axisLeft: "strategisch",
    axisRight: "aufbauend",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "substanz-hueter",
        name: "Substanz-Hüter",
        superpower: "Du sortierst Entscheidungen klar nach strategischer Wirkung und Marktlogik.",
        caution: "Wenn Aufbaufragen zu wenig Raum bekommen, wird Tragfähigkeit schnell zu spät mitgedacht.",
        descriptionShort:
          "Du priorisierst Verwertbarkeit, Wirkung und klare strategische Hebel.",
      },
      mid: {
        id: "real-strategist",
        name: "Real-Strategist",
        superpower: "Du hältst strategische Wirkung und Substanz zusammen.",
        caution: "In kritischen Phasen braucht es klare Prioritäten statt offene Doppelspur.",
        descriptionShort:
          "Du balancierst Marktchance und Aufbau so, dass beides tragfähig bleibt.",
      },
      high: {
        id: "unicorn-architekt",
        name: "Unicorn-Architekt",
        superpower: "Du baust auf Substanz, Aufbau und langfristige Tragfähigkeit.",
        caution: "Wenn strategische Hebel zu wenig Gewicht bekommen, kostet das Marktbewegung und Tempo.",
        descriptionShort:
          "Du priorisierst Aufbauqualität, Belastbarkeit und das Fundament des Unternehmens.",
      },
    },
    reflectionQuestions: {
      SMALL: "Woran wollt ihr unternehmerische Entscheidungen gemeinsam ausrichten?",
      MEDIUM: "Wann soll strategische Wirkung fuehren und wann Aufbauqualitaet?",
      LARGE: "Wo braucht ihr klare Guardrails, damit Marktchance und Tragfaehigkeit zusammen funktionieren?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag zeigt sich das daran, dass Marktchance, Verwertbarkeit und Hebel viel Gewicht bekommen.",
      mid: "Im Alltag wirkt ihr flexibel: Ihr koennt Chancen nutzen und trotzdem Aufbaufragen mitdenken.",
      high: "Im Alltag priorisiert ihr Tragfaehigkeit, Aufbauqualitaet und belastbare Substanz.",
      low_high_pair:
        "Unter Druck kann eine Marktchance-Aufbau-Dynamik entstehen. Das ist stark, wenn ihr klare Entscheidungspfade vereinbart.",
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
    name: "Zusammenarbeit im Alltag",
    axisLeft: "eng abgestimmt",
    axisRight: "eigenständig",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "team-synchronisator",
        name: "Verbundener Modus",
        superpower: "Du hältst Fortschritt, Entscheidungen und offene Punkte eng im gemeinsamen Blick.",
        caution: "Zu viel laufende Abstimmung kann Fokus und Eigenraum blockieren.",
        descriptionShort: "Enge Abstimmung und hohe Sichtbarkeit im Alltag.",
      },
      mid: {
        id: "kollaborations-profi",
        name: "Gekoppelter Modus",
        superpower: "Du kannst zwischen enger Abstimmung und Eigenraum bewusst wechseln.",
        caution: "In Stressphasen droht Unklarheit darueber, wann mehr Sichtbarkeit noetig ist.",
        descriptionShort: "Bewusster Wechsel zwischen Rueckkopplung und eigenstaendiger Umsetzung.",
      },
      high: {
        id: "autarkie-spezialist",
        name: "Eigenstaendiger Modus",
        superpower: "Du arbeitest fokussiert mit klarem Eigenraum und wenig Dauerabstimmung.",
        caution: "Ohne verlaessliche Rueckkopplung kann das gemeinsame Bild schnell auseinanderlaufen.",
        descriptionShort: "Viel Eigenraum und gezielte statt dauernde Abstimmung.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Form von Abstimmung funktioniert bei euch bereits verlaesslich?",
      MEDIUM: "Welche Check-ins reichen, damit Eigenraum und Sichtbarkeit zusammenpassen?",
      LARGE: "Welche Mindeststruktur braucht ihr, damit unterschiedliche Abstimmungsnaehe nicht zu Entkopplung fuehrt?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag zeigt sich das in enger Taktung, frueher Sichtbarkeit und kurzer Rueckkopplung.",
      mid: "Im Alltag wechselt ihr bewusst zwischen enger Abstimmung und eigenstaendigen Fokusphasen.",
      high: "Im Alltag dominieren Eigenraum, gezielte Check-ins und laenger selbststaendige Umsetzungsphasen.",
      low_high_pair:
        "Unter Druck prallen enge Abstimmung und grosser Eigenraum aufeinander. Ein klarer Kommunikationsrhythmus entschaerft das zuverlaessig.",
    },
  },
  Verbindlichkeit: {
    id: "Verbindlichkeit",
    name: "Verbindlichkeit",
    axisLeft: "integriert",
    axisRight: "priorisiert",
    thresholds: BASE_THRESHOLDS,
    diffThresholds: BASE_DIFF_THRESHOLDS,
    archetypesByZone: {
      low: {
        id: "agilitaets-fan",
        name: "Integrierter Modus",
        superpower: "Du hältst das Startup in einen breiteren Alltagsrahmen eingebettet.",
        caution: "Spannung entsteht, wenn andere deutlich mehr Verfuegbarkeit oder Priorisierung erwarten.",
        descriptionShort: "Begrenzterer Einsatzrahmen bei klarer Einbettung in andere Kontexte.",
      },
      mid: {
        id: "verlaesslicher-partner",
        name: "Abgestimmter Modus",
        superpower: "Du kannst Intensitaet situativ steuern und Erwartungen gut einordnen.",
        caution: "Reibung entsteht, wenn im Team nicht klar ist, wann mehr Fokus erwartet wird.",
        descriptionShort: "Balancierter Modus zwischen Priorisierung und begrenzterem Einsatzrahmen.",
      },
      high: {
        id: "radical-performer",
        name: "Startup-Fokus",
        superpower: "Du priorisierst das Startup klar und schaffst damit hohen Fokus im Alltag.",
        caution: "Spannung entsteht, wenn andere mit einem deutlich breiteren Rahmen planen.",
        descriptionShort: "Hoher Fokus und starke Priorisierung des Startups im Alltag.",
      },
    },
    reflectionQuestions: {
      SMALL: "Welche Erwartungen an Priorisierung und Verfuegbarkeit laufen bei euch bereits sauber?",
      MEDIUM: "Wie macht ihr frueh sichtbar, wenn sich Einsatzniveau oder Alltagsspielraum verschieben?",
      LARGE: "Welche gemeinsame Arbeitsrealitaet soll fuer euch verbindlich gelten?",
    },
    dailyPressureByZoneOrPair: {
      low: "Im Alltag bleibt das Startup wichtig, aber bewusst in einen breiteren Lebens- und Arbeitsrahmen eingebettet.",
      mid: "Im Alltag wird Intensitaet je nach Phase bewusst gesteuert und offen abgestimmt.",
      high: "Im Alltag dominiert eine klare Priorisierung des Startups bei Zeit, Energie und Aufmerksamkeit.",
      low_high_pair:
        "Unter Druck entsteht schnell Reibung über unterschiedliche Erwartungen an Priorisierung und Einsatzniveau. Eine explizite Erwartungsvereinbarung ist hier Pflicht.",
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
