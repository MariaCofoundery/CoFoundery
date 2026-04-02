# Founder-Compatibility Master Item Set v1

Stand: 01.04.2026

Dieses Dokument ist die **verbindliche Master-Spezifikation** für das Founder-Compatibility-Instrument v1.

Es bündelt:

- die finalen 24 `CORE`-Items
- die finalen 12 `SUPPORT`-Items
- finale `itemId`s
- finale Skalenlogik
- finale Polrichtung
- finale Layer-Zuordnung

Dieses Dokument ist die vorgesehene Freigabebasis vor:

- JSON-Registry
- Supabase-Migration
- Refactor von Scoring-Code
- Refactor der Report-Engine

---

## 0. Finalisierte Grundlagen

### Finale Dimensionsnamen

- `company_logic` = Unternehmenslogik
- `decision_logic` = Entscheidungslogik
- `work_structure` = Arbeitsstruktur & Zusammenarbeit
- `commitment` = Commitment
- `risk_orientation` = Risikoorientierung
- `conflict_style` = Konfliktstil

### Finale Pole

- Unternehmenslogik: `aufbauorientiert ↔ opportunitätsorientiert`
- Entscheidungslogik: `analytisch ↔ intuitiv`
- Arbeitsstruktur & Zusammenarbeit: `autonom ↔ abgestimmt`
- Commitment: `klar begrenzt ↔ hoch priorisiert`
- Risikoorientierung: `sicherheitsorientiert ↔ chancenorientiert`
- Konfliktstil: `reflektierend ↔ direkt`

### Finaler Gesamttensionsbegriff

Verwenden:

- `overallTension`

Nicht mehr verwenden:

- `conflictRiskIndex`

---

## 1. Standard-Skalen

### Likert-5 Standard

- `0` = trifft überhaupt nicht zu
- `25` = trifft eher nicht zu
- `50` = teils / teils
- `75` = trifft eher zu
- `100` = trifft voll zu

### Forced-Choice-5 Standard

Die Itemformulierung enthält immer Aussage `A` und Aussage `B`.

- `0` = A trifft deutlich eher zu
- `25` = A trifft eher zu
- `50` = beide etwa gleich
- `75` = B trifft eher zu
- `100` = B trifft deutlich eher zu

### Scenario-4 Standard

Jedes Szenario enthält vier inhaltlich definierte Antwortoptionen:

- `0`
- `33`
- `67`
- `100`

Die Antwortoptionen sind jeweils dimensionsspezifisch ausformuliert.

---

## 2. Polarity- und Status-Konvention

### Polarity

- `left_pole_keyed`
  - Zustimmung oder Optionennähe zeigt auf den linken Pol
  - für die einheitliche Modellrichtung muss intern auf `0 = links`, `100 = rechts` normiert werden

- `right_pole_keyed`
  - Zustimmung oder Optionennähe zeigt auf den rechten Pol
  - keine zusätzliche Umkehr nötig

- `forced_choice_left_to_right`
  - `0 = A = linker Pol`
  - `100 = B = rechter Pol`

- `scenario_left_to_right`
  - `0 = linker Pol`
  - `100 = rechter Pol`

### Item-Herkunft

- `retained`
- `rewritten`
- `new`

---

# A. Dimension-by-Dimension Master Set

## 3. Unternehmenslogik
**dimensionId:** `company_logic`  
**Pole:** `aufbauorientiert ↔ opportunitätsorientiert`

### CORE 1
- **itemId:** `cl_core_1`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `left_pole_keyed`
- **item text:** `Wenn ich unternehmerische Optionen bewerte, ist für mich vor allem wichtig, ob daraus langfristig ein tragfähiges Unternehmen entstehen kann.`
- **response scale:** `Likert-5 Standard`
- **rationale:** Misst die strategische Bewertungslogik direkt. Bleibt im CORE, weil das Item vergleichsweise sauber zwischen Tragfähigkeit und Opportunitätshebel differenziert.

### CORE 2
- **itemId:** `cl_core_2`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Ich bewerte unternehmerische Optionen vor allem danach, ob sie das Unternehmen langfristig robuster und tragfähiger machen.`
  - `B: Ich bewerte unternehmerische Optionen vor allem danach, ob sie einen starken strategischen Hebel oder ein relevantes Marktfenster eröffnen.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** Gehört in den CORE, weil es das Konstrukt direkt als Bewertungskriterium und nicht als Risiko- oder Commitment-Thema aufzieht.

### CORE 3
- **itemId:** `cl_core_3`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Wenn eine Richtung einmal stimmig und tragfähig wirkt, sollte sie nicht wegen jeder neuen Chance verändert werden.`
  - `B: Wenn eine neue Richtung strategisch deutlich mehr Hebel bietet, sollte sie auch dann neu geprüft werden, wenn die bisherige Richtung bereits stimmig ist.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** CORE-relevant, weil es strategische Bewertungslogik bei Neugewichtung misst. Der Wortlaut wurde eng gehalten, um generelle Flexibilitäts- oder Risikolesarten zu begrenzen.

### CORE 4
- **itemId:** `cl_core_4`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Das Unternehmen macht erstmals spürbar Gewinn. Was wäre für dich in so einer Phase am wichtigsten?`
- **response options:**
  - `0`: `Zuerst strukturelle Stabilität und Belastbarkeit stärken.`
  - `33`: `Wachstum nur dann ausbauen, wenn Aufbau und Substanz erkennbar mitziehen.`
  - `67`: `Gewinne vor allem nutzen, um Marktposition und strategische Hebel auszubauen.`
  - `100`: `Gewinne konsequent nutzen, um das strategische Momentum zu beschleunigen.`
- **rationale:** Bleibt im CORE, weil es Kapitalallokation ausdrücklich als strategisches Bewertungskriterium rahmt. Trotzdem bleibt Unternehmenslogik insgesamt eine riskantere Dimension.

### SUPPORT 1
- **itemId:** `cl_support_1`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ein Investor bietet euch Kapital für sehr schnelles Wachstum an. Dafür müsst ihr das Unternehmen stärker auf einen großen Markt mit hohem Skalierungspotenzial ausrichten, auch wenn euer bisheriges Modell dadurch weniger fokussiert würde. Was entspricht am ehesten deiner ersten Tendenz?`
- **response options:**
  - `0`: `Ich würde das eher nicht verfolgen. Für mich ist wichtiger, dass die Unternehmenslogik stimmig und belastbar bleibt.`
  - `33`: `Ich würde sehr genau prüfen, ob sich Wachstum und tragfähiger Aufbau sauber verbinden lassen.`
  - `67`: `Ich wäre offen dafür, wenn die strategische Chance groß genug ist und wir klare Leitplanken definieren.`
  - `100`: `Ich würde das eher verfolgen. Wenn ein starker Hebel sichtbar wird, sollte man das Unternehmen darauf ausrichten.`
- **rationale:** SUPPORT, weil das Szenario realistisch und reportstark ist, aber weiterhin auf Risiko- und Wachstumssprache mitlädt.

### SUPPORT 2
- **itemId:** `cl_support_2`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ihr habt ein stabiles Geschäftsmodell gefunden. Dann zeigt sich ein anderer Markt mit deutlich größerem Hebel, aber nur mit klarem Richtungswechsel. Wie gehst du damit um?`
- **response options:**
  - `0`: `Ich würde eher bei der bisherigen Richtung bleiben, solange sie tragfähig ist.`
  - `33`: `Ich würde den neuen Markt sorgfältig prüfen, bevor wir die Richtung neu gewichten.`
  - `67`: `Ich würde offen prüfen, ob der neue Markt strategisch mehr Hebel bietet.`
  - `100`: `Ich würde die neue Richtung aktiv verfolgen, wenn das Potenzial deutlich größer ist.`
- **rationale:** SUPPORT, weil das Item sehr anschaulich ist, aber stärker situativ und damit etwas anfälliger für Risikolesarten.

---

## 4. Entscheidungslogik
**dimensionId:** `decision_logic`  
**Pole:** `analytisch ↔ intuitiv`

### CORE 1
- **itemId:** `dl_core_1`
- **status:** `retained`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `left_pole_keyed`
- **item text:** `Bei strategischen Entscheidungen verlasse ich mich stark auf Daten, Analysen und überprüfbare Argumente.`
- **response scale:** `Likert-5 Standard`
- **rationale:** Einer der saubersten existierenden Marker für den analytischen Pol. Deshalb direkt CORE.

### CORE 2
- **itemId:** `dl_core_2`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Ich treffe wichtige Entscheidungen lieber erst, wenn die wichtigsten Argumente und Annahmen klar auf dem Tisch liegen.`
  - `B: Ich treffe wichtige Entscheidungen lieber, sobald eine Richtung plausibel wirkt, auch wenn noch nicht alle Punkte geklärt sind.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** CORE, weil es die Entscheidungsschwelle sauberer trifft als Tempo- oder Governance-Items.

### CORE 3
- **itemId:** `dl_core_3`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Dein Bauchgefühl sagt dir bei einer Entscheidung klar „nein“, aber die Daten sprechen eher dafür. Was tust du?`
- **response options:**
  - `0`: `Ich folge eher den Daten, wenn die Fakten dafür sprechen.`
  - `33`: `Ich würde noch eine zusätzliche Perspektive oder einen Gegencheck einholen.`
  - `67`: `Ich nehme mein Bauchgefühl ernst und würde die Entscheidung zunächst bremsen.`
  - `100`: `Wenn es sich klar falsch anfühlt, würde ich die Entscheidung eher nicht treffen.`
- **rationale:** CORE, weil es die Kernspannung Datenprimat versus intuitive Stopplogik direkt trifft.

### CORE 4
- **itemId:** `dl_core_4`
- **status:** `new`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `left_pole_keyed`
- **item text:** `Für mich ist eine wichtige Entscheidung erst dann wirklich tragfähig, wenn die wichtigsten Gegenargumente geprüft wurden.`
- **response scale:** `Likert-5 Standard`
- **rationale:** Neues CORE-Item zur Stabilisierung des analytischen Pols. Vermeidet Risiko-, Konflikt- und Governance-Loading.

### SUPPORT 1
- **itemId:** `dl_support_1`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Eine strategische Entscheidung steht an, aber ihr habt nur wenig Zeit. Wie gehst du in so einer Situation am liebsten vor?`
- **response options:**
  - `0`: `Ich würde die Entscheidung möglichst kurz aufschieben, damit wir die wichtigsten offenen Punkte noch klären.`
  - `33`: `Ich würde die wichtigsten Informationen bündeln und dann bewusst abwägen.`
  - `67`: `Ich würde mit einer tragfähigen Grundlage entscheiden und fehlende Punkte später nachschärfen.`
  - `100`: `Ich würde eher zügig eine Richtung setzen und im Verlauf nachjustieren.`
- **rationale:** SUPPORT, weil Zeitdruck das Konstrukt gut veranschaulicht, aber auch Tempo- und Risikolesarten anzieht.

### SUPPORT 2
- **itemId:** `dl_support_2`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Nach einer Woche merkt ihr, dass eine eingeschlagene Richtung wahrscheinlich nicht funktioniert. Wie reagierst du am ehesten?`
- **response options:**
  - `0`: `Ich würde zuerst genauer verstehen wollen, warum die Richtung nicht trägt.`
  - `33`: `Ich würde die Richtung kontrolliert anpassen und die wichtigsten Annahmen sauber prüfen.`
  - `67`: `Ich würde relativ zügig auf eine plausiblere Richtung umschwenken.`
  - `100`: `Ich würde keine große Zeit verlieren und direkt etwas Neues ausprobieren.`
- **rationale:** SUPPORT, weil das Item Kurskorrektur praxisnah macht, aber auch Lern- und Risikologik streift.

---

## 5. Arbeitsstruktur & Zusammenarbeit
**dimensionId:** `work_structure`  
**Pole:** `autonom ↔ abgestimmt`

### CORE 1
- **itemId:** `ws_core_1`
- **status:** `retained`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Ich arbeite am liebsten eigenständig und übernehme Verantwortung für meinen Bereich.`
  - `B: Ich arbeite am liebsten eng abgestimmt mit meinem Co-Founder.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** Sehr trennscharfes Kernitem für Koordinationspräferenz.

### CORE 2
- **itemId:** `ws_core_2`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Du arbeitest intensiv an einem neuen Feature und triffst einige operative Entscheidungen. Wann würdest du deinen Co-Founder typischerweise einbeziehen?`
- **response options:**
  - `0`: `Ich würde wichtige Schritte weitgehend eigenständig in meinem Bereich entscheiden.`
  - `33`: `Ich würde den Co-Founder einbeziehen, wenn erste belastbare Zwischenstände vorliegen.`
  - `67`: `Ich würde regelmäßig kurze Updates geben und punktuell Feedback einholen.`
  - `100`: `Ich würde wichtige Schritte früh gemeinsam abstimmen.`
- **rationale:** CORE, weil das Item Mitsicht und Timing im Alltag direkt misst.

### CORE 3
- **itemId:** `ws_core_3`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ihr merkt, dass ihr beide immer wieder an denselben Themen arbeitet und sich Zuständigkeiten überschneiden. Wie reagierst du?`
- **response options:**
  - `0`: `Ich würde die Zuständigkeiten klarer trennen, damit jeder eigenständiger arbeiten kann.`
  - `33`: `Ich würde Rollen klären und nur an wichtigen Schnittstellen abstimmen.`
  - `67`: `Ich würde regelmäßige kurze Abstimmungen einführen, damit Überschneidungen sichtbar bleiben.`
  - `100`: `Ich würde die Zusammenarbeit enger synchronisieren, damit solche Überlappungen früh gemeinsam geklärt werden.`
- **rationale:** CORE, weil das Item Koordinationslogik statt Persönlichkeit oder Vertrauen misst.

### CORE 4
- **itemId:** `ws_core_4`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `right_pole_keyed`
- **item text:** `Für mich funktioniert Zusammenarbeit am besten, wenn wichtige Zwischenstände früh sichtbar sind und nicht erst am Ende geteilt werden.`
- **response scale:** `Likert-5 Standard`
- **rationale:** CORE, weil das Item Mitsichtbedarf direkt und vergleichsweise sauber erfasst.

### SUPPORT 1
- **itemId:** `ws_support_1`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Euer Arbeitsalltag läuft zu sehr unterschiedlichen Zeiten ab. Wie würdest du die Zusammenarbeit organisieren?`
- **response options:**
  - `0`: `Für mich reicht eine klare Aufgabenaufteilung; gemeinsame Zeiten sind nicht entscheidend.`
  - `33`: `Ich würde nur an wenigen festen Punkten synchronisieren.`
  - `67`: `Ich würde tägliche kurze Abstimmungsfenster einbauen.`
  - `100`: `Ich würde möglichst viele relevante Arbeitsphasen enger synchronisieren.`
- **rationale:** SUPPORT, weil es einen typischen Koordinationsfall konkret macht, aber stärker situativ ist.

### SUPPORT 2
- **itemId:** `ws_support_2`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ein Co-Founder arbeitet sehr autonom und informiert dich erst spät über wichtige Entscheidungen. Wie gut kannst du damit arbeiten?`
- **response options:**
  - `0`: `Damit kann ich gut arbeiten, solange der Zuständigkeitsbereich klar ist.`
  - `33`: `Das ist für mich meist okay, solange Ergebnisse und Richtung nachvollziehbar bleiben.`
  - `67`: `Ich würde mir zumindest regelmäßige Zwischenstände wünschen.`
  - `100`: `Das wäre für mich schwierig, weil ich bei wichtigen Themen früh sichtbar eingebunden sein möchte.`
- **rationale:** SUPPORT, weil das Item stark reporttauglich ist, aber bei manchen Personen Vertrauen und Konfliktsensibilität mitberührt.

---

## 6. Commitment
**dimensionId:** `commitment`  
**Pole:** `klar begrenzt ↔ hoch priorisiert`

### CORE 1
- **itemId:** `cm_core_1`
- **status:** `retained`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `right_pole_keyed`
- **item text:** `Der Aufbau eines Startups hat für mich aktuell eine sehr hohe Priorität in meinem Leben.`
- **response scale:** `Likert-5 Standard`
- **rationale:** Sehr klares Kernitem für Priorisierung.

### CORE 2
- **itemId:** `cm_core_2`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Auch beim Aufbau eines Startups sollten klare Grenzen für Arbeitszeit und Belastung gelten.`
  - `B: Der Aufbau eines Startups erfordert oft vollen Einsatz über längere Zeit.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** CORE, weil es Einsatznorm und Priorisierungslogik direkt misst. Die Reihenfolge wurde zur finalen Polrichtung gedreht.

### CORE 3
- **itemId:** `cm_core_3`
- **status:** `retained`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `right_pole_keyed`
- **item text:** `Ich bin bereit, in intensiven Phasen deutlich mehr Zeit und Energie in das Unternehmen zu investieren als in einen normalen Job.`
- **response scale:** `Likert-5 Standard`
- **rationale:** Sauberer Kernindikator für Intensitätsbereitschaft.

### CORE 4
- **itemId:** `cm_core_4`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Das Unternehmen wächst langsam, und ihr müsst entscheiden, wie viel persönliche Energie ihr weiter investieren wollt. Welche Haltung passt am ehesten zu dir?`
- **response options:**
  - `0`: `Ich würde bewusst auf ein tragfähiges Gleichgewicht achten und den Einsatz klar begrenzen.`
  - `33`: `Ich würde engagiert bleiben, aber mit klaren Grenzen.`
  - `67`: `Ich würde vorübergehend noch spürbar mehr Energie investieren, wenn die Richtung weiter trägt.`
  - `100`: `Ich wäre bereit, das Unternehmen über längere Zeit sehr klar zu priorisieren.`
- **rationale:** CORE, weil Persistenz und Prioritätsnorm gemessen werden, nicht Fairness oder Teammoral.

### SUPPORT 1
- **itemId:** `cm_support_1`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Du merkst nach einigen Monaten, dass parallel zum Startup weitere Projekte oder Verpflichtungen Raum einnehmen. Was entspricht am ehesten deiner Haltung?`
- **response options:**
  - `0`: `Das ist für mich grundsätzlich gut vereinbar, solange die Aufgaben klar bleiben.`
  - `33`: `Das ist für mich meist okay, wenn die Prioritäten transparent bleiben.`
  - `67`: `Ich würde genauer klären wollen, wann das Startup Vorrang haben soll.`
  - `100`: `Ich würde erwarten, dass das Startup in zentralen Phasen klar Vorrang bekommt.`
- **rationale:** SUPPORT, weil das Thema sehr konkret ist, aber leichter Fairness- und Beziehungsthemen auflädt.

### SUPPORT 2
- **itemId:** `cm_support_2`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Der Aufbau des Startups fordert deutlich mehr Zeit als ursprünglich geplant. Wie reagierst du?`
- **response options:**
  - `0`: `Ich würde meine ursprünglichen Grenzen eher beibehalten.`
  - `33`: `Ich würde nur begrenzt zusätzliche Zeit geben und klare Grenzen setzen.`
  - `67`: `Ich würde meine Prioritäten vorübergehend neu ordnen, um mehr Raum zu schaffen.`
  - `100`: `Ich würde das Startup in dieser Phase klar höher priorisieren als bisher.`
- **rationale:** SUPPORT, weil es alltagsnah ist und Workbook-Handoffs gut unterstützt, aber situativer auf Belastung reagiert.

---

## 7. Risikoorientierung
**dimensionId:** `risk_orientation`  
**Pole:** `sicherheitsorientiert ↔ chancenorientiert`

### CORE 1
- **itemId:** `ro_core_1`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Der Runway eures Startups reicht noch etwa drei Monate. Ihr müsst entscheiden, wie ihr jetzt vorgeht. Was entspricht am ehesten deiner Haltung?`
- **response options:**
  - `0`: `Ich würde zuerst die Belastung konsequent begrenzen und Sicherheit herstellen.`
  - `33`: `Ich würde vor allem auf klare Absicherung und Leitplanken setzen.`
  - `67`: `Ich würde bewusst Maßnahmen wählen, die Chance und Unsicherheit gleichzeitig in Kauf nehmen.`
  - `100`: `Ich würde eher einen offensiven Schritt bevorzugen, wenn dadurch eine realistische Chance entsteht.`
- **rationale:** CORE, weil Downside-Regulation unter Druck sehr direkt gemessen wird.

### CORE 2
- **itemId:** `ro_core_2`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Beim Aufbau des Unternehmens stellt sich die Frage nach persönlichem Risiko. Welche Haltung passt am ehesten zu dir?`
- **response options:**
  - `0`: `Ich möchte persönliches Risiko möglichst klar begrenzen.`
  - `33`: `Ich bin zu kalkuliertem Risiko bereit, aber nur mit deutlichen Sicherungen.`
  - `67`: `Ich bin bereit, spürbares persönliches Risiko zu tragen, wenn die Chance plausibel ist.`
  - `100`: `Ich kann auch deutlich höhere persönliche Unsicherheit akzeptieren, wenn der Hebel groß genug ist.`
- **rationale:** CORE, weil persönliche Risikoexposition direkt und vergleichsweise unvermischt erfasst wird.

### CORE 3
- **itemId:** `ro_core_3`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `right_pole_keyed`
- **item text:** `Ich kann Unsicherheit über eine Zeit lang gut mittragen, auch wenn nicht alle Risiken klar abschätzbar sind.`
- **response scale:** `Likert-5 Standard`
- **rationale:** CORE, weil Unsicherheitstoleranz direkter gemessen wird als über Entscheidungssituationen.

### CORE 4
- **itemId:** `ro_core_4`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Ich gehe lieber Schritte, bei denen die mögliche Belastung und der Downside klar begrenzt sind.`
  - `B: Ich gehe lieber Schritte, wenn die mögliche Chance groß ist, auch wenn die Unsicherheit spürbar bleibt.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** CORE, weil das Item Risiko-Regulation fokussiert und nicht Produkt- oder Strategielogik.

### SUPPORT 1
- **itemId:** `ro_support_1`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ihr steht kurz vor dem Launch eines neuen Produkts, aber einige Funktionen sind noch nicht perfekt. Wie gehst du damit um?`
- **response options:**
  - `0`: `Ich würde eher warten, bis die wichtigsten Unsicherheiten sauber reduziert sind.`
  - `33`: `Ich würde nur mit klaren Qualitäts- und Sicherheitsgrenzen launchen.`
  - `67`: `Ich wäre offen für einen früheren Launch, wenn wir eng nachsteuern können.`
  - `100`: `Ich würde lieber früh in den Markt gehen und die verbleibende Unsicherheit aktiv mittragen.`
- **rationale:** SUPPORT, weil das Szenario reportstark ist, aber Entscheidungs- und Qualitätslogik mitschwingen.

### SUPPORT 2
- **itemId:** `ro_support_2`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ihr steht vor einer Wachstumschance, die das Unternehmen deutlich nach vorn bringen könnte, aber auch die monatliche Belastung und das Risiko spürbar erhöht. Welche Haltung entspricht am ehesten deiner?`
- **response options:**
  - `0`: `Ich würde den Schritt nur gehen, wenn die zusätzliche Belastung klar begrenzt werden kann.`
  - `33`: `Ich wäre nur mit deutlichen Leitplanken und Stop-Kriterien offen dafür.`
  - `67`: `Ich würde den Schritt eher gehen, wenn die Chance groß genug ist und wir unterwegs nachjustieren können.`
  - `100`: `Ich würde die Chance eher entschlossen nutzen, auch wenn dafür deutlich mehr Unsicherheit getragen werden muss.`
- **rationale:** SUPPORT, weil das Item sehr hilfreich für Report und Workbook ist, aber Wachstumssprache die Dimension etwas situativer macht.

---

## 8. Konfliktstil
**dimensionId:** `conflict_style`  
**Pole:** `reflektierend ↔ direkt`

### CORE 1
- **itemId:** `cs_core_1`
- **status:** `retained`
- **layer:** `core`
- **type:** `likert`
- **polarity:** `right_pole_keyed`
- **item text:** `Ich spreche Probleme im Team in der Regel an, sobald ich merke, dass etwas nicht gut läuft.`
- **response scale:** `Likert-5 Standard`
- **rationale:** Sehr klares Kernitem für Konflikteröffnung.

### CORE 2
- **itemId:** `cs_core_2`
- **status:** `retained`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ein Co-Founder trifft eine Entscheidung, mit der du nicht einverstanden bist. Wie würdest du typischerweise reagieren?`
- **response options:**
  - `0`: `Ich würde meine Sicht zuerst kurz sortieren und nicht sofort reagieren.`
  - `33`: `Ich würde ein ruhiges Gespräch suchen, sobald ich meine Position klarer habe.`
  - `67`: `Ich würde das relativ zeitnah ansprechen.`
  - `100`: `Ich würde den Unterschied direkt ansprechen, solange er noch frisch ist.`
- **rationale:** CORE, weil Timing und Direktheit hier klar im Vordergrund stehen.

### CORE 3
- **itemId:** `cs_core_3`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `forced_choice`
- **polarity:** `forced_choice_left_to_right`
- **item text:** `Welche Aussage passt eher zu dir?`
  - `A: Wenn Spannung entsteht, sortiere ich meine Sicht lieber erst kurz, bevor ich sie anspreche.`
  - `B: Wenn Spannung entsteht, spreche ich sie lieber direkt an, solange sie noch frisch ist.`
- **response scale:** `Forced-Choice-5 Standard`
- **rationale:** CORE, weil es Konflikteröffnung misst und Zuhören/Defensivität vermeidet.

### CORE 4
- **itemId:** `cs_core_4`
- **status:** `rewritten`
- **layer:** `core`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `In einer festgefahrenen Diskussion im Gründerteam seid ihr euch klar uneinig. Wie sollte so eine Situation für dich idealerweise weitergeführt werden?`
- **response options:**
  - `0`: `Ich würde das Gespräch eher kurz unterbrechen, damit beide Seiten ihre Sicht sortieren können.`
  - `33`: `Ich würde das Thema in ruhigem Rahmen gezielt weiter klären.`
  - `67`: `Ich würde die unterschiedlichen Positionen offen benennen und relativ direkt auf den Punkt bringen.`
  - `100`: `Ich würde die Spannung klar und ohne große Umwege ansprechen, damit sichtbar wird, woran es hängt.`
- **rationale:** CORE, weil Konfliktbearbeitungsstil erfasst wird und Governance-Logik entfernt wurde.

### SUPPORT 1
- **itemId:** `cs_support_1`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `Ein Fehler im Unternehmen hat negative Auswirkungen. Wie würdest du das gegenüber deinem Co-Founder ansprechen?`
- **response options:**
  - `0`: `Ich würde das eher vorsichtig und mit etwas Abstand ansprechen.`
  - `33`: `Ich würde zuerst den Rahmen klären und dann sachlich in das Thema einsteigen.`
  - `67`: `Ich würde den Fehler relativ klar und zeitnah ansprechen.`
  - `100`: `Ich würde die Auswirkungen direkt und ohne große Vorstufe benennen.`
- **rationale:** SUPPORT, weil das Szenario konkret und workbooknah ist, aber Fehlerkultur leicht mitlädt.

### SUPPORT 2
- **itemId:** `cs_support_2`
- **status:** `rewritten`
- **layer:** `support`
- **type:** `scenario`
- **polarity:** `scenario_left_to_right`
- **item text:** `In einer emotionaleren Diskussion über eine strategische Frage: Wie gehst du typischerweise mit solcher Spannung um?`
- **response options:**
  - `0`: `Ich nehme eher Tempo heraus und sortiere erst, bevor ich weiter in die Klärung gehe.`
  - `33`: `Ich versuche, das Gespräch zunächst zu beruhigen und dann geordnet weiterzuführen.`
  - `67`: `Ich halte Spannung aus und spreche den Kern der Differenz eher direkt an.`
  - `100`: `Ich gehe auch in emotionaleren Situationen eher klar und unmittelbar in die Klärung.`
- **rationale:** SUPPORT, weil das Item hohe Alltagsrelevanz hat, aber stärker Affekttoleranz mitschwingen lässt.

---

# B. Full Flat Table of All 36 Items

| itemId | dimensionId | layer | type | status | polarity | Kurzinhalt |
|---|---|---|---|---|---|---|
| cl_core_1 | company_logic | core | likert | rewritten | left_pole_keyed | Tragfähigkeit als primäres Bewertungskriterium |
| cl_core_2 | company_logic | core | forced_choice | rewritten | forced_choice_left_to_right | robust/tragfähig vs. Hebel/Marktfenster |
| cl_core_3 | company_logic | core | forced_choice | rewritten | forced_choice_left_to_right | Richtung halten vs. strategisch neu gewichten |
| cl_core_4 | company_logic | core | scenario | rewritten | scenario_left_to_right | Gewinnphase: Aufbau vs. Momentum |
| cl_support_1 | company_logic | support | scenario | rewritten | scenario_left_to_right | Investor + schnelle Skalierung |
| cl_support_2 | company_logic | support | scenario | rewritten | scenario_left_to_right | neuer Markt mit größerem Hebel |
| dl_core_1 | decision_logic | core | likert | retained | left_pole_keyed | Daten, Analysen, überprüfbare Argumente |
| dl_core_2 | decision_logic | core | forced_choice | rewritten | forced_choice_left_to_right | Klarheit der Argumente vs. plausible Richtung |
| dl_core_3 | decision_logic | core | scenario | retained | scenario_left_to_right | Bauchgefühl vs. Daten |
| dl_core_4 | decision_logic | core | likert | new | left_pole_keyed | Gegenargumente prüfen vor Entscheidung |
| dl_support_1 | decision_logic | support | scenario | rewritten | scenario_left_to_right | Entscheidung unter Zeitdruck |
| dl_support_2 | decision_logic | support | scenario | rewritten | scenario_left_to_right | Richtung funktioniert nicht |
| ws_core_1 | work_structure | core | forced_choice | retained | forced_choice_left_to_right | eigenständig vs. eng abgestimmt |
| ws_core_2 | work_structure | core | scenario | retained | scenario_left_to_right | Zeitpunkt der Einbindung |
| ws_core_3 | work_structure | core | scenario | retained | scenario_left_to_right | Zuständigkeitsüberschneidung |
| ws_core_4 | work_structure | core | likert | rewritten | right_pole_keyed | Zwischenstände früh sichtbar machen |
| ws_support_1 | work_structure | support | scenario | rewritten | scenario_left_to_right | unterschiedliche Arbeitszeiten |
| ws_support_2 | work_structure | support | scenario | rewritten | scenario_left_to_right | späte Information über Entscheidungen |
| cm_core_1 | commitment | core | likert | retained | right_pole_keyed | Startup hat hohe Priorität |
| cm_core_2 | commitment | core | forced_choice | rewritten | forced_choice_left_to_right | klare Grenzen vs. voller Einsatz |
| cm_core_3 | commitment | core | likert | retained | right_pole_keyed | mehr Zeit und Energie als normaler Job |
| cm_core_4 | commitment | core | scenario | retained | scenario_left_to_right | langsames Wachstum, weiter investieren |
| cm_support_1 | commitment | support | scenario | rewritten | scenario_left_to_right | weitere Projekte / Verpflichtungen |
| cm_support_2 | commitment | support | scenario | rewritten | scenario_left_to_right | mehr Zeit als geplant |
| ro_core_1 | risk_orientation | core | scenario | retained | scenario_left_to_right | drei Monate Runway |
| ro_core_2 | risk_orientation | core | scenario | retained | scenario_left_to_right | persönliches Risiko |
| ro_core_3 | risk_orientation | core | likert | rewritten | right_pole_keyed | Unsicherheit mittragen |
| ro_core_4 | risk_orientation | core | forced_choice | rewritten | forced_choice_left_to_right | Downside begrenzen vs. große Chance |
| ro_support_1 | risk_orientation | support | scenario | rewritten | scenario_left_to_right | Launch trotz Unfertigkeit |
| ro_support_2 | risk_orientation | support | scenario | rewritten | scenario_left_to_right | Wachstumschance mit höherer Belastung |
| cs_core_1 | conflict_style | core | likert | retained | right_pole_keyed | Probleme früh ansprechen |
| cs_core_2 | conflict_style | core | scenario | retained | scenario_left_to_right | Reaktion auf ungewollte Entscheidung |
| cs_core_3 | conflict_style | core | forced_choice | rewritten | forced_choice_left_to_right | erst sortieren vs. direkt ansprechen |
| cs_core_4 | conflict_style | core | scenario | rewritten | scenario_left_to_right | festgefahrene Diskussion weiterführen |
| cs_support_1 | conflict_style | support | scenario | rewritten | scenario_left_to_right | Fehler mit negativen Auswirkungen |
| cs_support_2 | conflict_style | support | scenario | rewritten | scenario_left_to_right | emotionale strategische Diskussion |

---

# C. Implementation Notes

## 9. Risky Dimensions

### Weiterhin am schwächsten

- `company_logic`
  - stärkstes Restrisiko in Richtung Risikoorientierung
  - besonders bei Wachstum, Hebel, Reinvestition und Marktwechsel

- `decision_logic`
  - bleibt empfindlich für Drift in Risiko- oder Tempologik
  - deshalb keine Governance- oder Delegationssprache verwenden

- `risk_orientation`
  - bleibt anfällig für Verwechslung mit Produktphilosophie oder strategischer Wachstumslogik
  - Support-Items besonders diszipliniert nur als Enrichment nutzen

### Vergleichsweise stark

- `work_structure`
- `commitment`
- `conflict_style`

## 10. Wording Risks

### Unternehmenslogik

- vermeiden:
  - `mutig`
  - `vorsichtig`
  - `ernsthaft`
- Grund:
  - würde in Risiko oder Commitment kippen

### Entscheidungslogik

- vermeiden:
  - `schnell`
  - `langsam`
  - `jemand entscheidet am Ende`
- Grund:
  - driftet in Tempo oder Governance

### Arbeitsstruktur

- vermeiden:
  - `Vertrauen`
  - `Kontrolle`
- Grund:
  - driftet in Konfliktstil oder Bindung

### Commitment

- vermeiden:
  - `wirklich committed`
  - `genug Einsatz`
- Grund:
  - moralische Aufladung

### Risikoorientierung

- vermeiden:
  - `groß werden`
  - `skaliert schnell`
- Grund:
  - driftet in Unternehmenslogik

### Konfliktstil

- vermeiden:
  - `empathisch`
  - `hart`
  - `reif`
- Grund:
  - driftet in soziale Kompetenz oder emotionale Reife

## 11. Migration Considerations

### 11.1 Legacy-Fragen nicht 1:1 weiterverwenden

Viele Alt-Items wurden:

- ersetzt
- stark umgeschrieben
- oder aus dem CORE entfernt

Daraus folgt:

- keine naive Score-Kompatibilität zwischen Legacy-48er-Set und Master-v1
- alte Rohwerte sollten nicht einfach in das neue 24er-Core-Modell gespiegelt werden

### 11.2 Empfohlene technische Migration

1. neue Registry mit den finalen `itemId`s anlegen
2. Alt-IDs nur als `legacySourceId` optional dokumentieren
3. neue Assessments nur noch auf Basis dieses Master-Sets ausspielen
4. Legacy-Daten für historische Reports separat kennzeichnen

### 11.3 Antwortnormalisierung

Für die Implementierung gilt:

- Likert und Forced Choice auf `0/25/50/75/100`
- Szenarien auf `0/33/67/100`
- danach auf einheitliche Modellrichtung normieren

### 11.4 Report- und Workbook-Engine

Die Engine muss künftig strikt unterscheiden zwischen:

- `core` = scoring relevant
- `support` = report relevant, nicht scoring relevant

Support-Items dürfen:

- Reporttexte konkretisieren
- Workbook-Foki illustrieren

Support-Items dürfen nicht:

- `overallFit`
- `overallTension`
- Dimension-Scores

verändern.

## 12. Abschlussurteil

Dieses Master Set v1 ist:

- deutlich sauberer als das frühere 48er-Basisset
- ausreichend präzise für Implementierung und qualitative Pretests
- aber noch nicht psychometrisch validiert

Vor finaler Produktivsetzung sollten insbesondere die riskanteren Dimensionen

- `company_logic`
- `decision_logic`
- `risk_orientation`

noch einmal in kognitiven Interviews geprüft werden.

Bis dahin ist dieses Dokument die empfohlene **Single Source of Truth** für:

- Registry
- Datenmodell
- Scoring
- Reporting
- Workbook-Handoff
