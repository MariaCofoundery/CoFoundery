export const CONNECT_DIRECTIONS = ["seeking", "offering"] as const;
export const CONNECT_CATEGORIES = ["expertise", "cooperation", "investment", "sparring", "succession"] as const;
export const CONNECT_ROLES = ["founder", "aspiring_founder", "expert", "advisor_mentor", "business_angel", "company_representative"] as const;
export const CONNECT_REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;
export const CONNECT_GEOGRAPHIC_SCOPES = ["regional", "germany", "europe", "global"] as const;
export const CONNECT_VENTURE_STAGES = ["exploring", "idea", "validation", "early", "growth", "established"] as const;
export type ConnectDirection = (typeof CONNECT_DIRECTIONS)[number];
export type ConnectCategory = (typeof CONNECT_CATEGORIES)[number];
export type ConnectRole = (typeof CONNECT_ROLES)[number];
export type ConnectRemoteMode = (typeof CONNECT_REMOTE_MODES)[number];
export type ConnectGeographicScope = (typeof CONNECT_GEOGRAPHIC_SCOPES)[number];
export type ConnectVisibility = "members_only" | "public";
export const CONNECT_CONTACT_STATUSES = ["pending", "accepted", "declined", "canceled"] as const;
export type ConnectContactStatus = (typeof CONNECT_CONTACT_STATUSES)[number];

export type ConnectProfile = {
  user_id: string; display_name: string; headline: string; bio: string;
  location_region: string | null; remote_mode: string | null; expertise: string[];
  industries: string[]; network_roles: ConnectRole[]; status: "draft" | "active" | "paused";
  photo_source: "profile_avatar" | "network_upload" | null;
  photo_avatar_id: string | null; photo_path: string | null;
  photo_visibility: "platform_only" | "public_allowed";
  visibility: ConnectVisibility; public_slug: string;
  published_at: string | null; updated_at: string;
};
export type ConnectListing = {
  id: string; owner_user_id: string; direction: ConnectDirection; category: ConnectCategory;
  title: string; summary: string; topics: string[]; industries: string[];
  locations: string[]; geographic_scope: ConnectGeographicScope | null; remote_mode: string | null;
  starts_on: string | null; ends_on: string | null;
  venture_stage: string | null; status: "draft" | "active" | "paused" | "completed";
  visibility: ConnectVisibility; public_slug: string;
  published_at: string | null; expires_at: string | null; updated_at: string; created_at: string;
  network_profiles?: ConnectProfile | ConnectProfile[] | null;
};

export type PublicConnectProfile = Pick<ConnectProfile,
  "public_slug" | "display_name" | "headline" | "bio" | "network_roles" |
  "expertise" | "industries" | "location_region" | "updated_at"
> & { photo_available: boolean };

export type PublicConnectProfileListing = Pick<ConnectListing,
  "public_slug" | "direction" | "category" | "title" | "summary" |
  "topics" | "industries" | "geographic_scope" | "updated_at"
>;

export type PublicConnectListing = Pick<ConnectListing,
  "public_slug" | "direction" | "category" | "title" | "summary" | "topics" |
  "industries" | "locations" | "geographic_scope" | "remote_mode" |
  "starts_on" | "ends_on" | "venture_stage" | "updated_at"
> & {
  owner_display_name: string;
  owner_headline: string;
  owner_profile_slug: string | null;
  owner_photo_available: boolean;
};

export type ConnectContactRequest = {
  id: string; listing_id: string; sender_user_id: string; recipient_user_id: string;
  message: string; status: ConnectContactStatus; listing_title_snapshot: string;
  sender_display_name_snapshot: string; sender_headline_snapshot: string;
  recipient_display_name_snapshot: string; created_at: string;
  responded_at: string | null; updated_at: string;
};

export type ConnectConversation = {
  conversation_id: string; contact_request_id: string; listing_id: string;
  counterpart_user_id: string; counterpart_display_name: string;
  listing_title: string; created_at: string; last_message_at: string | null;
  unread_count: number;
};

export type ConnectMessage = {
  id: string; conversation_id: string; sender_user_id: string;
  body: string; created_at: string;
};

export type ConnectBlockState = {
  interaction_blocked: boolean;
  blocked_by_current_user: boolean;
};

export type ConnectBlockedMember = {
  blocked_user_id: string;
  display_name: string;
  created_at: string;
};

export function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function coFounderBridgeHref(hasFounderRole: boolean) {
  return hasFounderRole ? "/discovery" : "/welcome?next=%2Fdiscovery";
}

export function categorySupportsRemoteMode(category: ConnectCategory) {
  return category === "expertise" || category === "cooperation" || category === "sparring";
}

export function categorySupportsVentureStage(category: ConnectCategory) {
  return category === "expertise" || category === "cooperation" || category === "investment";
}
