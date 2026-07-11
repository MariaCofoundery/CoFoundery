import assert from "node:assert/strict";
import test from "node:test";
import { buildAdvisorInviteEmailPayload } from "@/lib/email/sendAdvisorInviteEmail";
import { buildAdvisorTeamFounderInviteEmailPayload } from "@/lib/email/sendAdvisorTeamFounderInviteEmail";
import { buildCoFounderInviteEmailPayload } from "@/lib/email/sendCoFounderInviteEmail";

const INVITE_URL = "https://app.cofoundery.de/join?token=opaque-token-123";

test("co-founder invite email defaults to German and keeps the invite URL", () => {
  const payload = buildCoFounderInviteEmailPayload({
    inviteeEmail: "founder@example.com",
    inviteUrl: INVITE_URL,
    inviterDisplayName: "Mara",
    reportScope: "basis_plus_values",
    teamContext: "pre_founder",
  });

  assert.equal(payload.subject, "Mara lädt dich zu eurem Cofoundery Align ein");
  assert.match(payload.html, /<html lang="de">/);
  assert.match(payload.html, /Einladung öffnen/);
  assert.match(payload.text, /Cofoundery Align hilft Founder-Teams/);
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

  assert.equal(payload.subject, "Mara invited you to Cofoundery Align");
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

  assert.equal(payload.subject, "Mara and Noah would like to involve you as an advisor");
  assert.match(payload.html, /Personal advisor invitation/);
  assert.match(payload.text, /As an advisor, you get access/);
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

  assert.equal(payload.subject, "Alex invited you into a founder matching");
  assert.match(payload.html, /<html lang="en">/);
  assert.match(payload.html, /Start matching/);
  assert.match(payload.text, /Once Noah has also started/);
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

  assert.equal(payload.subject, "Einladung in ein Founder-Matching");
  assert.match(payload.html, /<html lang="de">/);
  assert.match(payload.text, /Du wurdest in ein strukturiertes Founder-Matching/);
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
