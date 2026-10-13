"""Experiment v03b – Capability-Family-Ablation. Vor jeder Auswertung festgelegt.

F3_BASELINE   = matching_models_v03.score_find(..., "F3_PH1_min60_DICT")  – unveraendert importiert
F3_NO_FAMILY  = identisch, nur: Teil-Gutschrift fuer Bereiche derselben Capability-Familie = 0
                (v01-find_components mit family_credit=False). Sonst nichts: gleiches Gate v03,
                gleiche Rollen-Abdeckung, gleicher Modulator (Branche, Absicht), gleiche Gegenseitigkeit 0,6/0,4.

Annahme fuer Synthetic/Development: alle synthetischen Personen haben der Matching-Nutzung von
Capability-Bereich, Erfahrung und Verantwortungswunsch zugestimmt (volle Sicht wie in v03).
Kein Dateizugriff, keine Testannotationen, kein Workstyle.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(HERE, "..", "v03")))
import matching_models_v03 as MM  # noqa: E402  (eingefroren, Hash in preregistration_v03.json)

V1, M2, N3 = MM.V1, MM.M2, MM.N3
MODELS = ["F3_BASELINE", "F3_NO_FAMILY"]
NORM = "N-DICTIONARY"


def _directional_no_family(ctx, a, b):
    comps, reasons = V1.find_components(a, b, level="synonym", view="full", own_aware=True, family_credit=False, with_criteria=False)
    context = M2.context_v2(a, b, N3.mode(NORM))
    need = comps["need"] or 0.0
    return need * (0.5 + 0.5 * MM._modulator(comps, context)), need, reasons


def score_find(ctx, name, a, b):
    if name == "F3_BASELINE":
        return MM.score_find(ctx, "F3_PH1_min60_DICT", a, b)
    if name != "F3_NO_FAMILY":
        raise ValueError(name)
    state, why = MM.gate_find_v03(a, b, NORM)
    s1, n1, r1 = _directional_no_family(ctx, a, b)
    s2, n2, _ = _directional_no_family(ctx, b, a)
    wmin, wmean = MM.MUTUAL["min60"]
    score = wmin * min(s1, s2) + wmean * (s1 + s2) / 2
    conf = min(V1.confidence(a, "full"), V1.confidence(b, "full"))
    return dict(score=score, eligible=state != "not_eligible", gate_state=state, directed=(s1, s2),
                confidence=conf, reasons=why if state == "not_eligible" else r1, needs=(n1, n2))
