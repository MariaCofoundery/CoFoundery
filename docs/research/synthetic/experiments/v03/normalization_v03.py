"""Normalisierung fuer Experiment 3 – zwei vorab festgelegte Varianten.

  N-GENERIC     = generic2 aus v02 (nur generische Regeln, kein Begriffswissen)
  N-DICTIONARY  = eingefrorenes Woerterbuch aus v01 + generic2 (v02-Modus "dict+generic2")

Begriffe, Orte und Ortsplatzhalter kommen unveraendert aus normalization_v02 (importiert, nicht kopiert).
NEU in v03 ist nur eine generische Text-Schicht fuer Titel/Beschreibung (CONNECT):
  - Token wie generic2 (Kleinschreibung, Umlaute, Satzzeichen, CamelCase, einfache Stammform)
  - Gewicht je Token = IDF ueber alle Eintraege des Datensatzes (aus Produktdaten berechnet):
    Woerter, die fast ueberall vorkommen ("suche", "biete", "gespräch"), zaehlen dadurch fast nichts –
    ohne handgepflegte Liste solcher Woerter.
  - Mindestlaenge 3, Funktionswoerter aus generic2 entfernt.
Keine neuen Synonyme, kein LLM, keine Embeddings, keine Web-Recherche.
"""
import math
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "v02")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import normalization_v02 as N2  # noqa: E402  (eingefroren)

MODES = {"N-GENERIC": "generic2", "N-DICTIONARY": "dict+generic2"}
TEXT_MIN_LEN = 3
STEM_MIN = N2.STEM_MIN


def mode(name):
    return MODES[name]


def terms(values, kind, norm):
    return N2.terms(values, kind, MODES[norm])


def same(t1, t2):
    return N2.same(t1, t2)


def place(text, norm):
    return N2.place(text, MODES[norm])


def same_place(p, q):
    return N2.same_place(p, q)


def text_tokens(*texts):
    out = set()
    for t in texts:
        if isinstance(t, (list, tuple)):
            for x in t:
                out |= set(tok for tok in N2.tokens(x) if len(tok) >= TEXT_MIN_LEN)
        elif t:
            out |= set(tok for tok in N2.tokens(t) if len(tok) >= TEXT_MIN_LEN)
    return out


def token_match(a, b):
    """Gleich, oder gemeinsamer Wortstamm >= 6 (wie generic2)."""
    if a == b:
        return True
    n = 0
    for ca, cb in zip(a, b):
        if ca != cb:
            break
        n += 1
    return n >= STEM_MIN


class TextIndex:
    """IDF ueber alle Eintraege (Titel + Beschreibung + Themen). Nur Produktdaten."""

    def __init__(self, listings):
        df = {}
        self.n = 0
        for l in listings:
            self.n += 1
            for tok in text_tokens(l.raw["title"], l.raw["summary"], l.topics_raw):
                df[tok] = df.get(tok, 0) + 1
        self.df = df

    def idf(self, tok):
        return math.log((self.n + 1) / (self.df.get(tok, 0) + 1))

    def overlap(self, need_tokens, have_tokens):
        """IDF-gewichteter Anteil der need_tokens, die in have_tokens vorkommen (0..1)."""
        total = sum(self.idf(t) for t in need_tokens)
        if not total:
            return None
        hit = sum(self.idf(t) for t in need_tokens if any(token_match(t, h) for h in have_tokens))
        return hit / total
