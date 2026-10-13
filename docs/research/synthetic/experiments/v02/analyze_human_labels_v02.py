"""Inter-Rater-Analyse der menschlichen Labels (v02). Erzeugt selbst KEINE Labels.

    python3 analyze_human_labels_v02.py LABELS.csv [LABELS2.csv ...] [--include-holdout]
                                        [--out bericht.json] [--adjudication strittig.csv]

Eingabe: ausgefuellte Kopien von human_label_template_v02.csv (eine Datei je Reviewer oder eine
gemeinsame Datei; massgeblich ist die Spalte reviewer_id).

HOLDOUT-SCHUTZ
  Standard: nur Development-Paare. Zeilen von Holdout-Paaren werden beim Einlesen verworfen, bevor
  irgendetwas gezaehlt oder ausgegeben wird – es erscheint nur ihre Anzahl.
  Holdout nur mit ausdruecklichem --include-holdout.

Berechnet je Frage und je Reviewer-Paar:
  - absolute Uebereinstimmung
  - gewichtetes Cohen's Kappa (quadratisch, zusaetzlich linear) fuer 1–5-Fragen
  - Cohen's Kappa fuer kategoriale Fragen (yes/no/unclear, yes/maybe/no)
  - mittlere Differenz (r1 − r2) und mittlere absolute Differenz
und listet starke Uneinigkeit fuer die Adjudication:
  - Differenz >= 2 auf einer 1–5-Frage
  - yes vs. no bei Ausschluss (FIND Q4, CONNECT Q3) bzw. beim Anzeigen (CONNECT Q2)
Liest weder Referenzklassen noch Modellergebnisse.
"""
import argparse
import csv
import itertools
import json
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))

ORDINAL = {"find_q1_gespraech", "find_q2_a_to_b", "find_q3_b_to_a", "find_q5_sicherheit",
           "connect_q1_deckung", "connect_q4_sicherheit"}
NOMINAL = {"find_q4_ausschluss": ["yes", "no", "unclear"], "connect_q2_anzeigen": ["yes", "maybe", "no"],
           "connect_q3_ausschluss": ["yes", "no", "unclear"]}
REASONS = {"find_q4_grund": ["time_commitment", "founder_intent", "role_mismatch", "location_remote", "start_timing", "other"],
           "connect_q3_grund": ["location_remote", "category_mismatch", "topic_mismatch", "timing", "other"]}
QUESTIONS = {"FIND": ["find_q1_gespraech", "find_q2_a_to_b", "find_q3_b_to_a", "find_q4_ausschluss", "find_q5_sicherheit"],
             "CONNECT": ["connect_q1_deckung", "connect_q2_anzeigen", "connect_q3_ausschluss", "connect_q4_sicherheit"]}
STRONG_NOMINAL = {"find_q4_ausschluss", "connect_q3_ausschluss", "connect_q2_anzeigen"}


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("labels", nargs="+", help="ausgefuellte Label-CSV(s)")
    ap.add_argument("--include-holdout", action="store_true", help="Holdout-Paare einbeziehen (nur bewusst!)")
    ap.add_argument("--split-key", default=os.path.join(HERE, "human_labels_split_key_v02.json"))
    ap.add_argument("--out", help="Bericht als JSON speichern")
    ap.add_argument("--adjudication", help="strittige Faelle als CSV speichern")
    return ap.parse_args()


def load(paths, split, include_holdout):
    rows, problems, dropped = [], [], 0
    for path in paths:
        with open(path, encoding="utf-8") as f:
            for i, r in enumerate(csv.DictReader(f), 2):
                code = (r.get("pair_code") or "").strip()
                if code not in split:
                    problems.append(f"{path}:{i}: unbekannter pair_code '{code}'")
                    continue
                if split[code] == "holdout" and not include_holdout:
                    # Format trotzdem pruefen – aber ohne Wert und ohne Inhalt preiszugeben.
                    for msg in validate(path, i, {k: (v or "").strip() for k, v in r.items()}):
                        problems.append(msg.split(": ")[0] + ": ungültiger oder fehlender Wert (Holdout-Zeile, Inhalt nicht gezeigt)")
                    dropped += 1
                    continue
                rid = (r.get("reviewer_id") or "").strip()
                if not rid:
                    problems.append(f"{path}:{i}: reviewer_id fehlt")
                    continue
                rows.append((path, i, rid, code, {k: (v or "").strip() for k, v in r.items()}))
    return rows, problems, dropped


def validate(path, line, r):
    out = []
    ctx = r.get("kontext", "").upper()
    for q in QUESTIONS.get(ctx, []):
        v = r.get(q, "")
        if not v:
            out.append(f"{path}:{line}: {q} leer")
        elif q in ORDINAL and v not in {"1", "2", "3", "4", "5"}:
            out.append(f"{path}:{line}: {q}='{v}' ist nicht 1–5")
        elif q in NOMINAL and v not in NOMINAL[q]:
            out.append(f"{path}:{line}: {q}='{v}' nicht in {NOMINAL[q]}")
    for q, allowed in REASONS.items():
        excl = r.get(q.replace("_grund", "_ausschluss"), "")
        v = r.get(q, "")
        if excl == "yes" and v not in allowed:
            out.append(f"{path}:{line}: {q}='{v}' fehlt oder ungültig (bei Ausschluss=yes Pflicht)")
    return out


def cohen_kappa(a, b, cats):
    n = len(a)
    if n == 0:
        return None
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    pe = sum((a.count(c) / n) * (b.count(c) / n) for c in cats)
    return None if pe == 1 else round((po - pe) / (1 - pe), 4)


def weighted_kappa(a, b, k=5, kind="quadratic"):
    n = len(a)
    if n == 0:
        return None
    w = lambda i, j: 1 - (abs(i - j) / (k - 1)) ** (2 if kind == "quadratic" else 1)
    po = sum(w(x, y) for x, y in zip(a, b)) / n
    pa = [a.count(c) / n for c in range(1, k + 1)]
    pb = [b.count(c) / n for c in range(1, k + 1)]
    pe = sum(w(i + 1, j + 1) * pa[i] * pb[j] for i in range(k) for j in range(k))
    return None if pe == 1 else round((po - pe) / (1 - pe), 4)


def main():
    args = parse_args()
    split = {s["pair_code"]: s["split"] for s in json.load(open(args.split_key, encoding="utf-8"))["split"]}
    rows, problems, dropped = load(args.labels, split, args.include_holdout)
    for path, line, _, _, r in rows:
        problems += validate(path, line, r)

    # (pair_code, reviewer) -> Antworten; doppelte Zeilen sind ein Fehler
    answers, ctx_of = {}, {}
    for path, line, rid, code, r in rows:
        if (code, rid) in answers:
            problems.append(f"{path}:{line}: {code} von {rid} doppelt")
        answers[(code, rid)] = r
        ctx_of[code] = r.get("kontext", "").upper()
    reviewers = sorted({rid for _, rid in answers})

    report = dict(scope="development+holdout" if args.include_holdout else "development only",
                  holdout_rows_ignored=dropped, reviewers=reviewers, rows=len(rows), problems=problems, pairs={})
    adjudication = []
    for r1, r2 in itertools.combinations(reviewers, 2):
        pair_key = f"{r1}~{r2}"
        per_q = {}
        for ctx, questions in QUESTIONS.items():
            codes = sorted(c for c in ctx_of if ctx_of[c] == ctx and (c, r1) in answers and (c, r2) in answers)
            for q in questions:
                a = [answers[(c, r1)].get(q, "") for c in codes]
                b = [answers[(c, r2)].get(q, "") for c in codes]
                keep = [(c, x, y) for c, x, y in zip(codes, a, b) if x and y]
                xs, ys = [x for _, x, _ in keep], [y for _, _, y in keep]
                entry = dict(n=len(keep), agreement=round(sum(x == y for x, y in zip(xs, ys)) / len(keep), 4) if keep else None)
                if q in ORDINAL:
                    try:
                        xi, yi = [int(x) for x in xs], [int(y) for y in ys]
                    except ValueError:
                        entry["error"] = "nicht-numerische Werte"
                        per_q[q] = entry
                        continue
                    entry.update(weighted_kappa_quadratic=weighted_kappa(xi, yi), weighted_kappa_linear=weighted_kappa(xi, yi, kind="linear"),
                                 mean_difference=round(sum(x - y for x, y in zip(xi, yi)) / len(xi), 4) if xi else None,
                                 mean_abs_difference=round(sum(abs(x - y) for x, y in zip(xi, yi)) / len(xi), 4) if xi else None)
                    for (c, x, y) in keep:
                        if abs(int(x) - int(y)) >= 2:
                            adjudication.append(dict(pair_code=c, kontext=ctx, frage=q, reviewer_1=r1, wert_1=x, reviewer_2=r2, wert_2=y,
                                                     grund="Differenz >= 2"))
                else:
                    entry["cohen_kappa"] = cohen_kappa(xs, ys, NOMINAL[q])
                    for (c, x, y) in keep:
                        if q in STRONG_NOMINAL and {x, y} == {"yes", "no"}:
                            adjudication.append(dict(pair_code=c, kontext=ctx, frage=q, reviewer_1=r1, wert_1=x, reviewer_2=r2, wert_2=y,
                                                     grund="yes vs. no"))
                per_q[q] = entry
        report["pairs"][pair_key] = per_q
    report["strong_disagreements"] = len(adjudication)
    report["pairs_needing_adjudication"] = len({a["pair_code"] for a in adjudication})

    print(json.dumps({k: v for k, v in report.items() if k != "pairs"}, ensure_ascii=False, indent=1))
    for pk, per_q in report["pairs"].items():
        print(f"\nReviewer {pk}")
        for q, e in per_q.items():
            extra = " ".join(f"{k}={v}" for k, v in e.items() if k not in ("n",))
            print(f"  {q:24} n={e['n']:3} {extra}")
    if args.out:
        json.dump(report, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if args.adjudication:
        with open(args.adjudication, "w", newline="", encoding="utf-8") as f:
            cols = ["pair_code", "kontext", "frage", "reviewer_1", "wert_1", "reviewer_2", "wert_2", "grund"]
            w = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
            w.writeheader()
            for a in sorted(adjudication, key=lambda x: (x["pair_code"], x["frage"])):
                w.writerow(a)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
