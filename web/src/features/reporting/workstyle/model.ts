import {
  WORKSTYLE_PRETEST_V3,
  workstyleResponseOptions,
} from "@/features/instruments/workstyle/registry";
import type {
  CapabilityArea,
  CapabilityFamily,
  OwnershipWish,
} from "@/features/capability/capabilityTypes";

export const REPORT_SCHEMA = "workstyle-report/1.0.0";
export const PRODUCT_ITEMS = WORKSTYLE_PRETEST_V3.items.filter(
  (i) =>
    i.scientific_status === "core" &&
    i.usage === "core" &&
    !i.research_only &&
    i.area_status === "development_area",
);
export const AREAS = [
  {
    key: "EVI",
    title: "Wie du Entscheidungen prüfst",
    team: "Entscheidungen prüfen",
    question:
      "Welche neue Information ist für euch ein Anlass, eine Entscheidung noch einmal zu öffnen?",
    benefit:
      "Das kann helfen, Annahmen und neue Informationen bewusst in Entscheidungen einzubeziehen.",
    context:
      "Bei Zeitdruck lohnt sich eine Absprache darüber, welche Prüfung noch möglich ist.",
  },
  {
    key: "EXP",
    title: "Wie du Erfahrung nutzt",
    team: "Erfahrung nutzen",
    question:
      "Woran erkennt ihr, ob eine frühere Erfahrung auf die aktuelle Situation übertragbar ist?",
    benefit:
      "Vertraute Muster können eine zusätzliche Orientierung geben, wenn Informationen fehlen.",
    context:
      "Prüfe bei neuen Situationen, welche Bedingungen sich gegenüber früher verändert haben.",
  },
  {
    key: "EL",
    title: "Wie du durch Ausprobieren lernst",
    team: "Durch Ausprobieren lernen",
    question:
      "Welche offene Frage wollt ihr mit einem kleinen Versuch klären, und was macht ihr danach mit dem Ergebnis?",
    benefit:
      "Kleine Versuche können offene Fragen für den nächsten Schritt greifbar machen.",
    context:
      "Nicht jede Frage lässt sich mit einem kurzen Versuch beantworten; klärt Aufwand und Aussagekraft.",
  },
  {
    key: "VOICE",
    // Phase 10B: VOICE misst das Ansprechen eigener Einwaende - nicht das
    // Einholen anderer Perspektiven (das ist das Research-Facet FS).
    title: "Wie du Einwände ansprichst",
    team: "Einwände ansprechen",
    question:
      "Wie schafft ihr Raum für einen Einwand, wenn die Runde eine Entscheidung schon abschließen möchte?",
    benefit:
      "Ausgesprochene Einwände können Punkte sichtbar machen, die in der gemeinsamen Entscheidung sonst fehlen.",
    context:
      "Vereinbart Gelegenheiten für Rückfragen, damit auch noch nicht angesprochene Punkte Platz bekommen.",
  },
  {
    key: "AMB",
    // Phase 10B: AMB misst erlebtes Unbehagen, nicht den Umgang (das Handeln).
    title: "Wie du offene Situationen empfindest",
    team: "Offene Situationen empfinden",
    question:
      "Was braucht ihr, um weiterzuarbeiten, solange mehrere Erklärungen oder Antworten offenbleiben?",
    benefit:
      "Offene Fragen bewusst zu benennen kann helfen, den nächsten Schritt gemeinsam abzugrenzen.",
    context:
      "Unbehagen sagt noch nichts darüber aus, wie du in der Situation handelst.",
  },
  {
    key: "ORG",
    title: "Wie du deine Arbeit steuerst",
    team: "Die Arbeit steuern",
    question:
      "Ab welchem Punkt priorisiert ihr einen bestehenden Plan gemeinsam neu, und wer bringt Änderungen ein?",
    benefit:
      "Explizite Prioritäten können Zuständigkeiten und nächste Schritte nachvollziehbar machen.",
    context:
      "Parallelität, Fokus und Umplanung können je nach Aufgabe unterschiedlich hilfreich sein.",
  },
] as const;
export type AreaKey = (typeof AREAS)[number]["key"];
export type ProductAnswer = {
  item_key: string;
  item_version: string;
  value: unknown;
  missing_reason: string | null;
};
export type ProductProfile = {
  person_id: string;
  assessment_id: string;
  instrument_id: string;
  manifest_version: string;
  item_version: string;
  completed_at: string;
  answers: ProductAnswer[];
};
export type CapabilityInput = {
  area_id: string;
  application_level: number | null;
  ownership_wish: OwnershipWish | null;
};
export type ProductMember = {
  person_id: string;
  name: string;
  workstyle: ProductProfile;
  capabilities: CapabilityInput[];
  alignment:
    | { item_key: string; value: unknown; missing_reason: string | null }[]
    | null;
};
export type ProductTeam = {
  status: "ready";
  team_id: string;
  team_name: string | null;
  team_context: string;
  people: ProductMember[];
  taxonomy: { areas: CapabilityArea[]; families: CapabilityFamily[] };
  setup_available: boolean;
  setup: {
    item_key: string;
    resolution_status: string;
    note: string | null;
    confirmed_at: string;
  }[];
};
export type ProductSnapshot<T> = {
  id: string;
  schema_version: typeof REPORT_SCHEMA;
  generated_at: string;
  input: T;
};

/** Product allowlist is checked again at the rendering boundary. No fallback between instruments. */
export function validProductProfile(p: ProductProfile): boolean {
  return (
    p.instrument_id === "founder-workstyle-pretest-8-5a-v3" &&
    p.manifest_version === "3.0.0" &&
    p.item_version === "8.4-v0.4" &&
    new Set(p.answers.map((a) => a.item_key)).size === p.answers.length &&
    p.answers.every((a) =>
      PRODUCT_ITEMS.some(
        (i) => i.item_key === a.item_key && i.item_version === a.item_version,
      ),
    )
  );
}
export function validProductTeam(t: ProductTeam): boolean {
  return (
    t.status === "ready" &&
    t.people.length >= 2 &&
    new Set(t.people.map((p) => p.person_id)).size === t.people.length &&
    t.people.every(
      (p) =>
        p.person_id === p.workstyle.person_id &&
        validProductProfile(p.workstyle) &&
        p.workstyle.answers.length === PRODUCT_ITEMS.length,
    )
  );
}
export function rawChoice(profile: ProductProfile, key: string) {
  const item = PRODUCT_ITEMS.find((i) => i.item_key === key);
  const answer = profile.answers.find(
    (a) => a.item_key === key && a.item_version === item?.item_version,
  );
  if (
    !item ||
    !answer ||
    answer.missing_reason ||
    !answer.value ||
    typeof answer.value !== "object"
  )
    return null;
  const raw = answer.value as { scale?: unknown; optionId?: unknown };
  const value =
    item.response_format === "comparative" ||
    item.response_format === "behavioral"
      ? raw.optionId
      : raw.scale;
  const options = workstyleResponseOptions(item);
  const position = options.findIndex((o) => o.value === value);
  return position < 0
    ? null
    : {
        value: value as string | number,
        label: options[position].label,
        position,
        options,
      };
}
/** Ordinal bands describe selected response labels, not scale scores. Never sum across areas.
 * FC direction is categorical; the two intensities on either side share one qualitative band.
 * Detailed lanes show raw positions. The separate overview median is never used here. */
export function responseBand(
  profile: ProductProfile,
  key: string,
): string | null {
  const c = rawChoice(profile, key);
  if (!c) return null;
  return typeof c.value === "string"
    ? c.value.endsWith("_a")
      ? "A"
      : c.value.endsWith("_b")
        ? "B"
        : c.value
    : c.value <= 2
      ? "lower"
      : c.value >= 4
        ? "upper"
        : "middle";
}
export function individualAreas(profile: ProductProfile) {
  return AREAS.map((area) => {
    const items = PRODUCT_ITEMS.filter((i) => i.area_key === area.key);
    const answered = items.filter((i) => rawChoice(profile, i.item_key));
    const evidence = answered.map((i) => ({
      key: i.item_key,
      prompt: i.prompt,
      answer: rawChoice(profile, i.item_key)!.label,
    }));
    // Cite exact situations instead of inventing an identity or explaining motives.
    const phrases: Record<
      AreaKey,
      { key: string; lower: string; middle: string; upper: string }
    > = {
      EVI: {
        key: "EVI-01",
        lower:
          "Wenn dir eine Möglichkeit spontan gefällt, beschreibst du die gezielte Suche nach Gegenargumenten als eher unwahrscheinlich.",
        middle:
          "Bei einem spontanen Favoriten hängt die Suche nach Gegenargumenten für dich von der Situation ab.",
        upper:
          "Auch wenn dir eine Möglichkeit spontan gefällt, suchst du nach eigener Einschätzung eher gezielt nach Gegenargumenten.",
      },
      EXP: {
        key: "EXP-01",
        lower:
          "Ein vertrautes Muster, das du noch nicht erklären kannst, nimmst du zunächst eher wenig ernst.",
        middle:
          "Ein vertrautes Muster, das du noch nicht erklären kannst, nimmst du teilweise als Hinweis auf.",
        upper:
          "Ein vertrautes Muster nimmst du eher ernst, auch wenn du noch nicht genau erklären kannst, woher der Eindruck kommt.",
      },
      EL: {
        key: "EL-01",
        lower:
          "Zwischen zwei Wegen beschreibst du einen kleinen Versuch vor der Festlegung als eher unwahrscheinlich.",
        middle:
          "Ob du zwischen zwei Wegen erst einen kleinen Versuch machst, hängt für dich von der Situation ab.",
        upper:
          "Wenn sich zwei Wege im Kleinen ausprobieren lassen, testest du nach eigener Einschätzung eher vor der Festlegung.",
      },
      VOICE: {
        key: "VOICE-01",
        lower:
          "Wenn sich die Runde schon einig ist, beschreibst du einen weiteren Einwand als eher unwahrscheinlich.",
        middle:
          "Ob du nach einer gemeinsamen Einigung noch einen Einwand ansprichst, hängt für dich von der Situation ab.",
        upper:
          "Du bringst einen Gegenpunkt eher noch ein, auch wenn sich die Runde eigentlich schon einig ist.",
      },
      AMB: {
        key: "AMB-01",
        lower:
          "Widersprüchliche Rückmeldungen, deren Bedeutung noch offen ist, empfindest du eher nicht als unangenehm.",
        middle:
          "Widersprüchliche Rückmeldungen empfindest du teils als unangenehm, teils nicht.",
        upper:
          "Widersprüchliche Rückmeldungen, deren Bedeutung noch offen ist, empfindest du eher als unangenehm.",
      },
      ORG: {
        key: "ORG-01",
        lower:
          "Vor einem größeren Vorhaben beschreibst du das Klären konkreter nächster Schritte als eher unwahrscheinlich.",
        middle:
          "Ob du vor einem größeren Vorhaben zuerst die nächsten Schritte klärst, hängt für dich von der Situation ab.",
        upper:
          "Bei einem größeren Vorhaben klärst du eher zuerst konkrete nächste Schritte.",
      },
    };
    const phrase = phrases[area.key];
    const band = responseBand(profile, phrase.key);
    let observation =
      band && ["lower", "middle", "upper"].includes(band)
        ? phrase[band as "lower" | "middle" | "upper"]
        : !answered.length
          ? "Für diese Situationen ist noch kein Antwortmuster sichtbar."
          : "Zu einzelnen Situationen liegen Antworten vor; daraus wird keine allgemeine Arbeitsweise abgeleitet.";
    const second: Record<AreaKey, { key: string; intro: string }> = {
      EVI: {
        key: "EVI-03",
        intro:
          "Eine bereits getroffene Entscheidung bei deutlicher neuer Gegeninformation erneut zu prüfen",
      },
      EXP: {
        key: "EXP-06",
        intro:
          "Bei fehlenden Informationen in einem vertrauten Thema zusätzlich auf Erfahrung zu bauen",
      },
      EL: {
        key: "EL-05",
        intro:
          "Nach einem unklaren Versuch gezielt etwas zu verändern und erneut zu testen",
      },
      VOICE: {
        key: "VOICE-03",
        intro:
          "Ein vertagtes, noch nicht geklärtes Thema selbst wieder anzusprechen",
      },
      AMB: {
        key: "AMB-05",
        intro: "Mit einer wichtigen offenen Frage weiterzuarbeiten",
      },
      ORG: { key: "ORG-08", intro: "" },
    };
    const detail = second[area.key];
    const detailChoice = rawChoice(profile, detail.key);
    if (detailChoice) {
      const extra =
        area.key === "ORG"
          ? responseBand(profile, detail.key) === "A"
            ? "Einen grundsätzlich funktionierenden Plan änderst du eher erst, wenn Abweichungen relevant werden."
            : "Einen grundsätzlich funktionierenden Plan passt du eher schon bei kleineren Veränderungen an."
          : area.key === "EXP"
            ? `In einem vertrauten Thema beziehst du deine Erfahrung bei fehlenden Informationen „${detailChoice.label}“ ein.`
            : area.key === "AMB"
              ? `Mit einer wichtigen offenen Frage weiterzuarbeiten, empfindest du als „${detailChoice.label}“.`
              : `${detail.intro}, beschreibst du als „${detailChoice.label}“.`;
      observation = band ? `${observation} ${extra}` : extra;
    }
    return {
      ...area,
      items,
      evidence,
      observation,
      missing: items.length - answered.length,
    };
  });
}
export type PatternCategory =
  | "SIMILAR_PATTERN"
  | "DIFFERENT_PATTERN"
  | "POTENTIAL_COMPLEMENT"
  | "DISCUSSION_POINT"
  | "INSUFFICIENT_DATA";
export function teamPatterns(people: ProductMember[]) {
  return AREAS.map((area) => {
    const items = PRODUCT_ITEMS.filter((i) => i.area_key === area.key);
    const shared = items.filter((i) =>
      people.every((p) => responseBand(p.workstyle, i.item_key) !== null),
    );
    const similar = shared.filter(
      (i) =>
        new Set(people.map((p) => responseBand(p.workstyle, i.item_key)))
          .size === 1,
    );
    const different = shared.filter((i) => !similar.includes(i));
    // Eine moegliche Ergaenzung nur bei echten Gegenpolen (unten vs. oben,
    // A vs. B) - nicht, wenn nur "teils/teils" neben einer klaren Antwort steht.
    const opposite = different.filter((i) => {
      const bands = new Set(people.map((p) => responseBand(p.workstyle, i.item_key)));
      return (bands.has("lower") && bands.has("upper")) || (bands.has("A") && bands.has("B"));
    });
    const category: PatternCategory = !shared.length
      ? "INSUFFICIENT_DATA"
      : different.length
        ? "DIFFERENT_PATTERN"
        : "SIMILAR_PATTERN";
    const groups = different.slice(0, 2).map((i) => ({
      prompt: i.prompt,
      groups: [
        ...new Set(people.map((p) => responseBand(p.workstyle, i.item_key))),
      ].map((band) => ({
        band,
        names: people
          .filter((p) => responseBand(p.workstyle, i.item_key) === band)
          .map((p) => p.name),
        answers: [
          ...new Set(
            people
              .filter((p) => responseBand(p.workstyle, i.item_key) === band)
              .map((p) => rawChoice(p.workstyle, i.item_key)!.label),
          ),
        ],
      })),
    }));
    return {
      ...area,
      category,
      similar: similar.length,
      different: different.length,
      missing: items.length - shared.length,
      groups,
      summary:
        category === "INSUFFICIENT_DATA"
          ? "Es fehlen gemeinsame Antworten für eine Gegenüberstellung."
          : different.length
            ? "Ihr setzt in diesen Situationen unterschiedliche Schwerpunkte. Die Antworten beschreiben eure Selbsteinschätzung, keine Bewertung des Teams."
            : "In den gemeinsam beantworteten Situationen wählt ihr ähnliche Antwortbereiche. Das legt noch nicht fest, wie ihr im Alltag zusammen handelt.",
      opposite: opposite.length,
      complement: opposite.length
        ? {
            category: "POTENTIAL_COMPLEMENT" as const,
            text: (
              {
                EVI: "Eine zusätzliche Prüfung und das Weiterarbeiten mit einer bestehenden Einschätzung können sich ergänzen, wenn ihr vorab vereinbart, wann ihr Entscheidungen wieder öffnet.",
                EXP: "Erfahrungswissen und eine Prüfung des aktuellen Falls könnten sich ergänzen, wenn ihr ausdrücklich macht, welche früheren Bedingungen sich übertragen lassen.",
                EL: "Ein kleiner Versuch und eine weitere Klärung vor dem Versuch können verschiedene offene Fragen bearbeiten. Vereinbart, wann ihr vom Gespräch ins Ausprobieren wechselt.",
                VOICE:
                  "Wenn Einwände unterschiedlich wahrscheinlich angesprochen werden, könnten verlässliche Gesprächsgelegenheiten helfen. Fragt vor dem Abschluss gezielt nach noch offenen Punkten.",
                AMB: "Unterschiedlich erlebtes Unbehagen könnte ein Anlass sein, den nächsten Schritt und die noch offenen Fragen getrennt festzuhalten.",
                ORG: "Unterschiedliche Vorgehensweisen bei Planung und Prioritäten könnten sich ergänzen, wenn ihr festlegt, wann eine Änderung den gemeinsamen Plan betrifft.",
              } as Record<AreaKey, string>
            )[area.key],
          }
        : null,
    };
  });
}

/** DISPLAY ONLY, never persisted or used by interpretation/matching:
 * lower ordinal median = an actually selected category, no interpolation.
 * Only homogeneous ordinal formats per area. EXP seriousness and all FC are excluded.
 * At least half of eligible items (and at least two) must be present. No missing imputation. */
export function displayPosition(profile: ProductProfile, area: AreaKey) {
  const items = PRODUCT_ITEMS.filter(
    (i) =>
      i.area_key === area &&
      !["comparative", "behavioral", "seriousness"].includes(i.response_format),
  );
  const choices = items
    .flatMap((i) => {
      const choice = rawChoice(profile, i.item_key);
      return choice && typeof choice.value === "number" ? [choice] : [];
    })
    .sort((a, b) => a.position - b.position);
  if (choices.length < Math.max(2, Math.ceil(items.length / 2))) return null;
  return choices[Math.floor((choices.length - 1) / 2)];
}

/** Presentation initials only, never a rank or measurement. */
export function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1
      ? parts[0][0] + parts.at(-1)![0]
      : (parts[0] ?? "?").slice(0, 2)
  ).toLocaleUpperCase("de-DE");
}

/** Darstellung: gleiche oder fehlende Namen unterscheidbar machen ("Founder 1", "Founder 2").
 * Aendert keine Daten, nur die Beschriftung im Bericht. */
export function distinctNames<T extends { name: string }>(people: T[]): T[] {
  const counts = new Map<string, number>();
  for (const p of people) counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  return people.map((p) => {
    if ((counts.get(p.name) ?? 0) < 2) return p;
    const n = (seen.get(p.name) ?? 0) + 1;
    seen.set(p.name, n);
    return { ...p, name: `${p.name} ${n}` };
  });
}
