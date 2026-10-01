import { BRAND_SLUG } from "@/features/brand";

/**
 * Zwei Druckfassungen von „Das bist du" — und was sie unterscheidet.
 *
 * ---------------------------------------------------------------------------
 * DER MODUS STEHT IN DER ADRESSE, NICHT IM BILDSCHIRM
 * ---------------------------------------------------------------------------
 *
 * Bis zum 01.10.2026 war der Ausdruck die Leseseite selbst: Ein Bauteil
 * klappte beim Drucken alle `details` auf, und was im PDF stand, hing davon
 * ab, was vorher offen war — und daran, dass ein Mensch nicht zwischendurch
 * etwas zugeklappt hatte.
 *
 * Jetzt entscheidet `?mode=` und sonst nichts. Dieselbe Person bekommt
 * zweimal dasselbe Dokument, egal was sie vorher angeklickt hat.
 *
 * ---------------------------------------------------------------------------
 * KURZ IST EINE AUSWAHL, KEINE VERKLEINERUNG
 * ---------------------------------------------------------------------------
 *
 * Ein sehr volles Profil darf die Kurzfassung nicht in eine kleingedruckte
 * Langfassung verwandeln. Deshalb begrenzt `SHORT` die Anzahl je Bereich.
 *
 * UND ZWAR OHNE RANGFOLGE. Es gibt keine „wichtigste Fähigkeit" und keine
 * „Top 5" — das Modell kennt so etwas nicht, und eine Begrenzung darf es
 * nicht erfinden. Begrenzt wird in der Reihenfolge, in der die Dinge
 * entstanden sind, und wo etwas wegfällt, steht ein Satz, der sagt, wo der
 * Rest steht.
 */

export const PRINT_MODES = ["short", "full"] as const;
export type PrintMode = (typeof PRINT_MODES)[number];

/**
 * Welcher Modus gemeint ist.
 *
 * KURZ IST DIE VOREINSTELLUNG. Wer ohne Angabe hier landet, bekommt die
 * Fassung mit weniger persönlichen Angaben — nicht die mit mehr.
 */
export function parsePrintMode(value: unknown): PrintMode {
  return value === "full" ? "full" : "short";
}

/** Der Altbestand kommt nur mit, wenn jemand ihn ausdrücklich dazunimmt. */
export function parseIncludeLegacy(value: unknown): boolean {
  return String(value ?? "") === "1";
}

/**
 * Wie viel die Kurzfassung je Bereich zeigt.
 *
 * Die ersten beiden Zahlen sind dieselben wie in der Zusammenfassung auf
 * „Das bist du" (`profileSummary.ts`) — die Kurzfassung ist genau das, was
 * dort offen steht, und keine dritte Dichte.
 *
 * Die übrigen begrenzen Listen, die auf der Seite vollständig stehen dürfen,
 * weil man dort scrollt. Auf Papier wird aus einer Liste mit 54 Einträgen
 * eine Seite, die niemand liest.
 */
export const SHORT_LIMITS = {
  /** Wie auf der Seite: die ersten fünf. */
  strengths: 5,
  /** Wie auf der Seite: zwei je Rubrik. */
  directionPerFacet: 2,
  /** Bereiche mit viel festgehaltener Erfahrung. */
  deepAreas: 12,
  /** „Wohin du wachsen willst" — selten mehr. */
  growingInto: 12,
  /**
   * Je Verantwortungsgruppe.
   *
   * ZWOELF, UND DAS IST GEMESSEN. Am 01.10.2026 standen hier kurzzeitig acht,
   * um die Kurzfassung des Stressprofils unter sieben Seiten zu bringen. Es
   * hat 44 Pixel gebracht und keine Seite: Die Bereiche stehen als Schlagworte
   * nebeneinander und brechen um, statt untereinander zu stehen.
   *
   * Eine Kuerzung, die Angaben der Person weglaesst und nichts einspart, ist
   * keine. Sie ist zurueckgenommen.
   */
  ownershipPerGroup: 12,
  /** Je Art von Ressource - aus demselben Grund acht und nicht sechs. */
  resourcesPerKind: 8,
} as const;

/**
 * Begrenzen und sagen, wie viel fehlt.
 *
 * Gibt `rest: 0` zurück, wenn nichts wegfällt — dann steht auch kein Satz
 * darüber. „Weitere 0 im ausführlichen Profil" wäre eine Lücke, die es nicht
 * gibt.
 */
export function limited<T>(items: readonly T[], limit: number | null) {
  if (limit === null || items.length <= limit) return { shown: [...items], rest: 0 };
  return { shown: items.slice(0, limit), rest: items.length - limit };
}

/**
 * Der Dateiname, den der Browser vorschlägt.
 *
 * ER KOMMT AUS DEM SEITENTITEL. Chrome, Safari und Firefox bieten beim
 * „Als PDF sichern" den `document.title` an; einen echten `Content-Disposition`
 * gibt es beim Drucken nicht. Deshalb trägt die Druckseite keinen schönen
 * Titel, sondern genau diesen Namen.
 *
 * Keine Umlaute, keine Sonderzeichen, keine Kennung eines Kontos und keine
 * Mailadresse: Ein Dateiname wandert weiter als das Dokument selbst — er
 * steht in Anhängen, in Ordnern und in Suchergebnissen.
 */
export function printFileName(mode: PrintMode, displayName: string | null, date: Date) {
  const teil = mode === "full" ? "ausfuehrlich" : "kurz";
  const tag = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return [`${BRAND_SLUG}-das-bist-du-${teil}`, slugify(displayName), tag]
    .filter(Boolean)
    .join("-");
}

/**
 * Aus einem Namen wird ein Dateinamensteil.
 *
 * Umlaute werden zerlegt und ihre Zeichen entfernt (`ä` → `a`), ß wird `ss`.
 * Alles andere ausserhalb von a-z und 0-9 wird zum Bindestrich; mehrere
 * Bindestriche werden einer. Bleibt nichts übrig — etwa bei einem Namen in
 * einer anderen Schrift —, steht gar nichts da statt einer Reihe Striche.
 */
function slugify(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/ß/g, "ss")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
