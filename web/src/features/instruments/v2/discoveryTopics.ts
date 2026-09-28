import { getAlignmentPreferences } from "@/features/instruments/v2/alignmentRegistryV2";
import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v2/alignmentReadout";

/**
 * Discovery ohne Gesamtzahl: Themen, die DIR wichtig sind.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN FILTER IST UND KEINE RECHNUNG
 * ---------------------------------------------------------------------------
 *
 * Der naheliegende Weg wäre: Wichtigkeiten je Dimension vergeben, gewichtete
 * Ähnlichkeit rechnen, danach sortieren. Das ist ein Passungswert mit
 * Zwischenschritten - und Teil F5 verbietet ihn ausdrücklich: „Keinen
 * Gesamt-Alignment- oder Kompatibilitätsscore einführen." Die Begründung steht
 * dort gleich dabei: Ein globaler Wert „könnte eine ausdrückliche
 * Haftungsgrenze durch mehrere harmlose Gemeinsamkeiten verdecken."
 *
 * Gewichte machen das nicht besser, sondern schlechter: Sie sehen aus wie eine
 * persönliche Einstellung und erzeugen trotzdem eine einzige Zahl, die dann
 * wieder zum Auswahlkriterium wird.
 *
 * DESHALB WIRD HIER NICHTS ADDIERT. Du sagst, bei welchen Themen dir
 * Ähnlichkeit wichtig ist. Discovery zeigt dir je Thema, ob es passt - und
 * niemals eine Zahl darüber. Wer drei Themen wählt, sieht drei Antworten und
 * keine vierte, die sie zusammenfasst.
 *
 * ---------------------------------------------------------------------------
 * UND DIE BASIS WIRD IMMER GENANNT
 * ---------------------------------------------------------------------------
 *
 * Teil F2: „Bei vier Items werden Unterschiede zunächst auf den mindestens
 * drei gemeinsam beantworteten Items berechnet und diese Basis genannt."
 *
 * Ein „passt" auf Grundlage einer einzigen gemeinsam beantworteten Frage ist
 * etwas anderes als eines auf Grundlage von vier - und der Unterschied gehört
 * dahin, wo das Ergebnis steht.
 */

export type DiscoveryTopic = {
  key: string;
  label: string;
  /** Die Blöcke, aus denen sich das Thema zusammensetzt. */
  blockIds: string[];
  /** Was hier „ähnlich“ heißt - steht so auch in der Oberfläche. */
  rule: string;
};

/** Höchstens drei. Wer alles wichtig findet, hat nichts ausgewählt. */
export const MAX_DISCOVERY_TOPICS = 3;

export function getDiscoveryTopics(): DiscoveryTopic[] {
  const preferences = getAlignmentPreferences().map((preference) => ({
    key: `P_${preference.id}`,
    label: preference.label,
    blockIds: preference.items.filter((item) => item.inMvp).map((item) => item.itemId),
    rule: "gleiche Antwort oder höchstens eine Stufe Unterschied",
  }));

  return [
    ...preferences,
    {
      key: "C_goals",
      label: "Ziele und Ausstieg",
      blockIds: ["S01", "S02", "S03"],
      rule: "dieselbe Auswahl",
    },
    {
      key: "C_commitment",
      label: "Zeit und Zusagen",
      blockIds: ["R01", "R03", "R04"],
      rule: "überlappende Angaben",
    },
    {
      key: "C_risk",
      label: "Risiko und Absicherung",
      blockIds: ["B01", "B05"],
      rule: "überlappende Angaben bzw. dieselbe Auswahl",
    },
    {
      key: "C_rules",
      label: "Entscheidungs- und Konfliktregeln",
      blockIds: ["G01", "G02"],
      rule: "dieselbe Auswahl",
    },
  ];
}

export type TopicVerdict = {
  topicKey: string;
  /**
   * `similar` | `different` | `not_assessable`
   *
   * DREI ZUSTAENDE, KEIN GRAD. Es gibt kein „eher aehnlich" und keine
   * Prozentzahl - Teil F6: „Es gibt keinen Schwellwert fuer ‚deutlich‘,
   * ‚riskant‘ oder ‚unpassend‘."
   */
  state: "similar" | "different" | "not_assessable";
  /** Auf wie vielen gemeinsam beantworteten Fragen das beruht. */
  basisComparable: number;
  basisTotal: number;
  /** Welche Frage den Ausschlag gab - damit „unterschiedlich“ nachvollziehbar ist. */
  differsAt: string[];
};

/**
 * Passt dieses Thema?
 *
 * ALLE GEMEINSAM BEANTWORTETEN FRAGEN MUESSEN PASSEN, nicht die Mehrheit. Wer
 * sagt "hier ist mir Aehnlichkeit wichtig", meint nicht "in zwei von drei
 * Faellen". Und eine Mehrheit waere wieder eine Verrechnung.
 */
export function judgeTopic(
  topic: DiscoveryTopic,
  mine: readonly ReadoutEntry[],
  theirs: readonly ReadoutEntry[]
): TopicVerdict {
  const byMine = new Map(mine.map((entry) => [entry.blockId, entry]));
  const byTheirs = new Map(theirs.map((entry) => [entry.blockId, entry]));

  let comparable = 0;
  const differsAt: string[] = [];

  for (const blockId of topic.blockIds) {
    const a = byMine.get(blockId);
    const b = byTheirs.get(blockId);
    // Nicht beantwortet, ausgelassen oder nicht geteilt zaehlt NICHT gegen
    // jemanden - es zaehlt nur nicht mit. Teil F2: "Die betreffenden Felder
    // erscheinen lediglich als nicht vergleichbar."
    if (!a?.answered || !b?.answered) continue;

    const verdict = isSimilar(a.value, b.value);
    // NULL HEISST "NICHT MASCHINELL BEURTEILBAR" und ist etwas anderes als
    // "unterschiedlich". Freitext und Zeitfenster faenden sonst niemals
    // jemanden aehnlich - und wuerden ein Thema dauerhaft auf
    // "unterschiedlich" festnageln, obwohl niemand etwas gemessen hat.
    if (verdict === null) continue;

    comparable += 1;
    if (!verdict) differsAt.push(blockId);
  }

  if (comparable === 0) {
    return {
      topicKey: topic.key, state: "not_assessable",
      basisComparable: 0, basisTotal: topic.blockIds.length, differsAt: [],
    };
  }

  return {
    topicKey: topic.key,
    state: differsAt.length === 0 ? "similar" : "different",
    basisComparable: comparable,
    basisTotal: topic.blockIds.length,
    differsAt,
  };
}

/**
 * Was „ähnlich“ bei welcher Art von Antwort heißt.
 *
 * DIESE REGELN SIND PRODUKTREGELN, KEINE MESSAUSSAGEN. Sie stehen wörtlich in
 * der Oberfläche, damit niemand raten muss, was der Filter getan hat. Eine
 * Stufe Unterschied auf einer Fünferskala als „ähnlich“ zu zählen, ist eine
 * Verabredung - keine Erkenntnis über Menschen.
 */
function isSimilar(a: ReadoutValue, b: ReadoutValue): boolean | null {
  if (a.kind !== b.kind) return null;

  switch (a.kind) {
    case "category":
      return Math.abs(a.position - (b as typeof a).position) <= 1;

    case "choice": {
      const other = b as typeof a;
      return (
        a.labels.length === other.labels.length &&
        a.labels.every((label) => other.labels.includes(label))
      );
    }

    case "range": {
      const other = b as typeof a;
      // UEBERLAPPUNG STATT MITTELPUNKTE - Teil F3 verbietet den Vergleich der
      // Mittelpunkte ausdruecklich.
      if (a.unit !== other.unit) return false;
      return a.min <= (other.max ?? other.min) && other.min <= (a.max ?? a.min);
    }

    case "money": {
      const other = b as typeof a;
      if (a.currency !== other.currency) return false;
      return a.min <= (other.max ?? other.min) && other.min <= (a.max ?? a.min);
    }

    case "date":
      return a.date === (b as typeof a).date;

    case "case":
      return a.path.key === (b as typeof a).path.key;

    // Freitext, Zeitfenster und gerichtete Erwartungen lassen sich nicht
    // maschinell auf Aehnlichkeit pruefen. `null` heisst "zaehlt nicht mit" -
    // `false` waere die Behauptung, sie seien unterschiedlich, und wuerde
    // jemanden aussortieren, ueber den nichts bekannt ist.
    case "text":
    case "fields":
    case "windows":
    case "recipients":
      return null;
  }
}
