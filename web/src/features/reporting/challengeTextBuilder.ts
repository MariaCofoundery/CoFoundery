import {
  buildSelfReportSelection,
  SELF_REPORT_SELECTION_DEBUG_CASES,
  type SelfReportSignal,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

export type ChallengeCard = {
  title: string;
  description: string;
};

type ChallengeEntry = {
  title: string;
  lead: string;
  effect: string;
};

type ChallengeMap = Record<FounderDimensionKey, Record<SelfReportTendencyKey, ChallengeEntry>>;

const CHALLENGE_TEXT: ChallengeMap = {
  Unternehmenslogik: {
    left: {
      title: "Wenn Fundament relativ wird",
      lead:
        "Schwierig wird es fuer dich, wenn andere stark auf Hebel und schnelle Wirkung gehen, waehrend du erst wissen willst, was davon wirklich traegt.",
      effect:
        "Du ziehst Entscheidungen dann eher auf Belastbarkeit und Substanz zurueck, waehrend andere schon beschleunigen wollen.",
    },
    center: {
      title: "Wenn Richtung offen bleibt",
      lead:
        "Anstrengend wird es fuer dich, wenn lange offenbleibt, ob gerade Aufbau oder Wirkung Vorrang haben soll.",
      effect:
        "Du kannst beides mitdenken, aber auf Dauer kostet es Kraft, wenn diese Klärung immer wieder vertagt wird.",
    },
    right: {
      title: "Wenn Wirkung ziehen soll",
      lead:
        "Schwierig wird es fuer dich, wenn du in einer Chance schon klare Wirkung siehst und andere zuerst ueber Aufbau und Tragfaehigkeit sprechen wollen.",
      effect:
        "Dann landet dieselbe Option schnell in zwei Lesarten: fuer dich als Hebel, fuer andere als Aufbaufrage.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Wenn Tempo vor Grundlage geht",
      lead:
        "Schwierig wird es fuer dich, wenn im Team schon Tempo gefragt ist, obwohl fuer dich noch offene Annahmen im Raum stehen.",
      effect:
        "Dann geht es fuer dich nicht um Details, sondern darum, dass die Entscheidung noch keine saubere Grundlage hat.",
    },
    center: {
      title: "Wenn niemand festlegt",
      lead:
        "Anstrengend wird es fuer dich, wenn ihr prueft, abwaegt und trotzdem kein klarer Punkt gesetzt wird.",
      effect:
        "Du kannst zwischen Sorgfalt und Tempo umschalten, brauchst dafuer aber ein sichtbares Signal, wann entschieden ist.",
    },
    right: {
      title: "Wenn alles offen bleibt",
      lead:
        "Schwierig wird es fuer dich, wenn Diskussionen weiterlaufen, obwohl fuer dich laengst ein tragfaehiger naechster Schritt da ist.",
      effect:
        "Du verlierst dabei eher Energie, weil du innerlich schon im Umsetzen bist, waehrend andere noch kreisen.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Wenn Leitplanken fehlen",
      lead:
        "Schwierig wird es fuer dich, wenn andere schneller nach vorn gehen wollen und dir dafuer Leitplanken oder Stop-Kriterien fehlen.",
      effect:
        "Du denkst dann nicht kleiner, sondern vor allem mit, was ein Schritt kosten kann und wer die Folgen traegt.",
    },
    center: {
      title: "Wenn Risiko anders gelesen wird",
      lead:
        "Anstrengend wird es fuer dich, wenn Chancen im Raum stehen, aber niemand klar sagt, welches Risiko ihr gemeinsam wirklich tragen wollt.",
      effect:
        "Du kannst Mut und Absicherung gut gegeneinander abwaegen, merkst aber frueh, wenn das Team dafuer sehr verschiedene Schwellen hat.",
    },
    right: {
      title: "Wenn Sicherheit bremst",
      lead:
        "Schwierig wird es fuer dich, wenn im Team zuerst Sicherheit gesucht wird und du laengst eine echte Chance siehst.",
      effect:
        "Du verlierst dabei eher Energie, weil fuer dich ein gangbarer Schritt oft frueher sichtbar ist als fuer vorsichtigere Mitgruender.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Wenn Eigenraum fehlt",
      lead:
        "Anstrengend wird es fuer dich, wenn andere viel Mitsicht und laufende Rueckkopplung wollen, obwohl du gerade autonom arbeiten willst.",
      effect:
        "Du fuehlst dich dann weniger unterstuetzt als eher zu dicht gefuehrt und in vielen Schleifen festgehalten.",
    },
    center: {
      title: "Wenn Abstimmung ungeklärt bleibt",
      lead:
        "Schwierig wird es fuer dich, wenn unklar bleibt, wann ihr eng zusammenarbeitet und wann jeder autonom weitergeht.",
      effect:
        "Du kommst mit Naehe und Eigenraum zurecht, solange der Modus erkennbar ist und nicht staendig neu erraten werden muss.",
    },
    right: {
      title: "Wenn Rückkopplung fehlt",
      lead:
        "Anstrengend wird es fuer dich, wenn andere viel autonomer arbeiten und du wichtige Zwischenstaende erst spaet mitbekommst.",
      effect:
        "Dir fehlt dann weniger Kontrolle als ein gemeinsames Bild davon, wo etwas steht und wo es gerade hakt.",
    },
  },
  Commitment: {
    left: {
      title: "Wenn Einsatz hochgezogen wird",
      lead:
        "Schwierig wird es fuer dich, wenn im Team deutlich mehr Praesenz oder ein anderer Stellenwert des Startups still vorausgesetzt wird.",
      effect:
        "Du verlierst dann eher Energie, weil aus Zusammenarbeit schnell Erwartungsdruck wird, ohne dass darueber offen gesprochen wurde.",
    },
    center: {
      title: "Wenn Intensität unklar bleibt",
      lead:
        "Anstrengend wird es fuer dich, wenn niemand klar sagt, wann hoher Fokus gefragt ist und wann ein begrenzterer Modus voellig reicht.",
      effect:
        "Du kannst dein Einsatzniveau gut an die Phase anpassen, brauchst dafuer aber sichtbare Erwartungen statt stiller Annahmen.",
    },
    right: {
      title: "Wenn Einsatz auseinanderläuft",
      lead:
        "Schwierig wird es fuer dich, wenn du das Startup klar priorisierst und andere mit einem deutlich breiteren Lebens- oder Arbeitsrahmen planen.",
      effect:
        "Du spuerst diese Differenz oft nicht zuerst in Worten, sondern daran, wie unterschiedlich Verfuegbarkeit und Fokus im Alltag gelebt werden.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Wenn sofort Härte erwartet wird",
      lead:
        "Anstrengend wird es fuer dich, wenn ein Widerspruch im Raum steht und andere sofortige Direktheit oder Konfrontation erwarten.",
      effect:
        "Du willst Themen nicht vermeiden, brauchst aber oft einen Moment, bevor du sie sauber aufmachst.",
    },
    center: {
      title: "Wenn Themen mitschwingen",
      lead:
        "Schwierig wird es fuer dich, wenn Reibung laenger stehen bleibt und niemand markiert, wann jetzt wirklich gesprochen wird.",
      effect:
        "Du kannst Timing gut steuern, doch ohne einen klaren Punkt bleibt zu lange offen, wie ernst ein Thema inzwischen ist.",
    },
    right: {
      title: "Wenn Reibung liegen bleibt",
      lead:
        "Anstrengend wird es fuer dich, wenn dein direktes Ansprechen auf Menschen trifft, die Unterschiede lieber erst einmal liegen lassen.",
      effect:
        "Du willst Reibung lieber bearbeiten als mitschleppen, waehrend andere noch Abstand oder Schonraum brauchen.",
    },
  },
};

const FRICTION_TAILS = {
  clear_pole: {
    direction:
      "Die gleiche Option wird dann schnell in zwei verschiedene Richtungen gelesen.",
    decision_under_uncertainty:
      "Eine Entscheidung wird dann leicht mehrmals aufgemacht oder vorschnell geschlossen.",
    collaboration_under_pressure:
      "Ein offener Punkt taucht dann spaeter an anderer Stelle wieder im Alltag auf.",
  },
  moderate_pole_dominant: {
    direction:
      "Dadurch werden Entscheidungen leichter zu Grundsatzfragen.",
    decision_under_uncertainty:
      "Dann wird nicht nur die Sache, sondern auch der Entscheidungszeitpunkt verhandelt.",
    collaboration_under_pressure:
      "So kostet schon die Art der Abstimmung mehr Energie als das eigentliche Thema.",
  },
  moderate_coordination_risk: {
    direction:
      "Ohne klare Festlegung bleibt offen, woran ihr die naechste Prioritaet messt.",
    decision_under_uncertainty:
      "Ohne klare Markierung bleibt eine Diskussion schnell in Schleife.",
    collaboration_under_pressure:
      "Ohne sichtbaren Modus arbeitet ihr leicht mit verschiedenen Erwartungen an denselben Prozess.",
  },
  open_coordination_field: {
    direction:
      "Dann besprecht ihr dieselben Themen mit unterschiedlichen inneren Prioritaeten.",
    decision_under_uncertainty:
      "Ohne diesen Punkt dreht sich eine Entscheidung schnell im Kreis.",
    collaboration_under_pressure:
      "Fehlt das, arbeitet ihr leicht nebeneinander statt mit einem gemeinsamen Modus.",
  },
} as const;

function resolveChallenge(signal: SelfReportSignal): ChallengeCard {
  const entry = CHALLENGE_TEXT[signal.dimension][signal.tendencyKey];
  const tail =
    FRICTION_TAILS[signal.frictionReason][signal.family];

  return {
    title: entry.title,
    description: `${entry.lead} ${entry.effect} ${tail}`,
  };
}

export function buildChallenges(challengeDimensions: SelfReportSignal[]): ChallengeCard[] {
  return challengeDimensions.slice(0, 3).map((signal) => resolveChallenge(signal));
}

export function buildChallengesFromScores(scores: SelfAlignmentReport["scoresA"]) {
  return buildChallenges(buildSelfReportSelection(scores).challengeDimensions);
}

export function buildChallengeExamples() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    challenges: buildChallengesFromScores(entry.scores),
  }));
}
