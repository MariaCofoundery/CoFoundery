export const NETWORK_DIRECTIONS = ["seeking", "offering"] as const;
export const NETWORK_CATEGORIES = ["expertise", "cooperation", "investment", "sparring", "succession"] as const;
export const NETWORK_ROLES = ["founder", "aspiring_founder", "expert", "advisor_mentor", "business_angel", "company_representative"] as const;
export const NETWORK_REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;
export const NETWORK_GEOGRAPHIC_SCOPES = ["regional", "germany", "europe", "global"] as const;
export const NETWORK_VENTURE_STAGES = ["exploring", "idea", "validation", "early", "growth", "established"] as const;
export type NetworkDirection = (typeof NETWORK_DIRECTIONS)[number];
export type NetworkCategory = (typeof NETWORK_CATEGORIES)[number];
export type NetworkRole = (typeof NETWORK_ROLES)[number];
export type NetworkRemoteMode = (typeof NETWORK_REMOTE_MODES)[number];
export type NetworkGeographicScope = (typeof NETWORK_GEOGRAPHIC_SCOPES)[number];

export type NetworkProfile = {
  user_id: string; display_name: string; headline: string; bio: string;
  location_region: string | null; remote_mode: string | null; expertise: string[];
  industries: string[]; network_roles: NetworkRole[]; status: "draft" | "active" | "paused";
  published_at: string | null; updated_at: string;
};
export type NetworkListing = {
  id: string; owner_user_id: string; direction: NetworkDirection; category: NetworkCategory;
  title: string; summary: string; topics: string[]; industries: string[];
  locations: string[]; geographic_scope: NetworkGeographicScope | null; remote_mode: string | null;
  starts_on: string | null; ends_on: string | null;
  venture_stage: string | null; status: "draft" | "active" | "paused" | "completed";
  published_at: string | null; expires_at: string | null; updated_at: string; created_at: string;
  network_profiles?: NetworkProfile | NetworkProfile[] | null;
};

export function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function coFounderBridgeHref(hasFounderRole: boolean) {
  return hasFounderRole ? "/discovery" : "/welcome?next=%2Fdiscovery";
}

export function categorySupportsRemoteMode(category: NetworkCategory) {
  return category === "expertise" || category === "cooperation" || category === "sparring";
}

export function categorySupportsVentureStage(category: NetworkCategory) {
  return category === "expertise" || category === "cooperation" || category === "investment";
}
