import type {
  CheckIn,
  OutcomeComment,
  ProgramMilestone,
  ProgramOutcome,
  ProgramProfile,
  ProgramReward,
  ProgramUpdate,
} from "@/features/advisor/teamProgramData";

/**
 * Beispieldaten fuer die Vorschau unter /advisor/beispiel: ein erfundenes Team, damit man sieht, wie
 * die Seiten mit Inhalt aussehen, bevor das erste echte Team da ist. Nichts davon liegt in der
 * Datenbank, und die Vorschau speichert nichts. Texte kommen aus den Uebersetzungen, Daten sind
 * relativ zu heute.
 */
const PROGRAM_ID = "00000000-0000-4000-8000-000000000001";
const dayOffset = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const id = (n: number) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

type Text = (key: string) => string;

export function buildExampleProgram(t: Text) {
  const catalog: [string, number, "confirmed" | "reported" | "open"][] = [
    ["team_complete", 1, "confirmed"],
    ["customer_interviews", 1, "confirmed"],
    ["prototype", 1, "confirmed"],
    ["pitch_held", 1, "confirmed"],
    ["pilot_customer", 2, "reported"],
    ["mvp_live", 2, "open"],
    ["first_paying_customer", 3, "open"],
    ["investor_meeting", 1, "open"],
    ["funding_round", 3, "open"],
  ];
  const outcomes: ProgramOutcome[] = catalog.map(([defaultKey, stars, state], index) => ({
    catalogId: id(index + 1),
    defaultKey,
    title: null,
    stars,
    outcomeId: state === "open" ? null : id(50 + index),
    achievedOn: state === "open" ? null : dayOffset(-60 + index * 9),
    note: null,
    confirmed: state === "confirmed",
  }));
  const comments: OutcomeComment[] = [
    { outcomeId: id(50 + 1), side: "team", body: t("fixtureCommentTeam") },
    { outcomeId: id(50 + 1), side: "org", body: t("fixtureCommentOrg") },
  ];
  const starsTotal = outcomes.filter((entry) => entry.confirmed).reduce((sum, entry) => sum + entry.stars, 0);
  const rewards: ProgramReward[] = [
    { rewardId: id(70), starsNeeded: 3, title: t("fixtureReward1"), description: t("fixtureReward1Text"), starsTotal, unlockedAt: dayOffset(-20), redeemedAt: dayOffset(-12) },
    { rewardId: id(71), starsNeeded: 6, title: t("fixtureReward2"), description: t("fixtureReward2Text"), starsTotal, unlockedAt: null, redeemedAt: null },
    { rewardId: id(72), starsNeeded: 10, title: t("fixtureReward3"), description: null, starsTotal, unlockedAt: null, redeemedAt: null },
  ];
  const checkIns: CheckIn[] = [{ checkInId: id(80), heldOn: dayOffset(-14), summary: t("fixtureCheckIn"), nextOn: dayOffset(16) }];
  const milestones: ProgramMilestone[] = [
    { milestoneId: id(90), title: t("fixtureMilestone1"), dueOn: dayOffset(-5), targetCount: 15, doneCount: 15 },
    { milestoneId: id(91), title: t("fixtureMilestone2"), dueOn: dayOffset(12), targetCount: 3, doneCount: 1 },
    { milestoneId: id(92), title: t("fixtureMilestone3"), dueOn: dayOffset(40), targetCount: null, doneCount: 0 },
  ];
  const questions = t("fixtureQuestions").split(" | ");
  const answers = t("fixtureAnswers").split(" | ");
  const updates: ProgramUpdate[] = [
    { updateId: id(95), submittedAt: new Date(Date.now() - 21 * 86400000).toISOString(), answers: questions.map((q, index) => ({ q, a: answers[index] ?? "" })) },
  ];
  const profile: ProgramProfile = {
    companyName: t("fixtureCompany"),
    founders: t("fixtureFounders"),
    address: t("fixtureAddress"),
    contactEmail: "team@example.org",
    contactPhone: null,
  };
  return { programId: PROGRAM_ID, outcomes, comments, rewards, checkIns, milestones, questions, updates, profile, due: dayOffset(9) };
}
