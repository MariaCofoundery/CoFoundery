# Das Founder-Arbeitsprofil verständlich machen — Phase 5

**Stand:** 01.10.2026 · **Branch:** `feat/arbeitsprofil-synthese` (auf
`feat/profil-pdf`) · **Grundlage:** laufender Code, laufende lokale Datenbank
und die Registratur `docs/founder-profile-registry-v1.json`

---

## 1. Welche Items und Response-Typen wurden gefunden?

Sechzehn Fragen, fünf Abschnitte, **ein** Antwortformat in zwei Varianten.
Gegen die Registratur geprüft, nicht gegen eine Spezifikation.

| Abschnitt (Registratur) | Items | Format | Antwortstufen |
|---|---|---|---|
| A – Analytische Prüfung | A01, A02 | `ordinal_choice` | nie · selten · manchmal · häufig · fast immer |
| I – Nutzung von Erfahrungsintuition | I01, I02, I03 | `ordinal_choice` | gar nicht · eher wenig · mittel · stark · sehr stark |
| E – Frühes Erproben | E01, E02, E03 | `ordinal_choice` | sehr unwahrscheinlich … sehr wahrscheinlich |
| T/D – Unterschiede ansprechen | T01, T02, D01 | **`single_choice`** | je fünf Handlungs- bzw. Formulierungswahlen |
| T/D | D02 | `ordinal_choice` | sehr unwahrscheinlich … sehr wahrscheinlich |
| X – Wohlbefinden bei offener Informationslage | X01–X04 | `ordinal_choice` | sehr unwohl … sehr wohl |

Jedes Item trägt genau einen Auslassungsgrund: `cannot_assess` („kann ich noch
nicht einschätzen"). `overallScore: false`, `dimensionScores: false`, Status
`draft` — unverändert.

---

## 2. Welche Items sind ordinal, welche nominal?

**Dreizehn ordinal:** A01, A02, I01–I03, E01–E03, D02, X01–X04.

**Drei nominal:** T01, T02, D01.

### T01 sieht nach einer Reihenfolge aus und ist keine

Seine Antworten lesen sich wie eine Zeitachse — „noch im laufenden Gespräch",
„am selben Arbeitstag", „am nächsten Arbeitstag", „nach mehr als einem
Arbeitstag" — und die fünfte heisst **„situationsabhängig"**. Sie liegt
nirgends auf dieser Achse. Als späteste Stufe gezählt wäre sie schlicht
falsch; weggelassen wäre die Skala eine andere als die, die zur Wahl stand.

Die Registratur sagt dazu `single_choice`, und dabei bleibt es. T01, T02 und
D01 werden als das beschrieben, was sie sind: als gewählte Antwort, im
Wortlaut der Person. Sie bekommen keine Punktreihe in der Karte (das war
schon vorher so — `mapRows.ts` lässt nur geordnete Werte zu) und keine Lage in
der Beschreibung.

---

## 3. Wie wurde die WorkMap verständlicher gemacht?

**Jede Zeile sagt jetzt, worauf sie antwortet.**

Vorher stand je Zeile nur die gewählte Stufe: eine Punktreihe und daneben
„häufig". Drei Zeilen mit „eher wahrscheinlich" untereinander sagen nichts,
solange nicht dabeisteht, worüber — das Bild war ohne die Liste darunter nicht
zu lesen.

```
ENTSCHEIDUNGEN ABWÄGEN
  Möglichkeiten vergleichen
  ○ ○ ○ ○ ●   fast immer
  Annahmen gezielt prüfen
  ○ ○ ○ ● ○   häufig
```

Zwei Dinge sind dazugekommen:

* **Die Abschnittsüberschrift ist die des Menschen.** Statt „A – Analytische
  Prüfung" steht „Entscheidungen abwägen". Die Registratur behält ihren
  technischen Namen — sie braucht ihn.
* **Je Zeile eine kurze Beschriftung**, nicht die ganze Frage. Die hängt
  weiterhin an der Zeile (`title`) und steht ausgeschrieben in der Liste.

Beides nur für das Arbeitsprofil: Der Vorhaben-Bogen hat keine solchen
Beschriftungen, und dort bleibt die Zeile, wie sie war. Deshalb wird je Frage
nachgesehen, statt eine Beschriftung zu erzwingen.

---

## 4. Welche Kurzlabels werden verwendet?

Aus den tatsächlichen Fragetexten formuliert, nicht aus den Beispielen
übernommen.

| | | | |
|---|---|---|---|
| A01 | Möglichkeiten vergleichen | X01 | mehrere Erklärungen offen |
| A02 | Annahmen gezielt prüfen | X02 | Richtung länger offen |
| I01 | erster Eindruck im vertrauten Thema | X03 | widersprüchliche Rückmeldungen |
| I02 | Gefühl bei ähnlich guten Optionen | X04 | wichtige Frage ohne Antwort |
| I03 | Gefühl gegen die Zahlen | T01 | wann ein Einwand kommt |
| E01 | testen statt weiter recherchieren | T02 | Bedenken ohne klaren Grund |
| E02 | zwei Wege parallel ausprobieren | D01 | wie Widerspruch klingt |
| E03 | vorläufig festlegen, wenn korrigierbar | D02 | ausdrücklich nicht zustimmen |

Die fünf Themennamen: **Entscheidungen abwägen · Erfahrung & Bauchgefühl ·
Ausprobieren & Lernen · Unterschiede ansprechen · Mit offenen Fragen umgehen.**

Alle sechzehn Beschriftungen und alle fünf Namen gibt es auf Deutsch und
Englisch; ein Test prüft, dass keine fehlt.

---

## 5. Wie funktioniert die Syntheselogik je Thema?

Vier Schritte, deterministisch, in `workProfileSynthesis.ts`:

1. Die **beantworteten geordneten** Fragen des Themas werden nach ihrer Lage
   gruppiert — `low` (Stufe 1–2), `middle` (3), `high` (4–5).
2. Eine Gruppe mit **zwei oder mehr** Fragen bekommt **einen Satz über das
   Thema** in dieser Lage. Was zusammen ausgefallen ist, darf zusammen
   beschrieben werden.
3. Eine Gruppe mit **genau einer** Frage bekommt **den Satz dieser Frage**.
   Aus einer einzelnen Antwort wird nichts über ein Thema abgeleitet.
4. Die Wahlen ohne Rangfolge stehen danach einzeln, im Wortlaut der gewählten
   Antwort.

**Es wird nichts gerechnet.** Kein Mittelwert, keine Summe, keine Punktzahl,
kein Normvergleich — ein Test liest das Modul und fällt bei `reduce`,
`/ length`, `average` oder `score`.

**Eine Lage ist kein Messwert.** Sie fasst *eine einzelne Antwort* zusammen,
damit ein Satz darüber formulierbar ist: „selten" und „nie" brauchen nicht zwei
verschiedene Beschreibungen. Die Mitte bleibt eine eigene Lage — sie auf eine
der Seiten zu ziehen wäre eine Entscheidung, die die Person nicht getroffen hat.

**Kein Modell.** Dieselben Antworten ergeben immer dieselben Sätze. Die Texte
stehen zentral in `alignment.synthesis`; `/me/profile`, der Advisor und beide
PDF-Fassungen benutzen dieselbe Ableitung und dasselbe Bauteil.

---

## 6. Wie werden gemischte/widersprüchliche Antworten behandelt?

Sie bleiben, was sie sind. Hier die drei Fälle aus der Aufgabe, im Browser
gerendert:

**I01 niedrig, I02 niedrig, I03 hoch** →

> Deinen ersten Eindruck und dein Gefühl nutzt du nicht automatisch als
> Entscheidungsgrundlage.
> Stehen Zahlen und Gefühl gegeneinander, nimmst du das Gefühl deutlich als
> zusätzliches Signal ernst.

**E01 hoch, E02 niedrig, E03 hoch** →

> Wo sich etwas ausprobieren lässt, tust du das eher, als weiter zu überlegen.
> Zwei Wege parallel im Kleinen auszuprobieren passt eher nicht zu dir.

**X01 niedrig, X02 niedrig, X03 mittel, X04 hoch** →

> Wenn etwas offen bleibt, ist dir das eher unangenehm.
> Widersprüchliche Rückmeldungen zur selben Idee hältst du aus.
> Bleibt eine wichtige Frage länger ohne eindeutige Antwort, fühlst du dich
> damit wohl.

Nirgends steht „du entscheidest wenig intuitiv" oder „du experimentierst
gerne". Zusammengefasst wird nur, was auch zusammen ausgefallen ist; alles
andere bekommt seinen eigenen Satz.

### T/D wird nicht zu einem Konfliktstil zusammengezogen

Der Titel heisst „Unterschiede ansprechen", die Sätze beschreiben die
konkreten Handlungen:

> Dass du einem Vorschlag nicht zustimmst, sagst du eher nicht ausdrücklich.
> Wann du einen Einwand ansprichst, machst du von der Situation abhängig.
> Bedenken, die du noch nicht genau benennen kannst, sprichst du direkt an …
> Bist du anderer Meinung, fragst du am ehesten nach, wie der Vorschlag mit
> deinem Einwand umgehen würde.

Vier Fragen, vier Aussagen, keine Zusammenziehung zu „direkt" oder
„konfliktfähig".

---

## 7. Wie werden Missing Answers behandelt?

Eine nicht beantwortete Frage ist in der Beschreibung **nicht vorhanden**.
Sie wird nicht als Mitte gelesen, zählt in keiner Gruppe mit, und über sie
steht nichts.

* Ein Thema mit einer beantworteten und einer offenen Frage beschreibt die
  eine. (Und zwar als Einzelsatz — eine Gruppe aus einer Frage bekommt keinen
  Themensatz.)
* Ein Thema, in dem gar nichts beantwortet ist, sagt: *„Dazu liegen bisher
  noch zu wenige Antworten für eine zusammenhängende Beschreibung vor."*
* Ein Thema, von dem der Lesende **keine Frage sieht**, erscheint gar nicht —
  auch nicht mit diesem Satz. Das ist der Advisor-Fall (Punkt 9).

`cannot_assess` bleibt in der Rohantwortliste sichtbar, wo es hingehört.

---

## 8. Welche Texte erscheinen in „Das bist du"?

Reihenfolge im Abschnitt „Wie du arbeitest":

```
Deine Antworten aus dem Founder-Arbeitsprofil …
Selbstauskunft, kein Testergebnis.
7 von 16 Fragen beantwortet

[ WorkMap — fünf Themen, je Zeile Beschriftung und Antwort ]

[ Was sich in deinen Antworten zeigt ]
   Entscheidungen abwägen        …
   Erfahrung & Bauchgefühl       …
   Ausprobieren & Lernen         …
   Unterschiede ansprechen       …
   Mit offenen Fragen umgehen    …
   Die Beschreibungen fassen deine Antworten zusammen; sie sind keine
   Diagnose, kein Normvergleich und keine Punktzahl.

▸ Deine Antworten            (aufklappbar, unverändert)
```

**Die Beschreibung steht offen, nicht im Aufklapper.** Die Rohantworten sind
das Nachschlagewerk und bleiben eingeklappt; dies ist das Ergebnis. Ein Test
prüft die Reihenfolge.

### Der Disclaimer

Vorher: *„Selbstauskunft, kein Testergebnis. Zu dieser Fassung gibt es noch
keine Auswertung — was hier steht, sind die Antworten selbst. Keine Punktzahl
und keine Einordnung."*

Der mittlere Teil stimmt nicht mehr. Der Satz ist deshalb auf zwei Stellen
verteilt, jede dort, wo sie gilt:

* an der Karte: **„Selbstauskunft, kein Testergebnis."**
* an der Beschreibung: **„Die Beschreibungen fassen deine Antworten zusammen;
  sie sind keine Diagnose, kein Normvergleich und keine Punktzahl."**

Derselbe Satz steht Wort für Wort auch beim Advisor — ein vorhandener Test
hält das fest, und er wurde nachgezogen, nicht gelockert. `founder-profile-v1`
bleibt `draft`.

---

## 9. Was sieht der Advisor?

**Dieselbe Beschreibung — und nur über das, was freigegeben ist.**

Die Advisor-Ansicht bekommt `view.sections`; was nicht freigegeben ist, kommt
dort gar nicht erst an (das entscheiden die Policies, nicht die Seite). Die
Beschreibung entsteht aus genau dieser Liste. Es gibt also keinen Weg, über
eine Zusammenfassung mehr zu erfahren als über die Antworten selbst — nicht
durch Sorgfalt, sondern durch Bauweise.

Im Browser in beide Richtungen nachgemessen:

| Lage | Ergebnis |
|---|---|
| keine Freigabe (so wie der Seed ausliefert) | **keine Beschreibung**, kein leerer Kasten |
| Freigabe, aber I01–I03 zurückgehalten | „Du siehst 13 von 16 Fragen" · Beschreibung zeigt **vier** Themen — „Erfahrung & Bauchgefühl" fehlt vollständig |

Das zurückgehaltene Thema erscheint nicht einmal mit „zu wenige Antworten":
Dass es diese Fragen gibt, ist aus der Beschreibung nicht abzulesen.

---

## 10. Was steht im Kurz-/Lang-PDF?

| | Kurzprofil | Langfassung |
|---|---|---|
| WorkMap mit Beschriftungen | ✓ | ✓ |
| Was sich in deinen Antworten zeigt | ✓ | ✓ |
| die 16 Rohantworten | — | ✓ |
| v1-Altbestand | nie | nur auf Auswahl |

Damit ist der Arbeitsprofil-Teil des Kurzprofils zum ersten Mal ohne die
Rohantworten verständlich — vorher standen dort Punktreihen und sonst nichts.

Die Druckregeln aus Phase 4 gelten unverändert; die Beschreibung trägt
`print-keep`, damit ein Thema nicht über zwei Blätter reisst.

---

## 11. Wie hat sich die Seitenzahl des Kurzprofils verändert?

Echte PDFs über `Page.printToPDF`, A4.

| Profil | kurz | lang | + Altbestand |
|---|---|---|---|
| Seed-Profil, 16 Antworten | **6** | 10 | 15 |
| Stressprofil, 16 Antworten | **9** | 18 | 23 |

**Der Vergleich mit Phase 4 wäre irreführend**, und deshalb steht er so nicht
da: Dort hatte derselbe Bogen nur neun beantwortete Fragen (so liefert der
Seed aus). Gemessen wurde stattdessen, was die neuen Teile im Druck wirklich
kosten, bei A4-Inhaltsbreite unter `print`-Medium:

```
Was sich in deinen Antworten zeigt    768 px   ≈ 0,77 A4-Seiten
WorkMap (16 Zeilen mit Beschriftung)  976 px   ≈ 0,97 A4-Seiten
```

Die Beschreibung kostet also **unter einer Seite** — und sie ist der Teil, der
den Abschnitt überhaupt lesbar macht. Der Rest des Zuwachses geht auf die
Karte: Sie hat jetzt sechzehn statt neun Zeilen, und jede trägt eine
Beschriftung mehr.

Das Kurzprofil eines gewöhnlichen Profils bleibt mit **6 Seiten** im Rahmen
von Phase 4 („ca. 3–6"). Das Stressprofil liegt mit 9 darüber; die Ursache ist
in Phase 4 gemessen und dort dokumentiert — kein Abschnitt ist
unverhältnismässig, es sind schlicht zehn volle Abschnitte.

---

## 12. Welche Grenzen bleiben fachlich bestehen?

**Es ist weiterhin eine Selbstauskunft.** Beschrieben wird, was jemand über
sich angekreuzt hat — nicht, was er tut. Dieselbe Einschränkung wie vorher,
nur steht jetzt mehr daneben, was sie betrifft.

**Eine Lage ist eine Vergröberung.** „Stufe 4 oder 5" wird zu „hoch". Wer
genau wissen will, was angekreuzt wurde, findet es in der Karte und in der
Liste — beide stehen weiter da.

**Die Gruppierung ist eine Entscheidung.** Dass zwei Antworten derselben Lage
zusammen beschrieben werden, ist eine Lesehilfe und keine Aussage darüber,
dass die beiden Situationen dasselbe sind. Die Sätze sind deshalb so
geschrieben, dass sie für beide Fragen gelten.

**T01, T02 und D01 bleiben Einzelaussagen.** Es gibt keine Beschreibung über
das Thema „Unterschiede ansprechen" als Ganzes, weil es dafür nur eine
geordnete Frage gibt (D02) — und aus einer Antwort wird nichts über ein Thema
abgeleitet.

**Die Fragetexte und die Antwortstufen bleiben deutsch.** Auch in der
englischen Fassung steht an einer Zeile „fast immer": Das ist der Wortlaut des
Instruments, und eine maschinelle Übersetzung stand ausdrücklich nicht im
Auftrag. Übersetzt sind die Themennamen, die Kurzbeschriftungen und alle Sätze
der Beschreibung.

**`founder-profile-v1` bleibt `draft`.** Diese Phase ändert daran nichts.

---

## 13. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2584 Tests · next build · 1311 DB-Tests
                     alles grün
```

**Neu:** `features/instruments/align/__tests__/arbeitsprofilSynthese.test.ts`,
17 Fälle — das Instrument, wie es wirklich ist (13 ordinal, 3 nominal, T01
samt „situationsabhängig") · die Lage ist keine Rechnung · überall niedrig und
überall hoch ergeben je einen Satz · die drei widersprüchlichen Muster aus der
Aufgabe, einzeln · aus einer Antwort wird nichts über ein Thema · T/D landet
auf keiner Achse · über Unbeantwortetes steht nichts, und ein unsichtbares
Thema erscheint gar nicht · die alten v1-Dimensionen kommen nicht zurück ·
zu jeder möglichen Antwort gibt es einen Satz in beiden Sprachen · dieselbe
Ableitung auf allen drei Oberflächen · der alte Satz „noch keine Auswertung"
ist weg.

**Im Browser gerendert** (Chrome 154 headless, echte Anmeldung):

| geprüft | Ergebnis |
|---|---|
| `/me/profile` bei 320 / 375 / 1024 px | kein Überlauf, nichts abgeschnitten, 0 Tippziele unter 44 px |
| WorkMap-Beschriftungen | brechen um, laufen nicht über |
| die drei widersprüchlichen Muster | lesen sich wie in Punkt 6 |
| Advisor ohne Freigabe | keine Beschreibung |
| Advisor mit Teilfreigabe | vier statt fünf Themen, das zurückgehaltene fehlt ganz |
| Kurz- und Lang-PDF | 6 / 10 Seiten, kein Überlauf |
| Englisch | Themennamen, Beschriftungen und alle Sätze übersetzt |

Dabei hat mich eine eigene Messung zweimal in die Irre geführt: Ein
Schnellskript meldete zwölf überlaufende Elemente bei 320 px — es waren die
Sprungmarken in der Rollzeile aus Phase 2.1, die dort hinausragen dürfen. Mit
der Messung, die diese Ausnahme kennt, sind es null.

**Testdaten entfernt**, danach `supabase db reset --local` und neu geseedet;
nachgezählt: 0 Freigaben, 0 Ressourcen, 0 QA-Zeilen.

---

## 14. Branch und Reihenfolge

`feat/arbeitsprofil-synthese` baut auf `feat/profil-pdf` auf. Der Stapel ist
jetzt vier Branches tief; auf `origin` liegt davon nur
`feat/ueber-dich-phase-3`, und `main` steht bei Phase 2.

**Keine Migration in dieser Phase.** Es bleibt bei der Reihenfolge aus
Phase 3: erst `npx supabase db push` wegen `person_section_marks`, dann der
Code.

Nicht deployt. Das bleibt ein manueller Schritt.
