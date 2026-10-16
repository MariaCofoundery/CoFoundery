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
