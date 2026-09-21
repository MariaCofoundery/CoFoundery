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

/**
 * In welcher Form jemand ansprechbar ist.
 *
 * Geschlossene Auswahl statt Freitext: vergleichbar, spaeter filterbar, und
 * mit einem Klick beantwortet. Die erste Nachricht scheitert selten am Thema
 * und oft an der Frage, welche Form angemessen ist.
 */
export const CONNECT_OPEN_TO_FORMATS = [
  "coffee",
  "walk",
  "video",
  "call",
  "sparring",
  "intro",
] as const;
export type ConnectOpenToFormat = (typeof CONNECT_OPEN_TO_FORMATS)[number];

export const CONNECT_REACH_MIN = 20;
export const CONNECT_REACH_MAX = 400;
export const CONNECT_CONTACT_NOTE_MIN = 10;
export const CONNECT_CONTACT_NOTE_MAX = 300;

export type ConnectProfile = {
  user_id: string; display_name: string; headline: string; bio: string;
  location_region: string | null; remote_mode: string | null; expertise: string[];
  industries: string[]; network_roles: ConnectRole[]; status: "draft" | "active" | "paused";
  photo_source: "profile_avatar" | "network_upload" | null;
  photo_avatar_id: string | null; photo_path: string | null;
  visibility: ConnectVisibility; public_slug: string;
  network_reach: string | null;
  open_to_formats: ConnectOpenToFormat[];
  /** Ob diese Person anderen vorgeschlagen werden darf. */
  suggestable: boolean;
  contact_note: string | null;
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
>;

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
};

export type PublicConnectProblem = Pick<ConnectProblem,
  "public_slug" | "title" | "description" | "author_intent" | "locations" |
  "topics" | "industries" | "geographic_scope" | "published_at"
> & {
  updated_at: string;
  author_display_name: string;
  author_headline: string;
  /** Nur gesetzt, wenn diese Person ihr Profil selbst oeffentlich gestellt hat. */
  author_profile_slug: string | null;
};

export const VENTURE_MAX = 5;
export const VENTURE_NAME_MIN = 2;
export const VENTURE_NAME_MAX = 80;
export const VENTURE_WHAT_MIN = 50;
export const VENTURE_WHAT_MAX = 800;
export const VENTURE_AUDIENCE_MIN = 20;
export const VENTURE_AUDIENCE_MAX = 300;
export const VENTURE_MOTIVATION_MIN = 20;
export const VENTURE_MOTIVATION_MAX = 500;

/**
 * Ein Unternehmen, Projekt oder eine Taetigkeit am Profil.
 *
 * Anhang an die Person, kein eigenes Inhaltsformat: kein Ablaufdatum, kein
 * eigener Kontaktweg, keine eigene Sichtbarkeit - die erbt es vom Profil.
 */
export type ConnectVenture = {
  id: string;
  owner_user_id: string;
  name: string;
  role_label: string | null;
  what_it_does: string;
  /** Fuer wen. Eigenes Feld, damit man weiterempfehlen kann, ohne alles zu lesen. */
  audience: string;
  motivation: string | null;
  website: string | null;
  logo_path: string | null;
  status: "active" | "hidden";
  created_at: string;
  updated_at: string;
};

/** Die oeffentliche Sicht - ohne Pfade, mit einem Hinweis auf das Logo. */
export type PublicConnectVenture = Pick<
  ConnectVenture,
  "name" | "role_label" | "what_it_does" | "audience" | "motivation" | "website" | "updated_at"
> & { logo_available: boolean };

export type ConnectContactRequest = {
  id: string; listing_id: string; sender_user_id: string; recipient_user_id: string;
  message: string; status: ConnectContactStatus; listing_title_snapshot: string;
  sender_display_name_snapshot: string; sender_headline_snapshot: string;
  recipient_display_name_snapshot: string; created_at: string;
  responded_at: string | null; updated_at: string;
};

export type ConnectConversation = {
  conversation_id: string;
  /** Leer, wenn der Ursprung mit der ausgetretenen Person weggefallen ist. */
  contact_request_id: string | null; listing_id: string | null;
  /** Leer: Diese Person hat ihr Konto geloescht. */
  counterpart_user_id: string | null; counterpart_display_name: string | null;
  listing_title: string | null; created_at: string; last_message_at: string | null;
  unread_count: number;
  /**
   * Woraus das Gespraech entstanden ist.
   *
   * Seit dem 19.09.2026 liegen drei Urspruenge in EINEM Postfach: eine
   * angenommene Kontaktanfrage, ein Problem-Interesse und ein angenommenes
   * Intro aus Find. Die Oberflaeche muss es sagen koennen, ohne zu raten -
   * und ohne aus einem fehlenden `listing_id` zu schliessen, das auch bei
   * einer ausgetretenen Person leer ist.
   */
  origin: "connect_contact" | "connect_problem" | "discovery_intro";
};

export type ConnectMessage = {
  id: string; conversation_id: string; sender_user_id: string | null;
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

// ---------------------------------------------------------------------------
// Problembrett
// ---------------------------------------------------------------------------
/**
 * Was die einstellende Person mit dem Problem vorhat. Der Unterschied ist
 * wesentlich: Eine Beobachtung sucht niemanden, eine Mitgruendersuche schon,
 * und "ich arbeite schon daran" verhindert, dass zwei Leute dasselbe
 * unabhaengig anfangen.
 */
export const CONNECT_PROBLEM_INTENTS = ["observation", "wants_to_build", "already_building"] as const;
export type ConnectProblemIntent = (typeof CONNECT_PROBLEM_INTENTS)[number];

export const CONNECT_PROBLEM_STATUSES = ["draft", "active", "withdrawn", "resolved"] as const;
export type ConnectProblemStatus = (typeof CONNECT_PROBLEM_STATUSES)[number];

/** Muessen mit den Check-Constraints in 20260915140000 uebereinstimmen. */
export const PROBLEM_TITLE_MIN = 5;
export const PROBLEM_TITLE_MAX = 120;
export const PROBLEM_DESCRIPTION_MIN = 50;
export const PROBLEM_DESCRIPTION_MAX = 2000;
export const PROBLEM_INTEREST_NOTE_MIN = 10;
export const PROBLEM_INTEREST_NOTE_MAX = 500;

export type ConnectProblem = {
  id: string;
  /**
   * Leer heisst: Die Person hat ihr Konto geloescht und den Text anonym
   * stehen lassen. Es gibt keinen Weg zurueck zu ihr - auch nicht fuer uns.
   */
  author_user_id: string | null;
  title: string;
  description: string;
  author_intent: ConnectProblemIntent;
  locations: string[];
  geographic_scope: ConnectGeographicScope;
  topics: string[];
  industries: string[];
  status: ConnectProblemStatus;
  published_at: string | null;
  resolved_at: string | null;
  interest_count: number;
  confirmation_count: number;
  /** Voreinstellung: darf dieser Eintrag eine Kontoloeschung ueberdauern? */
  outlives_account: boolean;
  visibility: ConnectVisibility;
  public_slug: string;
  created_at: string;
  network_profiles?: ConnectProfile | ConnectProfile[] | null;
};

/**
 * Woher jemand ein Problem kennt.
 *
 * Eine geschlossene Auswahl statt Freitext, damit eine Bestaetigung ein Klick
 * bleibt und trotzdem etwas aussagt: "Drei Menschen, die beruflich damit zu
 * tun haben" ist eine andere Aussage als "dreissig, die es mal gehoert haben".
 */
export const CONNECT_PROBLEM_PERSPECTIVES = ["affected", "professional", "observed"] as const;
export type ConnectProblemPerspective = (typeof CONNECT_PROBLEM_PERSPECTIVES)[number];

export const PROBLEM_APPROACH_SUMMARY_MIN = 50;
export const PROBLEM_APPROACH_SUMMARY_MAX = 1000;
export const PROBLEM_APPROACH_AUDIENCE_MIN = 10;
export const PROBLEM_APPROACH_AUDIENCE_MAX = 300;
export const PROBLEM_APPROACH_NEEDS_MIN = 10;
export const PROBLEM_APPROACH_NEEDS_MAX = 500;

export type ConnectProblemConfirmation = {
  id: string;
  problem_id: string;
  user_id: string;
  perspective: ConnectProblemPerspective;
  created_at: string;
};

/** Die oeffentliche Seite: Zahlen je Perspektive, nie Namen. */
export type ConnectProblemConfirmationCounts = Record<ConnectProblemPerspective, number>;

export type ConnectProblemApproach = {
  id: string;
  problem_id: string;
  author_user_id: string | null;
  summary: string;
  audience: string;
  needs: string;
  status: "active" | "withdrawn";
  outlives_account: boolean;
  created_at: string;
  updated_at: string;
};

export function isConnectProblemPerspective(value: unknown): value is ConnectProblemPerspective {
  return (
    typeof value === "string" &&
    (CONNECT_PROBLEM_PERSPECTIVES as readonly string[]).includes(value)
  );
}

export type ConnectProblemInterest = {
  id: string;
  problem_id: string;
  /**
   * Leer: die Meldung gilt dem Problem und erreicht die einstellende Person.
   * Gesetzt: sie gilt diesem Ansatz und erreicht die Person, die ihn
   * geschrieben hat.
   */
  approach_id: string | null;
  user_id: string;
  note: string;
  created_at: string;
};

export function isConnectProblemIntent(value: unknown): value is ConnectProblemIntent {
  return typeof value === "string" && (CONNECT_PROBLEM_INTENTS as readonly string[]).includes(value);
}
