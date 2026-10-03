# Phase 7.6 – Private CONNECT-Problem-Arbeitsräume

## Ausgangspunkt und Scope

Geprüft wurden die CONNECT-v2-Dokumente, der Code auf `main` einschließlich Phase 7.5b sowie die laufende lokale DB. `network_problems` ist weiterhin das veröffentlichbare CONNECT-Problem mit `members_only`/`public`; es wurde weder um eine private Sichtbarkeit erweitert noch als Workspace-Speicher verwendet. Die vorhandenen `matching_workspaces` gehören zum älteren Assessment-/Pair-Flow und werden nicht wiederverwendet.

Neu ist eine eigenständige private Arbeitsfläche unter `/connect/workspaces`. Sie hat keine Discovery-, Sitemap-, Highlight-, Saved-Search- oder Suggestions-Anbindung. Alle untergeordneten Routen sind `noindex, nofollow`, mit `no-referrer`; `robots.ts` sperrt den Bereich zusätzlich. Öffentliche CONNECT-Routen bleiben unverändert.

## 1. Datenmodell

Additive Migration: `20261105120000_private_problem_workspaces.sql`. Keine historische Migration verändert.

| Tabelle | Zweck |
| --- | --- |
| `network_problem_workspaces` | ID, Owner, Arbeitstitel, Beschreibung, `active`/`archived`, optionale `source_problem_id`, Zeitstempel |
| `network_problem_workspace_members` | Explizite Mitgliedschaft mit `contributor` oder `viewer`; eindeutiges Paar Workspace/User |
| `network_problem_workspace_entries` | Typisierter Beitrag mit Session-Autor, Inhalt, optionaler Quelle und Zeitstempeln |
| `network_problem_workspace_invites` | E-Mail-gebundene, befristete Einladung mit Rolle, Token-Hash und Claim-/Widerrufszustand |

Der Owner steht ausschließlich am Workspace. Es gibt keinen schreibbaren `owner`-Mitgliedschaftswert und keinen Ownership-Transfer. Status und Rechte sind vom öffentlichen Problem unabhängig.

## 2. Rollen und Oberfläche

| Aktion | Owner | Contributor | Viewer |
| --- | --- | --- | --- |
| Workspace, Mitglieder und Beiträge lesen | Ja | Ja | Ja |
| Arbeitstitel/Beschreibung bearbeiten | Ja | Nein | Nein |
| Eigene Beiträge erstellen/bearbeiten/löschen | Ja | Ja | Nein |
| Fremde Beiträge bearbeiten | Nein | Nein | Nein |
| Fremde Beiträge moderierend löschen | Ja | Nein | Nein |
| Einladen, rotieren, widerrufen | Ja | Nein | Nein |
| Rollen ändern, Mitglieder entfernen | Ja | Nein | Nein |
| Archivieren | Ja | Nein | Nein |

Beiträge bleiben eindeutig einer Person zugeordnet. Auch der Owner kann fremde Aussagen nicht unter deren Namen umschreiben. Löschen, Entfernen und Archivieren benötigen in der UI eine ausdrückliche Bestätigung.

Die CONNECT-Navigation enthält „Deine Arbeitsräume“. Übersicht: Titel, Rolle, Status, letzter Änderungsstand. Im Raum: Arbeitsfrage, Mitglieder, Owner-Einladungen und fünf Beitragsgruppen mit optionaler Einstiegshilfe. Reihenfolge und Beitragstypen sind frei wählbar. DE und EN sind vollständig vorhanden.

Neue Räume können nur aktive CONNECT-Mitglieder erstellen. Eingeladene Personen ohne CONNECT-Mitgliedschaft erhalten ausschließlich Zugang zu diesem Raum. Eine vorhandene suspendierte/inaktive CONNECT-Mitgliedschaft verhindert den Zugriff; eine Einladung umgeht diese Sperre nicht.

## 3. Einladungen

Eigene zweckgebundene Tabelle; keine Umdeutung von Advisor-, Founder- oder Team-Invites. Wiederverwendet werden das bestehende Login-/Registrierungs-Return-Path-Muster, `getPublicAppOrigin()` und das vorhandene Resend-REST-/Env-Muster.

1. Owner wählt E-Mail und Contributor/Viewer.
2. Server erzeugt 24 kryptographisch zufällige Bytes; ausschließlich SHA-256 wird gespeichert. Laufzeit: 14 Tage.
3. Nach erfolgreichem DB-Insert wird die generische Einladung versendet. Weder Arbeitstitel noch Beiträge, Quellen oder Mitgliederliste stehen in der Mail.
4. Login/Registrierung über den individuellen Link. Es wird kein Account stellvertretend angelegt. Die anonyme Seite verrät keine Raumdaten.
5. Claim prüft `auth.uid()`, die aktuelle bestätigte Auth-E-Mail, Hash, Ablauf, Widerruf, Workspace-Status und Blockierungen. Erst dann entsteht die Mitgliedschaft.
6. Nach Claim wird der Hash entfernt. Replay ist unwirksam; ein später entfernter Nutzer kann den alten Link nicht erneut verwenden.

Rotation ersetzt den Hash und setzt eine neue Frist; der alte Link ist sofort ungültig. Auch eine abgelaufene, noch nicht widerrufene Einladung kann rotiert werden. Widerrufene Einladungen bleiben widerrufen. Höchstens 30 neue Einladungen pro Raum/Tag; wiederholte Rotation frühestens nach einer Minute. Bereits vorhandene Accounts werden ebenfalls ausschließlich per E-Mail und Claim aufgenommen.

Bei fehlender Mailkonfiguration oder Providerfehler bleibt die Einladung bestehen. Der Owner erhält den neu erzeugten Link zur manuellen Weitergabe an die eingeladene Adresse; der Link allein reicht ohne passende bestätigte E-Mail nicht. Roh-Token werden nicht später aus der DB ausgelesen. Es gibt keine Inhalts-/Token-Logs im neuen Anwendungscode und keinen externen Mailaufruf in Tests.

## 4. Entry-Modell und Quellen

Genau fünf Typen: `observation`, `perspective`, `assumption`, `approach`, `test`. Autor wird ausschließlich durch `auth.uid()` gesetzt. Updates prüfen zusätzlich Workspace, Rolle und Autor; manipulierte fremde Entry-IDs schaffen keine Rechte.

DB-Grenzen: Titel 1–160 Zeichen, Beschreibung höchstens 3.000, Beitrag 1–6.000, Quellenlabel 1–200, Quellen-URL höchstens 2.048. Quelle nur für Observation/Perspective, optional. DB lässt ausschließlich HTTP(S) ohne Zugangsdaten/Whitespace zu; die Darstellung validiert zusätzlich mit `URL` und zeigt ausschließlich sichere HTTP(S)-Links mit `noopener noreferrer nofollow`. Es findet kein Abruf/Scraping statt. Quellen sind Kontext, kein Validierungsnachweis.

## 5. Verbindung zu veröffentlichten Problemen

Bei einem eigenen aktiven CONNECT-Problem gibt es „Privaten Arbeitsraum erstellen“. Der RPC prüft die Urheberschaft nochmals und speichert lediglich die optionale Referenz `source_problem_id`. Titel/Beschreibung werden bewusst separat eingegeben. Fremde Probleme können nicht als eigene Quelle angebunden werden.

Der Problem-Datensatz bleibt unverändert. Der Workspace erteilt keine zusätzlichen Leserechte am Problem oder anderen CONNECT-Objekten; deshalb erhält nur der Owner den Quell-Link im Workspace-Read. Wird das Problem gelöscht, wird die Referenz `NULL`, der Raum bleibt bestehen. Es gibt keine automatische Synchronisation oder Veröffentlichung.

## 6. RLS und Security

Alle vier Tabellen haben RLS und **keine direkten Tabellenrechte** für `anon`, `authenticated` oder `PUBLIC`. Zugriff ausschließlich über eng begrenzte authentifizierte RPCs. `SECURITY DEFINER` verwendet `search_path = ''` und qualifizierte Referenzen. Die zentrale interne Rollenfunktion `problem_workspace_role()` sowie der Löschtrigger sind nicht für Clients ausführbar.

Jeder Read prüft die aktuelle Mitgliedschaft erneut; Server Components und Actions verwenden den Session-Client, keinen Service-Role-Bypass. Nichtmitglieder erhalten keine Workspace-Inhalte. Schreib-RPCs sperren zuerst die Workspace-Zeile; Claim, Rotation, Archivierung und Mitgliederentfernung werden damit pro Raum serialisiert. Rollenänderungen und Entfernung wirken beim nächsten serverseitigen Read/Write unmittelbar. Bereits heruntergeladene Inhalte können technisch nicht zurückgeholt werden.

Die bestehende beidseitige Funktion `is_network_interaction_blocked()` wird wiederverwendet. Einladungen und Claims sind bei einer Blockierung mit Owner oder einem aktuellen Mitglied gesperrt. Nachträgliche Blockierungen entziehen betroffenen Nicht-Ownern den Raumzugang. Der Owner behält die Möglichkeit, Mitglieder zu verwalten; Beiträge einer mit ihm blockierten Person werden ihm nicht ausgeliefert. Keine neue Blocking-Tabelle oder neue CONNECT-Kommunikationsrechte.

Mitglieds-Reads enthalten nur ID, Anzeigename und Rolle. Einladungsempfängeradressen sieht ausschließlich der Owner; Token-Hashes erscheinen in keinem Read. Generische Fehlertexte geben keine DB- oder privaten Inhaltsdetails aus.

## 7. Archivierung, Entfernung und Account-Löschung

Archivierte Räume bleiben ausschließlich berechtigten Personen lesbar. Beiträge, Metadaten und neue Einladungen sind dann gesperrt; ausstehende Einladungen werden atomar widerrufen. Owner können weiterhin Rollen ändern und Personen entfernen. Wiederherstellung ist im MVP nicht enthalten.

Mitgliedschaftsentfernung löscht keine historischen Beiträge, entzieht aber sofort zukünftige Reads/Writes. Die Urheberschaft bleibt sichtbar; der Owner kann Beiträge im aktiven Raum moderieren.

Bestehende Auth-Account-Löschung wird durch Foreign Keys ergänzt:

- Owner gelöscht: gesamter privater Raum einschließlich Mitglieder, Beiträge und Einladungen wird kaskadierend gelöscht. Kein herrenloser Raum.
- Contributor/Viewer gelöscht: Mitgliedschaft, eigene Beiträge und angenommene Einladungen werden gelöscht.
- Ein zusätzlicher Auth-Löschtrigger entfernt auch noch nicht angenommene Einladungen an die gelöschte Auth-E-Mail.

Es entsteht nie eine öffentliche Ersatzdarstellung. Kein neues Ownership-Transfer- oder Aufbewahrungsprodukt.

## 8. Tests

`supabase/tests/problem_workspaces.sql` enthält 100 echte pgTAP-Prüfungen, lokal bestanden: Owner/Contributor/Viewer/Nichtmitglied/anon, keine direkten Tabellenrechte, fremde Workspace-/Entry-IDs, Rolleneskalation, eigene/fremde Beiträge, alle Typen, Textgrenzen, Quellen, Einladungen für bestehende und erst später angelegte Accounts, bestätigte/falsche E-Mail, Ablauf/Rotation/Widerruf/Replay, Archivierung, Demotion/Removal, Blockierungen beidseitig sowie zwischen Gästen, suspendierte Mitgliedschaft, Account-Löschung, unverändertes Quellproblem und Sitemap-Ausschluss.

Sieben neue App-Tests: Session-Autor statt Client-Identität, sichere Quellenlinks, DE/EN-Typen und Texte, exakte Signup-/Return-Pfade für Gäste, robots, generische Mailinhalte und gemockter Resend-Versand einschließlich Fehler/fehlender Konfiguration.

Browser mit drei isolierten lokalen Accounts, davon ausschließlich Owner mit CONNECT-Mitgliedschaft:

- Owner erstellt Raum und Observation mit Quelle; erstellt zwei E-Mail-Einladungen über die echte Oberfläche.
- Contributor claimt, erstellt und bearbeitet eine Perspective; fremde Aussage nicht bearbeitbar, keine Einladungskontrolle.
- Viewer claimt, liest beide Beiträge, hat keine Schreib-/Einladungskontrollen.
- Owner bearbeitet Arbeitsfrage/Titel, löscht fremden Beitrag, entfernt Contributor; dieser erhält danach keine Raumdaten.
- Owner archiviert; Viewer kann weiter lesen, Editor/Einladungsformular sind verschwunden.
- Anonymer Direktaufruf landet beim Login ohne private Inhalte. `noindex, nofollow` im Browser geprüft; keine Anwendungs-Browserfehler in den erfolgreichen Flows.
- Owner, Contributor und Viewer bei 320, 375, 768 und 1.440 px Breite, 650 px Höhe: Screenshots und DOM-Überlaufprüfung; DE/EN geprüft. Mobile Darstellung zusätzlich visuell kontrolliert.

Browser-Mailversand war explizit deaktiviert, die erzeugten Einladungslinks wurden lokal verwendet. Kein echter externer Mailversand. Falsche/unbestätigte E-Mail, neuer Account erst nach Einladung, Ablauf/Rotation/Widerruf/Replay, Blockierung und Account-Löschung sind DB-geprüft, nicht als zusätzliche Browserfälle behauptet. Lokale Browser-Testaccounts, Raum und Token-/Auth-Dateien wurden anschließend entfernt.

Abschließende Gesamtprüfungen:

- `npm run ci:check`: bestanden; TypeScript, 2.694 App-Tests, Production-Build und 1.759 DB-Tests in 131 Dateien. Bestehende Build-/Lint-Warnungen außerhalb dieses Scopes bleiben bestehen.
- `npx supabase test db`: zusätzlich separat bestanden, 1.759 Tests. Enthält die bestehenden Regressionstests für CONNECT-Probleme, Listings, Ventures, Highlights, Saved Searches, Suggestions und Blocking sowie die übrigen Legacy-Flows.
- `git diff --check`: bestanden.

## 9. Bewusste Grenzen und Phase 7.7

Kein Publish, Opportunity, Venture-Erzeugen, Radar, Recommendation, Sponsoring, Organisation-Workspace, Like/Vote, Kommentar, Upload, KI oder Projektmanagement. Keine Änderungen an Assessment-Instrumenten oder Legacy-Invites. Kein selbstständiger Austritt, Ownership-Transfer, Wiederherstellung archivierter Räume oder Edit-Verlauf im MVP. Die Übersicht und der Raum sind zunächst ohne Pagination; eine spätere Größenbegrenzung/Paginierung muss dieselben Rechte einhalten.

Phase 7.7 kann eine bewusste Veröffentlichung als separate Auswahl/Kopie ergänzen. Mitgliedernamen, private Beiträge und Quellen dürfen dabei nicht automatisch kopiert oder öffentlich gemacht werden. Die private Mitgliedschaft verleiht keinerlei Publikationszustimmung. Die optionale Problemreferenz bereitet nur die Zuordnung vor.

## 10. Betrieb und Deployment

Keine neuen Env-Variablen. Wiederverwendet: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, optional `RESEND_FROM_NAME`/`RESEND_REPLY_TO_EMAIL`, und die bestehende öffentliche App-Origin-Konfiguration (`NEXT_PUBLIC_SITE_URL`, danach bestehende Fallbacks in `getPublicAppOrigin`). In Vercel nur prüfen, dass vorhandene Mail- und Origin-Werte für Production korrekt gesetzt sind. Ohne Mailkonfiguration funktioniert der manuell weitergebbare, E-Mail-gebundene Einladungslink.

**DB vor Code: ja.** Die neue UI benötigt die neuen RPCs. Nach Prüfung des verknüpften Supabase-Zielprojekts im Repository-Root:

```sh
git switch codex/phase-7-6-problem-workspace
npx supabase db push --dry-run
npx supabase db push
git switch main
git merge --ff-only codex/phase-7-6-problem-workspace
git push origin main
```

Der Push auf `main` löst den bestehenden Vercel-Deploy aus. Bei inzwischen fortgeschrittenem `main` stoppt `--ff-only`; dann zunächst integrieren und erneut prüfen. In dieser Umsetzung wurde nur die lokale Migration angewendet, kein Production-DB-Push oder Deployment ausgeführt.
