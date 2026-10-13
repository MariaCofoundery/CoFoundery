"""Beschreibende Zusatzanalyse (NICHT vorab festgelegt, fliesst in keine Entscheidung ein).

    python3 docs/research/synthetic/experiments/v03/diagnostics_v03.py

1. SYNTHETIC vs. SILVER: Wie verteilen sich Silver-Urteile je synthetischer Klasse (nur Development)?
2. Wo widersprechen sie sich deutlich?
3. Gruende der Silver-Ausschluesse in CONNECT und ob das Gate sie erfasst.
4. Silver-asymmetrische Faelle mit Modellpositionen (aus results_v03.json).
Holdout bleibt gesperrt: es werden nur Development-Zeilen gelesen.
"""
import json
import os
import statistics
import sys
from collections import defaultdict

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import silver_reference_v03 as SR  # noqa: E402

V02 = SR.V02
DATA = os.path.abspath(os.path.join(HERE, "..", ".."))
split = SR.split_key()
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
stress = json.load(open(os.path.join(V02, "connect_stress_v02.json"), encoding="utf-8"))
r1, _ = SR.load_silver(os.path.join(V02, "silver_labels_R1_v02.csv"), split)
r2, _ = SR.load_silver(os.path.join(V02, "silver_labels_R2_v02.csv"), split)
cons, _ = SR.consensus(r1, r2, SR.adjudications())
target = SR.targets(split, pairs=pairs, stress=stress)
by_id = {p["pair_id"]: p for p in pairs}
res = json.load(open(os.path.join(HERE, "results_v03.json"), encoding="utf-8"))

out = {"note": "Beschreibend, nicht vorab festgelegt. Nur Development. HOLDOUT STATUS: UNOPENED."}

# 1/2 FIND
per_class = defaultdict(list)
conflicts = []
for code, t in target.items():
    if t["context"] != "find" or code not in cons:
        continue
    cls = by_id[t["pair_id"]]["reference_class"]
    q1 = cons[code]["find_q1_gespraech"]
    per_class[cls].append(q1)
    if (cls in ("excellent_candidate", "promising") and q1 <= 2.5) or (cls in ("low_relevance", "exclude") and q1 >= 3.5) \
            or (cls == "asymmetric" and q1 >= 4.5):
        conflicts.append(dict(pair_code=code, synthetic=cls, silver_q1=q1, silver_q2=cons[code]["find_q2_a_to_b"],
                              silver_q3=cons[code]["find_q3_b_to_a"], silver_exclusion=cons[code]["find_q4_ausschluss"],
                              source=by_id[t["pair_id"]]["source"],
                              reason_r1=r1.get(code, {}).get("find_q4_begruendung"), reason_r2=r2.get(code, {}).get("find_q4_begruendung")))
out["find_silver_q1_by_synthetic_class"] = {k: dict(n=len(v), mean=round(statistics.mean(v), 2), min=min(v), max=max(v))
                                             for k, v in sorted(per_class.items())}
out["find_clear_disagreements"] = conflicts

# CONNECT
per_class = defaultdict(list)
show = defaultdict(lambda: defaultdict(int))
conflicts = []
excl = []
c0 = None
for code, t in target.items():
    if t["context"] != "connect" or code not in cons:
        continue
    cls = by_id[t["pair_id"]]["reference_class"] if t["pair_id"] else f"stress:{t['stress_case']}"
    q1 = cons[code]["connect_q1_deckung"]
    per_class[cls].append(q1)
    show[cls][cons[code]["connect_q2_anzeigen"]] += 1
    if (cls in ("excellent_candidate", "promising") and q1 <= 2.5) or (cls in ("low_relevance", "exclude") and q1 >= 3.5):
        conflicts.append(dict(pair_code=code, synthetic=cls, silver_q1=q1, silver_show=cons[code]["connect_q2_anzeigen"]))
    if cons[code]["connect_q3_ausschluss"] == "yes":
        excl.append(dict(pair_code=code, synthetic=cls, grund_r1=r1.get(code, {}).get("connect_q3_grund"),
                         grund_r2=r2.get(code, {}).get("connect_q3_grund")))
out["connect_silver_q1_by_synthetic_class"] = {k: dict(n=len(v), mean=round(statistics.mean(v), 2), min=min(v), max=max(v),
                                                        show=dict(show[k])) for k, v in sorted(per_class.items())}
out["connect_clear_disagreements"] = conflicts
out["connect_silver_exclusions"] = excl
out["connect_exclusion_reasons"] = dict(sorted(defaultdict(int, {}).items()))
reasons = defaultdict(int)
for e in excl:
    reasons[e["grund_r1"] if e["grund_r1"] == e["grund_r2"] else f"{e['grund_r1']}/{e['grund_r2']}"] += 1
out["connect_exclusion_reasons"] = dict(reasons)

# 4 Silver-Asymmetrie mit Modellpositionen
out["silver_asymmetric_cases"] = {m: res["silver_find"][m]["silver_asymmetry"]["cases"] for m in ("F0_M7", "F1_PH1_exact", "F2_PH1_min75_DICT")}
json.dump(out, open(os.path.join(HERE, "diagnostics_v03.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1)[:6000])
