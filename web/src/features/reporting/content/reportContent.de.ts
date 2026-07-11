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
  statusLabels: {
    nah: "Nahe Basis",
    ergänzend: "Ergänzend",
    abstimmung_nötig: "Braucht Abstimmung",
    kritisch: "Kritisch",
  },
  sectionLabels: {
    strength: "Stärke",
    complement: "Ergänzung",
    clarificationField: "Klärungsfeld",
    possibleTensionFields: "Mögliche Spannungsfelder",
  },
} as const satisfies ReportContent;
