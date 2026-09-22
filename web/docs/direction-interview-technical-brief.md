# CoFoundery Direction Interview - Audit und Technical Brief

## Status
- Zweck: Architektur festlegen, BEVOR Code entsteht. Auftrag vom 21.09.2026.
- Grundlage: der tatsaechliche Repository-Stand, nachgelesen und in der lokalen
  Datenbank geprueft, nicht die Erinnerung an ihn.
- Ergebnis: Das Capability-Interview traegt einen zweiten Interviewtyp mit
  EINER Migration von zwei Spalten. Es wird nicht umgebaut und nicht kopiert.
- Verhaeltnis zum Capability-Modell: eigene Perspektive (WHAT MATTERS TO US),
  ausdruecklich nicht vermischt.
- Nicht enthalten: Implementierung. Absichtlich.
- Letzte Aktualisierung: 2026-09-21

---

## 1. Auftrag und Abgrenzung

Gefragt war: keine zweite Interview-Engine, keine parallele Architektur, keine
unnoetige Duplikation - und vorher ein Audit. Dieses Dokument beantwortet die
fuenfzehn Fragen aus dem Briefing (Abschnitt 2), trennt Wiederverwendbares von
Capability-Spezifischem (Abschnitt 3), legt die Architektur fest (Abschnitt 4
bis 6) und schlaegt eine Schrittfolge vor (Abschnitt 10).

Eine Sache vorweg, weil sie die wichtigste Erkenntnis des Audits ist:

> Wiederverwendbar ist die **Gespraechsmechanik**. Nicht wiederverwendbar ist
> das **Ziel der Auswertung** - und der Versuch, Direction in das
> Capability-Vokabular zu zwingen, waere der eine Fehler, der dieses Feature
> unbrauchbar macht.

Begruendung in Abschnitt 5.

---

## 2. Audit des bestehenden Capability-Interviews

Die Nummerierung folgt den fuenfzehn Fragen des Briefings.

### 2.1 Wo befindet sich das bestehende Capability Interview?

Code: `web/src/features/capability/` (28 Dateien, ca. 5.500 Zeilen).
Fuer das Interview relevant:

| Datei | Zeilen | Rolle |
| --- | --- | --- |
| `capabilityInterviewGuide.ts` | 366 | Fragenkatalog, Typen, Fortschritt |
| `capabilityInterviewActions.ts` | 528 | Server Actions: starten, speichern, sortieren, abschliessen |
| `capabilityInterviewData.ts` | 258 | Leser: aktives Gespraech, unsortierte/sortierte Antworten, Rueckblick |
| `capabilityInterviewSummary.ts` | 147 | Der Blick zurueck nach dem Abschluss |
| `InterviewAnswerForm.tsx` | 297 | Antwortformular mit zweischichtigem Autosave |
| `InterviewSortForm.tsx` | 418 | Der Bestaetigungsschritt |
| `capabilityEvidenceWrite.ts` | 137 | Der EINE Schreibpfad in die Evidenz |
| `narrativeAnalysis.ts` / `narrativeAnalysisModel.ts` | 198 / 224 | Regelweg und Modellweg |
| `capabilityProposalData.ts` | 72 | KI-Vorschlaege lesen |
| `interviewAudio.ts` + `interviewAudioManifest.json` | 45 | Vorlese-Verzeichnis |
| `SpeakButton.tsx`, `ProposalWatcher.tsx` | 66 / 45 | Vorlesen, auf die KI warten |

Seiten: `web/src/app/(product)/profile/interview/page.tsx` und
`.../interview/sort/page.tsx`.

Datenbank: `supabase/migrations/20261021120000_capability_interview.sql`
(Tabellen, Familie `communication_representation`),
`20261031120000_interview_turn_areas.sql`,
`20261032120000_capability_area_proposals.sql`,
`20261022120000_capability_disclosure_team.sql`.

Skripte: `web/scripts/ai-worker.ts` (Fall `capability_area_proposal`),
`web/scripts/tts-build.ts`.

### 2.2 Wie sind Interviewfragen derzeit definiert?

Als Datenstruktur im Code, die Texte getrennt davon im Sprachbundle.

`INTERVIEW_QUESTIONS` in `capabilityInterviewGuide.ts` ist ein Array von:

```ts
{
  id: string;                       // 'owned_last'
  context: "professional" | "personal" | "either";
  target: "evidence" | "ownership_away" | "ownership_growth";
  suggestsAreas: readonly string[]; // Bereiche, die die FRAGE nahelegt
  suggestsFamily: string | null;    // Familie, auf die sie zielt
  suggestsWish: OwnershipWish | null;
  followUpIds: readonly string[];   // geschriebene Nachfragen
}
```

Die Saetze selbst stehen in `messages/<locale>/capability.json` unter
`interview.questions.<id>.{title,hint,followUps.<id>}`. Der Grund steht im
Kopfkommentar: derselbe Satz an zwei Orten laeuft auseinander, und dann zeigt
der Verlauf eine Frage, die so nie gestellt wurde.

Reihenfolge und Mindestmass: `nextCatalogueQuestion(askedIds)` nimmt die erste
noch nicht gestellte Frage, `INTERVIEW_MIN_ANSWERS = 4`,
`interviewProgress(...)` liefert `atQuestion`, `answeredCount`, `hasEnough`.

**Fuer Direction heisst das: die Fragen sind Daten, nicht Ablauf.** Ein zweiter
Katalog ist eine zweite Konstante und ein zweites Sprachbundle - kein zweiter
Mechanismus.

### 2.3 Wie funktionieren Sessions?

`capability_interview_sessions(id, user_id, status, started_at, completed_at)`.

- `status in ('active','completed')`, und `(status='completed') = (completed_at is not null)` als Constraint.
- **Ein aktives Gespraech je Person**, erzwungen durch einen partiellen Unique-Index
  `on (user_id) where status = 'active'`.
- RLS: vier Policies, alle `user_id = auth.uid()`. Niemand sonst sieht etwas -
  auch kein Teammitglied.

### 2.4 Wie werden Antworten gespeichert?

`capability_interview_turns` - eine Zeile je gestellte Frage:

- `session_id`, `sort_order` (unique je Session)
- `question_source in ('catalogue','model')`, `question_id`, `question_text`
  (nur bei Modellfragen, und dann verpflichtend - beides als Constraint)
- `answer` (10-2000 Zeichen), `answered_at`, mit
  `(answer is null) = (answered_at is null)`
- `evidence_id` -> `person_capability_evidence` mit `on delete set null`

Der Kommentar an der Tabelle ist Teil der Zusage: *"Enthaelt nichts Verborgenes:
kein Gedankengang eines Modells, keine Zwischenbewertung, keine Tonaufnahme."*

Autosave: `InterviewAnswerForm.tsx` speichert zweischichtig - `localStorage`
bei jeder Aenderung, Server nach 2.500 ms Ruhe. Beim Wiederkommen gewinnt der
laengere Entwurf, mit Hinweis. Deshalb liest `getActiveInterview` als
"aktuelle Frage" die Zeile mit dem HOECHSTEN `sort_order` und nicht die erste
unbeantwortete: Autosave setzt `answered_at`, und die erste unbeantwortete
waere dann die falsche.

### 2.5 Wie funktionieren AI-Follow-ups?

**Sie existieren noch nicht.** Das ist der wichtigste Befund dieses
Abschnitts, und er widerspricht der Annahme im Briefing ("wie kann die
bestehende Follow-up-Logik wiederverwendet werden").

Vorhanden ist:

- Die Datenbank kann Modellfragen aufnehmen (`question_source='model'`,
  `question_text`) - die Struktur ist fertig.
- Der Katalog traegt je Frage zwei GESCHRIEBENE Nachfragen (`followUpIds`), die
  nach Erreichen von `NARRATIVE_MIN_LENGTH` unter der Frage erscheinen.
- Eine Seite, die ausdruecklich NICHT behauptet, ein Coach zu fragen. Ein Test
  verbietet diese Behauptung, solange es sie nicht gibt.

Was die KI heute tut, ist etwas anderes: Sie schlaegt nach der Antwort
**Bereiche** vor (Abschnitt 2.7), sie stellt keine Fragen.

**Fuer Direction heisst das:** Adaptive Nachfragen sind fuer BEIDE Interviews
neu. Das ist eine Chance - sie koennen von Anfang an generisch gebaut werden -
und ein Risiko: Sie sind Neuland und nicht "Wiederverwendung", also gehoeren sie
nicht in dieselbe Stufe wie der Rest (siehe Abschnitt 10).

### 2.6 Wie funktioniert AI-Verfuegbarkeit und Fallback?

Drei Schichten, alle vorhanden und alle wiederverwendbar:

1. **Ziehende Warteschlange.** `ai_jobs(job_type, subject_user_id,
   source_table, source_id, status, attempts, model, prompt_version,
   error_code, ...)`. Die Anwendung ruft nie ein Modell. Sie legt einen Auftrag
   hin; der Arbeiter auf Marias Laptop holt ihn mit `claim_ai_job()`
   (`for update skip locked`) und meldet `complete_ai_job` / `fail_ai_job`.
   Vercel muss den Laptop nicht erreichen koennen - das war die
   Entwurfsbedingung.
2. **Sichtbare Verfuegbarkeit.** `get_ai_availability()` und
   `record_ai_worker_heartbeat()`. "Nicht erreichbar" ist ein Zustand, den die
   Oberflaeche zeigen kann, kein Fehler.
3. **Regelweg als Rueckfall.** `createModelNarrativeAnalyzer({areas, fallback})`
   ruft bei `answer === null` den `fallback` - heute
   `analyzeNarrativeWithRules` (Begriffslisten). Das Ergebnis traegt
   `engine: "rules" | "model"` mit, damit im Ergebnis steht, wer geantwortet
   hat. Eine leere Modellantwort wird NICHT heimlich durch Regeln ersetzt:
   "ich finde nichts" ist eine Antwort.

Der Auftragstyp ist ein Constraint:
`job_type in ('ping','connect_resource_extraction','capability_area_proposal')`.
Ein Direction-Typ braucht also eine Migration - eine Zeile.

### 2.7 Wie werden strukturierte Extraktionen gespeichert?

Der Kern der Anti-Halluzinations-Zusage, und der Teil, den Direction fast
unveraendert erbt:

- `capability_area_proposals(turn_id, area_id, evidence_quote, status, model,
  prompt_version, created_at, decided_at)`
  - `unique (turn_id, area_id)`
  - Zitat 12-300 Zeichen
  - `status in ('pending','accepted','rejected')` mit
    `(status='pending') = (decided_at is null)`
  - **kein INSERT-Recht fuer `authenticated`**, nur
    `grant update (status, decided_at)`
- `request_capability_area_proposals(...)` legt Auftraege an, aber nur fuer eine
  eigene, beantwortete Zeile (`capability_turn_not_readable`).
- `get_ai_job_source_text(job_id)` gibt dem Arbeiter fuer
  `capability_interview_turns` **nur die Antwort**, nicht die Frage - weil ein
  Modell sonst Teile der Frage als Beleg ausgeben koennte.
- `insert_ai_capability_proposal(...)` prueft das Zitat NOCH EINMAL gegen den
  Quelltext (`position(normalized_quote in normalized_source)`). Ein Vorschlag,
  dessen Beleg nicht wortwoertlich in der Antwort steht, entsteht nicht.

Das Ergebnis der Bestaetigung landet in `person_capability_entries(user_id,
area_id, application_level, ownership_wish)` und
`person_capability_evidence(entry_id, narrative)` - plus
`capability_interview_turn_areas(turn_id, area_id)`, weil eine Evidenz nur am
fuehrenden Bereich haengt.

### 2.8 Wie funktioniert User Confirmation?

`InterviewSortForm.tsx`, und zwar mit ausgewiesenen Quellen. Drei getrennte
Bloecke, bewusst nicht vermischt:

1. **Vom Modell erkannt** - mit wortwoertlichem Zitat neben jedem Vorschlag und
   einer Stufen-Auswahl je Bereich, die erst erscheint, wenn der Haken sitzt.
2. **Folgt aus der Frage** (`suggestsAreas`) - ausgewiesen als "wegen der
   Frage", nicht als Fund im Text.
3. **Aus deinem Text erkannt** (Regelweg).

Dazu seit 21.09.2026 **"Selbst auswaehlen"**: das gesamte Vokabular, gruppiert,
aufgeklappt wenn nichts vorgeschlagen wurde, mit der von der Frage
vorgeschlagenen Familie offen.

Nichts wird ohne Haken geschrieben. `capabilityEvidenceWrite.ts` ist der EINE
Schreibpfad - dieselbe Funktion fuer Textfeld und Interview.

### 2.9 Wie ist Audio umgesetzt?

Vorproduziert, nicht zur Laufzeit:

- `web/scripts/tts-build.ts` liest `messages/<locale>/capability.json`, zerlegt
  jeden Text in Abschnitte von maximal 300 Zeichen, schickt sie an aicapella
  (`POST /jobs` -> `GET /jobs/{id}` -> `GET /jobs/{id}/audio`, WAV 24 kHz mono),
  wandelt mit `lame` zu MP3 und schreibt `interviewAudioManifest.json`
  (`{locale: {key: {hash, seconds, wav, mp3?}}}`).
- `spokenText(locale, key)` gibt nur etwas zurueck, wenn ein `mp3` im Manifest
  steht. Ein Knopf, der auf eine fehlende Datei zeigt, waere die unangenehmste
  Art von Fehler.
- Zur Laufzeit: statische Dateien. Kein API-Schluessel in der Produktion, keine
  Wartezeit, keine Abhaengigkeit von aicapella im Betrieb.
- Stand: 32 deutsche MP3s, 1,2 MB, 3,2 Minuten. Englisch ist nicht gebaut.

**Speech-to-Text gibt es nicht.** Das Briefing nennt "Nutzerantwort per Audio,
Speech-to-Text" - dafuer existiert im Repository keine Grundlage, und aicapella
ist ein Stimmdienst, kein Erkenner. Das ist ein eigenes Vorhaben mit eigenem
Anbieter, eigener Einwilligung und eigener Loeschfrist. Es gehoert nicht in
Direction v0.1.

### 2.10 Was kann unveraendert wiederverwendet werden?

- Die Warteschlange (`ai_jobs`, `claim/complete/fail`, Heartbeat,
  Verfuegbarkeit)
- Die Zitatpruefung als Bauweise (neue Tabelle, gleiche Regeln)
- Das Rueckfall-Prinzip `engine: "rules" | "model"` inklusive der Begruendung
- Die Audio-Kette (ein Bundle-Parameter, sonst nichts)
- Das zweischichtige Autosave-Formular (Bauteil, nicht Capability-Logik)
- `ProposalWatcher` (wartet, bis ein Auftrag fertig ist, und hoert von selbst auf)
- Der Grundsatz der Bestaetigung: getrennte Quellen, Zitat daneben, nichts ohne
  Haken

### 2.11 Was muss generischer werden?

Genau zwei Dinge, beide klein:

1. **`capability_interview_sessions` und `capability_interview_turns` brauchen
   ein `kind`.** Heute ist der Typ im Tabellennamen; morgen steht er in einer
   Spalte. Der partielle Unique-Index wird
   `(user_id, kind) where status='active'`.
2. **`tts-build.ts` muss sein Quellbundle als Parameter nehmen** statt
   `capability.json` fest zu verdrahten.

Der Rest ist Ergaenzung, nicht Verallgemeinerung.

### 2.12 Welche neuen Strukturen sind wirklich notwendig?

Siehe Abschnitt 5. Kurz: eine Tabelle fuer bestaetigte Direction-Aussagen, eine
fuer Vorschlaege dazu, ein Auftragstyp.

### 2.13 Wie kommt ein zweiter Typ hinzu, ohne Capability zu beschaedigen?

- `kind text not null default 'capability'` - bestehende Zeilen behalten ihre
  Bedeutung ohne Datenwanderung.
- Die RLS-Policies bleiben **unveraendert**: Sie pruefen `user_id = auth.uid()`,
  und das gilt fuer jeden Typ.
- Die Tabellennamen bleiben. Ein `capability_interview_turns`, in dem auch
  Direction-Zeilen liegen, ist ein unschoener Name - aber ein Name ist billiger
  als eine Wanderung von Zeilen durch zwanzig Policies, drei Funktionen
  (`get_ai_job_source_text` nennt die Tabelle namentlich) und
  sechzehn Testdateien. Der Kommentar an der Tabelle sagt, warum sie so heisst.
- Die Leser und Aktionen bekommen `kind` als Parameter und filtern darauf.
  Ohne diesen Filter wuerde das Capability-Interview Direction-Zeilen als seine
  eigenen lesen - **das ist der eine Weg, auf dem dieser Umbau Schaden anrichten
  kann**, und deshalb steht er in Abschnitt 14 als Testpflicht.

### 2.14 Welche RLS- und Privacy-Auswirkungen entstehen?

- Die Interviewtabellen sind schon heute streng eigen. Direction erbt das.
- Neu ist die **Ergebnis**seite: Capability-Ergebnisse sind ueber
  `person_core.capability_disclosure` und `get_disclosed_capability(user_id,
  context)` teilbar (Kontexte `discovery`, `connect`, `team`; Tiefe erst bei
  angenommener Verbindung). Direction darf diesen Pfad **nicht** mitbenutzen:
  Eine gemeinsame Sichtbarkeitsspalte hiesse, dass eine Entscheidung ueber
  Faehigkeiten gleichzeitig eine ueber persoenliche Antriebe ist. Direction
  braucht eine eigene Spalte mit eigenem Standard (`private`).
- Direction-Daten duerfen nicht in Suchranking oder Matching-Scores. Das ist
  keine Absichtserklaerung, sondern pruefbar: Es gibt keine Score-Funktion, die
  sie liest, und ein Test haelt das fest.

### 2.15 Welche Tests sind vor der Aenderung erforderlich?

Vor der `kind`-Migration muessen gruen sein und danach unveraendert gruen
bleiben:

- Fuenf pgTAP-Suiten: `capability_interview.sql`,
  `capability_area_proposals.sql`, `capability_disclosure_v01.sql`,
  `capability_disclosure_team.sql`, `capability_snapshot_v01.sql`.
  Sie laufen NICHT in `ci:check` und muessen einzeln gestartet werden.
- `web/src/features/capability/__tests__/` (16 Dateien) - insbesondere
  `capabilityInterviewFlow.test.ts` und `capabilityConfirmation.test.ts`
- `npm run ci:check` als Ganzes

Neu dazu, gleich mit der Migration:

- Ein pgTAP-Fall, dass zwei Gespraeche verschiedener Art **gleichzeitig** aktiv
  sein duerfen, zwei derselben Art aber nicht.
- Ein pgTAP-Fall, dass eine fremde Interviewzeile weiterhin unlesbar ist.
- Ein Code-Test, dass jeder Leser und jede Aktion nach `kind` filtert.

---

## 3. Wiederverwendbar oder nicht - die Uebersicht

| Baustein | Urteil |
| --- | --- |
| Session/Turn-Tabellen | wiederverwenden, `kind` ergaenzen |
| RLS-Policies | unveraendert |
| Fragen als Datenstruktur | Muster wiederverwenden, zweiter Katalog |
| Fragetexte im Sprachbundle | Muster wiederverwenden, `direction.json` |
| Autosave-Formular | Bauteil wiederverwenden |
| Fortschrittslogik | fast gleich - Direction hat 6 statt 8 Fragen |
| Warteschlange `ai_jobs` | unveraendert, ein Typ mehr |
| Zitatpruefung in der DB | Bauweise wiederverwenden, eigene Tabelle |
| `engine: rules \| model` | Prinzip wiederverwenden |
| Audio-Kette | wiederverwenden, Bundle als Parameter |
| Bestaetigungsschritt | Muster wiederverwenden, andere Inhalte |
| **Bereichsvokabular (48 Bereiche, 10 Familien)** | **nicht verwenden** |
| **`person_capability_entries/evidence`** | **nicht verwenden** |
| **`capability_disclosure` / `get_disclosed_capability`** | **nicht verwenden** |
| **Regelweg mit `AREA_TERMS`** | **nicht verwenden** (siehe 5.2) |

---

## 4. Die Architekturentscheidung

**Eine Interviewmechanik, zwei Typen, zwei getrennte Ergebniswelten.**

```
capability_interview_sessions (+ kind)      <- geteilt
capability_interview_turns    (+ kind)      <- geteilt
ai_jobs                                     <- geteilt
        |                                          |
        | kind='capability'                        | kind='direction'
        v                                          v
capability_area_proposals                   direction_statement_proposals
person_capability_entries/evidence          direction_statements
capability_disclosure                       direction_disclosure
```

Begruendung fuer "geteilt" oben: Fragen stellen, Antworten speichern, Entwuerfe
retten, pausieren, abschliessen - das ist in beiden Faellen dasselbe, und zwei
Kopien dieser 800 Zeilen wuerden auseinanderlaufen.

Begruendung fuer "getrennt" unten: Abschnitt 5.

**Nicht gemacht wird:** ein Umbau auf `interview_sessions(kind)` mit Umzug der
Bestandsdaten, eine Abstraktion `InterviewEngine`, eine gemeinsame
Ergebnistabelle mit `facet`-Spalte fuer beides. Jedes davon waere schoener zu
zeichnen und teurer zu verantworten.

---

## 5. Was Direction wirklich neu braucht

### 5.1 Das Vokabularproblem

Capability waehlt aus einer **geschlossenen Liste** von 48 Bereichen. Das ist
die Grundlage von drei Zusagen: Das Modell kann nur waehlen, nicht erfinden;
zwei Menschen sind vergleichbar, weil sie dieselben Begriffe benutzen; und die
Teamauswertung kann Deckung berechnen.

Direction hat keine solche Liste, und sie zu erfinden waere der Rueckfall in
genau die Typologie, die das Briefing verbietet ("Empowerer-Typ"). Was Direction
sucht, sind **Formulierungen dieser Person** - "komplexe Systeme verstaendlicher
machen" ist kein Listeneintrag.

Konsequenz: Das Modell **schreibt Text**, statt aus einer Liste zu waehlen. Das
ist eine andere Risikoklasse als bei Capability (Abschnitt 6).

### 5.2 Warum der Regelweg hier NICHT taugt

`AREA_TERMS` funktioniert, weil "programmiert" auf `software_engineering`
zeigt. Fuer "was treibt dich an" gibt es keine Stichwoerter, die zuverlaessig
auf ein Thema zeigen - eine Begriffsliste wuerde hier raten und dabei serioes
aussehen. Der Rueckfall fuer Direction ist deshalb **kein zweiter Analysator,
sondern ein ehrliches "noch nichts"**: Ohne Modell gibt es die geschriebenen
Nachfragen, die gespeicherten Antworten und einen Hinweis, dass die
Zusammenfassung spaeter entsteht. Das Interview selbst funktioniert vollstaendig
ohne KI - nur die Interpretation wartet.

Das erfuellt Punkt 14 des Briefings ("Kernprozess unabhaengig von
AI-Verfuegbarkeit") und vermeidet eine Regelmechanik, die nach Erkenntnis
aussieht und keine ist.

### 5.3 Die neuen Tabellen (Entwurf)

```sql
-- Bestaetigte Aussagen. Nur was hier steht, darf woanders erscheinen.
direction_statements (
  id uuid pk,
  user_id uuid not null references auth.users on delete cascade,
  facet text not null,          -- Werteliste unten
  statement text not null,      -- 3-200 Zeichen, Formulierung der PERSON
  confidence text not null,     -- 'stated' | 'one_example' | 'recurring' | 'tentative'
  origin text not null,         -- 'confirmed_proposal' | 'edited_proposal' | 'own_words'
  source_turn_id uuid null references capability_interview_turns on delete set null,
  created_at, updated_at
)

-- Vorschlaege des Modells. Bis zur Bestaetigung nur fuer die Person sichtbar.
direction_statement_proposals (
  id uuid pk,
  turn_id uuid not null references capability_interview_turns on delete cascade,
  facet text not null,
  statement text not null,
  evidence_quote text not null,  -- 12-300 Zeichen, WORTWOERTLICH aus der Antwort
  status text not null,          -- 'pending' | 'accepted' | 'rejected'
  model text, prompt_version text,
  created_at, decided_at
)
```

`facet` als Werteliste, aus Abschnitt 7 des Briefings:
`recurring_theme`, `problem_cared_about`, `people_cared_about`,
`desired_change`, `meaningful_outcome`, `energising_activity`,
`preferred_contribution`, `frustrating_condition`, `recurring_tension`,
`open_question`.

Regeln wie bei Capability: kein INSERT-Recht fuer `authenticated` auf die
Vorschlagstabelle, nur `grant update (status, decided_at)`; das Zitat wird in
`insert_ai_direction_proposal` erneut gegen die Antwort geprueft; `(status =
'pending') = (decided_at is null)`.

Dazu:
- `person_core.direction_disclosure` mit Standard `'private'`, Werteliste
  `'private' | 'team' | 'connections'`.
- `ai_jobs.job_type` um `'direction_statement_proposal'` erweitert.
- `get_ai_job_source_text` gibt fuer Direction-Zeilen ebenfalls **nur die
  Antwort** heraus.

### 5.4 Die Zusage, die in die Datenbank gehoert

Punkt 10 des Briefings sagt: *"Nur bestaetigte Inhalte duerfen spaeter fuer
andere Produktbereiche genutzt werden."* Das ist keine UI-Regel. Es wird
dadurch wahr, dass es zwei Tabellen gibt: Andere Produktbereiche lesen
`direction_statements` und haben auf `direction_statement_proposals` kein
Leserecht ausserhalb der eigenen Person. Eine `status`-Spalte in einer
gemeinsamen Tabelle waere dieselbe Zusage mit einem `where`-Fehler Abstand.

---

## 6. Das neue Risiko und was es eindaemmt

Bei Capability konnte das Modell nur aus 48 Begriffen waehlen; ein Zitat
belegte, woher. Bei Direction formuliert es einen Satz ueber einen Menschen.
Drei Dinge halten das in Grenzen:

1. **Jeder Vorschlag traegt sein wortwoertliches Zitat**, in der Datenbank
   geprueft. Ein Satz ohne Beleg entsteht nicht.
2. **Die Bestaetigung ist Pflicht, nicht Angebot.** Ohne sie existiert die
   Aussage in `direction_statements` nicht, und nur die wird woanders gelesen.
   Die Person kann jeden Vorschlag **bearbeiten** - der bearbeitete Satz traegt
   `origin='edited_proposal'`, damit spaeter erkennbar bleibt, wessen
   Formulierung das ist.
3. **`confidence` statt Score.** Die vier Stufen des Briefings sind eine
   Herkunftsangabe ("in mehreren Beispielen aufgetaucht"), keine Messung. Es
   gibt keine Zahl, keinen Prozentwert, keine Aggregation ueber Facetten.

Verbotene Ausgaben - und zwar als Test formuliert, nicht als Vorsatz: kein
Purpose Score, kein Founder Type, keine psychologische Kategorie, keine
Erfolgsprognose. Der entsprechende Test fuer Capability
(`keine Score-Begriffe im Ergebnis`) ist das Vorbild.

---

## 7. Die sechs Fragen, technisch

Die Formulierungen aus dem Briefing werden zu `DIRECTION_QUESTIONS` mit
derselben Struktur wie der Capability-Katalog. Statt `suggestsAreas` und
`suggestsFamily` traegt eine Direction-Frage, **welche Facetten sie
wahrscheinlich fuellt** - das ist der Anker, an dem die Modellantwort geprueft
wird, und der Rueckfall, wenn kein Modell laeuft.

| id | Frage (Kurzform) | erwartete Facetten | Nachfragen (fest) |
| --- | --- | --- | --- |
| `more_of_this` | "Davon wuerde ich gern mehr machen" | `energising_activity`, `preferred_contribution` | "Was genau daran war dir wichtig?" / "War dir wichtiger, was du getan hast - oder was dadurch entstanden ist?" |
| `keeps_bothering` | "Das muesste doch besser gehen" | `problem_cared_about`, `people_cared_about` | "Was genau daran stoert dich immer wieder?" / "Fuer wen ist das besonders relevant?" |
| `changed_something` | zuletzt wirklich etwas Sinnvolles veraendert | `meaningful_outcome`, `desired_change` | "Was war danach fuer jemanden tatsaechlich anders?" / "Warum war gerade diese Veraenderung wichtig?" |
| `change_in_others` | Veraenderung bei anderen, die dich freut | `desired_change`, `people_cared_about` | "Woran hast du gemerkt, dass sich etwas veraendert hat?" |
| `interesting_anyway` | spannend auch ohne Business Case | `recurring_theme`, `open_question` | "Was wuerdest du als Erstes darueber herausfinden wollen?" |
| `five_years_back` | Rueckblick aus fuenf Jahren | `desired_change`, `preferred_contribution`, `recurring_tension` | "Was davon haengt von dir ab - und was nicht?" |

Die Saetze selbst gehoeren nach `messages/<locale>/direction.json`, nicht in
den Code. Dann greift auch die Audio-Kette ohne Zusatzarbeit.

Mindestmass: **vier von sechs** - dieselbe Logik wie bei Capability
(`INTERVIEW_MIN_ANSWERS`). Wer nach vier Geschichten aufhoert, bekommt eine
schwaechere Interpretation, keine Sperre.

---

## 8. Audio

Eine Aenderung an `tts-build.ts`: das Quellbundle als Parameter
(`TTS_BUNDLES=capability,direction`). Die Manifest-Schluessel der neuen Texte
bekommen das Praefix `direction.` - die vorhandenen 32 Capability-Schluessel
bleiben unveraendert, damit nichts neu erzeugt werden muss. Die Asymmetrie ist
billiger als zehn Minuten aicapella und 1,2 MB geaenderte Dateien, und sie
gehoert kommentiert.

Umfang: 6 Fragen x (Titel + Hinweis) + 11 Nachfragen = ca. 23 Texte, geschaetzt
7 Minuten Rechenzeit und ca. 0,9 MB.

---

## 9. Sichtbarkeit

| Ebene | Bedeutung | v0.1 |
| --- | --- | --- |
| `private` | nur die Person | Standard, gebaut |
| `team` | ein gemeinsames Founder-Team | spaeter |
| `connections` | angenommene Verbindung in Connect/Find | spaeter |

Die Erzaehlungen selbst (`capability_interview_turns.answer`) werden **nie**
geteilt - auf keiner Ebene, fuer niemanden. Das gilt heute fuer Capability und
gilt fuer Direction genauso. Geteilt werden hoechstens bestaetigte Aussagen.

---

## 10. Schrittfolge

Jeder Schritt ist einzeln lieferbar und einzeln nuetzlich.

**S1 - Die geteilte Mechanik** *(1 Migration, klein)*
`kind` auf beiden Tabellen, Unique-Index je Art, alle Leser/Aktionen filtern.
Kein neues Verhalten. Beweis: Capability-Tests unveraendert gruen, zwei neue
pgTAP-Faelle.

**S2 - Direction ohne KI** *(kein Modell noetig)*
Katalog, `direction.json` (de/en), Seiten fuer Fragen und Antworten,
Pausieren/Fortsetzen, Rueckblick. Danach ist das Interview durchfuehrbar - die
Interpretation fehlt noch, und das steht auch da.

**S3 - Ergebnisstruktur und Bestaetigung**
`direction_statements` + `direction_statement_proposals` + Rechte,
Bestaetigungsschritt mit Bearbeiten/Entfernen/Ergaenzen, `MY DIRECTION`
(privat). Ohne Modell zeigt der Schritt "eigene Worte" - die Person kann ihre
Aussagen selbst schreiben. Damit ist die Definition of Done aus Punkt 20 bis auf
Nummer 3 erfuellt.

**S4 - Das Modell**
Auftragstyp, `insert_ai_direction_proposal` mit Zitatpruefung,
Worker-Fall, `ProposalWatcher` auf der Direction-Seite.

**S5 - Audio**
Bundle-Parameter, 23 Texte erzeugen, Knoepfe an die Fragen.

**S6 - Adaptive Nachfragen** *(Neuland, fuer BEIDE Interviews)*
Erst hier, und ausdruecklich als eigenes Vorhaben: Ein Modell, das Fragen
stellt, kann Schaden anrichten, den ein Modell, das Vorschlaege macht, nicht
anrichten kann. Die Struktur dafuer steht (`question_source='model'`).

**Spaeter** - Connect-Vergleich, gemeinsame Themen, Problem Discovery. Nicht
jetzt spezifizieren: Was dort sinnvoll ist, zeigt sich an echten Ergebnissen
aus S3.

---

## 11. Offene Entscheidungen

Diese gehoeren Maria, nicht mir:

1. **Facetten-Liste.** Zehn Facetten sind viel fuer ein v0.1. Kandidaten zum
   Zusammenlegen: `meaningful_outcome` + `desired_change`,
   `energising_activity` + `preferred_contribution`. Weniger Facetten heisst
   klarere Ergebnisseite und weniger Modellfehler.
2. **Frage 4 vs. Frage 3.** "Sinnvolles veraendert" und "Veraenderung bei
   anderen, die dich freut" liegen nah beieinander. Sechs Fragen mit einer
   Doppelung sind schwaecher als fuenf ohne.
3. **Name im Produkt.** "Direction" ist ein Arbeitsbegriff. `MY DIRECTION` auf
   einer deutschen Oberflaeche braucht eine deutsche Entsprechung, die nicht
   "Purpose" ist.
4. **Speech-to-Text** - eigenes Vorhaben, eigener Anbieter, eigene
   Einwilligung. Jetzt bewusst nicht.
