# Matching v0.1 – Explainability- und Privacy-Matrix

Stand: 14.10.2026. Grundlage: Spec §5, §14, §15 (eingefroren) und `matching-engine-v0.1-implementation-decisions.md`.
Umsetzung: `web/src/lib/matching/reasonPresentation.ts` (`presentFindReasons`, `presentConnectReasons`), Texte unter `find.matchingReasons.*` und `connect.matchingReasons.*`.

**Noch nichts davon ist eingebunden.** Die heutige FIND-Karte zeigt weiter nur die „praktischen Übereinstimmungen“ aus den eigenen Suchkriterien der suchenden Person (`practicalMatches`). CONNECT zeigt keine Engine-Reasons.

## Sichtbarkeitsklassen

| Klasse | Bedeutung |
|---|---|
| `both` | Beide Seiten sehen den Grund, jede aus eigener Sicht. Die Engine erzeugt ihn je Seite mit `audience = a/b`. |
| `searcher` | Nur die betrachtende Person, weil es um ihre eigene Angabe oder Bedingung geht. In CONNECT ist das die Person mit dem Gesuch. |
| `candidate` | Nur die vorgeschlagene Person. In v0.1 gibt es keinen solchen Code. |
| `internal` | Nur Server und Tests, nie Oberfläche. |

Der Presenter gibt nur Reasons mit `audience` = Betrachter und einer Klasse außer `internal` heraus. Dazu nur die Parameter aus der Richtlinie: Enum-Werte als Schlüssel mit Label-Namespace, Texte als Originalwert mit höchstens 120 Zeichen. Ein unbekannter Code oder ein unerwarteter Wert lässt den Reason ganz entfallen.

## FIND

| Reason | Quelle | Ranking-Einfluss | Betrachter | Gegenüber | Intern | Besondere Regel |
|---|---|---|---|---|---|---|
| `FIND_ROLE_NEED_COVERED` | Rollen beider FIND-Profile | ja (role_cover) | ja | eigene Sicht | – | `role` als Schlüssel, Label `discovery.roles` |
| `FIND_ROLE_NEED_COVERED_REVERSE` | Rollen beider FIND-Profile | ja | ja | eigene Sicht | – | wie oben |
| `FIND_AREA_OWN_COVERED` | Capability | ja (cap_cover) | ja | eigene Sicht | – | Nur, wenn beide Seiten die Matching-Freigabe erteilt haben und das Gegenüber die Tiefe zeigen darf (`areas_depth_on_contact` nach Kontakt). Nur Bereichs-ID, nie Stufe oder Wunsch als Wert. |
| `FIND_AREA_CONTRIBUTE` | Capability | ja | ja | eigene Sicht | – | wie oben |
| `FIND_SAME_INDUSTRY` | `person_core.industries` | ja (Modulator Kontext) | ja | eigene Sicht | – | Originalwert, öffentlich in FIND/CONNECT |
| `FIND_START_ALIGNED` | `start_horizon` | ja (Modulator Intent) | ja | eigene Sicht | – | Enum |
| `FIND_STAGE_COMPLEMENT` | `venture_stage` | ja (Modulator) | ja | eigene Sicht | – | Enum. Die Vorlage braucht Phasen-Labels, die als Satzteil lesbar sind (UI-Punkt). |
| `FIND_DIFF_START` / `_COMMITMENT` / `_GOAL` | FIND-Profil | Start, Ziel: ja; Commitment: nein (nur Erklärung) | ja | eigene Sicht | – | Unterschied als Gesprächsanlass, kein Ausschluss |
| `FIND_UNKNOWN_LOCATION` | Gate `uncertain` (Ort/Remote) | nein | nur, wessen Bedingung offen ist | nein | – | Ohne Parameter. Bei der Paarregel „beide vor Ort“ für beide. |
| `FIND_LIMITED_EVIDENCE` | – | nein | – | – | ja | Spec §14: Es gibt kein Schwellenmodell, deshalb wird er nicht angezeigt. |
| Gate-Gründe `GATE_*`, `POOL_*` | Must-haves, Blockierung, Status | Gate | nie | nie | ja | Ein ausgeschlossenes Paar ist nicht sichtbar und wird nicht begründet. |
| Relevanz, Komponenten, Confidence, Evidenz | Engine | – | nie | nie | ja | Keine Zahlen in der Ausgabe |
| Workstyle-Kontext | Gesprächskontext nach beidseitiger Zustimmung | nein | – | – | – | Nie ein Matching-Reason. Der Presenter ignoriert ihn; die Gesprächsimpulse bleiben getrennt. |

**Private Kriterien:**

- **Eigene Kriterien:** Die Person sieht nur „Zu Standort oder Arbeitsweise fehlen noch Angaben“, ohne den gespeicherten Wert. Für ein erfülltes Kriterium gibt es keinen Reason („kein Bonus für eine erfüllte Bedingung“, Spec §7), also auch keinen Text wie „Dein Zeitraum passt“.
- **Kriterien der Gegenseite:** Sie bleiben vollständig intern. Bei `ineligible` erscheint das Paar nicht; bei `uncertain` sieht die Person keinen Hinweis darauf.
- **Andere offene Bedingungen** (Rolle, Stunden, Suchstand, Start, Bereich, Expertise): Dafür hat die Spec keinen Reason, deshalb gibt es keinen Text.

**Ausschlüsse:**

| Fall | Anzeige |
|---|---|
| eigenes privates Must-have | Paar nicht sichtbar, kein Grund |
| privates Must-have der Gegenseite | Paar nicht sichtbar, kein Grund |
| Blockierung | Paar nicht sichtbar, kein Grund |
| Status, Rolle, gleiche Person | Paar nicht sichtbar, kein Grund |
| `uncertain` wegen fehlender Daten | Paar sichtbar; nur der eigene Ortshinweis |

## CONNECT

C1 ist gerichtet. Reasons gibt es nur für die Person, deren Gesuch bewertet wird; die anbietende Seite bekommt keine.

| Reason | Quelle | Ranking-Einfluss | Gesuchsteller | Anbieter | Intern | Besondere Regel |
|---|---|---|---|---|---|---|
| `CONNECT_TOPIC_MATCH` | Themen beider Einträge | ja (topic) | ja | nein | – | Originalwerte der Themen |
| `CONNECT_TOPIC_VIA_EXPERTISE` | Profil-Expertise des Anbieters (Netzwerkprofil) | ja | ja | nein | – | Originalwert |
| `CONNECT_TEXT_OVERLAP` | text_relevance ≥ 0,10 | ja (text, IDF-gewichtet) | ja | nein | – | Bis zu drei Originalwörter aus dem eigenen Gesuch, in Textreihenfolge. Nie Token, nie IDF-Werte, nie die IDF-Version. |
| `CONNECT_SAME_INDUSTRY` | Branchen beider Einträge | ja | ja | nein | – | Originalwert aus dem eigenen Gesuch |
| `CONNECT_SAME_CATEGORY` | Kategorie | ja | ja | nein | – | Enum, Label `connect.categories` |
| `CONNECT_REMOTE_POSSIBLE` | Remote-Modus des Angebots | nein | ja | nein | – | – |
| `CONNECT_UNKNOWN_LOCATION` | Gate `uncertain` | nein | ja | nein | – | ohne Parameter |
| `CONNECT_LIMITED_EVIDENCE` | – | nein | – | – | ja | wie FIND |
| Gate-Gründe, Score, Komponenten, Confidence, IDF | Engine | – | nie | nie | ja | Blockierung, Sichtbarkeit und `suggestable` werden nie begründet. |

Nachrichten, Research, Workstyle und Capability sind keine CONNECT-Eingaben (Spec §4).

## Limited Evidence

Das ist eine Anzeigeregel außerhalb des Matchings (Spec §14). Die Spec legt keinen Auslöser fest („Wann er erscheint, legt die UI-Umsetzung fest. Bis dahin wird er nicht angezeigt.“).

- Die Texte liegen bereit (`*_LIMITED_EVIDENCE`), der Presenter erzeugt sie nicht.
- Ein späterer Auslöser darf nur `confidence.evidence` (vorhandene und fehlende Felder) verwenden, ohne Zahl und ohne Stufe.
- Er muss als UI-Entscheidung festgehalten werden. Er ändert weder Gate noch Relevanz oder Reihenfolge.

## Gleichstände und Reihenfolge

Die Engine liefert je Rang `rank`, `tieGroup` und `secondaryOrder` (Veröffentlichung, dann ID).

- Die Oberfläche darf **nur die Reihenfolge** verwenden.
- `tieGroup` ist intern. Ein Text wie „gleich relevant“ oder „gleich guter Vorschlag“ würde eine Stufe suggerieren und wird nicht gebaut.
- `secondaryOrder` ist nur stabile Sortierung, kein Relevanzsignal, und wird nicht angezeigt.
- Rangnummern werden nicht angezeigt.

## Texte

Die Vorlagen sind wörtlich aus Spec §15 übernommen, DE und EN. `{name}` setzt die Oberfläche, Enum-Werte werden über den Label-Namespace übersetzt. Ein Test sperrt Prozent-, Score-, Kompatibilitäts-, Fit-, Prognose- und Persönlichkeitsbegriffe.

Die Ranking-Transparenz aus Spec §15 („sortiert nach ausdrücklichen Suchkriterien und freigegebenen Matching-Daten“) braucht einen eigenen Text, sobald die Sortierung umgestellt wird. Noch nicht angelegt.
