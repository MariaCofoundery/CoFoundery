# Capability Model - Technical Brief

## Status
- Modelltyp: Entwurf eines beleggestuetzten Inventar- und Deckungsmodells
- Validierung: noch keine. Dieses Dokument ist eine Arbeitsstruktur, kein Modell.
- Zweck: gemeinsames Vokabular festlegen, bevor ein Schema entsteht
- Verhaeltnis zum Alignment-Modell: ergaenzend, nicht integriert
- Erstellt am: 2026-09-06

---

## 1. Zweck und Einordnung

### Die Luecke, die dieses Modell fuellt

Das Founder-Compatibility-Modell benennt die Luecke selbst. In `founder-matching-logic.md:1007-1013` steht unter "Es erfasst **nicht** zuverlaessig":

> Skill-Fit / Kompetenzkomplementaritaet

Das ist die einzige Stelle im gesamten Dokumentbestand, an der der Begriff vorkommt. Das Capability-Modell fuellt also keinen neuen Anspruch, sondern einen bewusst offen gelassenen Platz.

Die Abgrenzung ist damit bereits geschrieben - sie muss nur nach aussen gewendet werden. Die Konstruktdefinitionen grenzen an sechs Stellen explizit gegen Kompetenz ab:

- `construct-definitions.md:561` - "Es misst keine Kompetenz, keine Charakterqualitaet und keine moralische Eignung."
- `:40-41` - "allgemeine Intelligenz oder strategische Kompetenz / Branchenwissen oder Markterfahrung"
- `:134-135` - "kognitive Faehigkeit oder allgemeine Intelligenz / Fachkompetenz oder Entscheidungserfahrung"
- `:229-231` - "Kommunikationskompetenz / Empathie oder Vertrauensfaehigkeit"
- `:412-416` - "Branchenwissen oder Erfahrung mit Krisen"
- `:501-507` - "tatsaechliche Konfliktloesungskompetenz"

Kurzform der Arbeitsteilung:

> Alignment fragt, **wie** zwei Menschen zusammenarbeiten.
> Capability fragt, **was** ein Team fachlich abdeckt.

Beide Modelle beschreiben denselben Menschen, aber nicht dieselbe Sache. Sie duerfen sich nicht gegenseitig erklaeren und nicht zu einem gemeinsamen Wert verrechnet werden.

### Was das Modell leisten soll

- sichtbar machen, welche Funktionsbereiche im Team belegt sind und welche nicht
- diese Sichtbarkeit an nachvollziehbare Belege binden statt an Selbsteinschaetzung
- daraus Gespraechs- und Handlungsoptionen ableiten: aneignen, holen, extern beauftragen, im Connect finden
- dieselbe Personendatenbasis fuer Connect nutzbar machen, ohne sie zweimal zu modellieren

### Was das Modell nicht leisten soll

- keine Rollenzuweisung ("A sollte CTO sein")
- keine Eignungsaussage ueber Personen
- keine Erfolgsprognose fuer das Venture
- keine Bewertung von Kompetenzhoehe oder Qualitaet einer Leistung
- keine Aussage darueber, ob ein Team "vollstaendig" ist
- kein Ersatz fuer Referenzen, Arbeitsproben oder Zusammenarbeit auf Zeit

Der zentrale Satz des Modells:

> **Ein fehlender Beleg ist nicht dasselbe wie eine fehlende Faehigkeit.**

Jede Aussage ueber eine Luecke muss diesen Vorbehalt mittragen. Das Modell sieht nur, was jemand eingetragen hat.

---

## 2. Modelluebersicht: vier Schichten

```text
L1  Personen-Inventar        was hat diese Person nachweislich getan
     │                        ← geteilte Datenbasis mit Connect / Profile V2
     ▼
L2  Team-Deckung             welche Funktionsbereiche sind im Team belegt
     │
     ▼
L3  Referenzrahmen           welche Funktionsbereiche sind fuer dieses
     │                        Venture in dieser Phase relevant
     ▼
L4  Handlungsoptionen        aneignen · holen · extern · im Connect finden
```

**L1 ist identisch mit Profile V2.** Das ist die wichtigste Aussage dieses Dokuments. Connect fragt "was bringt diese Person mit", Capability fragt "was davon deckt das Team ab" - beides liest dieselben Daten durch eine andere Linse. Werden sie getrennt modelliert, entsteht dieselbe Doppelung, die bei den Rollenvokabularen bereits eingetreten ist (`profiles.roles` mit 2 Werten, Discovery `own_roles`/`seeking_roles`, `network_roles` mit 6 Werten, plus vier Auspraegungen von Expertise).

L2 bis L4 sind Capability-spezifisch und koennen spaeter entstehen, ohne dass L1 migriert werden muss.

---

## 3. Vokabular: vier Begriffe, die auseinandergehalten werden muessen

Die Abgrenzung ist der eigentliche Zweck dieses Dokuments. Ohne sie entstehen drei Skill-Systeme nebeneinander.

### 3.1 Funktion

Ein Arbeitsbereich, den ein Venture abdecken muss - Product, Tech, Sales, Marketing, Finance, Operations, People, Legal.

- Eigenschaft des **Ventures**, nicht der Person
- strukturell und endlich: eine ueberschaubare, geschlossene Liste
- wertfrei: keine Funktion ist wichtiger als eine andere

### 3.2 Erfahrung

Eine belegte Station: Rolle, Kontext, Zeitraum, Funktionsbezug.

- Eigenschaft der **Person**
- die einzige direkt erhobene Groesse des Modells
- pruefbar im Gespraech, importierbar aus Lebenslauf oder Export
- traegt immer ihren Kontext mit: drei Jahre B2B-Sales im Konzern ist etwas anderes als drei Jahre B2B-Sales im Pre-Seed-Startup

### 3.3 Faehigkeit

Was eine Person in einem Funktionsbereich tun kann.

- **abgeleitet aus Erfahrung, nicht selbst bewertet**
- nie als Skala ("fortgeschritten", "Experte", 7 von 10)
- immer mit ihrem Beleg zusammen dargestellt

Das ist die zentrale Designentscheidung. Eine Selbsteinschaetzung auf einer Skala ist genau dort am unzuverlaessigsten, wo das Modell am meisten davon abhaengt: Eine zu grosszuegige Selbstbewertung **versteckt eine echte Luecke**, und vor der soll das Modell ja warnen. Die bestehenden Validierungsdokumente benennen dieses Risiko fuer das Alignment-Modell bereits ausfuehrlich (`validation-plan.md:184-196`, soziale Erwuenschtheit und Selbstbild statt Verhalten). Im Capability-Kontext waere es staerker, weil die Anreizlage eindeutiger ist.

Belegverankerung loest das nicht vollstaendig - jemand kann eine Station uebertreiben -, aber sie verschiebt die Aussage von "ich bin gut in X" zu "ich habe X in diesem Kontext ueber diesen Zeitraum gemacht". Das ist im Gespraech pruefbar.

### 3.4 Ownership

Wer im Team aktuell fuer einen Funktionsbereich verantwortlich ist.

- Eigenschaft des **Teams zu einem Zeitpunkt**, nicht der Person
- **wird ausschliesslich vom Team gesetzt, nie vom System vorgeschlagen**
- veraenderlich, ohne dass sich Erfahrung veraendert

Ownership ist der Punkt, an dem das Produkt seine eigene Linie ueberschreiten koennte. Wer eine Funktion uebernimmt, haengt an Dingen, die keine Datenstruktur sieht: wer wohin wachsen will, wer Fuehrung sucht, wie Equity verhandelt wurde, wer gerade Kapazitaet hat. Eine Systemempfehlung waere hier oft falsch und wuerde trotzdem ernst genommen, weil sie analytisch aussieht.

### 3.5 Abgrenzungsformel

Analog zu den Trennfragen in `construct-definitions.md:80-83`:

- **Funktion** fragt: welcher Arbeitsbereich?
- **Erfahrung** fragt: was wurde wo und wie lange getan?
- **Faehigkeit** fragt: was folgt daraus plausibel?
- **Ownership** fragt: wer macht es hier gerade?
- **Alignment** fragt: wie arbeitet ihr dabei zusammen?

---

## 4. L1 - Personen-Inventar

Erhoben werden ausschliesslich belegnahe Angaben:

| Feld | Charakter | Auch fuer Connect sichtbar |
|---|---|---|
| Stationen (Rolle, Organisation, Zeitraum, Kontext) | Beleg | ja, nach eigener Freigabe |
| Funktionsbezug je Station | Zuordnung | ja |
| Startup-Erfahrung (Phase, Gruendung, Fundraising, Exit) | Beleg | ja |
| Ausbildung, Zertifikate | Beleg | ja |
| Branchen | Kontext | ja |
| Sprachen | Kontext | ja |
| Contribution Mode (Sparring, Beratung, operativ, Investment, Introductions, Mentoring) | Absicht | ja |
| Kontaktierbarkeit ueber Profil | Einwilligung | steuert Sichtbarkeit |

Bewusst **nicht** erhoben:

- Selbstbewertungsskalen zu Faehigkeiten
- Soft Skills als Selbstauskunft (dafuer existiert das Alignment-Modell)
- Persoenlichkeitsangaben
- Leistungs- oder Erfolgsangaben ohne Beleg

### Verhaeltnis zu Soft Skills

Der urspruengliche Wunsch umfasst Soft Skills. Diese sind im Produkt bereits abgedeckt - durch die 36 Alignment-Items, die Arbeitsstruktur, Konfliktstil, Entscheidungslogik und Commitment als Praeferenzachsen erfassen. Sie dort **noch einmal** als Selbstauskunft zu erheben, waere die dritte Modellierung derselben Sache.

Vorschlag: Capability erhebt keine Soft Skills. Wo ein Team-Bild beides braucht, werden Alignment und Capability **nebeneinander gezeigt, nicht verrechnet**. Das folgt dem Vorgehen des Werte-Moduls, das laut `founder-matching-logic.md:860-869` bewusst nicht in `overallFit` einfliesst.

---

## 5. L2 - Team-Deckung

Pro Funktionsbereich wird ein Deckungsstatus gebildet. Analog zur vierstufigen Statuslogik des Matching-Reports (`founderMatchingSelection.ts:13`), aber mit eigenem Vokabular:

| Status | Bedeutung | Anzeige DE | Anzeige EN |
|---|---|---|---|
| `belegt` | mehrere Stationen mit Funktionsbezug | Belegt | Covered |
| `teilweise_belegt` | eine Station oder kurzer Zeitraum | Teilweise belegt | Partly covered |
| `kein_beleg` | Angaben vorhanden, aber keine zu diesem Bereich | Kein Beleg in euren Angaben | No evidence in your entries |
| `nicht_erhoben` | Bereich wurde nie abgefragt oder Profil unvollstaendig | Noch nicht erfasst | Not captured yet |

Die Trennung von `kein_beleg` und `nicht_erhoben` ist nicht kosmetisch. Sie entspricht dem bestehenden `insufficientData`-Muster (`reportContent.de.ts:141-142`: "Fuer diese Dimension liegen noch nicht genug Daten fuer eine belastbare gemeinsame Einordnung vor") und verhindert, dass Unvollstaendigkeit als Befund gelesen wird.

**Harte Regel:** `kein_beleg` darf nie als "euch fehlt X" formuliert werden.

---

## 6. L3 - Referenzrahmen

Das ist die wissenschaftlich schwaechste Stelle des Modells und braucht die groesste Zurueckhaltung.

Eine Aussage der Form "laut Theorie sollte ein Startup in Phase Z den Bereich X abdecken" ist ein staerkerer Anspruch als alles, was das Alignment-Modell je erhoben hat. Dort gilt ausdruecklich (`technical-brief.md:24-30`): keine klinische Diagnostik, keine harte Vorhersage von Unternehmenserfolg, keine automatische Wahrheit ueber Personen. Die Empirie zur Zusammensetzung von Gruendungsteams ist umstritten, stark kontextabhaengig und ueberwiegend an Ueberlebenden erhoben.

### Vorschlag fuer v0.1: Relevanz kommt vom Team, nicht vom Modell

Statt einer normativen Referenz markiert das Team selbst, welche Funktionsbereiche fuer sein Venture gerade relevant sind. Das Modell zeigt dann Deckung gegen diese **selbst gesetzte** Liste.

Damit entfaellt die schwaechste Behauptung, und der Nutzen bleibt fast vollstaendig erhalten: Der Wert liegt ohnehin darin, dass ein Team ueberhaupt systematisch hinschaut - nicht darin, dass eine externe Instanz die Liste vorgibt.

### Wenn spaeter ein Referenzrahmen ergaenzt wird

Dann mit denselben Auflagen wie beim Alignment-Modell:

- Formulierung als **"haeufig genannte Muster"**, nie als "laut Theorie"
- explizite Phasenabhaengigkeit; ein Pre-Seed-Team hat mit einem Scale-up wenig gemein
- Quellenangabe und Kennzeichnung der Umstrittenheit je Aussage
- keine Vollstaendigkeitsbehauptung
- ein eigenes Validierungsdokument analog `founder-compatibility-validation-plan.md`

---

## 7. L4 - Handlungsoptionen

Pro nicht oder teilweise belegtem und als relevant markiertem Bereich werden Optionen gezeigt, nicht Empfehlungen:

- **aneignen** - eine Person im Team baut den Bereich auf
- **holen** - Anstellung oder weitere Gruendungsperson
- **extern** - Beratung, Agentur, Freelance
- **im Connect suchen** - Menschen mit Belegen in diesem Bereich

Die vierte Option ist die Bruecke zwischen den Modulen und der staerkste modeluebergreifende Fall des Produkts. Sie hat eine Voraussetzung:

> Sie zeigt Menschen, die **kein** Angebot veroeffentlicht haben.

Damit ist sie identisch mit dem profilbasierten Kontaktvertrag, der in der Public-Visibility-Spec (Abschnitt 17) bewusst vertagt wurde. Sie braucht ein eigenes Einverstaendnis - sinngemaess "ich moechte ueber mein Profil gefunden und angefragt werden".

**Dieses Feld gehoert in Profile V2 hinein, von Anfang an.** Nachtraeglich eingezogen bedeutet es, dass alle Bestandsprofile ohne Einwilligung vorliegen und die Bruecke leer bleibt, bis jede Person einzeln zustimmt. Von Anfang an mitgedacht ist es ein Haekchen im ersten Formular.

---

## 8. Sprachregelung

Es gilt das bestehende Sprachprinzip aus `founder-compatibility-report-mapping-spec-v1.md:26-51` unveraendert weiter. Bevorzugt: `deutet darauf hin`, `spricht dafuer`, `kann im Alltag relevant werden`, `legt nahe`. Zu vermeiden: `ihr seid`, `objektiv`, `beweist`, `zeigt eindeutig`.

Fuer Capability kommen vier Regeln hinzu:

1. **Beleglage statt Faehigkeitsurteil.** Nicht "A kann kein Sales", sondern "zu Sales liegen in euren Angaben keine Stationen vor".
2. **Unvollstaendigkeit immer mitsagen.** Jede Deckungsaussage traegt den Vorbehalt, dass das Modell nur sieht, was eingetragen wurde.
3. **Keine Zuweisung.** Nie "A sollte den Bereich uebernehmen". Stattdessen Deckung zeigen und die Verteilung dem Team lassen.
4. **Keine Vollstaendigkeitsaussage.** Nie "euer Team ist vollstaendig aufgestellt" oder "euch fehlt noch X zum vollstaendigen Team".

### Formulierungsmuster

Gut:

> "In euren Angaben finden sich mehrere Stationen mit Bezug zu Product und Operations. Zu Sales liegt bisher keine Station vor - das kann bedeuten, dass der Bereich noch offen ist, oder dass er im Profil noch nicht erfasst wurde."

> "Beide von euch haben Belege im Bereich Tech. Das kann Tiefe bedeuten und es kann bedeuten, dass andere Bereiche weniger Aufmerksamkeit bekommen - das entscheidet ihr, nicht die Auswertung."

Nicht:

> "Eurem Team fehlt B2B Sales."
> "A ist eure Product-Person, B euer Tech-Lead."
> "Ihr deckt 4 von 6 kritischen Funktionen ab."
> "Anna passt zu 87 Prozent auf eure Luecke."

### Maschinelle Absicherung

`web/src/features/reporting/content/reportCopyGuards.ts` prueft heute bereits gegen `FORBIDDEN_ENGLISH_PHRASES` und ein Prozentanspruchs-Pattern. Capability-Texte sollten in dieselbe Pruefung aufgenommen werden, erweitert um deutsche Begriffe: `euch fehlt`, `ungeeignet`, `vollstaendig aufgestellt`, `sollte uebernehmen`, `ist eure/euer` in Verbindung mit einem Funktionsnamen.

---

## 9. Verhaeltnis zu Discovery

Fuer Discovery ist eine reduzierte Fassung sinnvoll, aber mit einer Auflage.

Capability-Komplementaritaet und Alignment sind **verschiedene Achsen**. Werden beide nebeneinander mit Bewertung angezeigt, ist der Schritt zu einem aggregierten Gesamtwert sehr kurz - und genau den hat das Produkt bewusst nie gebaut (`overallFit` und `overallTension` bleiben getrennt, `conflictRiskIndex` ist als `deprecatedAggregateTerms` gefuehrt).

Vorschlag: In Discovery erscheint Capability rein **beschreibend** - welche Funktionsbereiche die andere Person belegt hat - ohne Passungswert und ohne Einfluss auf die Reihung. Praezedenzfall ist das Werte-Modul, das bewusst nicht in `overallFit` einfliesst.

---

## 10. Methodische Grenzen

- **Selbstauskunft mit Anreiz.** Anders als beim Alignment-Modell gibt es hier eine klare Richtung, in die Uebertreibung nuetzt. Belegverankerung daempft das, hebt es aber nicht auf.
- **Beleg ist nicht Qualitaet.** Drei Jahre in einer Funktion sagen nichts darueber, wie gut sie ausgefuellt wurden.
- **Kontextverlust.** Dieselbe Funktionsbezeichnung bedeutet im Konzern und im Zwei-Personen-Startup Verschiedenes.
- **Lueckenhafte Erfassung sieht aus wie eine Luecke.** Der haeufigste Fehlschluss des Modells, deshalb Regel 2 der Sprachregelung.
- **Kein Referenzstandard.** Ohne validierten Referenzrahmen ist "relevant" eine Setzung des Teams, keine Aussage ueber das Venture.
- **Funktionslisten sind kulturell gepraegt.** Die Aufteilung in Product/Tech/Sales/Marketing/Finance/Operations/People/Legal ist im westlichen Tech-Startup-Kontext ueblich und nicht universell.
- **Keine Laengsschnittbasis.** Es gibt keine Daten darueber, ob Teams mit besserer Deckung anders abschneiden.

---

## 11. Offene Fragen vor dem Schema

1. **Wo wohnt der Personen-Kern?** `network_profiles` ist heute die einzige Personenzeile fuer Connect-only-Accounts, weil diese bewusst keine `profiles`-Zeile erzeugen (Default `founder`). Die toten Spalten `experience`, `skills`, `linkedin_url` liegen aber auf `profiles`. Entweder wird `profiles` vom Founder-Default entkoppelt, oder der Kern wird eine neue Tabelle fuer beide Nutzertypen. Diese Entscheidung faellt vor allem anderen.
2. **Ein Funktionsvokabular oder zwei?** Discovery kennt heute 12 Rollen (`discoveryTypes.ts:15-29`), Connect 6 `network_roles`, das Basisprofil 8 `focus_skill`-Werte. Wird das Funktionsvokabular des Capability-Modells das gemeinsame, oder tritt es daneben?
3. **Wie granular sind Stationen?** Freitext, strukturiert, oder strukturiert mit Freitextfeld? Davon haengt ab, was ein Import ueberhaupt fuellen kann.
4. **Was passiert mit `focus_skill`?** Einfachauswahl aus acht Werten, fliesst mit Gewicht 20 in die Profilvollstaendigkeit ein. Migrieren oder abloesen?
5. **Sichtbarkeitsgrenze.** Welche L1-Felder duerfen in die oeffentliche Connect-Projektion? Die Public-Visibility-Spec haelt fest, dass neue Profilfelder nicht automatisch oeffentlich werden. Fuer Ausbildung, Zertifikate und detaillierte Stationen mit Arbeitgeber und Zeitraum ist das besonders relevant - das sind Lebenslaufdaten mit Profiling-Risiko.
6. **Team-Ebene ohne Team.** Gilt L2 nur fuer bestehende Founder-Teams, oder auch fuer ein Duo in der Discovery-Pruefphase?

---

## 12. Naechste Schritte

1. Frage 1 entscheiden - ohne sie kein Schema
2. Funktionsvokabular festlegen und gegen die drei bestehenden Rollenlisten mappen
3. L1-Feldliste finalisieren, inklusive Kontaktierbarkeits-Einwilligung
4. Erst dann Profile V2 als Migration
5. L2 als reine Ableitung ohne eigenen Speicher
6. L3 und L4 spaeter und getrennt bewerten

L2 bis L4 sollten **nicht** gebaut werden, bevor L1 mit echten Profilen gefuellt ist. Eine Deckungsanalyse auf leeren Inventaren erzeugt nur Aussagen der Form `nicht_erhoben`.

---

## 13. Einordnung dieses Dokuments

Dieses Dokument ist ein Entwurf zur Diskussion, kein beschlossenes Modell. Es legt Vokabular und Grenzen fest, damit ein spaeteres Schema nicht nachtraeglich repariert werden muss.

Analog zur Selbsteinordnung der Konstruktdefinitionen (`construct-definitions.md:578`): Es soll nicht Abschluss, sondern Ausgangspunkt sein.

Die belastbarste Kurzbeschreibung des Vorhabens:

> Ein beleggestuetztes Inventar dessen, was Menschen in einem Team fachlich nachweislich getan haben, plus eine Deckungsansicht gegen selbst gesetzte Relevanz. Es bewertet keine Faehigkeiten, verteilt keine Rollen und trifft keine Aussage darueber, ob ein Team vollstaendig ist.
