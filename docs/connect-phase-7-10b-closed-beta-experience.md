# CONNECT 7.10b – Closed Beta Experience

## Basis und geprüfter Bestand

Implementierung auf `main` **7915c79**, Branch `codex/phase-7-10b-closed-beta`. Grundlage sind die drei 7.10a-Dokumente, der tatsächliche Anwendungscode und die lokale DB einschließlich `20261109140000`. Vor Änderungen wurden insbesondere Public-RPCs/Grants, 7.9-Lifecycle, Highlight-Auswahl, Suggestion-Generator/Read/Count/Notify, Browse-Queries und Publish-Action geprüft. Der lokale CONNECT-Bestand war zunächst leer; Browsernachweise stammen ausschließlich aus danach angelegten synthetischen Konten/Inhalten.

Keine Änderungen an FIND-Matching, Assessments, Radar, privaten Workspace-Rechten oder der Beta-Codepflicht. Keine neue Empfehlungstechnik, Datenerhebung oder Trackingfunktion.

## 1. Closed-Beta-Sichtbarkeitsvertrag

CONNECT ist ein Bereich für **eingeloggte aktive CONNECT-Mitglieder**. Discovery unterliegt zusätzlich den bestehenden Owner-, Profil-, Objektstatus- und beidseitigen Blockregeln. Management eigener inaktiver Inhalte bleibt vom Discovery-Vertrag getrennt.

Die eng begrenzte DB-Funktion `connect_public_rollout_enabled()` liefert dauerhaft `false`. Die sieben bisherigen Public-Projektionen (Profil, Listing, Problem, LinkedIn, Profil-Listings, Profil-Ventures, Sitemap) liefern dadurch keine Daten; ihre schmalen zukünftigen Projektionen bleiben im Funktionskörper erhalten. Es gibt keine neue Env-Variable und keinen administrativen Laufzeit-Schalter. Tabellenrechte für anon werden nicht erweitert.

Die ergänzende serverseitige Konstante `CONNECT_PUBLIC_ROLLOUT_ENABLED = false` verhindert öffentliche Seiten-/Metadatenprojektionen. `/connect/p/[slug]`, `/connect/l/[slug]` und `/connect/pr/[slug]` führen anon zum Login mit `next`. Ein berechtigtes Mitglied wird über die Session-RPC `resolve_connect_member_slug` zur autorisierten internen Detailseite weitergeleitet. Unzugängliche Objekte werden nicht aufgelöst.

**Keine aufgesparte Public-Freigabe:** Vorhandene `public`-Werte in `network_profiles`, `network_listings` und `network_problems` werden zu `members_only`. Ein Trigger erzwingt dies auch für spätere direkte Schreibversuche; Formulare/Actions einschließlich Workspace-Publish verwenden denselben Beta-Wert. Weder eine Schattenkopie alter Public-Werte noch ein später automatisch aktivierbares Opt-in wird gespeichert. Die Inhalte bleiben Mitgliedern gemäß bisherigen Regeln lesbar. Ein späterer öffentlicher Rollout benötigt eine neue ausdrückliche Freigabe und überprüfte Migration; ein einfaches Öffnen des Gates würde diese Beta-Inhalte weiterhin nicht öffentlich machen.

Fotos/Logos behalten ihre vorhandenen Session-/Membership-/RLS-geschützten Routen und privaten Storage-Verträge. Keine Öffnung von `person_core`, ALIGN/FIND oder privaten Founder-Daten.

## 2. Informationsarchitektur

| Bereich | Funktion / vorhandene URLs |
| --- | --- |
| Entdecken | `/connect`, Menschen, Angebote & Gesuche, Probleme, Unternehmen & Projekte |
| Für dich | `/connect/suggestions`, vorhandene persönliche Begriffsvorschläge |
| Mein CONNECT | `/connect/my`, Untereinstiege Profil, Meine Beiträge, eigene Unternehmens-/Projektdarstellungen, Arbeitsräume, gespeicherte Benachrichtigungsregeln |

Discovery-Tabs haben die Reihenfolge Menschen → Angebote & Gesuche → Probleme → Unternehmen & Projekte. Arbeitsräume sind ausschließlich unter Mein CONNECT; ihre Einladungs-/Rollenregeln ändern sich nicht. Meine Beiträge fasst eigene Listings und Problems zusammen. Bestehende URLs bleiben erhalten.

Startseite: kurze Orientierung → vier Discoveryarten → neutrale Highlights → sekundäre Beitragsaktionen → Suche/Filter und Liste. `Co-Founder suchen → FIND` / `Find a co-founder → FIND` kennzeichnet den Bereichswechsel. Mobile Navigation bietet dieselben drei Hauptbereiche über das vorhandene Menü.

## 3. Publish-Bug: tatsächliche Ursache und Korrektur

Die pauschale Aussage „kein Draft lässt sich veröffentlichen“ ließ sich nicht reproduzieren: Ein vollständig befüllter synthetischer Draft wurde bereits über die bestehende RPC aktiv. Reproduzierbar war ein Draft mit zu kurzem Titel: Die Datenbank lehnte ihn mit `network_listings_active_complete_check` ab. Die Action übersetzte alle DB-Fehler in denselben allgemeinen Fehler. Außerdem hieß bereits die **aufklappende Bestätigungszeile** „Veröffentlichen“, obwohl dieser erste Klick lediglich das Formular öffnete. Das erklärt zwei konkrete Sackgassen; ohne den ursprünglichen Production-Datensatz wird keine weitergehende Einzelfallursache behauptet.

Korrektur:

- Die aufklappende Zeile heißt „Veröffentlichung prüfen“; erst der bestätigte Submit heißt „Veröffentlichen“.
- `transition_connect_content` prüft Titel (mindestens 5 Zeichen), Beschreibung (mindestens 20 Zeichen) und aktives Ownerprofil ausdrücklich. Sie behält Session, Eigentum, Bestätigung, erwarteten Status, Sperren und 60-Tage-Laufzeit aus 7.9.
- Die Action verwendet eine geschlossene Fehlerzuordnung. Fehlender Titel/Beschreibung führt zum bestehenden Editor mit konkretem Hinweis; fehlendes aktives Profil bietet den Profileinstieg. Konflikte verlangen Aktualisieren, unerwartete Fehler bleiben generisch. Keine rohen DB-/Securitytexte in der UI.
- Erfolg bleibt `active` mit bestehender Erfolgsmeldung und Revalidation; Fehler lassen den Draft bestehen.

Browserbelegt: vollständiger Draft → aktive Karte/Erfolg; Ein-Zeichen-Titel → Editor mit konkreter Mindestlänge. Persistierter DB-Status wird zusätzlich geprüft.

## 4. Highlights

Die bestehende zufällige Auswahl über Objektarten bleibt erhalten; hinzu kommen Problems. `list_connect_highlight_candidates` ist eine **SECURITY INVOKER**-RPC mit Session/RLS und höchstens 30 Kandidaten je Aufruf (gemeinsamer Listingpool für Seeking/Offering, außerdem Venture, Person, Problem). Aktive Mitgliedschaft/Ownerprofil, Status, Laufzeit, Blockierung und `suggestable` werden **vor** dem Fenster geprüft. Problems benötigen einen vorhandenen aktiven Autor, `active` und keine Moderationssperre. Anonymisiert erhaltene Probleme sind keine Highlight-Kandidaten.

Die App bestätigt zulässige Owner nochmals über den bestehenden Owner-Helfer. Die Auswahl enthält maximal eine Karte je Owner; bei zu wenigen unterschiedlichen zulässigen Besitzern bleiben es weniger als drei. Eigene Inhalte bleiben mit „Von dir“ erlaubt. Keine Fairnessgarantie über den gesamten Bestand, keine personalisierte Rangfolge. Private Workspaces, Opportunities, Radar und Intake sind keine Kandidaten.

## 5. Suggestions-Hygiene

`connect_suggestion_eligible` zentralisiert die aktuelle Zulässigkeit: aktiver Empfänger, aktiver Subject-Owner und dessen Profil, kein Block in beiden Richtungen, aktueller Subjectstatus und korrekte Eigentumsbeziehung. Personenvorschläge verlangen weiterhin `suggestable`; abgelaufene Listings, ausgeblendete Ventures und zurückgezogene/gelöste/moderierte Problems entfallen.

Eine sessiongebundene RLS-Hilfsfunktion beschränkt SELECT auf eigene aktuell zulässige, nicht verworfene Vorschläge. Karten und Badge zählen deshalb denselben verfügbaren Bestand. Das schmale bestehende Dismiss-RPC bleibt unverändert. Normale autorisierte Personensuche hängt nicht an Promotions-Consent.

Der Problemgenerator prüft ausdrücklich das aktive Besitzerprofil. Begriffsmatching und höchstens drei neue Vorschläge im rollierenden Siebentagefenster bleiben unverändert. `prepare_suggestion_notifications` verwendet die gleiche Eligibility beim Claim; die Service-Role-only-RPC `count_connect_notification_delivery` prüft sie vor der jeweiligen Zustellung nochmals. Fehler/kein aktuell zulässiger Vorschlag verhindern die Meldung. Keine Namen oder Inhaltstitel in der Nachricht. Bestehende Einstellungen und Kanäle bleiben erhalten; kein neuer Cron.

DE/EN erklärt begriffliche Überschneidungen, automatische Erzeugung und zustimmungsabhängige E-Mail/Push-Meldungen. Die falsche Aussage „per Mail geht nichts hinaus“ wurde entfernt.

## 6. Suche, Pagination und Counts

Personensuche erfolgt vollständig im autorisierten DB-Bestand: Filter und Freitext einschließlich erlaubtem aktiven Venture-Suchtext **vor** dem Limit. `search_connect_people` ist SECURITY INVOKER, verwendet `auth.uid()` für den Selbstausschluss und durchsucht keine zusätzlichen privaten Felder. Freitext wird als wörtliche Teilzeichenfolge behandelt, nicht als SQL-/LIKE-Ausdruck. Reihenfolge: `published_at DESC NULLS LAST, user_id`.

Alle vier Browse-Arten zeigen 24 Datensätze pro Seite plus einen Lookahead zur Erkennung einer Folgeseite. Kriterien bleiben in Weiter/Zurück erhalten; Offset ist begrenzt. Listings/Problems/Ventures verwenden SECURITY-INVOKER-Views, damit eigene Verwaltungsrechte für inaktive Inhalte nicht versehentlich Discovery erweitern. Bestehende Status-/Filterregeln bleiben, UUID dient als stabiler Tiebreaker. Offset-Pagination ist bei zwischenzeitlichen Mutationen keine Snapshot-Garantie.

Tabzahlen beschreiben den sichtbaren Gesamtbestand der jeweiligen Discoveryart (Menschen wie bisher ohne eigenes Profil). Treffer-/Seitenzahlen beschreiben die aktuell geladenen Suchergebnisse. Es wird keine ungefilterte Gesamtmenge zur clientseitigen Suche geladen.

## 7. Cards, Profil und Empty States

Die bestehenden Cards behalten ihre Inhalte und kontextbezogenen Links. Titel/Kurztext, Objektart und nächste Handlung werden kompakt dargestellt; lange Texte werden begrenzt bzw. umbrechen. Die Listing-Fußzeile bricht auf schmalen Geräten um. Unternehmens-/Projektdarstellungen bleiben `network_ventures`, keine automatische Repräsentation eines kanonischen Founder-Teams.

Profilgliederung: „So erscheinst du“, „Was du einbringst & wie man dich ansprechen kann“, „Sichtbarkeit“. Das Sichtbarkeitsfeld erklärt ausschließlich den Mitgliederbereich der Closed Beta; die Public-Auswahl wird nicht angezeigt.

Leerer Gesamtbestand und leere Filterergebnisse bleiben getrennt. Bei Suchleere steht Filter zurücksetzen zuerst; bei leerem Bestand wird der Objekttyp erklärt und ein passender Einstieg angeboten. Ein leerer Highlightblock entfällt. Keine Fake-Inhalte für reale Nutzer.

## 8. Saved Searches

Gespeicherte Suchen werden als Benachrichtigungsregeln für **neue Angebote/Gesuche und Probleme** erklärt, nicht als Suche über ganz CONNECT. Zusätzliche Capability-Kriterien sind als Benachrichtigungskriterien bezeichnet. Gespeicherte Capability-IDs werden über vorhandene DE/EN-Labels aufgelöst; unbekannte Altwerte erhalten einen neutralen Text statt einer Roh-ID. Matching, Zustellberechtigungen und Preferences bleiben unverändert.

## 9. SEO und Return Paths

Discovery behält `noindex, nofollow`. Alle drei früheren Public-Seiten liefern bei geschlossenem Gate nur generische Metadaten, ohne CONNECT-Inhalt, sowie `noindex, nofollow`. `robots.ts` sperrt `/connect` und enthält keine p/l/pr-Ausnahme mehr. Die Public-Sitemap-RPC liefert null CONNECT-Zeilen. Private/interne Bereiche bleiben unverändert ausgeschlossen.

Login erhält den konkreten CONNECT-Rückweg. CONNECT-only-Profilonboarding bewahrt jetzt alle CONNECT-Ziele einschließlich p/pr statt nur l. Die Profil-Action validiert interne Rückwege über den vorhandenen Schutz gegen externe/protokollrelative/Backslash-Redirects. Eingeloggte Nichtmitglieder gehen zum Dashboard, bestehende inaktive CONNECT-Accounts zur Kontoverwaltung; sie werden nicht erneut zum Login geschickt. Diese Wege gewähren keinen automatischen Eintritt und umgehen keine Beta-Codes.

## 10. Migrationen, Deployment

Neue additive Migrationen, keine Änderung historischer Migrationen:

1. `20261110120000_connect_closed_beta.sql`: Public-Gate/Normalisierung, Publish-Validierung, Eligibility/RLS, Highlight-/Personensuche-/Slug-RPCs.
2. `20261110130000_connect_beta_discovery.sql`: Session-Browse-Views und erneute Notification-Eligibility vor Zustellung.
3. `20261110140000_connect_beta_anonymous_grants.sql`: Entfernt verbleibende breite anon-/PUBLIC-Tabellengrants auf Problems und Ventures zusätzlich zu deren schon zuvor ausschließlich authentifizierten RLS-Policies.

**DB vor Code: ja. Keine neuen Env-Variablen.** Die UI benötigt die neuen RPCs/Views. Nach Prüfung des verknüpften Supabase-Projekts im Repository-Root:

```sh
git switch codex/phase-7-10b-closed-beta
npx supabase db push --dry-run
npx supabase db push
git switch main
git merge --ff-only codex/phase-7-10b-closed-beta
git push origin main
```

Der bestehende Vercel-Git-Deploy startet durch den Push auf main. Bei fortgeschrittenem main vor Integration aktualisieren und erneut testen; `--ff-only` verhindert einen ungeprüften Merge. Während dieser Arbeit kein Production-Push/Deploy.

## 11. Tests

`npm run ci:check`: **PASS**, TypeScript, **2.723 App-Tests**, Production-Build und **136 DB-Dateien / 2.202 pgTAP-Prüfungen**. Bestehende Node-Modul-/Workspace- und Lint-Warnungen außerhalb dieses Tasks bleiben; keine fehlgeschlagenen Checks.

`npx supabase test db`: zusätzlich separat auf dem finalen Stand **PASS, 136 Dateien / 2.202 Prüfungen**. Die Ergebnisse umfassen auch die bestehenden 7.9-Lifecycle-, Account-Deletion-, Moderations-, Block-, Workspace-, Opportunity- und Saved-Search-Regressionen.

Die neue pgTAP-Suite `connect_closed_beta_710b.sql` umfasst **57 Prüfungen**, verwendet 72 synthetische Profile und prüft unter anderem: anonyme Sperre auch für absichtlich public-markierte Fixtures, Memberzugriff, leere Sitemap, Grants, Suche jenseits der früheren 60, kombinierte Filter, Pagination, 35 unzulässige neue Highlight-Kandidaten vor einem zulässigen alten, Publish-Erfolg und konkrete Fehler, Consentänderung, Blocks, Subjectstatus, Moderation, Problemgenerator und Notification-Recheck.

Historische Public-Projektions-Tests öffnen das Gate und deaktivieren den Beta-Normalisierungstrigger ausschließlich **innerhalb ihrer zurückgerollten Testtransaktion**, um die erhaltene zukünftige Projektion weiterhin zu prüfen. Die neue Suite prüft den tatsächlichen geschlossenen Vertrag. Der vorhandene historische Schema-Drift-Test entfernt innerhalb seines Rollbacks zunächst die neue abhängige Browse-View; kein Umbau des produktiven Schemas durch Tests.

Browserfixtures: acht lokale synthetische Accounts (sieben aktive CONNECT-Mitglieder plus ein Nichtmitglied), sechs Profile anderer Personen, je drei Angebote/Gesuche, sechs Problems, sechs Unternehmens-/Projektdarstellungen, vollständiger und unvollständiger eigener Draft, drei erzeugte Vorschläge und eine Benachrichtigungsregel. Testserver ohne Resend-Schlüssel; keine externen Mails/Cron-Auslösung. Fixtures wurden vor dem abschließenden DB-Lauf gezielt entfernt; abschließend null synthetische `beta710b-*`-Accounts. Das Public-Gate bleibt false und die beiden anon-Tabellengrants bleiben entzogen, auch nach allen zurückgerollten Tests.

Weitere echte Browseraktionen: Vorschlag wegklicken (Karten und Badge 3 → 2), alle p/l/pr-Slugs als Mitglied auflösen, alle vier leeren Suchansichten mit Reset, konkrete Personensuche und Menü bei 320 × 650 px. Anon-Slug-Aufrufe behalten ihren exakten Login-Rückweg; Nichtmitglied landet ohne Login-Schleife im Dashboard. Sitemap ohne CONNECT und robots-Sperre zusätzlich über lokale HTTP-Antworten geprüft. DB-Nachprüfung bestätigt aktiven vollständigen Draft, erhaltenen unvollständigen Draft und zwei verfügbare/einen verworfenen Vorschlag. Nach Korrektur keine React-Fehler im erneut geprüften Browserlog.

Browser-Matrix: vier Discoveryseiten in DE/EN bei 320/375/768/1440 px; Mein CONNECT, Profil, Für dich und gespeicherte Regeln zusätzlich in DE/EN bei 320/1440 px (48 Seiten-/Viewport-Kombinationen). DOM-Prüfung auf horizontalen Überlauf, noindex und fehlende Übersetzungen; Screenshots erstellt und repräsentative mobile/Desktop-Ansichten visuell geprüft. Zwei gefundene Überläufe (Listing-Fußzeile, deutsche Überschrift der Benachrichtigungsregeln) korrigiert. Doppelte Breadcrumb-Keys bei gleichem Bereichs-/Startseitenziel korrigiert.

Hohe Treffermengen, gleichzeitige Status-/Consent-/Blockänderungen und Lifecycle-Regressionen sind DB-geprüft, nicht als umfangreicher realer Browserbestand behauptet. Vorhandene 7.9-, Workspace-, Opportunity-, Radar-, Intake- und Founder-Suites bleiben Bestandteil des vollständigen DB-Laufs.

## 12. Bewusst offene Public-Rollout-Arbeit

- Spätere Öffentlichkeit braucht neue verständliche Freigaben, Consent-/Revisionsvertrag und bewusste Veröffentlichung vorhandener Inhalte. Keine Öffnung durch Env-Toggle.
- Dann Public-Projektionen, Metadaten, robots/Sitemap, Session-/Blockgrenzen und CTA-Return-Paths erneut gemeinsam prüfen.
- Highlightfenster bleibt zeitlich begrenzt; keine Garantie gleichmäßiger Abdeckung aller Mitglieder. Keine Recommendation Engine, Impact-Kuration, Ads oder Verhaltensrangfolge.
- Suchpagination ist begrenzte Offset-Pagination; keine Volltextengine, Relevanzwertung oder Snapshot-Suche.
- Technisch abgeschickte generische Benachrichtigungen lassen sich nach späterem Statuswechsel nicht zurückholen. Zustellung wird vor dem Sendeschritt neu geprüft; Inhalt steht ausschließlich in der aktuell autorisierten Plattformansicht.
