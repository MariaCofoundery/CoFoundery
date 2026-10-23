# Problem Radar – Wochenscan (R2/R7), Einrichtung und Grenzen

Stand 23.10.2026. Umgesetzt: Migration `20261222120000_radar_collector.sql`, Sammler unter `web/src/features/problem-radar/collector/`, Route `/api/cron/problem-radar`, Kandidatenfach unter `/admin/problem-radar/candidates`.

## Was der Scan tut

- Fragt für freigegebene, aktive Quellen mit der Abrufart „Offizielle API“ die **Hacker-News-Suche (Algolia, `hn.algolia.com`)** ab: Ask-HN-Beiträge der letzten acht Tage zu den hinterlegten Suchbegriffen.
- Speichert pro Fund **nur** Kennung, Titel, Datum und die daraus gebaute Adresse (`news.ycombinator.com/item?id=…`). Kein Beitragstext, keine Namen der Verfasser:innen.
- Legt **Kandidaten** an, keine Signale. Ein Mensch öffnet den Beitrag, übernimmt ihn mit eigenen Worten als Signal oder verwirft ihn. Offene Kandidaten verfallen nach 30 Tagen zur bloßen Kennung (damit derselbe Beitrag nicht als neu wiederkehrt); Laufprotokolle nach 30 Tagen.
- Die Heuristik „offensichtlich ungelöst“ gibt es nicht. Hacker News liefert dafür kein verlässliches Signal; die Einschätzung bleibt beim Menschen.

## Wer was darf

- Der Sammler läuft unter der Datenbankrolle **`radar_collector`**. Sie darf nur vier Funktionen ausführen (`radar_collector_due/start/ingest/finish`), hat keinen Tabellenzugriff und nie den Service-Role-Schlüssel. Die Adresse des Beitrags baut die Datenbank selbst; der Sammler kann keine beliebige URL eintragen.
- Abruf-Host und Pfad stehen im Code fest, kein Redirect, 8 Sekunden, höchstens 512 KB Antwort. Es gibt keine von außen steuerbare Adresse.
- Der Scan ist **standardmäßig aus** (globaler Schalter im Kandidatenfach) und läuft nur für Quellen, die im Quellenregister freigegeben und aktiv sind und Abrufart und Suchbegriffe haben. Jede Änderung an Abrufart oder Suchbegriffen setzt die Freigabe zurück.

## Einrichtung (einmalig, durch Maria)

1. Migration auf Production anwenden (`npx supabase db push`, vorher `--dry-run`).
2. Login und Passwort für die Rolle setzen, **nicht ins Repository**: im SQL-Editor `alter role radar_collector with login password '<langes Zufallspasswort>';`
3. In Vercel (Production) die Variable **`RADAR_COLLECTOR_DATABASE_URL`** anlegen: Verbindungs-String des Supabase-Poolers mit dem Benutzer `radar_collector.<projekt-ref>`, Passwort aus Schritt 2, TLS an. Falls die Zertifikatsprüfung scheitert, `?sslmode=no-verify` nur nach bewusster Entscheidung (schwächt TLS).
4. Im Quellenregister eine Quelle anlegen: Domain `news.ycombinator.com`, Pfad `/item`, Typ „Öffentliche API“, Abrufart „Offizielle API“, öffentlich angehakt. Unter „Automatischer Abruf“ Hacker News und Suchbegriffe wählen. Quelle freigeben (Richtlinien-Verweis und Prüfnotiz ausfüllen) und aktiv schalten. Die Nutzungsbedingungen der Hacker-News-API prüfst du selbst; diese Datei ist keine rechtliche Freigabe.
5. Im Kandidatenfach „Wochenscan eingeschaltet“ anhaken und mit „Jetzt scannen“ einmal beaufsichtigt laufen lassen (Plan: erst nach einem beaufsichtigten Lauf den Wochenlauf).
6. Wenn alles gut aussieht: Cron-Eintrag ergänzen (siehe unten).

## Der Wochenlauf ist noch NICHT eingeplant

`web/vercel.json` hat zwei Cronjobs (Vorschläge, Löschlauf). **Vercel Hobby erlaubt höchstens zwei**; ein dritter Eintrag ließe das Deployment scheitern. Nach dem Wechsel auf Pro in `vercel.json` ergänzen:

```json
{ "path": "/api/cron/problem-radar", "schedule": "0 6 * * 1" }
```

(Montag 06:00 UTC.) Ein Test (`collector.test.ts`) schlägt dann an und erinnert daran, die Prüfung anzupassen. Bis dahin: „Jetzt scannen“ im Kandidatenfach. Eine Quelle läuft über den Cron höchstens alle sechs Tage erfolgreich, über „Jetzt scannen“ alle 60 Minuten.

## Offen

- Nutzungsbedingungen und Lizenz der Hacker-News-/Algolia-API prüfen (nicht geprüft).
- Eintrag im Verzeichnis der Verarbeitungstätigkeiten: Titel und Adressen öffentlicher Beiträge, interne Auswertung, 30 Tage.
- Ob die TLS-Verbindung zum Pooler mit voller Zertifikatsprüfung klappt, ließ sich lokal nicht prüfen (nur lokale Datenbank getestet).
- Weitere Quellen brauchen je einen eigenen Adapter; bewusst keine allgemeine „URL laden“-Funktion.
