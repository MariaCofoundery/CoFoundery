/**
 * „Stärken entdecken“ - der Leitfaden der Fassung 3 (Entwurf vom 12.11.2026, freigegeben).
 *
 * WAS SICH GEGENÜBER DEM STÄRKEN-INTERVIEW (FASSUNG 2) ÄNDERT: Statt zehn fester Aufforderungen
 * wählt die Person aus zwölf Szenen die fünf oder sechs, die sie kennt. Jede Szene hat eine echte
 * Frage mit Zeitanker und wird in drei kleinen Schritten beantwortet (Was war los? Was hast du
 * getan? Was kam heraus?). Eine dritte Runde fragt nach Energie und Blick von außen und stellt die
 * Gegenfragen.
 *
 * DIE ABLAUFREGELN STEHEN HIER, NICHT IN DER OBERFLÄCHE, damit sie sich prüfen lassen:
 *   - mindestens fünf Szenen, höchstens sechs (SCENE_MIN, SCENE_MAX);
 *   - eine Szene lässt sich nur überspringen, solange danach noch fünf beantwortbar bleiben;
 *   - die Nachfrage kommt einmal und nur bei sehr kurzer Antwort - als Regel, ohne KI.
 *
 * DIE ANTWORT, DIE AUSGEWERTET WIRD, IST DER ZUSAMMENGESETZTE TEXT (`composeAnswer`): die drei
 * Teile ohne Überschriften, getrennt durch eine Leerzeile. Die Zitat-Prüfung der Auswertung
 * (wörtlich aus einer Antwort) bleibt dadurch unverändert. Die Teile selbst stehen zusätzlich in
 * `answer_parts`, damit man sie getrennt wieder anzeigen kann.
 *
 * Die Texte stehen in `messages/<locale>/strengths.json` unter `interview.questions.<id>`.
 */

import type { StrengthsQuestionKind } from "@/features/strengths/strengthsInterviewGuide";
import { isStrengthTheme, type StrengthThemeId } from "@/features/strengths/strengthThemes";

/** Die Fassung dieses Leitfadens. Fassung 2 ist das frühere Stärken-Interview. */
export const DISCOVER_GUIDE_VERSION = 3;

/** Seit dem 25.11.2026: drei Szenen, je ein Text. Frühere Gespräche mit fünf oder sechs Szenen bleiben les- und beendbar. */
export const SCENE_MIN = 3;
export const SCENE_MAX = 3;

/** Der eine Text einer Szene (Fassung vom 25.11.2026): höchstens so lang. */
export const STORY_MAX_LENGTH = 1200;
/** Jeder Teil höchstens so lang; drei Teile plus Leerzeilen bleiben unter den 2000 der Datenbank. */
export const PART_MAX_LENGTH = 650;
/** Die Grenze der Datenbank (`capability_interview_turns_answer_length`). */
export const DISCOVER_MIN_LENGTH = 10;
export const DISCOVER_MAX_LENGTH = 2000;
/** Eine kürzere Antwort auf „Was hast du getan?“ löst die Nachfrage aus (etwa zwei Sätze). */
export const FOLLOW_UP_BELOW = 60;
/** Stichworte aus dem Intro: wie viele, wie lang. */
export const INTRO_NOTES_MAX = 8;
export const INTRO_NOTE_MAX_LENGTH = 60;

/** Nach jeder Szene: höchstens zwei Themen, die zu dem passen, was die Person geschrieben hat (25.11.2026). */
export const THEMES_PER_SCENE_MAX = 2;

/**
 * Vier Themen, die zu einer Szene naheliegen - nur ein Vorschlag zum Anklicken. Die Person kann jedes der 28 Themen
 * wählen; nichts davon wird aus ihrem Text berechnet.
 */
export const SCENE_THEME_SUGGESTIONS = {
  sc_unsure: ["keep_going", "experiment", "decide", "move_fast"],
  sc_nobody: ["take_ownership", "kick_off", "build_structure", "keep_going"],
  sc_fast_decision: ["decide", "move_fast", "spot_opportunities", "take_ownership"],
  sc_stuck_problem: ["break_down", "spot_patterns", "generate_ideas", "keep_going"],
  sc_from_zero: ["kick_off", "build_structure", "envision_future", "keep_going"],
  sc_convinced: ["convince", "listen", "build_trust", "negotiate"],
  sc_uncomfortable: ["speak_plainly", "resolve_conflict", "build_trust", "take_ownership"],
  sc_helped_grow: ["develop_others", "empathize", "listen", "build_trust"],
  sc_connected: ["connect", "build_cohesion", "empathize", "build_trust"],
  sc_learned_fast: ["learn_fast", "thorough", "hold_focus", "experiment"],
  sc_order: ["build_structure", "break_down", "thorough", "hold_focus"],
  sc_asked_for: ["reliable", "listen", "develop_others", "spot_patterns"],
} as const satisfies Record<string, readonly StrengthThemeId[]>;

/** Gewählte Themen: nur bekannte, ohne Doppelte, höchstens zwei. */
export function cleanSceneThemes(values: readonly unknown[]): StrengthThemeId[] {
  const result: StrengthThemeId[] = [];
  for (const value of values) {
    if (isStrengthTheme(value) && !result.includes(value)) result.push(value);
    if (result.length >= THEMES_PER_SCENE_MAX) break;
  }
  return result;
}

export const SCENE_IDS = [
  "sc_unsure",
  "sc_nobody",
  "sc_fast_decision",
  "sc_stuck_problem",
  "sc_from_zero",
  "sc_convinced",
  "sc_uncomfortable",
  "sc_helped_grow",
  "sc_connected",
  "sc_learned_fast",
  "sc_order",
  "sc_asked_for",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

/**
 * Runde 3: Energie, Blick von außen, dann die Gegenfragen. Die Gegenfragen gehen nicht in die
 * Auswertung - die Person sieht ihre eigenen Worte im Bericht.
 */
export const ROUND_THREE: readonly { id: string; kind: StrengthsQuestionKind }[] = [
  { id: "r3_flow", kind: "situation" },
  { id: "r3_thanked", kind: "outside" },
  { id: "r3_put_off", kind: "counter" },
  { id: "r3_hand_over", kind: "counter" },
  { id: "r3_others_better", kind: "counter" },
];

export const ROUND_THREE_IDS: readonly string[] = ROUND_THREE.map((question) => question.id);

/** Für `findStrengthsQuestion`: alle Fragen dieser Fassung, mit ihrer Art. */
export const DISCOVER_QUESTIONS: readonly { id: string; kind: StrengthsQuestionKind; followUpIds: readonly string[] }[] = [
  ...SCENE_IDS.map((id) => ({ id, kind: "situation" as const, followUpIds: [] as readonly string[] })),
  ...ROUND_THREE.map((question) => ({ ...question, followUpIds: [] as readonly string[] })),
];

export function isSceneId(id: string): id is SceneId {
  return (SCENE_IDS as readonly string[]).includes(id);
}

export type StepKey = "situation" | "action" | "outcome";
export const STEP_KEYS: readonly StepKey[] = ["situation", "action", "outcome"];
export type SceneWhen = "year" | "few" | "long";
export const SCENE_WHENS: readonly SceneWhen[] = ["year", "few", "long"];

/** `story` ist der eine Text der Fassung vom 25.11.2026; die drei Teile gibt es nur in früheren Gesprächen. */
export type SceneParts = Partial<Record<StepKey | "story", string>>;

export function isSceneWhen(value: string): value is SceneWhen {
  return (SCENE_WHENS as readonly string[]).includes(value);
}

/** Die Teile ohne Überschriften, durch eine Leerzeile getrennt. Das ist die Antwort für die Auswertung. */
export function composeAnswer(parts: SceneParts) {
  if (parts.story !== undefined) return parts.story.trim();
  return STEP_KEYS.map((key) => (parts[key] ?? "").trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}

export type SceneCheck = { ok: true; answer: string; parts: SceneParts } | { ok: false; reason: "short" | "long" };

/** Prüft die drei Teile so, wie die Datenbank es später prüft - nur früher und mit einem Grund. */
export function checkScene(input: SceneParts): SceneCheck {
  const parts: SceneParts = {};
  if (input.story !== undefined) {
    const story = input.story.trim();
    if (story.length > DISCOVER_MAX_LENGTH) return { ok: false, reason: "long" };
    if (story.length < DISCOVER_MIN_LENGTH) return { ok: false, reason: "short" };
    return { ok: true, answer: story, parts: { story } };
  }
  for (const key of STEP_KEYS) {
    const text = (input[key] ?? "").trim();
    if (text.length > PART_MAX_LENGTH) return { ok: false, reason: "long" };
    if (text.length > 0) parts[key] = text;
  }
  const answer = composeAnswer(parts);
  if (answer.length < DISCOVER_MIN_LENGTH) return { ok: false, reason: "short" };
  if (answer.length > DISCOVER_MAX_LENGTH) return { ok: false, reason: "long" };
  return { ok: true, answer, parts };
}

/** Die Nachfrage kommt nur, wenn „Was hast du getan?“ sehr kurz ist - und nur einmal. */
export function needsFollowUp(actionText: string, alreadyAsked: boolean) {
  const length = actionText.trim().length;
  return !alreadyAsked && length > 0 && length < FOLLOW_UP_BELOW;
}

/** Die Auswahl der Szenen: bekannte Szenen, ohne Doppelte, in der Reihenfolge der Person. */
export function cleanSceneSelection(ids: readonly string[]): SceneId[] {
  const seen = new Set<string>();
  const result: SceneId[] = [];
  for (const id of ids) {
    if (isSceneId(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export function isValidSceneSelection(ids: readonly SceneId[]) {
  return ids.length >= SCENE_MIN && ids.length <= SCENE_MAX;
}

/** Stichworte aus dem Intro: gekürzt, ohne Leeres und Doppeltes, höchstens acht. */
export function cleanIntroNotes(values: readonly unknown[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.replace(/\s+/g, " ").trim().slice(0, INTRO_NOTE_MAX_LENGTH);
    if (text && !result.includes(text)) result.push(text);
    if (result.length >= INTRO_NOTES_MAX) break;
  }
  return result;
}

/**
 * Ein Stichwort an den Text im Feld anhängen (die Person tippt es in der Szene an): mit einem Leerzeichen dazwischen,
 * außer das Feld ist leer oder endet schon mit Leerraum, und auf die erlaubte Länge gekürzt. Der vorhandene Text geht
 * nie verloren; ist kein Platz mehr, bleibt er unverändert.
 */
export function appendNoteToText(current: string, note: string, maxLength: number): string {
  const text = note.replace(/\s+/g, " ").trim();
  if (!text) return current;
  const glue = current === "" || /\s$/.test(current) ? "" : " ";
  return `${current}${glue}${text}`.slice(0, Math.max(maxLength, current.length));
}

// ---------------------------------------------------------------------------
// Wo steht die Person? Aus den Fragen des Gesprächs, nicht aus einem eigenen Zähler.
// ---------------------------------------------------------------------------

/**
 * `themed`: false = die Szene ist geschrieben, aber die Themen sind noch nicht gewählt. Fehlt die Angabe (frühere
 * Gespräche, Runde 3), gilt die Szene als fertig, sobald sie beantwortet ist.
 */
export type DiscoverTurn = { questionId: string; answered: boolean; skipped: boolean; themed?: boolean };

/** Ob zu einer Szene noch Themen zu wählen sind: nur bei dem einen Text der Fassung vom 25.11.2026. */
export function sceneThemed(turn: { parts: SceneParts; themes: readonly unknown[] | null }) {
  return turn.parts.story === undefined || turn.themes !== null;
}

export type DiscoverPhase =
  | { phase: "pick" }
  | { phase: "scene"; index: number }
  | { phase: "interim" }
  | { phase: "round3"; index: number }
  | { phase: "finish" };

const resolved = (turn: DiscoverTurn) => turn.skipped || (turn.answered && turn.themed !== false);

/**
 * `pick`     noch keine Szene gewählt.
 * `scene`    die erste Szene, die weder beantwortet noch übersprungen ist.
 * `interim`  alle Szenen sind durch, die dritte Runde hat noch nicht begonnen.
 * `round3`   die erste Frage der dritten Runde, die offen ist.
 * `finish`   alles ist durch - das Gespräch kann abgeschlossen werden.
 */
export function discoverPhase(turns: readonly DiscoverTurn[]): DiscoverPhase {
  if (turns.length === 0) return { phase: "pick" };
  const scenes = turns.filter((turn) => isSceneId(turn.questionId));
  const sceneIndex = scenes.findIndex((turn) => !resolved(turn));
  if (sceneIndex >= 0) return { phase: "scene", index: turns.indexOf(scenes[sceneIndex]) };
  const round = turns.filter((turn) => ROUND_THREE_IDS.includes(turn.questionId));
  if (round.length === 0) return { phase: "interim" };
  const roundIndex = round.findIndex((turn) => !resolved(turn));
  if (roundIndex >= 0) return { phase: "round3", index: turns.indexOf(round[roundIndex]) };
  return { phase: "finish" };
}

export function answeredScenes(turns: readonly DiscoverTurn[]) {
  return turns.filter((turn) => isSceneId(turn.questionId) && turn.answered).length;
}

/**
 * Überspringen geht nur, solange danach noch mindestens fünf Szenen beantwortbar bleiben: die schon
 * beantworteten plus die, die noch offen sind (ohne die, die man gerade überspringt).
 */
export function canSkipScene(turns: readonly DiscoverTurn[]) {
  const sceneTurns = turns.filter((turn) => isSceneId(turn.questionId));
  const answered = sceneTurns.filter((turn) => turn.answered).length;
  const open = sceneTurns.filter((turn) => !resolved(turn)).length;
  return answered + open - 1 >= SCENE_MIN;
}

const KEY_SENTENCE_MAX = 170;

/** Der Satz, der zeigt, was die Person getan hat: „Was hast du getan?“, sonst der Anfang der Antwort. */
export function keySentence(turn: { parts: SceneParts; answer: string | null }) {
  const source = (turn.parts.action ?? turn.parts.story ?? turn.answer ?? "").replace(/\s+/g, " ").trim();
  if (source.length <= KEY_SENTENCE_MAX) return source;
  const cut = source.slice(0, KEY_SENTENCE_MAX);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return lastStop > 60 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()} …`;
}

