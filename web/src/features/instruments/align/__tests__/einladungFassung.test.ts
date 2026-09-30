import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CURRENT_INSTRUMENT_ID } from "@/features/instruments/instruments";

// NICHT IMPORTIERT, SONDERN GELESEN. `invitationFlow.ts` zieht die
// Datenbankanbindung mit herein und scheitert ausserhalb von Next an
// `next/headers` - fuer eine Zeichenkette ist das der falsche Preis.

/**
 * Wohin eine Einladung führt.
 *
 * ---------------------------------------------------------------------------
 * DIE EINLADENDE PERSON ENTSCHEIDET
 * ---------------------------------------------------------------------------
 *
 * Bis zum 30.09.2026 führte jede Einladung in die bisherige Fassung — auch
 * zwischen zwei Menschen, die beide gerade erst angekommen waren. Beide
 * füllten einen Fragebogen aus, den es in dieser Form nicht mehr gibt.
 *
 * Umgekehrt gilt es genauso: Wer mit der bisherigen Fassung einlädt, führt die
 * andere Person ebenfalls dorthin — sonst hätten die beiden am Ende zwei Bögen
 * und nichts Gemeinsames.
 */
const lies = (...pfad: string[]) => readFileSync(join(...pfad), "utf8");

const flow = lies("src", "features", "onboarding", "invitationFlow.ts");
const version = lies("src", "features", "instruments", "align", "invitationVersion.ts");
const migration = lies(
  "..", "supabase", "migrations", "20261084120000_invitation_version.sql");

test("die Einladung führt dorthin, wo die einladende Person arbeitet", () => {
  assert.match(flow, /versionOfInvitation\(normalizedInvitationId\)\) === "align"/);
  assert.match(flow, /labelKey: "align"/);

  // Und die Kennung kommt mit: Ohne sie landet jemand in einem Fragebogen,
  // den er nicht gesucht hat.
  assert.match(
    flow,
    /return `\/founder-alignment\/profil\?invitationId=\$\{encodeURIComponent\(invitationId\)\}`;/,
  );
});

test("im Zweifel bleibt es bei der bisherigen Fassung", () => {
  // Geht die Auskunft schief, ist der Status quo die schonendere Antwort: Sie
  // führt dorthin, wo die Einladung bisher immer hinführte, statt ein Paar auf
  // zwei Fassungen zu verteilen.
  assert.match(version, /if \(error \|\| data === null \|\| data === undefined\) return "previous";/);
  assert.match(version, /catch \{\s*return "previous";/);
});

test("die Kennung des Instruments steht nur an einer Stelle", () => {
  // Sie kommt als Parameter in die Datenbankfunktion. Eine zweite Schreibweise
  // im SQL wäre eine zweite Wahrheit, die beim nächsten Umbenennen
  // stillschweigend falsch wird.
  assert.match(version, /p_instrument: CURRENT_INSTRUMENT_ID/);
  assert.ok(
    !migration.includes(CURRENT_INSTRUMENT_ID),
    "die Migration schreibt die Kennung selbst hin",
  );
  assert.match(migration, /p_instrument text/);
});

test("die Auskunft über eine fremde Person ist eng zugeschnitten", () => {
  // Gefragt wird nach der EINLADENDEN Person, gestellt wird die Frage von der
  // eingeladenen - und die darf fremde `assessments`-Zeilen nicht lesen.
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all on function public\.invitation_uses_previous_version/);

  // Wer die Einladung nicht sehen darf, bekommt `null` und nicht `false` -
  // `false` wäre eine Auskunft.
  assert.match(migration, /if v_inviter is null then\s*return null;/);
});

test("nach dem Einstieg wird nicht anders entschieden als beim Einstieg", () => {
  // Die Abschlussseite schickte bei `needs_questionnaires` immer in den alten
  // Bogen - derselbe Weg mit zwei Zielen.
  const done = lies("src", "app", "(product)", "invite", "[sessionId]", "done", "page.tsx");
  assert.match(done, /ziel\.labelKey === "align"/);
  assert.match(done, /resolveInvitationContinueTarget\(invitationId\)/);
});

test("beide Seiten bekommen einen Hinweis", () => {
  // Maria am 30.09.2026: „sowohl die einladende Person sollte nochmal einen
  // Hinweis bekommen, hey, das ist das alte, bitte füllt auch noch das neue
  // aus, bevor du jemanden einlädst."
  const einladen = lies("src", "app", "(product)", "invite", "new", "page.tsx");
  assert.match(einladen, /worksWithPrevious\(user\.id\)/);
  assert.match(einladen, /\{bisherigeFassung && <InviteVersionNote \/>\}/);

  // Und wer im alten Bogen sitzt, erfährt es dort - nicht danach.
  const base = lies("src", "app", "me", "base", "page.tsx");
  assert.match(base, /<PreviousVersionNote inviterName=\{einladender\} \/>/);

  const hinweis = lies("src", "features", "instruments", "align", "PreviousVersionNote.tsx");
  assert.match(hinweis, /Das ist die bisherige Fassung\./);
  // KEIN GROSSER KNOPF: Wer angefangen hat, soll fertig werden können.
  assert.ok(!/bg-slate-900/.test(hinweis), "der Hinweis zieht aus dem Bogen heraus");
});

test("wer über eine Einladung im neuen Bogen landet, erfährt warum", () => {
  const profil = lies("src", "app", "(product)", "founder-alignment", "profil", "page.tsx");
  assert.match(profil, /inviter_display_name/);
  assert.match(profil, /Du bist über die Einladung von/);
});
