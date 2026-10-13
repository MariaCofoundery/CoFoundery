# Protokoll: Menschliche Labels (Stichprobe v02)

Mit diesem Protokoll prüfen Menschen, ob die synthetische Referenz und die Modelle aus Experiment 1 und 2 das treffen, was erfahrene Menschen für sinnvoll halten.

**Es wurden noch keine Labels erhoben.**

## Material

- `human_label_sample_v02.json`: 120 Paare (75 FIND, 45 CONNECT), gemischt, mit IDs `hv02-001` …
- Alle Daten sind **vollständig synthetisch**.
- Reviewer sehen nur Profil- und Eintragsinhalte. Es gibt keine Namen, keine Referenzklasse, keinen Modellscore und keine Testannotation.
- `human_label_sample_key_v02.json` ordnet jede Stichprobe ihrem Referenzpaar zu. **Die Datei bleibt bei der Studienleitung und geht nicht an Reviewer**, ebenso wenig der Ordner `docs/research/synthetic/`.

Die Stichprobe enthält:

| Teil | Inhalt |
|---|---|
| geschichtet nach Referenzklasse | etwa ein Drittel aus Kontrastpaaren |
| feste Grenzfälle | die fünf bekannten Stresspaare sowie zwei Ortsfälle, bei denen das Modell-Gate und die Referenz unterschiedlich entscheiden |
| 6 Paare zur Ortssemantik | beide arbeiten hybrid/flexibel an verschiedenen Orten |
| 5 neue CONNECT-Stressfälle | aus `connect_stress_v02.json` |

## Ablauf

1. **Mindestens zwei Reviewer** je Paar, unabhängig voneinander, ohne Absprache.
2. **Reihenfolge** wie in der Datei. Pausen sind erlaubt; Antworten werden nicht nachträglich geändert.
3. **Nur die gezeigten Angaben zählen.** Kein Raten über fehlende Angaben: Was fehlt, ist unbekannt, nicht negativ.
4. **Private Suchkriterien** (`private_suchkriterien`) gelten als ausdrückliche Wünsche der Person.
5. **Bearbeitungszeit** etwa 1–2 Minuten pro Paar, insgesamt 2–4 Stunden je Reviewer.
6. **Ausgabe** je Paar und Reviewer: die Antworten unten plus optional ein Satz Begründung.

## FIND – Person ↔ Person (mögliches Gründungsgespräch)

| # | Frage | Antwort |
|---|---|---|
| 1 | Würdest du diese zwei Personen als potenziell relevantes Founder-Gespräch zusammenbringen? | ja / eher ja / eher nein / nein |
| 2 | Wie stark ist der Nutzen für **A**? | 0 kein · 1 gering · 2 mittel · 3 hoch |
| 3 | Wie stark ist der Nutzen für **B**? | 0 kein · 1 gering · 2 mittel · 3 hoch |
| 4 | Gibt es einen klaren Ausschlussgrund? | nein / ja → welcher: Ort/Remote · Zeit/Commitment · Suchstand/Start · ausdrückliches Kriterium · anderer |
| 5 | Wie sicher bist du aufgrund der verfügbaren Informationen? | 1 sehr unsicher … 5 sehr sicher |

Hinweise:

- **Nutzen** heißt: Die Person findet beim Gegenüber, was sie sucht (Rollen, Verantwortung für Bereiche). Ähnlichkeit allein ist kein Nutzen.
- **Ownership:** Nur „Möchte ich verantwortlich übernehmen“ ist ein Ownership-Wunsch. „Möchte ich mich hineinentwickeln“ ist keiner.
- **Workstyle** ist nicht Teil der Stichprobe und soll nicht hineingedacht werden.

## CONNECT – Gesuch → Angebot

| # | Frage | Antwort |
|---|---|---|
| 1 | Deckt dieses Angebot das konkrete Gesuch? | ja / teilweise / nein |
| 2 | Wie relevant ist es? | 0 nicht · 1 gering · 2 mittel · 3 hoch |
| 3 | Gibt es einen klaren Ausschlussgrund? | nein / ja → welcher: Ort/Remote · nicht mehr aktiv · anderer |
| 4 | Wie sicher bist du? | 1 sehr unsicher … 5 sehr sicher |

Gegenseitigkeit spielt hier keine Rolle: Ein Angebot kann relevant sein, auch wenn die anbietende Person selbst nichts sucht.

## Auswertung (später, nicht Teil dieses Schritts)

- **Übereinstimmung zwischen Reviewern:** gewichtetes Kappa bzw. Krippendorffs α je Frage.
- **Abgleich mit der synthetischen Referenz** über die Schlüsseldatei:
  - wo Menschen und Referenz auseinanderliegen,
  - insbesondere bei Kontrastpaaren, Ortssemantik (hybrid/flexibel an verschiedenen Orten) und den CONNECT-Stressfällen.
- **Abgleich mit den Modellen** (M7, M7core, Varianten aus v02) – erst nachdem die Labels feststehen.

Offene Fragen, die die Labels klären sollen, stehen in `report_v02.md`, Abschnitt 10.
