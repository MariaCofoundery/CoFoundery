# Matching-Experiment 1 (v0.1) – Bericht

Stand: 13.10.2026. Datensatz: `docs/research/synthetic/` (200 Profile, 439 Referenzpaare, SHA-256 in `../tools/README.md`).
Alle Zahlen stammen aus [`results_v01.json`](results_v01.json) und lassen sich mit `run_experiment_v01.py` byte-identisch reproduzieren.

**Keine Produktentscheidung, keine Produktimplementierung.** Das Experiment vergleicht Modell*strukturen*, nicht fein abgestimmte Gewichte.

## 0. Zuerst lesen: Was dieses Experiment kann und was nicht

1. **Die Ground Truth ist aus denselben strukturierten Feldern konstruiert, die die Modelle lesen.**
   - Komplementäre Paare wurden über `seeking_roles` ↔ `own_roles` und abzugebende Capability-Bereiche gebaut.
   - Ein Modell, das genau diese Felder auswertet, muss diese Paare finden. Die 100 % „excellent in den Top 10“ ab M3 sind deshalb ein **Konstruktionseffekt, kein Qualitätsbeweis**.
   - Aussagekräftig sind die **Unterschiede** zwischen Modellen: Freitext, harte Bedingungen, Gegenseitigkeit, fehlende Werte, Bias. Ebenso aussagekräftig sind die **Kontrastpaare**.
2. **Das Normalisierungs-Wörterbuch stammt vom selben Autor wie der Generator.** Es deckt dessen Schreibvarianten vermutlich besser ab als echte Eingaben. Die Stufe `generic` (ohne Wörterbuch) zeigt die Untergrenze.
3. **Wenige Urteile je Anfrage.**
   - FIND: im Schnitt 1,9 relevante Urteile je Anfrage, P@10 kann also höchstens etwa 0,19 erreichen, P@5 etwa 0,38.
   - CONNECT: genau ein relevantes Urteil je Anfrage, Obergrenzen 0,10 bzw. 0,20.
   - Precision ist deshalb nur relativ zwischen Modellen lesbar.
4. **CONNECT hat keine Kontrastpaare** (alle 124 sind konstruiert). Die „paarweise Ordnung“ beruht in CONNECT auf nur 5 Vergleichen und ist dort **nicht aussagekräftig**.
5. **Drei Varianten sind nachträglich entstanden**, also nach Sicht auf die Ergebnisse: `M8s`, `M7core` (CONNECT) und die Ablationen. Sie sind Hypothesen für v0.2, keine bestätigten Befunde.

## 1. Modelle

| Modell | FIND | CONNECT |
|---|---|---|
| **M0** heute | Must-haves der suchenden Person als Filter (Semantik `search_by_frame`: exakte Strings, leere Werte fallen raus), Reihenfolge nach Veröffentlichung (im Datensatz nicht vorhanden → feste Zufallsordnung) | `connect_match_terms` der Person (eigene Expertise/Branchen + eigene Suchen + Probleme, ≥ 3 Zeichen) gegen Themen/Branchen des Angebots, exakter Vergleich, Reihenfolge nach `published_at` |
| **M1** normalisiert exakt | Filter wie M0, aber normalisierte Begriffe und Orte; Rang = Zahl gleicher Begriffe + gesuchte Rollen | wie M0 mit normalisierten Begriffen |
| **M1g** | wie M1, nur generische Normalisierung (ohne Wörterbuch) | ebenso |
| **M2** Bedarf → Angebot | gerichtet A→B: gesuchte Rollen, abzugebende Bereiche (Bereich vorhanden), ausdrückliche Kriterien; dazu Branche | Thema, Kategorie, Branche von Suche vs. Angebot |
| **M3** strukturelle Ergänzung | M2 + Ownership-bewusste Abdeckung, Gegenrichtung (Rolle, keine Doppelung, Bereiche) und Absicht (Suchstand, Start, Ziel, Phase) | M2 + Profil-Expertise des Anbietenden + Phase |
| **M4** taxonomie-bewusst | M3 + halbe Abdeckung durch einen Bereich derselben Capability-Familie | – (Themen haben im Produkt keine Taxonomie) |
| **M5** constraint-bewusst | M4 × Abschläge für verletzte Bedingungen; fehlende Werte nie ein Konflikt | M3 × Abschlag für regional-vor-Ort-Konflikte, abgelaufene Angebote = 0 |
| **M6a/b/c** gegenseitig | M5 in beide Richtungen, kombiniert: arithmetisch / harmonisch / 0,6·min + 0,4·mittel | – (bewusst nicht) |
| **M7** zweistufig | Gate (Must-haves **beider** Seiten, beide nur vor Ort an verschiedenen Orten), danach gegenseitige Relevanz (min-betont) **ohne** Kriterien-Bonus | Gate (aktiv, nicht abgelaufen, kein regionaler Ortskonflikt), danach M3-Relevanz |
| **M8** confidence-bewusst | wie M7, aber fehlende Komponenten werden herausgerechnet statt als 0 gezählt; Confidence separat | ebenso |
| *M8s* (nachträglich) | Gegenseitigkeit nur über den reinen Bedarf, Branche/Absicht als symmetrische Paarfaktoren | – |
| *M7core* (nachträglich) | – | M7-Gate + nur Thema, Kategorie, Branche (also M2-Relevanz) |

Für alle Modelle gilt:
- **Kein Workstyle** in irgendeinem Score.
- **Keine Testannotationen:** `reference_*` ist während des Scorings technisch gesperrt, und der Modellcode hat keinen Dateizugriff.

## 2. Formeln

Alle Komponenten liegen in [0, 1] oder sind „nicht berechenbar“.

**FIND, gerichtet A → B**

- `role_cover` = |A.seeking ∩ B.own| / |A.seeking|
- `cap_cover` = Mittel über die Bereiche, die A abgeben will (`prefer_other` / `prefer_external`), der Abdeckung durch B:

  | B hat diesen Bereich mit … | Abdeckung |
  |---|---|
  | `own` und Stufe ≥ 3 | 1,0 |
  | `contribute` und Stufe ≥ 3 | 0,6 |
  | `own` und Stufe < 3 | 0,4 |
  | `unclear` oder leer und Stufe ≥ 3 | 0,3 |
  | `grow_into` oder `prefer_*` | **0** |

  Bereich derselben Familie: halber Wert (ab M4).
- **NEED** = Mittel aus `role_cover`, `cap_cover` und (nur M2–M6) dem Anteil erfüllter ausdrücklicher Kriterien.
- **CONTEXT** = 1, wenn eine normalisierte Branche gleich ist, sonst 0.
- **COMPLEMENT** (ab M3) = Mittel aus drei Teilen:
  - sucht B, was A mitbringt?
  - keine Rollen-Doppelung
  - deckt A ab, was B abgeben will?
- **INTENT** (ab M3) = Mittel aus den Abständen bei Suchstand, Start, Zielbild (Gruppen explore/side · profitable · scale/exit) und der Phasen-Kombination (Idee + Einstieg = 1; beide bauen schon oder beide ohne Idee = 0,5).
- **Score** = gewichtetes Mittel: NEED × 2, CONTEXT, COMPLEMENT und INTENT je × 1.
  - M2 nutzt nur NEED und CONTEXT.
  - Bis M7 zählt eine fehlende Gruppe als 0; M8 rechnet sie heraus.

**M5-Abschläge** (Faktoren, multipliziert):

| Bedingung verletzt | Faktor |
|---|---|
| Pflichtrolle | 0,4 |
| Mindeststunden | 0,3 |
| Remote-Modus | 0,4 |
| Ort | 0,4 |
| Suchstand | 0,4 |
| Start | 0,5 |
| Pflichtbereich | 0,5 |
| Pflicht-Expertise | 0,6 |
| beide nur vor Ort, verschiedene Orte | 0,3 |
| Commitment ≥ 2 Stufen auseinander (ohne „würde aufstocken“) | 0,7 |

**Gegenseitigkeit:** M6a = (x + y)/2 · M6b = 2xy/(x + y) · M6c, M7, M8 = 0,6·min(x, y) + 0,4·(x + y)/2.

**CONNECT, Suche → Angebot**

| Komponente | Berechnung |
|---|---|
| `topic` | Anteil der normalisierten Suchthemen, die das Angebot nennt |
| `category` | gleiche Kategorie = 1 |
| `industry` | gleiche normalisierte Branche = 1 |
| `profile` | Suchthema steht in der Profil-Expertise des Anbietenden = 1 |
| `stage` | 1 − Phasenabstand / 3 |

Gewichte: Thema × 2, alle anderen × 1.

**Confidence (M8)**
- FIND: Anteil gefüllter Felder (Rollen, Suche, Capabilities, Branche, Expertise, Suchstand, Start, Ort, Remote), Minimum beider Seiten.
- CONNECT: Anteil gefüllter Felder der Suche (Themen, Branche, Ort, Zielgebiet).

**Gewichte:** nur die oben genannten. Eine einzige Sensitivität (alle Gruppen gleich) ist mitgerechnet, sonst nichts getunt.

## 3. Normalisierung

Alle Regeln stehen in [`normalization_v01.py`](normalization_v01.py):

| Stufe | Was passiert |
|---|---|
| `exact` | `lower(trim(x))` – Produkt heute |
| `generic` | Unicode-Normalisierung, Kleinschreibung, Umlaute → ae/oe/ue/ss, Satzzeichen → Leerzeichen, einfache Pluralform weg |
| `synonym` | `generic` plus Wörterbuch: 15 Branchen-Begriffe, 25 Themen-Begriffe (inkl. 5 Nischen), 10 Metropolregionen, Platzhalter ohne Ort („DACH“, „bundesweit“, „Remote / überall“), Ortszusätze („, Germany“, „BW“, „(DE)“) |

Bewusst **nicht** abgefangen: Tippfehler wie „Helthcare“ oder „Fintec“. Es gibt kein Fuzzy-Matching, kein LLM und keine Embeddings.

**Wirkung (FIND, M8):**
- Ohne Wörterbuch (`M8_generic_norm`) sinkt Recall@10 von 0,91 auf 0,83 und NDCG@10 von 0,79 auf 0,69.
- 8 positive Paare werden dann gesperrt, 6 davon wegen Ortsvarianten.

**Wirkung (CONNECT, M8):**
- Recall@10 bricht ohne Wörterbuch von 0,88 auf 0,30 ein.
- In CONNECT sind Themen der wichtigste Matching-Inhalt, und dort hilft nur das Wörterbuch.

## 4. FIND-Ergebnisse

Ranking über alle 155 Kandidaten; nicht beurteilte Kandidaten zählen als nicht relevant. Relevant heißt excellent oder promising. Die „paarweise Ordnung“ ist der Anteil der (positiv, negativ)-Paare derselben Anfrage, die richtig herum stehen; das sind 369 Vergleiche.

| Modell | P@5 | P@10 | Recall@10 | Recall@20 | NDCG@5 | NDCG@10 | MRR | paarweise Ordnung |
|---|---|---|---|---|---|---|---|---|
| M0 | 0.02 | 0.02 | 0.10 | 0.21 | 0.04 | 0.06 | 0.08 | 0.62 |
| M1 | 0.16 | 0.11 | 0.63 | 0.76 | 0.35 | 0.42 | 0.43 | 0.85 |
| M1g | 0.09 | 0.07 | 0.42 | 0.66 | 0.23 | 0.28 | 0.30 | 0.85 |
| M2 | 0.24 | 0.15 | 0.77 | 0.90 | 0.45 | 0.51 | 0.52 | 0.86 |
| M3 | 0.30 | 0.17 | 0.87 | 0.96 | 0.65 | 0.69 | 0.71 | 0.87 |
| M4 | 0.29 | 0.17 | 0.88 | 0.97 | 0.63 | 0.69 | 0.71 | 0.88 |
| M5 | 0.30 | 0.17 | 0.90 | 0.97 | 0.67 | 0.72 | 0.73 | 0.92 |
| M6a | 0.30 | 0.17 | 0.91 | 0.97 | 0.73 | 0.77 | 0.80 | 0.94 |
| M6b | 0.31 | 0.17 | 0.92 | 0.97 | 0.75 | 0.79 | 0.81 | 0.96 |
| M6c | 0.32 | 0.17 | 0.91 | 0.97 | 0.77 | 0.79 | 0.82 | 0.97 |
| **M7** | **0.32** | **0.17** | **0.92** | 0.97 | **0.77** | **0.80** | **0.82** | **0.99** |
| M8 | 0.31 | 0.17 | 0.91 | 0.96 | 0.76 | 0.79 | 0.82 | 0.99 |
| *M8s* | 0.31 | 0.17 | 0.90 | 0.93 | 0.76 | 0.79 | 0.81 | 0.98 |

**Verhalten je Referenzklasse** (Anteil der Paar-Richtungen in den Top 10; ↓ = niedriger ist besser):

| Modell | excellent | promising | worth | asymmetric | low_relevance ↓ | exclude ↓ | insufficient | exclude zugelassen ↓ | Positive fälschlich gesperrt ↓ |
|---|---|---|---|---|---|---|---|---|---|
| M0 | 0.09 | 0.08 | 0.14 | 0.07 | 0.09 | 0.02 | 0.10 | 0.55 | 7 von 392 |
| M1 | 0.73 | 0.49 | 0.19 | 0.31 | 0.09 | 0.17 | 0.06 | 0.55 | 4 von 392 |
| M1g | 0.43 | 0.34 | 0.33 | 0.24 | 0.10 | 0.09 | 0.04 | 0.55 | 7 von 392 |
| M2 | 0.93 | 0.64 | 0.20 | 0.35 | 0.01 | 0.45 | 0.10 | 1.00 | 0 von 392 |
| M3 | 1.00 | 0.76 | 0.50 | 0.44 | 0.00 | 0.43 | 0.10 | 1.00 | 0 von 392 |
| M4 | 1.00 | 0.76 | 0.53 | 0.43 | 0.00 | 0.43 | 0.10 | 1.00 | 0 von 392 |
| M5 | 1.00 | 0.77 | 0.51 | 0.49 | 0.01 | 0.26 | 0.12 | 1.00 | 0 von 392 |
| M6a | 1.00 | 0.79 | 0.58 | 0.67 | 0.00 | 0.35 | 0.10 | 1.00 | 0 von 392 |
| M6b | 1.00 | 0.80 | 0.61 | 0.66 | 0.00 | 0.27 | 0.10 | 1.00 | 0 von 392 |
| M6c | 1.00 | 0.80 | 0.63 | 0.64 | 0.01 | 0.27 | 0.10 | 1.00 | 0 von 392 |
| M7 | 1.00 | 0.82 | 0.66 | 0.66 | 0.00 | 0.02 | 0.10 | 0.05 | 0 von 392 |
| M8 | 1.00 | 0.81 | 0.65 | 0.68 | 0.00 | 0.02 | 0.10 | 0.05 | 0 von 392 |
| *M8s* | 1.00 | 0.78 | 0.57 | 0.66 | 0.03 | 0.02 | 0.10 | 0.05 | 0 von 392 |

- **Constraint-Fehlerquote** (exclude-Paare zugelassen und in den Top 10):

  | Modell | Fehlerquote |
  |---|---|
  | M2 | 45 % |
  | M3 / M4 | 43 % |
  | M5 | 26 % |
  | M6a | 35 % |
  | M6b / M6c | 27 % |
  | M7 / M8 | 2 % |

  M7/M8 lassen zwei exclude-Paare zu (4 Richtungen, davon 2 in den Top 10):
  - **`syn-pair0346`:** B hat keinen Ort angegeben. Das Gate lässt das Paar korrekt durch, denn fehlende Werte sind kein Konflikt.
  - **`syn-pair0021`:** A verlangt Leipzig, B schreibt „DACH“ und arbeitet remote. Das Gate wertet „DACH“ als Platzhalter ohne Ort und lässt das Paar durch; die Referenz sieht einen Konflikt. **Das ist eine echte Schwäche der Platzhalter-Regel**, siehe Empfehlung 4.
- **M0 hat die niedrigste exclude-Quote (0,02), aber aus dem falschen Grund.** Es findet fast nichts: excellent nur 9 %, die Reihenfolge ist zufällig. Zugleich lässt es 55 % der exclude-Paare zu, weil es nur die Bedingungen der suchenden Seite prüft und den Fall „beide nur vor Ort“ nicht kennt.
- **insufficient_data:** 10 % in den Top 10, in allen Modellen gleich. M8 markiert 96 % dieser Paare mit Confidence < 0,5. Das funktioniert.

**Asymmetrische Paare** (Rang in der Liste der jeweiligen Seite):

| Modell | Median-Rang mit Bedarf | Median-Rang ohne Bedarf | Top 10 mit Bedarf | Top 10 ohne Bedarf ↓ |
|---|---|---|---|---|
| M2 | 4.5 | 48.0 | 0.70 | 0.00 |
| M3 | 3.0 | 20.0 | 0.75 | 0.14 |
| M5 | 3.0 | 19.5 | 0.73 | 0.25 |
| M6c | 6.5 | 7.5 | 0.64 | 0.64 |
| M7 | 6.5 | 8.0 | 0.68 | 0.64 |
| M8 | 5.5 | 8.0 | 0.73 | 0.64 |
| *M8s* | 5.0 | 9.0 | 0.70 | 0.61 |

Gerichtete Modelle trennen die beiden Seiten sauber, gegenseitige nicht. Bei M6–M8 landet auch die Seite **ohne** Bedarf zu 64 % in den Top 10. Ein Grund: Pools mit wenigen starken Treffern spülen schon mittlere Scores nach oben. Der Versuch M8s, Gegenseitigkeit nur über den reinen Bedarf zu bilden, ändert daran fast nichts (61 %). **Ungelöst.**

## 5. CONNECT-Ergebnisse

Suche → alle 172 Angebote anderer Personen, gerichtet, ohne Gegenseitigkeit.

| Modell | P@5 | P@10 | Recall@10 | Recall@20 | NDCG@5 | NDCG@10 | MRR | excellent@10 | promising@10 | low_relevance@10 ↓ | exclude@10 ↓ | Positive fälschlich gesperrt ↓ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 | 0.02 | 0.02 | 0.19 | 0.35 | 0.09 | 0.12 | 0.11 | 0.24 | 0.12 | 0.03 | 0.18 | 37 von 57 |
| M1 | 0.04 | 0.03 | 0.26 | 0.44 | 0.12 | 0.13 | 0.12 | 0.27 | 0.25 | 0.00 | 0.27 | 0 von 57 |
| M1g | 0.02 | 0.02 | 0.19 | 0.35 | 0.09 | 0.12 | 0.11 | 0.24 | 0.12 | 0.03 | 0.18 | 37 von 57 |
| M2 | 0.14 | 0.10 | 0.96 | 1.00 | 0.61 | 0.69 | 0.61 | 1.00 | 0.92 | 0.03 | **1.00** | 0 von 57 |
| M3 | 0.13 | 0.08 | 0.81 | 0.96 | 0.52 | 0.56 | 0.50 | 0.97 | 0.58 | 0.03 | 1.00 | 0 von 57 |
| M5 | 0.14 | 0.09 | 0.86 | 0.98 | 0.56 | 0.61 | 0.54 | 0.97 | 0.71 | 0.03 | 0.55 | 0 von 57 |
| M7 | 0.14 | 0.09 | 0.86 | 0.98 | 0.56 | 0.61 | 0.54 | 0.97 | 0.71 | 0.03 | 0.00 | 0 von 57 |
| M8 | 0.14 | 0.09 | 0.88 | 1.00 | 0.56 | 0.62 | 0.55 | 1.00 | 0.71 | 0.03 | 0.00 | 0 von 57 |
| *M7core* | **0.15** | **0.10** | **0.98** | **1.00** | **0.63** | **0.72** | **0.64** | 1.00 | **0.96** | 0.08 | **0.00** | 0 von 57 |

- **M0 sperrt 37 von 57 positiven CONNECT-Paaren**, weil kein Begriff wörtlich gleich ist. Zusätzlich sortiert es nach Datum, nicht nach Passung.
- **M1 findet zwar alles, sortiert aber weiter nach Datum.** Normalisierung allein reicht also nicht, es braucht eine Relevanzordnung.
- **M2 rankt am besten, zeigt aber jedes ausgeschlossene Angebot** (abgelaufen oder regional vor Ort an einem anderen Ort) in den Top 10.
- **Die Zusatzkomponenten von M3 schaden.** Profil-Expertise und Phase senken die Werte: Profil-Stütze kostet NDCG@10 0,08 (`M8_without_profile` 0,70 gegenüber M8 0,62), Phase 0,02.
- **Kategorie ist zirkulär.** „promising“-Paare wurden als „gleiches Thema, andere Kategorie“ konstruiert, die Kategorie trennt also genau excellent von promising. Ihr Nutzen ist hier **nicht beurteilbar**.
- **Die nachträgliche Variante M7core** (Gate + Thema/Kategorie/Branche) ist in CONNECT am besten. Einziger Preis: low_relevance in den Top 10 steigt von 0,03 auf 0,08, weil eine fehlende Branche herausgerechnet statt als 0 gezählt wird.

**Ablation CONNECT (Basis M8):**

| Variante | Recall@10 | NDCG@10 | MRR | excellent@10 | promising@10 | low_relevance@10 |
|---|---|---|---|---|---|---|
| M8 | 0.88 | 0.62 | 0.55 | 1.00 | 0.71 | 0.03 |
| ohne Thema | 0.53 | 0.35 | 0.31 | 0.88 | 0.04 | 0.15 |
| ohne Kategorie | 0.88 | 0.65 | 0.60 | 0.94 | 0.79 | 0.03 |
| ohne Branche | 0.84 | 0.48 | 0.38 | 0.94 | 0.71 | 0.03 |
| ohne Profil-Stütze | 0.95 | 0.70 | 0.63 | 1.00 | 0.88 | 0.05 |
| ohne Phase | 0.89 | 0.64 | 0.57 | 1.00 | 0.75 | 0.03 |
| ohne Wörterbuch | 0.30 | 0.19 | 0.17 | 0.33 | 0.25 | 0.17 |

## 6. Konstruiert vs. Kontrast (FIND)

Das wichtigste Ergebnis für die Einordnung: **Alle Relevanzmodelle sind auf Kontrastpaaren deutlich schwächer.** Kontrastpaare wurden aus bestehenden Profilen *ausgewählt* statt für eine Klasse *gebaut*. Sie liegen näher an „normalen“ Paaren.

| Modell | Recall@10 konstr. | Recall@10 Kontrast | NDCG@10 konstr. | NDCG@10 Kontrast | MRR konstr. | MRR Kontrast | exclude Top 10 konstr. | exclude Top 10 Kontrast |
|---|---|---|---|---|---|---|---|---|
| M0 | 0.09 | 0.07 | 0.05 | 0.04 | 0.07 | 0.06 | 0.05 | 0.00 |
| M1 | 0.67 | 0.44 | 0.43 | 0.23 | 0.41 | 0.25 | 0.39 | 0.00 |
| M2 | 0.82 | 0.57 | 0.56 | 0.26 | 0.53 | 0.26 | 0.97 | 0.06 |
| M3 | 0.94 | 0.65 | 0.76 | 0.31 | 0.74 | 0.26 | 1.00 | 0.00 |
| M5 | 0.95 | 0.71 | 0.78 | 0.34 | 0.76 | 0.29 | 0.61 | 0.00 |
| M6c | 0.94 | 0.76 | 0.84 | 0.44 | 0.83 | 0.39 | 0.63 | 0.00 |
| M7 | 0.95 | 0.76 | 0.84 | 0.43 | 0.83 | 0.38 | 0.05 | 0.00 |
| M8 | 0.95 | 0.75 | 0.83 | 0.43 | 0.82 | 0.38 | 0.05 | 0.00 |

**Markiert:**
- **M2–M5 sehen nur auf konstruierten Paaren gut aus.** NDCG@10 halbiert sich auf Kontrastpaaren (z. B. M3: 0,76 → 0,31).
- **M6–M8 verlieren ebenfalls**, behalten aber den größten Teil (NDCG@10 0,43–0,44, Recall@10 0,75–0,76).
- **Die Rangfolge der Modelle ist auf beiden Teilen gleich.** Die Struktur-Befunde (Gegenseitigkeit hilft, Gate hilft) gelten also nicht nur für konstruierte Paare.
- **Die absoluten Werte auf konstruierten Paaren sind nicht übertragbar.**

## 7. Bias und Robustheit

Exposition = Anteil der FIND-Anfragen, in deren Top 10 ein Profil erscheint.

| Modell | normal | Cluster | asym. | Konflikt | Noise | Generalist | Spezialist | Sparse | Spearman Expos. ~ Vollständigkeit | Spearman ~ Anz. Capabilities | Gini | Positive @10 mit / ohne Wortüberlappung |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M0 | 0.09 | 0.04 | 0.06 | 0.01 | 0.01 | 0.02 | 0.00 | 0.12 | −0.06 | 0.04 | 0.87 | 0.07 / 0.09 |
| M1 | 0.06 | 0.05 | 0.05 | 0.08 | 0.07 | **0.17** | 0.00 | 0.00 | 0.12 | 0.25 | 0.45 | 0.75 / 0.55 |
| M2 | 0.07 | 0.05 | 0.05 | 0.09 | 0.08 | 0.11 | 0.01 | 0.04 | 0.09 | **0.35** | 0.38 | 0.89 / 0.74 |
| M3 | 0.06 | 0.07 | 0.04 | 0.08 | 0.07 | 0.07 | 0.00 | 0.07 | −0.06 | 0.19 | 0.25 | 0.93 / 0.85 |
| M5 | 0.06 | 0.07 | 0.04 | 0.07 | 0.07 | 0.09 | 0.00 | 0.08 | −0.07 | 0.20 | 0.24 | 0.93 / 0.86 |
| M6c | 0.06 | 0.07 | 0.06 | 0.04 | 0.09 | 0.11 | 0.01 | 0.05 | −0.16 | 0.11 | 0.31 | 0.93 / 0.88 |
| M7 | 0.06 | 0.07 | 0.06 | 0.04 | 0.09 | **0.13** | 0.01 | 0.05 | −0.21 | 0.10 | 0.31 | 0.93 / 0.89 |
| M8 | 0.06 | 0.07 | 0.05 | 0.04 | 0.08 | **0.12** | 0.00 | **0.12** | **−0.37** | −0.04 | 0.31 | 0.93 / 0.89 |

**Viele Angaben bevorzugt?**
- Nicht systematisch. Ab M3 ist der Zusammenhang mit der Vollständigkeit null oder negativ.
- M2 bevorzugt Profile mit vielen Capabilities (ρ = 0,35), weil dort schon ein vorhandener Bereich als Abdeckung zählt. Ab M3 (Ownership und Stufe) sinkt das auf 0,1–0,2.

**Sparse-Profile unfair behandelt?**
- M7 zeigt sie ähnlich oft wie normale Profile (0,05 zu 0,06).
- **M8 zeigt sie doppelt so oft (0,12).** Das Herausrechnen fehlender Komponenten hebt Profile, von denen nur eine passende Rolle bekannt ist, auf einen vollen Score. Die Regel „fehlende Werte nicht bestrafen“ kippt damit in eine **Bevorzugung**: je weniger Angaben, desto höher (ρ = −0,37).
- Die Confidence markiert diese Paare zwar, das Ranking ignoriert sie aber.

**Generalisten bevorzugt?**
- Ja, in allen Modellen außer M3/M4: 0,11–0,17 gegenüber 0,06 normal.
- Drei eigene Rollen decken häufiger eine gesuchte Rolle ab.
- Der Effekt kommt aus `role_cover`. Die Rolle hat keine Tiefe, denn `application_level` gehört zu Bereichen, nicht zu Rollen.

**Spezialistinnen gefunden?**
- **CONNECT:** ab M2 steht das Nischenangebot in allen 5 Fällen auf Rang 1. M0 findet nur 2 von 5 (Rang 5 und 8), M1 rankt sie auf 2–26.
- **FIND:** Spezialistinnen erscheinen praktisch nie in fremden Top 10. Das ist plausibel, weil sie dort keine Mitgründung suchen, die zu den Anfragen passt.

**DE/EN- und Synonymvarianten erkannt?**
- Bei positiven FIND-Paaren **ohne** wörtliche Überschneidung (150 Richtungen) erreichen M7/M8 0,89 in den Top 10, bei solchen **mit** Überschneidung 0,93. M1 kommt auf 0,55 bzw. 0,75.
- Der Rest-Abstand zeigt: Das Wörterbuch hilft stark, ersetzt aber nicht alle Signale.

**Ortsvarianten:**
- Mit Wörterbuch wird kein positives FIND-Paar wegen des Orts gesperrt.
- Ohne Wörterbuch sind es 2 bei M0/M1g und 6 bei M8_generic_norm (dazu 4 Sperren wegen „beide vor Ort“).

**Viele Capabilities automatisch hoch?** Nur in M2 (siehe oben).

**Empfindlichkeit gegenüber fehlenden Feldern.** 25 % der FIND-Profile (39) verlieren Branche, Expertise, Ort, Remote, Suchstand und Start:

| Modell | Recall@10 | NDCG@10 | MRR | excellent@10 betroffen | promising@10 betroffen |
|---|---|---|---|---|---|
| M3 | 0.87 → 0.86 | 0.69 → 0.65 | 0.71 → 0.65 | 1.00 → 0.95 | 0.78 → 0.70 |
| M5 | 0.90 → 0.90 | 0.72 → 0.67 | 0.73 → 0.67 | 1.00 → 0.92 | 0.80 → 0.78 |
| M6c | 0.91 → 0.92 | 0.79 → 0.75 | 0.82 → 0.76 | 1.00 → 0.95 | 0.80 → 0.89 |
| M7 | 0.92 → 0.92 | 0.80 → 0.75 | 0.82 → 0.76 | 1.00 → 0.95 | 0.80 → 0.83 |
| M8 | 0.91 → 0.92 | 0.79 → 0.75 | 0.82 → 0.74 | 1.00 → 0.97 | 0.80 → 0.87 |

- Recall bleibt stabil, die Reihenfolge an der Spitze leidet (MRR −0,06 bis −0,09).
- **M8 ist nicht robuster als M7.** Sein Vorteil liegt allein in der separaten Confidence.

## 8. Stresspaare

„Rang“ bedeutet: Rang von B in der Liste von A / Rang von A in der Liste von B, bei 155 Kandidaten. „gesperrt“ = vom Filter oder Gate nicht zugelassen.

### syn-pair0003 – FIND, excellent

Finanzen ↔ Technik in Stuttgart. B verlangt den Ort „Stuttgart, BW“, A schreibt „Stuttgart“.

| Modell | Ergebnis | Gründe | Urteil |
|---|---|---|---|
| M0 | A→B Rang 26, **B→A gesperrt** | „Ort stimmt nicht überein“ | **falsch** – Schreibvariante sperrt ein exzellentes Paar |
| M1 | 6 / 1 | Ort normalisiert, 1 gleicher Begriff | richtig |
| M1g | 26 / gesperrt | ohne Wörterbuch bleibt „stuttgart bw“ ≠ „stuttgart“ | falsch |
| M2–M8 | 1 / 1 (M2: 1 / 4) | gesuchte Rolle, deckt abzugebende Bereiche, gleiche Branche | richtig |
| M8_generic_norm | gesperrt / gesperrt | „anderer Ort“, „beide nur vor Ort“ | falsch |

### syn-pair0297 – FIND, excellent (Noise)

Strategie ↔ Produkt. „Enterprise Software“ vs. „Software“, Köln/Bonn vs. Ruhrgebiet.

| Modell | Ergebnis | Urteil |
|---|---|---|
| M0 | 6 / 38 – nur zufällig vorn | falsch für B |
| M1, M1g | 1 / 1 – 2 bzw. 1 gleicher Begriff | richtig |
| M2 | 7 / 2 | richtig |
| M3–M8 | 1 / 1 – Rolle, Bereiche, gleiche Branche nach Normalisierung | richtig |

Kein Modell scheitert hier, weil beide Seiten ohne Must-haves sind. Die Freitext-Schwäche zeigt sich erst bei Filtern (siehe 0003) oder in CONNECT (0206).

### syn-pair0102 – FIND, exclude

Perfekte Ergänzung, aber A verlangt mindestens 28 h, B hat 7.

| Modell | Ergebnis | Urteil |
|---|---|---|
| M0, M1, M1g | A-Seite gesperrt („zu wenig Stunden“), **B-Seite zugelassen** (Rang 59 / 9 / 27) | teilweise – einseitige Filter sehen nur die eigene Bedingung |
| M2, M3, M4 | Rang 1 / 1–2 | **falsch** – Relevanz ohne Bedingungen |
| M5 | 32 / **1** | teilweise – Abschlag nur aus Sicht von A |
| M6a / M6b / M6c | 3 / 7 · 9 / 24 · 10 / 29 | **falsch bzw. knapp** – der Abschlag wird von der Gegenrichtung ausgeglichen |
| M7, M8, M8s | gesperrt / gesperrt („A: zu wenig Stunden“) | richtig |

### syn-pair0206 – CONNECT, excellent (Nische)

Suche „MDR-Zulassung“, Angebot „MDR“, Gesundheitswesen ↔ Healthcare.

| Modell | Ergebnis | Urteil |
|---|---|---|
| M0, M1g | gesperrt – „kein gemeinsamer Begriff“ | **falsch** |
| M1 | Rang 5 – Treffer gefunden, aber nach Datum sortiert | teilweise |
| M2–M8, M7core | Rang 1 von 172 – gleiches Thema (nach Normalisierung), gleiche Kategorie, gleiche Branche | richtig |
| M8_generic_norm | Rang 28 – nur noch die Kategorie stimmt | falsch |

### syn-pair0104 – FIND, exclude

Technik (Wien) ↔ Produkt (Stuttgart), beide nur vor Ort.

| Modell | Ergebnis | Urteil |
|---|---|---|
| M0 | 84 / **9** | falsch für B – kennt „beide vor Ort“ nicht |
| M1 / M1g | 7 / 4 · 23 / 11 | **falsch** |
| M2–M4 | Rang 1–2 | **falsch** |
| M5, M6 | Rang 21–77 – Abschlag 0,3 | weitgehend richtig, aber das Paar bleibt im Pool |
| M7, M8, M8s | gesperrt / gesperrt – „beide nur vor Ort, verschiedene Orte“ | richtig |

## 9. Gewinner und Verlierer

**Gewinner**
- **FIND: M7** (zweistufig: Gate beider Seiten, dann min-betonte gegenseitige Relevanz). Es ist auf allen Ranking-Kennzahlen gleichauf mit dem besten Modell oder vorn, hat die beste paarweise Ordnung (0,99), sperrt kein positives Paar und lässt nur 2 % der exclude-Paare durch.
  - M8 ist gleichwertig im Ranking, bevorzugt aber Sparse-Profile.
  - M6c ist das beste Modell ohne Gate, zeigt aber 27 % der exclude-Paare in den Top 10.
- **CONNECT: M7core** (nachträglich; Gate + Thema/Kategorie/Branche). Vor der Nachträglichkeit war M8 der Gewinner; M2 rankt gut, hat aber kein Gate.

**Verlierer**
- **M0 in beiden Kontexten.** Exakte Strings plus Datums-Sortierung finden fast nichts: Recall@10 0,10 (FIND) bzw. 0,19 (CONNECT). In CONNECT sperrt es 65 % der positiven Paare.
- **M1 und M1g:** Normalisierung ohne Relevanzordnung bleibt schwach, besonders in CONNECT.
- **M2–M5 als Endmodelle:** Ohne Gate landen 26–45 % der exclude-Paare in den Top 10.
- **Weiche Abschläge (M5) sind kein Ersatz für ein Gate.** In gegenseitigen Modellen gleicht die Gegenrichtung den Abschlag aus (Paar 0102).

## 10. Was echten Mehrwert bringt

1. **Bedarf statt Ähnlichkeit (M1 → M2):** FIND Recall@10 von 0,63 auf 0,77, CONNECT von 0,26 auf 0,96. Ohne NEED fällt M8 von 0,91 auf 0,76.
2. **Ownership-bewusste Abdeckung (M2 → M3):** NDCG@10 von 0,51 auf 0,69. Dabei zählt nur `own` mit Erfahrung voll, `grow_into` gar nicht. Außerdem sinkt der Vorteil für Profile mit vielen Capabilities.
3. **Gegenseitigkeit für FIND (M5 → M6c):** NDCG@10 von 0,72 auf 0,79, paarweise Ordnung von 0,92 auf 0,97.
   - harmonisch ≈ min-betont > arithmetisch.
   - Min-betont ist an der Spitze (NDCG@5, MRR) am besten.
4. **Zweistufigkeit:** Ein Gate für ausdrückliche Bedingungen **beider** Seiten plus „beide nur vor Ort“ senkt die exclude-Paare in den Top 10 von 27 % auf 2 %, ohne ein einziges positives Paar zu sperren.
5. **Normalisierung mit Wörterbuch:**
   - in CONNECT unverzichtbar (0,30 → 0,88 Recall@10),
   - in FIND vor allem für Filter und Gate wichtig: keine Sperren mehr wegen Ortsvarianten.
6. **Branchen-Kontext (FIND):** Ohne ihn sinkt die Spitzengüte (NDCG@10 0,79 → 0,74; MRR 0,82 → 0,74).

## 11. Was wenig oder keinen Nutzen zeigt

- **Capability-Familien (M3 → M4):** praktisch kein Effekt (NDCG@10 0,69 → 0,69).
- **Intent als Relevanz:** klein (NDCG@10 0,79 → 0,77 ohne). Als harte Bedingung wirkt er über das Gate.
- **COMPLEMENT** zusätzlich zur Gegenseitigkeit: klein (0,79 → 0,79; worth@10 0,65 → 0,57 ohne).
- **CONNECT:**
  - Profil-Expertise des Anbietenden **schadet** (NDCG@10 +0,08 ohne sie).
  - Phase des Eintrags: kein Nutzen.
  - Kategorie: hier wegen Zirkularität nicht beurteilbar.
- **Gleiche Gruppengewichte statt Bedarf × 2:** schlechter (NDCG@10 0,79 → 0,73). Bedarf trägt die Rangfolge.
- **Herausrechnen fehlender Komponenten (M8 vs. M7):** keine bessere Rangfolge, mehr Sparse-Bias. Nützlich ist nur die getrennte Confidence.
- **Freigabe-Sicht (`M8_disclosed`):** kaum Verlust (Recall@10 0,93, NDCG@10 0,78, MRR 0,78 statt 0,82). Ein Matching, das nur freigegebene Bereiche ohne Stufe und Wunsch sieht, verliert vor allem an der Spitze.

**Nicht in den Modellen genutzt**, weil es dafür keine strukturierten Daten gibt:
- `person_resources` (nur für die Person selbst sichtbar),
- Probleme als Suche,
- `network_roles`, `open_to_formats`,
- Venture-Phase-Abgleich zwischen FIND und CONNECT (zwei verschiedene Listen).

## 12. Empfehlung für Matching Engine v0.2 (Hypothesen, keine Produktentscheidung)

1. **Getrennte Strukturen für FIND und CONNECT** beibehalten.
2. **FIND: Gate → gegenseitige Relevanz (min-betont).**
   - Das Gate prüft die ausdrücklichen Must-haves **beider** Seiten und „beide nur vor Ort an verschiedenen Orten“. Fehlende Werte sind nie ein Ausschluss.
   - Die Relevanz bilden Bedarf (Rolle + Ownership-bewusste Bereichsabdeckung), Branche und Absicht.
3. **CONNECT: Gate → gerichtete Relevanz aus Thema (doppelt), Branche und Kategorie.** Keine Gegenseitigkeit, keine Profil-Stütze, keine Phase.
4. **Normalisierung als eigene, versionierte Schicht** (Wörterbuch für Branchen, Themen, Orte inkl. Platzhalter wie „DACH“). Vor einer Produktentscheidung an **echten, unabhängig gesammelten Schreibweisen** prüfen; das Wörterbuch hier ist zu nah am Generator.
   - Platzhalter brauchen eine eigene Regel: „DACH, remote“ erfüllt ein „nur Leipzig vor Ort“ nicht (`syn-pair0021`).
5. **Fehlende Werte: Confidence getrennt halten, aber nicht voll herausrechnen.**
   - Zu testen ist ein Shrinkage auf einen neutralen Wert statt 0 (M7) oder Herausrechnen (M8).
   - Ziel: Sparse-Profile weder bestrafen noch bevorzugen.
6. **Offene Strukturfragen für Experiment 2:**
   - asymmetrische Paare, deren Seite ohne Bedarf zu weit oben steht,
   - Rollen-Vorteil für Generalisten (z. B. Rollenabdeckung relativ zur Zahl eigener Rollen),
   - CONNECT-Kategorie ohne Zirkularität prüfen.
7. **Bessere Referenz:** zusätzliche Kontrastpaare für CONNECT; eine von Menschen gegengelabelte Stichprobe; ein unabhängig erzeugter Noise-Satz für die Normalisierung.

### Workstyle als Gesprächspunkt (Demonstration, ohne Score-Einfluss)

Nach der Auswertung, für excellent-Paare auf Rang ≤ 3 in M8. Gezeigt wird nur, wenn **beide** Personen der Workstyle-Nutzung in FIND zugestimmt haben (`workstyle_discovery_enabled`). Die Form folgt dem FIND-Vertrag: je Bereich SIMILAR_PATTERN / DISCUSSION_POINT / INSUFFICIENT_DATA, ohne Zahl.

| Paar | Zustimmung beider | EVI | EXP | EL | VOICE | AMB | ORG |
|---|---|---|---|---|---|---|---|
| syn-pair0003 | ja | Gesprächspunkt | ähnlich | ähnlich | Gesprächspunkt | Gesprächspunkt | Gesprächspunkt |
| syn-pair0004 | **nein** | – nicht gezeigt – | | | | | |
| syn-pair0007 | ja | ähnlich | Gesprächspunkt | Gesprächspunkt | Gesprächspunkt | ähnlich | Gesprächspunkt |

So könnte eine Erklärung lauten: *„Ihr ergänzt euch in den Rollen und arbeitet beide in Fintech. Gesprächswert: wie ihr Entscheidungen absichert (EVI) und wie ihr Einwände ansprecht (VOICE).“*

Das ist keine Bewertung und keine Kompatibilität. Die Reihenfolge der Treffer bleibt davon unberührt.
