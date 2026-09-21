import { isFounderSetupItemKey, type FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

/**
 * Welche Situation gehoert zu welchem Thema im Founder-Setup.
 *
 * GEWUENSCHT AM 21.09.2026: "Wenn man markiert, dass man darueber sprechen
 * moechte, waere es gut, dass da auch ein sinnvoller Hinweis im Founder-Setup
 * auftaucht, mit aufklappbarem Ergebnis aus dem Founder in the Wild oder Read
 * My Mind Modul, sodass man im Setup bleibt, aber nochmal sehen kann, was da
 * war."
 *
 * WARUM EINE HANDGESCHRIEBENE LISTE und keine Regel: Die Verbindung ist eine
 * inhaltliche Aussage ("dieses Gespraech gehoert zu diesem Thema"), keine
 * Eigenschaft der Daten. Eine Heuristik ueber Namen oder Stichwoerter waere
 * mal richtig und mal daneben - und daneben heisst hier: Das Produkt behauptet
 * einen Zusammenhang, den zwei Menschen dann in ihrer Vereinbarung
 * wiederfinden sollen.
 *
 * WO KEINE ZEILE STEHT, GIBT ES KEINEN HINWEIS. Das ist Absicht. Ein Zeiger
 * auf das falsche Thema ist schlechter als keiner: Er schickt das Gespraech in
 * die falsche Ecke der Vereinbarung.
 *
 * MEHRERE THEMEN sind erlaubt, hoechstens zwei. Der Anteil, der sich falsch
 * anfuehlt, gehoert zur Beteiligung UND zum Vesting - beides zu verschweigen
 * waere falsch, drei waeren Rauschen.
 *
 * Diese Liste ist Inhalt, nicht Technik. Sie gehoert einem Menschen, der die
 * Situationen und die Themen kennt; ein Test haelt nur fest, dass jede Zeile
 * auf ein Thema zeigt, das es wirklich gibt.
 */
const LINKS: Record<string, readonly FounderSetupItemKey[]> = {
  // --- Founder in the Wild: Unter Druck ------------------------------------
  // "Dein Co-Founder beschreibt ploetzlich eine strategische Richtung, von der
  // du dachtest, dass ihr sie laengst verworfen habt" - wer darf nach aussen
  // welche Linie vertreten.
  pitch_shifts: ["decision_rights"],
  // Ein Auftrag, der bis Freitag etwas verlangt, was nicht im Plan steht: Wer
  // sagt sowas zu, und wessen Zeit steckt darin.
  customer_by_friday: ["decision_rights", "time_commitment"],
  // Vier Monate Spielraum - was jeder von beiden persoenlich tragen kann.
  four_months_runway: ["personal_financial_risk"],
  // "Zum zweiten Mal einen wichtigen vereinbarten Beitrag nicht geliefert."
  commitment_missed: ["time_commitment"],
  // Ein Pivot ist die groesste gemeinsame Entscheidung, die es gibt.
  pivot_pull: ["decision_rights"],

  // --- Founder in the Wild: Wenn es persoenlich wird -----------------------
  // "Seit Wochen arbeitest du deutlich mehr" - und nichts davon war
  // abgesprochen.
  uneven_effort: ["time_commitment"],
  // Ein Jobangebot stellt den Einsatz infrage, nicht eine Nebentaetigkeit.
  outside_offer: ["changing_commitment", "outside_activities"],
  equity_feels_wrong: ["equity", "vesting"],
  decided_without_me: ["decision_rights"],
  // "Ich weiss nicht, ob das noch gut geht." Der Satz stellt das Weitermachen
  // infrage - deshalb das Thema, an dem eine Veraenderung des Einsatzes
  // verhandelt wird, und nicht "Konflikt".
  the_low_point: ["changing_commitment"],

  // --- Read My Mind: Easy Start -------------------------------------------
  // Alle fuenf drehen sich um Rhythmus und Erreichbarkeit.
  silent_day: ["communication"],
  update_frequency: ["communication"],
  please_do_not_ask: ["communication"],
  brief_focus_break: ["communication"],
  really_bad_workday: ["communication"],

  // --- Read My Mind: So arbeiten wir --------------------------------------
  just_do_it: ["decision_rights"],
  when_to_involve_you: ["decision_rights"],
  // "Wann ist etwas gut genug" hat KEINE Zeile: Ein Qualitaetsmassstab ist im
  // Setup kein Thema, und ihn bei "Rollen" einzuhaengen waere geraten.
  slower_than_expected: ["time_commitment"],
  reopen_decision: ["decision_rights"],

  // --- Read My Mind: Wenn es schwierig wird -------------------------------
  shaky_deadline: ["time_commitment"],
  tell_me_it_is_not_good: ["communication"],
  after_the_argument: ["conflict_deadlock"],
  not_now: ["communication"],
  disagreeing_before_customer: ["conflict_deadlock"],
};

/** Die Themen, zu denen diese Situation gehoert - leer, wenn keines passt. */
export function setupItemsForPrompt(promptKey: string): readonly FounderSetupItemKey[] {
  return LINKS[promptKey] ?? [];
}

export function promptBelongsToSetupItem(promptKey: string, itemKey: string) {
  return setupItemsForPrompt(promptKey).some((key) => key === itemKey);
}

/** Nur fuer Tests: die Liste selbst, damit sie gegen den Katalog gehalten werden kann. */
export const COLLABORATION_CONVERSATION_LINKS = LINKS;

/**
 * Hier waere ein stiller Fehler moeglich: Ein Tippfehler in einem Themenkey
 * wuerde nie auffallen, weil dann eben kein Hinweis erscheint - und ein
 * fehlender Hinweis sieht aus wie "niemand hat markiert". Deshalb wird die
 * Liste einmal gegen den Katalog geprueft.
 */
export function unknownSetupItemKeysInLinks() {
  return Object.entries(LINKS).flatMap(([promptKey, itemKeys]) =>
    itemKeys.filter((key) => !isFounderSetupItemKey(key)).map((key) => `${promptKey} -> ${key}`)
  );
}
