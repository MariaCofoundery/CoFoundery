import { getItemsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

/**
 * Discovery ohne Gesamtzahl: Themen, die DIR wichtig sind.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN FILTER IST UND KEINE RECHNUNG
 * ---------------------------------------------------------------------------
 *
 * Der naheliegende Weg wäre: Wichtigkeiten vergeben, gewichtete Ähnlichkeit
 * rechnen, danach sortieren. Das ist ein Passungswert mit Zwischenschritten.
 * Ein globaler Wert könnte eine ausdrückliche Haftungsgrenze durch mehrere
 * harmlose Gemeinsamkeiten verdecken - 8 von 12 sieht besser aus als 7 von 12,
 * auch wenn der eine Fehltreffer der ist, auf den es ankommt.
 *
 * Gewichte machen das nicht besser, sondern schlechter: Sie sehen aus wie eine
 * persönliche Einstellung und erzeugen trotzdem eine einzige Zahl, die dann
 * wieder zum Auswahlkriterium wird.
 *
 * Deshalb wird hier nichts addiert. Du sagst, bei welchen Themen dir
 * Ähnlichkeit wichtig ist - bei allen, nicht bei dreien. Discovery zeigt je
 * Thema, ob es zutrifft, und niemals eine Zahl darüber.
 *
 * ---------------------------------------------------------------------------
 * WORAUS DIE THEMEN KOMMEN
 * ---------------------------------------------------------------------------
 *
 * Aus den Abschnitten der geprüften Quelle, nicht aus selbst gebauten Gruppen.
 * Die Überschriften sind ausdrücklich Gesprächsbereiche und keine gemessenen
 * Dimensionen - genau als solche taugen sie hier: als Namen für das, worüber
 * man sprechen will.
 *
 * Abschnitte mit nur Freitext fallen weg. „Ähnliche Grenzen“ liesse sich aus
 * zwei geschriebenen Sätzen nicht feststellen, und es zu behaupten wäre
 * schlimmer, als das Thema wegzulassen.
 */

export type TopicWish = "similar" | "different";

export type DiscoveryTopicV21 = {
  key: string;
  label: string;
  itemIds: string[];
  /** Was hier „ähnlich“ heißt - steht so auch in der Oberfläche. */
  rule: string;
};

/** Formate, bei denen sich Ähnlichkeit überhaupt feststellen lässt. */
const COMPARABLE = new Set([
  "ordinal_choice",
  "single_choice",
  "multi_choice",
  "multi_choice_priority",
  "value_case",
  "money_range",
  "number_range",
  "date",
]);

const RULE_BY_FORMAT: Record<string, string> = {
  ordinal_choice: "gleiche Stufe oder höchstens eine daneben",
  single_choice: "dieselbe Antwort",
  multi_choice: "mindestens eine gemeinsame Antwort",
  multi_choice_priority: "mindestens eine gemeinsame Antwort",
  value_case: "derselbe Weg",
  money_range: "vergleichbare Größenordnung, gleiche Währung",
  number_range: "vergleichbare Größenordnung, gleiche Einheit",
  date: "dasselbe Datum",
};

/**
 * Die sechs Wertefaelle werden EIN Thema.
 *
 * In der Quelle hat jeder seinen eigenen Abschnitt - "Prioritaeten im
 * konkreten Fall: Frueche Information und Verlaesslichkeit" und fuenf weitere.
 * Das ist fuer den Fragebogen richtig: Jeder Fall steht fuer sich.
 *
 * Als Discovery-Themen waeren es sechs Kaestchen mit fast demselben Namen, und
 * niemand kann sagen, welches davon ihm wichtiger ist. Wer "Prioritaeten in
 * konkreten Faellen" anklickt, meint alle.
 *
 * Das ist eine Entscheidung ueber die Oberflaeche, nicht ueber die Messung:
 * Die Faelle bleiben im Fragebogen und im Vergleich einzeln.
 */
const VALUE_CASE_PREFIX = "Prioritäten im konkreten Fall";
const VALUE_CASE_TOPIC = {
  key: "T90",
  label: "Prioritäten in konkreten Fällen",
  rule: "derselbe Weg",
};

export function getDiscoveryTopicsV21(): DiscoveryTopicV21[] {
  const topics: DiscoveryTopicV21[] = [];

  const valueCaseItems = getItemsV21()
    .filter((item) => item.section.startsWith(VALUE_CASE_PREFIX) && COMPARABLE.has(item.answerFormat))
    .map((item) => item.itemId);

  for (const [index, section] of REGISTRY_V21.sections.entries()) {
    if (section.startsWith(VALUE_CASE_PREFIX)) continue;
    const items = getItemsV21().filter(
      (item) => item.section === section && COMPARABLE.has(item.answerFormat),
    );
    if (items.length === 0) continue;

    // Die Regel je Thema nennt die Formate, die wirklich darin vorkommen -
    // nicht eine allgemeine Formel, die bei der Haelfte nicht stimmt.
    const rules = [...new Set(items.map((item) => RULE_BY_FORMAT[item.answerFormat]))];

    topics.push({
      // Die Nummer haelt die Kennung stabil, auch wenn eine Ueberschrift
      // umformuliert wird. Der Text darf sich aendern, die gespeicherte
      // Themenwahl soll es nicht.
      key: `T${String(index + 1).padStart(2, "0")}`,
      label: section,
      itemIds: items.map((item) => item.itemId),
      rule: rules.join("; "),
    });
  }

  if (valueCaseItems.length > 0) {
    topics.push({ ...VALUE_CASE_TOPIC, itemIds: valueCaseItems });
  }

  return topics;
}

export type TopicVerdictV21 = {
  topicKey: string;
  /** Deine eigene Reihenfolge. 1 ist das wichtigste - KEIN Gewicht. */
  rank: number | null;
  wish: TopicWish;
  /**
   * `true` heißt: der Wunsch trifft zu. `null` heißt: zu wenig gemeinsame
   * Grundlage.
   *
   * `null` ist ausdrücklich nicht `false`. „Wir wissen es nicht“ als „passt
   * nicht“ zu zeigen, wäre eine Auskunft, die niemand gegeben hat.
   */
  matches: boolean | null;
  /** Auf wie vielen gemeinsam beantworteten Fragen das beruht. */
  basis: number;
  of: number;
};

/**
 * Die Reihenfolge der Kandidaten - ohne Punktzahl.
 *
 * Sortiert wird nach DEINER Themenreihenfolge, der Reihe nach: Wer bei deinem
 * wichtigsten Thema passt, steht vor jemandem, der es nicht tut. Erst bei
 * Gleichstand entscheidet das zweite Thema.
 *
 * WARUM NICHT "WIE VIELE THEMEN TREFFEN ZU": Das wäre eine Zahl über alle
 * Themen und damit der Passungswert, nur mit selbst gesetzten Gewichten.
 * Lexikographisch heißt: Dein erstes Thema ist wirklich das erste, und kein
 * Stapel kleiner Treffer kann es aufwiegen.
 */
export function compareCandidatesByTopics(
  a: readonly TopicVerdictV21[],
  b: readonly TopicVerdictV21[],
  order: readonly string[],
): number {
  for (const topicKey of order) {
    const left = a.find((entry) => entry.topicKey === topicKey);
    const right = b.find((entry) => entry.topicKey === topicKey);
    const rank = (verdict?: TopicVerdictV21) =>
      // Unbekannt steht zwischen "passt" und "passt nicht" - nicht hinten.
      // Wer zu wenig beantwortet hat, ist nicht schlechter, sondern unbekannt.
      verdict?.matches === true ? 0 : verdict?.matches === null || !verdict ? 1 : 2;

    const difference = rank(left) - rank(right);
    if (difference !== 0) return difference;
  }
  return 0;
}
