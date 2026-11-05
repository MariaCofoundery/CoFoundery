import assert from "node:assert/strict";
import test from "node:test";
import { parseEventList, segmentsOf } from "@/features/advisor/eventListParser";

const TODAY = "2026-11-05";
const FORMATS = [
  { formatId: "f-mc", label: "Masterclass" },
  { formatId: "f-pip", label: "Pitch in Progress" },
  { formatId: "f-fc", label: "Fireside Chat" },
];

test("Programmplan: eine diktierte Aufzaehlung wird zu einzelnen Veranstaltungen mit Format", () => {
  const events = parseEventList(
    "Masterclass Pricing am 12.11. um 18 Uhr im Basislager, Pitch in Progress am 19. November online und Fireside Chat mit Anna am 26.11. 19:30",
    { today: TODAY, formats: FORMATS },
  );
  assert.deepEqual(
    events.map((event) => [event.title, event.day, event.time, event.location, event.formatId]),
    [
      ["Masterclass Pricing", "2026-11-12", "18:00", "Basislager", "f-mc"],
      ["Pitch in Progress", "2026-11-19", null, "Online", "f-pip"],
      ["Fireside Chat mit Anna", "2026-11-26", "19:30", null, "f-fc"],
    ],
  );
});

test("Programmplan: eine Zeile je Veranstaltung, Tag vorn, Jahr und Jahreswechsel", () => {
  const events = parseEventList("12.11. 18:00 Masterclass Pricing\n3.12.2026 Demo Day intern\n15. Januar Kick-off Batch 4 um 10 Uhr", { today: TODAY, formats: FORMATS });
  assert.deepEqual(events.map((event) => [event.title, event.day, event.time, event.kind]), [
    ["Masterclass Pricing", "2026-11-12", "18:00", "education"],
    ["Demo Day", "2026-12-03", null, "internal"],
    ["Kick-off Batch 4", "2027-01-15", "10:00", "education"],
  ]);
});

test("Programmplan: Kommas im Namen bleiben im Namen, Text ohne Tag ergibt nichts", () => {
  assert.deepEqual(segmentsOf("Workshop am 12.11., Fireside Chat mit Anna, Ben und Carla am 26.11."), ["Workshop am 12.11.", "Fireside Chat mit Anna, Ben und Carla am 26.11."]);
  assert.deepEqual(parseEventList("Wir machen bald eine Masterclass.", { today: TODAY, formats: FORMATS }), []);
  assert.deepEqual(parseEventList("Workshop am 31.2.", { today: TODAY }), []);
});
