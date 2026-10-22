import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");
const logo = source("src/components/brand/BrandLogo.tsx");
const logoCode = logo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("the wordmark comes from the two approved PNGs, untouched", () => {
  for (const file of ["public/brand/made2found-logo-on-light.png", "public/brand/made2found-logo-on-dark.png"]) {
    assert.ok(existsSync(file), file);
  }
  assert.match(logo, /onLight: "\/brand\/made2found-logo-on-light\.png"/);
  assert.match(logo, /onDark: "\/brand\/made2found-logo-on-dark\.png"/);
  assert.match(logo, /width=\{2000\}\s*height=\{500\}/, "aspect ratio of the source files");
  // No recoloring, filters or boxes behind the mark.
  assert.doesNotMatch(logoCode, /filter|invert|grayscale|brightness|bg-|background|mix-blend|rounded/);
});

test("the claim is real text below the logo, not part of the image", () => {
  assert.match(logo, /export const BRAND_CLAIM = "From People to Impact";/);
  assert.match(logo, /className=\{`block uppercase/);
});

test("headers show the logo without the claim, the homepage footer shows both", () => {
  for (const file of [
    "src/components/marketing/HomepageNav.tsx",
    "src/features/navigation/ProductShell.tsx",
    "src/features/connect/PublicConnectShell.tsx",
    "src/app/(marketing)/informierte-entscheidungen/page.tsx",
  ]) {
    const code = source(file);
    assert.match(code, /<BrandLogo\b/, file);
    assert.doesNotMatch(code, /<BrandLogo[^>]*\bclaim\b/, `${file}: no claim in the header`);
    assert.doesNotMatch(code, /cofoundery-align-logo/, file);
  }
  const home = source("src/app/(marketing)/page.tsx");
  assert.match(home, /<BrandLogo[^>]*\bclaim\b/);
  // The claim comes from <BrandLogo claim>; a literal copy on the page would be a second, separate line.
  assert.equal(home.split("From People to Impact").length, 1, "the footer claim is not repeated as a separate line");
});

test("mails use the light-background PNG at its own aspect ratio", () => {
  const messages = source("src/features/email/emailMessages.ts");
  assert.match(messages, /toPublicAppUrl\("\/brand\/made2found-logo-on-light\.png"\)/);
  for (const file of ["sendAdvisorTeamFounderInviteEmail", "sendCoFounderInviteEmail", "sendDiscoverySavedSearchEmail", "sendFounderInTheWildHandoffEmail", "sendNetworkNotificationEmail", "sendReadMyMindStartedEmail", "sendSavedSearchEmail"]) {
    const code = source(`src/lib/email/${file}.ts`);
    // 2000 x 500 shown 176 wide: a fixed height must be 44, or Outlook squashes it.
    assert.match(code, /getEmailLogoUrl\(\)[\s\S]{0,120}width="176"\s+height="44"/, file);
  }
  // The old file stays published for mails that were already sent.
  assert.ok(existsSync("public/cofoundery-align-logo.svg"));
});

test("no brand component still points at the old CoFoundery logo", () => {
  for (const file of [
    "src/components/brand/BrandLogo.tsx", "src/components/marketing/HomepageNav.tsx", "src/components/marketing/LandingTopNav.tsx",
    "src/app/(marketing)/page.tsx", "src/app/(marketing)/informierte-entscheidungen/page.tsx",
    "src/features/navigation/ProductShell.tsx", "src/features/connect/PublicConnectShell.tsx",
    "src/features/reporting/FounderAlignmentWorkbookClient.tsx", "src/features/reporting/DebugConversationGuidePreview.tsx",
    "src/features/email/emailMessages.ts",
  ]) {
    assert.doesNotMatch(source(file).replace(/\/\*[\s\S]*?\*\//g, ""), /cofoundery-align-logo/, file);
  }
});
