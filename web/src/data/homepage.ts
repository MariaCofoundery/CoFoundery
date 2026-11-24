// Startseite fuer Besucher ohne Konto (Neufassung "Universum", Entwurf vom 24.11.2026).
//
// Aufbau: Scrollreise (Kopfbereich) -> Bruecke -> "Wo stehst du gerade?" -> Find und Align ->
// Founder Setup -> Marias Wort -> Netzwerk (Connect, Advisor) -> Ergebnisse -> Fragen -> Schluss.
//
// Bewusst NICHT enthalten:
//   - Stimmen oder Zitate anderer ("Was andere sagen"): Es gibt noch keine echten, freigegebenen. Marias
//     Wort ist ihre eigene Aussage und kein Zitat.
//   - Zahlen, Erfolgsquoten, Versprechen. Die Beispiele (Anna und Ben, Mara, Jonas ...) sind erfunden. Das
//     sichtbare Etikett heisst nur "Beispiel" (Wunsch von Maria, 24.11.2026); die Beschriftungen fuer
//     Vorlesehilfen (windowLabel) sagen weiterhin "erfunden".
//   - Scores, Typen, Ranglisten. Wo die Seite sie verneint, steht der Satz in HOMEPAGE_ALLOWED_CLAIMS,
//     damit der Test ihn genau dort zulaesst und sonst nirgends.
//
// "Im Moment kostenlos" ist eine Angabe von Maria (24.11.2026), nicht von der Beratung geprueft.

const FAQ_NO_SCORE_DE = "Nein. Es gibt keine Punkte, keine Typen und keine Rangliste. Du bekommst Fragen für euer Gespräch.";
const FAQ_NO_SCORE_EN = "No. There are no points, no types and no ranking. You get questions for your conversation.";
const FIND_NOTE_DE = "Es gibt keine Rangfolge nach Passung und keinen Score.";
const FIND_NOTE_EN = "There is no ranking by fit and no score.";
const PRICE_DE = "Im Moment ist Made2Found kostenlos.";
const PRICE_EN = "Right now, Made2Found is free.";

/** Der Preissatz, einmal definiert, damit alle oeffentlichen Seiten dasselbe sagen. */
export const FREE_NOW: { de: string; en: string } = { de: PRICE_DE, en: PRICE_EN };

/** Genau diese Saetze duerfen Woerter wie "Score" oder "kostenlos" enthalten (siehe Test). */
export const HOMEPAGE_ALLOWED_CLAIMS = {
  de: [FAQ_NO_SCORE_DE, FIND_NOTE_DE, PRICE_DE],
  en: [FAQ_NO_SCORE_EN, FIND_NOTE_EN, PRICE_EN],
} as const;

export type HomepagePerson = { name: string; letter: string; tone: "violet" | "blue" | "teal" | "amber"; seeks: string; chips: string[] };

const de = {
  // Rahmen und Navigation
  skip: "Zum Inhalt", menu: "Menü", close: "Menü schließen", navigation: "Hauptnavigation",
  login: "Login", start: "Jetzt starten",
  navSo: "So funktioniert es", navAreas: "Find, Align, Connect",
  accessRequest: "Zugang anfragen",
  example: "Beispiel",

  // Scrollreise
  journey: {
    ariaLabel: "Worum es bei Made2Found geht",
    label: "Made2Found",
    headline: ["Erst reden.", "Dann gründen."],
    sub: "Finden. Verstehen. Festhalten. Die Plattform für alle, die gemeinsam gründen.",
    // "nur du" mit geschuetztem Leerzeichen: das "du" soll nie allein in einer neuen Zeile stehen.
    fine: "Dauert ein paar Minuten. Deine Antworten siehst erst einmal nur\u00a0du.",
    scroll: "Weiter scrollen",
    dotsLabel: "Kapitel",
    dots: ["Start", "Find", "Align", "Founder Setup", "Connect", "Advisor"],
    chapters: [
      { label: "Find", ghost: "Find", title: "Mitgründer:innen finden.", text: "Du sagst, was du suchst und mitbringst. Aus vielen Menschen werden wenige, mit denen ein Gespräch Sinn ergibt." },
      { label: "Align", ghost: "Align", title: "Verstehen, wie ihr arbeitet.", text: "Wie arbeitest du? Wo tickt ihr ähnlich, wo verschieden? Ähnlichkeiten und Unterschiede, ohne Note und ohne Urteil." },
      { label: "Founder Setup", ghost: "Setup", title: "Vom Gespräch zur Vereinbarung.", text: "Rollen, Zeit, Geld, Entscheidungen: aufgeschrieben und von allen bestätigt." },
      { label: "Connect", ghost: "Connect", title: "Das Netzwerk der Gründerszene.", text: "Frag Leute, die es schon einmal gemacht haben. Biete selbst Support an. Kontakte knüpfen, helfen, danken." },
      { label: "Advisor und Accelerator", ghost: "Advisor", title: "Begleitung, wenn ihr sie wollt.", text: "Mentoring, Programme und Erfahrung von Menschen, die Teams weiterbringen. Sie sehen nur, was ihr freigebt." },
    ],
  },

  // Bruecke
  bridge: {
    label: "Worum es uns geht",
    lines: ["Das Gute verstärken.", "Herausforderndes angehen."],
    paragraphs: [
      "Du kennst das vielleicht: Du arbeitest mit den richtigen Menschen und plötzlich läuft es. Man beflügelt sich gegenseitig und jede:r bringt ein, was er oder sie am besten kann.",
      "Das ist kein Zufall. Es passiert, wenn man auf das schaut, was gut läuft, seine Stärken kennt und sie gezielt einsetzt.",
      "Dabei helfen wir euch. Und bei dem, was schwierig ist, auch.",
    ],
  },

  // Tueren
  doors: {
    title: "Wo stehst du gerade?",
    items: [
      { icon: "find", kicker: "Find", title: "Ich suche Mitgründer:innen", text: "Profil anlegen, Menschen entdecken, ins Gespräch kommen.", cta: "Los geht’s →", href: "/start" },
      { icon: "team", kicker: "Align und Founder Setup", title: "Wir sind schon ein Team", text: "Versteht, wie ihr arbeitet, und haltet fest, worauf ihr euch einigt.", cta: "Als Team starten →", href: "/start" },
      { icon: "net", kicker: "Connect und Begleitung", title: "Ich begleite Gründende oder habe etwas anzubieten", text: "Mach sichtbar, was du kannst und was du brauchst.", cta: "Zum Netzwerk →", href: "#netzwerk" },
    ],
  },

  // Find und Align
  overview: {
    label: "Das Ganze auf einen Blick",
    title: "Von der Suche bis zur gemeinsamen Gründung.",
    sub: "Über die Dinge sprechen, über die man sonst nicht spricht. Ehrlich, wertschätzend, auf Augenhöhe. Du nutzt jeden Bereich einzeln, und jede Freigabe gilt für sich.",
    find: {
      label: "Find",
      title: "Mitgründer:innen finden.",
      text: "Du sagst, was du suchst und was du mitbringst. Andere sehen dein Profil nur, wenn du es willst.",
      bullets: ["Dein Profil mit Fähigkeiten, Wünschen und Richtung", "Gezielt Menschen entdecken, mit denen ein Gespräch Sinn ergibt", "Du entscheidest, wer dich sehen darf"],
      windowLabel: "Beispiel der Seite Menschen finden mit erfundenen Profilen",
      bar: "Find", barPage: "Entdecken",
      bannerKicker: "FIND", bannerTitle: "Menschen finden", bannerText: "Nicht der perfekte Match, sondern Menschen, mit denen sich ein Gespräch lohnen könnte.",
      tabs: ["Für dich", "Suchen & filtern", "Gemerkte"],
      note: FIND_NOTE_DE,
      people: [
        { name: "Mara", letter: "M", tone: "violet", seeks: "sucht Technik für ihr Vorhaben", chips: ["Produkt", "Vertrieb", "Bildung"] },
        { name: "Jonas", letter: "J", tone: "blue", seeks: "sucht Produkt und Vertrieb", chips: ["Technik", "Daten", "Gesundheit"] },
        { name: "Lea", letter: "L", tone: "teal", seeks: "sucht jemanden für das Geschäftliche", chips: ["Design", "Marke", "Nachhaltigkeit"] },
        { name: "Tarek", letter: "T", tone: "amber", seeks: "sucht Technik für sein Vorhaben", chips: ["Finanzen", "Operations", "Logistik"] },
      ] as HomepagePerson[],
    },
    align: {
      label: "Align",
      title: "Verstehen, wie ihr arbeitet.",
      text: "Dein Arbeitsprofil, und dann der Blick auf das Team: wo ihr ähnlich tickt, wo ihr verschieden arbeitet.",
      bullets: ["Stärken, Arbeitsweise und Werte auf einen Blick", "Ähnlichkeiten und Unterschiede im Team", "Eine Frage für euer Gespräch, ohne Note und ohne Urteil"],
      windowLabel: "Beispiel der Align-Übersicht mit einem Vergleich von Anna und Ben",
      bar: "Align", barPage: "Wir",
      heroKicker: "ALIGN", heroTitle: "Wer ihr seid und wie ihr zusammenarbeitet",
      names: ["Anna", "Ben"],
      rows: [
        { label: "Entscheiden", a: "Erst Daten sammeln, dann entscheiden.", b: "Schnell etwas ausprobieren und nachjustieren." },
        { label: "Zeit", a: "Vollzeit, ab sofort.", b: "Erst neben dem Job, später Vollzeit." },
      ],
      both: { label: "Wofür ihr brennt", tag: "Gemeinsam", text: "Ein Produkt, das im Alltag wirklich genutzt wird." },
      askTitle: "Eine Frage für euer Gespräch",
      ask: "Ab wann reicht euch die Datenlage, und was soll Ben bis dahin ausprobieren dürfen?",
    },
  },

  // Founder Setup
  setup: {
    label: "Founder Setup",
    title: "Worüber ihr sprecht, bevor es teuer wird.",
    intro: "Hier haltet ihr fest, worauf ihr euch geeinigt habt. Eine Auswahl der Themen. Tippe eines an.",
    note: "Beispielfragen zur Orientierung, keine Rechtsberatung.",
    more: "und weitere Themen",
    topics: [
      { t: "Vision und Ziele", q: "Wo wollt ihr in drei Jahren stehen, und woran würdet ihr es merken?" },
      { t: "Rollen", q: "Wer ist wofür verantwortlich, und wissen das alle gleich?" },
      { t: "Entscheidungsrechte", q: "Wer hat das letzte Wort, wenn ihr euch nicht einig seid?" },
      { t: "Zeiteinsatz", q: "Was meinst du mit Vollzeit, in Stunden pro Woche?" },
      { t: "Anteile", q: "Wer bekommt wie viele Anteile, und warum?" },
      { t: "Ausstieg", q: "Was passiert, wenn einer von uns aufhört?" },
      { t: "Investoren", q: "Wie viel Verwässerung ist für euch in Ordnung?" },
    ],
  },

  // Marias Wort
  founder: {
    label: "Warum es Made2Found gibt",
    title: "„Gemeinsam schaffen wir das meiste.“",
    paragraphs: [
      "Ich habe keine Lust mehr auf das ewige „alles ist schlecht“. Ich will anpacken, etwas aufbauen und dass wir uns wieder mehr gegenseitig unterstützen.",
      "Viele Startups scheitern an Konflikten im Gründungsteam, aber wenn man vorher die richtigen Gespräche führt und eine stabile Basis aufbaut, kann man sich als junges Unternehmen vor solchen Brüchen schützen.",
      "Und für viele Probleme gibt es irgendwo jemanden, der eine Lösung hat oder sie finden kann. Man muss das Problem nur sichtbar machen. Dafür baue ich Made2Found.",
    ],
    sig: "Maria",
    photoAlt: "Maria, Made2Found",
  },

  // Netzwerk
  net: {
    label: "Und darüber hinaus",
    title: "Das Netzwerk um euer Team.",
    sub: "Connect und Begleitung sind eigene Bereiche. Du nutzt sie unabhängig von Find, Align und dem Founder Setup.",
    connect: {
      label: "Connect",
      title: "Du siehst ein Problem? Mach es sichtbar.",
      text: "Jemand anderes findet vielleicht die Lösung. Und wenn du etwas kannst oder anzubieten hast, zeig es.",
      bullets: ["Menschen, Teams und Projekte finden", "Kontakte knüpfen, helfen, danken", "Chancen und Herausforderungen teilen"],
      more: "Mehr zu Connect →", moreHref: "/netzwerk",
      windowLabel: "Beispiel der Seite Connect mit erfundenen Einträgen",
      bar: "Connect", barPage: "Entdecken", view: "Ansehen →",
      rows: [
        { kind: "Gesuch", tone: "seek", title: "Erfahrung mit Förderanträgen", meta: "Förderung · Berlin" },
        { kind: "Angebot", tone: "offer", title: "Feedback zu Pitch-Decks", meta: "Pitch · Remote" },
        { kind: "Problem", tone: "problem", title: "Förderanträge kosten uns zu viel Zeit", meta: "Förderung · Deutschlandweit" },
        { kind: "Angebot", tone: "offer", title: "Einführung in Social Ads", meta: "Marketing · Leipzig" },
      ],
    },
    advisor: {
      label: "Advisor und Accelerator",
      title: "Begleitung, wenn ihr sie wollt.",
      text: "Erfahrung von Menschen, die Teams weiterbringen. Sie sehen nur, was ihr freigebt.",
      bullets: ["Expert:innen und Mentoring", "Programme und individuelle Begleitung", "Teams entwickeln und stärken"],
      more: "Mehr für Advisor und Accelerator →", moreHref: "/fuer-advisor",
      windowLabel: "Beispiel der Freigaben für eine Begleitung",
      bar: "Team", barPage: "Freigaben",
      shareTitle: "Wer darf was sehen?", shareSub: "Jede Freigabe gilt für sich und lässt sich zurücknehmen.",
      shares: [
        { label: "Arbeitsprofil", who: "für Advisor Lena", on: true },
        { label: "Teambericht", who: "für Advisor Lena", on: true },
        { label: "Founder Setup", who: "nicht geteilt", on: false },
      ],
    },
  },

  // Ergebnisse
  outcomes: {
    title: "Das habt ihr am Ende in der Hand",
    items: [
      { icon: "person", title: "Du weißt, wie du tickst", text: "Dein Profil auf einen Blick: wie du arbeitest, was du kannst, wohin du willst." },
      { icon: "talk", title: "Das Gespräch, vor dem sich viele drücken", text: "Ihr seht, wo ihr verschieden tickt, bevor es später Ärger gibt. Mit Fragen statt Noten." },
      { icon: "doc", title: "Schwarz auf weiß", text: "Rollen, Zeit, Geld, Entscheidungen: aufgeschrieben und von allen bestätigt." },
    ],
  },

  // Haeufige Fragen
  faq: {
    title: "Häufige Fragen",
    items: [
      { q: "Muss ich schon ein Team haben?", a: "Nein. Du kannst allein starten, zum Beispiel mit deinem Profil in Find oder deinem Arbeitsprofil in Align. Team und Gespräche kommen dazu, wenn du so weit bist." },
      { q: "Wer sieht meine Antworten?", a: "Erst einmal nur du. Was andere sehen, gibst du für jeden Teil selbst frei. Jede Freigabe gilt für sich und lässt sich zurücknehmen." },
      { q: "Bekomme ich eine Punktzahl oder einen Typ?", a: FAQ_NO_SCORE_DE },
      { q: "Wie lange dauert der Start?", a: "Der Start dauert nur ein paar Minuten." },
      { q: "Was kostet es?", a: PRICE_DE },
      { q: "Wie bekomme ich Zugang?", a: "Made2Found ist in der geschlossenen Beta. Hast du einen Zugangscode, geht es direkt los. Sonst frag ihn bei uns an." },
      { q: "Kann ich mein Konto wieder löschen?", a: "Ja, du kannst dein Konto jederzeit löschen." },
    ],
  },

  // Schluss und Zugang
  closing: {
    title: ["Reden kostet ein paar Minuten.", "Nicht reden kann teuer werden."],
    accessTitle: "Zugang zur Beta",
    accessText: "Made2Found ist in der geschlossenen Beta. Wir nehmen Gründende Schritt für Schritt persönlich auf. Hast du einen Zugangscode? Dann geht es direkt los. Sonst schreib uns kurz, wer du bist und was du vorhast:",
    accessCta: "Zugang per E-Mail anfragen",
  },

  // Fuss und Metadaten
  footer: "Menschen, Fähigkeiten und Vorhaben zusammenbringen.", legal: "Impressum", privacy: "Datenschutz", stance: "Unsere Haltung", forAdvisors: "Für Advisor", network: "Netzwerk", phone: "Aufs Handy (PDF)",
  seoTitle: "Made2Found – Erst reden. Dann gründen.",
  seoDescription: "Finde raus, wie du arbeitest, seht, wo ihr verschieden tickt, und haltet Rollen, Zeit, Geld und Entscheidungen fest. Made2Found für Mitgründer:innen, in der geschlossenen Beta.",
};

const en: typeof de = {
  skip: "Skip to content", menu: "Menu", close: "Close menu", navigation: "Main navigation",
  login: "Log in", start: "Get started",
  navSo: "How it works", navAreas: "Find, Align, Connect",
  accessRequest: "Request access",
  example: "Example",

  journey: {
    ariaLabel: "What Made2Found is about",
    label: "Made2Found",
    headline: ["Talk first.", "Then found."],
    sub: "Find. Understand. Put it in writing. The platform for everyone who founds together.",
    fine: "Takes a few minutes. For now, only you see your answers.",
    scroll: "Keep scrolling",
    dotsLabel: "Chapters",
    dots: ["Start", "Find", "Align", "Founder Setup", "Connect", "Advisor"],
    chapters: [
      { label: "Find", ghost: "Find", title: "Find co-founders.", text: "You say what you are looking for and what you bring. From many people, a few remain with whom a conversation makes sense." },
      { label: "Align", ghost: "Align", title: "Understand how you work.", text: "How do you work? Where do you tick alike, where differently? Similarities and differences, without grades and without verdicts." },
      { label: "Founder Setup", ghost: "Setup", title: "From conversation to agreement.", text: "Roles, time, money, decisions: written down and confirmed by everyone." },
      { label: "Connect", ghost: "Connect", title: "The network of the founder scene.", text: "Ask people who have done it before. Offer support yourself. Make contacts, help, say thanks." },
      { label: "Advisors and accelerators", ghost: "Advisor", title: "Support, when you want it.", text: "Mentoring, programs and experience from people who move teams forward. They only see what you share." },
    ],
  },

  bridge: {
    label: "What we care about",
    lines: ["Build on what’s good.", "Face what’s hard."],
    paragraphs: [
      "You may know the feeling: you work with the right people and suddenly things click. You lift each other up and everyone brings what they do best.",
      "That is no accident. It happens when you look at what works, know your strengths and use them on purpose.",
      "That is where we help you. And with the difficult parts, too.",
    ],
  },

  doors: {
    title: "Where are you right now?",
    items: [
      { icon: "find", kicker: "Find", title: "I am looking for co-founders", text: "Create a profile, discover people, start a conversation.", cta: "Let’s go →", href: "/start" },
      { icon: "team", kicker: "Align and Founder Setup", title: "We are already a team", text: "Understand how you work and put in writing what you agree on.", cta: "Start as a team →", href: "/start" },
      { icon: "net", kicker: "Connect and support", title: "I support founders or have something to offer", text: "Make visible what you can do and what you need.", cta: "To the network →", href: "#netzwerk" },
    ],
  },

  overview: {
    label: "The whole picture",
    title: "From the search to founding together.",
    sub: "Talk about the things people usually don’t talk about. Honest, appreciative, at eye level. You use each area on its own, and every share stands on its own.",
    find: {
      label: "Find",
      title: "Find co-founders.",
      text: "You say what you are looking for and what you bring. Others only see your profile if you want them to.",
      bullets: ["Your profile with skills, wishes and direction", "Discover people with whom a conversation makes sense", "You decide who may see you"],
      windowLabel: "Example of the Find people page with made-up profiles",
      bar: "Find", barPage: "Discover",
      bannerKicker: "FIND", bannerTitle: "Find people", bannerText: "Not the perfect match, but people with whom a conversation could be worthwhile.",
      tabs: ["For you", "Search & filter", "Saved"],
      note: FIND_NOTE_EN,
      people: [
        { name: "Mara", letter: "M", tone: "violet", seeks: "looking for tech for her venture", chips: ["Product", "Sales", "Education"] },
        { name: "Jonas", letter: "J", tone: "blue", seeks: "looking for product and sales", chips: ["Tech", "Data", "Health"] },
        { name: "Lea", letter: "L", tone: "teal", seeks: "looking for someone for the business side", chips: ["Design", "Brand", "Sustainability"] },
        { name: "Tarek", letter: "T", tone: "amber", seeks: "looking for tech for his venture", chips: ["Finance", "Operations", "Logistics"] },
      ] as HomepagePerson[],
    },
    align: {
      label: "Align",
      title: "Understand how you work.",
      text: "Your work profile, and then the view on the team: where you tick alike, where you work differently.",
      bullets: ["Strengths, way of working and values at a glance", "Similarities and differences in the team", "A question for your conversation, without grades and without verdicts"],
      windowLabel: "Example of the Align overview with a comparison of Anna and Ben",
      bar: "Align", barPage: "We",
      heroKicker: "ALIGN", heroTitle: "Who you are and how you work together",
      names: ["Anna", "Ben"],
      rows: [
        { label: "Deciding", a: "Gather data first, then decide.", b: "Try something quickly and adjust." },
        { label: "Time", a: "Full-time, starting now.", b: "Alongside a job first, full-time later." },
      ],
      both: { label: "What drives you", tag: "Shared", text: "A product people really use day to day." },
      askTitle: "A question for your conversation",
      ask: "When is the data enough for you, and what should Ben be allowed to try in the meantime?",
    },
  },

  setup: {
    label: "Founder Setup",
    title: "What you talk about before it gets expensive.",
    intro: "Here you put in writing what you have agreed on. A selection of the topics. Tap one.",
    note: "Example questions for orientation, not legal advice.",
    more: "and further topics",
    topics: [
      { t: "Vision and goals", q: "Where do you want to be in three years, and how would you notice?" },
      { t: "Roles", q: "Who is responsible for what, and does everyone see it the same way?" },
      { t: "Decision rights", q: "Who has the final say when you disagree?" },
      { t: "Time commitment", q: "What do you mean by full-time, in hours per week?" },
      { t: "Equity", q: "Who gets how much equity, and why?" },
      { t: "Exit", q: "What happens if one of us leaves?" },
      { t: "Investors", q: "How much dilution is okay for you?" },
    ],
  },

  founder: {
    label: "Why Made2Found exists",
    title: "“Together we can do most things.”",
    paragraphs: [
      "I am tired of the endless “everything is bad”. I want to get stuck in, build something and have us support each other more again.",
      "Many startups fail because of conflicts in the founding team, but if you have the right conversations beforehand and build a stable foundation, a young company can protect itself from such ruptures.",
      "And for many problems, somewhere there is someone who has a solution or can find one. You only have to make the problem visible. That is why I am building Made2Found.",
    ],
    sig: "Maria",
    photoAlt: "Maria, Made2Found",
  },

  net: {
    label: "And beyond",
    title: "The network around your team.",
    sub: "Connect and support are areas of their own. You use them independently of Find, Align and Founder Setup.",
    connect: {
      label: "Connect",
      title: "See a problem? Make it visible.",
      text: "Someone else may find the solution. And if you can do something or have something to offer, show it.",
      bullets: ["Find people, teams and projects", "Make contacts, help, say thanks", "Share opportunities and challenges"],
      more: "More about Connect →", moreHref: "/netzwerk",
      windowLabel: "Example of the Connect page with made-up entries",
      bar: "Connect", barPage: "Discover", view: "View →",
      rows: [
        { kind: "Looking", tone: "seek", title: "Experience with funding applications", meta: "Funding · Berlin" },
        { kind: "Offering", tone: "offer", title: "Feedback on pitch decks", meta: "Pitch · Remote" },
        { kind: "Problem", tone: "problem", title: "Funding applications cost us too much time", meta: "Funding · Germany-wide" },
        { kind: "Offering", tone: "offer", title: "Intro to social ads", meta: "Marketing · Leipzig" },
      ],
    },
    advisor: {
      label: "Advisors and accelerators",
      title: "Support, when you want it.",
      text: "Experience from people who move teams forward. They only see what you share.",
      bullets: ["Experts and mentoring", "Programs and individual support", "Develop and strengthen teams"],
      more: "More for advisors and accelerators →", moreHref: "/fuer-advisor",
      windowLabel: "Example of the shares for a support relationship",
      bar: "Team", barPage: "Shares",
      shareTitle: "Who may see what?", shareSub: "Every share stands on its own and can be taken back.",
      shares: [
        { label: "Work profile", who: "for advisor Lena", on: true },
        { label: "Team report", who: "for advisor Lena", on: true },
        { label: "Founder Setup", who: "not shared", on: false },
      ],
    },
  },

  outcomes: {
    title: "What you hold in your hands at the end",
    items: [
      { icon: "person", title: "You know how you tick", text: "Your profile at a glance: how you work, what you can do, where you want to go." },
      { icon: "talk", title: "The conversation many people avoid", text: "You see where you tick differently before it causes trouble later. With questions instead of grades." },
      { icon: "doc", title: "In writing", text: "Roles, time, money, decisions: written down and confirmed by everyone." },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      { q: "Do I need a team already?", a: "No. You can start on your own, for example with your profile in Find or your work profile in Align. Team and conversations come in when you are ready." },
      { q: "Who sees my answers?", a: "For now, only you. What others see, you share for each part yourself. Every share stands on its own and can be taken back." },
      { q: "Will I be graded or given a type?", a: FAQ_NO_SCORE_EN },
      { q: "How long does getting started take?", a: "Getting started takes just a few minutes." },
      { q: "What does it cost?", a: PRICE_EN },
      { q: "How do I get access?", a: "Made2Found is in closed beta. If you have an access code, you can start right away. Otherwise, ask us for one." },
      { q: "Can I delete my account again?", a: "Yes, you can delete your account at any time." },
    ],
  },

  closing: {
    title: ["Talking takes a few minutes.", "Not talking can get expensive."],
    accessTitle: "Access to the beta",
    accessText: "Made2Found is in closed beta. We take founders on step by step, personally. Do you have an access code? Then you can start right away. Otherwise, write us briefly who you are and what you plan:",
    accessCta: "Request access by email",
  },

  footer: "Bringing people, skills and ventures together.", legal: "Legal notice", privacy: "Privacy policy", stance: "Our approach", forAdvisors: "For advisors", network: "Network", phone: "On your phone (PDF)",
  seoTitle: "Made2Found – Talk first. Then found.",
  seoDescription: "Find out how you work, see where you tick differently, and put roles, time, money and decisions in writing. Made2Found for co-founders, in closed beta.",
};

export function getHomepageContent(locale: string) {
  return locale === "en" ? en : de;
}
