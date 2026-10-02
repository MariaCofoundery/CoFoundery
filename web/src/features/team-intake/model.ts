export type IntakeMode = "selection" | "development";
export type IntakeData = Record<string, string | boolean | string[]>;
export type IntakePerson = {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  claimed: boolean;
  confirmed: boolean;
  submitted: boolean;
};
export type IntakeRound = {
  id: string;
  team_id: string | null;
  name: string;
  mode: IntakeMode;
  status: "inviting" | "draft" | "published" | "revoked";
  created_at: string;
  published_at: string | null;
  is_reviewer: boolean;
  is_creator: boolean;
  org_name: string | null;
  reviewers: { id: string; name: string }[];
  participants: IntakePerson[];
};
export type IntakeOwn = {
  shared: IntakeData;
  pairs: { target_user_id: string; data: IntakeData }[];
  private_requested: boolean;
  private_note: string;
};
export type IntakeReport = {
  common: { author_user_id: string; data: IntakeData }[];
  pairs: { author_user_id: string; target_user_id: string; data: IntakeData }[];
};
export const ORIGINS = [
  "education",
  "workplace",
  "project",
  "private",
  "accelerator",
  "matching",
  "community",
  "other",
] as const;
export const FORMATIONS = [
  "together",
  "joined",
  "cofounder_search",
  "network",
  "prior_work",
  "other",
] as const;
export const OPEN_TOPICS = [
  "roles",
  "responsibility",
  "time",
  "decisions",
  "equity",
  "money",
  "goals",
  "collaboration",
  "other",
  "none",
  "conversation",
] as const;
export const FACT_KEYS = [
  "formation",
  "formation_other",
  "venture_since",
  "existed",
  "existing_context",
] as const;
export const PAIR_FACT_KEYS = [
  "origin",
  "since",
  "worked",
  "work_context",
] as const;
export function commonKeys(mode: IntakeMode) {
  return [
    ...FACT_KEYS,
    ...(mode === "selection"
      ? ["motivation", "open_topics", "open_text"]
      : ["works_well", "team_clarity"]),
  ];
}
export function pairKeys(mode: IntakeMode) {
  return [
    ...PAIR_FACT_KEYS,
    "appreciation",
    "complement",
    ...(mode === "selection"
      ? ["contribution"]
      : ["clarity", "unused_strength"]),
  ];
}
export function parseIntakeForm(
  form: FormData,
  mode: IntakeMode,
  targets: string[],
) {
  function fields(keys: string[], prefix: string): IntakeData {
    const data: IntakeData = {};
    for (const key of keys) {
      if (key === "open_topics")
        data[key] = form.getAll(prefix + key).map(String);
      else if (key === "worked") {
        const v = form.get(prefix + key);
        if (v === "yes" || v === "no") data[key] = v === "yes";
      } else data[key] = String(form.get(prefix + key) ?? "").trim();
    }
    return data;
  }
  return {
    shared: fields(commonKeys(mode), "common."),
    pairs: targets.map((id) => ({
      target_user_id: id,
      data: fields(pairKeys(mode), `pair.${id}.`),
    })),
    private_requested: form.get("private_requested") === "on",
    private_note: String(form.get("private_note") ?? "").trim(),
  };
}
export const validId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
