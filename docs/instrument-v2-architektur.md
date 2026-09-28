# Der Test in Version 2: Architektur und Schritte

**Für: Maria, zum Entscheiden — noch nichts gebaut.** Stand 27.09.2026, auf Grundlage
der „Wissenschaftlichen Neukonzeption v0.2" und einer Bestandsaufnahme des Codes.

---

## 1. Was ich vom Gutachten halte

Es ist gut, und es ist ehrlich. Vor allem, weil es seinen eigenen Status
ausweist: „keine empirische Validierung", „keine Ergebnisse tatsächlicher
Expertengremien", „eigene Hypothese". Ein Papier, das sich selbst nicht
überverkauft, ist eine brauchbare Grundlage.

Zwei Befunde darin habe ich im Code überprüft, und beide stimmen:

**Die Richtungsfehler sind real.** Das Gutachten nennt sechs
Zustimmungsitems mit widersprüchlicher Codierung. Der Export, aus dem es
liest, ist `web/docs/founder-compatibility-item-registry-v1.json` — dieselbe
Datei, aus der das Produkt tatsächlich rechnet. Die Beispiele lassen sich dort
nachvollziehen.

**Die 0/25/50/75/100 sind wirklich nur umbenannte 1–5.** Sie stehen so in der
Registry. Das Gutachten hat recht: Das fügt keine Information hinzu.

Wo ich widerspreche oder ergänze, steht in Abschnitt 5.

---

## 2. Der eine Befund, an dem alles hängt

**Es gibt keine Versionsspalte. Nirgends.**

Weder `assessments` noch `questions` noch `choices` wissen, zu welcher Fassung
des Instruments sie gehören. Die Registry führt zwar `registryVersion`,
`modelVersion` und je Item ein `version`-Feld — aber nichts davon erreicht je
die Datenbank.

Das ist genau das, was du dir vorstellst, heute unmöglich macht:

- „Es gibt eine neue Version, du kannst deine alte behalten" — dafür muss eine
  Antwort wissen, zu welcher Version sie gehört.
- „Das Alte landet im Archiv" — dafür muss es unterscheidbar sein.
- Und jede Auswertung muss wissen, nach welchem Modell sie rechnen darf.

Ohne diese Spalte wäre ein Wechsel keine neue Version, sondern eine stille
Umdeutung aller bisherigen Antworten. Deshalb ist Versionierung nicht ein
Schritt von vielen, sondern **Schritt null**.

Nebenbefund aus derselben Ecke: Die Fragentabelle benutzt Kennungen wie
`D1_Q1`, die Registry im Code spricht von `q01_vision_l1`. Zwei
Kennungsschemata nebeneinander — mir gestern beim Testprofil aufgefallen. Beim
Umbau muss genau eines übrig bleiben.

---

## 3. Was am Test hängt

Ich habe nachgesehen, nicht geschätzt.

| | |
|---|---|
| Dateien, die an den sechs Dimensionen hängen | **47** |
| davon außerhalb von `reporting`/`scoring` | 9 (Matching-Report, Discovery, Advisor-Ansicht, Zeitleiste) |
| Zeilen im Bereich `features/reporting` | **~27.500** |
| Textbausteine (hero/pattern/challenge/complement) | ~1.500 Zeilen, alle an den sechs Achsen und ihren Polen |
| Vergleichsreport `generateCompareReport.ts` | 1.327 Zeilen |

Die sechs Dimensionen sind **kein Datenwert, sondern ein Typ**: eine
TypeScript-Union aus sechs deutschen Beschriftungen
(`CANONICAL_FOUNDER_DIMENSION_KEYS`). Wer sie ändert, ändert nicht Inhalte,
sondern die Form, auf die 47 Dateien zugreifen.

**Und es gibt eine Gesamt-Passungszahl.** `overallScore` →
`overallMatchScore` → `overallFit`, verwendet im Vergleichsreport unter
anderem für Schwellen bei 85 und 60. Das Gutachten verlangt ausdrücklich
„**ohne Gesamt-Matchscore**". Das ist die größte Einzelentscheidung in dem
Papier: Sie nimmt etwas weg, das heute da ist und an dem der Match-Report
hängt. Sie steht in Abschnitt 5 als eigene Frage.

---

## 4. Die Architektur

### Grundsatz: zwei Instrumente nebeneinander, nicht eines nacheinander

Nichts wird ersetzt, solange nicht alles fertig ist. v1 bleibt vollständig
lauffähig und rechenbar, bis du den Schalter umlegst — und auch danach, für
alle, die ihre alte Fassung behalten.

```
                 ┌──────────────────────────────────┐
                 │  instruments (neu)               │
                 │  v1 = "founder-compatibility-v1" │
                 │  v2 = "founder-alignment-v2"     │
                 └──────────────────────────────────┘
                        │                    │
        ┌───────────────┴──────┐      ┌──────┴────────────────┐
        │ questions/choices v1 │      │ items v2              │
        │ (unverändert)        │      │ (neue Tabellen)       │
        └──────────────────────┘      └───────────────────────┘
                        │                    │
        ┌───────────────┴────────────────────┴──────────────┐
        │ assessments.instrument_id  ← DIE NEUE SPALTE      │
        └───────────────────────────────────────────────────┘
                        │                    │
        ┌───────────────┴──────┐      ┌──────┴────────────────┐
        │ Auswertung v1        │      │ Auswertung v2         │
        │ (6 Achsen, Score)    │      │ (Präferenzen, Dossier)│
        └──────────────────────┘      └───────────────────────┘
```

### Vier Bausteine

**1. `instruments` — eine Zeile je Fassung.** Kennung, Anzeigename, Status
(`draft` / `active` / `archived`), Einführungsdatum. Das Archiv ist damit kein
eigener Ort, sondern ein Status.

**2. `assessments.instrument_id` — die tragende Spalte.** Alle bestehenden
Zeilen bekommen `founder-compatibility-v1`. Danach ist jede Antwort
zuordenbar, und jede Auswertung kann prüfen, ob sie zuständig ist.

**3. Getrennte Auswertungswege.** Kein `if (version === 2)` quer durch 47
Dateien. Stattdessen: `scoring/v1/` bleibt, wie es ist; `scoring/v2/` entsteht
daneben. Eine schmale Weiche entscheidet anhand von `instrument_id`, welcher
Weg läuft. Wo v2 etwas nicht hergibt — etwa eine Gesamtzahl —, liefert der Weg
schlicht nichts, statt eine Null zu erfinden.

**4. Die Einladung zur neuen Fassung.** Wer v1 abgeschlossen hat, sieht einen
Hinweis: *„Es gibt eine neue Fassung des Fragebogens. Deine bisherige bleibt
erhalten."* Zwei Knöpfe: behalten oder neu machen. Wer neu macht, behält die
alte Auswertung im Archiv — das ist kein Papierkorb, sondern eine zweite
Momentaufnahme mit Datum.

### Was das für die Freigaben heißt

Der Advisor-Bereich, der Einzelreport und die gemeinsame Auswertung hängen an
den Werten. Regeln:

- Ein **Abbild** (`person_alignment_snapshots`) merkt sich künftig, aus welchem
  Instrument es stammt. Sonst stünden v1- und v2-Zahlen unbemerkt
  nebeneinander.
- Im **Nebeneinander** zweier Menschen werden Fassungen **nicht gemischt**.
  Unterschiedliche Fassungen heißt: Es steht dabei, und es wird nicht
  verglichen. Das ist keine Strenge, sondern der einzige ehrliche Umgang —
  zwei verschiedene Instrumente ergeben keine vergleichbaren Punkte.
- Ein **Vergleich** entsteht erst, wenn beide dieselbe Fassung ausgefüllt
  haben. Solange nicht, steht dort die Einladung, die neue zu machen.

---

## 5. Was du entscheiden musst, bevor ich baue

Fünf Fragen. Ohne sie baue ich in eine Richtung, die du vielleicht nicht
willst.

### 5.1 Die Gesamt-Passungszahl — weg oder bleiben?

Das Gutachten verlangt ihre Abschaffung. Ich halte das für richtig und würde
weiter gehen: Auch ohne Gutachten ist eine Prozentzahl über die Passung zweier
Menschen aus einem unvalidierten Instrument die gefährlichste Zahl im ganzen
Produkt — sie wird zum Auswahlkriterium, sobald ein Accelerator sie sieht.

Aber sie ist heute da, und der Match-Report ist um sie herum gebaut. Das ist
deine Entscheidung, nicht meine.

**ENTSCHIEDEN am 27.09.2026 (Maria): weg.** Begründung von ihr: „haben wir eh
niemandem gezeigt, wurde wenn überhaupt nur im Hintergrund genutzt."

Das habe ich nachgeprüft, und es stimmt — mit einer Einschränkung, die die
Entscheidung eher bestärkt.

**Was die Zahl heute nicht tut:** Sie steht nirgends auf einem Bildschirm.
`overallFit` wird berechnet, in den Report gelegt und von keiner einzigen
Komponente gelesen. `overallMatchScore` erscheint nur im Audit-Modul für die
Fehlersuche. Es gibt auch keine Datenbankspalte dafür — nur alte
Report-Payloads enthalten sie als JSON, und die bleiben als Archiv, wie sie
sind.

**Was sie aber sehr wohl tut:** Sie wählt Texte aus, ohne sich zu zeigen.

- Ab 85 und ohne Spannungsfeld heißt ein Paar „Die Harmonischen
  Stabilisatoren", unter 60 oder mit zwei Hochrisikofeldern „Das High-Friction
  Power-Duo", sonst „Die balancierten Strategen". Diese Typennamen stehen in
  drei fertig formulierten Sätzen des Vergleichsreports. Sie werden derzeit
  nicht gerendert — aber sie sind genau die Personenrangliste, gegen die das
  Gutachten in Teil B argumentiert, und sie lagen eine Zeile Code davon
  entfernt, sichtbar zu sein.
- **Und eine zweite, unabhängige Zahl macht dasselbe und ist sichtbar:**
  `valuesAlignmentPercent` teilt in `symbiose` (ab 85), `schnittmenge` (ab 65)
  und `spannungsfeld` und wählt darüber den Werte-Text aus. Dieser Text
  **wird** angezeigt (`SelfValuesProfileSection`). Die Prozentzahl steht nicht
  daneben — aber sie fällt das Urteil. Das ist „Eure Werte passen zu 43 %
  zusammen" mit weggelassener Zahl, und das Gutachten nennt genau diesen Satz
  als unzulässig.

**Was daraus folgt.** „Gesamtzahl weg" heißt nicht nur: keine Zahl anzeigen.
Es heißt: **keine verborgene Zahl, die eine Aussage auswählt.** Eine Schwelle
bei 85 ist eine Behauptung über Messgenauigkeit, auch wenn niemand die 85
sieht. In v2 gibt es deshalb weder einen Passungswert noch eine Stufe, die aus
einem solchen Wert folgt — beide Registraturen halten das schon als Regel fest
(`KEINE GESAMTZAHL`), und Schritt 3 und 4 werden daran gemessen.

**Was offen bleibt.** Discovery sortiert heute nach dieser Zahl. Ohne sie
braucht es einen anderen Schlüssel — dein Vorschlag mit der Wichtigkeit je
Dimension („bei Commitment ist mir wichtig, dass wir uns sehr ähnlich sind")
ist der Kandidat und gehört in Schritt 6.

**Was jetzt nicht passiert.** v1 wird nicht umgebaut. Die Zahl anzurühren wäre
eine Verhaltensänderung am laufenden Produkt vor dem einen Release, das du
willst — und v1 wird in Schritt 8 ohnehin archiviert. Sie verschwindet mit ihm.

### 5.2 Acht Präferenzen oder weniger?

Das Gutachten schlägt acht enge Kandidaten vor (A, I, E, U, K, T, D, X) und
sagt selbst, es seien „keine acht bestätigten Faktoren". Es rechnet damit, dass
die kognitiven Interviews das Modell verändern.

Wenn wir jetzt acht Dimensionen fest in Typen und Texte bauen, bauen wir
womöglich zweimal. Mein Vorschlag: Die **Datenhaltung** verkraftet beliebig
viele Präferenzen (Liste statt fester Union), die **Texte** entstehen erst für
die, die nach dem Pretest übrig bleiben.

### 5.3 Wie weit soll das MVP gehen?

Das Gutachten unterscheidet Forschungspool (107 Blöcke) und MVP (36 Blöcke).
Für das Produkt ist nur das MVP relevant. Soll ich auf die dort genannte
konkrete Auswahl bauen — A01/A02, I01/I03, E01/E03, U01/U04, K01/K02,
T03/T06, D01/D04, X01/X06 plus Ziele, Ressourcen, Grenzen, Regeln, sechs
Wertefälle?

### 5.4 Die Texte — woher kommt die Qualität?

Du sagst, die Texte sind momentan nicht gut. Das Gutachten liefert dafür eine
Struktur, die ich für den eigentlichen Gewinn halte:

> **beobachtete Antwort → mögliche Bedeutung → konkrete Klärungsfrage →
> überprüfbare Vereinbarung**

Das ist etwas anderes als heute. Heute erzeugen die Bausteine Aussagen *über
Menschen* („du bist eher analytisch"). Die neue Struktur erzeugt Aussagen
*über ein Gespräch* („ihr habt hier unterschiedlich geantwortet — klärt
das"). Daraus folgt: Die Textbausteine werden nicht überarbeitet, sie werden
durch eine andere Art von Baustein ersetzt.

Frage an dich: Sollen die Texte weiterhin fest im Code stehen — oder in eine
pflegbare Form, die du selbst ändern kannst, ohne dass ich etwas baue?

### 5.5 Was passiert mit den Werten?

Das Gutachten verwirft die zehn Wertefragen als „moralisch gestufte
Karikaturen" und ersetzt sie durch zehn Fälle mit zwei getrennten
Wichtigkeitsbewertungen plus einer Wahl. Das ist mehr Aufwand beim Ausfüllen
und deutlich weniger Behauptung. Mitmachen?

---

## 6. Die Schritte

Jeder Schritt ist für sich lauffähig und geprüft. Nichts davon geht live,
bevor der letzte fertig ist.

| # | Schritt | Enthält | Risiko |
|---|---|---|---|
| **0** | **Versionierung** | `instruments`-Tabelle, `assessments.instrument_id`, Rückfüllung auf v1, Weiche in der Auswertung. Verhalten ändert sich **nicht**. | Gering. Reine Vorbereitung, sofort nach Fertigstellung pushbar. |
| **1** | Modell v2 als Daten | Neue Registry-Datei, Items, Antwortformate, Kennungsschema vereinheitlicht. Noch keine Oberfläche. | Gering |
| **2** | Fragebogen v2 | Ausfüllen, Speichern, Instruktion, Kontextfragen, Missing-Codes getrennt. | Mittel — neue UX |
| **3** | Auswertung v2 | Präferenzen als geordnete Kategorien, Dossier ohne Mittelwert, **kein** Gesamtwert. | Mittel |
| **4** | Texte v2 | Neue Bausteinart nach dem Vierschritt. Der größte inhaltliche Brocken. | Hoch — Qualität ist hier die Arbeit |
| **5** | Einzelreport + Abbild | Neue Darstellung, Abbild mit Instrumentkennung. | Mittel |
| **6** | Vergleich und Match | Nebeneinander statt Score. Versionen werden nicht gemischt. | Hoch — hier hängt der Align-Bereich |
| **7** | Advisor und Gruppe | Einzelreport und gemeinsame Auswertung auf v2 umstellen. | Mittel |
| **8** | Umstieg und Archiv | Hinweis an alle mit v1, behalten oder neu, Archivansicht. | Mittel |
| **9** | Ein Release | Alles zusammen: `db push`, dann `git push`. | Der eigentliche Moment |

**Schritt 0 ist die Ausnahme.** Er ändert nichts am Verhalten und macht alles
Weitere erst möglich. Den würde ich sofort nach Fertigstellung pushen, damit
er nicht monatelang ungemergt danebenliegt.

**Nachtrag vom 27.09.2026 — auch Schritt 1 ist gegangen, und die Regel lautet
jetzt anders.** Ursprünglich stand hier: alles ab Schritt 1 sammelt sich auf
einem langen Zweig. Schritt 1a und 1b sind trotzdem nach `main` gemergt, und
das ist kein Versehen, sondern eine Korrektur der Regel: Schritt 1 legt nur
Daten und Tests an. Kein einziger Import zeigt von außerhalb
`src/features/instruments/v2/` dorthin — ein Test hält das fest. Für die
laufende Anwendung ist das Modell v2 damit genauso unsichtbar wie Schritt 0.

Die Grenze ist also nicht die Schrittnummer, sondern die Erreichbarkeit: Was
niemand erreichen kann, darf nach `main`. **Ab Schritt 2 — der ersten
Oberfläche — sammelt sich alles auf einem langen Zweig und geht gemeinsam
live.** Das Gegenteil wäre das teurere Risiko: Monate unvermischter Arbeit
neben einem `main`, das sich weiterbewegt.

| # | Status |
|---|---|
| 0 | erledigt, auf `main` (Migration `20261053120000`) |
| 1a, 1b | erledigt, auf `main` — 107 Frageblöcke als Daten |
| 2a–2c | gebaut **für v2** — Ablage, Serverseite, Fragebogen |
| 3a, 3b | gebaut **für v2** — Auswertung Stufe 0, Vergleich, Klärungsbedarf, Agenda |
| 4 | gebaut **für v2** — zwölf Gesprächskarten nach dem Vierschritt aus Teil G |
| 5 | gebaut **für v2** — Einzelreport |
| 6a, 6b | gebaut **für v2** — Freigabe von Antworten, Vergleichsansicht |
| 7 | gebaut **für v2** — Advisor-Zugang mit zwei Schlüsseln |
| 8 | gebaut **für v2** — Umstieg und Archiv |
| Discovery | gebaut **für v2** — Themen statt Passungswert, alle Themen regelbar |
| **v2.1** | **die Grundlage, auf die alles umgestellt werden muss — siehe unten** |
| **9** | **offen — das eine Release** |

„Gebaut für v2" heißt: Die Bauteile stehen und sind getestet, aber sie zeigen
auf eine Fassung, die seit dem 28.09.2026 archiviert ist. Was davon auf v2.1
übertragbar ist, steht in Abschnitt 6b. Die Schrittnummern bleiben, damit
sichtbar bleibt, was schon einmal durchdacht wurde — es noch einmal von vorn
zu nummerieren würde die Arbeit verstecken statt sie zu ordnen.

Nichts davon ist produktiv sichtbar.

---

## 6b. Nachtrag vom 28.09.2026: v2 ist archiviert, v2.1 ist die Grundlage

Eine fachliche Durchsicht kam zurück und hat Fehler gefunden, die stimmen.
Zwei davon waren an einem einzigen Tag in v2 hineingekommen:

- Die Antwortstufen „bei keiner · bei ein bis zwei · bei etwa der Hälfte · bei
  den meisten · bei allen" sind **nicht erschöpfend**. Wo klickt jemand bei
  drei oder vier von zehn? Und zehn *vorgestellte* Fälle sind keine Zählung,
  sondern eine Scheingenauigkeit.
- „Noch einmal genauer hinsehen, bevor du dich für die Zahlen entscheidest"
  **unterstellt den Ausgang** und misst Nachprüfen statt Intuitionsgewicht.

Vier Items entfallen (E03, U01, T06, D04 — womit sich die Fragen 1 und 2 aus
„Was vor Schritt 9 noch zu entscheiden ist" von selbst erledigt haben), G02
wird geteilt, und fünf messen etwas anderes als vorher. Das ist kein
Umformulieren, sondern ein anderes Instrument — es bekommt deshalb eine eigene
Kennung, statt dieselbe ID mit neuer Bedeutung weiterzuführen. Genau davor
warnt die Durchsicht.

v2 hat nie jemand ausgefüllt. Es ist **archiviert, nicht gelöscht**.

| | Stand |
|---|---|
| Registratur v2.1 | 36 Items, 20 Abschnitte, 122 Optionen — aus dem geprüften Quelldokument erzeugt |
| Wächtertests | jeder Fragetext, jede Option, jede Begründung wörtlich gegen die Quelle |
| Antwortformate | vier neue: Mehrfachwahl mit Vorrang, Zeitfenster **mit Zeitzone**, wiederholte Freitexte, Anschlussfragen je Eintrag |
| Datenbank | Migration `20261069120000` (Formate), `20261070120000` (v2.1 eingetragen, v2 archiviert) |
| Verhaltensfragen | vier als **Vorschlag**, in eigener Datei, Status `proposal` |
| Dokument | `docs/fragebogen-v2-1.md` / `.html`, erzeugt über `npm run export:questionnaire` |

**Stand am Abend des 28.09.2026 — v2.1 lässt sich benutzen:**

| Schritt | v2.1 |
|---|---|
| 2 Fragebogen | fertig — `/debug/alignment-v2-1`, alle dreizehn Antwortformate, laufendes Speichern |
| 3 Auswertung | fertig — Lesbarmachung ohne Zahlen, ordinal und nominal getrennt |
| 5 Einzelreport | fertig — `/debug/alignment-v2-1/report`, mit Markierung nach der Abgabe |
| 6 Vergleich | fertig — `/debug/alignment-v2-1/compare/[partnerId]`, Agenda, keine Passungszahl |
| 4 Texte | **offen** — die Gesprächskarten aus v2 sind nicht übertragen |
| 7 Advisor | **offen** |
| 8 Umstieg/Archiv | **offen** |
| Discovery | **offen** — die Themenurteile hängen noch an v2 |

Der Schreibweg ist durch Tests und Datenbankprüfungen gedeckt, aber **niemand
hat ihn im Browser benutzt**. Das sollte ein Mensch tun, bevor irgendetwas
davon weiterzieht.

**Die vier Verhaltensfragen** (A91, U91, K91, T91) sind Marias Idee: neben dem
Wunsch auch das Verhalten fragen, damit sich beides gegenprüfen lässt. Sie
liegen absichtlich außerhalb der Registratur, damit der Wächtertest nicht
anschlägt und niemand sie für fachlich geprüft hält. Der Vergleich ergibt
**ein Gesprächsthema, nie ein Urteil über Gültigkeit** — wer sich etwas
wünscht und zuletzt anders gehandelt hat, hat nicht falsch geantwortet.

Sie gehören der Gutachterin vorgelegt, bevor etwas davon festgeschrieben wird.
Genauso wie: `confidential_first` als eigener Auslassungsgrund statt als
`withheld`.

---

## Was vor Schritt 9 noch zu entscheiden ist

**Inhaltlich, und nur von Maria zu entscheiden:**

1. ~~**Fünf Fragen mit Deckeneffekt**~~ — mit v2.1 erledigt: E03, U01, D04
   sind entfallen, K02 und I01 sind umformuliert. Die Durchsicht hat übrigens
   angemerkt, dass ich den Deckeneffekt als Tatsache hingeschrieben hatte, wo
   er eine Vermutung war. Das stimmt.
2. ~~**T03 und T06 zusammenlegen**~~ — mit v2.1 erledigt: T03 ist jetzt eine
   Frage mit Zeitpunktoptionen, T06 ist entfallen.
2b. **Die vier Verhaltensfragen** — der Gutachterin vorzulegen. Sie stehen in
   `docs/fragebogen-v2-1.md` hinten unter einer eigenen Überschrift.
3. **Werden die v2-Antworten je Forschungsdaten?** Wenn ja, gehört die
   Einwilligung an den Fragebogen, bevor zum ersten Mal jemand ausfüllt — nicht
   danach. Bauplan: `docs/forschungsdaten-architektur.md`.

**Vor der ersten echten Erhebung, nicht vor dem Release:**

4. **Der Forschungspool trägt noch die alte Frageform.** Die 42 übrigen
   Häufigkeitsfragen haben keine Bezugsmenge — und seit v2.1 zusätzlich: sie
   gehören zu einem Instrument, das archiviert ist. Sie werden niemandem vorgelegt;
   wer eine in die Gesprächsfassung holt, muss ihr vorher eine geben. Ein Test
   hält das fest.
5. **Kognitive Interviews und Expertenreview** (Teil H). Nicht technisch.
6. **Die Datenschutzerklärung** muss nennen, was ohne Einwilligung geschieht —
   die Häufigkeitsauswertung zur Qualitätsprüfung. Aus dem Einwilligungstext
   ist sie bewusst heraus.

**Technisch offen:**

7. **Discovery selbst zeigt die Urteile noch nicht.** Die Themenauswahl und die
   Urteilsfunktion stehen, und die Urteile erscheinen über dem Vergleich — aber
   die Liste, durch die man in Discovery blättert, ist noch die alte. Das
   Zusammenführen gehört zu Schritt 9.
8. **Der Schreibweg ist nie von Hand durchgeklickt worden.** Autospeichern,
   Zurücknehmen und Abgeben sind durch Tests und Datenbankprüfungen gedeckt,
   aber niemand hat sie im Browser benutzt. Das sollte ein Mensch tun.

**Bewusst nicht in v2 (aus früheren Gesprächen):** Advisor-Report mit
Interview, adaptive Nachfragen, Audio/Vorlesen.

**Notiert, nicht angefasst:** `advisor_person_grants_approved` verlangt
`(status='active') = (approved_at is not null)`. Wer einen Grant widerruft,
muss `approved_at` auf null setzen und verliert damit, wann einmal zugestimmt
wurde. v1-Gebiet.

**Wo der Fragebogen liegt und warum dort.** `/debug/alignment-v2/base` (mit
`?step=2` für die Zusagen) und `/debug/alignment-v2/values`. Unter `debug`,
weil das Instrument auf `draft` steht: Die Texte sind nicht redigiert, die
kognitiven Interviews haben nicht stattgefunden, und die Auswertung dahinter
gibt es noch nicht. In Production ist die Seite 404. Der Umzug auf eine echte
Route ist Schritt 9 und soll eine eigene, bewusste Änderung sein.

Ein Test hält die Regel: Keine Datei außerhalb von `debug` darf auf v2
zugreifen. Der gefährliche Fall ist nicht, dass jemand v2 baut — es ist, dass
jemand einen Link vom Dashboard darauf setzt, weil es „ja schon geht".

**Die Fragen bleiben deutsch, auch im englischen Interface.** Ein
Messinstrument zu übersetzen ist keine Übersetzungsarbeit, sondern eine neue
Validierung: Ein Item, das sich anders liest, misst etwas anderes, und die
Äquivalenzprüfung dafür gibt es nicht. Die Oberfläche ist zweisprachig, die
Items sind es nicht — und der englische Textbestand sagt das ausdrücklich.

---

## 7. Was dabei nicht passieren darf

- **Keine stille Umdeutung.** Eine v1-Antwort darf nie nach v2-Regeln
  ausgewertet werden, auch nicht „näherungsweise".
- **Kein Datenverlust.** Alte Antworten, alte Reports, alte Abbilder bleiben
  lesbar. Wer nichts tut, verliert nichts.
- **Keine gemischten Vergleiche.** Zwei Menschen mit verschiedenen Fassungen
  werden nicht verglichen — es steht dabei, warum.
- **Kein Zwang.** Niemand muss den neuen Test machen. Das alte Ergebnis bleibt
  gültig, solange die Person es behalten will.
- **Keine Zahl, die das Instrument nicht hergibt.** Das ist der Kern des
  Gutachtens und deckt sich mit dem, was in diesem Produkt schon gilt.

---

## 8. Was ich als Nächstes bräuchte

Antworten auf die fünf Fragen in Abschnitt 5 — vor allem auf 5.1 (die
Gesamtzahl) und 5.4 (wo die Texte leben sollen). Danach fange ich mit
Schritt 0 an, weil der unabhängig von allen inhaltlichen Entscheidungen
richtig ist.

Und eine Warnung zur Größe: Das sind zehn Schritte über 47 Dateien und rund
27.500 Zeilen im Berichtsbereich. Das ist kein Nachmittag. Es ist aber gut
teilbar, und nach Schritt 0 kann jederzeit pausiert werden, ohne dass etwas
halb fertig herumliegt.
