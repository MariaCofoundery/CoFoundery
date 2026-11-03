"""Generate v4 only from the frozen Endfassung-29 source; --check never writes."""
import argparse
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/research/phase-8/phase-8.5a-v4-workstyle-endfassung-29.json'
V3 = ROOT / 'web/docs/founder-workstyle-pretest-8.5a-v3.json'
TARGET = ROOT / 'web/docs/founder-workstyle-pretest-8.5a-v4.json'
SEED = ROOT / 'supabase/migrations/20270301121000_workstyle_v4_item_seed.sql'
ITEM_VERSION = 'v4.0'
AREAS = dict(ORG=6, EXP=5, EVI=5, VOICE=5, AMB=4, EL=4)

def generate():
    source=json.loads(SOURCE.read_text())
    v3=json.loads(V3.read_text())
    previous={i['item_key']:i for i in v3['items']}
    keys=[entry['key'] for entry in source]
    assert len(keys)==len(set(keys))==29 and set(keys)==set(v3['core_item_keys'])
    # Same relative order as the v3 core screens; the research screens in between are gone.
    order=[key for key in v3['item_order'] if key in keys]
    formats={key:labels for key,labels in v3['response_formats'].items() if key!='seriousness'}
    choices=next(i['options'] for i in v3['items'] if i['response_format']=='comparative')
    items=[]
    for entry in source:
        key,fmt,old=entry['key'],entry['format'],previous[entry['key']]
        comparative=fmt=='comparative'
        assert comparative or fmt in formats
        assert (entry['alternatives'] is not None)==comparative and (not comparative or len(entry['alternatives'])==2)
        alternatives=[{'option_id':k,'label':v} for k,v in zip(['A','B'],entry['alternatives'] or [])]
        assert entry['unchanged']==(entry['prompt']==old['prompt'] and fmt==old['response_format'] and alternatives==old['alternatives'])
        items.append(dict(item_key=key,item_version=ITEM_VERSION,assessment_version='8.5a-v4',construct=old['construct'],
            area_key=old['area_key'],area_status='development_area',scientific_status='core',facet=None,facet_status='not_specified',
            prompt=entry['prompt'],stem=None,response_format=fmt,missing_reasons=['cannot_assess'],
            options=choices if comparative else [],alternatives=alternatives,rendered_order=['A','B'] if comparative else None,
            source_type=old['source_type'],source_status=old['source_type'],source_status_explicit=False,
            source_note='Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung',
            development_status='candidate_for_pretest',usage='core',research_only=False,product_status='pretest_comparison_candidate',form=None,note=None))
    items.sort(key=lambda i:order.index(i['item_key']))
    assert {area:sum(i['area_key']==area for i in items) for area in AREAS}==AREAS
    assert {fmt:sum(i['response_format']==fmt for i in items) for fmt in ['likelihood','influence','ambiguity_discomfort','comparative']}==dict(likelihood=13,influence=5,ambiguity_discomfort=4,comparative=7)
    for prev,item in zip(items,items[1:]):
        assert prev['area_key']!=item['area_key'] and not prev['response_format']==item['response_format']=='comparative'
    return dict(assessment_key='founder-workstyle-pretest',assessment_version='8.5a-v4',pool_version=ITEM_VERSION,registry_version='4.0.0',
        source=SOURCE.relative_to(ROOT).as_posix(),status='candidate_for_pretest',declared_counts=dict(pool=29,core=29),
        actual_counts=dict(pool=29,core=29,research_only=0),scientific_counts=dict(core=29),
        core_item_keys=order,design='fixed',presentation_variant='mixed-core-v1',item_order=order,forms={},response_formats=formats,
        missing_options=dict(cannot_assess='Kann ich noch nicht einschätzen'),
        scoring=dict(overall_score=False,construct_scores=False,compatibility_score=False,validated_short_scale=False),
        comparison_requirements=['same_core_assessment_version','same_manifest_version','same_item_versions','explicit_product_sharing'],items=items)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    registry=generate()
    content=json.dumps(registry,ensure_ascii=False,indent=2)+'\n'
    seed="""-- Generated from the frozen Endfassung-29 source. No historical definition is updated.
begin;
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
select 'founder-workstyle-pretest-8-5a-v4',item->>'assessment_version',item->>'item_key',item->>'item_version',position::integer,item
from jsonb_array_elements($workstyle$"""+json.dumps(registry['items'],ensure_ascii=False,indent=2)+"""$workstyle$::jsonb) with ordinality as items(item,position);
commit;
"""
    for path,text in [(TARGET,content),(SEED,seed)]:
        if args.check: assert path.read_text()==text,f'{path}: differs from frozen Endfassung-29 source'
        else: path.write_text(text)
    print('v4 registry and seed match Endfassung-29 source.' if args.check else str(TARGET.relative_to(ROOT)))
if __name__=='__main__':main()
