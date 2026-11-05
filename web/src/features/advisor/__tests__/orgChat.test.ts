import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dayBreaks, mergeMessages, startsGroup, type ChatMessage } from "@/features/advisor/orgChatModel";

const msg = (id: string, createdAt: string, authorUserId = "a", body = "x"): ChatMessage => ({ id, chatId: "c", authorUserId, body, createdAt, retracted: false, attachment: null });

test("Chat: Nachrichten ohne Doppelte, zeitlich geordnet, Zuruecknahme ersetzt", () => {
  const merged = mergeMessages([msg("2", "2026-11-05T10:01:00Z"), msg("1", "2026-11-05T10:00:00Z")], [msg("3", "2026-11-05T10:02:00Z"), { ...msg("2", "2026-11-05T10:01:00Z"), body: "", retracted: true }]);
  assert.deepEqual(merged.map((m) => m.id), ["1", "2", "3"]);
  assert.equal(merged[1].retracted, true);
});

test("Chat: Tagestrenner und Gruppen derselben Person", () => {
  const list = [msg("1", "2026-11-04T10:00:00Z"), msg("2", "2026-11-05T10:00:00Z"), msg("3", "2026-11-05T10:03:00Z"), msg("4", "2026-11-05T10:20:00Z"), msg("5", "2026-11-05T10:21:00Z", "b")];
  assert.deepEqual([...dayBreaks(list, (iso) => iso.slice(0, 10))], [0, 1]);
  assert.deepEqual(list.map((_m, i) => startsGroup(list, i)), [true, true, false, true, true]);
});

test("Chat: nur Mitglieder, Echtzeit mit Zeilensicherheit, Mitteilung ohne Text, Feierabend gilt", () => {
  const sql = readFileSync("../supabase/migrations/20270318120000_org_team_chat.sql", "utf8");
  assert.match(sql, /public\.is_advisor_org_member\(c\.org_id\)\s+and \(c\.kind = 'team' or auth\.uid\(\) in \(c\.direct_a, c\.direct_b\)\)/);
  assert.match(sql, /alter publication supabase_realtime add table public\.advisor_org_chat_messages/);
  assert.match(sql, /revoke all on public\.advisor_org_chat_messages from anon, authenticated;/);
  assert.doesNotMatch(sql, /references auth\.users \(id\)(?! on delete (cascade|set null))/);
  const actions = readFileSync("src/features/advisor/orgChatActions.ts", "utf8");
  const push = actions.slice(actions.indexOf("async function pushChatMessage"));
  assert.match(push, /body: t\("body"\)/);
  assert.doesNotMatch(push, /body: text|\.body\b/);
  assert.match(push, /deliverPushToUser/);
  const thread = readFileSync("src/features/advisor/OrgChatThread.tsx", "utf8");
  assert.match(thread, /filter: `chat_id=eq\.\$\{chatId\}`/);
  assert.match(thread, /if \(live\) return;/);
  assert.doesNotMatch(thread, /dangerouslySetInnerHTML/);
  const page = readFileSync("src/app/(product)/advisor/organisation/chat/page.tsx", "utf8");
  assert.doesNotMatch(page, /mark_org_chat_read|markOrgChatRead/);
  const exported = readFileSync("src/features/account/accountExport.ts", "utf8");
  assert.match(exported, /table: "advisor_org_chat_messages", column: "author_user_id"/);
  assert.match(readFileSync("src/app/datenschutz/page.tsx", "utf8"), /Im Chat des Teamraums/);
});

test("Chat Stufe 2: Dateinamen sicher, Anhaenge nur ueber die geprueften Wege, Kontoloeschung raeumt auf", async () => {
  const { safeFileName, ATTACHMENT_TYPES, REACTIONS } = await import("@/features/advisor/orgChatModel");
  assert.equal(safeFileName("Prüfung Q4 / ../Plan.pdf"), "Prufung-Q4-.-Plan.pdf");
  assert.doesNotMatch(safeFileName("../../etc/passwd"), /\/|\.\./);
  assert.equal(safeFileName("..."), "datei");
  const sql = readFileSync("../supabase/migrations/20270321120000_org_chat_extras.sql", "utf8");
  // Dieselben Listen in Datenbank und App.
  for (const type of ATTACHMENT_TYPES) assert.ok(sql.includes(`'${type}'`), type);
  for (const emoji of REACTIONS) assert.ok(sql.includes(`'${emoji}'`), emoji);
  assert.match(sql, /<> auth\.uid\(\)::text \|\| '\/' \|\| v_chat\.org_id::text \|\| '\/' \|\| p_chat_id::text/);
  const route = readFileSync("src/app/api/org-chat-file/[messageId]/route.ts", "utf8");
  // Erst die normale Abfrage (Zeilensicherheit), dann der Dienstschluessel.
  assert.ok(route.indexOf('from("advisor_org_chat_messages")') < route.indexOf("orgChatStorageClient()"));
  assert.match(route, /createSignedUrl\(row\.attachment_path, 60/);
  const actions = readFileSync("src/features/advisor/orgChatActions.ts", "utf8");
  const prepare = actions.slice(actions.indexOf("export async function prepareOrgChatUpload"));
  assert.ok(prepare.indexOf('rpc("can_write_org_chat"') < prepare.indexOf("createSignedUploadUrl"));
  const deletion = readFileSync("src/features/account/deleteFounderAccount.ts", "utf8");
  assert.match(deletion, /const chatFileCleanup = await deleteOwnedChatFiles\(privileged, userId\);/);
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /badge: advisorChatUnread > 0 \? \(\{ kind: "chat", count: advisorChatUnread \} as const\) : undefined/);
});
