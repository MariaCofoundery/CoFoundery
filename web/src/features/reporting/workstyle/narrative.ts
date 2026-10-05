/**
 * Report-Aussagen fuer workstyle-report/1.0.0 - deterministisch, ohne LLM.
 *
 * MESSUNG -> EVIDENZ -> AUSSAGE -> WORTLAUT (Phase 10B)
 *
 * Jede Aussage ist auf konkrete, produktfaehige Antworten rueckfuehrbar und
 * traegt eine interne Claim-ID (`claim`, z. B. `EVI.DIRECTION.UPPER.ALL`), die
 * Bereich, Regel und Evidenzklasse nennt. Die ID ist nur fuer Entwickler
 * gedacht (im DOM als `data-claim`), kein Wert und keine Rangfolge.
 *
 * Evidenzregeln (Bereichsaussage, Einzelbericht):
 * - Grundlage sind nur die ordinalen Items EINES Antwortformats je Bereich
 *   (`patternItems`). EXP-01 (Format "seriousness") und die ORG-Zweierwahlen
 *   werden nicht mit anderen Formaten verrechnet, sondern als einzelne
 *   Antworten wiedergegeben (`itemNotes`).
 * - Fehlende Antworten ("Kann ich noch nicht einschätzen") zaehlen nicht als
 *   Mitte, sondern gar nicht. Mindestens `minAnswered` = min(3, Anzahl Items)
 *   beantwortete Situationen; sonst `insufficient` und keine Deutung.
 * - `direction` nur, wenn alle beantworteten Situationen im selben Band liegen
 *   (ALL) oder hoechstens eine davon "teils/teils" ist und keine im Gegenpol
 *   (MOST; diese Ausnahme wird benannt). Sonst `mixed`: keine Richtung,
 *   sondern die Situationen je Antwortbereich.
 *
 * Was der Bericht NICHT tut:
 * - keine Zahl, kein Mittelwert, keine Normierung, kein Typ;
 * - keine Saetze darueber, wie andere eine Person erleben - das wird nicht
 *   gemessen (Selbstauskunft). Der Bericht sagt das einmal ausdruecklich;
 * - keine Alltagsableitungen ueber die beschriebenen Situationen hinaus;
 * - AMB beschreibt Empfinden, nicht Handeln.
 *
 * Inhalt ist deutsch, weil das Instrument nur deutsch existiert. Die
 * Seitenumgebung ist uebersetzt.
 */
import {
  AREAS,
  PRODUCT_ITEMS,
  rawChoice,
  responseBand,
  type AreaKey,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";

export type Band = "lower" | "middle" | "upper";
export type AreaPattern =
  | { kind: "insufficient"; answered: number; required: number }
  | { kind: "direction"; band: Band; strength: "all" | "most"; exception: string | null }
  | { kind: "mixed"; upper: string[]; middle: string[]; lower: string[] };

/** Kurze Situationsbeschreibungen fuer jedes ordinale Core-Item - nah am Wortlaut, ohne Deutung. */
export const SITUATIONS: Record<string, string> = {
  "EVI-01": "bei einem spontanen Favoriten nach Gegenargumenten suchen",
  "EVI-02": "eine unsichere Annahme vor der Festlegung prüfen",
  "EVI-03": "eine getroffene Entscheidung bei deutlicher Gegeninformation erneut prüfen",
  "EVI-05": "die eigene Einschätzung prüfen, wenn jemand einen nachvollziehbaren Gegenpunkt bringt",
  "EVI-06": "einem Widerspruch zwischen seriösen Quellen nachgehen",
  "EXP-01": "einen vertrauten Eindruck ernst nehmen, den du noch nicht begründen kannst",
  "EXP-02": "frühere Erfahrung gegenüber einer Lösung, die auf dem Papier überzeugt",
  "EXP-03": "Erfahrung bei zwei gleich guten Möglichkeiten",
  "EXP-04": "Erfahrung bei einem Problem, das du schon mehrfach erlebt hast",
  "EXP-06": "Erfahrung, wenn Informationen fehlen, du das Thema aber gut kennst",
  "EL-01": "zwischen zwei Wegen erst etwas testen",
  "EL-02": "einen Test vorschlagen, wenn ein Gespräch nicht weiterkommt",
  "EL-04": "früh eine einfache Version zeigen oder ausprobieren lassen",
  "EL-05": "nach einem unklaren Versuch gezielt etwas ändern und erneut testen",
  "VOICE-01": "einen Gegenpunkt ansprechen, obwohl ihr euch schon einig seid",
  "VOICE-02": "etwas Unangenehmes zeitnah ansprechen",
  "VOICE-03": "ein vertagtes, offenes Thema selbst wieder aufgreifen",
  "VOICE-04": "sagen, dass du eine Entscheidung fachlich anders einschätzt",
  "VOICE-05": "sagen, dass du noch nicht so weit bist, wenn die Runde abschließen will",
  "AMB-01": "widersprüchliche Rückmeldungen zur selben Idee",
  "AMB-02": "mehrere plausible Erklärungen, die sich gerade nicht klären lassen",
  "AMB-04": "neue Informationen, die die Lage noch offener machen",
  "AMB-05": "mit einer wichtigen offenen Frage weiterarbeiten",
  "ORG-01": "vor einem größeren Vorhaben zuerst nächste Schritte klären",
  "ORG-02": "dir bei langen Aufgaben selbst Zwischenpunkte setzen",
};

/**
 * Bereichstexte. Seit Phase 11.7B in Alltagssprache ("Wenn ... dann ...",
 * "Bei dir haengt es davon ab ..."), aber weiterhin nur aus den Items des
 * Bereichs abgeleitet (Iteminhalt im Kommentar): keine Charakterdiagnose,
 * keine Wirkung auf andere, kein beobachtetes Verhalten. Fragen sind
 * Reflexionsangebote ohne unterstellte Schwierigkeit.
 */
type AreaCopy = {
  direction: Record<Band, string>;
  mixed: string;
  /** Ein kurzer Satz fuer die Bereichskarte "auf einen Blick". */
  short: Record<Band | "mixed", string>;
  /** Beschriftung der Situationen je Antwortbereich (gemischtes Muster). */
  bands: Record<Band, string>;
  question: Record<"upper" | "lower" | "open", string>;
  note?: string;
};

const COPY: Record<AreaKey, AreaCopy> = {
  EVI: {
    direction: {
      // EVI-01 Gegenargumente, -02 unsichere Annahme, -03/-05 Gegeninformation/Gegenpunkt, -06 widersprüchliche Quellen
      upper: "Wenn eine Entscheidung ansteht, schaust du lieber noch einmal genauer hin: Du suchst nach Gegenargumenten, prüfst unsichere Annahmen und gehst Informationen nach, die dagegen sprechen.",
      lower: "Eine Einschätzung, die steht, lässt du eher stehen: Gezielt nach Gegenargumenten zu suchen oder Gegeninformationen nachzugehen, ist in diesen Situationen für dich eher nicht der nächste Schritt.",
      middle: "Ob du eine Einschätzung noch einmal prüfst, lässt du in den meisten Situationen offen – mal eher ja, mal eher nein.",
    },
    mixed: "Bei dir hängt es von der Situation ab: Manches lässt du stehen, anderes prüfst du noch einmal genauer.",
    short: { upper: "Du schaust lieber noch einmal genauer hin.", lower: "Du lässt eine erste Einschätzung eher stehen.", middle: "Meist irgendwo dazwischen.", mixed: "Je nach Situation." },
    bands: { upper: "Hier prüfst du eher noch einmal", middle: "Hier kommt es darauf an", lower: "Hier lässt du es eher stehen" },
    question: {
      upper: "Woran merkst du, dass genug geprüft ist und du entscheiden kannst?",
      lower: "Welche neue Information wäre für dich ein guter Grund, eine Entscheidung noch einmal zu öffnen?",
      open: "Woran merkst du, dass es sich lohnt, eine Entscheidung noch einmal zu öffnen – und wann lässt du sie bewusst stehen?",
    },
  },
  EXP: {
    direction: {
      // EXP-02 Papierlösung, -03 Gleichstand, -04 wiederholtes Problem, -06 fehlende Informationen (alle "influence")
      upper: "Wenn dir eine Situation bekannt vorkommt, lässt du dich von früheren Erfahrungen deutlich leiten – auch dann, wenn eine Lösung auf dem Papier überzeugt oder Informationen fehlen.",
      lower: "Frühere Erfahrungen spielen bei deiner Einschätzung eher eine kleine Rolle – du schätzt eine Situation lieber frisch ein, auch wenn sie dir vertraut ist.",
      middle: "Frühere Erfahrungen fließen bei dir teilweise ein – sie sind ein Hinweis unter mehreren.",
    },
    mixed: "Erfahrung ist für dich ein Hinweis unter mehreren: In manchen Situationen stützt du dich stark darauf, in anderen weniger – das hängt von der Situation ab.",
    short: { upper: "Du baust auf Erfahrung.", lower: "Du schätzt eher frisch ein.", middle: "Erfahrung zählt teilweise.", mixed: "Je nach Situation." },
    bands: { upper: "Hier zählt Erfahrung für dich stark", middle: "Hier zählt sie teilweise", lower: "Hier zählt sie für dich wenig" },
    question: {
      upper: "Woran erkennst du, ob eine frühere Erfahrung auf die aktuelle Situation passt?",
      lower: "In welchen Situationen wäre es dir wichtig, gezielt nach früheren Erfahrungen zu fragen?",
      open: "Wann stützt du dich auf Erfahrung – und wann schaust du lieber neu hin?",
    },
  },
  EL: {
    direction: {
      // EL-01 vor Festlegung testen, -02 Test vorschlagen, -04 einfache Version zeigen, -05 verändern und erneut testen
      upper: "Wenn sich etwas mit wenig Aufwand testen lässt, probierst du es lieber im Kleinen aus, als lange darüber zu reden.",
      lower: "Auch wenn sich etwas im Kleinen testen ließe, klärst du lieber erst, bevor du etwas ausprobierst.",
      middle: "Ob du erst ausprobierst oder erst klärst, lässt du in den meisten Situationen offen.",
    },
    mixed: "Ob du erst testest oder erst klärst, hängt bei dir von der Situation ab.",
    short: { upper: "Du probierst lieber erst aus.", lower: "Du klärst lieber erst.", middle: "Meist irgendwo dazwischen.", mixed: "Je nach Situation." },
    bands: { upper: "Hier probierst du eher aus", middle: "Hier kommt es darauf an", lower: "Hier klärst du eher erst" },
    question: {
      upper: "Woran merkst du, dass ein Versuch mehr bringt als ein weiteres Gespräch – und was machst du mit dem Ergebnis?",
      lower: "Bei welchen Fragen würdest du einen kleinen Versuch in Betracht ziehen – und bei welchen nicht?",
      open: "Wann probierst du lieber aus – und wann willst du vorher mehr wissen?",
    },
  },
  VOICE: {
    direction: {
      // VOICE-01 Gegenpunkt trotz Einigkeit, -02 Unangenehmes, -03 vertagtes Thema, -04 abweichende Einschätzung, -05 noch nicht so weit
      upper: "Wenn dir etwas Wichtiges auffällt, sprichst du es an – auch wenn die anderen schon einig sind oder fast fertig.",
      lower: "Einwände und offene Punkte sprichst du eher nicht gleich von dir aus an, wenn die Runde schon einig ist oder abschließen möchte.",
      middle: "Ob du einen Einwand gleich ansprichst, lässt du in den meisten Situationen offen.",
    },
    mixed: "Manche Einwände bringst du gleich ein, bei anderen wartest du eher ab – das hängt von der Situation ab.",
    short: { upper: "Du sprichst Dinge gleich an.", lower: "Du wartest eher ab.", middle: "Meist irgendwo dazwischen.", mixed: "Je nach Situation." },
    bands: { upper: "Hier sprichst du es eher an", middle: "Hier kommt es darauf an", lower: "Hier wartest du eher ab" },
    question: {
      upper: "Wie möchtest du mit einem späten Einwand umgehen, wenn eine Entscheidung eigentlich schon steht?",
      lower: "In welchen Situationen wäre es dir wichtig, einen Einwand trotzdem gleich anzusprechen?",
      open: "Wann sprichst du einen Einwand gleich an – und wann wartest du lieber ab?",
    },
  },
  AMB: {
    direction: {
      // AMB-01 widersprüchliche Rückmeldungen, -02 mehrere Erklärungen, -04 Lage wird offener, -05 Weiterarbeiten mit offener Frage
      upper: "Offene Fragen, die sich gerade nicht klären lassen, empfindest du eher als unangenehm – etwa widersprüchliche Rückmeldungen oder mehrere mögliche Erklärungen.",
      lower: "Offene Fragen, die sich gerade nicht klären lassen, empfindest du eher nicht als unangenehm – auch bei widersprüchlichen Rückmeldungen oder mehreren möglichen Erklärungen.",
      middle: "Offene Situationen empfindest du teils als unangenehm, teils nicht.",
    },
    mixed: "Manche offenen Situationen empfindest du als unangenehm, andere nicht – das hängt von der Situation ab.",
    short: { upper: "Offenes ist dir eher unbequem.", lower: "Offenes ist für dich okay.", middle: "Teils unbequem, teils okay.", mixed: "Je nach Situation." },
    bands: { upper: "Das empfindest du eher als unangenehm", middle: "Das empfindest du teils so, teils so", lower: "Das empfindest du eher nicht als unangenehm" },
    question: {
      upper: "Was brauchst du, um gut weiterzuarbeiten, solange eine wichtige Frage offen ist?",
      lower: "Wie gehst du damit um, wenn offene Fragen für andere unangenehmer sind als für dich?",
      open: "Welche Art von offener Frage ist für dich unangenehm – und welche nicht?",
    },
    note: "Das beschreibt dein Empfinden – nicht, wie du in der Situation handelst.",
  },
  ORG: {
    direction: {
      // Nur ORG-01 (nächste Schritte klären) und ORG-02 (eigene Zwischenpunkte) - keine allgemeine Arbeitsorganisation
      upper: "Bei größeren Aufgaben machst du dir zuerst die nächsten Schritte klar und setzt dir eigene Zwischenpunkte.",
      lower: "Bei größeren Aufgaben fängst du eher einfach an, statt zuerst die nächsten Schritte festzulegen und dir Zwischenpunkte zu setzen.",
      middle: "Ob du bei größeren Aufgaben erst die Schritte klärst, lässt du meistens offen.",
    },
    mixed: "Bei größeren Aufgaben legst du manchmal erst die Schritte fest, manchmal fängst du einfach an und sortierst unterwegs – das hängt von der Aufgabe ab.",
    short: { upper: "Du klärst erst die Schritte.", lower: "Du fängst lieber einfach an.", middle: "Meist irgendwo dazwischen.", mixed: "Je nach Aufgabe." },
    bands: { upper: "Hier klärst du eher erst die Schritte", middle: "Hier kommt es darauf an", lower: "Hier fängst du eher einfach an" },
    question: {
      upper: "Wie viel Vorstruktur brauchst du – und wann wird sie dir zu viel?",
      lower: "Wie viel gemeinsamer Plan hilft dir, bevor du mit anderen an etwas Größerem startest?",
      open: "Wann hilft dir ein Plan – und wann arbeitest du lieber ohne?",
    },
  },
};

/**
 * Kurze, gleichwertige Pole fuer die Bereichskarten (Phase 11.7B). Rechts
 * steht immer das obere Ende der Antwortskala - dieselbe Richtung wie
 * `overviewMark`.
 */
export const AREA_POLES: Record<AreaKey, { left: string; right: string }> = {
  EVI: { left: "erste Einschätzung stehen lassen", right: "noch einmal genauer hinschauen" },
  EXP: { left: "eher frisch einschätzen", right: "auf Erfahrung bauen" },
  EL: { left: "erst klären", right: "erst ausprobieren" },
  VOICE: { left: "eher abwarten", right: "gleich ansprechen" },
  AMB: { left: "offen ist okay", right: "offen ist unbequem" },
  ORG: { left: "einfach anfangen", right: "erst Schritte klären" },
};

/** ORG-Zweierwahlen: je eine ausgeschriebene Wahl aus dem Optionstext, "eher" oder "deutlich eher" nach Antwort. */
const PREFERENCES: Record<string, { context: string; A: string; B: string }> = {
  "ORG-03": { context: "Wenn mehrere wichtige Aufgaben konkurrieren", A: "hältst du {eher} mehrere davon parallel in Bewegung", B: "konzentrierst du dich {eher} auf wenige und lässt anderes warten" },
  "ORG-04": { context: "Wenn eine Aufgabe länger dauert als gedacht", A: "bringst du sie {eher} zunächst wie geplant zu Ende", B: "passt du deinen weiteren Plan {eher} früh an" },
  "ORG-07": { context: "Wenn während konzentrierter Arbeit eine wichtige neue Anfrage kommt", A: "unterbrichst du {eher} und kümmerst dich um das Neue", B: "bleibst du {eher} bei dem, woran du gerade arbeitest" },
  "ORG-08": { context: "Wenn mehrere kleine Dinge anders laufen als geplant", A: "änderst du deinen Plan {eher} erst, wenn die Abweichungen relevant werden", B: "passt du deinen Plan {eher} schon bei kleineren Veränderungen an" },
};

/**
 * Items, aus denen eine Bereichsrichtung abgeleitet werden darf: ordinal und
 * je Bereich EIN Antwortformat. EXP-01 ("seriousness") und alle Zweierwahlen
 * sind ausgenommen und erscheinen nur als Einzelantwort.
 */
export function patternItems(area: AreaKey) {
  return PRODUCT_ITEMS.filter(
    (i) => i.area_key === area && !["comparative", "behavioral", "seriousness"].includes(i.response_format),
  );
}

export function minAnswered(area: AreaKey) {
  return Math.min(3, patternItems(area).length);
}

/** Muster eines Bereichs aus den gleichformatigen Ordinalantworten - ohne Zahl nach aussen. */
export function areaPattern(profile: ProductProfile, area: AreaKey): AreaPattern {
  const bands = patternItems(area).flatMap((i) => {
    const band = responseBand(profile, i.item_key);
    return band === "lower" || band === "middle" || band === "upper" ? [{ key: i.item_key, band: band as Band }] : [];
  });
  const required = minAnswered(area);
  if (bands.length < required) return { kind: "insufficient", answered: bands.length, required };
  const count = (b: Band) => bands.filter((x) => x.band === b).length;
  for (const band of ["upper", "lower", "middle"] as Band[]) {
    if (count(band) === bands.length) return { kind: "direction", band, strength: "all", exception: null };
  }
  for (const band of ["upper", "lower"] as Band[]) {
    const opposite = band === "upper" ? "lower" : "upper";
    // "Fast alle": hoechstens eine Situation mit "teils/teils", keine im Gegenpol.
    if (bands.length >= 3 && count(band) === bands.length - 1 && count(opposite) === 0) {
      return { kind: "direction", band, strength: "most", exception: bands.find((x) => x.band === "middle")!.key };
    }
  }
  return {
    kind: "mixed",
    upper: bands.filter((x) => x.band === "upper").map((x) => x.key),
    middle: bands.filter((x) => x.band === "middle").map((x) => x.key),
    lower: bands.filter((x) => x.band === "lower").map((x) => x.key),
  };
}

/** Einzelantworten, die nicht in die Bereichsrichtung eingehen - woertlich wiedergegeben. */
function itemNotes(profile: ProductProfile, area: AreaKey): { claim: string; text: string }[] {
  if (area === "EXP") {
    const choice = rawChoice(profile, "EXP-01");
    return choice
      ? [{ claim: "EXP.ITEM.EXP-01", text: `Wie ernst du einen vertrauten Eindruck nimmst, den du noch nicht begründen kannst: „${choice.label}“.` }]
      : [];
  }
  if (area !== "ORG") return [];
  return Object.entries(PREFERENCES).flatMap(([key, copy]) => {
    const choice = rawChoice(profile, key);
    if (!choice || typeof choice.value !== "string") return [];
    const side = choice.value.endsWith("_a") ? "A" : choice.value.endsWith("_b") ? "B" : null;
    if (!side) return [];
    const strong = choice.value.startsWith("strong_");
    return [{ claim: `ORG.ITEM.${key}`, text: `${copy.context}, ${copy[side].replace("{eher}", strong ? "deutlich eher" : "eher")}.` }];
  });
}

export type AreaNarrative = {
  key: AreaKey;
  pattern: AreaPattern;
  /** Interne Claim-ID: Bereich + Regel + Evidenzklasse. */
  claim: string;
  /** Kernaussage - immer vorhanden (notfalls die Aussage, dass nichts ableitbar ist). */
  core: string;
  /** Bei MOST: die eine Situation mit "teils/teils". */
  exception: string | null;
  /** Bei gemischtem Muster: Situationen je Antwortbereich. */
  situations: { label: string; items: string[] }[];
  /** Einzelantworten ausserhalb der Bereichsrichtung (EXP-01, ORG-Zweierwahlen). */
  itemNotes: { claim: string; text: string }[];
  /** Wie viele Situationen des Bereichs ohne Einschaetzung sind - sie fliessen nicht ein. */
  missing: number;
  note: string | null;
  question: string | null;
};

export function areaNarrative(profile: ProductProfile, area: AreaKey): AreaNarrative {
  const copy = COPY[area];
  const pattern = areaPattern(profile, area);
  const notes = itemNotes(profile, area);
  const missing = PRODUCT_ITEMS.filter((i) => i.area_key === area && !rawChoice(profile, i.item_key)).length;
  const base = { key: area, pattern, itemNotes: notes, missing, exception: null, situations: [] };
  if (pattern.kind === "insufficient") {
    return {
      ...base,
      claim: `${area}.INSUFFICIENT`,
      core:
        area === "ORG" && notes.length
          ? "Zu nächsten Schritten und eigenen Zwischenpunkten liegen zu wenige Antworten vor, um etwas daraus abzuleiten."
          : "Für diesen Bereich liegen zu wenige Antworten vor, um etwas daraus abzuleiten.",
      note: null,
      question: null,
    };
  }
  if (pattern.kind === "mixed") {
    const situations = (["upper", "middle", "lower"] as Band[])
      .map((band) => ({ label: copy.bands[band], items: pattern[band].map((k) => SITUATIONS[k]) }))
      .filter((s) => s.items.length);
    return { ...base, claim: `${area}.MIXED`, core: copy.mixed, situations, note: copy.note ?? null, question: copy.question.open };
  }
  const side = pattern.band === "middle" ? null : pattern.band;
  return {
    ...base,
    claim: `${area}.DIRECTION.${pattern.band.toUpperCase()}.${pattern.strength.toUpperCase()}`,
    core: copy.direction[pattern.band],
    exception: pattern.exception
      ? `Nur in einer Situation legst du dich weniger fest: ${SITUATIONS[pattern.exception]}.`
      : null,
    note: copy.note ?? null,
    question: side ? copy.question[side] : copy.question.open,
  };
}

/** Ein kurzer Satz fuer die Bereichskarte - nie staerker als die Kernaussage. */
export function glanceSentence(profile: ProductProfile, area: AreaKey): string {
  const pattern = areaPattern(profile, area);
  if (pattern.kind === "insufficient") return "Noch zu wenige Antworten.";
  return pattern.kind === "mixed" ? COPY[area].short.mixed : COPY[area].short[pattern.band];
}

/**
 * Genau eine Reflexionsfrage fuer den Einzelbericht: aus dem ersten Bereich
 * mit durchgehender Richtung, sonst mit ueberwiegender Richtung, sonst aus
 * dem ersten gemischten Bereich. Feste Bereichsreihenfolge - keine Gewichtung.
 */
export function questionForYou(profile: ProductProfile): { area: AreaKey; question: string; claim: string } | null {
  const all = AREAS.map((a) => ({ area: a.key, n: areaNarrative(profile, a.key) }));
  const pick =
    all.find((x) => x.n.pattern.kind === "direction" && x.n.pattern.band !== "middle" && x.n.pattern.strength === "all") ??
    all.find((x) => x.n.pattern.kind === "direction" && x.n.pattern.band !== "middle") ??
    all.find((x) => x.n.pattern.kind === "mixed");
  return pick && pick.n.question ? { area: pick.area, question: pick.n.question, claim: pick.n.claim } : null;
}

export function individualNarratives(profile: ProductProfile) {
  return AREAS.map((area) => ({ area, narrative: areaNarrative(profile, area.key) }));
}

/** Die Richtung einer Person in einem Bereich - nur, wenn sie getragen ist. */
export function personDirection(profile: ProductProfile, area: AreaKey): "upper" | "lower" | null {
  const p = areaPattern(profile, area);
  return p.kind === "direction" && p.band !== "middle" ? p.band : null;
}

/**
 * Der Ueberblick ("auf einen Blick") darf nicht staerker wirken als der Text:
 * - Richtung: ein Punkt auf der tatsaechlich gewaehlten mittleren Antwort
 *   (unterer Median, keine Interpolation) - er liegt immer im Band der Richtung;
 * - gemischt: kein Punkt, sondern die Spannweite der Antworten;
 * - zu wenige Antworten: nichts.
 * Dieselben Items wie die Bereichsrichtung (ein Antwortformat je Bereich).
 */
export type OverviewMark =
  | { kind: "point"; position: number; label: string; options: readonly { label: string }[] }
  | { kind: "range"; from: number; to: number; fromLabel: string; toLabel: string; options: readonly { label: string }[] }
  | { kind: "none" };

export function overviewMark(profile: ProductProfile, area: AreaKey): OverviewMark {
  const pattern = areaPattern(profile, area);
  if (pattern.kind === "insufficient") return { kind: "none" };
  const choices = patternItems(area)
    .flatMap((i) => {
      const c = rawChoice(profile, i.item_key);
      return c && typeof c.value === "number" ? [c] : [];
    })
    .sort((a, b) => a.position - b.position);
  const options = choices[0].options;
  if (pattern.kind === "direction") {
    const median = choices[Math.floor((choices.length - 1) / 2)];
    return { kind: "point", position: median.position, label: median.label, options };
  }
  const from = choices[0], to = choices.at(-1)!;
  return { kind: "range", from: from.position, to: to.position, fromLabel: from.label, toLabel: to.label, options };
}

// ---------------------------------------------------------------------------
// TEAM-EBENE
// ---------------------------------------------------------------------------
//
// Item fuer Item: dieselben Antwortbereiche, fuer 2, 3 und 4 Personen dieselbe
// Logik, keine Paarmatrix. Hier wird nichts ueber Formate verrechnet - jede
// Situation wird fuer sich verglichen (A/B nur mit A/B).
// Gruppen erscheinen in fester Antwortreihenfolge und nie nach Groesse.
//
// Erlaubt / nicht erlaubt:
// - Aehnlichkeit ist kein Vorteil: keine Saetze wie "das bringt Tempo".
// - Unterschied ist kein Konflikt: keine Prognose, kein "problematisch".
// - Gegenpol ist keine Komplementaritaet: Ergaenzung nur als Bedingung
//   ("koennte sich ergaenzen, wenn ...").
// Hypothesen: BEOBACHTUNG (Situationen in der Karte) -> Arbeitskontext ->
// moegliche Interaktion ("koenntet ihr ...") -> Gespraechsfrage.

type TeamCopy = {
  similar: Record<"upper" | "lower", { text: string; question: string }>;
  /** text = Arbeitshypothese (Moeglichkeit), summary = lebensnaher Satz fuer die Karte. */
  differs: { text: string; question: string; summary: string };
  /** Gespraechskarte (Phase 11.7B): Etikett und Frage aus Teamsicht. */
  card: { label: string; question: string };
};

const TEAM_COPY: Record<AreaKey, TeamCopy> = {
  EVI: {
    similar: {
      upper: { text: "Ihr schaut {alle} lieber noch einmal genauer hin, bevor eine Entscheidung steht.", question: "Wie entscheidet ihr, wenn Informationen unvollständig bleiben – und wer stößt dann die Umsetzung an?" },
      lower: { text: "Ihr {alle} lasst eine erste Einschätzung eher stehen, statt gezielt nach Gegenargumenten zu suchen.", question: "Woran erkennt ihr, dass eine Entscheidung noch einmal geöffnet werden sollte?" },
    },
    differs: {
      summary: "Bei manchen Situationen liegt ihr nah beieinander, bei anderen würdet ihr eher unterschiedlich reagieren. Besonders sichtbar wird das bei der Frage, wann eine Entscheidung noch einmal geöffnet werden sollte.",
      text: "Beim gemeinsamen Entscheiden: Wenn jemand von euch eine Einschätzung noch einmal prüfen möchte und jemand anderes damit weiterarbeiten will, könntet ihr unterschiedlich sehen, wann eine Entscheidung steht. Das könnte sich ergänzen, wenn ihr vorab klärt, wann eine Entscheidung noch einmal geöffnet wird.",
      question: "Welche neue Information ist für euch Anlass, eine Entscheidung noch einmal zu öffnen – und wer darf das anstoßen?",
    },
    card: { label: "Entscheidungen", question: "Wann öffnen wir eine Entscheidung noch einmal – und wann lassen wir sie bewusst stehen?" },
  },
  EXP: {
    similar: {
      upper: { text: "Ihr lasst euch {alle} deutlich von früherer Erfahrung leiten. Spannend wird es, wenn eure Erfahrungen in verschiedene Richtungen zeigen.", question: "Was ist an einer neuen Situation anders als bei euren früheren Erfahrungen?" },
      lower: { text: "Frühere Erfahrung spielt für euch {alle} eher eine kleine Rolle – ihr schätzt Situationen lieber frisch ein.", question: "Was wisst ihr aus ähnlichen Situationen schon, das hier helfen könnte?" },
    },
    differs: {
      summary: "Bei manchen Situationen stützt ihr euch ähnlich stark auf Erfahrung, bei anderen deutlich unterschiedlich – etwa wenn Informationen fehlen oder eine Lösung auf dem Papier überzeugt.",
      text: "Beim Einschätzen einer Lage: Wenn sich jemand von euch stärker auf frühere Erfahrung stützt als jemand anderes, könntet ihr dieselbe Situation unterschiedlich einordnen. Das könnte sich ergänzen, wenn die Erfahrung ausgesprochen und gemeinsam auf den aktuellen Fall geprüft wird.",
      question: "Woran erkennt ihr, ob eine frühere Erfahrung auf die aktuelle Situation übertragbar ist?",
    },
    card: { label: "Erfahrung", question: "Wessen Erfahrung zählt, wenn unsere Erfahrungen in verschiedene Richtungen zeigen?" },
  },
  EL: {
    similar: {
      upper: { text: "Wenn sich etwas im Kleinen testen lässt, probiert ihr es {alle} lieber aus, als lange darüber zu reden.", question: "Wann hat ein Versuch für euch genug Aussagekraft – und wer wertet ihn aus?" },
      lower: { text: "Ihr klärt {alle} lieber erst, bevor ihr etwas im Kleinen ausprobiert.", question: "Bei welcher offenen Frage käme für euch ein kleiner Versuch in Betracht?" },
    },
    differs: {
      summary: "Wenn sich etwas im Kleinen testen ließe, würdet ihr teils unterschiedlich vorgehen: Mal möchte jemand von euch lieber ausprobieren, jemand anderes lieber erst klären.",
      text: "Bei offenen Fragen: Wenn jemand von euch früh etwas ausprobieren möchte und jemand anderes lieber erst klärt, könntet ihr unterschiedlich einschätzen, wann ein Versuch der nächste Schritt ist. Es kann helfen, vorab zu vereinbaren, wann ihr vom Besprechen ins Ausprobieren wechselt.",
      question: "Wie geht ihr vor, wenn jemand testen will und jemand anderes noch offene Fragen klären möchte?",
    },
    card: { label: "Ausprobieren", question: "Wann testen wir im Kleinen, und wann klären wir erst weiter?" },
  },
  VOICE: {
    similar: {
      upper: { text: "Ihr sprecht {alle} an, was euch auffällt – auch kurz vor dem Abschluss.", question: "Wann gilt eine Entscheidung bei euch als abgeschlossen – und was passiert mit einem späten Einwand?" },
      lower: { text: "Ihr wartet {alle} eher ab, statt Einwände gleich anzusprechen, wenn die Runde schon einig ist.", question: "Wann fragt ihr ausdrücklich nach Einwänden, bevor ihr etwas abschließt?" },
    },
    differs: {
      summary: "Bei manchen Situationen würdet ihr Einwände ähnlich früh ansprechen, bei anderen unterschiedlich – etwa wenn die Runde schon abschließen möchte.",
      text: "In Besprechungen: Wenn jemand von euch Einwände eher gleich anspricht als jemand anderes, könnten Einwände unterschiedlich früh sichtbar werden. Feste Gelegenheiten für Rückfragen vor einem Abschluss könnten helfen.",
      question: "Wie schafft ihr Raum für einen Einwand, wenn die Runde schon abschließen möchte?",
    },
    card: { label: "Einwände", question: "Wie sorgen wir dafür, dass Zweifel noch Platz haben, auch wenn wir fast fertig sind?" },
  },
  AMB: {
    similar: {
      upper: { text: "Offene Fragen empfindet ihr {alle} eher als unangenehm. Das beschreibt euer Empfinden, nicht euer Handeln.", question: "Wie haltet ihr offene Fragen fest, damit ihr trotzdem weiterarbeiten könnt?" },
      lower: { text: "Offene Fragen empfindet ihr {alle} eher nicht als unangenehm. Das beschreibt euer Empfinden, nicht euer Handeln.", question: "Wie haltet ihr offene Fragen fest, auch wenn sie euch wenig stören?" },
    },
    differs: {
      summary: "Offene Fragen fühlen sich für euch unterschiedlich an: Was jemand von euch eher als unangenehm empfindet, ist für jemand anderen eher in Ordnung. Das beschreibt euer Empfinden, nicht euer Handeln.",
      text: "Wenn vieles offen ist: Wenn offene Situationen für jemanden von euch unangenehmer sind als für jemand anderen, könntet ihr unterschiedlich viel Klärung brauchen, bevor ihr weiterarbeitet. Das beschreibt das Empfinden, nicht das Handeln. Es kann helfen, offene Fragen und den nächsten Schritt getrennt festzuhalten.",
      question: "Was braucht ihr, um weiterzuarbeiten, solange eine wichtige Frage offen ist?",
    },
    card: { label: "Offene Fragen", question: "Wie lange halten wir eine wichtige Frage offen, bevor wir trotzdem weitermachen?" },
  },
  ORG: {
    similar: {
      upper: { text: "Bei größeren Aufgaben klärt ihr {alle} gern zuerst die nächsten Schritte und setzt euch Zwischenpunkte.", question: "Wer passt euren gemeinsamen Plan an, wenn sich die Lage ändert?" },
      lower: { text: "Bei größeren Aufgaben fangt ihr {alle} eher einfach an, statt zuerst die nächsten Schritte festzulegen.", question: "Wie viel gemeinsamer Plan ist nötig, bevor ihr startet?" },
    },
    differs: {
      summary: "Bei größeren Aufgaben würdet ihr teils unterschiedlich vorgehen: Mal will jemand von euch erst die Schritte klären, jemand anderes lieber einfach anfangen.",
      text: "Bei größeren Vorhaben: Wenn jemand von euch zuerst die nächsten Schritte klärt und jemand anderes lieber einfach anfängt, könntet ihr unterschiedlich viel gemeinsamen Plan erwarten, bevor ihr startet.",
      question: "Wie viel gemeinsamer Plan ist nötig, bevor ihr startet?",
    },
    card: { label: "Arbeit steuern", question: "Wie viel Plan brauchen wir, bevor wir loslegen – und wann passen wir ihn an?" },
  },
};

/** Die Gespraechskarte eines Bereichs (Etikett + Frage), fuer TeamWorkstyleReport. */
export function teamCard(area: AreaKey) {
  return TEAM_COPY[area].card;
}

/** ORG-Zweierwahlen haben eigene Hypothesen - Fokus, Unterbrechung und Planaenderung sind verschiedene Unteraspekte. */
const ORG_ITEM_DIFFERS: Record<string, { text: string; question: string; summary: string }> = {
  "ORG-03": { summary: "Wenn mehrere wichtige Aufgaben konkurrieren, würdet ihr unterschiedlich vorgehen: mehrere Dinge parallel bewegen oder sich auf wenige konzentrieren.", text: "Bei konkurrierenden Aufgaben: Wenn jemand von euch mehrere Dinge parallel bewegt und jemand anderes sich lieber auf wenige konzentriert, könntet ihr unterschiedliche Erwartungen an Prioritäten und Reaktionszeiten haben.", question: "Woran erkennt ihr, was gerade Vorrang hat – und wann darf jemand unterbrochen werden?" },
  "ORG-07": { summary: "Wenn während konzentrierter Arbeit etwas Neues hereinkommt, würdet ihr unterschiedlich reagieren: gleich unterbrechen oder erst bei der laufenden Arbeit bleiben.", text: "Bei neuen Anfragen während konzentrierter Arbeit: Wenn jemand von euch eher unterbricht und jemand anderes eher bei der laufenden Arbeit bleibt, könntet ihr unterschiedlich einschätzen, was sofort Aufmerksamkeit braucht.", question: "Was gilt bei euch als dringend genug, um laufende Arbeit zu unterbrechen?" },
  "ORG-04": { summary: "Wenn eine Aufgabe länger dauert als gedacht, würdet ihr unterschiedlich vorgehen: erst wie geplant zu Ende bringen oder den Plan früh anpassen.", text: "Wenn eine Aufgabe länger dauert als gedacht: Wenn jemand von euch sie zunächst wie geplant zu Ende bringt und jemand anderes den weiteren Plan früh anpasst, könntet ihr unterschiedlich einschätzen, wann der gemeinsame Plan neu sortiert wird.", question: "Wann sortiert ihr einen gemeinsamen Plan neu, wenn eine Aufgabe länger dauert – und wer bringt das ein?" },
  "ORG-08": { summary: "Wenn kleinere Dinge anders laufen als geplant, würdet ihr den Plan unterschiedlich früh anpassen.", text: "Bei kleineren Abweichungen vom Plan: Wenn jemand von euch den Plan schon früh anpasst und jemand anderes erst bei relevanten Abweichungen, könntet ihr unterschiedlich einschätzen, ab wann eine Änderung den gemeinsamen Plan betrifft.", question: "Ab welchem Punkt betrifft eine Abweichung euren gemeinsamen Plan – und wer bringt das ein?" },
};

const BAND_ORDER = ["lower", "middle", "upper", "A", "B"];

export type TeamMemberInput = { person_id: string; name: string; profile: ProductProfile };

export type TeamAreaFinding = {
  key: AreaKey;
  kind: "insufficient" | "similar" | "nuance" | "opposite";
  /** Interne Claim-ID: Bereich + Team-Regel (+ Item bei ORG-Zweierwahl). */
  claim: string;
  summary: string;
  /** Hoechstens zwei Situationen, Gegenpole zuerst. */
  situations: { item: string; label: string; groups: { names: string[]; answers: string[] }[] }[];
  /** Interaktionshypothese (nur bei Gegenpol) oder Beschreibung einer gemeinsamen Richtung. */
  hypothesis: string | null;
  question: string | null;
};

function isOpposite(bands: string[]) {
  const set = new Set(bands);
  return (set.has("lower") && set.has("upper")) || (set.has("A") && set.has("B"));
}

export function teamAreaFinding(people: TeamMemberInput[], area: AreaKey): TeamAreaFinding {
  const items = PRODUCT_ITEMS.filter((i) => i.area_key === area);
  // Nur Situationen, die ALLE beantwortet haben. Fehlende Antworten sind keine Mitte.
  const shared = items.filter((i) => people.every((p) => responseBand(p.profile, i.item_key) !== null));
  const bandsOf = (key: string) => people.map((p) => responseBand(p.profile, key) as string);
  const different = shared.filter((i) => new Set(bandsOf(i.item_key)).size > 1);
  const opposite = different.filter((i) => isOpposite(bandsOf(i.item_key)));
  const allWord = people.length === 2 ? "beide" : "alle";
  const fill = (text: string) => text.replace("{alle}", allWord).replace("{allen}", people.length === 2 ? "beiden" : "allen");

  const situations = [...opposite, ...different.filter((i) => !opposite.includes(i))].slice(0, 2).map((i) => ({
    item: i.item_key,
    label: SITUATIONS[i.item_key] ?? PREFERENCES[i.item_key]?.context ?? i.prompt,
    groups: [...new Set(bandsOf(i.item_key))]
      .sort((a, b) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b))
      .map((band) => ({
        names: people.filter((p) => responseBand(p.profile, i.item_key) === band).map((p) => p.name),
        answers: [...new Set(people.filter((p) => responseBand(p.profile, i.item_key) === band).map((p) => rawChoice(p.profile, i.item_key)!.label))],
      })),
  }));

  if (shared.length < Math.min(3, items.length)) {
    return { key: area, kind: "insufficient", claim: `${area}.TEAM.INSUFFICIENT`, summary: "Für diesen Bereich fehlen gemeinsame Antworten – daraus leiten wir nichts ab.", situations: [], hypothesis: null, question: null };
  }
  if (!different.length) {
    const directions = people.map((p) => personDirection(p.profile, area));
    const common = directions.every((d) => d && d === directions[0]) ? directions[0] : null;
    const note = common ? TEAM_COPY[area].similar[common] : null;
    return {
      key: area,
      kind: "similar",
      claim: `${area}.TEAM.SIMILAR.${common ? common.toUpperCase() : "NO_DIRECTION"}`,
      // Mit gemeinsamer Richtung sagt der Satz, welche; sonst nur "nah beieinander".
      summary: note ? fill(note.text) : "In diesem Bereich liegt ihr nah beieinander. Das legt noch nicht fest, wie ihr im Alltag zusammen handelt.",
      situations: [],
      hypothesis: null,
      question: note ? note.question : null,
    };
  }
  if (!opposite.length) {
    // Nuancen nicht kuenstlich prominent: kein Gegensatz, nur kleine Unterschiede.
    return {
      key: area,
      kind: "nuance",
      claim: `${area}.TEAM.NUANCE`,
      summary:
        different.length === 1
          ? "Ihr liegt hier nah beieinander; nur in einer Situation antwortet ihr etwas unterschiedlich."
          : "Ihr liegt hier überwiegend nah beieinander; kleine Unterschiede gibt es bei einzelnen Situationen.",
      situations,
      hypothesis: null,
      question: null,
    };
  }
  // Die Hypothese gehoert zur ersten gezeigten Situation mit Gegenpol: bei
  // einer ORG-Zweierwahl deren eigener Unteraspekt, sonst der Bereich.
  const first = opposite[0].item_key;
  const specificKey = area === "ORG" && ORG_ITEM_DIFFERS[first] ? first : undefined;
  const differs = specificKey ? ORG_ITEM_DIFFERS[specificKey] : TEAM_COPY[area].differs;
  return {
    key: area,
    kind: "opposite",
    claim: `${area}.TEAM.OPPOSITE${specificKey ? `.${specificKey}` : ""}`,
    summary: differs.summary,
    situations,
    hypothesis: differs.text,
    question: differs.question,
  };
}
