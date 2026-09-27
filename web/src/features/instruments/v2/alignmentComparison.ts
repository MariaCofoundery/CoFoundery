import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v2/alignmentReadout";

/**
 * Zwei Menschen nebeneinander - nicht gegeneinander verrechnet.
 *
 * ---------------------------------------------------------------------------
 * WAS TEIL F3 ERLAUBT UND WAS NICHT
 * ---------------------------------------------------------------------------
 *
 * Erlaubt ist: Kategorie neben Kategorie, gleiche oder andere Wahl, Angebot
 * neben gerichteter Erwartung, Grenzen nebeneinander. Verboten ist, aus einer
 * Differenz eine Konfliktwahrscheinlichkeit zu machen, nominale Kategorien mit
 * Abstaenden zu versehen oder daraus einen Matchscore abzuleiten.
 *
 * KEIN GESAMTWERT, UND ZWAR AUSDRUECKLICH. Teil F5: „Keinen Gesamt-Alignment-
 * oder Kompatibilitaetsscore einfuehren." Der Grund steht dort gleich dabei:
 * Ein globaler Abstandswert koennte „eine ausdrueckliche Haftungsgrenze durch
 * mehrere harmlose Gemeinsamkeiten verdecken". Zwei Menschen, die sich in
 * zwoelf Fragen einig sind und bei der dreizehnten unvereinbar, haetten einen
 * hervorragenden Wert.
 *
 * ---------------------------------------------------------------------------
 * ERWARTUNGEN SIND GERICHTET
 * ---------------------------------------------------------------------------
 *
 * Was B zusagt (Angebot) und was A von B erwartet, sind zwei verschiedene
 * Angaben - und A→B ist etwas anderes als B→A. Aus beiden eine Zahl zu machen
 * hiesse, zwei Beziehungen zu einer zu verschmelzen.
 */

export type Side = "a" | "b";

export type BlockComparison = {
  blockId: string;
  prompt: string;
  a: ReadoutEntry | null;
  b: ReadoutEntry | null;
  /**
   * `same` | `different` | `not_comparable`.
   *
   * KEIN GRAD, KEINE STAERKE. Teil F6: „Es gibt keinen Schwellwert fuer
   * ‚deutlich‘, ‚riskant‘ oder ‚unpassend‘." Eine andere Kategorie ist eine
   * andere Kategorie - ob das viel bedeutet, weiss das Gespraech, nicht dieses
   * Modul.
   */
  state: "same" | "different" | "not_comparable";
  /** Warum nicht vergleichbar - damit „fehlt“ nicht wie „passt nicht“ aussieht. */
  reason?: "missing_a" | "missing_b" | "missing_both" | "no_answer";
  markedBy: Side[];
};

export type ExpectationGap = {
  /** Wer erwartet. */
  from: Side;
  /** Von wem - so, wie die Person den Empfaenger benannt hat. */
  recipient: string;
  unit: string;
  expectedAtLeast: number;
  offeredAtMost: number;
  /** `max(0, E_min − O_max)` - die konservative Aussage aus Teil F3. */
  shortfall: number;
};

export type Clarification = {
  kind: "expectation_not_covered" | "decision_rule_unclear";
  blockIds: string[];
  /** Eine Beschreibung, kein Befund ueber Menschen. */
  detail: string;
};

/**
 * Ein Vergleich findet nur auf derselben Fassung statt.
 *
 * Teil F2: „Ein Paarvergleich erfolgt nur auf gleicher Version, gleicher
 * Skala, gleichem Referenzzeitraum und ausreichend gemeinsamen Items." Und der
 * Pruefplan in F7 nennt es noch einmal: „Teamvergleich bei Versionsunterschied
 * deaktiviert."
 *
 * WIRFT, STATT DAS BESTE ZU VERSUCHEN. Zwei Fassungen nebeneinanderzustellen
 * sieht aus wie ein Vergleich und ist keiner - dieselbe Beschriftung kann in
 * v1 und v2 etwas anderes heissen.
 */
export function assertComparableInstruments(instrumentA: string, instrumentB: string) {
  if (instrumentA !== instrumentB) {
    throw new Error(
      `instrument_mismatch_between_people: ${instrumentA} vs ${instrumentB} - ` +
        "ein Vergleich ueber Fassungen hinweg ist keiner"
    );
  }
}

export function compareBlocks(
  a: readonly ReadoutEntry[],
  b: readonly ReadoutEntry[],
  markedA: readonly string[] = [],
  markedB: readonly string[] = []
): BlockComparison[] {
  const byIdA = new Map(a.map((entry) => [entry.blockId, entry]));
  const byIdB = new Map(b.map((entry) => [entry.blockId, entry]));
  const blockIds = [...new Set([...byIdA.keys(), ...byIdB.keys()])].sort();

  return blockIds.map((blockId) => {
    const left = byIdA.get(blockId) ?? null;
    const right = byIdB.get(blockId) ?? null;
    const markedBy: Side[] = [];
    if (markedA.includes(blockId)) markedBy.push("a");
    if (markedB.includes(blockId)) markedBy.push("b");

    const base = {
      blockId,
      prompt: left?.prompt ?? right?.prompt ?? blockId,
      a: left,
      b: right,
      markedBy,
    };

    if (!left || !right) {
      return { ...base, state: "not_comparable" as const, reason: "no_answer" as const };
    }
    if (!left.answered || !right.answered) {
      const reason = !left.answered && !right.answered
        ? ("missing_both" as const)
        : !left.answered
          ? ("missing_a" as const)
          : ("missing_b" as const);
      return { ...base, state: "not_comparable" as const, reason };
    }

    return {
      ...base,
      state: sameAnswer(left.value, right.value) ? ("same" as const) : ("different" as const),
    };
  });
}

/**
 * Gleiche Antwort oder nicht - mehr wird hier nicht entschieden.
 *
 * Fuer Kategorien heisst „gleich“ dieselbe Kategorie, nicht ein kleiner
 * Abstand. Fuer Bereiche wird NICHT der Mittelpunkt verglichen (Teil F3:
 * „nicht willkuerlich die Mittelpunkte vergleichen“), sondern die Angabe als
 * Ganzes.
 */
function sameAnswer(left: ReadoutValue, right: ReadoutValue): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "category":
      return left.position === (right as typeof left).position;
    case "choice": {
      const other = right as typeof left;
      return (
        left.labels.length === other.labels.length &&
        left.labels.every((label) => other.labels.includes(label))
      );
    }
    case "case": {
      const other = right as typeof left;
      // NUR DER GEWAEHLTE WEG ZAEHLT ALS GLEICH ODER VERSCHIEDEN. Die
      // Wichtigkeiten stehen daneben und werden nicht verrechnet: Teil E sagt,
      // gleiche Wahl bei verschiedenen Begruendungen sei keine gleiche
      // Werthaltung - und unterschiedliche Wahl bei beidseitig hoher
      // Wichtigkeit ein gemeinsam anerkanntes Dilemma.
      return left.path.key === other.path.key;
    }
    case "range":
    case "money":
    case "date":
    case "text":
    case "fields":
    case "windows":
    case "recipients":
      return JSON.stringify(left) === JSON.stringify(right);
  }
}

/**
 * Wo eine Erwartung nicht durch eine Zusage gedeckt ist.
 *
 * `max(0, E_min − O_max)` aus Teil F3, und zwar bewusst konservativ: Bei
 * Bereichen wird die KLEINSTE Erwartung gegen die GROESSTE Zusage gehalten.
 * Das ist die Aussage, die sicher stimmt - „B erwartet mindestens neun Stunden
 * mehr, als A hoechstens zusagt“.
 *
 * Und es ist eine Rechnung ueber Angaben, kein Befund ueber Menschen. Das
 * Gutachten sagt es ausdruecklich: „Das ist eine rechnerische Beschreibung,
 * kein Kriterium von Charakter oder Teamversagen. Eine Vereinbarung kann die
 * Erwartung aendern."
 */
export function expectationGaps(
  offers: { side: Side; min: number; max: number | null; unit: string }[],
  expectations: { side: Side; recipient: string; min: number; max: number | null; unit: string }[]
): ExpectationGap[] {
  const gaps: ExpectationGap[] = [];

  for (const expectation of expectations) {
    // A→B und B→A sind getrennt: Eine Erwartung trifft immer das Angebot der
    // ANDEREN Seite.
    const other: Side = expectation.side === "a" ? "b" : "a";
    const offer = offers.find((entry) => entry.side === other);
    if (!offer) continue;

    // NUR BEI GLEICHER EINHEIT. Stunden gegen Monate zu halten waere eine
    // erfundene Zahl - das Gutachten verlangt gleiche Einheit, Rolle und
    // Zeitraum, bevor ueberhaupt gerechnet wird.
    if (offer.unit !== expectation.unit) continue;

    const offeredAtMost = offer.max ?? offer.min;
    const shortfall = Math.max(0, expectation.min - offeredAtMost);
    if (shortfall <= 0) continue;

    gaps.push({
      from: expectation.side,
      recipient: expectation.recipient,
      unit: expectation.unit,
      expectedAtLeast: expectation.min,
      offeredAtMost,
      shortfall,
    });
  }

  return gaps;
}

/**
 * Was konkret zu klaeren ist.
 *
 * „KRITISCH“ HEISST IM MVP NUR: KONKRET KLAERUNGSBEDUERFTIG. Teil F5 sagt das
 * woertlich und nennt vier Faelle. Zwei davon lassen sich aus Antworten
 * ableiten, zwei nicht - siehe `CLARIFICATIONS_NOT_DERIVABLE`.
 *
 * Und ein Fall ist ausdruecklich KEINER: „Hohe U plus hohe K ist keine
 * kritische Kombination." Wer viel selbst entscheiden und viel teilen moechte,
 * hat keinen Widerspruch, sondern eine Arbeitsweise.
 */
export function clarificationsNeeded(
  comparisons: readonly BlockComparison[],
  gaps: readonly ExpectationGap[]
): Clarification[] {
  const found: Clarification[] = [];

  // Fall 3 aus F5: Die zugesagte Verfuegbarkeit deckt eine ausdrueckliche
  // Erwartung im selben Zeitraum nicht.
  for (const gap of gaps) {
    found.push({
      kind: "expectation_not_covered",
      blockIds: ["R01", "R02"],
      detail:
        `Die Angaben ueberlappen nicht: erwartet werden mindestens ` +
        `${gap.expectedAtLeast} ${gap.unit}, zugesagt sind hoechstens ` +
        `${gap.offeredAtMost} ${gap.unit} (${gap.recipient}).`,
    });
  }

  // Fall 1 aus F5: Eine Person erwartet eine Freigabe, die andere haelt sich
  // fuer allein entscheidungsbefugt - und es gibt keine vereinbarte Regel.
  const rule = comparisons.find((entry) => entry.blockId === "G01");
  if (rule && rule.state === "different") {
    found.push({
      kind: "decision_rule_unclear",
      blockIds: ["G01"],
      detail:
        "Ihr wuenscht euch verschiedene Wege, wer in einem klar zugeordneten " +
        "Bereich das letzte Wort hat. Solange das nicht vereinbart ist, wird " +
        "es beim ersten Streitfall entschieden.",
    });
  }

  return found;
}

/**
 * Die beiden Faelle aus F5, die sich NICHT aus Antworten ableiten lassen.
 *
 * Sie stehen hier als Text und nicht als Code, weil das ehrlicher ist, als sie
 * zu erraten. Wer sie spaeter schliesst, loescht hier eine Zeile.
 */
export const CLARIFICATIONS_NOT_DERIVABLE = [
  {
    case: "Eine geplante Verpflichtung ueberschreitet eine ausdrueckliche persoenliche Grenze.",
    why:
      "Die Grenze steht als Freitext (L01), die geplante Verpflichtung ebenfalls. " +
      "Ob die eine die andere beruehrt, kann nur ein Mensch beurteilen - eine " +
      "Textaehnlichkeit waere geraten. Das Produkt legt beide nebeneinander und " +
      "stellt die Frage; es beantwortet sie nicht.",
  },
  {
    case:
      "Eine Gespraechspause endet ohne Rueckkehrvereinbarung und mindestens eine " +
      "Person moechte weiter klaeren.",
    why:
      "Das ist ein Zustand im Gespraech, keine Eigenschaft der Antworten. G02 sagt, " +
      "wie jemand nach einer Pause weitermachen MOECHTE - nicht, ob gerade eine " +
      "Pause offen ist. Dafuer braucht es die Gespraechsfuehrung im Produkt.",
  },
] as const;
