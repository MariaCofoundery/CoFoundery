"""Generate the versioned Workstyle manifest from the supplied research source.

Run from any directory: python3 web/scripts/build-workstyle-registry.py --check
No old ALIGN registry is read and no item wording is normalized.
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/research/phase-8/phase-8.4-v0.2-workstyle-pool.md"
TARGET = ROOT / "web/docs/founder-workstyle-pretest-8.5a-v1.json"
SEED = ROOT / "supabase/migrations/20261111121000_workstyle_item_seed.sql"


def generate():
    source = SOURCE.read_text(encoding="utf-8")
    constructs = {
        "EVI": "Evidenzorientierung",
        "EXP": "Erfahrungsbasierte Urteilsnutzung",
        "EL": "Experimentelles Lernen",
        "VOICE": "Konstruktive Voice / sachlicher Dissens",
        "AMB": "Ambiguitätstoleranz",
        "ORG": "Arbeitsorganisation & Selbststeuerung",
    }
    core_section = source.split("## Phase 8.5a-v1 – Gemeinsamer Core\n", 1)[1].split("\n## ", 1)[0]
    core = re.findall(r"`((?:EVI|EXP|EL|VOICE|AMB|ORG)-\d{2})`", core_section)
    forms = {}
    for form, ids, count in re.findall(r"^\| ([ABC]) \| (.+) \| (\d+) \|$", source, re.M):
        forms[form] = re.findall(r"`([A-Z]+-\d{2})`", ids)
        assert len(forms[form]) == int(count), f"Form {form}: count mismatch"
    assert set(forms) == {"A", "B", "C"}
    items = []
    for match in re.finditer(r"^### ([A-Z]+-\d{2})\n\n([^\n]+)\n\n((?:- [^\n]+\n)+)", source, re.M):
        key, prompt, metadata = match.groups()
        prefix = key.split("-")[0]
        source_type, source_note = re.search(r"^- Herkunft: `(live_reference|adapted|new)` – (.+)$", metadata, re.M).groups()
        facet_match = re.search(r"^- Facette: (.+)$", metadata, re.M)
        note_match = re.search(r"^- Hinweis: (.+)$", metadata, re.M)
        form = next((name for name, ids in forms.items() if key in ids), None)
        is_core = key in core
        assert is_core != (form is not None), f"{key}: must belong to exactly one group"
        usage = re.search(r"^- Verwendung: (.+)$", metadata, re.M).group(1)
        assert usage == ("Core" if is_core else f"Form {form} / research_only"), key
        items.append({
            "item_key": key,
            "item_version": "8.4-v0.2",
            "assessment_version": "8.5a-v1",
            "construct": constructs[prefix],
            "facet": facet_match.group(1) if facet_match else None,
            "facet_status": "development_mapping" if prefix in ("EVI", "VOICE") else "source_defined" if prefix == "ORG" else "not_specified",
            "prompt": prompt,
            "stem": "Wie wohl fühlst du dich jeweils in dieser Situation?" if prefix == "AMB" else None,
            "response_format": "experience_weight" if prefix == "EXP" else "ambiguity_comfort" if prefix == "AMB" else "frequency",
            "missing_reasons": ["cannot_assess"] if prefix in ("EVI", "EXP", "AMB") else [],
            "source_type": source_type,
            "source_status": source_type,
            "source_status_explicit": prefix != "VOICE",
            "source_note": source_note,
            "development_status": "candidate_for_pretest",
            "usage": "core" if is_core else "research_only",
            "research_only": not is_core,
            "product_status": "pretest_comparison_candidate" if is_core else "excluded",
            "form": form,
            "note": note_match.group(1) if note_match else None,
        })
    listed_ids = re.findall(r"^### ([A-Z]+-\d{2})$", source, re.M)
    assert [item["item_key"] for item in items] == listed_ids, "Unparsed or malformed source item"
    assigned = core + [key for ids in forms.values() for key in ids]
    assert len(set(assigned)) == len(assigned), "Duplicate assignment"
    assert set(assigned) == set(listed_ids), "Unassigned or unknown item"
    formats = {
        "frequency": ["nie", "selten", "manchmal", "häufig", "fast immer"],
        "experience_weight": ["gar nicht", "eher wenig", "mittel", "stark", "sehr stark"],
        "ambiguity_comfort": ["sehr unwohl", "eher unwohl", "weder noch", "eher wohl", "sehr wohl"],
    }
    return {
        "assessment_key": "founder-workstyle-pretest",
        "assessment_version": "8.5a-v1",
        "pool_version": "8.4-v0.2",
        "registry_version": "1.0.0",
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "status": "candidate_for_pretest",
        "declared_counts": {"pool": 37, "core": 20},
        "actual_counts": {"pool": len(items), "core": len(core), "A": len(forms["A"]), "B": len(forms["B"]), "C": len(forms["C"])},
        "core_item_keys": core,
        "forms": forms,
        "response_formats": {key: [{"value": i, "label": label} for i, label in enumerate(labels, 1)] for key, labels in formats.items()},
        "missing_options": {"cannot_assess": "Kann ich noch nicht einschätzen"},
        "scoring": {"overall_score": False, "construct_scores": False, "compatibility_score": False, "validated_short_scale": False},
        "comparison_requirements": ["same_core_assessment_version", "same_item_versions", "explicit_product_sharing", "exclude_research_only"],
        "items": items,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if checked-in JSON differs from source; do not write.")
    args = parser.parse_args()
    content = json.dumps(generate(), ensure_ascii=False, indent=2) + "\n"
    seed = """-- Generated from the frozen Phase 8.4-v0.2 source; never overwrite historical item versions.
begin;
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
select 'founder-workstyle-pretest-8-5a-v1',item->>'assessment_version',item->>'item_key',item->>'item_version',position::integer,item
from jsonb_array_elements($workstyle$""" + json.dumps(generate()["items"], ensure_ascii=False, indent=2) + """$workstyle$::jsonb) with ordinality as items(item,position);
commit;
"""
    if args.check:
        if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != content or not SEED.exists() or SEED.read_text(encoding="utf-8") != seed:
            raise SystemExit("Workstyle registry differs from research source. Review before regenerating.")
        print("Workstyle registry matches research source.")
    else:
        TARGET.write_text(content, encoding="utf-8")
        SEED.write_text(seed, encoding="utf-8")
        print(TARGET.relative_to(ROOT))


if __name__ == "__main__":
    main()
