"""Matching-Experiment 3 (v0.3) – Laufskript.

    python3 .../v03/run_experiment_v03.py --preregister   # 1. Festlegung schreiben (einmalig), Hash ausgeben
    python3 .../v03/run_experiment_v03.py                 # 2. Lauf: prueft Festlegung, scort, dann erst Referenzen laden
    --unlock-holdout                                      #    in v03 gesperrt -> Abbruch
    --smoke                                               # nur Lauffaehigkeit + Baseline-Gleichheit, keine Referenzen
    --dry-run DIR                                         # Testlauf mit Platzhalter-Labels aus DIR; schreibt nur nach DIR

Reihenfolge technisch erzwungen:
  - Ohne preregistration_v03.json oder bei abweichendem Inhalt/Hash: Abbruch.
  - Waehrend des Scorings blockiert ein Waechter jede Datei mit "reference_" oder "silver_labels" im Namen.
  - Silver Labels nur Development; Holdout-Zeilen werden vor dem Lesen verworfen.
  - Die Referenzpaare der 40 Holdout-Stichprobenpaare fliegen auch aus der SYNTHETIC-Auswertung.
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
from collections import Counter, defaultdict

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
DATA = os.path.join(REPO, "docs/research/synthetic")
V02 = os.path.join(DATA, "experiments", "v02")
sys.path.insert(0, HERE)

if "--unlock-holdout" in sys.argv:
    sys.exit("v03: --unlock-holdout ist gesperrt. HOLDOUT STATUS: UNOPENED.")

import matching_models_v03 as MM  # noqa: E402
import silver_reference_v03 as SR  # noqa: E402
V1, M2 = MM.V1, MM.M2

_real_open = builtins.open
_GUARD = {"on": False, "blocked": []}


def _guarded_open(file, *a, **k):
    name = os.path.basename(str(file))
    if _GUARD["on"] and ("reference_" in name or "silver_labels" in name):
        _GUARD["blocked"].append(str(file))
        raise PermissionError(f"Referenz während des Scorings gesperrt: {file}")
    return _real_open(file, *a, **k)


builtins.open = _guarded_open


def sha(path):
    return hashlib.sha256(_real_open(path, "rb").read()).hexdigest()


# ---------------------------------------------------------------------------
# 1. Vorab-Festlegung
# ---------------------------------------------------------------------------
PREREG_PATH = os.path.join(HERE, "preregistration_v03.json")
HASHED = ["matching_models_v03.py", "normalization_v03.py", "silver_reference_v03.py", "silver_adjudication_v03.json",
          "run_experiment_v03.py"]
FROZEN_UPSTREAM = {"../matching_models_v01.py": None, "../normalization_v01.py": None, "../v02/matching_models_v02.py": None,
                   "../v02/normalization_v02.py": None, "../v02/posthoc_v02.py": None, "../v02/connect_stress_v02.json": None,
                   "../v02/human_labels_split_key_v02.json": None}

DECISION = dict(
    find=dict(
        primary="Spearman(Modellscore, SILVER Consensus Q1) über alle Development-FIND-Paare; nicht zugelassene Paare = −1",
        rule=["Δ Spearman Q1 (Consensus) ≥ +0,03 gegenüber F0",
              "Spearman Q2 (A→B) und Q3 (B→A) je ≥ F0 − 0,03",
              "Gate-F1 gegen Q4 (yes = Ausschluss) ≥ F0 − 0,02",
              "SYNTHETIC: Anteil konstruierter asymmetrischer Paare, die bei der Seite ohne Bedarf in den Top 10 stehen, ≤ F0 − 0,10",
              "SYNTHETIC: Kontrast-NDCG@10 ≥ F0 − 0,05"],
        all_required=True),
    connect=dict(
        primary="Spearman(Modellscore, SILVER Consensus Q1) über alle Development-CONNECT-Paare; nicht zugelassene Paare = −1",
        rule=["Δ Spearman Q1 (Consensus) ≥ +0,03 gegenüber C0",
              "Q2-Gruppen: Mittelwert yes > maybe > no (soweit Gruppen vorhanden) UND AUC(yes vs. no) ≥ C0 − 0,02",
              "Gate-F1 gegen Q3 ≥ C0 − 0,02",
              "Anteil Anfragen mit Gleichstand an Rang 10 ≤ 0,5 × C0",
              "SYNTHETIC: strenge Stressfälle bestanden ≥ C0 UND pessimistischer Recall@10 ≥ C0 − 0,05"],
        all_required=True),
)
METRICS = dict(
    silver_find=dict(primary="Spearman Q1 (Consensus)", secondary=["Kendall τ-b Q1", "NDCG Q1 (Gewinn = Q1 − 1, Gleichstand pessimistisch)",
                     "paarweise Ordnung Q1 (Gleichstand = falsch; Gleichstandsanteil berichtet)", "Spearman A→B vs Q2, B→A vs Q3",
                     "Gate vs Q4: Precision/Recall/Spezifität/F1 (positiv = Ausschluss; 'unclear' ausgenommen)",
                     "Q5 Sicherheit: nur deskriptiv (Spearman mit Modell-Confidence)", "alles zusätzlich gegen R1 und R2 einzeln"]),
    silver_connect=dict(primary="Spearman Q1 (Consensus)", secondary=["Kendall τ-b", "NDCG", "paarweise Ordnung", "Scoreverteilung je Q2 yes/maybe/no, AUC yes vs no",
                        "Gate vs Q3", "Q4 nur deskriptiv", "gegen R1 und R2 einzeln"]),
    synthetic_find=["Recall@10", "NDCG@10 (wie gerankt und pessimistisch)", "excellent/promising@10", "asymmetrisch: Seite mit/ohne Bedarf in Top 10",
                    "exclude in Top 10 / zugelassen", "konstruiert vs. Kontrast", "Generalisten/Sparse-Exposition"],
    synthetic_connect=["Recall@10 und NDCG@10 (v01-Gleichstand und pessimistisch)", "strenge Stressfälle",
                       "Gleichstände an Rang 1/5/10, mittlere Größe identischer Scores in den Top 10"],
)


def prereg_content():
    return dict(
        experiment="matching v0.3",
        references=dict(SYNTHETIC="konstruktiv erzeugte Ground Truth des synthetischen Datensatzes",
                        SILVER="qualitative Gegenprüfung durch zwei getrennte Modell-Review-Pässe (SILVER_R1, SILVER_R2); keine menschliche Ground Truth"),
        silver_files=dict(R1="../v02/silver_labels_R1_v02.csv", R2="../v02/silver_labels_R2_v02.csv"),
        holdout="UNOPENED – Holdout-Zeilen werden vor dem Lesen verworfen; Referenzpaare der Holdout-Stichprobe auch aus SYNTHETIC ausgeschlossen",
        find_models=MM.FIND_MODELS, connect_models=MM.CONNECT_MODELS,
        formulas=dict(
            ph1_directional="rel(X→Y) = need(X→Y) × (0,5 + 0,5 × mod); mod = Mittel bekannter {context, intent}, sonst 0,5",
            need="v01: Mittel(Rollen-Abdeckung, Mittel der besten Abdeckung je abzugebendem Bereich); own≥3:1, contribute≥3:0,6, own<3:0,4, unklar≥3:0,3, grow_into/prefer_*:0, Familie ×0,5",
            mutual=dict(min75="0,75·min + 0,25·mittel", min60="0,60·min + 0,40·mittel (= M7-Form)"),
            f1="posthoc_v02.score_ph1 unverändert: need_mutual(0,6·min+0,4·mittel) × (0,5+0,5·mod), M7-Gate",
            c1=dict(weights=MM.C1_WEIGHTS, expertise_only=MM.C1_EXPERTISE_ONLY, no_topic_cap=MM.C1_NO_TOPIC_CAP, text_min=MM.C1_TEXT_MIN,
                    text="IDF-gewichteter Anteil der Gesuch-Token (Titel+Beschreibung+Themen), die im Angebot vorkommen"),
            c2=dict(weights=MM.C2_WEIGHTS, aspect_values=MM.C2_ASPECT, no_coverage_cap=MM.C2_NO_COVERAGE_CAP, coverage_min=MM.C2_COVERAGE_MIN,
                    fallback_needs=MM.C2_FALLBACK_NEEDS, specificity="Bedarfsgewicht = mittlere IDF seiner Token (min 0,05)"),
            missing="Relevanz nur aus vorhandener Evidenz; fehlende Branche zählt in C1/C2 als 0 (kein Beitrag, nicht herausgerechnet); PH1 bewusst unverändert (mod unbekannt = 0,5); Confidence getrennt",
        ),
        gates=dict(
            find_v03="Must-haves beider Seiten (Rolle, Stunden, Arbeitsweise, Suchstand, Start, Bereich, Expertise); Ort nur bei konkretem Orts-Must-have + Gegenüber eindeutig anderswo (Platzhalter erfüllt keinen Ort) + Must-Seite nicht remote/flexibel und lässt remote nicht zu; beide onsite an verschiedenen Orten. Unbekannt = uncertain, nie Konflikt. Kein Bonus.",
            connect_v03="Angebot aktiv, nicht abgelaufen, Profil aktiv; regional+onsite mit konkretem Ort verlangt denselben Ort beim Gegenüber (Platzhalter erfüllt nicht); unbekannt = uncertain",
            f0_f1="M7-Gate unverändert", c0="M7core-Gate unverändert"),
        normalization=dict(modes={k: v for k, v in MM.N3.MODES.items()}, text="IDF über alle Einträge, Token wie generic2, Mindestlänge 3",
                           note="keine neuen Synonyme, kein LLM, keine Embeddings"),
        consensus=dict(ordinal="Mittelwert R1/R2; adjudiziert ersetzt", categorical="gleich→Wert; mit maybe/unclear→maybe/unclear; yes/no→nur adjudiziert",
                       adjudication="nur RP-081 (silver_adjudication_v03.json)"),
        metrics=METRICS, decision_rules=DECISION,
        hashes={f: sha(os.path.join(HERE, f)) for f in HASHED},
        frozen_upstream={f: sha(os.path.join(HERE, f)) for f in FROZEN_UPSTREAM},
    )


content = prereg_content()
SMOKE = "--smoke" in sys.argv
DRY = sys.argv[sys.argv.index("--dry-run") + 1] if "--dry-run" in sys.argv else None
SILVER_DIR = DRY or V02
if "--preregister" in sys.argv:
    if os.path.exists(PREREG_PATH):
        sys.exit("preregistration_v03.json existiert bereits – wird nicht überschrieben.")
    blob = json.dumps(content, ensure_ascii=False, indent=1, sort_keys=True)
    _real_open(PREREG_PATH, "w", encoding="utf-8").write(blob)
    print("Vorab-Festlegung geschrieben. SHA-256:", sha(PREREG_PATH))
    sys.exit(0)

if SMOKE or DRY:
    PREREG_SHA = "(Testlauf ohne Festlegung)"
elif not os.path.exists(PREREG_PATH):
    sys.exit("Keine preregistration_v03.json – zuerst --preregister.")
else:
    stored = json.load(_real_open(PREREG_PATH, encoding="utf-8"))
if not (SMOKE or DRY) and json.dumps(stored, sort_keys=True, ensure_ascii=False) != json.dumps(json.loads(json.dumps(content, ensure_ascii=False)), sort_keys=True, ensure_ascii=False):
    diff = [k for k in set(stored) | set(content) if json.dumps(stored.get(k), sort_keys=True, ensure_ascii=False)
            != json.dumps(json.loads(json.dumps(content.get(k), ensure_ascii=False)), sort_keys=True, ensure_ascii=False)]
    sys.exit(f"Festlegung weicht ab ({diff}). Abbruch.")
if not (SMOKE or DRY):
    PREREG_SHA = sha(PREREG_PATH)

# ---------------------------------------------------------------------------
# 2. Scoring (Referenzen gesperrt)
# ---------------------------------------------------------------------------
_GUARD["on"] = True
profiles = json.load(open(os.path.join(DATA, "profiles.json"), encoding="utf-8"))["profiles"]
stress = json.load(open(os.path.join(V02, "connect_stress_v02.json"), encoding="utf-8"))
family_of = {}
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s_ = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s_, re.S | re.I):
        for row in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'([a-z0-9_]+)'", m.group(2)):
            family_of[row.group(1)] = row.group(2)
ds = V1.Dataset(profiles, family_of)
ctx = M2.Context(ds)
ds_stress = V1.Dataset(profiles + stress["owners"], family_of)
cctx, cctx_stress = MM.ConnectContext(ds), MM.ConnectContext(ds_stress)


def rank_find(context, name):
    out = {}
    for a in context.pool:
        rec = {}
        for b in context.pool:
            if b.id != a.id:
                rec[b.id] = MM.score_find(context, name, a, b)
        elig = sorted(((c, r["score"]) for c, r in rec.items() if r["eligible"]), key=lambda x: (-x[1], V1.recency_key(x[0])))
        out[a.id] = {"ranked": elig, "rec": rec}
    return out


def rank_connect(cc, name, only=None):
    out = {}
    for sl in cc.ds.listings.values():
        if sl.direction != "seeking" or (only is not None and sl.id not in only):
            continue
        rec = {ol.id: MM.score_connect(cc, name, sl, ol) for ol in cc.ds.offers if ol.owner.id != sl.owner.id}
        elig = sorted(((c, r["score"]) for c, r in rec.items() if r["eligible"]), key=lambda x: (x[1], x[0]), reverse=True)
        out[sl.id] = {"ranked": elig, "rec": rec}
    return out


if SMOKE:
    d1 = sum(1 for a in ds.find_pool for b in ds.find_pool if a.id != b.id and
             (MM.score_find(ctx, "F0_M7", a, b)["score"], MM.score_find(ctx, "F0_M7", a, b)["eligible"]) !=
             (V1.score_find(ds, "M7", a, b)["score"], V1.score_find(ds, "M7", a, b)["eligible"]))
    d2 = sum(1 for sl in ds.listings.values() if sl.direction == "seeking" for ol in ds.offers if ol.owner.id != sl.owner.id
             and (MM.score_connect(cctx, "C0_M7core", sl, ol)["score"], MM.score_connect(cctx, "C0_M7core", sl, ol)["eligible"])
             != (V1.score_connect(ds, "M7core", sl, ol)["score"], V1.score_connect(ds, "M7core", sl, ol)["eligible"]))
    d3 = sum(1 for a in ds.find_pool for b in ds.find_pool if a.id != b.id and
             MM.score_find(ctx, "F1_PH1_exact", a, b)["score"] != MM.PH.score_ph1(ctx, a, b)["score"])
    for n in MM.FIND_MODELS:
        for a in ds.find_pool[:3]:
            for b in ds.find_pool:
                if a.id != b.id:
                    MM.score_find(ctx, n, a, b)
    for n in MM.CONNECT_MODELS:
        rank_connect(cctx_stress, n, {c["seek"] for c in stress["cases"]})
    print(f"Rauchtest: F0≠M7: {d1} | C0≠M7core: {d2} | F1≠PH1: {d3} | alle Modelle laufen | gesperrte Zugriffe: {len(_GUARD['blocked'])}")
    sys.exit(0)
FIND_RANK = {n: rank_find(ctx, n) for n in MM.FIND_MODELS}
CONNECT_RANK = {n: rank_connect(cctx, n) for n in MM.CONNECT_MODELS}
STRESS_RANK = {n: rank_connect(cctx_stress, n) for n in MM.CONNECT_MODELS}       # alle Gesuche, Pool inkl. Stress-Angebote


def perturbed(seed=7, share=0.25):
    rnd = random.Random(seed)
    out = json.loads(json.dumps(profiles))
    ids = sorted(p["id"] for p in out if p["find_profile"] and p["find_profile"]["status"] == "active")
    hit = set(rnd.sample(ids, int(len(ids) * share)))
    for p in out:
        if p["id"] in hit:
            p["person_core"]["industries"], p["person_core"]["expertise"] = [], []
            p["person_core"]["location_region"], p["person_core"]["remote_mode"] = None, None
            p["find_profile"]["search_intent"], p["find_profile"]["start_horizon"] = None, None
    return out, hit


pert, PERT = perturbed()
ctx_pert = M2.Context(V1.Dataset(pert, family_of))
FIND_RANK_PERT = {n: rank_find(ctx_pert, n) for n in MM.FIND_MODELS}
_GUARD["on"] = False
assert not _GUARD["blocked"], _GUARD["blocked"]

# Technische Kontrolle (vorab angekuendigt): F1 muss exakt posthoc_v02 entsprechen
f1_check = all(FIND_RANK["F1_PH1_exact"][a.id]["rec"][b.id]["score"] == MM.PH.score_ph1(ctx, a, b)["score"]
               for a in ds.find_pool[:20] for b in ds.find_pool if a.id != b.id)

# ---------------------------------------------------------------------------
# 3. Referenzen – erst jetzt
# ---------------------------------------------------------------------------
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
ann = json.load(open(os.path.join(DATA, "reference_annotations.json"), encoding="utf-8"))["annotations"]
split = SR.split_key()
HOLD_PAIRS, HOLD_CASES = SR.holdout_pair_ids(split)
pairs_dev = [p for p in pairs if p["pair_id"] not in HOLD_PAIRS]
r1, drop1 = SR.load_silver(os.path.join(SILVER_DIR, "silver_labels_R1_v02.csv"), split)
r2, drop2 = SR.load_silver(os.path.join(SILVER_DIR, "silver_labels_R2_v02.csv"), split)
adj = SR.adjudications()
cons, cons_notes = SR.consensus(r1, r2, adj)
TARGET = SR.targets(split, pairs=pairs, stress=stress)

# ---------------------------------------------------------------------------
# Hilfsfunktionen Auswertung
# ---------------------------------------------------------------------------
GAIN = {"excellent_candidate": 3, "promising": 2, "worth_exploring": 1}
REL = {"excellent_candidate", "promising"}
POSITIVE = {"excellent_candidate", "promising", "worth_exploring", "asymmetric"}


def rnd4(x):
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
    if len(x) < 3:
        return None
    rx, ry = ranks_avg(x), ranks_avg(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return rnd4(num / den) if den else None


def kendall_b(x, y):
    n = len(x)
    c = d = tx = ty = 0
    for i in range(n):
        for j in range(i + 1, n):
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
    return rnd4((c - d) / den) if den else None


def ndcg_global(scores, gains):
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], gains[i]))      # Gleichstand pessimistisch
    dcg = sum(gains[i] / math.log2(k + 2) for k, i in enumerate(order))
    ideal = sum(g / math.log2(k + 2) for k, g in enumerate(sorted(gains, reverse=True)))
    return rnd4(dcg / ideal) if ideal else None


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
    return dict(accuracy=rnd4(ok / n) if n else None, tie_share=rnd4(ties / n) if n else None, comparisons=n)


def classify(pred_pos, truth_pos):
    tp = sum(1 for p, t in zip(pred_pos, truth_pos) if p and t)
    fp = sum(1 for p, t in zip(pred_pos, truth_pos) if p and not t)
    fn = sum(1 for p, t in zip(pred_pos, truth_pos) if not p and t)
    tn = sum(1 for p, t in zip(pred_pos, truth_pos) if not p and not t)
    prec = tp / (tp + fp) if tp + fp else None
    rec = tp / (tp + fn) if tp + fn else None
    spec = tn / (tn + fp) if tn + fp else None
    f1 = 2 * prec * rec / (prec + rec) if prec and rec else (0.0 if (tp + fp) and (tp + fn) else None)
    return dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=rnd4(prec), recall=rnd4(rec), specificity=rnd4(spec), f1=rnd4(f1))


def ranking_score(rec):
    return rec["score"] if rec["eligible"] else -1.0


# ---------------------------------------------------------------------------
# 4a. SILVER DEVELOPMENT – FIND
# ---------------------------------------------------------------------------
def labels(source, code, q):
    v = source.get(code, {}).get(q)
    if source is cons:
        return v
    try:
        return float(v)
    except (TypeError, ValueError):
        return v or None


SOURCES = {"consensus": cons, "R1": r1, "R2": r2}
find_codes = sorted(c for c, t in TARGET.items() if t["context"] == "find" and c in cons)
conn_codes = sorted(c for c, t in TARGET.items() if t["context"] == "connect" and c in cons)
R = dict(meta=dict(preregistration_sha256=PREREG_SHA, holdout_status="UNOPENED", guard_blocked_reads=_GUARD["blocked"],
                   silver_rows_R1=len(r1), silver_rows_R2=len(r2), silver_rows_dropped_not_development=dict(R1=drop1, R2=drop2),
                   silver_find_pairs=len(find_codes), silver_connect_pairs=len(conn_codes), consensus_notes=cons_notes,
                   synthetic_pairs_used=len(pairs_dev), synthetic_pairs_excluded_holdout=len(pairs) - len(pairs_dev),
                   stress_cases_excluded_holdout=sorted(HOLD_CASES), f1_equals_posthoc_ph1=f1_check),
         silver_find={}, silver_connect={}, synthetic_find={}, synthetic_connect={}, diagnostics={})

for name, table in FIND_RANK.items():
    out = {}
    recs = {c: table[TARGET[c]["a"]]["rec"][TARGET[c]["b"]] for c in find_codes}
    for src_name, src in SOURCES.items():
        codes = [c for c in find_codes if labels(src, c, "find_q1_gespraech") is not None]
        sc = [ranking_score(recs[c]) for c in codes]
        q1 = [labels(src, c, "find_q1_gespraech") for c in codes]
        res = dict(n=len(codes), spearman_q1=spearman(sc, q1), kendall_q1=kendall_b(sc, q1),
                   ndcg_q1=ndcg_global(sc, [v - 1 for v in q1]), pairwise_q1=pairwise(sc, q1))
        for q, idx in (("find_q2_a_to_b", 0), ("find_q3_b_to_a", 1)):
            cc = [c for c in find_codes if labels(src, c, q) is not None]
            res[f"spearman_{q[5:7]}"] = spearman([recs[c]["directed"][idx] if recs[c]["directed"][idx] is not None else 0.0 for c in cc],
                                                [labels(src, c, q) for c in cc])
        gc = [c for c in find_codes if labels(src, c, "find_q4_ausschluss") in ("yes", "no")]
        res["gate_vs_q4"] = classify([not recs[c]["eligible"] for c in gc], [labels(src, c, "find_q4_ausschluss") == "yes" for c in gc])
        res["gate_vs_q4"]["unclear_or_missing_excluded"] = len(find_codes) - len(gc)
        cq = [c for c in find_codes if labels(src, c, "find_q5_sicherheit") is not None]
        res["descriptive_confidence_spearman_q5"] = spearman([recs[c]["confidence"] for c in cq], [labels(src, c, "find_q5_sicherheit") for c in cq])
        out[src_name] = res
    # Asymmetrie in Silver: |Q2 − Q3| >= 2
    asym = [c for c in find_codes if cons[c].get("find_q2_a_to_b") is not None and cons[c].get("find_q3_b_to_a") is not None
            and abs(cons[c]["find_q2_a_to_b"] - cons[c]["find_q3_b_to_a"]) >= 2]
    mutual_hi = [c for c in find_codes if min(cons[c].get("find_q2_a_to_b") or 0, cons[c].get("find_q3_b_to_a") or 0) >= 4]
    all_scores = sorted((ranking_score(recs[c]) for c in find_codes), reverse=True)
    pos = lambda c: 1 + sum(1 for s in all_scores if s > ranking_score(recs[c]))
    out["silver_asymmetry"] = dict(
        n_asymmetric=len(asym), n_mutual_high=len(mutual_hi),
        mean_score_asymmetric=rnd4(statistics.mean(ranking_score(recs[c]) for c in asym)) if asym else None,
        mean_score_mutual_high=rnd4(statistics.mean(ranking_score(recs[c]) for c in mutual_hi)) if mutual_hi else None,
        mean_q1_asymmetric=rnd4(statistics.mean(cons[c]["find_q1_gespraech"] for c in asym)) if asym else None,
        mean_q1_mutual_high=rnd4(statistics.mean(cons[c]["find_q1_gespraech"] for c in mutual_hi)) if mutual_hi else None,
        asymmetric_above_median_rank=rnd4(statistics.mean(1.0 if pos(c) <= len(find_codes) / 2 else 0.0 for c in asym)) if asym else None,
        cases=[dict(pair_code=c, q1=cons[c]["find_q1_gespraech"], q2=cons[c]["find_q2_a_to_b"], q3=cons[c]["find_q3_b_to_a"],
                    score=rnd4(ranking_score(recs[c])), eligible=recs[c]["eligible"],
                    directed=[rnd4(x) for x in recs[c]["directed"]], position_in_silver_set=pos(c)) for c in asym])
    out["gate_states"] = dict(Counter(recs[c]["gate_state"] for c in find_codes))
    R["silver_find"][name] = out

# ---------------------------------------------------------------------------
# 4b. SILVER DEVELOPMENT – CONNECT
# ---------------------------------------------------------------------------
def connect_rec(name, code):
    t = TARGET[code]
    return STRESS_RANK[name][t["seek"]]["rec"][t["offer"]]


for name in MM.CONNECT_MODELS:
    out = {}
    recs = {c: connect_rec(name, c) for c in conn_codes}
    for src_name, src in SOURCES.items():
        codes = [c for c in conn_codes if labels(src, c, "connect_q1_deckung") is not None]
        sc = [ranking_score(recs[c]) for c in codes]
        q1 = [labels(src, c, "connect_q1_deckung") for c in codes]
        res = dict(n=len(codes), spearman_q1=spearman(sc, q1), kendall_q1=kendall_b(sc, q1),
                   ndcg_q1=ndcg_global(sc, [v - 1 for v in q1]), pairwise_q1=pairwise(sc, q1))
        groups = defaultdict(list)
        for c in conn_codes:
            g = labels(src, c, "connect_q2_anzeigen")
            if g in ("yes", "maybe", "no"):
                groups[g].append(ranking_score(recs[c]))
        res["q2_groups"] = {g: dict(n=len(v), mean=rnd4(statistics.mean(v)), median=rnd4(statistics.median(v)),
                                    min=rnd4(min(v)), max=rnd4(max(v))) for g, v in groups.items() if v}
        y, n_ = groups.get("yes", []), groups.get("no", [])
        res["q2_auc_yes_vs_no"] = rnd4(sum(1.0 if a > b else 0.0 for a in y for b in n_) / (len(y) * len(n_))) if y and n_ else None
        res["q2_auc_ties"] = rnd4(sum(1.0 if a == b else 0.0 for a in y for b in n_) / (len(y) * len(n_))) if y and n_ else None
        means = [res["q2_groups"][g]["mean"] for g in ("yes", "maybe", "no") if g in res["q2_groups"]]
        res["q2_monotonic"] = all(a > b for a, b in zip(means, means[1:]))
        gc = [c for c in conn_codes if labels(src, c, "connect_q3_ausschluss") in ("yes", "no")]
        res["gate_vs_q3"] = classify([not recs[c]["eligible"] for c in gc], [labels(src, c, "connect_q3_ausschluss") == "yes" for c in gc])
        cq = [c for c in conn_codes if labels(src, c, "connect_q4_sicherheit") is not None]
        res["descriptive_confidence_spearman_q4"] = spearman([recs[c]["confidence"] for c in cq], [labels(src, c, "connect_q4_sicherheit") for c in cq])
        out[src_name] = res
    out["score_ties_in_silver_set"] = rnd4(1 - len({round(ranking_score(recs[c]), 9) for c in conn_codes}) / len(conn_codes))
    R["silver_connect"][name] = out

# ---------------------------------------------------------------------------
# 5. SYNTHETIC REFERENCE (ohne Holdout-Paare)
# ---------------------------------------------------------------------------
def judgments(context, subset=None):
    j = {}
    for p in pairs_dev:
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


def pess(table, judg):
    out = {}
    for q, t in table.items():
        posset = {c for (qq, c), p in judg.items() if qq == q and p["reference_class"] in GAIN}
        out[q] = {"ranked": sorted(t["ranked"], key=lambda x: (-x[1], 1 if x[0] in posset else 0, x[0])), "rec": t["rec"]}
    return out


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
        relevant = {c for c, k in js.items() if k in REL}
        if not relevant:
            continue
        for k in (5, 10):
            acc[f"P@{k}"].append(len(set(ranked[:k]) & relevant) / k)
        for k in (10, 20):
            acc[f"Recall@{k}"].append(len(set(ranked[:k]) & relevant) / len(relevant))
        ideal = sorted((GAIN.get(v, 0) for v in js.values()), reverse=True)
        for k in (5, 10):
            acc[f"NDCG@{k}"].append(dcg([GAIN.get(js.get(c), 0) for c in ranked[:k]]) / dcg(ideal[:k]) if dcg(ideal[:k]) else 0.0)
        first = next((i for i, c in enumerate(ranked) if c in relevant), None)
        acc["MRR"].append(0.0 if first is None else 1 / (first + 1))
    return {k: rnd4(statistics.mean(v)) for k, v in acc.items()}


def prank(table, q, c):
    t = table.get(q)
    if not t:
        return None
    for i, (x, _) in enumerate(t["ranked"]):
        if x == c:
            return i + 1
    return None


def pair_level(table, judg):
    st = defaultdict(list)
    for (q, c), p in judg.items():
        r = prank(table, q, c)
        rec = table.get(q, {}).get("rec", {}).get(c)
        st[f"{p['reference_class']}@10"].append(1.0 if r and r <= 10 else 0.0)
        st[f"{p['reference_class']}_eligible"].append(1.0 if rec and rec["eligible"] else 0.0)
    return {k: rnd4(statistics.mean(v)) for k, v in st.items()}


def false_gates(table, judg):
    n = bad = 0
    for (q, c), p in judg.items():
        if p["reference_class"] in POSITIVE:
            n += 1
            rec = table.get(q, {}).get("rec", {}).get(c)
            bad += bool(rec and not rec["eligible"])
    return dict(count=bad, of=n)


scen = {pid: a["primary_scenario"] for pid, a in ann.items()}
pool_ids = [p.id for p in ds.find_pool]
GEN = {i for i in pool_ids if scen[i] == "generalist"}
SPARSE = {i for i in pool_ids if scen[i] == "sparse"}
NORMAL = {i for i in pool_ids if scen[i] == "normal"}
SPEC = {i for i in pool_ids if scen[i] == "specialist"}
FJ, FJc, FJx = judgments("find"), judgments("find", "constructed"), judgments("find", "contrast")
CJ = judgments("connect")


def exposure(table, top=10):
    cnt = Counter()
    for t in table.values():
        for c, _ in t["ranked"][:top]:
            cnt[c] += 1
    return {i: cnt[i] / len(table) for i in pool_ids}


for name, table in FIND_RANK.items():
    ex = exposure(table)
    mean = lambda ids: rnd4(statistics.mean(ex[i] for i in ids)) if ids else None
    asym = defaultdict(list)
    for p in pairs_dev:
        if p["context"] == "find" and p["reference_class"] == "asymmetric":
            qn, qo = (p["a"], p["b"]) if p["dimensions"]["A_to_B_need_offer"] != "none" else (p["b"], p["a"])
            asym["contrast" if p["source"] == "contrast_selection" else "constructed"].append(
                ((prank(table, qn, qo) or 999) <= 10, (prank(table, qo, qn) or 999) <= 10))
    # Generalisten: Need oder Breite?
    gen_need, norm_need, top_roles, top_caps = [], [], [], []
    for q, t in table.items():
        for c, _ in t["ranked"][:10]:
            rec = t["rec"][c]
            needs = rec.get("needs") or (M2.comps_v01(ctx, ds.people[q], ds.people[c], "synonym")[0]["need"], None)
            (gen_need if c in GEN else norm_need if c in NORMAL else []).append(needs[0] or 0.0)
            top_roles.append(len(ds.people[c].own))
            top_caps.append(len(ds.people[c].caps))
    R["synthetic_find"][name] = dict(
        ranking=ranking_metrics(table, FJ), ranking_pessimistic=ranking_metrics(pess(table, FJ), FJ),
        ranking_constructed=ranking_metrics(table, FJc), ranking_contrast=ranking_metrics(table, FJx),
        pairs=pair_level(table, FJ), false_gates=false_gates(table, FJ),
        asymmetric={k: dict(n=len(v), top10_needing=rnd4(statistics.mean(x for x, _ in v)), top10_other=rnd4(statistics.mean(y for _, y in v)))
                    for k, v in asym.items()},
        generalists=dict(exposure_generalist=mean(GEN), exposure_normal=mean(NORMAL), ratio=rnd4(mean(GEN) / mean(NORMAL)),
                         exposure_specialist=mean(SPEC), mean_own_roles=dict(generalist=3.0, normal=rnd4(statistics.mean(len(ds.people[i].own) for i in NORMAL))),
                         need_of_query_toward_generalist_in_top10=rnd4(statistics.mean(gen_need)) if gen_need else None,
                         need_of_query_toward_normal_in_top10=rnd4(statistics.mean(norm_need)) if norm_need else None,
                         top10_mean_own_roles=rnd4(statistics.mean(top_roles)), top10_mean_capabilities=rnd4(statistics.mean(top_caps)),
                         pool_mean_capabilities=rnd4(statistics.mean(len(ds.people[i].caps) for i in pool_ids)),
                         spearman_exposure_vs_capabilities=spearman([len(ds.people[i].caps) for i in pool_ids], [ex[i] for i in pool_ids]),
                         spearman_exposure_vs_own_roles=spearman([len(ds.people[i].own) for i in pool_ids], [ex[i] for i in pool_ids])),
        sparse=dict(exposure_sparse=mean(SPARSE), ratio=rnd4(mean(SPARSE) / mean(NORMAL))),
        gate_states=dict(Counter(r["gate_state"] for t in table.values() for r in t["rec"].values())),
        robustness_missing_fields=dict(base=ranking_metrics(table, FJ), perturbed=ranking_metrics(FIND_RANK_PERT[name], FJ)),
    )


def tie_diag(table):
    at = {1: [], 5: [], 10: []}
    group = []
    for t in table.values():
        sc = [s for _, s in t["ranked"]]
        for k in at:
            if len(sc) >= k:
                v = sc[k - 1]
                at[k].append(1.0 if sc.count(v) > 1 else 0.0)
        if len(sc) >= 10:
            group.append(statistics.mean(sc.count(v) for v in sc[:10]))
    return dict(**{f"tie_at_rank{k}": rnd4(statistics.mean(v)) for k, v in at.items()},
                mean_identical_scores_in_top10=rnd4(statistics.mean(group)) if group else None)


def stress_eval(table):
    out = []
    for case in stress["cases"]:
        if case["case"] in HOLD_CASES:
            continue
        t = table[case["seek"]]
        sc = {c: s for c, s in t["ranked"]}
        pessr = lambda x: (1 + sum(1 for c, s in t["ranked"] if c != x and s >= sc[x])) if x in sc else 10 ** 6
        optr = lambda x: (1 + sum(1 for c, s in t["ranked"] if c != x and s > sc[x])) if x in sc else 10 ** 6
        oks = []
        for crit in case["criteria"]:
            k = crit[0]
            if k == "order":
                oks.append(crit[1] in sc and (crit[2] not in sc or sc[crit[1]] > sc[crit[2]]))
            elif k == "top":
                oks.append(pessr(crit[1]) <= crit[2])
            elif k == "not_top":
                oks.append(optr(crit[1]) > crit[2])
            elif k == "gated":
                oks.append(not t["rec"][crit[1]]["eligible"])
            elif k == "eligible":
                oks.append(t["rec"][crit[1]]["eligible"])
        out.append(dict(case=case["case"], kind=case["kind"], passed=all(oks),
                        scores={o: (rnd4(sc[o]) if o in sc else None) for o in case["expect"]}))
    return dict(passed=sum(c["passed"] for c in out), of=len(out), cases=out)


for name, table in CONNECT_RANK.items():
    spec_ranks = [prank(table, p["a_listing"], p["b_listing"]) for p in pairs_dev
                  if p["source"] == "designed_specialist" and p["reference_class"] == "excellent_candidate"]
    R["synthetic_connect"][name] = dict(
        ranking=ranking_metrics(table, CJ), ranking_pessimistic=ranking_metrics(pess(table, CJ), CJ),
        pairs=pair_level(table, CJ), false_gates=false_gates(table, CJ),
        exclude_eligible=pair_level(table, CJ).get("exclude_eligible"),
        ties=tie_diag(table), stress=stress_eval(STRESS_RANK[name]), specialist_ranks=spec_ranks,
        contrast_cases="keine CONNECT-Kontrastpaare im Datensatz")

# ---------------------------------------------------------------------------
# 6. Entscheidungsregeln (wie vorab festgelegt)
# ---------------------------------------------------------------------------
def g(d, *path):
    for p in path:
        d = d.get(p) if isinstance(d, dict) else None
    return d


decisions = {"find": {}, "connect": {}}
B = "F0_M7"
for n in MM.FIND_MODELS:
    if n == B:
        continue
    sf, sb = R["silver_find"][n]["consensus"], R["silver_find"][B]["consensus"]
    yf, yb = R["synthetic_find"][n], R["synthetic_find"][B]
    crit = [
        (sf["spearman_q1"] or -9) >= (sb["spearman_q1"] or -9) + 0.03,
        (sf["spearman_q2"] or -9) >= (sb["spearman_q2"] or -9) - 0.03 and (sf["spearman_q3"] or -9) >= (sb["spearman_q3"] or -9) - 0.03,
        (sf["gate_vs_q4"]["f1"] or 0) >= (sb["gate_vs_q4"]["f1"] or 0) - 0.02,
        (g(yf, "asymmetric", "constructed", "top10_other") or 9) <= (g(yb, "asymmetric", "constructed", "top10_other") or 9) - 0.10,
        (g(yf, "ranking_contrast", "NDCG@10") or 0) >= (g(yb, "ranking_contrast", "NDCG@10") or 0) - 0.05,
    ]
    decisions["find"][n] = dict(criteria=crit, better_than_M7=all(crit))
B = "C0_M7core"
for n in MM.CONNECT_MODELS:
    if n == B:
        continue
    sf, sb = R["silver_connect"][n]["consensus"], R["silver_connect"][B]["consensus"]
    yf, yb = R["synthetic_connect"][n], R["synthetic_connect"][B]
    crit = [
        (sf["spearman_q1"] or -9) >= (sb["spearman_q1"] or -9) + 0.03,
        bool(sf["q2_monotonic"]) and (sf["q2_auc_yes_vs_no"] or 0) >= (sb["q2_auc_yes_vs_no"] or 0) - 0.02,
        (sf["gate_vs_q3"]["f1"] or 0) >= (sb["gate_vs_q3"]["f1"] or 0) - 0.02,
        (yf["ties"]["tie_at_rank10"] or 0) <= 0.5 * (yb["ties"]["tie_at_rank10"] or 0),
        yf["stress"]["passed"] >= yb["stress"]["passed"] and (g(yf, "ranking_pessimistic", "Recall@10") or 0) >= (g(yb, "ranking_pessimistic", "Recall@10") or 0) - 0.05,
    ]
    decisions["connect"][n] = dict(criteria=crit, better_than_M7core=all(crit))
R["decisions"] = decisions

json.dump(R, _real_open(os.path.join(DRY or HERE, "results_dry.json" if DRY else "results_v03.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("fertig | Preregistration", PREREG_SHA[:16], "| HOLDOUT STATUS: UNOPENED | gesperrte Zugriffe:", len(_GUARD["blocked"]),
      "| Silver FIND/CONNECT:", len(find_codes), "/", len(conn_codes))
