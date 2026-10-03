# CONNECT: Problem-Hub – UX-Abschluss

Basis: `main` auf `2cc7c5b` (Closed Beta 7.10b). Branch: `codex/connect-problem-hub-ux`.

## Änderungen

- CONNECT-Untermenü: Entdecken → Problem → Potenzial → Für dich → Mein CONNECT. Der neue Einstieg führt zu `/connect/problems`; die aktive Markierung ist von Entdecken getrennt. Desktop und mobiles Menü nutzen dieselbe Navigation. EN: Problem → Potential.
- Bestehende Problemseite erhält den freundlichen Hero mit „Aus Problemen kann ziemlich Gutes entstehen.“ und zwei Links: `#probleme` zur Liste und `/connect/problems/new` zum bestehenden Formular.
- Kompakter Prozesshinweis und Link zu `/connect/workspaces`; private Räume werden ausdrücklich als nur für Berechtigte sichtbar erklärt.
- Bestehende Problemkarten: Titel, gekürzte Beschreibung, Intent, Ort/Reichweite, Themen als Tags, Autor und sekundäre bestehende Rückmeldungszahlen sowie eindeutiger Detail-CTA. Keine Bewertung oder neue Sortierung.
- Freundlicher leerer Bestand; bei leeren Filterergebnissen Zurücksetzen. Filter-Submit und Reset führen zur Liste.
- `/account`: vorhandene, serverseitig über `is_platform_admin()` geschützte Links jetzt in einem sichtbaren Abschnitt „Administration“ mit „Moderation“ und „Problem Radar“.

## Unveränderte Verträge

Keine DB-Änderung/Migration, keine Env-Variable. Weiterhin `network_problems` über die vorhandene autorisierte `connect_discovery_problems`-Abfrage mit 24er-Pagination. Closed Beta, noindex, Blockierung und Lifecycle bleiben unverändert.

Der Hub lädt keine Radar-Daten. `/admin/problem-radar` verwendet weiterhin `requirePlatformAdmin()` in Layout und Seite; die DB-RPCs behalten ihren Adminschutz. Kein Collector, externe Quellenabruf, Cron, KI oder neue Datenstruktur.

## Prüfung

- `npm run ci:check` erfolgreich: TypeScript, 2.723 Anwendungstests, Production-Build und 2.202 pgTAP-Tests in 136 Dateien. Bestehende Build-/Lint-Warnungen außerhalb der Änderung bleiben bestehen. `git diff --check` erfolgreich.
- Browser mit echtem lokalem Supabase-Bestand: zwei synthetische Konten (Mitglied und Plattform-Admin) sowie ein synthetisches Problem. Testserver ohne Resend-Schlüssel; keine externen E-Mails. Anschließend Problem und beide Testkonten gezielt entfernt und Bereinigung bestätigt.
- DE/EN jeweils bei 320, 375, 768 und 1440 px: Navigation/Reihenfolge, Hero, Sprung zur Liste, bestehendes Erstellformular, gefüllte Problemkarte mit Ort/Themen und Detail-CTA. Kein horizontaler Überlauf; `noindex` vorhanden.
- DE/EN: tatsächlich leerer Bestand sowie Suche ohne Treffer geprüft.
- DE/EN bei 320 und 1440 px: Plattform-Admin sieht beide Links unter Administration und kann Radar öffnen. Normales Mitglied sieht keine Adminlinks; direkter Radar-Aufruf endet auf der 404-Seite.
- Bestehende Navigationstests an den vierten Einstieg angepasst. React-Review: Server-Komponenten, vorhandene Session-/Adminprüfung, semantische Überschriften und beschriftete Navigation bleiben erhalten; keine zusätzlichen Client-Fetches oder Hooks.

## Deployment

Nur Code-Deploy; **kein `supabase db push`**:

```sh
git switch main
git merge --ff-only codex/connect-problem-hub-ux
git push origin main
```

Der bestehende Vercel-Git-Deploy startet durch den Main-Push. Keine Production-Änderung während der Umsetzung.
