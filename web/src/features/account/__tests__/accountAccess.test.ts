import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ACTIONS = "src/features/account/accountActions.ts";
const SECTION = "src/features/account/AccountAccessSection.tsx";
const PAGE = "src/app/(product)/account/page.tsx";

const accessCopy = (locale: string) => {
  const messages = readJson(`messages/${locale}/dashboard.json`) as {
    account: { access: Record<string, unknown> };
  };
  return messages.account.access;
};

// ---------------------------------------------------------------------------
// Die Adresse ist der Schluessel
// ---------------------------------------------------------------------------
test("die eigene Adresse steht im Konto", () => {
  // Sie stand bis 18.09.2026 nirgends im Produkt - man konnte nicht einmal
  // nachsehen, mit welcher Adresse man angemeldet ist.
  assert.match(source(PAGE), /email=\{user\.email \?\? null\}/);
  assert.match(source(SECTION), /account\.access\.currentLabel/);

  for (const locale of ["de", "en"]) {
    const copy = accessCopy(locale);
    for (const key of ["title", "text", "currentLabel", "changeCta", "submit"]) {
      assert.ok(copy[key], `${locale}: account.access.${key} fehlt`);
    }
  }
});

test("der Wechsel wird an beide Adressen bestaetigt", () => {
  const actions = codeOnly(ACTIONS);

  // Angemeldet wird nur per Magic Link - die Adresse IST das Passwort. Wuerde
  // hier sofort umgestellt, reichte ein kurz unbeaufsichtigter Bildschirm fuer
  // eine Kontouebernahme. updateUser schickt bei aktivierter Einstellung
  // "Secure email change" an beide Adressen.
  assert.match(actions, /auth\.updateUser\(\s*\{ email: nextEmail \}/);
  assert.doesNotMatch(actions, /admin\.updateUserById/, "das waere ein Wechsel ohne Bestaetigung");

  // Und der Text sagt es, statt es nur zu tun.
  for (const locale of ["de", "en"]) {
    const hint = String(accessCopy(locale).doubleConfirmHint ?? "");
    assert.ok(hint.length > 40, `${locale}: doubleConfirmHint fehlt`);
    assert.match(
      hint,
      locale === "de" ? /alte|beide/i : /old|both/i,
      `${locale}: der Hinweis sagt nicht, dass auch die alte Adresse bestaetigen muss`
    );
  }
});

test("der Bestaetigungslink landet auf einem Weg, der ihn verarbeiten kann", () => {
  assert.match(codeOnly(ACTIONS), /emailRedirectTo: `\$\{getPublicAppOrigin\(\)\}\/auth\/confirm/);
  // /auth/confirm reicht token_hash und type an verifyOtp durch; email_change
  // ist einer der gueltigen Typen. Ohne diese Weitergabe liefe der Link ins
  // Leere.
  assert.match(
    source("src/features/auth/authRedirects.ts"),
    /verifyOtp\(\{\s*token_hash: tokenHash,\s*type,/
  );
});

test("eine fremde Fehlermeldung wird nicht durchgereicht", () => {
  const actions = codeOnly(ACTIONS);
  // "Email address already registered" waere sonst eine Auskunft darueber, wer
  // hier ein Konto hat - an jede Person, die Adressen durchprobiert.
  assert.doesNotMatch(actions, /error\.message/);
  assert.match(actions, /redirect\(back\("email_failed"\)\)/);
});

// ---------------------------------------------------------------------------
// Was der Wechsel kostet
// ---------------------------------------------------------------------------
test("offene Einladungen an die alte Adresse werden vorher genannt", () => {
  // Einladungen werden ueber die Mailadresse im Token zugeordnet
  // (invited_email = lower(auth.jwt()->>'email')). Nach einem Wechsel greift
  // diese Zuordnung nicht mehr.
  const policy = source("../supabase/migrations/20260210215231_account_backbone_rls_fix.sql");
  assert.match(
    policy,
    /invited_email = lower\(auth\.jwt\(\)->>'email'\)/,
    "die Zuordnung hat sich geaendert - den Hinweis im Konto pruefen"
  );

  const page = source(PAGE);
  assert.match(page, /\.from\("participants"\)/);
  assert.match(page, /\.is\("user_id", null\)/, "auch schon angenommene Einladungen wuerden gezaehlt");
  assert.match(page, /\.eq\("invited_email"/);

  assert.match(source(SECTION), /pendingInvitations > 0 \?/);
  for (const locale of ["de", "en"]) {
    assert.match(
      String(accessCopy(locale).pendingInvitations),
      /\{count, plural,/,
      `${locale}: keine Pluralform`
    );
  }
});

// ---------------------------------------------------------------------------
// Ueberall abmelden
// ---------------------------------------------------------------------------
test("ueberall abmelden beendet wirklich alle Sitzungen", () => {
  const actions = codeOnly(ACTIONS);
  // Ohne scope global endet nur die Sitzung im aktuellen Browser - also genau
  // die, die man noch unter Kontrolle hat. Das verlorene Geraet liefe weiter.
  assert.match(actions, /signOut\(\{ scope: "global" \}\)/);
  // Danach zwingend zum Login: Das eigene Token ist mit eingezogen.
  assert.match(actions, /redirect\("\/login\?status=signed_out_everywhere"\)/);
});

test("die Abmeldung wird als Bestaetigung gezeigt, nicht als Fehler", () => {
  const login = source("src/app/(product)/login/page.tsx");
  assert.match(login, /signed_out_everywhere/);
  // Sonst saehe es aus, als waere man rausgeflogen.
  assert.match(login, /role="status"/);
  for (const locale of ["de", "en"]) {
    const auth = readJson(`messages/${locale}/auth.json`) as {
      login: { status?: Record<string, string> };
    };
    assert.ok(auth.login.status?.signedOutEverywhere, `${locale}: die Bestaetigung fehlt`);
  }
});

// ---------------------------------------------------------------------------
// Eine Ruecknahme aus dem Einstiegs-Umbau
// ---------------------------------------------------------------------------
test("der fehlgeschlagene Connect-Beitritt hat wieder eine Meldung", () => {
  // Beim Entschlacken von /start am 18.09.2026 ist der Zweig mitgegangen,
  // obwohl drei Auth-Routen weiterhin dorthin leiten - die Person stand ohne
  // Erklaerung da.
  assert.match(source("src/app/(product)/start/page.tsx"), /status === "connect_failed"/);
  for (const locale of ["de", "en"]) {
    const auth = readJson(`messages/${locale}/auth.json`) as {
      start: { status: Record<string, string> };
    };
    assert.ok(auth.start.status.connectFailed, `${locale}: connectFailed fehlt`);
  }

  // Und der tote Parameter ist weg: /start kennt kein intent mehr.
  for (const route of ["callback", "confirm", "landing"]) {
    assert.doesNotMatch(
      source(`src/app/auth/${route}/route.ts`),
      /intent=connect/,
      `${route}: leitet noch mit einem Parameter, den /start nicht mehr kennt`
    );
  }
});

// ---------------------------------------------------------------------------
// Nur bekannte Zustaende
// ---------------------------------------------------------------------------
test("ein manipulierter Statusparameter landet nicht als Schluesselpfad auf der Seite", () => {
  const page = source(PAGE);
  assert.match(page, /isAccountStatus\(params\.status\) \? params\.status : null/);

  // Die Liste liegt seit dem Ausbau des Kontos an einer eigenen Stelle - sie
  // deckt jetzt auch Sprache und Benachrichtigungen ab.
  const list = source("src/features/account/accountStatus.ts");
  const keys = [...list.matchAll(/^\s+"([a-z_]+)",$/gm)].map((match) => match[1]);
  assert.ok(keys.length >= 8, `die Liste der Zustaende wurde nicht gefunden (${keys.length})`);
  for (const locale of ["de", "en"]) {
    const account = (readJson(`messages/${locale}/dashboard.json`).account ?? {}) as {
      access?: { status?: Record<string, string> };
      status?: Record<string, string>;
    };
    for (const key of keys) {
      // Die Meldung steht bei dem Abschnitt, zu dem sie gehoert.
      const found = key.startsWith("email_")
        ? account.access?.status?.[key]
        : account.status?.[key];
      assert.ok(found, `${locale}: Text fuer ${key} fehlt`);
    }
  }
});
