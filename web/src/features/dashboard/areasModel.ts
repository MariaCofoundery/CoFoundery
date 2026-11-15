import { alignPartHref, ALIGN_PART_KEYS, type AlignPartKey } from "@/features/align/alignModel";
import { INTEREST_AREAS, type InterestArea } from "@/features/profile/interests";

/**
 * "Deine Bereiche" auf der Startseite: je Bereich eine Karte mit dem Stand als Tatsache und einem Knopf.
 *
 * Bereiche, in denen schon etwas passiert ist, stehen oben mit ihrem Stand; die uebrigen darunter mit dem Satz
 * "Du willst auch ...?". Wer alles nutzen will, geht Karte fuer Karte durch. Die im Einstieg gewaehlte Absicht
 * (`person_core.interests`) sortiert hier nichts - die Startseite liest sie bewusst nicht (Entscheidung vom 04.11.2026);
 * was zaehlt, ist, was die Person tatsaechlich getan hat. Es gibt keine Prozent, keine Rangfolge und keinen Gesamtwert - nur "noch offen",
 * "angefangen" und "steht".
 */
export type AreaState = "open" | "started" | "done";
export type AreaCard = { key: InterestArea; chosen: boolean; state: AreaState; href: string };

type Input = {
  /** Die vier Align-Teile: Arbeitsweise, Koennen, Staerken, Richtung. */
  alignParts: Record<AlignPartKey, boolean>;
  /** Stand des Find-Profils: keins, Entwurf, aktiv oder pausiert. */
  find: "draft" | "active" | "paused" | null;
  /** Stand des Connect-Profils: keins, Entwurf oder aktiv. */
  connect: "draft" | "active" | null;
  hasAdvisor: boolean;
};

export function areaCards(input: Input): AreaCard[] {
  const alignDone = ALIGN_PART_KEYS.filter((key) => input.alignParts[key]).length;
  const firstOpenAlign = ALIGN_PART_KEYS.find((key) => !input.alignParts[key]);
  const states: Record<InterestArea, { state: AreaState; href: string }> = {
    align: {
      state: alignDone === ALIGN_PART_KEYS.length ? "done" : alignDone > 0 ? "started" : "open",
      href: firstOpenAlign ? alignPartHref(firstOpenAlign, input.alignParts[firstOpenAlign] ? "done" : "open") : "/me/profile/workstyle",
    },
    find: {
      state: input.find === "active" || input.find === "paused" ? "done" : input.find === "draft" ? "started" : "open",
      href: "/discovery/profile",
    },
    connect: {
      state: input.connect === "active" ? "done" : input.connect === "draft" ? "started" : "open",
      href: "/connect/profile",
    },
    advise: { state: input.hasAdvisor ? "started" : "open", href: "/advisor/los-gehts" },
  };
  // "Aktiv" ist ein Bereich, in dem schon etwas getan wurde.
  return INTEREST_AREAS.map((key) => ({ key, chosen: states[key].state !== "open", ...states[key] }));
}
