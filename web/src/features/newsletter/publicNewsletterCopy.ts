/**
 * Die Worte der Newsletter-Anmeldung OHNE Konto (Blog): Bestaetigungsmail, Bestaetigungs- und Abmeldeseite. In der Sprache der Anmeldung
 * (de oder en), nicht in der der App - wer sich hier einträgt, hat kein Konto und keine App-Sprache.
 */
export type PublicNewsletterLanguage = "de" | "en";

export const PUBLIC_NEWSLETTER_COPY = {
  de: {
    mail: {
      subject: "Ein Klick, dann bist du dabei: der Newsletter von Made2Found",
      preheader: "Bitte bestätige, dass du den Newsletter möchtest.",
      headline: "Hallo, ein Klick und du bist dabei",
      intro: "Du hast dich für den Newsletter von Made2Found angemeldet: alle zwei Wochen ein Gedanke zu Zusammenarbeit, Konflikten und Führung in Gründungsteams. Bitte bestätige mit dem Knopf, damit wir sicher sind, dass du es selbst warst.",
      cta: "Ja, schickt mir den Newsletter",
      hint: "Wenn du das nicht angefragt hast, ignoriere diese Mail einfach. Dann passiert nichts und deine Adresse wird nach kurzer Zeit gelöscht.",
      signoff: "Herzliche Grüße\nMaria",
      privacy: "Datenschutz",
    },
    confirm: { title: "Noch ein Klick", text: "Bestätige, dass diese Adresse den Newsletter von Made2Found bekommen soll.", button: "Ja, schickt mir den Newsletter" },
    done: { title: "Du bist dabei", text: "Danke! Die nächste Ausgabe kommt in dein Postfach. Du kannst dich in jeder Mail mit einem Klick wieder abmelden.", appTitle: "Magst du Made2Found ausprobieren?", appText: "Ein Konto ist kostenlos und ganz getrennt vom Newsletter: Du bekommst ihn auch ohne.", appButton: "Zur App" },
    invalid: { title: "Dieser Link gilt nicht", text: "Der Link ist abgelaufen oder unvollständig. Trag dich bitte noch einmal auf der Seite ein." },
    unsubscribe: { title: "Vom Newsletter abmelden", text: "Du bekommst danach keine Ausgabe mehr. Deine Adresse bleibt nur als Sperre gespeichert, damit dich niemand ungewollt wieder anschreibt.", button: "Ja, abmelden", doneTitle: "Du bist abgemeldet", doneText: "Es kommt keine Ausgabe mehr. Schade, dass du gehst, und danke fürs Lesen." },
  },
  en: {
    mail: {
      subject: "One click and you're in: the Made2Found newsletter",
      preheader: "Please confirm that you want the newsletter.",
      headline: "Hey, one click and you're in",
      intro: "You signed up for the Made2Found newsletter: every two weeks a thought on working together, conflict and leadership in founding teams. Please confirm with the button below, so we know it was really you.",
      cta: "Yes, send me the newsletter",
      hint: "If you did not ask for this, just ignore this email. Nothing will be sent and your address is deleted after a short while.",
      signoff: "Warm regards\nMaria",
      privacy: "Privacy",
    },
    confirm: { title: "One more click", text: "Confirm that this address should get the Made2Found newsletter.", button: "Yes, send me the newsletter" },
    done: { title: "You're in", text: "Thank you! The next issue will land in your inbox. You can unsubscribe with one click in every email.", appTitle: "Want to try Made2Found?", appText: "An account is free and completely separate from the newsletter: you get it either way.", appButton: "To the app" },
    invalid: { title: "This link is not valid", text: "The link has expired or is incomplete. Please sign up again on the page." },
    unsubscribe: { title: "Unsubscribe from the newsletter", text: "You will not get another issue. Your address stays on file only as a block, so nobody writes to you again by mistake.", button: "Yes, unsubscribe", doneTitle: "You're unsubscribed", doneText: "No more issues. Sorry to see you go, and thanks for reading." },
  },
} as const;

export function publicNewsletterCopy(language: string | undefined) {
  return PUBLIC_NEWSLETTER_COPY[language === "en" ? "en" : "de"];
}
