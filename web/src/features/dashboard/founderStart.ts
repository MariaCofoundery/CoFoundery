import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import type { FounderWorkProfileState } from "@/features/dashboard/founderWorkProfileState";

/**
 * Die Startseite (seit 04.11.2026): EIN naechster Schritt und der Weg dorthin.
 *
 * Reine Funktion, keine Datenbank. Sie bekommt die Zustaende, die die Seite
 * ohnehin liest, und entscheidet daraus zweierlei:
 *
 *   Der Weg     Grundlagen: Wie du arbeitest -> Wo du dich auskennst -> Was du
 *               aufbauen willst -> Mit deinem Team einigen. Steht das Founder
 *               Setup, wechselt der Weg in den Alltag: Testprojekt ->
 *               Check-in-Rhythmus -> regelmaessig abstimmen.
 *   Der Schritt Der erste offene Punkt dieses Wegs. Was andere von der Person
 *               brauchen (Einladungen, Zustimmungen), steht NICHT hier, sondern
 *               unter "Wartet auf dich" - dieselbe Aufgabe zweimal waere Laerm.
 *
 * Kein Prozent, kein "x von y", keine Wertung: Ein Punkt ist erledigt, dran
 * oder offen. Read My Mind, Founder in the Wild und das Commitment Lab sind
 * Uebungen zu zweit und nie ein naechster Schritt.
 */

export type StepState = "done" | "current" | "open";
export type FoundationStep = "work" | "can" | "venture" | "agree";
export type EverydayStep = "testProject" | "rhythm" | "steady";

export type StartTeamInput = {
  id: string;
  /** Die Vorhaben-Antworten der Person fuer dieses Team. */
  venture: "present" | "inProgress" | "open";
  /** `null`: Das Setup ist nicht lesbar - dann gilt es als nicht fertig. */
  setup: { total: number; settled: number; awaitingConfirmation: number; started: boolean } | null;
  testProject: "none" | "draft" | "active" | "closed";
  rhythmSet: boolean;
  checkIn: { state: "none" | "due" | "scheduled" | "open"; due: string | null } | null;
};

export type StartInput = {
  needsOnboarding: boolean;
  work: FounderWorkProfileState;
  capabilityAreas: number;
  /** Ohne Team: Gibt es irgendein abgegebenes Vorhaben? Sonst zaehlt das des Teams. */
  ventureWithoutTeam: "present" | "inProgress" | "open";
  team: StartTeamInput | null;
};

export type StartNextStep =
  | { kind: "complete_profile" }
  | { kind: "workstyle_start" }
  | { kind: "workstyle_continue" }
  | { kind: "capability" }
  | { kind: "venture_start"; teamId: string | null }
  | { kind: "venture_continue"; teamId: string | null }
  | { kind: "invite" }
  | { kind: "setup_confirm"; teamId: string; count: number }
  | { kind: "setup_continue"; teamId: string; open: number }
  | { kind: "setup_start"; teamId: string }
  | { kind: "test_project"; teamId: string; running: boolean }
  | { kind: "rhythm"; teamId: string }
  | { kind: "check_in_open"; teamId: string }
  | { kind: "check_in_due"; teamId: string }
  | { kind: "check_in_scheduled"; teamId: string; due: string }
  | { kind: "team_steady"; teamId: string };

export type FounderStart =
  | { phase: "foundation"; steps: { key: FoundationStep; state: StepState }[]; next: StartNextStep }
  | { phase: "everyday"; steps: { key: EverydayStep; state: StepState }[]; next: StartNextStep };

export function isSetupSettled(setup: StartTeamInput["setup"]) {
  return Boolean(setup && setup.total > 0 && setup.settled === setup.total);
}

function markCurrent<K extends string>(steps: { key: K; done: boolean }[]) {
  const current = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({
    key: step.key,
    state: step.done ? ("done" as const) : index === current ? ("current" as const) : ("open" as const),
  }));
}

export function resolveFounderStart(input: StartInput): FounderStart {
  const team = input.team;
  const venture = team ? team.venture : input.ventureWithoutTeam;
  const workDone = input.work === "completed";
  const canDone = input.capabilityAreas > 0;
  const ventureDone = venture === "present";
  const agreeDone = Boolean(team && isSetupSettled(team.setup));

  if (!team || !agreeDone) {
    const steps = markCurrent<FoundationStep>([
      { key: "work", done: workDone },
      { key: "can", done: canDone },
      { key: "venture", done: ventureDone },
      { key: "agree", done: agreeDone },
    ]);
    return { phase: "foundation", steps, next: foundationNext(input, venture) };
  }

  const testDone = team.testProject === "closed";
  const rhythmDone = team.rhythmSet;
  const steps = markCurrent<EverydayStep>([
    { key: "testProject", done: testDone },
    { key: "rhythm", done: rhythmDone },
    { key: "steady", done: false },
  ]);
  return { phase: "everyday", steps, next: everydayNext(team) };
}

function foundationNext(input: StartInput, venture: StartTeamInput["venture"]): StartNextStep {
  const team = input.team;
  if (input.needsOnboarding) return { kind: "complete_profile" };
  if (input.work === "started") return { kind: "workstyle_continue" };
  if (input.work !== "completed") return { kind: "workstyle_start" };
  if (input.capabilityAreas === 0) return { kind: "capability" };
  if (venture === "inProgress") return { kind: "venture_continue", teamId: team?.id ?? null };
  // Die Beta legt kein Vorhaben an: Ohne Team gibt es nichts zu beantworten, also geht es mit dem Einladen weiter.
  if (venture === "open" && team) return { kind: "venture_start", teamId: team.id };
  if (!team) return { kind: "invite" };
  const setup = team.setup;
  if (setup && setup.awaitingConfirmation > 0) {
    return { kind: "setup_confirm", teamId: team.id, count: setup.awaitingConfirmation };
  }
  if (setup?.started) return { kind: "setup_continue", teamId: team.id, open: setup.total - setup.settled };
  return { kind: "setup_start", teamId: team.id };
}

function everydayNext(team: StartTeamInput): StartNextStep {
  if (team.testProject !== "closed") {
    return { kind: "test_project", teamId: team.id, running: team.testProject === "active" };
  }
  if (!team.rhythmSet) return { kind: "rhythm", teamId: team.id };
  if (team.checkIn?.state === "open") return { kind: "check_in_open", teamId: team.id };
  if (team.checkIn?.state === "due") return { kind: "check_in_due", teamId: team.id };
  if (team.checkIn?.state === "scheduled" && team.checkIn.due) {
    return { kind: "check_in_scheduled", teamId: team.id, due: team.checkIn.due };
  }
  return { kind: "team_steady", teamId: team.id };
}

export function startStepHref(next: StartNextStep): string {
  const team = "teamId" in next && next.teamId ? `/teams/${encodeURIComponent(next.teamId)}` : null;
  switch (next.kind) {
    case "complete_profile":
      return "#dashboard-block-profile-data";
    case "workstyle_start":
    case "workstyle_continue":
      return CURRENT_WORKSTYLE_HREF;
    case "capability":
      return "/profile?step=areas";
    case "venture_start":
    case "venture_continue":
      return next.teamId
        ? `/founder-alignment/vorhaben/beta?venture=${encodeURIComponent(next.teamId)}`
        : "/founder-alignment/vorhaben/beta";
    case "invite":
      return "/invite/new";
    case "setup_confirm":
    case "setup_continue":
    case "setup_start":
      return `${team}/setup`;
    case "test_project":
      return `${team}/test-project`;
    case "rhythm":
    case "check_in_open":
    case "check_in_due":
    case "check_in_scheduled":
      return `${team}/check-in`;
    case "team_steady":
      return team!;
  }
}

/** Welche Aufgaben der Liste schon der naechste Schritt ist - sie stehen dann nicht noch einmal da. */
export function duplicatesNextStep(task: { type: string; href: string }, next: StartNextStep) {
  if (!("teamId" in next) || !next.teamId) return false;
  const teamPath = `/teams/${encodeURIComponent(next.teamId)}`;
  if (task.href !== teamPath && !task.href.startsWith(`${teamPath}/`)) return false;
  if (next.kind.startsWith("setup_")) return task.type === "setup_confirmation" || task.type === "founder_setup_continue";
  if (next.kind.startsWith("check_in_") || next.kind === "rhythm") return task.type === "check_in_due" || task.type === "check_in_open";
  return false;
}

/**
 * Uebungen zu zweit: nie ein Schritt und nicht in "Laeuft gerade". Nur die
 * Einladung zu Read My Mind bleibt als einzelne Karte - dort wartet jemand.
 */
const PAIR_EXERCISE_TYPES = new Set([
  "read_my_mind_continue",
  "read_my_mind_reveal",
  "founder_in_the_wild_handoff",
  "founder_in_the_wild_reveal",
  "commitment_lab_continue",
]);

export function isShownOnStart(task: { type: string }) {
  return !PAIR_EXERCISE_TYPES.has(task.type) && task.type !== "values_continue" && task.type !== "founder_alignment_continue";
}
