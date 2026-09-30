# „Über dich" — Guided Founder Profile Builder, Spec v0.1

**Stand 30.09.2026.** UX- und Datenspezifikation für die Erfassungs- und
Pflegeebene. Grundlage ist ausschließlich
`docs/das-bist-du-bestandsaufnahme-v2.md` (gemessener Ist-Zustand), nicht die
älteren Planungsdokumente.

Noch nicht implementieren. Offene Entscheidungen stehen in §11.

---

## 1. Was „Über dich" ist — und was daneben liegt

| | „Über dich" | „Das bist du" |
|---|---|---|
| Aufgabe | erfassen, ergänzen, pflegen | verstehen, zeigen, weitergeben |
| Frage der Person | „Was fehlt noch, und wie mache ich weiter?" | „Was ist daraus geworden?" |
| Schreibt | ja | nein |
| Reihenfolge | geführt, unterbrechbar | frei, Zusammenfassung zuerst |
| Route heute | `/profile` (+ `/profile/interview`, `/profile/direction`, `/founder-alignment/profil`) | `/me/profile` |

**„Über dich" ist kein Pflicht-Onboarding.** Jedes Modul der Plattform bleibt
ohne es nutzbar: FIND braucht ein FIND-Profil, Connect ein Connect-Profil, und
beide holen ihre Identität aus `person_core` — ob jemand darüber hinaus etwas
gepflegt hat, ist ihre Sache. Der Einstieg (`ProfileBasicsForm`
`mode="onboarding"`) bleibt, wo er ist; ein Einstieg ist etwas anderes als ein
Editor.

**Was „Über dich" ausdrücklich nicht wird:**

- kein Vollständigkeitsprozent, kein Fortschrittsbalken über alles. Der
  Prozentwert war schon einmal da und wurde entfernt, weil seine Gewichte frei
  gewählt waren (`features/profile/profileCompletion.ts`, Kopfkommentar). Eine
  Kapitelliste mit drei Zuständen ist etwas anderes als eine Zahl: Sie sagt
  „hier steht noch nichts", nicht „du bist zu 68 % du selbst".
- kein Zwang zur Reihenfolge und kein Abschluss. Es gibt kein „abgeben".
- keine Einwilligungs- oder Veröffentlichungsentscheidungen. Die bleiben im
  jeweiligen Kontext — dieselbe Trennung, die
  `docs/profile-consolidation-plan.md` §2 begründet, und der Grund ist
  unverändert: Ein zentraler Sichtbarkeitsschalter ist der schnellste Weg,
  eine kontextbezogene Freigabe zu verlieren.

---

## 2. Neun Kapitel

Die Reihenfolge ist ein Weg, keine Ablage: erst wer, dann wie, dann was, dann
wohin. Innerhalb der Fähigkeiten folgt sie der Logik des Modells — erst welche
Bereiche, dann wie tief, dann was davon man will.

| # | Kapitel | Frage an die Person | Datenquelle | Art |
|---|---|---|---|---|
| 1 | **Wer du bist** | Name, eine Zeile über dich, wo du arbeitest | `person_core` | Formular |
| 2 | **Wie du arbeitest** | 16 Fragen zu Entscheiden, Erproben, Widersprechen | `alignment_answers` (`founder-profile-v1`) | Fragebogen, 7 Schritte |
| 3 | **Woran du erkennst, was du kannst** | 8 erzählte Situationen | `capability_interview_*` | Gespräch |
| 4 | **Welche Bereiche du abdeckst** | Bereiche aus 11 Familien wählen | `person_capability_entries.area_id` | Auswahl |
| 5 | **Wie weit du damit gekommen bist** | Erfahrungsstufe 1–5 je Bereich | `…entries.application_level` | ein Durchgang |
| 6 | **Was du davon verantworten willst** | Verantwortungswunsch je Bereich | `…entries.ownership_wish` | ein Durchgang |
| 7 | **Deine Stärken** | Sätze über deine Arbeitsweise, selbst und von außen | `person_strengths` | Liste + Gespräch |
| 8 | **Was dich antreibt** | 6 Fragen nach dem, was immer wiederkommt | `direction_statements` | Gespräch |
| 9 | **Was du mitbringst** | Netzwerk, Zugänge, Angebote | `person_resources` | Liste + Vorschläge |

### 2.1 Warum 4, 5 und 6 drei Kapitel sind und nicht eins

Alle drei schreiben in **dieselbe Tabelle** (`person_capability_entries`,
Spalten `area_id`, `application_level`, `ownership_wish`). Sie trotzdem zu
trennen ist keine Zerlegung um der Schrittzahl willen, sondern folgt dem
tragenden Satz des Modells: **Können ist nicht Wollen.** Wer beide Fragen auf
einem Bildschirm beantwortet, beantwortet die zweite im Licht der ersten —
hohe Stufe, also will ich das auch. Der Snapshot auf `/profile` macht es heute
schon in drei Schritten (`?step=evidence|areas|ownership`); diese Spec
übernimmt das und gibt den Schritten nur eigene Kapitelnamen.

### 2.2 Warum die Arbeitsweise (2) vor dem Gespräch (3) steht

Sie ist geschlossen, dauert absehbar lange und hat ein sichtbares Ende. Das
Gespräch ist offen und kostet Nachdenken. Wer zuerst etwas Abschließbares
erlebt hat, geht eher ins Offene.

### 2.3 Was hier ausdrücklich nicht dazugehört

| Nicht in „Über dich" | Wo stattdessen | Warum |
|---|---|---|
| Venture-Alignment (43 Items) | `/founder-alignment/vorhaben` | Gilt für ein Vorhaben und einen Zeitraum, nicht für die Person. Auch die Items L01–L03 („persönliche Grenzen") — sie *lesen* sich personenbezogen, liegen aber venture-gebunden. |
| FIND- und Connect-Kontextangaben | `/discovery/profile`, `/connect/profile` | Veröffentlichungsentscheidungen bleiben im Kontext. |
| FIND-Suchkriterien und Themen-Präferenzen | `/discovery/suche` | Privat, und eine Aussage über die Suche, nicht über die Person. |
| Foto, LinkedIn-Sichtbarkeit, Freigabestufe der Fähigkeiten | eigener Abschnitt „Wer was sieht" am Ende, ohne Kapitelstatus | Sichtbarkeit ist keine Angabe über die Person. |
| v1-Fragebogen und v1-Werte | `/me/base`, `/me/values` | Altbestand. Erscheint nur, wer ihn schon kennt (§9). |

---

## 3. Der Status je Kapitel

Drei Zustände, mehr nicht: **noch offen · begonnen · für jetzt fertig.**

„Für jetzt fertig" ist mit Absicht so formuliert. Ein Profil ist nie fertig,
und ein Häkchen, das „fertig" behauptet, macht jede spätere Änderung zum
Rückschritt.

### 3.1 Was sich ableiten lässt

| Kapitel | begonnen, wenn | für jetzt fertig, wenn |
|---|---|---|
| 1 Wer du bist | irgendein Feld gesetzt | `getIdentityGaps(core)` ist leer (`features/profile/identityReadiness.ts`) |
| 2 Wie du arbeitest | ≥ 1 Antwort in `alignment_answers` | `assessments.submitted_at` gesetzt |
| 3 Gespräch | Sitzung offen | `capability_interview_sessions.completed_at` gesetzt **und** keine unsortierten Antworten (`getUnsortedInterviewAnswers`) |
| 4 Bereiche | ≥ 1 `person_capability_entries` | — **nicht ableitbar** |
| 5 Erfahrung | ≥ 1 `application_level` | alle Einträge haben eine Stufe |
| 6 Verantwortung | ≥ 1 `ownership_wish` | alle Einträge haben einen Wunsch |
| 7 Stärken | ≥ 1 `person_strengths` | — **nicht ableitbar** |
| 8 Was dich antreibt | ≥ 1 Antwort | ≥ `DIRECTION_MIN_ANSWERS` (= 4 von 6) beantwortet |
| 9 Was du mitbringst | ≥ 1 `person_resources` | — **nicht ableitbar** |

Sechs von neun Kapiteln tragen ihr Ende schon in den Daten. Für drei gibt es
keins: „Ich habe genug Bereiche eingetragen", „Ich habe genug Stärken benannt",
„Mehr Zugänge habe ich nicht" sind Aussagen der Person und keine Eigenschaft
der Zeilen.

### 3.2 Die einzige neue Tabelle, die diese Spec vorschlägt

```sql
create table public.person_section_marks (
  user_id  uuid   not null references auth.users(id) on delete cascade,
  section  text   not null,   -- Kapitelkennung, im Code aufgezählt
  marked_at timestamptz not null default now(),
  primary key (user_id, section)
);
```

Eine Zeile heißt: „Damit bin ich für jetzt durch." Kein Status, kein Fortschritt
— ein Zeitpunkt. Wer danach etwas ändert, bleibt „für jetzt fertig"; wer das
Häkchen wegnimmt, löscht die Zeile.

**Warum sie überhaupt nötig ist.** Die Alternative wäre, den dritten Zustand
für diese drei Kapitel wegzulassen. Dann bliebe genau dort „begonnen" stehen,
wo jemand fertig ist — und die Kapitelliste sagte einer Person dauerhaft, sie
sei mit ihren Stärken noch nicht durch. Das ist nicht „die UX fände es
praktisch", das ist eine Angabe, die es sonst nirgends gibt.

**Warum sie so klein ist.** Kein `status`-Feld, keine Zählwerte, kein
`updated_at`: Alles andere ist aus den Fachtabellen ableitbar, und was
ableitbar ist, wird nicht gespeichert.

Entscheidung dazu: §11.1.

---

## 4. Wie man unterbricht und weitermacht

Es gibt nichts zu speichern, um weiterzumachen: **Jedes Kapitel schreibt
sofort in seine Fachtabelle.** Die Kapitelübersicht liest den Zustand bei jedem
Aufruf neu. Damit ist „unterbrechbar und fortsetzbar" keine Funktion, sondern
eine Eigenschaft.

Zwei Dinge, die es dafür braucht:

1. **Ein Einstiegspunkt, der weiß, wo man stehengeblieben ist.** Die Übersicht
   hebt das erste Kapitel hervor, das nicht „für jetzt fertig" ist — als
   Vorschlag, nicht als Sperre. Alle anderen bleiben anklickbar.
2. **Kein Fortschritt innerhalb eines Kapitels, der verlorengehen kann.** Der
   ALIGN-Bogen speichert heute je Antwort mit 2000 ms Verzögerung und
   zusätzlich beim Verlassen des Feldes (`Questionnaire.tsx`); der
   Capability-Snapshot speichert je Schritt. Beides bleibt. Neu ist nur, dass
   die Rückkehr aus einem Kapitel wieder in der Übersicht landet.

Was „für jetzt fertig" **nicht** tut: Es klappt nichts zu, sperrt nichts und
versteckt nichts. Ein fertiges Kapitel bleibt offen anklickbar und zeigt oben
seinen Payoff (§6).

---

## 5. Was bereits vorhanden ist und nur zusammengeführt wird

| Kapitel | vorhandene Oberfläche | Zustand |
|---|---|---|
| 1 Wer du bist | `/profile` Abschnitt „Wer du bist" (`saveIdentityAction`) | vollständig, wird nur umgehängt |
| 2 Wie du arbeitest | `/founder-alignment/profil`, 7 Schritte | vollständig, liegt heute in einem anderen Menübereich |
| 3 Gespräch | `/profile/interview` + `/profile/interview/sort` | vollständig |
| 4 Bereiche | `/profile?step=areas` (`CapabilityAreaPicker`) | vollständig |
| 5 Erfahrung | `/profile?step=evidence` | vollständig |
| 6 Verantwortung | `/profile?step=ownership` | vollständig |
| 7 Stärken | `/profile` (`StrengthsSection`) + Vorschläge | vollständig |
| 8 Was dich antreibt | `/profile/direction` | vollständig |
| 9 Was du mitbringst | `/connect/profile` (`ResourceProposalSection`) | vorhanden, **am falschen Ort** |

**Neu zu bauen ist im Kern eine Seite**: die Kapitelübersicht mit Status und
Payoff. Alles darunter existiert. Das ist der wichtigste Befund dieser Spec —
„Über dich" ist zu etwa 85 % eine Verdrahtungsarbeit.

### 5.1 Bestehende Daten erkennen, statt erneut zu fragen

Drei Wege, alle schon im Code:

1. **Der Status je Kapitel** (§3) ist nichts anderes als „was ist schon da".
   Ein Kapitel mit Daten fragt nicht von vorn, es zeigt den Bestand und lässt
   ihn ändern.
2. **Der LinkedIn-/CV-Import** (`CvImportField`, `LinkedInField`) füllt
   Expertise und Branchen vor. Er bleibt, wo er ist: in Kapitel 1.
3. **Modellvorschläge** aus den Gesprächen tragen ihren Beleg und werden
   einzeln bestätigt (§7). Ein bestätigter Vorschlag ist vorhandener Bestand
   und wird nicht noch einmal gefragt; ein verworfener kommt nicht wieder
   (`status = 'rejected'` bleibt in der Tabelle stehen, genau dafür).

---

## 6. Der Payoff nach jedem Kapitel

Nach jedem Kapitel steht **ein** Satz oder **ein** kleines Bild über das, was
gerade entstanden ist — aus den eigenen Angaben, ohne Zahl und ohne Urteil.

| Kapitel | Payoff | woher, ohne Neubau |
|---|---|---|
| 1 Wer du bist | die eigene Kurzvorstellung, so wie andere sie sehen | `FounderProfileBase` |
| 2 Wie du arbeitest | die `WorkMap` — ein Punkt je Antwort auf einer Achse | `AlignMaps.WorkMap`, existiert |
| 3 Gespräch | „Aus deinen Erzählungen sind N Bereiche vorgeschlagen worden" | `InterviewSummaryView`, existiert |
| 4 Bereiche | die Deckungskarte je Familie | `CoverageMap`, existiert |
| 5 Erfahrung | „In N Bereichen hast du Tiefe eingetragen" + die Befunde | `capabilityReadout`, existiert |
| 6 Verantwortung | „Welche Rollen du abdeckst" nach Faltin | `founderProfileCoverage`, existiert |
| 7 Stärken | die Sätze, Selbstsicht und Fremdsicht nebeneinander | `FounderProfileStrengths`, existiert |
| 8 Was dich antreibt | die Sätze nach Facette | `FounderProfileDirection`, existiert |
| 9 Was du mitbringst | die bestätigten Zugänge als Liste | `ResourceProposalSection` (Teil „bestätigt") |

Alle neun Payoffs sind bereits gebaute Bausteine. Sie stehen heute nur an
anderen Stellen — meist auf `/me/profile`, also *nach* dem Erfassen und nicht
*währenddessen*.

**Was ein Payoff nicht ist:** keine Punktzahl, kein „gut gemacht", keine
Einordnung gegen andere, keine Vorhersage. Er zeigt, was dasteht — mehr nicht.
Nach Kapitel 2 steht deshalb die `WorkMap` und kein Satz darüber, was für ein
Mensch daraus spricht.

---

## 7. Wo Modell-Unterstützung sinnvoll ist — und wo nicht

| Kapitel | Modell | warum |
|---|---|---|
| 3 Gespräch | **ja** — Bereichsvorschläge aus der Erzählung, mit Zitat | 54 Bereiche selbst durchzugehen ist die Arbeit, die niemand macht |
| 7 Stärken | **ja** — Stärkenvorschläge aus derselben Erzählung, mit Zitat | „Nenne deine Stärken" beantwortet, wer sich zu loben traut |
| 8 Was dich antreibt | **ja** — Satzvorschläge je Facette, mit Zitat; dazu ein Regelweg ohne Modell | ein Motiv in einen Satz zu fassen ist die schwerste Stelle |
| 9 Was du mitbringst | **ja** — Vorschläge aus eigenen veröffentlichten Texten, mit Zitat | die Person hat es schon geschrieben, nur nicht als Eintrag |
| 1, 2, 4, 5, 6 | **nein** | Dort steht keine Erzählung, aus der etwas zu belegen wäre. Ein Vorschlag ohne Zitat wäre eine Behauptung. |

Vier feste Regeln, alle heute schon eingehalten:

1. **Kein Vorschlag ohne Beleg.** `evidence_quote` ist in allen drei
   Vorschlagstabellen `not null`.
2. **Kein Vorschlag wird vorausgewählt.** Es gibt kein Formular, das man
   versehentlich abschickt.
3. **Unbestätigt existiert nicht.** Bis eine Person bestätigt hat, liest keine
   andere Stelle im Produkt den Vorschlag. Kein Payoff, keine Suche, kein
   Profil, kein PDF.
4. **Ohne Modell geht es weiter.** Beide Gespräche haben einen geschriebenen
   Weg: Einordnen von Hand, vorformulierte Nachfragen, Regelvorschläge.

---

## 8. Oberfläche

### 8.1 Die Übersicht

Eine Liste, kein Kachelraster: neun Zeilen mit Kapitelname, einem Satz „worum
es geht", Status und — wenn vorhanden — einer Zeile Bestand („6 Bereiche, 4
davon mit Stufe"). Das erste nicht fertige Kapitel steht hervorgehoben.

Warum eine Liste: Neun Kacheln sind eine Wand, und eine Wand liest niemand.
Genau dieser Befund führte am 24.09.2026 zum Umbau von `/me/profile` („viel zu
erschlagend").

### 8.2 Innerhalb eines Kapitels

Oben der Kapitelname und ein Satz, wozu das gut ist. Darunter der vorhandene
Baustein, unverändert. Unten drei Dinge nebeneinander:

`Zurück zur Übersicht` · `Für jetzt fertig` (Häkchen, kein Knopf mit Folgen) ·
`Weiter zu <nächstes Kapitel>`.

Kein „Überspringen": Nichts hier ist Pflicht, also gibt es nichts zu
überspringen. Wer nicht will, geht zurück.

### 8.3 Mobil

Die Liste ist einspaltig und bleibt es. Innerhalb eines Kapitels gilt, was
schon gilt: 44 px Mindesthöhe für alles Anklickbare, keine nebeneinander
liegenden Auswahlspalten, ein Gedanke je Bildschirm. Kapitel 5 und 6 gehen je
Bereich vor, nicht als Tabelle — eine 54-zeilige Tabelle mit zwei Auswahlen
funktioniert auf keinem Telefon.

### 8.4 Wo „Über dich" im Menü steht

Heute steht `/profile` in der oberen Hilfsleiste neben „Nachrichten" und im
Kontomenü, `/me/profile` dagegen unter **Align → Gesamtbild**. Zwei Seiten
über dieselbe Person an zwei nicht benachbarten Orten.

Vorschlag: **beide unter Align, nebeneinander** — „Über dich" und „Das bist
du", in dieser Reihenfolge. Damit lesen sich die Untereinträge als Weg: erst
füllen, dann ansehen, dann Verbindungen, dann Bibliothek. Der Eintrag im
Kontomenü („Profil bearbeiten") bleibt als zweiter Weg bestehen.

Offen bleibt, was das für Menschen heißt, die nur Connect nutzen (`hasFounder`
ist dann falsch und der Align-Bereich fehlt ganz). Siehe §11.4.

---

## 9. Der Altbestand in „Über dich"

Der v1-Fragebogen (`/me/base`) und die v1-Werte (`/me/values`) sind **kein
Kapitel**. Wer sie kennt, findet sie weiter, wo sie heute stehen: im
Dashboard-Block, der nur bei `alignState.knowsPrevious` erscheint. Wer neu
anfängt, sieht sie nie und vermisst nichts.

Sie in die Kapitelliste aufzunehmen hieße, neuen Menschen ein leeres Kapitel zu
zeigen, das sie nicht füllen können — und alten Menschen zwei Kapitel für
dieselbe Frage.

---

## 10. Was diese Spec ausdrücklich nicht vorschlägt

- **Keine neue Erfassungsoberfläche.** Alle neun Kapitel haben eine.
- **Keine Zusammenlegung der Fachtabellen.** Neun Kapitel, acht Tabellen, keine
  neue außer §3.2.
- **Keinen Assistenten, der durch alles führt und am Ende „fertig" sagt.**
  Es gibt kein Ende.
- **Keinen Gesamtstatus.** „7 von 9 Kapiteln" wäre die Prozentzahl in anderer
  Schreibweise.
- **Keine Kopie von Daten nach „Über dich".** Die Seite liest und schreibt in
  die Fachtabellen, sie hat keinen eigenen Speicher.

---

## 11. Offene Entscheidungen

**11.1 `person_section_marks` — ja oder nein?**
Ohne sie fehlt drei Kapiteln der dritte Zustand, und die Liste sagt dauerhaft
„begonnen", wo jemand fertig ist. Mit ihr gibt es eine Tabelle, die nur einen
Zeitpunkt trägt. Empfehlung: ja, in der Fassung aus §3.2 — nicht größer.

**11.2 Gehört Kapitel 9 (Ressourcen) wirklich hierher?**
`person_resources` entsteht heute aus Connect-Texten und wird auf
`/connect/profile` bestätigt. Als Personenangabe gehört es nach „Über dich";
als Sache, die nur in Connect entsteht und nur dort wirkt, gehört es dorthin,
wo es ist. Empfehlung: Pflege nach „Über dich", die Bestätigung von Vorschlägen
bleibt zusätzlich in Connect sichtbar — ein Vorschlag soll dort auftauchen, wo
sein Anlass steht.

**11.3 Was passiert mit `focus_skill` und `intention`?**
Beide werden im Einstieg erhoben, nirgends gezeigt und steuern nur eine Weiche
(`isCoreProfileComplete`). Entweder sie bekommen in Kapitel 1 einen sichtbaren
Ort, oder die Weiche wird auf `person_core` umgestellt und die Spalten fallen.
Diese Spec entscheidet das nicht; sie stellt nur fest, dass ein geführter
Aufbau die erste Gelegenheit seit einem Jahr ist, bei der es auffällt.

**11.4 Wer sieht „Über dich"?**
Heute ist `/profile` für alle da (auch für Connect-only), `/me/profile` nur bei
`hasFounder`. Wenn beide nebeneinander unter Align stehen, verliert Connect-only
den Zugang zu einer Seite, die es heute hat. Möglich: „Über dich" bleibt
zusätzlich in der Hilfsleiste.

**11.5 Heißt Kapitel 2 „Wie du arbeitest" oder bleibt es „Neue Fassung
(Test)"?**
Solange `founder-profile-v1` `status = 'draft'` ist und die Seiten „Testfassung"
tragen, wäre ein Kapitel ohne diesen Hinweis ein Versprechen, das der Status
nicht deckt. Die Entscheidung über den Status ist eine Produktentscheidung, und
sie blockiert die Kapitelbenennung.
