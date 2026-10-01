import { FOUNDER_PROFILE } from "@/features/instruments/align/registries";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

/**
 * Was sich in den Antworten zeigt — beschrieben, nicht bewertet.
 *
 * ---------------------------------------------------------------------------
 * DIE EBENE, DIE GEFEHLT HAT
 * ---------------------------------------------------------------------------
 *
 * Zwischen der Punktekarte und den sechzehn Einzelantworten lag nichts. Die
 * Karte zeigt Stellen auf Achsen, die Liste zeigt Fragen und Antworten —
 * beides stimmt, und beides beantwortet nicht die Frage, die ein Mensch hat:
 * *Was heisst das jetzt?*
 *
 * ---------------------------------------------------------------------------
 * WAS DAS HIER NICHT IST
 * ---------------------------------------------------------------------------
 *
 *   Keine Punktzahl, kein Mittelwert, kein Normvergleich. Es wird nichts
 *   addiert und nichts geteilt: Eine Stufe ist eine gewaehlte Beschriftung
 *   und kein Messwert, und zwei Beschriftungen ergeben keine dritte.
 *
 *   Keine Typologie. Es faellt nirgends ein Satz der Form „du bist X".
 *
 *   Keine Wiederbelebung der sechs v1-Dimensionen. Die alte Auswertung
 *   („Unternehmenslogik", „Commitment", „Risiko") bleibt Altbestand; diese
 *   Beschreibung entsteht ausschliesslich aus `founder-profile-v1`.
 *
 *   Kein Modell. Dieselben Antworten ergeben immer denselben Text - sonst
 *   waere es keine Beschreibung, sondern eine Meinung, die sich aendert.
 *
 * ---------------------------------------------------------------------------
 * UND VOR ALLEM: ES WIRD NICHT GLATTGEBUEGELT
 * ---------------------------------------------------------------------------
 *
 * Wer seinem ersten Eindruck wenig Gewicht gibt, aber ein Bauchgefuehl gegen
 * die Zahlen sehr ernst nimmt, ist nicht „wenig intuitiv". Das sind zwei
 * verschiedene Lagen mit zwei verschiedenen Antworten, und genau das soll
 * dastehen.
 *
 * Deshalb die Regel unten: Antworten eines Themas werden nach ihrer Stufe
 * gruppiert, und eine Gruppe aus einer einzigen Antwort bekommt IHREN eigenen
 * Satz statt einen ueber das Thema. Zusammengefasst wird nur, was auch
 * zusammen ausgefallen ist.
 */

export const WORK_THEMES = [
  "weighing",
  "experience",
  "trying",
  "differences",
  "openQuestions",
] as const;
export type WorkTheme = (typeof WORK_THEMES)[number];

/**
 * Welche Fragen zu welchem Thema gehoeren.
 *
 * Die internen Kennungen bleiben die der Registratur. Was ein Mensch liest,
 * ist der Themenname daneben - die Registratur heisst weiterhin
 * „A – Analytische Pruefung", und daran wird nichts geaendert.
 */
export const ITEMS_OF_THEME: Record<WorkTheme, readonly string[]> = {
  weighing: ["A01", "A02"],
  experience: ["I01", "I02", "I03"],
  trying: ["E01", "E02", "E03"],
  differences: ["T01", "T02", "D01", "D02"],
  openQuestions: ["X01", "X02", "X03", "X04"],
};

/**
 * Welche Fragen eine Reihenfolge haben — und welche nicht.
 *
 * GEPRUEFT GEGEN DIE REGISTRATUR AM 01.10.2026, nicht gegen eine Spezifikation:
 * dreizehn `ordinal_choice`, drei `single_choice`.
 *
 * T01 sieht nach einer Reihenfolge aus („noch im Gespraech" … „nach mehr als
 * einem Arbeitstag") und ist trotzdem keine: Die fuenfte Antwort heisst
 * „situationsabhaengig" und liegt nirgends auf dieser Zeitachse. Sie als
 * spaeteste Stufe zu zaehlen waere schlicht falsch, und ohne sie waere die
 * Skala eine andere als die, die zur Wahl stand.
 *
 * T02 und D01 sind Handlungs- und Formulierungswahlen ohne jede Ordnung.
 *
 * Darum beschreibt diese Datei sie als das, was sie sind: als gewaehlte
 * Antwort, im Wortlaut der Person.
 */
export const NOMINAL_ITEMS = ["T01", "T02", "D01"] as const;

export function isNominalItem(itemId: string) {
  return (NOMINAL_ITEMS as readonly string[]).includes(itemId);
}

/** Alle Fragen des Arbeitsprofils - fuer Oberflaechen, die beide Boegen zeigen. */
export const WORK_PROFILE_ITEM_IDS: ReadonlySet<string> = new Set(
  Object.values(ITEMS_OF_THEME).flat()
);

/**
 * Zu welchem Thema eine Frage gehoert.
 *
 * Gebraucht von der Punktekarte: Sie zeigt die Abschnittsnamen der
 * Registratur („A – Analytische Pruefung"), und daneben soll der Name stehen,
 * den ein Mensch liest. Die Registratur selbst bleibt unveraendert - sie
 * braucht ihre technischen Namen.
 */
export function themeOfItem(itemId: string): WorkTheme | null {
  for (const theme of WORK_THEMES) {
    if (ITEMS_OF_THEME[theme].includes(itemId)) return theme;
  }
  return null;
}

/**
 * Drei Lagen statt fuenf Stufen.
 *
 * KEIN MESSWERT UND KEINE ZUSAMMENFASSUNG MEHRERER ANTWORTEN. Eine Lage sagt
 * nur, in welchem Drittel der angebotenen Stufen die gewaehlte liegt - sie
 * fasst eine einzelne Antwort zusammen, damit ein Satz darueber ueberhaupt
 * formulierbar ist. „selten" und „nie" verlangen nicht zwei verschiedene
 * Beschreibungen.
 *
 * Die Mitte bleibt eine eigene Lage. Sie in eine der beiden Seiten zu ziehen
 * waere eine Entscheidung, die die Person nicht getroffen hat.
 */
export const BANDS = ["low", "middle", "high"] as const;
export type Band = (typeof BANDS)[number];

export function bandOf(position: number, of: number): Band {
  if (of <= 1) return "middle";
  const anteil = (position - 1) / (of - 1);
  if (anteil < 0.4) return "low";
  if (anteil > 0.6) return "high";
  return "middle";
}

export type SynthesisStatement =
  /** Mehrere Antworten desselben Themas sind zusammen ausgefallen. */
  | { kind: "theme"; theme: WorkTheme; band: Band; itemIds: string[] }
  /** Eine einzelne Antwort, die anders ausfiel als die anderen. */
  | { kind: "item"; theme: WorkTheme; itemId: string; band: Band }
  /** Eine Wahl ohne Rangfolge, im Wortlaut der Antwort. */
  | { kind: "choice"; theme: WorkTheme; itemId: string; optionIndex: number }
  /** Zu wenig beantwortet, um etwas zusammenhaengend zu beschreiben. */
  | { kind: "tooFew"; theme: WorkTheme };

export type ThemeSynthesis = {
  theme: WorkTheme;
  statements: SynthesisStatement[];
  /** Wie viele Fragen dieses Themas beantwortet sind, von wie vielen sichtbaren. */
  answered: number;
  of: number;
};

type Gelesen = {
  itemId: string;
  band: Band | null;
  optionIndex: number | null;
};

/** Wo eine gewaehlte Antwort in der Optionsliste der Registratur steht. */
function optionIndexOf(itemId: string, label: string): number | null {
  const item = FOUNDER_PROFILE.items.find((eintrag) => eintrag.itemId === itemId);
  const index = item?.options?.findIndex((option) => option.label === label) ?? -1;
  return index >= 0 ? index : null;
}

/**
 * Was aus einer Antwort fuer die Beschreibung verwertbar ist.
 *
 * EIN AUSLASSUNGSGRUND IST KEINE ANTWORT. „Kann ich noch nicht einschaetzen"
 * ist eine vollwertige Auskunft, aber keine ueber die Arbeitsweise - sie wird
 * nicht als Mitte gelesen und zaehlt in keiner Gruppe mit. Ueber eine Frage,
 * die niemand beantwortet hat, steht hier nichts.
 */
function lies(entry: ReadoutEntry): Gelesen | null {
  if (!entry.value) return null;

  if (entry.value.kind === "ordinal") {
    return {
      itemId: entry.itemId,
      band: bandOf(entry.value.position, entry.value.of),
      optionIndex: null,
    };
  }

  if (entry.value.kind === "choice") {
    const index = optionIndexOf(entry.itemId, entry.value.label);
    return index === null ? null : { itemId: entry.itemId, band: null, optionIndex: index };
  }

  return null;
}

/**
 * Die Beschreibung je Thema.
 *
 * ---------------------------------------------------------------------------
 * DIE REGEL
 * ---------------------------------------------------------------------------
 *
 * 1. Die beantworteten geordneten Fragen des Themas werden nach ihrer Lage
 *    gruppiert.
 * 2. Eine Gruppe mit ZWEI ODER MEHR Fragen bekommt einen Satz ueber das Thema
 *    in dieser Lage. Was zusammen ausgefallen ist, darf zusammen beschrieben
 *    werden.
 * 3. Eine Gruppe mit GENAU EINER Frage bekommt den Satz dieser Frage. Aus
 *    einer einzelnen Antwort wird nichts ueber ein Thema abgeleitet.
 * 4. Die Wahlen ohne Rangfolge stehen danach einzeln, im Wortlaut der
 *    gewaehlten Antwort.
 *
 * Damit entsteht bei einheitlichen Antworten EIN Satz und bei
 * auseinanderliegenden genau so viele, wie es verschiedene Lagen gibt.
 *
 * ---------------------------------------------------------------------------
 * ES GIBT HIER KEINE EINGABE AUSSER DEN ANTWORTEN
 * ---------------------------------------------------------------------------
 *
 * Die Funktion bekommt genau die Abschnitte, die der Aufrufer sehen darf. Eine
 * Advisor-Ansicht reicht die gefilterten Abschnitte herein und bekommt eine
 * Beschreibung ueber genau diese - es gibt keinen Weg, ueber eine
 * Zusammenfassung mehr zu erfahren als ueber die Antworten selbst.
 */
export function synthesiseWorkProfile(
  sections: { section: string; entries: ReadoutEntry[] }[]
): ThemeSynthesis[] {
  const nachId = new Map<string, ReadoutEntry>();
  for (const group of sections) {
    for (const entry of group.entries) nachId.set(entry.itemId, entry);
  }

  return WORK_THEMES.map((theme) => {
    const ids = ITEMS_OF_THEME[theme];
    const sichtbar = ids.filter((id) => nachId.has(id));
    const gelesen = sichtbar
      .map((id) => lies(nachId.get(id)!))
      .filter((wert): wert is Gelesen => wert !== null);

    const statements: SynthesisStatement[] = [];

    // Die geordneten Antworten, nach Lage gruppiert - in der Reihenfolge, in
    // der die Fragen gestellt wurden, nicht nach Groesse der Gruppe.
    const nachLage = new Map<Band, string[]>();
    for (const wert of gelesen) {
      if (!wert.band) continue;
      nachLage.set(wert.band, [...(nachLage.get(wert.band) ?? []), wert.itemId]);
    }
    const gruppen = [...nachLage.entries()].sort(
      (a, b) => ids.indexOf(a[1][0]) - ids.indexOf(b[1][0])
    );

    for (const [band, itemIds] of gruppen) {
      if (itemIds.length >= 2) statements.push({ kind: "theme", theme, band, itemIds });
      else statements.push({ kind: "item", theme, itemId: itemIds[0], band });
    }

    // Danach die Wahlen ohne Rangfolge, in Fragereihenfolge.
    for (const wert of gelesen) {
      if (wert.optionIndex === null) continue;
      statements.push({
        kind: "choice",
        theme,
        itemId: wert.itemId,
        optionIndex: wert.optionIndex,
      });
    }

    if (statements.length === 0) statements.push({ kind: "tooFew", theme });

    return { theme, statements, answered: gelesen.length, of: sichtbar.length };
  }).filter((eintrag) => eintrag.of > 0);
}
