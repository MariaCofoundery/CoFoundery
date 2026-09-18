import { CANONICAL_TO_DIMENSION_ID } from "@/features/scoring/founderCompatibilityScoringV2";
import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";

/**
 * Der konkrete Befund hinter einer Dimension - in beiden Sprachen.
 *
 * WARUM DIESE TEXTE HIER LIEGEN UND NICHT IM SCORING:
 *
 *   Bis 18.09.2026 standen sie als deutsche Konstanten im Scoring-Modul
 *   (DIMENSION_STRENGTH_TEXT und Geschwister). `toInsight` baute daraus einen
 *   fertigen deutschen `title`, der so in den gespeicherten Report wanderte.
 *   Die englische Fassung liess ihn deshalb in vier Saetzen weg - ein
 *   deutscher Halbsatz mitten im englischen Text waere schlimmer gewesen als
 *   der fehlende Zusatz. Der englische Report war damit an genau diesen
 *   Stellen weniger konkret als der deutsche.
 *
 *   Prosa gehoert nicht ins Scoring. Sie liegt jetzt hier, und der Titel wird
 *   beim ANZEIGEN gebildet - aus Angaben, die das Scoring ohnehin liefert und
 *   die sprachneutral sind: Dimension, Art des Befunds, gemeinsame Lage und
 *   Konfliktrisiko.
 *
 * WARUM DAS AUCH FUER ALTE REPORTS GILT:
 *   Genau diese Angaben stehen in `founderScoring.dimensions` und damit in
 *   jedem gespeicherten Payload. Es muss also nichts neu gerechnet und nichts
 *   nachgetragen werden.
 *
 * Das Scoring bleibt unveraendert. Es traegt seine deutschen Texte weiter in
 * `collaborationStrengths` und Geschwistern - nur liest sie im Report
 * niemand mehr.
 */

export const INSIGHT_DIMENSIONS = [
  "company_logic",
  "decision_logic",
  "work_structure",
  "commitment",
  "risk_orientation",
  "conflict_style",
] as const;

export type InsightDimension = (typeof INSIGHT_DIMENSIONS)[number];
export type InsightKind = "strength" | "complementary_dynamic" | "tension";

type LocalizedTitles = {
  strength: Record<InsightDimension, string>;
  complementary: Partial<Record<InsightDimension, string>>;
  complementaryFallback: string;
  sharedPosition: Record<InsightDimension, { BOTH_HIGH: string; BOTH_LOW: string }>;
  tension: Record<InsightDimension, { medium: string; high: string }>;
};

const DE: LocalizedTitles = {
  strength: {
    company_logic:
      "Eure Unternehmenslogik liegt nah genug beieinander, dass strategische Prioritäten auf einer ähnlichen Grundannahme aufbauen können.",
    decision_logic:
      "Ihr lest Entscheidungsreife ähnlich, was Tempo, Prüftiefe und Verantwortungsverteilung leichter anschlussfähig macht.",
    work_structure:
      "Ihr braucht ähnlich viel Mitsicht und Abstimmung, was den Arbeitsalltag leichter koordinierbar macht.",
    commitment:
      "Eure Erwartungen an Priorisierung, Verfügbarkeit und Einsatzniveau liegen auf einer ähnlichen Arbeitsrealität.",
    risk_orientation:
      "Ihr bewertet Unsicherheit ähnlich, was gemeinsame Leitplanken bei Chancen und Risiken erleichtert.",
    conflict_style:
      "Ihr sprecht Unterschiede in einem ähnlichen Rhythmus und mit ähnlicher Direktheit an.",
  },
  complementary: {
    company_logic:
      "Unterschiede in der Unternehmenslogik können produktiv bleiben, wenn euer Commitment im Alltag stabil genug auf derselben Basis steht.",
    decision_logic:
      "Unterschiede in der Entscheidungslogik können produktiv sein, wenn klar ist, wann ihr weiter prüft und wann eine Richtung als tragfähig gilt.",
    risk_orientation:
      "Unterschiede in der Risikoorientierung können sich gut ergänzen, wenn eine Person öffnet und die andere klare Leitplanken setzt.",
  },
  complementaryFallback:
    "Diese Unterschiede können produktiv sein, wenn ihr sie bewusst führt.",
  sharedPosition: {
    company_logic: {
      BOTH_HIGH:
        "Ihr schaut beide eher nach vorne, Hebel und Bewegung. Das schafft Zug, braucht aber eine bewusste Gegenkraft gegen opportunistische Richtungswechsel.",
      BOTH_LOW:
        "Ihr schaut beide eher auf Substanz und Absicherung. Das kann tragen, braucht aber Schutz davor, dass Chancen zu spät geöffnet werden.",
    },
    decision_logic: {
      BOTH_HIGH:
        "Ihr seid beide eher bereit, mit begrenzterer Klarheit zu entscheiden. Das beschleunigt, kann aber dieselbe Lücke für euch beide unsichtbar machen.",
      BOTH_LOW:
        "Ihr wollt beide eher mehr Reife vor einer Entscheidung. Das schafft Sorgfalt, kann aber dieselbe Entscheidung zu lange offen halten.",
    },
    work_structure: {
      BOTH_HIGH:
        "Ihr gebt beide eher viel Eigenraum und Tempo. Das kann effizient sein, braucht aber klare Sichtbarkeit, damit Themen nicht still auseinanderlaufen.",
      BOTH_LOW:
        "Ihr wollt beide eher viel Mitsicht und Rückkopplung. Das schafft Sicherheit, kann aber Tempo und Eigenverantwortung unnötig verengen.",
    },
    commitment: {
      BOTH_HIGH:
        "Ihr bringt beide sehr viel Einsatz hinein. Das wirkt stark, braucht aber klare Grenzen gegen stille Überlast und gegenseitige Selbstverständlichkeitslogik.",
      BOTH_LOW:
        "Ihr bringt beide einen begrenzteren oder realistisch engeren Einsatzrahmen mit. Das kann tragbar sein, braucht aber explizite Erwartungen an Verbindlichkeit und Priorisierung.",
    },
    risk_orientation: {
      BOTH_HIGH:
        "Ihr seid beide eher bereit, Wetten zu gehen. Das öffnet Chancen, braucht aber klare Schwellen dafür, wann Absicherung Vorrang bekommt.",
      BOTH_LOW:
        "Ihr seid beide eher vorsichtig. Das schützt vor unnötiger Exposition, kann aber gemeinsam zu spätes Handeln erzeugen.",
    },
    conflict_style: {
      BOTH_HIGH:
        "Ihr sprecht Spannung beide eher direkt an. Das kann klärend sein, braucht aber Leitplanken gegen Eskalation aus Zug heraus.",
      BOTH_LOW:
        "Ihr sprecht Spannung beide eher später oder vorsichtiger an. Das hält Gespräche ruhig, kann aber Konflikte zu lange unter der Oberfläche halten.",
    },
  },
  tension: {
    company_logic: {
      medium:
        "Dieselbe unternehmerische Option wird nicht automatisch an denselben Maßstäben gelesen.",
      high: "Marktchance, Hebel und tragfähiger Aufbau werden so unterschiedlich gewichtet, dass Richtungsfragen schnell zu Grundsatzfragen werden.",
    },
    decision_logic: {
      medium:
        "Eine Person sieht einen nächsten Schritt, während die andere noch Klärungsbedarf in derselben Entscheidung sieht.",
      high: "Entscheidungen können mehrfach auf den Tisch kommen, weil für eine Person noch geprüft wird, während die andere innerlich schon entschieden hat.",
    },
    work_structure: {
      medium:
        "Eine Person erwartet frühere Mitsicht, während die andere lieber eigenständig bis zu einem belastbaren Stand arbeitet.",
      high: "Im Alltag kollidieren Erwartungen an Sichtbarkeit, Zwischenstände und Abstimmungsdichte direkt miteinander.",
    },
    commitment: {
      medium:
        "Priorisierung und Verfügbarkeit werden nicht automatisch im gleichen Rahmen erwartet.",
      high: "Eine Person richtet ihr Leben deutlich stärker um das Startup aus als die andere, was schnell als Ungleichgewicht erlebt wird.",
    },
    risk_orientation: {
      medium: "Dieselbe Unsicherheit wird von euch nicht mit derselben Komfortzone gelesen.",
      high: "Ein Schritt, der für eine Person als vertretbare Wette gilt, wirkt für die andere wie unnötige Exposition.",
    },
    conflict_style: {
      medium:
        "Der gleiche Widerspruch wird unterschiedlich früh und unterschiedlich direkt angesprochen.",
      high: "Missverständnisse entstehen nicht nur am Thema, sondern an der Art, wie Unterschiede angesprochen oder liegen gelassen werden.",
    },
  },
};

const EN: LocalizedTitles = {
  strength: {
    company_logic:
      "Your views on how a company should work sit close enough together that strategic priorities can build on a shared assumption.",
    decision_logic:
      "You read decision readiness in similar terms, which makes pace, depth of scrutiny and the division of responsibility easier to align.",
    work_structure:
      "You need a similar amount of visibility and coordination, which makes the working week easier to organise together.",
    commitment:
      "Your expectations around priorities, availability and how much you put in rest on a similar working reality.",
    risk_orientation:
      "You weigh uncertainty in similar ways, which makes shared guardrails for opportunities and risks easier to agree on.",
    conflict_style:
      "You raise differences at a similar point and with a similar degree of directness.",
  },
  complementary: {
    company_logic:
      "Differences in how you think about the company can stay productive as long as your day-to-day commitment rests on the same footing.",
    decision_logic:
      "Differences in how you decide can be productive as long as it is clear when you keep testing and when a direction counts as settled.",
    risk_orientation:
      "Differences in risk appetite can complement each other well when one of you opens things up and the other sets clear guardrails.",
  },
  complementaryFallback:
    "These differences can be productive as long as you handle them deliberately.",
  sharedPosition: {
    company_logic: {
      BOTH_HIGH:
        "You both look ahead, towards leverage and momentum. That creates pull, but it needs a deliberate counterweight against opportunistic changes of direction.",
      BOTH_LOW:
        "You both look towards substance and safeguards. That can carry you, but it needs protection against opening up opportunities too late.",
    },
    decision_logic: {
      BOTH_HIGH:
        "You are both fairly willing to decide with limited clarity. That speeds things up, but it can leave the same gap invisible to both of you.",
      BOTH_LOW:
        "You both want more certainty before deciding. That creates care, but it can keep the same decision open for too long.",
    },
    work_structure: {
      BOTH_HIGH:
        "You both give each other a lot of room and pace. That can be efficient, but it needs clear visibility so that topics don't quietly drift apart.",
      BOTH_LOW:
        "You both want a lot of visibility and feedback. That creates safety, but it can narrow pace and personal ownership more than necessary.",
    },
    commitment: {
      BOTH_HIGH:
        "You both put a great deal in. That looks strong, but it needs clear limits against quiet overload and against taking each other's effort for granted.",
      BOTH_LOW:
        "You both bring a more limited, realistically narrower scope of effort. That can work, but it needs explicit expectations about reliability and priorities.",
    },
    risk_orientation: {
      BOTH_HIGH:
        "You are both fairly willing to take bets. That opens up opportunities, but it needs clear thresholds for when safeguarding takes precedence.",
      BOTH_LOW:
        "You are both fairly cautious. That protects you from unnecessary exposure, but together it can lead to acting too late.",
    },
    conflict_style: {
      BOTH_HIGH:
        "You both tend to name tension directly. That can be clarifying, but it needs guardrails against escalating in the heat of the moment.",
      BOTH_LOW:
        "You both tend to name tension later or more carefully. That keeps conversations calm, but it can hold conflicts below the surface for too long.",
    },
  },
  tension: {
    company_logic: {
      medium:
        "The same business option is not automatically judged by the same yardsticks.",
      high: "Market opportunity, leverage and sustainable build-up carry such different weight for each of you that questions of direction quickly become questions of principle.",
    },
    decision_logic: {
      medium:
        "One of you sees a next step while the other still sees something to clarify in the same decision.",
      high: "Decisions can come back to the table repeatedly, because one of you is still testing while the other has privately already decided.",
    },
    work_structure: {
      medium:
        "One of you expects to be brought in earlier, while the other prefers to work independently until there is something solid.",
      high: "Day to day, your expectations about visibility, interim results and how closely you coordinate collide head-on.",
    },
    commitment: {
      medium: "Priorities and availability are not automatically expected within the same frame.",
      high: "One of you organises life around the startup far more than the other, which is quickly experienced as an imbalance.",
    },
    risk_orientation: {
      medium: "The same uncertainty does not sit within the same comfort zone for both of you.",
      high: "A step that counts as a reasonable bet for one of you looks like unnecessary exposure to the other.",
    },
    conflict_style: {
      medium:
        "The same disagreement gets raised at different points and with different directness.",
      high: "Misunderstandings arise not only from the topic itself, but from how differences get raised - or left alone.",
    },
  },
};

const BY_LOCALE: Record<AppLocale, LocalizedTitles> = { de: DE, en: EN };

export function isInsightDimension(value: unknown): value is InsightDimension {
  return INSIGHT_DIMENSIONS.includes(value as InsightDimension);
}

/**
 * `DimensionResult.dimension` traegt den kanonischen Namen ("Unternehmens-
 * logik"), nicht die ID. Der Name ist ein stabiler Schluessel - auch die
 * englischen Beschriftungen in der Builder-Copy liegen darunter -, sieht aber
 * deutsch aus. Hier wird er auf die ID gebracht, mit der Zuordnung aus dem
 * Scoring statt mit einer zweiten Kopie davon.
 */
export function toInsightDimension(value: string | null | undefined): InsightDimension | null {
  if (!value) return null;
  if (isInsightDimension(value)) return value;
  const mapped = (CANONICAL_TO_DIMENSION_ID as Record<string, InsightDimension>)[value];
  return mapped ?? null;
}

/**
 * Der Titel eines Befunds, in der gewuenschten Sprache.
 *
 * Bildet dieselbe Reihenfolge ab, die `toInsight` im Scoring nutzt: Bei einer
 * Spannung zaehlt zuerst die gemeinsame Lage (BOTH_HIGH/BOTH_LOW), dann das
 * Konfliktrisiko. Kommt nichts davon in Frage, gibt es keinen Titel - und die
 * Zusammenfassung nennt dann nur die Dimension, statt etwas zu erfinden.
 */
export function resolveInsightTitle(
  input: {
    dimension: string | null | undefined;
    kind: InsightKind;
    jointState?: string | null;
    conflictRisk?: string | null;
  },
  locale: AppLocale | string | null | undefined
): string | null {
  const dimension = toInsightDimension(input.dimension);
  if (!dimension) return null;
  const titles = BY_LOCALE[normalizeLocale(locale ?? DEFAULT_LOCALE)];

  if (input.kind === "strength") return titles.strength[dimension];
  if (input.kind === "complementary_dynamic") {
    return titles.complementary[dimension] ?? titles.complementaryFallback;
  }

  if (input.jointState === "BOTH_HIGH" || input.jointState === "BOTH_LOW") {
    return titles.sharedPosition[dimension][input.jointState];
  }
  if (input.conflictRisk === "high" || input.conflictRisk === "medium") {
    return titles.tension[dimension][input.conflictRisk];
  }
  return null;
}
