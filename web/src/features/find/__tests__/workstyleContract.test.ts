import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { parseDiscoveryWorkstyleSignals } from "@/features/find/workstyleSignals";
import { workstyleSetupHandoff, workstyleSetupHref } from "@/features/reporting/workstyle/setupHandoff";
import { buildAboutYou } from "@/features/profile/aboutYou";

test("FIND payload strips raw answers and orders areas without ranking", () => {
 const rows = parseDiscoveryWorkstyleSignals([{area_key:"ORG",pattern:"DISCUSSION_POINT",value:5,item_key:"ORG-01"},{area_key:"EVI",pattern:"SIMILAR_PATTERN",distance:0},{area_key:"DEC",pattern:"SIMILAR_PATTERN"},{area_key:"EXP",pattern:"GOOD_MATCH"}]);
 assert.deepEqual(rows,[{area_key:"EVI",pattern:"SIMILAR_PATTERN"},{area_key:"ORG",pattern:"DISCUSSION_POINT"}]);
 assert.deepEqual(parseDiscoveryWorkstyleSignals(null),[]);
});
test("handoff only accepts product areas and carries a question, never an agreement", () => {
 for(const area of ['EVI','EXP','EL','VOICE','AMB','ORG']) {
  assert.ok(workstyleSetupHandoff(area)?.question);
  assert.match(workstyleSetupHref('team',area),/^\/teams\/team\/setup\//);
 }
 for(const area of ['DEC','FS','EVI-04','__proto__','<script>'])assert.equal(workstyleSetupHandoff(area),null);
 const page=readFileSync('src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx','utf8');
 assert.match(page,/initialBody=\{handoff\?\.question/);
 assert.match(page,/proposedHandoff\?\.topic === itemKey/);
});
test("current profile status reader uses v0.4 and does not copy old answers", () => {
 const source=readFileSync('src/features/profile/aboutYouData.ts','utf8');
 assert.match(source,/eq\("instrument_id", CURRENT_WORKSTYLE_INSTRUMENT\)/);
 assert.doesNotMatch(source,/FOUNDER_PROFILE_INSTRUMENT_ID|\.insert\(|\.upsert\(/);
 // Existing step contract: completion and draft are distinct even before first answer.
 assert.equal(buildAboutYou({marks:new Set<string>(),workAnswers:0,workSubmitted:true} as unknown as Parameters<typeof buildAboutYou>[0]).find(s => s.id === "arbeitsweise")?.status,'doneForNow');
 assert.equal(buildAboutYou({marks:new Set<string>(),workAnswers:0,workSubmitted:false,workStarted:true} as unknown as Parameters<typeof buildAboutYou>[0]).find(s => s.id === "arbeitsweise")?.status,'started');
});
test("current FIND pages never call a historical score or preference reader", () => {
 for(const path of ['src/app/(product)/discovery/page.tsx','src/app/(product)/discovery/[profileId]/page.tsx']) {
  const source=readFileSync(path,'utf8'); assert.doesNotMatch(source,/getCandidateMatch|matchPoints\(|getOwnPreferences/);
 }
});
