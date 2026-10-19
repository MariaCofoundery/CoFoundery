import type { TradeoffsReadiness } from "@/features/modules/tradeoffs/teamParse";
import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * Made2Found Module Architecture v1.0 - die Typen des Module Contract.
 *
 * Quelle: `docs/architecture/module-architecture-v1.md`, Abschnitt 4.
 *
 * WAS DIESE DATEI IST: die Beschreibung, nicht die Daten. Eine
 * `ModuleDefinition` sagt, was ein Modul ist (Scope, Tier, Speicherform,
 * Versionen, Freigabeklasse, Renderer-Verweise). Sie speichert keine Antworten
 * und entscheidet keine Abschlusslogik - die bleibt bei jedem System selbst.
 *
 * MODUL IST NICHT INSTRUMENT, und eine Erhebungsmethode ist keine Speicherform:
 *
 *   - `versionId` ist immer Pflicht, `instrumentId` nur bei `storage =
 *     "assessments"`. Strengths, Capability und Direction werden durch den
 *     Contract nicht kuenstlich zu Instrument-Modulen.
 *   - `input.method` (wie erhoben wird) und `input.storage` (wo und mit
 *     welchem Lebenszyklus gespeichert wird) sind getrennte Felder. Aus
 *     "questionnaire" folgt nichts automatisch.
 */

export const MODULE_SCOPES = ["person", "person_in_venture", "team"] as const;
export type ModuleScope = (typeof MODULE_SCOPES)[number];

export const MODULE_TIERS = ["core", "deepening"] as const;
export type ModuleTier = (typeof MODULE_TIERS)[number];

export const MODULE_CADENCES = ["once", "revisable", "recurring"] as const;
export type ModuleCadence = (typeof MODULE_CADENCES)[number];

export const MODULE_USAGES = ["product", "research_only"] as const;
export type ModuleUsage = (typeof MODULE_USAGES)[number];

export const INPUT_METHODS = ["questionnaire", "interview", "manual", "rounds"] as const;
export type InputMethod = (typeof INPUT_METHODS)[number];

/**
 * Wo die Antworten tatsaechlich liegen und mit welchem Lebenszyklus.
 *
 * `assessments` heisst: Antworten in `assessments` + `alignment_answers` mit
 * Entwurf -> Abgabe. `existing` heisst: ein bestehendes System mit eigenem
 * Speicher (Strengths, Capability, Direction). Der Freigabevertrag steht davon
 * getrennt in `sharing.bindsTo`.
 */
export const STORAGE_KINDS = ["assessments", "structured", "rounds", "existing"] as const;
export type StorageKind = (typeof STORAGE_KINDS)[number];

export const SHARING_CEILINGS = ["owner_only", "statements", "answers"] as const;
export type SharingCeiling = (typeof SHARING_CEILINGS)[number];

export const SENSITIVITIES = ["standard", "sensitive"] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];

export const SHARING_BINDINGS = ["assessment", "round", "existing_contract"] as const;
export type SharingBinding = (typeof SHARING_BINDINGS)[number];

/** Rechnerische Vergleichsmethode - getrennt von der Aussage (Stance). */
export const COMPARE_METHODS = [
  "none",
  "equality",
  "ordinal_distance",
  "set_overlap",
  "numeric_range",
  "crosscheck",
  "path_and_weights",
] as const;
export type CompareMethod = (typeof COMPARE_METHODS)[number];

export const COMPARE_STANCES = [
  "neutral_difference",
  "complementary_welcome",
  "needs_clarification",
  "conversation_only",
] as const;
export type CompareStance = (typeof COMPARE_STANCES)[number];

export type CompareRule = {
  /** Worauf sich die Regel bezieht (Item, Itemgruppe). */
  target: string;
  method: CompareMethod;
  stance: CompareStance;
  /** Wann ein Unterschied relevant ist - deklariert, nie global berechnet. */
  relevantWhen?: string;
};

export const SETUP_HANDOFF_WHEN = ["always", "difference"] as const;
export type SetupHandoffWhen = (typeof SETUP_HANDOFF_WHEN)[number];

export type ModuleVersion = {
  /** Immer Pflicht. */
  versionId: string;
  /** Nur bei instrumentbasierten Modulen; Pflicht genau bei `storage = "assessments"`. */
  instrumentId?: string;
  compatGroup: string;
  /** Nur gemeinsame, unveraenderte Items sind vergleichbar. */
  compat?: "intersect";
};

export type ModuleDefinition = {
  /** Stabil, nie wiederverwendet. */
  moduleId: string;
  /**
   * Marker: ein BESTEHENDES System, das ueber einen Adapter registriert ist.
   *
   * `storage` beschreibt den tatsaechlichen Antwortspeicher, `sharing.bindsTo`
   * den Freigabevertrag - beides getrennt. Ein bestehender Adapter macht einen
   * Assessment-Speicher nicht zu `existing`, teilt aber nach seinem eigenen
   * Vertrag. Der Marker erlaubt dort `bindsTo = existing_contract`, statt es
   * aus dem Storage zu raten. Native Module setzen ihn nie.
   */
  legacyAdapter?: true;
  /**
   * Die Vertiefung haengt an einem Core-Modul: dessen `moduleId`.
   *
   * Nur fuer `tier = deepening`, GENAU EIN primaerer Anker: Beruehrt eine
   * Vertiefung mehrere Themen, bekommt sie im Profil trotzdem nur einen Platz.
   * Pflicht bei jeder Vertiefung ausser im Team-Scope (ein Team-Check-in hat
   * keinen Profil-Anhang). Das Ziel muss ein registriertes Core-Modul desselben
   * Scopes sein - so vermischt keine Vertiefung Person und Vorhaben - und darf
   * nicht die Vertiefung selbst sein. Die UI hat keine zweite Zuordnung.
   */
  deepens?: string;
  scope: ModuleScope;
  tier: ModuleTier;
  cadence: ModuleCadence;
  usage: ModuleUsage;
  input: {
    method: InputMethod;
    /** Weitere Wege zum selben Ergebnis (z. B. Interview und manuell). */
    additionalMethods?: readonly InputMethod[];
    storage: StorageKind;
    writesTo: string;
  };
  versions: readonly ModuleVersion[];
  /** Verweist auf die eigene Wahrheit des Moduls - keine zweite Completion. */
  completion: { source: string };
  sharing: {
    ceiling: SharingCeiling;
    sensitivity: Sensitivity;
    bindsTo: SharingBinding;
  };
  compare?: readonly CompareRule[];
  renderers: {
    profileCard?: string;
    detail: string;
    comparison?: string;
    teamView?: string;
  };
  setupHandoff?: readonly { target: FounderSetupItemKey; when: SetupHandoffWhen }[];
  i18n: { namespace: string };
};

// ---------------------------------------------------------------------------
// Adapter (Phase B)
// ---------------------------------------------------------------------------

/** Bestandsdaten ohne gespeicherten Modul-Versionsstempel. */
export const LEGACY_UNVERSIONED = "legacy_unversioned" as const;
export type LegacyUnversioned = typeof LEGACY_UNVERSIONED;

export type ModuleState = "not_started" | "in_progress" | "done_for_now";

export type ModuleStatus = {
  state: ModuleState;
  /**
   * Version des ABGESCHLOSSENEN Ergebnisses; sonst `null`.
   *
   * Ergebnisse ohne Stempel ergeben `legacy_unversioned` und werden nie auf
   * die aktuelle `versionId` gemappt.
   */
  completedVersion: string | LegacyUnversioned | null;
};

/** Der Mensch, um dessen Daten es geht. Die Daten selbst stehen im Kontext. */
export type ModuleUser = { id: string };

/** Ein Wegweiser fuer eine spaetere Profilkarte - keine Zahl ueber Module hinweg. */
export type ModuleTeaser = {
  href: string;
  hasContent: boolean;
  /** Ein bis zwei kurze Saetze fuer eine abgeschlossene Vertiefung (spaeter vom Renderer des Moduls). */
  lines?: readonly string[];
  /** Inhalte, die das Profil schon zeigt (z. B. Anzahl Staerken); kein Fortschritt. */
  counts?: Readonly<Record<string, number>>;
};

/**
 * Der bestehende Freigabevertrag, wie er heute gilt - der Adapter aendert ihn nicht.
 *
 * `team_share` mit `teamId: null` heisst: im Kontext war kein Team - also fuer
 * keines geteilt. `none` heisst: auf Modulebene gibt es keinen Vertrag (Staerken
 * und Direction kennen nur Advisor-Personenfreigaben, die nicht Teil des Adapters
 * sind).
 */
export type ModuleShareState =
  | { contract: "none" }
  | { contract: "team_share"; teamId: string | null; active: boolean }
  | { contract: "capability_disclosure"; level: string }
  | { contract: "visible_on_submit"; ventureId: string; visibleToTeam: boolean }
  /** Freigabe EINES Durchlaufs fuer den Teamvergleich (Phase E): nur der neueste abgegebene zaehlt. */
  | { contract: "assessment_share"; assessmentId: string | null; active: boolean };

export interface ModuleAdapter {
  describe(): ModuleDefinition;
  status(user: ModuleUser, context: ModuleContext): ModuleStatus;
  profileTeaser(user: ModuleUser, context: ModuleContext): ModuleTeaser | null;
  shareState(user: ModuleUser, context: ModuleContext): ModuleShareState;
}

/** Eine Antwort aus `alignment_answers`, wie die Lesbarmachung sie braucht. */
export type TradeoffAnswerRow = {
  block_id: string;
  value: Record<string, unknown> | null;
  missing_code: string | null;
};

/** Eine Zeile aus `assessments`, wie die Produktlogik sie liest. */
export type AssessmentRow = {
  /** Nur wo die Antworten dazu gelesen werden (Teaser-Zeilen). */
  id?: string;
  instrument_id: string;
  venture_id?: string | null;
  submitted_at: string | null;
  created_at?: string | null;
};

/**
 * Was die Adapter aus den bestehenden Quellen bekommen.
 *
 * Reine Daten: Die Adapter selbst sprechen mit keiner Datenbank. Geladen wird
 * mit den Abfragen, die das Produkt heute auch benutzt (`loadModuleContext`).
 */
export type ModuleContext = {
  /** Wie `getAboutYouFacts` sie liefert; fuer die vier Person-Module. */
  personFacts?: import("@/features/profile/aboutYou").AboutYouFacts;
  /**
   * Hat die Person je einen Workstyle-Bogen des AKTUELLEN Instruments abgegeben?
   *
   * Ein abgeschlossener Stand bleibt gueltig: Ein spaeter begonnener Update-
   * Entwurf macht daraus nicht wieder „unvollstaendig". `AboutYouFacts` kennt nur
   * die NEUESTE Zeile (ein neuer Entwurf wuerde dort `workSubmitted = false`
   * ergeben); diese Angabe schliesst die Luecke. `null` = nicht lesbar.
   */
  workstyleSubmitted?: boolean | null;
  /** Das Vorhaben (= `founder_teams.id`), fuer `person_in_venture`. */
  ventureId?: string | null;
  /**
   * Zeilen aus `assessments` zu diesem Vorhaben und dem Instrument: die neueste
   * Zeile und die neueste ABGEGEBENE (oft dieselbe). `null` heisst: nicht lesbar.
   */
  ventureAssessments?: readonly AssessmentRow[] | null;
  /**
   * Zeilen aus `assessments` zu diesem Vorhaben und dem Instrument von „Werte &
   * Zielkonflikte" (neueste und neueste abgegebene). `null`: nicht lesbar.
   */
  tradeoffsAssessments?: readonly AssessmentRow[] | null;
  /** Die Antworten der neuesten ABGEGEBENEN Fassung von „Werte & Zielkonflikte". */
  tradeoffsAnswers?: readonly TradeoffAnswerRow[] | null;
  /** Die EIGENE Lage zur Freigabe von „Werte & Zielkonflikte" - von der Datenbank, nicht zusammengesetzt. */
  tradeoffsReadiness?: TradeoffsReadiness | null;
  /** Venture Alignment (Beta): die Zeilen, die Antworten des neuesten abgegebenen Durchlaufs und die eigene Freigabe-Lage. */
  betaAssessments?: readonly AssessmentRow[] | null;
  betaAnswers?: readonly TradeoffAnswerRow[] | null;
  betaReadiness?: TradeoffsReadiness | null;
  /**
   * Uebersetzt einen Schluessel des Sprachbundles - fuer die kurzen Teaser-Zeilen
   * abgeschlossener Vertiefungen. Ohne sie gibt es keine Zeilen (statt
   * unuebersetzter Saetze).
   */
  translate?: (key: string, values?: Record<string, string | number>) => string;
  /** Die Sprache der Ausgabe; die Registry-Texte sind deutsch, die englische Fassung kommt aus der Anzeigeschicht. */
  locale?: "de" | "en";
  /** Das Team der Teamfreigabe und ob die Person dafuer geteilt hat. */
  teamShare?: { teamId: string; active: boolean } | null;
  /** `person_core.capability_disclosure`. */
  capabilityDisclosure?: string | null;
};

export class ModuleContextError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ModuleContextError";
    this.code = code;
  }
}
