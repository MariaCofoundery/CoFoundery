# CONNECT Public Experience & Highlights – Umsetzungsplan (7.10a)

## Auftrag und Ausgangspunkt

Dies ist ein Plan für eine spätere Implementierungsphase. **In 7.10a werden ausschließlich die drei Dokumente erstellt.** Keine Migration, UI-, Auswahl-, Auth-, Tracking- oder Cronänderung.

- [Ist-Zustand und Auditbelege](connect-public-experience-current-state.md)
- [Produktspezifikation und empfohlener Launchvertrag](connect-public-experience-product-spec.md)
- Auditbasis `64328b7`, lokale DB bis `20261109140000`. Main wurde während des Audits außerhalb dieser Dokumentationsarbeit von `abfc880` auf dieselbe Auditbasis aktualisiert. Vor Implementierung den dann aktuellen Integrationsstand erneut prüfen. Kein ungeprüftes Deploy aus einem vermuteten main.

Die Reihenfolge beginnt mit vorhandenen Berechtigungs-/Konsistenzlücken. Eine schönere Startseite darf sie nicht überdecken. Der Standardpfad des Plans behält Mitglieder-Browse und Public-Einzelansichten bei; ein vollständiger öffentlicher Katalog ist separat bedingt.

## Befundregister

| ID | Belegter Befund | Einordnung / Umsetzung |
| --- | --- | --- |
| E01 | `/connect` ausschließlich Mitglieds-Listingbrowse, keine Public-Landingpage | Produktumfang entscheiden; P1/P5 |
| E02 | Highlights haben vier Arten, aber keine Probleme | Transparenz jetzt; Aufnahme nur bewusst, P3 |
| E03 | 30er-Fenster vor Suggestable-/Ownerprüfung, keine Besitzerdiversität | Auswahl kann unnötig leer/einseitig sein; P3, keine Sicherheitslockerung |
| E04 | Personensuche filtert q nach Limit 60 | Unvollständige fachliche Suche; P4 |
| E05 | Alte Personenvorschläge prüfen Suggestable beim Read nicht erneut | Bestehende Promotionszustimmung konsequent durchsetzen; P0 |
| E06 | Suggestion-Badge/Notification zählen nicht aktuell auflösbare Subjects mit; Problemgenerator ohne expliziten aktiven Ownerprofiltest | Hygiene an Generator/Read/Count/Send, kein neues Matching; P0 |
| E07 | Public-RPCs sind nicht sessionbezogen blockgefiltert; Listing-CTA kann trotz Login erneut Login zeigen | Public vs Memberprojektion explizit trennen; P0/P5 |
| E08 | Public-Profil-CTA verliert next; Profilonboarding bevorzugt nur `/connect/l/…` | Return-Path für p/l/pr schließen; P5 |
| E09 | Suggestions-Copy DE/EN widerspricht Cron-/Mailfunktion | Ehrliche Begriffe/Kommunikation; P1 |
| E10 | „Unternehmen“ enthält Projekte/Tätigkeiten; `network_ventures` nicht `founder_teams` | Keine automatische Teamdarstellung versprechen; P1/P2 |
| E11 | Saved-Search-Kriterien nicht identisch mit aktuellem Browse; Capability-IDs sichtbar | Umfang/Anzeige korrigieren, keine neue Suchmaschine; P4 |
| E12 | `/connect/pr/` fehlt in Chrome-Ausnahmen; kein ausgeführter visueller Nachweis | Zunächst reproduzieren, dann ggf. kleine Rahmennavigationkorrektur; P5 |
| E13 | Lokaler CONNECT-Bestand leer | Keine Aussage über reale Taxonomie-/Datenabdeckung; synthetische Tests, keine Fake-Launchinhalte |

## Stufen und Auswirkungen

| Stufe | Existiert / erweitern / neu | DB-Migration später? | RLS-/Security-Auswirkung | UI-Aufwand / Risiko |
| --- | --- | --- | --- | --- |
| P0 Sichtbarkeits- und Vorschlagsvertrag | Bestehende Helfer/RPCs gezielt erweitern | Voraussichtlich ja, Funktionsänderungen; keine neue Tabelle nötig | Read/Count/Notify konsistent, aktuelle Zustimmung, Blocks und Ownerstatus; keine breiteren Grants | Klein UI, mittel DB; falscher Public-/Sessionmix kritisch |
| P1 Orientierung, Navigation, Sprache | Bestehende Seiten/DE/EN erweitern | Nein | Keine Berechtigungsänderung | Klein bis mittel; Objektverwechslung vermeiden |
| P2 Cards und Browse-Konsistenz | Bestehende Karten angleichen | Im Standardumfang nein | Nur bereits freigegebene Felder verwenden | Mittel UI; Fotos/privates Profil nicht versehentlich projizieren |
| P3 Neutrale Highlights | Bestehende Auswahl erweitern; Problemtyp optional neu | Möglich, falls zulässige Kandidaten vor Limit per engem DB-Read ermittelt werden | 7.3-/7.9-Gates erhalten; kein anon-Zugriff auf Memberprojektion | Klein bis mittel; Auswahlfenster/Cache/Ownerdiversität |
| P4 Suche und Saved-Search-Klarheit | Bestehende Filter/Begrenzung korrigieren | Möglich für korrekte Personensuche über Personen/Ventures | Sicherheitsfilter vor Resultat; keine RPC mit fremden privaten Feldern | Mittel; Filter-/Paginationparität |
| P5 Public/Anon und Rücksprünge | Vorhandene Slugs/Authpfade erweitern; Orientierung optional neu | Nicht für reine Orientierung; ja bei neuem Public-Browse-RPC | Keine Rechte aus Login-Return ableiten; gültige Publicprojektion nötig | Mittel; Zugangs-/Layoutregression |
| P6 SEO, Empty States, responsive Abnahme | Vorhandene Grenzen prüfen/klein korrigieren | Nein, außer ein nachgewiesener bestehender RPC-Fehler erfordert Korrektur | Keine Private-Indexierung; Lifecycle bleibt maßgeblich | Mittel QA, klein Code |

Keine Stufe benötigt neue AI-/Analytics-/Payment-Env-Variablen oder einen weiteren Cron. Konkrete Migrationen erst aus implementierten Änderungen benennen, keine leeren Vorabmigrationen. Wenn Funktionsverträge erweitert werden: additive, rückwärtskompatible DB-Änderung vor darauf angewiesenem Code; exakte Deployment-Befehle erst mit verifiziertem Implementierungsbranch.

## P0 – Autorisierung und Suggestions vor Präsentation

**Arbeitspakete**

1. Mit minimalen synthetischen DB-Fixtures E05/E06/E07 reproduzieren. Kein Aufruf realer Mail-/Pushprovider.
2. Aktuelle Subject-Zulässigkeit für bestehende Suggestion-Reads, Badge und Notification-Claim wiederverwenden/zentralisieren. Kein breites allgemeines Recommendation-Objekt. Personen-Suggestable beim Read; Owner-Profilstatus im Problemgenerator; expired/blocked/withdrawn/hidden/suspended nicht als verfügbare Vorschläge zählen.
3. Aktuell öffentliche und sessionbezogene Projektion ausdrücklich definieren. Für eingeloggte blockierte Besucher kein CTA-Loop und keine prominente öffentliche Karte; keine Member-Felder in anon-Projektion. DB-Vertrag statt bloß nachträgliches Ausblenden.
4. Eigene Verwaltungsreads von Discovery-Ergebnissen unterscheiden. Pausierte eigene Profile dürfen nicht über Owner-Ausnahmen als reguläre öffentliche/member-prominente Karte zurückkehren.
5. Keine Änderung der Begriffsquellen, Reihenfolge, Wochenbudgets oder Matchingformel aus diesem Arbeitspaket ableiten.

**Abnahme**

- Personenvorschlag vor Opt-out erzeugen, `suggestable=false` setzen, danach keine Personenvorschlagskarte; zulässiger normaler Profilread weiterhin möglich.
- Block in beide Richtungen; paused/inactive/suspended Owner; Ablauf ohne Statusmutation; Listingdelete/Problemwithdraw/Resolved/Moderationssperre; Count und Liste stimmen überein.
- Anon sieht public-Minimalprojektion, nie members_only; aktives Mitglied sieht erlaubte Memberfelder. Fremde IDs, fehlende Session und Adminstatus erweitern keinen privaten Zugriff.
- Saved Searches behalten Claim- und erneuten Deliverycheck; kein Titel/Link an mittlerweile unberechtigten Empfänger. Notifications weiterhin nur generische Vorschlagszahl.
- RLS-/RPC-Tests aus 7.3/7.9 erhalten, keine neuen direkten Public-Tabellengrants.

## P1 – Orientierung und Begriffe

**Arbeitspakete**

- Bestehende `/connect`-Struktur ruhig priorisieren: Orientierung → Highlights → Objektart → Suche. Beitragserstellung nicht als gleichgewichtige zweite Produktnavigation inszenieren.
- Vier öffentliche/member-basierte Kategorien verständlich benennen; private Arbeitsräume und eigene Verwaltung klar absetzen. Keine vollständige Shell-Neugestaltung.
- „Highlights/Entdecken“, „persönliche Vorschläge“ und Saved Searches unterscheiden. DE/EN-Suggestions-Copy korrigieren: tägliche Erzeugung möglich, Mail nach Einstellung, kein Matchscore.
- CTAs je Objektart vereinheitlichen; Publish/Save/Create/Contact fachlich verschieden lassen. `network_ventures` nicht in eine behauptete Founder-Team-Synchronisation umbenennen.

**Abnahme**

DE/EN gleicher Funktionsumfang; Links führen zu vorhandenen richtigen Routen; vorhandener FIND-Link bleibt expliziter Bereichswechsel; eigene Verwaltung und private Räume bleiben erreichbar; kein normaler User-Einstieg in Radar/Intake-Admin. Keine globale Rebranding-/Assessment-Copyänderung.

## P2 – Cards und Browse

**Arbeitspakete**

- Titel, Art, knapper Kontext, optionale Orts-/Tagangaben und Haupt-CTA über bestehende Komponenten konsistent gestalten.
- Venture-Zielgruppe sichtbar halten; lange Texte begrenzen/umbrechen. Autor nach Inhalt, keine private Teambesetzung erfinden.
- Problemzahlen nur beschreibend und sekundär; kein Popularitätsranking.
- Mitgliederbilder nur über vorhandene geschützte Endpunkte; public weiterhin Initialen. Publicprofile keine automatische Masterprofil-Ergänzung.

**Abnahme**

Jede Art mit minimalen, langen und fehlenden optionalen Daten; anonyme erhaltene Probleme; eigene/fremde Karten; Bildfehler; externe Website getrennt vom internen Detailziel. 320/375/768/Desktop, Tastaturfokus und verständliche Linknamen. Nicht aktive Inhalte dürfen durch diese Komponentenänderung nicht wieder erscheinen.

## P3 – Highlights

**Arbeitspakete**

- Berechtigung/Consent vor begrenzter Kandidatenauswahl oder über begrenztes, sicheres Nachladen behandeln; nicht einfach den gesamten Bestand lesen.
- Standard drei Karten, vorhandene neutrale Mischung, eigene Inhalte mit Kennzeichnung erhalten. Keine individuelle Passung ableiten.
- Nach Entscheidung: Problemtyp ergänzen; dabei anonymous-author-Problem für Browse erhalten, aber ohne aktuelle Ownerzustimmung nicht highlighten.
- Nach Entscheidung: Besitzerdiversität im Dreierblock. Disclosure bleibt `none`; keine unbenutzten sponsored/editorial-Werte als echte Produkte bewerben.
- Auswahlhinweis erklärt Begrenzung/Wechsel; Fehler oder null Kandidaten liefern keine unerlaubten Fallbacks.

**Abnahme**

Fixture mit mehr als 30 Kandidaten und vielen ineligible neuen Kandidaten; keine unfreiwillig leere Auswahl bei erreichbaren erlaubten älteren Kandidaten im vereinbarten Suchbudget. Vier/fünf Arten, nur eine verfügbare Art, eigener Besitzer, gleiche Person in mehreren Arten, null Kandidaten. Randomness im Test kontrollieren; keine flaky Behauptung „jedes Reload ist anders“. Suggestable, Sichtbarkeit, beidseitiger Block, Membership, Status und Ablauf auf DB-/Integrationsniveau testen. Kein geteiltes benutzerspezifisches Cacheleck.

## P4 – Suche und Filter

**Arbeitspakete**

- q-Personensuche vor Limit über zulässige Profile und verknüpfte aktive Venture-Suchtexte. Enger Session-RPC nur wenn vorhandene Querystruktur es benötigt; kein service_role-Bypass.
- Begrenzung/Weiterladen mit deterministischem Tiebreaker; Tabzählung eindeutig von aktuellen Suchergebnissen unterscheiden.
- Apply und Reset vereinheitlichen, gespeicherte URL-Filter sichtbar machen. Keine neuen geografischen/semantischen Filter.
- Saved-Search-UI als Benachrichtigungsregeln für Listings/Probleme erklären; erweiterte Kriterien getrennt von aktuellem Browse; vorhandene Capability-Labels verwenden.

**Abnahme**

Passendes Profil außerhalb der neuesten 60 wird bei q gefunden. Textfilter vor Pagination, Leerzeichen/ILIKE-Sonderzeichen, kombinierte Filter, Ergebnisleerzustand, Status-/Blockwechsel zwischen Seiten. Gespeicherte Richtung/Kategorie schränkt Probleme nachvollziehbar aus, `flexible`-Remote-Regel bleibt. Keine Suchkriterien anderer Nutzer in UI/API. Keine externen Benachrichtigungen in Tests.

## P5 – Public/Anon und Login

**Arbeitspakete**

- Vorhandene p/l/pr-Seiten zuerst polieren. Public-Profil erhält wirksames next; Onboarding/Profilergänzung bewahrt alle drei Typen. Eingeloggte Nichtmitglieder erhalten Beitritts-/Rückkehrkontext statt Login-Schleife.
- Public-Shell für Probleme reproduzieren und bei bestätigter Abweichung angleichen. Keine public Route unabsichtlich dem Member-Noindexlayout unterordnen.
- Freigabehinweise nennen real öffentliche Autorname-/Headline-Felder und die geerbte Venture-Sichtbarkeit; kein neues Fotorecht.
- Nach Produktentscheidung öffentliche Orientierung ergänzen. Ein anonymer Katalog wäre ein getrenntes kleines Zusatzpaket mit expliziter Public-Query und aktueller Freigabeprüfung, nicht ein Weglassen von `requireConnectMember()`.
- Beta-Codevertrag nicht ohne ausdrückliche Launchentscheidung verändern. Eine Öffnung als eigenes Auth-Arbeitspaket mit bestehender Zugangstest-Suite abnehmen.

**Abnahme**

Je p/l/pr: anon lesen → Login und Registrierung → gegebenenfalls Onboarding/Beitritt/Profil → ursprünglicher Inhalt. Zusätzlich bestehendes Founder-/Advisor-Konto ohne CONNECT, CONNECT-only-Konto mit fehlendem Profil, freiwillig inactive, suspended, zwischenzeitlich gelöschtes/withdrawn Ziel und blockierte Session. Unsichere externe next-Werte ablehnen. Kein tatsächlicher Mailversand an reale Personen.

## P6 – SEO, Empty States und Launch-Gate

**Arbeitspakete**

- Members/private noindex,nofollow beibehalten; Public-Slug Canonical/Metadaten ausschließlich aus zulässiger Projektion. Eventuelle neue öffentliche Orientierung gezielt freigeben, keine globale robots-Lockerung.
- Sitemap gegen lifecycle-übergreifende Fixtures prüfen; kein privates Objekt oder members_only-Titel/Slug darin.
- Empty States mit Erstbestand, Nulltreffern und technischem Fehler unterscheiden; keine Fakeinhalte. Venture-Suchreset ergänzen, Highlights dürfen einfach entfallen.
- Browserprüfung aller beschlossenen Wege mit lokalen Accounts, DE/EN und vier Viewports. Lange Texte/fehlende Fotos/niedriger Bestand explizit einbeziehen.

**Abnahme der späteren Implementierung**

- `npm run ci:check` aus dem App-Verzeichnis `web`.
- `npx supabase test db` aus dem Repository-Root bei den vorgesehenen DB-Vertragsänderungen; Tests für bestehende CONNECT-, Workspace-, Opportunity-/Publish- und Teamgrenzen erhalten.
- Browser: keine horizontalen Überläufe, benutzbare Filter/CTAs, kein Privatinhalt im HTML/Metadatenpayload, alle entscheidungsabhängigen Public-Wege korrekt. Kein Live-Provider in Mailtests.
- Prüfergebnis trennt tatsächlich ausgeführte Browserfälle von DB-/Integrationstests. Ein leerer lokaler Bestand ist kein bestandener gefüllter Browse-Test.
- Neuer Umsetzungsbericht nennt Dateien, Migrationen, Sicherheitsfolgen, offene Grenzen und konkreten Deployvertrag. 7.10a selbst benötigt weder DB-Push noch Deployment.

## Bewusst später / keine impliziten Folgeaufträge

Keine neue Recommendation Engine, keine Impact-/Redaktionsverwaltung, Anzeigen/Payments, Verhaltensmessung, AI, Radar-Collector, FIND-Matching, neue Assessmentinterpretation, Taxonomieplattform oder automatische `founder_teams`-Publikation. Kein Public-Workspace und kein bloßes Ausblenden als Sicherheitsgrenze.

Diese Dokumentationsphase hat nur Code-/Schema-/Read-only-Bestandsaudit und Dokumentenprüfung ausgeführt. Die oben genannten Abnahmen sind **zukünftige** Tests, keine bereits bestandenen Laufzeittests.

## Vor Implementierung nötige Produktentscheidungen (5)

1. **Umfang für Anonyme:** Genügen zum ersten Launch Orientierung und öffentlich freigegebene Einzelansichten, oder soll bereits ein durchsuchbarer öffentlicher Katalog vorhanden sein? Empfehlung: Orientierung + Slug-Seiten; Mitglieder-Browse beibehalten.
2. **Adresse des Einstiegs:** Bleibt `/connect` die Mitgliederansicht mit separater öffentlicher Orientierung, oder soll dieselbe Adresse abhängig von Session/Mitgliedschaft auch den öffentlichen Einstieg liefern? Empfehlung: zunächst separate Orientierung; konkrete URL vor Umsetzung festlegen.
3. **Probleme in Highlights:** Zum Launch als zusätzliche Highlightart aufnehmen oder zunächst beim aktuellen Mix aus Profil/Gesuch/Angebot/Venture bleiben? Empfehlung: aufnehmen, unter denselben strengen Owner-/Consentregeln; keine anonymisierten Altprobleme prominent hervorheben.
4. **Besitzerdiversität:** Höchstens eine Karte je Person im Highlightblock, auch wenn dadurch bei kleinem Bestand weniger Karten erscheinen? Empfehlung: ja. Eigene Inhalte bleiben grundsätzlich zulässig und markiert.
5. **Zugang zum Launch:** Bleibt die bestehende Beta-Codepflicht oder wird freie Registrierung ausdrücklich Teil des Launchauftrags? Empfehlung für die kleine erste Stufe: Codepflicht transparent erhalten; eine Öffnung separat mit Zugangstests planen.

Bereits entschieden und daher keine neuen Rückfragen: keine personalisierte Empfehlung unter neutralen Highlights, keine Werbung, kein unbegründetes Impact-Label, keine privaten Discoveryobjekte, kein neues Tracking und keine Lockerung von Blocking/Lifecycle.
