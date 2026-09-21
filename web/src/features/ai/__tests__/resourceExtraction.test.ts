import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { RESOURCE_KINDS, validateResourceProposals } from "@/features/ai/resourceExtraction";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261015120000_person_resources.sql";

/**
 * Zugaenge aus veroeffentlichten Texten - der erste echte KI-Job.
 *
 * Das Verhalten der Datenbank prueft `supabase/tests/person_resources.sql` mit
 * 14 pgTAP-Faellen, darunter der wichtigste: Ein erfundenes Zitat wird von der
 * DATENBANK abgewiesen. Hier steht die erste Stufe derselben Pruefung und die
 * Zusagen der Oberflaeche.
 */

const TEXT =
  "Zugang zu Kliniken\n" +
  "Ich kenne Einkaufsleitungen in mehreren Universitätskliniken und kann dort vorstellen. " +
  "Außerdem habe ich ein kleines Labor, das mitbenutzt werden kann.";

test("ein Zitat, das nicht im Text steht, faellt weg", () => {
  const proposals = validateResourceProposals(
    {
      resources: [
        { kind: "network", label: "Einkaufsleitungen in Universitätskliniken", quote: "Ich kenne Einkaufsleitungen in mehreren Universitätskliniken" },
        { kind: "network", label: "Investoren im Deep-Tech-Bereich", quote: "Ich kenne Investoren im Deep-Tech-Bereich" },
      ],
    },
    TEXT
  );

  assert.deepEqual(
    proposals.map((proposal) => proposal.label),
    ["Einkaufsleitungen in Universitätskliniken"]
  );
});

test("Leerraum darf sich unterscheiden, der Wortlaut nicht", () => {
  const ok = validateResourceProposals(
    { resources: [{ kind: "offer", label: "Labor zur Mitbenutzung", quote: "ein kleines Labor,\n  das mitbenutzt werden kann" }] },
    TEXT
  );
  assert.equal(ok.length, 1);

  // Ein umformuliertes Zitat ist kein Zitat.
  const nope = validateResourceProposals(
    { resources: [{ kind: "offer", label: "Labor", quote: "ein kleines Labor, das man mitbenutzen darf" }] },
    TEXT
  );
  assert.deepEqual(nope, []);
});

test("eine unbekannte Art kommt nicht durch", () => {
  const proposals = validateResourceProposals(
    { resources: [{ kind: "geheimwissen", label: "Etwas", quote: "Ich kenne Einkaufsleitungen in mehreren" }] },
    TEXT
  );
  assert.deepEqual(proposals, []);
});

test("Unfug fuehrt zu einer leeren Liste, nicht zu einem Absturz", () => {
  for (const answer of [null, undefined, 42, "nein", { resources: "viele" }, { resources: [null] }]) {
    assert.deepEqual(validateResourceProposals(answer, TEXT), []);
  }
});

test("ein einzelnes Wort belegt nichts, und eine leere Bezeichnung ist keine", () => {
  const proposals = validateResourceProposals(
    {
      resources: [
        { kind: "network", label: "Kliniken", quote: "Kliniken" },
        { kind: "network", label: "", quote: "Ich kenne Einkaufsleitungen in mehreren" },
      ],
    },
    TEXT
  );
  assert.deepEqual(proposals, []);
});

test("hoechstens fuenf, und keine doppelten Bezeichnungen", () => {
  const quote = "Ich kenne Einkaufsleitungen in mehreren Universitätskliniken";
  const proposals = validateResourceProposals(
    {
      resources: [
        { kind: "network", label: "Kliniken", quote },
        { kind: "network", label: "kliniken", quote },
        { kind: "network", label: "Kliniken A", quote },
        { kind: "network", label: "Kliniken B", quote },
        { kind: "network", label: "Kliniken C", quote },
        { kind: "network", label: "Kliniken D", quote },
        { kind: "network", label: "Kliniken E", quote },
      ],
    },
    TEXT
  );
  assert.equal(proposals.length, 5);
  assert.equal(new Set(proposals.map((p) => p.label.toLowerCase())).size, 5);
});

// ---------------------------------------------------------------------------
// Die Zusagen dahinter
// ---------------------------------------------------------------------------
test("die Datenbank prueft den Beleg ein zweites Mal", () => {
  // DAS IST DIE EIGENTLICHE ZUSAGE: Sie haelt auch dann, wenn der Prompt
  // schlecht formuliert ist, das Modell schwach antwortet oder die Pruefung
  // oben einen Fehler hat.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /v_normalized_source := regexp_replace\(lower\(v_source\), '\\s\+', ' ', 'g'\)/);
  assert.match(migration, /if position\(v_normalized_quote in v_normalized_source\) = 0 then return false; end if;/);
  // Und ohne Beleg gibt es einen maschinellen Eintrag gar nicht.
  assert.match(migration, /person_resources_evidence_required check/);
});

test("niemand kann sich selbst einen Vorschlag schreiben", () => {
  // Ein Eintrag mit origin='model' waere die Behauptung, ein Modell habe das
  // gesagt - und Traeger der Beweislast waere niemand.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /with check \(user_id = auth\.uid\(\) and origin = 'self'\)/);
  // Selbst eingetragen heisst bestaetigt; ein eigener Eintrag, der auf
  // Zustimmung wartet, waere ein Widerspruch.
  assert.match(migration, /person_resources_self_is_confirmed check/);
});

test("der Vorschlag gehoert der Person, deren Text gelesen wurde", () => {
  // Der Arbeiter kann nicht bestimmen, WEM er etwas zuschreibt: Die Funktion
  // nimmt die subject_user_id der Aufgabe, nicht einen Parameter.
  const migration = sqlCodeOnly(MIGRATION);
  const fn = migration.slice(migration.indexOf("function public.insert_ai_resource_proposal"));
  assert.match(fn, /v_job\.subject_user_id, p_kind/);
  assert.doesNotMatch(fn, /p_user_id/);
});

test("nur veroeffentlichte Texte werden ausgewertet", () => {
  // Ein Entwurf ist fuer niemanden sichtbar, auch nicht fuer ein Modell. Und
  // was zurueckgezogen wurde, wird nicht mehr herausgegeben.
  const migration = sqlCodeOnly(MIGRATION);
  assert.equal((migration.match(/status = 'active'/g) ?? []).length, 2, "Anzeige und Problem");

  const actions = codeOnly("src/features/connect/connectActions.ts");
  const enqueueAt = actions.indexOf('p_job_type: "connect_resource_extraction"');
  const publishAt = actions.indexOf("if (publish) {");
  assert.ok(publishAt > 0 && enqueueAt > publishAt, "die Aufgabe entsteht ausserhalb des publish-Zweigs");
});

test("der Arbeiter liest den Text ueber die enge Funktion, nicht aus der Tabelle", () => {
  const worker = codeOnly("scripts/ai-worker.ts");
  assert.match(worker, /rpc\("get_ai_job_source_text"/);
  assert.doesNotMatch(worker, /from\("network_listings"\)/);
  assert.doesNotMatch(worker, /from\("network_problems"\)/);
  // Und jeder Vorschlag geht einzeln hinein - ein abgewiesener nimmt die
  // anderen nicht mit.
  assert.match(worker, /for \(const proposal of proposals\)/);
});

test("nichts gilt, bevor ein Mensch zugestimmt hat", () => {
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /'model', 'pending'/);

  const actions = codeOnly("src/features/ai/resourceProposalActions.ts");
  assert.match(actions, /\.eq\("status", "pending"\)/);
  assert.match(actions, /\.eq\("user_id", user\.id\)/);

  // Verworfen heisst nicht geloescht: Sonst kaeme derselbe Vorschlag bei der
  // naechsten Veroeffentlichung wieder.
  assert.match(actions, /status, decided_at/);
  const data = codeOnly("src/features/ai/personResources.ts");
  assert.match(data, /\.in\("status", \["pending", "confirmed"\]\)/);
});

test("jeder Vorschlag zeigt seinen Beleg", () => {
  // Ohne das Zitat muesste man einer Maschine glauben oder ihr misstrauen -
  // mit dem Zitat kann man nachsehen.
  const section = codeOnly("src/features/ai/ResourceProposalSection.tsx");
  assert.match(section, /proposal\.evidenceQuote/);
  assert.match(section, /<blockquote/);
});

test("jede Art und jeder Text stehen in beiden Sprachen da", () => {
  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        resources?: { kinds?: Record<string, string> } & Record<string, unknown>;
      }
    ).resources;
    assert.ok(copy, `${locale}: connect.resources fehlt`);
    for (const key of ["title", "text", "pendingTitle", "confirmedTitle", "quote", "confirm", "reject", "privateNote"]) {
      assert.ok(copy[key], `${locale}: connect.resources.${key} fehlt`);
    }
    for (const kind of RESOURCE_KINDS) {
      assert.ok(copy.kinds?.[kind], `${locale}: kinds.${kind} fehlt`);
    }
    // Der Text muss sagen, dass nichts ohne Zustimmung gilt - sonst ist die
    // Zusage nur im Code wahr.
    assert.ok(String(copy.text).length > 150, `${locale}: der Text erklaert es nicht`);
    assert.ok(String(copy.privateNote).length > 60, `${locale}: die Sichtbarkeit bleibt unklar`);
  }
});
