import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ITEM_PATTERN, buildPageTree, parentOptions, parsePageBlocks, subtreeHeight, type OrgPageSummary } from "@/features/advisor/teamraumPageModel";

const page = (id: string, parentId: string | null, title = id, isTemplate = false): OrgPageSummary => ({
  id,
  parentId,
  title,
  isTemplate,
  visibility: "team",
  eventId: null,
  createdByUserId: null,
  updatedByUserId: null,
  updatedAt: "2026-11-05T10:00:00Z",
});

test("Seiten: der Text wird zu Ueberschriften, Listen, Absaetzen und gezaehlten Haekchen-Zeilen", () => {
  const blocks = parsePageBlocks("# Demo Day\nWas bis dahin stehen muss.\nZweite Zeile.\n\n## Vorher\n[x] Termin\n- [ ] Raum bestaetigen\n[ ] \n[ ] Jury\n- Einlass ab 17 Uhr\n- Pitches");
  assert.deepEqual(blocks, [
    { kind: "heading", level: 1, text: "Demo Day" },
    { kind: "paragraph", text: "Was bis dahin stehen muss.\nZweite Zeile." },
    { kind: "heading", level: 2, text: "Vorher" },
    { kind: "item", index: 0, text: "Termin", done: true },
    { kind: "item", index: 1, text: "Raum bestaetigen", done: false },
    // Eine leere Haekchen-Zeile zaehlt mit - die Datenbank zaehlt sie auch.
    { kind: "item", index: 2, text: "", done: false },
    { kind: "item", index: 3, text: "Jury", done: false },
    { kind: "bullets", items: ["Einlass ab 17 Uhr", "Pitches"] },
  ]);
  assert.deepEqual(parsePageBlocks(""), []);
});

test("Seiten: dieselbe Regel fuer Haekchen-Zeilen wie in der Datenbank", () => {
  const sql = readFileSync("../supabase/migrations/20270313120000_org_teamraum_pages.sql", "utf8");
  assert.match(sql, /p_line ~ '\^\\s\*\(-\\s\*\)\?\\\[\( \|x\|X\)\\\]'/);
  assert.equal(ITEM_PATTERN.source, "^\\s*(-\\s*)?\\[( |x|X)\\]");
});

test("Seiten: Baum nach Titel, Vorlagen gesondert, hoechstens drei Ebenen beim Verschieben", () => {
  const pages = [page("b", null, "B"), page("a", null, "A"), page("a2", "a", "Zwei"), page("a1", "a", "Eins"), page("a1x", "a1", "Tief"), page("tpl", null, "Vorlage", true), page("lost", "tpl", "Unter Vorlage")];
  const tree = buildPageTree(pages);
  assert.deepEqual(tree.map((entry) => `${entry.depth}:${entry.id}`), ["1:a", "2:a1", "3:a1x", "2:a2", "1:b", "1:lost"]);
  assert.equal(subtreeHeight(tree, "a"), 3);
  // "a" darf nirgends hin ausser oben; "b" (ohne Unterseiten) unter Ebene 1 und 2.
  assert.deepEqual(parentOptions(tree, "a", subtreeHeight(tree, "a")).map((entry) => entry.id), []);
  assert.deepEqual(parentOptions(tree, "b", 1).map((entry) => entry.id), ["a", "a1", "a2", "lost"]);
  // Nie unter sich selbst oder die eigenen Unterseiten.
  assert.ok(!parentOptions(tree, "a1", 2).some((entry) => entry.id === "a1" || entry.id === "a1x"));
});

test("Seiten: nur fuer Mitglieder, niemand ueberschreibt still, Seite und Board ziehen mit", () => {
  const sql = readFileSync("../supabase/migrations/20270313120000_org_teamraum_pages.sql", "utf8");
  assert.match(sql, /revoke all on public\.advisor_org_pages from anon, authenticated;/);
  assert.match(sql, /using \(public\.is_advisor_org_member\(org_id\)\)/);
  assert.match(sql, /p_expected_updated_at is distinct from v_old\.updated_at[\s\S]*org_page_changed/);
  assert.match(sql, /after update of status on public\.advisor_org_tasks/);
  assert.doesNotMatch(sql, /references auth\.users \(id\)(?! on delete (cascade|set null))/);
  const ui = readFileSync("src/features/advisor/TeamraumPages.tsx", "utf8");
  assert.match(ui, /<input type="hidden" name="expected" value=\{page\.updatedAt\} \/>/);
  assert.match(ui, /<PageDraftKeeper/);
  // Seitentext wird nur ueber UserText ausgegeben, nie als HTML.
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML/);
  const keeper = readFileSync("src/features/advisor/PageDraftKeeper.tsx", "utf8");
  assert.match(keeper, /try \{[\s\S]*sessionStorage/);
  const actions = readFileSync("src/features/advisor/teamraumActions.ts", "utf8");
  for (const rpc of ["save_org_page", "delete_org_page", "check_org_page_item", "create_org_task_from_page_item"]) assert.match(actions, new RegExp(`rpc\\("${rpc}"`));
  const exported = readFileSync("src/features/account/accountExport.ts", "utf8");
  assert.match(exported, /table: "advisor_org_pages", column: "created_by_user_id"/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    for (const key of ["event", "meeting", "onboarding"]) assert.ok(messages.teamraum.pages.templates[key].body.includes("[ ]"), `${locale} ${key}`);
  }
});

test("Eigene Notizen: privat in der Datenbank, gesondert im Baum, teilen nur durch die Verfasserin", () => {
  const sql = readFileSync("../supabase/migrations/20270315120000_org_private_notes.sql", "utf8");
  assert.match(sql, /and \(visibility = 'team' or created_by_user_id = auth\.uid\(\)\)/);
  assert.match(sql, /v_page\.created_by_user_id is distinct from auth\.uid\(\)/);
  // Auch die Fuehrung loescht eine fremde Notiz nicht.
  assert.match(sql, /v_page\.visibility = 'team' and public\.is_advisor_org_owner_of/);
  const tree = buildPageTree([page("n", null, "Notiz"), { ...page("p", null, "Privat"), visibility: "private" }]);
  assert.deepEqual(tree.map((entry) => entry.id), ["n"]);
  const ui = readFileSync("src/features/advisor/TeamraumPages.tsx", "utf8");
  assert.match(ui, /page\.createdByUserId === ctx\.me && \(page\.visibility === "private" \|\| children\.length === 0\)/);
  assert.match(readFileSync("src/app/datenschutz/page.tsx", "utf8"), /Eigene Notizen sieht nur, wer sie schreibt/);
});
