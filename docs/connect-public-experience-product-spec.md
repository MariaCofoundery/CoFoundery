# CONNECT Public Experience & Highlights – Produktspezifikation (7.10a)

## Status und Ziel

**Designvorschlag, keine Implementierung.** Grundlage ist der [tatsächliche Audit](connect-public-experience-current-state.md) einschließlich seiner Branch-/DB-Abgrenzung. Empfehlungen in diesem Dokument sind noch keine vorhandenen Funktionen. Die wenigen offenen Launchentscheidungen stehen gesammelt am Ende des [Umsetzungsplans](connect-public-experience-implementation-plan.md).

CONNECT soll schnell beantworten: Welche Menschen und Beiträge gibt es hier, was davon darf ich sehen, und wie komme ich zum passenden nächsten Schritt? Der erste Release braucht verständliche Orientierung und verlässliche Sichtbarkeit. Er braucht keine neue Recommendation Engine.

Keine Änderungen an FIND-Matching, Assessment, Radar-Collector, KI, Tracking, Sponsoring, Payments oder Branding. Bestehende private Arbeitsräume, Opportunities, Radar und Intake werden nicht zu Discoveryinhalten.

## 1. Informationsarchitektur

Empfohlene Reihenfolge im Mitgliederbereich:

1. Kurze Orientierung mit einem ruhigen Einstieg in die vier öffentlichen/member-basierten Objektarten.
2. Kleiner neutraler Highlight-Bereich, höchstens drei Karten; bei fehlendem Bestand kompakt entfallen lassen.
3. Discovery nach Objektart mit aktiver Auswahl klar erkennbar.
4. Je Objektart passende Suche, wenige Filter und Ergebnisliste.
5. Eigene Dinge separat erreichbar: Profil, Einträge, CONNECT-Darstellungen, Arbeitsräume, gespeicherte Suchen und persönliche Vorschläge.

Nicht vier vollständige Listen plus alle Erstellformulare auf die Startseite packen. Das vorhandene Listing-Browse kann zunächst Standardansicht bleiben. Erstellen als gezielte Handlung zur gewählten Objektart; der FIND-Co-Founder-Link bleibt ein klar benannter Wechsel in einen anderen bestehenden Bereich.

`/connect/my` bleibt Verwaltung, keine zweite Discovery. Private Arbeitsräume gehören in den persönlichen Bereich, nicht als gleichartige öffentliche Objektkategorie neben Menschen/Probleme. Das ist eine kleine Hierarchiekorrektur, kein Umbau des gesamten Produktmenüs.

### Verständliche Objektbegriffe – noch keine finale Copy

| Bedeutung | Empfohlene Richtung DE / EN | Abgrenzung |
| --- | --- | --- |
| Menschen | Menschen entdecken / Discover people | CONNECT-Visitenkarten, keine privaten Founder-Auswertungen |
| Probleme | Probleme entdecken / Explore problems | Beobachtete ungelöste Situationen; keine validierten Märkte |
| Listings | Gesuche & Angebote / Requests & offers | Konkretes Suchen/Anbieten; keine bezahlten Anzeigen als Bedeutungsgrundlage |
| CONNECT-Venture-Darstellungen | Unternehmen & Projekte; ggf. erklärendes „Vorhaben“ / Companies & projects | Heute auch Tätigkeiten; nicht automatisch das kanonische Founder-Team |

Die letzte Kategorie darf nicht versprechen, dass alle Founder-Vorhaben hier automatisch erscheinen. Bis zu einem später bewusst beschlossenen Anschluss bleiben `network_ventures` und `founder_teams` getrennt. Keine neue Tabelle und kein implizites Veröffentlichen bestehender Teams.

## 2. Öffentlicher Einstieg und Mitgliedergrenze

Empfehlung für den kleinen Launch: öffentlich verständliche Orientierung plus weiterhin frei lesbare Public-Slug-Seiten; **noch kein vollständiger anonymer Katalog**, solange dieser neue Public-Read-Vertrag nicht ausdrücklich beauftragt ist. Volle Discovery bleibt zunächst für aktive CONNECT-Mitglieder. Eine separate öffentliche Orientierungsroute wäre die kleinste Änderung ohne Umdeutung von `/connect`; endgültige Route und Umfang sind Produktentscheidungen.

Falls anonymer Browse bereits zum Launch gewünscht wird, benötigt er server-/DB-seitig eine schmale öffentliche Projektion und eigene Freigabeprüfung. Die Mitglieds-Highlightfunktion, `.select('*')` oder eine öffentliche Kopie ihrer JSON-Antwort dürfen dafür nicht verwendet werden.

| Zuschauer | Lesen | Aktionen und Rückweg |
| --- | --- | --- |
| Anonym | Nur ausdrücklich public und aktuell zulässige Felder | Login/Registrierung erklären; konkreten Ursprung als sicheren `next` erhalten |
| Angemeldet ohne CONNECT | Public bleibt public; kein members_only | Beitreten/Onboarding anbieten statt erneut Login zu verlangen; Ziel erhalten |
| Aktives Mitglied | Public + berechtigtes members_only; aktuelle Blocks | Objektbezogene bestehende Interaktionen; unvollständiges Profil gezielt ergänzen |
| Aktive Mitgliedschaft, pausiertes Profil | Fremde Discovery darf nach heutigem Vertrag weiter lesbar bleiben | Eigenes Profil bleibt verborgen; explizite Veröffentlichung getrennt vom Lesen |
| Freiwillig inactive | Public; bestehende eigene historische Rechte gemäß 7.9 | Account-Rückkehr, dann Profilprüfung; keine automatische Inhaltsreaktivierung |
| Suspended | Kein Mitglieder-Browse/keine neue CONNECT-Interaktion | Keine selbstbediente Entsperrung oder versteckte Reaktivierung |

Public-Lesbarkeit darf nicht von einem Loginformular überdeckt werden. Umgekehrt dürfen „öffentlich“ oder eine Adminrolle kein members_only-, Workspace-, Profil- oder Teamrecht erzeugen.

## 3. Highlights: neutraler Launchvertrag

Für den Launch nur **Highlights / Entdecken**, beispielsweise bestehendes „Aus dem Netzwerk“. Auswahlhinweis nennt eine wechselnde Auswahl aus aktuell erlaubten Inhalten und bei fortbestehendem Fenster dessen Begrenzung. Keine Aussage „für dich empfohlen“ oder „von uns geprüft“.

| Spätere Art | Fachliche Bedeutung | Launch |
| --- | --- | --- |
| Entdeckt | Neutrale Auswahl; eine echte Redaktion müsste gesondert benannt werden | Neutrale Variante ja |
| Empfohlen | Persönliche Empfehlung mit eigenem erklärbaren Vertrag | Keine neue Ebene; vorhandene Suggestions getrennt |
| Impact | Bewusste redaktionelle Auswahl mit nachvollziehbarer inhaltlicher Grundlage | Nicht anbieten; Daten-/Reviewgrundlage fehlt |
| Anzeige | Klar kenntliche bezahlte Platzierung | Nicht anbieten; keine Werbe-/Zahlungslogik |

### Zulässigkeit pro Objekt

| Objekt | Bedingungen für Highlights |
| --- | --- |
| Profil | Active, aktive Mitgliedschaft, `suggestable=true`, aktuell für Betrachter lesbar, keine Blockierung |
| Listing | Active und nicht abgelaufen; Besitzer erfüllt Profilbedingungen; passende public/member-Sichtbarkeit |
| CONNECT-Venture | Active; Besitzer erfüllt Profilbedingungen; bei anon nur bereits freigegebene öffentliche Profilprojektion, niemals Member-Logo/Member-ID durchsickern lassen |
| Problem, falls in den Launch aufgenommen | Active, keine Moderationssperre, Besitzer erfüllt Profilbedingungen, passende Sichtbarkeit. Erhaltene Probleme ohne Autor dürfen normal lesbar bleiben, werden mangels aktueller Suggestable-Zustimmung nicht prominent hervorgehoben |
| Private/interne Objekte | Immer ausgeschlossen, auch bei Admin- oder Workspace-Owner-Betrachtung |

Nicht suggestable ist eine **Promotionsgrenze**, kein allgemeines Leserechte-Revoke. Normales erlaubtes Browse und eigene Verwaltung bleiben davon getrennt. Blocks gelten beidseitig. Owner-Ausnahmen der Verwaltung dürfen nicht unbeabsichtigt in Highlight-Eligibility durchgereicht werden.

### Kleine Weiterentwicklung statt Highlight-Engine

- Bestehende Mischlogik grundsätzlich behalten; keine Scores, Embeddings, Engagementsignale oder neue Redaktionstabelle.
- Aktuelle Berechtigungen vor Auswahl prüfen; begrenztes Kandidatenfenster möglichst aus bereits zulässigen Kandidaten bilden. Alternativ begrenztes Nachladen nach demselben Vertrag, nie unbeschränkt alle Daten laden.
- Fenster ist ein Kosten-/Abdeckungsvertrag, kein Fairnessversprechen. Sein Umfang bleibt eine technische Konfiguration, keine Nutzerpräferenz.
- Empfehlung: höchstens eine Karte je Besitzer in einem Dreierblock, sofern genügend verschiedene zulässige Besitzer vorhanden sind. Bei zu wenig Vielfalt lieber weniger Karten als eine suggerierte breite Auswahl. Entscheidung darüber explizit offen.
- Eigene Inhalte bleiben wie bisher möglich und markiert. Keine erneute Entscheidung über den bereits bewusst zugelassenen Eigenbezug erforderlich.
- Keine clientseitige Zufallsneuberechnung mit Hydration-Sprüngen. Keine geteilte Cacheantwort für verschiedene Betrachter/Blocks. Ein bloßer Tagescache darf Widerruf und Statuswechsel nicht verzögern.
- Problemaufnahme ist ein kleiner expliziter Ausbau der heutigen Typen, noch kein bestehendes Verhalten. Bleibt sie aus, beschreibt die UI die tatsächlich vertretenen Arten korrekt.

## 4. Cards und primäre Handlungen

Jede Karte benötigt eine eindeutige Art, einen verständlichen Titel, knappen Kontext, nur hilfreiche strukturierte Angaben und ein klares Hauptziel. Keine Platzhalter-Ratings, „beliebt“, Risikofarbe oder künstliche Aktivität.

| Art | Kern der Karte | Primär-CTA | Sekundär |
| --- | --- | --- | --- |
| Mensch | Name, Headline/Beitrag, wenige Expertiseangaben, sinnvoller Orts-/Remote-Kontext | Profil ansehen / View profile | Kontakt im erlaubten Detailkontext |
| Problem | Titel, Problembeobachtung, betroffene Situation aus vorhandenem Text, ggf. Ort/Thema | Problem ansehen / View problem | Bestehendes Interesse/Ansatz auf Detailseite |
| Listing | Gesuch/Angebot, Kategorie, Titel, Kurztext, Ort/Remote und ggf. Zeitraum | Details ansehen / View details | Bestehende Kontaktanfrage |
| Venture-Darstellung | Name, Tätigkeit und Zielgruppe; optional Logo; Person sekundär | Vorhaben/Projekt ansehen / View project | Website klar als externer Link |

Erstellung und Veröffentlichung bleiben verschiedene Handlungen: Profil erstellen, Problem schildern, Gesuch/Angebot erstellen, Darstellung hinzufügen; erst in Preview/Formular ausdrücklich veröffentlichen. „Starten“ nicht als universelle Abkürzung für Team-/Workspace-/Publish-Aktionen verwenden.

Freiwillige Angaben fehlen dürfen, ohne leere Metadatenreihen. Lange Titel, DE-Komposita, URLs und Tags müssen umbrechen. Kennzeichnungen für Mitglieder/public in Bearbeitungs-/Freigabekontexten sind verbindlich; Browsekarten sollen nicht mit technischen Statuslabels überladen werden. Private Owner-Statuskarten gehören zur Verwaltung.

Bestätigungs-/Interestzahlen auf Problemen sind keine Validierung. Für den ersten Release können sie sekundär bleiben, dürfen aber weder Highlightauswahl noch Standardreihenfolge bestimmen.

## 5. Suche und gespeicherte Kriterien

Vor neuen Filtern bestehende Verträge korrigieren:

- Personensuche muss q auf den berechtigten Gesamtbestand anwenden **vor** Ergebnisbegrenzung/Pagination. Kein Ergebnisversprechen auf Basis der neuesten 60 vorgefilterten Profile.
- Ergebnisgrenzen 50/60 transparent behandeln: begrenztes Weiterladen oder Seiten, mit stabiler Sortierung und ID-Tiebreaker. Tab-Bestandszahl von Suchtrefferzahl unterscheiden.
- Suche/Apply/Reset auf allen Objektseiten unmittelbar erreichbar; Enter bleibt nutzbar. Im leeren Suchzustand zuerst Filter zurücksetzen anbieten.
- Vorhandene robuste Enum-Filter behalten: Richtung/Kategorie/Remote/Scope, Profilrolle/Kontaktformat. Region als Freitextsuche benennen, keine Radius-/Geokodierungsgenauigkeit suggerieren.
- Themen, Branche und Expertise nur auf Basis vorhandener Eingaben anbieten. Keine Filter für Ventures erfinden, deren Felder nicht strukturiert vorliegen. Keine Taxonomie-/Datenanreicherungsphase anhängen.
- Saved Searches sind aktuell **Benachrichtigungsregeln für neue Listings/Probleme**, keine gespeicherte Suche über alle vier Objektarten. Das muss im Formular und in der Übersicht stehen.
- Wenn erweiterte Capability-/Problemkriterien nicht im Browse gelten, getrennt als Benachrichtigungskriterien kennzeichnen. Keine Aussage „genau diese Ergebnisliste speichern“. Capability-IDs in der UI durch bestehende übersetzte Bezeichnungen darstellen; keine zusätzlichen Profilrechte.
- Kein Trefferreplay, Digest oder neuer Cron als Nebenprodukt. Ein späterer „Suche öffnen“-Link muss die tatsächlich darstellbaren Kriterien respektieren.

Die reale Qualität optionaler Freitextfilter ist mangels lokaler Daten noch unbewiesen. Launch kann vorhandene einfache Felder nutzen; zusätzliche Filter warten auf belegte Datenabdeckung.

## 6. Suggestions getrennt und ehrlich

Highlights = neutraler Discoveryausschnitt. Suggestions = bestehende persönliche, gespeicherte **Begriffsüberschneidungen** aus eigenen Angaben. Recommendation Engine = späterer separater Layer.

„Für dich“ darf bleiben, wenn unmittelbar erklärt wird, welche eigenen Begriffe den Vorschlag ausgelöst haben. Nicht als psychometrische Passung oder intelligentes Founder-Matching beschreiben. Keine Ausweitung des verwendeten Profildatenumfangs.

Launchhygiene am bestehenden Vertrag:

1. Aktuelle Subject-Zulässigkeit bei Ausgabe, Zähler und Benachrichtigungs-Claim konsistent prüfen. Personen-Suggestable auch beim späteren Read. Aktiver Owner auch im Problem-Generator.
2. Nichtlesbare/dismissed/abgelaufene Vorschläge nicht als verfügbare Vorschläge zählen. Keine Titel/Personen in Push/Mail ergänzen.
3. Copy zu Cron und opt-in E-Mail an tatsächliches Verhalten anpassen; rollierende sieben Tage nicht als Kalenderwochenkontingent verkaufen.
4. Dismiss bleibt eng autorisiert, ohne Begründungspflicht oder Systemfeldzugriff. Es darf kein verstecktes Behavioral-Ranking daraus entstehen.
5. Saved-Search-Read/Send-Autorisierung und Austrittsverhalten aus 7.3/7.9 unverändert erhalten.

Das sind Korrekturen vorhandener Zustandsverträge, keine neue Vorschlagsarchitektur.

## 7. Public Profile und Übergänge

Public CONNECT Profile bleibt eine bewusst reduzierte Visitenkarte. Keine Masterprofil-, ALIGN-, FIND-, Assessment-, Intake- oder privaten Founder-Daten nachladen. Öffentliche Fotos bleiben für den Launch aus; vorhandene Initialen sind kein Mangel, den man durch einen ungefragten Profilfoto-Fallback behebt. LinkedIn behält die gesonderte explizite public-Freigabe.

Öffentliche Listings/Probleme können wie bisher Autorname/Headline zeigen, ohne das gesamte Autorprofil öffentlich zu machen. Veröffentlichungsvorschau muss diese tatsächlich sichtbaren Felder nennen. Venture-Darstellungen erben im MVP weiter die Profilfreigabe; keine neue unabhängige Venture-Publication in dieser Phase.

Alle Public-CTAs erhalten p/l/pr-Ursprung durch Login, Start, Onboarding, erforderliche CONNECT-Profilergänzung und Beitritt. `intent=connect` allein ersetzt kein wirksames Produktziel. Zurückgekehrte Nutzer landen am ursprünglichen Objekt oder an einer verständlichen nicht-mehr-verfügbar-Ansicht, nie an fremden privaten Inhalten.

Eingeloggte blockierte Besucher sollen keine erneute Kontakt-/Login-Schleife oder prominente Karte der blockierten Person erhalten. Sessionbezogene Public-Ansichten müssen konsistent auf Block reagierende schmale Reads verwenden; gemeinsame anonyme Public-Projektion bleibt davon fachlich getrennt. Keine Behauptung, man könne eine ausdrücklich öffentliche Seite vor derselben Person nach Logout geheim halten.

Beta-Registrierung und öffentliche Lesbarkeit bleiben unterschiedliche Entscheidungen. Solange Codepflicht gilt, CTAs als Zugang/Registrierung mit bestehendem Verfahren formulieren. Offene Registrierung erfordert eine eigene überprüfte Änderung des Zugangsvertrags; nicht nebenbei einen Auth-Gate entfernen.

## 8. Empty States und responsive DE/EN

Keine künstlichen Demo-Inhalte im echten Bestand. Ein leerer Zustand nennt Zweck, tatsächlichen Zustand und eine passende nächste Handlung:

- Global leer: hier erscheinen freigegebene Inhalte; eigene passende Angabe erstellen oder zu einer anderen Kategorie wechseln.
- Suche leer: keine Treffer für diese Kriterien; Reset/Filteränderung vor „erstelle selbst“.
- Highlights leer: keinen leeren Slider und keine drei Dummy-Karten; Orientierung und Browse bleiben.
- Profil fehlt/pausiert: persönlicher Statushinweis mit Erstellen/Fortsetzen/Veröffentlichen, keine falsche Meldung „kein Zugang“ bei weiterhin aktiver Mitgliedschaft.
- Suggestions leer: aktuell keine verfügbaren Überschneidungen; eigene Angaben optional ergänzen, keine Passungsgarantie.
- Technischer Ladefehler: von belegtem Nullbestand unterscheiden; keine privaten Diagnosen in der UI.

DE/EN in vorhandener I18n-Struktur. Keine neue Sprachroutingarchitektur. Verifikation bei 320/375/768 px und Desktop: Tab-/Menübedienbarkeit, kein horizontaler Seitenoverflow, Karten mit langen Texten, Filterzustand/Reset, klare Fokusführung und erreichbare Buttons. Nicht nur einen gefüllten Desktopzustand prüfen.

## 9. SEO, Lifecycle und Sicherheitsabnahme

Member- und private Routen bleiben `noindex,nofollow`. Öffentliche Slugseiten bleiben nach aktueller Freigabe indexierbar, mit Canonical und Metadaten aus derselben erlaubten Projektion. Kein members_only-Titel in Metadaten, keine privaten Quellen in OpenGraph. Eine neue öffentliche Orientierungsroute erhält nur nach bewusster Routentrennung index/follow; keine pauschale Änderung des CONNECT-Layouts.

Sitemap bleibt ein DB-gefilterter Public-Vertrag. Keine privaten Workspaces, Opportunities, Radar, Intake, Suggestions oder Suchprofile. Öffentlich freigegebene anonymisierte historische Probleme behalten ihre bestehende Sonderregel. Öffentliche und Mitglieder-Personenansicht werden nicht als zwei gleichwertige indexierbare Kopien angeboten.

Phase 7.9 bleibt verbindlich: aktive Bearbeitung erhält Status; Withdraw/Resolved/Delete/Expiry/Hidden/Austritt/Suspension nehmen Inhalte aus fremder Discovery; Restore ist ausdrücklich und respektiert Moderation. Rückkehr veröffentlicht nichts. Kein Cache darf alte Mitgliedschafts-/Blockrechte als weiterhin gültig behandeln. Private archivierte Räume werden nicht als öffentliche Inhalte interpretiert.

## 10. Launchumfang und spätere Arbeit

**Für Launch erforderlich:** verständlicher Einstieg, vier nachvollziehbare Objektarten, neutrale autorisierte Highlights, kompakte Cards, vollständige begrenzte Suche, passende Empty States, korrekte Public-/Member-/Login-Grenze, ehrliche Suggestions-Copy, responsive DE/EN und Lifecycle-/SEO-Regression.

**Bedingter Umfang:** öffentlicher Katalog und Probleme als zusätzliche Highlightart nur nach den dokumentierten Produktentscheidungen. Eine kleine öffentliche Orientierung ist nicht gleich ein anonymer Feed.

**Später:** persönliche Recommendation Engine, Impact-Curation, redaktionelle Verwaltung, Ads/Payments, Behavioral-Ranking, AI Discovery, Radar-Collector, eigenständiges Public-Venture-Modell und automatische Integration kanonischer Founder-Teams. Keines davon ist Launchvoraussetzung dieses Plans.
