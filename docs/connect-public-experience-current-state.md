# CONNECT Public Experience & Highlights – Ist-Zustand (7.10a)

## Auditbasis und Grenzen

Audit am 03.10.2026, ausschließlich lesend an Anwendung und lokaler Datenbank. Auditbasis ist Commit `64328b7` (Phase 7.9), Dokumentationsbranch `codex/phase-7-10a-public-experience-spec`. Zu Auditbeginn standen lokales `main` und der lokal gespeicherte `origin/main` noch auf `abfc880` (7.8c); deshalb wurde zunächst der vollständige 7.9-Branch verwendet. **Während des Audits wurden main und origin/main außerhalb dieser Dokumentationsarbeit auf `64328b7` aktualisiert. Der abschließend geprüfte main-Code ist damit identisch zur Auditbasis.** Durch 7.10a kein Remote-Fetch oder Merge; keine Behauptung über den aktuellen Production-Deploy.

Die laufende Supabase-DB `supabase_db_cofoundery-app` enthält Migrationen bis `20261109140000`. Geprüft wurden tatsächliche Funktionsdefinitionen, Tabellen, RLS, Grants und Trigger aus ihrem Schema-Dump; historische Migrationen dienen als auffindbare Repository-Belege. Die Versionsnummern sind Repository-IDs, keine Datierung dieses Audits.

Eine Read-only-Aggregatabfrage ergab **jeweils null Profile, Listings, Probleme und Venture-Darstellungen**. Deshalb keine Aussage über reale Tagqualität, Produktionsvolumen, Verteilung öffentlicher Inhalte oder tatsächlich gefüllte Browseransichten. Keine Fixtures angelegt, keine Generierungs-RPC ausgeführt, keine Mail ausgelöst. Kein Browser-E2E und keine CI-/pgTAP-Ausführung in dieser reinen Dokumentationsphase. Responsive-Verhalten wird aus Komponenten beschrieben, nicht als visuell bestanden erklärt.

Ergebnis: Eine geschützte Mitglieder-Discovery und öffentliche Einzelansichten existieren. Ein öffentlicher CONNECT-Browse-Einstieg existiert noch nicht. Neutrale Highlights sind implementiert; redaktionelle, Impact- und Werbeplatzierungen sind es nicht.

## 1. Einstieg und Zuschauerzustände

`requireConnectMember(next)` prüft Session und `is_network_member()`, nicht zusätzlich einen aktiven eigenen Profilstatus. Ohne Session: `/login?next=…`. Ohne aktive Mitgliedschaft: bei vorhandenem CONNECT-Konto `/account`, sonst `/dashboard`.

| Zuschauer | `/connect`, People/Problems/Listings/Ventures, `/connect/my`, Searches/Suggestions | Öffentliche `/connect/p/…`, `/l/…`, `/pr/…` | Eigene Sichtbarkeit / Interaktionen |
| --- | --- | --- | --- |
| Anonym | Login-Weiterleitung, keine Discoverydaten | Aktuell public-freigegebene Projektion lesbar; sonst 404 | Kein Schreiben/Kontakt ohne Zugang |
| Eingeloggt, nie CONNECT beigetreten | Dashboard statt CONNECT-Browse | Gleiche öffentliche Projektion | Beitritt/Onboarding erforderlich |
| Aktives CONNECT-Mitglied, aktives Profil | Mitglieder-Discovery inklusive public und members_only | Öffentliche Projektion plus teilweise Mitglieder-CTA | Normale aktuelle Rechte, Blocks und Lifecycle gelten |
| Aktive Mitgliedschaft, Profil draft/paused | Browse bleibt erreichbar; kein automatischer Austritt | Fremde public-Inhalte weiterhin lesbar; eigenes Profil nicht öffentlich | Eigenes Profil für andere verborgen; Discoveryzugang ist nicht gleich Veröffentlichungs-/Interaktionsberechtigung |
| Freiwillig inactive | Mitgliederseiten → Account | Wirklich öffentliche fremde Inhalte bleiben öffentlich | Austritt zieht eigene Inhalte zurück; Rückkehr veröffentlicht sie nicht wieder |
| Administrativ suspended | Mitgliederseiten → Account; kein Selbst-Restore | Public-Projektionen bleiben grundsätzlich anonym zugänglich | Eigene Inhalte durch Owner-Mitgliedschaftsprüfung verborgen; Suspension bleibt administrativ |

Blockierungen schützen die mitgliederbezogenen Datenpfade beidseitig. Sie können öffentlich freigegebenen Inhalt nicht gegen einen ausgeloggten Besucher geheim machen. Eine konkrete Inkonsistenz bei eingeloggten Besuchern öffentlicher Slugs steht in Abschnitt 10.

### Tatsächliche `/connect`-Hierarchie

1. Titel „Connect“, Orientierungssatz, bedingter Kontakt-/Nachrichtenhinweis.
2. „Selbst etwas einstellen“: Gesuch, Angebot, Co-Founder finden. Letzterer ist ein bestehender FIND-/Onboarding-Verweis, kein CONNECT-Matching.
3. „Aus dem Netzwerk“: bis zu drei Highlights.
4. „Schauen, was da ist“ und Objekt-Tabs.
5. Listing-Suche und ausklappbare Filter; separater Block zum Speichern einer Suche.
6. Neueste aktive Listings beziehungsweise Empty State.

Damit ist `/connect` **eine Listing-Browseseite mit gemischtem Highlight-Bereich und Erstell-CTAs**, kein personalisierter Feed, kein eigener öffentlicher Auftritt und nicht das Verwaltungsdashboard.

### Navigation und eigene Dinge

- Discovery-Tabs: „Menschen“, „Unternehmen“, „Angebote & Gesuche“, „Ungelöstes“; zusätzlich private Arbeitsräume. Tabs haben Bestandszähler, Arbeitsräume nicht.
- Produktnavigation zeigt CONNECT bei `hasConnect`; Unterpunkte: eigenes CONNECT-Profil, eigene Einträge, eigene Unternehmen/Venture-Darstellungen, „Für dich“ mit Suggestion-Zähler.
- `/connect/my`: Listings nach active/paused/draft/completed; abgelaufene aktive Listings werden unter abgeschlossen einsortiert. Zusätzlich eigene Probleme inklusive inaktiver Zustände. Keine Gesamtübersicht aller persönlichen CONNECT-Objekte.
- `/connect/ventures/mine`: persönliche CONNECT-Darstellungen verwalten. `/connect/profile`: eigenes Profil bearbeiten/veröffentlichen. Ohne Profil gibt es ein Formular, keinen erfundenen fertigen Profileintrag.
- Gespeicherte Suchen sind über den Suchblock erreichbar, nicht als gleichrangiger Unterpunkt in dieser CONNECT-Navigation. Private Arbeitsräume stehen dagegen neben öffentlichen/member-basierten Objekt-Tabs: fachliche Ebenen sind noch vermischt.

## 2. Tatsächliche Objekte und Sichtbarkeit

| Produktobjekt | Kanonischer Discovery-Datensatz | Sichtbarkeit | Öffentliche Darstellung |
| --- | --- | --- | --- |
| Mensch / CONNECT-Profil | `network_profiles` | members_only/public; draft/active/paused | `/connect/p/[publicSlug]` |
| Gesuch / Angebot | `network_listings` | members_only/public; draft/active/paused/completed; Ablauf zusätzlich | `/connect/l/[publicSlug]` |
| Problem | `network_problems` | members_only/public; draft/active/withdrawn/resolved; unabhängige Moderationssperre | `/connect/pr/[publicSlug]` |
| Unternehmen / Projekt / Tätigkeit | `network_ventures` | active/hidden; **keine eigene visibility-Spalte** | Abschnitt am öffentlichen CONNECT-Profil; kein eigener Public-Slug |
| Kanonisches Vorhaben/Team | `founder_teams` + Mitglieder | eigener Founder-/Teamvertrag | Nicht die im CONNECT-Verzeichnis abgefragte Tabelle |
| Workspace / Opportunity / Radar / Team Intake | jeweils eigene private/interne Modelle | explizite Berechtigungen | Keine Discovery-/Highlight-Kandidaten |

`network_ventures` hat weder `founder_team_id` noch eine automatische kanonische Team-Verknüpfung. „Als Vorhaben weiterentwickeln“ aus Phase 7.7 erzeugt/verknüpft dagegen `founder_teams`. Die zwei Darstellungen dürfen in einer neuen Navigation nicht als automatisch identische Objekte versprochen werden. Keine neue Venture-Tabelle erforderlich oder empfohlen.

## 3. Highlights: vollständiger Auswahlvertrag

Implementiert in `connectHighlightData.ts` und `ConnectHighlight.tsx`, mit DB-Helfer `get_connect_highlight_owners(uuid[])`. Keine Highlight-Tabelle, kein redaktionelles Planungsobjekt und keine Highlight-Ranking-RPC.

1. Session-Client liest unter RLS höchstens **30 neueste aktive, nicht abgelaufene Listings insgesamt**, 30 aktive Venture-Darstellungen und 30 aktive Profile. Listing-/Profil-Reihenfolge nach `published_at`, Ventures nach `created_at`.
2. Listings werden in seeking/offering getrennt. Das 30er-Fenster gilt nicht je Richtung.
3. DB-Ownerprüfung verlangt: angemeldeter aktiver CONNECT-Betrachter, aktives Besitzerprofil, aktive Besitzer-Mitgliedschaft, `suggestable=true`, keine beidseitige Blockierung. Das gilt auch für Besitzer von Listings/Ventures. Fehler oder fehlende Ownerinformation → keine betreffende Karte; Owner-RPC-Fehler → leere Auswahl.
4. Fisher-Yates-Mischung per `Math.random()` für Arten und Kandidaten; anschließend Verteilung über Arten. Standardlimit drei. Vier Arten sind möglich: seeking, offering, venture, person. **Probleme sind nicht enthalten.**
5. Eigene Inhalte sind ausdrücklich zulässig, markiert mit „Von dir“. Kein Höchstwert je Besitzer über verschiedene Arten. Bei vier Arten und drei Plätzen kann nicht jede Art gleichzeitig erscheinen.
6. Keine Stabilität pro Tag/Session, keine Interessenberechnung, kein Klicksignal und keine Qualitätsbewertung. Bei erneutem Render kann sich die Auswahl ändern; eine sichtbare Änderung ist nicht garantiert.

**Wichtig:** Das Kandidatenlimit greift vor dem zusätzlichen Owner-/Suggestable-Filter. Daher kann die Auswahl leer oder klein sein, obwohl ältere erlaubte Kandidaten existieren. Das Fenster ist keine gleichberechtigte Zufallsauswahl aus dem gesamten Bestand. Fehlende Inhalte werden nicht durch private oder inaktive Kandidaten aufgefüllt.

Public und members_only sind innerhalb dieser mitgliedergeschützten Auswahl zulässig. Die Funktion ist **kein anonym verwendbarer Public-Feed**; sie liest vollständige Mitgliedsprojektionen einschließlich interner IDs.

### Labels gegenüber Implementierung

| Bezeichnung | Tatsächlicher Stand |
| --- | --- |
| Highlights / „Aus dem Netzwerk“ / „From the network“ | Neutrale zufällige Auswahl aus begrenztem aktuellen Fenster |
| Entdeckt / redaktionell | Keine Redaktion; `disclosure=editorial` ist nur Typ/Rendering/Übersetzung, alle erzeugten Karten setzen `none` |
| Empfohlen | Nicht Grundlage der Highlights; bestehende persönliche Vorschläge sind separat |
| Impact | Kein entsprechendes Auswahl-/Reviewmodell |
| Anzeige | `sponsored` ist nur vorbereiteter Disclosure-Wert samt Label; keine Zahlung/Platzierung |

## 4. Public Profile ist kein privates Masterprofil

Die Public-RPCs geben explizite Projektionen aus. Öffentliche Profile enthalten Displayname, Headline, Bio, CONNECT-Rollen, Expertise, Branchen, Region, Slug und Änderungszeit. Die Seite zeigt aktive Venture-Darstellungen dieses Profils und dessen aktive **öffentliche** Listings.

- Foto/Avatar: öffentlich **Initialen**, kein Profilfoto. Mitgliederbilder kommen aus privatem Storage über `/api/connect/photos/[userId]` nach Session-, Mitgliedschafts- und Profil-RLS-Prüfung. Keine öffentliche Storage-URL.
- LinkedIn ist eine schmale Ausnahme mit eigener Freigabe: `get_public_network_profile_linkedin` liest nur bei aktivem öffentlichen CONNECT-Profil, aktiver Mitgliedschaft und `person_core.linkedin_visibility='public'` genau die URL. Das ist kein allgemeiner Public-Zugriff auf `person_core`.
- Member-Personenseite ergänzt Kontaktpräferenzen, Remote-Angabe, verknüpfte CONNECT-Inhalte und Kontakt-CTA. Ein privates Masterprofil, Assessmentantworten, ALIGN/FIND-Auswertung oder Founder-Teamreport werden dort nicht eingebunden.
- `suggestable=false` bedeutet kein Hervorheben, **nicht** automatische Unsichtbarkeit im normalen Verzeichnis oder Rücknahme einer ausdrücklich öffentlichen Profilseite.
- Öffentliche Listing-/Problemprojektionen enthalten den Displaynamen und die Headline des aktiven Autors auch dann, wenn dessen Profil selbst members_only ist. Nur der Link zum öffentlichen Profil hängt von dessen public-Freigabe ab. Dies muss bei der Veröffentlichung verständlich sein.
- Anonymisiert erhaltene public-Probleme mit `author_user_id IS NULL` bleiben nach bestehendem Outlives-Account-Vertrag grundsätzlich lesbar. Kein fremdes Profil wird dafür erfunden.

## 5. Cards und Detailansichten

| Karte | Heute sichtbar | Primärer Weg / Lücke |
| --- | --- | --- |
| Person | Mitgliederavatar, Name, Headline, Kontaktformate, bis sechs Expertise-/Branchenbegriffe, Region, Venturezahl | Mitgliederprofil; optional öffentlicher Link. Headline trägt Relevanz, Bio nicht auf Card |
| Listing | Suche/Biete + Kategorie, Titel, Textauszug, bis vier Themen, Orts-/Raumangabe, Remote, Zeitraum, Autor mit Avatar/Headline | Details → Kontakt; keine allgemeine Sichtbarkeitskennzeichnung im Browse |
| Problem | Absicht + Raumbezug, Titel, Beschreibungsauszug, Autor/früheres Mitglied, Bestätigungs-/Interestzahlen, Orte/Themen | Klick auf Titel; Zähler sind nicht die Sortiergrundlage und kein Validierungsnachweis |
| Venture-Darstellung | optionales Logo, Name, Rolle, Tätigkeit, Zielgruppe, Person mit Avatar, Website | eigene Member-Detailseite; Website als zusätzlicher Ausgang. Freitexte weniger kompakt begrenzt als Listingkarten |
| Highlight | Art, Titel, kurzer Text, Owner/Avatar bzw. Inhaltszahlen beim Profil, Eigenmarkierung | Artabhängiger Member-Link; kein Score, kein Problemtyp |
| Suggestion | Art, Titel, Kurztext, konkrete auslösende Begriffe, Details, Dismiss; bei Person Kontakt | Individuelle gespeicherte Vorschläge, kein neutrales Highlight |

Viele CTAs sind vorhanden: suchen/anbieten, erstellen, veröffentlichen, speichern, Details, Kontakt, mitarbeiten, ergänzen. „Unternehmen“ verengt die tatsächlich auch Projekte/Tätigkeiten enthaltende Darstellung. „Ungelöstes“ ist verständlich, aber uneinheitlich mit Problem/Problembrett und internen Typnamen. EN „My connect listings“ ist enger als `/connect/my`, das auch Probleme enthält.

## 6. Suche und Filter: tatsächliche Reichweite

| Objekt | Wirksame Filter | Grenzen |
| --- | --- | --- |
| Listings | q auf Suchtext; Richtung, Kategorie, geographic_scope, remote_mode; zusätzlich topic/industry über URL/Data-Layer | 50 neueste Treffer, keine Pagination. Topic/industry kein regulärer sichtbarer Filter auf `/connect`; Suchtextfeld sichtbar, Apply in Filter-details |
| Personen | Rolle, Kontaktformat, Remote, Region-Teiltext, Expertise, Branche; q über Personenfelder und aktive Venture-Texte | DB begrenzt auf 60 Profile **vor** anschließendem serverseitigem q-Filter. Ältere passende Profile können fehlen. Kein clientseitiger Sicherheitsfilter, aber fachlich unvollständige Suche |
| Probleme | q auf Problem-Suchtext, author_intent, geographic_scope | 50 Treffer; Themen/Branchen gespeichert, aber keine entsprechenden Browse-Controls; kein allgemeiner Region-/Remote-Filter |
| Ventures | q auf Suchtext aus Name/Rolle/Tätigkeit/Zielgruppe/Motivation | 60 Treffer; keine strukturierten Branchen-/Region-/Remote-Daten für neue Filter |

Tabs zählen separat den berechtigt sichtbaren aktiven Bestand, nicht die paginierten oder q-gefilterten Ergebnisse. Ergebnisanzahl und Tabzahl sind daher nicht dasselbe. Freie Expertise-/Branchen-/Themenwerte sind kein nachgewiesen konsistentes Vokabular. Die leere lokale DB erlaubt keine Aussage über praktische Filterabdeckung. Keine neue Taxonomie aus vermuteten Daten ableiten.

## 7. Saved Searches und Suggestions

### Gespeicherte Suchen

`saved_searches` enthält eigene explizite Kriterien, `saved_search_hits` dedupliziert Treffer. CONNECT matcht **Listings und Probleme**, nicht Menschen oder Ventures. Das Formular auf `/connect` setzt beide Inhaltstypen; Richtungs-/Kategorie-/Remote-Kriterien können Probleme faktisch ausschließen. Zusätzlich wählbare Capability-Kriterien entsprechen nicht dem sichtbaren aktuellen Listingfilter.

`savedSearchMatching.ts`: alle gesetzten Kriterien müssen erfüllt sein; innerhalb einer Mehrfachliste genügt eine Überschneidung. Textvergleich ist normalisiert, Remote `flexible` kann Wünsche erfüllen. Kein Score. Capability wird nur nach vorhandener Disclosure verarbeitet, nicht aus privaten Angaben erraten.

Benachrichtigung ist ereignisbezogen beim Veröffentlichen, **kein Saved-Search-Cron**. `list_saved_searches_for_matching`, `claim_saved_search_hit` und unmittelbar vor Versand `get_connect_saved_search_delivery` prüfen den vorhandenen Berechtigungsvertrag. Der letzte RPC verlangt u. a. aktive Mitgliedschaft beider Seiten, aktives Besitzerprofil, aktiven aktuellen Inhalt und keinen Block. Auch public-Treffer werden hier nur an aktive Mitglieder geliefert. Ein gespeicherter Hit ist keine fortdauernde Versandberechtigung.

`/connect/searches` zeigt Kriterien, Scope, Notify an/aus und Löschen. Kein Trefferarchiv und kein „Suche erneut öffnen“-Link. Capability-Kriterien erscheinen dort als IDs. Austritt schaltet CONNECT-notify aus; Rückkehr schaltet es nicht automatisch an.

### Persönliche Vorschläge

`connect_match_terms` bildet normalisierte Begriffe ab drei Zeichen aus aktivem Profil (Expertise/Branchen), eigenen aktiven Gesuchen und Problemen. `generate_connect_suggestions_for` nutzt diese in fester Reihenfolge: **Angebote → Probleme → Ventures → Personen**, jeweils neueste zuerst. Inhalte: Themen-/Branchenüberschneidung, bei Ventures Suchtext-Teilstring. Personen benötigen bei Erzeugung `suggestable=true`. Gesuche werden nicht vorgeschlagen. Höchstens drei neue Datensätze im rollierenden Siebentagefenster; Dismiss setzt das Budget nicht zurück. Keine KI, kein Verhaltenstracking und keine Founder-Kompatibilität.

Erzeugung beim Besuch von `/connect` und `/connect/suggestions` sowie per täglichem Cron `0 7 * * *`, Batch 25, `CRON_SECRET`-geschützt. `prepare_suggestion_notifications` ist service_role-only. Push/Mail folgen vorhandenen Benachrichtigungseinstellungen; E-Mail zusätzlich opt-in. Nachrichten enthalten Anzahl/Link, **keine vorgeschlagenen Personen oder Inhaltstitel**.

Abweichungen:

- DE/EN `suggestions.note` behauptet noch „per E-Mail geht … nichts hinaus“. Das passt nicht zum realen Benachrichtigungspfad; auch der Seitenkommentar zum fehlenden Zeitplan ist veraltet.
- Bestehende Personenvorschläge prüfen beim Read nur active/RLS, nicht erneut `suggestable`. Ein späteres Abschalten kann daher einen bereits gespeicherten Personenvorschlag sichtbar lassen. Der Status-Trigger aus 7.9 reagiert auf Status, nicht auf Suggestable-Änderungen.
- Badge zählt nondismissed Zeilen ohne aktuelle Subject-Prüfung. Notification-Claim stempelt ebenfalls nondismissed/unnotified Zeilen. Blockierte oder abgelaufene Subjects können in RLS-gefilterten Karten fehlen, aber in Zählungen verbleiben.
- Der Problemzweig des Definer-Generators prüft Mitgliedschaft/Block, aber nicht ausdrücklich das aktive Besitzerprofil. Der spätere RLS-Read schützt die fremde Inhaltsausgabe; unbrauchbare Vorschläge können dennoch Budget belegen. Dies ist keine neue Recommendation-Aufgabe, sondern bestehende Konsistenzhygiene.

## 8. Empty States

| Zustand | Heute | Launch-Lücke |
| --- | --- | --- |
| Keine Highlights | Komponente rendert nichts | Kein Fehler; darunter muss Orientierung erhalten bleiben. Kein Fake-Ersatz nötig |
| Keine Listings | Erstbestand und gefiltert getrennt; Gesuch/Angebot/Venture-CTA; Filterreset bei Suche | Zu viele gleichrangige Erstelloptionen prüfen |
| Keine Personen | Erstbestand vs Filter; Profil erstellen bzw. Filterreset | Kein Profil als Pflicht zum bloßen Lesen behaupten |
| Keine Probleme | Erstbestand vs Filter; Problemerstellung, ggf. Reset | Bereits gute Grundstruktur |
| Keine Ventures | Suchleerzustand vs Verzeichnisleerzustand; eigene Darstellung hinzufügen | Expliziter Suchreset und Erklärung fehlen gegenüber anderen Listen |
| Kein eigenes Profil | Profilformular mit Veröffentlichungs-/Draft-Flow | Onboarding-/Rückkehrzustand klar von fehlenden Discoveryinhalten unterscheiden |
| Keine Suggestions | Erklärung + Gesuch einstellen/Profil ergänzen | Keine Garantie einer „Passung“ oder mehr Vorschlägen; aktuelle Mailcopy korrigieren |
| Keine Saved Searches | Erklärung + zurück zur Suche | Umfang Listings/Probleme klar benennen |

## 9. SEO und öffentliche Projektionen

- Mitgliedsseiten liegen unter `(product)/connect/layout.tsx`: geerbtes `noindex,nofollow`. Public-Slugs liegen außerhalb dieses Layouts unter `(public-connect)`.
- Public-Metadaten werden aus denselben schmalen Public-RPCs erstellt: erlaubter Inhalt → `index,follow`, absolute Canonical zur Slug-Seite, objektbezogener Titel und gekürzte Beschreibung. Fehlender/unzugänglicher Inhalt → `noindex,nofollow` und anschließend 404. Fehler werden in diesen Lesepfaden teilweise wie fehlender Inhalt behandelt.
- Keine eigenständige Public-Venture-URL, keine Venture-Sitemapzeile. Öffentliche Darstellung erbt Profilfreigabe.
- `robots.ts` erlaubt `/connect/p/`, `/l/`, `/pr/`; sperrt `/connect$` und die Mitglieder-Unterbereiche. Der Endanker ist wichtig: nicht pauschal `/connect` verbieten. Workspaces, Radar und Intake sind ausgeschlossen und besitzen private/interne Noindex-Verträge.
- `list_public_network_sitemap()` listet ausschließlich public-Profile, aktive unexpired public-Listings und aktive public-Probleme; Besitzerprofil/Mitgliedschaft müssen aktiv sein, mit bestehender Ausnahme anonymisierter erhalten gebliebener Probleme. Kein draft/paused/withdrawn/resolved, keine internen Objekte. Moderationssperre zieht Probleme DB-seitig zurück.
- Root-Sitemap ergänzt nur vorhandene statische öffentliche Seiten. Kein `/connect`-Browse-Eintrag. Kein aufgerufener Collector oder externer Indexierungsdienst.
- Robots/Noindex sind Crawlerhinweise, keine Zugriffsrechte. Die DB-/Sessiongrenzen bleiben maßgeblich. DE/EN basiert hier auf Sprachumschaltung, nicht auf eigenständigen übersetzten Slug-URLs mit Hreflang-Modell.

## 10. Public → Login und verbleibende Grenzfälle

Öffentliche Listing-/Problemseiten bleiben ohne Konto lesbar. Interaktions-CTAs verwenden entweder Member-Detail/Kontakt oder Login/Start mit `next` zur Public-Seite. Login, Magic Link/Code und Callback besitzen einen normalisierten lokalen Return-Path-Vertrag.

Konkrete Lücken aus Codeprüfung:

1. Public-Profil-CTA nutzt `/start?intent=connect` **ohne next**. Die aktuelle Startseite wertet `intent` nicht aus. Das öffentliche Profil geht als Ziel verloren.
2. CONNECT-only-Onboarding erhält einen öffentlichen Listingpfad explizit durch die Profilvervollständigung (`/connect/l/…`), aber nicht analog `/p/…` und `/pr/…`. Auch bereits eingeloggte Nichtmitglieder benötigen einen Beitritts-/Rückkehrweg statt eines erneuten Loginversprechens.
3. `/start` verlangt weiterhin einen Beta-Code. Öffentlich lesen ist nicht dasselbe wie frei registrieren. Ein Launchversprechen „jetzt frei teilnehmen“ wäre derzeit falsch.
4. Public-RPCs prüfen Objekt-/Ownerstatus, **nicht die Blockbeziehung zur aktuellen Session**. Eingeloggte blockierte Personen können die ausdrücklich öffentliche Projektion sehen. Auf der Listingseite kann ein durch RLS nicht auflösbares internes Listing außerdem in den Login-CTA-Zweig fallen. Kein members_only-Leak, aber eine inkonsistente eingeloggte Block-/CTA-Erfahrung. Public-Discovery darf diese RPCs nicht unbesehen als personalisierte Member-Projektion verwenden.
5. `productChromePath.ts` nimmt `/connect/p/` und `/connect/l/`, nicht `/connect/pr/` vom Produkt-Chrome aus. Daraus folgt eine mögliche abweichende Rahmennavigation öffentlicher Probleme, abhängig vom Session-/Shellzustand. Vor Umsetzung browserseitig reproduzieren, nicht als getesteten Darstellungsfehler ausgeben.

## 11. Lifecycle und Moderation als bestehende Grenzen

Fremde Member-Discovery nutzt `connect_owner_visible`: aktive Besitzer-Mitgliedschaft, aktives Profil und kein Block. Venture-RLS erbt diese Grenze über die RLS-geprüfte Profil-Unterabfrage. Eigentümer-Ausnahmen erlauben eigene Verwaltungsreads, auch wenn fremde Nutzer den Inhalt nicht sehen dürfen. Eine Browse-Abfrage mit nur `status=active` kann darum eigene Inhalte eines pausierten eigenen Profils noch zeigen; das ist von einem unzulässigen Fremdread zu unterscheiden und für Discovery bewusst zu behandeln.

Austritt deaktiviert eigene Darstellungen/Inhalte; Reaktivierung veröffentlicht nichts automatisch. Listing-Ablauf, Withdraw/Resolved, Delete, Hidden, problembezogene `moderation_blocked` und suspended-Mitgliedschaften gelten weiterhin. Die vorhandene Moderationsoberfläche verwaltet Meldungen/Status/Notizen, keine allgemeine Inhalts-Sanktionsplattform. Kein erfundener universeller „moderiert“-Status für alle Objekte.

Archivierung privater Workspaces/Opportunities veröffentlicht nichts und zieht bestehende öffentliche Problemfassungen nicht automatisch zurück. Public-Probleme sind bewusste Kopien; private Quellen/Teilnehmer werden nicht über Discovery nachgeladen.

## 12. Analytics

Im geprüften CONNECT-Code und den Public-Routen keine Aufrufe von `ResearchTrackedLink`, `ResearchPageTracker`, `trackResearchEvent` oder `trackServerResearchEvent`; keine CONNECT-Klick-/Impression-/Verweildauermessung und keine Verwendung solcher Signale für Highlights gefunden. Die Anwendung besitzt separat Forschungs-/Produkt-Event-Infrastruktur (`features/research`, `product_analytics_events`), die nicht als CONNECT-Tracking ausgegeben werden darf.

Suggestions speichern operative Zustände (`created_at`, `dismissed_at`, `notified_at`, `suggestions_checked_at`); Saved Searches speichern Trefferclaims; Kontakte/Interests/Nachrichten eigene Vorgänge. Das sind keine nachgewiesenen Klickrankings. Plattform-/Hostinglogs wurden nicht als Production-Analytics auditiert; darüber keine Negativgarantie.

## Quellen im Repository

- Einstieg/Seiten: `web/src/app/(product)/connect/`, `web/src/app/(public-connect)/connect/`.
- Projektionen: `web/src/features/connect/{connectData,connectPeopleData,connectProblemData,connectVentureData,publicConnectData}.ts`.
- Highlights: `web/src/features/connect/connectHighlightData.ts`, `ConnectHighlight.tsx`.
- Vorschläge/Suchen: `connectSuggestionData.ts`, `connectSuggestionActions.ts`, `suggestionNotifications.ts`, `savedSearchData.ts`, `savedSearchMatching.ts`, `savedSearchNotifications.ts` im gleichen Feature.
- Navigation/Auth: `web/src/features/navigation/{ProductShell,productChromePath}.tsx` bzw. `.ts`, `web/src/features/auth/{productEntry,postAuthRedirect,authRedirects}.ts`, `web/src/app/(product)/{start,login}/page.tsx`.
- Texte: `web/messages/{de,en}/connect.json`; SEO: `web/src/app/{robots,sitemap,layout}.ts` bzw. `.tsx`; Cron: `web/vercel.json` und `web/src/app/api/cron/connect-suggestions/route.ts`.
- DB-Verträge: aktuelle installierte Funktionen/RLS, nachvollziehbar u. a. in `supabase/migrations/20261020120000_suggestion_notifications.sql`, Phase-7.3-Migrationen und `20261109120000`/`20261109130000`/`20261109140000`.
- [Lifecycle 7.9](connect-phase-7-9-lifecycle-launch-hygiene.md), [Produktspezifikation](connect-public-experience-product-spec.md), [Umsetzungsplan und Entscheidungen](connect-public-experience-implementation-plan.md).
