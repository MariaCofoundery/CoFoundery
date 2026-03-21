# Self Report Model – Theoretical Foundation & Validation

## Status

- Modelltyp: heuristisches Entscheidungsmodell
- Validierung: theoretisch begründet, empirisch noch nicht validiert
- Zweck: Transparenz, Prüfbarkeit und Grundlage für spätere empirische Validierung
- Letzte Aktualisierung: 2026-03-20

**Geprüfte Dateien**
- [selfReportSelection.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/selfReportSelection.ts)
- [founderDimensionMeta.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/founderDimensionMeta.ts)
- [selfReportScoring.ts](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/src/features/reporting/selfReportScoring.ts)

**1. Theoretische Modell-Dokumentation**

**Unternehmenslogik**
- Konstrukt: Diese Dimension bildet ab, woran unternehmerische Entscheidungen ausgerichtet werden: stärker an Marktwirkung, strategischer Verwertbarkeit und Skalierbarkeit oder stärker an Substanz, Aufbau und langfristiger Tragfähigkeit.
- Social Impact `2`: Die Dimension beeinflusst Richtung, Prioritäten und Grundsatzentscheidungen sichtbar, aber nicht in jeder Alltagsszene sofort interpersonal. Sie erzeugt eher strategische Reibung als tägliche Mikrokonflikte.
- Coordination Risk `2`: Unterschiedliche Unternehmenslogiken erzeugen Abstimmungsbedarf, weil Teams klären müssen, worauf sie Entscheidungen gründen. Das Risiko ist real, aber meist geringer als bei Zusammenarbeit, Commitment oder Konflikten.
- Gewichtungsbegründung: Mittlere Gewichtung, weil die Wirkung stark ist, aber oft phasenweise auftritt. Die Annahme dahinter ist: Unternehmenslogik prägt Kurs und Priorisierung, aber weniger die tägliche Taktung.

**Entscheidungslogik**
- Konstrukt: Beschreibt, ob jemand Entscheidungen eher über Analyse, Begründbarkeit und Absicherung oder eher über Urteil, Gespür und situative Verdichtung trifft.
- Social Impact `2`: Unterschiedliche Entscheidungsstile beeinflussen Diskussionen, Entscheidungstempo und Nachvollziehbarkeit, aber nicht jede Form von Teamreibung wird dadurch sofort sozial aufgeladen.
- Coordination Risk `2`: Wenn nicht klar ist, wie entschieden wird, entstehen Schleifen, Frust und Verzögerung. Das Risiko ist spürbar, aber meist begrenzter als bei Arbeitsmodus oder Konfliktstil.
- Gewichtungsbegründung: Ebenfalls mittlere Gewichtung. Die Annahme ist: Diese Dimension beeinflusst Zusammenarbeit deutlich, aber eher über Prozesse als über Beziehungsspannung.

**Risikoorientierung**
- Konstrukt: Beschreibt, wie Unsicherheit, Wagnis und Absicherung im Alltag gelesen werden.
- Social Impact `2`: Unterschiedliche Risikohaltungen können starke Diskussionen auslösen, sind aber oft sachbezogener als interpersonelle Alltagskonflikte.
- Coordination Risk `1`: Risiko erzeugt weniger laufende Koordinationslast als etwa Abstimmung oder Commitment. Es ist eher ein Konflikt an Weggabelungen als ein dauernder Arbeitsmodus.
- Gewichtungsbegründung: Niedrigstes Koordinationsgewicht, weil Risikoorientierung typischerweise nicht in jedem Arbeitsschritt Abstimmung verlangt. Die Annahme lautet: Risiko ist relevant, aber nicht permanent kopplungsintensiv.

**Arbeitsstruktur & Zusammenarbeit**
- Konstrukt: Beschreibt, wie eng jemand im Alltag abgestimmt arbeiten und sichtbar verbunden bleiben will.
- Social Impact `3`: Diese Dimension ist im Teamalltag sofort spürbar. Unterschiedliche Erwartungen an Eigenraum, Sichtbarkeit und Rückkopplung werden schnell interpersonal.
- Coordination Risk `3`: Hier ist Abstimmung selbst der Kern. Wenn Erwartungen nicht passen, entstehen sehr schnell Missverständnisse, gefühlte Entkopplung oder Übersteuerung.
- Gewichtungsbegründung: Höchste Gewichtung auf beiden Achsen. Die Annahme ist: Unterschiede im Arbeitsmodus greifen direkt in die tägliche Zusammenarbeit ein.

**Commitment**
- Konstrukt: Beschreibt, wie stark das Startup im Alltag priorisiert wird und welches Einsatzniveau jemand für sich und das Team erwartet.
- Social Impact `3`: Unterschiedliche Priorisierung wird leicht sozial interpretiert, selbst wenn sie fachlich nur eine andere Lebens- und Arbeitsrealität abbildet.
- Coordination Risk `3`: Unterschiedliche Erwartungen an Verfügbarkeit, Intensität und Einsatz erzeugen laufenden Abstimmungsbedarf.
- Gewichtungsbegründung: Höchste Gewichtung, weil Commitment-Differenzen schnell als Fairness-, Ernsthaftigkeits- oder Erwartungsfrage erlebt werden. Die Annahme dahinter ist: Diese Dimension wirkt stark auf Spannung und Arbeitsrhythmus.

**Konfliktstil**
- Konstrukt: Beschreibt, wie Spannungen angesprochen und bearbeitet werden: eher reflektierend und verzögert oder eher direkt und früh.
- Social Impact `3`: Konfliktstil ist per Definition interpersonal. Unterschiede werden schnell als Ton-, Timing- oder Sicherheitsfrage erlebt.
- Coordination Risk `3`: Wenn ein Team unterschiedliche Konfliktrhythmen hat, stauen sich Themen oder eskalieren unnötig. Das ist ein permanenter Koordinationshebel.
- Gewichtungsbegründung: Höchste Gewichtung, weil Konfliktstil unmittelbar auf Beziehung und Arbeitsfähigkeit wirkt. Die Annahme lautet: Hier wird Reibung nicht nur beschrieben, sondern oft direkt produziert oder abgepuffert.

**2. Friction-Logik**

**Warum klare Pole über Social Impact laufen**
- Ein klarer Pol bedeutet: Die Person ist deutlich festgelegt.
- Festlegung wird für andere dann relevant, wenn sie Entscheidungen, Arbeitsstil oder Erwartungen sozial wirksam macht.
- Deshalb wird Reibung bei klaren Profilen über `orientationStrength * socialImpactWeight` modelliert: nicht weil Klarheit an sich problematisch wäre, sondern weil klare Präferenzen im Team sichtbare Konsequenzen haben.

**Warum moderate Ausprägungen zwischen Pol und Koordination unterscheiden**
- Moderate Ausprägungen sind psychologisch ambivalent: Sie können schon deutlich genug sein, um Verhalten zu prägen, oder noch offen genug, um Abstimmungsprobleme zu erzeugen.
- Deshalb fragt die Engine hier nicht nach Feintuning, sondern nach einer sauberen Fallunterscheidung:
- Wenn eine Dimension typischerweise hohe Koordinationslast trägt und die Ausprägung noch unterhalb klarer Festlegung liegt, wird Reibung eher aus Unklarheit modelliert.
- In allen anderen moderaten Fällen wird Reibung eher über den noch sichtbaren Pol modelliert.

**Warum balancierte Felder über Coordination laufen**
- Balanciert heißt im Modell nicht automatisch harmonisch.
- Balanciert heißt oft: Die Person ist situativ, kontextabhängig oder nicht klar festgelegt.
- Gerade in Dimensionen mit hoher Koordinationslast erzeugt das Abstimmungsbedarf: Wann gilt welche Arbeitsweise, welches Einsatzniveau, welcher Umgang mit Spannung?
- Deshalb wird Balance als offenes Koordinationsfeld modelliert.

**Welche Annahme dahinter steckt**
- Klarheit erzeugt Reibung dann, wenn sie Verhalten stabil macht und andere darauf reagieren müssen.
- Unklarheit erzeugt Reibung dann, wenn Teams nicht wissen, worauf sie sich einstellen sollen.
- Das Modell nimmt also zwei Quellen von Spannung an: dominante Präferenz und offene Abstimmungsbedürftigkeit.

**Welche Alternativen es theoretisch gäbe**
- Rein lineares Modell: nur stärkere Pole = mehr Reibung. Das wäre einfacher, würde aber balancierte Spannungsfelder unterschätzen.
- Rein koordinatives Modell: nur Unklarheit = Reibung. Das würde starke, interpersonell wirksame Profile unterschätzen.
- Komplexes Mischmodell mit Varianz, Item-Streuung und Interaktionen. Das wäre theoretisch feiner, aber für eine Self-Report-Selection-Engine schnell zu unübersichtlich.
- Warum das aktuelle Modell sinnvoll ist: Es hält zwei psychologisch plausible Spannungsquellen getrennt, bleibt aber regelbasiert und erklärbar.

**3. Selection-Logik begründen**

**PrimarySignal**
- Funktion: Liefert das psychologische Kernsignal des Profils.
- Auswahl: Stärkste klare Dimension, sonst stärkste moderate, sonst stärkstes verbleibendes Signal.
- Sinn: Der Report braucht einen klaren Anker statt sechs gleich lauter Achsen.
- Risiko: Dominante, aber alltagsfernere Dimensionen können das Profil stärker prägen, als es subjektiv erlebt wird.

**WorkModeSignal**
- Funktion: Ergänzt den Kern um eine zweite Perspektive aus einer anderen Familie.
- Auswahl: stärkstes Signal aus anderer Familie.
- Sinn: Verhindert, dass der Hero nur eine einzige psychologische Linie erzählt.
- Risiko: Das zweitwichtigste reale Thema kann unterdrückt werden, wenn es in derselben Familie wie das PrimarySignal liegt.

**TensionCarrier**
- Funktion: Benennt den Bereich, in dem Reibung oder Missverständnisse im Alltag am ehesten entstehen.
- Auswahl: stärkstes nicht redundantes Friktionssignal, Primary wird ausgeschlossen, WorkMode möglichst ebenfalls.
- Sinn: Der Report soll nicht nur Stärke, sondern auch soziale Folge sichtbar machen.
- Risiko: Die Friktionslogik kann einen Bereich priorisieren, der im Alltag zwar sensibel, aber subjektiv nicht zentral erlebt wird.

**PatternDimensions**
- Funktion: Verdichtet das Profil auf drei unterscheidbare Muster.
- Auswahl: maximal ein Muster pro Familie, Duplication Groups werden kollabiert.
- Sinn: Verhindert semantische Überfrachtung und Dopplung.
- Risiko: Das Modell opfert Differenzierung zugunsten von Klarheit. Zwei relevante Achsen können zu einer Erzählung zusammenschrumpfen.

**ChallengeDimensions**
- Funktion: Identifiziert wahrscheinliche Reibungsstellen, nicht bloß die Gegenpole der Stärken.
- Auswahl: Primärsignal, dann Reibung aus anderer Familie, dann offenes Feld oder Friktions-Fallback.
- Sinn: Herausforderungen sollen sozial plausibel sein, nicht rein spiegelbildlich.
- Risiko: Das Modell kann bei stark polaren Profilen zu vorhersehbar sein und bei sehr balancierten Profilen zu stark auf Unklarheit fokussieren.

**ComplementDimensions**
- Funktion: Leitet Ergänzungsdynamiken ab.
- Auswahl: `counterweight` aus PrimarySignal, `regulator` aus TensionCarrier bzw. starkem Reibungssignal, `rhythm_partner` aus WorkModeSignal bzw. Kollaborationsfamilie.
- Sinn: Ergänzung wird nicht als „Gegenteil“, sondern als funktionale Teamrolle modelliert.
- Risiko: Durch Duplication Groups und Redundanzfilter können plausible Ergänzungsprofile entfallen, wenn sie zu nah aneinander liegen.

**4. Systemische Bias und Grenzen**

- Harte Schwellen bei `orientationStrength` erzeugen Sprungstellen. Ein Score knapp über oder unter 6 bzw. 10 kann dieselbe Person anders klassifizieren.
- Duplication Groups reduzieren Komplexität, blenden aber reale Doppelbedeutungen aus. Zum Beispiel können Entscheidungslogik und Risikoorientierung gemeinsam wichtig sein, obwohl nur eine sichtbar bleibt.
- Hero Priority bevorzugt bestimmte Dimensionen strukturell. Das erhöht Lesbarkeit, kann aber andere alltagsnahe Signale systematisch abwerten.
- Balancierte Profile werden leicht als „offen“ oder „umschaltend“ erzählt. Für Personen mit bewusst integrierter, stabiler Mitte kann das zu unpräzise sein.
- Profile mit situativer Flexibilität, Rollenwechseln oder phasenabhängigem Verhalten werden grundsätzlich gröber erfasst als klar polarisierte Profile.
- Das Modell ist dimensionsbasiert, nicht klinisch oder diagnostisch. Es bildet arbeitsbezogene Präferenzmuster ab, keine tiefen Persönlichkeitsmerkmale.
- Es gibt ein Risiko der Überinterpretation: hohe Reibung in der Engine bedeutet nicht automatisch reales Konfliktniveau im Team.

**5. Validierungskonzept**

**Prüfbare Hypothesen**
- Höherer `frictionScore` in einer Dimension geht mit häufiger berichteter Teamspannung in genau diesem Themenfeld einher.
- Hohe `coordinationRiskWeight`-Dimensionen erzeugen häufiger Missverständnisse bei balancierten Profilen als niedrige.
- PrimarySignal und PatternDimensions werden von Nutzer:innen als zutreffender erlebt als zufällig ausgewählte Dimensionen.
- TensionCarrier sagt reale Gesprächs- oder Abstimmungsprobleme besser voraus als bloße Extremwerte.

**Benötigte Daten**
- Echte Founder-Teams, idealerweise mit Längsschnitt statt Einmalmessung.
- Selbstbericht pro Founder und Fremdeinschätzung durch Co-Founder.
- Konflikt- oder Spannungsindikatoren aus realen Teamverläufen.
- Optional Advisor- oder Coach-Einschätzungen als dritte Perspektive.
- Wiederholungsmessungen, um Stabilität und Situationssensitivität zu prüfen.

**Sinnvolle Tests**
- Face Validity: Erkennen Nutzer:innen ihre Muster wieder?
- Kriteriumsvalidität: Stimmen hohe Spannungsfelder mit real berichteten Konflikten überein?
- Konvergente Validität: Passt die Auswahl grob zu beobachtbarem Arbeitsverhalten?
- Diskriminante Validität: Werden unterschiedliche Profile tatsächlich unterschiedlich beschrieben?
- Stabilität/Sensitivity: Führen kleine Scoreänderungen zu plausiblen, nicht chaotischen Output-Änderungen?

**Wie Gewichte später angepasst werden könnten**
- Nicht global und gleichzeitig, sondern dimensionsweise.
- Zuerst prüfen, wo Prognosekraft oder Face Validity schwach ist.
- Dann einzelne Gewichte oder Schwellen minimal verändern und gegen alte Versionen vergleichen.
- Duplication Groups nur ändern, wenn klar ist, dass relevante Unterschiede systematisch verlorengehen.
- Wichtig: nie gleichzeitig Gewichte, Schwellen und Auswahlregeln ändern, sonst wird das Modell nicht mehr interpretierbar.

**6. Interpretationsregeln**

- Outputs sind als arbeitsbezogene Profilhinweise zu lesen, nicht als Charakterurteil.
- Ein hoher `frictionScore` bedeutet erhöhte Wahrscheinlichkeit für Reibung in einem Themenfeld, nicht automatisch Konfliktintensität.
- Balanciert bedeutet nicht neutral, widersprüchlich oder unreif. Es bedeutet im Modell häufig: situativ, kontextabhängig oder abstimmungsbedürftig.
- Klare Pole bedeuten nicht besser oder schlechter. Sie bedeuten größere Vorhersagbarkeit und damit oft klarere soziale Konsequenzen.
- Duplication Groups bedeuten: Das System priorisiert Lesbarkeit vor Vollständigkeit. Nicht sichtbare Dimensionen sind deshalb nicht bedeutungslos.
- Complement-Rollen sind funktionale Ergänzungen, keine Matching-Versprechen.
- Besonders vorsichtig sollte man sein bei Profilen nahe an Schwellen, bei sehr balancierten Profilen und bei Personen mit stark phasenabhängigem Verhalten.

**Fachliche Gesamtbewertung**
- Stark am Modell: Es trennt verständlich zwischen Dominanz-Reibung und Koordinations-Reibung.
- Stärker prüfbedürftig: harte Schwellen, Duplication Groups und die Priorisierung bestimmter Familien im Hero.
- Besonders valide erwartbar: Arbeitsstruktur & Zusammenarbeit, Commitment, Konfliktstil.
- Besonders sorgfältig zu beobachten: Unternehmenslogik und balancierte Profile, weil dort Interpretation schnell allgemeiner wird.

Nichts wurde geändert; das ist eine fachliche Dokumentation der bestehenden Engine.
