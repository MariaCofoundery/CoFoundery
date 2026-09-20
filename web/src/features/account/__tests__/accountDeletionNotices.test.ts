import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ACCOUNT_DELETION_NOTICE_CONTEXTS } from "@/features/account/accountDeletionNotices";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261013120000_account_deletion_notices.sql";
const DATA = "src/features/account/accountDeletionNotices.ts";
const LIST = "src/features/account/AccountDeletionNoticeList.tsx";

/**
 * Was zurueckbleibt, wenn jemand geht.
 *
 * BESPROCHEN AM 20.09.2026. Bis dahin verschwanden Einladung, Beziehung,
 * Report und Workbook wortlos - bei der zurueckbleibenden Person genauso wie
 * bei der gehenden. In Connect gab es den Hinweis laengst, in Align nichts.
 */

test("der Hinweis enthaelt nichts ueber die Person, die gegangen ist", () => {
  // DAS IST DIE ZUSAGE, an der alles andere haengt: Ein Hinweis, der jemanden
  // benennt, waere ein Datensatz ueber einen Menschen, der gerade darum
  // gebeten hat, keiner mehr zu sein. Die Spalten sind diese Zusage.
  const migration = sqlCodeOnly(MIGRATION);
  const table = migration.slice(
    migration.indexOf("create table public.account_deletion_notices"),
    migration.indexOf(");", migration.indexOf("create table public.account_deletion_notices"))
  );
  assert.ok(table.length > 0);
  for (const forbidden of ["name", "email", "display", "deleted_user", "subject_user"]) {
    assert.doesNotMatch(
      table,
      new RegExp(`\\b${forbidden}`, "i"),
      `die Tabelle traegt eine Spalte mit "${forbidden}"`
    );
  }
  // Empfaenger, Rolle, Zeitpunkt - mehr nicht.
  assert.match(table, /recipient_user_id/);
  assert.match(table, /context text not null/);
  assert.match(table, /created_at/);

  // Auch die Anzeige nennt niemanden.
  const list = codeOnly(LIST);
  assert.doesNotMatch(list, /displayName|senderName|counterpart/);
});

test("geschrieben wird nur beim Loeschen eines Kontos", () => {
  // Eine Beziehung kann aus anderen Gruenden verschwinden. Stuende der Hinweis
  // dann auch da, behauptete er etwas, das nicht stimmt - und niemand koennte
  // es nachpruefen.
  const migration = sqlCodeOnly(MIGRATION);
  const guards = migration.match(/current_setting\('app\.allow_account_cleanup', true\)/g) ?? [];
  assert.equal(guards.length, 2, "beide Trigger muessen die Bedingung tragen");

  // Und niemand kann sich selbst einen schreiben.
  assert.doesNotMatch(migration, /for insert to authenticated/);
  assert.match(migration, /for select to authenticated/);
  assert.match(migration, /for delete to authenticated/);
});

test("ein Ereignis, ein Hinweis - auch wenn zwei Tabellen betroffen sind", () => {
  // Beim Loeschen eines Founders verschwinden die Advisor-Zeilen MIT der
  // Beziehung. Ohne diese Bedingung bekaemen die Founder zusaetzlich "dein
  // Advisor hat sein Konto geloescht" - fuer ein Ereignis, das es nicht gab.
  const migration = sqlCodeOnly(MIGRATION);
  const advisorTrigger = migration.slice(
    migration.indexOf("record_account_deletion_notice_for_advisor_link")
  );
  assert.match(advisorTrigger, /from public\.relationships relationship/);
  assert.match(advisorTrigger, /where relationship\.id = old\.relationship_id/);
  // Eine schon widerrufene Freigabe endet nicht noch einmal.
  assert.match(advisorTrigger, /old\.status = 'revoked'/);
});

test("die gehende Person bekommt ihre Zeile mit - und sie geht mit ihr", () => {
  // Der Trigger muss nicht entscheiden, wer von beiden geht: Er schreibt fuer
  // beide, und die Zeile der gehenden Person faellt mit dem Konto weg. Eine
  // Entscheidung, die nicht getroffen wird, kann auch nicht falsch ausfallen.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /values \(old\.user_a_id\), \(old\.user_b_id\)/);
  assert.match(migration, /references auth\.users \(id\) on delete cascade/);
});

test("jeder Zustand steht an der Stelle, an der etwas fehlt", () => {
  // Ein Hinweis an einer anderen Stelle als der, an der etwas verschwunden
  // ist, wird nicht gefunden.
  const connections = codeOnly("src/app/(product)/connections/page.tsx");
  assert.match(connections, /getAccountDeletionNotices\(supabase, \["founder_connection", "founder_advisor"\]\)/);
  assert.match(connections, /<AccountDeletionNoticeList notices=/);

  const advisor = codeOnly("src/app/(product)/advisor/dashboard/page.tsx");
  assert.match(advisor, /getAccountDeletionNotices\(client, \["advisor_team"\]\)/);
  assert.match(advisor, /<AccountDeletionNoticeList notices=/);
  // Der Advisor-Bereich zeigt nicht, was die eigenen Verbindungen angeht.
  assert.doesNotMatch(advisor, /"founder_connection"/);
});

test("jede Rolle wird in beiden Sprachen erklaert - mit der Folge, nicht nur dem Ereignis", () => {
  // Wer liest, dass jemand sein Konto geloescht hat, fragt als naechstes, wo
  // der gemeinsame Report geblieben ist. Steht das nicht da, ist der Hinweis
  // nur der Anfang einer Suche.
  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        account: { deletionNotices?: Record<string, { title?: string; text?: string } | string> };
      }
    ).account.deletionNotices;
    assert.ok(copy, `${locale}: account.deletionNotices fehlt`);

    for (const context of ACCOUNT_DELETION_NOTICE_CONTEXTS) {
      const entry = copy[context] as { title?: string; text?: string } | undefined;
      assert.ok(entry?.title, `${locale}: ${context}.title fehlt`);
      assert.ok(entry?.text, `${locale}: ${context}.text fehlt`);
      assert.ok(
        (entry.text ?? "").length > 90,
        `${locale}: ${context}.text sagt nicht, was die Loeschung bedeutet`
      );
    }
    assert.ok(copy.dismiss, `${locale}: dismiss fehlt`);
  }
});

test("die Liste im Code und die Werte in der Datenbank sind dieselben", () => {
  const migration = sqlCodeOnly(MIGRATION);
  const block = migration.slice(
    migration.indexOf("account_deletion_notices_context_check"),
    migration.indexOf("))", migration.indexOf("account_deletion_notices_context_check"))
  );
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual([...ACCOUNT_DELETION_NOTICE_CONTEXTS].sort(), inDatabase);
});

test("ein ausgefallener Hinweis nimmt die Seite nicht mit", () => {
  // Er ist eine Beigabe. Die Verbindungen und die Team-Liste sind es nicht.
  assert.match(codeOnly(DATA), /if \(error \|\| !data\) return \[\];/);
});
