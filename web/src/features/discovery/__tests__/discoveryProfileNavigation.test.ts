import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profilePageSource = readFileSync(
  "src/app/(product)/discovery/profile/page.tsx",
  "utf8"
);
const deMessages = JSON.parse(readFileSync("messages/de/discovery.json", "utf8")) as {
  common: { backToDiscovery: string };
};
const enMessages = JSON.parse(readFileSync("messages/en/discovery.json", "utf8")) as {
  common: { backToDiscovery: string };
};

test("own Discovery profile returns to the canonical Discovery entry", () => {
  assert.match(profilePageSource, /<Link href="\/discovery"/);
  assert.match(profilePageSource, /t\("common\.backToDiscovery"\)/);
  assert.doesNotMatch(profilePageSource, /<Link href="\/dashboard"/);
  assert.doesNotMatch(profilePageSource, /t\("common\.backToDashboard"\)/);
});

test("Discovery back navigation uses clear parallel DE and EN copy", () => {
  assert.equal(deMessages.common.backToDiscovery, "Zurück zu Co-Founder finden");
  assert.equal(enMessages.common.backToDiscovery, "Back to Find a Co-Founder");
});
