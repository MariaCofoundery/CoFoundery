export const ENTRY_TYPES = [
  "observation",
  "perspective",
  "assumption",
  "approach",
  "test",
] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];
export type WorkspaceRole = "owner" | "contributor" | "viewer";
export type WorkspaceEntry = {
  id: string;
  author_user_id: string;
  author_name: string;
  type: EntryType;
  content: string;
  source_url: string | null;
  source_label: string | null;
  created_at: string;
  updated_at: string;
};
export type WorkspaceSummary = {
  id: string;
  title: string;
  status: "active" | "archived";
  role: WorkspaceRole;
  updated_at: string;
};
export type ProblemWorkspace = WorkspaceSummary & {
  description: string;
  source_problem_id: string | null;
  members: { user_id: string; role: WorkspaceRole; name: string }[];
  entries: WorkspaceEntry[];
  invites: {
    id: string;
    email: string;
    role: WorkspaceRole;
    status: "pending" | "claimed" | "revoked" | "expired";
    expires_at: string;
  }[];
};
export const workspaceId = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
export function safeSourceUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function parseWorkspaceEntry(form: FormData) {
  const type = String(form.get("type") ?? "");
  const hasSource = type === "observation" || type === "perspective";
  return {
    p_type: type,
    p_content: String(form.get("content") ?? "").trim(),
    p_source_url: hasSource
      ? String(form.get("source_url") ?? "").trim() || null
      : null,
    p_source_label: hasSource
      ? String(form.get("source_label") ?? "").trim() || null
      : null,
  };
}
