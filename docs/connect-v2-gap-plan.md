# CONNECT v2 — Gap- und Umsetzungsplan (Phase 7, Teil 3)

**Stand:** 02.10.2026 · Bezug: `connect-v2-current-state.md` (Ist) und
`connect-v2-product-architecture.md` (Ziel). Nichts hiervon ist gebaut.

---

## 0. Vorab: Fehler im heutigen Stand

Beim Erfassen gefunden und **nachgeprüft**. Sie gehören nicht zu v2, sondern
vor v2 — zwei davon betreffen Funktionen, die heute in Production
angeboten werden.

| # | Befund | Nachweis | Wirkung | Aufwand |
|---|---|---|---|---|
| F1 | **Lösungsansatz speichern schlägt immer fehl.** `saveConnectProblemApproachAction` macht `upsert(… onConflict: "problem_id,author_user_id")`, seit `20260923120000` gibt es dafür aber nur einen *partiellen* Unique-Index. | In der lokalen DB nachgestellt: `there is no unique or exclusion constraint matching the ON CONFLICT specification` | Niemand kann einen Ansatz einreichen; die Oberfläche zeigt „Speichern war nicht möglich". | klein: Migration (vollständige Unique-Constraint, NULL-Autoren bleiben erlaubt) oder Aktion auf Select + Insert/Update umstellen |
| F2 | **Blockieren und Melden funktionieren nur in Unterhaltungen aus einer Kontaktanfrage.** `block_network_user` verlangt eine Kontaktanfrage, `network_reports.contact_request_id` ist `NOT NULL`. In Unterhaltungen aus „Ich würde daran arbeiten" und aus FIND-Intros stehen beide Knöpfe da und scheitern. | Funktionsdefinition und Spalte geprüft; `messages/[conversationId]/page.tsx` übergibt `contactRequestId=""` | Sicherheitsfunktion fällt gerade dort aus, wo sich Fremde zum ersten Mal schreiben | mittel: Migration (Bezug auf Unterhaltung statt Anfrage) |
| F3 | **Gemeldete Inhalte liest niemand.** `network_reports` wird beschrieben, es gibt keine Moderationsoberfläche und keine Admin-Rolle. | keine Funktion, Tabelle oder Route mit admin/moderat | Meldungen versanden | mittel: Admin-Rolle (siehe B1) + Liste |
| F4 | Highlights ignorieren `suggestable` und Blockierungen. | `connectHighlightData.ts` | Wer „nicht vorschlagen" gewählt hat, erscheint trotzdem prominent | klein |
| F5 | Gespeicherte Suchen prüfen weder Blockierungen noch die aktuelle Mitgliedschaft der Suchenden. | `savedSearchMatching.ts`, `list_saved_searches_for_matching` | Blockierte bekommen Titel und Link neuer Inhalte; gesperrte Mitglieder bekommen Titel von `members_only`-Inhalten per E-Mail | klein |
| F6 | `connect_suggestions_update_own` erlaubt der Empfängerin, jede Spalte zu ändern. | Policy | gering (nur eigene Zeilen) | klein |
| F7 | `robots.ts` sperrt `/connect/problems`, `/connect/people`, `/connect/ventures`, `/connect/searches`, `/connect/suggestions` nicht; Mitgliederseiten tragen kein `noindex`. | `robots.ts` | gering (Login-Weiterleitung schützt) | klein |
| F8 | „Entwurf speichern" nimmt ein aktives Profil/einen aktiven Eintrag vom Netz; zurückgezogene/gelöste Probleme lassen sich nicht zurückholen; Einträge und Connect-Profile lassen sich nicht löschen. | Aktionen | Bedienung | klein je Punkt |
| F9 | Totcode: `issueConnectSignupIntent`, `ConnectHighlightSelection`; veralteter Kommentar in `connectSuggestionData.ts` („kein Mailweg"); `list_network_conversations` ist für `anon` ausführbar (wirft ohne Sitzung). | Code, Grants | keine | klein |

Am Rand: `CLAUDE.md` sagt, es gebe keine `vercel.json` — es gibt
`web/vercel.json` mit dem Cron für Vorschläge.

**Empfehlung:** F1 und F2 als eigene kleine Phase vor jedem v2-Baustein.

---

## 1. Bausteine

Legende Risiko: **niedrig** = additive Änderung, nichts Bestehendes ändert
Bedeutung · **mittel** = neue RLS mit eigener Prüfung · **hoch** = berührt
Sichtbarkeit bestehender Objekte oder Geld.

| # | Baustein | existiert | erweitern | neu | Migration | RLS | UI | Risiko |
|---|---|---|---|---|---|---|---|---|
| B1 | **Plattform-Admin-Rolle** | — | — | ✓ Tabelle `platform_admins` + `is_platform_admin()` | ja | neue Hilfsfunktion; Admin-Policies nur additiv | klein | mittel — jede spätere Admin-Policy hängt daran |
| B2 | Sichtbarkeit als Produktsprache (vier Stufen) | `members_only`/`public` | Texte, `ConnectVisibilityField` | — | nein | nein | klein | niedrig |
| B3 | `noindex` und `robots` für alle Mitgliederseiten | teilweise | `robots.ts`, Connect-Layout | — | nein | nein | — | niedrig |
| B4 | **Arbeitsraum** (Raum, Beteiligte, Einträge) | nichts | — | ✓ drei Tabellen | ja | **ja, neu** — Mitgliedschaft über Hilfsfunktion, keine anon-Grants, kein Sitemap-Eintrag | mittel–groß | mittel |
| B5 | Einladungen in den Arbeitsraum | Muster in `advisor_org_invites` | — | ✓ Einladungstabelle + Claim-Funktion + Route `/invite/workspace/[token]` + Mail | ja | ja | mittel | mittel (E-Mail-Bindung, Ablauf, Widerruf) |
| B6 | Opportunity festhalten | — | Spalten am Raum | — | ja | über B4 | klein | niedrig |
| B7 | Vorhaben aus Raum erstellen | `founder_teams`, `create_solo_venture()` | Verweis Raum ↔ `founder_teams` | — | ja | Leserecht über Team-Mitgliedschaft | klein | mittel (max. 3 Personen, Mitgründung bleibt eigene Einladung) |
| B8 | Veröffentlichen aus dem Raum | `network_problems` mit Bestätigung | Spalte `workspace_id` am Problem; Vorschau-Schritt | — | ja | bestehende Problem-Policies bleiben | mittel | **hoch** — muss beweisen, dass nichts aus dem Raum mitwandert |
| B9 | Ressourcen-Freigabe | `person_resources` privat; Muster `capability_disclosure` | Freigabefeld an `person_core` + Lese-RPC | — | ja | neue SECURITY-DEFINER-Lesefunktion statt Tabellen-Policy | mittel | mittel |
| B10 | Highlights: alle aktiven statt 30 neueste; Probleme dazu; F4 | `connectHighlightData.ts` | ✓ | — | evtl. RPC | nein | klein | niedrig |
| B11 | Redaktionelle Highlights + Impact | Typ und Texte vorbereitet | Texte auf `{brand}` | ✓ Tabelle Hervorhebungen + Admin-Seite | ja | nur Admin schreibt; Mitglieder lesen aktive | mittel | mittel |
| B12 | Gesponserte Highlights | Kennzeichen „Anzeige" vorbereitet | — | ✓ Auftraggeber:in, Slot-Regel | ja (mit B11) | wie B11 | klein | **hoch** — rechtliche Kennzeichnung, Vertrauen |
| B13 | Empfehlungs-Signalregister | `connect_match_terms`, `matched_terms` | Signale mit Herkunft und Nutzungsrecht dokumentieren | — | nein | nein | — | niedrig |
| B14 | Empfehlungsmodell v2 (Gewichtung) | Überschneidung ohne Score | ✓ | — | evtl. | nein | klein | mittel — Erklärbarkeit muss bleiben |
| B15 | Organisationen (mehrere Personen) | `network_ventures` (eine Person) | — | ✓ falls entschieden | ja | ja | groß | hoch — neue Objektart mit Rollen |
| B16 | Monetarisierung (Zahlung) | — | — | ✓ | ja | ja | groß | hoch |

---

## 2. Empfohlene Reihenfolge

1. **F1, F2** — bestehende Funktionen reparieren (eine kleine Phase, zwei
   Migrationen).
2. **B1 Admin-Rolle + F3 Meldungen ansehen** — ohne sie gibt es weder
   Moderation noch Redaktion.
3. **B3, F4–F7** — Indexierung und Vorschlags-/Highlight-Hygiene.
4. **B4 + B5 Arbeitsraum mit Einladungen** — das Kernstück; zuerst ohne
   Veröffentlichen und ohne Vorhaben. pgTAP-Suite für „Nichtmitglied sieht
   nichts", „Viewer schreibt nichts", „widerrufene Einladung greift nicht".
5. **B6, B8 Opportunity und Veröffentlichen** — mit einem Test, der jede
   Spalte des Brett-Problems gegen die Raum-Tabellen prüft.
6. **B7 Vorhaben aus Raum.**
7. **B10, B11 Highlights** — erst entdeckt + redaktionell, dann Impact.
8. **B9 Ressourcen-Freigabe, B13/B14 Empfehlungen.**
9. **B12 Gesponsert, B15 Organisationen, B16 Zahlung** — erst nach den
   Entscheidungen unten.

---

## 3. Entscheidungsfragen

Nur Fragen, die sich nicht aus Code oder Sicherheit ergeben.

1. **Wen darf man in einen Arbeitsraum einladen?** Nur bestehende
   Connect-Mitglieder — oder auch per E-Mail Menschen ohne Konto, die mit der
   Annahme Mitglied werden?
2. **Dürfen Contributors weitere Personen einladen,** oder nur die
   Besitzerin?
3. **Werden Beteiligte beim Veröffentlichen genannt?** Nie, nur auf eigenen
   Wunsch, oder als „gemeinsam mit N Personen" ohne Namen?
4. **Was sehen Anonyme von einem öffentlichen Problem außer dem Text?** Nur
   den Text — oder auch Zahlen („12 kennen das", „3 arbeiten daran") als
   Anreiz, Mitglied zu werden?
5. **Brauchen Unternehmen eine eigene Sichtbarkeit und Seite** — oder bleiben
   sie Karten an der Person, bis es Organisationen gibt?
6. **Organisationen mit mehreren Personen:** ja (dann Rollen, eigene Seite,
   Einträge im Namen der Organisation) oder bewusst nicht — CONNECT bleibt ein
   Netzwerk von Personen?
7. **Ressourcen für andere sichtbar machen:** ja, mit eigener Freigabe wie
   bei den Fähigkeiten — und wenn ja, auch als Signal für Vorschläge?
8. **Darf CONNECT Verhalten auswerten** (welche Karten jemand öffnet), um
   Vorschläge zu verbessern — oder bleibt es bei ausdrücklichen Angaben?
9. **Wer darf gesponsert werden:** nur Organisationen und Programme, oder auch
   Personen und einzelne Probleme? Und darf ein Problem-Programm (eine
   Organisation lädt in Arbeitsräume ein) Ergebnisse der Räume sehen?
10. **Wer kuratiert:** nur die Gründerin der Plattform, oder ein kleines
    Redaktionsteam — und sollen Impact-Kategorien fest vorgegeben oder frei
    benennbar sein?
