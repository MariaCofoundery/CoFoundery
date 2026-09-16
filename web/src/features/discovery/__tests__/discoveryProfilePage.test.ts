import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

/** Quelltext ohne Kommentare - ein Kommentar darf keine Pruefung erfuellen. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/(product)/discovery/profile/page.tsx";

// ---------------------------------------------------------------------------
// Die Eingabetaste darf nichts veroeffentlichen
// ---------------------------------------------------------------------------
test("saving comes before publishing in the form", () => {
  const page = codeOnly(PAGE);
  const save = page.indexOf('t("profile.actions.saveDraft")');
  const publish = page.indexOf("formAction={publishProfileFromForm}");
  assert.ok(save > -1 && publish > -1);
  // Ein Zeilenumbruch in einem Textfeld loest den ersten Absendeknopf im
  // Formular aus. Stuende dort das Veroeffentlichen, waere das Profil
  // versehentlich sichtbar.
  assert.ok(save < publish, "der Speicherknopf steht zuerst im Formular");
});

// ---------------------------------------------------------------------------
// Pausieren nur, wenn es etwas zu pausieren gibt
// ---------------------------------------------------------------------------
test("the pause button only exists for a published profile", () => {
  const page = codeOnly(PAGE);
  const pause = page.indexOf("action={pauseProfile}");
  assert.ok(pause > -1);
  const before = page.slice(0, pause);
  assert.match(
    before.slice(-400),
    /profile\.status === "active" \? \(/,
    "ein Entwurf laesst sich nicht pausieren - das tat sichtbar nichts"
  );
});

test("a paused profile is resumed, not published again", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /profile\.status === "paused"\s*\?\s*t\("profile\.actions\.resume"\)/);
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/discovery.json`);
    const actions = (messages.profile as Record<string, Record<string, string>>).actions;
    assert.equal(typeof actions.resume, "string", `${locale}: actions.resume fehlt`);
    assert.equal(typeof actions.resuming, "string", `${locale}: actions.resuming fehlt`);
    assert.equal(typeof actions.pauseHelp, "string", `${locale}: actions.pauseHelp fehlt`);
  }
});

// ---------------------------------------------------------------------------
// Die fehlenden Angaben stehen einmal auf der Seite, nicht zweimal
// ---------------------------------------------------------------------------
test("the publish issues are listed where the action is, and only there", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /<PublishIssuesCard issues=\{publishIssues\}/);
  // Die Meldung oben bekommt keine Liste mehr - nach einem gescheiterten
  // Veroeffentlichen stand dieselbe Aufzaehlung zweimal da.
  assert.match(page, /<PageMessage[\s\S]{0,120}issues=\{\[\]\}/);
});

// ---------------------------------------------------------------------------
// Die Vorschau zeigt, was schon bekannt ist
// ---------------------------------------------------------------------------
test("the preview reads from person_core first", () => {
  const page = codeOnly(PAGE);
  // person_core ist die Quelle; das Suchprofil ist hoechstens so aktuell wie
  // der letzte Speichervorgang. Und emptyProfile() setzt remoteMode auf
  // "flexible" - ein Rueckfall andersherum waere dort nie zum Zug gekommen.
  assert.match(page, /core\?\.display_name \|\| profile\.displayName/);
  assert.match(page, /core\?\.headline \|\| profile\.headline/);
  assert.match(page, /core\?\.remote_mode \|\| profile\.remoteMode/);
  assert.match(page, /core\?\.expertise\?\.length \? core\.expertise/);
  assert.match(page, /core\?\.industries\?\.length \? core\.industries/);
});

test("the identity block names everything it actually covers", () => {
  const page = codeOnly(PAGE);
  // Expertise, Branchen und Arbeitsweise stehen in der Vorschau. Wer sie dort
  // leer sah, fand vorher keinen Ort, sie zu ergaenzen.
  for (const key of [
    "profile.publicProfile.identityExpertise",
    "profile.publicProfile.identityIndustries",
    "profile.publicProfile.identityWorkFrame",
  ]) {
    assert.ok(page.includes(key), `${key} fehlt im Identitaetsblock`);
  }

  const de = readJson("messages/de/discovery.json");
  const publicProfile = (de.profile as Record<string, Record<string, string>>).publicProfile;
  assert.match(publicProfile.identityText, /Expertise/);
  assert.match(publicProfile.identityText, /Arbeitsweise/);
});

// ---------------------------------------------------------------------------
// Der Zustand steht einmal da, nicht dreimal
// ---------------------------------------------------------------------------
test("the status is shown once, not as a row of pseudo-switches", () => {
  const page = codeOnly(PAGE);
  assert.doesNotMatch(
    page,
    /\(\["draft", "active", "paused"\] as const\)\.map/,
    "alle drei Zustaende nebeneinander sahen aus wie eine Umschaltung"
  );
  assert.match(page, /t\(`status\.\$\{status\}`\)/);
});

// ---------------------------------------------------------------------------
// Das Private steht nicht im selben Kasten wie das Sichtbare
// ---------------------------------------------------------------------------
test("the private alignment block has its own frame", () => {
  const page = source(PAGE);
  assert.match(page, /\$\{CARD_CLASS\} border-violet-100 bg-violet-50\/50/);
  const profileForm = page.indexOf("<form action={saveProfileDraft}");
  const alignment = page.indexOf("border-violet-100 bg-violet-50/50");
  const formEnd = page.indexOf("</form>", profileForm);
  assert.ok(formEnd < alignment, "der private Block liegt ausserhalb des Profilformulars");
});

// ---------------------------------------------------------------------------
// Der Zurueck-Weg
// ---------------------------------------------------------------------------
test("the back link is large enough to hit", () => {
  const page = source(PAGE);
  const link = page.slice(page.indexOf('href="/discovery"') - 120, page.indexOf('href="/discovery"') + 320);
  assert.match(link, /min-h-11/, "44px Ziel - vorher war es ein blosser Textlink");
  assert.match(link, /←/, "und ein Pfeil, wie ueberall sonst im Produkt");
});
