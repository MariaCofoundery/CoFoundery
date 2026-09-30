import type { SectionView } from "@/features/instruments/v21/questionnaireDataV21";

type Frage = SectionView["items"][number];

export type Block = {
  /** Die Frage über der Gruppe — `null`, wenn es keine gibt. */
  groupPrompt: string | null;
  items: Frage[];
};

/**
 * Die Fragen eines Bildschirms, zu Blöcken zusammengefasst.
 *
 * ---------------------------------------------------------------------------
 * EIN BLOCK UND NICHT SECHS KARTEN
 * ---------------------------------------------------------------------------
 *
 * Das UX-Review Teil 2 zu den sechs Zielen: „Als gemeinsamer Block
 * darstellen, nicht als sechs große unabhängige Fragekarten." Sechs Kästen mit
 * Rahmen und Abstand sehen aus wie sechs Fragen; es ist eine Frage über sechs
 * Zeilen, und wer sie gegeneinander abwägen soll, muss sie nebeneinander
 * sehen. Teil 1 sagt dasselbe für seine Skalenblöcke.
 *
 * NUR AUFEINANDERFOLGENDE. Zwei Gruppen mit derselben Frage, zwischen denen
 * etwas anderes steht, bleiben zwei Gruppen — sonst würde die Reihenfolge des
 * Bogens beim Anzeigen umsortiert, und die Reihenfolge ist Teil der Fragen.
 */
export function questionBlocks(reihe: Frage[]): Block[] {
  const out: Block[] = [];
  for (const item of reihe) {
    const letzter = out.at(-1);
    if (item.groupPrompt && letzter?.groupPrompt === item.groupPrompt) {
      letzter.items.push(item);
    } else {
      out.push({ groupPrompt: item.groupPrompt ?? null, items: [item] });
    }
  }
  return out;
}
