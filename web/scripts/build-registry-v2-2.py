# -*- coding: utf-8 -*-
"""Erzeugt die Registratur v2.2 aus der Master-Arbeitsfassung v0.2.

Vom Projektwurzelverzeichnis aufrufen:  python3 web/scripts/build-registry-v2-2.py

Die Quelle ist ein Fliesstext-Dokument, kein JSON. Was sich daraus nicht
eindeutig lesen laesst, steht hier als ausdrueckliche Tabelle - nicht als
Heuristik im Parser. Wer eine Zuordnung anzweifelt, findet sie an einer Stelle.
"""

import collections, io, json, re

SRC = "docs/CoFoundery_ALIGN_Master_Arbeitsfassung_v0.2.md"
OUT = "web/docs/founder-alignment-registry-v2-2.json"

# ---------------------------------------------------------------------------
# WAS IN DER ANTWORTLISTE IN WAHRHEIT EIN AUSLASSUNGSGRUND IST
# ---------------------------------------------------------------------------
#
# Die Quelle schreibt "nicht angeben" und "noch nicht entschieden" in dieselbe
# Zeile wie die Antwortmoeglichkeiten. Das ist fuer ein Dokument in Ordnung und
# fuer die Ablage nicht: Ein Auslassungsgrund darf nie als Wert gespeichert
# werden - genau so ist er in v1 unsichtbar geworden und wurde mitgemittelt.
MISSING_AUS_OPTION = {
    "nicht angeben":                    ("withheld", "möchte ich nicht angeben"),
    "noch offen":                       ("undecided", "habe ich noch nicht entschieden"),
    "noch nicht entschieden":           ("undecided", "habe ich noch nicht entschieden"),
    "noch nicht geklärt":               ("undecided", "haben wir noch nicht geklärt"),
    "noch nicht festgelegt":            ("undecided", "habe ich noch nicht festgelegt"),
    "noch nicht klar entschieden":      ("undecided", "habe ich noch nicht entschieden"),
    "noch unklar":                      ("undecided", "ist mir noch unklar"),
    "noch nicht einschätzbar":          ("cannot_assess", "kann ich noch nicht einschätzen"),
    "noch keine Einschätzung":          ("cannot_assess", "kann ich noch nicht einschätzen"),
    "zunächst vertraulich klären":      ("confidential_first", "möchte ich zunächst vertraulich klären"),
    "zunächst nur für mich festhalten": ("confidential_first", "möchte ich zunächst nur für mich festhalten"),
}

# ---------------------------------------------------------------------------
# DAS ANTWORTFORMAT JE ITEM
# ---------------------------------------------------------------------------
#
# ORDINAL heisst: Die Stufen sind geordnet, man darf von mehr und weniger
# sprechen. NOMINAL heisst: eine Wahl ohne Rangfolge. Die Quelle sagt es bei
# einigen Items selbst ("Interner Hinweis: Nominal; keine Rangfolge"); bei den
# uebrigen folgt es aus der Antwortskala.
#
# Wer beides gleich behandelt, hat die Information verloren, bevor die erste
# Auswertung beginnt.
ORDINAL = {
    "A01", "A02",                     # nie … fast immer
    "I01", "I02", "I03",              # gar nicht … sehr stark
    "E01", "E02", "E03",              # sehr unwahrscheinlich … sehr wahrscheinlich
    "U01", "U03", "U04", "U05",       # sehr wenig selbstständig … sehr selbstständig
    "D02",                            # sehr unwahrscheinlich … sehr wahrscheinlich
    "X01", "X02", "X03", "X04",       # sehr unwohl … sehr wohl
    "R10",                            # gar nicht wichtig … sehr wichtig
}
# Ausdruecklich nominal - teils, weil die Quelle es sagt, teils, weil es
# Handlungs- oder Regelwahlen sind.
NOMINAL = {"K01", "K03", "K04", "T01", "T02", "D01", "G01", "S02", "S03", "R09", "R12"}
MULTI = {"S01", "S06", "G04", "G05", "B05", "R06", "L03"}

# Formate ausserhalb von Auswahl
SONDERFORMAT = {
    "S04": "structured_text",       # Ergebnis · woran erkennbar · Zieldatum
    "R01": "number_range",          # Stunden pro Woche
    "R02": "person_number_range",   # je Person eine Erwartung
    "R03": "time_windows",          # Wochenplaner
    # R04 ist eine Auswahl, bei der EINE Option ein Datum verlangt - kein
    # eigenes Format. So war es auch in v2.1.
    "R04": "single_choice",
    "R05": "money_range",           # monatliche Auszahlung
    "B01": "money_range",           # Obergrenze eigenes Geld
    "B04": "number_range",          # Monate laufender Ausgaben
    "L01": "free_text_repeatable",
    "L02": "free_text_per_entry",
}
VALUE_CASE = {"W01", "W02", "W03", "W04", "W05", "W06"}

# ---------------------------------------------------------------------------
# WO EIN "OPTIONSTEXT" IN WAHRHEIT EIN EINGABEFELD IST
# ---------------------------------------------------------------------------
#
# R12 bietet an: "Datum · nach dem naechsten Meilenstein · noch nicht
# festgelegt". "Datum" ist keine Antwort, sondern die Form einer Antwort - so
# wie "Zahl/Bereich" bei R01. Als Beschriftung auf einem Knopf waere es
# sinnlos: Niemand waehlt "Datum", man waehlt EIN Datum.
#
# Deshalb wird der Text ersetzt und das Feld verlangt.
OPTION_IST_EINGABE = {
    "R12": {"Datum": "an einem bestimmten Datum – bitte angeben"},
}

# Welche Frage eine Anschlussfrage ausloest (aus "[nur wenn relevant]").
FOLGT_AUF = {"L02": "L01", "L03": "L01", "R05": "R04"}

RATING = ["gar nicht wichtig", "wenig wichtig", "mittel", "ziemlich wichtig", "sehr wichtig"]

# ---------------------------------------------------------------------------
# JEDES ITEM BRAUCHT EINEN AUSWEG - DOKUMENTIERTE ABWEICHUNG VON DER QUELLE
# ---------------------------------------------------------------------------
#
# Die Master-Fassung nennt bei den Arbeitsprofil-Fragen (A/I/E/U/D02/X) keinen
# Auslassungsgrund: Es gibt nur die fuenf Stufen. Wer die Frage nicht
# beantworten kann, muss also eine Stufe ankreuzen, die er nicht meint.
#
# Genau daran ist v1 gescheitert. Dort war "nicht beantwortet" ein Zustand ohne
# Aussage - man wusste nicht, ob jemand die Frage nicht verstanden, nicht
# gewollt oder nicht gesehen hat, und die Auswertung hat geraten. Raten hiess
# meistens: die Mitte.
#
# Deshalb bekommt jedes Item ohne eigenen Grund diesen einen. Er ist die
# schwaechste moegliche Abweichung: Er nimmt nichts weg und fuegt nur einen
# Ausweg hinzu. Maria vorzulegen.
STANDARD_MISSING = {"code": "cannot_assess", "label": "kann ich noch nicht einschätzen"}

# ---------------------------------------------------------------------------

roh = io.open(SRC, encoding="utf-8").read()
absaetze = [re.sub(r"\s+", " ", a).strip() for a in re.split(r"\n\s*\n", roh)]

abschnitt = None
items = collections.OrderedDict()
reihenfolge = []
aktuell = None

for a in absaetze:
    if a.startswith("## "):
        abschnitt = a[3:].strip()
        continue

    m = re.match(r"^\*\*([A-Z][0-9]{2})\*\*\s+(.*)$", a)
    if m:
        aktuell = m.group(1)
        reihenfolge.append(aktuell)
        items[aktuell] = {
            "itemId": aktuell, "section": abschnitt or "", "prompt": m.group(2).strip(),
            "options": [], "missing": [], "hint": None, "note": None,
            "concerns": None, "paths": None, "followUp": None,
        }
        continue

    if not aktuell:
        continue
    it = items[aktuell]

    for praefix in ("Antwort:", "Mehrfachauswahl:", "Antwort zusätzlich:", "Zusatz:"):
        if a.startswith(praefix):
            for teil in [t.strip() for t in a[len(praefix):].split("·")]:
                if not teil:
                    continue
                teil = OPTION_IST_EINGABE.get(aktuell, {}).get(teil, teil)
                if teil in MISSING_AUS_OPTION:
                    code, label = MISSING_AUS_OPTION[teil]
                    if code not in [x["code"] for x in it["missing"]]:
                        it["missing"].append({"code": code, "label": label})
                else:
                    it["options"].append(teil.rstrip("."))
            break

    if a.startswith("Anliegen A:"):
        # Wertefall: "Anliegen A: … | Anliegen B: … | Weg A: … | Weg B: …"
        teile = dict()
        for stueck in re.split(r"\s*\\?\|\s*", a):
            mm = re.match(r"^(Anliegen [AB]|Weg [AB]):\s*(.*)$", stueck.strip())
            if mm:
                teile[mm.group(1)] = mm.group(2).strip().rstrip(".")
        it["concerns"] = [teile.get("Anliegen A", ""), teile.get("Anliegen B", "")]
        it["paths"] = [teile.get("Weg A", ""), teile.get("Weg B", "")]

    if a.startswith("Anschluss:"):
        it["followUp"] = a[len("Anschluss:"):].strip()
    if a.startswith("Hinweis:") or a.startswith("Optionales Info-Beispiel:"):
        it["hint"] = a.split(":", 1)[1].strip()
    if "Interner Hinweis" in a:
        it["note"] = re.sub(r"\*\*", "", a).split(":", 1)[1].strip()
    if a.startswith("Empfohlenes UI:"):
        it["hint"] = a[len("Empfohlenes UI:"):].strip()

# ---------------------------------------------------------------------------

def format_von(item_id):
    if item_id in VALUE_CASE:  return "value_case"
    if item_id in SONDERFORMAT: return SONDERFORMAT[item_id]
    if item_id in MULTI:       return "multi_choice"
    if item_id in ORDINAL:     return "ordinal_choice"
    if item_id in NOMINAL:     return "single_choice"
    return "single_choice"

ausgabe = []
for n, item_id in enumerate(reihenfolge, start=1):
    it = items[item_id]
    fmt = format_von(item_id)

    optionen = [
        collections.OrderedDict([
            ("optionId", f"{item_id}_o{i}"),
            ("label", label),
            ("requiresText", bool(re.search(r"ander|weitere|bitte", label, re.I))),
            ("exclusive", label.startswith("keine ") or label.startswith("aktuell nicht")),
        ])
        for i, label in enumerate(it["options"], start=1)
    ]

    eintrag = collections.OrderedDict([
        ("itemId", item_id),
        ("order", n),
        ("section", it["section"]),
        ("prompt", it["prompt"]),
        ("hint", it["hint"]),
        ("answerFormat", fmt),
        ("options", optionen if fmt in ("ordinal_choice", "single_choice", "multi_choice") else []),
        ("missing", it["missing"] or [dict(STANDARD_MISSING)]),
        ("note", it["note"] or ""),
    ])
    if it["concerns"]:
        eintrag["concerns"] = it["concerns"]
        eintrag["paths"] = it["paths"]
        eintrag["ratingOptions"] = RATING
        eintrag["ratingMissing"] = "kann ich noch nicht entscheiden"
    if it["followUp"]:
        eintrag["followUpQuestion"] = it["followUp"]
    if item_id in FOLGT_AUF:
        eintrag["showAfter"] = FOLGT_AUF[item_id]
    ausgabe.append(eintrag)

doc = collections.OrderedDict([
    ("instrumentId", "founder-alignment-v2-2"),
    ("registryVersion", "2.2.0"),
    ("status", "draft"),
    ("createdAt", "2026-09-29"),
    ("source", SRC),
    ("overallScore", False),
    ("dimensionScores", False),
    ("deviationsFromSource", [
        collections.OrderedDict([
            ("what", "Jedes Item ohne eigenen Auslassungsgrund bekommt 'kann ich noch nicht einschätzen'."),
            ("source", "Master-Arbeitsfassung v0.2, Abschnitt 4: dort nur die fuenf Stufen"),
            ("reason", "Ohne Ausweg muss jemand eine Stufe ankreuzen, die er nicht meint. Genau daran ist v1 gescheitert: 'nicht beantwortet' war ein Zustand ohne Aussage, und die Auswertung hat geraten."),
            ("decidedBy", "Claude, 29.09.2026 - Maria zur Bestaetigung vorzulegen"),
        ]),
        collections.OrderedDict([
            ("what", "R12: die Antwort 'Datum' heisst 'an einem bestimmten Datum - bitte angeben'."),
            ("source", "Master-Arbeitsfassung v0.2, R12"),
            ("reason", "'Datum' ist keine Antwort, sondern die Form einer Antwort. Als Beschriftung auf einem Knopf waere es sinnlos: Niemand waehlt 'Datum', man waehlt EIN Datum. Die Bedeutung bleibt, nur der Satz wird lesbar."),
            ("decidedBy", "Claude, 29.09.2026"),
        ]),
    ]),
    ("notes", [
        "Erzeugt aus der Master-Arbeitsfassung v0.2. Die Zuordnungen, die sich aus dem Fliesstext nicht eindeutig lesen lassen - Antwortformat, ordinal gegen nominal, und was in der Antwortliste in Wahrheit ein Auslassungsgrund ist - stehen ausdruecklich im Generator.",
        "KEIN GESAMTWERT UND KEINE DIMENSIONSWERTE. Die Quelle sagt es selbst (Abschnitt 8.1): geordnete Kategorien duerfen intern codiert, aber nicht automatisch als psychologische Messwerte ausgegeben werden.",
        "A und I werden niemals zu einem Analytisch-gegen-Intuitiv-Wert verschmolzen. Beide koennen gleichzeitig hoch sein.",
    ]),
    ("sections", list(dict.fromkeys(i["section"] for i in ausgabe if i["section"]))),
    ("items", ausgabe),
])

io.open(OUT, "w", encoding="utf-8").write(json.dumps(doc, ensure_ascii=False, indent=2) + "\n")

from collections import Counter
print(len(ausgabe), "Items")
print("Formate:", dict(Counter(i["answerFormat"] for i in ausgabe)))
print("Abschnitte:", len(doc["sections"]))
print("ohne Optionen:", [i["itemId"] for i in ausgabe if not i["options"] and i["answerFormat"] in ("ordinal_choice","single_choice","multi_choice")])
print("ohne Auslassungsgrund:", [i["itemId"] for i in ausgabe if not i["missing"]])
