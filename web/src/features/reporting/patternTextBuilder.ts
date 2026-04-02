import {
  buildSelfReportSelection,
  SELF_REPORT_SELECTION_DEBUG_CASES,
  type SelfReportSignal,
  type SelfReportStrengthBand,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

export type Pattern = {
  title: string;
  description: string;
};

type PatternEntry = {
  title: string;
  description: string | ((band: SelfReportStrengthBand) => string);
};

type PatternMap = Record<FounderDimensionKey, Record<SelfReportTendencyKey, PatternEntry>>;

const PATTERN_TEXT: PatternMap = {
  Unternehmenslogik: {
    left: {
      title: "Tragfähig statt schnell",
      description:
        "Du gibst Themen Raum, die das Unternehmen belastbarer machen und spaeter noch tragen. Bei Wachstum, Struktur oder Produktfragen schaust du frueh auf Fundament statt nur auf Beschleunigung. Dadurch fuehlen sich Entscheidungen oft solide an, schnelle Hebel werden aber haeufig spaeter geprueft. Im Team zeigt sich das vor allem dann, wenn andere schon ueber Expansion oder Geschwindigkeit sprechen und du zuerst wissen willst, ob das Modell dafuer schon stabil genug ist.",
    },
    center: {
      title: "Wirkung und Aufbau",
      description: (band) =>
        band === "balanced"
          ? "Du wechselst sichtbar zwischen Aufbau und Hebel. Bei einer Chance zaehlt fuer dich zuerst die Tragfaehigkeit, bei der naechsten zuerst das Marktfenster. Deine Staerke ist diese Beweglichkeit, fuer andere bleibt aber nicht immer sofort klar, welche Logik gerade fuehrt. Im Team zeigt sich das vor allem dann, wenn du in einem Meeting erst Substanz betonst und spaeter denselben Vorschlag wieder ueber Reichweite und Hebel einordnest."
          : "Oft haeltst du Aufbau und Wirkung gleichzeitig im Blick, statt dich frueh auf nur eine Seite festzulegen. Dadurch pruefst du Chancen auf Tragfaehigkeit und auf Zug zugleich. Wenn das unausgesprochen bleibt, zieht dieselbe Option leicht in zwei Richtungen. Im Team zeigt sich das vor allem dann, wenn ein Vorschlag gleichzeitig belastbar und attraktiv wirkt und du beides parallel stark machst.",
    },
    right: {
      title: "Hebel zuerst sehen",
      description:
        "Du sortierst neue Themen frueh danach, ob sie Reichweite, Zugang oder Momentum bringen. In Gespraechen ziehst du Chancen eher nach vorn, wenn der Hebel schnell sichtbar ist. Wenn andere zuerst auf Stabilitaet und Fundament schauen, sprecht ihr leicht ueber zwei verschiedene Prioritaeten. Im Team zeigt sich das vor allem dann, wenn eine neue Option auftaucht und du schon ueber den naechsten Marktzugang sprichst, waehrend andere noch die Belastbarkeit des Modells pruefen wollen.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Erst prüfen, dann festlegen",
      description:
        "Du willst verstehen, worauf eine Entscheidung steht, bevor du dich festlegst. Im Alltag machst du eher noch einmal Annahmen, Luecken und Gegenargumente sichtbar, statt sie zu ueberspringen. Unter Zeitdruck wirkt das auf andere schnell wie eine zusaetzliche Schleife, auch wenn du nur die Grundlage klaeren willst. Im Team zeigt sich das vor allem dann, wenn andere schon einen naechsten Schritt festhalten wollen und du noch offene Punkte auf den Tisch bringst.",
    },
    center: {
      title: "Prüfen und entscheiden",
      description: (band) =>
        band === "balanced"
          ? "Du schaltest zwischen genauer Pruefung und einem klaren Punkt um. Manche Entscheidungen willst du erst gruendlich klaeren, bei anderen gehst du frueh in den naechsten Schritt. Deine Staerke ist diese Anpassungsfaehigkeit, fuer andere bleibt aber nicht immer klar, wann du in welchen Modus wechselst. Im Team zeigt sich das vor allem dann, wenn eine Frage erst offen diskutiert wird und du sie wenig spaeter schon fuer entscheidbar haeltst."
          : "Oft pruefst du kurz und ziehst dann einen klaren Schluss. Das haelt dich beweglich zwischen Sorgfalt und Tempo. Fuer andere kann genau dieser Wechsel schwer lesbar werden, wenn ihr den Umschaltpunkt nicht aussprecht. Im Team zeigt sich das vor allem dann, wenn du nach kurzer Klaerung schon festlegen willst und andere dieselbe Diskussion noch als offen erleben.",
    },
    right: {
      title: "Lieber entscheiden als kreisen",
      description:
        "Du setzt eher einen naechsten Schritt, sobald fuer dich genug Kontur da ist. In Besprechungen merkst du schnell, wann weitere Analyse fuer dich nichts mehr klaert. Langes Weiterdrehen kostet dich sichtbar Energie, und andere spuern frueh, wann du innerlich schon entschieden hast. Im Team zeigt sich das vor allem dann, wenn du eine Richtung schon umsetzen willst und andere dieselbe Frage noch weiter absichern moechten.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Mit Leitplanken voran",
      description:
        "Du gehst lieber los, wenn Grenzen, Kosten und Puffer sichtbar genug sind. Im Alltag denkst du bei einem Schritt nicht nur die Chance, sondern auch den Preis und die Folgen mit. Offensivere Mitgruender erleben das schnell als Bremse, vor allem wenn sie laengst testen wollen. Im Team zeigt sich das vor allem dann, wenn andere schon starten oder zusagen wollen und du vorher noch Stop-Kriterien oder Puffer klaeren willst.",
    },
    center: {
      title: "Mut mit Augenmaß",
      description: (band) =>
        band === "balanced"
          ? "Du liest Risiko nicht immer gleich. Bei einem Schritt willst du erst Absicherung, beim naechsten reicht dir schon ein plausibler Hebel fuer Bewegung. Deine Staerke ist diese Anpassung an die Lage, fuer andere bleibt aber nicht immer klar, wo deine Schwelle in diesem Fall liegt. Im Team zeigt sich das vor allem dann, wenn du einen Vorschlag einmal schnell mittraegst und beim naechsten aehnlichen Schritt ploetzlich mehr Sicherung willst."
          : "Oft entscheidest du danach, wann Absicherung reicht und wann ein mutigerer Schritt mehr bringt. Dadurch bleibst du weder im Vorsichtsmuster haengen noch springst du blind. Ohne klare Worte dazu wird im Team aber schnell unterschiedlich gelesen, welches Risiko gerade noch okay ist. Im Team zeigt sich das vor allem dann, wenn eine Chance auf dem Tisch liegt und nicht sofort klar ist, ob du sie als vertretbar oder als zu offen einschaetzt.",
    },
    right: {
      title: "Chancen aktiv spielen",
      description:
        "Du gehst schneller in Tests, Wetten und Bewegung, wenn du darin echten Spielraum siehst. Im Alltag liest du Unsicherheit eher als Preis fuer Fortschritt als als Grund zu warten. Fuer vorsichtigere Mitgruender entsteht dabei schnell Druck, weil du frueher bereit bist, etwas zu riskieren. Im Team zeigt sich das vor allem dann, wenn du in einem offenen Marktfenster schon handeln willst und andere erst die Downside sauber begrenzen wollen.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Eigenraum hält Tempo",
      description:
        "Du arbeitest am besten, wenn Zustaendigkeiten klar sind und du nicht jeden Zwischenschritt teilen musst. Im Alltag gehst du lieber autonom vor, statt Arbeit in viele Schleifen zu ziehen. Wer mehr Mitsicht braucht, fuehlt sich dabei schnell zu spaet eingebunden. Im Team zeigt sich das vor allem dann, wenn du erst mit einem belastbaren Zwischenstand kommst und andere frueher Einblick erwartet haetten.",
    },
    center: {
      title: "Nähe bewusst dosieren",
      description: (band) =>
        band === "balanced"
          ? "Du wechselst im Arbeiten zwischen Eigenraum und enger Rueckkopplung. Bei einem Thema willst du erst allein vorarbeiten, beim naechsten frueh gemeinsam draufschauen. Deine Staerke ist diese Flexibilitaet, fuer andere bleibt aber nicht immer klar, welchen Modus du gerade erwartest. Im Team zeigt sich das vor allem dann, wenn du bei einem Projekt sehr frueh abstimmst und beim naechsten erst spaet sichtbar wirst."
          : "Oft dosierst du Austausch so, dass er Orientierung gibt, aber nicht jeden Schritt begleitet. Das haelt dich beweglich zwischen autonomem Arbeiten und engerem Zusammenspiel. Unklarheit darueber kostet hier schneller Energie als echte Meinungsverschiedenheit. Im Team zeigt sich das vor allem dann, wenn ihr denselben Arbeitsstand unterschiedlich abstimmungsintensiv behandelt.",
    },
    right: {
      title: "Im Loop bleiben",
      description:
        "Du arbeitest lieber mit engem Austausch als im stillen Nebeneinander. Im Alltag willst du wissen, wo Dinge stehen, was entschieden ist und wo etwas noch hakt. Fuer autonomere Menschen wird Abstimmung damit schnell zur Daueraufgabe, auch wenn du eigentlich nur Verbindung halten willst. Im Team zeigt sich das vor allem dann, wenn du frueh Zwischenstaende sehen willst und andere dieselbe Arbeit lieber erst spaeter teilen.",
    },
  },
  Commitment: {
    left: {
      title: "Fokus mit Grenzen",
      description:
        "Du gibst dem Startup Gewicht, ohne alles andere dauerhaft darum herum zu sortieren. Im Alltag planst du Verfuegbarkeit und Einsatz so, dass die Arbeit traegt, aber nicht jeden Bereich ueberrollt. Wenn im Team dauernde Praesenz still vorausgesetzt wird, entsteht auf deiner Seite schnell Druck. Im Team zeigt sich das vor allem dann, wenn andere fuer eine Phase mehr Einsatz erwarten, als du realistisch zugesagt hast.",
    },
    center: {
      title: "Intensität bewusst steuern",
      description: (band) =>
        band === "balanced"
          ? "Du schaltest dein Einsatzniveau sichtbar hoch und wieder herunter, statt immer im selben Modus zu bleiben. In einer Phase bist du sehr praesenz, in der naechsten bewusst begrenzter. Deine Staerke ist diese Anpassungsfaehigkeit, fuer andere bleibt aber nicht immer klar, welches Prioritaetsniveau du gerade erwartest. Im Team zeigt sich das vor allem dann, wenn du in einer intensiven Woche viel Zug machst und kurz darauf wieder deutlich integrierter arbeitest."
          : "Oft passt du deinen Einsatz an die Lage an, statt ihn dauerhaft gleich hoch zu fahren. Das gibt dir Spielraum zwischen Fokus und Begrenzung. Ohne explizite Absprachen wird daraus aber schnell eine stille Differenz bei Erwartungen. Im Team zeigt sich das vor allem dann, wenn fuer die einen gerade Hochphase ist und fuer dich der Einsatz schon wieder in einen ruhigeren Modus wechselt.",
    },
    right: {
      title: "Alles auf Fokus",
      description:
        "Du behandelst das Startup klar als Schwerpunkt und liest Zusammenarbeit auch ueber dieses Fokusniveau. Im Alltag zeigt sich das an hoher Verfuegbarkeit, viel Praesenz und einem klaren Fokus auf die Sache. Wer Intensitaet anders taktet, merkt das schnell an deinem Anspruch auf Verbindlichkeit und Praesenz. Im Team zeigt sich das vor allem dann, wenn du in einer Phase sofort mehr Einsatz hochziehst und andere ihren Rahmen nicht in gleichem Mass mitbewegen.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Erst sortieren, dann ansprechen",
      description:
        "Du gehst nicht sofort in die Auseinandersetzung, wenn ein Unterschied spuerbar wird. Im Alltag nimmst du eher kurz Abstand, bevor du heikle Punkte klar ansprichst. Fuer andere bleibt dadurch manchmal laenger offen, wie ernst ein Thema fuer dich schon ist. Im Team zeigt sich das vor allem dann, wenn nach einem irritierenden Moment fuer andere zunaechst Ruhe ist und du das Thema erst spaeter wieder aufmachst.",
    },
    center: {
      title: "Den Moment setzen",
      description: (band) =>
        band === "balanced"
          ? "Du entscheidest nicht immer gleich, wann du einen Unterschied ansprichst. Manche Themen legst du sofort auf den Tisch, andere erst mit etwas Abstand. Deine Staerke ist dieses Gespuer fuer Timing, fuer andere bleibt aber nicht immer klar, wann bei dir aus Spannung wirklich Klaerung wird. Im Team zeigt sich das vor allem dann, wenn du einen Widerspruch einmal direkt markierst und einen anderen erst am naechsten Tag wieder aufgreifst."
          : "Oft waehlst du zwischen direkter Ansprache und mehr Timing. Das hilft dir, heikle Themen nicht unnötig zu verschaerfen und sie trotzdem nicht ganz liegen zu lassen. Fuer andere bleibt dabei aber nicht immer sofort erkennbar, wann jetzt wirklich Klartext kommt. Im Team zeigt sich das vor allem dann, wenn ein Unterschied zwar spuerbar ist, aber noch offen bleibt, ob du ihn sofort oder spaeter aufmachen willst.",
    },
    right: {
      title: "Spannungen früh aufmachen",
      description:
        "Du sprichst Unterschiede lieber an, als sie lange mitlaufen zu lassen. Im Alltag zeigt sich das dort, wo du Dinge eher direkt auf den Tisch legst als sie vorsichtig zu umkreisen. Sensiblere Gegenueber fuehlen sich davon schnell unter Zug, auch wenn du nur rasch klaeren willst. Im Team zeigt sich das vor allem dann, wenn du nach einer strittigen Entscheidung sofort in die Klaerung gehst und andere erst Abstand brauchen.",
    },
  },
};

function resolvePatternEntry(signal: SelfReportSignal): Pattern {
  const entry = PATTERN_TEXT[signal.dimension][signal.tendencyKey];
  return {
    title: entry.title,
    description:
      typeof entry.description === "function" ? entry.description(signal.strengthBand) : entry.description,
  };
}

export function buildPatterns(patternDimensions: SelfReportSignal[]): Pattern[] {
  return patternDimensions.slice(0, 3).map((signal) => resolvePatternEntry(signal));
}

export function buildPatternExamples() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    patterns: buildPatterns(buildSelfReportSelection(entry.scores).patternDimensions),
  }));
}

export function buildPatternsFromScores(scores: SelfAlignmentReport["scoresA"]) {
  return buildPatterns(buildSelfReportSelection(scores).patternDimensions);
}
