import {
  buildSelfReportSelection,
  SELF_REPORT_SELECTION_DEBUG_CASES,
  type SelfReportSignal,
  type SelfReportStrengthBand,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";
import { normalizeLocale, type AppLocale } from "@/i18n/config";

export type Pattern = {
  title: string;
  description: string;
};

type PatternEntry = {
  title: string;
  description: string | ((band: SelfReportStrengthBand) => string);
};

type PatternMap = Record<FounderDimensionKey, Record<SelfReportTendencyKey, PatternEntry>>;
type PatternLocale = AppLocale | string | null | undefined;

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

const EN_PATTERN_TEXT: PatternMap = {
  Unternehmenslogik: {
    left: {
      title: "Foundation before speed",
      description:
        "A recurring pattern in your profile is that new opportunities first need to show how they strengthen the company and make it more resilient. In a founding context, this can help protect substance before momentum takes over. It can also create friction when others are already looking at reach, expansion or speed while you still want to test whether the foundation is stable enough.",
    },
    center: {
      title: "Substance and leverage",
      description: (band) =>
        band === "balanced"
          ? "A recurring pattern in your profile is that you move between building substance and opening space for bigger leverage. This flexibility can be useful, but others may not always see which logic is leading in the moment. In a founding context, it helps to make explicit whether you are currently protecting the foundation or pursuing the opportunity."
          : "A recurring pattern in your profile is that you keep substance and leverage in view at the same time. This can help you test opportunities from more than one angle. It can also create ambiguity if the team has not agreed whether the current priority is to strengthen the foundation or move toward the next opening.",
    },
    right: {
      title: "Seeing leverage early",
      description:
        "A recurring pattern in your profile is that you notice reach, access and momentum early when a new opportunity appears. In a founding context, this can help the team avoid moving too slowly. It can also create tension when others first want to understand whether the model is stable enough before turning the opportunity into the next step.",
    },
  },
  Entscheidungslogik: {
    left: {
      title: "Clarify before committing",
      description:
        "A recurring pattern in your profile is that you want to understand the basis of a decision before locking it in. This can help surface assumptions, gaps and counterarguments before they become costly. It may also feel like an extra loop to people who are already ready to move, so the useful move is to name what still needs clarification.",
    },
    center: {
      title: "Clarify and decide",
      description: (band) =>
        band === "balanced"
          ? "A recurring pattern in your profile is that you switch between careful clarification and a clear next step. This can be a strength when it matches the situation, but the switch may not always be readable to others. In a founding context, it helps to say what would make a question ready for decision."
          : "A recurring pattern in your profile is that you often clarify briefly and then move toward a conclusion. This can keep the team practical without skipping substance. It becomes more useful when others can see why the discussion has moved from exploration into decision.",
    },
    right: {
      title: "Decide once the next step is workable",
      description:
        "A recurring pattern in your profile is that you prefer to decide once the direction is workable enough. This can help a founding team avoid circling for too long. It can also create friction when others experience the same question as still open, so the key is to make the threshold for action explicit.",
    },
  },
  Risikoorientierung: {
    left: {
      title: "Move with guardrails",
      description:
        "A recurring pattern in your profile is that you move more comfortably when limits, costs and buffers are visible. This can help a founding team avoid treating uncertainty too casually. It may also feel slow to people who want to test sooner, so the useful conversation is which guardrails are truly needed before acting.",
    },
    center: {
      title: "Courage with calibration",
      description: (band) =>
        band === "balanced"
          ? "A recurring pattern in your profile is that your risk threshold changes with the situation. Sometimes you want clearer guardrails, sometimes a plausible upside is enough to move. This can be useful, but it becomes easier for others to work with when you name where your line is in the current case."
          : "A recurring pattern in your profile is that you weigh protection and movement rather than defaulting to either side. This can keep you from being either too cautious or too exposed. In a founding context, it helps to make explicit which risk the team is actually choosing to carry.",
    },
    right: {
      title: "Actively playing opportunities",
      description:
        "A recurring pattern in your profile is that you move into tests, bets and action when you see meaningful room to learn or grow. This can help the team use open windows while they are still available. It can also create pressure for people who need more containment first, so it helps to agree what downside you are willing to carry.",
    },
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: {
      title: "Room to work keeps momentum",
      description:
        "A recurring pattern in your profile is that you work best with clear ownership and enough room to make progress without sharing every interim step. This can protect focus and speed. It can also leave others feeling involved too late if they need more visibility, so it helps to agree what should be shared early and what can stay autonomous.",
    },
    center: {
      title: "Deliberate closeness",
      description: (band) =>
        band === "balanced"
          ? "A recurring pattern in your profile is that you move between independent work and close feedback. This flexibility can be useful, but others may not always know which mode you expect. In a founding context, it helps to define when a topic needs shared visibility and when ownership should stay clearer."
          : "A recurring pattern in your profile is that you dose collaboration so it gives orientation without turning every step into alignment. This can keep work moving. It becomes easier for others when the team names how much visibility a task actually needs.",
    },
    right: {
      title: "Staying in the loop",
      description:
        "A recurring pattern in your profile is that you prefer close visibility over quiet parallel work. You want to know where things stand, what has been decided and where something is still open. This can support shared direction, but it may feel like too much coordination for more autonomous people unless you agree which updates matter most.",
    },
  },
  Commitment: {
    left: {
      title: "Focus with boundaries",
      description:
        "A recurring pattern in your profile is that the startup matters to you without automatically becoming the only organizing principle. This can protect sustainability and honest capacity planning. It can create tension when constant availability is silently assumed, so it helps to be clear about what you can reliably contribute.",
    },
    center: {
      title: "Adjusting intensity deliberately",
      description: (band) =>
        band === "balanced"
          ? "A recurring pattern in your profile is that you can raise your intensity and bring it back down rather than staying in one mode. This can be useful across different phases, but others may not always know what level of priority you currently expect. In a founding context, it helps to name when a high-focus phase starts and ends."
          : "A recurring pattern in your profile is that you adapt your level of commitment to the phase instead of keeping it permanently high or permanently bounded. This gives you range. It also makes explicit agreements important, because different people may read the same phase differently.",
    },
    right: {
      title: "Putting focus first",
      description:
        "A recurring pattern in your profile is that you treat the startup as a clear priority and read collaboration through that level of focus. This can create momentum and commitment. It can also create pressure when others pace intensity differently, so it helps to agree what level of availability is realistic rather than silently expected.",
    },
  },
  Konfliktstil: {
    left: {
      title: "Sort first, then address",
      description:
        "A recurring pattern in your profile is that you do not always move into a disagreement immediately. You may first take a little distance before naming a sensitive point. This can make your response more considered, but others may not know how important the issue already is for you unless you signal when you will come back to it.",
    },
    center: {
      title: "Choosing the moment",
      description: (band) =>
        band === "balanced"
          ? "A recurring pattern in your profile is that you do not address every difference in the same way. Some topics you put on the table quickly, others you return to with some distance. This sense of timing can be useful, but others may need to know when tension will turn into clarification."
          : "A recurring pattern in your profile is that you choose between directness and timing. This can help you avoid making sensitive topics unnecessarily sharper while still not leaving them aside. It works best when the team can tell whether a point is being paused or avoided.",
    },
    right: {
      title: "Surface tension early",
      description:
        "A recurring pattern in your profile is that you prefer to address differences before they run in the background for too long. This can keep important issues workable. It can also feel intense to people who need more distance first, so it helps to agree how direct clarification should happen under pressure.",
    },
  },
};

function resolvePatternMap(locale: PatternLocale) {
  return normalizeLocale(locale) === "en" ? EN_PATTERN_TEXT : PATTERN_TEXT;
}

function resolvePatternEntry(signal: SelfReportSignal, locale?: PatternLocale): Pattern {
  const entry = resolvePatternMap(locale)[signal.dimension][signal.tendencyKey];
  return {
    title: entry.title,
    description:
      typeof entry.description === "function" ? entry.description(signal.strengthBand) : entry.description,
  };
}

export function buildPatterns(patternDimensions: SelfReportSignal[], locale?: PatternLocale): Pattern[] {
  return patternDimensions.slice(0, 3).map((signal) => resolvePatternEntry(signal, locale));
}

export function buildPatternExamples(locale?: PatternLocale) {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    patterns: buildPatterns(buildSelfReportSelection(entry.scores).patternDimensions, locale),
  }));
}

export function buildPatternsFromScores(scores: SelfAlignmentReport["scoresA"], locale?: PatternLocale) {
  return buildPatterns(buildSelfReportSelection(scores).patternDimensions, locale);
}
