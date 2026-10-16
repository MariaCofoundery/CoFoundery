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
3. ~~Die RPC prüft weder die Founder-Rolle der Kandidaten noch Blockierungen.~~ **Behoben seit Commit 80f39156** (Migration `20261130120000_find_access_integrity.sql`): Die Suche und die FIND-Profile prüfen jetzt Founder-Rolle und Blockierung (beide Richtungen). Dieser Punkt ist kein Unterschied zwischen sichtbarer Suche und Shadow mehr.

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
| Rolle `founder` (`profiles.roles`) | A | Spec §7 Pool; seit 80f39156 auch in der Suche geprüft |
| nicht die betrachtende Person | A | Spec §7 |
| keine Blockierung (`network_blocks`, symmetrisch) | A | Spec §7; seit 80f39156 auch in der Suche geprüft |
| Betrachter selbst aktiv und Founder | A | wie heute die Suche (nur aktiv sucht) |
| Kontolöschung | A | Löschen entfernt Profile per Kaskade; eine FIND-eigene Deaktivierung gibt es nicht |
| Intro-/Kontaktstatus | – | kein Pool-Kriterium; nur Reason-Tiefe (Capability) |
| die acht v0.1-Must-haves, beide Richtungen | B | Gate v03 in der Engine |
| beide `onsite` an verschiedenen Orten | B | Gate v03 |
| `requiredIndustriesAny`, `acceptedCommitmentLevels`, `acceptedVentureStages`, `acceptedVentureGoals` | – | weder A noch B (nicht Teil von v0.1) |

Die Engine prüft Pool-Regeln noch einmal (`POOL_*`). Der Basispool spart nur Rechenzeit.

## Audit: Founder-Rolle und Blockierung in der Suche (historisch, behoben)

**Aktueller Stand:** Beide Befunde sind seit Commit 80f39156 behoben (Migration `20261130120000_find_access_integrity.sql`). Die Suche zeigt nur Founder und niemanden, mit dem eine Blockierung besteht; die FIND-Profile sind auch per direktem API-Zugriff entsprechend geschützt. Wer die Founder-Rolle verliert, wird automatisch pausiert. Bestehende Beziehungen behalten ihren Anzeigenamen über `get_relationship_display_names`. Seit `20261201120000` bzw. `20261202120000` liefert auch `get_disclosed_capability` in den Kontexten `discovery` und `connect` bei Blockierung keine Capability-Daten.

Der folgende Befund beschreibt den Stand vor diesem Fix:

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

Beides war zum Zeitpunkt des Audits nicht repariert und ist seit 80f39156 behoben (siehe oben). Der Shadow wendet beide Regeln weiter als Produkt-Gates an. In den unten dokumentierten E2-Auswertungen floss der damalige Unterschied in „visibleExcludedByV01“ ein; die Zahlen selbst sind unverändert.

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
| Founder-Rolle | seit 80f39156 geprüft (vorher nicht) | ja | ja (`POOL_NOT_FOUNDER`) | kein Unterschied mehr |
| Blockierung | seit 80f39156 geprüft, beide Richtungen (vorher nicht) | ja | ja (`POOL_BLOCKED`) | kein Unterschied mehr |
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

**Hinweis seit 80f39156:** Die oben genannte Prüfung und die E2-Zahlen beziehen sich auf die Fassung `search_by_frame` (ohne Founder-Rolle und Blockierung). **Seit E3a** bildet `currentFindRpcOrder` die aktuelle Suche nach (mit Founder-Rolle und Blockierung) und wurde erneut lokal gegen die echte RPC geprüft (siehe E3a).

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

---

# E3a – Produktionsfähiger globaler Kandidatenpool

Umsetzung:

- Migration `20261203120000_find_matching_pool.sql`
- `web/src/features/discovery/findMatchingPool.ts`
- `scripts/find-pool-bench.ts` (`npm run matching:find-pool-bench`, nur lokal)

**Weiterhin nichts sichtbar:** Die FIND-Suche nutzt unverändert `search_founder_discovery_profiles_v2`, und die Flags sind standardmäßig aus.

## Pool-Vertrag (nur Produkt-/Access-Gates)

| Regel | wo |
|---|---|
| FIND-Profil `active` | `find_matching_pool_core` |
| Inhaber aktuell Founder | `discovery_profile_owner_is_founder` |
| nicht die betrachtende Person | Pool |
| keine Blockierung, beide Richtungen | `is_network_interaction_blocked` |
| betrachtende Person selbst aktiv und Founder | sonst `null` (wie die Suche: nur wer aktiv ist, sucht) |
| gelöschtes Konto | Kaskade, keine eigene Regel nötig |

**Nicht im Pool:**

- die acht v0.1-Kriterien (Rollen, Stunden, Remote, Ort, Suchstand, Start, Capability, Expertise),
- fehlende Daten,
- die Kriterien der Gegenseite,
- die vier Produktfelder,
- Workstyle.

Das alles bleibt Sache der Engine. Eine FIND-eigene Kontosperre gibt es nicht. CONNECT-Mitgliedschaftssperren gelten für FIND nicht, wie bei der heutigen Suche.

## Funktionen

| Funktion | Zugriff | liefert |
|---|---|---|
| `get_find_matching_pool()` | angemeldete Person (`auth.uid()`), ohne Service-Role-Pool | Betrachter + Pool als ein JSON-Dokument |
| `get_find_matching_pool_for_viewer(uuid)` | nur `service_role` | dasselbe für Server-Shadow und Auswertung |
| `get_find_matching_inputs(uuid[])` | nur `service_role` | je Person: `person_core`-Matchingfelder, **nur die acht v0.1-Kriterien** (nie die vier Produktfelder, nichts Unbekanntes), Capability-Einträge **nur mit Matching-Freigabe** |

**Felder im Pool:** `user_id`, `profile_id`, Rollen, Stunden, Flexibilität, Commitment, Phase, Ziel, Suchstand, Start, `published_at`, `updated_at` und `has_contact`. `has_contact` ist eine angenommene Verbindung (Intro, CONNECT-Kontakt oder gemeinsames Team) und wirkt nur auf die Tiefen-Sichtbarkeit von Reasons. Nicht enthalten sind Namen, Headline, Bio, Kriterien, Capability und Workstyle.

**Service-Role:** Die Inputs brauchen sie, weil fremde `person_core`-Zeilen und Suchkriterien nur für ihre Inhaber lesbar sind. Der Pool selbst geht auch über die Sitzung (`get_find_matching_pool`). Beide Ergebnisse sind je ein JSON-Dokument, deshalb greift die PostgREST-Grenze von 1000 Zeilen nicht.

## Abfragen

| Profile | E2 (Tabellen-Blöcke) | E3a |
|---|---|---|
| 100 | 7 | 3 |
| 1.000 | 22 | 3 |
| 10.000 | 196 | 7 (Inputs in Blöcken zu 2000) |

## Messung (lokal, synthetisch, Median über 5 Betrachter)

| Profile | Pool | Inputs | Aufbau | Engine | Gesamt | Payload Pool + Inputs | Heap |
|---|---|---|---|---|---|---|---|
| 100 | 6 ms | 4 ms | <1 ms | 3 ms | 15 ms | ~0,1 MB | ~11 MB |
| 1.000 | 22 ms | 22 ms | 1 ms | 34 ms | 84 ms | ~1 MB | ~30 MB |
| 10.000 | 260 ms | 218 ms | 14 ms | 1.130 ms | 1,6 s | ~9,7 MB | ~200 MB |

Zum Vergleich, der E2-Lader (ganze Population): 48 ms, 103 ms und 577 ms lokal. In Production kommt die Netzlatenz je Roundtrip hinzu, und davon hat E2 bei 10.000 Profilen 196.

## Braucht es Cache?

- **Bis etwa 1.000 Profile: nein.** Unter 100 ms lokal.
- **Bei 10.000 Profilen dominiert die Engine (~70 %), nicht das Laden.** Ein Population-Cache spart höchstens ~0,5 s und löst das Problem nicht.

Empfehlung für E3b in dieser Reihenfolge, ohne Formeländerung:

1. Im Shadow-Lauf wird jedes Paar zweimal gerechnet (`matchFindPair` für den Status und noch einmal in `rankFindCandidates`). Den Rang aus den vorhandenen Ergebnissen zu bilden, halbiert die Engine-Zeit.
2. Erst ab einigen tausend aktiven Profilen: ein Ergebnis-Cache je Betrachter mit kurzer Lebensdauer (z. B. 5–15 min). Er speichert nur geordnete IDs, Tie-Gruppen und Reason-Codes, keine Inputs. Er bindet sich an eine Bestandsversion (z. B. max `updated_at` des Pools) und hilft vor allem beim Blättern.
3. Cache-Invalidierung erst danach. Noch nicht gebaut.

## Seiten

`paginateFindShadow` (12 je Seite) läuft auf dem globalen Rang. Getestet: deterministisch über Läufe, keine Doppelten, keine Lücken, Gleichstandsgruppen zusammenhängend auch über eine Seitengrenze, ohne eigene Tie-Oberfläche.

## Nachbildung der aktuellen Suche

`currentFindRpcOrder` berücksichtigt jetzt Founder-Rolle und Blockierung. Lokal geprüft mit 300 synthetischen Personen, darunter 13 Blockierungen und 6 aktive Profile ohne Founder-Rolle: Bei allen 288 vergleichbaren Betrachtern ist die Reihenfolge identisch mit der echten aktuellen RPC. 6 Betrachter sind wegen eines Capability-Filters nicht vergleichbar.

## Parität

Auf denselben 300 Personen liefert der DB-Pool für alle 294 suchenden Betrachter genau den E2-Basispool. Gate-Status, Rang, Gleichstände und Reason-Codes sind identisch. Ein Unit-Test prüft dasselbe auf Fixture-Daten.

---

# E3b – v0.1 als Rankingpfad hinter einem Server-Flag (standardmäßig aus)

Umsetzung:

- `web/src/features/discovery/findMatchingRanking.ts` (`getFindCandidatesV01ForCurrentUser`)
- Weiche in `getDiscoveryCandidatesForCurrentUser`

**Mit Standard-Konfiguration ändert sich nichts.**

## Flag und Weiche

- `MATCHING_FIND_V01_RANKING_ENABLED` ist nur eine Server-Variable. Nur `true` schaltet ein; fehlt die Variable oder hat sie einen anderen Wert, gilt die heutige Suche. Sie ist getrennt von den beiden Shadow-Flags.
- **Flag an:** v0.1 für die Suche. Stöbern („Für dich“) bleibt bei der heutigen Funktion.
- **Ein Fehler im v0.1-Pfad:** Für diese Anfrage gilt die heutige Suche, unverändert. Es gibt kein gemischtes oder halbes Ergebnis, keinen Fehler an den Client und keine Logs.
- Fehlerarten (intern): `session_invalid`, `viewer_mismatch`, `viewer_not_searching`, `service_unavailable`, `pool_failed`, `inputs_failed`, `engine_failed`, `detail_failed`.

## Ablauf

1. Sitzung prüfen. Die gesuchte ID muss die angemeldete Person sein, sonst wird nichts geladen und der Service-Client gar nicht erst erzeugt.
2. Pool und Bereichsfamilien über die Sitzung (`get_find_matching_pool`, `auth.uid()`).
3. Private Inputs über den Service-Client (`get_find_matching_inputs`). Das ist seine einzige Aufgabe.
4. Pool und Inputs müssen dieselbe Person enthalten.
5. Gate v03, Relevanz, Gegenseitigkeit und globaler Rang (`rankGlobalFindShadow`, derselbe Baustein wie in den Shadows).
6. Seite zu 12 Einträgen. Außerhalb des Bereichs: leere Seite, die Gesamtzahl bleibt.
7. Nur für die IDs der Seite die Karten über den bestehenden RLS-Lader (`getActiveDiscoveryProfilesByIds`). Die Reihenfolge der Engine wird wiederhergestellt; wer inzwischen nicht mehr lesbar ist, entfällt, und nichts kommt hinzu.
8. Die Ausgabe ist dieselbe Suchprojektion wie heute: keine Bio, keine Branchen, kein letzter Schritt, Zeitstempel aus `published_at`. Gesamtzahl = alle global zulässigen Kandidaten.

Nicht nach außen gehen Scores, Komponenten, Gegenseitigkeit, Confidence, Gate-Gründe, Kriterien, `tieGroup`, `secondaryOrder`, die Capability-Freigabe und Capability-Details.

## Kosten je Anfrage

Zwei Ursachen waren behoben worden:

1. **Doppelte Rechnung:** Jedes Paar wurde zweimal gerechnet (`matchFindPair` für den Status und noch einmal in `rankFindCandidates`). Jetzt einmal; der Rang entsteht aus denselben Ergebnissen über `rankWithTies`. Ein Paritätstest zeigt, dass das Ergebnis strukturell identisch zu `rankFindCandidates` ist.
2. **Quadratischer Input-Aufbau:** Jede Person filterte die gesamte Liste der Capability-Einträge. Jetzt einmal je Person gruppiert.

Messung (lokal, synthetisch, Median über 5 Betrachter):

| Profile | Pool | Inputs | Engine | Karten der Seite | Gesamt | Abfragen |
|---|---|---|---|---|---|---|
| 100 | 6 ms | 4 ms | 1 ms | 5 ms | 20 ms | 3 + Karten |
| 1.000 | 24 ms | 24 ms | 14 ms | 4 ms | 70 ms | 3 + Karten |
| 10.000 | 234 ms | 225 ms | 81 ms | 6 ms | 0,57 s | 7 + Karten |

Vor E3b lag die Engine bei 10.000 Profilen bei 1.136 ms und die Gesamtzeit bei 1,66 s. Die Karten-Zeit ist lokal über den Service-Client gemessen, mit denselben Spalten wie der RLS-Lader; das ist eine Annäherung.

## Cache?

**Vor der Closed Beta nicht nötig.** Bis 1.000 Profile bleibt es lokal unter 100 ms. Bei 10.000 Profilen dominiert jetzt die Übertragung von Pool und Inputs (zusammen ~9,7 MB). Ein Ergebnis-Cache je Person wird erst bei einigen tausend aktiven Profilen relevant. Davor wäre es günstiger, die Payload zu verkleinern (z. B. nur Kandidaten mit Matching-relevanten Feldern, kompaktere Kodierung).
