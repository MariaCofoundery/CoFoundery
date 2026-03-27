import {
  buildFounderValuesSelection,
  FOUNDER_VALUES_TEST_CASES,
  runFounderValuesSelectionExamples,
  type FounderValuesSelection,
  type FounderValuesSelectionEntry,
  type FounderValuesThemeId,
} from "@/features/reporting/founderValuesSelection";
import type { SelfValuesProfile } from "@/features/reporting/types";

export type FounderValuesBlockSection = {
  title: string;
  body: string;
};

export type FounderValuesBlock = {
  intro: string;
  gemeinsameBasis: FounderValuesBlockSection;
  unterschiedUnterDruck: FounderValuesBlockSection;
  leitplanke: FounderValuesBlockSection;
};

const BASIS_TITLES: Record<FounderValuesThemeId, string> = {
  integrity_speed: "Woran ihr Entscheidungen messt",
  stakeholder_balance: "Folgen nicht ausblenden",
  resource_fairness: "Belastung fair verteilen",
  commercial_focus: "Wirtschaftlich anschlussfähig",
  long_term_vs_short_term: "Nicht nur für den Moment",
};

const DIFFERENCE_TITLES: Record<FounderValuesThemeId, string> = {
  integrity_speed: "Wenn Tempo Druck macht",
  stakeholder_balance: "Wenn Folgen anders gewichtet werden",
  resource_fairness: "Wenn Fairness anders gelesen wird",
  commercial_focus: "Wenn Härte früher greift",
  long_term_vs_short_term: "Wenn Zeithorizonte auseinandergehen",
};

const LEITPLANKE_TITLES: Record<FounderValuesThemeId, string> = {
  integrity_speed: "Eine klare Prüfschwelle",
  stakeholder_balance: "Eine feste Abwägungsregel",
  resource_fairness: "Ein fester Fairness-Check",
  commercial_focus: "Eine Grenze für Härte",
  long_term_vs_short_term: "Ein doppelter Zeithorizont",
};

function buildIntro(selection: FounderValuesSelection) {
  switch (selection.meta.pattern) {
    case "blind_spot_watch":
      return "Im Werteblock zeigt sich vor allem, was ihr ähnlich voraussetzt und deshalb leicht nicht mehr aussprecht.";
    case "clear_difference":
      return "Im Werteblock zeigt sich kein harter Gegensatz, aber ein klar anderer Maßstab dafür, was unter Druck zuerst zählt.";
    case "nuanced_difference":
      return "Im Werteblock wird eine gemeinsame Linie sichtbar, aber auch ein anderer Takt darin, was unter Druck zuerst Gewicht bekommt.";
    case "shared_basis":
    default:
      return "Im Werteblock zeigt sich vor allem, woran ihr Entscheidungen unter Druck ähnlich ausrichtet.";
  }
}

function buildBasisBody(entry: FounderValuesSelectionEntry) {
  switch (entry.themeId) {
    case "integrity_speed":
      return "Bei wichtigen Entscheidungen schaut ihr wahrscheinlich nicht nur darauf, was schnell vorangeht. Für euch zählt auch, ob ein Schritt sich unter Druck noch vertreten lässt.";
    case "stakeholder_balance":
      return "Wenn Entscheidungen Folgen für Team, Kundschaft oder Partner haben, blendet ihr diese Wirkung eher nicht aus. Wahrscheinlich schaut ihr beide darauf, wer eine Entscheidung mittragen muss und wer ihren Preis zahlt.";
    case "resource_fairness":
      return "Bei Last, Budget oder Verantwortung habt ihr vermutlich einen ähnlichen Blick darauf, was noch als fair und zumutbar gilt. Das macht es leichter, heikle Verteilungen nicht nur nach Effizienz zu lesen.";
    case "commercial_focus":
      return "Wirtschaftliche Tragfähigkeit ist für euch wahrscheinlich kein Nebenthema. Wenn es eng wird, schaut ihr beide eher darauf, was ein Vorhaben wirklich trägt und was nur gut klingt.";
    case "long_term_vs_short_term":
    default:
      return "Ihr scheint Entscheidungen nicht nur nach dem nächsten Schritt zu lesen. Wahrscheinlich achtet ihr beide darauf, ob etwas kurzfristig hilft und später noch stimmig bleibt.";
  }
}

function buildDifferenceBody(selection: FounderValuesSelection) {
  const { unterschiedUnterDruck } = selection;

  switch (unterschiedUnterDruck.themeId) {
    case "integrity_speed":
      return unterschiedUnterDruck.level === "clear"
        ? "Unter Druck dürfte einer früher sagen: Das reicht, wir gehen. Der andere hält eher noch dagegen, bis klar ist, dass der Schritt auch in Grenzfällen tragbar bleibt."
        : "Sobald Tempo hochgeht, setzt ihr den Punkt wahrscheinlich nicht gleich früh. Einer zieht eher vor, der andere prüft länger, ob der Schritt noch sauber begründbar bleibt.";
    case "stakeholder_balance":
      return unterschiedUnterDruck.level === "clear"
        ? "Wenn Entscheidungen Nebenfolgen haben, gewichtet ihr diese wahrscheinlich nicht gleich. Einer nimmt wirtschaftliche oder operative Härte früher in Kauf, der andere hält Auswirkungen auf Team, Kundschaft oder Partner länger im Blick."
        : "Unter Druck verschiebt sich bei euch wahrscheinlich, wessen Folgen zuerst Gewicht bekommen. Einer schaut früher auf Handlungsfähigkeit, der andere länger auf die Menschen oder Gruppen, die den Schritt tragen müssen.";
    case "resource_fairness":
      return unterschiedUnterDruck.level === "clear"
        ? "Bei Budget, Last oder Verantwortung zieht einer vermutlich früher eine harte Linie, während der andere länger darauf schaut, wie zumutbar das für die Betroffenen bleibt."
        : "Sobald etwas knapp wird, legt ihr Fairness nicht ganz gleich aus. Einer priorisiert früher Entlastung oder klare Grenzen, der andere eher Wirksamkeit und zügige Entscheidung.";
    case "commercial_focus":
      return unterschiedUnterDruck.level === "clear"
        ? "Wenn Ergebnisse unter Druck geraten, greift wirtschaftliche Härte bei euch nicht gleich früh. Einer zieht früher auf Runway, Zielerreichung und klare Priorisierung, der andere prüft länger die Folgen für Vertrauen, Team oder Zumutbarkeit."
        : "Unter Druck verschiebt sich bei euch, wie früh Zahlen und Ergebnis den Ton angeben. Einer zieht eher auf wirtschaftliche Klarheit, der andere hält die Nebenfolgen länger offen.";
    case "long_term_vs_short_term":
    default:
      return unterschiedUnterDruck.level === "clear"
        ? "Wenn eine Entscheidung jetzt entlastet, später aber einen Preis haben kann, priorisiert ihr nicht gleich. Einer sichert früher, was die nächsten Wochen trägt, der andere hält stärker die Linie im Blick, die später noch stimmen soll."
        : "Unter Druck rutscht ihr wahrscheinlich nicht auf denselben Zeithorizont. Einer will früher absichern, was jetzt trägt, der andere schützt länger die Richtung, die später noch passen soll.";
  }
}

function buildDifferenceFollowUp(selection: FounderValuesSelection) {
  switch (selection.unterschiedUnterDruck.level) {
    case "clear":
      return "Wenn das nicht ausgesprochen ist, bewertet ihr denselben Schritt schnell nach zwei verschiedenen Maßstäben.";
    case "moderate":
      return "Ohne klare Einordnung zieht dieselbe Entscheidung dann schnell in zwei Richtungen.";
    case "subtle":
    default:
      return "Das ist kein Grundkonflikt, verschiebt unter Druck aber leicht, was für euch jeweils zuerst zählt.";
  }
}

function buildLeitplankeBody(selection: FounderValuesSelection) {
  const entry = selection.leitplanke;

  if (entry.mode === "guard_shared_blind_spot") {
    switch (entry.themeId) {
      case "integrity_speed":
        return "Gerade weil ihr hier ähnlich priorisiert, sollte vor heiklen Entscheidungen einmal festgehalten werden, wo Tempo reicht und ab welcher Grenze ihr noch einmal stoppt.";
      case "stakeholder_balance":
        return "Gerade weil ihr hier ähnlich schaut, sollte bei heiklen Entscheidungen einmal feststehen, welche Folgen für Team, Kundschaft oder Partner ihr nicht still in Kauf nehmt.";
      case "resource_fairness":
        return "Gerade weil ihr hier ähnlich priorisiert, sollte bei Budget-, Last- oder Rollenentscheidungen kurz festgehalten werden, was für euch noch als fair und zumutbar gilt.";
      case "commercial_focus":
        return "Gerade weil ihr hier ähnlich priorisiert, sollte bei Ergebnisdruck klar markiert werden, ab wann wirtschaftliche Härte gilt und welche Grenze trotzdem stehen bleibt.";
      case "long_term_vs_short_term":
      default:
        return "Gerade weil ihr hier ähnlich schaut, sollte bei größeren Entscheidungen einmal feststehen, was kurzfristig gewonnen werden soll und welche langfristige Linie dabei nicht kippen darf.";
    }
  }

  switch (entry.themeId) {
    case "integrity_speed":
      return "Legt für Entscheidungen unter Druck fest, wer den Punkt zum Go setzt und welche Grenze davor noch einmal ausdrücklich geprüft werden muss.";
    case "stakeholder_balance":
      return "Legt vor Entscheidungen mit Nebenfolgen fest, welche Interessen im Zweifel Vorrang haben und welche nicht still übergangen werden dürfen.";
    case "resource_fairness":
      return "Legt vor Last-, Budget- oder Rollenentscheidungen fest, nach welchen Kriterien ihr Härte, Fairness und Zumutbarkeit gewichtet.";
    case "commercial_focus":
      return "Legt für Druckphasen fest, ab wann Ergebnis und Runway Vorrang haben und welche Nebenfolgen ihr dabei nicht einfach mitschleppt.";
    case "long_term_vs_short_term":
    default:
      return "Legt für größere Entscheidungen fest, welcher kurzfristige Nutzen zählen muss und welche langfristige Linie dabei nicht aufgegeben wird.";
  }
}

export function buildFounderValuesBlock(
  selection: FounderValuesSelection | null | undefined
): FounderValuesBlock | null {
  if (!selection) return null;

  return {
    intro: buildIntro(selection),
    gemeinsameBasis: {
      title: BASIS_TITLES[selection.gemeinsameBasis.themeId],
      body: buildBasisBody(selection.gemeinsameBasis),
    },
    unterschiedUnterDruck: {
      title: DIFFERENCE_TITLES[selection.unterschiedUnterDruck.themeId],
      body: `${buildDifferenceBody(selection)} ${buildDifferenceFollowUp(selection)}`,
    },
    leitplanke: {
      title: LEITPLANKE_TITLES[selection.leitplanke.themeId],
      body: buildLeitplankeBody(selection),
    },
  };
}

export function buildFounderValuesBlockFromProfiles(
  valuesProfileA: SelfValuesProfile | null | undefined,
  valuesProfileB: SelfValuesProfile | null | undefined
) {
  return buildFounderValuesBlock(buildFounderValuesSelection(valuesProfileA, valuesProfileB));
}

export function buildFounderValuesBlockExamples() {
  const selections = runFounderValuesSelectionExamples();

  return {
    aehnliche_basis: buildFounderValuesBlock(selections.aehnliche_basis),
    anderer_massstab_unter_druck: buildFounderValuesBlock(selections.anderer_massstab_unter_druck),
    aehnlich_mit_blind_spot: buildFounderValuesBlock(selections.aehnlich_mit_blind_spot),
  };
}

export function buildFounderValuesBlockExampleProfiles() {
  return {
    aehnliche_basis: buildFounderValuesBlockFromProfiles(
      FOUNDER_VALUES_TEST_CASES.aehnliche_basis.a,
      FOUNDER_VALUES_TEST_CASES.aehnliche_basis.b
    ),
    anderer_massstab_unter_druck: buildFounderValuesBlockFromProfiles(
      FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck.a,
      FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck.b
    ),
    aehnlich_mit_blind_spot: buildFounderValuesBlockFromProfiles(
      FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot.a,
      FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot.b
    ),
  };
}
