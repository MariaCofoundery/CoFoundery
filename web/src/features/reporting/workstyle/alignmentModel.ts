import { getItemsV22 } from "@/features/instruments/align/registries";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import type { ProductMember } from "@/features/reporting/workstyle/model";

/** Compare selected content, never numeric distances. Same venture enforced by the DB reader.
 * R02 addresses one partner: with 3+ members its old wording cannot identify a recipient. */
export function alignmentPatterns(people: ProductMember[]) {
  return getItemsV22("venture_alignment")
    .filter((i) => !i.retired)
    .map((item) => {
      const entries = people.map((person) => {
        const a = person.alignment?.find((a) => a.item_key === item.itemId);
        const answer = a
          ? ({
              blockId: item.itemId,
              ...(a.missing_reason
                ? { missingCode: a.missing_reason }
                : { value: a.value }),
            } as AlignmentAnswerV21)
          : null;
        return {
          personId: person.person_id,
          name: person.name,
          entry: answer ? readAnswer(answer, [], item) : null,
        };
      });
      const usable = entries.filter((e) => e.entry?.value);
      const ambiguous = people.length > 2 && item.itemId === "R02";
      const distinct = new Set(
        usable.map((e) => JSON.stringify(e.entry?.value)),
      );
      return {
        item,
        entries,
        status: ambiguous
          ? "Empfängerbezug gemeinsam klären"
          : usable.length !== people.length
            ? "Noch offen"
            : distinct.size === 1
              ? "Ähnliche Erwartungen"
              : "Unterschiedliche Erwartungen",
        different:
          !ambiguous && usable.length === people.length && distinct.size > 1,
        ambiguous,
      };
    });
}

/** Eine Venture-Antwort als kurzer Text - die Frage steht im Bericht nur einmal, nicht je Person erneut. */
export function readoutText(entry: ReturnType<typeof readAnswer> | null): string | null {
  const value = entry?.value;
  if (!value) return entry?.missing?.label ?? null;
  switch (value.kind) {
    case "ordinal":
      return value.label;
    case "choice": {
      // Die Ausfuellhilfe ("– bitte angeben") gehoert zur Frage, nicht zur Antwort.
      const label = value.label.replace(/\s*[–-]\s*bitte angeben$/, "");
      return value.text ? `${label} (${value.text})` : label;
    }
    case "choices":
      return [value.labels.join(" · "), value.priority ? `Vorrang: ${value.priority}` : null, ...value.texts].filter(Boolean).join(" – ");
    case "text":
      return value.text;
    case "entries":
      return value.entries.map((e) => e.text).join(" · ");
    case "perEntry":
      return value.entries.map((e) => `${e.about}: ${e.text}`).join(" · ");
    case "number":
      return `${value.number} ${value.unit}${value.condition ? ` (${value.condition})` : ""}`;
    case "money":
      return `${value.amount.toLocaleString("de-DE")} ${value.currency}`;
    case "perPerson":
      return value.per.map((p) => `${p.person}: ${p.number ?? "–"} ${p.unit}`).join(" · ");
    case "windows":
      return value.windows.map((w) => `${w.day} ${w.from}–${w.to}`).join(" · ");
    case "date":
      return value.date;
    case "case":
      return value.path;
  }
}
