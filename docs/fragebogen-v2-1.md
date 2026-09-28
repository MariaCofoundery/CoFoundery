# CoFoundery Align — Fragebogen v2.1

_Erzeugt am 2026-09-28 aus der Registratur. Nicht von Hand ändern — Änderungen gehören in die Quelle und dann hierher über `npm run export:questionnaire`._

**Stand:** 2.1.0, Status draft. 36 Fragen in 20 Abschnitten.

**Kein Gesamtwert, keine Dimensionswerte, keine umgepolten Fragen.** Das steht so im geprüften Quelldokument. Die Überschriften sind Gesprächsbereiche, keine gemessenen Dimensionen: Zwei Fragen unter einem Titel ergeben noch keine Skala.

- KEINE GESAMTZAHL UND KEINE DIMENSIONSWERTE. Die Quelle sagt es selbst: overall_score false, dimension_scores false.
- KEIN REVERSE CODING. Jedes Item der Quelle fuehrt reverse_coding false.
- ZWEIERBLOECKE SIND KEINE SUBSKALEN. Ueberschriften sind Gespraechsbereiche, keine gemessenen Dimensionen - so ausdruecklich im Fachreview.
- ORDINAL ODER NOMINAL steht nicht im Format der Quelle, sondern im Fachreview: A01/A02/U04 und I01/I03/X01/X06 sind ordinal, E01 sind Praeferenzstufen, K01/K02/T03/D01/G01/G02a sind Handlungs- oder Regelwahl. Was dort nicht genannt ist, gilt als nominal - das behauptet weniger.


## Entscheidungen vorbereiten

### A01

**Wie häufig möchtest du vor einer wichtigen Entscheidung mehrere Möglichkeiten anhand derselben Kriterien vergleichen?**

- nie
- selten
- manchmal
- häufig
- fast immer

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Analytischer Vergleich als gewünschtes Vorgehen. Kein Beleg für Analysefähigkeit._

### A02

**Wie häufig möchtest du vor einer wichtigen Entscheidung mit vorhandenen Informationen prüfen, ob eine zentrale Annahme zutrifft?**

_Zum Beispiel die Annahme, dass genügend Menschen für euer Angebot bezahlen würden._

- nie
- selten
- manchmal
- häufig
- fast immer

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Prüfung einer Annahme. Ein Beispiel kann die Antwort beeinflussen; im Pretest mit und ohne Beispiel prüfen._

## Erfahrung und Bauchgefühl

### I01

**Wenn du dich in einem Arbeitsgebiet gut auskennst: Wie viel Gewicht möchtest du deinem ersten Eindruck bei einer Entscheidung geben?**

- gar kein Gewicht
- wenig Gewicht
- mittleres Gewicht
- großes Gewicht
- sehr großes Gewicht

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Gewichtung von Erfahrungsintuition, nicht bloß ihr Wahrnehmen._

### I03

**Du kennst dich in einem Arbeitsgebiet gut aus. Die verfügbaren Zahlen sprechen für eine Möglichkeit, dein Bauchgefühl eher dagegen. Wie viel Gewicht möchtest du diesem Bauchgefühl bei deiner Entscheidung geben?**

- gar kein Gewicht
- wenig Gewicht
- mittleres Gewicht
- großes Gewicht
- sehr großes Gewicht

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Gewichtung eines intuitiven Gegensignals. Situation kann zusätzlich Vertrauen in Daten oder Verlustsorgen aktivieren; kein reines Traitmaß._

## Ideen ausprobieren

### E01

**Für eine Entscheidung fehlen euch noch Informationen. Ihr könnt jetzt einen kleinen Versuch starten oder zunächst weitere Informationen sammeln. Welche Vorgehensweise wäre dir lieber?**

_Der Versuch kostet Zeit und Geld. Den maximalen Aufwand habt ihr begrenzt; ihr könnt ihn beenden, ohne weitere Verpflichtungen einzugehen. Er hat keine erheblichen Folgen für andere._

- klar lieber jetzt ausprobieren
- eher jetzt ausprobieren
- beide Vorgehensweisen sind für mich etwa gleich passend
- eher zuerst weitere Informationen sammeln
- klar lieber zuerst weitere Informationen sammeln

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Situativer Zielkonflikt zwischen frühem Versuch und Vorabinformation; keine generelle Risikobereitschaft. Die Mitte bedeutet Gleichpräferenz, nicht Unwissen._

## Eigenständig entscheiden

### U04

**Wie häufig möchtest du in deinem vereinbarten Verantwortungsbereich entscheiden, ohne vorher die Zustimmung der anderen Founder einzuholen?**

_Der Verantwortungsbereich und das Budget sind geklärt. Gemeint sind Entscheidungen ohne wesentliche Folgen für andere Bereiche. Informieren und Zustimmung einholen sind unterschiedliche Dinge._

- nie
- selten
- manchmal
- häufig
- fast immer

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Gewünschte Freigabeunabhängigkeit. Ein hohes Antwortniveau ist möglich und empirisch zu prüfen._

## Informationen teilen

### K01

**Wann möchtest du den anderen Foundern einen Zwischenstand aus deinem Bereich normalerweise zum ersten Mal zeigen?**

_Gemeint ist ein Thema, bei dem die anderen noch nicht mitarbeiten und nicht unmittelbar auf dein Ergebnis warten._

- wenn es eine erste Skizze gibt und noch vieles offen ist
- wenn die Richtung feststeht, aber die Ausarbeitung noch offen ist
- wenn es ein erstes nutzbares Ergebnis gibt
- wenn das Ergebnis aus meiner Sicht fertig ist
- ich möchte das je nach Aufgabe unterschiedlich handhaben – bitte kurz erläutern _(mit Textfeld)_

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Antwort wählen. Gewünschter Zeitpunkt eigener Information. Die letzte Kategorie ist nominal; keine einfache durchgehende Ordinalskala._

### K02

**Welche Standardregel für Informationen aus anderen Bereichen wäre dir am liebsten?**

_Gemeint sind Themen, die deine eigene Arbeit gerade nicht unmittelbar betreffen. Wähle die Regel, die für dich im Alltag im Vordergrund stehen soll._

- ich möchte regelmäßig einen kurzen Überblick erhalten
- ich möchte vor allem über größere Änderungen aktiv informiert werden
- mir reicht ein zugänglicher Arbeitsstand, den ich bei Bedarf selbst ansehen kann
- ich möchte Informationen gezielt erfragen, wenn ich sie brauche
- eine andere Regel – bitte beschreiben _(mit Textfeld)_

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Antwort wählen. Gewünschte Form des Informationszugangs; keine Menge und kein Gegenpol zur Autonomie. Optionen können kombiniert werden, daher explizite Standardpriorität und andere Regel._

## Unterschiede ansprechen

### T03

**In einem Gespräch merkst du, dass du eine geplante Entscheidung anders siehst. Sie betrifft eure weitere Arbeit, muss aber nicht noch am selben Tag getroffen werden. Wann möchtest du deinen Einwand normalerweise erstmals ansprechen?**

_Es geht um das erste Ansprechen. Die ausführliche Klärung kann später stattfinden._

- noch im laufenden Gespräch
- nach dem Gespräch, aber noch am selben Arbeitstag
- am nächsten Arbeitstag
- nach mehr als einem Arbeitstag
- das hängt für mich von der Tragweite ab – bitte kurz erläutern _(mit Textfeld)_

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Antwort wählen. Ansprachezeitpunkt unter eingegrenzter Dringlichkeit. Ersetzt T03 und T06; kein Konfliktkompetenzmaß._

## Die eigene Sicht ausdrücken

### D01

**Wenn du einen sachlichen Einwand einbringen möchtest: Welcher Einstieg passt am ehesten zu dir?**

- „Ich sehe das anders, weil …“
- „Ich habe bei diesem Punkt Bedenken: …“
- „Wie würde unser Vorschlag mit … umgehen?“
- „Ich würde gern noch diese Möglichkeit anschauen: …“
- ein anderer Einstieg – bitte formulieren _(mit Textfeld)_

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Antwort wählen. Bevorzugter Gesprächseinstieg. Nominal, kein objektives Maß für Direktheit; Beispiele können Wissen über gute Kommunikation ansprechen._

## Mit offenen Fragen umgehen

### X01

**Wie wohl fühlst du dich, wenn es für ein Ergebnis mehrere plausible Erklärungen gibt und zunächst offenbleibt, welche zutrifft?**

_Denke an eine offene Frage in eurem Vorhaben, ohne akute finanzielle Notlage._

- sehr unwohl
- eher unwohl
- weder wohl noch unwohl
- eher wohl
- sehr wohl

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Berichtetes Wohlbefinden bei Mehrdeutigkeit; keine Stabilitäts- oder Belastbarkeitsdiagnose._

### X06

**Wie wohl fühlst du dich, wenn für mehrere Wochen offenbleibt, welche von zwei möglichen Richtungen euer Vorhaben einschlagen wird?**

_Beide Richtungen sind grundsätzlich möglich. Gemeint ist keine akute finanzielle Notlage._

- sehr unwohl
- eher unwohl
- weder wohl noch unwohl
- eher wohl
- sehr wohl

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“

_Format: eine Stufe wählen. Subjektives Wohlbefinden bei anhaltender Richtungsungewissheit. Nicht identisch mit X01, nicht automatisch eine gemeinsame Skala._

## Geld und Absicherung

### B01

**Wie viel zusätzliches eigenes Geld wärst du in den nächsten zwölf Monaten höchstens bereit, in das Vorhaben einzubringen, wenn du es vollständig verlieren könntest?**

_Bereits eingebrachtes Geld zählt hier nicht mit. 0 ist eine mögliche Antwort. Du kannst diese Angabe für dich behalten._

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: Betrag mit Währung. Geplante persönliche Einsatz-/Verlustgrenze. Keine Messung der finanziellen Tragfähigkeit; Betrag nicht als verfügbares Vermögen oder verbindliche Zahlungszusage auslegen._

### B05

**Stell dir vor, ihr plant ein Vorhaben, das einen spürbaren Teil eurer verfügbaren Zeit oder eures Budgets beansprucht. Welche Absicherungen möchtest du vorher vereinbaren?**

_Wähle alle Absicherungen, die dir dafür wichtig sind._

- einen kleinen Versuch vor dem größeren Einsatz
- eine feste Obergrenze für die Ausgaben
- einen Zeitpunkt oder eine Bedingung, bei der ihr neu entscheidet, ob ihr weitermacht
- eine Prüfung durch eine fachkundige Person außerhalb des Teams
- eine andere Absicherung – bitte beschreiben _(mit Textfeld)_
- keine zusätzliche Absicherung _(schließt alle anderen aus)_

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: mehrere Antworten möglich. Absicherungswünsche; Zeit/Budget bewusst breiter Gesprächsanlass, nicht eindimensionaler Messindikator. Keine Zusatzabsicherung exklusiv._

## Gemeinsam entscheiden

### G01

**Wenn ihr euch bei einer wichtigen Entscheidung in einem klar zugeordneten Bereich nicht einig werdet: Welche Regel soll dann gelten?**

_Gemeint sind Entscheidungen ohne wesentliche Folgen für andere Bereiche und ohne ausdrücklich vereinbarte gemeinsame Zustimmungspflicht._

- die verantwortliche Person entscheidet nach Rücksprache
- eine vorher benannte andere Person entscheidet nach Rücksprache
- die Mehrheit der Founder entscheidet; für Gleichstand braucht es eine zusätzliche Regel
- die Entscheidung wird nur getroffen, wenn alle Founder zustimmen
- je nach Art der Entscheidung soll eine andere Regel gelten – bitte beschreiben _(mit Textfeld)_

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: eine Antwort wählen. Gewünschte Regel bei Dissens. Mehrheit bei zwei Personen löst den Dissens nicht; keine globale Rangfolge von Entscheidungsmodellen._

## Ein unterbrochenes Gespräch fortsetzen

### G02a

**Was soll nach einer Pause in einem angespannten Gespräch standardmäßig gelten?**

_Beide haben zunächst Zeit, sich zu sammeln. Es besteht kein akuter Zeitdruck._

- wir setzen das Gespräch noch am selben Tag fort
- wir setzen es am nächsten gemeinsamen Arbeitstag fort
- wir legen keine feste Frist fest, vereinbaren aber vor jeder Pause einen konkreten Zeitpunkt
- eine andere Regel – bitte beschreiben _(mit Textfeld)_

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: eine Antwort wählen. Regel zur Wiederaufnahme. Nominale Standardwahl; nächste gemeinsame Arbeitstage können verschieden weit auseinanderliegen._

### G02b

**Was würde dir helfen, das Gespräch nach der Pause fortzusetzen?**

- vorher meine eigenen Gedanken sortieren
- die offenen Punkte vorher kurz schriftlich austauschen
- zunächst gegenseitig zusammenfassen, wie wir die Situation verstehen
- eine neutrale Person hinzunehmen
- eine andere Unterstützung – bitte beschreiben _(mit Textfeld)_
- ich brauche dafür keine besondere Vorbereitung oder Unterstützung _(schließt alle anderen aus)_

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: mehrere Antworten möglich. Unterstützungswunsch getrennt vom Zeitpunkt. Keine besondere Unterstützung exklusiv zu konkreten Hilfen._

## Ziele für das Vorhaben

### S01

**Welche Ergebnisse sind dir für die nächsten drei Jahre wichtig?**

_Wähle die Ergebnisse, die zu deinen Zielen passen. Wenn eines besonders wichtig ist, markiere es anschließend. Du kannst auch angeben, dass du noch keine Rangfolge festlegen möchtest._

- ein regelmäßiges Einkommen, das meinen Lebensunterhalt trägt
- ein Unternehmen mit starkem Wachstum aufbauen
- einen konkreten gesellschaftlichen oder ökologischen Beitrag leisten
- ein Unternehmen aufbauen, das sich später verkaufen lässt
- eine fachlich anspruchsvolle Idee verwirklichen
- ein anderes Ergebnis – bitte beschreiben _(mit Textfeld)_

_Anschlussfrage:_ **Welches gewählte Ziel hat derzeit Vorrang?**

- ich möchte noch keine Rangfolge festlegen

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: mehrere Antworten möglich, eine darf Vorrang bekommen. Mehrere Ziele zulassen; Zahl gewählter Ziele ist kein Ambitionswert. Keine Rangfolge festgelegt ist kein Nachweis gleicher Wichtigkeit._

### S02

**Welche Vorstellung hast du aktuell von deiner Beteiligung am Unternehmen in drei Jahren?**

- ich möchte beteiligt bleiben und plane derzeit keinen Verkauf meiner Anteile
- ich möchte möglicherweise einen Teil meiner Anteile verkaufen und beteiligt bleiben
- ich möchte darauf hinarbeiten, meine Anteile vollständig zu verkaufen
- ich möchte mir die verschiedenen Möglichkeiten offenhalten
- eine andere Vorstellung – bitte beschreiben _(mit Textfeld)_

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: eine Antwort wählen. Teilverkauf und vollständiger Ausstieg getrennt. Keine Rückschlüsse auf Loyalität. Verkauf darf von später benannten Bedingungen abhängen._

### S03

**Wie stehst du aktuell dazu, Geld von außen für das Unternehmen aufzunehmen und dafür Unternehmensanteile abzugeben?**

_Optional: Welche Bedingungen wären dir dabei wichtig?_

- ich möchte zunächst ohne diese Finanzierung arbeiten
- ich möchte diese Möglichkeit offenhalten
- ich möchte gezielt nach einer solchen Finanzierung suchen

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: eine Antwort wählen. Finanzierungspräferenz. Bedingungen separat von der Ausgangsposition erfragen; keine Skala._

### S04

**Welches konkrete Ergebnis möchtest du mit dem Vorhaben in den nächsten zwölf Monaten erreichen?**

_Auch das Prüfen einer Idee oder die Entscheidung gegen ihre Weiterverfolgung kann ein Ergebnis sein._

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: Freitext. Individuelles Zielbild statt stellvertretende Aussage über gemeinsamen Konsens._

## Zeit und finanzielle Rahmenbedingungen

### R01

**Wie viele Stunden pro Woche kannst du in den nächsten zwölf Wochen realistisch für das Vorhaben einplanen?**

_0 ist eine mögliche Antwort. Falls der Umfang schwankt, kannst du die Bedingungen kurz ergänzen._

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: Zahl mit Einheit. Kapazitätsplanung, noch keine gemeinsame Zusage. Ein Bereich ist als Schätzung zu kennzeichnen; Obergrenze nicht als garantierter Einsatz interpretieren._

### R02

**Welchen zeitlichen Beitrag erwartest du in den nächsten zwölf Wochen von den anderen Foundern?**

_Erfasse deine Erwartung für jede Person getrennt. Wenn das Team noch nicht feststeht, kannst du dich auf die geplanten Rollen beziehen._

- keine feste Stundenerwartung an diese Person oder Rolle

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: je Person eine Angabe. Gerichtete Erwartungen. Zahl/Bereich und Empfänger sind notwendige Felder; keine feste Erwartung heißt nicht null Stunden._

### R03

**Welche regelmäßigen Zeitfenster könntest du für gemeinsame Arbeit einplanen?**

_Du musst nicht erklären, warum andere Zeiten für dich nicht verfügbar sind._

- ich möchte gemeinsame Zeiten jeweils einzeln vereinbaren
- ich kann derzeit keine regelmäßigen gemeinsamen Zeiten einplanen

Eingabefelder: Wochentag · Uhrzeit von · Uhrzeit bis · Zeitzone

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: Wochentag, Uhrzeit von/bis, Zeitzone. Verfügbarkeit für gemeinsame Zeit; feste Zeitfenster und die beiden Alternativen als getrennte Modi. Keine regelmäßigen Fenster bedeutet nicht keine Zusammenarbeit._

### R04

**Ab wann brauchst du voraussichtlich regelmäßige Auszahlungen aus dem Vorhaben für deinen Lebensunterhalt?**

_Optional kannst du ergänzen, welchen monatlichen Betrag du ungefähr brauchst. Nenne dabei die Währung und ob du den Betrag vor oder nach persönlichen Steuern meinst._

- ab sofort
- ab einem bestimmten Datum – bitte angeben _(mit Textfeld)_
- in den nächsten zwölf Monaten voraussichtlich nicht

_Wer nicht antworten kann:_ „kann ich noch nicht einschätzen“ · „möchte ich nicht angeben“

_Format: eine Antwort wählen. Finanzieller Bedarf und Zeitpunkt; keine Berechnung individueller Leistbarkeit. Optionaler Betrag wird nicht aus anderen Antworten abgeleitet._

### R06

**Welche Aussage passt zu deiner Planung für eine hauptberufliche Arbeit an diesem Vorhaben?**

_Gemeint ist der überwiegende Teil deiner beruflichen Arbeitszeit. Das setzt keine bestimmte Wochenstundenzahl voraus und schließt andere Tätigkeiten nicht automatisch aus._

- das Vorhaben ist bereits meine berufliche Haupttätigkeit
- ich kann mir vorstellen, es zu meiner beruflichen Haupttätigkeit zu machen
- ich plane das derzeit nicht

_Anschlussfrage:_ **Was müsste dafür erfüllt sein?**

- regelmäßige Auszahlung in bestimmter Höhe
- gesicherte Finanzierung
- konkreter Meilenstein
- frühestmöglicher Zeitpunkt
- andere Bedingung
- keine besondere Bedingung

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: eine Antwort wählen. Hauptberuflicher Wechsel, ausdrücklich keine Gleichsetzung mit Vollzeit oder Exklusivität. Bei zweiter Antwort bedingte Anschlussfelder._

### R12

**Wann möchtest du die Angaben zu deiner Zeit und deinen finanziellen Rahmenbedingungen erneut prüfen?**

_Wer nicht antworten kann:_ „habe ich noch nicht entschieden“ · „möchte ich nicht angeben“

_Format: Datum. Gemeinsame Aktualisierung planen; persönliche Angabe ist zunächst Wunschdatum._

## Prioritäten im konkreten Fall: Frühe Information und Verlässlichkeit

### W01

**Ihr habt eine vorläufige Finanzplanung. Zugesagte Zahlungen sind kurzfristig gesichert. Die Prüfung der Zahlen dauert noch einige Tage. Wie möchtet ihr das Team informieren?**

- Die vorläufige Planung jetzt teilen und offene Punkte klar benennen.
- Die Zahlen zuerst prüfen und anschließend die geprüfte Planung teilen.
- eine andere Vorgehensweise – bitte beschreiben _(mit Textfeld)_

Wie wichtig ist dir jedes dieser beiden Anliegen?

- frühe Orientierung für das Team
- eine verlässliche Informationsgrundlage

Jeweils: gar nicht wichtig · wenig wichtig · mittel wichtig · ziemlich wichtig · sehr wichtig

_Wer nicht antworten kann:_ „kann ich noch nicht entscheiden“

_Format: zwei Wichtigkeiten und ein Weg. Kein Vertraulichkeitskonflikt: Empfängerkreis unverändert. Nicht Offenheit gegen Geheimhaltung interpretieren._

## Prioritäten im konkreten Fall: Weiterentwicklung und Rollenwechsel

### W02

**Eine Person, die schon länger dabei ist, erfüllt neue Anforderungen ihrer Rolle noch nicht. Eine befristete Weiterentwicklung in dieser Rolle und ein Wechsel in eine passende andere Rolle sind beide realistische Wege. Die Person ist für beide offen; beide Wege kosten ähnlich viel. Für einen davon ist Budget vorhanden.**

- Eine befristete Weiterentwicklung in der bisherigen Rolle ermöglichen.
- Den Wechsel in eine passende andere Rolle unterstützen.
- eine andere Vorgehensweise – bitte beschreiben _(mit Textfeld)_

Wie wichtig ist dir jedes dieser beiden Anliegen?

- Weiterentwicklung in der bisherigen Rolle
- Wechsel in eine aktuell passendere Rolle

Jeweils: gar nicht wichtig · wenig wichtig · mittel wichtig · ziemlich wichtig · sehr wichtig

_Wer nicht antworten kann:_ „kann ich noch nicht entscheiden“

_Format: zwei Wichtigkeiten und ein Weg. Beide Optionen können loyal und leistungsorientiert sein. Misst Wahl einer Personalentwicklungsmaßnahme, nicht Loyalität versus Leistung._

## Prioritäten im konkreten Fall: Gesellschaftlicher Nutzen und finanzieller Spielraum

### W03

**Ihr könnt nur eines von zwei Angeboten umsetzen. Beide sind wirtschaftlich tragfähig und ähnlich aufwendig. Nach eurer bisherigen Einschätzung verspricht eines mehr gesellschaftlichen Nutzen, das andere einen größeren finanziellen Überschuss.**

- Das Angebot mit dem größeren gesellschaftlichen Nutzen wählen.
- Das Angebot mit dem größeren finanziellen Überschuss wählen.
- eine andere Vorgehensweise – bitte beschreiben _(mit Textfeld)_

Wie wichtig ist dir jedes dieser beiden Anliegen?

- größerer gesellschaftlicher Nutzen
- mehr finanzieller Spielraum für das Unternehmen

Jeweils: gar nicht wichtig · wenig wichtig · mittel wichtig · ziemlich wichtig · sehr wichtig

_Wer nicht antworten kann:_ „kann ich noch nicht entscheiden“

_Format: zwei Wichtigkeiten und ein Weg. Lokaler Prioritätskonflikt. Vorstellungen über Größe, Sicherheit und Art des Nutzens bleiben mögliche Kontexteinflüsse._

## Prioritäten im konkreten Fall: Austausch vorab und zügiger Start

### W04

**Ein interner Arbeitsablauf soll geändert werden. Die betroffenen Personen haben ihre Sicht bereits schriftlich eingebracht. Ein zusätzliches Gespräch würde den Start um eine Woche verschieben. Eine dringende Frist gibt es nicht.**

- Vor der Entscheidung noch ein gemeinsames Gespräch führen.
- Auf Basis der Rückmeldungen entscheiden und nach dem Start gemeinsam überprüfen.
- eine andere Vorgehensweise – bitte beschreiben _(mit Textfeld)_

Wie wichtig ist dir jedes dieser beiden Anliegen?

- zusätzlicher gemeinsamer Austausch vor der Entscheidung
- zügiger Start mit einer späteren Überprüfung

Jeweils: gar nicht wichtig · wenig wichtig · mittel wichtig · ziemlich wichtig · sehr wichtig

_Wer nicht antworten kann:_ „kann ich noch nicht entscheiden“

_Format: zwei Wichtigkeiten und ein Weg. Beide Wege beteiligen Betroffene; keine Messung von partizipativ versus autoritär._

## Prioritäten im konkreten Fall: Zusätzliche Reserve und Markttest

### W05

**Ihr habt ein zusätzliches Budget zur Verfügung. Ihr könnt es als Reserve behalten oder für einen begrenzten Markttest einsetzen. Laufende Verpflichtungen und eure bereits vereinbarte Mindestreserve bleiben in beiden Fällen gedeckt.**

- Das Budget vorerst als zusätzliche Reserve behalten.
- Das Budget jetzt für den begrenzten Markttest einsetzen.
- eine andere Vorgehensweise – bitte beschreiben _(mit Textfeld)_

Wie wichtig ist dir jedes dieser beiden Anliegen?

- ein zusätzlicher finanzieller Puffer
- frühe Erkenntnisse aus dem Markt

Jeweils: gar nicht wichtig · wenig wichtig · mittel wichtig · ziemlich wichtig · sehr wichtig

_Wer nicht antworten kann:_ „kann ich noch nicht entscheiden“

_Format: zwei Wichtigkeiten und ein Weg. Zusätzliche Sicherheitsreserve versus Erkenntnisgewinn; Mindestreserve ist Szenariobedingung und kein normativer Sicherheitswert._

## Prioritäten im konkreten Fall: Gleicher Anteil und unterschiedlicher Beitrag

### W06

**Ein einmaliger Zusatzbonus kann verteilt werden. Die Grundvergütung ist geregelt, für diesen Bonus gibt es noch keine Verteilungsregel. Alle haben ihre Zusagen erfüllt, aber in unterschiedlichem Umfang zum Ergebnis beigetragen. Die Beiträge lassen sich anhand gemeinsam akzeptierter Kriterien nachvollziehen.**

- Den Zusatzbonus zu gleichen Teilen verteilen.
- Den Zusatzbonus entsprechend den nachvollziehbaren Beiträgen verteilen.
- eine andere Vorgehensweise – bitte beschreiben _(mit Textfeld)_

Wie wichtig ist dir jedes dieser beiden Anliegen?

- alle erhalten den gleichen Anteil am Zusatzbonus
- der Zusatzbonus berücksichtigt den unterschiedlichen Beitrag

Jeweils: gar nicht wichtig · wenig wichtig · mittel wichtig · ziemlich wichtig · sehr wichtig

_Wer nicht antworten kann:_ „kann ich noch nicht entscheiden“

_Format: zwei Wichtigkeiten und ein Weg. Gleichheits- versus Beitragsprinzip in einem spezifischen Fall. Kein allgemeiner Fairnesswert; keine rückwirkende Missachtung bestehender Zusagen._

## Persönliche Grenzen

### L01

**Welche Vorgehensweise würde für dich eine persönliche Grenze überschreiten?**

_Du entscheidest, was du davon mit dem Team teilen möchtest._

_Wer nicht antworten kann:_ „dazu habe ich noch keine konkrete Angabe“ · „möchte ich zunächst vertraulich klären“

_Format: Freitext, mehrere Einträge möglich. Frei formulierte Grenze, keine Integritätsbewertung. Fehlende Nennung bedeutet nicht, dass keine Grenzen bestehen._

### L02

**An welchem konkreten Beispiel ließe sich erkennen, dass diese Grenze erreicht ist?**

_Ein Beispiel reicht. Du musst keine persönliche Erfahrung schildern._

_Erscheint nur, wenn: L01 enthält eine benannte Grenze, die für die Anschlussfrage verwendet werden darf_

_Wer nicht antworten kann:_ „dazu habe ich noch keine konkrete Angabe“ · „möchte ich zunächst vertraulich klären“

_Format: Freitext je zuvor genanntem Eintrag. Nur nach einer in L01 benannten und für die Anschlussfrage verwendbaren Grenze anzeigen._

### L03

**Wie möchtest du vorgehen, wenn unklar ist, ob eine Situation diese Grenze berührt?**

_Zum Beispiel zunächst direkt darüber sprechen oder eine gemeinsam gewählte neutrale Person hinzunehmen._

_Erscheint nur, wenn: L01 enthält eine benannte Grenze, die für die Anschlussfrage verwendet werden darf_

_Wer nicht antworten kann:_ „dazu habe ich noch keine konkrete Angabe“ · „möchte ich zunächst vertraulich klären“

_Format: Freitext je zuvor genanntem Eintrag. Verfahren zur Klärung, keine Unterstellung bereits erfolgter Grenzüberschreitung. Beispiele im Pretest auf Lenkung prüfen._

---

# Vorschlag: vier Fragen zum Verhalten

**Diese vier Fragen stehen nicht im geprüften Quelldokument.** Sie sind ein Vorschlag und liegen deshalb hier hinten, damit niemand sie für geprüft hält.

Der Gedanke: Zu vier der Wunschfragen zusätzlich fragen, wie es beim letzten konkreten Mal war. Wenn beides auseinanderliegt, ist das ein Gesprächsthema — und ausdrücklich kein Urteil darüber, ob jemand ehrlich geantwortet hat. Wer sich etwas wünscht und zuletzt anders gehandelt hat, hat nicht falsch geantwortet: Die Lage kann es nicht hergegeben haben, der Wunsch kann neu sein.

Drei Entscheidungen, über die es sich zu streiten lohnt:

1. **Bezugszeitraum drei Monate.** Ohne Zeitraum ist es wieder „wie häufig“ — die Frage, die im September als unklar zurückkam, weil offen bleibt, woran jemand sich erinnern soll.
2. **„Kam nicht vor“ ist eine Antwort, kein Auslassungsgrund.** Wer in drei Monaten keine solche Entscheidung getroffen hat, hat etwas gesagt.
3. **Nur ein einzelner letzter Fall, keine Häufigkeit.** Ein einzelner Fall ist erinnerbar. Eine Häufigkeit über drei Monate wäre wieder geschätzt.


### A91 — Gegenprobe zu A02

**Denk an die letzte wichtige Entscheidung, die du in den vergangenen drei Monaten getroffen hast. Hast du davor geprüft, ob eine zentrale Annahme zutrifft?**

_Gemeint ist jede Form des Nachprüfens: nachrechnen, nachlesen, jemanden fragen, ausprobieren._

- ja, bevor ich entschieden habe
- teilweise - bei einem Teil der Annahmen
- nein
- in den vergangenen drei Monaten stand keine solche Entscheidung an _(die Situation gab es nicht)_

_Wer nicht antworten kann:_ „daran kann ich mich nicht sicher erinnern“

_Berichtetes Verhalten im letzten konkreten Fall. Kein Beleg für Analysefähigkeit und kein Gegenbeweis zur Wunschangabe in A02._

### U91 — Gegenprobe zu U04

**Denk an die letzte Entscheidung, die in den vergangenen drei Monaten in deinen Verantwortungsbereich fiel. Hast du sie getroffen, ohne vorher die Zustimmung anderer einzuholen?**

_Gemeint ist Zustimmung, nicht Information. Jemanden zu informieren ist etwas anderes, als auf ein Ja zu warten._

- ja, ich habe selbst entschieden
- ich habe vorher jemanden gefragt, hätte aber auch selbst entscheiden können
- ich habe auf eine Zustimmung gewartet
- ich hatte in den vergangenen drei Monaten keinen eigenen Verantwortungsbereich _(die Situation gab es nicht)_

_Wer nicht antworten kann:_ „daran kann ich mich nicht sicher erinnern“

_Berichtetes Verhalten im letzten konkreten Fall. Wer auf eine Zustimmung gewartet hat, kann sich trotzdem mehr Eigenständigkeit wünschen - genau darüber lässt sich sprechen._

### K91 — Gegenprobe zu K01

**Denk an das letzte Mal in den vergangenen drei Monaten, als du anderen einen Zwischenstand aus deiner Arbeit gezeigt hast. In welchem Zustand war er da?**

- eine erste Skizze, vieles war noch offen
- die Richtung stand fest, die Ausarbeitung noch nicht
- ein erstes nutzbares Ergebnis
- aus meiner Sicht fertig
- ich habe in den vergangenen drei Monaten keinen Zwischenstand gezeigt _(die Situation gab es nicht)_

_Wer nicht antworten kann:_ „daran kann ich mich nicht sicher erinnern“

_Berichtetes Verhalten im letzten konkreten Fall. Die Stufen entsprechen absichtlich denen aus K01, damit Wunsch und Verhalten nebeneinander lesbar sind._

### T91 — Gegenprobe zu T03

**Denk an das letzte Mal in den vergangenen drei Monaten, als du eine geplante Entscheidung anders gesehen hast als die anderen. Wann hast du deinen Einwand angesprochen?**

- noch im laufenden Gespräch
- nach dem Gespräch, aber noch am selben Arbeitstag
- am nächsten Arbeitstag
- nach mehr als einem Arbeitstag
- ich habe ihn nicht angesprochen _(steht außerhalb der Abfolge)_
- in den vergangenen drei Monaten kam das nicht vor _(die Situation gab es nicht)_

_Wer nicht antworten kann:_ „daran kann ich mich nicht sicher erinnern“

_Berichtetes Verhalten im letzten konkreten Fall. 'Nicht angesprochen' ist eine eigene Antwort und keine späte Variante - in T03 fehlt sie, weil dort nach dem Wunsch gefragt wird._

## Wie Wunsch und Verhalten gegenübergestellt werden


Verglichen wird nur, wo beide Fragen dieselbe Abfolge benutzen — bei K01/K91 und T03/T91. Bei A02/A91 und U04/U91 fragt die eine nach Häufigkeit und die andere nach einem einzelnen Fall; ein Abstand zwischen „fast immer“ und „ja, bevor ich entschieden habe“ wäre eine Zahl zwischen zwei Dingen ohne gemeinsame Skala. Dort wird beides nebeneinandergelegt statt verrechnet.

- **A02 ↔ A91** — Entscheidungen vorbereiten
- **U04 ↔ U91** — Eigenständig entscheiden
- **K01 ↔ K91** — Informationen teilen
- **T03 ↔ T91** — Unterschiede ansprechen


## Offen, bevor etwas festgeschrieben wird

- **confidential_first als eigener Auslassungsgrund** — Eine Bitte um ein Gespraech unter vier Augen ist etwas anderes als eine Verweigerung: die eine oeffnet eine Tuer, die andere schliesst sie. Das Produkt behandelt beide verschieden - der Advisor-Zugang und der Report zeigen 'vertraulich klaeren' als offenen Punkt, 'moechte ich nicht angeben' nicht. _(Quelle: Die Quelle fuehrt vier Codes und ordnet 'moechte ich zunaechst vertraulich klaeren' unter 'private' ein.; Claude, 28.09.2026 - Maria zur Bestaetigung vorzulegen)_
