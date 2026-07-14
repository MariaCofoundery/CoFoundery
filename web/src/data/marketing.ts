import { normalizeLocale, type AppLocale } from "@/i18n/config";

export const BASE_QUESTION_COUNT = 36;
export const BASE_QUESTION_COUNT_LABEL_DE = `${BASE_QUESTION_COUNT} Fragen`;

export const steps = [
  {
    step: "01",
    title: "Session erstellen",
    text: "Eine Person startet die Session, wählt den Team-Kontext und teilt den sicheren Link mit der zweiten Person.",
  },
  {
    step: "02",
    title: "Basisprofil ausfüllen",
    text: `Beide bearbeiten den Basisfragebogen mit ${BASE_QUESTION_COUNT_LABEL_DE}. Optional kommt das Werte-Add-on dazu.`,
  },
  {
    step: "03",
    title: "Gemeinsam weiterarbeiten",
    text: "Danach stehen Matching-Report und gemeinsames Workbook bereit, um Entscheidungen sauber weiterzuführen.",
  },
];

type AudienceVisual = "pre-founder" | "existing-team" | "advisor";
type SectionGlyphType =
  | "decision"
  | "risk"
  | "commitment"
  | "collaboration"
  | "research"
  | "practice"
  | "reflection";

export type MarketingContent = {
  nav: Array<{ label: string; href: string }>;
  topNav: {
    product: string;
    howItWorks: string;
    faq: string;
    login: string;
    start: string;
    mobileStart: string;
    openNavigation: string;
  };
  hero: {
    supportPoints: string[];
    founderSignals: Array<{
      title: string;
      profileLabel: string;
      items: Array<{ label: string; width: string; tone: string }>;
    }>;
    comparisonRows: Array<{
      label: string;
      hint: string;
      leftWidth: string;
      rightWidth: string;
      tone: string;
    }>;
    summaryPoints: string[];
    visual: {
      profileLabel: string;
      reportEyebrow: string;
      reportTitle: string;
      reportBadge: string;
    };
    headline: string;
    subline: string;
    primaryCta: string;
    secondaryCta: string;
  };
  audiences: Array<{ title: string; text: string; visual: AudienceVisual }>;
  dimensions: Array<{ title: string; text: string; icon: SectionGlyphType }>;
  features: Array<{ title: string; text: string }>;
  home: {
    audienceEyebrow: string;
    audienceTitle: string;
    audienceText: string;
    problemEyebrow: string;
    problemTitle: string;
    problemParagraphs: string[];
    problemCards: Array<{ title: string; text: string }>;
    productEyebrow: string;
    productTitle: string;
    productText: string;
    approachEyebrow: string;
    approachTitle: string;
    approachParagraphs: string[];
    approachCards: Array<{ title: string; text: string }>;
    dimensionsEyebrow: string;
    dimensionsTitle: string;
    dimensionsParagraphs: string[];
    dimensionsFooter: string;
    evidenceEyebrow: string;
    evidenceTitle: string;
    evidenceCards: Array<{ title: string; text: string; icon: SectionGlyphType }>;
    faqEyebrow: string;
    faqTitle: string;
    footerText: string;
    legalNotice: string;
    privacyPolicy: string;
    stanceLink: string;
  };
  faqs: Array<{ q: string; a: string }>;
  howItWorks: {
    panels: Array<{ step: string; title: string; text: string; label: string }>;
    profileEyebrow: string;
    questionCountLabel: string;
    exampleQuestions: string[];
    reportEyebrow: string;
    reportTitle: string;
    reportBadge: string;
    reportRows: Array<{ label: string; left: string; right: string; tone: string }>;
    perspectiveA: string;
    perspectiveB: string;
    perspectiveALines: string[];
    perspectiveBLines: string[];
    sharedRuleEyebrow: string;
    sharedRule: string;
    workbookBadge: string;
    progressLabel: string;
    eyebrow: string;
    title: string;
    text: string;
  };
  stance: {
    navCta: string;
    badge: string;
    quote: string;
    quoteAccent: string;
    title: string;
    paragraphs: string[];
    approachTitle: string;
    approachIntro: string;
    bullets: string[];
    approachOutro: string;
    sourcesTitle: string;
    sources: string[];
    primaryCta: string;
    secondaryCta: string;
  };
};

const MARKETING_CONTENT_DE: MarketingContent = {
  nav: [
    { label: "Haltung", href: "/informierte-entscheidungen" },
    { label: "Für wen", href: "/#fuer-wen" },
    { label: "Produkt", href: "/#produkt" },
    { label: "Ablauf", href: "/#ablauf" },
    { label: "FAQ", href: "/#faq" },
  ],
  topNav: {
    product: "Produkt",
    howItWorks: "So funktioniert’s",
    faq: "FAQ",
    login: "Login",
    start: "Jetzt starten",
    mobileStart: "Starten",
    openNavigation: "Navigation öffnen",
  },
  hero: {
    supportPoints: [`${BASE_QUESTION_COUNT} strukturierte Fragen`, "Klarer Matching-Report", "Gemeinsames Workbook"],
    founderSignals: [
      {
        title: "Founder A",
        profileLabel: "Profil",
        items: [
          { label: "Tempo", width: "76%", tone: "bg-slate-900/80" },
          { label: "Risiko", width: "48%", tone: "bg-slate-300" },
          { label: "Ownership", width: "84%", tone: "bg-emerald-300/85" },
          { label: "Konflikt", width: "58%", tone: "bg-amber-300/90" },
        ],
      },
      {
        title: "Founder B",
        profileLabel: "Profil",
        items: [
          { label: "Tempo", width: "54%", tone: "bg-slate-900/72" },
          { label: "Risiko", width: "72%", tone: "bg-slate-300" },
          { label: "Ownership", width: "62%", tone: "bg-emerald-300/85" },
          { label: "Konflikt", width: "78%", tone: "bg-amber-300/90" },
        ],
      },
    ],
    comparisonRows: [
      { label: "Gemeinsamkeiten", hint: "Tragende Basis", leftWidth: "82%", rightWidth: "82%", tone: "bg-emerald-300/90" },
      { label: "Unterschiede", hint: "Anderer Zugriff", leftWidth: "54%", rightWidth: "80%", tone: "bg-slate-900/78" },
      { label: "Spannungen", hint: "Früh klären", leftWidth: "38%", rightWidth: "66%", tone: "bg-amber-300/95" },
    ],
    summaryPoints: ["Unterschiede früh sichtbar", "Klärungsbedarf vor Konflikt", "Grundlage für gemeinsame Regeln"],
    visual: {
      profileLabel: "Profil",
      reportEyebrow: "Matching-Auswertung",
      reportTitle: "Founder-Kompatibilität wird lesbar",
      reportBadge: "Report",
    },
    headline: "Die meisten Founder merken zu spät, dass sie nicht zusammenpassen.",
    subline:
      "CoFoundery Align zeigt euch, wie ihr wirklich zusammenarbeitet: wo ihr gleich tickt, wo Unterschiede Konfliktpotenzial erzeugen – und wie ihr daraus eine stabile Zusammenarbeit entwickelt.",
    primaryCta: "Founder-Kompatibilität prüfen",
    secondaryCta: "So funktioniert's",
  },
  audiences: [
    {
      title: "Pre-Founder Matching",
      text: "Für Founder, die ernsthaft prüfen wollen, ob sie gemeinsam gründen sollten, bevor aus Sympathie schon ein Commitment wird.",
      visual: "pre-founder",
    },
    {
      title: "Bestehende Founder-Teams",
      text: "Für Teams, die bereits zusammenarbeiten und Rollen, Entscheidungsregeln oder Spannungen strukturierter klären wollen.",
      visual: "existing-team",
    },
    {
      title: "Begleitender Advisor-Kontext",
      text: "Für Advisors, Accelerators oder Investoren, die Gespräche sauber begleiten wollen, ohne das Founder-Team zu überfahren.",
      visual: "advisor",
    },
  ],
  dimensions: [
    { title: "Entscheidungslogik", text: "Wie ihr wichtige Entscheidungen trefft – und worauf ihr euch stützt", icon: "decision" },
    { title: "Commitment & Verantwortung", text: "Wie verbindlich ihr arbeitet und wer wirklich Ownership übernimmt", icon: "commitment" },
    { title: "Risikoorientierung & Tempo", text: "Wie unterschiedlich ihr mit Unsicherheit und Wachstum umgeht", icon: "risk" },
    { title: "Konfliktstil", text: "Wann ihr Spannungen ansprecht – und wie direkt ihr damit umgeht", icon: "collaboration" },
    { title: "Zusammenarbeit & Arbeitsweise", text: "Wie gut eure täglichen Arbeitsweisen wirklich zusammenpassen", icon: "collaboration" },
    { title: "Vision & Werte", text: "Wofür ihr steht – und wie ähnlich eure langfristige Ausrichtung ist", icon: "reflection" },
  ],
  features: [
    { title: "Strukturierter Vergleich", text: "Ihr beantwortet gezielte Fragen zu Zusammenarbeit, Entscheidungen und Verantwortung." },
    { title: "Matching-Report", text: "Ihr seht, wo ihr gleich tickt – und wo Unterschiede relevant werden." },
    { title: "Gemeinsames Workbook", text: "Ihr übersetzt Erkenntnisse in konkrete Vereinbarungen für euren Alltag." },
  ],
  home: {
    audienceEyebrow: "Für wen",
    audienceTitle: "Für Entscheidungen vor und während der Zusammenarbeit",
    audienceText: "Die Plattform unterscheidet bewusst zwischen Kennenlernphase, bestehender Zusammenarbeit und begleitendem Advisor-Kontext.",
    problemEyebrow: "Problem",
    problemTitle: "Die meisten Gründerprobleme beginnen lange vor der Krise.",
    problemParagraphs: [
      "Selten scheitert Zusammenarbeit erst dann, wenn Druck sichtbar wird. Oft sind Unterschiede schon viel früher angelegt: in ungeklärter Entscheidungslogik, diffuser Verantwortung und in Annahmen, die nie sauber ausgesprochen wurden.",
      "Genau dort setzt CoFoundery Align an. Die Plattform macht diese Unterschiede früh sichtbar und übersetzt sie in einen Matching-Report und ein gemeinsames Workbook, damit aus vagem Bauchgefühl echte Klärung wird.",
    ],
    problemCards: [
      { title: "Entscheidungslogik", text: "Wer entscheidet wann, worauf wird bestanden und wie viel Unklarheit ist noch tragbar, bevor ein Team kippt?" },
      { title: "Verantwortung", text: "Rollen wirken oft geklärt, bleiben im Alltag aber diffus, sobald Tempo, Druck oder Ownership wirklich wichtig werden." },
      { title: "Annahmen und Konflikte", text: "Vieles wird vorausgesetzt, kaum abgeglichen. Spätere Konflikte sind oft nur die lauter gewordene Form früher Unterschiede." },
    ],
    productEyebrow: "Produkt",
    productTitle: "Ein klarer Vergleich, der weiterarbeitet",
    productText: "CoFoundery Align bleibt nicht bei einem Test stehen. Der Vergleich wird in einen Matching-Report und in ein gemeinsames Workbook übersetzt, damit aus Erkenntnis konkrete Zusammenarbeit wird.",
    approachEyebrow: "Ansatz",
    approachTitle: "Was CoFoundery Align anders macht",
    approachParagraphs: [
      "Viele Tools messen Persönlichkeit. CoFoundery Align untersucht Entscheidungen.",
      "Der Fokus liegt auf den Fragen, die für Gründerteams wirklich entscheidend werden: Tempo, Verantwortung, Risiko, Konfliktstil, Commitment und Zusammenarbeit.",
      "Die Fragen basieren auf Forschung zu Gründerentscheidungen und typischen Spannungsfeldern in Startup-Teams. Sie werden getrennt beantwortet und anschließend strukturiert verglichen.",
      "Das Ergebnis ist kein Score, sondern eine gemeinsame Grundlage für Gespräche und Entscheidungen.",
    ],
    approachCards: [
      { title: "Matching-Report", text: "Macht Unterschiede, tragende Gemeinsamkeiten und relevante Spannungsfelder klar lesbar." },
      { title: "Gemeinsames Workbook", text: "Hilft dabei, aus Erkenntnissen klare Vereinbarungen und nächste Schritte für den Alltag zu machen." },
      { title: "Begleitender Advisor-Kontext", text: "Advisors, Accelerators oder Investoren können strukturiert begleiten, ohne die Founder-Perspektive zu überlagern." },
    ],
    dimensionsEyebrow: "Dimensionen",
    dimensionsTitle: "Ihr seht nicht nur ein Gefühl – sondern ein klares System eurer Zusammenarbeit.",
    dimensionsParagraphs: [
      "CoFoundery Align macht sichtbar, wie ihr in den entscheidenden Bereichen wirklich funktioniert – von Entscheidungen über Verantwortung bis hin zu Konflikt und Risiko.",
      "Statt einzelner Eindrücke entsteht ein vollständiges Bild eurer Zusammenarbeit.",
    ],
    dimensionsFooter: "CoFoundery Align bildet die zentralen Dimensionen eurer Zusammenarbeit strukturiert ab – und wird kontinuierlich weiterentwickelt.",
    evidenceEyebrow: "Warum das funktioniert",
    evidenceTitle: "Worauf der Ansatz basiert",
    evidenceCards: [
      { title: "Forschung zu Gründerentscheidungen", text: "Studien zu Entrepreneurial Teams zeigen, dass Konflikte häufig aus ungeklärten Entscheidungs- und Rollenlogiken entstehen.", icon: "research" },
      { title: "Startup-Praxis", text: "Viele Gründerkonflikte entstehen nicht plötzlich, sondern aus frühen Annahmen über Tempo, Verantwortung und Risiko.", icon: "practice" },
      { title: "Strukturierte Reflexion statt Persönlichkeitstests", text: "CoFoundery Align übersetzt diese Themen in einen strukturierten Vergleich und eine konkrete Gesprächsgrundlage.", icon: "reflection" },
    ],
    faqEyebrow: "FAQ",
    faqTitle: "Häufige Fragen",
    footerText: "Strukturierter Entscheidungs- und Gesprächsraum für Founder.",
    legalNotice: "Impressum",
    privacyPolicy: "Datenschutz",
    stanceLink: "Unsere Haltung",
  },
  faqs: [
    { q: "Ist CoFoundery Align ein Persönlichkeitstest?", a: "Nein. CoFoundery Align ist ein strukturierter Entscheidungs- und Arbeitsraum für Gründungsteams: mit Vergleich, Matching-Report und gemeinsamem Workbook." },
    { q: "Wann wird der Report freigeschaltet?", a: "Sobald beide Personen den Basisfragebogen abgeschlossen haben. Das Werte-Add-on erscheint nur dann im gemeinsamen Ergebnis, wenn es angefordert und von beiden abgeschlossen wurde." },
    { q: "Ist das nur für neue Founder-Teams gedacht?", a: "Nein. Der Flow unterscheidet bewusst zwischen Pre-Founder Matching und bestehenden Founder-Teams, damit Sprache, Matching-Report und Workbook zum Kontext passen." },
    { q: "Brauchen wir dafür einen Advisor?", a: "Nein. Founder können den gesamten Flow allein nutzen. Ein Advisor kann optional später strukturiert eingebunden werden." },
    { q: "Wie wird mit E-Mail und Daten umgegangen?", a: "Die E-Mail-Adresse wird zweckgebunden für Einladung und Zuordnung zur Session verwendet. Antworten dienen ausschließlich der Profil-, Report- und Workbook-Erstellung." },
  ],
  howItWorks: {
    panels: [
      { step: "1", title: "Startet mit eurem Profil", text: "Ihr beantwortet strukturierte Fragen zu Zusammenarbeit, Entscheidungen, Konflikten und Verantwortung.", label: "Selbstbild sichtbar machen" },
      { step: "2", title: "Seht, wo ihr zusammenpasst", text: "Der Matching-Report zeigt, wo ihr gleich tickt, wo ihr unterschiedlich entscheidet und wo daraus Spannungen entstehen können.", label: "Gemeinsamkeiten, Unterschiede, Spannungen" },
      { step: "3", title: "Macht daraus klare Regeln", text: "Im Workbook klärt ihr die Punkte, die später sonst Reibung erzeugen würden – und haltet konkrete Vereinbarungen fest.", label: "Von Analyse zu Vereinbarung" },
    ],
    profileEyebrow: "Profil",
    questionCountLabel: `${BASE_QUESTION_COUNT} Fragen`,
    exampleQuestions: [
      "Wie schnell sprichst du Reibung im Team an?",
      "Wann ist ein Risiko für dich sichtbar genug?",
      "Wie klar sollte Ownership verteilt sein?",
    ],
    reportEyebrow: "Matching-Report",
    reportTitle: "Zwei Perspektiven, ein klarer Vergleich",
    reportBadge: "Report",
    reportRows: [
      { label: "Gemeinsamkeiten", left: "76%", right: "76%", tone: "bg-emerald-300/85" },
      { label: "Unterschiede", left: "42%", right: "72%", tone: "bg-slate-300/90" },
      { label: "Spannungen", left: "58%", right: "68%", tone: "bg-amber-300/85" },
    ],
    perspectiveA: "Perspektive A",
    perspectiveB: "Perspektive B",
    perspectiveALines: ["Wir sprechen Kritik direkt an.", "Entscheidungen lieber früh klären."],
    perspectiveBLines: ["Erst einordnen, dann ansprechen.", "Mehr Abgleich bei strategischen Themen."],
    sharedRuleEyebrow: "Gemeinsame Regel",
    sharedRule: "Konflikte sprechen wir innerhalb von 24 Stunden an und klären sie in einem festen Gespräch.",
    workbookBadge: "Workbook",
    progressLabel: "Schritt {current} von {total}",
    eyebrow: "So funktioniert CoFoundery Align",
    title: "Drei Schritte zu einem stärkeren Founder-Team",
    text: "Von der ersten Selbsteinschätzung bis zu klaren gemeinsamen Regeln.",
  },
  stance: {
    navCta: "Session starten",
    badge: "Wissenschaftlich fundiert",
    quote: "„Wir glauben nicht an perfekte Matches,",
    quoteAccent: " sondern an informierte Entscheidungen.“",
    title: "Wissenschaftlich fundiert - nicht aus dem Bauch heraus",
    paragraphs: [
      "Co-Founder-Entscheidungen gehören zu den folgenreichsten Entscheidungen im Aufbau eines Startups. Trotzdem werden sie häufig auf Basis von Sympathie, Intuition oder Zeitdruck getroffen. Die Forschung zeigt jedoch klar: Teamdynamik, Konfliktmuster und implizite Erwartungen haben messbare Auswirkungen auf den Erfolg junger Unternehmen.",
      "Zahlreiche Studien aus der Wirtschafts- und Organisationspsychologie sowie der Entrepreneurship-Forschung belegen, dass Konflikte innerhalb von Gründerteams - insbesondere Beziehungskonflikte - eng mit Leistungsfähigkeit, Wachstum und Zufriedenheit zusammenhängen. Meta-Analysen zeigen konsistent, dass affektive Konflikte (z. B. Spannungen auf persönlicher Ebene) die Team-Performance deutlich beeinträchtigen, während Klarheit, Kohäsion und funktionale Entscheidungsprozesse positiv wirken.",
      "Auch speziell für Gründerteams gilt: Unterschiede in Entscheidungsstil, Risikohaltung, Verantwortungsverständnis oder Konfliktverhalten sind keine Randthemen, sondern zentrale Einflussfaktoren für den weiteren Unternehmensverlauf. Studien zu Entrepreneurial Teams zeigen, dass solche Unterschiede häufig erst im Zeitverlauf sichtbar werden - dann allerdings unter hohem Druck und mit potenziell gravierenden Folgen.",
      "Darüber hinaus weisen empirische Arbeiten darauf hin, dass persönliche Merkmale und Verhaltensmuster von Foundern nicht direkt, sondern über Teamkonflikte und Entscheidungsprozesse auf den Unternehmenserfolg wirken. Genau hier setzt eine wirtschaftspsychologisch fundierte Betrachtung an: Nicht Menschen werden bewertet, sondern Spannungsfelder sichtbar gemacht, die für gemeinsame Entscheidungen relevant sind.",
    ],
    approachTitle: "Unser Ansatz",
    approachIntro: "CoFoundery Align basiert auf diesen Erkenntnissen. Wir nutzen etablierte Konzepte aus der Team-, Konflikt- und Entrepreneurship-Forschung, um:",
    bullets: [
      "implizite Erwartungen explizit zu machen",
      "konfliktanfällige Konstellationen frühzeitig sichtbar zu machen",
      "Entscheidungs- und Zusammenarbeitsmuster strukturiert zu reflektieren",
      "fundierte Gesprächsleitfäden bereitzustellen, bevor es kritisch wird",
    ],
    approachOutro: "Dabei stellen wir keine Diagnosen und vergeben keine Persönlichkeitslabels. Unser Ziel ist es, eine gemeinsame Sprache für relevante Themen zu schaffen - damit Co-Founder informierte Entscheidungen treffen können, statt Risiken erst im Ernstfall zu entdecken.",
    sourcesTitle: "Wissenschaftliche Grundlagen (Auswahl)",
    sources: [
      "De Dreu, C. K. W. & Weingart, L. R. (2003). Task versus relationship conflict, team performance, and team member satisfaction: A meta-analysis. Journal of Applied Psychology.",
      "Ensley, M. D., Pearson, A. W. & Amason, A. C. (2002). Understanding the dynamics of new venture top management teams. Journal of Business Venturing.",
      "Yoo, Y., Lee, S. & Lee, S. (2021). Entrepreneurial team conflict and cohesion. Entrepreneurship Research Journal (Meta-Analyse).",
      "de Jong, B. A., Song, M. & Song, L. Z. (2013). How lead founder personality affects new venture performance. Journal of Management.",
      "Hellmann, T. & Wasserman, N. (2011). The First Deal: The Division of Founder Equity in New Ventures. NBER Working Paper.",
    ],
    primaryCta: "Alignment prüfen",
    secondaryCta: "Zur Startseite",
  },
};

const MARKETING_CONTENT_EN: MarketingContent = {
  nav: [
    { label: "Point of view", href: "/informierte-entscheidungen" },
    { label: "For whom", href: "/#fuer-wen" },
    { label: "Product", href: "/#produkt" },
    { label: "Flow", href: "/#ablauf" },
    { label: "FAQ", href: "/#faq" },
  ],
  topNav: {
    product: "Product",
    howItWorks: "How it works",
    faq: "FAQ",
    login: "Login",
    start: "Get started",
    mobileStart: "Start",
    openNavigation: "Open navigation",
  },
  hero: {
    supportPoints: [`${BASE_QUESTION_COUNT} structured questions`, "Clear matching report", "Shared workbook"],
    founderSignals: [
      {
        title: "Founder A",
        profileLabel: "Profile",
        items: [
          { label: "Pace", width: "76%", tone: "bg-slate-900/80" },
          { label: "Risk", width: "48%", tone: "bg-slate-300" },
          { label: "Ownership", width: "84%", tone: "bg-emerald-300/85" },
          { label: "Conflict", width: "58%", tone: "bg-amber-300/90" },
        ],
      },
      {
        title: "Founder B",
        profileLabel: "Profile",
        items: [
          { label: "Pace", width: "54%", tone: "bg-slate-900/72" },
          { label: "Risk", width: "72%", tone: "bg-slate-300" },
          { label: "Ownership", width: "62%", tone: "bg-emerald-300/85" },
          { label: "Conflict", width: "78%", tone: "bg-amber-300/90" },
        ],
      },
    ],
    comparisonRows: [
      { label: "Common ground", hint: "Shared base", leftWidth: "82%", rightWidth: "82%", tone: "bg-emerald-300/90" },
      { label: "Differences", hint: "Different approach", leftWidth: "54%", rightWidth: "80%", tone: "bg-slate-900/78" },
      { label: "Tensions", hint: "Align early", leftWidth: "38%", rightWidth: "66%", tone: "bg-amber-300/95" },
    ],
    summaryPoints: ["Differences visible early", "Clarification before friction", "Foundation for shared rules"],
    visual: {
      profileLabel: "Profile",
      reportEyebrow: "Matching readout",
      reportTitle: "Founder compatibility becomes discussable",
      reportBadge: "Report",
    },
    headline: "Most founders notice too late that their working assumptions do not line up.",
    subline:
      "Cofoundery Align helps you understand how you actually work together: where you move similarly, where differences may create friction, and how to turn that into a more stable collaboration.",
    primaryCta: "Check founder compatibility",
    secondaryCta: "How it works",
  },
  audiences: [
    {
      title: "Pre-founder matching",
      text: "For founders who want to seriously explore whether they should build together before sympathy quietly turns into commitment.",
      visual: "pre-founder",
    },
    {
      title: "Existing founder teams",
      text: "For teams already working together who want to clarify roles, decision rules or tensions in a more structured way.",
      visual: "existing-team",
    },
    {
      title: "Advisor-supported context",
      text: "For advisors, accelerators or investors who want to support the conversation without overriding the founder team.",
      visual: "advisor",
    },
  ],
  dimensions: [
    { title: "Decision logic", text: "How you make important decisions and what you rely on", icon: "decision" },
    { title: "Commitment & responsibility", text: "How binding your work is and where ownership really sits", icon: "commitment" },
    { title: "Risk orientation & pace", text: "How differently you handle uncertainty and growth", icon: "risk" },
    { title: "Conflict style", text: "When you address tension and how directly you work with it", icon: "collaboration" },
    { title: "Collaboration & working style", text: "How well your daily ways of working actually fit together", icon: "collaboration" },
    { title: "Vision & values", text: "What you stand for and how similar your long-term direction is", icon: "reflection" },
  ],
  features: [
    { title: "Structured comparison", text: "You answer focused questions about collaboration, decisions and responsibility." },
    { title: "Matching report", text: "You see where you think similarly and where differences become relevant." },
    { title: "Shared workbook", text: "You turn insights into concrete agreements for everyday collaboration." },
  ],
  home: {
    audienceEyebrow: "For whom",
    audienceTitle: "For decisions before and during collaboration",
    audienceText: "The platform deliberately distinguishes between early exploration, existing collaboration and advisor-supported contexts.",
    problemEyebrow: "Problem",
    problemTitle: "Most founder problems start long before the crisis.",
    problemParagraphs: [
      "Collaboration rarely breaks only when pressure becomes visible. Differences are often present much earlier: in unclear decision logic, diffuse responsibility and assumptions that were never made explicit.",
      "That is where Cofoundery Align starts. The platform makes these differences visible early and turns them into a matching report and shared workbook, so vague intuition can become real clarification.",
    ],
    problemCards: [
      { title: "Decision logic", text: "Who decides when, what needs to be protected and how much uncertainty can the team still carry before it tilts?" },
      { title: "Responsibility", text: "Roles often look clear, but become diffuse day to day once pace, pressure or ownership really matter." },
      { title: "Assumptions and tension", text: "Much is assumed and little is compared. Later conflicts are often the louder form of earlier differences." },
    ],
    productEyebrow: "Product",
    productTitle: "A clear comparison that keeps working",
    productText: "Cofoundery Align does not stop at a test. The comparison becomes a matching report and a shared workbook, so insight can turn into concrete collaboration.",
    approachEyebrow: "Approach",
    approachTitle: "What makes Cofoundery Align different",
    approachParagraphs: [
      "Many tools measure personality. Cofoundery Align looks at decisions.",
      "The focus is on questions that actually become important for founder teams: pace, responsibility, risk, conflict style, commitment and collaboration.",
      "The questions are based on research into founder decisions and typical tension fields in startup teams. They are answered separately and then compared in a structured way.",
      "The result is not a score, but shared ground for conversations and decisions.",
    ],
    approachCards: [
      { title: "Matching report", text: "Makes differences, shared foundations and relevant areas to align on easier to read." },
      { title: "Shared workbook", text: "Helps turn insights into clear agreements and next steps for everyday work." },
      { title: "Advisor-supported context", text: "Advisors, accelerators or investors can support the process without overshadowing the founder perspective." },
    ],
    dimensionsEyebrow: "Dimensions",
    dimensionsTitle: "You do not just see a feeling. You see a clearer system for collaboration.",
    dimensionsParagraphs: [
      "Cofoundery Align makes visible how you actually operate in the areas that matter: from decisions and responsibility to conflict and risk.",
      "Instead of isolated impressions, you get a more complete view of your collaboration.",
    ],
    dimensionsFooter: "Cofoundery Align maps the central dimensions of your collaboration in a structured way and continues to evolve.",
    evidenceEyebrow: "Why this works",
    evidenceTitle: "What the approach is based on",
    evidenceCards: [
      { title: "Research on founder decisions", text: "Studies on entrepreneurial teams show that conflict often starts in unclear decision and role logic.", icon: "research" },
      { title: "Startup practice", text: "Many founder conflicts do not appear suddenly, but grow out of early assumptions about pace, responsibility and risk.", icon: "practice" },
      { title: "Structured reflection, not personality testing", text: "Cofoundery Align turns these topics into a structured comparison and a concrete basis for conversation.", icon: "reflection" },
    ],
    faqEyebrow: "FAQ",
    faqTitle: "Common questions",
    footerText: "Structured decision and conversation space for founders.",
    legalNotice: "Legal Notice",
    privacyPolicy: "Privacy Policy",
    stanceLink: "Our point of view",
  },
  faqs: [
    { q: "Is Cofoundery Align a personality test?", a: "No. Cofoundery Align is a structured decision and working space for founder teams: with comparison, matching report and shared workbook." },
    { q: "When is the report unlocked?", a: "As soon as both people complete the foundation questionnaire. The values add-on only appears in the shared result when it was requested and completed by both sides." },
    { q: "Is this only for new founder teams?", a: "No. The flow deliberately distinguishes between pre-founder matching and existing founder teams, so the language, report and workbook fit the context." },
    { q: "Do we need an advisor?", a: "No. Founders can use the full flow on their own. An advisor can optionally be added later in a structured way." },
    { q: "How are email and data handled?", a: "The email address is used for invitation and session assignment. Answers are used only to create profiles, reports and workbooks." },
  ],
  howItWorks: {
    panels: [
      { step: "1", title: "Start with your profile", text: "You answer structured questions about collaboration, decisions, conflict and responsibility.", label: "Make your working assumptions visible" },
      { step: "2", title: "See where you align", text: "The matching report shows where you think similarly, where you decide differently and where tensions may emerge.", label: "Common ground, differences, tensions" },
      { step: "3", title: "Turn it into clear rules", text: "In the workbook, you clarify the points that would otherwise create friction later and capture concrete agreements.", label: "From analysis to agreement" },
    ],
    profileEyebrow: "Profile",
    questionCountLabel: `${BASE_QUESTION_COUNT} questions`,
    exampleQuestions: [
      "How quickly do you address friction in the team?",
      "When is a risk visible enough for you?",
      "How clearly should ownership be distributed?",
    ],
    reportEyebrow: "Matching report",
    reportTitle: "Two perspectives, one clear comparison",
    reportBadge: "Report",
    reportRows: [
      { label: "Common ground", left: "76%", right: "76%", tone: "bg-emerald-300/85" },
      { label: "Differences", left: "42%", right: "72%", tone: "bg-slate-300/90" },
      { label: "Tensions", left: "58%", right: "68%", tone: "bg-amber-300/85" },
    ],
    perspectiveA: "Perspective A",
    perspectiveB: "Perspective B",
    perspectiveALines: ["We address critique directly.", "Clarify decisions early."],
    perspectiveBLines: ["First understand, then address.", "More alignment on strategic topics."],
    sharedRuleEyebrow: "Shared rule",
    sharedRule: "We address conflicts within 24 hours and clarify them in a dedicated conversation.",
    workbookBadge: "Workbook",
    progressLabel: "Step {current} of {total}",
    eyebrow: "How Cofoundery Align works",
    title: "Three steps toward a stronger founder team",
    text: "From the first self-assessment to clear shared rules.",
  },
  stance: {
    navCta: "Start session",
    badge: "Research-informed",
    quote: "“We do not believe in fixed formulas,",
    quoteAccent: " but in informed decisions.”",
    title: "Research-informed, not gut feeling alone",
    paragraphs: [
      "Co-founder decisions are among the most consequential decisions in building a startup. Still, they are often made based on sympathy, intuition or time pressure. Research is clear: team dynamics, conflict patterns and implicit expectations can materially affect young companies.",
      "Studies from organizational psychology, business research and entrepreneurship show that conflict within founder teams, especially relationship conflict, is closely connected to performance, growth and satisfaction. Meta-analyses consistently show that affective conflict can impair team performance, while clarity, cohesion and functional decision processes help.",
      "For founder teams specifically, differences in decision style, risk orientation, responsibility or conflict behavior are not side topics. They are central factors for the company’s development. Studies on entrepreneurial teams show that such differences often become visible over time, but then under pressure and with potentially serious consequences.",
      "Empirical work also indicates that personal traits and behavioral patterns of founders do not affect company outcomes directly, but through team conflict and decision processes. This is where a research-informed view helps: people are not rated; relevant tension fields for shared decisions become discussable.",
    ],
    approachTitle: "Our approach",
    approachIntro: "Cofoundery Align builds on these insights. We use established concepts from team, conflict and entrepreneurship research to:",
    bullets: [
      "make implicit expectations explicit",
      "surface tension-prone constellations early",
      "reflect on decision and collaboration patterns in a structured way",
      "provide grounded conversation prompts before things become critical",
    ],
    approachOutro: "We do not diagnose people or assign personality labels. Our goal is to create a shared language for relevant topics so co-founders can make informed decisions before risks only show up under pressure.",
    sourcesTitle: "Selected research foundations",
    sources: [
      "De Dreu, C. K. W. & Weingart, L. R. (2003). Task versus relationship conflict, team performance, and team member satisfaction: A meta-analysis. Journal of Applied Psychology.",
      "Ensley, M. D., Pearson, A. W. & Amason, A. C. (2002). Understanding the dynamics of new venture top management teams. Journal of Business Venturing.",
      "Yoo, Y., Lee, S. & Lee, S. (2021). Entrepreneurial team conflict and cohesion. Entrepreneurship Research Journal (Meta-analysis).",
      "de Jong, B. A., Song, M. & Song, L. Z. (2013). How lead founder personality affects new venture performance. Journal of Management.",
      "Hellmann, T. & Wasserman, N. (2011). The First Deal: The Division of Founder Equity in New Ventures. NBER Working Paper.",
    ],
    primaryCta: "Check alignment",
    secondaryCta: "Back to home",
  },
};

const MARKETING_CONTENT_BY_LOCALE: Record<AppLocale, MarketingContent> = {
  de: MARKETING_CONTENT_DE,
  en: MARKETING_CONTENT_EN,
};

export function getMarketingContent(locale?: string | null) {
  return MARKETING_CONTENT_BY_LOCALE[normalizeLocale(locale)] ?? MARKETING_CONTENT_DE;
}
