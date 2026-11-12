# Align, Start, Stärken-Interview und Profil: Analyse und Plan (12.11.2026)

Auftrag von Maria: den ganzen Align-Bereich, den Start, das Stärken-Interview und die internen Verlinkungen ansehen, ehrlich bewerten und einen Plan machen. Danach soll Align mit dem Profil „richtig hochwertig“ werden.

**Grundlage:** zwei Durchsichten des Quelltextes (Start/Navigation, Align/Profil) und eine eigene Durchsicht des Stärken-Interviews. **Nichts davon lief im Browser.** Wo etwas nicht gelesen wurde, steht es unten bei „Nicht geprüft“.

---

## 1. Der Befund in drei Sätzen

1. **Die Bausteine sind gut, die Ordnung drumherum nicht.** Der Arbeitsweise-Fragebogen (29 Situationen), sein Bericht und die Datenschutz-Zusagen sind ehrlich und hochwertig. Aber ein Gründer findet sie nicht auf einem klaren Weg: „Start“, „Dashboard“, „Align“, „Profil“, „Fragebögen“ und „Stärken“ meinen teils dasselbe und teils verschiedenes.
2. **Das Stärken-Interview ist inhaltlich gut durchdacht, aber als Erlebnis schwach.** Die Auswertung ist sauber (Zitat-Pflicht, keine Typen, keine Zahlen). Die Fragen dagegen sind lange Aufforderungen („Erzähl von …“) vor einem leeren Feld, ohne Beispiel, ohne Wärme am Anfang und mit einem Aufwand von 30 bis 40 Minuten Schreiben.
3. **Align besteht aus fünf Instrumenten hinter zwei Routenfamilien,** davon zwei Vorhaben-Fragebögen mit entgegengesetzten Freigabe-Regeln. Das ist das größte strukturelle Problem, weil es gegen den Grundsatz „Zustimmungen sind getrennt“ verstößt.

---

## 2. Karte: was es gibt

### Der Weg eines Gründers heute
| Station | Route | Stand |
|---|---|---|
| Anmelden | `/start` | **Das ist die Anmeldeseite**, nicht das Zuhause |
| Zuhause | `/dashboard` (Nav-Label „Start“) | aktuell, ein Hauptknopf („nächster Schritt“) |
| Wie du arbeitest | `/research/workstyle-pretest?version=8.5a-v4` → `/me/profile/workstyle` | aktuell, 29 Fragen, keine Zahl |
| Wo du dich auskennst | `/profile?step=areas` (+ Capability-Interview `/profile/interview`) | aktuell |
| Stärken | `/profile/strengths-interview` → `/me/profile/strengths` | aktuell |
| Richtung | `/profile/direction` | aktuell |
| Was du aufbauen willst | `/founder-alignment/vorhaben` (v1, 42 Fragen) **und** `/founder-alignment/vorhaben/beta` (19 Fragen) | zwei Fassungen parallel |
| Team | `/teams/[id]/workstyle`, `/setup`, Vertiefungen | aktuell |
| Bibliothek | `/fragebogen` („Fragebögen und Gespräche“) | aktuell, aber fast nur per URL erreichbar |

### Nur noch Weiterleitung oder Archiv
`/founder-alignment/profil`, `/pilot`, `/suche`, `/prepare-conversation`, `/versionen`, `/workbook*`. Sie bleiben wegen gespeicherter Daten und alter Links. Sie sind nicht der Ort für neue Arbeit.

---

## 3. Was gut ist (behalten)

- **Der nächste Schritt wird berechnet, nicht erfunden** (`founderStart.ts`): eine reine Funktion, ein Knopf, kein „x von y“, kein Prozent.
- **Der Arbeitsweise-Bericht** (`IndividualWorkstyle.tsx`) ist der stärkste Teil: beschreibend, mit „So liest du das“ („keine Persönlichkeit, keine Eignung, keine Rangfolge, nicht validiert“), Druck, Schnappschuss.
- **Die Zusagen in den Fragebögen:** „Abgeben teilt nichts“ (Beta), „privat, bis du es selbst teilst“, Optional-und-nur-für-dich bei Geldbeträgen.
- **Speichern bei jeder Antwort** im Arbeitsweise-Fragebogen, mit Wiederaufnahme an der ersten offenen Stelle.
- **Das Stärken-Interview als System:** 28 Themen in vier Bereichen, Belegpflicht (wörtliches Zitat), Belegstufe aus der Zahl der Situationen statt vom Modell, Gegenfragen gehen nie in die Auswertung, nichts gilt, bevor die Person es übernimmt.
- **Gute Einzelfragen:** Vorhaben-Beta Z01 („Stell dir vor, dieses Vorhaben läuft in drei Jahren gut …“), Z03 („Woran würdest du in zwölf Monaten merken, dass es sich gelohnt hat?“), M03 mit erklärten Begriffen, EL-05, ORG-04, AMB-02/-05.
- **Der Satz „Eine Vertiefung ist ein Angebot, nie eine Lücke“** und die „Kann ich noch nicht einschätzen“-Option.

---

## 4. Probleme

### 4.1 Start und Benennung
1. **„Start“ heißt drei Dinge.** `/start` ist die Anmeldung, das Nav-Label „Start“ führt zu `/dashboard`, das Logo heißt „Zum Dashboard“, Rücklinks „Zurück zum Dashboard“.
2. **Sackgasse (aus dem Code gelesen, nicht gelaufen):** Ein angemeldetes Konto ohne Rolle und ohne Connect-Mitgliedschaft wird vom Dashboard zu `/start` geschickt und sieht dort das Anmeldeformular.
3. **„Align“ ist ein Menüpunkt ohne Seite.** Die Seitenleiste führt „Align“ nach `/me/profile`; im Profil-Editor ist „Align“ außerdem der Reitername für Können, Stärken, Richtung. Die Bibliothek nennt sich „Fragebögen und Gespräche“.
4. **„Profil“ hat vier Zuhause:** `/me/profile` (Lesebericht), `/profile` (Editor, „Über mich“ / „Über dich“), `/me/profile/workstyle`, Nav-Eintrag „Profil“. Zwei Seiten mit zusammen über 2.200 Zeilen.
5. **Stärken und Richtung sind auf dem Start unsichtbar:** „Dein Stand“ nennt sie „Noch offen“, führt aber nur auf das allgemeine `/me/profile`. Das Stärken-Interview findet man nur, wenn man dort scrollt.
6. **Ein Begriff, vier Namen:** „Wo du dich auskennst“ (Weg), „Bereiche“ (Stand), „Können“ (Editor), „Capability“ (intern).
7. **Fachwörter ohne Erklärung:** „Founder Setup“ im Hauptknopf, „Aus eurem Zusammenspiel, Bereich …“, „Dazu, wenn du magst“.
8. **Zwei Einstiege für Basisangaben:** `/welcome` und danach noch ein Formular im Dashboard; der Knopf „Zum Profil“ scrollt nur zur Seite selbst.
9. **Zwei „Was als Nächstes“, die sich widersprechen können:** Das Dashboard nutzt `resolveFounderStart`, die Bibliothek ihr eigenes „Beginne hier“ mit anderer Reihenfolge.

### 4.2 Align (Fragebögen)
1. **Zwei Vorhaben-Fragebögen, zwei Freigabe-Regeln.** v1 (42 Fragen): „Nach dem Absenden für die Mitglieder des Teams sichtbar“. Beta (19 Fragen): „Abgeben teilt nichts, mit dem Team teilst du ausdrücklich.“ Die Bibliothek zeigt beide.
2. **Die Navigation zeigt auf die falsche Fassung.** `AlignNav` führt „Was du aufbauen willst“ immer auf v1; auf der Beta-Seite wird der Reiter als aktiv markiert, zeigt aber auf v1.
3. **Prozent und Zähler** in den alten Flüssen („Schritt 3 von 9“, Balken, „x von y Fragen beantwortet“), obwohl die Bibliothek verspricht „Keine Prozent, keine Zähler“.
4. **Veraltetes Wort:** „in deinem Founder-Profil“ steht noch im Abgabe-Text des alten Flusses.
5. **Enden ohne nächsten Schritt:** Vorhaben v1 endet auf „Zur Übersicht“; Alleingründende bekommen keine Erklärung, was nach dem Fragebogen passiert.
6. **Sprach-Technik:** Die Texte des Arbeitsweise-Flusses sind automatisch erzeugte Satzbruchstücke („…basiert auf“ + Zahl + „Situationen“), im Quelltext zusammengesetzt. Das bricht in anderen Sprachen und ist schwer zu pflegen. Der ältere Fragebogen hat keine Textschlüssel, sondern deutsche Literale.
7. **Minuten sind fest eingetragen,** nicht gemessen; beim v1-Vorhaben fehlt die Dauer ganz.

### 4.3 Fragequalität (Arbeitsweise v4 und Vorhaben)
- **Sozial erwünschte Antworten:** Die fünf VOICE-Fragen („Wie wahrscheinlich ist es, dass du im Team sagst, dass du die Lage anders einschätzt?“) und EVI-06 („…dass du genauer prüfst, woher der Unterschied kommt?“) haben eine offensichtlich „gute“ Antwort.
- **Mehrere Ideen in einer Frage:** EL-04 (Markt, Version, intern fertig ausarbeiten, Beispiel in Klammern), EXP-01 (drei Satzteile).
- **A/B-Antworten, die sich nicht ausschließen:** EVI-01/-03/-05. Wer beides tut, hat keine ehrliche Antwort.
- **Vier Skalenformen in einem Durchgang** (Wahrscheinlichkeit, Einfluss, Unbehagen, A/B). Bei den Unbehagen-Fragen passt „Wie unangenehm“ nicht zur Skala „sehr unwohl … sehr wohl“.
- **Vage Anker:** „bei einem größeren Vorhaben“, „ins Machen kommen“ (ORG-01).
- **Vorhaben v1:** Das Ziel wird dreimal gefragt (S01, S01a–f, S01_top), U01–U05 sind lange Satzketten, W01–W06 sind sehr lange Szenarien, B01 verlangt einen freien Betrag mit Totalverlust-Rahmung (Beta löst das besser mit Bändern und privatem Betrag).
- **29 Bildschirme mit je einer Frage** sind viel Klicken.

**Wichtig:** Fragen verändern heißt nach unseren Regeln eine **neue Instrument-Fassung** („eine Kennung bekommt nie eine neue Bedeutung“). Teams vergleichen nur identische Fassungen. Und laut deiner Notiz legst du Instrument-Änderungen deiner Fachgutachterin vor. Das ist keine Nebensache.

### 4.4 Stärken-Interview
Ich habe den Leitfaden, die Texte, die Seite und die Auswertung gelesen.

**Was du beschreibst, stimmt.** Die Fragen sind **Aufforderungen**, keine Fragen, und viele sind lang und abstrakt:
- „Erzähl von etwas Schwierigem, das du am Ende geschafft hast.“ (`hard_won`)
- „Erzähl von einer Situation, in der du Verantwortung übernommen hast, obwohl zunächst nicht klar war, wer zuständig ist.“ (`took_charge`, in der Reihenfolge die erste Frage)
- „Erzähl von einer Situation, in der du etwas vertreten oder angesprochen hast, obwohl du mit Widerstand oder Konflikt rechnen musstest.“ (`resistance`, 30 Wörter)

Hinweis zur Reihenfolge: Im Code steht „Verantwortung übernommen“ an erster, „Schwieriges“ an zweiter Stelle. Wenn bei dir „Schwieriges“ zuerst kam, lief vermutlich eine ältere Sitzung. Das habe ich nicht nachgestellt.

**Konkrete Schwächen:**
1. **Kein Einstieg.** Die erste Frage ist abstrakt und verlangt sofort eine ganze Geschichte. Es gibt keine leichte Aufwärmfrage.
2. **Fast nur Last-Geschichten.** „Schwieriges“, „Widerstand“, „Konflikt“, „Was hat es dich gekostet?“. Es fehlen Fragen nach Freude, Flow und Stolz. Das verzerrt das Bild und ist für eine Stärken-Entdeckung der falsche Ton.
3. **Leeres Feld ohne Hilfe.** Kein Beispiel einer guten Antwort, keine Längenangabe („2 bis 5 Sätze reichen“ fehlt, im Capability-Interview steht es), die Datenbank verlangt nur 10 Zeichen.
4. **„Interview“ ohne Gegenüber.** Es gibt kein Nachfragen im Gespräch. Die Nachfragen sind drei feste Zeilen unter „Falls du magst“, für alle gleich.
5. **Aufwand:** 10 Situationen + 3 Gegenfragen + 1 Außenblick, laut Seite 30 bis 40 Minuten, alles per Tastatur. Abschließen geht ab sechs Antworten, aber das erfährt man erst spät.
6. **Zwei Interviews, leicht zu verwechseln:** Capability-Interview (`/profile/interview`) und Stärken-Interview (`/profile/strengths-interview`) klingen gleich, fragen anderes.
7. **Gegenfragen am Schluss** („Was schiebst du vor dir her?“) sind wertvoll, kommen aber erst nach einer langen Strecke.
8. **Auffindbarkeit:** nur über `/me/profile` (scrollen) oder den Editor; nicht vom Start.
9. **Rücklink** führt in den Editor statt zum Bericht.

**Was ich dagegen schlage (Skizze, nicht festgeschrieben):**
- **Name:** „Stärken entdecken“ statt „Stärken-Interview“, mit einem Satz, was passiert („Du erzählst kurze Szenen, wir zeigen dir, was sich darin zeigt“).
- **Aufbau in drei kurzen Runden** (je etwa 8 bis 10 Minuten, Pause dazwischen möglich) statt einer Strecke:
  1. *Aufwärmen, positiv:* 1 bis 2 leichte Fragen („Worauf bist du in den letzten zwölf Monaten ein bisschen stolz?“).
  2. *Szenen:* statt zehn fester Aufforderungen **Karten zum Auswählen**. Du wählst 5 bis 6 von etwa 12 kurzen Szenen, die zu dir passen (z. B. „Ich habe etwas gerettet, das fast gescheitert wäre“, „Ich habe jemanden überzeugt, der erst Nein sagte“). Zu jeder Karte eine echte Frage mit Zeitanker.
  3. *Energie und Blick von außen:* Flow, „Wofür bedanken sich Leute bei dir?“, dann die Gegenfragen.
- **Jede Szene in drei kleinen Schritten** statt einem leeren Feld: *Was war los? Was hast du genau getan? Was kam dabei heraus?* Mit einem kurzen Beispiel, „2 bis 5 Sätze reichen“ und der Möglichkeit zu sprechen (Diktat gibt es schon im Produkt).
- **Zwischenstand nach Runde 2:** „So weit zeichnet sich ab …“ als Vorschau, damit man weiß, wofür man schreibt.
- **Nachfragen nur, wo sie nötig sind** (z. B. wenn die Antwort sehr kurz ist), statt immer drei.

**Beispiele, wie die Fragen klingen könnten** (alle mit Zeitanker, eine Idee, echtes Fragezeichen):

| Heute | Neu (Entwurf) |
|---|---|
| (neu, Einstieg) | Worauf bist du in den letzten zwölf Monaten ein bisschen stolz? Was war los, und was hast du dazu beigetragen? |
| Erzähl von etwas Schwierigem, das du am Ende geschafft hast. | Wann hast du zuletzt etwas hinbekommen, bei dem du nicht sicher warst, ob es klappt? Was war los, und was hast du getan, damit es doch klappte? |
| Erzähl von einer Situation, in der du Verantwortung übernommen hast, obwohl … nicht klar war, wer zuständig ist. | Gab es zuletzt eine Lage, in der niemand zuständig war und du es in die Hand genommen hast? Was hast du als Erstes getan? |
| Erzähl von einer Entscheidung, die du treffen musstest, ohne alle Informationen zu haben, und mit Zeitdruck. | Wann musstest du zuletzt schnell entscheiden, obwohl du nicht alles wusstest? Woran hast du dich orientiert? |
| Erzähl von einem Problem, das du gelöst hast. | Welches Problem hast du zuletzt gelöst, an dem andere hängengeblieben waren? Wie bist du vorgegangen? |
| Erzähl von etwas, das du neu entworfen oder aufgebaut hast … | Was hast du schon einmal von null aufgebaut: ein Produkt, ein Treffen, einen Ablauf? Wie kam es dazu, und was war dein Teil? |
| Erzähl von einer Situation, in der du jemanden gewonnen hast, der zuerst nicht wollte. | Wen hast du schon einmal von etwas überzeugt, der erst skeptisch war? Was hast du gesagt oder getan? |
| Erzähl von einer Situation, in der du etwas vertreten oder angesprochen hast, obwohl du mit Widerstand … rechnen musstest. | Wann hast du zuletzt etwas Unbequemes angesprochen? Worum ging es, und wie hast du es gesagt? |
| Erzähl von einem Moment, in dem du jemandem geholfen hast, besser zu werden … | Wem hast du schon einmal geholfen, besser zu werden? Was hast du konkret getan? |
| Erzähl von einer Situation, in der du Menschen miteinander verbunden hast … | Wen hast du schon einmal mit jemandem zusammengebracht, der ihm weiterhelfen konnte? Wie kam es dazu? |
| Erzähl von einer Situation, in der du dich schnell in etwas Neues einarbeiten musstest. | Was musstest du dir zuletzt schnell neu aneignen? Wie hast du das angestellt? |
| Wobei kommen andere wiederholt zu dir …? Erzähl vom letzten konkreten Fall. | Wofür fragen dich andere immer wieder um Hilfe? Wann war das zuletzt, und was hast du dann getan? |
| (neu, Energie) | Bei welcher Arbeit vergisst du die Zeit? Beschreib das letzte Mal. |

Das sind Entwürfe zum Diskutieren, keine fertigen Texte. Fachlich (Belegbarkeit für die Auswertung, Gegenfragen) gehören sie vor dem Festschreiben zu deiner Gutachterin.

### 4.5 Verlinkung (Auszug, vollständige Tabelle in den Berichten)
- `/fragebogen` ist **nur über einen Chip auf `/me/profile`** erreichbar („Alle Fragebögen“).
- „Zum Profil“ im Hauptknopf (`complete_profile`) ist ein Anker auf derselben Seite.
- „Dein Stand → Stärken/Richtung“ führt nicht dorthin, sondern auf `/me/profile`.
- Archiv-Karten (`VersionArchiveCard`, `VersionChoiceView`, `NavV21`) führen auf Weiterleitungen, die zum Fragebogen zurückwerfen; Linktexte versprechen eine Aktion, die es so nicht mehr gibt.
- Commitment Lab und „Zusammenarbeit üben“ zeigen auf denselben Anker. Ohne Vorhaben beide auf `/invite/new`.
- `/founder-alignment/prepare-conversation` ohne `?invitationId` landet still auf `/connections`.
- `me/profile` benutzt für „Zurück zum Dashboard“ ein einfaches `<a>` statt `Link`.
- Keine echten Weiterleitungsschleifen gefunden. Keine Verlinkung von Start auf `/me/base`, `/me/values`, `/me/report` oder den Workbook.

---

## 5. Plan in vier Etappen

Reihenfolge nach Nutzen und Risiko. Jede Etappe wird wie gewohnt erst als Entwurf gezeigt, dann nach deinem OK gebaut und im Browser durchgeklickt.

### Etappe A: Ordnung und Wege (klein, sofort spürbar)
1. **Ein Wort für das Zuhause:** „Start“ (Nav, Logo, Rücklinks). `/start` bleibt nur die Anmeldung.
2. **Sackgasse beheben:** angemeldete Konten ohne Rolle gehen auf `/welcome` oder eine klare Wahlseite.
3. **Nav „Align“ umbenennen** (z. B. „Ich & Team“ oder „Profil“ und „Team“ als zwei Bereiche); den Reiter „Align“ im Editor ebenso.
4. **„Dein Stand“ verlinkt jeden offenen Teil direkt** (Arbeitsweise, Bereiche, Stärken, Richtung).
5. **Hauptknopf „Zum Profil“ ehrlich benennen** („Basisangaben ausfüllen“) oder zum Formular scrollen und fokussieren.
6. **`/fragebogen` bekommt einen Platz im Menü** und nutzt dieselbe „nächster Schritt“-Quelle wie der Start.
7. **Ein Vokabular für Capability** festlegen (ein Wort in Weg, Stand und Editor).
8. **Archiv-Links aufräumen**, `<a>` → `Link`, Doppelziele zusammenlegen.
9. **Doku-Stand:** `phase-9.4a` mit Hinweis „abgelöst“ versehen.

### Etappe B: Stärken entdecken neu (dein Hauptwunsch)
1. **Konzept als klickbarer Entwurf** (Name, drei Runden, Szenenkarten, drei Mini-Schritte, Zwischenstand).
2. **Fragetexte** komplett neu, mit Zeitanker, eine Idee, echtes Fragezeichen, Beispielantwort. Vorlage an die Gutachterin.
3. **Umsetzung:** neue Fragenkennungen neben den alten (alte Gespräche bleiben les- und auswertbar), Runden, Karten, Diktat-Knopf, Zwischenstand, Auffindbarkeit vom Start, Rücklink zum Bericht.
4. **Auswertung anpassen:** die Anweisung ans Modell kennt neue Frageformen; die Belegregeln bleiben unverändert.
5. Der Name „Interview“ geht, das Capability-Interview heißt dann klar anders („Wo du dich auskennst“).

### Etappe C: Align-Fragebögen hochwertig
1. **Eine Vorhaben-Fassung:** Beta wird die einzige, v1 bleibt lesbar (Daten und Links), verschwindet aber aus Bibliothek und Navigation. Entscheidung von dir nötig.
2. **Navigation folgt der echten Fassung** (Reiter und Aktivzustand).
3. **Ehrliche Zeit statt fester Minuten** (aus gemessenen Zeiten), Prozent und Zähler aus den alten Flüssen entfernen, Abgabe-Texte vereinheitlichen.
4. **Enden mit nächstem Schritt** (Team/Setup, bei Alleingründenden eine Erklärung).
5. **Satzschlüssel statt Satzbruchstücke** im Arbeitsweise-Fluss; deutsche Texte des alten Flusses in die Message-Dateien.
6. **Arbeitsweise v5 (Fragen neu):** VOICE-, EVI-06-, EL-04- und EXP-Fragen überarbeiten, A/B-Antworten klären, eine einheitliche Skalenform. **Das ist eine neue Instrument-Fassung** mit Gutachterinnen-Review und der Folge, dass Teams neu antworten müssen. Eigener Beschluss, nicht stückweise.
7. **Mehrere Fragen pro Bildschirm** (z. B. 3 je Bereich) statt 29 Einzelbildschirme, ohne die Fragen selbst zu verändern.

### Etappe D: Profil als Ganzes
1. **Ein Profil, ein Zuhause:** Lesebericht und Editor klar getrennt benennen („Dein Profil“ zeigen, „Profil bearbeiten“), die zwei großen Seiten (über 2.200 Zeilen) in überschaubare Teile zerlegen.
2. **Eine Seite „Dein Bild“:** Arbeitsweise, Bereiche, Stärken, Richtung, Werte nebeneinander, jeweils mit „Weiter“ oder „Neu machen“. Nichts verrechnet, kein Typ.
3. **Teilen bleibt getrennt** (Zustimmungen unverändert).

**Meine Empfehlung zur Reihenfolge:** A → B → C(1 bis 5) → D → C(6 bis 7). A ist klein und räumt den Weg frei. B ist dein dringendster Wunsch. Die Fragen der Arbeitsweise (C6) sind der heikelste Eingriff und gehören ans Ende, wenn der Rest ruhig läuft.

---

## 6. Modell und Geschwindigkeit

Ich kann das Modell nicht selbst wechseln; du stellst es in der Sitzung ein.

| Arbeit | Empfohlen | Warum |
|---|---|---|
| **Konzept, Fragetexte, Instrument-Entwurf (Etappe B1/B2, C6)** | **das stärkste Modell (Fable 5.1), hohe Denktiefe, normale Geschwindigkeit** | Hier entscheidet Urteilskraft und Sprache: Fragen ohne „richtige“ Antwort, psychometrische Fallstricke, deutscher Ton. Qualität zählt mehr als Tempo. Kein schneller Modus. |
| **Umbau von Seiten, Navigation, Tests, Migrationen (A, B3/B4, C1 bis C5, D)** | **Sonnet 5.5, normale Geschwindigkeit** (wie jetzt) | Gut genug für sauberen Code und Durchklicken, deutlich günstiger. Die Arbeit ist klar umrissen. |
| **Wiederkehrendes Mechanisches** (Umbenennen, Link-Sweeps) | schneller Modus nur dort | Spart Wartezeit, ohne die Denkarbeit zu berühren. |
| **Prüfungen und Suchläufe** | Sonnet-Hilfsläufe im Hintergrund | Wie diese Analyse: parallel lesen, ich bewerte. |

Kurz: **Konzept und Fragen mit dem stärksten Modell, Bauen mit Sonnet.** Die Fragetexte würde ich zusätzlich deiner Gutachterin vorlegen, bevor sie fest werden.

---

## 7. Entscheidungen, die ich von dir brauche

1. **Wort für das Zuhause:** „Start“ oder „Dashboard“? (Ich empfehle „Start“.)
2. **Nav „Align“:** neuer Name oder zwei Bereiche („Profil“ und „Team“)?
3. **Vorhaben v1 aus der Bibliothek nehmen, Beta wird die einzige Fassung?** (Daten bleiben lesbar.)
4. **Stärken entdecken:** Szenenkarten zum Auswählen und drei Runden, so wie skizziert, oder lieber bei einer festen Reihenfolge bleiben und nur die Fragen neu schreiben?
5. **Arbeitsweise v5** (Fragen neu, Teams antworten neu): jetzt, später oder gar nicht?
6. **Fachgutachterin:** Wer bekommt die neuen Fragetexte, und bis wann?

---

## 8. Nicht geprüft

- Nichts lief im Browser, auch nicht auf dem Handy.
- Nicht gelesen: englische Texte, `founderStartData.ts`, `/welcome`, das Innere von `ProductShell` und `FounderChrome`, `/discovery/*`, `/connect/*`, die Team-Seiten, die Berichte `pilot/report`, `pilot/compare`, `bestaetigen`, `zielkonflikte`, die Datei `docs/CoFoundery_Align_v2_1_Items.json` (v2.1 ist archiviert) und die Bodies von Können/Stärken/Richtung im Profil-Editor.
- **Zu klären:** Die Anzahl der Founder-Setup-Themen. `CLAUDE.md` und `messages/de/questionnaires.json` nennen 20 beziehungsweise 23; ich habe sie nicht abgeglichen.
- Die Sackgasse bei `/start` für Konten ohne Rolle ist aus dem Quelltext gelesen, nicht nachgestellt.

---

## 9. Entscheidungen von Maria (12.11.2026) und was sich am Plan ändert

- **„Start“** ist das Wort für das Zuhause (Nav, Logo, Rücklinks). `/start` bleibt die Anmeldung.
- **Vorhaben v1 (42 Fragen) fliegt aus Bibliothek und Navigation**, die Beta wird die einzige Fassung. Die Daten bleiben lesbar.
- **Stärken entdecken** mit Szenenkarten und drei Runden: Entwurf folgt. Fragetexte schreibt Maria selbst als Gutachterin ab. Gearbeitet wird mit Opus 5.5 (hohe Denktiefe).
- **Arbeitsweise v5 entfällt.** Die 29 Fragen der Fassung 4 sind abgestimmt (03.11.2026) und bleiben. Die Beobachtungen aus 4.3 sind nur Notizen. Offen bleiben nur Dinge, die die Fragen nicht verändern (ehrliche Zeitangabe, eventuell mehrere Fragen pro Bildschirm, bessere Enden). Etappe C6 ist gestrichen.
- **„Align“ bleibt als Name.** Das Problem war nie der Name, sondern dass es keine eigene Seite gibt und das Wort im Editor ein zweites Mal als Reitername auftaucht. Etappe A3 wird deshalb zu: **Align bekommt eine eigene Einstiegsseite** (Ich, Wir, Unser Vorhaben), im Menü stehen darunter diese drei statt „Profil, Team, Programm“. Entwurf folgt.

---

## 10. Nachtrag (12.11.2026, später): Räume, Find, Wahrscheinlichkeitsfragen, Gesamtbericht

**Drei Räume bestätigt:** Ich, Wir, Unser Vorhaben (siehe Abschnitt 9). Die Leiste: Start · Align · Find · Connect · Events.

**Wahrscheinlichkeitsfragen: Version 5 doch, aber eng.** Maria will sozial erwünschtes Antworten so weit wie möglich verhindern. Betroffen sind die 13 Fragen im Format „Wie wahrscheinlich ist es, dass du …?“ (darunter alle fünf VOICE-Fragen). Die 7 vergleichenden Fragen (A/B mit „deutlich eher A … deutlich eher B“), die 5 Einfluss-Fragen und die 4 Unbehagen-Fragen bleiben zunächst. Ansätze für den Entwurf: (1) Gegenüberstellung zweier gleichwertiger Verhaltensweisen statt einer „guten“; (2) Rückblick statt Absicht („Wann hast du zuletzt …?“ mit Häufigkeit); (3) Begründungen anbieten, warum man etwas bewusst nicht tut; (4) Situationen mit mehreren sinnvollen Reaktionen. Offen: ob bei v5 nur die geänderten Fragen erneut beantwortet werden müssen (unveränderte Antworten übernehmen), sofern die Architektur das zulässt. Das ist vor dem Bau zu prüfen. Teams vergleichen nur identische Fassungen.

**Find und Align (was ich gelesen habe):**
- Der Matching-Prototyp (`matching-engine-v0.1-spec.md`) zieht **nicht** aus Align. Eingaben: Branchen, Expertise, Ort, Remote, Suchabsicht, Startzeitraum, Phase, Zielgruppe und **Capability nur mit ausdrücklicher Matching-Freigabe**.
- **Workstyle hat keinen Einfluss** auf Gate, Relevanz, Reihenfolge oder Confidence. Er erscheint nur als Gesprächskontext **nach** dem Matching, **nur bei beidseitiger Zustimmung** (`workstyle_discovery_enabled`).
- **Nie im Matcher:** Research-Items, Venture-Alignment, Founder Setup, Stärken, Direction, Interview-Antworten, `person_resources`, Advisor- und Team-only-Daten. Ein Test hält das fest.
- Im Code steht, der Matcher sei ein nicht-produktiver Prototyp, der nur als Schatten läuft. **Wie die Find-Reihenfolge heute tatsächlich entsteht, habe ich nicht geprüft.** Das ist der nächste Schritt dieser Frage.
- **Vorschlag für die Brücke Align → Find ohne neue Datenflüsse:** „Lücke → Suche“. Die Teamkarte im Raum „Unser Vorhaben“ zeigt beschreibend, was im Team da ist und was fehlt. Daraus kann man mit einem Klick eine Find-Suche vorbefüllen. Das ist eine Handlung der Person, kein Datenfluss. Wer Stärken oder Arbeitsweise **für das Matching** nutzen will, braucht einen eigenen, neuen Zustimmungsvertrag (nicht aus der Teamzugehörigkeit abgeleitet).

**Gesamtbericht „Ich, Du, Unser Startup“:** Am Ende soll ein hochwertiger Bericht stehen: ein Gesamtbild aus drei Kapiteln. *Ich* (Arbeitsweise, Können, Stärken, Richtung, Werte), *Du/Wir* (nur, was die andere Person ausdrücklich geteilt hat; Gemeinsamkeiten und Unterschiede als Gesprächsstoff, nie als Passung), *Unser Startup* (Vorhaben, Teamkarte, Setup-Übergabe). Beschreibend, ohne Zahl und Typ, lesbar am Bildschirm und als PDF, jedes Kapitel mit „wer sieht das“. Er baut auf den vorhandenen Berichten auf (`IndividualWorkstyle`, `TeamWorkstyleReport`, Stärken, Setup-Handoff) und ist **Teil des Entwurfs**, nicht ein späteres Anhängsel.

---

## 11. Bauplan nach dem Entwurf (12.11.2026, abends)

Entwurf (Canvas): https://claude.ai/artifact/4YbTMz4LBgpfod8s7DanHG. Maria hat Align-Übersicht, Stärken entdecken (Intro, Szenen, eine Szene, Zwischenstand) und Gesamtbild im neuen Look freigegeben.

**Grundsätze für den Bau**
- Kein neuer Datenfluss zu Find. „Lücke → Suche“ füllt nur das Suchformular vor.
- Jede Freigabe bleibt ihr eigener Vertrag. Das Gesamtbild liest nur über die vorhandenen Lesewege (Arbeitsweise-Teamfreigabe, `team_shares`, `get_team_strengths_overview`).
- Bewegung nur mit CSS, keine neue Bibliothek. Bei „weniger Bewegung“ im Gerät läuft nichts.
- Die Bausteine des dunklen Kopfbereichs (Sterne, Schimmer, Ringe) entstehen einmal als gemeinsame Komponenten und werden auf allen drei Seiten genutzt.

### Reihenfolge

**B1. Align-Übersicht (`/align`)**, klein, zuerst, weil sie den Look als Bausteine anlegt.
- Neue Seite `app/(product)/align/page.tsx`. Die Stände kommen aus vorhandenen Ladern: Profilteile wie in `DashboardAside`, Team über `getFounderTeamHomebase`, Setup-Stand.
- Menü: Align führt nach `/align`. Zweite Reihe: Übersicht · Ich · Wir · Unser Vorhaben. Programm hängt unter Wir.
- Teamkarte: nur Felder mit `ownership_wish = own` aus geteilten Fähigkeiten. Freie Felder verlinken auf Find mit vorbefülltem Feld. Find kann das heute noch nicht (die Seite kennt nur `page`, `searchResult`, `mode`), das kommt als kleiner Zusatz an die Suchmaske.
- Tests: Die Menütests (`ProductShell`) bekommen die neue Reihe. Die Verbote bleiben: keine Zahl als Bewertung, kein Score.

**B2. Stärken entdecken**, der größte Teil.
- **Leitfaden v3** in `strengthsInterviewGuide.ts`: zwölf Szenen, Runde 3 mit Energie, Blick von außen und den Gegenfragen. Die IDs der bestehenden Fragen bleiben, wo die Szene dieselbe Lage meint (`took_charge`, `hard_won`, `won_over` …). Neu ist nur „Ordnung ins Durcheinander“ und die Energie-Frage. Die Sitzung merkt sich die Leitfaden-Fassung. Alte Gespräche zeigen weiter ihre alten Texte.
- **Migration** (eine, append-only):
  - `capability_interview_turns.answer_parts jsonb`: die drei Schritte. Das Feld `answer` bleibt und wird aus den drei Teilen zusammengesetzt, damit die Auswertung und ihre Zitat-Prüfung unverändert funktionieren.
  - `happened_when` mit drei erlaubten Werten. Geht nicht in die Auswertung.
  - `guide_version` an der Sitzung.
  - Stichworte aus dem Intro an der Sitzung. Nur für die Person, gehen nicht in die Auswertung.
- **Intro:** Client-Komponente mit fünf Teilen, Anhalten, Überspringen. Die Stimme ist eine fertige Tonspur über `tts:build` (Schlüssel bleibt auf Marias Rechner). Sie kommt erst, wenn die Texte endgültig sind.
- **Szenen wählen:** 5 bis 6 Karten. Beim Weitergehen entstehen die Gesprächsschritte in der gewählten Reihenfolge.
- **Eine Szene:** drei Schritte, Zeitanker, Beispiel, Diktat (`features/dictation/useDictation.ts` gibt es schon). Eine Nachfrage nur bei sehr kurzer Antwort, als Regel im Code, ohne KI.
- **Name:** überall „Stärken entdecken“. Die Adresse `/profile/strengths-interview` bleibt wegen gespeicherter Links.
- **Tests:** Der Test, der jeden Fragetext prüft, bekommt die neue Regel (echtes Fragezeichen, Zeitanker, eine Idee). Der bekannte rote pgTAP-Test `strength_interview_transition` wird dabei angesehen.

**B3. Gesamtbild (`/teams/[teamId]/gesamtbild`)**
- Liegt im Team, weil „Du“ und „Unser Startup“ ein Team brauchen. Align und die Teamseite verlinken dorthin.
- Wird bei jedem Aufruf frisch gelesen, nichts wird gespeichert. Zieht jemand eine Freigabe zurück, verschwindet der Teil sofort.
- **Ich:** eigene Arbeitsweise v4, eigenes Können, eigene Stärken und Richtung.
- **Du:** nur über die Freigaben. **Korrektur zum Entwurf:** Stärken und Richtung sind heute *eine* Freigabe (`strengths_direction`). „Stärken geteilt, Richtung nicht“ kann es also nicht geben. Der Text im Bericht richtet sich danach.
- **Unser Startup:** Vorhaben-Vergleich (Beta), Teamkarte, vereinbarte Setup-Themen.
- **„Worüber ihr sprechen könnt“:** fest aus Regeln abgeleitet, ohne KI. Arbeitsweise-Unterschiede über die vorhandene Zuordnung in `setupHandoff.ts`, freie Felder der Teamkarte, verschiedene Vorhaben-Antworten.
- **PDF:** über Druckansicht wie bei `teams/[teamId]/setup/document`.
- **Tests:** keine Zahl als Bewertung, jedes Kapitel nennt, wer es sieht, nicht geteilte Teile fehlen ganz, kein Aufruf von Find-Daten.

### Zu entscheiden vor dem Bau
1. Wohin führen „Wir“ und „Unser Vorhaben“ im Menü? Vorschlag: zum zuletzt genutzten Team (Teamseite bzw. Setup), ohne Team zu `/connections`.
2. Zwischenstand nach Runde 2: Die Stärken-Vorschläge kommen heute von der KI auf Marias Rechner (`ai:worker`). Läuft der nicht, gäbe es keinen Zwischenstand. Vorschlag: immer die eigenen Kernsätze je Szene zeigen, KI-Hinweise dazu, wenn sie schon da sind.
3. Abschluss: ab 5 Szenen möglich, Runde 3 angeboten, aber nicht Pflicht?
4. Commitment Lab, Read My Mind und Founder in the Wild im Gesamtbild: erst einmal weglassen (eigene Verträge, nur Paare)?

### Modell
Bauen mit Sonnet. Die Datenwege des Gesamtbilds (Freigaben) sieht sich vor dem Merge Opus noch einmal an.
