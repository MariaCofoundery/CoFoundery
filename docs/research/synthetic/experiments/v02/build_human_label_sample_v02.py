"""Stichprobe fuer menschliche Labels (Experiment 2). Erzeugt KEINE Labels.

    python3 docs/research/synthetic/experiments/v02/build_human_label_sample_v02.py

Auswahl: geschichtet nach Referenzklasse und Quelle (konstruiert/Kontrast), plus feste
Grenzfaelle. Grundlage sind nur Referenzpaare, Profildaten und die v02-Stressfaelle –
KEINE Modellergebnisse.

Ausgabe:
  human_label_sample_v02.json      – nur, was ein Reviewer sehen darf (keine Klasse, kein Score,
                                     kein Szenario, keine Annotation, keine Personen-IDs, keine Namen)
  human_label_sample_key_v02.json  – interne Zuordnung; NICHT an Reviewer geben
"""
import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
DATA = os.path.join(REPO, "docs/research/synthetic")
rnd = random.Random(20261014)

profiles = {p["id"]: p for p in json.load(open(os.path.join(DATA, "profiles.json"), encoding="utf-8"))["profiles"]}
pairs = json.load(open(os.path.join(DATA, "reference_pairs.json"), encoding="utf-8"))["pairs"]
stress = json.load(open(os.path.join(HERE, "connect_stress_v02.json"), encoding="utf-8"))
labels = json.load(open(os.path.join(REPO, "web/messages/de/capability.json"), encoding="utf-8"))
for o in stress["owners"]:
    profiles[o["id"]] = o

AREA = labels["areaLabels"]
LEVEL = labels["levels"]
WISH = labels["ownershipWishes"]


def person_view(pid, *, with_find=True):
    p = profiles[pid]
    pc, fp = p["person_core"], p["find_profile"] or {}
    view = dict(
        headline=pc["headline"], bio=pc["bio"], ort=pc["location_region"], arbeitsweise_ort=pc["remote_mode"],
        branchen=pc["industries"], expertise=pc["expertise"],
        capabilities=[dict(bereich=AREA.get(c["area_id"], c["area_id"]),
                           erfahrung=LEVEL.get(str(c["application_level"])) if c["application_level"] else LEVEL["unset"],
                           verantwortung=WISH.get(c["ownership_wish"]) if c["ownership_wish"] else WISH["unset"])
                      for c in p["capability_entries"]],
    )
    if with_find and fp:
        view["find"] = dict(
            bringt_rollen=fp["own_roles"] + ([f"other: {fp['own_role_other']}"] if fp.get("own_role_other") else []),
            sucht_rollen=fp["seeking_roles"] + ([f"other: {fp['seeking_role_other']}"] if fp.get("seeking_role_other") else []),
            stunden_pro_woche=fp["availability_hours_per_week"], flexibilitaet=fp["availability_flexibility"],
            bedingung=fp["availability_condition"], commitment=fp["commitment_level"], vorhaben_phase=fp["venture_stage"],
            ziel=fp["venture_goal"], suchstand=fp["search_intent"], start=fp["start_horizon"], letzter_schritt=fp["recent_step"],
            private_suchkriterien=fp["must_haves"])
    return view


def listing_view(lid):
    for p in profiles.values():
        for l in p["connect_listings"]:
            if l["id"] == lid:
                owner = p
                return dict(
                    richtung=l["direction"], kategorie=l["category"], titel=l["title"], beschreibung=l["summary"],
                    themen=l["topics"], branchen=l["industries"], orte=l["locations"], zielgebiet=l["geographic_scope"],
                    arbeitsweise_ort=l["remote_mode"], phase=l["venture_stage"], status=l["status"],
                    veroeffentlicht=l["published_at"], laeuft_bis=l["expires_at"],
                    person=dict(headline=owner["person_core"]["headline"], ort=owner["person_core"]["location_region"],
                                expertise=owner["person_core"]["expertise"], branchen=owner["person_core"]["industries"]))
    raise KeyError(lid)


def by_id(pid):
    return next(p for p in pairs if p["pair_id"] == pid)


def stratified(context, targets, exclude_ids):
    chosen = []
    for cls, n in targets.items():
        pool = [p for p in pairs if p["context"] == context and p["reference_class"] == cls and p["pair_id"] not in exclude_ids]
        contrast = [p for p in pool if p["source"] == "contrast_selection"]
        constructed = [p for p in pool if p["source"] != "contrast_selection"]
        rnd.shuffle(contrast); rnd.shuffle(constructed)
        k_contrast = min(len(contrast), round(n / 3)) if contrast else 0
        pick = contrast[:k_contrast] + constructed[: n - k_contrast]
        if len(pick) < n:
            pick += contrast[k_contrast: k_contrast + (n - len(pick))]
        chosen += pick
    return chosen


items, key = [], []

# FIND: feste Grenzfaelle
FIXED_FIND = ["syn-pair0003", "syn-pair0297", "syn-pair0102", "syn-pair0104", "syn-pair0021", "syn-pair0346"]
find_sel = [(by_id(x), "edge_known_stress") for x in FIXED_FIND]

# FIND: Ortssemantik – positive Paare, beide hybrid/flexibel an verschiedenen angegebenen Orten (Regel aus Profildaten)
loc_edge = [p for p in pairs if p["context"] == "find" and p["reference_class"] in ("excellent_candidate", "promising", "worth_exploring")
            and p["pair_id"] not in FIXED_FIND
            and {profiles[p["a"]]["person_core"]["remote_mode"], profiles[p["b"]]["person_core"]["remote_mode"]} <= {"hybrid", "flexible"}
            and profiles[p["a"]]["person_core"]["location_region"] and profiles[p["b"]]["person_core"]["location_region"]
            and profiles[p["a"]]["person_core"]["location_region"].split(",")[0].strip().lower()
            != profiles[p["b"]]["person_core"]["location_region"].split(",")[0].strip().lower()]
rnd.shuffle(loc_edge)
find_sel += [(p, "edge_location_semantics") for p in loc_edge[:6]]
used = {p["pair_id"] for p, _ in find_sel}
find_sel += [(p, "stratified") for p in stratified("find", {"excellent_candidate": 9, "promising": 10, "worth_exploring": 10,
                                                             "asymmetric": 10, "low_relevance": 10, "exclude": 8,
                                                             "insufficient_data": 6}, used)]

# CONNECT
FIXED_CONNECT = ["syn-pair0206"]
conn_sel = [(by_id(x), "edge_known_stress") for x in FIXED_CONNECT]
used = set(FIXED_CONNECT)
conn_sel += [(p, "stratified") for p in stratified("connect", {"excellent_candidate": 9, "promising": 9, "low_relevance": 10,
                                                                "exclude": 6, "insufficient_data": 5}, used)]
# CONNECT: v02-Stressfaelle (Erwartung aus connect_stress_v02.json)
STRESS_PICK = [("C2", 1), ("C4", 0), ("C5", 0), ("C11", 1), ("C10", 0)]
stress_sel = []
for cid, idx in STRESS_PICK:
    case = next(c for c in stress["cases"] if c["case"] == cid)
    offer = list(case["expect"])[idx]
    stress_sel.append((case, offer))

entries = []
for p, why in find_sel:
    entries.append(("find", dict(person_a=person_view(p["a"]), person_b=person_view(p["b"])),
                    dict(pair_id=p["pair_id"], reference_class=p["reference_class"], source=p["source"], selection=why)))
for p, why in conn_sel:
    entries.append(("connect", dict(gesuch=listing_view(p["a_listing"]), angebot=listing_view(p["b_listing"])),
                    dict(pair_id=p["pair_id"], reference_class=p["reference_class"], source=p["source"], selection=why)))
for case, offer in stress_sel:
    entries.append(("connect", dict(gesuch=listing_view(case["seek"]), angebot=listing_view(offer)),
                    dict(pair_id=None, stress_case=case["case"], stress_kind=case["kind"], expected=case["expect"][offer],
                         source="v02_connect_stress", selection="edge_v02_connect_stress")))

rnd.shuffle(entries)
for i, (ctx, view, k) in enumerate(entries, 1):
    sid = f"hv02-{i:03d}"
    items.append(dict(sample_id=sid, context=ctx, **view))
    key.append(dict(sample_id=sid, context=ctx, **k))

json.dump(dict(meta=dict(version="v02", note="Reviewer-Sicht. Keine Referenzklasse, kein Modellscore, kein Szenario, keine Annotation, "
                         "keine Personen-IDs oder Namen. Vollständig synthetische Daten.",
                         counts=dict(find=sum(1 for e in entries if e[0] == "find"), connect=sum(1 for e in entries if e[0] == "connect"))),
               items=items), open(os.path.join(HERE, "human_label_sample_v02.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(meta=dict(note="INTERN – nicht an Reviewer geben. Ordnet Stichprobe zu Referenzpaar/Stressfall zu."), key=key),
          open(os.path.join(HERE, "human_label_sample_key_v02.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

from collections import Counter  # noqa: E402
print("FIND", sum(1 for e in entries if e[0] == "find"), "CONNECT", sum(1 for e in entries if e[0] == "connect"))
print(Counter((k["context"], k.get("reference_class", "stress:" + str(k.get("expected")))) for k in key))
print(Counter(k["selection"] for k in key), Counter(k["source"] == "contrast_selection" for k in key))
