# Dienstleister und Löschfristen (Arbeitsstand für die Datenschutzerklärung)

Stand: 24.10.2026. Fakten aus dem Code und aus deinen Einträgen. Die rechtliche Einordnung bleibt bei der Beratung.

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

## Anfragen von Betroffenen
Frist ein Monat. Antworten nur an die Mailadresse des Kontos, keine Ausweiskopie. Der Export im Konto ist der Selbstbedienungsweg (Art. 15 und 20). Bei Zweifel: eine Rückfrage, die nur die Kontoinhaberin beantworten kann.
