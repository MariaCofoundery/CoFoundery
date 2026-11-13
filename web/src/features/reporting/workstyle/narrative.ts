import type { AppLocale } from "@/i18n/config";
import { COPY_EN, COPY_V5_EN, POLES_EN, SITUATIONS_EN, PREFERENCES_EN, TEAM_EN, ORG_DIFFERS_EN, EVI_DIRECTION_V3_EN } from "@/features/reporting/workstyle/displayCopyEn";
import { workstyleDisplayOptions } from "@/features/instruments/workstyle/display";
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
 *   (`patternItems`), und zwar die der Fassung, aus der das Profil stammt.
 *   Zweierwahlen (ORG, seit v4 auch EVI-01/-03/-05) und in v3 EXP-01 (Format
 *   "seriousness") werden nicht mit anderen Formaten verrechnet, sondern als
 *   einzelne Antworten wiedergegeben (`itemNotes`). Seit v4 ist EXP-01 eine
 *   Einfluss-Frage wie die uebrigen EXP-Fragen und zaehlt zur Richtung.
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
 * Locale changes display copy only; the evidence and claim selection stay unchanged.
 */
import {
  AREAS,
  PRODUCT_ITEMS,
  chosenPole,
  isPoleAxisItem,
  poleSpot,
  productItemsFor,
  rawChoice,
  responseBand,
  workstyleGeneration,
  type AreaKey,
  type ProductProfile,
} from "@/features/reporting/workstyle/model";
import type { WorkstyleItem } from "@/features/instruments/workstyle/registry";

export type Band = "lower" | "middle" | "upper";
export type MixedVariant = "both" | "upper" | "lower";
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
  "EXP-01": "einen ersten Eindruck „das kenne ich“ bei einem neuen Vorgehen einfließen lassen",
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
  "ORG-03": "mehrere wichtige Aufgaben, die gleichzeitig um deine Aufmerksamkeit konkurrieren",
  "ORG-04": "eine Aufgabe, die länger dauert als gedacht",
  "ORG-07": "eine wichtige neue Anfrage mitten in konzentrierter Arbeit",
  "ORG-08": "mehrere kleine Dinge, die anders laufen als geplant",
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
  /**
   * Gemischtes Muster (Phase 1, Profil). Vorher EIN Satz, der immer beide Pole
   * behauptete ("Manches laesst du stehen, anderes pruefst du ..."), auch wenn
   * die Antworten nur oben und in der Mitte lagen - und auf der Karte nur
   * "Je nach Situation.". Jetzt je nachdem, welche Pole tatsaechlich vorkommen:
   *   both   oben UND unten beantwortet
   *   upper  oben und Mitte, nichts unten
   *   lower  unten und Mitte, nichts oben
   */
  mixedBy: Record<MixedVariant, string>;
  /** Ein kurzer Satz fuer die Bereichskarte "auf einen Blick" (getragene Richtung). */
  short: Record<Band, string>;
  /** Beschriftung der Situationen je Antwortbereich (gemischtes Muster). */
  bands: Record<Band, string>;
  question: Record<"upper" | "lower" | "open", string>;
  note?: string;
};

const COPY_LEGACY: Record<AreaKey, AreaCopy> = {
  EVI: {
    direction: {
      // v4: nur EVI-02 unsichere Annahme und -06 widersprüchliche Quellen; EVI-01/-03/-05 sind Zweierwahlen
      upper: "Hängt euer nächster Schritt an einer unsicheren Annahme oder widersprechen sich seriöse Quellen, schaust du lieber noch einmal genauer hin, bevor du dich festlegst.",
      lower: "Hängt euer nächster Schritt an einer unsicheren Annahme oder widersprechen sich seriöse Quellen, ist genaueres Nachprüfen für dich eher nicht der nächste Schritt.",
      middle: "Ob du eine unsichere Annahme oder widersprüchliche Quellen genauer prüfst, lässt du eher offen – mal eher ja, mal eher nein.",
    },
    // Gemischt: je nachdem, welche Pole die Antworten tatsaechlich enthalten (Phase 1, Profil).
    mixedBy: { both: "Manches lässt du stehen, anderes prüfst du noch einmal genauer.", upper: "Manches prüfst du noch einmal genauer, bei anderem legst du dich nicht fest.", lower: "Manches lässt du eher stehen, bei anderem legst du dich nicht fest." },
    short: { upper: "Du schaust lieber noch einmal genauer hin.", lower: "Du lässt eine erste Einschätzung eher stehen.", middle: "Meist irgendwo dazwischen." },
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
    // Gemischt: je nachdem, welche Pole die Antworten tatsaechlich enthalten (Phase 1, Profil).
    mixedBy: { both: "In manchen Situationen stützt du dich stark auf Erfahrung, in anderen kaum.", upper: "In manchen Situationen stützt du dich stark auf Erfahrung, in anderen nur teilweise.", lower: "In manchen Situationen spielt Erfahrung für dich kaum eine Rolle, in anderen teilweise." },
    short: { upper: "Du baust auf Erfahrung.", lower: "Du schätzt eher frisch ein.", middle: "Erfahrung zählt teilweise." },
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
    // Gemischt: je nachdem, welche Pole die Antworten tatsaechlich enthalten (Phase 1, Profil).
    mixedBy: { both: "Manchmal testest du lieber zuerst, manchmal klärst du lieber zuerst.", upper: "Manchmal testest du lieber zuerst, in anderen Situationen legst du dich nicht fest.", lower: "Manchmal klärst du lieber zuerst, in anderen Situationen legst du dich nicht fest." },
    short: { upper: "Du probierst lieber erst aus.", lower: "Du klärst lieber erst.", middle: "Meist irgendwo dazwischen." },
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
    // Gemischt: je nachdem, welche Pole die Antworten tatsaechlich enthalten (Phase 1, Profil).
    mixedBy: { both: "Manches sprichst du gleich an, bei anderem wartest du eher ab.", upper: "Manches sprichst du gleich an, bei anderem legst du dich nicht fest.", lower: "Bei manchem wartest du eher ab, bei anderem legst du dich nicht fest." },
    short: { upper: "Du sprichst Dinge gleich an.", lower: "Du wartest eher ab.", middle: "Meist irgendwo dazwischen." },
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
    // Gemischt: je nachdem, welche Pole die Antworten tatsaechlich enthalten (Phase 1, Profil).
    mixedBy: { both: "Manche offenen Situationen sind dir unangenehm, andere kaum.", upper: "Manche offenen Situationen sind dir unangenehm, bei anderen liegst du in der Mitte.", lower: "Manche offenen Situationen sind für dich in Ordnung, bei anderen liegst du in der Mitte." },
    short: { upper: "Offenes ist dir eher unbequem.", lower: "Offenes ist für dich okay.", middle: "Teils unbequem, teils okay." },
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
    // Gemischt: je nachdem, welche Pole die Antworten tatsaechlich enthalten (Phase 1, Profil).
    mixedBy: { both: "Bei manchen Aufgaben klärst du zuerst die Schritte, bei anderen fängst du einfach an.", upper: "Bei manchen Aufgaben klärst du zuerst die Schritte, bei anderen legst du dich nicht fest.", lower: "Bei manchen Aufgaben fängst du einfach an, bei anderen legst du dich nicht fest." },
    short: { upper: "Du klärst erst die Schritte.", lower: "Du fängst lieber einfach an.", middle: "Meist irgendwo dazwischen." },
    bands: { upper: "Hier klärst du eher erst die Schritte", middle: "Hier kommt es darauf an", lower: "Hier fängst du eher einfach an" },
    question: {
      upper: "Wie viel Vorstruktur brauchst du – und wann wird sie dir zu viel?",
      lower: "Wie viel gemeinsamer Plan hilft dir, bevor du mit anderen an etwas Größerem startest?",
      open: "Wann hilft dir ein Plan – und wann arbeitest du lieber ohne?",
    },
  },
};

/**
 * Fassung 5: EVI und ORG haben neue Fragen (Zweierwahlen mit Gegenpolen; ORG: Fokus und Planstabilitaet).
 * Die uebrigen Bereiche behalten ihre Texte. Aeltere Profile (v3, v4) lesen weiter COPY_LEGACY.
 */
const COPY: Record<AreaKey, AreaCopy> = {
  ...COPY_LEGACY,
  EVI: {
    ...COPY_LEGACY.EVI,
    direction: {
      upper: "Wenn eine Entscheidung ansteht oder etwas dagegen spricht, schaust du lieber noch einmal genauer hin: Du prüfst Annahmen, suchst Gegenargumente und gehst Widersprüchen nach, bevor du dich festlegst.",
      lower: "Eine Einschätzung lässt du eher stehen, statt vorab alles zu prüfen: Du startest mit dem, was du hast, und achtest unterwegs auf handfeste Gegengründe und neue Fakten.",
      middle: COPY_LEGACY.EVI.direction.middle,
    },
    mixedBy: { ...COPY_LEGACY.EVI.mixedBy, both: "Manchmal prüfst du noch einmal genauer, manchmal lässt du eine Einschätzung eher stehen." },
  },
  ORG: {
    direction: {
      upper: "Bei mehreren Aufgaben oder Abweichungen hältst du eher Kurs: Du konzentrierst dich auf wenige Dinge, bleibst bei der laufenden Arbeit und änderst deinen Plan erst, wenn Abweichungen ins Gewicht fallen.",
      lower: "Du bleibst eher beweglich: Du hältst mehrere Dinge parallel in Bewegung, reagierst schnell auf Neues und passt deinen Plan früh an.",
      middle: "Ob du Kurs hältst oder deinen Plan anpasst, lässt du meistens offen.",
    },
    mixedBy: { both: "Mal hältst du eher Kurs, mal passt du deinen Plan eher flexibel an.", upper: "Bei manchem hältst du Kurs, bei anderem legst du dich nicht fest.", lower: "Bei manchem passt du eher flexibel an, bei anderem legst du dich nicht fest." },
    short: { upper: "Du hältst eher Kurs.", lower: "Du bleibst eher flexibel.", middle: "Meist irgendwo dazwischen." },
    bands: { upper: "Hier hältst du eher Kurs", middle: "Hier kommt es darauf an", lower: "Hier passt du eher flexibel an" },
    question: {
      upper: "Wann ist ein stabiler Kurs hilfreich – und woran erkennst du, dass er angepasst werden sollte?",
      lower: "Wie viel Verlässlichkeit brauchen andere von deinem Plan, wenn du flexibel bleibst?",
      open: "Wann hältst du Kurs – und wann passt du deinen Plan lieber an?",
    },
  },
};

/** Welche Texte zu welchem Profil gehoeren: die der Fassung, aus der es stammt. */
function areaCopy(profile: ProductProfile, area: AreaKey, locale: AppLocale): AreaCopy {
  const current = workstyleGeneration(profile) === "v5";
  if (locale === "en") return current ? COPY_V5_EN[area] : COPY_EN[area];
  return current ? COPY[area] : COPY_LEGACY[area];
}

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
  ORG: { left: "flexibel anpassen", right: "Kurs stabil halten" },
};

/** Fruehere Fassung (v3): EVI-01/-03/-05 waren Wahrscheinlichkeitsfragen und gehoerten zur Richtung. */
const EVI_DIRECTION_V3: Record<Band, string> = {
  // EVI-01 Gegenargumente, -02 unsichere Annahme, -03/-05 Gegeninformation/Gegenpunkt, -06 widersprüchliche Quellen
  upper: "Wenn eine Entscheidung ansteht, schaust du lieber noch einmal genauer hin: Du suchst nach Gegenargumenten, prüfst unsichere Annahmen und gehst Informationen nach, die dagegen sprechen.",
  lower: "Eine Einschätzung, die steht, lässt du eher stehen: Gezielt nach Gegenargumenten zu suchen oder Gegeninformationen nachzugehen, ist in diesen Situationen für dich eher nicht der nächste Schritt.",
  middle: "Ob du eine Einschätzung noch einmal prüfst, lässt du in den meisten Situationen offen – mal eher ja, mal eher nein.",
};

/** Zweierwahlen (ORG, seit v4 auch EVI): je eine ausgeschriebene Wahl aus dem Optionstext, "eher" oder "deutlich eher" nach Antwort. */
const PREFERENCES: Record<string, { context: string; A: string; B: string }> = {
  "EVI-01": { context: "Wenn dir eine von mehreren Möglichkeiten spontan am besten gefällt", A: "suchst du {eher} vor der Festlegung gezielt nach Gegenargumenten", B: "startest du {eher} mit deinem Favoriten und achtest unterwegs auf handfeste Gegengründe" },
  "EVI-03": { context: "Wenn nach einer Entscheidung neue Informationen dagegen sprechen", A: "nimmst du die Entscheidung {eher} direkt wieder auf und prüfst, ob du umsteuerst", B: "bleibst du {eher} zunächst dabei und prüfst, ob die neuen Informationen schwer genug wiegen" },
  "EVI-05": { context: "Wenn jemand im Team einen nachvollziehbaren Gegenpunkt einbringt", A: "gehst du den Punkt {eher} direkt durch und hinterfragst deine Einschätzung", B: "bleibst du {eher} zunächst bei deiner Einschätzung und suchst weitere Hinweise" },
  "ORG-01": { context: "Wenn du vor einem größeren Vorhaben stehst", A: "legst du dir {eher} zuerst konkrete Schritte zurecht, bevor du richtig loslegst", B: "startest du {eher} direkt mit einem Einstieg und sortierst den Rest unterwegs" },
  "ORG-02": { context: "Wenn eine Aufgabe über mehrere Wochen ohne feste Zwischentermine läuft", A: "arbeitest du {eher} in deinem Rhythmus auf das Ziel zu und merkst an der Sache selbst, ob du im Plan bist", B: "setzt du dir {eher} selbst feste Zwischenziele, um zu prüfen, ob du im Zeitplan liegst" },
  "ORG-03": { context: "Wenn mehrere wichtige Aufgaben konkurrieren", A: "hältst du {eher} mehrere davon parallel in Bewegung", B: "konzentrierst du dich {eher} auf wenige und lässt anderes warten" },
  "ORG-04": { context: "Wenn eine Aufgabe länger dauert als gedacht", A: "bringst du sie {eher} zunächst wie geplant zu Ende", B: "passt du deinen weiteren Plan {eher} früh an" },
  "ORG-07": { context: "Wenn während konzentrierter Arbeit eine wichtige neue Anfrage kommt", A: "unterbrichst du {eher} und kümmerst dich um das Neue", B: "bleibst du {eher} bei dem, woran du gerade arbeitest" },
  "ORG-08": { context: "Wenn mehrere kleine Dinge anders laufen als geplant", A: "änderst du deinen Plan {eher} erst, wenn die Abweichungen relevant werden", B: "passt du deinen Plan {eher} schon bei kleineren Veränderungen an" },
};

/**
 * Items, aus denen eine Bereichsrichtung abgeleitet werden darf: ordinal und
 * je Bereich EIN Antwortformat. Alle Zweierwahlen und in v3 EXP-01
 * ("seriousness") sind ausgenommen und erscheinen nur als Einzelantwort.
 * Ohne Profil gilt die aktuelle Fassung.
 */
export function patternItems(area: AreaKey, items: readonly WorkstyleItem[] = PRODUCT_ITEMS) {
  // Fassung 5: Zweierwahlen mit Gegenpolen tragen die Richtung (EVI, EL, VOICE, ORG Fokus/Planstabilitaet). Ohne Achse
  // (ORG Struktur/Fluss, alle Zweierwahlen aelterer Fassungen) bleiben sie Einzelantworten.
  return items.filter(
    (i) => i.area_key === area && (isPoleAxisItem(i) || !["comparative", "behavioral", "seriousness"].includes(i.response_format)),
  );
}

export function minAnswered(area: AreaKey, items: readonly WorkstyleItem[] = PRODUCT_ITEMS) {
  return Math.min(3, patternItems(area, items).length);
}

/** Muster eines Bereichs aus den gleichformatigen Ordinalantworten - ohne Zahl nach aussen. */
export function areaPattern(profile: ProductProfile, area: AreaKey): AreaPattern {
  const items = productItemsFor(profile);
  const bands = patternItems(area, items).flatMap((i) => {
    const band = responseBand(profile, i.item_key);
    return band === "lower" || band === "middle" || band === "upper" ? [{ key: i.item_key, band: band as Band }] : [];
  });
  const required = minAnswered(area, items);
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
function itemNotes(profile: ProductProfile, area: AreaKey, locale: AppLocale): { claim: string; text: string }[] {
  const items = productItemsFor(profile);
  if (area === "EXP") {
    // Nur v3: dort hat EXP-01 ein eigenes Format; seit v4 zaehlt es zur Richtung.
    if (items.find((i) => i.item_key === "EXP-01")?.response_format !== "seriousness") return [];
    const choice = rawChoice(profile, "EXP-01");
    return choice
      ? [{ claim: "EXP.ITEM.EXP-01", text: locale === "en" ? `How seriously you take a familiar impression before you can explain it: “${displayChoiceLabel(profile, "EXP-01", locale)}”.` : `Wie ernst du einen vertrauten Eindruck nimmst, den du noch nicht begründen kannst: „${choice.label}“.` }]
      : [];
  }
  return Object.entries(PREFERENCES).flatMap(([key, copy]) => {
    const item = items.find((i) => i.item_key === key);
    if (item?.area_key !== area || item.response_format !== "comparative" || isPoleAxisItem(item)) return [];
    const choice = rawChoice(profile, key);
    if (!choice || typeof choice.value !== "string") return [];
    const side = choice.value.endsWith("_a") ? "A" : choice.value.endsWith("_b") ? "B" : null;
    if (!side) return [];
    const strong = choice.value.startsWith("strong_");
    return [{ claim: `${area}.ITEM.${key}`, text: locale === "en" ? `${PREFERENCES_EN[key].context}, ${PREFERENCES_EN[key][side].replace("{preference}", strong ? "strongly prefer to" : "tend to")}.` : `${copy.context}, ${copy[side].replace("{eher}", strong ? "deutlich eher" : "eher")}.` }];
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
  situations: { band: Band; label: string; items: string[] }[];
  /** Einzelantworten ausserhalb der Bereichsrichtung (Zweierwahlen, in v3 EXP-01). */
  itemNotes: { claim: string; text: string }[];
  /** Wie viele Situationen des Bereichs ohne Einschaetzung sind - sie fliessen nicht ein. */
  missing: number;
  note: string | null;
  question: string | null;
};

export function areaNarrative(profile: ProductProfile, area: AreaKey, locale: AppLocale = "de"): AreaNarrative {
  const copy = areaCopy(profile, area, locale);
  const pattern = areaPattern(profile, area);
  const notes = itemNotes(profile, area, locale);
  const missing = productItemsFor(profile).filter((i) => i.area_key === area && !rawChoice(profile, i.item_key)).length;
  const base = { key: area, pattern, itemNotes: notes, missing, exception: null, situations: [] };
  if (pattern.kind === "insufficient") {
    return {
      ...base,
      claim: `${area}.INSUFFICIENT`,
      core:
        area === "ORG" && workstyleGeneration(profile) === "v5"
          ? locale === "en" ? "There are not enough responses about priorities and plan changes to describe a pattern yet." : "Zu Prioritäten und Planänderungen liegen zu wenige Antworten vor, um etwas daraus abzuleiten."
          : area === "ORG" && notes.length
          ? locale === "en" ? "There are not enough responses about next steps and checkpoints to describe a pattern yet." : "Zu nächsten Schritten und eigenen Zwischenpunkten liegen zu wenige Antworten vor, um etwas daraus abzuleiten."
          : area === "EVI" && notes.length
            ? locale === "en" ? "There are not enough responses about uncertain assumptions and conflicting sources to describe a pattern yet." : "Zu unsicheren Annahmen und widersprüchlichen Quellen liegen zu wenige Antworten vor, um etwas daraus abzuleiten."
          : locale === "en" ? "There are not enough responses to describe a pattern in this area yet." : "Für diesen Bereich liegen zu wenige Antworten vor, um etwas daraus abzuleiten.",
      note: null,
      question: null,
    };
  }
  if (pattern.kind === "mixed") {
    const situations = (["upper", "middle", "lower"] as Band[])
      .map((band) => ({ band, label: copy.bands[band], items: pattern[band].map((k) => (locale === "en" ? SITUATIONS_EN : SITUATIONS)[k]) }))
      .filter((s) => s.items.length);
    return { ...base, claim: `${area}.MIXED`, core: copy.mixedBy[mixedVariant(pattern)], situations, note: copy.note ?? null, question: copy.question.open };
  }
  const side = pattern.band === "middle" ? null : pattern.band;
  return {
    ...base,
    claim: `${area}.DIRECTION.${pattern.band.toUpperCase()}.${pattern.strength.toUpperCase()}`,
    core: area === "EVI" && workstyleGeneration(profile) === "v3" ? (locale === "en" ? EVI_DIRECTION_V3_EN : EVI_DIRECTION_V3)[pattern.band] : copy.direction[pattern.band],
    exception: pattern.exception
      ? locale === "en" ? `In one situation you are less definite: ${SITUATIONS_EN[pattern.exception]}.` : `Nur in einer Situation legst du dich weniger fest: ${SITUATIONS[pattern.exception]}.`
      : null,
    note: copy.note ?? null,
    question: side ? copy.question[side] : copy.question.open,
  };
}

/** Ein kurzer Satz fuer die Bereichskarte - nie staerker als die Kernaussage. */
export function glanceSentence(profile: ProductProfile, area: AreaKey, locale: AppLocale = "de"): string {
  const pattern = areaPattern(profile, area);
  if (pattern.kind === "insufficient") return locale === "en" ? "Not enough responses yet." : "Noch zu wenige Antworten.";
  const copy = areaCopy(profile, area, locale);
  return pattern.kind === "mixed" ? copy.mixedBy[mixedVariant(pattern)] : copy.short[pattern.band];
}

/** Welche Pole ein gemischtes Muster tatsaechlich enthaelt - nur aus den Antworten, ohne Gewichtung. */
export function mixedVariant(pattern: Extract<AreaPattern, { kind: "mixed" }>): MixedVariant {
  if (pattern.upper.length > 0 && pattern.lower.length > 0) return "both";
  return pattern.upper.length > 0 ? "upper" : "lower";
}

/**
 * Genau eine Reflexionsfrage fuer den Einzelbericht: aus dem ersten Bereich
 * mit durchgehender Richtung, sonst mit ueberwiegender Richtung, sonst aus
 * dem ersten gemischten Bereich. Feste Bereichsreihenfolge - keine Gewichtung.
 */
export function questionForYou(profile: ProductProfile, locale: AppLocale = "de"): { area: AreaKey; question: string; claim: string } | null {
  const all = AREAS.map((a) => ({ area: a.key, n: areaNarrative(profile, a.key, locale) }));
  const pick =
    all.find((x) => x.n.pattern.kind === "direction" && x.n.pattern.band !== "middle" && x.n.pattern.strength === "all") ??
    all.find((x) => x.n.pattern.kind === "direction" && x.n.pattern.band !== "middle") ??
    all.find((x) => x.n.pattern.kind === "mixed");
  return pick && pick.n.question ? { area: pick.area, question: pick.n.question, claim: pick.n.claim } : null;
}

export function individualNarratives(profile: ProductProfile, locale: AppLocale = "de") {
  return AREAS.map((area) => ({ area, narrative: areaNarrative(profile, area.key, locale) }));
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

/** Beschriftung der fuenf Marken einer Pol-Achse (Fassung 5): links/rechts je "deutlich eher" und "eher", Mitte leer. */
function axisOptions(area: AreaKey, locale: AppLocale): { label: string }[] {
  const poles = (locale === "en" ? POLES_EN : AREA_POLES)[area];
  const strong = locale === "en" ? "clearly more: " : "deutlich eher: ";
  const lean = locale === "en" ? "more: " : "eher: ";
  return [{ label: strong + poles.left }, { label: lean + poles.left }, { label: "" }, { label: lean + poles.right }, { label: strong + poles.right }];
}

/**
 * Die beantworteten Situationen eines Bereichs mit ihrer Stelle auf der Skala. Skalenfragen: die gewaehlte Stufe.
 * Zweierwahlen mit Gegenpolen (Fassung 5): die Seite des gewaehlten Pols, "deutlich eher" aussen, "eher" innen.
 */
function placedChoices(profile: ProductProfile, area: AreaKey, locale: AppLocale) {
  const items = patternItems(area, productItemsFor(profile));
  const axis = items.length > 0 && items.every(isPoleAxisItem);
  const options: readonly { label: string }[] = axis ? axisOptions(area, locale) : items[0] ? workstyleDisplayOptions(items[0], locale) : [];
  const spots = items
    .flatMap((item) => {
      if (axis) {
        const position = poleSpot(profile, item.item_key);
        return position === null ? [] : [{ item, position }];
      }
      const choice = rawChoice(profile, item.item_key);
      return choice && typeof choice.value === "number" ? [{ item, position: choice.position }] : [];
    })
    .sort((x, y) => x.position - y.position);
  return { options, spots };
}

export function overviewMark(profile: ProductProfile, area: AreaKey, locale: AppLocale = "de"): OverviewMark {
  const pattern = areaPattern(profile, area);
  if (pattern.kind === "insufficient") return { kind: "none" };
  const { options, spots } = placedChoices(profile, area, locale);
  if (pattern.kind === "direction") {
    const median = spots[Math.floor((spots.length - 1) / 2)];
    return { kind: "point", position: median.position, label: options[median.position].label, options };
  }
  const from = spots[0], to = spots.at(-1)!;
  return { kind: "range", from: from.position, to: to.position, fromLabel: options[from.position].label, toLabel: options[to.position].label, options };
}

/**
 * Jede beantwortete Situation eines Bereichs als Punkt auf der Skala - fuer „Auf einen Blick" (Einzelperson).
 *
 * Dieselben Items und dieselben Antworten wie `overviewMark` und die Bereichsrichtung: Nichts wird neu
 * gerechnet. Die Punkte machen sichtbar, WORAUS Richtung oder Spannweite entstehen (Haeufung = durchgehend,
 * Streuung = je nach Situation). Es gibt keine Gewichtung, keine Summe, keinen Wert - und nichts, wenn der Bereich
 * zu wenige Antworten hat.
 */
export type SituationDot = { itemKey: string; position: number; situation: string; answer: string };

export function situationDots(profile: ProductProfile, area: AreaKey, locale: AppLocale = "de"): SituationDot[] {
  if (areaPattern(profile, area).kind === "insufficient") return [];
  const { options, spots } = placedChoices(profile, area, locale);
  const situations = locale === "en" ? SITUATIONS_EN : SITUATIONS;
  return spots.map(({ item, position }) => ({ itemKey: item.item_key, position, situation: situations[item.item_key] ?? item.item_key, answer: options[position]?.label ?? "" }));
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
      lower: { text: "Eine Einschätzung lasst ihr {alle} eher stehen, statt vorab alles noch einmal genauer zu prüfen.", question: "Woran erkennt ihr, dass eine Entscheidung noch einmal geöffnet werden sollte?" },
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
      upper: { text: "Bei mehreren Aufgaben oder Abweichungen haltet ihr {alle} eher Kurs: wenige Dinge zugleich und Planänderungen erst, wenn sie ins Gewicht fallen.", question: "Wer passt euren gemeinsamen Plan an, wenn sich die Lage doch ändert?" },
      lower: { text: "Ihr bleibt {alle} eher beweglich: mehrere Dinge parallel und Pläne früh angepasst.", question: "Woran erkennen andere, woran sie bei euch sind, wenn sich Pläne oft ändern?" },
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
export function teamCard(area: AreaKey, locale: AppLocale = "de") {
  return (locale === "en" ? TEAM_EN : TEAM_COPY)[area].card;
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

export function teamAreaFinding(people: TeamMemberInput[], area: AreaKey, locale: AppLocale = "de"): TeamAreaFinding {
  // Ein Team vergleicht immer genau eine Fassung (validProductTeam).
  const items = (people.length ? productItemsFor(people[0].profile) : PRODUCT_ITEMS).filter((i) => i.area_key === area);
  // Nur Situationen, die ALLE beantwortet haben. Fehlende Antworten sind keine Mitte.
  const shared = items.filter((i) => people.every((p) => responseBand(p.profile, i.item_key) !== null));
  const bandsOf = (key: string) => people.map((p) => responseBand(p.profile, key) as string);
  const different = shared.filter((i) => new Set(bandsOf(i.item_key)).size > 1);
  const opposite = different.filter((i) => isOpposite(bandsOf(i.item_key)));
  const allWord = people.length === 2 ? "beide" : "alle";
  const fill = (text: string) => text.replace("{all}", people.length === 2 ? "both" : "all").replace("{alle}", allWord).replace("{allen}", people.length === 2 ? "beiden" : "allen");

  const situations = [...opposite, ...different.filter((i) => !opposite.includes(i))].slice(0, 2).map((i) => ({
    item: i.item_key,
    // Zweierwahlen mit ihrem Anlass, Skalenfragen mit der Situation.
    label: i.response_format === "comparative"
      ? (locale === "en" ? PREFERENCES_EN : PREFERENCES)[i.item_key]?.context ?? (locale === "en" ? SITUATIONS_EN : SITUATIONS)[i.item_key] ?? i.prompt
      : (locale === "en" ? SITUATIONS_EN : SITUATIONS)[i.item_key] ?? i.prompt,
    groups: [...new Set(bandsOf(i.item_key))]
      .sort((a, b) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b))
      .map((band) => ({
        names: people.filter((p) => responseBand(p.profile, i.item_key) === band).map((p) => p.name),
        answers: [...new Set(people.filter((p) => responseBand(p.profile, i.item_key) === band).map((p) => displayChoiceLabel(p.profile, i.item_key, locale)!))],
      })),
  }));

  if (shared.length < Math.min(3, items.length)) {
    return { key: area, kind: "insufficient", claim: `${area}.TEAM.INSUFFICIENT`, summary: locale === "en" ? "There are not enough shared responses in this area to describe a pattern." : "Für diesen Bereich fehlen gemeinsame Antworten – daraus leiten wir nichts ab.", situations: [], hypothesis: null, question: null };
  }
  if (!different.length) {
    const directions = people.map((p) => personDirection(p.profile, area));
    const common = directions.every((d) => d && d === directions[0]) ? directions[0] : null;
    const note = common ? (locale === "en" ? TEAM_EN : TEAM_COPY)[area].similar[common] : null;
    return {
      key: area,
      kind: "similar",
      claim: `${area}.TEAM.SIMILAR.${common ? common.toUpperCase() : "NO_DIRECTION"}`,
      // Mit gemeinsamer Richtung sagt der Satz, welche; sonst nur "nah beieinander".
      summary: note ? fill(note.text) : locale === "en" ? "Your responses are close in this area. This does not determine how you work together day to day." : "In diesem Bereich liegt ihr nah beieinander. Das legt noch nicht fest, wie ihr im Alltag zusammen handelt.",
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
          ? locale === "en" ? "Your responses are close here; they differ slightly in just one situation." : "Ihr liegt hier nah beieinander; nur in einer Situation antwortet ihr etwas unterschiedlich."
          : locale === "en" ? "Your responses are mostly close here, with small differences in individual situations." : "Ihr liegt hier überwiegend nah beieinander; kleine Unterschiede gibt es bei einzelnen Situationen.",
      situations,
      hypothesis: null,
      question: null,
    };
  }
  // Die Hypothese gehoert zur ersten gezeigten Situation mit Gegenpol: bei
  // einer ORG-Zweierwahl deren eigener Unteraspekt, sonst der Bereich.
  const first = opposite[0].item_key;
  const specificKey = area === "ORG" && ORG_ITEM_DIFFERS[first] ? first : undefined;
  const differs = specificKey ? (locale === "en" ? ORG_DIFFERS_EN : ORG_ITEM_DIFFERS)[specificKey] : (locale === "en" ? TEAM_EN : TEAM_COPY)[area].differs;
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

const FACET_POLES: Record<string, { de: string; en: string }> = {
  struktur: { de: "zuerst Struktur", en: "structure first" },
  fluss: { de: "im Fluss arbeiten", en: "working in flow" },
};

/** Localize the selected label without changing its value or position. */
export function displayChoiceLabel(profile: ProductProfile, key: string, locale: AppLocale) {
  const choice = rawChoice(profile, key);
  const item = productItemsFor(profile).find(i => i.item_key === key);
  if (!choice || !item) return null;
  // Fassung 5: statt "deutlich eher A" der Pol, den die Person gewaehlt hat.
  const picked = chosenPole(profile, key);
  if (picked && item.area_key) {
    const spot = poleSpot(profile, key);
    const poles = (locale === "en" ? POLES_EN : AREA_POLES)[item.area_key as AreaKey];
    const text = spot === null ? FACET_POLES[picked.pole]?.[locale === "en" ? "en" : "de"] : spot <= 1 ? poles.left : poles.right;
    if (text) return `${locale === "en" ? (picked.strong ? "clearly more: " : "more: ") : picked.strong ? "deutlich eher: " : "eher: "}${text}`;
  }
  return workstyleDisplayOptions(item, locale)[choice.position].label;
}
