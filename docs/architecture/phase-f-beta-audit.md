# Phase F – Venture Alignment v2 (Beta 1): Audit und Entscheidungen

Stand: lokal umgesetzt, nicht committet. Instrument `venture-alignment-v2-beta1` – **Pretest Candidate als echte, live erprobbare Beta**, nicht die endgültige `venture-alignment-v2`.

## 1. DB-/Sharing-Audit (was wiederverwendbar war)

| Baustein | Befund | Entscheidung |
|---|---|---|
| `assessment_team_shares` (Phase E) | bindet an einen Durchlauf, eindeutig aktiv je Person, Team **und Instrument** – aber ein `CHECK instrument_id = 'venture-tradeoffs-v1'` | CHECK ersetzt durch Fremdschlüssel auf die Allowlist-Tabelle |
| Phase-E-Funktionen | Literal `'venture-tradeoffs-v1'` in Bereitschaft, Vergleich, Freigabe, Wächter | auf allgemeine Funktionen mit Instrument-Parameter umgestellt; die Phase-E-Namen bleiben als **schmale Hüllen** (keine zweite Logik) |
| `alignment_answers.block_id` | `CHECK '^[A-Z][0-9]{2}([a-z]\|_[a-z]+)?$'` – die Spezifikations-IDs (`ZB01` …) passen nicht | gespeicherte IDs `Z01` … `N01`, `M01p`/`M02p`; die Spec-ID steht im Registry-Hinweis (`BETA_SPEC_IDS`) |
| RLS auf Antworten/Durchläufen | kein Team-/Advisor-Pfad für fremde Instrumente (v1 hat eigene Policies strikt auf `venture-alignment-v1`) | unverändert – die Beta ist für Team und Advisor unsichtbar; gelesen wird nur über die Vergleichsfunktion |
| `alignment_shares` (gerichtet) | Eigentümer kann jeden abgegebenen Durchlauf selbst an jede Person freigeben | der Wächter aus Phase E gilt jetzt für **jedes** Instrument der Allowlist |
| Waechter (Phase D) | instrumentgebunden mit Literalen | für die Beta ein **allgemeiner** Wächter aus der Tabelle (`generic_guard`); Tradeoffs behält den eigenen |

## 2. Entscheidung: Phase-E-Verallgemeinerung (kleinstmöglich)

Eine kleine Tabelle `assessment_share_instruments` – nur, was die DB braucht: `instrument_id` (PK), `share_family`, `comparison_family`, `generic_guard`, `required_block_ids`, `allowed_block_ids`, `team_visible_block_ids`. Keine Versionsplattform, keine JSONB-Plattform, keine Spiegelung der TypeScript-Registry. Vergleichbar ist weiterhin **nur die exakt gleiche Instrument-ID** (`venture-alignment-v2-beta1` nur mit sich selbst, `venture-tradeoffs-v1` nur mit sich selbst). Ein Test hält die Listen gegen die TypeScript-Registry zusammen.

Die zuvor beschlossene Eindeutigkeit „je Person, Team und Instrument" und die Semantik „der **aktive Share** bestimmt den Team-Stand" gelten unverändert.

## 3. Private Felder: Allowlist, kein Fallback

`get_assessment_team_comparison` liefert ausschließlich Blöcke aus `team_visible_block_ids`. `M01p` (Betrag Lebensunterhalt) und `M02p` (exakter Betrag) stehen nur in `allowed_block_ids` – speicherbar und in der eigenen Sicht lesbar, nie im Team-Lesepfad, nie im Vergleich, nie in einem JSON-Fallback. pgTAP prüft das gegen die echte Funktion (kein Betrag, kein Blockname im Ergebnis).

## 4. Beta-Gate

`VENTURE_ALIGNMENT_V2_BETA` (Server-Umgebungsvariable, wie `BETA_ACCESS_CODES`): leer/`off` = aus (Standard); `all` = alle Angemeldeten; sonst eine Liste von E-Mails oder Nutzer-IDs. Das Gate steuert nur die **Sichtbarkeit** (Seiten → 404, Karten, Aktionen); die Daten liegen unter denselben Regeln wie jede Antwort. Es gibt keinen stillen Wechsel von v1.

Für den Live-Test auf Vercel: Variable in der Vercel-Umgebung setzen (z. B. auf die eigene E-Mail oder `all` im Preview).

## 5. v1-Übernahme

Nur sechs wirklich identische Items: `E01←U01`, `E02←G01`, `C01←R01`, `C02←R02`, `C04←R09`, `F02←S03`. Die Identität (Wortlaut, Hinweis, Optionen mit Eigenschaften in Reihenfolge, Format, Einheit, Limit, Auslassungsgründe) wird beim Laden maschinell geprüft; `ZC03` (zweite exklusive Option), `EN03` („Keine davon"), `RO01` (Limit 2) und `GR02` (Beta = Variante B) qualifizieren nicht. Übernommen wird nie automatisch, sondern nur auf ausdrückliche Aktion, in einen neuen Entwurf; die Beta wird neu bestätigt und abgegeben.

## 6. Weiteres

- **Mehrere exklusive Optionen:** die Antwortprüfung (`exclusiveOptionsOf`), das Eingabefeld und die Registry-Prüfung erlauben jetzt mehrere ausschließende Optionen (bisher eine) – für `C03` und `E03`.
- **Vergleichsregeln:** alle Schwellen stehen an einer Stelle (`ventureBeta/compareConfig.ts`) und sind Beta-Hypothesen. Unklare Fälle sind `conversation_only`.
- **Advisor:** nicht erweitert; kein Advisor-Pfad liest die Beta.
- **Nicht Teil von Phase F:** `module_versions`, Advisor-Sharing, FIND/CONNECT, VA v2 als endgültiges Instrument, Setup-Automatik.
