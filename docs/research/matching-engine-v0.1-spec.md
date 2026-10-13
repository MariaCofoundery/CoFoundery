# Made2Found Matching Engine v0.1 – Technische Spezifikation

| | |
|---|---|
| Status | **Entwurf zum Einfrieren** – alle offenen Punkte entschieden (Abschnitt 20), noch nicht mit Hash eingefroren, keine Produktimplementierung |
| `matching_version` | `matching-v0.1` |
| `normalization_version` | `matching-normalization-v0.1` |
| `idf_corpus_version` | je Korpus-Snapshot, Abschnitt 11.2 |
| Stand | 13.10.2026 |
| Forschungsgrundlage | Experimente v01, v02, v03 (`docs/research/synthetic/experiments/…`), Vorab-Festlegung v03 SHA-256 `cbe29894e01cffb27d1d81aef7ab0bba9a425bda8db07b6eda858cfc09fad9df`; Family-Ablation v03b SHA-256 `95197de95f0c85022e6089e5ad075fdf7af48fd66229805c700581292e0a51a1` |
| Holdout | 38 saubere Paare **UNOPENED**; RP-001, RP-002 kontaminiert |

Diese Datei ist die **verbindliche** Spezifikation. Die maschinenlesbare Fassung der Konstanten steht in [`matching-engine-v0.1-spec.json`](matching-engine-v0.1-spec.json). Bei Widerspruch gilt diese Datei.

**Markierungen in diesem Dokument:**

| Markierung | Bedeutung |
|---|---|
| **[GETESTET]** | exakt so in Experiment 3 vorab festgelegt und ausgewertet |
| **[PRODUKTENTSCHEIDUNG]** | eine Wahl, die die Experimente nicht beweisen, sondern nur begründen oder offenlassen |
| **[OFFEN]** | muss vor der Implementierung entschieden werden – in dieser Fassung **keine** offenen Punkte mehr |
| **[ENTSCHIEDEN]** | ehemals offener Punkt, durch Produktentscheidung oder Development-Test (v03b) geklärt |
| **[IMPLEMENTIERUNG]** | technische Wahl, die das fachliche Verhalten nicht ändern darf |

---

## 1. Purpose

Die Engine beantwortet genau eine Frage:

> **Wie relevant könnte dieser Kontakt aufgrund der vorhandenen Informationen sein?**

Sie ordnet Vorschläge in zwei Kontexten:

- **FIND:** Person ↔ Person, mögliche Mitgründung, grundsätzlich gegenseitig.
- **CONNECT:** Gesuch → Angebot, konkreter Bedarf, gerichtet.

Zu jedem Vorschlag liefert sie nachvollziehbare Gründe, die erkannten Unterschiede und die Unsicherheit der Einschätzung.

## 2. Non-goals

Die Engine behauptet **nicht** und zeigt **nicht** an:

- dass Menschen „kompatibel“ sind,
- Founder-Fit, psychologische Passung oder Persönlichkeit,
- Erfolgswahrscheinlichkeit, Teamqualität oder Eignung,
- Prozent-Match oder eine öffentliche numerische Kompatibilitätszahl,
- „wissenschaftlich validierte“ Passung.

Es gibt keine Validierung an echten Founder-Outcomes (Abschnitt 19). Interne Relevanzwerte dienen nur der Reihenfolge.

Die Engine nutzt keine externe KI, kein LLM und keine Embeddings. Sie ist **deterministisch** und serverseitig berechenbar.

## 3. Terminology

| Begriff | Bedeutung |
|---|---|
| **Gate / Eligibility** | Zulassungsprüfung vor jeder Relevanz. Ergebnis `eligible`, `uncertain` oder `ineligible`. Keine Punkte. |
| **Directional Relevance** | Relevanz in eine Richtung: Wie gut deckt Y, was X sucht? Wert 0–1. |
| **Need** | Bedarf von X: gesuchte Rollen (`seeking_roles`) und Bereiche, die X abgeben will (`ownership_wish` ∈ {`prefer_other`, `prefer_external`}). |
| **Offer** | Angebot von Y: eigene Rollen (`own_roles`) und Capability-Einträge mit Erfahrung und Verantwortungswunsch. |
| **Mutuality** | Kombination beider Richtungen in FIND. |
| **Confidence** | Wie viel relevante Information für die Einschätzung vorliegt. **Keine** Matchqualität. |
| **Reason** | Begründung, die aus konkreten Eingabefeldern abgeleitet ist (Reason Code + Template). |
| **SYNTHETIC REFERENCE** | konstruktiv erzeugte Ground Truth des synthetischen Datensatzes |
| **SILVER DEVELOPMENT REFERENCE** | zwei getrennte **Modell**-Review-Pässe auf 80 Development-Paaren; **keine** menschliche Ground Truth |
| **UNKNOWN** | Wert fehlt; nie ein Konflikt, nie ein Bonus |
| **PH1** | Struktur, in der der Bedarf als **Faktor** wirkt statt als Summand (v02 nachträglich gefunden, in v03 vorab festgelegt geprüft) |

## 4. Data inputs

Die Felder und ihre Wertelisten stehen in [`matching-v0.1-data-inventory.md`](matching-v0.1-data-inventory.md). Die Engine liest **nur** die Felder aus dieser Tabelle. Ob sie sie verwenden darf, regelt Abschnitt 5.

**FIND**

| Feld | Quelle | Rolle in der Engine |
|---|---|---|
| `status`, Rolle `founder` | `founder_discovery_profiles`, `profiles.roles` | Pool-Voraussetzung |
| `own_roles` | FIND-Profil | Offer |
| `seeking_roles` | FIND-Profil | Need |
| `availability_hours_per_week` | FIND-Profil | Gate (Mindeststunden der Gegenseite) |
| `availability_flexibility` | FIND-Profil | Confidence, Erklärung |
| `commitment_level` | FIND-Profil | **nur Erklärung** (in v03 nicht in der Relevanz) |
| `venture_stage`, `venture_goal`, `search_intent`, `start_horizon` | FIND-Profil | Intent-Teil des Modulators; Gate nur über ausdrückliche Must-haves |
| `must_haves` (privat) | `founder_search_preferences` | Gate |
| `industries` | `person_core` | Kontext-Teil des Modulators (normalisiert) |
| `expertise` | `person_core` | Gate (`requiredExpertiseAny`), Confidence |
| `location_region`, `remote_mode` | `person_core` | Gate, Confidence |
| Capability: `area_id`, `application_level`, `ownership_wish` | `person_capability_entries` | Need/Offer – **nur mit ausdrücklicher Matching-Zustimmung, siehe 5** |

**CONNECT**

| Feld | Quelle | Rolle |
|---|---|---|
| `direction`, `category`, `title`, `summary`, `topics`, `industries`, `locations`, `geographic_scope`, `remote_mode`, `status`, `expires_at` | `network_listings` | Gate und Relevanz |
| Profil `status`, `suggestable`, Blockierung | `network_profiles`, Block-Status | Gate |
| `expertise` der anbietenden Person | `network_profiles` / `person_core` | Themenbezug (Topic-Teil) |

**Nicht** Eingabe von v0.1:

- Workstyle (nur Erklärung danach, Abschnitt 15),
- alte Compatibility- und Values-Scores (`founder-compatibility-v1`), Venture Alignment, Founder Setup,
- Commitment Lab, Read My Mind, Founder in the Wild,
- alle Research-Items (DEC, FS, `-R1`, `workstyle_research_responses`),
- Direction-Aussagen (es gibt dafür keine Matching-Freigabe),
- `person_resources`, Evidence-Narrative, Interview-Antworten, Stärken,
- Advisor-Daten,
- `profiles.focus_skill`, `profiles.intention`,
- `network_ventures`, Probleme, Workspaces,
- `open_to_formats`, `network_roles`, `network_reach`.

## 5. Privacy / permission model

Für jedes Feld werden **drei Fragen getrennt** beantwortet. Keine folgt aus einer anderen.

| | Frage |
|---|---|
| **A** | Existieren die Daten? |
| **B** | Dürfen sie dem Gegenüber angezeigt werden? |
| **C** | Dürfen sie fürs Matching verwendet werden? |

| Daten | A | B (anzeigen) | C (Matching v0.1) |
|---|---|---|---|
| FIND-Profilfelder (Rollen, Stunden, Commitment, Phase, Ziel, Suchstand, Start) | ja | ja, für FIND-Mitglieder | **ja** (selbst in FIND veröffentlicht) |
| `person_core` Branchen, Expertise, Ort, Remote | ja | ja (FIND/CONNECT) | **ja** |
| `must_haves` (privat) | ja | **nein** – auch nicht indirekt über Reasons | **ja, nur im Gate** |
| Capability-**Bereich**, `application_level`, `ownership_wish` | ja | unverändert nach Freigabe (`areas`, `areas_depth_on_contact` nach Kontakt) | **nur mit ausdrücklicher Matching-Zustimmung**, siehe unten |
| Capability ohne Matching-Zustimmung | ja | gemäß Freigabe | **nein** |
| CONNECT-Einträge (aktiv) | ja | ja, für Mitglieder | **ja** |
| Workstyle-Muster | ja | nur bei beidseitiger Zustimmung | **nein** (nur Erklärung) |
| `person_resources`, Evidence, Interview, Stärken, Direction | ja | Eigentümer / Freigabe | **nein** |
| Advisor-Daten, Team-only-Daten | ja | gemäß Freigabe | **nein**, außer separat freigegeben |
| Research-Daten | ja | nie | **niemals** |

**[ENTSCHIEDEN – PRODUKTENTSCHEIDUNG] Capability im Matching.**

- Capability-Bereich, `application_level` und `ownership_wish` dürfen **nur mit ausdrücklicher Zustimmung** der Person fürs Matching verwendet werden.
- **Zustimmung ≠ Sichtbarkeit.** Die Matching-Zustimmung erlaubt keine Anzeige, und eine Sichtbarkeitsfreigabe (`areas`, `areas_depth_on_contact`) erlaubt kein Matching. Beide sind getrennte Verträge, keiner folgt aus dem anderen.
- **Explainability verrät nie private Werte.** Ein Reason mit Capability-Bezug erscheint nur, wenn das Gegenüber genau diese Angabe sehen darf (Frage B). Sonst entfällt der Reason ganz. Es gibt auch keinen generischen Ersatz wie „passt bei einer Fähigkeit“.
- **Ohne Zustimmung** behandelt die Engine die Capabilities der Person als nicht vorhanden. Es gelten die Fehlwert-Regeln aus Abschnitt 13: `cap_cover` ist UNKNOWN, also `need = role_cover`, und das Feld zählt für die Confidence als fehlend. Ein Must-have `requiredCapabilityAreasAny` der Gegenseite ergibt `uncertain`, nie `ineligible` (Gate wie getestet: „Y hat keine Bereiche“). Die Person wird **nicht** ausgeschlossen. Dieser Pfad ist im synthetischen Datensatz durch Profile ohne Capabilities abgedeckt.
- Mit Zustimmung gilt die getestete volle Sicht (v03, v03b).
- **Nur funktionale Anforderung:** Es gibt in v0.1 **keine** Consent-UI und **keine** DB-Spalte. Ohne einen umgesetzten Zustimmungsvertrag darf die Produktimplementierung keine Capability-Daten ins Matching geben.
- **Synthetic/Development:** Alle synthetischen Personen gelten als zustimmend. Das ist die Annahme von v03 und v03b.

**Weitere Regeln:**

- **Reasons zeigen nur, was das Gegenüber sehen darf (B).** Matching-Verwendung (C) erlaubt keine Anzeige.
- Ein Gate-Ausschluss aufgrund **privater Suchkriterien der Gegenseite** wird dem Suchenden nie mit Inhalt begründet. Das Paar erscheint einfach nicht.
- Blockierte Personen, eigene Einträge und nicht aktive Profile sind nie Kandidaten.

## 6. Architecture

```
Kandidaten-Pool (Pool-Voraussetzungen)
   │
   ▼
1  Eligibility / Gate         → eligible | uncertain | ineligible      (keine Punkte)
   │  (ineligible: verlässt die Liste)
   ▼
2  Directional Relevance      FIND: A→B und B→A getrennt · CONNECT: Gesuch→Angebot
   ▼
3  Mutuality (nur FIND)       0,6·min + 0,4·mittel
   ▼
4  Confidence                 getrennt berechnet, verändert die Relevanz nie
   ▼
5  Explainability             Reason Codes aus konkreten Feldern
```

Verbindliche Regeln der Schichten:

- **Kein Bonus für eine erfüllte Bedingung.** Das Gate wirkt nie positiv auf die Reihenfolge.
- **Confidence ändert die Relevanz nicht**, auch nicht heimlich (kein Multiplizieren, kein Ersetzen).
- **Workstyle hat keinen Einfluss** auf Gate, Relevanz, Reihenfolge oder Confidence.
- **Freitext** wird nie roh verglichen, sondern immer über die Normalisierungsschicht (Abschnitt 12).

## 7. FIND eligibility

**Pool-Voraussetzungen** (Produktregeln, vor dem Gate):

- Das FIND-Profil des Kandidaten ist `active`.
- Beide Personen haben die Rolle `founder` (`is_current_user_discovery_founder`).
- Nicht dieselbe Person.
- Nicht blockiert.

**Gate v03 [GETESTET]** prüft für **beide Richtungen** (X stellt die Bedingung, Y muss sie erfüllen):

| Prüfung | Konflikt (`ineligible`), wenn … | UNKNOWN (`uncertain`), wenn … |
|---|---|---|
| `requiredRolesAny` | Y hat Rollen, aber keine der verlangten | Y hat keine Rollen angegeben |
| `minimumAvailabilityHoursPerWeek` | Stunden von Y < Minimum | Stunden von Y fehlen |
| `acceptedRemoteModes` | Arbeitsweise von Y bekannt, nicht `flexible` und nicht in der Liste | Arbeitsweise von Y fehlt |
| `desiredLocationRegion` (Ort) | siehe Abschnitt 7.1 | Ort von Y fehlt |
| `acceptedSearchIntents` (Founder-Intent) | Suchstand von Y bekannt und ausdrücklich nicht akzeptiert | Suchstand fehlt |
| `acceptedStartHorizons` (Start) | Start von Y bekannt und ausdrücklich nicht akzeptiert | Start fehlt |
| `requiredCapabilityAreasAny` | Y hat Bereiche, aber keinen der verlangten | Y hat keine Bereiche |
| `requiredExpertiseAny` | Y hat Expertise, aber keine normalisierte Übereinstimmung | Expertise fehlt |
| beide `onsite` | beide Orte bekannt und nicht derselbe normalisierte Ort | ein Ort fehlt |

**Ergebnis:**
- mindestens ein Konflikt → `ineligible`,
- sonst mindestens ein UNKNOWN → `uncertain`,
- sonst `eligible`.

`uncertain` bleibt in der Liste, ohne Abzug; die Unsicherheit geht in Confidence und Reasons ein.

**„Eindeutiger Founder-Intent-Konflikt“ und „inkompatibler Start“** bedeuten in v0.1 **nur** ausdrückliche Must-haves. Unterschiede bei Phase, Ziel, Suchstand oder Start ohne Must-have sind kein Ausschluss. Sie wirken über den Modulator (Abschnitt 8) und erscheinen als Unterschied in den Reasons.

**[IMPLEMENTIERUNG]** Der heutige FIND-Filter (`search_by_frame`) ist einseitig und boolesch und behandelt fehlende Werte als „passt nicht“. v0.1 braucht drei Zustände und beide Richtungen. Wie das technisch umgesetzt wird (RPC, Server, Persistenz), entscheidet die Implementierung, ohne die Fachlogik zu ändern.

### 7.1 Location / Remote

**[GETESTET]** Ein Konflikt entsteht nur, wenn **alle drei** Bedingungen gelten:

| | Bedingung |
|---|---|
| **A** | X verlangt ausdrücklich einen **konkreten** Ort (`desiredLocationRegion`, kein Platzhalter). |
| **B** | Der normalisierte Ort von Y ist **eindeutig anderswo**. Ein Platzhalter wie „DACH“, „bundesweit“ oder „remote“ erfüllt keinen konkreten Ort. |
| **C** | X ist **nicht** remote-kompatibel: `remote_mode` ist nicht `remote` oder `flexible`, und `remote` fehlt in den eigenen `acceptedRemoteModes`. |

Zusätzlich gilt: Beide `onsite` an bekannten, verschiedenen Orten → Konflikt.

| Fall | Ergebnis |
|---|---|
| X onsite, verlangt „Leipzig / Mitteldeutschland“; Y in Stuttgart | **Konflikt** |
| X verlangt „Leipzig“; Y gibt „DACH“ an | erfüllt nicht → **Konflikt**, sofern C gilt |
| beide hybrid oder flexibel an verschiedenen Orten | **kein** Konflikt |
| Ort von Y fehlt | **UNKNOWN** (`uncertain`) |
| „Stuttgart, BW“ vs. „Region Stuttgart“ | derselbe Ort nach Normalisierung, kein Konflikt |

**Ortsähnlichkeit ist nie ein Relevanzbonus.** Der Ort wirkt nur im Gate.

Die strengere Regel L1 aus v02 (hybrid/flexibel an verschiedenen Orten sperren) ist **nicht** Teil von v0.1. Sie sperrte 114 positive Paar-Richtungen und widersprach der Referenz.

## 8. FIND relevance

**[GETESTET]** Die Spezifikation übernimmt `F3_PH1_min60_DICT` aus `preregistration_v03.json`: PH1-Richtungsrelevanz, Gate v03, Normalisierung N-DICTIONARY, Gegenseitigkeit 0,6/0,4.

Diese Variante ist rechnerisch identisch mit PH1 (`posthoc_v02.score_ph1`). Sie unterscheidet sich von dieser nur durch das Gate v03 und die Normalisierung. In allen Silver-Kennzahlen ist sie identisch mit F1.

**Warum PH1 (Begründung, kein Gewinnerurteil).** PH1 wird für v0.1 als bewusste Produktstruktur gewählt, weil der Bedarf stärker bestimmen soll, ob ein Kontakt relevant ist. Belegt ist dabei:

- **Gedeckt:**
  - PH1 senkt den bekannten Asymmetriefehler deutlich: Die Seite ohne Bedarf steht synthetisch zu 62 % statt 92 % in den Top 10.
  - Silver bestätigt die Richtung: 1 statt 3 von 6 Silver-asymmetrischen Paaren stehen in der oberen Hälfte.
  - Die Richtung B → A trifft Silver besser (Spearman 0,89 statt 0,85).
- **Nicht gedeckt:** PH1 ist **nicht** besser als M7 nach der vorab festgelegten Regel. Die Silver-Gesprächsrelevanz steigt nur von 0,85 auf 0,86; verlangt war +0,03.
- **Kosten:**
  - synthetisch NDCG@10 0,78 → 0,76, excellent@10 1,00 → 0,95,
  - leichte Bevorzugung dünner Profile (Exposition 1,37-fach statt 0,86-fach).
- **[PRODUKTENTSCHEIDUNG]** Die Aussage „Made2Found will gegenseitige Relevanz höher gewichten als einseitige Angebotsbreite“ ist ein **Produktprinzip**, kein Forschungsergebnis. Die Experimente zeigen nur, dass PH1 einseitige Paare stärker zurückstuft. Ob das gewollt ist, entscheidet das Produkt.

### 8.1 Komponenten einer Richtung X → Y

**Rollen-Abdeckung**

```
role_cover(X→Y) = |seeking_roles(X) ∩ own_roles(Y)| / |seeking_roles(X)|     (UNKNOWN, wenn X keine Rolle sucht)
```

- Bedarf → Angebot. Ähnliche oder gleiche **eigene** Rollen zählen **nicht** positiv.
- Mehr eigene Rollen von Y erhöhen den Wert nur, wenn sie einen Bedarf von X treffen.

**Bereichs-Abdeckung, best match je Bedarf**

```
handover(X) = { Bereiche von X mit ownership_wish ∈ {prefer_other, prefer_external} }
cap_cover(X→Y) = Mittel über x ∈ handover(X) von coverage(Y, x)     (UNKNOWN, wenn handover(X) leer oder Y keine Capabilities)
```

`coverage(Y, x)` ist der **beste einzelne** Eintrag von Y für Bereich x. Es wird nicht über mehrere Einträge summiert, Capability-Breite bringt deshalb keinen Bonus.

| Eintrag von Y für Bereich x | Wert |
|---|---|
| `ownership_wish = own` **und** `application_level ≥ 3` | **1,0** |
| `contribute` **und** Stufe ≥ 3 | 0,6 |
| `own` **und** Stufe < 3 oder unbekannt | 0,4 |
| `contribute`, `unclear` oder leer **und** Stufe ≥ 3 | 0,3 |
| `grow_into`, `prefer_other`, `prefer_external`, sonst | **0** |
| Eintrag in **derselben Capability-Familie** (nicht `working_style`, nicht `other`) | obiger Wert × 0,5 |

**[ENTSCHIEDEN – GETESTET v03b] Familien-Halbwert bleibt.**

Die Entfernung wurde vorab festgelegt geprüft (`experiments/v03b/`, `F3_BASELINE` vs. `F3_NO_FAMILY`, nur Development).

- Silver ist neutral: Q1 ρ 0,859 → 0,864, Q2/Q3 unverändert, Gate identisch.
- Synthetic Kontrast-NDCG@10 ist nicht schlechter (0,454 → 0,466).
- Der Asymmetriegewinn von PH1 geht aber teilweise verloren: Bei konstruierten asymmetrischen Paaren landet die Seite ohne Bedarf in 0,62 → **0,77** der Fälle in den Top 10. Erlaubt waren +0,05.
- Nach der vorab festgelegten Regel wird `F3_NO_FAMILY` deshalb **nicht** übernommen.
- Der Halbwert ist eine **Ranking-Teilgutschrift**. Er macht aus keinem Familieneintrag eine Ownership-Aussage, und er erscheint in keinem Reason. Es gibt keinen Reason Code für Familien.

**Bedarf**

```
need(X→Y) = Mittel der bekannten Werte aus {role_cover, cap_cover};  beide UNKNOWN → 0
```

**Modulator** (symmetrisch für das Paar)

```
context = 1, wenn eine normalisierte Branche gleich ist; 0, wenn beide Branchen haben, aber keine gleich; sonst UNKNOWN
intent  = Mittel der bekannten Teile:
    Suchstand-Abstand  {0: 1,0 · 1: 0,6 · 2: 0,1}              (ready_now, actively_exploring, open_later)
    Start-Abstand      {0: 1,0 · 1: 1,0 · 2: 0,6 · 3: 0,2}      (now, next_3_months, next_6_months, later_or_flexible)
    Ziel-Gruppen       {0: 1,0 · 1: 0,6 · 2: 0,1}              (explore/side_project=0, profitable_business=1, venture_scale/exit_oriented=2)
    Phase              beide already_building oder beide no_idea_open_to_join: 0,5
                       eine Seite mit Idee (idea_validating/already_building), die andere ohne: 1,0
                       sonst 0,8
mod = Mittel der bekannten Werte aus {context, intent};  beide UNKNOWN → 0,5
```

**Richtungsrelevanz**

```
rel(X→Y) = need(X→Y) × (0,5 + 0,5 × mod)
```

**Was NICHT eingeht:**
- Ort und Remote (nur Gate),
- Stunden und Commitment (nur Gate bzw. Erklärung),
- Expertise-Ähnlichkeit,
- Workstyle,
- Werte und alte Scores,
- Capability-Breite,
- die Zahl eigener Rollen als solche,
- Confidence.

In A → B steckt der Bedarf von A und das Angebot von B; in B → A umgekehrt. Der Modulator ist für beide Richtungen derselbe.

## 9. FIND mutuality

**[GETESTET]**

```
mutuality = 0,6 × min(rel(A→B), rel(B→A)) + 0,4 × mittel(rel(A→B), rel(B→A))
```

Gerankt wird nach `mutuality` unter allen `eligible` und `uncertain` Kandidaten.

**Verworfen:**
- 0,75/0,25 (F2): nimmt auch der Seite mit Bedarf zu viel (synthetisch 0,88 → 0,65 in den Top 10), auf Silver ohne Gewinn.
- Arithmetische, geometrische und harmonische Mittel und Schwellen (v02): keine dieser Formen hat die Asymmetrie gelöst. Erst der Bedarf als Faktor (PH1) wirkt.

## 10. CONNECT eligibility

**Pool-Voraussetzungen und Gate:**

| Prüfung | Quelle | Ergebnis |
|---|---|---|
| Angebot `status = active` und nicht abgelaufen (`expires_at ≥ jetzt`) | v03 [GETESTET] | sonst `ineligible` |
| Profil der anbietenden Person aktiv | v03 [GETESTET] | sonst `ineligible` |
| Sichtbarkeit und Berechtigung (Mitglied; Beta: `members_only`) | Produktregel | sonst `ineligible` |
| Blockierung zwischen den Personen | Produktregel (`generate_connect_suggestions_for`) | `ineligible` |
| eigener Eintrag | Produktregel | `ineligible` |
| `suggestable = false` | Produktregel, **nur** für aktive Personen-Vorschläge | `ineligible` für Vorschläge |
| Eintrag `regional` **und** `onsite` mit konkretem Ort, Gegenseite eindeutig anderswo (Platzhalter erfüllt nicht) | v03 [GETESTET] | `ineligible` |
| derselbe Fall, Ort der Gegenseite fehlt | v03 | `uncertain` |

**Nicht im Gate:** fehlender Themenbezug. Er gehört zur Relevanz (Abschnitt 11), solange keine spätere Produktregel ihn ausdrücklich hart macht.

Das Gate hat in v03 alle Silver-Ausschlüsse wegen Ort (3) und Laufzeit (1) erkannt. Die Ausschlüsse wegen „Thema passt nicht“ (7) erfasst bewusst die Relevanz.

## 11. CONNECT relevance – C1

**[GETESTET]** Die Spezifikation übernimmt `C1_topic_required_DICT` aus `preregistration_v03.json`. C1 führt nach Experiment 3, ist aber **nicht endgültig validiert**: Es erfüllt 4 von 5 vorab festgelegten Kriterien und verfehlt das Gleichstandsziel an Rang 10.

**Inputs:**
- Gesuch S: `topics`, `title`, `summary`, `industries`, `category`.
- Angebot O: `topics`, `title`, `summary`, `industries`, `category`, dazu die `expertise` der anbietenden Person.

**Komponenten:**

```
topic_relevance    = Mittel über jedes Suchthema t von S:
                       1,0  wenn t (normalisiert) einem Thema von O entspricht
                       0,7  sonst, wenn t der Profil-Expertise der anbietenden Person entspricht
                       0    sonst
                     (S ohne Themen → 0)
text_relevance     = IDF-gewichteter Anteil der Text-Token von S (Titel + Beschreibung + Themen),
                     die in den Text-Token von O (Titel + Beschreibung + Themen) vorkommen
                     (Token gleich oder gemeinsamer Wortstamm ≥ 6 Zeichen; Mindestlänge 3)
industry_relevance = 1, wenn eine normalisierte Branche gleich ist; sonst 0 (auch wenn eine Seite keine hat)
category_relevance = 1, wenn die Kategorie gleich ist; sonst 0
```

**Formel:**

```
score = 0,55 × topic + 0,20 × text + 0,15 × industry + 0,10 × category
wenn topic = 0 und text < 0,10:   score = min(score, 0,10)
```

**Grenzen:**
- Branche allein ergibt höchstens 0,15, Kategorie allein höchstens 0,10. Ohne Themen- oder Textbezug ist bei 0,10 gedeckelt.
- Gerichtet, **ohne** Gegenseitigkeit: Die anbietende Person muss nichts suchen.
- Echte Synonyme ohne Wörterbucheintrag und ohne gemeinsamen Wortstamm erkennt C1 nicht (Stressfall C5: „Kundenakquise“ ↔ „Neukundengewinnung“).
- C1 versteht keinen Wortsinn: „Pitch“ (Sport) vs. „Investor Pitch“ unterscheidet es nur über weitere Wörter.

Die IDF-Formel aus v03 bleibt unverändert: `idf(tok) = ln((N + 1) / (df(tok) + 1))`. Ein Token, das im Korpus fehlt, erhält `ln(N + 1)`. Einzelheiten zum Korpus stehen in Abschnitt 11.2.

### 11.1 Gleichstände (Ties)

Bekannter Restfehler:

| | C0 (M7core) | C1 |
|---|---|---|
| Gleichstand an Rang 1 | 64 % | 24 % |
| identische Scores in den Top 10 (Ø) | 12,1 | 4,7 |
| Gleichstand an Rang 10 | 100 % | 82 % |

Verbindlich für v0.1:

- **Gleicher Relevanzwert heißt Gleichstand.** Der Gleichstand wird explizit erkannt und als `tie_group` ausgegeben.
- **Sekundäre Reihenfolge** (`secondary_order`, z. B. Veröffentlichung, danach eine deterministische ID) dient **nur der stabilen Anzeige**. Sie ist kein Relevanzsignal und darf weder kommuniziert noch ausgewertet werden, als wäre sie Matchingqualität.
- Kennzahlen werden immer auch pessimistisch berechnet: Bei Gleichstand stehen relevante Treffer hinten.

### 11.2 IDF-Korpus und `idf_corpus_version` [ENTSCHIEDEN – PRODUKTENTSCHEIDUNG]

- **Formel unverändert** (siehe oben). Nur der Korpus wird festgelegt.
- **Nur matching-erlaubte Daten:** Titel, Beschreibung und Themen von CONNECT-Einträgen, die zum Snapshot-Zeitpunkt fürs Matching verwendet werden dürfen (aktiv, nicht abgelaufen, Profil aktiv, Sichtbarkeit erlaubt). Entwürfe, private, gelöschte oder gesperrte Einträge sowie Research-Daten zählen nie mit.
- **Reproduzierbar:**
  - Der Korpus wird als Tabelle `N` plus `df(token)` mit der Normalisierung von `normalization_version` gebildet.
  - Gespeichert werden nur diese Zählwerte und ihr Hash, keine Texte und keine Eintrags-IDs.
  - Gleiche Tabelle → gleiche `text_relevance`.
- **Versioniert:** `idf_corpus_version` benennt genau einen Snapshot, z. B. `connect-idf-<matching_version>-<YYYYMMDD>-<hash8>`. Jede neue Tabelle bekommt eine neue Version.
- **Je Matching-Version eingefroren:**
  - Innerhalb einer `matching_version` gilt ein fester Snapshot.
  - Neue Einträge werden mit dieser Tabelle bewertet; unbekannte Tokens erhalten `ln(N + 1)`.
  - Ein neuer Snapshot ist eine bewusste, protokollierte Versionsänderung, kein stilles Nachladen.
- Die Synthetic- und Holdout-Auswertung nutzt den Datensatz-Korpus aus v03 (`idf_corpus_version = synthetic-v03-all-listings`).
- **Jedes** Ergebnis, FIND wie CONNECT, enthält `matching_version`, `normalization_version` und `idf_corpus_version`. FIND nutzt kein IDF, führt die Version aber zur Rekonstruierbarkeit mit.
- **[IMPLEMENTIERUNG]** Speicherort, Aufbewahrung und ein Mindest-`df` gegen sehr seltene, identifizierende Tokens in gespeicherten Tabellen. Solche Wahlen dürfen die Scores nicht ändern; sonst ist es eine neue `matching_version`.

## 12. Normalization

**`normalization_version = matching-normalization-v0.1`** [GETESTET als N-DICTIONARY in v03]

**Ablauf:**

```
RAW VALUE  (wird nie überschrieben, bleibt gespeichert und angezeigt)
   → generic normalization   (generic2)
   → dictionary mapping       (eingefrorenes Wörterbuch; kennen beide Begriffe einen Schlüssel, entscheidet das Wörterbuch)
   → match representation     { key (Wörterbuch-Schlüssel, falls bekannt), tokens (generic2) }
```

**Generische Schicht (`generic2`):**

- Unicode NFKC, CamelCase trennen („HealthTech“ → „health tech“), Kleinschreibung, trim.
- Umlaute ä/ö/ü/ß → ae/oe/ue/ss.
- Satzzeichen → Leerzeichen, Leerraum zusammenfassen.
- Funktionswörter DE/EN entfernen.
- Einfache Stammform (Endungen -ies, -es, -s, -en, -e, -n bei Restlänge ≥ 4).
- Vergleich: gleiche Token, Teilmenge (z. B. „MDR“ ⊂ „MDR Klasse IIb“) oder gemeinsamer Wortstamm ≥ 6 Zeichen.

**Wörterbuch** (eingefroren aus Experiment 1):
- 15 Branchenbegriffe, 25 Themenbegriffe (inkl. 5 Nischen), 10 Metropolregionen,
- Ortsplatzhalter („DACH“, „Deutschland“, „bundesweit“, „remote (DE)“, „Remote / überall“ …),
- Ortszusätze („, Germany“, „(DE)“, „BW“, „Bayern“ …).

**Orte:** Ein Platzhalter ist **kein** Ort. Er verursacht keinen Konflikt, solange niemand einen Ort verlangt, erfüllt aber keinen konkreten Ort.

**Bezugsstände** (SHA-256 aus `preregistration_v03.json`):

| Datei | SHA-256 |
|---|---|
| `experiments/normalization_v01.py` (Wörterbuch) | `44f55979f5008f0f75ec7a28222976ccea5fe7f941614af0ed6882ef1d0be7d7` |
| `experiments/v02/normalization_v02.py` (generic2) | `3e505b0dfd8d0e2a5474cea09fbd8ec184ca3e48fe6eefea1c8ea4a42b9d8c4c` |
| `experiments/v03/normalization_v03.py` (Textschicht) | `df12a15e923d6f426e1fb1f886514431383bc94de5547396c38ec28dd88c02db` |

**Bekannte generische Fehltreffer:** „Marketing“ ~ „Marketplace“ (Stamm „market“). Übersetzungen ohne Wörterbuch kann `generic2` nicht („München“ ≠ „Munich“).

**Nutzen des Wörterbuchs** (v03):
- **FIND gering:** Silver ρ 0,86 vs. 0,85; Kontrast-NDCG ohne Wörterbuch sogar leicht höher.
- **CONNECT zentral:** pessimistischer Recall@10 0,92 statt 0,55.

**Update-Prozess:**

1. **Keine Synonyme** aus Silver-, Holdout- oder Ground-Truth-Labels ableiten.
2. Neue Einträge nur aus **echten, unabhängig gesammelten Schreibweisen** (z. B. anonymisierte Häufigkeitsliste der Produkt-Freitexte). Jeder Eintrag mit Begründung und Quelle.
3. Jede Änderung erhöht `normalization_version` (z. B. `matching-normalization-v0.2`). Ergebnisse zweier Versionen sind nicht direkt vergleichbar.
4. **Regressionstests** vor jeder Version (Abschnitt 18): bekannte Gleichheiten, bekannte Ungleichheiten, Ortsplatzhalter, die Stressfälle aus v02/v03.

## 13. Missing data

**Was v03 tatsächlich verwendet:**

| Stelle | Behandlung |
|---|---|
| `role_cover`, `cap_cover` | UNKNOWN-Teile fallen aus dem Mittel heraus; ist beides UNKNOWN, ist `need` = 0 |
| `context`, `intent` | UNKNOWN-Teile fallen aus dem Mittel heraus; ist beides UNKNOWN, ist `mod` = **0,5** |
| CONNECT `industry_relevance` | fehlt eine Seite → 0 (kein Beitrag, nicht herausgerechnet) |
| Gate | UNKNOWN → `uncertain`, nie Konflikt |

**Bekannte Wirkung:**
- `mod = 0,5` bei fehlenden Werten bevorzugt dünne Profile leicht (Exposition 1,37-fach gegenüber normalen Profilen; M7: 0,86-fach).
- Das Prinzip „fehlend ist weder negativ noch positiv“ ist damit in v0.1 **nicht vollständig erfüllt**.
- Eine Korrektur (z. B. Populationsmedian statt 0,5) ist **ungetestet** und gehört nicht in v0.1 (Abschnitt 19).

**Gegenüber Nutzerinnen und Nutzern:**
- Bei wenigen Angaben **keine** künstliche Gewissheit. Ein solcher Vorschlag heißt nie „schlechter Match“.
- Erlaubt ist z. B.: „Dieser Vorschlag basiert auf wenigen Angaben.“

## 14. Confidence

Confidence beschreibt nur: **Wie viel relevante Information liegt für diese Einschätzung vor?** Sie ist keine Matchqualität, keine psychometrische Größe und nicht der Score.

**[GETESTET]**

```
FIND:    confidence = min(c(A), c(B));  c(P) = Anteil vorhandener Felder aus
         {own_roles, seeking_roles, Capabilities, industries, expertise, search_intent, start_horizon, location_region, remote_mode}
CONNECT: confidence = min(c(S), c(O));  c(L) = Anteil vorhandener Felder aus {topics, industries, locations, geographic_scope}
```

Das Capability-Feld zählt nur mit Matching-Zustimmung als vorhanden (Abschnitt 5).

**Zusätzliche Evidenzhinweise:** Gate-Zustand `uncertain` mit Gründen, z. B. „Ort unbekannt“.

**[ENTSCHIEDEN – PRODUKTENTSCHEIDUNG] Keine verbindlichen Stufen.**

- Confidence und Evidenz sind **intern** erlaubt: `score` und `evidence` im Ergebnisschema, für Tests, Monitoring und Reasons.
- Nutzerseitige Stufen (hoch/mittel/niedrig, „gute/mittlere Datenbasis“) sind **nicht** Teil von v0.1. Ein ungetestetes Schwellenmodell wird nicht festgelegt.
- Erlaubt ist ein **neutraler Hinweis**: „Dieser Vorschlag basiert auf wenigen Angaben.“ (`FIND_LIMITED_EVIDENCE`, `CONNECT_LIMITED_EVIDENCE`).
  - Er ist eine **Anzeigeregel außerhalb des Matchings**.
  - Er ändert weder Gate noch Relevanz, Reihenfolge oder `matching_version`.
  - Er wird nie als Zahl, Ampel oder Stufe gezeigt.
  - Wann er erscheint, legt die UI-Umsetzung fest. Bis dahin wird er nicht angezeigt.
- Confidence fließt **nicht** in den Score ein (wie getestet).

**Silver Q5 (Reviewer-Sicherheit) ist kein Trainingsziel.** Die Korrelation mit der Modell-Confidence ist nur beschreibend (ρ 0,52).

## 15. Explainability

Jeder Reason ist aus **konkreten Eingabefeldern** abgeleitet. Gezeigt wird nur, was das Gegenüber sehen darf (Abschnitt 5). Kein Reason wird erfunden; fehlt die Grundlage, entfällt er.

**Reason Codes FIND:**

| Code | Grundlage | Template DE | Template EN |
|---|---|---|---|
| `FIND_ROLE_NEED_COVERED` | `seeking_roles(A)` ∩ `own_roles(B)` | „Du suchst {role}; das gehört zu den Rollen von {name}.“ | "You're looking for {role}; that's one of {name}'s roles." |
| `FIND_ROLE_NEED_COVERED_REVERSE` | `seeking_roles(B)` ∩ `own_roles(A)` | „{name} sucht {role}; das gehört zu deinen angegebenen Rollen.“ | "{name} is looking for {role}; that's one of your roles." |
| `FIND_AREA_OWN_COVERED` | Handover(A) ∩ B: `own`, Stufe ≥ 3 – **nur, wenn B die Tiefe zeigen darf** | „Du möchtest {area} abgeben; {name} möchte das verantworten.“ | "You'd like to hand over {area}; {name} wants to own it." |
| `FIND_AREA_CONTRIBUTE` | Handover(A) ∩ B: `contribute`, Stufe ≥ 3 (wie oben) | „{name} kann bei {area} mitarbeiten.“ | "{name} can contribute to {area}." |
| `FIND_SAME_INDUSTRY` | normalisierte Branche gleich | „Ihr nennt beide {industry}.“ | "You both list {industry}." |
| `FIND_START_ALIGNED` | `start_horizon` gleich | „Ihr sucht beide einen Start {horizon}.“ | "You're both aiming to start {horizon}." |
| `FIND_STAGE_COMPLEMENT` | eine Seite mit Idee, eine ohne | „{name} {stage_b}; du {stage_a}.“ | "{name} {stage_b}; you {stage_a}." |
| `FIND_DIFF_START` | Start-Abstand ≥ 2 | „Euer geplanter Start unterscheidet sich ({a} / {b}).“ | "Your planned start differs ({a} / {b})." |
| `FIND_DIFF_COMMITMENT` | Commitment unterschiedlich | „Ihr plant unterschiedlich viel Zeit ein ({a} / {b}) – ein Gesprächsanlass.“ | "You plan different amounts of time ({a} / {b}) – worth discussing." |
| `FIND_DIFF_GOAL` | Ziel-Gruppen verschieden | „Eure Ziele für das Vorhaben unterscheiden sich ({a} / {b}).“ | "Your goals for the venture differ ({a} / {b})." |
| `FIND_UNKNOWN_LOCATION` | Gate `uncertain` wegen Ort | „Zu Standort oder Arbeitsweise fehlen noch Angaben.“ | "Location or way of working is still missing." |
| `FIND_LIMITED_EVIDENCE` | Anzeigeregel, Abschnitt 14 (kein Schwellenmodell) | „Dieser Vorschlag basiert auf wenigen Angaben.“ | "This suggestion is based on limited information." |

**Reason Codes CONNECT:**

| Code | Grundlage | Template DE | Template EN |
|---|---|---|---|
| `CONNECT_TOPIC_MATCH` | Suchthema = Angebotsthema | „Das Angebot nennt {offer_topic}; dein Gesuch sucht {seek_topic}.“ | "The offer mentions {offer_topic}; your request asks for {seek_topic}." |
| `CONNECT_TOPIC_VIA_EXPERTISE` | Suchthema = Profil-Expertise | „{name} nennt {topic} in der eigenen Expertise.“ | "{name} lists {topic} as expertise." |
| `CONNECT_TEXT_OVERLAP` | text_relevance ≥ 0,10 | „Titel und Beschreibung beider Einträge beziehen sich auf {terms}.“ | "Both titles and descriptions refer to {terms}." |
| `CONNECT_SAME_INDUSTRY` | Branche gleich | „Beide Einträge beziehen sich auf {industry}.“ | "Both entries relate to {industry}." |
| `CONNECT_SAME_CATEGORY` | Kategorie gleich | „Beide Einträge gehören zu {category}.“ | "Both entries are in {category}." |
| `CONNECT_REMOTE_POSSIBLE` | Angebot `remote`/`flexible` | „Das Angebot ist remote möglich.“ | "The offer is available remotely." |
| `CONNECT_UNKNOWN_LOCATION` | Gate `uncertain` | „Zum Ort fehlen Angaben.“ | "The location is not specified." |
| `CONNECT_LIMITED_EVIDENCE` | Anzeigeregel, Abschnitt 14 (kein Schwellenmodell) | „Dieser Vorschlag basiert auf wenigen Angaben.“ | "This suggestion is based on limited information." |

Die Templates liegen später in den Sprachbündeln (`web/messages/{de,en}`, Parität wird getestet). Platzhalter werden mit **Originalwerten** (`RAW VALUE`) gefüllt, nie mit normalisierten Schlüsseln.

**Workstyle als Gesprächskontext:**
- Nur nach dem Matching, nur bei beidseitiger Zustimmung (`workstyle_discovery_enabled`).
- Form wie im FIND-Vertrag: je Bereich (EVI, EXP, EL, VOICE, AMB, ORG) `SIMILAR_PATTERN`, `DISCUSSION_POINT` oder `INSUFFICIENT_DATA`.
- **Kein** Einfluss auf Gate, Relevanz, Reihenfolge oder Confidence.
- **Kein** „Workstyle-Compatibility-Score“.

**Ranking-Transparenz [ENTSCHIEDEN – PRODUKTENTSCHEIDUNG]:**
- FIND sortiert standardmäßig nach **Relevanz**. Die Reihenfolge ist **nicht versteckt**.
- Die UI erklärt, dass nach **ausdrücklichen Suchkriterien und freigegebenen Matching-Daten** sortiert wird.
- Je Vorschlag werden Reasons gezeigt, aber keine Score-Kategorien. Begriffe wie „Besonders relevant“ wirken wie eine Ampel.
- Keine Prozentwerte, kein „Founder Fit“, keine Kompatibilitäts-Sprache („passt perfekt“, „ideal für dich“, „kompatibel“).
- `published_at` wird später als Standard ersetzt. „Neueste“ kann eine optionale Sortierung werden.
- Diese Spezifikation legt **keine UI** fest. Die heutige FIND-Sortierung bleibt bis zur Produktimplementierung unverändert.

## 16. Internal result schema

Neutrales Schema, kein Code, keine Tabelle.

```jsonc
// FIND
{
  "matching_version": "matching-v0.1",
  "normalization_version": "matching-normalization-v0.1",
  "idf_corpus_version": "<Snapshot, Abschnitt 11.2 – in FIND nicht verwendet>",
  "context": "find",
  "computed_at": "<ISO-8601>",
  "input_versions": { "profile_a": "<updated_at|hash>", "profile_b": "<updated_at|hash>", "must_haves_a": "<hash>", "must_haves_b": "<hash>" },
  "subject": { "a": "<person ref>", "b": "<person ref>" },
  "eligibility": {
    "status": "eligible | uncertain | ineligible",
    "reasons": [ { "code": "GATE_HOURS", "side": "A|B|pair", "field": "minimumAvailabilityHoursPerWeek", "visible_to_viewer": false } ]
  },
  "relevance": {
    "directional_a_to_b": 0.0,
    "directional_b_to_a": 0.0,
    "mutuality": 0.0,
    "components": {
      "a_to_b": { "role_cover": null, "cap_cover": null, "need": 0.0 },
      "b_to_a": { "role_cover": null, "cap_cover": null, "need": 0.0 },
      "modulator": { "context": null, "intent": null, "intent_parts": {}, "mod": 0.5 }
    },
    "tie_group": "<id oder null>",
    "secondary_order": "<stabiler Schlüssel, nicht Relevanz>"
  },
  "confidence": { "score": 0.0, "evidence": { "a": [], "b": [], "missing": [] } },   // intern, keine Nutzerstufe
  "explanations": [ { "code": "FIND_ROLE_NEED_COVERED", "params": { "role": "<raw>" }, "audience": "a|b|both" } ],
  "workstyle_context": null
}
```

```jsonc
// CONNECT – ohne Gegenseitigkeit
{
  "matching_version": "matching-v0.1",
  "normalization_version": "matching-normalization-v0.1",
  "idf_corpus_version": "<Snapshot, Abschnitt 11.2>",
  "context": "connect",
  "computed_at": "<ISO-8601>",
  "input_versions": { "seek_listing": "<updated_at|hash>", "offer_listing": "<updated_at|hash>", "offer_profile": "<updated_at|hash>" },
  "subject": { "seek_listing": "<ref>", "offer_listing": "<ref>" },
  "eligibility": { "status": "eligible | uncertain | ineligible", "reasons": [] },
  "relevance": {
    "score": 0.0,
    "components": { "topic": 0.0, "text": 0.0, "industry": 0.0, "category": 0.0, "capped_no_topic": false },
    "tie_group": "<id oder null>",
    "secondary_order": "<z. B. published_at, dann id – nur Anzeige>"
  },
  "confidence": { "score": 0.0, "evidence": {} },   // intern, keine Nutzerstufe
  "explanations": []
}
```

`visible_to_viewer` schützt private Gate-Gründe (Abschnitt 5). Interne Scores verlassen den Server nicht als Anzeige.

## 17. Versioning

| Version | Wert | ändert sich, wenn … |
|---|---|---|
| `matching_version` | `matching-v0.1` | Gate, Komponenten, Formeln, Gewichte oder Schwellen sich ändern |
| `normalization_version` | `matching-normalization-v0.1` | das Wörterbuch oder generische Regeln sich ändern |
| `idf_corpus_version` | je Snapshot, Abschnitt 11.2; Synthetic: `synthetic-v03-all-listings` | ein neuer Korpus-Snapshot gezogen wird (in jedem Ergebnis, FIND und CONNECT) |
| `input_versions` | je Profil/Eintrag `updated_at` oder Hash | sich Eingaben ändern |
| `computed_at` | Zeitstempel | jede Berechnung |

**Rekonstruierbarkeit:** Ein gespeichertes oder geloggtes Ergebnis muss sich aus Versionen und Eingaben exakt nachrechnen lassen. Eine Persistenz-Tabelle wird hier **nicht** spezifiziert. Falls Ergebnisse gespeichert werden: nur mit Rechtsgrundlage, nicht länger als nötig, ohne private Gründe im Klartext.

## 18. Tests

Noch kein Code. Diese Tests sind vor dem Produktiveinsatz nötig.

**Unit**

| Bereich | Fälle |
|---|---|
| Rollen | Bedarf → Angebot; gleiche eigene Rollen geben keinen Bonus; mehr Rollen ohne getroffenen Bedarf ändern nichts |
| Ownership | `own` mit Stufe ≥ 3 = 1,0; `contribute` ≥ 3 = 0,6; `own` < 3 = 0,4; **`grow_into` = 0**; `prefer_*` = 0; **best match, keine Summe** |
| Capability-Breite | ein Profil mit 20 Einträgen schlägt eines mit dem einen passenden Eintrag nicht |
| Gate Stunden | Minimum unterschritten → ineligible; Stunden fehlen → uncertain |
| Gate Ort | Leipzig-onsite vs. Stuttgart → ineligible; „DACH“ vs. „Leipzig“ → ineligible (bei C); hybrid/hybrid an verschiedenen Orten → eligible; Ort fehlt → uncertain; „Stuttgart, BW“ = „Region Stuttgart“ |
| Gate beidseitig | Must-have von B schließt aus; der Grund ist für A nicht sichtbar |
| Fehlende Daten | `mod` = 0,5 nur, wenn context und intent fehlen; `need` = 0 nur, wenn beide Teile fehlen; Confidence sinkt, Relevanz bleibt unberührt |
| Normalisierung | Gleichheiten (HealthTech ~ Healthcare, MDR ⊂ MDR Klasse IIb); Ungleichheiten; bekannter Fehltreffer Marketing ~ Marketplace dokumentiert; RAW VALUE bleibt erhalten |
| CONNECT-Themenpflicht | ohne Themen- und Textbezug ≤ 0,10; Branche allein ≤ 0,15; Kategorie allein ≤ 0,10 |
| Ties | gleiche Scores → gleiche `tie_group`; `secondary_order` ändert keine Relevanz |
| Determinismus | gleiche Eingaben und Versionen → identisches Ergebnis |
| Matching-Zustimmung | ohne Zustimmung: Capabilities wie nicht vorhanden, Person bleibt Kandidat; Sichtbarkeitsfreigabe allein aktiviert kein Matching; Zustimmung allein macht nichts sichtbar |
| Familien-Halbwert | Familieneintrag gibt × 0,5; `working_style`/`other` nie; kein Familien-Reason |
| IDF-Korpus | gleicher Snapshot → gleiche `text_relevance`; nicht erlaubte Einträge fehlen im Korpus; unbekanntes Token → `ln(N+1)` |

**Regression**
- Die bekannten Stresspaare aus v01, **soweit sie nicht im Holdout liegen**: `syn-pair0003`, `0102`, `0104` (FIND) und `0206` (CONNECT).
  - `syn-pair0297` liegt in der Holdout-Stichprobe und ist **kein** Regressionstest.
  - Erwartung: 0003 zugelassen und oben; 0102 und 0104 vom Gate ausgeschlossen; 0206 auf Rang 1.
- Die CONNECT-Stressfälle aus `v02/connect_stress_v02.json` mit strengen Kriterien, **ohne C4** (Holdout). Erwartung C1: 10 von 12; C3 und C5 sind bekannte Fehlschläge.
- Exakte Reproduktion der v03-Ergebnisse für F3_DICT und C1_DICT auf dem synthetischen Datensatz.

**Fairness / Robustheit (Monitoring, keine harten Schwellen in v0.1)**

| Beobachtung | Referenz aus v03 |
|---|---|
| Exposition Generalisten / normal | 2,2–2,4 |
| Exposition Sparse / normal | PH1: 1,37 |
| Spezialistinnen in CONNECT gefunden | 5 von 5 auf Rang 1 |
| DE/EN- und Synonymvarianten | Treffer mit vs. ohne wörtliche Überschneidung |
| Ortsvarianten | keine Fehlsperre durch Schreibweise |
| fehlende Felder (25 % ohne Branche/Expertise/Ort/Remote/Suchstand/Start) | NDCG@10 0,76 → 0,73 |

**Privacy**
- Ein Test garantiert: Workstyle, Research-Items, Evidence, Interview-Antworten, Stärken, Direction, `person_resources`, Advisor- und Team-only-Daten gelangen nie in den Matcher (Eingabeschnittstelle kennt diese Felder nicht).
- Capability-Daten ohne Matching-Zustimmung gelangen nie hinein.
- Kein Reason nennt einen Capability-Bereich, eine Stufe oder einen Verantwortungswunsch, den das Gegenüber nicht sehen darf.
- Private Must-haves erscheinen nie in einem für das Gegenüber sichtbaren Reason.

## 19. Known limitations

1. **Konstruierte Referenz:** Die SYNTHETIC REFERENCE ist aus denselben strukturierten Feldern gebaut, die die Engine liest. Die absoluten Werte sind optimistisch.
2. **Silver ist keine menschliche Referenz:** Die SILVER DEVELOPMENT REFERENCE besteht aus zwei Modell-Review-Pässen. Es gibt keine unabhängigen menschlichen Labels.
3. **Keine Validierung an echten Outcomes:** Das Matching sagt **nichts** über späteren Unternehmenserfolg, Zusammenarbeit oder Teamqualität.
4. **Generalisten** erscheinen gut doppelt so oft wie normale Profile. Das hängt an der Zahl der Rollen, nicht an der Zahl der Capabilities. Ob das fachlich falsch ist, ist ungeklärt; es gibt **keinen** Abschlag.
5. **PH1 bevorzugt dünne Profile leicht** (1,37-fach) über `mod = 0,5`.
6. **PH1 ist kein bestätigter Gesamtgewinner:** Silver ρ 0,86 vs. M7 0,85; synthetisch etwas weniger excellent/NDCG.
7. **CONNECT-Gleichstände** im unteren Bereich bleiben (Rang 10: 82 %).
8. **Das Wörterbuch** bestimmt CONNECT stark. Es stammt vom Autor des synthetischen Datensatzes; die Leistung auf echten Schreibweisen ist unbekannt.
9. **Synonyme außerhalb des Wörterbuchs** fehlen (C5). Kontextbedeutung wird nicht verstanden (C4).
10. **Location ist konservativ:** Hybrid/flexibel an verschiedenen Orten wird nie gesperrt. Ob Menschen das so sehen, ist offen.
11. **Capability-Zustimmung:** Getestet ist die volle Sicht mit Zustimmung aller. Wie sich der Anteil zustimmender Personen im Produkt auswirkt, ist unbekannt; ohne Zustimmung greift der Fehlwert-Pfad (Abschnitt 5).
12. **Primärmetrik CONNECT:** Die Silver-Deckung (Q1) bestraft korrekt gesperrte Angebote. Die Frage „anzeigen“ (Q2) ist die passendere Messgröße für künftige Tests.
13. **Familien-Halbwert:** v03b zeigt, dass er die Asymmetrie stützt, aber die Generalisten-Exposition leicht erhöht (2,07 ohne vs. 2,36 mit). Er bleibt, ohne fachlich als Ownership zu gelten.

## 20. Required pre-implementation fixes

**PRE-IMPLEMENTATION BUGFIX REQUIRED** – noch nicht ändern, nur festhalten (Regel: **nur `ownership_wish == "own"` zählt als Ownership**; `grow_into` nie):

| Datei | Befund | Status |
|---|---|---|
| `web/src/features/capability/capabilityComparison.ts:88` | `CLAIMS = ["own", "grow_into"]`; über Z. 199–200 zählt `grow_into` als Anspruch | **PRE-IMPLEMENTATION BUGFIX REQUIRED** |
| `web/src/features/capability/capabilityTeamReadout.ts:117` | `CLAIMS = ["own", "grow_into"]`; über Z. 251 wird `grow_into` als Claimant gezählt | **PRE-IMPLEMENTATION BUGFIX REQUIRED** |
| `web/src/features/capability/capabilityReadout.ts:93–106` | geprüft: `grow_into` landet nie in `anchor`, also kein Ownership-Fehler. Aber `own` mit ausdrücklicher Stufe < 4 wird als `growingInto` einsortiert; damit mischt die Anzeige Erfahrung und Verantwortungswunsch. | **kein Ownership-Bugfix**; die Engine darf die Buckets nicht wiederverwenden (Achsen getrennt halten) |

Die Engine darf keine dieser Funktionen wiederverwenden. Ownership liest sie ausschließlich aus `ownership_wish == "own"`.

**Entscheidungsstand der sechs offenen Punkte**

| # | Punkt | Status | Grundlage |
|---|---|---|---|
| 1 | Capability-Matching-Freigabe | **RESOLVED** | Produktentscheidung: nur mit ausdrücklicher Zustimmung; Zustimmung ≠ Sichtbarkeit; keine UI/DB in v0.1 (Abschnitt 5) |
| 2 | Familien-Halbwert | **RESOLVED** | v03b vorab festgelegt: `F3_NO_FAMILY` scheitert am Asymmetrie-Kriterium → bleibt (Abschnitt 8.1) |
| 3 | IDF-Korpus / `idf_corpus_version` | **RESOLVED** | Produktentscheidung, Formel unverändert (Abschnitt 11.2) |
| 4 | Confidence-Stufen | **RESOLVED** | keine verbindlichen Nutzerstufen; intern erlaubt; neutraler Hinweis (Abschnitt 14) |
| 5 | Ranking-Transparenz / FIND-Sortierung | **RESOLVED** | Relevanz als Standard, offengelegt, keine Prozent-/Fit-Sprache; noch keine UI (Abschnitt 15) |
| 6 | Ownership-Bugs | **RESOLVED** (als Pflicht vor der Implementierung festgehalten, Code unverändert) | siehe Tabelle oben |

Nur Punkt 2 ändert das Verhalten gegenüber v03, und auch er nicht, weil die Änderung verworfen wurde. Die Punkte 1 und 3–6 ändern keine Formel. Die getestete Konfiguration entspricht weiter v03 F3_DICT / C1_DICT.

## 21. Holdout status

Übernommen aus `docs/research/synthetic/experiments/v03/holdout_status_v03.md`:

| | Status |
|---|---|
| Evaluations-Pipeline | **UNOPENED** |
| RP-001, RP-002 | **CONTAMINATED / EXCLUDE** – SILVER_R1-Labels wurden nach Abschluss von v03 versehentlich durch eine Whitespace-Prüfung angezeigt |
| übrige 38 Paare | **CLEAN HOLDOUT – UNOPENED** |

Bei der Erstellung dieser Spezifikation und bei v03b wurde kein Holdout-Label gelesen. Stand: **38 CLEAN / UNOPENED**.

## 22. Final research gate

> **FINAL RESEARCH GATE: Matching Engine v0.1 Spec must be frozen before clean holdout evaluation.**

Vor der einmaligen Auswertung der 38 sauberen Holdout-Paare:

1. Die offenen Punkte aus Abschnitt 20 sind entschieden (**erfüllt**, Stand v03b). Jede Entscheidung, die das Verhalten gegenüber v03 ändert, ist vorher erneut auf Development getestet und vorab festgelegt (Familien-Ablation v03b: nicht übernommen).
2. Diese Spezifikation wird mit Hash eingefroren (`matching-v0.1`, `matching-normalization-v0.1`).
3. Die Holdout-Auswertung läuft **einmal**, mit vorab festgelegten Kennzahlen, ohne RP-001/RP-002.
4. Danach wird das Ergebnis unverändert berichtet. Eine Anpassung nach Sicht auf den Holdout ergibt `matching-v0.2` und braucht neue Daten zur Prüfung.
