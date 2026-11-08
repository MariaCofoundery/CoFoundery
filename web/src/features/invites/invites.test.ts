import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { IN_APP_NOTICE_KINDS } from "@/features/notifications/inAppNotice";

/**
 * Hinweise bei Einladungen (20270328120000). Die Zuordnung zur Adresse und das Annehmen pruft die Datenbank
 * (pgTAP invite_notices); hier: Code und Texte halten sich daran.
 */
const read = (path: string) => readFileSync(path, "utf8");

test("drei neue Hinweisarten: Code, Datenbank und Texte in beiden Sprachen", () => {
  const kinds = ["advisor_org_invited", "advisor_person_invited", "founder_invited"];
  const sql = read("../supabase/migrations/20270328120000_invite_notices.sql");
  for (const kind of kinds) {
    assert.ok((IN_APP_NOTICE_KINDS as readonly string[]).includes(kind), kind);
    assert.match(sql, new RegExp(`'${kind}'`), kind);
    for (const locale of ["de", "en"]) assert.ok(JSON.parse(read(`messages/${locale}/notices.json`)).kinds[kind], `${locale} ${kind}`);
  }
});

test("der Hinweis geht nur an bestaetigte Adressen, nie an die einladende Person, und endet mit der Einladung", () => {
  const sql = read("../supabase/migrations/20270328120000_invite_notices.sql");
  assert.match(sql, /u\.email_confirmed_at is not null/);
  assert.match(sql, /u\.id is distinct from p_actor/);
  assert.match(sql, /create trigger drop_org_invite_notices after update of status/);
  assert.match(sql, /create trigger drop_founder_invite_notices after update of status on public\.invitations/);
  // Wer einlaedt, erfaehrt nichts ueber Konten: die Zuordnung steht nur in der Datenbank, nie in einer Antwort an die Einladenden.
  assert.doesNotMatch(read("src/features/advisor/orgActions.ts"), /list_my_invites|notify_invitee_by_email/);
});

test("Einladungen annehmen: ueber die Kennung, dieselbe Adresse wie beim Link, Ablehnen wird 'abgelehnt'", () => {
  const sql = read("../supabase/migrations/20270328120000_invite_notices.sql");
  assert.match(sql, /return public\.claim_advisor_org_invite\(v_hash\)/);
  assert.match(sql, /return public\.claim_advisor_person_invite\(v_hash\)/);
  assert.match(sql, /status = 'declined'/);
  const actions = read("src/features/invites/invitesActions.ts");
  assert.match(actions, /claim_advisor_org_invite_by_id/);
  assert.match(actions, /decline_my_invite/);
  const page = read("src/app/(product)/einladungen/page.tsx");
  assert.match(page, /acceptInviteAction/);
  assert.match(page, /declineInviteAction/);
  // Eine Bitte um Einblick gibt nichts frei - das steht im Text und die Freigabe bleibt unter Konto.
  assert.match(read("messages/de/invites.json"), /entscheidest du danach unter Konto/);
  assert.match(read("src/features/navigation/productChromePath.ts"), /pathname === "\/einladungen"/);
});

test("Texte der Einladungsseite in beiden Sprachen, dieselben Schluessel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  assert.deepEqual(keys(JSON.parse(read("messages/de/invites.json"))).sort(), keys(JSON.parse(read("messages/en/invites.json"))).sort());
});
