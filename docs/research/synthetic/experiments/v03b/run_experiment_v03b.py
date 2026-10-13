"""Experiment v03b – Capability-Family-Ablation (F3_BASELINE vs. F3_NO_FAMILY).

    python3 .../v03b/run_experiment_v03b.py --smoke        # Baseline = v03-F3 exakt, ohne Referenzen
    python3 .../v03b/run_experiment_v03b.py --preregister  # Festlegung schreiben (einmalig)
    python3 .../v03b/run_experiment_v03b.py                # Lauf
    --unlock-holdout                                       # gesperrt -> Abbruch

Wie v03: Festlegung wird vollstaendig verglichen; waehrend des Scorings sind reference_* und silver_labels*
gesperrt; Silver nur Development (Holdout-Zeilen vor dem Lesen verworfen); Referenzpaare der Holdout-
Stichprobe auch aus SYNTHETIC ausgeschlossen. HOLDOUT STATUS: UNOPENED.
"""
import builtins
import hashlib
import json
import math
import os
import re
import statistics
import sys
from collections import defaultdict

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
DATA = os.path.join(REPO, "docs/research/synthetic")
V02 = os.path.join(DATA, "experiments", "v02")
V03 = os.path.join(DATA, "experiments", "v03")
sys.path.insert(0, HERE)
sys.path.insert(0, V03)

if "--unlock-holdout" in sys.argv:
    sys.exit("v03b: --unlock-holdout ist gesperrt. HOLDOUT STATUS: UNOPENED (38 clean).")

import models_v03b as MB  # noqa: E402
import silver_reference_v03 as SR  # noqa: E402
V1, M2 = MB.V1, MB.M2

_real_open = builtins.open
_GUARD = {"on": False, "blocked": []}


def _guarded_open(file, *a, **k):
    name = os.path.basename(str(file))
    if _GUARD["on"] and ("reference_" in name or "silver_labels" in name):
        _GUARD["blocked"].append(str(file))
        raise PermissionError(f"Referenz während des Scorings gesperrt: {file}")
    return _real_open(file, *a, **k)


builtins.open = _guarded_open


def sha(p):
    return hashlib.sha256(_real_open(p, "rb").read()).hexdigest()


# ---------------------------------------------------------------------------
# Vorab-Festlegung
# ---------------------------------------------------------------------------
TOL = dict(silver_q1_max_drop=0.02, silver_q2_q3_max_drop=0.02, synthetic_contrast_ndcg10_max_drop=0.02,
           asym_other_side_max_increase_vs_baseline=0.05, asym_other_side_must_stay_below_M7_minus=0.10,
           M7_constructed_asym_other_side_top10_from_v03=0.9231)
PREREG = os.path.join(HERE, "preregistration_v03b.json")


def prereg_content():
    return dict(
        experiment="matching v03b – capability family ablation",
        holdout="UNOPENED – 38 clean; RP-001/RP-002 contaminated and excluded",
        assumption="Alle synthetischen Personen haben der Matching-Nutzung von Capability-Bereich, Erfahrung und Verantwortungswunsch zugestimmt (volle Sicht wie v03).",
        models=dict(F3_BASELINE="matching_models_v03 F3_PH1_min60_DICT unverändert",
                    F3_NO_FAMILY="identisch; einzige Änderung: Teil-Gutschrift für Bereiche derselben Capability-Familie = 0 (family_credit=False)"),
        metrics=dict(
            silver=["Spearman/Kendall/NDCG/paarweise Q1 gegen Consensus, R1, R2", "Spearman A→B vs Q2, B→A vs Q3", "Gate vs Q4 (P/R/Spez/F1)"],
            synthetic=["Recall@10, NDCG@10 (wie gerankt, pessimistisch)", "konstruiert/Kontrast NDCG@10", "excellent/promising@10",
                       "asymmetrisch konstruiert/Kontrast: Seite mit/ohne Bedarf in Top 10", "exclude zugelassen/Top 10, falsch gesperrt",
                       "Exposition Generalisten/Sparse/Spezialisten", "Anzahl Paare mit geändertem Score"],
            primary="Silver Spearman Q1 (Consensus)"),
        decision_rule=dict(
            adopt_F3_NO_FAMILY_if_all=[
                f"Silver Spearman Q1 (Consensus) ≥ F3_BASELINE − {TOL['silver_q1_max_drop']}",
                f"Silver Spearman Q2 und Q3 (Consensus) je ≥ F3_BASELINE − {TOL['silver_q2_q3_max_drop']}",
                "Gate unverändert: identischer Gate-Zustand für alle Paare (Pool) und identische Silver-Gate-Kennzahlen",
                f"Synthetic Kontrast-NDCG@10 ≥ F3_BASELINE − {TOL['synthetic_contrast_ndcg10_max_drop']}",
                f"Asymmetrie erhalten: konstruierte asym. Paare, Seite ohne Bedarf in Top 10 ≤ F3_BASELINE + {TOL['asym_other_side_max_increase_vs_baseline']} "
                f"UND ≤ M7 ({TOL['M7_constructed_asym_other_side_top10_from_v03']}) − {TOL['asym_other_side_must_stay_below_M7_minus']}"],
            no_threshold_changes_after_results=True),
        tolerances=TOL,
        hashes={f: sha(os.path.join(HERE, f)) for f in ["models_v03b.py", "run_experiment_v03b.py"]},
        frozen_upstream={f: sha(os.path.join(V03, f)) for f in ["matching_models_v03.py", "normalization_v03.py", "silver_reference_v03.py",
                                                                  "silver_adjudication_v03.json", "preregistration_v03.json"]},
    )


content = prereg_content()
SMOKE = "--smoke" in sys.argv
if "--preregister" in sys.argv:
    if os.path.exists(PREREG):
        sys.exit("preregistration_v03b.json existiert bereits – wird nicht überschrieben.")
    _real_open(PREREG, "w", encoding="utf-8").write(json.dumps(content, ensure_ascii=False, indent=1, sort_keys=True))
    print("Vorab-Festlegung geschrieben. SHA-256:", sha(PREREG))
    sys.exit(0)
if not SMOKE:
    if not os.path.exists(PREREG):
        sys.exit("Keine preregistration_v03b.json – zuerst --preregister.")
    stored = json.load(_real_open(PREREG, encoding="utf-8"))
    if json.dumps(stored, sort_keys=True, ensure_ascii=False) != json.dumps(json.loads(json.dumps(content, ensure_ascii=False)), sort_keys=True, ensure_ascii=False):
        sys.exit("Festlegung weicht ab. Abbruch.")

# ---------------------------------------------------------------------------
# Scoring (gesperrt)
# ---------------------------------------------------------------------------
_GUARD["on"] = True
profiles = json.load(open(os.path.join(DATA, "profiles.json"), encoding="utf-8"))["profiles"]
family_of = {}
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s_ = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s_, re.S | re.I):
        for row in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'([a-z0-9_]+)'", m.group(2)):
            family_of[row.group(1)] = row.group(2)
ds = V1.Dataset(profiles, family_of)
ctx = M2.Context(ds)

if SMOKE:
    diff = sum(1 for a in ds.find_pool for b in ds.find_pool if a.id != b.id and
               (MB.score_find(ctx, "F3_BASELINE", a, b)["score"] != MB.MM.score_find(ctx, "F3_PH1_min60_DICT", a, b)["score"]))
    changed = sum(1 for a in ds.find_pool for b in ds.find_pool if a.id != b.id and
                  MB.score_find(ctx, "F3_BASELINE", a, b)["score"] != MB.score_find(ctx, "F3_NO_FAMILY", a, b)["score"])
    gate_diff = sum(1 for a in ds.find_pool for b in ds.find_pool if a.id != b.id and
                    MB.score_find(ctx, "F3_BASELINE", a, b)["gate_state"] != MB.score_find(ctx, "F3_NO_FAMILY", a, b)["gate_state"])
    print(f"Rauchtest: Baseline≠v03-F3: {diff} | Paare mit geändertem Score: {changed} | Gate-Unterschiede: {gate_diff} | gesperrt: {len(_GUARD['blocked'])}")
    sys.exit(0)


def rank_find(name):
    out = {}
    for a in ctx.pool:
        rec = {b.id: MB.score_find(ctx, name, a, b) for b in ctx.pool if b.id != a.id}
        elig = sorted(((c, r["score"]) for c, r in rec.items() if r["eligible"]), key=lambda x: (-x[1], V1.recency_key(x[0])))
        out[a.id] = {"ranked": elig, "rec": rec}
    return out


RANK = {n: rank_find(n) for n in MB.MODELS}
_GUARD["on"] = False
assert not _GUARD["blocked"]
pool_pairs = [(a, b) for a in RANK["F3_BASELINE"] for b in RANK["F3_BASELINE"][a]["rec"]]
gate_identical = all(RANK["F3_BASELINE"][a]["rec"][b]["gate_state"] == RANK["F3_NO_FAMILY"][a]["rec"][b]["gate_state"] for a, b in pool_pairs)
changed_scores = sum(1 for a, b in pool_pairs if RANK["F3_BASELINE"][a]["rec"][b]["score"] != RANK["F3_NO_FAMILY"][a]["rec"][b]["score"])

# ---------------------------------------------------------------------------
# Referenzen (erst jetzt)
# ---------------------------------------------------------------------------
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
ann = json.load(open(os.path.join(DATA, "reference_annotations.json"), encoding="utf-8"))["annotations"]
stress = json.load(open(os.path.join(V02, "connect_stress_v02.json"), encoding="utf-8"))
split = SR.split_key()
HOLD_PAIRS, _ = SR.holdout_pair_ids(split)
pairs_dev = [p for p in pairs if p["pair_id"] not in HOLD_PAIRS]
r1, d1 = SR.load_silver(os.path.join(V02, "silver_labels_R1_v02.csv"), split)
r2, d2 = SR.load_silver(os.path.join(V02, "silver_labels_R2_v02.csv"), split)
cons, notes = SR.consensus(r1, r2, SR.adjudications(os.path.join(V03, "silver_adjudication_v03.json")))
TARGET = SR.targets(split, pairs=pairs, stress=stress)
find_codes = sorted(c for c, t in TARGET.items() if t["context"] == "find" and c in cons)


def r4(x):
    return None if x is None else round(x, 4)


def ranks_avg(v):
    order = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    i = 0
    while i < len(v):
        j = i
        while j + 1 < len(v) and v[order[j + 1]] == v[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2
        i = j + 1
    return r


def spearman(x, y):
    rx, ry = ranks_avg(x), ranks_avg(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return r4(num / den) if den else None


def kendall_b(x, y):
    c = d = tx = ty = 0
    for i in range(len(x)):
        for j in range(i + 1, len(x)):
            dx, dy = x[i] - x[j], y[i] - y[j]
            if dx == 0 and dy == 0:
                continue
            if dx == 0:
                tx += 1
            elif dy == 0:
                ty += 1
            elif dx * dy > 0:
                c += 1
            else:
                d += 1
    den = math.sqrt((c + d + tx) * (c + d + ty))
    return r4((c - d) / den) if den else None


def ndcg_global(scores, gains):
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], gains[i]))
    dcg = sum(gains[i] / math.log2(k + 2) for k, i in enumerate(order))
    ideal = sum(g / math.log2(k + 2) for k, g in enumerate(sorted(gains, reverse=True)))
    return r4(dcg / ideal) if ideal else None


def pairwise(scores, truth):
    ok = ties = n = 0
    for i in range(len(scores)):
        for j in range(i + 1, len(scores)):
            if truth[i] == truth[j]:
                continue
            n += 1
            if scores[i] == scores[j]:
                ties += 1
            elif (scores[i] - scores[j]) * (truth[i] - truth[j]) > 0:
                ok += 1
    return dict(accuracy=r4(ok / n) if n else None, tie_share=r4(ties / n) if n else None)


def classify(pred, truth):
    tp = sum(p and t for p, t in zip(pred, truth)); fp = sum(p and not t for p, t in zip(pred, truth))
    fn = sum((not p) and t for p, t in zip(pred, truth)); tn = sum((not p) and (not t) for p, t in zip(pred, truth))
    pr = tp / (tp + fp) if tp + fp else None; rc = tp / (tp + fn) if tp + fn else None
    return dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=r4(pr), recall=r4(rc), specificity=r4(tn / (tn + fp)) if tn + fp else None,
                f1=r4(2 * pr * rc / (pr + rc)) if pr and rc else None)


rs = lambda rec: rec["score"] if rec["eligible"] else -1.0
SOURCES = {"consensus": cons, "R1": r1, "R2": r2}


def val(src, code, q):
    v = src.get(code, {}).get(q)
    if src is cons:
        return v
    try:
        return float(v)
    except (TypeError, ValueError):
        return v or None


GAIN = {"excellent_candidate": 3, "promising": 2, "worth_exploring": 1}
REL = {"excellent_candidate", "promising"}


def judg(subset=None):
    j = {}
    for p in pairs_dev:
        if p["context"] != "find":
            continue
        if subset == "contrast" and p["source"] != "contrast_selection":
            continue
        if subset == "constructed" and p["source"] == "contrast_selection":
            continue
        j[(p["a"], p["b"])] = p
        j[(p["b"], p["a"])] = p
    return j


def dcg(g):
    return sum(x / math.log2(i + 2) for i, x in enumerate(g))


def ranking_metrics(table, J, pessimistic=False):
    by_q = defaultdict(dict)
    for (q, c), p in J.items():
        if p["reference_class"] != "insufficient_data":
            by_q[q][c] = p["reference_class"]
    acc = defaultdict(list)
    for q, js in by_q.items():
        rel = {c for c, k in js.items() if k in REL}
        if q not in table or not rel:
            continue
        pos = {c for c, k in js.items() if k in GAIN}
        ranked = [c for c, _ in sorted(table[q]["ranked"], key=lambda x: (-x[1], 1 if (pessimistic and x[0] in pos) else 0))] \
            if pessimistic else [c for c, _ in table[q]["ranked"]]
        acc["Recall@10"].append(len(set(ranked[:10]) & rel) / len(rel))
        ideal = sorted((GAIN.get(v, 0) for v in js.values()), reverse=True)
        acc["NDCG@10"].append(dcg([GAIN.get(js.get(c), 0) for c in ranked[:10]]) / dcg(ideal[:10]) if dcg(ideal[:10]) else 0.0)
        first = next((i for i, c in enumerate(ranked) if c in rel), None)
        acc["MRR"].append(0.0 if first is None else 1 / (first + 1))
    return {k: r4(statistics.mean(v)) for k, v in acc.items()}


def prank(table, q, c):
    for i, (x, _) in enumerate(table[q]["ranked"]):
        if x == c:
            return i + 1
    return None


scen = {pid: a["primary_scenario"] for pid, a in ann.items()}
pool_ids = [p.id for p in ds.find_pool]
groups = {g: {i for i in pool_ids if scen[i] == g} for g in ("generalist", "sparse", "normal", "specialist")}
J, Jc, Jx = judg(), judg("constructed"), judg("contrast")
R = dict(meta=dict(preregistration_sha256=sha(PREREG), holdout_status="UNOPENED – 38 clean; RP-001/RP-002 excluded",
                   guard_blocked_reads=_GUARD["blocked"], silver_rows_dropped=dict(R1=d1, R2=d2),
                   silver_find_pairs=len(find_codes), synthetic_pairs_used=len(pairs_dev),
                   pool_pairs=len(pool_pairs), pairs_with_changed_score=changed_scores, gate_identical_all_pool_pairs=gate_identical),
         silver={}, synthetic={})
for n, table in RANK.items():
    recs = {c: table[TARGET[c]["a"]]["rec"][TARGET[c]["b"]] for c in find_codes}
    out = {}
    for sname, src in SOURCES.items():
        codes = [c for c in find_codes if val(src, c, "find_q1_gespraech") is not None]
        sc, q1 = [rs(recs[c]) for c in codes], [val(src, c, "find_q1_gespraech") for c in codes]
        res = dict(n=len(codes), spearman_q1=spearman(sc, q1), kendall_q1=kendall_b(sc, q1), ndcg_q1=ndcg_global(sc, [v - 1 for v in q1]),
                   pairwise_q1=pairwise(sc, q1))
        for q, i in (("find_q2_a_to_b", 0), ("find_q3_b_to_a", 1)):
            cc = [c for c in find_codes if val(src, c, q) is not None]
            res["spearman_" + q[5:7]] = spearman([recs[c]["directed"][i] for c in cc], [val(src, c, q) for c in cc])
        gc = [c for c in find_codes if val(src, c, "find_q4_ausschluss") in ("yes", "no")]
        res["gate_vs_q4"] = classify([not recs[c]["eligible"] for c in gc], [val(src, c, "find_q4_ausschluss") == "yes" for c in gc])
        out[sname] = res
    out["silver_scores"] = {c: r4(rs(recs[c])) for c in find_codes}
    R["silver"][n] = out
    ex = defaultdict(int)
    for t in table.values():
        for c, _ in t["ranked"][:10]:
            ex[c] += 1
    expo = {i: ex[i] / len(table) for i in pool_ids}
    mean = lambda g: statistics.mean(expo[i] for i in groups[g]) if groups[g] else None
    asym = defaultdict(list)
    for p in pairs_dev:
        if p["context"] == "find" and p["reference_class"] == "asymmetric":
            qn, qo = (p["a"], p["b"]) if p["dimensions"]["A_to_B_need_offer"] != "none" else (p["b"], p["a"])
            asym["contrast" if p["source"] == "contrast_selection" else "constructed"].append(
                ((prank(table, qn, qo) or 999) <= 10, (prank(table, qo, qn) or 999) <= 10))
    pl = defaultdict(list)
    fg = 0
    for (q, c), p in J.items():
        r = prank(table, q, c)
        pl[p["reference_class"] + "@10"].append(1.0 if r and r <= 10 else 0.0)
        pl[p["reference_class"] + "_eligible"].append(1.0 if table[q]["rec"][c]["eligible"] else 0.0)
        fg += p["reference_class"] in ("excellent_candidate", "promising", "worth_exploring", "asymmetric") and not table[q]["rec"][c]["eligible"]
    R["synthetic"][n] = dict(
        ranking=ranking_metrics(table, J), ranking_pessimistic=ranking_metrics(table, J, True),
        constructed=ranking_metrics(table, Jc), contrast=ranking_metrics(table, Jx),
        pairs={k: r4(statistics.mean(v)) for k, v in pl.items()}, false_gates=fg,
        asymmetric={k: dict(n=len(v), top10_needing=r4(statistics.mean(x for x, _ in v)), top10_other=r4(statistics.mean(y for _, y in v)))
                    for k, v in asym.items()},
        exposure=dict(generalist_vs_normal=r4(mean("generalist") / mean("normal")), sparse_vs_normal=r4(mean("sparse") / mean("normal")),
                      specialist=r4(mean("specialist"))))

B, X = R["silver"]["F3_BASELINE"]["consensus"], R["silver"]["F3_NO_FAMILY"]["consensus"]
SB, SX = R["synthetic"]["F3_BASELINE"], R["synthetic"]["F3_NO_FAMILY"]
crit = {
    "silver_q1": X["spearman_q1"] >= B["spearman_q1"] - TOL["silver_q1_max_drop"],
    "silver_q2_q3": X["spearman_q2"] >= B["spearman_q2"] - TOL["silver_q2_q3_max_drop"] and X["spearman_q3"] >= B["spearman_q3"] - TOL["silver_q2_q3_max_drop"],
    "gate_unchanged": gate_identical and X["gate_vs_q4"] == B["gate_vs_q4"],
    "synthetic_contrast": SX["contrast"]["NDCG@10"] >= SB["contrast"]["NDCG@10"] - TOL["synthetic_contrast_ndcg10_max_drop"],
    "asymmetry_preserved": SX["asymmetric"]["constructed"]["top10_other"] <= SB["asymmetric"]["constructed"]["top10_other"] + TOL["asym_other_side_max_increase_vs_baseline"]
    and SX["asymmetric"]["constructed"]["top10_other"] <= TOL["M7_constructed_asym_other_side_top10_from_v03"] - TOL["asym_other_side_must_stay_below_M7_minus"],
}
R["decision"] = dict(criteria=crit, adopt_F3_NO_FAMILY=all(crit.values()))
json.dump(R, _real_open(os.path.join(HERE, "results_v03b.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("fertig | Festlegung", sha(PREREG)[:16], "| HOLDOUT UNOPENED | geänderte Paare:", changed_scores, "| Gate identisch:", gate_identical,
      "| übernehmen:", all(crit.values()))
