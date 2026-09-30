# „Das bist du" — technische Bestandsaufnahme

**Stand 30.09.2026.** Nur Bestandsaufnahme: kein neues Datenmodell, kein
Umbau. Alle Pfade relativ zum Repo-Wurzelverzeichnis; alles unter `src/` liegt
in `web/`.

Gezählt wurde gegen die lokale Datenbank (`supabase start`), gelesen wurde im
Code — nicht aus Erinnerung oder aus Dokumentation, die veraltet sein kann.

---

## 1. Wo die Seite heute steht

| | |
|---|---|
| Route | `/me/profile` |
| Datei | `src/app/me/profile/page.tsx` (458 Zeilen) |
| Überschrift im Produkt | „Founderprofil" / „Gesamtbild" |
| „Das bist du" als Wortlaut | steht **nur** in `messages/de/connect.json:773` (`yours`) — das ist die Connect-Ansicht, nicht diese Seite |

Die Seite ist ausdrücklich **eine Zusammenstellung, kein eigener Speicher**.
Sie liest vier vorhandene Quellen und schreibt nichts. Vier Säulen:

| # | Säule (intern) | Überschrift | Quelle | Zustand |
|---|---|---|---|---|
| 1 | `saeule-wer` | Grundlage | `person_core` | aktuell |
| 2 | `saeule-wie` | Arbeitsweise | **v1-Instrument** `founder-compatibility-v1` + `person_strengths` | **alt** (§8) |
| 3 | `saeule-was` | Fähigkeiten | `person_capability_entries` + Vokabular | aktuell |
| 4 | `saeule-wohin` | Richtung | `direction_statements` | aktuell |

Was die Seite bewusst **nicht** tut (steht so im Kopfkommentar der Datei, und
die Begründung gilt für jeden Umbau weiter): keine Gesamtzahl je Person, kein
Netzdiagramm, keine Interview-Erzählungen, keine Versprechen auf Ungebautes.

---

## 2. Datenquellen je Baustein

### 2.1 Person / Basisprofil

| Tabelle | `person_core` (ein Satz je Person) |
|---|---|
| Spalten | `user_id, display_name, headline, bio, location_region, remote_mode, expertise[], industries[], capability_disclosure, photo_visible_to_members, onboarding_completed_at, locale, linkedin_url, linkedin_visibility` |
| Typ/Zugriff | `src/features/profile/personCoreData.ts` → `getPersonCore()` |
| Anzeige | `src/features/reporting/FounderProfileBase.tsx` |
| Pflege | `/profile` |

Daneben existiert `profiles` (Rollen, Anzeigename) — das ist die Zugriffs- und
Rollentabelle, nicht das Profil.

### 2.2 ALIGN Founder-Arbeitsprofil (neu, v2.2)

| | |
|---|---|
| Instrument | `founder-profile-v1` (`FOUNDER_PROFILE_INSTRUMENT_ID`) |
| Registratur | `web/docs/founder-profile-registry-v1.json`, erzeugt von `web/scripts/build-registry-v2-2.py` |
| Antworten | `assessments` + `alignment_answers` (`block_id`, `value` jsonb, `missing_code`) |
| Items | 16: `A01 A02 I01 I02 I03 E01 E02 E03 T01 T02 D01 D02 X01 X02 X03 X04` |
| Abschnitte | A – Analytische Prüfung · I – Nutzung von Erfahrungsintuition · E – Frühes Erproben · T/D – Unterschiede ansprechen und formulieren · X – Wohlbefinden bei offener Informationslage |
| Oberfläche | `/founder-alignment/profil` (7 Schritte), Antworten unter `/founder-alignment/profil/antworten` |
| Code | `src/features/instruments/align/` |

> **Dieses Instrument kommt auf `/me/profile` bislang gar nicht vor.** Die
> Säule „Arbeitsweise" liest weiter das v1-Instrument. Siehe §8.

### 2.3 Capability

| Tabelle | Inhalt |
|---|---|
| `capability_families` | `family_id, sort_order` — 11 Familien |
| `capability_areas` | `area_id, family_id, sort_order, sourcing` — 54 Bereiche |
| `person_capability_entries` | `user_id, area_id, application_level (1–5, nullable), ownership_wish, …` |
| `person_capability_evidence` | erzählte Belege zu einem Eintrag |
| `capability_area_proposals` | Modellvorschläge, bis die Person sie bestätigt |
| `capability_interview_sessions` / `_turns` / `_turn_areas` | das Interview, aus dem die Einträge entstehen |

Typen: `src/features/capability/capabilityTypes.ts`.
Zugriff: `capabilityData.ts` (`getCapabilityVocabulary`, `getOwnCapabilityEntries`).

### 2.4 Erfahrungsstufen und Verantwortungswünsche

Siehe §3 — beide sind Spalten von `person_capability_entries`, nicht eigene
Tabellen.

### 2.5 Faltin- / Rollenlogik

Kein eigenes Datenfeld an der Person. Die Herkunftsart hängt am **Bereich**:
`capability_areas.sourcing`, Werte `internal_only | component | depends |
unclassified`. Eingeführt in
`supabase/migrations/20261051120000_sourcing_faltin_classification.sql`,
Begründung in `docs/faltin-sourcing-review.md`. Auswertung: §4.

### 2.6 Richtung / Why

| Tabelle | Inhalt |
|---|---|
| `direction_statements` | `user_id, facet, statement, confidence, origin, source_turn_id` |
| `direction_statement_proposals` | `turn_id, facet, statement, evidence_quote, status, model, prompt_version` |
| `capability_interview_sessions` mit `kind = 'direction'` | das Gespräch selbst (`turns` dieselbe Tabelle wie beim Capability-Interview) |

Code: `src/features/direction/`. Details: §5.

### 2.7 Werte

| | |
|---|---|
| Instrument | `founder-compatibility-v1`, Modul `values` (**nicht** eigenes Instrument) |
| Fragen | `docs/values-instrument-v1.json` — 10 Szenarien, alle mit `dimension: "Werte & Ethik"` |
| Antworten | `assessments` (`module='values'`) + `assessment_answers` |
| Auswertung | `SelfValuesProfile` in `src/features/reporting/types.ts`: drei Archetypen `impact_idealist \| verantwortungs_stratege \| business_pragmatiker`, dazu `clusterScores`, `insights`, `watchouts` |
| Oberfläche | `/me/values` |

> Gehört zur alten Architektur (§8) und wird für neue Konten seit dem
> 30.09.2026 nicht mehr angeboten.

### 2.8 Ventures

| | |
|---|---|
| Tabellen | `founder_teams` (`id, name, team_context`), `founder_team_members` |
| Instrument | `venture-alignment-v1`, Registratur `web/docs/venture-alignment-registry-v1.json` |
| Abschnitte | U/K Zusammenarbeit · S Ziele & strategische Richtung · R Ressourcen & Zusagen · G Entscheidungs- und Teamregeln · B Risikogrenzen & Absicherung · W Prioritäten in Zielkonflikten · L persönliche Grenzen |
| Antworten | `alignment_answers` mit `venture_id` |
| Oberfläche | `/founder-alignment/vorhaben` (9 Abschnitte) |

> **Kommt auf `/me/profile` nicht vor.** Sachlich richtig: Venture-Angaben
> gelten für *ein* Vorhaben und einen Zeitraum, das Profil gilt für die
> Person. Falls die neue Seite sie zeigen soll, ist das eine Entscheidung und
> keine Anbindung.

### 2.9 Weiteres, das existiert und auf der Seite fehlt

| Tabelle | Inhalt | Wo sichtbar |
|---|---|---|
| `person_resources` | `kind ∈ {network, access, offer}`, `label`, `origin ∈ {self, model}`, `status ∈ {pending, confirmed, rejected}`, `evidence_quote` | nur in `src/features/ai/personResources.ts` — **auf keiner Profilseite** |
| `person_alignment_snapshots` | zwischengespeicherte v1-Werte (`scores`, `values_profile`, Zählwerte) | intern, `instrument_id` steht per Vorgabe auf `founder-compatibility-v1` |

---

## 3. Capability-Taxonomie

**11 Familien, 54 Bereiche.** Quelle ist die Datenbank; das Vokabular wird als
Daten geladen, nicht im Code aufgezählt.

| Familie (`family_id`) | Anzeige | Bereiche | davon `internal_only` | `component` | `depends` |
|---|---|---:|---:|---:|---:|
| `customer_market` | Kunden & Markt | 5 | 1 | 1 | 3 |
| `product_value` | Produkt & Nutzenversprechen | 5 | 2 | 2 | 1 |
| `strategy_business_model` | Strategie & Geschäftsmodell | 4 | 4 | 0 | 0 |
| `technology_delivery` | Technologie & Umsetzung | 6 | 0 | 1 | 5 |
| `commercial_growth` | Vertrieb & Wachstum | 7 | 1 | 1 | 5 |
| `finance_funding` | Finanzen & Finanzierung | 5 | 4 | 1 | 0 |
| `operations_people` | Operations, People & Organisation | 5 | 2 | 0 | 3 |
| `legal_governance` | Recht, Governance & Compliance | 5 | 0 | 5 | 0 |
| `communication_representation` | Außenauftritt & Moderation | 5 | 1 | 0 | 4 |
| `working_style` | Zusammenarbeit & Verantwortung | 6 | 6 | 0 | 0 |
| `other` | Anderer Schwerpunkt | 1 | 0 | 0 | 1 |
| **Summe** | | **54** | **21** | **11** | **22** |

`unclassified` kommt in den Daten derzeit nicht vor — es ist die Voreinstellung
und ausdrücklich **keine** Einschätzung („hat noch niemand eingeordnet").

### Erfahrungsstufen (`application_level`, 1–5, nullable)

| Stufe | Text |
|---|---|
| 1 | Noch nicht praktisch angewandt |
| 2 | Mit Unterstützung ausprobiert |
| 3 | Selbstständig angewandt |
| 4 | Wiederholt angewandt |
| 5 | Auch in schwierigen Situationen angewandt, kann andere unterstützen |
| `null` | Noch nicht eingestuft |

Es gibt **keine 0**: „noch nichts eingetragen" ist `null`, nicht die unterste
Stufe. `DEPTH_LEVEL = 4` ist die Grenze, ab der eine Angabe als *Tiefe* gilt —
eine Konstante, weil Auswertung und Vergleich dieselbe Grenze brauchen.

### Verantwortungswünsche (`ownership_wish`, nullable)

| Wert | Text |
|---|---|
| `own` | Möchte ich verantwortlich übernehmen |
| `contribute` | Möchte ich aktiv beitragen |
| `grow_into` | Möchte ich mich hineinentwickeln |
| `prefer_other` | Lieber eine andere Person |
| `prefer_external` | Lieber extern abdecken |
| `unclear` | Noch unklar |
| `null` | Noch offen |

Der tragende Satz des Modells: **Können ist nicht Wollen.** Eine hohe
Erfahrungsstufe zusammen mit `prefer_other` ist ein ausdrücklich gültiger
Zustand, kein Widerspruch.

### Sichtbarkeit

`person_core.capability_disclosure ∈ {private, areas, areas_depth_on_contact}`
steuert, was andere sehen. In der freigegebenen Sicht sind
`application_level` und `ownership_wish` `null`, solange die Tiefe nicht frei
ist — der Leser kann nicht unterscheiden, ob sie fehlt oder zurückgehalten
wird.

---

## 4. „Welche Rollen du abdeckst" und die Faltin-Auswertung

Datei: `src/features/reporting/founderProfileCoverage.ts`
(`buildFounderProfileCoverage`), Anzeige: `src/features/reporting/CoverageMap.tsx`.

### Die Rollenliste

Ein Bereich zählt als abgedeckt, wenn **zwei** Bedingungen zusammenkommen:

1. `capability_areas.sourcing === "internal_only"` — der Bereich gehört ins
   Team. Was einkaufbar ist, braucht niemanden im Team; dort ist eine Lücke
   eine Bestellung.
2. `ownership_wish ∈ {own, contribute}` — die Person will ihn verantworten.

`grow_into` zählt **bewusst nicht** mit: „da will ich hineinwachsen" ist eine
Absicht und noch keine abgedeckte Rolle.

Ergebnis (`RoleCoverage`):

| Feld | Bedeutung |
|---|---|
| `covered[]` | gehört ins Team **und** soll verantwortet werden |
| `spokenNotOwned[]` | gehört ins Team, ist besprochen, aber niemand will es übernehmen |
| `bySourcing` | Zählwerte über die eingetragenen Bereiche je Herkunftsart |

Die Erfahrungsstufe wird hier **nicht** verrechnet. Eine Rollendeckung mit
einer Note wäre wieder eine Bewertung von Menschen.

### Die Deckungskarte

Je Familie ein Balken aus ihren Bereichen, eingefärbt nach dem Zustand:

| Zustand | Bedingung |
|---|---|
| `answered` | Stufe **und** Verantwortungswunsch gesetzt |
| `levelled` | nur Stufe |
| `named` | Eintrag ohne Stufe |
| `unspoken` | kein Eintrag |

Ausdrücklich **kein Netzdiagramm**: Ein Spinnennetz braucht je Familie eine
Zahl, also einen Score, und den gibt dieses Modell nicht her
(`docs/capability-comparison-theory-brief.md`). `unspoken` ist bei 54
Bereichen der Normalfall und wird blass gezeichnet, nie wie eine Lücke.

### Die zweite Auswertung daneben

`src/features/capability/capabilityReadout.ts` erzeugt fünf Befunde. Der
**erste zutreffende gewinnt**, damit ein Bereich nicht in zwei Listen steht:

| Befund | Regel |
|---|---|
| `canButHandsOver` | Stufe ≥ 4 **und** Wunsch ∈ {`prefer_other`, `prefer_external`} |
| `growingInto` | Wunsch `own` bei Stufe < 4 — **oder** Wunsch `grow_into` |
| `anchor` | Wunsch `own` (Stufe fehlt oder ≥ 4) |
| `contributes` | Wunsch `contribute` oder abgebend |
| `undecided` | kein Wunsch angegeben oder `unclear` |

Dazu `focusFamilyId` — die Familie mit den meisten Einträgen, **null bei
Gleichstand**: Zwei gleich große Familien sind kein Schwerpunkt.

---

## 5. „Was dich immer wieder anzieht" / Richtung / Why

Leitfaden: `src/features/direction/directionInterviewGuide.ts`
(fachliche Grundlage: `web/docs/direction-interview-technical-brief.md`).
Die **Fragetexte stehen nicht im Code**, sondern in
`messages/<locale>/direction.json` unter `interview.questions.<id>`.

### Die sechs Fragen (Reihenfolge ist Teil des Leitfadens)

| # | `id` | Frage (sinngemäß) | Facetten |
|---|---|---|---|
| 1 | `more_of_this` | Etwas, bei dem du dachtest: davon würde ich gern mehr machen | `energising_activity`, `preferred_contribution` |
| 2 | `keeps_bothering` | Welches Problem regt dich *immer wieder* auf? | `problem_cared_about`, `people_cared_about`, `frustrating_condition` |
| 3 | `changed_something` | Wann hast du zuletzt wirklich etwas Sinnvolles verändert? | `meaningful_outcome`, `desired_change` |
| 4 | `not_again` | Etwas, das du so nicht nochmal machen möchtest | `frustrating_condition`, `recurring_tension` |
| 5 | `interesting_anyway` | Was fändest du spannend, auch ohne Business Case? | `recurring_theme`, `open_question` |
| 6 | `five_years_back` | Rückblick aus fünf Jahren: was müsste entstanden sein? | `desired_change`, `preferred_contribution`, `recurring_tension` |

Je Frage stehen geschriebene Nachfragen (`followUpIds`) bereit — der Weg, wenn
kein Modell erreichbar ist. `DIRECTION_MIN_ANSWERS = 4` von 6.

### Die zehn Facetten

`recurring_theme · problem_cared_about · people_cared_about · desired_change ·
meaningful_outcome · energising_activity · preferred_contribution ·
frustrating_condition · recurring_tension · open_question`

Sie sind **Anker, keine Etiketten**: Sie prüfen, ob ein Modellvorschlag zur
Frage passt, aus der er stammt. Es gibt keine Typologie („du bist ein
Empowerer-Typ") und keinen Purpose-Score.

### Datenmodell und Ausgabe

```
capability_interview_sessions (kind = 'direction')
  └── capability_interview_turns   (question_id, question_text, answer)
        └── direction_statement_proposals (facet, statement, evidence_quote,
                                           status, model, prompt_version)
              └── direction_statements   (facet, statement, confidence, origin,
                                          source_turn_id)
```

`origin` trennt, woher ein Satz stammt (eigene Worte / bestätigter Vorschlag /
bearbeiteter Vorschlag). **Bis die Person einen Vorschlag bestätigt hat,
existiert er für andere Produktbereiche nicht.**

Ausgabe auf der Seite: `src/features/reporting/FounderProfileDirection.tsx` —
die Sätze, nach Facette gruppiert. Keine Zusammenfassung, keine Verdichtung.

---

## 6. Gibt es „Stärken" schon?

**Ja, als eigenes Konstrukt mit eigener Tabelle** — nicht abgeleitet.

| | |
|---|---|
| Tabelle | `person_strengths` |
| Spalten | `user_id, statement, origin, source_turn_id, self_frequency, reflected_frequency, reflected_who` |
| Vorschläge | `person_strength_proposals` |
| Typ/Zugriff | `src/features/capability/strengthData.ts` |
| Anzeige | `src/features/reporting/FounderProfileStrengths.tsx`, Pflege `StrengthsSection.tsx` |

Was eine Stärke hier ist: **ein Satz über eine Arbeitsweise**, die in einer
erzählten Situation sichtbar wurde — kein Bereich aus dem Vokabular (dafür
gibt es die Fähigkeiten) und kein Merkmal einer Person.

Zwei Blickrichtungen, und der Abstand zwischen ihnen ist das Ergebnis:

| Feld | Werte |
|---|---|
| `self_frequency` | `rarely \| sometimes \| often \| almost_always` |
| `reflected_frequency` | dieselbe Skala, aber: „was würden andere sagen" |
| `reflected_who` | `former_colleagues \| current_colleagues \| managers \| friends \| family` |
| `origin` | `own_words \| confirmed_proposal \| edited_proposal` |

Begründung im Code: Eine Selbsteinschätzung misst Selbstbild und
Selbstvertrauen, und beides ist ungleich verteilt; die Fremdfrage umgeht das
teilweise, weil man nur berichtet statt sich zu loben.

---

## 7. Woher das Gesamtbild seine Daten und Texte nimmt

### Daten (alle Aufrufe in `src/app/me/profile/page.tsx`, ein `Promise.all`)

| Aufruf | Datei | liefert |
|---|---|---|
| `getPersonCore` | `features/profile/personCoreData.ts` | Säule 1 |
| `getLatestSelfAlignmentReport` | `features/reporting/actions.ts:1761` | Säule 2 — **v1** |
| `getPersonStrengths` | `features/capability/strengthData.ts` | Säule 2 |
| `getCapabilityVocabulary`, `getOwnCapabilityEntries` | `features/capability/capabilityData.ts` | Säule 3 |
| `getDirectionStatements` | `features/direction/directionStatementData.ts` | Säule 4 |

Abgeleitet daraus, ohne eigenen Speicher:
`buildCapabilityReadout` · `buildFounderProfileCoverage`.

### Anzeigebausteine

`FounderProfileBase` · `SelfReportView` (`density="summary"`) ·
`FounderProfileStrengths` · `CoverageMap` · `CapabilityReadoutSection` ·
`FounderProfileCapability` · `FounderProfileDirection` · `ProfilePillar` ·
`ProfileDetails` · `InstrumentNote` · `PrintReportButton` ·
`OpenDetailsForPrint`

### Texte

| Art | Ort |
|---|---|
| Seitentexte, Säulennamen | `messages/<locale>/profile.json` → `founderProfile.*` |
| Capability-Vokabular, Stufen, Wünsche | `messages/<locale>/capability.json` |
| Direction-Facetten | `messages/<locale>/direction.json` |
| Hinweis „was das ist und was nicht" | `messages/<locale>/report.json` → `report.instrumentNote` |
| **Berichtstexte der Säule 2** | fest im Code: `features/reporting/content/*`, `self_report_texts.de.ts`, `selfReport*Content.ts`, `heroTextBuilder.ts`, `patternTextBuilder.ts` |

Die Berichtstexte der Säule 2 sind der einzige Teil, der **nicht** über
`next-intl` läuft — sie sind Bausteine mit Auswahllogik, kein Sprachbundle.

---

## 8. Was noch auf der alten ALIGN-Architektur beruht

**Betroffen ist genau eine Säule — „Arbeitsweise" — und zwar vollständig.**

`getLatestSelfAlignmentReport` liest `assessments` mit
`instrument_id = 'founder-compatibility-v1'`, Module `base` und `values`.
Die Auswertung läuft über die sechs Dimensionen aus
`features/scoring/founderCompatibilityRegistry.ts`:

| `DimensionId` | Anzeige (`FounderDimensionKey`) |
|---|---|
| `company_logic` | Unternehmenslogik |
| `decision_logic` | Entscheidungslogik |
| `work_structure` | Arbeitsstruktur & Zusammenarbeit |
| `commitment` | Commitment |
| `risk_orientation` | Risikoorientierung |
| `conflict_style` | Konfliktstil |

Das sind **genau die Kategorien**, die die FIND-Spec v0.1 in §20 aus FIND
entfernt — mit derselben Begründung: Sie stammen aus einer älteren
Architektur und vermischen venturebezogene Themen mit portablen
Arbeitspräferenzen.

Ebenfalls alt und an derselben Säule:

- **Werte** (§2.7): Modul `values` desselben v1-Instruments, Archetypen
  `impact_idealist | verantwortungs_stratege | business_pragmatiker`.
- `person_alignment_snapshots` mit Vorgabe `instrument_id =
  'founder-compatibility-v1'`.
- Der Link bei fehlender Säule zeigt auf `/me/base` — den alten Fragebogen.

Die **Säulen 1, 3 und 4 sind davon nicht berührt**: `person_core`, Capability
und Direction sind eigene Modelle und unabhängig vom Instrument.

Das neue ALIGN-Arbeitsprofil (`founder-profile-v1`, 16 Items, Abschnitte
A/I/E/T-D/X) liefert dieselbe Art Aussage wie Säule 2 — **und ist auf dieser
Seite nirgends angebunden.** Für ein Konto, das seit dem 30.09.2026 neu
angelegt wurde, bleibt Säule 2 deshalb dauerhaft leer: Solche Konten bekommen
den v1-Fragebogen gar nicht mehr angeboten.

---

## 9. Vorhanden / abgeleitet / fehlt

### Vorhanden — gespeichert und abfragbar

| Baustein | Tabelle |
|---|---|
| Name, Headline, Bio, Region, Remote, Expertise, Branchen, LinkedIn | `person_core` |
| Fähigkeiten je Bereich, Erfahrungsstufe, Verantwortungswunsch | `person_capability_entries` |
| Belege zu Fähigkeiten | `person_capability_evidence` |
| Taxonomie inkl. Faltin-Herkunftsart | `capability_families`, `capability_areas` |
| Stärken, selbst- und fremdeingeschätzt | `person_strengths` |
| Richtungssätze je Facette | `direction_statements` |
| Rohgespräche beider Interviews | `capability_interview_sessions/_turns` |
| Netzwerk / Zugang / Angebot | `person_resources` — **erhoben, nirgends angezeigt** |
| ALIGN-Arbeitsprofil v2.2 (16 Items) | `alignment_answers` — **nicht auf dieser Seite** |
| Venture-Alignment (42 Items je Vorhaben) | `alignment_answers` mit `venture_id` — **nicht auf dieser Seite** |
| v1-Basis und v1-Werte | `assessments` + `assessment_answers` |

### Abgeleitet — bei jedem Aufruf neu berechnet, nirgends gespeichert

| Ableitung | Datei |
|---|---|
| Deckungskarte je Familie | `founderProfileCoverage.ts` |
| Rollenliste nach Faltin (`covered`, `spokenNotOwned`) | `founderProfileCoverage.ts` |
| Fünf Capability-Befunde, Schwerpunktfamilie | `capabilityReadout.ts` |
| Alle Texte des v1-Berichts (Kernmuster, Alltag, Bruchstellen, Hebel) | `features/reporting/content/*`, `selfReport*Content.ts` |
| Werte-Archetyp und Cluster-Werte | aus den v1-Antworten |

### Fehlt für ein ausführliches neues „Das bist du"

Nach Aufwand sortiert, ohne Vorschlag zur Lösung:

1. **Eine Anbindung der Säule „Arbeitsweise" an das neue Instrument.** Heute
   v1; neue Konten füllen v1 nicht mehr. Das ist die größte offene Stelle, und
   sie betrifft auch die Texte: Der gesamte Textapparat von `SelfReportView`
   ist auf die sechs v1-Dimensionen gebaut.
2. **Eine Textebene für das neue Arbeitsprofil.** `/founder-alignment/profil/antworten`
   zeigt heute bewusst *nur die Antworten* — keine Auswertung, keine
   Punktzahl. Für ein Profil, das man weitergibt, fehlt dazwischen etwas.
3. **Werte im neuen Modell.** Das Werteprofil hängt komplett an v1. Ob Werte
   im neuen Modell überhaupt vorkommen sollen, ist eine offene Produktfrage.
4. **Ein Ort für `person_resources`.** Netzwerk, Zugang und Angebot werden
   erhoben und erscheinen nirgends — für „was bringst du mit" ist das
   naheliegendes Material.
5. **Entscheidung über Ventures im Profil.** Die Daten sind da. Sie gelten
   aber für ein Vorhaben und einen Zeitraum, das Profil für die Person; ein
   Profil mit Venture-Zusagen darin würde beides vermischen.
6. **Eine Herkunftsangabe je Aussage.** Heute steht bei einem Satz nicht
   sichtbar, ob er aus einem Interview, aus einem bestätigten Modellvorschlag
   oder aus eigener Eingabe stammt. `origin` und `evidence_quote` liegen in
   den Tabellen — angezeigt werden sie nicht.
7. **Ein Stand pro Person.** Es gibt keinen „zuletzt aktualisiert"-Zeitpunkt
   über alle vier Säulen hinweg; `InstrumentNote` datiert nur den v1-Bericht.

### Was ausdrücklich fehlen soll

Kein Gesamtwert, kein Netzdiagramm, keine Typologie, keine Erfolgsprognose.
Das steht so in `me/profile/page.tsx`, `founderProfileCoverage.ts` und
`directionInterviewGuide.ts` — und die Begründung ist dieselbe: Ein
unvalidiertes Instrument, das eine Zahl je Person ausgibt, wird als
Auswahlkriterium benutzt, sobald es existiert. Den Schaden trägt die Person.
