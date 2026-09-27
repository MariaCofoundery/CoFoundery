import registryJson from "../../../../docs/founder-alignment-context-v2.json";
import { ALIGNMENT_REGISTRY_V2, type MissingCode } from "@/features/instruments/v2/alignmentRegistryV2";
import { reword } from "@/features/instruments/v2/rewordingsV2";

/**
 * Ziele, Ressourcen, Grenzen, Regeln und die Wertefälle - Schritt 1b.
 *
 * Quelle sind Teil D („Ziele, Ressourcen, Grenzen und Regeln") und Teil E
 * („Neues Modul für Prioritäten und Grenzen") der „Wissenschaftlichen
 * Neukonzeption" v0.2. Die Fragetexte sind wörtlich übernommen; ein Test hält
 * sie gegen das Dokument.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS NICHT ZU DEN PRÄFERENZEN GEHÖRT
 * ---------------------------------------------------------------------------
 *
 * DIES IST KEINE SKALA, UND DAS IST KEIN MANGEL. Bei den acht Präferenzen ist
 * interne Konsistenz ein Gütekriterium - zwei Items derselben Präferenz
 * sollen zusammenhängen. Hier ausdrücklich nicht: Wie viele Stunden jemand
 * zusagen kann und wie er Gewinne verwenden möchte, müssen nicht miteinander
 * korrelieren, und ein Modell, das das erwartet, misst etwas Erfundenes.
 *
 * Deshalb liegen diese Blöcke in einer eigenen Registratur mit eigener Form:
 * Sie haben zehn verschiedene Antwortformate statt einer Fünferskala, und aus
 * keinem von ihnen entsteht eine Zahl.
 *
 * ---------------------------------------------------------------------------
 * „NOCH OFFEN" IST DIE WICHTIGSTE ANTWORT
 * ---------------------------------------------------------------------------
 *
 * Sie kommt in der Quelle 67-mal vor und war in den bisherigen vier
 * Auslassungsgründen nicht vorgesehen. Sie ist etwas anderes als „kann ich
 * noch nicht einschätzen": Die eine Person hat sich nicht festgelegt, die
 * andere kann es nicht beurteilen. R04 bietet beide nebeneinander an.
 *
 * Und für das Produkt ist „noch offen" gar kein fehlender Wert, sondern der
 * Treffer: Es benennt genau die Stelle, über die zwei Gründer sprechen
 * sollten. Wer sie als Lücke behandelt, wirft das Ergebnis weg.
 */

export type ContextGroup = "S" | "R" | "B" | "G" | "L";

export type ContextAnswerFormat =
  | "single_choice"
  | "multi_choice"
  | "free_text"
  | "structured_text"
  | "number_range"
  | "person_number_range"
  | "money_range"
  | "time_windows"
  | "importance_rating"
  | "date";

/**
 * Eine Antwortmoeglichkeit.
 *
 * DIE KENNUNG IST DAS, WAS GESPEICHERT WIRD, nicht der Text. Teil F7 des
 * Gutachtens verlangt die "urspruengliche Options-ID" - und der Grund ist
 * derselbe wie bei der Instrumentversion: Der Text darf sich aendern (und
 * tut es, siehe `rewordingsV2`), die Bedeutung einer bereits gegebenen
 * Antwort nicht. Wer den Text speichert, verliert beim ersten Umformulieren
 * die Zuordnung aller bisherigen Antworten.
 */
export type ContextOption = { optionId: string; value: string; requiresText: boolean };

export type ContextBlock = {
  blockId: string;
  group: ContextGroup;
  order: number;
  /** Was angezeigt wird - ggf. die ueberarbeitete Fassung. */
  prompt: string;
  /** Der Wortlaut des Gutachtens. Gegen ihn wird geprueft. */
  sourcePrompt: string;
  answerFormat: ContextAnswerFormat;
  /** Originaleinheit, etwa „Stunden/Woche". Nie umgerechnet. */
  unit: string | null;
  /** Der Eingabehinweis aus der Quelle, wörtlich. */
  hint: string | null;
  options: ContextOption[];
  /**
   * Hinweise zum Feld, keine wählbaren Optionen - „brutto/netto kennzeichnen"
   * steht in der Quelle in derselben Aufzählung wie echte Antwortmöglichkeiten.
   */
  fieldNotes: string[];
  missing: MissingCode["code"][];
  scoring: string;
  rationale?: string;
  /** Die Antwortspalte der Quelle, unverändert - der Prüfpfad. */
  answerSpecSource: string;
  inMvp: boolean;
  /** 1 = erstes Ausfüllen, 2 = die Zusagen, später. */
  mvpStep: 1 | 2 | null;
};

export type ValueCasePath = {
  key: "A" | "B" | "other" | "unknown";
  label: string;
  requiresText: boolean;
  isMissing: boolean;
};

export type ValueCase = {
  caseId: string;
  order: number;
  title: string;
  situation: string;
  sourceSituation: string;
  /** Beide werden GETRENNT bewertet. Beide dürfen sehr wichtig sein. */
  concerns: { key: "a" | "b"; label: string }[];
  paths: ValueCasePath[];
  rationale: string;
  scoring: string;
  inMvp: boolean;
  mvpStep: 1 | 2 | null;
};

export type SourceDeviation = {
  blocks: string[];
  change: "added_to_mvp" | "moved_to_step_2";
  reason: string;
  decidedBy: string;
  decidedOn: string;
};

export type ContextRegistryV2 = {
  instrumentId: string;
  registryVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  source: string;
  notes: string[];
  importanceLabels: string[];
  /** Die Auswahl, die im Gutachten steht - unverändert. */
  paperMvpSelection: string[];
  /** Und wo wir bewusst davon abweichen, mit Grund und Datum. */
  deviationsFromSource: SourceDeviation[];
  blocks: ContextBlock[];
  valueCases: ValueCase[];
};

/**
 * Was beim Laden nicht stimmen darf.
 *
 * DIE WICHTIGSTE PRÜFUNG IST DIE LETZTE: Jedes Segment der Antwortspalte aus
 * der Quelle muss in der Struktur wieder auftauchen. Beim Übertragen von
 * Fließtext in Felder verschwindet sonst leise eine Option - und niemand
 * merkt es, weil die Frage ja weiterhin funktioniert.
 */
export function assertContextRegistryIntegrity(registry: ContextRegistryV2) {
  const fail = (message: string): never => {
    throw new Error(`context_registry_v2_invalid: ${message}`);
  };

  const knownCodes = new Set(ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => entry.code));
  const seen = new Set<string>();

  for (const block of registry.blocks) {
    if (seen.has(block.blockId)) fail(`doppelte Kennung ${block.blockId}`);
    seen.add(block.blockId);

    if (!block.prompt.trim().endsWith("?")) fail(`${block.blockId}: keine Frage`);
    if (!block.scoring.trim()) fail(`${block.blockId}: keine Auswertungsregel`);

    // Die Auslassungsgründe sind EINE Liste für das ganze Instrument. Ein
    // eigener Code je Registratur wäre genau die Doppelung, die auseinanderläuft.
    for (const code of block.missing) {
      if (!knownCodes.has(code)) fail(`${block.blockId}: unbekannter Auslassungsgrund ${code}`);
    }
    if (new Set(block.missing).size !== block.missing.length) {
      // Die Quelle nennt bei R11 und B01 „möchte ich nicht angeben" zweimal;
      // sie verlangt selbst, solche Optionen zusammenzuführen statt sie
      // doppelt anzuzeigen.
      fail(`${block.blockId}: derselbe Auslassungsgrund doppelt`);
    }

    const optionIds = block.options.map((option) => option.optionId);
    if (new Set(optionIds).size !== optionIds.length) fail(`${block.blockId}: doppelte Options-Kennung`);
    for (const option of block.options) {
      if (!new RegExp(`^${block.blockId}_o\\d+$`).test(option.optionId)) {
        fail(`${block.blockId}: Options-Kennung passt nicht zum Block: ${option.optionId}`);
      }
    }

    const needsOptions = block.answerFormat === "single_choice"
      || block.answerFormat === "multi_choice"
      || block.answerFormat === "importance_rating";
    if (needsOptions && block.options.length < 2) fail(`${block.blockId}: zu wenige Optionen`);
    if (!needsOptions && block.options.some((option) => option.requiresText === undefined)) {
      fail(`${block.blockId}: Option ohne Textangabe`);
    }

    // NICHTS DARF BEIM ÜBERTRAGEN VERLOREN GEHEN.
    const covered = new Set<string>([
      ...block.options.map((option) => option.value),
      ...block.fieldNotes,
    ]);
    if (block.hint) covered.add(block.hint);
    const body = block.answerSpecSource.includes(":")
      ? block.answerSpecSource.slice(block.answerSpecSource.indexOf(":") + 1)
      : block.answerSpecSource;
    for (const raw of body.split(";")) {
      const segment = raw.trim();
      if (!segment) continue;
      if (covered.has(segment)) continue;
      if (MISSING_LABELS.has(segment)) continue;
      if (registry.importanceLabels.includes(segment)) continue;
      fail(`${block.blockId}: Segment aus der Quelle fehlt in der Struktur: „${segment}"`);
    }
  }

  for (const value of registry.valueCases) {
    if (seen.has(value.caseId)) fail(`doppelte Kennung ${value.caseId}`);
    seen.add(value.caseId);
    if (value.concerns.length !== 2) fail(`${value.caseId}: braucht genau zwei Anliegen`);
    const keys = value.paths.map((path) => path.key).join(",");
    if (keys !== "A,B,other,unknown") fail(`${value.caseId}: unerwartete Wege ${keys}`);
  }

  return registry;
}

/** Die Beschriftungen, die für einen Auslassungsgrund stehen - aus der Quelle. */
const MISSING_LABELS = new Set([
  "noch offen",
  "noch nicht festgelegt",
  "möchte ich nicht angeben",
  "noch nicht einschätzbar",
  "möchte ich zunächst vertraulich klären",
]);

export const CONTEXT_REGISTRY_V2 = assertContextRegistryIntegrity(
  registryJson as unknown as ContextRegistryV2
);

export function getContextBlocks(group?: ContextGroup): ContextBlock[] {
  const blocks = [...CONTEXT_REGISTRY_V2.blocks]
    .sort((a, b) => (a.group === b.group ? a.order - b.order : a.group.localeCompare(b.group)))
    // Die ueberarbeitete Fassung wird hier angelegt, nicht in der Oberflaeche -
    // sonst zeigte die naechste Ansicht wieder den Originaltext.
    .map((block) => ({
      ...block,
      sourcePrompt: block.prompt,
      prompt: reword(block.blockId, "prompt", block.prompt),
    }));
  return group ? blocks.filter((block) => block.group === group) : blocks;
}

export function getValueCases(): ValueCase[] {
  return [...CONTEXT_REGISTRY_V2.valueCases]
    .sort((a, b) => a.order - b.order)
    .map((value) => ({
      ...value,
      sourceSituation: value.situation,
      situation: reword(value.caseId, "situation", value.situation),
    }));
}

export function getContextBlock(blockId: string): ContextBlock | null {
  return getContextBlocks().find((block) => block.blockId === blockId) ?? null;
}

/**
 * Was tatsächlich vorgelegt wird, in der Reihenfolge der Schritte.
 *
 * Schritt 1 ist das erste Ausfüllen, Schritt 2 sind die Zusagen - Stunden,
 * Geld, Termine. Die kommen später, weil sie eine Festlegung verlangen,
 * bevor überhaupt klar ist, mit wem.
 */
export function getMvpContextBlocks(step?: 1 | 2): ContextBlock[] {
  return getContextBlocks().filter(
    (block) => block.inMvp && (step === undefined || block.mvpStep === step)
  );
}

export function getMvpValueCases(): ValueCase[] {
  return getValueCases().filter((value) => value.inMvp);
}
