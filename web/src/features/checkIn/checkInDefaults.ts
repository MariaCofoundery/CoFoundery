type Localized = { de: string; en: string };
const l = (de: string, en: string): Localized => ({ de, en });

/**
 * Fragen fuer den Rueckblick: echte Erfahrungen aus der Zusammenarbeit, nicht
 * Ausnahmefaelle. Jede Frage laesst sich abwaehlen, aendern oder ergaenzen.
 * Ein konkretes Beispiel hilft mehr als eine allgemeine Antwort.
 */
export const CHECK_IN_RETRO_QUESTIONS: readonly Localized[] = [
  l("Was lief bei uns in letzter Zeit richtig gut? Nenne ein Beispiel.", "What has gone really well between us lately? Give an example."),
  l("Wo war es zwischen uns schwierig? Was ist da genau passiert?", "Where was it difficult between us? What exactly happened?"),
  l("Was hat uns geholfen, wieder ins Gespräch zu kommen?", "What helped us get back into conversation?"),
  l("Was wünsche ich mir für die nächsten Wochen anders?", "What do I want to be different over the next weeks?"),
];
