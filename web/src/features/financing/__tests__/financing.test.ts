import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FINANCING_AGREEMENT_TOPICS,
  FINANCING_AREAS,
  FINANCING_ITEMS,
  FINANCING_ITEM_KEYS,
  FINANCING_PREP_QUESTIONS,
  FINANCING_STATUSES,
  financingViewFrom,
  isFinancingItemKey,
  isFinancingStatus,
  nextFinancingStatus,
} from "@/features/financing/financingModel";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";

const source = (path: string) => readFileSync(path, "utf8");
type FinancingCopy = {
  items: Record<string, { title?: string }>;
  areas: Record<string, { title?: string }>;
  topicQuestions: Record<string, { q1?: string; q2?: string }>;
  prep: Record<string, string>;
  hero: { guide: { intro: string } };
  disclaimer: string;
  sources: string;
};
const teams = (locale: string) => JSON.parse(source(`messages/${locale}/teams.json`)).financing as FinancingCopy;
const sql = source("../supabase/migrations/20270108120000_team_financing_checklist.sql")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*--.*$/gm, "");

test("Wegweiser: vier Status, der Klick geht reihum, Unbekanntes wird abgelehnt", () => {
  assert.deepEqual([...FINANCING_STATUSES], ["open", "progress", "done", "na"]);
  assert.equal(nextFinancingStatus("open"), "progress");
  assert.equal(nextFinancingStatus("na"), "open");
  assert.equal(isFinancingStatus("score"), false);
  assert.equal(isFinancingItemKey("invented"), false);
  assert.equal(financingViewFrom("prep"), "prep");
  assert.equal(financingViewFrom("x"), "guide");
});

test("Wegweiser: die Punkte im Code und die CHECK-Liste in der Datenbank sind dieselben", () => {
  const block = sql.slice(sql.indexOf("team_financing_items_key_check"), sql.indexOf("))", sql.indexOf("team_financing_items_key_check")));
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual([...FINANCING_ITEM_KEYS].sort(), inDatabase);
  assert.equal(new Set(FINANCING_ITEM_KEYS).size, FINANCING_ITEM_KEYS.length);
  assert.ok(FINANCING_ITEMS.every((item) => FINANCING_AREAS.includes(item.area)));
  for (const item of FINANCING_ITEMS) if (item.setupTopic) assert.ok(FOUNDER_SETUP_ITEM_KEYS.includes(item.setupTopic), `${item.key}: unbekanntes Setup-Thema`);
  for (const key of FINANCING_AGREEMENT_TOPICS) assert.ok(FOUNDER_SETUP_ITEM_KEYS.includes(key), `${key} fehlt im Katalog`);
});

test("Wegweiser: Texte in beiden Sprachen vollstaendig, ohne Wertung und ohne Empfehlung", () => {
  for (const locale of ["de", "en"]) {
    const t = teams(locale);
    for (const item of FINANCING_ITEMS) assert.ok(t.items[item.key]?.title, `${locale}: ${item.key} ohne Text`);
    for (const area of FINANCING_AREAS) assert.ok(t.areas[area]?.title, `${locale}: Bereich ${area} ohne Text`);
    for (const key of FINANCING_AGREEMENT_TOPICS) assert.ok(t.topicQuestions[key]?.q1 && t.topicQuestions[key]?.q2, `${locale}: Fragen zu ${key} fehlen`);
    for (const key of FINANCING_PREP_QUESTIONS) assert.ok(t.prep[key], `${locale}: Frage ${key} fehlt`);
    const all = JSON.stringify(t);
    assert.doesNotMatch(all, /Score|Punktzahl|Prozent|Ampel|Readiness-Zahl|\d+ ?%|percent|traffic light/i, `${locale}: Wertung im Text`);
    // Die Seite sagt ausdruecklich, was sie nicht tut.
    assert.match(t.hero.guide.intro, locale === "de" ? /bewertet euer Team nicht und empfiehlt keine Investoren/ : /does not assess your team and does not recommend investors/);
    assert.match(t.disclaimer, locale === "de" ? /Keine Rechts-, Steuer- oder Anlageberatung/ : /Not legal, tax or investment advice/);
    // Die Quelle sagt nicht mehr, als sie traegt.
    assert.match(t.sources, /889/);
    assert.match(t.sources, locale === "de" ? /sagt nichts darüber/ : /says nothing about/);
  }
});

test("Wegweiser: nur Mitglieder lesen und aendern, ohne Summe oder Balken in der Oberflaeche", () => {
  assert.match(sql, /is_current_user_founder_team_member\(team_id\)/);
  assert.match(sql, /revoke all on public\.team_financing_items from public, anon, authenticated/);
  assert.match(sql, /grant select on public\.team_financing_items to authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)/i);
  const page = source("src/app/(product)/teams/[teamId]/finanzierung/page.tsx");
  assert.doesNotMatch(page, /reduce\(|percent|Math\.round|width:|progress/i);
  assert.match(page, /getFounderSetup\(teamId, user\.id, supabase\)/);
  const actions = source("src/features/financing/financingActions.ts");
  assert.match(actions, /rpc\("set_team_financing_item"/);
  assert.doesNotMatch(actions, /\.from\("team_financing_items"\)/);
});
