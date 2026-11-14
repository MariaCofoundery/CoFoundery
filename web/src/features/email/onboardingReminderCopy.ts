import type { AppLocale } from "@/i18n/config";

export type OnboardingReminderStep = "workstyle" | "setup";
export type OnboardingReminderSource = "later" | "midway";

const AREA_ORDER = ["align", "find", "connect", "advise"] as const;

/** Ein Satz je Bereich - die Mail nennt nur die, die die Person gewaehlt hat. */
const AREA_VALUE: Record<"de" | "en", Record<(typeof AREA_ORDER)[number], string>> = {
  de: {
    align: "Du erkennst, wie du arbeitest – an echten Situationen, ohne Test und ohne Schubladen.",
    find: "Du findest Mitgründer:innen, die zu dir passen, und bestimmst selbst, wann du sichtbar wirst.",
    connect: "Du triffst das Netzwerk: Angebote, Gesuche und Menschen, die helfen.",
    advise: "Du begleitest Gründende, mit ihrer Freigabe, und siehst, wo sie auseinanderliegen.",
  },
  en: {
    align: "See how you work – through real situations, without a test and without boxes.",
    find: "Find co-founders who fit, and decide yourself when you become visible.",
    connect: "Meet the network: offers, requests and people who help.",
    advise: "Support founders, with their permission, and see where they differ.",
  },
};

/** Die gewaehlten Bereiche in fester Reihenfolge; ohne Angabe die drei, die fast alle brauchen. */
function chosenAreas(areas: readonly string[] | undefined) {
  const picked = AREA_ORDER.filter((area) => areas?.includes(area));
  return picked.length > 0 ? picked : (["align", "find", "connect"] as const);
}

export type OnboardingReminderCopy = {
  htmlLang: string;
  subject: string;
  preheader: string;
  headline: string;
  intro: string;
  valueTitle: string;
  values: string[];
  cta: string;
  ctaHint: string;
  signoff: string;
  why: string;
  unsubscribe: string;
  privacy: string;
};

/**
 * Die zwei Erinnerungs-Mails nach dem Einstieg: freundlich, locker, und mit etwas Sinn drin.
 *
 * Runde 1 erinnert und benennt drei Situationen, die Gruendende kennen, und was Made2Found daran leichter macht.
 * Runde 2 ist die letzte, ruhiger, und sagt das auch. Beide:
 *  - ohne Punkte, Typen oder Versprechen ueber Erfolg (nur, was das Produkt tatsaechlich tut),
 *  - ohne Inhalt aus dem Konto (nur der Vorname, nie ein Team oder eine Antwort),
 *  - mit einem Knopf zum naechsten sinnvollen Schritt und dem Hinweis, warum die Mail kommt.
 */
export function getOnboardingReminderCopy(
  locale: AppLocale,
  input: { round: 1 | 2; nextStep: OnboardingReminderStep; name: string | null; areas?: readonly string[]; source?: OnboardingReminderSource },
): OnboardingReminderCopy {
  const name = input.name?.trim() || null;
  const first = input.round === 1;
  const step = input.nextStep === "workstyle";
  const later = (input.source ?? "midway") === "later";
  const valueFor = (locale: "de" | "en", privacy: string) => [...chosenAreas(input.areas).map((area) => AREA_VALUE[locale][area]), privacy];
  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: first ? "Your profile is waiting – a few minutes is plenty" : "One last nudge: want to take another look?",
      preheader: first ? "A small nudge from us, no pressure at all." : "After this, we'll leave you in peace.",
      headline: first ? (later ? (name ? `Hey ${name}, no time yesterday – maybe today?` : "Hey, no time yesterday – maybe today?") : name ? `Hey ${name}, great that you got started!` : "Hey, great that you got started!") : name ? `Hey ${name}, one last time from us` : "Hey, one last time from us",
      intro: first
        ? later
          ? "Founding is a roller coaster – with the right conversations it's a lot more fun. Your account is here and everything is saved. A few minutes is enough, and you can stop whenever you like."
          : "Founding is a roller coaster – with the right conversations it's a lot more fun. You took the first step yesterday and everything is saved. Want to pick it up today? A few minutes is enough, and you can stop whenever you like."
        : "Your place at Made2Found is still here, and so is everything you've already said. This is the last reminder – after that, we'll leave you in peace.",
      valueTitle: first ? "What waits for you at Made2Found" : "Why it's worth it",
      values: first
        ? valueFor("en", "Everything stays private until you decide to share something.")
        : [
            "Talking about expectations early usually makes things easier later.",
            "After just three answers you can already see what you've said so far.",
            "Everything stays private until you share something yourself.",
          ],
      cta: step ? "Continue the workstyle questions" : "Continue setting up your profile",
      ctaHint: step ? "After three answers you'll already see what you've said." : "One card at a time, each saved right away.",
      signoff: "Talk soon,\nMaria | Made2Found",
      why: "You're getting this email because you started signing up for Made2Found and haven't finished yet. There are at most two reminders.",
      unsubscribe: "No more reminders",
      privacy: "Privacy",
    };
  }
  return {
    htmlLang: "de",
    subject: first ? "Dein Profil wartet auf dich – ein paar Minuten reichen" : "Letzter Schubs: Magst du noch einen Blick darauf werfen?",
    preheader: first ? "Ein kleiner Schubs von uns, ganz ohne Druck." : "Danach lassen wir dich in Ruhe.",
    headline: first ? (later ? (name ? `Hey ${name}, gestern hattest du keine Zeit – heute vielleicht?` : "Hey, gestern hattest du keine Zeit – heute vielleicht?") : name ? `Hey ${name}, schön, dass du angefangen hast!` : "Hey, schön, dass du angefangen hast!") : name ? `Hey ${name}, ein letztes Mal von uns` : "Hey, ein letztes Mal von uns",
    intro: first
      ? later
        ? "Gründen ist eine Achterbahnfahrt – mit den richtigen Gesprächen macht sie viel mehr Spaß. Dein Account ist da, und alles ist gespeichert. Ein paar Minuten reichen, und du kannst jederzeit aufhören."
        : "Gründen ist eine Achterbahnfahrt – mit den richtigen Gesprächen macht sie viel mehr Spaß. Du hast gestern den ersten Schritt gemacht, und alles ist gespeichert. Magst du heute weitermachen? Ein paar Minuten reichen, und du kannst jederzeit aufhören."
      : "Dein Platz bei Made2Found ist noch da, und alles, was du schon gesagt hast, auch. Das ist die letzte Erinnerung, danach lassen wir dich in Ruhe.",
    valueTitle: first ? "Das erwartet dich bei Made2Found" : "Warum es sich lohnt",
    values: first
      ? valueFor("de", "Alles bleibt privat, bis du selbst entscheidest, etwas zu teilen.")
      : [
          "Wer früh über Erwartungen spricht, hat es später meist leichter.",
          "Schon nach drei Antworten siehst du, was du bisher gesagt hast.",
          "Alles bleibt privat, bis du selbst etwas freigibst.",
        ],
    cta: step ? "Fragen zur Arbeitsweise weitermachen" : "Profil weiter einrichten",
    ctaHint: step ? "Nach drei Antworten siehst du schon, was du gesagt hast." : "Eine Karte nach der anderen, jede wird sofort gespeichert.",
    signoff: "Bis gleich,\nMaria | Made2Found",
    why: "Du bekommst diese Mail, weil du dich bei Made2Found angemeldet hast und noch nicht fertig bist. Es kommen höchstens zwei Erinnerungen.",
    unsubscribe: "Keine Erinnerungen mehr",
    privacy: "Datenschutz",
  };
}
