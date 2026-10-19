import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildDeepeningCards,
  cardStateOf,
  deepeningsOf,
  MAX_TEASER_LINES,
  MAX_VISIBLE_DEEPENINGS,
  profileSectionOf,
} from "@/features/modules/deepeningCards";
import { MODULE_DEFINITIONS } from "@/features/modules/definitions";
import { isGrundprofilComplete, personCoreModules } from "@/features/modules/grundprofil";
import { MODULE_ADAPTERS } from "@/features/modules/adapters";
import { MODULE_REGISTRY } from "@/features/modules/registry";
import type { ModuleContext, ModuleDefinition, ModuleState, ModuleStatus, ModuleTeaser } from "@/features/modules/types";
import { validateModuleDefinition, validateModuleRegistry } from "@/features/modules/validate";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";
import {
  DEMO_DEEPENINGS,
  DEMO_EVERYDAY,
  DEMO_FEEDBACK,
  DEMO_LIMITS,
  DEMO_REGISTRY,
  DEMO_SPARE,
  DEMO_TRADEOFFS,
} from "@/features/modules/__tests__/deepeningFixtures";

/**
 * Phase C: der UX-Unterbau fuer optionale Vertiefungen.
 *
 * Es gibt noch KEIN Vertiefungsmodul. Getestet wird mit hypothetischen
 * Demo-Vertiefungen (`deepeningFixtures.ts`), die nie in die Registry oder in
 * Produktcode gelangen - und damit, dass das heutige Produkt neutral bleibt.
 */

const read = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

function* quellen(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "__tests__") continue;
      yield* quellen(path);
    } else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

const UI = "src/features/modules/ui";
const status = (state: ModuleState): ModuleStatus => ({ state, completedVersion: state === "done_for_now" ? "v1" : null });
const resolver =
  (states: Record<string, ModuleState>, teasers: Record<string, ModuleTeaser> = {}) =>
  (def: ModuleDefinition) =>
    states[def.moduleId] ? { status: status(states[def.moduleId]!), teaser: teasers[def.moduleId] ?? null } : null;

// ---------------------------------------------------------------------------
// Neutralitaet: ohne registrierte Vertiefungen aendert sich nichts
// ---------------------------------------------------------------------------

test("die echte Registry hat keine Vertiefung - die Karten sind im heutigen Produkt unsichtbar", () => {
  assert.deepEqual(MODULE_REGISTRY.filter((def) => def.tier === "deepening"), []);
  for (const def of MODULE_REGISTRY) {
    assert.deepEqual(deepeningsOf(def.moduleId), [], def.moduleId);
  }
  assert.deepEqual(deepeningsOf("gibt_es_nicht"), []);
  assert.deepEqual(buildDeepeningCards([], () => null), { visible: [], more: [] });
});

test("ProfileDeepenings kehrt zurueck, bevor es eine Abfrage stellt oder Markup erzeugt", () => {
  const code = codeOnly(`${UI}/ProfileDeepenings.tsx`);
  const frueh = code.indexOf("if (defs.length === 0) return null;");
  assert.ok(frueh > 0);
  assert.ok(frueh < code.indexOf("createClient()"), "der Client wird erst nach der Pruefung erzeugt");
  assert.ok(frueh < code.indexOf("loadModuleContext("), "geladen wird erst nach der Pruefung");
  assert.ok(frueh < code.indexOf("getTranslations("), "auch die Texte erst danach");
  // Und die Liste kommt aus der Registry, nicht aus dem Code.
  assert.match(code, /deepeningsOf\(anchorModuleId\)/);
});

test("die Demo-Vertiefungen sind nicht im Produkt erreichbar", () => {
  const kennungen = DEMO_DEEPENINGS.map((def) => def.moduleId);
  assert.ok(kennungen.every((id) => id.startsWith("demo_")));
  for (const file of quellen("src")) {
    const quelle = read(file);
    for (const id of kennungen) assert.ok(!quelle.includes(id), `${file} nennt ${id}`);
    assert.ok(!/deepeningFixtures/.test(quelle), `${file} importiert die Fixtures`);
  }
  assert.deepEqual(
    MODULE_DEFINITIONS.filter((def) => kennungen.includes(def.moduleId)),
    []
  );
});

test("keine neue Hauptnavigation und keine Navigationstexte fuer Vertiefungen", () => {
  assert.doesNotMatch(read("src/features/navigation/ProductShell.tsx"), /features\/modules|deepening|vertiefung/i);
  for (const locale of ["de", "en"]) {
    assert.doesNotMatch(read(`messages/${locale}/navigation.json`), /deepening|vertiefung|deepen/i, locale);
  }
});

// ---------------------------------------------------------------------------
// Vertiefungen haengen an Core-Bereichen, Scopes bleiben getrennt
// ---------------------------------------------------------------------------

test("Validator: eine Vertiefung braucht ein Core-Modul, ein Core-Modul vertieft nichts", () => {
  const regeln = (def: ModuleDefinition) => validateModuleDefinition(def).map((issue) => issue.rule);
  assert.ok(regeln({ ...DEMO_TRADEOFFS, deepens: undefined }).includes("deepens_required"));
  assert.ok(regeln({ ...MODULE_DEFINITIONS[0]!, deepens: "workstyle" }).includes("deepens_core"));
  assert.deepEqual(regeln(DEMO_TRADEOFFS), []);
});

test("Validator: genau ein primaerer Anker, kein Self-Reference, nur fuer Vertiefungen", () => {
  const regeln = (def: unknown) => validateModuleDefinition(def as ModuleDefinition).map((issue) => issue.rule);
  // genau ein Anker: eine Liste ist kein gueltiger Anker
  assert.ok(regeln({ ...DEMO_TRADEOFFS, deepens: ["venture_core", "workstyle"] }).includes("deepens_single"));
  assert.equal(typeof DEMO_TRADEOFFS.deepens, "string");
  // kein Self-Reference
  assert.ok(regeln({ ...DEMO_TRADEOFFS, deepens: "demo_tradeoffs" }).includes("deepens_self"));
  assert.ok(validateModuleRegistry([...MODULE_DEFINITIONS, { ...DEMO_TRADEOFFS, deepens: "demo_tradeoffs" }]).some((i) => i.rule === "deepens_self"));
  // nur fuer tier = deepening (Core und Team haben keinen Anker)
  assert.ok(regeln({ ...MODULE_DEFINITIONS[0]!, deepens: "workstyle" }).includes("deepens_core"));
  const team = { moduleId: "demo_team", scope: "team", tier: "deepening", deepens: "workstyle" };
  assert.ok(regeln({ ...DEMO_TRADEOFFS, ...team }).includes("deepens_team"));
  // der Typ erlaubt nur einen einzelnen Text
  assert.match(codeOnly("src/features/modules/types.ts"), /deepens\?: string;/);
  // keine zweite Zuordnung in der UI: Der Anker kommt aus der Registry.
  for (const file of quellen(UI)) assert.doesNotMatch(codeOnly(file), /deepens\s*[:=]/, file);
});

test("Validator: die Vertiefung zeigt auf ein Core-Modul desselben Scopes - Person und Vorhaben werden nicht gemischt", () => {
  assert.deepEqual(validateModuleRegistry(DEMO_REGISTRY, { setupItemKeys: FOUNDER_SETUP_ITEM_KEYS }), []);

  const personAmVorhaben = { ...DEMO_FEEDBACK, moduleId: "demo_mixed", deepens: "venture_core" };
  const mixed = validateModuleRegistry([...MODULE_DEFINITIONS, personAmVorhaben]);
  assert.ok(mixed.some((issue) => issue.rule === "deepens_scope"), "Person-Vertiefung am Vorhaben-Bereich");

  const vorhabenAmPerson = { ...DEMO_TRADEOFFS, moduleId: "demo_mixed2", deepens: "workstyle" };
  assert.ok(validateModuleRegistry([...MODULE_DEFINITIONS, vorhabenAmPerson]).some((issue) => issue.rule === "deepens_scope"));

  const unbekannt = { ...DEMO_TRADEOFFS, deepens: "gibt_es_nicht" };
  assert.ok(validateModuleRegistry([...MODULE_DEFINITIONS, unbekannt]).some((issue) => issue.rule === "deepens_target"));
  const aufVertiefung = { ...DEMO_LIMITS, deepens: "demo_tradeoffs" };
  assert.ok(validateModuleRegistry([...MODULE_DEFINITIONS, DEMO_TRADEOFFS, aufVertiefung]).some((issue) => issue.rule === "deepens_target"));
});

test("Scope-Trennung im Kartenmodell: Person-Vertiefungen nur am Person-Bereich, Vorhaben-Vertiefungen nur am Vorhaben-Bereich", () => {
  assert.deepEqual(deepeningsOf("workstyle", DEMO_REGISTRY).map((d) => d.moduleId), ["demo_feedback"]);
  assert.deepEqual(
    deepeningsOf("venture_core", DEMO_REGISTRY).map((d) => d.moduleId),
    ["demo_tradeoffs", "demo_limits", "demo_everyday", "demo_spare"]
  );
  // Andere Person-Bereiche haben keine Vertiefung - es gibt keine globale Sammelsektion.
  for (const anchor of ["strengths", "capability", "direction"]) {
    assert.deepEqual(deepeningsOf(anchor, DEMO_REGISTRY), [], anchor);
  }
  // Selbst eine ungepruefte, falsch zugeordnete Vertiefung taucht nirgends auf.
  const falsch = { ...DEMO_FEEDBACK, moduleId: "demo_falsch", deepens: "venture_core" };
  const ungeprueft = [...DEMO_REGISTRY, falsch];
  assert.ok(!deepeningsOf("venture_core", ungeprueft).some((d) => d.moduleId === "demo_falsch"));
  assert.ok(!deepeningsOf("workstyle", ungeprueft).some((d) => d.moduleId === "demo_falsch"));
  // Team-Module und Research sind nie Profilkarten.
  const forschung = { ...DEMO_FEEDBACK, moduleId: "demo_research", usage: "research_only" as const };
  assert.ok(!deepeningsOf("workstyle", [...DEMO_REGISTRY, forschung]).some((d) => d.moduleId === "demo_research"));
});

test("der Profilabschnitt eines Core-Moduls kommt aus der Registry", () => {
  assert.equal(profileSectionOf("workstyle"), "arbeitsweise");
  assert.equal(profileSectionOf("venture_core"), "vorhaben");
  assert.equal(profileSectionOf("gibt_es_nicht"), null);
});

test("die Profilseite haengt die Karten an die richtigen Abschnitte - und nur dort", () => {
  const page = read("src/app/me/profile/page.tsx");
  const nutzungen = [...page.matchAll(/<ProfileDeepenings[\s\S]*?\/>/g)].map((m) => m[0]);
  assert.equal(nutzungen.length, 2);

  const stelle = (muster: RegExp) => page.search(muster);
  const abschnitt = (von: RegExp, bis: RegExp) => page.slice(stelle(von), stelle(bis));
  const arbeitsweise = abschnitt(/teil\(\s*"arbeitsweise"/, /teil\(\s*"staerken"/);
  const vorhaben = abschnitt(/teil\(\s*"vorhaben"/, /teil\(\s*"details"/);
  assert.ok(arbeitsweise.length > 100 && vorhaben.length > 100, "die Abschnitte wurden gefunden");
  assert.match(arbeitsweise, /<ProfileDeepenings anchorModuleId="workstyle"/);
  assert.match(vorhaben, /<ProfileDeepenings[\s\S]*anchorModuleId="venture_core"/);
  // Der Anker stimmt mit dem Abschnitt ueberein, den die Registry nennt.
  assert.equal(profileSectionOf("workstyle"), "arbeitsweise");
  assert.equal(profileSectionOf("venture_core"), "vorhaben");
  // Keine globale Sammelsektion: nirgends sonst.
  const ohne = page.replace(arbeitsweise, "").replace(vorhaben, "");
  assert.ok(!/<ProfileDeepenings/.test(ohne.replace(/import[^\n]*\n/g, "")));
  // Nicht im Druck.
  assert.doesNotMatch(read("src/app/me/profile/print/page.tsx"), /ProfileDeepenings|features\/modules/);
});

// ---------------------------------------------------------------------------
// Karten-Zustaende
// ---------------------------------------------------------------------------

test("Zustaende: Modulzustand -> Kartenzustand", () => {
  assert.equal(cardStateOf("not_started"), "available");
  assert.equal(cardStateOf("in_progress"), "in_progress");
  assert.equal(cardStateOf("done_for_now"), "completed");
});

test("verfuegbar, begonnen und abgeschlossen werden korrekt abgebildet", () => {
  const defs = [DEMO_TRADEOFFS, DEMO_LIMITS, DEMO_EVERYDAY];
  const { visible } = buildDeepeningCards(
    defs,
    resolver(
      { demo_tradeoffs: "not_started", demo_limits: "in_progress", demo_everyday: "done_for_now" },
      { demo_everyday: { href: "/x", hasContent: true, lines: ["Erste Zeile.", "Zweite Zeile.", "Dritte Zeile."] } }
    )
  );
  const nach = Object.fromEntries(visible.map((card) => [card.moduleId, card]));
  assert.equal(nach.demo_tradeoffs!.state, "available");
  assert.deepEqual(nach.demo_tradeoffs!.teaser, []);
  assert.equal(nach.demo_limits!.state, "in_progress");
  assert.deepEqual(nach.demo_limits!.teaser, []);
  assert.equal(nach.demo_everyday!.state, "completed");
  assert.deepEqual(nach.demo_everyday!.teaser, ["Erste Zeile.", "Zweite Zeile."], `hoechstens ${MAX_TEASER_LINES} kurze Saetze`);
  // Das Detail liegt hinter dem Klick: Ziel ist das Detail des Moduls.
  assert.equal(nach.demo_tradeoffs!.href, "/demo/demo_tradeoffs");
});

test("ein Angebot traegt nie Teaser oder Fortschritt - auch wenn das Modul welche liefern wuerde", () => {
  const { visible } = buildDeepeningCards(
    [DEMO_TRADEOFFS],
    resolver({ demo_tradeoffs: "not_started" }, { demo_tradeoffs: { href: "/x", hasContent: false, lines: ["Nicht anzeigen."], counts: { items: 3 } } })
  );
  assert.deepEqual(visible[0]!.teaser, []);
  assert.deepEqual(Object.keys(visible[0]!).sort(), ["href", "moduleId", "state", "teaser"], "keine Zaehler im Kartenmodell");
});

test("Reihenfolge: Abgeschlossene zuerst, dann Begonnene, dann Angebote; hoechstens drei sichtbar", () => {
  const { visible, more } = buildDeepeningCards(
    [DEMO_TRADEOFFS, DEMO_LIMITS, DEMO_EVERYDAY, DEMO_SPARE],
    resolver({ demo_tradeoffs: "not_started", demo_limits: "in_progress", demo_everyday: "done_for_now", demo_spare: "not_started" })
  );
  assert.equal(MAX_VISIBLE_DEEPENINGS, 3);
  assert.deepEqual(visible.map((c) => c.moduleId), ["demo_everyday", "demo_limits", "demo_tradeoffs"]);
  assert.deepEqual(more.map((c) => c.moduleId), ["demo_spare"], "der Rest steht unter „Weitere Vertiefungen“");
  // Gleicher Zustand: Reihenfolge der Registry.
  const gleich = buildDeepeningCards([DEMO_SPARE, DEMO_TRADEOFFS], resolver({ demo_spare: "not_started", demo_tradeoffs: "not_started" }));
  assert.deepEqual(gleich.visible.map((c) => c.moduleId), ["demo_spare", "demo_tradeoffs"]);
});

test("ein nicht lesbares Modul ergibt keine Karte statt einer falschen", () => {
  const { visible } = buildDeepeningCards([DEMO_TRADEOFFS, DEMO_LIMITS], resolver({ demo_limits: "in_progress" }));
  assert.deepEqual(visible.map((c) => c.moduleId), ["demo_limits"]);
});

// ---------------------------------------------------------------------------
// Wirkung der Oberflaeche: Angebot, kein Mangel - keine Zahl, kein Fortschritt
// ---------------------------------------------------------------------------

test("ein verfuegbares Angebot wirkt nicht wie eine Luecke", () => {
  const card = codeOnly(`${UI}/DeepeningCard.tsx`);
  // Gestrichelt und leise; keine Warn- oder Fehlerfarbe, in keinem Zustand.
  assert.match(card, /available: "border border-dashed border-slate-300 bg-white\/40"/);
  assert.doesNotMatch(card, /\b(red|amber|orange|rose|yellow)-\d/);
  for (const file of [`${UI}/DeepeningCard.tsx`, `${UI}/DeepeningCards.tsx`, `${UI}/ProfileDeepenings.tsx`]) {
    assert.doesNotMatch(codeOnly(file), /\b(red|amber|orange|rose|yellow)-\d|MissingSection|role="alert"/, file);
  }
  // Die Texte nennen ein Angebot, nie einen Mangel.
  for (const locale of ["de", "en"]) {
    const text = JSON.parse(read(`messages/${locale}/profile.json`)).founderProfile.deepening;
    assert.doesNotMatch(JSON.stringify(text.state.available), /fehl|offen|missing|incomplete|unvollst|open|todo/i, locale);
    assert.doesNotMatch(JSON.stringify(text.cta), /jetzt|muss|must|required/i, locale);
  }
});

test("kein Prozentwert, kein x-von-y, kein Gesamtfortschritt", () => {
  for (const file of [
    `${UI}/DeepeningCard.tsx`,
    `${UI}/DeepeningCards.tsx`,
    `${UI}/ProfileDeepenings.tsx`,
    "src/features/modules/deepeningCards.ts",
  ]) {
    const code = codeOnly(file);
    assert.doesNotMatch(code, /%\s*["'`}]|percent|prozent|(?<!in_)progress|fortschritt|Math\.(round|floor)|\bscore\b|\.length\s*\/|\btotal\b/i, file);
    // keine Zaehlung ueber Karten hinweg, die in der Oberflaeche landen koennte
    assert.doesNotMatch(code, /\bvon\b|\bof\b\s*\{/, file);
  }
  for (const locale of ["de", "en"]) {
    // Gepruft werden die TEXTE, nicht die Schluessel (`in_progress` ist ein Zustandsname).
    const werte = (value: unknown): string[] =>
      Object.values(value as Record<string, unknown>).flatMap((v) => (typeof v === "object" && v ? werte(v) : [String(v)]));
    const text = werte(JSON.parse(read(`messages/${locale}/profile.json`)).founderProfile.deepening).join(" | ");
    assert.doesNotMatch(text, /%|\d|\bvon\b|\bof\b|score|prozent|percent|fortschritt|progress/i, locale);
  }
});

test("hoechstens drei Karten, der Rest hinter einem Klick, nur im Bildschirm", () => {
  const liste = codeOnly(`${UI}/DeepeningCards.tsx`);
  assert.match(liste, /<details/);
  assert.match(liste, /copy\.more/);
  assert.match(liste, /no-print/);
  assert.match(liste, /if \(visible\.length === 0\) return null;/);
  // Die Grenze steht im Modell, nicht in der Oberflaeche.
  assert.doesNotMatch(liste, /slice\(/);
  // Kompakt: Karten sind Listeneintraege, kein grosser Assessment-Block.
  assert.doesNotMatch(codeOnly(`${UI}/DeepeningCard.tsx`), /<section|<form|<button/);
});

test("DE und EN: dieselben Schluessel, und beide Sprachen haben jeden Zustand", () => {
  const de = JSON.parse(read("messages/de/profile.json")).founderProfile.deepening;
  const en = JSON.parse(read("messages/en/profile.json")).founderProfile.deepening;
  const keys = (value: unknown, prefix = ""): string[] =>
    Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
      typeof v === "object" && v ? keys(v, `${prefix}${key}.`) : [`${prefix}${key}`]
    );
  assert.deepEqual(keys(de).sort(), keys(en).sort());
  for (const state of ["available", "in_progress", "completed"]) {
    assert.ok(de.state[state] && en.state[state] && de.cta[state] && en.cta[state], state);
  }
  assert.equal(de.state.in_progress, "Begonnen");
});

// ---------------------------------------------------------------------------
// Die Registry bleibt Quelle der Metadaten
// ---------------------------------------------------------------------------

test("die Oberflaeche bringt keine zweite Modulliste mit", () => {
  const verboten = [/Zusammenarbeit & Feedback/, /Werte & Zielkonflikte/, /Unter Druck/, /Grenzen/, /moduleId:\s*["']/];
  for (const file of [...quellen(UI), "src/features/modules/deepeningCards.ts"]) {
    const code = codeOnly(file);
    for (const muster of verboten) assert.doesNotMatch(code, muster, file);
  }
  const komponente = codeOnly(`${UI}/ProfileDeepenings.tsx`);
  assert.match(komponente, /getModuleAdapter\(def\.moduleId\)/, "der Zustand kommt vom Adapter");
  assert.match(komponente, /tModules\(`\$\{model\.moduleId\}\.title`\)/, "der Titel kommt aus der Registry-Sprachdatei");
  assert.match(codeOnly("src/features/modules/deepeningCards.ts"), /href: def\.renderers\.detail/, "das Ziel kommt aus der Registry");
});

test("Phase C aendert weder Adapter noch Datenabfragen noch Sharing", () => {
  for (const file of quellen("src/features/modules")) {
    const code = codeOnly(file);
    assert.doesNotMatch(code, /\.(insert|update|upsert|delete)\(/, file);
    for (const name of [...code.matchAll(/\.rpc\(\s*"([a-z_0-9]+)"/g)].map((m) => m[1])) {
      assert.equal(name, "get_workstyle_team_share_readiness", file);
    }
  }
});

// ---------------------------------------------------------------------------
// „Dein Grundprofil steht": nur die Ableitung, noch keine Anzeige
// ---------------------------------------------------------------------------

test("das Grundprofil steht, wenn jedes Person-Core-Modul der Registry abgeschlossen ist - abgeleitet, nicht gespeichert", () => {
  const core = personCoreModules().map((def) => def.moduleId);
  assert.deepEqual(core, ["workstyle", "strengths", "capability", "direction"]);

  const alle = Object.fromEntries(core.map((id) => [id, status("done_for_now")]));
  assert.equal(isGrundprofilComplete(alle), true);
  assert.equal(isGrundprofilComplete({ ...alle, capability: status("in_progress") }), false);
  assert.equal(isGrundprofilComplete({ ...alle, direction: undefined }), false);
  assert.equal(isGrundprofilComplete({}), false);
  // Das Vorhaben und Vertiefungen gehoeren nicht dazu - sie beeinflussen die Core-Completion nie.
  assert.equal(isGrundprofilComplete({ ...alle, venture_core: status("not_started"), demo_tradeoffs: status("not_started") }), true);
  assert.deepEqual(personCoreModules(DEMO_REGISTRY).map((d) => d.moduleId), core);
});

test("ein Update-Entwurf macht das Grundprofil nicht wieder unvollstaendig", () => {
  // Workstyle: abgegeben, danach ein neuer Entwurf. Das Profil liest die neueste Zeile (workSubmitted = false),
  // die Modulschicht behaelt den abgeschlossenen Stand.
  const facts = {
    identityGaps: 0, identityTouched: true, workAnswers: 4, workStarted: true, workSubmitted: false,
    interviewStarted: false, interviewCompleted: false, unsortedAnswers: 0,
    areaCount: 2, levelledCount: 2, wishedCount: 2, strengthCount: 1,
    directionAnswers: 4, directionStatements: 1, confirmedResources: 0, pendingResources: 0,
    marks: new Set(["staerken", "faehigkeiten"]),
  };
  const statuses = (context: Partial<ModuleContext>) =>
    Object.fromEntries(
      Object.entries(MODULE_ADAPTERS)
        .filter(([id]) => id !== "venture_core")
        .map(([id, adapter]) => [id, adapter.status({ id: "u" }, { personFacts: facts, ...context })])
    );
  assert.equal(isGrundprofilComplete(statuses({ workstyleSubmitted: false })), false, "ohne je abzugeben: nicht fertig");
  assert.equal(isGrundprofilComplete(statuses({ workstyleSubmitted: true })), true, "abgegeben, dann ein Update-Entwurf: weiter fertig");
});

test("es gibt noch keine Meldung: keine Anzeige, keine Tabelle, kein Zustand", () => {
  const datei = codeOnly("src/features/modules/grundprofil.ts");
  assert.doesNotMatch(datei, /from\(|\.rpc\(|insert|update|localStorage|cookie/);
  for (const file of quellen("src")) {
    if (file === join("src", "features", "modules", "grundprofil.ts")) continue;
    assert.doesNotMatch(read(file), /isGrundprofilComplete|Grundprofil steht|core profile is complete/i, file);
  }
  for (const locale of ["de", "en"]) {
    assert.doesNotMatch(read(`messages/${locale}/profile.json`), /Grundprofil steht|core profile (is|stands)/i, locale);
  }
});
