import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PERSON_PAGE = "src/app/(product)/connect/people/[userId]/page.tsx";
const PEOPLE_LIST = "src/app/(product)/connect/people/page.tsx";
const DIRECTORY = "src/app/(product)/connect/ventures/page.tsx";
const MINE = "src/app/(product)/connect/ventures/mine/page.tsx";

/**
 * Connect als Netzwerk und nicht als Pinnwand.
 *
 * BESPROCHEN AM 21.09.2026: "Wo sehe ich überhaupt die Profile, wo finde ich
 * die kleinen Unternehmensprofile von den Leuten?" Der Befund war konkreter
 * als die Frage - es gab beides nicht.
 */

test("es gibt eine Profilseite fuer Mitglieder", () => {
  // Bis hierher war die EINZIGE Profilseite die oeffentliche unter
  // /connect/p/<slug> - und die existiert nur, wenn jemand seine Sichtbarkeit
  // ausdruecklich auf oeffentlich gestellt hat.
  assert.ok(existsSync(PERSON_PAGE), "die Seite fehlt");
  const page = codeOnly(PERSON_PAGE);

  // Auf ihr laufen die Faeden zusammen, die vorher nebeneinander lagen.
  assert.match(page, /getConnectVentures\(client, userId\)/, "die Unternehmen fehlen");
  assert.match(page, /getActiveConnectListingsByOwner\(client, userId\)/, "die Anzeigen fehlen");
  assert.match(page, /getActiveConnectProblemsByAuthor\(client, userId\)/, "das Ungelöste fehlt");
});

test("wer das Profil sehen darf, entscheidet die Datenbank", () => {
  // Nicht diese Seite: Die Policy auf network_profiles gibt Mitgliedern jedes
  // AKTIVE Profil heraus. Hier wird nur eingegrenzt, nichts nachgebaut.
  const page = codeOnly(PERSON_PAGE);
  assert.match(page, /requireConnectMember/, "die Seite steht Nichtmitgliedern offen");
  assert.match(page, /getConnectPerson/);

  const data = codeOnly("src/features/connect/connectPeopleData.ts");
  const fn = data.slice(data.indexOf("export async function getConnectPerson"));
  assert.match(fn, /\.eq\("status", "active"\)/, "auch Entwuerfe wuerden herausgegeben");

  // Nicht vorhanden, nicht aktiv, nicht erlaubt: dieselbe Antwort. Drei Faelle
  // zu unterscheiden waere eine Auskunft darueber, wer hier Mitglied ist.
  assert.match(page, /if \(!person\) notFound\(\);/);
});

test("jede Personenkarte fuehrt zu einem Profil, auch ohne oeffentliche Seite", () => {
  // DAS WAR DER FEHLER: Bei allen, die ihr Profil nicht oeffentlich gestellt
  // hatten, stand ein grauer Hinweis anstelle eines Links. "Nur im Netzwerk"
  // hiess faktisch "gar nicht".
  const list = codeOnly(PEOPLE_LIST);
  assert.match(list, /href=\{`\/connect\/people\/\$\{person\.user_id\}`\}/);
  assert.doesNotMatch(list, /people\.noPublicProfile/, "der graue Hinweis ist noch da");
  // Die oeffentliche Adresse bleibt daneben - sie ist das, was man teilen kann.
  assert.match(list, /people\.openPublicProfile/);
});

test("Unternehmen sind durchsuchbar, und die eigenen bleiben verwaltbar", () => {
  // Vorher zeigte /connect/ventures ausschliesslich die EIGENEN. Auf einer
  // Personenkarte stand "2 Unternehmen", und es fuehrte kein Weg dorthin.
  assert.ok(existsSync(DIRECTORY));
  assert.ok(existsSync(MINE), "die Verwaltung der eigenen ist verschwunden");

  const directory = codeOnly(DIRECTORY);
  assert.match(directory, /getActiveConnectVentures/);
  // Und jedes Unternehmen zeigt seinen Menschen - sonst waere es ein
  // Handelsregister.
  assert.match(directory, /href=\{`\/connect\/people\/\$\{owner\.user_id\}`\}/);

  // Der Umzug ist vollstaendig: Kein Formular und keine Aktion zeigt noch auf
  // die alte Adresse, sonst landet man nach dem Speichern im Verzeichnis.
  for (const path of [
    "src/features/connect/connectVentureActions.ts",
    "src/features/connect/ConnectVentureForm.tsx",
    "src/features/connect/ConnectMineNav.tsx",
  ]) {
    const code = codeOnly(path);
    const stale = [...code.matchAll(/["'`]\/connect\/ventures(?!\/mine)/g)];
    assert.equal(stale.length, 0, `${path} zeigt noch auf die alte Adresse`);
  }
});

test("die Leiste traegt vier Reiter, und jeder mit seiner Zahl", () => {
  const tabs = codeOnly("src/features/connect/ConnectTabs.tsx");
  for (const key of ["people", "ventures", "listings", "problems"]) {
    assert.match(tabs, new RegExp(`key: "${key}"`), `${key} fehlt in der Leiste`);
  }
  // Die Zahl steht dabei, damit niemand einen Reiter anklickt, hinter dem
  // nichts steht.
  const counts = codeOnly("src/features/connect/connectPeopleData.ts");
  assert.match(counts, /ventures: ventures\.count \?\? 0/);
});

test("die Anzeigenkarte fuehrt zu dem Menschen, der sie eingestellt hat", () => {
  // Vorher stand dort nur der Name: Man sah, wer es ist, und kam nicht hin.
  const card = codeOnly("src/features/connect/ConnectListingCard.tsx");
  assert.match(card, /href=\{`\/connect\/people\/\$\{profile\.user_id\}`\}/);
});

test("nichts davon sortiert Menschen oder Unternehmen nach Passung", () => {
  // Sobald sortiert wird, ist es eine Rangliste - dieselbe Linie wie am
  // Problembrett und in der Personenliste.
  const directory = codeOnly("src/features/connect/connectVentureData.ts");
  const fn = directory.slice(directory.indexOf("export async function getActiveConnectVentures"));
  // Genau EINE Sortierung, und die ist nach Zeit. Eine zweite waere eine
  // Rangfolge, auch wenn sie anders heisst. (Nicht nach Woertern wie "score"
  // suchen: "match" ist der uebliche Parametername in replace-Funktionen und
  // stand sofort als falscher Treffer da.)
  const orders = [...fn.matchAll(/\.order\("([a-z_]+)"/g)].map((hit) => hit[1]);
  assert.deepEqual(orders, ["created_at"]);
});

test("jeder neue Text steht in beiden Sprachen da", () => {
  for (const locale of ["de", "en"]) {
    const connect = JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
      tabs: Record<string, string>;
      people: Record<string, string>;
      ventures: Record<string, string>;
    };
    assert.ok(connect.tabs.ventures, `${locale}: tabs.ventures fehlt`);
    for (const key of ["openPublicProfile", "expertiseTitle", "openToTitle", "listingsTitle", "problemsTitle", "noContactYet"]) {
      assert.ok(connect.people[key], `${locale}: people.${key} fehlt`);
    }
    for (const key of ["directoryTitle", "directoryText", "ofPersonTitle", "searchPlaceholder", "audienceLabel", "openWebsite", "emptyDirectory", "emptySearch", "addOwn"]) {
      assert.ok(connect.ventures[key], `${locale}: ventures.${key} fehlt`);
    }
    // Der Hinweis fuer Menschen ohne Anzeige muss sagen, was stattdessen geht -
    // sonst endet die Seite in einer Sackgasse.
    assert.ok(connect.people.noContactYet.length > 100, `${locale}: der Hinweis hilft nicht weiter`);
  }
});
