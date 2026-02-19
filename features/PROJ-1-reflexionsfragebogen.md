# PROJ-1: Reflexionsfragebogen (2 Personen, Einladungslinks)

## Status: 📋 Planned (Approved)
## Erstellt: 2026-02-08

## Abhaengigkeiten
- Benoetigt: Keine
- Optional: PROJ-2 (Vergleichsreport) — fuer automatische Report-Ansicht nach Abschluss beider Frageboegen

## Kontext
Eine "Session" ist die gemeinsame Reflexionsrunde von Person A und Person B. Pro Session existieren zwei getrennte Frageboegen (A/B), die ueber individuelle Tokens/Links erreichbar sind. Das Feature ermoeglicht beiden Personen, getrennt voneinander einen strukturierten Reflexionsfragebogen auszufuellen, um Unterschiede und Erwartungshaltungen sichtbar zu machen, bevor ein Vergleichsreport erstellt wird.

## User Stories

### US-1: Session starten und Einladungslink erhalten
**Als** Person A
**moechte ich** eine neue Session starten und einen persoenlichen Einladungslink fuer Person B erhalten
**um** dass wir den Fragebogen getrennt und anonym ausfuellen koennen.

### US-2: Fragebogen ausfuellen
**Als** eingeladene Person
**moechte ich** den Fragebogen in klaren Dimensionen beantworten
**um** meine Arbeits-, Entscheidungs- und Wertemuster strukturiert zu reflektieren.

### US-3: Fortschritt sehen
**Als** ausfuellende Person
**moechte ich** meinen Fortschritt sehen
**um** zu wissen, wie viele Fragen noch offen sind.

### US-4: Abschluss bestaetigen
**Als** ausfuellende Person
**moechte ich** nach dem letzten Schritt eine Abschlussbestaetigung sehen
**um** zu wissen, dass meine Antworten gespeichert sind.

### US-5: Warte-Status bis beide fertig sind
**Als** Person A
**moechte ich** nach meinem Abschluss einen Warte-Status sehen
**um** zu wissen, dass der Vergleichsreport erstellt wird, sobald beide fertig sind.

## Acceptance Criteria

### AC-1: Link-Flow, Token-Regeln und Zugriff
- [ ] Person A startet die Session und erhaelt einen Invite-Link fuer Person B.
- [ ] Person A erhaelt zusaetzlich einen eigenen Resume-Link fuer den eigenen Fragebogen.
- [ ] Beide Links oeffnen jeweils nur den eigenen Fragebogen (A oder B) und sind resume-faehig.
- [ ] Der Zugriff erfolgt anonym ohne Login.
- [ ] Antworten werden serverseitig per Token an die Session gebunden (kein Login notwendig).
- [ ] Tokens sind pro Session eindeutig, schwer zu erraten und fuer beide Rollen getrennt.
- [ ] Ein bereits verwendeter Link oeffnet die bestehende Sitzung mit den zuvor gespeicherten Antworten.

### AC-2: Fragebogenstruktur
- [ ] Der Fragebogen umfasst genau 36 Fragen in 6 Dimensionen a 6 Fragen.
- [ ] Pro Frage ist nur Single-Choice Multiple Choice erlaubt.
- [ ] Am Ende gibt es ein optionales Freitextfeld, das gespeichert werden kann und spaeter weiterbearbeitet werden kann, solange der Fragebogen nicht abgeschlossen ist.
- [ ] Der Fortschritt zeigt die Anzahl beantworteter Fragen.

### AC-3: Validierung & Abschluss
- [ ] Eine Person kann den Fragebogen nur abschliessen, wenn alle 36 Fragen beantwortet wurden.
- [ ] Das Freitextfeld ist optional und kann leer bleiben.
- [ ] Nach Abschluss ist das Freitextfeld schreibgeschuetzt und kann nicht mehr editiert werden.
- [ ] Nach Abschluss erscheint eine klare Bestaetigungsmeldung.

### AC-4: Completion und Ready-Status
- [ ] Completion wird pro Rolle (A/B) gespeichert und ist im Session-Status nachvollziehbar.
- [ ] Wenn nur eine Person abgeschlossen hat, sieht diese Person einen Warte-Status.
- [ ] Sobald beide Rollen abgeschlossen haben, wechselt der Session-Status auf \"ready\" fuer den Vergleichsreport.

## Edge Cases

### EC-1: Link ungueltig
- **Trigger:** Ein Einladungslink ist falsch, abgelaufen oder existiert nicht.
- **Erwartetes Verhalten:** Anzeige einer Fehlermeldung mit Hinweis, einen gueltigen Link anzufordern.

### EC-2: Seite neu laden
- **Trigger:** Die ausfuellende Person laedt die Seite neu oder schliesst den Browser.
- **Erwartetes Verhalten:** Antworten bleiben erhalten und der Fragebogen setzt am letzten Stand fort.

### EC-3: Doppelter Abschlussversuch
- **Trigger:** Eine Person klickt erneut auf "Abschliessen" nach bereits abgeschlossenem Fragebogen.
- **Erwartetes Verhalten:** Der Status bleibt abgeschlossen, keine doppelten Eintraege.

### EC-4: Teilweise beantwortet
- **Trigger:** Eine Person versucht vor Abschluss zu verlassen oder hat nur einen Teil beantwortet.
- **Erwartetes Verhalten:** Antworten bleiben gespeichert und koennen spaeter fortgesetzt werden.

## Nicht im Scope (Abgrenzung)
- Authentifizierung/Accounts
- Zahlungsabwicklung oder Premium-Funktionen
- PDF-Export des Reports
- Admin-Dashboards oder Team-Management

## Offene Fragen
- Soll es ein Zeitlimit pro Fragebogen geben?
- Sollen Einladungslinks ein Ablaufdatum haben?

---

## Tech-Design (Solution Architect)

### PM-Summary

#### Component-Struktur
Reflexionsfragebogen (Flow)
├── Session-Start (Screen)
│   ├── Kurz-Erklaerung
│   ├── Start-Button
│   └── Link-Ausgabe (Invite-Link B + Resume-Link A)
├── Fragebogen (Screen)
│   ├── Dimension-Intro (optional je Abschnitt)
│   ├── Fragenliste (Single-Choice)
│   ├── Fortschrittsanzeige
│   └── Navigation (Weiter/Zurueck)
├── Freitext (Screen / letzter Schritt)
│   ├── Optionales Freitextfeld
│   └── Abschliessen-Button
├── Abschluss-Bestaetigung (Screen)
└── Warte-Status (Screen)

#### Datenfluss
1. Person A startet eine neue Session und erhaelt zwei Links (Invite fuer B, Resume fuer A).
2. Person A und B fuellen den Fragebogen getrennt ueber ihre Links aus.
3. Antworten werden laufend serverseitig unter der Session gespeichert.
4. Nach Abschluss einer Person wird deren Fragebogen gesperrt und ein Abschluss-Screen angezeigt.
5. Wenn nur eine Person fertig ist, sieht diese einen Warte-Status.
6. Sobald beide abgeschlossen haben, wechselt der Session-Status auf "ready".

#### Daten-Model
Gespeichert werden:
- Session mit Status (in_progress, waiting, ready)
- Zwei Teilnehmende (A/B) mit eigenem Token/Link
- Antworten pro Person zu 36 Fragen
- Optionales Freitextfeld pro Person
- Abschlusszeitpunkt pro Person

#### Tech-Entscheidungen
- Serverseitige Speicherung per Token, weil zwei Personen und mehrere Geraete beteiligt sind.
- Resume-Links statt Login, um Reibung im MVP zu minimieren.
- Fester Fragebogen (36/6) fuer konsistente Vergleichbarkeit in PROJ-2.

---

### Technischer Anhang (fuer Developer)

#### Component-Architektur
Seite: /start
└── SessionStartPage (Server)
    └── SessionStartCard (Client)
        ├── StartButton
        └── LinkPanel (zeigt Invite-Link B + Resume-Link A)

Seite: /session/[token]
└── QuestionnairePage (Server)
    └── QuestionnaireFlow (Client)
        ├── ProgressBar
        ├── QuestionCard (Single-Choice)
        ├── NavigationControls
        └── FreeTextStep (optional)

Seite: /session/[token]/complete
└── CompletionPage (Server)
    └── CompletionState (Client)
        ├── DoneMessage
        └── WaitingStatus (wenn B noch offen)

#### Daten-Model (strukturiert)
Tabelle: sessions
- id: UUID (Primary Key)
- status: Enum ["in_progress", "waiting", "ready"]
- created_at: Timestamp
- updated_at: Timestamp

Tabelle: participants
- id: UUID (Primary Key)
- session_id: UUID (FK -> sessions.id)
- role: Enum ["A", "B"]
- token: String (unique, resume-link)
- completed_at: Timestamp (nullable)
- created_at: Timestamp

Tabelle: responses
- id: UUID (Primary Key)
- session_id: UUID (FK -> sessions.id)
- participant_id: UUID (FK -> participants.id)
- question_id: String (fixed IDs fuer 36 Fragen)
- choice_value: String (Single-Choice)
- created_at: Timestamp
- updated_at: Timestamp

Tabelle: free_text
- id: UUID (Primary Key)
- session_id: UUID (FK -> sessions.id)
- participant_id: UUID (FK -> participants.id)
- text: String (nullable)
- updated_at: Timestamp

Indexes:
- participants.token (unique, fuer schnellen Zugriff per Link)
- responses.session_id + participant_id

#### API-Endpunkte
POST /api/sessions              -> Session erstellen, Links fuer A/B generieren
GET  /api/sessions/{token}      -> Session/Participant laden per Token
PUT  /api/sessions/{token}      -> Antworten speichern (partial updates)
POST /api/sessions/{token}/complete -> Abschluss markieren und Status aktualisieren

#### Wiederverwendung
Neu zu erstellen:
- SessionStartPage + SessionStartCard
- QuestionnaireFlow inkl. Progress/Navigation
- Completion/Waiting Status
- Session/Participant/Response Speicherung

#### Dependencies
- zod (Input-Validierung der Antworten)
- nanoid (kurze, sichere Tokens fuer Links)

#### Backend-Bedarf: JA
Begruendung: Zwei Personen nutzen getrennte Links und muessen serverseitig persistierte Antworten teilen.
