import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import { intentionForOnboarding, parseInterests, type InterestArea } from "@/features/profile/interests";

/**
 * Das Modell der Einstiegs-Kartenreise: reine Funktionen, ohne Datenbank.
 *
 * Die Reise ist ein anderer Weg zu DENSELBEN Angaben wie der bisherige Einstieg
 * (`ProfileBasicsForm`): Name, Rollen, Schwerpunkt, Absicht, Kernprofil. Hier
 * steht, wie aus den Antworten diese Werte werden.
 */

export const JOURNEY_AREAS = ["align", "find", "connect", "advise"] as const;
export type JourneyArea = (typeof JOURNEY_AREAS)[number];

export const JOURNEY_FOCI = [
  "product",
  "tech",
  "design",
  "sales",
  "marketing",
  "finance",
  "operations",
  "strategy",
  "research",
] as const;
export type JourneyFocus = (typeof JOURNEY_FOCI)[number];

export const JOURNEY_REMOTE_MODES = ["onsite", "hybrid", "remote", "flexible"] as const;
export type JourneyRemoteMode = (typeof JOURNEY_REMOTE_MODES)[number];

export const JOURNEY_ALIGN_PLANS = ["first", "all", "later"] as const;
export type JourneyAlignPlan = (typeof JOURNEY_ALIGN_PLANS)[number];

export const JOURNEY_LIMITS = { name: 80, headline: 160, bio: 1200, expertise: 8, expertiseItem: 80 } as const;

export type JourneyPayload = {
  areas: JourneyArea[];
  name: string;
  headline: string;
  bio: string;
  foci: JourneyFocus[];
  /** Beschriftungen der angekreuzten Unterbereiche, in der Sprache der Person. */
  expertise: string[];
  where: JourneyRemoteMode | "";
  alignPlan: JourneyAlignPlan;
  /** Womit angefangen wird. Nur ein gewaehlter Bereich zaehlt; sonst der erste. */
  start: JourneyArea | "";
};

function pickFrom<T extends string>(values: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(values)) return [];
  const wanted = new Set(values.filter((value): value is string => typeof value === "string"));
  return allowed.filter((item) => wanted.has(item));
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Liest die Antworten aus dem versteckten Feld. Alles wird geprueft: Das Feld
 * kommt aus dem Browser und ist so vertrauenswuerdig wie jede Eingabe.
 */
export function parseJourneyPayload(raw: unknown): JourneyPayload | null {
  if (typeof raw !== "string" || raw.length > 20_000) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const input = data as Record<string, unknown>;

  const areas = pickFrom(input.areas, JOURNEY_AREAS);
  const expertise = Array.isArray(input.expertise)
    ? [
        ...new Set(
          input.expertise
            .map((item) => text(item, JOURNEY_LIMITS.expertiseItem))
            .filter((item) => item.length > 0 && !item.includes(","))
        ),
      ].slice(0, JOURNEY_LIMITS.expertise)
    : [];
  const where = (JOURNEY_REMOTE_MODES as readonly string[]).includes(input.where as string)
    ? (input.where as JourneyRemoteMode)
    : "";
  const alignPlan = (JOURNEY_ALIGN_PLANS as readonly string[]).includes(input.alignPlan as string)
    ? (input.alignPlan as JourneyAlignPlan)
    : "first";

  return {
    areas,
    name: text(input.name, JOURNEY_LIMITS.name),
    headline: text(input.headline, JOURNEY_LIMITS.headline),
    bio: text(input.bio, JOURNEY_LIMITS.bio),
    foci: pickFrom(input.foci, JOURNEY_FOCI),
    expertise,
    where,
    alignPlan,
    start: areas.includes(input.start as JourneyArea) ? (input.start as JourneyArea) : "",
  };
}

/** Align oder Find machen aus einem Konto ein Founder-Konto. Nur Connect nicht - dort gibt es bewusst keine Rolle. */
export function needsFounderRole(areas: readonly JourneyArea[]) {
  return areas.includes("align") || areas.includes("find");
}

export function needsAdvisorRole(areas: readonly JourneyArea[]) {
  return areas.includes("advise");
}

/** Die Rollen fuer `profiles.roles`. Leer heisst: keine profiles-Zeile anlegen (nur Connect). */
export function rolesFor(areas: readonly JourneyArea[]): ("founder" | "advisor")[] {
  return [...(needsFounderRole(areas) ? (["founder"] as const) : []), ...(needsAdvisorRole(areas) ? (["advisor"] as const) : [])];
}

/** Wie der bisherige Einstieg den Schwerpunkt ausdrueckt (Freitext, nicht leer). */
const FOCUS_SKILL: Record<JourneyFocus, string> = {
  product: "Product",
  tech: "Tech",
  design: "Sonstiges",
  sales: "Sales",
  marketing: "Marketing",
  finance: "Finance",
  operations: "Operations",
  strategy: "Sonstiges",
  research: "Sonstiges",
};

export function focusSkillFor(foci: readonly JourneyFocus[]) {
  return foci.length > 0 ? FOCUS_SKILL[foci[0]] : "Allrounder";
}

/** Womit angefangen wird: die ausdrueckliche Wahl, sonst der erste gewaehlte Bereich in fester Reihenfolge. */
export function startAreaFor(areas: readonly JourneyArea[], start: JourneyArea | "" = ""): JourneyArea | "" {
  if (start && areas.includes(start)) return start;
  return JOURNEY_AREAS.find((area) => areas.includes(area)) ?? "";
}

/** Die Absicht wie im bisherigen Einstieg: Begleiten, wenn der Advisor-Bereich der Anfang ist, sonst Suche oder Selbsttest. */
export function intentionFor(areas: readonly JourneyArea[], start: JourneyArea | "" = "") {
  const first = startAreaFor(areas, start);
  if (first === "advise" || (needsAdvisorRole(areas) && !needsFounderRole(areas))) return "Begleiten" as const;
  return intentionForOnboarding("founder", first === "find" ? "find" : first);
}

export function interestsFor(areas: readonly JourneyArea[]): InterestArea[] {
  return parseInterests(areas);
}

function pathFor(area: JourneyArea, alignPlan: JourneyAlignPlan): string | null {
  if (area === "align") return alignPlan === "later" ? null : CURRENT_WORKSTYLE_HREF;
  if (area === "find") return "/discovery/profile";
  if (area === "connect") return "/connect/profile";
  return "/advisor/dashboard";
}

/**
 * Wohin der Abschluss fuehrt: in den gewaehlten Anfang, sonst in den ersten
 * Bereich, der jetzt etwas zu tun hat. Wer bei Align "erst die normalen
 * Profildaten" gewaehlt hat, wird nicht in den Fragebogen geschickt.
 */
export function nextPathFor(payload: Pick<JourneyPayload, "areas" | "alignPlan"> & { start?: JourneyArea | "" }): string {
  const first = startAreaFor(payload.areas, payload.start ?? "");
  const order = first ? [first, ...JOURNEY_AREAS.filter((area) => area !== first)] : [...JOURNEY_AREAS];
  for (const area of order) {
    if (!payload.areas.includes(area)) continue;
    const path = pathFor(area, payload.alignPlan);
    if (path) return path;
  }
  return "/dashboard";
}
