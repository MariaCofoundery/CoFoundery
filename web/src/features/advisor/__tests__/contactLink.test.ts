import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SIMPLE_EMAIL, contactHref } from "@/features/advisor/contactLink";
import { feedbackPathIsLinkable } from "@/features/feedback/feedbackModel";

test("ein Kontakt wird nur zum Link, wenn er schlicht ist", () => {
  assert.equal(contactHref("pia@beispiel.de"), "mailto:pia@beispiel.de");
  assert.equal(contactHref("pia.b+programm@sub.beispiel.de"), "mailto:pia.b+programm@sub.beispiel.de");
  assert.equal(contactHref("https://beispiel.de/pia"), "https://beispiel.de/pia");
  // Header-Einschleusung: `?` und `&` in einer Adresse, auch URL-kodiertes @ für den Empfänger.
  for (const bad of ["a@b.de?bcc=x%40y.de", "a@b.de?subject=Hallo&body=Klick", "a@b.de&cc=x", "a b@c.de", "a@b", "javascript:alert(1)", "http://unsicher.de", "https://a b", "mailto:a@b.de", "a@b.de\n"]) {
    assert.equal(contactHref(bad), null, bad);
  }
  assert.equal(SIMPLE_EMAIL.test("x@y.de"), true);
});

test("die Seite im Feedback wird nur verlinkt, wenn sie wirklich eine Seite dieser App ist", () => {
  assert.equal(feedbackPathIsLinkable("/connect/people"), true);
  for (const bad of ["//evil.example/x", "/\\evil", "/teams/:id/setup", "https://evil.example", "javascript:alert(1)", "", null]) {
    assert.equal(feedbackPathIsLinkable(bad as string | null), false, String(bad));
  }
});

test("Admin und Startups benutzen diese Prüfung statt eigener", () => {
  assert.match(readFileSync("src/features/admin/AdminFeedbackPanel.tsx", "utf8"), /SIMPLE_EMAIL\.test\(selected\.contact_email\)/);
  assert.match(readFileSync("src/features/advisor/ProgramPeople.tsx", "utf8"), /contactHref/);
  assert.doesNotMatch(readFileSync("src/features/advisor/ProgramPeople.tsx", "utf8"), /\^\[\^\\s@\]\+@/);
});

test("Nachbesserungen der Sicherheitsdurchsicht: Ansprechpersonen nur mit aktiver Mitgliedschaft, Feedback-Seite und Rechte", () => {
  const sql = readFileSync("../supabase/migrations/20270406120000_security_followups.sql", "utf8");
  assert.match(sql, /c\.advisor_user_id = auth\.uid\(\) and public\.is_advisor_org_member\(p\.org_id\)/);
  assert.match(sql, /delete from public\.team_program_contacts c\s+using public\.team_programs p\s+where p\.id = c\.program_id and p\.org_id = v_org and c\.advisor_user_id = v_user/);
  assert.match(sql, /page_path ~ '\^\/\[a-z0-9:_-\]\+\(\/\[a-z0-9:_-\]\+\)\*\$'\) not valid/);
  assert.match(sql, /revoke all on public\.product_feedback from anon, authenticated/);
  assert.match(sql, /grant select, insert on public\.product_feedback to authenticated/);
  assert.match(sql, /product_feedback_select_own[\s\S]*user_id = auth\.uid\(\)/);
});
