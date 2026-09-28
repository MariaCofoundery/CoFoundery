import libraryJson from "../../../../docs/founder-alignment-conversation-v2-1.json";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";
import type { ReadoutValue } from "@/features/instruments/v21/readoutV21";

/**
 * Die Gesprächskarten - aus einer geprüften Bibliothek, nicht erfunden.
 *
 * ---------------------------------------------------------------------------
 * DER VIERSCHRITT
 * ---------------------------------------------------------------------------
 *
 * beobachtete Antwort → mögliche Bedeutung → konkrete Klärungsfrage →
 * überprüfbare Vereinbarung.
 *
 * Die Reihenfolge ist nicht beliebig. Wer mit der Bedeutung anfängt, hat
 * gedeutet, bevor jemand die Antwort gesehen hat - und eine Deutung, die vor
 * ihrem Gegenstand steht, wird nicht mehr geprüft, sondern geglaubt.
 *
 * ---------------------------------------------------------------------------
 * WARUM HIER KEINE KI SCHREIBT
 * ---------------------------------------------------------------------------
 *
 * Eine KI darf Antwortgründe nicht ergänzen, wenn sie nicht erhoben wurden.
 * Der Grund ist nicht Technikskepsis: Ein formulierter Grund liest sich wie
 * eine Beobachtung, auch wenn er geraten ist - und niemand im Gespräch kann
 * ihm ansehen, dass ihn niemand gesagt hat. Eine erfundene Begründung ist
 * schlimmer als gar keine, weil sie die echte Frage verdrängt.
 *
 * ---------------------------------------------------------------------------
 * WAS NICHT GESAGT WERDEN DARF
 * ---------------------------------------------------------------------------
 *
 * Die fachliche Durchsicht nennt es an Beispielen: „Du bist direkter und deine
 * Mitgründerin vermeidet Konflikte“ (Eigenschaftszuschreibung), „Euer
 * Informations-Alignment beträgt 62 %“ (erfundene Zahl), „In diesem Bereich
 * besteht kein Konfliktpotenzial“ (Sicherheitsversprechen). Ein Test prüft
 * jede erzeugte Karte gegen diese Muster.
 */

export type ConversationCardV21 = {
  id: string;
  itemId: string | null;
  section: string | null;
  /** Was tatsächlich geantwortet wurde. Keine Deutung. */
  observed: string;
  /** Eine Möglichkeit, nie eine Tatsache über die Person. */
  meaning: string;
  question: string;
  agreement: string[];
  source: string;
};

type Trigger =
  | { kind: "item_differs"; itemIds: string[] }
  | { kind: "item_partly_same"; itemIds: string[] }
  | { kind: "item_side_by_side"; itemIds: string[] }
  | { kind: "item_same"; itemIds: string[] }
  | { kind: "item_answered"; itemIds: string[] }
  | { kind: "value_case_differs" }
  | { kind: "withheld" }
  | { kind: "marked" };

type LibraryCard = {
  id: string;
  trigger: Trigger;
  observed: string;
  meaning: string;
  question: string;
  agreement: string[];
  source: string;
};

type Library = {
  instrumentId: string;
  forbidden: string[];
  cards: LibraryCard[];
};

export const CARD_LIBRARY_V21 = libraryJson as Library;

/** Die Muster, die in keiner Karte stehen dürfen. */
export function forbiddenPatterns(): string[] {
  return CARD_LIBRARY_V21.forbidden;
}

/**
 * Welche Karten zu diesem Vergleich passen.
 *
 * HÖCHSTENS EINE JE FRAGE, und die Reihenfolge ist die des Fragebogens. Keine
 * Sortierung nach Schwere: Es gibt keinen Schwellwert für „deutlich“ oder
 * „riskant“, und eine Rangfolge würde einen behaupten.
 */
export function buildCardsV21(input: {
  comparison: { section: string; items: ItemComparison[] }[];
  markedItemIds?: readonly string[];
  nameA: string;
  nameB: string;
}): ConversationCardV21[] {
  const marked = new Set(input.markedItemIds ?? []);
  const cards: ConversationCardV21[] = [];
  const used = new Set<string>();

  for (const group of input.comparison) {
    for (const item of group.items) {
      if (used.has(item.itemId)) continue;

      const card = pick(item, marked.has(item.itemId));
      if (!card) continue;

      used.add(item.itemId);
      cards.push({
        id: `${card.id}:${item.itemId}`,
        itemId: item.itemId,
        section: item.section,
        observed: fill(card.observed, item, input.nameA, input.nameB),
        meaning: card.meaning,
        question: card.question,
        agreement: card.agreement,
        source: card.source,
      });
    }
  }

  return cards;
}

function pick(item: ItemComparison, isMarked: boolean): LibraryCard | null {
  const cards = CARD_LIBRARY_V21.cards;
  const forItem = (kind: Trigger["kind"]) =>
    cards.find(
      (card) =>
        card.trigger.kind === kind &&
        "itemIds" in card.trigger &&
        card.trigger.itemIds.includes(item.itemId),
    ) ?? null;

  // Eine Markierung geht vor. Wer sagt „darueber moechte ich sprechen“, hat
  // einen Grund, den kein Vergleich kennt - und der gehoert zuerst gefragt.
  if (isMarked) {
    const marked = cards.find((card) => card.trigger.kind === "marked");
    if (marked) return marked;
  }

  if (item.state === "no_basis") {
    if (item.why?.startsWith("withheld")) {
      return cards.find((card) => card.trigger.kind === "withheld") ?? null;
    }
    // Unbeantwortet bekommt KEINE Karte: Es gibt nichts zu besprechen, was
    // noch niemand gesagt hat.
    return null;
  }

  if (item.state === "different") {
    const wertefall = item.a?.value?.kind === "case" || item.b?.value?.kind === "case";
    if (wertefall) {
      return cards.find((card) => card.trigger.kind === "value_case_differs") ?? null;
    }
    return forItem("item_differs");
  }

  if (item.state === "partly_same") return forItem("item_partly_same");
  if (item.state === "side_by_side") return forItem("item_side_by_side");
  if (item.state === "same") return forItem("item_same");

  return null;
}

/**
 * Die Platzhalter füllen - und nur mit dem, was wirklich dasteht.
 *
 * Bleibt ein Platzhalter ohne Wert, verschwindet er samt Satzteil. Ein „{b}
 * nennt undefined“ wäre schlimmer als ein kürzerer Satz.
 */
function fill(text: string, item: ItemComparison, nameA: string, nameB: string): string {
  const short = (value: ReadoutValue | null | undefined): string | null => {
    if (!value) return null;
    switch (value.kind) {
      case "ordinal":
      case "choice":
        return value.label;
      case "choices":
        return value.labels.join(", ");
      case "case":
        return value.path;
      case "number":
        return `${value.number} ${value.unit}`.trim();
      case "money":
        return `${value.amount.toLocaleString("de-DE")} ${value.currency}`.trim();
      case "date":
        return value.date;
      case "perPerson":
        return value.per
          .map((row) => `${row.person}: ${row.number ?? "keine feste Erwartung"}`)
          .join("; ");
      default:
        return null;
    }
  };

  const labelsOf = (value: ReadoutValue | null | undefined) =>
    value?.kind === "choices" ? value.labels : [];
  const mine = labelsOf(item.a?.value);
  const theirs = labelsOf(item.b?.value);

  const werte: Record<string, string | null> = {
    a: nameA,
    b: nameB,
    aAnswer: short(item.a?.value),
    bAnswer: short(item.b?.value),
    shared: mine.filter((label) => theirs.includes(label)).join(", ") || null,
    aOnly: mine.filter((label) => !theirs.includes(label)).join(", ") || null,
    bOnly: theirs.filter((label) => !mine.includes(label)).join(", ") || null,
  };

  return text
    .split(/(?<=\.)\s+/)
    .map((satz) => {
      const platzhalter = [...satz.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      // Ein Satz, dessen Angabe fehlt, faellt ganz weg - statt mit einer
      // Luecke dazustehen.
      if (platzhalter.some((key) => !werte[key])) return null;
      return satz.replace(/\{(\w+)\}/g, (_, key: string) => werte[key] ?? "");
    })
    .filter((satz): satz is string => satz !== null)
    .join(" ");
}
