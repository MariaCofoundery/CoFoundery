# Phase E – Sharing-/DB-Audit und Entscheidungen

Stand: Phase E, lokal umgesetzt, nicht committet. Betrifft ausschließlich das erste optionale Modul `venture_tradeoffs` (`venture-tradeoffs-v1`). Bestehende Core-Sharing-Verträge werden **nicht** verändert.

## 1. Audit: was es gibt und was davon passt

| Baustein | Was es tut | Passt für Phase E? |
|---|---|---|
| `team_shares` (11.7B) | Eine Freigabe je Person und Team (`scope = workstyle_capability`), gilt für aktuelle **und später beitretende** Mitglieder; Austritt widerruft sie | **Nein.** Bindet nicht an einen Durchlauf, sondern an eine Person und ein Paket. „Neuer Durchlauf ≠ alter Durchlauf" ließe sich nicht ausdrücken, und der Scope-Check erlaubt nur ein Paket. Ein zweiter Scope würde den Core-Vertrag berühren. |
| `alignment_shares` (11.6) | Gerichtete Freigabe je Durchlauf und **Empfänger** (auch Advisors); Leserechte über `alignment_answers_select_shared` | **Nein als Mechanismus** (gerichtet, kein gemeinsamer Bericht, kein Bereitschaftsbegriff). **Aber ein Risiko:** Die Insert-Policy erlaubt dem Eigentümer, jeden abgegebenen Durchlauf selbst an jede Person freizugeben – auch ein `venture-tradeoffs-v1`-Durchlauf würde damit für Empfänger (auch einen Advisor) lesbar, ohne Bereitschaft und Widerrufsvertrag. → siehe 3. |
| `venture_visible_in_team` | „Abgeben = mit dem Team teilen" für `venture-alignment-v1` | Nein, und das ist Absicht: strikt auf `venture-alignment-v1` gefiltert. Genau deshalb ist das neue Instrument für das Team unsichtbar (Phase-D-pgTAP). |
| `get_workstyle_team_share_readiness` | Bereitschaft des Arbeitsprofils; **liefert Namen und je Person Status** | Als Muster ja (security definer, Mitgliedschaft, 2–4, leerer `search_path`), als Schema nein: Phase E verbietet Namen/Per-Person-Status. |
| `get_workstyle_product_team` | Teambericht erst bei Gegenseitigkeit; sonst `not_ready` | Muster für „kein Teilbericht". |
| `is_current_user_founder_team_member`, `founder_team_members` | Mitgliedschaft = Zeile in `founder_team_members`; Austritt löscht die Zeile (`leave_founder_team`) | Übernommen. Roster-Wechsel werden nicht „erkannt", sondern bei jeder Frage neu gelesen. |
| Advisor-Grants | `advisor_person_grants`, Team-/Setup-Grants; Lesen über eigene RPCs | Nicht berührt: die neuen RPCs verlangen aktuelle Mitgliedschaft; ein Advisor-Grant gilt dafür nicht. |
| Assessment-RLS | Eigentümer; `venture-alignment-v1` im Team; gerichtete Freigaben | Es gibt **keine** Policy, über die ein Teammitglied einen `venture-tradeoffs-v1`-Durchlauf liest (Phase-D-pgTAP und Phase-E-pgTAP bestätigen). |

Ergebnis: Keine bestehende Struktur ist sauber erweiterbar, ohne einen Core-Vertrag anzufassen. Es gibt **eine** neue, kleine Tabelle.

## 2. Entscheidung `module_versions`: **A – keine Versionstabelle**

Für den Piloten genügt die exakte `instrument_id`:

- Die Share-Tabelle trägt `instrument_id` und erlaubt per `CHECK` nur `venture-tradeoffs-v1` (Allowlist; ein weiteres Modul erweitert sie mit einer eigenen Migration – nie stillschweigend).
- Bereitschaft verlangt, dass alle Durchläufe dieselbe `instrument_id` haben. Heute ist das trivial; ein künftiges v2 müsste ausdrücklich als kompatibel eingetragen werden – das wird hier **nicht** erfunden.
- Keine JSONB-Plattform, keine generische Result- oder Completion-Tabelle, keine Spiegelung der TypeScript-Registry.

Offen bleibt die Frage erst, wenn ein zweites Modul oder eine zweite Version desselben Moduls vergleichbar sein soll (Phase F/G).

## 3. Datenmodell

`assessment_team_shares` (Migration `20261206120000_venture_tradeoffs_team_share.sql`):

- bindet an **`assessment_id`** (eindeutig), dazu `team_id`, `owner_user_id`, `instrument_id`, `granted_at`, `revoked_at`
- höchstens **eine aktive** Freigabe je Person, Team **und Instrument** (Teil-Unique-Index auf `owner_user_id, team_id, instrument_id`)
- Clients dürfen nur lesen, und nur die eigene Zeile; geschrieben wird ausschließlich über `set_tradeoffs_team_share`
- `ON DELETE CASCADE` an Durchlauf, Team und Person

Zusätzlich zwei schmale Trigger-Wächter:

- `end_tradeoffs_shares_on_member_removal`: Wer aus dem Team ausscheidet, dessen Freigabe endet – ein späterer Wiedereintritt teilt nichts.
- `forbid_directed_share_of_tradeoffs`: Eine gerichtete Freigabe (`alignment_shares`) dieses Instruments wird abgelehnt – sonst wäre der Vertrag umgehbar.

## 4. Semantik (festgelegt und getestet)

**Grundsatz: Der freigegebene Team-Stand wird durch den aktiven Share bestimmt, nicht durch den neuesten privaten Assessment-Durchlauf. Ein privater Re-Assessment-Run verändert den bestehenden Sharing-Zustand nicht.**

- **Der zählende Durchlauf** einer Person ist der Durchlauf ihres **aktiven Share-Grants** für dieses Team – sofern er ihr gehört, zu diesem Team gehört, abgegeben ist, das Instrument erlaubt ist und die Person aktuell Mitglied ist. Ob es inzwischen einen neueren privaten Durchlauf gibt, ist für die Team-Bereitschaft unsichtbar.
- Run 1 abgegeben + freigegeben → bereit. Run 2 als Entwurf oder abgegeben, aber nicht freigegeben → Run 1 bleibt der aktive Team-Stand, der Vergleich bleibt auf Run 1 verfügbar, Run 2 erscheint darin nicht.
- Wird Run 2 **ausdrücklich** freigegeben, ersetzt er Run 1 als aktiven Share (Run 1 wird deaktiviert); der Vergleich nutzt ab dann Run 2. Es gibt keine automatische Freigabe und keine Änderung eines Shares durch eine bloße Abgabe.
- **Eindeutigkeit:** höchstens ein aktiver Share je Person, Team **und Instrument** (nicht je Person und Team insgesamt) – ein zweites optionales Modul kann parallel geteilt werden; derselbe Instrument-Share wird beim erneuten Freigeben ersetzt.
- **Bereit** genau dann, wenn 2–4 aktuelle Mitglieder je einen aktiven, zählenden Share haben und alle dasselbe Instrument nutzen.
- **Widerruf** des aktiven Shares wirkt sofort für alle: Bereitschaft false, Vergleich nicht abrufbar. Die anderen erfahren nicht, wer widerrufen hat.
- **Roster:** Beitritt → nicht bereit, bis die neue Person abgeschlossen und freigegeben hat. Austritt → neu gegen den aktuellen Roster bewertet; die Freigabe der ausgeschiedenen Person endet. Ex-Mitglieder lesen nichts.
- Die eigene Lage (`own`) meldet getrennt den neuesten abgegebenen Durchlauf (`assessment_id`) und den aktiv geteilten (`shared_assessment_id`). Die Seite zeigt bei einer neueren privaten Fassung nur einen Hinweis und hält den Widerruf des aktiven Shares erreichbar; eine ausgefeilte „neuere private Fassung"-Oberfläche folgt später.

## 5. Privacy

- Bereitschaft (`get_tradeoffs_team_readiness`) liefert nur `status` und die **eigene** Lage (`state`, `shared`, `assessment_id`). Keine Namen, Zähler, Versionen oder Listen anderer.
- Vergleich (`get_tradeoffs_team_comparison`) liefert nur bei Bereitschaft etwas, sonst `not_ready`; dieselben Daten für jedes aktuelle Mitglied. Namen erst dann.
- Nicht-Mitglieder (auch Advisors) bekommen `null`.
- Alle Funktionen: `security definer`, leerer `search_path`, Mitglieds-/Eigentümer-Prüfung, Allowlist, minimale Rückgabe; Hilfsfunktionen sind für Clients nicht aufrufbar.

## 6. Bewusst nicht Teil von Phase E

Advisor-Zugriff, FIND/CONNECT, Anpassung bestehender Freigaben, historische Teamberichte, generische Modulplattform, 3+-Founder-Umbau über die vorhandene 2–4-Regel hinaus, VA v2, weitere Module.
