import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { VENTURE_ALIGNMENT } from "@/features/instruments/align/registries";
import { takeoverRowsFrom } from "@/features/modules/ventureBeta/dataPure";
import { answerText } from "@/features/modules/ventureBeta/answerText";
import { answerContextFor } from "@/features/modules/ventureBeta/answerContext";
import { itemsAreIdentical, TAKEOVER_ELIGIBLE, TAKEOVER_PAIRS, takeoverSourceOf, translateV1Value } from "@/features/modules/ventureBeta/takeover";
import { findBetaItem } from "@/features/modules/ventureBeta/registry";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const UI = join("src", "features", "modules", "ui");
const BETA = join("src", "features", "modules", "ventureBeta");
const PAGE = join("src", "app", "(product)", "founder-alignment", "vorhaben", "beta", "page.tsx");

test("v1-Uebernahme: genau die sechs wirklich identischen Items", () => {
  assert.deepEqual(TAKEOVER_ELIGIBLE.map(([beta, v1]) => `${beta}<-${v1}`), ["E01<-U01", "E02<-G01", "C01<-R01", "C02<-R02", "C04<-R09", "F02<-S03"]);
  // Jedes Kandidatenpaar besteht die Identitaetspruefung (Wortlaut, Optionen, Format, Validierung, Auslassungsgruende).
  assert.equal(TAKEOVER_ELIGIBLE.length, TAKEOVER_PAIRS.length);
  // Nicht uebernahmefaehig: veraenderte oder neue Items - auch wenn sie aus v1 stammen.
  for (const id of ["C03", "E03", "O01", "F01", "M01", "M02", "M03", "Z01", "Z02", "Z03", "T01", "T02", "N01"]) {
    assert.equal(takeoverSourceOf(id), null, id);
  }
  // C03 (R06): zusaetzliche exklusive Option -> nicht identisch. E03 (G05): „Keine davon".
  const v1 = (id: string) => VENTURE_ALIGNMENT.items.find((i) => i.itemId === id)!;
  assert.equal(itemsAreIdentical(findBetaItem("C03")!, v1("R06")), false);
  assert.equal(itemsAreIdentical(findBetaItem("E03")!, v1("G05")), false);
  assert.equal(itemsAreIdentical(findBetaItem("O01")!, v1("S06")), false, "Limit 2");
  assert.equal(itemsAreIdentical(findBetaItem("E01")!, v1("U01")), true);
  assert.equal(itemsAreIdentical(findBetaItem("E01")!, v1("G01")), false);
});

test("v1-Uebernahme: nur die Option-Kennungen werden uebersetzt, Auslassungen werden nicht mitgenommen", () => {
  assert.deepEqual(translateV1Value("E01", { optionId: "U01_o3" }), { optionId: "E01_o3" });
  assert.deepEqual(translateV1Value("C01", { number: 12, unit: "Stunden pro Woche", condition: "schwankt" }), { number: 12, unit: "Stunden pro Woche", condition: "schwankt" });
  assert.deepEqual(translateV1Value("C04", { optionId: "R09_o1", date: "2027-01-01" }), { optionId: "C04_o1", date: "2027-01-01" });
  assert.deepEqual(translateV1Value("C03", { optionIds: ["R06_o1"] }), { optionIds: ["R06_o1"] }, "kein Kandidat: nichts wird uebersetzt");
  const rows = takeoverRowsFrom([
    { block_id: "U01", answer_format: "ordinal_choice", value: { optionId: "U01_o2" }, missing_code: null },
    { block_id: "G01", answer_format: "single_choice", value: null, missing_code: "cannot_assess" },
    { block_id: "R06", answer_format: "multi_choice", value: { optionIds: ["R06_o1"] }, missing_code: null },
  ]);
  assert.deepEqual(rows, [{ block_id: "E01", answer_format: "ordinal_choice", value: { optionId: "E01_o2" }, missing_code: null }]);
});

test("v1-Uebernahme nur auf ausdrueckliche Aktion - nie automatisch, nie in einen bestehenden Entwurf", () => {
  const actions = code(join(BETA, "actions.ts"));
  // Kopiert wird nur in `startBeta`, und nur wenn der Entwurf dabei NEU entstand.
  assert.match(actions, /draft\.created && \(source === "takeover" \|\| source === "previous"\)/);
  assert.equal([...actions.matchAll(/loadBetaPageState/g)].length, 2, "Import und der eine Aufruf in startBeta");
  // Das Lesen der Seite (data.ts) schreibt nichts.
  assert.doesNotMatch(code(join(BETA, "data.ts")), /\.(insert|update|upsert|delete)\(/);
  // Auf der Seite gibt es die Uebernahme nur als Formular mit ausdruecklichem Knopf.
  const page = code(PAGE);
  assert.match(page, /name="source" value="takeover"/);
  assert.match(page, /name="source" value="empty"/);
  assert.doesNotMatch(page, /\.(insert|update)\(/);
  // Der Ausgangspunkt wird vor dem Abgeben gekennzeichnet; abgegeben wird erst per Knopf.
  assert.match(code(join(UI, "BetaFlow.tsx")), /same\.\$\{earlierSource\}|t\(`same\./);
  const de = JSON.parse(read("messages/de/ventureBeta.json"));
  assert.match(de.takeover.title, /können als Ausgangspunkt übernommen werden/);
  assert.match(de.takeover.text, /ganz neu selbst ab/);
});

test("Flow: Autosave je Frage, Abgabe nur mit allen 19, kein Fortschritt in Zahlen", () => {
  const flow = code(join(UI, "BetaFlow.tsx"));
  assert.match(flow, /saveBetaAnswer/);
  assert.match(flow, /clearBetaAnswer/);
  assert.match(flow, /submitBeta/);
  assert.match(flow, /coreIds\.every/);
  assert.match(flow, /SAVE_DELAY_MS/);
  assert.doesNotMatch(flow, /progress|prozent|percent|%|\bof\s+\d|von\s+\d|\.length\s*\/|\/\s*coreIds/i);
  // Die privaten Betragsfelder: eigene Kennzeichnung, nur unter ihrer Hauptfrage.
  assert.match(flow, /data-private-item/);
  assert.match(flow, /flow\.privateBadge/);
  assert.match(flow, /basisOptionIds/);
  // Die Seite weist ausdruecklich aus: Abgeben teilt nichts.
  assert.match(flow, /flow\.submitDoesNotShare/);
  const de = JSON.parse(read("messages/de/ventureBeta.json"));
  assert.match(de.flow.submitDoesNotShare, /teilt nichts/);
  assert.match(de.flow.privateBadge, /Nur für dich/);
  // Abgabe: serverseitig alle 19 verlangt; ein veralteter privater Betrag faellt vor der Abgabe weg.
  const actions = code(join(BETA, "actions.ts"));
  assert.match(actions, /BETA_CORE_ITEM_IDS\.filter/);
  assert.match(actions, /reason: "incomplete"/);
  assert.match(actions, /stale/);
  // Eine Abgabe teilt nichts: keine Freigabe im Lebenszyklus.
  assert.doesNotMatch(actions, /set_assessment_team_share|assessment_team_shares|setBetaShare/);
});

test("Ergebnis: acht Bloecke, deterministische Saetze, die privaten Betraege nur in der eigenen Sicht", () => {
  const summary = code(join(UI, "BetaSummary.tsx"));
  assert.match(summary, /BETA_BLOCKS\.map/);
  assert.match(summary, /summary\.\$\{itemId\}/);
  assert.match(summary, /result\.privateAmount/);
  // Kein Modell, keine Interpretation.
  assert.doesNotMatch(summary, /openai|anthropic|llm|\bAI\b|\bKI\b|ollama/i);
  // answerText: Beschriftungen aus der Registry, Datum und Betrag nach Sprache, Freitext unveraendert.
  const ctx = answerContextFor("de");
  const z03 = findBetaItem("Z03")!;
  assert.equal(answerText(z03, { kind: "option", optionId: "Z03_o6", text: "ein Meilenstein" }, ctx), "Etwas anderes: ein Meilenstein");
  assert.equal(answerText(findBetaItem("C01")!, { kind: "number", number: 12, unit: "Stunden pro Woche" }, ctx), "12 Stunden pro Woche");
  const en = answerContextFor("en");
  assert.equal(answerText(findBetaItem("C01")!, { kind: "number", number: 12, unit: "Stunden pro Woche" }, en), "12 hours per week");
  assert.equal(answerText(findBetaItem("M01")!, { kind: "option", optionId: "M01_o2", date: "2027-03-01" }, ctx).startsWith("Ab einem Datum ("), true);
  assert.equal(answerText(findBetaItem("T01")!, { kind: "missing", code: "not_decided" }, en), "I have not decided yet");
});

test("Freigabe: ausdruecklich, ohne Vorauswahl, nie durch die Abgabe; Widerruf mit Bestaetigung", () => {
  const panel = code(join(UI, "BetaSharePanel.tsx"));
  assert.match(panel, /name="shared" value="true"/);
  assert.match(panel, /name="shared" value="false"/);
  assert.doesNotMatch(panel, /type="checkbox"|defaultChecked|checked=/);
  assert.match(panel, /<details/);
  assert.match(panel, /share\.revokeConfirm/);
  const share = code(join(BETA, "shareActions.ts"));
  assert.deepEqual([...share.matchAll(/\.rpc\(\s*"([a-z_]+)"/g)].map((m) => m[1]), ["set_assessment_team_share"]);
  assert.doesNotMatch(share, /\.from\(|team_shares|alignment_shares|advisor/);
  assert.match(share, /choice !== "true" && choice !== "false"/);
  // Das Panel gibt es nur nach einer Abgabe, mit der ID dieses Durchlaufs; ein aelterer aktiver Share bleibt widerrufbar.
  const page = code(PAGE);
  assert.match(page, /state\.submitted \? \(\s*<BetaSharePanel/);
  assert.match(page, /assessmentId=\{state\.submitted\.id\}/);
  assert.match(page, /olderSharedId=/);
  const de = JSON.parse(read("messages/de/ventureBeta.json"));
  assert.match(de.share.explain.p1, /alle aktuellen Teammitglieder/);
  assert.match(de.share.revokeConfirm, /vorübergehend/);
});

test("Teamreport: fuenf Gruppen, Gespraechsanlaesse zuerst, needs_clarification als „abstimmen\" - nicht als Warnung", () => {
  const report = code(join(UI, "BetaTeamReport.tsx"));
  for (const bucket of ["clarify", "impulse", "differences", "common"]) assert.match(report, new RegExp(`data-bucket="${bucket}"`));
  // Reihenfolge: abstimmen, Impulse, Unterschiede, Gemeinsames.
  const order = ["clarify", "impulse", "differences", "common"].map((b) => report.indexOf(`data-bucket="${b}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.doesNotMatch(report, /warn|risiko|risk|alert|rot\b|red-|amber-/i);
  const de = JSON.parse(read("messages/de/ventureBeta.json")).report;
  assert.equal(de.clarify.title, "Das solltet ihr konkret abstimmen");
  // Die Gespraechsanlaesse sind keine Warnungen: weder Titel noch Leitsaetze sprechen von Risiko oder Warnung.
  assert.doesNotMatch(JSON.stringify([de.clarify, de.impulse, de.differences, de.common]), /warn|risiko|risk|gefahr|problem/i);
  assert.equal(Object.keys(de.groups).length, 5);
  assert.equal(de.groups.direction.title, "Wohin wollt ihr?");
  // Die Seite holt den Report nur bei Bereitschaft und kennt vorher keine Namen.
  const teamPage = code(join("src", "app", "(product)", "teams", "[teamId]", "vorhaben-beta", "page.tsx"));
  assert.match(teamPage, /readiness\.status === "ready" \? await loadBetaComparison/);
  assert.match(teamPage, /comparison\?\.status === "ready" \? compareBeta/);
  assert.match(teamPage, /if \(!readiness\) return <TeamUnavailable/);
  assert.doesNotMatch(teamPage, /\.from\(|alignment_answers|assessments/);
  assert.doesNotMatch(teamPage.slice(teamPage.indexOf(") : (")), /people|comparison\./);
});

test("private Felder (GR01P/GR02P) erreichen nie den Team-Pfad, den Report oder den Vergleich", () => {
  for (const file of [join(BETA, "compare.ts"), join(BETA, "teamData.ts"), join(BETA, "compareConfig.ts"), join(UI, "BetaTeamReport.tsx"), join(UI, "BetaTeamCard.tsx")]) {
    assert.doesNotMatch(code(file), /M01p|M02p|BETA_PRIVATE_BLOCK_IDS|isBetaPrivateBlock/, file);
  }
  // Der Team-Report kennt nur die 19 Core-Items: die Engine iteriert ueber `betaCoreItems()`.
  assert.match(code(join(BETA, "compare.ts")), /betaCoreItems\(\)/);
  // Serverseitig: Allowlist (pgTAP prueft die Funktion gegen die echte Datenbank).
  const sql = read(join("..", "supabase", "migrations", "20261207120000_assessment_share_instruments.sql"));
  assert.match(sql, /r\.block_id = any \(visible\)/);
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /select \*[^;]*alignment_answers[^;]*jsonb_agg|to_jsonb\(r\)/);
});

test("Profil und Team: Beta-Karte vor den Vertiefungen, keine Prozente; v1 unveraendert; Advisor ohne Zugriff", () => {
  const profile = code(join("src", "app", "me", "profile", "page.tsx"));
  const card = profile.indexOf("<BetaProfileCard");
  const deepenings = profile.indexOf('anchorModuleId="venture_core"');
  assert.ok(card > 0 && deepenings > card, "Beta-Karte steht vor den Vertiefungen");
  assert.match(profile, /isVentureBetaEnabled\(user\)/);
  const profileCard = code(join(UI, "BetaProfileCard.tsx"));
  assert.match(profileCard, /getModuleAdapter\("venture_core_beta"\)/);
  assert.doesNotMatch(profileCard, /%|percent|von\s+\d/i);
  // Die Team-Seite: eigene Karte, keine neue Hauptnavigation.
  const team = code(join("src", "app", "(product)", "teams", "[teamId]", "page.tsx"));
  assert.match(team, /<BetaTeamCard enabled=\{isVentureBetaEnabled\(user\)\}/);
  // Advisor: nirgends in der Beta.
  for (const file of [join(BETA, "actions.ts"), join(BETA, "shareActions.ts"), join(BETA, "teamData.ts"), join(UI, "BetaTeamReport.tsx"), join(UI, "BetaTeamCard.tsx"), PAGE]) {
    assert.doesNotMatch(code(file), /advisor|discovery|connect|network/i, file);
  }
  // v1 bleibt unveraendert: kein Beta-Code in den v1-Dateien.
  for (const file of [join("src", "features", "instruments", "align", "answerActions.ts"), join("src", "features", "instruments", "align", "reportData.ts")]) {
    assert.doesNotMatch(read(file), /ventureBeta|venture-alignment-v2/i, file);
  }
});
