"""Paritäts-Fixtures für den TypeScript-Prototyp der Matching Engine v0.1.

    python3 -I docs/research/synthetic/experiments/prototype-parity-v01/build_parity_fixtures_v01.py

Rechnet mit dem EINGEFRORENEN v03-Code (F3_PH1_min60_DICT, C1_topic_required_DICT, N-DICTIONARY) Modellausgaben
für synthetische Profile und schreibt sie als Test-Fixture nach web/src/lib/matching/v01/__tests__/fixtures/.

Ausgeschlossen (verbrauchter Holdout / kontaminiert): alle Personen und Einträge, die in einem der 40 Holdout-Paare
der Silver-Stichprobe vorkommen (inkl. RP-001/RP-002), sowie die Stressfälle der Holdout-Stichprobe (C4).
Gelesen werden keine Labels: reference_pairs.json nur für die Paar-Mitglieder der Holdout-Stichprobe, keine Klassen;
Silver-Dateien werden nie geöffnet. Die Fixtures enthalten Modellausgaben, keine Referenzurteile.
"""
import builtins
import copy
import hashlib
import json
import os
import re
import sys

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
DATA = os.path.join(REPO, "docs/research/synthetic")
V02 = os.path.join(DATA, "experiments", "v02")
V03 = os.path.join(DATA, "experiments", "v03")
OUT = os.path.join(REPO, "web/src/lib/matching/v01/__tests__/fixtures")
sys.path.insert(0, V03)

_real_open = builtins.open


def _guarded_open(file, *a, **k):
    if "silver_labels" in os.path.basename(str(file)):
        raise PermissionError(f"Silver-Labels sind für Fixtures gesperrt: {file}")
    return _real_open(file, *a, **k)


builtins.open = _guarded_open

import matching_models_v03 as MM  # noqa: E402
import normalization_v03 as N3  # noqa: E402
V1, M2, N2 = MM.V1, MM.M2, MM.N3.N2

spec = json.load(open(os.path.join(REPO, "docs/research/matching-engine-v0.1-spec.json"), encoding="utf-8"))
for f, h in spec["research_basis"]["frozen_files_sha256"].items():
    assert hashlib.sha256(_real_open(os.path.join(V03, f), "rb").read()).hexdigest() == h, f"eingefroren verändert: {f}"

profiles = json.load(open(os.path.join(DATA, "profiles.json"), encoding="utf-8"))["profiles"]
stress = json.load(open(os.path.join(V02, "connect_stress_v02.json"), encoding="utf-8"))

# --- Holdout-Ausschluss (nur IDs) -------------------------------------------------------------
split = json.load(open(os.path.join(V02, "human_labels_split_key_v02.json"), encoding="utf-8"))["split"]
sample = {k["sample_id"]: k for k in json.load(open(os.path.join(V02, "human_label_sample_key_v02.json"), encoding="utf-8"))["key"]}
pairs = {p["pair_id"]: p for p in json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]}
EX_PEOPLE, EX_LISTINGS, EX_CASES = set(), set(), set()
for s in split:
    if s["split"] != "holdout":
        continue
    k = sample[s["sample_id"]]
    if k.get("pair_id"):
        p = pairs[k["pair_id"]]
        EX_PEOPLE |= {p["a"], p["b"]}
        EX_LISTINGS |= {x for x in (p.get("a_listing"), p.get("b_listing")) if x}
    else:
        EX_CASES.add(k["stress_case"])
del pairs
for c in stress["cases"]:
    if c["case"] in EX_CASES:
        EX_LISTINGS |= {c["seek"], *c["expect"]}

family_of = {}
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s_ = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s_, re.S | re.I):
        for row in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'([a-z0-9_]+)'", m.group(2)):
            family_of[row.group(1)] = row.group(2)

ds = V1.Dataset(profiles, family_of)
ctx = M2.Context(ds)
cctx = MM.ConnectContext(ds)
NORM = "N-DICTIONARY"


def clean_person(p):
    return p.id not in EX_PEOPLE and not any(l["id"] in EX_LISTINGS for l in p.raw["connect_listings"])


# --- FIND ------------------------------------------------------------------------------------
find_people = sorted((p for p in ds.find_pool if clean_person(p)), key=lambda p: p.id)[:40]


def find_record(context, a, b):
    r = MM.score_find(context, "F3_PH1_min60_DICT", a, b)
    _, n1, ctx1, c1, _ = MM.directional_ph1(context, a, b, NORM)
    _, n2, _, c2, _ = MM.directional_ph1(context, b, a, NORM)
    state, why = MM.gate_find_v03(a, b, NORM)
    return dict(a=a.id, b=b.id, score=r["score"], gate_state=state, gate_reason_count=len(why), a_to_b=r["directed"][0],
                b_to_a=r["directed"][1], need_a_to_b=n1, need_b_to_a=n2, role_cover_a_to_b=c1["role_cover"],
                cap_cover_a_to_b=c1["cap_cover"], role_cover_b_to_a=c2["role_cover"], cap_cover_b_to_a=c2["cap_cover"],
                context=ctx1, intent=c1["intent"], confidence=r["confidence"])


find_pairs = [find_record(ctx, a, b) for a in find_people for b in find_people if a.id != b.id]

# Ohne Matching-Zustimmung: Capabilities der Person gelten als nicht vorhanden (Spec §5) -> Einträge leer
no_consent_ids = {p.id for p in find_people[20:30]}
stripped = []
for raw in profiles:
    r = copy.deepcopy(raw)
    if r["id"] in no_consent_ids:
        r["capability_entries"] = []
    stripped.append(r)
ds_nc = V1.Dataset(stripped, family_of)
ctx_nc = M2.Context(ds_nc)
find_nc = [find_record(ctx_nc, ds_nc.people[a.id], ds_nc.people[b.id]) for a in find_people[:20] for b in find_people[20:30]]
for r in find_nc:
    r["consent_a"], r["consent_b"] = True, False

# --- CONNECT ---------------------------------------------------------------------------------
clean_listing = lambda l: l.id not in EX_LISTINGS and clean_person(l.owner)
seeks = sorted((l for l in ds.listings.values() if l.direction == "seeking" and clean_listing(l)), key=lambda l: l.id)[:30]
offers = sorted((l for l in ds.offers if clean_listing(l)), key=lambda l: l.id)[:60]
connect_pairs = []
for sl in seeks:
    for ol in offers:
        if ol.owner.id == sl.owner.id:
            continue
        r = MM.score_connect(cctx, "C1_topic_required_DICT", sl, ol)
        connect_pairs.append(dict(seek=sl.id, offer=ol.id, score=r["score"], gate_state=r["gate_state"], confidence=r["confidence"],
                                  **{k: v for k, v in r["parts"].items()}))

# --- IDF-Snapshot (Datensatz-Korpus v03, Spec §11.2) -------------------------------------------
idx = cctx.text
df_sorted = {k: idx.df[k] for k in sorted(idx.df)}
idf_blob = json.dumps(dict(n=idx.n, df=df_sorted), sort_keys=True, separators=(",", ":"))
idf_snapshot = dict(idf_corpus_version="synthetic-v03-all-listings", normalization_version=spec["normalization_version"],
                    n=idx.n, df=df_sorted, sha256=hashlib.sha256(idf_blob.encode()).hexdigest())

# --- Normalisierung --------------------------------------------------------------------------
raw_terms = {"industry": set(), "topic": set()}
raw_places, raw_texts = set(), set()
for p in profiles:
    pc = p["person_core"]
    raw_terms["industry"] |= set(pc.get("industries") or [])
    raw_terms["topic"] |= set(pc.get("expertise") or [])
    if pc.get("location_region"):
        raw_places.add(pc["location_region"])
    must = (p["find_profile"] or {}).get("must_haves") or {}
    if must.get("desiredLocationRegion"):
        raw_places.add(must["desiredLocationRegion"])
    raw_terms["topic"] |= set(must.get("requiredExpertiseAny") or [])
    for l in p["connect_listings"]:
        raw_terms["topic"] |= set(l["topics"] or [])
        raw_terms["industry"] |= set(l["industries"] or [])
        raw_places |= set(l["locations"] or [])
        raw_texts |= {l["title"] or "", l["summary"] or ""}
EXTRA = ["HealthTech", "B2BSaaS", "Gesundheit & Pflege", "Ärzte und Ärztinnen", "Straße", "  Leipzig, Germany ", "Region Stuttgart",
         "Stuttgart, BW", "München und Umgebung", "DACH", "Remote / überall", "remote (DE)", "Europa", "Berlin-Mitte", "Café",
         "ﬁntech", "KI/ML", "MDR Klasse IIb", "Marketplace", "Marketing", "Kundenakquise", "Neukundengewinnung", "", "   ",
         "e-Health", "Investor Pitch", "Pitch (Sport)", "Services", "Business", "Analyses", "Companies"]
for e in EXTRA:
    raw_terms["industry"].add(e)
    raw_terms["topic"].add(e)
    raw_places.add(e)
    raw_texts.add(e)


def term_out(t):
    return dict(key=t.key, toks=list(t.toks) if t.toks is not None else None)


def place_out(p):
    return None if p is None else dict(key=p.key, toks=list(p.toks) if p.toks is not None else None, wild=p.wild)


norm = dict(
    terms=[dict(raw=r, kind=k, out=[term_out(t) for t in N3.terms([r], k, NORM)]) for k in ("industry", "topic") for r in sorted(raw_terms[k])],
    places=[dict(raw=r, out=place_out(N3.place(r, NORM))) for r in sorted(raw_places)],
    text_tokens=[dict(raw=r, out=sorted(N3.text_tokens(r))) for r in sorted(raw_texts)],
    generic_v01=[dict(raw=r, out=N2.N1.generic(r)) for r in sorted(raw_texts | raw_places)[:400]],
)
place_list = sorted(raw_places)
norm["same_place"] = [dict(a=a, b=b, out=N3.same_place(N3.place(a, NORM), N3.place(b, NORM)))
                      for i, a in enumerate(place_list[:60]) for b in place_list[i:i + 8]]
topic_list = sorted(raw_terms["topic"])
norm["same_term"] = [dict(a=a, b=b, out=any(N3.same(x, y) for x in N3.terms([a], "topic", NORM) for y in N3.terms([b], "topic", NORM)))
                     for i, a in enumerate(topic_list[:80]) for b in topic_list[i:i + 10]]

# --- Regression (Spec §18): bekannte Nicht-Holdout-Stresspaare und CONNECT-Stressfälle ohne C4 -------------------
# Die vier Paare aus der Spec sind keine Holdout-Paare. Ihre Personen werden auch dann aufgenommen, wenn sie in einem
# anderen Holdout-Paar vorkommen (Profildaten, keine Labels). Erwartungen stehen in der Spec, nicht in dieser Datei.
REG_PAIRS = {}
pairs_ids = {p["pair_id"]: p for p in json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]}
for pid in ("syn-pair0003", "syn-pair0102", "syn-pair0104", "syn-pair0206"):
    p = pairs_ids[pid]
    REG_PAIRS[pid] = dict(context=p["context"], a=p["a"], b=p["b"], a_listing=p.get("a_listing"), b_listing=p.get("b_listing"))
del pairs_ids
reg_people = {x for r in REG_PAIRS.values() for x in (r["a"], r["b"])}
pool_ids = {p.id for p in ds.people.values() if clean_person(p)} | reg_people


def ranks(scored, target):
    """Optimistischer und pessimistischer Rang – unabhängig von der Gleichstandsregel."""
    s = scored[target]
    return dict(optimistic=1 + sum(1 for c, v in scored.items() if c != target and v > s),
                pessimistic=sum(1 for c, v in scored.items() if v >= s))


regression = dict(find={}, connect={}, stress=[])
pool_find = [p for p in ds.find_pool if p.id in pool_ids]
for pid, r in REG_PAIRS.items():
    if r["context"] == "find":
        a, b = ds.people[r["a"]], ds.people[r["b"]]
        state, _ = MM.gate_find_v03(a, b, NORM)
        out = dict(pair=r, gate_state=state)
        for q, c, key in ((a, b, "rank_b_for_a"), (b, a, "rank_a_for_b")):
            scored = {}
            for x in pool_find:
                if x.id != q.id:
                    rec = MM.score_find(ctx, "F3_PH1_min60_DICT", q, x)
                    if rec["eligible"]:
                        scored[x.id] = rec["score"]
            out[key] = ranks(scored, c.id) if c.id in scored else None
        regression["find"][pid] = out
    else:
        sl, ol = ds.listings[r["a_listing"]], ds.listings[r["b_listing"]]
        scored = {}
        for o in ds.offers:
            if o.owner.id in pool_ids and o.owner.id != sl.owner.id:
                rec = MM.score_connect(cctx, "C1_topic_required_DICT", sl, o)
                if rec["eligible"]:
                    scored[o.id] = rec["score"]
        regression["connect"][pid] = dict(pair=r, gate_state=MM.score_connect(cctx, "C1_topic_required_DICT", sl, ol)["gate_state"],
                                         rank=ranks(scored, ol.id) if ol.id in scored else None)

ds_stress = V1.Dataset(profiles + stress["owners"], family_of)
cctx_stress = MM.ConnectContext(ds_stress)
stress_owner_ids = {o["id"] for o in stress["owners"] if not any(l["id"] in EX_LISTINGS for l in o["connect_listings"])}
for case in stress["cases"]:
    if case["case"] in EX_CASES:
        continue
    sl = ds_stress.listings[case["seek"]]
    scored = {}
    for o in ds_stress.offers:
        if (o.owner.id in pool_ids or o.owner.id in stress_owner_ids) and o.owner.id != sl.owner.id:
            rec = MM.score_connect(cctx_stress, "C1_topic_required_DICT", sl, o)
            if rec["eligible"]:
                scored[o.id] = rec["score"]
    # strenge Kriterien wie run_experiment_v03.stress_eval
    pess = lambda x: (1 + sum(1 for c, v in scored.items() if c != x and v >= scored[x])) if x in scored else 10 ** 6
    opt = lambda x: (1 + sum(1 for c, v in scored.items() if c != x and v > scored[x])) if x in scored else 10 ** 6
    oks = []
    for crit in case["criteria"]:
        k = crit[0]
        if k == "order":
            oks.append(crit[1] in scored and (crit[2] not in scored or scored[crit[1]] > scored[crit[2]]))
        elif k == "top":
            oks.append(pess(crit[1]) <= crit[2])
        elif k == "not_top":
            oks.append(opt(crit[1]) > crit[2])
        elif k == "gated":
            oks.append(crit[1] not in scored)
        elif k == "eligible":
            oks.append(crit[1] in scored)
    regression["stress"].append(dict(case=case["case"], kind=case["kind"], seek=case["seek"], criteria=case["criteria"],
                                     python_passed=all(oks), expect=list(case["expect"])))
idx_s = cctx_stress.text
df_s = {k: idx_s.df[k] for k in sorted(idx_s.df)}
idf_stress = dict(idf_corpus_version="synthetic-v03-all-listings-with-stress-v02", normalization_version=spec["normalization_version"],
                  n=idx_s.n, df=df_s,
                  sha256=hashlib.sha256(json.dumps(dict(n=idx_s.n, df=df_s), sort_keys=True, separators=(",", ":")).encode()).hexdigest())

# --- Schreiben -------------------------------------------------------------------------------
used_people = {p.id for p in find_people} | {l.owner.id for l in seeks + offers} | pool_ids
fixture_profiles = [p for p in profiles if p["id"] in used_people]
meta = dict(
    note="Modellausgaben des eingefrorenen v03-Codes (F3_PH1_min60_DICT, C1_topic_required_DICT, N-DICTIONARY). Keine Labels. "
         "Personen/Einträge der 40 Holdout-Paare und Holdout-Stressfälle ausgeschlossen.",
    matching_version=spec["matching_version"], normalization_version=spec["normalization_version"],
    idf_corpus_version="synthetic-v03-all-listings", now=V1.NOW, frozen_files_sha256=spec["research_basis"]["frozen_files_sha256"],
    excluded_people=len(EX_PEOPLE), excluded_listings=len(EX_LISTINGS), excluded_stress_cases=sorted(EX_CASES),
    generator_sha256=hashlib.sha256(_real_open(os.path.abspath(__file__), "rb").read()).hexdigest())
os.makedirs(OUT, exist_ok=True)


def dump(name, obj):
    with _real_open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=None, separators=(",", ":"), sort_keys=True)
        f.write("\n")


dump("synthetic-profiles-v01.json", dict(meta=meta, family_of=dict(sorted(family_of.items())), profiles=fixture_profiles))
dump("parity-find-v01.json", dict(meta=meta, pairs=find_pairs, no_consent_pairs=find_nc))
dump("parity-connect-v01.json", dict(meta=meta, pairs=connect_pairs))
dump("idf-synthetic-v03-all-listings.json", idf_snapshot)
dump("parity-normalization-v01.json", dict(meta=meta, **norm))
dump("regression-v01.json", dict(meta=meta, pool_ids=sorted(pool_ids), stress_owners=[o for o in stress["owners"] if o["id"] in stress_owner_ids],
                                 **regression))
dump("idf-synthetic-v03-all-listings-with-stress-v02.json", idf_stress)
assert not ((used_people - reg_people) & EX_PEOPLE)
print("Regression:", json.dumps({k: v for k, v in regression.items() if k != "stress"}, default=str)[:900])
print("Stress:", [(s["case"], s["python_passed"]) for s in regression["stress"]])
print(f"FIND {len(find_pairs)} + ohne Zustimmung {len(find_nc)} | CONNECT {len(connect_pairs)} | Profile {len(fixture_profiles)} | "
      f"Normalisierung {len(norm['terms'])} Begriffe, {len(norm['places'])} Orte | ausgeschlossen {len(EX_PEOPLE)} Personen, "
      f"{len(EX_LISTINGS)} Einträge, Fälle {sorted(EX_CASES)}")
