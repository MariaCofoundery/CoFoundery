import type { ConnectGeographicScope } from "@/features/connect/connectTypes";

/**
 * Probleme aus oeffentlichen Quellen: die Startinhalte des Problembretts.
 *
 * Sie stehen nicht unter dem Namen einer Person, sondern mit Quelle, Jahr und
 * Link. Auswahl, Pruefung und Begruendung: docs/research/phase-13/13.9.
 *
 * Es sind Statistiken und Verbandsumfragen, keine Erfahrungsberichte. Wo die
 * Quelle ein Verband, ein Unternehmen oder eine Eigenangabe ist, steht das in
 * `sourceNote`. Die Texte halten sich an das, was die Quelle sagt.
 *
 * Eingespielt werden sie nicht ueber das Formular, sondern mit der Migration
 * `supabase/migrations/20270111130000_problem_public_source_seed.sql` (erzeugt
 * aus dieser Liste mit `npm run public-problems:sql`). Ein Test prueft, dass
 * beides zusammenpasst. Eine angewendete Migration aendert man nicht mehr:
 * Kommen spaeter Eintraege dazu, entsteht dafuer eine neue Liste und eine neue
 * Migration.
 */
export type PublicSourceProblem = {
  /** Stabil: Das Einspielen ueberschreibt den Eintrag mit diesem Schluessel. */
  key: string;
  title: string;
  description: string;
  scope: ConnectGeographicScope;
  locations: string[];
  topics: string[];
  industries: string[];
  sourceName: string;
  sourceUrl: string;
  sourceYear: string;
  /** Art der Quelle und Stichprobe, in einem Satz. */
  sourceNote: string;
};

export const PUBLIC_SOURCE_PROBLEMS: readonly PublicSourceProblem[] = [
  {
    key: "bitkom-verwaltung-2025-amt",
    title: "Menschen gehen zum Amt, weil es den Antrag nicht online gibt",
    description:
      "Wer 2025 persönlich zur Behörde ging, tat das laut Befragung zu 66 %, weil es den Antrag nicht online gab oder Anwesenheit vorgeschrieben war. 12 % von ihnen hatten es online versucht und waren an technischen Problemen gescheitert.",
    scope: "germany",
    locations: [],
    topics: ["Verwaltung", "Digitalisierung", "Behördengang"],
    industries: ["Öffentliche Verwaltung"],
    sourceName: "Bitkom Research im Auftrag von Bitkom",
    sourceUrl: "https://www.bitkom.org/Presse/Presseinformation/Bitkom-Analyse-60-Prozent-der-Verwaltungsleistungen-sind-online-verfuegbar",
    sourceYear: "2025",
    sourceNote: "Verbandsumfrage, Telefonbefragung, 1.005 Personen ab 18",
  },
  {
    key: "bitkom-verwaltung-2025-angaben",
    title: "Dieselben Angaben müssen bei jeder Behörde neu gemacht werden",
    description:
      "71 % der Befragten befürworteten 2025 mehr Datenaustausch zwischen Behörden, damit sie dieselben Angaben nicht immer wieder machen müssen.",
    scope: "germany",
    locations: [],
    topics: ["Verwaltung", "Datenaustausch"],
    industries: ["Öffentliche Verwaltung"],
    sourceName: "Bitkom Research im Auftrag von Bitkom",
    sourceUrl: "https://www.bitkom.org/Presse/Presseinformation/Bitkom-Analyse-60-Prozent-der-Verwaltungsleistungen-sind-online-verfuegbar",
    sourceYear: "2025",
    sourceNote: "Verbandsumfrage, Telefonbefragung, 1.005 Personen ab 18",
  },
  {
    key: "bitkom-verwaltung-2025-stand",
    title: "Bei Anträgen sieht niemand, wie weit die Bearbeitung ist",
    description:
      "85 % der Befragten wünschten 2025, jederzeit Bearbeitungsstand und voraussichtliche Restdauer eines Antrags zu sehen. Ebenfalls 85 % beklagten, Behörden bräuchten grundsätzlich zu lange.",
    scope: "germany",
    locations: [],
    topics: ["Verwaltung", "Transparenz"],
    industries: ["Öffentliche Verwaltung"],
    sourceName: "Bitkom Research im Auftrag von Bitkom",
    sourceUrl: "https://www.bitkom.org/Presse/Presseinformation/Bitkom-Analyse-60-Prozent-der-Verwaltungsleistungen-sind-online-verfuegbar",
    sourceYear: "2025",
    sourceNote: "Verbandsumfrage, Telefonbefragung, 1.005 Personen ab 18",
  },
  {
    key: "bitkom-ozg-2025-digital",
    title: "Viele Verwaltungsleistungen gibt es noch nirgends digital",
    description:
      "Von 579 untersuchten Verwaltungsleistungen waren 2025 laut Bitkom 230 noch nirgends digital verfügbar und nur 165 bundesweit umgesetzt. Ob ein Anliegen online geht, kann daher vom Wohnort abhängen.",
    scope: "germany",
    locations: [],
    topics: ["Verwaltung", "OZG", "Digitalisierung"],
    industries: ["Öffentliche Verwaltung"],
    sourceName: "Bitkom",
    sourceUrl: "https://www.bitkom.org/Presse/Presseinformation/Bitkom-Analyse-60-Prozent-der-Verwaltungsleistungen-sind-online-verfuegbar",
    sourceYear: "2025",
    sourceNote: "Analyse des Branchenverbands zur Umsetzung des Onlinezugangsgesetzes",
  },
  {
    key: "bitkom-schueler-2023-wlan",
    title: "Schulen haben schlechtes oder gar kein WLAN",
    description:
      "87 % der befragten Schülerinnen und Schüler nannten 2023 schlechtes oder fehlendes WLAN als dringlichstes Problem ihrer Schule, noch vor dem Lehrkräftemangel (59 %).",
    scope: "germany",
    locations: [],
    topics: ["Schule", "WLAN", "Digitalisierung"],
    industries: ["Bildung"],
    sourceName: "Bitkom Research im Auftrag von Bitkom",
    sourceUrl: "https://www.bitkom.org/Presse/Presseinformation/Schueler-wollen-digitaler-lernen",
    sourceYear: "2023",
    sourceNote: "Verbandsumfrage, Telefonbefragung, 504 Schülerinnen und Schüler (14 bis 19)",
  },
  {
    key: "dihk-nachfolge-2025",
    title: "Betriebe finden keine Nachfolge",
    description:
      "Rund 5.620 Betrieben, die 2024 in der IHK-Beratung eine Nachfolge suchten, stand kein Interessent gegenüber. 72 % der abgabewilligen Inhaber wollen aus Altersgründen aufhören.",
    scope: "germany",
    locations: [],
    topics: ["Nachfolge", "Mittelstand"],
    industries: ["KMU"],
    sourceName: "DIHK, Unternehmensnachfolge-Report",
    sourceUrl: "https://www.dihk.de/de/newsroom/unternehmensnachfolge-report-2025-157794",
    sourceYear: "2025",
    sourceNote: "Kammerauswertung der IHK-Beratungen, Datenjahr 2024",
  },
  {
    key: "dihk-ausbildung-2025",
    title: "Ausbildungsplätze bleiben leer",
    description:
      "48 % der befragten Betriebe konnten 2025 nicht alle angebotenen Ausbildungsplätze besetzen. 26 % boten weniger Plätze an als im Vorjahr, 15 % mehr.",
    scope: "germany",
    locations: [],
    topics: ["Ausbildung", "Nachwuchs"],
    industries: ["KMU", "Bildung"],
    sourceName: "DIHK, Ausbildungsumfrage",
    sourceUrl: "https://www.dihk.de/de/newsroom/ausbildung-2025-viele-betriebe-vor-herausforderungen-157708",
    sourceYear: "2025",
    sourceNote: "Kammerumfrage, Stichprobengröße nicht angegeben",
  },
  {
    key: "dihk-digital-2025-zeit",
    title: "Für die eigene Digitalisierung fehlt die Zeit",
    description:
      "60 % der befragten Unternehmen nannten 2025 fehlende Zeit oder Ressourcen als Hürde bei der Digitalisierung, 54 % empfanden sie als zu komplex und 42 % nannten die Kosten.",
    scope: "germany",
    locations: [],
    topics: ["Digitalisierung", "Zeitmangel"],
    industries: ["KMU"],
    sourceName: "DIHK, Digitalisierungsumfrage",
    sourceUrl: "https://www.dihk.de/de/newsroom/digitalisierung-2025-herausforderungen-und-fortschritte-fuer-unternehmen-157712",
    sourceYear: "2025",
    sourceNote: "Kammerumfrage, Stichprobengröße nicht angegeben",
  },
  {
    key: "dihk-digital-2025-daten",
    title: "Rechtsunsicherheit bremst die Nutzung der eigenen Daten",
    description:
      "62 % der befragten Unternehmen sahen 2025 rechtliche Unsicherheit als größte Bremse bei der Datennutzung.",
    scope: "germany",
    locations: [],
    topics: ["Daten", "Recht", "Digitalisierung"],
    industries: ["KMU"],
    sourceName: "DIHK, Digitalisierungsumfrage",
    sourceUrl: "https://www.dihk.de/de/newsroom/digitalisierung-2025-herausforderungen-und-fortschritte-fuer-unternehmen-157712",
    sourceYear: "2025",
    sourceNote: "Kammerumfrage, Stichprobengröße nicht angegeben",
  },
  {
    key: "dihk-digital-2025-cyber",
    title: "Cybervorfälle treffen auch kleine Unternehmen",
    description:
      "18 % der kleinen und mittleren Unternehmen waren 2024 laut DIHK von einem erheblichen Cybervorfall betroffen. Nur 31 % der Betriebe führten 2025 regelmäßig Risikoanalysen durch.",
    scope: "germany",
    locations: [],
    topics: ["Cybersicherheit", "KMU"],
    industries: ["KMU", "IT"],
    sourceName: "DIHK, Digitalisierungsumfrage",
    sourceUrl: "https://www.dihk.de/de/newsroom/digitalisierung-2025-herausforderungen-und-fortschritte-fuer-unternehmen-157712",
    sourceYear: "2025",
    sourceNote: "Kammerumfrage, Stichprobengröße nicht angegeben",
  },
  {
    key: "zdh-handwerk-stellen",
    title: "Im Handwerk bleiben Stellen und Ausbildungsplätze leer",
    description:
      "Laut ZDH können im Handwerk über 250.000 Stellen und etwa 20.000 Ausbildungsplätze nicht besetzt werden. Die Verbandsseite nennt dazu kein Datum.",
    scope: "germany",
    locations: [],
    topics: ["Handwerk", "Fachkräfte"],
    industries: ["Handwerk"],
    sourceName: "Zentralverband des Deutschen Handwerks",
    sourceUrl: "https://www.zdh.de/ueber-uns/fachbereich-arbeitsmarkt/tarifpolitik/fachkraefteeinwanderung/",
    sourceYear: "ohne Datum",
    sourceNote: "Eigenangabe des Verbands",
  },
  {
    key: "kfw-gruendungsmonitor-2026",
    title: "Gründende kämpfen mit Kundengewinnung und Bürokratie",
    description:
      "Laut KfW-Gründungsmonitor 2026 (Gründungen 2025) sorgen sich Gründende hauptsächlich um Kundengewinnung und Bürokratie, besonders im Nebenerwerb. Gesetzliche und regulatorische Pflichten kosten einige Stunden Wochenarbeitszeit.",
    scope: "germany",
    locations: [],
    topics: ["Gründen", "Bürokratie", "Kundengewinnung"],
    industries: ["Start-ups"],
    sourceName: "KfW Research, Gründungsmonitor",
    sourceUrl: "https://www.kfw.de/%C3%9Cber-die-KfW/KfW-Research/KfW-Gr%C3%BCndungsmonitor.html",
    sourceYear: "2026",
    sourceNote: "Studie der Förderbank, Gründungen 2025",
  },
  {
    key: "dsee-buerokratie-2025",
    title: "Vereinsvorstände verbringen viel Zeit mit Bürokratie",
    description:
      "Über 77 % der 901 befragten ehrenamtlichen Leitungspersonen schätzten die Bürokratiebelastung für ihren Verein als hoch bis sehr hoch ein.",
    scope: "germany",
    locations: [],
    topics: ["Ehrenamt", "Bürokratie"],
    industries: ["Vereine"],
    sourceName: "Deutsche Stiftung für Engagement und Ehrenamt",
    sourceUrl: "https://www.deutsche-stiftung-engagement-und-ehrenamt.de/pressemeldungen/dsee_umfrage_buerokratiebelastung_im_ehrenamt/",
    sourceYear: "2025",
    sourceNote: "Befragung Dezember 2024 bis Januar 2025, 901 Leitungspersonen",
  },
  {
    key: "bmel-betriebe-2023",
    title: "Es gibt immer weniger landwirtschaftliche Betriebe",
    description:
      "Die Zahl der landwirtschaftlichen Betriebe ging seit 2010 um rund 15 % zurück, das sind mehr als 44.000 Betriebe weniger (Bezug 2023).",
    scope: "germany",
    locations: [],
    topics: ["Landwirtschaft", "Strukturwandel"],
    industries: ["Landwirtschaft"],
    sourceName: "BMEL-Statistik, Betriebsstruktur und Entwicklung",
    sourceUrl: "https://www.bmel-statistik.de/landwirtschaft/landwirtschaftliche-betriebe/betriebsstruktur-und-entwicklung",
    sourceYear: "2023",
    sourceNote: "Amtliche Statistik",
  },
  {
    key: "uba-laerm-2022",
    title: "Nachts hören Millionen Menschen Verkehrslärm",
    description:
      "Nach der Lärmkartierung 2022 waren in Deutschland rund 14,9 Millionen Menschen nachts Verkehrslärm über 50 dB(A) ausgesetzt, ganztägig über 55 dB(A) rund 21,9 Millionen.",
    scope: "germany",
    locations: [],
    topics: ["Lärm", "Wohnen", "Mobilität"],
    industries: ["Verkehr"],
    sourceName: "Umweltbundesamt, Belastung der Bevölkerung durch Verkehrslärm",
    sourceUrl: "https://www.umweltbundesamt.de/daten/umweltindikatoren/indikator-belastung-der-bevoelkerung-durch",
    sourceYear: "2022",
    sourceNote: "Amtliche Lärmkartierung",
  },
  {
    key: "db-fernverkehr-2026-h1",
    title: "Fernzüge kommen oft zu spät",
    description:
      "Im ersten Halbjahr 2026 lag die Pünktlichkeit im Fernverkehr der Deutschen Bahn bei 58,7 %, die Reisendenpünktlichkeit bei 63,2 %.",
    scope: "germany",
    locations: [],
    topics: ["Bahn", "Pünktlichkeit"],
    industries: ["Verkehr"],
    sourceName: "Deutsche Bahn, Konzern-Zwischenbericht (1. Halbjahr)",
    sourceUrl: "https://zbir.deutschebahn.com/2026/de/konzern-zwischenlagebericht-ungeprueft/qualitaet/puenktlichkeit/",
    sourceYear: "2026",
    sourceNote: "Eigenangabe des Unternehmens, ungeprüft",
  },
  {
    key: "bmv-mid-2023-land",
    title: "Auf dem Land geht ohne Auto wenig",
    description:
      "In ländlichen Räumen entfallen laut Mobilität in Deutschland mehr als 60 % der Wege auf das Auto und andere motorisierte Individualverkehrsmittel. Bundesweit werden knapp drei Viertel aller Kilometer so zurückgelegt.",
    scope: "germany",
    locations: [],
    topics: ["Mobilität", "ländlicher Raum"],
    industries: ["Verkehr"],
    sourceName: "Bundesverkehrsministerium, Mobilität in Deutschland (MiD)",
    sourceUrl: "https://www.bmv.de/SharedDocs/DE/Artikel/G/mobilitaet-in-deutschland.html",
    sourceYear: "2023",
    sourceNote: "Haushaltsbefragung, Mai 2023 bis Juni 2024",
  },
  {
    key: "eurostat-oepnv-2024",
    title: "Die Hälfte der Menschen in der EU nutzt keinen öffentlichen Verkehr",
    description:
      "2024 nutzten 50,6 % der Menschen ab 16 Jahren in der EU keinen öffentlichen Verkehr. Täglich nutzten ihn 10,7 %.",
    scope: "europe",
    locations: [],
    topics: ["ÖPNV", "Mobilität"],
    industries: ["Verkehr"],
    sourceName: "Eurostat",
    sourceUrl: "https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260311-2",
    sourceYear: "2024",
    sourceNote: "Amtliche Statistik",
  },
  {
    key: "eurostat-lebensmittel-2024",
    title: "Haushalte werfen viel Essen weg",
    description:
      "EU-Haushalte verursachten 2024 durchschnittlich 69 kg Lebensmittelabfälle pro Person, 53 % aller Lebensmittelabfälle. In der Herstellung kamen 25 kg, in der Primärproduktion 10 kg pro Person hinzu.",
    scope: "europe",
    locations: [],
    topics: ["Lebensmittel", "Abfall"],
    industries: ["Lebensmittel"],
    sourceName: "Eurostat, Lebensmittelabfälle",
    sourceUrl: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Food_waste_and_food_waste_prevention_-_estimates",
    sourceYear: "2024",
    sourceNote: "Amtliche Statistik",
  },
  {
    key: "aktion-mensch-aufzuege",
    title: "Defekte Aufzüge und Rolltreppen treffen Menschen mit Beeinträchtigung stärker",
    description:
      "Laut Inklusionsbarometer Mobilität sind nicht funktionierende Aufzüge und Rolltreppen für Menschen mit Beeinträchtigung ein signifikant größeres Problem als für andere (28 % zu 17 %).",
    scope: "germany",
    locations: [],
    topics: ["Barrierefreiheit", "Mobilität"],
    industries: ["Mobilität"],
    sourceName: "Aktion Mensch, Inklusionsbarometer Mobilität",
    sourceUrl: "https://www.aktion-mensch.de/inklusion/studien/studie-inklusionsbarometer-mobilitaet",
    sourceYear: "ohne Jahresangabe",
    sourceNote: "Studie eines Sozialverbands; die Zuordnung der Zahlen ergibt sich aus der Überschrift",
  },
  {
    key: "eurostat-versorgung-2024",
    title: "Medizinische Versorgung scheitert für manche an Kosten, Entfernung oder Wartezeit",
    description:
      "2024 hatten 3,8 % der Menschen ab 16 in der EU einen ungedeckten medizinischen Bedarf, bei 2,5 % lag es an Kosten, Entfernung oder Wartelisten.",
    scope: "europe",
    locations: [],
    topics: ["Gesundheit", "Zugang"],
    industries: ["Gesundheitswesen"],
    sourceName: "Eurostat, ungedeckter Versorgungsbedarf",
    sourceUrl: "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Unmet_health_care_needs_statistics",
    sourceYear: "2024",
    sourceNote: "Amtliche Statistik",
  },
  {
    key: "vz-pflege-haushaltshilfe-2026",
    title: "Hilfe im Haushalt für Pflegebedürftige zu organisieren ist aufwendig",
    description:
      "Laut Verbraucherzentrale haben viele Pflegedienste für Haushaltshilfe keine personellen Kapazitäten. Die Kosten des Entlastungsbetrags werden nur erstattet, wenn der Anbieter nach Landesrecht anerkannt ist, und die Voraussetzungen unterscheiden sich je Bundesland.",
    scope: "germany",
    locations: [],
    topics: ["Pflege", "Haushalt", "Entlastung"],
    industries: ["Pflege"],
    sourceName: "Verbraucherzentrale, Ratgeber Haushaltshilfe in der Pflege",
    sourceUrl: "https://www.verbraucherzentrale.de/wissen/gesundheit-pflege/pflegeantrag-und-leistungen/haushaltshilfe-die-pflege-mit-haushaltsnahen-dienstleistungen-ergaenzen-42698",
    sourceYear: "2026",
    sourceNote: "Ratgebertext der Verbraucherzentrale, Stand 13.08.2026",
  },
  {
    key: "berlin-buergerbeauftragter-2023",
    title: "Berliner warten auf Anträge und erreichen ihre Behörde nicht",
    description:
      "Der Berliner Bürgerbeauftragte nennt im Jahresbericht 2023 Verzögerungen bei der Antragsbearbeitung, fehlende Erreichbarkeit der Behörden und mangelnde Transparenz als überwiegende Probleme in laufenden Verwaltungsvorgängen.",
    scope: "regional",
    locations: ["Berlin"],
    topics: ["Behörden", "Bearbeitungszeit", "Erreichbarkeit"],
    industries: ["Öffentliche Verwaltung"],
    sourceName: "Bürger- und Polizeibeauftragter des Landes Berlin, Jahresbericht",
    sourceUrl: "https://www.berlin.de/buerger-polizeibeauftragter/aktuelles/pressemitteilungen/pressemitteilung.1439251.php",
    sourceYear: "2023",
    sourceNote: "Amtlicher Jahresbericht 2023, vorgestellt 2024",
  },
  {
    key: "dehoga-no-shows-2025",
    title: "Reservierte Tische bleiben ohne Absage leer",
    description:
      "87 % der 250 von Dehoga befragten Gastronomen und Hoteliers kennen No-Shows aus eigener Erfahrung. Von den Betroffenen fragen 38 % Reservierungen vorab telefonisch oder per E-Mail nach.",
    scope: "germany",
    locations: [],
    topics: ["Reservierungen", "No-Shows", "Planung"],
    industries: ["Gastronomie", "Hotellerie"],
    sourceName: "Dehoga-Umfrage, berichtet von HOGAPAGE (dpa)",
    sourceUrl: "https://www.hogapage.de/nachrichten/wirtschaft/gastronomie/no-shows-belasten-die-gastronomie-viele-g%C3%A4ste-reservieren-und-kommen-nicht/",
    sourceYear: "2025",
    sourceNote: "Verbandsumfrage unter 250 Betrieben nach Angaben von Dehoga NRW; Region und Zeitraum nicht angegeben",
  },
  {
    key: "ehi-retouren-2025",
    title: "Onlinehändler bearbeiten große Mengen Retouren",
    description:
      "In einer Befragung von 124 Onlinehändlern im DACH-Raum meldeten 87,7 % der Textilhändler Rücksendequoten bis 50 %, weitere 12,2 % darüber. 34,4 % erfassen Retourengründe nur manuell, 27 % können die Bearbeitungskosten je Artikel nicht beziffern.",
    scope: "germany",
    locations: [],
    topics: ["Retouren", "E-Commerce", "Kosten"],
    industries: ["Einzelhandel", "E-Commerce"],
    sourceName: "EHI-Studie zu Retouren und Rentabilität, berichtet von stores+shops",
    sourceUrl: "https://www.stores-shops.de/technology/supply-chain/ehi-studie-zu-retouren-und-rentabilitaet/",
    sourceYear: "2025",
    sourceNote: "Branchenstudie, 124 Onlinehändler im DACH-Raum, überwiegend größere Unternehmen",
  },
  {
    key: "freelancermap-akquise-2025",
    title: "Selbstständige verbringen mehrere Stunden pro Woche mit Akquise",
    description:
      "In einer Befragung von 2.151 Freelancern im DACH-Raum gaben 35 % drei bis fünf Stunden pro Woche für Projektakquise an, 15 % mehr als zehn Stunden.",
    scope: "germany",
    locations: [],
    topics: ["Selbstständigkeit", "Akquise", "Zeitaufwand"],
    industries: ["Freelancing"],
    sourceName: "freelancermap, Umfrage zur Auftragslage der Freelancer",
    sourceUrl: "https://www.freelancermap.de/blog/umfrage-auftragslage-freelancer-2025/",
    sourceYear: "2025",
    sourceNote: "Plattformumfrage unter 2.151 Freelancern im DACH-Raum, Juni 2025",
  },
  {
    key: "vgsd-ghosting-2026",
    title: "Auftraggeber melden sich nach einem Kontakt nicht mehr",
    description:
      "84 % von 5.412 befragten Selbstständigen haben beruflich bereits Ghosting erlebt: Nach einem zunächst aussichtsreichen Kontakt kommt keine Antwort oder Absage mehr.",
    scope: "germany",
    locations: [],
    topics: ["Selbstständigkeit", "Akquise", "Ghosting"],
    industries: ["Freelancing"],
    sourceName: "Freelancer-Kompass 2026 von freelancermap, berichtet vom VGSD",
    sourceUrl: "https://www.vgsd.de/wenn-der-kunde-ploetzlich-abtaucht-84-prozent-aller-freelancer-innen-erleben-ghosting/",
    sourceYear: "2026",
    sourceNote: "Plattformumfrage unter 5.412 Selbstständigen, November 2025 bis Februar 2026",
  },
];
