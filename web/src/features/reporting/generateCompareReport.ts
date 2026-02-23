import {
  DIMENSION_DEFINITIONS_DE,
  VALUES_ARCHETYPES_DE,
  getDiffClass,
} from "@/features/reporting/report_texts.de";
import { VALUES_PLAYBOOK, VALUES_REPORT_CONTENT } from "@/features/reporting/constants";
import {
  REPORT_DIMENSIONS,
  type CompareDimensionBlock,
  type CompareLabel,
  type CompareReportJson,
  type CompareResult,
  type DiffClass,
  type ProfileResult,
  type RadarSeries,
  type ReportDimension,
  type SessionAlignmentReport,
  type ValuesArchetypeId,
  type ZoneBand,
} from "@/features/reporting/types";

const ICEBREAKER_QUESTIONS = [
  "Was war der Moment in deiner bisherigen Laufbahn, in dem du am meisten über dich selbst gelernt hast?",
  "Stell dir vor, wir scheitern in zwei Jahren. Was wäre aus deiner heutigen Sicht der wahrscheinlichste Grund dafür?",
] as const;

export const MIN_COMPARABLE_DIMENSIONS = 4;

const VALUES_ARCHETYPE_ANCHOR: Record<ValuesArchetypeId, number> = {
  impact_idealist: 1,
  verantwortungs_stratege: 3.5,
  business_pragmatiker: 6,
};

type ValueFocusTemplate = {
  id: string;
  overlapHeadline: string;
  overlapText: string;
  gapHeadline: string;
  gapRiskText: string;
  gapMitigationText: string;
  agreementRule: string;
  conversationQuestion: string;
  weight: Record<ValuesArchetypeId, number>;
};

const VALUE_FOCUS_TEMPLATES: ValueFocusTemplate[] = [
  {
    id: "integrity_speed",
    overlapHeadline: "Integrität im Entscheidungstempo",
    overlapText:
      "Ihr habt ein ähnliches Gefühl dafür, wann werteklare Entscheidungen schnell getroffen werden dürfen und wann vertiefte Abwägung nötig ist. Das reduziert Reibung in kritischen Go/No-Go-Situationen.",
    gapHeadline: "Spannung zwischen Prinzipientreue und Geschwindigkeit",
    gapRiskText:
      "Unter Druck kann eine Seite schnelle Marktreaktionen priorisieren, während die andere auf normative Absicherung pocht.",
    gapMitigationText:
      "Legt vorab fest, welche Entscheidungen zwingend einen Werte-Check brauchen und welche innerhalb klarer Leitplanken beschleunigt werden dürfen.",
    agreementRule:
      "Wenn eine Entscheidung externe Wirkung auf Kund:innen oder Teamkultur hat, dann macht ihr vor Freigabe einen 10-Minuten-Werte-Check.",
    conversationQuestion:
      "Bei welchen Entscheidungstypen wollt ihr Tempo priorisieren und wo ist Integrität ausdrücklich Vorrangkriterium?",
    weight: {
      impact_idealist: 1,
      verantwortungs_stratege: 0.9,
      business_pragmatiker: 0.35,
    },
  },
  {
    id: "stakeholder_balance",
    overlapHeadline: "Balance von Stakeholder-Interessen",
    overlapText:
      "Ihr teilt eine ähnliche Logik darin, wie Kunden, Team und Kapitalinteressen gegeneinander gewichtet werden. Dadurch werden Priorisierungsentscheidungen nachvollziehbarer und konsistenter.",
    gapHeadline: "Unterschiedliche Stakeholder-Prioritäten",
    gapRiskText:
      "Wenn Interessenkonflikte auftreten, kann eine Seite stärker auf wirtschaftliche Härte setzen, während die andere mehr Ausgleich fordert.",
    gapMitigationText:
      "Definiert eine feste Prioritätsreihenfolge für wiederkehrende Zielkonflikte, damit Diskussionen nicht jedes Mal bei null starten.",
    agreementRule:
      "Wenn Zielkonflikte zwischen Teambelastung und Umsatzdruck entstehen, dann entscheidet ihr entlang einer vorab dokumentierten Prioritätsmatrix.",
    conversationQuestion:
      "Welche Stakeholder-Interessen dürfen in Stressphasen kurzfristig zurückstehen und welche nicht?",
    weight: {
      impact_idealist: 0.75,
      verantwortungs_stratege: 1,
      business_pragmatiker: 0.6,
    },
  },
  {
    id: "resource_fairness",
    overlapHeadline: "Fairness in Ressourcenentscheidungen",
    overlapText:
      "Ihr habt eine vergleichbare Haltung dazu, wie Budget, Aufmerksamkeit und Verantwortung im Team verteilt werden sollen. Das stärkt Vertrauen in operative Entscheidungen.",
    gapHeadline: "Divergenz bei Fairnessmaßstäben",
    gapRiskText:
      "Ohne gemeinsame Leitplanken können Ressourcenzuteilungen als sachlich notwendig oder als unausgewogen interpretiert werden.",
    gapMitigationText:
      "Vereinbart transparente Kriterien für Ressourcenentscheidungen und überprüft sie regelmäßig mit Blick auf Wirkung und Zumutbarkeit.",
    agreementRule:
      "Wenn zusätzliche Ressourcen gebunden werden, dann dokumentiert ihr Entscheidungskriterien und den erwarteten Team-Impact in einem gemeinsamen Log.",
    conversationQuestion:
      "Welche Fairnesskriterien sind für euch bei Budget- und Rollenentscheidungen unverhandelbar?",
    weight: {
      impact_idealist: 0.85,
      verantwortungs_stratege: 0.95,
      business_pragmatiker: 0.45,
    },
  },
  {
    id: "commercial_focus",
    overlapHeadline: "Kommerzielle Prioritätensetzung",
    overlapText:
      "Ihr seid ähnlich darin ausgerichtet, wirtschaftliche Zielerreichung als Leitplanke im Tagesgeschäft zu nutzen. Das erhöht Klarheit bei Fokus- und Verzichtsentscheidungen.",
    gapHeadline: "Unterschied in wirtschaftlicher Härte",
    gapRiskText:
      "Bei knappen Ressourcen kann eine Seite konsequente Ergebnisorientierung fordern, während die andere stärker langfristige Nebenwirkungen berücksichtigt.",
    gapMitigationText:
      "Legt Schwellenwerte fest, ab denen wirtschaftliche Kennzahlen automatisch priorisiert werden und wo qualitative Korrektive greifen.",
    agreementRule:
      "Wenn Kernkennzahlen zwei Perioden in Folge unter Ziel liegen, dann schaltet ihr in einen klar definierten Commercial-Mode mit befristeten Prioritätsregeln.",
    conversationQuestion:
      "Welche Kennzahlen lösen bei euch verbindlich einen Fokuswechsel zugunsten von Umsatz und Runway aus?",
    weight: {
      impact_idealist: 0.35,
      verantwortungs_stratege: 0.65,
      business_pragmatiker: 1,
    },
  },
  {
    id: "long_term_vs_short_term",
    overlapHeadline: "Zeithorizont in Zielkonflikten",
    overlapText:
      "Ihr interpretiert kurzfristige Chancen und langfristige Verantwortung ähnlich und könnt deshalb strategische Trade-offs konsistent erklären. Das reduziert Richtungswechsel im Führungsteam.",
    gapHeadline: "Spannung zwischen kurzfristigem Druck und Langfrist-Logik",
    gapRiskText:
      "In kritischen Phasen kann es zu verdeckten Konflikten kommen, ob kurzfristige Stabilisierung oder langfristige Positionierung Vorrang hat.",
    gapMitigationText:
      "Arbeitet mit zwei Zeithorizonten in jeder größeren Entscheidung und dokumentiert bewusst, welchen Zielkonflikt ihr in Kauf nehmt.",
    agreementRule:
      "Wenn strategische Entscheidungen getroffen werden, dann bewertet ihr systematisch den 90-Tage- und den 12-Monats-Effekt vor dem Commit.",
    conversationQuestion:
      "Wo seid ihr bereit, kurzfristige Effizienz zugunsten langfristiger Positionierung zu opfern und wo nicht?",
    weight: {
      impact_idealist: 0.8,
      verantwortungs_stratege: 0.9,
      business_pragmatiker: 0.7,
    },
  },
];

type PremiumSectionPayload = {
  id: string;
  title: string;
  type?: "intro" | "summary" | "overview" | "analysis" | "checklist" | "closing";
  body?: string;
  bullets?: string[];
  checklist?: string[];
};

function createPremiumSection(section: PremiumSectionPayload) {
  return section as unknown as { id: string; title: string };
}

export function generateCompareReport(profileA: ProfileResult, profileB: ProfileResult): CompareReportJson {
  const isMatch = profileA.profileId !== profileB.profileId;
  const perDimension = REPORT_DIMENSIONS.map((dimension) =>
    buildDimensionBlock(profileA, profileB, dimension)
  );
  const comparableBlocks = perDimension.filter(hasComparableDelta);
  const comparableDimensionCount = comparableBlocks.length;
  const totalDimensionCount = REPORT_DIMENSIONS.length;
  const isDataSufficient = comparableDimensionCount >= MIN_COMPARABLE_DIMENSIONS;
  const dataCoverageText = `${comparableDimensionCount}/${totalDimensionCount} Dimensionen belastbar`;
  const coverageNote = isDataSufficient
    ? `Datenabdeckung: ${dataCoverageText}.`
    : `Datenlage unvollständig: ${dataCoverageText}. Für belastbares Team-Typing sind mindestens ${MIN_COMPARABLE_DIMENSIONS}/${totalDimensionCount} vergleichbare Dimensionen erforderlich.`;

  const compareResult = buildCompareResult(profileA, profileB, perDimension);
  const applicationIntro = buildApplicationIntroToken(profileA.displayName, profileB.displayName);
  const executiveSummaryTokens = buildExecutiveDecisionTokens(compareResult, perDimension, profileA.displayName, profileB.displayName);
  const decisionArchitecture = buildDecisionArchitecture(perDimension, profileA.displayName, profileB.displayName);
  const riskContract = buildRiskContract(perDimension, profileA.displayName, profileB.displayName);
  const dimensionDossiers = perDimension.map((block) => toDimensionDossierToken(block, profileA.displayName, profileB.displayName));
  const criticalTensions = buildCriticalTensionTokens(perDimension, profileA.displayName, profileB.displayName);
  const closingReflection = buildClosingReflectionToken(compareResult, perDimension, profileA.displayName, profileB.displayName);
  const closingQuestions = buildClosingQuestionTokens();
  const actionPlanTokens = buildNinetyDayPlanTokens(perDimension, profileA.displayName, profileB.displayName);
  const executiveBullets = isMatch
    ? buildExecutiveBullets(compareResult, profileA.displayName, profileB.displayName)
    : buildSingleProfileSummary(profileA);
  const executiveBody = isMatch
    ? buildExecutiveBody(compareResult, perDimension, profileA.displayName, profileB.displayName)
    : "Diese Einordnung zeigt, wie dein Profil aktuell als Führungs- und Entscheidungslogik sichtbar wird.";

  const topInsights = buildTopInsights(comparableBlocks, profileA.displayName, profileB.displayName);

  const hasValuesProfilesForBoth = hasCompleteMatchValuesProfiles(profileA, profileB);
  const valuesAlignmentPercent = hasValuesProfilesForBoth
    ? computeValuesAlignmentPercent(profileA.valuesScore, profileB.valuesScore)
    : null;
  const valuesContent =
    hasValuesProfilesForBoth && valuesAlignmentPercent != null
      ? buildPremiumValuesModuleContent(profileA, profileB, valuesAlignmentPercent)
      : null;

  const deltaQuestions = [...comparableBlocks]
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
    .slice(0, 3)
    .map((block) => `[ ] ${block.reflectionQuestion}`);
  const conversationGuide = [
    ...ICEBREAKER_QUESTIONS.map((question) => `[ ] ${question}`),
    ...deltaQuestions,
    ...actionPlanTokens,
  ];

  const parsedApplicationIntro = parseTaggedToken(applicationIntro);
  const parsedClosing = parseTaggedToken(closingReflection);
  const parsedClosingQuestions = closingQuestions
    .map((token) => parseTaggedToken(token))
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);

  const sections = [
    createPremiumSection({
      id: "how_to_read",
      title: "So nutzt ihr diesen Report",
      type: "intro",
      body:
        parsedApplicationIntro?.text ??
        "Dieser Report ist ein strukturierter Gesprächsrahmen für eure Zusammenarbeit und unterstützt euch bei bewussten Abstimmungen.",
    }),
    createPremiumSection({
      id: "executive_summary",
      title: "Executive Summary",
      type: "summary",
      body: executiveBody,
      bullets: executiveBullets.slice(0, 3),
    }),
    createPremiumSection({
      id: "collaboration_overview",
      title: "Zusammenarbeit im Überblick",
      type: "overview",
      body:
        "Die folgende Übersicht zeigt eure Muster in den sechs Kernfeldern der Zusammenarbeit. Nicht als Bewertung, sondern als Gesprächsgrundlage für bewusstes Alignment.",
    }),
    createPremiumSection({
      id: "data_coverage",
      title: "Datenabdeckung",
      type: "analysis",
      body: coverageNote,
    }),
    createPremiumSection({
      id: "decision_architecture",
      title: "Entscheidungsarchitektur",
      type: "analysis",
      bullets: decisionArchitecture
        .map((token) => parseTaggedToken(token))
        .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        .map((entry) => `${entry.title}: ${entry.text}`),
    }),
    createPremiumSection({
      id: "risk_contract",
      title: "Risikovertrag",
      type: "analysis",
      bullets: riskContract
        .map((token) => parseTaggedToken(token))
        .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        .map((entry) => `${entry.title}: ${entry.text}`),
    }),
    createPremiumSection({
      id: "dimension_details",
      title: "Dimensionen im Detail",
      type: "analysis",
      bullets: dimensionDossiers
        .map((token) => parseTaggedToken(token))
        .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        .map((entry) => `${entry.title}: ${entry.text}`),
    }),
    createPremiumSection({
      id: "critical_stolperstellen",
      title: "Kritische Stolperstellen",
      type: "analysis",
      bullets: criticalTensions
        .map((token) => parseTaggedToken(token))
        .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        .map((entry) => `${entry.title}: ${entry.text}`),
    }),
    createPremiumSection({
      id: "conversation_guide",
      title: "Gesprächsleitfaden",
      type: "checklist",
      checklist: conversationGuide.filter((entry) => entry.startsWith("[ ] ")),
    }),
    createPremiumSection({
      id: "work_agreements_30_60_90",
      title: "30/60/90-Tage Arbeitsabsprachen",
      type: "checklist",
      checklist: actionPlanTokens.map(normalizePlanTokenForChecklist),
    }),
    createPremiumSection({
      id: "closing",
      title: "Abschluss",
      type: "closing",
      body:
        parsedClosing?.text ??
        "Dieser Report ist ein Ausgangspunkt für bewusste Zusammenarbeit, nicht ihr Endpunkt.",
      bullets: parsedClosingQuestions.map((entry) => entry.text),
    }),
  ];
  if (valuesContent) {
    sections.splice(
      8,
      0,
      createPremiumSection({
        id: "values_alignment",
        title: "Fundament eurer Zusammenarbeit (Werte-Alignment)",
        type: "analysis",
        body: valuesContent.kurzfazit,
        bullets: valuesContent.bullets,
      })
    );
  }

  const compareJson = {
    sections,
    cover: {
      reportType:
        valuesContent != null ? "Basis + Werte-Kern" : "Basis",
      matchStatus: !compareResult.isDataSufficient
        ? "daten_unvollstaendig"
        : compareResult.summaryType === "Die Harmonischen Stabilisatoren"
          ? "stabil"
          : "aktiv",
      dimensions: REPORT_DIMENSIONS.map((dimension) => DIMENSION_DEFINITIONS_DE[dimension].name),
    },
    executiveSummary: {
      summaryType: compareResult.summaryType,
      topMatches: [applicationIntro, ...executiveSummaryTokens, ...decisionArchitecture, ...dimensionDossiers],
      topTensions: [...riskContract, ...criticalTensions, closingReflection, ...closingQuestions],
      bullets: executiveBullets,
      valuesMatchSentence: valuesContent?.kurzfazit ?? "",
    },
    keyInsights: topInsights,
    deepDive: perDimension,
    valuesModule: {
      alignmentPercent: valuesAlignmentPercent,
      identityA: valuesContent ? resolveValuesIdentity(profileA.valuesArchetypeId) : null,
      identityB: valuesContent ? resolveValuesIdentity(profileB.valuesArchetypeId) : null,
      text: valuesContent?.kurzfazit ?? "",
    },
    coverage: {
      comparableDimensions: comparableDimensionCount,
      totalDimensions: totalDimensionCount,
      isDataSufficient,
      minimumComparableDimensions: MIN_COMPARABLE_DIMENSIONS,
      note: coverageNote,
    },
    conversationGuide: unique(conversationGuide),
  };
  (compareJson as CompareReportJson & { templateVersion: number }).templateVersion = 2;
  return compareJson as CompareReportJson;
}

function insightDimensionLabel(dimension: ReportDimension) {
  return dimension === "Risiko" ? "Risikoprofil" : dimension;
}

type InsightBadgeLabel =
  | "Hohe Passung"
  | "Produktive Ergänzung"
  | "Abstimmungsbedarf"
  | "Daten unvollständig";

function hasComparableDelta(block: CompareDimensionBlock) {
  return typeof block.diff === "number" && Number.isFinite(block.diff);
}

function buildTopInsights(
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  if (perDimension.length === 0) return [];

  const orderedAsc = [...perDimension].sort((a, b) => (a.diff ?? 0) - (b.diff ?? 0));
  const stabilizer = orderedAsc[0];
  const abstimmung = orderedAsc[orderedAsc.length - 1];
  const used = new Set<ReportDimension>([stabilizer.dimension, abstimmung.dimension]);

  const produktiveErgaenzung = orderedAsc.find(
    (block) => !used.has(block.dimension) && classifyDelta(block) === "Produktive Ergänzung"
  );
  const fallbackHebel =
    produktiveErgaenzung ??
    orderedAsc.find((block) => !used.has(block.dimension)) ??
    stabilizer;

  const picks: CompareDimensionBlock[] = [
    stabilizer,
    fallbackHebel,
    abstimmung,
  ];

  const uniquePicks: CompareDimensionBlock[] = [];
  const seen = new Set<ReportDimension>();
  for (const block of picks) {
    if (seen.has(block.dimension)) continue;
    seen.add(block.dimension);
    uniquePicks.push(block);
  }

  return uniquePicks.map((block) => {
    const label = toInsightBadgeLabel(block);
    return {
      dimension: block.dimension,
      title: `${label} · ${insightDimensionLabel(block.dimension)}`,
      text: buildInsightNarrative(block, label, nameA, nameB),
    };
  });
}

function parseTaggedToken(token: string) {
  const [tag, title, ...textParts] = token.split("|");
  if (!tag || !title || textParts.length === 0) return null;
  return {
    tag,
    title: title.trim(),
    text: textParts.join("|").trim(),
  };
}

function normalizePlanTokenForChecklist(value: string) {
  return value.replace(/^PLAN(30|60|90)\|/, "$1|").trim();
}

export function classifyDelta(
  block: Pick<CompareDimensionBlock, "diff" | "diffClass">
): "Hohe Passung" | "Produktive Ergänzung" | "Braucht bewusste Abstimmung" | "Datenlage unvollständig" {
  if (block.diff == null) return "Datenlage unvollständig";
  if (block.diffClass === "SMALL") return "Hohe Passung";
  if (block.diffClass === "MEDIUM") return "Produktive Ergänzung";
  return "Braucht bewusste Abstimmung";
}

function toInsightBadgeLabel(block: Pick<CompareDimensionBlock, "diff" | "diffClass">): InsightBadgeLabel {
  const classification = classifyDelta(block);
  if (classification === "Braucht bewusste Abstimmung") return "Abstimmungsbedarf";
  if (classification === "Datenlage unvollständig") return "Daten unvollständig";
  return classification;
}

function buildApplicationIntroToken(nameA: string, nameB: string) {
  const text = `Dieser Report ist ein dialogisch-analytischer Arbeitsrahmen für ${nameA} und ${nameB}, nicht nur eine Ergebnisanzeige. Er hilft euch, Zusammenarbeit als gestaltbare Führungsaufgabe zu behandeln, statt als Frage spontaner Sympathie. Er ist kein Orakel und keine endgültige Bewertung eurer persönlichen Eignung. Unterschiede sind hier kein Defizit, sondern Rohmaterial für klare Rollen- und Entscheidungsarchitektur. Erst Überblick: Schaut gemeinsam auf die übergreifenden Muster und benennt, was euch bereits Stabilität gibt. Dann Dimensionen: Geht die Detailabschnitte nacheinander durch und trennt Beobachtung, Interpretation und konkrete Vereinbarung. Dann Gesprächsteil: Nutzt den Leitfaden, um heikle Punkte strukturiert zu klären, bevor sie operativ eskalieren. Wenn ihr den Report so verwendet, wird aus Diagnose ein umsetzbarer Kooperationsvertrag für euren Alltag.`;
  return `INTRO|Was dieser Report ist – und nicht ist|${text}`;
}

function buildExecutiveDecisionTokens(
  compareResult: CompareResult,
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  const comparable = perDimension.filter(hasComparableDelta);
  const strongestFit = [...comparable].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];
  const strongestTension = [...comparable].sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))[0];
  const fitDimension = strongestFit ? DIMENSION_DEFINITIONS_DE[strongestFit.dimension].name : "einer Kern-Dimension";
  const tensionDimension = strongestTension
    ? DIMENSION_DEFINITIONS_DE[strongestTension.dimension].name
    : "einem kritischen Feld";

  const decisionSentence = compareResult.isDataSufficient
    ? `${nameA} und ${nameB} zeigen im Gesamtbild den Team-Typ „${compareResult.summaryType}“. Auf Entscheidungsebene ist besonders relevant, wie ihr euer stärkstes Spannungsfeld in ${tensionDimension} durch klare Regeln steuert.`
    : `${nameA} und ${nameB} zeigen aktuell eine unvollständige Vergleichsdatenlage (${compareResult.dataCoverageText}). Eine valide Typisierung ist erst nach vollständiger Datenabdeckung sinnvoll.`;
  const governanceSentence = compareResult.isDataSufficient
    ? `Eure stabilste gemeinsame Basis liegt in ${fitDimension}. Nutzt genau diese Zone als Verankerung für schwierige Entscheidungen, damit Differenzen in anderen Bereichen nicht eskalieren.`
    : "Governance-Hinweis: Verankert zunächst die fehlenden Basisdimensionen im Fragebogen, bevor ihr aus der Match-Logik verbindliche Führungsentscheidungen ableitet.";
  const operatingSentence = compareResult.isDataSufficient
    ? "Führungstechnisch gilt: Hohe Passung beschleunigt Abstimmung, Komplementarität erhöht Qualität und kritische Spannungsfelder brauchen explizite Governance."
    : "Führungstechnisch gilt: Ohne ausreichende Datenbasis sollten nur vorläufige Arbeitshypothesen genutzt und keine belastbaren Teamurteile abgeleitet werden.";

  return [
    `EXEC|Executive Summary|${decisionSentence}`,
    `EXEC|Entscheidungslogik|${governanceSentence}`,
    `EXEC|Operative Konsequenz|${operatingSentence}`,
  ];
}

function buildInsightNarrative(
  block: CompareDimensionBlock,
  label: InsightBadgeLabel,
  nameA: string,
  nameB: string
) {
  const dimensionName = DIMENSION_DEFINITIONS_DE[block.dimension].name;
  const archetypeSentence = hasSameArchetype(block)
    ? `Ihr beide zeigt in ${dimensionName} das gleiche Archetypmuster (${block.archetypeA.name}) und bringt damit eine sehr ähnliche Grundlogik in die Zusammenarbeit ein.`
    : `${nameA} agiert in ${dimensionName} eher als ${block.archetypeA.name}, ${nameB} eher als ${block.archetypeB.name}.`;
  const impactSentence = `${dimensionEverydaySignal(block)} Das prägt eure Zusammenarbeit vor allem bei Priorisierung und Entscheidungstempo.`;
  const diagnosticSentence =
    label === "Hohe Passung"
      ? "Das ist euer Stabilitätsanker: In diesem Feld könnt ihr unter Druck besonders konsistent führen."
      : label === "Produktive Ergänzung"
        ? "Hier liegt euer Hebel: Unterschiedliche Perspektiven erhöhen bei klarer Moderation die Qualität eurer Entscheidungen."
        : label === "Daten unvollständig"
          ? "Hier ist aktuell keine belastbare Vergleichsaussage möglich, weil beidseitige Daten fehlen."
          : "Hier liegt euer Risikofeld: Ohne explizite Regeln kippen unterschiedliche Grundannahmen schnell in operative Reibung.";
  const agreementSentence =
    label === "Hohe Passung"
      ? `Vereinbarung: Definiert gemeinsam, wie ihr ${dimensionName} als Referenz nutzt, sobald andere Felder unter Druck geraten.`
      : label === "Produktive Ergänzung"
        ? `Vereinbarung: Legt für ${dimensionName} ein kurzes Entscheidungsprotokoll fest, damit Ergänzung systematisch genutzt wird statt zufällig zu wirken.`
        : label === "Daten unvollständig"
          ? `Vereinbarung: Schließt zunächst die fehlenden Basisdaten in ${dimensionName}, bevor ihr daraus Arbeitsregeln ableitet.`
          : `Vereinbarung: Plant in ${dimensionName} einen festen Abstimmungstermin pro Woche und haltet eine verbindliche Eskalationsregel schriftlich fest.`;

  return `${archetypeSentence} ${impactSentence} ${diagnosticSentence} ${agreementSentence}`;
}

function toDimensionDossierToken(
  block: CompareDimensionBlock,
  nameA: string,
  nameB: string
) {
  const dimensionName = DIMENSION_DEFINITIONS_DE[block.dimension].name;
  const text =
    block.dimension === "Verbindlichkeit"
      ? buildPremiumCommitmentDimensionTemplate(block, nameA, nameB, dimensionName)
      : buildPremiumDimensionText(block, nameA, nameB, dimensionName);
  return `DIM|${dimensionName}|${text}`;
}

function buildDecisionArchitecture(
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  const decision = perDimension.find((block) => block.dimension === "Entscheidung" && hasComparableDelta(block));
  const autonomy = perDimension.find((block) => block.dimension === "Autonomie" && hasComparableDelta(block));
  const conflict = perDimension.find((block) => block.dimension === "Konflikt" && hasComparableDelta(block));

  const decisionRule = decision
    ? `${nameA} (${decision.archetypeA.name}) und ${nameB} (${decision.archetypeB.name}) profitieren von einer zweistufigen Entscheidungslogik: kurzfristige operative Entscheidungen und strategische Entscheidungen mit strukturierter Voranalyse.`
    : `${nameA} und ${nameB} sollten operative und strategische Entscheidungen sauber trennen, um Geschwindigkeit ohne Qualitätsverlust zu sichern.`;
  const ownershipRule = autonomy
    ? `Ownership-Architektur: In Autonomie zeigt ihr unterschiedliche Präferenzen für Nähe und Freiheit. Definiert deshalb pro Verantwortungsbereich ein finales Entscheidungsmandat und einen festen Abstimmungstakt.`
    : "Ownership-Architektur: Definiert je Bereich ein finales Entscheidungsmandat plus wöchentlichen Alignment-Slot.";
  const conflictRule = conflict
    ? `Konflikt-Architektur: ${conflict.dailyPressure} Verankert eine klare Eskalationsregel mit zeitnahen Feedbackschleifen, damit Spannungen nicht in operative Verzögerungen übersetzen.`
    : "Konflikt-Architektur: Führt eine explizite Eskalationsregel ein, damit Reibung früh bearbeitet wird.";

  return [
    `ARCH|Entscheidungsarchitektur|${decisionRule}`,
    `ARCH|Governance|${ownershipRule}`,
    `ARCH|Konfliktprotokoll|${conflictRule}`,
  ];
}

function buildRiskContract(
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  const risk = perDimension.find((block) => block.dimension === "Risiko" && hasComparableDelta(block));
  const commitment = perDimension.find((block) => block.dimension === "Verbindlichkeit" && hasComparableDelta(block));
  const vision = perDimension.find((block) => block.dimension === "Vision" && hasComparableDelta(block));

  const implicitAssumptions = risk
    ? `RISK|Implizite Annahmen|In Risiko zeigt ihr unterschiedliche Toleranzen. Klärt explizit, welches Verlustniveau, welcher Runway und welches Experimentrisiko für euch jeweils noch verantwortbar sind.`
    : "RISK|Implizite Annahmen|Definiert explizit, welches Risiko ihr finanziell und reputativ akzeptiert.";
  const pressureRule = commitment
    ? `RISK|Belastungsgrenzen|In Verbindlichkeit zeigen sich unterschiedliche Erwartungen an Einsatz und Zusagen. Definiert einen verbindlichen Mindeststandard für Zusagen, bevor operative Konflikte eskalieren.`
    : "RISK|Belastungsgrenzen|Legt fest, welche Zusagen als unverhandelbar gelten und welche adaptiv bleiben.";
  const strategicRisk = vision
    ? `RISK|Strategisches Konfliktpotenzial|In Vision arbeiten unterschiedliche Prioritäten zusammen. Ohne gemeinsamen Zielkorridor drohen Priorisierungskonflikte zwischen Substanz- und Skalierungslogik.`
    : `RISK|Strategisches Konfliktpotenzial|${nameA} und ${nameB} sollten einen gemeinsamen Zielkorridor für Wachstum und Stabilität definieren.`;

  return [implicitAssumptions, pressureRule, strategicRisk];
}

function buildCriticalTensionTokens(
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  const flagged = [...perDimension]
    .filter((block) => hasComparableDelta(block) && classifyDelta(block) === "Braucht bewusste Abstimmung")
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0));
  const source =
    flagged.length > 0
      ? flagged
      : [...perDimension]
          .filter(hasComparableDelta)
          .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
          .slice(0, 2);

  if (source.length === 0) {
    return [
      "TENSION|Datenlage|Für kritische Spannungsfelder liegen aktuell zu wenige vergleichbare Dimensionen vor. Entschärfung: Vervollständigt zuerst die Basisdaten beider Seiten. Leitfrage: Welche fehlende Dimension klärt ihr als Nächstes gemeinsam?",
    ];
  }

  return source.map((block) => {
    const dimensionName = DIMENSION_DEFINITIONS_DE[block.dimension].name;
    return `TENSION|${dimensionName}|Kritisches Spannungsfeld in ${dimensionName}: ${nameA} (${block.archetypeA.name}) und ${nameB} (${block.archetypeB.name}) deuten Prioritäten in diesem Feld voraussichtlich mit unterschiedlicher Grundlogik. Entschärfung: Vereinbart eine kurze Vorab-Klärung eurer Entscheidungskriterien und haltet fest, welche Annahme in der aktuellen Lage Priorität hat. Leitfrage: ${block.reflectionQuestion}`;
  });
}

function buildClosingReflectionToken(
  compareResult: CompareResult,
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  const strongest = [...perDimension].filter(hasComparableDelta).sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];
  const strongestLabel = strongest ? DIMENSION_DEFINITIONS_DE[strongest.dimension].name : "eurer Zusammenarbeit";
  const text = `Dieser Report bewertet weder ${nameA} noch ${nameB}; er ordnet eure gemeinsame Arbeitslogik als ${compareResult.summaryType} ein. Sein Nutzen entsteht im Gespräch, nicht im stillen Lesen. Nutzt ihn deshalb als Arbeitsdokument für konkrete Entscheidungen, Rollenklarheit und Belastungssteuerung. Besonders in ${strongestLabel} zeigt sich, welche Muster euch bereits tragen und als Referenz für schwierige Situationen dienen können. In anderen Feldern entsteht Qualität erst dann, wenn ihr Spannungen ausdrücklich besprecht und in Vereinbarungen übersetzt. Führt die zentralen Absprachen in eure regulären Weekly-Formate über, damit sie im Tagesgeschäft wirksam bleiben. Plant nach zwei bis drei Wochen eine kurze Re-Evaluierung: Was hat Stabilität erzeugt, wo braucht ihr eine Nachschärfung? Wenn ihr nur eine Sache bewusst klärt, dann die Spielregel für euer aktuell kritischstes Spannungsfeld.`;
  return `CLOSING|Abschließende Reflexion|${text}`;
}

function buildClosingQuestionTokens() {
  return [
    "CLOSING|Reflexionsfrage 1|Welche konkrete Entscheidung verschiebt ihr aktuell, obwohl sie für eure Zusammenarbeit zentral ist?",
    "CLOSING|Reflexionsfrage 2|Welche Vereinbarung wollt ihr bis zum nächsten Weekly sichtbar testen, statt sie nur zu diskutieren?",
  ];
}

function buildNinetyDayPlanTokens(
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  const comparable = perDimension.filter(hasComparableDelta);
  if (comparable.length === 0) {
    return [
      "PLAN30|Vervollständigt zuerst die fehlenden Basisdimensionen für beide Personen.",
      "PLAN60|Wiederholt den Matching-Report nach vollständiger Datenerhebung.",
      "PLAN90|Leitet erst nach vollständiger Datenbasis verbindliche Arbeitsabsprachen ab.",
    ];
  }

  const topRisk = [...comparable].sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0)).slice(0, 3);
  const topA = topRisk[0];
  const topB = topRisk[1] ?? topRisk[0];
  const topC = topRisk[2] ?? topRisk[0];

  return [
    `PLAN30|Erstellt ein gemeinsames Entscheidungs-Playbook für ${DIMENSION_DEFINITIONS_DE[topA.dimension].name} mit klaren Go/No-Go-Kriterien.`,
    `PLAN30|Führt einen 45-minütigen Weekly-Alignment-Call ein, in dem nur Spannungen, Risiken und Prioritätskonflikte besprochen werden.`,
    `PLAN60|Validiert eure Regeln an realen Entscheidungen aus ${DIMENSION_DEFINITIONS_DE[topB.dimension].name} und dokumentiert Abweichungen transparent.`,
    `PLAN60|Kalibriert Rollen, Mandate und Eskalationswege erneut, wenn ihr dieselbe Reibung zweimal hintereinander beobachtet.`,
    `PLAN90|Führt ein retrospektives Audit durch: Welche Regel hat Wirkung gezeigt, welche muss ersetzt werden?`,
    `PLAN90|Legt als Führungsduo drei verbindliche Leitprinzipien fest, die ab sofort für alle kritischen Entscheidungen gelten (${nameA} + ${nameB}).`,
    `PLAN90|Überprüft im Bereich ${DIMENSION_DEFINITIONS_DE[topC.dimension].name}, ob eure aktuelle Zusammenarbeit mehr Wert schafft als sie Koordinationskosten erzeugt.`,
  ];
}

export function buildProfileResultFromSession(
  report: SessionAlignmentReport,
  target: "A" | "B"
): ProfileResult {
  const name = target === "A" ? report.participantAName : report.participantBName ?? "Person B";
  const scores = target === "A" ? report.scoresA : report.scoresB;
  const valuesArchetype = target === "A" ? report.valuesIdentityCategoryA : report.valuesIdentityCategoryB;
  const valuesScore =
    target === "A"
      ? report.valuesScoreA ?? null
      : report.valuesScoreB ?? null;

  const dimensionZones = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    const score = scores[dimension] ?? 3.5;
    acc[dimension] = scoreToZone(score, dimension);
    return acc;
  }, {} as Record<ReportDimension, ZoneBand>);

  const archetypeIdPerDimension = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = DIMENSION_DEFINITIONS_DE[dimension].archetypesByZone[dimensionZones[dimension]].id;
    return acc;
  }, {} as Record<ReportDimension, string>);

  return {
    profileId: target,
    displayName: name,
    dimensionScores: scores,
    dimensionZones,
    archetypeIdPerDimension,
    valuesScore,
    valuesArchetypeId: valuesArchetype ? normalizeValuesArchetypeId(valuesArchetype) : null,
  };
}

function buildDimensionBlock(
  profileA: ProfileResult,
  profileB: ProfileResult,
  dimension: ReportDimension
): CompareDimensionBlock {
  const definition = DIMENSION_DEFINITIONS_DE[dimension];
  const scoreA = profileA.dimensionScores[dimension];
  const scoreB = profileB.dimensionScores[dimension];

  const zoneA = scoreToZone(scoreA ?? 3.5, dimension);
  const zoneB = scoreToZone(scoreB ?? 3.5, dimension);
  const archetypeA = definition.archetypesByZone[zoneA];
  const archetypeB = definition.archetypesByZone[zoneB];

  const diff = scoreA != null && scoreB != null ? Number(Math.abs(scoreA - scoreB).toFixed(2)) : null;
  const diffClass = diff == null ? "MEDIUM" : getDiffClass(diff, dimension);
  const label = diff == null ? "DATEN_UNVOLLSTAENDIG" : diffClassToLabel(diffClass);

  const hasStrongPairing =
    (zoneA === "low" && zoneB === "high") || (zoneA === "high" && zoneB === "low");

  return {
    dimension,
    scoreA,
    scoreB,
    zoneA,
    zoneB,
    archetypeA,
    archetypeB,
    diff,
    diffClass,
    label,
    summaryA: `Ausprägung: ${archetypeA.name}. ${archetypeA.descriptionShort} ${startupBehaviorSentence(
      dimension,
      zoneA
    )}`,
    summaryB: `Ausprägung: ${archetypeB.name}. ${archetypeB.descriptionShort} ${startupBehaviorSentence(
      dimension,
      zoneB
    )}`,
    dailyPressure: hasStrongPairing
      ? definition.dailyPressureByZoneOrPair.low_high_pair
      : definition.dailyPressureByZoneOrPair[zoneA],
    reflectionQuestion: definition.reflectionQuestions[diffClass],
  };
}

function startupBehaviorSentence(dimension: ReportDimension, zone: ZoneBand) {
  if (dimension === "Vision") {
    if (zone === "low") {
      return "Im Startup-Alltag zeigt sich das in disziplinierter Kapitalallokation, konsequenter Qualitätspriorisierung und einem klaren Fokus auf langfristig tragfähige Wertschöpfung.";
    }
    if (zone === "high") {
      return "Im Startup-Alltag zeigt sich das in hoher Marktdynamik, schnellen Go-to-Market-Entscheidungen und einer offensiven Expansionslogik.";
    }
    return "Im Startup-Alltag zeigt sich das in einer balancierten Kombination aus validiertem Aufbau und gezielten Skalierungsschritten.";
  }

  if (dimension === "Entscheidung") {
    if (zone === "low") return "Im Alltag werden Entscheidungen stärker vorbereitet, transparent dokumentiert und evidenzbasiert abgesichert.";
    if (zone === "high") return "Im Alltag werden Entscheidungen mit hoher Geschwindigkeit getroffen und in kurzen Lernzyklen nachjustiert.";
    return "Im Alltag wird je nach Entscheidungstyp flexibel zwischen analytischer Tiefe und Umsetzungsdynamik geschaltet.";
  }

  if (dimension === "Risiko") {
    if (zone === "low") return "Im Alltag stehen Runway-Schutz, strukturierte Risikoprüfung und planbare Umsetzungsschritte im Vordergrund.";
    if (zone === "high") return "Im Alltag werden größere Wetten bewusst eingegangen, um strategische Chancenfenster aktiv zu nutzen.";
    return "Im Alltag werden kalkulierte Risiken eingegangen und systematisch durch Back-up-Szenarien abgesichert.";
  }

  if (dimension === "Autonomie") {
    if (zone === "low") return "Im Alltag dominiert ein eng synchronisierter Abstimmungsmodus mit hoher Transparenz und kurzer Rückkopplung.";
    if (zone === "high") return "Im Alltag dominiert eigenverantwortliche Umsetzung mit klaren Zuständigkeiten und asynchroner Zusammenarbeit.";
    return "Im Alltag werden kollaborative Abstimmung und fokussierte Umsetzungsphasen bewusst austariert.";
  }

  if (dimension === "Verbindlichkeit") {
    if (zone === "low") return "Im Alltag werden Deadlines eher adaptiv verstanden und an veränderte Rahmenbedingungen angepasst.";
    if (zone === "high") return "Im Alltag gelten Zusagen als bindende Commitments mit hohem Liefer- und Qualitätsanspruch.";
    return "Im Alltag werden Zusagen verlässlich eingehalten, begleitet von proaktiver Kommunikation bei Zielabweichungen.";
  }

  if (zone === "low") return "Im Alltag werden Spannungen eher moderierend und beziehungsorientiert bearbeitet, um psychologische Sicherheit zu erhalten.";
  if (zone === "high") return "Im Alltag werden Spannungen früh, direkt und mit hoher Klarheit adressiert, um schnelle Klärung zu ermöglichen.";
  return "Im Alltag werden Konflikte strukturiert, sachlich und mit klarem Lösungsfokus moderiert.";
}

function buildCompareResult(
  profileA: ProfileResult,
  profileB: ProfileResult,
  perDimension: CompareDimensionBlock[]
): CompareResult {
  const comparable = perDimension.filter(hasComparableDelta);
  const orderedByMatch = [...comparable].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99));
  const orderedByTension = [...comparable].sort((a, b) => (b.diff ?? -1) - (a.diff ?? -1));
  const deltaSum = comparable.reduce((sum, block) => sum + (block.diff ?? 0), 0);
  const comparableDimensionCount = comparable.length;
  const totalDimensionCount = REPORT_DIMENSIONS.length;
  const isDataSufficient = comparableDimensionCount >= MIN_COMPARABLE_DIMENSIONS;
  const dataCoverageText = `${comparableDimensionCount}/${totalDimensionCount} Dimensionen belastbar`;
  const summaryType =
    !isDataSufficient
      ? "Datenlage unvollständig"
      : deltaSum <= 6
        ? "Die Harmonischen Stabilisatoren"
        : deltaSum <= 12
          ? "Die balancierten Strategen"
          : "Das High-Friction Power-Duo";

  return {
    pairId: `${profileA.profileId}_${profileB.profileId}`,
    perDimension,
    topMatches: orderedByMatch.slice(0, 3).map((block) => block.dimension),
    topTensions: orderedByTension.slice(0, 3).map((block) => block.dimension),
    comparableDimensionCount,
    totalDimensionCount,
    dataCoverageText,
    isDataSufficient,
    summaryType,
  };
}

function buildExecutiveBullets(compareResult: CompareResult, nameA: string, nameB: string) {
  if (!compareResult.isDataSufficient) {
    return [
      `Datenabdeckung: Aktuell sind ${compareResult.dataCoverageText}. Für eine belastbare Match-Einordnung fehlen noch Dimensionen mit beidseitigen Basisdaten.`,
      "Interpretation mit Vorsicht: Einzelne Muster sind sichtbar, aber Team-Typing und Priorisierung sind derzeit nur vorläufig belastbar.",
      "Nächster Schritt: Schließt die fehlenden Basisdimensionen ab und erzeugt den Report erneut für eine valide Vergleichsgrundlage.",
    ];
  }

  const comparable = compareResult.perDimension.filter(hasComparableDelta);
  const closest = [...comparable].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];
  const widest = [...comparable].sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))[0];
  const stableZone = closest ? DIMENSION_DEFINITIONS_DE[closest.dimension].name : "einem Kernfeld";
  const watchZone = widest ? DIMENSION_DEFINITIONS_DE[widest.dimension].name : "einem kritischen Feld";
  const watchClass = widest ? classifyDelta(widest).toLowerCase() : "produktive Ergänzung";

  return [
    `Euer größter gemeinsamer Hebel: ${nameA} und ${nameB} haben in ${stableZone} eine tragfähige gemeinsame Logik. Dieses Feld kann euch in schwierigen Situationen stabilisieren und die Entscheidungsqualität absichern.`,
    `Euer kritischstes Spannungsfeld: In ${watchZone} braucht ihr bewusste Abstimmung. Ohne klare Regel kippt ${watchClass} in operative Reibung und bindet unnötige Führungsenergie.`,
    `Was ihr aktiv gestalten müsst: Vereinbart innerhalb der nächsten 48 Stunden ein kurzes Alignment. Legt für ${watchZone} eine verbindliche Entscheidungsregel fest und überprüft ihre Wirkung nach zwei Wochen.`,
  ];
}

function buildExecutiveBody(
  compareResult: CompareResult,
  perDimension: CompareDimensionBlock[],
  nameA: string,
  nameB: string
) {
  if (!compareResult.isDataSufficient) {
    return `Die aktuelle Datenlage ist unvollständig (${compareResult.dataCoverageText}). Deshalb wird hier bewusst kein belastbares Team-Typing ausgewiesen. Ergänzt fehlende Basisdaten, bevor ihr strategische Schlüsse aus dem Vergleich zieht.`;
  }

  const comparable = perDimension.filter(hasComparableDelta);
  const strongestFit = [...comparable].sort((a, b) => (a.diff ?? 99) - (b.diff ?? 99))[0];
  const strongestTension = [...comparable].sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))[0];
  const fitDimension = strongestFit
    ? DIMENSION_DEFINITIONS_DE[strongestFit.dimension].name
    : "einer stabilen Kerndimension";
  const tensionDimension = strongestTension
    ? DIMENSION_DEFINITIONS_DE[strongestTension.dimension].name
    : "einem sensiblen Abstimmungsfeld";
  return `${nameA} und ${nameB} agieren aktuell als ${compareResult.summaryType}. Eure verlässlichste Basis liegt in ${fitDimension} und gibt euch Orientierung in kritischen Momenten. Die größte Führungsaufgabe entsteht in ${tensionDimension}, wo unterschiedliche Logiken nur mit klarer Governance produktiv bleiben.`;
}

function buildPremiumDimensionText(
  block: CompareDimensionBlock,
  nameA: string,
  nameB: string,
  dimensionName: string
) {
  if (!hasComparableDelta(block)) {
    return "Zu wenig Daten in dieser Dimension.";
  }

  const kurzdiagnose = hasSameArchetype(block)
    ? `Ihr beide arbeitet in ${dimensionName} aus demselben Archetyp (${block.archetypeA.name}); die Hauptaufgabe liegt daher weniger in Gegensätzen als in der Vermeidung gemeinsamer blinder Flecken.`
    : `${nameA} (${block.archetypeA.name}) und ${nameB} (${block.archetypeB.name}) bringen in ${dimensionName} unterschiedliche, aber grundsätzlich kombinierbare Führungslogiken ein.`;
  const alltagssignal = `${dimensionEverydaySignal(block)} ${block.dailyPressure}`;
  const fehlschluss =
    "Typische Fehlinterpretation: Unterschiedliches Verhalten wird als Charakterproblem gelesen, obwohl ihr in Wahrheit mit verschiedenen Entscheidungsannahmen arbeitet.";
  const absprachen = buildGenericDimensionAgreements(block.dimension, dimensionName);

  return `Kurzdiagnose: ${kurzdiagnose}||Alltagssignal: ${alltagssignal}||Typischer Fehlschluss: ${fehlschluss}||Konkrete Absprachen: ${absprachen.join(" • ")}||Leitfrage: ${block.reflectionQuestion}`;
}

function buildPremiumCommitmentDimensionTemplate(
  block: CompareDimensionBlock,
  nameA: string,
  nameB: string,
  dimensionName: string
) {
  if (!hasComparableDelta(block)) {
    return "Zu wenig Daten in dieser Dimension.";
  }

  const kurzdiagnose = hasSameArchetype(block)
    ? `${dimensionName} ist euer zentrales Feld für Erwartungssicherheit: Ihr beide definiert Zusagen aus demselben Muster (${block.archetypeA.name}), was Abstimmung vereinfacht, aber gemeinsame Überlastungstendenzen begünstigen kann.`
    : `${dimensionName} ist euer zentrales Feld für Erwartungssicherheit: ${nameA} (${block.archetypeA.name}) und ${nameB} (${block.archetypeB.name}) definieren Zusagen erkennbar unterschiedlich.`;
  const alltagssignal =
    "Im Startup-Alltag wird das besonders sichtbar, wenn Roadmaps kippen, Investorentermine verschoben werden oder Prioritäten unter externem Druck neu gesetzt werden müssen. Was die eine Seite als professionelle Anpassung bewertet, erlebt die andere schnell als Bruch von Verlässlichkeit und Leistungsversprechen.";
  const fehlschluss =
    "Typische Fehlinterpretation: Einsatzhöhe wird stillschweigend als moralische Kategorie gewertet, statt offen über Kapazität, Priorität und Belastungsgrenzen zu sprechen.";
  const absprachen = [
    "Definiert gemeinsam, welche Zusagen absolut bindend sind und welche adaptiv nachverhandelt werden dürfen.",
    "Vereinbart ein Frühwarnsignal, mit dem jede Seite Überlastung oder drohende Zielabweichung rechtzeitig transparent macht.",
    "Legt einen festen Rhythmus für Re-Priorisierung fest, damit Verbindlichkeit und Nachhaltigkeit gleichzeitig geschützt bleiben.",
  ];

  return `Kurzdiagnose: ${kurzdiagnose}||Alltagssignal: ${alltagssignal}||Typischer Fehlschluss: ${fehlschluss}||Konkrete Absprachen: ${absprachen.join(" • ")}||Leitfrage: ${block.reflectionQuestion}`;
}

function hasSameArchetype(block: CompareDimensionBlock) {
  return block.archetypeA.id === block.archetypeB.id;
}

function dimensionEverydaySignal(block: CompareDimensionBlock) {
  if (block.dimension === "Vision") {
    return "Im Alltag zeigt sich das in der Frage, ob ihr Marktfenster aggressiv nutzt oder zuerst operative Tragfähigkeit absichert.";
  }
  if (block.dimension === "Entscheidung") {
    return "Im Alltag zeigt sich das in der Taktung von Beschlüssen: Wie viel Evidenz braucht ihr vor Commitments und wann entscheidet ihr iterativ?";
  }
  if (block.dimension === "Risiko") {
    return "Im Alltag zeigt sich das bei Runway-Entscheidungen, Experimentbudget und der Frage, wie viel Unsicherheit ihr bewusst tragen wollt.";
  }
  if (block.dimension === "Autonomie") {
    return "Im Alltag zeigt sich das im Wechsel zwischen enger Synchronisation und eigenverantwortlicher Umsetzung mit asynchronen Übergaben.";
  }
  if (block.dimension === "Verbindlichkeit") {
    return "Im Alltag zeigt sich das daran, wie strikt ihr Zusagen interpretiert und wann ihr Prioritätswechsel als legitim betrachtet.";
  }
  return "Im Alltag zeigt sich das im Umgang mit Spannungen: ob ihr Reibung früh klärt oder Konflikte zunächst indirekt bearbeitet.";
}

function buildGenericDimensionAgreements(dimension: ReportDimension, dimensionName: string) {
  if (dimension === "Vision") {
    return [
      "Definiert einen gemeinsamen Zielkorridor mit klaren Guardrails für Wachstum versus Stabilität.",
      "Legt für strategische Richtungsentscheidungen einen festen Entscheidungsrhythmus mit Vorbereitungsformat fest.",
      "Dokumentiert, bei welchen Signalen ihr die Priorität bewusst von Substanz auf Skalierung (oder umgekehrt) wechselt.",
    ];
  }
  if (dimension === "Entscheidung") {
    return [
      "Trennt explizit zwischen operativen Entscheidungen mit kurzer Frist und strategischen Entscheidungen mit Analysefenster.",
      "Vereinbart für beide Entscheidungstypen ein klares Entscheidungsmandat und ein Review-Fenster.",
      "Haltet fest, welche Informationen als Mindestgrundlage vor einem Commit zwingend vorliegen müssen.",
    ];
  }
  if (dimension === "Risiko") {
    return [
      "Definiert ein gemeinsames Risikobudget für Experimente, inklusive klarer Stopp-Kriterien.",
      "Legt fest, bei welchen finanziellen oder operativen Triggern automatisch auf Absicherungsmodus umgestellt wird.",
      "Verankert für größere Wetten ein kurzes Pre-Mortem, bevor Ressourcen final gebunden werden.",
    ];
  }
  if (dimension === "Autonomie") {
    return [
      "Definiert pro Verantwortungsbereich ein finales Entscheidungsmandat und einen transparenten Eskalationsweg.",
      "Vereinbart einen festen Check-in-Rhythmus, der Alignment sichert ohne Deep-Work-Zeiten zu zerstören.",
      "Klärt, welche Aufgaben synchron abgestimmt werden müssen und welche bewusst asynchron laufen dürfen.",
    ];
  }
  if (dimension === "Verbindlichkeit") {
    return [
      "Legt verbindlich fest, welche Zusagen nicht verhandelbar sind und welche adaptiv neu priorisiert werden können.",
      "Führt ein Frühwarnsignal für drohende Zielabweichungen ein, das beide Seiten aktiv nutzen.",
      "Vereinbart einen festen Re-Priorisierungsrhythmus, damit Verlässlichkeit und Nachhaltigkeit gleichzeitig geschützt werden.",
    ];
  }
  return [
    `Definiert für ${dimensionName} eine klare Eskalationsregel, bevor Spannungen auf operativer Ebene festfahren.`,
    "Vereinbart ein gemeinsames Feedback-Protokoll, das Sachkritik und Beziehungsschutz gleichzeitig sichert.",
    "Legt einen festen Reflexionszeitpunkt fest, um Konfliktmuster früh nachzuschärfen.",
  ];
}

function buildSingleProfileSummary(profile: ProfileResult) {
  const strongest = REPORT_DIMENSIONS
    .map((dimension) => ({ dimension, score: profile.dimensionScores[dimension] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return strongest.map(
    ({ dimension }) =>
      `${profile.displayName} zeigt in ${DIMENSION_DEFINITIONS_DE[dimension].name} aktuell eine besonders klare Ausprägung.`
  );
}

function scoreToZone(score: number, dimension: ReportDimension): ZoneBand {
  const thresholds = DIMENSION_DEFINITIONS_DE[dimension].thresholds;
  if (score <= thresholds.lowMax) return "low";
  if (score >= thresholds.highMin) return "high";
  return "mid";
}

function diffClassToLabel(diffClass: DiffClass): CompareLabel {
  if (diffClass === "SMALL") return "MATCH";
  if (diffClass === "LARGE") return "FOKUS_THEMA";
  return "KOMPLEMENTAER";
}

type PremiumValuesModuleContent = {
  kurzfazit: string;
  bullets: string[];
};

function buildPremiumValuesModuleContent(
  profileA: ProfileResult,
  profileB: ProfileResult,
  alignment: number | null
) : PremiumValuesModuleContent {
  const nameA = profileA.displayName;
  const nameB = profileB.displayName;
  const identityA = resolveValuesIdentity(profileA.valuesArchetypeId) ?? "Werte-Profil offen";
  const identityB = resolveValuesIdentity(profileB.valuesArchetypeId) ?? "Werte-Profil offen";
  const archetypeA = normalizeValuesArchetypeIdStrict(profileA.valuesArchetypeId);
  const archetypeB = normalizeValuesArchetypeIdStrict(profileB.valuesArchetypeId);

  if (alignment == null || !archetypeA || !archetypeB) {
    return {
      kurzfazit: `${nameA} (${identityA}) trifft auf ${nameB} (${identityB}). Das Werte-Alignment bildet das Fundament eurer Zusammenarbeit, ist aktuell aber noch nicht belastbar auswertbar. Sobald beide Werteprofile vollständig vorliegen, erhaltet ihr eine strukturierte Einordnung zu Stabilitätsfaktoren, Druckpunkten und konkreten Handlungshinweisen.`,
      bullets: [
        "STATE|Werteprofil noch nicht vollständig verfügbar.",
      ],
    };
  }

  const tier = resolveValuesTier(alignment);
  const tierContent = VALUES_REPORT_CONTENT.tiers[tier];
  const pairingText = resolveValuesPairingText(identityA, identityB);
  const weightA = deriveValuesArchetypeWeights(profileA.valuesScore, archetypeA);
  const weightB = deriveValuesArchetypeWeights(profileB.valuesScore, archetypeB);

  const scoredTemplates = VALUE_FOCUS_TEMPLATES.map((template) => {
    const scoreA = scoreValueFocusTemplate(weightA, template);
    const scoreB = scoreValueFocusTemplate(weightB, template);
    const distance = Math.abs(scoreA - scoreB);
    return {
      template,
      scoreA,
      scoreB,
      distance,
    };
  });

  const overlaps = [...scoredTemplates]
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.template.id.localeCompare(b.template.id);
    })
    .slice(0, 3);
  const gaps = [...scoredTemplates]
    .sort((a, b) => {
      if (a.distance !== b.distance) return b.distance - a.distance;
      return a.template.id.localeCompare(b.template.id);
    })
    .slice(0, 2);

  const agreementRules = unique(gaps.map((entry) => entry.template.agreementRule)).slice(0, 3);
  if (agreementRules.length < 3) {
    for (const overlap of overlaps) {
      if (agreementRules.length >= 3) break;
      if (agreementRules.includes(overlap.template.agreementRule)) continue;
      agreementRules.push(overlap.template.agreementRule);
    }
  }
  const questions = unique(gaps.map((entry) => entry.template.conversationQuestion)).slice(0, 2);

  const isSameIdentity = identityA === identityB;
  const identitySentence = isSameIdentity
    ? `Ihr beide arbeitet aus derselben Werte-Identität (${identityA}); eure gemeinsame Haltung ist damit ein stabiler Orientierungsrahmen.`
    : `${nameA} (${identityA}) trifft auf ${nameB} (${identityB}).`;

  const strongestShared = overlaps[0] ?? null;
  const strongestGap = gaps[0] ?? null;
  const sharedAnchor = strongestShared
    ? `Gemeinsame Werte (Stabilitätsfaktor): Besonders tragfähig wirkt aktuell „${strongestShared.template.overlapHeadline}“.`
    : "Gemeinsame Werte (Stabilitätsfaktor): Eure Werteprofile zeigen mindestens ein klar anschlussfähiges Fundament.";
  const gapAnchor = strongestGap
    ? `Divergenzen (Druckpunkte): Der höchste Abstimmungsbedarf zeigt sich bei „${strongestGap.template.gapHeadline}“.`
    : "Divergenzen (Druckpunkte): Aktuell sind keine dominanten Spannungsfelder mit klarer Priorität erkennbar.";
  const everydayMeaning =
    "Bedeutung für den Alltag (Handlungshinweis): Nutzt eure gemeinsamen Werte als Entscheidungsanker und besprecht potenzielle Druckpunkte vor kritischen Commitments ausdrücklich.";
  const kurzfazit = `${identitySentence} Das Werte-Alignment ist das Fundament eurer Zusammenarbeit. ${tierContent.intro} ${pairingText} ${sharedAnchor} ${gapAnchor} ${everydayMeaning}`;

  const enrichedShared = overlaps.map((entry, index) => {
    const example = index === 0
      ? buildSharedValuesExample(entry.template)
      : "";
    const text = example ? `${entry.template.overlapText} ${example}` : entry.template.overlapText;
    return `SHARED|${entry.template.overlapHeadline}|${text}`;
  });
  const enrichedGaps = gaps.map((entry, index) => {
    const example = index === 0
      ? buildGapValuesExample(entry, {
          isSameIdentity,
          nameA,
          nameB,
        })
      : "";
    const riskText = example ? `${entry.template.gapRiskText} ${example}` : entry.template.gapRiskText;
    return `GAP|${entry.template.gapHeadline}|${riskText}|${entry.template.gapMitigationText}`;
  });

  const bullets = [
    ...enrichedShared,
    ...enrichedGaps,
    ...agreementRules.map((rule) => `RULE|${rule}`),
    ...questions.map((question) => `QUESTION|${question}`),
  ];

  return {
    kurzfazit,
    bullets,
  };
}

function resolveValuesTier(alignment: number): keyof typeof VALUES_REPORT_CONTENT.tiers {
  if (alignment >= 85) return "symbiose";
  if (alignment >= 65) return "schnittmenge";
  return "spannungsfeld";
}

function resolveValuesPairingText(identityA: string, identityB: string) {
  const directKey = `${identityA}|${identityB}` as keyof typeof VALUES_REPORT_CONTENT.pairing;
  const reverseKey = `${identityB}|${identityA}` as keyof typeof VALUES_REPORT_CONTENT.pairing;
  return (
    VALUES_REPORT_CONTENT.pairing[directKey] ??
    VALUES_REPORT_CONTENT.pairing[reverseKey] ??
    "Die Kombination eurer Werteprofile kann sehr wirksam sein, wenn ihr Prioritäten und Grenzfälle explizit abstimmt."
  );
}

function normalizeValuesArchetypeIdStrict(value: string | null): ValuesArchetypeId | null {
  if (!value) return null;
  const normalized = normalizeValuesArchetypeId(value);
  if (
    normalized === "impact_idealist" ||
    normalized === "verantwortungs_stratege" ||
    normalized === "business_pragmatiker"
  ) {
    return normalized;
  }
  return null;
}

function hasCompleteMatchValuesProfiles(profileA: ProfileResult, profileB: ProfileResult) {
  if (profileA.valuesScore == null || profileB.valuesScore == null) {
    return false;
  }
  const archetypeA = normalizeValuesArchetypeIdStrict(profileA.valuesArchetypeId);
  const archetypeB = normalizeValuesArchetypeIdStrict(profileB.valuesArchetypeId);
  return archetypeA != null && archetypeB != null;
}

function deriveValuesArchetypeWeights(
  continuumScore: number | null,
  primaryArchetype: ValuesArchetypeId
) {
  const center = continuumScore ?? VALUES_ARCHETYPE_ANCHOR[primaryArchetype];
  const rawWeights = (
    Object.keys(VALUES_ARCHETYPE_ANCHOR) as ValuesArchetypeId[]
  ).reduce(
    (acc, archetypeId) => {
      const distance = Math.abs(center - VALUES_ARCHETYPE_ANCHOR[archetypeId]);
      const proximity = 1 - Math.min(distance / 5, 1);
      let weight = 0.35 + proximity * 0.65;
      if (archetypeId === primaryArchetype) {
        weight += 0.2;
      }
      acc[archetypeId] = weight;
      return acc;
    },
    {} as Record<ValuesArchetypeId, number>
  );

  const sum = Object.values(rawWeights).reduce((acc, value) => acc + value, 0);
  return (Object.keys(rawWeights) as ValuesArchetypeId[]).reduce(
    (acc, archetypeId) => {
      acc[archetypeId] = sum > 0 ? rawWeights[archetypeId] / sum : 1 / 3;
      return acc;
    },
    {} as Record<ValuesArchetypeId, number>
  );
}

function scoreValueFocusTemplate(
  weights: Record<ValuesArchetypeId, number>,
  template: ValueFocusTemplate
) {
  const weighted = (Object.keys(template.weight) as ValuesArchetypeId[]).reduce(
    (acc, archetypeId) => acc + weights[archetypeId] * template.weight[archetypeId],
    0
  );
  return Math.round(weighted * 1000) / 1000;
}

function buildSharedValuesExample(template: ValueFocusTemplate) {
  return `Beispiel aus euren Werteantworten: Beim Themenfeld „${template.overlapHeadline}“ priorisiert ihr sehr ähnliche Leitplanken.`;
}

function buildGapValuesExample(
  entry: {
    template: ValueFocusTemplate;
    scoreA: number;
    scoreB: number;
  },
  context: {
    isSameIdentity: boolean;
    nameA: string;
    nameB: string;
  }
) {
  const delta = Math.abs(entry.scoreA - entry.scoreB);
  if (context.isSameIdentity || delta < 0.08) {
    return `Beispiel aus euren Werteantworten: In „${entry.template.gapHeadline}“ zeigen sich eher Nuancen innerhalb einer ähnlichen Grundhaltung.`;
  }
  if (entry.scoreA > entry.scoreB) {
    return `Beispiel aus euren Werteantworten: ${context.nameA} gewichtet dieses Feld aktuell stärker als ${context.nameB}.`;
  }
  return `Beispiel aus euren Werteantworten: ${context.nameB} gewichtet dieses Feld aktuell stärker als ${context.nameA}.`;
}

function resolveValuesIdentity(valuesArchetypeId: string | null) {
  if (!valuesArchetypeId) return null;
  if (valuesArchetypeId in VALUES_PLAYBOOK) {
    return VALUES_PLAYBOOK[valuesArchetypeId as keyof typeof VALUES_PLAYBOOK].title;
  }
  if (valuesArchetypeId in VALUES_ARCHETYPES_DE) {
    return VALUES_ARCHETYPES_DE[valuesArchetypeId as keyof typeof VALUES_ARCHETYPES_DE].name;
  }
  return valuesArchetypeId;
}

function normalizeValuesArchetypeId(label: string) {
  const value = label.trim().toLowerCase();
  if (value.includes("impact")) return "impact_idealist";
  if (value.includes("verantwortung")) return "verantwortungs_stratege";
  if (value.includes("business")) return "business_pragmatiker";
  return label;
}

function computeValuesAlignmentPercent(scoreA: number | null, scoreB: number | null) {
  if (scoreA == null || scoreB == null) return null;
  const delta = Math.abs(scoreA - scoreB);
  const normalized = Math.max(0, 1 - delta / 5);
  return Math.round(normalized * 100);
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function createMockProfileResult(
  profileId: string,
  displayName: string,
  dimensionScores: RadarSeries,
  valuesScore: number | null = null,
  valuesArchetypeId: string | null = null
): ProfileResult {
  const dimensionZones = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = scoreToZone(dimensionScores[dimension] ?? 3.5, dimension);
    return acc;
  }, {} as Record<ReportDimension, ZoneBand>);

  const archetypeIdPerDimension = REPORT_DIMENSIONS.reduce((acc, dimension) => {
    acc[dimension] = DIMENSION_DEFINITIONS_DE[dimension].archetypesByZone[dimensionZones[dimension]].id;
    return acc;
  }, {} as Record<ReportDimension, string>);

  return {
    profileId,
    displayName,
    dimensionScores,
    dimensionZones,
    archetypeIdPerDimension,
    valuesScore,
    valuesArchetypeId,
  };
}
