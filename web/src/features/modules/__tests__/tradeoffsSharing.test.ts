import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { compareTradeoffs } from "@/features/modules/tradeoffs/compare";
import { tradeoffItems } from "@/features/modules/tradeoffs/registry";
import {
  parseTradeoffsComparison,
  parseTradeoffsReadiness,
  tradeoffsCardState,
  type TradeoffsComparisonPerson,
  type TradeoffsReadiness,
} from "@/features/modules/tradeoffs/teamParse";

/**
 * Phase E: Freigabe und gemeinsamer Teamvergleich von „Werte & Zielkonflikte".
 *
 * Die Datenbank entscheidet, ob etwas bereit ist (pgTAP: `venture_tradeoffs_team_share.sql`). Hier steht,
 * was die Anwendung daraus macht: wann ein Knopf erscheint, was die Karte sagt, wie verglichen wird -
 * und dass nirgends Namen, Zahlen, Wertungen oder ein zweiter Weg auftauchen.
 */
const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const UI = join("src", "features", "modules", "ui");
const TRADEOFFS = join("src", "features", "modules", "tradeoffs");
const PAGE = join("src", "app", "(product)", "founder-alignment", "vorhaben", "zielkonflikte", "page.tsx");
const TEAM_PAGE = join("src", "app", "(product)", "teams", "[teamId]", "zielkonflikte", "page.tsx");

const readiness = (over: Partial<TradeoffsReadiness["own"]> & { status?: "ready" | "missing" } = {}): TradeoffsReadiness => ({
  status: over.status ?? "missing",
  own: { state: over.state ?? "completed", shared: over.shared ?? false, assessmentId: over.assessmentId ?? "a-1", sharedAssessmentId: over.sharedAssessmentId ?? (over.shared ? (over.assessmentId ?? "a-1") : null) },
});

test("Freigabe-Knopf: nur fuer eine Abgabe, nie vorausgewaehlt, nie durch die Abgabe", () => {
  const page = code(PAGE);
  // Das Panel gibt es nur, wenn es einen abgegebenen Durchlauf gibt - und es bekommt genau dessen ID.
  assert.match(page, /state\.submitted \? \(\s*<TradeoffsSharePanel/);
  assert.match(page, /assessmentId=\{state\.submitted\.id\}/);
  const panel = code(join(UI, "TradeoffsSharePanel.tsx"));
  // Ausdrueckliche Wahl: ein Formular mit verstecktem Wert - kein Haekchen, keine Vorauswahl.
  assert.match(panel, /name="shared" value="true"/);
  assert.match(panel, /name="shared" value="false"/);
  assert.doesNotMatch(panel, /type="checkbox"|defaultChecked|checked=/);
  // Die Abgabe selbst ruft keine Freigabe.
  assert.doesNotMatch(code(join(TRADEOFFS, "actions.ts")), /setTradeoffsShare|set_tradeoffs_team_share|assessment_team_shares/);
  // Die Ergebnisseite zeigt zuerst „Nur fuer dich", dann die Erklaerung, dann die Aktion.
  const order = ["share.private", "share.explainTitle", "share.explain.p1", "share.action"].map((key) => panel.indexOf(`"${key}"`));
  assert.ok(order.every((i) => i >= 0) && [...order].sort((a, b) => a - b).join() === order.join(), "Reihenfolge Status, Erklaerung, Aktion");
});

test("Freigabe und Widerruf: Erklaerung vorher, Bestaetigung beim Widerruf, Rueckmeldung danach", () => {
  const panel = code(join(UI, "TradeoffsSharePanel.tsx"));
  assert.match(panel, /<details/);
  assert.match(panel, /share\.revokeConfirm/);
  assert.match(panel, /share\.revokeAction/);
  const page = code(PAGE);
  assert.match(page, /query\.share === "on" \|\| query\.share === "off"/);
  for (const loc of ["de", "en"]) {
    const share = JSON.parse(read(`messages/${loc}/ventureTradeoffs.json`)).share;
    // Die drei Zusagen vor der Freigabe stehen da: erst bei allen, vorher niemand, jederzeit zuruecknehmbar.
    assert.match(share.explain.p1, /./);
    assert.ok(Object.keys(share.explain).length === 4, loc);
    assert.match(share.revokeConfirm, loc === "de" ? /vorübergehend/ : /temporarily/);
    assert.ok(share.private && share.shared && share.on && share.off, loc);
  }
});

test("Karte: fuenf Lagen aus der eigenen Lage und dem Gesamtergebnis - nach einem Widerruf wieder keine Freigabe", () => {
  assert.equal(tradeoffsCardState(readiness({ state: "not_started", shared: false, assessmentId: null })), "not_started");
  assert.equal(tradeoffsCardState(readiness({ state: "in_progress", shared: false, assessmentId: null })), "in_progress");
  assert.equal(tradeoffsCardState(readiness({ state: "completed", shared: false })), "completed");
  assert.equal(tradeoffsCardState(readiness({ state: "completed", shared: true, status: "missing" })), "shared_missing");
  assert.equal(tradeoffsCardState(readiness({ state: "completed", shared: true, status: "ready" })), "ready");
  // Widerruf: shared = false, status = missing -> die Karte bietet die Freigabe wieder an, kein Vergleich.
  assert.equal(tradeoffsCardState(readiness({ state: "completed", shared: false, status: "missing" })), "completed");
  // Ein neuer Entwurf neben einem freigegebenen Durchlauf aendert die Lage nicht.
  assert.equal(tradeoffsCardState(readiness({ state: "completed", shared: true, status: "ready" })), "ready");
});

test("Karte und Seiten sagen ueber andere Personen nichts - keine Namen, keine Zaehler, keine Matrix", () => {
  for (const file of [join(UI, "TradeoffsTeamCard.tsx"), join(UI, "TradeoffsSharePanel.tsx")]) {
    assert.doesNotMatch(code(file), /displayName|display_name|\.name\b|members\.map|person_id/, file);
  }
  // Der Typ der Bereitschaft HAT keine Felder fuer andere: nur Gesamtstatus und die eigene Lage.
  const parsed = parseTradeoffsReadiness({
    status: "missing",
    own: { state: "completed", shared: true, assessment_id: "a-1" },
    members: [{ name: "Anna", done: false }],
    missing: ["Anna"],
  });
  assert.deepEqual(Object.keys(parsed!).sort(), ["own", "status"]);
  // Die nicht-bereite Seite zeigt nur den Satz, keine Liste.
  const teamPage = code(TEAM_PAGE);
  assert.match(teamPage, /compare\.notReady/);
  // (Die Namen im fertigen Vergleich kommen aus dem Renderer, nicht aus dieser Seite.)
  assert.doesNotMatch(teamPage, /\.name\b|displayName/);
  const ohneVergleich = teamPage.slice(teamPage.indexOf(") : ("));
  assert.doesNotMatch(ohneVergleich, /people|comparison\./);
  for (const loc of ["de", "en"]) {
    const t = JSON.parse(read(`messages/${loc}/ventureTradeoffs.json`));
    assert.match(t.compare.notReady, loc === "de" ? /fehlen noch Voraussetzungen/ : /requirements .* still missing/);
    assert.match(t.share.missing, loc === "de" ? /fehlen noch Voraussetzungen/ : /requirements .* still missing/);
  }
});

test("Der Vergleich wird nur bei Bereitschaft geholt - der Client setzt nichts zusammen", () => {
  const teamPage = code(TEAM_PAGE);
  assert.match(teamPage, /readiness\.status === "ready" \? await loadTradeoffsComparison/);
  // Kein Lesen fremder Antworten ueber Tabellen: nur die beiden RPCs.
  assert.doesNotMatch(teamPage, /\.from\(|alignment_answers|assessments/);
  const data = code(join(TRADEOFFS, "teamData.ts"));
  assert.deepEqual([...data.matchAll(/\.rpc\(\s*"([a-z_]+)"/g)].map((m) => m[1]), ["get_tradeoffs_team_readiness", "get_tradeoffs_team_comparison"]);
  assert.doesNotMatch(data, /\.from\(/);
  // Kein Teilbericht, kein Fallback: ohne `ready` gibt es die Zeilen nicht.
  assert.match(teamPage, /comparison\?\.status === "ready" \? compareTradeoffs/);
  // Nicht lesbar oder kein Mitglied: nichts ueber das Team.
  assert.match(teamPage, /if \(!readiness\) return <TeamUnavailable/);
});

test("Parser: ein unbekanntes oder dünnes Format ist nie bereit", () => {
  assert.equal(parseTradeoffsReadiness(null), null);
  assert.equal(parseTradeoffsReadiness({ status: "ready" }), null);
  assert.equal(parseTradeoffsReadiness({ status: "bereit", own: { state: "completed" } }), null);
  assert.equal(parseTradeoffsComparison({ status: "ready", people: [] }), null);
  assert.equal(parseTradeoffsComparison({ status: "ready", people: [{ person_id: "p", answers: [] }] }), null, "ein Vergleich braucht mindestens zwei");
  assert.deepEqual(parseTradeoffsComparison({ status: "not_ready" }), { status: "not_ready" });
});

const person = (id: string, name: string, values: Record<string, Record<string, unknown> | null>, missing: Record<string, string> = {}): TradeoffsComparisonPerson => ({
  personId: id,
  name,
  isViewer: id === "a",
  answers: Object.keys({ ...values, ...missing }).map((key) => ({ item_key: key, value: values[key] ?? null, missing_reason: missing[key] ?? null })),
});

test("path_and_weights: gleich, verschieden und offen - beschreibend, ohne Wertung", () => {
  const same = { importanceA: 4, importanceB: 2, path: "A" };
  const rows = compareTradeoffs(tradeoffItems(), [
    person("a", "Anna", { W03: same, W04: { importanceA: 5, importanceB: 2, path: "A" }, W05: same, W06: same }, {}),
    person("b", "Ben", { W03: same, W04: { importanceA: 2, importanceB: 5, path: "B" }, W05: { importanceA: 4, importanceB: 2, path: "other" } }, { W06: "not_decided" }),
  ]);
  assert.deepEqual(rows.map((r) => r.itemId), ["W03", "W04", "W05", "W06"]);
  assert.deepEqual([rows[0]!.weights, rows[0]!.paths], ["same", "same"]);
  assert.deepEqual([rows[1]!.weights, rows[1]!.paths], ["different", "different"]);
  // „anderer Weg" und ein Auslassungsgrund sind nicht vergleichbar - der Vergleich sagt dazu nichts.
  assert.equal(rows[2]!.paths, "open");
  assert.equal(rows[2]!.weights, "same");
  assert.deepEqual([rows[3]!.weights, rows[3]!.paths], ["open", "open"]);
  assert.equal(rows[3]!.cells[1]!.missingLabel !== null, true);
  // Jede Person hat in jeder Situation eine Zelle - dieselben Zellen fuer jede lesende Person.
  assert.ok(rows.every((r) => r.cells.length === 2));
  // Die Beschriftungen kommen aus der Registry.
  assert.ok(rows[0]!.cells[0]!.weights.length === 2 && rows[0]!.cells[0]!.path.kind === "chosen");
});

test("path_and_weights ist conversation_only: keine Zahl, kein Prozent, keine Ampel, kein Ranking, kein „passt\"", () => {
  const forbidden = /score|prozent|percent|%|ampel|traffic|match|ranking|rang\b|gewinner|winner|risiko|risk|kompatib|compatib|passt (gut|schlecht)|fit (well|badly)|konflikt\b|conflict\b/i;
  for (const loc of ["de", "en"]) {
    const t = JSON.parse(read(`messages/${loc}/ventureTradeoffs.json`));
    const text = JSON.stringify({ compare: t.compare, share: t.share, team: t.team });
    // „bewertet nicht, wie gut ihr zusammenpasst" verneint - das ist die Abgrenzung, keine Wertung.
    const bereinigt = text.replace(/(bewertet nicht[^"]*|does not assess[^"]*)/g, "");
    assert.doesNotMatch(bereinigt, forbidden, loc);
  }
  const comparison = code(join(UI, "TradeoffsComparison.tsx"));
  assert.doesNotMatch(comparison, /score|percent|ampel|rank\(|sort\(|%/i);
  // Die erlaubten Formulierungen stehen da.
  const de = JSON.parse(read("messages/de/ventureTradeoffs.json")).compare;
  assert.match(de.weights.different, /unterschiedlich gewichtet/);
  assert.match(de.talk, /Erwartungen abzugleichen/);
  assert.match(de.paths.different, /unterschiedliche Schwerpunkte/);
});

test("derselbe Bericht fuer alle: der Vergleich kennt die Rolle der lesenden Person nicht", () => {
  const items = tradeoffItems();
  const v = { importanceA: 5, importanceB: 2, path: "A" };
  const w = { importanceA: 2, importanceB: 5, path: "B" };
  const asA = compareTradeoffs(items, [person("a", "Anna", { W03: v }), person("b", "Ben", { W03: w })]);
  const asB = compareTradeoffs(items, [person("a", "Anna", { W03: v }).isViewer ? { ...person("a", "Anna", { W03: v }), isViewer: false } : person("a", "Anna", { W03: v }), { ...person("b", "Ben", { W03: w }), isViewer: true }]);
  const strip = (rows: typeof asA) => rows.map((r) => ({ ...r, cells: r.cells.map(({ isViewer: _drop, ...c }) => c) }));
  assert.deepEqual(strip(asA), strip(asB));
  // Der Renderer unterscheidet nur das Wort „Du" an der eigenen Spalte - kein Owner-, Admin- oder Advisor-Zweig.
  assert.doesNotMatch(code(join(UI, "TradeoffsComparison.tsx")), /owner|admin|advisor|role/i);
});

test("kein Advisor- und kein FIND-Zugriff ueber dieses Modul", () => {
  for (const file of [PAGE, TEAM_PAGE, join(UI, "TradeoffsTeamCard.tsx"), join(UI, "TradeoffsSharePanel.tsx"), join(UI, "TradeoffsComparison.tsx"), join(TRADEOFFS, "teamData.ts"), join(TRADEOFFS, "shareActions.ts")]) {
    assert.doesNotMatch(code(file), /advisor|discovery|connect|find_|network/i, file);
  }
  // Migration: Mitgliedschaft ist Pflicht, gerichtete Freigaben dieses Instruments sind verboten.
  const migration = read(join("..", "supabase", "migrations", "20261206120000_venture_tradeoffs_team_share.sql"));
  assert.match(migration, /forbid_directed_share_of_tradeoffs/);
  assert.doesNotMatch(migration.replace(/--.*$/gm, ""), /advisor_/i);
});

test("Migration: schmal und additiv - nur eine Tabelle, geschuetzte RPCs, kein Eingriff in bestehende Vertraege", () => {
  const sql = read(join("..", "supabase", "migrations", "20261206120000_venture_tradeoffs_team_share.sql")).replace(/--.*$/gm, "");
  assert.deepEqual([...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]), ["assessment_team_shares"]);
  // Keine Aenderung an bestehenden Tabellen, Policies oder Enums.
  assert.doesNotMatch(sql, /alter table public\.(?!assessment_team_shares)/);
  assert.doesNotMatch(sql, /drop (table|policy|function|trigger)|alter type/i);
  // Jede Funktion setzt den search_path leer.
  const functions = [...sql.matchAll(/create function public\.(\w+)[\s\S]*?\$\$;/g)];
  assert.ok(functions.length >= 7);
  for (const fn of functions) assert.match(fn[0], /set search_path = ''/, fn[1]);
  // Nur die Allowlist-Instrument darf geteilt werden; kein generisches Modul.
  assert.match(sql, /check\(instrument_id = 'venture-tradeoffs-v1'\)/);
  // Keine Versionstabelle (Entscheidung A: die exakte instrument_id genuegt).
  assert.doesNotMatch(sql, /module_versions/);
  // Clients koennen die Tabelle nur lesen - und nur die eigene Zeile.
  assert.match(sql, /grant select on public\.assessment_team_shares to authenticated/);
  assert.match(sql, /using \(owner_user_id = auth\.uid\(\)\)/);
});

test("Re-Assessment: ein neuer privater Durchlauf aendert den aktiven Share nicht", () => {
  // Der aktive Share liegt auf Run 1, der neueste abgegebene ist Run 2 (privat): Die Karte bleibt „bereit".
  const r = readiness({ state: "completed", shared: true, status: "ready", assessmentId: "run-2", sharedAssessmentId: "run-1" });
  assert.equal(tradeoffsCardState(r), "ready");
  const parsed = parseTradeoffsReadiness({ status: "ready", own: { state: "completed", shared: true, assessment_id: "run-2", shared_assessment_id: "run-1" } });
  assert.deepEqual(parsed?.own, { state: "completed", shared: true, assessmentId: "run-2", sharedAssessmentId: "run-1" });
  // Die Seite unterscheidet den neuesten Durchlauf vom aktiv geteilten - und der Widerruf bleibt erreichbar.
  const page = code(PAGE);
  assert.match(page, /sharedAssessmentId/);
  assert.match(page, /olderSharedId=/);
  assert.match(code(join(UI, "TradeoffsSharePanel.tsx")), /olderSharedId/);
  // Migration: Bereitschaft folgt dem aktiven Share, nicht dem neuesten Durchlauf.
  const sql = read(join("..", "supabase", "migrations", "20261206120000_venture_tradeoffs_team_share.sql")).replace(/--.*$/gm, "");
  const fn = sql.slice(sql.indexOf("create function public.tradeoffs_shared_run"), sql.indexOf("create function public.tradeoffs_team_ready"));
  assert.match(fn, /from public\.assessment_team_shares s/);
  assert.match(fn, /s\.revoked_at is null/);
  assert.doesNotMatch(fn, /order by|limit 1|newest/i);
  // Unique je Person, Team UND Instrument.
  assert.match(sql, /assessment_team_shares_one_active\s+on public\.assessment_team_shares\(owner_user_id, team_id, instrument_id\) where revoked_at is null/);
});
