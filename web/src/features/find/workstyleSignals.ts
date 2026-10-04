/** Public payload: no item keys, raw choices, bands, distances or consent metadata. */
export const DISCOVERY_WORKSTYLE_AREAS = ["EVI", "EXP", "EL", "VOICE", "AMB", "ORG"] as const;
export type DiscoveryWorkstyleArea = typeof DISCOVERY_WORKSTYLE_AREAS[number];
export type DiscoveryWorkstyleSignal = { area_key: DiscoveryWorkstyleArea; pattern: "SIMILAR_PATTERN" | "DISCUSSION_POINT" | "INSUFFICIENT_DATA" };
export function parseDiscoveryWorkstyleSignals(value: unknown): DiscoveryWorkstyleSignal[] {
  if (!Array.isArray(value)) return [];
  return DISCOVERY_WORKSTYLE_AREAS.flatMap(area => {
    const row = value.find(r => r && typeof r === "object" && r.area_key === area);
    return row && ["SIMILAR_PATTERN", "DISCUSSION_POINT", "INSUFFICIENT_DATA"].includes(row.pattern)
      ? [{ area_key: area, pattern: row.pattern } as DiscoveryWorkstyleSignal] : [];
  });
}
