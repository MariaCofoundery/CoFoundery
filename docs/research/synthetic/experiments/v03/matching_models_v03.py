"""Matching-Modelle Experiment 3 (v0.3) – VOR jeder Silver-Auswertung festgelegt.

Eingabe: nur Produktstruktur (Person/Listing aus v01). Kein Dateizugriff, keine Testannotationen,
keine Silver Labels, kein Workstyle.

FIND
  F0  M7 (aus v02 importiert, unveraendert)
  F1  PH1 exakt (posthoc_v02.score_ph1, unveraendert: M7-Gate, v01-Woerterbuch)
  F2  PH1-Richtungsrelevanz + 0,75·min + 0,25·mittel, Gate v03, Normalisierung N-DICTIONARY bzw. N-GENERIC
  F3  PH1-Richtungsrelevanz + 0,60·min + 0,40·mittel, Gate v03, Normalisierung N-DICTIONARY bzw. N-GENERIC

  PH1-Richtungsrelevanz:  rel(X->Y) = need(X->Y) × (0,5 + 0,5 · mod)
      need  = v01-Bedarf: Mittel aus Rollen-Abdeckung und bester Abdeckung je abzugebendem Bereich
              (best match per need; nur "own" mit Stufe >= 3 zaehlt voll; grow_into deckt nichts ab)
      mod   = Mittel der bekannten Werte von context (gleiche Branche) und intent (v01);
              beide unbekannt -> 0,5 (PH1 unveraendert)
  Hinweis (vorab): mod ist symmetrisch und 0,6·min+0,4·mittel linear homogen -> F3 ist rechnerisch PH1;
  F3 unterscheidet sich von F1 nur durch Gate v03 und Normalisierung (Kontrollfall fuer den Gate-Effekt).

CONNECT (gerichtet, ohne Gegenseitigkeit)
  C0  M7core (aus v01, unveraendert)
  C1  Topic-required:  0,55 topic + 0,20 text + 0,15 industry + 0,10 category, Gate v03
  C2  Coverage-based:  0,75 coverage + 0,15 industry + 0,10 category, Gate v03
  je mit N-DICTIONARY und N-GENERIC
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "v02")))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..")))
sys.path.insert(0, HERE)
import matching_models_v01 as V1  # noqa: E402
import matching_models_v02 as M2  # noqa: E402
import posthoc_v02 as PH  # noqa: E402
import normalization_v03 as N3  # noqa: E402

# ---------------------------------------------------------------------------
# Vorab festgelegte Konstanten
# ---------------------------------------------------------------------------
PH1_MOD_UNKNOWN = 0.5
MUTUAL = {"min75": (0.75, 0.25), "min60": (0.60, 0.40)}

C1_WEIGHTS = {"topic": 0.55, "text": 0.20, "industry": 0.15, "category": 0.10}
C1_EXPERTISE_ONLY = 0.7          # Suchthema nur in der Profil-Expertise des Anbietenden gefunden
C1_NO_TOPIC_CAP = 0.10           # kein Themenbezug (topic == 0 und text < C1_TEXT_MIN) -> hoechstens 0,10
C1_TEXT_MIN = 0.10

C2_WEIGHTS = {"coverage": 0.75, "industry": 0.15, "category": 0.10}
C2_ASPECT = {"topic": 1.0, "text_all_tokens": 0.8, "expertise": 0.7, "text_partial_factor": 0.6}
C2_NO_COVERAGE_CAP = 0.10
C2_COVERAGE_MIN = 0.10
C2_FALLBACK_NEEDS = 3            # Gesuch ohne Themen: die 3 seltensten Text-Token als Bedarfe

FIND_MODELS = {
    "F0_M7": dict(kind="m7"),
    "F1_PH1_exact": dict(kind="ph1_exact"),
    "F2_PH1_min75_DICT": dict(kind="ph1", mutual="min75", norm="N-DICTIONARY"),
    "F2_PH1_min75_GENERIC": dict(kind="ph1", mutual="min75", norm="N-GENERIC"),
    "F3_PH1_min60_DICT": dict(kind="ph1", mutual="min60", norm="N-DICTIONARY"),
    "F3_PH1_min60_GENERIC": dict(kind="ph1", mutual="min60", norm="N-GENERIC"),
}
CONNECT_MODELS = {
    "C0_M7core": dict(kind="m7core"),
    "C1_topic_required_DICT": dict(kind="c1", norm="N-DICTIONARY"),
    "C1_topic_required_GENERIC": dict(kind="c1", norm="N-GENERIC"),
    "C2_coverage_DICT": dict(kind="c2", norm="N-DICTIONARY"),
    "C2_coverage_GENERIC": dict(kind="c2", norm="N-GENERIC"),
}


# ---------------------------------------------------------------------------
# FIND – Gate v03 (getrennt vom Score; eligible / not_eligible / uncertain)
# ---------------------------------------------------------------------------
def _remote_compatible(x):
    return x.remote in ("remote", "flexible") or "remote" in (x.must.get("acceptedRemoteModes") or [])


def gate_find_v03(a, b, norm):
    conflicts, unknown = [], []
    for x, y, tag in ((a, b, "A"), (b, a, "B")):
        m = x.must
        if m.get("requiredRolesAny"):
            if not y.own:
                unknown.append(f"{tag}: Rollen des Gegenübers unbekannt")
            elif not set(m["requiredRolesAny"]) & set(y.own):
                conflicts.append(f"{tag}: Pflichtrolle fehlt")
        if m.get("minimumAvailabilityHoursPerWeek"):
            if y.hours is None:
                unknown.append(f"{tag}: Stunden unbekannt")
            elif y.hours < m["minimumAvailabilityHoursPerWeek"]:
                conflicts.append(f"{tag}: zu wenig Stunden")
        if m.get("acceptedRemoteModes"):
            if y.remote is None:
                unknown.append(f"{tag}: Arbeitsweise unbekannt")
            elif y.remote != "flexible" and y.remote not in m["acceptedRemoteModes"]:
                conflicts.append(f"{tag}: Remote-Modus passt nicht")
        if m.get("desiredLocationRegion"):
            want = N3.place(m["desiredLocationRegion"], norm)
            if want is not None and not want.wild:          # nur ein KONKRETER Ort ist eine Bedingung
                have = N3.place(y.location_raw, norm)
                if have is None:
                    unknown.append(f"{tag}: Ort des Gegenübers unbekannt")
                elif N3.same_place(want, have) is False and not _remote_compatible(x):
                    conflicts.append(f"{tag}: verlangter Ort nicht erfüllt")
        if m.get("acceptedSearchIntents"):
            if y.intent is None:
                unknown.append(f"{tag}: Suchstand unbekannt")
            elif y.intent not in m["acceptedSearchIntents"]:
                conflicts.append(f"{tag}: Suchstand ausdrücklich ausgeschlossen")
        if m.get("acceptedStartHorizons"):
            if y.horizon is None:
                unknown.append(f"{tag}: Start unbekannt")
            elif y.horizon not in m["acceptedStartHorizons"]:
                conflicts.append(f"{tag}: Start ausdrücklich ausgeschlossen")
        if m.get("requiredCapabilityAreasAny"):
            if not y.caps:
                unknown.append(f"{tag}: Bereiche unbekannt")
            elif not set(m["requiredCapabilityAreasAny"]) & y.areas("full"):
                conflicts.append(f"{tag}: Pflichtbereich fehlt")
        if m.get("requiredExpertiseAny"):
            if not y.expertise_raw:
                unknown.append(f"{tag}: Expertise unbekannt")
            else:
                want, have = N3.terms(m["requiredExpertiseAny"], "topic", norm), N3.terms(y.expertise_raw, "topic", norm)
                if not any(N3.same(w, h) for w in want for h in have):
                    conflicts.append(f"{tag}: Pflicht-Expertise fehlt")
    if a.remote == "onsite" and b.remote == "onsite":
        pa, pb = N3.place(a.location_raw, norm), N3.place(b.location_raw, norm)
        if pa is None or pb is None:
            unknown.append("Ort einer Seite unbekannt (beide onsite)")
        elif N3.same_place(pa, pb) is False:
            conflicts.append("beide nur vor Ort, verschiedene Orte")
    state = "not_eligible" if conflicts else ("uncertain" if unknown else "eligible")
    return state, conflicts or unknown


def _modulator(comps_ab, context):
    mod = V1.mean_or_none([context, comps_ab["intent"]])
    return mod if mod is not None else PH1_MOD_UNKNOWN


def directional_ph1(ctx, a, b, norm):
    comps, reasons = M2.comps_v01(ctx, a, b, "synonym")
    context = M2.context_v2(a, b, N3.mode(norm))
    need = comps["need"] or 0.0
    return need * (0.5 + 0.5 * _modulator(comps, context)), need, context, comps, reasons


def score_find(ctx, name, a, b):
    cfg = FIND_MODELS[name]
    conf = min(V1.confidence(a, "full"), V1.confidence(b, "full"))
    if cfg["kind"] == "m7":
        r = M2.score_find(ctx, "M7", a, b)
        return dict(score=r["score"], eligible=r["eligible"], gate_state="eligible" if r["eligible"] else "not_eligible",
                    directed=r["directed"], confidence=conf, reasons=r["reasons"])
    if cfg["kind"] == "ph1_exact":
        r = PH.score_ph1(ctx, a, b)
        c1, _ = M2.comps_v01(ctx, a, b, "synonym")
        mod = _modulator(c1, c1["context"])
        n1, n2 = r["directed"]
        d = ((n1 or 0.0) * (0.5 + 0.5 * mod), (n2 or 0.0) * (0.5 + 0.5 * mod))
        return dict(score=r["score"], eligible=r["eligible"], gate_state="eligible" if r["eligible"] else "not_eligible",
                    directed=d, confidence=conf, reasons=r["reasons"])
    state, why = gate_find_v03(a, b, cfg["norm"])
    s1, n1, _, _, r1 = directional_ph1(ctx, a, b, cfg["norm"])
    s2, n2, _, _, _ = directional_ph1(ctx, b, a, cfg["norm"])
    wmin, wmean = MUTUAL[cfg["mutual"]]
    score = wmin * min(s1, s2) + wmean * (s1 + s2) / 2
    return dict(score=score, eligible=state != "not_eligible", gate_state=state, directed=(s1, s2),
                confidence=conf, reasons=why if state == "not_eligible" else r1, needs=(n1, n2))


# ---------------------------------------------------------------------------
# CONNECT
# ---------------------------------------------------------------------------
class ConnectContext:
    def __init__(self, dataset):
        self.ds = dataset
        self.text = N3.TextIndex(list(dataset.listings.values()))


def gate_connect_v03(sl, ol, norm):
    if not ol.eligible():
        return "not_eligible", [f"Angebot nicht verfügbar ({ol.status}, bis {ol.expires_at})"]
    unknown = []
    for x, y in ((sl, ol), (ol, sl)):
        if x.scope == "regional" and x.remote == "onsite":
            px = [p for p in (N3.place(v, norm) for v in x.locations_raw) if p is not None and not p.wild]
            if not px:
                continue
            py = [p for p in (N3.place(v, norm) for v in y.locations_raw) if p is not None]
            if not py:
                unknown.append("Ort des Gegenübers unbekannt")
            elif not any(N3.same_place(p, q) for p in px for q in py):
                return "not_eligible", ["regional vor Ort, Ort nicht erfüllt"]
    return ("uncertain" if unknown else "eligible"), unknown


def _industry(sl, ol, norm):
    is_, io = N3.terms(sl.industries_raw, "industry", norm), N3.terms(ol.industries_raw, "industry", norm)
    if not is_ or not io:
        return 0.0                               # keine Evidenz -> kein Beitrag (nicht herausgerechnet)
    return 1.0 if any(N3.same(x, y) for x in is_ for y in io) else 0.0


def _connect_conf(sl, ol):
    f = lambda l: sum([bool(l.topics_raw), bool(l.industries_raw), bool(l.locations_raw), l.scope is not None]) / 4
    return min(f(sl), f(ol))


def score_c1(cctx, sl, ol, norm):
    ts = N3.terms(sl.topics_raw, "topic", norm)
    to = N3.terms(ol.topics_raw, "topic", norm)
    te = N3.terms(ol.owner.expertise_raw, "topic", norm)
    per = []
    for t in ts:
        if any(N3.same(t, o) for o in to):
            per.append(1.0)
        elif any(N3.same(t, e) for e in te):
            per.append(C1_EXPERTISE_ONLY)
        else:
            per.append(0.0)
    topic = sum(per) / len(per) if per else 0.0
    need_tok = N3.text_tokens(sl.raw["title"], sl.raw["summary"], sl.topics_raw)
    have_tok = N3.text_tokens(ol.raw["title"], ol.raw["summary"], ol.topics_raw)
    text = cctx.text.overlap(need_tok, have_tok) or 0.0
    industry = _industry(sl, ol, norm)
    category = 1.0 if sl.category == ol.category else 0.0
    parts = dict(topic=topic, text=text, industry=industry, category=category)
    s = sum(C1_WEIGHTS[k] * v for k, v in parts.items())
    if topic == 0 and text < C1_TEXT_MIN:
        s = min(s, C1_NO_TOPIC_CAP)
    return s, parts


def score_c2(cctx, sl, ol, norm):
    idx = cctx.text
    needs = [(N3.terms([raw], "topic", norm)[0], set(N3.text_tokens(raw))) for raw in sl.topics_raw if raw and raw.strip()]
    if not needs:
        toks = sorted(N3.text_tokens(sl.raw["title"], sl.raw["summary"]), key=lambda x: (-idx.idf(x), x))[:C2_FALLBACK_NEEDS]
        needs = [(None, {t}) for t in toks]
    to = N3.terms(ol.topics_raw, "topic", norm)
    te = N3.terms(ol.owner.expertise_raw, "topic", norm)
    have_tok = N3.text_tokens(ol.raw["title"], ol.raw["summary"], ol.topics_raw)
    num = den = 0.0
    for term, toks in needs:
        best = 0.0
        if term is not None and any(N3.same(term, o) for o in to):
            best = C2_ASPECT["topic"]
        if toks and all(any(N3.token_match(t, h) for h in have_tok) for t in toks):
            best = max(best, C2_ASPECT["text_all_tokens"])
        if term is not None and any(N3.same(term, e) for e in te):
            best = max(best, C2_ASPECT["expertise"])
        if best == 0.0 and toks:
            best = C2_ASPECT["text_partial_factor"] * (idx.overlap(toks, have_tok) or 0.0)
        w = (sum(idx.idf(t) for t in toks) / len(toks)) if toks else 1.0     # Spezifitaet: seltene Bedarfe zaehlen mehr
        w = max(w, 0.05)
        num += w * best
        den += w
    coverage = num / den if den else 0.0
    industry = _industry(sl, ol, norm)
    category = 1.0 if sl.category == ol.category else 0.0
    parts = dict(coverage=coverage, industry=industry, category=category)
    s = sum(C2_WEIGHTS[k] * v for k, v in parts.items())
    if coverage < C2_COVERAGE_MIN:
        s = min(s, C2_NO_COVERAGE_CAP)
    return s, parts


def score_connect(cctx, name, sl, ol):
    cfg = CONNECT_MODELS[name]
    if cfg["kind"] == "m7core":
        r = V1.score_connect(None, "M7core", sl, ol)
        return dict(score=r["score"], eligible=r["eligible"], gate_state="eligible" if r["eligible"] else "not_eligible",
                    confidence=_connect_conf(sl, ol), reasons=r["reasons"])
    state, why = gate_connect_v03(sl, ol, cfg["norm"])
    s, parts = (score_c1 if cfg["kind"] == "c1" else score_c2)(cctx, sl, ol, cfg["norm"])
    return dict(score=s, eligible=state != "not_eligible", gate_state=state, confidence=_connect_conf(sl, ol),
                reasons=why, parts=parts)
