/**
 * "Los geht's" (Entwurf vom 05.11.2026): eine kurze Folge von Schritten beim ersten Mal. Erledigt ergibt sich aus
 * den Daten (ein Termin steht, ein Team ist eingeladen ...), nicht aus einem Haken - uebersprungen merkt sich die
 * Datenbank je Person und Organisation (advisor_setup_state, 20270325120000).
 */

export const OWNER_STEPS = ["profile", "features", "team", "people", "plan", "teams", "teamraum", "phone"] as const;
export const MEMBER_STEPS = ["role", "teamraum", "phone"] as const;
export type SetupStep = (typeof OWNER_STEPS)[number] | (typeof MEMBER_STEPS)[number];
export const isSetupStep = (value: unknown): value is SetupStep => [...OWNER_STEPS, ...MEMBER_STEPS].includes(value as never);

export type SetupFacts = Record<SetupStep, boolean>;
export type SetupItem = { key: SetupStep; state: "done" | "skipped" | "open" };

/** Der Stand: je Schritt erledigt, uebersprungen oder offen; dazu der naechste offene. */
export function setupProgress(steps: readonly SetupStep[], facts: SetupFacts, skipped: readonly string[]) {
  const items: SetupItem[] = steps.map((key) => ({ key, state: facts[key] ? "done" : skipped.includes(key) ? "skipped" : "open" }));
  const done = items.filter((item) => item.state === "done").length;
  const next = items.find((item) => item.state === "open")?.key ?? null;
  return { items, done, total: items.length, next, complete: next === null };
}

/** Wo man einen Schritt spaeter wiederfindet - fester Pfad, der Hinweis "losgehts=1" bringt zurueck. */
export function stepHref(step: SetupStep, orgId: string): string {
  const org = encodeURIComponent(orgId);
  switch (step) {
    case "profile":
      return `/advisor/organisation?org=${org}&tab=profile&losgehts=1`;
    case "features":
      return `/advisor/organisation?org=${org}&tab=features&losgehts=1`;
    case "team":
      return `/advisor/organisation?org=${org}&tab=members&losgehts=1`;
    case "people":
      return `/advisor/organisation?org=${org}&tab=members&losgehts=1#wer-ist-wer`;
    case "plan":
      return `/advisor/kalender?org=${org}&ansicht=plan&losgehts=1`;
    case "teams":
      return `/advisor/organisation?org=${org}&tab=enroll&losgehts=1`;
    case "teamraum":
      return `/advisor/teamraum?org=${org}&losgehts=1`;
    case "role":
      return `/advisor/teamraum/wer-macht-was?org=${org}&losgehts=1`;
    case "phone":
      return "/account#handy";
  }
}
