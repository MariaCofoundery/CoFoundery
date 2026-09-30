# -*- coding: utf-8 -*-
"""Die Bildschirme beider Boegen - aus den UX-Reviews erzeugt.

---------------------------------------------------------------------------
WARUM EINE EIGENE DATEI UND NICHT DIE REGISTRATUR
---------------------------------------------------------------------------

Die Registratur beschreibt das INSTRUMENT: welche Frage, welche Antworten, was
gemessen wird. Wie viele Bildschirme daraus werden und was dazwischen steht,
ist eine Frage der Oberflaeche - sie kann sich aendern, ohne dass sich am
Instrument etwas aendert, und sie muss sich aendern koennen, ohne dass jemand
die Registratur anfasst.

---------------------------------------------------------------------------
UND WARUM EIN GENERATOR FUER BEIDE BOEGEN
---------------------------------------------------------------------------

Die beiden UX-Reviews sind unterschiedlich geschrieben - Teil 1 setzt die
Uebergaenge fett, Teil 2 als Zitat; Teil 1 nennt seine Einheiten "Screen",
Teil 2 "Abschnitt". Das sind Schreibweisen, keine verschiedenen Sachen. Zwei
Generatoren waeren zwei Parser, und zwei Parser laufen nach dem ersten
Unterschied auseinander - lautlos, weil beide richtig aussehen.

    npm run build:screens
"""
import collections
import io
import json
import re

# ---------------------------------------------------------------------------
# WAS AUS WELCHEM DOKUMENT WIRD
# ---------------------------------------------------------------------------
#
# `ctaBusy` steht in keinem Dokument: Die Reviews beschreiben die Beschriftung
# des Knopfes, nicht die Beschriftung waehrend des Wartens. Sie steht hier und
# nicht im Bauteil, damit sie beim Knopf steht, zu dem sie gehoert.
BOEGEN = [
    collections.OrderedDict([
        ("id", "align-screens-profile-v0-2"),
        ("scope", "founder_profile"),
        ("src", "docs/ALIGN_UX_QA_Teil1_Founderprofil_v0.2.md"),
        ("out", "web/docs/align-screens-profile-v0-2.json"),
        ("registry", "web/docs/founder-profile-registry-v1.json"),
        ("createdAt", "2026-09-30"),
        ("kopf", r"^\d+\.\s+Screen\s+(\S+)\s+—\s+(.+)$"),
        ("erwartet", 7),
        # Teil 1 stellt seine Uebergaenge fett, Teil 2 als Zitat.
        ("marke_uebergang", "Übergang:"),
        ("intro_von", "## 2. Startseite / Intro"),
        ("intro_bis", "### Wichtig"),
        # Teil 1 schreibt die Einleitung als Fliesstext, Teil 2 als Zitat.
        ("intro_als_zitat", False),
        ("marke_intro_knopf", "Button:"),
        # In Teil 1 gilt die gemeinsame Frage fuer den ganzen Bildschirm: dort
        # stehen drei Situationen unter einer Skala. Siehe `gruppenfrage`.
        ("gruppenfrage_je_schirm", True),
        ("abschluss_von", "## 13. Abschluss / Submit Copy"),
        ("marke_abschluss_knopf", "Button:"),
        ("marke_abschluss_subline", "Kleine Zusatzzeile:"),
        ("ctaBusy", "Profil wird erstellt …"),
    ]),
    collections.OrderedDict([
        ("id", "align-screens-venture-v0-1"),
        ("scope", "venture_alignment"),
        ("src", "docs/ALIGN_UX_QA_Teil2_Was_du_aufbauen_willst_v0.1.md"),
        ("out", "web/docs/align-screens-venture-v0-1.json"),
        ("registry", "web/docs/venture-alignment-registry-v1.json"),
        ("createdAt", "2026-09-30"),
        ("kopf", r"^\d+\.\s+Abschnitt\s+(\S+)\s+—\s+(.+)$"),
        ("erwartet", 9),
        ("marke_uebergang", "Übergang:"),
        ("intro_von", "### Was du aufbauen willst"),
        ("intro_bis", "### Wie heißt dein Vorhaben?"),
        ("intro_als_zitat", True),
        ("marke_intro_knopf", "Buttons:"),
        # AUSDRUECKLICH NICHT JE ABSCHNITT. In Teil 2 steht die gemeinsame
        # Frage nur ueber S01a bis S01f - im selben Abschnitt stehen danach
        # S02 bis S06, fuer die sie nicht gilt. Sie haengt deshalb an den
        # Items in der Registratur und nicht am Abschnitt.
        ("gruppenfrage_je_schirm", False),
        ("abschluss_von", "## 13. Abschluss"),
        ("marke_abschluss_knopf", "Button bevorzugt:"),
        ("marke_abschluss_subline", "Subline:"),
        ("ctaBusy", "Auswertung wird erstellt …"),
        # NEUN UND NICHT ACHT.
        #
        # Das Review nennt als Beispiel "Schritt 2 von 8" und zaehlt seine
        # Abschnitte 1, 1b, 2 bis 8 - das sind acht Nummern und neun
        # Abschnitte. Der zweite hat einen eigenen Uebergang, eine eigene
        # Ueberschrift und eigene Fragen; er ist ein Schritt.
        #
        # Die Zahl muss zaehlen, was dasteht. Genau der Widerspruch, den
        # Abschnitt 14 des Reviews abschafft - "42 Fragen" neben "0 von 39
        # beantwortet" -, entstuende sonst neu: "Schritt 9 von 8".
        ("note_extra", "Neun Schritte, obwohl das Review als Beispiel 'Schritt 2 von 8' nennt: Es zaehlt die Abschnitte 1, 1b, 2 bis 8 - acht Nummern, neun Abschnitte. Der Abschnitt 1b hat einen eigenen Uebergang, eine eigene Ueberschrift und eigene Fragen. Eine Anzeige 'Schritt 9 von 8' waere genau der Widerspruch, den Abschnitt 14 des Reviews abschafft."),
    ]),
]


# ---------------------------------------------------------------------------
# LESEN
# ---------------------------------------------------------------------------
def _erste_zeile_nach(block, marke, muster):
    """Die erste Zeile nach einer Marke, die zum Muster passt."""
    i = block.find(marke)
    if i < 0:
        return None
    for zeile in block[i + len(marke):].split("\n"):
        z = zeile.strip()
        if not z:
            continue
        treffer = re.match(muster, z)
        if treffer:
            # Fettdruck ist Auszeichnung im Dokument, keine Auszeichnung auf
            # dem Bildschirm - dort entscheidet die Gestaltung. Sonst stehen
            # die Sternchen im Uebergang, und zwar sichtbar.
            return treffer.group(1).replace("**", "").strip()
        # Eine andere Ueberschrift heisst: hier ist der Abschnitt zu Ende, und
        # was danach kommt, gehoert nicht mehr zu dieser Marke.
        if z.startswith("#"):
            break
    return None


def text_nach(block, marke):
    """Der Text nach einer Marke - fett gesetzt oder als Zitat.

    Teil 1 setzt seine Uebergaenge fett, Teil 2 schreibt sie als Zitat. Das
    ist Schreibweise des Dokuments und kein Unterschied in der Sache.
    """
    for muster in (r"^\*\*(.+?)\*\*\s*$", r"^>\s*(.+)$"):
        gefunden = _erste_zeile_nach(block, marke, muster)
        if gefunden:
            return gefunden
    return None


def zitat_nach(block, marke):
    return _erste_zeile_nach(block, marke, r"^>\s*(.+)$")


def code_nach(block, marke):
    """Die erste Zeile im Codeblock nach einer Marke - oder in Backticks."""
    i = block.find(marke)
    if i < 0:
        return None
    rest = block[i + len(marke):]
    treffer = re.search(r"```(?:text)?\n(.+?)\n", rest)
    if treffer:
        return treffer.group(1).strip()
    treffer = re.search(r"`([^`\n]+)`", rest)
    return treffer.group(1).strip() if treffer else None


def codes_nach(block, marke):
    """Alle Zeilen im Codeblock nach einer Marke."""
    i = block.find(marke)
    if i < 0:
        return []
    treffer = re.search(r"```(?:text)?\n(.*?)```", block[i + len(marke):], flags=re.S)
    if not treffer:
        einzeln = code_nach(block, marke)
        return [einzeln] if einzeln else []
    return [z.strip() for z in treffer.group(1).split("\n") if z.strip()]


# Zeilen, die im Dokument die STRUKTUR beschreiben und nicht zum Text gehoeren.
MARKEN = ("Button:", "Buttons:", "Übergang:", "Subline:", "Hinweis:",
          "Gemeinsame Frage:", "Placeholder:", "Nicht mehr user-facing anzeigen:")


def absaetze(block, als_zitat):
    """Die Fliesstext-Absaetze eines Abschnitts, ohne Ueberschriften und Marken."""
    if als_zitat:
        # Jede Zitatzeile ist ein Absatz; die leeren ">" dazwischen trennen nur.
        return [z.strip()[1:].strip() for z in block.split("\n")
                if z.strip().startswith(">") and z.strip()[1:].strip()]

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


# ---------------------------------------------------------------------------
# FRAGEN AUS DEN UEBERSCHRIFTEN
# ---------------------------------------------------------------------------
KENNUNG = r"[A-Z]\d{2}[a-z]?(?:_[a-z]+)?"


def kennungen_aus(ueberschrift):
    """Welche Fragen eine `###`-Ueberschrift benennt.

    Die Dokumente schreiben sie in vier Formen: `A01`, `U01 — Vorgehen ...`,
    `S01_top` und als Bereich `S01a–S01f`. Der Bereich wird aufgezaehlt, weil
    auf dem Bildschirm sechs Fragen stehen und nicht eine.
    """
    kopf = ueberschrift.strip()
    if kopf.startswith("OFFEN"):
        return []

    bereich = re.match(rf"^({KENNUNG})\s*[–—-]\s*({KENNUNG})\b", kopf)
    if bereich:
        von, bis = bereich.group(1), bereich.group(2)
        # S01a–S01f: gleiche Nummer, laufender Buchstabe.
        a = re.match(r"^([A-Z]\d{2})([a-z])$", von)
        b = re.match(r"^([A-Z]\d{2})([a-z])$", bis)
        if a and b and a.group(1) == b.group(1):
            return [a.group(1) + chr(c)
                    for c in range(ord(a.group(2)), ord(b.group(2)) + 1)]
        # W01–W06: gleicher Buchstabe, laufende Nummer.
        a = re.match(r"^([A-Z])(\d{2})$", von)
        b = re.match(r"^([A-Z])(\d{2})$", bis)
        if a and b and a.group(1) == b.group(1):
            return [f"{a.group(1)}{n:02d}"
                    for n in range(int(a.group(2)), int(b.group(2)) + 1)]
        raise SystemExit(f"Bereich nicht lesbar: {kopf!r}")

    einzeln = re.match(rf"^({KENNUNG})\b", kopf)
    return [einzeln.group(1)] if einzeln else []


def bauen(bogen):
    text = io.open(bogen["src"], encoding="utf-8").read()
    registratur = json.load(io.open(bogen["registry"], encoding="utf-8"))
    aktiv = collections.OrderedDict(
        (i["itemId"], i) for i in registratur["items"] if not i.get("retired"))

    # --- Die Bildschirme --------------------------------------------------
    schirme, uebrige_ueberschriften = [], []
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        kopf = block.split("\n", 1)[0]
        treffer = re.match(bogen["kopf"], kopf.strip())
        if not treffer:
            continue

        fragen, unbekannt = [], []
        for ueberschrift in re.findall(r"^### (.+)$", block, flags=re.M):
            gefunden = kennungen_aus(ueberschrift)
            if gefunden:
                fragen.extend(gefunden)
            elif not ueberschrift.strip().startswith("OFFEN"):
                unbekannt.append(ueberschrift.strip())
        uebrige_ueberschriften.extend(unbekannt)

        # Die Zeile "Interne Items: ..." ist die Absicht des Dokuments. Sie
        # taugt nicht als Quelle - in Teil 2 nennt Abschnitt 1 auch die
        # K-Fragen, die eigenen Abschnitt 1b haben -, aber als Gegenprobe:
        # Was in keiner Aufzaehlung steht, ist ein Tippfehler.
        genannt = re.search(r"^Interne Items:\s*(.+)$", block, flags=re.M)
        if genannt:
            erlaubt = set()
            for stueck in re.split(r"[,\s]+", genannt.group(1)):
                erlaubt.update(kennungen_aus(stueck.strip()))
            fremd = [k for k in fragen if k not in erlaubt]
            if fremd:
                raise SystemExit(
                    f"{kopf.strip()}: {fremd} stehen als Ueberschrift, "
                    f"aber nicht in 'Interne Items'")

        schirme.append(collections.OrderedDict([
            ("step", len(schirme) + 1),
            # Die Nummer, unter der das Dokument den Abschnitt fuehrt - in
            # Teil 2 heisst einer davon "1b". Sie steht nicht auf dem
            # Bildschirm; sie macht nachvollziehbar, woher er kommt.
            ("label", treffer.group(1).strip()),
            ("title", treffer.group(2).strip()),
            ("transition", text_nach(block, bogen["marke_uebergang"])),
            ("subline", zitat_nach(block, "Subline:")),
            ("groupPrompt", text_nach(block, "Gemeinsame Frage:")
             if bogen["gruppenfrage_je_schirm"] else None),
            ("items", fragen),
        ]))

    if len(schirme) != bogen["erwartet"]:
        raise SystemExit(
            f'{bogen["id"]}: erwartet werden {bogen["erwartet"]} Bildschirme, '
            f"gefunden: {len(schirme)}")

    # --- Die gemeinsame Frage, die das Dokument nicht wiederholt -----------
    #
    # Teil 1 sagt zu Bildschirm 7 nur "Gemeinsame Skala wie Screen 6". X03 und
    # X04 sind aber wie X01 und X02 als SITUATIONEN formuliert, ohne Frage -
    # ohne den gemeinsamen Kopf stuenden dort zwei Aussagen mit Knoepfen
    # darunter und keine Frage. Das ist abgeleitet und nicht abgeschrieben,
    # deshalb steht es hier.
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

    # --- Anschlussfragen erben den Abschnitt ihrer Grundfrage -------------
    #
    # R05 haengt an R04, L02 und L03 haengen an L01. Die Dokumente fuehren sie
    # nicht als eigenen Punkt auf - L02/L03 stehen in Teil 2 sogar unter
    # "OFFEN", weil beim Durchklicken nach L01 Schluss war. Sie sind aber in
    # der Registratur vorgesehen und erscheinen, sobald die Grundfrage
    # ausgefuellt ist. Wo sie erscheinen, ist damit entschieden und nicht
    # geraten: dort, wo die Grundfrage steht.
    angehaengt = []
    for kennung, item in aktiv.items():
        grund = item.get("showAfter")
        if not grund:
            continue
        for schirm in schirme:
            if kennung in schirm["items"]:
                break
            if grund in schirm["items"]:
                # DIREKT HINTER DER GRUNDFRAGE. Am Ende des Bildschirms
                # stuende sie hinter Fragen, mit denen sie nichts zu tun hat -
                # und tauchte beim Ausfuellen weit weg von ihrem Anlass auf.
                #
                # Haengen zwei an derselben Grundfrage, behalten sie die
                # Reihenfolge der Registratur: L02 fragt nach dem Erkennen,
                # L03 nach dem Umgang. Andersherum steht die Folge vor dem
                # Anlass.
                stelle = schirm["items"].index(grund) + 1
                while stelle < len(schirm["items"]) and \
                        aktiv.get(schirm["items"][stelle], {}).get("showAfter") == grund:
                    stelle += 1
                schirm["items"].insert(stelle, kennung)
                angehaengt.append(f'{kennung} nach {grund} (Schritt {schirm["step"]})')
                break

    # --- Gegenproben ------------------------------------------------------
    verteilt = [k for s in schirme for k in s["items"]]
    doppelt = [k for k, n in collections.Counter(verteilt).items() if n > 1]
    if doppelt:
        raise SystemExit(f'{bogen["id"]}: {doppelt} stehen auf mehr als einem Schritt')

    fehlt = [k for k in aktiv if k not in verteilt]
    fremd = [k for k in verteilt if k not in aktiv]
    if fehlt or fremd:
        raise SystemExit(
            f'{bogen["id"]}: kein Bildschirm fuer {fehlt}; '
            f"nicht in der Registratur: {fremd}")

    # --- Die Namensfrage --------------------------------------------------
    #
    # Nur Teil 2 hat sie: "Wenn noch kein Name vorhanden ist". Sie steht auf
    # der Startseite und nicht in einem Verwaltungsbereich - der Name ist eine
    # Beschriftung, nach der man einmal fragt, und keine Bedingung: Ohne ihn
    # geht es weiter.
    namensfrage = None
    if bogen["intro_bis"].startswith("### Wie heißt"):
        block = text[text.index(bogen["intro_bis"]):]
        block = block[:block.index("\n## ")]
        knoepfe = codes_nach(block, "Buttons:")
        if len(knoepfe) < 2:
            raise SystemExit(f'{bogen["id"]}: die Namensfrage hat keine zwei Knoepfe')
        namensfrage = collections.OrderedDict([
            ("title", bogen["intro_bis"].lstrip("# ").strip()),
            ("subline", zitat_nach(block, "Subline:")),
            ("placeholder", code_nach(block, "Placeholder:")),
            ("cta", knoepfe[0]),
            ("skip", knoepfe[1]),
        ])

    # --- Die Startseite ---------------------------------------------------
    intro_block = text[text.index(bogen["intro_von"]):text.index(bogen["intro_bis"])]
    # Die dritte Ebene und nicht die zweite: "## 2. Startseite / Intro" ist die
    # Gliederung des Dokuments, die Ueberschrift darunter ist die der Seite.
    intro_titel = re.search(r"^### (.+)$", intro_block, flags=re.M).group(1).strip()
    # DER KNOPF DER NAMENSFRAGE IST DER KNOPF DER STARTSEITE. In Teil 2 steht
    # die Frage nach dem Namen auf der Startseite; ein zweiter Knopf darunter
    # waere eine zweite Entscheidung fuer denselben Schritt.
    knoepfe = codes_nach(intro_block, bogen["marke_intro_knopf"])
    if not knoepfe and namensfrage:
        knoepfe = [namensfrage["cta"]]
    if not knoepfe:
        raise SystemExit(f'{bogen["id"]}: die Startseite hat keinen Knopf')
    intro = collections.OrderedDict([
        ("title", intro_titel),
        ("paragraphs", [a for a in absaetze(intro_block, bogen["intro_als_zitat"])
                        if a != intro_titel]),
        ("cta", knoepfe[0]),
        # AUSDRUECKLICH KEINE ZEITANGABE. Das Review: "Noch keine feste
        # Zeitangabe anzeigen. Die reale Dauer erst im Pretest messen." Eine
        # geratene Zahl waere ein Versprechen, das niemand geprueft hat.
        ("duration", None),
    ])

    # --- Der Abschluss ----------------------------------------------------
    abschluss_block = text[text.index(bogen["abschluss_von"]):]
    abschluss_block = abschluss_block[:abschluss_block.index("\n## ")]
    abschluss_titel = re.search(r"^### (.+)$", abschluss_block, flags=re.M).group(1).strip()
    abschluss_knopf = code_nach(abschluss_block, bogen["marke_abschluss_knopf"])
    if not abschluss_knopf:
        raise SystemExit(f'{bogen["id"]}: der Abschluss hat keinen Knopf')
    abschluss = collections.OrderedDict([
        ("title", abschluss_titel),
        ("text", zitat_nach(abschluss_block, abschluss_titel)),
        ("cta", abschluss_knopf),
        ("ctaBusy", bogen["ctaBusy"]),
        ("subline", zitat_nach(abschluss_block, bogen["marke_abschluss_subline"])),
    ])
    if not abschluss["text"]:
        raise SystemExit(f'{bogen["id"]}: der Abschluss hat keinen Text')

    notes = [
        "Die Reihenfolge und die Zuordnung der Fragen stammen aus dem UX-Review. Die internen Abschnittsnamen erscheinen NICHT in der Oberflaeche - sie bleiben in der Registratur und sind dort weiter die Grundlage der Auswertung.",
        f"{len(schirme)} Schritte statt {len(verteilt)} Fragen. Der Fortschritt heisst 'Schritt 3 von {len(schirme)}' - '{len(schirme)} von {len(verteilt)} Fragen' liest sich wie eine Pruefung.",
    ]
    if geerbt:
        notes.append(
            f'Bildschirm {", ".join(map(str, geerbt))} erbt die gemeinsame Frage vom '
            "vorhergehenden: Das Dokument sagt dort nur 'Gemeinsame Skala wie Screen 6', "
            "die Fragen sind aber ebenfalls als Situationen ohne Frage formuliert.")
    if angehaengt:
        notes.append(
            "Anschlussfragen stehen bei ihrer Grundfrage: " + "; ".join(angehaengt) +
            ". Die Dokumente fuehren sie nicht als eigenen Punkt auf.")
    if bogen.get("note_extra"):
        notes.append(bogen["note_extra"])
    if uebrige_ueberschriften:
        notes.append("Ueberschriften ohne Frage, uebergangen: " +
                     "; ".join(sorted(set(uebrige_ueberschriften))) + ".")

    doc = collections.OrderedDict([
        ("screensId", bogen["id"]),
        ("scope", bogen["scope"]),
        ("source", bogen["src"]),
        ("createdAt", bogen["createdAt"]),
        ("notes", notes),
        ("intro", intro),
        ("nameQuestion", namensfrage),
        ("screens", schirme),
        ("closing", abschluss),
    ])

    io.open(bogen["out"], "w", encoding="utf-8").write(
        json.dumps(doc, ensure_ascii=False, indent=2) + "\n")
    print(f'{bogen["out"]}: {len(schirme)} Bildschirme, {len(verteilt)} Fragen')


for bogen in BOEGEN:
    bauen(bogen)
