# Dienstleister und Löschfristen (Arbeitsstand für die Datenschutzerklärung)

Stand: 27.10.2026. Fakten aus dem Code und aus deinen Einträgen. Die rechtliche Einordnung bleibt bei der Beratung.

## Dienstleister, die mit Nutzerdaten zu tun haben
| Dienst | Wofür | Daten | Region / Vertrag |
|---|---|---|---|
| Supabase | Datenbank, Anmeldung, Dateien | alle Konto- und Produktdaten | London (`eu-west-2`). Auftragsverarbeitung (DPA) ist Teil der Nutzungsbedingungen. Übermittlung nach Großbritannien: Angemessenheitsbeschluss der EU bis Dezember 2031 (von außen bestätigen lassen) |
| Vercel | Hosting der Anwendung | Anfragen, Protokolle | Funktionen in London (`lhr1`). DPA, EU-US Data Privacy Framework und Standardvertragsklauseln |
| Resend | Mailversand (Einladungen, Hinweise) | Empfängeradresse, Mailtext | Irland (`eu-west-1`). DPA vorhanden |
| IONOS | Postfach hello@… | Korrespondenz | Deutschland. AV-Vertrag prüfen |

## Werkzeuge ohne Nutzerdaten im Betrieb
- **GitHub:** hält den Quellcode, keine Nutzerdaten.
- **VS Code, Claude, Codex:** Entwicklungswerkzeuge. **Keine echten Nutzerdaten eingeben** (Exporte, Screenshots mit echten Namen, Datenbankauszüge).
- **aicappella (Stimme):** erzeugt die Vorlese-Dateien für die Fragen des Gesprächsleitfadens. Das passiert **vorab** mit einem Skript auf Marias Rechner (`npm run tts:build`), mit festen Fragetexten aus dem Quelltext. **Zur Laufzeit gibt es keinen Aufruf, und kein Wort von Nutzer:innen geht dorthin.** Ein Test hält das fest. Deshalb ist aicappella kein Empfänger von Nutzerdaten und gehört nicht in die Liste der Auftragsverarbeiter. In der Erklärung reicht ein Satz, dass die Vorlese-Dateien vorab mit einem externen Stimmdienst erzeugt werden, ohne Nutzerdaten.

## Löschfristen, wie sie heute umgesetzt sind (täglicher Löschlauf)
| Was | Frist | Wie |
|---|---|---|
| Forschungsereignisse | 30 Tage | gelöscht |
| KI-Aufgaben (abgeschlossen) | 90 Tage | gelöscht |
| Hinweise in der Anwendung | 180 Tage | gelöscht |
| Feedback | 60 Tage | Verbindung zur Person wird gelöst (Text bleibt, ohne Namen) |
| Nie angenommene, abgelaufene Einladungen | 60 Tage nach Ablauf | gelöscht, samt Mailadresse |
| Nachrichten | keine feste Frist | Teilnehmende können eigene Nachrichten zurücknehmen (Text wird gelöscht). Beim Löschen eines Kontos wird die Seite anonym |
| Forschungsantworten bei Widerruf | sofort | gelöscht (Trigger in der Datenbank) |
| Testprojekt (Entwurf, Zustimmungen, Antworten) | keine feste Frist, offen | bleibt, solange das Paar besteht. Beim Löschen eines Kontos fallen Zustimmungen und Antworten dieser Person weg, das Projekt bleibt ohne Namen des Erstellers. Eine feste Löschfrist ist noch zu entscheiden. |
| Check-in (Antworten, Abgaben, Rückblick) | keine feste Frist, offen | bleibt, solange das Team besteht. Beim Löschen eines Kontos fallen die Antworten, Abgaben und Rückblick-Antworten dieser Person weg. Eine feste Löschfrist ist noch zu entscheiden. |
| Check-in-Erinnerung (Stempel „wurde erinnert“) | keine feste Frist | Eine Zeile je Person, Team und Fälligkeit, ohne Inhalt. Fällt mit dem Konto oder dem Team weg (Kaskade). Es gibt keinen Zeitplan, der sie vorher löscht; bei Bedarf in den täglichen Löschlauf aufnehmen (z. B. 12 Monate). |

## Benachrichtigungen: Erinnerung an den Check-in (neu, 27.10.2026)
- **Zwei Wege, zwei Voreinstellungen.** Mitteilung aufs Gerät: an, solange nicht abbestellt (setzt die Erlaubnis im Browser voraus). E-Mail: **aus, bis die Person im Konto ausdrücklich zustimmt**, weil die Erinnerung vom Zeitplan kommt und nicht von einem Menschen. Beides unter Konto → Post, Art „Check-in fällig“.
- **Inhalt:** nur „Euer Check-in ist fällig“, kein Teamname, keine Vereinbarung. Eine Erinnerung je Person, Team und Fälligkeit, danach nichts mehr.
- **Hinweis an die Nutzer:innen:** Ohne Erinnerung kann ein fälliger Check-in unbemerkt bleiben. Das steht im Konto und im Reiter „Check-in“ des Teams.
- **Dienstleister:** wie bisher Resend (Mail) und der Push-Dienst des Browsers. Kein neuer Empfänger.
- **Technik:** läuft im vorhandenen täglichen Lauf mit (Vercel Hobby erlaubt nur zwei Zeitpläne). Ein Wechsel auf Pro würde einen eigenen Lauf erlauben, ist aber nicht nötig.

## Offen: Löschfristen für Testprojekt und Check-in
Heute gilt für beide keine feste Frist. Was zu entscheiden ist, mit einem Vorschlag:
1. **Abgeschlossene Check-ins und Testprojekte:** Antworten nach 24 Monaten löschen? Vorschlag: ja, die Vereinbarungen im Founder Setup bleiben davon unberührt, nur die Antworten und Rückblicke fallen weg.
2. **Rückblick-Antworten:** persönlicher als die Check-in-Antworten. Vorschlag: kürzere Frist (z. B. 12 Monate nach Abschluss).
3. **Person verlässt das Team:** bleiben ihre früheren Antworten für die anderen sichtbar? Vorschlag: ja für abgeschlossene Check-ins (sie gehören zum gemeinsamen Verlauf), nicht für laufende. **Noch im Code zu prüfen**, bevor es in die Erklärung kommt.
4. **Technisch:** Die Fristen kämen in den täglichen Löschlauf (`/api/cron/privacy-retention`), mit Test. Erst bauen, wenn die Frist entschieden ist.

## Offen: Rechtliche Hinweistexte im Founder Setup (Prüfung durch die Beratung)
Die Vorschläge zu „Was ist bei diesem Thema rechtlich zu beachten?“ (je Setup-Thema, Entwurf in `docs/research/phase-13/13.4-recherche-rechtliche-hinweise-entwurf.md`) sind **nicht eingebaut** und nicht geprüft. Vor dem Einbau:
- jeden Text auf Richtigkeit und auf Rechtsberatung vs. Hilfsangebot prüfen lassen,
- Standhinweis „Stand der Rechtslage“ und Kennzeichnung „keine Rechtsberatung“ festlegen,
- entscheiden, ob Verweise auf Gesetze (z. B. GmbHG, Vesting, Wettbewerbsverbot) genannt werden oder nur allgemein formuliert wird.
Die bestehende Liste „Mit einer Beratung klären“ im Setup-Dokument bleibt, so wie sie ist, ohne Rechtsaussage.

## Anfragen von Betroffenen
Frist ein Monat. Antworten nur an die Mailadresse des Kontos, keine Ausweiskopie. Der Export im Konto ist der Selbstbedienungsweg (Art. 15 und 20). Bei Zweifel: eine Rückfrage, die nur die Kontoinhaberin beantworten kann.
