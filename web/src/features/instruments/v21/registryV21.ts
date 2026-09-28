import registryJson from "../../../../docs/founder-alignment-registry-v2-1.json";

/**
 * Das Instrument v2.1 als Daten.
 *
 * ---------------------------------------------------------------------------
 * WARUM ES v2.1 GIBT UND NICHT EIN GEÄNDERTES v2
 * ---------------------------------------------------------------------------
 *
 * Am 28.09.2026 kam eine fachliche Durchsicht der v2 zurück. Sie hat mehrere
 * Dinge gefunden, die stimmen - darunter Fehler, die an einem einzigen Tag in
 * die v2 hineingekommen waren:
 *
 *   Die Antwortstufen „bei keiner · bei ein bis zwei · bei etwa der Hälfte ·
 *   bei den meisten · bei allen" sind nicht erschöpfend. Wo klickt jemand bei
 *   drei oder vier von zehn? Und zehn VORGESTELLTE Fälle sind keine Zählung,
 *   sondern eine Scheingenauigkeit.
 *
 *   „Noch einmal genauer hinsehen, bevor du dich für die Zahlen entscheidest"
 *   unterstellt den Ausgang und misst Nachprüfen statt Intuitionsgewicht.
 *
 * Fünf Items entfallen oder ändern ihre Bedeutung (E03, U01, T06, D04 fallen
 * weg; G02 wird geteilt; I03, K01, K02, T03, D01 messen etwas anderes). Das
 * ist keine Umformulierung, sondern ein anderes Instrument - und es bekommt
 * deshalb eine eigene Kennung. Die Alternative wäre, dieselbe ID mit neuer
 * Bedeutung weiterzuführen; genau davor warnt die Durchsicht ausdrücklich.
 *
 * v2 hat nie jemand ausgefüllt. Es wird archiviert, nicht gelöscht.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESE FASSUNG NICHT BEHAUPTET
 * ---------------------------------------------------------------------------
 *
 * Kein Gesamtwert, keine Dimensionswerte, kein Reverse Coding - das steht so
 * in der Quelle selbst (`overall_score: false`, `dimension_scores: false`).
 * Und die Überschriften sind Gesprächsbereiche, keine gemessenen Dimensionen:
 * Zwei Items unter einem Titel ergeben noch keine Skala.
 */

export type MissingCode =
  | "cannot_assess"
  | "undecided"
  | "withheld"
  | "confidential_first"
  | "technical";

/**
 * Die Beschriftung steht AM ITEM, nicht am Code.
 *
 * „Habe ich noch nicht entschieden" (eigener Plan), „kann ich noch nicht
 * entscheiden" (erfundener Fall) und „dazu habe ich noch keine konkrete
 * Angabe" (eigene Grenze) sind derselbe Code und drei verschiedene Sätze. Eine
 * Beschriftung je Code hätte zwei davon falsch gemacht.
 */
export type ItemMissing = { code: MissingCode; label: string };

export type ItemOption = {
  optionId: string;
  label: string;
  requiresText: boolean;
  /** Schließt alle anderen aus - „keine zusätzliche Absicherung". */
  exclusive: boolean;
};

export type AnswerFormatV21 =
  /** Fünf geordnete Stufen. Ordinal - und ausdrücklich keine Intervallskala. */
  | "ordinal_choice"
  /** Eine Wahl ohne Rangfolge: Handlung, Regel, Zeitpunkt. */
  | "single_choice"
  | "multi_choice"
  | "multi_choice_priority"
  | "money_range"
  | "number_range"
  | "person_number_range"
  | "time_windows"
  | "date"
  | "structured_text"
  | "free_text_repeatable"
  | "free_text_per_entry"
  | "value_case";

export type RegistryItemV21 = {
  itemId: string;
  order: number;
  section: string;
  prompt: string;
  hint: string | null;
  answerFormat: AnswerFormatV21;
  options: ItemOption[];
  missing: ItemMissing[];
  /** Was das Item misst und was ausdrücklich nicht - aus der Quelle. */
  note: string;
  scoring: string;
  concerns?: string[];
  ratingOptions?: string[];
  ratingMissing?: string;
  fields?: string[];
  conditionalFields?: string[];
  followup?: Record<string, unknown>;
  repeatPer?: string;
  showWhen?: string;
};

export type RegistryV21 = {
  instrumentId: string;
  registryVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  source: string;
  administration: string;
  notes: string[];
  deviationsFromSource: {
    what: string; source: string; reason: string; decidedBy: string;
  }[];
  sections: string[];
  missingCodes: { code: MissingCode; note: string }[];
  items: RegistryItemV21[];
};

/**
 * Was beim Laden nicht stimmen darf.
 *
 * Dieselbe Strenge wie bei v2, plus die neuen Formate: Ein Wertefall ohne
 * seine beiden Anliegen, eine Mehrfachwahl mit zwei ausschliessenden Optionen
 * oder eine Folgefrage ohne Bedingung sind Fehler, die beim Start auffallen
 * muessen - nicht beim ersten Menschen, der ausfuellt.
 */
export function assertRegistryV21(registry: RegistryV21): RegistryV21 {
  const fail = (message: string): never => {
    throw new Error(`registry_v2_1_invalid: ${message}`);
  };

  const codes = new Set(registry.missingCodes.map((entry) => entry.code));
  const seenItems = new Set<string>();

  for (const item of registry.items) {
    if (seenItems.has(item.itemId)) fail(`doppelte Kennung ${item.itemId}`);
    seenItems.add(item.itemId);

    if (!item.prompt.trim()) fail(`${item.itemId}: kein Fragetext`);
    if (!item.note.trim()) fail(`${item.itemId}: keine Begründung`);
    if (!registry.sections.includes(item.section)) {
      fail(`${item.itemId}: unbekannter Abschnitt ${item.section}`);
    }

    if (item.missing.length === 0) fail(`${item.itemId}: kein Auslassungsgrund`);
    const seenCodes = new Set<string>();
    for (const entry of item.missing) {
      if (!codes.has(entry.code)) fail(`${item.itemId}: unbekannter Grund ${entry.code}`);
      if (!entry.label.trim()) fail(`${item.itemId}: Grund ohne Beschriftung`);
      if (seenCodes.has(entry.code)) fail(`${item.itemId}: ${entry.code} doppelt`);
      seenCodes.add(entry.code);
    }

    const optionIds = item.options.map((option) => option.optionId);
    if (new Set(optionIds).size !== optionIds.length) {
      fail(`${item.itemId}: doppelte Options-Kennung`);
    }
    for (const option of item.options) {
      if (!new RegExp(`^${item.itemId}_o\\d+$`).test(option.optionId)) {
        fail(`${item.itemId}: Options-Kennung passt nicht: ${option.optionId}`);
      }
    }

    const exclusive = item.options.filter((option) => option.exclusive);
    if (exclusive.length > 1) {
      // Zwei Optionen, die alles andere ausschliessen, schliessen einander aus.
      fail(`${item.itemId}: mehr als eine ausschliessende Option`);
    }

    const needsOptions = ["ordinal_choice", "single_choice", "multi_choice",
                          "multi_choice_priority"].includes(item.answerFormat);
    if (needsOptions && item.options.length < 3) {
      fail(`${item.itemId}: zu wenige Optionen`);
    }

    if (item.answerFormat === "value_case") {
      if (item.concerns?.length !== 2) fail(`${item.itemId}: braucht genau zwei Anliegen`);
      if (item.ratingOptions?.length !== 5) fail(`${item.itemId}: braucht fünf Wichtigkeitsstufen`);
      if (!item.ratingMissing?.trim()) fail(`${item.itemId}: Rating ohne Auslassungsgrund`);
    }

    // Eine Frage, die nur nach einer anderen erscheint, muss sagen wann.
    if (item.answerFormat === "free_text_per_entry" && !item.showWhen?.trim()) {
      fail(`${item.itemId}: Folgefrage ohne Bedingung`);
    }
  }

  return registry;
}

export const REGISTRY_V21 = assertRegistryV21(registryJson as unknown as RegistryV21);

export const INSTRUMENT_V21_ID = REGISTRY_V21.instrumentId;

export function getItemsV21(): RegistryItemV21[] {
  return [...REGISTRY_V21.items].sort((a, b) => a.order - b.order);
}

export function getItemV21(itemId: string): RegistryItemV21 | null {
  return REGISTRY_V21.items.find((item) => item.itemId === itemId) ?? null;
}

/** Die Abschnitte in der Reihenfolge des Fragebogens, mit ihren Items. */
export function getSectionsV21(): { section: string; items: RegistryItemV21[] }[] {
  return REGISTRY_V21.sections.map((section) => ({
    section,
    items: getItemsV21().filter((item) => item.section === section),
  }));
}
