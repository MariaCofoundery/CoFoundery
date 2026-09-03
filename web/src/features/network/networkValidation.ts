import { NETWORK_CATEGORIES, NETWORK_DIRECTIONS, NETWORK_GEOGRAPHIC_SCOPES, NETWORK_REMOTE_MODES, NETWORK_ROLES, NETWORK_VENTURE_STAGES, categorySupportsRemoteMode, categorySupportsVentureStage, isOneOf } from "@/features/network/networkTypes";

function text(value: FormDataEntryValue | null, max: number) { return String(value ?? "").trim().slice(0, max); }
export class NetworkValidationError extends Error {
  readonly code: "too_many_topics" | "too_many_industries" | "too_many_locations" | "invalid_dates";
  constructor(code: "too_many_topics" | "too_many_industries" | "too_many_locations" | "invalid_dates") {
    super(code);
    this.code = code;
  }
}
export function parseCommaSeparatedList(value: FormDataEntryValue | null, maxItems: number, code: NetworkValidationError["code"], maxLength = 80) {
  const seen = new Set<string>();
  const values = String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean).filter((item) => {
    const key = item.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (values.length > maxItems) throw new NetworkValidationError(code);
  return values.map((item) => item.slice(0, maxLength));
}
function optional(value: FormDataEntryValue | null, max: number) { return text(value, max) || null; }
function optionalDate(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

export function parseNetworkProfile(formData: FormData) {
  const roles = formData.getAll("network_roles").filter((v): v is string => isOneOf(NETWORK_ROLES, v)).slice(0, 4);
  const remote = formData.get("remote_mode");
  return {
    display_name: text(formData.get("display_name"), 80), headline: text(formData.get("headline"), 160),
    bio: text(formData.get("bio"), 800), location_region: optional(formData.get("location_region"), 120),
    remote_mode: isOneOf(NETWORK_REMOTE_MODES, remote) ? remote : null,
    expertise: parseCommaSeparatedList(formData.get("expertise"), 8, "too_many_topics", 60), industries: parseCommaSeparatedList(formData.get("industries"), 5, "too_many_industries"),
    network_roles: roles,
  };
}

export function parseNetworkListing(formData: FormData) {
  const direction = formData.get("direction"); const category = formData.get("category");
  const remote = formData.get("remote_mode"); const stage = formData.get("venture_stage");
  const scope = formData.get("geographic_scope");
  if (!isOneOf(NETWORK_DIRECTIONS, direction) || !isOneOf(NETWORK_CATEGORIES, category)) throw new Error("invalid_listing_kind");
  return {
    direction, category, title: text(formData.get("title"), 100), summary: text(formData.get("summary"), 800),
    topics: parseCommaSeparatedList(formData.get("topics"), 8, "too_many_topics", 60), industries: parseCommaSeparatedList(formData.get("industries"), 5, "too_many_industries"),
    locations: parseCommaSeparatedList(formData.get("locations"), 3, "too_many_locations", 80),
    geographic_scope: isOneOf(NETWORK_GEOGRAPHIC_SCOPES, scope) ? scope : null,
    remote_mode: categorySupportsRemoteMode(category) && isOneOf(NETWORK_REMOTE_MODES, remote) ? remote : null,
    starts_on: optionalDate(formData.get("starts_on")), ends_on: optionalDate(formData.get("ends_on")),
    venture_stage: categorySupportsVentureStage(category) && isOneOf(NETWORK_VENTURE_STAGES, stage) ? stage : null,
  };
}

export function profilePublishable(p: ReturnType<typeof parseNetworkProfile>) {
  return p.display_name.length >= 2 && p.headline.length >= 3 && p.bio.length >= 20 && p.network_roles.length > 0;
}
export function listingPublishable(p: ReturnType<typeof parseNetworkListing>) {
  return p.title.length >= 5 && p.summary.length >= 20 && !(p.starts_on && p.ends_on && p.ends_on < p.starts_on);
}

export function normalizeNetworkContactMessage(value: FormDataEntryValue | null) {
  const message = String(value ?? "").trim();
  return message.length >= 10 && message.length <= 500 ? message : null;
}
