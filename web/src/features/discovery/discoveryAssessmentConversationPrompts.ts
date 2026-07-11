import type { DiscoveryCandidate } from "@/features/discovery/discoveryTypes";
import type { DiscoveryAssessmentSignalAvailability } from "@/features/discovery/discoveryAssessmentSignalsCore";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";
import { type AppLocale, normalizeLocale } from "@/i18n/config";

type DiscoveryAssessmentConversationPromptInput = {
  availability?: DiscoveryAssessmentSignalAvailability | null;
  ownerScores?: Partial<SelfRadarSeries> | null;
  candidateScores?: Partial<SelfRadarSeries> | null;
  maxPrompts?: number;
  locale?: string | null;
};

const DEFAULT_MAX_ASSESSMENT_PROMPTS = 2;
const MEANINGFUL_DISCOVERY_DISTANCE = 12;

const SAFE_DISCOVERY_ASSESSMENT_PROMPTS: Record<FounderDimensionKey, string> = {
  Unternehmenslogik: "Sprecht früh darüber, welche Art von Unternehmen ihr aufbauen wollt.",
  Entscheidungslogik: "Sprecht früh darüber, wie ihr Entscheidungen trefft.",
  "Arbeitsstruktur & Zusammenarbeit": "Kläre, wie viel Struktur ihr im Alltag braucht.",
  Commitment: "Kläre früh, wie verbindlich ihr Zeit investieren wollt.",
  Risikoorientierung: "Besprecht, wie ihr mit Unsicherheit und Tempo umgehen wollt.",
  Konfliktstil: "Besprecht, wie ihr Feedback früh und fair ansprechen wollt.",
};

const SAFE_DISCOVERY_ASSESSMENT_PROMPTS_BY_LOCALE: Record<
  AppLocale,
  Record<FounderDimensionKey, string>
> = {
  de: SAFE_DISCOVERY_ASSESSMENT_PROMPTS,
  en: {
    Unternehmenslogik: "Talk early about what kind of company you want to build.",
    Entscheidungslogik: "Talk early about how you make decisions.",
    "Arbeitsstruktur & Zusammenarbeit": "Clarify how much structure you need in everyday work.",
    Commitment: "Clarify early how committed you want your time investment to be.",
    Risikoorientierung: "Discuss how you want to handle uncertainty and pace.",
    Konfliktstil: "Discuss how you want to address feedback early and fairly.",
  },
};

function getAssessmentPromptLocale(locale: string | null | undefined): AppLocale {
  return normalizeLocale(locale);
}

function assessmentPromptText(dimension: FounderDimensionKey, locale: AppLocale) {
  return (
    SAFE_DISCOVERY_ASSESSMENT_PROMPTS_BY_LOCALE[locale]?.[dimension] ??
    SAFE_DISCOVERY_ASSESSMENT_PROMPTS_BY_LOCALE.de[dimension]
  );
}

function isUsableScore(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function uniqueTexts(values: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = value.trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    result.push(text);
  }

  return result;
}

export function selectDiscoveryAssessmentConversationPrompts({
  availability,
  ownerScores,
  candidateScores,
  maxPrompts = DEFAULT_MAX_ASSESSMENT_PROMPTS,
  locale,
}: DiscoveryAssessmentConversationPromptInput) {
  if (availability?.bothReady !== true || !ownerScores || !candidateScores || maxPrompts <= 0) {
    return [];
  }
  const textLocale = getAssessmentPromptLocale(locale);

  return (Object.keys(SAFE_DISCOVERY_ASSESSMENT_PROMPTS) as FounderDimensionKey[])
    .map((dimension) => {
      const ownerScore = ownerScores[dimension];
      const candidateScore = candidateScores[dimension];
      if (!isUsableScore(ownerScore) || !isUsableScore(candidateScore)) {
        return null;
      }

      return {
        dimension,
        distance: Math.abs(ownerScore - candidateScore),
        text: assessmentPromptText(dimension, textLocale),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .filter((entry) => entry.distance >= MEANINGFUL_DISCOVERY_DISTANCE)
    .sort((left, right) => right.distance - left.distance || left.dimension.localeCompare(right.dimension))
    .slice(0, maxPrompts)
    .map((entry) => entry.text);
}

export function mergeDiscoveryAssessmentConversationTopics({
  existingTopics,
  assessmentPrompts,
  maxTopics = 2,
}: {
  existingTopics: string[];
  assessmentPrompts: string[];
  maxTopics?: number;
}) {
  if (maxTopics <= 0) {
    return [];
  }
  if (assessmentPrompts.length === 0) {
    return uniqueTexts(existingTopics).slice(0, maxTopics);
  }

  const primaryExistingTopic = existingTopics[0] ? [existingTopics[0]] : [];
  return uniqueTexts([...primaryExistingTopic, ...assessmentPrompts]).slice(0, maxTopics);
}

export function appendDiscoveryAssessmentConversationPromptsToCandidates({
  candidates,
  promptsByProfileId,
}: {
  candidates: DiscoveryCandidate[];
  promptsByProfileId: Map<string, string[]>;
}) {
  return candidates.map((candidate) => {
    const assessmentPrompts = promptsByProfileId.get(candidate.profile.id) ?? [];
    if (assessmentPrompts.length === 0) {
      return candidate;
    }

    return {
      ...candidate,
      conversationTopics: mergeDiscoveryAssessmentConversationTopics({
        existingTopics: candidate.conversationTopics,
        assessmentPrompts,
      }),
    };
  });
}
