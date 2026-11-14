import type { AppLocale } from "@/i18n/config";

export type OnboardingReminderStep = "workstyle" | "setup";

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
  input: { round: 1 | 2; nextStep: OnboardingReminderStep; name: string | null },
): OnboardingReminderCopy {
  const name = input.name?.trim() || null;
  const first = input.round === 1;
  const step = input.nextStep === "workstyle";
  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: first ? "Your profile is waiting – a few minutes is plenty" : "One last nudge: want to take another look?",
      preheader: first ? "A small nudge from us, no pressure at all." : "After this, we'll leave you in peace.",
      headline: first ? (name ? `Hey ${name}, great that you got started!` : "Hey, great that you got started!") : name ? `Hey ${name}, one last time from us` : "Hey, one last time from us",
      intro: first
        ? "Founding is a roller coaster – with the right conversations it's a lot more fun. You took the first step yesterday and everything is saved. Want to pick it up today? A few minutes is enough, and you can stop whenever you like."
        : "Your place at Made2Found is still here, and so is everything you've already said. This is the last reminder – after that, we'll leave you in peace.",
      valueTitle: first ? "What waits for you at Made2Found" : "Why it's worth it",
      values: first
        ? [
            "See how you work – through real situations from founder life, without a test and without boxes.",
            "Find people who fit: co-founders, a network, and support when you want it.",
            "Talk early about what usually stays unsaid, and write down together what you agree on.",
            "Everything stays private until you decide to share something.",
          ]
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
    headline: first ? (name ? `Hey ${name}, schön, dass du angefangen hast!` : "Hey, schön, dass du angefangen hast!") : name ? `Hey ${name}, ein letztes Mal von uns` : "Hey, ein letztes Mal von uns",
    intro: first
      ? "Gründen ist eine Achterbahnfahrt – mit den richtigen Gesprächen macht sie viel mehr Spaß. Du hast gestern den ersten Schritt gemacht, und alles ist gespeichert. Magst du heute weitermachen? Ein paar Minuten reichen, und du kannst jederzeit aufhören."
      : "Dein Platz bei Made2Found ist noch da, und alles, was du schon gesagt hast, auch. Das ist die letzte Erinnerung, danach lassen wir dich in Ruhe.",
    valueTitle: first ? "Das erwartet dich bei Made2Found" : "Warum es sich lohnt",
    values: first
      ? [
          "Du erkennst, wie du arbeitest – an echten Situationen aus dem Gründeralltag, ohne Test und ohne Schubladen.",
          "Du findest Menschen, die passen: Mitgründer:innen, Netzwerk und Begleitung, wenn du sie willst.",
          "Ihr sprecht früh über das, was sonst ungesagt bleibt, und haltet gemeinsam fest, was ihr euch vornehmt.",
          "Alles bleibt privat, bis du selbst entscheidest, etwas zu teilen.",
        ]
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
