import type { TestProjectTemplateKey } from "@/features/testProject/testProjectModel";

type Localized = { de: string; en: string };
type Locale = "de" | "en";

/**
 * Gaengige Testprojekte als Startpunkt. Alles daran ist ein Vorschlag zum
 * Anpassen; "Eigenes Testprojekt" startet leer.
 *
 * Die Rechte-Fragen sind Fragen zum Besprechen. Sie ersetzen keine rechtliche
 * Pruefung und enthalten keine Klauseln. Die Hinweistexte aus der Recherche
 * (docs/research/phase-13/13.4) sind NICHT eingebaut, solange sie niemand mit
 * Fachwissen geprueft hat.
 */
type Template = {
  key: TestProjectTemplateKey;
  icon: "chat" | "link" | "search" | "rocket" | "tools" | "spark";
  tone: "violet" | "teal" | "amber" | "blue" | "green" | "pink";
  weeks: number;
  title: Localized;
  task: Localized;
  roles: Localized;
  done: readonly Localized[];
};

const l = (de: string, en: string): Localized => ({ de, en });

export const TEST_PROJECT_TEMPLATES: readonly Template[] = [
  {
    key: "interviews", icon: "chat", tone: "violet", weeks: 2,
    title: l("Kundengespräche führen", "Run customer conversations"),
    task: l("Gemeinsam zehn Gespräche mit möglichen Kundinnen und Kunden führen und die Antworten zusammentragen.", "Hold ten conversations with possible customers together and collect the answers."),
    roles: l("Eine Person führt, die andere schreibt mit, beim nächsten Gespräch wird getauscht.", "One person leads, the other takes notes, and you swap for the next conversation."),
    done: [l("Zehn Gespräche sind geführt", "Ten conversations are done"), l("Eine Seite mit dem, was sich wiederholt", "One page on what keeps coming up"), l("Gemeinsam gewählt: was als Nächstes getestet wird", "Chosen together: what to test next")],
  },
  {
    key: "landing", icon: "link", tone: "teal", weeks: 2,
    title: l("Eine Landingpage bauen", "Build a landing page"),
    task: l("Eine einfache Seite, die eine Idee erklärt und Interessierte nach ihrer E-Mail-Adresse fragt.", "A simple page that explains an idea and asks interested people for their email address."),
    roles: l("Eine Person schreibt den Text, die andere baut die Seite. Beide lesen gegen.", "One person writes the text, the other builds the page. Both proofread."),
    done: [l("Seite ist online erreichbar", "The page is online"), l("Text und Gestaltung sind von beiden abgenommen", "Both signed off the text and design"), l("Die Anmeldungen werden nach einer Woche ausgezählt", "Sign-ups are counted after one week")],
  },
  {
    key: "market", icon: "search", tone: "amber", weeks: 2,
    title: l("Markt und Wettbewerb recherchieren", "Research market and competitors"),
    task: l("Wer löst das Problem heute schon, und wie? Eine knappe Übersicht mit Quellen.", "Who solves the problem today, and how? A short overview with sources."),
    roles: l("Jede Person nimmt die Hälfte der Anbieter, am Ende wird gemeinsam zusammengeführt.", "Each person takes half of the providers, and you merge the results together at the end."),
    done: [l("Mindestens fünf Anbieter oder Behelfslösungen beschrieben", "At least five providers or workarounds described"), l("Quellen sind angegeben", "Sources are given"), l("Offene Fragen sind aufgeschrieben", "Open questions are written down")],
  },
  {
    key: "pitch", icon: "rocket", tone: "blue", weeks: 2,
    title: l("Einen Pitch zusammenstellen", "Put together a pitch"),
    task: l("Zehn Folien, die Problem, Idee und nächste Schritte erklären, und einmal laut durchsprechen.", "Ten slides that explain problem, idea and next steps, and a run-through out loud."),
    roles: l("Eine Person entwirft die Geschichte, die andere die Folien. Vorgetragen wird abwechselnd.", "One person drafts the story, the other the slides. You take turns presenting."),
    done: [l("Zehn Folien stehen", "Ten slides are ready"), l("Einmal vor einer dritten Person vorgetragen", "Presented once to a third person"), l("Rückmeldungen sind notiert", "Feedback is noted")],
  },
  {
    key: "prototype", icon: "tools", tone: "green", weeks: 4,
    title: l("Einen Klick-Prototyp bauen", "Build a clickable prototype"),
    task: l("Ein anklickbarer Entwurf, mit dem drei Menschen eine Aufgabe ausprobieren können.", "A clickable draft that three people can use to try a task."),
    roles: l("Eine Person gestaltet, die andere organisiert die Tests und moderiert.", "One person designs, the other organises and moderates the tests."),
    done: [l("Prototyp ist anklickbar", "The prototype is clickable"), l("Drei Testpersonen haben ihn benutzt", "Three test people have used it"), l("Was nicht verstanden wurde, ist aufgeschrieben", "What was not understood is written down")],
  },
  {
    key: "offer", icon: "spark", tone: "pink", weeks: 4,
    title: l("Ein Angebot testen", "Test an offer"),
    task: l("Eine Leistung zu einem festen Preis anbieten und schauen, ob sich jemand dafür entscheidet.", "Offer a service at a fixed price and see whether anyone chooses it."),
    roles: l("Eine Person spricht mit Interessierten, die andere bereitet Angebot und Auswertung vor.", "One person talks to interested people, the other prepares the offer and the review."),
    done: [l("Angebot ist formuliert", "The offer is written"), l("Mindestens fünf Personen haben es gesehen", "At least five people have seen it"), l("Entscheidungen und Absagen samt Begründung sind notiert", "Decisions and refusals, with reasons, are noted")],
  },
];

export const TEST_PROJECT_RIGHTS_QUESTIONS: readonly Localized[] = [
  l("Was entsteht, und wem gehört es? (Texte, Entwürfe, Code, Design)", "What gets created, and who does it belong to? (text, drafts, code, design)"),
  l("Darf jede Person das Ergebnis danach weiterverwenden, auch ohne die andere?", "May each person keep using the result afterwards, even without the other?"),
  l("Was bleibt vertraulich?", "What stays confidential?"),
  l("Wer spricht in der Probezeit im Namen von uns beiden mit Dritten, und wer nicht?", "Who speaks to third parties on behalf of both of us during the trial, and who does not?"),
  l("Fällt Geld an? Wer zahlt, und was passiert mit Einnahmen?", "Does money come into it? Who pays, and what happens to income?"),
];

export const TEST_PROJECT_CLOSING_QUESTIONS: readonly Localized[] = [
  l("Wie war die Zusammenarbeit im Alltag?", "What was working together like day to day?"),
  l("Wann habe ich mich gut abgestimmt gefühlt, wann nicht?", "When did I feel well aligned, and when not?"),
  l("Was hat mich überrascht?", "What surprised me?"),
  l("Was würde ich beim nächsten Mal anders machen?", "What would I do differently next time?"),
  l("Was möchte ich jetzt: weitermachen, ein Team gründen oder es lassen?", "What do I want now: carry on, found a team, or leave it?"),
];

/** Der Zwischenstand hat feste Fragen; die Datenbank speichert Frage und Antwort. */
export const TEST_PROJECT_INTERIM_QUESTIONS: readonly Localized[] = [
  l("Wie läuft die Zusammenarbeit bisher?", "How is working together going so far?"),
  l("Was klappt gut?", "What is working well?"),
  l("Was sollten wir ändern?", "What should we change?"),
];

export const localized = (text: Localized, locale: Locale) => text[locale];

export function getTestProjectTemplate(key: string | null | undefined) {
  return TEST_PROJECT_TEMPLATES.find((template) => template.key === key) ?? null;
}
