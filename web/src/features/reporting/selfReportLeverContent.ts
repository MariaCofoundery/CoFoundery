import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  type SelfReportSignal,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type SelfReportLeverBlock = {
  title: string;
  text: string;
};

type LeverSide = "left" | "right";
type LeverCopyMap = Record<FounderDimensionKey, Record<LeverSide, SelfReportLeverBlock>>;
type LeverLocale = AppLocale | string | null | undefined;

const LEVER_COPY_DE: LeverCopyMap = {
  Unternehmenslogik: {
    left: {
      title: "Sag früher, woran du eine Chance misst",
      text:
        "Mach frueh konkret, was fuer dich tragfaehig genug ist. Dann wirkt dein Nein weniger pauschal und deine Logik wird fuer andere besser lesbar.",
    },
    right: {
      title: "Sag früher, warum du eine Chance nicht liegen lassen willst",
      text:
        "Benenne klar, welchen Hebel oder welches Potenzial du siehst. Dann wirkt dein Vorwaertsdrang weniger wie reiner Impuls und mehr wie eine begruendete Prioritaet.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Sag, was dir noch fehlt",
      text:
        "Formuliere die zwei oder drei Punkte, die fuer dich vor einer Entscheidung noch geklaert sein muessen. So bleibt Pruefung konkret und wird nicht diffus oder endlos.",
    },
    right: {
      title: "Sag, was schon entschieden ist und was noch offen bleiben darf",
      text:
        "Wenn du frueh festlegen willst, markiere klar den tragfaehigen Kern der Entscheidung. Das nimmt anderen eher das Gefuehl, ueberrollt zu werden.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Definiere deine Rückkopplungspunkte",
      text:
        "Sag nicht nur, dass du autonom arbeiten willst. Sag auch, wann du bewusst einbindest. Dann wirkt Eigenraum weniger wie Funkstille.",
    },
    right: {
      title: "Sag, welche Sichtbarkeit du brauchst",
      text:
        "Mach klar, welche Zwischenstaende du frueh sehen willst und welche nicht. Dann fuehlt sich dein Abstimmungsbedarf weniger diffus an.",
    },
  },
  Commitment: {
    left: {
      title: "Sprich deinen Rahmen aus, bevor andere ihn erraten",
      text:
        "Sag frueh, was du realistisch tragen kannst. So wird aus deinem Rahmen eher eine klare Abmachung als ein stiller Unterschied.",
    },
    right: {
      title: "Mach Erwartungen an Einsatz explizit",
      text:
        "Wenn dir hoher Fokus wichtig ist, sag konkret, woran man ihn im Alltag sehen soll. Dann bleibt er weniger als stille Messlatte im Raum.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Nenne deine Grenze vor der Entscheidung",
      text:
        "Sag frueh, welches Risiko fuer dich noch okay ist und ab wann du absichern willst. Das macht deine Vorsicht eher berechenbar als bremsend.",
    },
    right: {
      title: "Verbinde Mut mit klaren Stopps",
      text:
        "Wenn du eine offene Chance spielen willst, nenne auch die Schwelle, an der ihr wieder aussteigt. So wird Risiko fuehrbar statt diffus.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Sag, wann du ein Thema ansprichst",
      text:
        "Wenn du erst sortieren willst, kuendige das an. Dann wirkt dein Abwarten weniger wie Ausweichen und mehr wie ein bewusster Schritt.",
    },
    right: {
      title: "Rahme direkte Ansprache kurz ein",
      text:
        "Ein kurzer Satz wie 'ich will das frueh klaeren, nicht groesser machen' hilft oft schon. So wird Direktheit fuer andere besser lesbar.",
    },
  },
};

const DEFAULT_LEVER_DE: SelfReportLeverBlock = {
  title: "Mach deine Logik früh sichtbar",
  text:
    "Je früher andere verstehen, wie du Entscheidungen und Zusammenarbeit liest, desto seltener kippt es unnötig im Alltag.",
};

const LEVER_COPY_EN: LeverCopyMap = {
  Unternehmenslogik: {
    left: {
      title: "Name how you evaluate an opportunity earlier",
      text:
        "Make concrete what would be solid enough for you. This helps others read your reasoning instead of hearing only a broad no.",
    },
    right: {
      title: "Name why you do not want to leave an opportunity sitting",
      text:
        "Say clearly which leverage or potential you see. This makes your forward pull easier to read as a considered priority rather than a pure impulse.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Say what is still missing for you",
      text:
        "Name the two or three points that need clarification before a decision can carry for you. This keeps the check concrete rather than vague or endless.",
    },
    right: {
      title: "Say what is already decided and what can stay open",
      text:
        "If you want to commit early, mark the stable core of the decision. That helps others feel less pushed over by the next step.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Define your feedback points",
      text:
        "Do not only say that you want to work autonomously. Also say when you will deliberately involve others. This makes independent room feel less like silence.",
    },
    right: {
      title: "Say what visibility you need",
      text:
        "Make clear which interim updates you want to see early and which ones you do not need. This makes your need for alignment easier to work with.",
    },
  },
  Commitment: {
    left: {
      title: "State your frame before others have to guess it",
      text:
        "Say early what you can realistically carry. This turns your frame into a clear agreement rather than an unspoken difference.",
    },
    right: {
      title: "Make commitment expectations explicit",
      text:
        "If high focus matters to you, say what it should look like in everyday work. This keeps it from becoming a silent measuring stick.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Name your boundary before the decision",
      text:
        "Say early which risk still feels workable for you and where you would want safeguards. This makes your caution easier to understand instead of simply slowing things down.",
    },
    right: {
      title: "Pair courage with clear stop points",
      text:
        "If you want to play an open opportunity, also name the threshold where you would step back. This makes risk discussable rather than diffuse.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Say when you will address a topic",
      text:
        "If you need to sort something first, say so. This makes waiting feel less like avoidance and more like a deliberate step.",
    },
    right: {
      title: "Frame direct clarification briefly",
      text:
        "A short sentence such as 'I want to clarify this early, not make it bigger' can already help. It makes directness easier for others to read.",
    },
  },
};

const DEFAULT_LEVER_EN: SelfReportLeverBlock = {
  title: "Make your logic visible early",
  text:
    "The earlier others understand how you read decisions and collaboration, the less often everyday work tips unnecessarily.",
};

function resolveLeverMap(locale: LeverLocale) {
  return normalizeLocale(locale) === "en" ? LEVER_COPY_EN : LEVER_COPY_DE;
}

function resolveDefaultLeverCopy(locale: LeverLocale) {
  return normalizeLocale(locale) === "en" ? DEFAULT_LEVER_EN : DEFAULT_LEVER_DE;
}

function resolveLeverSide(tendencyKey: SelfReportTendencyKey): LeverSide {
  return tendencyKey === "left" ? "left" : "right";
}

export function getSelfReportLeverCopy(
  signal: SelfReportSignal,
  locale?: LeverLocale
): SelfReportLeverBlock {
  return (
    resolveLeverMap(locale)[signal.dimension]?.[resolveLeverSide(signal.tendencyKey)] ??
    resolveDefaultLeverCopy(locale)
  );
}
