export type FounderInTheWildLocale = "de" | "en";
type LocalizedText = Record<FounderInTheWildLocale, string>;

export type FounderInTheWildChoice = { key: string; label: LocalizedText };
export type FounderInTheWildScenario = {
  key: string;
  version: 1;
  position: number;
  title: LocalizedText;
  situation: LocalizedText;
  question: LocalizedText;
  moves: readonly FounderInTheWildChoice[];
  matters: readonly FounderInTheWildChoice[];
  needs: readonly FounderInTheWildChoice[];
};

export type FounderInTheWildResponseType = "move" | "matters" | "need" | "guess";

const choice = (key: string, de: string, en: string): FounderInTheWildChoice => ({ key, label: { de, en } });

/**
 * Das Raten gehoert zu einem PACK, nicht zum Spiel.
 *
 * Read My Mind hat es von Anfang an: Man antwortet fuer sich und raet dann,
 * wie der andere antwortet. Das ist der Moment, in dem etwas passiert - und
 * in den Drucksituationen hier ist er staerker als in den Alltagsfragen.
 *
 * Warum nicht nachtraeglich in "Unter Druck":
 *   Die Vollstaendigkeit einer Runde ergibt sich in der Datenbank aus den
 *   Antwortvertraegen des Packs (is_founder_in_the_wild_round_answer_complete).
 *   Ein vierter Vertrag im bestehenden Pack haette JEDE laufende und jede
 *   abgeschlossene Runde schlagartig unvollstaendig gemacht.
 *
 *   Neue Packs tragen es deshalb von Anfang an, das alte bleibt, wie es ist.
 */
export type FounderInTheWildPack = {
  experienceKey: "founder_in_the_wild";
  key: string;
  version: 1;
  title: LocalizedText;
  description: LocalizedText;
  /** Ob in diesem Pack zusaetzlich geraten wird, wie der andere entscheidet. */
  hasGuess: boolean;
  scenarios: readonly FounderInTheWildScenario[];
};

const UNDER_PRESSURE: FounderInTheWildPack = {
  experienceKey: "founder_in_the_wild",
  key: "under_pressure_v1",
  version: 1,
  title: { de: "Unter Druck", en: "Under Pressure" },
  description: {
    de: "Fünf Situationen, in denen es schnell gehen muss: Investoren, Kunden, Runway, gebrochene Zusagen, ein Pivot.",
    en: "Five situations where things move fast: investors, customers, runway, broken commitments, a pivot.",
  },
  hasGuess: false,
  scenarios: [
    {
      key: "pitch_shifts", version: 1, position: 0,
      title: { de: "Der Pitch kippt", en: "The pitch shifts" },
      situation: { de: "Ihr sitzt in einem wichtigen Investorengespräch. Dein Co-Founder beschreibt plötzlich eine strategische Richtung, von der du dachtest, dass ihr sie längst verworfen habt. Der Investor fragt interessiert nach.", en: "You are in an important investor meeting. Your co-founder suddenly describes a strategic direction you thought you had long since ruled out. The investor asks for more details." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("clarify_shared_position", "Ich greife direkt ein und stelle unsere bisherige gemeinsame Position klar.", "I step in directly and clarify the position we had previously agreed."), choice("continue_then_private", "Ich lasse das Gespräch weiterlaufen und spreche es direkt danach unter vier Augen an.", "I let the conversation continue and address it privately right afterwards."), choice("ask_open_question", "Ich stelle im Gespräch eine offene Rückfrage, damit wir die Position gemeinsam präzisieren können.", "I ask an open question in the meeting so we can clarify the position together."), choice("explore_direction", "Ich gehe zunächst mit und kläre später, ob die Richtung vielleicht doch interessant ist.", "I go along for now and explore later whether the direction might be worth pursuing after all.")],
      matters: [choice("external_alignment", "nach außen geschlossen auftreten", "presenting a united front"), choice("honesty", "ehrlich bleiben", "staying honest"), choice("speed", "schnell reagieren können", "being able to react quickly"), choice("shared_decision", "gemeinsam entscheiden", "deciding together"), choice("openness", "neue Möglichkeiten offenhalten", "keeping new possibilities open")],
      needs: [choice("include_me_now", "mich sofort einbeziehen", "involve me immediately"), choice("stay_calm", "erst einmal Ruhe bewahren", "stay calm at first"), choice("open_disagreement", "offen widersprechen dürfen", "allow open disagreement"), choice("take_responsibility", "Verantwortung übernehmen", "take responsibility"), choice("reliable_follow_up", "das Thema danach zuverlässig aufgreifen", "reliably follow up afterwards")],
    },
    {
      key: "customer_by_friday", version: 1, position: 1,
      title: { de: "Der Kunde will es bis Freitag", en: "The customer wants it by Friday" },
      situation: { de: "Ein wichtiger potenzieller Kunde signalisiert einen attraktiven Auftrag. Dafür möchte er bis Freitag eine zusätzliche Lösung sehen, die nicht in eurer aktuellen Planung steckt. Das Team ist bereits gut ausgelastet.", en: "An important potential customer signals an attractive opportunity. They want to see an additional solution by Friday that is not in your current plan. The team is already working near capacity." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("reprioritize", "Ich priorisiere kurzfristig um und verfolge die Chance.", "I reprioritize in the short term and pursue the opportunity."), choice("negotiate_scope", "Ich verhandle den Umfang und biete eine kleinere Lösung an.", "I negotiate the scope and offer a smaller solution."), choice("protect_roadmap", "Ich schütze die aktuelle Roadmap und lehne die Zusatzlösung ab.", "I protect the current roadmap and decline the additional solution."), choice("clarify_commitment", "Ich kläre zuerst Bedingungen und Verbindlichkeit des Kunden, bevor wir umpriorisieren.", "I first clarify the customer's conditions and commitment before we reprioritize.")],
      matters: [choice("revenue_opportunity", "Umsatzchance", "revenue opportunity"), choice("focus", "Fokus", "focus"), choice("team_reliability", "Verlässlichkeit gegenüber dem Team", "reliability toward the team"), choice("speed", "Geschwindigkeit", "speed"), choice("firm_commitment", "belastbare Zusage", "a firm commitment")],
      needs: [choice("decide_quickly", "schnell mitentscheiden", "help decide quickly"), choice("protect_boundaries", "Grenzen schützen", "protect boundaries"), choice("explore_opportunity", "Chancen offen prüfen", "explore opportunities openly"), choice("take_responsibility", "klare Verantwortung übernehmen", "take clear responsibility"), choice("consider_team", "Auswirkungen aufs Team mitdenken", "consider the impact on the team")],
    },
    {
      key: "four_months_runway", version: 1, position: 2,
      title: { de: "Vier Monate Runway", en: "Four months of runway" },
      situation: { de: "Eine erwartete Finanzierung verzögert sich. Nach eurem aktuellen Plan reicht der finanzielle Spielraum noch ungefähr vier Monate.", en: "Expected funding is delayed. Under your current plan, your financial runway will last roughly four more months." },
      question: { de: "Worauf würdest du jetzt zuerst Energie legen?", en: "Where would you focus your energy first?" },
      moves: [choice("reduce_costs", "Kosten früh reduzieren.", "Reduce costs early."), choice("prioritize_sales", "Umsatz und Sales maximal priorisieren.", "Give revenue and sales maximum priority."), choice("intensify_fundraising", "Finanzierung und Fundraising intensivieren.", "Intensify financing and fundraising efforts."), choice("observe_then_decide", "Eine kurze Beobachtungsphase festlegen und dann anhand neuer Daten entscheiden.", "Set a short observation period, then decide using new data.")],
      matters: [choice("security", "Sicherheit", "security"), choice("momentum", "Momentum", "momentum"), choice("agency", "Handlungsfähigkeit", "ability to act"), choice("protect_team", "Team schützen", "protecting the team"), choice("keep_options_open", "Optionen offenhalten", "keeping options open")],
      needs: [choice("share_numbers", "Zahlen offen teilen", "share the numbers openly"), choice("raise_hard_choices", "früh schwierige Entscheidungen ansprechen", "raise difficult decisions early"), choice("stay_calm", "Ruhe bewahren", "stay calm"), choice("take_position", "klar Position beziehen", "take a clear position"), choice("carry_together", "Entscheidung gemeinsam tragen", "carry the decision together")],
    },
    {
      key: "commitment_missed", version: 1, position: 3,
      title: { de: "Die Zusage hält nicht", en: "The commitment slips" },
      situation: { de: "Dein Co-Founder hat zum zweiten Mal einen wichtigen vereinbarten Beitrag nicht zum geplanten Zeitpunkt geliefert. Morgen steht ein wichtiges externes Meeting an.", en: "For the second time, your co-founder has not delivered an important agreed contribution on schedule. An important external meeting is tomorrow." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("rescue_together", "Ich versuche, den Beitrag kurzfristig gemeinsam zu retten.", "I try to rescue the contribution together at short notice."), choice("leave_responsibility", "Ich lasse die Verantwortung beim Co-Founder und konzentriere mich auf meinen Teil.", "I leave responsibility with my co-founder and focus on my own part."), choice("address_now", "Ich spreche die wiederholte Zusage sofort grundsätzlich an.", "I address the repeated missed commitment directly now."), choice("secure_then_clarify", "Ich sichere zuerst den äußeren Termin und kläre das Thema danach strukturiert.", "I secure the external meeting first and address the issue in a structured way afterwards.")],
      matters: [choice("reliability", "Verlässlichkeit", "reliability"), choice("mutual_support", "gegenseitige Unterstützung", "mutual support"), choice("responsibility", "Verantwortung", "responsibility"), choice("external_impact", "Außenwirkung", "external impact"), choice("understand_causes", "Ursachen verstehen", "understanding the causes")],
      needs: [choice("signal_early", "früh Bescheid geben", "give an early heads-up"), choice("take_responsibility", "Verantwortung übernehmen", "take responsibility"), choice("accept_support", "Unterstützung annehmen", "accept support"), choice("address_directly", "Problem direkt ansprechen", "address the problem directly"), choice("new_commitment", "konkrete neue Zusage machen", "make a concrete new commitment")],
    },
    {
      key: "pivot_pull", version: 1, position: 4,
      title: { de: "Der Pivot zieht", en: "The pivot gains traction" },
      situation: { de: "Ein unerwarteter Anwendungsfall bekommt deutlich stärkere Resonanz als euer ursprünglicher Ansatz. Ihn konsequent zu verfolgen würde euch strategisch in eine andere Richtung führen.", en: "An unexpected use case is getting significantly stronger traction than your original approach. Pursuing it consistently would take you in a different strategic direction." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("prioritize_new_path", "Ich priorisiere den neuen Pfad schnell.", "I quickly prioritize the new path."), choice("limited_experiment", "Ich starte ein klar begrenztes Experiment.", "I start a clearly limited experiment."), choice("protect_core", "Ich schütze zunächst das Kernprodukt.", "I protect the core product for now."), choice("criteria_deadline", "Ich setze feste Kriterien und eine Deadline für eine gemeinsame Pivot-Entscheidung.", "I set clear criteria and a deadline for a shared pivot decision.")],
      matters: [choice("focus", "Fokus", "focus"), choice("learning", "Lernfähigkeit", "ability to learn"), choice("speed", "Geschwindigkeit", "speed"), choice("shared_vision", "gemeinsame Vision", "shared vision"), choice("evidence", "Evidenz", "evidence")],
      needs: [choice("open_to_change", "offen für Richtungswechsel sein", "be open to changing direction"), choice("defend_vision", "bestehende Vision verteidigen", "defend the existing vision"), choice("use_data", "mit Daten argumentieren", "argue with data"), choice("hold_uncertainty", "Unsicherheit aushalten", "tolerate uncertainty"), choice("commit_to_decision", "Entscheidung verbindlich mittragen", "commit to carrying the decision")],
    },
  ] as const,
};

/**
 * Das zweite Pack: Situationen, die nicht das Geschaeft pruefen, sondern die
 * Beziehung.
 *
 * "Unter Druck" fragt, wie ihr unter Zeitdruck entscheidet. Hier geht es um
 * die Faelle, in denen einer von euch etwas will, das dem anderen wehtut -
 * ungleicher Einsatz, ein Anteil, der sich falsch anfuehlt, ein Angebot von
 * aussen. Das sind die Gespraeche, die Teams vermeiden, bis es zu spaet ist.
 */
const WHEN_IT_GETS_PERSONAL: FounderInTheWildPack = {
  experienceKey: "founder_in_the_wild",
  key: "when_it_gets_personal_v1",
  version: 1,
  title: { de: "Wenn es persönlich wird", en: "When It Gets Personal" },
  description: {
    de: "Fünf Situationen, in denen nicht das Geschäft auf dem Spiel steht, sondern ihr. Hier ratet ihr zusätzlich, wie der andere entscheiden würde.",
    en: "Five situations where it isn't the business at stake, but the two of you. Here you also guess how the other one would decide.",
  },
  hasGuess: true,
  scenarios: [
    {
      key: "uneven_effort", version: 1, position: 0,
      title: { de: "Nicht mehr die gleiche Menge", en: "No longer the same amount" },
      situation: { de: "Seit Wochen arbeitest du deutlich mehr als dein Co-Founder. Nichts davon war abgesprochen, es hat sich so ergeben. Bisher hat keiner von euch es angesprochen.", en: "For weeks you have been working noticeably more than your co-founder. None of it was agreed, it just turned out that way. Neither of you has raised it so far." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("name_it_directly", "Ich spreche es direkt an, auch wenn es unangenehm wird.", "I raise it directly, even if it gets uncomfortable."), choice("wait_and_see", "Ich warte noch ab – vielleicht ist es nur eine Phase.", "I wait a bit longer – it might just be a phase."), choice("rebalance_tasks", "Ich schlage vor, die Aufgaben neu zu verteilen, ohne über Schuld zu reden.", "I suggest redistributing the work without making it about blame."), choice("ask_whats_going_on", "Ich frage zuerst, wie es ihm oder ihr gerade überhaupt geht.", "I first ask how they are actually doing right now.")],
      matters: [choice("fairness", "Fairness", "fairness"), choice("not_hurting", "niemanden verletzen", "not hurting anyone"), choice("clarity", "Klarheit", "clarity"), choice("sustainability", "dass ich das durchhalte", "being able to keep this up"), choice("understanding_first", "erst verstehen, dann bewerten", "understanding before judging")],
      needs: [choice("say_it_early", "so etwas früh sagen", "say something like this early"), choice("hear_it_without_defense", "es hören können, ohne sich zu verteidigen", "hear it without getting defensive"), choice("propose_a_fix", "einen konkreten Vorschlag machen", "come with a concrete proposal"), choice("admit_limits", "eigene Grenzen zugeben", "admit your own limits"), choice("check_in_regularly", "regelmäßig danach fragen", "check in on it regularly")],
    },
    {
      key: "outside_offer", version: 1, position: 1,
      title: { de: "Das Angebot von außen", en: "The offer from outside" },
      situation: { de: "Dein Co-Founder erzählt dir beiläufig, dass er ein sehr gutes Jobangebot bekommen hat. Er sagt, er habe noch nicht entschieden.", en: "Your co-founder mentions in passing that they have received a very good job offer. They say they haven't decided yet." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("ask_what_appeals", "Ich frage, was ihn daran reizt.", "I ask what appeals to them about it."), choice("make_the_case", "Ich mache deutlich, was wir hier gemeinsam aufbauen.", "I make the case for what we are building here together."), choice("clarify_timeline", "Ich frage nach, bis wann er sich entscheiden muss.", "I ask by when they need to decide."), choice("give_space", "Ich sage erstmal wenig und lasse ihm Raum.", "I say little for now and give them space.")],
      matters: [choice("honesty_about_doubt", "dass Zweifel gesagt werden dürfen", "that doubts can be spoken"), choice("planning_security", "Planungssicherheit", "being able to plan"), choice("his_freedom", "seine Freiheit", "their freedom"), choice("shared_future", "die gemeinsame Zukunft", "the shared future"), choice("no_pressure", "kein Druck", "no pressure")],
      needs: [choice("tell_me_honestly", "mir ehrlich sagen, wie es steht", "tell me honestly where things stand"), choice("decide_in_time", "rechtzeitig entscheiden", "decide in good time"), choice("not_decide_alone", "es nicht allein mit sich ausmachen", "not work it out entirely alone"), choice("respect_my_planning", "meine Planung mitdenken", "consider what it means for my planning"), choice("stay_open", "offen bleiben für ein Gespräch", "stay open for a conversation")],
    },
    {
      key: "equity_feels_wrong", version: 1, position: 2,
      title: { de: "Der Anteil fühlt sich falsch an", en: "The split feels wrong" },
      situation: { de: "Die Anteile habt ihr früh aufgeteilt. Inzwischen hat sich verschoben, wer was einbringt – und für einen von euch fühlt sich die Aufteilung nicht mehr richtig an.", en: "You split the equity early on. Since then, who contributes what has shifted – and for one of you the split no longer feels right." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("reopen_the_split", "Ich schlage vor, die Aufteilung noch einmal anzuschauen.", "I suggest looking at the split again."), choice("stand_by_agreement", "Ich stehe zu dem, was wir vereinbart haben.", "I stand by what we agreed."), choice("separate_now_from_then", "Ich trenne die Frage: Was war damals fair, was ist es heute?", "I separate the question: what was fair then, what is fair now?"), choice("bring_in_third_party", "Ich hole jemanden Drittes dazu, der moderiert.", "I bring in a third person to moderate.")],
      matters: [choice("keeping_agreements", "dass Vereinbarungen halten", "that agreements hold"), choice("current_fairness", "dass es sich heute fair anfühlt", "that it feels fair today"), choice("not_losing_trust", "kein Vertrauen verlieren", "not losing trust"), choice("saying_it_out_loud", "dass es überhaupt gesagt wird", "that it gets said at all"), choice("clear_rules", "klare Regeln", "clear rules")],
      needs: [choice("raise_it_not_swallow", "es ansprechen statt schlucken", "raise it instead of swallowing it"), choice("listen_without_deal", "zuhören, ohne sofort zu verhandeln", "listen without immediately negotiating"), choice("stay_factual", "sachlich bleiben", "stay factual"), choice("accept_a_no", "ein Nein aushalten können", "be able to accept a no"), choice("write_it_down", "das Ergebnis festhalten", "put the outcome in writing")],
    },
    {
      key: "decided_without_me", version: 1, position: 3,
      title: { de: "Entschieden ohne mich", en: "Decided without me" },
      situation: { de: "Dein Co-Founder hat eine Entscheidung getroffen, die klar in euren gemeinsamen Bereich fällt – ohne dich zu fragen. Nach außen ist sie schon kommuniziert.", en: "Your co-founder made a decision that clearly falls in your shared territory – without asking you. It has already been communicated externally." },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("say_it_now", "Ich sage sofort, dass mich das übergeht.", "I say right away that this went over my head."), choice("fix_outward_first", "Ich stelle erst nach außen den Rücken frei und rede danach.", "I cover us externally first and talk about it afterwards."), choice("ask_why_alone", "Ich frage, warum er das allein entschieden hat.", "I ask why they decided it alone."), choice("define_boundaries", "Ich schlage vor, festzulegen, was allein entschieden werden darf.", "I suggest defining what may be decided alone.")],
      matters: [choice("being_included", "einbezogen sein", "being included"), choice("speed_matters_too", "dass Dinge vorangehen", "that things keep moving"), choice("outward_unity", "nach außen geschlossen bleiben", "staying united externally"), choice("trust", "Vertrauen", "trust"), choice("clear_mandate", "klare Zuständigkeiten", "clear mandates")],
      needs: [choice("ask_me_first", "mich vorher fragen", "ask me first"), choice("admit_the_miss", "zugeben, wenn es zu weit ging", "admit when it went too far"), choice("not_make_it_big", "es nicht größer machen als es ist", "not blow it out of proportion"), choice("agree_on_rules", "gemeinsam Regeln festlegen", "agree on rules together"), choice("trust_my_judgement", "meinem Urteil vertrauen", "trust my judgement")],
    },
    {
      key: "the_low_point", version: 1, position: 4,
      title: { de: "Der Tiefpunkt", en: "The low point" },
      situation: { de: "Ein wichtiger Kunde ist abgesprungen, das Produkt kommt nicht voran, und ihr sitzt abends zu zweit da. Einer von euch sagt: „Ich weiß nicht, ob das noch gut geht.“", en: "An important customer has walked away, the product isn't moving, and the two of you are sitting there in the evening. One of you says: \"I don't know if this is going to work out.\"" },
      question: { de: "Was wäre dein erster Impuls?", en: "What would your first impulse be?" },
      moves: [choice("take_it_seriously", "Ich nehme den Satz ernst und frage nach.", "I take the sentence seriously and ask what they mean."), choice("steady_the_ship", "Ich versuche, wieder Zuversicht reinzubringen.", "I try to bring some confidence back into the room."), choice("get_concrete", "Ich werde konkret: Was genau müsste sich ändern?", "I get concrete: what exactly would have to change?"), choice("name_my_own_doubt", "Ich sage, dass es mir gerade ähnlich geht.", "I say that I feel something similar right now.")],
      matters: [choice("honesty_in_crisis", "auch im Tief ehrlich sein", "being honest even at a low point"), choice("not_giving_up", "nicht aufgeben", "not giving up"), choice("feeling_carried", "sich getragen fühlen", "feeling carried"), choice("realistic_view", "die Lage nüchtern sehen", "seeing the situation soberly"), choice("decide_together", "gemeinsam entscheiden, wie es weitergeht", "deciding together how to go on")],
      needs: [choice("say_it_out_loud", "so etwas aussprechen dürfen", "be allowed to say something like that"), choice("not_be_alone", "damit nicht allein sein", "not be alone with it"), choice("hold_the_line", "trotzdem noch stehen bleiben", "still hold the line anyway"), choice("plan_a_next_step", "einen nächsten Schritt festlegen", "agree on a next step"), choice("give_it_time", "es sacken lassen dürfen", "be allowed to let it settle")],
    },
  ] as const,
};

export const FOUNDER_IN_THE_WILD_PACKS = [UNDER_PRESSURE, WHEN_IT_GETS_PERSONAL] as const;

/** Bleibt als Standard: Wer ohne Pack startet, bekommt das erste. */
export const FOUNDER_IN_THE_WILD_PACK = UNDER_PRESSURE;

export function getFounderInTheWildPack(packKey: string | null | undefined) {
  return FOUNDER_IN_THE_WILD_PACKS.find((pack) => pack.key === packKey) ?? null;
}

export function getFounderInTheWildScenario(position: number, packKey?: string | null) {
  const pack = getFounderInTheWildPack(packKey) ?? FOUNDER_IN_THE_WILD_PACK;
  return pack.scenarios.find((scenario) => scenario.position === position) ?? null;
}

/**
 * Geraten wird auf denselben Zuegen, aus denen man selbst waehlt - sonst
 * liessen sich Tipp und Antwort nicht vergleichen.
 */
export function isFounderInTheWildChoice(
  responseType: FounderInTheWildResponseType,
  scenario: FounderInTheWildScenario,
  keys: string[]
) {
  const choices =
    responseType === "move" || responseType === "guess"
      ? scenario.moves
      : responseType === "matters"
        ? scenario.matters
        : scenario.needs;
  const unique = new Set(keys);
  const max = responseType === "matters" ? 2 : 1;
  return (
    unique.size === keys.length &&
    keys.length >= 1 &&
    keys.length <= max &&
    keys.every((key) => choices.some((choice) => choice.key === key))
  );
}
