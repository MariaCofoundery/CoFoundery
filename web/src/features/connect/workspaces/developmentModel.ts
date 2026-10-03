import type { ConnectProblem } from "@/features/connect/connectTypes";
export type PublicationFields = Pick<
  ConnectProblem,
  | "title"
  | "description"
  | "author_intent"
  | "geographic_scope"
  | "locations"
  | "topics"
  | "industries"
  | "visibility"
  | "outlives_account"
>;
export type PublicationPreview = {
  problem: (PublicationFields & { id: string; status: "active" }) | null;
  can_publish: boolean;
};
export type Opportunity = {
  id: string;
  title: string;
  affected_group: string;
  opportunity_statement: string;
  possible_value: string;
  status: "active" | "archived";
  updated_at: string;
  entry_ids: string[];
  has_venture: boolean;
  venture: { id: string; name: string | null } | null;
};
export type WorkspaceDevelopment = {
  publication: {
    id: string;
    status: string;
    visibility: "public" | "members_only";
    href: string;
  } | null;
  has_publication: boolean;
  opportunities: Opportunity[];
};
export type VentureChoices = {
  can_create: boolean;
  ventures: { id: string; name: string | null }[];
};
const list = (value: FormDataEntryValue | null, max: number) =>
  [
    ...new Set(
      String(value ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ].slice(0, max);
/** Public allowlist only. No workspace/entry/member/source fields are accepted. */
export function publicationFields(form: FormData): PublicationFields {
  return {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    author_intent: String(
      form.get("author_intent") ?? "",
    ) as PublicationFields["author_intent"],
    geographic_scope: String(
      form.get("geographic_scope") ?? "regional",
    ) as PublicationFields["geographic_scope"],
    locations: list(form.get("locations"), 3),
    topics: list(form.get("topics"), 8),
    industries: list(form.get("industries"), 5),
    visibility: form.get("visibility") === "public" ? "public" : "members_only",
    outlives_account: form.get("outlives_account") === "yes",
  };
}
export function publicationPayload(raw: string): PublicationFields {
  const value = JSON.parse(raw) as PublicationFields;
  const form = new FormData();
  for (const key of [
    "title",
    "description",
    "author_intent",
    "geographic_scope",
    "visibility",
  ] as const) {
    if (typeof value[key] !== "string") throw new Error("invalid_publication");
    form.set(key, value[key]);
  }
  for (const key of ["locations", "topics", "industries"] as const) {
    if (
      !Array.isArray(value[key]) ||
      !value[key].every((v) => typeof v === "string")
    )
      throw new Error("invalid_publication");
    form.set(key, value[key].join(","));
  }
  if (typeof value.outlives_account !== "boolean")
    throw new Error("invalid_publication");
  form.set("outlives_account", value.outlives_account ? "yes" : "no");
  return publicationFields(form);
}
