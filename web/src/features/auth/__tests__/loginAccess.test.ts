import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canCreateAccountFromPath,
  getAllowedBetaCodes,
  isValidBetaAccessCode,
} from "@/features/auth/betaAccess";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Wer ein Konto bekommen darf
// ---------------------------------------------------------------------------
test("every invitation path that really reaches the login can create an account", () => {
  // Diese Pfade stehen so im Code - jeder davon schickt jemanden ohne Konto
  // zur Anmeldung. Fehlt einer, bekommt die Person eine Maske, die ihr Konto
  // still nicht anlegt und trotzdem "wir senden dir einen Link" sagt.
  const realPaths = [
    "/join",
    "/join/continue",
    "/join/start?invitationId=abc",
    "/join/welcome?invitationId=abc",
    "/team-invite/sometoken",
    "/advisor/invite/continue?token=abc",
  ];

  for (const path of realPaths) {
    assert.equal(canCreateAccountFromPath(path), true, `${path} muss ein Konto anlegen duerfen`);
  }
});

test("the list matches what the code actually redirects to", () => {
  // Der eigentliche Fehler war, dass die Liste und die Wirklichkeit
  // auseinanderliefen. Diese Pruefung liest die Wirklichkeit.
  const redirects = [
    ...source("src/app/join/prepare/route.ts").matchAll(/\/login\?next=([^"'`]+)/g),
    ...source("src/app/join/welcome/page.tsx").matchAll(/encodeURIComponent\((next)\)/g),
  ];
  assert.ok(redirects.length > 0, "keine Login-Weiterleitungen gefunden");

  // join/welcome baut seinen next-Pfad aus /join/welcome - das war der
  // fehlende Fall.
  assert.match(source("src/app/join/welcome/page.tsx"), /\/join\/welcome\?invitationId=/);
  assert.equal(canCreateAccountFromPath("/join/welcome?invitationId=x"), true);

  // JoinClient schickt /join/start?invitationId=… beziehungsweise /join.
  assert.match(source("src/app/join/JoinClient.tsx"), /\/join\/start\?invitationId=/);
  assert.equal(canCreateAccountFromPath("/join/start?invitationId=x"), true);
});

test("an ordinary page never creates an account", () => {
  for (const path of ["/dashboard", "/connect", "/profile", "/start", "/", "/joinery"]) {
    assert.equal(canCreateAccountFromPath(path), false, `${path} darf kein Konto anlegen`);
  }
});

test("a query parameter is not a ticket", () => {
  // Die tote zweite Liste hatte genau das erlaubt: irgendein token- oder
  // invitationId-Parameter genuegte. Damit haette sich jeder selbst
  // registrieren koennen.
  assert.equal(canCreateAccountFromPath("/dashboard?token=abc"), false);
  assert.equal(canCreateAccountFromPath("/connect?invitationId=abc"), false);
  assert.equal(canCreateAccountFromPath("/?token=abc"), false);
});

test("nothing external gets through", () => {
  for (const hostile of ["//example.com/join", "https://example.com/join", "", "join"]) {
    assert.equal(canCreateAccountFromPath(hostile), false, `${hostile} darf nicht durchkommen`);
  }

  // "/../join" loest sich zu "/join" auf und ist damit ein echter
  // Einladungspfad - erlaubt zu sein ist hier richtig, nicht nachlaessig.
  assert.equal(canCreateAccountFromPath("/../join"), true);
});

test("there is only one list left", () => {
  const login = source("src/app/(product)/login/page.tsx");
  const beta = source("src/features/auth/betaAccess.ts");

  assert.doesNotMatch(login, /function canCreateUserFromLogin/, "die enge Kopie ist weg");
  assert.match(login, /canCreateAccountFromPath\(nextPath\)/);
  assert.doesNotMatch(beta, /export function isInviteBypassPath/, "die tote Kopie ist weg");
});

// ---------------------------------------------------------------------------
// Der Zugangscode
// ---------------------------------------------------------------------------
test("no configured codes is reported as a configuration problem, not a wrong code", () => {
  const page = source("src/app/(product)/start/page.tsx");
  // Sonst liest sich "Bitte pruefe deine Angaben" wie eigenes Verschulden -
  // und man probiert weiter, obwohl auf dem Server kein Code hinterlegt ist.
  assert.match(page, /getAllowedBetaCodes\(\)\.length === 0/);
  assert.match(page, /"not_configured"/);
  assert.match(page, /start\.status\.notConfigured/);

  for (const locale of ["de", "en"]) {
    const status = ((readJson(`messages/${locale}/auth.json`).start as Record<string, unknown>)
      .status as Record<string, string>);
    assert.ok(status.notConfigured, `${locale}: start.status.notConfigured fehlt`);
  }
});

test("the code check itself stays strict", () => {
  // Ohne hinterlegte Codes ist nichts gueltig - das bleibt so, die Meldung
  // sagt es nur ehrlicher.
  const configured = getAllowedBetaCodes();
  assert.ok(Array.isArray(configured));
  assert.equal(isValidBetaAccessCode(""), false);
  assert.equal(isValidBetaAccessCode("   "), false);
});

test("the unwired beta cookie is gone", () => {
  const beta = source("src/features/auth/betaAccess.ts");
  // Ein Zugangsschutz, den es nur dem Namen nach gibt, ist schlimmer als
  // keiner: Man haelt eine Tuer fuer verschlossen.
  // Auf die Code-Form pruefen, nicht auf Prosa: der Kommentar der Datei nennt
  // beide Namen ausdruecklich, um zu erklaeren, warum sie fehlen.
  assert.doesNotMatch(beta, /export const BETA_ACCESS_COOKIE_NAME/);
  assert.doesNotMatch(beta, /export function hasBetaAccessCookie/);
});

// ---------------------------------------------------------------------------
// Was die Anmeldemaske sagt
// ---------------------------------------------------------------------------
test("a rate limit is named, while account existence stays hidden", () => {
  const form = source("src/features/auth/MagicLinkForm.tsx");

  // Das Limit sagt nichts darueber aus, ob es das Konto gibt - es darf also
  // benannt werden. Vorher sah es aus wie Erfolg, und man wartete auf eine
  // Mail, die nie kommt.
  assert.match(form, /isRateLimited\(error\)/);
  assert.match(form, /error\.status === 429/);
  assert.match(form, /t\("rateLimited"\)/);

  // Alles andere bleibt neutral: sonst laesst sich damit abfragen, wer
  // Mitglied ist.
  assert.match(form, /setStatus\("sent"\)/);
  assert.match(form, /\? sentMessage :/, "der Normalfall bleibt die neutrale Meldung");

  for (const locale of ["de", "en"]) {
    const magicLink = readJson(`messages/${locale}/auth.json`).magicLinkForm as Record<string, string>;
    assert.ok(magicLink.rateLimited, `${locale}: rateLimited fehlt`);
    assert.ok(magicLink.noMailHint, `${locale}: noMailHint fehlt`);
  }
});

test("the neutral message offers a way forward", () => {
  const form = source("src/features/auth/MagicLinkForm.tsx");
  // Weil die Erfolgsmeldung nichts verraten darf, braucht sie einen Hinweis
  // fuer den Fall, dass nichts ankommt.
  assert.match(form, /status === "sent" \? \(/);
  assert.match(form, /t\("noMailHint"\)/);

  const de = readJson("messages/de/auth.json").magicLinkForm as Record<string, string>;
  assert.match(de.noMailHint, /Spam/);
  assert.match(de.noMailHint, /Zugangscode/);
});

// ---------------------------------------------------------------------------
// Warum die Anmeldung scheiterte - jetzt unterscheidbar
// ---------------------------------------------------------------------------
test("an expired link and an incomplete one are told apart", () => {
  const redirects = source("src/features/auth/authRedirects.ts");

  // Vorher hatte jeder Fehlschlag denselben Text. Damit war ein abgelaufener
  // Link nicht von einem zu unterscheiden, der ohne Tokens ankommt - und das
  // sind voellig verschiedene Ursachen: die eine liegt an der Person, die
  // andere an der Konfiguration.
  assert.match(redirects, /"link_expired"/);
  assert.match(redirects, /"link_incomplete"/);
  assert.match(redirects, /classifyCallbackError\(error, requestUrl, errorCode\)/);
  // Supabase nennt den Grund im error_code; der wird gelesen statt geraten.
  assert.match(redirects, /requestUrl\.searchParams\.get\("error_code"\)/);
  assert.match(redirects, /otp_expired/);

  // Der Fall "gar keine Tokens" faellt der Bruecke zu, weil nur der Browser
  // den Hash sieht.
  assert.match(redirects, /buildAuthCallbackClientBridgeResponse\(request, nextPath, "link_incomplete"\)/);
  assert.match(source("src/app/auth/callback/client/page.tsx"), /fail\("link_incomplete"\)/);
});

test("each reason has its own message, and the incomplete one says a new link will not help", () => {
  const page = source("src/app/(product)/login/page.tsx");
  assert.match(page, /normalized === "link_expired"/);
  assert.match(page, /normalized === "link_incomplete"/);

  for (const locale of ["de", "en"]) {
    const errors = ((readJson(`messages/${locale}/auth.json`).login as Record<string, unknown>)
      .errors as Record<string, string>);
    assert.ok(errors.linkExpired, `${locale}: linkExpired fehlt`);
    assert.ok(errors.linkIncomplete, `${locale}: linkIncomplete fehlt`);
  }

  const de = ((readJson("messages/de/auth.json").login as Record<string, unknown>)
    .errors as Record<string, string>);
  // Der Unterschied muss in der Meldung ankommen, sonst ist er nur im Code.
  assert.match(de.linkExpired, /neuen/i);
  assert.match(de.linkIncomplete, /hilft/i);
});

test("a link that would land on another host says so instead of pretending", () => {
  const form = source("src/features/auth/MagicLinkForm.tsx");

  // Auf einer Vorschau-Adresse zeigt der Link auf die konfigurierte Adresse.
  // Er funktioniert dann - nur eben woanders, und das faellt sonst niemandem
  // auf.
  assert.match(form, /origin === window\.location\.origin \? sentMessage : t\("originMismatch"/);
  // Nicht blockieren: Eine Alias-Domain wuerde sonst die Anmeldung ganz
  // verhindern.
  assert.doesNotMatch(form, /setStatus\("error"\);[\s\S]{0,40}originMismatch/);

  for (const locale of ["de", "en"]) {
    const magicLink = readJson(`messages/${locale}/auth.json`).magicLinkForm as Record<string, string>;
    assert.ok(magicLink.originMismatch, `${locale}: originMismatch fehlt`);
    assert.match(magicLink.originMismatch, /\{origin\}/, `${locale}: die Adresse muss genannt werden`);
  }
});

test("both entry points link to each other", () => {
  // Wer kein Konto hat, braucht von der Anmeldung aus den Weg zum Code - und
  // wer eines hat, von dort aus den Weg zurueck.
  assert.match(source("src/app/(product)/login/page.tsx"), /href=\{`\/start\?next=/);
  assert.match(source("src/app/(product)/start/page.tsx"), /href=\{`\/login\?next=/);
});
