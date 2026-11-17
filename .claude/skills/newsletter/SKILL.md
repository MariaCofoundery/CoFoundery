---
name: newsletter
description: Schreibt einen Entwurf für den Made2Found-Newsletter (alle zwei Wochen, Deutsch oder Englisch) in Marias Stimme, als JSON zum Einfügen im Admin. Verwenden, wenn Maria eine neue Ausgabe, einen Betreff, eine Comic-Idee oder ein Thema für den Newsletter möchte. Sendet nie.
---

# Newsletter-Entwurf

Du schreibst den Entwurf. Maria prüft, ändert und sendet im Admin (`/admin/newsletter`). **Du sendest nie, du fasst keine Mitgliederdaten an.**

## Vorbereitung (immer)
1. Lies `marketing/MARKENSTIMME.md`: Stimme, Zielgruppe, Themen, Nie-Liste. Sie gilt vor allem anderen.
2. Lies `marketing/newsletter/THEMEN.md` (Themenspeicher, bereits behandelte Ausgaben) und schau in `marketing/newsletter/entwuerfe/`, damit nichts doppelt kommt.
3. Frage Maria nur, was fehlt: Thema oder Geschichte, Sprache (Standard Deutsch). Hat sie nichts vorgegeben, schlage drei Themen aus der Liste vor und nimm das, was sie wählt.

## Aufbau einer Ausgabe (Muster, nicht Zwang)
1. **Gruß** in zwei, drei Sätzen, persönlich, von Maria.
2. **Die Idee oder Geschichte** (250 bis 350 Wörter): ein Gedanke, gut erzählt. Problem kurz, Lösung ausführlich. Konkretes Beispiel statt Behauptung.
3. **Eine Frage für euer Gespräch:** etwas, das zwei Gründer:innen sofort miteinander besprechen können.
4. **Comic-Idee** (siehe unten), falls Maria einen Comic möchte.
5. **Ein Knopf:** genau ein Aufruf (Link auf einen Pfad der App wie `/dashboard` oder `/me/profile`, oder https).
6. Kurzer Abschied, Antworten ausdrücklich erlaubt.

Die Rubrik „Aus dem Netzwerk“ (anonyme Einträge) und Danke-Zitate baust Maria im Editor ein, weil sie echte Einträge und Erlaubnisse braucht. Setze dort einen Hinweis in deine Antwort, keinen Baustein.

## Regeln für den Text
- **Nie etwas über Maria erfinden.** Wenn du aus ihrem Leben erzählst, nimm nur die Fakten aus dem Abschnitt „Marias Geschichte“ in `marketing/MARKENSTIMME.md`, mit richtigen Rollen und Geschlechtern. Brauchst du eine Szene oder ein Detail, das dort nicht steht, frage Maria oder schreibe den Absatz allgemein („viele Gründer:innen kennen das“). Die Willkommensmail erzählt ihre Geschichte schon: wiederhole sie nicht, sondern gehe weiter.
- **Keine Platzhalter im Text.** Offene Punkte stehen nur in deiner Antwort an Maria, nie als „[PRÜFEN]“ im JSON.
- Du-Ansprache, kurz, locker, lösungsorientiert, inklusive und geschlechtsneutrale Sprache („die Person“, „Co-Founder“, nicht „er oder sie“). Keine Scores, kein „kompatibel/inkompatibel“, keine Erfolgsversprechen, kein Hinweis auf Öffnungszählung.
- Betreff höchstens 50 Zeichen, konkret und neugierig. Vorschauzeile höchstens 90 Zeichen, ergänzt den Betreff.
- Keine erkennbaren realen Personen oder Firmen in negativem Zusammenhang. Keine Namen oder Daten von Mitgliedern.
- Zahlen, Studien und Zitate nur, wenn du sie mit einer Quelle belegen kannst (WebSearch/WebFetch). Echte Links, nie erfundene. Nicht belegbar heißt: weglassen und Maria in der Antwort sagen.
- Englisch: American spelling, keine deutschen Sonderzeichen, nicht wörtlich übersetzen.

## Ausgabeformat
Schreibe **ein JSON-Objekt** (ohne Kommentare), speichere es als `marketing/newsletter/entwuerfe/JJJJ-MM-TT.json` und gib es zusätzlich in einem Codeblock zum Kopieren aus. Maria fügt es im Admin unter „Entwurf einfügen“ ein.

```json
{
  "title": "Interner Name der Ausgabe",
  "subject": "Betreff",
  "preheader": "Vorschauzeile",
  "language": "de",
  "look": "light",
  "accent": "#5b3df5",
  "headerMode": "gradient",
  "font": "serif",
  "buttonStyle": "round",
  "headingCase": "normal",
  "blocks": [
    { "id": "gruss", "type": "text", "text": "Hallo,\n\n…" },
    { "id": "idee", "type": "text", "text": "# Überschrift\n\nAbsatz mit **fett**, *kursiv* und [Link](https://…)." },
    { "id": "frage", "type": "quote", "text": "Die Frage fürs Gespräch", "by": "Frage für euer Gespräch" },
    { "id": "knopf", "type": "button", "label": "Zu deinem Profil", "href": "/me/profile" }
  ]
}
```

Erlaubt: `audience` members | public | all (wer die Ausgabe bekommt: Mitglieder mit Konto, die Nur-Newsletter-Liste aus dem Blog ohne Konto, oder beide; Standard members, setze es nur, wenn Maria es sagt); `language` de | en (Sprache der ganzen Ausgabe; der Text ist komplett in dieser Sprache, nie gemischt; Standard de); `look` light | night | plain; `accent` einer von `#5b3df5 #0a88c2 #2dbfa8 #d4286b #e08a1e`; `headerMode` gradient | image | none; `font` serif | sans; `buttonStyle` round | square | outline; `headingCase` normal | upper. Bausteine: `text` (bis 6000 Zeichen; `# ` Überschrift, `## ` kleine Überschrift, `- ` Liste, `**fett**`, `*kursiv*`, `[Text](https://…)`), `quote` (`text`, `by`), `button` (`label`, `href`), `divider`. Lass `entries` und `image` weg: Einträge und Bilder fügt Maria im Editor ein. Standard-Look für Ausgaben: `light`, Akzent `#5b3df5`.

## Comic-Idee (optional, in der Antwort, nicht im JSON)
Gib Maria für die Rubrik „Comic“ **ein einziges Bild** (Ein-Bild-Comic mit ein, zwei Sprechblasen, so wie in der Newsletter-Vorlage, die sie mag):
- **Situation** in einem Satz (typischer Gründungsteam-Moment zum Thema der Ausgabe).
- **Das eine Bild** mit Szene und Sprechblasen (kurz, Pointe zuletzt).
- **Figuren:** nur ihre wiederkehrenden Figuren und Mia; keine echten Personen als Vorbild.
- **Bildauftrag** als fertiger Text für ein Bildwerkzeug, mit Hinweis, dass die Figuren als Vorlage hochgeladen werden.
- **Text unter dem Bild:** die Pointe als Text für den Baustein davor oder danach und ein Alternativtext (viele Mailprogramme blenden Bilder zuerst aus).

## Nach dem Schreiben
Sag Maria in wenigen Zeilen: was das Thema ist, was sie noch ergänzen muss (Netzwerk-Einträge, Foto, Comic-Bild, Danke-Zitat mit Erlaubnis, Quellen, die du nicht belegen konntest) und dass nichts gesendet wurde. Trage das behandelte Thema in `marketing/newsletter/THEMEN.md` unter „Bereits behandelt“ ein, sobald Maria die Ausgabe freigibt.

## Automatik-Modus (zeitgesteuerter Lauf, alle zwei Wochen)
Wenn dich ein zeitgesteuerter Lauf startet (kein Gespräch mit Maria), arbeitest du so:
1. **Vorbereitung** wie oben (Markenstimme, Themenspeicher, bisherige Entwürfe).
2. **Recherche** mit WebSearch (höchstens acht Suchen): Was ist gerade interessant für Gründer:innen am Anfang? Aktuelle Studien, Zahlen und Debatten zu den drei Themenfeldern der Markenstimme (Zusammenarbeit zu zweit, Konflikte im Team, Struktur und Führung), bevorzugt aus dem deutschsprachigen Raum und aus den letzten Monaten. Öffne jede Quelle, die du verwendest, mit WebFetch und prüfe, dass die Aussage dort steht. Verwende nur geprüfte Quellen mit echtem Link und Datum.
3. **Drei Varianten** mit klar verschiedenen Winkeln, je vollständig (Betreff, Vorschauzeile, Bausteine wie oben):
   - **A, Erfahrung:** ein Lernmoment aus Marias echter Geschichte (nur Fakten aus der Markenstimme) oder aus einer allgemeinen, erkennbaren Situation.
   - **B, Trend oder Zahl:** ein belegter aktueller Anlass, eingeordnet in Marias Stimme, mit einer Quelle im Text.
   - **C, Praxis:** eine kleine Methode oder drei Fragen, die man sofort mit dem Gegenüber ausprobiert.
   Keine zwei Varianten zum selben Thema wie die letzten Ausgaben.
4. **Hinweise je Variante** (`notes`, nur für Maria, nicht in der Mail): Warum dieses Thema jetzt, Quellen als Liste (Titel, Link, Datum), was du nicht belegen konntest, und die Ein-Bild-Comic-Idee mit Bildauftrag und Alternativtext.
5. **Ablegen:** Sende die Entwürfe per `curl` an die App, ohne sie anderswo zu speichern:
   `POST $NEWSLETTER_DRAFTS_URL` mit Header `Authorization: Bearer $NEWSLETTER_DRAFT_TOKEN` und `Content-Type: application/json`, Körper `{"drafts":[{"variant":"A","notes":"…","draft":{…JSON wie oben…}}, …]}` (ein bis drei Einträge). Die App legt nur **Entwürfe** an. Du kannst und sollst nie senden oder einplanen.
6. **Bericht:** Gib am Ende nur aus, wie viele Entwürfe angelegt wurden und deren Betreffzeilen. Keine Tokens, keine Adressen, keine Mitgliederdaten.
Fehlen `NEWSLETTER_DRAFTS_URL` oder `NEWSLETTER_DRAFT_TOKEN`, brich ab und sag, was fehlt. Lege nichts im Projekt an, außer den Dateien in `marketing/newsletter/entwuerfe/`, falls du im Projektordner arbeitest.
