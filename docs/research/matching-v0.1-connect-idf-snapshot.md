# CONNECT-IDF-Snapshot (Matching v0.1) – Betrieb

Stand: 14.10.2026. Grundlage: Spec §11.2 (`matching-engine-v0.1-spec.md`, eingefroren).

**CONNECT nutzt Matching v0.1 noch nicht.** Dieses Dokument beschreibt nur Bauen, Prüfen und Laden eines Snapshots. Kein Such- oder Vorschlagspfad liest ihn.

## Was ein Snapshot ist

Ein Snapshot liefert die Tabelle `N` + `df(token)` für `idf(tok) = ln((N + 1) / (df(tok) + 1))`. CONNECT C1 gewichtet damit die Text-Token eines Gesuchs. Ein Token, das im Snapshot fehlt, erhält `ln(N + 1)`.

| | |
|---|---|
| Dokument | ein CONNECT-Eintrag (`network_listings`), Gesuch und Angebot |
| Text je Dokument | Titel + Beschreibung + Themen, Token nach `matching-normalization-v0.1` (`textTokens`), je Dokument jedes Token einmal |
| Korpus | `public.connect_idf_corpus_documents(as_of)`: Eintrag `active`, `published_at ≤ as_of < expires_at`, Sichtbarkeit `members_only`/`public`, Profil `active`, Mitgliedschaft `active` |
| nicht im Korpus | Entwürfe, pausierte/erledigte/gelöschte Einträge, Profile, Probleme, Ventures, Nachrichten, Capability, Workstyle, Research, Advisor-Daten |
| Ablage | `public.matching_idf_snapshots`, nur `service_role`, nur anhängen |
| gespeichert | Version, `scope = connect`, `matching_version`, `normalization_version`, `corpus_as_of`, `N`, `df`, `sha256`, `created_at` – keine Texte, keine IDs |
| Version | `connect-idf-<matching_version>-<YYYYMMDD corpus_as_of UTC>-<sha256[0:8]>` |
| Hash | SHA-256 von `{"df":{…},"n":N}` mit sortierten Schlüsseln (wie `idf.ts` und der Python-Generator); die Datenbank rechnet ihn beim Einfügen nach |

`suggestable` ist kein Korpus-Gate. Es gilt nach Spec §10 nur für aktive Personenvorschläge. Der Eintrag selbst bleibt für das Listing-Matching zulässig. Blockierungen gelten zwischen zwei Personen und betreffen den gemeinsamen Korpus nicht.

## Snapshot bauen

```bash
cd web
npm run matching:idf-snapshot                                   # Probelauf, schreibt nichts
npm run matching:idf-snapshot -- --write                        # einfügen und zurückladen
npm run matching:idf-snapshot -- --write --as-of=2026-11-01T00:00:00Z
```

- Liest `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` aus `web/.env.local`.
- Gegen eine nicht-lokale Datenbank bricht das Skript ab, solange der Host nicht ausdrücklich bestätigt ist: `--confirm-remote=<host>`.
- Ausgabe nur Kennzahlen: Version, N, Anzahl Token, Token mit df = 1 und df = 2, Hash. Nie Token oder Texte.
- Ein zweiter Lauf mit identischem Ergebnis ändert nichts („bereits vorhanden“).

**Production:** Der erste Production-Snapshot wird bewusst einmal aus den Production-Daten gebaut: zuerst ein Probelauf, dann `--write --confirm-remote=<host>`. Vorher muss die Migration `20261129120000_matching_idf_snapshots.sql` in Production angewendet sein. Ein lokal gebauter Snapshot ist nie der Production-Snapshot: Er liegt nur in der lokalen Datenbank, und seine Version existiert in Production nicht. Der Loader würde ihn dort ablehnen.

## Prüfen und Version feststellen

- Das Skript lädt nach dem Schreiben über `getConnectIdfSnapshot` zurück. Dabei prüft es Version, Hash, `matching_version` und `normalization_version`.
- Die Version steht in der Ausgabe (`idfCorpusVersion`) und in `matching_idf_snapshots.idf_corpus_version`.
- Das Mapping Version → SHA steht in derselben Zeile. Die ersten 8 Zeichen des SHA sind Teil der Version.

## Aktivieren (Schritt C, noch nicht gebaut)

Die aktive Version wird ausdrücklich konfiguriert, zum Beispiel als Server-Umgebungsvariable `MATCHING_CONNECT_IDF_CORPUS_VERSION`, und nie als „latest“ ermittelt. Der Matcher lädt genau diese Version mit `getConnectIdfSnapshot(serviceClient, version)`. Fehlt sie oder schlägt eine Prüfung fehl, wirft der Loader. Der CONNECT-Pfad muss dann ohne v0.1-Ranking weiterlaufen; er darf weder live rechnen noch auf eine andere Version zurückgreifen.

## Rollback

Die Konfiguration wird auf die vorherige Version zurückgesetzt. Alte Snapshots bleiben unverändert erhalten; die Tabelle verbietet `UPDATE`, `DELETE` und `TRUNCATE` auch für `service_role`. Ergebnisse tragen `idfCorpusVersion`, dadurch bleibt nachvollziehbar, mit welchem Snapshot gerechnet wurde.

## Wann ein neuer Snapshot nötig ist

- neue `matching_version`,
- neue `normalization_version`,
- ein bewusster, protokollierter Korpus-Refresh, zum Beispiel wenn sich der Bestand an Einträgen deutlich verändert hat.

**Nicht** bei jedem neuen Profil oder Eintrag. Neue Einträge werden mit dem eingefrorenen Snapshot bewertet; ihre unbekannten Token erhalten `ln(N + 1)`. Eine automatische Rotation gibt es nicht.

## Privacy: seltene Token (offener Punkt)

Der Snapshot enthält jedes normalisierte Token aller zulässigen Einträge, auch seltene. Ein Token mit df = 1 kann ein Name, ein Firmenname, eine Zahlenfolge (zum Beispiel aus einer Telefonnummer) oder ein Teil einer E-Mail-Adresse sein, wenn jemand das in einen Eintrag schreibt. Beispiel: `max.mustermann@example.com` → `max`, `musterman`, `example`. Im lokalen Probelauf (24 synthetische Einträge) hatten 37 von 74 Token df = 1.

Was bereits begrenzt ist:

- keine Texte, keine Reihenfolge, kein Zusammenhang zwischen Token, keine Eintrags- oder Nutzer-IDs;
- nur `service_role` liest die Tabelle;
- die Quelltexte waren zum Stichtag ohnehin für alle Mitglieder sichtbar.

Was bleibt: Ein Token aus einem später gelöschten Eintrag oder Konto bleibt im alten Snapshot stehen.

Seltene Token zu entfernen (Mindest-df) würde deren IDF von `ln((N+1)/2)` auf `ln(N+1)` ändern und damit Scores. Spec §11.2 erlaubt das nur als neue `matching_version`. Deshalb ist nichts davon umgesetzt. Zur Entscheidung:

1. **Hingenommen, mit Aufbewahrungsregel:** Abgelöste Snapshots werden nach einer festen Frist per eigener Migration entfernt; bei einem Löschersuchen wird neu gebaut.
2. **Token pseudonymisieren** (HMAC mit Server-Schlüssel statt Klartext): lässt die Scores unverändert, ändert aber den Snapshot-Vertrag der Engine (`createIdfIndex` schlägt Klartext-Token nach), den Hash und die Paritäts-Fixtures. Das ist eine bewusste Engine-Änderung, keine stille.
3. **Mindest-df** als neue `matching_version` mit eigener Auswertung.
