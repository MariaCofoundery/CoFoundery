import { getItemsV22, registryOf } from "@/features/instruments/align/registries";

/**
 * Discovery: Themen, bei denen dir etwas wichtig ist.
 *
 * ---------------------------------------------------------------------------
 * AUS DEM ARBEITSPROFIL, NICHT AUS DEM VORHABEN
 * ---------------------------------------------------------------------------
 *
 * Discovery zeigt Menschen, die man noch nicht kennt. Mit ihnen gibt es kein
 * gemeinsames Vorhaben - also auch keine gemeinsamen Zusagen, keine
 * Teamregeln und keine Risikogrenzen für etwas, das es nicht gibt.
 *
 * Was portabel ist, ist das Arbeitsprofil: wie jemand entscheidet,
 * Unterschiede anspricht und mit offenen Fragen umgeht. Das gilt unabhängig
 * davon, mit wem.
 *
 * ---------------------------------------------------------------------------
 * KEINE ZAHL ÜBER ALLE THEMEN
 * ---------------------------------------------------------------------------
 *
 * Du sagst, bei welchen Themen dir Ähnlichkeit wichtig ist - bei allen, nicht
 * bei dreien. Discovery zeigt je Thema, ob es zutrifft, und niemals eine Zahl
 * darüber. „8 von 12“ sieht besser aus als „7 von 12“, auch wenn der eine
 * Fehltreffer der ist, auf den es ankommt.
 */

export type TopicWish = "similar" | "different";

export type DiscoveryTopic = {
  key: string;
  label: string;
  itemIds: string[];
  /** Was hier „ähnlich“ heißt - steht so auch in der Oberfläche. */
  rule: string;
};

/**
 * Die Überschrift ohne ihr Buchstabenkürzel.
 *
 * Im Quelldokument heißen die Abschnitte „A – Analytische Prüfung“. Der
 * Buchstabe ist eine Ordnungshilfe für uns; auf dem Bildschirm wäre er eine
 * Abkürzung, die niemand auflösen kann.
 */
function readableLabel(section: string): string {
  const [, rest] = section.split(/\s+–\s+/);
  return (rest ?? section).trim();
}

const RULE_BY_FORMAT: Record<string, string> = {
  ordinal_choice: "gleiche Stufe oder höchstens eine daneben",
  single_choice: "dieselbe Antwort",
};

export function getDiscoveryTopics(): DiscoveryTopic[] {
  const items = getItemsV22("founder_profile");

  return registryOf("founder_profile")
    .sections.map((section, index) => {
      const darin = items.filter(
        (item) => item.section === section && RULE_BY_FORMAT[item.answerFormat],
      );
      if (darin.length === 0) return null;

      const rules = [...new Set(darin.map((item) => RULE_BY_FORMAT[item.answerFormat]))];
      return {
        // Die Nummer haelt die Kennung stabil, auch wenn eine Ueberschrift
        // umformuliert wird. Der Text darf sich aendern, die gespeicherte
        // Themenwahl soll es nicht.
        key: `P${String(index + 1).padStart(2, "0")}`,
        label: readableLabel(section),
        itemIds: darin.map((item) => item.itemId),
        rule: rules.join("; "),
      };
    })
    .filter((topic): topic is DiscoveryTopic => topic !== null);
}

export type TopicVerdict = {
  topicKey: string;
  rank: number | null;
  wish: TopicWish;
  /**
   * `true` heißt: der Wunsch trifft zu. `null` heißt: zu wenig gemeinsame
   * Grundlage - und das ist ausdrücklich nicht `false`.
   */
  matches: boolean | null;
  basis: number;
  of: number;
};

/**
 * Die Reihenfolge der Kandidaten - ohne Punktzahl.
 *
 * Nach DEINER Themenreihenfolge, der Reihe nach. Nicht „wie viele Themen
 * treffen zu“: Das wäre eine Zahl über alle Themen und damit der
 * Passungswert, nur mit selbst gesetzten Gewichten.
 */
export function compareCandidates(
  a: readonly TopicVerdict[],
  b: readonly TopicVerdict[],
  order: readonly string[],
): number {
  for (const topicKey of order) {
    const rank = (verdicts: readonly TopicVerdict[]) => {
      const verdict = verdicts.find((entry) => entry.topicKey === topicKey);
      // Unbekannt steht ZWISCHEN passt und passt nicht. Wer wenig beantwortet
      // hat, ist nicht schlechter, sondern unbekannt.
      return verdict?.matches === true ? 0 : verdict?.matches === null || !verdict ? 1 : 2;
    };
    const difference = rank(a) - rank(b);
    if (difference !== 0) return difference;
  }
  return 0;
}
