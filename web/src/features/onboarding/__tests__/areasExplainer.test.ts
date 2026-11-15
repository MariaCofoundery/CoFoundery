import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const json = (path: string) => JSON.parse(read(path));

test("die Erklärung zeigt die vier Bereiche in kurzen, freundlichen Sätzen - auf Deutsch und Englisch", () => {
  const de = json("messages/de/profile.json").journey.explainer;
  const en = json("messages/en/profile.json").journey.explainer;
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  for (const key of ["align", "find", "connect", "advise"]) {
    assert.ok(de[key].length > 20 && de[key].length < 80, `de ${key}: kurz`);
    assert.ok(en[key].length > 20 && en[key].length < 80, `en ${key}: kurz`);
    // Nur ein Gedanke je Satz - keine Zusaetze zu Freigabe, Sichtbarkeit oder "ohne Punkte".
    assert.doesNotMatch(`${de[key]} ${en[key]}`, /Freigabe|permission|sichtbar|visible|Punkte|scores?\b/i, key);
  }
  assert.doesNotMatch(JSON.stringify(en), /[äöüÄÖÜß]/);
  assert.match(de.align, /tickst/);
  assert.match(de.advise, /Accelerator/);
});

test("sie ist reine Grafik: Schleife, Reduced Motion, nichts blockiert, nur auf der Willkommensseite", () => {
  const css = read("src/features/onboarding/explainer.css");
  assert.match(css, /animation: ex-scene 16s infinite/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ex-s1 \{ opacity: 1; \}/);
  const component = code("src/features/onboarding/AreasExplainer.tsx");
  for (const area of ["Align", "Find", "Connect", "Advisor"]) assert.match(component, new RegExp(`<strong[^>]*>${area}</strong>`), area);
  assert.doesNotMatch(component, /<video|<audio|\.mp4|fetch\(|useEffect|setInterval/, "kein Video, keine Datei, keine Zeitgeber");
  assert.match(component, /role="img" aria-label=\{t\("alt"\)\}/);
  const journey = code("src/features/profile/journey/ProfileJourney.tsx");
  assert.match(journey, /\{!isSetup \? <AreasExplainer \/> : null\}/);
});

test("der erste Erfolg je Bereich: ein Satz und ein Knopf, nur solange es etwas zu entdecken gibt, ohne zu schreiben", () => {
  const payoff = code("src/features/onboarding/AreaPayoff.tsx");
  assert.doesNotMatch(payoff, /\.insert\(|\.update\(|rpc\(|action=/, "er schreibt und fragt nichts");
  const advisor = read("src/app/(product)/advisor/los-gehts/page.tsx");
  assert.match(advisor, /done === 0 \? <AreaPayoff[^>]*href="\/advisor\/beispiel"/);
  const connect = read("src/app/(product)/connect/profile/page.tsx");
  assert.match(connect, /profile\?\.status !== "active" \? <AreaPayoff[^>]*href="\/connect"/);
  const find = read("src/app/(product)/discovery/profile/page.tsx");
  assert.match(find, /\(profile\.status \?\? "draft"\) !== "active" \? [\s\S]*?<AreaPayoff[^>]*href="\/discovery\/suche"/);
  for (const locale of ["de", "en"]) {
    const advisorMessages = json(`messages/${locale}/advisor.json`).setup;
    for (const key of ["exampleTitle", "exampleText", "exampleCta"]) assert.ok(advisorMessages[key], `${locale}: advisor ${key}`);
    for (const [file, keys] of [["connect", ["title", "text", "cta"]], ["discovery", ["title", "text", "cta", "note"]]] as const) {
      for (const key of keys) assert.ok(json(`messages/${locale}/${file}.json`).payoff[key], `${locale}: ${file} ${key}`);
    }
  }
  // Find: Man bleibt unsichtbar, bis man selbst veroeffentlicht - das steht dabei.
  assert.match(json("messages/de/discovery.json").payoff.note, /unsichtbar/);
});
