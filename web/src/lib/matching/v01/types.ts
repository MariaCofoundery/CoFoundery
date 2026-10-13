/**
 * Ein- und Ausgabetypen der Matching Engine v0.1 (Spec §4, §5, §16).
 *
 * DIE EINGABETYPEN SIND DIE DATENSCHUTZGRENZE: Sie kennen nur die Felder aus Spec §4.
 * Workstyle, Research-Items, Evidence-Narrative, Interview-Antworten, Stärken, Direction,
 * person_resources, Advisor- und Team-only-Daten haben hier keinen Platz. Die Adapter in
 * `adapters.ts` bauen die Eingaben feldweise auf; zusätzliche Felder einer DB-Zeile fallen weg.
 */

export type GateStatus = "eligible" | "uncertain" | "ineligible";

export type OwnershipWish = "own" | "contribute" | "grow_into" | "prefer_other" | "prefer_external" | "unclear";

export type CapabilityEntryInput = Readonly<{
  areaId: string;
  /** Erfahrung (1–5). Getrennte Achse vom Verantwortungswunsch. */
  applicationLevel: number | null;
  /** Gewünschte Verantwortung. NUR "own" ist Ownership. */
  ownershipWish: OwnershipWish | null;
}>;

/** Frage B (Spec §5): Was das Gegenüber von den Capabilities sehen darf – wirkt NUR auf Reasons. */
export type CapabilityVisibility = "none" | "areas" | "areas_and_depth";

export type CapabilityInput = Readonly<{
  /**
   * Frage C (Spec §5): ausdrückliche Matching-Freigabe für Bereich, Erfahrung und Verantwortungswunsch.
   * Bewusst ohne Default im Typ. Im Produkt gibt es diese Freigabe noch nicht – die Adapter setzen false.
   * Eine Sichtbarkeitsfreigabe (`areas`, `areas_depth_on_contact`) ist KEINE Matching-Freigabe.
   */
  matchingAllowed: boolean;
  entries: readonly CapabilityEntryInput[];
  visibleToCounterpart: CapabilityVisibility;
}>;

/** Die Must-haves, die das eingefrorene Gate v03 prüft (Spec §7). Privat: nur Gate, nie Reason-Inhalt. */
export type FindMustHavesInput = Readonly<{
  requiredRolesAny: readonly string[];
  minimumAvailabilityHoursPerWeek: number | null;
  acceptedRemoteModes: readonly string[];
  desiredLocationRegion: string | null;
  acceptedSearchIntents: readonly string[];
  acceptedStartHorizons: readonly string[];
  requiredCapabilityAreasAny: readonly string[];
  requiredExpertiseAny: readonly string[];
}>;

export type FindPersonInput = Readonly<{
  personId: string;
  /** updated_at oder Hash der Eingaben – nur zur Rekonstruierbarkeit. */
  inputVersion: string | null;
  /** Nur für die stabile Anzeige-Reihenfolge bei Gleichstand, nie Relevanz. */
  publishedAt: string | null;
  findProfileStatus: string | null;
  isFounder: boolean;
  ownRoles: readonly string[];
  seekingRoles: readonly string[];
  availabilityHoursPerWeek: number | null;
  availabilityFlexibility: string | null;
  commitmentLevel: string | null;
  ventureStage: string | null;
  ventureGoal: string | null;
  searchIntent: string | null;
  startHorizon: string | null;
  industries: readonly string[];
  expertise: readonly string[];
  locationRegion: string | null;
  remoteMode: string | null;
  mustHaves: FindMustHavesInput;
  capabilities: CapabilityInput;
}>;

/** Referenzdaten: Capability-Bereich -> Familie (capability_areas.family_id). */
export type FamilyOfArea = Readonly<Record<string, string>>;

export type FindContext = Readonly<{
  familyOfArea: FamilyOfArea;
  /** Pflichtangabe (Spec §11.2): jedes Ergebnis nennt den IDF-Snapshot, auch FIND. */
  idfCorpusVersion: string;
  /** Blockierung zwischen den beiden Personen (Produktregel, Pool-Voraussetzung). */
  blocked: boolean;
  computedAt: string | null;
}>;

export type Side = "a" | "b";

export type FindGateCode =
  | "POOL_SAME_PERSON"
  | "POOL_PROFILE_NOT_ACTIVE"
  | "POOL_NOT_FOUNDER"
  | "POOL_BLOCKED"
  | "GATE_REQUIRED_ROLES"
  | "GATE_MIN_HOURS"
  | "GATE_REMOTE_MODE"
  | "GATE_LOCATION"
  | "GATE_SEARCH_INTENT"
  | "GATE_START_HORIZON"
  | "GATE_CAPABILITY_AREAS"
  | "GATE_EXPERTISE"
  | "GATE_BOTH_ONSITE_DIFFERENT_PLACE";

export type GateReason<C extends string> = Readonly<{
  code: C;
  /** conflict -> ineligible, unknown -> uncertain */
  kind: "conflict" | "unknown";
  /** Wessen Bedingung (a / b), oder Paarregel. */
  conditionOwner: Side | "pair";
  field: string;
  /** Wer den Grund sehen darf. Private Must-haves sieht nur, wer sie gesetzt hat. */
  visibleTo: readonly Side[];
}>;

export type FindEligibility = Readonly<{ status: GateStatus; reasons: readonly GateReason<FindGateCode>[] }>;

export type DirectionalComponents = Readonly<{ roleCover: number | null; capCover: number | null; need: number }>;

export type IntentParts = Readonly<{
  searchIntent: number | null;
  startHorizon: number | null;
  ventureGoal: number | null;
  ventureStage: number | null;
}>;

export type Modulator = Readonly<{ context: number | null; intent: number | null; intentParts: IntentParts; mod: number }>;

export type EvidenceSummary = Readonly<{ score: number; present: readonly string[]; missing: readonly string[] }>;

export type Explanation<C extends string, A extends string> = Readonly<{
  code: C;
  /** Originalwerte (RAW VALUE), nie normalisierte Schlüssel. Name des Gegenübers setzt die UI. */
  params: Readonly<Record<string, string>>;
  audience: A;
}>;

export type FindReasonCode =
  | "FIND_ROLE_NEED_COVERED"
  | "FIND_ROLE_NEED_COVERED_REVERSE"
  | "FIND_AREA_OWN_COVERED"
  | "FIND_AREA_CONTRIBUTE"
  | "FIND_SAME_INDUSTRY"
  | "FIND_START_ALIGNED"
  | "FIND_STAGE_COMPLEMENT"
  | "FIND_DIFF_START"
  | "FIND_DIFF_COMMITMENT"
  | "FIND_DIFF_GOAL"
  | "FIND_UNKNOWN_LOCATION"
  /** Anzeigeregel außerhalb des Matchings (Spec §14) – die Engine erzeugt ihn in v0.1 nicht. */
  | "FIND_LIMITED_EVIDENCE";

/** Nur nach beidseitiger Zustimmung angehängt; ohne Einfluss auf Gate, Relevanz, Reihenfolge, Confidence. */
export type WorkstyleContext = Readonly<{
  points: readonly Readonly<{ area: string; pattern: "SIMILAR_PATTERN" | "DISCUSSION_POINT" | "INSUFFICIENT_DATA" }>[];
}>;

export type FindMatchResult = Readonly<{
  matchingVersion: string;
  normalizationVersion: string;
  idfCorpusVersion: string;
  context: "find";
  computedAt: string | null;
  inputVersions: Readonly<{ a: string | null; b: string | null }>;
  subject: Readonly<{ a: string; b: string }>;
  eligibility: FindEligibility;
  relevance: Readonly<{
    aToB: number;
    bToA: number;
    mutuality: number;
    components: Readonly<{ aToB: DirectionalComponents; bToA: DirectionalComponents; modulator: Modulator }>;
  }>;
  /** Getrennt von der Relevanz; verändert sie nie. Intern, keine Nutzerstufen. */
  confidence: Readonly<{ score: number; evidence: Readonly<{ a: EvidenceSummary; b: EvidenceSummary }> }>;
  explanations: readonly Explanation<FindReasonCode, Side>[];
  workstyleContext: WorkstyleContext | null;
}>;

// ---------------------------------------------------------------------------
// CONNECT
// ---------------------------------------------------------------------------
export type ConnectListingInput = Readonly<{
  listingId: string;
  ownerId: string;
  inputVersion: string | null;
  direction: "seeking" | "offering";
  category: string;
  title: string;
  summary: string;
  topics: readonly string[];
  industries: readonly string[];
  locations: readonly string[];
  geographicScope: string | null;
  remoteMode: string | null;
  status: string;
  visibility: string;
  publishedAt: string | null;
  expiresAt: string | null;
}>;

export type ConnectOwnerInput = Readonly<{
  personId: string;
  profileStatus: string | null;
  suggestable: boolean;
  /** Profil-Expertise der anbietenden Person (Topic-Teil von C1). */
  expertise: readonly string[];
}>;

export type ConnectOfferInput = Readonly<{ listing: ConnectListingInput; owner: ConnectOwnerInput }>;

export type ConnectContext = Readonly<{
  /** Referenzzeitpunkt für Laufzeit-Prüfungen (ISO). Kein implizites "jetzt". */
  now: string;
  viewerIsNetworkMember: boolean;
  /** `person_suggestion`: aktive Personen-Vorschläge, dort gilt `suggestable`. */
  purpose: "listing_match" | "person_suggestion";
  blockedOwnerIds: ReadonlySet<string>;
  computedAt: string | null;
}>;

export type ConnectGateCode =
  | "CONNECT_GATE_DIRECTION"
  | "CONNECT_GATE_OWN_LISTING"
  | "CONNECT_GATE_BLOCKED"
  | "CONNECT_GATE_NOT_VISIBLE"
  | "CONNECT_GATE_OFFER_NOT_ACTIVE"
  | "CONNECT_GATE_OFFER_EXPIRED"
  | "CONNECT_GATE_OWNER_PROFILE_NOT_ACTIVE"
  | "CONNECT_GATE_NOT_SUGGESTABLE"
  | "CONNECT_GATE_LOCATION";

export type ConnectReasonCode =
  | "CONNECT_TOPIC_MATCH"
  | "CONNECT_TOPIC_VIA_EXPERTISE"
  | "CONNECT_TEXT_OVERLAP"
  | "CONNECT_SAME_INDUSTRY"
  | "CONNECT_SAME_CATEGORY"
  | "CONNECT_REMOTE_POSSIBLE"
  | "CONNECT_UNKNOWN_LOCATION"
  /** Anzeigeregel außerhalb des Matchings (Spec §14) – die Engine erzeugt ihn in v0.1 nicht. */
  | "CONNECT_LIMITED_EVIDENCE";

export type ConnectMatchResult = Readonly<{
  matchingVersion: string;
  normalizationVersion: string;
  idfCorpusVersion: string;
  context: "connect";
  computedAt: string | null;
  inputVersions: Readonly<{ seekListing: string | null; offerListing: string | null }>;
  subject: Readonly<{ seekListing: string; offerListing: string }>;
  eligibility: Readonly<{ status: GateStatus; reasons: readonly GateReason<ConnectGateCode>[] }>;
  relevance: Readonly<{
    score: number;
    components: Readonly<{ topic: number; text: number; industry: number; category: number; cappedNoTopic: boolean }>;
  }>;
  confidence: Readonly<{ score: number; evidence: Readonly<{ seek: EvidenceSummary; offer: EvidenceSummary }> }>;
  explanations: readonly Explanation<ConnectReasonCode, "seeker">[];
}>;

/** Eintrag einer Rangliste: Gleichstand wird explizit ausgewiesen (Spec §11.1). */
export type Ranked<R> = Readonly<{
  rank: number;
  result: R;
  /** Gleicher Relevanzwert = gleiche Gruppe. null, wenn der Wert eindeutig ist. */
  tieGroup: string | null;
  /** Nur stabile Anzeige (Veröffentlichung, dann ID). Kein Relevanzsignal. */
  secondaryOrder: string;
}>;
