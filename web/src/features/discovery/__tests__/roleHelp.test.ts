import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

test("jeder Schwerpunkt außer „Anderer“ hat Erklärung und Unterbereiche, deutsch und englisch", () => {
  for (const locale of ["de", "en"]) {
    const d = JSON.parse(readFileSync(`messages/${locale}/discovery.json`, "utf8")) as {
      roles: Record<string, string>;
      roleHelp: Record<string, { text: string; parts: string }>;
      roleHelpOpen: string;
    };
    assert.ok(d.roleHelpOpen, `${locale}: Beschriftung des Aufklappers fehlt`);
    for (const role of Object.keys(d.roles)) {
      if (role === "other") continue;
      const help = d.roleHelp[role];
      assert.ok(help?.text && help.text.length > 10, `${locale}: ${role} ohne Erklärung`);
      assert.ok(help.parts.split(" | ").length >= 3, `${locale}: ${role} ohne Unterbereiche`);
    }
  }
});

test("die Erklärung ist reine Anzeige: höchstens eine offen, nichts wird gespeichert", () => {
  const field = src("src/features/discovery/DiscoveryRoleField.tsx");
  assert.match(field, /openOne/);
  assert.match(field, /aria-expanded=\{openOne === option\.value\}/);
  // Die Unterbereiche haben kein name-Attribut: Sie landen in keinem Formular.
  const parts = field.slice(field.indexOf("option.parts.map"), field.indexOf("option.parts.map") + 300);
  assert.doesNotMatch(parts, /<input|name=/);
});

test("die Links auf der Find-Seite führen zum richtigen Schritt", () => {
  const page = src("src/app/(product)/discovery/profile/page.tsx");
  assert.match(page, /href="\/profile\?step=identity"/);
  assert.match(page, /href="\/profile\?step=sichtbarkeit"/);
  assert.doesNotMatch(page, /<Link href="\/profile" className="font-medium text-slate-900 underline"/);
});

test("die Basis-Karte ist offen und nennt das Fehlende, wenn Pflichtangaben fehlen", () => {
  const card = src("src/features/profile/IdentityInlineCard.tsx");
  assert.match(card, /open=\{Boolean\(error\) \|\| gaps\.length > 0\}/);
  assert.match(card, /identity\.publishTitle/);
});
