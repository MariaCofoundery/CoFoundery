# Matching Engine v0.1 – Referenzpaare

Stand: 13.10.2026. Daten: [`synthetic/reference_pairs.json`](synthetic/reference_pairs.json) (auch als CSV).
Wie die Paare entstehen und warum das nicht zirkulär ist, steht in [`matching-v0.1-synthetic-methodology.md`](matching-v0.1-synthetic-methodology.md), Abschnitte 5 und 6.

Keine Gesamtformel, keine Gewichte: Die Klasse kommt aus der Konstruktion, die Dimensionen werden einzeln und unabhängig davon annotiert.

## 1. Umfang

**439 Paare**, bewusst ausgewählt (nicht alle 19.900 möglichen Paare). 315 FIND-Paare (Personen), 124 CONNECT-Paare (konkreter Suche-↔-Angebot-Eintrag).

| Klasse | FIND | CONNECT | gesamt |
|---|---|---|---|
| excellent_candidate | 44 | 33 | 77 |
| promising | 53 | 24 | 77 |
| worth_exploring | 55 | – | 55 |
| asymmetric | 44 | – | 44 |
| low_relevance | 50 | 40 | 90 |
| exclude | 44 | 11 | 55 |
| insufficient_data | 25 | 16 | 41 |

- **Positiv** (excellent / promising / worth): 209
- **Negativ** (low / exclude): 145
- **Asymmetrisch:** 44
- **Zu wenig Daten:** 41

`asymmetric` und `worth_exploring` gibt es nur in FIND: In CONNECT ist einseitige Hilfe der Normalfall und keine eigene Klasse.

**Herkunft:** 304 Paare konstruiert (Klasse vor den Profilen festgelegt), 135 gezielt ausgewählte Kontrastpaare. Aufschlüsselung in der Methodik, Abschnitt 5.1; im Datensatz steht sie im Feld `source`.

## 2. Aufbau eines Paares

```json
{
  "pair_id": "syn-pair0003",
  "context": "find | connect",
  "a": "syn-p035", "b": "syn-p003",
  "a_listing": null, "b_listing": null,          // nur CONNECT: Suche von A, Angebot von B
  "reference_class": "excellent_candidate",
  "source": "designed_normal_relation",
  "dimensions": {
    "A_to_B_need_offer": "strong",              // findet A bei B, was A sucht?
    "B_to_A_need_offer": "strong",
    "role_complementarity": "complementary",
    "capability_complementarity": "strong",
    "context_relevance": "same_context",
    "commitment_feasibility": "compatible",
    "intent_compatibility": "compatible",
    "hard_constraint_conflict": "none",
    "data_confidence": "medium"
  },
  "hard_constraint_reasons": [],
  "rationale": "…",                               // Begründung in Klartext
  "diagnostic_raw_string_overlap": []             // nur Diagnose, nie Teil der Klasse
}
```

Wertebereiche und Bedeutung der Dimensionen: Methodik, Abschnitt 5.2.

## 3. Dimensionen je Klasse (FIND)

So sehen die Klassen in den Einzeldimensionen aus. Die Tabelle ist eine Beschreibung, keine Regel.

| Klasse | Bedarf A→B / B→A | Kontext | Zeit | Absicht | harte Bedingung |
|---|---|---|---|---|---|
| excellent (44) | immer strong / strong | immer gleich | immer kompatibel | immer kompatibel | nie |
| promising (53) | 30 strong / strong, 23 mit einer Seite partial | gleich 28, benachbart 25 | 28 stretch | 26 partial | nie (3 weich) |
| worth_exploring (55) | beide mindestens partial | 49 fremd | 9 stretch, 7 inkompatibel | 18 partial, 10 inkompatibel | nie (1 weich) |
| asymmetric (44) | eine Seite none | 32 gleich | 36 kompatibel | 32 kompatibel | nie (2 weich) |
| low_relevance (50) | none / none | 29 fremd, 12 benachbart, 9 gleich | gemischt | 30 partial, 9 inkompatibel | nie (5 weich) |
| exclude (44) | 19 beidseitig strong – fachlich gut, trotzdem raus | gemischt | meist kompatibel | gemischt | **immer** |
| insufficient_data (25) | fast immer unknown | fast immer unknown | – | fast immer unknown | 4 zusätzlich hart (sichtbar in der Dimension) |

Datenbelastbarkeit über alle Paare: 241 hoch, 157 mittel, 41 niedrig. Ein harter Konflikt, der an einem im Profil leer gelassenen Feld hängt, ist nie „hoch“.

## 4. Was die Paare der Engine abverlangen

**Freitext ohne Treffer:**
- Von 97 positiven FIND-Paaren (excellent / promising) haben **75 keine einzige wörtlich gleiche** Branche oder Expertise.
- 59 haben dieselbe kanonische Branche, aber keinen gleichen String.

**Heutiger FIND-Filter als Diagnose.** Die Must-haves werden mit der heutigen Semantik (`search_by_frame`) gegen die Rohdaten angewendet.

7 fachlich positive oder asymmetrische Paare würden **fälschlich ausgeschlossen**:

| Grund | Paare |
|---|---|
| Ort als exakter String („Stuttgart, BW“ ≠ „Stuttgart“) | 3 |
| Pflichtbereich bei privater Capability-Freigabe nicht sichtbar | 2 |
| leerer Remote-Modus zählt als „passt nicht“ | 2 |

5 Ausschlusspaare würden **fälschlich durchgelassen**: Beide arbeiten nur vor Ort, aber an verschiedenen Orten. Diese Bedingung kennt der heutige Filter nicht.

Das ist keine Bewertung des Produkts, sondern zeigt, welche Paare genau diese Schwächen testen.

## 5. Interessante Testpaare

**1. Gleicher Ort, anders geschrieben – `syn-pair0003`, FIND, excellent_candidate**

| | A `syn-p035` | B `syn-p003` |
|---|---|---|
| Rolle | Finanzen | Technik |
| sucht | Technik | Finanzen |
| Ort | „Stuttgart“, vor Ort | „Region Stuttgart“, vor Ort |
| Rahmen | Nebenprojekt, 6 h | Nebenprojekt, 5 h |
| Branchen | „Financial Services“, „Digital Health“ | „Fintech“, „PropTech“ |

- B verlangt den Ort „Stuttgart, BW“ und die Rolle Finanzen.
- Fachlich passt alles beidseitig.
- Der heutige Filter schließt A aus, weil „Stuttgart“ ≠ „Stuttgart, BW“.
- Beide haben keine Expertise eingetragen, die Engine muss also über Rollen und Branchen gehen.

**2. Übersetzt und umschrieben – `syn-pair0297`, FIND, excellent_candidate (Noise)**

| | A `syn-p191` | B `syn-p078` |
|---|---|---|
| Rolle | Strategie | Produkt |
| sucht | Produkt | Strategie |
| Branchen | „Enterprise Software“, „Klima“ | „Software“ |
| Ort | Köln/Bonn, hybrid | Ruhrgebiet, hybrid |
| Rahmen | Teilzeit, 30 h | Teilzeit, 30 h |

- Kanonisch beide `saas_b2b`.
- Der einzige wörtliche Treffer ist „User Research“.
- Testet, ob Synonyme und Sprachmischung eine fachlich exzellente Ergänzung verdecken.

**3. Alles passt – außer der Zeit – `syn-pair0102`, FIND, exclude (Constraint-Konflikt)**

- A (Produkt, sucht Growth) und B (Growth, sucht Produkt und Technik) passen in allen fachlichen Dimensionen, beide in Klimaschutz/Energie in Berlin.
- **A verlangt mindestens 28 h/Woche, B hat 7.**
- Bemerkenswert: A selbst bringt nur 6 h mit.
- Eine Engine muss die harte Bedingung respektieren, auch wenn alles andere ideal ist.

**4. Nische ohne gemeinsames Wort – `syn-pair0206`, CONNECT, excellent_candidate (Spezialistin)**

| | Eintrag | Thema | Branche |
|---|---|---|---|
| A sucht | Expertise | „MDR-Zulassung“ | „Gesundheitswesen“ |
| B bietet | Expertise | „MDR“ | „Healthcare“ |

- B ist eine von wenigen Personen mit Stufe 5 und `own` genau in diesem Bereich; das Angebot gilt global und remote.
- Kein einziger String ist gleich.
- Testet, ob seltene, tiefe Expertise gefunden wird, statt in breiten Profilen unterzugehen.

**5. Fachlich ideal, örtlich unmöglich – `syn-pair0104`, FIND, exclude**

- A (Technik, Wien) und B (Produkt, Stuttgart) ergänzen sich beidseitig, beide in Konsumgütern.
- **Beide arbeiten nur vor Ort.**
- Der heutige Filter lässt das Paar durch, weil keine Seite einen Ort als Must-have gesetzt hat.

**Weitere lohnende Paare**

- **`syn-pair0087` (asymmetric):**
  - A (Operations) sucht Forschung und will genau das abgeben, was B besitzt.
  - B (Forschung/Technik) sucht Produkt und Vertrieb, das bringt A nicht mit.
- **`syn-pair0061` (promising, Cluster):** Drei sich gegenseitig suchende Rollen. Eine Person hat 7 h als Nebenprojekt, würde aber aufstocken. Das ist eine gute Ergänzung mit echtem Zeitfragezeichen.

## 6. Hinweise für die Auswertung

- **Eingabe der Engine:** ausschließlich `profiles.json` und für Erklärungen `workstyle_core.json`. `reference_annotations.json` und diese Paare dienen nur der Auswertung.
- **Ergebnisse getrennt berichten:**
  - nach `context` (FIND / CONNECT),
  - nach `reference_class`,
  - nach `source` (konstruiert vs. Kontrast).

  So bleibt sichtbar, ob eine Engine nur die leichter nachahmbaren Kontrastpaare trifft.
- **Erwartung je Klasse:**
  - `exclude` darf nicht oben landen.
  - `insufficient_data` soll Unsicherheit anzeigen statt einer Einordnung.
  - `asymmetric` ist in FIND kein gegenseitiger Treffer.
- **Workstyle:** darf in Erklärungen auftauchen. Ein Einfluss auf die Reihenfolge wäre ein Befund, kein Feature.
