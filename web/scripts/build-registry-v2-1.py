"""Erzeugt die Registratur v2.1 aus dem fachlich geprueften Quelldokument.

Vom Projektwurzelverzeichnis aufrufen:  python3 web/scripts/build-registry-v2-1.py

Die Quelle bleibt unangetastet; erzeugt wird nur web/docs/. Was hier an
Zuordnungen steht - welches Item ordinal ist, welche Option alles andere
ausschliesst, welcher Auslassungsgrund wie heisst - stammt aus der fachlichen
Durchsicht und dem Fragebogen, nicht aus einer Vermutung. Der Wächtertest in
src/features/instruments/v21/__tests__ haelt das Ergebnis gegen die Quelle:
Wer hier etwas aendert, ohne dass die Quelle es hergibt, faellt dort auf.
"""

OUT = "web/docs/founder-alignment-registry-v2-1.json"

# -*- coding: utf-8 -*-
"""Die Registratur v2.1 - erzeugt aus der Quelle, nicht abgetippt."""
import io, json, collections, re

src = json.load(io.open("docs/CoFoundery_Align_v2_1_Items.json", encoding="utf-8"))

# Aus dem Fachreview, Abschnitt 4, woertlich: "A01/A02/U04: fuenf ordinale
# Haeufigkeitskategorien", "I01/I03/X01/X06: ebenfalls ordinal", "Fuenf
# Praeferenzstufen in E01" - und dagegen "K01/K02/T03/D01/G01/G02a: Kategorien
# als Handlungs-/Regelwahl speichern".
ORDINAL = {"A01", "A02", "U04", "I01", "I03", "X01", "X06", "E01"}
NOMINAL_EXPLIZIT = {"K01", "K02", "T03", "D01", "G01", "G02a"}

FORMAT = {
  "Einzelauswahl": None,  # wird unten zu ordinal_choice oder single_choice
  "Mehrfachauswahl": "multi_choice",
  "Mehrfachauswahl, danach freiwillige Priorisierung": "multi_choice_priority",
  "Betrag oder geschätzter Bereich mit Währung": "money_range",
  "Stunden pro Woche: Zahl oder geschätzter Bereich": "number_range",
  "Pro Person oder geplanter Rolle: Stunden pro Woche als Zahl oder akzeptabler Bereich": "person_number_range",
  "Mehrere Wochentage mit Uhrzeit von/bis und Zeitzone": "time_windows",
  "Datum": "date",
  "Freitext mit drei kurzen Feldern: Ergebnis / Woran wäre es erkennbar? / Bis wann?": "structured_text",
  "Freitext; weitere Grenzen einzeln ergänzbar": "free_text_repeatable",
  "Freitext je benannter Grenze": "free_text_per_entry",
  "Zwei Wichtigkeitsratings und eine Situationswahl": "value_case",
}

# Die Auslassungsgruende, wie sie im Fragebogen stehen - aus dem Text abgeleitet,
# nicht geraten (siehe Pruefung vom 28.09.2026).
MISSING = {
  "einschaetzen":        [("cannot_assess", "kann ich noch nicht einschätzen")],
  "einschaetzen_privat": [("cannot_assess", "kann ich noch nicht einschätzen"),
                          ("withheld", "möchte ich nicht angeben")],
  "offen":               [("undecided", "habe ich noch nicht entschieden"),
                          ("withheld", "möchte ich nicht angeben")],
  "entscheiden":         [("undecided", "kann ich noch nicht entscheiden")],
  "grenzen":             [("undecided", "dazu habe ich noch keine konkrete Angabe"),
                          ("confidential_first", "möchte ich zunächst vertraulich klären")],
}

# Ausschliessende Optionen - im Fachreview ausdruecklich benannt:
# "B05/G02b: Mehrfachwahl; 'keine zusaetzliche ...' schliesst konkrete
# Anforderungen aus."
EXKLUSIV = {
  "B05": "keine zusätzliche Absicherung",
  "G02b": "ich brauche dafür keine besondere Vorbereitung oder Unterstützung",
}

BRAUCHT_TEXT = re.compile(r"bitte (benennen|beschreiben|formulieren|erläutern|angeben|kurz)")

items, sections = [], []
for order, it in enumerate(src["items"], start=1):
    fmt = FORMAT[it["format"]]
    if fmt is None:
        fmt = "ordinal_choice" if it["id"] in ORDINAL else "single_choice"
    if it["section"] not in sections:
        sections.append(it["section"])

    options = []
    for n, label in enumerate(it.get("options", []), start=1):
        options.append(collections.OrderedDict([
            ("optionId", f'{it["id"]}_o{n}'),
            ("label", label),
            ("requiresText", bool(BRAUCHT_TEXT.search(label))),
            ("exclusive", EXKLUSIV.get(it["id"]) == label),
        ]))

    entry = collections.OrderedDict([
        ("itemId", it["id"]),
        ("order", order),
        ("section", it["section"]),
        ("prompt", it["text"]),
        ("hint", it.get("hint") or None),
        ("answerFormat", fmt),
        ("options", options),
        ("missing", [collections.OrderedDict([("code", c), ("label", l)])
                     for c, l in MISSING[it["missing"]]]),
        ("note", it["note"]),
        ("scoring", it["scoring"]),
    ])
    # Format-eigene Felder, unveraendert aus der Quelle uebernommen
    for extra in ("concerns", "rating_options", "rating_missing", "fields",
                  "conditional_fields", "followup", "repeat_per", "show_when"):
        if extra in it:
            key = "".join(w if i == 0 else w.capitalize()
                          for i, w in enumerate(extra.split("_")))
            entry[key] = it[extra]
    items.append(entry)

doc = collections.OrderedDict([
    ("instrumentId", "founder-alignment-v2-1"),
    ("registryVersion", "2.1.0"),
    ("status", "draft"),
    ("createdAt", "2026-09-28"),
    ("source", "docs/CoFoundery_Align_v2_1_Items.json (v2.1-redaktioneller-Entwurf, "
               "28.09.2026); Einordnungen aus docs/CoFoundery_Align_v2_Fachreview.html"),
    ("administration", src["administration"]),
    ("notes", [
        "KEINE GESAMTZAHL UND KEINE DIMENSIONSWERTE. Die Quelle sagt es selbst: "
        "overall_score false, dimension_scores false.",
        "KEIN REVERSE CODING. Jedes Item der Quelle fuehrt reverse_coding false.",
        "ZWEIERBLOECKE SIND KEINE SUBSKALEN. Ueberschriften sind Gespraechsbereiche, "
        "keine gemessenen Dimensionen - so ausdruecklich im Fachreview.",
        "ORDINAL ODER NOMINAL steht nicht im Format der Quelle, sondern im "
        "Fachreview: A01/A02/U04 und I01/I03/X01/X06 sind ordinal, E01 sind "
        "Praeferenzstufen, K01/K02/T03/D01/G01/G02a sind Handlungs- oder Regelwahl. "
        "Was dort nicht genannt ist, gilt als nominal - das behauptet weniger.",
    ]),
    ("deviationsFromSource", [collections.OrderedDict([
        ("what", "confidential_first als eigener Auslassungsgrund"),
        ("source", "Die Quelle fuehrt vier Codes und ordnet 'moechte ich zunaechst "
                   "vertraulich klaeren' unter 'private' ein."),
        ("reason", "Eine Bitte um ein Gespraech unter vier Augen ist etwas anderes "
                   "als eine Verweigerung: die eine oeffnet eine Tuer, die andere "
                   "schliesst sie. Das Produkt behandelt beide verschieden - der "
                   "Advisor-Zugang und der Report zeigen 'vertraulich klaeren' als "
                   "offenen Punkt, 'moechte ich nicht angeben' nicht."),
        ("decidedBy", "Claude, 28.09.2026 - Maria zur Bestaetigung vorzulegen"),
    ])]),
    ("sections", sections),
    ("missingCodes", [
        collections.OrderedDict([("code", "cannot_assess"), ("note", "Aussage ueber den eigenen Klaerungsstand.")]),
        collections.OrderedDict([("code", "undecided"), ("note", "Noch nicht festgelegt oder im Fall nicht entscheidbar. Die Beschriftung steht am Item.")]),
        collections.OrderedDict([("code", "withheld"), ("note", "Bewusst nicht angegeben. Kein negativer Befund.")]),
        collections.OrderedDict([("code", "confidential_first"), ("note", "Bitte um ein Gespraech unter vier Augen. Eine offene Tuer.")]),
        collections.OrderedDict([("code", "technical"), ("note", "Technisch fehlend. Nie mit den anderen vermischen.")]),
    ]),
    ("items", items),
])

json.dump(doc, io.open(OUT, "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
io.open(OUT, "a", encoding="utf-8").write("\n")

from collections import Counter
print("Items:", len(items))
print("Formate:", dict(Counter(i["answerFormat"] for i in items)))
print("Abschnitte:", len(sections))
print("Optionen gesamt:", sum(len(i["options"]) for i in items),
      "| mit Textfeld:", sum(1 for i in items for o in i["options"] if o["requiresText"]),
      "| ausschliessend:", sum(1 for i in items for o in i["options"] if o["exclusive"]))
