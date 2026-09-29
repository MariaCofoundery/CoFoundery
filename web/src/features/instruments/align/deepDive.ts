import {
  FOUNDER_SETUP_CATALOG,
  type FounderSetupItemKey,
} from "@/features/teams/founderSetupCatalog";
import { registryOf, type AssessmentScope } from "@/features/instruments/align/registries";

/**
 * Vom Vergleich in die Vertiefung.
 *
 * ---------------------------------------------------------------------------
 * DER REPORT ERZEUGT KEINE VEREINBARUNG
 * ---------------------------------------------------------------------------
 *
 * `MVP-Spec §17/§18` sagt es selbst: Der Report leitet weiter. Hier wird
 * deshalb NICHTS geschrieben - keine Notiz, kein Thema, kein Status. Was
 * entsteht, sind Links auf Themen, die es ohnehin gibt.
 *
 * Das ist keine Bequemlichkeit, sondern eine Grenze: Eine Notiz aus einem
 * Zweiervergleich landete in einem Thema, das dem ganzen Team gehört. Wer zu
 * dritt ist, hätte damit die Antworten einer Person an jemanden weitergegeben,
 * dem sie nichts freigegeben hat. Die Freigabe galt dem Vergleich, nicht dem
 * Team.
 *
 * ---------------------------------------------------------------------------
 * ZUORDNUNG JE ABSCHNITT, NICHT JE FRAGE
 * ---------------------------------------------------------------------------
 *
 * Eine Zuordnung je Frage wäre genauer und nach der ersten Umformulierung
 * falsch. Die Abschnitte sind die stabile Ebene: Sie ändern sich nur mit dem
 * Instrument, und dann fällt es auf - `alleAbschnitteSindZugeordnet` unten
 * lässt eine neue Zuordnung nicht aus.
 *
 * ---------------------------------------------------------------------------
 * WO ES NICHTS GIBT, STEHT NICHTS
 * ---------------------------------------------------------------------------
 *
 * Für „S – Ziele & strategische Richtung“ hat der Setup-Katalog kein Thema.
 * Ein erfundener Link wäre schlimmer als keiner: Wer „Rollen &
 * Verantwortlichkeiten“ anklickt, weil er über Ziele sprechen wollte, findet
 * dort etwas anderes und hält das für seinen eigenen Fehler.
 */

/** Abschnitt → Themen, in der Reihenfolge, in der sie angeboten werden. */
const ZUORDNUNG: Record<string, FounderSetupItemKey[]> = {
  // --- Arbeitsprofil -------------------------------------------------------
  //
  // A, I und E fragen alle drei, WIE jemand zu einer Entscheidung kommt -
  // abwaegen, Erfahrung nutzen, früh ausprobieren. Das gehoert an ein Thema
  // und nicht an drei.
  "A – Analytische Prüfung": ["decision_rights"],
  "I – Nutzung von Erfahrungsintuition": ["decision_rights"],
  "E – Frühes Erproben": ["decision_rights"],
  "T/D – Unterschiede ansprechen und formulieren": ["conflict_deadlock", "communication"],
  "X – Wohlbefinden bei offener Informationslage": ["communication"],

  // --- Vorhaben ------------------------------------------------------------
  "U/K – Zusammenarbeit: Spielraum und Information": ["decision_rights", "communication"],
  // "S – Ziele & strategische Richtung" fehlt mit Absicht - siehe oben.
  "R – Ressourcen & tatsächliche Zusagen": ["time_commitment", "contributions_expenses"],
  "G – Entscheidungs- und Teamregeln": ["decision_rights", "conflict_deadlock"],
  "B – konkrete Risikogrenzen & Absicherung": [
    "personal_financial_risk",
    "contributions_expenses",
  ],
  "W – Prioritäten in konkreten Zielkonflikten": ["conflict_deadlock"],
  "L – persönliche Grenzen": ["outside_activities", "prolonged_absence", "changing_commitment"],
};

export type DeepDiveLink = { itemKey: FounderSetupItemKey; sections: string[] };

/**
 * Die Themen zu einem Bogen - ohne Doppelungen, in der Reihenfolge des Bogens.
 *
 * ---------------------------------------------------------------------------
 * DIE PHASE ENTSCHEIDET MIT
 * ---------------------------------------------------------------------------
 *
 * Etwa ein Drittel der Themen ist erst sinnvoll, wenn es eine Gesellschaft
 * gibt. Der Katalog sagt das selbst: „‚Founder-Exit‘ anzubieten, bevor die
 * Rechtsform steht, ist Lärm - und Lärm lässt Menschen die Seite schließen.“
 *
 * Wer noch vor der Gründung steht, bekommt deshalb nur Themen der Phase
 * „before“. Nicht, weil die anderen unwichtig wären, sondern weil sie noch
 * nicht beantwortbar sind.
 */
export function deepDiveLinks(
  scope: AssessmentScope,
  teamContext: "pre_founder" | "existing_team",
): DeepDiveLink[] {
  const erlaubt = new Set(
    teamContext === "pre_founder"
      ? FOUNDER_SETUP_CATALOG.filter((item) => item.phase === "before").map((item) => item.key)
      : FOUNDER_SETUP_CATALOG.map((item) => item.key),
  );

  const nachThema = new Map<FounderSetupItemKey, string[]>();

  for (const section of registryOf(scope).sections) {
    for (const itemKey of ZUORDNUNG[section] ?? []) {
      if (!erlaubt.has(itemKey)) continue;
      const bisher = nachThema.get(itemKey) ?? [];
      bisher.push(section);
      nachThema.set(itemKey, bisher);
    }
  }

  return [...nachThema.entries()].map(([itemKey, sections]) => ({ itemKey, sections }));
}

/**
 * Welche Abschnitte kein Thema haben.
 *
 * Nicht zum Anzeigen, sondern zum Prüfen: Ein neuer Abschnitt im Instrument
 * soll auffallen und nicht lautlos ohne Weg dastehen. Der bekannte Fall
 * („S – Ziele“) steht in der Prüfung namentlich.
 */
export function sectionsWithoutDeepDive(scope: AssessmentScope): string[] {
  return registryOf(scope).sections.filter(
    (section) => (ZUORDNUNG[section] ?? []).length === 0,
  );
}

/**
 * KEINE PRUEFUNG "gibt es dieses Thema?".
 *
 * Sie waere nicht zu erfuellen und nicht zu verletzen: `FounderSetupItemKey`
 * wird aus dem Katalog abgeleitet, also faellt ein getippter oder gestrichener
 * Schluessel schon beim Uebersetzen auf. Eine Pruefung, die nie fehlschlagen
 * kann, sieht aus wie Sicherheit und ist keine.
 */
