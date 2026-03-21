import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import {
  buildSelfReportSelection,
  SELF_REPORT_SELECTION_DEBUG_CASES,
  type SelfReportHeroSignals,
  type SelfReportSignal,
  type SelfReportStrengthBand,
  type SelfReportTendencyKey,
} from "@/features/reporting/selfReportSelection";
import type { SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

type HeroTextInput = Pick<
  SelfReportHeroSignals,
  "primarySignal" | "workModeSignal" | "tensionCarrier" | "balancedProfile"
>;

type DimensionSentenceMap = Record<
  FounderDimensionKey,
  Record<SelfReportTendencyKey, string | ((band: SelfReportStrengthBand) => string)>
>;

const PRIMARY_SENTENCES: DimensionSentenceMap = {
  Unternehmenslogik: {
    left: "Für dich zählen in unternehmerischen Entscheidungen vor allem Markt, Hebel und strategische Wirkung.",
    center: (band) =>
      band === "balanced"
        ? "Je nach Situation wechselst du zwischen Hebel und Aufbau, statt dich früh auf nur eine Linie festzulegen."
        : "Oft hältst du Wirkung und Substanz gleichzeitig im Blick, ohne dich vorschnell auf nur eine Seite zu schlagen.",
    right: "Substanz, Aufbau und langfristige Tragfähigkeit sind für dich kein Nebenthema, sondern der Maßstab für unternehmerische Entscheidungen.",
  },
  Entscheidungslogik: {
    left: "Bevor du dich festlegst, willst du eine nachvollziehbare Grundlage für die Entscheidung sehen.",
    center: (band) =>
      band === "balanced"
        ? "Je nach Lage gehst du gründlich hinein oder setzt schnell einen Punkt, ohne an einem festen Stil zu hängen."
        : "Oft prüfst du erst kurz und entscheidest dann, statt lange auf einer Seite stecken zu bleiben.",
    right: "Wenn ein Bild für dich stimmig ist, entscheidest du lieber, als noch lange an offenen Punkten zu kreisen.",
  },
  Risikoorientierung: {
    left: "Risiko gehst du lieber mit klaren Leitplanken ein und nicht nur aus Momentum heraus.",
    center: (band) =>
      band === "balanced"
        ? "Je nach Lage sicherst du stärker ab oder gehst bewusst nach vorn, ohne Risiko immer gleich zu lesen."
        : "Oft wägest du Mut und Absicherung gegeneinander ab, statt automatisch nur einer Seite zu folgen.",
    right: "Auch in unsicheren Lagen gehst du nach vorn, wenn du darin eine echte Chance siehst.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Am besten arbeitest du mit klaren Zuständigkeiten, eigenem Raum und gezielter statt dauernder Abstimmung.",
    center: (band) =>
      band === "balanced"
        ? "Je nach Aufgabe suchst du mehr Eigenraum oder mehr Rückkopplung, statt dich auf einen festen Arbeitsmodus festzulegen."
        : "Oft steuerst du Nähe und Eigenraum situativ, statt nur auf Autonomie oder Dauerschleifen zu setzen.",
    right: "Am besten arbeitest du, wenn Fortschritt, offene Punkte und Entscheidungen eng miteinander geteilt werden.",
  },
  Commitment: {
    left: "Das Startup hat Gewicht für dich, bleibt aber Teil eines größeren Lebens- und Arbeitskontexts.",
    center: (band) =>
      band === "balanced"
        ? "Je nach Lage gibst du dem Startup mehr oder weniger Raum, ohne ein starres Einsatzniveau festzulegen."
        : "Oft passt du dein Einsatzniveau an die aktuelle Phase an, statt es dauerhaft gleich hoch oder gleich begrenzt zu halten.",
    right: "Für dich steht das Startup klar im Zentrum; Zeit, Energie und Aufmerksamkeit ordnen sich stark darum herum.",
  },
  Konfliktstil: {
    left: "Spannungen sprichst du eher nach kurzer Sortierung an, statt sofort frontal hineinzugehen.",
    center: (band) =>
      band === "balanced"
        ? "Je nach Situation gehst du direkt hinein oder hältst erst kurz Abstand, ohne nur einem Konfliktrhythmus zu folgen."
        : "Oft wählst du bewusst zwischen direkter Ansprache und mehr Timing, je nachdem, was die Lage trägt.",
    right: "Spannungen sprichst du lieber früh und direkt an, bevor sie lange im Raum stehen.",
  },
};

const WORK_MODE_SENTENCES: DimensionSentenceMap = {
  Unternehmenslogik: {
    left: "Sichtbar wird das im Alltag daran, dass du Themen schnell danach sortierst, was Reichweite schafft und den größten Hebel hat.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wechselst du spürbar zwischen Marktfenster und Aufbaufrage, je nachdem, was gerade Vorrang braucht."
        : "Im Alltag prüfst du oft parallel, was kurz wirkt und was das Unternehmen langfristig trägt.",
    right: "Im Alltag gibst du vor allem den Themen Raum, die das Fundament stärken und später noch belastbar sind.",
  },
  Entscheidungslogik: {
    left: "Im Arbeiten merkt man das daran, dass du offene Annahmen sichtbar machen willst, bevor ihr euch festlegt.",
    center: (band) =>
      band === "balanced"
        ? "Im Arbeiten passt du daran an, wie viel Prüfung oder Entschluss ein Moment gerade wirklich braucht."
        : "Im Arbeiten pendelst du oft zwischen kurzer Prüfung und pragmatischer Entscheidung, ohne lange auf einer Seite zu bleiben.",
    right: "Im Arbeiten setzt du lieber den nächsten Schritt, sobald für dich genug Kontur da ist.",
  },
  Risikoorientierung: {
    left: "Im Alltag gibst du Themen eher dann frei, wenn Grenzen, Kosten und Puffer sichtbar genug sind.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag liest du Risiko situativ und gehst mal vorsichtiger, mal offensiver vor."
        : "Im Alltag entscheidest du oft danach, wann Absicherung reicht und wann Mut den größeren Effekt hat.",
    right: "Im Alltag gehst du schneller in Tests, Wetten und Bewegung, wenn du echten Spielraum erkennst.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Im Alltag arbeitest du lieber eigenständig vor und willst nicht jeden Zwischenschritt gemeinsam kalibrieren.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag wechselst du zwischen eigenem Raum und enger Rückkopplung, je nachdem, worum es gerade geht."
        : "Im Alltag dosierst du Abstimmung so, dass sie Orientierung gibt, aber nicht jeden Schritt begleitet.",
    right: "Im täglichen Arbeiten willst du laufend wissen, wo Dinge stehen, was entschieden ist und wo noch etwas offen bleibt.",
  },
  Commitment: {
    left: "Im Alltag planst du Verfügbarkeit und Einsatz so, dass das Startup Platz hat, aber nicht alles andere verdrängt.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag schaltest du dein Einsatzniveau je nach Phase hoch oder runter, statt immer denselben Modus zu fahren."
        : "Im Alltag ziehst du Intensität oft dann hoch, wenn sie begründet ist, und nimmst sie wieder raus, wenn der Druck sinkt.",
    right: "Im Alltag behandelst du das Startup als klaren Schwerpunkt und liest Zusammenarbeit auch über dieses Fokusniveau.",
  },
  Konfliktstil: {
    left: "Im Alltag suchst du eher erst etwas Abstand, bevor du heikle Punkte klar ansprichst.",
    center: (band) =>
      band === "balanced"
        ? "Im Alltag entscheidest du je nach Situation, ob etwas sofort auf den Tisch muss oder erst kurz reifen soll."
        : "Im Alltag steuerst du bewusst, wann Direktheit hilft und wann mehr Timing klüger ist.",
    right: "Im Alltag merkt man das daran, dass du Spannungen eher früh sichtbar machst, statt sie länger im Hintergrund laufen zu lassen.",
  },
};

const TENSION_SENTENCES: DimensionSentenceMap = {
  Unternehmenslogik: {
    left: "Schwierig wird es dort, wo andere stärker bauen wollen und du zuerst sehen willst, wo wirklich Wirkung entsteht.",
    center: (band) =>
      band === "balanced"
        ? "Dann zieht es schnell auseinander, wenn im Team offenbleibt, wann Wirkung und wann Aufbau führen sollen."
        : "Schwierig wird es, wenn niemand klar sagt, ob ihr gerade Hebel sucht oder bewusst Fundament baut.",
    right: "Schwierig wird es dort, wo andere schnell auf Marktchance ziehen und du zuerst wissen willst, was davon später noch trägt.",
  },
  Entscheidungslogik: {
    left: "Schwierig wird es, wenn vom Team schon Tempo erwartet wird, während für dich noch eine tragfähige Grundlage fehlt.",
    center: (band) =>
      band === "balanced"
        ? "Dann wird es schnell zäh, wenn offenbleibt, wann ihr prüft und wann ihr euch wirklich festlegen wollt."
        : "Schwierig wird es, wenn das Team zwischen Prüfen und Entscheiden hängen bleibt.",
    right: "Schwierig wird es, wenn Diskussionen weiterlaufen, obwohl du längst einen nächsten Schritt setzen willst.",
  },
  Risikoorientierung: {
    left: "Schwierig wird es, wenn andere schneller nach vorn gehen wollen und dir dafür die Leitplanken fehlen.",
    center: (band) =>
      band === "balanced"
        ? "Dann zieht es schnell auseinander, wenn Risiko unterschiedlich gelesen wird und niemand die gemeinsame Grenze sauber benennt."
        : "Schwierig wird es, wenn Chancen im Raum stehen, aber offenbleibt, welches Risiko ihr gemeinsam wirklich tragen wollt.",
    right: "Schwierig wird es, wenn im Team zuerst Sicherheit gesucht wird und du längst eine echte Chance siehst.",
  },
  "Arbeitsstruktur & Zusammenarbeit": {
    left: "Schwierig wird es, wenn andere deutlich mehr Nähe, Mitsicht und laufende Abstimmung brauchen als du.",
    center: (band) =>
      band === "balanced"
        ? "Dann arbeitet ihr schnell nebeneinander statt miteinander, wenn niemand klar macht, wann ihr eng zusammenarbeitet und wann jeder eigenständig weitergeht."
        : "Schwierig wird es, wenn Abstimmung weder klar begrenzt noch klar eng geführt wird.",
    right: "Schwierig wird es, wenn andere viel autonomer arbeiten und du wichtige Dinge erst spät mitbekommst.",
  },
  Commitment: {
    left: "Schwierig wird es, wenn im Team deutlich mehr Präsenz oder ein anderer Stellenwert des Startups still vorausgesetzt wird.",
    center: (band) =>
      band === "balanced"
        ? "Dann zieht es schnell auseinander, wenn Intensität nicht offen abgestimmt wird und alle etwas anderes unter Priorität verstehen."
        : "Schwierig wird es, wenn offenbleibt, wann hoher Fokus gefragt ist und wann ein begrenzterer Modus reicht.",
    right: "Schwierig wird es, wenn andere Priorität, Verfügbarkeit und Intensität deutlich anders einordnen als du.",
  },
  Konfliktstil: {
    left: "Schwierig wird es, wenn andere sofortige Direktheit erwarten und du Themen erst sauber sortieren willst.",
    center: (band) =>
      band === "balanced"
        ? "Dann wird es schnell zäh, wenn Spannungen mitschwingen und niemand markiert, wann jetzt wirklich geklärt wird."
        : "Schwierig wird es, wenn Timing und Direktheit im Team unterschiedlich gelesen werden.",
    right: "Schwierig wird es, wenn dein Gegenüber deutlich mehr Schonraum oder indirektere Annäherung braucht als du.",
  },
};

function resolveSentence(
  map: DimensionSentenceMap,
  signal: SelfReportSignal
) {
  const entry = map[signal.dimension][signal.tendencyKey];
  return typeof entry === "function" ? entry(signal.strengthBand) : entry;
}

function resolveImpactSentence(input: HeroTextInput) {
  if (input.balancedProfile) {
    return "Im Miteinander macht dich das beweglich; fehlen klare Absprachen, bleibt schnell offen, wer woran zieht und welches Tempo gerade gilt.";
  }

  if (!input.tensionCarrier) {
    return "Für die Zusammenarbeit bringt das schnell Struktur, doch ohne offene Absprachen geraten Tempo, Erwartungen und Zuständigkeiten leicht durcheinander.";
  }

  switch (input.tensionCarrier.family) {
    case "direction":
      return "Im Team wird dadurch schnell klar, worauf es hinauslaufen soll; fehlen gemeinsame Prioritäten, zieht ihr an entscheidenden Stellen leicht in unterschiedliche Richtungen.";
    case "decision_under_uncertainty":
      return "Für die Zusammenarbeit bringt das Richtung, doch ohne gemeinsames Verständnis von Risiko und Entscheidung bleibt Tempo liegen oder kippt dauernd.";
    case "collaboration_under_pressure":
      return "Im Miteinander zeigt sich das sofort an Abstimmung, Verfügbarkeit und Ton; wird das unterschiedlich gelesen, arbeitet ihr schnell aneinander vorbei.";
    default:
      return "Für die Zusammenarbeit bringt das schnell Struktur, doch ohne offene Absprachen geraten Tempo, Erwartungen und Zuständigkeiten leicht durcheinander.";
  }
}

function buildFallbackHeroText() {
  return [
    "Aus den vorliegenden Antworten entsteht noch kein belastbares Kernsignal.",
    "Im Alltag lässt sich deshalb noch nicht sauber ableiten, wie du typischerweise arbeitest.",
    "Spannungspotenziale bleiben in diesem Zustand offen und sollten nicht überinterpretiert werden.",
    "Sobald das Profil vollständiger ist, lässt sich die Wirkung im Team deutlich präziser beschreiben.",
  ].join(" ");
}

export function buildPrimarySentence(signal: SelfReportSignal | null) {
  if (!signal) return null;
  return resolveSentence(PRIMARY_SENTENCES, signal);
}

export function buildWorkModeSentence(signal: SelfReportSignal | null) {
  if (!signal) return null;
  return resolveSentence(WORK_MODE_SENTENCES, signal);
}

export function buildTensionSentence(signal: SelfReportSignal | null) {
  if (!signal) return null;
  return resolveSentence(TENSION_SENTENCES, signal);
}

export function buildImpactSentence(input: HeroTextInput) {
  return resolveImpactSentence(input);
}

export function buildHeroText(input: HeroTextInput): string {
  const primarySentence = buildPrimarySentence(input.primarySignal);
  if (!primarySentence) return buildFallbackHeroText();

  const workModeSentence =
    buildWorkModeSentence(input.workModeSignal) ??
    "Im Alltag zeigt sich das in einer Arbeitsweise, die anderen früh spürbar macht, wie du Tempo, Abstimmung und Entscheidungen behandelst.";

  const tensionSentence =
    buildTensionSentence(input.tensionCarrier) ??
    "Reibung entsteht vor allem dort, wo Erwartungen im Team nicht früh genug offen gemacht werden.";

  const impactSentence = buildImpactSentence(input);

  return [primarySentence, workModeSentence, tensionSentence, impactSentence].join(" ");
}

export function buildHeroTextFromScores(scores: SelfAlignmentReport["scoresA"]) {
  return buildHeroText(buildSelfReportSelection(scores).hero);
}

export function buildHeroTextExamples() {
  return SELF_REPORT_SELECTION_DEBUG_CASES.filter((entry) =>
    ["stark_ausgepraegtes_profil", "komplett_balanciertes_profil", "gemischtes_profil"].includes(
      entry.name
    )
  ).map((entry) => ({
    name: entry.name,
    heroText: buildHeroTextFromScores(entry.scores),
  }));
}
