# Problem Radar – warum es keinen automatischen Wochenscan gibt

Entscheidung vom 23.10.2026 (Maria): Es wird nur gesammelt, was **ausdrücklich** erlaubt ist, auch für eine spätere kommerzielle Nutzung, und es soll nichts kosten.

## Was geprüft wurde

- **Stack Exchange:** Inhalte stehen ausdrücklich unter CC BY-SA (kommerzielle Nutzung mit Quellenangabe erlaubt). Die Schnittstelle liefert aber kaum Material: In „Workplace“, „UX“, „Freelancing“ und „Community Building“ kamen in acht Tagen 0 neue Fragen, in „Project Management“ und „Software Engineering“ eine bis vier. Und es sind Fragen, keine Ärgernisse. Die API-Bedingungen konnte ich nicht lesen.
- **Hacker News:** Die Bedingungen von Y Combinator verbieten „data mining, robots, scraping“ für die Website. Für die offizielle API gibt es keine ausdrückliche Erlaubnis, nur kein Verbot; die Algolia-Suche ist ein Drittanbieter, dessen Bedingungen ich nicht lesen konnte. Außerdem ist Y Combinator aus Marias Sicht ein Wettbewerber.
- **Reddit, X, Facebook-Gruppen, die meisten Foren:** Dort ärgern sich die Leute, aber die Bedingungen verbieten Auslesen oder kommerzielle Nutzung ohne Vereinbarung.
- **Websuche-APIs (z. B. Brave):** kosten Geld; Speicherrechte nur in nicht näher benannten Plänen.

Ein Sammler (eigene Datenbankrolle, Kandidatenfach, Wochenlauf) wurde gebaut und wieder entfernt (Commits `f415045a` und der Revert `31b189de`); er ist nie auf Production gewesen.

## Was es stattdessen gibt

1. **Recherche mit Claude in einer Sitzung**, mit Link und Zusammenfassung in eigenen Worten, ohne Speichern fremder Texte. Im Adminbereich (`/admin`) erinnert ein Feld einmal pro Woche daran, mit einem Vorschlagstext zum Kopieren.
2. **Das Problembrett nach Themen** (`/admin/problem-radar/board`): die Probleme der Mitglieder, nur Titel und Datum, alphabetisch nach Thema, nicht nach Häufigkeit.
3. Der manuelle Pilot (Signale von Hand erfassen) bleibt unverändert.

Wer später eine Quelle automatisch anbinden will, braucht vorher eine schriftliche Erlaubnis oder eine Lizenz des Betreibers, die kommerzielle Nutzung einschließt.
