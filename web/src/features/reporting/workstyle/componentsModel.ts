import type { CapabilityArea } from "@/features/capability/capabilityTypes";
import type { ProductMember } from "@/features/reporting/workstyle/model";
export type ComponentState =
  | "INTERNALLY_COVERED"
  | "MULTI_COVERED"
  | "OPEN_INTERNAL"
  | "EXTERNAL_COMPONENT"
  | "DEPENDS"
  | "GROWTH_AREA"
  | "SINGLE_POINT_OF_FAILURE"
  | "INSUFFICIENT_DATA";
export const OWNERSHIP_LABELS = {
  own: "◆ Möchte übernehmen",
  contribute: "＋ Möchte beitragen",
  grow_into: "↗ Möchte hineinwachsen",
  prefer_other: "↪ Möchte abgeben",
  prefer_external: "◇ Möchte extern lösen",
  unclear: "? Noch unklar",
};
export const COMPONENT_LABELS: Record<ComponentState, string> = {
  INTERNALLY_COVERED: "Im Team getragen",
  MULTI_COVERED: "Mehrfach getragen",
  OPEN_INTERNAL: "Interne Verantwortung offen",
  EXTERNAL_COMPONENT: "Extern lösbar",
  DEPENDS: "Vom Vorhaben abhängig",
  GROWTH_AREA: "Hineinwachsen vorgesehen",
  SINGLE_POINT_OF_FAILURE: "Eine Person möchte intern tragen",
  INSUFFICIENT_DATA: "Angaben fehlen oder sind nicht freigegeben",
};
/** Application level, ownership wish and sourcing are three independent axes.
 * Only `own` claims ownership. Contribute/grow_into never silently become coverage.
 * No entry or undisclosed wish is unknown, never evidence of an internal gap. */
export function componentRows(
  people: ProductMember[],
  areas: CapabilityArea[],
) {
  return [...areas]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((area) => {
      const cells = people.map((person) => ({
        personId: person.person_id,
        name: person.name,
        entry:
          person.capabilities.find((e) => e.area_id === area.area_id) ?? null,
      }));
      const owners = cells.filter((c) => c.entry?.ownership_wish === "own");
      const complete = cells.every(
        (c) => c.entry?.ownership_wish && c.entry.ownership_wish !== "unclear",
      );
      const states: ComponentState[] = [];
      if (owners.length)
        states.push(owners.length > 1 ? "MULTI_COVERED" : "INTERNALLY_COVERED");
      if (area.sourcing === "internal_only" && owners.length === 1 && complete)
        states.push("SINGLE_POINT_OF_FAILURE");
      if (area.sourcing === "internal_only" && !owners.length && complete)
        states.push("OPEN_INTERNAL");
      if (area.sourcing === "component") states.push("EXTERNAL_COMPONENT");
      if (area.sourcing === "depends") states.push("DEPENDS");
      if (cells.some((c) => c.entry?.ownership_wish === "grow_into"))
        states.push("GROWTH_AREA");
      if (!complete) states.push("INSUFFICIENT_DATA");
      return {
        area,
        cells,
        owners,
        states,
        externalPreference: cells
          .filter((c) => c.entry?.ownership_wish === "prefer_external")
          .map((c) => c.name),
        // A stated external preference is a sourcing discussion, not proof a supplier exists.
        sourcing: area.sourcing ?? "unclassified",
      };
    });
}
