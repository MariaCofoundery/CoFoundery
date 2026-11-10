import assert from "node:assert/strict";
import test from "node:test";
import { HOLIDAY_STATES, PUBLIC_HOLIDAYS, SCHOOL_HOLIDAYS } from "@/features/advisor/calendar/holidaysData";
import { holidayMarks, holidayName, parseHolidayPrefs, serializeHolidayPrefs } from "@/features/advisor/calendar/holidaysModel";

test("Wahl: nur gueltiges Bundesland mit mindestens einer Auswahl", () => {
  assert.deepEqual(parseHolidayPrefs("SN|h|s"), { state: "SN", publicHolidays: true, school: true });
  assert.equal(parseHolidayPrefs("XX|h"), null);
  assert.equal(parseHolidayPrefs("SN"), null);
  assert.equal(parseHolidayPrefs(undefined), null);
  assert.equal(serializeHolidayPrefs({ state: "BE", publicHolidays: false, school: true }), "BE|s");
});

test("Daten: jedes Land hat Feiertage und Ferien fuer alle drei Jahre; Landesfeiertage stimmen", () => {
  for (const state of HOLIDAY_STATES) {
    for (const year of [2026, 2027, 2028]) {
      assert.ok(PUBLIC_HOLIDAYS[state].some(([day]) => day.startsWith(String(year))), `${state} ${year} Feiertage`);
      assert.ok(SCHOOL_HOLIDAYS[state].some(([start]) => start.startsWith(String(year))), `${state} ${year} Ferien`);
    }
  }
  const has = (state: (typeof HOLIDAY_STATES)[number], day: string) => PUBLIC_HOLIDAYS[state].some(([d]) => d === day);
  assert.ok(has("SN", "2026-11-18"), "Buss- und Bettag nur Sachsen");
  assert.ok(!has("BE", "2026-11-18"));
  assert.ok(has("BE", "2026-03-08"), "Frauentag Berlin");
  assert.ok(has("BB", "2026-10-31"), "Reformationstag Brandenburg");
  assert.ok(has("BY", "2026-01-06") && !has("NW", "2026-01-06"));
});

test("Marken: Feiertag und Ferien je Tag, nur im Zeitraum; ohne Wahl nichts", () => {
  assert.equal(holidayMarks(null, "2026-01-01", "2026-12-31").size, 0);
  const marks = holidayMarks({ state: "SN", publicHolidays: true, school: false }, "2026-11-01", "2026-11-30");
  assert.equal(marks.get("2026-11-18")?.holiday, "Buß- und Bettag");
  assert.equal(marks.get("2026-11-18")?.school, null);
  const school = holidayMarks({ state: "BE", publicHolidays: false, school: true }, "2026-07-01", "2026-09-30");
  assert.ok([...school.values()].some((mark) => mark.school === "Sommerferien" && mark.schoolStarts));
  assert.ok([...school.values()].every((mark) => mark.holiday === null));
});

test("Namen: englisch uebersetzt, Unbekanntes bleibt", () => {
  assert.equal(holidayName("Sommerferien", "en"), "Summer break");
  assert.equal(holidayName("Sommerferien", "de"), "Sommerferien");
  assert.equal(holidayName("Schulfrei", "en"), "Schulfrei");
});
