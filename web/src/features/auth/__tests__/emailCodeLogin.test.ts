import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ACTION = "src/features/auth/emailCodeActions.ts";
const FORM = "src/features/auth/EmailCodeForm.tsx";
const START = "src/app/(product)/start/page.tsx";
const MAGIC_LINK = "src/features/auth/MagicLinkForm.tsx";

/**
 * Anmelden mit dem Code aus der Mail.
 *
 * GEMELDET AM 20.09.2026 von einem iPhone: "Ich muss bei Safari direkt
 * eingeloggt sein und erst dann kann ich den Button auf meinen Home-Bildschirm
 * bringen. Weil sonst loggt es mich direkt in meinen Safari ein und nicht
 * wieder in meine Homescreen-App."
 *
 * Eine App vom Startbildschirm hat auf iOS einen eigenen Datenspeicher. Ein
 * Link aus der Mail oeffnet immer den Standardbrowser - es gibt keine
 * Moeglichkeit, ihn auf die App zu richten. Wer sich also IN der App anmelden
 * will, kommt mit dem Link nicht hinein.
 */

test("der Code wird auf dem Server eingeloest, nicht im Browser", () => {
  // DAS IST DER PUNKT, AN DEM ES STILL KAPUTTGEHT: Nur der Server-Client
  // schreibt die Sitzungs-Cookies. Mit einem Browser-Client saehe die Anmeldung
  // aus, als haette sie geklappt - und waere beim naechsten Seitenaufruf weg.
  const action = codeOnly(ACTION);
  assert.match(action, /from "@\/lib\/supabase\/server"/);
  assert.doesNotMatch(action, /from "@supabase\/supabase-js"/);
  assert.match(action, /supabase\.auth\.verifyOtp\(\{ email, token, type: "email" \}\)/);
});

test("der Code oeffnet keine Tuer, die der Link nicht auch oeffnet", () => {
  // Einen Code gibt es nur, wenn vorher eine Mail verschickt wurde - und dafuer
  // gelten dieselben Bedingungen wie bisher. Die Aktion darf deshalb weder
  // Konten anlegen noch selbst Mails ausloesen.
  const action = codeOnly(ACTION);
  assert.doesNotMatch(action, /shouldCreateUser/);
  assert.doesNotMatch(action, /signInWithOtp/);
  // Und sie landet dort, wo auch der Link landet.
  assert.match(action, /resolvePostAuthRedirectPath\(supabase, nextPath\)/);
  assert.match(action, /normalizeNextPath\(input\.nextPath\)/);
});

test("die Adresse steht in einem Cookie, nicht in der Adresszeile", () => {
  // Ein ?email= landet im Verlauf, in geteilten Links und in jedem Referrer.
  const start = codeOnly(START);
  assert.match(start, /set\(PENDING_EMAIL_COOKIE, email, \{\s*httpOnly: true/);
  assert.doesNotMatch(start, /searchParams\.set\("email"/);

  const cookie = codeOnly("src/features/auth/pendingEmailCookie.ts");
  // Die Laufzeit folgt der Gueltigkeit des Codes - kuerzer waere schlechter:
  // Das Feld verschwaende, waehrend der Code noch gilt.
  assert.match(cookie, /PENDING_EMAIL_MAX_AGE = 60 \* 60/);

  // Und nach erfolgreicher Anmeldung ist sie weg.
  assert.match(codeOnly(ACTION), /store\.delete\(PENDING_EMAIL_COOKIE\)/);
});

test("das Feld erscheint erst, wenn eine Mail unterwegs ist", () => {
  // Vorher gibt es nichts einzutippen. Ein leeres Codefeld neben dem Formular
  // waere nur eine Frage mehr an jemanden, der sich gerade anmelden will.
  assert.match(codeOnly(START), /pendingEmail \? <EmailCodeForm/);
  assert.match(codeOnly(MAGIC_LINK), /status === "sent" \? <EmailCodeForm/);
});

test("das Codefeld steht NEBEN dem Formular, nicht darin", () => {
  // Ein Formular im Formular ist kein gueltiges HTML - der Browser wirft das
  // innere kommentarlos weg, und der Knopf tut dann nichts.
  const magicLink = codeOnly(MAGIC_LINK);
  const formEnd = magicLink.indexOf("</form>");
  const codeFormAt = magicLink.indexOf("<EmailCodeForm");
  assert.ok(formEnd > 0 && codeFormAt > formEnd, "das Codefeld liegt im Anmeldeformular");

  const start = codeOnly(START);
  const startFormEnd = start.lastIndexOf("</form>");
  assert.ok(start.indexOf("<EmailCodeForm") > startFormEnd);
});

test("in der App steht ein anderer Satz als im Browser", () => {
  // Im Browser ist der Code die Ausweichmoeglichkeit. In der App vom
  // Startbildschirm ist er der einzige Weg hinein - und das gehoert dann auch
  // dahin geschrieben, sonst tippt jemand ewig auf den Link.
  const form = codeOnly(FORM);
  assert.match(form, /display-mode: standalone/);
  assert.match(form, /isStandalone \? t\("hintInApp"\) : t\("hint"\)/);
});

test("das Feld ist zum Abtippen auf einem Telefon gemacht", () => {
  const form = codeOnly(FORM);
  // Das Telefon bietet den Code dann ueber der Tastatur an, statt dass jemand
  // zwischen Mail und App hin und her wechselt.
  assert.match(form, /autoComplete="one-time-code"/);
  assert.match(form, /inputMode="numeric"/);
  // Kein type="number": Das macht Pfeilchen zum Hoch- und Runterzaehlen an ein
  // Feld, in dem es nichts zu zaehlen gibt, und schluckt fuehrende Nullen.
  assert.doesNotMatch(form, /type="number"/);
});

test("abgelaufen und falsch sind zwei verschiedene Auskuenfte", () => {
  // Beim einen hilft ein neuer Code, beim anderen genaueres Hinsehen. Eine
  // gemeinsame Meldung schickt die Haelfte der Menschen auf den falschen Weg.
  const action = codeOnly(ACTION);
  assert.match(action, /expired \? "expired" : "invalid"/);

  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(readFileSync(`messages/${locale}/auth.json`, "utf8")) as {
        emailCode?: { errors?: Record<string, string> } & Record<string, unknown>;
      }
    ).emailCode;
    assert.ok(copy, `${locale}: auth.emailCode fehlt`);
    for (const key of [
      "title",
      "hint",
      "hintInApp",
      "forEmail",
      "emailLabel",
      "codeLabel",
      "submit",
      "submitting",
    ]) {
      assert.ok(copy[key], `${locale}: auth.emailCode.${key} fehlt`);
    }
    for (const key of ["invalid", "expired", "failed"]) {
      assert.ok(copy.errors?.[key], `${locale}: auth.emailCode.errors.${key} fehlt`);
    }
    assert.notEqual(copy.errors?.invalid, copy.errors?.expired);
    // Der Hinweis in der App muss den Grund NENNEN - sonst liest er sich wie
    // eine Wiederholung und niemand versteht, warum der Link hier nicht taugt.
    assert.ok(String(copy.hintInApp).length > 90, `${locale}: der Hinweis erklaert nichts`);
  }
});

test("getippte Leerzeichen und Bindestriche werden nicht zum Fehler", () => {
  // Menschen tippen "123 456" oder kopieren es mit einem Bindestrich.
  assert.match(codeOnly(ACTION), /replace\(\/\\D\/g, ""\)/);
});
