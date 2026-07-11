import { type ReportContent } from "@/features/reporting/content/reportContent";

export const REPORT_CONTENT_DE = {
  dimensions: {
    Unternehmenslogik: {
      canonicalName: "Unternehmenslogik",
      shortLabel: "Unternehmenslogik",
      uiLeftPole: "substanzorientiert",
      reportLeftPole: "substanz & aufbauorientiert",
      centerLabel: "balanciert",
      uiRightPole: "hebelorientiert",
      reportRightPole: "chancen & hebelorientiert",
      description:
        "Beschreibt, woran unternehmerische Entscheidungen ausgerichtet werden: eher an Substanz, Aufbau und langfristiger Tragfähigkeit oder eher an Chancen, Hebeln und strategischer Reichweite.",
    },
    Entscheidungslogik: {
      canonicalName: "Entscheidungslogik",
      shortLabel: "Entscheidung",
      uiLeftPole: "analytisch",
      reportLeftPole: "analytisch abwägend",
      centerLabel: "balanciert",
      uiRightPole: "intuitiv",
      reportRightPole: "intuitiv handlungsorientiert",
      description:
        "Beschreibt, ob Entscheidungen eher ueber Analyse und Absicherung oder staerker ueber Urteil, Gespuer und direkte Einordnung getroffen werden.",
    },
    Risikoorientierung: {
      canonicalName: "Risikoorientierung",
      shortLabel: "Risiko",
      uiLeftPole: "sicherheitsorientiert",
      reportLeftPole: "sicherheitsorientiert",
      centerLabel: "balanciert",
      uiRightPole: "unsicherheitsbereit",
      reportRightPole: "unsicherheitsbereit",
      description:
        "Beschreibt, wie Risiko, Unsicherheit und Wagnis eher vorsichtig abgesichert oder staerker als vertretbare Unsicherheit eingeordnet werden.",
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      canonicalName: "Arbeitsstruktur & Zusammenarbeit",
      shortLabel: "Abstimmung",
      uiLeftPole: "autonom",
      reportLeftPole: "autonom",
      centerLabel: "balanciert",
      uiRightPole: "abgestimmt",
      reportRightPole: "abgestimmt",
      description:
        "Beschreibt, wie autonom oder eng abgestimmt jemand im Alltag mit anderen arbeiten will: eher ueber klare Zustaendigkeiten und gezielte Abstimmung oder eher ueber laufenden Austausch und ein gemeinsames Bild der Arbeit.",
    },
    Commitment: {
      canonicalName: "Commitment",
      shortLabel: "Commitment",
      uiLeftPole: "klar begrenzt",
      reportLeftPole: "klar begrenzt",
      centerLabel: "balanciert",
      uiRightPole: "hoch priorisiert",
      reportRightPole: "hoch priorisiert",
      description:
        "Beschreibt, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eine Person fuer sich und das Team erwartet.",
    },
    Konfliktstil: {
      canonicalName: "Konfliktstil",
      shortLabel: "Konflikt",
      uiLeftPole: "sortierend",
      reportLeftPole: "sortierend",
      centerLabel: "balanciert",
      uiRightPole: "direkt",
      reportRightPole: "direkt",
      description:
        "Beschreibt, wie Spannungen, Feedback und Meinungsverschiedenheiten eher erst sortiert oder unmittelbarer und direkter bearbeitet werden.",
    },
  },
  headings: {
    centralPatterns: "Zentrale Muster",
    dynamicsOverview: "Eure Dynamik im Überblick",
    executiveSummary: "Executive Summary",
    conversationPrompts: "Gesprächsimpulse",
    conversationPromptsIntro: "Gesprächsimpulse für euer nächstes Gespräch",
    nextStep: "Nächster Schritt",
    valuesFocus: "Zusatzmodul Wertefokus",
  },
  centralPatternLabels: {
    corePattern: "Kernmuster",
    everydayImpact: "Auswirkung im Alltag",
    consequence: "Konsequenz",
  },
  matchHeadlines: {
    session: "Euer Dynamik-Report ist fertig.",
    tension_led: "Ein zentrales Spannungsfeld wird bei euch früh im Alltag sichtbar.",
    complement_led: "Euer Unterschied kann euch breiter machen, wenn ihr ihn bewusst führt.",
    coordination_led: "Ihr seid nicht weit auseinander, aber auch nicht automatisch im selben Takt.",
    blind_spot_watch: "Eure Nähe wirkt tragend und braucht gerade deshalb bewusste Watchpoints.",
    alignment_led: "Ihr habt eine tragfähige Basis, aber nicht automatisch dieselben Maßstäbe.",
  },
  introSummaries: {
    session:
      "Dieser Snapshot zeigt euch eure gemeinsamen Muster, Unterschiede und Abstimmungspunkte als visuelle Momentaufnahme.",
    tension_led:
      "Die zentrale Reibung liegt weniger im Umgangston als in der Frage, woran ihr Richtung, Entscheidungen oder Zusammenarbeit bemesst.",
    complement_led:
      "Euer Unterschied ist weder automatisch Problem noch automatisch Stärke. Er wird wertvoll, wenn klar ist, wann er euch erweitert und wann er Führung braucht.",
    coordination_led:
      "Bei euch geht eher Energie in Nachziehen, Schleifen und stille Koordination als in offenen Grundsatzstreit.",
    blind_spot_watch:
      "Bei euch liegt das Risiko nicht zuerst in offenem Gegensatz, sondern in einer gemeinsamen Tendenz, die zu spät bewusst wird.",
    alignment_led:
      "Vieles ist bei euch anschlussfähig. Gerade deshalb lohnt sich ein genauer Blick darauf, wo gemeinsame Linie endet und klares Führen beginnt.",
  },
  statusLabels: {
    nah: "Nahe Basis",
    ergänzend: "Ergänzend",
    abstimmung_nötig: "Braucht Abstimmung",
    kritisch: "Kritisch",
  },
  dimensionReadings: {
    insufficientData:
      "Für diese Dimension liegen noch nicht genug Daten für eine belastbare gemeinsame Einordnung vor.",
    sharedBlindSpot:
      "Eure Positionen liegen nah beieinander. Gerade diese Nähe kann aber dazu führen, dass gemeinsame Annahmen zu lange ungeprüft bleiben.",
    kritisch:
      "Hier liegt ein deutliches Spannungsfeld. Ihr lest diese Dimension nicht automatisch aus derselben Logik heraus.",
    abstimmung_nötig:
      "Hier seid ihr nicht fundamental gegensätzlich, aber der Alltag braucht bewusste Abstimmung.",
    ergänzend:
      "Hier entsteht eine produktive Ergänzung, wenn Rollen, Timing und Entscheidungsrechte sauber geführt werden.",
    nah: "Hier zeigt sich eine tragfähige gemeinsame Linie, die euch im Alltag entlasten kann.",
  },
  dimensionBusinessMeanings: {
    Unternehmenslogik: {
      critical:
        "Wenn ihr das nicht klärt, könnt ihr am selben Unternehmen mit verschiedenen Grundlogiken arbeiten.",
      default:
        "Wenn ihr das offen lasst, können aus derselben Priorität unterschiedliche Zielbilder werden.",
    },
    Entscheidungslogik: {
      critical:
        "Ohne klare Regel könnt ihr aneinander vorbei entscheiden oder Entscheidungen unterschiedlich früh als erledigt ansehen.",
      default:
        "Wenn ihr das offen lasst, entstehen leicht Schleifen, obwohl beide schon weiter wollen.",
    },
    "Arbeitsstruktur & Zusammenarbeit": {
      critical:
        "Ohne klare Regeln wird aus Alltag leicht direkte Reibung über Sichtbarkeit, Eigenraum und Mitsicht.",
      default:
        "Wenn ihr das nicht klärt, kann sich dieselbe Zusammenarbeit für eine Person zu eng und für die andere zu lose anfühlen.",
    },
    Commitment: {
      critical:
        "Ohne klare Abmachung wird Commitment leicht zum Dauerthema über Tempo, Verfügbarkeit und Fairness.",
      default:
        "Wenn ihr das nicht klärt, entsteht leicht Frust über Tempo, Verfügbarkeit und Verantwortung.",
    },
    Risikoorientierung: {
      critical:
        "Ohne klare Leitplanke zieht leicht eine Person an, während die andere früher bremst.",
      default:
        "Wenn ihr das offen lasst, werden Chancen leicht zu früh gestoppt oder zu weit getrieben.",
    },
    Konfliktstil: {
      critical:
        "Ohne Regel dazu können Kleinigkeiten eskalieren oder zu lange unter der Oberfläche bleiben.",
      default:
        "Wenn ihr das offen lasst, fühlt sich eine Person leicht überfahren und die andere ausgebremst.",
    },
  },
  sectionLabels: {
    strength: "Eure gemeinsame Stärke",
    complement: "Wo ihr euch ergänzt",
    clarificationField: "Früh besprechen",
    possibleTensionFields: "Mögliche Spannungsfelder",
  },
  valuesLabels: {
    sharedBasis: "Gemeinsame Basis",
    differenceUnderPressure: "Unterschied unter Druck",
    guardrail: "Leitplanke",
  },
} as const satisfies ReportContent;
