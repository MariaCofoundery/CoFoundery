import englishCards from "./cards.en.json";
import type { AppLocale } from "@/i18n/config";
import { alignmentDisplayText } from "@/features/instruments/align/display";
import libraryJson from "../../../../docs/align-conversation-v1.json";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";
import type { ReadoutValue } from "@/features/instruments/v21/readoutV21";

/**
 * Die Gesprächskarten für beide Bögen.
 *
 * ---------------------------------------------------------------------------
 * DER VIERSCHRITT
 * ---------------------------------------------------------------------------
 *
 * beobachtete Antwort → mögliche Bedeutung → konkrete Klärungsfrage →
 * überprüfbare Vereinbarung. So steht er in Abschnitt 8.2 der
 * Master-Arbeitsfassung.
 *
 * Die Reihenfolge ist nicht beliebig: Wer mit der Bedeutung anfängt, hat
 * gedeutet, bevor jemand die Antwort gesehen hat - und eine Deutung, die vor
 * ihrem Gegenstand steht, wird nicht mehr geprüft, sondern geglaubt.
 *
 * ---------------------------------------------------------------------------
 * WARUM DIE KENNUNGEN NEU SIND
 * ---------------------------------------------------------------------------
 *
 * In v2.1 hieß der Einwand-Zeitpunkt `T03` und die Informationsregel `K02`.
 * In v2.2 sind es `T01` und `K04`, und `G02b` gibt es gar nicht mehr. Eine
 * Karte mit der alten Kennung hätte nie ausgelöst - sie wäre nicht falsch
 * gewesen, sondern unsichtbar, und das ist schlimmer.
 *
 * ---------------------------------------------------------------------------
 * KEINE KI SCHREIBT HIER
 * ---------------------------------------------------------------------------
 *
 * Eine KI darf Antwortgründe nicht ergänzen, wenn sie nicht erhoben wurden.
 * Ein formulierter Grund liest sich wie eine Beobachtung, auch wenn er geraten
 * ist - und niemand im Gespräch kann ihm ansehen, dass ihn niemand gesagt hat.
 */

export type ConversationCard = {
  id: string;
  itemId: string;
  section: string;
  observed: string;
  meaning: string;
  question: string;
  agreement: string[];
  source: string;
};

type Trigger =
  | { kind: "item_differs" | "item_partly_same" | "item_side_by_side"
        | "item_same" | "item_answered"; itemIds: string[] }
  | { kind: "value_case_differs" | "withheld" | "marked" };

type LibraryCard = {
  id: string;
  trigger: Trigger;
  observed: string;
  meaning: string;
  question: string;
  agreement: string[];
  source: string;
};

export const CARD_LIBRARY = libraryJson as {
  instrumentIds: string[];
  forbidden: string[];
  cards: LibraryCard[];
};

export function forbiddenPatterns(): string[] {
  return CARD_LIBRARY.forbidden;
}

/**
 * Welche Karten zu diesem Vergleich passen.
 *
 * HÖCHSTENS EINE JE FRAGE, in der Reihenfolge des Bogens. Keine Sortierung
 * nach Schwere: Es gibt keinen Schwellwert für „deutlich“ oder „riskant“, und
 * eine Rangfolge würde einen behaupten.
 */
export function buildCards(input: {
  comparison: { section: string; items: ItemComparison[] }[];
  markedItemIds?: readonly string[];
  nameA: string;
  nameB: string;
  locale?: AppLocale;
}): ConversationCard[] {
  const locale = input.locale ?? "de";
  const marked = new Set(input.markedItemIds ?? []);
  const cards: ConversationCard[] = [];
  const used = new Set<string>();

  for (const group of input.comparison) {
    for (const item of group.items) {
      if (used.has(item.itemId)) continue;
      const selected = pick(item, marked.has(item.itemId));
      const card = selected && locale === "en" ? { ...selected, ...(englishCards as Record<string, Omit<LibraryCard, "id" | "trigger">>)[selected.id] } : selected;
      if (!card) continue;

      used.add(item.itemId);
      cards.push({
        id: `${card.id}:${item.itemId}`,
        itemId: item.itemId,
        section: alignmentDisplayText(item.section, locale),
        observed: fill(card.observed, item, input.nameA, input.nameB, locale),
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
  const cards = CARD_LIBRARY.cards;
  const forItem = (kind: string) =>
    cards.find(
      (card) =>
        card.trigger.kind === kind &&
        "itemIds" in card.trigger &&
        card.trigger.itemIds.includes(item.itemId),
    ) ?? null;

  // Eine Markierung geht vor: Wer sagt „darueber moechte ich sprechen“, hat
  // einen Grund, den kein Vergleich kennt.
  if (isMarked) {
    const markiert = cards.find((card) => card.trigger.kind === "marked");
    if (markiert) return markiert;
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
 * Bleibt ein Platzhalter ohne Wert, verschwindet der ganze Satz. Ein „{b}
 * nennt undefined“ wäre schlimmer als ein kürzerer Text.
 */
function fill(text: string, item: ItemComparison, nameA: string, nameB: string, locale: AppLocale): string {
  const short = (value: ReadoutValue | null | undefined): string | null => {
    if (!value) return null;
    switch (value.kind) {
      case "ordinal":
      case "choice":
        return alignmentDisplayText(value.label, locale);
      case "choices":
        return value.labels.map(v => alignmentDisplayText(v, locale)).join(", ");
      case "case":
        return alignmentDisplayText(value.path, locale);
      case "number":
        return `${value.number} ${alignmentDisplayText(value.unit, locale)}`.trim();
      case "money":
        return `${value.amount.toLocaleString(locale === "en" ? "en-US" : "de-DE")} ${value.currency}`.trim();
      case "date":
        return value.date;
      case "perPerson":
        return value.per
          .map((row) => `${row.person}: ${row.number ?? alignmentDisplayText("keine feste Erwartung", locale)}`)
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
    shared: mine.filter((label) => theirs.includes(label)).map(label => alignmentDisplayText(label, locale)).join(", ") || null,
    aOnly: mine.filter((label) => !theirs.includes(label)).map(label => alignmentDisplayText(label, locale)).join(", ") || null,
    bOnly: theirs.filter((label) => !mine.includes(label)).map(label => alignmentDisplayText(label, locale)).join(", ") || null,
  };

  return text
    .split(/(?<=\.)\s+/)
    .map((satz) => {
      const platzhalter = [...satz.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      if (platzhalter.some((key) => !werte[key])) return null;
      return satz.replace(/\{(\w+)\}/g, (_, key: string) => werte[key] ?? "");
    })
    .filter((satz): satz is string => satz !== null)
    .join(" ");
}
