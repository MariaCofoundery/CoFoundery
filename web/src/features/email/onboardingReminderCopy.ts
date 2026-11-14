import type { AppLocale } from "@/i18n/config";

export type OnboardingReminderStep = "workstyle" | "setup";

export type OnboardingReminderCopy = {
  htmlLang: string;
  subject: string;
  preheader: string;
  headline: string;
  intro: string;
  painTitle: string;
  pains: string[];
  solutionTitle: string;
  solution: string;
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
  if (locale === "en") {
    const first = input.round === 1;
    return {
      htmlLang: "en",
      subject: first ? "Your profile is waiting – a few minutes is plenty" : "One last nudge: want to take another look?",
      preheader: first ? "A small nudge from us, no pressure at all." : "After this, we'll leave you in peace.",
      headline: first ? (name ? `Hey ${name}, great that you got started!` : "Hey, great that you got started!") : name ? `Hey ${name}, one last time from us` : "Hey, one last time from us",
      intro: first
        ? "You took the first step yesterday, and everything is saved. Want to pick it up today? It only takes a few minutes, and you can stop whenever you like."
        : "Your place at Made2Found is still here, and so is everything you've already said. This is the last reminder – after that, we'll leave you in peace.",
      painTitle: first ? "Sound familiar?" : "Why it's worth it",
      pains: first
        ? [
            "You found a company together, but nobody ever said out loud who actually decides what.",
            "Only months later you notice you work very differently – and by then it's heated.",
            "Finding the right co-founder often feels like a blind date.",
          ]
        : [
            "Talking about expectations early usually makes things easier later.",
            "After just three answers you can already see what you've said so far.",
            "Everything stays private until you share something yourself.",
          ],
      solutionTitle: first ? "What Made2Found takes off your plate" : "A few minutes is enough to start",
      solution: first
        ? "You see early how you work and can talk about it with others – without scores and without boxes. What you agree on, you write down together."
        : "Do the rest whenever it suits you. Nothing is lost.",
      cta: input.nextStep === "workstyle" ? "Continue the workstyle questions" : "Continue setting up your profile",
      ctaHint: input.nextStep === "workstyle" ? "After three answers you'll already see what you've said." : "One card at a time, each saved right away.",
      signoff: "Talk soon,\nMaria",
      why: "You're getting this email because you turned on reminders when you started. There are at most two.",
      unsubscribe: "No more reminders",
      privacy: "Privacy",
    };
  }
  const first = input.round === 1;
  return {
    htmlLang: "de",
    subject: first ? "Dein Profil wartet auf dich – ein paar Minuten reichen" : "Letzter Schubs: Magst du noch einen Blick darauf werfen?",
    preheader: first ? "Ein kleiner Schubs von uns, ganz ohne Druck." : "Danach lassen wir dich in Ruhe.",
    headline: first ? (name ? `Hey ${name}, schön, dass du angefangen hast!` : "Hey, schön, dass du angefangen hast!") : name ? `Hey ${name}, ein letztes Mal von uns` : "Hey, ein letztes Mal von uns",
    intro: first
      ? "Du hast gestern den ersten Schritt gemacht, und alles ist gespeichert. Magst du heute weitermachen? Es dauert nur ein paar Minuten, und du kannst jederzeit aufhören."
      : "Dein Platz bei Made2Found ist noch da, und alles, was du schon gesagt hast, auch. Das ist die letzte Erinnerung, danach lassen wir dich in Ruhe.",
    painTitle: first ? "Kennst du das?" : "Warum es sich lohnt",
    pains: first
      ? [
          "Ihr gründet zusammen, aber nie hat jemand ausgesprochen, wer eigentlich was entscheidet.",
          "Erst nach Monaten merkt man, dass man ganz unterschiedlich arbeitet – und dann ist es schon hitzig.",
          "Die richtige Mitgründerin oder den richtigen Mitgründer zu finden, fühlt sich oft an wie ein Blind Date.",
        ]
      : [
          "Wer früh über Erwartungen spricht, hat es später meist leichter.",
          "Schon nach drei Antworten siehst du, was du bisher gesagt hast.",
          "Alles bleibt privat, bis du selbst etwas freigibst.",
        ],
    solutionTitle: first ? "Das nimmt dir Made2Found ab" : "Ein paar Minuten reichen für den Anfang",
    solution: first
      ? "Du erkennst früh, wie du arbeitest, und kannst es mit anderen besprechen – ohne Punkte und ohne Schubladen. Was ihr euch vornehmt, haltet ihr gemeinsam fest."
      : "Den Rest machst du, wann es passt. Nichts geht verloren.",
    cta: input.nextStep === "workstyle" ? "Fragen zur Arbeitsweise weitermachen" : "Profil weiter einrichten",
    ctaHint: input.nextStep === "workstyle" ? "Nach drei Antworten siehst du schon, was du gesagt hast." : "Eine Karte nach der anderen, jede wird sofort gespeichert.",
    signoff: "Bis gleich,\nMaria",
    why: "Du bekommst diese Mail, weil du beim Start Erinnerungen angeschaltet hast. Es kommen höchstens zwei.",
    unsubscribe: "Keine Erinnerungen mehr",
    privacy: "Datenschutz",
  };
}
