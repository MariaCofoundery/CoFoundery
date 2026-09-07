import { CONNECT_CATEGORIES, CONNECT_DIRECTIONS, CONNECT_GEOGRAPHIC_SCOPES, CONNECT_REMOTE_MODES, CONNECT_ROLES, CONNECT_VENTURE_STAGES, categorySupportsRemoteMode, categorySupportsVentureStage, isOneOf } from "@/features/connect/connectTypes";

function text(value: FormDataEntryValue | null, max: number) { return String(value ?? "").trim().slice(0, max); }
export class ConnectValidationError extends Error {
  readonly code: "too_many_topics" | "too_many_industries" | "too_many_locations" | "invalid_dates";
  constructor(code: "too_many_topics" | "too_many_industries" | "too_many_locations" | "invalid_dates") {
    super(code);
    this.code = code;
  }
}
export function parseCommaSeparatedList(value: FormDataEntryValue | null, maxItems: number, code: ConnectValidationError["code"], maxLength = 80) {
  const seen = new Set<string>();
  const values = String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean).filter((item) => {
    const key = item.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  if (values.length > maxItems) throw new ConnectValidationError(code);
  return values.map((item) => item.slice(0, maxLength));
}
function optional(value: FormDataEntryValue | null, max: number) { return text(value, max) || null; }
function optionalDate(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

/**
 * Identitaet kommt aus person_core, nicht aus diesem Formular. Sie wird an
 * genau einem Ort gepflegt - auf /profile - und von dort verteilt. Diese Seite
 * entscheidet nur noch das Kontextspezifische: Connect-Rollen, Foto und
 * Sichtbarkeit.
 *
 * Die Rueckgabeform bleibt unveraendert, damit profilePublishable und der
 * Upsert nichts davon merken.
 */
export type ConnectIdentitySource = {
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  location_region: string | null;
  remote_mode: string | null;
  expertise: string[] | null;
  industries: string[] | null;
};

export function parseConnectProfile(formData: FormData, identity: ConnectIdentitySource | null) {
  const roles = formData.getAll("network_roles").filter((v): v is string => isOneOf(CONNECT_ROLES, v)).slice(0, 4);
  const remote = identity?.remote_mode ?? null;
  return {
    display_name: text(identity?.display_name ?? null, 80), headline: text(identity?.headline ?? null, 160),
    // Der Kern erlaubt 1200 Zeichen, Connect 800 - hier wird gekappt, nicht abgewiesen.
    bio: text(identity?.bio ?? null, 800), location_region: optional(identity?.location_region ?? null, 120),
    remote_mode: isOneOf(CONNECT_REMOTE_MODES, remote) ? remote : null,
    expertise: (identity?.expertise ?? []).slice(0, 8).map((item) => item.slice(0, 60)),
    industries: (identity?.industries ?? []).slice(0, 5).map((item) => item.slice(0, 80)),
    network_roles: roles,
  };
}

export function parseConnectListing(formData: FormData) {
  const direction = formData.get("direction"); const category = formData.get("category");
  const remote = formData.get("remote_mode"); const stage = formData.get("venture_stage");
  const scope = formData.get("geographic_scope");
  if (!isOneOf(CONNECT_DIRECTIONS, direction) || !isOneOf(CONNECT_CATEGORIES, category)) throw new Error("invalid_listing_kind");
  return {
    direction, category, title: text(formData.get("title"), 100), summary: text(formData.get("summary"), 800),
    topics: parseCommaSeparatedList(formData.get("topics"), 8, "too_many_topics", 60), industries: parseCommaSeparatedList(formData.get("industries"), 5, "too_many_industries"),
    locations: parseCommaSeparatedList(formData.get("locations"), 3, "too_many_locations", 80),
    geographic_scope: isOneOf(CONNECT_GEOGRAPHIC_SCOPES, scope) ? scope : null,
    remote_mode: categorySupportsRemoteMode(category) && isOneOf(CONNECT_REMOTE_MODES, remote) ? remote : null,
    starts_on: optionalDate(formData.get("starts_on")), ends_on: optionalDate(formData.get("ends_on")),
    venture_stage: categorySupportsVentureStage(category) && isOneOf(CONNECT_VENTURE_STAGES, stage) ? stage : null,
  };
}

export function profilePublishable(p: ReturnType<typeof parseConnectProfile>) {
  return p.display_name.length >= 2 && p.headline.length >= 3 && p.bio.length >= 20 && p.network_roles.length > 0;
}
export function listingPublishable(p: ReturnType<typeof parseConnectListing>) {
  return p.title.length >= 5 && p.summary.length >= 20 && !(p.starts_on && p.ends_on && p.ends_on < p.starts_on);
}

export function normalizeConnectContactMessage(value: FormDataEntryValue | null) {
  const message = String(value ?? "").trim();
  return message.length >= 10 && message.length <= 500 ? message : null;
}

export function normalizeConnectMessageBody(value: FormDataEntryValue | null) {
  const body = String(value ?? "").trim();
  return body.length >= 1 && body.length <= 2000 ? body : null;
}
