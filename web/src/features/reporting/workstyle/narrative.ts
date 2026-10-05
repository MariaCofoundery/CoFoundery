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

/** Worte fuer die beiden Pole je Antwortformat - aus den Antwortoptionen, nicht neu erfunden. */
const POLES: Record<string, { upper: string; lower: string }> = {
  likelihood: { upper: "eher wahrscheinlich", lower: "eher unwahrscheinlich" },
  influence: { upper: "eher stark", lower: "eher wenig" },
  ambiguity_discomfort: { upper: "eher unangenehm", lower: "eher nicht unangenehm" },
};

/**
 * Bereichstexte. Jede Richtungsaussage paraphrasiert nur die Items des
 * Bereichs (Iteminhalt im Kommentar) und bleibt "in den beschriebenen
 * Situationen". Fragen sind Reflexionsangebote ohne unterstellte Schwierigkeit.
 */
type AreaCopy = {
  direction: Record<Band, string>;
  mixed: string;
  question: Record<"upper" | "lower" | "open", string>;
  note?: string;
};

const COPY: Record<AreaKey, AreaCopy> = {
  EVI: {
    direction: {
      // EVI-01 Gegenargumente, -02 unsichere Annahme, -03/-05 Gegeninformation/Gegenpunkt, -06 widersprüchliche Quellen
      upper: "In den beschriebenen Situationen prüfst du eine Einschätzung eher noch einmal: Du suchst nach Gegenargumenten, prüfst unsichere Annahmen und gehst Gegeninformationen oder Widersprüchen nach.",
      lower: "In den beschriebenen Situationen prüfst du eine Einschätzung eher nicht noch einmal gezielt – etwa durch die Suche nach Gegenargumenten oder das Nachgehen von Gegeninformationen.",
      middle: "Ob du eine Einschätzung noch einmal gezielt prüfst, beantwortest du in den beschriebenen Situationen mit „teils/teils“.",
    },
    mixed: "Ob du eine Einschätzung noch einmal gezielt prüfst, beantwortest du je nach Situation unterschiedlich.",
    question: {
      upper: "Woran erkennst du, dass genug geprüft ist und du entscheiden kannst?",
      lower: "Welche neue Information wäre für dich ein guter Grund, eine Entscheidung noch einmal zu öffnen?",
      open: "In welchen Situationen prüfst du eine Einschätzung noch einmal – und wann reicht dir deine erste?",
    },
  },
  EXP: {
    direction: {
      // EXP-02 Papierlösung, -03 Gleichstand, -04 wiederholtes Problem, -06 fehlende Informationen (alle "influence")
      upper: "In den beschriebenen Situationen beeinflussen frühere Erfahrungen deine Einschätzung eher stark – etwa wenn eine Lösung auf dem Papier überzeugt oder Informationen fehlen.",
      lower: "In den beschriebenen Situationen beeinflussen frühere Erfahrungen deine Einschätzung eher wenig – etwa wenn eine Lösung auf dem Papier überzeugt oder Informationen fehlen.",
      middle: "Wie stark frühere Erfahrungen deine Einschätzung beeinflussen, beantwortest du in den beschriebenen Situationen mit „teilweise“.",
    },
    mixed: "Wie stark frühere Erfahrungen deine Einschätzung beeinflussen, beantwortest du je nach Situation unterschiedlich.",
    question: {
      upper: "Woran erkennst du, ob eine frühere Erfahrung auf die aktuelle Situation übertragbar ist?",
      lower: "In welchen Situationen wäre es dir wichtig, gezielt nach früheren Erfahrungen zu fragen?",
      open: "In welchen Situationen stützt du dich auf Erfahrung – und wann schaust du lieber neu hin?",
    },
  },
  EL: {
    direction: {
      // EL-01 vor Festlegung testen, -02 Test vorschlagen, -04 einfache Version zeigen, -05 verändern und erneut testen
      upper: "Wenn sich etwas mit wenig Aufwand ausprobieren lässt, ist ein kleiner Versuch in den beschriebenen Situationen für dich eher ein naheliegender Schritt.",
      lower: "Auch wenn sich etwas mit wenig Aufwand ausprobieren ließe, ist ein kleiner Versuch in den beschriebenen Situationen für dich eher nicht der naheliegende Schritt.",
      middle: "Ob du etwas zuerst im Kleinen ausprobierst, beantwortest du in den beschriebenen Situationen mit „teils/teils“.",
    },
    mixed: "Ob du etwas zuerst im Kleinen ausprobierst, beantwortest du je nach Situation unterschiedlich.",
    question: {
      upper: "Woran merkst du, dass ein Versuch mehr bringt als ein weiteres Gespräch – und was machst du mit dem Ergebnis?",
      lower: "Bei welchen Fragen würdest du einen kleinen Versuch in Betracht ziehen – und bei welchen nicht?",
      open: "Bei welchen Fragen probierst du lieber aus – und wann willst du vorher mehr wissen?",
    },
  },
  VOICE: {
    direction: {
      // VOICE-01 Gegenpunkt trotz Einigkeit, -02 Unangenehmes, -03 vertagtes Thema, -04 abweichende Einschätzung, -05 noch nicht so weit
      upper: "In den beschriebenen Situationen sprichst du Einwände, Unangenehmes und noch offene Punkte eher an – auch wenn die Runde schon einig ist oder abschließen möchte.",
      lower: "In den beschriebenen Situationen sprichst du Einwände, Unangenehmes und noch offene Punkte eher nicht von dir aus an, wenn die Runde schon einig ist oder abschließen möchte.",
      middle: "Ob du einen Einwand oder offenen Punkt ansprichst, beantwortest du in den beschriebenen Situationen mit „teils/teils“.",
    },
    mixed: "Ob du einen Einwand oder offenen Punkt ansprichst, beantwortest du je nach Situation unterschiedlich.",
    question: {
      upper: "Wie möchtest du mit einem späten Einwand umgehen, wenn eine Entscheidung eigentlich schon steht?",
      lower: "In welchen Situationen wäre es dir wichtig, einen Einwand trotzdem anzusprechen?",
      open: "In welchen Situationen sprichst du einen Einwand an – und wann eher nicht?",
    },
  },
  AMB: {
    direction: {
      // AMB-01 widersprüchliche Rückmeldungen, -02 mehrere Erklärungen, -04 Lage wird offener, -05 Weiterarbeiten mit offener Frage
      upper: "Widersprüchliche Rückmeldungen, mehrere mögliche Erklärungen oder eine offene wichtige Frage empfindest du in den beschriebenen Situationen eher als unangenehm.",
      lower: "Widersprüchliche Rückmeldungen, mehrere mögliche Erklärungen oder eine offene wichtige Frage empfindest du in den beschriebenen Situationen eher nicht als unangenehm.",
      middle: "Wie unangenehm offene Situationen für dich sind, beantwortest du in den beschriebenen Fällen mit „teils/teils“.",
    },
    mixed: "Wie unangenehm offene Situationen für dich sind, beantwortest du je nach Situation unterschiedlich.",
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
      upper: "Bei größeren oder längeren Aufgaben klärst du in den beschriebenen Situationen eher zuerst nächste Schritte und setzt dir selbst Zwischenpunkte.",
      lower: "Bei größeren oder längeren Aufgaben klärst du in den beschriebenen Situationen eher nicht zuerst nächste Schritte und setzt dir eher keine eigenen Zwischenpunkte.",
      middle: "Ob du bei größeren Aufgaben zuerst nächste Schritte klärst und dir Zwischenpunkte setzt, beantwortest du mit „teils/teils“.",
    },
    mixed: "Ob du bei größeren Aufgaben zuerst nächste Schritte klärst und dir Zwischenpunkte setzt, beantwortest du unterschiedlich.",
    question: {
      upper: "Wie viel Vorstruktur brauchst du – und wann wird sie dir zu viel?",
      lower: "Wie viel gemeinsamer Plan hilft dir, bevor du mit anderen an etwas Größerem startest?",
      open: "Wann hilft dir ein Plan – und wann arbeitest du lieber ohne?",
    },
  },
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

const capitalize = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

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

function poleWords(area: AreaKey) {
  return POLES[patternItems(area)[0]?.response_format ?? "likelihood"] ?? POLES.likelihood;
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
  const poles = poleWords(area);
  const notes = itemNotes(profile, area);
  const missing = PRODUCT_ITEMS.filter((i) => i.area_key === area && !rawChoice(profile, i.item_key)).length;
  const base = { key: area, pattern, itemNotes: notes, missing, exception: null, situations: [] };
  if (pattern.kind === "insufficient") {
    return {
      ...base,
      claim: `${area}.INSUFFICIENT`,
      core:
        area === "ORG" && notes.length
          ? "Zu nächsten Schritten und eigenen Zwischenpunkten liegen zu wenige Antworten für eine Aussage vor."
          : "Für diesen Bereich liegen zu wenige Antworten vor, um eine Aussage zu machen.",
      note: null,
      question: null,
    };
  }
  if (pattern.kind === "mixed") {
    const situations = [
      { label: capitalize(poles.upper), items: pattern.upper.map((k) => SITUATIONS[k]) },
      { label: area === "EXP" ? "Teilweise" : "Teils/teils", items: pattern.middle.map((k) => SITUATIONS[k]) },
      { label: capitalize(poles.lower), items: pattern.lower.map((k) => SITUATIONS[k]) },
    ].filter((s) => s.items.length);
    return { ...base, claim: `${area}.MIXED`, core: copy.mixed, situations, note: copy.note ?? null, question: copy.question.open };
  }
  const side = pattern.band === "middle" ? null : pattern.band;
  return {
    ...base,
    claim: `${area}.DIRECTION.${pattern.band.toUpperCase()}.${pattern.strength.toUpperCase()}`,
    core: copy.direction[pattern.band],
    exception: pattern.exception
      ? `Ausnahme mit „${area === "EXP" ? "teilweise" : "teils/teils"}“: ${SITUATIONS[pattern.exception]}.`
      : null,
    note: copy.note ?? null,
    question: side ? copy.question[side] : copy.question.open,
  };
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
  differs: { text: string; question: string };
};

const TEAM_COPY: Record<AreaKey, TeamCopy> = {
  EVI: {
    similar: {
      upper: { text: "In den beschriebenen Situationen prüft ihr {alle} eine Einschätzung eher noch einmal.", question: "Wie entscheidet ihr, wenn Informationen unvollständig bleiben – und wer stößt dann die Umsetzung an?" },
      lower: { text: "In den beschriebenen Situationen prüft ihr {alle} eine Einschätzung eher nicht noch einmal gezielt.", question: "Woran erkennt ihr, dass eine Entscheidung noch einmal geöffnet werden sollte?" },
    },
    differs: { text: "Beim gemeinsamen Entscheiden: Wenn eine Person eine Einschätzung noch einmal prüfen möchte und eine andere damit weiterarbeiten will, könntet ihr unterschiedlich sehen, wann eine Entscheidung steht. Das könnte sich ergänzen, wenn ihr vorab klärt, wann eine Entscheidung noch einmal geöffnet wird.", question: "Welche neue Information ist für euch Anlass, eine Entscheidung noch einmal zu öffnen – und wer darf das anstoßen?" },
  },
  EXP: {
    similar: {
      upper: { text: "In den beschriebenen Situationen beeinflusst frühere Erfahrung eure Einschätzung {allen} eher stark.", question: "Was ist an einer neuen Situation anders als bei euren früheren Erfahrungen?" },
      lower: { text: "In den beschriebenen Situationen beeinflusst frühere Erfahrung eure Einschätzung {allen} eher wenig.", question: "Was wisst ihr aus ähnlichen Situationen schon, das hier helfen könnte?" },
    },
    differs: { text: "Beim Einschätzen einer Lage: Wenn eine Person sich stärker auf frühere Erfahrung stützt als eine andere, könntet ihr dieselbe Situation unterschiedlich einordnen. Das könnte sich ergänzen, wenn die Erfahrung ausgesprochen und gemeinsam auf den aktuellen Fall geprüft wird.", question: "Woran erkennt ihr, ob eine frühere Erfahrung auf die aktuelle Situation übertragbar ist?" },
  },
  EL: {
    similar: {
      upper: { text: "In den beschriebenen Situationen ist ein kleiner Versuch für euch {alle} eher ein naheliegender Schritt.", question: "Wann hat ein Versuch für euch genug Aussagekraft – und wer wertet ihn aus?" },
      lower: { text: "In den beschriebenen Situationen ist ein kleiner Versuch für euch {alle} eher nicht der naheliegende Schritt.", question: "Bei welcher offenen Frage käme für euch ein kleiner Versuch in Betracht?" },
    },
    differs: { text: "Bei offenen Fragen: Wenn eine Person früh etwas ausprobieren möchte und eine andere eher nicht, könntet ihr unterschiedlich einschätzen, wann ein Versuch der nächste Schritt ist. Es kann helfen, vorab zu vereinbaren, wann ihr vom Besprechen ins Ausprobieren wechselt.", question: "Wie geht ihr vor, wenn eine Person testen will und eine andere noch offene Fragen klären möchte?" },
  },
  VOICE: {
    similar: {
      upper: { text: "In den beschriebenen Situationen sprecht ihr {alle} Einwände und offene Punkte eher an.", question: "Wann gilt eine Entscheidung bei euch als abgeschlossen – und was passiert mit einem späten Einwand?" },
      lower: { text: "In den beschriebenen Situationen sprecht ihr {alle} Einwände und offene Punkte eher nicht von euch aus an.", question: "Wann fragt ihr ausdrücklich nach Einwänden, bevor ihr etwas abschließt?" },
    },
    differs: { text: "In Besprechungen: Wenn eine Person Einwände eher anspricht als eine andere, könnten Einwände unterschiedlich früh sichtbar werden. Feste Gelegenheiten für Rückfragen vor einem Abschluss könnten helfen.", question: "Wie schafft ihr Raum für einen Einwand, wenn die Runde schon abschließen möchte?" },
  },
  AMB: {
    similar: {
      upper: { text: "Offene Situationen empfindet ihr {alle} in den beschriebenen Fällen eher als unangenehm. Das beschreibt das Empfinden, nicht das Handeln.", question: "Wie haltet ihr offene Fragen fest, damit ihr trotzdem weiterarbeiten könnt?" },
      lower: { text: "Offene Situationen empfindet ihr {alle} in den beschriebenen Fällen eher nicht als unangenehm. Das beschreibt das Empfinden, nicht das Handeln.", question: "Wie haltet ihr offene Fragen fest, auch wenn sie euch wenig stören?" },
    },
    differs: { text: "Wenn vieles offen ist: Wenn offene Situationen für eine Person unangenehmer sind als für eine andere, könntet ihr unterschiedlich viel Klärung brauchen, bevor ihr weiterarbeitet. Das beschreibt das Empfinden, nicht das Handeln. Es kann helfen, offene Fragen und den nächsten Schritt getrennt festzuhalten.", question: "Was braucht ihr, um weiterzuarbeiten, solange eine wichtige Frage offen ist?" },
  },
  ORG: {
    similar: {
      upper: { text: "Bei größeren Aufgaben klärt ihr {alle} in den beschriebenen Situationen eher zuerst nächste Schritte und setzt euch Zwischenpunkte.", question: "Wer passt euren gemeinsamen Plan an, wenn sich die Lage ändert?" },
      lower: { text: "Bei größeren Aufgaben klärt ihr {alle} in den beschriebenen Situationen eher nicht zuerst nächste Schritte.", question: "Wie viel gemeinsamer Plan ist nötig, bevor ihr startet?" },
    },
    differs: { text: "Bei größeren Vorhaben: Wenn eine Person zuerst nächste Schritte klärt und eine andere eher nicht, könntet ihr unterschiedlich viel gemeinsamen Plan erwarten, bevor ihr startet.", question: "Wie viel gemeinsamer Plan ist nötig, bevor ihr startet?" },
  },
};

/** ORG-Zweierwahlen haben eigene Hypothesen - Fokus, Unterbrechung und Planaenderung sind verschiedene Unteraspekte. */
const ORG_ITEM_DIFFERS: Record<string, { text: string; question: string }> = {
  "ORG-03": { text: "Bei konkurrierenden Aufgaben: Wenn eine Person mehrere Dinge parallel bewegt und eine andere sich lieber auf wenige konzentriert, könntet ihr unterschiedliche Erwartungen an Prioritäten und Reaktionszeiten haben.", question: "Woran erkennt ihr, was gerade Vorrang hat – und wann darf jemand unterbrochen werden?" },
  "ORG-07": { text: "Bei neuen Anfragen während konzentrierter Arbeit: Wenn eine Person eher unterbricht und eine andere eher bei der laufenden Arbeit bleibt, könntet ihr unterschiedlich einschätzen, was sofort Aufmerksamkeit braucht.", question: "Was gilt bei euch als dringend genug, um laufende Arbeit zu unterbrechen?" },
  "ORG-04": { text: "Wenn eine Aufgabe länger dauert als gedacht: Wenn eine Person sie zunächst wie geplant zu Ende bringt und eine andere den weiteren Plan früh anpasst, könntet ihr unterschiedlich einschätzen, wann der gemeinsame Plan neu sortiert wird.", question: "Wann sortiert ihr einen gemeinsamen Plan neu, wenn eine Aufgabe länger dauert – und wer bringt das ein?" },
  "ORG-08": { text: "Bei kleineren Abweichungen vom Plan: Wenn eine Person den Plan schon früh anpasst und eine andere erst bei relevanten Abweichungen, könntet ihr unterschiedlich einschätzen, ab wann eine Änderung den gemeinsamen Plan betrifft.", question: "Ab welchem Punkt betrifft eine Abweichung euren gemeinsamen Plan – und wer bringt das ein?" },
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
    return { key: area, kind: "insufficient", claim: `${area}.TEAM.INSUFFICIENT`, summary: "Für diesen Bereich fehlen gemeinsame Antworten. Daraus wird nichts abgeleitet.", situations: [], hypothesis: null, question: null };
  }
  if (!different.length) {
    const directions = people.map((p) => personDirection(p.profile, area));
    const common = directions.every((d) => d && d === directions[0]) ? directions[0] : null;
    const note = common ? TEAM_COPY[area].similar[common] : null;
    return {
      key: area,
      kind: "similar",
      claim: `${area}.TEAM.SIMILAR.${common ? common.toUpperCase() : "NO_DIRECTION"}`,
      summary: "In den gemeinsam beantworteten Situationen antwortet ihr ähnlich. Das legt noch nicht fest, wie ihr im Alltag zusammen handelt.",
      situations: [],
      hypothesis: note ? fill(note.text) : null,
      question: note ? note.question : null,
    };
  }
  const share =
    different.length === 1
      ? "In einer Situation antwortet ihr unterschiedlich, sonst ähnlich."
      : different.length / shared.length >= 0.6
        ? "In den meisten gemeinsam beantworteten Situationen antwortet ihr unterschiedlich."
        : "Teils antwortet ihr ähnlich, teils unterschiedlich.";
  if (!opposite.length) {
    return {
      key: area,
      kind: "nuance",
      claim: `${area}.TEAM.NUANCE`,
      summary: `${share} Die Unterschiede liegen zwischen einer mittleren und einer klaren Antwort – eher Nuancen als Gegensätze.`,
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
    summary: `${share} In mindestens einer Situation liegen eure Antworten auf entgegengesetzten Seiten.`,
    situations,
    hypothesis: differs.text,
    question: differs.question,
  };
}
