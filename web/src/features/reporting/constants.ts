export const DIMENSION_INSIGHTS = {
  vision: {
    high: {
      title: "Unicorn-Architekt",
      text: "Du denkst in Blitzscaling. Maximale Marktanteile und hohe Bewertungen sind dein Fokus.",
    },
    low: {
      title: "Substanz-Hüter",
      text: "Du legst Wert auf ein gesundes, wertegetriebenes Fundament und organisches Wachstum.",
    },
    neutral: "Du agierst als Real-Strategist und balancierst Ambition mit Machbarkeit.",
  },
  entscheidung: {
    high: {
      title: "Intuitions-Treiber",
      text: "Geschwindigkeit ist dein Wettbewerbsvorteil, Entscheidungen triffst du zügig und intuitiv.",
    },
    low: {
      title: "Daten-Analyst",
      text: "Du triffst Entscheidungen auf Basis von Fakten und Analyse, um Risiken strukturiert zu minimieren.",
    },
    neutral: "Du agierst als Pragmatiker und balancierst Tempo mit analytischer Sorgfalt.",
  },
  risiko: {
    high: {
      title: "High-Stakes-Pionier",
      text: "Unsicherheit ist für dich ein Raum für große Chancen und mutige strategische Schritte.",
    },
    low: {
      title: "Sicherheits-Anker",
      text: "Du sicherst den Runway, priorisierst Stabilität und hältst das Team in stürmischen Phasen auf Kurs.",
    },
    neutral: "Du agierst als Risiko-Manager und kombinierst kalkulierte Wagnisse mit Sicherheitsnetz.",
  },
  autonomie: {
    high: {
      title: "Autarkie-Spezialist",
      text: "Du arbeitest am besten in hoher Eigenverantwortung und mit klar abgegrenzten Verantwortungsbereichen.",
    },
    low: {
      title: "Team-Synchronisator",
      text: "Du schätzt engen Austausch, Nähe und gemeinsame Präsenz als Basis für Teamenergie.",
    },
    neutral: "Du agierst als Kollaborations-Profi und balancierst Team-Time mit fokussierter Umsetzung.",
  },
  verbindlichkeit: {
    high: {
      title: "Radical Performer",
      text: "Verbindlichkeit bedeutet für dich klare Ergebnisse mit maximalem Einsatz.",
    },
    low: {
      title: "Agilitäts-Fan",
      text: "Du hältst Prioritäten flexibel und passt Strukturen schnell an neue Marktlagen an.",
    },
    neutral: "Du agierst als Verlässlicher Partner und verbindest Leistungsanspruch mit nachhaltiger Umsetzung.",
  },
  konflikt: {
    high: {
      title: "Radical Honest",
      text: "Du sprichst Spannungen direkt an und nutzt Klartext als Weg zu schnellen Lösungen.",
    },
    low: {
      title: "Harmonic Diplomat",
      text: "Du schützt psychologische Sicherheit und moderierst Konflikte empathisch und bedacht.",
    },
    neutral: "Du agierst als Konstruktiver Kritiker und trennst sauber zwischen Person und Sache.",
  },
} as const;

export const REPORT_CONTENT = {
  executive_summary: {
    high_alignment:
      "Eure Profile liegen nah beieinander. Das macht Abstimmung schneller und senkt Reibung im Tagesgeschäft.",
    low_alignment:
      "Eure Profile sind klar komplementär. Das ist eine Stärke, braucht aber klare Spielregeln für Entscheidungen und Kommunikation.",
    intro:
      "Dieser Report zeigt, wie ihr entscheidet, arbeitet und unter Druck reagiert. Nicht als Bewertung, sondern als gemeinsame Grundlage für bessere Entscheidungen.",
  },
  dimensions: {
    vision: {
      title: "Vision & Skalierung",
      description:
        "Diese Dimension zeigt, wie ihr Wachstum priorisiert: belastbare Substanz oder aggressivere Skalierung. Eure Position prägt Kapitaleinsatz, Prioritäten und das operative Tempo.",
      q: "Wie definieren wir Erfolg in 5 Jahren? Größe des Teams oder Profitabilität?",
    },
    entscheidung: {
      title: "Entscheidungsdynamik",
      description:
        "Diese Dimension beschreibt, wie ihr unter Unsicherheit entscheidet: analytisch, pragmatisch oder intuitiv-tempoorientiert. Sie bestimmt, wie schnell ihr handlungsfähig seid und wie stabil eure Priorisierungen unter Druck bleiben.",
      q: "Woran erkennt ihr gemeinsam, dass wir genug Informationen für einen Go/No-Go haben?",
    },
    risiko: {
      title: "Risikoprofil",
      description:
        "Diese Dimension zeigt, welches Risikoniveau ihr als verantwortbar erlebt und wie ihr auf Unsicherheit reagiert. Sie beeinflusst Runway-Entscheidungen, Investitionslogik und eure Stabilität in Krisenphasen.",
      q: "Ab welchem Kontostand schlafen wir nachts unruhig?",
    },
    autonomie: {
      title: "Zusammenarbeit & Autonomie",
      description:
        "Diese Dimension beschreibt euer Kollaborationsmuster zwischen enger Abstimmung und hoher Eigenverantwortung. Sie bestimmt, wie Ownership gelebt wird und ob Zusammenarbeit im Alltag entlastet oder zusätzlichen Druck erzeugt.",
      q: "Wie viel operative Freiheit braucht jeder von uns im Alltag?",
    },
    verbindlichkeit: {
      title: "Verbindlichkeit & Fokus",
      description:
        "Diese Dimension zeigt, wie verbindlich Zusagen, Deadlines und Qualitätsstandards verstanden werden. Sie ist ein zentraler Vertrauensfaktor und prägt, wie zuverlässig ihr liefert und Risiken frühzeitig kommuniziert.",
      q: "Was passiert, wenn private Prioritäten mit der Firma kollidieren?",
    },
    konflikt: {
      title: "Konfliktkultur",
      description:
        "Diese Dimension beschreibt, wie ihr Spannungen ansprecht und nach Konflikten wieder arbeitsfähig werdet. Sie beeinflusst direkt Geschwindigkeit, psychologische Sicherheit und die Qualität eurer Zusammenarbeit unter Druck.",
      q: "Darf ich dich vor dem Team kritisieren oder machen wir das nur unter vier Augen?",
    },
  },
} as const;

export const DIMENSION_EXTREMES = {
  Vision: { low: "Substanz", high: "Skalierung" },
  Entscheidung: { low: "Analyse", high: "Tempo" },
  Risiko: { low: "Sicherheit", high: "Wagnis" },
  Autonomie: { low: "Synchronität", high: "Autarkie" },
  Verbindlichkeit: { low: "Nachhaltigkeit", high: "Maximaler Einsatz" },
  Konflikt: { low: "Diplomatie", high: "Direktheit" },
} as const;

export const REVERSE_QUESTIONS = [] as const;

export const DIMENSION_INTERPRETATIONS = {
  Vision: {
    low: {
      title: "Substanz-Hüter",
      text: "Du legst Wert auf ein gesundes, wertegetriebenes Fundament. Ein profitables Business, das organisch wächst, ist dir wichtiger als schnelles Wachstum um jeden Preis. Du sicherst die Unabhängigkeit der Firma.",
    },
    mid: {
      title: "Real-Strategist",
      text: "Du balancierst Ambition mit Machbarkeit. Du willst ein relevantes Unternehmen bauen, behältst aber die Kontrolle über die Richtung und die wirtschaftliche Vernunft.",
    },
    high: {
      title: "Unicorn-Architekt",
      text: "Du denkst in Blitzscaling. Maximale Marktanteile und hohe Bewertungen sind dein Fokus. Du bist bereit, für Geschwindigkeit und Größe die Kontrolle teilweise abzugeben.",
    },
  },
  Entscheidung: {
    low: {
      title: "Daten-Analyst",
      text: "Du triffst Entscheidungen auf Basis von Fakten und Logik. Gründlichkeit gibt dir Sicherheit, auch wenn es das Tempo drosselt. Du verhinderst teure Fehlentscheidungen durch analytische Tiefe.",
    },
    mid: {
      title: "Pragmatiker",
      text: "Du nutzt Informationen für die Richtung, vertraust aber deinem Instinkt für das Timing. Du entscheidest zügig, bleibst aber offen für Kurskorrekturen.",
    },
    high: {
      title: "Intuitions-Treiber",
      text: "Geschwindigkeit ist dein Wettbewerbsvorteil. Du entscheidest oft intuitiv und nach dem Prinzip Fehler korrigieren wir im Flug, um das Momentum nicht zu verlieren.",
    },
  },
  Risiko: {
    low: {
      title: "Sicherheits-Anker",
      text: "Du bist der Wächter über den Runway. In Phasen der Unsicherheit fährst du auf Sicht und sicherst das Bestehende ab. Du sorgst für Stabilität in stürmischen Zeiten.",
    },
    mid: {
      title: "Risiko-Manager",
      text: "Du bist bereit für kalkulierte Wagnisse, solange ein Plan B existiert. Du mutest dem Team strategische Sprünge zu, aber niemals ohne Sicherheitsnetz.",
    },
    high: {
      title: "High-Stakes-Pionier",
      text: "Du blühst in der totalen Unsicherheit auf. Hohe Einsätze motivieren dich, da du dort die größten Chancen für echte Disruption siehst.",
    },
  },
  Autonomie: {
    low: {
      title: "Team-Synchronisator",
      text: "Du schätzt maximale Nähe, gemeinsame Präsenz und kurze Wege. Synergie entsteht für dich durch ständigen Austausch und emotionale Verbundenheit im Alltag.",
    },
    mid: {
      title: "Kollaborations-Profi",
      text: "Du brauchst den Austausch für die Strategie, aber die Freiheit für die Umsetzung. Du balancierst Team-Time und Deep-Work effektiv.",
    },
    high: {
      title: "Autarkie-Spezialist",
      text: "Du arbeitest am besten in hoher Eigenverantwortung. Du schätzt asynchrone Kommunikation und brauchst viel operative Freiheit für deine Bereiche.",
    },
  },
  Verbindlichkeit: {
    low: {
      title: "Agilitäts-Fan",
      text: "Du bleibst flexibel und passt Prioritäten schnell an. Starre Strukturen empfindest du als einengend. Du sorgst für Agilität, wenn der Markt sich dreht.",
    },
    mid: {
      title: "Verlässlicher Partner",
      text: "Ein Wort ist ein Wort. Du versuchst Deadlines einzuhalten und kommunizierst proaktiv, wenn Prioritäten sich verschieben müssen.",
    },
    high: {
      title: "Radical Performer",
      text: "Du lebst für Ergebnisse. Einsatz bedeutet für dich absolute Priorität für das Startup, private Belange werden im Zweifel hintenangestellt.",
    },
  },
  Konflikt: {
    low: {
      title: "Harmonic Diplomat",
      text: "Du achtest auf psychologische Sicherheit und Zwischentöne. Kritik verpackst du wertschätzend, um das Miteinander nicht zu gefährden.",
    },
    mid: {
      title: "Konstruktiver Kritiker",
      text: "Du sprichst Probleme sachlich an und suchst sofort die Lösungsebene. Du trennst strikt zwischen emotionalem Konflikt und fachlicher Differenz.",
    },
    high: {
      title: "Radical Honest",
      text: "Du bist direkt und ungefiltert. Reibung ist für dich ein Reinigungsprozess. Du erwartest, dass Partner harte Wahrheiten ohne Umschweife aushalten können.",
    },
  },
} as const;

export const ACTIONABLE_PLAYBOOK = {
  Vision: {
    low: {
      superpower:
        "Du bist der Anker für langfristige Stabilität. Du baust Werte, die bleiben, und schützt das Unternehmen vor kopflosen Hypes. Deine Stärke ist die Unabhängigkeit.",
      warning:
        "In einem extrem schnellen Marktumfeld könntest du Chancen durch zu langes Zögern oder zu hohen Perfektionsanspruch verpassen.",
    },
    mid: {
      superpower:
        "Dein Radar für Machbarkeit ist exzellent. Du balancierst Ambition mit wirtschaftlicher Vernunft und sorgst für ein gesundes, skalierbares Wachstum ohne Burnout-Gefahr.",
      warning:
        'Du läufst Gefahr, im "Mittelfeld" steckenzubleiben, wenn du dich nicht traust, in entscheidenden Momenten radikal auf eine Karte zu setzen.',
    },
    high: {
      superpower:
        "Du denkst in Dimensionen, die andere sprengen. Dein Fokus auf maximale Skalierung und Marktdominanz zieht Investoren an und erzeugt massives Momentum.",
      warning:
        'Du neigst dazu, das Fundament (Profitabilität/Kultur) zu vernachlässigen. Ohne ein starkes Korrektiv im Team riskierst du den "Flug zu nah an der Sonne".',
    },
  },
  Entscheidung: {
    low: {
      superpower:
        "Deine Entscheidungen sind fundiert und wetterfest. Du minimierst die Fehlerquote durch analytische Tiefe und sorgst für eine logische Nachvollziehbarkeit im Team.",
      warning:
        "Du könntest zum Flaschenhals werden, wenn Tempo der entscheidende Wettbewerbsvorteil ist. Lerne, mit 70% der Informationen zu entscheiden.",
    },
    mid: {
      superpower:
        "Du hast ein exzellentes Timing. Du nutzt Daten für die Richtung, vertraust aber deinem Instinkt für den Moment. Du entscheidest zügig, bleibst aber agil für Kurskorrekturen.",
      warning:
        "Bei hochkomplexen, strategischen Weichenstellungen übersiehst du manchmal Details, die erst später teuer werden könnten.",
    },
    high: {
      superpower:
        "Dein Tempo ist deine Waffe. Du erkennst Trends, bevor sie in Tabellen stehen, und hältst das Startup in ständiger Bewegung. Du handelst, während andere noch debattieren.",
      warning:
        'Du neigst zu "Aktionismus". Ohne Daten-Check triffst du manchmal Bauchentscheidungen, die das Team verwirren oder unnötige Extrarunden drehen lassen.',
    },
  },
  Risiko: {
    low: {
      superpower:
        "Du bist der Wächter über den Runway. In Phasen der Unsicherheit sorgst du für psychologische Sicherheit und verhinderst existenzbedrohende Wagnisse.",
      warning:
        "Deine Risikoaversion kann notwendige Innovationen im Keim ersticken. Wachstum erfordert oft das Verlassen der Komfortzone.",
    },
    mid: {
      superpower:
        "Du gehst kalkulierte Risiken mit klarem Plan B und hältst das Team auch in unsicheren Phasen entscheidungsfähig.",
      warning:
        "In starken Marktphasen kann zu viel Absicherung wertvolles Tempo kosten.",
    },
    high: {
      superpower:
        'Du liebst die "Todeszone" des Startups. Totale Unsicherheit motiviert dich zu Höchstleistungen. Du bist bereit, alles zu setzen, um den großen Durchbruch zu erzwingen.',
      warning:
        'Deine Risikobereitschaft kann für Partner und Mitarbeiter beängstigend wirken. Ohne "finanzielles Gewissen" im Team ist das Risiko eines Totalverlusts permanent präsent.',
    },
  },
  Autonomie: {
    low: {
      superpower:
        "Du bist der Kleber des Teams. Du schaffst Synergien durch Nähe, ständigen Austausch und emotionale Verbundenheit. Mit dir fühlt sich niemand allein gelassen.",
      warning:
        'Dein Bedürfnis nach Abstimmung kann produktive "Deep Work"-Phasen deines Partners unterbrechen. Achte darauf, Freiräume für autarkes Arbeiten zu lassen.',
    },
    mid: {
      superpower:
        "Du balancierst Nähe und Distanz meisterhaft. Du suchst den Austausch für die Strategie, brauchst aber die operative Freiheit für die Umsetzung. Ein flexibler Profi.",
      warning:
        "In extremen Stressphasen könntest du zwischen den Stühlen landen – zu wenig Einbindung für die einen, zu viel Kontrolle für die anderen.",
    },
    high: {
      superpower:
        'Du bist eine hocheffiziente "One-Person-Machine". Du liebst asynchrone Prozesse und arbeitest am besten, wenn man dir volles Vertrauen und maximale Freiheit schenkt.',
      warning:
        "Du läufst Gefahr, dich zu isolieren. Ohne regelmäßige Check-ins verliert das Team die gemeinsame Ausrichtung, und dein Partner könnte sich ausgeschlossen fühlen.",
    },
  },
  Verbindlichkeit: {
    low: {
      superpower:
        "Du verhinderst Starrheit. Deine Stärke ist die Anpassungsfähigkeit – du verstehst, dass ein Startup ein Marathon ist und schützt die langfristige Energie des Teams.",
      warning:
        "Dein Fokus auf Flexibilität kann als mangelnde Zuverlässigkeit missverstanden werden. Klare Deadlines sind für dein Umfeld oft wichtiger als für dich selbst.",
    },
    mid: {
      superpower:
        "Ein Wort ist ein Wort. Du bist das Rückgrat der Verlässlichkeit. Du hältst Zusagen ein und kommunizierst proaktiv, wenn sich Prioritäten verschieben müssen.",
      warning:
        "Du neigst dazu, dich aufzureiben, wenn dein Gegenüber lockerer mit Terminen umgeht. Das führt zu stiller Frustration, wenn Erwartungen nicht explizit geklärt sind.",
    },
    high: {
      superpower:
        "Dein Einsatzwille ist grenzenlos. Du lebst für Ergebnisse und bist bereit, private Belange bedingungslos dem Unternehmenserfolg unterzuordnen. Du ziehst das Team mit.",
      warning:
        'Dein "Startup-First"-Tunnelblick kann zu schnellem Burnout führen und Mitarbeiter abschrecken, die eine gesündere Work-Life-Integration benötigen.',
    },
  },
  Konflikt: {
    low: {
      superpower:
        "Du bist der Hüter der psychologischen Sicherheit. Du erkennst Zwischentöne und moderierst Spannungen, bevor sie eskalieren. Du schaffst ein wertschätzendes Klima.",
      warning:
        "Aus Angst vor Disharmonie sprichst du harte Wahrheiten oft zu spät oder zu verblümt an. Das kann dazu führen, dass Probleme unter dem Teppich gären.",
    },
    mid: {
      superpower:
        "Du beherrschst die Kunst der sachlichen Differenz. Du sprichst Probleme direkt an, bleibst aber auf der Lösungsebene und trennst strikt zwischen Mensch und Sache.",
      warning:
        "In hochemotionalen Situationen könnte deine Sachlichkeit als unterkühlt oder empathielos wahrgenommen werden. Nicht jeder Konflikt lässt sich rein logisch lösen.",
    },
    high: {
      superpower:
        "Bei dir weiß jeder, woran er ist. Du reinigst die Luft durch ungefilterte Direktheit und verhinderst, dass wertvolle Zeit mit politischen Spielchen verschwendet wird.",
      warning:
        'Deine "Breitseite" kann Partner verletzen oder einschüchtern. Ohne eine starke Vertrauensbasis wirkt deine Direktheit destruktiv statt klärend.',
    },
  },
} as const;

export const VALUES_PLAYBOOK = {
  impact_idealist: {
    title: "Impact-Idealist",
    identity:
      "Deine Integrität ist dein Kompass. Du gründest, um ein echtes Problem zu lösen, und bist bereit, Profit für ethische Standards zu opfern.",
    warning:
      "In harten Überlebensphasen könnte deine Kompromisslosigkeit zu Konflikten mit rein profitorientierten Partnern führen.",
  },
  verantwortungs_stratege: {
    title: "Verantwortungs-Stratege",
    subtitle: "Dein Match, {name}!",
    identity:
      "Du glaubst an „Profit with Purpose“. Du suchst die Schnittmenge aus wirtschaftlichem Erfolg und gesellschaftlicher Verantwortung.",
    warning:
      "Du läufst Gefahr, dich aufzureiben, wenn du versuchst, es moralisch jedem recht zu machen, während das Business harte Kante erfordert.",
  },
  business_pragmatiker: {
    title: "Business-Pragmatiker",
    identity:
      "Dein Fokus liegt auf wirtschaftlicher Schlagkraft. Ethik ist Teil der Professionalität, aber Wachstum und Überleben der Firma haben Priorität.",
    warning:
      "Ohne wertebasiertes Korrektiv riskierst du, die Reputation oder Team-Bindung für kurzfristige Gewinne zu opfern.",
  },
} as const;

export const VALUES_REPORT_CONTENT = {
  tiers: {
    symbiose: {
      label: "Werte-Symbiose",
      intro:
        "Eure Wertearchitektur ist in den Kernprinzipien hoch kohärent. Das schafft eine belastbare Grundlage für Vertrauen, Entscheidbarkeit und externe Glaubwürdigkeit.",
      shared: [
        "Ihr bewertet Fairness und Verantwortung nach ähnlichen Maßstäben.",
        "In kritischen Situationen ist die Wahrscheinlichkeit verdeckter Wertekonflikte gering.",
        "Eure gemeinsame Wertebasis kann als Führungsanker für Team- und Stakeholder-Kommunikation dienen.",
      ],
      tensions: [
        "Gerade bei hoher Übereinstimmung sollte regelmäßig geprüft werden, ob blinde Flecken entstehen.",
      ],
      question:
        "Welche zwei Werte sind für euch unter hohem wirtschaftlichem Druck nicht verhandelbar?",
    },
    schnittmenge: {
      label: "Werte-Schnittmenge",
      intro:
        "Ihr teilt zentrale Werteprinzipien, setzt aber unterschiedliche Schwerpunkte in der praktischen Umsetzung. Das ist gut handhabbar, wenn Entscheidungsregeln explizit sind.",
      shared: [
        "Es besteht eine tragfähige gemeinsame Basis für verantwortliche Zusammenarbeit.",
        "Ihr habt genug normative Überschneidung, um Konflikte konstruktiv zu verarbeiten.",
      ],
      tensions: [
        "Unterschiede zeigen sich meist in Priorisierung und Timing, weniger in Grundhaltungen.",
        "Ohne explizite Regeln können in Stressphasen unterschiedliche Bewertungslogiken kollidieren.",
      ],
      question:
        "Bei welchen Entscheidungen hat für euch Werte-Konsistenz Vorrang vor Geschwindigkeit oder Profitabilität?",
    },
    spannungsfeld: {
      label: "Werte-Spannungsfeld",
      intro:
        "Eure Werteprofile sind komplementär, aber deutlich unterschiedlich priorisiert. Das kann strategisch wertvoll sein, erfordert jedoch eine bewusst moderierte Zusammenarbeit.",
      shared: [
        "Trotz Unterschiede besteht die Chance auf ein starkes Korrektiv gegen einseitige Entscheidungen.",
      ],
      tensions: [
        "Unter Druck steigt das Risiko für Grundsatzkonflikte über Fairness, Verantwortung und Zumutbarkeit.",
        "Ohne klare Eskalations- und Entscheidungslogik können normative Differenzen operative Reibung verstärken.",
        "Dieses Feld braucht frühzeitige, strukturierte Klärung statt situativer Ad-hoc-Entscheidungen.",
      ],
      question:
        "Welche gemeinsame Leitlinie gilt, wenn Werteanspruch und wirtschaftlicher Druck direkt gegeneinanderstehen?",
    },
  },
  pairing: {
    "Business-Pragmatiker|Business-Pragmatiker":
      "Euer Profil ist stark auf wirtschaftliche Entscheidbarkeit ausgerichtet. Achtet darauf, Reputation und Kultur bewusst mitzusteuern.",
    "Impact-Idealist|Impact-Idealist":
      "Euer Profil ist stark wertezentriert. Definiert klare wirtschaftliche Leitplanken, damit ethischer Anspruch operativ tragfähig bleibt.",
    "Verantwortungs-Stratege|Verantwortungs-Stratege":
      "Euer Profil verbindet Verantwortung und Wirtschaftlichkeit. Das ist eine robuste Basis für konsistente Führung.",
    "Business-Pragmatiker|Impact-Idealist":
      "Hier trifft Ergebnisorientierung auf Werteklarheit. Mit klaren Entscheidungskriterien entsteht ein starkes Balance-Modell.",
    "Business-Pragmatiker|Verantwortungs-Stratege":
      "Hier trifft Umsetzungsdruck auf verantwortungsorientierte Steuerung. Klare Priorisierungsregeln erhöhen die Zusammenarbeitssicherheit.",
    "Impact-Idealist|Verantwortungs-Stratege":
      "Hier trifft hoher Werteanspruch auf integrative Steuerung. Das kann kulturell stark wirken, braucht aber operative Präzision.",
  },
} as const;
