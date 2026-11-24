// Oeffentliche Seite "Fuer Advisor und Accelerator" (/fuer-advisor), Entwurf vom 24.11.2026.
//
// Inhalt, mit Maria abgestimmt:
//   - eine Seite fuer Advisor und Accelerator zusammen; Advisor koennen auch allein sein (ein Programm ist
//     nicht noetig); Einladungen gehen in beide Richtungen (Teams laden Advisor ein, Advisor laden Teams ein)
//   - "Im Moment kostenlos", Zugang ueber Code wie bei allen
//   - fuer Programme ein Gespraechsangebot statt eines Preises
//
// Alle Beispiele (Aufgaben, Termine, Namen) sind erfunden und sagen das. Was Advisor von einem Team sehen,
// steht nur mit "freigibt": Arbeitsprofil, Teambericht und Founder Setup sind getrennte Freigaben.
//
// Bewusst NICHT enthalten: Preise, Zahlen, Stimmen anderer, Versprechen ueber Erfolg. "Im Moment kostenlos" ist
// eine Angabe von Maria und nicht rechtlich geprueft; der Satz kommt aus homepage.ts (FREE_NOW).

import { FREE_NOW } from "@/data/homepage";

export type AdvisorTask = { title: string; who: string; status: string; tone: "open" | "due" | "done" };
export type AdvisorEvent = { when: string; title: string; kind: string };

const de = {
  seoTitle: "Für Advisor und Accelerator – Made2Found",
  seoDescription: "Begleite Gründungsteams auf Augenhöhe: Teamraum, Programm mit Terminen und Meilensteinen, und du siehst nur, was ein Team dir freigibt. Made2Found für Advisor und Accelerator, in der geschlossenen Beta.",

  hero: {
    label: "Für Advisor und Accelerator",
    title: ["Begleite Gründungsteams.", "Auf Augenhöhe."],
    sub: "Ob Mentor:in, Berater:in oder Accelerator: ein ruhiger Ort für deine Teams und dein Programm. Und du siehst nur, was ein Team dir freigibt.",
    primary: "Als Advisor starten",
    access: "Zugang anfragen",
    price: FREE_NOW.de,
    fine: "Zugang mit Code.",
    example: "Beispiel mit erfundenen Daten",
  },

  features: {
    label: "Was du bekommst",
    title: "Ein ruhiger Ort für Teams und Programm.",
    team: {
      label: "Teams",
      title: "Teams im Blick behalten.",
      text: "Teams laden dich ein, oder du lädst sie ein. Im Teamraum seht ihr gemeinsam, was ansteht.",
      bullets: ["Aufgaben, wer macht was und Kommentare an einem Ort", "Nächste Termine und Schritte im Kalender", "Einladungen gehen in beide Richtungen"],
      windowLabel: "Beispiel des Teamraums mit erfundenen Aufgaben",
      bar: "Teamraum", barPage: "Aufgaben",
      title2: "Aufgaben",
      comment: "Neuer Kommentar von Advisor Lena",
      tasks: [
        { title: "Pitch-Deck überarbeiten", who: "Ben", status: "Heute fällig", tone: "due" },
        { title: "Feedback-Gespräche terminieren", who: "Anna", status: "Offen", tone: "open" },
        { title: "Zielgruppe schärfen", who: "Anna und Ben", status: "Offen", tone: "open" },
        { title: "Erste Kundeninterviews", who: "Ben", status: "Erledigt", tone: "done" },
      ] as AdvisorTask[],
    },
    program: {
      label: "Programm",
      title: "Ein Programm führen.",
      text: "Plane Formate und Termine für deine Teams und halte Meilensteine fest.",
      bullets: ["Formate wie Workshop, Masterclass, Mentoring oder Office Hours", "Ein Kalender mit allen Terminen", "Meilensteine und Updates pro Team"],
      windowLabel: "Beispiel eines Programmplans mit erfundenen Terminen",
      bar: "Programm", barPage: "Termine",
      title2: "Diese Woche",
      formats: ["Workshop", "Masterclass", "Mentoring", "Office Hours", "Pitch-Training", "Fireside Chat"],
      events: [
        { when: "Di, 10:00", title: "Office Hours", kind: "Mentoring" },
        { when: "Do, 14:00", title: "Pitch-Training", kind: "Workshop" },
        { when: "Fr, 09:30", title: "Fireside Chat", kind: "Netzwerk" },
      ] as AdvisorEvent[],
    },
    shares: {
      label: "Freigaben",
      title: "Nur sehen, was Teams freigeben.",
      text: "Arbeitsprofil, Teambericht und Founder Setup sind getrennte Freigaben. Jede gilt für sich, und ein Team kann sie zurücknehmen.",
      bullets: ["Kein Zugriff auf Rohantworten", "Du siehst, was ein Team dir zeigen will, nicht mehr", "Jede Freigabe ist einzeln sichtbar und einzeln widerrufbar"],
    },
  },

  steps: {
    label: "So startest du",
    title: "In drei Schritten loslegen.",
    items: [
      { title: "Zugang holen", text: "Mit Zugangscode, oder frag ihn bei uns an." },
      { title: "Profil anlegen", text: "Ein Programm legst du an, wenn du eins führst. Allein geht es auch." },
      { title: "Teams einladen oder eingeladen werden", text: "Einladungen gehen in beide Richtungen." },
    ],
  },

  talk: {
    title: "Du führst ein Programm?",
    text: "Sprich mit uns. Wir hören zu, was du brauchst.",
    cta: "Gespräch anfragen",
    subject: "Programm bei Made2Found",
    body: "Hallo Made2Found-Team,\n\nich führe ein Programm und möchte mit euch sprechen.\n\nKurz zu mir und dem Programm:\n[bitte ergänzen]\n\nViele Grüße",
  },

  faq: {
    title: "Häufige Fragen",
    items: [
      { q: "Brauche ich ein Programm oder eine Organisation?", a: "Nein. Du kannst auch allein Teams begleiten. Ein Programm legst du an, wenn du Formate, Termine und Meilensteine für mehrere Teams führen willst." },
      { q: "Wer lädt wen ein?", a: "Beides geht: Teams können dich einladen, und du kannst Teams einladen." },
      { q: "Was sehe ich von einem Team?", a: "Nur, was das Team dir freigibt: Arbeitsprofil, Teambericht oder Founder Setup, jede Freigabe für sich. Das Team kann sie zurücknehmen." },
      { q: "Was kostet es?", a: FREE_NOW.de },
      { q: "Wie bekomme ich Zugang?", a: "Made2Found ist in der geschlossenen Beta. Hast du einen Zugangscode, geht es direkt los. Sonst frag ihn bei uns an." },
      { q: "Kann ich mein Konto wieder löschen?", a: "Ja, du kannst dein Konto jederzeit löschen." },
    ],
  },

  closing: {
    title: ["Gute Begleitung braucht einen klaren Rahmen.", "Hier ist er."],
    accessTitle: "Zugang zur Beta",
    accessText: "Made2Found ist in der geschlossenen Beta. Wir nehmen Gründende und Begleitende Schritt für Schritt persönlich auf. Hast du einen Zugangscode? Dann geht es direkt los. Sonst schreib uns kurz, wer du bist und wen du begleitest:",
    accessCta: "Zugang per E-Mail anfragen",
  },
};

const en: typeof de = {
  seoTitle: "For advisors and accelerators – Made2Found",
  seoDescription: "Support founding teams at eye level: team room, a program with dates and milestones, and you only see what a team shares with you. Made2Found for advisors and accelerators, in closed beta.",

  hero: {
    label: "For advisors and accelerators",
    title: ["Support founding teams.", "At eye level."],
    sub: "Whether mentor, consultant or accelerator: a calm place for your teams and your program. And you only see what a team shares with you.",
    primary: "Start as an advisor",
    access: "Request access",
    price: FREE_NOW.en,
    fine: "Access with a code.",
    example: "Example with made-up data",
  },

  features: {
    label: "What you get",
    title: "A calm place for teams and program.",
    team: {
      label: "Teams",
      title: "Keep teams in view.",
      text: "Teams invite you, or you invite them. In the team room you see together what is coming up.",
      bullets: ["Tasks, who does what and comments in one place", "Next dates and steps in the calendar", "Invitations go both ways"],
      windowLabel: "Example of the team room with made-up tasks",
      bar: "Team room", barPage: "Tasks",
      title2: "Tasks",
      comment: "New comment from advisor Lena",
      tasks: [
        { title: "Rework the pitch deck", who: "Ben", status: "Due today", tone: "due" },
        { title: "Schedule feedback conversations", who: "Anna", status: "Open", tone: "open" },
        { title: "Sharpen the target group", who: "Anna and Ben", status: "Open", tone: "open" },
        { title: "First customer interviews", who: "Ben", status: "Done", tone: "done" },
      ] as AdvisorTask[],
    },
    program: {
      label: "Program",
      title: "Run a program.",
      text: "Plan formats and dates for your teams and keep track of milestones.",
      bullets: ["Formats like workshop, masterclass, mentoring or office hours", "A calendar with all dates", "Milestones and updates per team"],
      windowLabel: "Example of a program plan with made-up dates",
      bar: "Program", barPage: "Dates",
      title2: "This week",
      formats: ["Workshop", "Masterclass", "Mentoring", "Office hours", "Pitch training", "Fireside chat"],
      events: [
        { when: "Tue, 10:00", title: "Office hours", kind: "Mentoring" },
        { when: "Thu, 14:00", title: "Pitch training", kind: "Workshop" },
        { when: "Fri, 09:30", title: "Fireside chat", kind: "Network" },
      ] as AdvisorEvent[],
    },
    shares: {
      label: "Shares",
      title: "Only see what teams share.",
      text: "Work profile, team report and Founder Setup are separate shares. Each stands on its own, and a team can take it back.",
      bullets: ["No access to raw answers", "You see what a team wants to show you, nothing more", "Every share is visible on its own and can be revoked on its own"],
    },
  },

  steps: {
    label: "How to start",
    title: "Get going in three steps.",
    items: [
      { title: "Get access", text: "With an access code, or ask us for one." },
      { title: "Create your profile", text: "You create a program if you run one. Going solo works too." },
      { title: "Invite teams or get invited", text: "Invitations go both ways." },
    ],
  },

  talk: {
    title: "Do you run a program?",
    text: "Talk to us. We want to hear what you need.",
    cta: "Request a conversation",
    subject: "Program at Made2Found",
    body: "Hello Made2Found team,\n\nI run a program and would like to talk with you.\n\nA few words about me and the program:\n[please add]\n\nBest regards",
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      { q: "Do I need a program or an organization?", a: "No. You can also support teams on your own. You create a program if you want to run formats, dates and milestones for several teams." },
      { q: "Who invites whom?", a: "Both work: teams can invite you, and you can invite teams." },
      { q: "What do I see of a team?", a: "Only what the team shares with you: work profile, team report or Founder Setup, each share on its own. The team can take it back." },
      { q: "What does it cost?", a: FREE_NOW.en },
      { q: "How do I get access?", a: "Made2Found is in closed beta. If you have an access code, you can start right away. Otherwise, ask us for one." },
      { q: "Can I delete my account again?", a: "Yes, you can delete your account at any time." },
    ],
  },

  closing: {
    title: ["Good support needs a clear frame.", "Here it is."],
    accessTitle: "Access to the beta",
    accessText: "Made2Found is in closed beta. We take founders and supporters on step by step, personally. Do you have an access code? Then you can start right away. Otherwise, write us briefly who you are and whom you support:",
    accessCta: "Request access by email",
  },
};

export function getAdvisorPageContent(locale: string) {
  return locale === "en" ? en : de;
}
