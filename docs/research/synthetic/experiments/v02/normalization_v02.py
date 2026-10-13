"""Normalisierung fuer Experiment 2.

Drei Modi, alle vorab festgelegt:

  dict        – das eingefrorene Woerterbuch aus Experiment 1 (normalization_v01, Stufe "synonym").
                Unveraendert importiert, nicht kopiert.
  generic2    – NEU: nur generische Regeln, KEIN Begriffswissen ueber Branchen/Themen:
                Unicode, CamelCase trennen, Kleinschreibung, Umlaute, Satzzeichen, Stoppwoerter,
                einfache Plural-/Stamm-Regeln, Token-Vergleich (Teilmenge, gemeinsamer Wortstamm >= 6).
                Orte: Zusaetze und generische Ortswoerter entfernen, Token vergleichen,
                generische Platzhalter (DACH, bundesweit, remote ...) erkennen.
  dict+generic2 – erst Woerterbuch; was es nicht kennt, wird mit generic2 verglichen.

Ausdruecklich NICHT enthalten: Synonyme, die auf bekannte synthetische Paare zugeschnitten sind,
LLM, Embeddings, Web-Recherche, Testannotationen. Uebersetzungen (München/Munich, Vertrieb/Sales)
kann generic2 bewusst NICHT – das ist die ehrliche Grenze eines Verfahrens ohne Woerterbuch.
"""
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import normalization_v01 as N1  # noqa: E402  (eingefroren)

MODES = ("dict", "generic2", "dict+generic2")

_UMLAUT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})

# Nur Funktionswoerter. Keine Fachbegriffe.
STOPWORDS = {"und", "and", "or", "oder", "the", "der", "die", "das", "for", "fuer", "in", "im", "of", "von", "mit", "with",
             "to", "zu", "a", "an", "ein", "eine", "fur"}

# Generische Ortsbestandteile (keine Stadtnamen).
LOCATION_NOISE = {"region", "grossraum", "area", "umgebung", "metropolregion", "stadt", "city", "raum", "und", "and",
                  "germany", "deutschland", "de", "austria", "oesterreich", "at", "switzerland", "schweiz", "ch"}
# Generische Platzhalter ohne konkreten Ort.
LOCATION_WILDCARD_TOKENS = {"dach", "deutschland", "germany", "bundesweit", "remote", "ueberall", "anywhere", "europe",
                            "europa", "weltweit", "worldwide", "online", "de"}

STEM_MIN = 6


def _camel_split(text):
    # "HealthTech" -> "Health Tech", "B2BSaaS" bleibt grob erhalten
    return re.sub(r"(?<=[a-zäöü])(?=[A-ZÄÖÜ])", " ", text)


def _stem(tok):
    for suf in ("ies", "es", "s", "en", "e", "n"):
        if len(tok) - len(suf) >= 4 and tok.endswith(suf):
            if suf == "ies":
                return tok[:-3] + "y"
            if suf == "s" and tok.endswith(("ss", "us", "is")):
                return tok
            return tok[: -len(suf)]
    return tok


def tokens(text):
    s = unicodedata.normalize("NFKC", _camel_split(text or "")).lower().translate(_UMLAUT)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return tuple(_stem(t) for t in s.split() if t not in STOPWORDS)


def tokens_match(x, y):
    """Generischer Vergleich zweier Token-Tupel."""
    if not x or not y:
        return False
    if x == y:
        return True
    sx, sy = set(x), set(y)
    small, big = (sx, sy) if len(sx) <= len(sy) else (sy, sx)
    if small <= big and any(len(t) >= 3 for t in small):
        return True
    for a in sx:
        for b in sy:
            n = 0
            for ca, cb in zip(a, b):
                if ca != cb:
                    break
                n += 1
            if n >= STEM_MIN:
                return True
    return False


# ---------------------------------------------------------------------------
# Begriffe
# ---------------------------------------------------------------------------
class Term:
    """Ein normalisierter Begriff: entweder ein Woerterbuch-Schluessel oder Token."""
    __slots__ = ("key", "toks")

    def __init__(self, key, toks):
        self.key, self.toks = key, toks


def term(text, kind, mode):
    if mode == "dict":
        return Term(N1.term(text, kind, "synonym"), None)
    if mode == "generic2":
        return Term(None, tokens(text))
    # dict+generic2: Woerterbuch-Schluessel, falls bekannt, UND immer die Token
    k = N1.term(text, kind, "synonym")
    known = k.startswith(("ind:", "top:"))
    return Term(k if known else None, tokens(text))


def same(t1, t2):
    if t1.key is not None and t2.key is not None:
        return t1.key == t2.key          # beide bekannt: das Woerterbuch entscheidet
    if t1.toks is not None and t2.toks is not None:
        return tokens_match(t1.toks, t2.toks)
    return False


def terms(values, kind, mode):
    return [term(v, kind, mode) for v in values or [] if v and v.strip()]


def covered(needles, hay):
    """Anzahl der Begriffe aus needles, die in hay vorkommen."""
    return sum(1 for n in needles if any(same(n, h) for h in hay))


def labels(ts):
    return [t.key if t.key is not None else " ".join(t.toks) for t in ts]


# ---------------------------------------------------------------------------
# Orte
# ---------------------------------------------------------------------------
WILDCARD = "loc:*"

# Region (Bundesland/Land) je Woerterbuch-Ort – Geografie, kein Wissen ueber Testpaare.
REGION_OF = {"loc:berlin": "BE", "loc:munich": "BY", "loc:hamburg": "HH", "loc:cologne": "NW", "loc:ruhr": "NW",
             "loc:frankfurt": "HE", "loc:leipzig": "SN", "loc:stuttgart": "BW", "loc:vienna": "AT", "loc:zurich": "CH"}


class Place:
    __slots__ = ("key", "toks", "wild")

    def __init__(self, key=None, toks=None, wild=False):
        self.key, self.toks, self.wild = key, toks, wild


def place(text, mode):
    """None = keine Angabe. Place(wild=True) = Angabe ohne konkreten Ort."""
    if not text or not text.strip():
        return None
    if mode in ("dict", "dict+generic2"):
        k = N1.location(text, "synonym")
        if k == N1.WILDCARD:
            return Place(wild=True)
        if k.startswith("loc:") or mode == "dict":
            return Place(key=k)
    raw = [t for t in re.split(r"[^a-z0-9]+", unicodedata.normalize("NFKC", text).lower().translate(_UMLAUT)) if t]
    if raw and set(raw) <= LOCATION_WILDCARD_TOKENS:
        return Place(wild=True)
    toks = tuple(t for t in raw if t not in LOCATION_NOISE and len(t) >= 3)
    if not toks:
        return Place(wild=True)
    return Place(toks=toks)


def same_place(p, q):
    """True / False / None (unbekannt). Ein Platzhalter ist KEIN Ort – er erfuellt keinen konkreten Ort."""
    if p is None or q is None:
        return None
    if p.wild and q.wild:
        return None
    if p.wild or q.wild:
        return False
    if p.key is not None and q.key is not None:
        return p.key == q.key
    if p.toks is not None and q.toks is not None:
        return bool(set(p.toks) & set(q.toks))
    return False


def same_region(p, q):
    s = same_place(p, q)
    if s is not False:
        return s
    if p.key in REGION_OF and q.key in REGION_OF:
        return REGION_OF[p.key] == REGION_OF[q.key]
    return False
