import type { ValuesContent } from "@/features/reporting/content/valuesContent";

export const VALUES_CONTENT_EN = {
  intros: {
    blind_spot_watch:
      "The values block mainly shows what you assume in similar ways and therefore may leave unsaid.",
    clear_difference:
      "The values block does not show a hard opposition, but it does show a different standard for what matters first under pressure.",
    nuanced_difference:
      "The values block shows shared ground, alongside a different rhythm in what gains weight first under pressure.",
    shared_basis:
      "The values block mainly shows what you tend to use in similar ways when decisions come under pressure.",
  },
  basisTitles: {
    integrity_speed: "What you measure decisions against",
    stakeholder_balance: "Keep consequences visible",
    resource_fairness: "Distribute pressure fairly",
    commercial_focus: "Commercially grounded",
    long_term_vs_short_term: "Not only for the moment",
  },
  differenceTitles: {
    integrity_speed: "When speed creates pressure",
    stakeholder_balance: "When consequences are weighted differently",
    resource_fairness: "When fairness is read differently",
    commercial_focus: "When firmness enters earlier",
    long_term_vs_short_term: "When time horizons diverge",
  },
  guardrailTitles: {
    integrity_speed: "A clear check before moving",
    stakeholder_balance: "A fixed weighing rule",
    resource_fairness: "A practical fairness check",
    commercial_focus: "A boundary for firmness",
    long_term_vs_short_term: "A double time horizon",
  },
  basisBodies: {
    integrity_speed:
      "For important decisions, you probably look beyond what moves fastest. It also matters whether a step still feels defensible under pressure.",
    stakeholder_balance:
      "When decisions affect the team, customers, or partners, you are unlikely to ignore that impact. You probably both look at who needs to carry a decision and who pays its cost.",
    resource_fairness:
      "With workload, budget, or responsibility, you likely have a similar sense of what still feels fair and reasonable. That can make it easier to discuss sensitive distribution questions beyond efficiency alone.",
    commercial_focus:
      "Commercial viability is probably not a side topic for you. When things get tight, you both tend to ask what truly carries the venture and what only sounds good.",
    long_term_vs_short_term:
      "You do not seem to read decisions only by the next step. You probably both watch whether something helps now and still holds together later.",
  },
  differenceBodies: {
    integrity_speed: {
      clear:
        "Under pressure, one of you may say earlier: this is enough, let us move. The other may hold the line longer until it is clear that the step still holds up in edge cases.",
      default:
        "When pace rises, you probably do not set the line at exactly the same moment. One tends to move earlier, while the other checks longer whether the step remains well grounded.",
    },
    stakeholder_balance: {
      clear:
        "When decisions have side effects, you probably do not weigh them in the same way. One may accept commercial or operational firmness earlier, while the other keeps the impact on team, customers, or partners in view for longer.",
      default:
        "Under pressure, you may differ in whose consequences get weight first. One looks earlier at ability to act, while the other stays longer with the people or groups who need to carry the step.",
    },
    resource_fairness: {
      clear:
        "With budget, workload, or responsibility, one of you may draw a firmer line earlier, while the other looks longer at what remains reasonable for the people affected.",
      default:
        "When resources get tight, you may not read fairness in exactly the same way. One prioritizes relief or clear boundaries earlier, while the other gives more weight to effectiveness and timely decisions.",
    },
    commercial_focus: {
      clear:
        "When results come under pressure, commercial firmness may enter at different moments. One moves earlier toward runway, targets, and clear prioritization, while the other checks the effects on trust, team, or reasonableness for longer.",
      default:
        "Under pressure, you may differ in how early numbers and results set the tone. One moves earlier toward commercial clarity, while the other keeps side effects open for longer.",
    },
    long_term_vs_short_term: {
      clear:
        "When a decision helps now but may carry a later cost, you may not prioritize in the same way. One secures what carries the next few weeks earlier, while the other protects the line that should still hold later.",
      default:
        "Under pressure, you probably do not shift to the same time horizon automatically. One wants to secure what works now earlier, while the other protects the direction that should still fit later.",
    },
  },
  differenceFollowUps: {
    clear:
      "If this stays implicit, you can quickly evaluate the same step by two different standards.",
    moderate:
      "Without clear framing, the same decision can start pulling in two directions.",
    subtle:
      "This is not a fundamental conflict, but under pressure it can shift what each of you treats as most important first.",
  },
  guardrailBodies: {
    guard_shared_blind_spot: {
      integrity_speed:
        "Because you prioritize this in similar ways, agree before sensitive decisions where speed is enough and where you pause once more.",
      stakeholder_balance:
        "Because you look at this in similar ways, agree which effects on team, customers, or partners you do not want to accept silently in sensitive decisions.",
      resource_fairness:
        "Because you prioritize this in similar ways, briefly name what still counts as fair and reasonable before budget, workload, or role decisions.",
      commercial_focus:
        "Because you prioritize this in similar ways, mark clearly under result pressure when commercial firmness applies and which boundary still remains.",
      long_term_vs_short_term:
        "Because you look at this in similar ways, name what should be gained short term and which long-term line should not tip before larger decisions.",
    },
    guard_priority_gap: {
      integrity_speed:
        "For decisions under pressure, agree who calls the go point and which boundary needs one more explicit check first.",
      stakeholder_balance:
        "Before decisions with side effects, agree which interests take priority when trade-offs appear and which should not be passed over silently.",
      resource_fairness:
        "Before workload, budget, or role decisions, agree how you weigh firmness, fairness, and reasonableness.",
      commercial_focus:
        "For pressure phases, agree when results and runway take priority and which side effects should not simply be carried along.",
      long_term_vs_short_term:
        "For larger decisions, agree which short-term benefit needs to count and which long-term line should not be given up.",
    },
  },
} as const satisfies ValuesContent;
