# -*- coding: utf-8 -*-
"""Erzeugt die Registratur v2.2 aus der Master-Arbeitsfassung v0.2.

Vom Projektwurzelverzeichnis aufrufen:  python3 web/scripts/build-registry-v2-2.py

Die Quelle ist ein Fliesstext-Dokument, kein JSON. Was sich daraus nicht
eindeutig lesen laesst, steht hier als ausdrueckliche Tabelle - nicht als
Heuristik im Parser. Wer eine Zuordnung anzweifelt, findet sie an einer Stelle.
"""

import collections, io, json, re

SRC = "docs/CoFoundery_ALIGN_Master_Arbeitsfassung_v0.2.md"

# ---------------------------------------------------------------------------
# ZWEI FASSUNGEN, NICHT EINE
# ---------------------------------------------------------------------------
#
# Die Master-Fassung nennt in Abschnitt 1 vier Baender mit VERSCHIEDENER
# Gueltigkeit: Das Arbeitsprofil ist "relativ portabel", U/K sind
# "team-/rollenabhaengig", S/R/G/B "vorhabensspezifisch und zeitgebunden",
# W/L "optional/adaptiv".
#
# Ein Fragebogen kann nicht gleichzeitig portabel und zeitgebunden sein. Wer
# beides in eine Fassung giesst, muss spaeter bei jeder Antwort rekonstruieren,
# ob R01 = 15 Stunden "allgemein" oder "fuer dieses Vorhaben im September"
# hiess - und das steht dann nirgends.
#
# Deshalb zwei Fassungen mit eigenen Kennungen, die sich unabhaengig
# weiterentwickeln koennen. Bisher hiess jede Aenderung an einem Teil eine neue
# Gesamtfassung: v2, v2.1, v2.2 - dreimal in drei Tagen.
#
# U/K LIEGT BEIM VORHABEN, nicht beim Profil. Die Quelle sagt "beim Teamstart
# bestaetigen" - das ist nicht portabel. Bestaetigen statt neu beantworten
# loest die Oberflaeche, indem sie die letzte Antwort vorbelegt.
SCOPES = {
    "founder_profile": {
        "id": "founder-profile-v1",
        "label": "Founder-Arbeitsprofil",
        "letters": "AIETDX",
        "out": "web/docs/founder-profile-registry-v1.json",
        "validity": "Relativ portabel. Gilt fuer die Person, nicht fuer ein bestimmtes Vorhaben - und sollte regelmaessig bestaetigt werden.",
    },
    "venture_alignment": {
        "id": "venture-alignment-v1",
        "label": "Venture-Alignment",
        "letters": "UKSRGBWL",
        "out": "web/docs/venture-alignment-registry-v1.json",
        "validity": "Gilt fuer EIN Vorhaben und einen Zeitraum. Nicht uebertragbar: Dieselbe Person kann bei zwei Vorhaben verschiedene Zusagen machen, ohne sich zu widersprechen.",
    },
}

# ---------------------------------------------------------------------------
# WAS IN DER ANTWORTLISTE IN WAHRHEIT EIN AUSLASSUNGSGRUND IST
# ---------------------------------------------------------------------------
#
# Die Quelle schreibt "nicht angeben" und "noch nicht entschieden" in dieselbe
# Zeile wie die Antwortmoeglichkeiten. Das ist fuer ein Dokument in Ordnung und
# fuer die Ablage nicht: Ein Auslassungsgrund darf nie als Wert gespeichert
# werden - genau so ist er in v1 unsichtbar geworden und wurde mitgemittelt.
MISSING_AUS_OPTION = {
    "nicht angeben":                    ("prefer_not_to_say", "möchte ich nicht angeben"),
    "noch offen":                       ("not_decided", "habe ich noch nicht entschieden"),
    "noch nicht entschieden":           ("not_decided", "habe ich noch nicht entschieden"),
    "noch nicht geklärt":               ("not_clarified", "haben wir noch nicht geklärt"),
    "noch nicht festgelegt":            ("not_decided", "habe ich noch nicht festgelegt"),
    "noch nicht klar entschieden":      ("not_decided", "habe ich noch nicht entschieden"),
    "noch unklar":                      ("not_decided", "ist mir noch unklar"),
    "noch nicht einschätzbar":          ("cannot_assess", "kann ich noch nicht einschätzen"),
    "noch keine Einschätzung":          ("cannot_assess", "kann ich noch nicht einschätzen"),
    "zunächst vertraulich klären":      ("confidential_first", "möchte ich zunächst vertraulich klären"),
    "zunächst nur für mich festhalten": ("confidential_first", "möchte ich zunächst nur für mich festhalten"),
}

# ---------------------------------------------------------------------------
# DAS SPRACHREVIEW LIEGT UEBER DER QUELLE
# ---------------------------------------------------------------------------
#
# Die Master-Arbeitsfassung sagt, WAS gefragt wird. Das Sprachreview vom
# 29.09.2026 sagt, WIE es dasteht - Wortlaut, Hinweise, Kleinschreibung von
# "du", und je Item der passende Auslassungsgrund.
#
# ZWEI DOKUMENTE UND NICHT EINES. Die Master-Fassung in die neuen Wortlaute
# umzuschreiben waere einfacher und falsch: Sie ist die fachliche Quelle, das
# Review eine redaktionelle Schicht darueber. Verschmolzen liesse sich spaeter
# nicht mehr sagen, was gemessen werden SOLL und was wir daraus gemacht haben.
#
# Deshalb wird hier ueberlagert und jede Ueberlagerung verzeichnet.
REVIEW = "docs/CoFoundery_ALIGN_Sprachreview_S01_MissingReasons_v0.1.md"

# ---------------------------------------------------------------------------
# UND DARUEBER NOCH DAS UX-REVIEW
# ---------------------------------------------------------------------------
#
# Dritte Schicht, dritte Frage. Die Master-Fassung sagt, WAS gefragt wird. Das
# Sprachreview sagt, WIE es dasteht. Das UX-Review vom 30.09.2026 sagt, wie es
# sich LIEST, wenn man es am Stueck durchgeht: kuerzere Saetze, "wie oft" statt
# "wie haeufig", und bei X01 bis X04 faellt der Fragekopf weg, weil er einmal
# ueber dem Block steht.
#
# Nur fuer das Arbeitsprofil. Das Venture-Alignment ist laut Dokument
# ausdruecklich noch nicht durchgearbeitet - dort waere eine halbe
# Ueberarbeitung schlimmer als keine.
UX_REVIEW = "docs/ALIGN_UX_QA_Teil1_Founderprofil_v0.2.md"

# Und dasselbe fuer den zweiten Bereich.
#
# Der grosse Unterschied zu Teil 1: Hier aendern sich nicht nur Fragetexte,
# sondern ANTWORTBESCHRIFTUNGEN. "sehr wenig selbststaendig" zwingt jeden, das
# erst zu uebersetzen; "die meisten Schritte vorher abstimmen" sagt, wie es im
# Alltag aussieht. Die Reihenfolge bleibt von wenig zu viel eigenem Spielraum,
# die Anzahl bleibt, die Kennungen bleiben - gespeicherte Antworten zeigen auf
# die Stelle und nicht auf den Text.
UX_REVIEW_2 = "docs/ALIGN_UX_QA_Teil2_Was_du_aufbauen_willst_v0.1.md"


def ux_review_2():
    """Wortlaute, Hinweise und Antwortbeschriftungen aus dem UX-Review Teil 2."""
    text = io.open(UX_REVIEW_2, encoding="utf-8").read()
    out = {}
    for block in re.split(r"^### ", text, flags=re.M)[1:]:
        kopf, koerper = block.split("\n", 1)
        kennung = kopf.strip().split(" ")[0].split("—")[0].strip()
        if not re.match(r"^[A-Z][0-9]{2}$", kennung):
            continue
        # W01 bis W06 bleiben aussen vor. Dort steht unter "Szenario:" eine
        # verkuerzte Lage, und Abschnitt 11 baut die sechs ohnehin auf ein
        # Dreischritt-Muster um - eine halbe Uebernahme waere schlimmer als
        # keine.
        if kennung.startswith("W"):
            continue

        eintrag = {}
        # Mit Marke, wo es eine gibt; sonst das erste Zitat im Block. Das
        # Dokument schreibt beides - "Frage:" in Abschnitt 4, direkt darunter
        # in Abschnitt 9 und 10.
        frage = _zitat_nach(koerper, "Frage:") or _erstes_zitat(koerper)
        if frage:
            eintrag["prompt"] = frage
        hinweis = _zitat_nach(koerper, "Hinweis:")
        if hinweis:
            eintrag["hint"] = hinweis
        labels = _nummern_nach(koerper, "Neue Antwortlabels:")
        if labels:
            eintrag["options"] = labels
        if eintrag:
            out[kennung] = eintrag
    return out


def _erstes_zitat(text):
    """Das erste Zitat im Block - aber nicht das eines Hinweises."""
    vor_hinweis = text.split("Hinweis:")[0]
    bloecke = _zitate(vor_hinweis)
    return bloecke[0] if bloecke else None


def _zitat_nach(text, marke):
    """Der Zitatblock direkt nach einer Marke - mehrzeilig zusammengezogen."""
    i = text.find(marke)
    if i < 0:
        return None
    teile = []
    for zeile in text[i + len(marke):].split("\n"):
        if zeile.startswith("> "):
            teile.append(zeile[2:].strip())
        elif zeile.strip() == ">":
            teile.append("")
        elif teile:
            break
    return re.sub(r"\s+", " ", " ".join(teile)).strip() or None


def ux_review():
    """Wortlaute und Hinweise aus dem UX-Review - nur Items des Arbeitsprofils."""
    text = io.open(UX_REVIEW, encoding="utf-8").read()
    out = {}
    for block in re.split(r"^### ", text, flags=re.M)[1:]:
        kopf, koerper = block.split("\n", 1)
        kennung = kopf.strip().split(" ")[0]
        if not re.match(r"^[A-Z][0-9]{2}$", kennung):
            continue
        eintrag = {}
        q = _zitate(koerper.split("Hinweis")[0])
        if q:
            eintrag["prompt"] = q[0]
        if "Hinweis" in koerper:
            nach = _zitate(koerper[koerper.index("Hinweis"):])
            if nach:
                eintrag["hint"] = nach[0]
        out[kennung] = eintrag
    return out

# Ohne eigene Beschriftung im Dokument: der uebliche Satz zum Code.
MISSING_LABEL = {
    "cannot_assess":      "kann ich noch nicht einschätzen",
    "not_decided":        "habe ich noch nicht entschieden",
    "not_clarified":      "haben wir noch nicht geklärt",
    "prefer_not_to_say":  "möchte ich nicht angeben",
    "confidential_first": "möchte ich zunächst vertraulich klären",
}


def _zitate(text):
    """Alle Zitatbloecke ('> ...' in Folge), je zu einem Satz zusammengezogen."""
    bloecke, aktuell = [], []
    for zeile in text.split("\n"):
        if zeile.startswith("> "):
            aktuell.append(zeile[2:].strip())
        elif zeile.strip() == ">":
            aktuell.append("")
        else:
            if aktuell:
                bloecke.append(re.sub(r"\s+", " ", " ".join(aktuell)).strip())
                aktuell = []
    if aktuell:
        bloecke.append(re.sub(r"\s+", " ", " ".join(aktuell)).strip())
    return bloecke


def _nummern_nach(text, marke):
    i = text.find(marke)
    if i < 0:
        return None
    out = []
    for zeile in text[i + len(marke):].split("\n"):
        z = zeile.strip()
        m = re.match(r"^\d+\.\s+(.*)$", z)
        if m:
            out.append(m.group(1).strip())
        elif out and z:
            break
    return out or None


def _codes_nach(text, marke):
    i = text.find(marke)
    if i < 0:
        return None
    rest = text[i + len(marke):]
    inline = re.findall(r"`([a-z_]+)`", rest.split("\n", 1)[0])
    if inline:
        return inline
    out = []
    for zeile in rest.split("\n"):
        z = zeile.strip()
        if z.startswith("- "):
            out.extend(re.findall(r"`?([a-z_]+)`?", z[2:].strip()))
        elif out and z:
            break
    return out or None


def _labels_nach(text):
    if "UI-Label:" in text:
        nach = _zitate(text[text.index("UI-Label:"):])
        if nach:
            return [nach[0]]
    m = re.search(r"^UI:\s*$", text, flags=re.M)
    if m:
        labels = []
        for zeile in text[m.end():].split("\n"):
            z = zeile.strip()
            if z.startswith("- "):
                labels.append(z[2:].strip())
            elif labels and z:
                break
        if labels:
            return labels
    return None


def sprachreview():
    """Das Review als `{Kennung: {prompt, hint, options, missing, ...}}`."""
    text = io.open(REVIEW, encoding="utf-8").read()
    out = {}
    for block in re.split(r"^### ", text, flags=re.M)[1:]:
        kopf, koerper = block.split("\n", 1)
        kennung = kopf.strip().split(" ")[0]
        if not re.match(r"^[A-Z][0-9]{2}[a-z]?$", kennung):
            continue

        eintrag = {}
        # Szenario + Frage gehoeren zusammen: W02 bis W06 beschreiben eine Lage
        # und stellen danach die Frage. Beides ist die Frage.
        if "Frage:" in koerper and "Szenario:" in koerper:
            szenario = _zitate(koerper[:koerper.index("Frage:")])
            frage = _zitate(koerper[koerper.index("Frage:"):])
            if szenario and frage:
                eintrag["prompt"] = f"{szenario[0]} {frage[0]}"
        else:
            q = _zitate(koerper.split("Hinweis:")[0])
            if q:
                eintrag["prompt"] = q[0]

        if "Hinweis:" in koerper:
            nach = _zitate(koerper[koerper.index("Hinweis:"):])
            if nach:
                eintrag["hint"] = nach[0]

        codes = _codes_nach(koerper, "Auslassung:")
        if codes:
            eintrag["missing"] = codes
        labels = _labels_nach(koerper)
        if labels:
            eintrag["missingLabels"] = labels

        neue_labels = _nummern_nach(koerper, "Antwortlabels:")
        if neue_labels:
            eintrag["options"] = neue_labels
        unveraendert = _nummern_nach(koerper, "Antworten unverändert:")
        if unveraendert:
            eintrag["unchanged"] = unveraendert

        out[kennung] = eintrag
    return out

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
MULTI = {"S01", "S06", "G04", "G05", "B05", "R06", "L03", "S01_top"}

# Die sechs Wichtigkeiten aus dem Sprachreview: geordnete Stufen, je Ziel eine.
# Sie werden NIE zu einem Wert verrechnet - sie sind nebeneinander wichtig,
# nicht gegeneinander.
ORDINAL |= {"S01a", "S01b", "S01c", "S01d", "S01e", "S01f"}

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
# WORIN GEZAEHLT WIRD
# ---------------------------------------------------------------------------
#
# GEMELDET AM 30.09.2026: Bei B04 stand "Stunden pro Woche" neben dem
# Zahlenfeld - bei einer Frage nach einer finanziellen Reserve. Die Einheit war
# im Eingabefeld fest verdrahtet, weil es sie zuerst nur fuer R01 gab. Beim
# zweiten Item derselben Form war sie dann falsch, und zwar still: Ein Feld mit
# einer falschen Einheit sieht aus wie ein Feld.
#
# Die Einheit steht in der Master-Fassung - "Zahl/Bereich in Stunden pro Woche"
# bei R01, "Monate laufender Ausgaben" bei B04 - und gehoert deshalb an das
# Item und nicht in die Oberflaeche.
EINHEIT = {
    "R01": "Stunden pro Woche",
    "B04": "Monate laufender Ausgaben",
}

# Der freiwillige Zusatz unter dem Zahlenfeld. Auch der war fuer R01
# geschrieben ("Falls der Umfang schwankt") und stand bei B04 mit.
BEDINGUNGSHINWEIS = {
    "R01": "Falls der Umfang schwankt: unter welchen Bedingungen? (freiwillig)",
}

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

# ---------------------------------------------------------------------------
# MARKDOWN IST SCHREIBWEISE DER QUELLE, NICHT TEIL DER FRAGE
# ---------------------------------------------------------------------------
#
# GEFUNDEN AM 29.09.2026. Drei Dinge aus der Master-Fassung standen woertlich
# im Fragebogen:
#
#   R02  "... ungefaehr von \[Name\]?"   - die Maskierung fuer eckige Klammern
#   L02  "... ueberschritten ist? **\[nur wenn relevant\]**"
#   L03  dasselbe
#
# React setzt Text so, wie er dasteht: Der Backslash war zu sehen. Und "[nur
# wenn relevant]" ist eine Anweisung an die Redaktion, keine Frage an einen
# Menschen - die Bedingung steht ohnehin als `showAfter` in der Registratur und
# wirkt dort, statt danebenzustehen.
#
# `[Name]` BLEIBT als Platzhalter stehen. Er gehoert zur Frage: R02 fragt nach
# einer Erwartung an eine bestimmte Person. Ersetzt wird er beim Anzeigen, wo
# man weiss, wer gemeint ist.

REDAKTIONSMARKEN = ("[nur wenn relevant]",)

# ---------------------------------------------------------------------------
# WO EIN TEXTFELD AUFGEHT - UND SONST NIRGENDS
# ---------------------------------------------------------------------------
#
# Vorher entschied das ein Muster: Wer "ander", "weitere" oder "bitte" in der
# Beschriftung hatte, bekam ein Feld. Das ging bei D01 daneben, wo die
# Antworten FORMULIERUNGEN sind: "Ich sehe das anders, weil ..." und "Ich
# wuerde gern noch eine andere Moeglichkeit anschauen ..." enthalten beide
# "ander" - und oeffneten ein Feld, in das niemand etwas schreiben wollte.
# Gemeldet am 30.09.2026.
#
# Auch bei G01 traf es die falsche: "vorher benannte andere Person entscheidet
# nach Ruecksprache" ist eine Regel und keine Einladung zum Schreiben.
#
# UX-Regel aus der Spezifikation: Feste Auswahlfragen erzeugen keine
# zusaetzlichen Textfelder, ausser es steht ausdruecklich hier.
BRAUCHT_TEXTFELD = {
    ("K04", "andere Regel"),
    ("S01", "anderes Ziel"),
    ("S06", "andere Vorstellung"),
    ("R06", "andere Bedingung"),
    ("R09", "andere Vorgehensweise"),
    ("R12", "an einem bestimmten Datum – bitte angeben"),
    ("G04", "anderer Weg"),
    ("G05", "weitere"),
    ("B05", "andere Absicherung"),
    ("L03", "andere Regel"),
}


def entmaskieren(text: str) -> str:
    """Nimmt die Markdown-Maskierung heraus und streicht Redaktionsmarken."""
    text = re.sub(r"\\([\[\]*_`])", r"\1", text)
    for marke in REDAKTIONSMARKEN:
        text = text.replace(f"**{marke}**", "").replace(marke, "")
    return re.sub(r"\s+", " ", text).strip()


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
            "itemId": aktuell, "section": abschnitt or "",
            "prompt": entmaskieren(m.group(2)),
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
# ---------------------------------------------------------------------------
# DAS SPRACHREVIEW UEBERLAGERN - MIT HARTEN PRUEFUNGEN
# ---------------------------------------------------------------------------
#
# Es wird laut abgebrochen statt still uebersprungen. Ein Review, das die
# Haelfte der Fragen erreicht und die andere nicht, waere schlimmer als keins:
# Die Oberflaeche saehe halb ueberarbeitet aus, und niemand wuesste, welche
# Haelfte welche ist.

def s01_neu():
    """
    S01 als sechs Wichtigkeiten - aus Abschnitt 2 des Sprachreviews.

    -----------------------------------------------------------------------
    WARUM S01 NICHT UMFORMULIERT, SONDERN ERSETZT WIRD
    -----------------------------------------------------------------------

    Die alte S01 war eine Mehrfachauswahl. Eine NICHT getroffene Wahl laesst
    drei Dinge offen: Das Ziel ist unwichtig, es ist wichtig aber nicht das
    wichtigste, oder es fiel nur einem noch wichtigeren zum Opfer. Fuer ein
    Bild ueber die Richtung eines Vorhabens ist das zu grob - und aus einer
    Mehrfachauswahl eine Abstufung zu RECHNEN waere eine erfundene.
    """
    text = io.open(REVIEW, encoding="utf-8").read()
    teil = text[text.index("# 2. Entscheidung zu S01"):text.index("# 3. Globale Entscheidung")]

    gemeinsam = _zitate(teil[teil.index("### Gemeinsame Frage"):teil.index("### S01a")])[0]
    skala = _nummern_nach(teil, "Antwortskala für alle sechs Items:")
    top_frage = _zitate(teil[teil.index("## 2.3"):])[0]

    # Die Ueberschrift traegt den kurzen Namen: "### S01a — Wirtschaftliche
    # Tragfaehigkeit". Ein Bild braucht ihn - der ganze Satz passt in keine
    # Zeile, und ihn selbst zu erfinden hiesse, das Ziel umzubenennen.
    ziele = []
    for kennung in ["S01a", "S01b", "S01c", "S01d", "S01e", "S01f"]:
        block = teil[teil.index(f"### {kennung}"):]
        # `block` beginnt bei "### S01a", die erste Zeile traegt also noch
        # die Marken der Ueberschrift.
        kopf = block.split("\n", 1)[0].lstrip("# ").strip()
        kurz = re.sub(r"^S01[a-f]\s*[—–-]\s*", "", kopf).strip()
        ziele.append((kennung, _zitate(block)[0], kurz))

    return gemeinsam, skala, top_frage, ziele


REVIEW_ITEMS = sprachreview()
UX_ITEMS = ux_review()
UX2_ITEMS = ux_review_2()

_unbekannt = sorted(k for k in REVIEW_ITEMS if k not in items and not k.startswith("S01"))
if _unbekannt:
    raise SystemExit(f"Sprachreview nennt Fragen, die es nicht gibt: {_unbekannt}")

_ohne_review = sorted(k for k in items if k not in REVIEW_ITEMS)
if _ohne_review:
    raise SystemExit(f"Diese Fragen stehen nicht im Sprachreview: {_ohne_review}")

# ---------------------------------------------------------------------------
# NACHTRAG AUS DEM GUTACHTERINNENREVIEW DER VERHALTENSITEMS
# ---------------------------------------------------------------------------
#
# Abschnitt 7 des Reviews vom 29.09.2026: T01 soll ausschliesslich den
# ZEITPUNKT des ersten Ansprechens messen. Die vierte Antwort nannte bisher
# ein Motiv ("spaeter, wenn ich meine Sicht weiter sortiert habe") - und ein
# Motiv gehoert inhaltlich zu T02, wo nach dem Vorgehen bei unklaren Bedenken
# gefragt wird.
#
# NUR DIE BESCHRIFTUNG, NICHT DIE STELLE. Die Antwort bleibt die vierte und
# behaelt ihre Kennung `T01_o4`. Gespeicherte Antworten zeigen auf die Stelle,
# nicht auf den Text - haetten wir sie verschoben oder gestrichen, zeigten sie
# danach auf etwas anderes.
NACHTRAG_REVIEW = {
    "T01": {
        "options": {
            3: "nach mehr als einem Arbeitstag",  # vierte Antwort, Index 3
        },
    },
}

for item_id, review in REVIEW_ITEMS.items():
    if item_id not in items:
        continue
    it = items[item_id]

    # "Antworten unveraendert" ist eine Zusage des Dokuments. Stimmt sie nicht,
    # hat sich eine Seite bewegt, ohne es der anderen zu sagen - und
    # gespeicherte Antworten zeigen auf die Stelle, nicht auf den Text.
    if review.get("unchanged") and review["unchanged"] != it["options"]:
        raise SystemExit(
            f"{item_id}: 'Antworten unveraendert' stimmt nicht mit der Quelle ueberein\n"
            f"  Quelle:   {it['options']}\n"
            f"  Review:   {review['unchanged']}"
        )

    if review.get("options"):
        if len(review["options"]) != len(it["options"]):
            raise SystemExit(
                f"{item_id}: das Review aendert die ANZAHL der Antworten "
                f"({len(it['options'])} -> {len(review['options'])}). "
                "Reihenfolge und Anzahl muessen bleiben."
            )
        it["options"] = review["options"]

    nachtrag = NACHTRAG_REVIEW.get(item_id)
    if nachtrag:
        for stelle, beschriftung in nachtrag.get("options", {}).items():
            if stelle >= len(it["options"]):
                raise SystemExit(f"{item_id}: Nachtrag zeigt auf Antwort {stelle + 1}, die es nicht gibt")
            it["options"][stelle] = beschriftung

    if review.get("prompt"):
        it["prompt"] = review["prompt"]
    if review.get("hint"):
        it["hint"] = review["hint"]

    if review.get("missing"):
        labels = review.get("missingLabels")
        if labels and len(labels) != len(review["missing"]):
            raise SystemExit(
                f"{item_id}: {len(review['missing'])} Auslassungsgruende, "
                f"aber {len(labels)} Beschriftungen"
            )
        it["missing"] = [
            {
                "code": code,
                "label": labels[i] if labels else MISSING_LABEL[code],
            }
            for i, code in enumerate(review["missing"])
        ]

# ---------------------------------------------------------------------------
# S01: die alte Frage bleibt stehen, die neuen treten daneben
# ---------------------------------------------------------------------------
#
# DIE ALTE WIRD NICHT GELOESCHT. An ihr koennen Antworten haengen, und eine
# Kennung zu streichen, auf die gespeicherte Zeilen zeigen, macht sie
# unlesbar. Sie wird nur nicht mehr vorgelegt: `retired` heisst "im Bericht
# ja, im Fragebogen nein".
#
# Umrechnen waere die dritte Moeglichkeit und die schlechteste: Aus "genannt
# oder nicht" eine Stufe zwischen eins und fuenf zu machen, hiesse sich eine
# Wichtigkeit auszudenken, die niemand angegeben hat.

_gemeinsam, _skala, _top_frage, _ziele = s01_neu()

items["S01"]["retired"] = True

_s01_neu = []
for kennung, ziel, kurz in _ziele:
    _s01_neu.append((kennung, collections.OrderedDict([
        ("itemId", kennung),
        ("section", items["S01"]["section"]),
        ("groupPrompt", _gemeinsam),
        ("shortLabel", kurz),
        ("prompt", ziel),
        ("hint", None),
        ("options", list(_skala)),
        ("missing", [{"code": "not_decided", "label": MISSING_LABEL["not_decided"]}]),
        ("note", "Wichtigkeit EINES Ziels. Die sechs werden nie zu einem Wert verrechnet - sie sind nebeneinander wichtig, nicht gegeneinander."),
        ("concerns", None), ("paths", None), ("followUp", None),
    ])))

_s01_neu.append(("S01_top", collections.OrderedDict([
    ("itemId", "S01_top"),
    ("section", items["S01"]["section"]),
    ("groupPrompt", None),
    ("prompt", _top_frage),
    ("hint", None),
    ("options", [ziel for _, ziel, _kurz in _ziele]),
    ("missing", [{"code": "not_decided", "label": MISSING_LABEL["not_decided"]}]),
    ("note", "Welche ein oder zwei Ziele aktuell vorgehen. Die Zahl der Haken ist keine Auskunft - hoechstens zwei sind erlaubt, weniger ist kein Mangel."),
    ("maxChoices", 2),
    ("concerns", None), ("paths", None), ("followUp", None),
])))

for kennung, eintrag in _s01_neu:
    items[kennung] = eintrag
    reihenfolge.insert(reihenfolge.index("S01") + len([k for k, _ in _s01_neu[:_s01_neu.index((kennung, eintrag))]]) + 1, kennung)

# Das UX-Review zuletzt - es liegt ueber allem anderen.
_profil = {i for i in items if i in UX_ITEMS}
_fehlend = sorted(
    k for k in items
    if k[0] in SCOPES["founder_profile"]["letters"] and k not in UX_ITEMS
)
if _fehlend:
    raise SystemExit(f"Diese Fragen des Arbeitsprofils fehlen im UX-Review: {_fehlend}")

for item_id, ux in UX_ITEMS.items():
    if item_id not in items:
        raise SystemExit(f"Das UX-Review nennt {item_id} - die Frage gibt es nicht")
    if ux.get("prompt"):
        items[item_id]["prompt"] = ux["prompt"]
    if ux.get("hint"):
        items[item_id]["hint"] = ux["hint"]

# Teil 2 zuletzt - er gilt fuer das Venture-Alignment.
for item_id, ux in UX2_ITEMS.items():
    if item_id not in items:
        raise SystemExit(f"Das UX-Review Teil 2 nennt {item_id} - die Frage gibt es nicht")
    it = items[item_id]
    if ux.get("options"):
        if len(ux["options"]) != len(it["options"]):
            raise SystemExit(
                f"{item_id}: Teil 2 aendert die ANZAHL der Antworten "
                f"({len(it['options'])} -> {len(ux['options'])}). "
                "Reihenfolge und Anzahl muessen bleiben - gespeicherte Antworten "
                "zeigen auf die Stelle und nicht auf den Text."
            )
        it["options"] = ux["options"]
    if ux.get("prompt"):
        it["prompt"] = ux["prompt"]
    if ux.get("hint"):
        it["hint"] = ux["hint"]

for n, item_id in enumerate(reihenfolge, start=1):
    it = items[item_id]
    fmt = format_von(item_id)

    optionen = [
        collections.OrderedDict([
            ("optionId", f"{item_id}_o{i}"),
            ("label", label),
            ("requiresText", (item_id, label) in BRAUCHT_TEXTFELD),
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
    if item_id in EINHEIT:
        eintrag["unit"] = EINHEIT[item_id]
    if item_id in BEDINGUNGSHINWEIS:
        eintrag["conditionHint"] = BEDINGUNGSHINWEIS[item_id]
    if it.get("groupPrompt"):
        eintrag["groupPrompt"] = it["groupPrompt"]
    if it.get("shortLabel"):
        eintrag["shortLabel"] = it["shortLabel"]
    if it.get("maxChoices"):
        eintrag["maxChoices"] = it["maxChoices"]
    if it.get("retired"):
        eintrag["retired"] = True
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

for scope, meta in SCOPES.items():
    teil = [i for i in ausgabe if i["itemId"][0] in meta["letters"]]
    # Reihenfolge innerhalb der Fassung neu vergeben - sonst beginnt
    # Venture-Alignment bei 24.
    for n, eintrag in enumerate(teil, start=1):
        eintrag["order"] = n

    doc = collections.OrderedDict([
        ("instrumentId", meta["id"]),
        ("scope", scope),
        ("label", meta["label"]),
        ("registryVersion", "1.0.0"),
        ("status", "draft"),
        ("createdAt", "2026-09-29"),
        ("source", SRC),
        ("editorialSource", REVIEW),
        ("uxSource", UX_REVIEW if scope == "founder_profile" else UX_REVIEW_2),
        ("validity", meta["validity"]),
        ("overallScore", False),
        ("dimensionScores", False),
        ("deviationsFromSource", [
            collections.OrderedDict([
                ("what", "Jedes Item ohne eigenen Auslassungsgrund bekommt 'kann ich noch nicht einschätzen'. Spezifische Gruende haben Vorrang."),
                ("source", "Master-Arbeitsfassung v0.2, Abschnitt 4: dort nur die fuenf Stufen"),
                ("reason", "Ohne Ausweg muss jemand eine Stufe ankreuzen, die er nicht meint. Genau daran ist v1 gescheitert: 'nicht beantwortet' war ein Zustand ohne Aussage, und die Auswertung hat geraten."),
                ("decidedBy", "Gutachterin, 29.09.2026 - ausdruecklich bestaetigt. Vorrangregel: not_decided, not_clarified, prefer_not_to_say und confidential_first gehen cannot_assess vor."),
            ]),
            collections.OrderedDict([
                ("what", "Venture-Alignment: Wortlaute, Hinweise und Antwortbeschriftungen aus dem UX-Review Teil 2 v0.1."),
                ("source", UX_REVIEW_2),
                ("reason", "Wo ein Konstrukt ueber abstrakte Begriffe wie 'Selbststaendigkeit' erfasst wird, sollen die Antworten zeigen, wie das im Alltag aussieht - 'sehr wenig selbststaendig' zwingt jeden, das erst zu uebersetzen. Die Reihenfolge bleibt von wenig zu viel eigenem Spielraum, die Anzahl bleibt, die Kennungen bleiben."),
                ("decidedBy", "Maria, 30.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "Arbeitsprofil: Wortlaute und Hinweise aus dem UX-Review v0.2 (liegt ueber dem Sprachreview)."),
                ("source", UX_REVIEW),
                ("reason", "Am Stueck gelesen klangen die Fragen nach Fragebogen: dreimal 'wie haeufig', dreimal derselbe Satzbau. Das Review kuerzt und variiert, ohne das Konstrukt zu verschieben. Bei X01 bis X04 faellt der Fragekopf weg, weil er einmal ueber dem Block steht - sonst stuende viermal 'Wie wohl fuehlst du dich, wenn ...' untereinander."),
                ("decidedBy", "Maria, 30.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "Wortlaut, Hinweise und Auslassungsgruende je Item aus dem Sprachreview v0.1."),
                ("source", REVIEW),
                ("reason", "Die Master-Fassung sagt, WAS gefragt wird; das Review sagt, WIE es dasteht - Kleinschreibung von 'du', Bedingungssaetze als eigene Saetze, echte Fragesaetze bei W02 bis W06. Anzahl und Reihenfolge der Antworten bleiben, sonst zeigten gespeicherte Antworten auf etwas anderes."),
                ("decidedBy", "Maria, 29.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "T01: die vierte Antwort heisst 'nach mehr als einem Arbeitstag' statt 'spaeter, wenn ich meine Sicht weiter sortiert habe'."),
                ("source", "Gutachterinnenreview der Verhaltensitems v0.1, Abschnitt 7"),
                ("reason", "T01 soll ausschliesslich den ZEITPUNKT des ersten Ansprechens messen. Ein Motiv gehoert inhaltlich zu T02. Nur die Beschriftung aendert sich - die Antwort bleibt die vierte und behaelt ihre Kennung, sonst zeigten gespeicherte Antworten danach auf etwas anderes."),
                ("decidedBy", "Gutachterin, 29.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "S01 ist zurueckgezogen und durch S01a bis S01f plus S01_top ersetzt."),
                ("source", REVIEW + ", Abschnitt 2"),
                ("reason", "Die alte S01 war eine Mehrfachauswahl. Eine NICHT getroffene Wahl laesst drei Dinge offen: unwichtig, wichtig aber nicht das wichtigste, oder nur einem noch wichtigeren zum Opfer gefallen. Fuer ein Bild ueber die Richtung eines Vorhabens ist das zu grob - und aus einer Mehrfachauswahl eine Abstufung zu RECHNEN waere eine erfundene. Die alte Frage bleibt in der Registratur, damit gespeicherte Antworten lesbar bleiben, wird aber nicht mehr vorgelegt und nicht umgerechnet."),
                ("decidedBy", "Maria, 29.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "Auslassungsgruende heissen not_decided, not_clarified und prefer_not_to_say."),
                ("source", REVIEW + ", Abschnitt 3"),
                ("reason", "Bisher hiessen sie undecided und withheld, und 'haben wir noch nicht geklaert' war kein eigener Code, sondern ein Sonderfall von undecided. Zwei Vokabulare nebeneinander waeren eine zweite Wahrheit; 'technical' bleibt zusaetzlich, weil ein technischer Fehlschlag keine Auskunft der Person ist."),
                ("decidedBy", "Maria, 29.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "Markdown-Maskierung entfernt: '\\[Name\\]' wird '[Name]'."),
                ("source", "Master-Arbeitsfassung v0.2, R02"),
                ("reason", "Der Backslash ist Schreibweise des Dokuments, nicht Teil der Frage. React setzt Text so, wie er dasteht - bis zum 29.09.2026 war er auf dem Bildschirm zu sehen. '[Name]' bleibt als Platzhalter und wird beim Anzeigen durch den Namen ersetzt."),
                ("decidedBy", "Claude, 29.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "Redaktionsmarke '[nur wenn relevant]' aus L02 und L03 gestrichen."),
                ("source", "Master-Arbeitsfassung v0.2, L02/L03"),
                ("reason", "Eine Anweisung an die Redaktion, keine Frage an einen Menschen. Die Bedingung steht als showAfter='L01' in der Registratur und WIRKT dort, statt danebenzustehen."),
                ("decidedBy", "Claude, 29.09.2026"),
            ]),
            collections.OrderedDict([
                ("what", "R12: die Antwort 'Datum' heisst 'an einem bestimmten Datum - bitte angeben'."),
                ("source", "Master-Arbeitsfassung v0.2, R12"),
                ("reason", "'Datum' ist keine Antwort, sondern die Form einer Antwort. Als Beschriftung auf einem Knopf waere es sinnlos: Niemand waehlt 'Datum', man waehlt EIN Datum."),
                ("decidedBy", "Claude, 29.09.2026"),
            ]),
        ]),
        ("notes", [
            "Erzeugt aus der Master-Arbeitsfassung v0.2. Die Zuordnungen, die sich aus dem Fliesstext nicht eindeutig lesen lassen, stehen ausdruecklich im Generator.",
            "KEIN GESAMTWERT UND KEINE DIMENSIONSWERTE. Die Quelle sagt es selbst (Abschnitt 8.1).",
            "A und I werden niemals zu einem Analytisch-gegen-Intuitiv-Wert verschmolzen. Beide koennen gleichzeitig hoch sein.",
        ]),
        ("sections", list(dict.fromkeys(i["section"] for i in teil if i["section"]))),
        ("items", teil),
    ])
    io.open(meta["out"], "w", encoding="utf-8").write(
        json.dumps(doc, ensure_ascii=False, indent=2) + "\n")

    from collections import Counter
    print(f'{meta["id"]}: {len(teil)} Items, {len(doc["sections"])} Abschnitte,',
          dict(Counter(i["answerFormat"] for i in teil)))
