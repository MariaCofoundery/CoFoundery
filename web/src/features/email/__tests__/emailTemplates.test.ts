import assert from "node:assert/strict";
import test from "node:test";
import { buildAdvisorInviteEmailPayload } from "@/lib/email/sendAdvisorInviteEmail";
import { buildAdvisorTeamFounderInviteEmailPayload } from "@/lib/email/sendAdvisorTeamFounderInviteEmail";
import { buildCoFounderInviteEmailPayload } from "@/lib/email/sendCoFounderInviteEmail";
import { buildReadMyMindStartedEmailPayload } from "@/lib/email/sendReadMyMindStartedEmail";
import { getEmailLogoUrl, getEmailPrivacyUrl } from "@/features/email/emailMessages";
import { getPublicAppOrigin, toPublicAppUrl } from "@/lib/publicAppOrigin";

const INVITE_URL = "https://app.cofoundery.de/join?token=opaque-token-123";

test("public mail links use Made2Found by default and respect configured and local origins", () => {
  const keys = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "SITE_URL", "APP_URL"] as const;
  const previous = keys.map((key) => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(getPublicAppOrigin("https://preview.example.invalid"), "https://made2found.de");
    assert.equal(getPublicAppOrigin("http://localhost:3000"), "http://localhost:3000");
    assert.equal(getEmailPrivacyUrl("de"), "https://made2found.de/datenschutz");
    assert.equal(getEmailPrivacyUrl("en"), "https://made2found.de/datenschutz");
    assert.equal(getEmailLogoUrl(), "https://made2found.de/brand/made2found-logo-on-light.png");
    const payload = buildCoFounderInviteEmailPayload({
      inviteeEmail: "founder@example.com",
      inviteUrl: toPublicAppUrl("/join?token=test"),
      inviterDisplayName: null,
      reportScope: "basis",
      teamContext: "pre_founder",
    });
    assert.match(payload.html, /href="https:\/\/made2found\.de\/join\?token=test"/);
    assert.match(payload.html, /href="https:\/\/made2found\.de\/datenschutz"/);
    assert.match(payload.html, /src="https:\/\/made2found\.de\/brand\/made2found-logo-on-light\.png"/);

    process.env.NEXT_PUBLIC_SITE_URL = "https://configured.example.invalid/some/path/";
    assert.equal(getPublicAppOrigin(), "https://configured.example.invalid");
    assert.equal(getEmailPrivacyUrl("de"), "https://configured.example.invalid/datenschutz");
    assert.equal(getEmailLogoUrl(), "https://configured.example.invalid/brand/made2found-logo-on-light.png");
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

test("co-founder invite email defaults to German and keeps the invite URL", () => {
  const payload = buildCoFounderInviteEmailPayload({
    inviteeEmail: "founder@example.com",
    inviteUrl: INVITE_URL,
    inviterDisplayName: "Mara",
    reportScope: "basis_plus_values",
    teamContext: "pre_founder",
  });

  assert.equal(payload.subject, "Mara lädt dich zu Made2Found ein");
  assert.match(payload.html, /<html lang="de">/);
  assert.match(payload.html, /Einladung öffnen/);
  assert.match(payload.text, /Made2Found hilft Founder-Teams/);
  assert.match(payload.html, new RegExp(escapeRegExp(INVITE_URL)));
  assert.match(payload.text, new RegExp(escapeRegExp(INVITE_URL)));
});

test("co-founder invite email renders English with locale en", () => {
  const payload = buildCoFounderInviteEmailPayload({
    inviteeEmail: "founder@example.com",
    inviteUrl: INVITE_URL,
    inviterDisplayName: "Mara",
    reportScope: "basis_plus_values",
    teamContext: "pre_founder",
    locale: "en",
  });

  assert.equal(payload.subject, "Mara invited you to Made2Found");
  assert.match(payload.html, /<html lang="en">/);
  assert.match(payload.html, /Open invitation/);
  assert.match(payload.text, /co-founder dynamics/);
  assert.match(payload.text, /Foundation \+ values/);
  assert.match(payload.html, new RegExp(escapeRegExp(INVITE_URL)));
});

test("advisor invite email renders English subject and body", () => {
  const payload = buildAdvisorInviteEmailPayload({
    advisorEmail: "advisor@example.com",
    advisorName: "Alex",
    inviteUrl: INVITE_URL,
    founderAName: "Mara",
    founderBName: "Noah",
    teamContext: "existing_team",
    locale: "en",
  });

  assert.equal(payload.subject, "Mara and Noah invited you as their advisor");
  assert.match(payload.html, /Personal advisor invitation/);
  assert.match(payload.text, /Once you accept, you can access/);
  assert.match(payload.text, /not Commitment Lab, current deep dives, open points/);
  assert.match(payload.text, /Existing founder team/);
  assert.match(payload.text, new RegExp(escapeRegExp(INVITE_URL)));
});

test("advisor team founder invite email renders English and preserves token URL", () => {
  const payload = buildAdvisorTeamFounderInviteEmailPayload({
    inviteeEmail: "founder@example.com",
    inviteUrl: INVITE_URL,
    advisorName: "Alex",
    teamName: "Project Atlas",
    counterpartLabel: "Noah",
    locale: "en",
  });

  assert.equal(payload.subject, "Alex invited you to Made2Found");
  assert.match(payload.html, /<html lang="en">/);
  assert.match(payload.html, /View invitation/);
  assert.match(payload.text, /Once Noah has also accepted/);
  assert.match(payload.text, /Founder Setup remains separate/);
  assert.match(payload.text, /Commitment Lab, deep dives, and open points remain private/);
  assert.match(payload.html, new RegExp(escapeRegExp(INVITE_URL)));
  assert.match(payload.text, new RegExp(escapeRegExp(INVITE_URL)));
});

test("invalid email locale falls back to German", () => {
  const payload = buildAdvisorTeamFounderInviteEmailPayload({
    inviteeEmail: "founder@example.com",
    inviteUrl: INVITE_URL,
    advisorName: null,
    locale: "fr",
  });

  assert.equal(payload.subject, "Deine Einladung zu Made2Found");
  assert.match(payload.html, /<html lang="de">/);
  assert.match(payload.text, /Ein Advisor hat euch zu einer gemeinsamen Founder-Verbindung/);
});

test("Read My Mind start email renders the German handoff without private product data", () => {
  const roundUrl = "https://cofoundery.de/teams/team-1/collaboration-lab/read-my-mind/round-1";
  const payload = buildReadMyMindStartedEmailPayload({
    recipientEmail: "ben@example.com",
    roundUrl,
    creatorName: "Anna",
    packTitles: ["Easy Start"],
    locale: "de",
  });

  assert.equal(payload.subject, "Anna hat Read My Mind mit dir gestartet – du bist dran");
  assert.match(payload.html, /Read My Mind öffnen/);
  assert.match(payload.text, /Jetzt bist du dran/);
  assert.match(payload.text, /Testphase/);
  assert.match(payload.html, new RegExp(escapeRegExp(roundUrl)));
  assert.doesNotMatch(`${payload.html} ${payload.text}`, /Self Answers|Guess Answers|Need Answers|Founder Setup|Commitment Lab|Discovery/);
});

test("Read My Mind start email renders the English handoff", () => {
  const payload = buildReadMyMindStartedEmailPayload({
    recipientEmail: "ben@example.com",
    roundUrl: INVITE_URL,
    creatorName: "Anna",
    packTitles: ["Easy Start"],
    locale: "en",
  });

  assert.equal(payload.subject, "Anna started Read My Mind with you — you’re up");
  assert.match(payload.html, /Open Read My Mind/);
  assert.match(payload.text, /Now it’s your turn/);
  assert.match(payload.text, /currently in testing/);
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
