import type { AdvisorOrg, OrgMember } from "@/features/advisor/orgData";
import type {
  CheckIn,
  OrgProgramStars,
  OrgTeamProgram,
  OutcomeComment,
  ProgramMaterial,
  ProgramMilestone,
  ProgramOutcome,
  ProgramOrgData,
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
  const orgData: ProgramOrgData = {
    companyName: t("fixtureCompany"),
    legalForm: "GmbH",
    address: t("fixtureAddress"),
    contactName: t("fixtureFounders").split(" ")[0] ?? null,
    contactEmail: "team@example.org",
    contactPhone: null,
    website: null,
    admittedOn: null,
    reference: "A-17",
    note: null,
  };
  return { programId: PROGRAM_ID, outcomes, comments, rewards, checkIns, milestones, questions, updates, profile, orgData, due: dayOffset(9) };
}

const SELF_ID = "00000000-0000-4000-8000-000000000999";

/** Die Organisation, die Teams und die Materialien der Vorschau: drei erfundene Teams, alphabetisch, ohne Reihenfolge nach Sternen. */
export function buildExampleOrg(t: Text) {
  const org: AdvisorOrg = {
    id: "00000000-0000-4000-8000-000000000002",
    features: ["plan", "materials", "learning", "experts", "orgdata", "success"],
    featuresSetupDone: true,
    name: t("fixtureOrg"),
    personSeatLimit: null,
    role: "owner",
    status: "active",
    description: null,
    websiteUrl: null,
    focus: [],
    locationRegion: null,
    programSlug: null,
    programPagePublished: false,
    programWelcome: null,
    hasProgramLogo: false,
    programAccent: null,
    programAccentB: null,
  };
  const members: OrgMember[] = [{ userId: SELF_ID, role: "owner", status: "active", displayName: null, isSelf: true }];
  const team = (n: number, name: string, over: Partial<OrgTeamProgram>): OrgTeamProgram => ({
    programId: `00000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`,
    teamId: `00000000-0000-4000-8000-0000000003${String(n).padStart(2, "0")}`,
    teamName: name,
    status: "active",
    isActive: true,
    memberCount: 2,
    approvedCount: 2,
    contactUserIds: [SELF_ID],
    isContact: true,
    batch: t("fixtureBatch"),
    category: null,
    isAlumni: false,
    soloConfirmed: false,
    includesSetup: true,
    ...over,
  });
  const programs: OrgTeamProgram[] = [
    team(1, t("fixtureTeamLumen"), { memberCount: 1, approvedCount: 1, soloConfirmed: true }),
    team(2, t("teamName"), {}),
    team(3, t("fixtureTeamOrbit"), { status: "invited", isActive: false, approvedCount: 1, contactUserIds: [] }),
  ];
  const stars: OrgProgramStars[] = [
    { programId: programs[0].programId, stars: 7, nextStars: 10, nextTitle: t("fixtureReward3") },
    { programId: programs[1].programId, stars: 4, nextStars: 6, nextTitle: t("fixtureReward2") },
  ];
  const materials: ProgramMaterial[] = [
    { materialId: "00000000-0000-4000-8000-000000000501", title: t("fixtureMaterial1"), url: "https://example.org/programm/folien", note: t("fixtureMaterial1Note") },
    { materialId: "00000000-0000-4000-8000-000000000502", title: t("fixtureMaterial2"), url: "https://example.org/programm/aufzeichnungen", note: null },
  ];
  return { org, members, programs, stars, materials };
}
