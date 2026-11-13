"""Generate v5 only from the frozen source file; --check never writes."""
import argparse
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/research/phase-9/workstyle-v5-fragen-2026-11-13.json'
V4 = ROOT / 'web/docs/founder-workstyle-pretest-8.5a-v4.json'
TARGET = ROOT / 'web/docs/founder-workstyle-pretest-8.5a-v5.json'
SEED = ROOT / 'supabase/migrations/20270420121000_workstyle_v5_item_seed.sql'
ITEM_VERSION = 'v5.0'
AREAS = dict(ORG=6, EXP=5, EVI=5, VOICE=5, AMB=4, EL=4)
FORMATS = dict(comparative=20, influence=5, ambiguity_unrest=4)
UNREST = ['überhaupt keine', 'eher wenig', 'teils/teils', 'eher viel', 'sehr viel']

def generate():
    source = json.loads(SOURCE.read_text())
    v4 = json.loads(V4.read_text())
    previous = {i['item_key']: i for i in v4['items']}
    entries = source['items']
    order = [entry['key'] for entry in entries]
    assert len(order) == len(set(order)) == 29 and set(order) == set(v4['core_item_keys'])
    formats = {key: labels for key, labels in v4['response_formats'].items() if key == 'influence'}
    formats['ambiguity_unrest'] = [dict(value=i + 1, label=label) for i, label in enumerate(UNREST)]
    choices = next(i['options'] for i in v4['items'] if i['response_format'] == 'comparative')
    pole_sides = source['poles']
    items = []
    for entry in entries:
        key, fmt, old = entry['key'], entry['format'], previous[entry['key']]
        comparative = fmt == 'comparative'
        assert comparative or fmt in formats
        assert (entry['alternatives'] is not None) == comparative and (entry['poles'] is not None) == comparative
        assert not comparative or len(entry['alternatives']) == 2
        area = old['area_key']
        facet = entry['facet']
        if comparative:
            # Jede Zweierwahl gehoert zu zwei Polen desselben Bereichs (oder derselben ORG-Facette).
            pair = {entry['poles']['A'], entry['poles']['B']}
            assert len(pair) == 2
            if area == 'ORG' and facet == 'vorbereitung_rhythmus':
                assert pair == {'struktur', 'fluss'}
            else:
                assert pair == set(pole_sides[area]), (key, pair)
        alternatives = [dict(option_id=k, label=v) for k, v in zip(['A', 'B'], entry['alternatives'] or [])]
        item = dict(item_key=key, item_version=ITEM_VERSION, assessment_version='8.5a-v5', construct=old['construct'],
            area_key=area, area_status='development_area', scientific_status='core', facet=facet,
            facet_status='development_mapping' if facet else 'not_specified',
            prompt=entry['prompt'], stem=None, response_format=fmt, missing_reasons=['cannot_assess'],
            options=choices if comparative else [], alternatives=alternatives, rendered_order=['A', 'B'] if comparative else None)
        if comparative:
            item['poles'] = entry['poles']
        item.update(source_type='adapted', source_status='adapted', source_status_explicit=False,
            source_note='Fassung 5 (Entwurf 13.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung',
            development_status='candidate_for_pretest', usage='core', research_only=False,
            product_status='pretest_comparison_candidate', form=None, note=None)
        items.append(item)
    assert {area: sum(i['area_key'] == area for i in items) for area in AREAS} == AREAS
    assert {fmt: sum(i['response_format'] == fmt for i in items) for fmt in FORMATS} == FORMATS
    return dict(assessment_key='founder-workstyle-pretest', assessment_version='8.5a-v5', pool_version=ITEM_VERSION, registry_version='5.0.0',
        source=SOURCE.relative_to(ROOT).as_posix(), status='candidate_for_pretest', declared_counts=dict(pool=29, core=29),
        actual_counts=dict(pool=29, core=29, research_only=0), scientific_counts=dict(core=29),
        core_item_keys=order, design='fixed', presentation_variant='mixed-core-v2', item_order=order, forms={}, response_formats=formats,
        missing_options=dict(cannot_assess='Kann ich noch nicht einschätzen'),
        instruction=source['instruction'], pole_sides=pole_sides,
        scoring=dict(overall_score=False, construct_scores=False, compatibility_score=False, validated_short_scale=False),
        comparison_requirements=['same_core_assessment_version', 'same_manifest_version', 'same_item_versions', 'explicit_product_sharing'], items=items)

def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    registry = generate()
    content = json.dumps(registry, ensure_ascii=False, indent=2) + '\n'
    seed = """-- Generated from the frozen v5 source file. No historical definition is updated.
begin;
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
select 'founder-workstyle-pretest-8-5a-v5',item->>'assessment_version',item->>'item_key',item->>'item_version',position::integer,item
from jsonb_array_elements($workstyle$""" + json.dumps(registry['items'], ensure_ascii=False, indent=2) + """$workstyle$::jsonb) with ordinality as items(item,position);
commit;
"""
    for path, text in [(TARGET, content), (SEED, seed)]:
        if args.check: assert path.read_text() == text, f'{path}: differs from the frozen v5 source'
        else: path.write_text(text)
    print('v5 registry and seed match the source.' if args.check else str(TARGET.relative_to(ROOT)))
if __name__ == '__main__': main()
