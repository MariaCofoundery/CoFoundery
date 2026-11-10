import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REC_TOPICS, cleanHttpsUrl, parseRecFilters } from "@/features/recommendations/recommendationsModel";

const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), "utf8");

test("Filter: unbekannte Werte fallen weg, Seite und Laenge sind begrenzt", () => {
  const f = parseRecFilters({ was: ["software", "unsinn"], thema: ["ki", "x"], wann: "7", seite: "999", suche: "a".repeat(200), sortieren: "alpha" });
  assert.deepEqual(f.kinds, ["software"]);
  assert.deepEqual(f.topics, ["ki"]);
  assert.equal(f.since, "");
  assert.equal(f.page, 50);
  assert.equal(f.q.length, 80);
  assert.equal(f.sort, "alpha");
});

test("Adresse: nur https", () => {
  assert.equal(cleanHttpsUrl("https://plausible.io"), "https://plausible.io");
  assert.equal(cleanHttpsUrl("http://x.de"), null);
  assert.equal(cleanHttpsUrl("javascript:alert(1)"), null);
  assert.equal(cleanHttpsUrl("https://a b.de"), null);
});

test("Seite: keine Sterne, keine Beliebtheit; Regeln Pflicht; Meldung zeigt dem Autor keinen Melder", () => {
  const page = read("app/(product)/connect/empfehlungen/page.tsx");
  assert.doesNotMatch(page.replace(/\/\*\*[\s\S]*?\*\//, ""), /Sterne|rating|score|popular/i);
  assert.match(page, /rel="noopener noreferrer nofollow ugc"/);
  const neu = read("app/(product)/connect/empfehlungen/neu/page.tsx");
  assert.match(neu, /name="guidelines"[^>]*required/);
  assert.match(read("features/recommendations/recommendationsActions.ts"), /p_guidelines: formData\.get\("guidelines"\) === "yes"/);
});

test("Pruefseite nur fuers Plattformteam und Entscheidung nur per RPC", () => {
  assert.match(read("app/(product)/admin/empfehlungen/page.tsx"), /requirePlatformAdmin\(\)/);
  assert.match(read("features/recommendations/recommendationsActions.ts"), /rpc\("admin_decide_recommendation"/);
});

test("Texte: alle Themen und Arten in beiden Sprachen", () => {
  for (const loc of ["de", "en"]) {
    const j = JSON.parse(read(`../messages/${loc}/connect.json`)).recommendations;
    for (const t of REC_TOPICS) assert.ok(j.topics[t], `${loc} topic ${t}`);
    for (const k of ["software", "person", "org", "project"]) assert.ok(j.kinds[k], `${loc} kind ${k}`);
    for (const s of ["pending_consent", "review", "published", "declined", "withdrawn", "removed"]) assert.ok(j.status[s], `${loc} status ${s}`);
  }
});
