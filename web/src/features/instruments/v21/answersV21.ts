import { getItemV21, type RegistryItemV21, type MissingCode } from "@/features/instruments/v21/registryV21";

/**
 * Antworten auf das Instrument v2.1 - Form und Prüfung.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER GEPRÜFT WIRD UND WARUM NICHT IN DER DATENBANK
 * ---------------------------------------------------------------------------
 *
 * Die Migration 20261069120000 prüft, was ohne Kenntnis der Frage gilt: eine
 * Mehrfachwahl ist eine Liste verschiedener Kennungen, ein Zeitfenster trägt
 * seine Zeitzone, ein Vorrang steht unter dem Gewählten.
 *
 * Was sie NICHT wissen kann, ist die Frage selbst. Nur die Registratur weiß,
 * dass „keine zusätzliche Absicherung“ in B05 alle anderen Kreuze ausschließt,
 * dass G01 „habe ich noch nicht entschieden“ anbietet und K01 nicht, und dass
 * L02 überhaupt nur erscheint, wenn in L01 eine Grenze steht.
 *
 * Eine Liste dieser Kennungen im SQL wäre die Doppelführung, die beim nächsten
 * Umformulieren auseinanderläuft - lautlos, weil die Zeile stehen bleibt und
 * nur zu keiner Option mehr passt.
 */

export type AlignmentValueV21 =
  | { optionId: string; text?: string }
  | { optionIds: string[]; priorityOptionId?: string; texts?: Record<string, string> }
  | { number: number; unit: string; to?: number; condition?: string }
  | { amount: number; currency: string; to?: number }
  | { perPerson: { person: string; number: number | null; unit: string }[] }
  | { windows: { day: string; from: string; to: string; timezone: string }[] }
  | { date: string }
  | { text: string }
  | { entries: { entryId: string; text: string }[] }
  | { perEntry: Record<string, string> }
  | { importanceA: number; importanceB: number; path: "A" | "B" | "other" | "unknown"; text?: string };

/**
 * Entweder eine Antwort oder ein Grund. Nie beides, nie keins.
 *
 * Als XOR-Typ, damit der Fall gar nicht erst schreibbar ist - die Datenbank
 * weist ihn ohnehin ab, aber ein Fehler, der beim Tippen auffällt, kostet
 * niemanden einen Fehlversuch.
 */
export type AlignmentAnswerV21 =
  | { blockId: string; value: AlignmentValueV21; missingCode?: never }
  | { blockId: string; value?: never; missingCode: MissingCode };

export type AnswerVerdictV21 = { ok: true } | { ok: false; reason: string; detail?: string };

const OK = { ok: true } as const;
const no = (reason: string, detail?: string): AnswerVerdictV21 => ({ ok: false, reason, detail });

/** Welche Auslassungsgründe DIESE Frage anbietet - nicht welche es gibt. */
export function offeredMissingCodesV21(blockId: string): MissingCode[] {
  return getItemV21(blockId)?.missing.map((entry) => entry.code) ?? [];
}

/**
 * Die Option, die alle anderen ausschließt - oder null.
 *
 * Es gibt genau zwei: „keine zusätzliche Absicherung“ (B05) und „ich brauche
 * dafür keine besondere Vorbereitung oder Unterstützung" (G02b). Beide sind
 * keine sechste Möglichkeit neben fünf anderen, sondern die Aussage, dass
 * keine davon zutrifft.
 */
export function exclusiveOptionOf(item: RegistryItemV21): string | null {
  return item.options.find((option) => option.exclusive)?.optionId ?? null;
}

const has = <K extends string>(value: object, key: K): value is Record<K, unknown> => key in value;

export function validateAnswerV21(answer: AlignmentAnswerV21): AnswerVerdictV21 {
  const item = getItemV21(answer.blockId);
  if (!item) return no("unknown_block", answer.blockId);

  if (answer.missingCode !== undefined) {
    if (!offeredMissingCodesV21(answer.blockId).includes(answer.missingCode)) {
      // Ein Grund, den die Frage nicht anbietet, ist entweder ein Fehler in der
      // Oberfläche oder eine Antwort, die jemand hineingeschrieben hat.
      return no("missing_code_not_offered", `${answer.blockId}: ${answer.missingCode}`);
    }
    return OK;
  }

  const value = answer.value as object;
  const optionIds = new Set(item.options.map((option) => option.optionId));

  // Der Antworttext darf nie in die Zeile. Sonst hängt sie nach der ersten
  // Umformulierung in der Luft: Die Zeile bleibt stehen, sie passt nur zu
  // keiner Option mehr.
  if (has(value, "option") || has(value, "options")) {
    return no("option_text_instead_of_id", answer.blockId);
  }

  switch (item.answerFormat) {
    case "ordinal_choice":
    case "single_choice": {
      if (!has(value, "optionId") || typeof value.optionId !== "string") {
        return no("expected_option_id", answer.blockId);
      }
      if (!optionIds.has(value.optionId)) {
        return no("unknown_option", `${answer.blockId}: ${value.optionId}`);
      }
      return requiredTextPresent(item, [value.optionId], value);
    }

    case "multi_choice":
    case "multi_choice_priority": {
      if (!has(value, "optionIds") || !Array.isArray(value.optionIds)) {
        return no("expected_option_ids", answer.blockId);
      }
      const chosen = value.optionIds as string[];
      if (chosen.length === 0) return no("empty_selection", answer.blockId);
      if (new Set(chosen).size !== chosen.length) return no("duplicate_option", answer.blockId);
      for (const id of chosen) {
        if (!optionIds.has(id)) return no("unknown_option", `${answer.blockId}: ${id}`);
      }

      const exclusive = exclusiveOptionOf(item);
      if (exclusive && chosen.includes(exclusive) && chosen.length > 1) {
        // „Keine zusätzliche Absicherung“ neben drei angekreuzten Absicherungen
        // ist kein Sonderfall, sondern ein Widerspruch. Die Oberfläche soll das
        // verhindern; hier fällt es auf, falls sie es nicht tut.
        return no("exclusive_option_with_others", `${answer.blockId}: ${exclusive}`);
      }

      if (has(value, "priorityOptionId") && value.priorityOptionId !== undefined) {
        if (item.answerFormat !== "multi_choice_priority") {
          return no("priority_not_offered", answer.blockId);
        }
        if (!chosen.includes(value.priorityOptionId as string)) {
          return no("priority_not_chosen", `${answer.blockId}: ${value.priorityOptionId}`);
        }
      }
      return requiredTextPresent(item, chosen, value);
    }

    case "value_case": {
      if (!has(value, "importanceA") || !has(value, "importanceB") || !has(value, "path")) {
        return no("incomplete_value_case", answer.blockId);
      }
      for (const key of ["importanceA", "importanceB"] as const) {
        const rating = value[key];
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
          return no("importance_out_of_range", `${answer.blockId}: ${key}`);
        }
      }
      if (!["A", "B", "other", "unknown"].includes(value.path as string)) {
        return no("unknown_path", answer.blockId);
      }
      return OK;
    }

    case "money_range": {
      if (!has(value, "amount") || typeof value.amount !== "number") {
        return no("expected_amount", answer.blockId);
      }
      // Ein Betrag ohne Währung ist keine Angabe: Beträge verschiedener Länder
      // dürfen nicht stillschweigend verglichen werden.
      if (!has(value, "currency") || !String(value.currency).trim()) {
        return no("missing_currency", answer.blockId);
      }
      return OK;
    }

    case "number_range": {
      if (!has(value, "number") || typeof value.number !== "number") {
        return no("expected_number", answer.blockId);
      }
      if (!has(value, "unit") || !String(value.unit).trim()) {
        return no("missing_unit", answer.blockId);
      }
      return OK;
    }

    case "person_number_range": {
      if (!has(value, "perPerson") || !Array.isArray(value.perPerson)) {
        return no("expected_per_person", answer.blockId);
      }
      const rows = value.perPerson as { person?: unknown; number?: unknown; unit?: unknown }[];
      if (rows.length === 0) return no("empty_selection", answer.blockId);
      for (const row of rows) {
        if (typeof row.person !== "string" || !row.person.trim()) {
          return no("person_without_name", answer.blockId);
        }
        // null ist erlaubt: „keine feste Stundenerwartung an diese Person“ ist
        // eine Erwartung und kein Fehlen.
        if (row.number !== null && typeof row.number !== "number") {
          return no("expected_number", `${answer.blockId}: ${row.person}`);
        }
        if (row.number !== null && !String(row.unit ?? "").trim()) {
          return no("missing_unit", `${answer.blockId}: ${row.person}`);
        }
      }
      return OK;
    }

    case "time_windows": {
      if (!has(value, "windows") || !Array.isArray(value.windows)) {
        return no("expected_windows", answer.blockId);
      }
      const windows = value.windows as Record<string, unknown>[];
      if (windows.length === 0) return no("empty_selection", answer.blockId);
      for (const window of windows) {
        for (const key of ["day", "from", "to", "timezone"] as const) {
          if (!String(window[key] ?? "").trim()) {
            return no("incomplete_window", `${answer.blockId}: ${key}`);
          }
        }
      }
      return OK;
    }

    case "date": {
      if (!has(value, "date") || !/^\d{4}-\d{2}-\d{2}$/.test(String(value.date))) {
        return no("expected_date", answer.blockId);
      }
      return OK;
    }

    case "structured_text":
    case "free_text_repeatable": {
      if (item.answerFormat === "structured_text") {
        if (!has(value, "text") || !String(value.text).trim()) {
          return no("empty_text", answer.blockId);
        }
        return OK;
      }
      if (!has(value, "entries") || !Array.isArray(value.entries)) {
        return no("expected_entries", answer.blockId);
      }
      const entries = value.entries as { entryId?: unknown; text?: unknown }[];
      if (entries.length === 0) return no("empty_selection", answer.blockId);
      const seen = new Set<string>();
      for (const entry of entries) {
        // Die Anschlussfragen hängen sich an die Kennung, nicht an den Text -
        // der darf sich noch ändern, ohne die Anschlüsse zu entwurzeln.
        if (typeof entry.entryId !== "string" || !entry.entryId.trim()) {
          return no("entry_without_id", answer.blockId);
        }
        if (seen.has(entry.entryId)) return no("duplicate_entry", answer.blockId);
        seen.add(entry.entryId);
        if (typeof entry.text !== "string" || !entry.text.trim()) {
          return no("empty_text", `${answer.blockId}: ${entry.entryId}`);
        }
      }
      return OK;
    }

    case "free_text_per_entry": {
      if (!has(value, "perEntry") || typeof value.perEntry !== "object" || value.perEntry === null) {
        return no("expected_per_entry", answer.blockId);
      }
      const perEntry = value.perEntry as Record<string, unknown>;
      const keys = Object.keys(perEntry);
      if (keys.length === 0) return no("empty_selection", answer.blockId);
      for (const key of keys) {
        if (typeof perEntry[key] !== "string" || !String(perEntry[key]).trim()) {
          return no("empty_text", `${answer.blockId}: ${key}`);
        }
      }
      return OK;
    }
  }
}

/**
 * Eine Anschlussfrage ohne ihre Voraussetzung ist Unsinn.
 *
 * L02 fragt „an welchem Beispiel ließe sich erkennen, dass DIESE Grenze
 * erreicht ist" - ohne eine Grenze aus L01 gibt es kein „diese“. Und die
 * Bezüge müssen auf Grenzen zeigen, die es noch gibt: Wer in L01 eine Grenze
 * streicht, darf nicht eine Antwort zurücklassen, die ins Leere zeigt.
 */
export function validateFollowUpV21(
  followUp: AlignmentAnswerV21,
  basis: AlignmentAnswerV21 | null,
): AnswerVerdictV21 {
  const item = getItemV21(followUp.blockId);
  if (!item) return no("unknown_block", followUp.blockId);
  if (!item.showWhen) return no("not_a_follow_up", followUp.blockId);

  if (followUp.missingCode !== undefined) return validateAnswerV21(followUp);

  if (!basis || basis.missingCode !== undefined || !basis.value) {
    return no("follow_up_without_basis", followUp.blockId);
  }
  const basisValue = basis.value as object;
  if (!has(basisValue, "entries") || !Array.isArray(basisValue.entries)) {
    return no("follow_up_without_basis", followUp.blockId);
  }
  const known = new Set((basisValue.entries as { entryId: string }[]).map((entry) => entry.entryId));

  const own = validateAnswerV21(followUp);
  if (!own.ok) return own;

  const perEntry = (followUp.value as { perEntry: Record<string, string> }).perEntry;
  for (const key of Object.keys(perEntry)) {
    if (!known.has(key)) return no("follow_up_points_nowhere", `${followUp.blockId}: ${key}`);
  }
  return OK;
}

/**
 * „Bitte beschreiben“ heißt: ohne Beschreibung ist die Option nicht gewählt.
 *
 * Sonst steht später „eine andere Absicherung“ im Bericht und niemand weiß,
 * welche - eine Antwort, die aussieht wie eine Auskunft und keine ist.
 */
function requiredTextPresent(
  item: RegistryItemV21,
  chosen: string[],
  value: object,
): AnswerVerdictV21 {
  for (const id of chosen) {
    const option = item.options.find((entry) => entry.optionId === id);
    if (!option?.requiresText) continue;
    const text = has(value, "texts")
      ? (value.texts as Record<string, string> | undefined)?.[id]
      : has(value, "text") ? (value.text as string) : undefined;
    if (!text || !text.trim()) return no("option_needs_text", `${item.itemId}: ${id}`);
  }
  return OK;
}

/**
 * Ist diese Eingabe schon eine Antwort?
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS NICHT DIESELBE FRAGE IST WIE „IST SIE GÜLTIG“
 * ---------------------------------------------------------------------------
 *
 * Maria am 28.09.2026: „Beim Lokalen ging das auch nicht so richtig mit dem
 * Speichern.“ Der Grund war nicht die Datenbank, sondern dieser Unterschied.
 *
 * Der Autospeicher feuert 600 Millisekunden nach der ersten Eingabe - also
 * mitten hinein. Wer „eine andere Absicherung - bitte beschreiben“ ankreuzt,
 * bekam rot „Bitte beschreibe kurz, was du meinst“, bevor er tippen konnte.
 * Wer beim Wertefall das erste Anliegen bewertete, bekam „bitte beide
 * bewerten“. Wer ein Zeitfenster anfing, bekam „Tag, Uhrzeit und Zeitzone
 * angeben“, während der Cursor noch im Feld stand.
 *
 * Das ist alles technisch richtig und als Auskunft falsch: Eine halbe Eingabe
 * ist kein Fehler, sondern eine halbe Eingabe.
 *
 * Deshalb drei Zustände statt zwei:
 *
 *   `empty`      - nichts drin. Eine bestehende Antwort wird zurückgenommen.
 *   `incomplete` - jemand ist mittendrin. NICHTS passiert: nicht speichern,
 *                  nicht meckern, und vor allem nicht das überschreiben, was
 *                  schon gespeichert ist.
 *   `complete`   - jetzt ist es eine Antwort. Jetzt wird gespeichert.
 *
 * Erst nach `complete` läuft `validateAnswerV21`. Was dort noch scheitert, ist
 * dann wirklich ein Fehler und darf auch so aussehen.
 */
export type Completeness = "empty" | "incomplete" | "complete";

export function completenessV21(
  itemId: string,
  value: Record<string, unknown> | undefined,
): Completeness {
  const item = getItemV21(itemId);
  if (!item || !value) return "empty";

  const filled = (entry: unknown): boolean => {
    if (entry === undefined || entry === null) return false;
    if (typeof entry === "string") return entry.trim() !== "";
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === "object") return Object.keys(entry).length > 0;
    return true;
  };
  const nothing = !Object.values(value).some(filled);

  switch (item.answerFormat) {
    case "ordinal_choice":
    case "single_choice": {
      const optionId = value.optionId as string | undefined;
      if (!optionId) return "empty";
      const option = item.options.find((entry) => entry.optionId === optionId);
      // Angekreuzt, aber der verlangte Text fehlt noch: mittendrin.
      if (option?.requiresText && !String(value.text ?? "").trim()) return "incomplete";
      return "complete";
    }

    case "multi_choice":
    case "multi_choice_priority": {
      const ids = (value.optionIds as string[] | undefined) ?? [];
      if (ids.length === 0) return "empty";
      const texts = (value.texts as Record<string, string> | undefined) ?? {};
      for (const id of ids) {
        const option = item.options.find((entry) => entry.optionId === id);
        if (option?.requiresText && !String(texts[id] ?? "").trim()) return "incomplete";
      }
      return "complete";
    }

    case "value_case": {
      if (nothing) return "empty";
      // Beide Wichtigkeiten UND ein Weg. Wer eins davon hat, ist mittendrin.
      const ready =
        typeof value.importanceA === "number" &&
        typeof value.importanceB === "number" &&
        typeof value.path === "string";
      return ready ? "complete" : "incomplete";
    }

    case "money_range": {
      if (value.amount === undefined || value.amount === null || value.amount === "") return "empty";
      return String(value.currency ?? "").trim() ? "complete" : "incomplete";
    }

    case "number_range": {
      // 0 ist eine mögliche Antwort - das sagt der Hinweis am Item selbst.
      if (typeof value.number !== "number") return "empty";
      return String(value.unit ?? "").trim() ? "complete" : "incomplete";
    }

    case "person_number_range": {
      const rows = (value.perPerson as { person?: string }[] | undefined) ?? [];
      if (rows.length === 0 || rows.every((row) => !String(row.person ?? "").trim())) return "empty";
      // Eine Zeile ohne Namen ist eine angefangene Zeile, kein Fehler.
      return rows.every((row) => String(row.person ?? "").trim()) ? "complete" : "incomplete";
    }

    case "time_windows": {
      const windows = (value.windows as Record<string, unknown>[] | undefined) ?? [];
      const started = windows.filter((window) =>
        ["day", "from", "to"].some((key) => String(window[key] ?? "").trim()));
      if (started.length === 0) return "empty";
      const done = windows.every((window) =>
        ["day", "from", "to", "timezone"].every((key) => String(window[key] ?? "").trim()));
      return done ? "complete" : "incomplete";
    }

    case "date":
      return String(value.date ?? "").trim() ? "complete" : "empty";

    case "structured_text":
      return String(value.text ?? "").trim() ? "complete" : "empty";

    case "free_text_repeatable": {
      const entries = (value.entries as { text?: string }[] | undefined) ?? [];
      const written = entries.filter((entry) => String(entry.text ?? "").trim());
      if (written.length === 0) return "empty";
      // Eine frisch angelegte leere Zeile neben geschriebenen: mittendrin.
      return written.length === entries.length ? "complete" : "incomplete";
    }

    case "free_text_per_entry": {
      const perEntry = (value.perEntry as Record<string, string> | undefined) ?? {};
      const written = Object.values(perEntry).filter((text) => String(text ?? "").trim());
      if (written.length === 0) return "empty";
      return "complete";
    }
  }
}
