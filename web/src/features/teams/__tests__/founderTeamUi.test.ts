import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";

test("team routes use the existing product chrome", () => {
  for (const pathname of [
    "/teams/team-1",
    "/teams/team-1/setup",
    "/teams/team-1/setup/time_commitment",
    "/teams/team-1/founder-library",
  ]) {
    assert.equal(isProductChromePath(pathname), true, pathname);
  }

  assert.equal(isProductChromePath("/login"), false);
  assert.equal(isProductChromePath("/debug/founder-scoring"), false);
});

test("global link reset no longer overrides Tailwind text color utilities", () => {
  const globals = readFileSync("src/app/globals.css", "utf8");
  assert.match(globals, /^@import "tailwindcss";/);
  assert.doesNotMatch(globals, /(?:^|\n)\s*a\s*\{[^}]*color\s*:\s*inherit/);
});

test("setup overview keeps all topics in compact keyboard-visible links", () => {
  const page = readFileSync("src/app/(product)/teams/[teamId]/setup/page.tsx", "utf8");
  const messages = JSON.parse(readFileSync("messages/en/teams.json", "utf8")) as {
    setup: { items: Record<string, { title: string; question: string }> };
  };

  assert.equal(Object.keys(messages.setup.items).length, 18);
  assert.deepEqual(Object.keys(messages.setup.items).sort(), [...FOUNDER_SETUP_ITEM_KEYS].sort());
  assert.match(page, /className="group flex min-h-16 w-full items-center/);
  assert.match(page, /focus-visible:ring-2/);
  assert.match(page, /FounderSetupStatusChip/);
  assert.match(page, /aria-hidden="true"/);
  assert.doesNotMatch(page, /items\.\$\{item\.key\}\.question/);
});

test("setup status chips are textual and avoid warning colors", () => {
  const chip = readFileSync("src/features/teams/FounderSetupStatusChip.tsx", "utf8");
  for (const status of [
    "open",
    "discussing",
    "confirmation_pending",
    "clarified",
    "documented",
    "not_relevant",
  ]) {
    assert.match(chip, new RegExp(`${status}:`));
  }
  assert.match(chip, /<span>\{label\}<\/span>/);
  assert.doesNotMatch(chip, /(?:red|rose|emerald)-/);
});

test("homebase presents localized real avatars with initials fallback in the intended order", () => {
  const page = readFileSync("src/app/(product)/teams/[teamId]/page.tsx", "utf8");
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));
  assert.match(page, /<ProfileAvatar/);
  assert.match(page, /displayName=\{name\}/);
  assert.match(page, /avatarId=\{team\.members\[index\]\?\.avatarId\}/);
  assert.match(page, /imageUrl=\{team\.members\[index\]\?\.avatarUrl\}/);
  assert.equal(de.homebase.founders.avatarAlt, "Profil von {name}");
  assert.equal(en.homebase.founders.avatarAlt, "Profile for {name}");

  const founder = page.indexOf('aria-labelledby="team-founders-title"');
  const alignment = page.indexOf('aria-labelledby="team-alignment-title"');
  const setup = page.indexOf('aria-labelledby="team-setup-title"');
  const agreements = page.indexOf('aria-labelledby="team-agreements-title"');
  const advisor = page.indexOf("<FounderRelationshipAdvisorPanel");
  assert.ok(founder < alignment && alignment < setup && setup < agreements && agreements < advisor);
});

test("detail makes a founder's pending confirmation and CTA hierarchy explicit in DE and EN", () => {
  const detail = readFileSync(
    "src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx",
    "utf8"
  );
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8")) as {
    setup: { detail: Record<string, string>; actions: Record<string, string> };
  };
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8")) as typeof de;

  assert.equal(de.setup.detail.yourConfirmationPending, "Deine Bestätigung ist noch offen.");
  assert.equal(en.setup.detail.yourConfirmationPending, "Your confirmation is still open.");
  assert.match(de.setup.detail.documentationReference, /Nur bei „Dokumentiert“/);
  assert.match(en.setup.detail.documentationReference, /For “Documented” only/);
  assert.match(detail, /variant=\{currentUserConfirmed \? "utility" : "primary"\}/);
  assert.match(detail, /variant="utility" className="mt-4 min-h-11"/);
  assert.match(detail, /variant="primary" className="mt-4 min-h-11"/);
  assert.match(detail, /focus-visible:ring-2/);
});
