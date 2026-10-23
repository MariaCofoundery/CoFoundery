import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseConnectProfile } from "@/features/connect/connectValidation";

const source = (path: string) => readFileSync(path, "utf8");
const MIGRATION = "../supabase/migrations/20261219120000_connect_highlight_consent.sql";

/**
 * Highlights haben eine eigene Zustimmung. "Fuer dich vorgeschlagen werden"
 * sehen wenige, ein Highlight sieht jedes Mitglied - und es kann eine Anzeige
 * sein. Das eine darf nicht aus dem anderen folgen.
 */

test("Die Spalte ist ausdruecklich und steht standardmaessig auf aus", () => {
  const sql = source(MIGRATION);
  assert.match(sql, /add column if not exists highlightable boolean not null default false/);
});

test("Jede Highlight-Abfrage prueft highlightable und nicht suggestable", () => {
  const sql = source(MIGRATION).replace(/--.*$/gm, "");
  for (const fn of [
    "list_connect_highlight_candidates",
    "get_connect_highlight_owners",
    "list_connect_highlight_placements",
  ]) {
    const start = sql.indexOf(`function public.${fn}(`);
    assert.ok(start >= 0, fn);
    const end = sql.indexOf("$$;", sql.indexOf("$$", start) + 2);
    const body = sql.slice(start, end);
    assert.match(body, /highlightable/, `${fn} prueft highlightable`);
    assert.doesNotMatch(body, /suggestable/, `${fn} haengt nicht an suggestable`);
  }
});

test("Das Profilformular hat das Haekchen: vorgewaehlt bis geantwortet, danach die eigene Wahl", () => {
  const page = source("src/app/(product)/connect/profile/page.tsx");
  assert.match(page, /name="highlightable"/);
  assert.match(page, /defaultChecked=\{profile\?\.highlight_prompt_answered_at \? profile\.highlightable : true\}/);
});

test("Die einmalige Frage: nur mit Profil, nur wenn noch nicht beantwortet, Antwort wird festgehalten", () => {
  const prompt = source("src/features/connect/HighlightConsentPrompt.tsx");
  assert.match(prompt, /if \(!data \|\| data\.highlight_prompt_answered_at\) return null/);
  assert.match(prompt, /name="highlightable"[\s\S]{0,80}defaultChecked/);
  const action = source("src/features/connect/highlightConsentActions.ts");
  assert.match(action, /highlightable: formData\.get\("highlightable"\) === "yes"/);
  assert.match(action, /highlight_prompt_answered_at: new Date\(\)\.toISOString\(\)/);
  assert.match(source("src/app/(product)/connect/page.tsx"), /<HighlightConsentPrompt client=\{client\} userId=\{user\.id\} \/>/);
  // Die Migration schaltet niemanden ein: die Spalte bleibt standardmaessig aus.
  assert.match(source(MIGRATION), /highlightable boolean not null default false/);
});

test("Ein Lesefehler beim Forschungs-Einverstaendnis ist keine offene Frage", () => {
  const consent = source("src/features/research/consent.ts");
  assert.match(consent, /if \(error\) return "unknown"/);
});

test("Ohne Haekchen im Formular wird die Zustimmung nicht erteilt", () => {
  const form = new FormData();
  assert.equal(parseConnectProfile(form, null).highlightable, false);
  form.set("highlightable", "yes");
  assert.equal(parseConnectProfile(form, null).highlightable, true);
});

test("Die Begruessung ist nur auf /welcome eingebunden, nicht im Einladungs-Einstieg", () => {
  assert.match(source("src/app/welcome/page.tsx"), /welcomeLetter=\{<WelcomeLetter \/>\}/);
  assert.doesNotMatch(source("src/app/join/welcome/page.tsx"), /welcomeLetter/);
});

test("Der Brief verspricht keine Bewertung und kein Match-Wort", () => {
  const messages = JSON.parse(source("messages/de/profile.json")).welcomeLetter;
  const text = JSON.stringify(messages);
  assert.doesNotMatch(text, /Score|Kompatibilit|Match-Prozent/);
  assert.ok(messages.values.respect.title.includes("Rassismus"));
});

test("Der Begruessungsbrief wird bestehenden Konten einmal gezeigt, ohne Backfill", () => {
  const sql = source("../supabase/migrations/20261221120000_welcome_letter_seen.sql").replace(/--.*$/gm, "");
  assert.match(sql, /add column if not exists welcome_letter_seen_at timestamptz;/);
  assert.doesNotMatch(sql, /\bupdate\b/i, "ein Backfill wuerde den Brief fuer alle Bestandskonten ueberspringen");
  const gate = source("src/features/profile/WelcomeLetterGate.tsx");
  assert.match(gate, /if \(error \|\| !data\?\.onboarding_completed_at \|\| data\.welcome_letter_seen_at\) return null/);
  assert.match(source("src/app/layout.tsx"), /<WelcomeLetterGate client=/);
  assert.match(source("src/features/profile/onboardingCompletion.ts"), /welcome_letter_seen_at/);
});
