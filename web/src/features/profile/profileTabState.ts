/** Reine Zuordnung Schritt -> Gruppe der Profil-Reiter (ohne Server-Imports, damit sie testbar bleibt). */
export type Group = "overview" | "about" | "align" | "visibility";
export type Sub = "identity" | "resources" | "capability" | "strengths" | "direction";

const GROUP_OF_STEP: Record<string, { group: Group; sub?: Sub }> = {
  identity: { group: "about", sub: "identity" },
  resources: { group: "about", sub: "resources" },
  areas: { group: "align", sub: "capability" },
  ownership: { group: "align", sub: "capability" },
  evidence: { group: "align", sub: "capability" },
  strengths: { group: "align", sub: "strengths" },
  sichtbarkeit: { group: "visibility" },
};

export function profileTabState(step: string | null | undefined, current?: "direction"): { group: Group; sub?: Sub } {
  if (current === "direction") return { group: "align", sub: "direction" };
  return (step && GROUP_OF_STEP[step]) || { group: "overview" };
}

