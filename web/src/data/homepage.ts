// Kept separate from the independently reviewed domain/rebrand pass.
//
// Startseite fuer Besucher ohne Konto (Entwurf "Einstiegsseite", Board 25, vom
// 22.10.2026). Bewusst NICHT enthalten:
//   - der Block "Was andere sagen": Es gibt noch keine echten, freigegebenen
//     Stimmen, und wir erfinden keine. Er kommt, wenn es welche gibt.
//   - Zahlen oder Versprechen ("kostenlos", Erfolgsquoten): nichts davon ist
//     belegt oder entschieden.
// Das Beispielergebnis traegt erfundene Namen und sagt das auch.
export type HomepageDeckCard = { tone: "blue" | "violet" | "teal" | "amber"; kind: string; text: string };
export type HomepageExampleRow = { label: string; a?: string; b?: string; both?: string; bothTag?: string };

const de = {
  skip: "Zum Inhalt", menu: "Menü", close: "Menü schließen", navigation: "Hauptnavigation",
  login: "Login", start: "Jetzt starten", try: "Jetzt starten",
  navSo: "So funktioniert es", navAreas: "Align, Find, Connect",
  kicker: "„Wir verstehen uns super“ ist keine Gründungsgrundlage.",
  headline: ["Erst ", "reden.", "Dann gründen."],
  lead: "Finde raus, wie du arbeitest. Seht, wo ihr verschieden tickt. Dann Nägel mit Köpfen: Rollen, Zeit, Geld, Entscheidungen.",
  fineStart: "Der Start dauert etwa 12 Minuten. Deine Antworten sieht erst mal nur du.",
  fineBeta: "Closed Beta: Du brauchst einen Zugangscode.", fineRequest: "Zugang anfragen",
  deckLabel: "Fragen, die ihr besser vor der Gründung klärt",
  deck: [
    { tone: "blue", kind: "Entscheiden", text: "Wer hat das letzte Wort, wenn ihr euch nicht einig seid?" },
    { tone: "violet", kind: "Zeit", text: "Was meinst du mit Vollzeit – in Stunden pro Woche?" },
    { tone: "teal", kind: "Ausstieg", text: "Was passiert, wenn einer von uns aufhört?" },
    { tone: "amber", kind: "Anteile", text: "Wer bekommt wie viele Anteile, und warum?" },
  ] as HomepageDeckCard[],
  whyLabel: "Worum es uns geht",
  whyTitle: ["Das Gute verstärken.", "Das Herausfordernde angehen."],
  whyText: [
    "Du kennst das vielleicht: Du arbeitest mit den richtigen Menschen und plötzlich läuft es. Man beflügelt sich gegenseitig und jede:r bringt ein, was er oder sie am besten kann.",
    "Das ist kein Zufall. Es passiert, wenn man auf das schaut, was gut läuft, seine Stärken kennt und sie gezielt einsetzt.",
    "Dabei helfen wir euch. Und bei dem, was schwierig ist, auch.",
  ],
  exampleTitle: "So sieht euer Gespräch aus",
  exampleLead: "Kein Urteil, keine Note. Ihr seht, wo ihr ähnlich arbeitet, wo nicht, und bekommt eine Frage mit auf den Weg.",
  exampleTag: "Beispiel mit erfundenen Namen",
  exampleNames: ["Anna", "Ben"],
  exampleRows: [
    { label: "Entscheiden", a: "Erst Daten sammeln, dann entscheiden.", b: "Schnell etwas ausprobieren und nachjustieren." },
    { label: "Zeit", a: "Vollzeit, ab sofort.", b: "Erst neben dem Job, später Vollzeit." },
    { label: "Wofür ihr brennt", bothTag: "Gemeinsam", both: "Beide wollen ein Produkt bauen, das im Alltag wirklich genutzt wird." },
  ] as HomepageExampleRow[],
  exampleQuestionTitle: "Eine Frage für euer Gespräch",
  exampleQuestion: "Ab wann reicht euch die Datenlage und was soll Ben bis dahin schon ausprobieren dürfen?",
  endTitle: "Das habt ihr am Ende in der Hand",
  end: [
    { title: "Du weißt, wie du tickst", text: "Dein Profil auf einen Blick: wie du arbeitest, was du kannst, wohin du willst." },
    { title: "Das Gespräch, vor dem sich viele drücken", text: "Ihr seht, wo ihr verschieden tickt, bevor es später Ärger gibt. Mit Fragen statt Noten." },
    { title: "Schwarz auf weiß", text: "Rollen, Zeit, Geld, Entscheidungen: aufgeschrieben und von allen bestätigt." },
  ],
  areasTitle: "Drei Bereiche, die du einzeln nutzt",
  areasLead: "Du brauchst keinen für den anderen. Jede Freigabe gilt für sich.",
  areas: [
    { id: "align", label: "Align", text: "Verstehe, wer du als Founder bist, und vergleicht euch als Team: Ähnlichkeiten, Unterschiede und Herausforderungen." },
    { id: "find", label: "Find", text: "Mitgründer:innen finden. Du sagst, was du suchst und mitbringst." },
    { id: "connect", label: "Connect", text: "Frag Leute, die es schon mal gemacht haben, biete selbst Support an." },
  ],
  advisorLine: "Du begleitest Gründende?", advisorLink: "Hier geht es für Advisor weiter →",
  bandTitle: ["Reden kostet ein paar Minuten.", "Nicht reden kann teuer werden."],
  footer: "Menschen, Fähigkeiten und Vorhaben zusammenbringen.", legal: "Impressum", privacy: "Datenschutz", stance: "Unsere Haltung", phone: "Aufs Handy (PDF)",
  seoTitle: "Made2Found – Erst reden. Dann gründen.",
  seoDescription: "Finde raus, wie du arbeitest, seht, wo ihr verschieden tickt, und haltet Rollen, Zeit, Geld und Entscheidungen fest. Made2Found für Mitgründer:innen, in der geschlossenen Beta.",
};

const en: typeof de = {
  skip: "Skip to content", menu: "Menu", close: "Close menu", navigation: "Main navigation",
  login: "Log in", start: "Get started", try: "Get started",
  navSo: "How it works", navAreas: "Align, Find, Connect",
  kicker: "“We get along great” is not a basis for a company.",
  headline: ["Talk ", "first.", "Then found."],
  lead: "Find out how you work. See where you tick differently. Then get specific: roles, time, money, decisions.",
  fineStart: "Getting started takes about 12 minutes. For now, only you see your answers.",
  fineBeta: "Closed beta: you need an access code.", fineRequest: "Request access",
  deckLabel: "Questions you are better off settling before you found",
  deck: [
    { tone: "blue", kind: "Deciding", text: "Who has the final say when you disagree?" },
    { tone: "violet", kind: "Time", text: "What do you mean by full-time – in hours per week?" },
    { tone: "teal", kind: "Exit", text: "What happens if one of us leaves?" },
    { tone: "amber", kind: "Equity", text: "Who gets how much equity, and why?" },
  ] as HomepageDeckCard[],
  whyLabel: "What we care about",
  whyTitle: ["Build on what’s good.", "Face what’s hard."],
  whyText: [
    "You may know the feeling: you work with the right people and suddenly things click. You lift each other up and everyone brings what they do best.",
    "That is no accident. It happens when you look at what works, know your strengths and use them on purpose.",
    "That is where we help you. And with the difficult parts, too.",
  ],
  exampleTitle: "What your conversation looks like",
  exampleLead: "No verdict, no grade. You see where you work alike, where you don’t, and get a question to take with you.",
  exampleTag: "Example with made-up names",
  exampleNames: ["Anna", "Ben"],
  exampleRows: [
    { label: "Deciding", a: "Gather data first, then decide.", b: "Try something quickly and adjust." },
    { label: "Time", a: "Full-time, starting now.", b: "Alongside a job first, full-time later." },
    { label: "What drives you", bothTag: "Shared", both: "Both want to build a product people really use day to day." },
  ] as HomepageExampleRow[],
  exampleQuestionTitle: "A question for your conversation",
  exampleQuestion: "When is the data enough for you, and what should Ben be allowed to try in the meantime?",
  endTitle: "What you have in hand at the end",
  end: [
    { title: "You know how you tick", text: "Your profile at a glance: how you work, what you can do, where you want to go." },
    { title: "The conversation many people avoid", text: "You see where you tick differently before it causes trouble later. With questions instead of grades." },
    { title: "In writing", text: "Roles, time, money, decisions: written down and confirmed by everyone." },
  ],
  areasTitle: "Three areas you use on their own",
  areasLead: "You don’t need one for the other. Every share stands on its own.",
  areas: [
    { id: "align", label: "Align", text: "Understand who you are as a founder and compare yourselves as a team: similarities, differences and challenges." },
    { id: "find", label: "Find", text: "Find co-founders. You say what you are looking for and what you bring." },
    { id: "connect", label: "Connect", text: "Ask people who have done it before, or offer support yourself." },
  ],
  advisorLine: "You support founders?", advisorLink: "Advisors continue here →",
  bandTitle: ["Talking takes a few minutes.", "Not talking can get expensive."],
  footer: "Bringing people, skills and ventures together.", legal: "Legal notice", privacy: "Privacy policy", stance: "Our approach", phone: "On your phone (PDF)",
  seoTitle: "Made2Found – Talk first. Then found.",
  seoDescription: "Find out how you work, see where you tick differently, and put roles, time, money and decisions in writing. Made2Found for co-founders, in closed beta.",
};

export function getHomepageContent(locale: string) {
  return locale === "en" ? en : de;
}
