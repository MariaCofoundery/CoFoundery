import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";

const clientSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
  "utf8"
);

const premiumStepIds = [
  "vision_direction",
  "roles_responsibility",
  "decision_rules",
  "commitment_load",
  "collaboration_conflict",
  "ownership_risk",
  "values_guardrails",
  "alignment_90_days",
] as const;

const expectedQuestions = {
  de: {
    vision_direction:
      "Welche Richtung wollt ihr mit dem Unternehmen verfolgen - und was ist euch dabei jeweils wichtig?",
    roles_responsibility:
      "Wie wollt ihr Rollen, Zustaendigkeiten und Verantwortung im Team verteilen?",
    decision_rules:
      "Wenn ihr bei einer wichtigen Frage unterschiedlich denkt: Was brauchst du, um eine Entscheidung mitzutragen - auch wenn sie nicht deiner eigenen Praeferenz entspricht?",
    commitment_load:
      "Welche zeitliche Verfuegbarkeit und Arbeitsbelastung koennt und wollt ihr aktuell einbringen?",
    collaboration_conflict:
      "Wenn es zwischen euch wirklich schwierig wird: Was brauchst du, damit ein Konflikt angesprochen, verstanden und wieder bearbeitet werden kann?",
    ownership_risk:
      "Wie wollt ihr Verantwortung, Beteiligung und persoenliche oder finanzielle Risiken miteinander klaeren?",
    values_guardrails:
      "Welche Prinzipien, Grenzen oder Prioritaeten sollen euch bei wichtigen Entscheidungen Orientierung geben?",
    alignment_90_days:
      "Worauf wollt ihr euch in den naechsten 90 Tagen konkret konzentrieren?",
  },
  en: {
    vision_direction:
      "What direction do you want to pursue with the company, and what matters to each of you along the way?",
    roles_responsibility:
      "How do you want to divide roles and responsibilities within the team?",
    decision_rules:
      "When you see an important issue differently, what do you need in order to support a decision even when it is not your own preference?",
    commitment_load:
      "What level of time commitment and workload can each of you realistically take on right now?",
    collaboration_conflict:
      "When things become genuinely difficult between you, what do you need so a conflict can be raised, understood, and worked through again?",
    ownership_risk:
      "How do you want to clarify responsibility, ownership, and personal or financial risk between you?",
    values_guardrails:
      "Which principles, boundaries, or priorities should guide you when making important decisions?",
    alignment_90_days: "What do you want to focus on over the next 90 days?",
  },
} as const;

const expectedGuidedFlow = {
  de: {
    collectIntro:
      "Bringt zunaechst eure Perspektiven ein. Ihr muesst euch hier noch nicht auf eine gemeinsame Formulierung einigen.",
    weightingIntro: "Schaut euch die eingebrachten Punkte an und ordnet sie jeweils fuer euch ein.",
    ruleIntro:
      "Formuliert anschliessend, was ihr fuer diesen Punkt konkret festhalten wollt. Die aktuelle Fassung soll eure Vereinbarung verstaendlich festhalten und kann spaeter angepasst werden.",
  },
  en: {
    collectIntro:
      "Start by adding your individual perspectives. You do not need to agree on a shared wording at this stage.",
    weightingIntro: "Review the points you have added and respond to each one individually.",
    ruleIntro:
      "Next, write down what you want to agree on for this point. The current version should capture your agreement clearly and can be revised later.",
  },
} as const;

test("all eight premium questions and shared intros have symmetric DE and EN content", () => {
  const de = getWorkbookContent("de");
  const en = getWorkbookContent("en");

  assert.deepEqual(Object.keys(de.premiumSteps), premiumStepIds);
  assert.deepEqual(Object.keys(en.premiumSteps), premiumStepIds);
  for (const stepId of premiumStepIds) {
    assert.equal(de.premiumSteps[stepId].question, expectedQuestions.de[stepId]);
    assert.equal(en.premiumSteps[stepId].question, expectedQuestions.en[stepId]);
    assert.notEqual(de.premiumSteps[stepId].question.trim(), "");
    assert.notEqual(en.premiumSteps[stepId].question.trim(), "");
  }

  assert.deepEqual(de.premiumWorkflow.guidedFlow, expectedGuidedFlow.de);
  assert.deepEqual(en.premiumWorkflow.guidedFlow, expectedGuidedFlow.en);
  assert.deepEqual(
    Object.keys(de.premiumWorkflow.guidedFlow),
    Object.keys(en.premiumWorkflow.guidedFlow)
  );
});

test("the active premium client uses only locale-aware question and intro sources", () => {
  assert.match(clientSource, /systemText\(currentPremiumFieldGuidance\.question\)/u);
  assert.match(clientSource, /systemText\(guidedFlow\.collectIntro\)/u);
  assert.match(clientSource, /systemText\(guidedFlow\.weightingIntro\)/u);
  assert.match(clientSource, /systemText\(guidedFlow\.ruleIntro\)/u);
  assert.doesNotMatch(
    clientSource,
    /currentPremiumV2Config\.(?:question|collectIntro|weightingIntro|ruleIntro)/u
  );

  assert.match(
    clientSource,
    /placeholder=\{systemText\(currentPremiumFieldGuidance\.collectPlaceholder\)\}/u
  );
  assert.doesNotMatch(clientSource, /currentPremiumV2Config\.collectPlaceholder/u);
  assert.match(clientSource, /systemText\(currentPremiumFieldGuidance\.collectHelper\)/u);
  assert.match(clientSource, /workbookContent\.premiumWorkflow\.reactionPresentation/u);
});

test("active questions and intros avoid normative team and effectiveness claims", () => {
  for (const locale of ["de", "en"] as const) {
    const content = getWorkbookContent(locale);
    const activeCopy = [
      ...premiumStepIds.map((stepId) => content.premiumSteps[stepId].question),
      ...Object.values(content.premiumWorkflow.guidedFlow),
    ].join("\n");

    assert.doesNotMatch(
      activeCopy,
      /tragfaehig|belastbar|gefaehrlich|kritischer (?:Punkt|Eskalationspunkt)|Konfliktrisiko|gemeinsamer Nenner|ihr seid euch einig|ihr ergaenzt euch gut|produktiver Unterschied|gemeinsame Basis|Alignment erreicht|nicht unser Weg|opportunistisch|bewusst geparkt|sustainable|robust|dangerous|conflict risk|common ground|you agree|complement each other well|productive difference|alignment achieved/iu
    );
  }
});

test("commitment, conflict, values, and rule guidance preserve the product boundaries", () => {
  const de = getWorkbookContent("de");
  const en = getWorkbookContent("en");

  for (const question of [
    de.premiumSteps.commitment_load.question,
    en.premiumSteps.commitment_load.question,
  ]) {
    assert.doesNotMatch(question, /engagierter|meint es ernster|more committed|more engaged|less committed/iu);
  }
  assert.doesNotMatch(
    `${de.premiumSteps.collaboration_conflict.question}\n${en.premiumSteps.collaboration_conflict.question}`,
    /wieder in Konflikt|previous conflict|conflict again/iu
  );
  assert.doesNotMatch(
    `${de.premiumSteps.values_guardrails.question}\n${en.premiumSteps.values_guardrails.question}`,
    /nicht unser Weg|rote Linie|opportunistisch|richtig|falsch|not our way|red line|opportunistic|right|wrong/iu
  );
  assert.doesNotMatch(
    `${de.premiumWorkflow.guidedFlow.ruleIntro}\n${en.premiumWorkflow.guidedFlow.ruleIntro}`,
    /verhindert Konflikt|traegt sicher|belastbar|passend erkannt|prevents conflict|guaranteed to work|robust|identified as suitable/iu
  );
});

test("the English guided scope contains no active German system copy", () => {
  const en = getWorkbookContent("en");
  const activeEnglishCopy = [
    ...premiumStepIds.map((stepId) => en.premiumSteps[stepId].question),
    ...Object.values(en.premiumWorkflow.guidedFlow),
  ].join("\n");

  assert.doesNotMatch(
    activeEnglishCopy,
    /\b(?:Wie|Welche|Was|Worauf|Bringt|Schaut|Formuliert|Entscheidung|Verantwortung|Zusammenarbeit|Einigung|Vereinbarung)\b/u
  );
});
