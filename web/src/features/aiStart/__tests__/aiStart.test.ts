import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AI_ITEM_KEYS, clearedCount, flowCounts, isHttpsUrl, linksOf, stepsOf } from "@/features/aiStart/aiStartModel";

/**
 * KI-Checkliste (20270412120000): acht Fragen, Werkzeuge, Ablaeufe, Programmtipp. Die Regeln stehen in der Datenbank (pgTAP:
 * ai_checklist.sql); hier das Modell, die Trennung der Sichtbarkeiten und die Texte.
 */
const read = (path: string) => readFileSync(path, "utf8");
const sql = read("../supabase/migrations/20270412120000_ai_checklist.sql");

test("acht Fragen, gleich in Datenbank und Oberflaeche", () => {
  assert.equal(AI_ITEM_KEYS.length, 8);
  const match = sql.match(/item_key in \(([^)]*)\)/);
  assert.ok(match);
  assert.deepEqual(match[1].split(",").map((part) => part.trim().replaceAll("'", "")), [...AI_ITEM_KEYS]);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}/teams.json`));
    for (const key of AI_ITEM_KEYS) assert.ok(messages.aiStart.items[key].title && messages.aiStart.items[key].hint && messages.aiStart.items[key].placeholder, `${locale}: ${key}`);
  }
});

test("Zaehlen ohne Urteil: geklaert heisst erledigt oder nicht relevant; Ablaeufe in Schritten von Hand und automatisch", () => {
  assert.equal(clearedCount([{ key: "repeat", state: "done", note: null }, { key: "data", state: "skip", note: null }]), 2);
  assert.deepEqual(flowCounts([{ text: "a", who: "system", mode: "auto" }, { text: "b", who: null, mode: "hand" }, { text: "c", who: null, mode: "hand" }]), { hand: 2, auto: 1 });
  assert.deepEqual(stepsOf([{ text: " Eins ", who: "system", mode: "auto" }, { text: "", mode: "hand" }, 5]), [{ text: "Eins", who: "system", mode: "auto" }]);
});

test("Links nur mit https und Beschriftung", () => {
  assert.equal(isHttpsUrl("https://beispiel.de/x"), true);
  assert.equal(isHttpsUrl("http://beispiel.de"), false);
  assert.equal(isHttpsUrl("javascript:alert(1)"), false);
  assert.deepEqual(linksOf([{ label: "A", url: "https://a.de" }, { label: "B", url: "http://b.de" }, { label: "", url: "https://c.de" }]), [{ label: "A", url: "https://a.de" }]);
});

test("Das Team besitzt seine Angaben: nur Teammitglieder lesen, die Organisation bekommt nur den Tipp", () => {
  for (const table of ["team_ai_checklist_items", "team_ai_tools", "team_ai_flows"]) {
    assert.match(sql, new RegExp(`create policy \\w+ on public\\.${table} for select to authenticated using \\(public\\.is_current_user_founder_team_member\\(team_id\\)\\)`));
  }
  assert.doesNotMatch(sql, /advisor_org_ai_tip[^;]*team_ai_/);
  assert.match(sql, /org_has_right\(p_org_id, 'profile'\)/);
  assert.match(sql, /'\^https:\/\/\[\^ \]\+\$'/);
});

test("Oberflaeche: Seite im Team, Karte im Team-Start, Tipp beim Startup und in der Organisation", () => {
  assert.match(read("src/app/(product)/teams/[teamId]/page.tsx"), /href=\{`\/teams\/\$\{team64\}\/ki-start`\}/);
  assert.match(read("src/app/(product)/programm/page.tsx"), /<AiTipCards client=\{client\} \/>/);
  assert.match(read("src/app/(product)/advisor/organisation/page.tsx"), /canProfile \? <OrgAiTipForm/);
  // Kein KI-Aufruf: nichts davon spricht ein Modell an.
  for (const file of ["aiStartActions.ts", "aiStartData.ts", "AiStartView.tsx"]) assert.doesNotMatch(read(`src/features/aiStart/${file}`), /anthropic|openai|ollama|ai_jobs/i);
});

test("Texte in beiden Sprachen", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  assert.deepEqual(keys(JSON.parse(read("messages/de/teams.json")).aiStart).sort(), keys(JSON.parse(read("messages/en/teams.json")).aiStart).sort());
  assert.deepEqual(keys(JSON.parse(read("messages/de/advisor.json")).aiTip).sort(), keys(JSON.parse(read("messages/en/advisor.json")).aiTip).sort());
});
