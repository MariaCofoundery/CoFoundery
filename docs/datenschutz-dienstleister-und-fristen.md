# Dienstleister und Löschfristen (Arbeitsstand für die Datenschutzerklärung)

Stand: 28.10.2026 (ergänzt um Punkt 7). Fakten aus dem Code und aus deinen Einträgen. Die rechtliche Einordnung bleibt bei der Beratung.

## Dienstleister, die mit Nutzerdaten zu tun haben
| Dienst | Wofür | Daten | Region / Vertrag |
|---|---|---|---|
| Supabase | Datenbank, Anmeldung, Dateien | alle Konto- und Produktdaten | London (`eu-west-2`). Auftragsverarbeitung (DPA) ist Teil der Nutzungsbedingungen. Übermittlung nach Großbritannien: Angemessenheitsbeschluss der EU bis Dezember 2031 (von außen bestätigen lassen) |
| Vercel | Hosting der Anwendung | Anfragen, Protokolle | Funktionen in London (`lhr1`). DPA, EU-US Data Privacy Framework und Standardvertragsklauseln |
| Resend | Mailversand (Einladungen, Hinweise) | Empfängeradresse, Mailtext | Irland (`eu-west-1`). DPA vorhanden |
| IONOS | Postfach hello@… | Korrespondenz | Deutschland. Vertrag aus 2026: Der AV-Vertrag ist bei Verträgen seit 19.07.2022 Teil der AGB, ein gesonderter Abschluss ist nicht nötig (Angabe von IONOS, Stand Oktober 2026) |

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
| Testprojekt, nie gestarteter Entwurf | 90 Tage nach der letzten Änderung | gelöscht (täglicher Löschlauf, seit Migration 20270106120000) |
| Testprojekt, beendet oder abgebrochen (Zustimmungen, Antworten) | 365 Tage nach dem Ende | das ganze Projekt wird gelöscht. Ein laufendes Projekt bleibt, solange es läuft. Beim Löschen eines Kontos fallen Zustimmungen und Antworten dieser Person ohnehin weg |
| Check-in, Antworten, Notizen, eigene Punkte, Abgaben | 365 Tage nach Abschluss oder Überspringen | gelöscht. Offene Check-ins werden nie angefasst |
| Check-in, Rückblick (Antworten, Einladungen, Fragen) | 180 Tage nach Abschluss | gelöscht, kürzer als die Antworten, weil Freitext und persönlicher |
| Check-in selbst (Datum, Status, Abstand) | bleibt, solange das Team besteht | ohne Personenbezug im Inhalt; wird gebraucht, um zu berechnen, wann der nächste fällig ist |
| Check-in-Erinnerung (Stempel „wurde erinnert“) | 365 Tage nach der Fälligkeit | gelöscht. Eine Zeile je Person, Team und Fälligkeit, ohne Inhalt |
| Finanzierungs-Wegweiser (Status je Punkt) | keine feste Frist | bleibt, solange das Team besteht. Enthält nur den Status und wer ihn zuletzt gesetzt hat, keinen Freitext. Beim Löschen eines Kontos wird „zuletzt gesetzt von“ leer, der Status bleibt (gehört dem Team) |
| Finanzierungs-Wegweiser, Notizen zur Gesprächsvorbereitung (Freitext, höchstens 600 Zeichen je Frage) | 365 Tage ohne Änderung | gelöscht (täglicher Löschlauf, `purge_stale_financing_notes`). Sichtbar nur für aktuelle Teammitglieder. Eine leere Notiz löscht sie sofort. Beim Löschen eines Kontos wird „zuletzt geändert von“ leer, die Notiz bleibt (gehört dem Team) |
| Finanzierungs-Wegweiser, Erwartungsabgleich (Antworten a/b/c/„weiß ich noch nicht“ zu sieben Fragen, Abgaben) | 365 Tage nach Abschluss; nie abgeschlossene Runden nach 180 Tagen | gelöscht (täglicher Löschlauf, `purge_stale_financing_alignments`). Geschlossene Auswahl, kein Freitext. Eigene Antworten immer sichtbar, die der anderen erst, wenn alle aktuellen Mitglieder abgegeben haben. Beim Löschen eines Kontos fallen die eigenen Antworten und Abgaben weg |

## Benachrichtigungen: Erinnerung an den Check-in (neu, 27.10.2026)
- **Zwei Wege, zwei Voreinstellungen.** Mitteilung aufs Gerät: an, solange nicht abbestellt (setzt die Erlaubnis im Browser voraus). E-Mail: **aus, bis die Person im Konto ausdrücklich zustimmt**, weil die Erinnerung vom Zeitplan kommt und nicht von einem Menschen. Beides unter Konto → Post, Art „Check-in fällig“.
- **Inhalt:** nur „Euer Check-in ist fällig“, kein Teamname, keine Vereinbarung. Eine Erinnerung je Person, Team und Fälligkeit, danach nichts mehr.
- **Hinweis an die Nutzer:innen:** Ohne Erinnerung kann ein fälliger Check-in unbemerkt bleiben. Das steht im Konto und im Reiter „Check-in“ des Teams.
- **Dienstleister:** wie bisher Resend (Mail) und der Push-Dienst des Browsers. Kein neuer Empfänger.
- **Technik:** läuft im vorhandenen täglichen Lauf mit (Vercel Hobby erlaubt nur zwei Zeitpläne). Ein Wechsel auf Pro würde einen eigenen Lauf erlauben, ist aber nicht nötig.

## Löschfristen für Testprojekt und Check-in (umgesetzt, 28.10.2026)
Grundsatz: Es bleibt nur, was das Produkt noch nutzt. Nach einem Check-in zeigt die Seite nur den letzten abgeschlossenen; ältere Antworten hat kein Feature mehr. Die Löschung steht in der SQL-Funktion `purge_stale_team_work_rows` und läuft im täglichen Löschlauf (`/api/cron/privacy-retention`). Zahlen stehen in `retentionCleanup.ts`; die Antwort des Laufs nennt nur Zählwerte. Die Fristen sind Vorgaben, keine Rechtsfristen.

**Noch zu tun, wenn es live ist:** Die öffentliche Datenschutzerklärung (`web/src/app/datenschutz/page.tsx`) nennt diese Fristen noch nicht. Der Text dort wird bewusst nur nach Prüfung geändert, deshalb nicht automatisch angepasst.

## Für das Gespräch mit einer Anwältin oder einem Anwalt (gesammelt)
1. **Person verlässt das Team, Beiträge bleiben?** Heute: Die Person verlässt das Team, ihre Beiträge im Gespräch zu einem Setup-Thema und ihre bestätigten Vereinbarungen bleiben stehen (die Bestätigungen zählen nur für aktuelle Mitglieder). Offen: Darf das Team die Beiträge behalten, wenn die Person ausscheidet und der Löschung widerspricht? Wie weit geht ihr Anspruch auf Löschung gegen das Interesse des Teams an einem nachvollziehbaren Verlauf? Alternative zur Löschung: Anonymisieren („frühere Person"). Produktidee dazu siehe unten.
2. **Freitext im Check-in-Rückblick und in Testprojekt-Antworten:** Sind 180 bzw. 365 Tage angemessen? Rechtsgrundlage (Vertrag, berechtigtes Interesse)? Die Antworten sind nur für Teammitglieder sichtbar und nach dem Abschluss lesbar.
3. **Erinnerungs-E-Mail zum Check-in:** Die E-Mail kommt nur nach ausdrücklichem Anklicken im Konto (Opt-in), die Mitteilung aufs Gerät ist an, wenn der Browser sie erlaubt hat. Reicht das, oder braucht die Mail zusätzlich einen Hinweis zur Abmeldung im Text (steht bereits als Fußzeile)?
4. **Rechtliche Hinweistexte im Founder Setup:** siehe Abschnitt unten.
5. **„Oft ein Knackpunkt":** allgemeiner redaktioneller Hinweis mit Quellenangabe (Studien-Seite in der Founder Library), kein Personenbezug, nur zur Kenntnis.
6. **Öffentliche Datenschutzerklärung:** Die neuen Fristen und die Erinnerung aufnehmen (siehe oben).
7. **Finanzierungsmodul und Investor-Rolle (nur falls gebaut):** Plattform mit Investoren, die nichts empfiehlt und nicht vermittelt. Fragen zu ECSPR („matching“), Anlageberatung (Anschein), Zahlung durch Investoren, Datenschutz-Rollen und Verschwiegenheit stehen in `docs/research/phase-13/13.7-finanzierung-investor-recherche.md`. Der Wegweiser (Checkliste für Teams, keine Investorendaten, keine neue Rolle) braucht diese Klärung nicht, ein Investorenzugang schon.

## Offen: Rechtliche Hinweistexte im Founder Setup (Prüfung durch die Beratung)
Die Vorschläge zu „Was ist bei diesem Thema rechtlich zu beachten?“ (je Setup-Thema, Entwurf in `docs/research/phase-13/13.4-recherche-rechtliche-hinweise-entwurf.md`) sind **nicht eingebaut** und nicht geprüft. Vor dem Einbau:
- jeden Text auf Richtigkeit und auf Rechtsberatung vs. Hilfsangebot prüfen lassen,
- Standhinweis „Stand der Rechtslage“ und Kennzeichnung „keine Rechtsberatung“ festlegen,
- entscheiden, ob Verweise auf Gesetze (z. B. GmbHG, Vesting, Wettbewerbsverbot) genannt werden oder nur allgemein formuliert wird.
Die bestehende Liste „Mit einer Beratung klären“ im Setup-Dokument bleibt, so wie sie ist, ohne Rechtsaussage.

## Offen: Sicherung der Datenbank (zurückgestellt, 28.10.2026)
Supabase Free legt keine automatischen Sicherungen an. Solange es unter 30 Nutzer:innen und keine echten Forschungsdaten gibt, ist das vertretbar. Geplant ist ein lokales Skript (`npm run backup`), das von Hand gestartet wird, verschlüsselt (`age`) ablegt und die Datei von Hand auf eine externe Festplatte kommt. Es soll **vollständig** sein, nicht nur ein Teil:
- Datenbank mit allen Schemas, die Nutzerdaten enthalten, auch die Konten (`auth`),
- Dateien im Storage (z. B. Profilbilder), die ein Datenbank-Dump nicht enthält,
- ein Rückspiel-Test in die lokale Datenbank, bevor die Sicherung als gültig gilt,
- eine Aufbewahrungsfrist (Vorschlag: 28 Tage) mit Begründung hier; gelöschte Konten leben bis dahin in alten Sicherungen weiter. Das muss zur Aussage über die Löschung in der Datenschutzerklärung passen (Frage an die Beratung).
Auslöser, spätestens dann zu bauen: bevor echte Nutzer:innen in größerer Zahl kommen, bevor Forschungsdaten ausgewertet werden, oder bevor auf einen bezahlten Tarif gewechselt wird, je nachdem, was zuerst eintritt.

## Anfragen von Betroffenen
Frist ein Monat. Antworten nur an die Mailadresse des Kontos, keine Ausweiskopie. Der Export im Konto ist der Selbstbedienungsweg (Art. 15 und 20). Bei Zweifel: eine Rückfrage, die nur die Kontoinhaberin beantworten kann.
