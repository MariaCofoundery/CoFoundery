import behaviourJson from "../../../../docs/align-behaviour-items-v0-2.json";
import type { MissingCode } from "@/features/instruments/v21/registryV21";
import {
  getItemV22,
  type AssessmentScope,
} from "@/features/instruments/align/registries";

/**
 * Vier Verhaltensfragen als Gegenprobe zu den Wunschfragen.
 *
 * ---------------------------------------------------------------------------
 * WARUM SIE HIER STEHEN UND NICHT IN DER REGISTRATUR
 * ---------------------------------------------------------------------------
 *
 * Sie stehen nicht im fachlich geprüften Quelldokument. Der Wächtertest auf
 * der Registratur prüft jeden Fragetext wörtlich gegen diese Quelle - er
 * würde bei jedem zusätzlichen Item zu Recht anschlagen. Der Unterschied
 * zwischen geprüft und noch nicht vorgelegt soll an der Datei ablesbar sein,
 * nicht nur in einem Kommentar.
 *
 * ---------------------------------------------------------------------------
 * STATUS: candidate_for_pretest
 * ---------------------------------------------------------------------------
 *
 * Die Gutachterin hat am 29.09.2026 alle vier auf `revise` gesetzt und
 * überarbeitet - und ausdrücklich entschieden, dass sie danach NICHT
 * automatisch in den Fragebogen wandern. Erst ein Pretest entscheidet, ob sie
 * in den Produktbogen kommen, in einen optionalen Deep Dive, in ein
 * Forschungsmodul oder gar nicht.
 *
 * `candidate_for_pretest` ist deshalb kein Zwischenschritt auf dem Weg nach
 * oben, sondern ein eigener Zustand: überarbeitet, aber nicht vorgelegt.
 *
 * ---------------------------------------------------------------------------
 * WAS EIN UNTERSCHIED BEDEUTET - UND WAS NICHT
 * ---------------------------------------------------------------------------
 *
 * Wer sich wünscht, Annahmen zu prüfen, und es beim letzten Mal nicht getan
 * hat, hat NICHT falsch geantwortet. Die Lage kann es nicht hergegeben haben,
 * die Entscheidung kann eilig gewesen sein, der Wunsch kann neu sein. Aus
 * einem Unterschied ein Urteil über die Gültigkeit der Selbstauskunft zu
 * machen, wäre genau die Anmaßung, die dieses Instrument sonst überall
 * vermeidet - es gibt keinen Gesamtwert, keine Dimensionswerte und keine
 * Zahl, die jemandem sagt, wie er ist.
 *
 * Deshalb gibt es hier kein Übereinstimmungsmaß. Das Ergebnis ist ein Satz,
 * der beides nebeneinanderstellt und offen lässt, woran es lag.
 *
 * „KAM NICHT VOR" IST EINE ANTWORT. Wer in drei Monaten keine solche
 * Entscheidung getroffen hat, hat etwas gesagt und nichts verschwiegen. Als
 * Auslassungsgrund wäre es ein Fehlen; als Option ist es eine Auskunft - und
 * es beendet den Vergleich, statt ihn zu einem Unterschied zu machen.
 */

export type BehaviourOption = {
  optionId: string;
  label: string;
  /** Die Situation gab es nicht. Kein Vergleich, kein Unterschied. */
  noOccasion?: boolean;
  /**
   * Steht ausserhalb der Abfolge.
   *
   * „Ich habe ihn nicht angesprochen“ ist kein spaeterer Zeitpunkt, sondern
   * etwas anderes. Ein Abstand zwischen dieser Antwort und einem Wunsch waere
   * eine Zahl zwischen zwei Dingen ohne gemeinsame Skala.
   */
  outsideSequence?: boolean;
  whyOutside?: string;
};

export type BehaviourItem = {
  itemId: string;
  /**
   * In welchen Bogen die Frage gehört.
   *
   * A91 und T91 fragen nach der Person und sind portabel. U91 und K91 hängen
   * am konkreten Vorhaben - an Rollen, Entscheidungsrechten,
   * Informationsstrukturen -, und nennen es deshalb auch in der Frage.
   */
  module: AssessmentScope;
  /** Die Frage, zu der diese hier den konkreten Fall danebenstellt. */
  crossChecks: string;
  /**
   * Woran sich jemand erinnern soll.
   *
   * ABSICHTLICH VERSCHIEDEN: sechs Monate für die seltenen Ereignisse, drei
   * für die häufigen. Eine einheitliche Zahl wäre Ordnung auf Kosten der
   * Erinnerbarkeit.
   */
  referencePeriod: string;
  referencePeriodNote?: string;
  /**
   * Steht der Zeitraum auch im Fragetext?
   *
   * Er MUSS dort stehen — sonst ist es wieder „wie häufig", die Frage, bei
   * der niemand weiß, woran er sich erinnern soll. Bei `U91` steht er nicht
   * dort; das Feld hält die Lücke fest, statt sie zu schließen, indem jemand
   * einen Satz erfindet, den die Gutachterin nicht geschrieben hat.
   */
  referencePeriodInPrompt: boolean;
  section: string;
  order: number;
  answerFormat: "single_choice";
  prompt: string;
  hint: string;
  options: BehaviourOption[];
  missing: { code: MissingCode; label: string }[];
  note: string;
};

export type BehaviourSet = {
  setId: string;
  /**
   * `candidate_for_pretest`: überarbeitet, aber nicht vorgelegt.
   *
   * Es gibt bewusst keinen Wert „approved" dazwischen - nach dem Pretest wird
   * entschieden, wohin sie gehören, und das ist eine andere Entscheidung als
   * „der Text ist in Ordnung".
   */
  status: "candidate_for_pretest" | "active" | "archived";
  createdAt: string;
  basedOn: string;
  supersedes?: string;
  notes: string[];
  reportingRule: string;
  /** Sätze, die so dastehen dürfen. */
  reportingExamples: string[];
  /** Und Sätze, die nie dastehen dürfen. Ein Unterschied ist kein Vorwurf. */
  forbiddenPhrasings: string[];
  pretestMetrics: string[];
  items: BehaviourItem[];
};

function assertBehaviourSet(set: BehaviourSet): BehaviourSet {
  const fail = (message: string): never => {
    throw new Error(`behaviour_set_invalid: ${message}`);
  };

  for (const item of set.items) {
    // Die Frage, zu der diese hier den konkreten Fall danebenstellt, muss es
    // geben - UND IM SELBEN BOGEN. Genau daran ist T91 aufgefallen: Es war
    // auf T03 gebaut, und T03 hat die Master-Fassung gestrichen.
    const gegenstueck = getItemV22(item.crossChecks);
    if (!gegenstueck) {
      fail(`${item.itemId}: ${item.crossChecks} gibt es in keinem Bogen`);
    }
    if (gegenstueck!.retired) {
      fail(`${item.itemId}: ${item.crossChecks} ist zurueckgezogen`);
    }
    // Ohne Bezugszeitraum ist es wieder „wie häufig" - die Frage, an der
    // niemand weiß, woran er sich erinnern soll. Die Zahl steht am Item und
    // nicht hier, weil sie je Frage verschieden ist.
    //
    // WO ER FEHLT, MUSS ES DRANSTEHEN. `referencePeriodInPrompt: false` ist
    // kein Freibrief, sondern eine offene Stelle mit Namen - eine stille
    // Ausnahme wäre nach dem zweiten Mal keine Ausnahme mehr.
    const imText = item.prompt.includes(
      item.referencePeriod.replace("6 Monate", "sechs Monaten").replace("3 Monate", "drei Monaten"),
    );
    if (imText !== item.referencePeriodInPrompt) {
      fail(
        `${item.itemId}: referencePeriodInPrompt sagt ${item.referencePeriodInPrompt}, ` +
          `im Fragetext steht der Zeitraum ${imText ? "aber schon" : "nicht"}`,
      );
    }
    // Ohne diesen Ausweg erzwingt die Frage ein Verhalten, das es nie gab.
    if (!item.options.some((option) => option.noOccasion)) {
      fail(`${item.itemId}: keine Option „kam nicht vor“`);
    }
    if (item.options.filter((option) => option.noOccasion).length > 1) {
      fail(`${item.itemId}: mehr als eine Option „kam nicht vor“`);
    }
    for (const option of item.options) {
      if (!new RegExp(`^${item.itemId}_o\\d+$`).test(option.optionId)) {
        fail(`${item.itemId}: Options-Kennung passt nicht: ${option.optionId}`);
      }
    }
    if (item.missing.length === 0) fail(`${item.itemId}: kein Auslassungsgrund`);
  }
  return set;
}

export const BEHAVIOUR_SET_V21 = assertBehaviourSet(behaviourJson as unknown as BehaviourSet);

export function getBehaviourItems(): BehaviourItem[] {
  return [...BEHAVIOUR_SET_V21.items].sort((a, b) => a.order - b.order);
}

export function getBehaviourItem(itemId: string): BehaviourItem | null {
  return BEHAVIOUR_SET_V21.items.find((item) => item.itemId === itemId) ?? null;
}

/** Zu welcher Wunschfrage gibt es eine Gegenprobe? */
export function behaviourItemFor(wishItemId: string): BehaviourItem | null {
  return BEHAVIOUR_SET_V21.items.find((item) => item.crossChecks === wishItemId) ?? null;
}

export type CrossCheckOutcome =
  /** Gewünschtes und berichtetes Vorgehen liegen nah beieinander. */
  | { kind: "aligned"; wishLabel: string; behaviourLabel: string }
  /** Sie liegen auseinander - ein Gesprächsthema, kein Befund. */
  | { kind: "worth_a_conversation"; wishLabel: string; behaviourLabel: string; topic: string }
  /** Die Situation gab es nicht, oder eine der beiden Antworten fehlt. */
  | { kind: "no_basis"; why: "no_occasion" | "missing_answer" };

/**
 * Stellt Wunsch und Verhalten nebeneinander.
 *
 * Bewusst OHNE Zahl und ohne Richtung: Es steht nirgends, dass das Verhalten
 * „hinter dem Wunsch zurückbleibt". Wer sich mehr Eigenständigkeit wünscht
 * als er zuletzt hatte, kann in einem Team gesessen haben, das sie nicht
 * hergab. Das ist etwas, worüber zwei Menschen sprechen sollten - und nichts,
 * was eine Software über einen von ihnen feststellt.
 */
export function crossCheck(input: {
  wishItemId: string;
  wishOptionId: string | null;
  behaviourOptionId: string | null;
}): CrossCheckOutcome {
  const behaviourItem = behaviourItemFor(input.wishItemId);
  const wishItem = getItemV22(input.wishItemId);
  if (!behaviourItem || !wishItem) return { kind: "no_basis", why: "missing_answer" };

  if (!input.wishOptionId || !input.behaviourOptionId) {
    return { kind: "no_basis", why: "missing_answer" };
  }

  const behaviourOption = behaviourItem.options.find(
    (option) => option.optionId === input.behaviourOptionId,
  );
  const wishOption = wishItem.options.find((option) => option.optionId === input.wishOptionId);
  if (!behaviourOption || !wishOption) return { kind: "no_basis", why: "missing_answer" };

  // Kein Anlass, kein Vergleich. Das ist der häufigste Fall bei jemandem, der
  // gerade erst anfängt - und er darf nicht wie ein Widerspruch aussehen.
  if (behaviourOption.noOccasion) return { kind: "no_basis", why: "no_occasion" };

  const distance = rankDistance(input.wishItemId, input.wishOptionId, behaviourItem, behaviourOption);

  // null heißt: die beiden Antworten haben keine gemeinsame Rangfolge. Dann
  // wird nichts verglichen, sondern beides gezeigt.
  if (distance === null || distance >= 2) {
    return {
      kind: "worth_a_conversation",
      wishLabel: wishOption.label,
      behaviourLabel: behaviourOption.label,
      topic: behaviourItem.section,
    };
  }
  return { kind: "aligned", wishLabel: wishOption.label, behaviourLabel: behaviourOption.label };
}

/**
 * Wie weit liegen die beiden Antworten auseinander - in Stufen, nicht in Punkten.
 *
 * Nur möglich, wo beide Fragen dieselbe Abfolge benutzen. Bei K01/K91 sind die
 * Stufen absichtlich gleich formuliert; bei A02/A91 und U04/U91 gibt es keine
 * gemeinsame Abfolge, weil die eine nach Häufigkeit und die andere nach einem
 * einzelnen Fall fragt. Dort wird nicht gerechnet, sondern nebeneinandergelegt.
 */
function rankDistance(
  wishItemId: string,
  wishOptionId: string,
  behaviourItem: BehaviourItem,
  behaviourOption: BehaviourOption,
): number | null {
  const comparable = new Set(["K01", "T03"]);
  if (!comparable.has(wishItemId)) return null;

  const wishItem = getItemV22(wishItemId)!;
  // Die letzte Option von K01 und T03 ist nominal („je nach Aufgabe", „hängt
  // von der Tragweite ab“). Sie hat keinen Platz in einer Reihenfolge.
  const wishRank = wishItem.options.findIndex((option) => option.optionId === wishOptionId);
  const behaviourRank = behaviourItem.options.findIndex(
    (option) => option.optionId === behaviourOption.optionId,
  );
  const wishOrdinalCount = wishItem.options.length - 1;

  if (wishRank < 0 || wishRank >= wishOrdinalCount) return null;
  if (behaviourRank < 0) return null;
  if (behaviourOption.noOccasion || behaviourOption.outsideSequence) return null;
  return Math.abs(wishRank - behaviourRank);
}
