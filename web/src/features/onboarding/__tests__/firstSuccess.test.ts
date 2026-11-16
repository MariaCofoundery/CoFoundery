import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { daysSince } from "@/features/connect/newestEntriesModel";

const read = (path: string) => readFileSync(new URL(`../../../../${path}`, import.meta.url), "utf8");

test("daysSince counts Berlin calendar days and never goes negative", () => {
  const now = new Date("2026-11-16T10:00:00Z");
  assert.equal(daysSince("2026-11-16T05:00:00Z", now), 0);
  assert.equal(daysSince("2026-11-15T22:30:00Z", now), 1, "22:30 UTC is 23:30 Berlin on the 15th: yesterday");
  assert.equal(daysSince("2026-11-15T23:30:00Z", now), 0, "23:30 UTC is 00:30 Berlin on the 16th: today");
  assert.equal(daysSince("2026-11-14T12:00:00Z", now), 2);
  assert.equal(daysSince("2026-11-20T12:00:00Z", now), 0);
  assert.equal(daysSince(null, now), 0);
});

test("Connect shows the newest real entries of others after publishing, without names and without counters", () => {
  const source = read("src/features/connect/NewestEntries.tsx");
  assert.match(source, /\.neq\("owner_user_id", userId\)/);
  assert.match(source, /\.eq\("status", "active"\)/);
  assert.match(source, /\.limit\(3\)/);
  assert.doesNotMatch(source, /display_name|network_profiles|count\(/, "no names, no counters");
  assert.match(read("src/app/(product)/connect/profile/page.tsx"), /justPublished \? <NewestEntries/);
});

test("Find shows the newest searchers without names while your own profile is not visible", () => {
  const source = read("src/features/discovery/FindNewestPreview.tsx");
  assert.doesNotMatch(source, /displayName|headline|bio\b/, "names stay hidden until the own profile is visible");
  assert.doesNotMatch(source, /score|rank/i);
  assert.match(read("src/app/(product)/discovery/profile/page.tsx"), /!== "active" \? <div className="mx-auto w-full max-w-6xl"><FindNewestPreview/);
});

test("German and English have the same keys for both previews", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  for (const file of ["connect", "discovery"]) {
    const de = JSON.parse(read(`messages/de/${file}.json`)).newest;
    const en = JSON.parse(read(`messages/en/${file}.json`)).newest;
    assert.deepEqual(keys(de).sort(), keys(en).sort());
    assert.doesNotMatch(JSON.stringify(en), /[äöüÄÖÜß]/);
  }
});

test("the public home page carries the small areas explainer further down, inside the areas section", () => {
  const page = read("src/app/(marketing)/page.tsx");
  assert.match(page, /<section id="bereiche"[\s\S]*data-home-areas-explainer[\s\S]*<AreasExplainer \/>[\s\S]*areaGrid/);
  assert.ok(page.indexOf("heroWrap") < page.indexOf("<AreasExplainer"), "not in the first view");
});
