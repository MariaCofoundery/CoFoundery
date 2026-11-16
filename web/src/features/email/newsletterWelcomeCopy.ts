import type { AppLocale } from "@/i18n/config";

/**
 * Die Willkommensmail zum Newsletter: einmal, direkt nach der Bestaetigung (Entwurf und Text von Maria, 16.11.2026).
 * Bewusst ohne Namen und Einzelheiten ueber Dritte; ihre eigene Geschichte, in ihren Worten. Aenderungen am Text sind Aenderungen an
 * Marias Aussagen - nur mit ihr.
 */
export type NewsletterWelcomeCopy = {
  htmlLang: string;
  subject: string;
  preheader: string;
  headline: string;
  intro: string;
  bio: string;
  howTitle: string;
  how: string[];
  thenTitle: string;
  then: string;
  learnedTitle: string;
  learned: { lead: string; text: string }[];
  whyTitle: string;
  whyIntro: string;
  areas: { lead: string; text: string }[];
  expectTitle: string;
  expect: string;
  cta: string;
  outro: string;
  bye: string;
  signature: string;
  unsubscribe: string;
  privacy: string;
  imprint: string;
};

export function getNewsletterWelcomeCopy(locale: AppLocale): NewsletterWelcomeCopy {
  if (locale === "en") {
    return {
      htmlLang: "en",
      subject: "I once fell flat on my face",
      preheader: "Why Made2Found exists, and what to expect here.",
      headline: "Hello and welcome!",
      intro: "So glad you're here! I'm Maria, and I want to tell you briefly why Made2Found exists. The short version: I wanted to become a co-founder at a startup, with a founder who was incredibly likable. And we still didn't fit together at all.",
      bio: "Hi, I'm Maria, a business psychologist, coach and founder. I became a mom at 17, I was the first in my family to go to university, and I'd rather solve problems than dwell on them.",
      howTitle: "How I got here",
      how: [
        "I spent many years in pharma research, helping with change projects. My feeling was always: something's off here, how can it be better? That became a coaching training, and in 2021 I went self-employed as a coach and photographer. That went well. Until I wanted more.",
        "At an event I talked to a speaker: warm, charismatic, great values. Soon after, I was in the startup, with the prospect of becoming the second managing director. Family and friends invested, and within four days I had 17,000 euros in commitments. I was flattered and convinced.",
      ],
      thenTitle: "And then?",
      then: "It was clear quickly: we work completely differently, and what didn't fit was talked about less and less. After just two months I was out again. The money was gone, I was in debt and suddenly had no safety net. By far the hardest moment of my career.",
      learnedTitle: "WHAT I LEARNED",
      learned: [
        { lead: "Likability isn't everything.", text: "Someone who tells great stories isn't automatically a good co-founder." },
        { lead: "Don't believe everything.", text: "Especially if you don't come from the startup bubble. Ask people who know it." },
        { lead: "Clarify things beforehand.", text: "It can be done. That's exactly what I was missing." },
      ],
      whyTitle: "Nobody should have to fall this far",
      whyIntro: "That's why I built Made2Found:",
      areas: [
        { lead: "Align:", text: "You look together at how you work, and then have an honest conversation. No scores, no \"fits\" or \"doesn't fit\". The Founder Setup records what you need to talk about." },
        { lead: "Find:", text: "Find co-founders." },
        { lead: "Advisor:", text: "Someone at your side who supports you." },
        { lead: "Connect:", text: "I'm looking, I'm offering, a bit like eBay for the founder ecosystem. We can all be a little kinder to each other." },
      ],
      expectTitle: "What to expect",
      expect: "A short email from me every two weeks: an idea, a story, or a question for your conversation. No spam, no pressure.",
      cta: "Start with your profile",
      outro: "If you have questions, just reply to this email or write to me in the platform. If something strikes you or is missing, there's a feedback button at the top of the platform. I'm open to everything.",
      bye: "See you soon,",
      signature: "Maria",
      unsubscribe: "Unsubscribe",
      privacy: "Privacy",
      imprint: "Imprint",
    };
  }
  return {
    htmlLang: "de",
    subject: "Ich bin schon einmal so richtig auf die Nase gefallen",
    preheader: "Warum es Made2Found gibt, und was dich hier erwartet.",
    headline: "Hallo und herzlich willkommen!",
    intro: "Schön, dass du da bist! Ich bin Maria und erzähle dir kurz, warum es Made2Found gibt. Die Kurzfassung: Ich wollte bei einem Startup Co-Founderin werden, mit einem Gründer, der unfassbar sympathisch war. Und wir haben trotzdem null zusammengepasst.",
    bio: "Hi, ich bin Maria, Wirtschaftspsychologin, Coachin und Gründerin. Mit 17 wurde ich Mama, als Erste in meiner Familie habe ich studiert und ich löse am liebsten Probleme, statt sie zu wälzen.",
    howTitle: "Wie ich dahin kam",
    how: [
      "Viele Jahre habe ich in der Pharmaforschung gearbeitet und bei Veränderungsprojekten mitgeholfen. Mein Gefühl war immer: Hier läuft etwas schief, wie geht es besser? Daraus wurde eine Coaching-Ausbildung, und 2021 habe ich mich selbstständig gemacht, als Coachin und Fotografin. Das lief gut. Bis ich mehr wollte.",
      "Auf einem Event habe ich einen Speaker angesprochen: herzlich, charismatisch, tolle Werte. Wenig später war ich im Startup, mit der Aussicht, zweite Geschäftsführerin zu werden. Familie und Freunde haben investiert, in vier Tagen hatte ich 17.000 Euro Zusagen. Ich war geschmeichelt und überzeugt.",
    ],
    thenTitle: "Und dann?",
    then: "Schnell war klar: Wir arbeiten völlig unterschiedlich und über das, was nicht passte, wurde immer weniger gesprochen. Nach nur zwei Monaten war ich wieder raus. Das Geld war verbrannt, ich hatte dadurch Schulden und plötzlich kein Netz mehr. Der mit Abstand härteste Moment meines Berufslebens.",
    learnedTitle: "WAS ICH GELERNT HABE",
    learned: [
      { lead: "Sympathie ist nicht alles.", text: "Wer toll Geschichten erzählt, ist nicht automatisch ein guter Co-Founder." },
      { lead: "Nicht alles glauben.", text: "Besonders, wenn du nicht aus der Startup-Bubble kommst. Frag Leute, die das kennen." },
      { lead: "Vorher klären.", text: "Das geht. Genau das fehlte mir." },
    ],
    whyTitle: "So tief muss niemand fallen",
    whyIntro: "Deshalb habe ich Made2Found gebaut:",
    areas: [
      { lead: "Align:", text: "Ihr schaut gemeinsam, wie ihr arbeitet, und führt danach ein ehrliches Gespräch. Keine Punkte, kein „passt“ oder „passt nicht“. Das Founder-Setup hält fest, worüber ihr sprechen müsst." },
      { lead: "Find:", text: "Mitgründer:innen finden." },
      { lead: "Advisor:", text: "Jemand an deiner Seite, der unterstützt." },
      { lead: "Connect:", text: "Ich suche, ich biete, ein bisschen wie eBay fürs Gründer-Ökosystem. Wir dürfen alle ein bisschen netter zueinander sein." },
    ],
    expectTitle: "Was dich erwartet",
    expect: "Alle zwei Wochen eine kurze Mail von mir: eine Idee, eine Geschichte oder eine Frage für euer Gespräch. Kein Spam, kein Druck.",
    cta: "Starte mit deinem Profil",
    outro: "Wenn du Fragen hast, schreib mir einfach auf diese Mail zurück oder in der Plattform. Wenn dir etwas auffällt oder fehlt, gibt es oben in der Leiste den Feedback-Button. Ich bin für alles offen.",
    bye: "Bis bald,",
    signature: "Maria",
    unsubscribe: "Abmelden",
    privacy: "Datenschutz",
    imprint: "Impressum",
  };
}
