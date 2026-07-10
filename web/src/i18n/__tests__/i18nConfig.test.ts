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

test("loads English auth, dashboard and workspace messages", () => {
  const messages = getMessages("en");
  const auth = messages.auth as {
    login?: { subtitle?: string };
    magicLinkForm?: { submit?: string };
  };
  const dashboard = messages.dashboard as {
    hero?: { eyebrow?: string };
    actions?: { inviteCofounder?: string };
  };
  const workspace = messages.workspace as {
    agreement?: { editor?: { saveSection?: string } };
  };

  assert.equal(auth.login?.subtitle, "Sign in with a magic link if you already have access.");
  assert.equal(auth.magicLinkForm?.submit, "Send magic link");
  assert.equal(dashboard.hero?.eyebrow, "Founder dashboard");
  assert.equal(dashboard.actions?.inviteCofounder, "Invite co-founder");
  assert.equal(workspace.agreement?.editor?.saveSection, "Save section");
});
