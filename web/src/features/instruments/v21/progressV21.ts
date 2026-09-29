import { getItemsV21, getItemV21 } from "@/features/instruments/v21/registryV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

/**
 * Was für eine Abgabe vorliegen muss.
 *
 * ---------------------------------------------------------------------------
 * ES GIBT KEINE ÜBERSPRUNGENE FRAGE
 * ---------------------------------------------------------------------------
 *
 * In v1 war „nicht beantwortet“ ein Zustand ohne Aussage - man wusste nicht,
 * ob jemand die Frage nicht verstanden, nicht gewollt oder nicht gesehen hat.
 * Deshalb musste die Auswertung raten, und Raten hieß meistens: die Mitte.
 *
 * Hier hat jedes Auslassen ein Wort, und ein Test beweist, dass sich jede der
 * 36 Fragen beantworten lässt - notfalls mit einem Grund. Damit wird
 * Vollständigkeit zumutbar und zur Regel. Das ist keine Härte, sondern das
 * Gegenteil: Niemand muss etwas hinschreiben, was er nicht meint, nur um
 * weiterzukommen.
 *
 * ---------------------------------------------------------------------------
 * AUSSER BEI ANSCHLUSSFRAGEN
 * ---------------------------------------------------------------------------
 *
 * L02 und L03 fragen zu jeder in L01 genannten Grenze nach. Wer dort keine
 * Grenze nennt - was erlaubt ist -, bekommt sie gar nicht zu sehen. Sie dann
 * zu verlangen hieße, jemanden für eine zulässige Antwort zu bestrafen.
 */

/** Die Anschlussfragen und die Frage, an der sie hängen. */
const FOLLOW_UPS: Record<string, string> = { L02: "L01", L03: "L01" };

export function basisOf(itemId: string): string | null {
  return FOLLOW_UPS[itemId] ?? null;
}

/** Zeigt die Antwort auf L01 mindestens eine Grenze? */
export function hasEntries(answer: AlignmentAnswerV21 | null | undefined): boolean {
  if (!answer || answer.missingCode !== undefined || !answer.value) return false;
  const value = answer.value as { entries?: unknown };
  return Array.isArray(value.entries) && value.entries.length > 0;
}

/**
 * Welche Fragen jemandem überhaupt gezeigt werden.
 *
 * Hängt vom Stand ab: Ohne eine Grenze in L01 gibt es kein „diese Grenze“.
 */
export function visibleItemIds(answers: Record<string, AlignmentAnswerV21>): string[] {
  return getItemsV21()
    .filter((item) => {
      const basis = basisOf(item.itemId);
      return basis === null || hasEntries(answers[basis]);
    })
    .map((item) => item.itemId);
}

/** Was für eine Abgabe noch fehlt. Leer heißt: kann abgegeben werden. */
export function missingItemIds(answers: Record<string, AlignmentAnswerV21>): string[] {
  return visibleItemIds(answers).filter((itemId) => answers[itemId] === undefined);
}

/**
 * Wie weit jemand ist - zum Anzeigen, nicht zum Bewerten.
 *
 * `of` ist die Zahl der Fragen, die DIESE Person sieht, nicht die 36. Wer in
 * L01 nichts nennt, hat 34 Fragen, und ein Balken, der bei 34 von 36 stehen
 * bleibt, wäre eine Auskunft über etwas, das gar nicht fehlt.
 */
export function progressV21(answers: Record<string, AlignmentAnswerV21>): {
  done: number;
  of: number;
} {
  const visible = visibleItemIds(answers);
  return { done: visible.filter((itemId) => answers[itemId] !== undefined).length, of: visible.length };
}

/**
 * Antworten, die nach einer Änderung ins Leere zeigen.
 *
 * Wer in L01 eine Grenze streicht, lässt eine Antwort auf L02 zurück, die auf
 * nichts mehr zeigt. Sie verschwindet nicht von selbst - und stillschweigend
 * zu löschen, was jemand geschrieben hat, wäre der schlechtere Weg. Also
 * benennen, damit die Oberfläche fragen kann.
 *
 * ---------------------------------------------------------------------------
 * DIE PAARE KOMMEN VON AUSSEN
 * ---------------------------------------------------------------------------
 *
 * Erweitert am 29.09.2026. Vorher stand hier fest, welche Frage auf welcher
 * aufbaut - nach v2.1. Das Venture-Alignment hat dieselbe Stelle (L01 nennt
 * Grenzen, L02 beschreibt sie einzeln), aber die Warnung erschien dort nie:
 * `getItemV21` kannte die Frage nicht, also wurde nichts gemeldet.
 *
 * Ohne Angabe bleibt es bei v2.1 - die Seiten, die darauf zeigen, rufen weiter
 * auf, wie sie es taten.
 */
export function orphanedFollowUps(
  answers: Record<string, AlignmentAnswerV21>,
  /** `{ Anschlussfrage: Grundfrage }` - ohne Angabe die Paare aus v2.1. */
  pairs?: Record<string, string>,
): {
  itemId: string;
  entryIds: string[];
}[] {
  const orphans: { itemId: string; entryIds: string[] }[] = [];

  for (const [itemId, basisId] of Object.entries(pairs ?? FOLLOW_UPS)) {
    const answer = answers[itemId];
    if (!answer || answer.missingCode !== undefined || !answer.value) continue;
    if (!pairs && !getItemV21(itemId)) continue;

    const perEntry = (answer.value as { perEntry?: Record<string, string> }).perEntry;
    if (!perEntry) continue;

    const basis = answers[basisId];
    const known = new Set(
      hasEntries(basis)
        ? ((basis!.value as { entries: { entryId: string }[] }).entries).map((e) => e.entryId)
        : [],
    );
    const lost = Object.keys(perEntry).filter((entryId) => !known.has(entryId));
    if (lost.length > 0) orphans.push({ itemId, entryIds: lost });
  }
  return orphans;
}
