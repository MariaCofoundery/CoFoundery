# -*- coding: utf-8 -*-
"""Die sieben Bildschirme des Arbeitsprofils - aus dem UX-Review erzeugt.

---------------------------------------------------------------------------
WARUM EINE EIGENE DATEI UND NICHT DIE REGISTRATUR
---------------------------------------------------------------------------

Die Registratur beschreibt das INSTRUMENT: welche Frage, welche Antworten, was
gemessen wird. Wie viele Bildschirme daraus werden und was dazwischen steht,
ist eine Frage der Oberflaeche - sie kann sich aendern, ohne dass sich am
Instrument etwas aendert, und sie muss sich aendern koennen, ohne dass jemand
die Registratur anfasst.

    npm run build:screens
"""
import collections
import io
import json
import re

SRC = "docs/ALIGN_UX_QA_Teil1_Founderprofil_v0.2.md"
OUT = "web/docs/align-screens-profile-v0-2.json"

text = io.open(SRC, encoding="utf-8").read()


def fett_nach(block, marke):
    i = block.find(marke)
    if i < 0:
        return None
    for zeile in block[i + len(marke):].split("\n"):
        treffer = re.match(r"^\*\*(.+?)\*\*\s*$", zeile.strip())
        if treffer:
            return treffer.group(1).strip()
    return None


def zitat_nach(block, marke):
    i = block.find(marke)
    if i < 0:
        return None
    for zeile in block[i + len(marke):].split("\n"):
        if zeile.startswith("> "):
            return zeile[2:].strip()
        if zeile.strip() and not zeile.strip().startswith(("#", ">")):
            break
    return None


# Zeilen, die im Dokument die STRUKTUR beschreiben und nicht zum Text gehoeren.
MARKEN = ("Button:", "Übergang:", "Subline:", "Hinweis:", "Gemeinsame Frage:")


def absaetze(block):
    """Die Fliesstext-Absaetze eines Abschnitts, ohne Ueberschriften und Marken."""
    out, aktuell = [], []
    for zeile in block.split("\n"):
        z = zeile.strip()
        if z.startswith("#") or z.startswith(">") or z.startswith("`") or z == "---":
            continue
        if z in MARKEN:
            continue
        if not z:
            if aktuell:
                out.append(" ".join(aktuell))
                aktuell = []
            continue
        # Fettdruck ist Auszeichnung im Dokument, keine Auszeichnung auf dem
        # Bildschirm - dort entscheidet die Gestaltung, was hervorsticht.
        aktuell.append(z.replace("**", ""))
    if aktuell:
        out.append(" ".join(aktuell))
    return out


# --- Die Bildschirme ------------------------------------------------------
schirme = []
for block in re.split(r"^## ", text, flags=re.M)[1:]:
    kopf = block.split("\n", 1)[0]
    treffer = re.match(r"^\d+\.\s+Screen\s+(\d+)\s+—\s+(.+)$", kopf.strip())
    if not treffer:
        continue
    schirme.append(collections.OrderedDict([
        ("step", int(treffer.group(1))),
        ("title", treffer.group(2).strip()),
        ("transition", fett_nach(block, "Übergang:")),
        ("subline", zitat_nach(block, "Subline:")),
        ("groupPrompt", fett_nach(block, "Gemeinsame Frage:")),
        ("items", re.findall(r"^### ([A-Z][0-9]{2})\s*$", block, flags=re.M)),
    ]))

if len(schirme) != 7:
    raise SystemExit(f"Erwartet werden sieben Bildschirme, gefunden: {len(schirme)}")

# DER SIEBTE ERBT DIE GEMEINSAME FRAGE VOM SECHSTEN.
#
# Das Dokument sagt zu Bildschirm 7 nur "Gemeinsame Skala wie Screen 6". X03
# und X04 sind aber wie X01 und X02 als SITUATIONEN formuliert, ohne Frage -
# ohne den gemeinsamen Kopf stuenden dort zwei Aussagen mit Knoepfen darunter
# und keine Frage. Das ist abgeleitet und nicht abgeschrieben, deshalb steht es
# in der Datei.
geerbt = []
for i, schirm in enumerate(schirme):
    if schirm["groupPrompt"] or i == 0:
        continue
    vorher = schirme[i - 1]
    gleiche_reihe = schirm["items"] and vorher["items"] and \
        schirm["items"][0][0] == vorher["items"][0][0]
    if vorher["groupPrompt"] and gleiche_reihe:
        schirm["groupPrompt"] = vorher["groupPrompt"]
        schirm["groupPromptInherited"] = True
        geerbt.append(schirm["step"])

# --- Die Startseite -------------------------------------------------------
intro_block = text[text.index("## 2. Startseite / Intro"):text.index("### Wichtig")]
intro_titel = re.search(r"^### (.+)$", intro_block, flags=re.M).group(1).strip()
intro = collections.OrderedDict([
    ("title", intro_titel),
    ("paragraphs", [a for a in absaetze(intro_block) if a != intro_titel]),
    ("cta", "Starten"),
    # AUSDRUECKLICH KEINE ZEITANGABE. Das Review: "Noch keine feste Zeitangabe
    # anzeigen. Die reale Dauer erst im Pretest messen." Eine geratene Zahl
    # waere ein Versprechen, das niemand geprueft hat.
    ("duration", None),
])

doc = collections.OrderedDict([
    ("screensId", "align-screens-profile-v0-2"),
    ("scope", "founder_profile"),
    ("source", SRC),
    ("createdAt", "2026-09-30"),
    ("notes", [
        "Die Reihenfolge und die Zuordnung der Fragen stammen aus dem UX-Review. Die internen Abschnittsnamen (A, I, E, T/D, X) erscheinen NICHT in der Oberflaeche - sie bleiben in der Registratur und sind dort weiter die Grundlage der Auswertung.",
        "Sieben Schritte statt sechzehn Fragen. Der Fortschritt heisst 'Schritt 3 von 7' - '7 von 16 Fragen' liest sich wie eine Pruefung.",
        f"Bildschirm {', '.join(map(str, geerbt))} erbt die gemeinsame Frage vom vorhergehenden: Das Dokument sagt dort nur 'Gemeinsame Skala wie Screen 6', die Fragen sind aber ebenfalls als Situationen ohne Frage formuliert." if geerbt else "Keine geerbte gemeinsame Frage.",
    ]),
    ("intro", intro),
    ("screens", schirme),
])

io.open(OUT, "w", encoding="utf-8").write(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
print(f"{OUT}: {len(schirme)} Bildschirme, {sum(len(s['items']) for s in schirme)} Fragen")
