# Founder-Compatibility Item Registry v1 Schema

Die kanonische Registry liegt in [founder-compatibility-item-registry-v1.json](/Users/sascha.schubertgmx.de/Desktop/cofoundery-app/web/docs/founder-compatibility-item-registry-v1.json).

## Top-Level

- `registryVersion`: Version der Registry-Struktur
- `modelVersion`: fachliche Modellversion
- `createdAt`: Erstellungsdatum
- `dimensions`: kanonische Dimensionsmetadaten
- `namingConventions`: globale Konventionen für Benennung, Skalen und Polrichtung
- `items`: flache Liste aller aktiven Items

## Pro Item

- `itemId`: kanonische Item-ID
- `version`: aktuell `v1`
- `dimensionId` / `dimensionLabel`: fachliche Zuordnung
- `layer`: `core` oder `support`
- `type`: `likert`, `forced_choice`, `scenario`
- `prompt`: finaler deutscher Prompt
- `choices`: explizite normalisierte Antwortoptionen
- `polarity`: Regel zur Links-/Rechts-Polung
- `status`: `retained`, `rewritten`, `new`
- `isActive`: Aktivitätsflag
- `order`: globale Ausspielreihenfolge
- `reportUsage`: vorgesehene Report-Nutzung
- `workbookUsage`: vorgesehene Workbook-Nutzung
- `rationale`: fachliche Kurzbegründung

## Implementationshinweis

- `core`-Items sind scoring-relevant
- `support`-Items sind nur für Narrative, Enrichment und Workbook-Kontext da
- Aggregattension heißt `overallTension`
- `conflictRiskIndex` ist in v1 ausdrücklich veraltet
