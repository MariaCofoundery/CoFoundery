import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LOCALE, normalizeLocale, resolveLocalePreference } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

test("normalizes supported locales", () => {
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("de-DE"), "de");
});

test("falls back to the default locale for invalid values", () => {
  assert.equal(normalizeLocale("fr"), DEFAULT_LOCALE);
  assert.equal(normalizeLocale(null), DEFAULT_LOCALE);
});

test("prefers a valid locale cookie over browser language", () => {
  assert.equal(resolveLocalePreference("en", "de-DE,de;q=0.9"), "en");
});

test("uses browser fallback when the locale cookie is missing or invalid", () => {
  assert.equal(resolveLocalePreference(null, "en-US,en;q=0.9"), "en");
  assert.equal(resolveLocalePreference("fr", "en-US,en;q=0.9"), "en");
});

test("loads English navigation messages", () => {
  const messages = getMessages("en");
  const navigation = messages.navigation as Record<string, string>;
  assert.equal(navigation.dashboard, "Dashboard");
  assert.equal(navigation.logout, "Sign out");
});

test("loads English discovery messages", () => {
  const messages = getMessages("en");
  const discovery = messages.discovery as {
    index?: { title?: string };
    profile?: { assessment?: { title?: string } };
  };
  assert.equal(discovery.index?.title, "Find a co-founder");
  assert.equal(discovery.profile?.assessment?.title, "Include Cofoundery Check");
});

test("loads English auth, dashboard, workspace, workbook and report messages", () => {
  const messages = getMessages("en");
  const auth = messages.auth as {
    login?: { subtitle?: string };
    magicLinkForm?: { submit?: string };
  };
  const dashboard = messages.dashboard as {
    hero?: { eyebrow?: string };
    actions?: { inviteCofounder?: string };
    profileSnapshot?: {
      dimensions?: {
        companyLogic?: { label?: string };
      };
    };
    account?: { delete?: { button?: string } };
  };
  const workspace = messages.workspace as {
    agreement?: { editor?: { saveSection?: string } };
  };
  const workbook = messages.workbook as {
    intro?: { start?: string };
    client?: { title?: string };
    steps?: { vision_direction?: { title?: string } };
  };
  const report = messages.report as {
    common?: { savePdf?: string };
    session?: { startWorkspace?: string };
  };

  assert.equal(auth.login?.subtitle, "Sign in with a magic link if you already have access.");
  assert.equal(auth.magicLinkForm?.submit, "Send magic link");
  assert.equal(dashboard.hero?.eyebrow, "Founder dashboard");
  assert.equal(dashboard.actions?.inviteCofounder, "Invite co-founder");
  assert.equal(dashboard.profileSnapshot?.dimensions?.companyLogic?.label, "Company logic");
  assert.equal(dashboard.account?.delete?.button, "Delete account");
  assert.equal(workspace.agreement?.editor?.saveSection, "Save section");
  assert.equal(workbook.intro?.start, "Start workbook");
  assert.equal(workbook.client?.title, "Workbook for your conversation");
  assert.equal(workbook.steps?.vision_direction?.title, "Company logic");
  assert.equal(report.common?.savePdf, "Save as PDF");
  assert.equal(report.session?.startWorkspace, "Start shared workspace");
});

test("loads English feedback and advisor messages", () => {
  const messages = getMessages("en");
  const feedback = messages.feedback as {
    dialogTitle?: string;
    dictation?: { start?: string };
  };
  const advisor = messages.advisor as {
    dashboard?: {
      inviteTeam?: { title?: string };
      followUps?: { none?: string };
      statuses?: { reportReady?: string };
    };
    report?: { backToDashboard?: string; save?: string };
    invite?: { openWorkbook?: string };
    teamContext?: { existingTeam?: string };
  };
  const navigation = messages.navigation as {
    statusLabels?: { inProgress?: string };
    teamContexts?: { existingTeam?: string };
  };

  assert.equal(feedback.dialogTitle, "Quick product check");
  assert.equal(feedback.dictation?.start, "Start dictation");
  assert.equal(advisor.teamContext?.existingTeam, "Existing team");
  assert.equal(advisor.dashboard?.inviteTeam?.title, "Invite team");
  assert.equal(advisor.dashboard?.followUps?.none, "No follow-up set");
  assert.equal(advisor.dashboard?.statuses?.reportReady, "Report ready");
  assert.equal(advisor.report?.backToDashboard, "Back to advisor dashboard");
  assert.equal(advisor.report?.save, "Save");
  assert.equal(advisor.invite?.openWorkbook, "Open workbook");
  assert.equal(navigation.statusLabels?.inProgress, "In progress");
  assert.equal(navigation.teamContexts?.existingTeam, "Existing team");
});

test("loads English invite token-flow messages", () => {
  const messages = getMessages("en");
  const invite = messages.invite as {
    join?: { loadingTitle?: string; toDashboard?: string };
    welcome?: { title?: string; nextLabels?: { base?: string } };
    teamInvite?: { title?: string; activateCta?: string };
    basisComplete?: { title?: string; continueValues?: string };
    done?: { reportReady?: { title?: string }; actions?: { matchingReport?: string } };
  };

  assert.equal(invite.join?.loadingTitle, "Checking invitation");
  assert.equal(invite.join?.toDashboard, "Go to dashboard");
  assert.equal(invite.welcome?.title, "Welcome");
  assert.equal(invite.welcome?.nextLabels?.base, "Go to foundation questionnaire");
  assert.equal(invite.teamInvite?.title, "Matching start for two founders");
  assert.equal(invite.teamInvite?.activateCta, "Confirm start");
  assert.equal(invite.basisComplete?.title, "Nice. The foundation questionnaire is complete.");
  assert.equal(invite.basisComplete?.continueValues, "Continue now: values module (12 questions)");
  assert.equal(invite.done?.reportReady?.title, "You’re all set.");
  assert.equal(invite.done?.actions?.matchingReport, "View matching report");
});

test("loads English profile basics messages", () => {
  const messages = getMessages("en");
  const profile = messages.profile as {
    basicsForm?: {
      onboarding?: {
        steps?: { welcome?: { title?: string } };
        startButton?: string;
      };
      skills?: { Sonstiges?: string };
      intentions?: { Suche?: { label?: string } };
    };
    welcome?: { submit?: string };
  };

  assert.equal(profile.basicsForm?.onboarding?.steps?.welcome?.title, "Welcome to CoFoundery Align");
  assert.equal(profile.basicsForm?.onboarding?.startButton, "Start profile");
  assert.equal(profile.basicsForm?.skills?.Sonstiges, "Other");
  assert.equal(profile.basicsForm?.intentions?.Suche?.label, "Searching");
  assert.equal(profile.welcome?.submit, "Let's start");
});
