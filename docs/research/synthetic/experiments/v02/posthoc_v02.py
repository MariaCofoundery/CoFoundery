"""POST-HOC – entstanden NACH Sicht auf die Ergebnisse des ersten Volllaufs.

Nicht Teil der Vorab-Festlegung, nicht als bestaetigter Befund zu lesen. Gedacht als
Hypothese fuer Experiment 3.

PH1_need_multiplicative
    Beobachtung: Keine Mittelungsform (A1–A6) senkt asymmetrische Paare auf der Seite ohne
    Bedarf. Vermutete Ursache: Kontext, Absicht und Gegenrichtung tragen 60 % des gerichteten
    Scores und sind symmetrisch – sie halten auch die Richtung ohne Bedarf hoch.
    Struktur: gegenseitiger Bedarf (0,6·min + 0,4·mittel) als FAKTOR; Branche und Absicht
    modulieren nur:  score = need_mutual × (0,5 + 0,5 · mittel(bekannte von context, intent)).
    Gate wie M7. Keine neuen Gewichte ausser dieser einen Form.
"""
import matching_models_v01 as V1
import matching_models_v02 as M2


def score_ph1(ctx, a, b):
    ok, why = V1.gate(a, b, "synonym", "full")
    c1, r1 = M2.comps_v01(ctx, a, b, "synonym")
    c2, _ = M2.comps_v01(ctx, b, a, "synonym")
    nm = V1.combine(c1["need"] or 0.0, c2["need"] or 0.0, "minbias")
    mod = V1.mean_or_none([c1["context"], c1["intent"]])
    score = nm * (0.5 + 0.5 * (mod if mod is not None else 0.5))
    return dict(score=score, eligible=ok, reasons=why if not ok else r1, confidence=None, tier=0,
                directed=(c1["need"], c2["need"]))
