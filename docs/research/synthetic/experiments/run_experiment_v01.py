"""Matching-Experiment v0.1 – Laufskript.

    python3 docs/research/synthetic/experiments/run_experiment_v01.py

Phasen
------
1. Laden: profiles.json und die Capability-Taxonomie aus den Migrationen.
2. Scoring: ALLE Modelle ranken fuer ALLE FIND-aktiven Personen bzw. ALLE
   Suchen-Eintraege. Waehrend dieser Phase blockiert ein Waechter jedes Oeffnen
   einer Datei, deren Name "reference_" enthaelt – das Skript weiss also nicht,
   welche Personen in Referenzpaaren vorkommen.
3. Erst danach werden reference_pairs.json und reference_annotations.json geladen.
4. Auswertung, Bias-Pruefung, Stresspaare, Workstyle-Demo (ohne Score-Einfluss).

Ergebnis: results_v01.json (alle Kennzahlen). Deterministisch.
"""
import builtins
import json
import math
import os
import random
import re
import statistics
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True  # kein __pycache__ im Repository
sys.path.insert(0, HERE)
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
DATA = os.path.join(REPO, "docs/research/synthetic")

import matching_models_v01 as MM  # noqa: E402
import normalization_v01 as N  # noqa: E402

# ---------------------------------------------------------------------------
# Waechter: Ground Truth ist waehrend des Scorings nicht lesbar
# ---------------------------------------------------------------------------
_real_open = builtins.open
_GUARD = {"on": False, "blocked": []}


def _guarded_open(file, *args, **kwargs):
    if _GUARD["on"] and "reference_" in os.path.basename(str(file)):
        _GUARD["blocked"].append(str(file))
        raise PermissionError(f"Ground Truth während des Scorings gesperrt: {file}")
    return _real_open(file, *args, **kwargs)


builtins.open = _guarded_open

# ---------------------------------------------------------------------------
# 1. Laden
# ---------------------------------------------------------------------------
_GUARD["on"] = True
profiles = json.load(open(os.path.join(DATA, "profiles.json"), encoding="utf-8"))["profiles"]
family_of = {}
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s, re.S | re.I):
        for row in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'([a-z0-9_]+)'", m.group(2)):
            family_of[row.group(1)] = row.group(2)
assert len(family_of) == 54


def build(profs):
    return MM.Dataset(profs, family_of)


# Robustheit: Kopie mit fehlenden Feldern (fester Seed, nur Produktfelder)
def perturbed_profiles(seed=7, share=0.25):
    rnd = random.Random(seed)
    out = json.loads(json.dumps(profiles))
    ids = sorted(p["id"] for p in out if p["find_profile"] and p["find_profile"]["status"] == "active")
    hit = set(rnd.sample(ids, int(len(ids) * share)))
    for p in out:
        if p["id"] in hit:
            pc, fp = p["person_core"], p["find_profile"]
            pc["industries"], pc["expertise"] = [], []
            pc["location_region"], pc["remote_mode"] = None, None
            fp["search_intent"], fp["start_horizon"] = None, None
    return out, hit


# ---------------------------------------------------------------------------
# 2. Scoring (unter Waechter)
# ---------------------------------------------------------------------------
def rank_find(ds, model):
    """{query_id: {"ranked": [(cand, score)], "rec": {cand: result}}}"""
    out = {}
    pool = ds.find_pool
    for a in pool:
        rec, elig = {}, []
        for b in pool:
            if b.id == a.id:
                continue
            r = MM.score_find(ds, model, a, b)
            rec[b.id] = r
            if r["eligible"]:
                elig.append((b.id, r["score"]))
        elig.sort(key=lambda x: (-x[1], MM.recency_key(x[0])))
        out[a.id] = {"ranked": elig, "rec": rec}
    return out


def rank_connect(ds, model):
    out = {}
    for sl in ds.listings.values():
        if sl.direction != "seeking":
            continue
        rec, elig = {}, []
        for ol in ds.offers:
            if ol.owner.id == sl.owner.id:
                continue
            r = MM.score_connect(ds, model, sl, ol)
            rec[ol.id] = r
            if r["eligible"]:
                elig.append((ol.id, r["score"]))
        elig.sort(key=lambda x: (x[1], x[0]), reverse=True)
        out[sl.id] = {"ranked": elig, "rec": rec}
    return out


ds = build(profiles)
FIND_RANK = {m: rank_find(ds, m) for m in MM.FIND_MODELS}
CONNECT_RANK = {m: rank_connect(ds, m) for m in MM.CONNECT_MODELS}
pert, PERT_IDS = perturbed_profiles()
ds_pert = build(pert)
ROBUST_MODELS = ["M3", "M5", "M6c", "M7", "M8"]
FIND_RANK_PERT = {m: rank_find(ds_pert, m) for m in ROBUST_MODELS}

_GUARD["on"] = False
assert not _GUARD["blocked"], _GUARD["blocked"]

# ---------------------------------------------------------------------------
# 3. Ground Truth laden – erst jetzt
# ---------------------------------------------------------------------------
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
ann = json.load(open(os.path.join(DATA, "reference_annotations.json"), encoding="utf-8"))["annotations"]

GAIN = {"excellent_candidate": 3, "promising": 2, "worth_exploring": 1}
REL = {"excellent_candidate", "promising"}
CLASSES = ["excellent_candidate", "promising", "worth_exploring", "asymmetric", "low_relevance", "exclude", "insufficient_data"]


def find_judgments(subset=None):
    """(query, candidate) -> pair. FIND-Urteile gelten in beide Richtungen."""
    j = {}
    for p in pairs:
        if p["context"] != "find":
            continue
        if subset == "contrast" and p["source"] != "contrast_selection":
            continue
        if subset == "constructed" and p["source"] == "contrast_selection":
            continue
        j[(p["a"], p["b"])] = p
        j[(p["b"], p["a"])] = p
    return j


def connect_judgments(subset=None):
    j = {}
    for p in pairs:
        if p["context"] != "connect":
            continue
        if subset == "contrast" and p["source"] != "contrast_selection":
            continue
        if subset == "constructed" and p["source"] == "contrast_selection":
            continue
        j[(p["a_listing"], p["b_listing"])] = p
    return j


def dcg(gains):
    return sum(g / math.log2(i + 2) for i, g in enumerate(gains))


def ranking_metrics(rank_table, judg):
    by_q = defaultdict(dict)
    for (q, c), p in judg.items():
        if p["reference_class"] != "insufficient_data":
            by_q[q][c] = p["reference_class"]
    acc = defaultdict(list)
    for q, js in by_q.items():
        if q not in rank_table:
            continue
        ranked = [c for c, _ in rank_table[q]["ranked"]]
        pos = {c: i for i, c in enumerate(ranked)}
        relevant = {c for c, k in js.items() if k in REL}
        # Gesamtliste (nicht beurteilte Kandidaten zaehlen als nicht relevant)
        if relevant:
            for k in (5, 10):
                acc[f"P@{k}"].append(len(set(ranked[:k]) & relevant) / k)
            for k in (10, 20):
                acc[f"Recall@{k}"].append(len(set(ranked[:k]) & relevant) / len(relevant))
            ideal = sorted((GAIN.get(v, 0) for v in js.values()), reverse=True)
            for k in (5, 10):
                g = [GAIN.get(js.get(c), 0) for c in ranked[:k]]
                acc[f"NDCG@{k}"].append(dcg(g) / dcg(ideal[:k]) if dcg(ideal[:k]) else 0.0)
            first = next((i for i, c in enumerate(ranked) if c in relevant), None)
            acc["MRR"].append(0.0 if first is None else 1 / (first + 1))
        # Verdichtete Liste: nur beurteilte Kandidaten, nicht Zugelassene ans Ende
        recs = rank_table[q]["rec"]
        judged = sorted(js, key=lambda c: (0 if c in pos else 1, pos.get(c, 0),
                                           -(recs[c]["score"] if isinstance(recs[c]["score"], (int, float)) else 0)))
        if any(js[c] in GAIN for c in judged):
            ideal = sorted((GAIN.get(js[c], 0) for c in judged), reverse=True)
            g = [GAIN.get(js[c], 0) for c in judged]
            for k in (5, 10):
                acc[f"cNDCG@{k}"].append(dcg(g[:k]) / dcg(ideal[:k]) if dcg(ideal[:k]) else 0.0)
        # Paarweise Ordnung: jedes positive vor jedem negativen Urteil derselben Anfrage
        positives = [c for c in judged if js[c] in GAIN]
        negatives = [c for c in judged if js[c] in ("low_relevance", "exclude")]
        order = {c: i for i, c in enumerate(judged)}
        for pc in positives:
            for nc in negatives:
                acc["pairwise_order"].append(1.0 if order[pc] < order[nc] else 0.0)
    out = {k: round(statistics.mean(v), 4) for k, v in acc.items()}
    out["queries"] = len([q for q in by_q if q in rank_table])
    out["pairwise_comparisons"] = len(acc["pairwise_order"])
    return out


def pair_rank(rank_table, q, c):
    t = rank_table.get(q)
    if not t:
        return None, False
    for i, (x, _) in enumerate(t["ranked"]):
        if x == c:
            return i + 1, True
    return None, bool(t["rec"].get(c, {}).get("eligible"))


def pair_level(rank_table, judg, top=10):
    stats = defaultdict(list)
    for (q, c), p in judg.items():
        k = p["reference_class"]
        r, _ = pair_rank(rank_table, q, c)
        rec = rank_table.get(q, {}).get("rec", {}).get(c)
        eligible = bool(rec and rec["eligible"])
        stats[f"{k}@{top}"].append(1.0 if (r is not None and r <= top) else 0.0)
        stats[f"{k}_eligible"].append(1.0 if eligible else 0.0)
        if rec and rec.get("confidence") is not None:
            stats[f"{k}_low_conf"].append(1.0 if rec["confidence"] < 0.5 else 0.0)
    return {k: round(statistics.mean(v), 4) for k, v in stats.items()}


def asym_behavior(rank_table):
    need, other = [], []
    need_top, other_top = [], []
    for p in pairs:
        if p["context"] != "find" or p["reference_class"] != "asymmetric":
            continue
        d = p["dimensions"]
        q_need, q_other = (p["a"], p["b"]) if d["A_to_B_need_offer"] != "none" else (p["b"], p["a"])
        r1, _ = pair_rank(rank_table, q_need, q_other)
        r2, _ = pair_rank(rank_table, q_other, q_need)
        need.append(r1 or 999); other.append(r2 or 999)
        need_top.append(1.0 if r1 and r1 <= 10 else 0.0); other_top.append(1.0 if r2 and r2 <= 10 else 0.0)
    return dict(median_rank_needing_side=statistics.median(need), median_rank_other_side=statistics.median(other),
                top10_needing_side=round(statistics.mean(need_top), 4), top10_other_side=round(statistics.mean(other_top), 4))


def false_gates(rank_table, judg):
    """Positive Paare, die ein Modell gar nicht erst zulaesst – mit Grund."""
    reasons = Counter()
    n = bad = 0
    for (q, c), p in judg.items():
        if p["reference_class"] not in ("excellent_candidate", "promising", "worth_exploring", "asymmetric"):
            continue
        n += 1
        rec = rank_table.get(q, {}).get("rec", {}).get(c)
        if rec and not rec["eligible"]:
            bad += 1
            for r in rec["reasons"]:
                reasons[re.sub(r"^[AB]: ", "", r)] += 1
    return dict(rate=round(bad / n, 4) if n else 0.0, count=bad, of=n, reasons=dict(reasons.most_common()))


def constraint_errors(rank_table, judg):
    n = elig = top = 0
    for (q, c), p in judg.items():
        if p["reference_class"] != "exclude":
            continue
        n += 1
        rec = rank_table.get(q, {}).get("rec", {}).get(c)
        if rec and rec["eligible"]:
            elig += 1
            r, _ = pair_rank(rank_table, q, c)
            if r and r <= 10:
                top += 1
    return dict(exclude_not_gated=round(elig / n, 4), exclude_in_top10=round(top / n, 4), n=n)


def spearman(x, y):
    def ranks(v):
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
    rx, ry = ranks(x), ranks(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return round(num / den, 3) if den else 0.0


def exposure(rank_table, top=10):
    cnt = Counter()
    for q, t in rank_table.items():
        for c, _ in t["ranked"][:top]:
            cnt[c] += 1
    n = len(rank_table)
    return {pid: cnt[pid] / n for pid in (p.id for p in ds.find_pool)}


def raw_completeness(p):
    pc, fp = p["person_core"], p["find_profile"] or {}
    fields = [pc["industries"], pc["expertise"], pc["location_region"], pc["remote_mode"], p["capability_entries"],
              fp.get("search_intent"), fp.get("start_horizon"), fp.get("recent_step"), fp.get("availability_flexibility"),
              fp.get("must_haves")]
    return sum(1 for f in fields if f)


raw_by_id = {p["id"]: p for p in profiles}

# ---------------------------------------------------------------------------
# 4. Auswertung
# ---------------------------------------------------------------------------
RESULTS = {"meta": {"find_queries_ranked": len(ds.find_pool),
                    "connect_queries_ranked": sum(1 for l in ds.listings.values() if l.direction == "seeking"),
                    "guard_blocked_reads": _GUARD["blocked"],
                    "perturbed_profiles": len(PERT_IDS)},
           "find": {}, "connect": {}}

FJ, FJc, FJx = find_judgments(), find_judgments("constructed"), find_judgments("contrast")
CJ, CJc, CJx = connect_judgments(), connect_judgments("constructed"), connect_judgments("contrast")

for m, t in FIND_RANK.items():
    RESULTS["find"][m] = dict(
        ranking=ranking_metrics(t, FJ),
        ranking_constructed=ranking_metrics(t, FJc),
        ranking_contrast=ranking_metrics(t, FJx),
        pairs=pair_level(t, FJ),
        pairs_constructed=pair_level(t, FJc),
        pairs_contrast=pair_level(t, FJx),
        asymmetric=asym_behavior(t),
        false_gates=false_gates(t, FJ),
        constraints=constraint_errors(t, FJ),
    )
for m, t in CONNECT_RANK.items():
    RESULTS["connect"][m] = dict(
        ranking=ranking_metrics(t, CJ),
        ranking_constructed=ranking_metrics(t, CJc),
        ranking_contrast=ranking_metrics(t, CJx),
        pairs=pair_level(t, CJ),
        pairs_constructed=pair_level(t, CJc),
        pairs_contrast=pair_level(t, CJx),
        false_gates=false_gates(t, CJ),
        constraints=constraint_errors(t, CJ),
    )

# --- Bias / Robustheit -------------------------------------------------------
scen = {pid: a["primary_scenario"] for pid, a in ann.items()}
bias = {}
for m in ["M0", "M1", "M2", "M3", "M4", "M5", "M6c", "M7", "M8"]:
    ex = exposure(FIND_RANK[m])
    ids = sorted(ex)
    by_scen = defaultdict(list)
    for pid in ids:
        by_scen[scen[pid]].append(ex[pid])
    caps = [len(raw_by_id[i]["capability_entries"]) for i in ids]
    comp = [raw_completeness(raw_by_id[i]) for i in ids]
    # Positive Paare mit/ohne woertliche Ueberschneidung
    hit_overlap, hit_none = [], []
    for (q, c), p in FJ.items():
        if p["reference_class"] in REL:
            r, _ = pair_rank(FIND_RANK[m], q, c)
            (hit_overlap if p["diagnostic_raw_string_overlap"] else hit_none).append(1.0 if r and r <= 10 else 0.0)
    bias[m] = dict(
        exposure_by_scenario={k: round(statistics.mean(v), 4) for k, v in sorted(by_scen.items())},
        spearman_exposure_vs_completeness=spearman(comp, [ex[i] for i in ids]),
        spearman_exposure_vs_capability_count=spearman(caps, [ex[i] for i in ids]),
        top10_positive_with_raw_overlap=round(statistics.mean(hit_overlap), 4) if hit_overlap else None,
        top10_positive_without_raw_overlap=round(statistics.mean(hit_none), 4) if hit_none else None,
        n_with_overlap=len(hit_overlap), n_without_overlap=len(hit_none),
        max_exposure=round(max(ex.values()), 4),
        gini_exposure=round(sum(abs(a - b) for a in ex.values() for b in ex.values()) / (2 * len(ex) ** 2 * statistics.mean(ex.values())), 4)
        if statistics.mean(ex.values()) else None,
    )
RESULTS["bias"] = bias

# Spezialistinnen in CONNECT
spec = {}
for m in CONNECT_RANK:
    ranks = []
    for p in pairs:
        if p["source"] == "designed_specialist" and p["reference_class"] == "excellent_candidate":
            r, _ = pair_rank(CONNECT_RANK[m], p["a_listing"], p["b_listing"])
            ranks.append(r)
    spec[m] = ranks
RESULTS["specialists_connect_rank"] = spec

# Orte: Positive Paare, die wegen des Orts nicht zugelassen werden
loc_err = {}
for m in FIND_RANK:
    n = 0
    for (q, c), p in FJ.items():
        if p["reference_class"] in GAIN:
            rec = FIND_RANK[m][q]["rec"].get(c) if q in FIND_RANK[m] else None
            if rec and not rec["eligible"] and any("Ort" in r for r in rec["reasons"]):
                n += 1
    loc_err[m] = n
RESULTS["location_false_exclusions"] = loc_err

# Fehlende Felder: dieselben Modelle auf der gestoerten Kopie
robust = {}
for m in ROBUST_MODELS:
    a, b = RESULTS["find"][m]["ranking"], ranking_metrics(FIND_RANK_PERT[m], FJ)
    robust[m] = {k: dict(base=a.get(k), perturbed=b.get(k), delta=round((b.get(k) or 0) - (a.get(k) or 0), 4))
                 for k in ("Recall@10", "NDCG@10", "MRR", "pairwise_order")}
    # nur Paare, in denen eine gestoerte Person vorkommt
    sub = {k: v for k, v in FJ.items() if k[0] in PERT_IDS or k[1] in PERT_IDS}
    a2, b2 = pair_level(FIND_RANK[m], sub), pair_level(FIND_RANK_PERT[m], sub)
    robust[m]["affected_pairs_excellent@10"] = dict(base=a2.get("excellent_candidate@10"), perturbed=b2.get("excellent_candidate@10"))
    robust[m]["affected_pairs_promising@10"] = dict(base=a2.get("promising@10"), perturbed=b2.get("promising@10"))
RESULTS["robustness_missing_fields"] = robust

# --- Stresspaare -------------------------------------------------------------
STRESS = ["syn-pair0003", "syn-pair0297", "syn-pair0102", "syn-pair0206", "syn-pair0104"]
stress = {}
for pid in STRESS:
    p = next(x for x in pairs if x["pair_id"] == pid)
    rows = {}
    if p["context"] == "find":
        for m, t in FIND_RANK.items():
            rec_ab = t[p["a"]]["rec"][p["b"]]
            rec_ba = t[p["b"]]["rec"][p["a"]]
            r_ab, _ = pair_rank(t, p["a"], p["b"])
            r_ba, _ = pair_rank(t, p["b"], p["a"])
            rows[m] = dict(score_ab=rec_ab["score"] if isinstance(rec_ab["score"], (int, float)) else None,
                           eligible_ab=rec_ab["eligible"], eligible_ba=rec_ba["eligible"],
                           rank_ab=r_ab, rank_ba=r_ba, pool=len(ds.find_pool) - 1,
                           confidence=rec_ab.get("confidence"), reasons_ab=rec_ab["reasons"][:4], reasons_ba=rec_ba["reasons"][:3])
    else:
        for m, t in CONNECT_RANK.items():
            rec = t[p["a_listing"]]["rec"][p["b_listing"]]
            r, _ = pair_rank(t, p["a_listing"], p["b_listing"])
            rows[m] = dict(score=rec["score"] if isinstance(rec["score"], (int, float)) else None, eligible=rec["eligible"],
                           rank=r, pool=len(t[p["a_listing"]]["rec"]), confidence=rec.get("confidence"), reasons=rec["reasons"][:4])
    stress[pid] = dict(context=p["context"], reference_class=p["reference_class"], a=p["a"], b=p["b"], models=rows)
RESULTS["stress_pairs"] = stress

# --- Workstyle-Demo (nach der Auswertung, ohne Einfluss) --------------------------
ws = json.load(open(os.path.join(DATA, "workstyle_core.json"), encoding="utf-8"))["workstyle"]
items = {}
_seed = open(os.path.join(REPO, "supabase/migrations/20261113121000_workstyle_v3_item_seed.sql"), encoding="utf-8").read()
for it in json.loads(_seed[_seed.index("$workstyle$[") + 11: _seed.index("]$workstyle$") + 1]):
    if it["usage"] == "core":
        items[it["item_key"]] = it


def band(pid, item):
    v = ws[pid]["answers"][item]["value"]
    if v is None:
        return None
    if "scale" in v:
        return "lower" if v["scale"] <= 2 else "upper" if v["scale"] >= 4 else "middle"
    return "A" if v["optionId"] in ("strong_a", "lean_a") else "B"


def workstyle_points(a, b):
    """Wie der FIND-Vertrag: je Bereich SIMILAR_PATTERN / DISCUSSION_POINT / INSUFFICIENT_DATA. Keine Zahl."""
    out = {}
    for area in ("EVI", "EXP", "EL", "VOICE", "AMB", "ORG"):
        keys = [k for k, it in items.items() if it["area_key"] == area]
        comparable = [(band(a, k), band(b, k)) for k in keys if band(a, k) and band(b, k)]
        if len(comparable) < max(2, math.ceil(len(keys) / 2)):
            out[area] = "INSUFFICIENT_DATA"
            continue
        same = sum(1 for x, y in comparable if x == y)
        opposite = sum(1 for x, y in comparable if {x, y} in ({"lower", "upper"}, {"A", "B"}))
        out[area] = "SIMILAR_PATTERN" if same > len(comparable) / 2 else ("DISCUSSION_POINT" if opposite else "SIMILAR_PATTERN")
    return out


demo = []
for (q, c), p in FJ.items():
    if p["reference_class"] == "excellent_candidate" and q < c:
        r, _ = pair_rank(FIND_RANK["M8"], q, c)
        fa, fb = raw_by_id[q]["find_profile"], raw_by_id[c]["find_profile"]
        if r and r <= 3:
            consent = bool(fa.get("workstyle_discovery_enabled") and fb.get("workstyle_discovery_enabled"))
            demo.append(dict(pair=p["pair_id"], rank=r, both_consented=consent,
                             points=workstyle_points(q, c) if consent else "nicht gezeigt – Zustimmung fehlt"))
    if len(demo) >= 3:
        break
RESULTS["workstyle_demo"] = demo

json.dump(RESULTS, open(os.path.join(HERE, "results_v01.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("FIND-Anfragen", len(ds.find_pool), "| CONNECT-Anfragen", RESULTS["meta"]["connect_queries_ranked"],
      "| gesperrte Lesezugriffe", len(_GUARD["blocked"]))
for m, r in RESULTS["find"].items():
    x = r["ranking"]
    print(f"FIND {m:18} R@10={x.get('Recall@10')} NDCG@10={x.get('NDCG@10')} MRR={x.get('MRR')} pair={x.get('pairwise_order')} "
          f"exc@10={r['pairs'].get('excellent_candidate@10')} excl_top10={r['constraints']['exclude_in_top10']} falsegate={r['false_gates']['rate']}")
for m, r in RESULTS["connect"].items():
    x = r["ranking"]
    print(f"CONN {m:18} R@10={x.get('Recall@10')} NDCG@10={x.get('NDCG@10')} MRR={x.get('MRR')} pair={x.get('pairwise_order')} "
          f"exc@10={r['pairs'].get('excellent_candidate@10')} excl_top10={r['constraints']['exclude_in_top10']}")
