# Profilarchitektur Phase 1.5 — Umsetzungsbericht

**Stand 01.10.2026.** Zwei Dinge: der letzte Rückweg in den Kern ist weg, und
die ALIGN-Bauteile sprechen beide Sprachen.

Grundlage: `docs/profile-phase-0-1-implementation-report.md`. Gelesen wurde im
Code und gegen die lokale Datenbank.

---

## 1. Welche Schreibwege auf `profiles.display_name` gefunden wurden

Gesucht wurde in Server Actions, Seiten, Seeds, Edge Functions,
Datenbankfunktionen und Route Handlern.

| Stelle | Art | seit Phase 0/1 |
|---|---|---|
| `features/profile/actions.ts` → `upsertProfileBasicsAction` (über `upsertProfileBasicsRow`) | Einstieg und Dashboard-Block | unverändert |
| `app/(product)/dashboard/actions.ts` → `updateDisplayNameAction` | Namensänderung | unverändert |
| `features/questionnaire/actions.ts` → `saveDisplayName` | Fragebogen A | unverändert |
| `features/questionnaire/actionsB.ts` → `saveDisplayNameB` | Fragebogen B | unverändert |
| `scripts/dev-seed.ts` → `seedProfile` | Entwicklungsdaten | unverändert |

**Keine neuen Schreibwege** seit Phase 0/1. Zwei Stellen schreiben `profiles`,
aber **nicht** den Namen und bleiben unberührt:

- `app/(product)/dashboard/actions.ts` → `saveProfileOnboardingAction`
  (`focus_skill`, `intention`)
- `features/profile/personCoreActions.ts` → `saveRoles` (`roles`)

In der Datenbank schreibt nur `propagate_person_core_to_context_rows` nach
`profiles`; keine Edge Function fasst die Tabelle an.

**Absichtlich nur `profiles`** schreibt keine der fünf Stellen. Alle fünf
meinten denselben Menschen und denselben Namen.

Nebenbei gefunden: zwei **Lesestellen**, die den Namen aus der Kopie holten,
obwohl sie den kanonischen Wert meinen — `getParticipantA`, `getParticipantB`
und der Einladungsversand im Dashboard. Für Konten ohne `profiles`-Zeile (wer
nur im Netzwerk ist) stand dort nie etwas. Alle drei lesen jetzt `person_core`.

---

## 2. Was umgestellt wurde

Ein gemeinsamer Helfer, `web/src/features/profile/displayNameWrite.ts`:

```ts
writeDisplayNameToCore(client, userId, displayName)
```

Bewusst **keine** `"use server"`-Datei — dort würde jeder Export zur
Serveraktion mit eigener Kennung und Aufrufgrenze. Dieselbe Überlegung wie in
`onboardingCompletion.ts`.

Er trägt zwei Regeln, die aus dem abgelösten Trigger stammen:

- **Leer gilt nicht als Eingabe.** Ein leeres Feld heißt „nicht angegeben",
  nicht „löschen". Ohne diese Regel hätte ein leer abgeschickter Fragebogen den
  Namen überall entfernt — auch dort, wo andere ihn sehen.
- **`count: "exact"`.** Ein `update` ohne passende Zeile ist für PostgREST kein
  Fehler; ohne die Prüfung meldete die Oberfläche „gespeichert", ohne etwas
  geschrieben zu haben.

| Stelle | jetzt |
|---|---|
| `saveDisplayName` (Fragebogen A) | schreibt nur noch den Kern; `getParticipantA` liest ihn |
| `saveDisplayNameB` (Fragebogen B) | dasselbe; `getParticipantB` liest ihn |
| `updateDisplayNameAction` | schreibt nur noch den Kern |
| `upsertProfileBasicsAction` | schreibt weiter `profiles` — **und danach** den Kern |
| `dev-seed.ts` | `seedProfile` trägt keinen Namen mehr; er kommt aus `seedPersonCore` |

**Warum `upsertProfileBasicsAction` `profiles` weiter schreibt:** Sie trägt
Rollen, Avatar, Schwerpunkt und Absicht, und die liegen dort. Den Namen
schreibt sie mit, damit eine frisch angelegte Zeile nicht ohne ihn dasteht —
die Propagation legt keine `profiles`-Zeile an, sie aktualisiert nur eine
vorhandene. **Kanonisch ist trotzdem der Kern**, und der wird *danach*
geschrieben: Erst die Zeile, dann der Kern, dann propagiert er. Es entsteht
keine zweite Wahrheit, weil beide Schreibvorgänge denselben Wert aus demselben
Formular tragen.

**Der Seed läuft denselben Weg.** `seedProfile` (Rollen) steht jetzt **vor**
`seedPersonCore`, damit die Zeile existiert, wenn der Kern propagiert. Ein
Seed, der anders schreibt als das Produkt, prüft das Produkt nicht.

**Für Nutzer:innen ändert sich nichts.** Dieselben Formulare, dieselben
Rückmeldungen. Ein Unterschied bleibt im Fehlerfall: Wer ein aktives
Connect-Profil hat und den Namen auf ein Zeichen kürzt, wird jetzt von
`network_profiles_active_complete_check` abgewiesen (23514) statt still in
`profiles` zu landen. Der Kern ist permissiv, die Veröffentlichung ist streng —
derselbe Grenzfall, den `saveIdentityAction` schon kennt.

---

## 3. Wurde `sync_person_core_from_profiles` entfernt?

**Ja, vollständig.** Migration
`supabase/migrations/20261093120000_identity_flows_one_way.sql`:

```sql
drop trigger if exists sync_person_core_after_profiles_write on public.profiles;
drop function if exists public.sync_person_core_from_profiles();
```

Nachgemessen: Auf `public.profiles` liegt nur noch
`ensure_network_membership_after_profile_role`.

`profiles.display_name` bleibt als Spalte. Sieben Lesestellen benutzen sie
(Advisor-Ansichten, Team-Auswertungen, Dashboard-Rollen, Workbook), und die
Propagation hält sie aktuell. Sie zu entfernen ist ein eigener Schritt.

---

## 4. Die Identitätsrichtung danach

```
person_core                          kanonisch, privat
    |
    +--> profiles                    Rollen, Avatar - und der Name als Kopie
    +--> network_profiles            veroeffentlichte Kopie
    +--> founder_discovery_profiles   veroeffentlichte Kopie
```

**Kein Rückweg mehr.** Ein Schreibvorgang auf eine der drei Tabellen ändert die
private Identität nicht — weder Name, noch Headline, noch Bio, Region,
Remote-Modus, Expertise oder Branchen.

Gegen die laufende Datenbank gemessen:

```
update person_core    set display_name = 'Nora Umbenannt'
  kern      | Nora Umbenannt
  profiles  | Nora Umbenannt        ← propagiert

update profiles       set display_name = 'Direkt in profiles'
  kern_danach | Nora Umbenannt      ← unberührt
```

---

## 5. Welche hart codierten ALIGN-Texte gefunden wurden

Gesucht wurde nach dem Muster (sichtbarer Text mit deutschen Wörtern), nicht
nach den beiden bekannten Sätzen.

### `AlignMaps.tsx` — acht

| Bauteil | Text |
|---|---|
| `WorkMap` | Überschrift „Auf einen Blick" |
| `WorkMap` | Einleitung „Deine Antworten nebeneinander — …" |
| `DifferenceMap` | Überschrift „Wo ihr auseinanderliegt" |
| `DifferenceMap` | Einleitung „Nur die Fragen, die ihr beide beantwortet habt …" |
| `VentureDirection` | Überschrift „Wohin es gehen soll" |
| `VentureDirection` | Einleitung „Sechs Ziele nebeneinander, …" |
| `VentureDirection` | Abzeichen „zuerst" |
| `VentureDirection` | Ausweichwert „noch keine Angabe" |

### `ReportViewV21.tsx` — sechs Texte und zwei Formate

| Stelle | Text |
|---|---|
| Hinweis oben | „Zu {n} Fragen steht unten eine Antwort, die sich auf eine Grenze bezieht …" (mit eigener Pluralbildung im Quelltext) |
| Auslassungsgrund | Abzeichen „offen" |
| Unlesbare Antwort | „Diese Antwort lässt sich nicht lesen. Das ist ein Fehler bei uns — …" |
| `choices` | „Vorrang: {…}" |
| `case` | „Weg: {…}" |
| `perPerson` | „keine feste Erwartung" |
| `money` | `toLocaleString("de-DE")` |
| `date` | `toLocaleDateString("de-DE", …)` |

Die beiden Formate sind keine Texte, aber derselbe Fehler: ein deutsches Datum
in einer englischen Seite. Sie laufen jetzt über `getFormatter()`.

### `mapRows.ts` — keine

Reine Ableitungslogik, kein sichtbarer Text.

### Advisor-Ansicht — vier

Sie benutzt dieselben Bauteile und trug ihre eigenen Sätze fest verdrahtet:
„Antworten aus der neuen Fassung", die Selbstauskunfts-Einschränkung in zwei
leicht verschiedenen Fassungen, und zweimal „Du siehst {n} von {m} Fragen …".

Die beiden Fassungen der Einschränkung sind jetzt **eine** — wortgleich mit der
auf dem eigenen Profil. Ein Test hält das fest.

---

## 6. Welche Message-Dateien erweitert wurden

Nur `messages/<locale>/alignment.json` — der Namespace, der ALIGN schon
gehört. Kein paralleler Übersetzungsbaum.

| Block | Schlüssel |
|---|---|
| `alignment.maps` (neu) | `workTitle`, `workIntro`, `differenceTitle`, `differenceIntro`, `directionTitle`, `directionIntro`, `directionFirst`, `directionNoAnswer` |
| `alignment.report` (erweitert) | `orphans` (mit ICU-Plural), `openBadge`, `unreadable`, `priority`, `path`, `noExpectation` |
| `alignment.advisor` (neu) | `newVersionTitle`, `selfReportNote`, `visible` |

Beide Sprachen vollständig. Die deutschen Formulierungen sind wörtlich
übernommen; die englischen sind frei formuliert, nicht Wort für Wort
übersetzt.

**Nicht dupliziert:** Fragetexte, Abschnittsüberschriften und
Gültigkeitsangaben. Sie kommen aus den Registraturen
(`founder-profile-registry-v1.json`, `venture-alignment-registry-v1.json`) und
sind Inhalt des Instruments, keine Oberfläche. Siehe §10.

Die Einschränkung in beiden Sprachen:

> **de** Selbstauskunft, kein Testergebnis. Zu dieser Fassung gibt es noch
> keine Auswertung — was hier steht, sind die Antworten selbst. Keine
> Punktzahl und keine Einordnung.
>
> **en** Self-report, not a test result. There is no evaluation for this
> version yet — what you see are the answers themselves. No score and no
> classification.

---

## 7. In DE und EN geprüft

Angemeldeter Durchgang gegen einen eigenen Entwicklungsserver (Port 3001,
Sitzungs-Cookie und `cofoundery_locale` selbst gesetzt):

| Seite | Sprache | Ergebnis |
|---|---|---|
| `/me/profile` | de | 200 · „Auf einen Blick / Deine Antworten nebeneinander — …" |
| `/me/profile` | en | 200 · „At a glance / Your answers side by side — …" |
| `/advisor/person/{id}` | de | 200 · „Selbstauskunft, kein Testergebnis. …" |
| `/advisor/person/{id}` | en | 200 · „Self-report, not a test result. …" |
| `/advisor/person/{id}` | en | „You see 9 of 16 questions. What is missing may be withheld or unanswered — …" |

Für die Advisor-Prüfung wurde eine Antwortfreigabe in der lokalen Datenbank
angelegt und danach wieder entfernt.

**Beide Bauteile sind Serverkomponenten** und bleiben es — alle sechs Stellen,
die sie benutzen, sind Seiten. Damit kommen die Texte aus derselben Quelle, und
es gibt keine zweite Übersetzung für die Advisor-Ansicht. Ein Test prüft, dass
niemand `"use client"` hinzufügt.

---

## 8. Tests

### Neu

`web/src/features/profile/__tests__/anzeigenameSchreibweg.test.ts` (7):
alle vier Aktionen schreiben in den Kern · drei davon fassen `profiles` gar
nicht mehr an · der Einstieg schreibt erst die Zeile, dann den Kern · der
Fragebogen liest den Namen auch aus dem Kern · leer löscht nichts und ein
Schreibvorgang ohne Treffer meldet keinen Erfolg · der Seed läuft denselben Weg
und in derselben Reihenfolge · die Migration entfernt Trigger und Funktion.

`web/src/features/instruments/align/__tests__/alignTexteSprechenBeideSprachen.test.ts` (6):
in den Bauteilen steht kein sichtbarer deutscher Text mehr (nach **Muster**,
nicht nach bekannten Sätzen) · Beträge und Daten tragen das Format der
gelesenen Sprache und kein `"de-DE"` · jeder benutzte Schlüssel steht in beiden
Sprachen · die englische Fassung trägt dieselbe Einschränkung · die
Advisor-Ansicht hat keine eigene Übersetzung, und ihr Satz ist wortgleich mit
dem auf dem eigenen Profil · die Bauteile sind Serverkomponenten.

### Geändert

`supabase/tests/person_core_sync_v01.sql` — Abschnitt 1 umgedreht. Er hielt
fest, dass der Name von `profiles` in den Kern wandert; jetzt hält er fest,
dass der Kern ihn nach `profiles` trägt und **nichts** zurückkommt — weder Name
noch Headline. Dazu ein Fall gegen eine Trigger-Schleife: Nach einer direkten
Eingabe in `profiles` überschreibt der Kern sie beim nächsten Schreibvorgang,
und die Updates laufen ohne „stack depth limit exceeded" durch. 14 Fälle.

Alle Zusagen aus der Aufgabe sind abgedeckt: Einstieg, Dashboard, Fragebogen A,
Fragebogen B, Seed, Propagation nach FIND und Connect, kein Rückweg, keine
Schleife.

---

## 9. Bewusst unangetastet

Alles aus der Ausschlussliste: kein Umbau von „Das bist du", keine
Kapitelübersicht, kein Guided Builder, kein `person_section_marks`, keine
PDF-Modi, keine Print-Route, keine Ressourcen-Verschiebung, keine
Advisor-Freigaben, keine neuen Synthesetexte, keine Scores, kein Statuswechsel
für `founder-profile-v1`, kein `CURRENT_INSTRUMENT_ID`, kein `focus_skill` /
`intention`, kein Datenexport, kein FIND-Matching.

Dazu drei Dinge, die nahelagen und trotzdem liegen bleiben:

| Nicht getan | Warum |
|---|---|
| `profiles.display_name` entfernen | sieben Lesestellen benutzen die Spalte; die Propagation hält sie aktuell. Eigener Schritt. |
| Registraturtexte übersetzen | Abschnittsüberschriften („A – Analytische Prüfung") und Gültigkeitsangaben sind Inhalt des Instruments. Sie in die Sprachdateien zu kopieren hieße, sie zu verdoppeln — ausdrücklich ausgeschlossen. |
| Die übrige Advisor-Seite übersetzen | Nur die ALIGN-Abschnitte waren Gegenstand. Was dort sonst steht, läuft bereits über `advisor.personView`. |

---

## 10. Risiken

**1. Registraturtexte bleiben deutsch.** Auf der englischen Fassung stehen die
Abschnittsüberschriften („A – Analytische Prüfung", „S – Ziele & strategische
Richtung") und die Gültigkeitsangabe („Relativ portabel. Gilt fuer die
Person …") weiter auf Deutsch. Dasselbe gilt für alle Fragetexte. Das ist kein
Versäumnis dieses Auftrags — es ist die Entscheidung, Instrumentinhalte nicht
in die Oberflächensprache zu kopieren. Eine englische Fassung der Instrumente
ist ein eigenes Vorhaben mit eigener fachlicher Durchsicht.

**2. Die Bauteile sind jetzt asynchron.** `WorkMap`, `DifferenceMap`,
`VentureDirection` und `ReportViewV21` sind `async`. Wer eines davon künftig in
eine Clientkomponente einbaut, bekommt einen Laufzeitfehler statt einer
Warnung. Ein Test hält `"use client"` fern, aber nicht den Einbau an falscher
Stelle.

**3. Der Grenzfall beim Kürzen des Namens.** Wer ein aktives Connect-Profil hat
und den Namen auf ein Zeichen kürzt, bekommt jetzt eine Abweisung. Vorher
landete der Wert still in `profiles`, und der Trigger ließ ihn fallen. Die
Abweisung ist richtiger, aber sie ist neu — und `updateDisplayNameAction` zeigt
dafür die rohe Datenbankmeldung im Query-Parameter, so wie vorher auch.

**4. `profiles.display_name` kann auseinanderlaufen.** Ein direkter
Schreibvorgang auf die Spalte — per SQL, per Admin-Werkzeug — wird vom Kern
nicht mehr korrigiert, erst beim nächsten Schreibvorgang dort. Das ist der
Preis der Einseitigkeit und besser als die Gegenrichtung, in der eine
Nebentabelle die Identität ändern konnte.

**5. Pluralbildung.** Der Hinweis zu verwaisten Antworten benutzt jetzt
ICU-Plural statt einer Verzweigung im Quelltext. Für `de` und `en` ist das
gleichwertig; für eine Sprache mit mehr Pluralformen trägt die Nachricht
bereits die richtige Form.

---

## 11. Migrationen und Reihenfolge

Zwei Migrationen aus Phase 0/1 und 1.5 sind **noch nicht auf Produktion**:

| # | Migration | Inhalt |
|---|---|---|
| 1 | `20261092120000_person_core_is_the_source.sql` | Bio-Grenze auf 1200, Rückwege aus Connect und FIND weg, `profiles`-Trigger auf `display_name` verkleinert |
| 2 | `20261093120000_identity_flows_one_way.sql` | letzter Rückweg weg |

**Die Reihenfolge ist zwingend, und beide bauen aufeinander auf.** Migration 2
entfernt eine Funktion, die Migration 1 neu geschrieben hat. Wird 2 ohne 1
eingespielt, fehlt `sync_person_core_from_profiles` zwar ebenfalls — aber die
Bio-Kürzung bliebe bestehen, und die Rückwege aus Connect und FIND auch.

**Und die Code-Reihenfolge zählt mit.** Migration 2 darf erst live gehen, wenn
der Code dieses Auftrags live ist: Ohne ihn schreiben die fünf Stellen weiter
nach `profiles`, und ohne den Trigger käme der Name nie im Kern an. Ein
Mensch, der sich danach neu anmeldet, hätte überall einen leeren Namen.

Die sichere Reihenfolge:

1. Code aus Phase 0/1 **und** 1.5 ausrollen (beide sind in `main` zu mergen,
   bevor irgendetwas davon deployt wird — Phase 1.5 zweigt von Phase 0/1 ab).
2. `npx supabase db push` — spielt 1 und 2 in dieser Reihenfolge ein.

Umgekehrt (erst Migration, dann Code) entsteht genau das Fenster aus Absatz
drei. Es ist klein, aber es betrifft jeden, der sich darin registriert.

Nicht deployt. Das bleibt ein manueller Schritt.

---

## 12. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2500 Tests · next build · 1293 DB-Tests
                     alles grün
```

Dazu der angemeldete Durchgang aus §7 und die Messung aus §4 gegen die
laufende lokale Datenbank.
