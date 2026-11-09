import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BRAND_COLORS, BRAND_COLOR_STYLE, POST_STATUSES, isBrandColor, postOf } from "@/features/advisor/socialCalendarModel";
import { railWidthClass } from "@/features/navigation/useRailMode";

/**
 * Content-Planung (20270411120000): Marken, Saeulen, Formate, Standard, neue Felder am Beitrag, Aufgaben am Beitrag. Die Regeln
 * stehen in der Datenbank (pgTAP: content_planning.sql); hier die Oberflaeche und das Modell.
 */
const read = (path: string) => readFileSync(path, "utf8");
const sql = read("../supabase/migrations/20270411120000_content_planning.sql");

test("Stand: Idee, In Arbeit, Zur Freigabe, Freigegeben, Veroeffentlicht - Datenbank und Oberflaeche gleich", () => {
  assert.deepEqual([...POST_STATUSES], ["idea", "draft", "review", "planned", "published"]);
  assert.match(sql, /check \(status in \('idea', 'draft', 'review', 'planned', 'published'\)\)/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}/advisor.json`));
    for (const status of POST_STATUSES) assert.ok(messages.social.status[status], `${locale}: ${status}`);
  }
});

test("Marken haben feste Farben, jede mit Darstellung", () => {
  for (const color of BRAND_COLORS) assert.match(BRAND_COLOR_STYLE[color].hex, /^#[0-9A-F]{6}$/i);
  assert.equal(isBrandColor("pink"), false);
  assert.match(sql, /color in \('violet', 'sky', 'amber', 'emerald', 'rose', 'slate'\)/);
});

test("ein Beitrag kennt Marke, Saeule, Format, Link, Freigabe und offene Informationen", () => {
  const post = postOf({ id: "p", title: "T", planned_on: "2026-11-14", brand_id: "b", pillar_id: "s", format_id: "f", material_url: "https://canva.com/x", approver_user_id: "u", open_info: "Zitat" });
  assert.deepEqual([post.brandId, post.pillarId, post.formatId, post.materialUrl, post.approverUserId, post.openInfo], ["b", "s", "f", "https://canva.com/x", "u", "Zitat"]);
  assert.match(sql, /material_url ~ '\^https:\/\/'/);
});

test("Pflege nur mit dem Recht 'plan'; die Freigabe sperrt nichts; private Aufgaben bleiben privat", () => {
  assert.match(sql, /org_has_right\(p_org_id, 'plan'\)/);
  assert.match(sql, /private Aufgabe bleibt bei ihrer Person|v_task\.visibility <> 'team'/);
  assert.match(sql, /"Freigabe durch" ist nur eine Angabe, kein\s+-- Sperrmechanismus/);
});

test("Oberflaeche: Voreinstellung ist vorgewaehlt, Mehr Angaben klappt, Aufgaben speichern den Beitrag mit", () => {
  const sheet = read("src/features/advisor/calendar/PostSheet.tsx");
  assert.match(sheet, /defaults\?\.brandId/);
  assert.match(sheet, /<details open=\{moreOpen\}/);
  assert.match(sheet, /formAction=\{addPostTaskAction\}/);
  const actions = read("src/features/advisor/socialCalendarActions.ts");
  assert.match(actions, /export async function addPostTaskAction[\s\S]*persistPost\(client, formData\)[\s\S]*link_org_post_task/);
  assert.match(read("src/features/advisor/TeamraumScreen.tsx"), /query\.reiter !== "einstellungen"/);
  assert.match(read("src/features/advisor/calendar/CalendarScreen.tsx"), /borderLeft: `5px solid \$\{brandColor\}`/);
});

test("Texte in beiden Sprachen", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  const de = JSON.parse(read("messages/de/advisor.json")).social;
  const en = JSON.parse(read("messages/en/advisor.json")).social;
  assert.deepEqual(keys(de.settings).sort(), keys(en.settings).sort());
  assert.deepEqual(keys(de.form).sort(), keys(en.form).sort());
});

test("Seitenleiste: die Breiten stehen als ganze Klassen im Quelltext (Tailwind erzeugt nur, was ausgeschrieben ist)", () => {
  assert.equal(railWidthClass(false, "w-[248px]"), "min-[700px]:w-[72px] min-[1100px]:w-[248px]");
  assert.equal(railWidthClass(true, "w-[260px]"), "min-[700px]:w-[260px]");
  assert.doesNotMatch(read("src/features/navigation/useRailMode.ts"), /`min-\[(700|1100)px\]:\$\{/);
});
