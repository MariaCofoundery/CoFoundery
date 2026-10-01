# Das Profilfoto — und eine Liste für den Polish (Phase 5.1)

**Stand:** 01.10.2026 · **Branch:** `feat/profilfoto` (auf `main`, das nach
Phase 5 steht) · **Grundlage:** laufender Code und laufende lokale Datenbank

---

## 1. Wo lag das Foto vorher?

**Es lag schon richtig. Man kam nur nicht heran.**

| Ort | Spalte(n) | was dort steht |
|---|---|---|
| `profiles` | `avatar_id`, `avatar_url` | **die Quelle** — eine Illustration aus der Bibliothek *oder* ein eigenes Bild |
| `person_core` | `photo_visible_to_members` | nur ein Haken: Dürfen andere Mitglieder es sehen? |
| `network_profiles` (Connect) | `photo_source`, `photo_avatar_id`, `photo_path` | eigene Entscheidung: Basisbild · eigener Upload · keins |
| `founder_discovery_profiles` (FIND) | — | **gar nichts**; FIND liest live aus `profiles` |

**Speicher:** zwei private Eimer. `avatars` für das persönliche Bild
(`avatars/<user-id>/<zeit>-<zufall>.jpg`), ausgeliefert über
`/api/profile/photo/…` — eine Route, die eine Sitzung verlangt.
`network-profile-images` für Connect-eigene Uploads.

**Geschrieben** wurde es an genau einer Stelle: `upsertProfileBasicsAction`,
aufgerufen vom Einstiegsassistenten `ProfileBasicsForm` (auf `/welcome`,
`/join/welcome` und im Dashboard).

**Gelesen** wird es im Dashboard, im Workbook, in FIND (über die RPC
`list_member_photos`) und in Connect.

### Der eigentliche Befund

Unter „Über dich" stand der Haken *„Mein Bild dürfen andere eingeloggte
Mitglieder sehen"* — **ohne Bild daneben und ohne Weg, es zu ändern.** Wer sein
Foto wechseln wollte, musste zurück in den Einstieg. Und auf „Das bist du"
gab es überhaupt kein Foto.

Es fehlte also keine Architektur. Es fehlte das Formular an der Stelle, an der
inzwischen alle anderen Basisangaben stehen.

---

## 2. Wo liegt es danach?

**An derselben Stelle. Keine Migration, keine neue Spalte.**

```
kanonische Fotoquelle vorher:   profiles.avatar_id / profiles.avatar_url
kanonische Fotoquelle nachher:  profiles.avatar_id / profiles.avatar_url
```

Das ist eine Entscheidung und kein Versäumnis. Der Bericht zu Phase 1.5 hält
die Identitätsarchitektur so fest:

```
person_core                      kanonisch, privat — Identität
    ├── profiles                 Rollen, Avatar — und der Name als Kopie
    ├── network_profiles         veröffentlichte Kopie
    └── founder_discovery_profiles  veröffentlichte Kopie
```

Der Avatar ist auf `profiles` **kein Abbild von etwas**, sondern das Original.
Ihn nach `person_core` zu verschieben hätte die Auslieferungsroute, die
Freigabe-RPC `list_member_photos`, den Speicherpfad, Connect, den Einstieg und
das Workbook betroffen — für dieselbe Datei an einem anderen Ort.

---

## 3. Wo kann es bearbeitet werden?

Unter **`/profile?step=identity`**, dort, wo Name, Kurzvorstellung, Region und
Fachgebiete stehen:

```
Dein Foto
Ein Bild oder eine Illustration. Wer es sehen darf, entscheidest du unten
und in Connect getrennt.

[ Bild ]   [ Foto ändern ]  [ Illustration wählen ]
           [ Foto speichern ]   Foto entfernen
```

Ohne Foto heisst der erste Knopf „Foto hinzufügen".

**Dieselbe Mechanik wie im Einstieg, nicht eine zweite.** Zwei Module wurden
dafür herausgelöst statt kopiert:

* `features/profile/avatarImage.ts` — die Verkleinerung im Browser (längste
  Seite 320 px, JPEG 0.82). Sie stand in `ProfileBasicsForm`; jetzt benutzen
  beide Stellen dieselbe Zahl.
* `features/profile/avatarStorage.ts` — Hochladen, Pfad, Löschen. Stand in
  `actions.ts`; jetzt benutzen beide Aktionen dieselbe Regel für „ersetzen
  heisst: die alte Datei geht".

**Kein neues Bildsystem.** Kein Zuschneiden, keine Filter, keine
Gesichtserkennung — was es im Einstieg nicht gibt, entsteht auch hier nicht.

**Drei Wege, und sie schliessen sich aus:**

```
eigenes Bild    avatar_url = "avatars/…"   avatar_id  = null
Illustration    avatar_id  = "avatar-07"   avatar_url = null
keins           beide null
```

Zwei gesetzte Felder hiessen zwei Bilder, und welches gilt, entschiede die
Lesereihenfolge.

---

## 4. Wie verwenden FIND und CONNECT das Basisfoto?

### FIND: live, ohne Kopie — und das war schon so

`getMemberPhotos` ruft die RPC `list_member_photos`, die `profiles` liest und
nur herausgibt, was freigegeben ist. **FIND speichert nichts.** Wer sein Foto
ändert, ändert damit sofort, was FIND zeigt; wer es löscht, löscht es auch
dort.

Es gibt in FIND **kein eigenes Foto** und keinen Override. Einen zu erfinden
stand ausdrücklich nicht im Auftrag — und es gibt ihn auch nicht zu erhalten.

### CONNECT: eine Kopie, die jetzt nachgezogen wird

Connect kennt drei Zustände, die es vorher schon kannte:

```
photo_source = 'profile_avatar'   die Illustration aus dem Basisprofil
photo_source = 'network_upload'   ein eigenes Connect-Bild
photo_source = null               keins
```

Bei `profile_avatar` wird die **Kennung der Illustration in die Zeile
geschrieben** (`photo_avatar_id`). Das muss so sein: Die öffentlichen
Connect-Seiten werden auch ohne Anmeldung ausgeliefert und können `profiles`
gar nicht lesen.

**Das war die Lücke aus Abschnitt 9 der Aufgabe.** Ohne Nachzug hiesse „mein
vorhandenes Bild verwenden": *das Bild, das ich an dem Tag hatte.* Wer es
danach änderte, hatte zwei; wer es löschte, hatte in Connect weiter das alte
stehen.

Seit dieser Phase trägt die Quelle ihre Änderung nach aussen — und zwar nur
dort, wo Connect das Basisfoto wirklich benutzt:

```sql
update network_profiles
   set photo_avatar_id = <neu>          -- bzw. photo_source = null beim Entfernen
 where user_id = … and photo_source = 'profile_avatar'
```

Ein eigenes Connect-Bild bleibt unberührt. **Das ist kein Rückweg:** Die
kanonische Quelle propagiert nach aussen, wie `propagate_person_core_to_context_rows`
es für Name und Bio tut. Connect schreibt weiterhin nichts auf `profiles` —
ein Test prüft das.

---

## 5. Welche Sichtbarkeitsregeln gelten?

**Speicherung und Sichtbarkeit sind zwei Fragen, und sie bleiben getrennt.**

| Wo | Regel | wer entscheidet |
|---|---|---|
| „Das bist du" | immer, wenn vorhanden | niemand — die Seite ist privat |
| FIND / Mitgliederlisten | `person_core.photo_visible_to_members`, Voreinstellung **aus** | der Haken unter „Über dich" |
| Connect | eigene Entscheidung je Profil (`photo_source`) | die Wahl im Connect-Formular |
| Advisor | die vorhandene Personen-Freigabe, unverändert | — |

Zwei Modelle für dasselbe Bild sind Absicht und stehen so in der Migration
`20260927120000`: *„Plattformen trennen nach Publikum, nicht nach Bereich."*
Align und FIND haben dasselbe Publikum (eingeloggte Mitglieder) — ein Bild,
eine Entscheidung. Connect hat öffentliche Seiten, also eine eigene.

**Nachgemessen an der Freigabe-Funktion selbst**, nicht an der Oberfläche:

| Fall | Ergebnis |
|---|---|
| Ben mit Haken an → Nora fragt | 1 Bild |
| Nora fragt nach sich selbst, Haken aus | 1 Bild (das eigene sieht man immer) |
| Ben mit Haken aus → Nora fragt | **0 Bilder** |

---

## 6. Wie verhält sich „Das bist du"?

Es **liest** das Foto und speichert keins. Im Kopf steht es links neben dem
Namen; ohne Foto steht dort nur der Name — kein Platzhalter, kein Kasten, kein
Hinweis.

Gelesen wird es im gemeinsamen Lesemodell (`profileReadModel.ts`), also
einmal für die Leseseite und beide Druckfassungen. Ein Test prüft, dass weder
die Seite noch die Druckfassung `avatar_id` oder `avatar_url` schreibt.

---

## 7. Wie verhält sich PDF?

**Das Bild ist dort Schmuck — `alt=""`.**

Das war der gemeldete Fehler: Ein Bild mit Alternativtext neben einer
Überschrift schreibt genau diesen Text in die Überschrift, wenn es nicht lädt.
„Foto Nora Testerin".

Mit `alt=""` kann das nicht passieren: Lädt das Bild nicht, steht dort nichts,
und der Name steht ohnehin daneben. Dafür musste `ProfileAvatar` eine Kleinigkeit
lernen — ein leerer Alternativtext heisst jetzt wirklich „Schmuck", und der
Initialen-Platzhalter wird dann `aria-hidden` statt mit leerem Label
beschriftet.

Im Browser gemessen, mit und ohne Foto:

| | Kopfzeile |
|---|---|
| `/me/profile` mit Foto | `Nora Testerin` · Bild mit `alt=""` |
| Kurz-PDF mit Foto | `Nora Testerin` · Bild mit `alt=""` |
| Lang-PDF mit Foto | `Nora Testerin` · Bild mit `alt=""` |
| alle drei ohne Foto | `Nora Testerin`, kein Bild |

Nirgends klebt etwas am Namen.

---

## 8. Welche Migration war nötig?

**Keine.** Keine neue Spalte, keine neue Tabelle, keine neue Policy, kein
neuer Eimer. Die Phase besteht aus einem Formular an der richtigen Stelle,
zwei herausgelösten Modulen und einem Nachzug nach Connect.

---

## 9. Welche Tests wurden durchgeführt?

```
npm run ci:check     tsc --noEmit · 2593 Tests · next build · 1311 DB-Tests
                     alles grün
```

**Neu:** `features/profile/__tests__/profilfoto.test.ts`, 9 Fälle — eine
Quelle, und sie liegt weiter auf `profiles` · die drei Felderpaare schliessen
sich aus · ersetzen heisst: die alte Datei geht, und die Löschung prüft den
Präfix selbst · dieselbe Mechanik wie im Einstieg, und der Einstieg benutzt
jetzt dieselbe herausgelöste Verkleinerung · geändert wird an einer Stelle,
gelesen an dreien · **kein Alternativtext klebt am Namen** · Connect zieht nach
und schreibt nicht zurück · Sichtbarkeit und Speicherung bleiben getrennt ·
beide Sprachen.

**Im Browser durchgespielt** (Chrome 154 headless, echte Anmeldung):

| geprüft | Ergebnis |
|---|---|
| kein Foto | Platzhalter, „Foto hinzufügen" |
| Illustration wählen und speichern | „Foto gespeichert.", Bild mit `alt=""` |
| eigenes Bild über den Dateidialog (`DOM.setFileInputFiles`) | im Browser verkleinert, hochgeladen, ausgeliefert über `/api/profile/photo/…` |
| ersetzen | neue Datei da, **alte aus dem Eimer verschwunden** |
| entfernen | „Foto entfernt.", Platzhalter, Knopf verschwindet |
| „Das bist du" / Kurz-PDF / Lang-PDF | zeigen die aktuelle Fassung, danach nur den Namen |
| Eimer nach dem Durchgang | **0 Dateien**, keine verwaisten Uploads |
| Sichtbarkeit (direkt an `list_member_photos`) | an → 1, aus → 0, eigenes immer |
| 320 / 375 px | kein Überlauf |

**Nicht geprüft:** FIND mit echtem Suchergebnis — das Seed-Konto hat keine
Treffer in der Suche, und Suchdaten dafür zu bauen stand nicht im Auftrag.
Geprüft ist stattdessen die Regel selbst, an der Funktion, die FIND benutzt.

**Testdaten entfernt:** Foto, Sichtbarkeitshaken und Eimer wieder leer.

---

## 10. Die Liste für den finalen Polish

Gefunden, **nicht behoben** — wie beauftragt.

### A. UX

1. **„Dein Foto" und der Sichtbarkeitshaken stehen in zwei Kästen.** Das Bild
   oben in einem eigenen Block, die Frage „dürfen andere es sehen" weiter
   unten im Identitätsformular. Technisch nötig (zwei Tabellen, und ein
   Formular im Formular gibt es in HTML nicht) — für den Lesenden trotzdem
   getrennt, was zusammengehört.
2. **Der Sprungbalken auf „Das bist du" braucht bei 768 px drei Zeilen**
   (neun Abschnitte, 148 px). Erlaubt, aber unschön.
3. **Das Kurz-PDF eines sehr vollen Profils ist neun Seiten lang** statt der
   angepeilten drei bis sechs. Ursache in Phase 4 gemessen: kein Abschnitt ist
   unverhältnismässig, es sind zehn volle Abschnitte.
4. **„Was dich antreibt" ist der längste Abschnitt** (17 % der Kurzfassung) —
   zehn Facetten mal zwei Aussagen.
5. **Der Beispieltext im Ressourcenfeld folgt nicht der gewählten Art.** Wer
   im Formular von „Netzwerk" auf „Zugang" wechselt, sieht weiter das
   Netzwerk-Beispiel (serverseitig gerendert).
6. **Die Advisor-Personenseite zeigt den v1-Altbestand als Hauptinhalt**, wenn
   jemand keine ALIGN-Freigabe hat — mit „Dein aktueller Stand in 6
   Dimensionen" als grösster Überschrift.

### B. Inhalt

7. **Zwei Markennamen.** Das PDF unterschreibt mit `Made2Found`, das Produkt
   heisst überall sonst `CoFoundery`. Steht an einer Stelle
   (`features/brand.ts`) und wartet auf eine Entscheidung.
8. **Drei Einschränkungshinweise auf einer Seite.** „Selbstauskunft, kein
   Testergebnis" an der Karte, „keine Diagnose, kein Normvergleich, keine
   Punktzahl" an der Beschreibung, und der `InstrumentNote` mit vier weiteren
   Sätzen unten. Jeder einzelne ist richtig; zusammen sind es viele.
9. **„Über dich" heisst zweimal etwas anderes.** Die Station auf `/profile`
   und der erste Abschnitt auf `/me/profile` tragen denselben Namen für
   verschiedene Dinge.
10. **Deutsche Instrumenttexte in der englischen Fassung.** Die
    Abschnittsnamen der Registratur („A – Analytische Prüfung") und die
    Antwortstufen („fast immer"). Bekannt und bewusst ausgeklammert.

### C. Druck

11. **Einsame Überschriften am Seitenende sind ungeprüft.** Die Regeln greifen
    nachweislich (`break-after: avoid-page` kommt an den Überschriften an),
    aber das fertige PDF Seite für Seite zu lesen ging nicht — auf diesem
    Rechner gibt es keinen PDF-Textextraktor.
12. **Keine Seitenzahlen, keine Kopfzeile auf Folgeseiten.** CSS kann das in
    Chrome nicht ohne `position: running()`.
13. **Die WorkMap ist mit sechzehn beschrifteten Zeilen fast eine ganze
    A4-Seite** (976 px).
14. **Die Browsereinstellung „Kopf- und Fusszeilen" kann URL und Datum auf
    jede Seite drucken.** Dagegen gibt es keine CSS-Handhabe.

### D. Architekturreste

15. **`focus_skill` und `intention`** — erhoben im Einstieg, gelesen nur von
    `isCoreProfileComplete` (der Weiche nach der Anmeldung) und einer
    Zusammenfassung auf `join/welcome`. Deprecation-Kette steht im Phase-3-Bericht.
16. **Connect kann ein hochgeladenes Basisfoto nicht übernehmen.** „Mein
    vorhandenes Bild verwenden" funktioniert nur für Illustrationen aus der
    Bibliothek; bei einem eigenen Bild wird abgewiesen (`photo_reuse`).
    Grund: Die öffentlichen Connect-Seiten können den privaten `avatars`-Eimer
    nicht ausliefern.
17. **`profiles.display_name` bleibt eine Kopie**, aktuell gehalten von der
    Propagation. Sieben Lesestellen hängen daran; sie zu entfernen ist ein
    eigener Schritt (steht so im Phase-1.5-Bericht).
18. **Der v1-Altbestand lebt in fünf verschachtelten Aufklappern** innerhalb
    von `SelfReportView` — die Phase-2-Zusage „höchstens ein Aufklapper je
    Abschnitt" gilt dort nicht.
19. **Zwei Sichtbarkeitsmodelle für dasselbe Bild** (`photo_visible_to_members`
    für Align und FIND, `photo_source` für Connect). Absicht und dokumentiert,
    aber beim Erklären erklärungsbedürftig.

---

## 11. Branch und Reihenfolge

`feat/profilfoto` zweigt von `main` ab, das nach dem Merge der Phasen 3 bis 5
auf `647a203` steht.

**Keine Migration in dieser Phase.** Die ausstehende Migration bleibt
`20261094120000_person_section_marks.sql` aus Phase 3 — falls sie noch nicht
auf Produktion ist, gilt weiter: erst `npx supabase db push`, dann der Code.

Nicht deployt. Das bleibt ein manueller Schritt.
