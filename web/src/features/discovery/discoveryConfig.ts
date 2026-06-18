import {
  DISCOVERY_COMMITMENT_LEVELS,
  DISCOVERY_FOUNDER_ROLES,
  DISCOVERY_PRIORITY_KEYS,
  DISCOVERY_REMOTE_MODES,
  DISCOVERY_STATUSES,
  DISCOVERY_VENTURE_GOALS,
  DISCOVERY_VENTURE_STAGES,
  type DiscoveryCommitmentLevel,
  type DiscoveryFounderRole,
  type DiscoveryPriorityKey,
  type DiscoveryRemoteMode,
  type DiscoveryStatus,
  type DiscoveryVentureGoal,
  type DiscoveryVentureStage,
} from "@/features/discovery/discoveryTypes";

export const DISCOVERY_TEXT_LIMITS = {
  displayName: 80,
  headline: 160,
  bio: 1200,
  locationLabel: 120,
  industry: 80,
} as const;

export const DISCOVERY_SELECTION_LIMITS = {
  ownRoles: 3,
  seekingRoles: 3,
  industries: 5,
  priorityWeightsAboveZero: 5,
} as const;

export const DISCOVERY_STATUS_LABELS: Record<DiscoveryStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  paused: "Pausiert",
};

export const DISCOVERY_ROLE_LABELS: Record<DiscoveryFounderRole, string> = {
  tech: "Tech",
  product: "Product",
  sales: "Sales",
  growth: "Growth",
  marketing: "Marketing",
  operations: "Operations",
  finance: "Finance",
  design: "Design",
  strategy: "Strategie",
  research: "Research",
  community: "Community",
  other: "Anderer Schwerpunkt",
};

export const DISCOVERY_REMOTE_MODE_LABELS: Record<DiscoveryRemoteMode, string> = {
  onsite: "Vor Ort",
  hybrid: "Hybrid",
  remote: "Remote",
  flexible: "Flexibel",
};

export const DISCOVERY_COMMITMENT_LABELS: Record<DiscoveryCommitmentLevel, string> = {
  exploring: "Ich orientiere mich noch",
  side_project: "Nebenprojekt",
  part_time: "Teilzeit verbindlich",
  full_time: "Vollzeit",
  all_in: "All-in",
};

export const DISCOVERY_VENTURE_STAGE_LABELS: Record<DiscoveryVentureStage, string> = {
  undecided: "Noch offen",
  no_idea_open_to_join: "Keine eigene Idee, offen einzusteigen",
  exploring_ideas: "Ich prüfe Ideen",
  idea_validating: "Ich validiere eine Idee",
  already_building: "Ich baue bereits",
};

export const DISCOVERY_VENTURE_GOAL_LABELS: Record<DiscoveryVentureGoal, string> = {
  undecided: "Noch offen",
  explore: "Gemeinsam herausfinden",
  side_project: "Nebenbei aufbauen",
  profitable_business: "Tragfähiges Unternehmen",
  venture_scale: "Stark skalierbares Unternehmen",
  exit_oriented: "Mit klarer Exit-Option",
};

export const DISCOVERY_PRIORITY_META: Record<
  DiscoveryPriorityKey,
  {
    label: string;
    description: string;
  }
> = {
  shared_vision: {
    label: "Gemeinsames Bild",
    description: "Wie wichtig dir eine ähnliche Richtung für das Unternehmen ist.",
  },
  commitment: {
    label: "Ähnliches Commitment",
    description: "Wie wichtig dir ein vergleichbarer Einsatz und eine ähnliche Priorität sind.",
  },
  skill_complementarity: {
    label: "Ergänzende Fähigkeiten",
    description: "Wie stark dich jemand ergänzen soll, statt dass ihr dasselbe mitbringt.",
  },
  venture_goal: {
    label: "Ähnliches Aufbauziel",
    description: "Wie wichtig dir ist, dass ihr ähnlich über Größe, Tempo und Zielbild denkt.",
  },
  exit_logic: {
    label: "Exit-Logik",
    description: "Wie wichtig dir ein ähnliches Gefühl für langfristigen Aufbau oder möglichen Exit ist.",
  },
  availability: {
    label: "Verfügbarkeit",
    description: "Wie wichtig dir ist, dass Zeit und Verbindlichkeit gut zusammenpassen.",
  },
  work_style: {
    label: "Arbeitsstil",
    description: "Wie wichtig dir ein ähnlicher Rhythmus im Alltag ist.",
  },
  execution_strength: {
    label: "Umsetzungskraft",
    description: "Wie wichtig dir ist, dass jemand stark ins Tun kommt.",
  },
  location: {
    label: "Standort und Nähe",
    description: "Wie wichtig dir Ort, Zeitzone oder persönliches Treffen sind.",
  },
  industry: {
    label: "Branche und Interesse",
    description: "Wie wichtig dir Überschneidung bei Markt, Thema oder Interesse ist.",
  },
  communication: {
    label: "Vertrauen und Kommunikation",
    description: "Wie wichtig dir ein klarer, verlässlicher Austausch ist.",
  },
};

export const DISCOVERY_STATUS_OPTIONS = DISCOVERY_STATUSES.map((value) => ({
  value,
  label: DISCOVERY_STATUS_LABELS[value],
}));

export const DISCOVERY_ROLE_OPTIONS = DISCOVERY_FOUNDER_ROLES.map((value) => ({
  value,
  label: DISCOVERY_ROLE_LABELS[value],
}));

export const DISCOVERY_REMOTE_MODE_OPTIONS = DISCOVERY_REMOTE_MODES.map((value) => ({
  value,
  label: DISCOVERY_REMOTE_MODE_LABELS[value],
}));

export const DISCOVERY_COMMITMENT_OPTIONS = DISCOVERY_COMMITMENT_LEVELS.map((value) => ({
  value,
  label: DISCOVERY_COMMITMENT_LABELS[value],
}));

export const DISCOVERY_VENTURE_STAGE_OPTIONS = DISCOVERY_VENTURE_STAGES.map((value) => ({
  value,
  label: DISCOVERY_VENTURE_STAGE_LABELS[value],
}));

export const DISCOVERY_VENTURE_GOAL_OPTIONS = DISCOVERY_VENTURE_GOALS.map((value) => ({
  value,
  label: DISCOVERY_VENTURE_GOAL_LABELS[value],
}));

export const DISCOVERY_PRIORITY_OPTIONS = DISCOVERY_PRIORITY_KEYS.map((value) => ({
  value,
  ...DISCOVERY_PRIORITY_META[value],
}));
