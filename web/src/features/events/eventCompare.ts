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
    conversationPrompt: "Wollt ihr eher etwas auf Jahre bauen oder reizt euch frueher Hebel mehr?",
  },
  sync_vs_autonomy: {
    label: "Abstimmung vs Autonomie",
    conversationPrompt: "Wie viel Freiheit braucht jeder von euch wirklich im Alltag?",
  },
  speed_vs_assurance: {
    label: "Tempo vs Absicherung",
    conversationPrompt: "Wann reicht euch 'lass machen' und wann braucht es einen zweiten Blick?",
  },
  risk_vs_stability: {
    label: "Risiko vs Stabilitaet",
    conversationPrompt: "Wie viel Risiko fuehlt sich fuer euch gemeinsam gut an - und ab wann wird's zu wild?",
  },
  roles_vs_shared: {
    label: "Rollenverteilung",
    conversationPrompt: "Was wuerdet ihr frueh klar aufteilen - und was auf keinen Fall?",
  },
};

const SCALE_PROMPTS: Record<string, string> = {
  vision_ambition: "Wollt ihr eher langfristig aufbauen oder frueh auf maximalen Hebel gehen?",
  tempo: "Wie schnell wollt ihr wirklich werden, ohne dass einer von euch aussteigt?",
  risk: "Wie viel Risiko fuehlt sich fuer euch gemeinsam gut an - und ab wann wird's zu wild?",
  structure_roles: "Was braucht klare Ownership - und wo wuerdet ihr euch in die Quere kommen?",
  sync: "Wie viel Freiheit braucht jeder von euch wirklich im Alltag?",
  conflict_decision: "Wie direkt wollt ihr sein, wenn etwas wirklich haengt?",
};

const COMMON_GROUND_MAX_DISTANCE = 20;
const DIFFERENCE_MIN_DISTANCE = 30;
const MAX_COMMON_GROUND_ITEMS = 3;
const MAX_DIFFERENCE_ITEMS = 3;

function relationLabelForCommonGround(distance: number) {
  if (distance <= 8) return "sehr nah beieinander";
  return "nah beieinander";
}

function relationLabelForDifference(distance: number) {
  if (distance >= 60) return "sehr deutlich unterschiedlich";
  if (distance >= 40) return "deutlich unterschiedlich";
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

  const commonGround = comparedScales
    .filter((entry) => entry.distance <= COMMON_GROUND_MAX_DISTANCE)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_COMMON_GROUND_ITEMS)
    .map((entry) => ({
      ...entry,
      relationLabel: relationLabelForCommonGround(entry.distance),
    }));

  const differences = comparedScales
    .filter((entry) => entry.distance >= DIFFERENCE_MIN_DISTANCE)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, MAX_DIFFERENCE_ITEMS)
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
    allScales: comparedScales,
    commonGround,
    differences,
    tensionSignals,
    conversationPrompts: buildConversationPrompts({ differences, tensionSignals }),
  };
}
