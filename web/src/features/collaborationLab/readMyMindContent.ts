export type ReadMyMindLocale = "de" | "en";
export type ReadMyMindResponseFormat = "single_choice" | "multi_choice";
export type ReadMyMindNeedMode = "none" | "required";

type LocalizedText = Record<ReadMyMindLocale, string>;

export type ReadMyMindChoice = {
  key: string;
  label: LocalizedText;
};

export type ReadMyMindResponseContract = {
  format: ReadMyMindResponseFormat;
  minSelections: number;
  maxSelections: number;
  choices: readonly ReadMyMindChoice[];
};

export type ReadMyMindPrompt = {
  key: string;
  version: 1;
  position: number;
  title: LocalizedText;
  selfQuestion: LocalizedText;
  guessQuestion: LocalizedText;
  selfGuess: ReadMyMindResponseContract;
  needMode: ReadMyMindNeedMode;
  needQuestion?: LocalizedText;
  need?: ReadMyMindResponseContract;
};

export type ReadMyMindPack = {
  experienceKey: "read_my_mind";
  key: string;
  version: 1;
  title: LocalizedText;
  prompts: readonly ReadMyMindPrompt[];
};

const choice = (key: string, de: string, en: string): ReadMyMindChoice => ({
  key,
  label: { de, en },
});

const single = (...choices: ReadMyMindChoice[]): ReadMyMindResponseContract => ({
  format: "single_choice",
  minSelections: 1,
  maxSelections: 1,
  choices,
});

const prompt = (
  position: number,
  key: string,
  deTitle: string,
  enTitle: string,
  deQuestion: string,
  enQuestion: string,
  selfGuess: ReadMyMindResponseContract,
  need?: { question: LocalizedText; contract: ReadMyMindResponseContract },
): ReadMyMindPrompt => ({
  key,
  version: 1,
  position,
  title: { de: deTitle, en: enTitle },
  selfQuestion: { de: deQuestion, en: enQuestion },
  guessQuestion: {
    de: "Wie würde {target} auf diese Frage antworten?",
    en: "How would {target} answer this question?",
  },
  selfGuess,
  needMode: need ? "required" : "none",
  ...(need ? { needQuestion: need.question, need: need.contract } : {}),
});

const need = {
  updates: {
    question: { de: "Was ist dir bei Updates von {target} am wichtigsten?", en: "What matters most to you in updates from {target}?" },
    contract: single(choice("space", "Freiraum", "Space"), choice("predictability", "Verlässlichkeit", "Predictability"), choice("connection", "Verbindung", "Connection")),
  },
  focus: {
    question: { de: "Was brauchst du von {target}, wenn der Fokus kurz unterbrochen wird?", en: "What do you need from {target} when focus is interrupted briefly?" },
    contract: single(choice("autonomy", "Eigenständigkeit", "Autonomy"), choice("short_notice", "Ein kurzes Signal", "A short heads-up"), choice("clear_return", "Einen klaren Rückkehrpunkt", "A clear return point")),
  },
  badDay: {
    question: { de: "Was brauchst du an so einem Arbeitstag am ehesten von {target}?", en: "What would you most need from {target} on a workday like that?" },
    contract: single(choice("capacity", "Weniger zusätzliche Abstimmung", "Less additional coordination"), choice("clarity", "Klarheit über Prioritäten", "Clarity on priorities"), choice("practical_support", "Konkrete Unterstützung", "Concrete support")),
  },
  involve: {
    question: { de: "Was brauchst du dabei von {target}?", en: "What do you need from {target} in that situation?" },
    contract: single(choice("autonomy", "Eigenständigkeit", "Autonomy"), choice("early_context", "Frühen Kontext", "Early context"), choice("shared_decision", "Eine gemeinsame Entscheidung", "A shared decision")),
  },
  slower: {
    question: { de: "Was brauchst du von {target}, wenn du selbst länger brauchst?", en: "What do you need from {target} when you are the one taking longer?" },
    contract: single(choice("trust", "Vertrauen", "Trust"), choice("transparency", "Transparenz", "Transparency"), choice("support", "Unterstützung", "Support")),
  },
  deadline: {
    question: { de: "Was brauchst du von {target}, wenn eine Deadline wackelt?", en: "What do you need from {target} when a deadline is at risk?" },
    contract: single(choice("early_signal", "Ein frühes Signal", "An early signal"), choice("shared_tradeoff", "Eine gemeinsame Abwägung", "A shared trade-off"), choice("realistic_plan", "Einen realistischen Plan", "A realistic plan")),
  },
  feedback: {
    question: { de: "Was brauchst du von {target}, damit du kritisches Feedback gut aufnehmen kannst?", en: "What do you need from {target} to take in critical feedback well?" },
    contract: single(choice("clarity", "Klarheit", "Clarity"), choice("respect", "Respekt", "Respect"), choice("privacy", "Einen geschützten Rahmen", "A private setting"), choice("next_step", "Einen nächsten Schritt", "A next step")),
  },
  repair: {
    question: { de: "Was brauchst du nach einem Streit zuerst von {target}?", en: "What do you need first from {target} after an argument?" },
    contract: single(choice("space", "Raum", "Space"), choice("repair", "Wieder in Kontakt kommen", "Reconnection"), choice("structure", "Struktur", "Structure")),
  },
  boundary: {
    question: { de: "Was brauchst du von {target}, wenn du gerade nicht sprechen kannst?", en: "What do you need from {target} when you cannot talk right then?" },
    contract: single(choice("space", "Raum", "Space"), choice("time_commitment", "Einen Zeitpunkt für später", "A time to return to it"), choice("brief_context", "Kurzen Kontext", "Brief context")),
  },
} as const;

export const READ_MY_MIND_PACKS: readonly ReadMyMindPack[] = [
  {
    experienceKey: "read_my_mind",
    key: "easy_start",
    version: 1,
    title: { de: "Easy Start", en: "Easy Start" },
    prompts: [
      prompt(0, "silent_day", "Der stille Tag", "The quiet day", "Wie passt ein Arbeitstag mit sehr wenig Austausch zu deiner Arbeitsweise?", "How does a workday with very little contact fit your way of working?", single(choice("quiet_works_well", "Das funktioniert gut für mich", "That works well for me"), choice("check_in_once", "Ein kurzer Check-in wäre hilfreich", "One short check-in would help"), choice("want_regular_contact", "Ich arbeite lieber mit regelmäßigem Austausch", "I prefer working with regular contact"))),
      prompt(1, "update_frequency", "Wie viele Updates?", "How many updates?", "Wie hältst du andere im Arbeitsalltag normalerweise auf dem Laufenden?", "How do you normally keep others updated during day-to-day work?", single(choice("only_when_needed", "Wenn es etwas Relevantes gibt", "When something relevant comes up"), choice("one_or_two_fixed", "Mit ein oder zwei festen Updates", "With one or two fixed updates"), choice("short_daily", "Mit einem kurzen täglichen Update", "With a brief daily update")), need.updates),
      prompt(2, "please_do_not_ask", "Bitte nicht fragen", "Please don't ask", "Wobei möchtest du nicht ständig nach einem Zwischenstand gefragt werden?", "What would you rather not be repeatedly asked for updates about?", { format: "multi_choice", minSelections: 1, maxSelections: 2, choices: [choice("early_draft", "Frühe Entwürfe", "Early drafts"), choice("focus_time", "Arbeit in Fokuszeit", "Work during focus time"), choice("personal_context", "Persönlicher Kontext", "Personal context"), choice("every_small_decision", "Jede kleine Entscheidung", "Every small decision")] }),
      prompt(3, "brief_focus_break", "Kurz raus aus dem Fokus?", "Stepping away briefly?", "Was ist dir wichtig, wenn du kurz aus der gemeinsamen Arbeit aussteigst?", "What matters when you briefly step away from shared work?", single(choice("no_message_needed", "Kein Hinweis nötig", "No message needed"), choice("short_signal", "Ein kurzes Signal", "A short signal"), choice("agree_return_time", "Einen Rückkehrzeitpunkt nennen", "Name a return time")), need.focus),
      prompt(4, "really_bad_workday", "Ein richtig schlechter Arbeitstag", "A really bad workday", "Was entlastet deine Arbeit zuerst an einem richtig schlechten Arbeitstag?", "What would ease your work first on a really bad workday?", single(choice("reduce_coordination", "Zusätzliche Abstimmung reduzieren", "Reduce additional coordination"), choice("sort_priorities", "Prioritäten gemeinsam sortieren", "Sort priorities together"), choice("take_concrete_task", "Eine konkrete Aufgabe abgeben", "Hand off one concrete task")), need.badDay),
    ],
  },
  {
    experienceKey: "read_my_mind",
    key: "how_we_work",
    version: 1,
    title: { de: "So arbeiten wir", en: "How We Work" },
    prompts: [
      prompt(0, "just_do_it", "Mach einfach", "Just do it", "Wie gehst du am liebsten vor, wenn eine Aufgabe ohne weitere Abstimmung starten könnte?", "How would you prefer to proceed when a task could start without further alignment?", single(choice("act_independently", "Eigenständig handeln", "Act independently"), choice("quick_alignment", "Kurz abstimmen", "Align briefly"), choice("decide_together", "Gemeinsam entscheiden", "Decide together"))),
      prompt(1, "when_to_involve_you", "Wann hole ich dich dazu?", "When should I involve you?", "Wann möchtest du in eine Entscheidung einbezogen werden?", "When would you like to be involved in a decision?", single(choice("at_impact", "Wenn sie meinen Bereich betrifft", "When it affects my area"), choice("before_commitment", "Bevor wir uns festlegen", "Before we commit"), choice("from_the_start", "Von Anfang an", "From the start")), need.involve),
      prompt(2, "good_enough", "Wann ist etwas gut genug?", "When is it good enough?", "Wann ist ein Arbeitsergebnis für dich bereit für den nächsten Schritt?", "When is a piece of work ready for the next step?", single(choice("usable_now", "Sobald es für den nächsten Schritt nutzbar ist", "As soon as it is usable for the next step"), choice("agreed_criteria_met", "Wenn die vorher vereinbarten Kriterien erfüllt sind", "When the criteria agreed beforehand are met"), choice("highly_polished", "Wenn es weitgehend ausgearbeitet ist", "When it is largely polished"))),
      prompt(3, "slower_than_expected", "Du bist langsamer als gedacht", "You're slower than expected", "Was ist dein bevorzugter erster Schritt, wenn jemand länger braucht als erwartet?", "What is your preferred first step when someone takes longer than expected?", single(choice("name_expectation", "Die eigene Erwartung klar benennen", "State your expectation clearly"), choice("ask_about_blockers", "Nach möglichen Hindernissen fragen", "Ask about possible blockers"), choice("adjust_plan", "Den gemeinsamen Plan anpassen", "Adjust the shared plan")), need.slower),
      prompt(4, "reopen_decision", "Entscheidung nochmal aufmachen?", "Reopen the decision?", "Wann sollte eine getroffene Entscheidung noch einmal geöffnet werden?", "When should a decision be reopened?", single(choice("new_facts_only", "Nur bei neuen Fakten", "Only with new facts"), choice("important_concern", "Bei einem wichtigen Einwand", "For an important concern"), choice("always_possible", "Wenn jemand sie ernsthaft hinterfragt", "When someone seriously questions it"))),
    ],
  },
  {
    experienceKey: "read_my_mind",
    key: "when_things_get_tricky",
    version: 1,
    title: { de: "Wenn es schwierig wird", en: "When Things Get Tricky" },
    prompts: [
      prompt(0, "shaky_deadline", "Die wackelnde Deadline", "The shaky deadline", "Was ist dein bevorzugter erster Schritt, wenn eine Deadline wackelt?", "What is your preferred first step when a deadline is at risk?", single(choice("reduce_scope", "Umfang reduzieren", "Reduce scope"), choice("move_date", "Termin verschieben", "Move the date"), choice("ask_for_help", "Unterstützung holen", "Ask for help")), need.deadline),
      prompt(1, "tell_me_it_is_not_good", "Sag mir, dass es nicht gut ist", "Tell me it isn't good", "Wie möchtest du kritisches Feedback am liebsten hören?", "How would you prefer to hear critical feedback?", single(choice("directly", "Direkt und knapp", "Directly and briefly"), choice("with_context", "Mit Begründung und Kontext", "With reasoning and context"), choice("privately", "In einem geschützten Gespräch", "In a private conversation"), choice("with_alternative", "Mit einem konkreten Alternativvorschlag", "With a concrete alternative")), need.feedback),
      prompt(2, "after_the_argument", "Nach dem Streit", "After the argument", "Wie möchtest du nach einem Streit wieder ins Gespräch kommen?", "How would you like to reconnect after an argument?", single(choice("pause_then_talk", "Erst Pause, dann sprechen", "Pause, then talk"), choice("talk_soon", "Möglichst bald sprechen", "Talk soon"), choice("write_first", "Erst schriftlich sortieren", "Write first")), need.repair),
      prompt(3, "not_now", "Nicht jetzt!", "Not now!", "Wie sollte ein 'nicht jetzt' in einer angespannten Situation behandelt werden?", "How should a 'not now' be handled in a tense situation?", single(choice("respect_boundary", "Grenze respektieren", "Respect the boundary"), choice("ask_when_later", "Nach einem späteren Zeitpunkt fragen", "Ask for a later time"), choice("briefly_name_issue", "Das Thema kurz benennen", "Briefly name the issue")), need.boundary),
      prompt(4, "disagreeing_before_customer", "Uneinig vor dem Kunden", "Disagreeing before a customer", "Wie möchtest du mit Uneinigkeit kurz vor einem Kundentermin umgehen?", "How would you handle disagreement just before a customer meeting?", single(choice("one_leads", "Eine Person vertritt die vorläufige Linie", "One person presents the provisional position"), choice("brief_internal_pause", "Eine kurze interne Abstimmung einschieben", "Take a brief internal alignment break"), choice("present_shared_minimum", "Nur das bereits Gemeinsame vertreten", "Present only what is already shared"))),
    ],
  },
] as const;

export function getReadMyMindPack(packKey: string, packVersion: number): ReadMyMindPack | null {
  return READ_MY_MIND_PACKS.find((pack) => pack.key === packKey && pack.version === packVersion) ?? null;
}
