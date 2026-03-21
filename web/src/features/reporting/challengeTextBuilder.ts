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
      title: "Wenn Wirkung ziehen soll",
      lead:
        "Schwierig wird es für dich, wenn andere stark auf Aufbau und Tragfähigkeit gehen, während du zuerst sehen willst, wo wirklich Zug entsteht.",
      effect:
        "Du verlierst dabei eher Energie, weil für dich die strategische Wirkung eines Schritts früher sichtbar ist als sein späteres Fundament.",
    },
    center: {
      title: "Wenn Richtung offen bleibt",
      lead:
        "Anstrengend wird es für dich, wenn lange offenbleibt, ob gerade Wirkung oder Aufbau Vorrang haben soll.",
      effect:
        "Du kannst beides mitdenken, aber auf Dauer kostet es Kraft, wenn diese Entscheidung immer wieder vertagt wird.",
    },
    right: {
      title: "Wenn Fundament relativ wird",
      lead:
        "Schwierig wird es für dich, wenn andere stark auf Hebel und schnelle Wirkung gehen, während du erst wissen willst, was davon wirklich trägt.",
      effect:
        "Du ziehst Entscheidungen dann eher zurück auf Belastbarkeit und Substanz, während andere schon beschleunigen wollen.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Wenn Tempo vor Grundlage geht",
      lead:
        "Schwierig wird es für dich, wenn im Team schon Tempo gefragt ist, obwohl für dich noch offene Annahmen im Raum stehen.",
      effect:
        "Du hängst dann nicht an Details, sondern daran, dass die Entscheidung für dich noch nicht sauber genug steht.",
    },
    center: {
      title: "Wenn niemand festlegt",
      lead:
        "Anstrengend wird es für dich, wenn ihr prüft, abwägt und trotzdem kein klarer Punkt gesetzt wird.",
      effect:
        "Du kannst zwischen Sorgfalt und Tempo umschalten, brauchst dafür aber ein sichtbares Signal, wann entschieden ist.",
    },
    right: {
      title: "Wenn alles offen bleibt",
      lead:
        "Schwierig wird es für dich, wenn Diskussionen weiterlaufen, obwohl für dich längst ein tragfähiger nächster Schritt da ist.",
      effect:
        "Du verlierst dabei eher Energie, weil du innerlich schon im Umsetzen bist, während andere noch kreisen.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Wenn Leitplanken fehlen",
      lead:
        "Schwierig wird es für dich, wenn andere schneller nach vorn gehen wollen und dir dafür Leitplanken oder Stop-Kriterien fehlen.",
      effect:
        "Du denkst dann nicht kleiner, sondern vor allem mit, was ein Schritt kosten kann und wer die Folgen trägt.",
    },
    center: {
      title: "Wenn Risiko anders gelesen wird",
      lead:
        "Anstrengend wird es für dich, wenn Chancen im Raum stehen, aber niemand klar sagt, welches Risiko ihr gemeinsam wirklich tragen wollt.",
      effect:
        "Du kannst Mut und Absicherung gut gegeneinander abwägen, merkst aber relativ früh, wenn das Team dafür sehr verschiedene Schwellen hat.",
    },
    right: {
      title: "Wenn Sicherheit bremst",
      lead:
        "Schwierig wird es für dich, wenn im Team zuerst Sicherheit gesucht wird und du längst eine echte Chance siehst.",
      effect:
        "Du verlierst dabei eher Energie, weil für dich ein gangbarer Schritt oft früher sichtbar ist als für vorsichtigere Mitgründer.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Wenn Eigenraum fehlt",
      lead:
        "Anstrengend wird es für dich, wenn andere viel Mitsicht und laufende Rückkopplung wollen, obwohl du gerade eigenständig arbeiten willst.",
      effect:
        "Du fühlst dich dann weniger unterstützt als eher zu dicht geführt und in vielen Schleifen festgehalten.",
    },
    center: {
      title: "Wenn Abstimmung ungeklärt bleibt",
      lead:
        "Schwierig wird es für dich, wenn unklar bleibt, wann ihr eng zusammenarbeitet und wann jeder eigenständig weitergeht.",
      effect:
        "Du kommst mit Nähe und Eigenraum zurecht, solange der Modus erkennbar ist und nicht ständig neu erraten werden muss.",
    },
    right: {
      title: "Wenn Rückkopplung fehlt",
      lead:
        "Anstrengend wird es für dich, wenn andere viel autonomer arbeiten und du wichtige Zwischenstände erst spät mitbekommst.",
      effect:
        "Dir fehlt dann weniger Kontrolle als ein gemeinsames Bild davon, wo etwas steht und wo es gerade hakt.",
    },
  },
  Commitment: {
    left: {
      title: "Wenn Einsatz hochgezogen wird",
      lead:
        "Schwierig wird es für dich, wenn im Team deutlich mehr Präsenz oder ein anderer Stellenwert des Startups still vorausgesetzt wird.",
      effect:
        "Du verlierst dann eher Energie, weil aus Zusammenarbeit schnell Erwartungsdruck wird, ohne dass darüber offen gesprochen wurde.",
    },
    center: {
      title: "Wenn Intensität unklar bleibt",
      lead:
        "Anstrengend wird es für dich, wenn niemand klar sagt, wann hoher Fokus gefragt ist und wann ein begrenzterer Modus völlig reicht.",
      effect:
        "Du kannst dein Einsatzniveau gut an die Phase anpassen, brauchst dafür aber sichtbare Erwartungen statt stiller Annahmen.",
    },
    right: {
      title: "Wenn Einsatz auseinanderläuft",
      lead:
        "Schwierig wird es für dich, wenn du das Startup klar priorisierst und andere mit einem deutlich breiteren Lebens- oder Arbeitsrahmen planen.",
      effect:
        "Du spürst diese Differenz oft nicht zuerst in Worten, sondern daran, wie unterschiedlich Verfügbarkeit und Ernst im Alltag gelebt werden.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Wenn sofort Härte erwartet wird",
      lead:
        "Anstrengend wird es für dich, wenn Spannungen im Raum stehen und andere sofortige Direktheit oder Konfrontation erwarten.",
      effect:
        "Du willst Themen nicht vermeiden, brauchst aber oft einen Moment, bevor du sie sauber aufmachst.",
    },
    center: {
      title: "Wenn Themen mitschwingen",
      lead:
        "Schwierig wird es für dich, wenn Reibung länger im Raum bleibt und niemand markiert, wann jetzt wirklich gesprochen wird.",
      effect:
        "Du kannst Timing gut steuern, doch ohne einen klaren Punkt bleibt zu lange offen, wie ernst ein Thema inzwischen ist.",
    },
    right: {
      title: "Wenn Reibung liegen bleibt",
      lead:
        "Anstrengend wird es für dich, wenn dein direktes Ansprechen auf Menschen trifft, die Konflikte lieber erst einmal liegen lassen.",
      effect:
        "Du willst Reibung lieber bearbeiten als mitschleppen, während andere noch Abstand oder Schonraum brauchen.",
    },
  },
};

const FRICTION_TAILS = {
  clear_pole: {
    direction:
      "An Weggabelungen zieht ihr dann schnell in unterschiedliche Richtungen.",
    decision_under_uncertainty:
      "Tempo wird dann leicht selbst zum Streitpunkt.",
    collaboration_under_pressure:
      "Aus kleinen Irritationen entsteht dann schnell spürbare Distanz im Alltag.",
  },
  moderate_pole_dominant: {
    direction:
      "Dadurch kippen Entscheidungen leichter in Grundsatzdebatten.",
    decision_under_uncertainty:
      "Vorangehen wird dann schnell selbst zum Verhandlungsthema.",
    collaboration_under_pressure:
      "Dann kostet schon der Arbeitsmodus mehr Energie als die Sache selbst.",
  },
  moderate_coordination_risk: {
    direction:
      "Ohne klare Festlegung bleibt Richtung schnell Verhandlungssache.",
    decision_under_uncertainty:
      "Ohne klare Markierung bleibt Diskussion schnell in Schleife.",
    collaboration_under_pressure:
      "Ohne sichtbaren Modus arbeitet ihr leicht mit verschiedenen Erwartungen.",
  },
  open_coordination_field: {
    direction:
      "Dann zieht ihr an denselben Themen mit unterschiedlichen Erwartungen.",
    decision_under_uncertainty:
      "Ohne diesen Punkt dreht sich Diskussion schnell im Kreis.",
    collaboration_under_pressure:
      "Fehlt das, arbeitet ihr eher nebeneinander als miteinander.",
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
