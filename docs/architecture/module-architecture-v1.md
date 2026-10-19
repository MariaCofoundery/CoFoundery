# Made2Found Module Architecture v1.0

Status: freigegeben am 19.10.2026. Umgesetzt sind Phase A (Registry, Typen, Validatoren), Phase B (read-only Adapter) und Phase C (UX-Unterbau für Vertiefungskarten); alle weiteren Phasen stehen in Abschnitt 15.

Made2Found ist keine Persönlichkeitstest-Plattform. Das Produkt macht sichtbar, wie Founder arbeiten, was sie können, welche Stärken sie zeigen, wie sie gründen wollen, wo Erwartungen zusammenpassen, wo Unterschiede bestehen und was gemeinsam geklärt werden sollte.

**Leitprinzip:** *Alignment* erfasst Erwartungen und Perspektiven. *Vertiefung* hilft, sich besser zu verstehen. *Setup* hält konkrete gemeinsame Regeln fest.

**Produktregeln, die dieser Vertrag nirgends aufweicht:**
Keine Founder-Typen, keine Scores, keine Match-Prozente, keine Ampeln, keine Rankings, keine Defizitbewertungen. Unterschiede sind Informationen und Gesprächsanlässe. Personenbezogene und vorhabenbezogene Aussagen werden nicht vermischt.

---

## 1. Scope-Modell

| Scope | Frage | Subjekt im Bestand |
|---|---|---|
| `person` | Wie arbeite und handle ich? | `user_id` |
| `person_in_venture` | Wie möchte ich *dieses* Vorhaben aufbauen? | `user_id` + `founder_teams.id` (heute `assessments.venture_id`) |
| `team` | Wie erleben wir unser Zusammenspiel? | Runde eines `founder_teams` mit Roster |

- Jedes Modul hat genau einen Scope.
- **Founder Setup ist kein Scope und kein Modul**, sondern die eigene Vereinbarungsebene.
- **Ein Vergleich ist kein Scope**, sondern eine Ansicht über Ergebnisse mehrerer Personen.
- **Ein Paar ist kein Subjekttyp für neue Module.** Neue kollektive Funktionen nutzen `founder_teams` (ein Paar ist ein Team aus zwei). Bestehende `relationships`-Systeme (Commitment-Lab, Venture-Paarvergleich) bleiben Legacy.
- **Identity und Ressourcen sind Profilinfrastruktur**, keine Assessment-Module (`person_core`, `person_resources`).
- Ein Wechsel zwischen Scopes geschieht nur als sichtbarer, allowlisted Handoff oder als ausdrücklicher Übernahmevorschlag. Nie still.

## 2. Taxonomie

| Achse | Werte |
|---|---|
| Scope | `person` · `person_in_venture` · `team` |
| Tier | `core` · `deepening` |
| Cadence | `once` · `revisable` · `recurring` |
| Usage | `product` · `research_only` |
| Input-Methode | `questionnaire` · `interview` · `manual` · `rounds` |
| Storage | `assessments` · `structured` · `rounds` · `existing` |

- „Interview" ist eine Input-Methode, kein Modultyp. „Research" ist `usage = research_only`, kein Tier.
- **Team-Check-in** ist der Produktname eines Moduls mit `scope = team`, `tier = deepening`, `cadence = recurring`, `input.method = rounds`. Er ist kein eigener Taxonomiewert; jedes Modul hat genau einen Tier.
- Founder Setup ist kein Modul.
- **Input-Methode ≠ Storage.** `method` sagt, *wie erhoben wird*; `storage` sagt, *wo und mit welchem Lebenszyklus gespeichert wird*. Ein Fragebogen kann strukturiert gespeichert werden, ein Interview kann in `assessments` münden.

**`storage` und `sharing.bindsTo` sind zwei getrennte Fragen:**

- `storage` beschreibt den **tatsächlichen Antwortspeicher und Lebenszyklus**.
- `sharing.bindsTo` beschreibt den **Freigabevertrag**.

| `storage` | Bedeutung |
|---|---|
| `assessments` | Antworten in `assessments` + `alignment_answers` mit Entwurf → Abgabe; verlangt eine Instrument-ID. |
| `structured` | eigene Tabellen eines neuen Moduls (noch kein Fall). |
| `rounds` | Roster-gebundene Runden (Team-Check-in). |
| `existing` | bestehendes System mit eigenem Speicher (Strengths, Capability, Direction). |

**Bindung und Marker:**

- **Native Module** mit `storage = assessments` teilen an den Durchlauf: `bindsTo = assessment`.
- **Bestehende Adapter** tragen den expliziten Marker `legacyAdapter: true`. Sie dürfen auch bei `storage = assessments` ihren eigenen Vertrag behalten: `bindsTo = existing_contract`. Der Marker verhindert, dass der Vertrag aus dem Storage geraten wird; er ist kein Freibrief für andere Bindungen.
- `storage = rounds` → `bindsTo = round`, `storage = existing` → `bindsTo = existing_contract` bleiben unverändert.
- Ein bestehender Adapter macht einen Assessment-Speicher nicht zu `existing`: Workstyle und Venture Alignment v1 liegen in `assessments` und teilen nach ihren bestehenden Verträgen (`team_shares`, Sichtbarkeit mit der Abgabe).

## 3. Modullandkarte

| Scope | Tier | Modul | Status |
|---|---|---|---|
| person | core | **Workstyle**, **Strengths**, **Capability**, **Direction / Antrieb** | bestehend, per Adapter registriert |
| person | deepening | **Zusammenarbeit & Feedback** | Phase G |
| person | deepening | **Unter Druck** | später; fachpsychologisches Review vor dem Produktivbau |
| person_in_venture | core | **Venture-Core**: Zielbild · Ziele/Prioritäten · Rolle/Zeithorizont · Zeit/Commitment (inkl. R09) · Geld/Risiko · Tempo · Qualitätsanspruch · wenige Entscheidungsanker · mindestens ein Kommunikationsanker | heute `venture-alignment-v1` (Adapter); v2 in Phase F |
| person_in_venture | deepening | **Werte & Zielkonflikte** | Pilot, Phase D |
| person_in_venture | deepening | **Grenzen** | nach dem Piloten |
| person_in_venture | deepening | *Zusammenarbeit im Alltag* | nur falls nach dem Piloten nötig |
| team | deepening | **Team-Check-in** (`recurring`, `rounds`), keine Personenwerte | Phase H, erst nach Pretest |
| — | — | **Founder Setup** (Vereinbarungsebene) | bestehend |

**Vorerst nicht bauen:** Entscheiden unter Unsicherheit, Lernen & Anpassen, Konfliktstil, Vertrauen, Rollenklärung als eigenes Assessment. **Führung & Verantwortung** bleibt als mögliche spätere Produktidee dokumentiert, steht aber nicht in der aktiven Roadmap.

## 4. Module Contract

**A) Technische Metadaten.** Sie stehen in der Code-Registry (`web/src/features/modules/`) und werden per Test und beim Laden validiert, nicht in der DB.

```ts
type ModuleDefinition = {
  moduleId: string;                        // stabil, nie wiederverwendet
  legacyAdapter?: true;                    // bestehendes System hinter einem Adapter; nie bei nativen Modulen
  deepens?: string;                        // genau ein primärer Core-Anker einer Vertiefung (Pflicht außer im Team-Scope)
  scope: "person" | "person_in_venture" | "team";
  tier: "core" | "deepening";
  cadence: "once" | "revisable" | "recurring";
  usage: "product" | "research_only";
  input: {
    method: "questionnaire" | "interview" | "manual" | "rounds";
    additionalMethods?: InputMethod[];     // weitere Wege zum selben Ergebnis (z. B. Interview + manuell)
    storage: "assessments" | "structured" | "rounds" | "existing";
    writesTo: string;
  };
  versions: {
    versionId: string;                     // immer Pflicht
    instrumentId?: string;                 // Pflicht genau bei storage = "assessments"
    compatGroup: string;
    compat?: "intersect";
  }[];
  completion: { source: string };          // verweist auf die Wahrheit des Moduls
  sharing: {
    ceiling: "owner_only" | "statements" | "answers";
    sensitivity: "standard" | "sensitive";
    bindsTo: "assessment" | "round" | "existing_contract";
  };
  compare?: CompareRule[];
  renderers: { profileCard?: string; detail: string; comparison?: string; teamView?: string };
  setupHandoff?: { target: SetupItemKey; when: "always" | "difference" }[];
  i18n: { namespace: string };
};
```

`additionalMethods`, `legacyAdapter` und `deepens` sind die Ergänzungen gegenüber dem ursprünglichen Entwurf (alle bestätigt): Strengths, Capability und Direction entstehen aus Interview *und* manueller Eingabe, ein einzelner Wert hätte eines der beiden verschwiegen; der Marker `legacyAdapter` hält die Ausnahme für bestehende Adapter explizit (Abschnitt 2); `deepens` gibt der Profil-UI ihren Anker aus der Registry, ohne zweite Zuordnung. Die **Singularität ist beabsichtigt**: Auch wenn eine Vertiefung mehrere Themen berührt, bekommt sie im Profil genau einen primären Anker.

**Modul ≠ Instrument.** Strengths, Capability und Direction sind keine Instrument-Module. Sie haben eine `versionId`, aber keine `instrumentId`.

**Validator-Regeln (Contract-Validierung):**

| Regel | Prüfung |
|---|---|
| Identität | `moduleId` eindeutig; `versionId` eindeutig je Modul; eine `instrumentId` gehört höchstens einem Modul |
| Enums | gültiger Scope, Tier, Cadence, Usage, `method`, `storage`, `ceiling`, `sensitivity`, `bindsTo` |
| Input | `method` und `storage` sind getrennte Pflichtfelder; keine Kopplung wird abgeleitet |
| Instrument | `storage = assessments` → jede Version hat eine `instrumentId` (**nicht** abgeleitet aus `method = questionnaire`) |
| Bindung ↔ Storage | `assessments` → `assessment`, **außer** bei `legacyAdapter` (dort `existing_contract`) · `rounds` → `round` · `existing` → `existing_contract` |
| Vertiefungen | `deepens` nur bei `tier = deepening`; **genau ein** primärer Core-Anker (ein einzelner `moduleId`-Text); das Ziel ist ein **registriertes Core-Modul desselben Scopes** und nicht die Vertiefung selbst; Core-Module und Team-Module haben kein `deepens` |
| Marker | `legacyAdapter` nur als `true`; verlangt `bindsTo = existing_contract`; die Instrument-Pflicht bei `assessments` bleibt |
| Team-Module | `scope = team` → `storage = rounds`, `teamView` Pflicht, kein `profileCard` |
| Renderer | `detail` Pflicht; `profileCard` nur bei `person` und `person_in_venture`; `teamView` nur bei `team`; `comparison` nur bei definiertem `compare` |
| Sensitivität | `sensitive` → Obergrenze höchstens `statements` |
| Research | `research_only` → keine Produkt-Renderer, kein `compare`, kein `setupHandoff`, Obergrenze `owner_only` |
| Setup-Handoff | jeder `target` existiert im Setup-Katalog (`FOUNDER_SETUP_ITEM_KEYS`) |
| i18n | je Modul Titel und Zusammenfassung in DE und EN |

**B) Fachliche Dokumentation** liegt unter `docs/modules/<moduleId>.md` (noch nicht angelegt; sie entsteht mit dem jeweiligen Modul). Pflichtfelder: purpose · constructs (nach Verhalten oder Situation benannt) · **what_it_does_not_measure** · target audience · evidence/source basis (`core` / `candidate` / `research`) · result semantics mit erlaubten und verbotenen Formulierungen · comparison rationale · privacy rationale · archival rules · review log.

**C) In die DB gehört nur, was die DB selbst erzwingen muss:** Instrument-ID mit FK, Antworten, Freigaben, Immutability. Eine DB-Spiegelung der Registry (`module_versions`) entsteht erst, wenn ein DB-seitiges Gate sie braucht, voraussichtlich in Phase E.

## 5. Completion Contract

- **Jedes Modul behält seine eigene Source of Truth.** Die Modulschicht liest sie nur über Adapter und persistiert **keine zweite Completion-Wahrheit**.
- `person_section_marks` bleibt dort, wo es heute fachlich passt (Fähigkeiten, Stärken, Ressourcen). Es wird nicht generalisiert.

| Modul | Source of Truth | `done_for_now` | `in_progress` |
|---|---|---|---|
| Workstyle | `assessments.submitted_at` des aktuellen Instruments (DB-RPC setzt es bei vollständigem Core) | abgegeben | Assessment oder Antworten vorhanden |
| Strengths | `person_strengths` + `person_section_marks` (`staerken`) | Markierung gesetzt | Stärken vorhanden |
| Capability | `person_capability_entries` (Bereiche, Stufen, Verantwortungswunsch) + Markierung `faehigkeiten` | Bereiche markiert, alle Einträge mit Stufe und Wunsch | Bereiche oder Stufen vorhanden |
| Direction | Interview-Antworten (`kind = direction`) ≥ `DIRECTION_MIN_ANSWERS` | genug Antworten | Antworten oder Aussagen vorhanden |
| Venture-Core (v1) | `assessments.submitted_at` je Vorhaben und Instrument | abgegeben | Entwurf vorhanden |
| neue Vertiefung | `submitted_at` des eigenen Instruments | abgegeben | Entwurf vorhanden |

- Das Interview der Capability (`gespraech`) ist ein **Erhebungsweg**, kein Teil des Capability-Abschlusses.
- Das Editor-Modell (`aboutYou.ts`) bleibt eine UX-Gruppierung. Dass Stärken ein Schritt der Station „Was du mitbringst" sind, ändert nichts daran, dass Strengths und Capability fachlich getrennte Module sind.
- **Vertiefungen beeinflussen nie die Core-Completion.**
- „**Dein Grundprofil steht**" = alle vier Person-Core-Module sind `done_for_now`. Die Meldung erscheint **einmalig im Moment des Übergangs**, im Flow, der das letzte fehlende Core-Modul abschließt. Sie ist kein dauerhaftes Abzeichen, keine Prozentzahl, kein Balken, kein „x von y" und braucht keinen neuen persistierten Zustand. Für `person_in_venture` gibt es keine solche Meldung.

> **Umsetzungsstand (Phase C):** Vorbereitet ist nur die **Ableitung** (`isGrundprofilComplete`: jedes Person-Core-Modul der Registry ist `done_for_now`, aus den Adapterzuständen, ohne Tabelle). Die Meldung selbst ist noch nicht gebaut und wird **ereignisbasiert** ausgelöst, ohne persistierten Zustand: *vorher* `isGrundprofilComplete = false` → ein Core-Modul wird erfolgreich abgeschlossen → *nachher* `true` ⇒ einmalige Meldung „Dein Grundprofil steht“. Es gibt keinen „schon gezeigt“-State; geht die Meldung durch Abbruch oder Neuladen verloren, ist das hinnehmbar, denn sie ist eine UX-Feier, kein fachlicher Zustand. Angebunden wird sie erst dort, wo ein Core-Modul erfolgreich abgeschlossen wird. Damit sie nicht bei jedem Update zurückkehrt, gilt die Statusregel aus Abschnitt 10 (ein abgeschlossener Stand bleibt gültig). *Bekannte Grenze:* Bei Capability kann der abgeleitete Zustand zurückgehen, wenn ein neuer Bereich ohne Stufe oder Wunsch hinzukommt; beim Anbinden ist zu entscheiden, ob dieser Fall die Meldung auslösen darf.

## 6. Versioning Contract

- **Jede Modulversion hat eine `versionId`.** Bei instrumentbasierten Modulen bedeutet eine fachlich relevante Änderung zusätzlich eine neue `instrumentId`.
- Bei Modulen ohne Instrument (Strengths, Capability, Direction) erhält das Modul eine neue `versionId`, wenn sich die Ergebnissemantik ändert (Vokabular, Facetten, Bedeutung einer Aussage). Prompt- und Modellversionen einer Input-Methode (`prompt_version`) sind **keine** Modulversionen.

| Änderung | Instrument-ID | Alte Ergebnisse | Vergleich alt ↔ neu |
|---|---|---|---|
| reine Textkorrektur ohne Bedeutungsänderung (mit Review-Eintrag) | gleich | unverändert | normal |
| **jede fachlich relevante Änderung** (neues Item, Umformulierung, Skala, Format, Entfernen) | **neu** | lesbar, nie umgeschrieben | nur bei explizit erklärter `compatGroup`; `intersect` = nur gemeinsame unveränderte Items; sonst „Unterschiedliche Fassungen", nie Fallback |

- Ein Re-Assessment ist ein neuer Durchlauf. „Aktuell" ist der zuletzt abgegebene, frühere bleiben im Verlauf.
- **Keine automatische Migration fachlicher Antworten.** Übernahme nur durch ausdrückliche Nutzeraktion (Muster `instrument_transitions`).
- Jede archivierte Fassung behält ihren Reader.
- **Historisch unversionierte Ergebnisse** (Strengths, Capability, Direction) tragen keinen Modul-Versionsstempel. Sie werden **nicht** rückwirkend der aktuellen `versionId` zugeordnet. Der Adapter meldet `completedVersion: "legacy_unversioned"`. Es werden keine historischen Daten umgeschrieben, auch nicht, um einen Stempel nachzutragen. Vergleiche mit `legacy_unversioned` sind nur erlaubt, wenn der Adapter die Kompatibilität ausdrücklich garantiert; sonst zählen sie als nicht vergleichbar.
- **Venture Alignment:** Ändert sich der Core inhaltlich, entsteht `venture-alignment-v2`. v1 bleibt lesbar und wird nicht rückwirkend geändert.
- Teamvergleich: Version und Kompatibilität werden je Mitglied geprüft. Bei Verstoß ist der Vergleich für alle gleichermaßen „nicht verfügbar".

## 7. Sharing Contract

1. **Grundablauf für neue Module:** privat → abgeben → optional ausdrücklich freigeben.
2. **Bindung (`bindsTo`):**

   | Wert | Gilt für | Bedeutung |
   |---|---|---|
   | `assessment` | Vertiefungen, `venture-alignment-v2` | Freigabe gilt für den konkreten Durchlauf; neuer Durchlauf = neue Freigabe |
   | `round` | Team-Check-ins | Freigabe und Sichtbarkeit gelten für die konkrete Runde |
   | `existing_contract` | Bestandsmodule | z. B. `team_shares`, Capability-Disclosure, Advisor-Grants, Sichtbarkeit von Venture-v1-Antworten; unverändert |

3. **`venture-alignment-v2`: Abgeben ≠ Freigeben.** Abgeben schließt die eigenen Antworten ab. Eine separate, ausdrückliche Freigabe macht sie für den gemeinsamen Vergleich sichtbar. v1 bleibt Legacy: Dort werden Antworten mit dem Abgeben für die aktuellen Teammitglieder sichtbar.
4. **Gemeinsamer Vergleich optionaler Module** erst, wenn alle relevanten Mitglieder abgeschlossen haben, die Versionen kompatibel sind und alle erforderlichen Freigaben vorliegen. Alle oder keiner, für alle derselbe Bericht, nie asymmetrisch.
5. **Widerruf** durch ein Mitglied macht den gemeinsamen Bericht für alle unverfügbar. Ein Roster-Wechsel bewertet neu.
6. **Statusanzeige bei optionalen Vertiefungen:** Die eigene Lage ist sichtbar („Du hast abgeschlossen und freigegeben"). Für andere steht nur „Für den gemeinsamen Vergleich fehlen noch Voraussetzungen", **ohne Namen**. Bei Core-Modulen bleibt die heutige Anzeige pro Person bestehen.
7. **Ausnahme Team-Check-in.** Es gibt keinen separaten Freigabe-Klick nach dem Abgeben. Die Einwilligung liegt am Anfang der Runde:

   ```
   Runde einladen / starten
   → ausdrückliche Reveal-Einwilligung:
     „Wenn alle Teilnehmenden abgegeben haben, werden die Antworten dieser Runde
      für alle Teilnehmenden sichtbar."
   → Antworten bleiben verborgen
   → alle erforderlichen Teilnehmenden geben ab
   → gleichzeitiges Aufdecken für alle
   ```

   Ausdrückliche Zustimmung, Symmetrie, kein asymmetrischer Bericht, niemand sieht Antworten vor dem vollständigen Aufdecken. Ohne Reveal-Einwilligung keine Teilnahme. Bindung: `round`. Keine Anonymitätsbehauptung bei kleinen Teams.
8. **Advisor:** eigener Scope je Modul, Standard keiner. Sensible Module sind nie Teil eines Team-Review-Bündels.
9. **FIND und CONNECT** erhalten nichts ohne modulspezifische Einwilligung.

**Sensible Module:**

| | Unter Druck | Grenzen |
|---|---|---|
| Sensitivität | `sensitive` | `sensitive`, private first |
| Teilbar | höchstens bestätigte Aussagen | höchstens bestätigte Aussagen |
| Im Teamvergleich | keine Rohantworten | keine Rohtexte ungefragt in Reports |
| Inhaltliche Grenzen | keine klinische Diagnostik, kein Resilienzwert, keine Symptomskalen; nur kommunizierbare Bedürfnisse und Muster | „nicht geteilt" klar getrennt von „nicht beantwortet" |
| Vor Produktivbau | fachpsychologisches Review | — |

## 8. Comparison Contract

**Methode (rechnerisch):** `none` · `equality` · `ordinal_distance` · `set_overlap` · `numeric_range` · `crosscheck` · `path_and_weights`

**Stance (semantisch):** `neutral_difference` · `complementary_welcome` · `needs_clarification` · `conversation_only`

Methode und Stance bleiben getrennt. Jede Regel definiert: was verglichen wird und **was nicht**; wann ein Unterschied relevant ist (die Schwelle wird deklariert, nie global berechnet); wann er neutral oder komplementär ist; welche Formulierungen erlaubt sind (aus der geprüften Gesprächsbibliothek mit Verbotsliste; eine KI ergänzt keine Gründe). Fehlende Antworten, `withheld` und „kein Vergleichsgrund" bleiben getrennt und lösen keinen Vergleich aus. **Kein Score, keine Ampel, kein globales Compatibility-Ergebnis.**

| Beispiel | method | stance |
|---|---|---|
| Entscheidungsspielraum (U01) | ordinal_distance | complementary_welcome |
| Stunden R02 ↔ R01 | crosscheck | needs_clarification |
| Ziel-Prioritäten (S01_top) | set_overlap | neutral_difference |
| Informationszeitpunkt (K03, neu) | ordinal_distance | needs_clarification |
| Beträge (B01, R05) | none, nebeneinander | neutral_difference |
| 12-Monats-Ziel, Grenzen | none | conversation_only |
| Wertefälle | path_and_weights | conversation_only |

Die fünf Bestandsmodule deklarieren noch keinen Compare-Contract. Ihre heutigen Vergleichsansichten bleiben unverändert und werden erst mit Phase E und F vertraglich beschrieben.

## 9. Input-Methoden-Abgrenzung

| Modul | method (+ weitere) | storage | Instrument |
|---|---|---|---|
| Workstyle | questionnaire | assessments (`legacyAdapter`, Freigabe `existing_contract`) | `founder-workstyle-pretest-8-5a-v3` |
| Strengths | interview (+ manual) | existing | nein |
| Capability | interview (+ manual) | existing | nein |
| Direction | interview (+ manual) | existing | nein |
| Venture-Core v1 | questionnaire | assessments (`legacyAdapter`, Freigabe `existing_contract`) | `venture-alignment-v1` |
| Venture-Core v2, Vertiefungen | questionnaire | assessments (nativ, Freigabe `assessment`) | ja |
| Team-Check-in | rounds | rounds | nein (eigene Runden-Version) |

- Ein Interview ist ein Erhebungsweg, nicht das Modul. Strengths und Capability sind Module, die mehrere Eingabewege haben.
- **Pipeline:** Antworten → Vorschläge → **Bestätigung durch die Person**. Modellausgaben schreiben nie Ergebnisse.
- **Kein generisches Interview-Framework aus Prinzip.** Die bestehenden Interviews bleiben. Abstrahiert wird erst, wenn ein weiterer echter Use Case zeigt, was wirklich gemeinsam ist.
- **Capability-Provenance:** Capability-Evidenz bekommt in der Architektur nachvollziehbare Herkunft (`origin`), analog zu Strengths und Direction. Die Migration folgt in einer späteren Runde.
- **Research** folgt dem Workstyle-Vorbild: eigene Einwilligung und Version, eigener Fortschritt, nie Core-Completion blockierend, nicht still in Reports, FIND oder Advisor-Ansichten. Ein Research-Item wird nur über eine neue Version Produkt.

## 10. Adapter Architecture

```ts
interface ModuleAdapter {
  describe(): ModuleDefinition;
  status(user, context): {
    state: "not_started" | "in_progress" | "done_for_now";
    completedVersion: string | "legacy_unversioned" | null;
  };
  profileTeaser(user, context): { href: string; hasContent: boolean; lines?: string[]; counts?: Record<string, number> } | null;
  shareState(user, context): ModuleShareState;
}
```

- `lines` ist ein optionaler **View Contract** für abgeschlossene Vertiefungen: Die Profil-UI zeigt höchstens zwei kurze Zeilen, alles Weitere gehört in die Detailansicht. Dafür gibt es keine zusätzliche Result- oder Summary-Abstraktion.
- Adapter sind **read-only** und verändern keine bestehende Logik. Jede Source of Truth bleibt dort, wo sie heute ist; es gibt keine neue Completion-Tabelle und keine neue DB-Abstraktion.
- **Ein abgeschlossener Stand bleibt gültig.** Ein gültig abgeschlossenes Core-Modul verliert `done_for_now` nicht dadurch, dass später ein Update- oder Re-Assessment-Entwurf beginnt (Workstyle: je abgegeben; Venture: je Vorhaben abgegeben). Ein neuer Entwurf ist eine Aktualisierung, nicht wieder „unvollständig“. `completedVersion` ist die Version der neuesten **abgegebenen** Zeile. *Abweichung vom Produkt:* Profil (`aboutYou`) und Teamseite (`loadTeamJourneyStatus`) lesen nur die neueste Zeile und zeigen nach Abgabe plus neuem Entwurf wieder „begonnen“. Beide bleiben unverändert; die Abweichung ist im Parity-Test festgehalten.
- `completedVersion` ist nur bei `done_for_now` gesetzt (Version des *abgeschlossenen* Ergebnisses). Ergebnisse ohne gespeicherten Stempel ergeben `legacy_unversioned`; sie werden nie auf die aktuelle `versionId` gemappt.
- **Parity-Tests** prüfen die Adapter gegen die heutige Produktlogik (`buildAboutYou`, `loadTeamJourneyStatus`, `workstyleSetupHandoff`, `deepDiveLinks`, `parseTeamReadiness`).
- Bestehende Listen (Stationen, `/me/profile`-Sections, `PAGE_STEPS`) bleiben zunächst. Ein Ersatz kommt später und schrittweise.
- Founder Setup bekommt keinen Modul-Adapter, nur den Katalog als Handoff-Ziel.
- Neue Module erfüllen den Contract nativ.

| Adapter | Source of Truth | Freigabevertrag (`shareState`) |
|---|---|---|
| Workstyle | `assessments.submitted_at`, aktuelles Instrument | `team_shares` (Teamfreigabe je Team) |
| Strengths | `person_strengths`, `person_section_marks` | keiner auf Modulebene |
| Capability | `person_capability_entries`, `person_section_marks` | `capability_disclosure` |
| Direction | Interview-Antworten `kind = direction`, `direction_statements` | keiner auf Modulebene |
| Venture-Core v1 | `assessments` je Vorhaben und Instrument | sichtbar mit der Abgabe (v1-Legacy) |

## 11. Profile UX

```
Das bist du
 Kurzprofil
 Teil I   Wer du bist: Über dich · Wie du arbeitest  └ Vertiefen: Zusammenarbeit & Feedback
                      · Deine Stärken
 Teil II  Was du mitbringst
 Teil III Was dich antreibt
 So willst du gründen                                └ Vertiefen: Werte & Zielkonflikte · Grenzen (privat)
 Details & Methodik
```

- **Vertiefungen hängen an dem Kernbereich, den sie vertiefen.** Es gibt keine gemeinsame Sammelsektion, die Person- und Vorhaben-Scope mischen würde.
- **Umsetzung (Phase C):** `ProfileDeepenings` unter „Wie du arbeitest“ (Anker `workstyle`) und „So willst du gründen“ (Anker `venture_core`). Titel, Zusammenfassung und Ziel kommen aus der Registry, der Zustand aus dem Adapter. Solange keine Vertiefung registriert ist, entsteht weder Markup noch eine Abfrage; das ist der Schalter.
- **Karte in drei Zuständen:** *Angebot* (gestrichelt, nie als Lücke), *begonnen*, *abgeschlossen* mit ein bis zwei Aussagen oder einer Mikrovisualisierung. Das Detail liegt hinter einem Klick.
- Höchstens drei Karten gleichzeitig, der Rest unter „Weitere Vertiefungen"; dazu eine kleine Übersichtsseite.
- **Kein neuer Menüpunkt**, die Profil-Navigation ist per Test festgelegt. Vertiefungen werden standardmäßig nicht gedruckt.
- „Dein Grundprofil steht" einmalig im Moment des Übergangs (Abschnitt 5). Vertiefungen sind Angebote, keine Lücken; sie beeinflussen nie die Core-Completion.
- **Begriffe:** Grundprofil (Sammelbegriff, kein Stationsname) / Core profile · Vertiefung / Deepening · Team-Check-in / Team check-in.
- **Designbudget für Vertiefungen:** kein starres Limit; Faustregel meist 6–10 gute Items, ein situationsbasiertes Modul darf aus vier starken Situationen bestehen. Qualität vor Umfang.

## 12. Team UX

| Block | Inhalt |
|---|---|
| Verstehen | Core-Vergleich (Workstyle, Rollen/Capability) · Vorhaben (Venture-Core) |
| Gemeinsam vertiefen | *aus euren Profilen* (Vergleiche optionaler Vertiefungen) · *gemeinsame Übungen* (bestehende Paar-Labs) |
| Check-in | später |
| Vereinbaren | Founder Setup |

- Jede Vertiefung zeigt **eine Statuszeile** („Bereit zum Vergleich" oder „Für den gemeinsamen Vergleich fehlen noch Voraussetzungen") und die **nächste eigene Handlung**.
- Es erscheinen nur Vertiefungen, die du begonnen hast oder deren Vergleich bereit ist. Angebote stehen im Profil.
- Keine Teilberichte, keine Namen fehlender Personen bei optionalen Vertiefungen.

**Team-Check-in (Phase H):** eine Familie mit **zwei getrennten Bereichen**, nie zu einem Konstrukt oder Wert verschmolzen:

- **A „Sprechen & Sicherheit":** Zweifel äußern, Fehler ansprechen, widersprechen, um Hilfe bitten.
- **B „Reflektieren & Anpassen":** Zusammenarbeit überprüfen, Annahmen hinterfragen, Arbeitsweise anpassen, Learnings gemeinsam nutzen.

Kein Gesamtwert. Reveal-Modell (Abschnitt 7.7). Das Team startet die Runde (kein Zeitgeber), sie ist Roster-gebunden, hat keinen Profil-Anhang und ist für Advisor standardmäßig nicht sichtbar. Formulierung: „So erlebt ihr gerade …", nie ein Personenwert. Dargestellt über `teamView`.

## 13. Auswirkungen auf Venture Alignment

**Richtung: Der Core wird deutlich kürzer als heute (42 Items).** Eine feste Zahl ist nicht festgelegt.

| Thema | Zuordnung | Items heute (v1) |
|---|---|---|
| Zielbild, Ziele/Prioritäten | Core | S01a–f, S01_top, S03, S04 (+ neues Zielbild-Item in v2) |
| Rolle / Zeithorizont | Core | S06, S02 (+ optionales Horizont-Item in v2) |
| Zeit / Commitment | Core | R01, R02, R04, R05, R06, **R09** |
| Geld / Risiko | Core | B01, B04, B05 |
| Tempo, Qualitätsanspruch | Core | neu in v2 |
| Entscheidungsanker | Core, wenige | U01 (mit U04 zusammengeführt), U03, G01, G05 |
| **Kommunikationsanker** | **Core** | **K03 überarbeitet** |
| Zielkonflikte | Vertiefung (Pilot) | W03–W06 |
| Grenzen | Vertiefung, `sensitive` | L01 (L02 als optionales Feld integriert) |
| Zusammenarbeit im Alltag | ggf. Vertiefung | U05, K01, K04 |
| **R03** (regelmäßige Zeiten) | **Founder Setup** | Logistik; Handoff zu `time_commitment` / `communication` |
| **G04** (Wege bei Patt), L03 | **Founder Setup** | agreement-nah; Handoff zu `conflict_deadlock` |
| R12 (Überprüfungstermin) | Founder Setup | Vereinbarung |
| R10 | streichen | Deckeneffekt; Commitment ist konkret erfasst |
| W01 / W02 | nicht übernehmen | W01 ist eine Kommunikationsnorm (Setup), W02 ein Mitarbeitenden-Fall in der Frühphase |

**R09** bleibt im Venture-Core unter Commitment: persönliche Perspektive auf das konkrete Vorhaben, keine Vereinbarung, kein eigenes Vertiefungsmodul sinnvoll. Handoff: `changing_commitment`.

**Kommunikationsanker K03 (Entwurf für v2):**

- DE: „Wann möchtest du von einer wichtigen Veränderung in einem anderen Verantwortungsbereich erfahren?"
- EN: “When would you like to hear about an important change in another area of responsibility?”
- Format: Stufen von früh nach spät (während der Prüfung · sobald eine Richtung wahrscheinlich ist · wenn entschieden · erst wenn sie meinen Bereich betrifft) plus „hängt von der Art der Veränderung ab".
- Vergleich: `ordinal_distance` + `needs_clarification`. Handoff: `communication`.

**Konsequenzen:**

- Alle inhaltlichen Core-Änderungen erfolgen in `venture-alignment-v2`; v1 und seine Antworten bleiben lesbar.
- **v2: Abgeben ≠ Freigeben** (Abschnitt 7.3).
- Fehlende Setup-Handoffs (Beteiligung, Vergütung, Ausscheiden, Rollen) werden im Contract pro Item deklariert.

**Separat zu behandeln (Hotfix-Liste, nicht Teil dieser Architekturarbeit):** L01-Gesprächskarte feuert nie · L02 verliert im Vergleich den L01-Bezug · `ziele_teils_gleich` hängt an der stillgelegten S01 · der Team-Bericht vergleicht exakt · `instruments.status` ist nicht wahrheitsgemäß.

## 14. Pilotmodul: Werte & Zielkonflikte

| | |
|---|---|
| Scope / Tier / Cadence | `person_in_venture` · `deepening` · `revisable` |
| Inhalt | W03–W06: Wirkung ↔ Überschuss, abstimmen ↔ starten, Reserve ↔ Markttest, gleich ↔ beitragsbezogen verteilen |
| Instrument | eigenes, z. B. `venture-tradeoffs-v1`, mit eigenem Assessment-Lebenszyklus (`storage = assessments`) |
| Input / Format | questionnaire · bestehendes `value_case` |
| Vergleich | `path_and_weights` · `conversation_only`; bestehender Vergleichscode |
| Sharing | `bindsTo = assessment`; gemeinsamer Vergleich nach Abschnitt 7.4 |
| Setup-Handoff | `conflict_deadlock`; W06 → `equity` / `compensation` |

**Was der Pilot beweist:** Trennung von Core und Vertiefung, eigener Lebenszyklus (nötig, weil abgegebene Assessments unveränderlich sind), Versionierung, Completion, Sharing und Vergleich.

**Legacy:** Die W03–W06-Antworten in `venture-alignment-v1` bleiben **historische Antworten**. Eine Übernahme ins neue Modul gibt es **nur als ausdrücklichen Opt-in**: ein vorbefüllter Entwurf, den die Person bestätigt und als neuen Durchlauf mit neuer Freigabe abgibt. Keine stille Übernahme.

**Entschieden in Phase D (Variante B):** Der Pilot läuft unter der bestehenden Storage-Familie `assessments.module = 'venture_alignment'` mit eigener `instrument_id = 'venture-tradeoffs-v1'` (kein neuer Enum-Wert). Begründung, Audit und Folgen: [phase-d-storage-decision.md](phase-d-storage-decision.md).

**Stand Phase D (lokal umgesetzt, nicht committet):** additive Migration `20261205130000_venture_tradeoffs_instrument.sql` (Instrument + zwei instrumentgebundene Wächter), eigene Registry W03–W06, natives Modul `venture_tradeoffs` (deepens `venture_core`, `bindsTo = assessment`, kein Vergleichs-Renderer), eigener Flow `/founder-alignment/vorhaben/zielkonflikte`, eigenes Ergebnis nur aus gewählten Wegen und Gewichten. Alte W-Antworten bleiben unverändert; Übernahme nur auf ausdrückliche Aktion (neuer Entwurf, selbst prüfen und abgeben). Der Compare Contract (`path_and_weights`, `conversation_only`) ist beschrieben, aber nicht gebaut; es gibt keine Freigabe – das Modul ist privat (Phase E).

## 15. Roadmap

| Phase | Ziel | DB-Migration | Status |
|---|---|---|---|
| **0** | Architecture v1.0 finalisieren | nein | erledigt |
| **A** | Code-Registry, Typen, Contract-Validatoren für Workstyle, Strengths, Capability, Direction, Venture Alignment | **nein** | umgesetzt |
| **B** | Read-only Adapter für dieselben fünf Systeme, Parity-Tests | **nein** | umgesetzt |
| **C** | Minimaler Profile-UX-Support für Vertiefungskarten; ohne registrierte Vertiefung entsteht keine sichtbare Änderung, kein Datenumbau | nein | umgesetzt |
| **D** | Pilot „Werte & Zielkonflikte" | additiv (Instrument + Wächter) | lokal umgesetzt, nicht committet |
| **E** | Sharing + Teamvergleich optionaler Module; erst hier ggf. `module_versions` | ja, minimal | offen |
| **F** | `venture-alignment-v2`, erst nachdem der Pilot die Architektur bewiesen hat | ja | offen |
| **G** | Zusammenarbeit & Feedback als erster Person-Deepening-Pilot | ja, additiv | offen |
| **H** | Team-Check-ins, erst nach Pretest | ja | offen |

„Unter Druck" kommt danach, nach fachpsychologischem Review.

Rollback je Phase: A/B Ordner entfernen · C Feature-Flag aus · D Instrument archivieren und Karte ausblenden · E RPC abschalten, Vergleich ausblenden · F v1 bleibt aktiv · G wie D · H Klasse ausblenden.

## 16. Verbleibende offene Fragen

| # | Frage | Wann |
|---|---|---|
| 1 | Bekommt `venture-tradeoffs-v1` einen eigenen `assessments.module`-Wert oder läuft es unter einer bestehenden Storage-Familie? | Phase D, nach Repo-Prüfung |
| 2 | Braucht es „Zusammenarbeit im Alltag" nach dem Piloten überhaupt? | nach Phase D |
| 3 | Organisatorische und fachliche Ausgestaltung des Reviews für „Unter Druck" | vor dessen Produktivbau |

Bewusst vertagt, aber nicht offen: die genaue Item-Liste von `venture-alignment-v2` (Phase F) und der Pretest-Aufbau für Team-Check-ins (Phase H).

## 17. Non-Goals

- keine Scores, Indizes, Ampeln, Rankings, Match-Prozente, kein globales Compatibility-Ergebnis
- keine Personeneigenschaften als Ergebnis und keine Teamphänomene als Personenwert
- keine klinische Diagnostik, kein Resilienzwert, keine Symptomskalen
- keine JSONB-Modulplattform und keine Zwangsmigration bestehender Systeme
- keine zweite persistierte Completion-Wahrheit; `person_section_marks` wird nicht generalisiert
- keine DB-Spiegelung der Registry vor einem konkreten DB-Gate
- kein Gesamtfortschritt; Vertiefungen sind Angebote, keine Lücken
- keine Anonymitätsbehauptung bei kleinen Teams
- keine neuen Paar-Module auf `relationships`
- kein stiller Datenfluss zwischen FIND, Venture, Modulen und Setup; keine automatische Übernahme von Antworten in Vereinbarungen
- kein generisches Interview-Framework ohne zweiten echten Use Case
- keine KI, die Modulergebnisse schreibt

**FIND:** gemeinsames Vokabular und Glossar sind erwünscht, aber keine gemeinsame Source of Truth und keine stille Synchronisierung FIND → Venture → Module. Übernahmevorschläge nur per Nutzeraktion mit sichtbarer Quelle („Du hast bei FIND 20 Stunden angegeben. Für dieses Vorhaben übernehmen?").

---

## Architecture Decisions Record

| Entscheidung | Festlegung | Begründung | Konsequenz |
|---|---|---|---|
| Scopes | person · person_in_venture · team | portable, vorhabengebundene und kollektive Aussagen trennen | jedes Modul genau ein Scope |
| Founder Setup | eigene Vereinbarungsebene, kein Modul | Vereinbarung ≠ Selbstauskunft | Module liefern nur Hinweise und Handoffs |
| Vergleich | Ansicht, kein Scope | hat keine eigenen Daten | Comparison Contract statt Vergleichsmodul |
| Paar | kein Subjekttyp für Neues | keine doppelten Modelle | neue kollektive Funktionen über `founder_teams` |
| Taxonomie | Scope · Tier · Cadence · Usage · Input | entmischt die früheren Typbegriffe | Interview, Research und Pulse sind keine Typen |
| Team-Check-in | team · deepening · recurring · rounds | jedes Modul genau ein Tier | Produktname bleibt „Team-Check-in" |
| Identity / Ressourcen | Profilinfrastruktur | kein Assessment | kein Adapter-Status |
| Person-Core | Workstyle, Strengths, Capability, Direction | bestehende Kernmodule | Grundlage für „Grundprofil steht" |
| Vorerst nicht bauen | Entscheiden, Lernen, Führung, Konfliktstil, Vertrauen, Rollenklärung | Redundanz oder Sensitivität | Führung bleibt dokumentierte spätere Idee |
| Modul ≠ Instrument | `versionId` Pflicht, `instrumentId` optional | Strengths, Capability und Direction sind keine Instrument-Module | kein künstliches Instrument |
| Input ≠ Storage | `input.method` und `input.storage` getrennt; `instrumentId` Pflicht genau bei `storage = assessments` | Erhebungsweg bestimmt nicht den Lebenszyklus | Validator prüft auf `storage`, nicht auf `method` |
| Storage und Freigabe | `storage` = tatsächlicher Antwortspeicher, `sharing.bindsTo` = Freigabevertrag; Workstyle und Venture v1: `assessments` mit `existing_contract`; Strengths, Capability, Direction: `existing` mit `existing_contract` | ein bestehender Adapter macht einen Assessment-Speicher nicht zu `existing` | Validator: native `assessments`-Module → `assessment`; bestehende Adapter mit Marker `legacyAdapter` dürfen `existing_contract` behalten |
| Marker `legacyAdapter` | explizit statt aus dem Storage geraten; erlaubt nur `existing_contract`; Instrument-Pflicht bleibt | die Ausnahme soll sichtbar und eng sein | alle fünf Bestandsmodule tragen ihn; native Module nie |
| Mehrere Eingabewege | `additionalMethods` neben `method` | Strengths, Capability und Direction entstehen aus Interview und manuell | Erweiterung des Contract-Typs (neben `legacyAdapter`) |
| Completion | eigene Source of Truth je Modul; Adapter lesen nur | keine zweite Wahrheit | Parity-Tests statt neuer Tabelle |
| Unversionierte Altdaten | Adapter meldet `legacy_unversioned`; kein Rückmapping auf die aktuelle Version | Historie nicht umschreiben | Vergleich nur bei ausdrücklich garantierter Kompatibilität |
| Grundprofil-Meldung | einmalig im Moment des Übergangs | Anerkennung ohne Fortschrittslogik | kein Abzeichen, keine Prozente, kein neuer Zustand |
| Generische DB-Schicht | erst bei konkretem DB-Gate (Phase E) | Overengineering vermeiden | Phasen A–C ohne Migration |
| Vertiefung = eigener Lebenszyklus | eigenes Instrument je Vertiefung mit `storage = assessments` | abgegebene Assessments sind unveränderlich | keine Item-Gruppen in abgegebenen Instrumenten |
| Versionierung | fachliche Änderung = neue `versionId`; bei Instrumenten zusätzlich neue `instrumentId`; Kompatibilität explizit | Historie bleibt wahr | kein Fallback, keine automatische Migration |
| Renderer | `detail` Pflicht; `profileCard`, `comparison`, `teamView` optional und scope-gebunden | Team-Module haben keinen Profil-Anhang | Validator: Team → `teamView`, kein `profileCard` |
| Sharing-Bindung | `assessment` · `round` · `existing_contract`, gekoppelt an `storage` | Vertiefungen, Runden und Bestand abbilden | Validator prüft die Kopplung |
| Abgeben vs. Freigeben | neue Module und `venture-alignment-v2`: Abgeben ≠ Freigeben | privat → abgeben → ausdrücklich freigeben | v1 bleibt Legacy, keine Rückwirkung |
| Team-Check-in-Sharing | Reveal-Einwilligung beim Rundenstart, Aufdecken erst wenn alle abgegeben haben, kein Freigabe-Klick danach | ausdrückliche Zustimmung, Symmetrie, niemand sieht vor dem Aufdecken | ohne Einwilligung keine Teilnahme; Bindung `round` |
| Venture Alignment v2 | Core-Änderung = `venture-alignment-v2` | v1-Antworten bleiben gültig | Fortführung nur mit Bestätigung |
| Venture-Core-Umfang | deutlich kürzer, keine feste Zahl | Qualität vor Umfang | genaue Liste in Phase F |
| Kommunikationsanker | K03 überarbeitet im Core | mindestens ein Anker nötig | übrige K/U-Fragen ggf. Vertiefung |
| R09 | Venture-Core, Commitment | persönliche Perspektive, keine Vereinbarung | Handoff `changing_commitment` |
| R03, G04, L03, R12 | ins Founder Setup | agreement- oder logistiknah | Handoff statt Assessment-Frage |
| Comparison | Methode und Stance getrennt; Regel pro Item | „verschieden" heißt nicht Konflikt | Team-Bericht verliert exakten Vergleich |
| Fehlende Personen | bei Vertiefungen keine Namen | kein sozialer Druck bei Freiwilligem | nur eigene Lage plus Gesamtaussage |
| Sensible Module | Unter Druck und Grenzen: höchstens bestätigte Aussagen teilbar | Schutz vor Rohtext-Weitergabe | Review vor dem Bau von Unter Druck |
| Team-Check-in-Inhalt | zwei getrennte Bereiche, Reveal, keine Anonymitätsbehauptung | kleine Teams sind nicht anonymisierbar | kein Gesamtwert |
| Designbudget | Faustregel 6–10, situativ auch 4 | Qualität vor Umfang | kein starres Limit |
| FIND | gemeinsames Glossar, keine gemeinsame Source of Truth | Suchkontext ≠ Vorhaben | nur Übernahme per Nutzeraktion |
| Vertiefung hängt an einem Core-Modul | `ModuleDefinition.deepens`: genau ein primärer Anker, registriertes Core-Modul desselben Scopes, kein Self-Reference, nur bei `tier = deepening` | die UI braucht den Anker, ohne eine zweite Liste zu führen; Scopes werden nicht gemischt | Validator: `deepens_required`, `deepens_scope`, `deepens_target`; Karten erscheinen nur am passenden Core-Bereich |
| Vertiefungskarten (Phase C) | Zustände `available` · `in_progress` · `completed`; höchstens drei sichtbar, Rest unter „Weitere Vertiefungen“; Angebot gestrichelt und neutral; keine Zahl, kein Fortschritt | Vertiefungen sind Angebote, keine Lücken | ohne registrierte Vertiefung unsichtbar; Karten nur im Bildschirm, nicht im Druck |
| „Dein Grundprofil steht“ | ereignisbasiert über den Übergang `false → true` von `isGrundprofilComplete`; kein persistierter „schon gezeigt“-State; in Phase C nur die Ableitung | UX-Feier, kein fachlicher Zustand; ein verpasster Hinweis ist hinnehmbar | Meldung wird dort angebunden, wo ein Core-Modul erfolgreich abgeschlossen wird |
| Abgeschlossener Stand bleibt gültig | ein gültig abgeschlossenes Core-Modul bleibt `done_for_now`, auch bei neuem Update-Entwurf (Workstyle, Venture) | ein Update ist keine Unvollständigkeit; die Feier kehrt nicht bei jeder Aktualisierung zurück | Adapter weichen in diesem einen Fall von `aboutYou` und Teamseite ab (dokumentiert, getestet) |
| `ModuleTeaser.lines` | optionaler View Contract, höchstens zwei kurze Zeilen | Details gehören in die Detailansicht | keine zusätzliche Result- oder Summary-Abstraktion |
| Interview | kein generisches Framework jetzt | erst ein zweiter echter Use Case | bestehende Interviews bleiben |
| Capability-Provenance | `origin` für Evidenz vorgesehen | nachvollziehbare Herkunft | Migration später |
| Pilot | Werte & Zielkonflikte (W03–W06), person_in_venture, deepening, `storage = assessments` | vorhandener Inhalt, Format und Vergleich; geringe Sensitivität | alte W-Antworten bleiben historisch, Übernahme nur per Opt-in |
| Pilot-Storage | Bestehende Familie `venture_alignment` + eigene `instrument_id` (Variante B) | `module` ist Speicherfamilie; jeder Leser filtert strikt nach Instrument; kein Enum-Eingriff | entschieden in Phase D, siehe phase-d-storage-decision.md |
| Roadmap | 0 → A–H | Architektur erst am Piloten beweisen | v2 erst nach dem Piloten; Unter Druck zuletzt |
