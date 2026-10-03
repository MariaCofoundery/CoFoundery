# Phase 8.4-v0.2 – Founder Workstyle Development Pool

Quelle: vom Auftraggeber am 04.10.2026 bereitgestellter fachlich-methodischer Review. Die Entwicklungs-IDs dieser Fassung sind eingefroren. Frühere Arbeitsnummern sind keine Alias-IDs. Die Texte werden nicht aus dem bestehenden 16-Item-Arbeitsprofil abgeleitet.

Assessment: `founder-workstyle-pretest` / `8.5a-v1`.
Technische Registry: `web/docs/founder-workstyle-pretest-8.5a-v1.json`.
Initiale Itemversion aller Items: `8.4-v0.2`. Jede spätere inhaltliche Änderung benötigt eine neue Itemversion; historische Fassungen bleiben erhalten.

## Umfang und Auswahl

Die Quelle enthält **37 Pool-Items und 20 Core-IDs**: 7 + 6 + 5 + 6 + 6 + 7 = 37; 4 + 3 + 3 + 3 + 3 + 4 = 20. Die A/B/C-Erweiterungen enthalten weitere 6 + 6 + 5 = 17 Items. Sämtliche gelieferten IDs und Zuordnungen bleiben unverändert.

## Antwortformate

| Kennung | Geordnete Antworten (1–5) | Separates Missing |
| --- | --- | --- |
| `frequency` | nie / selten / manchmal / häufig / fast immer | Für EVI ausdrücklich vorgesehen; für EL, VOICE und ORG in dieser Quelle nicht festgelegt |
| `experience_weight` | gar nicht / eher wenig / mittel / stark / sehr stark | „Kann ich noch nicht einschätzen“, wo sinnvoll |
| `ambiguity_comfort` | sehr unwohl / eher unwohl / weder noch / eher wohl / sehr wohl | „Kann ich noch nicht einschätzen“ |

`cannot_assess` ist ausschließlich `missing_reason=cannot_assess` mit leerem Antwortwert, kein sechster Skalenpunkt und keine Mitte. Die technische Registry bietet diese Option für EVI, EXP und AMB an. Für EXP wird sie bei allen sechs erfahrungsbezogenen Situationen zugelassen; fehlende vergleichbare Erfahrung ist keine geringe Erfahrungsgewichtung. Für EL, VOICE und ORG wird ohne weitere Vorgabe keine zusätzliche Antwortoption erfunden.

Gemeinsamer Stem für sämtliche AMB-Items, wortgetreu:

> Wie wohl fühlst du dich jeweils in dieser Situation?

## Phase 8.5a-v1 – Gemeinsamer Core

Alle Personen erhalten dieselben explizit gelieferten Core-IDs, in dieser Reihenfolge:

`EVI-01`, `EVI-02`, `EVI-05`, `EVI-07`,
`EXP-01`, `EXP-02`, `EXP-06`,
`EL-01`, `EL-02`, `EL-04`,
`VOICE-01`, `VOICE-03`, `VOICE-05`,
`AMB-01`, `AMB-03`, `AMB-04`,
`ORG-01`, `ORG-02`, `ORG-04`, `ORG-06`.

Core bedeutet gemeinsame Pretest-Vergleichsbasis, **keine empirisch validierte finale Kurzskala** und keine automatische Produkt-/Advisor-Freigabe.

## Research-only-Erweiterungen

Nach dem Core genau eine Form; Zuweisung später einmalig serverseitig, bei Reload und Resume unverändert.

| Form | IDs | Anzahl |
| --- | --- | --- |
| A | `EVI-03`, `EXP-03`, `EL-03`, `VOICE-02`, `AMB-02`, `ORG-03` | 6 |
| B | `EVI-04`, `EXP-04`, `EL-05`, `VOICE-04`, `AMB-05`, `ORG-05` | 6 |
| C | `EVI-06`, `EXP-05`, `VOICE-06`, `AMB-06`, `ORG-07` | 5 |

Alle Erweiterungsitems sind `research_only=true`. Sie dürfen weder in produktive Teaminterpretationen noch in produktive Workstyle-Scores eingehen.

## Herkunft, Status und Facetten

`source_type` und `source_status` verwenden `live_reference`, `adapted`, `new`. Davon getrennt ist der Entwicklungsstatus `candidate_for_pretest`. „Live-Referenz“ bedeutet keine empirische Validierung des neuen Instruments.

Bei VOICE nennt die Quelle keine individuellen Herkunftsstatus. Technisch wird `new` verwendet, weil diese IDs neu aufgenommen werden; `source_status_explicit=false` hält fest, dass dies eine technische Zuordnung und keine zusätzliche methodische Aussage des Reviews ist.

Die technischen Facetten für EVI (Prüfen/Revidieren) und VOICE (Sichtbarkeit/Timing/Explizitheit) dienen der Ablage. Sie sind keine validierten Subskalen. Für ORG bleibt die ausdrücklich gelieferte Zuordnung erhalten: ORG-01 bis ORG-04 = Facette A „Struktur & Priorisierung“, ORG-05 bis ORG-07 = Facette B „Selbstmonitoring & Belastungssteuerung“. ORG-04 wird nicht eigenmächtig in eine andere Facette verschoben. Arbeitsorganisation & Selbststeuerung ist ein mehrfacettiger Entwicklungsbereich, keine nachgewiesen eindimensionale Skala.

## 1. Evidenzorientierung

Antwortformat: `frequency`. Zusätzlich `cannot_assess`.

### EVI-01

Du hast mehrere realistische Möglichkeiten vor dir. Wie oft vergleichst du ihre Vor- und Nachteile, bevor du dich festlegst?

- Verwendung: Core
- Herkunft: `live_reference` – bestehendes Live-Item / UX-Referenz
- Facette: Prüfen

### EVI-02

Eine wichtige Entscheidung hängt davon ab, ob eine Annahme stimmt. Wie oft prüfst du gezielt, was dafür oder dagegen spricht?

- Verwendung: Core
- Herkunft: `live_reference` – bestehendes Live-Item / UX-Referenz
- Facette: Prüfen

### EVI-03

Du hast eine klare Lieblingsoption. Wie oft suchst du gezielt nach Informationen, die gegen sie sprechen könnten?

- Verwendung: Form A / research_only
- Herkunft: `new` – neu
- Facette: Prüfen

### EVI-04

Wie oft fragst du dich vor einer wichtigen Entscheidung, welche zusätzliche Information deine Einschätzung noch verändern würde?

- Verwendung: Form B / research_only
- Herkunft: `adapted` – aus älterem Material weiterentwickelt
- Facette: Prüfen

### EVI-05

Neue Informationen sprechen deutlich gegen eine Richtung, auf die du dich schon festgelegt hast. Wie oft prüfst du die Entscheidung neu?

- Verwendung: Core
- Herkunft: `new` – neu
- Facette: Revidieren

### EVI-06

Ein Ergebnis widerspricht deiner bisherigen Einschätzung. Wie oft gehst du der Abweichung nach, bevor du sie als Ausnahme abhakst?

- Verwendung: Form C / research_only
- Herkunft: `new` – neu
- Facette: Revidieren

### EVI-07

Du hast bereits viel Zeit in einen Weg investiert. Wie oft ziehst du trotzdem eine andere Richtung ernsthaft in Betracht, wenn neue Informationen dafür sprechen?

- Verwendung: Core
- Herkunft: `new` – neu
- Facette: Revidieren

## 2. Erfahrungsbasierte Urteilsnutzung

Antwortformat: `experience_weight`. Zusätzlich `cannot_assess`, wo sinnvoll; siehe Antwortformatentscheidung oben.

### EXP-01

Du kennst dich mit einem Thema gut aus. Wie viel Gewicht hat dein erster Eindruck bei deiner Entscheidung?

- Verwendung: Core
- Herkunft: `live_reference` – bestehendes Live-Item / UX-Referenz
- Hinweis: Im Pretest ausdrücklich darauf achten, ob „erster Eindruck“ tatsächlich erfahrungsbasierte Mustererkennung oder bloßen Affekt/Impuls auslöst.

### EXP-02

Mehrere Möglichkeiten schneiden anhand der verfügbaren Fakten ähnlich gut ab. Wie viel Gewicht gibst du deiner Erfahrung aus vergleichbaren Situationen?

- Verwendung: Core
- Herkunft: `adapted` – aus älterem I05-Thema weiterentwickelt

### EXP-03

Dir fällt in einer vertrauten Situation sofort ein Muster auf. Wie stark berücksichtigst du diesen Eindruck bei deiner weiteren Einschätzung?

- Verwendung: Form A / research_only
- Herkunft: `new` – neu

### EXP-04

Eine Option sieht auf dem Papier gut aus, passt aber nicht zu dem, was du aus ähnlichen Situationen kennst. Wie stark fließt diese Erfahrung in deine Entscheidung ein?

- Verwendung: Form B / research_only
- Herkunft: `new` – neu

### EXP-05

Du kannst einen ersten Eindruck noch nicht vollständig erklären, erkennst die Situation aber aus früheren Erfahrungen wieder. Wie viel Gewicht gibst du diesem Signal?

- Verwendung: Form C / research_only
- Herkunft: `new` – neu

### EXP-06

Daten und deine Erfahrung weisen in unterschiedliche Richtungen. Wie stark beziehst du deine Erfahrung als zusätzliche Informationsquelle ein?

- Verwendung: Core
- Herkunft: `new` – neu

## 3. Experimentelles Lernen

Antwortformat: `frequency`.

### EL-01

Wie oft beantwortest du eine offene Frage durch einen kleinen praktischen Versuch?

- Verwendung: Core
- Herkunft: `adapted` – aus älterem E07-Thema weiterentwickelt

### EL-02

Wenn zwei Wege plausibel sind, wie oft testest du sie zunächst in kleinem Rahmen, bevor du dich festlegst?

- Verwendung: Core
- Herkunft: `new` – neu

### EL-03

Wie oft klärst du vor einem Versuch, was du dadurch eigentlich herausfinden möchtest?

- Verwendung: Form A / research_only
- Herkunft: `new` – neu

### EL-04

Wie oft wertest du nach einem Versuch bewusst aus, was das Ergebnis für die nächste Entscheidung bedeutet?

- Verwendung: Core
- Herkunft: `new` – neu

### EL-05

Wenn ein erster Versuch keine klare Antwort liefert: Wie oft veränderst du ihn gezielt und testest erneut?

- Verwendung: Form B / research_only
- Herkunft: `new` – neu

## 4. Konstruktive Voice / sachlicher Dissens

Antwortformat: `frequency`. Herkunft aller sechs Items technisch `new`, in der Quelle nicht einzeln angegeben.

### VOICE-01

Wenn dir bei einer gemeinsamen Entscheidung ein relevanter Einwand auffällt, wie oft sprichst du ihn an, bevor endgültig entschieden ist?

- Verwendung: Core
- Herkunft: `new` – keine individuelle Herkunftsangabe in der Quelle
- Facette: Timing

### VOICE-02

Du merkst früh, dass du eine andere Sicht hast, kannst sie aber noch nicht vollständig begründen. Wie oft machst du trotzdem sichtbar, dass du einen Klärungspunkt siehst?

- Verwendung: Form A / research_only
- Herkunft: `new` – keine individuelle Herkunftsangabe in der Quelle
- Facette: Sichtbarkeit

### VOICE-03

Wie häufig sagst du ausdrücklich, dass du einer Entscheidung nicht zustimmst, wenn das tatsächlich der Fall ist?

- Verwendung: Core
- Herkunft: `new` – keine individuelle Herkunftsangabe in der Quelle
- Facette: Explizitheit

### VOICE-04

Eine unangenehme Information ist für andere im Team relevant. Wie häufig machst du sie sichtbar, sobald du ihre Bedeutung erkannt hast?

- Verwendung: Form B / research_only
- Herkunft: `new` – keine individuelle Herkunftsangabe in der Quelle
- Facette: Sichtbarkeit

### VOICE-05

Ein wichtiges Konfliktthema wurde zunächst vertagt. Wie häufig bringst du es später wieder auf, wenn es noch nicht geklärt ist?

- Verwendung: Core
- Herkunft: `new` – keine individuelle Herkunftsangabe in der Quelle
- Facette: Timing

### VOICE-06

Wenn du eine Änderung für notwendig hältst: Wie häufig machst du konkret, was du anders haben möchtest?

- Verwendung: Form C / research_only
- Herkunft: `new` – keine individuelle Herkunftsangabe in der Quelle
- Facette: Explizitheit

Schriftlicher Kommunikationskanal und bevorzugte Formulierung werden nicht in einen Skalenwert aufgenommen. Die D01-artige Frage „Welche Formulierung würdest du am ehesten wählen?“ bleibt eine mögliche **separate nominale Gesprächsfrage**, kein ordinales Skalenitem. Dafür wurden keine Antwortoptionen oder neue Entwicklungs-ID geliefert; sie wird nicht in die Skalenregistry erfunden.

## 5. Ambiguitätstoleranz

Gemeinsamer Stem: „Wie wohl fühlst du dich jeweils in dieser Situation?“ Antwortformat: `ambiguity_comfort`. Zusätzlich `cannot_assess`.

### AMB-01

Für ein Ergebnis gibt es mehrere plausible Erklärungen – und noch ist unklar, welche davon zutrifft.

- Verwendung: Core
- Herkunft: `live_reference` – bestehendes Live-Thema

### AMB-02

Über mehrere Wochen bleibt offen, welche von zwei Richtungen euer Vorhaben nehmen wird.

- Verwendung: Form A / research_only
- Herkunft: `live_reference` – bestehendes Live-Item / Research-Kandidat wegen möglicher starker Venture-Kontextabhängigkeit

### AMB-03

Ihr bekommt zu derselben Idee widersprüchliche Rückmeldungen – und noch ist unklar, welche davon relevanter sind.

- Verwendung: Core
- Herkunft: `live_reference` – bestehendes Live-Item

### AMB-04

Eine wichtige Frage bleibt eine Zeit lang ohne eindeutige Antwort.

- Verwendung: Core
- Herkunft: `live_reference` – bestehendes Live-Item

### AMB-05

Für eine wichtige Entwicklung sind mehrere Ausgänge plausibel und keiner lässt sich derzeit zuverlässig vorhersagen.

- Verwendung: Form B / research_only
- Herkunft: `new` – neu

### AMB-06

Du arbeitest an einem Thema weiter, obwohl sich noch keine eindeutig beste Vorgehensweise erkennen lässt.

- Verwendung: Form C / research_only
- Herkunft: `new` – neu

## 6. Arbeitsorganisation & Selbststeuerung

Antwortformat: `frequency`. Entwicklungsbereich mit mehreren Facetten; nicht ungeprüft als eine einzige eindimensionale Skala behandeln.

### ORG-01

Bevor du ein größeres Vorhaben startest: Wie oft legst du konkrete nächste Schritte oder Zwischenziele fest?

- Verwendung: Core
- Herkunft: `adapted` – aus älterem EX07-Thema weiterentwickelt
- Facette: Struktur & Priorisierung

### ORG-02

Wenn mehrere wichtige Aufgaben gleichzeitig anstehen: Wie oft entscheidest du bewusst, was zuerst dran ist?

- Verwendung: Core
- Herkunft: `new` – neu
- Facette: Struktur & Priorisierung

### ORG-03

Wenn sich Prioritäten verändern: Wie oft ordnest du deine nächsten Schritte neu, statt die neuen Aufgaben einfach zusätzlich aufzunehmen?

- Verwendung: Form A / research_only
- Herkunft: `new` – neu
- Facette: Struktur & Priorisierung

### ORG-04

Wenn du etwas zugesagt hast: Wie oft behältst du selbst im Blick, ob es zum vereinbarten Zeitpunkt erledigt wird?

- Verwendung: Core
- Herkunft: `new` – neu
- Facette: Struktur & Priorisierung

### ORG-05

Wenn eine Aufgabe ins Stocken gerät: Wie oft bemerkst du das früh genug, um dein Vorgehen noch anzupassen?

- Verwendung: Form B / research_only
- Herkunft: `new` – neu
- Facette: Selbstmonitoring & Belastungssteuerung

### ORG-06

Wenn deine Arbeitslast dauerhaft zu hoch wird: Wie oft priorisierst oder reduzierst du Aufgaben bewusst neu?

- Verwendung: Core
- Herkunft: `new` – neu
- Facette: Selbstmonitoring & Belastungssteuerung

### ORG-07

Wenn du merkst, dass deine Konzentration oder Leistungsfähigkeit deutlich nachlässt: Wie oft passt du deine Arbeitsweise an?

- Verwendung: Form C / research_only
- Herkunft: `new` – neu
- Facette: Selbstmonitoring & Belastungssteuerung

## Methodische und technische Grenzen

- Keine finalen psychometrischen Scores, kein globaler Workstyle-Gesamtscore, Matchscore, Kompatibilitätsurteil, Founder-/Persönlichkeitstyp oder Erfolgswahrscheinlichkeit.
- Teamvergleich ausschließlich bei gleicher Core-Instrumentversion und gleichen Itemversionen sowie explizit produktiv freigegebenen Inhalten. Core-Auswahl allein erteilt keine Freigabe.
- Workstyle bleibt personbezogen. Venture Alignment bleibt vorhabensbezogen. Founder Setup hält gemeinsame Vereinbarungen. Der spätere Teamreport vermischt diese Ebenen nicht.
- Research-Einwilligung ist unabhängig von Produkt-/Advisor-Freigaben. Ohne gesonderte Einwilligung keine Researchteilnahme oder Researchauswertung.
- Research-only-Items und nominale Gesprächsfragen sind aus produktiven Skalen-/Teaminterpretationen ausgeschlossen.
- Antwortänderungen überschreiben keine historischen Itemfassungen. Instrumentversion und Itemversion müssen später mit der Antwort gespeichert werden; die Registry allein implementiert noch keine Persistenz.
