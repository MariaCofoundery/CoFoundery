import type { AppLocale } from "@/i18n/config";

/** Die Bestaetigungs-Mail (Double-Opt-in): kurz, freundlich, mit dem Hinweis, wie oft und wie man wieder abbestellt. */
export function getNewsletterConfirmCopy(locale: AppLocale, name: string | null) {
  const n = name?.trim() || null;
  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: "One click and you're in: \"From the network\"",
      preheader: "Please confirm that you want our newsletter.",
      headline: n ? `Hey ${n}, one click and you're in` : "Hey, one click and you're in",
      intro: "You asked for our newsletter \"From the network\": every two weeks, a few new requests and offers (without names), a story, and thanks that helped. Please confirm with the button below, so we know it was really you.",
      cta: "Yes, send me the newsletter",
      ctaHint: "If you did not ask for this, just ignore this email. Nothing will be sent.",
      signoff: "Warm regards\nMaria",
      privacy: "Privacy",
    };
  }
  return {
    htmlLang: "de",
    subject: "Ein Klick, dann bist du dabei: „Aus dem Netzwerk“",
    preheader: "Bitte bestätige, dass du unseren Newsletter möchtest.",
    headline: n ? `Hallo ${n}, ein Klick und du bist dabei` : "Hallo, ein Klick und du bist dabei",
    intro: "Du hast unseren Newsletter „Aus dem Netzwerk“ gewünscht: alle zwei Wochen ein paar neue Gesuche und Angebote (ohne Namen), eine Geschichte und Dank, der geholfen hat. Bitte bestätige mit dem Knopf, damit wir sicher sind, dass du es warst.",
    cta: "Ja, schickt mir den Newsletter",
    ctaHint: "Wenn du das nicht angefragt hast, ignoriere diese Mail einfach. Dann passiert nichts.",
    signoff: "Herzliche Grüße\nMaria",
    privacy: "Datenschutz",
  };
}
