"""SILVER DEVELOPMENT REFERENCE – Laden, Holdout-Sperre, Consensus (Experiment 3).

Die Silver Labels stammen aus zwei getrennten Modell-Review-Paessen (SILVER_R1, SILVER_R2).
Sie sind KEINE unabhaengige menschliche Ground Truth und keine "wahre Founder-Kompatibilitaet".
Bewertet ist nur: Wie sinnvoll ist es aufgrund der verfuegbaren Daten, diesen Kontakt vorzuschlagen?

HOLDOUT-SPERRE
  - Jede Zeile, deren pair_code laut Split-Key im Holdout liegt, wird verworfen, BEVOR eine
    Antwortspalte gelesen wird. Gezaehlt wird nur ihre Anzahl.
  - load_silver(..., unlock_holdout=True) bricht in v03 ab. Holdout bleibt UNOPENED.

CONSENSUS (vorab festgelegt)
  ordinal (1–5):  Mittelwert von R1 und R2 (z. B. 4 und 5 -> 4,5); fehlt eine Seite, gilt die andere
                  (und wird gezaehlt). Adjudizierte Werte ersetzen beide.
  kategorial:     gleich -> dieser Wert; yes/maybe bzw. no/maybe -> maybe; bei Ausschlussfragen gilt
                  "unclear" wie "maybe" (gleich -> unclear, yes/unclear bzw. no/unclear -> unclear);
                  yes/no -> nur mit Adjudication, sonst ausgeschlossen (None).
Confidence-Fragen (find_q5, connect_q4) sind nur deskriptiv – nie Ziel einer Optimierung.
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
V02 = os.path.abspath(os.path.join(HERE, "..", "v02"))

ORDINAL = ["find_q1_gespraech", "find_q2_a_to_b", "find_q3_b_to_a", "find_q5_sicherheit",
           "connect_q1_deckung", "connect_q4_sicherheit"]
CATEGORICAL = ["find_q4_ausschluss", "connect_q2_anzeigen", "connect_q3_ausschluss"]
REASON = {"find_q4_ausschluss": "find_q4_grund", "connect_q3_ausschluss": "connect_q3_grund"}

# Aus build_human_label_sample_v02.py (STRESS_PICK): welcher Angebotseintrag eines Stressfalls in der Stichprobe steht
STRESS_PICK = {"C2": 1, "C4": 0, "C5": 0, "C11": 1, "C10": 0}


class HoldoutLocked(RuntimeError):
    pass


def split_key(path=None):
    path = path or os.path.join(V02, "human_labels_split_key_v02.json")
    return {s["pair_code"]: s for s in json.load(open(path, encoding="utf-8"))["split"]}


def load_silver(path, split, unlock_holdout=False):
    if unlock_holdout:
        raise HoldoutLocked("v03: Holdout ist gesperrt (UNOPENED). --unlock-holdout ist in diesem Experiment nicht erlaubt.")
    rows, dropped = {}, 0
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        code_col = header.index("pair_code")
        for raw in reader:
            if not raw:
                continue
            code = raw[code_col].strip()
            if split.get(code, {}).get("split") != "development":
                dropped += 1                      # Holdout oder unbekannt: Inhalt wird nicht gelesen
                continue
            rows[code] = {h: (v or "").strip() for h, v in zip(header, raw)}
    return rows, dropped


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def consensus(r1, r2, adjudication):
    out, notes = {}, []
    for code in sorted(set(r1) | set(r2)):
        a, b = r1.get(code, {}), r2.get(code, {})
        adj = adjudication.get(code)
        c = {}
        for q in ORDINAL:
            if adj and q in adj:
                c[q] = float(adj[q])
                continue
            x, y = _num(a.get(q)), _num(b.get(q))
            if x is not None and y is not None:
                c[q] = (x + y) / 2
            elif x is not None or y is not None:
                c[q] = x if x is not None else y
                notes.append(f"{code}:{q} nur ein Wert")
        for q in CATEGORICAL:
            if adj and q in adj:
                c[q] = adj[q]
                continue
            x, y = a.get(q) or None, b.get(q) or None
            if x and y:
                if x == y:
                    c[q] = x
                elif {x, y} == {"yes", "no"}:
                    c[q] = None                                       # nur mit Adjudication
                    notes.append(f"{code}:{q} yes/no ohne Adjudication -> ausgeschlossen")
                else:
                    c[q] = "maybe" if q == "connect_q2_anzeigen" else "unclear"
            else:
                c[q] = x or y
        c["kontext"] = (a.get("kontext") or b.get("kontext") or "").upper()
        out[code] = c
    return out, notes


def adjudications(path=None):
    path = path or os.path.join(HERE, "silver_adjudication_v03.json")
    data = json.load(open(path, encoding="utf-8"))
    return {x["pair_code"]: x["values"] for x in data["adjudications"]}


def targets(split, sample_key_path=None, pairs=None, stress=None):
    """pair_code -> {"context", "a","b"} (FIND) bzw. {"seek","offer"} (CONNECT). Nur Development."""
    sample_key = {k["sample_id"]: k for k in json.load(open(sample_key_path or os.path.join(V02, "human_label_sample_key_v02.json"),
                                                         encoding="utf-8"))["key"]}
    by_pair = {p["pair_id"]: p for p in pairs}
    out = {}
    for code, s in split.items():
        if s["split"] != "development":
            continue
        k = sample_key[s["sample_id"]]
        if k.get("pair_id"):
            p = by_pair[k["pair_id"]]
            out[code] = dict(context=p["context"], pair_id=p["pair_id"], a=p["a"], b=p["b"],
                             seek=p.get("a_listing"), offer=p.get("b_listing"))
        else:
            case = next(c for c in stress["cases"] if c["case"] == k["stress_case"])
            offer = list(case["expect"])[STRESS_PICK[k["stress_case"]]]
            out[code] = dict(context="connect", pair_id=None, stress_case=k["stress_case"], seek=case["seek"], offer=offer)
    return out


def holdout_pair_ids(split, sample_key_path=None):
    """Referenzpaare, die als Holdout in der Stichprobe stehen – fuer den Ausschluss aus ALLEN v03-Auswertungen."""
    sample_key = {k["sample_id"]: k for k in json.load(open(sample_key_path or os.path.join(V02, "human_label_sample_key_v02.json"),
                                                         encoding="utf-8"))["key"]}
    ids, cases = set(), set()
    for s in split.values():
        if s["split"] == "holdout":
            k = sample_key[s["sample_id"]]
            if k.get("pair_id"):
                ids.add(k["pair_id"])
            else:
                cases.add(k["stress_case"])
    return ids, cases
