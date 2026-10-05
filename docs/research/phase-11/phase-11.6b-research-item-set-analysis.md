# Phase 11.6B – Audit der Forschungsitems und zwei Entwicklungssets mit je 8 Fragen

Stand: 05.10.2026. Reine Analyse: **keine Implementierung, keine Migration, keine Item-, Consent- oder Reportänderung.** Alle Bewertungen sind inhaltlich-theoretische **Hypothesen**. Empirische Daten in ausreichender Menge gibt es noch nicht. Nichts hier behauptet, dass ein Item „besser“, „valider“ oder „reliabler“ ist oder dass ein Bereich aus mehreren Faktoren besteht.

**Quellen:**
- Itembestand aus dem aktuellen Manifest `web/docs/founder-workstyle-pretest-8.5a-v3.json`: 52 Items, `declared_counts` 52/29, `scientific_counts` core 29 / core_research 6 / candidate_core 4 / research 13, `item_order` = 52-Screen-Reihenfolge.
- Abgleich mit der lokalen Datenbank (`workstyle_item_versions`, 8.5a-v3): dieselben 23 `research_only`-Items in derselben Reihenfolge.
- Hypothesen und Confounds je Item aus `docs/research/phase-8/phase-8.4-v0.4-workstyle-development-instrument.md`.
- Einordnung der Core-Logik aus Phase 10B: ORG-Richtung nur über ORG-01/ORG-02, EXP-Übersicht ohne EXP-01.

---

## 1. Inventar der 23 Forschungs- und Kandidatenitems

Für alle 23 gilt: `usage = research_only`, Itemversion `8.4-v0.4`, `product_status = excluded`, Antwortoption „Kann ich noch nicht einschätzen“.

**Im Produkt nicht verwendet:**
- Die Produktleser (`get_workstyle_product_profile`, `get_workstyle_product_team`, `get_discovery_workstyle_signals`, `share_workstyle_product`) filtern auf `scientific_status='core'` und `usage='core'`.
- Forschungsantworten liegen getrennt in `workstyle_research_responses` und erscheinen nur im Admin-Export `get_workstyle_research_dataset_version` (seit 11.6 nur mit Einwilligung).
- **Alle 23 dienen derzeit ausschließlich Forschungszwecken.**

Pos. = Position im bisherigen 52-Screen-Ablauf.

| Pos. | Item | Bereich (Manifest) | Status | Format | Wortlaut (DE) |
|---|---|---|---|---|---|
| 5 | DEC-01 | DEC (Kandidatenbereich) | candidate_core | comparative | Du hast die wichtigsten Informationen für eine Entscheidung, vollständige Sicherheit gibt es aber noch nicht. Was beschreibt dich eher? A: Ich lasse die Entscheidung lieber noch etwas offen, falls noch etwas Relevantes auftaucht. / B: Ich lege mich mit dem jetzigen Stand fest und ändere die Entscheidung später, wenn es einen guten Grund dafür gibt. |
| 11 | EL-03 | EL | core_research | behavioral (5 Muster) | Du hast etwas ausprobiert und bekommst ein Ergebnis, mit dem du so nicht gerechnet hast. Was passiert bei dir eher als Nächstes? A wiederholt sich das? / B verstehen, wodurch / C Variante ausprobieren / D mit Vorwissen für nächste Entscheidung nutzen / E neue Frage formulieren und überprüfen |
| 14 | DEC-02 | DEC | candidate_core | comparative | Zwei Möglichkeiten sind weiterhin plausibel. Du könntest noch weiter recherchieren, erwartest aber nicht, dass sich dadurch das Bild grundlegend verändert. Was liegt dir eher? A: trotzdem noch genauer hinschauen / B: mit dem entscheiden, was ich inzwischen weiß |
| 16 | FS-R1 | FS (Forschungsfacette) | research | likelihood | Du hast zu einer wichtigen Frage schon eine eigene Einschätzung. Wie wahrscheinlich ist es, dass du gezielt jemanden fragst, von dem du eine andere Sicht erwartest? |
| 23 | DEC-03 | DEC | candidate_core | comparative | Ihr habt die wichtigsten Argumente für zwei Richtungen besprochen. Einige kleinere Fragen sind noch offen. A: offene Punkte möglichst noch klären / B: Entscheidung kann trotzdem schon stehen |
| 28 | ORG-05 | ORG | core_research | comparative | Über längere Zeit kommt mehr Arbeit rein, als du realistisch schaffen kannst. A: möglichst viel weiterführen, eher im Kleinen verschieben / B: irgendwann klare Grenze ziehen und neu entscheiden, was warten oder wegfallen muss |
| 29 | EXP-05 | EXP | core_research | influence | Eine Situation ähnelt etwas, das du schon kennst, aber nicht in allen Punkten. Wie stark nutzt du deine Erfahrung trotzdem als Orientierung? |
| 31 | AMB-06 | AMB | core_research | ambiguity_discomfort | Zwei Menschen, deren Einschätzung du sehr ernst nimmst, beurteilen dieselbe Situation völlig unterschiedlich. Im Moment lässt sich nicht klären, wer eher recht hat. Wie unangenehm ist das für dich? |
| 32 | DEC-04 | DEC | candidate_core | comparative | Für die nächsten Wochen braucht ihr eine Richtung. Ihr wisst aber schon, dass ihr später noch einmal neu entscheiden könnt. A: Möglichkeiten möglichst lange offenhalten / B: vorläufige Richtung wählen und damit arbeiten |
| 34 | ORG-06 | ORG | core_research | influence | Niemand gibt dir vor, wann oder in welcher Reihenfolge etwas erledigt werden muss. Wie stark strukturierst du dir den Ablauf selbst? |
| 35 | EVI-04 | EVI | core_research | behavioral (5 Muster) | Ein für euer Vorhaben wichtiges Ergebnis fällt deutlich anders aus als erwartet. Was beschreibt am ehesten, wie du damit umgehst? A zur Kenntnis nehmen und beobachten / B naheliegenden Grund suchen / C einige Erklärungen vergleichen, dann entscheiden / D beste Erklärung herausfinden / E bewusst auch widersprechende Erklärungen prüfen |
| 36 | FS-R2 | FS | research | comparative | Du kommst bei einer schwierigen Frage nicht weiter. A: erst noch selbst eine klarere Einschätzung entwickeln / B: relativ früh eine andere Perspektive dazuholen |
| 39 | AMB-03 | AMB | research | ambiguity_discomfort | Bei einer wichtigen Entwicklung sind mehrere Ausgänge möglich, aber gerade lässt sich keiner davon verlässlich vorhersagen. Wie unangenehm ist das für dich? |
| 42 | EL-06 | EL | research | likelihood | Ein erster Versuch spricht gegen deine ursprüngliche Idee. Wie wahrscheinlich ist es, dass du daraus eine neue Frage für den nächsten Versuch ableitest? |
| 43 | VOICE-06 | VOICE | research | likelihood | Du hast einem Plan zunächst zugestimmt und merkst später, dass du ihn inzwischen anders siehst. Wie wahrscheinlich ist es, dass du das selbst wieder ansprichst? |
| 44 | DEC-R1 | DEC | research | comparative | Bei einer wichtigen Entscheidung gibt es keinen Zeitdruck. Die wesentlichen Informationen liegen aber vor. A: ohne Zeitdruck lieber noch offen lassen / B: wenn ich genug weiß, auch ohne Zeitdruck festlegen |
| 45 | AMB-R1 | AMB | research | ambiguity_discomfort | Du planst die nächsten Wochen, obwohl sich zwei wichtige Rahmenbedingungen noch deutlich verändern könnten. Wie unangenehm ist das für dich? |
| 46 | VOICE-R1 | VOICE | research | likelihood | Im Team sind sich alle schnell einig. Du siehst aber noch ein Risiko. Wie wahrscheinlich ist es, dass du es trotzdem ansprichst? |
| 47 | EVI-R1 | EVI | research | likelihood | Im Team gibt es schnell Zustimmung für eine Lösung. Dir fallen noch offene Punkte auf. Wie wahrscheinlich ist es, dass du gezielt prüfst, was gegen die Lösung sprechen könnte? |
| 49 | EL-R1 | EL | research | likelihood | Du willst etwas Neues ausprobieren. Wie wahrscheinlich ist es, dass du dir vorher klarmachst, woran du erkennen würdest, ob der Versuch dir weiterhilft? |
| 50 | EXP-R1 | EXP | research | influence | Du kennst dich mit einem Thema gut aus und hast ziemlich schnell ein Gefühl dafür, was funktionieren könnte. Wie stark beeinflusst dieser erste Eindruck deine weitere Einschätzung? |
| 51 | ORG-R1 | ORG | research | likelihood | Du hast zugesagt, etwas bis zu einem bestimmten Zeitpunkt fertigzustellen. Wie wahrscheinlich ist es, dass du zwischendurch prüfst, ob du noch im Plan bist? |
| 52 | DEC-R2 | DEC | research | likelihood | Zwei Wege sind weiterhin ungefähr gleich plausibel. Wie wahrscheinlich ist es, dass du dich trotzdem für einen davon festlegst, auch wenn keine neue Information hinzukommt? |

Status: `core_research` 6 (EL-03, ORG-05, EXP-05, AMB-06, ORG-06, EVI-04), `candidate_core` 4 (DEC-01 bis DEC-04), `research` 13.

Formate: likelihood 8, comparative 7, ambiguity_discomfort 3, influence 3, behavioral 2.

## 2. Zuordnung zu den Core-Bereichen

| Bereich | Forschungsitems | Anzahl |
|---|---|---|
| EVI – Entscheidungen prüfen | EVI-04, EVI-R1 | 2 |
| EXP – Erfahrung nutzen | EXP-05, EXP-R1 | 2 |
| EL – Durch Ausprobieren lernen | EL-03, EL-06, EL-R1 | 3 |
| VOICE – Einwände ansprechen | VOICE-06, VOICE-R1 | 2 |
| AMB – Offene Situationen empfinden | AMB-06, AMB-03, AMB-R1 | 3 |
| ORG – Die Arbeit steuern | ORG-05, ORG-06, ORG-R1 | 3 |
| *DEC – Entscheidungsschwelle (kein Produktbereich)* | DEC-01, -02, -03, -04, DEC-R1, DEC-R2 | 6 |
| *FS – Perspektivensuche (kein Produktbereich)* | FS-R1, FS-R2 | 2 |

**Nur 15 der 23 Items gehören zu einem der sechs Core-Bereiche.** DEC ist ein Kandidatenbereich, FS eine Forschungsfacette; beide sind laut Projektregeln keine Produktbereiche, und es kommen keine Konstrukte dazu. Inhaltlich stehen beide EVI am nächsten:
- DEC: wann man sich trotz verbleibender Unsicherheit festlegt;
- FS: aktiv andere Sichten einholen.

Deshalb können DEC- und FS-Items in Welle 1 höchstens als **Abgrenzungsmarker für EVI** sinnvoll sein, nicht als eigene Dimension.

Daraus folgt eine Rechnung: Zwei 8er-Sets ohne Anchor brauchen 16 verschiedene Items, es gibt aber nur 15 Core-Bereichs-Kandidaten, und zwei davon sind schwach (Abschnitt 4). **Rein aus Core-Bereichs-Items lassen sich zwei gute 8er-Sets ohne Anchor nicht füllen.**

## 3. Vergleich mit den Core-Items

Was in jeder Frage tatsächlich gefragt wird (Verhalten oder Erleben, Auslöser, Kontext):

| Forschungsitem | Nächstes Core-Item | Gleich | Anders |
|---|---|---|---|
| EVI-04 | EVI-06 (widersprüchliche Quellen → prüfen), EVI-03 | Umgang mit unerwarteter Evidenz | Ergebnis statt Quelle; Muster statt Wahrscheinlichkeit; **gleicher Auslöser wie EL-03** |
| EVI-R1 | EVI-01 (Gründe gegen den Favoriten suchen) | gezielt Gegenargumente prüfen | Gruppenkontext mit schneller Zustimmung (Konformitätsdruck); **identische Situation wie VOICE-R1** und fast wie VOICE-01 |
| EXP-05 | EXP-04 (mehrfach erlebtes Problem) | Erfahrung als Orientierung | nur **teilweise** ähnliche Situation; Grenze des Transfers |
| EXP-R1 | EXP-01 (Muster sofort bekannt, Format seriousness) | schneller erfahrungsbasierter Eindruck | Format influence wie der übrige EXP-Bereich; ausdrücklich Expertise-Kontext |
| EL-03 | EL-05 (erster Versuch unklar → verändern) | nächster Schritt nach einem Versuch | unerwartetes statt unklares Ergebnis; Muster; Option E ≈ EL-06 |
| EL-06 | EL-05 | Lernschleife nach dem Versuch | Ergebnis spricht **gegen** die eigene Idee; „neue Frage ableiten“ statt „verändern“ |
| EL-R1 | EL-01 / ORG-01 | vor dem Versuch | Erfolgskriterium festlegen, also eher Methodik und Planung |
| VOICE-06 | VOICE-03 (vertagtes Thema wieder aufgreifen), EVI-03 | etwas selbst wieder ansprechen | eigene frühere **Zustimmung** zurücknehmen (Gesichtswahrung); Revision |
| VOICE-R1 | VOICE-01 (Einigkeit + Gegenpunkt) | fast derselbe Auslöser | „alle schnell einig“ + „Risiko“: Konformitätsdruck stärker betont |
| AMB-06 | AMB-01 (unterschiedliche Rückmeldungen) | widersprüchliche Einschätzungen anderer | zwei Vertrauenspersonen; **gleiche Situation wie EVI-06** (dort Verhalten, hier Empfinden) |
| AMB-03 | AMB-02 (mehrere Erklärungen) | mehrere Möglichkeiten offen | **zukünftige Ausgänge** statt Erklärungen; Nähe zu allgemeiner Zukunftsunsicherheit |
| AMB-R1 | AMB-05 (weiterarbeiten trotz offener Frage) | handeln trotz Offenheit | Planungskontext; Nähe zu ORG (Plan vs. Anpassung) |
| ORG-05 | ORG-03 (parallel vs. fokussieren) | Priorisierung unter Last | anhaltende Überlast; Grenzen setzen und Wegfallen statt Parallelität |
| ORG-06 | ORG-01 / ORG-02 (Richtungsitems) | Selbststrukturierung ohne Vorgabe | allgemein statt Projektstart bzw. Zwischenpunkte; Format influence |
| ORG-R1 | ORG-02 (selbst Zwischenpunkte setzen) | Fortschritt selbst prüfen | **mit** zugesagter Frist: äußere Struktur ist da, also fast Wiederholung |
| DEC-01/-02/-03/-04, DEC-R1/-R2 | EVI-02 (Annahme vor dem Festlegen prüfen), AMB-05 | Festlegen unter Unsicherheit | Schwelle des Festlegens statt Prüfen; DEC-02 stellt ausdrücklich „weiter prüfen, obwohl es wenig bringt“ zur Wahl |
| FS-R1 | EVI-05 (Einwand anderer → eigene Einschätzung prüfen) | andere Sicht | **aktiv einholen** statt reagieren |
| FS-R2 | EVI-05 / FS-R1 | andere Sicht | Zeitpunkt (früh vs. erst selbst); zwei gleichwertige Pole |

## 4. Item-Audit

### 4.1 Übersicht

| Item | Bereich | Kurzinhalt | Format | Nächstes Core | Zusätzlicher Erkenntniswert | Mögliche Redundanz | Mögliche Probleme | Eignung |
|---|---|---|---|---|---|---|---|---|
| EVI-04 | EVI | unerwartetes Ergebnis: Erklärungsmuster | behavioral | EVI-06, EVI-03 | anderes Format, Verhaltensmuster statt Selbsteinschätzung | EL-03 (gleicher Auslöser) | Optionen wirken wie eine Qualitätsleiter (E klingt „richtig“); nur Musterauswertung, kein Item-Total | MEDIUM |
| EVI-R1 | EVI | schnelle Zustimmung → Gegenpunkte prüfen | likelihood | EVI-01 | gezielte Abgrenzung EVI vs. VOICE in identischer Situation | VOICE-R1/VOICE-01 (Situation) | sozial erwünscht („prüfen“ klingt gut) | HIGH (als Paar mit VOICE-R1) |
| EXP-05 | EXP | Transfer auf teilweise ähnliche Situation | influence | EXP-04 | Grenze des Erfahrungstransfers; mögliche bessere Streuung als EXP-04 | EXP-04, EXP-03 | Grad der Ähnlichkeit bleibt offen | HIGH |
| EXP-R1 | EXP | Expertise → schneller erster Eindruck | influence | EXP-01 | möglicher Ersatz für EXP-01 im einheitlichen Format; Mustererkennung vs. Bauchgefühl | EXP-01, EXP-06 | Doppelladung (Expertise + Eindruck); Selbstvertrauen als Störgröße | HIGH |
| EL-03 | EL | unerwartetes Ergebnis: nächster Schritt | behavioral | EL-05 | Verhaltensmuster der Lernschleife | EVI-04, EL-06 (Option E) | Musteroptionen mischen EL und EVI; lang | MEDIUM |
| EL-06 | EL | Versuch gegen eigene Idee → neue Frage | likelihood | EL-05 | Facette „Lernschleife“ vs. „Testorientierung“; Abgrenzung Persistenz | EL-05, EVI-03 | „neue Frage ableiten“ klingt abstrakt und methodisch | HIGH |
| EL-R1 | EL | vorher Erfolgskriterium festlegen | likelihood | EL-01, ORG-01 | Methodenkompetenz als Störgröße sichtbar machen | ORG-01 | stark sozial erwünscht; misst eher Planung oder Methodik | LOW |
| VOICE-06 | VOICE | eigene Zustimmung zurücknehmen | likelihood | VOICE-03, EVI-03 | andere Art von Dissens (Gesichtsverlust); vermutlich weniger erwünscht | EVI-03 (Revision) | Doppelladung VOICE/EVI (gewollt) | HIGH |
| VOICE-R1 | VOICE | alle einig → Risiko ansprechen | likelihood | VOICE-01 | nur im Paar mit EVI-R1 | **VOICE-01 fast identisch** | sozial erwünscht | MEDIUM (nur als Paar) |
| AMB-06 | AMB | zwei Vertrauenspersonen uneinig | ambiguity_discomfort | AMB-01 | zwischenmenschliche Ambiguität; Abgrenzung Empfinden vs. Verhalten über EVI-06 | AMB-01 | Loyalitätskonflikt könnte mitschwingen | HIGH |
| AMB-03 | AMB | mehrere Zukunftsausgänge offen | ambiguity_discomfort | AMB-02 | Art der Ungewissheit: Zukunft vs. Erklärung | AMB-02, AMB-04 | Nähe zu allgemeiner Zukunftssorge; darf keine Angstdiagnostik werden | HIGH |
| AMB-R1 | AMB | planen trotz veränderlicher Rahmenbedingungen | ambiguity_discomfort | AMB-05 | Planungsungewissheit; Überschneidung mit ORG prüfbar | AMB-03 | Doppelladung AMB/ORG | MEDIUM |
| ORG-05 | ORG | Dauerüberlast: weiterführen vs. Grenze | comparative | ORG-03 | Facette Priorisieren und Wegfallen | ORG-03 | comparative: nicht in die ORG-Richtung summierbar | MEDIUM |
| ORG-06 | ORG | ohne Vorgabe selbst strukturieren | influence | ORG-01, ORG-02 | möglicher **dritter Richtungsindikator** (heute nur zwei) | ORG-01/-02 | Gewissenhaftigkeit, Erwünschtheit, Deckeneffekt | HIGH |
| ORG-R1 | ORG | mit Frist zwischendurch prüfen | likelihood | ORG-02 | gering | **ORG-02 fast identisch** | äußere Frist nimmt die Selbststeuerung heraus; Deckeneffekt | LOW |
| DEC-01 | DEC | Entscheidung offen halten vs. festlegen und revidieren | comparative | EVI-02, AMB-05 | Schwelle des Festlegens | DEC-R1, DEC-04 | kein Produktbereich | MEDIUM (spätere Welle) |
| DEC-02 | DEC | weiter prüfen, obwohl es wenig bringt | comparative | EVI-02 | **Abgrenzung EVI von bloßer Gründlichkeit** | DEC-R2 | kein Produktbereich | HIGH (als EVI-Marker) |
| DEC-03 | DEC | Team: kleine offene Fragen | comparative | EVI-02, VOICE-05 | Teamkontext der Schwelle | DEC-01 | kein Produktbereich | MEDIUM |
| DEC-04 | DEC | vorläufige Richtung, später revidierbar | comparative | AMB-05, ORG-08 | Vorläufigkeit | DEC-01 | kein Produktbereich | MEDIUM |
| DEC-R1 | DEC | ohne Zeitdruck festlegen? | comparative | EVI-02 | Zeitdruck als Moderator | DEC-01 | sehr ähnlich zu DEC-01 | LOW |
| DEC-R2 | DEC | trotz Gleichstand festlegen | likelihood | EVI-02 | likelihood-Variante von DEC-02 | **DEC-02** | gegenläufig gepolt, sonst fast gleich | LOW |
| FS-R1 | FS | gezielt andere Sicht einholen | likelihood | EVI-05 | aktive vs. reaktive Perspektivenprüfung | FS-R2 | stark sozial erwünscht | MEDIUM |
| FS-R2 | FS | erst selbst vs. früh andere Sicht | comparative | EVI-05 | zwei gleichwertige Pole, also geringere Erwünschtheit | FS-R1 | kein Produktbereich | MEDIUM-HIGH (als EVI-Marker) |

### 4.2 Bewertung A–I (Hypothesen)

Skala: ++ stark · + eher gut · o gemischt · − eher problematisch · −− deutlich problematisch.

Bei F (soziale Erwünschtheit) bedeutet „+“: geringe Erwünschtheit. Bei G (Kontext) bedeutet „+“: sinnvoll situationsspezifisch. Bei H (Doppelladung) bedeutet „+“: wenig Vermischung.

| Item | A Konstrukt | B Zusatznutzen | C Redundanz | D Verständlich | E Antwortbar | F Erwünschtheit | G Kontext | H Doppelladung | I Produktpotenzial |
|---|---|---|---|---|---|---|---|---|---|
| EVI-04 | + | + | o (EL-03) | o | + | − (E als „Ideal“) | + | o | o (Musterformat schwer in den Report zu übernehmen) |
| EVI-R1 | + | + | o | ++ | + | − | + | − (VOICE, gewollt) | o |
| EXP-05 | ++ | + | o | + | + | + | + | + | + (Ersatz oder Ergänzung zu EXP-04) |
| EXP-R1 | + | + | o | ++ | + | o | + | − (Selbstvertrauen) | + (Ersatz für EXP-01) |
| EL-03 | + | o | o | o | + | o | + | − (EVI) | o |
| EL-06 | + | + | o | o | + | o | + | o (EVI-03) | + |
| EL-R1 | o | o | o | + | + | −− | o | − (ORG, Methodik) | − |
| VOICE-06 | + | ++ | + | ++ | + | + | + | − (EVI, gewollt) | + |
| VOICE-R1 | + | − | −− | ++ | + | − | + | o | − |
| AMB-06 | ++ | + | o | ++ | + | + | + | o | + |
| AMB-03 | + | + | o | + | + | o | o | o (Zukunftssorge) | o |
| AMB-R1 | o | + | o | + | + | + | + | − (ORG) | o |
| ORG-05 | + | + | o (ORG-03) | ++ | + | + | + | + | o (comparative) |
| ORG-06 | + | ++ | o | + | + | − (Gewissenhaftigkeit) | o (sehr allgemein) | + | ++ (dritte Richtung) |
| ORG-R1 | o | − | −− | ++ | + | −− | o | − (Gewissenhaftigkeit) | − |
| DEC-02 | (DEC) + | + (für EVI) | o (DEC-R2) | + | + | + | + | o | – (kein Produktbereich) |
| FS-R2 | (FS) + | + (für EVI) | o | ++ | + | + | + | o | – |
| FS-R1 | (FS) + | o | o | ++ | + | − | + | o | – |
| DEC-01/-03/-04 | (DEC) + | o | o | + | + | + | + | o | – |
| DEC-R1, DEC-R2 | (DEC) o | − | − | + | + | + | o | o | – |

### 4.3 Die Restfragen je Bereich

**EVI:**
- Die Core-Items sind durchweg „Wie wahrscheinlich prüfst du …“, also sozial eher erwünscht.
- Prüfen *vor* der Entscheidung decken EVI-01 und EVI-02 ab, Prüfen *danach* EVI-03 und EVI-05.
- Kein Forschungsitem trennt das neu. EVI-R1 ist „vor“, im Gruppenkontext.
- Die Überschneidung mit VOICE lässt sich nur prüfen, wenn EVI-R1 und VOICE-R1 **bei derselben Person** erhoben werden; sie beschreiben dieselbe Situation einmal als Prüfen, einmal als Ansprechen.
- Gegen Erwünschtheit helfen eher Gegenpol-Items mit gleichwertigen Antworten: DEC-02 („weiter prüfen, obwohl es wenig bringt“) und FS-R2 als Abgrenzungsmarker. EVI-04 hat zwar ein anderes Format, seine Optionen wirken aber wie eine Leiter.

**EXP:**
- EXP-01 steht wegen seines Formats (seriousness) nicht in der Übersicht. EXP-R1 fragt Ähnliches im einheitlichen influence-Format und ist damit ein naheliegender Ersatzkandidat.
- EXP-05 trennt „Erfahrung“ von „Vertrautheit“ über teilweise Ähnlichkeit.
- Kompetenz wird durch EXP-R1 („kenne mich gut aus“) als Störgröße eher eingeführt als getrennt. Das ist bei der Auswertung zu beachten.

**EL:**
- Die Core-Items mischen Testen vor dem Festlegen (EL-01, EL-02, EL-04) und Lernschleife (EL-05).
- EL-06 und EL-03 stärken die Lernschleife.
- Risikobereitschaft oder Tempo trennt keines ausdrücklich. Die Items sprechen alle von „wenig Aufwand“ bzw. „im Kleinen“, das senkt die Risikolast.
- EL-R1 zieht eher Methodik und Planung herein und ist schwach.

**VOICE:**
- Alle Core-Items sind likelihood und sozial erwünscht.
- VOICE-06 bringt eine echte andere Dissensart: die eigene Zustimmung zurücknehmen. Das ist vermutlich weniger erwünscht und könnte stärker zwischen Personen unterscheiden.
- VOICE-R1 ist fast VOICE-01 und nur als Paar mit EVI-R1 interessant.

**AMB:**
- Alle drei Kandidaten fragen nach Empfinden („Wie unangenehm“), nicht nach Verhalten.
- Die Core-Items kreisen um Erklärungen und Rückmeldungen. AMB-03 (Zukunftsausgänge) und AMB-R1 (Planung) bringen andere Arten von Ungewissheit.
- AMB-06 erlaubt mit EVI-06 einen Abgleich Empfinden vs. Verhalten in derselben Situation.
- Bei AMB-03 auf Zukunftssorge achten. Keine Angst- oder Resilienzdeutung, auch nicht in der späteren Auswertung.

**ORG (besonders kritisch):**
- Die ORG-Richtung im Report stützt sich nur auf ORG-01 und ORG-02. ORG-03, -04, -07 und -08 sind vergleichende Teilaspekte (Parallelität, Plantreue, Unterbrechung, Anpassung).
- **ORG-06** ist der einzige weitere ordinale Selbststeuerungs-Kandidat. Er ist der wichtigste Prüfpunkt dafür, ob eine stabilere ORG-Richtung möglich ist.
- **ORG-05** fügt mit „Priorisieren und Wegfallen“ einen weiteren vergleichenden Teilaspekt hinzu. Zusammen mit den Core-Vergleichsitems hilft er zu sehen, ob ORG ein einheitlicher Bereich ist oder mehrere Facetten hat. Das bleibt eine Hypothese, kein Befund.
- ORG-R1 ist fast eine Wiederholung von ORG-02.

## 5. Set A (8 Items)

| Pos. | Item | Bereich | Warum in diesem Set? | Vergleich mit Core | Forschungsfrage |
|---|---|---|---|---|---|
| 1 | ORG-06 | ORG | **Anchor** (Abschnitt 7); einziger zusätzlicher ordinaler Selbststeuerungs-Kandidat | ORG-01, ORG-02 | Hängt ORG-06 mit ORG-01/ORG-02 so zusammen, dass er als dritter Richtungsindikator infrage kommt, ohne stärkere Deckeneffekte? |
| 2 | EXP-05 | EXP | Grenze des Transfers; mögliche bessere Streuung als EXP-04 | EXP-04, EXP-03 | Streut EXP-05 stärker als EXP-04 und hängt trotzdem mit den übrigen EXP-Items zusammen? |
| 3 | EVI-R1 | EVI | bildet mit VOICE-R1 ein Paar in identischer Situation | EVI-01 | Unterscheiden Personen zwischen „Gegenpunkte prüfen“ (EVI-R1) und „Risiko ansprechen“ (VOICE-R1) in derselben Situation, oder antworten sie praktisch gleich? |
| 4 | AMB-06 | AMB | zwischenmenschliche Ambiguität; Abgleich mit EVI-06 (gleiche Situation, Verhalten) | AMB-01, EVI-06 | Hängt AMB-06 enger mit AMB-01/-02 als mit EVI-06 zusammen, trennt sich also Empfinden von Prüfverhalten? |
| 5 | EL-03 | EL | Verhaltensmuster der Lernschleife (einziges Musteritem im Set) | EL-05 | Gehen die gewählten Muster bei EL-03 mit EL-05 einher, und wie oft wird „kann ich nicht einschätzen“ gewählt? |
| 6 | VOICE-R1 | VOICE | nur als Paar mit EVI-R1; gleichzeitig Redundanzprüfung zu VOICE-01 | VOICE-01 | Liefert VOICE-R1 gegenüber VOICE-01 eigenständige Information, oder sind die Antworten nahezu gleich? |
| 7 | ORG-05 | ORG | ORG-Teilaspekt Priorisieren; ORG ist der Bereich mit dem größten Entwicklungsbedarf | ORG-03 | Ist ORG-05 eher eine Variante von ORG-03 oder ein eigener Teilaspekt, und wie hängt er mit der ORG-Richtung zusammen? |
| 8 | DEC-02 | (DEC → EVI-Marker) | Gegenpol zu EVI: weiter prüfen, obwohl es wenig bringt; gleichwertige Pole | EVI-02 | Spiegeln hohe EVI-Werte eher gezieltes Prüfen oder allgemeine Gründlichkeit, die auch bei geringem Nutzen weiterprüft? |

Formate: likelihood 2 · influence 2 · ambiguity 1 · behavioral 1 · comparative 2.
Kontexte: allein (ORG-06, EXP-05, EL-03, ORG-05, DEC-02), Team (EVI-R1, VOICE-R1), zwischenmenschlich (AMB-06).

## 6. Set B (8 Items)

| Pos. | Item | Bereich | Warum in diesem Set? | Vergleich mit Core | Forschungsfrage |
|---|---|---|---|---|---|
| 1 | ORG-06 | ORG | **Anchor** | ORG-01, ORG-02 | wie Set A; dazu: Verteilen sich die Antworten auf ORG-06 in A und B gleich (Prüfung der Zuteilung)? |
| 2 | EXP-R1 | EXP | Ersatzkandidat für EXP-01 im einheitlichen influence-Format | EXP-01, EXP-06 | Hängt EXP-R1 mit EXP-02/-03/-04/-06 enger zusammen als EXP-01, und wie stark mit Selbstvertrauen-nahen Antworten (z. B. hohe Werte überall)? |
| 3 | VOICE-06 | VOICE | andere Dissensart: eigene Zustimmung zurücknehmen | VOICE-03, EVI-03 | Ist VOICE-06 weniger sozial erwünscht (weniger Deckeneffekt) als VOICE-02/-03 und hängt trotzdem mit VOICE zusammen, oder eher mit EVI-03? |
| 4 | AMB-03 | AMB | andere Art von Ungewissheit: Zukunftsausgänge | AMB-02 | Hängt AMB-03 mit den Erklärungs-Items (AMB-02/-04) zusammen, oder steht Zukunftsungewissheit eher für sich? |
| 5 | EVI-04 | EVI | Verhaltensmuster bei unerwarteter Evidenz (einziges Musteritem im Set) | EVI-06, EVI-03 | Gehen die Muster bei EVI-04 mit den EVI-Wahrscheinlichkeiten einher, und wird Option E überproportional gewählt (Hinweis auf Erwünschtheit)? |
| 6 | EL-06 | EL | Lernschleife bei Widerspruch zur eigenen Idee | EL-05, EVI-03 | Hängt EL-06 enger mit EL-05 als mit EL-01/-02/-04 zusammen (Hinweis auf zwei EL-Teilaspekte), und wie stark mit EVI-03? |
| 7 | AMB-R1 | AMB | Planungsungewissheit; Überschneidung mit ORG im selben Set prüfbar (ORG-06) | AMB-05, ORG-08 | Erklärt sich AMB-R1 eher über AMB oder eher über ORG-Präferenzen (ORG-06, ORG-04/-08)? |
| 8 | FS-R2 | (FS → EVI-Marker) | gleichwertige Pole: erst selbst vs. früh andere Sicht | EVI-05 | Hängt aktive Perspektivensuche mit EVI-05 zusammen (Facette von EVI) oder eher nicht? |

Formate: likelihood 2 · influence 2 · ambiguity 2 · behavioral 1 · comparative 1.
Kontexte: allein (ORG-06, EXP-R1, AMB-03, EL-06, AMB-R1, FS-R2), Team (VOICE-06), Vorhaben (EVI-04).

**Ausgewogenheit A gegenüber B:**
- je ein langes Musteritem, je zwei likelihood- und zwei influence-Items;
- B hat ein ambiguity-Item mehr, A ein comparative-Item mehr;
- konfliktnahe Situationen: A zwei (EVI-R1, VOICE-R1), B eine (VOICE-06) plus einen milden Fall (FS-R2); keine Gruppe bekommt nur unangenehme Situationen;
- beide Sets enthalten eigene Arbeit, Team- und Vorhabenkontext;
- beide decken alle sechs Core-Bereiche ab.

Bewusste Platzierung:
- Die beiden fast gleichen Musteritems (EVI-04, EL-03) stehen in **verschiedenen** Sets, sonst bekäme eine Gruppe zwei lange, fast gleich ausgelöste Fragen.
- EVI-R1 und VOICE-R1 stehen bewusst **im selben** Set; die Abgrenzung lässt sich nur bei derselben Person prüfen.

## 7. Anchor-Items

**Empfehlung: genau ein Anchor, ORG-06.** Begründung:
- ORG ist der kritischste Bereich (Richtung aus nur zwei Items). Für die wichtigste Frage der Welle verdoppelt der Anchor die Fallzahl.
- Wenn ORG-06 in A und B ähnlich verteilt ist, ist das ein Plausibilitätscheck der Zuteilung. Unterschiede zwischen den Sets sind dann eher nicht auf ungleiche Gruppen zurückzuführen.
- Inhaltlich steht ORG-06 allein und passt gleich gut in beide Sets. Er erzeugt keine Kontexteffekte mit den übrigen Items.

**Kein zweiter Anchor:**
- Infrage käme EXP-05 oder AMB-06. Beide sind als Set-spezifische Vergleichspunkte wertvoller, weil sie jeweils ein Gegenstück im anderen Set haben (EXP-R1, AMB-03).
- Ein zweiter Anchor würde einen Platz kosten, der dann mit einem schwachen Item (EL-R1, ORG-R1) oder einem weiteren DEC/FS-Item gefüllt werden müsste.

Damit nutzt Welle 1 **15 verschiedene Items**. Davon sind 13 Core-Bereichs-Items; dazu kommen zwei Abgrenzungsmarker für EVI (DEC-02 und FS-R2), jeweils in einem Set. Diese Marker sollen EVI weiterentwickeln und keinen eigenen Bereich aufbauen.

**Alternative**, falls in Welle 1 kein DEC/FS-Item vorkommen soll: In beiden Sets den 8. Platz streichen (7 Fragen) oder AMB-06 als zweiten Anchor nehmen. Die EVI-Erwünschtheitsfrage bliebe dann offen.

## 8. Nicht verwendete Items und spätere Welle

| Item | Klasse | Begründung |
|---|---|---|
| DEC-01 | NEXT_WAVE | stärkstes allgemeines DEC-Item; erst sinnvoll, wenn DEC gezielt als eigene Frage untersucht werden soll |
| DEC-03 | NEXT_WAVE | Teamkontext der Entscheidungsschwelle; Nähe zu VOICE-05 interessant |
| DEC-04 | NEXT_WAVE | Vorläufigkeit; Nähe zu AMB-05/ORG-08 |
| FS-R1 | NEXT_WAVE | ergänzt FS-R2, ist aber deutlich erwünschter; erst nach FS-R2-Daten |
| EL-R1 | REWRITE_FIRST | eher Methodik und Planung, stark erwünscht. Mögliche Richtung (nur Vorschlag, keine Änderung): als comparative mit zwei gleichwertigen Polen („erst festlegen, woran ich Erfolg erkenne“ vs. „erst ausprobieren und dann sehen“) |
| DEC-R1 | LOW_PRIORITY | inhaltlich nah an DEC-01; Zeitdruck als Moderator ist eine spätere Frage |
| DEC-R2 | LOW_PRIORITY | likelihood-Zwilling von DEC-02, gegenläufig gepolt; erst bei DEC-Vertiefung |
| ORG-R1 | DROP_CANDIDATE | fast Wiederholung von ORG-02; die äußere Frist nimmt gerade die Selbststeuerung heraus; Deckeneffekt wahrscheinlich. Nur behalten, falls ORG-02 später Probleme zeigt |

## 9. Forschungsfragen je Kandidat (Welle 1)

Alle Fragen sind Hypothesen oder Entwicklungsziele.

- **ORG-06 (A+B):** Bildet ORG-06 zusammen mit ORG-01/ORG-02 eine stimmige Richtung? Hat er einen stärkeren Deckeneffekt (Erwünschtheit, Gewissenhaftigkeit)? Wie verhält er sich zu den vergleichenden ORG-Items?
- **ORG-05 (A):** Eigener Teilaspekt „Priorisieren und Wegfallen“ oder Variante von ORG-03?
- **EXP-05 (A):** Mehr Streuung als EXP-04 bei vergleichbarem Zusammenhang mit EXP?
- **EXP-R1 (B):** Ersatzkandidat für EXP-01 im einheitlichen Format? Verwechslung mit Selbstvertrauen?
- **EVI-R1 + VOICE-R1 (A):** Trennen Personen Prüfen und Ansprechen in identischer Situation? Hat VOICE-R1 gegenüber VOICE-01 eigenständigen Wert?
- **EVI-04 (B):** Hängen die Muster mit EVI zusammen? Wird Option E auffällig oft gewählt?
- **DEC-02 (A):** Trennt sich EVI von allgemeiner Gründlichkeit, oder wählen Personen mit hohen EVI-Werten auch hier „weiter prüfen“?
- **FS-R2 (B):** Facette von EVI oder eigenständig?
- **EL-03 (A) / EL-06 (B):** Gibt es Hinweise auf zwei EL-Teilaspekte (Testen vor dem Festlegen vs. Lernschleife)? Wie eng ist die Verbindung zu EVI-03?
- **VOICE-06 (B):** Weniger Deckeneffekt als die VOICE-Core-Items? Gehört er eher zu VOICE oder zu EVI-03?
- **AMB-06 (A):** Lässt sich Empfinden von Prüfverhalten trennen (AMB-06 vs. EVI-06)?
- **AMB-03 / AMB-R1 (B):** Gehört Zukunfts- bzw. Planungsungewissheit zu AMB? Erklärt sich AMB-R1 teils über ORG?

## 10. Spätere Auswertungsmetriken (noch nicht implementieren)

Für jedes eingesetzte Item mindestens:

| Metrik | Für | Hinweis |
|---|---|---|
| Antwortverteilung | alle | Rohhäufigkeiten je Option, je Set |
| Anteil „kann ich nicht einschätzen“ | alle | über ca. 10–15 % → Verständlichkeit prüfen (Schwelle festlegen, bevor Daten vorliegen) |
| Boden- und Deckeneffekte | ordinale Items | besonders ORG-06, EVI-R1, VOICE-R1, VOICE-06 (Erwünschtheit) |
| Zusammenhang mit Core-Items desselben Bereichs | ordinale Items | polychorisch bzw. Spearman; **nur deskriptiv** |
| Zusammenhang mit Core-Items anderer Bereiche | ausgewählte Paare | EVI-R1↔VOICE-R1/VOICE-01, AMB-06↔EVI-06, AMB-R1↔ORG, EL-06↔EVI-03, VOICE-06↔EVI-03, DEC-02/FS-R2↔EVI |
| Item-Total im Bereich (korrigiert) | ordinale Items in ordinalen Bereichen | nicht für comparative- und behavioral-Items |
| Musterverteilung je Core-Antwortniveau | EVI-04, EL-03 | Kreuztabelle mit dem Bereichsmuster; keine Umrechnung der Muster in Zahlen |
| Wahlanteile und Seitenstärke | comparative (ORG-05, DEC-02, FS-R2) | nicht summieren; nur im Zusammenhang mit den Pol-Items lesen |
| Streuung zwischen Personen | alle | Vergleich mit dem nächsten Core-Item |
| Verständlichkeit und Feedback | alle | „unklar“/„unpassend“-Markierungen im bestehenden Feedback |
| Bearbeitungszeit | alle | Ausreißer und lange Zeiten als Hinweis auf Verständnisprobleme (Zeiten gibt es nur mit Einwilligung) |
| Vergleich der Sets | ORG-06 (Anchor) | Verteilung A vs. B als Plausibilitätscheck |
| Retest | später, ausgewählte Kandidaten | erst wenn eine Ersatzentscheidung ansteht |

Kontext für die Auswertung: Im 52-Screen-Ablauf standen die Forschungsitems **zwischen** den Core-Items. In der Beta stehen sie **nach** den 29 Core-Fragen. Reihenfolge- und Ermüdungseffekte unterscheiden sich, deshalb Daten aus beiden Abläufen nicht ungeprüft zusammenlegen.

## 11. Empfehlung für die A/B-Zuteilung (noch nicht bauen)

Zielbild:
- **Zeitpunkt:** einmalig bei der Forschungseinwilligung (`start_workstyle_research`), serverseitig, im selben Vorgang, der die Einwilligung speichert.
- **Verfahren:** ausgeglichen. Entweder blockweise zufällig oder wie bei v1 („am wenigsten belegtes Set“, unter derselben Sperre wie der Start). Rein zufällige Zuteilung ist bei kleinen Fallzahlen schlechter ausbalanciert.
- **Stabil:** dasselbe Set beim Fortsetzen, kein neues Los beim Neuladen; das Set steht vor der ersten Forschungsfrage fest.
- **Dokumentierbar:** Set-Kennung und Set-Version (z. B. `A`/`B` + `research-sets/1.0.0`) je Sitzung, auch im Export.
- **Keine Wirkung auf das Produkt:** Core, Report, Teilen, FIND und `manifest_version` (`3.0.0`) bleiben unberührt. Die Produktleser prüfen die Manifestversion, eine Erhöhung würde bestehende Profile ausblenden. Die Set-Version muss deshalb **getrennt** vom Core-Manifest geführt werden.
- **Forschungsabschluss** hieße dann: alle Items des zugeteilten Sets (8 statt 23).

Dafür wäre später eine **Migration** nötig (nur benannt):
- Spalte(n) für Set und Set-Version an `workstyle_pretest_sessions`. Die vorhandene Spalte `form` ist für v3 per Constraint leer.
- Anpassung von `workstyle_v3_sync_completion` (Forschungsumfang je Set), `save_workstyle_pretest_v3` (nur Items des Sets annehmen) und des Exports.
- Gegebenenfalls eine Set-Definition im Manifest bzw. in einer eigenen Registry.

Bestehende Teilnahmen mit 23 Forschungsitems bleiben als eigene Kohorte („full-23“) erkennbar.

## 12. Offene fachliche Fragen

1. Sollen DEC- und FS-Items als Abgrenzungsmarker für EVI in Welle 1 vorkommen (Empfehlung: je eines), oder soll Welle 1 nur Core-Bereichs-Items enthalten?
2. EVI-04 und EL-03: Die Optionen wirken wie eine Qualitätsleiter. Ist das für Musteritems akzeptabel, oder sollen die Optionen vor dem Einsatz sprachlich gleichwertiger werden (das wäre eine Itemänderung, also eine eigene Phase)?
3. EL-06: Ist „eine neue Frage für den nächsten Versuch ableiten“ verständlich genug, oder vorher konkreter fassen („was du beim nächsten Versuch anders prüfst“)?
4. EXP-R1: Wie lässt sich der Einfluss von Selbstvertrauen später auseinanderhalten (z. B. über allgemein hohe Antworten über alle Bereiche)?
5. Welche Mindestfallzahl je Set gilt, bevor eine Ersatz- oder Ergänzungsentscheidung überhaupt diskutiert wird? Vor Datenerhebung festlegen.
6. Werden die Forschungsfragen in fester oder randomisierter Reihenfolge innerhalb des Sets gezeigt (Empfehlung: fest, für Vergleichbarkeit)?
7. Soll ein späterer Ersatz eines Core-Items durch einen Kandidaten eine neue Itemversion bzw. ein neues Manifest auslösen? Ja, gemäß Versionsregeln; mit allen Folgen für die Vergleichbarkeit von Teamberichten.

---

NO IMPLEMENTATION
NO MIGRATION
NO ITEM CHANGE
NO CONSENT CHANGE
NO REPORT CHANGE
NO COMMIT
NO PUSH
NO DEPLOY
