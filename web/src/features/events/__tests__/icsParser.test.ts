import assert from "node:assert/strict";
import test from "node:test";
import { parseIcs } from "@/features/events/icsParser";

const NOW = new Date("2026-11-05T10:00:00Z");
const ics = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nX-WR-TIMEZONE:Europe/Berlin\r\n${body}END:VCALENDAR\r\n`;

test("iCal: Fakten werden uebernommen - Titel, Beginn mit Zeitzone, Ende, Ort, Link; Beschreibung nie", () => {
  const events = parseIcs(
    ics(
      "BEGIN:VEVENT\r\nUID:abc-1\r\nSUMMARY:Gründungsstammtisch\\, Leipzig\r\nDTSTART;TZID=Europe/Berlin:20261112T190000\r\nDTEND;TZID=Europe/Berlin:20261112T213000\r\nLOCATION:Basislager\\, Leipzig\r\nURL:https://example.org/events/1\r\nDESCRIPTION:Lange geschuetzte Beschreibung\r\nORGANIZER;CN=Gründerzentrum:mailto:info@example.org\r\nEND:VEVENT\r\n",
    ),
    null,
    NOW,
  );
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    external_id: "abc-1",
    title: "Gründungsstammtisch, Leipzig",
    starts_at: "2026-11-12T18:00:00.000Z",
    ends_at: "2026-11-12T20:30:00.000Z",
    all_day: false,
    place: "Basislager, Leipzig",
    online: false,
    organizer: "Gründerzentrum",
    url: "https://example.org/events/1",
  });
  assert.doesNotMatch(JSON.stringify(events), /Beschreibung|mailto/);
});

test("iCal: gefaltete Zeilen, UTC, ganztaegig, Sommerzeit, online erkannt", () => {
  const events = parseIcs(
    ics(
      "BEGIN:VEVENT\r\nUID:a\r\nSUMMARY:Förderprogramme kompakt –\r\n  Webinar\r\nDTSTART:20261113T150000Z\r\nURL:https://example.org/a\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:b\r\nSUMMARY:Gründungswoche\r\nDTSTART;VALUE=DATE:20261116\r\nDTEND;VALUE=DATE:20261121\r\nURL:https://example.org/b\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:c\r\nSUMMARY:Sommerfest\r\nDTSTART:20270701T180000\r\nURL:https://example.org/c\r\nEND:VEVENT\r\n",
    ),
    null,
    NOW,
  );
  assert.equal(events[0].title, "Förderprogramme kompakt – Webinar");
  assert.equal(events[0].starts_at, "2026-11-13T15:00:00.000Z");
  assert.equal(events[0].online, true);
  assert.equal(events[1].all_day, true);
  assert.equal(events[1].starts_at, "2026-11-15T23:00:00.000Z");
  assert.ok(events[1].ends_at! < "2026-11-20T23:00:00.000Z");
  // Ohne Zone gilt die des Kalenders - im Juli Sommerzeit (UTC+2).
  assert.equal(events[2].starts_at, "2027-07-01T16:00:00.000Z");
});

test("iCal: ohne Link, ohne Kennung, abgesagt oder vorbei - nicht uebernommen; der Link der Quelle springt ein", () => {
  const body =
    "BEGIN:VEVENT\r\nUID:nolink\r\nSUMMARY:Ohne Link\r\nDTSTART:20261120T100000Z\r\nEND:VEVENT\r\n" +
    "BEGIN:VEVENT\r\nSUMMARY:Ohne UID\r\nDTSTART:20261120T100000Z\r\nURL:https://example.org/x\r\nEND:VEVENT\r\n" +
    "BEGIN:VEVENT\r\nUID:cancel\r\nSUMMARY:Abgesagt\r\nSTATUS:CANCELLED\r\nDTSTART:20261120T100000Z\r\nURL:https://example.org/y\r\nEND:VEVENT\r\n" +
    "BEGIN:VEVENT\r\nUID:past\r\nSUMMARY:Vorbei\r\nDTSTART:20261001T100000Z\r\nURL:https://example.org/z\r\nEND:VEVENT\r\n" +
    "BEGIN:VEVENT\r\nUID:http\r\nSUMMARY:Unsicherer Link\r\nDTSTART:20261120T100000Z\r\nURL:http://example.org/z\r\nEND:VEVENT\r\n";
  assert.deepEqual(parseIcs(ics(body), null, NOW).map((event) => event.external_id), []);
  assert.deepEqual(parseIcs(ics(body), "https://example.org/kalender", NOW).map((event) => event.external_id), ["nolink", "http"]);
});
