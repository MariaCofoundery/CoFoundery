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
      title: "Hebel zuerst sehen",
      description:
        "Du sortierst Themen früh danach, ob sie Reichweite schaffen und das Unternehmen spürbar nach vorn bringen. Gerade bei Chancen, Prioritäten oder neuen Initiativen fragst du schnell nach Wirkung und Zug. Aufbaufragen rutschen dabei leichter nach hinten, vor allem wenn andere stärker auf Stabilität und Fundament schauen.",
    },
    center: {
      title: "Wirkung und Aufbau",
      description: (band) =>
        band === "balanced"
          ? "Du schaltest sichtbar zwischen Hebel und Aufbau um, je nachdem, was die Lage gerade verlangt. In einem Moment zählt für dich Marktwirkung, im nächsten eher Tragfähigkeit und saubere Substanz. Entscheidend ist dann, dass im Team klar bleibt, woran ihr euch gerade orientiert."
          : "Oft hältst du Wirkung und Aufbau gleichzeitig im Blick, statt dich früh auf nur eine Seite festzulegen. Dadurch prüfst du Chancen nicht nur auf Zug, sondern auch auf Tragfähigkeit. Wenn das im Team unausgesprochen bleibt, zieht ihr Entscheidungen leichter in verschiedene Richtungen.",
    },
    right: {
      title: "Tragfähig statt schnell",
      description:
        "Du gibst Themen Raum, die das Unternehmen belastbarer machen und später noch tragen. Bei Wachstum, Struktur oder Produktfragen schaust du früh auf Fundament statt nur auf Beschleunigung. Für andere fühlt sich das oft solide an, kann schnelle Hebel aber spürbar abbremsen.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Erst prüfen, dann festlegen",
      description:
        "Du willst verstehen, worauf eine Entscheidung steht, bevor du dich festlegst. Im Alltag merkt man das daran, dass du Annahmen, Lücken und offene Punkte eher sichtbar machst, statt sie zu überspringen. Unter Zeitdruck wirkt das auf andere schnell wie ein Stoppsignal, auch wenn du nur die Grundlage sauber haben willst.",
    },
    center: {
      title: "Prüfen und entscheiden",
      description: (band) =>
        band === "balanced"
          ? "Du schaltest zwischen genauer Prüfung und entschlossenem Setzen eines Punkts, je nachdem, was die Lage braucht. Im Alltag bleibst du damit weder in Analyse hängen noch gehst du blind nach vorn. Kritisch wird es erst dann, wenn im Team niemand klar markiert, wann wirklich entschieden wird."
          : "Oft prüfst du kurz und ziehst dann einen klaren Schluss. Das hält dich beweglich zwischen Sorgfalt und Tempo. Wenn andere deutlich extremer ticken, wirkt genau dieser Wechsel schnell schwer lesbar.",
    },
    right: {
      title: "Lieber entscheiden als kreisen",
      description:
        "Du setzt eher einen nächsten Schritt, sobald für dich genug Kontur da ist. In Besprechungen oder offenen Schleifen merkst du schnell, wann weitere Analyse nichts mehr klärt. Langes Weiterdrehen kostet dich sichtbar Energie, und andere spüren schnell, wann du innerlich schon entschieden hast.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Mit Leitplanken voran",
      description:
        "Du gehst lieber los, wenn Grenzen, Kosten und Puffer sichtbar genug sind. Im Alltag zeigt sich das dort, wo du nicht nur die Chance, sondern auch den Preis eines Schritts mitdenkst. Offensivere Mitgründer erleben das schnell als Bremse, vor allem wenn sie längst ins Testen wollen.",
    },
    center: {
      title: "Mut mit Augenmaß",
      description: (band) =>
        band === "balanced"
          ? "Du liest Risiko situativ und gehst mal vorsichtiger, mal offensiver vor. Im Alltag wechselst du zwischen Absicherung und Vorwärtsgang, statt immer dieselbe Schwelle anzulegen. Das bleibt gut lesbar, solange für andere sichtbar ist, wo deine Grenze gerade liegt."
          : "Oft entscheidest du danach, wann Absicherung reicht und wann Mut mehr bringt. Dadurch bleibst du weder im Vorsichtsmuster hängen noch springst du blind. Ohne klare Worte dazu wird im Team aber schnell unterschiedlich gelesen, welches Risiko gerade noch okay ist.",
    },
    right: {
      title: "Chancen aktiv spielen",
      description:
        "Du gehst schneller in Tests, Wetten und Bewegung, wenn du darin echten Spielraum siehst. Im Alltag merkt man das daran, dass du Unsicherheit eher als Preis für Fortschritt liest als als Grund zu warten. Für vorsichtigere Mitgründer entsteht dabei schnell Druck, weil du deutlich früher bereit bist, etwas zu riskieren.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Eigenraum hält Tempo",
      description:
        "Du arbeitest am besten, wenn Zuständigkeiten klar sind und du nicht jeden Zwischenschritt teilen musst. Im Alltag gehst du lieber eigenständig vor, statt Arbeit in viele Schleifen zu ziehen. Wer mehr Mitsicht braucht, fühlt sich dabei schnell zu spät eingebunden.",
    },
    center: {
      title: "Nähe bewusst dosieren",
      description: (band) =>
        band === "balanced"
          ? "Du wechselst im Arbeiten zwischen Eigenraum und enger Rückkopplung, je nachdem, worum es gerade geht. Dabei suchst du nicht automatisch Distanz oder Nähe, sondern steuerst beides bewusst. Wenn das im Team nicht ausgesprochen wird, arbeitet ihr leicht mit unterschiedlichen Erwartungen an denselben Prozess."
          : "Oft dosierst du Austausch so, dass er Orientierung gibt, aber nicht jeden Schritt begleitet. Das hält dich beweglich zwischen eigenständigem Arbeiten und engerem Zusammenspiel. Unklarheit darüber kostet hier schneller Energie als echte Meinungsverschiedenheit.",
    },
    right: {
      title: "Im Loop bleiben",
      description:
        "Du arbeitest lieber mit engem Austausch als im stillen Nebeneinander. Im Alltag willst du wissen, wo Dinge stehen, was entschieden ist und wo etwas noch hakt. Für autonomere Menschen wird Abstimmung damit schnell zur Daueraufgabe, auch wenn du eigentlich nur Verbindung halten willst.",
    },
  },
  Commitment: {
    left: {
      title: "Fokus mit Grenzen",
      description:
        "Du gibst dem Startup Gewicht, ohne alles andere dauerhaft darum herum zu sortieren. Im Alltag planst du Verfügbarkeit und Einsatz so, dass die Arbeit trägt, aber nicht jeden Bereich überrollt. Wenn im Team dauernde Präsenz still vorausgesetzt wird, entsteht schnell Druck auf deiner Seite.",
    },
    center: {
      title: "Intensität bewusst steuern",
      description: (band) =>
        band === "balanced"
          ? "Du schaltest dein Einsatzniveau je nach Phase hoch oder runter, statt immer im selben Modus zu bleiben. Das heißt im Alltag: volle Präsenz, wenn sie wirklich nötig ist, und bewusst weniger Zug, wenn sie keinen Mehrwert bringt. Genau das muss im Team sichtbar sein, sonst versteht jeder unter Priorität etwas anderes."
          : "Oft passt du deinen Einsatz an die Lage an, statt ihn dauerhaft gleich hoch zu fahren. Das gibt dir Spielraum zwischen Fokus und Begrenzung. Ohne explizite Absprachen wird daraus aber schnell eine stille Differenz bei Erwartungen.",
    },
    right: {
      title: "Alles auf Fokus",
      description:
        "Du behandelst das Startup klar als Schwerpunkt und liest Zusammenarbeit auch über dieses Fokusniveau. Im Alltag zeigt sich das an hoher Verfügbarkeit, viel Präsenz und einem deutlichen Ernst in der Sache. Wer Intensität anders taktet, merkt das schnell an deinem Anspruch auf Verbindlichkeit und Präsenz.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Erst sortieren, dann ansprechen",
      description:
        "Du gehst nicht sofort in die Schärfe, wenn etwas kippt. Im Alltag nimmst du eher kurz Abstand, bevor du heikle Punkte klar ansprichst. Für andere bleibt dadurch manchmal länger offen, wie ernst ein Thema für dich eigentlich schon ist.",
    },
    center: {
      title: "Den Moment setzen",
      description: (band) =>
        band === "balanced"
          ? "Du entscheidest situativ, ob etwas sofort auf den Tisch muss oder erst kurz reifen soll. Damit steuerst du Timing und Direktheit bewusster als viele andere. Wenn Spannungen länger mitschwingen, braucht es allerdings irgendwann einen klaren Punkt."
          : "Oft wählst du zwischen direkter Ansprache und mehr Timing. Das hilft dir, heikle Themen nicht unnötig zu verschärfen und sie trotzdem nicht ganz liegen zu lassen. Für andere bleibt dabei aber nicht immer sofort erkennbar, wann jetzt wirklich Klartext kommt.",
    },
    right: {
      title: "Spannungen früh aufmachen",
      description:
        "Du sprichst Spannungen lieber an, als sie lange mitlaufen zu lassen. Im Alltag macht sich das dort bemerkbar, wo du Dinge eher direkt auf den Tisch legst als sie vorsichtig zu umkreisen. Sensiblere Gegenüber fühlen sich davon schnell unter Zug, auch wenn du nur rasch klären willst.",
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
