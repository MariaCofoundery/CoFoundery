import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DISCOVERY_ROLE_LEGACY_MAP,
  DISCOVERY_ROLE_PART_IDS,
  DISCOVERY_VISIBLE_ROLES,
  isDiscoveryRolePartId,
} from "@/features/discovery/discoveryConfig";
import { discoveryRolePartLabels } from "@/features/discovery/discoveryPresentation";
import { normalizeDiscoveryProfileInput } from "@/features/discovery/discoveryValidation";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("Kennung und Beschriftung stehen in derselben Reihenfolge, deutsch und englisch", () => {
  for (const locale of ["de", "en"]) {
    const d = JSON.parse(readFileSync(`messages/${locale}/discovery.json`, "utf8")) as {
      roleHelp: Record<string, { parts: string }>;
    };
    for (const [role, ids] of Object.entries(DISCOVERY_ROLE_PART_IDS)) {
      assert.equal(d.roleHelp[role].parts.split(" | ").length, ids.length, `${locale}: ${role} hat andere Anzahl`);
    }
  }
});

test("nur bekannte Kennungen sind gültig", () => {
  assert.equal(isDiscoveryRolePartId("product.discovery"), true);
  assert.equal(isDiscoveryRolePartId("product.gibtsnicht"), false);
  assert.equal(isDiscoveryRolePartId("other.x"), false);
  assert.equal(isDiscoveryRolePartId("product"), false);
  assert.equal(isDiscoveryRolePartId("product.discovery.extra"), false);
  assert.equal(isDiscoveryRolePartId(42), false);
});

test("Unterbereiche gelten nur zu gewählten Schwerpunkten und werden begrenzt", () => {
  const input = {
    ownRoles: ["product"],
    seekingRoles: ["tech", "sales"],
    ownRoleParts: ["product.discovery", "tech.software", "product.ux", "product.ux", "quatsch"],
    seekingRoleParts: ["tech.ai", "design.ux"],
  };
  const out = normalizeDiscoveryProfileInput(input);
  assert.deepEqual(out.ownRoleParts, ["product.discovery", "product.ux"]);
  assert.deepEqual(out.seekingRoleParts, ["tech.ai"]);
  // Wer den Schwerpunkt abwählt, verliert die Unterbereiche.
  assert.deepEqual(normalizeDiscoveryProfileInput({ ...input, ownRoles: ["tech"] }).ownRoleParts, ["tech.software"]);
  // Ein einzelner Wert (Formular mit einem Haken) kommt als Text an.
  assert.deepEqual(normalizeDiscoveryProfileInput({ ownRoles: ["product"], ownRoleParts: "product.ux" }).ownRoleParts, ["product.ux"]);
  const many = Object.entries(DISCOVERY_ROLE_PART_IDS).flatMap(([r, ids]) => ids.map((i) => `${r}.${i}`));
  const limited = normalizeDiscoveryProfileInput({ ownRoles: ["tech", "product", "sales"], ownRoleParts: many });
  assert.ok(limited.ownRoleParts.length <= 16);
});

test("Beschriftungen werden aus der Sprachdatei gelesen, Unbekanntes fällt weg", () => {
  const labels = discoveryRolePartLabels(["product.discovery", "product.ux", "nope.x"], () => "A | B | C | D | E");
  assert.deepEqual(labels, ["A", "D"]);
});

test("neun Schwerpunkte plus „Anderer“; die alte Auswahl wird auf Marketing gelegt", () => {
  assert.equal(DISCOVERY_VISIBLE_ROLES.length, 10);
  assert.ok(!(DISCOVERY_VISIBLE_ROLES as readonly string[]).includes("growth"));
  assert.ok(!(DISCOVERY_VISIBLE_ROLES as readonly string[]).includes("community"));
  assert.equal(DISCOVERY_ROLE_LEGACY_MAP.growth, "marketing");
  assert.equal(DISCOVERY_ROLE_LEGACY_MAP.community, "marketing");
});

test("die Unterbereiche werden aus dem Formular gelesen und gespeichert, nie aus den Fähigkeiten", () => {
  const actions = code("src/features/discovery/discoveryActions.ts");
  assert.match(actions, /ownRoleParts: getStringList\(formData, \["ownRolePart"/);
  const data = code("src/features/discovery/discoveryData.ts");
  assert.match(data, /own_role_parts: normalized\.ownRoleParts/);
  // Keine Übernahme aus den Fähigkeiten, weder in der Validierung noch beim Speichern.
  assert.doesNotMatch(data + code("src/features/discovery/discoveryValidation.ts"), /person_capability_entries/);
});

test("das Formular speichert Kennungen, nur zu gewählten Schwerpunkten", () => {
  const field = code("src/features/discovery/DiscoveryRoleField.tsx");
  assert.match(field, /type="hidden" name=\{partName\} value=\{id\}/);
  assert.match(field, /selected\.includes\(id\.split\("\."\)\[0\]/);
  // Abwählen entfernt die Unterbereiche, und es ist immer nur einer offen.
  assert.match(field, /startsWith\(`\$\{value\}\.`\)/);
  assert.match(field, /aria-expanded=\{openOne === option\.value\}/);
});
