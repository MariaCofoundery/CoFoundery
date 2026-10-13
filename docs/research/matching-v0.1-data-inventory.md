# Matching Engine v0.1 – Dateninventur (IST-Zustand)

Stand: 13.10.2026, Branch `main` (`d6188037`). Nur gelesen: Migrationen in `supabase/migrations/` (jeweils die letzte Definition) und Code in `web/src/`. Keine Matching-Logik, keine Gewichtungen.

**Drei Befunde vorweg:**

- **Gerankt wird heute nirgends.** FIND sortiert nach Veröffentlichungsdatum. CONNECT schlägt per exaktem Wortvergleich vor und sortiert nach Aktualität. Es gibt nirgends eine Punktzahl.
- **Themen, Branchen, Expertise und Orte sind überall Freitext.** Ein kontrolliertes Vokabular gibt es nur für die 54 Capability-Bereiche und für kleine Auswahllisten.
- **Regelabweichung, nur gemeldet:** `capabilityComparison.ts:88` und `capabilityTeamReadout.ts:117` werten `grow_into` wie `own` als Anspruch (`CLAIMS = ["own", "grow_into"]`). `capabilityReadout.ts` sortiert `own` mit Stufe unter 4 als „Hineinwachsen“ ein und mischt damit Erfahrung und Verantwortungswunsch. Beides widerspricht der Regel, dass nur `own` als Ownership zählt.

---

## 1. Dateninventur

Abkürzungen:

- **F** = in FIND sichtbar oder genutzt, **C** = in CONNECT sichtbar oder genutzt.
- **Anz.** = nur Anzeige, **M** = potenziell für Matching nutzbar.
- **Pf.** = Pflicht (Pflicht = Pflicht beim Veröffentlichen).

### 1a. Person (`person_core`)

`person_core` ist der kanonische Datensatz. Name, Headline, Bio, Region, Remote-Modus, Expertise und Branchen werden per Trigger nach FIND und CONNECT kopiert.

| Feld | Typ / Werte | Pf. | F | C | Nutzung |
|---|---|---|---|---|---|
| `display_name` | text ≤80 | ≥2 Zeichen | ✓ | ✓ | Anz. |
| `headline` | text ≤160 | ≥3 Zeichen | ✓ | ✓ (Textsuche) | Anz. |
| `bio` | text ≤1200 | CONNECT ≥20, FIND nein | nur Detailseite | ✓ (Textsuche) | Anz. |
| `location_region` | Freitext ≤120 | optional | Filter: exakt, ohne Groß/klein | Filter: Teilstring | M, aber Freitext |
| `remote_mode` | onsite / hybrid / remote / flexible | optional | Filter | Filter | M |
| `expertise` | text[] ≤8, Freitext | optional | Filter: exakter Begriff | Filter + Vorschlagsbegriffe | M (Freitext) |
| `industries` | text[] ≤5, Freitext; der Lebenslauf-Import speichert *übersetzte* Labels | optional | nur Detailseite | Filter + Vorschlagsbegriffe | M (Freitext, sprachabhängig) |
| `capability_disclosure` | private / areas / areas_depth_on_contact | ✓ (Default private) | Freigabe-Schalter | Freigabe-Schalter | Freigabe |
| `photo_visible_to_members` | bool | ✓ | ✓ | – | Anz. |
| `linkedin_url` + `linkedin_visibility` | private / contacts / members / public | optional | – | ✓ | Anz. |

**`profiles`:**

- `roles` ⊂ {founder, advisor}. „founder“ ist die Zugangsvoraussetzung für FIND.
- `focus_skill` und `intention` (Werte: Suche / Partner-Match / Selbsttest / Begleiten / Teamklaerung) werden nur im Onboarding erfasst und weder in FIND noch in CONNECT genutzt.
- `experience` und `skills` (jsonb) sind Altbestand.

**Strukturiert nicht vorhanden:** persönliche Interessen außerhalb von CONNECT-Einträgen, Ziele, gewünschte Zusammenarbeit (dafür gibt es nur die CONNECT-Formate) und Sprache.

### 1b. FIND-Profil (`founder_discovery_profiles`)

Identitätsfelder sind Kopien aus `person_core`. Wertelisten gegen die Constraints geprüft.

| Feld | Werte | Pf. | Nutzung in FIND |
|---|---|---|---|
| `status` | draft / active / paused | ✓ | active = findbar |
| `own_roles` | ≤3 aus tech, product, sales, growth, marketing, operations, finance, design, strategy, research, community, other (Liste nur in der App, kein DB-Enum) | ≥1 | **Filter**; was ich biete |
| `seeking_roles` | dieselbe Liste, ≤3 | ≥1 | **kein Filter**, nur Gesprächspunkte; was ich suche |
| `own_role_other` / `seeking_role_other` | text 2–80 | nur bei „other“ | Anz. |
| `availability_hours_per_week` | 1–100 | ✓ | Filter: mindestens X |
| `availability_flexibility` | fixed / would_expand | optional | Anz. |
| `availability_condition` | text 10–200 | optional | Anz. |
| `commitment_level` | exploring / side_project / part_time / full_time / all_in | ✓ (nicht exploring) | **nur Anzeige** |
| `venture_stage` | undecided / no_idea_open_to_join / exploring_ideas / idea_validating / already_building | ≠ undecided | nur Anzeige; einziges Signal für „Vorhaben vorhanden oder offen“ |
| `venture_goal` | undecided / explore / side_project / profitable_business / venture_scale / exit_oriented | ≠ undecided | nur Anzeige |
| `search_intent` | ready_now / actively_exploring / open_later | optional | Filter |
| `start_horizon` | now / next_3_months / next_6_months / later_or_flexible | optional | Filter |
| `recent_step` | text 20–280 | optional | nur Detailseite |

### 1c. Capability (Person × Bereich)

**Vokabular:**

- **54 Bereiche in 11 Familien**, zweistufige Hierarchie.
- Familien: customer_market, product_value, strategy_business_model, technology_delivery, commercial_growth, finance_funding, operations_people, legal_governance, communication_representation, working_style, other.
- Die Code-Kommentare nennen noch 42 oder 43 Bereiche.

| Feld | Werte | Achse | F / C |
|---|---|---|---|
| `person_capability_entries.area_id` | 54 IDs, Mehrfachauswahl | Bereich (nominal) | sichtbar ab Freigabe `areas`; **einziger Capability-Filter** (FIND-Suche, gespeicherte Suchen) |
| `application_level` | 1–5 oder NULL; Tiefe ab 4 | **Erfahrung** (ordinal) | nur bei `areas_depth_on_contact` **und** angenommenem Kontakt oder gemeinsamem Team; nie filterbar |
| `ownership_wish` | **own** / contribute / grow_into / prefer_other / prefer_external / unclear oder NULL | **gewünschte Verantwortung** (nominal) | wie oben; „own“ wird nur hier gespeichert |
| `capability_areas.sourcing` | internal_only / component / depends / unclassified | Eigenschaft des **Bereichs**, nicht der Person | nur Team-Auswertungen |
| `person_capability_evidence.narrative` | Freitext 10–2000 | Beleg | nie freigegeben |
| `person_strengths` | Aussage 3–200; Herkunft; Häufigkeit selbst / gespiegelt (rarely … almost_always); von wem gespiegelt | Stärke | nur Eigentümer bzw. Advisor mit Freigabe; nicht F/C |
| `person_resources` | kind network / access / offer; label Freitext; status | Ressource | **nur Eigentümer** (Zeilensicherheit); nicht F/C |

Interview-Antworten und KI-Vorschläge sind privat. Der Lebenslauf-Import läuft nur im Browser und schreibt Labels in `expertise` und `industries`, keine Capability-Einträge.

**Vorhandene Verantwortung:** Als strukturiertes Feld gibt es sie nicht. Getrennt erfasst sind Erfahrung (`application_level`) und Wunsch (`ownership_wish`). Vereinbarte Verantwortung steht nur im Founder Setup des Teams.

### 1d. CONNECT

**Profil (`network_profiles`):**

- Kopien aus `person_core`.
- `network_roles`, 1–4 aus: founder, aspiring_founder, expert, advisor_mentor, business_angel, company_representative.
- `open_to_formats`, ≤6 aus: coffee, walk, video, call, sparring, intro.
- `network_reach` (Freitext 20–400, „wen ich kenne“) und `contact_note` (Freitext 10–300).
- `suggestable` (bool).
- `status` (draft / active / paused) und `visibility`: Die Beta erzwingt members_only.

**Einträge (`network_listings`):**

- `direction`: seeking / offering. **Das kehrt die Bedeutung aller anderen Felder um.**
- `category`: expertise / cooperation / investment / sparring / succession.
- Titel ≥5 und Zusammenfassung ≥20 Zeichen, Freitext.
- `topics` ≤8 und `industries` ≤5, Freitext.
- `locations` ≤3, Freitext.
- `geographic_scope`: regional / germany / europe / global.
- `remote_mode`, nur bei expertise, cooperation und sparring.
- `starts_on` / `ends_on`.
- `venture_stage`: exploring / idea / validation / early / growth / established. **Andere Liste als in FIND.**
- Läuft 60 Tage.
- Altbestand: `location_region`, `timeframe`.

**Probleme (`network_problems`):**

- Titel, Beschreibung 50–2000.
- `author_intent`: observation / wants_to_build / already_building.
- `topics`, `industries`, `locations`, `geographic_scope`.
- Kindtabellen: Interesse (mit Notiz), Bestätigung (Perspektive affected / professional / observed), Lösungsansätze (Freitext: Zusammenfassung, Zielgruppe, Bedarf), private Workspaces und Opportunities.

**Weitere Tabellen:**

- `network_ventures`: nur Freitext, ≤5 pro Person.
- `saved_searches`: die gesuchten Kriterien.
- `connect_suggestions`: mit gemerkten Treffern.

**Einordnung nach den vier Klassen:**

| Klasse | Felder |
|---|---|
| **A) Was biete ich** | Profil-`expertise`, `network_reach`, `network_roles`; Einträge mit *offering*; Lösungsansatz-Zusammenfassung; Venture-Rollenlabel. `person_resources` gehört fachlich hierher, ist aber nur für den Eigentümer sichtbar. |
| **B) Was suche ich** | Einträge mit *seeking* (category, topics, industries, summary); Lösungsansatz-`needs`; `saved_searches.*`; Probleme des Autors (das Matching liest sie als „was mich beschäftigt“) |
| **C) Kontext / Thema** | `industries`; Problem-Themen; `locations`, `geographic_scope`, `remote_mode`, Zeitraum; Listing-`venture_stage`; Opportunities |
| **D) Beziehung / Intent** | `open_to_formats`, `contact_note`, `suggestable`, `author_intent`, Interessens-Notiz |

### 1e. Workstyle, Werte, Venture: Einordnung für Erklärungen

| Daten | Umfang | Freigabe | Einordnung |
|---|---|---|---|
| Workstyle v0.4: EVI 5, EXP 5, EL 4, VOICE 5, AMB 4, ORG 6 Items (29 Kern-Items) | ordinal 1–5; ORG teils Zwangswahl A/B; **AMB: höher = mehr Unbehagen** | FIND: beide Seiten müssen zustimmen. FIND erhält je Bereich nur SIMILAR_PATTERN / DISCUSSION_POINT / INSUFFICIENT_DATA. | **möglicher Erklärungsfaktor.** Phase 9.1 legt fest, dass Workstyle nicht ins Ranking geht. |
| Item-Bänder und Zitate | lower / middle / upper | nur bei geteiltem Workstyle oder im Team | Erklärung, nur dort |
| `displayPosition` (Median) | nur Anzeige | – | **wahrscheinlich NICHT fürs Ranking**; der Code sagt es ausdrücklich |
| 23 Research-Items, DEC, FS | – | isoliert | **nicht fürs Produkt** |
| Werte / Basis (`founder-compatibility-v1`): decision_logic, conflict_style, commitment, risk usw. | 0–100-Scores | alte Einwilligung, inaktiv | **Altbestand, NICHT fürs Ranking** |
| Venture Alignment (42 Items: Ziele, Equity, Stunden, Runway, Grenzen) | gemischt | nur Team | **NICHT fürs Ranking**; vorhabenbezogen und privat |
| Commitment Lab, Read My Mind, Founder in the Wild | – | nur das Paar | **NICHT fürs Ranking** |
| Founder Setup (20 Themen) | – | Team | **NICHT fürs Ranking**; System of Record |
| Direction (10 Facetten, Aussagen in eigenen Worten) | Freitext + Facette | privat; für FIND gibt es keine Freigabe | **Erklärungsfaktor nur bei späterer ausdrücklicher Freigabe** (UNSICHER) |

---

## 2. Matching-Field-Matrix

A und B nutzen jeweils dieselben Felder (symmetrisch). Deshalb steht pro Zeile nur „bietet“ und „sucht“.

| Feld | bietet (A/B) | sucht (A/B) | FIND | CONNECT |
|---|---|---|---|---|
| Skill: Capability-Bereich | `area_id` | FIND-Suche: Bereiche; `saved_searches.capability_area_ids` | ✓ Filter | ✓ nur gespeicherte Suche |
| Skill: Expertise | `expertise` | FIND: Expertise-Suche; CONNECT: seeking-`topics` | ✓ Filter | ✓ Vorschläge |
| Rolle (Founder-Rolle) | `own_roles` | `seeking_roles` (kein Filter) und Rollen-Suche | ✓ | – |
| Rolle (Netzwerk) | `network_roles` | Personensuche nach Rolle | – | ✓ Filter |
| Branche | `industries` | FIND: Altfeld ohne Oberfläche; CONNECT: seeking-`industries` | nur Anzeige / Gesprächspunkt | ✓ Vorschläge |
| Thema | offering-`topics` | seeking-`topics`, Problem-`topics` | – | ✓ |
| Netzwerkzugang | `network_reach` (Freitext), `person_resources` network/access (nur Eigentümer) | – | – | nur Textsuche |
| Ressource | offering-Einträge, `person_resources` offer | seeking-Einträge, Bedarf von Lösungsansätzen | – | ✓ (Einträge) |
| Erfahrung | `application_level` (gesperrt bis Kontakt) | – | nur Anzeige | nur Anzeige |
| Zeit | `availability_hours_per_week`, flexibility | FIND-Suche: Mindeststunden | ✓ Filter | – (Einträge: Zeitraum) |
| Founder-Intent | `search_intent`, `start_horizon`, `venture_stage`, `venture_goal`, `commitment_level` | Suche über intent und horizon | teilweise Filter | `network_roles` founder / aspiring_founder; `author_intent` |
| Verantwortungswunsch | `ownership_wish` je Bereich | – (es gibt kein Feld „ich suche jemanden, der X verantwortet“) | Gesprächspunkt nach Kontakt | – |
| Workstyle | sechs Bereiche | – | nur Muster, nach beidseitiger Zustimmung | – |
| Werte | Altbestand | – | – | – |
| Region / Remote | `location_region`, `remote_mode`, `locations`, `geographic_scope` | Suchkriterien | ✓ Filter | ✓ Filter |
| Problem-Interesse | Probleme, Interessen, Bestätigungen | – | – | ✓ (Vorschläge über Problem-Themen) |

---

## 3. Datenqualität

| Feld | Freitext? | Vokabular | Mehrfach | Hierarchie | Skala | Fehlwerte | Altbestand / Dubletten |
|---|---|---|---|---|---|---|---|
| Capability-Bereich | nein | ✓ 54 | ✓ | ✓ Familie | nominal | ja | – |
| `application_level` | nein | 1–5 | pro Bereich | – | ordinal | NULL = „nicht angegeben“ *oder* „nicht freigegeben“, nicht unterscheidbar | – |
| `ownership_wish` | nein | 6 Werte | pro Bereich | – | nominal | ja | wird in 2 Modulen mit `grow_into` vermischt |
| `own_roles` / `seeking_roles` | nein (+ other) | 12 (nur App) | ✓ ≤3 | – | nominal | „other“ als Freitext | ähnelt `network_roles` und `profiles.focus_skill` |
| `expertise` | **ja** | – | ✓ ≤8 | – | nominal | ja | wird vom Lebenslauf-Import mit Bereichs-Labels gefüllt, also Dublette zu den Capability-Bereichen |
| `industries` | **ja** | nur Vorschläge (38 Begriffe), gespeichert übersetzt | ✓ ≤5 | – | nominal | ja | **sprachabhängig** |
| `topics` | **ja** | – | ✓ ≤8 | – | nominal | ja | ähnelt `expertise` |
| `location_region` / `locations` | **ja** | – | 1 bzw. ≤3 | – | nominal | ja | zwei Formen; Listing-`location_region` ist Altbestand |
| `geographic_scope` | nein | 4 Werte | – | – | ordinal | bei Einträgen ja | – |
| `remote_mode` | nein | 4 Werte | – | – | nominal (flexible = Joker) | ja | – |
| `availability_hours_per_week` | nein | 1–100 | – | – | numerisch | Pflicht | – |
| `commitment_level` | nein | 5 Werte | – | – | ordinal | Pflicht | Venture Alignment hat eigene Stundenfelder |
| `venture_stage` | nein | FIND 5 Werte, CONNECT 6 Werte | – | – | ordinal | – | **zwei unterschiedliche Listen** |
| `venture_goal`, `search_intent`, `start_horizon` | nein | 6 / 3 / 4 Werte | – | – | nominal / ordinal / ordinal | intent und horizon optional | – |
| `network_roles`, `open_to_formats` | nein | 6 / 6 Werte | ✓ | – | nominal | – | – |
| Listing `direction`, `category` | nein | 2 / 5 Werte | – | – | nominal | Pflicht | – |
| `person_resources` | Label frei, Art strukturiert | 3 Arten | ✓ | – | nominal | – | überschneidet sich mit `network_reach` und offering-Einträgen |
| Workstyle-Muster | nein | 3 Muster | 6 Bereiche | – | ordinal / A-B | INSUFFICIENT_DATA | Altbestand: `founder-compatibility-v1`, `discoveryMatch.ts` (nicht eingebunden) |

---

## 4. Kandidaten für harte Bedingungen

Nur markiert, nicht entschieden.

**Bereits heute faktisch hart:**

- FIND:
  - `status = active`
  - Rolle founder
  - nicht man selbst
  - Freigabe-Schalter (Capability-Freigabe, Workstyle-Zustimmung)
- CONNECT:
  - Status und Ablaufdatum
  - `suggestable`
  - Blockierung
  - Beta-Sichtbarkeit

**Kandidaten aus vorhandenen Feldern:**

- **Founder-Intent:** `search_intent`, `start_horizon`, `venture_stage` (z. B. no_idea_open_to_join gegenüber already_building), `venture_goal`
- **Gewünschte Rolle:** `seeking_roles` ↔ `own_roles`
- **Commitment / Zeit:** `commitment_level`, `availability_hours_per_week`
- **Standort / Remote:** `remote_mode`, `location_region`, `geographic_scope`
- **CONNECT:** `direction` (seeking ↔ offering), `category`
- **Teamstatus:** **nicht in FIND vorhanden**, siehe Lücken

---

## 5. Unterschiede FIND und CONNECT

| | FIND | CONNECT |
|---|---|---|
| Zweck | Personen als mögliche Mitgründer | konkrete Gesuche und Angebote, Probleme, Personen |
| Einheit | ein Profil pro Person | Profil plus viele Einträge, Probleme, Ventures |
| „Suche“ | private Kriterien (`must_haves`) plus öffentliche `seeking_roles` | seeking-Einträge, gespeicherte Suchen |
| Strukturierte Kernfelder | Rollen, Stunden, Commitment, Phase, Ziel, Intent, Horizont, Capability | Richtung, Kategorie, Netzwerkrollen, Formate, Zielgebiet |
| Freitext-Tags | Expertise; Branchen nur Anzeige | Expertise, Topics, Branchen sind die Basis des Matchings |
| Matching heute | Filter mit UND plus beschriftete Treffer und Gesprächspunkte; Sortierung nach `published_at` | exakter Wortvergleich, ≤3 Vorschläge pro 7 Tage, nach Aktualität; gespeicherte Suchen mit UND |
| Workstyle | Muster nach beidseitiger Zustimmung | keiner |
| `venture_stage` | 5 Werte (Person) | 6 Werte (Vorhaben) |

---

## 6. Mögliche Datenlücken (maximal 10)

**A) wirklich notwendig**

1. Kontrolliertes Vokabular und Sprachunabhängigkeit für Branchen und Themen. Heute ist beides Freitext, und Branchen werden übersetzt gespeichert.
2. Normalisierter Standort (Land, Region) statt Freitext.
3. Teamstatus in FIND: allein, im Team, wie viele Mitgründer fehlen. Ein Team existiert, wird aber nicht gezeigt.
4. Eine Freigabe, ob und welche Daten überhaupt fürs Matching verwendet werden dürfen. Das betrifft Capability-Tiefe und Verantwortungswunsch, `person_resources` und Direction; heute sind sie gesperrt bzw. nur für den Eigentümer.

**B) nützlich**

5. „Sucht“ im CONNECT-Profil. Heute läuft das nur über einzelne Einträge.
6. Gesuchte Verantwortung beim Gegenüber, also Bereich plus „soll own sein“. Heute gibt es nur gesuchte Bereiche.
7. Arbeitssprache(n) und Zeitzone.
8. Eine einheitliche Phasenliste für FIND und CONNECT.

**C) nice-to-have**

9. Erfahrungstiefe in Branchen (Branchen haben keine Stufe).
10. Problem-Interesse auf Personenebene, unabhängig von veröffentlichten Problemen.

---

## 7. Vorschlag: Schema für synthetische Profile

Nur vorhandene Felder mit echten Wertelisten; Fehlendes ist als `MISSING` markiert und bleibt in der Simulation leer bzw. wird separat geschaltet.

```yaml
person:                         # person_core
  display_name, headline, bio
  location_region: text          # Freitext, Pool realistischer Varianten inkl. Schreibvarianten
  remote_mode: onsite|hybrid|remote|flexible|null
  expertise: text[0..8]          # Freitext-Pool, bewusst mit Synonymen/Dubletten
  industries: text[0..5]         # Freitext; DE- und EN-Labels gemischt (realer Effekt)
  capability_disclosure: private|areas|areas_depth_on_contact
  roles: [founder] | [founder, advisor]
capability:                     # person_capability_entries, 0..n
  - area_id: <54 IDs>
    application_level: 1..5|null # Erfahrung
    ownership_wish: own|contribute|grow_into|prefer_other|prefer_external|unclear|null
find_profile:                   # founder_discovery_profiles, optional
  status: draft|active|paused
  own_roles: role[1..3]; seeking_roles: role[1..3]   # 12er-Liste
  availability_hours_per_week: 1..100
  availability_flexibility: fixed|would_expand|null
  commitment_level: side_project|part_time|full_time|all_in
  venture_stage: no_idea_open_to_join|exploring_ideas|idea_validating|already_building
  venture_goal: explore|side_project|profitable_business|venture_scale|exit_oriented
  search_intent: ready_now|actively_exploring|open_later|null
  start_horizon: now|next_3_months|next_6_months|later_or_flexible|null
  search_criteria:              # must_haves (privat)
    roles_any, expertise_any, location_region, remote_modes, min_hours,
    capability_areas_any(≤12), search_intents, start_horizons
  workstyle_discovery_consent: bool
connect_profile:                # network_profiles, optional
  status, network_roles: [1..4], open_to_formats: [0..6], network_reach, contact_note, suggestable
connect_listings:               # 0..n
  - direction: seeking|offering; category: expertise|cooperation|investment|sparring|succession
    title, summary, topics[0..8], industries[0..5], locations[0..3]
    geographic_scope: regional|germany|europe|global|null
    remote_mode (nur expertise/cooperation/sparring)
    venture_stage: exploring|idea|validation|early|growth|established|null
connect_problems:               # 0..n
  - author_intent: observation|wants_to_build|already_building
    topics, industries, locations, geographic_scope
person_resources: [{kind: network|access|offer, label}]   # nur Eigentümer – im Matching standardmäßig AUS
workstyle_patterns:             # nur Erklärung, nie Ranking; 6 Bereiche × SIMILAR|DISCUSSION|INSUFFICIENT, paarweise abgeleitet
MISSING (leer lassen bzw. als Szenario-Schalter):
  team_status, normalized_location, industry_vocabulary_id, working_languages,
  sought_ownership, connect_profile_seeking, matching_consent
```

Hinweis zur Simulation: Workstyle-Muster entstehen paarweise aus den Antworten. Für einen Test der Erklärungen bräuchte jedes synthetische Profil die 29 Kern-Antworten (ordinal 1–5 bzw. A/B).
