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

const choice = (key: string, de: string, en: string): FounderInTheWildChoice => ({ key, label: { de, en } });

export const FOUNDER_IN_THE_WILD_PACK = {
  experienceKey: "founder_in_the_wild",
  key: "under_pressure_v1",
  version: 1,
  title: { de: "Unter Druck", en: "Under Pressure" },
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
} as const;

export function getFounderInTheWildScenario(position: number) {
  return FOUNDER_IN_THE_WILD_PACK.scenarios.find((scenario) => scenario.position === position) ?? null;
}

export function isFounderInTheWildChoice(responseType: "move" | "matters" | "need", scenario: FounderInTheWildScenario, keys: string[]) {
  const choices = responseType === "move" ? scenario.moves : responseType === "matters" ? scenario.matters : scenario.needs;
  const unique = new Set(keys);
  const min = responseType === "matters" ? 1 : 1;
  const max = responseType === "matters" ? 2 : 1;
  return unique.size === keys.length && keys.length >= min && keys.length <= max && keys.every((key) => choices.some((choice) => choice.key === key));
}
