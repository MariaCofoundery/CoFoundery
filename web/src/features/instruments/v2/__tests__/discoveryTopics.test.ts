import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  compareCandidatesByTopics,
  fulfilmentOf,
  getDiscoveryTopics,
  judgeTopic,
  type TopicVerdict,
} from "@/features/instruments/v2/discoveryTopics";
import { buildReadout, type StoredAnswerRow } from "@/features/instruments/v2/alignmentReadout";

const row = (partial: Partial<StoredAnswerRow> & { block_id: string }): StoredAnswerRow => ({
  answer_format: "F", value: null, missing_code: null, ...partial,
});
const scale = (blockId: string, n: number) => row({ block_id: blockId, answer_format: "F", value: { scale: n } });
const topic = (key: string) => getDiscoveryTopics().find((entry) => entry.key === key)!;

test("es gibt Themen, keine Gewichte", () => {
  // DER KERN DER ENTSCHEIDUNG. Wichtigkeiten je Dimension, gewichtet
  // verrechnet, ergeben einen Passungswert mit Zwischenschritten - und Teil F5
  // verbietet ihn. Hier gibt es nur: „dieses Thema ist mir wichtig", ja oder
  // nein.
  const topics = getDiscoveryTopics();
  assert.equal(topics.length, 12);
  for (const entry of topics) {
    assert.ok(entry.blockIds.length >= 2, entry.key);
    assert.ok(entry.rule.trim(), `${entry.key}: die Regel muss dastehen`);
    // Kein Gewicht, kein Faktor, keine Punktzahl an einem Thema.
    assert.ok(!Object.keys(entry).some((key) => /weight|score|factor|points/i.test(key)));
  }
});

test("gleiche und benachbarte Antworten gelten als ähnlich, weiter entfernte nicht", () => {
  const a = buildReadout([scale("A01", 3), scale("A02", 3)]);
  assert.equal(judgeTopic(topic("P_A"), a, buildReadout([scale("A01", 3), scale("A02", 3)])).state, "similar");
  assert.equal(judgeTopic(topic("P_A"), a, buildReadout([scale("A01", 4), scale("A02", 2)])).state, "similar");
  assert.equal(judgeTopic(topic("P_A"), a, buildReadout([scale("A01", 5), scale("A02", 3)])).state, "different");
});

test("alle gemeinsam beantworteten Fragen müssen passen, nicht die Mehrheit", () => {
  // Wer sagt „hier ist mir Ähnlichkeit wichtig", meint nicht „in zwei von drei
  // Fällen" - und eine Mehrheit wäre wieder eine Verrechnung.
  const mine = buildReadout([scale("A01", 1), scale("A02", 1)]);
  const theirs = buildReadout([scale("A01", 1), scale("A02", 5)]);
  const verdict = judgeTopic(topic("P_A"), mine, theirs);
  assert.equal(verdict.state, "different");
  assert.deepEqual(verdict.differsAt, ["A02"]);
});

test("die Basis wird immer genannt", () => {
  // Teil F2: „…werden Unterschiede zunächst auf den mindestens drei gemeinsam
  // beantworteten Items berechnet und diese Basis genannt." Ein „passt" auf
  // Grundlage einer Frage ist etwas anderes als eines auf Grundlage von vier.
  const mine = buildReadout([scale("A01", 3), scale("A02", 3)]);
  const theirs = buildReadout([scale("A01", 3)]);
  const verdict = judgeTopic(topic("P_A"), mine, theirs);
  assert.equal(verdict.state, "similar");
  assert.equal(verdict.basisComparable, 1);
  assert.equal(verdict.basisTotal, 2);
});

test("wer nichts geteilt hat, wird nicht aussortiert", () => {
  // Nicht beantwortet, ausgelassen oder nicht geteilt zählt NICHT gegen
  // jemanden - es zählt nur nicht mit.
  const mine = buildReadout([scale("A01", 3), scale("A02", 3)]);
  const theirs = buildReadout([
    row({ block_id: "A01", answer_format: "F", missing_code: "prefer_not_to_say" }),
    row({ block_id: "A02", answer_format: "F", missing_code: "cannot_assess" }),
  ]);
  const verdict = judgeTopic(topic("P_A"), mine, theirs);
  assert.equal(verdict.state, "not_assessable");
  assert.equal(verdict.basisComparable, 0);
  assert.deepEqual(verdict.differsAt, []);
});

test("Freitext zählt nicht mit, statt als Unterschied zu gelten", () => {
  // DAS WAR EIN ECHTER FEHLER IN DER ERSTEN FASSUNG: Freitext gab „nicht
  // ähnlich" zurück und hätte damit ein Thema dauerhaft auf „unterschiedlich"
  // festgenagelt - obwohl niemand etwas gemessen hat. Ein Unterschied, der
  // jemanden aussortiert, darf nicht aus einer Wissenslücke entstehen.
  const mine = buildReadout([
    row({ block_id: "R01", answer_format: "number_range", value: { min: 20, max: 30, unit: "Stunden/Woche" } }),
    row({ block_id: "R03", answer_format: "time_windows", value: { windows: [{ days: ["Mo"], from: "09:00", to: "12:00" }] } }),
  ]);
  const theirs = buildReadout([
    row({ block_id: "R01", answer_format: "number_range", value: { min: 25, max: 40, unit: "Stunden/Woche" } }),
    row({ block_id: "R03", answer_format: "time_windows", value: { windows: [{ days: ["Fr"], from: "14:00", to: "18:00" }] } }),
  ]);
  const verdict = judgeTopic(topic("C_commitment"), mine, theirs);
  assert.equal(verdict.state, "similar", "die Zeitfenster dürfen nicht dagegen zählen");
  assert.equal(verdict.basisComparable, 1, "nur die Stundenangabe zählt mit");
});

test("Bereiche werden über Überlappung verglichen, nicht über Mittelpunkte", () => {
  // Teil F3 verbietet den Mittelpunktvergleich ausdrücklich. 10–40 und 20–25
  // haben verschiedene Mitten und überlappen trotzdem vollständig.
  const mine = buildReadout([row({ block_id: "R01", answer_format: "number_range", value: { min: 10, max: 40, unit: "Stunden/Woche" } })]);
  const theirs = buildReadout([row({ block_id: "R01", answer_format: "number_range", value: { min: 20, max: 25, unit: "Stunden/Woche" } })]);
  assert.equal(judgeTopic(topic("C_commitment"), mine, theirs).state, "similar");

  // Auch ein Bereich, der nur am Rand hineinragt, ueberlappt.
  const touching = buildReadout([row({ block_id: "R01", answer_format: "number_range", value: { min: 5, max: 12, unit: "Stunden/Woche" } })]);
  assert.equal(judgeTopic(topic("C_commitment"), mine, touching).state, "similar");
  const wayApart = buildReadout([row({ block_id: "R01", answer_format: "number_range", value: { min: 50, max: 60, unit: "Stunden/Woche" } })]);
  assert.equal(judgeTopic(topic("C_commitment"), mine, wayApart).state, "different");
});

test("nirgends entsteht eine Zahl, die einen Menschen beschreibt", () => {
  // DIE UNTERSCHEIDUNG, AUF DIE ES ANKOMMT - und die erste Fassung dieses
  // Tests hat sie verfehlt: Sie verbot jedes `sort(` und schlug an, als die
  // Themen nach dem selbst gesetzten Rang geordnet wurden.
  //
  // Ein SCORE ist eine Funktion von EINEM Kandidaten auf eine Zahl. Die ist
  // verboten: Sie beschreibt einen Menschen und laesst einen Fehltreffer
  // durch harmlose Gemeinsamkeiten verdecken.
  //
  // Ein VERGLEICH ist eine Funktion von ZWEI Kandidaten auf eine Reihenfolge.
  // Der ist erlaubt und noetig - eine Liste braucht eine Reihenfolge, und
  // diese hier addiert nichts.
  const source = readFileSync("src/features/instruments/v2/discoveryTopics.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const forbidden of [/\.reduce\(/, /\bscore\b/i, /\bweight/i, /matchPercent/i]) {
    assert.ok(!forbidden.test(code), `${forbidden} im Discovery-Modul`);
  }

  // GEZAEHLT WIRD SEHR WOHL - nur innerhalb EINES Themas, und zwar die
  // Basis. Teil F2 verlangt das ausdruecklich: "...und diese Basis genannt."
  // Ein Verbot jeder Zaehlung haette genau diese Pflicht getroffen; die dritte
  // Fassung dieses Tests schlug daran an.
  assert.match(code, /comparable \+= 1/);

  // Keine exportierte Funktion nimmt EINEN Kandidaten und gibt eine Zahl.
  const singleArgNumber = /export function \w+\((?![^)]*,)[^)]*\)\s*:\s*number/;
  assert.ok(!singleArgNumber.test(code), "keine Funktion, die einen Menschen auf eine Zahl abbildet");

  // Und der Vergleich nimmt wirklich zwei.
  assert.match(code, /export function compareCandidatesByTopics\(\s*a: readonly TopicVerdict\[\],\s*b: readonly TopicVerdict\[\]\s*\): number/);
});

test("Code und Datenbank kennen dieselben Themen", () => {
  // EINE BEWUSSTE DOPPELUNG. Der Vergleich muss in der Datenbank stattfinden,
  // weil niemand die Antworten Fremder lesen darf - die Oberfläche braucht die
  // Themen aber zur Übersetzungszeit. Doppelungen laufen auseinander, also
  // liest dieser Test die Migration, statt ihren Inhalt zu behaupten.
  //
  // Was sonst passiert: Ein Thema steht in der Auswahl, die Datenbank kennt es
  // nicht, und der Filter findet stillschweigend niemanden.
  const MIGRATIONS = "../supabase/migrations";
  const sql = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");

  const start = sql.indexOf("into public.discovery_alignment_topic_blocks");
  assert.ok(start > 0, "die Zuordnung steht in keiner Migration");
  const block = sql.slice(start, sql.indexOf(";", start));

  const inDatabase = new Map<string, string[]>();
  for (const match of block.matchAll(/\('([A-Za-z_]+)','([A-Z][0-9]{2})'\)/g)) {
    inDatabase.set(match[1], [...(inDatabase.get(match[1]) ?? []), match[2]]);
  }
  assert.ok(inDatabase.size >= 12, `zu wenige Themen gefunden: ${inDatabase.size}`);

  const drift: string[] = [];
  for (const entry of getDiscoveryTopics()) {
    const theirs = inDatabase.get(entry.key);
    if (!theirs) drift.push(`${entry.key}: fehlt in der Datenbank`);
    else if (theirs.slice().sort().join(",") !== entry.blockIds.slice().sort().join(",")) {
      drift.push(`${entry.key}: ${entry.blockIds.join(",")} vs ${theirs.join(",")}`);
    }
  }
  for (const key of inDatabase.keys()) {
    if (!getDiscoveryTopics().some((entry) => entry.key === key)) {
      drift.push(`${key}: steht nur in der Datenbank`);
    }
  }
  assert.deepEqual(drift, [], drift.join("\n"));
});

test("die Ähnlichkeitsregel lautet auf beiden Seiten gleich", () => {
  // Die Regel steht zweimal: in TypeScript für den Fall, dass beide Antworten
  // vorliegen, und in SQL für Discovery, wo das nie der Fall ist. Auch das ist
  // eine Doppelung - hier geprüft an den Stellen, an denen sie zählt.
  const MIGRATIONS = "../supabase/migrations";
  const sql = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");

  // Fünferskala: höchstens eine Stufe Unterschied.
  assert.match(sql, /abs\(\(pairs\.mine ->> 'scale'\)::numeric - \(pairs\.theirs ->> 'scale'\)::numeric\) <= 1/);
  // Bereiche über die Überlappung, nicht über die Mittelpunkte.
  assert.match(sql, /coalesce\(\(pairs\.theirs ->> 'max'\)::numeric, \(pairs\.theirs ->> 'min'\)::numeric\)/);
  // Und Unbeurteilbares zählt nicht mit, statt als Unterschied zu gelten.
  assert.match(sql, /else null\s*\n\s*end as similar/);
  assert.match(sql, /count\(judged\.similar\) = 0 then 'not_assessable'/);
  // Alle müssen passen, nicht die Mehrheit.
  assert.match(sql, /bool_and\(judged\.similar\) then 'similar'/);
});

// ---------------------------------------------------------------------------
// Alle Themen regelbar - seit dem 28.09.2026
// ---------------------------------------------------------------------------

const verdict = (
  topicKey: string, rank: number, wish: "similar" | "different",
  state: "similar" | "different" | "not_assessable"
): TopicVerdict => ({ topicKey, rank, wish, state, basisComparable: 2, basisTotal: 2, differsAt: [] });

test("ein Wunsch kann Ähnlichkeit oder Unterschied sein", () => {
  // „different" IST EIN WUNSCH, KEINE THESE. Dass Unterschiede in einem
  // Bereich günstiger wären, ist durch nichts belegt - das Gutachten warnt
  // ausdrücklich vor „kleinere Differenz = besser" und ebenso vor der
  // Umkehrung. Es ist die Suchvorgabe einer Person.
  assert.equal(fulfilmentOf(verdict("P_A", 1, "similar", "similar")), "met");
  assert.equal(fulfilmentOf(verdict("P_A", 1, "different", "different")), "met");
  assert.equal(fulfilmentOf(verdict("P_A", 1, "different", "similar")), "unmet");
});

test("unbekannt ist kein Fehltreffer", () => {
  // Wer eine Frage ausgelassen oder nicht geteilt hat, hat den Wunsch nicht
  // verfehlt - es ist nur nichts darüber bekannt.
  assert.equal(fulfilmentOf(verdict("P_A", 1, "similar", "not_assessable")), "unknown");
});

test("ein Fehltreffer bei Thema 1 lässt sich nicht wegmitteln", () => {
  // DAS IST DIE GANZE ANTWORT AUF „alle Themen regeln". Die naheliegende
  // Sortierung wäre „wie viele deiner Wünsche treffen zu" - eine Zahl über
  // alle Themen, also der Passungswert mit selbst gesetzten Gewichten. Teil
  // F5: Ein globaler Wert „könnte eine ausdrückliche Haftungsgrenze durch
  // mehrere harmlose Gemeinsamkeiten verdecken."
  const wichtigVerfehlt = [
    verdict("P_A", 1, "similar", "different"),
    verdict("P_I", 2, "similar", "similar"),
    verdict("P_E", 3, "similar", "similar"),
    verdict("P_U", 4, "similar", "similar"),
  ];
  const nurThemaVierVerfehlt = [
    verdict("P_A", 1, "similar", "similar"),
    verdict("P_I", 2, "similar", "different"),
    verdict("P_E", 3, "similar", "different"),
    verdict("P_U", 4, "similar", "different"),
  ];

  // Nach Punkten läge der erste vorn (3 Treffer gegen 1). Lexikografisch
  // nicht: Thema 1 entscheidet, und dort liegt er daneben.
  assert.ok(compareCandidatesByTopics(nurThemaVierVerfehlt, wichtigVerfehlt) < 0);
  assert.ok(compareCandidatesByTopics(wichtigVerfehlt, nurThemaVierVerfehlt) > 0);
});

test("bei Gleichstand entscheidet das nächste Thema", () => {
  const a = [verdict("P_A", 1, "similar", "similar"), verdict("P_I", 2, "similar", "similar")];
  const b = [verdict("P_A", 1, "similar", "similar"), verdict("P_I", 2, "similar", "different")];
  assert.ok(compareCandidatesByTopics(a, b) < 0);
  assert.equal(compareCandidatesByTopics(a, [...a]), 0);
});

test("die Sortierung addiert nichts", () => {
  // Kein Zähler, keine Summe, kein Prozentwert - auch nicht im Vergleich
  // zweier Kandidaten.
  const source = readFileSync("src/features/instruments/v2/discoveryTopics.ts", "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of [/\.reduce\(/, /\bfilter\([^)]*\)\.length/, /\bcount\b/i, /\bscore\b/i]) {
    assert.ok(!forbidden.test(code), `${forbidden} im Discovery-Modul`);
  }
});

test("es gibt keine Obergrenze mehr, und die Datenbank kennt den Wunsch", () => {
  const MIGRATIONS = "../supabase/migrations";
  const sql = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
    .join("\n");

  assert.match(sql, /drop trigger discovery_alignment_topics_limit/);
  assert.match(sql, /check \(wish in \('similar', 'different'\)\)/);
  // Und die Reihenfolge ist ein Rang, kein Gewicht - sie taucht in keiner
  // Rechnung auf.
  assert.match(sql, /order by summed\.rank, summed\.topic_key/);
  assert.ok(!/rank \*|sum\(.*rank/i.test(sql), "der Rang wird nirgends verrechnet");
});

test("die Oberfläche hat keine Schieberegler und keine Sternchen", () => {
  // Es gibt keine Gewichte, also darf es auch nichts geben, das wie eines
  // aussieht. Die Reihenfolge ist das Bedienelement - sie macht aus „mir ist
  // das wichtiger" eine Entscheidung statt einer Zahl.
  const form = readFileSync("src/features/instruments/v2/DiscoveryTopicsForm.tsx", "utf8");
  const markup = form.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of [/type="range"/, /slider/i, /★|⭐/, /importance|gewicht/i, /%/]) {
    assert.ok(!forbidden.test(markup), `${forbidden} in der Themenauswahl`);
  }
  // Drei Zustände je Thema: egal, ähnlich, unterschiedlich.
  assert.match(markup, /\(\[null, "similar", "different"\] as const\)/);
});

test("die Regel steht an jedem Thema", () => {
  // „Gleiche Antwort oder höchstens eine Stufe Unterschied" ist eine
  // Verabredung, keine Erkenntnis - wer danach filtert, soll wissen, was der
  // Filter getan hat.
  const form = readFileSync("src/features/instruments/v2/DiscoveryTopicsForm.tsx", "utf8");
  assert.match(form, /topic\.rule/);
  for (const topic of getDiscoveryTopics()) {
    assert.ok(topic.rule.length > 10, `${topic.key}: die Regel ist zu knapp`);
  }
});
