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
      title: "Decision rules",
      subtitle: "How do you make sure decisions stay clear under pressure?",
      prompts: [
        "What can one person decide alone without asking first?",
        "When do both people need to agree?",
        "What applies when you disagree but need to decide quickly?",
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
      title: "Collaboration & conflict",
      subtitle:
        "How do you handle feedback, clarification, and conflict so they do not sit unresolved or block everyday work?",
      prompts: [
        "What do you address immediately, and what waits for a fixed clarification point?",
        "How do you give critical feedback so it stays clear and does not land as an attack?",
        "What happens when a topic is not resolved in the conversation?",
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
};
