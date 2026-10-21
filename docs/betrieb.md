# Betrieb – Schalter, Sicherung, Störungen

Stand 21.10.2026. Gegen den Code geprüft (Variablen, Routen, `vercel.json`).
Was **nicht** aus dem Code ablesbar ist (Supabase-Tarif, Vercel-Einstellungen),
steht als „zu prüfen“ und ist nicht behauptet.

## 1. Es gibt keine Feature-Flags

Kein Flag-System, keine Flag-Tabelle. Verhalten steuern nur Umgebungsvariablen
(Vercel → Settings → Environment Variables; nach jeder Änderung neu deployen).
Ein „Schalter“ ist hier also: Variable ändern, Redeploy.

| Variable | Wirkung | Fehlt sie |
| --- | --- | --- |
| `BETA_ACCESS_CODES` | Zugangscodes für `/start` (Komma oder Zeilenumbruch, Groß/Klein egal) | Kein Code gilt; neue Konten nur noch über Einladung |
| `REPORT_ACCESS_MODE` | `free_beta` entsperrt alte Berichte (Legacy) | Normalmodus |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Verbindung | App läuft nicht |
| `SUPABASE_SERVICE_ROLE_KEY` | Löschläufe, Export, Konto-Löschung, Forschungs-Erfassung | Die betroffenen Routen antworten 503 bzw. tun nichts |
| `CRON_SECRET` | Schutz der beiden Cron-Routen | Beide antworten 503 und **löschen nichts** |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (+ `RESEND_FROM_NAME`, `RESEND_REPLY_TO_EMAIL`) | Einladungs- und Benachrichtigungsmails | Mail wird nicht gesendet, Aktion meldet `missing_resend_api_key` / `missing_resend_from_email` |
| `FEEDBACK_NOTIFICATION_EMAIL` | Empfänger für Feedback-Hinweise | Keine Benachrichtigung |
| `CRON_ALERT_EMAIL` | Empfänger der Fehler-Mail eines Zeitplanlaufs; ersatzweise `FEEDBACK_NOTIFICATION_EMAIL` | Kein Alarm, nur Protokoll |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (+ `VAPID_SUBJECT`) | Web-Push | Push still aus (nur Production konfiguriert, siehe Memory) |
| `RESEARCH_HASH_SALT` | Pseudonymisierung bekannter Kennungen (Forschung, Konto-Löschung) | Kein Hash, `null` |
| `MAINTENANCE_API_KEY` | Schutz von `POST /api/maintenance/report-runs/backfill` (Header `x-maintenance-key`) | Route antwortet 503 |
| `NEXT_PUBLIC_APP_VERSION` | Versionsangabe in Forschungsereignissen | `null` |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` | Basis für Links in Mails | Links können falsch sein – nach Domainwechsel zuerst prüfen |

**Nur lokal / Skripte:** `AI_MODEL`, `OLLAMA_URL`, `AI_WORKER_EMAIL/PASSWORD`
(KI-Worker auf dem Laptop), `TTS_*`, `AICAPELLA_*`. Nichts davon wird im
Webbetrieb gebraucht. `/dev-login` und `dev:seed` laufen nur gegen eine lokale
Supabase-URL (`isLocalSupabaseUrl`), nicht in Production.

**Nie ausgeben oder ins Repo:** Service-Role-Key, `CRON_SECRET`,
`VAPID_PRIVATE_KEY`, `MAINTENANCE_API_KEY`, `BETA_ACCESS_CODES`.

### Zugang schnell sperren / öffnen
- Neue Konten stoppen: `BETA_ACCESS_CODES` leeren, redeployen. Eingeladene kommen weiter hinein (bewusst).
- Einen Code zurückziehen: aus der Liste streichen, redeployen. Bereits angelegte Konten bleiben.

## 2. Geplante Läufe (Vercel Cron, `web/vercel.json`)

| Zeit (UTC) | Route | Tut |
| --- | --- | --- |
| 03:00 | `/api/cron/privacy-retention` | Löscht Forschungsereignisse >30 Tage, abgelaufene Event-Daten, KI-Jobs >90 Tage, Hinweise >180 Tage |
| 07:00 | `/api/cron/connect-suggestions` | Tägliche Connect-Vorschläge |

- Beide verlangen `Authorization: Bearer $CRON_SECRET` (Vercel schickt das selbst).
- Antwort `503 cron_secret_not_configured` = Secret fehlt in **dieser** Umgebung; `401` = falsches Secret; `503 missing_service_role` = Service-Key fehlt. Antworten enthalten nur Zahlen, nie Inhalte.
- **Alarm:** Scheitert ein echter Aufruf (Status 500, oder 503 `missing_service_role`), geht eine Mail an `CRON_ALERT_EMAIL`. Ein fehlendes oder falsches Secret löst bewusst keine Mail aus, das kann jeder von außen anstoßen. Die Mail nennt nur Lauf, Status und Schritte. Ein Lauf, der gar nicht startet, fällt so **nicht** auf.
- Wiederholen ist harmlos (gelöscht wird nur, was die Frist erfüllt).
- **Prüfen:** Vercel → Project → Logs, Filter auf den Pfad. Nach dem ersten Lauf sollte der Privacy-Lauf `200` mit Zählern liefern. Ein Dauer-`503` heißt: es wird **nicht gelöscht**, die Datenschutzerklärung verspricht es aber.
- Manuell auslösen (Secret nicht in die Shell-History schreiben, besser aus einer Datei lesen):
  `curl -H "Authorization: Bearer $(cat ~/.m2f-cron)" https://<domain>/api/cron/privacy-retention`
- Vercel Hobby erlaubt nur tägliche Crons; ein Lauf kann innerhalb der Stunde starten, nicht minutengenau. **Zu prüfen:** Tarif.

## 3. Sicherung und Wiederherstellung

**Quelle der Wahrheit ist Supabase Postgres.** Dateien (Profilfotos,
Venture-Logos) liegen im Supabase Storage. Der App-Code liegt in Git; Vercel
hält nur Builds.

**Zu prüfen (nicht aus dem Code erkennbar, bitte im Dashboard nachsehen und hier eintragen):**
- [ ] Supabase-Tarif und ob tägliche Backups aktiv sind (Dashboard → Database → Backups)
- [ ] Aufbewahrungsdauer der Backups: ______ Tage
- [ ] Point-in-Time-Recovery aktiv? ja / nein (nur in bezahlten Tarifen zusätzlich)
- [ ] Storage-Buckets sind **nicht** Teil des Datenbank-Backups – eigene Sicherung nötig, wenn Fotos wichtig sind
- [ ] Region der Datenbank: ______ (muss zur Datenschutzerklärung passen)

**Eigene Sicherung vor riskanten Eingriffen** (Migration mit Datenänderung, Massenlöschung):
```bash
cd web
npx supabase db dump --linked -f ~/m2f-backup-$(date +%F)-schema.sql
npx supabase db dump --linked --data-only -f ~/m2f-backup-$(date +%F)-daten.sql
```
Die Datei enthält Personendaten: nicht ins Repo, nicht in Cloud-Ordner ohne Verschlüsselung, nach dem Eingriff löschen.

**Wiederherstellung (Reihenfolge):**
1. Schaden eingrenzen: welche Tabelle, ab wann? Bis zur Klärung Schreibzugriff reduzieren (`BETA_ACCESS_CODES` leeren, ggf. Wartungsseite).
2. Backup/PITR im Supabase-Dashboard auf einen Zeitpunkt **vor** dem Fehler. Das überschreibt den Stand danach – Verluste seit dem Zeitpunkt vorher benennen.
3. Danach `npx supabase migration list --linked`: Stimmt der Migrationsstand mit dem Repo überein? Fehlende Migrationen nachspielen (vorher `--dry-run`).
4. Stichproben: Anmelden, `/me/profile`, ein Team, `/datenschutz`.
5. Cron-Logs des nächsten Tages prüfen.
6. Üben: Mindestens einmal in einem **Test-Projekt** wiederherstellen, bevor man es im Ernstfall tut. Noch nicht geschehen.

## 4. Veröffentlichen und Zurückrollen

- Vercel baut `main` bei erfolgreichem `next build`. **Keine CI**: vor dem Merge `cd web && npm run ci:check` selbst laufen lassen (Docker für `db:test` muss laufen, sonst wird übersprungen).
- Code zurück: Vercel → Deployments → letztes gutes Deployment → „Promote to Production“. Sofort, ohne Git.
- **Migrationen gehen nicht zurück.** Sie sind append-only. Fehler in einer Migration → neue Korrektur-Migration, nie die alte ändern.
- Reihenfolge bei Schemaänderung: Migration (nach Freigabe, erst `--dry-run`) → Code. Wenn Code die neue Spalte braucht, darf er nicht vor der Migration live gehen. Wenn eine Migration etwas entfernt, muss der alte Code das schon nicht mehr brauchen.
- Migration aufspielen: `cd web && npx supabase db push --linked --dry-run`, lesen, dann ohne `--dry-run`.
- Neue Migration in `phase116c.test.ts` eintragen (sonst rot).

## 5. Störungsbilder

| Beobachtung | Wahrscheinliche Ursache | Zuerst |
| --- | --- | --- |
| „Wir senden dir einen Link“, es kommt keine Mail | `RESEND_*` fehlt oder Absenderdomain nicht verifiziert; unbekannte E-Mail ohne Einladung/Code | Resend-Dashboard → Logs; Variablen prüfen |
| Einladungsmail fehlt, Aktion meldet Fehler | `missing_resend_api_key` / `_from_email` | Variable setzen, redeployen |
| Links in Mails zeigen auf falsche Domain | `NEXT_PUBLIC_SITE_URL` / `APP_URL` | Variable prüfen |
| Cron `503` | `CRON_SECRET` oder Service-Key fehlt in dieser Umgebung | Variable in Production setzen, redeployen |
| Cron `500` | SQL-Funktion wirft Fehler | Vercel-Log, dann `purge_old_research_events` / `purge_stale_operational_rows` einzeln im SQL-Editor testen |
| Nutzerin sieht Daten eines Teams nicht / zu viel | Einwilligungen sind getrennt (Teilen, Mitgliedschaft, Advisor-Freigabe) | Nicht an Policies „drehen“, erst `supabase/tests/*.sql` lesen – sie sind die Spezifikation |
| „KI verfügbar“ fehlt | Worker auf dem Laptop läuft nicht (Heartbeat) | `npm run ai:worker`; Webbetrieb bleibt voll nutzbar |
| Push kommt nicht (lokal/Preview) | VAPID nur in Production konfiguriert | Kein Fehler |
| Export `/api/account/export` leer oder 5xx | Service-Key oder neue Tabelle fehlt in `accountExport.ts` | Neue Tabellen mit Personenbezug dort **und** in der Konto-Löschung nachziehen |
| `db:test` „ÜBERSPRUNGEN“ | Docker/Supabase lokal nicht gestartet | `npx supabase start`, erneut laufen lassen |

## 6. Datenschutz-Anfragen (Fristen: 1 Monat)

- **Auskunft / Export:** Nutzerin kann selbst unter dem Konto exportieren (`/api/account/export`). Bei E-Mail-Anfrage zuerst Identität über die Konto-Adresse bestätigen.
- **Löschung:** Selbstbedienung im Konto (Konto-Löschung). Danach prüfen, ob Reste bleiben (Team-Daten anderer, die Gegenstand gemeinsamer Vereinbarungen sind, werden nicht einseitig gelöscht).
- **Einwilligung widerrufen:** Forschung und Teilen sind getrennte Schalter; ein Widerruf wirkt nur auf seinen Zweck.
- **Datenpanne:** Zeitpunkt der Kenntnis notieren; Meldung an die Aufsichtsbehörde innerhalb von 72 Stunden prüfen lassen (Art. 33 DSGVO). Dies ist keine Rechtsberatung – im Zweifel früh jemanden hinzuziehen.

## 7. Wöchentlicher Blick (10 Minuten)

1. Vercel-Logs: Cron-Läufe der letzten Woche `200`?
2. Resend: Zustellungen/Bounces auffällig?
3. Supabase: Speicher, Backups vorhanden und aktuell?
4. Feedback-Posteingang gelesen?
5. Offene Datenschutzanfragen mit Fristdatum?

## 8. Offene Punkte

- Supabase-Backup-Stand und Wiederherstellungsübung (Abschnitt 3) eintragen.
- Aufbewahrung für Nachrichten, Feedback, Einladungen und Aggregate ist noch nicht entschieden (siehe Verzeichnis der Verarbeitungstätigkeiten).
- Alarm bei Fehlschlag ist gebaut; ein Lauf, der nie startet, fällt nur über einen externen Monitor oder den wöchentlichen Blick auf.
