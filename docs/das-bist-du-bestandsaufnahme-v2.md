# „Das bist du" — technische Bestandsaufnahme v2

**Stand 30.09.2026, abends.** Gelesen wurde im Code und gegen die lokale
Datenbank (`supabase db reset --local`, Migrationen bis
`20261091120000_search_by_frame.sql`). Nur Ist-Zustand: kein Vorschlag, kein
Umbau, keine Übernahme aus älteren Dokumenten.

Vorgänger: `docs/das-bist-du-bestandsaufnahme.md` (Vormittag desselben Tages).
Was sich seither geändert hat, steht in §1 — der Rest dieses Dokuments ist
eigenständig lesbar und wiederholt Geprüftes lieber, als darauf zu verweisen.

Alle Pfade relativ zum Repo-Wurzelverzeichnis; alles unter `src/` liegt in
`web/`.

---

## 1. Was sich seit der Bestandsaufnahme vom Vormittag geändert hat

| # | Änderung | Wirkung |
|---|---|---|
| 1 | `person_resources` wird angezeigt — auf `/connect/profile` über `ResourceProposalSection` | Der Punkt „erhoben, nirgends angezeigt" aus v1 §9.4 stimmt nicht mehr. Er ist aber nur in **einem** Kontext eingelöst, nicht in einer Personenansicht. |
| 2 | `/founder-alignment/profil/antworten` zeigt zusätzlich eine `WorkMap` | v1 §9.2 („zeigt bewusst nur die Antworten") ist überholt: Es gibt eine Übersichtsdarstellung — ein Punkt je Antwort auf einer Achse, ohne Mittelwert. |
| 3 | FIND leitet **sechs Themen aus dem neuen ALIGN-Arbeitsprofil** ab (`discovery_theme_items`, 14 von 16 Items) | Das neue Instrument ist angebunden — an FIND. An `/me/profile` weiterhin nicht. |
| 4 | Die Advisor-Ansicht `/advisor/person/[userId]` zeigt v1-Bericht **und** neue ALIGN-Antworten inkl. `WorkMap` | Ein Advisor sieht heute ein vollständigeres Bild der Person als die Person selbst. |
| 5 | FIND hat private Themen-Präferenzen (`discovery_preference_sets`, `discovery_theme_preferences`) | Eine neue personenbezogene Datenart, ausdrücklich privat. |
| 6 | Die Suchkriterien in FIND tragen jetzt auch Suchstatus und Startzeitpunkt (`must_haves.acceptedSearchIntents/acceptedStartHorizons`) | Weiterhin privat, weiterhin in `founder_search_preferences.must_haves` als JSON. |
| 7 | Der Prozentwert `computeProfileCompletion` ist entfernt | Die offene Entscheidung 1 aus `docs/profile-consolidation-plan.md` ist entschieden: kein Vollständigkeitswert. |

Nicht geändert: `/me/profile` selbst. Die Datei ist unverändert vier Säulen
breit und liest für „Wie du arbeitest" weiter das v1-Instrument.

---

## 2. Die Seiten heute

### 2.1 Die beiden Seiten, um die es geht

| | Erfassung | Gesamtbild |
|---|---|---|
| Route | `/profile` | `/me/profile` |
| Datei | `src/app/(product)/profile/page.tsx` (780 Zeilen) | `src/app/me/profile/page.tsx` (458 Zeilen) |
| Überschrift im Produkt | „Dein Profil" | „Founderprofil" / Menü: „Gesamtbild" |
| Untertitel | „Hier steht alles über dich an einem Ort …" | — |
| Im Menü | obere Hilfsleiste, neben „Nachrichten"; zusätzlich im Kontomenü als „Profil bearbeiten" | **Align → Gesamtbild** (nur bei `hasFounder`) |
| Schreibt | ja — `person_core`, `profiles.roles`, Capability, Stärken, Freigabestufe | nein, liest nur |

Die Wörter „Über dich" und „Das bist du" kommen im Produkt heute **nicht** als
Seitentitel vor:

- `messages/de/capability.json:11` — `"bio": "Über dich"` (Feldbeschriftung)
- `messages/de/connect.json:773` — `"yours": "Das bist du"` (Connect-Eigenansicht)
- `messages/de/dashboard.json:262` — „Name, Über dich, Expertise und was du praktisch mitbringst – alles an einem Ort." (Text am Dashboard-Eingang zu `/profile`)

### 2.2 Weitere Seiten mit personenbezogenem Inhalt

| Route | Was dort steht | Schreibt |
|---|---|---|
| `/profile/interview` | Capability-Gespräch, 8 Fragen | `capability_interview_*` |
| `/profile/interview/sort` | Antworten einordnen, Modellvorschläge bestätigen | `person_capability_entries`, `capability_area_proposals` |
| `/profile/direction` | Richtungs-Gespräch, Sätze und Vorschläge | `direction_statements`, `direction_statement_proposals` |
| `/profile/compare/[userId]` | Capability-Vergleich zweier Menschen | nein |
| `/founder-alignment/profil` | ALIGN-Arbeitsprofil, 16 Items, 7 Schritte | `alignment_answers` (`founder-profile-v1`) |
| `/founder-alignment/profil/antworten` | eigene Antworten + `WorkMap` + Freigabeformular | `alignment_shares` |
| `/founder-alignment/vorhaben` | Venture-Alignment, 43 Items, 9 Abschnitte | `alignment_answers` mit `venture_id` |
| `/founder-alignment/vorhaben/antworten` | dasselbe je Vorhaben | — |
| `/me/base`, `/me/values`, `/me/report` | v1-Fragebogen, v1-Werte, v1-Einzelbericht | `assessments`, `assessment_answers` |
| `/discovery/profile` | FIND-Kontextangaben; Identität nur als Zusammenfassung mit Link auf `/profile` | `founder_discovery_profiles` |
| `/discovery/suche` | „Deine Suche" — private Kriterien und Themen-Präferenzen | `founder_search_preferences`, `discovery_preference_sets` |
| `/connect/profile` | Connect-Kontextangaben, Foto, Sichtbarkeit, **Ressourcen-Vorschläge** | `network_profiles`, `person_resources` |
| `/advisor/person/[userId]` | die Freigabe-Ansicht eines Advisors (§7.3) | Notizen |
| `/account` | Konto, Einwilligungen, Datenexport | `person_core` (Sprache), Consent |

---

## 3. Personenbezogene Datenquellen

### 3.1 Übersicht, mit Spalten wie in der Datenbank

| Tabelle | Spalten (`*` = not null) |
|---|---|
| `person_core` | `user_id*, display_name, headline, bio, location_region, remote_mode, expertise, industries, created_at*, updated_at*, capability_disclosure*, photo_visible_to_members*, onboarding_completed_at, locale, linkedin_url, linkedin_visibility*` |
| `profiles` | `id*, user_id*, display_name, focus_skill, intention, created_at*, updated_at*, roles*, avatar_id, headline, experience, skills, linkedin_url, imported_at, avatar_url` |
| `person_capability_entries` | `id*, user_id*, area_id*, application_level, ownership_wish, created_at*, updated_at*` |
| `person_capability_evidence` | `id*, entry_id*, narrative*, created_at*, updated_at*` |
| `person_strengths` | `id*, user_id*, statement*, origin*, source_turn_id, self_frequency, reflected_frequency, reflected_who, created_at*, updated_at*` |
| `person_strength_proposals` | `id*, turn_id*, statement*, evidence_quote*, status*, model, prompt_version, created_at*, decided_at` |
| `direction_statements` | `id*, user_id*, facet*, statement*, confidence*, origin*, source_turn_id, created_at*, updated_at*` |
| `direction_statement_proposals` | `id*, turn_id*, facet*, statement*, evidence_quote*, status*, model, prompt_version, created_at*, decided_at, source*` |
| `capability_area_proposals` | `id*, turn_id*, area_id*, evidence_quote*, status*, model, prompt_version, created_at*, decided_at` |
| `capability_interview_sessions` | `id*, user_id*, status*, started_at*, completed_at, kind*` |
| `capability_interview_turns` | `id*, session_id*, sort_order*, question_source*, question_id*, question_text, answer, answered_at, evidence_id, created_at*, kind*` |
| `person_resources` | `id*, user_id*, kind*, label*, origin*, status*, evidence_quote, source_table, source_id, model, prompt_version, created_at*, decided_at` |
| `founder_discovery_profiles` | `id*, user_id*, status*, display_name*, headline*, bio*, own_roles*, seeking_roles*, industries*, remote_mode*, availability_hours_per_week, commitment_level*, venture_stage*, venture_goal*, published_at, created_at*, updated_at*, expertise*, location_region, search_intent, start_horizon, own_role_other, seeking_role_other, availability_flexibility, availability_condition, recent_step` |
| `founder_search_preferences` | `id*, user_id*, priority_weights*, must_haves*, created_at*, updated_at*, include_assessment_signals*, assessment_signals_consented_at, discovery_v2_alignment_enabled*, discovery_v2_alignment_dimensions*, discovery_v2_alignment_consented_at, discovery_v2_alignment_preferences*` |
| `network_profiles` | `user_id*, display_name*, headline*, bio*, location_region, remote_mode, expertise*, industries*, network_roles*, status*, published_at, created_at*, updated_at*, photo_source, photo_avatar_id, photo_path, visibility*, public_slug*, network_reach, open_to_formats*, contact_note, suggestable*, suggestions_checked_at` |
| `person_alignment_snapshots` | `user_id*, scores*, values_profile, values_status*, values_answered*, values_total*, basis_answered*, basis_total*, base_assessment_id, created_at*, updated_at*, instrument_id*` |
| `discovery_preference_sets` / `discovery_theme_preferences` | Themen-Präferenzen für FIND, an eine Instrumentfassung gebunden |

Referenzdaten (keine Personendaten): `capability_families` (11),
`capability_areas` (54), `discovery_theme_items` (14), `instruments` (5),
`questions` (84).

### 3.2 Capability: Taxonomie und Skalen

**11 Familien, 54 Bereiche**, aus der Datenbank geladen, nicht im Code
aufgezählt. Verteilung der Faltin-Herkunftsart über die 54 Bereiche:
`internal_only` 21 · `depends` 22 · `component` 11 · `unclassified` 0.

`application_level` (1–5, nullable) — es gibt **keine 0**; „noch nichts
eingetragen" ist `null`. `DEPTH_LEVEL = 4` ist die Grenze, ab der eine Angabe
als *Tiefe* gilt.

`ownership_wish` (nullable): `own | contribute | grow_into | prefer_other |
prefer_external | unclear`.

Der tragende Satz des Modells steht im Code: **Können ist nicht Wollen.** Stufe
5 zusammen mit `prefer_other` ist ein gültiger Zustand, kein Widerspruch.

### 3.3 Instrumente

Tabelle `instruments`, fünf Zeilen:

| `id` | `status` | eingeführt |
|---|---|---|
| `founder-compatibility-v1` | **active** | 2026-02-09 |
| `founder-alignment-v2` | archived | — |
| `founder-alignment-v2-1` | archived | — |
| `founder-profile-v1` | **draft** | — |
| `venture-alignment-v1` | **draft** | — |

Im Code (`src/features/instruments/instruments.ts`) ist
`CURRENT_INSTRUMENT_ID` weiterhin `founder-compatibility-v1`. Die beiden neuen
Fassungen haben eigene Konstanten (`FOUNDER_PROFILE_INSTRUMENT_ID`,
`VENTURE_ALIGNMENT_INSTRUMENT_ID`) — absichtlich, damit nichts versehentlich
umschaltet.

**Was neuen Menschen vorgelegt wird**, entscheidet aber nicht diese Konstante,
sondern das Dashboard: Der Block mit v1-Fragebogen und v1-Werten erscheint nur,
wenn `alignState.knowsPrevious` — wer neu anfängt, sieht nur noch die
`AlignCard` mit den beiden neuen Bögen
(`src/app/(product)/dashboard/page.tsx:492`).

#### `founder-profile-v1` — 16 Items

| Abschnitt | Items | Format |
|---|---|---|
| A – Analytische Prüfung | A01 A02 | `ordinal_choice`, 5 Stufen |
| I – Nutzung von Erfahrungsintuition | I01 I02 I03 | `ordinal_choice`, 5 |
| E – Frühes Erproben | E01 E02 E03 | `ordinal_choice`, 5 |
| T/D – Unterschiede ansprechen und formulieren | T01 T02 D01 (`single_choice`), D02 (`ordinal_choice`) | 5 Optionen |
| X – Wohlbefinden bei offener Informationslage | X01 X02 X03 X04 | `ordinal_choice`, 5 |

`overallScore: false`, `dimensionScores: false` stehen in der Registratur.
Gültigkeit laut Registratur: „Relativ portabel. Gilt für die Person, nicht für
ein bestimmtes Vorhaben."

#### `venture-alignment-v1` — 43 Items

U/K 7 · S 12 · R 9 · G 3 · B 3 · W 6 · L 3. Gültigkeit laut Registratur: „Gilt
für EIN Vorhaben und einen Zeitraum. Nicht übertragbar."

Merkposten: **L01–L03 heißen „persönliche Grenzen"** und lesen sich
personenbezogen („Gibt es Entscheidungen, die für dich *grundsätzlich* nicht
infrage kommen?"), liegen aber venture-gebunden in `alignment_answers` mit
`venture_id`. Zweiter Merkposten: **Abschnitt R heißt „Ressourcen"** und meint
Zeit- und Geldzusagen für ein Vorhaben — ein anderes Ding als
`person_resources` (Netzwerk, Zugang, Angebot).

---

## 4. Die Identitätskette — und was sie tatsächlich tut

### 4.1 Vier Tabellen, ein Trigger-Geflecht

Identitätsfelder (Name, Headline, Bio, Region, Remote, Expertise, Branchen)
liegen **physisch in vier Tabellen**: `person_core`, `profiles`,
`network_profiles`, `founder_discovery_profiles`. Zusammengehalten werden sie
durch vier Trigger:

| Trigger auf | Funktion | Richtung |
|---|---|---|
| `person_core` | `propagate_person_core_to_context_rows` | Kern → `profiles`, `founder_discovery_profiles`, `network_profiles` |
| `founder_discovery_profiles` | `sync_person_core_from_discovery_profile` | FIND → Kern |
| `network_profiles` | `sync_person_core_from_connect_profile` | Connect → Kern |
| `profiles` | `sync_person_core_from_profiles` | `profiles` → Kern |

Alle benutzen `coalesce`, damit leere Werte nichts löschen. Die
Propagationsfunktion bricht bei `pg_trigger_depth() > 1` ab — das verhindert
Schleifen.

Die Formulare schreiben Identität heute **nur noch an einer Stelle**: Sowohl
`parseDiscoveryProfileFormData` (`discoveryActions.ts:123`) als auch
`connectValidation.ts:50` nehmen Name, Headline, Bio, Region, Expertise und
Branchen aus `person_core` entgegen und lesen sie nicht aus dem Formular. Die
Rück-Synchronisation ist damit ein Überbleibsel aus der Zeit, als die
Kontextformulare eigene Identitätsfelder hatten.

### 4.2 Gemessener Befund: die Bio wird beim Connect-Schreiben gekürzt

`person_core.bio` erlaubt 1200 Zeichen (`personCoreActions.ts:100`),
`founder_discovery_profiles` ebenfalls (`DISCOVERY_TEXT_LIMITS.bio = 1200`) —
**Connect kappt auf 800** (`connectValidation.ts:52`). Weil die
Rück-Synchronisation den gekürzten Wert in den Kern zurückschreibt, verliert
die kanonische Bio beim Speichern eines Connect-Profils ihre letzten 400
Zeichen.

Nachgemessen gegen die lokale Datenbank, in einer zurückgerollten Transaktion:

```
kern_vorher       | 1000
kern_nach_connect |  800
```

Der Schleifenschutz sorgt außerdem dafür, dass diese Kürzung **nicht** weiter
nach FIND propagiert: Der Kern-Trigger läuft dabei auf Tiefe 2 und bricht ab.
Nach einem Connect-Schreibvorgang stehen im Kern 800 und in FIND weiterhin
1000 Zeichen.

Das ist eine Aussage über den Ist-Zustand, kein Vorschlag. Die Konsequenz für
jede Architekturentscheidung: **Es gibt heute keine kanonische Quelle, es gibt
eine Mehrheit mit Abgleich.** Wer „eine kanonische Quelle pro Information"
verlangt, verlangt einen Umbau, keine Beschreibung.

### 4.3 Vier verschiedene Rollen-Vokabulare

| Vokabular | Werte | Ort | Bedeutung |
|---|---|---|---|
| `profiles.roles` | `founder`, `advisor` | `/profile` | Produktzugang / Navigation |
| `network_profiles.network_roles` | `founder`, `aspiring_founder`, `expert`, `advisor_mentor`, `business_angel`, `company_representative` | `/connect/profile` | wie man im Netzwerk auftritt |
| `founder_discovery_profiles.own_roles` / `seeking_roles` | 12 Werte (`tech, product, sales, growth, marketing, operations, finance, design, strategy, research, community, other`) | `/discovery/profile` | funktionaler Schwerpunkt, eigener und gesuchter |
| `person_capability_entries.ownership_wish` | 6 Werte (§3.2) | `/profile` | Verantwortungswunsch je Bereich |

Dazu die Faltin-Herkunftsart `capability_areas.sourcing`, aus der
`buildFounderProfileCoverage` die Liste „welche Rollen du abdeckst" bildet.
**Fünf Begriffe von „Rolle" im selben Produkt**, keiner davon falsch, keine
zwei deckungsgleich.

---

## 5. Was wo angezeigt wird

Zeilen sind Bausteine, Spalten Orte. `E` = bearbeitbar, `A` = angezeigt,
`–` = kommt dort nicht vor.

| Baustein | `/profile` | `/me/profile` | `/founder-alignment/*` | `/discovery/*` | `/connect/*` | Advisor |
|---|---|---|---|---|---|---|
| Identität (`person_core`) | **E** | A | – | A (Zusammenfassung) | A (Zusammenfassung) | A |
| Rollen (`profiles.roles`) | **E** | – | – | – | – | – |
| `focus_skill`, `intention` | – | – | – | – | – | – |
| Capability-Bereiche, Stufe, Wunsch | **E** | A | – | A (nur freigegeben) | A (nur freigegeben) | A |
| Capability-Belege (`evidence`) | **E** | – | – | – | – | – |
| Stärken | **E** | A | – | – | – | A |
| Richtung / Why | E (`/profile/direction`) | A | – | – | – | A |
| Ressourcen (`person_resources`) | – | – | – | – | **E** | – |
| ALIGN-Arbeitsprofil v2.2 | – | **–** | **E + A (WorkMap)** | A (nur als Themen, §6) | – | A + WorkMap |
| Venture-Alignment | – | – | **E + A** | – | – | A + WorkMap |
| v1-Selbstbericht | – | A | – | – | – | A |
| v1-Werteprofil | – | A (Teil des Berichts) | – | – | – | A |
| FIND-Kontextangaben | – | – | – | **E** | – | – |
| FIND-Suchkriterien (privat) | – | – | – | **E** (`/discovery/suche`) | – | – |
| FIND-Themen-Präferenzen (privat) | – | – | – | **E** (`/discovery/suche`) | – | – |
| Connect-Kontextangaben | – | – | – | – | **E** | – |

Die beiden Zeilen, an denen die Bestandsaufnahme hängt:

- **ALIGN-Arbeitsprofil v2.2 steht überall außer auf `/me/profile`** — auf
  seiner eigenen Antwortenseite, in der Advisor-Ansicht und, als abgeleitete
  Themen, in FIND.
- **`/me/profile` liest für dieselbe Aussage weiter v1.** Für ein Konto, das
  heute neu angelegt wird, bleibt die Säule „Wie du arbeitest" dauerhaft leer:
  Der Hinweis dort verlinkt auf `/me/base`, und `/me/base` wird neuen Konten
  nicht mehr angeboten.

---

## 6. FIND und CONNECT: gemeinsam oder kontextspezifisch

### 6.1 Aus denselben Basisdaten

Name, Headline, Bio, Region, Remote-Modus, Expertise, Branchen. Beide Kontexte
lesen sie aus `person_core` und speichern eine Kopie in ihrer eigenen Zeile
(§4). Die Kopie ist heute keine zweite Eingabe mehr, aber physisch eine zweite
Wahrheit.

Capability kommt in beiden Kontexten aus derselben Quelle und über dieselbe
Funktion: `get_disclosed_capability(p_user_id, p_context)`. Sie prüft drei
Bedingungen — Freigabestufe ∈ {`areas`, `areas_depth_on_contact`}, aktives
Kontextprofil, und für die Tiefe eine angenommene Verbindung im jeweiligen
Kontext (Intro-Anfrage, Kontaktanfrage oder gemeinsames Founder-Team).

### 6.2 Wirklich kontextspezifisch

| FIND (`founder_discovery_profiles`) | CONNECT (`network_profiles`) |
|---|---|
| `own_roles`, `seeking_roles` (+ `_other`) | `network_roles` (6 Werte) |
| `availability_hours_per_week`, `availability_flexibility`, `availability_condition` | `open_to_formats` (coffee, walk, video, call, sparring, intro) |
| `commitment_level`, `venture_stage`, `venture_goal` | `network_reach`, `contact_note` |
| `search_intent`, `start_horizon` | `visibility` (`members_only` \| `public`), `public_slug` |
| `recent_step` | `photo_source`/`photo_avatar_id`/`photo_path`, `suggestable` |
| `status ∈ {draft, active, paused}` | `status`, Vollständigkeitsprüfung als CHECK-Constraint |

Keine Entsprechung beim jeweils anderen. Eine Zusammenlegung der Kontexttabellen
gäbe es nichts zu gewinnen.

### 6.3 Privat, und zwar ausdrücklich

`founder_search_preferences` (Muss-Kriterien, Gewichte) und
`discovery_preference_sets`/`discovery_theme_preferences` (Themen-Präferenzen)
sind Suchkriterien, keine Profildaten. RLS lässt nur die eigene Zeile zu; das
beidseitige Matching bekommt nur ein Ergebnis über eine eigene enge Funktion,
nie die Auswahl selbst.

---

## 7. Sichtbarkeit je Datenart

### 7.1 Nach RLS gemessen

| Tabelle | `SELECT`-Policies | Reichweite |
|---|---|---|
| `person_core` | `person_core_select_self` | nur selbst |
| `person_capability_entries` | `…_all_self` | nur selbst — Fremdzugriff **ausschließlich** über `get_disclosed_capability` / `get_advisor_person_capability` |
| `person_capability_evidence` | `…_all_self` | nur selbst, **keine** Freigabefunktion |
| `person_strengths` | `…_select_self` | nur selbst + `get_advisor_person_strengths` |
| `direction_statements` | `…_select_self` | nur selbst + `get_advisor_person_direction` |
| `person_resources` | `…_select_own` | nur selbst, **keine** Freigabefunktion |
| `founder_search_preferences` | `…_select_owner` | nur selbst |
| `discovery_preference_sets`, `discovery_theme_preferences` | `…_own` | nur selbst |
| `alignment_answers` | `…_select_owner`, `…_select_shared` | selbst + ausdrücklich Freigegebene (`alignment_shares`, mit ausgeblendeten Blöcken) |

### 7.2 Die vier Sichtbarkeitsstufen im Produkt

1. **Nur ich** — der Normalfall für alles Personenbezogene.
2. **Für Mitglieder** — `person_core.photo_visible_to_members`,
   `linkedin_visibility = 'members'`, Connect mit `visibility = 'members_only'`,
   FIND-Profile mit `status = 'active'`.
3. **Für Kontakte** — die Tiefe der Capability
   (`capability_disclosure = 'areas_depth_on_contact'`), an eine angenommene
   Verbindung im jeweiligen Kontext gebunden.
4. **Öffentlich** — nur Connect (`visibility = 'public'`,
   `/connect/p/[publicSlug]` über `get_public_network_profile`) und
   `linkedin_visibility = 'public'`. **Auf öffentlichen Seiten erscheint
   grundsätzlich kein Bild**, auch nicht mit Zustimmung.

Der Advisor-Weg läuft daneben und getrennt: `advisor_person_grants` plus fünf
`SECURITY DEFINER`-Funktionen (`get_advisor_person_base`, `…_alignment`,
`…_capability`, `…_direction`, `…_strengths`). Es gibt **keine**
Advisor-Funktion für `person_resources` und keine für Capability-Belege.

### 7.3 Was der Advisor sieht — und die Person selbst nicht

`/advisor/person/[userId]` setzt zusammen: Basis, v1-Selbstbericht, Capability,
Stärken, Richtung, v2.1-Antworten und — über `getAdvisorAlignViews` — das neue
ALIGN-Arbeitsprofil samt `WorkMap` und Venture-Bögen.

Das ist heute die **vollständigste Personenansicht im Produkt**. Sie ist für
jemand anderen gebaut.

---

## 8. Erhoben, aber nirgends sinnvoll angezeigt

| Daten | Wo erhoben | Wo sichtbar |
|---|---|---|
| `profiles.focus_skill`, `profiles.intention` | Einstieg (`ProfileBasicsForm mode="onboarding"`) | **nirgends.** Einziger Zweck: `isCoreProfileComplete` als Weiche fürs Routing und für den Dashboard-Block. Nach dem Einstieg weder anzeigbar noch änderbar. |
| `profiles.experience`, `profiles.skills`, `profiles.headline`, `profiles.linkedin_url`, `profiles.imported_at` | LinkedIn-/CV-Import, ältere Fassungen | keine Leseseite gefunden; `person_core` trägt dieselben Aussagen |
| `person_capability_evidence.narrative` | Capability-Gespräch | nur auf `/profile` im eigenen Pflegeschritt. Bewusst nicht auf `/me/profile` („ein Profil gibt Fähigkeiten weiter, nicht die Geschichten aus dem Interview") und ohne jede Freigabefunktion |
| `capability_interview_turns.answer` | beide Gespräche | nur im Einordnungsschritt |
| `person_resources` (bestätigt) | Connect-Texte, Modellvorschläge | nur `/connect/profile`; in keiner Personenansicht, keinem Export, keiner Advisor-Sicht |
| `person_strengths.reflected_who` | Stärken-Pflege | auf beiden Seiten angezeigt |
| Venture-Antworten | `/founder-alignment/vorhaben` | nur dort und beim Advisor |

### 8.1 Der Datenexport ist unvollständiger als die Erhebung

`src/features/account/accountExport.ts` listet 16 Tabellen. **Nicht enthalten**
sind unter anderem `person_strengths`, `direction_statements`,
`person_resources`, `person_capability_evidence`, `alignment_answers`,
`discovery_theme_preferences` und `person_capability_entries`' Belege. Der
Hinweistext nennt nur die Belege als Ausnahme.

---

## 9. Was mehrfach gepflegt oder doppelt dargestellt wird

| Sache | Stellen | Zustand |
|---|---|---|
| Identität | `person_core` + 3 Kopien | eine Eingabestelle, vier Speicher, Abgleich per Trigger — mit dem Kürzungsbefund aus §4.2 |
| Headline | `person_core.headline` **und** `profiles.headline` | beide werden vom Trigger gepflegt; `profiles.headline` wird von keiner Leseseite gebraucht |
| Anzeigename | `person_core.display_name`, `profiles.display_name`, beide Kontextzeilen | vier Kopien |
| Expertise | `person_core.expertise` (Freitext) **und** `person_capability_entries` (Vokabular) | zwei verschiedene Konstrukte, in FIND als zwei Suchkriterien nebeneinander (`requiredExpertiseAny`, `requiredCapabilityAreasAny`) — sachlich getrennt, für die Person nicht offensichtlich |
| „Wie du arbeitest" | v1-Dimensionen (`/me/profile`) **und** ALIGN v2.2 (`/founder-alignment`) | zwei Instrumente, dieselbe Art Aussage, keine gemeinsame Anzeige |
| Foto | `profiles.avatar_id`/`avatar_url` (öffentlicher Bucket) **und** `network_profiles.photo_*` (privater Bucket) | zwei Verträge, bewusst nicht zusammengelegt |
| Fortschritt/Status | `person_core.onboarding_completed_at`, `capability_interview_sessions.status`, `assessments.submitted_at`, `founder_discovery_profiles.status`, `network_profiles.status` | fünf unabhängige Zustände, kein gemeinsames Fortschrittsmodell |

---

## 10. Interview- und Modell-Flows

### 10.1 Die zwei Gespräche

`INTERVIEW_KINDS = ["capability", "direction"]`
(`src/features/interviews/interviewKinds.ts`). Gemeinsame Mechanik
(`capability_interview_sessions` / `_turns` mit Spalte `kind`), getrennte
Auswertung. Jeder Leser filtert nach `kind` — eine Abfrage ohne Filter würde
das eine Gespräch verschwinden lassen, sobald das andere offen ist.

### 10.2 Was ein Vorschlag durchläuft

```
capability_interview_turns (Erzählung)
  └── *_proposals  (evidence_quote*, status, model, prompt_version, decided_at)
        └── bestätigte Zeile  (origin, source_turn_id)
```

| Vorschlagstabelle | wird zu | `origin`-Werte der Zieltabelle |
|---|---|---|
| `capability_area_proposals` | `person_capability_entries` | — (Eintrag trägt kein `origin`) |
| `person_strength_proposals` | `person_strengths` | `own_words \| confirmed_proposal \| edited_proposal` |
| `direction_statement_proposals` | `direction_statements` | dieselben drei |
| — (aus Texten) | `person_resources` | `self \| model`, dazu `status ∈ {pending, confirmed, rejected}` und `source_table`/`source_id` |

`evidence_quote` ist in allen drei Vorschlagstabellen **not null**. Eingefügt
werden Vorschläge nur über `SECURITY DEFINER`-Funktionen
(`insert_ai_capability_proposal`, `insert_ai_strength_proposal`,
`insert_ai_direction_proposal`, `insert_ai_resource_proposal`,
`insert_rule_direction_proposal`), bestätigt über `confirm_strength_proposal` /
`confirm_direction_proposal`. Verworfene bleiben stehen, damit derselbe
Vorschlag nicht wiederkommt — angezeigt werden sie nicht.

**Bis eine Person bestätigt hat, existiert ein Vorschlag für andere
Produktbereiche nicht.** Das ist heute durchgehalten: Kein Leser liest die
Vorschlagstabellen außer der Bestätigungsoberfläche.

### 10.3 Wo `origin` und `evidence_quote` heute sichtbar sind

| Ort | zeigt |
|---|---|
| `/profile/direction` (`DirectionStatements.tsx:85`) | `origin` je Satz |
| `/profile/interview/sort` | `evidence_quote` je Vorschlag |
| `/connect/profile` (`ResourceProposalSection`) | `evidence_quote` je Vorschlag |
| `/me/profile` | **nichts davon** — weder bei Stärken noch bei Richtungssätzen |

### 10.4 Modellbetrieb

`ai_jobs`, `ai_workers`, `ai_worker_heartbeats`; Verfügbarkeit über
`get_ai_availability` (`src/features/ai/aiAvailability.ts`). Beide Gespräche
haben einen geschriebenen Weg ohne Modell: Das Capability-Interview kann von
Hand eingeordnet werden, das Direction-Interview hat vorformulierte Nachfragen
(`followUpIds`) und einen Regelweg (`insert_rule_direction_proposal`).

---

## 11. Print und PDF heute

| Baustein | Datei | Was es tut |
|---|---|---|
| `PrintReportButton` | `features/reporting/PrintReportButton.tsx` | ruft `window.print()`, protokolliert ein Forschungsereignis |
| `OpenDetailsForPrint` | `features/reporting/OpenDetailsForPrint.tsx` | öffnet auf `beforeprint` alle `details[data-profile-details]`, schließt sie auf `afterprint` wieder |
| Druck-CSS | `src/app/globals.css:610-650` | `@page { margin: 16mm }`, `.no-print` aus, `.page-section`/`.card-block`/`.print-block` nicht umbrechen, `overflow: visible` unter `.report-print-root`/`.print-document-root` |
| eigene Druckroute | `/founder-alignment/workbook/print` | die einzige; Workbook, nicht Personenprofil |

Daraus folgt für den Ist-Zustand:

- **Die Unabhängigkeit vom Aufklappzustand ist gelöst** — über
  `beforeprint`, nicht über CSS, weil ein zugeklapptes `details` seinen Inhalt
  über den Browser verbirgt und keine Druckregel das zuverlässig überschreibt.
- **Es gibt genau einen Druckmodus.** Kein kurz/ausführlich, keine Auswahl,
  welche Teile mitgehen.
- **Es gibt keinen Dateinamen-Vertrag.** Der Browser benennt die Datei nach dem
  `<title>`.
- **Belege gehen heute nirgends mit**, weil sie auf `/me/profile` gar nicht
  erst stehen.
- Die Fußnote `InstrumentNote` wird mitgedruckt; die Hinweise auf fehlende
  Säulen (`MissingPillar`) und die Übersicht oben sind `no-print`.

---

## 12. Gespeichert oder abgeleitet

### 12.1 Eigene Konstrukte mit eigenem Speicher

Identität · Rollen · Capability-Einträge, -Belege, -Vorschläge · Stärken ·
Richtungssätze · Ressourcen · ALIGN-Antworten (beide Bögen) · v1-Antworten ·
FIND-Kontextangaben, -Suchkriterien, -Themen-Präferenzen ·
Connect-Kontextangaben · Gesprächsrohdaten.

### 12.2 Bei jedem Aufruf neu berechnet, nirgends gespeichert

| Ableitung | Datei |
|---|---|
| Deckungskarte je Familie, Rollenliste nach Faltin | `features/reporting/founderProfileCoverage.ts` |
| Fünf Capability-Befunde, Schwerpunktfamilie | `features/capability/capabilityReadout.ts` |
| Alle Texte des v1-Berichts | `features/reporting/content/*`, `selfReport*Content.ts` |
| Werte-Archetyp und Cluster-Werte | aus den v1-Antworten |
| `WorkMap`-Positionen | `features/instruments/align/mapRows.ts` |
| FIND-Themenabstände und -Befunde | `features/find/discoveryMatch.ts`, DB-Funktion `discovery_theme_distances` |

Einzige Zwischenspeicherung: `person_alignment_snapshots`, mit
`instrument_id`-Vorgabe `founder-compatibility-v1`.

---

## 13. Was ausdrücklich fehlen soll

Steht so im Code, an vier Stellen, mit derselben Begründung
(`me/profile/page.tsx`, `founderProfileCoverage.ts`,
`directionInterviewGuide.ts`, `AlignMaps.tsx`):

kein Gesamtwert je Person · kein Netzdiagramm · keine Typologie · keine
Erfolgsprognose · keine Kompatibilitäts-Prozentzahl · kein Abschnittsmittelwert
über Items · kein Vollständigkeitsbalken.

Der gemeinsame Grund: Ein unvalidiertes Instrument, das eine Zahl je Person
ausgibt, wird als Auswahlkriterium benutzt, sobald es existiert. Den Schaden
trägt die Person.

Dazu kommt aus der FIND-Spec §15 ein Wortverbot, das für jede neue Textebene
gilt: **inkompatibel · schlechter Match · Risiko · Problem.**

---

## 14. Offene Stellen, rein als Befund

1. `/me/profile` liest für „Wie du arbeitest" v1; neue Konten füllen v1 nicht
   mehr. Die Säule bleibt für sie dauerhaft leer, und ihr Hinweis verlinkt auf
   einen Fragebogen, den sie nicht bekommen.
2. Es gibt keine Textebene zum neuen Arbeitsprofil — nur Antworten und
   `WorkMap`. Der gesamte Textapparat von `SelfReportView` hängt an den sechs
   v1-Dimensionen.
3. Werte hängen vollständig an v1; im neuen Modell kommen sie nicht vor.
4. `person_resources` erscheint nur in Connect.
5. `focus_skill` und `intention` werden erhoben und nirgends gezeigt, steuern
   aber eine Weiche.
6. Herkunft (`origin`) und Beleg (`evidence_quote`) stehen in den Tabellen und
   auf `/me/profile` an keiner Stelle.
7. Es gibt keinen „zuletzt aktualisiert"-Zeitpunkt über alle Bausteine hinweg;
   `InstrumentNote` datiert nur den v1-Bericht.
8. Es gibt kein Statusmodell je Bereich („offen / begonnen / für jetzt fertig")
   — nur fünf unabhängige Zustandsfelder (§9).
9. Der Datenexport deckt weniger Tabellen ab, als es personenbezogene Tabellen
   gibt (§8.1).
10. Die ALIGN-Seiten tragen fest verdrahtete deutsche Texte („Testfassung",
    „Dein Arbeitsprofil steht.", „Antworten aus der neuen Fassung") statt
    `next-intl`-Schlüsseln; die englische Fassung fehlt dort.
11. Die Bio-Kürzung aus §4.2.
