import {
  getItemV21,
  getItemsV21,
  REGISTRY_V21,
  type RegistryItemV21,
  type MissingCode,
} from "@/features/instruments/v21/registryV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";

/**
 * Was jemand geantwortet hat - lesbar gemacht, nicht ausgewertet.
 *
 * ---------------------------------------------------------------------------
 * DIE WICHTIGSTE REGEL
 * ---------------------------------------------------------------------------
 *
 * Für eine Fünferantwort kommt hier NIE eine Zahl heraus, die wie ein Wert
 * aussieht. Es kommt die Beschriftung („manchmal“) und die Stelle in der
 * Reihenfolge (3 von 5) - und die Stelle heißt `position` und nicht `value`,
 * damit niemand versucht, damit zu rechnen.
 *
 * WARUM SO STRENG. Eine 3 sieht aus wie eine Zahl, also wird sie addiert. Dann
 * gemittelt. Dann verglichen. Dann steht im Bericht „ihr liegt 1,4
 * auseinander“, und niemand kann mehr sagen, was das bedeutet - weil es nichts
 * bedeutet. Genau diesen Weg ist v1 gegangen.
 *
 * ---------------------------------------------------------------------------
 * ORDINAL UND NOMINAL BLEIBEN GETRENNT
 * ---------------------------------------------------------------------------
 *
 * `ordinal` bekommt eine Position, `choice` nicht. K01 fragt, wann jemand
 * einen Zwischenstand zeigt - die letzte Antwort („je nach Aufgabe
 * unterschiedlich“) steht neben der Reihenfolge, nicht an ihrem Ende. Eine
 * Position dafür auszugeben hieße zu behaupten, sie sei „später“ als „wenn es
 * fertig ist“. Sie ist etwas anderes.
 *
 * ---------------------------------------------------------------------------
 * EIN AUSLASSUNGSGRUND IST EINE AUSKUNFT, KEINE LÜCKE
 * ---------------------------------------------------------------------------
 *
 * Er erscheint mit seinem eigenen Satz - „habe ich noch nicht entschieden“ -
 * und nicht als leeres Feld. Das ist der Unterschied zu v1, wo aus einer
 * Auslassung stillschweigend die Mitte wurde.
 */

export type ReadoutValue =
  /** Geordnete Stufen: Beschriftung und Stelle. Die Stelle ist KEIN Messwert. */
  | { kind: "ordinal"; label: string; position: number; of: number }
  /** Eine Wahl ohne Rangfolge. Bewusst ohne Position. */
  | { kind: "choice"; label: string; text: string | null }
  | { kind: "choices"; labels: string[]; priority: string | null; texts: string[] }
  | { kind: "text"; text: string }
  | { kind: "entries"; entries: { entryId: string; text: string }[] }
  | { kind: "perEntry"; entries: { about: string; text: string }[] }
  | { kind: "number"; number: number; unit: string; condition: string | null }
  | { kind: "money"; amount: number; currency: string }
  | { kind: "perPerson"; per: { person: string; number: number | null; unit: string }[] }
  | { kind: "windows"; windows: { day: string; from: string; to: string; timezone: string }[] }
  | { kind: "date"; date: string }
  | {
      kind: "case";
      concerns: { label: string; importance: { label: string; position: number; of: number } }[];
      path: string;
    };

export type ReadoutEntry = {
  itemId: string;
  section: string;
  prompt: string;
  /** Entweder eine Antwort oder ein benannter Grund. Nie beides, nie keins. */
  value: ReadoutValue | null;
  missing: { code: MissingCode; label: string } | null;
};

/**
 * Warum das nicht wirft, wenn etwas nicht passt.
 *
 * Ein Bericht, der wegen einer einzigen unlesbaren Zeile gar nicht erscheint,
 * ist schlechter als einer, der diese eine Zeile als unlesbar ausweist. Das
 * darf aber nicht stillschweigend geschehen - deshalb `null` und nicht ein
 * erfundener Platzhalter, und die Oberfläche sagt es dazu.
 */
/**
 * Die Frage, wie sie zum Lesen gebraucht wird.
 *
 * Hereingereicht, damit die beiden neuen Bögen (Arbeitsprofil,
 * Venture-Alignment) dieselbe Lesbarmachung benutzen können. Eine zweite
 * Kopie würde nach dem ersten Unterschied auseinanderlaufen - und zwar
 * lautlos, weil beide richtig aussehen.
 */
export type ReadableItem = {
  itemId: string;
  section: string;
  prompt: string;
  answerFormat: string;
  options: { optionId: string; label: string }[];
  missing: { code: MissingCode; label: string }[];
  concerns?: string[];
  /** Die beiden Wege — ohne sie stand im Bericht ein Anliegen als Weg. */
  paths?: string[];
  ratingOptions?: string[];
};

export function readAnswer(
  answer: AlignmentAnswerV21,
  basisEntries: { entryId: string; text: string }[] = [],
  known?: ReadableItem,
): ReadoutEntry | null {
  const item = (known ?? getItemV21(answer.blockId)) as ReadableItem | null;
  if (!item) return null;

  const base = { itemId: item.itemId, section: item.section, prompt: item.prompt };

  if (answer.missingCode !== undefined) {
    const missing = item.missing.find((entry) => entry.code === answer.missingCode);
    // Ein Grund, den diese Frage nicht anbietet, ist keine Auskunft, sondern
    // ein Fehler - und wird nicht mit einer erfundenen Beschriftung geglättet.
    if (!missing) return { ...base, value: null, missing: null };
    return { ...base, value: null, missing };
  }

  return { ...base, value: valueOf(item, answer.value as Record<string, unknown>, basisEntries), missing: null };
}

function valueOf(
  item: ReadableItem,
  value: Record<string, unknown>,
  basisEntries: { entryId: string; text: string }[],
): ReadoutValue | null {
  const labelOf = (optionId: string) =>
    item.options.find((option) => option.optionId === optionId)?.label ?? null;

  switch (item.answerFormat) {
    case "ordinal_choice": {
      const label = labelOf(value.optionId as string);
      if (!label) return null;
      const position = item.options.findIndex((o) => o.optionId === value.optionId) + 1;
      return { kind: "ordinal", label, position, of: item.options.length };
    }

    case "single_choice": {
      const label = labelOf(value.optionId as string);
      if (!label) return null;
      // Keine Position. Eine Handlungswahl hat keine Reihenfolge, und eine
      // auszugeben wäre eine Behauptung über Nähe, die es nicht gibt.
      return { kind: "choice", label, text: (value.text as string) ?? null };
    }

    case "multi_choice":
    case "multi_choice_priority": {
      const ids = (value.optionIds as string[] | undefined) ?? [];
      const labels = ids.map(labelOf).filter((label): label is string => label !== null);
      if (labels.length === 0) return null;
      const texts = Object.values((value.texts as Record<string, string> | undefined) ?? {})
        .filter((text) => text.trim() !== "");
      return {
        kind: "choices",
        labels,
        priority: value.priorityOptionId ? labelOf(value.priorityOptionId as string) : null,
        texts,
      };
    }

    case "value_case": {
      const stufen = item.ratingOptions ?? [];
      const concerns = (item.concerns ?? []).map((label, index) => {
        const rank = value[index === 0 ? "importanceA" : "importanceB"] as number;
        return {
          label,
          importance: { label: stufen[rank - 1] ?? String(rank), position: rank, of: stufen.length },
        };
      });
      // DER GEWAEHLTE WEG UND NICHT DAS ANLIEGEN. „Welchen Weg wuerdest du
      // zuerst waehlen?" wurde mit „frueh wissen, wie sich die finanzielle
      // Situation entwickeln koennte" beantwortet - das ist der Grund fuer
      // einen Weg und keiner. Im Bericht stand damit etwas, das niemand
      // angeklickt hatte.
      const paths: Record<string, string> = {
        A: item.paths?.[0] ?? item.concerns?.[0] ?? "der erste Weg",
        B: item.paths?.[1] ?? item.concerns?.[1] ?? "der zweite Weg",
        other: "etwas anderes",
        unknown: "noch nicht entschieden",
      };
      return { kind: "case", concerns, path: paths[value.path as string] ?? String(value.path) };
    }

    case "money_range":
      return {
        kind: "money",
        amount: value.amount as number,
        currency: (value.currency as string) ?? "",
      };

    case "number_range":
      return {
        kind: "number",
        number: value.number as number,
        unit: (value.unit as string) ?? "",
        condition: (value.condition as string)?.trim() || null,
      };

    case "person_number_range":
      return {
        kind: "perPerson",
        per: (value.perPerson as { person: string; number: number | null; unit: string }[]) ?? [],
      };

    case "time_windows":
      return {
        kind: "windows",
        windows:
          (value.windows as { day: string; from: string; to: string; timezone: string }[]) ?? [],
      };

    case "date":
      return { kind: "date", date: value.date as string };

    case "structured_text":
      return { kind: "text", text: (value.text as string) ?? "" };

    case "free_text_repeatable":
      return {
        kind: "entries",
        entries: (value.entries as { entryId: string; text: string }[]) ?? [],
      };

    case "free_text_per_entry": {
      const perEntry = (value.perEntry as Record<string, string> | undefined) ?? {};
      return {
        kind: "perEntry",
        entries: Object.entries(perEntry).map(([entryId, text]) => ({
          // Die Grenze steht dabei, nicht nur ihre Kennung: „e1“ sagt niemandem
          // etwas. Ist sie inzwischen gestrichen, wird das benannt statt
          // weggelassen - sonst verschwindet ein geschriebener Satz lautlos.
          about:
            basisEntries.find((entry) => entry.entryId === entryId)?.text ??
            "zu einer Grenze, die es nicht mehr gibt",
          text,
        })),
      };
    }

    default:
      // EIN UNBEKANNTES FORMAT WIRD NICHT GERATEN.
      //
      // `null` heisst hier "laesst sich nicht lesen", und die Ansicht sagt das
      // auch: "Diese Antwort laesst sich nicht lesen. Das ist ein Fehler bei
      // uns - sie ist gespeichert und nicht verloren." Ein erfundener
      // Platzhalter waere schlimmer, weil er wie eine Auskunft aussieht.
      return null;
  }
}

/** Alle Antworten eines Fragebogens, in der Reihenfolge der Quelle. */
/**
 * Alle Antworten, in der Reihenfolge der Quelle.
 *
 * `bogen` gibt die Fragen und Abschnitte vor. Ohne Angabe ist es v2.1 - so
 * war es vorher, und so bleibt es für die Seiten, die darauf zeigen.
 */
export function readAll(
  answers: Record<string, AlignmentAnswerV21>,
  bogen?: { items: ReadableItem[]; sections: string[] },
): { section: string; entries: ReadoutEntry[] }[] {
  const basis = answers.L01;
  const basisEntries =
    basis && basis.missingCode === undefined && basis.value
      ? ((basis.value as { entries?: { entryId: string; text: string }[] }).entries ?? [])
      : [];

  const nachId = new Map((bogen?.items ?? []).map((item) => [item.itemId, item]));

  const read = new Map<string, ReadoutEntry>();
  for (const answer of Object.values(answers)) {
    const entry = readAnswer(answer, basisEntries, nachId.get(answer.blockId));
    if (entry) read.set(entry.itemId, entry);
  }

  // Die Reihenfolge kommt aus der QUELLE, nicht aus der Ablage. Sonst haengt
  // sie davon ab, in welcher Reihenfolge jemand geantwortet hat - und zwei
  // Berichte derselben Person saehen nach einem Nachtrag anders aus.
  const order = bogen?.items ?? getItemsV21();
  return (bogen?.sections ?? REGISTRY_V21.sections)
    .map((section) => ({
      section,
      entries: order
        .filter((item) => item.section === section)
        .map((item) => read.get(item.itemId))
        .filter((entry): entry is ReadoutEntry => entry !== undefined),
    }))
    .filter((group) => group.entries.length > 0);
}
