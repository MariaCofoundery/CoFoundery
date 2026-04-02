# Founder-Matching-Logik

Stand: 31.03.2026

Diese Dokumentation beschreibt die aktuell aktive Founder-Matching-Logik des Systems in fachlicher Form. Sie basiert auf der laufenden Runtime-Quelle `public.questions` / `public.choices` sowie auf der Scoring- und Reporting-Logik im Code.

Geprüfte Quellen:

- [founderScoring.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/scoring/founderScoring.ts)
- [founderBaseQuestionMeta.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/scoring/founderBaseQuestionMeta.ts)
- [founderBaseNormalization.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/scoring/founderBaseNormalization.ts)
- [founderDimensionMeta.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/founderDimensionMeta.ts)
- [buildExecutiveSummary.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/buildExecutiveSummary.ts)
- [determineTeamArchetype.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/determineTeamArchetype.ts)
- [actions.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/actions.ts)

Wichtiger Audit-Hinweis:
Die aktiven Basis-Fragetexte sind derzeit nicht vollständig in Git versioniert. Für diese Dokumentation wurden sie deshalb zusätzlich direkt aus der aktiven Supabase-Datenquelle gelesen.

## 1. Fragenstruktur

### Standardformate

- `Likert-5`: `0 = trifft überhaupt nicht zu`, `25 = trifft eher nicht zu`, `50 = teils / teils`, `75 = trifft eher zu`, `100 = trifft voll zu`
- `Forced Choice-5`: `0 = A trifft deutlich eher zu`, `25 = A trifft eher zu`, `50 = Beide etwa gleich`, `75 = B trifft eher zu`, `100 = B trifft deutlich eher zu`
- `Szenario-4`: diskrete Werte aus `{0, 33, 67, 100}`. Wichtig: Bei einigen Fragen ist die erste sichtbare Option bereits `100`; entscheidend ist der gespeicherte Wert, nicht die Darstellungsreihenfolge.

### Dimension 1: Unternehmenslogik

#### `q01_vision_l1`

- Fragetext:
  `Mir ist wichtig, dass ich mit einem Co-Founder ein ähnliches Bild davon teile, wohin sich das Unternehmen langfristig entwickeln soll.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Bedeutung gemeinsamer langfristiger Richtung

#### `q07_vision_fc1`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Mir ist wichtig, ein Unternehmen aufzubauen, das langfristig stabil und gesund wachsen kann.`
  `B: Mir ist wichtig, ein Unternehmen aufzubauen, das schnell skaliert und groß wird.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  Substanz-/Aufbauorientierung vs. starke Skalierungsorientierung

#### `q13_vision_s1`

- Fragetext:
  `Ein Investor bietet euch 5 Mio. Euro an. Die Bedingung: Ihr müsst in einen Markt wechseln, den du ethisch schwierig findest. Wie würdest du am ehesten reagieren?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde das ablehnen. Für mich gibt es klare Grenzen, auch wenn das Wachstum kostet.
  - `33`: Ich würde sehr genau prüfen, ob es einen Weg gibt, das Investment anzunehmen, ohne unsere Grundwerte zu verraten.
  - `67`: Ich wäre offen dafür, wenn die Marktchance groß genug ist und wir intern klare Leitplanken setzen.
  - `100`: Ich würde das annehmen. Wenn wir groß werden wollen, müssen wir auch harte Entscheidungen treffen.
- Konzept:
  Integritätsgrenze vs. harte Wachstumspriorisierung

#### `q19_vision_l2`

- Fragetext:
  `Wenn sich im Markt eine deutlich bessere Chance ergibt, bin ich offen dafür, unsere ursprüngliche Idee weiterzuentwickeln.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Pivot-Offenheit

#### `q25_vision_fc2`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Wenn wir einmal eine klare Richtung festgelegt haben, sollten wir ihr auch treu bleiben.`
  `B: Wenn sich neue Chancen zeigen, sollte sich auch unsere Richtung weiterentwickeln dürfen.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  Richtungsstabilität vs. Anpassungsbereitschaft

#### `q31_vision_s2`

- Fragetext:
  `Nach zwei Jahren kommt ein attraktives Übernahmeangebot. Finanziell wäre das für dich sehr spannend, aber die Marke würde verschwinden. Was wäre deine erste Tendenz?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde eher ablehnen. Wenn die Marke und Idee verschwinden, wäre mir der Preis wahrscheinlich nicht genug.
  - `33`: Ich würde nur weiterreden, wenn wichtige Teile der Identität erhalten bleiben.
  - `67`: Ich würde sehr ernsthaft prüfen, ob der Deal uns strategisch und finanziell nach vorn bringt.
  - `100`: Ich wäre klar offen dafür. Wenn das Angebot stark ist, gehört ein Exit für mich zum Spiel.
- Konzept:
  Identitäts-/Markenschutz vs. Exit-/Marktlogik

#### `q37_vision_s3`

- Fragetext:
  `Ihr habt ein stabiles Geschäftsmodell gefunden. Jetzt zeigt sich ein anderer Markt, in dem deutlich schnelleres Wachstum möglich wäre – aber nur mit einem klaren Richtungswechsel. Wie gehst du damit um?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde eher bei der bisherigen Richtung bleiben. Ein stabiles Modell gebe ich nicht leichtfertig auf.
  - `33`: Ich würde den neuen Markt sehr sorgfältig analysieren, bevor ich irgendetwas verändere.
  - `67`: Ich würde offen prüfen, ob ein Wechsel sinnvoll ist, wenn er langfristig mehr Potenzial hat.
  - `100`: Ich würde zügig in die neue Richtung gehen. Solche Chancen sollte man nicht liegen lassen.
- Konzept:
  Stabilität vs. opportunistische Marktanpassung

#### `q43_vision_s4`

- Fragetext:
  `Das Unternehmen macht zum ersten Mal spürbar Gewinn. Was wäre dir in so einer Phase am wichtigsten?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Erst einmal Stabilität aufbauen: Rücklagen, Ruhe und ein gesundes Fundament.
  - `33`: Einen Teil absichern und einen Teil gezielt in Produkt und Struktur reinvestieren.
  - `67`: Die Gewinne vor allem nutzen, um Vertrieb, Marketing oder Wachstum deutlich zu beschleunigen.
  - `100`: So viel wie möglich wieder ins Wachstum stecken, um jetzt richtig Tempo aufzunehmen.
- Konzept:
  Absicherung/Substanz vs. aggressive Wachstumsreinvestition

### Dimension 2: Arbeitsstruktur & Zusammenarbeit

#### `q02_collaboration_l1`

- Fragetext:
  `Ich finde es wichtig, dass mein Co-Founder regelmäßig Einblick in meine wichtigsten Entscheidungen und Fortschritte hat.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe gewünschte Sichtbarkeit/Abstimmung

#### `q08_collaboration_fc1`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Ich arbeite am liebsten eigenständig und übernehme Verantwortung für meinen Bereich.`
  `B: Ich arbeite am liebsten eng abgestimmt mit meinem Co-Founder.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  Autonomie vs. enge Kopplung

#### `q14_collaboration_s1`

- Fragetext:
  `Du arbeitest intensiv an einem neuen Feature und triffst einige operative Entscheidungen. Wann würdest du deinen Co-Founder typischerweise einbeziehen?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde wichtige Schritte vorher gemeinsam abstimmen.
  - `33`: Ich würde regelmäßig kurze Updates geben und Feedback einholen.
  - `67`: Ich würde ihn oder sie informieren, sobald ein konkretes Ergebnis steht.
  - `100`: Ich würde das eigenständig entscheiden, solange es meinen Verantwortungsbereich betrifft.
- Konzept:
  frühe Abstimmung vs. operative Eigenständigkeit

#### `q20_collaboration_l2`

- Fragetext:
  `Wenn jeder im Gründerteam seinen eigenen Verantwortungsbereich hat, arbeitet das Team meist effizienter.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  Skepsis bis Präferenz für klare Bereichsautonomie

#### `q26_collaboration_fc2`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Klare Rollen und Verantwortungsbereiche im Gründerteam sind mir sehr wichtig.`
  `B: Ich finde es besser, wenn Rollen flexibel bleiben und sich im Alltag entwickeln.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  feste Zuständigkeiten vs. rollendynamische Zusammenarbeit

#### `q32_collaboration_s2`

- Fragetext:
  `Euer Arbeitsalltag entwickelt sich unterschiedlich: Du arbeitest früh morgens sehr fokussiert, dein Co-Founder eher spät abends. Wie würdest du damit umgehen?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde versuchen, die Arbeitszeiten stärker zu synchronisieren.
  - `33`: Ich würde einen festen täglichen Zeitraum für gemeinsamen Austausch definieren.
  - `67`: Mir reicht es, wenn wir uns regelmäßig kurz abstimmen.
  - `100`: Die Zeiten sind mir egal – Hauptsache, die Ergebnisse stimmen.
- Konzept:
  Synchronität vs. asynchrone Ergebnisorientierung

#### `q38_collaboration_s3`

- Fragetext:
  `Ihr merkt, dass ihr beide immer wieder an denselben Themen arbeitet und sich Zuständigkeiten überschneiden. Wie reagierst du?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde klare Rollen und Verantwortlichkeiten definieren.
  - `33`: Ich würde regelmäßige Abstimmungen einführen, um besser zu koordinieren.
  - `67`: Ich würde versuchen, das flexibel im Alltag zu klären.
  - `100`: Ich sehe darin kein großes Problem – solche Überschneidungen gehören dazu.
- Konzept:
  Strukturierung vs. tolerierte Überlappung

#### `q44_collaboration_s4`

- Fragetext:
  `Ein Co-Founder arbeitet sehr autonom und informiert dich erst spät über wichtige Entscheidungen. Wie fühlst du dich damit?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Das würde mich stören – ich möchte früh eingebunden sein.
  - `33`: Ich würde mir zumindest regelmäßige Updates wünschen.
  - `67`: Solange ich das große Ganze kenne, ist das für mich okay.
  - `100`: Das finde ich völlig in Ordnung – jeder sollte in seinem Bereich frei arbeiten.
- Konzept:
  frühe Einbindung vs. hohe Freiheitsakzeptanz

### Dimension 3: Entscheidungslogik

#### `q03_decision_l1`

- Fragetext:
  `Wenn eine Entscheidung dringend ist, kann ich auch mit unvollständigen Informationen gut arbeiten.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Entscheidungssicherheit unter Unsicherheit

#### `q09_decision_fc1`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Ich treffe Entscheidungen lieber zügig und lerne aus dem, was danach passiert.`
  `B: Ich treffe Entscheidungen lieber erst, wenn ich genug Informationen gesammelt habe.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  schnelle Probehandlung vs. Informationsabsicherung

#### `q15_decision_s1`

- Fragetext:
  `Nach einer Woche merkt ihr, dass eine eingeschlagene Richtung wahrscheinlich nicht funktioniert. Wie reagierst du am ehesten?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde erst einmal genau verstehen wollen, warum es nicht funktioniert hat, bevor wir etwas ändern.
  - `33`: Ich würde die Richtung kontrolliert anpassen und dabei schauen, was wir aus dem Fehler mitnehmen.
  - `67`: Ich würde relativ zügig auf eine bessere Alternative umschwenken.
  - `100`: Ich würde keine große Zeit verlieren und direkt etwas Neues ausprobieren.
- Konzept:
  Analyse/Reflexion vs. schnelles Iterieren

#### `q21_decision_l2`

- Fragetext:
  `Bei strategischen Entscheidungen verlasse ich mich stark auf Daten, Analysen und überprüfbare Argumente.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Daten-/Analyseorientierung

#### `q27_decision_fc2`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Wichtige Entscheidungen brauchen klare Verantwortung – am Ende sollte jemand den Hut aufhaben.`
  `B: Wichtige Entscheidungen sollten möglichst gemeinsam im Gründerteam getragen werden.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  klare Einzelverantwortung vs. kollektive Entscheidung

#### `q33_decision_s2`

- Fragetext:
  `Dein Bauchgefühl sagt dir bei einer Entscheidung ganz klar „nein“, aber die Daten sprechen eher dafür. Was tust du?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich folge in so einem Fall eher den Daten – wenn die Fakten dafür sprechen, sollte man sich nicht vom Gefühl blockieren lassen.
  - `33`: Ich hole mir noch eine weitere Perspektive dazu, bevor ich entscheide.
  - `67`: Ich nehme mein Bauchgefühl ernst und würde die Entscheidung erst einmal bremsen.
  - `100`: Wenn es sich falsch anfühlt, würde ich es lassen – selbst wenn die Zahlen auf dem Papier gut aussehen.
- Konzept:
  Datenprimat vs. intuitive Stopplogik

#### `q39_decision_s3`

- Fragetext:
  `Eine strategische Entscheidung steht an, aber es gibt keine Zeit für lange Diskussionen. Wie würdest du am liebsten vorgehen?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde die Entscheidung lieber kurz vertagen, damit wir sie fundiert treffen können.
  - `33`: Ich würde die wichtigsten Fakten zusammentragen und dann gemeinsam eine zügige Entscheidung treffen.
  - `67`: Ich würde wollen, dass die Person entscheidet, die in dem Bereich die meiste Verantwortung trägt.
  - `100`: Ich würde schnell entscheiden und bei Bedarf später nachjustieren.
- Konzept:
  Sorgfalt/Kollektivität vs. Tempo/Delegation

#### `q45_decision_s4`

- Fragetext:
  `Ihr seid euch im Gründerteam bei einer wichtigen Produktfrage uneinig. Wie sollte so eine Situation idealerweise gelöst werden?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Wir diskutieren so lange, bis wir eine Lösung finden, die für alle wirklich tragbar ist.
  - `33`: Wir wägen die Argumente ab und suchen einen pragmatischen Kompromiss.
  - `67`: Am Ende sollte die Person entscheiden, die fachlich am tiefsten im Thema steckt.
  - `100`: Wir testen die Optionen möglichst schnell im Markt und lassen das Ergebnis sprechen.
- Konzept:
  Konsens/Abwägung vs. Expertentum/experimentelle Marktentscheidung

### Dimension 4: Risikoorientierung

#### `q04_risk_l1`

- Fragetext:
  `Unsicherheit gehört für mich ganz selbstverständlich zum Alltag beim Aufbau eines Startups.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Normalisierung von Unsicherheit

#### `q10_risk_fc1`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Ich gehe lieber kalkulierte Risiken ein, wenn sich dadurch eine große Chance eröffnet.`
  `B: Ich versuche Risiken möglichst zu begrenzen, auch wenn Wachstum dadurch langsamer passiert.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  Chancenorientierung vs. Sicherheitsorientierung

#### `q16_risk_s1`

- Fragetext:
  `Der Runway eures Startups reicht noch etwa drei Monate. Ihr müsst entscheiden, wie ihr jetzt vorgeht. Was entspricht am ehesten deiner Haltung?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde zuerst alle Kosten radikal senken, um möglichst viel Zeit zu gewinnen.
  - `33`: Ich würde parallel Kosten kontrollieren und aktiv nach neuen Einnahmequellen suchen.
  - `67`: Ich würde das Budget gezielt in Maßnahmen stecken, die schnell Umsatz bringen können.
  - `100`: Ich würde bewusst stärker investieren, um mit einem großen Schritt aus der Situation herauszuwachsen.
- Konzept:
  Absicherung vs. offensives Wagnis

#### `q22_risk_l2`

- Fragetext:
  `Ich fühle mich wohl dabei, Entscheidungen zu treffen, auch wenn nicht alle Risiken vollständig absehbar sind.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Ambiguitätstoleranz

#### `q28_risk_fc2`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Ich teste neue Ideen lieber früh im Markt, auch wenn noch nicht alles perfekt ist.`
  `B: Ich bringe neue Ideen lieber erst nach außen, wenn sie wirklich ausgereift sind.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  frühes Experimentieren vs. Qualitäts-/Risikokontrolle

#### `q34_risk_s2`

- Fragetext:
  `Ihr steht kurz vor dem Launch eines neuen Produkts, aber einige Funktionen sind noch nicht perfekt. Wie gehst du damit um?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde lieber warten, bis das Produkt wirklich stabil und ausgereift ist.
  - `33`: Ich würde launchen, sobald die wichtigsten Funktionen zuverlässig funktionieren.
  - `67`: Ich würde früh launchen und Feedback der ersten Nutzer nutzen, um schnell nachzubessern.
  - `100`: Ich würde so früh wie möglich rausgehen – der Markt zeigt uns schneller als jede Analyse, was funktioniert.
- Konzept:
  Vorsicht/Reifegrad vs. Marktlernen unter Risiko

#### `q40_risk_s3`

- Fragetext:
  `Für das Wachstum eures Startups stehen verschiedene Finanzierungswege im Raum. Welche Strategie entspricht am ehesten deiner Haltung?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde möglichst unabhängig bleiben und Wachstum primär aus eigenen Einnahmen finanzieren.
  - `33`: Ich wäre offen für kleinere Investments oder strategische Partner.
  - `67`: Ich würde gezielt Kapital aufnehmen, um schneller Marktanteile zu gewinnen.
  - `100`: Ich würde klar auf schnelles Wachstum mit großem Venture-Capital setzen.
- Konzept:
  Unabhängigkeit vs. kapitalgestütztes Wagnis

#### `q46_risk_s4`

- Fragetext:
  `Beim Aufbau des Unternehmens stellt sich die Frage nach persönlichem Risiko. Welche Haltung passt am ehesten zu dir?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Mir ist wichtig, ein gewisses Maß an finanzieller Sicherheit zu behalten.
  - `33`: Ich bin bereit, kalkulierte Risiken einzugehen, solange ein realistischer Rückweg bleibt.
  - `67`: Ich gehe bewusst größere Risiken ein, wenn ich an das Potenzial der Idee glaube.
  - `100`: Ich bin bereit, sehr viel zu riskieren – große Chancen entstehen selten ohne großes Wagnis.
- Konzept:
  Sicherheitsbedürfnis vs. hohes persönliches Wagnis

### Dimension 5: Commitment

#### `q05_commitment_l1`

- Fragetext:
  `Der Aufbau eines Startups hat für mich aktuell eine sehr hohe Priorität in meinem Leben.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Lebenspriorität des Startups

#### `q11_commitment_fc1`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Der Aufbau eines Startups erfordert oft vollen Einsatz über längere Zeit.`
  `B: Auch beim Aufbau eines Startups sollten klare Grenzen für Arbeitszeit und Belastung gelten.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  hohe Einsatznorm vs. klare Belastungsgrenzen

#### `q17_commitment_s1`

- Fragetext:
  `Du merkst nach einigen Monaten, dass dein Co-Founder nebenbei noch ein weiteres Projekt verfolgt. Wie würdest du damit umgehen?`
- Format: Szenario-4
- Antwortoptionen:
  - `100`: Das würde mich stören – ich erwarte, dass das Startup klar Priorität hat.
  - `67`: Ich würde darüber sprechen und gemeinsam klare Erwartungen festlegen.
  - `33`: Solange die Ergebnisse stimmen, sehe ich darin kein großes Problem.
  - `0`: Ich finde es grundsätzlich in Ordnung, wenn Gründer mehrere Dinge parallel verfolgen.
- Konzept:
  hohe Priorisierungserwartung vs. Akzeptanz geteilter Aufmerksamkeit

#### `q23_commitment_l2`

- Fragetext:
  `Ich bin bereit, in intensiven Phasen deutlich mehr Zeit und Energie in das Unternehmen zu investieren als in einen normalen Job.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe Mehrinvestitionsbereitschaft

#### `q29_commitment_fc2`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Mir ist wichtig, dass Gründer im Team ähnlich viel Einsatz und Energie investieren.`
  `B: Auch mit unterschiedlichen Arbeitsstilen kann ein Gründerteam gut funktionieren.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  Symmetrieerwartung vs. Toleranz asymmetrischer Einsatzmuster

#### `q35_commitment_s2`

- Fragetext:
  `Der Aufbau des Startups fordert deutlich mehr Zeit als ursprünglich geplant. Wie reagierst du?`
- Format: Szenario-4
- Antwortoptionen:
  - `100`: Ich würde versuchen, meine Arbeitszeit zu erhöhen, um das Unternehmen voranzubringen.
  - `67`: Ich würde meine Prioritäten neu ordnen, um mehr Raum für das Startup zu schaffen.
  - `33`: Ich würde im Gründerteam besprechen, wie wir die Belastung besser verteilen können.
  - `0`: Ich würde versuchen, meine ursprünglichen Grenzen beizubehalten.
- Konzept:
  Eskalation des Einsatzes vs. Schutz bestehender Grenzen

#### `q41_commitment_s3`

- Fragetext:
  `Das Unternehmen wächst langsam, und ihr müsst entscheiden, wie viel persönliche Energie ihr weiter investieren wollt. Wie denkst du darüber?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde eher stabil arbeiten und darauf achten, dass mein Leben insgesamt im Gleichgewicht bleibt.
  - `33`: Ich würde weiter engagiert arbeiten, aber auch auf meine Belastungsgrenzen achten.
  - `67`: Ich wäre bereit, noch mehr Energie zu investieren, wenn wir dadurch schneller vorankommen.
  - `100`: Wenn ich an das Unternehmen glaube, bin ich bereit, über längere Zeit sehr viel dafür zu geben.
- Konzept:
  Balance vs. hochfokussiertes Durchziehen

#### `q47_commitment_s4`

- Fragetext:
  `In einer intensiven Phase des Unternehmens arbeitest du mehrere Wochen sehr viel. Wie gehst du mit solchen Belastungsphasen um?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich achte darauf, rechtzeitig Pausen einzubauen, um langfristig leistungsfähig zu bleiben.
  - `33`: Ich kann solche Phasen gut aushalten, brauche danach aber bewusst Ausgleich.
  - `67`: In solchen Phasen ziehe ich durch und konzentriere mich voll auf das Unternehmen.
  - `100`: Wenn es nötig ist, arbeite ich so lange und intensiv, bis das Problem gelöst ist.
- Konzept:
  Belastungsgrenzen vs. extreme Intensitätsbereitschaft

### Dimension 6: Konfliktstil

#### `q06_conflict_l1`

- Fragetext:
  `Ich spreche Probleme im Team in der Regel an, sobald ich merke, dass etwas nicht gut läuft.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe frühe Konfliktansprache

#### `q12_conflict_fc1`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Wenn mir jemand widerspricht, versuche ich zuerst zu verstehen, wie die andere Person darauf schaut.`
  `B: Wenn mir jemand widerspricht, erkläre ich zuerst, warum ich meine Sicht weiterhin für richtig halte.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  verstehend-reflektierender Einstieg vs. verteidigend-direkter Einstieg

#### `q18_conflict_s1`

- Fragetext:
  `Ein Co-Founder trifft eine Entscheidung, mit der du nicht einverstanden bist. Wie würdest du typischerweise reagieren?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde das zunächst für mich reflektieren und den richtigen Moment für ein Gespräch suchen.
  - `33`: Ich würde das Thema bei der nächsten passenden Gelegenheit ansprechen.
  - `67`: Ich würde relativ zeitnah das Gespräch suchen und meine Sicht schildern.
  - `100`: Ich würde das direkt ansprechen, sobald ich merke, dass etwas nicht passt.
- Konzept:
  zurückhaltende Verarbeitung vs. unmittelbare Konfrontation

#### `q24_conflict_l2`

- Fragetext:
  `Auch wenn Diskussionen manchmal unbequem sind, können offene Konflikte für ein Team sehr produktiv sein.`
- Format: Likert-5
- Antwortoptionen:
  - `0`: trifft überhaupt nicht zu
  - `25`: trifft eher nicht zu
  - `50`: teils / teils
  - `75`: trifft eher zu
  - `100`: trifft voll zu
- Konzept:
  geringe bis hohe positive Sicht auf offene Reibung

#### `q30_conflict_fc2`

- Fragetext:
  `Welche Aussage passt eher zu dir?`
  `A: Direktes Feedback hilft Teams, schneller besser zu werden.`
  `B: Diplomatisches Feedback hilft, gute Beziehungen im Team zu erhalten.`
- Format: Forced Choice-5
- Antwortoptionen:
  - `0`: A trifft deutlich eher zu
  - `25`: A trifft eher zu
  - `50`: Beide etwa gleich
  - `75`: B trifft eher zu
  - `100`: B trifft deutlich eher zu
- Konzept:
  direkte Klarheit vs. diplomatische Beziehungspflege

#### `q36_conflict_s2`

- Fragetext:
  `In einer Diskussion im Gründerteam entsteht eine klare Pattsituation – ihr seid euch einfach nicht einig. Wie sollte so etwas idealerweise gelöst werden?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Wir diskutieren weiter, bis wir eine Lösung finden, mit der alle wirklich zufrieden sind.
  - `33`: Wir suchen einen Kompromiss, mit dem beide Seiten leben können.
  - `67`: Am Ende sollte die Person entscheiden, die fachlich näher am Thema ist.
  - `100`: Die stärksten Argumente sollten entscheiden – auch wenn jemand damit nicht glücklich ist.
- Konzept:
  Konsensorientierung vs. konfrontativere Entscheidungsschärfe

#### `q42_conflict_s3`

- Fragetext:
  `Ein Fehler im Unternehmen hat negative Auswirkungen. Wie würdest du damit umgehen?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Ich würde versuchen, das Thema vorsichtig anzusprechen, damit niemand unnötig demotiviert wird.
  - `33`: Ich würde den Fehler gemeinsam analysieren und schauen, was wir daraus lernen können.
  - `67`: Ich würde klar benennen, was passiert ist und wie wir es künftig besser machen.
  - `100`: Ich halte eine sehr direkte Analyse für wichtig – Fehler müssen klar angesprochen werden.
- Konzept:
  Schonung/Beziehungswahrung vs. harte Klarheit

#### `q48_conflict_s4`

- Fragetext:
  `Im Gründerteam entsteht eine emotionalere Diskussion über eine strategische Frage. Wie fühlst du dich in solchen Situationen normalerweise?`
- Format: Szenario-4
- Antwortoptionen:
  - `0`: Starke Spannungen belasten mich – ich versuche eher, wieder Ruhe in die Situation zu bringen.
  - `33`: Ich versuche, die Diskussion respektvoll und konstruktiv zu halten.
  - `67`: Ich empfinde sachliche Reibung oft als hilfreich, um zu besseren Lösungen zu kommen.
  - `100`: Auch sehr direkte oder konfrontative Diskussionen sind für mich kein Problem.
- Konzept:
  konfliktvermeidende Stabilisierung vs. hohe Konfrontationstoleranz

## 2. Dimensionen

### Unternehmenslogik

- Niedrig:
  eher strategisch / verwertungsorientiert
- Hoch:
  eher substanzorientiert / aufbauend
- Beschreibung:
  Diese Dimension beschreibt, woran unternehmerische Entscheidungen ausgerichtet werden: eher an Marktlogik, Skalierbarkeit und strategischer Wirkung oder eher an Substanz, Aufbau und langfristiger Tragfähigkeit.
- Warum wichtig:
  Große Unterschiede erzeugen leicht Richtungsstreit und unterschiedliche Priorisierungslogiken.

### Entscheidungslogik

- Niedrig:
  eher analytisch
- Hoch:
  eher intuitiv
- Beschreibung:
  Diese Dimension beschreibt, ob Entscheidungen eher über Analyse und Absicherung oder stärker über Urteil, Gespür und direkte Einordnung getroffen werden.
- Warum wichtig:
  Sie prägt Tempo, Begründungstiefe und Entscheidungsrechte im Alltag.

### Risikoorientierung

- Niedrig:
  eher sicherheitsorientiert
- Hoch:
  eher chancenorientiert
- Beschreibung:
  Diese Dimension beschreibt, wie Risiko, Unsicherheit und Wagnis eher vorsichtig abgesichert oder stärker chancenorientiert eingeordnet werden.
- Warum wichtig:
  Sie beeinflusst Tempo, Experimentierfreude, Finanzierung und Komfort mit Unsicherheit.

### Arbeitsstruktur & Zusammenarbeit

- Niedrig:
  eher autonom / eigenständig
- Hoch:
  eher eng abgestimmt / sichtbar verbunden
- Beschreibung:
  Diese Dimension beschreibt, wie eng jemand im Alltag mit anderen arbeiten, abstimmen und sichtbar verbunden bleiben will.
- Warum wichtig:
  Diese Achse greift direkt in Sichtbarkeit, Übergaben, Kontrollbedürfnis und Eigenraum ein.

### Commitment

- Niedrig:
  eher integriert / begrenzt
- Hoch:
  eher priorisiert / hochfokussiert
- Beschreibung:
  Diese Dimension beschreibt, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau eine Person für sich und das Team erwartet.
- Warum wichtig:
  Unterschiede hier werden schnell sozial gelesen: Ernsthaftigkeit, Fairness, Verfügbarkeit, Einsatzniveau.

### Konfliktstil

- Niedrig:
  eher reflektierend
- Hoch:
  eher direkt
- Beschreibung:
  Diese Dimension beschreibt, wie Spannungen, Feedback und Meinungsverschiedenheiten eher mit Abstand und Reflexion oder unmittelbarer und direkter bearbeitet werden.
- Warum wichtig:
  Diese Achse prägt Timing, Ton und Eskalationsrisiko von Spannungen.

## 3. Scoring-Logik

### 3.1 Antwort zu Score

- Alle Antworten werden auf eine gemeinsame `0–100`-Skala normalisiert.
- Das System ist rückwärtskompatibel:
  - alte `1–4`-Werte werden auf `0/33/67/100` umgerechnet
  - alte `1–6`-Werte werden linear auf `0–100` umgerechnet
  - aktuelle Basisfragen speichern bereits diskrete Werte in `0/25/50/75/100` oder `0/33/67/100`
- Danach wird pro Frage eine Polarität angewendet:
  - `high_is_right_pole`: Wert bleibt wie gespeichert
  - `high_is_left_pole`: Wert wird gespiegelt (`100 - Wert`)
- Zweck:
  Alle Fragen einer Dimension zeigen nach der Normalisierung auf dieselbe Achse.

### 3.2 Score pro Person und Dimension

- Für jede Person werden alle normalisierten Fragen einer Dimension gemittelt.
- Ergebnis:
  `scoreA` und `scoreB` je Dimension, jeweils auf `0–100`.

### 3.3 Vergleich zweier Personen

- `distance = |scoreA - scoreB|`
- `alignment = 100 - distance`
- Zusätzlich wird nicht nur der Mittelwert verglichen, sondern auch das Antwortmuster:
  - `itemDistance = Mittelwert der absoluten Differenzen auf geteilten Einzelfragen`
  - `oppositionCount = Anzahl Fragen mit sehr großem Abstand (>= 50)`
  - `hiddenDifferenceScore = max(0, itemDistance - meanDistance)`

### 3.4 Versteckte Unterschiede

Das System erkennt ausdrücklich Fälle, in denen zwei Personen im Durchschnitt ähnlich wirken, aber auf Einzelfragen sehr unterschiedlich antworten.

`hasHiddenDifferences = true`, wenn:

- `meanDistance <= 15`
- und zugleich `itemDistance >= 30` oder `oppositionCount >= 2`

Dann wird:

- `teamFit` abgesenkt
- `tensionScore` angehoben

Verwendete Mischungen:

- `blendTeamFit = baseTeamFit * 0.65 + itemAlignment * 0.35`
- `blendTensionScore = max(baseTension, baseTension * 0.55 + itemDistance * 0.45)`

### 3.5 Sind Unterschiede immer negativ?

Nein. Das Modell ist bewusst dimensionsspezifisch:

- `Entscheidungslogik`
  moderate Differenz (`10–20`) wird als potenziell produktive Ergänzung gelesen
- `Risikoorientierung`
  moderate Differenz (`10–25`) wird explizit als starke Ergänzung behandelt
- `Arbeitsstruktur & Zusammenarbeit`
  moderate Differenz (`8–18` bzw. `10–20`) kann komplementär sein
- `Unternehmenslogik`, `Commitment`, `Konfliktstil`
  Unterschiede werden hier deutlich kritischer gelesen als bloße Ergänzung

## 4. Gewichtung

Die Kern-Matching-Engine arbeitet mit festen Gewichten. Sie ändern sich nicht nach Teamkontext.

- `Unternehmenslogik`: `22`
- `Commitment`: `20`
- `Entscheidungslogik`: `16`
- `Arbeitsstruktur & Zusammenarbeit`: `16`
- `Risikoorientierung`: `14`
- `Konfliktstil`: `12`

Summe: `100`

Wichtig:

- `teamContext` (`pre_founder` vs. `existing_team`) ändert nur Narrative und Fokustexte.
- Die Gewichte selbst bleiben gleich.

### Ergänzende Werte-Logik

Zusätzlich gibt es ein separates Werte-Modul (`wv2_1` bis `wv2_12`).

- Es erzeugt drei Werte-Archetypen:
  - `impact_idealist`
  - `verantwortungs_stratege`
  - `business_pragmatiker`
- Es berechnet einen separaten Kontinuumswert und optional `valuesAlignmentPercent`.
- Dieses Werte-Modul fließt aktuell **nicht** in `overallFit` oder `conflictRiskIndex` der Founder-Matching-Engine ein.

## 5. Matching-Output

### 5.1 Dimensionsebene

Für jede der 6 Dimensionen erzeugt das System:

- `scoreA`, `scoreB`
- `distance`
- `alignment`
- `teamFit`
- `tensionScore`
- `fitCategory`
- `tensionCategory`
- `patternCategory`
- textliche Hinweise zu:
  - Stärken
  - komplementären Dynamiken
  - Spannungsfeldern

### 5.2 Kategorien auf Dimensionsebene

`fitCategory`

- `very_high`: `>= 85`
- `high`: `>= 70`
- `mixed`: `>= 50`
- `low`: `< 50`

`tensionCategory`

- `low`: `<= 25`
- `moderate`: `<= 55`
- `elevated`: `> 55`

`patternCategory`

- `hidden_difference`, wenn versteckte Unterschiede erkannt werden
- `clear_difference`, wenn `meanDistance > 35` oder `itemDistance >= 45`
- `moderate_difference`, wenn `meanDistance > 15` oder `itemDistance >= 25`
- sonst `aligned`

### 5.3 Gesamtscore

Der finale Passungswert ist kein simpler Durchschnitt der Rohdistanzen.

- `overallFit = gewichteter Mittelwert aller gültigen teamFit-Werte`
- `conflictRiskIndex = gewichteter Mittelwert aller gültigen tensionScore-Werte`

Wenn für eine Dimension keine belastbaren Daten vorliegen, fällt sie aus dem gewichteten Mittel heraus.

### 5.4 Mindestdaten

Eine Dimension wird nur gewertet, wenn **beide** Personen dort mindestens `2` scorable Antworten haben.

### 5.5 Gesamtkategorien / Headlines

Im Report wird daraus keine einzelne Ampelfarbe gebaut, sondern eine Kombination aus Scores und Textkategorie:

- `overallFit >= 85` und `conflictRiskIndex <= 25`
  - „Hohe Passung mit stabiler gemeinsamer Basis“
- `overallFit >= 70` und `conflictRiskIndex <= 55`
  - „Gute Grundlage mit einzelnen Klärungsthemen“
- `overallFit >= 50`
  - „Erkennbare Unterschiede mit bewusstem Gesprächsbedarf“
- sonst
  - „Unterschiedliche Arbeitslogiken mit hohem Abstimmungsbedarf“

### 5.6 Team-Archetypen

Zusätzlich klassifiziert das System das Duo in einen von 8 Archetypen:

- `Strategic Alliance`
- `Complementary Strategists`
- `Builder Partnership`
- `Explorer Dynamic`
- `Structured Architects`
- `Productive Tension`
- `Adaptive Alliance`
- `Clarification-Oriented Partnership`

Beispiele für Trigger:

- `Strategic Alliance`
  - Vision, Risiko und Entscheidung alle sehr ähnlich
  - `overallFit >= 80`
  - `conflictRiskIndex <= 35`
  - keine `hidden differences`
- `Productive Tension`
  - Vision maximal moderat verschieden
  - Risiko und Entscheidung klar oder stark verschieden
  - `overallFit >= 50`
- `Builder Partnership`
  - hohe Passung in Commitment und Arbeitsstruktur
  - Arbeitsstruktur sehr ähnlich
- Fallback bei viel Spannung oder Datenmangel:
  - `Clarification-Oriented Partnership`

## 6. Edge Cases

### Fehlende Antworten

- Eine Dimension wird `insufficient_data`, wenn eine Person dort weniger als `2` Antworten hat.
- `overallFit` und `conflictRiskIndex` werden trotzdem berechnet, solange noch genug andere Dimensionen gültig sind.
- Wenn alles fehlt:
  keine belastbare Gesamteinschätzung.

### Extreme Unterschiede

- Große Differenzen erhöhen `tensionScore` stark.
- Besonders streng ist `Konfliktstil`:
  - wenn eine Person > `75` und die andere < `25` liegt, wird mindestens `high` Konfliktrisiko angenommen
  - `tensionScore` wird dabei mindestens auf `56` angehoben

### Identische Profile

- Dann ist `distance = 0`, `alignment = 100`
- `teamFit` wird in der Regel sehr hoch
- `conflictRiskIndex` bleibt niedrig
- Ausnahme:
  identische Mittelwerte mit sehr ungleichen Einzelmustern können trotzdem `hidden_difference` auslösen

### Widersprüchliche Antworten

- Genau dafür gibt es `hidden_difference`
- Das Modell erkennt:
  „im Durchschnitt ähnlich, im Detail aber anders verdrahtet“

### Unterschiedliche Antwortskalen aus Altbestand

- Werden vor dem Scoring vereinheitlicht
- Das verhindert, dass ältere Assessments das Matching verfälschen

## 7. Grenzen des Modells

Das System misst strukturiert, aber nicht vollständig.

Es erfasst **nicht** zuverlässig:

- persönliche Reife
- Vertrauen
- Ehrlichkeit beim Antworten
- tatsächliche Kommunikationsqualität im Alltag
- Skill-Fit / Kompetenzkomplementarität
- Machtverhältnisse
- finanzielle Zwänge außerhalb des Fragebogens
- Beziehungsgeschichte
- psychische Belastung oder Resilienz
- Branchen- und Produktkontext im Detail

Weitere Grenzen:

- Das Modell ist heuristisch und regelbasiert, nicht empirisch kalibriert.
- Die Schwellenwerte sind fachlich gesetzt, nicht aus großen Teamdaten gelernt.
- Einige Unterschiede werden bewusst „freundlich“ gelesen:
  - besonders in `Entscheidungslogik` und `Risikoorientierung`
- Andere Unterschiede werden eher streng behandelt:
  - besonders in `Commitment`, `Arbeitsstruktur & Zusammenarbeit`, `Konfliktstil`
- Die aktiven Basis-Fragetexte sind derzeit nicht vollständig im Repo versioniert. Für Auditierbarkeit wäre ein vollständiger Git-Seed der 48 Basisfragen sinnvoll.

## Kurzfazit

Die aktuelle Matching-Logik ist intern konsistent und gut auditierbar:

- Sie misst 6 klar definierte Dimensionen.
- Sie harmonisiert gemischte Fragetypen auf eine gemeinsame Skala.
- Sie bewertet Unterschiede nicht pauschal negativ.
- Sie erkennt versteckte Unterschiede jenseits bloßer Mittelwerte.
- Sie gewichtet alltagsnahe Zusammenarbeitsthemen etwas stärker als reine Stilfragen.

Fachlich plausibel wirkt besonders:

- die hohe Relevanz von `Commitment`, `Unternehmenslogik` und `Arbeitsstruktur`
- die Sonderbehandlung von `hidden differences`
- die Trennung von `overallFit` und `conflictRiskIndex`

Vorsicht ist vor allem hier geboten:

- Die Logik bleibt heuristisch.
- Das Werte-Modul ist derzeit nur ergänzend, nicht im Kernfit integriert.
- Ein guter Score ersetzt keine echte gemeinsame Klärung.
