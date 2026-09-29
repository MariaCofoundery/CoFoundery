import registryJson from "../../../../docs/founder-alignment-registry-v2-2.json";

/**
 * Das Instrument v2.2 als Daten.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES v2.2 GIBT
 * ---------------------------------------------------------------------------
 *
 * Die Master-Arbeitsfassung v0.2 vom 29.09.2026 hat die bisherigen
 * Arbeitsfassungen zusammengeführt - und dabei ANDERE KENNUNGEN vergeben als
 * v2.1. In zwei Fällen dieselbe Kennung für eine andere Frage:
 *
 *   `U04` hieß in v2.1 „entscheiden, ohne Zustimmung einzuholen“ und heißt
 *   hier „auswählen, welchen Weg du gehst“.
 *   `K02` gab es in v2.1 als Informationsregel; die steht hier unter `K04`.
 *
 * Eine gespeicherte Antwort merkt sich die Kennung. Dieselbe Kennung mit neuer
 * Bedeutung heißt: Alte Antworten bedeuten etwas anderes, ohne dass es jemand
 * merkt. Genau deshalb gibt es eine neue Fassung statt einer Korrektur - zum
 * zweiten Mal, aus demselben Grund.
 *
 * v2 und v2.1 werden archiviert. Nicht gelöscht: Die Kennung steht in
 * `alignment_answers` als Fremdschlüssel, und wer seinen Fragebogen ausgefüllt
 * hat, soll ihn weiter lesen können.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESE FASSUNG NICHT BEHAUPTET
 * ---------------------------------------------------------------------------
 *
 * Kein Gesamtwert, keine Dimensionswerte. Die Quelle sagt es selbst
 * (Abschnitt 8.1): „geordnete Kategorien dürfen intern codiert, aber nicht
 * automatisch als psychologische Messwerte ausgegeben werden“.
 *
 * Und ausdrücklich: A und I werden niemals zu einem
 * Analytisch-gegen-Intuitiv-Wert verschmolzen. Beide können gleichzeitig hoch
 * sein - eine Achse dazwischen wäre eine erfundene Gegensätzlichkeit.
 */

export type MissingCode =
  | "cannot_assess"
  | "undecided"
  | "withheld"
  | "confidential_first"
  | "technical";

export type AnswerFormatV22 =
  /** Fünf geordnete Stufen. Ordinal - und ausdrücklich keine Intervallskala. */
  | "ordinal_choice"
  /** Eine Wahl ohne Rangfolge: Handlung, Regel, Zeitpunkt. */
  | "single_choice"
  | "multi_choice"
  | "money_range"
  | "number_range"
  | "person_number_range"
  | "time_windows"
  | "structured_text"
  | "free_text_repeatable"
  | "free_text_per_entry"
  | "value_case";

export type ItemOptionV22 = {
  optionId: string;
  label: string;
  requiresText: boolean;
  exclusive: boolean;
};

export type RegistryItemV22 = {
  itemId: string;
  order: number;
  section: string;
  prompt: string;
  hint: string | null;
  answerFormat: AnswerFormatV22;
  options: ItemOptionV22[];
  /** Die Beschriftung steht am Item, nicht am Code. */
  missing: { code: MissingCode; label: string }[];
  note: string;
  concerns?: string[];
  paths?: string[];
  ratingOptions?: string[];
  ratingMissing?: string;
  followUpQuestion?: string;
  /** Erscheint erst, wenn diese Frage beantwortet ist. */
  showAfter?: string;
};

export type RegistryV22 = {
  instrumentId: string;
  registryVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  source: string;
  overallScore: false;
  dimensionScores: false;
  deviationsFromSource: { what: string; source: string; reason: string; decidedBy: string }[];
  notes: string[];
  sections: string[];
  items: RegistryItemV22[];
};

/**
 * Was beim Laden nicht stimmen darf.
 *
 * Ein Wertefall ohne seine beiden Anliegen, eine Frage ohne Ausweg oder eine
 * Anschlussfrage ohne Voraussetzung sind Fehler, die beim Start auffallen
 * müssen - nicht beim ersten Menschen, der ausfüllt.
 */
export function assertRegistryV22(registry: RegistryV22): RegistryV22 {
  const fail = (message: string): never => {
    throw new Error(`registry_v2_2_invalid: ${message}`);
  };

  // KEINE ZAHL, NIRGENDS. Die Entscheidung vom 29.09.2026 steht hier als
  // Prüfung und nicht nur als Vorsatz.
  if (registry.overallScore !== false || registry.dimensionScores !== false) {
    fail("die Fassung behauptet einen Gesamt- oder Dimensionswert");
  }

  const seen = new Set<string>();
  const known = new Set(registry.items.map((item) => item.itemId));

  for (const item of registry.items) {
    if (seen.has(item.itemId)) fail(`doppelte Kennung ${item.itemId}`);
    seen.add(item.itemId);

    if (!item.prompt.trim()) fail(`${item.itemId}: kein Fragetext`);
    if (!registry.sections.includes(item.section)) {
      fail(`${item.itemId}: unbekannter Abschnitt ${item.section}`);
    }

    // Jede Frage lässt sich auslassen. Ohne Ausweg muss jemand etwas
    // ankreuzen, das er nicht meint - daran ist v1 gescheitert.
    if (item.missing.length === 0) fail(`${item.itemId}: kein Auslassungsgrund`);
    for (const entry of item.missing) {
      if (!entry.label.trim()) fail(`${item.itemId}: Grund ohne Beschriftung`);
    }

    const ids = item.options.map((option) => option.optionId);
    if (new Set(ids).size !== ids.length) fail(`${item.itemId}: doppelte Options-Kennung`);
    for (const option of item.options) {
      if (!new RegExp(`^${item.itemId}_o\\d+$`).test(option.optionId)) {
        fail(`${item.itemId}: Options-Kennung passt nicht: ${option.optionId}`);
      }
    }
    if (item.options.filter((option) => option.exclusive).length > 1) {
      // Zwei Optionen, die alles andere ausschließen, schließen einander aus.
      fail(`${item.itemId}: mehr als eine ausschließende Option`);
    }

    // ZWEI, NICHT DREI. R12 fragt "Datum oder nach dem naechsten Meilenstein"
    // und hat damit genau zwei sinnvolle Antworten. Eine Mindestzahl von drei
    // waere eine Formvorschrift, die eine richtige Frage abweist.
    const braucht = ["ordinal_choice", "single_choice", "multi_choice"];
    if (braucht.includes(item.answerFormat) && item.options.length < 2) {
      fail(`${item.itemId}: zu wenige Optionen`);
    }

    if (item.answerFormat === "value_case") {
      if (item.concerns?.length !== 2) fail(`${item.itemId}: braucht genau zwei Anliegen`);
      if (item.paths?.length !== 2) fail(`${item.itemId}: braucht genau zwei Wege`);
      if (item.ratingOptions?.length !== 5) fail(`${item.itemId}: braucht fünf Wichtigkeitsstufen`);
    }

    if (item.showAfter && !known.has(item.showAfter)) {
      fail(`${item.itemId}: hängt an ${item.showAfter}, das es nicht gibt`);
    }
  }

  return registry;
}

export const REGISTRY_V22 = assertRegistryV22(registryJson as unknown as RegistryV22);

export const INSTRUMENT_V22_ID = REGISTRY_V22.instrumentId;

export function getItemsV22(): RegistryItemV22[] {
  return [...REGISTRY_V22.items].sort((a, b) => a.order - b.order);
}

export function getItemV22(itemId: string): RegistryItemV22 | null {
  return REGISTRY_V22.items.find((item) => item.itemId === itemId) ?? null;
}

export function getSectionsV22(): { section: string; items: RegistryItemV22[] }[] {
  return REGISTRY_V22.sections.map((section) => ({
    section,
    items: getItemsV22().filter((item) => item.section === section),
  }));
}
