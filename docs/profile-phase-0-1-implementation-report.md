# Profilarchitektur Phase 0 und 1 — Umsetzungsbericht

**Stand 30.09.2026.** Umgesetzt wurden Phase 0A (Bio-Datenverlust und
Identitätsrichtung), Phase 0B (Benennung und Erreichbarkeit) und Phase 1
(`/me/profile` auf `founder-profile-v1`), einschließlich 1B, 1C und 1D.

Grundlage: `docs/das-bist-du-bestandsaufnahme-v2.md`,
`docs/profile-architecture-gap-plan.md`.

---

## 1. Geänderte Dateien

### Datenbank

| Datei | Art |
|---|---|
| `supabase/migrations/20261092120000_person_core_is_the_source.sql` | **neu** — Bio-Grenze, zwei Rück-Trigger entfernt, dritter verkleinert |
| `supabase/tests/person_core_sync_v01.sql` | neu geschrieben — hielt den alten Vertrag fest |
| `supabase/tests/person_core_propagation_v01.sql` | zwei Zusagen umgedreht |

### Anwendung

| Datei | Art |
|---|---|
| `web/src/app/me/profile/page.tsx` | Säule 2 auf `founder-profile-v1`, Altbestand darunter, zwei kleine Abschnitte ergänzt |
| `web/src/features/connect/connectTypes.ts` | `CONNECT_BIO_MAX = 1200` |
| `web/src/features/connect/connectValidation.ts` | benutzt die Konstante statt `800` |
| `web/src/features/navigation/ProductShell.tsx` | „Das bist du" im Kontomenü und im Mobilmenü |

### Texte (beide Sprachen)

`capability.json` · `navigation.json` · `profile.json` · `connect.json` ·
`dashboard.json`

### Tests

| Datei | Art |
|---|---|
| `web/src/features/connect/__tests__/bioGrenze.test.ts` | **neu** |
| `web/src/features/navigation/__tests__/persoenlicheSeiten.test.ts` | **neu** |
| `web/src/features/reporting/__tests__/founderProfile.test.ts` | vier neue Fälle, drei nachgezogen |
| `web/src/features/instruments/v21/__tests__/pilotPagesSayWhatTheyAre.test.ts` | `/me/profile` in die Erlaubnisliste, mit Begründung |

---

## 2. Wie der Bio-Datenverlust behoben wurde

Der gemessene Fall aus der Bestandsaufnahme:

```
person_core.bio  1000 Zeichen
Connect-Profil speichern
person_core.bio   800 Zeichen
```

Zwei Ursachen griffen ineinander, und **beide** mussten weg.

**Erstens: Connect kappte auf 800.** Nicht nur im TypeScript, sondern auch in
der Datenbank — die Bedingung `network_profiles_text_check` aus
`20260903180000` trug `char_length(bio) <= 800`. Die TS-Grenze allein zu
heben hätte das Speichern mit einem Constraint-Verstoß abgewiesen statt
gekürzt: aus stillem Verlust wäre ein lauter Fehler geworden.

Jetzt tragen alle drei Stellen dieselbe Zahl:

| Ort | vorher | jetzt |
|---|---|---|
| `person_core_bio_len` | 1200 | 1200 |
| `founder_discovery_profiles_bio_length_check` | 1200 | 1200 |
| `network_profiles_text_check` | **800** | **1200** |
| `connectValidation.ts` | **800** | `CONNECT_BIO_MAX` = 1200 |

**Zweitens: der Rückweg.** Auch mit gleicher Grenze bliebe die Architektur,
in der eine Kontextzeile die private Identität ändern kann. Siehe §3.

**Was nicht geändert werden musste:** Das Eingabefeld auf `/profile` stand
schon auf `maxLength={1200}`, `personCoreActions.ts` auf `parseText(…, 1200)`,
und einen Zeichenzähler gibt es nirgends. Die `800` in `ConnectListingForm`
und `VENTURE_WHAT_MAX` gehören zu Einträgen und Unternehmen — eine andere
Sache, unverändert. Kein Test nahm 800 als Bio-Grenze an.

---

## 3. Wurden die Rück-Trigger entfernt?

**Zwei von drei: ja. Der dritte: nein, und zwar begründet.**

### Der Audit

Geprüft wurden alle Schreibwege auf `network_profiles`,
`founder_discovery_profiles` und `profiles`: Server Actions, Seeds, Edge
Functions (`_shared`, `complete-session`, `create-session`, `get-session`,
`save-progress`), Datenbankfunktionen, Route Handler und Tests.

| Tabelle | Schreibweg | schreibt Identität eigenständig? |
|---|---|---|
| `network_profiles` | `connectActions.ts:87` | **nein** — `parseConnectProfile(formData, identity)` nimmt sie aus `person_core` |
| `network_profiles` | `prepare_suggestion_notifications` | nein — nur `suggestions_checked_at` |
| `network_profiles` | alles übrige | nur lesend (`postAuthRedirect`, Foto-Route, Suggestion-, People-, Highlight-Daten) |
| `founder_discovery_profiles` | `upsertOwnDiscoveryProfile` | **nein** — `parseDiscoveryProfileFormData(formData, identity)` nimmt sie aus `person_core`; `publishDiscoveryProfileAction` reicht die vorhandene Zeile unverändert durch |
| `founder_discovery_profiles` | alles übrige | nur lesend |
| Edge Functions | — | fassen keine dieser Tabellen an |

Ergebnis: **Connect und FIND brauchen den Rückweg nicht.** Beide Trigger sind
samt Funktion entfernt.

### Warum `sync_person_core_from_profiles` bleibt

`profiles.display_name` hat **fünf** Schreibwege, die nicht über den Kern
laufen:

| Stelle | Anlass |
|---|---|
| `features/profile/actions.ts` → `saveProfileBasicsAction` | der Einstieg (`ProfileBasicsForm`) |
| `app/(product)/dashboard/actions.ts` → `updateDisplayNameAction` | Namensänderung im Dashboard |
| `features/questionnaire/actions.ts` → `saveDisplayName` | Fragebogen A |
| `features/questionnaire/actionsB.ts` → `saveDisplayNameB` | Fragebogen B |
| `scripts/dev-seed.ts` | Entwicklungsdaten |

Ohne den Trigger hätte jemand nach dem Einstieg einen Namen in `profiles` und
keinen in `person_core` — und der Kern ist das, was `/me/profile`, FIND und
Connect anzeigen. Das wäre ein neuer Fehler anstelle des behobenen.

Der Trigger wurde aber **verkleinert**: Er trägt jetzt nur noch
`display_name`, nicht mehr zusätzlich `headline`. Die Headline hat auf
`profiles` keinen eigenständigen Schreibweg — `saveProfileBasicsAction` reicht
den vorhandenen Wert unverändert durch, sonst schreibt dort nur die
Propagation aus dem Kern.

### Was vor der sauberen Entfernung migriert werden müsste

1. **`saveProfileBasicsAction`** schreibt `display_name` zusätzlich nach
   `person_core` (die Zeile existiert für jedes Konto — Trigger
   `ensure_person_core_for_user`).
2. Dasselbe für **`updateDisplayNameAction`**, **`saveDisplayName`**,
   **`saveDisplayNameB`** und **`dev-seed.ts`**.
3. Danach: `drop trigger sync_person_core_after_profiles_write` und
   `drop function sync_person_core_from_profiles`.
4. Ein pgTAP-Fall, der festhält, dass ein Schreibvorgang auf `profiles` den
   Kern nicht mehr berührt — das Gegenstück zu den beiden, die es jetzt für
   Connect und FIND gibt.

Schritt 1 und 2 sind je etwa fünf Zeilen, ändern aber den Schreibweg des
Einstiegs. Deshalb nicht in diesem Auftrag, wie besprochen.

### Die Zielarchitektur, wie sie jetzt steht

```
person_core                          ← kanonisch, privat
    ↓ propagate_person_core_to_context_rows
    ├── network_profiles             ← veröffentlichte Kopie
    └── founder_discovery_profiles   ← veröffentlichte Kopie

profiles.display_name ──┐
                        └→ person_core   (übergangsweise, nur der Name)
```

---

## 4. Regressionstests

### Datenbank (`supabase/tests/person_core_sync_v01.sql`, 13 Fälle)

| # | Zusage |
|---|---|
| 1 | Der Name aus dem Einstieg wandert in den Kern *(der verbliebene Weg)* |
| 2 | Eine Headline auf `profiles` erreicht den Kern **nicht** mehr |
| 3 | Ein auf Leerzeichen gesetzter Name überschreibt den Kern nicht |
| 4–5 | Der Kern verteilt weiterhin nach Connect **und** nach FIND |
| 6–8 | Ein Connect-Schreibvorgang ändert Name, Bio und Region im Kern **nicht** |
| 9–10 | Ein FIND-Schreibvorgang ändert Name und Bio im Kern **nicht** |
| 11 | Connect nimmt eine 1200-Zeichen-Bio an |
| 12 | **Nach einem Connect-Schreibvorgang steht die Bio im Kern unverändert** — der gemessene Fall |
| 13 | `anon` kann den Kern weiterhin nicht lesen |

`person_core_propagation_v01.sql`: Zwei Zusagen umgedreht — ein
Connect-Schreibvorgang erreicht den Kern nicht mehr und wandert damit auch
nicht über ihn nach FIND.

### Anwendung

`bioGrenze.test.ts` (4): dieselbe Zahl in Connect, FIND, Kern und
Datenbank · eine 1200-Zeichen-Bio kommt ungekürzt durch `parseConnectProfile`
· die Migration erlaubt 1200 · die Migration entfernt beide Kontext-Trigger
und trägt die Headline nicht mehr nach.

`persoenlicheSeiten.test.ts` (4): beide Seiten heißen in beiden Sprachen nach
ihrer Aufgabe und Menü und Seitentitel sagen dasselbe · „Das bist du" ist
nicht mehr der Name der Connect-Karte · beide Seiten hängen an demselben
Zugang wie `/profile` und nicht an `hasFounder` · der Align-Eintrag bleibt.

`founderProfile.test.ts` (4 neu): die Arbeitsweise kommt aus `getScopeReport`
mit `WorkMap` und `ReportViewV21` · keine Punktzahl und keine Deutung, plus
der Selbstauskunfts-Hinweis in beiden Sprachen · der Altbestand steht
darunter, datiert, zugeklappt, und wird nicht in dieselbe Darstellung gereicht
· `growingInto` eigenständig und ohne Leerzustand, Ressourcen nur `confirmed`.

### Nachgezogen, nicht abgeschwächt

| Test | warum |
|---|---|
| `founderProfile.test.ts` „eine fehlende Saeule" | prüfte `href="/me/base"`. Jetzt: `href="/founder-alignment/profil"` **und** `/me/base` darf nicht mehr vorkommen |
| `founderProfile.test.ts` „die eigene Bereichsliste" | `indexOf("<ProfileDetails")` fand seit Säule 2 den falschen Aufklapper; sucht jetzt den um `<FounderProfileCapability` |
| `ownReportReachable.test.ts` | verlangt, dass Menü und Dashboard-Held denselben Namen tragen — `dashboard.hero.heroOwnProfile` mit umbenannt |
| `pilotPagesSayWhatTheyAre.test.ts` | die Erlaubnisliste ist genau dafür da, dass man beim Eintragen kurz überlegt. `/me/profile` steht jetzt darin, mit Begründung |

---

## 5. Wo „Über dich" und „Das bist du" erreichbar sind

| Weg | „Über dich" (`/profile`) | „Das bist du" (`/me/profile`) |
|---|---|---|
| Obere Hilfsleiste (Desktop) | ja, wie bisher | nein |
| Kontomenü (Desktop) | ja, wie bisher | **neu** |
| Mobilmenü | ja, wie bisher | **neu** |
| Align-Unterleiste | nein | ja, wie bisher (nur `hasFounder`) |
| Dashboard | ja | ja |
| Von `/profile` aus | — | ja („Das bist du" ansehen) |

**Kein Navigationsumbau.** Das Kontomenü ist der bestehende globale
Personenbereich — dort stand `/profile` schon. `/me/profile` steht jetzt
daneben, mit derselben Bedingung (`!accountOnly` beziehungsweise
`!isSuspendedConnectOnly`), also für jeden, der heute `/profile` erreicht.
Niemand verliert einen Zugang: Die Align-Unterleiste bleibt unverändert.

Nachgemessen: `/me/profile` antwortet auch für ein Konto **ohne**
Founder-Rolle mit 200 (`advisor@cofoundery.local`). Die Seite ist am Routen-
Level nie founder-gated gewesen — nur ihr einziger Menüeintrag war es.

### Empfohlener finaler Ort

Ein eigener globaler Bereich „Du" neben Align, Find und Connect. Dafür wäre
`ProductShell` umzubauen (die Bereichsleiste kennt heute drei feste Bereiche
mit je einer Unterleiste), und das ist ein eigener Schritt. Bis dahin ist das
Kontomenü der richtige Ort: Es ist bereits der Platz für alles Persönliche.

### Die Umbenennungen

| Stelle | vorher | jetzt (de / en) |
|---|---|---|
| `/profile` Seitentitel | „Dein Profil" | **Über dich** / About you |
| `/profile` Augenbraue | „Profil" | Dein Profil / Your profile |
| `/me/profile` Augenbraue | „Founderprofil" | **Das bist du** / This is you |
| Menü `profile`, `editProfile` | „Profil" | Über dich / About you |
| Menü `alignOwnProfile` | „Gesamtbild" | Das bist du / This is you |
| Dashboard `hero.heroOwnProfile` | „Gesamtbild" | Das bist du / This is you |
| `/profile` → Link | „Gesamtbild ansehen" | „Das bist du" ansehen |
| `/me/profile` Übersicht | „Dein Gesamtbild in vier Teilen" | Das bist du — in vier Teilen |
| Connect-Karte `highlight.yours` | „Das bist du" | **Von dir** / Yours |

**Eine Abweichung, bewusst:** Die Connect-Karte sollte laut Auftrag „Dein
CONNECT-Profil" heißen. Das Abzeichen sitzt aber auf drei Kartenarten —
Profil, Unternehmen und Eintrag (`highlight.kinds`) — und wäre bei zweien
davon schlicht falsch. „Von dir" stimmt für alle drei und gibt den Namen „Das
bist du" frei, worum es ging. Die Connect-Eigenansicht selbst heißt
unverändert „Dein Connect-Profil" (`connect.profile.title`) — sie hieß nie
anders, die Kollision saß nur an dieser Karte.

---

## 6. Wie `founder-profile-v1` geladen wird

```
/me/profile
  └── getScopeReport(user.id, "founder_profile")     ← features/instruments/align/reportData.ts
        ├── assessments      instrument_id = founder-profile-v1, neuester
        ├── alignment_answers  block_id, value, missing_code, marked_for_discussion
        └── readAll(…)       mit readableItems + registryOf aus der eigenen Registratur
```

**Dieselbe Funktion wie in der Advisor-Ansicht.** Keine zweite Auswertung
daneben — das wäre ein zweiter Ort, an dem etwas anderes stehen kann.
`.catch(() => null)` daneben: Ein Fehler beim Laden dieser Säule darf nicht die
ganze Seite kosten.

Angezeigt wird:

| Ebene | Baustein | Inhalt |
|---|---|---|
| Zusammenfassung | `AlignMaps.WorkMap` | ein Punkt je Antwort auf einer Achse, gruppiert nach Abschnitt. Kein Mittelwert, keine Zahl |
| darunter | Text | „{answered} von {of} Fragen beantwortet" |
| Hinweis | Text | „Selbstauskunft, kein Testergebnis. Zu dieser Fassung gibt es noch keine Auswertung — was hier steht, sind die Antworten selbst. Keine Punktzahl und keine Einordnung." |
| Detail (zugeklappt) | `ReportViewV21` | die Antworten, nach Abschnitt, mit `orphans` und `marked` |

Nachgemessen am laufenden Server: `dev@cofoundery.local` sieht „9 von 16
Fragen beantwortet", den Hinweis und die Karte; die Säule gilt als ausgefüllt.

**Leerzustand (Phase 1B).** Ohne Antworten:

> Du hast dein Founder-Arbeitsprofil noch nicht ausgefüllt.
> Sechzehn Fragen dazu, wie du entscheidest, erprobst und Unterschiede
> ansprichst. Keine Punktzahl — am Ende stehen deine Antworten, und die kannst
> du jederzeit ändern.
> **[ Wie du arbeitest starten ]** → `/founder-alignment/profil`

`/me/base` kommt auf der Seite nicht mehr vor; ein Test hält das fest.

---

## 7. Der v1-Altbestand

Erscheint **nur**, wenn `getLatestSelfAlignmentReport` etwas liefert — also
nur bei Menschen, die den früheren Bogen tatsächlich abgegeben haben. Dann:

- **unterhalb** des neuen Arbeitsprofils, nie darüber (ein Test prüft die
  Reihenfolge im Quelltext),
- in einem zugeklappten `ProfileDetails` mit der Zusammenfassung
  „Deine frühere Auswertung — Stand: TT.MM.JJJJ",
- mit einem Satz darin, warum sie getrennt steht: „Sie misst etwas anderes als
  das Arbeitsprofil darüber und wird damit nicht verrechnet — zwei Fassungen,
  zwei getrennte Aussagen.",
- darin unverändert `SelfReportView` mit `density="summary"`.

**Nicht verrechnet:** keine gemeinsame Skala, keine gemeinsame `WorkMap`, keine
Zuordnung der sechs v1-Dimensionen auf die fünf ALIGN-Abschnitte. Zwei Tests
prüfen, dass nichts aus `report` in die `WorkMap` gereicht wird.

Das v1-Werteprofil bleibt, wo es ist: Teil von `SelfReportView`, also innerhalb
des Altbestand-Blocks. Nicht neu konzipiert.

Nachgemessen: `carla@cofoundery.local` zeigt genau diesen Zustand — den
Leerzustand für den neuen Bogen und darunter „Deine frühere Auswertung —
Stand: 30.09.2026".

---

## 8. `growingInto` und Ressourcen

### Wohin du wachsen willst

Abgeleitet aus `capabilityReadout.growingInto` — Wunsch `grow_into`, oder `own`
bei einer Stufe unter vier. **Kein neues Konstrukt, kein Speicher.**

Ein eigener Kasten in Säule 3, unterhalb der Auswertung. Damit er nicht doppelt
steht, wird er aus der `CapabilityReadoutSection` **auf dieser Seite**
herausgefiltert; auf `/profile` bleibt die Auswertung vollständig — dort wird
gepflegt, nicht gezeigt.

Dazu der Satz „Das ist eine Absicht und keine Lücke." und **kein Leerzustand**:
Wer nichts hat, sieht den Abschnitt nicht. Ein „hier könnte stehen, woran du
arbeitest" wäre die Aufforderung, sich etwas vorzuwerfen.

Nachgemessen: bei `dev` sichtbar, bei `ben` und `carla` entfällt der Abschnitt.

### Was du sonst mitbringst

`person_resources` mit `status = 'confirmed'`, gruppiert nach `network`,
`access`, `offer`. Kein Leerzustand, keine Pflegeoberfläche, keine
Advisor-Freigabe — wie vorgegeben.

**Nur Bestätigtes.** Nachgemessen: Ein `pending`-Vorschlag, direkt in die
lokale Datenbank geschrieben, erscheint nicht; zwei bestätigte erscheinen
gruppiert. Testdaten anschließend wieder gelöscht.

---

## 9. Bewusst nicht umgesetzt

Alles aus der Ausschlussliste des Auftrags: kein Guided Profile Builder, keine
Kapitelübersicht, kein `person_section_marks`, keine Drei-Teile-/Zehn-
Abschnitte-UI, keine PDF-Modi, keine Print-Route, keine Textebene aus den
ALIGN-Antworten, keine Belege, keine Advisor-Ressourcenfreigabe, keine neuen
Scores, keine Typologie, kein Redesign, kein Umbau von `focus_skill` /
`intention`, kein Umbau des Datenexports, keine Änderung am Capability-Modell
oder am FIND-Matching.

Dazu drei Dinge, die im Auftrag nicht ausgeschlossen waren und die ich
trotzdem gelassen habe:

| Nicht getan | Warum |
|---|---|
| `sync_person_core_from_profiles` entfernen | fünf legitime Schreibwege hängen daran, §3 |
| Die fünf `display_name`-Schreibwege auf den Kern umstellen | wäre die Voraussetzung dafür — ändert aber den Schreibweg des Einstiegs und gehört in einen eigenen Schritt |
| Die vier Säulen in drei Teile umbauen | ausdrücklich ausgeschlossen. `growingInto` und Ressourcen stehen deshalb in Säule 3 statt in eigenen Abschnitten |

---

## 10. Offene technische Risiken

**1. Der Rückweg über `profiles` besteht weiter.** Solange
`sync_person_core_from_profiles` läuft, kann ein Schreibvorgang auf `profiles`
den Namen im Kern überschreiben. Für den Namen ist das gewollt; die
Architektur ist damit aber nicht vollständig einseitig. §3 nennt die vier
Schritte.

**2. `WorkMap` und `ReportViewV21` tragen fest verdrahtete deutsche Texte.**
„Auf einen Blick", „Deine Antworten nebeneinander …" stehen im Quelltext statt
in `messages/`. `/me/profile` ist eine lokalisierte Seite — in der englischen
Fassung stehen diese Absätze jetzt auf Deutsch. Das galt schon für die
Advisor-Ansicht; durch die Umstellung betrifft es nun auch die eigene Seite.
Kein Fehler, aber sichtbar.

**3. Der Altbestand wird mitgedruckt.** `OpenDetailsForPrint` öffnet beim
Drucken alle `ProfileDetails` — also auch die frühere Auswertung. Das ist die
bestehende Druckregel und war so gewollt, solange es nur einen Modus gibt.
Sobald es Kurz- und Langfassung gibt, gehört der Altbestand laut
`das-bist-du-ux-daten-spec-v0.2.md` §10.1 nur auf Wahl in die Langfassung.

**4. `founder-profile-v1` trägt weiter `status = 'draft'`, und
`CURRENT_INSTRUMENT_ID` ist weiter `founder-compatibility-v1`.** Der Hinweis
auf der Seite sagt das ehrlich. Der Widerspruch zwischen Code und Wirklichkeit
bleibt aber bestehen und ist eine Produktentscheidung.

**5. Bestehende Bios über 800 Zeichen sind nicht wiederherstellbar.** Was vor
dieser Migration gekürzt wurde, ist weg — es gibt keine Historie der
`person_core`-Zeilen. Die Migration verhindert weitere Verluste, sie repariert
keine früheren.

**6. Die neuen Menüeinträge sind server-seitig nicht im HTML.** Kontomenü und
Mobilmenü rendern ihren Inhalt erst beim Öffnen (`{isOpen ? … : null}`). Ein
Test auf der Quelltextebene hält sie fest; ein Ausfall wäre erst im Browser
sichtbar.

---

## 11. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2487 Tests · next build · 1292 DB-Tests
                     alles grün
```

Dazu ein angemeldeter Durchgang gegen einen eigenen Entwicklungsserver
(Port 3001, Sitzungs-Cookie selbst gebaut), mit vier Konten:

| Geprüft | Ergebnis |
|---|---|
| `/me/profile` als `dev` | 200, „Das bist du", `WorkMap`, „9 von 16 Fragen beantwortet", Hinweis |
| `/me/profile` als `carla` | 200, Leerzustand mit Link auf `/founder-alignment/profil`, darunter „Deine frühere Auswertung — Stand: 30.09.2026" |
| `/me/profile` als `advisor` (kein Founder) | 200 |
| `/profile` als `dev` | 200, „Über dich", Link „Das bist du" ansehen |
| Ressourcen | zwei bestätigte erscheinen gruppiert, ein `pending` erscheint nicht |
| `growingInto` | bei `dev` sichtbar, bei den anderen entfällt der Abschnitt |
| Serverprotokoll | keine Fehler |
