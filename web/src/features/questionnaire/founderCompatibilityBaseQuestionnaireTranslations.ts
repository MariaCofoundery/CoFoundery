import type { ItemId } from "@/features/scoring/founderCompatibilityRegistry";

export type FounderCompatibilityBaseQuestionnaireItemTranslation = {
  prompt: string;
  choices: Record<string, string>;
};

const LIKERT_CHOICES = {
  "0": "Strongly disagree",
  "25": "Somewhat disagree",
  "50": "Partly / partly",
  "75": "Somewhat agree",
  "100": "Strongly agree",
} satisfies Record<string, string>;

const FORCED_CHOICE_CHOICES = {
  "0": "A is much closer",
  "25": "A is somewhat closer",
  "50": "Both about equally",
  "75": "B is somewhat closer",
  "100": "B is much closer",
} satisfies Record<string, string>;

export const EN_FOUNDER_COMPATIBILITY_BASE_ITEM_TRANSLATIONS: Record<
  ItemId,
  FounderCompatibilityBaseQuestionnaireItemTranslation
> = {
  cl_core_1: {
    prompt:
      "When I evaluate new opportunities for the company, what matters most to me is whether they help build the company solidly for the long term.",
    choices: LIKERT_CHOICES,
  },
  cl_core_2: {
    prompt:
      "Which statement feels closer to you?\nA: I evaluate new opportunities mainly by whether they make the company more stable and clearer.\nB: I evaluate new opportunities mainly by whether they open new chances for growth.",
    choices: FORCED_CHOICE_CHOICES,
  },
  cl_core_3: {
    prompt:
      "A business model is well structured, but has limited growth potential. How would you tend to evaluate it?",
    choices: {
      "0": "For me, it matters more that the model is solid and coherent.",
      "33": "For me, it matters that both come together as much as possible: stability and growth.",
      "67": "For me, it matters more that the model enables more growth.",
      "100": "For me, growth clearly comes first, even if the model is not fully coherent yet.",
    },
  },
  cl_core_4: {
    prompt:
      "A new opportunity would give you access to a much larger market. At the same time, it would make your company more complex and less clear. What would you look at first to decide whether this step makes sense?",
    choices: {
      "0": "Whether the company would stay solid and coherent over the long term.",
      "33": "Whether the step fits well with the company you have been building so far.",
      "67": "Whether the step opens a clear growth opportunity, even if it adds complexity.",
      "100": "Whether the step significantly expands the company's potential, even if it becomes broader and less clear.",
    },
  },
  cl_support_1: {
    prompt:
      "An investor offers you capital. In return, you would need to orient more strongly toward a larger market, and your current model would become less focused. Which first tendency fits you best?",
    choices: {
      "0": "I would tend not to pursue it. It matters more to me that the company stays clear and resilient.",
      "33": "I would examine carefully whether growth and clean company-building can work together.",
      "67": "I would be open to it if the opportunity is large enough and we set clear guardrails.",
      "100": "I would tend to pursue it. If the opportunity is large, the company should orient around it.",
    },
  },
  cl_support_2: {
    prompt:
      "You have found a stable business model. Then another market appears with much stronger growth, but only with a clear change in direction. How would you tend to handle that?",
    choices: {
      "0": "I would tend to stay with the current direction as long as it works.",
      "33": "I would examine the new market carefully before changing direction.",
      "67": "I would openly examine whether the new market is the better long-term opportunity.",
      "100": "I would actively pursue the new direction if the potential is significantly larger.",
    },
  },
  dl_core_1: {
    prompt:
      "For important decisions, it matters to me that they are well grounded and easy to understand.",
    choices: LIKERT_CHOICES,
  },
  dl_core_2: {
    prompt:
      "Which statement feels closer to you?\nA: I prefer to decide only once the key points have been clarified.\nB: I decide once a clear direction emerges, even if not everything has been clarified yet.",
    choices: FORCED_CHOICE_CHOICES,
  },
  dl_core_3: {
    prompt:
      "The facts point toward a decision, but it still does not feel right to you. How do you handle that?",
    choices: {
      "0": "If the facts support it, the decision is basically viable for me.",
      "33": "I would check again specifically why the facts and my feeling do not line up.",
      "67": "For me, the decision only fits once it also feels right.",
      "100": "As long as it does not feel right, I do not make the decision.",
    },
  },
  dl_core_4: {
    prompt:
      "How do you handle decisions when there is time pressure and still some uncertainty?",
    choices: {
      "0": "I prefer to wait and clarify further.",
      "33": "I clarify as much as possible before deciding.",
      "67": "I decide once a viable direction is visible.",
      "100": "I decide deliberately quickly and adjust later.",
    },
  },
  dl_support_1: {
    prompt:
      "An important decision is coming up, but you have limited time to get familiar with the topic. What would you most likely do?",
    choices: {
      "0": "I would rather postpone the decision to gain more clarity.",
      "33": "I would bundle the available information and then weigh it up.",
      "67": "I would decide based on the most viable signals and sharpen open points later.",
      "100": "I would choose the direction that feels most coherent and keep checking as I go.",
    },
  },
  dl_support_2: {
    prompt:
      "After a short time, you realize that a decision probably will not hold. How do you respond?",
    choices: {
      "0": "I would first want to understand exactly what does not fit.",
      "33": "I would adjust the direction carefully and check again.",
      "67": "I would move toward the better alternative.",
      "100": "I would let go of the current direction and reorient.",
    },
  },
  ws_core_1: {
    prompt:
      "Which statement feels closer to your way of working?\nA: I prefer to work independently and take responsibility for my own area.\nB: I prefer to work in close alignment with my co-founder.",
    choices: FORCED_CHOICE_CHOICES,
  },
  ws_core_2: {
    prompt:
      "You are working on a new feature and making several important decisions along the way. When do you typically involve your co-founder?",
    choices: {
      "0": "I mostly decide independently within my area.",
      "33": "I involve them once I have the first clear results.",
      "67": "I share regular interim updates and align selectively.",
      "100": "I align important steps together early.",
    },
  },
  ws_core_3: {
    prompt:
      "You notice that both of you keep working on the same topics and responsibilities overlap. How do you handle that?",
    choices: {
      "0": "I would separate the responsibilities more clearly.",
      "33": "I would sharpen roles and align only on important points.",
      "67": "I would introduce regular short alignment check-ins.",
      "100": "I would coordinate the collaboration more closely.",
    },
  },
  ws_core_4: {
    prompt:
      "Collaboration works best for me when we exchange interim updates early rather than only at the end.",
    choices: LIKERT_CHOICES,
  },
  ws_support_1: {
    prompt: "You work at different times. How would you organize your collaboration?",
    choices: {
      "0": "A clear task split is enough for me.",
      "33": "I would synchronize only at a few fixed points.",
      "67": "I would build in short daily alignment windows.",
      "100": "I would align as many work phases as possible more closely.",
    },
  },
  ws_support_2: {
    prompt:
      "A co-founder works very independently and shares important interim updates only late. What would feel suitable for you?",
    choices: {
      "0": "For me, it is enough if results are shared at the end.",
      "33": "For me, it is enough if a few points show where things stand.",
      "67": "I would like regular interim updates.",
      "100": "It matters to me to be involved early in important developments.",
    },
  },
  cm_core_1: {
    prompt: "The startup currently takes a clear share of my time and energy.",
    choices: LIKERT_CHOICES,
  },
  cm_core_2: {
    prompt:
      "Which statement feels closer to you?\nA: I keep a fixed, bounded frame of time and energy for the startup.\nB: I tend to organize my time and energy so that the startup gets more room.",
    choices: FORCED_CHOICE_CHOICES,
  },
  cm_core_3: {
    prompt:
      "When other important things in your life need more attention, how does that change your priority for the startup?",
    choices: {
      "0": "I keep my boundaries clear even then.",
      "33": "I adjust my priority only slightly.",
      "67": "I give the startup more room in phases like that.",
      "100": "The startup clearly takes priority then.",
    },
  },
  cm_core_4: {
    prompt:
      "The startup is developing more slowly than expected. You are considering how much time and energy to invest over the next few months. Which stance feels closer to you?",
    choices: {
      "0": "I would keep my current time frame.",
      "33": "I would invest a little more time, but with clear boundaries.",
      "67": "I would temporarily prioritize the startup more strongly.",
      "100": "In this phase, I would orient a large part of my time around it.",
    },
  },
  cm_support_1: {
    prompt:
      "Additional projects or commitments come up alongside the startup. How do you handle that?",
    choices: {
      "0": "That works for me as long as everything has its fixed place.",
      "33": "That works for me as long as it is clear how I divide my time.",
      "67": "I would deliberately clarify when the startup gets more room.",
      "100": "It matters to me that the startup clearly takes priority in important phases.",
    },
  },
  cm_support_2: {
    prompt: "Building the startup takes significantly more time than planned. How do you handle that?",
    choices: {
      "0": "I stay within my existing time boundaries.",
      "33": "I increase my effort only in a limited way.",
      "67": "I temporarily reorder my priorities.",
      "100": "In this phase, I give the startup significantly more room.",
    },
  },
  ro_core_1: {
    prompt: "The financial runway only lasts a few more months. How do you handle the situation?",
    choices: {
      "0": "I would first try to limit the risk as much as possible.",
      "33": "I would only take steps where the uncertainty stays manageable.",
      "67": "I could accept more uncertainty if an opportunity emerges.",
      "100": "I would be willing to take on significantly more uncertainty to create a turnaround.",
    },
  },
  ro_core_2: {
    prompt: "How much personal security are you willing to risk for entrepreneurial opportunities?",
    choices: {
      "0": "I want to keep my personal risk as low as possible.",
      "33": "I am willing to take a bit more risk, but only with clear boundaries.",
      "67": "I am willing to carry noticeable personal risk.",
      "100": "I am also willing to take significantly higher risk if the opportunity is large.",
    },
  },
  ro_core_3: {
    prompt:
      "I can handle uncertainty well over a longer period, even when not everything is foreseeable.",
    choices: LIKERT_CHOICES,
  },
  ro_core_4: {
    prompt:
      "Which statement feels closer to you?\nA: I prefer to take steps where risks are clearly limited.\nB: I also take steps with higher risk when the opportunity is large.",
    choices: FORCED_CHOICE_CHOICES,
  },
  ro_support_1: {
    prompt: "A new product could launch even though uncertainties remain. How do you handle that?",
    choices: {
      "0": "I would first clarify as many uncertainties as possible.",
      "33": "I would only be on board if the risks are clearly manageable.",
      "67": "I could also launch with open uncertainties.",
      "100": "I would launch even with high uncertainty if the opportunity fits.",
    },
  },
  ro_support_2: {
    prompt:
      "An option offers large opportunities, but brings more uncertainty for several months. How do you handle that?",
    choices: {
      "0": "I would only pursue it if the risks are clearly limited.",
      "33": "I would only approach it with clear safeguards.",
      "67": "I could accept the additional uncertainty.",
      "100": "I would pursue it despite high uncertainty if the opportunity is large.",
    },
  },
  cs_core_1: {
    prompt:
      "When I notice that I think differently from a co-founder, I usually clarify my view for myself first before bringing it up.",
    choices: LIKERT_CHOICES,
  },
  cs_core_2: {
    prompt: "A co-founder makes a decision you would have seen differently. How do you respond?",
    choices: {
      "0": "I would first process it for myself and observe.",
      "33": "I would bring it up later once my view is clear.",
      "67": "I would bring it up relatively soon.",
      "100": "I would bring it up directly.",
    },
  },
  cs_core_3: {
    prompt:
      "Which statement feels closer to you?\nA: When I disagree, I tend to bring it up carefully.\nB: When I disagree, I bring it up directly.",
    choices: FORCED_CHOICE_CHOICES,
  },
  cs_core_4: {
    prompt: "When a difference remains for longer, how do you handle it?",
    choices: {
      "0": "I let it stand at first and keep sorting it out.",
      "33": "I bring it up later in a suitable moment.",
      "67": "I actively bring it up again.",
      "100": "I clarify it as directly as possible.",
    },
  },
  cs_support_1: {
    prompt: "A mistake in the company has consequences, and you see it differently. How do you bring it up?",
    choices: {
      "0": "I bring it up with a bit of distance.",
      "33": "I look for a suitable moment and bring it up carefully.",
      "67": "I bring up the difference relatively soon.",
      "100": "I bring it up directly.",
    },
  },
  cs_support_2: {
    prompt: "A discussion develops noticeable tension. How do you handle that?",
    choices: {
      "0": "I tend to slow things down and sort first.",
      "33": "I let it cool down briefly and come back to it later.",
      "67": "I bring up the difference anyway.",
      "100": "I continue directly into clarification, even with tension.",
    },
  },
};

export function getEnglishFounderCompatibilityBaseItemTranslation(itemId: ItemId) {
  return EN_FOUNDER_COMPATIBILITY_BASE_ITEM_TRANSLATIONS[itemId] ?? null;
}
