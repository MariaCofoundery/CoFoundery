import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("eine eigene Nachricht laesst sich zuruecknehmen - der Text wird geloescht, nicht nur ausgeblendet", () => {
  const sql = source("../supabase/migrations/20261230120000_retract_network_message.sql");
  assert.match(sql, /set body = '', retracted_at = now\(\)/);
  assert.match(sql, /m\.sender_user_id = v_user_id/);
  // Nur die sendende Person, und eine fremde oder unbekannte Nachricht bekommt dieselbe Antwort.
  assert.match(sql, /message_not_found/);
  assert.match(sql, /grant execute on function public\.retract_network_message\(uuid\) to authenticated/);
  const action = source("src/features/connect/connectActions.ts");
  assert.match(action, /rpc\("retract_network_message"/);
  const page = source("src/app/(product)/messages/[conversationId]/page.tsx");
  assert.match(page, /message\.body === ""/);
  assert.match(page, /messages\.retracted/);
  assert.match(page, /own && !retracted/, "nur die eigene, noch nicht zurueckgenommene Nachricht bekommt den Knopf");
});

test("die Texte zum Zuruecknehmen gibt es auf Deutsch und Englisch", () => {
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(source(`messages/${locale}/connect.json`)).messages;
    for (const key of ["retracted", "retract", "retractConfirm", "retractAction"]) {
      assert.ok(String(messages[key] ?? "").length > 3, `${locale}: ${key} fehlt`);
    }
  }
});
