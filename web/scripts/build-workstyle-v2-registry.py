"""Generate only v2 from the frozen v0.3 research source. --check never writes."""
import argparse
import json
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/research/phase-8/phase-8.4-v0.3-workstyle-pool.md'
TARGET = ROOT / 'web/docs/founder-workstyle-pretest-8.5a-v2.json'
SEED = ROOT / 'supabase/migrations/20261112121000_workstyle_v2_item_seed.sql'

def generate():
    source = SOURCE.read_text()
    order = re.findall(r'^\d+\. `([A-Z]+-(?:\d{2}|R1))`$', source, re.M)
    formats = {key: [{'value': i, 'label': label} for i, label in enumerate(labels.split(' | '), 1)]
               for key, labels in re.findall(r'^- `(\w+)`: (.+)$', source, re.M)}
    items = []
    for construct, section in re.findall(r'^## ([^\n]+)\n(.*?)(?=^## |\Z)', source, re.M | re.S):
        for key, prompt, usage, fmt, origin, facet in re.findall(r'^### ([A-Z]+-(?:\d{2}|R1))\n\n([^\n]+)\n\n- Verwendung: (Core|research_only)\n- Antwortformat: `(\w+)`\n- Herkunft: `(\w+)`\n- Facette: ([^\n]+)', section, re.M):
            core = usage == 'Core'
            items.append(dict(item_key=key, item_version='8.4-v0.3', assessment_version='8.5a-v2',
                construct=construct, facet=None if facet=='nicht spezifiziert' else facet,
                facet_status='not_specified' if facet=='nicht spezifiziert' else 'development_mapping',
                prompt=prompt, stem=None, response_format=fmt, missing_reasons=['cannot_assess'],
                source_type=origin, source_status=origin, source_status_explicit=True,
                source_note='Sprachliche Überarbeitung im fachlichen Review' if core else 'Neues Mikroszenario im fachlichen Review',
                development_status='candidate_for_pretest', usage='core' if core else 'research_only',
                research_only=not core, product_status='pretest_comparison_candidate' if core else 'excluded', form=None, note=None))
    assert len(items)==36 and len(order)==36 and len(set(order))==36
    assert set(order)=={i['item_key'] for i in items}
    items.sort(key=lambda i: order.index(i['item_key']))
    core = [i['item_key'] for i in items if not i['research_only']]
    assert len(core)==30
    return dict(assessment_key='founder-workstyle-pretest', assessment_version='8.5a-v2', pool_version='8.4-v0.3',
        registry_version='2.0.0', source=SOURCE.relative_to(ROOT).as_posix(), status='candidate_for_pretest',
        declared_counts=dict(pool=36,core=30), actual_counts=dict(pool=36,core=30,research_only=6),
        core_item_keys=core, design='fixed', item_order=order, forms={}, response_formats=formats,
        missing_options=dict(cannot_assess='Kann ich noch nicht einschätzen'),
        scoring=dict(overall_score=False,construct_scores=False,compatibility_score=False,validated_short_scale=False),
        comparison_requirements=['same_core_assessment_version','same_manifest_version','same_item_versions','explicit_product_sharing','exclude_research_only'], items=items)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    registry=generate()
    content=json.dumps(registry,ensure_ascii=False,indent=2)+'\n'
    seed="""-- Generated from Phase 8.4-v0.3. Additive only; v0.2 stays immutable.
begin;
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
select 'founder-workstyle-pretest-8-5a-v2',item->>'assessment_version',item->>'item_key',item->>'item_version',position::integer,item
from jsonb_array_elements($workstyle$"""+json.dumps(registry['items'],ensure_ascii=False,indent=2)+"""$workstyle$::jsonb) with ordinality as items(item,position);
commit;
"""
    for path,text in [(TARGET,content),(SEED,seed)]:
        if args.check:
            assert path.read_text()==text, f'{path}: differs from frozen source'
        else: path.write_text(text)
    print('v2 registry and seed match v0.3 source.' if args.check else str(TARGET.relative_to(ROOT)))
if __name__=='__main__': main()
