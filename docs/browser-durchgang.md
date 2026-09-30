# Der Durchgang im Browser

**Stand 30.09.2026.** Verlangt von der Gutachterin als nächster Schritt.
Die Punkte 10 bis 15 sind mit den beiden UX-Reviews dazugekommen.

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

## 10. Die Schritte — beide Bögen

**Neu am 30.09.2026.** Vorher war jeder Bogen eine lange Liste; jetzt sind es
sieben Schritte im Arbeitsprofil und neun im zweiten Teil. Der Schrittwechsel
passiert im Browser und sonst nirgends — serverseitig ist immer nur der erste
Schritt zu sehen.

- [ ] `/founder-alignment/profil` beginnt mit der Einleitung und
      **verspricht keine Dauer**. „Starten" führt zu Schritt 1 von 7.
- [ ] Wer schon geantwortet hat, landet direkt auf Schritt 1 — die Einleitung
      begrüßt nicht zum dritten Mal.
- [ ] `Zurück` und `Weiter` verlieren keine Antwort. Eine Antwort auf
      Schritt 2 steht noch da, wenn du über 3 und zurück auf 2 gehst.
- [ ] Auf **jedem** Schritt steht oben „Schritt x von n" und daneben, worum es
      geht. Nirgends steht zusätzlich eine Fragenzahl.
- [ ] Der Abgabeknopf steht nur auf dem **letzten** Schritt, mit „Geschafft."
      darüber.
- [ ] Im zweiten Teil heißt er **„Auswertung erstellen"** und nicht
      „Founder-Profil erstellen".

## 11. Die Startseite des zweiten Teils

- [ ] Hat das Vorhaben noch keinen Namen, fragt die Startseite danach —
      **und nur sie**. Im Kopf der Seite steht dann nichts dazu.
- [ ] „Weiter" mit Namen: Der Name steht danach im Kopf der Seite.
- [ ] „Später" ohne Namen: Es geht trotzdem weiter. Der Bogen lässt sich
      vollständig ausfüllen und abgeben.
- [ ] Hat es schon einen Namen, wird nicht gefragt.

## 12. Die sechs Ziele und die sechs Zielkonflikte

- [ ] Schritt 3 zeigt die sechs Ziele als **einen** Kasten mit einer Frage
      oben — nicht als sechs Kästen.
- [ ] Darunter stehen `S01_top`, `S02`, `S03`, `S04`, `S06` als eigene Fragen.
      `S01_top` nimmt **höchstens zwei** Haken.
- [ ] Schritt 8 (`W01`–`W06`): Szenario, darunter „Wie wichtig sind dir dabei
      diese beiden Aspekte?" mit zwei Skalen, darunter die Wegwahl.
- [ ] **Die Wegwahl nennt Wege**, nicht die Aspekte: bei `W01` „vorläufige
      Planung jetzt teilen und Unsicherheiten markieren" und „offene Zahlen
      erst prüfen …". Stünden dort die Aspekte, wäre es der alte Fehler.
- [ ] Beide Aspekte auf „sehr wichtig" ist erlaubt und erzeugt **keine**
      Meldung und keine abgeleitete Entscheidung.
- [ ] Kein Szenario endet mit einer eigenen Frage.

## 13. L01 und die Anschlussfragen

- [ ] Schritt 9 zeigt zunächst nur `L01` — mit dem Hinweis, dass
      Anschlussfragen dazukommen, wenn du etwas einträgst.
- [ ] Nach einem Eintrag erscheinen `L02` und `L03`, in dieser Reihenfolge.
- [ ] Bei `R04` dasselbe mit `R05`.

## 14. Nach dem Absenden

- [ ] Arbeitsprofil: Es geht auf die Antwortseite, dort steht „Dein
      Arbeitsprofil steht." und ein Weg weiter zum zweiten Teil.
- [ ] Zweiter Teil: Es geht auf die Antwortseite **dieses Vorhabens**, dort
      steht sein Name.
- [ ] Beide Kästen erscheinen **nur beim ersten Mal** — beim erneuten Aufruf
      der Antwortseite nicht mehr.

## 15. Textfelder

Zehn Antworten öffnen absichtlich ein Feld: `K04`/`L03` „andere Regel",
`S06` „andere Vorstellung", `R06` „andere Bedingung", `R09` „andere
Vorgehensweise", `G04` „anderer Weg", `G05` „weitere", `B05` „andere
Absicherung", `R12` „an einem bestimmten Datum".

- [ ] Bei diesen zehn erscheint das Feld, und zwar erst nach dem Anklicken.
- [ ] **Sonst nirgends.** Besonders `D01` im Arbeitsprofil: dort sind die
      Antworten Formulierungen („Ich sehe das anders, weil …") und öffneten
      bis zum 29.09.2026 ein Feld.
- [ ] Ein leeres Feld verhindert das Abgeben und sagt, warum.

---

## Was ich schon weiß und was nicht

**Geprüft, serverseitig:** Alle Seiten antworten, alle Schreibwege gehen durch
die Zeilensicherheit, die Registraturen stimmen mit ihren beiden Quellen
überein, 2399 Tests. Angemeldet durchgeklickt wurden alle Seiten
beider Bögen — aber immer nur der erste Schritt: Der Schrittwechsel passiert
im Browser.

**Ungeprüft:** alles oben. Jeder Punkt in dieser Liste ist ein Ort, an dem ich
nicht hinsehen konnte.
