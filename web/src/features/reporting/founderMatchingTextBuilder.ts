import {
  buildFounderMatchingSelectionFromScores,
  runFounderMatchingSelectionExamples,
  type FounderMatchingSelection,
  type MatchingSelectionEntry,
} from "@/features/reporting/founderMatchingSelection";
import type { FounderDimensionKey } from "@/features/reporting/founderDimensionMeta";
import type { FounderScores } from "@/features/reporting/founderMatchingEngine";

export type FounderMatchingBlock = {
  title: string;
  body: string;
};

export type FounderMatchingIntroBlocks = {
  hero: string;
  stableBase: FounderMatchingBlock;
  strongestComplement: FounderMatchingBlock;
  biggestTension: FounderMatchingBlock;
};

export type FounderMatchingFullText = FounderMatchingIntroBlocks & {
  dailyDynamics: string;
  agreements: string[];
};

type DimensionTextMap = Record<FounderDimensionKey, string>;

const BASE_TITLES: DimensionTextMap = {
  Unternehmenslogik: "Gleiche Richtung im Kern",
  Entscheidungslogik: "Ähnliche Art zu entscheiden",
  Risikoorientierung: "Ähnliche Risikoschwelle",
  "Arbeitsstruktur & Zusammenarbeit": "Ähnlicher Arbeitsmodus",
  Commitment: "Gleicher Ernst im Alltag",
  Konfliktstil: "Ähnlicher Umgang mit Reibung",
};

const COMPLEMENT_TITLES: DimensionTextMap = {
  Unternehmenslogik: "Unterschiedliche Richtungshebel",
  Entscheidungslogik: "Prüfung trifft Zuspitzung",
  Risikoorientierung: "Mut trifft Leitplanken",
  "Arbeitsstruktur & Zusammenarbeit": "Nähe trifft Eigenraum",
  Commitment: "Fokus trifft Begrenzung",
  Konfliktstil: "Direktheit trifft Timing",
};

const TENSION_TITLES: DimensionTextMap = {
  Unternehmenslogik: "Wenn Richtung strittig wird",
  Entscheidungslogik: "Wenn Entscheidungen auseinanderlaufen",
  Risikoorientierung: "Wenn Risiko anders zählt",
  "Arbeitsstruktur & Zusammenarbeit": "Wenn der Arbeitsmodus kollidiert",
  Commitment: "Wenn Einsatz auseinanderläuft",
  Konfliktstil: "Wenn Spannung anders bearbeitet wird",
};

const BASE_SENTENCES: Record<FounderDimensionKey, string[]> = {
  Unternehmenslogik: [
    "Bei Grundsatzfragen zieht ihr auf derselben Achse.",
    "Dadurch ziehen Prioritäten seltener auseinander.",
    "Gerade bei Wachstum, Produkt oder Aufbau ist schneller klar, worauf eine Entscheidung am Ende einzahlen soll.",
  ],
  Entscheidungslogik: [
    "Ihr kommt auf ähnliche Weise zu Entscheidungen.",
    "Dadurch bleibt seltener hängen, wann genug geklärt ist und wer jetzt den Punkt setzt.",
    "Gerade in offenen Fragen müsst ihr nicht erst den Entscheidungsweg sortieren, bevor es weitergeht.",
  ],
  Risikoorientierung: [
    "Ihr lest Chancen und Absicherung ähnlich.",
    "Dadurch bleibt Vorangehen berechenbarer und kippt seltener am Gefühl des Moments.",
    "An Weggabelungen müsst ihr seltener erst darum ringen, wie weit ihr überhaupt gehen wollt.",
  ],
  "Arbeitsstruktur & Zusammenarbeit": [
    "Ihr braucht ein ähnliches Maß an Mitsicht, Schleifen und Eigenraum.",
    "Dadurch wird aus Übergaben und Zwischenständen seltener ein Nebenthema.",
    "Man merkt das daran, wie wenig ihr darum ringen müsst, wer wann was sehen oder einbeziehen will.",
  ],
  Commitment: [
    "Ihr lest Priorität, Verfügbarkeit und Präsenz in einem ähnlichen Rahmen.",
    "Dadurch entsteht seltener stiller Druck über Präsenz und Zug.",
    "Gerade in intensiven Phasen müsst ihr weniger darum ringen, was gerade wirklich erwartet ist.",
  ],
  Konfliktstil: [
    "Ihr bringt Spannungen in ähnlichem Tempo und in ähnlicher Form auf den Tisch.",
    "Dadurch werden heikle Gespräche berechenbarer und kippen seltener schon am Timing.",
    "Unter Druck ist schneller klar, wann etwas gesagt werden muss und wie ihr es besprecht.",
  ],
};

function buildTensionSentences(
  entry: MatchingSelectionEntry,
  selection?: FounderMatchingSelection
): string[] {
  const critical = entry.status === "kritisch" || entry.tensionType === "critical";
  const noStableBase = !selection?.stableBase;

  switch (entry.dimension) {
    case "Unternehmenslogik":
      return [
        "Hier wird es schnell schwierig, wenn dieselbe Entscheidung für euch auf zwei unterschiedliche Ziele einzahlen soll.",
        "Im Alltag wird aus Priorisierung dann schnell eine Richtungsfrage.",
        critical
          ? noStableBase
            ? "Gerade weil sonst wenig still trägt, zieht dieses Thema dann schnell mehrere Entscheidungen gleichzeitig auseinander."
            : "Ohne feste Linie haltet ihr an verschiedenen Vorstellungen von Wirkung und Aufbau fest."
          : "Ohne klare Priorisierungsregel zieht ihr an denselben Themen leicht in verschiedene Richtungen.",
      ];
    case "Entscheidungslogik":
      return [
        "Hier wird es schnell zäh, wenn ihr unter Druck unterschiedlich entscheidet.",
        "Einer will die Grundlage erst sauber machen, während der andere längst einen nächsten Schritt setzen will.",
        critical
          ? "Ohne festen Entscheidungsweg kippt das rasch in gegenseitige Irritation."
          : "Ohne klaren Ablauf dreht sich dieselbe Frage leicht länger, als sie tragen müsste.",
      ];
    case "Risikoorientierung":
      return [
        "Hier wird es unruhig, sobald dieselbe Chance für euch nicht denselben Preis hat.",
        "Im Alltag sieht man das an sehr verschiedenen Schwellen für Vorangehen, Testen und Absicherung.",
        critical
          ? "Wenn diese Schwelle nicht ausdrücklich geregelt ist, wird Risiko selbst zum Streitpunkt."
          : "Ohne gemeinsame Risikoschwelle bleibt Vorangehen schnell Verhandlungssache.",
      ];
    case "Arbeitsstruktur & Zusammenarbeit":
      return [
        "Hier wird nicht nur die Arbeit schwierig, sondern schon die Art, wie sie laufen soll.",
        "Reibung entsteht, wenn einer mehr Mitsicht und Schleifen braucht, während der andere vor allem Raum und klare Zuständigkeit will.",
        critical
          ? noStableBase
            ? "Gerade dann wird aus Arbeit schnell ein Streit über Nähe, Kontrolle und Anschluss statt über die eigentliche Sache."
            : "Ohne feste Regeln fühlt sich Arbeit schnell nach Einengung oder Entkopplung an."
          : "Ohne sichtbare Regeln wird daraus schnell Dauerabstimmung.",
      ];
    case "Commitment":
      return [
        "Hier wird es schnell schwierig, wenn ihr Priorität, Präsenz und Einsatz unterschiedlich lest.",
        "Im Alltag zeigt sich das nicht zuerst in Worten, sondern darin, wer wie verfügbar ist und wie viel Zug selbstverständlich wirkt.",
        critical
          ? noStableBase
            ? "Gerade wenn sonst wenig still trägt, wird diese Differenz schnell zum Grundton des Miteinanders."
            : "Ohne klare Regel wird daraus schnell Druck, Rechtfertigung oder stiller Groll."
          : "Ohne klare Regel wird daraus schnell ein Erwartungskonflikt.",
      ];
    case "Konfliktstil":
      return [
        "Hier hakt es oft weniger am Thema als am Timing der Klärung.",
        "Einer bringt Spannung früher auf den Tisch, während der andere erst Abstand oder mehr Einordnung braucht.",
        critical
          ? "Ohne klare Gesprächsregeln liest eine Seite Klarheit schnell als Härte und die andere Zurückhaltung als Ausweichen."
          : "Ohne Absprachen stauen sich Themen hier oder kommen im falschen Moment hoch.",
      ];
  }
}

function getGroundArenaSentence(entry: MatchingSelectionEntry | null) {
  if (!entry) {
    return "Im Alltag zeigt sich das noch nicht an einer einzelnen klar dominanten Arena.";
  }

  switch (entry.dimension) {
    case "Unternehmenslogik":
      return entry.status === "kritisch"
        ? "Am deutlichsten sieht man das dort, wo Prioritäten gesetzt werden und dieselbe Entscheidung für euch auf etwas anderes einzahlen soll."
        : "Das sieht man vor allem dann, wenn ihr Prioritäten setzt und schnell klären müsst, worauf eine Entscheidung einzahlen soll.";
    case "Entscheidungslogik":
      return entry.status === "ergänzend"
        ? "Am deutlichsten zeigt sich das, wenn unter Zeitdruck entschieden werden muss: Einer verdichtet früher, der andere hält die Grundlage länger sauber."
        : "Das sieht man vor allem dort, wo offen ist, wann genug geklärt ist und wer den Punkt setzt.";
    case "Risikoorientierung":
      return entry.status === "ergänzend"
        ? "Besonders sichtbar wird das an Weggabelungen: Einer sieht schneller die Chance, der andere früher die Kosten."
        : "Im Alltag zeigt sich das dort, wo offen ist, wie viel Wagnis gerade noch sinnvoll ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return entry.status === "kritisch"
        ? "Am deutlichsten spürt man das in Übergaben, Zwischenständen und der Frage, wie viel Mitsicht eigentlich selbstverständlich ist."
        : "Das zeigt sich vor allem im Takt eurer Arbeit: wie eng ihr arbeitet und wie viel Eigenraum dabei normal ist.";
    case "Commitment":
      return entry.status === "kritisch"
        ? "Am deutlichsten spürt man das daran, wie viel Präsenz, Verfügbarkeit und Zug im Alltag für euch jeweils selbstverständlich sind."
        : "Im Alltag zeigt sich das daran, wie ähnlich ihr Präsenz, Verfügbarkeit und Priorität lest.";
    case "Konfliktstil":
      return entry.status === "kritisch"
        ? "Am stärksten zeigt sich das in den Momenten, in denen etwas kippt und einer früher in die Klärung will als der andere."
        : "Im Alltag sieht man das daran, wie ihr heikle Punkte aufmacht, haltet und wieder in die Sache zurückführt.";
  }
}

function getStrongestQualitySentence(entry: MatchingSelectionEntry | null) {
  if (!entry) {
    return "Eine klar tragende gemeinsame Stärke ist im Modell noch nicht eindeutig priorisiert.";
  }

  switch (entry.status) {
    case "nah":
      return `Stabil bleibt ihr dort, wo ${entry.dimension} nicht jedes Mal neu aufgerollt werden muss.`;
    case "ergänzend":
      return `Tragend wird es dort, wo Unterschied in ${entry.dimension} nicht sofort wie Widerspruch behandelt wird.`;
    case "abstimmung_nötig":
      return `Hilfreich ist, dass ${entry.dimension} bei euch offen auf dem Tisch liegt statt still mitzulaufen.`;
    case "kritisch":
      return "Was euch dabei trotzdem hilft, ist die Klarheit darüber, woran es tatsächlich hängt.";
  }
}

function getBiggestRiskSentence(entry: MatchingSelectionEntry | null, blindSpotRisk: boolean) {
  if (!entry) {
    return blindSpotRisk
      ? "Das Risiko liegt eher darin, dass ihr zu schnell von stiller Passung ausgeht."
      : "Ein einzelnes dominantes Risikofeld springt im Modell nicht heraus.";
  }

  if (blindSpotRisk && entry.status === "nah") {
    return `Spät schwierig wird es dort, wo ihr ${entry.dimension} für so selbstverständlich haltet, dass kleine Verschiebungen lange unbemerkt bleiben.`;
  }

  switch (entry.dimension) {
    case "Commitment":
      return "Sonst zieht bei derselben Phase jeder ein anderes Maß an Einsatz und Verfügbarkeit als selbstverständlich heran.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Sonst arbeitet ihr schnell aneinander vorbei oder dieselbe Arbeit wird zur Dauerabstimmung.";
    case "Konfliktstil":
      return "Sonst wird nicht nur das Thema schwierig, sondern schon die Art, wie ihr es überhaupt ansprecht.";
    case "Unternehmenslogik":
      return "Sonst zieht dieselbe Priorisierungsfrage euch schnell in unterschiedliche Richtungen.";
    case "Entscheidungslogik":
      return "Sonst bleibt Tempo liegen oder einer erlebt den anderen als Bremse, während der andere sich längst überrollt fühlt.";
    case "Risikoorientierung":
      return "Sonst wird dieselbe Chance schnell zum Streitpunkt darüber, wie viel Wagnis noch vernünftig ist.";
  }
}

function getConditionSentence(
  selection: FounderMatchingSelection,
  groundDynamic: MatchingSelectionEntry | null,
  strongestQuality: MatchingSelectionEntry | null,
  biggestRisk: MatchingSelectionEntry | null
) {
  if (selection.meta.highSimilarityBlindSpotRisk) {
    return "Das hält nur, wenn ihr Ähnlichkeit nicht mit Selbstverständlichkeit verwechselt und stille Annahmen früh aussprecht.";
  }

  switch (selection.heroSelection.mode) {
    case "alignment_led":
      return "Das bleibt stark, solange ihr die gemeinsame Linie nicht überdehnt und kleine Unterschiede an den Rändern früh markiert.";
    case "complement_led":
      return "Tragfähig ist das nur, wenn klar ist, wofür der Unterschied gut ist und wann er nur bremst.";
    case "tension_led":
      return "Ohne klare Regel bleibt genau dieses Feld früh der Punkt, an dem euch der Alltag auseinanderzieht.";
    case "coordination_led":
      return "Das hält nur, wenn Regeln für Übergaben, Entscheidungen und Mitsicht sichtbar sind und im Alltag halten.";
    case "blind_spot_watch":
      return "Das bleibt nur dann stabil, wenn ihr Nähe nicht mit Klarheit verwechselt und Unstimmigkeiten nicht erst sehr spät ansprecht.";
    default:
      return groundDynamic && strongestQuality && biggestRisk
        ? "Tragfähig bleibt das dort, wo ihr Stärke und Risiko gleichzeitig ernst nehmt."
        : "Tragfähig wird das dort, wo ihr Unterschiede früh sichtbar macht.";
  }
}

function sentencesToParagraph(sentences: string[]) {
  return sentences.join(" ");
}

function buildFallbackBlock(title: string, body: string): FounderMatchingBlock {
  return { title, body };
}

function buildContextualComplementSentences(
  strongestComplement: MatchingSelectionEntry,
  selection?: FounderMatchingSelection
) {
  const tensionDimension = selection?.biggestTension?.dimension ?? null;
  const mode = selection?.heroSelection.mode ?? null;
  const noStableBase = !selection?.stableBase;

  switch (strongestComplement.dimension) {
    case "Entscheidungslogik":
      if (mode === "tension_led" || noStableBase) {
        return [
          "Gerade weil euch an anderer Stelle wenig still trägt, wird dieser Unterschied nicht automatisch zur Stärke.",
          "Er kann euch davor schützen, unter Druck zu früh zu springen oder im Prüfen festzuhängen.",
          "Das hält nur, wenn klar ist, wer wann zuspitzt, wer noch prüft und wann die Entscheidung wirklich steht.",
        ];
      }

      if (
        tensionDimension === "Arbeitsstruktur & Zusammenarbeit" ||
        tensionDimension === "Konfliktstil"
      ) {
        return [
          "Ihr kommt nicht auf dieselbe Weise zu Entscheidungen.",
          "Genau das macht euch breiter, weil nicht beide auf dieselbe Art Tempo oder Gründlichkeit hineintragen.",
          "Das hält nur, wenn dieser Unterschied nicht noch mehr Reibung in Arbeitstakt oder Gesprächsführung zieht.",
        ];
      }

      return [
        "Ihr kommt nicht auf dieselbe Weise zu Entscheidungen.",
        "Gerade dadurch merkt ihr schneller, wann weitere Prüfung trägt und wann endlich ein Punkt gesetzt werden muss.",
        "Das hält nur, wenn ihr vorher klärt, wer wann verdichtet und wann noch sauber geprüft wird.",
      ];

    case "Risikoorientierung":
      if (mode === "complement_led" && selection?.stableBase) {
        return [
          "Ihr habt nicht dieselbe Schwelle dafür, wann ein Schritt tragbar ist.",
          "Gerade auf einer stabilen Basis wird das zum nützlichen Korrektiv: Einer sieht früher die Chance, der andere früher die Kosten.",
          "Produktiv bleibt das nur, wenn ihr klar benennt, welches Risiko ihr gerade wirklich tragt und welche Schwelle gemeinsam gilt.",
        ];
      }

      if (tensionDimension === "Commitment" || tensionDimension === "Arbeitsstruktur & Zusammenarbeit") {
        return [
          "Ihr lest Wagnis nicht mit derselben Schwelle.",
          "Das schärft Entscheidungen nur, solange daraus nicht noch mehr Druck im Alltag wird.",
          "Das hält nur, wenn Risiko nicht nebenbei verhandelt wird, sondern als gemeinsame Schwelle sichtbar bleibt.",
        ];
      }

      return [
        "Ihr habt nicht dieselbe Schwelle dafür, wann ein Schritt tragbar ist.",
        "Darin liegt ein echtes Korrektiv: Einer sieht früher die Chance, der andere früher die Kosten.",
        "Produktiv bleibt das nur, wenn ihr aussprecht, welches Risiko gerade real ist und wann Vorangehen trotzdem gilt.",
      ];

    default:
      return [
        "Hier liegt der wichtigste Unterschied, der nicht nur trennt, sondern auch tragen kann.",
        "Darin steckt Potenzial, weil ihr auf dieselbe Lage nicht automatisch gleich reagiert.",
        "Das hält nur, wenn diese Differenz ausdrücklich geführt und nicht bloß vorausgesetzt wird.",
      ];
  }
}

function getDynamicsSituationSentence(selection: FounderMatchingSelection) {
  const lead = selection.dailyDynamicsDimensions[0];
  if (!lead) {
    return "Bei euch springt im Alltag kein einzelner Reibungsmoment sofort nach vorn.";
  }

  switch (lead.dimension) {
    case "Commitment":
      return "Wenn Tempo hochgeht und parallel noch anderes läuft, merkt ihr schnell, wie unterschiedlich viel Präsenz für euch dann selbstverständlich ist.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Wenn Arbeit nicht nur weiterlaufen, sondern für beide sichtbar bleiben soll, merkt ihr schnell, dass ihr nicht denselben Takt braucht.";
    case "Konfliktstil":
      return "Wenn etwas kippt und nicht einfach liegen bleiben kann, reagiert ihr nicht im selben Moment.";
    case "Entscheidungslogik":
      return "Wenn etwas schnell entschieden werden muss, seid ihr oft nicht am selben Punkt.";
    case "Unternehmenslogik":
      return "Wenn Prioritäten unter Druck geraten, zieht euch nicht automatisch dieselbe Frage nach vorn.";
    case "Risikoorientierung":
      return "Wenn eine Chance plötzlich auf dem Tisch liegt, setzt ihr nicht dieselbe Schwelle dafür an, ob ihr sie wirklich nehmt.";
  }
}

function getDynamicsInteractionSentence(
  first: MatchingSelectionEntry | undefined,
  second: MatchingSelectionEntry | undefined
) {
  if (!first && !second) {
    return "Vieles läuft dadurch erst einmal ruhig, aber noch ohne klar lesbaren Schwerpunkt.";
  }

  const dimensions = [first?.dimension, second?.dimension].filter(Boolean).join("|");

  switch (dimensions) {
    case "Arbeitsstruktur & Zusammenarbeit|Konfliktstil":
      return "Einer will dann früher sehen, wo es hängt, und spricht es eher an, während der andere erst mehr Abstand oder weniger Schleifen braucht.";
    case "Commitment|Arbeitsstruktur & Zusammenarbeit":
      return "Sobald Druck reinkommt, vermischt sich schnell, wie präsent jemand gerade ist, mit der Frage, wie eng ihr überhaupt im Loop bleiben wollt.";
    case "Arbeitsstruktur & Zusammenarbeit|Entscheidungslogik":
      return "Einer will erst mehr Mitsicht, während der andere schon festlegen oder weitergehen will.";
    case "Arbeitsstruktur & Zusammenarbeit|Risikoorientierung":
      return "Einer will erst sehen, wo alles steht, während der andere längst wissen will, ob ihr den Schritt geht.";
    case "Commitment|Konfliktstil":
      return "Sobald Druck entsteht, spricht einer es eher direkt an, während der andere noch sortiert, wie viel Zug gerade überhaupt gelten soll.";
    case "Entscheidungslogik|Risikoorientierung":
      return "Einer will früher den Schritt setzen, während der andere noch klärt, ob das Risiko dafür schon trägt.";
    default:
      return "So arbeitet ihr oft am selben Thema, aber nicht am selben Stand.";
  }
}

function getDynamicsConsequenceSentence(selection: FounderMatchingSelection) {
  if (selection.meta.highSimilarityBlindSpotRisk) {
    return "Gerade weil wenig laut wird, merkt ihr Verschiebungen oft erst dann, wenn einer längst von etwas anderem ausgeht.";
  }

  if (selection.heroSelection.mode === "tension_led") {
    return "So denkt einer oft, etwas sei längst klar, während der andere noch genau an dieser Stelle hängt.";
  }

  if (selection.heroSelection.mode === "complement_led") {
    return "Das kippt nicht automatisch, aber im Alltag ist einer oft schon weiter, während der andere noch prüft, ob der Schritt überhaupt schon steht.";
  }

  if (selection.heroSelection.mode === "coordination_led") {
    return "Es hakt nicht ständig, aber dieselbe Aufgabe braucht bei euch mehr Rückversicherung, als man von außen sieht.";
  }

  return "So läuft vieles ruhig, bis einer merkt, dass der andere längst von etwas anderem ausgeht.";
}

function getDynamicsThirdSentence(selection: FounderMatchingSelection) {
  const third = selection.dailyDynamicsDimensions[2];
  if (!third) return null;

  switch (third.dimension) {
    case "Entscheidungslogik":
      return "Gleichzeitig setzt ihr nicht im selben Moment den Punkt, an dem etwas entschieden ist.";
    case "Risikoorientierung":
      return "Gleichzeitig liegt eure Schwelle für Vorangehen nicht am selben Punkt.";
    case "Konfliktstil":
      return "Gleichzeitig sprecht ihr Spannungen nicht im selben Moment an.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Gleichzeitig braucht ihr nicht dieselbe Menge an Mitsicht, damit etwas für euch sauber läuft.";
    case "Commitment":
      return "Gleichzeitig ist für euch nicht dieselbe Menge an Präsenz selbstverständlich.";
    case "Unternehmenslogik":
      return "Gleichzeitig ordnet ihr nicht automatisch nach demselben Ziel.";
  }
}

function getDynamicsConditionSentence(selection: FounderMatchingSelection) {
  if (selection.meta.highSimilarityBlindSpotRisk) {
    return "Das hält nur, wenn ihr auch in ruhigen Phasen markiert, was sich gerade verschoben hat.";
  }

  if (selection.biggestTension?.dimension === "Arbeitsstruktur & Zusammenarbeit") {
    return "Das funktioniert nur dann, wenn sichtbar ist, wann Mitsicht nötig ist, wann jemand allein weitergeht und wann etwas zurück ins Team muss.";
  }

  if (selection.biggestTension?.dimension === "Commitment") {
    return "Das trägt nur, wenn festgelegt ist, wann hoher Einsatz gilt und was im Alltag trotzdem begrenzt bleibt.";
  }

  if (selection.strongestComplement?.dimension === "Entscheidungslogik") {
    return "Das trägt nur, wenn klar ist, wer entscheidet und wann etwas wirklich steht.";
  }

  if (selection.strongestComplement?.dimension === "Risikoorientierung") {
    return "Das funktioniert nur dann, wenn festgelegt ist, welche Risiken ihr wirklich tragt und wer bei offenen Chancen den Ausschlag gibt.";
  }

  return "Das trägt nur, wenn sichtbar bleibt, was gerade gilt und wer den nächsten Schritt setzt.";
}

function buildAgreementSentence(
  entry: FounderMatchingSelection["agreementFocusDimensions"][number]
) {
  switch (entry.dimension) {
    case "Commitment":
      return "Ihr braucht eine klare Regel dafür, welches Einsatzniveau im Alltag erwartet ist und wann zusätzliche Intensität wirklich gilt.";
    case "Arbeitsstruktur & Zusammenarbeit":
      return "Ihr braucht eine sichtbare Regel dafür, welche Zwischenstände geteilt werden, wo Eigenraum beginnt und wann Mitsicht Pflicht ist.";
    case "Konfliktstil":
      return "Ihr braucht eine klare Regel dafür, wie Spannung angesprochen wird, wann sie sofort auf den Tisch muss und wann erst ein ruhiger Rahmen nötig ist.";
    case "Entscheidungslogik":
      return "Es sollte eindeutig sein, wer eine Entscheidung vorbereitet, wann genug geprüft ist und wer den Punkt setzt.";
    case "Unternehmenslogik":
      return "Ihr braucht eine klare Regel dafür, wonach ihr priorisiert, wenn Wirkung und Aufbau nicht dieselbe Richtung verlangen.";
    case "Risikoorientierung":
      return "Ihr braucht eine klare Regel dafür, welche Risikoschwelle für euch gilt und bei welchen Schritten Absicherung Vorrang hat.";
  }
}

export function buildFounderMatchingHero(selection: FounderMatchingSelection): string {
  const { groundDynamic, strongestQuality, biggestRisk } = selection.heroSelection;

  const firstSentence =
    selection.heroSelection.mode === "blind_spot_watch"
      ? "Bei euch läuft anfangs vieles erstaunlich glatt."
      : selection.heroSelection.mode === "tension_led"
        ? "Bei euch liegt das eigentliche Thema früh auf dem Tisch; Spannung ist kein Späteffekt."
        : selection.heroSelection.mode === "complement_led"
          ? "Bei euch entsteht Zug eher aus Unterschied als aus Gleichlauf."
          : selection.heroSelection.mode === "coordination_led"
            ? "Bei euch ist Unterschied nicht das Problem; er trägt sich nur nicht von selbst."
            : "Bei euch gibt es eine gemeinsame Linie, die vieles erst einmal ruhig trägt.";

  const secondSentence = getGroundArenaSentence(groundDynamic);
  const thirdSentence = getStrongestQualitySentence(strongestQuality);
  const fourthSentence = getBiggestRiskSentence(biggestRisk, selection.meta.highSimilarityBlindSpotRisk);
  const fifthSentence = getConditionSentence(selection, groundDynamic, strongestQuality, biggestRisk);

  return [firstSentence, secondSentence, thirdSentence, fourthSentence, fifthSentence].join(" ");
}

export function buildStableBaseBlock(stableBase: MatchingSelectionEntry | null): FounderMatchingBlock {
  if (!stableBase) {
    return buildFallbackBlock(
      "Keine klare Basislinie",
      "Im Modell springt keine einzelne Achse als besonders tragfähige gemeinsame Basis heraus. Das heißt nicht, dass dieses Duo nicht arbeiten kann. Es heißt nur, dass Stabilität hier eher aus bewusster Abstimmung als aus stiller Passung entsteht."
    );
  }

  return {
    title: BASE_TITLES[stableBase.dimension],
    body: sentencesToParagraph(BASE_SENTENCES[stableBase.dimension]),
  };
}

export function buildStrongestComplementBlock(
  strongestComplement: MatchingSelectionEntry | null,
  selection?: FounderMatchingSelection
): FounderMatchingBlock {
  if (!strongestComplement) {
    return buildFallbackBlock(
      "Keine klare Ergänzungsachse",
      "Dieses Duo lebt im Modell nicht vor allem von einer einzelnen produktiven Gegendifferenz. Die Tragfähigkeit entsteht eher über Nähe oder über bewusst geregelte Spannungsfelder. Ergänzung wäre hier weniger ein Automatismus als eine Frage klarer Rollen und sauberer Absprachen."
    );
  }

  return {
    title: COMPLEMENT_TITLES[strongestComplement.dimension],
    body: sentencesToParagraph(buildContextualComplementSentences(strongestComplement, selection)),
  };
}

export function buildBiggestTensionBlock(
  biggestTension: MatchingSelectionEntry | null,
  selection?: FounderMatchingSelection
): FounderMatchingBlock {
  if (!biggestTension) {
    return buildFallbackBlock(
      "Kein dominantes Spannungsfeld",
      "Im Modell springt kein einzelnes Reibungsfeld als klar dominierend heraus. Das senkt die Wahrscheinlichkeit harter Dauerkonflikte. Trotzdem lohnt es sich, an den naheliegenden Alltagsfeldern früh explizit zu werden."
    );
  }

  if (biggestTension.status === "nah") {
    return buildFallbackBlock(
      "Was ihr leicht überseht",
      "Hier liegt kein offener Konflikt, sondern ein möglicher blinder Fleck. Gerade weil diese Achse vertraut und unkompliziert wirkt, sprecht ihr ihre Annahmen leicht nicht mehr aus. Genau dann laufen zwei ähnliche Erwartungen irgendwann still auseinander."
    );
  }

  return {
    title: TENSION_TITLES[biggestTension.dimension],
    body: sentencesToParagraph(buildTensionSentences(biggestTension, selection)),
  };
}

export function buildFounderMatchingIntroBlocks(
  selection: FounderMatchingSelection
): FounderMatchingIntroBlocks {
  return {
    hero: buildFounderMatchingHero(selection),
    stableBase: buildStableBaseBlock(selection.stableBase),
    strongestComplement: buildStrongestComplementBlock(selection.strongestComplement, selection),
    biggestTension: buildBiggestTensionBlock(selection.biggestTension, selection),
  };
}

export function buildFounderMatchingDailyDynamics(selection: FounderMatchingSelection): string {
  const sentences = [
    getDynamicsSituationSentence(selection),
    getDynamicsInteractionSentence(
      selection.dailyDynamicsDimensions[0],
      selection.dailyDynamicsDimensions[1]
    ),
    getDynamicsConsequenceSentence(selection),
    getDynamicsThirdSentence(selection),
    getDynamicsConditionSentence(selection),
  ].filter(Boolean) as string[];

  return sentences.join(" ");
}

export function buildFounderMatchingAgreements(
  selection: FounderMatchingSelection
): string[] {
  return selection.agreementFocusDimensions.slice(0, 5).map((entry) => buildAgreementSentence(entry));
}

export function buildFounderMatchingIntroBlocksFromScores(
  a: FounderScores,
  b: FounderScores
): FounderMatchingIntroBlocks {
  return buildFounderMatchingIntroBlocks(buildFounderMatchingSelectionFromScores(a, b));
}

export function buildFounderMatchingFullText(
  selection: FounderMatchingSelection
): FounderMatchingFullText {
  return {
    ...buildFounderMatchingIntroBlocks(selection),
    dailyDynamics: buildFounderMatchingDailyDynamics(selection),
    agreements: buildFounderMatchingAgreements(selection),
  };
}

export function buildFounderMatchingTextExamples() {
  const examples = runFounderMatchingSelectionExamples();

  return {
    complementary_builders: buildFounderMatchingFullText(examples.complementary_builders),
    misaligned_pressure_pair: buildFounderMatchingFullText(examples.misaligned_pressure_pair),
    balanced_but_manageable_pair: buildFounderMatchingFullText(examples.balanced_but_manageable_pair),
    highly_similar_but_blind_spot_pair: buildFounderMatchingFullText(
      examples.highly_similar_but_blind_spot_pair
    ),
  };
}
