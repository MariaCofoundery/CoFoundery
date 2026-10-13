"""Unabhaengige Pruefung der synthetischen Dateien gegen die Produktregeln (Inventur).

    python3 docs/research/synthetic/tools/validate_dataset.py [--data-dir DIR] [--report FILE]

Teilt keinen Code mit dem Generator. Gibt einen JSON-Bericht auf stdout aus und
endet mit Exit-Code 1, sobald ein Fehler gefunden wird.
"""
import argparse
import datetime as dt
import json
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

_args = argparse.ArgumentParser(description="Prueft den synthetischen Matching-Datensatz v0.1.")
_args.add_argument("--repo", default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")))
_args.add_argument("--data-dir", default=None, help="Ordner mit den JSON-Dateien (Standard: docs/research/synthetic)")
_args.add_argument("--report", default=None, help="Bericht zusaetzlich in diese Datei schreiben")
ARGS = _args.parse_args()
REPO = ARGS.repo
D = ARGS.data_dir or os.path.join(REPO, "docs/research/synthetic")
prof = json.load(open(os.path.join(D, "profiles.json")))["profiles"]
ann = json.load(open(os.path.join(D, "reference_annotations.json")))["annotations"]
ws = json.load(open(os.path.join(D, "workstyle_core.json")))["workstyle"]
pairs = json.load(open(os.path.join(D, "reference_pairs.json")))["pairs"]

AREAS = set()
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s, re.S | re.I):
        AREAS |= {r.group(1) for r in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,", m.group(2))}
ITEMS = {}
s = open(os.path.join(REPO, "supabase/migrations/20261113121000_workstyle_v3_item_seed.sql"), encoding="utf-8").read()
for it in json.loads(s[s.index("$workstyle$[") + 11: s.index("]$workstyle$") + 1]):
    if it["usage"] == "core":
        ITEMS[it["item_key"]] = it

E = []
def err(msg):
    E.append(msg)

ROLES = {"tech", "product", "sales", "growth", "marketing", "operations", "finance", "design", "strategy", "research", "community", "other"}
MUST_KEYS = {"requiredRolesAny", "requiredExpertiseAny", "desiredLocationRegion", "acceptedRemoteModes", "minimumAvailabilityHoursPerWeek",
             "requiredCapabilityAreasAny", "acceptedSearchIntents", "acceptedStartHorizons"}
REMOTE = {"onsite", "hybrid", "remote", "flexible"}

def length(v, lo, hi, what, pid):
    if v is None:
        return
    if not (lo <= len(v) <= hi):
        err(f"{pid}: {what} Länge {len(v)} außerhalb {lo}-{hi}")

ids = [p["id"] for p in prof]
if len(ids) != 200 or len(set(ids)) != 200:
    err(f"Profile: {len(ids)} / eindeutig {len(set(ids))}")
names = [p["person_core"]["display_name"] for p in prof]
if len(set(names)) != 200:
    err("display_name nicht eindeutig")
blob = json.dumps(prof, ensure_ascii=False)
if "@" in blob:
    err("Zeichen @ (E-Mail?) in Profilen")
if re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", blob):
    err("UUID-artige Kennung in Profilen")
for n in names:
    if not re.fullmatch(r"[A-ZÄÖÜ][a-zäöüß]+ Synth-\d{3}", n):
        err(f"Name nicht als synthetisch erkennbar: {n}")

listing_owner = {}
for p in prof:
    pid, pc = p["id"], p["person_core"]
    length(pc["display_name"], 2, 80, "display_name", pid)
    length(pc["headline"], 3, 160, "headline", pid)
    length(pc["bio"], 0, 1200, "bio", pid)
    if pc["location_region"] is not None:
        length(pc["location_region"], 1, 120, "location_region", pid)
    if pc["remote_mode"] not in REMOTE | {None}:
        err(f"{pid}: remote_mode {pc['remote_mode']}")
    if pc["capability_disclosure"] not in {"private", "areas", "areas_depth_on_contact"}:
        err(f"{pid}: disclosure")
    if len(pc["expertise"]) > 8 or any(len(x) > 60 for x in pc["expertise"]):
        err(f"{pid}: expertise")
    if len(pc["industries"]) > 5 or any(len(x) > 80 for x in pc["industries"]):
        err(f"{pid}: industries")
    if not set(p["profiles"]["roles"]) <= {"founder", "advisor"}:
        err(f"{pid}: roles")
    seen_area = set()
    for c in p["capability_entries"]:
        if c["area_id"] not in AREAS:
            err(f"{pid}: unbekannte area {c['area_id']}")
        if c["area_id"] in seen_area:
            err(f"{pid}: area doppelt {c['area_id']}")
        seen_area.add(c["area_id"])
        if c["application_level"] not in (None, 1, 2, 3, 4, 5):
            err(f"{pid}: level {c['application_level']}")
        if c["ownership_wish"] not in (None, "own", "contribute", "grow_into", "prefer_other", "prefer_external", "unclear"):
            err(f"{pid}: wish {c['ownership_wish']}")
    fp = p["find_profile"]
    if fp:
        if fp["status"] not in {"draft", "active", "paused"}:
            err(f"{pid}: find status")
        for k in ("own_roles", "seeking_roles"):
            if not set(fp[k]) <= ROLES or len(fp[k]) > 3:
                err(f"{pid}: {k}")
        if ("other" in fp["own_roles"]) != bool(fp["own_role_other"]) or ("other" in fp["seeking_roles"]) != bool(fp["seeking_role_other"]):
            err(f"{pid}: role_other inkonsistent")
        if not 1 <= fp["availability_hours_per_week"] <= 100:
            err(f"{pid}: hours")
        if fp["availability_flexibility"] not in (None, "fixed", "would_expand"):
            err(f"{pid}: flexibility")
        if fp["availability_condition"] is not None:
            if fp["availability_flexibility"] != "would_expand":
                err(f"{pid}: condition ohne would_expand")
            length(fp["availability_condition"], 10, 200, "availability_condition", pid)
        if fp["commitment_level"] not in {"exploring", "side_project", "part_time", "full_time", "all_in"}:
            err(f"{pid}: commitment")
        if fp["venture_stage"] not in {"undecided", "no_idea_open_to_join", "exploring_ideas", "idea_validating", "already_building"}:
            err(f"{pid}: stage")
        if fp["venture_goal"] not in {"undecided", "explore", "side_project", "profitable_business", "venture_scale", "exit_oriented"}:
            err(f"{pid}: goal")
        if fp["search_intent"] not in (None, "ready_now", "actively_exploring", "open_later"):
            err(f"{pid}: intent")
        if fp["start_horizon"] not in (None, "now", "next_3_months", "next_6_months", "later_or_flexible"):
            err(f"{pid}: horizon")
        length(fp["recent_step"], 20, 280, "recent_step", pid)
        if fp["status"] == "active":
            if not fp["own_roles"] or not fp["seeking_roles"] or fp["commitment_level"] == "exploring" \
                    or fp["venture_stage"] == "undecided" or fp["venture_goal"] == "undecided" or len(pc["headline"]) < 3:
                err(f"{pid}: aktives FIND-Profil unvollständig")
        if not set(fp["must_haves"]) <= MUST_KEYS:
            err(f"{pid}: unbekannte must_haves {set(fp['must_haves']) - MUST_KEYS}")
        for a in fp["must_haves"].get("requiredCapabilityAreasAny", []):
            if a not in AREAS:
                err(f"{pid}: must area {a}")
        if len(fp["must_haves"].get("requiredCapabilityAreasAny", [])) > 12:
            err(f"{pid}: must areas > 12")
    cp = p["connect_profile"]
    if cp:
        if cp["status"] == "active":
            if len(pc["bio"]) < 20 or not cp["network_roles"]:
                err(f"{pid}: CONNECT aktiv unvollständig")
        if not 1 <= len(cp["network_roles"]) <= 4 or not set(cp["network_roles"]) <= {"founder", "aspiring_founder", "expert", "advisor_mentor", "business_angel", "company_representative"}:
            err(f"{pid}: network_roles")
        if len(cp["open_to_formats"]) > 6 or not set(cp["open_to_formats"]) <= {"coffee", "walk", "video", "call", "sparring", "intro"}:
            err(f"{pid}: formats")
        length(cp["network_reach"], 20, 400, "network_reach", pid)
        length(cp["contact_note"], 10, 300, "contact_note", pid)
        if cp["visibility"] != "members_only":
            err(f"{pid}: visibility (Beta)")
    if p["connect_listings"] and not cp:
        err(f"{pid}: Einträge ohne CONNECT-Profil")
    if len(p["connect_listings"]) > 3:
        err(f"{pid}: mehr als 3 Einträge")
    for l in p["connect_listings"]:
        listing_owner[l["id"]] = pid
        if l["direction"] not in {"seeking", "offering"} or l["category"] not in {"expertise", "cooperation", "investment", "sparring", "succession"}:
            err(f"{l['id']}: direction/category")
        length(l["title"], 5, 100, "title", l["id"])
        length(l["summary"], 20, 800, "summary", l["id"])
        if len(l["topics"]) > 8 or len(l["industries"]) > 5 or len(l["locations"]) > 3:
            err(f"{l['id']}: Listen zu lang")
        if l["geographic_scope"] not in (None, "regional", "germany", "europe", "global"):
            err(f"{l['id']}: scope")
        if l["remote_mode"] is not None and l["category"] not in ("expertise", "cooperation", "sparring"):
            err(f"{l['id']}: remote_mode bei {l['category']}")
        if l["venture_stage"] is not None and (l["category"] not in ("expertise", "cooperation", "investment")
                                               or l["venture_stage"] not in {"exploring", "idea", "validation", "early", "growth", "established"}):
            err(f"{l['id']}: venture_stage")
        if l["status"] not in {"draft", "active", "paused", "completed"}:
            err(f"{l['id']}: status")
        if dt.date.fromisoformat(l["expires_at"]) - dt.date.fromisoformat(l["published_at"]) != dt.timedelta(days=60):
            err(f"{l['id']}: Laufzeit != 60 Tage")
    for pr in p["connect_problems"]:
        length(pr["title"], 5, 120, "problem title", pr["id"])
        length(pr["description"], 50, 2000, "problem description", pr["id"])
        if pr["author_intent"] not in {"observation", "wants_to_build", "already_building"} or pr["geographic_scope"] not in {"regional", "germany", "europe", "global"}:
            err(f"{pr['id']}: intent/scope")
    for r in p["person_resources"]:
        length(r["label"], 3, 160, "resource label", pid)
    if pid not in ann or pid not in ws:
        err(f"{pid}: fehlt in Annotation/Workstyle")
    # Referenzschicht darf nicht im Produktprofil stehen
    for k in ("primary_scenario", "canonical_industries", "designed_match_cluster", "synthetic_archetype"):
        if k in json.dumps(p):
            err(f"{pid}: Referenzfeld {k} im Produktprofil")

# Stunden passen zur Commitment-Stufe (ausser ausdruecklich als Widerspruch annotiert)
BANDS = {"side_project": (4, 12), "part_time": (12, 30), "full_time": (35, 50), "all_in": (48, 65), "exploring": (1, 100)}
for p in prof:
    fp = p["find_profile"]
    if fp and not BANDS[fp["commitment_level"]][0] <= fp["availability_hours_per_week"] <= BANDS[fp["commitment_level"]][1] \
            and not ann[p["id"]]["contradictions"]:
        err(f"{p['id']}: {fp['availability_hours_per_week']} h passen nicht zu {fp['commitment_level']}")
# Onsite nur mit konkretem Ort (ausser Widerspruchsfall)
for p in prof:
    if p["person_core"]["remote_mode"] == "onsite" and ann[p["id"]]["canonical_location"] == "anywhere_dach" and not ann[p["id"]]["contradictions"]:
        err(f"{p['id']}: onsite ohne konkreten Ort")

# grow_into ist nie Ownership in der Referenzschicht
for pid, a in ann.items():
    if set(a["canonical_capabilities"]["grow_into"]) & set(a["canonical_capabilities"]["covers_own_level3plus"]):
        err(f"{pid}: grow_into als Ownership gezählt")

# Workstyle
for pid, w in ws.items():
    if set(w["answers"]) != set(ITEMS):
        err(f"{pid}: Workstyle-Items {len(w['answers'])}")
    for k, v in w["answers"].items():
        it = ITEMS[k]
        if v["value"] is None:
            if v["missing_code"] != "cannot_assess":
                err(f"{pid}/{k}: missing_code")
        elif it["response_format"] == "comparative":
            if v["value"].get("optionId") not in {o["option_id"] for o in it["options"]}:
                err(f"{pid}/{k}: optionId")
        elif v["value"].get("scale") not in (1, 2, 3, 4, 5):
            err(f"{pid}/{k}: scale")
    if any(k.startswith(("DEC", "FS")) or k.endswith("-R1") for k in w["answers"]):
        err(f"{pid}: Research-Item erzeugt")

# Paare
pidset = set(ids)
keys = set()
for p in pairs:
    if p["a"] not in pidset or p["b"] not in pidset or p["a"] == p["b"]:
        err(f"{p['pair_id']}: Personen ungültig")
    k = (tuple(sorted((p["a"], p["b"]))), p["context"], p["a_listing"], p["b_listing"])
    if k in keys:
        err(f"{p['pair_id']}: doppelt")
    keys.add(k)
    if p["context"] == "connect":
        if listing_owner.get(p["a_listing"]) != p["a"] or listing_owner.get(p["b_listing"]) != p["b"]:
            err(f"{p['pair_id']}: Eintrag gehört nicht zur Person")
    if p["context"] == "find":
        for x in (p["a"], p["b"]):
            fp = next(q for q in prof if q["id"] == x)["find_profile"]
            if not fp or fp["status"] != "active":
                err(f"{p['pair_id']}: FIND-Paar mit inaktivem Profil {x}")
    if not p["rationale"] or len(p["rationale"]) < 30:
        err(f"{p['pair_id']}: Begründung fehlt")
    if "workstyle" in json.dumps(p["dimensions"]).lower():
        err(f"{p['pair_id']}: Workstyle in Dimensionen")

# Workstyle-Unabhaengigkeit: Anteil gleicher Baender je Klasse
def bands(pid):
    out = {}
    for area in ("EVI", "EXP", "EL", "VOICE", "AMB", "ORG"):
        vals = []
        for k, v in ws[pid]["answers"].items():
            if ITEMS[k]["area_key"] != area or v["value"] is None:
                continue
            if "scale" in v["value"]:
                vals.append(v["value"]["scale"])
            else:
                vals.append({"strong_a": 1, "lean_a": 2, "lean_b": 4, "strong_b": 5}[v["value"]["optionId"]])
        m = statistics.median(vals) if vals else 3
        out[area] = "lower" if m < 2.5 else "upper" if m > 3.5 else "middle"
    return out
sim = defaultdict(list)
for p in pairs:
    ba, bb = bands(p["a"]), bands(p["b"])
    sim[p["reference_class"]].append(sum(ba[x] == bb[x] for x in ba) / 6)
ws_by_class = {k: round(statistics.mean(v), 3) for k, v in sim.items()}

# Verteilungen
scen = Counter(a["primary_scenario"] for a in ann.values())
find_active = sum(1 for p in prof if p["find_profile"] and p["find_profile"]["status"] == "active")
find_inactive = sum(1 for p in prof if p["find_profile"] and p["find_profile"]["status"] != "active")
connect_active = sum(1 for p in prof if p["connect_profile"] and p["connect_profile"]["status"] == "active")
listings = [l for p in prof for l in p["connect_listings"]]
problems = [x for p in prof for x in p["connect_problems"]]
missing = {
    "location_region": sum(p["person_core"]["location_region"] is None for p in prof),
    "remote_mode": sum(p["person_core"]["remote_mode"] is None for p in prof),
    "industries_empty": sum(not p["person_core"]["industries"] for p in prof),
    "expertise_empty": sum(not p["person_core"]["expertise"] for p in prof),
    "no_capability_entries": sum(not p["capability_entries"] for p in prof),
    "capability_level_null": sum(c["application_level"] is None for p in prof for c in p["capability_entries"]),
    "capability_wish_null": sum(c["ownership_wish"] is None for p in prof for c in p["capability_entries"]),
    "capability_entries_total": sum(len(p["capability_entries"]) for p in prof),
    "find_search_intent_null": sum(1 for p in prof if p["find_profile"] and p["find_profile"]["search_intent"] is None),
    "find_start_horizon_null": sum(1 for p in prof if p["find_profile"] and p["find_profile"]["start_horizon"] is None),
    "find_flexibility_null": sum(1 for p in prof if p["find_profile"] and p["find_profile"]["availability_flexibility"] is None),
    "find_recent_step_null": sum(1 for p in prof if p["find_profile"] and p["find_profile"]["recent_step"] is None),
    "find_no_must_haves": sum(1 for p in prof if p["find_profile"] and not p["find_profile"]["must_haves"]),
    "no_find_profile": sum(1 for p in prof if not p["find_profile"]),
    "no_connect_profile": sum(1 for p in prof if not p["connect_profile"]),
}
ind_forms = Counter(x for p in prof for x in p["person_core"]["industries"])
loc_forms = Counter(p["person_core"]["location_region"] for p in prof if p["person_core"]["location_region"])
per_canon = defaultdict(set)
for p in prof:
    for canon, surf in zip(ann[p["id"]]["canonical_industries"], p["person_core"]["industries"]):
        per_canon[canon].add(surf)
loc_canon = defaultdict(set)
for p in prof:
    if p["person_core"]["location_region"]:
        loc_canon[ann[p["id"]]["canonical_location"]].add(p["person_core"]["location_region"])
positive = [p for p in pairs if p["reference_class"] in ("excellent_candidate", "promising") and p["context"] == "find"]
no_overlap = sum(1 for p in positive if not p["diagnostic_raw_string_overlap"])
same_canon_diff_surface = 0
for p in positive:
    ca, cb = set(ann[p["a"]]["canonical_industries"]), set(ann[p["b"]]["canonical_industries"])
    sa = {x.lower() for x in next(q for q in prof if q["id"] == p["a"])["person_core"]["industries"]}
    sb = {x.lower() for x in next(q for q in prof if q["id"] == p["b"])["person_core"]["industries"]}
    if ca & cb and not sa & sb:
        same_canon_diff_surface += 1

report = dict(
    errors=E, profiles=len(prof), scenarios=dict(scen), find_active=find_active, find_inactive_profile=find_inactive,
    connect_active=connect_active, listings=len(listings), listings_by=dict(Counter(f"{l['direction']}/{l['status']}" for l in listings)),
    listing_categories=dict(Counter(l["category"] for l in listings)), problems=len(problems), missing=missing,
    industry_surface_forms=len(ind_forms), industry_forms_per_canon={k: sorted(v) for k, v in per_canon.items()},
    location_surface_forms=len(loc_forms), location_forms_per_canon={k: sorted(v) for k, v in loc_canon.items()},
    locale=dict(Counter(a["locale"] for a in ann.values())),
    pairs=len(pairs), pairs_by_class=dict(Counter(p["reference_class"] for p in pairs)),
    pairs_by_context_class={f"{c}/{k}": v for (c, k), v in Counter((p["context"], p["reference_class"]) for p in pairs).items()},
    pairs_by_source=dict(Counter(p["source"] for p in pairs)),
    positive_find_pairs=len(positive), positive_find_pairs_without_raw_overlap=no_overlap,
    positive_find_pairs_same_canonical_industry_but_no_string_match=same_canon_diff_surface,
    workstyle_same_band_share_by_class=ws_by_class,
    commitment=dict(Counter(p["find_profile"]["commitment_level"] for p in prof if p["find_profile"])),
    stage=dict(Counter(p["find_profile"]["venture_stage"] for p in prof if p["find_profile"])),
    remote=dict(Counter(p["person_core"]["remote_mode"] for p in prof)),
    industries_canon=dict(Counter(c for a in ann.values() for c in a["canonical_industries"])),
    own_roles=dict(Counter(r for p in prof if p["find_profile"] for r in p["find_profile"]["own_roles"])),
)
if ARGS.report:
    json.dump(report, open(ARGS.report, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({k: v for k, v in report.items() if k not in ("industry_forms_per_canon", "location_forms_per_canon")}, ensure_ascii=False, indent=1))
sys.exit(1 if E else 0)
