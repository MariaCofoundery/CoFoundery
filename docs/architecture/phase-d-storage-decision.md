# Phase D: Storage-/Lifecycle-Audit und Entscheidung zu `assessments.module`

Gehört zu [module-architecture-v1.md](module-architecture-v1.md). Pilotmodul: **Werte & Zielkonflikte**, Instrument `venture-tradeoffs-v1`, Basis W03–W06.

Geprüft am 19.10.2026 gegen den Stand `feat/founder-profile-phase1`. Die Entscheidung steht am Ende; alles davor ist der Befund, auf dem sie beruht.

## 1. `assessments.module`

| Frage | Befund |
|---|---|
| Typ | Postgres-Enum `public.assessment_module`. Werte: `base`, `values` (v1, Legacy) sowie `founder_profile` und `venture_alignment` (`20261075100000_assessment_scope_enum.sql`). |
| Bedeutung laut DB | Spaltenkommentar (`20261075120000`): „Wozu der Fragebogen gehört: `founder_profile` (zur Person, portabel) oder `venture_alignment` (zu einem Vorhaben und einem Zeitraum)." Das ist eine **Speicherfamilie** (Person oder Vorhaben), keine Instrument-Identität. |
| Constraints auf `module` | nur `assessments_profile_has_no_venture`: `module <> 'founder_profile' OR venture_id IS NULL`. Für `venture_alignment` gibt es keine Einschränkung. |
| DB-Logik, die auf `module = 'venture_alignment'` routet | **keine.** Die Treffer im SQL sind JSON-Schlüsselnamen (`'venture_alignment', venture_data`), keine Filter. |
| DB-Logik für Vorhaben-Antworten | durchgängig **strikt nach `instrument_id = 'venture-alignment-v1'`**: `venture_visible_in_team`, die Policies `assessments_select_venture_team` / `alignment_answers_select_venture_team`, der Teamleser `get_workstyle_product_team`. |
| Web-Leser, die nach `module` filtern | nur Legacy-`base`/`values` (Alignment v1, Matching, Discovery, Workbook) und die Entwurfssuche in `draftFor` — dort **zusätzlich** nach `instrument_id`. |
| Web-Leser von Vorhaben-Antworten | alle instrumentbezogen: `INSTRUMENT_OF[scope]`, `VENTURE_ALIGNMENT_INSTRUMENT_ID`, `.in("instrument_id", [...])` (Venture-Seite, Snapshot, Report, Vergleich, Dashboard, Navigation, Advisor-Sicht, Freigabe). Der Wächtertest `everyReaderNamesItsInstrument` erzwingt das für Abfragen nach abgegebenen Bögen. |

## 2. `alignment_answers`

| Frage | Befund |
|---|---|
| Format `value_case` | in der Format-Prüfliste und mit eigener Formprüfung: `importanceA`, `importanceB` (1–5) und `path ∈ {A, B, other, unknown}`. **Ohne Änderung nutzbar.** |
| `block_id` | `^[A-Z][0-9]{2}…` (später gelockert); `W03`–`W06` passen. Kein Fremdschlüssel auf die Registry (sie liegt im Code). |
| Bindung | Primärschlüssel `(assessment_id, block_id)`; die Antwort gehört zum Assessment und damit zu dessen `instrument_id`. |
| Auslassungsgründe | bestehende Codes (`undecided`, `cannot_assess`, …); `value` und `missing_code` schließen sich aus. |

## 3. Lifecycle

| Phase | Befund |
|---|---|
| Entwurf | `assessments` mit `submitted_at IS NULL`. Policies: nur die eigene Person (`has_founder_assessment_access`). |
| Ein offener Entwurf | `assessments_one_open_draft_uidx` auf `(user_id, module, instrument_id, venture_id)` für offene Bögen. Ein eigenes Instrument bekommt damit **seinen** offenen Entwurf je Person und Vorhaben. |
| Autosave | je Antwort `upsert` auf `(assessment_id, block_id)` (App); Insert/Update/Delete-Policies nur bei offenem Bogen. |
| Abgabe | `UPDATE assessments SET submitted_at` (App: `submitScope` prüft Vollständigkeit; die DB prüft sie heute **nicht**). |
| Unveränderlich nach Abgabe | Trigger `alignment_answers_frozen_after_submit` und Policies lassen nach der Abgabe nichts mehr durch. |
| Neuer Durchlauf (`revisable`) | Nach der Abgabe darf ein neuer Entwurf entstehen (der Index gilt nur für offene Bögen). „Aktuell" ist der zuletzt abgegebene. |

## 4. Abschluss eines eigenen 4-Item-Instruments

Die Abschlussregel des Bestands steckt in `submitScope` (Registry des Scopes). Ein eigenes Instrument braucht deshalb **seine eigene Abgabe** mit seiner eigenen Registry. Die Datenbank erzwingt Vollständigkeit bisher nur für Workstyle (eigene Guards); für das neue Instrument wird sie mitgegeben (Migration, Abschnitt 6).

## 5. Bestehende Leser: läuft das Instrument irgendwo hinein?

- **Venture Alignment (Seite, Report, Snapshot, Vergleich, Advisor):** alle filtern `instrument_id = venture-alignment-v1` → nein.
- **Workstyle, Teambericht, `venture_visible_in_team`, RLS-Policies für Teamsicht:** strikt `venture-alignment-v1` bzw. Workstyle-Instrumente → nein. Ein neues Instrument ist für das Team **unsichtbar**, bis eine künftige Freigabe das ändert (Phase E).
- **Legacy-Leser (`module = base/values`):** anderer Wert → nein.
- **Wächter `guard_workstyle_assessment` / `guard_workstyle_core_answer`:** greifen nur bei Workstyle-Instrumenten; letzterer lehnt bei Nicht-Workstyle-Bögen `item_version` und `-` in der `block_id` ab — `W03` ist unbeanstandet.

## 6. Entscheidung

**B — bestehende Storage-Familie `venture_alignment` + eigene `instrument_id = venture-tradeoffs-v1`.**

Begründung nach fachlicher und technischer Korrektheit, nicht nach Bequemlichkeit:

1. **`module` ist hier Speicherfamilie, keine Routing-Semantik.** Die DB dokumentiert es so, und kein SQL-Pfad verzweigt auf den Wert. „Zu einem Vorhaben und einem Zeitraum" beschreibt das Pilotmodul genau (`person_in_venture`). Ein eigener Wert würde etwas beschreiben, das das Enum gar nicht unterscheidet.
2. **Alle Leser sind instrumentstreng.** Das neue Instrument kann in keinen Venture-, Workstyle-, Report- oder Vergleichspfad laufen, weil jeder dieser Pfade seine Instrument-ID nennt.
3. **Ein Enum-Wert ist nicht umkehrbar** (`ALTER TYPE … ADD VALUE`) und würde `AssessmentScope`, `INSTRUMENT_OF`, `REGISTRIES` und jede `Record<AssessmentScope, …>` im bestehenden Code durchziehen — ein Eingriff in laufende Assessment-Flows für einen Pilot.
4. **Isolation statt Konvention:** Weil das Risiko eines späteren Lesers, der nur nach `module` filtert, real ist, wird es **testbar festgehalten** (pgTAP: Team und Venture-Leser sehen das Instrument nicht; App-Test: kein Leser filtert `venture_alignment` ohne Instrument).

**Folge für die Migration (nur additiv):**

- Zeile in `instruments` (Fremdschlüssel von `assessments.instrument_id`), Status `draft` wie bei den übrigen Instrumenten.
- Zwei Guards, die **ausschließlich** für `venture-tradeoffs-v1` greifen und sonst sofort `NEW` zurückgeben:
  - Bogen: `module = venture_alignment`, `venture_id` gesetzt, die Person ist Mitglied dieses Vorhabens; Abgabe nur bei vollständigen W03–W06.
  - Antwort: nur `W03`–`W06`, nur Format `value_case`.
- Keine Änderung an Enum, Policies, Tabellen oder bestehenden Instrumenten. Keine Daten werden verändert.

**Nicht Teil von Phase D:** Freigabe, Readiness, Teamvergleich, `module_versions`, Änderungen an `venture-alignment-v1`.
