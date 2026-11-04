/**
 * Testprojekt: zwei Menschen, die noch nicht sicher sind, arbeiten befristet an
 * einer kleinen Aufgabe und sprechen danach darueber, wie es war.
 *
 * EBENE: Beziehung (ein konkretes Paar), wie Commitment Lab. Es gibt keine
 * Gesamtbewertung, keine Punkte, kein "passt / passt nicht". Die Plattform legt
 * nicht fest, was "fertig" ist - das tragen die beiden selbst ein.
 */
import { bringsArea } from "@/features/capability/capabilityTypes";

export const TEST_PROJECT_TEMPLATE_KEYS = ["interviews", "landing", "market", "pitch", "prototype", "offer"] as const;
export type TestProjectTemplateKey = (typeof TEST_PROJECT_TEMPLATE_KEYS)[number];

export const TEST_PROJECT_STATUSES = ["draft", "active", "closed", "cancelled"] as const;
export type TestProjectStatus = (typeof TEST_PROJECT_STATUSES)[number];

export const TEST_PROJECT_PHASES = ["interim", "closing"] as const;
export type TestProjectPhase = (typeof TEST_PROJECT_PHASES)[number];

/** Alle drei sind gleichwertig dargestellt. */
export const TEST_PROJECT_OUTCOMES = ["continue", "found_team", "stop"] as const;
export type TestProjectOutcome = (typeof TEST_PROJECT_OUTCOMES)[number];

export const TEST_PROJECT_LIMITS = {
  title: 80,
  task: 400,
  roles: 300,
  note: 600,
  itemText: 160,
  items: 20,
  weeksMin: 1,
  weeksMax: 4,
  answer: 3000,
  question: 200,
  taskText: 160,
  taskField: 60,
  contribution: 400,
  contributionAreas: 6,
} as const;

/** Ein Punkt in einer der drei Listen: Schalter und Text. */
export type TestProjectItem = { t: string; on: boolean };

/**
 * Eine Aufgabe im Plan (seit 04.11.2026, Feedback an Maria): was, wer - eine der beiden
 * Personen (user id) oder "both" - und optional der Bereich ("Vertrieb", "Tech" ...).
 */
export const TEST_PROJECT_BOTH = "both";
export type TestProjectTask = { t: string; who: string; f: string | null };

/** "Das bringe ich ein": je Person, nur von ihr selbst geschrieben. Bereiche aus dem Capability-Vokabular. */
export type TestProjectContribution = { userId: string; text: string; areaIds: string[] };

export type TestProject = {
  id: string;
  relationshipId: string;
  createdBy: string | null;
  templateKey: TestProjectTemplateKey | null;
  title: string;
  task: string;
  weeks: number;
  roles: string;
  note: string;
  doneItems: TestProjectItem[];
  rightsItems: TestProjectItem[];
  closingItems: TestProjectItem[];
  taskItems: TestProjectTask[];
  draftVersion: number;
  status: TestProjectStatus;
  startedAt: string | null;
  endsAt: string | null;
  closedAt: string | null;
};

export type TestProjectAnswer = { q: string; a: string };

export type TestProjectResponse = {
  userId: string;
  phase: TestProjectPhase;
  answers: TestProjectAnswer[];
  outcome: TestProjectOutcome | null;
};

export type TestProjectAgreement = { userId: string; draftVersion: number };

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;
}

export const isTestProjectStatus = (value: unknown) => oneOf(TEST_PROJECT_STATUSES, value);
export const isTestProjectTemplateKey = (value: unknown) => oneOf(TEST_PROJECT_TEMPLATE_KEYS, value);
export const isTestProjectPhase = (value: unknown) => oneOf(TEST_PROJECT_PHASES, value);
export const isTestProjectOutcome = (value: unknown) => oneOf(TEST_PROJECT_OUTCOMES, value);

/** Liest eine Liste aus der Datenbank; alles Unerwartete faellt weg statt zu werfen. */
export function normalizeTestProjectItems(value: unknown): TestProjectItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { t: string; on: boolean } =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as { t?: unknown }).t === "string" && typeof (item as { on?: unknown }).on === "boolean")
    .map((item) => ({ t: item.t.slice(0, TEST_PROJECT_LIMITS.itemText), on: item.on }))
    .slice(0, TEST_PROJECT_LIMITS.items);
}

/**
 * Eingabe aus dem Formular fuer die Datenbank: leere Punkte fallen weg, Texte
 * werden gekuerzt. Die Datenbank prueft dasselbe noch einmal.
 */
export function sanitizeTestProjectItems(value: unknown): TestProjectItem[] {
  return normalizeTestProjectItems(value)
    .map((item) => ({ t: item.t.trim(), on: item.on }))
    .filter((item) => item.t !== "");
}

/** Aufgaben aus der Datenbank; alles Unerwartete faellt weg statt zu werfen. */
export function normalizeTestProjectTasks(value: unknown): TestProjectTask[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { t: string; who: string; f?: unknown } =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as { t?: unknown }).t === "string" && typeof (item as { who?: unknown }).who === "string")
    .map((item) => ({
      t: item.t.slice(0, TEST_PROJECT_LIMITS.taskText),
      who: item.who,
      f: typeof item.f === "string" && item.f.trim() !== "" ? item.f.slice(0, TEST_PROJECT_LIMITS.taskField) : null,
    }))
    .slice(0, TEST_PROJECT_LIMITS.items);
}

/**
 * Aufgaben aus dem Formular: leere fallen weg, "wer" muss eine der beiden Personen oder
 * "both" sein (sonst "both"). Die Datenbank prueft dasselbe noch einmal.
 */
export function sanitizeTestProjectTasks(value: unknown, participantUserIds: readonly string[]): TestProjectTask[] {
  return normalizeTestProjectTasks(value)
    .map((task) => ({
      t: task.t.trim(),
      who: task.who === TEST_PROJECT_BOTH || participantUserIds.includes(task.who) ? task.who : TEST_PROJECT_BOTH,
      f: task.f?.trim() || null,
    }))
    .filter((task) => task.t !== "");
}

/** Aufgaben je Person, dann gemeinsame - in der Reihenfolge der Liste. */
export function groupTestProjectTasks(tasks: readonly TestProjectTask[], participantUserIds: readonly string[]) {
  return [...participantUserIds, TEST_PROJECT_BOTH]
    .map((who) => ({ who, tasks: tasks.filter((task) => task.who === who) }))
    .filter((group) => group.tasks.length > 0);
}

/**
 * Vorschlaege fuer "Das bringe ich ein" aus den eigenen Angaben unter "Wo kennst du dich aus?":
 * Bereiche mit Erfahrung (nicht "Keine") oder dem Wunsch, sie zu uebernehmen oder beizutragen.
 * Nur Vorschlaege - geteilt wird erst, was die Person antippt.
 */
export function contributionSuggestions(
  entries: readonly { area_id: string; application_level: number | null; ownership_wish: string | null }[]
) {
  return entries
    .filter((entry) => (entry.application_level ?? 0) >= 2 || entry.ownership_wish === "own" || entry.ownership_wish === "contribute")
    // "Keine" Erfahrung ist eine Angabe zum Bereich, kein Beitrag.
    .filter(bringsArea)
    .map((entry) => entry.area_id);
}

export function normalizeTestProjectAnswers(value: unknown): TestProjectAnswer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is TestProjectAnswer =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as { q?: unknown }).q === "string" && typeof (item as { a?: unknown }).a === "string")
    .map((item) => ({ q: item.q, a: item.a }))
    .slice(0, TEST_PROJECT_LIMITS.items);
}

export const activeTestProjectItems = (items: readonly TestProjectItem[]) =>
  items.filter((item) => item.on && item.t.trim() !== "");

/** Name, Aufgabe und mindestens ein aktiver "Fertig, wenn"-Punkt. */
export function isTestProjectDraftComplete(project: Pick<TestProject, "title" | "task" | "doneItems">) {
  return project.title.trim() !== "" && project.task.trim() !== "" &&
    activeTestProjectItems(project.doneItems).length > 0;
}

/** Hat diese Person dem AKTUELLEN Stand zugestimmt? Eine fruehere Version zaehlt nicht. */
export function hasAgreedToCurrentDraft(
  project: Pick<TestProject, "draftVersion">,
  agreements: readonly TestProjectAgreement[],
  userId: string
) {
  return agreements.some((entry) => entry.userId === userId && entry.draftVersion === project.draftVersion);
}

/** Verbleibende ganze Tage, nie unter null. */
export function testProjectDaysLeft(endsAt: string | null, now: Date = new Date()) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** Die Antworten einer Phase sind erst sichtbar, wenn beide abgegeben haben (die Datenbank erzwingt das). */
export function responsesForPhase(responses: readonly TestProjectResponse[], phase: TestProjectPhase) {
  return responses.filter((entry) => entry.phase === phase);
}

export const isTestProjectPhaseComplete = (
  responses: readonly TestProjectResponse[],
  phase: TestProjectPhase,
  participantUserIds: readonly string[]
) => participantUserIds.every((id) => responses.some((entry) => entry.phase === phase && entry.userId === id));

export function testProjectHref(teamId: string, relationshipId: string, result?: string) {
  const path = `/teams/${encodeURIComponent(teamId)}/test-project/${encodeURIComponent(relationshipId)}`;
  return result ? `${path}?result=${encodeURIComponent(result)}` : path;
}
