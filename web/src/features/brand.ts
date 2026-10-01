/**
 * Der Markenname — an einer Stelle.
 *
 * ---------------------------------------------------------------------------
 * ZWEI NAMEN, UND DAS IST KEIN VERSEHEN DIESES MODULS
 * ---------------------------------------------------------------------------
 *
 * Das Produkt heisst im ganzen Code `CoFoundery`: im Seitentitel
 * (`app/layout.tsx`), in den Sprachbundles und im Verzeichnisnamen.
 *
 * Fuer die PDF-Fassungen wurde am 01.10.2026 ausdruecklich `Made2Found`
 * verlangt - im Fusszeilentext und im Dateinamen. Diese Datei ist deshalb die
 * Stelle, an der der Name fuer die weitergegebenen Fassungen steht, und sie
 * ist mit Absicht die EINZIGE: Beim naechsten Mal wird hier ein Wort
 * geaendert und nicht an acht Stellen gesucht.
 *
 * SOLANGE BEIDE NAMEN NEBENEINANDER STEHEN, ist das eine offene Frage und
 * keine Entscheidung dieses Moduls. Wer sie beantwortet, aendert hier eine
 * Zeile - und `app/layout.tsx` sowie die Bundles dazu.
 */

/** Wie die weitergegebenen Fassungen unterschrieben sind. */
export const BRAND_NAME = "Made2Found";

/**
 * Wie der Dateiname anfaengt — kleingeschrieben, ohne Sonderzeichen.
 *
 * Abgeleitet statt noch einmal geschrieben: Zwei Schreibweisen desselben
 * Namens laufen auseinander, sobald eine davon jemand anfasst.
 */
export const BRAND_SLUG = BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");
