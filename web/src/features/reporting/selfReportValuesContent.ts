import type { SelfValuesProfile, ValuesArchetypeId } from "@/features/reporting/types";
import { normalizeLocale } from "@/i18n/config";

export type SelfReportValuesDisplayProfile = {
  primaryLabel: string;
  secondaryLabel: string | null;
  summary: string;
  insights: string[];
  watchouts: string[];
};

export type SelfReportValuesModuleStatus = "not_started" | "in_progress" | "completed";

type ValuesSignalStrength = "balanced" | "mixed" | "clear" | "dominant";

type ValuesArchetypeContent = {
  label: string;
  lead: string;
  decisionPattern: string;
  uncertaintyPattern: string;
  operatingLeverage: string;
  tensionField: string;
  counterweightLabel: string;
};

const VALUES_ARCHETYPE_CONTENT_EN: Record<ValuesArchetypeId, ValuesArchetypeContent> = {
  impact_idealist: {
    label: "Impact-oriented idealist",
    lead:
      "When decisions come under pressure, you tend to protect what still feels responsible and what you would be willing to stand for later.",
    decisionPattern:
      "You are less likely to approve a step only because it helps in the short term. Trust, impact and the line you can hold internally and externally matter visibly to you.",
    uncertaintyPattern:
      "Under uncertainty, you tend to look for a solution that can still be explained responsibly under pressure, instead of resolving a trade-off only through speed.",
    operatingLeverage:
      "Day to day, this can help you make boundaries visible early and test decisions against the side effects you are willing to accept.",
    tensionField:
      "This becomes harder when business pressure rises and you are expected to treat edge cases quickly as normal compromises.",
    counterweightLabel: "responsible impact and clear guardrails",
  },
  verantwortungs_stratege: {
    label: "Responsibility strategist",
    lead:
      "When decisions affect several groups, you tend to prioritize durability and fairness over a fast, one-sided push-through.",
    decisionPattern:
      "You often read decisions through who carries the cost, how durable the solution is and whether pressure is distributed fairly.",
    uncertaintyPattern:
      "Under uncertainty, you tend to look for a solution that can carry economically without quietly shifting side effects or pulling people along too easily.",
    operatingLeverage:
      "Day to day, this can help you turn broad values questions into concrete decision rules for the team, customers, quality and sustainability.",
    tensionField:
      "This becomes harder when speed is required while you are still trying to hold several consequences together.",
    counterweightLabel: "consequences, durability and fairness",
  },
  business_pragmatiker: {
    label: "Business pragmatist",
    lead:
      "When it matters, you tend to prioritize ability to act, leverage and business impact over long principle debates.",
    decisionPattern:
      "You are more likely to approve decisions when the direction can carry, the window is open and the step clearly moves the company forward.",
    uncertaintyPattern:
      "Under uncertainty, you tend to move with a direction that is good enough to carry, instead of resolving every trade-off first.",
    operatingLeverage:
      "Day to day, this can help you create pace, sharpen priorities and bring vague discussions back to outcome, execution and runway.",
    tensionField:
      "This becomes harder when side effects for trust, team or reputation are treated for too long as secondary issues.",
    counterweightLabel: "pace, leverage and business impact",
  },
};

const PAIRING_HINTS_EN: Record<`${ValuesArchetypeId}|${ValuesArchetypeId}`, string> = {
  "impact_idealist|impact_idealist":
    "Your answers place a fairly clear emphasis here. Under pressure, you will probably test decisions more against responsibility and long-term coherence than against short-term relief alone.",
  "impact_idealist|verantwortungs_stratege":
    "You also keep consequences and fairness strongly in view. That can make you look considered in trade-offs without becoming arbitrary.",
  "impact_idealist|business_pragmatiker":
    "You also keep an eye on what can work in everyday execution and economically. This can make decisions demanding for you, but not one-dimensional.",
  "verantwortungs_stratege|impact_idealist":
    "Guardrails and responsibility also remain visible for you. You do not only read decisions through durability, but also through whether you can still stand behind them later.",
  "verantwortungs_stratege|verantwortungs_stratege":
    "Your answers show a relatively stable emphasis here. In difficult situations, you will probably test whether decisions can carry several consequences at once.",
  "verantwortungs_stratege|business_pragmatiker":
    "You also keep an eye on what can work day to day and create business impact quickly. That can be useful, but under pressure the order of priorities may not always be obvious.",
  "business_pragmatiker|impact_idealist":
    "You also keep visible track of what can still be responsibly defended in edge cases. This means you are not only oriented toward speed, even if you usually do not want to keep trade-offs open for long.",
  "business_pragmatiker|verantwortungs_stratege":
    "You also read decisions through consequences, fairness and durability. This keeps you from defaulting to pure toughness, while still usually prioritizing ability to act under pressure.",
  "business_pragmatiker|business_pragmatiker":
    "Your answers place a fairly clear emphasis here. When pressure rises, you will probably sort decisions by what creates impact and keeps the company moving.",
};

export function getSelfReportValuesDisplayProfile(
  profile: SelfValuesProfile,
  locale?: string | null
): SelfReportValuesDisplayProfile {
  if (normalizeLocale(locale) !== "en") {
    return {
      primaryLabel: profile.primaryLabel,
      secondaryLabel: profile.secondaryLabel,
      summary: profile.summary,
      insights: profile.insights,
      watchouts: profile.watchouts,
    };
  }

  const primaryContent = VALUES_ARCHETYPE_CONTENT_EN[profile.primaryArchetypeId];
  const secondaryContent = profile.secondaryArchetypeId
    ? VALUES_ARCHETYPE_CONTENT_EN[profile.secondaryArchetypeId]
    : null;
  const signalStrength = classifySignalStrength(
    profile.clusterScores,
    profile.primaryArchetypeId,
    profile.secondaryArchetypeId
  );

  return {
    primaryLabel: primaryContent.label,
    secondaryLabel: secondaryContent?.label ?? null,
    summary: buildSummary(primaryContent, secondaryContent, profile.primaryArchetypeId, profile.secondaryArchetypeId, signalStrength).join(" "),
    insights: buildInsights(primaryContent, secondaryContent, signalStrength),
    watchouts: buildWatchouts(primaryContent, secondaryContent, signalStrength),
  };
}

export function getSelfReportValuesFallbackText(
  status: SelfReportValuesModuleStatus,
  preview: string | null | undefined,
  locale?: string | null
) {
  const trimmedPreview = preview?.trim() ?? "";

  if (normalizeLocale(locale) !== "en") {
    return trimmedPreview || "Schließe das Werte-Add-on ab, um eine verdichtete Werte-Einordnung zu erhalten.";
  }

  switch (status) {
    case "completed":
      return "Your values profile is complete. The interpretation can be derived from your latest answers.";
    case "in_progress":
      return "Your values profile is in progress. Submit the add-on to see a fuller interpretation.";
    case "not_started":
    default:
      return "The values add-on is optional. Once you complete it, you will receive a deeper values interpretation.";
  }
}

function classifySignalStrength(
  clusterScores: Record<ValuesArchetypeId, number>,
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null
): ValuesSignalStrength {
  const orderedScores = (Object.keys(VALUES_ARCHETYPE_CONTENT_EN) as ValuesArchetypeId[])
    .map((archetypeId) => clusterScores[archetypeId] ?? 0)
    .sort((a, b) => b - a);
  const top = orderedScores[0] ?? 0;
  const second = orderedScores[1] ?? 0;
  const third = orderedScores[2] ?? 0;
  const gap = round(top - second);
  const spread = round(top - third);

  if (spread <= 0.35) return "balanced";
  if (secondaryArchetypeId && gap <= 0.45) return "mixed";
  if (gap >= 0.8) return "dominant";
  return "clear";
}

function buildSummary(
  primary: ValuesArchetypeContent,
  secondary: ValuesArchetypeContent | null,
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null,
  signalStrength: ValuesSignalStrength
) {
  switch (signalStrength) {
    case "balanced":
      return [
        `Your answers do not point to one hard emphasis. Depending on the situation, you sort decisions differently: sometimes more through ${primary.counterweightLabel}, sometimes more through ${secondary?.counterweightLabel ?? "other consequences and side effects"}.`,
        "That does not make the profile arbitrary, but it also does not lock you into one fixed line.",
      ];
    case "mixed":
      return [
        `You seem most drawn to decisions where ${primary.counterweightLabel} matter first. At the same time, you do not lose sight of ${secondary?.counterweightLabel ?? "a second, noticeable perspective"}.`,
        pairingHint(primaryArchetypeId, secondaryArchetypeId),
      ];
    case "dominant":
      return [
        primary.lead,
        "You do not ignore other considerations, but under pressure you usually place them behind this pull first.",
      ];
    case "clear":
    default:
      return [
        primary.lead,
        secondary
          ? `At the same time, you still visibly consider what ${secondary.counterweightLabel} mean for a decision.`
          : pairingHint(primaryArchetypeId, secondaryArchetypeId),
      ];
  }
}

function buildInsights(
  primary: ValuesArchetypeContent,
  secondary: ValuesArchetypeContent | null,
  signalStrength: ValuesSignalStrength
) {
  const first = primary.decisionPattern;

  if (signalStrength === "balanced") {
    return [
      first,
      `Depending on the situation, the same decision can tilt differently for you: sometimes toward ${primary.counterweightLabel}, sometimes more toward ${secondary?.counterweightLabel ?? "a second perspective"}.`,
      "It helps to briefly name what should count first before important decisions.",
    ];
  }

  if (signalStrength === "mixed") {
    return [
      first,
      `Especially in tight situations, you may notice that ${secondary?.counterweightLabel ?? "a second perspective"} also plays a role for you. This can make decisions more nuanced, but not automatically easier.`,
      "It helps to briefly write down what should count first before sensitive decisions.",
    ];
  }

  return [first, primary.uncertaintyPattern, primary.operatingLeverage];
}

function buildWatchouts(
  primary: ValuesArchetypeContent,
  secondary: ValuesArchetypeContent | null,
  signalStrength: ValuesSignalStrength
) {
  if (signalStrength === "balanced") {
    return [
      "It can become difficult when you prioritize differently from one situation to the next, but the team reads this as one fixed line in you.",
      "For decisions under time pressure, it helps to make the order of your priorities visible early.",
    ];
  }

  if (signalStrength === "mixed") {
    return [
      "The critical point is less the individual priorities than their order. Under pressure, it should be clear what counts first for you if there is a trade-off.",
      secondary
        ? `Otherwise it can quickly look as if ${secondary.counterweightLabel} matter, but only at the edge of the decision.`
        : "Otherwise it can become hard for others to read what you are ultimately using to decide.",
    ];
  }

  return [
    primary.tensionField,
    secondary
      ? `Under pressure, it is also worth making visible early how strongly ${secondary.counterweightLabel} still matter to you.`
      : "Under pressure, it helps to name your own line early, before others only see the outcome of your decision.",
  ];
}

function pairingHint(
  primaryArchetypeId: ValuesArchetypeId,
  secondaryArchetypeId: ValuesArchetypeId | null
) {
  if (!secondaryArchetypeId) {
    return "Your profile currently places a relatively clear emphasis on what you tend to use first when making decisions.";
  }

  return PAIRING_HINTS_EN[`${primaryArchetypeId}|${secondaryArchetypeId}`];
}

function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
