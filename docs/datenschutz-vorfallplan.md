# Vorfallplan: Datenschutzverletzung bei Made2Found

Stand: 24.10.2026. Eine Seite, die im Ernstfall zählt. Sie ersetzt keine rechtliche Beratung; die Meldeadresse und das Formular bitte vor dem ersten Gebrauch auf der Seite der Behörde prüfen.

## Was ist ein Vorfall?
Daten von Nutzer:innen sind versehentlich oder unbefugt **verloren, verändert, offengelegt oder zugänglich** geworden. Beispiele: ein Schlüssel ist in falsche Hände geraten, eine Seite zeigt fremde Daten, eine Mail ging an die falsche Person, ein Konto wurde übernommen, ein Export ist abhandengekommen.

**Im Zweifel gilt es als Vorfall.** Die Uhr läuft ab dem Moment, in dem du davon erfährst.

## Wer entscheidet?
Maria. Sie entscheidet über Einordnung, Meldung und Benachrichtigung. Sie dokumentiert alles (siehe unten). Bei Zweifel: externe Beratung hinzuziehen (Datenschutzberatung oder Kanzlei).

## Ablauf in 72 Stunden
| Wann | Was |
|---|---|
| Sofort (Minuten) | **Eindämmen.** Ursache stoppen, bevor du sie verstehst. Siehe „Technische Sofortmaßnahmen". Uhrzeit notieren: wann erfahren, von wem, woher. |
| Innerhalb von Stunden | **Einordnen.** Welche Daten, wessen Daten, wie viele Personen, wie lange offen, wer hatte Zugriff? Ist ein **Risiko** für die Betroffenen wahrscheinlich (zum Beispiel Nachrichten, Antworten zu Arbeitsweise, Stärken, Antrieb, Einschätzungen, Mailadressen)? |
| **Spätestens nach 72 Stunden** | **Meldung an die Aufsichtsbehörde** (Art. 33 DSGVO), wenn ein Risiko nicht ausgeschlossen ist. Ist es unwahrscheinlich, dass ein Risiko entsteht, entfällt die Meldung. Auch dann **dokumentieren**, warum. Kommt die Meldung später, muss die Verzögerung begründet werden. |
| Ohne unnötige Verzögerung | **Betroffene benachrichtigen** (Art. 34), wenn ein **hohes** Risiko besteht. Klar und in einfachen Worten: was passiert ist, welche Daten, was sie tun können, wen sie fragen können. |
| Danach | **Ursache beheben, Test ergänzen, Lehren dokumentieren.** |

## Zuständige Aufsichtsbehörde (Berlin)
Berliner Beauftragte für Datenschutz und Informationsfreiheit (BlnBDI), Alt-Moabit 59–61, 10555 Berlin (Eingang: Alt-Moabit 60). Telefon +49 30 13889-0, Fax +49 30 2155050, E-Mail mailbox@datenschutz-berlin.de. Kontaktseite: https://www.datenschutz-berlin.de/ueber-uns/kontakt/. Das Formular für die Meldung einer Datenpanne liegt auf der Seite der Behörde (Bereich „Datenpanne"); den genauen Link beim ersten Gebrauch dort öffnen und hier nachtragen: ______.

## Technische Sofortmaßnahmen (je nach Fall)
- **Zugang gestohlen oder Verdacht auf Missbrauch:** in Supabase und Vercel die Schlüssel erneuern (Service-Role-Key, CRON_SECRET, JWT-Secret), danach in Vercel neu setzen und neu deployen. Das meldet alle Sitzungen ab.
- **Fremde Daten sichtbar durch einen Fehler:** die betroffene Seite abschalten (Route per Änderung sperren oder die Funktion in der Datenbank entziehen), Fehler beheben, Test schreiben.
- **Falsche Mail:** Empfänger:in um Löschung bitten und schriftlich bestätigen lassen.
- **Konto übernommen:** Sitzungen beenden („Überall abmelden" im Konto oder in Supabase), Mailadresse prüfen.
- **Logs sichern, bevor sie ablaufen:** bei Vercel gibt es auf Hobby nur kurz Logs, bei Supabase begrenzt je nach Plan. Sofort Screenshot oder Export der betroffenen Zeiten.

## Kontakte (bitte ausfüllen)
| Wer | Wofür | Kontakt |
|---|---|---|
| Supabase | Datenbank | Support über das Dashboard |
| Vercel | Hosting | Support über das Dashboard |
| Resend | Mailversand | Support über das Dashboard |
| Datenschutzberatung | Einschätzung | ______ |
| BlnBDI | Meldung | siehe oben |

## Dokumentation (Pflicht, Art. 33 Abs. 5, auch bei „keine Meldung")
Pro Vorfall eine kurze Notiz, abgelegt im Ordner ______:

1. Datum und Uhrzeit: entdeckt, eingedämmt, gemeldet
2. Was ist passiert (Fakten, keine Schuldfrage)?
3. Welche Daten, wie viele Personen?
4. Risiko: gering / möglich / hoch, mit Begründung
5. Gemeldet an die Behörde? Ja/Nein, Datum, Aktenzeichen, oder Begründung für „Nein"
6. Betroffene informiert? Ja/Nein, Datum
7. Maßnahmen und Lehren

## Vorlage: Nachricht an Betroffene (bei hohem Risiko)
> Betreff: Wichtige Information zu deinen Daten bei Made2Found
>
> Hallo ___,
>
> am ___ haben wir festgestellt, dass ___ . Betroffen sind ___ (zum Beispiel: deine Mailadresse und deine Nachrichten). Nicht betroffen sind ___ .
>
> Das haben wir getan: ___ . Das kannst du tun: ___ .
>
> Fragen beantworte ich dir persönlich unter hello@cofoundery.de.
>
> Maria
