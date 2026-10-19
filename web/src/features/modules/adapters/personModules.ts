import {
  CAPABILITY_MODULE,
  DIRECTION_MODULE,
  STRENGTHS_MODULE,
  WORKSTYLE_MODULE,
} from "@/features/modules/definitions";
import {
  moduleStateOf,
  moduleStateOfSteps,
  requirePersonFacts,
  stepOf,
} from "@/features/modules/adapters/shared";
import { findVersionOfInstrument } from "@/features/modules/registry";
import { CURRENT_WORKSTYLE_INSTRUMENT } from "@/features/instruments/workstyle/current";
import {
  LEGACY_UNVERSIONED,
  ModuleContextError,
  type ModuleAdapter,
} from "@/features/modules/types";

/**
 * Die vier Person-Adapter: Workstyle, Strengths, Capability, Direction.
 *
 * Alle vier lesen ueber `buildAboutYou` - die Produktlogik des Profils - und
 * veraendern nichts. Quelle der Wahrheit bleibt jeweils dort, wo sie heute ist
 * (siehe `completion.source` in der Definition).
 *
 * ZU `completedVersion`: Nur Workstyle hat einen echten Stempel (das
 * Instrument). Strengths, Capability und Direction haben nie einen
 * gespeichert; ihr Bestand ist `legacy_unversioned` und wird NICHT auf
 * `<modul>@1` gemappt. Ein abgeschlossenes Ergebnis ohne Stempel ist kein
 * Ergebnis der Version, unter der erst kuenftig gestempelt wird.
 */

export const workstyleAdapter: ModuleAdapter = {
  describe: () => WORKSTYLE_MODULE,

  status(_user, context) {
    const step = stepOf(requirePersonFacts(context), "arbeitsweise");
    const state = moduleStateOf(step.status);
    if (state !== "done_for_now") return { state, completedVersion: null };

    // Abgegeben ist immer das aktuelle Instrument: `getAboutYouFacts` fragt nur
    // danach und liest keine aeltere Fassung als „fertig".
    const version = findVersionOfInstrument(WORKSTYLE_MODULE.moduleId, CURRENT_WORKSTYLE_INSTRUMENT);
    if (!version) throw new ModuleContextError("workstyle_version_not_registered");
    return { state, completedVersion: version.versionId };
  },

  profileTeaser(_user, context) {
    const facts = requirePersonFacts(context);
    return { href: stepOf(facts, "arbeitsweise").href, hasContent: facts.workSubmitted };
  },

  shareState(_user, context) {
    // Die Teamfreigabe gilt je Team (`team_shares`); ohne Team im Kontext ist
    // fuer keines geteilt.
    return {
      contract: "team_share",
      teamId: context.teamShare?.teamId ?? null,
      active: context.teamShare?.active ?? false,
    };
  },
};

export const strengthsAdapter: ModuleAdapter = {
  describe: () => STRENGTHS_MODULE,

  status(_user, context) {
    const state = moduleStateOf(stepOf(requirePersonFacts(context), "staerken").status);
    return { state, completedVersion: state === "done_for_now" ? LEGACY_UNVERSIONED : null };
  },

  profileTeaser(_user, context) {
    const facts = requirePersonFacts(context);
    return {
      href: stepOf(facts, "staerken").href,
      hasContent: facts.strengthCount > 0,
      counts: { statements: facts.strengthCount },
    };
  },

  shareState: () => ({ contract: "none" }),
};

/**
 * Capability sind drei Schritte des Profils: Bereiche, Erfahrung (Stufe) und
 * Verantwortung (Wunsch). Das Gespraech (`gespraech`) ist ein Erhebungsweg und
 * zaehlt nicht zum Abschluss; die Stufen- und Wunschschritte folgen derselben
 * Regel wie die Station „Was du mitbringst" (`stationStatus`).
 */
const CAPABILITY_STEPS = ["faehigkeiten", "erfahrung", "verantwortung"] as const;

export const capabilityAdapter: ModuleAdapter = {
  describe: () => CAPABILITY_MODULE,

  status(_user, context) {
    const facts = requirePersonFacts(context);
    const state = moduleStateOfSteps(CAPABILITY_STEPS.map((id) => stepOf(facts, id)));
    return { state, completedVersion: state === "done_for_now" ? LEGACY_UNVERSIONED : null };
  },

  profileTeaser(_user, context) {
    const facts = requirePersonFacts(context);
    return {
      href: stepOf(facts, "faehigkeiten").href,
      hasContent: facts.areaCount > 0,
      counts: { areas: facts.areaCount },
    };
  },

  shareState(_user, context) {
    // Wie die Profilseite: ohne gesetzte Stufe gilt „private".
    return { contract: "capability_disclosure", level: context.capabilityDisclosure ?? "private" };
  },
};

export const directionAdapter: ModuleAdapter = {
  describe: () => DIRECTION_MODULE,

  status(_user, context) {
    const state = moduleStateOf(stepOf(requirePersonFacts(context), "antrieb").status);
    return { state, completedVersion: state === "done_for_now" ? LEGACY_UNVERSIONED : null };
  },

  profileTeaser(_user, context) {
    const facts = requirePersonFacts(context);
    return {
      href: stepOf(facts, "antrieb").href,
      hasContent: facts.directionAnswers > 0 || facts.directionStatements > 0,
      counts: { statements: facts.directionStatements },
    };
  },

  shareState: () => ({ contract: "none" }),
};
