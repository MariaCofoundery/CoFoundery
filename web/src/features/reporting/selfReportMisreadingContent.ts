import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  type SelfReportSignal,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type SelfReportMisreadingBlock = {
  title: string;
  text: string;
};

type MisreadingSide = "left" | "right";
type MisreadingCopyMap = Record<FounderDimensionKey, Record<MisreadingSide, SelfReportMisreadingBlock>>;
type MisreadingLocale = AppLocale | string | null | undefined;

const MISREADING_COPY_DE: MisreadingCopyMap = {
  Unternehmenslogik: {
    left: {
      title: "Das kann nach Bremsen aussehen",
      text:
        "Andere können deinen Blick auf Aufbau und Tragfähigkeit als Vorsicht lesen. Für dich geht es meist nicht um Blockade, sondern darum, dass eine Chance den Kern nicht aufweicht.",
    },
    right: {
      title: "Das kann nach Sprung wirken",
      text:
        "Andere können deine Offenheit für eine größere Chance als zu schnellen Kurswechsel lesen. Für dich ist es eher der Versuch, echtes Potenzial nicht zu spät zu sehen.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Das kann nach Zögern wirken",
      text:
        "Wenn du noch prüfst, können andere das als Unentschlossenheit lesen. Für dich ist es eher der Punkt, an dem eine Entscheidung erst belastbar wird.",
    },
    right: {
      title: "Das kann nach zu viel Tempo wirken",
      text:
        "Wenn du früh festlegst, kann das für andere nach Sprung oder Bauchgefühl aussehen. Für dich ist der nächste Schritt dann meist schon klar genug.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Das kann nach Abstand wirken",
      text:
        "Dein Wunsch nach Eigenraum kann wie Rückzug wirken. Für dich ist es oft einfach die Arbeitsweise, in der Verantwortung wirklich trägt.",
    },
    right: {
      title: "Das kann nach Kontrollbedarf wirken",
      text:
        "Dein Wunsch nach frühen Zwischenständen kann wie Einmischung wirken. Für dich geht es meist darum, dass Arbeit nicht erst sichtbar wird, wenn sie schon festgelaufen ist.",
    },
  },
  Commitment: {
    left: {
      title: "Das kann nach Distanz wirken",
      text:
        "Wenn du deinen Rahmen hältst, können andere das als geringere Priorität lesen. Für dich heißt es meist nur, dass Verbindlichkeit realistisch bleiben muss.",
    },
    right: {
      title: "Das kann nach stiller Erwartung wirken",
      text:
        "Dein hoher Einsatz kann bei anderen den Eindruck erzeugen, dass alle denselben Modus mitgehen sollen. Auch wenn du das nicht aussprichst, wird es oft so gelesen.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Das kann nach Sicherheitsdenken wirken",
      text:
        "Andere können deine Leitplanken als Angst vor Risiko lesen. Für dich geht es meist darum, Unsicherheit nicht blind zu romantisieren.",
    },
    right: {
      title: "Das kann nach Wette wirken",
      text:
        "Andere können deine Offenheit für Unsicherheit als zu mutig lesen. Für dich ist das oft kein Leichtsinn, sondern die Bereitschaft, für eine echte Chance nicht zu früh auszusteigen.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Das kann nach Ausweichen wirken",
      text:
        "Wenn du erst sortierst, können andere das als Wegducken lesen. Für dich ist es oft der Versuch, das Thema später klarer und fairer aufzumachen.",
    },
    right: {
      title: "Das kann nach Härte wirken",
      text:
        "Wenn du Unterschiede direkt ansprichst, kann das auf andere schneller oder schärfer wirken, als du es meinst. Für dich ist es meist der kürzere Weg zu echter Klärung.",
    },
  },
};

const DEFAULT_MISREADING_DE: SelfReportMisreadingBlock = {
  title: "Das kann missverstanden werden",
  text: "Andere sehen oft zuerst das Verhalten und erst später die Logik dahinter.",
};

const MISREADING_COPY_EN: MisreadingCopyMap = {
  Unternehmenslogik: {
    left: {
      title: "This can look like slowing things down",
      text:
        "Others may read your focus on foundation and viability as caution. For you, it is usually less about blocking momentum and more about making sure an opportunity does not weaken the core.",
    },
    right: {
      title: "This can look like a sudden jump",
      text:
        "Others may read your openness to a larger opportunity as a fast change of direction. For you, it is more often an attempt to notice real potential before it is too late.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "This can look like hesitation",
      text:
        "When you are still examining the question, others may read that as indecision. For you, it is more often the point where a decision becomes solid enough to carry.",
    },
    right: {
      title: "This can look like too much speed",
      text:
        "When you commit early, others may read it as a leap or gut feeling. For you, the next step is often already clear enough to move.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "This can look like distance",
      text:
        "Your need for independent room can be read as withdrawal. For you, it is often simply the working mode in which responsibility becomes sustainable.",
    },
    right: {
      title: "This can look like a need for control",
      text:
        "Your wish for early updates can be read as interference. For you, it is usually about making sure work does not become visible only once it has already hardened.",
    },
  },
  Commitment: {
    left: {
      title: "This can look like distance from the venture",
      text:
        "When you hold your frame, others may read it as lower priority. For you, it usually means that commitment needs to stay realistic enough to hold.",
    },
    right: {
      title: "This can look like an unspoken expectation",
      text:
        "Your high level of commitment can give others the impression that everyone should move in the same mode. Even if you do not say that directly, it can be read that way.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "This can look like safety thinking",
      text:
        "Others may read your guardrails as fear of risk. For you, it is usually about not romanticizing uncertainty without understanding what it asks of the team.",
    },
    right: {
      title: "This can look like a bet",
      text:
        "Others may read your openness to uncertainty as too bold. For you, it is often not carelessness, but a willingness to stay with uncertainty for a meaningful opportunity.",
    },
  },
  Konfliktstil: {
    left: {
      title: "This can look like avoidance",
      text:
        "When you sort things first, others may read it as stepping away from the issue. For you, it is often an attempt to bring the topic back later with more clarity and fairness.",
    },
    right: {
      title: "This can look like harshness",
      text:
        "When you address differences directly, it can feel faster or sharper to others than you intend. For you, it is usually the shorter path toward real clarification.",
    },
  },
};

const DEFAULT_MISREADING_EN: SelfReportMisreadingBlock = {
  title: "This can be misread",
  text: "Others often see the behavior first and only later understand the logic behind it.",
};

function resolveMisreadingMap(locale: MisreadingLocale) {
  return normalizeLocale(locale) === "en" ? MISREADING_COPY_EN : MISREADING_COPY_DE;
}

function resolveDefaultMisreadingCopy(locale: MisreadingLocale) {
  return normalizeLocale(locale) === "en" ? DEFAULT_MISREADING_EN : DEFAULT_MISREADING_DE;
}

function resolveMisreadingSide(tendencyKey: SelfReportTendencyKey): MisreadingSide {
  return tendencyKey === "left" ? "left" : "right";
}

export function getSelfReportMisreadingCopy(
  signal: SelfReportSignal,
  locale?: MisreadingLocale
): SelfReportMisreadingBlock {
  return (
    resolveMisreadingMap(locale)[signal.dimension]?.[resolveMisreadingSide(signal.tendencyKey)] ??
    resolveDefaultMisreadingCopy(locale)
  );
}
