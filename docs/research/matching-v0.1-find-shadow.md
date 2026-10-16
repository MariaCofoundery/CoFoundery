# FIND Matching v0.1 – Shadow Mode (E1)

Stand: 16.10.2026. Umsetzung: `web/src/features/discovery/findMatchingShadow.ts`, Hook in `getDiscoveryCandidatesForCurrentUser` (`discoveryData.ts`).

**Die sichtbare FIND-Suche ist unverändert.** Auswahl, Reihenfolge (`published_at desc nulls last, id`), Seiten und Karten kommen weiter allein aus `search_founder_discovery_profiles_v2`. Der Shadow-Lauf rechnet zusätzlich und verwirft sein Ergebnis.

## Heutiger Datenfluss

```
/discovery?mode=search (page.tsx, Server Component)
  → getOwnSearchPreferences + getDiscoveryCandidatesForCurrentUser(user.id, page)
      → getOwnDiscoveryProfile (nur aktiv sucht)
      → RPC search_founder_discovery_profiles_v2(8 Kriterien, page_size 12, offset)
          einseitige Ja/Nein-Filter, fehlende Werte fallen heraus, sortiert nach published_at, LIMIT/OFFSET
      → Mapping zu FounderDiscoveryProfile (industries leer, bio leer, updatedAt = published_at)
      → buildDiscoveryV2Candidate (+ practicalMatches aus den eigenen Kriterien)
  → FounderDiscoveryCard; Detail: /discovery/[profileId]
```

Stöbern („Für dich“, `getDiscoveryExploreProfilesForCurrentUser`) ist nicht Teil von E1.

## Hook und Flag

- Der Aufruf `scheduleFindMatchingShadow(…, { schedule: after })` steht nach dem Aufbau der sichtbaren Treffer. Er wird nicht abgewartet, und sein Rückgabewert wird nicht verwendet. Die Rückgabe der Suche ist dieselbe wie vorher.
- `MATCHING_FIND_V01_SHADOW_ENABLED` ist nur eine Server-Variable. Nur `true` (Groß-/Kleinschreibung und Leerzeichen egal) schaltet den Shadow ein; fehlt die Variable oder hat sie einen anderen Wert, bleibt er aus. Ist er aus, entsteht kein Client und keine Abfrage.
- `after` (Next 15) startet den Lauf erst nach der Antwort. Ohne Request-Kontext wird nichts eingeplant.

## Eingaben je Seite (feste Batch-Abfragen, keine N+1)

| Daten | Quelle | Client |
|---|---|---|
| Profilfelder | Zeilen der sichtbaren RPC-Seite, eigenes FIND-Profil | – |
| Founder-Rolle | `profiles.roles` | Service Role |
| Branchen, Expertise, Ort, Remote | `person_core` (Spec §4) | Service Role |
| Matching-Freigabe, Disclosure | `person_core.capability_matching_allowed` / `capability_disclosure`, über `capabilityMatchingPermissionFromRow` | Service Role |
| Capability-Einträge, Familien | `person_capability_entries` nur für Personen mit Freigabe, `capability_areas` | Service Role |
| eigene v0.1-Kriterien | bereits geladene eigene Suchkriterien; der Adapter nimmt nur die acht | – |
| Kriterien der Kandidaten | `getCandidateMatchingV01Constraints` (nur acht Kriterien, wirft bei Fehler) | Service Role |
| Blockierung | `network_blocks` (symmetrisch) | Service Role |
| Verbindung (nur Reason-Tiefe) | angenommene `discovery_intro_requests` / `network_contact_requests`; gemeinsame Teams zählen nicht, dann fehlt höchstens ein Reason | Service Role |

Das sind höchstens 8 Abfragen, egal wie groß die Seite ist. Workstyle, Research, Nachrichten und die vier Produktfelder werden nicht gelesen bzw. nicht verwendet.

## Ergebnis (nur intern)

`FindMatchingShadowResult` enthält:

- Status und Fehlerart,
- `matching_version`, `normalization_version`, Zeitpunkt,
- den Pool (Seite, Seitengröße, Treffer auf der Seite, Gesamtzahl der RPC),
- je Kandidat: interne ID, sichtbare Position, Gate-Status, Shadow-Rang, Gleichstandsgruppe und präsentierbare Reason-Codes,
- Zählwerte.

Es enthält keine Scores, Kriterien, Capability-Werte, Profile oder Reason-Daten.

Das Ergebnis wird weder gespeichert noch geloggt. Nur ein ausdrücklich übergebener Beobachter (Tests) sieht es. In Production wird es verworfen; Beobachtbarkeit ist ein Punkt für E2.

## Fehlerverhalten

Fehlt der Service-Client, schlägt eine Abfrage fehl, werfen Kriterien-Loader, Engine oder Presenter, oder ist kein Scheduler verfügbar, dann:

- endet der Shadow-Lauf mit `failed` und einer Fehlerart,
- gelten fehlende Kriterien nie stillschweigend als „keine Kriterien“,
- bleibt die sichtbare Suche unberührt, weil sie zu diesem Zeitpunkt schon beantwortet ist.

## BLOCKER vor echtem v0.1-Ranking

1. **Pool-Bias durch Seiten.** Die RPC sortiert nach `published_at` und gibt 12 Treffer je Seite. Der Shadow sieht nur diese Seite. Ein relevanter Kandidat auf Seite 3 erscheint im Shadow von Seite 1 nie.
   - Harness auf den synthetischen Fixtures (`npm run matching:harness -- find-shadow syn-p001`): Keiner der 12 global besten v0.1-Kandidaten steht auf der ersten sichtbaren Seite.
   - Bei `syn-p010` sind es 10 von 12.
2. **Die RPC filtert anders als das Gate v03.** Einseitig statt beidseitig, Ja/Nein statt drei Zustände, und fehlende Werte schließen aus statt `uncertain`. Dazu kommen Expertise und Ort als exakter Textvergleich statt Normalisierung, `flexible` ohne Sonderregel, und Capability-Bereiche nach Sichtbarkeit (`capability_disclosure`) statt nach Matching-Freigabe. Kandidaten, die v0.1 als `uncertain` behalten würde, kommen gar nicht erst in den Pool.
3. **Die RPC prüft weder die Founder-Rolle der Kandidaten noch Blockierungen.** Der Shadow schließt diese Personen aus, die sichtbare Suche zeigt sie heute. Das ist ein eigenes Produktthema außerhalb von v0.1.

Echtes Ranking braucht deshalb einen eigenen serverseitigen Kandidatenpool (alle aktiven Founder-Profile ohne die Filter der RPC, das Gate macht die Engine) und Seiten erst nach dem Ranking. Für E1 ist nichts davon umgebaut.

## Lokaler Vergleich

`npm run matching:harness -- find-shadow <syn-id> [page]` stellt auf den synthetischen Fixtures die heutige Reihenfolge (ohne Filter der RPC) dem v0.1-Rang gegenüber, auf der ersten Seite und global. Es gibt nur Fixture-IDs aus, keine Produktdaten. Daraus wird keine Produktentscheidung automatisiert.

Hinweis (E2): Die Fixtures haben kein `published_at`. Die „heutige“ Reihenfolge fällt dort, wie in der RPC (`nulls last`), auf die ID zurück. Das ist eine willkürliche, aber deterministische Reihenfolge. Die Zahlen zeigen den Mechanismus, nicht die Größenordnung in Production.

---

# E2 – Globaler Shadow-Pool und Auswertung

Umsetzung:

- `findMatchingGlobalShadow.ts`: Population, Basispool, globaler Lauf, Seiten
- `findShadowEvaluation.ts`: Nachbildung der heutigen Suche, Kennzahlen
- `findMatchingInputs.ts`: gemeinsamer Input-Aufbau mit E1
- `scripts/find-shadow-eval.ts`: Auswertung gegen eine Datenbank

**Weiterhin nichts sichtbar.** Die heutige RPC bleibt unverändert und ist nicht der Pool für v0.1.

## Pipeline

```
aktive FIND-Profile (alle, ohne published_at-Seiten)
  → Basispool: nur Produkt-/Access-Gates
  → v0.1-Eingaben (person_core, Rolle, Kriterien beider Seiten, Capability nur mit Freigabe)
  → bilaterales Gate v03 → Relevanz + Gegenseitigkeit
  → globale stabile Reihenfolge (Gegenseitigkeit, dann published_at, dann ID; Gleichstände als tieGroup)
  → ERST DANN Seiten (paginateFindShadow, 12 je Seite)
```

## Basispool: Produkt-Gates (A) vs. Matching-Gates (B)

| Regel | Klasse | Quelle |
|---|---|---|
| FIND-Profil `status = active` | A | Spec §7 Pool; wie heute |
| Rolle `founder` (`profiles.roles`) | A | Spec §7 Pool; heute in der Suche nicht geprüft |
| nicht die betrachtende Person | A | Spec §7 |
| keine Blockierung (`network_blocks`, symmetrisch) | A | Spec §7; heute in der Suche nicht geprüft |
| Betrachter selbst aktiv und Founder | A | wie heute die Suche (nur aktiv sucht) |
| Kontolöschung | A | Löschen entfernt Profile per Kaskade; eine FIND-eigene Deaktivierung gibt es nicht |
| Intro-/Kontaktstatus | – | kein Pool-Kriterium; nur Reason-Tiefe (Capability) |
| die acht v0.1-Must-haves, beide Richtungen | B | Gate v03 in der Engine |
| beide `onsite` an verschiedenen Orten | B | Gate v03 |
| `requiredIndustriesAny`, `acceptedCommitmentLevels`, `acceptedVentureStages`, `acceptedVentureGoals` | – | weder A noch B (nicht Teil von v0.1) |

Die Engine prüft Pool-Regeln noch einmal (`POOL_*`). Der Basispool spart nur Rechenzeit.

## Audit: Founder-Rolle und Blockierung in der heutigen Suche

Lokal nachgestellt (Transaktion mit Rollback, 16.10.2026).

**A – Founder-Rolle entfernt.** Unter `/profile` (Schritt „Identität“) lässt sich der Haken „Founder“ abwählen, wenn „Advisor“ bleibt; RLS `profiles_update_self` erlaubt das. Danach:

- Das FIND-Profil bleibt `active`, andere Founder finden es in der Suche und lesen es direkt. Die Select-Policy prüft nur die Rolle der *betrachtenden* Person.
- Die Person selbst sieht ihr FIND-Profil nicht mehr und kann es nicht pausieren. Auch ihre eigenen Zugriffe brauchen `is_current_user_discovery_founder()`; ein `UPDATE` auf `paused` trifft 0 Zeilen.

**Urteil: EXISTING PRODUCT BUG mit Privacy-Wirkung.** Die Person verliert die Kontrolle über ein weiter veröffentlichtes Profil. Es werden keine privaten Daten offengelegt.

**Vorschlag (separater kleiner Fix):** ein Trigger auf `profiles`, der beim Entfernen von `founder` das FIND-Profil auf `paused` setzt. Zusätzlich in Suche und Select-Policy die Founder-Rolle des Profilinhabers prüfen.

**B – Blockierung.** Wer blockiert hat oder blockiert wurde, findet die andere Person weiter in der FIND-Suche und kann ihr Profil lesen.

- Kompensiert ist nur die Interaktion: `enforce_discovery_intro_block` verhindert neue und angenommene Intros.
- CONNECT blendet blockierte Inhalte aus (`connect_owner_visible`), FIND nicht.

**Urteil: EXISTING PRODUCT BUG (privacy-relevant, keine Sicherheitslücke).** Es werden keine neuen Daten offengelegt und kein Kontakt ist möglich, aber das Verhalten widerspricht dem Sinn einer Blockierung und dem Verhalten von CONNECT.

**Vorschlag (separater kleiner Fix):** `and not public.is_network_interaction_blocked(profile.user_id, auth.uid())` in `search_founder_discovery_profiles_v2` und in der Select-Policy bzw. der Profil-Detailabfrage.

Beides ist nicht repariert. Der Shadow wendet beide Regeln als Produkt-Gates an. Das ist der Unterschied in der Zeile „visibleExcludedByV01“.

## Heutige RPC vs. globaler Basispool vs. v0.1-Gate

| Kriterium | heutige RPC | Basispool | v0.1-Gate | Konsequenz |
|---|---|---|---|---|
| Rolle (`requiredRolesAny`) | einseitig, Überschneidung mit `own_roles` | – | beidseitig; keine Rollen → uncertain | RPC verwirft „keine Rollen“, v0.1 behält |
| Stunden | einseitig `>=`; fehlend → raus | – | beidseitig; fehlend → uncertain; 0 = kein Kriterium | wie oben |
| Remote | Wert in Liste; fehlend → raus; `flexible` nur wenn gewählt | – | `flexible` passt immer; fehlend → uncertain | v0.1 behält Flexible |
| Ort | exakter Textvergleich (Kleinschreibung, getrimmt) | – | normalisierter Ort; Platzhalter ist keine Bedingung; remote-kompatibel löst Konflikt | stark abweichend |
| Suchstand | Wert in Liste; fehlend → raus | – | fehlend → uncertain | RPC verwirft Unvollständige |
| Start | wie Suchstand | – | wie Suchstand | wie oben |
| Capability-Bereiche | nach **Sichtbarkeit** (`capability_disclosure`) | – | nach **Matching-Freigabe**; ohne → uncertain | grundverschieden; nicht vermischen |
| Expertise | exakter Textvergleich | – | normalisierte Begriffe (Wörterbuch, Wortstamm) | v0.1 findet mehr |
| Fehlende Daten | schließen aus | – | uncertain, ohne Abzug | Kern-Unterschied |
| Founder-Rolle | nicht geprüft | ja | ja (`POOL_NOT_FOUNDER`) | heutiger Bug A |
| Blockierung | nicht geprüft | ja | ja (`POOL_BLOCKED`) | heutiger Bug B |
| Kriterien der Gegenseite | nicht geprüft | – | ja (bilateral) | v0.1 verbirgt, wen die Gegenseite ausschließt |
| Reihenfolge | `published_at desc`, ID; LIMIT/OFFSET | – | Gegenseitigkeit; Gleichstand → `published_at`, ID | Seiten erst nach dem Ranking |
| vier Produktfelder | nicht verwendet | nicht verwendet | nicht verwendet | unverändert |

**Für E3:** Keinen dieser RPC-Filter vor der Engine wieder einführen. Der Pool enthält nur die A-Regeln.

## Kennzahlen (nur Zahlen)

Je betrachtender Person:

- Basispool, Ausschlüsse (Rolle, Blockierung)
- eligible / uncertain / ineligible
- heute sichtbar (gesamt, Seite 1), Überschneidung der Top 12, v0.1-Top-12, die heute nicht auf Seite 1 stehen
- heute sichtbar, aber von v0.1 ausgeschlossen; von v0.1 behalten, aber heute herausgefiltert
- Positionswechsel (gleich/hoch/runter, Median der Abstände)
- Gleichstände (Gruppen, Personen, Gleichstand auf Rang 1, Gruppe über die Seitengrenze)

Aggregiert über alle Personen: Summen, Anteile, Mittelwerte. Keine IDs, Namen, Kriterien, Orte, Texte oder Capability-Werte. Daraus folgt keine Qualitätsaussage.

**Suchen mit Capability-Filter** sind „nicht vergleichbar“: Die heutige RPC liest dafür sichtbare Bereiche ohne Matching-Freigabe, und die Auswertung lädt solche Daten nicht.

**Prüfung der Nachbildung:** Lokal mit 101 synthetischen Personen gegen die echte RPC gerechnet. Bei allen 99 vergleichbaren Betrachtern war die Reihenfolge identisch.

**Ergebnisse auf synthetischen Daten** (99 von 101 vergleichbar):

| Kennzahl | Fixtures (`find-shadow-eval`) | lokale DB (`matching:find-shadow-eval`) |
|---|---|---|
| Anteil heute sichtbarer Treffer, die v0.1 ausschließt | 0,227 | 0,227 |
| Anteil v0.1-zulässiger, die heute herausfallen | 0,011 | 0,011 |
| mittlere Überschneidung der Top 12 | 2,1 | 2,4 |
| Personen mit Gleichstand über die Seitengrenze | 22 | 41 |

Die lokale DB hat keine Matching-Freigaben (Capability wirkt nicht), dadurch gibt es mehr Gleichstände. Das sind Fixture-Werte, keine Produktaussage.

## Skalierung

| | Abfragen für die Population | Engine je Betrachter (gemessen) | alle Betrachter (Auswertung) |
|---|---|---|---|
| 100 Profile | 5 | ~7 ms | < 1 s |
| 1.000 Profile | ~1 + 3·5 + 1 = 17 | ~26 ms | ~30 s |
| 10.000 Profile | ~10 + 3·50 + 1 ≈ 161 | ~240 ms | ~40 min |

Abfragen wachsen mit ceil(N/1000) und ceil(N/200), nie je Kandidat. Der Speicher liegt bei 10.000 Profilen im niedrigen zweistelligen MB-Bereich (gemessen ~60 MB Heap). `rankGlobalFindShadow` rechnet jedes Paar zweimal (Status und Rang). Das lässt sich halbieren, ist aber noch nicht nötig.

**Bewertung:**

- Für den Beta-Bestand (Hunderte) ist „alles laden, in Node ranken“ unkritisch.
- **Je Suche** die ganze Population zu laden, skaliert ab etwa 1.000 Profilen nicht: Die Ladezeit ist dann der Engpass.
- Für E3 braucht es deshalb einen Population-Cache oder Snapshot mit kurzer Lebensdauer, oder eine set-basierte Vorauswahl in SQL, die nur A-Regeln anwendet. Die Engine bleibt kanonisch.

Der globale Hook (`MATCHING_FIND_V01_GLOBAL_SHADOW_ENABLED`) ist deshalb nur für kleine Bestände gedacht.

## Auswertung ausführen

```bash
cd web
npm run matching:harness -- find-shadow-eval        # synthetische Fixtures, ohne DB
npm run matching:find-shadow-eval                   # lokale DB
npm run matching:find-shadow-eval -- --confirm-remote=<host>   # NICHT ohne ausdrückliche Entscheidung
```

Gegen Production ist nichts gelaufen.
