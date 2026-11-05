import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { splitDictation, suggestTasks } from "@/features/advisor/taskDictation";

// Donnerstag, 5.11.2026
const context = {
  me: "me",
  today: "2026-11-05",
  members: [
    { userId: "me", name: "Maria Muster" },
    { userId: "pia", name: "Pia Beraterin" },
    { userId: "jonas", name: "Jonas Klein" },
  ],
  programs: [
    { programId: "heb", name: "Hebammen-App" },
    { programId: "solar", name: "Solarwerk" },
  ],
};

test("Diktat: drei Sachen in einem Atemzug werden drei Vorschlaege mit Person, Frist und Team", () => {
  const result = suggestTasks(
    "Pia soll bis Freitag den Raum für den Demo Day bestätigen und Jonas fragt die Jury an außerdem muss ich nächste Woche das Feedback für die Hebammen-App schreiben",
    context,
  );
  assert.deepEqual(result, [
    { title: "Den Raum für den Demo Day bestätigen", assigneeUserId: "pia", dueOn: "2026-11-06", programId: null },
    { title: "Fragt die Jury an", assigneeUserId: "jonas", dueOn: null, programId: null },
    { title: "Das Feedback für die Hebammen-App schreiben", assigneeUserId: "me", dueOn: "2026-11-09", programId: "heb" },
  ]);
});

test("Diktat: Fristen in vielen Formen, auch mit Umlaut am Wortanfang", () => {
  const due = (text: string) => suggestTasks(text, context)[0]?.dueOn ?? null;
  assert.equal(due("Catering bestellen übermorgen"), "2026-11-07");
  assert.equal(due("Catering bestellen bis morgen"), "2026-11-06");
  assert.equal(due("Catering heute bestellen"), "2026-11-05");
  assert.equal(due("Bericht bis Ende des Monats"), "2026-11-30");
  assert.equal(due("Bericht bis Ende der Woche"), "2026-11-06");
  assert.equal(due("Rechnung in drei Tagen prüfen"), "2026-11-08");
  assert.equal(due("Rechnung in 2 Wochen prüfen"), "2026-11-19");
  assert.equal(due("Antrag bis zum 12.11. abgeben"), "2026-11-12");
  assert.equal(due("Antrag am 3. Januar abgeben"), "2027-01-03");
  assert.equal(due("Antrag bis Donnerstag"), "2026-11-12");
  assert.equal(due("Send the invoice by tomorrow"), "2026-11-06");
  assert.equal(due("Antrag am 31.02. abgeben"), null);
  assert.equal(due("Einfach so etwas tun"), null);
});

test("Diktat: wer - Name am Anfang, fuer Name, ich, wir; ein Name mitten im Satz macht niemanden zustaendig", () => {
  const who = (text: string) => suggestTasks(text, context)[0]?.assigneeUserId;
  assert.equal(who("Jonas kümmert sich um die Technik"), "jonas");
  assert.equal(who("Die Technik prüfen für Pia"), "pia");
  assert.equal(who("Wir müssen die Technik prüfen"), null);
  assert.equal(who("Mit Pia über die Technik sprechen"), "me");
  assert.equal(suggestTasks("Jonas kümmert sich um die Technik", context)[0].title, "Die Technik");
  assert.equal(suggestTasks("Ich muss das Budget prüfen", context)[0].title, "Das Budget prüfen");
});

test("Diktat: nicht an jedem 'und' trennen, leere Reste fallen weg, hoechstens zwanzig", () => {
  assert.deepEqual(splitDictation("Raum und Technik klären. Und dann. Catering", context.members), ["Raum und Technik klären", "Und dann", "Catering"]);
  assert.equal(suggestTasks("Raum und Technik klären. Und dann.", context).length, 1);
  assert.equal(suggestTasks(Array.from({ length: 30 }, (_, i) => `Aufgabe ${i}`).join(". "), context).length, 20);
});

test("Diktat: Regeln im Browser, kein Dienst, kein Senden des Textes", () => {
  const source = readFileSync("src/features/advisor/taskDictation.ts", "utf8");
  assert.doesNotMatch(source, /fetch\(|anthropic|openai|ollama|import /i);
});

test("Diktat: Vorschlaege werden erst nach Pruefung angelegt, ueber dieselbe Datenbankfunktion, hoechstens zwanzig", () => {
  const ui = readFileSync("src/features/advisor/DictateTasks.tsx", "utf8");
  assert.match(ui, /draft\.include && draft\.title\.trim\(\)\.length > 0/);
  const actions = readFileSync("src/features/advisor/teamraumActions.ts", "utf8");
  const bulk = actions.slice(actions.indexOf("export async function createOrgTasksAction"));
  assert.match(bulk, /\.slice\(0, 20\)/);
  assert.match(bulk, /client\.rpc\("save_org_task"/);
  assert.doesNotMatch(bulk, /\.from\(/);
});
