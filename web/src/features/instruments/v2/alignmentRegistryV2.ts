import registryJson from "../../../../docs/founder-alignment-registry-v2.json";

/**
 * Das Modell v2 als Daten - Schritt 1.
 *
 * Quelle ist Teil D der „Wissenschaftlichen Neukonzeption" v0.2 vom
 * 26.09.2026. Die Itemtexte sind wörtlich übernommen, damit sich Papier und
 * Code gegeneinander prüfen lassen: Wer das Dokument liest, muss dieselben
 * Sätze finden.
 *
 * ---------------------------------------------------------------------------
 * WAS HIER ANDERS IST ALS IN V1
 * ---------------------------------------------------------------------------
 *
 * KEINE FESTE LISTE VON DIMENSIONEN IM TYP. In v1 sind die sechs Dimensionen
 * eine TypeScript-Union aus deutschen Beschriftungen, an der 47 Dateien
 * hängen. Hier sind die Präferenzen Daten: Die kognitiven Interviews dürfen
 * das Modell verändern, und das sollen sie können, ohne dass ein Typ bricht.
 * Es sind ausdrücklich „keine acht bestätigten Faktoren".
 *
 * KEIN REVERSE CODING. „Niedrig" heißt jeweils weniger des benannten Inhalts,
 * nicht den Gegenpol einer anderen Eigenschaft. In v1 war genau das die
 * Fehlerquelle: sechs Items, deren Werte gegen die eigene Achse liefen.
 *
 * KEINE GESAMTZAHL. Weder je Präferenz noch darüber hinweg entsteht aus
 * diesen Items ein Passungswert.
 *
 * DIE BEDINGUNGEN GEHÖREN ZUR MESSUNG. „Stell dir vor, dein
 * Verantwortungsbereich ist vereinbart" ist kein Hilfetext, den man weglassen
 * kann - ohne ihn misst U etwas anderes. Deshalb steht er an der Präferenz
 * und nicht in einem Oberflächentext.
 *
 * VIER GETRENNTE AUSLASSUNGSGRÜNDE. „Kann ich noch nicht einschätzen" ist
 * eine Aussage über den eigenen Klärungsstand, „nicht relevant" eine über das
 * Vorhaben, „möchte ich nicht angeben" eine Entscheidung. Keiner davon wird
 * je zur Skalenmitte oder zu null.
 */

export type AnswerFormatId = "F" | "C";

export type MissingCode = {
  code: "cannot_assess" | "not_relevant" | "withheld" | "technical";
  label: string | null;
  note: string;
};

export type AnswerFormat = {
  kind: string;
  labels: string[];
  scoring: string;
  offersMissing: MissingCode["code"][];
};

export type AlignmentItem = {
  itemId: string;
  order: number;
  prompt: string;
  answerFormat: AnswerFormatId;
  reverse: false;
  /** Gehört zur kurzen Gesprächsfassung, nicht nur zum Forschungspool. */
  inMvp: boolean;
  rationale: string;
};

export type AlignmentPreference = {
  id: string;
  label: string;
  order: number;
  definition: string;
  /** `plausible_transfer` oder `own_hypothesis` - nie „etabliert". */
  evidenceStatus: "plausible_transfer" | "own_hypothesis";
  answerFormat: AnswerFormatId;
  /** Teil der Messversion. Fehlt sie, misst die Präferenz etwas anderes. */
  condition: string | null;
  items: AlignmentItem[];
};

export type AlignmentRegistryV2 = {
  instrumentId: string;
  registryVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  source: string;
  notes: string[];
  answerFormats: Record<AnswerFormatId, AnswerFormat>;
  missingCodes: MissingCode[];
  preferences: AlignmentPreference[];
};

/**
 * Was beim Laden nicht stimmen darf.
 *
 * WIRFT BEIM LADEN, NICHT BEIM BENUTZEN. Eine Registry mit doppelten
 * Kennungen oder einem umgepolten Item ist kein Sonderfall, den man später
 * abfängt - sie ist ein Fehler, der beim Start auffallen muss. In v1 sind
 * genau solche Fehler monatelang unbemerkt geblieben.
 */
export function assertAlignmentRegistryIntegrity(registry: AlignmentRegistryV2) {
  const fail = (message: string): never => {
    throw new Error(`alignment_registry_v2_invalid: ${message}`);
  };

  if (registry.preferences.length === 0) fail("keine Präferenzen");

  const seenPreference = new Set<string>();
  const seenItem = new Set<string>();

  for (const preference of registry.preferences) {
    if (seenPreference.has(preference.id)) fail(`doppelte Präferenz ${preference.id}`);
    seenPreference.add(preference.id);

    if (!registry.answerFormats[preference.answerFormat]) {
      fail(`${preference.id}: unbekanntes Antwortformat ${preference.answerFormat}`);
    }
    if (preference.items.length === 0) fail(`${preference.id}: keine Items`);

    for (const item of preference.items) {
      if (seenItem.has(item.itemId)) fail(`doppelte Kennung ${item.itemId}`);
      seenItem.add(item.itemId);

      // KEIN REVERSE CODING - die Fehlerquelle aus v1 wird hier strukturell
      // ausgeschlossen und nicht nur in der Dokumentation verboten.
      if (item.reverse !== false) fail(`${item.itemId}: reverse coding ist nicht vorgesehen`);

      if (item.answerFormat !== preference.answerFormat) {
        fail(`${item.itemId}: Format weicht von der Präferenz ab`);
      }
      if (!item.prompt.trim()) fail(`${item.itemId}: kein Fragetext`);
      if (!item.rationale.trim()) fail(`${item.itemId}: keine Begründung`);
    }
  }

  // Jede Präferenz muss in der kurzen Fassung vorkommen - sonst wäre sie im
  // Produkt unsichtbar und stünde trotzdem im Modell.
  for (const preference of registry.preferences) {
    if (!preference.items.some((item) => item.inMvp)) {
      fail(`${preference.id}: kein einziges Item in der Gesprächsfassung`);
    }
  }

  return registry;
}

export const ALIGNMENT_REGISTRY_V2 = assertAlignmentRegistryIntegrity(
  registryJson as unknown as AlignmentRegistryV2
);

export function getAlignmentPreferences(): AlignmentPreference[] {
  return [...ALIGNMENT_REGISTRY_V2.preferences].sort((a, b) => a.order - b.order);
}

export function getAlignmentItems(): AlignmentItem[] {
  return getAlignmentPreferences().flatMap((preference) => preference.items);
}

/** Die kurze Gesprächsfassung - was tatsächlich vorgelegt wird. */
export function getMvpAlignmentItems(): AlignmentItem[] {
  return getAlignmentItems().filter((item) => item.inMvp);
}

export function getAlignmentItem(itemId: string): AlignmentItem | null {
  return getAlignmentItems().find((item) => item.itemId === itemId) ?? null;
}

export function getPreferenceOfItem(itemId: string): AlignmentPreference | null {
  return (
    getAlignmentPreferences().find((preference) =>
      preference.items.some((item) => item.itemId === itemId)
    ) ?? null
  );
}
