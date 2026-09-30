import screensJson from "../../../../docs/align-screens-profile-v0-2.json";

/**
 * Die sieben Bildschirme des Arbeitsprofils.
 *
 * ---------------------------------------------------------------------------
 * SIEBEN SCHRITTE STATT SECHZEHN FRAGEN
 * ---------------------------------------------------------------------------
 *
 * Dieselben sechzehn Fragen, anders portioniert. „7 von 16 Fragen" liest sich
 * wie eine Prüfung, „Schritt 3 von 7" wie ein Weg — und niemand sitzt vor
 * einer Liste, die er von oben bis unten abarbeiten muss.
 *
 * ---------------------------------------------------------------------------
 * DIE INTERNEN ABSCHNITTSNAMEN STEHEN NICHT MEHR AUF DEM BILDSCHIRM
 * ---------------------------------------------------------------------------
 *
 * „A – Analytische Prüfung" ist eine Notiz an uns. Für die Person davor ist es
 * eine Behauptung darüber, was gerade gemessen wird — und die färbt die
 * Antwort. In der Registratur bleiben die Abschnitte, dort sind sie die
 * Grundlage der Auswertung; auf dem Bildschirm steht stattdessen ein Satz, der
 * überleitet.
 */
export type Screen = {
  step: number;
  title: string;
  transition: string | null;
  subline: string | null;
  /** Eine Frage über mehreren Situationen — sonst stünden dort Aussagen ohne Frage. */
  groupPrompt: string | null;
  /** Vom vorhergehenden Bildschirm übernommen, weil das Dokument sie dort nicht wiederholt. */
  groupPromptInherited?: boolean;
  items: string[];
};

export type ScreenSet = {
  screensId: string;
  scope: "founder_profile";
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
  screens: Screen[];
};

function assertScreens(set: ScreenSet, known: (itemId: string) => boolean): ScreenSet {
  const fail = (message: string): never => {
    throw new Error(`screens_invalid: ${message}`);
  };

  const gesehen = new Set<string>();
  for (const screen of set.screens) {
    if (screen.items.length === 0) fail(`Schritt ${screen.step} hat keine Fragen`);
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

  return set;
}

export function screenSet(known: (itemId: string) => boolean): ScreenSet {
  return assertScreens(screensJson as unknown as ScreenSet, known);
}

/** Auf welchem Schritt steht diese Frage? */
export function stepOf(set: ScreenSet, itemId: string): number | null {
  return set.screens.find((screen) => screen.items.includes(itemId))?.step ?? null;
}
