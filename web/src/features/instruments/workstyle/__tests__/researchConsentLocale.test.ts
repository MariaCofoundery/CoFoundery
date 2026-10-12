import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { researchConsentDocument } from "@/features/instruments/workstyle/researchConsent";

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const de = json("docs/founder-workstyle-research-consent-v3.json");
const en = json("docs/founder-workstyle-research-consent-v3.en.json");

test("the EN consent is a declared translation of the same versioned v3 consent", () => {
  assert.equal(de.language, "de");
  assert.equal(en.language, "en");
  assert.equal(en.translation_of, "founder-workstyle-research-consent-v3.json");
  assert.equal(en.consent_version, de.consent_version);
  assert.equal(en.consent_version, "workstyle_research_v3");
  assert.equal(en.assessment_key, de.assessment_key);
  assert.equal(en.assessment_version, de.assessment_version);
  assert.deepEqual(Object.keys(en).filter((key) => key !== "translation_of"), Object.keys(de));
});

test("DE and EN consent keep the same paragraph structure and are actually translated", () => {
  assert.equal(en.paragraphs.length, de.paragraphs.length);
  for (const doc of [de, en]) {
    assert.ok(doc.paragraphs.every((paragraph: unknown) => typeof paragraph === "string" && paragraph.trim().length > 0));
    assert.ok(typeof doc.confirmation === "string" && doc.confirmation.trim().length > 0);
  }
  en.paragraphs.forEach((paragraph: string, index: number) => assert.notEqual(paragraph, de.paragraphs[index]));
  assert.notEqual(en.confirmation, de.confirmation);
});

test("the displayed consent is selected by locale from the versioned documents", () => {
  assert.deepEqual(researchConsentDocument("de"), de);
  assert.deepEqual(researchConsentDocument("en"), en);
});

test("WorkstyleProfileFlow renders the versioned document and no consent_* message keys", () => {
  const flow = readFileSync("src/features/instruments/workstyle/WorkstyleProfileFlow.tsx", "utf8");
  assert.match(flow, /researchConsentDocument\(useLocale\(\) as AppLocale\)/);
  assert.match(flow, /consentDocument\.paragraphs\.map/);
  assert.match(flow, /\{consentDocument\.confirmation\}/);
  assert.doesNotMatch(flow, /consent_p\d|consent_confirmation/);
  for (const locale of ["de", "en"]) {
    const messages = json(`messages/${locale}/workstyleFlow.json`);
    for (const key of Object.keys(messages)) assert.doesNotMatch(key, /^consent_(p\d|confirmation)$/, `${locale}: ${key}`);
  }
});

test("the stored consent version still comes from the German v3 document, independent of locale", () => {
  const actions = readFileSync("src/features/instruments/workstyle/actions.ts", "utf8");
  assert.match(actions, /import consentV3 from "\.\.\/\.\.\/\.\.\/\.\.\/docs\/founder-workstyle-research-consent-v3\.json";/);
  assert.match(actions, /start_workstyle_research", \{ p_consent_version: consentV3\.consent_version/);
  assert.doesNotMatch(actions, /consent-v3\.en\.json|researchConsentDocument|locale/);
});
