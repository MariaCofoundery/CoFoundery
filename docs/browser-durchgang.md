# Der Durchgang im Browser

**Stand 29.09.2026.** Verlangt von der Gutachterin als nächster Schritt.

Serverseitig ist alles abgelaufen, was sich ohne Browser ablaufen lässt:
ausfüllen, abgeben, Bericht, freigeben, vergleichen, Advisor-Ansicht,
Discovery. **Was hier steht, ist genau das, was dabei nicht geprüft werden
kann** — Tippen, Autospeichern, Zwischenzustände, Zurücknavigation.

Drei der bisher gefundenen Fehler lagen genau dort. Deshalb ist die Liste
nicht nach Seiten sortiert, sondern nach den Momenten, in denen es
erfahrungsgemäß bricht.

## Vorbereitung

```bash
cd web
npm run dev:seed      # legt die Testwelt an: Nora, Ben, Carla, Pia
npm run dev
```

Anmelden über `/dev-login` (Nora) beziehungsweise `/dev-login?as=advisor`
(Pia). Die Testkonten liegen nur lokal.

**Wie Fehler notiert werden:** Seite, was getan, was erwartet, was passiert.
Ein Screenshot ersetzt keine Beschreibung — auf dem Bild fehlt, was du vorher
getippt hast.

---

## 1. Autospeichern — die halbe Eingabe

Der Autospeicher feuert 600 ms nach der letzten Änderung. Das ist der Moment,
in dem eine Eingabe noch nicht fertig ist.

- [ ] Eine Antwort mit Textfeld ankreuzen (z. B. `B05` „andere Absicherung")
      und **nicht tippen**. Erwartet: keine rote Meldung. Früher kam dort eine,
      bevor der Cursor im Feld war.
- [ ] Denselben Fall ankreuzen, tippen, **mitten im Wort warten**. Erwartet:
      „wird gespeichert", dann „gespeichert" — kein Zurückspringen.
- [ ] Bei einer Zahlenfrage (`R01`) die Zahl löschen und das Feld leer lassen.
      Erwartet: Die Antwort wird zurückgenommen, nicht als 0 gespeichert.
- [ ] Ein Zeitfenster (`R03`) nur halb ausfüllen — Tag ja, Uhrzeit nein.
      Erwartet: keine Speicherung und keine Fehlermeldung, solange nichts
      Vollständiges dasteht.

## 2. Neuladen und zurück

- [ ] Drei Fragen beantworten, **F5**. Erwartet: alle drei stehen noch da.
- [ ] Eine Antwort ändern, sofort **Zurück** im Browser, dann wieder vor.
      Erwartet: die geänderte Antwort, nicht die alte.
- [ ] Mitten im Fragebogen den Tab schließen und neu öffnen. Erwartet:
      derselbe Stand.
- [ ] Nach dem Abgeben zurücknavigieren. Erwartet: Der Fragebogen ist
      gesperrt, die Antworten sind zu sehen, nichts lässt sich mehr ändern.

## 3. Auslassungsgründe

Seit dem Sprachreview stehen sie unter einer gestrichelten Linie mit „oder"
davor — sie sind ausdrücklich **keine sechste Stufe**.

- [ ] Eine Stufe wählen, dann einen Auslassungsgrund. Erwartet: Die Stufe wird
      ersetzt, die Skala wird blass. Beides zusammen wäre eine Lüge.
- [ ] Denselben Auslassungsgrund noch einmal anklicken. Erwartet: Er geht
      wieder weg, die Frage ist offen.
- [ ] Bei `L01` prüfen, dass **zwei** Gründe angeboten werden („zunächst nur
      für mich festhalten" und „möchte ich nicht angeben") und dass sie sich
      unterscheiden lassen.
- [ ] Bei `R02` prüfen, dass dort „haben wir noch nicht geklärt" steht — und
      nicht „habe ich noch nicht entschieden".

## 4. Die neuen Ziele: `S01a`–`S01f` und `S01_top`

- [ ] Die gemeinsame Frage („Wie wichtig sind dir …") steht **einmal** über
      den sechs Zielen, nicht sechsmal.
- [ ] Die alte `S01` („Welche Ergebnisse möchtest Du …") kommt **nicht** mehr
      vor.
- [ ] Bei `S01_top` drei Ziele anklicken. Erwartet: „Bitte höchstens zwei
      auswählen" — und die dritte Wahl wird nicht gespeichert.
- [ ] Nur **ein** Ziel wählen. Erwartet: geht, ist kein Mangel.
- [ ] Auf `/founder-alignment/vorhaben/antworten`: Das Bild „Wohin es gehen
      soll" zeigt alle sechs, die gewählten mit „zuerst", ein offenes Ziel mit
      seinem Satz — **nicht** mit einem Punkt ganz links.

## 5. Was der Fragebogen verlangt

- [ ] Abgeben, ohne alles beantwortet zu haben. Erwartet: eine Liste dessen,
      was fehlt — und die fehlenden Fragen sind bernsteinfarben markiert.
- [ ] `L02` erscheint erst, wenn `L01` beantwortet ist.
- [ ] Eine Grenze in `L01` streichen, nachdem `L02` dazu etwas enthält.
      Erwartet: Der Text ist nicht weg, und im Bericht steht ein Hinweis
      darauf, dass er auf eine gestrichene Grenze zeigt.

## 6. Freigeben

- [ ] Auf der Antwortseite jemandem freigeben, einzelne Fragen ausblenden.
- [ ] Als Empfänger prüfen: Die ausgeblendeten Fragen sind **gar nicht da** —
      kein leerer Kasten, kein Schloss.
- [ ] Freigabe zurücknehmen und als Empfänger neu laden. Erwartet: nichts
      mehr zu sehen.
- [ ] Als Pia (`/advisor/person/<id>`): „Du siehst N von M Fragen." Die Zahl
      zählt **sichtbare**, nicht zurückgehaltene.
- [ ] Als Pia: Es gibt **kein** Häkchen „darüber möchte ich sprechen" an
      fremden Antworten.

## 7. Vergleich und Weiterleitung

- [ ] Mit Ben vergleichen (beide haben abgegeben und freigegeben).
- [ ] Die Gesprächskarten nennen **Namen**, nicht „Du sagt".
- [ ] „Wo ihr auseinanderliegt" zeigt nur Fragen, die **beide** beantwortet
      haben.
- [ ] Nirgends eine Zahl: keine Passungszahl, kein Prozentwert, kein Abstand.
- [ ] Ganz unten: die Karten ins Founder-Setup. Erwartet: Sie erscheinen nur,
      wenn ihr im **selben Vorhaben** seid, und führen auf ein Thema, das sich
      öffnen lässt.
- [ ] Vor der Gründung darf „Founder-Exit" **nicht** unter den Karten sein.

## 8. Markieren

- [ ] Auf der eigenen Antwortseite „darüber möchte ich sprechen" setzen.
      Erwartet: Es bleibt nach dem Neuladen gesetzt — auch **nach** der
      Abgabe.
- [ ] Im Vergleich steht die markierte Frage ganz oben in der Agenda.

## 9. Zwei Vorhaben

Nur falls du ein zweites anlegst (über eine zweite Einladung):

- [ ] `/founder-alignment/vorhaben` fragt, welches gemeint ist.
- [ ] Nach der Wahl lässt sich **speichern** — das ging bis zum 29.09.2026
      nicht.
- [ ] Die Antworten des einen erscheinen nicht beim anderen.

---

## Was ich schon weiß und was nicht

**Geprüft, serverseitig:** Alle Seiten antworten, alle Schreibwege gehen durch
die Zeilensicherheit, die Registraturen stimmen mit ihren beiden Quellen
überein, 2346 Tests.

**Ungeprüft:** alles oben. Jeder Punkt in dieser Liste ist ein Ort, an dem ich
nicht hinsehen konnte.
