# Ressourcen von Hand — Phase 3.1

**Stand:** 01.10.2026 · **Branch:** `feat/ressourcen-von-hand` (auf
`feat/ueber-dich-phase-3`) · **Grundlage:** laufender Code und laufende lokale
Datenbank, dazu `ueber-dich-phase-3-implementation-report.md`

---

## 1. Wie sah `person_resources` vor dem Umbau aus?

Vollständig. Das ist der wichtigste Befund dieser Phase.

```
id              uuid        pk
user_id         uuid        → person_core(user_id), on delete cascade
kind            text        network | access | offer
label           text        3..160 Zeichen, btrim
origin          text        self | model          default 'self'
status          text        pending | confirmed | rejected   default 'confirmed'
evidence_quote  text        12..400 Zeichen, nur bei einem Modell
source_table    text
source_id       uuid
model           text
prompt_version  smallint
created_at      timestamptz
decided_at      timestamptz
```

Und — entscheidend — vier Bedingungen, die zusammen genau das erlauben, was
gebraucht wurde:

| Bedingung | was sie sagt |
|---|---|
| `person_resources_self_is_confirmed` | `origin = 'self'` **muss** `confirmed` sein |
| `person_resources_evidence_required` | nur ein Modell braucht einen Beleg |
| `person_resources_label_check` | 3 bis 160 Zeichen, nach `btrim` |
| `person_resources_unique_label` | je Person, Art und Text genau einmal — ohne Rücksicht auf Groß- und Kleinschreibung |

Dazu vier Policies: eigene Zeilen lesen, einfügen (**nur mit
`origin = 'self'`**), ändern und löschen.

**Es fehlte nie die Tabelle. Es fehlte das Formular.** Netzwerk, Zugänge und
Angebote entstanden bisher ausschließlich als Vorschläge aus den eigenen
Connect-Texten; wer dort nichts veröffentlicht hatte, konnte in diesem Bereich
nichts tun.

---

## 2. Musste das Schema verändert werden?

**Nein. Keine Migration in dieser Phase.**

Keine neue Spalte, kein neuer `origin`-Wert, kein neuer Status, keine zweite
Tabelle. Die Voreinstellungen `origin = 'self'` und `status = 'confirmed'`
waren von Anfang an für genau diesen Fall gesetzt.

---

## 3. Wie werden manuelle Ressourcen gespeichert?

Mit drei Spalten:

```ts
await client.from("person_resources").insert({ user_id, kind, label });
```

`origin` und `status` stehen **nicht** in der Einfügung. Sie kommen aus der
Voreinstellung — sie hier zu wiederholen hieße, dieselbe Entscheidung an zwei
Stellen zu pflegen, und die Zeilensicherheit lässt beim Einfügen ohnehin nur
`origin = 'self'` zu.

Damit ist ein selbst eingetragener Satz sofort `confirmed`. Das ist keine
Abkürzung: Es gibt nichts zu bestätigen, wenn die Person selbst die Quelle
ist. Ein pgTAP-Fall hält das seit der ersten Fassung fest — *„and needs no
confirmation — the person is the evidence"*.

---

## 4. Welcher `origin` wird verwendet?

`self` — der vorhandene Wert. Kein neuer.

**Und `origin` wird nirgends geschrieben.** Beim Anlegen nicht (Voreinstellung
plus Policy), beim Ändern nicht. Die Herkunft einer Zeile hängt nicht davon
ab, dass jemand sie später angefasst hat; ein stilles Überschreiben machte aus
einem bestätigten Modellvorschlag rückwirkend eine eigene Eingabe.

Ein Test prüft das an der Quelle: In der `insert`-Klammer darf `origin` nicht
vorkommen, in der `update`-Klammer auch nicht.

---

## 5. Wie funktionieren Bearbeiten und Löschen?

**Bearbeiten** ändert Art und Text einer eigenen Zeile — ein `update`, keine
neue Zeile:

```ts
.update({ kind, label })
.eq("id", id)
.eq("user_id", user.id)
.eq("origin", "self")
```

**Löschen** ist ein echtes `delete`. Kein Soft Delete: `rejected` ist der
Zustand eines *Vorschlags*, den jemand nicht wollte, und er bleibt stehen,
damit derselbe Vorschlag nicht wiederkommt. Ein eigener Eintrag hat nichts,
was wiederkommen könnte; ihn als „abgelehnt" aufzubewahren wäre ein Archiv, um
das niemand gebeten hat.

Vor dem Entfernen steht eine Rückfrage — derselbe `ConfirmSubmitButton` wie
beim Löschen eines erzählten Belegs. Kein Modal, kein `window.confirm`: zwei
Klicks mit einer Frage dazwischen, die sich abbrechen lässt, und ohne
JavaScript bleibt es ein gewöhnlicher Absende-Knopf.

### Ein bestätigter Modellvorschlag lässt sich nicht umschreiben

Das ist die Stelle aus Abschnitt 4 der Aufgabe — *„wenn das aktuelle Modell
eine bearbeitete bestätigte AI-Ressource nicht sauber darstellen kann:
dokumentieren und die minimal sichere Variante wählen."*

Es kann sie nicht sauber darstellen. Die Zeile trägt ihr Zitat: die Stelle im
eigenen Text, auf die sie sich stützt. Schriebe man den Satz um, stünde daneben
ein Beleg für etwas anderes. Entfernen lässt sich der Beleg nicht —
`person_resources_evidence_required` verlangt ihn für `origin = 'model'`.
Bliebe, `origin` auf `self` zu drehen, und das ist genau das stille
Überschreiben aus Punkt 4.

**Gewählt:** Modellzeilen lassen sich **löschen, nicht ändern**. Sie tragen
keinen „Bearbeiten"-Knopf und eine Zeile, die sagt, woher sie kommen. Wer den
Satz anders haben will, verwirft ihn und schreibt seinen eigenen — und dann ist
das Ergebnis ehrlich eine eigene Eingabe.

*Nicht gewählt:* ein dritter `origin`-Wert `edited_proposal`, wie ihn
`person_strengths` und `direction_statements` kennen. Er wäre die saubere
Lösung, kostet aber eine Migration an einer Bedingung, die heute Schäden
verhindert — und stand nicht im Auftrag.

---

## 6. Wie werden eigene Einträge und Vorschläge unterschieden?

Zwei Abschnitte, in dieser Reihenfolge:

```
Deine Ressourcen          alles Bestätigte - eigenes und übernommenes
                          je Zeile: Art · Satz · [Bearbeiten] · [Entfernen]

Zugänge und Netzwerke     nur noch, was auf eine Entscheidung wartet
  VORGESCHLAGEN           je Vorschlag sein Beleg, [Stimmt, übernehmen] [Verwerfen]
```

Was dasteht, gehört der Person; was vorgeschlagen ist, wartet auf eine
Entscheidung und ist deshalb das Zweite.

**Ein selbst eingetragener Satz erscheint nie unter „Vorschläge".** Er ist
keiner — es gibt niemanden, der ihn vorgeschlagen hätte, und der Abschnitt
filtert nach `status === "pending"`.

`ResourceProposalSection` hat dafür ein `showConfirmed` bekommen, auf
`/profile` `false`. In Connect bleibt es `true` und damit alles, wie es war.
Dieselben Sätze ein zweites Mal zu zeigen, nur ohne Knöpfe, wäre genau die
Doppelung, die auf „Das bist du" in Phase 2.1 entfernt wurde.

**Die drei Namen sind dieselben wie auf „Das bist du"**
(`profile.founderProfile.resources.kinds`: Netzwerk · Zugänge · Angebote).
Dieselbe Sache an zwei Orten verschieden zu benennen wäre eine zweite Sache.

---

## 7. Wie bleibt Connect angebunden?

Unverändert. Es wurde dort nichts angefasst außer dem neuen Vorgabewert
`showConfirmed = true`, der genau das bisherige Verhalten ist.

```
person_resources            kanonisch, eine Tabelle
    ├── /connect/profile      wo Vorschläge ENTSTEHEN — offene und bestätigte, wie bisher
    └── /profile?step=resources   wo sie HINGEHÖREN — plus eigene Einträge
```

Keine Kopie, keine Synchronisation, kein zweites Modell. Beide Oberflächen
arbeiten auf denselben Zeilen: Ein Vorschlag, der in Connect entsteht, lässt
sich auf beiden Seiten bestätigen, und das Ergebnis steht auf beiden.

---

## 8. Wie erscheinen die Daten auf „Das bist du"?

Von selbst. `/me/profile` wurde **nicht** angefasst.

Die Seite liest `person_resources` und filtert `status === "confirmed"` — und
ein manuell eingetragener Satz ist genau das, ab der Sekunde, in der er
gespeichert ist.

Im Browser nachgemessen:

| | |
|---|---|
| eigene Ressource erscheint | ✓ |
| bearbeitete Fassung erscheint | ✓ („… Berlin und Brandenburg") |
| übernommener Vorschlag erscheint | ✓ |
| offener Vorschlag erscheint | **nicht** |
| gelöschte Ressource verschwindet | ✓ |

---

## 9. Welche Validation und Textgrenzen gelten?

**Die, die schon da waren.** `person_resources_label_check` prüft
`char_length(btrim(label))` zwischen 3 und 160 — dieselben Zahlen standen seit
der Vorschlagsmechanik auch in `resourceExtraction.ts`, dort allerdings zweimal
von Hand (`label.length < 3`, `MAX_LABEL_LENGTH = 160`).

Sie stehen jetzt einmal und werden exportiert:

```ts
export const RESOURCE_LABEL_MIN = 3;
export const RESOURCE_LABEL_MAX = 160;
```

Drei Stellen, eine Zahl: die Prüfung der Modellvorschläge, das `maxLength` des
Eingabefelds und die Serveraktion. Ein Test prüft, dass keine der Zahlen
irgendwo noch einmal von Hand dasteht.

**Leer ist keine Eingabe.** Die Aktion trimmt wie die Datenbank und weist
alles unter drei Zeichen ab — mit einem Satz, den man versteht („Bitte wähle
eine Art und schreibe einen kurzen Satz dazu."), statt mit einer
Constraint-Verletzung. Ein pgTAP-Fall hält zusätzlich fest, dass auch der Weg
am Formular vorbei abgewiesen wird.

**Dubletten** fangen die Aktion und die Bedingung gemeinsam ab: „Das steht
schon genau so bei dir." Im Browser geprüft, auch mit anderer
Groß- und Kleinschreibung.

---

## 10. Welche Tests wurden ergänzt?

**pgTAP** — `supabase/tests/person_resources.sql`, von 14 auf 21 Fälle:

* der eigene Eintrag lässt sich ändern, Art eingeschlossen
* und seine Herkunft bleibt, was sie war
* ein Text aus Leerzeichen wird abgewiesen
* derselbe Eintrag zweimal wird abgewiesen — unabhängig von Schreibweise und Leerzeichen
* eine fremde Ressource lässt sich **weder ändern noch löschen**
* löschen heißt weg, nicht versteckt
* und es nimmt nichts anderes mit

**Node** — `features/profile/__tests__/eigeneRessourcen.test.ts`, 11 Fälle:
nur `person_resources` und drei Arten · beim Anlegen drei Spalten, `origin`
und `status` nicht · die Herkunft wird nie überschrieben, und nur eigene
Zeilen tragen „Bearbeiten" · entfernen heißt entfernen · leer wird nicht
gespeichert, und die Grenzen kommen aus einer Quelle · zwei getrennte Listen ·
ein offener Vorschlag steht nirgends wie eine Angabe der Person · die
Markierung überlebt das Pflegen · Tippziele ≥ 44 px · beide Sprachen samt
Rückmeldungen, und alle Schlüssel gehen durch die Allowlists der Seite · der
Leerzustand hängt nicht mehr an Connect.

### Ein Fund nebenbei

Ein Test fand eine Zeile nicht, die dasteht. Ursache: der Kommentar

```
// Muessen mit den Schluesseln in messages/*/capability.json uebereinstimmen.
```

Das `/*` darin ist für jede Testhilfe, die Blockkommentare entfernt, ein
geöffneter Kommentar — und ab dort verschwand lautlos der halbe Rest der
Datei. Jede Zusage, die diesen Teil der Seite geprüft hätte, wäre leer
durchgelaufen. Der Stern ist raus.

---

## 11. Was wurde bewusst nicht gebaut?

Alles aus Abschnitt 15: kein zweites Ressourcenmodell, keine Tags oder
Kategorien neben den drei Arten, keine Priorisierung, keine Scores, keine
KI-Erzeugung, keine Advisor-Freigabe, keine öffentliche Seite, keine
FIND-Anbindung, keine PDF-Anpassung, keine neue Navigation, keine Änderung an
Capability, Direction, Strengths, `focus_skill` oder `intention`.

Dazu drei Entscheidungen innerhalb des Auftrags:

**Bestätigte Modellvorschläge sind nicht bearbeitbar** — Begründung in Punkt 5.

**Keine Sichtbarkeitslogik.** `person_resources` wird weiterhin ausschließlich
privat gelesen; ein manueller Eintrag folgt derselben Regel wie jeder andere
bestätigte. Nichts wird durch das Eintragen veröffentlicht, und der Satz
„Sichtbar ist das bisher nur für dich" steht über der Liste.

**Die Markierung bleibt unberührt.** Hinzufügen, Ändern und Entfernen fassen
`person_section_marks` nicht an. „Für jetzt fertig" heißt nicht „für immer
abgeschlossen"; ein Profil, das sich beim Pflegen selbst zurückstuft, bestraft
das Pflegen. Im Browser geprüft: Die Markierung überlebt eine Änderung.

---

## 12. Ist danach alles bereit für die PDF-Phase?

**Ja — und diese Phase hat dafür eine Lücke geschlossen, die vorher niemandem
auffiel.**

Bis heute konnte ein Mensch ohne Connect-Texte in „Netzwerk, Zugänge &
Ressourcen" gar nichts eintragen. Auf „Das bist du" entfällt der Abschnitt
dann vollständig — und in einer PDF-Fassung hätte er ebenfalls gefehlt, ohne
dass irgendwo stünde, dass es daran lag, dass es keinen Weg gab, etwas
einzutragen.

Für die PDF-Phase gilt unverändert:

* `/me/profile` liest `status = 'confirmed'`. Manuelle und übernommene
  Einträge sehen dort gleich aus — zu Recht: Beides sind Angaben, die die
  Person verantwortet.
* **Das Zitat gehört nicht ins PDF.** Es ist die Begründung eines Vorschlags
  und steht nur dort, wo entschieden wird. In einer weitergegebenen Fassung
  wäre es ein Beleg, den niemand angefordert hat.
* **Die Herkunftszeile auch nicht.** „Aus einem Vorschlag übernommen" ist eine
  Auskunft über die Entstehung für die Person selbst.

---

## 13. Was geprüft wurde

```
npm run ci:check     tsc --noEmit · 2552 Tests · next build · 1311 DB-Tests
                     alles grün
```

**Im Browser gerendert** (Chrome 154 headless, echte Anmeldung), bei
320 / 375 / 1024 px:

| geprüft | Ergebnis |
|---|---|
| Leerzustand ohne Connect-Bezug, Formular offen | ✓ |
| Netzwerk, Zugang und Angebot von Hand eintragen | drei Einträge, je mit Art, Bearbeiten und Entfernen |
| manuelle Einträge sofort bestätigt | ✓ (keine Herkunftszeile, kein Vorschlagsabschnitt) |
| leere Eingabe | abgewiesen, Anzahl bleibt 3 |
| Dublette in anderer Schreibweise | abgewiesen, Anzahl bleibt 3 |
| bearbeiten: Art **und** Text ändern | ✓, Markierung bleibt |
| Vorschlag bestätigen | wandert nach „Deine Ressourcen", mit Herkunftszeile, **ohne** Bearbeiten |
| entfernen (zwei Klicks) | weg — auf beiden Seiten |
| „Das bist du" | eigene + bearbeitete + übernommene da, offener Vorschlag nicht |
| Deutsch / Englisch | vollständig, keine rohen Schlüssel |
| 320 / 375 / 1024 px | kein Überlauf, 0 Tippziele unter 44 px |

Bei der Messung dieselbe Falle wie in Phase 2.1: `innerText` liefert Text
durch `text-transform: uppercase` hindurch, und die erste Suche nach
„Vorgeschlagen" lief großschreibungsempfindlich ins Leere. Nachgemessen ohne
Großschreibung.

**Testdaten entfernt**, danach nachgezählt: 0 Ressourcen, 0 Markierungen.

---

## 14. Branch und Reihenfolge

`feat/ressourcen-von-hand` baut auf `feat/ueber-dich-phase-3` auf, das auf
`origin` liegt und noch nicht in `main` ist.

**Keine Migration in dieser Phase.** Es bleibt bei der Reihenfolge aus Phase 3:
erst `npx supabase db push` (wegen `person_section_marks`), dann der Code.
Dieser Teil hier hängt an keiner Änderung der Datenbank.

Nicht deployt. Das bleibt ein manueller Schritt.
