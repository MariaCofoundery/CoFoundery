"""FINAL HOLDOUT EVALUATION – Matching Engine v0.1 (einmalig).

    python3 -I .../final-holdout-v01/run_holdout_v01.py --preregister     # Festlegung schreiben (vor jedem Label)
    python3 -I .../final-holdout-v01/run_holdout_v01.py --dry-run <dir>   # Pipeline-Test mit Fake-Labels aus <dir>, Ausgabe nach <dir>
    python3 -I .../final-holdout-v01/run_holdout_v01.py                   # EINMALIGE Öffnung der 38 sauberen Holdout-Paare

Ablauf: Spec-Hash und eingefrorene Dateien prüfen -> Festlegung prüfen -> Modelle F3_PH1_min60_DICT und
C1_topic_required_DICT unverändert aus v03 rechnen (Referenzen gesperrt) -> Scores der 38 Ziele vor dem Laden
der Labels festschreiben -> Holdout-Labels einmal laden (RP-001/RP-002 vor dem Lesen verworfen) -> auswerten
-> Bewertung nach vorab festgelegten Kriterien. Keine Modelländerung, keine zweite Version, keine Optimierung.
"""
import builtins
import csv
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
RESEARCH = os.path.join(REPO, "docs/research")
DATA = os.path.join(RESEARCH, "synthetic")
V02 = os.path.join(DATA, "experiments", "v02")
V03 = os.path.join(DATA, "experiments", "v03")
sys.path.insert(0, V03)

FIND_MODEL, CONNECT_MODEL = "F3_PH1_min60_DICT", "C1_topic_required_DICT"
CONTAMINATED = ("RP-001", "RP-002")
IDF_CORPUS_VERSION = "synthetic-v03-all-listings"

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
# 0. Eingefrorene Spezifikation prüfen
# ---------------------------------------------------------------------------
spec_hashes = {}
for line in _real_open(os.path.join(RESEARCH, "matching-engine-v0.1-spec.sha256"), encoding="utf-8"):
    if line.strip():
        h, p = line.split()
        spec_hashes[os.path.basename(p)] = h
SPEC_CHECK = {f: sha(os.path.join(RESEARCH, f)) == h for f, h in spec_hashes.items()}
if not SPEC_CHECK or not all(SPEC_CHECK.values()):
    sys.exit(f"Spec-Hash stimmt nicht: {SPEC_CHECK}. Abbruch.")
SPEC = json.load(_real_open(os.path.join(RESEARCH, "matching-engine-v0.1-spec.json"), encoding="utf-8"))
FROZEN_CHECK = {f: sha(os.path.join(V03, f)) == h for f, h in SPEC["research_basis"]["frozen_files_sha256"].items()}
if not all(FROZEN_CHECK.values()):
    sys.exit(f"Eingefrorene Datei verändert: {[f for f, ok in FROZEN_CHECK.items() if not ok]}. Abbruch.")
assert SPEC["research_basis"]["find_model"] == FIND_MODEL and SPEC["research_basis"]["connect_model"] == CONNECT_MODEL
assert SPEC["holdout"]["contaminated_exclude"] == list(CONTAMINATED) and SPEC["holdout"]["clean_unopened"] == 38

import matching_models_v03 as MM  # noqa: E402  (Hash geprüft)
import silver_reference_v03 as SR  # noqa: E402  (Hash geprüft; nur split_key, consensus, adjudications)
V1, M2 = MM.V1, MM.M2

# ---------------------------------------------------------------------------
# 1. Vorab-Festlegung
# ---------------------------------------------------------------------------
PREREG = os.path.join(HERE, "preregistration_holdout_v01.json")
CRITERIA = dict(
    find_q1_spearman_consensus=dict(PASS=">= 0.70", CONDITIONAL="0.40 – < 0.70", FAIL="< 0.40", development=0.8588),
    find_direction_q2_q3_spearman_consensus=dict(PASS="beide >= 0.50", CONDITIONAL="beide > 0, mindestens eine < 0.50", FAIL="eine <= 0",
                                                 development=[0.7861, 0.8869]),
    find_gate_false_exclusions=dict(definition="Gate ineligible, Consensus Q4 = no", PASS="0", CONDITIONAL="1", FAIL=">= 2"),
    find_gate_missed_exclusions=dict(definition="Gate eligible/uncertain, Consensus Q4 = yes", PASS="<= 1", CONDITIONAL=">= 2", FAIL="–"),
    find_asymmetry=dict(definition="Consensus |Q2 − Q3| >= 2: Vorzeichen (directed A→B − B→A) = Vorzeichen (Q2 − Q3)",
                        PASS="Anteil >= 2/3", CONDITIONAL="sonst", FAIL="n >= 3 und Anteil < 1/3", NOT_ASSESSABLE="n = 0"),
    find_rater_robustness=dict(PASS="Q1 Spearman R1 und R2 je >= 0.40", CONDITIONAL="sonst", FAIL="–"),
    connect_q2_auc_yes_vs_no_consensus=dict(definition="AUC Score yes vs. no (Gleichstand = 0.5); v03-strikte Fassung (Gleichstand = 0) zusätzlich berichtet",
                                            PASS=">= 0.80", CONDITIONAL="0.60 – < 0.80", FAIL="< 0.60", development=1.0,
                                            NOT_ASSESSABLE="keine yes- oder keine no-Gruppe"),
    connect_q1_spearman_consensus=dict(PASS=">= 0.40", CONDITIONAL="> 0 – < 0.40", FAIL="<= 0", development=0.5529),
    connect_gate_false_exclusions=dict(definition="Gate ineligible, Consensus Q3 = no", PASS="0", CONDITIONAL="1", FAIL=">= 2"),
    connect_q2_yes_no_ties=dict(definition="Anteil yes/no-Paarvergleiche mit gleichem Score", PASS="<= 0.10", CONDITIONAL="> 0.10", FAIL="–"),
    connect_rater_robustness=dict(PASS="Q2-AUC R1 und R2 je >= 0.60", CONDITIONAL="sonst", FAIL="–", NOT_ASSESSABLE="AUC nicht berechenbar"),
)
VERDICT_RULE = ("FAIL, wenn ein Kriterium FAIL ist; sonst CONDITIONAL PASS, wenn ein Kriterium CONDITIONAL ist; sonst PASS. "
                "NOT_ASSESSABLE zählt nicht und wird berichtet. Verpasste CONNECT-Ausschlüsse (Q3 = yes, Gate offen) sind "
                "deskriptiv, weil Themen-Fehlpassung laut Spec nicht im Gate liegt (Relevanz-Deckel). Bekannte Schwächen aus "
                "Spec §19 allein ändern das Urteil nicht, werden aber benannt.")


def prereg_content():
    return dict(
        experiment="FINAL HOLDOUT EVALUATION – Matching Engine v0.1",
        spec_status="FROZEN", spec_sha256=spec_hashes,
        versions=dict(matching_version=SPEC["matching_version"], normalization_version=SPEC["normalization_version"],
                      idf_corpus_version=IDF_CORPUS_VERSION),
        models=dict(find=f"{FIND_MODEL}: Gate v03 -> PH1 A→B, B→A (Familien-Halbwert wie eingefroren) -> 0.6·min + 0.4·mean; Confidence getrennt",
                    connect=f"{CONNECT_MODEL}: Gate -> 0.55 topic + 0.20 text (IDF) + 0.15 industry + 0.10 category, Themenpflicht-Deckel 0.10; "
                            "generic2 + Wörterbuch; Confidence getrennt"),
        frozen_code_sha256=SPEC["research_basis"]["frozen_files_sha256"],
        holdout=dict(clean=38, excluded=list(CONTAMINATED), composition="23 FIND, 14 CONNECT, 1 CONNECT-Stressfall (C4)",
                     exclusion="RP-001/RP-002 werden vor dem Lesen jeder Antwortspalte verworfen; nur ihre Anzahl wird gezählt",
                     consensus="Regeln v03 unverändert (Mittel ordinal; yes/no ohne Adjudication -> ausgeschlossen und gezählt); "
                               "keine neue Adjudication; Adjudication-Datei v03 enthält keinen Holdout-Code",
                     opening="einmalig; Scores aller 38 Ziele werden vor dem Laden als holdout_scores_prelabel_v01.json festgeschrieben"),
        metrics=dict(
            find=["Q1 Spearman/Kendall/NDCG/paarweise (Consensus, R1, R2)", "directional A→B vs Q2, B→A vs Q3 (Spearman)",
                  "Gate vs Q4 (TP/FP/FN/TN, Precision, Recall, F1) mit Fehlerliste", "Asymmetrie-Fälle |Q2−Q3| >= 2 einzeln",
                  "Confidence vs Q5 nur deskriptiv", "Bootstrap-95%-Intervall für Q1 Spearman (2000 Ziehungen, Seed 1), nur deskriptiv"],
            connect=["Q1 Spearman/Kendall/NDCG/paarweise", "Scoreverteilung je Q2 yes/maybe/no, AUC yes vs no, Tie-Anteil, Monotonie",
                     "Gate vs Q3 mit Fehlerliste", "Tie-Anteil der Scores im Holdout-Set", "Stressfall C4 (strenge Kriterien) und seine Labels",
                     "Confidence vs Q4 nur deskriptiv", "Bootstrap-95%-Intervall für Q1 Spearman, nur deskriptiv"],
            synthetic_holdout="getrennt: Referenzklassen der Holdout-Paare (Anteil zugelassen / Top 10, falsche Sperren, Asymmetrie)",
            development_comparison="Werte aus results_v03.json, nur zum Vergleich"),
        criteria=CRITERIA, verdict_rule=VERDICT_RULE,
        verdict_meaning=dict(PASS="stabil genug für einen nicht-produktiven Produkt-Prototyp",
                             CONDITIONAL_PASS="Grundstruktur tragfähig, benannte Schwächen vor Produktbetrieb adressieren",
                             FAIL="struktureller Fehler, erneute Research-Runde"),
        runner_sha256=sha(os.path.abspath(__file__)),
    )


content = prereg_content()
DRY = sys.argv[sys.argv.index("--dry-run") + 1] if "--dry-run" in sys.argv else None
OUT = os.path.abspath(DRY) if DRY else HERE
if "--preregister" in sys.argv:
    if os.path.exists(PREREG):
        sys.exit("preregistration_holdout_v01.json existiert bereits – wird nicht überschrieben.")
    _real_open(PREREG, "w", encoding="utf-8").write(json.dumps(content, ensure_ascii=False, indent=1, sort_keys=True))
    print("Vorab-Festlegung geschrieben. SHA-256:", sha(PREREG))
    sys.exit(0)
if not DRY and not os.path.exists(PREREG):
    sys.exit("Keine preregistration_holdout_v01.json – zuerst --preregister.")
if not DRY and json.dumps(json.load(_real_open(PREREG, encoding="utf-8")), sort_keys=True, ensure_ascii=False) != \
        json.dumps(json.loads(json.dumps(content, ensure_ascii=False)), sort_keys=True, ensure_ascii=False):
    sys.exit("Festlegung weicht ab. Abbruch.")
ACCESS_LOG = os.path.join(OUT, "holdout_access_log_v01.json")
if not DRY and (os.path.exists(os.path.join(HERE, "holdout_evaluation_v01.json")) or os.path.exists(ACCESS_LOG)):
    sys.exit("Holdout wurde bereits geöffnet (CONSUMED). Keine zweite Auswertung.")

# ---------------------------------------------------------------------------
# 2. Scoring – Referenzen gesperrt
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


def rank_find():
    out = {}
    for a in ctx.pool:
        rec = {b.id: MM.score_find(ctx, FIND_MODEL, a, b) for b in ctx.pool if b.id != a.id}
        elig = sorted(((c, r["score"]) for c, r in rec.items() if r["eligible"]), key=lambda x: (-x[1], V1.recency_key(x[0])))
        out[a.id] = {"ranked": elig, "rec": rec}
    return out


def rank_connect(cc):
    out = {}
    for sl in cc.ds.listings.values():
        if sl.direction != "seeking":
            continue
        rec = {ol.id: MM.score_connect(cc, CONNECT_MODEL, sl, ol) for ol in cc.ds.offers if ol.owner.id != sl.owner.id}
        elig = sorted(((c, r["score"]) for c, r in rec.items() if r["eligible"]), key=lambda x: (x[1], x[0]), reverse=True)
        out[sl.id] = {"ranked": elig, "rec": rec}
    return out


FT, CT, ST = rank_find(), rank_connect(cctx), rank_connect(cctx_stress)

# Ziele der Holdout-Stichprobe (Schlüssel ohne Labels)
split = SR.split_key()
sample_key = {k["sample_id"]: k for k in json.load(open(os.path.join(V02, "human_label_sample_key_v02.json"), encoding="utf-8"))["key"]}
HOLD_CODES = sorted(c for c, s in split.items() if s["split"] == "holdout" and c not in CONTAMINATED)
assert len(HOLD_CODES) == 38 and all(split[c]["split"] == "holdout" for c in CONTAMINATED)
_GUARD["on"] = False
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]   # nur Ids/Listings fürs Ziel
_GUARD["on"] = True
by_pair = {p["pair_id"]: p for p in pairs}
TARGET = {}
for c in HOLD_CODES:
    k = sample_key[split[c]["sample_id"]]
    if k.get("pair_id"):
        p = by_pair[k["pair_id"]]
        TARGET[c] = dict(context=p["context"], pair_id=p["pair_id"], a=p["a"], b=p["b"], seek=p.get("a_listing"), offer=p.get("b_listing"))
    else:
        case = next(x for x in stress["cases"] if x["case"] == k["stress_case"])
        TARGET[c] = dict(context="connect", pair_id=None, stress_case=case["case"], seek=case["seek"],
                         offer=list(case["expect"])[SR.STRESS_PICK[case["case"]]])
del pairs, by_pair


def rec_of(c):
    t = TARGET[c]
    return FT[t["a"]]["rec"][t["b"]] if t["context"] == "find" else ST[t["seek"]]["rec"][t["offer"]]


def r4(x):
    return None if x is None else round(x, 4)


PRELABEL = {c: dict(context=TARGET[c]["context"], score=r4(rec_of(c)["score"]), eligible=rec_of(c)["eligible"],
                    gate_state=rec_of(c)["gate_state"], confidence=r4(rec_of(c)["confidence"]),
                    directed=[r4(x) for x in rec_of(c).get("directed", ())] or None) for c in HOLD_CODES}
_GUARD["on"] = False
assert not _GUARD["blocked"], _GUARD["blocked"]
PRE_PATH = os.path.join(OUT, "holdout_scores_prelabel_v01.json")
json.dump(dict(note="Scores vor dem Laden der Holdout-Labels festgeschrieben", versions=content["versions"], scores=PRELABEL),
          _real_open(PRE_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
PRE_SHA = sha(PRE_PATH)

# ---------------------------------------------------------------------------
# 3. EINMALIGE Öffnung der Holdout-Labels
# ---------------------------------------------------------------------------
json.dump(dict(opened="holdout labels loaded once", dry_run=bool(DRY), prelabel_scores_sha256=PRE_SHA, preregistration_sha256=sha(PREREG) if os.path.exists(PREREG) else None),
          _real_open(ACCESS_LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
SILVER_DIR = os.path.abspath(DRY) if DRY else V02


def load_holdout(path):
    rows, n_dev, n_contaminated = {}, 0, 0
    with _real_open(path, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        code_col = header.index("pair_code")
        for raw in reader:
            if not raw:
                continue
            code = raw[code_col].strip()
            if code in CONTAMINATED:
                n_contaminated += 1                 # Inhalt wird nicht gelesen
                continue
            if split.get(code, {}).get("split") != "holdout":
                n_dev += 1
                continue
            rows[code] = {h: (v or "").strip() for h, v in zip(header, raw)}
    return rows, dict(development_rows_skipped=n_dev, contaminated_rows_dropped_unread=n_contaminated, holdout_rows=len(rows))


r1, l1 = load_holdout(os.path.join(SILVER_DIR, "silver_labels_R1_v02.csv"))
r2, l2 = load_holdout(os.path.join(SILVER_DIR, "silver_labels_R2_v02.csv"))
adj = SR.adjudications(os.path.join(V03, "silver_adjudication_v03.json"))
assert not set(adj) & set(HOLD_CODES) and not set(adj) & set(CONTAMINATED)
cons, cons_notes = SR.consensus(r1, r2, adj)
assert not set(cons) & set(CONTAMINATED)
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
HOLD_PAIRS = {TARGET[c]["pair_id"] for c in HOLD_CODES if TARGET[c]["pair_id"]}
CONT_PAIRS = {sample_key[split[c]["sample_id"]].get("pair_id") for c in CONTAMINATED}
pairs_hold = [p for p in pairs if p["pair_id"] in HOLD_PAIRS and p["pair_id"] not in CONT_PAIRS]

# ---------------------------------------------------------------------------
# 4. Kennzahlen (Definitionen wie v03)
# ---------------------------------------------------------------------------
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


def spearman_raw(x, y):
    if len(x) < 3:
        return None
    rx, ry = ranks_avg(x), ranks_avg(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = math.sqrt(sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry))
    return num / den if den else None


def spearman(x, y):
    return r4(spearman_raw(x, y))


def boot_ci(x, y, n=2000, seed=1):
    rnd = random.Random(seed)
    vals = []
    for _ in range(n):
        idx = [rnd.randrange(len(x)) for _ in x]
        v = spearman_raw([x[i] for i in idx], [y[i] for i in idx])
        if v is not None:
            vals.append(v)
    vals.sort()
    return [r4(vals[int(0.025 * len(vals))]), r4(vals[int(0.975 * len(vals)) - 1])] if vals else None


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
    dcg_ = sum(gains[i] / math.log2(k + 2) for k, i in enumerate(order))
    ideal = sum(g / math.log2(k + 2) for k, g in enumerate(sorted(gains, reverse=True)))
    return r4(dcg_ / ideal) if ideal else None


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
    return dict(accuracy=r4(ok / n) if n else None, tie_share=r4(ties / n) if n else None, comparisons=n)


def classify(pred, truth):
    tp = sum(p and t for p, t in zip(pred, truth)); fp = sum(p and not t for p, t in zip(pred, truth))
    fn = sum((not p) and t for p, t in zip(pred, truth)); tn = sum((not p) and (not t) for p, t in zip(pred, truth))
    pr = tp / (tp + fp) if tp + fp else None; rc = tp / (tp + fn) if tp + fn else None
    return dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=r4(pr), recall=r4(rc), specificity=r4(tn / (tn + fp)) if tn + fp else None,
                f1=r4(2 * pr * rc / (pr + rc)) if pr and rc else None)


rs = lambda rec: rec["score"] if rec["eligible"] else -1.0
SOURCES = {"consensus": cons, "R1": r1, "R2": r2}


def lab(src, code, q):
    v = src.get(code, {}).get(q)
    if src is cons:
        return v
    try:
        return float(v)
    except (TypeError, ValueError):
        return v or None


find_codes = [c for c in HOLD_CODES if TARGET[c]["context"] == "find"]
conn_codes = [c for c in HOLD_CODES if TARGET[c]["context"] == "connect"]
DEV = json.load(_real_open(os.path.join(V03, "results_v03.json"), encoding="utf-8"))
R = dict(meta=dict(spec_status="FROZEN", spec_sha256=spec_hashes, spec_hash_verified=all(SPEC_CHECK.values()),
                   frozen_code_verified=all(FROZEN_CHECK.values()), preregistration_sha256=sha(PREREG) if os.path.exists(PREREG) else None,
                   prelabel_scores_sha256=PRE_SHA, versions=content["versions"], models=dict(find=FIND_MODEL, connect=CONNECT_MODEL),
                   clean_holdout=len(HOLD_CODES), excluded=list(CONTAMINATED),
                   excluded_note="kontaminiert; vor dem Lesen verworfen; nicht in Metriken, nicht analysiert",
                   label_loading=dict(R1=l1, R2=l2), consensus_notes=cons_notes,
                   holdout_find=len(find_codes), holdout_connect=len(conn_codes),
                   holdout_status_after_run="CONSUMED" if not DRY else "DRY RUN (Fake-Labels)", dry_run=bool(DRY)),
         find={}, connect={}, synthetic_holdout={}, development_comparison={}, criteria={}, verdict=None)
DIAG = dict(find_pairs=[], connect_pairs=[])

# FIND
fr = {c: rec_of(c) for c in find_codes}
for sname, src in SOURCES.items():
    codes = [c for c in find_codes if lab(src, c, "find_q1_gespraech") is not None]
    sc, q1 = [rs(fr[c]) for c in codes], [lab(src, c, "find_q1_gespraech") for c in codes]
    res = dict(n=len(codes), spearman_q1=spearman(sc, q1), spearman_q1_ci95_bootstrap=boot_ci(sc, q1), kendall_q1=kendall_b(sc, q1),
               ndcg_q1=ndcg_global(sc, [v - 1 for v in q1]) if codes else None, pairwise_q1=pairwise(sc, q1))
    for q, i in (("find_q2_a_to_b", 0), ("find_q3_b_to_a", 1)):
        cc = [c for c in find_codes if lab(src, c, q) is not None]
        res["spearman_" + q[5:7]] = spearman([fr[c]["directed"][i] or 0.0 for c in cc], [lab(src, c, q) for c in cc])
    gc = [c for c in find_codes if lab(src, c, "find_q4_ausschluss") in ("yes", "no")]
    res["gate_vs_q4"] = classify([not fr[c]["eligible"] for c in gc], [lab(src, c, "find_q4_ausschluss") == "yes" for c in gc])
    res["gate_vs_q4"]["unclear_or_missing_excluded"] = len(find_codes) - len(gc)
    res["gate_false_exclusions"] = [c for c in gc if not fr[c]["eligible"] and lab(src, c, "find_q4_ausschluss") == "no"]
    res["gate_missed_exclusions"] = [c for c in gc if fr[c]["eligible"] and lab(src, c, "find_q4_ausschluss") == "yes"]
    cq = [c for c in find_codes if lab(src, c, "find_q5_sicherheit") is not None]
    res["descriptive_confidence_spearman_q5"] = spearman([fr[c]["confidence"] for c in cq], [lab(src, c, "find_q5_sicherheit") for c in cq])
    R["find"][sname] = res
asym = [c for c in find_codes if cons.get(c, {}).get("find_q2_a_to_b") is not None and cons[c].get("find_q3_b_to_a") is not None
        and abs(cons[c]["find_q2_a_to_b"] - cons[c]["find_q3_b_to_a"]) >= 2]
sgn = lambda v: (v > 0) - (v < 0)
asym_cases = [dict(pair_code=c, q1=cons[c]["find_q1_gespraech"], q2=cons[c]["find_q2_a_to_b"], q3=cons[c]["find_q3_b_to_a"],
                   directed=[r4(x) for x in fr[c]["directed"]], score=r4(rs(fr[c])), eligible=fr[c]["eligible"],
                   direction_matches=sgn((fr[c]["directed"][0] or 0) - (fr[c]["directed"][1] or 0)) == sgn(cons[c]["find_q2_a_to_b"] - cons[c]["find_q3_b_to_a"]))
              for c in asym]
mutual_hi = [c for c in find_codes if min(cons.get(c, {}).get("find_q2_a_to_b") or 0, cons.get(c, {}).get("find_q3_b_to_a") or 0) >= 4]
R["find"]["asymmetry"] = dict(n=len(asym), direction_match_share=r4(statistics.mean(x["direction_matches"] for x in asym_cases)) if asym else None,
                              mean_score_asymmetric=r4(statistics.mean(rs(fr[c]) for c in asym)) if asym else None,
                              mean_score_mutual_high=r4(statistics.mean(rs(fr[c]) for c in mutual_hi)) if mutual_hi else None,
                              n_mutual_high=len(mutual_hi), cases=asym_cases)
R["find"]["gate_states"] = dict(Counter(fr[c]["gate_state"] for c in find_codes))
for c in find_codes:
    DIAG["find_pairs"].append(dict(pair_code=c, pair_id=TARGET[c]["pair_id"], score=r4(rs(fr[c])), gate_state=fr[c]["gate_state"],
                                   directed=[r4(x) for x in fr[c]["directed"]], confidence=r4(fr[c]["confidence"]),
                                   gate_reasons=fr[c]["reasons"] if not fr[c]["eligible"] else None,
                                   consensus={k: cons.get(c, {}).get(k) for k in ("find_q1_gespraech", "find_q2_a_to_b", "find_q3_b_to_a",
                                                                                 "find_q4_ausschluss", "find_q5_sicherheit")}))

# CONNECT
cr = {c: rec_of(c) for c in conn_codes}
for sname, src in SOURCES.items():
    codes = [c for c in conn_codes if lab(src, c, "connect_q1_deckung") is not None]
    sc, q1 = [rs(cr[c]) for c in codes], [lab(src, c, "connect_q1_deckung") for c in codes]
    res = dict(n=len(codes), spearman_q1=spearman(sc, q1), spearman_q1_ci95_bootstrap=boot_ci(sc, q1), kendall_q1=kendall_b(sc, q1),
               ndcg_q1=ndcg_global(sc, [v - 1 for v in q1]) if codes else None, pairwise_q1=pairwise(sc, q1))
    groups = defaultdict(list)
    for c in conn_codes:
        g = lab(src, c, "connect_q2_anzeigen")
        if g in ("yes", "maybe", "no"):
            groups[g].append(rs(cr[c]))
    res["q2_groups"] = {g: dict(n=len(v), mean=r4(statistics.mean(v)), median=r4(statistics.median(v)), min=r4(min(v)), max=r4(max(v)))
                        for g, v in groups.items() if v}
    y, n_ = groups.get("yes", []), groups.get("no", [])
    res["q2_auc_yes_vs_no"] = r4(sum(1.0 if a > b else 0.5 if a == b else 0.0 for a in y for b in n_) / (len(y) * len(n_))) if y and n_ else None
    res["q2_auc_strict_v03"] = r4(sum(1.0 if a > b else 0.0 for a in y for b in n_) / (len(y) * len(n_))) if y and n_ else None
    res["q2_auc_ties"] = r4(sum(1.0 if a == b else 0.0 for a in y for b in n_) / (len(y) * len(n_))) if y and n_ else None
    means = [res["q2_groups"][g]["mean"] for g in ("yes", "maybe", "no") if g in res["q2_groups"]]
    res["q2_monotonic"] = all(a > b for a, b in zip(means, means[1:]))
    gc = [c for c in conn_codes if lab(src, c, "connect_q3_ausschluss") in ("yes", "no")]
    res["gate_vs_q3"] = classify([not cr[c]["eligible"] for c in gc], [lab(src, c, "connect_q3_ausschluss") == "yes" for c in gc])
    res["gate_false_exclusions"] = [c for c in gc if not cr[c]["eligible"] and lab(src, c, "connect_q3_ausschluss") == "no"]
    res["gate_missed_exclusions_descriptive"] = [c for c in gc if cr[c]["eligible"] and lab(src, c, "connect_q3_ausschluss") == "yes"]
    cq = [c for c in conn_codes if lab(src, c, "connect_q4_sicherheit") is not None]
    res["descriptive_confidence_spearman_q4"] = spearman([cr[c]["confidence"] for c in cq], [lab(src, c, "connect_q4_sicherheit") for c in cq])
    R["connect"][sname] = res
R["connect"]["score_ties_in_holdout_set"] = r4(1 - len({round(rs(cr[c]), 9) for c in conn_codes}) / len(conn_codes))
R["connect"]["gate_states"] = dict(Counter(cr[c]["gate_state"] for c in conn_codes))
stress_out = []
for c in conn_codes:
    t = TARGET[c]
    if not t.get("stress_case"):
        continue
    case = next(x for x in stress["cases"] if x["case"] == t["stress_case"])
    tab = ST[case["seek"]]
    scs = {o: s for o, s in tab["ranked"]}
    oks = [crit[1] in scs and (crit[2] not in scs or scs[crit[1]] > scs[crit[2]]) for crit in case["criteria"] if crit[0] == "order"]
    stress_out.append(dict(pair_code=c, case=case["case"], kind=case["kind"], criteria=case["criteria"], strict_passed=all(oks) if oks else None,
                           scores={o: r4(scs.get(o)) for o in case["expect"]}, rated_offer=t["offer"],
                           consensus={k: cons.get(c, {}).get(k) for k in ("connect_q1_deckung", "connect_q2_anzeigen", "connect_q3_ausschluss")}))
R["connect"]["stress_cases_in_holdout"] = stress_out
for c in conn_codes:
    DIAG["connect_pairs"].append(dict(pair_code=c, pair_id=TARGET[c]["pair_id"], stress_case=TARGET[c].get("stress_case"), score=r4(rs(cr[c])),
                                      gate_state=cr[c]["gate_state"], confidence=r4(cr[c]["confidence"]),
                                      consensus={k: cons.get(c, {}).get(k) for k in ("connect_q1_deckung", "connect_q2_anzeigen",
                                                                                     "connect_q3_ausschluss", "connect_q4_sicherheit")}))

# SYNTHETIC REFERENCE der Holdout-Paare (getrennt)
def prank(table, q, c):
    for i, (x, _) in enumerate(table[q]["ranked"]):
        if x == c:
            return i + 1
    return None


for context in ("find", "connect"):
    pl, fg = defaultdict(list), []
    asym_s = []
    for p in pairs_hold:
        if p["context"] != context:
            continue
        if context == "find":
            dirs = [(p["a"], p["b"]), (p["b"], p["a"])]
            table = FT
        else:
            dirs = [(p["a_listing"], p["b_listing"])]
            table = CT
        for q, cnd in dirs:
            r = prank(table, q, cnd)
            pl[p["reference_class"] + "@10"].append(1.0 if r and r <= 10 else 0.0)
            pl[p["reference_class"] + "_eligible"].append(1.0 if table[q]["rec"][cnd]["eligible"] else 0.0)
            if p["reference_class"] in ("excellent_candidate", "promising", "worth_exploring", "asymmetric") and not table[q]["rec"][cnd]["eligible"]:
                fg.append(p["pair_id"])
        if context == "find" and p["reference_class"] == "asymmetric":
            qn, qo = (p["a"], p["b"]) if p["dimensions"]["A_to_B_need_offer"] != "none" else (p["b"], p["a"])
            asym_s.append(dict(pair_id=p["pair_id"], source=p["source"], needing_top10=(prank(FT, qn, qo) or 999) <= 10,
                               other_top10=(prank(FT, qo, qn) or 999) <= 10))
    R["synthetic_holdout"][context] = dict(n_pairs=sum(1 for p in pairs_hold if p["context"] == context),
                                           classes=dict(Counter(p["reference_class"] for p in pairs_hold if p["context"] == context)),
                                           pairs={k: r4(statistics.mean(v)) for k, v in sorted(pl.items())}, false_gates=sorted(set(fg)),
                                           **({"asymmetric": asym_s} if context == "find" else {}))
R["synthetic_holdout"]["note"] = "SYNTHETIC REFERENCE der Holdout-Paare; getrennt von Silver; Rang im vollen Pool"

# Development-Vergleich
dF, dC = DEV["silver_find"][FIND_MODEL]["consensus"], DEV["silver_connect"][CONNECT_MODEL]["consensus"]
hF, hC = R["find"]["consensus"], R["connect"]["consensus"]
d = lambda h, dv: None if h is None or dv is None else r4(h - dv)
R["development_comparison"] = dict(
    find={k: dict(development=dF[k], holdout=hF[k], delta=d(hF[k], dF[k])) for k in ("spearman_q1", "kendall_q1", "ndcg_q1", "spearman_q2", "spearman_q3")}
    | dict(gate_f1=dict(development=dF["gate_vs_q4"]["f1"], holdout=hF["gate_vs_q4"]["f1"])),
    connect={k: dict(development=dC[k], holdout=hC[k], delta=d(hC[k], dC[k])) for k in ("spearman_q1", "kendall_q1", "ndcg_q1", "q2_auc_ties")}
    | dict(q2_auc_strict=dict(development=dC["q2_auc_yes_vs_no"], holdout=hC["q2_auc_strict_v03"], delta=d(hC["q2_auc_strict_v03"], dC["q2_auc_yes_vs_no"])),
           gate_f1=dict(development=dC["gate_vs_q3"]["f1"], holdout=hC["gate_vs_q3"]["f1"]),
           score_ties_in_set=dict(development=DEV["silver_connect"][CONNECT_MODEL]["score_ties_in_silver_set"], holdout=R["connect"]["score_ties_in_holdout_set"])))

# ---------------------------------------------------------------------------
# 5. Bewertung nach vorab festgelegten Kriterien
# ---------------------------------------------------------------------------
def b3(v, p, c):
    if v is None:
        return "NOT_ASSESSABLE"
    return "PASS" if v >= p else "CONDITIONAL" if v >= c else "FAIL"


def cnt(n):
    return "PASS" if n == 0 else "CONDITIONAL" if n == 1 else "FAIL"


q2, q3 = hF["spearman_q2"], hF["spearman_q3"]
a = R["find"]["asymmetry"]
crit = dict(
    find_q1_spearman_consensus=(hF["spearman_q1"], b3(hF["spearman_q1"], 0.70, 0.40)),
    find_direction_q2_q3_spearman_consensus=([q2, q3], "NOT_ASSESSABLE" if q2 is None or q3 is None else
                                             "FAIL" if min(q2, q3) <= 0 else "PASS" if min(q2, q3) >= 0.5 else "CONDITIONAL"),
    find_gate_false_exclusions=(len(hF["gate_false_exclusions"]), cnt(len(hF["gate_false_exclusions"]))),
    find_gate_missed_exclusions=(len(hF["gate_missed_exclusions"]), "PASS" if len(hF["gate_missed_exclusions"]) <= 1 else "CONDITIONAL"),
    find_asymmetry=([a["n"], a["direction_match_share"]], "NOT_ASSESSABLE" if not a["n"] else "PASS" if a["direction_match_share"] >= 2 / 3
                    else "FAIL" if a["n"] >= 3 and a["direction_match_share"] < 1 / 3 else "CONDITIONAL"),
    find_rater_robustness=([R["find"]["R1"]["spearman_q1"], R["find"]["R2"]["spearman_q1"]],
                           "PASS" if all(v is not None and v >= 0.40 for v in (R["find"]["R1"]["spearman_q1"], R["find"]["R2"]["spearman_q1"])) else "CONDITIONAL"),
    connect_q2_auc_yes_vs_no_consensus=(hC["q2_auc_yes_vs_no"], b3(hC["q2_auc_yes_vs_no"], 0.80, 0.60)),
    connect_q1_spearman_consensus=(hC["spearman_q1"], "NOT_ASSESSABLE" if hC["spearman_q1"] is None else
                                   "PASS" if hC["spearman_q1"] >= 0.40 else "CONDITIONAL" if hC["spearman_q1"] > 0 else "FAIL"),
    connect_gate_false_exclusions=(len(hC["gate_false_exclusions"]), cnt(len(hC["gate_false_exclusions"]))),
    connect_q2_yes_no_ties=(hC["q2_auc_ties"], "NOT_ASSESSABLE" if hC["q2_auc_ties"] is None else "PASS" if hC["q2_auc_ties"] <= 0.10 else "CONDITIONAL"),
    connect_rater_robustness=([R["connect"]["R1"]["q2_auc_yes_vs_no"], R["connect"]["R2"]["q2_auc_yes_vs_no"]],
                              "NOT_ASSESSABLE" if None in (R["connect"]["R1"]["q2_auc_yes_vs_no"], R["connect"]["R2"]["q2_auc_yes_vs_no"]) else
                              "PASS" if min(R["connect"]["R1"]["q2_auc_yes_vs_no"], R["connect"]["R2"]["q2_auc_yes_vs_no"]) >= 0.60 else "CONDITIONAL"),
)
assert set(crit) == set(CRITERIA)
R["criteria"] = {k: dict(value=v, result=b) for k, (v, b) in crit.items()}
bands = [b for _, b in crit.values()]
R["verdict"] = "FAIL" if "FAIL" in bands else "CONDITIONAL PASS" if "CONDITIONAL" in bands else "PASS"
json.dump(R, _real_open(os.path.join(OUT, "holdout_evaluation_v01.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(DIAG, _real_open(os.path.join(OUT, "diagnostics_holdout_v01.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("fertig |", "DRY RUN" if DRY else "HOLDOUT CONSUMED", "| Urteil:", R["verdict"])
