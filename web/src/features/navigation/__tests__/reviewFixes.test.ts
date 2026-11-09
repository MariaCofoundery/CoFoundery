import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { feedbackContextOf } from "@/features/feedback/feedbackModel";
import { berlinDayOf, berlinToday } from "@/lib/berlinTime";
import { weekOf } from "@/features/advisor/socialCalendarModel";

const code = (path: string) => readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

test("Feedback aus dem Teamraum wird mit den echten Adressteilen eingeordnet", () => {
  assert.deepEqual(feedbackContextOf("/advisor/teamraum/social-media"), { area: "teamraum", sub: "social" });
  assert.deepEqual(feedbackContextOf("/advisor/teamraum/wer-macht-was"), { area: "teamraum", sub: "who" });
  assert.deepEqual(feedbackContextOf("/advisor/teamraum/seiten"), { area: "teamraum", sub: "pages" });
  assert.deepEqual(feedbackContextOf("/advisor/teamraum/chat/abc"), { area: "teamraum", sub: "chat" });
  // Dieselben Adressteile wie die Routen selbst - sonst driftet das auseinander.
  const routes = readFileSync("src/features/advisor/teamraumRoutes.ts", "utf8");
  for (const segment of ["aufgaben", "chat", "social-media", "seiten", "wer-macht-was"]) assert.match(routes, new RegExp(`"${segment}"`), segment);
});

test("eine erfundene Woche in der Adresse stürzt die Seite nicht ab", () => {
  const today = "2026-11-09";
  assert.equal(weekOf("2026-13-45", today), "2026-11-09");
  assert.equal(weekOf("2026-00-10", today), "2026-11-09");
  assert.equal(weekOf("quatsch", today), "2026-11-09");
  assert.equal(weekOf(undefined, today), "2026-11-09");
  assert.equal(weekOf("2026-11-12", today), "2026-11-09");
  assert.equal(weekOf("2026-02-30", today).length, 10);
});

test("heute ist der Tag in Berlin, nicht in UTC", () => {
  // 23:30 UTC am 8.11. ist 00:30 am 9.11. in Berlin (Winterzeit); im Sommer 01:30.
  assert.equal(berlinDayOf("2026-11-08T23:30:00Z"), "2026-11-09");
  assert.equal(berlinDayOf("2026-07-08T22:30:00Z"), "2026-07-09");
  assert.equal(berlinDayOf("2026-11-09T10:00:00Z"), "2026-11-09");
  assert.match(berlinToday(), /^\d{4}-\d{2}-\d{2}$/);
  for (const file of [
    "src/features/advisor/calendar/CalendarScreen.tsx",
    "src/features/advisor/TeamraumScreen.tsx",
    "src/app/(product)/advisor/dashboard/page.tsx",
    "src/app/(product)/dashboard/page.tsx",
    "src/app/(product)/programm/page.tsx",
    "src/app/(product)/advisor/programm/[programId]/page.tsx",
    "src/app/(product)/advisor/los-gehts/page.tsx",
  ]) assert.doesNotMatch(code(file), /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/, file);
});

test("Escape schließt nur das Oberste, und nicht mitten im Schreiben das Panel", () => {
  const escape = code("src/features/ui/EscapeCloses.tsx");
  assert.match(escape, /defaultPrevented/);
  assert.match(escape, /"INPUT", "TEXTAREA", "SELECT"/);
  for (const file of [
    "src/features/navigation/workspace/WorkspaceChrome.tsx",
    "src/features/navigation/founder/FounderChrome.tsx",
    "src/features/feedback/ProductFeedbackEntry.tsx",
    "src/features/announcements/AnnouncementPopup.tsx",
    "src/features/announcements/AnnouncementForm.tsx",
  ]) {
    const source = code(file);
    assert.match(source, /event\.key[^;{]*"Escape"/, file);
    assert.match(source, /event\.preventDefault\(\);\s*(?:setMoreOpen|onClose|void dismiss|setShowing)/, `${file}: Escape sagt nicht, dass es zugemacht hat`);
    assert.match(source, /addEventListener\("keydown", \w+, true\)/, `${file}: nicht vor den anderen dran`);
  }
});

test("Posts aus Vorlagen: der Zustand gehört zu einem Termin", () => {
  assert.match(code("src/features/advisor/calendar/EventPanel.tsx"), /key=\{`\$\{event\.eventId\}:\$\{sortedPosts\.length\}`\}/);
});

test("Später im Einrichten beendet auch die Leiste; ohne Einrichtung keine Frage, ob es geholfen hat", () => {
  const actions = code("src/features/advisor/setup/setupActions.ts");
  assert.match(actions, /\(await cookies\(\)\)\.delete\(SETUP_COOKIE\)/);
  assert.match(code("src/app/(product)/advisor/dashboard/page.tsx"), /setup\.progress\.complete && setup\.progress\.done > 0 \? <FeedbackMoment/);
  assert.match(code("src/features/advisor/setup/SetupSessionClient.tsx"), /bottom-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
});

test("Kommentare: Berliner Zeit, und kein Formular im Absatz", () => {
  const tasks = readFileSync("src/features/advisor/ProgramTasks.tsx", "utf8");
  assert.match(tasks, /stamp\.format\(new Date\(comment\.createdAt\)\)/);
  assert.match(tasks, /timeZone: "Europe\/Berlin"/);
  const block = tasks.slice(tasks.indexOf("formerMember"), tasks.indexOf("deleteComment"));
  assert.doesNotMatch(tasks.slice(tasks.indexOf('<p className="flex flex-wrap items-baseline'), tasks.indexOf('<p className="flex flex-wrap items-baseline') + 50), /<p /);
  assert.ok(block.length > 0);
});

test("nach dem Speichern eines Posts springt der Kalender in dessen Monat", () => {
  const actions = code("src/features/advisor/socialCalendarActions.ts");
  assert.match(actions, /const \{ newPost, month: jumpTo, \.\.\.rest \} = extra;/);
  assert.match(actions, /monat: target/);
});
