import profileJson from "../../../../docs/align-screens-profile-v0-2.json";
import ventureJson from "../../../../docs/align-screens-venture-v0-1.json";
import type { AssessmentScope } from "@/features/instruments/align/registries";

/**
 * Die Bildschirme der beiden Bögen.
 *
 * ---------------------------------------------------------------------------
 * SCHRITTE STATT FRAGENLISTEN
 * ---------------------------------------------------------------------------
 *
 * Dieselben Fragen, anders portioniert. „7 von 16 Fragen" liest sich wie eine
 * Prüfung, „Schritt 3 von 7" wie ein Weg — und niemand sitzt vor einer Liste,
 * die er von oben bis unten abarbeiten muss.
 *
 * Beim Venture-Bogen zählte die Oberfläche bis zum 30.09.2026 zwei
 * verschiedene Zahlen gleichzeitig: „42 Fragen" in der Einleitung und „0 von
 * 39 beantwortet" im Kopf. Beide waren erklärbar — die eine zählte alle, die
 * andere die gerade sichtbaren. Zusammen waren sie ein Widerspruch.
 *
 * ---------------------------------------------------------------------------
 * DIE INTERNEN ABSCHNITTSNAMEN STEHEN NICHT MEHR AUF DEM BILDSCHIRM
 * ---------------------------------------------------------------------------
 *
 * „A – Analytische Prüfung" und „B – konkrete Risikogrenzen & Absicherung"
 * sind Notizen an uns. Für die Person davor ist es eine Behauptung darüber,
 * was gerade gemessen wird — und die färbt die Antwort. In der Registratur
 * bleiben die Abschnitte, dort sind sie die Grundlage der Auswertung; auf dem
 * Bildschirm steht stattdessen ein Satz, der überleitet.
 */
export type Screen = {
  step: number;
  /**
   * Die Nummer, unter der das Review den Abschnitt führt.
   *
   * Steht NICHT auf dem Bildschirm. Teil 2 nennt einen davon „1b“ — die
   * Herkunft bleibt damit nachvollziehbar, ohne dass jemand davorsitzt und
   * sich fragt, warum nach 1 noch einmal 1 kommt.
   */
  label: string;
  title: string;
  transition: string | null;
  subline: string | null;
  /** Eine Frage über mehreren Situationen — sonst stünden dort Aussagen ohne Frage. */
  groupPrompt: string | null;
  /** Vom vorhergehenden Bildschirm übernommen, weil das Dokument sie dort nicht wiederholt. */
  groupPromptInherited?: boolean;
  items: string[];
};

/** Der Text am Ende — Überschrift, Satz, Knopf. */
export type Closing = {
  title: string;
  text: string;
  cta: string;
  /**
   * Was auf dem Knopf steht, während es läuft.
   *
   * Steht in keinem Review: Die Dokumente beschreiben die Beschriftung des
   * Knopfes, nicht die des Wartens. Sie ist im Generator festgelegt, damit sie
   * beim Knopf steht, zu dem sie gehört.
   */
  ctaBusy: string;
  subline: string | null;
};

/**
 * Die Frage nach dem Namen des Vorhabens.
 *
 * Nur beim Venture-Bogen, und nur wenn noch keiner da ist. Der Name ist eine
 * Beschriftung und keine Bedingung: „Später" geht immer.
 */
export type NameQuestion = {
  title: string;
  subline: string | null;
  placeholder: string | null;
  cta: string;
  skip: string;
};

export type ScreenSet = {
  screensId: string;
  scope: AssessmentScope;
  source: string;
  createdAt: string;
  notes: string[];
  intro: {
    title: string;
    paragraphs: string[];
    cta: string;
    /** Bewusst `null`: Die reale Dauer wird erst im Pretest gemessen. */
    duration: string | null;
  };
  nameQuestion: NameQuestion | null;
  screens: Screen[];
  closing: Closing;
};

const SETS: Record<AssessmentScope, ScreenSet> = {
  founder_profile: profileJson as unknown as ScreenSet,
  venture_alignment: ventureJson as unknown as ScreenSet,
};

function assertScreens(set: ScreenSet, known: (itemId: string) => boolean): ScreenSet {
  const fail = (message: string): never => {
    throw new Error(`screens_invalid: ${set.screensId}: ${message}`);
  };

  const gesehen = new Set<string>();
  for (const [index, screen] of set.screens.entries()) {
    // Ein Schritt, der nicht der nächste ist, macht die Anzeige zur Luege:
    // "Schritt 4 von 9" stimmt nur, wenn davor drei waren.
    if (screen.step !== index + 1) fail(`Schritt ${screen.step} steht an Stelle ${index + 1}`);
    if (screen.items.length === 0) fail(`Schritt ${screen.step} hat keine Fragen`);
    if (!screen.transition) fail(`Schritt ${screen.step} hat keinen Übergang`);
    for (const itemId of screen.items) {
      // Eine Frage, die es nicht gibt, waere ein leerer Platz auf dem
      // Bildschirm - und eine, die zweimal steht, eine doppelte Antwort.
      if (!known(itemId)) fail(`${itemId} steht auf Schritt ${screen.step}, aber in keinem Bogen`);
      if (gesehen.has(itemId)) fail(`${itemId} steht auf mehr als einem Schritt`);
      gesehen.add(itemId);
    }
  }

  // AUSDRUECKLICH KEINE ZEITANGABE. Das UX-Review: "Noch keine feste
  // Zeitangabe anzeigen. Die reale Dauer erst im Pretest messen." Eine
  // geratene Zahl waere ein Versprechen, das niemand geprueft hat.
  if (set.intro.duration !== null) fail("die Startseite verspricht eine Dauer");

  // "Founder-Profil erstellen" ist die richtige Beschriftung fuer den einen
  // Bogen und war bis zum 30.09.2026 auch die des anderen - dort erstellt man
  // aber kein Profil. Das Review sagt es woertlich: "Nicht: Founder-Profil
  // erstellen".
  if (set.scope !== "founder_profile" && /Founder-Profil/i.test(set.closing.cta)) {
    fail(`der Abgabeknopf heißt „${set.closing.cta}“`);
  }

  return set;
}

export function screenSet(
  scope: AssessmentScope,
  known: (itemId: string) => boolean,
): ScreenSet {
  return assertScreens(SETS[scope], known);
}

/** Auf welchem Schritt steht diese Frage? */
export function stepOf(set: ScreenSet, itemId: string): number | null {
  return set.screens.find((screen) => screen.items.includes(itemId))?.step ?? null;
}
