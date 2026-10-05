# Phase 10 – Berichtsqualität und Umstellung auf den aktuellen Weg

Stand: 05.10.2026. Branch: `feat/workstyle-reporting-v04`. Ausgangscommit: `15077eed` (`feat: redesign team homebase experience`). Alle Änderungen dieser Phase sind lokal und **nicht committed**. Kein Push, kein Deployment, kein Remote-Supabase-Push, **keine Migration**.

Zwei gleichrangige Ziele:

- **A – Berichtsqualität:** Einzelbericht („Wie du arbeitest“) und Teambericht („Euer Zusammenspiel“) sind fachlich, sprachlich und visuell überarbeitet.
- **B – Umstellung:** Workstyle v0.4 ist der einzige aktive Weg für neue Nutzer und neue Teams. Historische Berichte bleiben lesbar.

Innerhalb der Grenzen dieser Phase: keine neue Instrumentversion, keine geänderten Items, keine Änderung an der Scoring-Logik, keine neuen Konstrukte, keine Änderung an Einwilligungen oder RLS. Es werden keine Daten gelöscht und keine Tabellen entfernt.

---

## 1. Umstellung vorher / nachher

| Einstieg | Vorher | Nachher | Einordnung |
|---|---|---|---|
| Advisor-Teameinladung `/team-invite/[token]` | Nach dem Beanspruchen → `/me/base?invitationId=…`; legte dort einen Entwurf `founder-compatibility-v1` und eine Matching-Bindung an | → `/join/start?invitationId=…` (der Einstieg entscheidet zwischen Arbeitsprofil v0.4 und Teambericht) | REDIRECT_TO_CURRENT |
| „Etwas ändern“ auf `/founder-alignment/vorhaben/bestaetigen` | → `/founder-alignment/pilot` (archivierter Fragebogen v2.1) | → `/founder-alignment/vorhaben?venture=…` (aktueller Vorhaben-Fragebogen) | REDIRECT_TO_CURRENT |
| Discovery, zweite Zustimmung | Legte nach der Bestätigung still eine Matching-Session der früheren Fassung an | Nur noch die Zustimmung selbst; danach führt die Seite zu „Euer Zusammenspiel öffnen“ (`open_discovery_workstyle_team`) | REMOVE_ACTIVE_ENTRY |
| `/me/base`, `/me/values` | Fragebogen der früheren Fassung; legte beim Öffnen einen Entwurf an | Weiterleitung: mit Einladung nach `/join/start`, sonst zum aktuellen Arbeitsprofil | REDIRECT_TO_CURRENT |
| `/me/base/complete`, `/me/values/complete` | Abschlussseiten der früheren Fassung | → `/me/profile` | REDIRECT_TO_CURRENT |
| `/invite/[id]/basis-complete` | Zwischenseite Basis → Werte | → `/join/start?invitationId=…` | REDIRECT_TO_CURRENT |
| `/me/report` ohne früheren Bericht | Leerzustand mit Link zu `/me/base` | → `/me/profile/workstyle` (aktueller Bericht mit „Wie du arbeitest ausfüllen“) | REDIRECT_TO_CURRENT |
| `/me/report` mit früherem Bericht | Bericht | unverändert, datiert | HISTORICAL_READ_ONLY |
| `/founder-alignment/pilot` (v2.1) | Für jeden Founder ausfüllbar | Wer v2.1-Antworten hat → `/founder-alignment/pilot/report`; alle anderen → aktuelles Arbeitsprofil | REDIRECT_TO_CURRENT / HISTORICAL_READ_ONLY |
| `/founder-alignment/pilot/discovery` | Formular „Wonach du suchst“ der Testfassung | → `/founder-alignment/suche` | REDIRECT_TO_CURRENT |
| `/research/workstyle-pretest?version=8.5a-v1|v2` | Neue Teilnahme in früheren Pretest-Fassungen möglich | Nur noch, wenn bereits eine Teilnahme in dieser Fassung existiert; sonst → `8.5a-v3` (inkl. `invitationId`) | HISTORICAL_READ_ONLY / REDIRECT_TO_CURRENT |
| Einladungsformular `/invite/new` | Hinweis „du lädst in die bisherige Fassung ein“; Auswahl „Basis / Werte“ | Kein Hinweis (jede Einladung führt in den aktuellen Weg), keine Modulauswahl | REMOVE_ACTIVE_ENTRY |
| Dashboard, eingehende Einladungen | Beschriftung nach Fortschritt im früheren Bogen („Werte-Modul öffnen“, „Jetzt fortsetzen“), Zeile „Module: Basis, Werte“ | „Einladung öffnen“ bzw. „Status öffnen“/„Öffnen“; nur Datum | REMOVE_ACTIVE_ENTRY |
| Frühere Berichte (`SelfReportView`) | Knopf „Werte starten“ → `/me/values` | Kein Knopf | REMOVE_ACTIVE_ENTRY |
| `/me/profile`, leerer aktueller Bericht | „Arbeitsprofil kennenlernen“ → `/research/workstyle-pretest` | Hinweis plus „Wie du arbeitest ausfüllen“ → `CURRENT_WORKSTYLE_HREF` | REDIRECT_TO_CURRENT |
| `/me/profile`, früheres Arbeitsprofil (founder-profile-v1) | Undatiert, mit „Bearbeiten“-Link in den alten Fragebogen | Datiert („Stand: …“), Text „nur noch zum Nachlesen“, **kein** Bearbeiten-Link | HISTORICAL_READ_ONLY |
| Versionskarten (`VersionArchiveCard`, `VersionChoiceView`) | Links zu `/me/base` und `/pilot/discovery` | „Wie du arbeitest ausfüllen“ bzw. `/founder-alignment/suche` | REDIRECT_TO_CURRENT |
| Server-Actions | `saveAnswerV21` und `saveAnswer('founder_profile')` legten bei Bedarf neue Entwürfe an | Kein neuer Entwurf: v2.1 → `archived_instrument`, founder_profile → `{ ok: false, reason: "archived_instrument" }`; `startWorkstylePretest` lehnt neue Teilnahmen in v1/v2 ab | REMOVE_ACTIVE_ENTRY (nur App-seitig) |

Gemeinsame Hilfsfunktion: `currentPathForLegacyQuestionnaire(invitationId?)` in `src/features/instruments/workstyle/current.ts` (dort auch neu `CURRENT_WORKSTYLE_VERSION`).

## 2. Aktiver aktueller Weg

Neuer Founder: Anmeldung → Arbeitsprofil `founder-workstyle-pretest-8-5a-v3` (`CURRENT_WORKSTYLE_HREF`) → `/me/profile/workstyle` (Bericht, Freigaben, Stand festhalten) → Team: `/teams/[id]` → „Euer Zusammenspiel“ (`/teams/[id]/workstyle`), „Was ihr aufbauen wollt“ (`venture-alignment-v1`), „Fähigkeiten & Verantwortung“, Founder Setup.

Einladungen (Advisor-Team-Einladung, Co-Founder-Einladung, Discovery) führen alle über `/join/start` bzw. `open_discovery_workstyle_team` in diesen Weg. `resolveInvitationContinueTarget` lieferte bereits vorher nur aktuelle Ziele; jetzt führt auch kein Seiteneinstieg mehr daran vorbei.

## 3. Historischer Weg

Lesbar bleibt, wer frühere Daten hat:

- `/me/report` (früherer Selbstbericht, datiert über `InstrumentNote`)
- `/me/profile` und `/me/profile/print`: „Deine frühere Auswertung“ (datiert) und „Früheres Arbeitsprofil – historischer Stand“ (jetzt datiert), jeweils eingeklappt und unter dem aktuellen Bericht
- `/founder-alignment/profil/antworten`, `/founder-alignment/pilot/report`, `/founder-alignment/pilot/compare/[partnerId]`
- `/report/[id]`, `/matching/[id]/report`, Workbook-Seiten, `/workspaces/[id]`, Abschnitt „Frühere Auswertungen“ der Team-Homebase
- Advisor-Personenansicht (frühere Antworten nur, wenn freigegeben)

Kein historischer Bericht dient als Ersatz für einen fehlenden aktuellen Bericht. Ohne aktuellen Bericht erscheint der Leerzustand mit „Wie du arbeitest ausfüllen“. Niemand wird zur Migration gezwungen.

## 4. Einzelbericht: Befund

Ausgangslage (`IndividualWorkstyle`, Stand vorher):

- Die Kernaussage je Bereich wurde aus **einem** Item abgeleitet. Bei gemischten Antworten las sich das wie eine klare Richtung (Scheinpräzision).
- Es gab statische „Vorteil“-Sätze, die unabhängig von den Antworten erschienen.
- Alle 29 Einzelantworten standen ausgeklappt im Fließtext, der Bericht war 9 Seiten lang.
- AMB wurde wie Verhalten formuliert, obwohl das Instrument Unbehagen misst.
- Die Advisor-Ansicht sprach die Person mit „du“ an, ohne einzuordnen, wessen Selbstauskunft es ist.

## 5. Einzelbericht: Verbesserungen

- Neues Modul `narrative.ts`: deterministische Texte aus dem **Antwortmuster des ganzen Bereichs** (`areaPattern`).
  - `direction` (alle oder fast alle Antworten gleichgerichtet, keine Gegenantwort) → Kernaussage. Die Sätze zum Alltag und zur Wirkung auf andere wurden in Phase 10B wieder entfernt, weil das Instrument sie nicht trägt (siehe Teil B).
  - `mixed` → keine Richtung, stattdessen die konkreten Situationen, gruppiert nach „Eher wahrscheinlich / Teils/teils / Eher unwahrscheinlich“.
  - `insufficient` (< 2 Antworten) → keine Aussage.
- ORG: Die Vergleichsitems (Fokus, Unterbrechung, Planänderung) stehen als eigene Sätze mit „eher“ bzw. „deutlich eher“.
- AMB: ausdrücklicher Hinweis „Das beschreibt dein Empfinden – nicht, wie du in der Situation handelst.“
- Je Bereich eine Frage „Zum Weiterdenken“.
- Einleitung: „keine Persönlichkeit, keine Eignung und keine Rangfolge … nicht validiert“.
- Advisor-Ansicht (`perspective="other"`): „Selbstauskunft von {Name} … an {Name} gerichtet formuliert“.
- Alle Einzelantworten stehen im Anhang „Alle Antworten im Detail“ (aufklappbar; gedruckt nur in der ausführlichen Fassung).
- Überblick (`SignatureOverview`): neue Bildunterschrift „Links und rechts sind gleichwertig – keine Seite ist besser, und es gibt keinen Gesamtwert.“

## 6. Teambericht: Befund

- Die Gesprächsagenda stand oben **und** unten, mit einer Frage je Bereich – unabhängig davon, ob es dort einen Befund gab.
- `ReportViewV21` wiederholte für jede Person den kompletten Venture-Fragetext. Bei 4 Foundern stand jede Frage viermal da (Hauptgrund für 55 Seiten).
- Die vollständige 29-Item-Signatur stand ausgeklappt im Text.
- „Komplement“ entstand schon bei Mitte gegenüber klarer Antwort.
- Die Fähigkeiten-Matrix war schwer lesbar: alle Bereiche, alle Personen, Zustandslabels in Systemsprache.
- Gleichnamige Personen (Fallback „Founder“) waren nicht unterscheidbar.

## 7. Teambericht: Verbesserungen

Reihenfolge jetzt: **Auf einen Blick → Worüber ihr früh sprechen solltet → Wie ihr arbeitet → Fähigkeiten & Verantwortung → Was ihr aufbauen wollt → Was ihr bereits vereinbart habt.**

- Auf einen Blick: Namen, Einordnung („sagt nicht, wie gut ihr zusammenpasst“), Antwortmuster, Kurzfassung Verantwortung, Sprungnavigation (nicht im Druck).
- **Eine** Agenda, vorn, höchstens 8 Fragen, jede aus einem Befund (Abschnitt 14).
- Bereichskarten aus `teamAreaFinding`: Zusammenfassung, höchstens zwei Situationen mit Namensgruppen, Hypothese und Frage nur bei Gegenpol. Link „Im Founder Setup besprechen“ nur für Mitglieder.
- Alle Einzelantworten im Anhang.
- `teamPatterns`: `complement` nur noch bei echten Gegenpolen (lower und upper bzw. A und B).
- `distinctNames`: Doppelte Namen werden zu „Founder 1“, „Founder 2“.
- Venture: jede Frage nur einmal, darunter die Antworten. Gleiche Antworten sind zusammengefasst, in der Reihenfolge der Personen. Ähnlich beantwortete Fragen stehen im Anhang.
- `full`-Prop: Die ausführliche Fassung öffnet alle Anhänge und druckt sie mit.

## 8. Zwei, drei und vier Founder

- Wortwahl „beide“ bzw. „alle“ / „beiden“ bzw. „allen“ je nach Teamgröße.
- Gruppen stehen in **Skalenreihenfolge** (lower, middle, upper, A, B), nie nach Größe. Eine einzelne Antwort steht gleichwertig an ihrem Skalenplatz; dazu der Satz „eine einzelne abweichende Antwort ist genauso gültig wie die anderen“.
- Keine Mehrheits- oder Lagersprache. Ein Test prüft für 3 und 4 Founder: kein „Mehrheit“, „Minderheit“, „2 gegen 1“, „Lager“, „Ausreißer“ usw.
- Venture R02 („die andere Person“) bleibt bei 3+ als „Empfängerbezug gemeinsam klären“ markiert, ohne Teamvergleich.
- Keine Paarbildung im Teambericht.

## 9. Regeln für die Texte

- Jede Aussage lässt sich auf Antworten zurückführen; Texte entstehen nur aus `responseBand` (≤2 / 3 / ≥4 bzw. A/B).
- Eine Richtung braucht ein getragenes Muster. Eine einzelne Gegenantwort macht daraus „gemischt“.
- Formuliert wird immer situativ: „in den beschriebenen Situationen“, „eher“, „deutlich eher“. Keine Eigenschaftswörter über die Person.
- Ähnlichkeit wird nicht automatisch zum Vorteil, Unterschied nicht automatisch zum Problem. Bei Ähnlichkeit: „Das legt noch nicht fest, wie ihr im Alltag zusammen handelt.“
- Nuancen (Mitte gegenüber klarer Antwort) werden als Nuancen benannt, ohne Hypothese.
- Kein Wert, keine Prozentzahl, kein Typ, keine Diagnose, keine Ampel. Abgesichert durch Tests auf dem erzeugten Text.

## 10. Interaktionshypothesen

Nur bei `kind: "opposite"`. Aufbau seit Phase 10B: **Beobachtung (Situationen in der Karte) → Arbeitskontext → mögliche Interaktion („könntet ihr …“) → Gesprächsfrage**. Beispiel EVI: „Beim gemeinsamen Entscheiden: Wenn eine Person eine Einschätzung noch einmal prüfen möchte und eine andere damit weiterarbeiten will, könntet ihr unterschiedlich sehen, wann eine Entscheidung steht. Das könnte sich ergänzen, wenn ihr vorab klärt, wann eine Entscheidung noch einmal geöffnet wird.“ Für ORG gibt es itemgenaue Varianten: Fokus/Unterbrechung (ORG-03/07) und Planänderung (ORG-04/08). Für AMB gilt: „Das Empfinden sagt nichts darüber, wie jemand handelt.“

## 11. Fähigkeiten

- Drei getrennte Achsen, nie verrechnet: Erfahrung (`application_level`), Verantwortungswunsch (`ownership_wish`, nur `own` zählt als „möchte verantworten“) und Sourcing.
- Hauptansicht je Person: Viel Erfahrung (ab Stufe 4) · Möchte verantworten · Möchte hineinwachsen · Möchte abgeben oder extern lösen.
- „Wo Verantwortung noch zu klären ist“: niemand möchte verantworten (intern), mehrere möchten, nur eine Person (Vertretung), extern gewünscht, aber intern zu verankern.
- Die vollständige Matrix steht im Anhang. Fehlende Angaben werden nicht als fehlende Fähigkeit gedeutet.
- `COMPONENT_LABELS` sind in Wunschsprache umformuliert; die Logik ist unverändert.

## 12. Venture Alignment

Getrennt von den Arbeitsweisen. Im Text stehen nur Fragen mit unterschiedlichen Antworten (und R02 bei 3+), gruppiert nach Abschnitt, mit `readoutText` als Kurzantwort. Ausfüllhinweise wie „– bitte angeben“ werden aus der Antwort entfernt. Es folgt die Zahl der noch offenen Fragen; ähnliche Erwartungen stehen im Anhang. Gibt es keine sichtbaren Antworten, verweist der Bericht auf „Was ihr aufbauen wollt“. Nicht sichtbare Antworten werden nicht als Aussage über eine Person gelesen.

## 13. Founder Setup

„Was ihr bereits vereinbart habt“ zeigt ausschließlich `team.setup` – Vereinbarungen, die **alle aktuellen Mitglieder** bestätigt haben – mit Bestätigungsdatum. Ähnliche Antworten gelten ausdrücklich nicht als Vereinbarung. Status auf der Homebase: Nach einer Teamänderung heißt es jetzt „Erneut zu bestätigen“ (`reconfirm`), nicht mehr „In Klärung“. „In Klärung“ bleibt für tatsächlich laufende Diskussionen und Änderungsvorschläge.

## 14. Gesprächsagenda

Reihenfolge: (1) Gegenpole in den Arbeitsweisen, (2) Verantwortung, die intern liegen sollte, die aber niemand übernehmen möchte, (3) Bereiche, die mehrere verantworten möchten, (4) bis zu drei unterschiedliche Venture-Erwartungen, (5) Fragen bei gemeinsamer Richtung. Höchstens 8 Fragen. Die Reihenfolge ist ausdrücklich keine Rangfolge der Schwere. Gibt es keinen Befund, steht dort eine einzige Prüffrage. Für Mitglieder führt jede Frage per Link ins passende Setup-Thema (`workstyleSetupHref`, Rollen → `roles_responsibilities`).

## 15. Terminologie

- Team-Fähigkeitensicht überall **„Fähigkeiten & Verantwortung“** / EN „Skills & responsibility“: Teamnavigation, Homebase-Kachel (vorher „Was ihr einbringt“), Seitentitel `/teams/[id]/roles` (vorher „Rollen und Zuständigkeiten“) und Abschnitt im Teambericht. „Rollen & Verantwortlichkeiten“ bleibt der Name des **Setup-Themas** (Vereinbarung, nicht Selbstauskunft).
- „Erneut zu bestätigen“ (nach Teamänderung) und „In Klärung“ (laufende Diskussion) sind jetzt getrennt.
- Ein Test sichert ab, dass Navigation, Kachel und Seitentitel identisch heißen.

## 16. DE/EN

- Die Seitentexte der Berichtsseiten kommen aus `report.workstyle` (DE und EN), die Profiltexte aus `profile.founderProfile.currentWorkstyle` und `historicalWorkProfile`, Dashboard-Ergänzungen aus `team.expires` und `incomingActions.openInvitation`.
- Der Berichtsinhalt bleibt deutsch (das Instrument gibt es nur auf Deutsch). EN-Nutzer sehen den Hinweis „This report is currently available in German only …“. Der Berichtsbereich trägt `lang="de"`, der Hinweis `lang={locale}`. So gibt es keinen unmarkierten Sprachmix.
- Geprüft mit `cofoundery_locale=en`: Titel „How you work“ und Hinweis erscheinen.

## 17. Barrierefreiheit

- Abschnitte mit `aria-labelledby`, saubere Überschriftenhierarchie (h1 Seite, h2 Abschnitte, h3 Karten).
- Sprungnavigation mit `aria-label="Reportabschnitte"`.
- `details/summary` mit sichtbarem Fokusring.
- Informationen nie nur über Farbe oder Position: Der Überblick nennt je Person die Antwort als Text.
- `lang`-Attribute wie in Abschnitt 16.

## 18. Mobil

390 px: kein horizontales Scrollen auf allen gemessenen Seiten (`scrollWidth − innerWidth = 0`), auch beim Teambericht mit 4 Foundern. Karten stapeln einspaltig, Namensgruppen brechen um.

## 19. Druck / PDF

- Kompakte Fassung (Standard): Aussagen, Agenda, Überblick, keine Anhänge (`.ws-report .ws-appendix { display: none !important; }`).
- Ausführliche Fassung: Link „Ausführliche Fassung mit allen Antworten“ (`?ansicht=ausfuehrlich`) setzt `full`. Die Anhänge sind dann offen und werden gedruckt (`.ws-print-full`).
- Teamnavigation, Links und Knöpfe erscheinen nicht im Druck (`ws-no-print`).
- „Diesen Stand festhalten“ erscheint nicht mehr, während ein festgehaltener Stand angezeigt wird. Der Knopf hätte dort den aktuellen und nicht den angezeigten Stand gespeichert.

## 20. Berichtslänge

Gemessen mit Chrome headless (A4-PDF, `innerText` von `main`), lokale Testdaten mit bewusst unterschiedlichen Personen:

| Bericht | vorher Seiten | vorher Zeichen | nachher kompakt Seiten | nachher Zeichen | nachher ausführlich Seiten |
|---|---|---|---|---|---|
| Einzelbericht `/me/profile/workstyle` | 9 | 11 697 | **4** | 5 403 | 10 |
| Profil-Druck kurz | 5 | 6 506 | 6 | 7 658 | – |
| Profil-Druck voll | 12 | 15 307 | 13 | 16 530 | – |
| Team, 2 Founder | 34 | 33 931 | **12** | 15 533 | 20 |
| Team, 3 Founder | 23 | 24 385 | **8** | 9 993 | 18 |
| Team, 4 Founder | 55 | 47 219 | **14** (nach 10B: 15) | ≈18 000 (nach 10B: 19 152) | ≈29 |

Der Profil-Druck ist um eine Seite gewachsen, weil die Bereichstexte jetzt dort stehen, wo vorher nur Einzelantworten standen. In den Teamberichten mit 2 und 4 Foundern kommt die verbleibende Länge fast ganz aus dem Abschnitt „Was ihr aufbauen wollt“: In den Testdaten waren 26 bzw. 27 Venture-Fragen unterschiedlich beantwortet, und jede davon ist ein echter Gesprächsanlass.

## 21. Entfernte aktive Einstiege der früheren Fassungen

Siehe Abschnitt 1. Zusammengefasst:

- Advisor-Teameinladung → /me/base
- „Etwas ändern“ → v2.1-Pilot
- Discovery-Matching-Session nach der zweiten Zustimmung
- `/me/base` und `/me/values` (inkl. Entwurfsanlage)
- Abschlussseiten der früheren Fassung
- `/me/report`-Leerzustand
- v2.1-Fragebogen und v2.1-„Wonach du suchst“
- Neustart der Pretest-Fassungen v1/v2
- Versionshinweis und Modulauswahl im Einladungsformular
- Werte-Knopf in früheren Berichten
- Fortschrittsbeschriftungen im Dashboard
- Bearbeiten-Link des früheren Arbeitsprofils
- `/me/base`-Links in Versionskarten
- neue Entwürfe über Server-Actions (v2.1, founder_profile, Pretest v1/v2)

## 22. Weiterhin erhaltene historische Reader

`getLatestSelfAlignmentReport`, `getScopeReport('founder_profile')`, `SelfReportView`, `ReportViewV21`, `WorkMap`, `WorkProfileSynthesisView`, `/report/[id]`, `/matching/[id]/report`, Workbook-Reader, `/founder-alignment/pilot/report|compare`, `/founder-alignment/profil/antworten`, frühere Pretest-Teilnahmen (v1/v2) für Menschen, die sie haben, sowie die Abwicklung früherer Einladungen (`/invite/[id]/done`, `getInvitationJoinDecision`) – bewusst unangetastet (KEEP_FOR_PRIVACY_OR_COMPATIBILITY). Datenschutzroutinen (Konto- und Forschungslöschung) und Advisor-Brücken sind unverändert.

## 23. Tests

- **Neu:** `src/features/reporting/workstyle/__tests__/phase10Narrative.test.ts` (13 Tests)
  - gemischtes Muster ohne Richtung
  - getragene Richtung
  - Hypothesen nur bei Gegenpol, immer mit „könnte“/„kann“ und Frage
  - Komplement nur bei Gegenpol
  - keine Mehrheitssprache bei 3/4 Foundern; Gruppen in Skalenreihenfolge
  - kein Wert, keine Prozentzahl, kein Typ und kein „Vorteil“ im erzeugten Text
  - `distinctNames`
  - `currentPathForLegacyQuestionnaire`
  - Struktur des Teamberichts (eine Agenda vorn, Signatur im Anhang, kein `ReportViewV21`, keine Bewertungsgrafik)
  - Druckregeln und ausführliche Fassung
  - EN-Hinweis
  - Leerzustand mit „Wie du arbeitest ausfüllen“
  - Terminologie und `reconfirm`
- **Angepasst (positive Strukturtests; die Negativzusagen bleiben):**
  - `discoverySlice3Journey.test.ts`: zweite Zustimmung legt keine Session der früheren Fassung an
  - `einladungFassung.test.ts`: kein Versionshinweis; `/me/base` und `/me/values` leiten weiter und legen nichts an
  - `pilotPagesSayWhatTheyAre.test.ts`: archivierter Fragebogen lädt nicht mehr ein; reine Weiterleitungen sind von der Kennungsprüfung ausgenommen
  - `arbeitsprofilSynthese.test.ts` und `founderProfile.test.ts`: datierte historische Überschrift über Messages, Leerzustand → `CURRENT_WORKSTYLE_HREF`, Reihenfolge aktueller Bericht vor Altbestand
- **`npm run ci:check`: PASS**
  - `tsc --noEmit`
  - 2 802/2 802 Node-Tests
  - `next build`
  - pgTAP: 143 Dateien, 2 262 Tests
- `eslint`: 0 Fehler. In den angefassten Dateien gibt es nur zwei Warnungen, beide bestanden schon vorher (`hasStartedBase` im Dashboard, `vocabulary` in `/me/profile`).
- `git diff --check`: sauber.
- Hinweis: Ein erster `ci:check`-Lauf schlug in zwei pgTAP-Suiten fehl (`account_deletion_integrity`, `founder_team_setup`). Ursache waren die lokalen Phase-10-Testdaten in der Datenbank, nicht der Code. Nach dem Entfernen der Testkonten waren alle Suiten grün.
- Browser (Chrome headless, eigener Dev-Server auf 3194)
  - Einzelbericht, kompakt und ausführlich
  - Profil-Druck kurz und voll
  - Teambericht mit 2, 3 und 4 Foundern
  - jeweils 1280 und 390 px, dazu A4-PDF
  - keine Konsolenfehler
  - alle Weiterleitungen per HTTP geprüft

## 24. Bekannte Restpunkte

1. **Datenbankseitige Sperre fehlt.** Die alten Start- und Schreib-RPCs und Tabellenrechte für `founder-compatibility-v1`, v2.1 und Pretest v1/v2 sind weiter offen. Die App ruft sie nicht mehr auf, und die Server-Actions lehnen neue Entwürfe ab. Ein direkter Aufruf über PostgREST wäre aber weiter möglich. Das zu schließen erfordert eine Migration (Rechte entziehen bzw. `archived` erzwingen). Nach der Phasenregel („STOP und erst begründen“) ist sie **nicht** angelegt; sie gehört in die geplante DB-Bereinigung.
2. **Versteckte Schreibvorgänge für Menschen mit früheren Daten:** `getInvitationJoinDecision` (bei `/join/start`), Dashboard und `/report/[id]` legen Report-Runs an; das Lesen des früheren Berichts schreibt `person_alignment_snapshots`. Neue Nutzer sind davon nicht betroffen. Die Abwicklung früherer Einladungen ist bewusst unangetastet.
3. `/invite/[id]/done` und die API `join-decision` bauen noch `/me/base`-URLs. Diese leiten jetzt in den aktuellen Weg weiter; der Code wird später aufgeräumt.
4. Discovery: Die Session-Ansicht im Zustand `ready_for_matching` (`MatchingStartStatusContent`) ist nicht mehr erreichbar (die Seite leitet vorher in den Teamweg). Sie ist toter Code.
5. Ungenutzt geworden: `InviteVersionNote`, `PreviousVersionNote`, `worksWithPrevious`/`invitationVersion.ts` (RPC `invitation_uses_previous_version`), `SelfValuesProfileSection`, Dashboard-Task `values_continue` (war schon ausgefiltert), Messages `missingWorkProfile.*`, `workProfile.intro`, `coFounderInviteForm.modules.*`, `result.activeModules`, `incomingActions.openValues|startMatching|startNow|continueNow`.
6. Der Berichtsinhalt ist nur auf Deutsch verfügbar (Instrument nur DE); EN bekommt einen Hinweis statt einer Übersetzung.
7. Bei vielen unterschiedlichen Venture-Antworten bleibt der Abschnitt „Was ihr aufbauen wollt“ lang. Mögliche nächste Stufe: Abschnitte einklappbar machen oder je Abschnitt eine Zusammenfassung. Das ist bewusst nicht gemacht, damit kein Befund versteckt wird.
8. Der Überblick zeigt je Bereich den Median der vergleichbaren Items. In der Bildunterschrift ist er erklärt, er bleibt aber eine Verdichtung. Die Texte darunter zeigen das Muster.

## 25. Kandidaten für die spätere DB- und Code-Bereinigung

- **Migration (später, begründet):**
  - Start- und Schreib-RPCs der früheren Instrumente entziehen bzw. `instrument.status = archived` serverseitig erzwingen
  - Pretest v1/v2 nur noch für bestehende Teilnahmen
- **Code (DELETE_CODE_LATER):**
  - Fragebogen-Bausteine der früheren Fassung (`QuestionnaireClient`, `founderCompatibilityBaseQuestionnaire`, Werte-Fragebogen), `QuestionnaireV21`, `DiscoveryTopicsFormV21`, `discoveryActionsV21`, `WorkstylePretest` (v1)
  - `answerActionsV21`-Schreibpfade, `buildInvitationQuestionnaireHref`
  - Refresh-Zweige in `/invite/[id]/done`
  - Discovery-Session-UI
  - die ungenutzten Komponenten und Messages aus Restpunkt 5
  - `TransitionAnnounce`
- **Daten:** keine Löschung vorgesehen. Historische Antworten und Berichte bleiben lesbar, solange es Nutzer mit diesen Daten gibt. Konto- und Forschungslöschung bleiben der einzige Löschweg.

---

# Teil B – Phase 10B: Evidence-to-Claim-Audit

Stand: 05.10.2026, ebenfalls nicht committed. Prüffrage: Bleibt jede inhaltliche Aussage im Einzel- und Teambericht innerhalb dessen, was das Instrument bzw. die Produktdaten tragen? Kette: **Messung → Evidenz → Aussage → Wortlaut**. Grundlage: Itemtexte und Konstruktdefinitionen in `docs/research/phase-8/phase-8.4-v0.4-workstyle-development-instrument.md`. Keine Itemänderung, keine neue Dimension, keine Migration, keine neue Scoringlogik.

## B1. Evidence-to-Claim Boundaries

Pro Bereich: was gemessen wird (Items, Format), was daraus gesagt werden darf und was nicht.

| Bereich | Gemessen (produktfähige Core-Items) | Daraus erlaubt (bei getragenem Muster) | Daraus nicht erlaubt |
|---|---|---|---|
| **EVI** – Evidenzorientierung | 5 × `likelihood`: Gegenargumente zum spontanen Favoriten suchen (01), unsichere Annahme vor Festlegung prüfen (02), Entscheidung bei deutlicher Gegeninformation erneut prüfen (03), eigene Einschätzung bei nachvollziehbarem Gegenpunkt prüfen (05), Widerspruch seriöser Quellen nachgehen (06) | „In den beschriebenen Situationen prüfst du eine Einschätzung eher (nicht) noch einmal“, mit Nennung der Itemhandlungen | Intelligenz, objektive Rationalität, Urteilsqualität, „kritisches Denken“, Entscheidungstempo („zügig“), Nachfragen bei anderen (das wäre FS, nur Research) |
| **EXP** – Erfahrungsbasierte Urteilsnutzung | 4 × `influence`: Erfahrung gegen Papierlösung (02), Erfahrung als Ausschlag bei Gleichstand (03), Erfahrung bei wiederholtem Problem (04), Erfahrung bei fehlenden Informationen im vertrauten Thema (06); dazu 1 × `seriousness`: unbegründeter vertrauter Eindruck (01) | „Frühere Erfahrungen beeinflussen deine Einschätzung in den beschriebenen Situationen eher stark/wenig“; EXP-01 nur als wörtlich wiedergegebene Einzelantwort | Intuition oder „Bauchgefühl“ als Eigenschaft (offene Forschungsfrage EXP-R1), Erfahrungstiefe oder Kompetenz, „voreingenommen“ bzw. „unvoreingenommen“ |
| **EL** – Experimentelles Lernen | 4 × `likelihood`: vor Festlegung im Kleinen testen (01), Test vorschlagen, wenn das Gespräch hängt (02), früh eine einfache Version zeigen (04), nach unklarem Versuch verändern und erneut testen (05) | „Ein kleiner Versuch ist in den beschriebenen Situationen für dich eher (k)ein naheliegender Schritt“ | Risikobereitschaft, Mut bzw. Vorsicht, Tempo oder „Pragmatismus“, Methodenkompetenz (EL-R1 Research), Lernerfolg |
| **VOICE** – Konstruktive Voice / sachlicher Dissens | 5 × `likelihood`: Gegenpunkt trotz Einigkeit (01), Unangenehmes zeitnah (02), vertagtes Thema selbst wieder aufgreifen (03), fachlich abweichende Einschätzung sagen (04), „noch nicht so weit“ sagen (05) | „Einwände, Unangenehmes und offene Punkte sprichst du in den beschriebenen Situationen eher (nicht) an“ | Extraversion, allgemeine Konfliktfähigkeit oder -scheu, Durchsetzungsstärke, Konformität (VOICE-R1 Research), Einverständnis bei Schweigen, Einholen anderer Perspektiven (FS) |
| **AMB** – Ambiguitätstoleranz (Unbehagen) | 4 × `ambiguity_discomfort`: widersprüchliche Rückmeldungen (01), mehrere ungeklärte Erklärungen (02), neue Infos machen die Lage offener (04), Weiterarbeiten mit offener Frage (05) | „… empfindest du in den beschriebenen Situationen eher (nicht) als unangenehm“, immer mit dem Hinweis „Empfinden, nicht Handeln“ | tatsächliches Verhalten unter Unsicherheit, Arbeitsfähigkeit, Belastbarkeit, „Toleranz“-Score (keine Umpolung), Gelassenheit, Zukunftsangst (AMB-R1/-03 Research) |
| **ORG** – Arbeitsorganisation & Selbststeuerung | 2 × `likelihood`: zuerst nächste Schritte klären (01), selbst Zwischenpunkte setzen (02); 4 × `comparative`: parallel vs. Fokus (03), zu Ende bringen vs. früh umplanen (04), unterbrechen vs. dranbleiben (07), Planänderung erst bei Relevanz vs. schon bei Kleinem (08) | Richtung nur zu „nächste Schritte klären + Zwischenpunkte setzen“; jede Zweierwahl einzeln als „eher/deutlich eher A bzw. B“ | allgemeine Gewissenhaftigkeit, Disziplin, Zuverlässigkeit, „organisiert/chaotisch“, eine einzige ORG-Eigenschaft über alle Unteraspekte, „Struktur entsteht unterwegs“ |

Venture, Capability, Setup:

| Ebene | Gemessen | Erlaubt | Nicht erlaubt |
|---|---|---|---|
| Capability | `application_level` (Selbsteinstufung 1–5), `ownership_wish`, `sourcing` (Einordnung des Bereichs) | drei getrennte Achsen; „möchte verantworten“ nur bei `own`; Stufe ≥4 als „nach eigener Angabe wiederholt angewandt“ | Erfahrung = Verantwortung; Wunsch = Fähigkeit; „extern lösbar“ = fehlende Kompetenz; Wunsch = Rolle |
| Venture | Wünsche, Erwartungen, Zusagen zu einem konkreten Vorhaben | „unterschiedliche/ähnliche Erwartungen“, wörtliche Kurzantworten | beobachtetes Verhalten; Vereinbarung; Rückschluss auf eine Person bei nicht sichtbaren Antworten |
| Setup | von allen aktuellen Mitgliedern bestätigte Einträge | „vereinbart“ nur für diese | ähnliche Antworten oder historische Bestätigungen als Vereinbarung |

## B2. Inventar der Textregeln (`narrative.ts`)

| Textart | Inputs | Auslöser | Aussage | Warum getragen |
|---|---|---|---|---|
| Kernaussage `DIRECTION.{UPPER\|LOWER}.ALL` | gleichformatige Ordinalitems des Bereichs (`patternItems`) | ≥ `minAnswered` beantwortet, alle im selben Band | itemnahe Paraphrase „in den beschriebenen Situationen eher …“ | jede beantwortete Situation liegt auf dieser Seite |
| `DIRECTION.{…}.MOST` + Ausnahme | dito | ≥3 beantwortet, genau eine „teils/teils“, keine Gegenantwort | wie oben plus „Ausnahme mit ‚teils/teils‘: {Situation}“ | Ausnahme wird offen benannt, statt sie zu glätten |
| `DIRECTION.MIDDLE.ALL` | dito | alle „teils/teils“ | „beantwortest du … mit ‚teils/teils‘“ | wörtliche Wiedergabe, keine Deutung der Mitte |
| `MIXED` | dito | weder ALL noch MOST | „beantwortest du je nach Situation unterschiedlich“ + Situationen je Antwortbereich | nur Beschreibung der Antworten, keine Richtung |
| `INSUFFICIENT` | dito | < `minAnswered` beantwortet | „zu wenige Antworten“; keine Frage, keine Situationen | keine Evidenz, keine Aussage |
| `ITEM.EXP-01`, `ITEM.ORG-0x` | Einzelantwort | beantwortet | wörtlicher Optionstext bzw. Antwortlabel | 1:1 aus der Antwort |
| Missing-Hinweis | Anzahl fehlender Antworten je Bereich | > 0 | „fließen nicht ein und zählen nicht als ‚teils/teils‘“ | Transparenz über die Evidenzbasis |
| Frage „Zum Weiterdenken“ | Band bzw. Muster | direction oder mixed | Reflexionsfrage ohne unterstellte Schwierigkeit | eine Frage behauptet nichts |
| AMB-Hinweis | Bereich AMB | immer, außer bei `insufficient` | „Empfinden – nicht Handeln“ | Konstruktdefinition |
| Team `INSUFFICIENT` | gemeinsam beantwortete Items | < min(3, Items) | keine Ableitung | – |
| Team `SIMILAR.{UPPER\|LOWER\|NO_DIRECTION}` | alle Items, je Item Bandgleichheit; Richtung je Person | keine Unterschiede in gemeinsamen Situationen | „In den gemeinsam beantworteten Situationen antwortet ihr ähnlich. Das legt noch nicht fest, wie ihr im Alltag zusammen handelt.“ + ggf. beschreibender Satz | nur Gleichheit der Antworten, kein Nutzen behauptet |
| Team `NUANCE` | dito | Unterschiede nur Mitte ↔ klar | „eher Nuancen als Gegensätze“, keine Hypothese | keine Gegenpole |
| Team `OPPOSITE[.ORG-0x]` | dito | mindestens ein Gegenpol (unten/oben bzw. A/B) | Beobachtung → Kontext → „könntet ihr …“ → Frage | Gegenpol beobachtet; Interaktion nur als Möglichkeit |

**Entfernt, weil nur „hilfreich/menschlich/vollständig“ klingend:**
- Alle 11 Alltagssätze („Im Alltag kann das heißen …“), z. B. EVI unten „zügig weiterarbeitest“, ORG unten „Struktur entsteht unterwegs“, VOICE unten „wenn niemand danach fragt“.
- Alle 11 Sätze zur Wirkung auf andere (siehe B3).
- Die Vorteilssätze bei Teamähnlichkeit („Das kann Tempo bringen“, „… Abstimmung erleichtern“, „… schnell Orientierung geben“, „… viele Perspektiven sichtbar machen“).

## B3. „Wirkung auf andere“

Vorher gab es pro Bereich und Richtung Sätze wie „Andere erleben das möglicherweise als Gründlichkeit – oder … als zusätzliche Schleife“ oder „Andere gehen dann möglicherweise davon aus, dass du einverstanden bist“. Sie waren abgeschwächt, schrieben aber ungemessene Fremdwahrnehmung und Eigenschaftswörter („Entschlossenheit“, „Zögern“, „Pragmatismus“) zu. **Ersetzt** durch einen einzigen Satz in der Einleitung: „Wie dein Vorgehen bei anderen ankommt, misst der Bericht nicht – das lässt sich nur im Gespräch herausfinden.“ In der Advisor-Ansicht steht die entsprechende Fassung in der dritten Person.

## B4. Aggregation auf Bereichsebene

- **ORG:** Das Instrument nennt ORG „potenziell mehrere Facetten“, und „ORG ein oder mehrere Faktoren?“ ist offen. Die Bereichsrichtung stützt sich deshalb nur auf ORG-01/-02 und ist eng formuliert („nächste Schritte klären und Zwischenpunkte setzen“). Die vier Zweierwahlen stehen einzeln. Im Team gehört die Hypothese zum Unteraspekt der ersten gezeigten Gegenpol-Situation. ORG-04 hatte vorher den Hypothesentext von ORG-08 („erst bei relevanten Abweichungen“); das ist **korrigiert**.
- **EXP:** EXP-01 (Format `seriousness`, Eindruck ohne Begründung) floss vorher mit den vier `influence`-Items in die Richtung ein. Inhaltlich berührt es die offene Frage „Mustererkennung vs. Bauchgefühl“. Jetzt steht es nur noch als Einzelantwort da. Damit ist die Bereichsrichtung formatgleich, wie es der Überblick (`displayPosition`) schon vorher war.
- **EVI, EL, VOICE, AMB:** Die Items teilen jeweils eine Handlungs- bzw. Empfindensrichtung. Eine gemeinsame, eng an den Items formulierte Bereichsaussage ist bei getragenem Muster vertretbar.
- **Bereichstitel:**
  - AMB hieß „Wie du mit offenen Fragen umgehst“ – das verspricht Verhalten. Neuer Titel: „Wie du offene Situationen empfindest“ / Team „Offene Situationen empfinden“.
  - VOICE hieß „andere Sichtweisen einbringen“ – verwechselbar mit dem Research-Facet FS (Perspektiven einholen). Neuer Titel: „Wie du Einwände ansprichst“ / Team „Einwände ansprechen“.
  - Die FIND-Bereichslabels (DE/EN) sind gleichgezogen.

## B5. Evidenzstärke

| Bereich | Items für Richtung | Mindestens beantwortet | ALL | MOST | Mitte | Gegenantwort | Missing |
|---|---|---|---|---|---|---|---|
| EVI | 5 | 3 | alle im selben Band | ≥3 beantwortet, genau 1 × Mitte | als „Ausnahme“ benannt; nur Mitte → MIDDLE | → MIXED | zählt nicht, wird je Bereich ausgewiesen |
| EXP | 4 (ohne EXP-01) | 3 | dito | dito | dito („teilweise“) | → MIXED | dito |
| EL | 4 | 3 | dito | dito | dito | → MIXED | dito |
| VOICE | 5 | 3 | dito | dito | dito | → MIXED | dito |
| AMB | 4 | 3 | dito | dito | dito | → MIXED | dito |
| ORG | 2 (01, 02) | 2 | beide gleich | nicht möglich | beide Mitte → MIDDLE | → MIXED | dito |

Änderungen gegenüber Phase 10:
- Mindestzahl 2 → min(3, n). Zwei von fünf Antworten trugen vorher eine Aussage über „die beschriebenen Situationen“.
- MOST erlaubt jetzt genau eine Mitte statt „höchstens eine Abweichung“; die Ausnahme wird benannt.
- Teamähnlichkeit braucht mindestens min(3, n) gemeinsam beantwortete Situationen.

Missing wird nirgends als Mitte gewertet (`responseBand` liefert `null`). Es entstehen keine Nutzer-Scores; die Bänder bleiben beschriebene Antwortkategorien.

## B6. Forced Choice und andere Formate

- **`comparative`:** `strong_a`/`lean_a` → Band A, `lean_b`/`strong_b` → Band B. Verglichen wird nur A mit B innerhalb desselben Items, nie mit einer Skala. Es gibt keine numerische Kodierung, keine Bereichsaggregation und keinen Median.
- **Unterschiedliche ordinale Formate:** Für die Bereichsrichtung und den Überblick wird je Bereich nur ein Format verwendet. Im Teamvergleich wird jedes Item für sich betrachtet.
- **„Gegenpol“ bei Zweierwahlen:** „eher A“ gegen „eher B“ gilt als Gegenpol, analog zu „eher unwahrscheinlich“ gegen „eher wahrscheinlich“. Weil Zweierwahlen keine Mitte haben, ist schon die kleinste Abweichung ein Gegenpol. Das ist als Restpunkt markiert (B13).
- **`behavioral`-Items** sind nicht produktfähig (core_research) und erscheinen nicht.

## B7. Team-Finding-Typen

| Typ | Erforderliche Evidenz | Zulässige Aussage | Ausdrücklich verboten |
|---|---|---|---|
| SIMILAR_PATTERN (`teamPatterns`) bzw. `SIMILAR` (`teamAreaFinding`) | gleiches Band in allen gemeinsam beantworteten Situationen (≥ min(3, n)) | „antwortet ihr ähnlich … legt noch nicht fest, wie ihr handelt“; ggf. beschreibende gemeinsame Richtung | Vorteil, Stärke, Harmonie, „passt gut“ |
| DIFFERENT_PATTERN / `NUANCE` | mindestens ein Bandunterschied, kein Gegenpol | „unterschiedlich … eher Nuancen als Gegensätze“ | Konflikt, Hypothese, Problem |
| POTENTIAL_COMPLEMENT / `OPPOSITE` | mindestens ein Gegenpol | Beobachtung → Kontext → „könntet ihr …“ → Frage; „könnte sich ergänzen, wenn …“ nur als Bedingung | Komplementarität als Teameigenschaft, Prognose („wird bremsen“, „führt zu Konflikten“), „problematisch“ |
| DISCUSSION_POINT (nur FIND, in der DB berechnet) | unterschiedliche Schwerpunkte | „setzt unterschiedliche Schwerpunkte. Sprecht darüber, wann welches Vorgehen hilfreich ist.“ – geprüft, unverändert | Bewertung der Person |
| INSUFFICIENT_DATA / `INSUFFICIENT` | zu wenige gemeinsame Antworten | „daraus wird nichts abgeleitet“ | jede Deutung |

`teamPatterns` und `individualAreas` aus `model.ts` werden im Produkt nicht mehr gerendert (nur Tests). Zwei `teamPatterns`-Komplementtexte formulierten keine Möglichkeit und wurden angepasst:
- EXP: vorher „kann neben … stehen“, jetzt „könnten sich ergänzen, wenn …“.
- AMB: vorher „kann ein Anlass sein“, jetzt „könnte ein Anlass sein“.

Außerdem wurden VOICE und ORG geschärft.

## B8. Interaktionshypothesen

Alle zehn Hypothesen (sechs Bereiche plus vier ORG-Zweierwahlen) folgen jetzt dem Muster **Beobachtung → Arbeitskontext („Beim gemeinsamen Entscheiden: …“) → mögliche Interaktion („könntet ihr …“) → Gesprächsfrage**. Ein Test prüft für 2, 3 und 4 Personen:
- keine Begriffe wie Konflikt, Streit, bremsen, behindern, blockieren, problematisch, Reibung, „führt zu“;
- immer „könnt…/kann“;
- „ergänzen“ nur in der Form „könnte sich ergänzen, wenn“.

## B9. Venture / Capability / Setup

- **Capability:**
  - „Viel Erfahrung“ ist ersetzt durch „Nach eigener Angabe wiederholt angewandt“ (das ist die tatsächliche Stufe 4).
  - Die Einleitung sagt jetzt ausdrücklich: Erfahrung ist kein Verantwortungswunsch, ein Wunsch ist keine Fähigkeit und keine Rolle, und „extern lösbar“ sagt nichts über Kompetenz.
  - Sourcing wird als Einordnung des Bereichs formuliert („ist als intern zu verankern eingeordnet“), nicht als Norm für die Person.
- **Venture:** Die Einleitung sagt „Wünsche und Erwartungen – kein beobachtetes Verhalten und noch keine Vereinbarung“.
- **Setup:** unverändert, nur von allen aktuellen Mitgliedern Bestätigtes.

## B10. Signature / Median

**Befund:** Der Überblick setzte je Bereich einen Punkt auf den unteren Median der formatgleichen Items. Das war schon vorher eine echte, gewählte Kategorie ohne Interpolation, kein Score, mit Mindestzahl. Er **verschleierte aber gemischte Muster**:
- Aus 1, 1, 5, 5, 5 wurde ein Punkt bei „sehr wahrscheinlich“.
- Aus 2, 3, 4 wurde „teils/teils“, während der Text „je nach Situation unterschiedlich“ sagte.
- Ein einzelner Punkt auf einer Fünferskala suggeriert mehr Genauigkeit, als die Antworten haben.

**Geändert** (`overviewMark`, `SignatureOverview`):
- Ein Punkt erscheint nur bei getragener Richtung. Er steht auf der mittleren gewählten Antwort, die bei ALL/MOST immer im Band der Richtung liegt (getestet).
- Bei gemischtem Muster erscheint ein gestrichelter, ungefüllter Balken für die Spannweite, mit dem Text „je nach Situation von ‚X‘ bis ‚Y‘“.
- Bei zu wenigen Antworten erscheint nichts.
- Die Bildunterschrift erklärt das und sagt „eine Darstellung der Antworten, kein Messwert“.
- Für EXP wird vermerkt, dass der vertraute Eindruck nicht enthalten ist.
- Kein Radar, kein Score. `displayPosition` bleibt (getestet), wird aber im Überblick nicht mehr verwendet.

In den Testdaten zeigen jetzt z. B. Bens „Entscheidungen prüfen“ (vorher Punkt „teils/teils“) und Annas „Erfahrung nutzen“ (vorher Punkt „teilweise“) eine Spannweite.

## B11. Nachvollziehbarkeit im Code

Jede Aussage trägt eine interne Claim-ID aus Bereich, Regel und Evidenzklasse:
- Einzelbericht: `EVI.DIRECTION.UPPER.ALL`, `EL.DIRECTION.LOWER.MOST`, `EXP.MIXED`, `ORG.INSUFFICIENT`, `EXP.ITEM.EXP-01`, `ORG.ITEM.ORG-03`
- Team: `AMB.TEAM.OPPOSITE`, `ORG.TEAM.OPPOSITE.ORG-07`, `VOICE.TEAM.SIMILAR.UPPER`, `EVI.TEAM.NUANCE`
- Agenda: `CAPABILITY.OPEN_INTERNAL`, `VENTURE.DIFFERENT.U01`

Die IDs stehen in den Datenstrukturen (`claim`) und im DOM als `data-claim` an Bereichskarten, Einzelantworten und Agenda-Einträgen. Sie sind nicht sichtbar, kein Score, nicht gespeichert, und es gibt keine neue Datenbankstruktur. Im Browser geprüft: Einzel- und Teambericht liefern die erwarteten IDs.

## B12. Tests (Claim Boundaries)

Neu: `src/features/reporting/workstyle/__tests__/phase10bClaimBoundaries.test.ts` (17 Tests). Er erzeugt Profile in 14 Antwortformen je Bereich, inklusive Missing und Mischungen, sowie Teams mit 2, 3 und 4 Personen und prüft:

- EVI erzeugt keine Intelligenz- oder Rationalitätsaussage, EXP keine Intuition als Eigenschaft, EL keine Risikobereitschaft, VOICE keine Extraversion oder Konfliktfähigkeit, AMB keine Verhaltens- oder Toleranzaussage, ORG keine allgemeine Gewissenhaftigkeit. Das gilt für Einzel- und Teamtexte.
- AMB enthält immer Empfinden und den Hinweis; die Titel von AMB und VOICE sind entschärft.
- Es gibt keine Fremdwahrnehmung; der einmalige Hinweis ist vorhanden.
- `mixed` erzeugt keine Richtung, `insufficient` keine Deutung und keinen Überblickspunkt.
- Missing ist nie Mitte (ALL statt MOST, Mindestzahl, Team-Ausschluss).
- EXP-01 und die ORG-Zweierwahlen werden nicht mitverrechnet.
- Teamunterschied erzeugt keine Konfliktprognose, Ähnlichkeit keinen Vorteil.
- POTENTIAL_COMPLEMENT bleibt Arbeitshypothese.
- Der Überblick wirkt nicht stärker als der Text: ein Punkt nur im Band, bei gemischtem Muster eine Spannweite.
- Jede Aussage hat eine gültige Claim-ID, und `data-claim` wird gerendert.
- Capability, Ownership und Sourcing bleiben getrennt (hohe Stufe ohne Wunsch ≠ Verantwortung; „extern lösbar“ ≠ Kompetenz).
- Venture: Erwartung ≠ Verhalten. Setup: nur Bestätigtes ist vereinbart.

`phase10Narrative.test.ts` ist an die neuen Felder angepasst.

## B13. Restpunkte und mögliche Messprobleme (markiert, nicht still korrigiert)

Kein **fundamentales** Messproblem, das den Bericht ungültig macht. Folgende Punkte gehören in die empirische Prüfung:

1. **ORG-Richtung beruht auf zwei Items.** Das ist eng formuliert und ehrlich, bleibt aber schmal. Ob ORG ein oder mehrere Faktoren hat, ist offen.
2. **Zweierwahlen ohne Mitte:** „eher A“ gegen „eher B“ zählt als Gegenpol. Möglicherweise entstehen dadurch bei ORG mehr Hypothesen als bei den Skalen. Die Modellierung ist im Instrument ausdrücklich „später separat prüfen“.
3. **Soziale Erwünschtheit / Deckeneffekte**, vor allem bei EVI und VOICE (Nachprüfen und Einwände wirken erwünscht). Die Antworten könnten sich deshalb oben häufen und Teams „ähnlich“ erscheinen lassen. Das ist unbekannt, bis Itemverteilungen vorliegen.
4. **EVI-05 und VOICE berühren sich** (Reaktion auf bzw. Äußern von Gegenpunkten im Team); die Konfundierung ist im Instrument als Research-Thema geführt.
5. **Ungenutzt mit veralteten Aussagen:** `AREAS[].benefit/context` (Vorteilssätze) und `individualAreas` (Einzelitem-Deutung). Sie werden nicht gerendert und sind ein Kandidat für die Code-Bereinigung.
6. Der Teambericht mit 4 Foundern ist durch die ausführlicheren Hypothesen um eine Seite gewachsen (14 → 15).

## B14. Psychometric status

Das aktuelle Instrument (Workstyle v0.4, `founder-workstyle-pretest-8-5a-v3`) ist **entwickelbar, aber noch nicht empirisch validiert**.

Der Report kann aktuell sicherstellen:
- konsistente Abbildung der definierten Antwortlogik,
- keine Überschreitung der vorgesehenen Konstrukte,
- transparente Missing- und Mixed-Regeln.

Er kann aktuell **nicht** beweisen:
- endgültige faktorielle Struktur,
- Reliabilität,
- Retest-Stabilität,
- externe Validität,
- Erfolgsprognose.

Diese Punkte gehören in die spätere empirische Validierungsphase (siehe „Geplante empirische Prüfung“ im Instrumentdokument).

## B15. Zusätzlich geänderte Dateien (10B)

- **Code:** `narrative.ts` (Regeln, Claim-IDs, `patternItems`, `minAnswered`, `overviewMark`), `IndividualWorkstyle.tsx`, `SignatureOverview.tsx`, `TeamWorkstyleReport.tsx`, `ComponentMatrix.tsx`, `model.ts` (Bereichstitel AMB/VOICE, zwei Komplementtexte), `report.css` (`.ws-range`)
- **Messages:** `messages/{de,en}/find.json` (Bereichslabels)
- **Tests:** neu `phase10bClaimBoundaries.test.ts`, angepasst `phase10Narrative.test.ts`

Nach 10B:
- `npm test`: 2 819/2 819 grün.
- Browser: Testdaten kurz neu angelegt, Überblick und Karten bei 1280 und 390 px geprüft, kein seitliches Scrollen, keine Konsolenfehler, `data-claim` im HTML. Danach wieder entfernt (4 Nutzer, 1 Team).
- Keine Migration.

---

## Geänderte und neue Dateien

**Neu:** `web/src/features/reporting/workstyle/narrative.ts`, `web/src/features/reporting/workstyle/__tests__/phase10Narrative.test.ts`, dieses Dokument.

**Bericht:** `workstyle/IndividualWorkstyle.tsx`, `TeamWorkstyleReport.tsx`, `ComponentMatrix.tsx`, `SignatureOverview.tsx`, `model.ts`, `componentsModel.ts`, `alignmentModel.ts`, `report.css`; Seiten `me/profile/workstyle`, `teams/[teamId]/workstyle`, `advisor/person/[userId]`, `me/profile`, `me/profile/print`.

**Umstellung:** `team-invite/[token]`, `me/base`, `me/base/complete`, `me/values`, `me/values/complete`, `invite/[sessionId]/basis-complete`, `me/report`, `invite/new`, `founder-alignment/pilot` (+ `discovery`, `report`, `compare`), `research/workstyle-pretest`, `discovery/intros/[introRequestId]/matching`, `dashboard/page.tsx`, `CoFounderInviteForm.tsx`, `ConfirmClient.tsx`, `ConfirmVentureAnswers.tsx`, `SelfReportView.tsx`, `NavV21.tsx`, `VersionArchiveCard.tsx`, `VersionChoiceView.tsx`, `answerActions.ts`, `answerActionsV21.ts`, `workstyle/actions.ts`, `workstyle/current.ts`, `TeamJourneyStatus.tsx`.

**Messages (DE und EN):** `report.json`, `profile.json`, `teams.json`, `capability.json`, `dashboard.json`.

**Tests angepasst:** `discoverySlice3Journey`, `einladungFassung`, `pilotPagesSayWhatTheyAre`, `arbeitsprofilSynthese`, `founderProfile`.

Migrationen: **keine**. Die lokalen Testkonten aus Phase 10 (9 `p10-*`) sind wieder entfernt; die lokale Datenbank steht wieder bei 4 Seed-Nutzern und 1 Team. Der Dev-Server ist beendet.

---

CURRENT NEW USERS USE ONLY WORKSTYLE V0.4
NO LEGACY FALLBACK FOR NEW USERS
HISTORICAL REPORTS REMAIN READ-ONLY
NO RESEARCH DATA EXPOSED
NO NEW SCORE OR TYPOLOGY INTRODUCED
NO LEGACY USER DATA DELETED
NO DATABASE TABLES DROPPED
NO REMOTE DB PUSH PERFORMED
NO PRODUCTION DEPLOY PERFORMED
