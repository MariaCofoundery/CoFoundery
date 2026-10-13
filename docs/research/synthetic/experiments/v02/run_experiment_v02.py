"""Matching-Experiment 2 (v0.2) – Laufskript.

    python3 docs/research/synthetic/experiments/v02/run_experiment_v02.py --smoke   # nur Lauffaehigkeit + Baseline-Gleichheit
    python3 docs/research/synthetic/experiments/v02/run_experiment_v02.py           # Volllauf

Ablauf wie in Experiment 1: Scoring aller Varianten unter einem Waechter, der jede Datei mit
"reference_" im Namen sperrt; erst danach Referenzpaare/Annotationen laden und auswerten.
Der Rauchtest laedt die Ground Truth gar nicht.
"""
import builtins
import hashlib
import json
import math
import os
import random
import re
import statistics
import sys
import time
from collections import Counter, defaultdict

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.abspath(os.path.join(HERE, ".."))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
DATA = os.path.join(REPO, "docs/research/synthetic")
sys.path.insert(0, HERE)
sys.path.insert(0, PARENT)

import matching_models_v01 as V1  # noqa: E402
import matching_models_v02 as M2  # noqa: E402
import posthoc_v02 as PH  # noqa: E402  (POST-HOC, nicht vorregistriert)

SMOKE = "--smoke" in sys.argv

_real_open = builtins.open
_GUARD = {"on": False, "blocked": []}


def _guarded_open(file, *args, **kwargs):
    if _GUARD["on"] and "reference_" in os.path.basename(str(file)):
        _GUARD["blocked"].append(str(file))
        raise PermissionError(f"Ground Truth während des Scorings gesperrt: {file}")
    return _real_open(file, *args, **kwargs)


builtins.open = _guarded_open


def sha(path):
    return hashlib.sha256(_real_open(path, "rb").read()).hexdigest()


PREREG_FILES = ["matching_models_v02.py", "normalization_v02.py", "connect_stress_v02.json", "README.md"]

# ---------------------------------------------------------------------------
# 1. Laden (unter Waechter)
# ---------------------------------------------------------------------------
_GUARD["on"] = True
t0 = time.time()
profiles = json.load(open(os.path.join(DATA, "profiles.json"), encoding="utf-8"))["profiles"]
stress = json.load(open(os.path.join(HERE, "connect_stress_v02.json"), encoding="utf-8"))
family_of = {}
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s, re.S | re.I):
        for row in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'([a-z0-9_]+)'", m.group(2)):
            family_of[row.group(1)] = row.group(2)
assert len(family_of) == 54

ds = V1.Dataset(profiles, family_of)
ctx = M2.Context(ds)
M2.prepare_priors(ctx)
ds_stress = V1.Dataset(profiles + stress["owners"], family_of)


def perturbed_profiles(seed=7, share=0.25):
    """Identisch zu Experiment 1."""
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


def rank_find(context, name, queries=None, scorer=None):
    out = {}
    pool = context.pool
    for a in (queries or pool):
        rec, elig = {}, []
        for b in pool:
            if b.id == a.id:
                continue
            r = scorer(context, a, b) if scorer else M2.score_find(context, name, a, b)
            rec[b.id] = r
            if r["eligible"]:
                elig.append((b.id, r["score"]))
        elig.sort(key=lambda x: (-x[1], V1.recency_key(x[0])))
        out[a.id] = {"ranked": elig, "rec": rec}
    return out


def rank_connect(dset, name, query_ids=None):
    out = {}
    for sl in dset.listings.values():
        if sl.direction != "seeking" or (query_ids is not None and sl.id not in query_ids):
            continue
        rec, elig = {}, []
        for ol in dset.offers:
            if ol.owner.id == sl.owner.id:
                continue
            r = M2.score_connect(name, sl, ol)
            rec[ol.id] = r
            if r["eligible"]:
                elig.append((ol.id, r["score"]))
        # Gleichstand wie v01 (Score, dann ID absteigend). KORREKTUR nach dem ersten Volllauf, siehe Bericht.
        elig.sort(key=lambda x: (x[1], x[0]), reverse=True)
        out[sl.id] = {"ranked": elig, "rec": rec}
    return out


# ---------------------------------------------------------------------------
# Rauchtest: Lauffaehigkeit und exakte Baseline – ohne Ground Truth
# ---------------------------------------------------------------------------
if SMOKE:
    n = diff = 0
    for a in ds.find_pool:
        for b in ds.find_pool:
            if a.id == b.id:
                continue
            v1, v2 = V1.score_find(ds, "M7", a, b), M2.score_find(ctx, "M7", a, b)
            n += 1
            if v1["score"] != v2["score"] or v1["eligible"] != v2["eligible"]:
                diff += 1
    print(f"FIND Baseline M7: {n} Paare, Abweichungen v01↔v02: {diff}")
    n = diff = 0
    for sl in ds.listings.values():
        if sl.direction != "seeking":
            continue
        for ol in ds.offers:
            if ol.owner.id == sl.owner.id:
                continue
            v1, v2 = V1.score_connect(ds, "M7core", sl, ol), M2.score_connect("M7core", sl, ol)
            n += 1
            if v1["score"] != v2["score"] or v1["eligible"] != v2["eligible"]:
                diff += 1
    print(f"CONNECT Baseline M7core: {n} Paare, Abweichungen v01↔v02: {diff}")
    q = ds.find_pool[:3]
    for name in M2.FIND_VARIANTS:
        rank_find(ctx, name, q)
    some = {l.id for l in list(ds.listings.values()) if l.direction == "seeking"}
    for name in M2.CONNECT_VARIANTS:
        rank_connect(ds, name, set(list(sorted(some))[:3]))
        rank_connect(ds_stress, name, {c["seek"] for c in stress["cases"]})
    print(f"alle {len(M2.FIND_VARIANTS)} FIND- und {len(M2.CONNECT_VARIANTS)} CONNECT-Varianten laufen; {time.time() - t0:.1f}s")
    sys.exit(0)

# ---------------------------------------------------------------------------
# 2. Scoring (unter Waechter)
# ---------------------------------------------------------------------------
FIND_RANK = {name: rank_find(ctx, name) for name in M2.FIND_VARIANTS}
POSTHOC = {"PH1_need_multiplicative": PH.score_ph1}
for _n, _f in POSTHOC.items():
    FIND_RANK[_n] = rank_find(ctx, _n, scorer=_f)
CONNECT_RANK = {name: rank_connect(ds, name) for name in M2.CONNECT_VARIANTS}
STRESS_QUERIES = {c["seek"] for c in stress["cases"]}
STRESS_RANK = {name: rank_connect(ds_stress, name, STRESS_QUERIES) for name in M2.CONNECT_VARIANTS}
pert, PERT_IDS = perturbed_profiles()
ds_pert = V1.Dataset(pert, family_of)
ctx_pert = M2.Context(ds_pert)
M2.prepare_priors(ctx_pert)
ROBUST = ["M7", "G3_breadth_evidence", "D1_neutral_0.5", "D1_neutral_median", "D2_shrink_0.5", "D2_shrink_median",
          "D3_min_evidence", "M7v2a", "M7v2b_blind"]
FIND_RANK_PERT = {name: rank_find(ctx_pert, name) for name in ROBUST}
_GUARD["on"] = False
assert not _GUARD["blocked"], _GUARD["blocked"]
scoring_seconds = round(time.time() - t0, 1)

# ---------------------------------------------------------------------------
# 3. Ground Truth – erst jetzt
# ---------------------------------------------------------------------------
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
ann = json.load(open(os.path.join(DATA, "reference_annotations.json"), encoding="utf-8"))["annotations"]
scen = {pid: a["primary_scenario"] for pid, a in ann.items()}
GAIN = {"excellent_candidate": 3, "promising": 2, "worth_exploring": 1}
REL = {"excellent_candidate", "promising"}
POSITIVE = {"excellent_candidate", "promising", "worth_exploring", "asymmetric"}


def judgments(context, subset=None):
    j = {}
    for p in pairs:
        if p["context"] != context:
            continue
        if subset == "contrast" and p["source"] != "contrast_selection":
            continue
        if subset == "constructed" and p["source"] == "contrast_selection":
            continue
        if context == "find":
            j[(p["a"], p["b"])] = p
            j[(p["b"], p["a"])] = p
        else:
            j[(p["a_listing"], p["b_listing"])] = p
    return j


def dcg(g):
    return sum(x / math.log2(i + 2) for i, x in enumerate(g))


def ranking_metrics(table, judg):
    by_q = defaultdict(dict)
    for (q, c), p in judg.items():
        if p["reference_class"] != "insufficient_data":
            by_q[q][c] = p["reference_class"]
    acc = defaultdict(list)
    for q, js in by_q.items():
        if q not in table:
            continue
        ranked = [c for c, _ in table[q]["ranked"]]
        pos = {c: i for i, c in enumerate(ranked)}
        relevant = {c for c, k in js.items() if k in REL}
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
        recs = table[q]["rec"]
        judged = sorted(js, key=lambda c: (0 if c in pos else 1, pos.get(c, 0), -recs[c]["score"]))
        positives = [c for c in judged if js[c] in GAIN]
        negatives = [c for c in judged if js[c] in ("low_relevance", "exclude")]
        order = {c: i for i, c in enumerate(judged)}
        for pc in positives:
            for nc in negatives:
                acc["pairwise_order"].append(1.0 if order[pc] < order[nc] else 0.0)
    out = {k: round(statistics.mean(v), 4) for k, v in acc.items()}
    out["queries"] = len([q for q in by_q if q in table])
    out["pairwise_comparisons"] = len(acc["pairwise_order"])
    return out


def pessimistic_table(table, judg):
    """Bei Gleichstand stehen beurteilte Positive HINTER allen anderen – zeigt, wie viel aus der Gleichstandsauflösung kommt."""
    out = {}
    for q, t in table.items():
        pos = {c for (qq, c), p in judg.items() if qq == q and p["reference_class"] in GAIN}
        ranked = sorted(t["ranked"], key=lambda x: (-x[1], 1 if x[0] in pos else 0, x[0]))
        out[q] = {"ranked": ranked, "rec": t["rec"]}
    return out


def pair_rank(table, q, c):
    t = table.get(q)
    if not t:
        return None
    for i, (x, _) in enumerate(t["ranked"]):
        if x == c:
            return i + 1
    return None


def pair_level(table, judg, top=10):
    st = defaultdict(list)
    for (q, c), p in judg.items():
        k = p["reference_class"]
        r = pair_rank(table, q, c)
        rec = table.get(q, {}).get("rec", {}).get(c)
        st[f"{k}@{top}"].append(1.0 if (r and r <= top) else 0.0)
        st[f"{k}@5"].append(1.0 if (r and r <= 5) else 0.0)
        st[f"{k}_eligible"].append(1.0 if rec and rec["eligible"] else 0.0)
        if rec and rec.get("confidence") is not None:
            st[f"{k}_low_conf"].append(1.0 if rec["confidence"] < 0.5 else 0.0)
        if rec and rec.get("tier"):
            st[f"{k}_tier2"].append(1.0)
        elif rec is not None:
            st[f"{k}_tier2"].append(0.0)
    return {k: round(statistics.mean(v), 4) for k, v in st.items()}


GT_LOCATION = re.compile(r"Standort|vor Ort|akzeptiert nur (onsite|remote|hybrid|flexible)|regional vor Ort")


def gates(table, judg):
    fg, fg_loc, n_pos = 0, 0, 0
    ex_n = ex_elig = ex_top = loc_n = loc_elig = 0
    reasons = Counter()
    for (q, c), p in judg.items():
        rec = table.get(q, {}).get("rec", {}).get(c)
        if rec is None:
            continue
        if p["reference_class"] in POSITIVE:
            n_pos += 1
            if not rec["eligible"]:
                fg += 1
                for r in rec["reasons"]:
                    reasons[re.sub(r"^[AB]: ", "", r)] += 1
                if any(re.search(r"Ort|Remote", r) for r in rec["reasons"]):
                    fg_loc += 1
        if p["reference_class"] == "exclude":
            ex_n += 1
            is_loc = any(GT_LOCATION.search(r) for r in p["hard_constraint_reasons"])
            loc_n += is_loc
            if rec["eligible"]:
                ex_elig += 1
                loc_elig += is_loc
                r = pair_rank(table, q, c)
                if r and r <= 10:
                    ex_top += 1
    return dict(false_gates=fg, false_gates_location=fg_loc, positives=n_pos, false_gate_reasons=dict(reasons.most_common()),
                exclude_eligible=round(ex_elig / ex_n, 4) if ex_n else None, exclude_in_top10=round(ex_top / ex_n, 4) if ex_n else None,
                location_excludes=loc_n, location_excludes_not_gated=loc_elig)


def exposure(table, pool_ids, top=10):
    cnt = Counter()
    for q, t in table.items():
        for c, _ in t["ranked"][:top]:
            cnt[c] += 1
    return {pid: cnt[pid] / len(table) for pid in pool_ids}


def slot_share(table, group, top):
    tot = hit = 0
    for t in table.values():
        for c, _ in t["ranked"][:top]:
            tot += 1
            hit += c in group
    return round(hit / tot, 4) if tot else None


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


def raw_completeness(p):
    pc, fp = p["person_core"], p["find_profile"] or {}
    return sum(1 for f in [pc["industries"], pc["expertise"], pc["location_region"], pc["remote_mode"], p["capability_entries"],
                           fp.get("search_intent"), fp.get("start_horizon"), fp.get("recent_step"),
                           fp.get("availability_flexibility"), fp.get("must_haves")] if f)


raw_by_id = {p["id"]: p for p in profiles}
pool_ids = [p.id for p in ds.find_pool]
GEN = {pid for pid in pool_ids if scen[pid] == "generalist"}
SPARSE = {pid for pid in pool_ids if scen[pid] == "sparse"}
NORMAL = {pid for pid in pool_ids if scen[pid] == "normal"}
SPEC = {pid for pid in pool_ids if scen[pid] == "specialist"}

FJ, FJc, FJx = judgments("find"), judgments("find", "constructed"), judgments("find", "contrast")
CJ = judgments("connect")

R = {"meta": dict(guard_blocked_reads=_GUARD["blocked"], find_queries=len(ds.find_pool),
                  connect_queries=sum(1 for l in ds.listings.values() if l.direction == "seeking"),
                  stress_cases=len(stress["cases"]), perturbed_profiles=len(PERT_IDS),
                  pool_share_generalists=round(len(GEN) / len(pool_ids), 4), pool_share_sparse=round(len(SPARSE) / len(pool_ids), 4)),
     "find": {}, "connect": {}, "connect_stress": {}}

# Vorregistrierung pruefen
prereg_path = os.path.join(HERE, "preregistration_v02.json")
if os.path.exists(prereg_path):
    prereg = json.load(_real_open(prereg_path, encoding="utf-8"))
    R["meta"]["preregistration"] = {f: dict(registered=prereg["sha256"].get(f), now=sha(os.path.join(HERE, f)),
                                             unchanged=prereg["sha256"].get(f) == sha(os.path.join(HERE, f))) for f in PREREG_FILES}
    R["meta"]["preregistered_at"] = prereg.get("created")

# Baseline-Bezug fuer "false suppression"
base_top10 = {k for k, p in FJ.items() if p["reference_class"] in REL and (pair_rank(FIND_RANK["M7"], *k) or 999) <= 10}

for name, table in FIND_RANK.items():
    ex = exposure(table, pool_ids)
    mean = lambda ids: round(statistics.mean(ex[i] for i in ids), 4) if ids else None
    asym = {"designed": [], "contrast": []}
    for p in pairs:
        if p["context"] != "find" or p["reference_class"] != "asymmetric":
            continue
        d = p["dimensions"]
        qn, qo = (p["a"], p["b"]) if d["A_to_B_need_offer"] != "none" else (p["b"], p["a"])
        r1, r2 = pair_rank(table, qn, qo), pair_rank(table, qo, qn)
        asym["contrast" if p["source"] == "contrast_selection" else "designed"].append((r1 or 999, r2 or 999))
    asym_out = {}
    for k, v in asym.items():
        if v:
            asym_out[k] = dict(n=len(v), median_rank_needing=statistics.median(x for x, _ in v),
                               median_rank_other=statistics.median(y for _, y in v),
                               top10_needing=round(statistics.mean(1.0 if x <= 10 else 0.0 for x, _ in v), 4),
                               top10_other=round(statistics.mean(1.0 if y <= 10 else 0.0 for _, y in v), 4),
                               needing_side_ranked_better=round(statistics.mean(1.0 if x < y else 0.0 for x, y in v), 4))
    now_top10 = {k for k, p in FJ.items() if p["reference_class"] in REL and (pair_rank(table, *k) or 999) <= 10}
    comp = [raw_completeness(raw_by_id[i]) for i in pool_ids]
    R["find"][name] = dict(
        config=M2.FIND_VARIANTS.get(name, "POST-HOC"),
        ranking=ranking_metrics(table, FJ), ranking_pessimistic_ties=ranking_metrics(pessimistic_table(table, FJ), FJ),
        pairs_pessimistic_ties=pair_level(pessimistic_table(table, FJ), FJ), ranking_constructed=ranking_metrics(table, FJc), ranking_contrast=ranking_metrics(table, FJx),
        pairs=pair_level(table, FJ), pairs_constructed=pair_level(table, FJc), pairs_contrast=pair_level(table, FJx),
        gates=gates(table, FJ),
        generalists=dict(exposure_generalist=mean(GEN), exposure_normal=mean(NORMAL),
                         ratio=round(mean(GEN) / mean(NORMAL), 3) if mean(NORMAL) else None,
                         slot_share_top5=slot_share(table, GEN, 5), slot_share_top10=slot_share(table, GEN, 10),
                         exposure_specialist=mean(SPEC)),
        sparse=dict(exposure_sparse=mean(SPARSE), exposure_normal=mean(NORMAL),
                    ratio=round(mean(SPARSE) / mean(NORMAL), 3) if mean(NORMAL) else None,
                    slot_share_top5=slot_share(table, SPARSE, 5), slot_share_top10=slot_share(table, SPARSE, 10),
                    spearman_exposure_vs_completeness=spearman(comp, [ex[i] for i in pool_ids])),
        asymmetric=asym_out,
        suppression=dict(baseline_positive_top10=len(base_top10), lost_vs_baseline=len(base_top10 - now_top10),
                         gained_vs_baseline=len(now_top10 - base_top10)),
    )
    if name in M2.FIND_VARIANTS and M2.FIND_VARIANTS[name]["location"] == "L3":
        unc = [table[q]["rec"][c]["location_confidence"] for q, t in table.items() for c, _ in t["ranked"][:10]]
        R["find"][name]["location_confidence_top10"] = dict(mean=round(statistics.mean(unc), 4),
                                                             share_uncertain=round(statistics.mean(1.0 if u < 1 else 0.0 for u in unc), 4))

for name, table in CONNECT_RANK.items():
    spec_ranks = [pair_rank(table, p["a_listing"], p["b_listing"]) for p in pairs
                  if p["source"] == "designed_specialist" and p["reference_class"] == "excellent_candidate"]
    R["connect"][name] = dict(config=M2.CONNECT_VARIANTS[name], ranking=ranking_metrics(table, CJ), pairs=pair_level(table, CJ),
                              ranking_pessimistic_ties=ranking_metrics(pessimistic_table(table, CJ), CJ),
                              pairs_pessimistic_ties=pair_level(pessimistic_table(table, CJ), CJ),
                              ties=dict(share_queries_with_tie_at_rank10=round(statistics.mean(
                                  1.0 if len(t["ranked"]) > 10 and t["ranked"][9][1] == t["ranked"][10][1] else 0.0
                                  for t in table.values()), 4)),
                              gates=gates(table, CJ), specialist_ranks=spec_ranks)

# CONNECT-Stressfaelle
for name, table in STRESS_RANK.items():
    out = []
    for case in stress["cases"]:
        t = table[case["seek"]]
        rank = {c: i + 1 for i, (c, _) in enumerate(t["ranked"])}
        rk = lambda x: rank.get(x, 10 ** 6)
        sc = {c: s_ for c, s_ in t["ranked"]}
        # STRENG (Korrektur nach dem ersten Volllauf): kein Bestehen durch Gleichstand.
        pess = lambda x: (1 + sum(1 for c, s_ in t["ranked"] if c != x and s_ >= sc[x])) if x in sc else 10 ** 6
        opt = lambda x: (1 + sum(1 for c, s_ in t["ranked"] if c != x and s_ > sc[x])) if x in sc else 10 ** 6
        checks = []
        for crit in case["criteria"]:
            kind = crit[0]
            if kind == "order":
                a_, b_ = crit[1], crit[2]
                ok = a_ in sc and (b_ not in sc or sc[a_] > sc[b_])
            elif kind == "top":
                ok = pess(crit[1]) <= crit[2]
            elif kind == "not_top":
                ok = opt(crit[1]) > crit[2]
            elif kind == "gated":
                ok = not t["rec"][crit[1]]["eligible"]
            elif kind == "eligible":
                ok = t["rec"][crit[1]]["eligible"]
            checks.append(dict(criterion=crit, ok=ok))
        out.append(dict(case=case["case"], kind=case["kind"], passed=all(c["ok"] for c in checks), checks=checks,
                        ranks={o: rank.get(o) for o in case["expect"]},
                        scores={o: (round(sc[o], 4) if o in sc else None) for o in case["expect"]}))
    R["connect_stress"][name] = dict(passed=sum(c["passed"] for c in out), of=len(out), cases=out)

# Diagnose 1: welche L1-Regel sperrt positive Paare (die M7 zulaesst)?
diag = Counter()
for (q, c), p in FJ.items():
    if p["reference_class"] not in POSITIVE:
        continue
    r7, rl = FIND_RANK["M7"][q]["rec"][c], FIND_RANK["L1_strict"][q]["rec"][c]
    if r7["eligible"] and not rl["eligible"]:
        a_, b_ = ds.people[q], ds.people[c]
        combo = "↔".join(sorted([a_.remote or "?", b_.remote or "?"]))
        pa, pb = M2.N2.place(a_.location_raw, "dict"), M2.N2.place(b_.location_raw, "dict")
        same = M2.N2.same_place(pa, pb)
        diag[f"{combo} | gleicher Ort: {same}"] += 1
R["diagnostics"] = {"L1_false_gates_by_rule": dict(diag.most_common())}

# Diagnose 2: Woher kommt die Exposition der Generalisten (M7)?
def appearance_profile(table, group):
    rec = defaultdict(list)
    for q, t in table.items():
        A = ds.people[q]
        for c, _ in t["ranked"][:10]:
            if c not in group:
                continue
            B = ds.people[c]
            rec["covers_sought_role"].append(1.0 if set(A.seek) & set(B.own) else 0.0)
            rec["seeks_query_role"].append(1.0 if set(B.seek) & set(A.own) else 0.0)
            rec["query_owns_tech"].append(1.0 if "tech" in A.own else 0.0)
    return {k: round(statistics.mean(v), 4) for k, v in rec.items()} | {"appearances": len(rec["covers_sought_role"])}
R["diagnostics"]["generalist_appearances_M7"] = appearance_profile(FIND_RANK["M7"], GEN)
R["diagnostics"]["normal_appearances_M7"] = appearance_profile(FIND_RANK["M7"], NORMAL)
R["diagnostics"]["own_roles_mean"] = dict(generalist=round(statistics.mean(len(ds.people[i].own) for i in GEN), 2),
                                          normal=round(statistics.mean(len(ds.people[i].own) for i in NORMAL), 2))

# Robustheit
R["robustness"] = {}
for name in ROBUST:
    a, b = R["find"][name]["ranking"], ranking_metrics(FIND_RANK_PERT[name], FJ)
    sub = {k: v for k, v in FJ.items() if k[0] in PERT_IDS or k[1] in PERT_IDS}
    pa, pb = pair_level(FIND_RANK[name], sub), pair_level(FIND_RANK_PERT[name], sub)
    R["robustness"][name] = {k: dict(base=a.get(k), perturbed=b.get(k)) for k in ("Recall@10", "NDCG@10", "MRR", "pairwise_order")}
    R["robustness"][name]["affected_excellent@10"] = dict(base=pa.get("excellent_candidate@10"), perturbed=pb.get("excellent_candidate@10"))
    R["robustness"][name]["affected_promising@10"] = dict(base=pa.get("promising@10"), perturbed=pb.get("promising@10"))

# Stresspaare aus Experiment 1
R["stress_pairs_v01"] = {}
for pid in ["syn-pair0003", "syn-pair0297", "syn-pair0102", "syn-pair0206", "syn-pair0104"]:
    p = next(x for x in pairs if x["pair_id"] == pid)
    rows = {}
    if p["context"] == "find":
        for name, t in FIND_RANK.items():
            rec = t[p["a"]]["rec"][p["b"]]
            rows[name] = dict(eligible=rec["eligible"], rank_ab=pair_rank(t, p["a"], p["b"]), rank_ba=pair_rank(t, p["b"], p["a"]),
                              reasons=rec["reasons"][:3])
    else:
        for name, t in CONNECT_RANK.items():
            rec = t[p["a_listing"]]["rec"][p["b_listing"]]
            rows[name] = dict(eligible=rec["eligible"], rank=pair_rank(t, p["a_listing"], p["b_listing"]), reasons=rec["reasons"][:3])
    R["stress_pairs_v01"][pid] = dict(reference_class=p["reference_class"], models=rows)

json.dump(R, _real_open(os.path.join(HERE, "results_v02.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"fertig in {time.time() - t0:.1f}s; gesperrte Lesezugriffe: {len(_GUARD['blocked'])}")
