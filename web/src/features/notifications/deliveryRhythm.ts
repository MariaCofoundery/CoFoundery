/**
 * Wie Benachrichtigungen ankommen: gebuendelt, sofort oder ruhig (18.11.2026).
 *
 * Reine Regeln und Texte, ohne Datenbank. Die Datenbank entscheidet in
 * `claim_push_slot` (Fenster, Zaehlung) und `prepare_notification_digests`
 * (Morgenuebersicht); hier stehen die Namen, das Fenster und die Worte.
 *
 * GEBUENDELT HEISST: Die erste Mitteilung eines Zeitfensters kommt sofort; jede
 * weitere im selben Fenster ersetzt sie still durch eine Sammelmeldung. Was
 * zu einem anderen Zeitpunkt entsteht, kommt wieder einzeln. Das braucht keinen
 * Zeitplan - Vercel Hobby hat nur zwei, und beide sind belegt.
 *
 * AUF DEM SPERRBILDSCHIRM STEHT NIE INHALT: Die Sammelmeldung nennt nur die Zahl.
 * Dieselbe Regel wie bei jeder Mitteilung (pushDelivery.ts).
 */
export const DELIVERY_MODES = ["bundled", "instant", "quiet"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export const DEFAULT_DELIVERY_MODE: DeliveryMode = "bundled";

/** Wie lange ein Fenster nach seiner ersten Mitteilung offen bleibt. */
export const BUNDLE_WINDOW_MINUTES = 180;

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return typeof value === "string" && (DELIVERY_MODES as readonly string[]).includes(value);
}

type Locale = "de" | "en";
const loc = (locale: string): Locale => (locale === "en" ? "en" : "de");

/** Die Sammelmeldung: ersetzt still die laufende Mitteilung des Fensters. */
export function bundledPushCopy(locale: string, count: number) {
  const n = Math.max(2, Math.floor(count));
  return loc(locale) === "en"
    ? { title: `${n} new notices`, body: "Tap to see them in Made2Found." }
    : { title: `${n} neue Hinweise`, body: "Tippe, um sie in Made2Found zu sehen." };
}

/** Wohin die Sammelmeldung fuehrt: dorthin, wo die Hinweise warten. */
export const BUNDLED_PUSH_PATH = "/messages";

const KIND_LABELS: Record<string, { de: [string, string]; en: [string, string] }> = {
  contact_request: { de: ["Kontaktanfrage", "Kontaktanfragen"], en: ["contact request", "contact requests"] },
  problem_interest: { de: ["Interesse an einem Problem", "Interessen an Problemen"], en: ["interest in a problem", "interests in problems"] },
  approach_interest: { de: ["Interesse an einem Ansatz", "Interessen an Ansätzen"], en: ["interest in an approach", "interests in approaches"] },
  discovery_intro_request: { de: ["Vorstellungsanfrage", "Vorstellungsanfragen"], en: ["introduction request", "introduction requests"] },
  discovery_intro_accepted: { de: ["angenommene Vorstellung", "angenommene Vorstellungen"], en: ["accepted introduction", "accepted introductions"] },
  read_my_mind_handoff: { de: ["Übergabe in Align", "Übergaben in Align"], en: ["handover in Align", "handovers in Align"] },
  founder_in_the_wild_handoff: { de: ["Übergabe in Align", "Übergaben in Align"], en: ["handover in Align", "handovers in Align"] },
  org_task_assigned: { de: ["zugeteilte Aufgabe im Teamraum", "zugeteilte Aufgaben im Teamraum"], en: ["assigned task in the team room", "assigned tasks in the team room"] },
  org_task_comment: { de: ["Kommentar zu einer Aufgabe", "Kommentare zu Aufgaben"], en: ["comment on a task", "comments on tasks"] },
  org_task_due: { de: ["heute fällige Aufgabe", "heute fällige Aufgaben"], en: ["task due today", "tasks due today"] },
  program_task_assigned: { de: ["zugeteilte Aufgabe im Programm", "zugeteilte Aufgaben im Programm"], en: ["assigned task in the programme", "assigned tasks in the programme"] },
  program_task_comment: { de: ["Kommentar im Programm", "Kommentare im Programm"], en: ["comment in the programme", "comments in the programme"] },
  program_update_due: { de: ["fälliges Update im Programm", "fällige Updates im Programm"], en: ["programme update due", "programme updates due"] },
  program_invited: { de: ["Einladung in ein Programm", "Einladungen in Programme"], en: ["programme invitation", "programme invitations"] },
  program_review_requested: { de: ["Bitte um Durchsicht", "Bitten um Durchsicht"], en: ["review request", "review requests"] },
  program_removed: { de: ["Änderung an deinem Programm", "Änderungen an deinen Programmen"], en: ["change to your programme", "changes to your programmes"] },
  program_reward_unlocked: { de: ["freigeschaltete Auszeichnung", "freigeschaltete Auszeichnungen"], en: ["unlocked reward", "unlocked rewards"] },
  advisor_org_invited: { de: ["Einladung einer Organisation", "Einladungen von Organisationen"], en: ["organisation invitation", "organisation invitations"] },
  advisor_person_invited: { de: ["Einladung als Advisor", "Einladungen als Advisor"], en: ["advisor invitation", "advisor invitations"] },
  founder_invited: { de: ["Einladung als Founder", "Einladungen als Founder"], en: ["founder invitation", "founder invitations"] },
  connect_thanks: { de: ["Danke", "Danke"], en: ["thank-you", "thank-yous"] },
  collaboration_conversation_marker: { de: ["Gesprächspunkt", "Gesprächspunkte"], en: ["conversation point", "conversation points"] },
};

export type DigestLine = { kind: string; count: number; label: string };

/** Die Zeilen der Uebersicht: nur Art und Anzahl, nie Inhalt. Unbekannte Arten fallen weg statt leer zu stehen. */
export function digestLines(locale: string, counts: Record<string, unknown>): DigestLine[] {
  const language = loc(locale);
  // Zwei Arten, die dasselbe heissen (zwei Align-Uebergaben), stehen als eine Zeile: erst zusammenzaehlen,
  // dann Einzahl oder Mehrzahl nach der Summe waehlen.
  const merged = new Map<string, { kind: string; count: number; plural: string; singular: string }>();
  for (const [kind, raw] of Object.entries(counts)) {
    const count = typeof raw === "number" ? Math.floor(raw) : 0;
    const labels = KIND_LABELS[kind];
    if (!labels || count < 1) continue;
    const [singular, plural] = labels[language];
    const existing = merged.get(singular);
    if (existing) existing.count += count;
    else merged.set(singular, { kind, count, singular, plural });
  }
  return [...merged.values()].map((entry) => ({ kind: entry.kind, count: entry.count, label: entry.count === 1 ? entry.singular : entry.plural }));

}

export function digestTotal(lines: DigestLine[]) {
  return lines.reduce((sum, line) => sum + line.count, 0);
}

export function digestCopy(locale: string, total: number) {
  if (loc(locale) === "en") {
    return {
      htmlLang: "en",
      subject: total === 1 ? "1 thing is waiting for you" : `${total} things are waiting for you`,
      preheader: "A short overview of what arrived since yesterday morning.",
      eyebrow: "Made2Found",
      headline: "Good morning, this is waiting for you",
      intro: "This arrived since yesterday morning. What is in it, you see in Made2Found.",
      cta: "Open Made2Found",
      note: "You only get this overview when something is waiting.",
      changeRhythm: "Change rhythm",
      fallback: "If the button does not work, copy this address into your browser:",
      privacy: "Privacy",
    };
  }
  return {
    htmlLang: "de",
    subject: total === 1 ? "1 Ding wartet auf dich" : `${total} Dinge warten auf dich`,
    preheader: "Eine kurze Übersicht, was seit gestern Morgen eingegangen ist.",
    eyebrow: "Made2Found",
    headline: "Guten Morgen, das wartet auf dich",
    intro: "Seit gestern Morgen ist Folgendes bei dir eingegangen. Was darin steht, siehst du in Made2Found.",
    cta: "In Made2Found ansehen",
    note: "Du bekommst diese Übersicht nur, wenn etwas wartet.",
    changeRhythm: "Rhythmus ändern",
    fallback: "Falls der Knopf nicht funktioniert, kopiere diese Adresse in deinen Browser:",
    privacy: "Datenschutz",
  };
}
