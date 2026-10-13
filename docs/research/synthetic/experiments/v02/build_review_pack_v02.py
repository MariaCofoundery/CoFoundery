"""Reviewer-Paket und Development/Holdout-Split fuer die Human-Label-Phase (v02).

    python3 docs/research/synthetic/experiments/v02/build_review_pack_v02.py

Eingabe (unveraendert):  human_label_sample_v02.json, human_label_sample_key_v02.json
Ausgabe fuer Reviewer:   human_labels_review_pack_v02.json / .csv, human_label_template_v02.csv
Ausgabe INTERN:          human_labels_split_key_v02.json (Holdout-Zuordnung, Zuordnung pair_code -> sample_id)

Erzeugt keine Labels. Nutzt keine Modellergebnisse. Deterministisch (fester Seed).
"""
import csv
import hashlib
import json
import os
import random
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = 20261015
N_HOLDOUT = 40

sample = json.load(open(os.path.join(HERE, "human_label_sample_v02.json"), encoding="utf-8"))
key = {k["sample_id"]: k for k in json.load(open(os.path.join(HERE, "human_label_sample_key_v02.json"), encoding="utf-8"))["key"]}
assert len(sample["items"]) == 120 and len(key) == 120

# Textstellen, die einen Testfall verraten wuerden (nur in den v02-Stressfaellen vorhanden)
TELLTALE = [(re.compile(r"\s*\(Stressfall v02\)\.?"), ""), (re.compile(r"\s*–\s*synthetischer Stressfall\.?"), "")]


def clean(value):
    if isinstance(value, str):
        for pat, repl in TELLTALE:
            value = pat.sub(repl, value)
        return value
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    return value


def find_view(item):
    return {"Person A": clean(item["person_a"]), "Person B": clean(item["person_b"])}


def connect_view(item):
    g, a = clean(item["gesuch"]), clean(item["angebot"])
    seeker = g.pop("person")
    offerer = a.pop("person")
    return {"Gesuch": g, "Suchende Person": seeker, "Angebot": a, "Anbietende Person": offerer}


# ---------------------------------------------------------------------------
# Neutrale Codes und Reihenfolge (unabhaengig vom Split)
# ---------------------------------------------------------------------------
rnd = random.Random(SEED)
items = list(sample["items"])
rnd.shuffle(items)
code_of = {it["sample_id"]: f"RP-{i:03d}" for i, it in enumerate(items, 1)}


# ---------------------------------------------------------------------------
# Geschichteter Split 80/40 (largest remainder je Schicht)
# ---------------------------------------------------------------------------
def stratum(k):
    if k["selection"] == "stratified":
        cat = k["reference_class"]
    elif k["selection"] == "edge_v02_connect_stress":
        cat = f"stress_expected_{k['expected']}"
    else:
        cat = k["selection"]
    contrast = "contrast" if k.get("source") == "contrast_selection" else "designed"
    return (k["context"], k["selection"], cat, contrast)


groups = defaultdict(list)
for sid in sorted(key):
    groups[stratum(key[sid])].append(sid)

# Erst je Kontext exakt ein Drittel, dann innerhalb des Kontexts nach Schichten
holdout = set()
split_rnd = random.Random(SEED + 1)
for context in ("find", "connect"):
    ctx_groups = {g: ids for g, ids in groups.items() if g[0] == context}
    total = sum(len(v) for v in ctx_groups.values())
    target = round(total * N_HOLDOUT / 120)
    ideal = {g: len(ids) * target / total for g, ids in ctx_groups.items()}
    alloc = {g: int(v) for g, v in ideal.items()}
    rest = target - sum(alloc.values())
    for g in sorted(ideal, key=lambda g: (-(ideal[g] - int(ideal[g])), g))[:rest]:
        alloc[g] += 1
    for g in sorted(ctx_groups):
        ids = sorted(ctx_groups[g])
        split_rnd.shuffle(ids)
        holdout |= set(ids[: alloc[g]])
assert len(holdout) == N_HOLDOUT

# ---------------------------------------------------------------------------
# Reviewer-Paket
# ---------------------------------------------------------------------------
pack_items = []
for it in items:
    view = find_view(it) if it["context"] == "find" else connect_view(it)
    pack_items.append(dict(pair_code=code_of[it["sample_id"]], kontext=it["context"].upper(), **view))

pack = dict(
    titel="Made2Found – Review-Paket Matching (v02)",
    hinweis="Vollständig synthetische Profile. Bewertet wird nur, wie sinnvoll es wäre, diesen Kontakt vorzuschlagen. "
            "Anleitung: human_label_instructions_v02.md. Antworten in human_label_template_v02.csv.",
    anzahl=dict(gesamt=len(pack_items), find=sum(1 for p in pack_items if p["kontext"] == "FIND"),
                connect=sum(1 for p in pack_items if p["kontext"] == "CONNECT")),
    paare=pack_items,
)
json.dump(pack, open(os.path.join(HERE, "human_labels_review_pack_v02.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def flat(prefix, obj, out):
    for k, v in obj.items():
        name = f"{prefix}{k}"
        if isinstance(v, dict):
            flat(name + ".", v, out)
        elif isinstance(v, list):
            out[name] = " | ".join(json.dumps(x, ensure_ascii=False) if isinstance(x, dict) else str(x) for x in v)
        else:
            out[name] = "" if v is None else str(v)


rows, columns = [], ["pair_code", "kontext"]
for p in pack_items:
    row = {"pair_code": p["pair_code"], "kontext": p["kontext"]}
    for part in ("Person A", "Person B", "Gesuch", "Suchende Person", "Angebot", "Anbietende Person"):
        if part in p:
            flat(part + ".", p[part], row)
    for c in row:
        if c not in columns:
            columns.append(c)
    rows.append(row)
with open(os.path.join(HERE, "human_labels_review_pack_v02.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=columns, lineterminator="\n")
    w.writeheader()
    for r in rows:
        w.writerow(r)

# ---------------------------------------------------------------------------
# Antwortvorlage (eine Zeile je Paar; je Reviewer eine Kopie)
# ---------------------------------------------------------------------------
TEMPLATE_COLUMNS = ["reviewer_id", "pair_code", "kontext",
                    "find_q1_gespraech", "find_q2_a_to_b", "find_q3_b_to_a", "find_q4_ausschluss", "find_q4_grund",
                    "find_q4_begruendung", "find_q5_sicherheit",
                    "connect_q1_deckung", "connect_q2_anzeigen", "connect_q3_ausschluss", "connect_q3_grund",
                    "connect_q3_begruendung", "connect_q4_sicherheit", "kommentar"]
with open(os.path.join(HERE, "human_label_template_v02.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(TEMPLATE_COLUMNS)
    for p in pack_items:
        w.writerow(["", p["pair_code"], p["kontext"]] + [""] * (len(TEMPLATE_COLUMNS) - 3))

# ---------------------------------------------------------------------------
# INTERN: Split-Key
# ---------------------------------------------------------------------------
split = [dict(pair_code=code_of[sid], sample_id=sid, split="holdout" if sid in holdout else "development",
              stratum="|".join(stratum(key[sid]))) for sid in sorted(key, key=lambda s: code_of[s])]
json.dump(dict(meta=dict(note="INTERN – nicht an Reviewer geben. Holdout erst mit --include-holdout auswerten.",
                         seed=SEED, development=120 - N_HOLDOUT, holdout=N_HOLDOUT,
                         sample_sha256=hashlib.sha256(open(os.path.join(HERE, "human_label_sample_v02.json"), "rb").read()).hexdigest(),
                         sample_key_sha256=hashlib.sha256(open(os.path.join(HERE, "human_label_sample_key_v02.json"), "rb").read()).hexdigest()),
               split=split), open(os.path.join(HERE, "human_labels_split_key_v02.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------------------
# Pruefungen
# ---------------------------------------------------------------------------
errors = []
text = open(os.path.join(HERE, "human_labels_review_pack_v02.json"), encoding="utf-8").read() + \
    open(os.path.join(HERE, "human_labels_review_pack_v02.csv"), encoding="utf-8").read() + \
    open(os.path.join(HERE, "human_label_template_v02.csv"), encoding="utf-8").read()
# Ganze Woerter bzw. genaue Bezeichner – Produkt-Labels wie "Business Development" oder "Geschäftsmodell" sind erlaubt.
FORBIDDEN = [r"excellent_candidate", r"\bpromising\b", r"worth_exploring", r"\basymmetric\b", r"low_relevance", r"\bexclude\b",
             r"insufficient_data", r"reference_class", r"\breference\b", r"\bscenario", r"canonical", r"\bdesigned",
             r"match_cluster", r"archetype", r"contrast", r"\bholdout\b", r"\bsplit\b", r'"development"', r",development,",
             r"\bscore\b", r"\branking\b", r"\brank\b", r"\bmodell?(score|name)\b", r"\bM7(core)?\b", r"Synth-\d", r"syn-(p|pair|l)\d",
             r"v02s-", r"hv02-", r"Stressfall", r"synthetischer Stress", r"\bstratified\b", r"edge_", r"\bselection\b",
             r"sample_id", r"pair_id"]
for pat in FORBIDDEN:
    m = re.search(pat, text, re.I)
    if m:
        ctx_ = text[max(0, m.start() - 40): m.end() + 40].replace("\n", " ")
        errors.append(f"verboten '{pat}': …{ctx_}…")
counts = Counter((key[s]["context"], "holdout" if s in holdout else "development") for s in key)
print("Paare:", len(pack_items), "| development:", 120 - len(holdout), "| holdout:", len(holdout))
print("je Kontext:", dict(counts))
by_stratum = Counter((stratum(key[s])[0], stratum(key[s])[2], "holdout" if s in holdout else "dev") for s in key)
for g in sorted({(a, b) for a, b, _ in by_stratum}):
    print(f"  {g[0]:8} {g[1]:28} dev={by_stratum[(g[0], g[1], 'dev')]:3} holdout={by_stratum[(g[0], g[1], 'holdout')]:3}")
print("Kontrast/Konstruiert:", dict(Counter((stratum(key[s])[3], "holdout" if s in holdout else "dev") for s in key)))
print("Lecks:", errors or "keine")
sys.exit(1 if errors else 0)
