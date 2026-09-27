import { ALIGNMENT_REGISTRY_V2, getAlignmentItems, type MissingCode } from "@/features/instruments/v2/alignmentRegistryV2";
import { getContextBlocks, getValueCases } from "@/features/instruments/v2/contextRegistryV2";
import {
  answerFormatOfBlock,
  type AlignmentAnswer,
  type StoredAnswerFormat,
} from "@/features/instruments/v2/alignmentAnswersV2";

/**
 * Darf diese Antwort so gespeichert werden?
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS NICHT DIE DATENBANK ERLEDIGEN KANN
 * ---------------------------------------------------------------------------
 *
 * Die Migration prüft, was für JEDE Antwort gilt: ein Wert oder ein Grund,
 * Stufen von 1 bis 5, eine Zahl hat eine Einheit. Was sie nicht wissen kann,
 * ist die Frage selbst.
 *
 * Nur die Registratur weiß, dass R04 „noch nicht einschätzbar" anbietet und
 * A01 nicht. Dass eine Einzelauswahl genau eine der aufgeführten Optionen
 * meint und keine erfundene. Und dass eine Wertekarte überhaupt keinen
 * Auslassungsgrund hat - dort heißt „ich weiß es nicht" `path: "unknown"` und
 * ist eine Antwort, kein Fehlen.
 *
 * WARUM DIESE DATEI KEINE SERVER-ACTION IST. Sie ist eine reine Funktion, und
 * das ist der Punkt: Die Regel, welche Antwort gültig ist, gehört geprüft,
 * ohne dass eine Datenbank läuft. Die Action ruft sie auf, bevor sie schreibt.
 */

export type AnswerRejection = { ok: false; reason: string; detail?: string };
export type AnswerAcceptance = { ok: true };
export type AnswerVerdict = AnswerAcceptance | AnswerRejection;

const OK: AnswerAcceptance = { ok: true };
const no = (reason: string, detail?: string): AnswerRejection => ({ ok: false, reason, detail });

/** Die Beschriftungen, hinter denen ein Auslassungsgrund steht. */
const MISSING_LABELS = new Set(
  ALIGNMENT_REGISTRY_V2.missingCodes
    .map((entry) => entry.label)
    .filter((label): label is string => Boolean(label))
    .concat(["noch nicht festgelegt", "noch nicht einschätzbar"])
);

/**
 * Welche Auslassungsgründe dieser Block anbietet.
 *
 * Für die Präferenzen steht das am Antwortformat, für die Kontextfragen am
 * Block - und für eine Wertekarte ist die Liste LEER. Das ist kein Versehen:
 * „kann ich noch nicht entscheiden" ist dort einer der vier Wege und damit
 * eine Aussage über den Fall, nicht über die eigene Auskunftsbereitschaft.
 */
export function offeredMissingCodes(blockId: string): MissingCode["code"][] {
  const item = getAlignmentItems().find((entry) => entry.itemId === blockId);
  if (item) return ALIGNMENT_REGISTRY_V2.answerFormats[item.answerFormat].offersMissing;

  const block = getContextBlocks().find((entry) => entry.blockId === blockId);
  if (block) return block.missing;

  return [];
}

export function validateAlignmentAnswer(answer: AlignmentAnswer): AnswerVerdict {
  const expected = answerFormatOfBlock(answer.blockId);
  if (!expected) return no("unknown_block", answer.blockId);
  if (answer.answerFormat !== expected) {
    return no("format_mismatch", `${answer.blockId}: erwartet ${expected}, bekommen ${answer.answerFormat}`);
  }

  // ENTWEDER ODER. Dieselbe Regel wie in der Datenbank, hier nur früher.
  const hasValue = answer.value !== undefined && answer.value !== null;
  const hasMissing = answer.missingCode !== undefined && answer.missingCode !== null;
  if (hasValue === hasMissing) return no("value_xor_missing", answer.blockId);

  if (hasMissing) {
    const offered = offeredMissingCodes(answer.blockId);
    // 'technical' darf immer - ein Ausfall fragt nicht um Erlaubnis.
    if (answer.missingCode !== "technical" && !offered.includes(answer.missingCode!)) {
      return no(
        "missing_code_not_offered",
        `${answer.blockId} bietet ${offered.join(", ") || "keinen Auslassungsgrund"} an, nicht ${answer.missingCode}`
      );
    }
    return OK;
  }

  return validateValue(answer.blockId, expected, answer.value as Record<string, unknown>);
}

function validateValue(
  blockId: string,
  format: StoredAnswerFormat,
  value: Record<string, unknown>
): AnswerVerdict {
  if (typeof value !== "object" || Array.isArray(value)) return no("value_not_an_object", blockId);

  // EIN GRUND IST NIE EIN WERT. Spiegel des Checks in der Datenbank, damit die
  // Antwort gar nicht erst losgeschickt wird.
  for (const key of ["option", "text"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && MISSING_LABELS.has(candidate.trim())) {
      return no("missing_reason_as_value", `${blockId}: „${candidate}“ ist ein Grund, kein Wert`);
    }
  }

  const scale = (key: string): AnswerVerdict => {
    const raw = value[key];
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > 5) {
      return no("scale_out_of_range", `${blockId}.${key} = ${String(raw)}`);
    }
    return OK;
  };

  switch (format) {
    case "F":
    case "C":
    case "importance_rating":
      return scale("scale");

    case "single_choice": {
      const block = getContextBlocks().find((entry) => entry.blockId === blockId)!;
      const chosen = block.options.find((option) => option.value === value.option);
      if (!chosen) return no("option_unknown", `${blockId}: ${String(value.option)}`);
      if (chosen.requiresText && !String(value.text ?? "").trim()) {
        return no("option_needs_text", `${blockId}: „${chosen.value}“ verlangt eine Angabe`);
      }
      return OK;
    }

    case "multi_choice": {
      const block = getContextBlocks().find((entry) => entry.blockId === blockId)!;
      const picked = value.options;
      if (!Array.isArray(picked) || picked.length === 0) return no("nothing_picked", blockId);
      if (new Set(picked).size !== picked.length) return no("option_twice", blockId);
      for (const one of picked) {
        const known = block.options.find((option) => option.value === one);
        if (!known) return no("option_unknown", `${blockId}: ${String(one)}`);
        if (known.requiresText && !String(value.text ?? "").trim()) {
          return no("option_needs_text", `${blockId}: „${known.value}“ verlangt eine Angabe`);
        }
      }
      return OK;
    }

    case "free_text":
      return String(value.text ?? "").trim() ? OK : no("text_empty", blockId);

    case "structured_text": {
      const fields = value.fields;
      if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
        return no("fields_missing", blockId);
      }
      const filled = Object.values(fields as Record<string, unknown>)
        .filter((entry) => String(entry ?? "").trim());
      return filled.length > 0 ? OK : no("fields_empty", blockId);
    }

    case "number_range":
    case "person_number_range": {
      if (!String(value.unit ?? "").trim()) return no("unit_missing", blockId);
      if (format === "person_number_range") {
        const per = value.per;
        if (!Array.isArray(per) || per.length === 0) return no("no_recipient", blockId);
        for (const entry of per as Record<string, unknown>[]) {
          if (!String(entry.recipient ?? "").trim()) return no("recipient_missing", blockId);
          const range = checkRange(blockId, entry.min, entry.max);
          if (!range.ok) return range;
        }
        return OK;
      }
      return checkRange(blockId, value.min, value.max);
    }

    case "money_range": {
      if (!String(value.currency ?? "").trim()) return no("currency_missing", blockId);
      if (value.basis !== undefined && value.basis !== "brutto" && value.basis !== "netto") {
        return no("basis_unknown", `${blockId}: ${String(value.basis)}`);
      }
      return checkRange(blockId, value.min, value.max);
    }

    case "time_windows": {
      const windows = value.windows;
      if (!Array.isArray(windows) || windows.length === 0) return no("no_window", blockId);
      for (const entry of windows as Record<string, unknown>[]) {
        if (!Array.isArray(entry.days) || entry.days.length === 0) return no("window_no_day", blockId);
        if (!String(entry.from ?? "").trim() || !String(entry.to ?? "").trim()) {
          return no("window_incomplete", blockId);
        }
      }
      return OK;
    }

    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(String(value.date ?? ""))
        ? OK
        : no("date_malformed", `${blockId}: ${String(value.date)}`);

    case "value_case": {
      const card = getValueCases().find((entry) => entry.caseId === blockId)!;
      // BEIDE ANLIEGEN, GETRENNT. Beide dürfen sehr wichtig sein.
      const a = scale("importanceA");
      if (!a.ok) return a;
      const b = scale("importanceB");
      if (!b.ok) return b;

      const path = card.paths.find((entry) => entry.key === value.path);
      if (!path) return no("path_unknown", `${blockId}: ${String(value.path)}`);
      if (path.requiresText && !String(value.text ?? "").trim()) {
        return no("path_needs_text", `${blockId}: „${path.key}“ verlangt eine Angabe`);
      }
      return OK;
    }
  }
}

/**
 * Eine Zahl oder ein Bereich.
 *
 * DIE NULL IST HIER ERLAUBT, anders als bei den Skalenstufen. „Null Stunden"
 * und „null Euro Verlustbereitschaft" sind echte Antworten - das Gutachten
 * führt sie bei R01, B01 und B03 ausdrücklich als zulässige Angabe auf. Wer
 * sie verbietet, zwingt jemanden, mehr zuzusagen, als er will.
 */
function checkRange(blockId: string, min: unknown, max: unknown): AnswerVerdict {
  if (typeof min !== "number" || !Number.isFinite(min) || min < 0) {
    return no("min_invalid", `${blockId}: ${String(min)}`);
  }
  if (max === undefined || max === null) return OK;
  if (typeof max !== "number" || !Number.isFinite(max)) {
    return no("max_invalid", `${blockId}: ${String(max)}`);
  }
  return max >= min ? OK : no("range_inverted", `${blockId}: ${min} > ${max}`);
}
