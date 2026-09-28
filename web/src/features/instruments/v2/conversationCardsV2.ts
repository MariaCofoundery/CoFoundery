import libraryJson from "../../../../docs/founder-alignment-conversation-v2.json";
import type { AgendaItem } from "@/features/instruments/v2/alignmentAgenda";
import type { BlockComparison, ExpectationGap } from "@/features/instruments/v2/alignmentComparison";
import type { ReadoutValue } from "@/features/instruments/v2/alignmentReadout";

/**
 * Die Texte - aus einer geprüften Bibliothek, nicht erfunden.
 *
 * ---------------------------------------------------------------------------
 * DER VIERSCHRITT AUS TEIL G
 * ---------------------------------------------------------------------------
 *
 * beobachtete Antwort → mögliche Bedeutung → konkrete Klärungsfrage →
 * überprüfbare Vereinbarung.
 *
 * Die Reihenfolge ist nicht beliebig. Wer mit der Bedeutung anfängt, hat
 * interpretiert, bevor jemand die Antwort gesehen hat - und eine Deutung, die
 * vor ihrem Gegenstand steht, wird nicht mehr geprüft, sondern geglaubt.
 *
 * ---------------------------------------------------------------------------
 * WARUM HIER KEINE KI SCHREIBT
 * ---------------------------------------------------------------------------
 *
 * Teil G, wörtlich: „Eine KI darf Antwortgründe nicht ergänzen, wenn sie nicht
 * erhoben wurden. Sie kann passende offene Fragen aus einer geprüften
 * Bibliothek anbieten."
 *
 * Genau das ist dieses Modul. Der Grund ist nicht Technikskepsis: Ein
 * formulierter Grund liest sich wie eine Beobachtung, auch wenn er geraten
 * ist - und niemand im Gespräch kann ihm ansehen, dass ihn niemand gesagt hat.
 * Eine erfundene Begründung ist schlimmer als gar keine, weil sie die echte
 * Frage verdrängt.
 *
 * ---------------------------------------------------------------------------
 * WAS NICHT GESAGT WERDEN DARF
 * ---------------------------------------------------------------------------
 *
 * Teil G führt es je Evidenzstufe auf. Verboten sind Eigenschaftszuschreibungen
 * („A ist analytischer"), Risikoaussagen („ihr habt ein hohes Konfliktrisiko"),
 * Unterstellungen („die Person meint es nicht ernst") und Sicherheitsversprechen
 * („eure Werte sind kompatibel"). Ein Test prüft jede erzeugte Karte dagegen.
 */

export type ConversationCard = {
  id: string;
  blockId: string | null;
  /** Was tatsächlich geantwortet wurde. Keine Deutung. */
  observed: string;
  /** Eine Möglichkeit, nie eine Tatsache über die Person. */
  meaning: string;
  question: string;
  /** Woraus eine Vereinbarung bestehen muss - Teil G, „Gesprächsablauf“. */
  agreement: string[];
  source: string;
};

type Trigger =
  | { kind: "expectation_gap" }
  | { kind: "blocks_differ"; blockIds: string[] }
  | { kind: "block_differs"; blockId: string }
  | { kind: "value_case_differs" }
  | { kind: "same_choice" }
  | { kind: "not_comparable" }
  | { kind: "marked_but_same" }
  | { kind: "solo" }
  | { kind: "fallback_different" };

type LibraryCard = {
  id: string;
  /**
   * Was der zweite Baustein ueberhaupt ist.
   *
   * NUR EINE HYPOTHESE MUSS ABGESCHWAECHT SEIN. "Daraus leiten wir keine
   * Bewertung ab" ist eine Aussage ueber unser Vorgehen - eine abgeschwaechte
   * Selbstbeschraenkung waere keine. Und "es liegt noch kein Vergleich vor"
   * ist eine Tatsache ueber die Datenlage. Beide duerfen bestimmt klingen;
   * eine Vermutung ueber Menschen darf es nicht.
   *
   * Und eine bedingte Aussage ("deren Vereinbarkeit vom Zeithorizont
   * abhaengt") traegt ihre Vorsicht in der Bedingung - ein zusaetzliches
   * "vielleicht" wuerde sie nur unscharf machen.
   */
  meaningKind: "hypothesis" | "about_method" | "fact" | "conditional";
  trigger: Trigger;
  observed: string;
  meaning: string;
  question: string;
  agreement: string[];
  sourceQuote: string;
  source: string;
};

export type ConversationLibrary = {
  instrumentId: string;
  source: string;
  note: string;
  forbidden: string[];
  hedges: string[];
  meaningKinds: Record<string, string>;
  cards: LibraryCard[];
};

export const CONVERSATION_LIBRARY_V2 = libraryJson as unknown as ConversationLibrary;

export type CardContext = {
  nameA: string;
  nameB: string;
  comparisons: readonly BlockComparison[];
  gaps: readonly ExpectationGap[];
};

/**
 * Höchstens vier Karten je Sitzung.
 *
 * Teil G: „Das Tool sollte pro Sitzung zwei bis vier vom Team ausgewählte
 * Themen bearbeiten, nicht 20 Warnkarten auf einmal." Zwanzig Karten sind
 * keine Gründlichkeit, sondern eine Art, nichts davon zu besprechen.
 */
export const MAX_CARDS_PER_SESSION = 4;

export function buildConversationCards(
  agenda: readonly AgendaItem[],
  context: CardContext
): ConversationCard[] {
  const byBlock = new Map(context.comparisons.map((entry) => [entry.blockId, entry]));
  const cards: ConversationCard[] = [];
  const used = new Set<string>();

  for (const item of agenda) {
    if (cards.length >= MAX_CARDS_PER_SESSION) break;
    const comparison = byBlock.get(item.blockId) ?? null;
    const card = pick(item, comparison, context);
    if (!card) continue;
    // Dieselbe Karte nicht zweimal - sonst stünde derselbe Rat viermal da.
    const key = `${card.id}|${card.blockId ?? ""}`;
    if (used.has(key)) continue;
    used.add(key);
    cards.push(card);
  }

  return cards;
}

/**
 * Die Karte zu einem einzelnen Block - auch dann, wenn er nicht auf der
 * Agenda steht.
 *
 * WARUM DAS EINEN EIGENEN WEG BRAUCHT. Teil F6 setzt nur unterschiedlich
 * beantwortete Themen auf die Agenda. Eine Frage, zu der eine Seite nichts
 * geteilt hat, gehoert nicht dorthin - man kann nicht besprechen, was niemand
 * gesagt hat. Aber "Im MVP bleiben ALLE Antworten zugaenglich", und wer diesen
 * Block oeffnet, soll den richtigen Satz lesen: "Daraus leiten wir keine
 * Bewertung ab" - und nicht gar nichts, was wie ein Versaeumnis aussieht.
 */
export function buildCardForComparison(
  comparison: BlockComparison,
  context: CardContext
): ConversationCard | null {
  const item: AgendaItem = {
    blockId: comparison.blockId,
    prompt: comparison.prompt,
    priority: 4,
    reason: comparison.markedBy.length > 0 ? "marked" : "different",
    markedBy: comparison.markedBy,
  };
  return pick(item, comparison, context);
}

function pick(
  item: AgendaItem,
  comparison: BlockComparison | null,
  context: CardContext
): ConversationCard | null {
  const library = CONVERSATION_LIBRARY_V2.cards;
  const find = (id: string) => library.find((card) => card.id === id);

  // 1. Eine nicht gedeckte Erwartung hat ihren eigenen Text mit Zahlen.
  if (item.reason === "expectation_or_limit" && context.gaps.length > 0) {
    const gap = context.gaps[0];
    const card = find("time_and_expectations");
    if (!card) return null;
    const [offerSide, expectSide] = gap.from === "b" ? ["a", "b"] : ["b", "a"];
    return render(card, item.blockId, {
      a: offerSide === "a" ? context.nameA : context.nameB,
      b: expectSide === "a" ? context.nameA : context.nameB,
      offer: `${gap.offeredAtMost} ${gap.unit}`,
      expected: `${gap.expectedAtLeast} ${gap.unit}`,
    });
  }

  // 2. Zwei Blöcke zusammen - die ausformulierten Fälle aus Teil G.
  for (const card of library) {
    if (card.trigger.kind !== "blocks_differ") continue;
    const [first, second] = card.trigger.blockIds;
    if (item.blockId !== first && item.blockId !== second) continue;
    const one = context.comparisons.find((entry) => entry.blockId === first);
    const two = context.comparisons.find((entry) => entry.blockId === second);
    if (!one?.a?.answered || !two?.b?.answered) continue;
    return render(card, item.blockId, { a: context.nameA, b: context.nameB });
  }

  if (!comparison) return null;

  // 3. Ein bestimmter Block mit eigenem Text.
  const specific = library.find(
    (card) => card.trigger.kind === "block_differs" && card.trigger.blockId === item.blockId
  );
  if (specific && comparison.state === "different") {
    return render(specific, item.blockId, {
      a: context.nameA,
      b: context.nameB,
      answerA: describe(comparison.a?.value),
      answerB: describe(comparison.b?.value),
    });
  }

  // 4. Wertefall, gleiche Wahl, fehlende Vergleichbarkeit, markiert-aber-gleich.
  if (comparison.a?.value?.kind === "case" && comparison.state === "different") {
    const card = find("value_case_differs");
    if (card) {
      return render(card, item.blockId, {
        a: context.nameA,
        b: context.nameB,
        answerA: describe(comparison.a?.value),
        answerB: describe(comparison.b?.value),
      });
    }
  }
  if (comparison.state === "not_comparable") {
    const card = find("not_comparable");
    return card ? render(card, item.blockId, {}) : null;
  }
  if (comparison.state === "same") {
    const card = find(item.reason === "marked" ? "same_summary_different_item" : "same_choice");
    if (!card) return null;
    const markedBy = comparison.markedBy
      .map((side) => (side === "a" ? context.nameA : context.nameB))
      .join(" und ");
    return render(card, item.blockId, { a: context.nameA, b: context.nameB, markedBy });
  }

  // 5. Sonst der allgemeine Vierschritt.
  const fallback = find("generic_difference");
  return fallback
    ? render(fallback, item.blockId, {
        a: context.nameA,
        b: context.nameB,
        answerA: describe(comparison.a?.value),
        answerB: describe(comparison.b?.value),
      })
    : null;
}

function render(
  card: LibraryCard,
  blockId: string | null,
  values: Record<string, string>
): ConversationCard {
  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
  return {
    id: card.id,
    blockId,
    observed: fill(card.observed),
    meaning: fill(card.meaning),
    question: fill(card.question),
    agreement: card.agreement,
    source: card.source,
  };
}

/**
 * Eine Antwort in einem Satz - ohne sie zu deuten.
 *
 * Fuer eine Kategorie ist das ihre Beschriftung, nicht ihre Position: „fast
 * immer" und nicht „5". Die Zahl gehoert nicht in einen Satz, den ein Mensch
 * liest - dort wuerde sie sofort wieder wie ein Messwert wirken.
 */
function describe(value: ReadoutValue | undefined): string {
  if (!value) return "keine Angabe";
  switch (value.kind) {
    case "category": return value.label;
    case "choice": return value.labels.join(", ");
    case "text": return value.text;
    case "fields": return value.fields.map((entry) => `${entry.label}: ${entry.text}`).join("; ");
    case "range": return `${value.min}${value.max != null ? `–${value.max}` : ""} ${value.unit}`;
    case "money": return `${value.min}${value.max != null ? `–${value.max}` : ""} ${value.currency}`;
    case "recipients":
      return value.per
        .map((entry) => `${entry.recipient}: ${entry.min}${entry.max != null ? `–${entry.max}` : ""} ${value.unit}`)
        .join("; ");
    case "windows":
      return value.windows.map((entry) => `${entry.days.join("/")} ${entry.from}–${entry.to}`).join("; ");
    case "date": return value.date;
    case "case": return value.path.label;
  }
}

/**
 * Die Bestandteile einer Vereinbarung - Teil G, „Gesprächsablauf und Ergebnis“.
 *
 * „Betrags- und Zeitgrenzen legt das Team fest, nicht der Fragebogen." Deshalb
 * sind das leere Felder und keine Vorschläge.
 */
export const AGREEMENT_FIELDS = [
  "Thema",
  "konkrete Situation",
  "was gilt",
  "wer entscheidet bzw. informiert",
  "persönliche Bedingungen",
  "wann erneut prüfen",
] as const;
