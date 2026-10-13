# Anleitung für Reviewer: Matching-Vorschläge bewerten (v02)

Danke, dass du mitmachst. Du bekommst **120 Paare** aus einer Testumgebung von Made2Found. Alle Personen und Einträge sind **frei erfunden**.

## Worum es geht

Bewertet wird nur eine Frage:

> **Wie sinnvoll wäre es aufgrund der vorhandenen Informationen, diesen Kontakt vorzuschlagen?**

Bitte **nicht** bewerten:

- ob die Menschen „kompatibel“ sind,
- Persönlichkeit oder psychologischen Fit,
- Erfolgschancen oder „Founder-Qualität“.

Drei Grundsätze:

- **Unterschiede sind nicht automatisch schlecht.** Wer Technik mitbringt und Vertrieb sucht, passt oft gerade zu jemandem, der es umgekehrt macht.
- **Ähnlichkeit ist nicht automatisch gut.** Zwei Personen mit derselben Rolle, die beide dasselbe suchen, helfen sich oft nicht.
- **Fehlende Angaben sind unbekannt, nicht negativ.** Steht etwas nicht da, weißt du es nicht. Ziehe daraus keinen Schluss in eine Richtung; drücke die Unsicherheit über die Sicherheits-Frage aus.

## Material

- `human_labels_review_pack_v02.json` (oder `.csv`): die Paare. Jedes hat einen Code (`RP-001` …) und den Kontext **FIND** oder **CONNECT**.
- `human_label_template_v02.csv`: deine Antworten, eine Zeile je Paar.
  - Bitte eine eigene Kopie verwenden.
  - In `reviewer_id` ein **Kürzel** eintragen (z. B. `R1`), keinen Namen.

Arbeite allein und sprich dich nicht mit anderen Reviewern ab. Ändere Antworten nicht nachträglich, nachdem du weitere Paare gesehen hast. Ein bis zwei Minuten pro Paar genügen.

## Was du in den Paaren siehst

**FIND** – zwei Personen, die eine Mitgründung suchen: **Person A** und **Person B**. Je Person:

| Angabe | Bedeutung |
|---|---|
| headline, bio | Selbstbeschreibung |
| ort, arbeitsweise_ort | Ort und onsite / hybrid / remote / flexible |
| branchen, expertise | freie Angaben |
| capabilities | Bereiche mit **Erfahrung** und **Verantwortung** |
| find | bringt mit / sucht (Rollen), Stunden pro Woche, Commitment, Phase des Vorhabens, Ziel, Suchstand, Start |
| private_suchkriterien | ausdrückliche Wünsche der Person, z. B. Mindeststunden oder Ort |

Zur Verantwortung bei den Capabilities:
- Nur „Möchte ich verantwortlich übernehmen“ ist ein Wunsch nach Verantwortung.
- „Möchte ich mich hineinentwickeln“ ist **keiner**.
- Erfahrung und Verantwortung sind zwei verschiedene Dinge.

**CONNECT** – eine Person sucht etwas Konkretes, eine andere bietet etwas an:
- **Gesuch** und **Suchende Person**,
- **Angebot** und **Anbietende Person**.

Dazu je Eintrag: Kategorie, Titel, Beschreibung, Themen, Branchen, Orte, Zielgebiet, Arbeitsweise, Status und Laufzeit.

## FIND-Fragen

| Spalte | Frage | Antwort |
|---|---|---|
| `find_q1_gespraech` | Würdest du diesen beiden Personen empfehlen, ein erstes Founder-Gespräch miteinander zu führen? | 1 klar nein · 2 eher nein · 3 vielleicht / unklar · 4 eher ja · 5 klar ja |
| `find_q2_a_to_b` | Wie relevant ist Person B für das, was Person A aktuell sucht? | 1 (gar nicht) – 5 (sehr) |
| `find_q3_b_to_a` | Wie relevant ist Person A für das, was Person B aktuell sucht? | 1 (gar nicht) – 5 (sehr) |
| `find_q4_ausschluss` | Gibt es aufgrund der sichtbaren Angaben einen klaren Grund, dieses Gespräch derzeit nicht vorzuschlagen? | `yes` / `no` / `unclear` |
| `find_q4_grund` | nur bei `yes`: der Grund | `time_commitment` · `founder_intent` · `role_mismatch` · `location_remote` · `start_timing` · `other` |
| `find_q4_begruendung` | optional, ein kurzer Satz | Freitext |
| `find_q5_sicherheit` | Wie sicher bist du dir aufgrund der vorhandenen Angaben? | 1 sehr unsicher – 5 sehr sicher |

Hinweise:

- Q2 und Q3 sind bewusst getrennt. Es kann sein, dass nur eine Seite profitiert.
- Ein Ausschlussgrund ist etwas, das ein Gespräch **derzeit** nicht sinnvoll macht. Beispiele:
  - jemand verlangt ausdrücklich deutlich mehr Stunden, als die andere Person hat,
  - beide arbeiten nur vor Ort in weit entfernten Städten.

  Eine bloße Unterschiedlichkeit ist kein Ausschlussgrund.
- **Mehrere Gründe:** Gib den wichtigsten an und nenne die anderen in der Begründung.

## CONNECT-Fragen

| Spalte | Frage | Antwort |
|---|---|---|
| `connect_q1_deckung` | Wie gut deckt dieses Angebot das konkrete Gesuch? | 1 gar nicht – 5 vollständig |
| `connect_q2_anzeigen` | Würdest du diesen Treffer der suchenden Person anzeigen? | `yes` / `maybe` / `no` |
| `connect_q3_ausschluss` | Gibt es einen klaren Ausschlussgrund? | `yes` / `no` / `unclear` |
| `connect_q3_grund` | nur bei `yes`: der Grund | `location_remote` · `category_mismatch` · `topic_mismatch` · `timing` · `other` |
| `connect_q3_begruendung` | optional, ein kurzer Satz | Freitext |
| `connect_q4_sicherheit` | Wie sicher bist du dir aufgrund der vorhandenen Angaben? | 1 sehr unsicher – 5 sehr sicher |

Hinweise:

- In CONNECT zählt nur, ob das Angebot das Gesuch deckt. Die anbietende Person muss selbst nichts suchen.
- **`timing`** ist ein Ausschlussgrund, wenn ein Eintrag nicht mehr aktiv ist oder abgelaufen ist.

## Ausfüllen

- Für **FIND**-Zeilen nur die `find_…`-Spalten, für **CONNECT**-Zeilen nur die `connect_…`-Spalten.
- Zahlen ohne Zusatz (`4`), Antworten genau wie angegeben, klein geschrieben (`yes`, `maybe`, `location_remote`).
- `kommentar` ist optional, z. B. wenn dir eine Angabe widersprüchlich vorkommt.
- Lass nichts leer, außer Grund und Begründung, wenn kein Ausschluss vorliegt.
