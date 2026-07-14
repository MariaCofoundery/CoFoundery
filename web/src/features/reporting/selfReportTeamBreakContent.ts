import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import { type SelfReportSignal } from "@/features/reporting/selfReportSelection";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type SelfReportTeamBreakBlock = {
  dimension: FounderDimensionKey;
  title: string;
  text: string;
};

type TeamBreakCopy = Omit<SelfReportTeamBreakBlock, "dimension">;
type TeamBreakCopyMap = Record<FounderDimensionKey, TeamBreakCopy>;
type TeamBreakLocale = AppLocale | string | null | undefined;

const TEAM_BREAK_COPY_DE: TeamBreakCopyMap = {
  Unternehmenslogik: {
    title: "Wenn eine Chance gut aussieht, aber den Fokus verschiebt",
    text:
      "Hier wird es haeufig schwierig, wenn eine Moeglichkeit fuer andere schon attraktiv genug ist, du aber zuerst wissen willst, was sie mit Klarheit, Aufbau oder Richtung des Unternehmens macht.",
  },
  Entscheidungslogik: {
    title: "Wenn dieselbe Entscheidung zweimal geführt wird",
    text:
      "Hier wird es haeufig schwierig, wenn eine Person innerlich schon entschieden hat und die andere noch pruefen will. Dann entsteht Spannung nicht nur an der Sache, sondern daran, ob die Entscheidung ueberhaupt schon reif ist.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    title: "Wenn Sichtbarkeit und Eigenraum unterschiedlich gelesen werden",
    text:
      "Hier wird es haeufig schwierig, wenn die eine Person laufend Einblick erwartet und die andere denkt, ein klarer Zwischenstand reiche voellig aus. Das fuehlt sich dann leicht nach Kontrolle oder nach zu spaetem Einbinden an.",
  },
  Commitment: {
    title: "Wenn Einsatz unterschiedlich ernst genommen wird",
    text:
      "Hier wird es haeufig schwierig, wenn ihr nicht nur unterschiedlich viel gebt, sondern dieses Niveau auch unterschiedlich lest. Dann werden Reaktionszeit, Verfuegbarkeit und Fokus leicht zum stillen Streitpunkt.",
  },
  Risikoorientierung: {
    title: "Wenn dieselbe Lage für euch nicht gleich riskant ist",
    text:
      "Hier wird es haeufig schwierig, wenn eine Person in einer offenen Lage noch eine vertretbare Chance sieht und die andere schon zu viel Unsicherheit spürt. Dann redet ihr scheinbar ueber denselben Schritt, aber nicht ueber dieselbe Schwelle.",
  },
  Konfliktstil: {
    title: "Wenn Unterschiede nicht im gleichen Takt geklärt werden",
    text:
      "Hier wird es haeufig schwierig, wenn eine Person etwas direkt ansprechen will und die andere erst sortieren oder den richtigen Moment abwarten moechte. Dann wird schon der Zeitpunkt der Klaerung selbst zum Konfliktfeld.",
  },
};

const DEFAULT_TEAM_BREAK_DE: TeamBreakCopy = {
  title: "Wenn Alltagserwartungen auseinanderlaufen",
  text:
    "Hier wird es haeufig schwierig, wenn im Alltag unterschiedliche Regeln gelten, ohne dass sie ausgesprochen werden.",
};

const TEAM_BREAK_COPY_EN: TeamBreakCopyMap = {
  Unternehmenslogik: {
    title: "When an opportunity looks good but shifts the focus",
    text:
      "This area can become difficult when an opportunity already feels attractive to others, while you first want to understand what it does to clarity, the build or the direction of the company.",
  },
  Entscheidungslogik: {
    title: "When the same decision is carried twice",
    text:
      "This area can become difficult when one person has internally moved toward a decision while another still wants to examine it. The tension is not only about the topic, but about whether the decision is ready yet.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    title: "When visibility and autonomy are read differently",
    text:
      "This area can become difficult when one person expects ongoing visibility and the other believes a clear checkpoint is enough. That can start to feel like control on one side or late involvement on the other.",
  },
  Commitment: {
    title: "When commitment is read differently",
    text:
      "This area can become difficult when the difference is not only how much each person gives, but how that level is interpreted. Response time, availability and focus can then become quiet pressure points.",
  },
  Risikoorientierung: {
    title: "When the same situation does not feel equally risky",
    text:
      "This area can become difficult when one person still sees a reasonable opportunity in an open situation and the other already feels too much uncertainty. You may seem to discuss the same step while using different thresholds.",
  },
  Konfliktstil: {
    title: "When differences are not clarified at the same pace",
    text:
      "This area can become difficult when one person wants to address something directly and the other first wants to sort it or wait for a better moment. The timing of clarification can then become part of the tension itself.",
  },
};

const DEFAULT_TEAM_BREAK_EN: TeamBreakCopy = {
  title: "When everyday expectations drift apart",
  text:
    "This area can become difficult when different everyday rules are operating without being made explicit.",
};

function resolveTeamBreakCopyMap(locale: TeamBreakLocale) {
  return normalizeLocale(locale) === "en" ? TEAM_BREAK_COPY_EN : TEAM_BREAK_COPY_DE;
}

function resolveDefaultTeamBreakCopy(locale: TeamBreakLocale) {
  return normalizeLocale(locale) === "en" ? DEFAULT_TEAM_BREAK_EN : DEFAULT_TEAM_BREAK_DE;
}

export function getSelfReportTeamBreakCopy(
  signal: SelfReportSignal,
  locale?: TeamBreakLocale
): SelfReportTeamBreakBlock {
  return {
    dimension: signal.dimension,
    ...(resolveTeamBreakCopyMap(locale)[signal.dimension] ?? resolveDefaultTeamBreakCopy(locale)),
  };
}
