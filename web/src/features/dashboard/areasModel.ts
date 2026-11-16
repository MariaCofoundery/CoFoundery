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
/** Wie viele der vier Align-Teile fertig sind und welche - fuer den Satz auf der Kachel. */
export type AreaCard = {
  key: InterestArea; chosen: boolean; state: AreaState; href: string;
  /** Nur Find und Connect: der genaue Stand des Profils. */
  detail: "draft" | "active" | "paused" | null;
  /** Nur Align: die fertigen und die fehlenden Teile. */
  doneParts: AlignPartKey[]; missingParts: AlignPartKey[];
};

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
  const detail = (key: InterestArea): AreaCard["detail"] => (key === "find" ? input.find : key === "connect" ? input.connect : null);
  const doneParts = ALIGN_PART_KEYS.filter((key) => input.alignParts[key]);
  const missingParts = ALIGN_PART_KEYS.filter((key) => !input.alignParts[key]);
  return INTEREST_AREAS.map((key) => ({
    key, chosen: states[key].state !== "open", ...states[key], detail: detail(key),
    doneParts: key === "align" ? [...doneParts] : [], missingParts: key === "align" ? [...missingParts] : [],
  }));
}
