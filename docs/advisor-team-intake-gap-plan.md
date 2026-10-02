# Phase 7.5 – Team Intake: Gap- und Entscheidungsplan

Status: **Plan, keine Implementierung.** Code-/DB-Baseline und Evidenz stehen im [Ist-Zustand](advisor-team-intake-current-state.md), Modus-, Sichtbarkeits- und Reportkonzept in der [Produktspezifikation](advisor-team-intake-product-spec.md).

In Phase 7.5 werden ausschließlich diese drei Markdown-Dokumente erstellt. Alle Angaben zu Migrationen in der folgenden Matrix beziehen sich auf eine **spätere, gesondert beauftragte Umsetzung**. Jetzt: keine Migration, keine Tabellen, kein Fragebogen, keine Invite-Funktion, kein Report, kein Score und keine Assessmentänderung.

## 1. Bausteinmatrix

`Existiert` bedeutet nutzbarer Bestand innerhalb seiner heutigen Grenzen; `erweitern` bedeutet gezielter Anschluss, nicht stilles Aufweichen vorhandener Zugriffsregeln. UI-Aufwand: S = kleine Anpassung, M = mehrere Zustände/Ansichten, L = eigener durchgängiger Flow. Keine Aufwandsschätzung in Personentagen ohne Produktentscheidungen.

| Baustein | Bestand / Einordnung | Spätere DB-Migration? | RLS / Zugriff | UI-Aufwand | Phase-8-Abhängigkeit | Hauptrisiko |
| --- | --- | --- | --- | --- | --- | --- |
| Individuelle Founder-Identität | **Existiert**: Auth, `person_core`, eigene Profile | Für Wiederverwendung nein | Bestehende owner-only Daten und enge freigegebene Leser erhalten | S | Keine | Teambehauptung wird fälschlich Personenmerkmal |
| Advisor-Personeninvites | **Existiert / erweitern**: E-Mail-gebundene Token, angefragte Scopes, Einzelentscheidungen | Für Intake-Zuordnung/Zweck wahrscheinlich ja; nicht für heutigen Invite | Claim bleibt von Inhaltszustimmung getrennt; kein neuer Allzweck-Scope | M | Nur spätere Auswahl des Arbeitsprofilmoduls | Alter `base`-Scope wird mit Assessment-Modul verwechselt |
| Advisor-Organisation / Mitglieder | **Existiert**: Owner/Advisor, active/revoked, Org-Halter | Für bewusste Wiederverwendung nein; begrenzte Reviewer-Zuordnung wäre neu | Aktive Org und Mitgliedschaft bei jedem Read, keine implizite globale Advisor-Rolle | S; mit Fallzuweisung M/L | Keine | „Privat für Advisorin“ wird tatsächlich allen Org-Mitgliedern zugänglich |
| Kanonisches Founder-Team / Venture | **Existiert / erweitern**: Team + 1–3 Mitglieder | Zusätzliche sichere Intake-Bindung/RPC voraussichtlich ja | Alle Beteiligten und konkretes Team prüfen; keine freien Client-User-IDs | M | Keine | Dasselbe Paar landet im falschen Venture; ungefragte Teamzuordnung |
| Team-/Accelerator-Intake | **Erweitern / neu verbinden**: bisherige A/B-Team-Einladung existiert, Zielprozess fehlt | Ja: zwei/drei Teilnehmer, Halter, Zweck, Teambezug und Zustände; genaue Tabellenform erst später | Einladung an sich verleiht keine Reportrechte; Annahme und Zustimmung getrennt; Org-Grenzen | L | Kein Blocker für Team Context; Module später anschließbar | Pauschale Übernahme von Legacy-`base` und Approval-Flags |
| Gleichberechtigter dritter Founder | **Erweitern**: DB-Mitgliederlimit drei und Setup-Konsens vorhanden, Intake A/B-only | Ja für Einladungs-/Besetzungsmodell | Alle drei bestätigen; keine Mehrheitsfreigabe, keine stillen Restgruppen | M | Keine | C wird in einem Paarreport übergangen |
| Selection-/Development-Runde | **Neu**: Zweck, Zeitstand, benannte Besetzung und Halter | Ja | Runde nicht allein über Teammitgliedschaft lesbar; kein automatischer Moduswechsel | M | Keine | Vertrauliche Development-Angaben gelangen in Selection |
| Relationale Team-Context-Antworten | **Neu**: gerichtete Perspektive innerhalb Team/Runde | Ja | Autor schreibt nur eigene Entwürfe; Gegenüber muss zur vereinbarten Besetzung gehören; nicht `person_core` | M | Keine, solange rein kontextbezogen | A kann für B schreiben oder über beliebige Dritte antworten |
| Teamweite Perspektive je Founder | **Neu**, klar vom Paarblock getrennt | Ja, zusammen mit Kontextmodell | Autorbindung, Rundengrenze, gleiche Veröffentlichungsregeln | S/M | Keine | Doppelte Projektgeschichten werden als mehr Evidenz gezählt |
| Unabhängige Abgabe / gemeinsame Veröffentlichung | **Neu**; Muster gemeinsamer Review-/Setup-Zustimmung existieren | Ja | Keine fremden Entwürfe; serverseitige Freigabeentscheidung; Wiederöffnung versionieren | M | Keine | Frühe Antworten beeinflussen Erstantworten; Race Conditions bei Veröffentlichung |
| Gemeinsamer und Advisor-privater Bereich | **Neu für Team Context**; vorhandene persönliche Advisor-Notizen erfüllen das nicht | Ja | Getrennte Empfänger/Sichten; private Daten auch aus Synthesen, Export und Logs ausschließen | M/L | Keine | Indirekte Offenlegung durch Zusammenfassungen oder Metadaten |
| Personenbezogene Profil-/Capability-/Direction-Layer | **Existiert / erweitern**: enge RPCs, zusätzliche Depth-Freigabe | Für reine Darstellung nein; rundenspezifische Zustimmung/Referenz gegebenenfalls ja | Einzel-Scopes bleiben zusätzlich nötig; keine Interview-Rohdaten übernehmen | M | Arbeitsprofilteil ausnehmen | Report suggeriert volle Datenlage bei fehlenden Freigaben |
| Gemeinsame Auswertungszustimmung | **Existiert / erweitern**: `advisor_team_reviews`, 2–8 Personen, kein Teambezug | Ja, falls Wiederverwendung für konkrete Team-/Rundenbindung | Gruppenfreigabe erweitert keine Einzelrechte; auf aktuelle Wirksamkeit prüfen | M | Keine | Beliebige Aufstellung wird als tatsächlich bestehendes Team behandelt |
| Aktuelle Assessment-/Venture-Freigaben | **Existiert / später anschließen**: assessmentbezogene Shares und Hidden-Blocks | Für reine Nutzung nein; eindeutiger Runden-/Venturebezug und atomare Freigabe eventuell ja | Nicht aus Org- oder Team-Context-Rechten ableiten; neue Empfänger explizit | M | Wissenschaftliche Inhalte ausschließlich Phase 8 | Falsches Venture; ungewollte Freigabe beim mehrstufigen Update |
| Founder Setup | **Existiert / erweitern**: confirmed-only, alle aktuellen Mitglieder, Pause bei neuem Mitglied | Für personenbezogene Bestandsansicht nein; Org-/Intake-Halter gegebenenfalls ja | Bestätigte Revisionen statt Arbeitsnotizen; vorhandene All-member-Prüfung erhalten | S/M | Keine | Relationship-Zustimmung wird als teamweite Setup-Freigabe missverstanden |
| Team-Context-Report | **Neu**: geordnete Originalperspektiven, neutrale Lücken, Agenda | Persistente Antworten/Freigaben ja; zusätzlicher Report-Cache nicht zwingend | Jede Quelle zum Read-Zeitpunkt autorisieren; vertrauliche Bereiche strikt trennen | M | Unabhängig lieferbar | Unterschiedlichkeit wird sprachlich zu einem Defizit |
| Gesamter mehrschichtiger Advisor-Teamreport | **Erweitern / integrieren**, mehrere heutige Teilansichten | Nur Darstellung nicht zwingend; Runden-/Freigabereferenzen voraussichtlich ja | Jeder Layer separat, Besetzung/Venture/Halter konsistent | L | Psychometrische Schicht abhängig; übrige nicht | Alter Score bekommt durch neue Oberfläche unbeabsichtigt Selection-Autorität |
| Neutrale Gesprächspunkte | **Existiert teilweise / erweitern**: Impulse, Notizen, Follow-ups | Bei Nutzung vorhandener Notizen ggf. nein; Kontextbezug gegebenenfalls ja | Quellenbindung; private Advisor-Notizen nicht als Founder-Aussage ausgeben | S/M | Keine | Interpretation wird mit Originalaussage verwechselt |
| Automatische Freitext-Synthese | **Neu, nicht für ersten Stand empfohlen** | Nicht vorab erforderlich | Nur zulässige Quellen; gleiche Sichtbarkeit für Ableitungen, keine verdeckten Eingaben | M/L plus eigene Qualitätssicherung | Keine psychometrische Legitimation durch Phase 8 | Halluzinierter Konsens, rekonstruierbare private Aussagen |
| Programm / Batch / Bewerbung / manueller Selection-Status | **Neu, zurückstellen**; Org ist keine Cohort | Ja, bei späterer Beauftragung | Programmzugehörigkeit allein gibt keine Datenrechte; Reviewer-Grenzen separat | L | Keine | Schleichendes CRM oder automatische Rangliste |
| Widerruf, Besetzungswechsel, Aufbewahrung, Exporte | **Erweitern**: bestehende Revokes/Account-Deletion reichen nicht für neue Daten | Ja für neuen Lebenszyklus; Export selbst braucht nicht zwingend neue Tabelle | Reads/Exports neu prüfen; keine Wiederfreigabe durch Retry; abgeleitete Ansichten sperren | M | Unabhängig, Vertragsgrenzen später auch für Phase 8 | Historische Daten werden neuen Teammitgliedern oder neuem Zweck gezeigt |

## 2. Empfohlene Reihenfolge nach Produktentscheidung

### G0 – Zweck und Sichtbarkeit entscheiden

Die zehn offenen Entscheidungen aus der Produktspezifikation beantworten. Besonders vor Erhebung privater Aussagen müssen Empfänger, Pflicht/Freiwilligkeit, gemeinsame Sichtbarkeit und Aufbewahrung feststehen. Die Inhaltsmatrix wird erst danach in konkrete, verständliche Fragen übersetzt. Keine psychometrischen Ratings und keine finale Formulierung in Phase 7.5.

Abnahmekriterium: Eine Founder-Person kann vor Beginn erkennen, wer ihre Antworten zu welchem Zweck lesen wird und welche Informationen freiwillig sind. Eine Organisation kann nicht gleichzeitig als persönlicher Einzel-Advisor beschrieben werden.

### G1 – Identität und Intake vom Legacy-Vergleich entkoppeln

Zuerst den gewählten Team-/Venturebezug, zwei/drei Empfänger, Halter und Besetzung verbindlich machen. Bestehende Token-/Mail-/Claim-Muster wiederverwenden; die heutige A/B-Team-Einladung nicht still semantisch umwidmen. Keine Accounts für andere erstellen und keine vorhandenen Profile öffentlich suchen. Bestehende Legacy-Einladungen weiterhin korrekt behandeln.

Vor der Migration entscheiden, ob der bisherige A/B-Vorgang additive Teilnehmerreferenzen erhält oder ein separater schmaler Intake-Vorgang angeschlossen wird. Die aktuelle `advisor_team_invites`-Struktur nicht durch ein einzelnes zusätzliches C-Feld langfristig zu einem zweiten Teammodell machen. Jede Option muss Bestand, laufende Tokens und terminale Widerrufe erhalten.

Abnahmekriterium: Derselbe Intake funktioniert mit neuen, bestehenden und gemischten Accounts, ohne `base`-Assessment automatisch vorauszusetzen. Ein bestehendes Team wird ausdrücklich bestätigt; falsches Konto, falsche Org und vierte Person werden serverseitig abgewiesen.

### G2 – Kontextdaten, Entwürfe und Freigaben

Ein kleines, zweckgebundenes Rundenmodell mit gerichteten und teamweiten Antworten bauen, falls G0/G1 beauftragt sind. Bestehende `assessments` und `alignment_answers` nicht als allgemeinen Speicher für Beziehungserzählungen missbrauchen. Die nächste Migration muss Eindeutigkeit, Besetzungsbezug, Urheberschaft und Lebenszyklus begründen.

Bei Veröffentlichung keine Abfolge „erst alles freigeben, dann verstecken“. Empfängerauswahl, finaler Antwortstand und Veröffentlichung müssen konsistent sein. RLS schützt bereits den Entwurf; UI-Verbergen genügt nicht. Read-Prüfungen berücksichtigen aktuellen Grant, Empfängerstatus, Zweck, Besetzung und Runde.

Abnahmekriterium: A kann nur A→B/A→C bzw. eigene Teamantworten bearbeiten. Weder B, C, Advisor noch andere Org-Mitglieder außerhalb des erklärten Empfängerkreises lesen A-Entwürfe. Race-/Retry-Fälle erzeugen keine versehentliche Freigabe.

### G3 – Kleinster Team-Context-Bericht

Originalperspektiven nach Teamthema und Paar geordnet darstellen, inklusive C und ohne Mehrheitsbildung. Organisatorisch fehlende Beiträge von fachlicher Interpretation trennen. Der gemeinsame Report und ein möglicher privater Advisor-Bereich dürfen weder Daten noch abgeleitete Texte vermischen. Für den ersten Stand keine generative Synthese erforderlich.

Abnahmekriterium: Mit identischen Aussagen entsteht kein „gutes Team“, mit abweichenden Aussagen kein „Risiko“. Ein Report zeigt Quelle, Gegenüber, Datum/Runde und die Grenze seiner verfügbaren Perspektiven.

### G4 – Bestehende freigegebene Layers anschließen

Profile, Capability/Depth, Direction und gegebenenfalls bestätigtes Setup gezielt integrieren. Bestehende Review-Zustimmung kann als Muster dienen, muss aber auf konkrete Besetzung und aktuellen Zweck bezogen bleiben. Die Quelle einer Aussage und ihre Sichtbarkeit bleiben nachvollziehbar; kein unautorisierter Fallback auf alte Reports.

Abnahmekriterium: Widerruf eines einzelnen Scopes entfernt genau diese Inhalte und davon abhängige Aussagen. Das falsche Venture kann nicht allein durch „neuester Datensatz“ in den Bericht rutschen. Die Gruppenansicht verleiht keine zusätzlichen Personenrechte.

### G5 – Spätere unabhängige Erweiterungen

Phase-8-Arbeitsprofil erst nach dessen eigener Definition, Prüfung und Freigabe als separaten Layer anschließen. Programm-/Batch-Verwaltung, Bewerbungsstatus, Reviewer-Zuordnung und zusätzliche Exporte jeweils gesondert priorisieren. Keines davon ist Voraussetzung für einen kleinen, explizit freigegebenen Team-Context-Pilot.

## 3. Sicherheitsinvarianten für eine spätere Implementierung

1. **Session statt Clientidentität:** Autor wird aus der Sitzung ermittelt; Zielperson, Team und Runde werden aus autorisierter Besetzung abgeleitet/geprüft. Eine frei eingesandte User-ID darf keinen fremden Kontext lesbar machen.
2. **Zustimmungsebenen bleiben getrennt:** Teilnahme/Teambeitritt, individuelle Profilfreigabe, gemeinsame Auswertung und neuer Team-Context-Zugang sind verschiedene Entscheidungen.
3. **Halter bleibt explizit:** Person oder Organisation, nicht beides unklar vermischt. Aktiver Org-Status und aktive Mitgliedschaft gelten auch bei späteren Reads, nicht nur beim Einladen.
4. **Minimaler Service-Role-Einsatz:** Bestehender privilegierter Legacy-Bootstrap ist keine Vorlage für ungeschützte Report-Abfragen. Neue Reads nach Möglichkeit über Session/RLS bzw. enge RPCs; jeder unvermeidliche privilegierte Pfad braucht eine vorgelagerte konkrete Autorisierung.
5. **Keine stillen Erweiterungen:** Neue Person, Runde, Org, Modus oder Teamzuordnung erweitert alte Freigaben nicht. Ein Paarvergleich beweist keine Zustimmung des dritten Mitglieds.
6. **Private Daten bleiben auch abgeleitet privat:** Synthese, Agenda, Vorschau, Export, E-Mail und Logs dürfen keine zurückgehaltenen Inhalte oder deren Existenz pro Person verraten.
7. **Widerruf bleibt terminal für den widerrufenen Vorgang:** Resend, Retry, Neuaufbau und Cache dürfen ihn nicht zurücksetzen. Eine spätere neue Zustimmung ist ein ausdrücklicher neuer Vorgang.
8. **Kein Personenmerkmal aus einer Beziehungsaussage:** Team Context aktualisiert keine Skills, Stärken, `person_core`, Assessmentwerte oder Matching-Rankings.

Die im Ist-Zustand festgehaltenen uneinheitlichen Grant-/Review-Prüfungen, persönlichen Shares und mehrstufigen Share-Updates sind bei Wiederverwendung gezielt zu prüfen. Sie sind in diesem Dokument keine bereits behobenen Probleme.

## 4. Erforderliche Tests des späteren Flows

Diese Fälle sind **zukünftige Abnahmekriterien**, nicht in Phase 7.5 implementierte Tests:

| Bereich | Mindestens zu prüfen |
| --- | --- |
| Einladung | A/B und A/B/C; alle neu, alle bestehend, gemischte Accounts; falsche E-Mail; abgelaufener/verbrauchter Token; Resend; doppelte parallele Einladung; terminaler Widerruf; kein stilles Fremdkonto |
| Teambezug | Explizites vorhandenes Team; bestätigte Neuanlage; mehrere Ventures derselben Person; dasselbe Personenpaar in anderem Kontext; keine vierte Person; Besetzungsänderung startet keine automatische Weitergabe |
| Urheberschaft | A schreibt A→B, nicht B→A; keine Selbstbewertung im Paarblock; B/C/Advisor lesen keine A-Entwürfe; nicht beteiligte Person und anon ohne Zugriff |
| Unabhängigkeit | Frühe Abgabe zeigt keine fremden Inhalte; alle notwendigen Abgaben/Freigaben; Überarbeitung nach Sichtbarkeit gekennzeichnet; gleichzeitige Abgabe/Widerruf; fehlende dritte Person nicht als vollständiger Report |
| Sichtbarkeit | Gemeinsamer versus privater Inhalt; Autorvorschau; Org-Wechsel/Suspendierung/Mitgliedsrevokation; Ablauf; private Quelle wird nicht in gemeinsamer Agenda oder Metadaten sichtbar |
| Report | AB, AC und BC richtig zugeordnet; teamweite Aussagen nur einmal; keine Mehrheits-/Qualitätsbewertung; neutrale fehlende Perspektive; richtige Sprache und mobile Bedienbarkeit |
| Bestehende Rechte | Einzel-Scopes zusätzlich nötig; Capability Depth gesondert; Setup weiterhin confirmed-only und einstimmig; konkrete Venture-Identität; keine Rückkehr widerrufener Legacy-Rechte |
| Lebenszyklus | Neue Runde; Withdrawal; Teambeitritt/-austritt; Account-Löschung; historischer Stand; Empfängerwechsel; Export nach Revokation verweigert; definierte Aufbewahrung und Löschung |

Sicherheitsregeln gehören vorrangig in echte DB-/pgTAP-Tests. App-Tests müssen die Weitergabe erlaubter Felder und fehlende unautorisierte Fallbacks prüfen. Browserprüfungen sollen anschließend die tatsächlichen Account-/Invite-/Consent- und Reportwege mit zwei sowie drei Testpersonen abdecken, ohne echte Einladungen an außenstehende Personen zu versenden.

## 5. Offene Risiken und Abhängigkeiten

- **Selection-Druck:** Pflichtfelder und sichtbare Auslassungen können freiwillige Antworten faktisch erzwingen. Das ist eine Produktentscheidung, keine durch ein UI-Häkchen gelöste Frage.
- **Ungeprüfte Selbstberichte:** Auch konkrete Erzählungen sind Perspektiven. Bericht und Advisor-Einstieg müssen dies deutlich machen, ohne Teilnehmer pauschal zu verdächtigen.
- **Dreierteam-Konflikte:** Keine Mehrheitslogik, keine unsichtbaren Privilegien für A/B, keine automatisch erweiterte Empfängergruppe.
- **Unvollständige Datenlage:** Nicht freigegebene Inhalte dürfen weder negativ gewertet noch aus anderen Quellen ergänzt werden.
- **Mehrere Rechtewelten:** Org-Grant, persönlicher Assessment-Share, Relationship-Zugang und Setup-Consent heute nicht gleichsetzen. Eine neue generische Berechtigungsplattform ist dennoch keine Voraussetzung; zunächst enge Team-Context-Regeln mit klaren Anschlüssen.
- **Phase 8 parallel:** Inhaltliche Instrumententwicklung, Scores, Validierung und psychometrische Auswertung bleiben außerhalb. Die Team-Context-Struktur darf weder vom alten 16-Item-Umfang noch von einer angenommenen neuen Dimensionenzahl abhängen.
- **Bestandsschutz:** Keine historische Migration bearbeiten, keine alten Antworten umdeuten und laufende Einladungen nicht ungefragt auf neue Zwecke umschalten.

## 6. Ergebnis dieser Phase

Erstellt wurden nur:

- `docs/advisor-team-intake-current-state.md`
- `docs/advisor-team-intake-product-spec.md`
- `docs/advisor-team-intake-gap-plan.md`

Vorhandene lokale DB-Tests: 1.557 Prüfungen in 129 Dateien erfolgreich. Keine neuen App-/DB-Funktionen und keine Migration. Ein App-Build ist für diese reine Dokumentationsänderung nicht erforderlich und wurde in Phase 7.5 nicht ausgeführt. Die zehn offenen Produktentscheidungen stehen am Ende der Produktspezifikation; erst nach deren Klärung folgt ein eigenständiger Implementierungsauftrag.
