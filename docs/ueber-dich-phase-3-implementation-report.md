# „Über dich" — Phase 3: der geführte Profilaufbau

**Stand:** 01.10.2026 · **Branch:** `feat/ueber-dich-phase-3` · **Grundlage:**
laufender Code und laufende lokale Datenbank, dazu
`das-bist-du-phase-2-implementation-report.md`,
`das-bist-du-phase-2-1-ux-qa.md`,
`ueber-dich-guided-profile-builder-spec-v0.1.md`,
`profile-architecture-gap-plan.md`

---

## 1. Wie sieht die finale Übersicht aus?

`/profile` beginnt nicht mehr mit Formularfeldern.

```
Über dich
Hier entsteht Schritt für Schritt dein persönliches Founder-Profil.
Du musst nicht alles auf einmal machen — ergänze einfach, was für dich
gerade passt.

[„Das bist du" ansehen]

┌ Weiter dort, wo du aufgehört hast ─────────────────────────────┐
│ Als Nächstes könntest du einordnen, wie weit du in deinen       │
│ Bereichen gekommen bist.                      [ Weitermachen ]  │
└─────────────────────────────────────────────────────────────────┘

┌ Du & dein Hintergrund                        ● Für jetzt fertig ┐
│ Name, Kurzvorstellung, Region, Fachgebiete …                    │
│ Nora Testerin — Baut Werkzeuge für Pflegeteams                  │
│ [ Ansehen und ergänzen ]                                        │
└─────────────────────────────────────────────────────────────────┘

┌ Wie du arbeitest                             ● Für jetzt fertig ┐ …
┌ Was du mitbringst                                   ● Begonnen  ┐
│ 9 Bereiche eingetragen, davon 8 mit Erfahrungsstufe · 4 Stärken │
│ ─ Aus Situationen lernen                          Noch offen    │
│ ─ Deine Fähigkeiten                                Begonnen     │
│ ─ Erfahrung einordnen                              Begonnen     │
│ ─ Verantwortung wählen                             Begonnen     │
│ ─ Deine Stärken                                    Begonnen     │
│ [ Weitermachen ]                                                │
└─────────────────────────────────────────────────────────────────┘

┌ Was dich antreibt … ┐   ┌ Netzwerk & Ressourcen … ┐

WAS DANEBEN LIEGT
  Wer sieht, was du kannst?  [ Sichtbarkeit einstellen ]
  Vergleichen …
  Deine Kontexte …
```

**Vorher lagen auf derselben Seite gleichzeitig:** der Einstieg ins Gespräch,
die Stärken mit allen Formularen, der Einstieg ins Richtungs-Gespräch, das
Identitätsformular mit elf Feldern, die Capability-Auswertung, die vollständige
Liste der eigenen Erzählungen, der Vergleich, die Freigabe und die Kontexte.
Neun Abschnitte, alle offen, alle gleichzeitig. Das war die Pflegeseite, und
sie sah aus wie ein Antrag.

Die Formulare sind nicht verschwunden — sie haben eigene Adressen bekommen.

---

## 2. Welche fünf Stationen gibt es?

| Station | Anker | darunter |
|---|---|---|
| Du & dein Hintergrund | `#basis` | die Basisangaben |
| Wie du arbeitest | `#arbeitsweise` | `founder-profile-v1` |
| Was du mitbringst | `#mitbringen` | Gespräch · Fähigkeiten · Erfahrung · Verantwortung · Stärken |
| Was dich antreibt | `#antrieb` | das Richtungs-Gespräch |
| Netzwerk & Ressourcen | `#ressourcen` | `person_resources` |

Fünf Stationen über neun Erfassungswegen. Es sind **UX-Gruppen und kein neues
Datenmodell**: Darunter liegen dieselben Tabellen und dieselben Oberflächen wie
vorher.

**Warum nicht neun.** „Das bist du" hat neun Abschnitte, und das ist dort
richtig — jeder beantwortet eine Frage über einen Menschen, zum *Lesen*. Zum
*Erfassen* wären neun gleichgewichtige Karten neun Aufgaben, und wer eine Seite
mit neun offenen Punkten öffnet, sieht eine Hausaufgabe.

**Keine Nummer an einer Station.** Wer mit den Ressourcen anfangen will, fängt
mit den Ressourcen an — eine Nummer würde das zu einem Umweg erklären.

---

## 3. Welche bestehenden Erfassungsoberflächen wurden wiederverwendet?

Alle. Es wurde keine einzige nachgebaut.

| Schritt | Oberfläche | Zustand |
|---|---|---|
| Basis | `saveIdentityAction` + Formular | umgehängt nach `?step=identity` |
| Arbeitsweise | `/founder-alignment/profil`, 7 Schritte | unberührt |
| Gespräch | `/profile/interview` + `/interview/sort` | unberührt |
| Fähigkeiten | `?step=areas` (`CapabilityAreaPicker`-Logik) | unberührt |
| Erfahrung | `?step=evidence` (`CapabilitySnapshotStart`) | unberührt |
| Verantwortung | `?step=ownership` | unberührt |
| Stärken | `StrengthsSection` | umgehängt nach `?step=strengths` |
| Richtung | `/profile/direction` | unberührt |
| Ressourcen | `ResourceProposalSection` | **zweite Tür** unter `?step=resources` |

Ein Test hält das fest: `AlignmentForm`, `InterviewAnswerForm` und
`DirectionProposals` dürfen in `/profile` nicht vorkommen.

---

## 4. Welche neuen Komponenten mussten gebaut werden?

Vier Dateien, zusammen rund 400 Zeilen — davon die Hälfte Begründung.

| Datei | was sie tut |
|---|---|
| `features/profile/aboutYou.ts` | die Statusableitung, als reine Funktionen. Kennt keine Datenbank und ist ohne eine prüfbar. |
| `features/profile/aboutYouData.ts` | liest den Bestand. Zählt (`head: true, count: "exact"`), statt Verläufe zu laden, um am Ende `length > 0` zu fragen. |
| `features/profile/AboutYouStation.tsx` | eine Stationskarte: Titel, Status, Payoff, Unterpunkte, **ein** Knopf. |
| `features/profile/SectionMarkToggle.tsx` | „Damit bin ich für jetzt durch" — zwei Formulare, kein Umschalter. |

Dazu `features/profile/sectionMarkActions.ts` (setzen/zurücknehmen) und die
Migration `20261094120000_person_section_marks.sql`.

**Was nicht gebaut wurde:** keine neue Auswertung, keine neue Textebene, kein
zweites Ressourcenmodell, keine Kopie irgendeiner Fachtabelle.

---

## 5. Wie werden Status abgeleitet?

Drei Zustände: **noch offen · begonnen · für jetzt fertig.** Mehr nicht.

Sechs der neun Schritte tragen ihr Ende schon in den Daten:

| Schritt | begonnen | für jetzt fertig |
|---|---|---|
| Basis | irgendein Kernfeld gesetzt | `getIdentityGaps(core)` leer |
| Arbeitsweise | ≥ 1 Antwort | `assessments.submitted_at` gesetzt |
| Gespräch | Sitzung offen **oder** wartende Antworten | abgeschlossen **und** nichts unsortiert |
| Erfahrung | ≥ 1 Stufe | jeder Eintrag hat eine Stufe |
| Verantwortung | ≥ 1 Wunsch | jeder Eintrag hat einen Wunsch |
| Richtung | ≥ 1 Antwort oder Aussage | ≥ `DIRECTION_MIN_ANSWERS` (4 von 6) |

Für Fähigkeiten, Stärken und Ressourcen gibt es kein ableitbares Ende — siehe
Punkt 6.

**Die Schwellen sind geliehen, nicht neu erfunden.** Die Basis endet an
derselben Schwelle, die auch über das Veröffentlichen entscheidet
(`identityReadiness.ts`), und die Richtung behält die Regel ihres Gesprächs.
Zwei Begriffe von „genug" für dieselbe Sache wären ein Widerspruch, den niemand
auflöst. Ein Test prüft, dass die Zahl 4 nicht noch einmal von Hand dasteht.

**Zwei Entscheidungen, die man begründen muss:**

*Ein abgeschlossenes Gespräch mit wartenden Antworten ist nicht fertig.* Was
nicht eingeordnet ist, steht nirgends im Profil; ein Haken darüber wäre eine
falsche Auskunft über den eigenen Bestand.

*Ohne Bereiche ist „Erfahrung" offen und nicht fertig.* Es gibt nichts
einzuordnen — aber „fertig" wäre die Behauptung, es sei etwas geschehen.

**Der Stationsstatus:** alles offen → offen, alles fertig → fertig, sonst
begonnen. Die größte Station zeigt **einen** Status über fünf Schritten. Fünf
Statuswörter nebeneinander wären eine Rechnung, und „3 von 5 erledigt" ist
genau der Fortschrittsbalken, den „Das bist du" am 01.10.2026 verloren hat.

---

## 6. Für welche Bereiche wird `person_section_marks` verwendet?

**Für drei — und das wurde vor dem Bauen gegen den Code geprüft, wie
verlangt. Es sind weiterhin genau diese:**

```
faehigkeiten · staerken · ressourcen
```

„Ich habe genug Bereiche eingetragen", „ich habe genug Stärken benannt", „mehr
Zugänge habe ich nicht" sind Aussagen der Person und keine Eigenschaft ihrer
Zeilen. Es gibt keine Zahl, ab der es genug ist: 54 mögliche Fähigkeitsbereiche
sind kein Ziel, und drei können vollständig sein.

```sql
create table public.person_section_marks (
  user_id  uuid not null references auth.users(id) on delete cascade,
  section  text not null,
  marked_at timestamptz not null default now(),
  primary key (user_id, section)
);
```

Kein `status`, kein Zählwert, kein `updated_at`, kein Fortschritt. **Und kein
UPDATE in der Zeilensicherheit** — eine vorhandene Zeile sagt bereits, was eine
zweite sagen würde; gesetzt wird mit `on conflict do nothing`, zurückgenommen
mit `delete`.

**Änderungen an den Fachdaten heben die Markierung nicht auf.** Wer danach eine
Stärke ergänzt, ist nicht plötzlich wieder „begonnen". Ein Profil, das sich beim
Pflegen selbst zurückstuft, bestraft das Pflegen.

**Die Markierung steht auf der Seite des Bereichs, nicht auf der Übersicht.**
Man entscheidet, dass es reicht, während man vor sich hat, was man eingetragen
hat — und „Was du mitbringst" hätte auf der Karte zwei davon, was wieder eine
Rechnung wäre.

Elf pgTAP-Fälle in `supabase/tests/person_section_marks.sql`: drei Spalten und
kein Status, zweimal markieren ergibt eine Zeile, niemand markiert für jemand
anderen, die fremde Markierung ist unsichtbar und unlöschbar, der Zeitpunkt
lässt sich nicht nachträglich verschieben, mit dem Konto verschwindet sie.

---

## 7. Wie wird „Weiter dort, wo du aufgehört hast" bestimmt?

Drei Regeln, in dieser Reihenfolge:

1. **Wartende Antworten gehen allem vor.** Es ist der einzige Zustand, in dem
   Arbeit schon getan ist und trotzdem nichts zu sehen. Der Hinweis ist dann
   derselbe wie bisher, mit Zahl: „Drei Antworten warten darauf, eingeordnet zu
   werden", Knopf „Antworten einordnen".
2. **Erst das Begonnene, das sich durch Arbeit beenden lässt.** Wer mitten in
   den Erfahrungsstufen steckt, soll nicht als Nächstes das Gespräch angeboten
   bekommen.
3. **Dann das Unangefangene**, und erst zuletzt das, wo nur noch eine
   Entscheidung aussteht.

> **Regel 3 hat mein eigener Test gefunden.** Nach der naheliegenden Fassung
> („erst das Begonnene, dann das Offene") hätte „Deine Fähigkeiten" auf Dauer
> alles andere verdeckt: Der Schritt bleibt `begonnen`, solange niemand ihn
> markiert — es gibt dort nichts, was das sonst beendet. Die Seite hätte einem
> Menschen monatelang vorgeschlagen, seine Bereiche auszuwählen, obwohl längst
> alles andere offen war. „Sag mir, dass es genug ist" ist kein nächster
> Schritt; es ist eine Frage, und sie steht auf der Seite des Bereichs.

**Es ist ein Vorschlag, kein Zwang.** Nichts wird umgeleitet, nichts gesperrt,
jede Station bleibt anwählbar. Ist nichts mehr offen, steht dort nichts — ein
Satz ins Leere klänge nach einer Aufgabe, die es nicht gibt.

---

## 8. Welche Payoffs werden gezeigt?

**Zwei Dichten, und das ist Absicht.**

Auf der Karte *ein Satz* aus den eigenen Angaben:

```
Nora Testerin — Baut Werkzeuge für Pflegeteams
Dein Arbeitsprofil liegt vor.
9 Bereiche eingetragen, davon 8 mit Erfahrungsstufe · 4 Stärken.
5 bestätigte Aussagen darüber, was dich antreibt.
Ein bestätigter Eintrag, ein Vorschlag wartet auf dich.
```

Auf der *Schrittseite* der vorhandene Baustein, nach dem Formular:

| Schritt | Payoff | woher |
|---|---|---|
| Basis | die Kurzvorstellung, wie andere sie sehen | `FounderProfileBase` |
| Fähigkeiten | die Deckungskarte je Familie | `CoverageMap` |
| Erfahrung | Befunde + die eigene Liste mit Stufen | `CapabilityReadoutSection` |
| Verantwortung | die Rollen nach Faltin | `CoverageRoles` |
| Stärken | Selbst- und Fremdsicht nebeneinander | `StrengthsSection` |
| Ressourcen | Vorschläge mit Beleg, Bestätigtes getrennt | `ResourceProposalSection` |

Arbeitsweise, Gespräch und Richtung liegen auf eigenen Seiten; was die zeigen,
zeigen sie weiterhin selbst. Sie wurden nicht angefasst.

**Die Texte sind geliehen, nicht abgeschrieben.** Die Deckungskarte, die
Rollenliste und die Kurzvorstellung sind in `profile.founderProfile` schon
beschriftet — `/profile` lädt diesen Sprachraum mit, statt die Erklärungen ein
zweites Mal zu schreiben. Zwei Fassungen derselben Erklärung laufen
auseinander.

**Kein neuer Score, kein „gut gemacht", kein Konfetti.** Die Belohnung ist das
sichtbar entstehende eigene Profil.

---

## 9. Wo landen bestehende Deep Links?

**Keine URL bricht.** `?step=evidence`, `?step=areas` und `?step=ownership`
bleiben Wort für Wort — sie stehen in Links, in Lesezeichen und in den
Weiterleitungen der Erfassungsaktionen. Ein Test hält sie fest.

Dazugekommen: `?step=identity`, `?step=strengths`, `?step=resources`,
`?step=sichtbarkeit`.

**Die Rückwege wurden nachgezogen**, weil `/profile` jetzt die Übersicht ist
und nicht mehr die Seite mit allen Formularen:

| Aktion | vorher | jetzt |
|---|---|---|
| Identität speichern | `/profile?saved=identity` | `/profile?step=identity&saved=identity` |
| Stärke anlegen/ändern | `/profile#strengths` | `/profile?step=strengths#strengths` |
| Beleg entfernen | `/profile?saved=evidence_removed` | `/profile?step=evidence&…` |
| Freigabe speichern | `/profile?saved=disclosure` | `/profile?saved=disclosure#besides` |
| Ende des Dreischritts | `/profile?saved=snapshot` | `/profile?saved=snapshot#mitbringen` |

Der wichtigste davon ist der erste: Ohne ihn wäre nach dem Speichern der
Identität nicht nur das Formular verschwunden, sondern auch der Rückweg nach
Connect oder FIND (`?next=`), den die beiden Kontextseiten mitgeben.

**Und jeder Schritt hat jetzt oben einen Weg zurück.** Vorher gab es ihn nur im
dreiteiligen Fähigkeitsablauf („Später fortsetzen"); wer über einen
Bearbeiten-Link hereinkam, hatte den Browser-Zurück.

---

## 10. Wie wurden die Ressourcen aus Connect in die Personenarchitektur integriert?

**Durch eine zweite Tür, nicht durch eine zweite Tabelle.**

```
person_resources          kanonisch, unverändert
    ├── /connect/profile    wo die Vorschlaege ENTSTEHEN — unverändert
    └── /profile?step=resources   wo sie HINGEHOEREN — neu
```

Dieselbe Komponente (`ResourceProposalSection`), dieselben beiden Aktionen
(`confirmResourceProposalAction`, `rejectResourceProposalAction`), dieselbe
Tabelle. Keine Kopie, kein zweites Modell, kein neues KI-System.

Connect bleibt vollständig, wie es war: Wo ein Vorschlag aus den dort
veröffentlichten Texten entsteht, darf er auch weiterhin auftauchen. Connect ist
nur nicht länger der *einzige* Pflegeort.

**Nachgemessen:** Ein offener Vorschlag erscheint unter `?step=resources` mit
seinem Beleg („Ich kenne drei Pflegeheime aus meiner Zeit als Projektleiterin.")
und zwei Knöpfen — und auf „Das bist du" erscheint er **nicht**. Nur das
Bestätigte steht dort. Die Phase-2-Regel hält.

**Offen gesagt:** Von Hand eintragen lässt sich eine Ressource weiterhin
nirgends. Wer keine Connect-Texte hat, sieht hier einen ehrlichen Leerzustand,
der genau das sagt. Ein eigenes Eingabefeld wäre ein neuer Schreibweg gewesen
und stand nicht im Auftrag.

---

## 11. Was passiert mit `focus_skill` und `intention`?

**Geprüft, nicht angefasst — und als Deprecation-Kandidat markiert, mit der
Kette, die vorher weg muss.**

Sie stehen auf `profiles`, nicht im Kern. Sie stehen **nicht** im
Identitätsformular von „Über dich": Erhoben werden sie ausschließlich im
Einstieg (`ProfileBasicsForm`, Schritte „focus" und „intention") und im
Dashboard (`updateDisplayNameAction`).

Gelesen werden sie an genau zwei Stellen:

```
isCoreProfileComplete(profile)   = name && role && focus && intention
    └── postAuthRedirect          wohin jemand nach der Anmeldung kommt
    └── join/start, join/welcome, dashboard

join/welcome/page.tsx             zeigt beide einmal in einer Zusammenfassung
```

**Das ist Legacy-Completeness.** Keine der beiden Angaben beeinflusst FIND,
Connect, ALIGN, das Capability-Modell, „Das bist du" oder irgendeine
Auswertung. Ihr einziger fachlicher Zweck ist eine Weiche: Wer sie nicht hat,
wird nach der Anmeldung in den Einstieg geschickt.

**Deprecation-Kandidat**, in dieser Reihenfolge:

1. `isCoreProfileComplete` auf Name und Rolle verkleinern — dann hört die
   Weiche auf, von zwei Angaben abzuhängen, die niemand liest.
2. Die beiden Schritte aus `ProfileBasicsForm` nehmen.
3. Die Zusammenfassung in `join/welcome` ohne sie bauen.
4. Erst dann die Spalten.

Nicht in diesem Auftrag gemacht: Schritt 1 ändert, wo Menschen nach der
Anmeldung landen, und das ist kein Nebeneffekt eines Profilumbaus.

**`roles` dagegen bleibt** und ist weiterhin im Formular: Es ist eine
Navigationsangabe mit sichtbarer Wirkung — wer „Advisor" anhakt, sieht das
Advisor-Dashboard. Was darauf steht, entscheidet weiterhin die
Zeilensicherheit.

---

## 12. Welche Punkte wurden bewusst nicht umgesetzt?

Alles aus Abschnitt 23: keine PDF-Fassungen, keine neue Print-Route, kein
Share-Link, keine Advisor-Ressourcenfreigabe, kein Werte-Modul, keine neue
ALIGN-Auswertung, keine Scores, keine Typologie, kein FIND-Umbau, keine
Instrumentübersetzung, kein neuer globaler Navigationsbereich „Du" (der
Menüpunkt „Über dich" zeigt seit Phase 0/1 auf `/profile` und blieb
unverändert).

Dazu vier Entscheidungen innerhalb des Auftrags:

**Der Altbestand ist keine Station.** v1 taucht in „Über dich" nirgends auf.
Wer ihn hat, findet ihn weiterhin über die vorhandenen Wege und zugeklappt auf
„Das bist du". Ein neuer Mensch sieht nie einen alten Fragebogen als offene
Aufgabe.

**Ressourcen bleiben ohne eigenes Eingabefeld** — siehe Punkt 10.

**Vergleich, Freigabe und Kontexte sind keine Stationen.** Sie stehen unter
einer leisen Überschrift am Ende („Was daneben liegt"). Eine Station ist etwas,
das man über sich erfasst; dies sind Entscheidungen darüber, was damit
geschieht.

**„Das bist du" wurde nicht umgebaut.** Geändert wurden dort ausschließlich
sechs Ziele von Bearbeiten-Links. Keine neue Informationsarchitektur, keine
Änderung an WorkMap, den neun Abschnitten, den Summary-/Detail-Regeln, dem
Ressourcenfilter oder den Direction-Facetten.

---

## 13. Welche Risiken bleiben?

**Der Payoff auf der Karte ist ein Satz, kein Bild.** Für „Wie du arbeitest"
stünde die WorkMap bereit, aber auf einer Übersicht aus fünf Karten wäre sie
ein Block von mehreren hundert Pixeln. Ob „Dein Arbeitsprofil liegt vor."
genug Belohnung ist, sieht man erst an echten Menschen.

**Vier Karten tragen keine Unterpunkte, eine trägt fünf.** Das ist ehrlich —
die Station *ist* ungleich groß —, aber „Was du mitbringst" ist dadurch
sichtbar die Hauptarbeit. Ob das einschüchtert oder orientiert, weiß ich nicht.

**Der Status einer Station ist gröber als ihr Inhalt.** „Begonnen" steht an
einer Station, in der vier von fünf Schritten fertig sind, genauso wie an
einer, in der einer angefangen ist. Das ist der Preis dafür, keine Rechnung
anzuzeigen — und er ist bewusst bezahlt.

**`aboutYouData` stellt sechs zusätzliche Abfragen.** Sie laufen in einem
`Promise.all` und sind Zählungen mit `head: true` — über die Leitung geht je
eine Zahl. Gemessen wurde die Seitenzeit nicht.

**Eine unbekannte Markierung kostet eine Zeile.** `section` ist in der
Datenbank freier Text, damit die Kennungen beim Code stehen können. Die
Serveraktion lässt nur die drei bekannten durch; eine Zeile aus einer späteren
Fassung der Oberfläche wird beim Lesen ignoriert.

**Nur Chrome gemessen.** Safari und Firefox nicht — wie in Phase 2.1.

---

## 14. Ist Phase 3 bereit für die PDF-Phase?

**Ja, und zwar aus einem strukturellen Grund: „Über dich" hat nichts mit dem
Drucken zu tun.**

Die Trennung ist jetzt sauber. `/profile` erfasst und pflegt, `/me/profile`
liest und gibt weiter — und nur die zweite Seite hat eine Druckfassung. Alles,
was eine PDF-Phase braucht, liegt auf der Leseseite; „Über dich" schreibt
nichts, was dort nicht schon ankäme.

Was die PDF-Phase wissen sollte:

* **Die neun Abschnitte von „Das bist du" sind unverändert** und tragen
  weiterhin ihre stabilen Anker.
* **`person_section_marks` ist kein Inhalt.** Die Markierung ist eine Notiz an
  sich selbst; sie gehört in keine Fassung, die man weitergibt, und steht
  deshalb auch in keiner Leseansicht.
* **Der Status einer Station gehört nicht ins PDF.** „Noch offen" neben einem
  Abschnitt wäre in einer weitergegebenen Fassung eine Aussage über einen
  Menschen und keine über ein Formular.

---

## 15. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2541 Tests · next build · 1304 DB-Tests
                     alles grün
```

**Im Browser gerendert** (Chrome 154 headless über das DevTools-Protokoll,
echte Anmeldung über `/dev-login`), bei 320 / 375 / 1024 px:

| geprüft | Ergebnis |
|---|---|
| alle acht Adressen (`/profile` + sieben Schritte) × drei Breiten | kein horizontaler Überlauf, 0 Tippziele unter 44 px |
| fast leeres Profil (Advisor-Konto) | vier Stationen „noch offen", Vorschlag „den Founder-Bogen ausfüllen" |
| volles Profil (Nora) | Status, Payoffs und Unterpunkte wie erwartet |
| Markierung setzen | „Deine Stärken" → „Für jetzt fertig", Notiz auf der Schrittseite |
| Markierung zurücknehmen | → wieder „Begonnen" |
| offener Ressourcen-Vorschlag | auf `?step=resources` **mit Beleg**, auf `/me/profile` **nicht** |
| Bearbeiten-Links aus „Das bist du" | alle neun landen in der richtigen Station |
| Anker `#basis` | springt an die Station |
| Deutsch / Englisch | beide vollständig, auch die verschachtelten Pluralformen |
| Fortschrittswörter im sichtbaren Text | 0 × „%", „von 5", „of 5", „Fortschritt" |

Dabei gefunden und behoben: vier Tippziele unter 44 px auf den Schrittseiten
(„Später fortsetzen" 20 px, „Ohne Beispiel fortfahren" 20 px, „Entfernen"
16 px) — dieselbe Regel wie seit Phase 2.1 auf „Das bist du".

**Testdaten entfernt**, danach nachgezählt: 0 Ressourcen, 0 Markierungen.

### Neue und nachgezogene Zusagen

`features/profile/__tests__/ueberDich.test.ts` (18 Fälle): fünf Stationen über
neun Schritten, kein Schritt doppelt · die große Station zeigt einen Status ·
jede abgeleitete Schwelle, einzeln · genau drei markierbare Bereiche · eine
Markierung überlebt spätere Änderungen · die Reihenfolge des Vorschlags, samt
dem Fall, den der Test gefunden hat · die Übersicht zählt nichts zusammen ·
jede Station hat einen Hauptweg · keine Erfassungsoberfläche ist nachgebaut ·
die alten Adressen stehen noch · beide Sprachen, und der dritte Zustand trägt
seine Einschränkung im Namen.

Drei vorhandene Wächter wurden **nachgezogen, nicht abgeschwächt**: Zwei
prüften die Regel „wartende Antworten vor dem nächsten Gespräch" an der Stelle,
an der sie vorher stand (`/profile`); sie prüfen sie jetzt dort, wo sie steht
(`aboutYou.ts`) — in beiden Teilen, Weg und Vorrang. Der dritte prüfte den
Ausgang aus dem Fluss und prüft jetzt zusätzlich, dass **jeder** Schritt einen
Weg zurück hat, nicht nur die drei im Dreischritt.

---

## 16. Migrationen und Reihenfolge

| # | Migration | Inhalt | Zustand |
|---|---|---|---|
| 1 | `20261092120000_person_core_is_the_source.sql` | Bio 1200, Rückwege weg | **auf Produktion** |
| 2 | `20261093120000_identity_flows_one_way.sql` | letzter Rückweg weg | **auf Produktion** |
| 3 | `20261094120000_person_section_marks.sql` | die kleine Markierung | **neu, noch nicht ausgerollt** |

Migration 3 hängt an nichts und nichts hängt an ihr: Sie legt eine Tabelle an,
die es vorher nicht gab. **Sie darf vor dem Code live gehen** — ohne ihn wird
sie nicht gelesen. Umgekehrt nicht: Ohne die Tabelle liefe
`getSectionMarks` in seinen `catch` und gäbe eine leere Menge zurück; die
Seite stünde, aber „für jetzt fertig" ließe sich nirgends setzen, und der
Knopf meldete keinen Fehler.

Die sichere Reihenfolge ist deshalb: **erst `npx supabase db push`, dann den
Code.** Das ist die Umkehrung von Phase 1.5 — dort hing der Code an der
Migration, hier die Oberfläche an der Tabelle.

Nicht deployt. Das bleibt ein manueller Schritt.
