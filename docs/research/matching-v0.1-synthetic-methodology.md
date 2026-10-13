# Matching Engine v0.1 – Synthetische Testpopulation: Methodik

Stand: 13.10.2026. Grundlage: [`matching-v0.1-data-inventory.md`](matching-v0.1-data-inventory.md).
Keine Matchingformel, keine Gewichtungen, keine Datenbank. Alle Daten sind vollständig synthetisch.

## 1. Zweck

Die Population soll FIND- und CONNECT-Matching später **gegen eine unabhängige Referenz** prüfbar machen. Dafür braucht es drei Dinge, die strikt getrennt bleiben:

1. **Rohprofile**, die aussehen wie heutige Made2Found-Daten – inklusive Freitext-Chaos.
2. **Eine Referenzschicht**, die sagt, was in diesen Rohdaten „eigentlich gemeint“ ist (kanonische Branche, Ort, Bedarf). Sie ist nie Teil des Produktprofils.
3. **Referenzpaare** mit Klasse, Einzeldimensionen und Begründung.

## 2. Dateien

| Datei | Inhalt | Darf eine Engine lesen? |
|---|---|---|
| `synthetic/profiles.json` | 200 Rohprofile in Produktstruktur: `person_core`, `profiles.roles`, `capability_entries`, `find_profile` (inkl. privater `must_haves`), `connect_profile`, `connect_listings`, `connect_problems`, `person_resources` | **ja** – das ist die Eingabe |
| `synthetic/workstyle_core.json` | 29 Workstyle-Kernantworten je Profil (`{scale}` bzw. `{optionId}`, `cannot_assess`) | nur für Erklärungen, **nie fürs Ranking** |
| `synthetic/reference_annotations.json` | Testannotation je Profil: Szenario, Archetyp, kanonische Branchen/Themen/Orte/Capabilities, Constraints, Cluster, Partner | **nein** – nur zur Auswertung |
| `synthetic/reference_pairs.json` | 439 Referenzpaare | **nein** – nur zur Auswertung |
| `synthetic/profiles.csv`, `synthetic/reference_pairs.csv` | flache Übersichten derselben Daten | – |

Die Trennung in eigene Dateien ist Absicht: Wer `profiles.json` lädt, bekommt keine Annotation „aus Versehen“ mit. Eine Prüfung stellt sicher, dass kein Referenzfeld (`primary_scenario`, `canonical_*`, `designed_match_cluster`, `synthetic_archetype`) im Produktprofil vorkommt.

`workstyle_core.json` und `reference_annotations.json` sind zwei Dateien mehr als im Auftrag genannt. Sie halten Workstyle und Referenzschicht physisch von den Ranking-Daten getrennt.

## 3. Populationsdesign

### 3.1 Szenarien (primäre Testrolle je Profil)

| Szenario | Anzahl | Konstruktion |
|---|---|---|
| `normal` | 110 | 14 Archetypen (Tech, AI-Research, Hardware, Product, Design, Sales/BD, Growth, Brand, Ops, People-Ops, Finance, Strategy, Domain Research, Community). 30 frei erzeugt, 80 mit **vorher festgelegter** Beziehung zu einem früheren Profil (s. 5.1); ein Teil davon nutzt nur CONNECT. |
| `complementary_cluster` | 30 | 10 Match-Cluster à 3 Personen: drei Rollen, die sich gegenseitig suchen, gleiche Branche, gleicher Suchstand, kompatibler Ort. In 3 Clustern ist eine Person deutlich weniger verfügbar (Stretch). |
| `asymmetric` | 15 | A braucht genau, was B besitzt, B findet bei A nicht, was B sucht. Gegen ein konkretes Zielprofil gebaut. |
| `constraint_conflict` | 15 | Fachlich als Ergänzung eines Zielprofils gebaut – aber genau eine harte Bedingung kollidiert (Stunden, Remote, beide nur vor Ort an verschiedenen Orten, Suchstand, Start, Pflichtrolle). |
| `sparse` | 10 | Nur Pflichtfelder: keine Bereiche, keine Branche, kein Suchstand, oft kein Ort. 6 in FIND, 4 nur CONNECT mit inhaltsleerem Eintrag. |
| `generalist` | 5 | 3 Rollen, ~14 Bereiche fast nur `contribute`/`grow_into` auf Stufe 2–3, eine einzige echte `own`-Stärke. |
| `specialist` | 5 | Nischen: MDR-Zulassung, Batteriechemie, Quantensensorik, Bodenkunde, Vergaberecht. 2 Bereiche auf Stufe 5 mit `own`, ein CONNECT-Angebot genau dazu. |
| `noise_edge` | 10 | Fachlich ergänzend zu einem Zielprofil, aber in der **anderen Sprache** und mit Synonymen/Tippfehlern erfasst. 4 davon zusätzlich mit Widersprüchen (all_in bei 6 h; onsite mit Ort „Remote / überall“; Headline „CTO“ bei Rolle marketing; „keine Idee“ trotz laufendem Unternehmen). |

Die Gruppen überlappen nicht: Jedes Profil hat genau ein `primary_scenario` in `reference_annotations.json`.

### 3.2 Realismus

- **Branchen (kanonisch, 15):** digital_health, saas_b2b, climate_energy, education, consumer, deep_tech, social_impact, marketplace, creative_media, fintech, mobility, food_agri, proptech, hr_work, manufacturing. B2B und B2C gemischt. 1–2 Branchen je Profil.
- **Rollen:** alle 12 FIND-Rollen kommen vor (tech 37, product 21, design 21, operations 17 … other 2).
- **Commitment / Stunden:** sechs plausible Bündel; Stunden passen zur Stufe (side_project 4–12 h, part_time 12–30 h, full_time 35–50 h, all_in 48–65 h). Ausnahme: der bewusste Widerspruchsfall.
- **Vorhaben:** alle vier aktiven Phasen (`no_idea_open_to_join` 35, `exploring_ideas` 57, `idea_validating` 50, `already_building` 24; inkl. Entwürfe).
- **Erfahrung:** junior / mid / senior verschiebt die `application_level`-Verteilung.
- **Ort:** 11 kanonische Regionen inkl. Wien, Zürich und „DACH/bundesweit“. Remote: hybrid 61, flexible 49, remote 48, onsite 30, leer 12.
- **Sprache:** 143 Profile DE, 57 EN.
- **Namen:** durchgängig `Vorname Synth-NNN`. Keine E-Mails, keine echten IDs (alle `syn-…`).

### 3.3 Rohdaten bilden die heutige Realität ab

`industries`, `expertise`, `topics` und `locations` sind Freitext. Jede kanonische Branche, jedes Thema und jeder Ort hat einen Pool aus deutschen, englischen und variierten Formen. Gezogen wird nach Profilsprache, mit einstellbarem Rauschanteil (normal 30 %, Noise-Profile 95 %).

Beispiele aus dem Datensatz:

- `digital_health` (in `person_core.industries`): Digital Health, Digitale Gesundheit, E-Health, Gesundheitswesen, Health Tech, MedTech – in CONNECT-Einträgen zusätzlich HealthTech, Healthcare, Helthcare (Tippfehler)
- `berlin`: Berlin, Berlin (DE), Berlin, Germany, Berlin-Brandenburg, Großraum Berlin, berlin

Insgesamt 94 verschiedene Branchen-Strings für 15 Branchen und 37 Orts-Strings für 11 Regionen (nur `person_core`). Der Lebenslauf-Import-Effekt ist nachgebildet: `expertise` enthält teils Capability-Labels („B2B-Vertrieb“, „KI / ML“).

### 3.4 Capability

- Nur die **54 realen Area-IDs** (aus den Migrationen gelesen, nicht abgeschrieben).
- `application_level` 1–5 oder `null`; `ownership_wish` aus den sechs Werten oder `null`.
- **Erfahrung und Verantwortungswunsch sind getrennte Achsen.** In der Referenzschicht gilt:
  - *covers* = `own` **und** Stufe ≥ 3,
  - *offers* = `own` oder `contribute` mit Stufe ≥ 3,
  - *hands_over* = `prefer_other` / `prefer_external`,
  - `grow_into` ist **nie** Ownership und wird separat ausgewiesen.
- Die bekannte Abweichung im Produktcode (`CLAIMS = ["own", "grow_into"]`) ist **nicht** übernommen; eine Prüfung stellt das sicher.

### 3.5 FIND

- 156 aktive FIND-Profile, 10 Entwurf/pausiert, 34 ganz ohne FIND-Profil.
- Aktive Profile erfüllen die Pflichtregeln (Rollen ≥ 1, ≤ 3; Commitment ≠ exploring; Phase/Ziel ≠ undecided).
- `must_haves` nutzen die echten Schlüssel (`requiredRolesAny`, `minimumAvailabilityHoursPerWeek`, `acceptedRemoteModes`, `desiredLocationRegion`, `acceptedSearchIntents`, `acceptedStartHorizons`, `requiredCapabilityAreasAny`, `requiredExpertiseAny`). 122 FIND-Profile haben keine.
- Auch in `must_haves` sind Ort und Expertise Freitext – inklusive Schreibvarianten.

### 3.6 CONNECT

- 127 aktive CONNECT-Profile, 346 Einträge (164 seeking, 157 offering aktiv; dazu Entwürfe, pausierte, abgeschlossene und 2 aktive, aber abgelaufene), 21 Probleme.
- Kategorien: expertise 131, sparring 103, cooperation 94, investment 18. `succession` kommt nicht vor (im Produkt als experimentell markiert).
- Produktregeln eingehalten: `remote_mode` nur bei expertise/cooperation/sparring, `venture_stage` (CONNECT-Liste) nur bei expertise/cooperation/investment, Laufzeit 60 Tage, höchstens 3 Einträge je Person, Sichtbarkeit `members_only` (Beta).
- CONNECT-Bedürfnisse weichen oft von FIND ab (Einträge werden unabhängig von den FIND-Rollen gezogen).

### 3.7 Workstyle

- Für alle 200 Profile die 29 Kernitems in der echten Form: Likert 1–5 bzw. `strong_a / lean_a / lean_b / strong_b` für ORG-03/04/07/08; 3 % `cannot_assess`.
- **Keine** Research-Items (kein DEC, FS, `-R1`).
- Erzeugt aus einem **eigenen Zufallsstrom** nach Abschluss aller Paare; keine Funktion, die Klassen oder Dimensionen bestimmt, liest diese Daten.

### 3.8 Fehlende Werte

| Feld | fehlend / leer |
|---|---|
| `location_region` | 21 |
| `remote_mode` | 12 |
| `industries` | 19 |
| `expertise` | 33 |
| keine Capability-Einträge | 10 |
| `application_level = null` | 143 von 1.247 Einträgen |
| `ownership_wish = null` | 45 von 1.247 |
| `search_intent` / `start_horizon` (FIND) | 11 / 11 |
| `availability_flexibility` | 98 |
| `recent_step` | 96 |
| ohne FIND-Profil / ohne CONNECT-Profil | 34 / 73 |

Ein fehlendes Kernfeld senkt die Datenbelastbarkeit des Profils von „hoch“ auf „mittel“. Sparse-Profile und Profile mit zwei Widersprüchen sind „niedrig“.

## 4. Referenzschicht (`reference_annotations.json`)

Je Profil:

- `primary_scenario`, `synthetic_archetype`, `designed_match_cluster`, `designed_partners`
- `canonical_industries`, `canonical_topics`, `canonical_location`
- `canonical_capabilities` (`covers_own_level3plus`, `offers_own_or_contribute_level3plus`, `hands_over`, `grow_into`)
- `canonical_own_roles`, `canonical_seeking_roles`
- `canonical_listings`, `canonical_problems`
- `known_constraints`, `conflict_kind`, `niche`, `contradictions`
- `data_completeness`, `surface_noise_level`, `locale`

Die Referenzschicht enthält auch Wahrheit, die das Produktprofil **nicht** zeigt (z. B. ein leer gelassenes Remote-Feld). Paare, deren harter Konflikt an so einem versteckten Feld hängt, sind nie „hohe“ Datenbelastbarkeit.

## 5. Referenzpaare

### 5.1 Woher die Klasse kommt

**Die Klasse wird vor dem Bau der Profile festgelegt.** Der Generator wählt zuerst die Absicht („B soll für A ein excellent_candidate sein“) und baut dann das Profil für diese Absicht: Rollen, abzugebende Bereiche, Branche, Ort, Zeitrahmen, Must-haves.

| Quelle | Paare | Was festgelegt wurde |
|---|---|---|
| `designed_normal_relation` | 56 | Beziehung eines neuen Normalprofils zu einem früheren (excellent, promising, worth, asymmetric, low, exclude) |
| `designed_cluster` | 30 | alle Paare innerhalb der 10 Cluster |
| `designed_asymmetric` | 15 | asymmetrisches Profil ↔ Zielprofil |
| `designed_constraint_conflict` | 15 | Konfliktprofil ↔ Zielprofil |
| `designed_constraint_counterpart` | 8 | dasselbe Konfliktprofil ↔ eine Person, bei der die Bedingung erfüllt ist |
| `designed_connect_listing` | 89 | Such- und Angebotseintrag eigens füreinander angelegt (passend, teilweise, ohne Bezug, ausgeschlossen) |
| `designed_specialist` | 19 | Nischenangebot ↔ passende Suche bzw. unpassende Suchen |
| `designed_sparse` | 40 | Sparse-Profil ↔ beliebige Personen |
| `designed_generalist` | 24 | Generalist ↔ Personen |
| `designed_noise` | 8 | Noise-Profil ↔ sein Zielprofil |
| `contrast_selection` | 135 | **gezielt ausgewählt**, nicht konstruiert (s. u.) |

**Kontrastpaare (30 %)** füllen Klassen auf, die sich schwer „bauen“ lassen (vor allem low_relevance und exclude zwischen unabhängigen Profilen). Sie werden aus bestehenden Profilen nach den Klassendefinitionen in 5.3 auf der **kanonischen** Ebene ausgewählt. Das ist eine kategoriale Auswahl, keine gewichtete Formel.

### 5.2 Einzeldimensionen

Jede Dimension wird getrennt auf der kanonischen Schicht beurteilt – nie auf Freitext-Strings und nie mit Workstyle:

| Dimension | Werte | Bedeutung (FIND) |
|---|---|---|
| `A_to_B_need_offer` / `B_to_A_need_offer` | strong / partial / none / unknown | Sucht A eine Rolle, die B mitbringt, **und** deckt B die Bereiche ab, die A in diesem Rollenfeld abgeben will (`offers`)? Beides = strong, eins = partial |
| `role_complementarity` | complementary / partial / overlapping / none / unknown | Rollen gegenseitig, einseitig oder gleich |
| `capability_complementarity` | strong / partial / contested / none / unknown | Abgegebene Bereiche der einen Seite durch `own` ≥ 3 der anderen gedeckt (beidseitig = strong); `contested` = beide wollen dieselben Kernbereiche verantworten |
| `context_relevance` | same_context / adjacent / unrelated / unknown | kanonische Branche gleich, benachbart (17 definierte Nachbarschaften) oder fremd |
| `commitment_feasibility` | compatible / stretch / incompatible / unknown | Abstand der Commitment-Stufen und Stundenverhältnis; „würde aufstocken“ mildert |
| `intent_compatibility` | compatible / partial / incompatible / unknown | Suchstand, Start, Zielbild; zwei laufende Vorhaben oder zwei Personen ohne Idee = partial |
| `hard_constraint_conflict` | none / soft / hard (+ Gründe) | Hart: eine **ausdrückliche** Must-have verletzt, oder beide nur vor Ort an verschiedenen Orten. Weich: vor Ort vs. remote ohne Must-have |
| `data_confidence` | high / medium / low | Minimum der beiden Profile |

In CONNECT bewerten die Dimensionen den konkreten Such- und Angebotseintrag. Rolle, Capability, Commitment und Intent sind dort `not_applicable`.

### 5.3 Klassendefinitionen und Konsistenzprüfung

Die Definitionen dienen **nur zur Konsistenzprüfung** konstruierter Paare und zur Auswahl der Kontrastpaare. Eine Konstruktion, die ihrer Absicht widerspricht (etwa „excellent“ mit harter Bedingung), wird verworfen statt umgelabelt. Im finalen Lauf wurde kein Paar verworfen.

**FIND (Mitgründung, Gegenseitigkeit nötig):**

| Klasse | Definition |
|---|---|
| excellent_candidate | beide Richtungen strong, Rollen komplementär, gleiche Branche, Zeit kompatibel, Absicht kompatibel, kein harter Konflikt |
| promising | eine Richtung strong, die andere mindestens partial; Branche gleich oder benachbart; nichts inkompatibel; nicht excellent |
| worth_exploring | beide Richtungen mindestens partial, aber nicht im Rahmen von promising (z. B. fremde Branche) |
| asymmetric | eine Richtung mindestens partial, die andere none |
| low_relevance | beide Richtungen none |
| exclude | harter Konflikt (hat Vorrang vor allem außer insufficient_data) |
| insufficient_data | Datenbelastbarkeit niedrig; ein trotzdem erkennbarer Konflikt bleibt in der Dimension sichtbar |

**CONNECT (einseitige Hilfe ist normal):**

| Klasse | Definition |
|---|---|
| excellent_candidate | Suche ↔ Angebot strong (gleiches Thema **und** gleiche Kategorie), kein harter Konflikt |
| promising | Thema passt, Kategorie oder Kontext nur teilweise |
| low_relevance | kein inhaltlicher Bezug |
| exclude | Angebot nicht aktiv/abgelaufen oder beide Einträge regional vor Ort an verschiedenen Orten |
| insufficient_data | inhaltsleerer Eintrag |

`asymmetric` und `worth_exploring` werden in CONNECT bewusst nicht vergeben.

## 6. Anti-Zirkularität

1. **Absicht vor Daten:** Die Klasse eines konstruierten Paares steht fest, bevor seine Profile existieren.
2. **Kanonisch statt Oberfläche:** Dimensionen und Konsistenz arbeiten ausschließlich auf der Referenzschicht. Eine Engine sieht nur die Rohdaten; sie kann die Referenz nicht durch String-Gleichheit „nachrechnen“.
3. **Keine Gewichte:** Nirgends werden Dimensionen zu einer Zahl verrechnet. Die Klassendefinitionen sind kategorial und nur Plausibilitätsprüfung.
4. **Workstyle ist nachweislich ohne Einfluss:**
   - Mit einem anderen Workstyle-Seed ist `reference_pairs.json` byte-identisch; nur `workstyle_core.json` ändert sich.
   - Der Anteil gleicher Workstyle-Bänder ist über alle Klassen flach (0,32–0,38).
5. **Deterministisch:** Feste Seeds; zwei Läufe mit unterschiedlichem `PYTHONHASHSEED` erzeugen identische Dateien.

**Restrisiko:** Die Kontrastpaare (30 %) folgen Definitionen, die eine Engine theoretisch nachahmen könnte. Sie sind aber auf kanonischen Daten formuliert, die die Engine nicht sieht. Eine Auswertung sollte konstruierte und ausgewählte Paare getrennt berichten (`source`).

## 7. Validierung (unabhängiges Prüfskript, Ergebnis: 0 Fehler)

Geprüft wurde unter anderem:

- **Eindeutigkeit und Synthetik:**
  - genau 200 eindeutige IDs und Namen,
  - Namen im Muster `Vorname Synth-NNN`,
  - kein `@` und keine UUID in den Profildaten.
- **Gültige Werte:** alle Enums und Längen der Produktregeln:
  - person_core, FIND (inkl. Pflichtregeln aktiver Profile, `*_other`, `availability_condition` nur mit `would_expand`),
  - CONNECT (Rollen 1–4, Formate, Textlängen, Kategorie-Abhängigkeiten, 60-Tage-Laufzeit, ≤ 3 Einträge),
  - Probleme, Ressourcen.
- **Capability:**
  - nur die 54 realen IDs, keine doppelte Area je Person,
  - `grow_into` nie in *covers*.
- **Workstyle:**
  - genau die 29 Kernitems mit gültigen Werten,
  - keine Research-Items.
- **Paare:**
  - Personen existieren, kein Selbstpaar, keine Dublette,
  - Einträge gehören der richtigen Person,
  - FIND-Paare nur zwischen aktiven FIND-Profilen,
  - Begründung vorhanden,
  - kein Workstyle in den Dimensionen.
- **Trennung:** kein Referenzfeld im Produktprofil.

## 8. Bekannte Grenzen

- **Eine Quelle der Wahrheit:** Die Referenz ist konstruiert, nicht von unabhängigen Fachleuten gelabelt. Für v0.1 genügt das; vor einer Produktentscheidung sollte eine Stichprobe von Menschen gegengelabelt werden.
- **Probleme ohne Paare:** CONNECT-Probleme (22) und `person_resources` sind in den Daten, aber nicht Gegenstand von Referenzpaaren.
- **Weniger Paare als geplant:** Konflikt-Gegenstücke sind nur 8 von 15 (die Must-haves der Konfliktprofile schließen viele aus); Noise-Paare 8 von 10.
- **Workstyle ohne Zusammenhang:** Workstyle ist absichtlich unkorreliert mit Rolle und Branche. Für Erklärungstests reicht das, für Aussagen über reale Verteilungen nicht.
- **Kein Abbild realer Anteile:** Der FIND-Anteil (156 von 200) liegt vermutlich über der Realität. Er ist für Paarabdeckung gewählt, nicht als Schätzung.
- **Reproduzierbarkeit:** Generator und Validator liegen in [`synthetic/tools/`](synthetic/tools/README.md). Ein Neulauf erzeugt alle sechs Dateien byte-identisch (SHA-256 in der README).
