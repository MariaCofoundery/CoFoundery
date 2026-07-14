import { type FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  type SelfReportSignal,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type SelfReportEverydayBlock = {
  dimension: FounderDimensionKey;
  title: string;
  statement: string;
  situation: string;
};

type EverydayCopy = Omit<SelfReportEverydayBlock, "dimension">;
type EverydayCopyMap = Record<FounderDimensionKey, Record<SelfReportTendencyKey, EverydayCopy>>;
type EverydayFallbackMap = Record<FounderDimensionKey, EverydayCopy>;
type EverydayLocale = AppLocale | string | null | undefined;

const EVERYDAY_COPY_DE: EverydayCopyMap = {
  Unternehmenslogik: {
    left: {
      title: "Du prüfst Chancen gegen den Aufbau",
      statement:
        "Neue Möglichkeiten müssen für dich erst zeigen, dass sie das Unternehmen tragfähiger machen und nicht nur kurzfristig attraktiv sind.",
      situation:
        "Wenn ein neuer Markt, Kunde oder Kanal auftaucht, fragst du früh, was das mit Fokus, Positionierung und Aufbau macht.",
    },
    center: {
      title: "Du wägest Fokus und Chance gegeneinander ab",
      statement:
        "Du hast keine starre Lieblingsrichtung. Für dich hängt es von der Lage ab, ob Aufbau oder Chance zuerst zählt.",
      situation:
        "In einer neuen Option prüfst du meist beides zugleich: Was öffnet sie und was kostet sie an Klarheit oder Stabilität?",
    },
    right: {
      title: "Du willst Chancen nicht liegen lassen",
      statement:
        "Wenn etwas spürbar mehr Reichweite oder Wachstum öffnen kann, willst du es eher prüfen und bewegen als nur theoretisch einordnen.",
      situation:
        "Taucht eine größere Marktchance auf, denkst du schnell in nächsten Schritten statt nur in Bedenken.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Du entscheidest auf geklärter Basis",
      statement:
        "Wichtige Entscheidungen tragen für dich erst, wenn die entscheidenden Punkte und Einwände sichtbar sind.",
      situation:
        "Vor einem größeren Schritt willst du meist noch einmal sauber verstehen, worauf die Entscheidung steht.",
    },
    center: {
      title: "Du passt die Tiefe an die Frage an",
      statement:
        "Du behandelst nicht jede Entscheidung gleich. Manche Fragen brauchen für dich Klärung, andere nur eine tragfähige Richtung.",
      situation:
        "Im Alltag wechselst du zwischen gründlichem Prüfen und frühem Festlegen, je nachdem, wie groß die Folge ist.",
    },
    right: {
      title: "Du gehst früh in eine Richtung",
      statement:
        "Wenn eine Richtung für dich trägt, willst du entscheiden und nicht länger auf Vollständigkeit warten.",
      situation:
        "Du gehst eher mit einem tragfähigen nächsten Schritt als mit einem komplett ausgeleuchteten Entscheidungsbild.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Du brauchst Eigenraum, damit Arbeit trägt",
      statement:
        "Zusammenarbeit funktioniert für dich gut, wenn Zuständigkeiten klar sind und nicht jeder Zwischenschritt gemeinsam laufen muss.",
      situation:
        "Du meldest dich lieber an klaren Punkten zurück, statt laufend kleine Zwischenstände zu teilen.",
    },
    center: {
      title: "Du willst abgestimmt sein, aber nicht dauernd",
      statement:
        "Du suchst eine Arbeitsweise, in der Eigenraum möglich bleibt und wichtige Punkte trotzdem nicht zu spät sichtbar werden.",
      situation:
        "Dir reicht kein Dauer-Loop, aber auch kein Arbeiten, das erst am Ende wieder auftaucht.",
    },
    right: {
      title: "Du willst früh sehen, wo Dinge stehen",
      statement:
        "Du arbeitest ruhiger, wenn Fortschritt, offene Punkte und Richtungswechsel nicht erst spät sichtbar werden.",
      situation:
        "Wenn ein Thema läuft, willst du eher Zwischenstände sehen als nur das Endergebnis.",
    },
  },
  Commitment: {
    left: {
      title: "Du hältst deinen Rahmen bewusst",
      statement:
        "Du willst, dass das Startup wichtig ist, aber in einem Rahmen, den du im Alltag wirklich tragen kannst.",
      situation:
        "Wenn andere mehr Intensität erwarten, wirst du erst mitgehen, wenn klar ist, wie lange und wofür das gelten soll.",
    },
    center: {
      title: "Du kannst verdichten, aber nicht endlos",
      statement:
        "Du bist bereit, phasenweise mehr zu geben, willst aber nicht, dass Ausnahmezustand still zur Norm wird.",
      situation:
        "In intensiven Phasen ziehst du mit. Danach brauchst du aber wieder einen erkennbaren Normalmodus.",
    },
    right: {
      title: "Du liest Priorität an sichtbarem Einsatz",
      statement:
        "Für dich zeigt sich Ernsthaftigkeit nicht nur in Worten, sondern in Zeit, Energie und Verfügbarkeit.",
      situation:
        "Wenn ein Vorhaben wichtig ist, erwartest du eher, dass das im Alltag auch konkret sichtbar wird.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Du willst Risiko begrenzen, bevor du mitgehst",
      statement:
        "Du brauchst bei unsicheren Schritten erkennbare Leitplanken und eine überschaubare Downside.",
      situation:
        "Wenn eine Wette offen ist, fragst du früh nach Grenzen, Sicherungen und dem Punkt, an dem ihr wieder stoppt.",
    },
    center: {
      title: "Du gehst mit, wenn Unsicherheit einen guten Grund hat",
      statement:
        "Du bist weder reflexhaft vorsichtig noch dauerhaft auf Risiko. Für dich muss Unsicherheit begründbar sein.",
      situation:
        "Du trägst offene Lage eher dann mit, wenn klar ist, was genau die Chance ist und wo die Grenze liegt.",
    },
    right: {
      title: "Du hältst offene Lage eher aus",
      statement:
        "Hohe Unsicherheit schreckt dich nicht automatisch, wenn die Chance groß genug wirkt.",
      situation:
        "Du bist eher bereit, mit offenen Fragen zu starten, solange die Richtung für dich genug Potenzial hat.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Du sortierst erst, bevor du ansprichst",
      statement:
        "Du gehst Unterschiede lieber mit geklärter eigener Sicht an als im ersten Impuls.",
      situation: "Wenn dich etwas stört, beobachtest du oft noch kurz, bevor du es aufmachst.",
    },
    center: {
      title: "Du wählst den Moment für Klärung bewusst",
      statement:
        "Du sprichst nicht alles sofort an, aber du lässt es auch nicht beliebig laufen.",
      situation:
        "Im Alltag entscheidest du eher situativ, ob ein Unterschied sofort auf den Tisch muss oder erst in einem besseren Moment.",
    },
    right: {
      title: "Du klärst Unterschiede lieber früh",
      statement: "Du arbeitest mit Reibung lieber offen als im Hintergrund weiter.",
      situation:
        "Wenn etwas nicht passt, willst du den Unterschied eher direkt benennen als ihn länger mitzuschleppen.",
    },
  },
};

const EVERYDAY_FALLBACK_DE: EverydayFallbackMap = {
  Unternehmenslogik: {
    title: "Deine Linie ist hier noch nicht klar lesbar",
    statement:
      "Ob du eher den Aufbau schützt oder eine größere Chance früh ziehst, ist in diesem Profil gerade nicht sauber belastbar.",
    situation:
      "Im Alltag zeigt sich das oft erst dann klar, wenn eine neue Option gleichzeitig Fokus verspricht und Fokus kostet.",
  },
  Entscheidungslogik: {
    title: "Dein Entscheidungsmodus ist hier noch offen",
    statement:
      "Ob du eher über Klärung oder über eine tragfähige Richtung entscheidest, ist in diesem Profil gerade nicht klar genug belegt.",
    situation:
      "Sichtbar wird das meist erst dann deutlich, wenn eine größere Entscheidung unter Zeitdruck reif werden muss.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    title: "Dein Arbeitsrhythmus ist hier noch nicht klar genug",
    statement:
      "Wie viel Eigenraum oder Mitsicht du im Alltag wirklich brauchst, ist in diesem Profil gerade nicht sauber ablesbar.",
    situation:
      "Das zeigt sich meist erst dann klar, wenn Verantwortung läuft und gleichzeitig Sichtbarkeit erwartet wird.",
  },
  Commitment: {
    title: "Dein Einsatzrahmen bleibt hier noch offen",
    statement:
      "Wie stark du das Startup im Alltag priorisierst, ist in diesem Profil gerade nicht belastbar genug zu lesen.",
    situation:
      "Im Alltag wird das oft erst deutlich, wenn Intensität, Verfügbarkeit und Erwartung nicht mehr nur theoretisch sind.",
  },
  Risikoorientierung: {
    title: "Deine Risikoschwelle ist hier noch nicht klar genug",
    statement:
      "Ob du Unsicherheit eher früh begrenzen oder eher länger tragen würdest, ist in diesem Profil gerade nicht sauber belegt.",
    situation:
      "Sichtbar wird das meist dann, wenn eine Chance offen ist, aber Folgen und Sicherungen noch nicht ganz feststehen.",
  },
  Konfliktstil: {
    title: "Dein Klärungsstil bleibt hier noch offen",
    statement:
      "Ob du Unterschiede eher früh ansprichst oder erst sortierst, ist in diesem Profil gerade nicht eindeutig lesbar.",
    situation:
      "Im Alltag zeigt sich das meist erst dann klar, wenn ein Thema gleichzeitig heikel und nicht mehr gut aufschiebbar ist.",
  },
};

const DEFAULT_FALLBACK_DE: EverydayCopy = {
  title: "Dein Alltag ist hier noch nicht klar lesbar",
  statement:
    "Diese Dimension ist im aktuellen Profil noch nicht stabil genug ausgeprägt, um eine klare Alltagswirkung zu zeigen.",
  situation:
    "Im Alltag wird das meist erst unter echter Belastung oder in wiederkehrenden Situationen deutlicher sichtbar.",
};

const EVERYDAY_COPY_EN: EverydayCopyMap = {
  Unternehmenslogik: {
    left: {
      title: "You test opportunities against the foundation",
      statement:
        "New possibilities first need to show that they make the company more solid, not only attractive in the short term.",
      situation:
        "When a new market, customer or channel appears, you may quickly ask what it means for focus, positioning and the build.",
    },
    center: {
      title: "You weigh focus and opportunity",
      statement:
        "You do not default to one fixed direction. Depending on the situation, either the foundation or the opening may matter first.",
      situation:
        "With a new option, you often look at both sides at once: what it opens up and what it costs in clarity or stability.",
    },
    right: {
      title: "You do not want to leave opportunities sitting",
      statement:
        "When something could create meaningful reach or growth, you tend to test and move it rather than only discuss it in theory.",
      situation:
        "When a larger market opening appears, you may quickly think in next steps instead of starting with objections.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "You decide on clarified ground",
      statement:
        "Important decisions feel ready for you only once the key points and objections are visible.",
      situation:
        "Before a bigger step, you usually want to understand once more what the decision is actually resting on.",
    },
    center: {
      title: "You adjust the depth to the question",
      statement:
        "You do not treat every decision the same way. Some questions need clarification, others need a direction that is good enough to carry.",
      situation:
        "Day to day, you may move between careful checking and early commitment depending on how much the decision affects.",
    },
    right: {
      title: "You move into a direction early",
      statement:
        "Once a direction feels workable enough, you prefer to decide instead of waiting for complete certainty.",
      situation:
        "You tend to work with a viable next step rather than a fully mapped decision picture.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "You need room to make work hold",
      statement:
        "Collaboration works well for you when ownership is clear and not every interim step needs to run through the group.",
      situation:
        "You prefer to come back at clear checkpoints rather than sharing many small updates along the way.",
    },
    center: {
      title: "You want alignment, but not constantly",
      statement:
        "You look for a working mode where independent work remains possible and important points still become visible early enough.",
      situation:
        "You do not need a constant loop, but you also do not want work to reappear only at the end.",
    },
    right: {
      title: "You want to see where things stand early",
      statement:
        "You work more calmly when progress, open points and direction changes do not become visible only late.",
      situation:
        "When a topic is moving, you would rather see interim updates than only the final result.",
    },
  },
  Commitment: {
    left: {
      title: "You hold your frame deliberately",
      statement:
        "You want the startup to matter, but within a frame you can actually sustain in everyday life.",
      situation:
        "When others expect more intensity, you are more likely to join once it is clear how long it applies and what it is for.",
    },
    center: {
      title: "You can intensify, but not endlessly",
      statement:
        "You are willing to give more in phases, but you do not want an exceptional mode to silently become the norm.",
      situation:
        "In intense phases, you can lean in. Afterwards, you need a recognizable normal mode again.",
    },
    right: {
      title: "You read priority through visible commitment",
      statement:
        "For you, seriousness shows not only in words, but in time, energy and availability.",
      situation:
        "When something matters, you tend to expect that it also becomes concretely visible in everyday work.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "You want to contain risk before joining in",
      statement:
        "With uncertain steps, you need visible guardrails and a downside that feels bounded.",
      situation:
        "When a bet is open, you may ask early about limits, safeguards and the point where the team would stop.",
    },
    center: {
      title: "You join uncertainty when there is a good reason",
      statement:
        "You are neither automatically cautious nor always risk-seeking. For you, uncertainty needs a clear reason.",
      situation:
        "You are more likely to carry an open situation when the opportunity and the boundary are both clear.",
    },
    right: {
      title: "You can hold an open situation",
      statement:
        "High uncertainty does not automatically stop you when the opportunity feels meaningful enough.",
      situation:
        "You are more willing to start with open questions as long as the direction has enough potential for you.",
    },
  },
  Konfliktstil: {
    left: {
      title: "You sort first, then address it",
      statement:
        "You prefer to approach differences with a clarified view of your own rather than from the first impulse.",
      situation:
        "When something bothers you, you may observe it briefly before bringing it up.",
    },
    center: {
      title: "You choose the moment for clarification deliberately",
      statement:
        "You do not address everything immediately, but you also do not let it run indefinitely.",
      situation:
        "Day to day, you decide by situation whether a difference needs to be put on the table now or at a better moment.",
    },
    right: {
      title: "You prefer to clarify differences early",
      statement:
        "You would rather work with friction openly than let it keep running in the background.",
      situation:
        "When something does not fit, you tend to name the difference directly rather than carrying it along for longer.",
    },
  },
};

const EVERYDAY_FALLBACK_EN: EverydayFallbackMap = {
  Unternehmenslogik: {
    title: "Your line is not yet clearly readable here",
    statement:
      "The profile does not yet show clearly whether you tend to protect the foundation or pull a bigger opportunity forward early.",
    situation:
      "Day to day, this often becomes visible when a new option promises focus and also costs focus.",
  },
  Entscheidungslogik: {
    title: "Your decision mode is still open here",
    statement:
      "The profile does not yet show clearly enough whether you tend to decide through clarification or through a direction that can carry.",
    situation:
      "This usually becomes visible when a larger decision needs to become ready under time pressure.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    title: "Your working rhythm is not clear enough yet",
    statement:
      "How much independent room or shared visibility you need in everyday work is not yet clearly readable in this profile.",
    situation:
      "This often becomes clear once responsibility is moving and visibility is expected at the same time.",
  },
  Commitment: {
    title: "Your commitment frame remains open here",
    statement:
      "The profile does not yet show clearly enough how strongly you prioritize the startup in everyday work.",
    situation:
      "Day to day, this often becomes visible when intensity, availability and expectations are no longer only theoretical.",
  },
  Risikoorientierung: {
    title: "Your risk threshold is not clear enough here",
    statement:
      "The profile does not yet show clearly whether you would contain uncertainty early or carry it for longer.",
    situation:
      "This usually becomes visible when an opportunity is open but consequences and safeguards are not fully defined.",
  },
  Konfliktstil: {
    title: "Your clarification style remains open here",
    statement:
      "The profile does not yet show clearly whether you tend to address differences early or sort them first.",
    situation:
      "Day to day, this often becomes clear when a topic is sensitive and can no longer be postponed easily.",
  },
};

const DEFAULT_FALLBACK_EN: EverydayCopy = {
  title: "Your everyday pattern is not clearly readable here yet",
  statement:
    "This dimension is not stable enough in the current profile to show a clear day-to-day effect.",
  situation:
    "It usually becomes more visible under real pressure or in recurring situations.",
};

function resolveEverydayCopyMap(locale: EverydayLocale) {
  return normalizeLocale(locale) === "en" ? EVERYDAY_COPY_EN : EVERYDAY_COPY_DE;
}

function resolveEverydayFallbackMap(locale: EverydayLocale) {
  return normalizeLocale(locale) === "en" ? EVERYDAY_FALLBACK_EN : EVERYDAY_FALLBACK_DE;
}

function resolveDefaultFallback(locale: EverydayLocale) {
  return normalizeLocale(locale) === "en" ? DEFAULT_FALLBACK_EN : DEFAULT_FALLBACK_DE;
}

export function getSelfReportEverydayCopy(
  signal: SelfReportSignal,
  locale?: EverydayLocale
): SelfReportEverydayBlock {
  return {
    dimension: signal.dimension,
    ...resolveEverydayCopyMap(locale)[signal.dimension][signal.tendencyKey],
  };
}

export function getSelfReportEverydayFallbackBlock(
  dimension: FounderDimensionKey,
  locale?: EverydayLocale
): SelfReportEverydayBlock {
  return {
    dimension,
    ...(resolveEverydayFallbackMap(locale)[dimension] ?? resolveDefaultFallback(locale)),
  };
}
