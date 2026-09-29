import founderProfileJson from "../../../../docs/founder-profile-registry-v1.json";
import ventureAlignmentJson from "../../../../docs/venture-alignment-registry-v1.json";

/**
 * Zwei Fragebögen, nicht einer.
 *
 * ---------------------------------------------------------------------------
 * WARUM GETEILT
 * ---------------------------------------------------------------------------
 *
 * Die Master-Arbeitsfassung nennt vier Bänder mit VERSCHIEDENER Gültigkeit:
 * Das Arbeitsprofil ist „relativ portabel“, U/K sind „team-/rollenabhängig“,
 * S/R/G/B „vorhabensspezifisch und zeitgebunden“.
 *
 * Ein Fragebogen kann nicht gleichzeitig portabel und zeitgebunden sein. Wer
 * beides in eine Fassung gießt, muss später bei jeder Antwort rekonstruieren,
 * ob „15 Stunden“ allgemein galt oder für dieses Vorhaben im September - und
 * das steht dann nirgends.
 *
 * Und die Fassungen können sich getrennt weiterentwickeln. Bisher hieß jede
 * Änderung an einem Teil eine neue Gesamtfassung: v2, v2.1, v2.2 - dreimal in
 * drei Tagen, obwohl sich jedes Mal nur ein Teil geändert hat.
 *
 * U/K LIEGT BEIM VORHABEN, nicht beim Profil. Die Quelle sagt „beim Teamstart
 * bestätigen“ - das ist nicht portabel. „Bestätigen“ statt „neu beantworten“
 * löst die Oberfläche, indem sie die letzte Antwort vorbelegt.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESE FASSUNG NICHT BEHAUPTET
 * ---------------------------------------------------------------------------
 *
 * Kein Gesamtwert, keine Dimensionswerte. Die Quelle sagt es selbst
 * (Abschnitt 8.1): „geordnete Kategorien dürfen intern codiert, aber nicht
 * automatisch als psychologische Messwerte ausgegeben werden“.
 *
 * Und ausdrücklich: A und I werden niemals zu einem
 * Analytisch-gegen-Intuitiv-Wert verschmolzen. Beide können gleichzeitig hoch
 * sein - eine Achse dazwischen wäre eine erfundene Gegensätzlichkeit.
 */

export type MissingCode =
  /** Kann ich noch nicht einschätzen — über mich selbst. */
  | "cannot_assess"
  /** Habe ich noch nicht entschieden — mein eigener Plan. */
  | "not_decided"
  /** Haben wir noch nicht geklärt — es hängt an mehr als einer Person. */
  | "not_clarified"
  /** Möchte ich nicht angeben. */
  | "prefer_not_to_say"
  /** Möchte ich zunächst nur für mich festhalten. */
  | "confidential_first"
  /**
   * Ein technischer Fehlschlag - KEINE Auskunft der Person.
   *
   * Steht nicht im Sprachreview, weil er dort nichts zu suchen hat: Die vier
   * anderen sind Dinge, die jemand sagt. Dieser ist ein Fehler bei uns, und
   * ihn mit ihnen zu verwechseln hiesse, einem Menschen eine Haltung
   * zuzuschreiben, die er nie geäußert hat.
   */
  | "technical";

export type AnswerFormatV22 =
  /** Fünf geordnete Stufen. Ordinal - und ausdrücklich keine Intervallskala. */
  | "ordinal_choice"
  /** Eine Wahl ohne Rangfolge: Handlung, Regel, Zeitpunkt. */
  | "single_choice"
  | "multi_choice"
  | "money_range"
  | "number_range"
  | "person_number_range"
  | "time_windows"
  | "structured_text"
  | "free_text_repeatable"
  | "free_text_per_entry"
  | "value_case";

export type ItemOptionV22 = {
  optionId: string;
  label: string;
  requiresText: boolean;
  exclusive: boolean;
};

export type RegistryItemV22 = {
  itemId: string;
  order: number;
  section: string;
  prompt: string;
  hint: string | null;
  answerFormat: AnswerFormatV22;
  options: ItemOptionV22[];
  /** Die Beschriftung steht am Item, nicht am Code. */
  missing: { code: MissingCode; label: string }[];
  note: string;
  concerns?: string[];
  paths?: string[];
  ratingOptions?: string[];
  ratingMissing?: string;
  followUpQuestion?: string;
  /** Erscheint erst, wenn diese Frage beantwortet ist. */
  showAfter?: string;
};

/**
 * Wozu ein Fragebogen gehört.
 *
 * `founder_profile` gehört zur Person, `venture_alignment` zu einem Vorhaben.
 * Der Unterschied steht an der Ablage und nicht nur im Namen: Eine Antwort
 * ohne Vorhaben ist etwas anderes als dieselbe Antwort mit einem.
 */
export type AssessmentScope = "founder_profile" | "venture_alignment";

export type RegistryV22 = {
  instrumentId: string;
  scope: AssessmentScope;
  label: string;
  /** Wie lange und wofür diese Antworten gelten - steht in der Oberfläche. */
  validity: string;
  registryVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  source: string;
  overallScore: false;
  dimensionScores: false;
  deviationsFromSource: { what: string; source: string; reason: string; decidedBy: string }[];
  notes: string[];
  sections: string[];
  items: RegistryItemV22[];
};

/**
 * Was beim Laden nicht stimmen darf.
 *
 * Ein Wertefall ohne seine beiden Anliegen, eine Frage ohne Ausweg oder eine
 * Anschlussfrage ohne Voraussetzung sind Fehler, die beim Start auffallen
 * müssen - nicht beim ersten Menschen, der ausfüllt.
 */
export function assertRegistryV22(registry: RegistryV22): RegistryV22 {
  const fail = (message: string): never => {
    throw new Error(`registry_invalid (${registry.instrumentId}): ${message}`);
  };

  // JEDE FASSUNG SAGT, WOFUER SIE GILT. Ohne diesen Satz waere die Teilung
  // eine Ordnerstruktur und keine Aussage.
  if (!registry.validity?.trim()) fail("keine Angabe zur Gültigkeit");
  if (!["founder_profile", "venture_alignment"].includes(registry.scope)) {
    fail(`unbekannter Scope ${registry.scope}`);
  }

  // KEINE ZAHL, NIRGENDS. Die Entscheidung vom 29.09.2026 steht hier als
  // Prüfung und nicht nur als Vorsatz.
  if (registry.overallScore !== false || registry.dimensionScores !== false) {
    fail("die Fassung behauptet einen Gesamt- oder Dimensionswert");
  }

  const seen = new Set<string>();
  const known = new Set(registry.items.map((item) => item.itemId));

  for (const item of registry.items) {
    if (seen.has(item.itemId)) fail(`doppelte Kennung ${item.itemId}`);
    seen.add(item.itemId);

    if (!item.prompt.trim()) fail(`${item.itemId}: kein Fragetext`);
    if (!registry.sections.includes(item.section)) {
      fail(`${item.itemId}: unbekannter Abschnitt ${item.section}`);
    }

    // Jede Frage lässt sich auslassen. Ohne Ausweg muss jemand etwas
    // ankreuzen, das er nicht meint - daran ist v1 gescheitert.
    if (item.missing.length === 0) fail(`${item.itemId}: kein Auslassungsgrund`);
    for (const entry of item.missing) {
      if (!entry.label.trim()) fail(`${item.itemId}: Grund ohne Beschriftung`);
    }

    const ids = item.options.map((option) => option.optionId);
    if (new Set(ids).size !== ids.length) fail(`${item.itemId}: doppelte Options-Kennung`);
    for (const option of item.options) {
      if (!new RegExp(`^${item.itemId}_o\\d+$`).test(option.optionId)) {
        fail(`${item.itemId}: Options-Kennung passt nicht: ${option.optionId}`);
      }
    }
    if (item.options.filter((option) => option.exclusive).length > 1) {
      // Zwei Optionen, die alles andere ausschließen, schließen einander aus.
      fail(`${item.itemId}: mehr als eine ausschließende Option`);
    }

    // ZWEI, NICHT DREI. R12 fragt "Datum oder nach dem naechsten Meilenstein"
    // und hat damit genau zwei sinnvolle Antworten. Eine Mindestzahl von drei
    // waere eine Formvorschrift, die eine richtige Frage abweist.
    const braucht = ["ordinal_choice", "single_choice", "multi_choice"];
    if (braucht.includes(item.answerFormat) && item.options.length < 2) {
      fail(`${item.itemId}: zu wenige Optionen`);
    }

    if (item.answerFormat === "value_case") {
      if (item.concerns?.length !== 2) fail(`${item.itemId}: braucht genau zwei Anliegen`);
      if (item.paths?.length !== 2) fail(`${item.itemId}: braucht genau zwei Wege`);
      if (item.ratingOptions?.length !== 5) fail(`${item.itemId}: braucht fünf Wichtigkeitsstufen`);
    }

    if (item.showAfter && !known.has(item.showAfter)) {
      fail(`${item.itemId}: hängt an ${item.showAfter}, das es nicht gibt`);
    }
  }

  return registry;
}

export const FOUNDER_PROFILE = assertRegistryV22(founderProfileJson as unknown as RegistryV22);
export const VENTURE_ALIGNMENT = assertRegistryV22(ventureAlignmentJson as unknown as RegistryV22);

export const REGISTRIES: Record<AssessmentScope, RegistryV22> = {
  founder_profile: FOUNDER_PROFILE,
  venture_alignment: VENTURE_ALIGNMENT,
};

export const SCOPES = Object.keys(REGISTRIES) as AssessmentScope[];

export function registryOf(scope: AssessmentScope): RegistryV22 {
  return REGISTRIES[scope];
}

export function getItemsV22(scope: AssessmentScope): RegistryItemV22[] {
  return [...registryOf(scope).items].sort((a, b) => a.order - b.order);
}

/**
 * Eine Frage suchen - ohne zu wissen, zu welchem Bogen sie gehört.
 *
 * Gibt den Scope MIT heraus. Wer nur das Item bekommt, muss danach raten, wo
 * die Antwort hingehört - und genau diese Unklarheit soll die Teilung
 * beseitigen.
 */
export function findItem(
  itemId: string,
): { item: RegistryItemV22; scope: AssessmentScope } | null {
  for (const scope of SCOPES) {
    const item = registryOf(scope).items.find((entry) => entry.itemId === itemId);
    if (item) return { item, scope };
  }
  return null;
}

export function getItemV22(itemId: string): RegistryItemV22 | null {
  return findItem(itemId)?.item ?? null;
}

export function getSectionsV22(
  scope: AssessmentScope,
): { section: string; items: RegistryItemV22[] }[] {
  return registryOf(scope).sections.map((section) => ({
    section,
    items: getItemsV22(scope).filter((item) => item.section === section),
  }));
}
