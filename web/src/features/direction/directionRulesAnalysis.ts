import type { DirectionFacet } from "@/features/direction/directionInterviewGuide";

/**
 * Hinsehen ohne Modell.
 *
 * GEWÜNSCHT AM 22.09.2026: "Es muss ja auch ohne KI gehen, dass der Text mal
 * ein bisschen analysiert wird und geschaut wird, was sind so typische Sachen,
 * die Menschen so anschreiben."
 *
 * WAS DIESER WEG TUT - UND WAS NICHT, und daran hängt, ob er ehrlich ist:
 *
 *   Er DEUTET NICHT. Er schließt nicht aus Stichwörtern auf ein Thema ("du
 *   hast 'Kunden' geschrieben, also ist dir Vertrieb wichtig"). Genau das
 *   stand im Brief als Grund, warum ein Regelweg hier nichts taugt, und das
 *   gilt weiter.
 *
 *   Er FINDET DIE STELLE, an der jemand selbst gesagt hat, was ihm wichtig
 *   war - über Wendungen, mit denen Menschen so etwas einleiten: "mir war
 *   wichtig", "hat mich genervt", "damit ... endlich", "am liebsten". Und
 *   dann schlägt er GENAU DIESEN SATZ vor, wörtlich.
 *
 * Der Vorschlag ist damit ein Zitat mit einer Rubrik daneben. Er kann falsch
 * einsortiert sein - er kann nichts behaupten, was nicht dasteht. Deshalb darf
 * die Oberfläche auch sagen, woran wir noch arbeiten, ohne dass jemand dabei
 * etwas Falsches über sich liest.
 *
 * DIE WENDUNGEN STEHEN IN BEIDEN SPRACHEN in einer Liste. Welche Sprache
 * jemand schreibt, entscheidet nicht die Oberfläche, sondern die Person - und
 * eine deutsche Wendung trifft auf einen englischen Text ohnehin nicht zu.
 */

/** Höchstens so viele Funde je Antwort - mehr wäre eine Liste, keine Hilfe. */
const MAX_FINDINGS = 3;
/** Kürzer ist kein Satz; länger ist kein Vorschlag mehr, sondern ein Absatz. */
const MIN_SENTENCE = 20;
const MAX_SENTENCE = 200;

type Cue = { facet: DirectionFacet; patterns: RegExp[] };

/**
 * Die Wendungen, geordnet nach Rubrik.
 *
 * Die Reihenfolge ist Absicht: Was jemand ausdrücklich als wichtig oder als
 * störend benennt, ist belastbarer als eine allgemeine Beobachtung. Deshalb
 * stehen diese Rubriken oben - bei mehreren Treffern in einem Satz gewinnt
 * die erste.
 */
const CUES: Cue[] = [
  {
    facet: "frustrating_condition",
    patterns: [
      /\bhat mich (genervt|aufgeregt|fertiggemacht)/i,
      /\bnervt mich\b/i,
      /\bnie wieder\b/i,
      /\bwollte ich (so )?nicht\b/i,
      /\bschlimm (fand|war)\b/i,
      /\bam anstrengendsten\b/i,
      /\bdrove me (mad|crazy)\b/i,
      /\bi (really )?did ?n[o']t want\b/i,
      /\bnever again\b/i,
    ],
  },
  {
    facet: "problem_cared_about",
    patterns: [
      /\bm(ü|ue)sste doch\b/i,
      /\bkann (doch )?nicht sein, dass\b/i,
      /\bdas problem (ist|war)\b/i,
      /\b(es )?(ärgert|aergert) mich\b/i,
      /\bsurely .{0,20}could be better\b/i,
      /\bthe problem (is|was)\b/i,
    ],
  },
  {
    facet: "energising_activity",
    patterns: [
      /\bam liebsten\b/i,
      /\bhat (mir )?(richtig )?spa(ß|ss) gemacht\b/i,
      /\bw(ü|ue)rde ich gern (mehr|öfter|oefter)\b/i,
      /\bging mir leicht\b/i,
      /\bi (really )?enjoyed\b/i,
      /\bmore of that\b/i,
    ],
  },
  {
    facet: "meaningful_outcome",
    patterns: [
      /\bdanach (konnten|konnte|ging)\b/i,
      /\bhat (wirklich )?geholfen\b/i,
      /\bhat sich gelohnt\b/i,
      /\bwar danach anders\b/i,
      /\bafterwards (they|she|he|it) could\b/i,
      /\bit (really )?helped\b/i,
    ],
  },
  {
    facet: "desired_change",
    patterns: [
      /\bdamit .{0,40}\b(k(ö|oe)nnen|kann|endlich)\b/i,
      /\bsodass\b/i,
      /\bendlich\b/i,
      /\bso that .{0,40}\b(can|could)\b/i,
    ],
  },
  {
    facet: "people_cared_about",
    patterns: [
      /\bf(ü|ue)r die (leute|menschen|betroffenen|familien|kolleg)/i,
      /\bden (nutzer|kunden|leuten) (zu )?/i,
      /\bfor the (people|families|users|customers)\b/i,
    ],
  },
  {
    facet: "recurring_theme",
    patterns: [
      /\bimmer wieder\b/i,
      /\bschon immer\b/i,
      /\bseit jahren\b/i,
      /\bzieht sich (bei mir )?durch\b/i,
      /\b(over and over|again and again)\b/i,
      /\bfor years\b/i,
    ],
  },
  {
    facet: "preferred_contribution",
    patterns: [
      /\bmeine aufgabe war\b/i,
      /\bich habe daf(ü|ue)r gesorgt\b/i,
      /\bich war der(jenige)?, der\b/i,
      /\bmy job was\b/i,
      /\bi made sure\b/i,
    ],
  },
  {
    facet: "recurring_tension",
    patterns: [
      /\beinerseits\b/i,
      /\bhin- und hergerissen\b/i,
      /\bzwar .{0,60}\baber\b/i,
      /\bon the one hand\b/i,
      /\btorn between\b/i,
    ],
  },
  {
    facet: "open_question",
    patterns: [
      /\bich wei(ß|ss) (noch )?nicht, ob\b/i,
      /\bfrage mich, ob\b/i,
      /\bunklar (ist|war)\b/i,
      /\bi do ?n[o']t know (yet )?(if|whether)\b/i,
    ],
  },
];

export type RuleFinding = {
  facet: DirectionFacet;
  /** Der Satz selbst - wörtlich, gekürzt nur an einer Wortgrenze. */
  statement: string;
  /** Derselbe Satz. Er IST der Beleg; die Datenbank rechnet beides nach. */
  quote: string;
};

/**
 * In Sätze zerlegen.
 *
 * Absichtlich einfach: Punkt, Ausrufe- und Fragezeichen, Zeilenumbruch. Eine
 * echte Satzerkennung wäre hier Aufwand ohne Ertrag - wenn ein Satz einmal zu
 * lang gerät, wird er an einer Wortgrenze gekürzt, und die Prüfung in der
 * Datenbank hält trotzdem, weil ein Präfix des Satzes weiterhin wörtlich im
 * Text steht.
 */
function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= MIN_SENTENCE);
}

function shorten(sentence: string) {
  if (sentence.length <= MAX_SENTENCE) return sentence;
  const cut = sentence.slice(0, MAX_SENTENCE);
  const lastSpace = cut.lastIndexOf(" ");
  // Nur an einer Wortgrenze, und nie so kurz, dass der Beleg unter die
  // Mindestlänge der Datenbank fällt.
  return lastSpace > MIN_SENTENCE ? cut.slice(0, lastSpace) : cut;
}

export function findDirectionRuleFindings(answer: string): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const usedFacets = new Set<string>();

  for (const sentence of sentences(answer)) {
    for (const cue of CUES) {
      if (usedFacets.has(cue.facet)) continue;
      if (!cue.patterns.some((pattern) => pattern.test(sentence))) continue;

      const statement = shorten(sentence);
      // Nach dem Kürzen kann ein Satz zu kurz sein, um ein Beleg zu sein.
      if (statement.length < MIN_SENTENCE) break;

      usedFacets.add(cue.facet);
      findings.push({ facet: cue.facet, statement, quote: statement });
      break;
    }
    if (findings.length >= MAX_FINDINGS) break;
  }

  return findings;
}
