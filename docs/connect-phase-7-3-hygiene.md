# Phase 7.3 – CONNECT-Hygiene, Sichtbarkeit und Vorschlags-Sicherheit

## Audit und Umfang

Ausgangspunkt: `main` nach Phase 7.2 (`615609c`). Code und laufende lokale DB wurden geprüft; die Phase-7-Dokumente dienten als Orientierung. Keine neuen CONNECT-v2-Features, Highlightarten oder Lifecycle-Aktionen.

## F4 – Highlights

Bisher lud `getConnectHighlights()` bis zu 30 neueste aktive Listings, Ventures und Profile, ohne `suggestable` oder Blockierungen zu berücksichtigen. Listings sind Gesuche oder Angebote; Probleme sind heute **keine** Highlightart. Der Besitzer eines Listings/Ventures musste nicht unter den 30 geladenen Personen sein. Die Auswahl erfolgt weiterhin zufällig und nach Objektarten gemischt, standardmäßig drei Karten.

Neu werden die Besitzer **aller geladenen Kandidaten** gemeinsam über `get_connect_highlight_owners(uuid[])` geprüft. Die DB leitet den betrachtenden Account aus `auth.uid()` ab und verlangt:

- aktive CONNECT-Mitgliedschaft des Betrachters und des Besitzers;
- aktives Besitzerprofil und `suggestable = true`;
- keine Blockierung in irgendeiner Richtung, über das bestehende `is_network_interaction_blocked()`.

Nur Kandidaten mit einem so autorisierten Besitzer kommen in die Auswahl. Ein Fehler bei dieser Abfrage erzeugt keine Highlights. Besitzer außerhalb des Profilfensters werden ebenfalls geprüft und korrekt zugeordnet. Die bisherigen Status-/Ablaufzeitfilter auf den Objekten bleiben bestehen; eigene Inhalte werden nur mit derselben Freigabe berücksichtigt.

Die RPC ist `SECURITY DEFINER` mit leerem `search_path`, weil die bestehende Block-Hilfsfunktion absichtlich nicht direkt für Clients ausführbar ist. Ihre allgemeinen Grants wurden nicht erweitert. Die Projektion liefert nur autorisierte aktive CONNECT-Profile, die aktive Mitglieder schon über die bisherige Profilabfrage lesen können. Keine Änderung der allgemeinen Profil-/Inhalts-RLS und keine neue Blocking-Tabelle.

Das 30-neueste-Fenster bleibt bewusst erhalten. Nach dem Sicherheitsfilter kann die Highlightsektion weniger Karten oder gar keine enthalten; es wird nicht auf ältere unbeschränkte Bestände ausgewichen. Die gewöhnliche Verzeichnissichtbarkeit wird durch `suggestable` nicht verändert.

## F5 – Gespeicherte Suchen und Versand

Der vollständige aktuelle Weg:

1. Listing-/Problem-Action speichert/veröffentlicht den Inhalt.
2. `notifySavedSearchMatches()` lädt Kriterien über `list_saved_searches_for_matching` und freigegebene Capability-Angaben.
3. `savedSearchMatching.ts` prüft die Suchkriterien rein fachlich im Speicher.
4. `claim_saved_search_hit` reserviert den Treffer in `saved_search_hits` als Duplikatschutz.
5. Benachrichtigungspräferenz, Empfängerauflösung und `sendSavedSearchEmail()`.

**Kein Saved-Search-Cron und keine Warteschlange:** Vorhandene Hits enthalten nur Such-ID, Objektart/-ID und Zeitpunkt. Sie speichern keine Mailpayloads und werden später von keinem Versandjob gelesen. `web/vercel.json` ruft täglich `/api/cron/connect-suggestions` auf; dieser getrennte Vorschlagsweg liest `connect_suggestions`, nicht `saved_search_hits`, und versendet nur eine Anzahl statt Inhaltstiteln.

Die bisherigen RPCs prüften weder Blockierung/Mitgliedschaft noch beim Claim den tatsächlichen Inhaltseigentümer. Neu:

- Für CONNECT erlaubt `list_saved_searches_for_matching` nur den tatsächlichen angemeldeten Publisher und filtert nach aktiven Mitgliedschaften und beidseitiger Blockfreiheit.
- `get_connect_saved_search_delivery(search_id, kind, subject_id)` autorisiert den konkreten Treffer anhand aktueller Daten: eigener Inhalt des angemeldeten Publishers, aktive Mitgliedschaften beider Seiten, aktives Besitzerprofil, aktives und nicht abgelaufenes Listing bzw. aktives Problem, passende CONNECT-Suche mit eingeschalteter Benachrichtigung und passender Objektart, keine Selbstbenachrichtigung und keine Blockierung.
- `claim_saved_search_hit` verwendet diese Prüfung **vor** dem CONNECT-Insert. Nicht berechtigte Aufrufe erzeugen keinen Hit.
- Unmittelbar **vor dem Mailaufruf**, nach Claim, Präferenz- und Empfängerauflösung, fragt die App diese RPC erneut. Fehler, fehlende Freigabe oder abweichender Empfänger verhindern den Versand. Titel und interner Pfad stammen aus dieser aktuellen DB-Projektion statt aus dem vorherigen Action-Payload.

Ein gespeicherter Hit ist somit kein Versandrecht. Nach Block, Suspendierung, Pause, Ablauf, Rückzug, Lösung oder Löschung wird nichts mehr autorisiert. Die bestehenden Hits müssen dafür nicht gelöscht werden. Suchkriterien-Matching und Mailinfrastruktur wurden nicht neu gebaut; externe Mails sind weiterhin eine best-effort Beigabe zum erfolgreichen Veröffentlichen.

**Öffentliche Inhalte:** CONNECT-Suchmails verweisen weiterhin auf Mitgliederrouten. Deshalb bleiben alle CONNECT-Suchbenachrichtigungen aktiven Mitgliedern vorbehalten, auch bei `visibility = public`. Öffentliche Veröffentlichung nimmt suspendierte Accounts nicht wieder in Benachrichtigungen auf. Aktive Mitglieder können öffentliche und `members_only`-Inhalte erhalten. Die eigenständigen öffentlichen Slug-Seiten behalten ihre bestehenden Zugriffsregeln.

Der gemeinsam verwendete FIND-Profil-Claim bleibt für Discovery-Suchen kompatibel; es wird keine CONNECT-Mitgliedschaft für FIND-only-Accounts eingeführt. Keine Änderung der FIND-Mailarchitektur oder ihrer Produktregeln.

Die letzte DB-Prüfung und die Übergabe an einen externen Mailprovider sind keine gemeinsame atomare Transaktion. Eine bereits an den Provider übergebene Mail kann nicht zurückgerufen werden. Es wird weder eine Queue noch ein neues Zustellsystem eingeführt.

## F6 – Dismiss statt beliebiger Änderungen

`connect_suggestions_update_own` schützte nur die Zeilenzugehörigkeit; der Empfänger konnte sämtliche eigenen Systemspalten ändern. Der einzige bestehende App-Schreibweg ist das Wegklicken.

Neue RPC `dismiss_connect_suggestion(uuid)`:

- verwendet ausschließlich `auth.uid()` als Empfänger;
- setzt nur `dismissed_at`, serverseitig, wiederholt idempotent;
- verweigert fremde und nicht vorhandene IDs mit demselben Fehler;
- hat keinen frei übergebenen Empfänger, Timestamp oder Systempayload.

Die Action verwendet diese RPC. Die breiten Update-/Delete-Policies und die Clientrechte für INSERT/UPDATE/DELETE wurden entfernt; die vorhandene eigene SELECT-Policy bleibt bestehen. Direkte Löschung wäre außerdem ein Umgehen des vorhandenen Duplikatschutzes. Service-/Definer-Schreibwege für Erzeugung und Benachrichtigungsstempel bleiben gültig. Anon erhält weder Tabellen- noch Dismiss-RPC-Zugriff.

## F7 – Indexierung und Sitemap

Ein kleines Layout ausschließlich unter `app/(product)/connect` setzt `noindex, nofollow` für alle dortigen Mitgliederseiten einschließlich Detail-/Bearbeitungsseiten. Die öffentlichen Seiten unter `app/(public-connect)/connect/{p,l,pr}/[publicSlug]` erben dieses Layout **nicht** und behalten `index, follow`, sofern ihre vorhandene Public-RPC das Objekt freigibt.

`robots.ts` ergänzt Disallows für `/connect/problems`, `/connect/people`, `/connect/ventures`, `/connect/searches` und `/connect/suggestions`. Der vorhandene exakte `/connect$`-Eintrag und die öffentlichen Allows bleiben erhalten; kein pauschales `/connect`-Disallow.

`sitemap.ts` bleibt dynamisch und nutzt `list_public_network_sitemap()`. Die aktuelle DB-Funktion ist bereits korrekt und wurde nicht geändert:

- Profile: öffentlich, aktiv, aktive Mitgliedschaft;
- Listings: öffentlich, aktiv, nicht abgelaufen, aktiver Besitzer mit aktiver Mitgliedschaft; Profil muss selbst nicht öffentlich sein;
- Probleme: öffentlich und aktiv, aktiver Besitzer mit aktiver Mitgliedschaft **oder** nach bestehender Accountlöschregel bewusst erhaltenes anonymisiertes Problem ohne Autor.

Drafts, pausierte/abgeschlossene Listings, zurückgezogene/gelöste Probleme, `members_only` und interne Routen sind ausgeschlossen. Blockierungen ändern nicht die absichtlich anonyme öffentliche Sitemap.

## F9 – Kleine bestätigte Bereinigungen

- `issueConnectSignupIntent` hatte keine Aufrufer; Funktion, nur dort benutzte TTL-/E-Mail-Normalisierung und `randomBytes`-Import entfernt. Token-Normalisierung sowie Claim/Revoke bleiben für bestehende Auth-Wege erhalten.
- Kein Aufrufer übergab `ConnectHighlightSelection`. Den ungenutzten optionalen Kampagnenfilter mitsamt Typ und Hilfsfunktionen entfernt; keine neue Highlightarchitektur. Bestehende Disclosure-Darstellung bleibt erhalten.
- Kommentar in `connectSuggestionData.ts` an den vorhandenen täglichen Cron und separat opt-in Mailweg angepasst.
- `list_network_conversations()` war sogar über PUBLIC ausführbar. EXECUTE für **PUBLIC und anon** entfernt, authenticated/service_role beibehalten. Anonymer Zugriff wird in pgTAP geprüft.
- `CLAUDE.md`: Existenz von `web/vercel.json` und täglichem CONNECT-Vorschlags-Cron korrigiert; keine Behauptung, dies sei eine CI-Testpipeline.

## Migration, Security und Rollout

Neue Migration: `20261103120000_connect_hygiene.sql`. Keine historische Migration geändert, keine neuen Tabellen oder Datenfelder. Lokal angewendet. Neue/ersetzte Definer-RPCs haben einen leeren `search_path` und verwenden qualifizierte Objekte; sensible Kontextentscheidungen liegen in der DB. Keine neue Rolle, kein Service-Role-Schlüssel im Client und keine neuen Env-Variablen.

**DB vor Code:** Highlight- und Mailautorisation sowie Dismiss-Action benötigen die neuen RPCs. Zwischen Migration und Code-Deploy ist der alte direkte Dismiss-Schreibweg bereits gesperrt; deshalb Code unmittelbar danach ausrollen. Daten bleiben erhalten, bestehende Such-/Vorschlagszeilen werden nicht umgeschrieben.

Vom Repository-Root, für das bereits korrekt verknüpfte Produktionsprojekt:

```sh
git switch fix/connect-7-3-hygiene
npx supabase db push
git switch main
git merge --ff-only fix/connect-7-3-hygiene
git push origin main
```

Der Push startet den bestehenden Vercel-Git-Deploy. Production-Migration, Merge, Push und Deploy wurden bei der Umsetzung nicht ausgeführt.

## Tests

- Neue pgTAP-Suite `connect_phase_7_3_hygiene.sql`: 73 echte DB-Prüfungen zu Freigabe, beiden Blockrichtungen, aktiven Mitgliedschaften, pausierten Besitzern, Claims ohne bisherige Hits, späterem Rechteentzug bei gespeicherten Hits, Ablauf/Status/Löschung, öffentlichen Inhalten, gefälschter Publisher-ID, Dismiss-only-Rechten, Anon-Grants und Sitemap-Statusmatrix. Alle Fixtures werden zurückgerollt.
- 19 neue App-Tests führen die tatsächliche Highlight-Auswahl und den tatsächlichen Saved-Search-Notification-Flow aus. DB-, Empfänger- und Mailgrenzen sind gemockt; keine externen Mails. Die Tests prüfen u. a. Besitzer außerhalb des 30er-Profilfensters, alle vier aktuellen Highlightarten, Fail-closed, Reihenfolge Claim → Empfänger → erneute Autorisation → Mail sowie Unterdrückung bei inzwischen entzogenem Recht. Bestehende Highlight-/Suggestiontests an die entfernte ungenutzte Option bzw. Dismiss-RPC angepasst.
- Browser mit lokalen Testkonten: drei vorbereitete Karten (Person, Angebot, Venture) mit Freigabe sichtbar; nach `suggestable=false` keine Highlights, Angebot weiterhin im normalen Browse. Blockierung in beiden Richtungen unterdrückt alle drei Karten. Die Zustände wurden für diese Integration gezielt in der lokalen DB gesetzt; der Profil-Schalter bzw. Block-Dialog wurde in dieser Phase nicht erneut vollständig durchgeklickt.
- Dismiss wurde tatsächlich über „Nicht interessant“ im Browser ausgeführt: Karte verschwindet, Leerzustand erscheint, DB zeigt `dismissed_at` gesetzt und unveränderte `matched_terms`.
- Tatsächliche HTTP-Antworten im angemeldeten Browser: `/connect`, `/connect/problems`, `/connect/people`, `/connect/ventures`, `/connect/searches`, `/connect/suggestions` mit `noindex, nofollow`; vorhandene öffentliche Testobjekte unter `/connect/p/`, `/connect/l/`, `/connect/pr/` mit `index, follow`. Ausgeliefertes robots.txt enthält die gezielten Disallows; Sitemap enthält die drei öffentlichen Testobjekte und keine interne Testobjekt-Route.
- Bei erstmaligem parallelen Dev-Kompilieren trat einmal `frame.join is not a function` für `/connect/searches` auf. Der anschließende einzelne Browseraufruf und erneute HTTP-Abruf waren erfolgreich (200, korrekte Metadaten); keine Codeänderung außerhalb des Scopes daraus abgeleitet.
- Temporäre Profile, Listings, Venture, Problem, Suggestion und Blockierungen entfernt; bestehende Accounts und Mitgliedschaften erhalten. Browser und Dev-Server beendet. Keine echten externen Testmails.

Abschluss:

- `npm run ci:check`: erfolgreich (TypeScript, **2.659 App-Tests**, Produktionsbuild, **1.557 DB-Prüfungen in 129 Dateien**).
- Separat `npx supabase test db`: ebenfalls erfolgreich, **1.557 Prüfungen / 129 Dateien**.
- `git diff --check`: erfolgreich. Bereits vorhandene Build-/Lint-Warnungen außerhalb der geänderten Dateien bleiben bestehen.

## Bewusst offene F8-Lifecycle-Fragen

Unverändert offen bleiben: „Entwurf speichern“ nimmt aktive Profile/Einträge vom Netz; Wiederherstellung zurückgezogener/gelöster Probleme; Löschen von Einträgen; Löschen von CONNECT-Profilen. Diese Phase führt keine entsprechenden Aktionen oder Produktentscheidungen ein.
