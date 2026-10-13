"""Matching-Modelle M0–M8 (Experiment v0.1).

EINGABE IST AUSSCHLIESSLICH profiles.json – dieselbe Struktur, die das Produkt
kennt. Dieses Modul liest keine Datei; es bekommt die Profile als Python-Objekte.
Testannotationen und Referenzpaare kennt es nicht. Workstyle kommt nicht vor.

Konventionen
------------
* Jede Komponente liefert einen Wert in [0, 1] oder None ("nicht berechenbar").
* Bis M7 zaehlt None wie 0 (naive Behandlung). Erst M8 rechnet fehlende
  Komponenten heraus und haelt die Datenlage als eigene Confidence.
* Ownership: NUR ownership_wish == "own" ist ein Ownership-Wunsch.
  grow_into ist kein Ownership und deckt nichts ab.
  Erfahrung (application_level) und Wunsch (ownership_wish) sind getrennte Achsen.
* Gewichte: wenige, feste Gruppengewichte (unten). Kein Tuning.
"""
import hashlib
import math

import normalization_v01 as N

NOW = "2026-10-13"

# Gruppengewichte (FIND). Bedarf zaehlt doppelt, alles andere einfach.
FIND_WEIGHTS = {"need": 2.0, "context": 1.0, "complement": 1.0, "intent": 1.0}
FIND_WEIGHTS_EQUAL = {"need": 1.0, "context": 1.0, "complement": 1.0, "intent": 1.0}
# Gruppengewichte (CONNECT).
CONNECT_WEIGHTS = {"topic": 2.0, "category": 1.0, "industry": 1.0, "profile": 1.0, "stage": 1.0}

INTENTS = ["ready_now", "actively_exploring", "open_later"]
HORIZONS = ["now", "next_3_months", "next_6_months", "later_or_flexible"]
COMMITMENT = ["exploring", "side_project", "part_time", "full_time", "all_in"]
GOAL_GROUP = {"explore": 0, "side_project": 0, "profitable_business": 1, "venture_scale": 2, "exit_oriented": 2}
LISTING_STAGE = ["exploring", "idea", "validation", "early", "growth", "established"]


def recency_key(pid):
    """FIND-Profile haben im Datensatz kein published_at. Das Produkt sortiert nach
    Veroeffentlichung – fuer die Relevanz ist das eine feste, aber zufaellige Ordnung."""
    return hashlib.sha256(pid.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Datenaufbereitung (nur Produktfelder)
# ---------------------------------------------------------------------------
class Person:
    def __init__(self, raw, family_of):
        pc = raw["person_core"]
        fp = raw["find_profile"] or {}
        self.id = raw["id"]
        self.raw = raw
        self.find_active = bool(fp) and fp.get("status") == "active"
        self.connect_active = bool(raw["connect_profile"]) and raw["connect_profile"].get("status") == "active"
        self.own = list(fp.get("own_roles") or [])
        self.seek = list(fp.get("seeking_roles") or [])
        self.hours = fp.get("availability_hours_per_week")
        self.flex = fp.get("availability_flexibility")
        self.commitment = fp.get("commitment_level")
        self.stage = fp.get("venture_stage")
        self.goal = fp.get("venture_goal")
        self.intent = fp.get("search_intent")
        self.horizon = fp.get("start_horizon")
        self.must = fp.get("must_haves") or {}
        self.remote = pc.get("remote_mode")
        self.location_raw = pc.get("location_region")
        self.industries_raw = pc.get("industries") or []
        self.expertise_raw = pc.get("expertise") or []
        self.disclosure = pc.get("capability_disclosure")
        self.caps = raw["capability_entries"] or []
        self.family_of = family_of
        self._cache = {}

    # --- Freitext je Normalisierungsstufe --------------------------------
    def ind(self, level):
        return self._memo(("ind", level), lambda: N.terms(self.industries_raw, "industry", level))

    def exp(self, level):
        return self._memo(("exp", level), lambda: N.terms(self.expertise_raw, "topic", level))

    def loc(self, level):
        return self._memo(("loc", level), lambda: N.location(self.location_raw, level))

    def _memo(self, key, fn):
        if key not in self._cache:
            self._cache[key] = fn()
        return self._cache[key]

    # --- Capability (Sicht: "full" = alle Angaben, "disclosed" = nur Freigegebenes) ---
    def cap_view(self, view):
        if view == "full":
            return self.caps
        if self.disclosure == "private":
            return []
        # Vor einem Kontakt sind Stufe und Wunsch nie sichtbar (get_disclosed_capability).
        return [dict(area_id=c["area_id"], application_level=None, ownership_wish=None) for c in self.caps]

    def areas(self, view):
        return {c["area_id"] for c in self.cap_view(view)}

    def handovers(self):
        # Die eigenen Angaben sieht die suchende Person immer vollstaendig.
        return {c["area_id"] for c in self.caps if c["ownership_wish"] in ("prefer_other", "prefer_external")}

    def coverage(self, area, view, family_credit):
        """Wie gut deckt diese Person einen Bereich ab? Erfahrung und Wunsch getrennt bewertet."""
        best = 0.0
        for c in self.cap_view(view):
            same = c["area_id"] == area
            related = family_credit and not same and self.family_of.get(c["area_id"]) == self.family_of.get(area) \
                and self.family_of.get(area) not in ("working_style", "other")
            if not (same or related):
                continue
            wish, lvl = c["ownership_wish"], c["application_level"]
            if view == "disclosed" and wish is None:
                v = 0.5                               # Bereich sichtbar, Tiefe/Wunsch nicht
            elif wish == "own" and (lvl or 0) >= 3:
                v = 1.0                               # ausdruecklicher Ownership-Wunsch mit Erfahrung
            elif wish == "contribute" and (lvl or 0) >= 3:
                v = 0.6
            elif wish == "own":
                v = 0.4                               # will verantworten, Erfahrung niedrig/unbekannt
            elif wish in ("contribute", "unclear", None) and (lvl or 0) >= 3:
                v = 0.3
            else:
                v = 0.0                               # grow_into, prefer_* oder nichts: deckt nicht ab
            if related:
                v *= 0.5
            best = max(best, v)
        return best


class Listing:
    def __init__(self, raw_listing, owner):
        self.raw = raw_listing
        self.id = raw_listing["id"]
        self.owner = owner
        self.direction = raw_listing["direction"]
        self.category = raw_listing["category"]
        self.topics_raw = raw_listing["topics"] or []
        self.industries_raw = raw_listing["industries"] or []
        self.locations_raw = raw_listing["locations"] or []
        self.scope = raw_listing["geographic_scope"]
        self.remote = raw_listing["remote_mode"]
        self.stage = raw_listing["venture_stage"]
        self.status = raw_listing["status"]
        self.published_at = raw_listing["published_at"]
        self.expires_at = raw_listing["expires_at"]

    def eligible(self):
        return self.status == "active" and self.expires_at >= NOW and self.owner.connect_active

    def top(self, level):
        return N.terms(self.topics_raw, "topic", level)

    def ind(self, level):
        return N.terms(self.industries_raw, "industry", level)

    def locs(self, level):
        return {N.location(x, level) for x in self.locations_raw} - {None}


class Dataset:
    def __init__(self, profiles, family_of):
        self.people = {p["id"]: Person(p, family_of) for p in profiles}
        self.find_pool = [p for p in self.people.values() if p.find_active]
        self.listings = {}
        for p in self.people.values():
            for l in p.raw["connect_listings"]:
                self.listings[l["id"]] = Listing(l, p)
        self.offers = [l for l in self.listings.values() if l.direction == "offering"]


# ---------------------------------------------------------------------------
# Hilfen
# ---------------------------------------------------------------------------
def wmean(parts, weights, missing_as_zero):
    num = den = 0.0
    for k, v in parts.items():
        w = weights.get(k, 0.0)
        if not w:
            continue
        if v is None:
            if missing_as_zero:
                den += w
            continue
        num += w * v
        den += w
    return (num / den) if den else 0.0


def mean_or_none(values):
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


# ---------------------------------------------------------------------------
# FIND: Filter wie heute (search_by_frame) – einseitig, Kriterien der suchenden Person
# ---------------------------------------------------------------------------
def product_filter(a, b, level, view="disclosed"):
    """Gibt (eligible, gruende) zurueck. Semantik wie search_by_frame: NULL faellt raus."""
    m = a.must
    why = []
    if m.get("requiredRolesAny") and not set(m["requiredRolesAny"]) & set(b.own):
        why.append("Rolle nicht dabei")
    if m.get("requiredExpertiseAny"):
        want = N.terms(m["requiredExpertiseAny"], "topic", level)
        if not want & b.exp(level):
            why.append("Expertise-Begriff nicht gefunden")
    if m.get("desiredLocationRegion"):
        if N.location(m["desiredLocationRegion"], level) != b.loc(level):
            why.append("Ort stimmt nicht überein")
    if m.get("acceptedRemoteModes") and b.remote not in m["acceptedRemoteModes"]:
        why.append("Remote-Modus nicht akzeptiert (leer zählt als nein)")
    if m.get("minimumAvailabilityHoursPerWeek") and (b.hours or 0) < m["minimumAvailabilityHoursPerWeek"]:
        why.append("zu wenig Stunden")
    if m.get("acceptedSearchIntents") and b.intent not in m["acceptedSearchIntents"]:
        why.append("Suchstand nicht akzeptiert (leer zählt als nein)")
    if m.get("acceptedStartHorizons") and b.horizon not in m["acceptedStartHorizons"]:
        why.append("Start nicht akzeptiert (leer zählt als nein)")
    if m.get("requiredCapabilityAreasAny") and not set(m["requiredCapabilityAreasAny"]) & b.areas(view):
        why.append("Pflichtbereich nicht sichtbar")
    return (not why), why


# ---------------------------------------------------------------------------
# FIND: gerichtete Komponenten A -> B
# ---------------------------------------------------------------------------
def find_components(a, b, *, level, view, own_aware, family_credit, with_criteria):
    reasons = []
    # Bedarf: gesuchte Rollen
    role_cover = None
    if a.seek:
        hit = set(a.seek) & set(b.own)
        role_cover = len(hit) / len(a.seek)
        if hit:
            reasons.append(f"bringt gesuchte Rolle {'/'.join(sorted(hit))} mit")
    # Bedarf: Bereiche, die A abgeben will
    cap_cover = None
    ho = a.handovers()
    if ho and b.cap_view(view):
        if own_aware:
            cov = [b.coverage(x, view, family_credit) for x in ho]
        else:
            cov = [1.0 if x in b.areas(view) else 0.0 for x in ho]
        cap_cover = sum(cov) / len(cov)
        if cap_cover >= 0.5:
            reasons.append("deckt Bereiche ab, die A abgeben will")
    # Bedarf: ausdrueckliche Suchkriterien als Relevanz (nur bis M6)
    crit_cover = None
    if with_criteria:
        checks = []
        if a.must.get("requiredRolesAny"):
            checks.append(bool(set(a.must["requiredRolesAny"]) & set(b.own)))
        if a.must.get("requiredExpertiseAny"):
            checks.append(bool(N.terms(a.must["requiredExpertiseAny"], "topic", level) & b.exp(level)))
        if a.must.get("requiredCapabilityAreasAny"):
            checks.append(bool(set(a.must["requiredCapabilityAreasAny"]) & b.areas(view)))
        if checks:
            crit_cover = sum(checks) / len(checks)
    need = mean_or_none([role_cover, cap_cover, crit_cover])

    # Kontext: gemeinsame Branche (normalisiert)
    context = None
    ia, ib = a.ind(level), b.ind(level)
    if ia and ib:
        shared = ia & ib
        context = 1.0 if shared else 0.0
        if shared:
            reasons.append("gleiche Branche")

    # Ergaenzung in die andere Richtung (ab M3)
    complement = None
    if own_aware:
        rr = None
        if b.seek:
            rr = 1.0 if set(b.seek) & set(a.own) else 0.0
        redundancy = 0.0 if set(a.own) & set(b.own) else 1.0
        cr = None
        hob = b.handovers() if view == "full" else set()
        if hob and a.caps:
            cr = sum(a.coverage(x, "full", family_credit) for x in hob) / len(hob)
        complement = mean_or_none([rr, redundancy, cr])
        if rr:
            reasons.append("sucht umgekehrt, was A mitbringt")

    # Absicht und Vorhaben (ab M3)
    intent = None
    if own_aware:
        parts = []
        if a.intent and b.intent:
            parts.append({0: 1.0, 1: 0.6, 2: 0.1}[abs(INTENTS.index(a.intent) - INTENTS.index(b.intent))])
        if a.horizon and b.horizon:
            parts.append({0: 1.0, 1: 1.0, 2: 0.6, 3: 0.2}[abs(HORIZONS.index(a.horizon) - HORIZONS.index(b.horizon))])
        if a.goal and b.goal and a.goal != "undecided" and b.goal != "undecided":
            parts.append({0: 1.0, 1: 0.6, 2: 0.1}[abs(GOAL_GROUP[a.goal] - GOAL_GROUP[b.goal])])
        if a.stage and b.stage and "undecided" not in (a.stage, b.stage):
            has_idea = {"idea_validating", "already_building"}
            if a.stage == b.stage == "already_building" or a.stage == b.stage == "no_idea_open_to_join":
                parts.append(0.5)
            elif (a.stage in has_idea) != (b.stage in has_idea):
                parts.append(1.0)
            else:
                parts.append(0.8)
        intent = mean_or_none(parts)
    return dict(need=need, context=context, complement=complement, intent=intent,
                role_cover=role_cover, cap_cover=cap_cover, crit_cover=crit_cover), reasons


def soft_constraint_factor(a, b, level):
    """M5: Bedingungen der suchenden Person als Abschlaege. Fehlende Werte sind nie ein Konflikt."""
    f, why = 1.0, []
    m = a.must
    if m.get("requiredRolesAny") and b.own and not set(m["requiredRolesAny"]) & set(b.own):
        f *= 0.4; why.append("Pflichtrolle fehlt")
    if m.get("minimumAvailabilityHoursPerWeek") and b.hours is not None and b.hours < m["minimumAvailabilityHoursPerWeek"]:
        f *= 0.3; why.append("zu wenig Stunden")
    if m.get("acceptedRemoteModes") and b.remote and b.remote != "flexible" and b.remote not in m["acceptedRemoteModes"]:
        f *= 0.4; why.append("Remote-Modus passt nicht")
    if m.get("desiredLocationRegion"):
        same = N.same_place(N.location(m["desiredLocationRegion"], level), b.loc(level))
        if same is False:
            f *= 0.4; why.append("anderer Ort")
    if m.get("acceptedSearchIntents") and b.intent and b.intent not in m["acceptedSearchIntents"]:
        f *= 0.4; why.append("Suchstand passt nicht")
    if m.get("acceptedStartHorizons") and b.horizon and b.horizon not in m["acceptedStartHorizons"]:
        f *= 0.5; why.append("Start passt nicht")
    if m.get("requiredCapabilityAreasAny") and b.caps and not set(m["requiredCapabilityAreasAny"]) & b.areas("full"):
        f *= 0.5; why.append("Pflichtbereich fehlt")
    if m.get("requiredExpertiseAny") and b.expertise_raw:
        if not N.terms(m["requiredExpertiseAny"], "topic", level) & b.exp(level):
            f *= 0.6; why.append("Pflicht-Expertise fehlt")
    # Ohne Must-have, aber beidseitig unvereinbar
    if a.remote == "onsite" and b.remote == "onsite" and N.same_place(a.loc(level), b.loc(level)) is False:
        f *= 0.3; why.append("beide nur vor Ort, verschiedene Orte")
    if a.commitment and b.commitment and abs(COMMITMENT.index(a.commitment) - COMMITMENT.index(b.commitment)) >= 2 \
            and "would_expand" not in (a.flex, b.flex):
        f *= 0.7; why.append("Commitment weit auseinander")
    return f, why


def gate(a, b, level, view):
    """M7/M8: harte Bedingungen beider Seiten. Kein Bonus fuer Erfuellung – nur Zulassung."""
    why = []
    for x, y, tag in ((a, b, "A"), (b, a, "B")):
        m = x.must
        if m.get("requiredRolesAny") and y.own and not set(m["requiredRolesAny"]) & set(y.own):
            why.append(f"{tag}: Pflichtrolle fehlt")
        if m.get("minimumAvailabilityHoursPerWeek") and y.hours is not None and y.hours < m["minimumAvailabilityHoursPerWeek"]:
            why.append(f"{tag}: zu wenig Stunden")
        if m.get("acceptedRemoteModes") and y.remote and y.remote != "flexible" and y.remote not in m["acceptedRemoteModes"]:
            why.append(f"{tag}: Remote-Modus passt nicht")
        if m.get("desiredLocationRegion") and N.same_place(N.location(m["desiredLocationRegion"], level), y.loc(level)) is False:
            why.append(f"{tag}: anderer Ort")
        if m.get("acceptedSearchIntents") and y.intent and y.intent not in m["acceptedSearchIntents"]:
            why.append(f"{tag}: Suchstand passt nicht")
        if m.get("acceptedStartHorizons") and y.horizon and y.horizon not in m["acceptedStartHorizons"]:
            why.append(f"{tag}: Start passt nicht")
        if m.get("requiredCapabilityAreasAny") and y.cap_view(view) and not set(m["requiredCapabilityAreasAny"]) & y.areas(view):
            why.append(f"{tag}: Pflichtbereich fehlt")
        if m.get("requiredExpertiseAny") and y.expertise_raw and \
                not N.terms(m["requiredExpertiseAny"], "topic", level) & y.exp(level):
            why.append(f"{tag}: Pflicht-Expertise fehlt")
    if a.remote == "onsite" and b.remote == "onsite" and N.same_place(a.loc(level), b.loc(level)) is False:
        why.append("beide nur vor Ort, verschiedene Orte")
    return (not why), why


def confidence(p, view):
    fields = [bool(p.own), bool(p.seek), bool(p.cap_view(view)), bool(p.industries_raw), bool(p.expertise_raw),
              p.intent is not None, p.horizon is not None, p.location_raw is not None, p.remote is not None]
    return sum(fields) / len(fields)


# ---------------------------------------------------------------------------
# FIND-Modelle
# ---------------------------------------------------------------------------
FIND_MODELS = {
    # name: Konfiguration
    "M0": dict(kind="product", level="exact"),
    "M1": dict(kind="normalized_exact", level="synonym"),
    "M1g": dict(kind="normalized_exact", level="generic"),
    "M2": dict(kind="directed", level="synonym", own_aware=False, family=False, criteria=True, groups=("need", "context")),
    "M3": dict(kind="directed", level="synonym", own_aware=True, family=False, criteria=True),
    "M4": dict(kind="directed", level="synonym", own_aware=True, family=True, criteria=True),
    "M5": dict(kind="directed", level="synonym", own_aware=True, family=True, criteria=True, soft_constraints=True),
    "M6a": dict(kind="mutual", base="M5", combine="arith"),
    "M6b": dict(kind="mutual", base="M5", combine="harmonic"),
    "M6c": dict(kind="mutual", base="M5", combine="minbias"),
    "M7": dict(kind="two_stage", level="synonym", combine="minbias", missing_as_zero=True),
    "M8": dict(kind="two_stage", level="synonym", combine="minbias", missing_as_zero=False, with_confidence=True),
    # Sensitivitaet (keine Optimierung, je genau eine Abweichung von M8)
    "M8_equal_weights": dict(kind="two_stage", level="synonym", combine="minbias", missing_as_zero=False, with_confidence=True,
                             weights="equal"),
    "M8_generic_norm": dict(kind="two_stage", level="generic", combine="minbias", missing_as_zero=False, with_confidence=True),
    "M8_disclosed": dict(kind="two_stage", level="synonym", combine="minbias", missing_as_zero=False, with_confidence=True,
                         view="disclosed"),
}
# Nachtraeglich (nach Sicht auf die Ergebnisse) entworfene Strukturvariante – im Bericht so markiert:
# Gegenseitigkeit nur ueber den reinen Bedarf; Branche und Absicht als symmetrische Paarfaktoren.
FIND_MODELS["M8s"] = dict(kind="two_stage_split", level="synonym", combine="minbias", with_confidence=True)
# Ablationen auf M8: genau eine Gruppe entfernt
for _g in ("need", "context", "complement", "intent"):
    FIND_MODELS[f"M8_without_{_g}"] = dict(kind="two_stage", level="synonym", combine="minbias", missing_as_zero=False,
                                            with_confidence=True, drop=_g)


def combine(x, y, how):
    if how == "arith":
        return (x + y) / 2
    if how == "harmonic":
        return 0.0 if x + y == 0 else 2 * x * y / (x + y)
    return 0.6 * min(x, y) + 0.4 * (x + y) / 2


def find_directed_score(a, b, cfg, view):
    comps, reasons = find_components(a, b, level=cfg["level"], view=view, own_aware=cfg.get("own_aware", True),
                                     family_credit=cfg.get("family", True), with_criteria=cfg.get("criteria", True))
    groups = cfg.get("groups", ("need", "context", "complement", "intent"))
    w = FIND_WEIGHTS_EQUAL if cfg.get("weights") == "equal" else FIND_WEIGHTS
    weights = {k: w[k] for k in groups if k != cfg.get("drop")}
    s = wmean({k: comps[k] for k in weights}, weights, cfg.get("missing_as_zero", True))
    if cfg.get("soft_constraints"):
        f, why = soft_constraint_factor(a, b, cfg["level"])
        s *= f
        reasons += [f"Abschlag: {x}" for x in why]
    return s, comps, reasons


def score_find(ds, model, a, b):
    """Liefert dict(score, eligible, reasons, confidence, directed=(a->b, b->a))."""
    cfg = FIND_MODELS[model]
    view = cfg.get("view", "full")
    if cfg["kind"] == "product":
        ok, why = product_filter(a, b, cfg["level"])
        # Relevanz heute: keine. Reihenfolge = Veroeffentlichung (hier: feste Zufallsordnung).
        rk = int(recency_key(b.id)[:8], 16) / 0xFFFFFFFF
        return dict(score=rk, eligible=ok, reasons=why or ["passt durch die Filter"], confidence=None, directed=None)
    if cfg["kind"] == "normalized_exact":
        ok, why = product_filter(a, b, cfg["level"])
        shared = len(a.ind(cfg["level"]) & b.ind(cfg["level"])) + len(a.exp(cfg["level"]) & b.exp(cfg["level"]))
        roles = len(set(a.seek) & set(b.own))
        rk = int(recency_key(b.id)[:8], 16) / 0xFFFFFFFF
        score = shared + roles + rk * 0.001
        return dict(score=score, eligible=ok, reasons=(why or [f"{shared} gleiche Begriffe, {roles} gesuchte Rollen"]),
                    confidence=None, directed=None)
    if cfg["kind"] == "directed":
        s, comps, reasons = find_directed_score(a, b, cfg, view)
        return dict(score=s, eligible=True, reasons=reasons, confidence=None, directed=(s, None), comps=comps)
    if cfg["kind"] == "mutual":
        base = dict(FIND_MODELS[cfg["base"]])
        s1, c1, r1 = find_directed_score(a, b, base, view)
        s2, c2, r2 = find_directed_score(b, a, base, view)
        return dict(score=combine(s1, s2, cfg["combine"]), eligible=True, reasons=r1 + [f"(umgekehrt) {x}" for x in r2],
                    confidence=None, directed=(s1, s2), comps=c1)
    if cfg["kind"] == "two_stage_split":
        level = cfg["level"]
        ok, why = gate(a, b, level, view)
        rel_cfg = dict(level=level, own_aware=True, family=True, criteria=False, missing_as_zero=False)
        c1, r1 = find_components(a, b, level=level, view=view, own_aware=True, family_credit=True, with_criteria=False)
        c2, r2 = find_components(b, a, level=level, view=view, own_aware=True, family_credit=True, with_criteria=False)
        n1, n2 = c1["need"], c2["need"]
        mutual_need = None if (n1 is None and n2 is None) else combine(n1 or 0.0, n2 or 0.0, cfg["combine"])
        s = wmean({"need": mutual_need, "context": c1["context"], "intent": c1["intent"]},
                  {"need": 2.0, "context": 1.0, "intent": 1.0}, False)
        conf = min(confidence(a, view), confidence(b, view))
        return dict(score=s, eligible=ok, reasons=(why if not ok else r1 + [f"(umgekehrt) {x}" for x in r2]),
                    confidence=conf, directed=(n1, n2), comps=c1)
    # two_stage
    level = cfg["level"]
    ok, why = gate(a, b, level, view)
    rel_cfg = dict(level=level, own_aware=True, family=True, criteria=False,
                   missing_as_zero=cfg["missing_as_zero"], weights=cfg.get("weights"), drop=cfg.get("drop"))
    s1, c1, r1 = find_directed_score(a, b, rel_cfg, view)
    s2, c2, r2 = find_directed_score(b, a, rel_cfg, view)
    conf = min(confidence(a, view), confidence(b, view)) if cfg.get("with_confidence") else None
    return dict(score=combine(s1, s2, cfg["combine"]), eligible=ok,
                reasons=(why if not ok else r1 + [f"(umgekehrt) {x}" for x in r2]),
                confidence=conf, directed=(s1, s2), comps=c1)


# ---------------------------------------------------------------------------
# CONNECT: Suche (Listing von A) -> Angebot (Listing von B), gerichtet
# ---------------------------------------------------------------------------
CONNECT_MODELS = {
    "M0": dict(kind="product", level="exact"),
    "M1": dict(kind="product", level="synonym"),
    "M1g": dict(kind="product", level="generic"),
    "M2": dict(kind="relevance", level="synonym", groups=("topic", "category", "industry")),
    "M3": dict(kind="relevance", level="synonym", groups=("topic", "category", "industry", "profile", "stage")),
    "M5": dict(kind="relevance", level="synonym", groups=("topic", "category", "industry", "profile", "stage"),
               soft_constraints=True),
    "M7": dict(kind="two_stage", level="synonym", groups=("topic", "category", "industry", "profile", "stage"),
               missing_as_zero=True),
    "M8": dict(kind="two_stage", level="synonym", groups=("topic", "category", "industry", "profile", "stage"),
               missing_as_zero=False, with_confidence=True),
    "M8_generic_norm": dict(kind="two_stage", level="generic", groups=("topic", "category", "industry", "profile", "stage"),
                            missing_as_zero=False, with_confidence=True),
}
# Nachtraeglich (nach Sicht auf die Ergebnisse) – im Bericht so markiert: M2-Relevanz hinter dem M7-Gate.
CONNECT_MODELS["M7core"] = dict(kind="two_stage", level="synonym", groups=("topic", "category", "industry"),
                                missing_as_zero=False, with_confidence=True)
for _g in ("topic", "category", "industry", "profile", "stage"):
    CONNECT_MODELS[f"M8_without_{_g}"] = dict(kind="two_stage", level="synonym",
                                               groups=tuple(x for x in ("topic", "category", "industry", "profile", "stage") if x != _g),
                                               missing_as_zero=False, with_confidence=True)
# M4 (Taxonomie) gibt es fuer CONNECT nicht: Themen haben im Produkt keine Taxonomie.
# M6 (Gegenseitigkeit) ist fuer CONNECT ausdruecklich nicht gewollt.


def connect_terms(person, level):
    """connect_match_terms: eigene Expertise/Branchen + eigene Suchen + eigene Probleme, >= 3 Zeichen."""
    t = set()
    t |= N.terms(person.expertise_raw, "topic", level, 3) | N.terms(person.industries_raw, "industry", level, 3)
    for l in person.raw["connect_listings"]:
        if l["direction"] == "seeking" and l["status"] == "active" and l["expires_at"] >= NOW:
            t |= N.terms(l["topics"], "topic", level, 3) | N.terms(l["industries"], "industry", level, 3)
    for pr in person.raw["connect_problems"]:
        if pr["status"] == "active":
            t |= N.terms(pr["topics"], "topic", level, 3) | N.terms(pr["industries"], "industry", level, 3)
    return t


def connect_gate(sl, ol, level):
    why = []
    if not ol.eligible():
        why.append(f"Angebot nicht verfügbar ({ol.status}, bis {ol.expires_at})")
    for x, y in ((sl, ol), (ol, sl)):
        if x.scope == "regional" and x.remote == "onsite":
            lx, ly = x.locs(level) - {N.WILDCARD}, y.locs(level) - {N.WILDCARD}
            if lx and ly and not lx & ly:
                why.append("regional vor Ort, anderer Ort")
    return (not why), why


def score_connect(ds, model, sl, ol):
    cfg = CONNECT_MODELS[model]
    level = cfg["level"]
    if cfg["kind"] == "product":
        terms = connect_terms(sl.owner, level)
        hit = (N.terms(ol.topics_raw, "topic", level, 3) | N.terms(ol.industries_raw, "industry", level, 3)) & terms
        ok = bool(hit) and ol.eligible()
        why = [f"Treffer: {', '.join(sorted(hit))}"] if hit else ["kein gemeinsamer Begriff"]
        if not ol.eligible():
            why.append("Angebot nicht aktiv")
        return dict(score=ol.published_at, eligible=ok, reasons=why, confidence=None)
    parts, reasons = {}, []
    ts, to = sl.top(level), ol.top(level)
    parts["topic"] = (len(ts & to) / len(ts)) if ts and to else None
    if parts["topic"]:
        reasons.append(f"gleiches Thema: {', '.join(sorted(ts & to))}")
    parts["category"] = 1.0 if sl.category == ol.category else 0.0
    if parts["category"]:
        reasons.append(f"gleiche Kategorie ({sl.category})")
    is_, io = sl.ind(level), ol.ind(level)
    parts["industry"] = (1.0 if is_ & io else 0.0) if is_ and io else None
    if parts["industry"]:
        reasons.append("gleiche Branche")
    pe = ol.owner.exp(level)
    parts["profile"] = (1.0 if ts & pe else 0.0) if ts and pe else None
    if parts["profile"]:
        reasons.append("Profil-Expertise stützt das Angebot")
    if sl.stage and ol.stage:
        parts["stage"] = max(0.0, 1 - abs(LISTING_STAGE.index(sl.stage) - LISTING_STAGE.index(ol.stage)) / 3)
    else:
        parts["stage"] = None
    weights = {k: CONNECT_WEIGHTS[k] for k in cfg["groups"]}
    s = wmean({k: parts[k] for k in weights}, weights, cfg.get("missing_as_zero", True))
    eligible, conf = True, None
    if cfg.get("soft_constraints"):
        ok, why = connect_gate(sl, ol, level)
        if not ok:
            s *= 0.3 if ol.eligible() else 0.0
            reasons += [f"Abschlag: {x}" for x in why]
    if cfg["kind"] == "two_stage":
        eligible, why = connect_gate(sl, ol, level)
        if not eligible:
            reasons = why
        if cfg.get("with_confidence"):
            filled = [bool(ts), bool(is_), bool(sl.locs(level)), sl.scope is not None]
            conf = sum(filled) / len(filled)
    return dict(score=s, eligible=eligible, reasons=reasons, confidence=conf)
