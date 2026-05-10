import { EVENT_FORCED_QUESTIONS } from "@/features/events/eventQuestions";
import type {
  EventAnswer,
  EventCompareResult,
  EventComparedScale,
  EventProfile,
  EventQuestion,
  EventTensionKey,
  EventTensionSignal,
} from "@/features/events/eventTypes";

type TensionMeta = {
  label: string;
  conversationPrompt: string;
};

const TENSION_META: Record<EventTensionKey, TensionMeta> = {
  exit_horizon: {
    label: "Exit-Horizont",
    conversationPrompt: "Welche Zeitlogik wuenscht ihr euch wirklich fuer einen gemeinsamen Aufbau?",
  },
  sync_vs_autonomy: {
    label: "Abstimmung vs Autonomie",
    conversationPrompt: "Wie eng wollt ihr euch im Alltag abstimmen und wo braucht ihr bewusst Freiraum?",
  },
  speed_vs_assurance: {
    label: "Tempo vs Absicherung",
    conversationPrompt: "Wann ist schnelles Entscheiden hilfreich und wann braucht ihr mehr Absicherung?",
  },
  risk_vs_stability: {
    label: "Risiko vs Stabilitaet",
    conversationPrompt: "Wie viel Risiko fuehlt sich fuer euch gemeinsam tragfaehig an?",
  },
  roles_vs_shared: {
    label: "Rollenverteilung",
    conversationPrompt: "Welche Themen brauchen frueh klare Ownership und was wollt ihr gemeinsam tragen?",
  },
};

const SCALE_PROMPTS: Record<string, string> = {
  vision_ambition: "Was bedeutet fuer euch beide eigentlich eine ambitionierte gemeinsame Richtung?",
  tempo: "Welches Umsetzungstempo fuehlt sich fuer euch motivierend und gleichzeitig tragfaehig an?",
  risk: "Wie wollt ihr Chancen nutzen, ohne euch im Risikoempfinden zu verlieren?",
  structure_roles: "Wie frueh braucht ihr Klarheit bei Rollen und Verantwortungen?",
  sync: "Wie viel Mitsicht und Abstimmung braucht ihr, damit Zusammenarbeit leicht bleibt?",
  conflict_decision: "Wie direkt wollt ihr Spannungen ansprechen und wie schnell entscheidet ihr danach?",
};

function relationLabelForCommonGround(distance: number) {
  if (distance <= 10) return "sehr nah beieinander";
  if (distance <= 25) return "nah beieinander";
  return "ueberraschend nah";
}

function relationLabelForDifference(distance: number) {
  if (distance >= 75) return "sehr deutlich unterschiedlich";
  if (distance >= 50) return "deutlich unterschiedlich";
  return "spuerbar unterschiedlich";
}

function buildComparedScales(profileA: EventProfile, profileB: EventProfile) {
  const scalesA = new Map(profileA.scales.map((scale) => [scale.key, scale]));
  const scalesB = new Map(profileB.scales.map((scale) => [scale.key, scale]));

  return profileA.scales
    .map<EventComparedScale | null>((scaleA) => {
      const scaleB = scalesB.get(scaleA.key);
      if (!scaleB) return null;

      const distance = Math.abs(scaleA.score - scaleB.score);

      return {
        key: scaleA.key,
        label: scaleA.label,
        scoreA: scaleA.score,
        scoreB: scaleB.score,
        distance,
        relationLabel: "",
      };
    })
    .filter((entry): entry is EventComparedScale => entry != null);
}

function buildTensionSignal(question: EventQuestion, answerA: number, answerB: number): EventTensionSignal | null {
  if (question.kind !== "forced") {
    return null;
  }

  const distance = Math.abs(answerA - answerB);
  if (distance < 50) {
    return null;
  }

  const meta = TENSION_META[question.tensionKey];
  return {
    tensionKey: question.tensionKey,
    label: meta.label,
    level: distance >= 75 ? "high" : "medium",
    scoreA: answerA as EventTensionSignal["scoreA"],
    scoreB: answerB as EventTensionSignal["scoreB"],
    distance,
    conversationPrompt: meta.conversationPrompt,
  };
}

function getAnswerValue(answers: EventAnswer[], questionKey: string) {
  return answers.find((answer) => answer.questionKey === questionKey)?.answerValue ?? null;
}

function buildConversationPrompts(params: {
  differences: EventComparedScale[];
  tensionSignals: EventTensionSignal[];
}) {
  const prompts = new Set<string>();

  for (const signal of params.tensionSignals) {
    prompts.add(signal.conversationPrompt);
    if (prompts.size >= 3) {
      return Array.from(prompts);
    }
  }

  for (const scale of params.differences) {
    const prompt = SCALE_PROMPTS[scale.key];
    if (prompt) {
      prompts.add(prompt);
    }
    if (prompts.size >= 3) {
      break;
    }
  }

  return Array.from(prompts);
}

export function buildEventCompareResult(params: {
  participantAName: string;
  participantBName: string;
  profileA: EventProfile;
  profileB: EventProfile;
  answersA: EventAnswer[];
  answersB: EventAnswer[];
}): EventCompareResult {
  const comparedScales = buildComparedScales(params.profileA, params.profileB);

  const commonGround = [...comparedScales]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((entry) => ({
      ...entry,
      relationLabel: relationLabelForCommonGround(entry.distance),
    }));

  const differences = [...comparedScales]
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 3)
    .map((entry) => ({
      ...entry,
      relationLabel: relationLabelForDifference(entry.distance),
    }));

  const tensionSignals = EVENT_FORCED_QUESTIONS.map((question) => {
    const answerA = getAnswerValue(params.answersA, question.key);
    const answerB = getAnswerValue(params.answersB, question.key);
    if (answerA == null || answerB == null) {
      return null;
    }
    return buildTensionSignal(question, answerA, answerB);
  })
    .filter((entry): entry is EventTensionSignal => entry != null)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 2);

  return {
    participantAName: params.participantAName,
    participantBName: params.participantBName,
    commonGround,
    differences,
    tensionSignals,
    conversationPrompts: buildConversationPrompts({ differences, tensionSignals }),
  };
}
