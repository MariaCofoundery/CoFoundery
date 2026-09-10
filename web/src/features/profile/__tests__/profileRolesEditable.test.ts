import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PROFILE_ROLE_OPTIONS } from "@/features/profile/profileRoles";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const PAGE = "src/app/(product)/profile/page.tsx";
const ACTIONS = "src/features/profile/personCoreActions.ts";

test("the role list in the action matches the one in the vocabulary", () => {
  const actions = source(ACTIONS);
  // Zwei Listen, die auseinanderlaufen koennen: Die Oberflaeche wuerde eine
  // Rolle anbieten, die die Action verwirft - und das Speichern waere still
  // ohne Wirkung.
  const declared = actions.match(/const PROFILE_ROLES: string\[\] = \[([^\]]+)\]/)?.[1] ?? "";
  const parsed = declared.split(",").map((value) => value.trim().replace(/"/g, "")).filter(Boolean);
  assert.deepEqual(parsed.sort(), [...PROFILE_ROLE_OPTIONS].sort());
});

test("nobody can lock themselves out by unchecking everything", () => {
  const actions = source(ACTIONS);
  // Ohne Rolle greift die Weiche in resolveProductEntryPath nicht mehr; die
  // Person landet auf /start statt in ihrem Produkt.
  assert.match(actions, /if \(roles\.length === 0\)/);
  assert.match(actions, /error=roles/);

  const entry = source("src/features/auth/productEntry.ts");
  assert.match(entry, /if \(!hasFounder && !hasAdvisor\) return "\/start"/, "die Weiche, um die es geht");

  for (const locale of ["de", "en"]) {
    const errors = readJson(`messages/${locale}/capability.json`).errors as Record<string, string>;
    assert.ok(errors.roles, `${locale}: errors.roles fehlt`);
  }
  // Ohne Eintrag in der Allowlist wuerde next-intl bei diesem Fehler werfen
  // und die Seite mit 500 beenden.
  assert.match(source(PAGE), /const ERROR_KEYS = \[[^\]]*"roles"/);
});

test("saving a form without the roles section leaves the roles alone", () => {
  const actions = source(ACTIONS);
  // Sonst wuerde jedes andere Speichern auf der Seite die Rollen leeren -
  // und der Schutz oben wuerde stattdessen einen Fehler zeigen.
  assert.match(actions, /if \(!formData\.has\("roles"\)\) return;/);
});

test("the section is hidden for people who have no such role yet", () => {
  const page = source(PAGE);
  // Einem Connect-Konto hier "Founder" anzubieten waere eine
  // Selbstfreischaltung ins Founder-Produkt - eine Produktentscheidung, kein
  // Formularfeld.
  assert.match(page, /\{currentRoles\.length > 0 \? \(/);
});

test("roles stay a navigation hint, not an authorisation", () => {
  // Der Grund, warum das Feld ueberhaupt aenderbar sein darf: Die
  // Advisor-Daten haengen an RLS ueber advisor_user_id, nicht an dieser
  // Angabe. Ein Haken zeigt ein leeres Advisor-Dashboard, keine fremden Daten.
  const policy = source("../supabase/migrations/20260419143000_create_relationship_advisors.sql");
  assert.match(policy, /advisor_user_id = auth\.uid\(\)/);

  const roleData = source("src/features/dashboard/dashboardRoleData.ts");
  assert.match(roleData, /\.eq\("advisor_user_id", userId\)/);

  // Und die Oberflaeche sagt es der Person auch.
  const de = (readJson("messages/de/capability.json").identity as Record<string, string>);
  assert.match(de.rolesHint, /nicht, worauf du Zugriff hast/);
});

test("both locales carry a label for every role that can be offered", () => {
  for (const locale of ["de", "en"]) {
    const identity = readJson(`messages/${locale}/capability.json`).identity as Record<string, unknown>;
    const labels = identity.roles as Record<string, string>;
    assert.ok(identity.rolesLegend, `${locale}: rolesLegend fehlt`);
    for (const role of PROFILE_ROLE_OPTIONS) {
      assert.ok(labels?.[role], `${locale}: identity.roles.${role} fehlt`);
    }
  }
});
