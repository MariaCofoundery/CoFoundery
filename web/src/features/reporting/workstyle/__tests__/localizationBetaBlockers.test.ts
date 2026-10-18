import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { getItemsV22 } from "@/features/instruments/align/registries";
import { alignmentDisplayEntry, alignmentDisplayText } from "@/features/instruments/align/display";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import { buildCards, CARD_LIBRARY } from "@/features/instruments/align/conversationCards";
import { buildCardsV21, CARD_LIBRARY_V21 } from "@/features/instruments/v21/conversationCardsV21";
import type { ItemComparison } from "@/features/instruments/v21/comparisonV21";

const source = (path: string) => readFileSync(path, "utf8");
const german = /[äöüßÄÖÜ]|\b(?:oder|noch|von|zum|zur|wird|werden|sind|bitte|Deine|Dein|Euer|Eure|Antworten|Bereich|keine|nicht|möchte|Frage|Fragen|Vorgehen|Erfahrung|Verantwortung|Vorhaben|Anliegen)\b/;

test("P0-01/02/03/04/05/06: real EN components render reports, entry and all answer formats without German P0 copy", () => {
  const out = execFileSync(process.execPath, ["scripts/localization-p0-render.cjs"], {encoding:"utf8",maxBuffer:4*1024*1024});
  assert.match(out, /EN entry, all Founder\/Venture field formats, missing readouts and discussion marks passed/);
  assert.match(out, /Research consent DE\/EN rendered from versioned documents/);
});

test("P0-01/02: profile, advisor, individual/team and print callers explicitly pass request locale", () => {
  for (const page of [
    "src/app/me/profile/page.tsx", "src/app/me/profile/print/page.tsx",
    "src/app/me/profile/workstyle/page.tsx", "src/app/(product)/advisor/person/[userId]/page.tsx",
    "src/app/(product)/teams/[teamId]/workstyle/page.tsx",
  ]) assert.match(source(page), /<(?:IndividualWorkstyle|TeamWorkstyleReport) locale=\{(?:locale|await getDisplayLocale\(\))\}/, page);
  for (const page of ["src/app/me/profile/workstyle/page.tsx","src/app/(product)/teams/[teamId]/workstyle/page.tsx"])
    assert.doesNotMatch(source(page), /t\("germanOnly"\)/);
});

test("P0-04/06: user text and raw answer values remain unchanged in EN", () => {
  const item = getItemsV22("venture_alignment").find(i=>i.answerFormat === "structured_text")!;
  assert.ok(item);
  const entry = readAnswer({blockId:item.itemId,value:{text:"Mein eigener deutscher Text bleibt erhalten."}}, [], item)!;
  const before = structuredClone(entry);
  const en = alignmentDisplayEntry(entry, "en");
  assert.deepEqual(entry,before);
  assert.deepEqual(en.value,before.value);
  assert.notEqual(en.prompt,entry.prompt);
  assert.doesNotMatch(en.prompt,german);
  assert.equal(alignmentDisplayText("Meine persönliche Notiz", "en"), "Meine persönliche Notiz");
});

test("P0-04: partner interpolation localizes the owned template and preserves the name", () => {
  // Phase 1.1: keine aktuelle Frage traegt mehr [Name] (R02 ohne Namen). Die
  // Ersetzung im Katalog bleibt fuer die fruehere Fassung lesbar.
  assert.equal(getItemsV22("venture_alignment").filter(i=>i.prompt.includes("[Name]")).length, 0);
  const template = "Wie viele Stunden pro Woche erwartest du in den nächsten zwölf Wochen ungefähr von [Name]?";
  const translated = alignmentDisplayText(template.replace("[Name]","Jörg Müller"),"en");
  assert.ok(translated.includes("Jörg Müller"));
  assert.equal(translated,alignmentDisplayText(template,"en").replace("[Name]","Jörg Müller"));
  const r02 = getItemsV22("venture_alignment").find(i=>i.itemId==="R02")!;
  assert.notEqual(alignmentDisplayText(r02.prompt,"en"), r02.prompt, "R02 hat keine EN-Fassung");
});

for (const [name, library, build] of [["current", CARD_LIBRARY, buildCards],["historical", CARD_LIBRARY_V21, buildCardsV21]] as const) {
  test(`P0-06: ${name} discussion cards preserve selection/IDs while all copy is EN`, () => {
    for (const card of library.cards) {
      const id = "itemIds" in card.trigger ? card.trigger.itemIds[0] : "TEST";
      const state = card.trigger.kind === "withheld" ? "no_basis" : card.trigger.kind === "item_same" ? "same" : card.trigger.kind === "item_partly_same" ? "partly_same" : card.trigger.kind === "item_side_by_side" ? "side_by_side" : "different";
      const entry = {itemId:id,section:"Founder-Arbeitsprofil",prompt:"Test",missing:null,value:{kind:"choice",label:"keine feste Erwartung",text:null}};
      const item = {itemId:id,section:entry.section,prompt:"Test",state,why:state==="no_basis"?"withheld_a":null,a:entry,b:entry} as ItemComparison;
      if (card.trigger.kind === "value_case_differs") item.a = {...entry,value:{kind:"case",path:"etwas anderes",concerns:[]}};
      const input = {comparison:[{section:entry.section,items:[item]}],nameA:"Alex",nameB:"Sam",markedItemIds:card.trigger.kind==="marked"?[id]:[]};
      const de = build(input), en = build({...input,locale:"en"});
      assert.deepEqual(en.map(c=>c.id),de.map(c=>c.id));
      // Existing item_answered templates are not selected by pick(). This P0 fix
      // preserves that behavior instead of changing the conversation rules.
      if (card.trigger.kind !== "item_answered") assert.ok(en.length,card.id);
      en.forEach(c=>assert.doesNotMatch(JSON.stringify(c),german,card.id));
    }
  });
}


test("P0-06: removed-boundary system fallback is EN while boundary notes stay original", () => {
  const item = getItemsV22("venture_alignment")[0];
  const base = readAnswer({blockId:item.itemId,missingCode:item.missing[0].code}, [], item)!;
  const entry = {...base, missing:null, value:{kind:"perEntry" as const,entries:[
    {about:"zu einer Grenze, die es nicht mehr gibt",text:"Meine Antwort"},
    {about:"Meine eigene Grenze",text:"Mein eigener Text"},
  ]}};
  const translated = alignmentDisplayEntry(entry,"en");
  assert.deepEqual(translated.value,{kind:"perEntry",entries:[
    {about:"About a boundary that has been removed",text:"Meine Antwort"},
    {about:"Meine eigene Grenze",text:"Mein eigener Text"},
  ]});
  assert.equal(entry.value.entries[0].about,"zu einer Grenze, die es nicht mehr gibt");
});

test("P0-04/06: every German-keyed t() literal in ALIGN/v21 components has an EN catalog entry", () => {
  // These components translate by German source text and fall back to German
  // silently. A reworded literal (e.g. the venture placeholder after the
  // rebrand) must fail here instead of showing German in EN.
  const files = [
    ...["Questionnaire", "ConfirmVentureAnswers", "VentureHeader"].map((f) => `src/features/instruments/align/${f}.tsx`),
    ...["MarkV21", "ComparisonViewV21", "ConversationCardsView", "AnswerFieldV21"].map((f) => `src/features/instruments/v21/${f}.tsx`),
  ];
  let count = 0;
  for (const file of files) {
    for (const match of source(file).matchAll(/\bt\("((?:[^"\\]|\\.)*)"\)/g)) {
      const literal = JSON.parse(`"${match[1]}"`) as string;
      count += 1;
      assert.notEqual(alignmentDisplayText(literal, "en"), literal, `${file}: ${literal}`);
    }
  }
  assert.ok(count > 50, "the literal scan still finds the component copy");
  assert.equal(alignmentDisplayText("z. B. Made2Found oder Projekt X", "en"), "e.g., Made2Found or Project X");
});

test("P0-03: the ALIGN entry page title follows the request locale", () => {
  const page = source("src/app/(product)/research/workstyle-pretest/page.tsx");
  assert.match(page, /export async function generateMetadata\(\): Promise<Metadata> \{\s*const t = await getTranslations\("report\.workstyle"\);\s*return \{ title: t\("individualTitle"\), robots: \{ index: false, follow: false \}, referrer: "no-referrer" \};/);
  assert.doesNotMatch(page, /export const metadata\b/);
  assert.doesNotMatch(page, /title: "/);
  const title = (locale: string) => JSON.parse(source(`messages/${locale}/report.json`)).workstyle.individualTitle;
  assert.equal(title("de"), "Wie du arbeitest");
  assert.equal(title("en"), "How you work");
  assert.doesNotMatch(title("en"), german);
});
