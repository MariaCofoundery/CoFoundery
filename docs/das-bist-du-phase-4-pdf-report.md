# „Das bist du" als PDF — Phase 4

**Stand:** 01.10.2026 · **Branch:** `feat/profil-pdf` (auf
`feat/ressourcen-von-hand`) · **Grundlage:** laufender Code und laufende
lokale Datenbank, dazu die Berichte zu Phase 2, 2.1, 3 und 3.1

---

## 1. Welche bestehende Druckarchitektur gab es?

Eine vollständige — ohne PDF-Bibliothek, und sie reicht.

| Teil | was er tat |
|---|---|
| `PrintReportButton` | ruft `window.print()` und meldet ein Forschungsereignis |
| `ReportActionButton` | der geteilte Knopf darunter |
| `OpenDetailsForPrint` | klappte beim Drucken **alle** `details` auf |
| `@media print` in `globals.css` | A4-Rand, weisser Grund, `.no-print`, `break-inside: avoid` für Karten |
| `/founder-alignment/workbook/print` | eine vorhandene eigene Druckroute als Muster |

**Der Befund:** Gedruckt wurde die Leseseite selbst. `OpenDetailsForPrint`
öffnete dabei jeden Aufklapper — den Altbestand aus dem früheren Fragebogen,
die Herkunft jeder Aussage, die eigenen Antworten in voller Länge.

Das ist zweierlei Falsches auf einmal. Der Inhalt hing davon ab, was jemand
vorher angeklickt hatte: Zwei Menschen mit demselben Profil bekamen zwei
verschiedene Dokumente, und niemand konnte sehen, warum. Und ein Dokument, das
alles enthält, ist keine Auswahl, sondern ein Abzug.

**Keine neue Bibliothek.** Chrome, Safari und Firefox drucken HTML nach PDF;
was fehlte, war nicht die Technik, sondern eine Seite, die weiss, was sie
zeigen soll.

---

## 2. Wie wurden `short` und `full` technisch getrennt?

```
/me/profile/print?mode=short
/me/profile/print?mode=full
/me/profile/print?mode=full&legacy=1
```

Der Modus kommt aus der Adresse und sonst nirgendwoher. `parsePrintMode`
nimmt `full` nur bei genau dieser Zeichenkette — alles andere, auch
`"FULL"` oder nichts, ergibt `short`. **Kurz ist die Voreinstellung:** Wer
ohne Angabe dort landet, bekommt die Fassung mit *weniger* persönlichen
Angaben.

Die Seite hat **keinen einzigen Aufklapper**, auch keinen geerbten: Der
Altbestand kommt mit `density="full"` und damit flach. Es gibt also nichts,
dessen Zustand das Dokument verändern könnte.

### Eine Datenquelle für beide Seiten

Dabei ist `features/reporting/profileReadModel.ts` entstanden: sechs Quellen,
acht Ableitungen, einmal. `/me/profile` und die Druckfassung lesen dieselbe
Funktion.

Zweimal geladen hiesse: zwei Listen, die auseinanderlaufen, sobald jemand eine
davon anfasst — und zwar lautlos, denn einem Ausdruck, dem ein Abschnitt
fehlt, sieht man nicht an, dass er fehlt.

Die Leseseite ist dadurch von 1148 auf 975 Zeilen geschrumpft und zeigt
unverändert dasselbe.

---

## 3. Welche Inhalte enthält die Kurzfassung?

Was auf „Das bist du" offen steht — und keine dritte Dichte daneben.

| Abschnitt | Inhalt |
|---|---|
| Kopf | Name, Headline, Region, „Stand vom", Kennzeichen „Kurzprofil" |
| Über dich | Bio, Region, Arbeitsmodus, Expertise, Branchen |
| Wie du arbeitest | die `WorkMap` plus „Selbstauskunft, kein Testergebnis" |
| Deine Stärken | die ersten fünf, Selbst- und Fremdsicht, **ohne Herkunft** |
| Deine Fähigkeiten | die `CoverageMap` je Familie |
| Erfahrung & Tiefe | die Zählung plus die Bereiche mit viel festgehaltener Erfahrung |
| Was du verantworten willst | die vier Wunschgruppen plus „kann es, gibt es ab" |
| Wohin du wachsen willst | nur, wenn vorhanden |
| Netzwerk & Ressourcen | nur `confirmed`, nach Art |
| Was dich antreibt | zwei Aussagen je Facette, zehn Facetten |
| Deine Vorhaben | nur Namen |
| Was diese Seite zeigt | der Hinweis und die vier Einschränkungen |

Die beiden sichtbaren Dichten (fünf Stärken, zwei Aussagen je Facette) stehen
in `profileSummary.ts` und gelten für die Seite **und** das PDF. Ein Test
prüft, dass es eine Zahl ist und nicht zwei.

**Begrenzt wird ohne Rangfolge.** Es gibt keine „Top 5" und keine „wichtigste
Fähigkeit" — das Modell kennt so etwas nicht. Wo etwas wegfällt, steht
„N weitere Einträge stehen im ausführlichen Profil".

---

## 4. Welche Inhalte enthält die Langfassung?

Alles aus der Kurzfassung, und dazu:

* **Arbeitsweise:** `ReportViewV21` — jede Antwort mit ihrem Fragetext, die
  fehlenden Angaben mit ihrem Grund, die markierten Gesprächspunkte. Weiterhin
  keine Punktzahl und keine Einordnung; die Registratur sagt
  `overallScore: false`.
* **Stärken:** alle, ohne Begrenzung.
* **Fähigkeiten:** jeder Bereich mit Stufe und Verantwortungswunsch, **nach
  Familien gruppiert**. Die Liste entsteht gar nicht erst, wenn die
  Kurzfassung gemeint ist.
* **Rollen:** zusätzlich die Faltin-Liste (`CoverageRoles`).
* **Was dich antreibt:** alle bestätigten Aussagen, zehn Facetten,
  unverdichtet.
* **Ressourcen:** alle bestätigten.
* **Der Altbestand**, auf Auswahl — siehe Punkt 5.

**Die Zahl der Belege steht nicht dabei.** `FounderProfileCapability` kann sie
zeigen und tut es auf der eigenen Seite; im PDF ist `evidenceCount: null`.
„3 Belege" sagt einem Leser nichts, was er nachsehen könnte — die Belege
selbst bleiben ohnehin draussen.

---

## 5. Wie wird v1 behandelt?

**Nie in der Kurzfassung.** In der Langfassung nur, wenn jemand ihn
ausdrücklich dazunimmt:

```
[ ] Frühere Auswertung mit aufnehmen        → ?mode=full&legacy=1
```

Ein echtes Formular mit echtem Haken, abgewählt voreingestellt. Es funktioniert
ohne JavaScript, und der Zustand steht danach in der Adresse — wer den Link
weitergibt, gibt dieselbe Fassung weiter. `parseIncludeLegacy` akzeptiert nur
`"1"`; `"true"` oder `"0"` zählen nicht.

Ist er dabei, steht er als eigener Abschnitt mit seinem Datum und dem Satz,
dass er auf einer anderen Fassung beruht und **nicht** mit dem aktuellen
Arbeitsprofil verrechnet wird. Keine gemeinsame Skala, kein Mapping.

Er kommt mit `density="full"` und damit flach: In der Zusammenfassungsform
stecken seine Kapitel in Aufklappern, und ein zugeklapptes `details` im PDF
wäre eine leere Seite.

---

## 6. Welche Daten werden bewusst nie exportiert?

| | warum |
|---|---|
| `evidence_quote`, Interview-Erzählungen, `source_turn_id` | Sie gehören zur Entscheidung, etwas zu übernehmen — nicht zu der Person, die danach dasteht. Frage 3 des Katalogs fragt ausdrücklich nach dem Leben ausserhalb der Erwerbsarbeit. |
| Herkunftslabels („aus einem Gespräch bestätigt") | dieselbe Begründung; auf der eigenen Seite nützlich, in einer weitergegebenen Fassung eine Fussnote an einer Aussage |
| `person_section_marks`, „noch offen", „begonnen", „für jetzt fertig" | Der Leser bekommt ein Founderprofil, keinen Formularstatus — und die Markierung ist eine private Notiz an sich selbst |
| „Bearbeiten", „Weitermachen", „Vorschläge prüfen" | Aufforderungen an die falsche Person |
| offene Vorschläge (`pending`) | eine Modellbehauptung, über die noch niemand entschieden hat |
| Venture-Alignment-Antworten | gelten für EIN Vorhaben und einen Zeitraum; das Profil gilt für die Person |

Nachgemessen im gerenderten Dokument: **0 `blockquote`, 0 Aufklapper, 0
Knöpfe oder Links** (die Leiste darüber trägt `no-print` und ist beim Drucken
`display: none`).

> **Ein Treffer, der kein Builder-Status ist:** „Noch offen" steht in beiden
> Fassungen — als Name der vierten Verantwortungsgruppe („zu diesen Bereichen
> ist die zweite Frage noch nicht beantwortet"). Das ist eine Angabe über die
> Verantwortungswünsche und gehört in ein Gespräch darüber. Dasselbe Wort,
> eine andere Sache.

---

## 7. Wie werden leere Bereiche behandelt?

Sie entfallen. Vollständig und ohne Hinweis.

```tsx
{workProfile ? … : null}
{strengths.length > 0 ? … : null}
{orderedEntries.length > 0 ? … : null}
{growingInto.length > 0 ? … : null}
{confirmedResources.length > 0 ? … : null}
{directionStatements.length > 0 ? … : null}
{ventures.length > 0 ? … : null}
```

Auf der eigenen Seite ist „hier könnte noch etwas stehen" eine Einladung. In
einer weitergegebenen Fassung ist es eine Aussage über einen Menschen,
gerichtet an jemanden, der nichts daran ändern kann. `MissingSection` kommt im
Dokument nicht vor.

---

## 8. Wie funktionieren die Print-Maps?

**Sie funktionieren, so wie sie sind.** Gemessen unter `print`-Medium bei
A4-Inhaltsbreite (674 px bei 96 dpi und 16 mm Rand):

| | Breite | ragt hinaus | SVG/Canvas | Textelemente |
|---|---|---|---|---|
| WorkMap | 674 px | 0 | 0 | 76 |
| CoverageMap | 674 px | 0 | 0 | 378 |
| CoverageRoles | 674 px | 0 | 0 | 62 |

Keine davon ist eine Grafik im eigentlichen Sinn — alle drei sind aus `div`s
und Beschriftungen gebaut. Damit tragen sie ihre Bedeutung im Text und nicht
in der Farbe, sie werden nicht abgeschnitten, und sie brauchen keine
Druckfassung daneben. **Keine neue Chartbibliothek.**

Dazu kommen Druckregeln nur für dieses Dokument (`.profile-print-root`):

```css
h1, h2, h3   break-after: avoid-page   eine Überschrift allein am Seitenende
.page-section break-inside: auto       54 Bereiche dürfen umbrechen
.print-keep   break-inside: avoid      kurze Kästen bleiben zusammen
bg-*          transparent              Flächen kosten Toner und bringen nichts
```

Nachgemessen, dass sie wirklich greifen: `getComputedStyle` im Druckmedium
liefert `breakAfter: "avoid"` an den Überschriften, `breakInside: "avoid"` an
`.print-keep` und `"auto"` an `.page-section`.

---

## 9. Wie viele Seiten hat das Stressprofil kurz/lang?

Echte PDFs über `Page.printToPDF`, A4 ohne zusätzliche Ränder:

| | Kurzprofil | Langfassung | + Altbestand |
|---|---|---|---|
| Seed-Profil (schlank) | **5** | 8 | 13 |
| Stressprofil, DE | **7** | 16 | 21 |
| Stressprofil, EN | **7** | 15 | 20 |

Stressprofil: 54 Fähigkeitsbereiche, 25 Stärken, 40 Richtungsaussagen über
zehn Facetten, 18 bestätigte Ressourcen, ALIGN-Bogen und v1-Altbestand.

### Das Kurzprofil liegt beim Stressprofil eine Seite über dem Richtwert

Gemessen, welcher Abschnitt wie viel davon trägt:

```
Was dich antreibt            1082 px   17 %
Was du verantworten willst    888 px   14 %
Deine Fähigkeiten             838 px   13 %
Wie du arbeitest              606 px    9 %
Netzwerk & Ressourcen         588 px    9 %
Deine Stärken                 484 px    8 %
… sieben weitere              je ≤ 7 %
```

**Kein Abschnitt ist unverhältnismässig.** Das Kurzprofil ist bei einem sehr
vollen Profil schlicht zehn Abschnitte lang.

Ich habe einen Versuch gemacht und wieder zurückgenommen: `ownershipPerGroup`
von 12 auf 8 und `resourcesPerKind` von 8 auf 6. Das brachte **44 Pixel und
keine Seite** — die Bereiche stehen als Schlagworte nebeneinander und brechen
um, statt untereinander zu stehen. Eine Kürzung, die Angaben der Person
weglässt und nichts einspart, ist keine.

Die zweite Möglichkeit wäre, in der Kurzfassung nur **eine** Aussage je
Facette zu zeigen statt zwei. Das wäre erlaubt („maximal die bereits dort
sichtbaren"), hätte aber zur Folge, dass das weitergegebene Kurzprofil
weniger zeigt als die eigene Seite. Nicht gemacht; die Entscheidung liegt bei
dir.

---

## 10. Wie funktioniert der Dateiname?

**Über den Seitentitel.** Beim „Als PDF sichern" schlägt der Browser
`document.title` vor; einen `Content-Disposition` gibt es beim Drucken nicht.
`generateMetadata` setzt deshalb keinen schönen Titel, sondern genau den
Namen, unter dem die Datei liegen soll:

```
made2found-das-bist-du-kurz-nora-testerin-2026-10-01
made2found-das-bist-du-ausfuehrlich-nora-testerin-2026-10-01
```

Umlaute werden zerlegt und ihre Zeichen entfernt (`ö` → `o`), `ß` wird `ss`,
alles andere wird zum Bindestrich. Kein Konto, keine Mailadresse, keine
Kennung — ein Dateiname wandert weiter als das Dokument selbst. Bleibt vom
Namen nichts übrig, steht dort nichts statt einer Reihe Striche.

Die Seite ist ausserdem auf `noindex` gesetzt.

---

## 11. Welche Browser-/PDF-Tests wurden wirklich durchgeführt?

Chrome 154 headless über das DevTools-Protokoll, echte Anmeldung, echte PDFs
(`Page.printToPDF`, A4). Sechs erzeugte Dokumente, nicht committet.

| geprüft | Ergebnis |
|---|---|
| kurz / lang / lang + v1, schlankes Profil | 5 / 8 / 13 Seiten |
| kurz / lang / lang + v1, Stressprofil, DE | 7 / 16 / 21 Seiten |
| dasselbe auf Englisch | 7 / 15 / 20 Seiten, keine rohen Schlüssel |
| horizontaler Überlauf | **0** in allen sechs Fällen |
| Aufklapper im Dokument | **0** |
| Belegzitate (`blockquote`) | **0** |
| Knöpfe und Links im gedruckten Teil | **0** |
| Builder-Wörter („Bearbeiten", „Weitermachen", „Für jetzt fertig") | **keine** |
| Maps bei A4-Breite unter `print`-Medium | alle drei genau 674 px, nichts ragt hinaus |
| Druckregeln greifen | `break-after: avoid` an Überschriften, `avoid`/`auto` wie vorgesehen |
| Dateiname | beide Modi korrekt, Umlaute bereinigt |

**Testdaten entfernt**, danach `supabase db reset --local` und neu geseedet;
nachgezählt: 0 Ressourcen, 0 Markierungen, 0 QA-Zeilen.

### Was ich nicht messen konnte

**Ob eine Überschrift im fertigen PDF allein am Seitenende steht.** Mein erster
Versuch rechnete die Position im Fliesstext und teilte durch die Seitenhöhe —
und ignorierte damit genau die Umbruchregeln, die das verhindern. Richtig
wäre, den Text des PDFs Seite für Seite zu lesen; auf diesem Rechner gibt es
weder `pdftotext` noch `mutool` noch `qpdf`, und eine Bibliothek dafür
einzuführen stand nicht im Auftrag.

Geprüft ist deshalb, dass die Regeln im Druckmedium tatsächlich an den
Elementen ankommen. Ob Chrome sie in jedem Einzelfall einlöst, ist eine Sache
von Chrome — und der Blick auf zwei fertige PDFs bleibt für dich.

---

## 12. Welche bekannten Einschränkungen bleiben?

**Der Markenname widerspricht dem Produkt.** Im Code heisst alles
`CoFoundery` — Seitentitel, Sprachbundles, Verzeichnis. Für die PDF-Fassungen
war ausdrücklich `Made2Found` verlangt, in der Fusszeile und im Dateinamen.
Beides steht jetzt in `features/brand.ts`, an genau einer Stelle. Solange
beide Namen nebeneinander stehen, ist das eine offene Frage; wer sie
beantwortet, ändert dort eine Zeile.

**Die Registraturtexte bleiben deutsch.** In der englischen Langfassung
stehen die ALIGN-Abschnitte als „A – Analytische Prüfung", „E – Frühes
Erproben". Bekannt und ausdrücklich nicht in diesem Auftrag.

**Das Kurzprofil des Stressprofils ist sieben Seiten lang** — siehe Punkt 9.

**Keine Seitenzahlen und keine Kopfzeile auf Folgeseiten.** `@page` kann in
Chrome Ränder setzen, aber keine wiederholten Elemente ohne
`position: running()`, das kein Browser unterstützt. Die Kopfzeile steht
einmal auf Seite 1.

**Der Dateiname kommt aus dem Titel.** Das ist der einzige Weg ohne
serverseitige Erzeugung — und der Mensch kann ihn im Speichern-Dialog
überschreiben. Was in den Einstellungen des Browsers „Kopf- und Fusszeilen"
heisst, kann zusätzlich Datum und URL auf jede Seite drucken; dagegen gibt es
keine CSS-Handhabe.

**Nur Chrome gemessen.** Safari und Firefox nicht.

---

## 13. Ist die PDF-Phase bereit für Produktion?

**Ja, mit einer Entscheidung davor.**

Was dafür spricht: Beide Fassungen sind reproduzierbar, hängen an nichts
ausser der Adresse, enthalten keine Belege, keine Herkunft und keinen
Formularstatus, brechen bei einem sehr vollen Profil nicht und sind in beiden
Sprachen vollständig. Die Leseseite hat sich inhaltlich nicht verändert,
`/profile` gar nicht.

Was davor zu klären ist:

1. **Heisst es Made2Found oder CoFoundery?** Das PDF unterschreibt derzeit mit
   einem Namen, der sonst nirgends im Produkt steht.
2. **Zwei fertige PDFs ansehen** — die Kurzfassung (7 Seiten) und die
   Langfassung (16). Umbrüche sind der eine Punkt, den ich nicht messen
   konnte.

Für eine spätere Phase vorgemerkt, aber nicht gebaut: Share-Links, PDF per
Mail, Advisor-Freigabe, gespeicherte Dateien, eine PDF-Historie.

---

## 14. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2567 Tests · next build · 1311 DB-Tests
                     alles grün
```

**Neu:** `features/reporting/__tests__/profilDruck.test.ts`, 15 Fälle — der
Modus kommt aus der Adresse und kurz ist die Voreinstellung · der Zustand der
Leseseite beeinflusst nichts · zwei Fassungen, keine dritte · die Antworten
und die Bereichsliste stehen nur in der Langfassung, die WorkMap und die
Deckungskarte in beiden · begrenzt wird ohne Rangfolge, und die Dichten sind
dieselben wie auf der Seite · der Altbestand nie kurz und lang nur auf
Auswahl · Belege, Herkunft, Erzählungen und Baukastenzustände bleiben
draussen · leere Abschnitte entfallen · die Einschränkungen bleiben stehen ·
der Dateiname, einzeln geprüft · die Druckregeln stehen im Stylesheet · beide
Sprachen.

**Nachgezogen, nicht abgeschwächt:** Zwölf vorhandene Zusagen prüften, woher
`/me/profile` seine Daten nimmt. Sie prüfen das jetzt am gemeinsamen
Lesemodell — und mehrere davon zusätzlich an der Druckseite, weil dieselbe
Regel dort genauso gelten muss (keine Venture-Antworten, keine offenen
Vorschläge, kein Schreibzugriff).

Eine wurde **ersetzt**: „beim Drucken geht alles wieder auf" prüfte
`OpenDetailsForPrint`. Das Bauteil ist entfallen; die Zusage dahinter — in der
weitergegebenen Fassung fehlt nicht der Teil, den man weitergeben wollte —
wird jetzt von der eigenen Seite eingelöst, und der Test prüft genau das.

---

## 15. Branch und Reihenfolge

`feat/profil-pdf` baut auf `feat/ressourcen-von-hand` auf, das auf
`feat/ueber-dich-phase-3` aufbaut. Von den dreien liegt nur Phase 3 auf
`origin`; `main` steht weiterhin bei Phase 2.

**Keine Migration in dieser Phase.** Es bleibt bei der Reihenfolge aus
Phase 3: erst `npx supabase db push` wegen `person_section_marks`, dann der
Code.

Nicht deployt. Das bleibt ein manueller Schritt.
