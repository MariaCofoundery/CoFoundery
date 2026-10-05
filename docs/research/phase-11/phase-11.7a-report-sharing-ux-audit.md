# Phase 11.7A – Freigaben und Berichte: Audit und Zielbild

Stand: 05.10.2026, Branch `feat/workstyle-reporting-v04`, HEAD `39c2c4a1`. Reine Analyse: **kein Code, keine Migration, keine RLS-/RPC-Änderung, keine Reportlogik, kein Commit.** Alle Zielbilder sind Vorschläge und Entscheidungsgrundlagen. Fakten sind mit Fundstellen belegt (Migrationen unter `supabase/migrations`, App unter `web/src`).

---

## 1. Ist-Zustand der Freigaben

Grundregel heute: **Keine Funktion legt Freigaben automatisch an.** Weder der Teambeitritt noch die Einladungsannahme noch ein FIND-Start erzeugt eine Zeile in `alignment_shares`. Die einzige serverseitige Einfügung ist `share_workstyle_product` (20261114120000); alles andere sind Client-Schreibzugriffe unter RLS.

| Datenbereich | Eigentümer | Speicher für Freigaben | Scope | Richtung | UI | Wer liest | Historisch relevant |
|---|---|---|---|---|---|---|---|
| **Arbeitsprofil (Workstyle v3)** | Person (neuestes abgeschlossenes v3-Assessment, Manifest 3.0.0) | `alignment_shares(assessment_id, recipient_user_id, revoked_at)`, eindeutig je Paar; `alignment_share_hidden_blocks` | je Assessment × Empfänger | gerichtet | `ShareForm` unter `/me/profile/workstyle#freigaben`: eine Zeile je Empfänger, Häkchen je Item zum Ausblenden | `get_workstyle_product_profile`, `get_workstyle_product_team`, `workstyle_core_visible_to` (alle Paare gegenseitig, keine ausgeblendeten Blöcke), `get_workstyle_team_share_readiness`, `get_workstyle_team_inputs` | Snapshots (`workstyle_product_snapshots`) werden beim Lesen gegen den aktuellen Stand geprüft; nach einem Widerruf sind sie nicht mehr abrufbar |
| **Fähigkeiten** | Person (`person_capability_entries`, nur eigene Zeilen per RLS) | **kein** Freigabespeicher; Stufe `person_core.capability_disclosure` ∈ `private` / `areas` / `areas_depth_on_contact` | je Person, für alle Kontexte | — | `/profile?step=sichtbarkeit` („Wer sieht, was du kannst?“) | `get_disclosed_capability(user,'team'|'discovery'|'connect')` (20261022120000): im Team automatisch, ab `areas` die Themen, Tiefe nur mit `areas_depth_on_contact` und Verbindung; Advisors über `get_advisor_person_capability` (Grant `capability`/`capability_depth`) | nein |
| **Vorhaben (venture-alignment-v1)** | Person, `assessments.venture_id` = Team | `alignment_shares` (gleiche Tabelle), Ausblendung möglich | je Assessment × Empfänger | gerichtet | `ShareForm` auf `/founder-alignment/vorhaben/antworten` | Abschnitt „Was ihr aufbauen wollt“ in `get_workstyle_product_team`, `get_workstyle_team_inputs` | nein |
| **Founder Setup** | Team (`founder_team_setup_items/revisions/confirmations`) | keiner für Mitglieder (RLS: Teammitgliedschaft); Advisor: `founder_team_advisor_setup_grants` + `…_consents` (einstimmig, bei neuem Mitglied pausiert) | Team | — | Team-Setup-Seiten; Advisor-Freigabe auf der Teamseite | Mitglieder; Advisor über `get_advisor_confirmed_founder_setup` (nur bestätigte Punkte) | ja: bestätigte Revisionen bleiben, gelten nur bei Bestätigung durch alle aktuellen Mitglieder |
| **Advisor – Person** | Person | `advisor_person_grants(subject, advisor_user_id XOR org_id, scope, status)` | Scopes `base`, `alignment_report`, `capability`, `capability_depth`, `strengths`, `direction` – **kein Workstyle-Scope** | gerichtet | `/account#person-access` („Wer dich begleitet“) | `has_advisor_person_access`, `get_advisor_person_*` | `person_alignment_snapshots` (älteres Modell) |
| **Advisor – Arbeitsprofil** | Person | `alignment_shares` an die Advisor-Person (Empfänger „Begleitung (Advisor)“ in der ShareForm) | je Empfänger | gerichtet | ShareForm | `get_workstyle_product_profile` | Snapshots wie oben |
| **Advisor – Team** | Gruppe | `advisor_team_reviews` + `advisor_team_review_members(decision)` (keine team_id); `relationship_advisors` (Paar, beide Zustimmungen) | Personenmenge bzw. Paar | — | `/account` („Gemeinsam angesehen werden“), Teamseite | `can_read_workstyle_team`: Mitglied, oder Review mit exakt derselben Personenmenge, oder (nur 2er-Team) Paar-Advisor. Zusätzlich gegenseitige Bereitschaft (11.6) **und** eigene Freigabe je Mitglied an den Advisor | `report_runs`/Workbook (Paar, historisch, service-seitig) |
| **FIND** | Person | `founder_search_preferences.workstyle_discovery_enabled` (+ Version, Zeitpunkt) | Kontext FIND | beide müssen zustimmen | `/discovery/suche#workstyle` (ein Schalter) | `get_discovery_workstyle_signals` – nur Bereichsbänder, **ohne** `alignment_shares` | nein |
| **CONNECT** | Person | `network_profiles` Sichtbarkeit (`connect_owner_visible`) | Netzwerk | — | CONNECT-Profil | Netzwerkmitglieder; speist Fähigkeiten-Kontext `connect` | nein |
| **Einladung / Beitritt** | — | `invitations`, `accept_invitation` → `relationships` (Paar) → Trigger → `founder_team_members` | Paar → Team | — | `CoFounderInviteForm`, `/join` → `/join/start` | — | `report_runs` je Einladung |
| **Paarbeziehungen** | Paar | `relationships(user_low,user_high, founder_team_id)` | Paar | — | — | Paar-Advisor, Setup-Advisor, alte Berichte | ja |

**Wichtige Besonderheiten:**
- **Team verlassen gibt es nicht.** Es gibt keine Funktion und keine Löschregel für `founder_team_members`. Mitgliedschaft endet nur über die Kontolöschung (Kaskade). Freigaben bleiben dabei als Person-zu-Person-Freigaben bestehen.
- **Einladungen erzeugen nur Paare.** Lädt A erst B und dann C ein, entstehen die Beziehungen A–B und A–C, aber keine Beziehung B–C. Folgen:
  - Die Empfängerliste für Vorhaben-Freigaben (`shareData.ts`) kennt nur Einladungspartner. B und C können einander ihre Vorhaben-Antworten nicht über die Oberfläche freigeben.
  - Der Paar-Advisor-Weg funktioniert nur für 2er-Teams.
- **Ein nicht aktiver Advisor-Grant entwertet eine Freigabe.** `alignment_share_is_effective` (20261060120000) erklärt eine Freigabe für unwirksam, sobald zwischen denselben zwei Personen irgendein `advisor_person_grants`-Eintrag existiert, der nicht aktiv ist (angefragt, abgelehnt, widerrufen). Ob ein Founder seinen Co-Founder als Advisor anfragen kann, ist zu prüfen (offene Entscheidung).
- **Org-Grants sieht `alignment_share_is_effective` nicht.** Eine Freigabe an ein Org-Mitglied bleibt nach Widerruf des Org-Grants wirksam.
- **Freigaben sind an ein Assessment gebunden.** Nach dem Neubeantworten gelten die alten Freigaben nicht für das neue Profil. Ältere Freigaben bleiben formal unwiderrufen.
- **Einzelne Fragen auszublenden blockiert den Teambericht** (`workstyle_core_visible_to`), ohne dass die ShareForm darauf hinweist.
- **Vorhaben-Freigaben werden nicht serverseitig geprüft** (Client-Upsert, keine Empfänger-Whitelist). Workstyle-Freigaben schon.

## 2. Heutiger Nutzerfluss

**A lädt B ein, B tritt bei:**
1. A schickt die Einladung (`CoFounderInviteForm`, Hinweis „…es wird nichts automatisch geteilt“).
2. B öffnet den Link → `/join` → `accept_invitation` → `/join/start` → `/join/welcome` (Basisprofil) → `/join/start` → Teamseite mit Bereitschafts-Panel oder direkt der Fragebogen.
3. B beantwortet 29 bzw. 37 Situationen und sieht „Geschafft“ → „Freigaben für A prüfen“.
4. B klickt in der ShareForm in As Zeile auf „freigeben“, lässt alle Häkchen leer und klickt „jetzt freigeben“.
5. A macht dasselbe für B (über „Freigaben prüfen“ auf der Teamseite).
6. Der Teambericht erscheint für beide (gegenseitige Bereitschaft).
7. Vorhaben, getrennt und je Person:
   - Teamseite → „Beginnen“ → Fragebogen → Absenden → `/vorhaben/antworten`;
   - dort wieder eine ShareForm, „freigeben“ je Teammitglied;
   - auf diesen Schritt weist nichts aktiv hin, und der Link im leeren Berichtsabschnitt führt zum Fragebogen, nicht zur Freigabe.
8. Fähigkeiten erscheinen automatisch, je nach Sichtbarkeitsstufe; bei `private` gar nicht.

**Zahl der Freigaben:**

| Team | Arbeitsprofil (gerichtet) | Vorhaben (gerichtet) | Bedienvorgänge je Person |
|---|---|---|---|
| 2 | 2 | 2 | 2 (je 1 + 1) |
| 3 | 6 | 6 | 4 (je 2 + 2) |
| 4 | 12 | 12 | 6 (je 3 + 3) |

Jede Freigabe besteht aus drei Klicks (freigeben → Häkchen prüfen → jetzt freigeben).
- **Automatisch:** Teammitgliedschaft, Fähigkeiten-Sichtbarkeit nach Stufe, Founder-Setup-Zugang.
- **Explizit:** alle Arbeitsprofil- und Vorhaben-Freigaben.

**Wo ungleiche Zustände entstehen:**
- **Arbeitsprofil im Teambericht:** gelöst seit 11.5 (alles oder nichts).
- **Einzelansicht:** weiterhin gerichtet. A kann Bs Profil sehen, B das von A nicht.
- **Vorhaben-Abschnitt:** weiterhin pro Person. Wer freigegeben hat, erscheint, andere nicht. Der Bericht kann mit teils leerem Vorhaben-Abschnitt erscheinen.
- **Fähigkeiten:** hängen von der Sichtbarkeitsstufe ab und sind unabhängig von Freigaben.

**Freigaben für Daten, die es ohnehin nur für dieses Team gibt:** Die Vorhaben-Antworten (`venture_id` = Team) existieren nur für dieses Team. Eine gesonderte Freigabe pro Mitglied ist dort fachlich kaum zu begründen.

## 3. Schwächen

1. **Freigabe-Marathon:** Mit N Personen sind pro Person 2·(N−1) Freigaben nötig, jede in drei Schritten.
2. **Falsche Granularität:**
   - Das Ausblenden einzelner Fragen ist für den Teambericht wirkungslos bzw. blockierend.
   - Die Freigabe pro Empfänger widerspricht dem gemeinsamen Teambericht.
3. **Unterschiedliche Regeln je Datenbereich:**
   - Fähigkeiten automatisch per Stufe.
   - Arbeitsprofil explizit, serverseitig geprüft.
   - Vorhaben explizit, nur clientseitig, Empfängerliste lückenhaft.
   - Setup automatisch.
4. **Lücken im Ablauf:**
   - Die Vorhaben-Freigabe ist nicht in den Ablauf eingebunden.
   - Bei 3–4 Personen fehlen Empfänger.
5. **Unsichtbare Fallen:**
   - Ausgeblendete Blöcke blockieren den Teambericht.
   - Ein Advisor-Grant entwertet eine bestehende Freigabe.
   - Org-Grants werden nicht beachtet.
6. **Kein Austritt aus dem Team:** Ohne Austritt lässt sich keine saubere Regel für den Entzug formulieren.
7. **Sprache:** „freigeben / ändern / zurückziehen“ je Zeile, Häkchen „für dich behalten“. Das wirkt wie Rechteverwaltung, nicht wie Zusammenarbeit.

## 4. Zielmodell für Freigaben

Vier Sichtbarkeitskontexte, sprachlich klar getrennt:

| Kontext | Was | Wie |
|---|---|---|
| **Privat** | alles, solange kein Kontext gewählt ist; Forschung **immer** | Standard |
| **Dieses Team** | alles, was Zusammenarbeit und Teambericht brauchen | **eine** Teamfreigabe je Person und Team (Paket, Abschnitt 5/6) |
| **Advisor / externe Person** | ausdrücklich, je Advisor, je Bereich | bleibt separat; ein Advisor ist nie automatisch Teil des Teams |
| **FIND** | Bereichsbänder für Discovery | eigener Schalter, beide müssen zustimmen (unverändert) |

**Bewertung je Datenbereich:**

| Bereich | Empfehlung | Begründung |
|---|---|---|
| Arbeitsprofil | **Teil der Teamfreigabe.** Ein Paket, kein Ausblenden einzelner Fragen im Teamkontext | Der Teambericht braucht ohnehin alle 29 Antworten aller Mitglieder. Ausblenden blockiert nur. |
| Fähigkeiten / Verantwortung | **Teil der Teamfreigabe**, Tiefe (Stufe + Wunsch) im Team immer sichtbar, sobald freigegeben. `capability_disclosure` gilt weiter für FIND und CONNECT | Für „Wer verantwortet was“ ist die Tiefe der eigentliche Inhalt. Heute ist das je nach Stufe zufällig sichtbar. |
| Vorhaben | **Keine eigene Freigabe.** Die Antworten gehören zum Team; sichtbar für die Mitglieder, sobald die Person sie abgibt („Abgeben = mit dem Team teilen“, vorher klar gesagt) | Die Daten existieren nur für dieses Team. |
| Founder Setup | **Kein Freigabekonzept.** Ist schon Team-Eigentum, gilt nur bei Bestätigung durch alle | unverändert |
| Advisor | separat, ausdrücklich; künftig optional ein Workstyle-Scope im Advisor-Grant statt ShareForm-Zeile | heute zwei Wege (Grant + ShareForm) |
| FIND | separat, unverändert | — |
| Forschung | nie teilbar | unverändert |

## 5. Teambeitritt als Freigabemoment

**Vorschlag:** Beim Beitritt bzw. beim ersten Öffnen des Teams eine transparente, **ausdrückliche** Entscheidung:

> **Mit diesem Team teilen**
> Für euren gemeinsamen Bericht sehen die Mitglieder dieses Teams deine Arbeitsweise (29 Situationen) und deine Angaben zu Fähigkeiten und Verantwortung. Deine Antworten zum Vorhaben sehen sie, sobald du sie abgibst. Advisors, FIND und deine Forschungsantworten sind davon nicht betroffen. Du kannst das jederzeit für dieses Team zurücknehmen.
> [Team beitreten und teilen] · [Erst beitreten, später entscheiden]

**Bewertung:**
- **Datenschutz:** vertretbar, wenn die Entscheidung *ausdrücklich, informiert und widerrufbar* ist und nicht im Beitritt versteckt wird. Empfehlung: Beitritt und Teilen in einem Schritt anbieten, aber als **zwei getrennte Optionen**. „Teilen“ ist ein eigener Knopf; der Beitritt allein teilt nichts. So bleibt der Projektgrundsatz „Teambeitritt gewährt keine Freigabe“ erhalten (CLAUDE.md, pgTAP).
- **Technisch:** gut umsetzbar (Abschnitt 8).
- **Bestehende gerichtete Freigaben:** bleiben gültig. Die Teamfreigabe ergänzt sie, ersetzt sie nicht.
- **Widerruf / Austritt:** Abschnitt 6.
- **Späteres Mitglied:** Eine Teamfreigabe gilt für „die aktuellen Mitglieder dieses Teams“. Neue Mitglieder sehen die Daten ab ihrem Beitritt. Das muss im Text stehen („…auch Personen, die später dazukommen“), und alle Mitglieder werden über den Neuzugang informiert. Alternative: Die Teamfreigabe pausiert bei neuem Mitglied, wie heute die Setup-Advisor-Grants. Das ist sicherer, aber reibungsreicher.
- **3–4 Personen:** Hier zeigt sich der größte Gewinn: eine Entscheidung statt 4–6 Freigaben.
- **Bestehende Teams:** Ohne Migration der Freigaben. Bestehende Teams zeigen einmalig „Mit diesem Team teilen“; vorhandene gerichtete Freigaben zählen weiter.
- **Snapshots:** unverändert. Die Prüfung beim Lesen greift weiterhin.
- **Advisor:** nicht betroffen. Ein Advisor sieht den Teambericht weiterhin erst bei gegenseitiger Bereitschaft plus eigenen Advisor-Freigaben.
- **FIND:** nicht betroffen.

## 6. Widerruf

| Ereignis | Aktuelle Sichtbarkeit | Historisches |
|---|---|---|
| Teamfreigabe zurückziehen | Teambericht für alle sofort „nicht verfügbar“ (gegenseitige Bereitschaft); Einzelansicht für das Team weg | gespeicherte Snapshots nicht mehr abrufbar (bestehende Prüfung); bestätigte Setup-Punkte bleiben als Historie, gelten aber nur bei Bestätigung durch alle aktuellen Mitglieder |
| Team verlassen (**neu, nötig**) | wie Zurückziehen, zusätzlich: Mitgliedschaft endet, Team-Kontext für Fähigkeiten endet | Setup-Revisionen bleiben unverfälscht; aktuelle Bestätigungen gelten nur noch für die verbleibenden Mitglieder (bestehende Regel) |
| Aus dem Team entfernt werden (**neu**, wer darf das? → offene Entscheidung) | wie Verlassen | wie Verlassen |
| Advisor-Zugang widerrufen | Advisor verliert Teambericht und Einzelansicht | Advisor-Snapshots nicht mehr abrufbar |

**Grundsätze:**
- Historisches wird nie still umgeschrieben.
- Aktuelle Sichtbarkeit lässt sich jederzeit entziehen.
- Bei einem Widerruf bleibt der Hinweis „Was schon gelesen wurde, holt das nicht zurück“.

## 7. Advisor und FIND

- **Advisor:**
  - bleibt ausdrücklich und separat;
  - die Teamfreigabe wirkt nie für Advisors;
  - Ziel: **ein** Ort für Advisor-Freigaben (`/account`) mit Bereichen als Textchips (Arbeitsprofil, Fähigkeiten, Vorhaben, Setup), statt Grant-Scopes plus ShareForm-Zeile;
  - die Regel „Teambericht nur bei gegenseitiger Bereitschaft“ bleibt.
- **FIND:**
  - bleibt eigener Schalter;
  - zeigt nie Antworten, nur Bereichsbänder;
  - die Teamfreigabe hat keinen Einfluss.

## 8. Technische Optionen

| Option | Beschreibung | Vorteile | Nachteile |
|---|---|---|---|
| **A) Gerichtete Freigaben intern weiterverwenden** | „Für dieses Team freigeben“ legt per RPC alle gerichteten `alignment_shares` für die aktuellen Mitglieder an; neue Mitglieder werden per Trigger ergänzt | kaum Schemaänderung, alle Leser bleiben | abgeleitete Zustände, Abgleichslogik bei Beitritt und Austritt, Widerruf muss die richtigen Zeilen treffen, Unterscheidung Teamfreigabe vs. persönliche Freigabe fehlt |
| **B) Echte Teamfreigaben** | neue Tabelle `team_shares(team_id, owner_user_id, scope, granted_at, revoked_at)`; Leser prüfen „gemeinsames Team + aktive Teamfreigabe“ | eindeutige Bedeutung, kein Abgleich, Austritt wirkt automatisch, 3–4 Personen trivial | alle Leser anpassen (`workstyle_core_visible_to`, `get_workstyle_product_profile` im Teamkontext, Vorhaben-Leser, Fähigkeiten im Team), neue Tests |
| **C) Hybrid (Empfehlung)** | `team_shares` als Teamkontext; die Wirksamkeitsprüfung wird um „oder aktive Teamfreigabe in einem gemeinsamen Team“ erweitert (eine zentrale Funktion, z. B. `workstyle_visible_in_team`). Bestehende gerichtete Freigaben bleiben für Einzelkontakte, Advisors und Altbestand | wenig invasiv, klare Semantik, keine abgeleiteten Zeilen, bestehende Freigaben bleiben gültig | zwei Wege zur Sichtbarkeit (Team + gerichtet) müssen in der Readiness gemeinsam angezeigt werden |

**Empfehlung C.**
- **Minimale DB-Änderung:**
  - eine Tabelle `team_shares`, mit RLS nur für Eigentümer und Mitglieder (lesen);
  - eine RPC `set_team_share(team_id, enabled)`;
  - eine zentrale Sichtbarkeitsfunktion, die gerichtete Freigabe **oder** Teamfreigabe im gemeinsamen Team akzeptiert;
  - Anpassung der Leser `workstyle_core_visible_to`, `get_workstyle_product_team` (Profile im Teamkontext) und Vorhaben-Leser im Team.
- **Dazu ein Team-Austritt:** RPC `leave_founder_team`, plus Antwort auf die Frage, wer Mitglieder entfernen darf.
- **Vorhaben:** Sichtbarkeit für Mitglieder bei `submitted_at` und gleichem `venture_id`, statt `alignment_shares`. Das ist eine Policy- bzw. Leser-Änderung.

## 9. Audit des Einzelberichts

Aufbau heute (`IndividualWorkstyle.tsx`):
1. Einstieg
2. „Workstyle Signature – Dein Antwortmuster auf einen Blick“
3. „Wo deine Antworten in eine Richtung gehen“
4. „Wie du arbeitest – Bereich für Bereich“ (Kernsatz, Situationen, Ausnahme, Fragenhinweise, Missing-Hinweis, „Zum Weiterdenken“)
5. „So liest du das“
6. Anhang

**Befunde:**
- **„Workstyle Signature“** ist ein technischer, englischer Begriff, und „Antwortmuster“ betont den Test, nicht die Person.
- **Pole** (`SignatureOverview.tsx:19-26`) sind lang und negativ formuliert („prüft eine Einschätzung eher nicht noch einmal“). Darunter wiederholen Skalenenden „sehr unwahrscheinlich … sehr wahrscheinlich“ die Testsprache.
- **Satzbausteine** (`narrative.ts`):
  - „In den beschriebenen Situationen prüfst du … eher noch einmal“;
  - „beantwortest du mit ‚teils/teils‘“;
  - „je nach Situation unterschiedlich“;
  - „Ausnahme mit ‚teils/teils‘“.
  Korrekt, aber wie eine Testauswertung formuliert.
- **Erklärtexte:** Hinweise unter ORG und EXP sowie lange Methodik-Fußzeilen stehen schon in der Übersicht.
- **Visuell:** funktional, viel Text pro Bereich, wenig Hierarchie, „Zum Weiterdenken“ geht unter.

## 10. Einzelbericht – Zielbild

1. **Titel + 2 Sätze Einführung** („Dein Arbeitsprofil – wie du in typischen Situationen des Gründeralltags vorgehst, nach deinen eigenen Antworten.“)
2. **Deine Arbeitsweise auf einen Blick:** 6 Bereichskarten (Abschnitt 12)
3. **Was bei dir besonders auffällt:** 2–3 Sätze, nur Bereiche mit klarer Richtung oder auffälliger Spannweite; sonst entfällt der Abschnitt
4. **Bereich für Bereich:** eine Karte je Bereich mit Kernsatz in Alltagssprache, „Wann es bei dir anders ist“ (nur bei Spannweite) und eingeklappt „Die Situationen im Einzelnen“
5. **Eine Frage für dich:** genau **eine** Reflexionsfrage, aus dem auffälligsten Bereich
6. **So liest du das:** Methodik, klein, am Ende
7. *(Online eingeklappt / Druck optional)* Anhang mit allen Antworten

Grenzen: keine Typologie, keine Scores, keine Eignung, keine Wirkung auf andere, keine Aussage über beobachtetes Verhalten.

## 11. Textbeispiele für den Einzelbericht

Richtung: Alltagssprache, „wenn … dann …“, immer an die eigenen Antworten gebunden, ohne Charakterurteil.

- **EVI – Entscheidungen prüfen**
  - *Richtung „prüfen“:* „Wenn eine Entscheidung wichtig ist, schaust du lieber noch einmal genauer hin – besonders dann, wenn neue Informationen dagegen sprechen.“
  - *Gemischt:* „Bei dir hängt es von der Lage ab: Manches lässt du stehen, anderes prüfst du noch einmal – vor allem, wenn jemand einen Punkt bringt, den du nachvollziehen kannst.“
- **EXP – Erfahrung nutzen**
  - *Richtung „stark“:* „Wenn dir eine Situation bekannt vorkommt, lässt du dich von früheren Erfahrungen deutlich leiten.“
  - *Gemischt:* „Erfahrung ist für dich ein Hinweis unter mehreren: Bei sehr vertrauten Themen stützt du dich stärker darauf, bei nur ähnlichen weniger.“
- **EL – Durch Ausprobieren lernen**
  - *Richtung „ausprobieren“:* „Wenn sich etwas im Kleinen testen lässt, probierst du es lieber aus, als lange zu diskutieren.“
  - *Gemischt:* „Ob du erst testest oder dich direkt festlegst, hängt bei dir vom Aufwand ab.“
- **VOICE – Einwände ansprechen**
  - *Richtung „ansprechen“:* „Wenn dir etwas Wichtiges auffällt, sprichst du es an – auch wenn die anderen schon fast fertig sind.“
  - *Gemischt:* „Manche Einwände bringst du gleich ein, bei anderen wartest du eher ab – etwa wenn ein Thema schon vertagt wurde.“
- **AMB – Offene Situationen empfinden**
  - *Richtung „eher unangenehm“:* „Offene Fragen, die sich gerade nicht klären lassen, fühlen sich für dich eher unbequem an.“ *(Hinweis: Empfinden, nicht Verhalten.)*
  - *Richtung „eher gelassen“:* „Wenn vieles noch offen ist, bleibst du nach deinen Antworten eher gelassen.“
- **ORG – Die Arbeit steuern**
  - *Richtung „klären zuerst“:* „Bei größeren Aufgaben machst du dir zuerst die nächsten Schritte klar und setzt dir eigene Zwischenpunkte.“
  - *Gemischt:* „Bei größeren Aufgaben legst du manchmal erst einen Plan fest, manchmal fängst du einfach an und sortierst unterwegs.“

**Eine Frage für dich** (Beispiel EVI): „Woran merkst du, dass es sich lohnt, eine Entscheidung noch einmal zu öffnen – und wann lässt du sie bewusst stehen?“

## 12. Visualsystem für den Einzelbericht

**Name:** **„Deine Arbeitsweise auf einen Blick“** (empfohlen).

| Alternative | Bewertung |
|---|---|
| „Deine Arbeitsweise auf einen Blick“ | klar, warm, ohne Testsprache |
| „Dein Profil in sechs Bereichen“ | sachlich, betont die Struktur |
| „So gehst du Dinge an“ | sehr nahbar, aber unscharf |
| „Arbeitsweise-Kompass“ | Metapher suggeriert Richtung „richtig/falsch“, eher nicht |
| „Workstyle Signature“ | technisch, englisch, raus |

**Bereichskarte**, 6 Stück:
```
Entscheidungen prüfen
erste Einschätzung stehen lassen      noch einmal genauer hinschauen
○────────────●────────────○
„Du schaust lieber noch einmal genauer hin.“
```

- **Pole:** kurz, positiv, gleichwertig formuliert.

  | Bereich | Pol links | Pol rechts |
  |---|---|---|
  | EVI | erste Einschätzung stehen lassen | noch einmal genauer hinschauen |
  | EXP | eher frisch einschätzen | auf Erfahrung bauen |
  | EL | erst klären | erst ausprobieren |
  | VOICE | eher abwarten | gleich ansprechen |
  | AMB | offen ist okay | offen ist unbequem |
  | ORG | einfach anfangen | erst Schritte klären |

- **Punkt:** Die Antworten gehen in eine Richtung (heutige Logik `overviewMark`, Median). Dargestellt als gefüllter Kreis in Violett.
- **Spannweite:** gemischte Antworten. Ein weicher Balken in Lila/Cyan zwischen den gewählten Positionen, beschriftet mit „je nach Situation“.
- **Kein Marker:** zu wenige Antworten. Die Linie bleibt leer, mit „Noch zu wenige Antworten“ in Grau.
- **Missing:** „Kann ich noch nicht einschätzen“ zählt nicht. Bei vielen Missing erscheint ein kleiner Text „3 von 5 Situationen beantwortet“.
- **Kein Score, kein Prozent, kein Radar.**
- **Druck:**
  - Punkt schwarz gefüllt, Spannweite schraffiert bzw. als gestrichelter Rahmen;
  - Pole in normaler Schriftgröße;
  - 2 Karten je Zeile;
  - Karten nicht über Seitenumbrüche teilen.
- **Mobil (390 px):**
  - Karten untereinander;
  - Pole über der Linie in zwei Zeilen, links- bzw. rechtsbündig;
  - Schrift mindestens 14 px;
  - keine Achsenbeschriftungen unter 12 px.

## 13. Audit des Teamberichts

Aufbau heute (`TeamWorkstyleReport.tsx`):
1. „Auf einen Blick“ (Signature, Zusammenfassung der Fähigkeiten)
2. „Worüber ihr früh sprechen solltet“ (nummerierte Liste, max. 8)
3. „Wie ihr arbeitet“ (6 Bereichskarten + Anhang)
4. „Fähigkeiten & Verantwortung“ (Mosaik mit Symbolen)
5. „Was ihr aufbauen wollt“
6. „Was ihr bereits vereinbart habt“

**Befunde:**
- **Signature:**
  - Marker mit Initialen (MA/FO) auf gemeinsamer Linie sind bei 2 Personen schwer lesbar;
  - 3–4 Spuren sind besser, aber eng;
  - die Pole sind dieselben langen Sätze wie im Einzelbericht.
- **Standardtexte** (`narrative.ts:457-525`): „Teils antwortet ihr ähnlich, teils unterschiedlich.“, „In mindestens einer Situation liegen eure Antworten auf entgegengesetzten Seiten.“, „…eher Nuancen als Gegensätze.“ Sie wiederholen sich in allen Bereichen und klingen nach Auswertung.
- **Gesprächspunkte:**
  - eine Rangliste mit Quellenlabel und „Im Founder Setup besprechen“;
  - Fähigkeiten-Fragen („Wer kümmert sich darum?“) stehen neben Arbeitsweise-Fragen;
  - wirkt wie eine Systemausgabe.
- **Fähigkeiten:**
  - die Legende ★ ◆ ＋ ↗ ↪ ◇ ? ist codiert;
  - „keine Angabe“-Zeilen füllen Karten;
  - gestrichelte Karten wirken leer;
  - bei 4 Personen werden die Bausteine hoch.
- **Länge:** vollständig, aber das Handlungsrelevante (Gesprächskarten) steht nicht vorn und ist nicht kompakt.

## 14. Teambericht – Zielbild

1. **Euer Zusammenspiel auf einen Blick:** 6 Bereichskarten mit einer Spur je Person (Abschnitt 16) und je ein Satz
2. **Was bei euch ähnlich ist:** 2–3 Sätze, nur Bereiche mit klar ähnlicher Richtung
3. **Wo ihr unterschiedlich an Dinge herangeht:** 2–3 Sätze, nur deutliche Unterschiede (entgegengesetzte Seiten); Nuancen nicht prominent
4. **Hier lohnt sich ein Gespräch:** 3–6 Gesprächskarten (Abschnitt 16), jeweils mit Link „Im Founder Setup festhalten“
5. **Bereich für Bereich:** eingeklappte Details je Bereich
6. **Fähigkeiten & Verantwortung:** neu (Abschnitt 17)
7. **Was ihr aufbauen wollt:** nur Unterschiede prominent, Gleiches eingeklappt
8. **Was ihr bereits vereinbart habt**
9. **So lest ihr das:** Methodik

Nicht jede kleine Differenz wird hervorgehoben. Gleichheit ist kein Ziel, Unterschied kein Problem.

## 15. Textbeispiele für den Teambericht

- **EVI:** „Bei manchen Situationen liegt ihr nah beieinander, bei anderen würdet ihr eher unterschiedlich reagieren. Besonders sichtbar wird das bei der Frage, wann eine Entscheidung noch einmal geöffnet werden sollte.“
- **EXP:** „Ihr lasst euch beide deutlich von früherer Erfahrung leiten. Spannend wird es, wenn eure Erfahrungen in verschiedene Richtungen zeigen.“
- **EL:** „Maria testet lieber im Kleinen, Mia klärt lieber erst im Gespräch. Gut zu wissen, bevor ihr euch bei zwei Ansätzen festfahrt.“
- **VOICE:** „Ihr sprecht beide an, was euch auffällt – auch kurz vor dem Abschluss. Unterschiedlich ist eher, wann ihr ein vertagtes Thema wieder aufgreift.“
- **AMB:** „Offene Fragen fühlen sich für euch unterschiedlich an: Für eine von euch ist das eher unbequem, für die andere eher in Ordnung. Das beschreibt euer Empfinden, nicht euer Handeln.“
- **ORG:** „Bei größeren Aufgaben klärt ihr beide gern zuerst die nächsten Schritte. Unterschiedlich ist, wie schnell ihr einen Plan anpasst, wenn Kleinigkeiten anders laufen.“

Namen erscheinen nur, wenn die Mitglieder einander freigegeben haben. Das ist im Teambericht immer der Fall, weil er gegenseitige Bereitschaft voraussetzt.

## 16. Gesprächskarten

Kleine Karten mit Bereichsetikett, einer Frage und optional einem Satz Kontext, plus „Im Founder Setup festhalten“. Ausgewählt werden sie aus deutlichen Unterschieden, offener Verantwortung und Vorhaben-Unterschieden; sie sind nicht nummeriert und keine Rangliste.

1. **ENTSCHEIDUNGEN** – Wann öffnen wir eine Entscheidung noch einmal – und wann lassen wir sie bewusst stehen?
2. **AUSPROBIEREN** – Wann testen wir im Kleinen, und wann klären wir erst weiter im Gespräch?
3. **EINWÄNDE** – Wie sorgen wir dafür, dass Zweifel noch Platz haben, auch wenn wir fast fertig sind?
4. **OFFENE FRAGEN** – Wie lange halten wir eine wichtige Frage offen, bevor wir trotzdem weitermachen?
5. **ERFAHRUNG** – Wessen Erfahrung zählt, wenn unsere Erfahrungen in verschiedene Richtungen zeigen?
6. **ARBEIT STEUERN** – Wie viel Plan brauchen wir, bevor wir loslegen – und wann passen wir ihn an?
7. **VERANTWORTUNG** – Für [Bereich] möchte bisher niemand die Verantwortung übernehmen. Wer kümmert sich – oder lösen wir es extern?
8. **VORHABEN** – Ihr erwartet bei [Thema] Unterschiedliches. Welche Erwartung soll für euer Vorhaben gelten?

## 17. Neues Design für Fähigkeiten

**Prinzipien:**
- Nur Bereiche, zu denen mindestens eine Person etwas angegeben hat, und davon prominent nur die **relevanten**: offene Verantwortung, mehrere Verantwortungswünsche, nur eine Person mit Erfahrung, extern denkbar.
- Fehlende Angaben werden zusammengefasst, nicht als Karten gezeigt.
- Erfahrung und Verantwortung stehen getrennt, als **Textchips** statt Symbole.

**Aufbau:**
1. **„Wo Verantwortung noch offen ist“:** 0–5 kompakte Zeilen, z. B. „Fundraising – bisher möchte es niemand verantworten · extern denkbar“.
2. **„Wer was mitbringt“:** eine Liste je Bereich.
   ```
   Software-Entwicklung
     Mia    [viel Erfahrung] [möchte verantworten]
     Maria  [möchte beitragen]
   ```
   Chips:
   - Erfahrung: „viel Erfahrung“ (ab EXPERIENCED), „etwas Erfahrung“, „noch keine“;
   - Wunsch: „möchte verantworten“ (nur `own`), „möchte beitragen“, „möchte hineinwachsen“, „lieber jemand anderes“, „lieber extern“, „noch offen“.
   - Personen ohne Angabe zu diesem Bereich erscheinen **nicht** als Zeile. Darunter steht „Keine Angabe: Maria“ in Grau, einzeilig.
3. **„Weitere Bereiche“** (eingeklappt): alle übrigen Bereiche mit Angaben, kompakt.
4. **Zusammenfassung:** „Zu 46 Bereichen hat niemand etwas angegeben – das heißt nicht, dass etwas fehlt.“

**Umfang:**
- 2–4 Personen: eine Zeile je Person mit Angabe.
- 54 Bereiche: nur die mit Angaben, gruppiert nach Familie, Relevantes zuerst.
- Druck: Liste statt Raster, Chips als Text in eckigen Klammern.
- Mobil: eine Spalte, Chips umbrechend.

## 18. Online und Druck

| | Online | PDF / Druck |
|---|---|---|
| Struktur | Karten, Details einklappbar, Gesprächskarten vorn | kompakt: Übersicht → Auffälliges → Gesprächskarten → Bereiche (kurz) → Fähigkeiten-Liste → Vorhaben-Unterschiede → Vereinbarungen → Methodik |
| Bedienelemente | Freigaben, Navigation, „Details anzeigen“ | keine (`ws-no-print`) |
| Details | auf Klick | nur in der „ausführlichen Fassung“ |
| Leere Zustände | kurze Hinweise | weglassen statt leere Karten |
| Umbrüche | — | Karten, Spuren und Gesprächskarten nicht teilen; Überschriften nicht allein am Seitenende |

## 19. Mobil (390 px)

- Schrift mindestens 14 px im Fließtext, 12 px für Hilfstexte, nie kleiner.
- Personen-Spuren immer gestapelt (auch bei 2 Personen): Name über der Spur, keine Doppelachse.
- Karten untereinander, Gesprächskarten als einspaltige Liste.
- Fähigkeiten: eine Spalte, Chips umbrechend, „Weitere Bereiche“ eingeklappt.

## 20. Priorisierung

**P0 – vor Phase 12:**
1. **Teamfreigabe als Paket** (Option C) inklusive Teambeitritt als transparentem, ausdrücklichem Freigabemoment. Dazu gehören:
   - Vorhaben ohne eigene Freigabe;
   - Fähigkeiten-Tiefe im Team über die Teamfreigabe;
   - Readiness auf „Teamfreigabe aller Mitglieder“ umstellen.
2. **Team verlassen** (Austritt), mit klaren Widerrufsfolgen. Ohne das ist eine Teamfreigabe nicht sauber widerrufbar.
3. **Fallen beseitigen:**
   - Ausblenden einzelner Fragen im Teamkontext entfernen oder klar warnen;
   - Empfängerlücke bei 3–4 Personen schließen (entfällt mit 1);
   - den Effekt „nicht aktiver Advisor-Grant entwertet Freigabe“ prüfen und gegebenenfalls korrigieren.
4. **Sprache der Berichte und „Workstyle Signature“ ersetzen:** Copy und Benennung (Abschnitte 11, 12, 15), ohne Logikänderung.

**P1 – im selben Umbau:**
5. Neues Visualsystem (Karten, kurze Pole, gestapelte Spuren).
6. Gesprächskarten statt Rangliste.
7. Fähigkeiten-Neudesign (Chips, relevante Bereiche zuerst, fehlende Angaben zusammengefasst).
8. Neue Struktur von Einzel- und Teambericht, Druckfassung kompakt.

**P2 – später:**
9. Advisor-Freigaben an einem Ort, mit optionalem Workstyle-Scope im Grant.
10. Org-Grants in der Wirksamkeitsprüfung.
11. Mitglieder entfernen (Rollenfrage).
12. Englische Fassung der Berichte.

## 21. Technische Auswirkungen

| Ebene | Was |
|---|---|
| Nur UI / Copy | Benennung, Pole, Satzbausteine (`narrative.ts`, `SignatureOverview.tsx`, `model.ts` AREAS), Gesprächskarten-Texte, Fähigkeiten-Chips, Methodik ans Ende |
| Komponenten-Refactor | `SignatureOverview` → Bereichskarten, `IndividualWorkstyle`/`TeamWorkstyleReport` neu gegliedert, `ComponentMatrix` → Liste mit Chips, `ShareForm` → Team-Schalter + Advisor-Bereich, Beitritts-Dialog |
| Server Actions | `setTeamShare`, `leaveTeam`; Vorhaben-Abgabe ohne Freigabeschritt |
| RPC | `set_team_share`, `leave_founder_team`, zentrale Sichtbarkeitsfunktion; Anpassung von `workstyle_core_visible_to`, `get_workstyle_product_team`, `get_workstyle_team_share_readiness`, `get_disclosed_capability('team')`, Vorhaben-Leser |
| DB-Migration | Tabelle `team_shares`; ggf. Policy für Vorhaben-Sichtbarkeit im Team; keine Datenübernahme |
| RLS / Policies | `team_shares` (Eigentümer schreibt, Mitglieder lesen); `alignment_answers`/`assessments` Leserecht für Vorhaben im gleichen Team (oder nur über SECURITY-DEFINER-Leser) |
| Historische Daten | keine Änderung; bestehende `alignment_shares` bleiben gültig; Snapshots weiter mit Prüfung beim Lesen |
| Tests | neue pgTAP-Suites (Teamfreigabe, Austritt, Neuzugang, Widerruf, Advisor unberührt, FIND unberührt); Anpassung der Suites, die „Teambeitritt gewährt nichts“ festschreiben (bleibt wahr, nur die neue Teamfreigabe kommt dazu); viele Quelltext-Tests der Berichte (Struktur und Texte) |
| Print-CSS | Karten, Spuren, Gesprächskarten, Fähigkeiten-Liste; Weglassen leerer Zustände |

## 22. Offene Entscheidungen

1. Teamfreigabe beim Beitritt: ein kombinierter Knopf „Beitreten und teilen“ (zwei getrennte Optionen) oder ein eigener Schritt direkt danach?
2. Neue Mitglieder: Gilt eine bestehende Teamfreigabe automatisch für sie (mit Information an alle), oder pausiert sie, bis jede Person neu bestätigt?
3. Darf jemand Mitglieder entfernen, und wenn ja, wer?
4. Fähigkeiten im Team: Tiefe immer mit Teamfreigabe sichtbar, oder weiterhin an `capability_disclosure` gebunden?
5. Vorhaben: „Abgeben = mit dem Team teilen“ akzeptiert?
6. Soll das Ausblenden einzelner Fragen für Einzel- und Advisor-Freigaben erhalten bleiben?
7. Advisor-Wirksamkeitsprüfung: Absicht oder Fehler, dass ein nicht aktiver Grant eine Freigabe zwischen zwei Foundern entwertet? Kann ein Founder überhaupt als Advisor angefragt werden?
8. Name „Deine Arbeitsweise auf einen Blick“ bestätigt?
9. Teambericht bei 2 Personen: gestapelte Spuren (empfohlen) statt gemeinsamer Linie?

---

NO IMPLEMENTATION
NO MIGRATION
NO CODE CHANGE
NO COMMIT
NO PUSH
NO DEPLOY
