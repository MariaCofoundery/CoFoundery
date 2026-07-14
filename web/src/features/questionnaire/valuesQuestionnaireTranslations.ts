import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from "@/i18n/config";
import type { QuestionnaireChoice } from "@/features/questionnaire/QuestionnaireClient";
import type { QuestionnaireQuestion } from "@/features/questionnaire/questionnaireShared";

export type ValuesQuestionTranslation = {
  prompt: string;
  choices: Record<string, string>;
};

export type LocalizedValuesQuestionnaire = {
  questions: QuestionnaireQuestion[];
  choices: QuestionnaireChoice[];
};

export const EN_VALUES_QUESTION_TRANSLATIONS: Record<string, ValuesQuestionTranslation> = {
  wv2_1: {
    prompt:
      "Your runway is four months. A new distribution partner could bring you a lot of short-term revenue, but uses methods that would noticeably shape your brand. How do you handle that?",
    choices: {
      "1":
        "You enter the partnership if it gives you real breathing room and you can handle critical complaints cleanly afterward.",
      "2":
        "You use the partnership deliberately as a transition phase and tie it to clear revenue or runway goals.",
      "3":
        "You only test the partnership in a clearly limited frame with fixed rules for messaging, target groups and duration.",
      "4":
        "You do not enter the partnership if you do not want to carry the resulting external perception over the long term.",
    },
  },
  wv2_2: {
    prompt:
      "You can only secure your runway if several existing customers pay annual contracts in advance. At the same time, you know that your product is not yet stable in two critical areas. How do you proceed?",
    choices: {
      "1": "You collect the advance payments broadly if they stabilize your company.",
      "2":
        "You collect advance payments, but only from customers who can realistically use the value in the short term.",
      "3": "You postpone this as long as the critical points are not cleanly solved.",
      "4":
        "You proceed only with the risk situation made explicit, clear protection mechanisms and short exit windows.",
    },
  },
  wv2_3: {
    prompt:
      "A planned launch will probably be delayed. It is still unclear whether this means only a few days or significantly longer. How do you manage communication with affected customers?",
    choices: {
      "1":
        "You communicate broadly only once it is clear that the date will really slip, to avoid unnecessary uncertainty in the market.",
      "2":
        "You keep communication narrow at first and inform only customers whose dependency on the date is especially high.",
      "3":
        "You address the risk once you can name the most likely scale and a viable way to handle it.",
      "4":
        "You flag early that the date is uncertain so customers do not build plans on an overly optimistic assumption.",
    },
  },
  wv2_4: {
    prompt:
      "A financing round is dragging on and you may need to impose a hiring freeze in a few weeks. How much of that do you make visible to the team already?",
    choices: {
      "1": "You address it only once decisions have been made.",
      "2":
        "You keep the information narrow at first and open it up only when measures really come closer.",
      "3": "You make the uncertainty visible early, even if it creates unease.",
      "4":
        "You name the situation once you can clearly describe the most likely consequences and options.",
    },
  },
  wv2_5: {
    prompt:
      "A person from the early team has been performing below the needed level for months. At the same time, important knowledge sits with them and the rest of the team is watching closely how you decide. What do you prioritize?",
    choices: {
      "1": "You refill the role immediately and organize the handover in parallel.",
      "2": "You part ways if a short clarification does not show a clear turnaround.",
      "3": "You give significantly more time and protected space, even if it costs speed.",
      "4": "You set a clear development frame with close support and fixed deadlines.",
    },
  },
  wv2_6: {
    prompt:
      "A product line ties up too many resources and slows down your core business. Stopping it would relieve your company, but would have noticeable disadvantages for some existing customers. How do you decide?",
    choices: {
      "1": "You keep the product line running for now so existing customers are not put under pressure.",
      "2":
        "You phase the product line out in an orderly way and build a clean transition for affected customers.",
      "3": "You stop the product line quickly and clearly limit the transition phase.",
      "4": "You close it immediately if that makes your core business noticeably stronger.",
    },
  },
  wv2_7: {
    prompt:
      "A large growth partner can bring you reach quickly, but expects measures that would clearly shift your existing line toward customers. How do you handle that?",
    choices: {
      "1": "You use the partner decisively if it clearly accelerates your growth.",
      "2":
        "You enter the partnership if you can limit the biggest risks in communication and operations.",
      "3": "You only test the collaboration in a clearly limited frame with fixed red lines.",
      "4": "You pass on the partner if the new line no longer fits what you want to stand for.",
    },
  },
  wv2_8: {
    prompt:
      "An aggressive sales lever could move you significantly forward over the next three months. At the same time, support, product and team are already under heavy load. What do you prioritize?",
    choices: {
      "1": "You leave the lever alone until you have stabilized the biggest operational bottleneck first.",
      "2": "You open the lever only for a clearly defined segment you can carry operationally.",
      "3":
        "You pull the lever now and consciously accept that internal priorities must temporarily be shifted hard.",
      "4":
        "You use the lever fully and finance the overload through temporary bridge solutions if needed, so you do not miss the opportunity.",
    },
  },
  wv2_9: {
    prompt:
      "You need to reduce costs significantly within eight weeks. That can happen either through noticeable cuts for many or through hard measures affecting a few. How do you prioritize?",
    choices: {
      "1": "You cut hardest where the financial leverage is greatest.",
      "2": "You choose the measure with the fastest effect, even if it hits a few people harder.",
      "3":
        "You prefer to spread the burden more broadly so individual people do not carry almost the whole price.",
      "4":
        "You first look for the solution that is economically viable and best cushions the consequences for those affected.",
    },
  },
  wv2_10: {
    prompt:
      "Margins are breaking down and you need clear financial impact within one quarter. Which line do you pursue first?",
    choices: {
      "1":
        "You only take measures that create as little noticeable harshness as possible for customers and team.",
      "2":
        "You combine pricing, cost and focus measures so impact emerges without overburdening one side.",
      "3": "You first implement the measures with the fastest financial effect.",
      "4":
        "You pull the hardest but most effective measures first if they clearly turn the situation.",
    },
  },
  wv2_11: {
    prompt:
      "A new AI feature is strongly requested by customers and could visibly move you forward. At the same time, data protection and misuse questions are not yet cleanly clarified. How do you proceed?",
    choices: {
      "1": "You move into the market quickly and respond to problematic use where it actually becomes visible.",
      "2":
        "You launch first for existing, well-understood customer groups and build out the protection logic in parallel.",
      "3":
        "You start only as a tightly limited pilot with clear exclusions, monitoring and manual intervention points.",
      "4":
        "You postpone the launch until the central protection questions are clarified and internally responsible.",
    },
  },
  wv2_12: {
    prompt:
      "An enterprise customer wants to sign quickly if you agree to several special requirements. The deal would be strategically important, but would stretch you heavily operationally. How do you decide?",
    choices: {
      "1": "You do not accept the deal as long as delivery is not cleanly secured operationally.",
      "2": "You negotiate the deal only at a scope you can deliver with high confidence.",
      "3": "You accept the deal and internally prioritize everything around delivering for this customer.",
      "4":
        "You commit if the deal is strategically large enough and solve the bottlenecks afterward.",
    },
  },
};

export function getValuesQuestionTranslation(
  questionId: string | null | undefined,
  locale: AppLocale | string | null | undefined
) {
  if (normalizeLocale(locale) !== "en" || !questionId) {
    return null;
  }

  return EN_VALUES_QUESTION_TRANSLATIONS[questionId] ?? null;
}

export function localizeValuesQuestionsAndChoices({
  questions,
  choices,
  locale,
}: {
  questions: QuestionnaireQuestion[];
  choices: QuestionnaireChoice[];
  locale: AppLocale | string | null | undefined;
}): LocalizedValuesQuestionnaire {
  if (normalizeLocale(locale) === DEFAULT_LOCALE) {
    return { questions, choices };
  }

  const localizedQuestions = questions.map((question) => {
    const translation = getValuesQuestionTranslation(question.id, locale);
    if (!translation) return question;

    return {
      ...question,
      prompt: translation.prompt,
    };
  });

  const localizedChoices = choices.map((choice) => {
    const translation = getValuesQuestionTranslation(choice.question_id, locale);
    const label = translation?.choices[choice.value];
    if (!label) return choice;

    return {
      ...choice,
      label,
    };
  });

  return {
    questions: localizedQuestions,
    choices: localizedChoices,
  };
}
