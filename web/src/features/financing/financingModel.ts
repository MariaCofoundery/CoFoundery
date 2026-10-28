import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * Finanzierungs-Wegweiser: eine Checkliste OHNE Wertung.
 *
 * Jeder Punkt hat einen Status, den das Team selbst setzt. Es gibt keine Summe, keinen
 * Prozentwert, keinen Balken und keine Empfehlung von Investoren oder Finanzierungsformen
 * (Recherche: docs/research/phase-13/13.7-finanzierung-investor-recherche.md).
 *
 * Die Punkte stehen fest im Code und in der CHECK-Liste von `team_financing_items`.
 * Ein Test haelt beide gleich.
 */
export const FINANCING_STATUSES = ["open", "progress", "done", "na"] as const;
export type FinancingStatus = (typeof FINANCING_STATUSES)[number];

export const isFinancingStatus = (value: unknown): value is FinancingStatus =>
  typeof value === "string" && (FINANCING_STATUSES as readonly string[]).includes(value);

/** Naechster Status beim Anklicken: offen -> in Arbeit -> geklaert -> nicht relevant -> offen. */
export function nextFinancingStatus(status: FinancingStatus): FinancingStatus {
  return FINANCING_STATUSES[(FINANCING_STATUSES.indexOf(status) + 1) % FINANCING_STATUSES.length];
}

export type FinancingAreaKey = "team" | "shares" | "rights" | "documents" | "goal";

export type FinancingItemDef = {
  key: string;
  area: FinancingAreaKey;
  /** Das Founder-Setup-Thema, dessen Stand als Hinweis neben dem Punkt steht (nur gelesen, nie uebernommen). */
  setupTopic?: FounderSetupItemKey;
};

export const FINANCING_ITEMS: readonly FinancingItemDef[] = [
  { key: "roles_defined", area: "team", setupTopic: "roles_responsibilities" },
  { key: "time_stated", area: "team", setupTopic: "time_commitment" },
  { key: "tie_break", area: "team", setupTopic: "conflict_deadlock" },
  { key: "exit_discussed", area: "team", setupTopic: "founder_exit" },
  { key: "split_written", area: "shares", setupTopic: "equity" },
  { key: "dilution_discussed", area: "shares", setupTopic: "investor_dilution" },
  { key: "contributions_listed", area: "shares", setupTopic: "contributions_expenses" },
  { key: "ip_clarified", area: "rights", setupTopic: "intellectual_property" },
  { key: "side_activities_disclosed", area: "rights", setupTopic: "outside_activities" },
  { key: "accounts_access", area: "rights", setupTopic: "accounts_access" },
  { key: "short_intro", area: "documents" },
  { key: "financial_plan", area: "documents" },
  { key: "contracts_sorted", area: "documents" },
  { key: "purpose_one_sentence", area: "goal" },
  { key: "say_in_governance", area: "goal" },
  { key: "sale_stance", area: "goal", setupTopic: "company_sale" },
] as const;

export const FINANCING_AREAS: readonly FinancingAreaKey[] = ["team", "shares", "rights", "documents", "goal"];

export const FINANCING_ITEM_KEYS = FINANCING_ITEMS.map((item) => item.key);

export const isFinancingItemKey = (value: unknown): boolean =>
  typeof value === "string" && FINANCING_ITEM_KEYS.includes(value);

/** Setup-Themen der Ansicht "Eure Vereinbarungen", in dieser Reihenfolge. */
export const FINANCING_AGREEMENT_TOPICS: readonly FounderSetupItemKey[] = [
  "equity",
  "vesting",
  "investor_dilution",
  "company_sale",
  "founder_exit",
  "decision_rights",
  "vision_goals",
];

/** Fragen fuer die Gespraechsvorbereitung. Neutral, ohne Zielvorgabe. */
export const FINANCING_PREP_QUESTIONS = ["purpose", "governance", "reporting", "sale", "beyondMoney"] as const;

export const FINANCING_NOTE_MAX = 600;

export const isFinancingQuestionKey = (value: unknown): boolean =>
  typeof value === "string" && (FINANCING_PREP_QUESTIONS as readonly string[]).includes(value);

export type FinancingView = "guide" | "agreements" | "prep";
export const financingViewFrom = (value: string | undefined): FinancingView =>
  value === "agreements" || value === "prep" ? value : "guide";

export const financingHref = (teamId: string, view?: FinancingView) =>
  `/teams/${encodeURIComponent(teamId)}/finanzierung${view && view !== "guide" ? `?view=${view}` : ""}`;
