import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * KI nur nach ausdruecklicher Anforderung.
 *
 * ENTSCHIEDEN AM 13.10.2026: Die freiwilligen KI-Funktionen bleiben Teil der
 * Closed Beta, aber kein Freitext geht an das Modell, ohne dass die Person
 * die jeweilige Funktion bewusst angefordert hat. Bis dahin ging jeder
 * CONNECT-Eintrag beim ersten Veroeffentlichen automatisch in die
 * Warteschlange - das ist hier ausgeschlossen.
 */

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const messages = (locale: string, file: string) =>
  JSON.parse(source(join("messages", locale, `${file}.json`)));

const ACTIONS = "src/features/connect/connectActions.ts";
const REQUEST = "src/features/connect/connectAiActions.ts";
const SECTION = "src/features/connect/ListingAiSection.tsx";
const PAGE = "src/app/(product)/connect/listings/[listingId]/page.tsx";

function productFiles(dir = "src"): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : productFiles(path);
    return /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

/** Der Rumpf genau einer exportierten Funktion. */
function body(code: string, name: string) {
  const from = code.indexOf(`export async function ${name}`);
  assert.ok(from >= 0, name);
  const next = code.indexOf("export async function", from + 1);
  return code.slice(from, next < 0 ? undefined : next);
}

test("Veroeffentlichen eines CONNECT-Eintrags erzeugt keinen KI-Auftrag", () => {
  const actions = codeOnly(ACTIONS);
  assert.doesNotMatch(actions, /enqueue_ai_job|connect_resource_extraction|ai_jobs|askModelForJson/);
  // Auch nicht ueber einen Umweg in den Speichern- oder Statuswechsel-Aktionen.
  for (const name of ["saveConnectListingAction", "changeConnectListingStatusAction"]) {
    assert.doesNotMatch(body(actions, name), /rpc\("(enqueue_ai_job|request_[a-z_]*proposals)"/, name);
  }
});

test("ein KI-Auftrag entsteht nur ueber die ausdruecklichen Anforderungs-Aktionen", () => {
  // Jede Stelle im Produktcode, die eine KI-Aufgabe anlegt.
  const callers = productFiles().flatMap((path) => {
    const code = codeOnly(path);
    return [...code.matchAll(/rpc\("(enqueue_ai_job|request_capability_area_proposals|request_direction_statement_proposals)"/g)]
      .map((match) => `${path.split("\\").join("/")}:${match[1]}`);
  });
  assert.deepEqual(callers.sort(), [
    "src/features/capability/capabilityInterviewActions.ts:request_capability_area_proposals",
    `${REQUEST}:enqueue_ai_job`,
    "src/features/direction/directionStatementActions.ts:request_direction_statement_proposals",
    "src/features/direction/directionStatementActions.ts:request_direction_statement_proposals",
  ].sort());

  // Die CONNECT-Aktion haengt an genau einem Knopf: dem Formular im Abschnitt.
  const users = productFiles()
    .filter((path) => path !== REQUEST && codeOnly(path).includes("requestListingResourceProposalsAction"));
  assert.deepEqual(users, [SECTION]);
  assert.match(codeOnly(SECTION), /<form action=\{requestListingResourceProposalsAction\}/);

  // Und sie legt genau diese eine Art Arbeit an, fuer genau diesen Eintrag.
  const request = codeOnly(REQUEST);
  assert.match(request, /p_job_type: "connect_resource_extraction",\s*p_source_table: "network_listings",\s*p_source_id: listing\.id,/);
});

test("nur der Eigentuemer eines aktiven Eintrags bei erreichbarer KI kann anfordern", () => {
  const request = codeOnly(REQUEST);
  const enqueueAt = request.indexOf('rpc("enqueue_ai_job"');
  const before = request.slice(0, enqueueAt);

  // Eigentum: Der Eintrag wird nur gefunden, wenn er dieser Person gehoert.
  assert.match(before, /\.eq\("owner_user_id", user\.id\)/);
  assert.match(before, /if \(error \|\| !listing\) redirect\(/);
  // Aktiv und nicht abgelaufen.
  assert.match(before, /listing\.status === "active" &&\s*Boolean\(listing\.expires_at && new Date\(listing\.expires_at\) > new Date\(\)\)/);
  assert.match(before, /if \(!active\) redirect\(/);
  // Erreichbare KI.
  assert.match(before, /if \(!\(await getAiAvailability\(client\)\)\) redirect\(/);
  // Die Kennung kommt aus der Datenbankzeile, nicht aus dem Formular.
  assert.doesNotMatch(request.slice(enqueueAt), /listingId/);
});

test("der Abschnitt steht nur beim eigenen, aktiven Eintrag und bei erreichbarer KI", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /const ownActive = own && listing\.status === "active" && Boolean\(listing\.expires_at && new Date\(listing\.expires_at\) > new Date\(\)\);/);
  assert.match(page, /\{ownActive && aiAvailable \? <ListingAiSection /);
  assert.equal(page.split("<ListingAiSection").length, 2, "genau eine Stelle");
  // Fremde Eintraege fragen die Verfuegbarkeit gar nicht erst ab.
  assert.match(page, /ownActive\s*\? await Promise\.all\(\[getAiAvailability\(client\)/);
});

test("der Hinweis steht vor dem Knopf und sagt, was passiert", () => {
  const section = codeOnly(SECTION);
  const hintAt = section.indexOf('t("askText")');
  const formAt = section.indexOf("<form action=");
  assert.ok(hintAt > 0 && formAt > hintAt, "der Hinweis steht nicht vor dem Knopf");

  const expected = {
    de: [/^Freiwillig:/, /KI-Modell/, /Rechner von Made2Found/, /Titel und Beschreibung dieses Eintrags/,
      /falsch oder unvollständig/, /bewertet und entscheidet nichts/, /bevor du es bestätigst/, /selbst eintragen/],
    en: [/^Optional:/, /AI model/, /Made2Found machine/, /title and description of this listing/,
      /wrong or incomplete/, /rate or decide/, /before you confirm/, /yourself/],
  } as const;
  for (const locale of ["de", "en"] as const) {
    const copy = messages(locale, "connect").resources;
    for (const pattern of expected[locale]) assert.match(copy.askText, pattern, `${locale}: ${pattern}`);
    assert.equal(copy.ask, locale === "de" ? "Diesen Eintrag lesen lassen" : "Have this listing read");
    // Der Text nach dem Lesen behauptet nicht mehr, dass Veroeffentlichtes
    // automatisch gelesen wird.
    assert.match(copy.text, locale === "de" ? /ausdrücklich hast lesen lassen/ : /explicitly asked/);
    for (const text of [copy.askTitle, copy.askText, copy.askDone, ...Object.values(copy.notice as Record<string, string>)]) {
      assert.doesNotMatch(text, /\d+\s?%|Score|Punktzahl|Bewertung:|kompatib|compatib/i, `${locale}: ${text}`);
    }
  }
});

test("die Vorschlags- und Bestaetigungslogik bleibt, wie sie war", () => {
  // Der Arbeiter liest weiterhin nur ueber die enge Funktion.
  const worker = codeOnly("scripts/ai-worker.ts");
  assert.match(worker, /case "connect_resource_extraction":/);
  assert.match(worker, /rpc\("get_ai_job_source_text"/);
  assert.match(worker, /rpc\("insert_ai_resource_proposal"/);

  // Bestaetigen und Verwerfen: nur eigene, nur offene Vorschlaege.
  const decide = codeOnly("src/features/ai/resourceProposalActions.ts");
  assert.match(decide, /\.eq\("user_id", user\.id\)/);
  assert.match(decide, /\.eq\("status", "pending"\)/);
  const view = codeOnly("src/features/ai/ResourceProposalSection.tsx");
  assert.match(view, /confirmResourceProposalAction\.bind\(null, proposal\.id\)/);
  assert.match(view, /rejectResourceProposalAction\.bind\(null, proposal\.id\)/);

  // Der neue Abschnitt bestaetigt nichts und uebernimmt nichts.
  const section = codeOnly(SECTION);
  assert.doesNotMatch(section, /confirmResourceProposalAction|person_resources/);
  assert.doesNotMatch(codeOnly(REQUEST), /person_resources|insert_ai_|confirm/);
});

test("Capability und Direction bleiben freiwillig und sagen dasselbe vor dem Knopf", () => {
  // Capability: Der Knopf steht nur bei erreichbarer KI, und der Hinweis davor.
  const sort = codeOnly("src/app/(product)/profile/interview/sort/page.tsx");
  const askTextAt = sort.indexOf('t("interview.sort.askText")');
  const askFormAt = sort.indexOf("<form action={askForProposalsAction}");
  assert.ok(askTextAt > 0 && askFormAt > askTextAt);
  assert.match(sort.slice(askTextAt, askFormAt), /aiAvailable \?/);

  // Direction: ebenso.
  const direction = codeOnly("src/app/(product)/profile/direction/page.tsx");
  const withAiAt = direction.indexOf('t("done.withAi")');
  const askAllAt = direction.indexOf("<form action={askForAllDirectionProposalsAction}");
  assert.ok(withAiAt > 0 && askAllAt > withAiAt);
  const guardAt = direction.lastIndexOf("{aiAvailable ? (", withAiAt);
  assert.ok(guardAt > 0);
  assert.match(direction.slice(guardAt, withAiAt), /^\{aiAvailable \? \(\s*<>\s*<p [^>]*>\{$/);

  const principles = {
    de: [/^Freiwillig:/, /KI-Modell/, /Rechner von Made2Found/, /falsch oder unvollständig/, /bewertet und entscheidet nichts/, /bestätigst/, /ohne KI/i],
    en: [/^Optional:/, /AI model/, /Made2Found machine/, /wrong or incomplete/, /rate or decide/, /confirm/, /without AI/],
  } as const;
  for (const locale of ["de", "en"] as const) {
    const capability = messages(locale, "capability").interview.sort.askText;
    const withAi = messages(locale, "direction").done.withAi;
    for (const pattern of principles[locale]) {
      assert.match(capability, pattern, `${locale} capability: ${pattern}`);
      assert.match(withAi, pattern, `${locale} direction: ${pattern}`);
    }
    // Ein Klick liest alle Antworten - das steht vorher da.
    assert.match(withAi, locale === "de" ? /Mit einem Klick werden alle beantworteten Antworten gelesen/ : /One click reads all the answers you've given/);
    // Kein Name einer Person als Ort der Verarbeitung.
    for (const text of [capability, withAi, messages(locale, "direction").proposals.askText]) {
      assert.doesNotMatch(text, /Maria|eigenen Hardware|own hardware/);
    }
  }
});
