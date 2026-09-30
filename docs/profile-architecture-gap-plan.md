# Profil-Architektur: alte Planung, neue Architektur, Umsetzungsplan

**Stand 30.09.2026.** Drei Teile: was von der bisherigen Planung noch stimmt
(§1), wie die Informationsarchitektur danach aussehen sollte (§2), und was
konkret zu tun ist (§3–§7).

Grundlage ist `docs/das-bist-du-bestandsaufnahme-v2.md`. Die beiden Specs dazu:
`docs/ueber-dich-guided-profile-builder-spec-v0.1.md`,
`docs/das-bist-du-ux-daten-spec-v0.2.md`.

---

## 1. Frühere Annahmen gegen den Ist-Zustand

Gelesen: `docs/das-bist-du-bestandsaufnahme.md` (30.09.2026 vormittags),
`docs/profile-consolidation-plan.md` (07.09.2026),
`web/docs/capability-model-technical-brief.md`,
`web/docs/direction-interview-technical-brief.md`,
`web/docs/founder-profile-and-advisor-access-brief.md`,
`docs/instrument-v2-architektur.md`, die FIND-Spec v0.1 (§13–§29, aus dem
Gespräch), `docs/faltin-sourcing-review.md`.

| Frühere Annahme | Aktueller Ist-Zustand | Noch gültig? | Muss geändert werden? |
|---|---|---|---|
| **`person_core` ist die kanonische Zeile, die Kontextzeilen sind Projektionen** (Consolidation-Plan §3) | Vier Tabellen tragen dieselben Felder, vier Trigger gleichen sie ab — in **beide** Richtungen. Gemessen: Ein Connect-Schreibvorgang kürzt `person_core.bio` von 1000 auf 800 Zeichen, weil Connect auf 800 kappt und zurücksynchronisiert | **nein** | ja — es ist eine Mehrheit mit Abgleich, keine Quelle mit Projektionen. §3.1 |
| **„Connect pflegt keine Identität mehr"** (Consolidation-Plan §3) | stimmt für die Oberfläche: `connectValidation.ts:50` nimmt Identität aus `person_core`. Der **Rück-Trigger** läuft trotzdem und schreibt jeden Wert zurück, den die Zeile trägt | halb | ja — der Trigger ist ein Überbleibsel und heute die Ursache des Bio-Befunds |
| **Phase 4.1 „Discovery-Identität ablösen" ist offen** | erledigt: `parseDiscoveryProfileFormData` nimmt Identität aus `person_core`, `/discovery/profile` zeigt nur eine Zusammenfassung mit Link | überholt | nein — abhaken |
| **Offene Entscheidung 1: „Bleibt `profileCompletion`?"** | entschieden und umgesetzt: Der Prozentwert ist entfernt, es blieb eine Ja/Nein-Weiche | überholt | nein — abhaken |
| **Phase 4.3/4.4 `focus_skill`, `intention`, `roles`** | `roles` ist auf `/profile` sichtbar und änderbar (`saveRoles`). `focus_skill` und `intention` werden im Einstieg erhoben, **nirgends** angezeigt und steuern nur `isCoreProfileComplete` | teils | ja — beide brauchen einen Ort oder ein Ende |
| **Bestandsaufnahme v1 §9.4: „`person_resources` erscheint nirgends"** | erscheint auf `/connect/profile` über `ResourceProposalSection` | **nein** | ja — sie sind da, nur im falschen Kontext |
| **Bestandsaufnahme v1 §9.2: „`/…/antworten` zeigt bewusst nur die Antworten"** | dort steht zusätzlich eine `WorkMap` | **nein** | ja — eine Darstellungsebene existiert bereits |
| **Bestandsaufnahme v1 §8: „Das neue ALIGN-Arbeitsprofil ist nirgends angebunden"** | angebunden an FIND (`discovery_theme_items`, 6 Themen aus 14 Items), an die Advisor-Ansicht (`WorkMap` + Antworten) und an die eigene Antwortenseite. **Nicht** an `/me/profile` | **nein** | ja — die Aussage war zu weit; der eine fehlende Ort ist `/me/profile` |
| **FIND-Spec §20: die sechs v1-Dimensionen gehören nicht mehr nach FIND** | umgesetzt, per Guard-Test abgesichert (`matchPoints.test.ts`) | ja | nein |
| **FIND-Spec §22: Suchpräferenzen sind privat** | umgesetzt: RLS nur eigene Zeile, Matching über eine enge Funktion, die nur das Ergebnis liefert | ja | nein |
| **Capability-Brief: Können ≠ Wollen, `application_level` und `ownership_wish` getrennt** | unverändert, an vier Stellen im Code begründet | ja | nein |
| **Faltin-Logik über `capability_areas.sourcing`** | in Daten belegt: 21 `internal_only`, 22 `depends`, 11 `component`, 0 `unclassified`. `buildFounderProfileCoverage` nutzt sie | ja | nein — bleibt |
| **Direction: 6 Fragen, 10 Facetten, `DIRECTION_MIN_ANSWERS = 4`** | unverändert | ja | nein |
| **Stärken sind ein eigenes Konstrukt mit eigener Tabelle** | unverändert, inkl. Selbst-/Fremdsicht | ja | nein |
| **„Kein Vollständigkeitsbalken auf `/profile`"** (Consolidation-Plan §6) | eingehalten | ja | nein — gilt auch für „Über dich" |
| **„Veröffentlichungsentscheidungen bleiben im Kontext"** (Consolidation-Plan §2) | eingehalten | ja | nein — gilt weiter, auch gegen den Wunsch nach einem Ort für alles |
| **v1 (`founder-compatibility-v1`) ist `CURRENT_INSTRUMENT_ID`** | in der Konstante ja, in der Tabelle `status = 'active'` — im Produkt aber nur noch für `alignState.knowsPrevious` sichtbar | irreführend | ja — Code und Wirklichkeit sagen Verschiedenes |
| **Das Gesamtbild ist die Fassung, die weitergegeben wird** (Advisor-Access-Brief) | gilt, ist aber nicht eingelöst: ein Druckmodus, kein Dateinamen-Vertrag, kein Stand über alles | ja, unerfüllt | ja |
| **Vier Säulen sind die richtige Gliederung für „Das bist du"** | Säule 2 ist die längste Seite des Produkts, Säule 1 sechs Zeilen | fraglich | ja — v0.2 schlägt drei Teile mit zehn Abschnitten vor |
| **„Über dich" und „Das bist du" sind zwei getrennte Erlebnisse** | im Code getrennt (`/profile` schreibt, `/me/profile` liest), in der Navigation **nicht**: `/profile` in der Hilfsleiste, `/me/profile` unter Align | ja, unvollständig | ja — Navigation |
| **Der Datenexport deckt die personenbezogenen Daten ab** | 16 Tabellen; es fehlen u. a. `person_strengths`, `direction_statements`, `person_resources`, `alignment_answers`, `person_capability_evidence`, `discovery_theme_preferences` | **nein** | ja |

---

## 2. Die Informationsarchitektur danach

### 2.1 Das Grundprinzip hält — mit einer Einschränkung

```
ÜBER DICH      Erfassung, Pflege, geführter Aufbau
DAS BIST DU    Synthese, Verständnis, Darstellung, PDF
FIND-PROFIL    Kontextansicht für die Co-Founder-Suche
CONNECT-PROFIL Kontextansicht für das Netzwerk
ALIGN          liefert personenbezogene Arbeitsweise und venturebezogene Angaben
```

Diese Trennung ist im Code bereits weitgehend gelebt und **bleibt richtig**.
Die Prüfung gegen den Ist-Zustand ergibt drei Korrekturen:

**Erstens: ALIGN ist kein Lieferant, sondern zwei.** Die Master-Arbeitsfassung
trennt ausdrücklich in zwei Instrumente mit verschiedener Gültigkeit:
`founder-profile-v1` ist *portabel* (gilt für die Person), `venture-alignment-v1`
gilt für *ein Vorhaben und einen Zeitraum*. In der Architektur sind das zwei
verschiedene Dinge, nicht ein Bereich:

```
ALIGN/Arbeitsprofil  → Personendatum   → Über dich · Das bist du · FIND-Themen
ALIGN/Vorhaben       → Venturedatum    → nur Vorhaben, nie Personenansicht
```

**Zweitens: FIND und CONNECT sind keine reinen Projektionen.** Sie tragen je
ein Dutzend Felder, die es beim anderen nicht gibt (Verfügbarkeit, Commitment,
Venture-Phase gegen Formate, Reichweite, öffentliche Sichtbarkeit). Nur die
*Identität* ist Projektion. Der Satz muss also lauten: **Identität ist
Projektion, Kontextangaben sind eigen.**

**Drittens: „Das bist du" ist nicht die vollständigste Ansicht.** Das ist heute
die Advisor-Ansicht. Solange das so ist, stimmt die Architektur nicht mit sich
selbst überein.

### 2.2 Eine kanonische Quelle je Information

Das Ziel:

```
Erfassung / Interview
      ↓
kanonisches Datenmodell           ← genau eine Tabelle je Information
      ↓
Das bist du                       ← liest, rechnet ab, speichert nichts
      ↓
FIND-/CONNECT-Projektion          ← liest, kopiert nur, was veröffentlicht wird
```

Der Ist-Zustand weicht an **einer** Stelle davon ab, und zwar an der
wichtigsten: der Identität (§1, Zeile 1). Alles andere ist bereits kanonisch —
Capability, Stärken, Richtung, Ressourcen, Antworten haben je genau eine
Tabelle.

| Information | kanonisch in | Kopien heute | Ziel |
|---|---|---|---|
| Name, Headline, Bio, Region, Remote, Expertise, Branchen | `person_core` | `profiles`, `network_profiles`, `founder_discovery_profiles` | Kopie bleibt (sie ist die veröffentlichte Fassung), aber **einseitig**: Kern → Kontext. Rück-Trigger weg. |
| Produktrollen | `profiles.roles` | — | bleibt |
| Fähigkeiten, Stufe, Verantwortungswunsch | `person_capability_entries` | — | bleibt |
| Belege | `person_capability_evidence` | — | bleibt |
| Stärken | `person_strengths` | — | bleibt |
| Richtung | `direction_statements` | — | bleibt |
| Ressourcen | `person_resources` | — | bleibt |
| Arbeitsweise | `alignment_answers` (`founder-profile-v1`) | `discovery_theme_*` ist **Ableitung**, keine Kopie | bleibt |
| Vorhaben | `alignment_answers` mit `venture_id` | — | bleibt |
| FIND-Kontext | `founder_discovery_profiles` | — | bleibt |
| Connect-Kontext | `network_profiles` | — | bleibt |
| FIND-Suchkriterien | `founder_search_preferences`, `discovery_*_preferences` | — | bleibt, privat |

**Warum die Identitätskopie in den Kontextzeilen bleiben soll**, statt sie per
Join aufzulösen: Sie ist die *veröffentlichte* Fassung. Ein Connect-Profil, das
seine Bio zur Lesezeit aus `person_core` holt, ändert sich in dem Moment, in dem
jemand privat etwas ändert — ohne die Entscheidung, das zu veröffentlichen. Die
Kopie ist genau das, was zwischen „geändert" und „veröffentlicht" steht. Sie
darf nur nicht zurückschreiben.

### 2.3 Wo die vier Seiten im Menü stehen

| | heute | Ziel |
|---|---|---|
| Über dich (`/profile`) | obere Hilfsleiste + Kontomenü | **Align → Über dich** (Hilfsleiste bleibt als zweiter Weg) |
| Das bist du (`/me/profile`) | Align → „Gesamtbild" | **Align → Das bist du**, direkt daneben |
| Arbeitsweise (`/founder-alignment/profil`) | Align → „Neue Fassung (Test)" | Kapitel innerhalb von „Über dich"; der eigene Menüeintrag kann entfallen |
| FIND-Profil | Find → Dein FIND-Profil | bleibt |
| Connect-Profil | Connect → Dein Profil | bleibt |

Die Align-Unterleiste liest sich dann als Weg: **Über dich · Das bist du ·
Verbindungen · Founder Library.**

---

## 3. Was bereits existiert

Nichts davon muss gebaut werden — es muss gefunden und verdrahtet werden.

| Baustein | Datei | wofür |
|---|---|---|
| `FounderProfileBase` | `features/reporting/` | Abschnitt 1 |
| `AlignMaps.WorkMap` | `features/instruments/align/` | Abschnitt 2 (Zusammenfassung) |
| `ReportViewV21` | `features/instruments/v21/` | Abschnitt 2 (Detail) |
| `getScopeReport` | `features/instruments/align/reportData.ts` | Abschnitt 2 (Daten) |
| `getAdvisorAlignViews` | `features/instruments/align/advisorView.ts` | Vorlage: genau diese Zusammenstellung, nur für jemand anderen |
| `FounderProfileStrengths` | `features/reporting/` | Abschnitt 3 |
| `CoverageMap`, `founderProfileCoverage.ts` | `features/reporting/` | Abschnitte 4 und 6 |
| `capabilityReadout.ts` | `features/capability/` | Abschnitte 5, 6, **7** (`growingInto`) |
| `FounderProfileCapability` | `features/reporting/` | Abschnitte 4/5 (Detail) |
| `ResourceProposalSection` | `features/ai/` | Abschnitt 8 |
| `FounderProfileDirection` | `features/reporting/` | Abschnitt 9 |
| `InstrumentNote` | `features/reporting/` | Abschnitt 10 |
| `OpenDetailsForPrint`, `PrintReportButton`, Druck-CSS | `features/reporting/`, `globals.css:610` | Druck |
| `ProfilePillar`, `ProfileDetails` | `features/reporting/` | Gliederung |
| `getIdentityGaps` | `features/profile/identityReadiness.ts` | Status Kapitel 1, Empty State Abschnitt 1 |
| `getUnsortedInterviewAnswers`, `InterviewSummaryView` | `features/capability/` | Status Kapitel 3, Payoff |
| alle neun Erfassungsoberflächen | siehe Über-dich-Spec §5 | „Über dich" |

**Der wichtigste Einzelbefund:** `/advisor/person/[userId]` setzt bereits
zusammen, was „Das bist du" zeigen soll — Basis, Arbeitsweise (alt und neu),
Capability, Stärken, Richtung. Die Zusammenstellung existiert; sie steht nur in
der falschen Ansicht.

---

## 4. Was nur umverdrahtet werden muss

| # | Was | Aufwand | hängt ab von |
|---|---|---|---|
| 4.1 | `/me/profile` Säule 2: `getLatestSelfAlignmentReport` ersetzen durch `getScopeReport(userId, "founder_profile")` + `WorkMap` + `ReportViewV21` | mittel | — |
| 4.2 | Der Empty State dort zeigt auf `/founder-alignment/profil` statt `/me/base` | klein | 4.1 |
| 4.3 | v1-Bericht als zugeklappter, datierter Altbestand darunter | klein | 4.1, Entscheidung §7.2 |
| 4.4 | Abschnitt 7 („Wohin du wachsen willst") aus `capabilityReadout.growingInto` herauslösen | klein | — |
| 4.5 | Abschnitt 8 (Ressourcen, nur `confirmed`) auf `/me/profile` | klein | — |
| 4.6 | Vier Säulen → drei Teile, zehn Abschnitte | mittel | 4.1, 4.4, 4.5 |
| 4.7 | Navigation: „Über dich" und „Das bist du" nebeneinander unter Align | klein | Entscheidung §7.4 |
| 4.8 | Kapitelübersicht „Über dich" — die einzige wirklich neue Seite, die aber nur liest und verlinkt | mittel | — |
| 4.9 | Ressourcen-Pflege nach „Über dich", Bestätigung bleibt auch in Connect | klein | Entscheidung §7.3 |
| 4.10 | `origin` anzeigen bei Stärken und Ressourcen (bei Richtung existiert es) | klein | — |
| 4.11 | „Stand vom" im Kopf: jüngstes `updated_at` über die beteiligten Zeilen | klein | — |

---

## 5. Was neu gebaut werden muss

| # | Was | Aufwand | Anmerkung |
|---|---|---|---|
| 5.1 | Druckroute `/me/profile/print?mode=kurz\|lang` | mittel | zwei Umfänge, serverseitig entschieden |
| 5.2 | Der Dialog „Altbestand mitnehmen? Belege mitnehmen?" vor dem ausführlichen PDF | klein | beides standardmäßig aus |
| 5.3 | Statusableitung je Kapitel für „Über dich" | klein | reine Leselogik, sechs von neun Kapiteln haben ein Signal in den Daten |
| 5.4 | „Für jetzt fertig" für die drei Kapitel ohne ableitbares Ende | klein | braucht `person_section_marks`, §6.1 |
| 5.5 | Payoff-Rahmen am Kapitelende | klein | die neun Payoffs selbst existieren alle |
| 5.6 | Sichtbarkeitszeilen je Abschnitt (`no-print`) | klein | Text, keine Logik |

**Was ausdrücklich nicht gebaut wird:** keine Textebene, die aus dem
ALIGN-Arbeitsprofil Prosa erzeugt. Die Registratur sagt `overallScore: false`,
`dimensionScores: false`, und der Bogen trägt `status = 'draft'`. Eine
Deutungsebene darüber wäre genau das, was die Master-Arbeitsfassung §8.1
untersagt. `WorkMap` plus Antworten ist die ehrliche Darstellung, und sie
existiert.

---

## 6. Migrationen

Vier, davon zwei optional.

### 6.1 `person_section_marks` (neu)

```sql
create table public.person_section_marks (
  user_id   uuid        not null references auth.users(id) on delete cascade,
  section   text        not null,
  marked_at timestamptz not null default now(),
  primary key (user_id, section)
);
alter table public.person_section_marks enable row level security;
create policy person_section_marks_own on public.person_section_marks
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Trägt einen Zeitpunkt, keinen Status. Begründung: Über-dich-Spec §3.2.

### 6.2 Die Rück-Trigger entfernen

`sync_person_core_from_connect_profile`, `sync_person_core_from_discovery_profile`,
`sync_person_core_from_profiles` samt ihrer Trigger.

Sie sind ein Überbleibsel aus der Zeit, als die Kontextformulare eigene
Identitätsfelder hatten. Heute schreibt keines mehr Identität — und der
Connect-Trigger kürzt dabei die kanonische Bio (Bestandsaufnahme §4.2,
nachgemessen).

Vorher zu prüfen: ob eine Stelle außerhalb der Formulare Identität in eine
Kontextzeile schreibt (Import, Seed, Edge Function). Ein pgTAP-Fall hält
danach fest, dass ein Schreibvorgang in `network_profiles` den Kern **nicht**
mehr verändert.

**Alternative, falls die Trigger bleiben sollen:** Connects Bio-Grenze von 800
auf 1200 heben. Behebt den gemessenen Verlust, lässt aber die
Zwei-Richtungs-Architektur stehen — also die Möglichkeit, dass irgendein
späteres Feld denselben Fehler wieder macht.

### 6.3 Optional: `profiles.headline` aufgeben

Wird vom Propagationstrigger gepflegt und von keiner Leseseite gebraucht;
`person_core.headline` trägt dieselbe Aussage. Erst `profiles.headline` aus
der Propagation nehmen, in einer späteren Migration die Spalte.

### 6.4 Optional: `focus_skill` und `intention`

Erst entscheiden (§7.5), dann migrieren. Bei „Ende": `isCoreProfileComplete`
auf `person_core` umstellen, dann die Spalten. Die Weiche entscheidet heute,
wer den Onboarding-Block sieht — sie zu ändern, ändert das Routing für
Bestandsnutzer.

**Keine Migration** brauchen: `/me/profile` umstellen, die Druckroute, die
Kapitelübersicht, die Statusableitung, `origin` anzeigen, „Stand vom", die
Navigation.

---

## 7. Reihenfolge

Sortiert nach: was ohne Entscheidung geht, und was den größten Schaden behebt.

**Schritt 1 — die Bio-Kürzung** (6.2). Datenverlust, gemessen, betrifft
Bestandsnutzer bei jedem Connect-Speichern. Geht ohne Produktentscheidung, wenn
die kleine Variante gewählt wird (Grenze auf 1200); die saubere Variante
braucht die Prüfung auf andere Schreibwege.

**Schritt 2 — `/me/profile` auf `founder-profile-v1` umstellen** (4.1, 4.2,
4.4, 4.5). Danach hat ein heute neu angelegtes Konto zum ersten Mal ein
Gesamtbild, das nicht an seiner Kernstelle leer ist. Braucht keine Migration
und keine Entscheidung. **Das ist der Schritt, der den Nutzen freischaltet.**

**Schritt 3 — die Gliederung** (4.6, 4.10, 4.11, 5.6). Drei Teile, zehn
Abschnitte, Herkunft im Detail, Stand im Kopf.

**Schritt 4 — die Kapitelübersicht „Über dich"** (4.8, 5.3, 5.5) plus
Navigation (4.7). Ab hier ist der geführte Aufbau da; alles darunter existiert
schon.

**Schritt 5 — die beiden PDFs** (5.1, 5.2). Braucht die Gliederung aus
Schritt 3, sonst wird der Umfang zweimal definiert.

**Schritt 6 — „Für jetzt fertig"** (5.4, 6.1) und die Ressourcen-Umhängung
(4.9). Beide brauchen eine Entscheidung.

**Später, unabhängig:** `profiles.headline` (6.3), `focus_skill`/`intention`
(6.4), der Datenexport (§8).

---

## 8. Was dieser Plan mitschleppt, ohne es zu lösen

| Befund | Warum hier | Vorschlag |
|---|---|---|
| Der Datenexport deckt 16 von ~20 personenbezogenen Tabellen ab; es fehlen Stärken, Richtung, Ressourcen, ALIGN-Antworten, Belege, FIND-Themen | Datenübertragbarkeit; jede neue Personendatenart vergrößert die Lücke | eigener kleiner Schritt: Tabellen in `EXPORTED_TABLES` ergänzen, Hinweistext anpassen |
| `person_resources` hat keine Advisor-Freigabe | Abschnitt 8 steht im PDF, aber nicht in der Advisor-Ansicht | entscheiden (§12.4 der v0.2-Spec) |
| `person_capability_evidence` hat gar keine Freigabefunktion | blockiert „optional Belege im PDF" | entscheiden (§12.3 der v0.2-Spec) |
| `CURRENT_INSTRUMENT_ID = 'founder-compatibility-v1'`, `instruments.status` sagt `active` für v1 und `draft` für das neue | Code und Wirklichkeit sagen Verschiedenes; solange `draft` steht, muss jede Anzeige „Testfassung" tragen | Produktentscheidung über den Status des neuen Bogens |
| Die ALIGN-Seiten tragen fest verdrahtete deutsche Texte statt `next-intl` | die englische Fassung fehlt dort; „Das bist du" wird diese Bausteine übernehmen | beim Umstellen in Schritt 2 mit erledigen |
| Fünf Rollen-Vokabulare (`profiles.roles`, `network_roles`, FIND-Rollen, `ownership_wish`, Faltin-`sourcing`) | keins ist falsch, keine zwei sind deckungsgleich — im Profil stehen drei davon nebeneinander | benennen, nicht zusammenlegen; die v0.2-Spec trennt sie über Abschnittsnamen |

---

## 9. Die Entscheidungen, die vor der Umsetzung fallen müssen

**9.1 Wird die Zwei-Richtungs-Synchronisation aufgelöst?**
Die kleine Variante (Bio-Grenze auf 1200) behebt den gemessenen Verlust in
einer Zeile. Die saubere (Rück-Trigger weg) macht `person_core` zu dem, was
alle Dokumente seit dem 07.09.2026 behaupten. Empfehlung: klein sofort, sauber
in Schritt 1 direkt danach.

**9.2 Bleibt der v1-Bericht auf „Das bist du"?**
Zugeklappt und datiert darunter (Vorschlag), oder nur noch auf `/me/report`.
Betrifft nur Bestandsnutzer — aber alle von ihnen.

**9.3 Wohin gehören die Ressourcen?**
Pflege nach „Über dich" und Vorschlagsbestätigung zusätzlich in Connect
(Vorschlag), oder alles bleibt in Connect.

**9.4 Wer sieht „Über dich"?**
Wenn beide Seiten unter Align rücken, verliert Connect-only den Zugang zu
`/profile`. Entweder der Eintrag bleibt zusätzlich in der Hilfsleiste, oder
Connect-only bekommt einen eigenen Weg.

**9.5 Was passiert mit `focus_skill` und `intention`?**
Sichtbarer Ort in Kapitel 1, oder Weiche auf `person_core` umstellen und
Spalten aufgeben. Blockiert 6.4, sonst nichts.

**9.6 Wie heißen die beiden Seiten?**
„Das bist du" ist heute die Connect-Eigenansicht (`connect.json:773`). Zwei
Seiten mit demselben Namen sind eine zu viel.
