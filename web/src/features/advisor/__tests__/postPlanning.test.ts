import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TEMPLATE_STEPS, checkPostDay, nationalHolidays, suggestPostsForEvent } from "@/features/advisor/postPlanning";

test("Postings: Wochenende und bundesweite Feiertage werden erkannt, mit Werktag davor und danach", () => {
  assert.deepEqual(checkPostDay("2026-11-11"), { ok: true });
  assert.deepEqual(checkPostDay("2026-11-14"), { ok: false, reason: "saturday", holiday: null, before: "2026-11-13", after: "2026-11-16" });
  assert.deepEqual(checkPostDay("2026-11-15"), { ok: false, reason: "sunday", holiday: null, before: "2026-11-13", after: "2026-11-16" });
  // 25.12.2026 ist ein Freitag, der 26. ein Samstag: davor Donnerstag, danach Montag.
  assert.deepEqual(checkPostDay("2026-12-25"), { ok: false, reason: "holiday", holiday: "1. Weihnachtstag", before: "2026-12-24", after: "2026-12-28" });
  // Ostern 2027 ist am 28. Maerz.
  const holidays = nationalHolidays(2027);
  assert.equal(holidays.get("2027-03-26"), "Karfreitag");
  assert.equal(holidays.get("2027-03-29"), "Ostermontag");
  assert.equal(holidays.get("2027-05-06"), "Christi Himmelfahrt");
  assert.equal(holidays.get("2027-05-17"), "Pfingstmontag");
});

test("Postings: eine Vorlage auf eine Veranstaltung - LinkedIn und Instagram eine Woche vorher, Vergangenes faellt weg", () => {
  const suggestions = suggestPostsForEvent({ eventId: "e", title: "Masterclass Pricing", day: "2026-11-21" }, DEFAULT_TEMPLATE_STEPS, "2026-11-05", () => "Ankündigung");
  assert.deepEqual(suggestions.map((entry) => [entry.channel, entry.plannedOn, entry.title, entry.check.ok]), [
    ["linkedin", "2026-11-14", "Masterclass Pricing – Ankündigung", false],
    ["instagram", "2026-11-14", "Masterclass Pricing – Ankündigung", false],
  ]);
  const late = suggestPostsForEvent({ eventId: "e", title: "X", day: "2026-11-08" }, [{ days: -7, channel: "linkedin", label: null, time: null }, { days: 1, channel: "linkedin", label: "Rückblick", time: null }], "2026-11-05", () => "Ankündigung");
  assert.deepEqual(late.map((entry) => [entry.plannedOn, entry.title]), [["2026-11-09", "X – Rückblick"]]);
});
