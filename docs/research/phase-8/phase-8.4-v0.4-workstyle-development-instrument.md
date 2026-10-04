# MADE2FOUND Founder Workstyle Development Instrument v0.4

## Zweck und Status

Inhaltliche Version `8.4-v0.4`, Assessment `founder-workstyle-pretest / 8.5a-v3`,
DB-Instrument `founder-workstyle-pretest-8-5a-v3`, Manifest `3.0.0`.

Dieses Entwicklungsinstrument beschreibt typische Arbeitsweisen in unsicheren,
entscheidungs- und zusammenarbeitsintensiven Situationen. Es ist **kein validierter
psychologischer Test** und kein Instrument für High-Stakes-Auswahl.
Die folgenden 52 Itemtexte und Antwortoptionen stammen unverändert aus der gelieferten
Spezifikation. Wiederverwendete IDs sind nur zusammen mit Instrument- und Itemversion
eindeutig; v0.2/v0.3 werden nicht überschrieben oder umgedeutet.

## Modell und Definitionen

- **EVI – Evidenzorientierung:** Prüfen von Annahmen, Gegenargumenten und abweichender Evidenz sowie Revidieren einer Einschätzung.
- **EXP – Erfahrungsbasierte Urteilsnutzung:** Einfluss vertrauter Muster und früherer Erfahrungen auf eine Einschätzung.
- **EL – Experimentelles Lernen:** Offene Fragen durch Versuche bearbeiten und deren Ergebnisse für weitere Schritte nutzen.
- **VOICE – Konstruktive Voice / sachlicher Dissens:** Sachliche Einwände, offene Punkte und abweichende Einschätzungen in Zusammenarbeit sichtbar machen.
- **AMB – Ambiguitätstoleranz:** Erlebtes Unbehagen bei mehreren plausiblen, widersprüchlichen oder noch offenen Deutungen. Keine automatische Umpolung in einen Toleranzscore.
- **ORG – Arbeitsorganisation & Selbststeuerung:** Eigenständiges Strukturieren, Priorisieren, Nachhalten und Anpassen der Arbeit; potenziell mehrere Facetten.
- **DEC – Entscheidungsschwelle / Decision Commitment Threshold:** Candidate Area: Offenhalten gegenüber vorläufigem Festlegen unter verbleibender Unsicherheit. Keine bestätigte siebte Dimension.
- **FS – Aktives Perspektivensuchen:** Research Facet: gezieltes Hinzuziehen anderer Sichtweisen. Keine fertige oder eigenständige Skala.

## Status und Datengrenzen

Die wissenschaftlichen Status `core`, `core_research`, `candidate_core`, `research`
bleiben im Manifest erhalten. Technisch verwendet die bestehende Architektur weiterhin
`core` und `research_only`. Konservative Zuordnung: 29 `core`-Items im produktnahen
Assessment-Stack; sechs `core_research`, vier `candidate_core` und 13 `research`-Items
im privaten Research-Speicher. Damit werden ungeklärte Kandidaten nicht über normale
Produktfreigaben verbreitet. DEC bleibt Candidate Area, FS ausschließlich Research.
Diese Zuordnung ist eine technische Freigabegrenze, keine empirische Qualitätsbewertung.

## Antwortformate

- `likelihood`: sehr unwahrscheinlich | eher unwahrscheinlich | teils/teils | eher wahrscheinlich | sehr wahrscheinlich
- `influence`: gar nicht | eher wenig | teilweise | eher stark | sehr stark
- `seriousness`: gar nicht ernst | eher wenig ernst | teilweise | eher ernst | sehr ernst
- `ambiguity_discomfort`: überhaupt nicht unangenehm | eher nicht unangenehm | teils/teils | eher unangenehm | sehr unangenehm
- `comparative`: deutlich eher A | eher A | eher B | deutlich eher B

W = `likelihood`, S = `influence`, S angepasst = `seriousness`, U = `ambiguity_discomfort`,
FC = `comparative`. `behavioral` verwendet die beim Item dokumentierten Optionen A–E.
W/S/U werden roh mit 1–5 codiert. FC nutzt `strong_a`, `lean_a`, `lean_b`, `strong_b`;
Behavioral nutzt die stabilen Kennungen A–E. Beide erhalten **keine numerische Kodierung**.
Alle 52 Items bieten zusätzlich „Kann ich noch nicht einschätzen“ als NULL/Missing an.

A/B wird in dieser Fassung fest in der Reihenfolge A, B dargestellt. Die tatsächlich
angezeigte Reihenfolge wird separat mit der Antwort gespeichert, auch bei Missing.
Keine spontane Client-Randomisierung. Spätere kontrollierte Varianten brauchen eine
neue versionierte Präsentationsdefinition; die technische Form bleibt in v3 NULL.

## Eingefrorene Präsentationsreihenfolge: mixed-v1

1. `ORG-01`
2. `EXP-01`
3. `VOICE-01`
4. `AMB-01`
5. `DEC-01`
6. `EL-01`
7. `EVI-01`
8. `EXP-02`
9. `ORG-03`
10. `AMB-02`
11. `EL-03`
12. `VOICE-02`
13. `EVI-02`
14. `DEC-02`
15. `EXP-03`
16. `FS-R1`
17. `AMB-04`
18. `ORG-04`
19. `EL-02`
20. `EXP-04`
21. `VOICE-03`
22. `EL-05`
23. `DEC-03`
24. `AMB-05`
25. `ORG-02`
26. `EVI-03`
27. `EL-04`
28. `ORG-05`
29. `EXP-05`
30. `VOICE-04`
31. `AMB-06`
32. `DEC-04`
33. `EVI-05`
34. `ORG-06`
35. `EVI-04`
36. `FS-R2`
37. `EXP-06`
38. `VOICE-05`
39. `AMB-03`
40. `ORG-07`
41. `EVI-06`
42. `EL-06`
43. `VOICE-06`
44. `DEC-R1`
45. `AMB-R1`
46. `VOICE-R1`
47. `EVI-R1`
48. `ORG-08`
49. `EL-R1`
50. `EXP-R1`
51. `ORG-R1`
52. `DEC-R2`

## EVI – Evidenzorientierung

### EVI-01

Du hast drei Möglichkeiten vor dir und eine davon gefällt dir spontan am besten. Wie wahrscheinlich ist es, dass du gezielt nach Gründen suchst, die gegen deinen Favoriten sprechen?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EVI-02

Eine wichtige Entscheidung hängt an einer Annahme, bei der du dir nicht sicher bist. Wie wahrscheinlich ist es, dass du versuchst, genau diese Annahme zu prüfen, bevor du dich festlegst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EVI-03

Du hast dich entschieden. Am nächsten Tag bekommst du neue Informationen, die deutlich dagegen sprechen. Wie wahrscheinlich ist es, dass du deine Entscheidung noch einmal ernsthaft überprüfst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EVI-04

Ein für euer Vorhaben wichtiges Ergebnis fällt deutlich anders aus als erwartet. Was beschreibt am ehesten, wie du damit umgehst?

- Wissenschaftlicher Status: `core_research`
- Antwortformat: `behavioral`
- Herkunft: `adapted`

#### Optionen

- A: Ich nehme erst einmal zur Kenntnis, dass es anders gelaufen ist, und beobachte, ob sich das wiederholt.
- B: Ich schaue, ob es einen naheliegenden Grund gibt, der die Abweichung erklärt.
- C: Ich vergleiche einige mögliche Erklärungen und entscheide dann, ob ich weiter nachgehen will.
- D: Ich versuche herauszufinden, welche Erklärung am besten zu dem Ergebnis passt.
- E: Ich prüfe bewusst auch Erklärungen, die meiner ersten Vermutung widersprechen.
### EVI-05

Jemand im Team sieht eine Sache anders als du und bringt einen Punkt, den du nachvollziehen kannst. Wie wahrscheinlich ist es, dass du deine eigene Einschätzung noch einmal prüfst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EVI-06

Zwei Quellen, die du grundsätzlich für seriös hältst, widersprechen sich bei einer wichtigen Frage. Wie wahrscheinlich ist es, dass du genauer prüfst, woher der Unterschied kommt?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `new`
### EVI-R1

Im Team gibt es schnell Zustimmung für eine Lösung. Dir fallen noch offene Punkte auf. Wie wahrscheinlich ist es, dass du gezielt prüfst, was gegen die Lösung sprechen könnte?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
- Research-Thema / Confound: EVI vs. Voice / Konformität.

## EXP – Erfahrungsbasierte Urteilsnutzung

### EXP-01

Eine Situation kommt dir sofort bekannt vor. Du kannst noch nicht genau sagen, warum, erkennst aber ein Muster von früher. Wie ernst nimmst du diesen Eindruck?

- Wissenschaftlicher Status: `core`
- Antwortformat: `seriousness`
- Herkunft: `adapted`
### EXP-02

Auf dem Papier sieht eine Lösung überzeugend aus. Aus ähnlichen Situationen kennst du aber Dinge, die dich skeptisch machen. Wie stark beeinflusst diese Erfahrung deine Einschätzung?

- Wissenschaftlicher Status: `core`
- Antwortformat: `influence`
- Herkunft: `adapted`
### EXP-03

Zwei Möglichkeiten sehen nach den verfügbaren Informationen ungefähr gleich gut aus. Eine davon erinnert dich stark an eine ähnliche Situation, die du schon erlebt hast. Wie stark beeinflusst diese Erfahrung deine Entscheidung?

- Wissenschaftlicher Status: `core`
- Antwortformat: `influence`
- Herkunft: `adapted`
### EXP-04

Du stehst vor einem Problem, das du in ähnlicher Form schon mehrfach erlebt hast. Wie stark nutzt du diese Erfahrungen, um einzuschätzen, worauf es diesmal ankommen könnte?

- Wissenschaftlicher Status: `core`
- Antwortformat: `influence`
- Herkunft: `adapted`
### EXP-05

Eine Situation ähnelt etwas, das du schon kennst, aber nicht in allen Punkten. Wie stark nutzt du deine Erfahrung trotzdem als Orientierung?

- Wissenschaftlicher Status: `core_research`
- Antwortformat: `influence`
- Herkunft: `adapted`
- Research-Thema / Confound: Transfer von Erfahrung auf nur teilweise ähnliche Situationen.
### EXP-06

Ihr müsst entscheiden, obwohl noch nicht alle Informationen da sind. Du kennst das Thema aber sehr gut. Wie stark stützt du dich dann zusätzlich auf deine Erfahrung?

- Wissenschaftlicher Status: `core`
- Antwortformat: `influence`
- Herkunft: `new`
### EXP-R1

Du kennst dich mit einem Thema gut aus und hast ziemlich schnell ein Gefühl dafür, was funktionieren könnte. Wie stark beeinflusst dieser erste Eindruck deine weitere Einschätzung?

- Wissenschaftlicher Status: `research`
- Antwortformat: `influence`
- Herkunft: `adapted`
- Research-Thema / Confound: erfahrungsbasierte Mustererkennung vs. unspezifisches Bauchgefühl/Affekt.

## EL – Experimentelles Lernen

### EL-01

Du schwankst zwischen zwei Wegen und beide lassen sich im Kleinen ausprobieren. Wie wahrscheinlich ist es, dass du erst etwas testest, bevor du dich festlegst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EL-02

Ihr habt zwei plausible Ansätze und kommt im Gespräch nicht wirklich weiter. Beide ließen sich mit wenig Aufwand ausprobieren. Wie wahrscheinlich ist es, dass du einen Test vorschlägst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EL-03

Du hast etwas ausprobiert und bekommst ein Ergebnis, mit dem du so nicht gerechnet hast. Was passiert bei dir eher als Nächstes?

- Wissenschaftlicher Status: `core_research`
- Antwortformat: `behavioral`
- Herkunft: `adapted`

#### Optionen

- A: Ich schaue erst einmal, ob sich das Ergebnis noch einmal zeigt.
- B: Ich versuche zunächst zu verstehen, wodurch es entstanden sein könnte.
- C: Ich verändere etwas und probiere eine nächste Variante aus.
- D: Ich nutze das Ergebnis zusammen mit dem, was ich sonst schon weiß, für die nächste Entscheidung.
- E: Ich formuliere daraus eine neue Frage, die ich als Nächstes überprüfen möchte.
### EL-04

Du bist unsicher, wie andere auf eine Idee, ein Angebot oder einen Lösungsansatz reagieren würden. Mit überschaubarem Aufwand könntest du eine einfache Version zeigen oder ausprobieren lassen. Wie wahrscheinlich ist es, dass du das früh machst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EL-05

Ein erster Versuch bringt keine klare Antwort. Wie wahrscheinlich ist es, dass du gezielt etwas veränderst und es noch einmal probierst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### EL-06

Ein erster Versuch spricht gegen deine ursprüngliche Idee. Wie wahrscheinlich ist es, dass du daraus eine neue Frage für den nächsten Versuch ableitest?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `new`
- Research-Thema / Confound: experimentelles Lernen vs. Beharrlichkeit/Persistenz.
### EL-R1

Du willst etwas Neues ausprobieren. Wie wahrscheinlich ist es, dass du dir vorher klarmachst, woran du erkennen würdest, ob der Versuch dir weiterhilft?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
- Research-Thema / Confound: Workstyle vs. Methodenkompetenz.

## VOICE – Konstruktive Voice / sachlicher Dissens

### VOICE-01

Ihr seid euch bei einer Entscheidung eigentlich schon einig. Dir fällt aber noch ein Punkt auf, der dagegen spricht. Wie wahrscheinlich ist es, dass du ihn trotzdem noch ansprichst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### VOICE-02

Du erfährst etwas Unangenehmes, das für eure gemeinsame Arbeit wichtig ist. Wie wahrscheinlich ist es, dass du es zeitnah ansprichst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### VOICE-03

Ein schwieriges Thema wurde vertagt und danach nicht wieder aufgegriffen. Für dich ist aber noch etwas Wichtiges offen. Wie wahrscheinlich ist es, dass du das Thema selbst wieder ansprichst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### VOICE-04

Eine Entscheidung wird getroffen, die du fachlich für falsch hältst. Wie wahrscheinlich ist es, dass du sagst, dass du sie anders einschätzt?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### VOICE-05

Die Runde möchte ein Thema abschließen, aber für dich ist ein wichtiger Punkt noch offen. Wie wahrscheinlich ist es, dass du sagst, dass du noch nicht so weit bist?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### VOICE-06

Du hast einem Plan zunächst zugestimmt und merkst später, dass du ihn inzwischen anders siehst. Wie wahrscheinlich ist es, dass du das selbst wieder ansprichst?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `new`
- Research-Thema / Confound: Voice vs. EVI/Revidieren.
### VOICE-R1

Im Team sind sich alle schnell einig. Du siehst aber noch ein Risiko. Wie wahrscheinlich ist es, dass du es trotzdem ansprichst?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
- Research-Thema / Confound: Voice vs. Konformitätsresistenz.

## AMB – Ambiguitätstoleranz

### AMB-01

Du bekommst zur selben Idee völlig unterschiedliche Rückmeldungen und kannst noch nicht einschätzen, welche davon wichtiger ist. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `core`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `adapted`
### AMB-02

Es gibt mehrere plausible Erklärungen, aber gerade lässt sich nicht klären, welche stimmt. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `core`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `adapted`
### AMB-03

Bei einer wichtigen Entwicklung sind mehrere Ausgänge möglich, aber gerade lässt sich keiner davon verlässlich vorhersagen. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `research`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `adapted`
- Research-Thema / Confound: Ambiguität vs. allgemeine Zukunftsunsicherheit.
### AMB-04

Neue Informationen machen die Lage nicht klarer, sondern eröffnen noch weitere mögliche Erklärungen. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `core`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `adapted`
### AMB-05

Ihr müsst mit einem Thema weiterarbeiten, obwohl eine wichtige Frage noch offen ist. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `core`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `adapted`
### AMB-06

Zwei Menschen, deren Einschätzung du sehr ernst nimmst, beurteilen dieselbe Situation völlig unterschiedlich. Im Moment lässt sich nicht klären, wer eher recht hat. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `core_research`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `new`
### AMB-R1

Du planst die nächsten Wochen, obwohl sich zwei wichtige Rahmenbedingungen noch deutlich verändern könnten. Wie unangenehm ist das für dich?

- Wissenschaftlicher Status: `research`
- Antwortformat: `ambiguity_discomfort`
- Herkunft: `adapted`
- Research-Thema / Confound: Ambiguität vs. Planungs-/Zukunftsunsicherheit.

## ORG – Arbeitsorganisation & Selbststeuerung

### ORG-01

Bei einem größeren Vorhaben: Wie wahrscheinlich ist es, dass du dir zuerst konkrete nächste Schritte klarmachst, bevor du richtig loslegst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### ORG-02

Eine Aufgabe läuft über mehrere Wochen und niemand setzt dir Zwischentermine. Wie wahrscheinlich ist es, dass du dir selbst Punkte setzt, an denen du schaust, wo du stehst?

- Wissenschaftlicher Status: `core`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
### ORG-03

Mehrere wichtige Aufgaben konkurrieren gleichzeitig um deine Aufmerksamkeit. Was beschreibt dich eher?

- Wissenschaftlicher Status: `core`
- Antwortformat: `comparative`
- Herkunft: `adapted`

#### Optionen

- A: Ich halte mehrere davon parallel in Bewegung, damit nichts ganz stehen bleibt.
- B: Ich konzentriere mich stärker auf wenige Dinge und akzeptiere, dass anderes warten muss.
### ORG-04

Eine Aufgabe dauert deutlich länger als gedacht. Was beschreibt dich eher?

- Wissenschaftlicher Status: `core`
- Antwortformat: `comparative`
- Herkunft: `adapted`

#### Optionen

- A: Ich versuche zunächst, die Aufgabe wie geplant zu Ende zu bringen, bevor ich den Rest neu sortiere.
- B: Ich passe meinen weiteren Plan früh an die neue Situation an.
### ORG-05

Über längere Zeit kommt mehr Arbeit rein, als du realistisch schaffen kannst. Was beschreibt dich eher?

- Wissenschaftlicher Status: `core_research`
- Antwortformat: `comparative`
- Herkunft: `adapted`

#### Optionen

- A: Ich versuche, möglichst viel davon weiterzuführen und verschiebe eher im Kleinen.
- B: Ich ziehe irgendwann eine klare Grenze und entscheide neu, was warten oder wegfallen muss.
### ORG-06

Niemand gibt dir vor, wann oder in welcher Reihenfolge etwas erledigt werden muss. Wie stark strukturierst du dir den Ablauf selbst?

- Wissenschaftlicher Status: `core_research`
- Antwortformat: `influence`
- Herkunft: `new`
### ORG-07

Du arbeitest gerade konzentriert an etwas Wichtigem und eine ebenfalls wichtige neue Anfrage kommt rein. Was beschreibt dich eher?

- Wissenschaftlicher Status: `core`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich unterbreche relativ schnell und kümmere mich um das Neue.
- B: Ich halte zunächst an dem fest, woran ich gerade arbeite.
### ORG-08

Dein Plan funktioniert grundsätzlich noch, aber mehrere kleinere Dinge laufen anders als gedacht. Was beschreibt dich eher?

- Wissenschaftlicher Status: `core`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich ändere meinen Plan erst, wenn die Abweichungen wirklich relevant werden.
- B: Ich passe meinen Plan lieber schon bei kleineren Veränderungen an.
### ORG-R1

Du hast zugesagt, etwas bis zu einem bestimmten Zeitpunkt fertigzustellen. Wie wahrscheinlich ist es, dass du zwischendurch prüfst, ob du noch im Plan bist?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `adapted`
- Research-Thema / Confound: Founder-Selbststeuerung vs. allgemeine Gewissenhaftigkeit.

## DEC – Entscheidungsschwelle / Decision Commitment Threshold

### DEC-01

Du hast die wichtigsten Informationen für eine Entscheidung, vollständige Sicherheit gibt es aber noch nicht. Was beschreibt dich eher?

- Wissenschaftlicher Status: `candidate_core`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich lasse die Entscheidung lieber noch etwas offen, falls noch etwas Relevantes auftaucht.
- B: Ich lege mich mit dem jetzigen Stand fest und ändere die Entscheidung später, wenn es einen guten Grund dafür gibt.
### DEC-02

Zwei Möglichkeiten sind weiterhin plausibel. Du könntest noch weiter recherchieren, erwartest aber nicht, dass sich dadurch das Bild grundlegend verändert. Was liegt dir eher?

- Wissenschaftlicher Status: `candidate_core`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich schaue trotzdem noch etwas genauer hin, bevor ich mich festlege.
- B: Ich entscheide mit dem, was ich inzwischen weiß.
### DEC-03

Ihr habt die wichtigsten Argumente für zwei Richtungen besprochen. Einige kleinere Fragen sind noch offen. Was beschreibt dich eher?

- Wissenschaftlicher Status: `candidate_core`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich möchte die offenen Punkte möglichst noch klären, bevor die Entscheidung steht.
- B: Für mich kann die Entscheidung trotzdem schon stehen.
### DEC-04

Für die nächsten Wochen braucht ihr eine Richtung. Ihr wisst aber schon, dass ihr später noch einmal neu entscheiden könnt. Was liegt dir eher?

- Wissenschaftlicher Status: `candidate_core`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich halte die Möglichkeiten noch möglichst lange offen.
- B: Ich entscheide mich für eine vorläufige Richtung und arbeite erst einmal damit.
### DEC-R1

Bei einer wichtigen Entscheidung gibt es keinen Zeitdruck. Die wesentlichen Informationen liegen aber vor. Was beschreibt dich eher?

- Wissenschaftlicher Status: `research`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ohne Zeitdruck lasse ich die Entscheidung lieber noch etwas offen.
- B: Wenn ich genug weiß, lege ich mich auch ohne äußeren Zeitdruck fest.
### DEC-R2

Zwei Wege sind weiterhin ungefähr gleich plausibel. Wie wahrscheinlich ist es, dass du dich trotzdem für einen davon festlegst, auch wenn keine neue Information hinzukommt?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `new`

## FS – Aktives Perspektivensuchen

### FS-R1

Du hast zu einer wichtigen Frage schon eine eigene Einschätzung. Wie wahrscheinlich ist es, dass du gezielt jemanden fragst, von dem du eine andere Sicht erwartest?

- Wissenschaftlicher Status: `research`
- Antwortformat: `likelihood`
- Herkunft: `new`
### FS-R2

Du kommst bei einer schwierigen Frage nicht weiter. Was liegt dir eher?

- Wissenschaftlicher Status: `research`
- Antwortformat: `comparative`
- Herkunft: `new`

#### Optionen

- A: Ich versuche erst noch selbst, eine klarere Einschätzung zu entwickeln.
- B: Ich hole relativ früh eine andere Perspektive dazu.

## Scoring-Grenzen und bekannte Confounds

Kein Overall Score, keine Typen, Founder-Eignung, Compatibility, Alignmentbewertung,
Erfolgsprognose oder Ampel. Hohe Werte sind nicht automatisch besser. Alle Ergebnisse
bleiben deskriptive Rohantworten; Missing fließt nicht als Skalenmitte ein.
Behavioral-Antworten sind Response Patterns, keine äquidistanten Qualitätsstufen.
FC beschreibt eine Wahl innerhalb eines Items, keine Gegenscores zweier Konstrukte.
DEC wird nicht als bestätigte Reportdimension, FS nicht als Skala ausgegeben.
Vergleiche nur bei gleicher Instrument-, Manifest- und Itemversion sowie ausdrücklichen
Produktfreigaben. Research-only-Inhalte sind von normalen Teamreportinputs ausgeschlossen.

Die itembezogenen Hypothesen sind oben dokumentiert. Übergreifend sind soziale
Erwünschtheit, Kontextabhängigkeit, Methodenkompetenz, Persistenz, Konformität,
allgemeine Gewissenhaftigkeit und Zukunftsunsicherheit mögliche alternative Erklärungen.
Die Herkunftszuordnung `adapted`/`new` beschreibt die Entwicklungsgeschichte, keine
inhaltliche Gleichsetzung alter und neuer Itemversionen.

## Geplante empirische Prüfung – vollständig offen

- Itemverteilungen, Missing Rates und Bearbeitungszeiten
- Floor-/Ceiling-Effekte und soziale Erwünschtheit
- Item discrimination
- Ordinale EFA/CFA und polychorische Korrelationen, sofern für die Antworttypen geeignet
- Omega / Reliabilität nur bei gerechtfertigter Struktur
- Test-Retest
- Konvergente und diskriminante Validität
- Mögliche Cross-Loadings
- DEC als eigenständiger Faktor?
- ORG ein oder mehrere Faktoren?
- EL: Testorientierung vs. Lernschleifen?
- EXP: Mustererkennung vs. Bauchgefühl/Affekt?
- VOICE vs. Konformität?
- AMB vs. Zukunftsunsicherheit?
- FS: Facette von EVI oder eigenständiger Prozess?
- Comparative-/Forced-Choice-Modellierung später separat prüfen

Keine dieser Analysen wurde durchgeführt, simuliert oder als Befund behauptet.
Insbesondere werden Behavioral-/FC-Antworten nicht ungeprüft in ordinale Faktorenanalysen
oder Reliabilitätsberechnungen überführt.
