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

test("Das Profilformular hat das Haekchen, standardmaessig nicht gesetzt", () => {
  const page = source("src/app/(product)/connect/profile/page.tsx");
  assert.match(page, /name="highlightable"/);
  assert.match(page, /defaultChecked=\{profile\?\.highlightable \?\? false\}/);
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
