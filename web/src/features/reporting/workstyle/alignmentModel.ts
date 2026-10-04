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
