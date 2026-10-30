# Research-Einwilligung – Textfassungen und Nachweis

Interne Dokumentation, keine Nutzeroberfläche. Stand: 14.10.2026.

## Zwei Begriffe

| | Bedeutung | Wo |
|---|---|---|
| **Fachliche Version** `research_consent_v1` | Wofür eingewilligt wird: pseudonyme `research_events` mit fester Positivliste (Migration 20260830160000). Ändert sich nur, wenn sich der Umfang der Verarbeitung ändert. | `RESEARCH_CONSENT_VERSION` (`web/src/features/research/consentVersion.ts`), an jedem Ereignis, im Insert-Trigger, beim Widerruf, beim Aufräumen, in der Analyse-Sicht |
| **Textrevision** `research_consent_copy_…` | Welcher Wortlaut angezeigt wurde. Ändert sich mit jeder inhaltlichen Textänderung. DE und EN gehören zur selben Revision; die Sprache wird je Entscheidung gespeichert. | `RESEARCH_CONSENT_COPY_REVISION`, Tabelle `research_consent_copy_revisions` (mit SHA-256 je Sprache und Stelle), `research_consent_audit_log` |

Seit Migration 20270129130000 schreibt jede Entscheidung (zustimmen, ablehnen, widerrufen) eine Zeile in `research_consent_audit_log`: Aktion, fachliche Version, Textrevision, Sprache, Stelle (Dialog oder Kontoeinstellung), SHA-256 des angezeigten Wortlauts, Zeitpunkt. Die Zeilen werden nie geändert; sie verschwinden nur mit dem Konto.

**Eine neue Textfassung braucht eine neue Revision:** neue Konstante, neue Zeilen in `research_consent_copy_revisions` per Migration. Der Test `researchConsentAudit.test.ts` schlägt fehl, wenn der Wortlaut sich ändert, ohne dass die registrierten Hashes nachziehen.

## Historische Fassungen unter `research_consent_v1`

**Wichtig:** Commit-Zeit ist nicht Deployment-Zeit. Vercel baut `main` nach einem erfolgreichen Build; der genaue Zeitpunkt, ab dem eine Fassung ausgeliefert wurde, steht nur in der Vercel-Deployment-Historie, nicht im Repository. Dazu kommen Browser, die eine ältere Seite noch offen hatten. Für Entscheidungen vor dem 14.10.2026 wurde weder Sprache noch Wortlaut gespeichert, und `accepted_at` wird nach Ablehnen und erneutem Zustimmen überschrieben.

**Deshalb wird keiner Person rückwirkend eine Fassung zugeordnet** – auch nicht anhand von `accepted_at`.

| Datum (Commit) | Commit | Wesentliche Änderung |
|---|---|---|
| 2026-08-30 | `e1ab09e2` | Erste Fassung. „ausgewählte strukturierte Antworten und Nutzungsdaten pseudonymisiert für wissenschaftliche Forschung zur Zusammenarbeit in Gründerteams **und zur Weiterentwicklung unserer Messinstrumente**“. **Keine** Veröffentlichung, **keine** Nutzung außerhalb des Produkts, **keine** Freitexte. Widerruf in der Einstellung beschrieben. |
| 2026-09-28 13:24 | `40a21e82` | **Erweiterung des Umfangs:** „deine Antworten und Nutzungsdaten … **einschließlich Freitexten** und **auch außerhalb von CoFoundery, etwa in einer Veröffentlichung**“. Zusätzlicher Absatz „Davon getrennt“ zur Qualitätsprüfung ohne Einwilligung. Widerrufstext neu („Was sich nicht rückgängig machen lässt …“). |
| 2026-09-28 13:54 | `e4bd1cc5` | Absatz zur Qualitätsprüfung entfernt; „jederzeit im Account beenden“ ergänzt. Umfang wie `40a21e82`. |
| 2026-09-29, 2026-10-04 | `496cf7b1`, `fe599af7` | Nur zusätzliche Schlüssel außerhalb des Einwilligungstexts (`unreadable`, `workstylePretest`). Wortlaut der Einwilligung unverändert. |
| 2026-10-09 | `79e9a439` | Rebrand: „CoFoundery“ → „Made2Found“. Umfang unverändert. |
| 2026-10-14 (noch nicht deployt) | Revision `research_consent_copy_2026-10-14` | Präzisierung auf das tatsächlich Erhobene: „ausgewählte Antworten aus deinen Fragebögen und Angaben dazu, wie du sie ausfüllst (etwa Bearbeitungszeiten) … auch außerhalb von Made2Found, etwa in einer Veröffentlichung. **Freitexte, Namen und E-Mail-Adressen gehören nicht dazu.**“ Einengung, keine Erweiterung: `research_events` erlaubt keinen Freitext (properties nur `choiceValue`). |

Die englische Fassung wurde jeweils im selben Commit geändert.

## Schutzregel für Altdaten (Stand 14.10.2026)

1. **Forschungsdaten aus Einwilligungen ohne belegte Textrevision** – also ohne Zeile in `research_consent_audit_log` für die geltende Zustimmung – gelten **nicht** als freigegeben für Veröffentlichungen oder für eine Nutzung außerhalb von Made2Found.
2. Für eine Veröffentlichung kommen nur Daten in Frage, deren Person zum Zeitpunkt der Erhebung eine **belegte** Zustimmung hatte (Audit-Zeile `accepted` mit einer Revision, deren Wortlaut die Veröffentlichung nennt, und keine spätere Ablehnung).
3. **Heute gibt es keinen Codepfad**, der `research_events` exportiert, veröffentlicht oder extern bereitstellt. Lesend greifen nur zu:
   - `web/scripts/item-analysis.ts` – interne Itemanalyse zur Weiterentwicklung der Instrumente, vom Betreiber lokal ausgeführt, Ausgabe nur auf der Konsole, keine Datei, keine Weitergabe;
   - die Aggregationsfunktionen aus Migration 20260405123000 – ohne Aufrufer im Code und ohne Zeitplan (kein pg_cron), schreiben nur in interne Aggregattabellen.
4. Wer einen Export- oder Veröffentlichungsweg baut, muss Regel 1 und 2 technisch umsetzen. Der Test `researchConsentAudit.test.ts` meldet jeden neuen Lesezugriff auf `research_events` oder `research_events_analytics_v1`.
5. Es werden **keine Daten vorsorglich gelöscht** und **keine alten Einwilligungen neu abgefragt**.

## Offen – LEGAL REVIEW REQUIRED

- Personen, die zwischen dem Deployment von `e1ab09e2` (30.08.) und dem von `40a21e82` (28.09.) zugestimmt haben, sahen einen Text **ohne** Veröffentlichung und Nutzung außerhalb des Produkts. Ob ihre Zustimmung den erweiterten Zweck deckt oder ob eine erneute Einwilligung nötig ist, ist juristisch zu entscheiden. Technisch ist durch die Schutzregel verhindert, dass ihre Daten stillschweigend für den erweiterten Zweck verwendet werden.
- Ob ein Einwilligungsnachweis nach einer Kontolöschung aufbewahrt werden muss. Umgesetzt ist: Er wird mit dem Konto gelöscht, ebenso wie die zugehörigen Forschungsdaten.
