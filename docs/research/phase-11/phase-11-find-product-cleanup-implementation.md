# Phase 11 – FIND Product Cleanup

Stand: 05.10.2026. Branch: `feat/workstyle-reporting-v04`. Ausgangscommit: `5fab6bf2` (`feat: finalize current workstyle reports and legacy cutover`, enthält Phase 10 und 10B). Alle Änderungen sind lokal und **nicht committed**. Kein Push, kein Deployment, kein Remote-Supabase-Push, **keine Migration**.

Leitfrage von FIND ist nicht „Wie gut passen diese zwei Menschen zusammen?“, sondern: „Gibt es genug Anknüpfungspunkte für ein Gespräch – und was sollte man früh miteinander klären?“

Der technische FIND-Vertrag aus Phase 9.1 bleibt unverändert:
- eigenes Opt-in, Workstyle-Discovery-Consent `workstyle_discovery_v1`, nur Core-Daten von v0.4, Signale ohne Score;
- bilaterales Intro → bestehender Relationship-/Team-Weg;
- kein automatisches Teilen, kein automatisches Assessment, kein automatischer Report, keine automatische Vereinbarung.

---

## 1. Ist-Architektur

**Routen.** Alle liegen unter `web/src/app/(product)/discovery/`; eine eigene `/find`-Route gibt es nicht, „FIND“ ist Label und Navigationsbereich.

| Route | Zweck | Datenquelle |
|---|---|---|
| `/discovery` | Liste mit „Für dich“ (alle veröffentlichten Profile) und „Suchen & filtern“ (nach eigener Suche) | RPC `search_founder_discovery_profiles_v2` (`20261091120000_search_by_frame.sql`), `list_member_photos` |
| `/discovery/[profileId]` | Profil einer anderen Person | Tabelle `founder_discovery_profiles` (RLS), `get_disclosed_capability(…, 'discovery')`, `get_discovery_workstyle_signals`, `discovery_intro_requests` |
| `/discovery/intros` | Eingegangene und gesendete Anfragen | `discovery_intro_requests`, Gespräch über `ensure_discovery_intro_conversation` |
| `/discovery/intros/[id]/matching` | Zweite Zustimmung, dann Teambereich | `discovery_matching_starts`, `open_discovery_workstyle_team` |
| `/discovery/profile` | Eigenes FIND-Profil | `founder_discovery_profiles`, `person_core` |
| `/discovery/suche` | Eigene, private Suche und Workstyle-Opt-in | `founder_search_preferences`, `set_discovery_workstyle_consent` |
| `/discovery/saved`, `/discovery/searches` | Gemerkte Profile, gemerkte Suchen | `discovery_saves`, `saved_searches` |

**Identität.** Name, Headline, Bio, Ort, Remote-Modus, Expertise und Branchen kommen aus `person_core`. Ein Trigger überträgt sie einseitig nach `founder_discovery_profiles` und `network_profiles` (CONNECT). Rollen, Zeit, Einsatz, Stand, Ziel, Suchintention und Start sind reine FIND-Felder.

## 2. Journey vorher / nachher

Product Map (aktueller Code nach Phase 11):

```
ENTRY            /discovery (Navigation „Find“)
 → DISCOVER      Liste „Menschen finden“, chronologisch, optional nach eigenen Kriterien gefiltert
 → PROFILE       /discovery/[id]: Person → Sucht → Fähigkeiten & Verantwortung → Arbeitsweise
                 → Warum ein Gespräch → Früh besprechen → Intro
 → INTRO         Anfrage (optional mit Nachricht, ≤ 600 Zeichen)
 → MUTUAL ACC.   B nimmt an  →  „Ihr seid verbunden“  →  „Gemeinsam weitergehen“ (zweite, beidseitige Zustimmung)
 → TEAM          open_discovery_workstyle_team  →  /teams/[id]/workstyle
 → TEAM REPORT   „Euer Zusammenspiel“ – erst mit eigenem Arbeitsprofil und eigener Freigabe beider
```

| Schritt | Vorher | Nachher |
|---|---|---|
| Liste | „Co-Founder finden – Profile, die zu dir passen könnten“, obwohl rein chronologisch | „Menschen finden – Nicht der perfekte Match, sondern Menschen, mit denen sich ein Gespräch lohnen könnte“; Sortierung offen benannt |
| Karte | Rollen, Rahmen, „Passt zu deiner Suche“ | dazu höchstens zwei konkrete Gesprächsanlässe; „Entspricht deinen Kriterien“ |
| Profil | Interessen → Rollen → Rahmen → Arbeitsweise → Fähigkeiten (Ich-Labels) → Intro | geforderte Reihenfolge, Capability in dritter Person mit Grenzhinweis, neue Abschnitte „Warum ein Gespräch“ und „Früh besprechen“ |
| Gegenrichtung | B konnte A eine zweite Anfrage schicken, obwohl A schon angefragt hatte | B sieht „{Name} möchte dich kennenlernen“ und den Weg zur Antwort; kein zweites Formular |
| Nach der Annahme | Copy „gemeinsamer Alignment-Blick“, Schritte „Report und Workbook“; Seite lud noch Matching-Session und -Report | „Ihr seid verbunden“ → „Gemeinsam weitergehen“ → Teambereich; keine Session-/Report-Ladung mehr |
| Teamschritt | hartkodierte deutsche Texte | Messages DE/EN, gestaltete Karte |
| Eigenes Profil | Vollständigkeitsbalken „x von y“ | „Was noch fehlt“ als Liste und Kasten „Was andere in FIND zusätzlich sehen“ |

**Abweichungen vom Zielbild, bewusst so belassen:** Zwischen Annahme und Team liegt ein zweiter, beidseitiger Zustimmungsschritt („Gemeinsam weitergehen“). Das ist Bestandteil des Vertrags aus Phase 9.1 (`discovery_matching_starts`) und wurde nicht aufgeweicht.

## 3. Discovery-Liste

- Kopf: „Menschen finden“ mit der Unterzeile oben, Link „Offene Anfragen ansehen“.
- Tabs „Für dich“ (alle veröffentlichten Profile) / „Suchen & filtern“ / „Gemerkte“.
- Zählzeile plus **Sortierhinweis**: „Zuletzt veröffentlichte Profile zuerst. Es gibt keine Rangfolge nach Passung und keinen Score.“
- Founder Cards im Raster, 12 pro Seite. Kein Swipe, keine „Top Matches“.

## 4. Founder Card

- Avatar (nur bei Fotofreigabe, sonst Initialen), Name, Headline.
- Chips: Suchintention, Start, Ort, Remote-Modus, Stunden pro Woche, Flexibilität.
- „Bringt mit“ (eigene Rollen und Expertise) und „Sucht“ (gesuchte Rollen).
- Gründungsrahmen: Einsatz · Stand · Ziel.
- **Neu:** „Ein Gespräch könnte interessant sein, weil …“ mit höchstens zwei Punkten aus `conversationPoints` (z. B. „Cleo sucht jemanden für Product – das hast du als deine Rolle angegeben.“). Jede Zeile trägt `data-claim`.
- Nur im Suchmodus: erfüllte Kriterien („Entspricht deinen Kriterien“) und bis zu zwei Workstyle-Hinweise.
- Aktionen: „Profil ansehen“, „Merken“.

## 5. Founder Detail

Reihenfolge, wie gefordert:
1. **Person:** Avatar, Name, Headline, Bio, Ort, Remote.
2. **Sucht und möchte aufbauen:** wie konkret die Suche ist, möglicher Start, gesucht für, Stand und Ziel des Vorhabens, geplanter Einsatz, Zeit pro Woche (mit Flexibilität und Bedingung), Branchen, letzter Schritt.
3. **Fähigkeiten & Verantwortung:** eigene Rollen, Expertise, „Bereiche mit eigenen Angaben“ (siehe Abschnitt 7).
4. **Wie die Person arbeitet:** nur das Discovery-Signal bei beidseitigem Opt-in.
5. **Warum ein Gespräch interessant sein könnte**
6. **Das solltet ihr früh besprechen**
7. **Intro:** Anfrage, oder der Stand der Anfrage oben, wenn es schon eine gibt.

Den Abschluss bildet ein Datenschutzhinweis, was das Profil zeigt und was nicht.

## 6. Suchintention

Bestehende Werte, keine neue Taxonomie:
- `search_intent`: ready_now („Sucht jetzt konkret“), actively_exploring („Aktiv im Kennenlernen“), open_later („Offen für später“)
- `start_horizon`: jetzt / nächste 3 Monate / nächste 6 Monate / später oder flexibel
- dazu `commitment_level`, `venture_stage` und `venture_goal`

Auf dem Profil stehen sie jetzt verständlich benannt („Wie konkret die Suche ist“, „Möglicher Start“, „Stand des Vorhabens“, „Ziel des Vorhabens“, „Geplanter Einsatz“) statt „Venture Stage/Goal“ und „Commitment-Level“. Es wird keine Motivation hineininterpretiert; ein Unterschied wird nur als Klärungspunkt mit beiden Werten gezeigt.

## 7. Capability / Ownership / Sourcing

- **`get_disclosed_capability`** entscheidet:
  - `private`: nichts sichtbar.
  - `areas`: nur die Bereiche.
  - `areas_depth_on_contact`: Erfahrungsstufe und Verantwortungswunsch erst nach angenommenem Kontakt.
- **Darstellung:**
  - Überschrift „Bereiche mit eigenen Angaben“ statt „Was diese Person mitbringt“.
  - Erfahrung nur als tatsächliches Stufenlabel („Wiederholt angewandt“).
  - Wunsch in der **dritten Person** („Möchte verantworten“, „Möchte hineinwachsen“, „Lieber eine andere Person“, „Extern denkbar“). Vorher standen auf fremden Profilen die Ich-Labels des eigenen Profils („Möchte ich verantwortlich übernehmen“).
  - Hinweis: „Eigene Angaben, keine geprüfte Kompetenz und keine vereinbarte Rolle.“
- **Sourcing** ist eine Eigenschaft des Bereichs, keine Personenangabe, und erscheint in FIND nicht.
- Keine „Expertin“-, „Lead“- oder Rollenbehauptung.

## 8. Workstyle in FIND

- Unverändert `get_discovery_workstyle_signals(uuid)`: beidseitiger Opt-in, nur v0.4-Core, nur `SIMILAR_PATTERN`, `DISCUSSION_POINT` und `INSUFFICIENT_DATA` je Bereich, keine Distanz, keine Wirkung auf die Reihenfolge.
- Die Texte („beschreibt ihr ähnliche Vorgehensweisen …“ bzw. „setzt ihr unterschiedliche Schwerpunkte. Sprecht darüber, wann welches Vorgehen hilfreich ist.“) liegen innerhalb der Grenzen aus Phase 10B.
- Die Bereichsnamen entsprechen dem Bericht („Einwände ansprechen“, „Offene Situationen empfinden“), abgesichert durch einen Test.
- Auf der Detailseite wird das Signal einmal geladen und an Darstellung und Gesprächspunkte weitergereicht.

## 9. Warum ein Gespräch interessant sein könnte

`web/src/features/find/conversationPrompts.ts` ist eine reine Funktion **ohne Gewichtung, Summe, Sortierung oder Gesamtaussage**. Jeder Punkt hat eine eigene Claim-ID und entsteht nur aus ausdrücklichen Angaben:

| Claim | Bedingung | Text (DE) |
|---|---|---|
| `FIND.WHY.ROLE_SOUGHT_BY_THEM` | ihre gesuchten Rollen ∩ meine eigenen | „{Name} sucht jemanden für {Rollen} – das hast du als deine Rolle angegeben.“ |
| `FIND.WHY.ROLE_SOUGHT_BY_YOU` | meine gesuchten ∩ ihre eigenen | „Du suchst {Rollen} – {Name} gibt das als eigene Rolle an.“ |
| `FIND.WHY.CAPABILITY_IN_YOUR_SEARCH` | freigegebene Bereiche ∩ Bereiche meiner privaten Suche | „{Name} hat Angaben zu Bereichen gemacht, nach denen du suchst: …“ |
| `FIND.WHY.OWNERSHIP_YOU_HAND_OVER` | nur bei sichtbarem Wunsch: sie `own`, ich `prefer_other`/`prefer_external` | „{Name} möchte … verantworten – du möchtest das lieber abgeben oder extern lösen.“ |
| `FIND.WHY.SHARED_INDUSTRY` | gemeinsame Branchen | „Ihr interessiert euch beide für …“ |

Höchstens vier Punkte auf dem Profil und zwei auf der Karte. „Ihr passt zusammen“ steht nirgends. Workstyle-Ähnlichkeit ist bewusst kein Grund (Ähnlichkeit ≠ Vorteil, Phase 10B); sie steht im Abschnitt „Arbeitsweisen im Gespräch“. Die eigene Suche wird nur der Person selbst angezeigt.

## 10. Was früh besprechen

| Claim | Bedingung | Text (DE, gekürzt) |
|---|---|---|
| `FIND.DISCUSS.SAME_OWN_ROLE` | gleiche eigene Rolle | „… Sprecht früh darüber, wer welchen Teil verantworten möchte.“ |
| `FIND.DISCUSS.BOTH_WANT_TO_OWN` | nur bei sichtbarem Wunsch: beide `own` | „Ihr möchtet beide … verantworten. Sprecht darüber, wer diesen Bereich wirklich übernehmen möchte.“ |
| `FIND.DISCUSS.SEARCH_INTENT_DIFFERS` | Suchintention verschieden | „Ihr sucht unterschiedlich konkret – du: …, {Name}: … Klärt früh, wie verbindlich ihr gerade sucht.“ |
| `FIND.DISCUSS.START_HORIZON_DIFFERS` | Start verschieden | „… Klärt früh, wann ihr anfangen wollt.“ |
| `FIND.DISCUSS.AVAILABILITY_DIFFERS` | Abstand ≥ 10 Std./Woche | beide Werte, „Das lohnt sich früh zu klären.“ |
| `FIND.DISCUSS.REMOTE_MODE_DIFFERS` | vor Ort gegen remote | „… Klärt früh, wie ihr zusammenarbeiten wollt.“ |
| `FIND.DISCUSS.WORKSTYLE.{AREA}` | `DISCUSSION_POINT`, höchstens zwei | „Bei „{Bereich}“ setzt ihr … unterschiedliche Schwerpunkte …“ |

Einleitung: „Punkte, die sich früh zu klären lohnen – keine Prognose, kein Ausschlusskriterium.“ Es gibt keine Konfliktsprache. Bei sichtbarer Verantwortung bevorzugt der Baustein nichts; das „Niemand verantwortet einen intern nötigen Bereich“ aus dem Teambericht braucht Wünsche beider Seiten und das Bereichs-Sourcing und bleibt dort (Restpunkt).

## 11. Filter

Unverändert und alle explizit: Rollen, Expertise, Region, Remote, Mindeststunden, Capability-Bereiche (nur freigegebene), Suchintention, Start. Sie werden auf `/discovery/suche` gepflegt und in der Liste als Chips angezeigt. **Kein** Workstyle-, Typ- oder Kompatibilitätsfilter. Sprache und Verfügbarkeitsdatum gibt es als Datenfeld nicht (keine Migration).

## 12. Sortierung / Ranking-Audit

- **Liste:** `order by profile.published_at desc nulls last, profile.id` mit 12 pro Seite. Es gibt keine Relevanzrechnung in SQL oder TS. `practicalMatches` ist eine reine Anzeige erfüllter Kriterien und ändert die Reihenfolge nicht.
- **Workstyle-Signale:** nach Bereichsname, ohne Summe.
- **Gefunden und entfernt:**
  - `discovery/discoveryRecommendation.ts`: gewichtete Score-Liste; ohne Produktimporte, nur ein eigener Test.
  - `find/matchData.ts`: ohne Importe; las fremde Suchpräferenzen über den Service-Role-Schlüssel (`discovery_preferences_for_match`).
- **Faktische Rangwirkung, die bleibt:** Jedes Veröffentlichen, auch Fortsetzen nach einer Pause, setzt `published_at = now()` und hebt das Profil nach oben. Das ist Aktualität und keine Passung, bleibt aber ein Hebel (Restpunkt). Es ist kein STOP-Fall, weil kein verstecktes Matching entsteht.

## 13. FIND-Profil vs. privates Profil

- **FIND-Profil:** nur veröffentlichte Felder; Identität kanonisch aus `person_core` als Projektion, ohne Kopie zum Pflegen.
- **Privat** (`/me/profile`): Gesamtsicht mit Arbeitsprofil, Antworten, Stärken, Ressourcen.
- **Eigene Suche** (`/discovery/suche`): privat, Owner-only-RLS, wird nie gezeigt.
- In FIND erscheinen **keine** Research-, Advisor-, Setup- oder privaten Venture-Daten und keine einzelnen Workstyle-Antworten.

## 14. Privacy / Disclosure

- Auf dem eigenen FIND-Profil steht jetzt **„Was andere in FIND zusätzlich sehen“**: Foto (sichtbar/Initialen), Fähigkeiten (privat / Bereiche / Tiefe nach Kontakt) und Arbeitsweise-Hinweise (freigegeben oder nicht), jeweils mit „Ändern“. Dazu: „Nie sichtbar in FIND: deine private Suche, deine einzelnen Antworten, Team-, Advisor- und Forschungsdaten.“ Gelesen werden nur die bestehenden Felder; keine neue Consent-Architektur.
- Der Datenschutzhinweis der Detailseite ist präzisiert.
- `/discovery/suche` hat jetzt dieselbe Founder-Prüfung wie alle anderen FIND-Seiten.
- Der Hinweis „Alignment-Dimensionen wirken in der Liste“ unter gemerkten Suchen ist entfernt. Er war falsch, weil die Auslieferung seit 9.1 stillgelegt ist.

## 15. Intro-Flow

Anfrage mit optionaler Nachricht → Stand oben auf dem Profil (angefragt / angenommen / nicht angenommen / zurückgezogen) → Antwort unter „Kennenlernen“ (annehmen/ablehnen mit optionaler Antwort, zurückziehen, Gespräch öffnen).

Doppelte Anfragen:
- **Datenbank:** partieller Unique-Index je Richtung (pending).
- **App, neu:** Wer das Profil einer Person öffnet, die bereits angefragt hat, sieht deren Anfrage und keinen zweiten Anfrageweg.
- Nach Ablehnung oder Rückzug bietet das Profil keine neue Anfrage an.
- Der Stand bleibt nach einem Reload erhalten, weil er aus der Datenbank kommt.

## 16. Accept / Decline

- **Annehmen:** „Ihr seid verbunden“; Gespräch möglich; Tiefe der Fähigkeiten wird gemäß Einstellung sichtbar; „Gemeinsam weitergehen“.
- **Ablehnen:** „Intro aktuell nicht angenommen“ ohne Begründungspflicht.

## 17. FIND → Team → Report

Echt im Browser durchgespielt:
1. Anna fragt „Gemeinsam weitergehen“ an („Anfrage gesendet. Die andere Person muss noch zustimmen.“).
2. Ben sieht „{Name} möchte gemeinsam weitergehen“ und stimmt zu.
3. Ben sieht „Gemeinsam weiter mit Anna“ und öffnet den Teambereich über `open_discovery_workstyle_team`.
4. Ben landet auf `/teams/{id}/workstyle` mit „Freigabe fehlt“ – richtig, weil keine automatische Freigabe erfolgt.
5. Anna wird beim erneuten Öffnen direkt ins Team geleitet.

Es tauchte kein Legacy-Schritt auf: keine Matching-Session, kein alter Report, kein Workbook.

## 18. DE/EN

Alle neuen Texte stehen in Messages; DE/EN-Parität ist per Test gesichert. Geprüft mit `cofoundery_locale=en` (Liste, zwei Profile, eigenes Profil): keine deutsche Seitenumgebung. Deutsch erschienen nur nutzereingegebene Headlines und Nachrichten.

## 19. Accessibility

- Abschnitte mit `aria-labelledby`, h1 Person, h2 je Abschnitt.
- Listen für Gesprächspunkte; Links für Navigation, Buttons für Aktionen.
- Avatar mit Namens-Fallback (Initialen).
- Status als Text („Intro angenommen“), nicht nur als Farbe.
- Primäraktionen mindestens 44 px hoch (`min-h-11`).
- Keine Prozent-`progressbar` mehr.

## 20. Mobile / Desktop

390 px und 1280 px für Liste (beide Modi), drei Profile (angenommen, eingehend, abgelehnt), Kennenlernen, Gemeinsam weitergehen, eigenes Profil und das Profil aus Sicht eines Founders mit Team: überall **kein horizontaler Overflow**. Dazu Klickstrecke bei 390 px.

## 21. Tests

- **Neu:** `web/src/features/find/__tests__/phase11FindProduct.test.ts` (20 Tests)
  - leere Angaben ohne Punkte
  - Gründe in beide Rollenrichtungen, Branche, gesuchte Bereiche
  - Verantwortungswunsch nur sichtbar und nur Wunsch gegen Wunsch
  - Früh besprechen nur aus ausdrücklichen Unterschieden, mit Schwelle
  - Workstyle nur `DISCUSSION_POINT`, höchstens zwei
  - kein Score, keine Gewichtung, keine Sortierung im Baustein
  - Copy ohne „passt gut“, „kompatibel“, „hohes Potenzial“, „perfekter Co-Founder“, „Konfliktrisiko“, „starke Ergänzung“, Prozent (DE/EN)
  - Capability ohne Kompetenz- oder Rollenbehauptung, dritte Person
  - keine Motivationsdeutung bei der Suchintention
  - DE/EN-Parität; Workstyle-Bereichsnamen wie im Bericht
  - Detailseite aus echten Daten; keine Doppelanfrage
  - offene Sortierung; gelöschte Scoring-Module bleiben weg
  - Karte mit höchstens zwei Punkten
  - nach dem Intro der aktuelle Teambereich ohne alte Session und ohne hartkodierte Texte
  - eigenes Profil ohne Prozentbalken, mit Sichtbarkeitskasten
- **Angepasst** (positive Strukturtests; Negativzusagen bleiben):
  - `discoverySlice1` (Detailreihenfolge, Copy, Founder-Prüfung auch für `/suche` und `/searches`)
  - `discoverySlice3Journey` (keine Session/kein Report; neue Begriffe)
  - `discoveryProfilePage` (kein Prozentbalken; Fragereihenfolge)
  - `discoveryProfileNavigation`, `matchingPageResilience`, `matchingSessionReportFeedback`
  - `dreiWege` (Tests zum gelöschten `matchData.ts` entfallen)
- **Gelöscht:** `discoveryRecommendation.test.ts` (pinnte nur die tote Score-Liste).
- **`npm run ci:check`: PASS**
  - `tsc`
  - 2 824/2 824 Node-Tests
  - `next build`
  - pgTAP **tatsächlich gelaufen**: 143 Dateien, 2 262 Tests, Result PASS
- `git diff --check` sauber. ESLint ohne Fehler; die zwei Warnungen in angefassten Dateien bestanden schon vorher (`initials` in der Karte, `parseAreaIds`).
- **Browser:** Szenarien A–L mit echten lokalen Daten (5 Konten, 4 FIND-Profile, Intros pending/accepted/declined, Team), danach entfernt. Die lokale DB steht wieder bei 4 Nutzern und 1 Team, ohne FIND-Profile und ohne Intros.

## 22. Legacy-Audit

| Bestandteil | Einordnung | Hinweis |
|---|---|---|
| `discovery_matching_starts` + „Gemeinsam weitergehen“ | CURRENT | zweite beidseitige Zustimmung vor dem Team (Vertrag 9.1) |
| `open_discovery_workstyle_team` | CURRENT | einziger FIND→Team-Übergang |
| `MatchingStartStatusContent` (ohne `ready_for_matching`-Zweig) | CURRENT | Start, Warten, Zustimmen, Beendet |
| `MatchingSessionReadinessCard`, `ready_for_matching`-Zweig, Session-/Report-Aktionen und -Ladung auf der Matching-Seite | **gelöscht** | unerreichbar seit Phase 10; historische Reports bleiben über `/matching/[id]/report` lesbar |
| `discoveryRecommendation.ts`, `find/matchData.ts` | **gelöscht** | ohne Produktimporte; Score-Liste bzw. Service-Role-Leser |
| `matchingCore` (Sessions, `create_matching_session_from_discovery_start`), `/matching/[id]/report` | HISTORICAL_READ_ONLY / KEEP_FOR_COMPATIBILITY | alte Reports, Konto-Löschung |
| `find/discoveryMatch.ts`, `discoveryThemes`, `preferenceData/Actions`, `savedSearchFromPreferences` | KEEP_FOR_COMPATIBILITY | alte Themenpräferenzen in gemerkten Suchen |
| `find/matchPoints.ts`, `MatchPointsView.tsx` („Starker Matchpunkt“), `SearchPreferencesForm.tsx`, `DiscoveryAlignmentPreferencesEditor.tsx` | DELETE_CODE_LATER | ohne Produktimporte; noch von Tests gelesen |
| `discoveryAssessmentSignals*`, `discoveryV2Alignment`, Leerimport in `profile/page.tsx` | DELETE_CODE_LATER | alte Signalpfade, Auslieferung stillgelegt |
| v2.1 Discovery Topics (`pilot/discovery` → `/founder-alignment/suche`, `discovery_alignment_topics`) | HISTORICAL_READ_ONLY | Weiterleitung seit Phase 10 |
| Messages `discovery.index.*`, `matchingPreparation.readiness.*`, `feedback.session*/report*`, `v2.alignment.*`, `find.points.*`, `v2.watch.alignmentNote` | DELETE_CODE_LATER | nicht mehr gerendert |
| CSS `.discovery-meter-fill` | DELETE_CODE_LATER | nicht mehr verwendet; ein Animations-Test liest es noch |

## 23. Kandidaten für die DB- und Legacy-Bereinigung

- **Spalten in `founder_search_preferences`:** `priority_weights`, `include_assessment_signals`, `assessment_signals_consented_at`, `discovery_v2_alignment_*` sowie die Legacy-Schlüssel in `must_haves` (`requiredIndustriesAny`, `acceptedCommitmentLevels`, `acceptedVentureStages`, `acceptedVentureGoals`).
- **RPCs:** `discovery_theme_distances` (liefert nichts mehr), `discovery_preferences_for_match` (Service-Role, jetzt ohne Aufrufer), `create_matching_session_from_discovery_start`.
- **Tabellen:** `discovery_theme_preferences` (Editor verwaist), v2.1-Topic-Tabellen (`discovery_alignment_topics`, `discovery_profile_topics`).
- **Doppelte Anfragen in der Gegenrichtung:** heute nur in der App verhindert; serverseitig bräuchte es eine Prüfung im Insert-Policy-Pfad (Migration).
- **Republish-Bump:** Ein getrenntes `first_published_at` (oder kein Neusetzen beim Fortsetzen) bräuchte eine Migration bzw. eine bewusste Produktentscheidung.
- **Anzeige von Capability auf der Karte:** bräuchte die Bereiche in der Listen-RPC statt eines Aufrufs pro Karte.

## 24. Bekannte Restpunkte

1. **Republish-Bump:** Veröffentlichen und Fortsetzen setzen `published_at` neu (siehe 12 und 23).
2. **Doppelte Anfragen** sind in der Gegenrichtung nur in der App unterbunden; per direktem API-Aufruf wären A→B und B→A gleichzeitig offen möglich. Nach einer Ablehnung gibt es serverseitig keine Sperrfrist.
3. **Capability fehlt auf der Karte** (Listen-RPC liefert sie nicht; zwölf Einzelaufrufe pro Seite wären unverhältnismäßig).
4. **„Niemand verantwortet einen intern nötigen Bereich“** gibt es in FIND nicht. Vor einem Kontakt fehlen die Wünsche, und es bräuchte das Bereichs-Sourcing; das gehört in den Teambericht.
5. **Workstyle-Klärungspunkte** fallen bei vielen anderen Klärungspunkten aus der Viererliste heraus; sie stehen aber immer im Abschnitt „Arbeitsweisen im Gespräch“ darüber.
6. **Rollenlabels** wie „Product“ und „Tech“ sind auch im Deutschen englisch; die Werte von Einsatz, Stand und Ziel sind Ich-Formulierungen („Ich prüfe Ideen“) und lesen sich auf fremden Profilen als zitierte Selbstaussage. Bestand, nicht geändert.
7. **Hydration-Hinweis im Dev-Modus** an den bestehenden „Speichern und …“-Knöpfen des Profil-Editors (`SubmitButton` mit `formAction`). Bestand, durch diese Phase nicht verändert.
8. **Benennung:** Navigation „Find“, Seitenkopf „Menschen finden“, Kopfzeile „FIND“ – bewusst; die Navigation (`ProductShell`) war tabu.
9. Gemerkte Profile (`/discovery/saved`) zeigen keine Gesprächsanlässe.

---

## Antworten auf die Produktfragen

1. **Was sieht ein anderer Founder über mich?**
   - Immer: meine veröffentlichten FIND-Felder – Name, Headline, Bio, Ort, Remote, eigene und gesuchte Rollen, Expertise, Branchen, Zeit, Einsatz, Stand, Ziel, Suchintention, Start, letzter Schritt.
   - Nur bei Freigabe: mein Foto, meine Capability-Bereiche (Tiefe erst nach angenommenem Kontakt, wenn so eingestellt) und Workstyle-Hinweise (nur bei beidseitigem Opt-in).
   - Meine Intro-Nachricht sieht nur die angefragte Person.
2. **Was bleibt privat?** Private Suche und Gewichte, gemerkte Profile und Suchen, alle Workstyle-Antworten, Research, Team-, Venture- und Setup-Daten, Advisor-Daten, Capability-Belege und -Tiefe (ohne Kontakt bzw. Einstellung), das private Gesamtprofil.
3. **Warum wird eine Person angezeigt?** „Für dich“: weil sie ein aktives FIND-Profil hat und Founder ist. „Suchen & filtern“: weil sie meine ausdrücklichen Kriterien erfüllt. Nie wegen errechneter Passung.
4. **Gibt es noch faktisch ein Ranking?** Nein. Die einzige Rangwirkung ist die Aktualität (inklusive Republish-Bump). Die toten Score-Module sind gelöscht; übrig ist ungenutzter Themen-/Matchpunkt-Code ohne Anzeige.
5. **Sortierung heute:** `published_at desc nulls last, id`, 12 pro Seite, offen auf der Seite benannt.
6. **Was hilft bei „Profil öffnen“?** Headline, Suchintention und Start, eigene und gesuchte Rollen, Zeit sowie die zwei konkreten Gesprächsanlässe auf der Karte.
7. **Was hilft bei „Intro senden“?** Der Abschnitt „Sucht und möchte aufbauen“, freigegebene Fähigkeiten, Workstyle-Hinweise sowie „Warum ein Gespräch“ und „Früh besprechen“ mit konkreten Werten.
8. **Was fehlt typischerweise?**
   - Suchintention und Start sind freiwillig.
   - Branchen und Expertise sind oft leer.
   - Capability-Freigabe ist standardmäßig `private`, also gibt es dann keine Capability in FIND; das Workstyle-Opt-in ist standardmäßig aus.
   - Den letzten Schritt gibt es selten.
   - Sprachen gibt es als Feld gar nicht.
9. **Redundante Pflege:**
   - Die Identität ist kanonisch (`person_core` → FIND und CONNECT, einseitig).
   - Getrennt gepflegt werden die Rollen und der Rahmen in FIND gegenüber den CONNECT-Rollen.
   - Gemerkte Suchen kopieren die private Suche verlustbehaftet (Intention, Start und Stunden fallen weg).
   - Fotofreigabe und Capability-Freigabe gelten für beide Kontexte zugleich.
10. **Was kann in der nächsten Cleanup-Phase weg?** Siehe 22 und 23: verwaiste Matchpunkt-, Alignment- und Assessment-Signal-Module und -Messages, die Legacy-Spalten in `founder_search_preferences`, `discovery_theme_*`, `discovery_preferences_for_match`, `create_matching_session_from_discovery_start` und die v2.1-Topic-Tabellen. `discovery_matching_starts` bleibt (aktueller zweiter Zustimmungsschritt).

## Geänderte Dateien

- **Neu:** `web/src/features/find/conversationPrompts.ts`, `web/src/features/find/ConversationPoints.tsx`, `web/src/features/find/__tests__/phase11FindProduct.test.ts`, dieses Dokument.
- **Geändert:**
  - Seiten: `discovery/page.tsx`, `discovery/[profileId]/page.tsx`, `discovery/intros/[introRequestId]/matching/page.tsx`, `discovery/profile/page.tsx`, `discovery/suche/page.tsx`
  - Features: `FounderDiscoveryCard.tsx`, `DiscoverySavedSearchForm.tsx`, `discoveryIntroData.ts`, `find/DiscoveryWorkstyle.tsx`
  - Messages: `messages/{de,en}/discovery.json`, `messages/{de,en}/find.json`
  - Tests: `discoverySlice1`, `discoverySlice3Journey`, `discoveryProfilePage`, `discoveryProfileNavigation`, `matchingPageResilience`, `matchingSessionReportFeedback`, `dreiWege`
- **Gelöscht:** `web/src/features/discovery/discoveryRecommendation.ts` (+ Test), `web/src/features/find/matchData.ts`

Migration: **nein**.

---

NO MATCHING SCORE INTRODUCED
NO HIDDEN COMPATIBILITY RANKING INTRODUCED
NO RESEARCH DATA EXPOSED
NO PRIVATE TEAM DATA EXPOSED
NO CONSENT SEMANTICS CHANGED
NO RELATIONSHIPS AUTO-CREATED OUTSIDE EXISTING INTRO FLOW
NO LEGACY USER DATA DELETED
NO REMOTE DB PUSH
NO PRODUCTION DEPLOY
