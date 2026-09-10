import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COMPARISON_STATES } from "@/features/capability/capabilityComparison";
import { isProductChromePath } from "@/features/navigation/productChromePath";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const PAGE = "src/app/(product)/profile/compare/[userId]/page.tsx";
const DATA = "src/features/capability/capabilityComparisonData.ts";
const VIEW = "src/features/capability/CapabilityComparisonView.tsx";

// ---------------------------------------------------------------------------
// Zugriff
// ---------------------------------------------------------------------------
test("a user id without a connection gets a 404, not an empty page", () => {
  const page = source(PAGE);
  // Ein "kein Zugriff"-Hinweis wuerde bestaetigen, dass es dieses Konto gibt.
  assert.match(page, /if \(!person\) notFound\(\)/);
  assert.match(page, /redirect\(`\/login\?next=\/profile\/compare\//);

  const data = source(DATA);
  // Nur angenommene Verbindungen, und niemals man selbst.
  assert.match(data, /\.eq\("status", "accepted"\)/);
  assert.match(data, /if \(otherUserId === userId\) return null/);
});

test("the other person's data comes only through the disclosure ladder", () => {
  const data = source(DATA);
  // getDisclosedCapability ist der einzige Weg. Ein direkter Zugriff auf
  // person_capability_entries mit fremder user_id waere die Umgehung.
  assert.match(data, /getDisclosedCapability\(client, person\.userId, person\.context\)/);
  assert.doesNotMatch(data, /from\("person_capability_entries"\)/);
  assert.doesNotMatch(data, /from\("person_capability_evidence"\)/);
  // Belege werden in dieser Fassung ueberhaupt nicht freigegeben.
  assert.doesNotMatch(source(VIEW), /narrative/);
});

test("the comparison page is uncrawlable and carries the product navigation", () => {
  const robots = source("src/app/robots.ts");
  // /profile deckt als Praefix auch /profile/compare ab.
  assert.match(robots, /disallow: \[[^\]]*"\/profile"/);

  assert.equal(isProductChromePath("/profile"), true);
  assert.equal(
    isProductChromePath("/profile/compare/2f3c1a90-0000-4000-8000-000000000000"),
    true,
    "die Unterseite braucht dieselbe Navigation wie das Profil"
  );
});

// ---------------------------------------------------------------------------
// Was die Seite zeigt und was nicht
// ---------------------------------------------------------------------------
test("no score reaches the surface", () => {
  const view = source(VIEW);
  // Ein Wert im Kopfbereich waere das Erste, was jemand liest, und alles
  // danach nur noch Beleg dafuer.
  assert.doesNotMatch(view, /toFixed|Math\.round|percent|%/);
  assert.doesNotMatch(source(PAGE), /score|percent/i);
});

test("both sides are always shown, with the entries behind the finding", () => {
  const view = source(VIEW);
  assert.match(view, /<SideCell label=\{copy\.yours\} side=\{area\.a\}/);
  assert.match(view, /<SideCell label=\{copy\.theirName\} side=\{area\.b\}/);
  // Fehlt eine Angabe, steht das da - und wird nicht als Stufe 0 erfunden.
  assert.match(view, /copy\.levelUnset/);
  assert.match(view, /copy\.wishUnset/);
});

test("motion is decoration that can be switched off, never the only way to read it", () => {
  const view = source(VIEW);
  assert.match(view, /prefers-reduced-motion: reduce/);
  assert.match(view, /animation: none/);
  // `both` haelt den Endzustand; ohne Animation stehen die Endwerte sofort.
  assert.match(view, /comparison-rise 520ms[^;]*both/);
  // Reines CSS: die Seite bleibt eine Server Component.
  assert.doesNotMatch(view, /"use client"/);
  assert.doesNotMatch(view, /useEffect|useState/);
});

test("every state has a tone, so no state renders without styling", () => {
  const view = source(VIEW);
  for (const state of COMPARISON_STATES) {
    assert.match(view, new RegExp(`${state}: \\{`), `STATE_TONE fehlt fuer ${state}`);
  }
});

// ---------------------------------------------------------------------------
// Einstieg und Copy
// ---------------------------------------------------------------------------
test("the entry point only appears when there is something to compare", () => {
  const profile = source("src/app/(product)/profile/page.tsx");
  // Ohne eigenen Snapshot oder ohne Verbindung waere es eine Einladung zu
  // einer leeren Seite.
  assert.match(
    profile,
    /step === null && entries\.length > 0 && comparablePeople\.length > 0/
  );
  assert.match(profile, /\/profile\/compare\/\$\{person\.userId\}/);
});

test("the empty state does not say which side is missing data", () => {
  for (const locale of ["de", "en"]) {
    const comparison = readJson(`messages/${locale}/capability.json`).comparison as Record<string, string>;
    assert.ok(comparison.empty, `${locale}: comparison.empty fehlt`);
    // Sonst waere die Zurueckhaltung der anderen Person eine Aussage.
    assert.doesNotMatch(comparison.empty, /hat nicht freigegeben|has not shared/i);
  }
});

test("the comparison says it is a conversation basis, not a test", () => {
  const de = readJson("messages/de/capability.json").comparison as Record<string, string>;
  assert.match(de.intro, /keine Bewertung|kein Passungswert/);
  assert.match(de.basis, /Gesprächsgrundlage/);
  assert.match(de.basis, /sagt nichts über Erfolg vorher/);
  // Und die Luecken werden erklaert, statt sie zu deuten.
  assert.match(de.gapNote, /nicht eingetragen/);
  assert.match(de.gapNote, /nicht freigegeben/);
});

test("both locales carry the whole comparison block", () => {
  const flatten = (value: unknown, prefix = ""): string[] =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
          flatten(nested, prefix ? `${prefix}.${key}` : key)
        )
      : [prefix];

  const de = flatten(readJson("messages/de/capability.json").comparison).sort();
  const en = flatten(readJson("messages/en/capability.json").comparison).sort();
  assert.deepEqual(de, en);
});
