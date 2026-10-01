# Phase 6.1 — Fachlicher Cleanup vor dem Freeze

**Stand:** 01.10.2026 · **Branch:** `feat/phase-6-1-cleanup` (von `main`
nach Phase 6) · **Grundlage:** laufender Code und lokale Datenbank ·
Vorgänger: `docs/profile-phase-6-final-polish.md`

Nur Texte. Keine Migration, keine Layoutänderung, keine Berechnung angefasst.

---

## 1. Welche problematischen Formulierungen wurden gefunden?

Gesucht wurde zweimal: in den Sprachbundles des Profil-, Advisor- und
Vergleichsbereichs (`capability`, `profile`, `report`, `advisor`,
`alignment`, `direction`, `teams`, DE und EN) und **im gerenderten Text** —
`/me/profile`, Kurz-PDF, Lang-PDF mit und ohne v1, drei Advisor-Personenseiten,
Advisor-Aufstellung, eine gemeinsame Auswertung, der Align-Vergleich; jeweils
mit allen Aufklappern geöffnet, DE und EN. Suchmuster: „messbar", „führt zu",
„Risiko/riskant", „teuer", „kritisch", „inkompatibel", „passt gut/schlecht",
„Konflikt", „erfolgreich", „wahrscheinlich", Prognosewörter und die
englischen Entsprechungen; im v1-Bereich zusätzlich „aktuell", „gerade",
„heutig", „neue Fassung".

| Stelle | Formulierung | Art |
|---|---|---|
| Advisor, Überschrift über dem v2.1-Block | „Antworten aus der neuen Fassung" | veraltet |
| Vergleich zu zweit, „Beide wollen es verantworten" | „… ungeklärte Zuständigkeit wirkt sich **messbar schlecht** aus. Klärt sie, bevor sie sich als Konflikt äußert." | empirisch, ohne Beleg im Produkt |
| Team-Auswertung, „Mehrere beanspruchen" | „Das klärt sich nicht von selbst und **wird später teuer**" | Prognose |
| Team-Auswertung, „Beansprucht ohne Tiefe" | „… und **riskant**, wenn alle es für erledigt halten" | Risikoaussage |
| Vergleich zu zweit, große Überschneidung | „… und **wahrscheinlich** auch gemeinsame blinde Flecken" | Prognose |
| Vergleich zu zweit, kleine Überschneidung | „Das heißt: viel Ergänzung – und wenig gemeinsame Sprache …" | Deutung |
| Fähigkeiten, Verantwortungsschritt | „Diese Unterscheidung früh zu klären **erspart später viele Missverständnisse**." | kausale Behauptung |

Im v1-Altbestand standen **keine** Zeitwörter mehr — das hatte Phase 6 mit
`SelfReportView legacy` bereits erledigt. Nachgeprüft im gerenderten Text auf
`/me/profile`, im Lang-PDF mit v1 und bei Ben und Carla in der Advisor-Sicht.

## 2. Welche wurden geändert?

| vorher | nachher (DE) |
|---|---|
| Antworten aus der neuen Fassung | **Antworten aus einer früheren Fassung des Fragebogens** |
| … wirkt sich messbar schlecht aus. Klärt sie, bevor sie sich als Konflikt äußert. | Hier beansprucht ihr beide dieselbe Zuständigkeit. **Noch ist nicht geklärt, wer die Verantwortung übernimmt – dieser Punkt sollte zwischen euch besprochen werden.** |
| Das klärt sich nicht von selbst und wird später teuer – … | Noch ist nicht geklärt, wer hier entscheidet – darüber lohnt sich ein Gespräch, nicht darüber, wer mehr kann. |
| … und riskant, wenn alle es für erledigt halten. | Das ist in Ordnung – wichtig ist, dass es im Team ausgesprochen ist und nicht als erledigt gilt. |
| … und wahrscheinlich auch gemeinsame blinde Flecken. | … viel Überschneidung in dem, was ihr mitbringt. Ob es Bereiche gibt, die keiner von euch abdeckt, lohnt sich gemeinsam anzusehen. |
| … und wenig gemeinsame Sprache darüber, wie die Arbeit des anderen aussieht. | … ihr ergänzt euch stark. Wie die Arbeit des anderen in seinen Bereichen aussieht, lohnt sich zu besprechen. |
| … erspart später viele Missverständnisse. | Es lohnt sich, diese Unterscheidung früh zu besprechen. |

Englisch jeweils entsprechend. Keine Quelle ergänzt, keine neue Logik.

### Zur Advisor-Überschrift: bewusst nicht „aktuelles Arbeitsprofil"

Der Auftrag schlug „Antworten aus dem aktuellen Arbeitsprofil" vor. Das wäre
**sachlich falsch**: Der Block zeigt Antworten aus `founder-alignment-v2-1`,
und diese Fassung ist in der Datenbank `archived`. Das aktuelle Arbeitsprofil
(`founder-profile-v1`) steht auf derselben Seite in einem eigenen Block, der
seinen Namen aus der Registratur trägt — „Founder-Arbeitsprofil". Zwei Blöcke
mit demselben Anspruch hätten einen Advisor genau das verwechseln lassen, was
diese Phase verhindern soll. Deshalb: „aus einer früheren Fassung des
Fragebogens" — zeitlos, ohne Versionsnummer, und auch dann noch richtig, wenn
die nächste Fassung kommt.

## 3. Welche Aussagen blieben bewusst bestehen — und warum?

**Der v1-Altbestand inhaltlich.** Die Texte des früheren Berichts enthalten
Dimensionsnamen („Risikoorientierung", „Konfliktstil") und Sätze wie „Hier
wird es häufig schwierig, wenn …". Sie bleiben, wie sie gerechnet wurden: Der
Abschnitt heißt „Was die frühere Auswertung beschrieben hat", steht
zugeklappt und datiert, und ihn umzuschreiben hieße, nachträglich zu ändern,
was damals ausgegeben wurde. Auftrag 4 begrenzt Änderungen dort ausdrücklich
auf Zeitwörter — und davon gibt es keine mehr.

**`/me/report`.** Die eigenständige v1-Berichtsseite sagt weiter „dein
aktuelles Founder-Profil" und „So funktioniert dein Profil gerade". Sie ist
nicht als historisch gerahmt: Sie wird direkt nach dem v1-Basisfragebogen
verlinkt, und `founder-compatibility-v1` ist im Code weiterhin
`CURRENT_INSTRUMENT_ID`. Dort ist „aktuell" richtig. Wenn v1 als Fragebogen
abgeschaltet wird, gehört diese Seite in denselben `legacy`-Modus — das ist
ein Schalter, kein Umbau.

**„passt / passt nicht" in FIND.** Gemeint ist, ob eine Antwort einen selbst
genannten Suchwunsch erfüllt — wörtlich, keine Passungsdiagnose. FIND-Matching
gehört nicht zu diesem Auftrag.

**„Das ist die einzige Lage, die eine Entscheidung erzwingt"** (Team: niemand
will, niemand hat Tiefe). Eine normative Aussage über die eigene Datenlage,
keine empirische: Wenn niemand etwas übernimmt, muss jemand entscheiden, wie
damit umzugehen ist.

**Hinweise in Interview- und Erzählfragen** („Was du danach geändert hast, sagt
mehr über deine Fähigkeit als eine Erfolgsgeschichte"). Schreibanleitungen,
keine Aussagen über eine Person.

**„Selbstauskunft, kein Testergebnis", „keine Erfolgsprognose", „sagt nichts
über Erfolg vorher".** Das sind Verneinungen solcher Behauptungen — sie
bleiben.

**`teams.setup.*`** („wird teuer, wenn es offen bleibt", „Persönliches
finanzielles Risiko", Rechtsformhinweise). Das ist der Gründungsvertrags-
Setup im Teambereich, nicht Profil, Advisor oder Vergleich — außerhalb des
Auftrags.

## 4. Gibt es danach noch fachliche Restpunkte im Profilbereich?

1. **Umschriebene Umlaute im v1-Altbestand.** Im gerenderten Text stehen
   „haeufig", „Klaerung", „frueh", „fuer" — in den Abschnitten „Wo es im Team
   kippt" und „Deine Hebel". `normalizeGermanText` greift dort offenbar nicht.
   Sichtbar für jede Person mit v1-Bericht und für Advisor. Ein Darstellungs-
   und kein Inhaltsfehler, nicht Teil dieses Auftrags.
2. **`/me/report` und v1 als laufender Fragebogen** — siehe Abschnitt 3. Eine
   Produktentscheidung: Wird v1 noch neuen Menschen vorgelegt?
3. **Der v2.1-Block auf der Advisor-Seite** steht zwischen dem Hinweiskasten
   und dem v1-Bericht, offen und nicht zugeklappt. Mit der neuen Überschrift
   stimmt er; ob er wie v1 zurückhaltend dargestellt werden soll, ist eine
   Layoutfrage und war ausgeschlossen. Lokal hat niemand v2.1 abgegeben.
4. Aus Phase 6 unverändert und bewusst ausgeklammert: `focus_skill`,
   `intention`, `profiles.display_name`, Rebranding, englische Registratur,
   PDF-Seitenzahlen, v1-Verschachtelung, Connect-Sichtbarkeitsmodell.

Darüber hinaus sind im Profil-, Advisor- und Vergleichsbereich keine
empirischen oder prognostischen Aussagen mehr sichtbar, die das Produkt nicht
selbst belegt.

---

## Tests

```
npm run ci:check     tsc --noEmit · 2 611 Tests · next build      grün
npx supabase test db 126 Dateien · 1 319 DB-Tests                   grün
```

Neu in `features/reporting/__tests__/phase6Polish.test.ts`: zwei Zusagen —
kein „messbar / teuer / riskant / blinde Flecken / erspart" in den
Vergleichs-, Team- und Überschneidungstexten (DE/EN), und die frühere Fassung
heißt nicht „neu", „aktuell" oder „v2".

**Im Browser** (Chrome 154 headless, eigener Dev-Server): gerenderter Text
der oben genannten Seiten DE/EN durchsucht — keine empirische Behauptung
außerhalb des datierten v1-Abschnitts, keine Zeitwörter im v1-Abschnitt,
keine rohen Schlüssel. `/me/profile`, Kurz-PDF, Lang-PDF mit v1 und drei
Advisor-Seiten bei 320 / 375 / 768 / 1024 px: kein Überlauf.

**Nicht im Browser gesehen:** der Vergleich zu zweit (`/profile/compare`) und
die Team-Rollenseite — die Seed-Konten haben dafür keine Verbindung und kein
Team. Ihre Texte kommen ausschließlich aus den geprüften Bundles.

Keine Migration. Nicht deployt.
