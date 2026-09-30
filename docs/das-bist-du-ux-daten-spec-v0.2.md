# „Das bist du" — UX- und Datenspezifikation v0.2

**Stand 30.09.2026.** Ersetzt die Planung, die in `/me/profile` als vier Säulen
umgesetzt ist. Grundlage ist `docs/das-bist-du-bestandsaufnahme-v2.md`
(gemessener Ist-Zustand), nicht die älteren Dokumente.

Noch nicht implementieren. Offene Entscheidungen stehen in §12.

---

## 1. Was die Seite ist

Die private Gesamtansicht einer Person, zusammengestellt aus vorhandenen
Quellen. **Kein eigener Speicher, keine zweite Wahrheit.** Sie liest, sie
schreibt nichts — mit einer einzigen Ausnahme, die keine Aussage über die
Person ist (§10.2: welche Teile in das ausführliche PDF sollen).

Sie muss vier Situationen tragen:

| Situation | was daraus folgt |
|---|---|
| die eigene Reflexion | Zusammenfassung zuerst, Belege auf Wunsch, nichts beschönigen |
| ein Advisor-Gespräch | ausdruckbar, datiert, Herkunft je Aussage erkennbar |
| ein Accelerator-Gespräch | vollständig, professionell, ohne Interna |
| Founder-Matching | kein Ranking, keine Zahl, nichts, was zum Auswahlkriterium wird |

Die vierte Situation ist der Grund für alle Verbote in §11: Sobald es eine Zahl
gibt, entscheidet sie, wer in ein Programm kommt.

---

## 2. Die Änderung gegenüber heute, in einem Satz

Heute sagt „Wie du arbeitest" das v1-Instrument — ein Fragebogen, den neue
Konten nicht mehr bekommen. **Die Seite muss auf `founder-profile-v1`
umgestellt werden**, sonst bleibt sie für jeden neuen Menschen an genau der
Stelle leer, die ihr den Namen gibt.

Alles andere in dieser Spec folgt daraus oder ergänzt es.

---

## 3. Aufbau

### 3.1 Eine Ebene mehr als heute

Heute: vier Säulen, jede mit Zusammenfassung und aufklappbarem Detail.
Ab v0.2: **drei Teile, zehn Abschnitte.**

```
Kopf            Name · Headline · Stand vom · Zwei Knöpfe (PDF kurz / ausführlich)

TEIL I   Wer du bist              1 Grundlage
                                  2 Wie du arbeitest
                                  3 Deine Stärken

TEIL II  Was du mitbringst        4 Fähigkeitsbereiche
                                  5 Erfahrung und Tiefe
                                  6 Was du verantworten willst
                                  7 Wohin du wachsen willst
                                  8 Was du sonst mitbringst

TEIL III Wohin du willst          9 Was dich antreibt

Fuß             10 Was das ist und was nicht · Vorhaben (Verweis, §9)
```

Warum drei Teile statt vier Säulen: Die vier Säulen tragen heute vier sehr
verschieden große Inhalte — Säule 2 ist die längste Seite des Produkts, Säule 1
sind sechs Zeilen. Drei Teile mit je zwei bis fünf Abschnitten verteilen das
gleichmäßiger, und die Abschnitte 4–7 zerlegen das, was heute unter
„Fähigkeiten" in einem Block steht und dort erschlägt.

### 3.2 Summary first, Details on demand — was das konkret heißt

Jeder Abschnitt hat **genau eine** offene Zusammenfassung von höchstens fünf
Zeilen oder einem Bild, und **höchstens einen** Aufklapper. Zwei Aufklapper in
einem Abschnitt sind einer zu viel: Dann ist die Zusammenfassung keine.

Die Aufklapper tragen `data-profile-details`, damit `OpenDetailsForPrint` sie
beim Drucken öffnet. Das ist heute schon so und bleibt.

---

## 4. Die zehn Abschnitte

Legende: **S** = Zusammenfassung (immer offen), **D** = Detail (aufklappbar),
**kurz** / **ausführlich** = im jeweiligen PDF.

### 1 · Grundlage

| | |
|---|---|
| **Zweck** | Wer das ist, in sechs Zeilen |
| **Datenquelle** | `person_core` (`display_name, headline, bio, location_region, remote_mode, expertise, industries, linkedin_url`) |
| **S** | Name, Headline, Bio, Region + Arbeitsmodus, Expertise, Branchen |
| **D** | — (nichts zum Aufklappen; es sind sechs Zeilen) |
| **Bearbeiten** | „Über dich", Kapitel 1 |
| **PDF** | kurz **ja** · ausführlich **ja** |
| **Sichtbarkeit** | privat; einzelne Felder erscheinen über FIND/Connect auch anderswo |
| **Empty State** | „Hier fehlen noch deine Grundangaben." + Link, mit Nennung genau der fehlenden Felder aus `getIdentityGaps` |
| **Bausteine** | `FounderProfileBase` (existiert) |

LinkedIn erscheint hier nur, wenn `linkedin_visibility ≠ 'private'` — sonst
stünde im PDF ein Link, den die Person nicht zeigen wollte.

### 2 · Wie du arbeitest

| | |
|---|---|
| **Zweck** | Entscheiden, Erproben, Widersprechen, Aushalten von Offenheit — als Selbstauskunft |
| **Datenquelle** | `alignment_answers` mit `founder-profile-v1`, 16 Items, 5 Abschnitte |
| **S** | die `WorkMap`: ein Punkt je Antwort auf einer Achse, gruppiert nach Abschnitt. **Kein Mittelwert, keine Zahl.** |
| **D** | die Antworten selbst, lesbar, nach Abschnitt (`ReportViewV21`) |
| **Bearbeiten** | „Über dich", Kapitel 2 → `/founder-alignment/profil` |
| **PDF** | kurz **ja** (nur die `WorkMap`) · ausführlich **ja** (Karte + Antworten) |
| **Sichtbarkeit** | privat; teilbar nur über `alignment_shares`, blockweise |
| **Empty State** | „Du hast den Bogen zur Arbeitsweise noch nicht ausgefüllt." + Link auf `/founder-alignment/profil`. **Nicht** auf `/me/base` — das ist der alte Bogen, und neue Konten bekommen ihn nicht. |
| **Bausteine** | `AlignMaps.WorkMap`, `ReportViewV21`, `getScopeReport` — alle existieren |

**Die drei Sätze, die dabeistehen müssen**, weil das Instrument `status =
'draft'` trägt und `overallScore: false`, `dimensionScores: false` in seiner
Registratur stehen: Selbstauskunft, kein Testergebnis · zu dieser Fassung gibt
es keine Auswertung, was hier steht sind die Antworten · keine Punktzahl und
keine Einordnung. Sie stehen heute schon so in der Advisor-Ansicht.

**Der Altbestand.** Wer den v1-Bogen abgegeben hat, bekommt **unterhalb** des
neuen Abschnitts einen zugeklappten zweiten: „Deine frühere Auswertung (Stand
TT.MM.JJJJ)" mit `SelfReportView` darin. Nicht vermischt, nicht darüber, nicht
in dasselbe Bild gerechnet — die sechs v1-Dimensionen und die fünf
ALIGN-Abschnitte messen nicht dasselbe, und ein gemeinsames Bild wäre eine
Behauptung über Vergleichbarkeit. Wer v1 nie ausgefüllt hat, sieht diesen
Abschnitt nicht.

Im **kurzen** PDF erscheint der Altbestand nicht. Im **ausführlichen** nur,
wenn die Person ihn dort haben will (§10.2).

### 3 · Deine Stärken

| | |
|---|---|
| **Zweck** | Arbeitsweisen, die in erzählten Situationen sichtbar wurden — Sätze, keine Merkmale |
| **Datenquelle** | `person_strengths` (`statement, self_frequency, reflected_frequency, reflected_who, origin`) |
| **S** | die Sätze, je Satz Selbstsicht und Fremdsicht nebeneinander |
| **D** | Herkunft je Satz (`origin`), §7 |
| **Bearbeiten** | „Über dich", Kapitel 7 |
| **PDF** | kurz **ja** (höchstens fünf) · ausführlich **ja** (alle) |
| **Sichtbarkeit** | privat + `get_advisor_person_strengths` |
| **Empty State** | „Stärken entstehen aus dem Gespräch über Situationen." + Link |
| **Bausteine** | `FounderProfileStrengths` (existiert, muss um `origin` erweitert werden) |

Der Abstand zwischen `self_frequency` und `reflected_frequency` ist das
Ergebnis und wird als solcher gezeigt — **ohne ihn zu benennen oder zu
bewerten**. „Du unterschätzt dich" wäre eine psychologische Behauptung, die die
zwei Angaben nicht hergeben.

### 4 · Fähigkeitsbereiche

| | |
|---|---|
| **Zweck** | Worüber überhaupt gesprochen wurde — die Landkarte, nicht die Bewertung |
| **Datenquelle** | `person_capability_entries` + `capability_areas`/`_families` |
| **S** | die Deckungskarte: je Familie ein Balken aus ihren Bereichen, eingefärbt nach `answered / levelled / named / unspoken` |
| **D** | die eigene Bereichsliste in Vokabularreihenfolge |
| **Bearbeiten** | „Über dich", Kapitel 4 |
| **PDF** | kurz **ja** (nur die Karte) · ausführlich **ja** |
| **Sichtbarkeit** | privat; nach außen nur über `get_disclosed_capability` |
| **Empty State** | „Noch keine Bereiche eingetragen." + zwei Wege: Gespräch oder Auswahl |
| **Bausteine** | `CoverageMap`, `FounderProfileCapability` (existieren) |

`unspoken` ist bei 54 Bereichen der Normalfall und wird blass gezeichnet, nie
wie eine Lücke. Kein Netzdiagramm: Ein Spinnennetz braucht je Familie eine
Zahl, und die gibt dieses Modell nicht her.

### 5 · Erfahrung und Tiefe

| | |
|---|---|
| **Zweck** | Wie weit jemand in einem Bereich gekommen ist |
| **Datenquelle** | `person_capability_entries.application_level` (1–5, nullable) |
| **S** | ein Satz mit den Zählwerten („In N von M Bereichen hast du eine Stufe eingetragen, in K davon Tiefe") + die Bereiche ab Stufe 4 |
| **D** | alle Bereiche mit ihrer Stufe, Belege **nur** wenn vorhanden und nur als Anzahl |
| **Bearbeiten** | „Über dich", Kapitel 5 |
| **PDF** | kurz **ja** (nur Stufe ≥ 4) · ausführlich **ja** |
| **Sichtbarkeit** | privat; nach außen nur bei `areas_depth_on_contact` und angenommener Verbindung |
| **Empty State** | „Du hast Bereiche eingetragen, aber noch keine Stufen." + Link |

`DEPTH_LEVEL = 4` ist die Grenze und bleibt es. **Es gibt keine 0**: „noch
nichts eingetragen" ist `null` und wird als „noch nicht eingestuft" gezeigt,
nicht als unterste Stufe.

**Die Erzählungen (`person_capability_evidence.narrative`) gehen nicht ins
Profil.** Ein Profil, das man weitergibt, gibt Fähigkeiten weiter, nicht die
Geschichten aus dem Interview — und es gibt für sie bis heute keine
Freigabefunktion. Gezeigt wird höchstens „2 Belege", nie ihr Inhalt. Siehe §7.3
zum ausführlichen PDF.

### 6 · Was du verantworten willst

| | |
|---|---|
| **Zweck** | Die Rollenfrage — und die Trennung von Können und Wollen |
| **Datenquelle** | `…entries.ownership_wish` + `capability_areas.sourcing` (Faltin) |
| **S** | „Welche Rollen du abdeckst": die Bereiche mit `sourcing = internal_only` **und** `ownership_wish ∈ {own, contribute}`; darunter die, die ins Team gehören und niemand will (`spokenNotOwned`) |
| **D** | alle Bereiche mit ihrem Wunsch; dazu der Befund `canButHandsOver` (Stufe ≥ 4, will abgeben) |
| **Bearbeiten** | „Über dich", Kapitel 6 |
| **PDF** | kurz **ja** · ausführlich **ja** |
| **Sichtbarkeit** | privat; wie Abschnitt 5 |
| **Empty State** | „Du hast noch nicht gesagt, was du davon verantworten willst." |
| **Bausteine** | `founderProfileCoverage.ts`, `capabilityReadout.ts` (existieren) |

**Die Faltin-Logik bleibt** — sie ist im Datenmodell vorhanden und belegt: 21
von 54 Bereichen sind `internal_only`, 11 `component`, 22 `depends`,
`unclassified` kommt nicht vor. Die Auswertung rechnet die Erfahrungsstufe
ausdrücklich **nicht** mit hinein: Eine Rollendeckung mit einer Note wäre wieder
eine Bewertung von Menschen.

`grow_into` zählt hier nicht mit. Es gehört in Abschnitt 7.

### 7 · Wohin du wachsen willst

| | |
|---|---|
| **Zweck** | Entwicklungsthemen — als Absicht, nicht als Defizit |
| **Datenquelle** | abgeleitet: `capabilityReadout.growingInto` (`ownership_wish = 'grow_into'` **oder** `own` bei Stufe < 4) |
| **S** | die Bereiche, mit einem Satz dazu, was sie sind |
| **D** | — |
| **Bearbeiten** | „Über dich", Kapitel 6 (derselbe Durchgang) |
| **PDF** | kurz **nein** · ausführlich **ja** |
| **Sichtbarkeit** | privat. **Nicht** in FIND, **nicht** in Connect. |
| **Empty State** | Abschnitt entfällt ganz, wenn die Liste leer ist. Kein „hier könnte stehen, woran du arbeitest" — das wäre die Aufforderung, sich etwas vorzuwerfen. |

Ein eigener Abschnitt und nicht eine Zeile in Abschnitt 6, weil es die einzige
Stelle des Profils ist, an der jemand über etwas Unfertiges spricht. Zwischen
„was du abdeckst" versteckt, liest es sich als Einschränkung; eigenständig
liest es sich als Vorhaben.

Im kurzen PDF nicht: Ein zweiseitiges Papier, das man jemandem vor einem
Gespräch gibt, ist nicht der Ort für die eigenen Entwicklungsthemen. Im
ausführlichen ja — dort ist es genau das, worüber ein Advisor sprechen will.

### 8 · Was du sonst mitbringst

| | |
|---|---|
| **Zweck** | Netzwerk, Zugänge, Angebote |
| **Datenquelle** | `person_resources` mit `status = 'confirmed'`, `kind ∈ {network, access, offer}` |
| **S** | die bestätigten Einträge, nach Art gruppiert |
| **D** | Herkunft je Eintrag (`origin`), §7 |
| **Bearbeiten** | „Über dich", Kapitel 9 |
| **PDF** | kurz **ja** · ausführlich **ja** |
| **Sichtbarkeit** | privat; heute gibt es **keine** Freigabefunktion, auch nicht für Advisors |
| **Empty State** | Abschnitt entfällt, wenn leer |

**Nur `confirmed`.** Ein `pending`-Vorschlag ist eine Modellbehauptung, und die
darf nirgends wie eine Aussage der Person aussehen. Die offenen Vorschläge
bleiben dort, wo man sie entscheidet.

### 9 · Was dich antreibt

| | |
|---|---|
| **Zweck** | Richtung, Why — das, was ein Lebenslauf nicht hergibt |
| **Datenquelle** | `direction_statements` (`facet, statement, origin, confidence`) |
| **S** | die Sätze, nach Facette gruppiert. Keine Verdichtung, keine Zusammenfassung |
| **D** | Herkunft je Satz (`origin`), §7 |
| **Bearbeiten** | „Über dich", Kapitel 8 |
| **PDF** | kurz **ja** · ausführlich **ja** |
| **Sichtbarkeit** | privat + `get_advisor_person_direction` |
| **Empty State** | „Sechs Fragen nach dem, was immer wiederkommt." + Link |
| **Bausteine** | `FounderProfileDirection` (existiert) |

Die zehn Facetten sind **Anker, keine Etiketten**: Sie prüfen, ob ein Satz zu
der Frage passt, aus der er stammt. Keine Typologie, kein Purpose-Score.

### 10 · Was das ist und was nicht

Steht **unten**, nicht oben: Ein Warnhinweis über dem Ergebnis wird überlesen
oder macht es wertlos, bevor man es gelesen hat. Wird **mitgedruckt** — in der
Fassung, die weitergegeben wird, ist dieser Satz am wichtigsten.

Baustein `InstrumentNote`, erweitert um §8: heute datiert er nur den
v1-Bericht.

---

## 5. Der Kopf: ein Stand über alles

Heute gibt es keinen. `InstrumentNote` datiert den v1-Bericht, und sonst steht
nirgends, wie alt das Bild ist — bei einem Papier, das man einem Accelerator
gibt, ist das die erste Frage.

**Vorschlag, ohne neue Spalte:** das jüngste `updated_at` über die beteiligten
Zeilen — `person_core`, `person_capability_entries`, `person_strengths`,
`direction_statements`, `person_resources`, `assessments.submitted_at` des
Arbeitsprofils. Eine Zeile: „Stand: 30.09.2026". Im Aufklapper daneben, je
Abschnitt, wann er zuletzt bewegt wurde.

Was dabei **nicht** entsteht: keine Aufforderung, etwas zu aktualisieren, und
kein Verfallsdatum. „Deine Angaben sind 4 Monate alt" ist ein Vorwurf.

---

## 6. Empty States

Vier Regeln, alle aus dem heutigen Code abgeleitet und alle beizubehalten:

1. **Eine fehlende Stelle wird benannt, nicht verschwiegen.** Ein Profil, dem
   ohne Hinweis ein Drittel fehlt, sieht aus wie ein vollständiges Profil einer
   Person, über die es wenig zu sagen gibt.
2. **Der Hinweis wird nicht mitgedruckt** (`no-print`). Im weitergegebenen
   Profil wäre er eine Aufforderung an die falsche Person.
3. **Er nennt den Weg, nicht das Versäumnis.** „Stärken entstehen aus dem
   Gespräch über Situationen" statt „Du hast keine Stärken angegeben".
4. **Er verspricht nichts Ungebautes.** Kein „folgt später".

Zwei Abschnitte entfallen ersatzlos statt leer dazustehen: 7 (Entwicklung) und
8 (Ressourcen) — bei beiden ist „nichts" eine gültige Antwort und kein Mangel.

---

## 7. Herkunft und Belege

Heute steht `origin` an genau einer Stelle im Produkt (`/profile/direction`) und
auf `/me/profile` an keiner. In den Tabellen liegt es bei Stärken,
Richtungssätzen und Ressourcen.

### 7.1 Drei Herkünfte, drei Wörter

| Wert | Anzeige | gilt für |
|---|---|---|
| `own_words` / `self` | „deine Worte" | Stärken, Richtung, Ressourcen |
| `confirmed_proposal` / `model` (bestätigt) | „aus dem Gespräch, von dir bestätigt" | alle drei |
| `edited_proposal` | „aus dem Gespräch, von dir umformuliert" | Stärken, Richtung |

### 7.2 Wo sie steht

Im **Detail**, nicht in der Zusammenfassung. Eine Herkunftsangabe neben jedem
Satz macht aus einer Liste von Aussagen eine Liste von Fußnoten. Wer sie
braucht, klappt auf; im ausführlichen PDF ist sie immer dabei.

### 7.3 Belege

`evidence_quote` liegt in den **Vorschlags**tabellen, nicht in den bestätigten
Zeilen. Ein bestätigter Satz trägt nur `source_turn_id` — das Zitat steht also
noch da, ist aber nicht mehr direkt am Satz.

Daraus folgt für diese Spec: **Belege sind standardmäßig nirgends dabei** —
weder auf der Seite noch in einem der beiden PDFs. Wer sie im ausführlichen PDF
haben will, wählt sie einzeln aus (§10.2). Das ist keine Vorsicht, sondern die
Sache selbst: Ein Beleg ist der Satz, den jemand über eine konkrete Situation
gesagt hat, oft über Dritte.

Ob die Belege dafür überhaupt erreichbar gemacht werden sollen — über
`source_turn_id` zurück in `capability_interview_turns` — ist eine Entscheidung
und kein Umbau, den diese Spec einfach ansetzt. Siehe §12.3.

---

## 8. Sichtbarkeit

**Die Seite gibt nichts frei.** `/me/*` ist die eigene Ansicht; wer sie
weitergibt, tut es selbst und bewusst, per Ausdruck oder PDF. Das bleibt so.

Was die Seite **zeigen** muss, weil es sonst nirgends zusammensteht: je
Abschnitt eine leise Zeile, wer das außerhalb dieser Seite sehen kann.

| Abschnitt | Zeile |
|---|---|
| 1 Grundlage | „Name, Headline und Kurztext erscheinen in FIND und Connect, wenn du dort ein Profil veröffentlicht hast." |
| 2 Arbeitsweise | „Nur du — außer du gibst einzelne Antworten ausdrücklich frei." |
| 3 Stärken | „Nur du und Advisors, denen du Zugang gegeben hast." |
| 4–6 Fähigkeiten | „Andere Mitglieder sehen deine Bereiche nur, wenn du sie freigegeben hast. Stufe und Verantwortungswunsch nur nach einer angenommenen Verbindung." + Link zur Freigabestufe auf „Über dich" |
| 7 Entwicklung | „Nur du." |
| 8 Ressourcen | „Nur du." |
| 9 Richtung | „Nur du und Advisors, denen du Zugang gegeben hast." |

Die Zeilen sind `no-print`. Im weitergegebenen PDF wäre „nur du" absurd.

**Nicht aufnehmen**: einen Schalter. Die Freigaben bleiben dort, wo sie wirken
— die Fähigkeitsstufe auf „Über dich", das FIND-Profil in FIND, das
Connect-Profil in Connect, die Antwortfreigabe bei den Antworten.

---

## 9. Vorhaben

**Venture-Angaben erscheinen nicht als Abschnitt.** Sie gelten für *ein*
Vorhaben und einen Zeitraum, das Profil für die Person; ein Profil mit
Venture-Zusagen darin vermischt beides. Das steht so in der Registratur
(`validity`) und ist der Grund.

Stattdessen im Fuß, unter „Was das ist und was nicht", ein Verweis: „Zu
deinen Vorhaben gibt es eigene Angaben — sie gelten für ein Vorhaben und einen
Zeitraum und stehen deshalb nicht hier." + Link auf
`/founder-alignment/vorhaben`.

Das gilt auch für die Items L01–L03 („persönliche Grenzen"), obwohl sie
personenbezogen klingen: Sie liegen venture-gebunden, und jemand kann bei zwei
Vorhaben verschiedene Grenzen ziehen, ohne sich zu widersprechen.

In keinem der beiden PDFs.

---

## 10. Print und PDF

### 10.1 Zwei Modi

| | **Kurzprofil** | **Ausführliches Profil** |
|---|---|---|
| Zweck | vor ein Gespräch legen | Advisor-, Accelerator-, Coaching-Gespräch |
| Umfang | Abschnitte 1, 2 (nur `WorkMap`), 3 (max. 5), 4 (nur Karte), 5 (nur Stufe ≥ 4), 6, 8, 9, 10 | alle Abschnitte, alle Details |
| Länge | 2 Seiten als Ziel | so lang, wie die Daten sind |
| Entwicklungsthemen (7) | nein | ja |
| v1-Altbestand | nein | nur auf Wahl |
| Belege | nein | nur auf Wahl, einzeln |
| Herkunft je Aussage | nein | ja |

### 10.2 Wie die Wahl zustande kommt

Zwei Knöpfe im Kopf: „Kurzprofil" und „Ausführliches Profil". Der zweite öffnet
vorher eine kurze Auswahl: v1-Altbestand mitnehmen? Belege mitnehmen? Beide
standardmäßig **aus**.

Das ist die einzige Stelle, an der diese Seite schreibt — und auch nur, wenn
die Wahl über den einen Ausdruck hinaus gemerkt werden soll. Wird sie nicht
gemerkt, schreibt die Seite gar nichts. Empfehlung: **nicht merken.** Eine
Entscheidung über Belege soll man jedes Mal treffen.

### 10.3 Die Route

Heute gibt es genau eine eigene Druckroute (`/founder-alignment/workbook/print`)
und sonst `window.print()` auf der Seite selbst.

**Vorschlag: eine eigene Route je Modus**, `/me/profile/print?mode=kurz|lang`.
Gründe:

1. Der Umfang wird serverseitig entschieden und hängt nicht an einem
   Aufklappzustand im Browser.
2. `OpenDetailsForPrint` wird dort nicht gebraucht — es gibt keine Aufklapper.
   Der Baustein bleibt trotzdem auf `/me/profile`, für Strg+P direkt auf der
   Seite.
3. Die Kopfzeile, die Fußnote und der Stand können für Papier anders gesetzt
   werden als für den Bildschirm.
4. Eine Route ist verlinkbar — auch für einen späteren Serverdruck.

Die Alternative — ein Modus über CSS-Klassen auf derselben Seite — spart die
Route und bezahlt sie mit `display: none`-Regeln, die bei jedem neuen Abschnitt
mitgepflegt werden müssen und deren Fehlen niemand bemerkt.

### 10.4 Was vom heutigen Druckapparat bleibt

`@page { margin: 16mm }` · `.no-print` · `.page-section`/`.card-block` nicht
umbrechen · `overflow: visible` unter `.report-print-root`. Alles in
`globals.css:610-650`, alles unverändert brauchbar.

### 10.5 Dateiname

Der Browser benennt die Datei nach dem `<title>`. Also trägt die Druckroute
einen sprechenden Titel:

```
CoFoundery – <Name> – Kurzprofil – 2026-09-30
CoFoundery – <Name> – Founderprofil – 2026-09-30
```

Datum als ISO, damit Dateien in einem Ordner nach Datum sortieren. Kein „PDF"
im Namen, kein Seitentitel im Fenster, der wie ein Dateiname aussieht.

### 10.6 Datenschutz beim Drucken

| Regel | warum |
|---|---|
| keine Sichtbarkeitszeilen (§8) | „nur du" im weitergegebenen Papier ist sinnlos |
| keine Empty-State-Hinweise | Aufforderung an die falsche Person |
| keine unbestätigten Vorschläge | eine Modellbehauptung darf nicht wie eine Aussage der Person aussehen |
| keine Erzählungen aus den Gesprächen | oft über Dritte, ohne deren Wissen |
| keine Belege ohne ausdrückliche Wahl | dasselbe, §7.3 |
| LinkedIn nur bei `visibility ≠ 'private'` | sonst steht im Papier, was nicht gezeigt werden sollte |
| die Fußnote „Was das ist und was nicht" **immer** | sie ist im weitergegebenen Papier am wichtigsten |

---

## 11. Was die Seite nicht tut

Unverändert und aus denselben Gründen wie heute:

kein Gesamtwert je Person · kein Netzdiagramm · keine Typologie · keine
Erfolgsprognose · keine Kompatibilitäts-Prozentzahl · kein Mittelwert über
Items eines Abschnitts · kein Vollständigkeitsbalken · keine psychologische
Deutung, die die Daten nicht hergeben · keine unbestätigten Vorschläge als
Aussagen.

Dazu die vier Wörter, die die FIND-Spec §15 verbietet und die für jede neue
Textebene hier gelten: **inkompatibel · schlechter Match · Risiko · Problem.**

Und ein neues Verbot, das aus §2 folgt: **v1 und ALIGN v2.2 werden nirgends in
dasselbe Bild gerechnet.** Zwei Instrumente, die nicht dasselbe messen, in einer
Grafik ist die stille Umdeutung, gegen die die ganze Fassungstrennung gebaut
ist.

---

## 12. Offene Entscheidungen

**12.1 Werte.** Das Werteprofil (drei Archetypen, Cluster-Werte) hängt
vollständig an v1. Im neuen Modell kommen Werte nicht vor. Drei Möglichkeiten:
als Altbestand mit dem v1-Block mitlaufen lassen (Vorschlag dieser Spec) · ganz
streichen · im neuen Modell neu erheben. Die dritte ist eine Produktfrage und
blockiert diese Spec nicht.

**12.2 Der Altbestand-Abschnitt.** Diese Spec schlägt vor, den v1-Bericht
zugeklappt und datiert unter Abschnitt 2 zu behalten. Die Alternative — ihn
ganz von dieser Seite zu nehmen und nur auf `/me/report` zu lassen — ist
sauberer und nimmt bestehenden Nutzern etwas weg, das sie kennen.

**12.3 Belege erreichbar machen.** Heute liegt `evidence_quote` in den
Vorschlagstabellen, bestätigte Zeilen tragen nur `source_turn_id`. Ob das Zitat
am bestätigten Satz stehen soll, ist eine Modelländerung (Spalte oder Join) und
gehört entschieden, bevor „optional Belege im PDF" gebaut wird.

**12.4 Ressourcen freigeben.** `person_resources` hat heute keine
Freigabefunktion — auch keine für Advisors. Solange das so ist, steht Abschnitt
8 im PDF, aber ein Advisor sieht ihn in seiner Ansicht nicht. Entweder eine
sechste `get_advisor_person_*`-Funktion, oder der Unterschied bleibt und wird
benannt.

**12.5 Der Name der Seite.** „Das bist du" ist Marias Zielname, im Produkt
steht heute „Founderprofil" und im Menü „Gesamtbild"; „Das bist du" ist
gleichzeitig die Connect-Eigenansicht (`connect.json:773`). Zwei Seiten mit
demselben Namen sind eine zu viel.
