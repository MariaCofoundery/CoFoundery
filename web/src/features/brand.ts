/**
 * Der Markenname — an einer Stelle.
 *
 * ---------------------------------------------------------------------------
 * ZWEI NAMEN, UND DAS IST EINE ENTSCHIEDENE UEBERGANGSLAGE (Phase 6)
 * ---------------------------------------------------------------------------
 *
 * Zielname ist `Made2Found` - Produktentscheidung vom 01.10.2026. Die
 * weitergegebenen Fassungen (die beiden PDFs: Fusszeile und Dateiname) tragen
 * ihn bereits.
 *
 * Die Anwendung selbst heisst weiterhin `CoFoundery` (`CoFoundery Align`).
 * Das ist kein Versaeumnis: Der Name haengt dort an Dingen, die sich nicht
 * nebenbei umstellen lassen - an der Domain `cofoundery.de`, an den
 * Absenderadressen und Vorlagen der E-Mails, am Logo (die Wortmarke ist das
 * Bild selbst), an Impressum und Datenschutzerklaerung, an den
 * Supabase-Mailvorlagen und an 86 Saetzen in den Sprachbundles. Ein
 * Seitentitel „Made2Found" neben einem Logo „CoFoundery Align" waere dieselbe
 * Uneinheitlichkeit, nur andersherum. Die vollstaendige Liste steht in
 * `docs/profile-phase-6-final-polish.md`, Abschnitt Branding.
 *
 * WAS SCHON HIER HAENGT: Seitentitel und App-Name (`app/layout.tsx`), das
 * Manifest, die Alternativtexte der Logos, die Titel der oeffentlichen
 * Connect-Seiten und die Druck-Fusszeilen. Beim Rebranding wird dort also
 * nichts gesucht, sondern hier `PRODUCT_NAME` geaendert - zusammen mit dem,
 * was die Liste sonst nennt.
 */

/** Wie die weitergegebenen Fassungen unterschrieben sind - der Zielname. */
export const BRAND_NAME = "Made2Found";

/** Wie die Anwendung heute heisst. Wird beim Rebranding zu `BRAND_NAME`. */
export const PRODUCT_NAME = "CoFoundery";

/** Der volle Produktname, wie er im Logo und im Seitentitel steht. */
export const PRODUCT_FULL_NAME = `${PRODUCT_NAME} Align`;

/**
 * Wie der Dateiname anfaengt — kleingeschrieben, ohne Sonderzeichen.
 *
 * Abgeleitet statt noch einmal geschrieben: Zwei Schreibweisen desselben
 * Namens laufen auseinander, sobald eine davon jemand anfasst.
 */
export const BRAND_SLUG = BRAND_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-");
