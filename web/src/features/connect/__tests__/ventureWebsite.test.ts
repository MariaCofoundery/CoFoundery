import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung den Begriff in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const FORM = "src/features/connect/ConnectVentureForm.tsx";
const ACTION = "src/features/connect/connectVentureActions.ts";
// Umgezogen am 21.09.2026 (/connect/ventures ist jetzt das Verzeichnis), und
// zwei neue Stellen kamen dazu: Das Verzeichnis und die Profilseite eines
// Mitglieds zeigen Websites ebenso - also gilt die Regel dort ebenso.
const OWN_PAGE = "src/app/(product)/connect/ventures/mine/page.tsx";
const DIRECTORY_PAGE = "src/app/(product)/connect/ventures/page.tsx";
const PERSON_PAGE = "src/app/(product)/connect/people/[userId]/page.tsx";
const PUBLIC_PAGE = "src/app/(public-connect)/connect/p/[publicSlug]/page.tsx";

test("die Adresse steht dort, wo man sie sucht", () => {
  // Das Feld gab es schon - aber an sechster Stelle, hinter drei langen
  // Textfeldern. Maria hat es am 19.09.2026 schlicht nicht gefunden und um
  // etwas gebeten, das bereits gebaut war. Das ist ein Auffindbarkeitsfehler,
  // kein fehlendes Feature.
  const form = source(FORM);
  const name = form.indexOf('t("ventures.name")');
  const website = form.indexOf('t("ventures.website")');
  const whatItDoes = form.indexOf('t("ventures.whatItDoes")');
  assert.ok(name >= 0 && website > name, "die Adresse steht nicht beim Namen");
  assert.ok(
    website < whatItDoes,
    "die Adresse steht wieder hinter den langen Textfeldern"
  );
});

test("das Eingabefeld lässt die Adresse durch, die man wirklich kopiert", () => {
  // Dieselbe Falle wie beim LinkedIn-Feld: Mit type="url" weigert sich der
  // Browser, das Formular abzuschicken, solange kein Schema davorsteht - und
  // "cofoundery.de", also genau das, was im Platzhalter steht, waere die
  // einzige Schreibweise, die nicht ginge.
  const form = codeOnly(FORM);
  const websiteInput = form.slice(form.indexOf('name="website"'), form.indexOf('name="website"') + 300);
  assert.doesNotMatch(websiteInput, /type="url"/);
  assert.match(websiteInput, /type="text"/);
  assert.match(websiteInput, /inputMode="url"/);
});

test("eine unbrauchbare Adresse wird gemeldet, nicht verschluckt", () => {
  // Vorher gab parseWebsite bei http:// einfach null zurueck und die Aktion
  // speicherte still ohne Adresse: Erfolgsmeldung, leeres Feld. So etwas
  // bemerkt man erst Wochen spaeter, wenn ueberhaupt.
  const action = source(ACTION);
  assert.match(action, /if \(!website\.ok\) back\("venture_website"\)/);
  assert.match(action, /website: website\.url/);
  assert.ok(CONNECT_ERROR_KEYS.includes("venture_website"), "der Fehler würde nie angezeigt");

  for (const locale of ["de", "en"]) {
    const errors = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        errors: Record<string, string>;
      }
    ).errors;
    assert.ok(errors.venture_website, `${locale}: die Meldung fehlt`);
    // Sie muss sagen, was richtig waere - nicht nur, dass etwas falsch ist.
    assert.match(errors.venture_website, /https/, `${locale}: kein Hinweis, was gilt`);
  }
});

test("nur https, und nur etwas, das ein Ziel im Netz ist", () => {
  // http auf einer https-Seite ist eine Browserwarnung und ein schlechtes Bild
  // fuer die Person - das war schon vorher die Entscheidung und bleibt sie.
  const action = source(ACTION);
  assert.match(action, /text\.startsWith\("http:\/\/"\)\) return \{ ok: false \}/);
  // Und ein Gastgebername ohne Punkt ist keine Adresse: "meine firma" wuerde
  // sonst als https://meine%20firma gespeichert.
  assert.match(action, /parsed\.hostname\.includes\("\."\)/);
});

test("Links auf die Webseite öffnen ein neues Fenster – innen wie außen", () => {
  for (const page of [OWN_PAGE, DIRECTORY_PAGE, PERSON_PAGE, PUBLIC_PAGE]) {
    const content = source(page);
    const link = content.slice(content.indexOf("venture.website"));
    assert.match(link, /target="_blank"/, `${page}: kein neues Fenster`);
    assert.match(link, /rel="noreferrer noopener/, `${page}: ohne noopener`);
    assert.match(link, /ventures\.openLinkHint/, `${page}: kein Hinweis darauf`);
  }

  // Die oeffentliche Seite traegt zusaetzlich nofollow: Ein fremder Link von
  // einer indexierten Seite ist sonst eine Empfehlung, die niemand gegeben hat.
  assert.match(source(PUBLIC_PAGE), /rel="noreferrer noopener nofollow"/);

  for (const locale of ["de", "en"]) {
    const ventures = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        ventures: Record<string, string>;
      }
    ).ventures;
    assert.match(
      ventures.openLinkHint,
      locale === "de" ? /neue[nms] Fenster/ : /new window/,
      `${locale}: der Hinweis sagt nicht, dass ein Fenster aufgeht`
    );
  }
});
