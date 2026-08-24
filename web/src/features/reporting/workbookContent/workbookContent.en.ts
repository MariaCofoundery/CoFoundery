import type { WorkbookContent } from "@/features/reporting/workbookContent/workbookContent";
import type {
  WorkbookPilotFieldBlock,
  WorkbookStructuredOutputType,
} from "@/features/reporting/founderAlignmentWorkbook";
import type { WorkbookStructuredOutputField } from "@/features/reporting/founderAlignmentWorkbookStepContent";

function createStructuredOutputFields(config: {
  principle: { placeholder: string; helperText: string; highlight?: boolean };
  operatingRule: { placeholder: string; helperText: string; highlight?: boolean };
  escalationRule: { placeholder: string; helperText: string; highlight?: boolean };
  boundaryRule: { placeholder: string; helperText: string; highlight?: boolean };
  reviewTrigger: { placeholder: string; helperText: string; highlight?: boolean };
}): WorkbookStructuredOutputField[] {
  const fieldMeta: Array<{
    key: WorkbookStructuredOutputType;
    title: string;
    block: WorkbookPilotFieldBlock;
    config: { placeholder: string; helperText: string; highlight?: boolean };
  }> = [
    {
      key: "principle",
      title: "Guiding principle",
      block: "core_rule",
      config: config.principle,
    },
    {
      key: "operatingRule",
      title: "Working rule",
      block: "core_rule",
      config: config.operatingRule,
    },
    {
      key: "escalationRule",
      title: "Escalation rule",
      block: "escalation_rule",
      config: config.escalationRule,
    },
    {
      key: "boundaryRule",
      title: "Boundary rule",
      block: "escalation_rule",
      config: config.boundaryRule,
    },
    {
      key: "reviewTrigger",
      title: "Review trigger",
      block: "trigger",
      config: config.reviewTrigger,
    },
  ];

  return fieldMeta.map(({ key, title, block, config: fieldConfig }) => ({
    key,
    title,
    outputType: key,
    block,
    markerSensitive: true,
    ...fieldConfig,
  }));
}

export const WORKBOOK_CONTENT_EN: WorkbookContent = {
  steps: [
    {
      id: "vision_direction",
      title: "Company logic",
      subtitle:
        "How do you decide what gets priority in everyday work, what waits, and what pulls you away from your core focus?",
      prompts: [
        "What gets priority when revenue opportunities, product focus, and company building pull in different directions?",
        "Which opportunities or requests do you intentionally not pursue, even if they could bring short-term money or visibility?",
        "What applies when something brings revenue but pulls you away from your core focus?",
      ],
      reportDimensions: ["Unternehmenslogik"],
    },
    {
      id: "roles_responsibility",
      title: "Roles & responsibility",
      subtitle:
        "How do you decide who leads, what stays visible, and when the other person needs to be brought in?",
      prompts: [
        "Which topics can one person clearly lead independently?",
        "Where does the other person need early visibility?",
        "When does individual ownership become a shared topic?",
      ],
      reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Commitment"],
    },
    {
      id: "decision_rules",
      title: "Decisions & decision authority",
      subtitle: "What does each of you need to support important decisions when your perspectives differ?",
      prompts: [
        "For which decisions is having your own decision authority especially important to you, and why?",
        "When is subject-matter ownership more important to you than deciding together?",
        "What would make you feel that a decision was unfair, that you were bypassed, or that you had no influence?",
        "How would you notice early that your current decision rule is no longer working well?",
      ],
      reportDimensions: ["Entscheidungslogik"],
    },
    {
      id: "commitment_load",
      title: "Commitment & load",
      subtitle:
        "How do you make effort, availability, and load visible early before silent pressure builds?",
      prompts: [
        "What is realistically sustainable in normal mode?",
        "What needs to become visible early when capacity starts to tip?",
        "What do you reprioritize first when commitments are no longer sustainable?",
      ],
      reportDimensions: ["Commitment"],
    },
    {
      id: "collaboration_conflict",
      title: "Conflict & collaboration",
      subtitle:
        "What does each of you need so difficult conflict can be raised, understood, and worked through again?",
      prompts: [
        "How might your co-founder notice that something is bothering you before you say it directly?",
        "What makes feedback easier for you to take in, and what is more likely to make you withdraw or become defensive?",
        "After an intense or hurtful conflict, what do you need for trust and collaboration to be rebuilt?",
        "What should happen when one person wants to address something immediately and the other needs some space first?",
      ],
      reportDimensions: ["Arbeitsstruktur & Zusammenarbeit", "Konfliktstil"],
    },
    {
      id: "ownership_risk",
      title: "Ownership & risk",
      subtitle:
        "How do you decide who leads risks, when they become visible, and from which threshold you decide together?",
      prompts: [
        "Which risks does one person lead alone, and where is early visibility needed?",
        "Which threshold ends quiet observation?",
        "When does de-risking take priority over speed?",
      ],
      reportDimensions: ["Risikoorientierung", "Unternehmenslogik"],
    },
    {
      id: "values_guardrails",
      title: "Values & entrepreneurial guardrails",
      subtitle: "How do you decide what is acceptable, what remains a borderline case, and what is not your way?",
      prompts: [
        "Which compromises are still acceptable for you?",
        "Which cases always need conscious shared approval?",
        "What do you not do, even if it looks financially attractive?",
      ],
      reportDimensions: ["Unternehmenslogik", "Risikoorientierung", "Commitment"],
    },
    {
      id: "alignment_90_days",
      title: "90-day focus",
      subtitle:
        "How do you define clearly what has priority over the next 90 days, what waits, and how you measure progress?",
      prompts: [
        "What has absolute priority over the next 90 days?",
        "What will you intentionally not do, even if it seems useful?",
        "How will you notice early that you are truly making progress on your priorities?",
      ],
      reportDimensions: [
        "Unternehmenslogik",
        "Entscheidungslogik",
        "Risikoorientierung",
        "Arbeitsstruktur & Zusammenarbeit",
        "Commitment",
        "Konfliktstil",
      ],
    },
    {
      id: "advisor_closing",
      title: "Advisor closing",
      subtitle: "Which observations, open questions, and next steps should the advisor make visible at the end?",
      prompts: [
        "What should this team not overlook after the session?",
        "Which follow-up questions remain professionally important?",
        "What is the most useful next step?",
      ],
      reportDimensions: [],
    },
  ],
  stepContent: {
    vision_direction: {
      context: [
        "Clarify what truly gets priority in everyday work.",
        "Trigger: revenue opportunity, product focus, and company building pull in different directions at the same time.",
      ],
      everyday:
        "You notice this when a good request suddenly pushes everything else back and nobody clearly says what will wait as a result.",
      scenario:
        "A large customer asks for a custom package that would bring meaningful short-term revenue. At the same time, it would pull your product team away from the core product for weeks. One person wants to say yes; the other wants to protect focus.",
      riskHint:
        "If this stays open, you chase the louder opportunities and renegotiate strategic trade-offs every time.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "Before you pursue an opportunity, you check it against your core focus and against ...",
          helperText:
            "Capture the principle you use to reflect strategic opportunities first.",
        },
        operatingRule: {
          placeholder:
            "When revenue opportunity, product focus, and company building pull at the same time, ... has priority.",
          helperText:
            "Write down the order you use to prioritize when there is a trade-off.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When you read the same opportunity differently, ... pauses first and ... decide by ...",
          helperText:
            "Write down who pauses, who decides, and how you escalate.",
        },
        boundaryRule: {
          placeholder:
            "Even if an opportunity helps short-term, you do not continue if ...",
          helperText:
            "Name the point where you stop despite the upside.",
        },
        reviewTrigger: {
          placeholder:
            "You intentionally review focus and priorities when ...",
          helperText:
            "Name a visible signal rather than a vague feeling.",
        },
      }),
    },
    roles_responsibility: {
      context: ["Clarify who leads and when the other person needs to be brought in."],
      everyday:
        "You notice this when two people pull on the same topic at once or both expect the other person to lead now.",
      scenario:
        "One person leads sales, the other product. An important customer asks for a custom feature on short notice. Both assume the other person is now leading.",
      riskHint:
        "Otherwise work gets duplicated, things fall through the cracks, or nobody decides in time.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, the person responsible for ... leads. Shared visibility is needed whenever ...",
          helperText:
            "Define the principle that separates ownership from shared visibility.",
        },
        operatingRule: {
          placeholder:
            "When a topic falls into this area, ... leads and makes ... visible by ...",
          helperText:
            "Write a concrete working rule, not just a general role description.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When it becomes unclear who leads or two people pull at once, then ...",
          helperText:
            "Define how you clarify ownership conflicts quickly.",
        },
        boundaryRule: {
          placeholder:
            "The leading person may decide alone up to ... . From ... onward, both people need to be involved.",
          helperText:
            "Name the boundary between autonomy and shared decision-making.",
        },
        reviewTrigger: {
          placeholder:
            "You revisit this rule when work is duplicated, gets stuck, or ...",
          helperText:
            "Name a clear signal that your ownership rule no longer holds.",
        },
      }),
    },
    decision_rules: {
      context: ["Clarify who decides and what applies under pressure."],
      everyday:
        "Trigger: a decision is stuck because nobody clearly takes the final step.",
      scenario:
        "You disagree on whether a feature goes live in two weeks or only after two open risks are resolved. One person wants to use the market window; the other wants more de-risking before launch.",
      riskHint:
        "Otherwise you loop for too long or pull a decision back into question later.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, the leading person decides alone as long as ...",
          helperText:
            "Define the principle that separates individual and shared decisions.",
        },
        operatingRule: {
          placeholder:
            "When the decision sits in this area of responsibility, ... decides. When risk, budget, or external impact increases, then ...",
          helperText:
            "Write a clear trigger-based rule, not only a principle.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "If you are not aligned by ... or time pressure increases, then ...",
          helperText:
            "Write a real deadlock or deadline rule, not just 'talk more'.",
        },
        boundaryRule: {
          placeholder:
            "From ... onward, nobody decides alone because ...",
          helperText:
            "Capture the level of impact from which you must decide together.",
        },
        reviewTrigger: {
          placeholder:
            "You revisit this decision rule when decisions ...",
          helperText:
            "Name a signal that the rule creates too much friction or too many loops.",
        },
      }),
    },
    commitment_load: {
      context: [
        "Clarify what is realistic in everyday work and what happens when it becomes too much.",
      ],
      everyday:
        "Trigger: one person responds later, commits less often, or can no longer hold everything.",
      scenario:
        "Over the next six weeks, fundraising, release, and customer meetings all come up. One person can step in much less spontaneously because of family or another job. The other person still expects full availability.",
      riskHint:
        "Otherwise overload only becomes visible when commitments start to wobble or frustration has already built up.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, you address load early as soon as ...",
          helperText:
            "Define the principle for making availability and load visible.",
        },
        operatingRule: {
          placeholder:
            "In normal mode, the expectation for availability, response time, and effort is ...",
          helperText:
            "Write down what you can realistically expect from each other day to day.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When commitments or capacity start to wobble, first ... is adjusted and ... is informed immediately.",
          helperText:
            "Write down what gets reprioritized first.",
        },
        boundaryRule: {
          placeholder:
            "When availability or load reaches this boundary, you stop ... or no longer continue in parallel.",
          helperText:
            "Name the point where you do not simply continue.",
        },
        reviewTrigger: {
          placeholder:
            "You notice early that load is tipping or needs renegotiation when ...",
          helperText:
            "Name a visible signal rather than just a feeling.",
        },
      }),
    },
    collaboration_conflict: {
      context: [
        "Clarify when you address something, how you address it, and what happens if it stays open.",
        "Trigger: criticism sits unresolved, conversations sharpen, or the same friction appears repeatedly.",
      ],
      everyday:
        "You notice this when feedback comes too late, criticism lands as an attack, or the same tension appears across several meetings.",
      scenario:
        "One person addresses problems immediately and directly. The other needs context first and can experience the tone as an attack. After two tense meetings, criticism only appears between the lines.",
      riskHint:
        "If this stays open, conflicts remain unresolved and slow down your collaboration in more and more places.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, you address irritations as soon as ...",
          helperText:
            "Define what counts as friction that needs clarification.",
        },
        operatingRule: {
          placeholder:
            "When something bothers me, I address it ... and use ...",
          helperText:
            "Capture timing, channel, and tone clearly.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When a topic is not resolved day to day or comes back, then ...",
          helperText:
            "Write how you move from everyday friction into a clear clarification format.",
        },
        boundaryRule: {
          placeholder:
            "At the latest when ..., a conflict no longer stays in daily work but ...",
          helperText:
            "Name the boundary from which you stop simply working on.",
        },
        reviewTrigger: {
          placeholder:
            "You revisit your conflict rule when feedback sits unresolved, conversations sharpen, or ...",
          helperText:
            "Name the signal that your current clarification format no longer works.",
        },
      }),
    },
    ownership_risk: {
      context: [
        "Clarify who leads which risk, when it becomes visible, and when you intervene.",
        "Trigger: runway, hiring, technology, or customer commitments become critical and nobody knows who leads now.",
      ],
      everyday:
        "You notice this when a risk stays open too long, is assessed differently, or comes to the table too late.",
      scenario:
        "Runway is getting tighter while a larger product bet is on the table. One person wants to cut costs; the other wants to use the market opportunity. Nobody has clearly defined who leads which risk and when you intervene together.",
      riskHint:
        "If this stays open, risks become visible too late and you only arrive at a shared decision in an emergency.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, for runway, technology, hiring, or customer commitments, the person who ... leads.",
          helperText:
            "Define the principle for assigning risk ownership.",
        },
        operatingRule: {
          placeholder:
            "When a risk falls into this area, ... actively monitors it and makes ... visible.",
          helperText:
            "Assign the most important risk types clearly to one person.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When a risk reaches a critical threshold, then ... and ... decide together on the next step.",
          helperText:
            "Write down the intervention rule for a critical case.",
        },
        boundaryRule: {
          placeholder:
            "From ... onward, you no longer simply continue but stop / limit / decide again.",
          helperText:
            "Name the concrete threshold from which risk is no longer only observed.",
        },
        reviewTrigger: {
          placeholder:
            "You revisit this risk rule when ...",
          helperText:
            "Name the signal that shows early that your current frame is no longer enough.",
        },
      }),
    },
    values_guardrails: {
      context: [
        "Clarify where you say no in everyday work and which boundary is not negotiable.",
        "Trigger: money, growth, or pressure make a step attractive that does not cleanly fit your principles.",
      ],
      everyday:
        "You notice this when a strong deal, a difficult partner, or a tight situation suddenly makes exceptions seem plausible.",
      scenario:
        "A large sales partner would immediately bring reach and revenue, but uses methods you could barely defend to customers and your team. One person wants to use the opportunity; the other wants to hold the line.",
      riskHint:
        "Otherwise you renegotiate every borderline situation and move your boundary step by step.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, you decide against money or growth when ...",
          helperText:
            "Capture the higher-level guardrail that should not become negotiable.",
        },
        operatingRule: {
          placeholder:
            "When an offer is attractive but does not cleanly fit, you first check ...",
          helperText:
            "Formulate your normal-case rule rather than only a general stance.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When you assess a grey area differently or pressure increases, then ...",
          helperText:
            "Define how you pause, clarify, or escalate in sensitive cases.",
        },
        boundaryRule: {
          placeholder:
            "You do not cross this boundary, even if it would help short-term: ...",
          helperText:
            "Write the red line explicitly.",
        },
        reviewTrigger: {
          placeholder:
            "You revisit this guardrail when ...",
          helperText:
            "Name the signal that a special situation is testing your current frame.",
        },
      }),
    },
    alignment_90_days: {
      context: [
        "Clarify what truly has priority over the next 90 days.",
        "Trigger: too many topics seem useful and nobody clearly says what counts first and what intentionally waits.",
      ],
      everyday:
        "You notice this when, after two weeks, too many topics are running in parallel again and focus becomes blurry.",
      scenario:
        "After the report, you have several good topics on the table. Two weeks later, daily business pulls again, new ideas appear, and you notice that each person would move a different thing first.",
      riskHint:
        "Otherwise you lose focus and work on too many topics in parallel.",
      outputFields: createStructuredOutputFields({
        principle: {
          placeholder:
            "In principle, you protect the 90-day focus by ...",
          helperText:
            "Define the principle for testing new topics against your focus.",
        },
        operatingRule: {
          placeholder:
            "Over the next 90 days, these topics have priority: ...",
          helperText:
            "Name a few clear priorities, not a long list.",
          highlight: true,
        },
        escalationRule: {
          placeholder:
            "When new topics appear or priorities shift, then ...",
          helperText:
            "Define how you change focus instead of slowly losing it.",
        },
        boundaryRule: {
          placeholder:
            "During this period, you intentionally will not also start ...",
          helperText:
            "Write down what will not be added in this cycle.",
        },
        reviewTrigger: {
          placeholder:
            "You review this 90-day focus when ...",
          helperText:
            "Name a clear signal that helps you notice progress or loss of focus early.",
        },
      }),
    },
    advisor_closing: {
      context: [
        "At the end of the session, the advisor brings together what should not get lost from an outside perspective.",
        "This closing does not replace a founder agreement. It marks observations, questions, and the most useful next step.",
      ],
      everyday:
        "In everyday work, this helps when important observations and open questions should not disappear between the session and implementation.",
    },
  },
  premiumWorkflow: {
    readyText:
      "You have both added your perspective. Next, you can review and discuss the points together.",
    advisorReadyText: "Both founders have added their perspective.",
    missingPerspectiveText: (missingLabel) =>
      `Before you continue together, a perspective from ${missingLabel} is still missing.`,
    approval: {
      title: "Confirm this version",
      intro:
        "Review the current version once more. Confirm it if it reflects what you have agreed to record for this point.",
      confirmButton: "I confirm this version",
      withdrawButton: "Withdraw confirmation",
    },
    guidedFlow: {
      collectIntro:
        "Start by adding your individual perspectives. You do not need to agree on a shared wording at this stage.",
      weightingIntro: "Review the points you have added and respond to each one individually.",
      ruleIntro:
        "Next, write down what you want to agree on for this point. The current version should capture your agreement clearly and can be revised later.",
    },
    deepDivePilot: {
      label: "Alignment deep dive",
      shortIntro: "What is behind your different or similar perspectives?",
      whyTitle: "Why this topic",
      whyByStep: {
        decision_rules:
          "Decisions are shaped not only by rules, but also by what each person needs in order to experience influence, ownership, and fairness.",
        collaboration_conflict:
          "Difficult situations become easier to discuss when you understand how each of you experiences pressure, feedback, and the way back into collaboration.",
      },
      reflectionPhase: "Reflection",
      reflectionTitle: "What would you like to take forward from this?",
      reflectionHelp:
        "Capture what you want to take from the conversation into your future collaboration. This is not yet a jointly confirmed agreement.",
      reflectionField: "Shared reflection note",
      reflectionPlaceholder: "What do you want to take away from this conversation?",
      legacyTitle: "Previous workbook agreement",
      legacyHelp:
        "This historical agreement and its confirmations remain unchanged.",
      handoffTitle: "Continue in Founder Setup",
      handoffReady:
        "You can copy this reflection note into Founder Setup as an open working note.",
      handoffAction: "Copy reflection to Founder Setup",
      handoffSuccess:
        "The reflection note was copied to Founder Setup as an open working note.",
      handoffError: "The reflection note could not be copied right now.",
      existingNote:
        "Founder Setup already has a shared note for this topic. Open the item there and decide what you want to add from this conversation.",
      openSetup: "Open Founder Setup",
      continueExistingNote: "Continue in Founder Setup",
      continueWithTeam: "Continue with your team in Founder Setup",
      openTeamContext: "Go to your connections",
      backToTopics: "Back to topics",
      threeFounder:
        "This reflection comes from your pairwise alignment. In Founder Setup, you can continue the topic with the whole team.",
      unavailable:
        "Once this relationship is clearly linked to a founder team, you can continue the topic in Founder Setup.",
    },
    sectionTitles: {
      collect: "1. Add perspectives",
      weighting: "2. Respond to the points",
      rule: "3. Record your agreement",
    },
    sharedSpace: {
      collaborativeFounder:
        "You are working in the same space. You can edit your own points; you can respond to the other person's points or add a point of your own.",
      soloFounder:
        "Start with your perspective. The other person can add their own points and respond to existing points later.",
      advisor:
        "Here you can see the founder perspectives added so far. Each contribution remains attributed to the person who added it.",
    },
    ruleFields: {
      editingIntro:
        "Record the current version of your agreement here. You can continue editing it before confirming it.",
      agreementPlaceholder: "Capture your agreement in one or two clear sentences.",
      escalationTitle: "What to do when further clarification is needed",
      escalationPlaceholder:
        "Record how you will proceed if this point remains open or the situation changes.",
      escalationHelper: "Describe a concrete next step, responsibility, or point in time.",
      reviewTitle: "When to review this again",
      reviewPlaceholder: "Record when you want to review this agreement again.",
      reviewHelper: "Name a point in time or an observable change as the trigger.",
      currentAgreementTitle: "Current agreement for this point",
      emptyAgreementText: "No agreement has been recorded yet.",
    },
    suggestionPresentation: {
      title: "Possible starting point",
      intro:
        "This system suggestion is a drafting aid. Review and edit it before adopting it as your agreement.",
      applyButton: "Use as a starting point",
    },
    suggestionGuidance: {
      furtherDiscussion:
        "Discuss points that need further clarification before settling on a final version, and record what remains open.",
      differentResponses:
        "Discuss points you responded to differently and record what each person needs from the agreement.",
    },
    matchingHints: {
      stable_base:
        "The matching result does not prescribe a specific action for this point. You can still review what you want to record explicitly.",
      conditional_complement:
        "The matching result points to different perspectives that may matter differently depending on the situation. Clarify how you want to handle them in practice.",
      high_rule_need:
        "The matching result suggests that an explicit rule may be useful here. Review which responsibility, boundary, or decision you want to record.",
      critical_clarification_point:
        "The matching result marks this point as a possible topic for clarification. Discuss what you want to make more specific before agreeing on a version.",
      default:
        "You can discuss the expectations behind this point and what you want to agree on explicitly.",
    },
    markerImpulseIntro:
      "These questions use the matching context as a possible conversation prompt, not as an assessment of your collaboration.",
    markerImpulses: {
      stable_base: [
        "Which assumptions do you share on this point, and what should still be recorded explicitly?",
        "One possible question is when you want to review this agreement again.",
      ],
      conditional_complement: [
        "You can discuss how your different perspectives should inform a concrete agreement.",
        "What does each person need so that a difference remains manageable in everyday work?",
      ],
      high_rule_need: [
        "It can be helpful to record responsibility, a boundary, and the next review point explicitly.",
        "Which situation should your agreement cover in concrete terms?",
      ],
      critical_clarification_point: [
        "One possible question is what still needs clarification before you settle on a final version.",
        "What next conversation step do you want to agree on for this point?",
      ],
      default: [
        "You can discuss what each person needs regarding this point.",
        "What concrete agreement would help with the next step?",
      ],
    },
    reactionPresentation: {
      prompt: "How would you like to respond to this point right now?",
      choiceHint: "Choose the option that fits best.",
      labels: {
        important: "Especially important",
        agree: "Works for me as is",
        critical: "Discuss further",
      },
      missingLabel: "Still open",
      legacy: {
        label: "Earlier response",
        title: "Earlier response detected",
        body:
          "At least one response comes from an earlier version. Please respond to this point again so your current responses are clear.",
      },
      observations: {
        missing: {
          title: "Response still open",
          body: "At least one current response is still missing.",
        },
        similar: {
          title: "Similar responses",
          importantBody: "This point is especially important to both of you.",
          agreeBody: "This point currently works for both of you as is.",
          furtherDiscussionBody: "You both want to discuss this point further.",
        },
        different: {
          title: "Different responses",
          body:
            "You responded to this point differently. Briefly discuss what is behind each of your responses.",
          furtherDiscussionBody:
            "At least one of you would like to discuss this point further.",
        },
      },
      counters: {
        similar: {
          label: "Similar responses",
          body: "Both current responses use the same option.",
        },
        different: {
          label: "Different responses",
          body: "Both current responses use different options.",
        },
        open: {
          label: "Still open",
          body: "At least one response is missing or comes from an earlier version.",
        },
      },
    },
  },
  premiumSteps: {
    vision_direction: {
      question:
        "What direction do you want to pursue with the company, and what matters to each of you along the way?",
      collectPlaceholder: "Describe a direction, priority, or open trade-off.",
      collectHelper: "Start with two or three clear observations about priorities or focus.",
      agreementTitle: "Direction rule",
      reviewSummary: "Add an optional review point",
      impulseQuestions: [
        "Which direction matters to you for the next phase?",
        "Which opportunities do you want to examine more closely before changing priorities?",
        "What should guide you when topics compete for attention?",
        "When do you want to review your direction together again?",
      ],
      suggestion: {
        agreement:
          "Record which direction or priority should currently apply to this point and which trade-off you are taking into account.",
        escalationRule:
          "Define how you will proceed if you assess a new opportunity differently or the circumstances change.",
        reviewTrigger:
          "Review the agreement at a defined time or when relevant assumptions change.",
      },
    },
    roles_responsibility: {
      question: "How do you want to divide roles and responsibilities within the team?",
      collectPlaceholder: "Describe a role, responsibility, or necessary coordination point.",
      collectHelper:
        "A useful point names the topic, who leads it, and when the other person needs to be involved.",
      agreementTitle: "Responsibility rule",
      reviewSummary: "Add an optional ownership signal",
      impulseQuestions: [
        "Which topics should one person lead?",
        "When does the other person need information or involvement?",
        "Where do you want to make decisions together?",
        "When should you revisit how roles are divided?",
      ],
      suggestion: {
        agreement:
          "Record who leads this point and when the other person will be informed or involved.",
        escalationRule:
          "Define how you will proceed if responsibility is unclear or several areas are involved.",
        reviewTrigger:
          "Review the division of roles when tasks, decision scope, or how you work together changes.",
      },
    },
    decision_rules: {
      question:
        "When you see an important issue differently, what do you need in order to support a decision even when it is not your own preference?",
      collectPlaceholder: "Describe a decision situation or a rule you would find useful.",
      collectHelper: "Start with two or three points rather than a perfect formulation.",
      agreementTitle: "Decision rule",
      reviewSummary: "Add an optional review trigger",
      impulseQuestions: [
        "For which decisions is having your own decision authority especially important to you, and why?",
        "When is subject-matter ownership more important to you than deciding together?",
        "What would make you feel that a decision was unfair, that you were bypassed, or that you had no influence?",
        "How would you notice early that your current decision rule is no longer working well?",
      ],
      suggestion: {
        agreement:
          "Record who decides in which situation and when you plan to consult each other.",
        escalationRule:
          "Define how you will proceed with an open decision, who takes the next step, and which deadline applies.",
        reviewTrigger:
          "Review the rule when decisions repeatedly remain open or responsibilities change.",
      },
    },
    commitment_load: {
      question:
        "What level of time commitment and workload can each of you realistically take on right now?",
      collectPlaceholder: "Describe your current availability, an expectation, or a boundary.",
      collectHelper:
        "A useful point names an expectation, boundary, or early signal. No justification is needed.",
      agreementTitle: "Commitment rule",
      reviewSummary: "Add an optional early warning signal",
      impulseQuestions: [
        "What level of availability is realistic for you right now?",
        "Which expectations do you want to make transparent to each other?",
        "How do you want to raise changes in workload?",
        "What should be reprioritized when capacity changes?",
      ],
      suggestion: {
        agreement:
          "Record the availability and communication you currently agree on for this point.",
        escalationRule:
          "Define how you will adjust priorities, responsibilities, or timelines when capacity changes.",
        reviewTrigger:
          "Review the agreement when availability, workload, or circumstances change.",
      },
    },
    collaboration_conflict: {
      question:
        "When things become genuinely difficult between you, what do you need so a conflict can be raised, understood, and worked through again?",
      collectPlaceholder: "Describe what matters to you when giving feedback or disagreeing.",
      collectHelper: "Start with specific situations rather than long explanations.",
      agreementTitle: "Clarification rule",
      reviewSummary: "Add an optional early warning signal",
      impulseQuestions: [
        "How might your co-founder notice that something is bothering you before you say it directly?",
        "What makes feedback easier for you to take in, and what is more likely to make you withdraw or become defensive?",
        "After an intense or hurtful conflict, what do you need for trust and collaboration to be rebuilt?",
        "What should happen when one person wants to address something immediately and the other needs some space first?",
      ],
      suggestion: {
        agreement:
          "Record how you want to raise and discuss disagreements or difficult situations.",
        escalationRule:
          "Define the conversation format or support you will use if a point remains open.",
        reviewTrigger:
          "Review the agreement if your current way of clarifying issues no longer meets your needs.",
      },
    },
    ownership_risk: {
      question:
        "How do you want to clarify responsibility, ownership, and personal or financial risk between you?",
      collectPlaceholder: "Describe a responsibility, uncertainty, or decision threshold.",
      collectHelper: "A useful point names the risk, the threshold, and who needs to be involved by then.",
      agreementTitle: "Risk ownership rule",
      reviewSummary: "Add an optional early warning signal",
      impulseQuestions: [
        "Which responsibility should one person take on independently?",
        "Which uncertainties should become visible early?",
        "From what point do you want to make a decision together?",
        "When would additional professional advice be useful?",
      ],
      suggestion: {
        agreement:
          "Record who monitors or works on this point and when the other person will be involved.",
        escalationRule:
          "Define which change or threshold leads you to decide together or seek external advice.",
        reviewTrigger:
          "Review the agreement when impacts, uncertainty, or responsibilities change.",
      },
    },
    values_guardrails: {
      question:
        "Which principles, boundaries, or priorities should guide you when making important decisions?",
      collectPlaceholder: "Describe a principle, priority, or boundary that guides you.",
      collectHelper: "A useful point describes a real case rather than an abstract statement of values.",
      agreementTitle: "Guardrail rule",
      reviewSummary: "Add an optional review question",
      impulseQuestions: [
        "Which principles should guide your decisions?",
        "Which priorities do you want to make visible in difficult trade-offs?",
        "Which boundaries does each person want to name explicitly?",
        "How do you want to handle new or ambiguous situations?",
      ],
      suggestion: {
        agreement:
          "Record which principle, priority, or boundary you want to agree on for this point.",
        escalationRule:
          "Define how you will discuss a situation when it affects your principles or boundaries differently.",
        reviewTrigger:
          "Review the agreement when new situations or changed circumstances call for another discussion.",
      },
    },
    alignment_90_days: {
      question: "What do you want to focus on over the next 90 days?",
      collectPlaceholder: "Describe a focus, an outcome, or something you intentionally will not prioritize.",
      collectHelper: "A useful point is a focus decision for the next phase, not a to-do.",
      agreementTitle: "90-day focus",
      reviewSummary: "Set a progress and review point",
      impulseQuestions: [
        "Which outcomes matter to you over the next 90 days?",
        "Where do you want to focus your limited time?",
        "Which topics should not run in parallel for now?",
        "When and how do you want to review your focus?",
      ],
      suggestion: {
        agreement:
          "Record what you want to focus on over the next 90 days and which topics you do not want to pursue in parallel for now.",
        escalationRule:
          "Define how you will handle new topics and decide what to adjust or postpone in response.",
        reviewTrigger:
          "Review your focus at the agreed time or when goals, capacity, or circumstances change substantially.",
      },
    },
  },
};
