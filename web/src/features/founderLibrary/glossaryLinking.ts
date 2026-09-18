/**
 * Fachwoerter im Fliesstext mit der Library verbinden.
 *
 * Die Orientierungstexte im Founder Setup sind voller Begriffe, die man
 * entweder kennt oder nicht - Vinkulierung, Sperrminoritaet, Cliff. Wer sie
 * nicht kennt, liest an der entscheidenden Stelle vorbei und muesste die Seite
 * verlassen, um nachzuschlagen. Deshalb werden sie verlinkt, und deshalb
 * oeffnen die Links ein neues Fenster: Der Text, an dem jemand gerade arbeitet,
 * bleibt stehen.
 *
 * Bewusst zurueckhaltend:
 *
 *   Nur das ERSTE Vorkommen eines Begriffs wird verlinkt. Derselbe Begriff
 *   viermal im Absatz unterstrichen liest sich wie ein Fehler.
 *
 *   Hoechstens `maxLinks` Verweise pro Text. Ein Absatz, der zur Haelfte aus
 *   Links besteht, ist unlesbar - dann lieber die wichtigsten (laengsten,
 *   spezifischsten) Begriffe.
 *
 *   Nur ganze Woerter. "Marke" darf nicht in "Markenrecht" anspringen, "GbR"
 *   nicht in "GbRs". Die Pruefung ist Unicode-fest, weil \b in JavaScript bei
 *   Umlauten falsch liegt.
 */

export type GlossaryEntry = {
  id: string;
  slug: string;
  /** Der Begriff in der Sprache des Lesers. */
  name: string;
};

export type GlossarySegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; id: string; slug: string };

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function isWordCharacter(value: string | undefined) {
  return value !== undefined && WORD_CHARACTER.test(value);
}

/**
 * Steht `needle` an Position `index` als eigenstaendiges Wort?
 *
 * Begriffe wie "UG (haftungsbeschraenkt)" oder "ARR / MRR" enden auf einem
 * Satzzeichen - dann greift die rechte Randpruefung ohnehin nicht, und das ist
 * richtig so.
 */
function matchesWholeWord(haystack: string, index: number, length: number) {
  const before = index > 0 ? haystack[index - 1] : undefined;
  const after = index + length < haystack.length ? haystack[index + length] : undefined;
  return !isWordCharacter(before) && !isWordCharacter(after);
}

type Claim = { start: number; end: number; entry: GlossaryEntry };

export function buildGlossarySegments(
  text: string,
  entries: readonly GlossaryEntry[],
  options: { maxLinks?: number } = {}
): GlossarySegment[] {
  const maxLinks = options.maxLinks ?? 4;
  if (!text || maxLinks <= 0) return text ? [{ type: "text", value: text }] : [];

  const haystack = text.toLocaleLowerCase();
  // Laengste zuerst: Sonst gewinnt "Marke" gegen "Markenanmeldung" und der
  // spezifischere Begriff kommt nie zum Zug.
  const candidates = [...entries]
    .filter((entry) => entry.name.trim().length > 1)
    .sort((left, right) => right.name.length - left.name.length);

  const claims: Claim[] = [];
  for (const entry of candidates) {
    if (claims.length >= maxLinks) break;

    const needle = entry.name.toLocaleLowerCase();
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      const end = index + needle.length;
      const overlaps = claims.some((claim) => index < claim.end && end > claim.start);
      if (!overlaps && matchesWholeWord(haystack, index, needle.length)) {
        claims.push({ start: index, end, entry });
        break; // Nur das erste Vorkommen.
      }
      index = haystack.indexOf(needle, index + 1);
    }
  }

  if (claims.length === 0) return [{ type: "text", value: text }];

  claims.sort((left, right) => left.start - right.start);
  const segments: GlossarySegment[] = [];
  let cursor = 0;
  for (const claim of claims) {
    if (claim.start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, claim.start) });
    }
    segments.push({
      type: "link",
      // Der Originaltext, nicht der Registereintrag: Gross- und Kleinschreibung
      // im Satz bleibt so, wie die Autorin sie geschrieben hat.
      value: text.slice(claim.start, claim.end),
      id: claim.entry.id,
      slug: claim.entry.slug,
    });
    cursor = claim.end;
  }
  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  return segments;
}

export function founderLibraryTermHref(slug: string) {
  return `/founder-library/${slug}`;
}
