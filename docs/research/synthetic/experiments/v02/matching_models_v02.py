"""Matching-Modelle Experiment 2 (v0.2) – VOR dem Lauf festgelegt.

Baseline
--------
M7 (FIND) und M7core (CONNECT) werden NICHT kopiert, sondern aus Experiment 1 importiert
(matching_models_v01, unveraendert). Jede Variante hier aendert genau einen Baustein; der
Rest laeuft ueber dieselben v01-Funktionen. Ein Rauchtest prueft, dass die v02-Maschinerie
mit Baseline-Einstellungen fuer ALLE Paare exakt dieselben Scores und Zulassungen liefert.

Eingabe ist nur die Produktstruktur (Person/Listing aus v01). Kein Dateizugriff, keine
Testannotationen, kein Workstyle.

Ownership: nur "own" ist Ownership; grow_into deckt nichts ab (geerbt aus v01.coverage).
"""
import math
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import matching_models_v01 as V1  # noqa: E402  (eingefroren)
import normalization_v01 as N1  # noqa: E402  (eingefroren)
import normalization_v02 as N2  # noqa: E402

W = V1.FIND_WEIGHTS  # need 2, context 1, complement 1, intent 1 – unveraendert

# Rolle -> Capability-Familien (Produktsemantik der 12 FIND-Rollen und 11 Familien; fuer G3)
ROLE_FAMILIES = {
    "tech": {"technology_delivery"}, "product": {"product_value"}, "design": {"product_value"},
    "sales": {"commercial_growth"}, "growth": {"commercial_growth"}, "marketing": {"commercial_growth"},
    "community": {"communication_representation", "commercial_growth"}, "operations": {"operations_people"},
    "finance": {"finance_funding"}, "strategy": {"strategy_business_model"}, "research": {"customer_market"},
    "other": set(),
}

# ---------------------------------------------------------------------------
# Vorab festgelegte Varianten (FIND)
# ---------------------------------------------------------------------------
BASE = dict(need="v01", mutual="minbias", missing="zero", location="L0", norm="dict")


def _v(**kw):
    return dict(BASE, **kw)


FIND_VARIANTS = {
    "M7": _v(),                                   # Baseline = G0 = A0 = A4 = D0 = L0
    # Generalisten
    "G1_best_match": _v(need="G1"),
    "G2_saturation": _v(need="G2"),
    "G3_breadth_evidence": _v(need="G3"),
    "G4_rare_need": _v(need="G4"),
    # Gegenseitigkeit
    "A1_threshold_0.20": _v(mutual="t0.20"),
    "A1_threshold_0.30": _v(mutual="t0.30"),
    "A1_threshold_0.40": _v(mutual="t0.40"),
    "A2_geometric": _v(mutual="geo"),
    "A3_harmonic": _v(mutual="harm"),
    "A5_min_0.75": _v(mutual="min75"),
    "A6_need_only_mutual": _v(mutual="needonly"),
    # Fehlende Werte
    "D1_neutral_0.5": _v(missing="d1"),
    "D1_neutral_median": _v(missing="d1m"),
    "D2_shrink_0.5": _v(missing="d2"),
    "D2_shrink_median": _v(missing="d2m"),
    "D3_min_evidence": _v(missing="d3"),
    # Ort / Remote
    "L1_strict": _v(location="L1"),
    "L2_region": _v(location="L2"),
    "L3_strict_confidence": _v(location="L3"),
    # Normalisierung
    "N_v01_generic": _v(norm="v01generic"),
    "N_generic2": _v(norm="generic2"),
    "N_dict+generic2": _v(norm="dict+generic2"),
    # Vorab festgelegte Kombinationen (a priori begruendet, nicht nach Ergebnissen gewaehlt)
    "M7v2a": _v(need="G3", mutual="min75", missing="d2", location="L1", norm="dict+generic2"),
    "M7v2b_blind": _v(need="G3", mutual="min75", missing="d2", location="L1", norm="generic2"),
}

# Schwellen und Konstanten (vorab)
D3_MIN_KNOWN_SHARE = 0.6
D3_MIN_PROFILE_CONFIDENCE = 0.5
NEUTRAL = 0.5


# ---------------------------------------------------------------------------
# Kontext fuer Priors (nur Profildaten)
# ---------------------------------------------------------------------------
class Context:
    def __init__(self, ds):
        self.ds = ds
        self.pool = ds.find_pool
        self.cache = {}
        n = len(self.pool)
        # G4: Seltenheit je Rolle und je Bereich im Pool (IDF, geglaettet)
        role_n, area_n = {}, {}
        for p in self.pool:
            for r in set(p.own):
                role_n[r] = role_n.get(r, 0) + 1
            for c in p.caps:
                if c["ownership_wish"] in ("own", "contribute") and (c["application_level"] or 0) >= 3:
                    area_n[c["area_id"]] = area_n.get(c["area_id"], 0) + 1
        self.role_w = {r: 1 + math.log((n + 1) / (role_n.get(r, 0) + 1)) for r in ROLE_FAMILIES}
        self.area_w = lambda x: 1 + math.log((n + 1) / (area_n.get(x, 0) + 1))
        self.group_median = None
        self.score_median = None


def comps_v01(ctx, a, b, level):
    key = (a.id, b.id, level)
    if key not in ctx.cache:
        ctx.cache[key] = V1.find_components(a, b, level=level, view="full", own_aware=True, family_credit=True,
                                            with_criteria=False)
    return ctx.cache[key]


# ---------------------------------------------------------------------------
# Bedarf (G-Varianten)
# ---------------------------------------------------------------------------
def _entry_value(c, area, family_of):
    """Abdeckung eines EINZELNEN Eintrags fuer einen Bereich – identisch zu v01.coverage, nur ohne max ueber Eintraege."""
    same = c["area_id"] == area
    related = not same and family_of.get(c["area_id"]) == family_of.get(area) \
        and family_of.get(area) not in ("working_style", "other")
    if not (same or related):
        return 0.0
    wish, lvl = c["ownership_wish"], c["application_level"]
    if wish == "own" and (lvl or 0) >= 3:
        v = 1.0
    elif wish == "contribute" and (lvl or 0) >= 3:
        v = 0.6
    elif wish == "own":
        v = 0.4
    elif wish in ("contribute", "unclear", None) and (lvl or 0) >= 3:
        v = 0.3
    else:
        v = 0.0
    return v * 0.5 if related else v


def role_evidence(b, role):
    """G3: Eine Rolle zaehlt nur so viel, wie Bereichstiefe in ihrer Familie sie belegt."""
    fams = ROLE_FAMILIES.get(role, set())
    if not fams or not b.caps:
        return NEUTRAL
    best = 0.4
    for c in b.caps:
        if b.family_of.get(c["area_id"]) in fams:
            lvl, wish = c["application_level"] or 0, c["ownership_wish"]
            if wish == "own" and lvl >= 3:
                best = max(best, 1.0)
            elif wish == "contribute" and lvl >= 3:
                best = max(best, 0.6)
    return best


def need_variant(ctx, a, b, mode):
    seek, ho = list(a.seek), sorted(a.handovers())
    fam = a.family_of
    if mode == "G1":
        role_cover = (len(set(seek) & set(b.own)) / len(seek)) if seek else None
        cap_cover = None
        if ho and b.caps:
            cand = sorted(((_entry_value(c, x, fam), x, i) for x in ho for i, c in enumerate(b.caps)), reverse=True)
            used_need, used_entry, total = set(), set(), 0.0
            for v, x, i in cand:
                if v <= 0 or x in used_need or i in used_entry:
                    continue
                used_need.add(x); used_entry.add(i); total += v
            cap_cover = total / len(ho)
        return V1.mean_or_none([role_cover, cap_cover])
    if mode == "G2":
        role_cover = (len(set(seek) & set(b.own)) / len(seek)) if seek else None
        cap_cover = None
        if ho and b.caps:
            cap_cover = sum(min(1.0, sum(_entry_value(c, x, fam) for c in b.caps)) for x in ho) / len(ho)
        return V1.mean_or_none([role_cover, cap_cover])
    if mode == "G3":
        role_cover = (sum(role_evidence(b, r) for r in seek if r in b.own) / len(seek)) if seek else None
        cap_cover = None
        if ho and b.caps:
            cap_cover = sum(b.coverage(x, "full", True) for x in ho) / len(ho)
        return V1.mean_or_none([role_cover, cap_cover])
    if mode == "G4":
        items = [(ctx.role_w.get(r, 1.0), 1.0 if r in b.own else 0.0) for r in seek]
        if b.caps:
            items += [(ctx.area_w(x), b.coverage(x, "full", True)) for x in ho]
        if not items:
            return None
        return sum(w * v for w, v in items) / sum(w for w, _ in items)
    raise ValueError(mode)


# ---------------------------------------------------------------------------
# Kontext-Branche fuer neue Normalisierungen
# ---------------------------------------------------------------------------
def context_v2(a, b, norm):
    ia, ib = N2.terms(a.industries_raw, "industry", norm), N2.terms(b.industries_raw, "industry", norm)
    if not ia or not ib:
        return None
    return 1.0 if N2.covered(ia, ib) else 0.0


def level_of(norm):
    return {"dict": "synonym", "v01generic": "generic"}.get(norm, "synonym")


def directed(ctx, a, b, cfg):
    level = level_of(cfg["norm"])
    comps, reasons = comps_v01(ctx, a, b, level)
    comps = dict(comps)
    if cfg["norm"] in ("generic2", "dict+generic2"):
        comps["context"] = context_v2(a, b, cfg["norm"])
    if cfg["need"] != "v01":
        comps["need"] = need_variant(ctx, a, b, cfg["need"])
    return comps, reasons


def assemble(ctx, comps, missing):
    parts = {k: comps[k] for k in W}
    if missing == "zero":
        return V1.wmean(parts, W, True), 1.0
    known_w = sum(W[k] for k, v in parts.items() if v is not None)
    share = known_w / sum(W.values())
    if missing in ("d1", "d1m"):
        prior = {k: (NEUTRAL if missing == "d1" else ctx.group_median[k]) for k in W}
        return V1.wmean({k: (v if v is not None else prior[k]) for k, v in parts.items()}, W, True), share
    observed = V1.wmean(parts, W, False) if known_w else 0.0
    prior = NEUTRAL if missing in ("d2", "d3") else ctx.score_median
    return share * observed + (1 - share) * prior, share


def mutual(x, y, how):
    if how == "minbias":
        return V1.combine(x, y, "minbias")
    if how == "min75":
        return 0.75 * min(x, y) + 0.25 * (x + y) / 2
    if how == "geo":
        return math.sqrt(max(x, 0) * max(y, 0))
    if how == "harm":
        return V1.combine(x, y, "harmonic")
    raise ValueError(how)


# ---------------------------------------------------------------------------
# Gate mit Orts-/Remote-Schicht
# ---------------------------------------------------------------------------
def _cmp(p, q, loc_mode):
    if loc_mode == "L0":
        if p is None or q is None or p.wild or q.wild:
            return None
        return N2.same_place(p, q)
    return N2.same_place(p, q)


def location_pair_conflict(a, b, loc_mode, norm):
    """Vorab festgelegte Semantik (L1–L3). L0 = v01: nur beide onsite an verschiedenen Orten."""
    pa, pb = N2.place(a.location_raw, _place_mode(norm)), N2.place(b.location_raw, _place_mode(norm))
    ra, rb = a.remote, b.remote
    if loc_mode == "L0":
        return ra == rb == "onsite" and _cmp(pa, pb, "L0") is False
    if ra is None or rb is None:
        return False                      # unbekannt: kein Konflikt
    modes = {ra, rb}
    if "remote" in modes and "onsite" in modes:
        onsite_side = a if ra == "onsite" else b
        allowed = onsite_side.must.get("acceptedRemoteModes") or []
        return "remote" not in allowed
    if modes <= {"remote", "flexible", "hybrid"} and "remote" in modes:
        return False                      # remote mit remote/flexibel/hybrid: kompatibel
    if modes == {"flexible"}:
        return False
    # onsite/hybrid/flexibel untereinander: es braucht einen plausiblen gemeinsamen Ort
    if ra == rb == "onsite":
        return N2.same_place(pa, pb) is False
    same = N2.same_region(pa, pb) if loc_mode == "L2" else N2.same_place(pa, pb)
    return same is False


def _place_mode(norm):
    return {"dict": "dict", "v01generic": "dict", "generic2": "generic2", "dict+generic2": "dict+generic2"}[norm]


def gate_v2(a, b, cfg):
    norm, loc_mode = cfg["norm"], cfg["location"]
    if norm in ("dict", "v01generic") and loc_mode == "L0":
        return V1.gate(a, b, level_of(norm), "full")
    why = []
    pm = _place_mode(norm)
    for x, y, tag in ((a, b, "A"), (b, a, "B")):
        m = x.must
        if m.get("requiredRolesAny") and y.own and not set(m["requiredRolesAny"]) & set(y.own):
            why.append(f"{tag}: Pflichtrolle fehlt")
        if m.get("minimumAvailabilityHoursPerWeek") and y.hours is not None and y.hours < m["minimumAvailabilityHoursPerWeek"]:
            why.append(f"{tag}: zu wenig Stunden")
        if m.get("acceptedRemoteModes") and y.remote and y.remote != "flexible" and y.remote not in m["acceptedRemoteModes"]:
            why.append(f"{tag}: Remote-Modus passt nicht")
        if m.get("desiredLocationRegion"):
            s = _cmp(N2.place(m["desiredLocationRegion"], pm), N2.place(y.location_raw, pm), loc_mode)
            if s is False:
                why.append(f"{tag}: anderer Ort")
        if m.get("acceptedSearchIntents") and y.intent and y.intent not in m["acceptedSearchIntents"]:
            why.append(f"{tag}: Suchstand passt nicht")
        if m.get("acceptedStartHorizons") and y.horizon and y.horizon not in m["acceptedStartHorizons"]:
            why.append(f"{tag}: Start passt nicht")
        if m.get("requiredCapabilityAreasAny") and y.caps and not set(m["requiredCapabilityAreasAny"]) & y.areas("full"):
            why.append(f"{tag}: Pflichtbereich fehlt")
        if m.get("requiredExpertiseAny") and y.expertise_raw:
            want = N2.terms(m["requiredExpertiseAny"], "topic", norm if norm != "v01generic" else "dict")
            have = N2.terms(y.expertise_raw, "topic", norm if norm != "v01generic" else "dict")
            if not N2.covered(want, have):
                why.append(f"{tag}: Pflicht-Expertise fehlt")
    if location_pair_conflict(a, b, loc_mode, norm):
        why.append("Ort/Remote nicht vereinbar")
    return (not why), why


def location_confidence(a, b):
    known = [a.location_raw is not None and a.location_raw.strip() != "", b.location_raw is not None and b.location_raw.strip() != "",
             a.remote is not None, b.remote is not None]
    return sum(known) / len(known)


# ---------------------------------------------------------------------------
# FIND-Score
# ---------------------------------------------------------------------------
def score_find(ctx, name, a, b):
    cfg = FIND_VARIANTS[name]
    ok, why = gate_v2(a, b, cfg)
    c1, r1 = directed(ctx, a, b, cfg)
    c2, r2 = directed(ctx, b, a, cfg)
    conf = min(V1.confidence(a, "full"), V1.confidence(b, "full"))
    tier = 0
    if cfg["mutual"] == "needonly":
        n1, n2 = c1["need"], c2["need"]
        mn = None if (n1 is None and n2 is None) else V1.combine(n1 or 0.0, n2 or 0.0, "minbias")
        score = V1.wmean({"need": mn, "context": c1["context"], "intent": c1["intent"]},
                         {"need": 2.0, "context": 1.0, "intent": 1.0}, True)
        s1, s2 = n1, n2
    else:
        s1, k1 = assemble(ctx, c1, cfg["missing"])
        s2, k2 = assemble(ctx, c2, cfg["missing"])
        if cfg["mutual"].startswith("t"):
            t = float(cfg["mutual"][1:])
            score = V1.combine(s1, s2, "minbias") - (0 if min(s1, s2) >= t else 1.0)   # zweite Stufe, nicht entfernt
            tier = 0 if min(s1, s2) >= t else 1
        else:
            score = mutual(s1, s2, cfg["mutual"])
        if cfg["missing"] == "d3" and (min(k1, k2) < D3_MIN_KNOWN_SHARE or conf < D3_MIN_PROFILE_CONFIDENCE):
            tier = 1
            score -= 1.0                                                      # "insufficient evidence": eigene Stufe
    out = dict(score=score, eligible=ok, reasons=(why if not ok else r1 + [f"(umgekehrt) {x}" for x in r2]),
               confidence=conf, tier=tier, directed=(s1, s2))
    if cfg["location"] == "L3":
        out["location_confidence"] = location_confidence(a, b)
    return out


def prepare_priors(ctx):
    """D1m/D2m: Mediane aus den Profildaten (alle gerichteten Paare des Pools), nicht aus Testdaten."""
    vals = {k: [] for k in W}
    scores = []
    for a in ctx.pool:
        for b in ctx.pool:
            if a.id == b.id:
                continue
            comps, _ = comps_v01(ctx, a, b, "synonym")
            for k in W:
                if comps[k] is not None:
                    vals[k].append(comps[k])
            if all(comps[k] is not None for k in W):
                scores.append(V1.wmean({k: comps[k] for k in W}, W, False))
    med = lambda xs: sorted(xs)[len(xs) // 2] if xs else NEUTRAL
    ctx.group_median = {k: med(v) for k, v in vals.items()}
    ctx.score_median = med(scores)


# ---------------------------------------------------------------------------
# CONNECT
# ---------------------------------------------------------------------------
CONNECT_VARIANTS = {
    "M7core": dict(norm="dict", location="L0", topic="cov"),          # Baseline (v01, eingefroren)
    "C_L1_strict": dict(norm="dict", location="L1", topic="cov"),
    "C_v01_generic": dict(norm="v01generic", location="L0", topic="cov"),
    "C_generic2": dict(norm="generic2", location="L0", topic="cov"),
    "C_dict+generic2": dict(norm="dict+generic2", location="L0", topic="cov"),
    "C_f1_breadth": dict(norm="dict", location="L0", topic="f1"),
    "M7core_v2": dict(norm="dict+generic2", location="L1", topic="cov"),   # vorab festgelegte Kombination
}
CW = {"topic": 2.0, "category": 1.0, "industry": 1.0}


def connect_location_conflict(sl, ol, cfg):
    if cfg["location"] == "L0":
        return False                       # L0 laeuft ueber v01.connect_gate
    pm = _place_mode(cfg["norm"])
    for x, y in ((sl, ol), (ol, sl)):
        if x.scope == "regional" and x.remote == "onsite":
            px = [N2.place(v, pm) for v in x.locations_raw]
            py = [N2.place(v, pm) for v in y.locations_raw]
            px, py = [p for p in px if p is not None], [p for p in py if p is not None]
            if not px or not py:
                continue                   # unbekannt: kein Konflikt
            if not any(N2.same_place(p, q) for p in px for q in py):
                return True
    return False


def score_connect(name, sl, ol):
    cfg = CONNECT_VARIANTS[name]
    norm = cfg["norm"]
    if norm in ("dict", "v01generic") and cfg["topic"] == "cov" and cfg["location"] == "L0":
        return V1.score_connect(None, "M7core", sl, ol) if norm == "dict" else _connect_v01_generic(sl, ol)
    tm = norm if norm != "v01generic" else "dict"
    ts, to = N2.terms(sl.topics_raw, "topic", tm), N2.terms(ol.topics_raw, "topic", tm)
    reasons = []
    topic = None
    if ts and to:
        cov = N2.covered(ts, to) / len(ts)
        if cfg["topic"] == "f1":
            prec = N2.covered(to, ts) / len(to)
            topic = 0.0 if cov + prec == 0 else 2 * cov * prec / (cov + prec)
        else:
            topic = cov
        if cov:
            reasons.append("gleiches Thema")
    category = 1.0 if sl.category == ol.category else 0.0
    is_, io = N2.terms(sl.industries_raw, "industry", tm), N2.terms(ol.industries_raw, "industry", tm)
    industry = (1.0 if N2.covered(is_, io) else 0.0) if is_ and io else None
    s = V1.wmean({"topic": topic, "category": category, "industry": industry}, CW, False)
    ok, why = V1.connect_gate(sl, ol, "synonym") if cfg["location"] == "L0" else (ol.eligible(), [] if ol.eligible() else ["Angebot nicht verfügbar"])
    if cfg["location"] != "L0" and connect_location_conflict(sl, ol, cfg):
        ok, why = False, why + ["Ort/Remote nicht vereinbar"]
    filled = [bool(ts), bool(is_), bool(sl.locations_raw), sl.scope is not None]
    return dict(score=s, eligible=ok, reasons=why if not ok else reasons, confidence=sum(filled) / len(filled))


def _connect_v01_generic(sl, ol):
    cfg = dict(V1.CONNECT_MODELS["M7core"], level="generic")
    V1.CONNECT_MODELS["_v02_generic"] = cfg
    try:
        return V1.score_connect(None, "_v02_generic", sl, ol)
    finally:
        del V1.CONNECT_MODELS["_v02_generic"]
