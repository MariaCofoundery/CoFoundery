import { NETWORK_CATEGORIES, NETWORK_DIRECTIONS, NETWORK_REMOTE_MODES, NETWORK_ROLES, NETWORK_VENTURE_STAGES, isOneOf } from "@/features/network/networkTypes";

function text(value: FormDataEntryValue | null, max: number) { return String(value ?? "").trim().slice(0, max); }
function list(value: FormDataEntryValue | null, maxItems: number, maxLength = 80) {
  return Array.from(new Set(String(value ?? "").split(",").map((v) => v.trim().slice(0, maxLength)).filter(Boolean))).slice(0, maxItems);
}
function optional(value: FormDataEntryValue | null, max: number) { return text(value, max) || null; }

export function parseNetworkProfile(formData: FormData) {
  const roles = formData.getAll("network_roles").filter((v): v is string => isOneOf(NETWORK_ROLES, v)).slice(0, 4);
  const remote = formData.get("remote_mode");
  return {
    display_name: text(formData.get("display_name"), 80), headline: text(formData.get("headline"), 160),
    bio: text(formData.get("bio"), 800), location_region: optional(formData.get("location_region"), 120),
    remote_mode: isOneOf(NETWORK_REMOTE_MODES, remote) ? remote : null,
    expertise: list(formData.get("expertise"), 8, 60), industries: list(formData.get("industries"), 5),
    network_roles: roles,
  };
}

export function parseNetworkListing(formData: FormData) {
  const direction = formData.get("direction"); const category = formData.get("category");
  const remote = formData.get("remote_mode"); const stage = formData.get("venture_stage");
  if (!isOneOf(NETWORK_DIRECTIONS, direction) || !isOneOf(NETWORK_CATEGORIES, category)) throw new Error("invalid_listing_kind");
  return {
    direction, category, title: text(formData.get("title"), 100), summary: text(formData.get("summary"), 800),
    topics: list(formData.get("topics"), 8, 60), industries: list(formData.get("industries"), 5),
    location_region: optional(formData.get("location_region"), 120),
    remote_mode: isOneOf(NETWORK_REMOTE_MODES, remote) ? remote : null,
    timeframe: optional(formData.get("timeframe"), 80),
    venture_stage: isOneOf(NETWORK_VENTURE_STAGES, stage) ? stage : null,
  };
}

export function profilePublishable(p: ReturnType<typeof parseNetworkProfile>) {
  return p.display_name.length >= 2 && p.headline.length >= 3 && p.bio.length >= 20 && p.network_roles.length > 0;
}
export function listingPublishable(p: ReturnType<typeof parseNetworkListing>) {
  return p.title.length >= 5 && p.summary.length >= 20;
}
