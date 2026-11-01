import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canCreateAccountFromPath, programEntryFromPath } from "@/features/auth/betaAccess";
import { buildAdvisorOrgInviteSubject } from "@/lib/email/sendAdvisorOrgInviteEmail";

const TOKEN = "0123456789abcdef".repeat(3);

test("Einladung in eine Organisation: der Pfad liefert nur den Hash zum Pruefen, er erlaubt nichts allein", () => {
  const entry = programEntryFromPath(`/invite/advisor-org/${TOKEN}`);
  assert.deepEqual(entry, { kind: "advisor-org", value: createHash("sha256").update(TOKEN).digest("hex") });
  assert.equal(canCreateAccountFromPath(`/invite/advisor-org/${TOKEN}`), false);
  // Falsche Form: kein Eintrag, also keine Anfrage und kein Konto.
  assert.equal(programEntryFromPath("/invite/advisor-org/zu-kurz"), null);
  assert.equal(programEntryFromPath(`/invite/advisor-org/${TOKEN}/mehr`), null);
  assert.equal(programEntryFromPath(`/dashboard?next=/invite/advisor-org/${TOKEN}`), null);
});

test("Anmeldeseite fragt die Datenbank, ob die Einladung offen ist, und sagt der Person, was sie tun soll", () => {
  const login = readFileSync("src/app/(product)/login/page.tsx", "utf8");
  assert.match(login, /is_valid_advisor_org_invite/);
  assert.match(login, /orgInviteHint/);
  const sql = readFileSync("../supabase/migrations/20270221120000_advisor_org_invite_valid_check.sql", "utf8");
  assert.match(sql, /i\.status = 'sent' and i\.expires_at > pg_catalog\.now\(\)/);
  assert.match(sql, /o\.status = 'active'/);
  for (const loc of ["de", "en"]) assert.match(readFileSync(`messages/${loc}/auth.json`, "utf8"), /"orgInviteHint"/);
});

test("Einladung an eine Kollegin hat eine eigene Mail, nicht die an eine begleitete Person", () => {
  const actions = readFileSync("src/features/advisor/orgActions.ts", "utf8");
  assert.match(actions, /sendAdvisorOrgInviteEmail/);
  assert.doesNotMatch(actions, /sendAdvisorPersonInviteEmail/);
  const mail = readFileSync("src/lib/email/sendAdvisorOrgInviteEmail.ts", "utf8");
  // Ohne den Kommentar am Dateianfang: der erklaert den Unterschied und darf die Woerter nennen.
  assert.doesNotMatch(mail.replace(/\/\*\*[\s\S]*?\*\//, ""), /Founderprofil|Zugang zu Teilen/);
  assert.match(mail, /genau dieser E-Mail-Adresse/);
  assert.equal(buildAdvisorOrgInviteSubject({ orgName: "Nord Accelerator", inviterName: "Maria" }), "Maria lädt dich zu Nord Accelerator bei MADE2FOUND ein".replace("MADE2FOUND", subjectBrand()));
  assert.equal(buildAdvisorOrgInviteSubject({ orgName: "Nord Accelerator", inviterName: null }), "Einladung zu Nord Accelerator bei " + subjectBrand());
});

test("Nach dem Beitritt landet man in der Organisation, der man beigetreten ist, im Reiter Mitglieder", () => {
  const page = readFileSync("src/app/(product)/invite/advisor-org/[token]/page.tsx", "utf8");
  assert.match(page, /successFor\(joinedOrg\)/);
  assert.match(page, /tab=members/);
  // Beitreten bleibt eine Entscheidung auf Klick, kein Seitenaufruf.
  assert.match(page, /claim_advisor_org_invite/);
  assert.match(page, /joinAction/);
});

function subjectBrand() {
  return buildAdvisorOrgInviteSubject({ orgName: "X", inviterName: null }).replace("Einladung zu X bei ", "");
}

test("Mitglieder-Reiter zeigt offene Einladungen, nur fuer Mitglieder, ohne Link und ohne Token", () => {
  const data = readFileSync("src/features/advisor/orgData.ts", "utf8");
  assert.match(data, /eq\("status", "sent"\)/);
  assert.doesNotMatch(data.slice(data.indexOf("getOrgOpenInvites")), /token_hash/);
  const ui = readFileSync("src/features/advisor/AdvisorOrgSection.tsx", "utf8");
  assert.match(ui, /openInvitesTitle/);
  const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  assert.match(page, /openInvites=\{openInvites\}/);
});
