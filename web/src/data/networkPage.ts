// Oeffentliche Seite zu Connect (/netzwerk), Entwurf vom 24.11.2026.
//
// Mit Maria abgestimmt:
//   - Ueberschrift "Du siehst ein Problem? Mach es sichtbar." (Dominoeffekt: wer ein Problem bekannt macht,
//     dem kann jemand anderes eine Loesung finden)
//   - Zielgruppe: alle, die etwas suchen oder beitragen wollen; man muss kein Gruender sein
//   - Investment und Unternehmensnachfolge werden auf der oeffentlichen Seite NICHT beworben (rechtlich heikel,
//     Nachfolge ist in der App als experimentell markiert; Connect vermittelt keine Investments)
//   - nur erfundene Beispiele, Zugang mit Code, "Im Moment kostenlos"
//
// Aus der App uebernommen (messages/de/connect.json): "Bedarf trifft Beitrag", "Was siehst du, das gelöst gehört?",
// die Benachrichtigung "eine kurze Mail, höchstens wenn etwas Neues passt, ohne Namen", Kontakt immer ueber einen
// Eintrag, Blockieren und Melden. Die Sichtbarkeit "Oeffentlich" ist in der App "derzeit nicht verfuegbar": die
// Seite verspricht deshalb nur, dass Mitglieder die Eintraege sehen.

import { FREE_NOW } from "@/data/homepage";

const de = {
  seoTitle: "Connect: Du siehst ein Problem? Mach es sichtbar – Made2Found",
  seoDescription: "Bedarf trifft Beitrag: Stelle ein Gesuch, ein Angebot oder ein Problem ein, finde Menschen, Teams und Projekte und nimm Kontakt auf. Made2Found Connect, in der geschlossenen Beta. Du musst kein Gründer sein.",

  hero: {
    label: "Connect",
    title: ["Du siehst ein Problem?", "Mach es sichtbar."],
    sub: "Bedarf trifft Beitrag: Jemand anderes hat vielleicht die Lösung. Und wenn du etwas kannst oder anzubieten hast, zeig es. Du musst dafür kein Gründer sein.",
    access: "Zugang anfragen",
    price: FREE_NOW.de,
    fine: "Zugang mit Code.",
    example: "Beispiel",
  },

  features: {
    label: "Was du hier tun kannst",
    title: "Sichtbar machen. Finden. Dranbleiben.",
    post: {
      label: "Einstellen",
      title: "Etwas sichtbar machen.",
      text: "Ein Gesuch, ein Angebot oder ein Problem: Du entscheidest, was du einstellst.",
      bullets: ["Beschreib es so konkret, dass jemand ohne deinen Hintergrund versteht, worum es geht", "Du kannst es pausieren, verlängern oder als erledigt markieren", "Veröffentlichen geht mit deinem Connect-Profil"],
      windowLabel: "Beispiel des Formulars zum Einstellen eines Problems",
      bar: "Connect", barPage: "Etwas einstellen",
      kinds: ["Gesuch", "Angebot", "Problem"],
      question: "Was siehst du, das gelöst gehört?",
      hint: "Beschreib es so konkret, dass jemand ohne deinen Hintergrund versteht, worum es geht.",
      sample: "Förderanträge kosten uns zu viel Zeit. Wir suchen jemanden, der das schon einmal gemacht hat.",
      publish: "Veröffentlichen",
    },
    find: {
      label: "Finden",
      title: "Passendes finden. Kontakt aufnehmen.",
      text: "Durchsuche Gesuche, Angebote und Probleme und finde Menschen, Teams und Projekte.",
      bullets: ["Menschen, Teams und Projekte im Netzwerk", "Kontakt läuft immer über einen Eintrag, mit einer kurzen Nachricht", "Blockieren und Melden jederzeit"],
    },
    alert: {
      label: "Dranbleiben",
      title: "Du musst nicht jeden Tag nachsehen.",
      text: "Sag uns, was du suchst. Wir melden uns, wenn jemand etwas einstellt, das dazu passt.",
      bullets: ["Eine kurze Mail, höchstens wenn etwas Neues passt", "In der Mail stehen keine Namen", "Jederzeit abstellbar"],
      windowLabel: "Beispiel einer Benachrichtigungsregel",
      bar: "Connect", barPage: "Sag uns, was du suchst",
      question: "Wonach suchst du?",
      sample: "Steuerberatung",
      placeLabel: "Wo? (freiwillig)",
      place: "Leipzig",
      save: "Suche speichern",
      note: "Du bekommst eine kurze Mail, höchstens wenn etwas Neues passt. Jederzeit abstellbar.",
    },
  },

  steps: {
    label: "So startest du",
    title: "In drei Schritten loslegen.",
    items: [
      { title: "Zugang holen", text: "Mit Zugangscode, oder frag ihn bei uns an." },
      { title: "Connect-Profil anlegen", text: "Damit andere sehen, von wem ein Eintrag kommt." },
      { title: "Einstellen, suchen, Kontakt aufnehmen", text: "Fang damit an, was du suchst oder beitragen kannst." },
    ],
  },

  faq: {
    title: "Häufige Fragen",
    items: [
      { q: "Muss ich Gründer:in sein?", a: "Nein. Connect ist für alle, die etwas suchen oder beitragen wollen." },
      { q: "Wer sieht meine Einträge?", a: "Zurzeit sehen deine Einträge Mitglieder von Made2Found. Kontakt läuft immer über einen Eintrag." },
      { q: "Kann ich mich vor unerwünschten Anfragen schützen?", a: "Ja. Du kannst Personen blockieren und melden. Danach können sie dir keine neuen Anfragen oder Nachrichten mehr schicken." },
      { q: "Was kostet es?", a: FREE_NOW.de },
      { q: "Wie bekomme ich Zugang?", a: "Made2Found ist in der geschlossenen Beta. Hast du einen Zugangscode, geht es direkt los. Sonst frag ihn bei uns an." },
      { q: "Kann ich mein Konto wieder löschen?", a: "Ja, du kannst dein Konto jederzeit löschen." },
    ],
  },

  closing: {
    title: ["Dafür, dass jemand anfängt,", "braucht es nur einen Eintrag."],
    accessTitle: "Zugang zur Beta",
    accessText: "Made2Found ist in der geschlossenen Beta. Wir nehmen Menschen Schritt für Schritt persönlich auf. Hast du einen Zugangscode? Dann geht es direkt los. Sonst schreib uns kurz, wer du bist und was du suchst oder anbieten möchtest:",
    accessCta: "Zugang per E-Mail anfragen",
  },
};

const en: typeof de = {
  seoTitle: "Connect: See a problem? Make it visible – Made2Found",
  seoDescription: "Need meets contribution: post a request, an offer or a problem, find people, teams and projects and get in touch. Made2Found Connect, in closed beta. You do not need to be a founder.",

  hero: {
    label: "Connect",
    title: ["See a problem?", "Make it visible."],
    sub: "Need meets contribution: someone else may have the solution. And if you can do something or have something to offer, show it. You do not need to be a founder.",
    access: "Request access",
    price: FREE_NOW.en,
    fine: "Access with a code.",
    example: "Example",
  },

  features: {
    label: "What you can do here",
    title: "Make visible. Find. Stay in the loop.",
    post: {
      label: "Post",
      title: "Make something visible.",
      text: "A request, an offer or a problem: you decide what you post.",
      bullets: ["Describe it so concretely that someone without your background understands what it is about", "You can pause it, renew it or mark it as done", "Publishing works with your Connect profile"],
      windowLabel: "Example of the form for posting a problem",
      bar: "Connect", barPage: "Post something",
      kinds: ["Request", "Offer", "Problem"],
      question: "What do you see that needs solving?",
      hint: "Describe it so concretely that someone without your background understands what it is about.",
      sample: "Funding applications cost us too much time. We are looking for someone who has done it before.",
      publish: "Publish",
    },
    find: {
      label: "Find",
      title: "Find what fits. Get in touch.",
      text: "Browse requests, offers and problems and find people, teams and projects.",
      bullets: ["People, teams and projects in the network", "Contact always goes through a listing, with a short message", "Block and report at any time"],
    },
    alert: {
      label: "Stay in the loop",
      title: "You do not have to check every day.",
      text: "Tell us what you are looking for. We get in touch when someone posts something that fits.",
      bullets: ["A short email, at most when something new fits", "No names in the email", "Can be switched off at any time"],
      windowLabel: "Example of a notification rule",
      bar: "Connect", barPage: "Tell us what you are looking for",
      question: "What are you looking for?",
      sample: "Tax advice",
      placeLabel: "Where? (optional)",
      place: "Leipzig",
      save: "Save search",
      note: "You get a short email, at most when something new fits. Can be switched off at any time.",
    },
  },

  steps: {
    label: "How to start",
    title: "Get going in three steps.",
    items: [
      { title: "Get access", text: "With an access code, or ask us for one." },
      { title: "Create your Connect profile", text: "So others see who a listing comes from." },
      { title: "Post, search, get in touch", text: "Start with what you are looking for or can contribute." },
    ],
  },

  faq: {
    title: "Frequently asked questions",
    items: [
      { q: "Do I have to be a founder?", a: "No. Connect is for everyone who wants to look for something or contribute." },
      { q: "Who sees my listings?", a: "For now, members of Made2Found see your listings. Contact always goes through a listing." },
      { q: "Can I protect myself from unwanted requests?", a: "Yes. You can block and report people. After that they can no longer send you new requests or messages." },
      { q: "What does it cost?", a: FREE_NOW.en },
      { q: "How do I get access?", a: "Made2Found is in closed beta. If you have an access code, you can start right away. Otherwise, ask us for one." },
      { q: "Can I delete my account again?", a: "Yes, you can delete your account at any time." },
    ],
  },

  closing: {
    title: ["For someone to get started,", "all it takes is one listing."],
    accessTitle: "Access to the beta",
    accessText: "Made2Found is in closed beta. We take people on step by step, personally. Do you have an access code? Then you can start right away. Otherwise, write us briefly who you are and what you are looking for or want to offer:",
    accessCta: "Request access by email",
  },
};

export function getNetworkPageContent(locale: string) {
  return locale === "en" ? en : de;
}
