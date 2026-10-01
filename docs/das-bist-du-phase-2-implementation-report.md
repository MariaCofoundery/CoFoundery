# „Das bist du" Phase 2 — Umsetzungsbericht

**Stand 01.10.2026.** `/me/profile` ist von vier Säulen auf drei Teile mit neun
Abschnitten umgebaut. Keine PDF-Modi, kein Guided Builder, keine neue Tabelle.

Grundlage: `docs/das-bist-du-ux-daten-spec-v0.2.md`,
`docs/das-bist-du-bestandsaufnahme-v2.md`, und der Code als Source of Truth.

---

## 1. Die Seitenstruktur

```
Kopf          Das bist du · Name · Headline · Region · erklärender Satz
              Stand vom TT.MM.JJJJ

Sprungbalken  neun Anker, nur für vorhandene Abschnitte (no-print)

TEIL I   WER DU BIST          1  Über dich
                              2  Wie du arbeitest        (+ Altbestand)
                              3  Deine Stärken

TEIL II  WAS DU MITBRINGST    4  Deine Fähigkeiten
                              5  Erfahrung & Tiefe
                              6  Was du verantworten willst
                              7  Wohin du wachsen willst
                              8  Netzwerk, Zugänge & Ressourcen

TEIL III WAS DICH ANTREIBT    9  Was dich antreibt

Fuß           Deine Vorhaben (Verweis)
              Was diese Seite zeigt – und was nicht  (+ InstrumentNote)
```

Jeder Abschnitt trägt seine Nummer („4 von 9"). Das ist eine **Position, kein
Fortschritt**: Es steht nirgends, wie viele davon „erledigt" sind. Der
Sprungbalken trug bis zum Umbau je Kachel „ausgefüllt / noch offen" — das war
ein Fortschrittsbalken in anderer Schreibweise und ist weg.

**Ein Abschnitt, ein Aufklapper.** Ein Test zählt die Verschachtelungstiefe von
`ProfileDetails` und lässt höchstens eine Ebene zu.

**Teil III trägt denselben Namen wie sein einziger Abschnitt.** Beim ersten
Durchgang stand „Was dich antreibt" zweimal untereinander. Der Abschnitt zeigt
dort jetzt nur noch seine Nummer; die Sprungmarke hängt am Abschnitt, nicht an
der Überschrift.

---

## 2. Wiederverwendete Bausteine

Alles aus dem Bestand. Keine Datenkopie, kein zweiter Speicher.

| Baustein | Abschnitt |
|---|---|
| `FounderProfileBase` | 1 |
| `AlignMaps.WorkMap` · `ReportViewV21` · `getScopeReport` | 2 |
| `SelfReportView` | 2 (Altbestand) |
| `FounderProfileStrengths` | 3 |
| `CoverageMap` | 4 |
| `FounderProfileCapability` | 5 (Aufklapper) |
| `CoverageRoles` · `capabilityReadout` · `buildFounderProfileCoverage` | 6 |
| `capabilityReadout.growingInto` | 7 |
| `getOwnPersonResources` | 8 |
| `FounderProfileDirection` | 9 |
| `findVentures` | Fuß |
| `InstrumentNote` · `ProfileDetails` · `ProfilePillar` · `OpenDetailsForPrint` · `PrintReportButton` | durchgehend |

### Erweitert statt nachgebaut

| Datei | Änderung |
|---|---|
| `FounderProfileStrengths` | `limit` und `originLabel`. Zwei Dichten aus **einer** Liste — keine zweite, kürzere Fassung derselben Sätze |
| `FounderProfileDirection` | `limitPerFacet` und `originLabel`, gleicher Grund |
| `ProfilePillar` | `eyebrow` und `title` sind jetzt freiwillig; ist jetzt ein *Abschnitt*, kein *Säulen*-Rahmen |
| `CoverageMap` | aufgeteilt (§3) |

**Keine Rangfolge durch die Hintertür.** Beide Begrenzungen schneiden in der
Reihenfolge ab, in der die Einträge entstanden sind. Welcher der wichtigste
ist, sagt das Modell nicht — und eine Begrenzung darf es nicht erfinden. Steht
so im Kopfkommentar beider Komponenten.

---

## 3. Neu gebaut

Vier Dateien, zusammen etwa 300 Zeilen.

**`ProfilePart.tsx`** — die drei Teilüberschriften. Trägt die Farbe nur an
Augenbraue und Trennlinie; dieselbe Regel wie `ProfilePillar`: Die Farbe sagt
„welcher Teil", nicht „wie gut".

**`ownershipGroups.ts`** — die vier Gruppen nach Verantwortungswunsch. Eine
reine Funktion mit sieben Testfällen. Sie **deutet nicht**: Jede Gruppe ist
genau eine Antwort aus dem Formular, zurückübersetzt. Die Erfahrungsstufe kommt
in der Datei nicht vor.

Beim Testen fiel ein echter Fehler auf: `grow_into` landete über den
Ausweichwert in „noch offen". Es hat jetzt eine eigene Ausschlussliste, getrennt
vom unbekannten Wert — ein Wunsch, den die Datei nicht kennt, zählt weiter als
offen (lieber falsch einsortiert als verschwunden), `grow_into` dagegen gehört
in Abschnitt 7.

**`profileFreshness.ts`** — der Stand über alle Quellen (§4).

**`CoverageRoles`** (in `CoverageMap.tsx`) — der Faltin-Block, herausgelöst.
Er stand im selben Kasten wie die Deckungskarte; auf der neuen Seite sind das
zwei Abschnitte, weil „worüber wurde gesprochen" und „was willst du übernehmen"
nicht dieselbe Frage sind.

**Kein neues Designsystem.** Dieselben Klassen, dieselben Kartenrahmen,
dieselben Abstände wie vorher.

---

## 4. Datenquelle je Abschnitt

| # | Abschnitt | Quelle | Zusammenfassung | Aufklapper |
|---|---|---|---|---|
| — | Kopf | `person_core` + `profileFreshness` | Name, Headline, Region, Stand | — |
| 1 | Über dich | `person_core` | Bio, Ort/Modus, Expertise, Branchen | — (sechs Zeilen) |
| 2 | Wie du arbeitest | `alignment_answers` (`founder-profile-v1`) | `WorkMap` + „x von 16 beantwortet" | Deine Antworten |
| 2a | Altbestand | `assessments` (`founder-compatibility-v1`) | — | zugeklappt, datiert |
| 3 | Deine Stärken | `person_strengths` | erste 5, Selbst- und Fremdsicht | alle, mit Herkunft |
| 4 | Deine Fähigkeiten | `person_capability_entries` + Vokabular | Deckungskarte je Familie | — |
| 5 | Erfahrung & Tiefe | `…entries.application_level` | Zählwerte + Bereiche ab `DEPTH_LEVEL` | alle Bereiche mit Stufe |
| 6 | Was du verantworten willst | `…entries.ownership_wish` + `capability_areas.sourcing` | Satz „Können ≠ Wollen", Faltin-Rollen, „kann es, will es abgeben" | vier Gruppen nach Wunsch |
| 7 | Wohin du wachsen willst | `capabilityReadout.growingInto` | die Bereiche | — |
| 8 | Netzwerk, Zugänge & Ressourcen | `person_resources` (`confirmed`) | nach Art gruppiert | alle, mit Herkunft |
| 9 | Was dich antreibt | `direction_statements` | je Rubrik 2 Sätze | alle, mit Herkunft |
| — | Deine Vorhaben | `findVentures` | nur Namen und ein Weg | — |

### Der Stand

Nicht aus einem Fragebogen. `getProfileFreshness` nimmt je Quelle den jüngsten
Zeitstempel und davon den jüngsten: `person_core.updated_at`,
`person_capability_entries.updated_at`, `person_strengths.updated_at`,
`direction_statements.updated_at`, `person_resources.created_at`,
`assessments.submitted_at` (nur `founder-profile-v1`).

**Warum eine eigene Abfrage und keine erweiterten Lader:** Die fünf
vorhandenen Lader holen keine Zeitstempel und werden auch von der
Advisor-Ansicht, von FIND und von Connect benutzt. Sie um Spalten zu
erweitern, die nur diese Seite braucht, hieße fünf geteilte Stellen anzufassen.

**Lieber kein Stand als ein falscher:** Schlägt eine Abfrage fehl, zählt sie
nicht mit; kommt gar nichts zurück, steht kein Datum da. `person_resources` hat
kein `updated_at` — `created_at` ist für „wie alt ist dieses Bild" genau genug.

### Erfahrung & Tiefe — die Sprache

Nicht „deine besten Skills". `DEPTH_LEVEL` ist die Grenze, ab der eine Angabe
als Tiefe gilt; das ist eine Selbstauskunft über Häufigkeit und keine
Rangliste. Die Überschrift lautet „Hier hast du besonders viel praktische
Erfahrung festgehalten".

**`null` ist nicht Stufe 1.** „Noch nichts eingetragen" erscheint als „noch
nicht eingestuft", nie als unterste Stufe.

**Belege:** Die Erzählungen aus dem Interview stehen nicht auf der Seite. Die
vorhandene Anzahl zeigt `FounderProfileCapability` im Aufklapper, wie bisher.
Ein Test prüft, dass `narrative` und `evidence_quote` auf der Seite nicht
vorkommen.

### Was du verantworten willst — ein Befund, nicht fünf

`capabilityReadout` liefert fünf gedeutete Befunde. Auf der Seite steht genau
einer: **`canButHandsOver`** — „Tiefe angegeben, und trotzdem soll es jemand
anders übernehmen". Das steht in keiner der vier Gruppen, weil die die
Erfahrungsstufe gar nicht kennen, und es ist die deutlichste Stelle, an der man
sieht, dass Können und Wollen zwei verschiedene Dinge sind.

`anchor`, `contributes` und `undecided` sagen dasselbe wie die Gruppen, nur
gedeutet; `growingInto` hat seinen eigenen Abschnitt. `CapabilityReadoutSection`
kommt auf der Seite nicht mehr vor.

Die Faltin-Logik bleibt unverändert: Ein Bereich zählt als abgedeckt, wenn er
ins Team gehört **und** verantwortet werden soll. Die Erfahrungsstufe wird
nicht verrechnet, `grow_into` zählt nicht mit.

### Deine Vorhaben

Nur Namen und ein Weg dorthin, über `findVentures` — dieselbe Funktion, die das
Dashboard benutzt und die ausdrücklich **nichts anlegt**. Keine Zusagen, keine
Risikogrenzen, keine Teamregeln, keine Alignment-Ergebnisse.

Der Satz daneben ist wichtiger als die Liste: Ohne ihn liest sich der Verweis
wie ein fehlender Abschnitt statt wie eine Entscheidung.

---

## 5. Was entfernt werden konnte

| Entfernt | Warum |
|---|---|
| Die vier `pillars`-Daten mit `done`-Flag | war ein Fortschrittswert je Säule |
| Der Kachel-Überblick mit „ausgefüllt / noch offen" | ein Fortschrittsbalken in anderer Schreibweise |
| `CapabilityReadoutSection` **von dieser Seite** | vier der fünf Befunde sagen dasselbe wie die Gruppen, nur gedeutet. Auf `/profile` bleibt sie — dort wird gepflegt |
| `MissingPillar` | heißt jetzt `MissingSection`, inhaltlich gleich |
| `t("pillars.*")`, `t("overview.*")` | die Schlüssel bleiben in `profile.json`, bis klar ist, ob `/profile` sie noch braucht |

**Keine Komponente gelöscht.** `CapabilityReadoutSection` wird von `/profile`
weiter benutzt, `CoverageMap` hat nur ihren Rollenblock abgegeben.

---

## 6. Empty States

Vier Regeln, alle im Code durch einen Test abgesichert:

1. **Zwei Abschnitte entfallen ganz** — „Wohin du wachsen willst" (7) und
   „Netzwerk, Zugänge & Ressourcen" (8). Bei beiden ist *nichts* eine gültige
   Antwort, und ein Leerzustand wäre die Aufforderung, sich ein Defizit zu
   suchen. Sie verschwinden auch aus dem Sprungbalken.
2. **„Erfahrung & Tiefe" entfällt ohne Bereiche** — ohne Einträge gibt es dort
   nichts zu stufen; der Hinweis steht in Abschnitt 4.
3. **Vier Abschnitte stehen immer** — 1, 2, 3, 9. Sie tragen bei leerer
   Datenlage einen Hinweis mit **genau einem** Weg weiter.
4. **Kein Hinweis sieht wie ein Fehler aus** — gestrichelter Rahmen, kein Rot,
   kein Warnzeichen, und `no-print`: Im weitergegebenen Profil wäre er eine
   Aufforderung an die falsche Person.

Die Sätze:

| Abschnitt | Hinweis | Weg |
|---|---|---|
| 2 | „Du hast dein Founder-Arbeitsprofil noch nicht ausgefüllt." | `/founder-alignment/profil` |
| 3 | „Hier sind noch keine bestätigten Stärken festgehalten." | `/profile` |
| 4 | „Deine Fähigkeiten fehlen noch" | `/profile/interview` |
| 6 | „Du hast noch nicht gesagt, was du davon verantworten willst." | `/profile?step=ownership` |
| 9 | „Was dich antreibt, ist hier noch nicht festgehalten." | `/profile/direction` |

---

## 7. Wo `origin` angezeigt wird

**Im Aufklapper, nie in der Zusammenfassung.** Neben jedem Satz gelesen, wäre
die Herkunft eine Fußnote an einer Aussage und keine Aussage mehr. Ein Test
prüft die Reihenfolge im Quelltext.

| Abschnitt | Werte |
|---|---|
| 3 Stärken | `own_words`, `confirmed_proposal`, `edited_proposal` |
| 8 Ressourcen | `self`, `model` |
| 9 Was dich antreibt | `own_words`, `confirmed_proposal`, `edited_proposal` |

In normaler Sprache, nicht als technischer Wert: „von dir geschrieben", „aus
einem Gespräch, von dir bestätigt", „aus einem Gespräch, von dir umformuliert",
„von dir eingetragen", „aus deinen Texten vorgeschlagen, von dir bestätigt".
Ein Test prüft, dass kein Schlüssel in seiner eigenen Übersetzung auftaucht.

**Keine `evidence_quote`** — wie vorgegeben.

---

## 8. Der v1-Altbestand

Unverändert gegenüber Phase 1, nur an seinem endgültigen Platz: **unterhalb**
des neuen Arbeitsprofils in Abschnitt 2, in einem zugeklappten
`ProfileDetails`, mit „Deine frühere Auswertung — Stand: TT.MM.JJJJ" und einem
Satz, warum er getrennt steht.

Nur für Menschen, die den Bogen tatsächlich abgegeben haben. **Nicht
verrechnet:** keine gemeinsame Skala, keine gemeinsame `WorkMap`, keine
Zuordnung der sechs v1-Dimensionen auf die fünf ALIGN-Abschnitte. Zwei Tests
prüfen die Reihenfolge und dass nichts aus `report` in die `WorkMap` gereicht
wird.

Das v1-Werteprofil bleibt, wo es ist: innerhalb von `SelfReportView`, also im
Altbestand-Block. Nicht neu konzipiert.

---

## 9. Bewusst nicht gebaut

Alles aus der Ausschlussliste: kein Guided Builder, keine Kapitelstatus, kein
`person_section_marks`, kein Gesamtfortschritt, keine PDF-Modi, keine neue
Print-Route, keine Evidence-Zitate, keine Advisor-Freigabe, kein neues
Werte-Modell, keine ALIGN-Synthesetexte, keine Scores, keine Typologie, kein
Radar, kein FIND-Umbau, keine Änderung am Capability-Modell, keine Übersetzung
der Registraturen, kein Statuswechsel von `founder-profile-v1`.

Dazu zwei Dinge, die ich erwogen und gelassen habe:

| Nicht getan | Warum |
|---|---|
| Die Facetten zu sechs Gruppen zusammenfassen (§12 der Vorgabe) | Die zehn Facetten tragen längst Beschriftungen in normaler Sprache — „Probleme, die mir wichtig sind", „Menschen, um die es mir geht". Sie zu sechs zu verdichten hätte zwei Facetten in einen Topf geworfen, die die Person getrennt eingetragen hat. Die Vorgabe sieht diesen Fall vor: bestehende Gruppierung behalten und benennen. |
| `network_ventures` (Connect-Unternehmen) im Fuß | „Vorhaben" meint in diesem Zusammenhang die ALIGN-Vorhaben. Zwei Arten von Vorhaben nebeneinander wären eine neue Frage, keine Verdrahtung. |

---

## 10. Was Phase 3 „Über dich" berücksichtigen sollte

**1. Die Bearbeiten-Wege sind heute fünf verschiedene.** `/profile`,
`/profile?step=evidence`, `/profile?step=ownership`, `/profile/interview`,
`/profile/direction`, `/founder-alignment/profil`, `/connect/profile`. Jeder
Abschnitt zeigt den passenden. Wenn „Über dich" eine Kapitelübersicht bekommt,
sollten diese Links dorthin zeigen — und zwar auf das Kapitel, nicht auf die
Seite.

**2. Die Ressourcen werden in Connect gepflegt.** Abschnitt 8 zeigt sie, der
Bearbeiten-Weg führt nach `/connect/profile`. Das ist der Zustand, den der
Gap-Plan als Entscheidung 9.3 offen lässt.

**3. Die Leerzustände sind die Schnittstelle.** Fünf Abschnitte tragen einen
Hinweis mit genau einem Weg. Das ist faktisch schon die Kapitelliste von „Über
dich", nur verteilt — die Übersicht kann dieselben Sätze benutzen.

**4. Der Status je Kapitel ist zur Hälfte da.** `zeigt` auf dieser Seite
beantwortet „gibt es dazu etwas". Was fehlt, ist „für jetzt fertig" — und das
ist die Entscheidung über `person_section_marks` aus der Über-dich-Spec §3.2.

**5. Die Abschnittsnamen sollten dieselben bleiben.** Neun Abschnitte hier,
neun Kapitel dort — wer „Deine Stärken" in beiden sieht, lernt einen Namen und
nicht zwei.

**6. `profiles.display_name` und `focus_skill`/`intention`** bleiben offen aus
Phase 1.5 beziehungsweise dem Gap-Plan. Beide betreffen „Über dich" direkt.

---

## 11. Risiken

**1. Zwei Abschnitte zeigen ihren Inhalt zweimal.** Bei wenigen Stärken oder
Richtungssätzen enthält der Aufklapper dieselben Einträge wie die
Zusammenfassung — nur zusätzlich mit Herkunft. Erst ab sechs Stärken
beziehungsweise drei Sätzen je Rubrik unterscheidet sich der Inhalt. Die
Alternative wäre, die Herkunft in die Zusammenfassung zu ziehen; dann liest
sich jede Aussage als Fußnote.

**2. Der Stand kostet sechs Abfragen.** Kleine Abfragen mit Index auf
`user_id`, aber es sind sechs mehr als vorher. Fällt eine aus, zählt sie nicht
mit — das Datum wird dann stillschweigend älter, ohne dass man es sieht.

**3. Die Registraturtexte bleiben deutsch.** Auf der englischen Fassung stehen
die Abschnittsüberschriften des Arbeitsprofils („A – Analytische Prüfung")
weiter auf Deutsch. Bekannt aus Phase 1.5, unverändert.

**4. Der Druck öffnet weiterhin alles.** `OpenDetailsForPrint` klappt beim
Drucken jeden Aufklapper auf, also auch den Altbestand und die Herkunfts-
Listen. Das ist die bestehende Regel, solange es einen Druckmodus gibt. Mit
Kurz- und Langfassung gehört das neu entschieden.

**5. Die Seite ist lang.** Neun Abschnitte mit Zusammenfassung und Aufklapper;
der Sprungbalken hilft, ersetzt aber keine Messung an echten Daten. Die
Zustände, die ich prüfen konnte, stehen in §12 — ein Profil mit allen 54
Bereichen und zwanzig Stärken war nicht darunter.

---

## 12. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2517 Tests · next build · 1293 DB-Tests
                     alles grün
```

Neue Tests: `ownershipGroups.test.ts` (7), `dasBistDu.test.ts` (7). Angepasst:
`founderProfile.test.ts` — die Vier-Säulen-Zusagen wurden zu Drei-Teile-Zusagen,
dazu vier neue Fälle (Aufklappertiefe, Stand, Venture-Trennung, Rollenblock).

Angemeldeter Durchgang gegen einen eigenen Entwicklungsserver, gemessen am
sichtbaren Text (nicht am rohen HTML — die RSC-Nutzlast enthält den ganzen
Sprachbaum und hätte jeden Satz gefunden, auch die nicht gerenderten):

| Zustand | Konto | Ergebnis |
|---|---|---|
| vollständiges Profil | `dev` | drei Teile, Abschnitte 1–9, „Stand vom 1. Oktober 2026" |
| nur Basisdaten | `advisor` | 5, 7, 8 fehlen — auch im Sprungbalken; 1, 2, 3, 9 mit Hinweis |
| nur v1, kein neues ALIGN | `carla` | Leerzustand mit Weg zu `/founder-alignment/profil`, darunter „Deine frühere Auswertung" |
| v1 **und** neues ALIGN | `ben` | beide, getrennt, Altbestand zugeklappt |
| bestätigte + offene Ressourcen | `dev` | zwei bestätigte sichtbar, der offene **0×** |
| keine Ressourcen | `advisor` | Abschnitt entfällt |
| keine `growingInto` | `advisor` | Abschnitt entfällt |
| mehrere `growingInto` | `dev` | Abschnitt erscheint |
| Direction leer | `carla` (vorübergehend geleert) | Hinweis mit einem Weg |
| de / en | `dev` | „Auf einen Blick" / „At a glance", „Teil III" / „Part III" |

Testdaten wurden angelegt und wieder entfernt; danach `supabase db reset
--local` und neu geseedet.

**Mobil** nicht in einem Browser gemessen. Alle neuen Raster tragen
`sm:`-Stufen und sind einspaltig darunter; die Aufklapper sind `details` mit
44 px Mindesthöhe. Das ist geprüfte Bauweise, keine geprüfte Darstellung.

**Advisor, FIND und Connect** sind unverändert: Ihre Tests laufen durch, und
die einzige geteilte Komponente, die ich angefasst habe (`CoverageMap`), hatte
außer dieser Seite keinen Verwender.
