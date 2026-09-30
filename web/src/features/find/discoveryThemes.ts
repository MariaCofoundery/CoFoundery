import { getItemV22, offeredItemsV22 } from "@/features/instruments/align/registries";

/**
 * Die sechs Themen der Suche.
 *
 * ---------------------------------------------------------------------------
 * SIE STEHEN HIER UND NICHT IN DER REGISTRATUR
 * ---------------------------------------------------------------------------
 *
 * Die Registratur ordnet die sechzehn Fragen des Arbeitsprofils in fünf
 * Abschnitte — das ist die Gliederung des Instruments. Die Suche braucht eine
 * andere: Sie trennt „Einwände ansprechen" von „Widerspruch formulieren",
 * weil man bei dem einen Ähnlichkeit suchen kann und beim anderen
 * ausdrücklich nicht. Der Abschnitt T/D fasst beides zusammen.
 *
 * Die Zuordnung stammt aus `docs/FIND_UX_Discovery_Integration_Spec_v0.1.md`,
 * Abschnitt 8. Sie ist abgeschrieben und nicht abgeleitet — deshalb prüft
 * `assertThemes()` sie gegen die Registratur, statt ihr zu glauben.
 *
 * ---------------------------------------------------------------------------
 * KEINE INTERNEN KÜRZEL IN DER OBERFLÄCHE
 * ---------------------------------------------------------------------------
 *
 * A, I, E, T/D und X bleiben in der Registratur. Hier stehen Kennungen, die
 * sagen, worum es geht — und die Beschriftung kommt aus dem Sprachbundle,
 * nicht von hier.
 */

/** Was jemand sich bei einem Thema wünscht. */
export const DIRECTIONS = ["similar", "complementary", "neutral"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/**
 * Wie wichtig es ist — 0 bis 3.
 *
 * `neutral` heißt immer 0, und 0 heißt immer: Dieses Thema geht nicht in die
 * Reihenfolge ein. Zwei Felder, die dasselbe sagen können, laufen sonst
 * auseinander; `normalizePreference` hält sie zusammen.
 */
export const IMPORTANCES = [0, 1, 2, 3] as const;
export type Importance = (typeof IMPORTANCES)[number];

export type ThemeItem = {
  itemId: string;
  /**
   * Geht die Frage in den Abstand ein?
   *
   * `false` heißt: Sie gehört zum Thema und wird im Matchdetail gezeigt, aber
   * sie erzeugt keine Zahl. Zwei Fälle, beide aus der Spec, Abschnitt 8:
   *
   *   D01 ist NOMINAL — „Ich sehe das anders, weil …" gegen „Wie würde unser
   *   Vorschlag mit … umgehen?" ist kein Abstand, sondern eine andere
   *   Formulierung. Eine künstliche Distanz darüber wäre erfunden.
   *
   *   T02 ist ausgenommen, weil dieselbe Sache dort zweimal gemessen würde:
   *   T01 trägt das Thema.
   */
  numeric: boolean;
  /**
   * Antworten, die AUSSERHALB der Reihenfolge stehen.
   *
   * Bei T01 ist „situationsabhängig" keine fünfte Stufe hinter „nach mehr als
   * einem Arbeitstag", sondern eine Antwort neben der Reihe. Wer sie wählt,
   * hat nicht spät geantwortet — er hat gesagt, dass es darauf ankommt. Ein
   * Abstand dazu wäre eine Zahl über etwas, das keine Stufe ist.
   */
  outsideSequence: readonly string[];
};

export type DiscoveryTheme = {
  themeId: string;
  items: readonly ThemeItem[];
};

const ordinal = (itemId: string): ThemeItem => ({
  itemId,
  numeric: true,
  outsideSequence: [],
});

export const DISCOVERY_THEMES: readonly DiscoveryTheme[] = [
  {
    themeId: "decision_weighing",
    items: [ordinal("A01"), ordinal("A02")],
  },
  {
    themeId: "experience_intuition",
    items: [ordinal("I01"), ordinal("I02"), ordinal("I03")],
  },
  {
    themeId: "experimentation",
    items: [ordinal("E01"), ordinal("E02"), ordinal("E03")],
  },
  {
    themeId: "raising_objections",
    items: [
      // Teilweise geordnet: vier Stufen von „noch im Gespräch" bis „nach mehr
      // als einem Arbeitstag", und daneben „situationsabhängig".
      { itemId: "T01", numeric: true, outsideSequence: ["T01_o5"] },
      { itemId: "T02", numeric: false, outsideSequence: [] },
    ],
  },
  {
    themeId: "voicing_disagreement",
    items: [ordinal("D02"), { itemId: "D01", numeric: false, outsideSequence: [] }],
  },
  {
    themeId: "open_questions",
    items: [ordinal("X01"), ordinal("X02"), ordinal("X03"), ordinal("X04")],
  },
];

export const THEME_IDS = DISCOVERY_THEMES.map((theme) => theme.themeId);

/**
 * Wie viele geordnete Stufen eine Frage hat.
 *
 * Die Antworten ausserhalb der Reihenfolge zählen NICHT mit: Bei T01 sind es
 * vier Stufen und nicht fünf. Mit fünf wäre jeder Abstand zu klein gerechnet,
 * und zwar um ein Viertel.
 */
export function stepsOf(item: ThemeItem): number {
  const registry = getItemV22(item.itemId);
  if (!registry) throw new Error(`unknown_item:${item.itemId}`);
  return registry.options.length - item.outsideSequence.length;
}

/**
 * Die Stufe einer Antwort — 1 bis `stepsOf`, oder `null`.
 *
 * `null` heißt: geht nicht in den Abstand ein. Das gilt für einen
 * Auslassungsgrund („kann ich noch nicht einschätzen", „möchte ich nicht
 * angeben"), für eine fehlende Antwort und für eine Antwort ausserhalb der
 * Reihenfolge. Alle drei sind Auskünfte — nur eben keine Zahlen.
 */
export function stepOf(
  item: ThemeItem,
  answer: { optionId?: string | null; missingCode?: string | null } | null | undefined,
): number | null {
  if (!answer) return null;
  // KEINE ZAHL AUS EINEM AUSLASSUNGSGRUND. Die Spec, Abschnitt 9: „Missing
  // Reasons gehen nicht numerisch ein." Wer nichts sagt, sagt nicht „Mitte".
  if (answer.missingCode) return null;
  if (!answer.optionId) return null;
  if (item.outsideSequence.includes(answer.optionId)) return null;

  const registry = getItemV22(item.itemId);
  if (!registry) return null;
  const index = registry.options.findIndex((option) => option.optionId === answer.optionId);
  return index < 0 ? null : index + 1;
}

/**
 * Stimmt die Zuordnung noch mit dem Bogen überein?
 *
 * Sie ist abgeschrieben, und Abgeschriebenes veraltet. Drei Fragen:
 * Gibt es jede genannte Frage? Steht jede Frage des Bogens in genau einem
 * Thema? Und heißt die Antwort ausserhalb der Reihenfolge noch so?
 *
 * Läuft beim Laden des Moduls — ein Bogen, der nicht mehr zur Suche passt,
 * soll auffallen und nicht stillschweigend die Hälfte der Fragen verlieren.
 */
export function assertThemes(): void {
  const fail = (message: string): never => {
    throw new Error(`discovery_themes_invalid: ${message}`);
  };

  const zugeordnet = new Map<string, string>();
  for (const theme of DISCOVERY_THEMES) {
    if (theme.items.length === 0) fail(`${theme.themeId} hat keine Frage`);
    for (const item of theme.items) {
      const registry = getItemV22(item.itemId);
      if (!registry) fail(`${item.itemId} steht in ${theme.themeId}, aber in keinem Bogen`);
      const vorher = zugeordnet.get(item.itemId);
      if (vorher) fail(`${item.itemId} steht in ${vorher} und in ${theme.themeId}`);
      zugeordnet.set(item.itemId, theme.themeId);

      for (const optionId of item.outsideSequence) {
        const option = registry!.options.find((entry) => entry.optionId === optionId);
        if (!option) fail(`${item.itemId}: ${optionId} gibt es nicht`);
        // „Situationsabhängig" ist der Grund, warum diese Antwort neben der
        // Reihe steht. Wird sie einmal etwas anderes, ist die Ausnahme falsch.
        if (!/situationsabh|kommt darauf an/i.test(option!.label)) {
          fail(`${item.itemId}/${optionId} heißt „${option!.label}" — das ist keine Antwort neben der Reihe`);
        }
      }

      if (item.numeric && stepsOf(item) < 2) {
        fail(`${item.itemId} hat weniger als zwei Stufen`);
      }
    }
  }

  // KEINE FRAGE DARF UNTER DEN TISCH FALLEN. Käme eine siebzehnte dazu, wäre
  // sie sonst lautlos weder in einem Thema noch im Matchdetail.
  const fehlend = offeredItemsV22("founder_profile")
    .map((item) => item.itemId)
    .filter((itemId) => !zugeordnet.has(itemId));
  if (fehlend.length) fail(`ohne Thema: ${fehlend.join(", ")}`);
}

assertThemes();
