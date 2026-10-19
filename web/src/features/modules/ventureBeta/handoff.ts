import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * Setup-Handoffs von Venture Alignment v2 (Beta 1).
 *
 * KEINE ANTWORT WIRD JE ZU EINER VEREINBARUNG. Das ist nur die Zuordnung „zu welchem Founder-Setup-Thema
 * gehoert das Gespraech" - sie erzeugt einen Verweis („Im Founder Setup vereinbaren"), nie einen Eintrag.
 * `always`: das Thema gehoert immer dazu; `difference`: nur, wenn sich Antworten unterscheiden.
 * Verwendet werden die bestehenden Setup-Themen (`FOUNDER_SETUP_ITEM_KEYS`) - es gibt keine neuen.
 */
export type BetaHandoff = { target: FounderSetupItemKey; when: "always" | "difference" };

export const BETA_ITEM_HANDOFFS: Readonly<Record<string, readonly BetaHandoff[]>> = {
  F01: [{ target: "founder_exit", when: "difference" }, { target: "equity", when: "difference" }],
  F02: [{ target: "equity", when: "difference" }],
  O01: [{ target: "roles_responsibilities", when: "always" }],
  C01: [{ target: "time_commitment", when: "always" }],
  C02: [{ target: "time_commitment", when: "always" }],
  C03: [{ target: "changing_commitment", when: "difference" }, { target: "time_commitment", when: "difference" }],
  C04: [{ target: "changing_commitment", when: "always" }],
  M01: [{ target: "compensation", when: "difference" }],
  M02: [{ target: "personal_financial_risk", when: "always" }, { target: "contributions_expenses", when: "difference" }],
  M03: [{ target: "contributions_expenses", when: "difference" }],
  E01: [{ target: "decision_rights", when: "always" }],
  E02: [{ target: "decision_rights", when: "always" }, { target: "conflict_deadlock", when: "difference" }],
  E03: [{ target: "decision_rights", when: "always" }, { target: "contributions_expenses", when: "difference" }],
  N01: [{ target: "communication", when: "always" }],
};

/** Alle Ziele - fuer die Modulbeschreibung. */
export function betaHandoffTargets(): { target: FounderSetupItemKey; when: "always" | "difference" }[] {
  const seen = new Map<FounderSetupItemKey, "always" | "difference">();
  for (const handoffs of Object.values(BETA_ITEM_HANDOFFS)) {
    for (const entry of handoffs) {
      // `always` gewinnt: Ein Thema, das irgendwo immer dazugehoert, ist insgesamt `always`.
      if (seen.get(entry.target) !== "always") seen.set(entry.target, entry.when);
    }
  }
  return [...seen].map(([target, when]) => ({ target, when }));
}

/** Das erste Setup-Thema, das fuer diese Lage passt (nur Verweis - nie eine Vereinbarung). */
export function setupTopicFor(itemId: string, hasDifference: boolean): FounderSetupItemKey | null {
  const options = BETA_ITEM_HANDOFFS[itemId] ?? [];
  const match = options.find((entry) => entry.when === "always" || hasDifference);
  return match?.target ?? null;
}
