---
name: blog
description: Schreibt einen Beitrag für den öffentlichen Made2Found-Blog (Deutsch oder Englisch, je Beitrag) in Marias Stimme, suchmaschinenfreundlich, als JSON zum Einfügen im Admin unter /admin/blog; auch die englische oder deutsche Zweitfassung eines bestehenden Beitrags. Verwenden, wenn Maria einen Blogbeitrag, einen Titel, eine Übersetzung oder ein Blogthema möchte. Veröffentlicht nie.
---

# Blog-Beitrag

Du schreibst den Entwurf. Maria prüft, ändert, gibt frei und veröffentlicht im Admin (`/admin/blog`). **Du veröffentlichst nie, du gibst nichts frei, du fasst keine Mitgliederdaten an.** Das JSON wird beim Einfügen immer ein *Entwurf*.

## Vorbereitung (immer)
1. Lies `marketing/MARKENSTIMME.md`: Stimme, Zielgruppe, Themen, Nie-Liste, Marias Fakten. Sie gilt vor allem anderen.
2. Lies `marketing/newsletter/THEMEN.md` (Ideenspeicher) und schau in `marketing/blog/entwuerfe/` sowie `marketing/newsletter/entwuerfe/`, damit nichts doppelt kommt. Ein Beitrag darf einen Newsletter-Gedanken ausbauen, aber nicht abschreiben.
3. Frage Maria nur, was fehlt: Thema oder Geschichte, Sprache (Standard Deutsch), ob eine Zweitfassung gebraucht wird. Hat sie nichts vorgegeben, schlage drei Themen vor und nimm das, was sie wählt.

## Was ein guter Beitrag ist
Ein Blogbeitrag ist die Textlinie des Marketings: öffentlich, auffindbar, bleibt Monate lesbar. Er beantwortet **eine Frage, die jemand wirklich in eine Suche tippt** („Wie teile ich Anteile zwischen Co-Foundern?“, „Was tun, wenn wir uns über Rollen streiten?“). Das ist etwas anderes als ein Newsletter, der persönlich und zeitnah ist.

Aufbau (Muster, nicht Zwang), 600 bis 1200 Wörter:
1. **Einstieg** in zwei, drei Sätzen: das Problem so, wie die Person es erlebt. Dann gleich, was sie hier mitnimmt.
2. **Hauptteil** in drei bis fünf Abschnitten mit aussagekräftigen Zwischenüberschriften (`# ` im Text wird `h2` auf der Seite, `## ` wird `h3`). Die Überschriften enthalten die Wörter, nach denen man sucht, und lesen sich wie eine Gliederung. Konkrete Beispiele statt Behauptungen. Listen (`- `) für Schritte und Fragen.
3. **Eine Frage fürs Team-Gespräch** (als `quote`-Baustein), die zwei Gründer:innen sofort miteinander besprechen können.
4. **Genau ein Knopf am Ende** (siehe Format): ein Aufruf, passend zum Thema.

## Regeln für den Text
- **Nie etwas über Maria erfinden.** Nur die Fakten aus „Marias Geschichte“ in `marketing/MARKENSTIMME.md`, mit richtigen Rollen. Fehlt ein Detail, frage Maria oder schreibe allgemein („viele Gründer:innen kennen das“). Wiederhole ihre ganze Geschichte nicht in jedem Beitrag.
- **Keine Platzhalter im Text.** Offene Punkte stehen nur in deiner Antwort, nie als „[PRÜFEN]“ im JSON.
- Du-Ansprache, locker, kurz, lösungsorientiert, inklusive und geschlechtsneutrale Sprache („die Person“, „Co-Founder“, „Gründer:innen“). Keine Scores, kein „kompatibel/inkompatibel“, keine Erfolgs- oder Heilsversprechen, keine Typen. Kein Hinweis auf Zählen von Öffnungen oder Lesern.
- **Titel** höchstens 60 Zeichen, mit dem Suchbegriff und einem Grund zu klicken. **Kurztext** (`excerpt`) 120 bis 155 Zeichen: er erscheint in Suchergebnissen und Vorschauen, beantwortet die Frage in einem Satz und macht neugierig (hartes Limit 300).
- **Adresse** (`slug`): kleingeschrieben, Bindestriche, kein Datum, keine Umlaute (`anteile-unter-co-foundern-teilen`), höchstens 80 Zeichen. Sie ändert sich nach dem Veröffentlichen nicht mehr, also kurz und zeitlos.
- Zahlen, Studien, Zitate nur mit geprüfter Quelle (WebSearch/WebFetch, Quelle öffnen und die Aussage dort finden). Echte Links, nie erfundene; im Text als `[Text](https://…)`. Nicht belegbar: weglassen und Maria in der Antwort sagen.
- Keine erkennbaren realen Personen oder Firmen in negativem Zusammenhang, keine Namen oder Daten von Mitgliedern. Der Blog ist öffentlich.
- **Bilder:** Lass `image`-Bausteine weg (Maria lädt Bilder im Editor hoch). Schlage in der Antwort Bilder vor und gib für **jedes einen fertigen Alternativtext** (beschreibt das Bild für Menschen, die es nicht sehen; Pflichtfeld) sowie ein Titelbild im Format 1200 × 630 mit Alternativtext.

## Sprache und Übersetzung
- Jeder Beitrag hat **eine** Sprache (`language`: `de` oder `en`), nie gemischt. Deutsch ist die Hauptfassung.
- **Zweitfassung:** Kein Wort-für-Wort-Übersetzen, sondern denselben Gedanken in der anderen Sprache neu schreiben (Englisch: American spelling, keine deutschen Sonderzeichen, englische Suchbegriffe in Titel und Überschriften, Beispiele, die dort funktionieren). Beide Fassungen bekommen **denselben `translationKey`** (kleingeschrieben, Bindestriche, z. B. `splitting-equity`) und **je eine eigene Adresse in ihrer Sprache** (`anteile-teilen` und `splitting-equity`). Nur so zeigt die Seite die Sprachumschaltung, und erst wenn beide veröffentlicht sind.
- Ohne Zweitfassung bleibt `translationKey` leer.

## Ausgabeformat
Schreibe **ein JSON-Objekt** (ohne Kommentare), speichere es als `marketing/blog/entwuerfe/JJJJ-MM-TT-adresse.json` und gib es zusätzlich in einem Codeblock zum Kopieren aus. Maria fügt es im Admin unter „Entwurf einfügen“ ein.

```json
{
  "title": "Anteile unter Co-Foundern teilen: so redet ihr früh darüber",
  "slug": "anteile-unter-co-foundern-teilen",
  "language": "de",
  "translationKey": "splitting-equity",
  "excerpt": "Wie ihr Anteile fair besprecht, bevor aus einem Gefühl ein Streit wird: drei Fragen und ein Gespräch.",
  "author": "Maria",
  "date": "2026-11-17",
  "blocks": [
    { "id": "einstieg", "type": "text", "text": "Wer bekommt wie viel, und warum?\n\nDiese Frage ist unbequem. Hier steht, wie ihr sie früh und ruhig besprecht." },
    { "id": "teil1", "type": "text", "text": "# Warum ein Gespräch besser ist als eine Formel\n\nAbsatz mit **fett**, *kursiv* und [Link](https://example.com).\n\n- erster Punkt\n- zweiter Punkt" },
    { "id": "frage", "type": "quote", "text": "Was erwartet ihr beide in einem Jahr vom jeweils anderen?", "by": "Frage für euer Gespräch" },
    { "id": "knopf", "type": "button", "label": "Zu deinem Profil", "href": "/me/profile" }
  ]
}
```

Erlaubt: `language` de | en; `slug` nur `a-z 0-9` und einzelne Bindestriche, 3 bis 80 Zeichen; `translationKey` nur `a-z 0-9 -`; `date` als `JJJJ-MM-TT` (leer = heute); `author` frei (Standard Maria). Bausteine: `text` (bis 12000 Zeichen; `# ` Überschrift, `## ` kleinere, `### ` kleinste, `- ` Liste, `**fett**`, `*kursiv*`, `[Text](https://…)`), `quote` (`text`, `by`), `button` (`label`, `href`: https oder ein Pfad der App wie `/me/profile`). **Höchstens ein `button`, und er steht als letzter Baustein.** `image` nicht verwenden. Titelbild (`cover`) nur, wenn Maria es schon hochgeladen hat.

## Nach dem Schreiben
Sag Maria in wenigen Zeilen: Thema und gewählte Suchfrage, was sie noch ergänzen muss (Titelbild und Bilder mit deinen Alternativtexten, Quellen, die du nicht belegen konntest, Fakten, die sie bestätigen soll), ob eine Zweitfassung dazugehört (mit gleichem `translationKey`), und dass **nichts veröffentlicht** wurde: im Admin „Entwurf einfügen“, ansehen (Vorschau), freigeben, veröffentlichen. Trage das Thema in `marketing/newsletter/THEMEN.md` ein, sobald Maria den Beitrag freigibt.
