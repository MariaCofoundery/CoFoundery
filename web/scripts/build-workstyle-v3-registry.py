"""Generate v3 only from the frozen v0.4 source; --check never writes."""
import argparse
import json
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/research/phase-8/phase-8.4-v0.4-workstyle-development-instrument.md'
TARGET = ROOT / 'web/docs/founder-workstyle-pretest-8.5a-v3.json'
SEED = ROOT / 'supabase/migrations/20261113121000_workstyle_v3_item_seed.sql'

def generate():
    source=SOURCE.read_text()
    order=re.findall(r'^\d+\. `([A-Z]+-(?:\d{2}|R\d+))`$',source,re.M)
    formats={key:[{'value':i,'label':label} for i,label in enumerate(labels.split(' | '),1)]
        for key,labels in re.findall(r'^- `(\w+)`: (.+)$',source,re.M) if key!='comparative'}
    comparative=re.search(r'^- `comparative`: (.+)$',source,re.M).group(1).split(' | ')
    choices=[{'option_id':key,'label':label} for key,label in zip(['strong_a','lean_a','lean_b','strong_b'],comparative)]
    items=[]
    for area,construct,section in re.findall(r'^## (EVI|EXP|EL|VOICE|AMB|ORG|DEC|FS) – ([^\n]+)\n(.*?)(?=^## |\Z)',source,re.M|re.S):
        for key,body in re.findall(r'^### ([A-Z]+-(?:\d{2}|R\d+))\n\n(.*?)(?=^### |\Z)',section,re.M|re.S):
            prompt=body.split('\n\n',1)[0]
            status=re.search(r'Wissenschaftlicher Status: `(\w+)`',body).group(1)
            fmt=re.search(r'Antwortformat: `(\w+)`',body).group(1)
            origin=re.search(r'Herkunft: `(\w+)`',body).group(1)
            note=re.search(r'Research-Thema / Confound: ([^\n]+)',body)
            options=[{'option_id':k,'label':v} for k,v in re.findall(r'^- ([A-E]): ([^\n]+)$',body,re.M)]
            core=status=='core'
            items.append(dict(item_key=key,item_version='8.4-v0.4',assessment_version='8.5a-v3',construct=construct,
                area_key=area,area_status='candidate_area' if area=='DEC' else 'research_facet' if area=='FS' else 'development_area',
                scientific_status=status,facet='aktives Perspektivensuchen' if area=='FS' else None,facet_status='source_defined' if area=='FS' else 'not_specified',
                prompt=prompt,stem=None,response_format=fmt,missing_reasons=['cannot_assess'],
                options=choices if fmt=='comparative' else options,
                alternatives=options if fmt=='comparative' else [],rendered_order=['A','B'] if fmt=='comparative' else None,
                source_type=origin,source_status=origin,source_status_explicit=False,source_note='Entwicklung gemäß v0.4-Spezifikation; keine versionenübergreifende Itemgleichsetzung',
                development_status='candidate_for_pretest',usage='core' if core else 'research_only',research_only=not core,
                product_status='pretest_comparison_candidate' if core else 'excluded',form=None,note=note.group(1) if note else None))
    assert len(items)==52 and len(order)==len(set(order))==52 and set(order)=={i['item_key'] for i in items}
    items.sort(key=lambda i:order.index(i['item_key']))
    core=[i['item_key'] for i in items if not i['research_only']]
    assert len(core)==29
    for i in items:
        if i['response_format']=='behavioral': assert len(i['options'])==5
        if i['response_format']=='comparative': assert len(i['alternatives'])==2 and len(i['options'])==4
    return dict(assessment_key='founder-workstyle-pretest',assessment_version='8.5a-v3',pool_version='8.4-v0.4',registry_version='3.0.0',
        source=SOURCE.relative_to(ROOT).as_posix(),status='candidate_for_pretest',declared_counts=dict(pool=52,core=29),
        actual_counts=dict(pool=52,core=29,research_only=23),scientific_counts=dict(core=29,core_research=6,candidate_core=4,research=13),
        core_item_keys=core,design='fixed',presentation_variant='mixed-v1',item_order=order,forms={},response_formats=formats,
        missing_options=dict(cannot_assess='Kann ich noch nicht einschätzen'),
        scoring=dict(overall_score=False,construct_scores=False,compatibility_score=False,validated_short_scale=False),
        comparison_requirements=['same_core_assessment_version','same_manifest_version','same_item_versions','explicit_product_sharing','exclude_research_only','exclude_candidate_areas'],items=items)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    registry=generate()
    content=json.dumps(registry,ensure_ascii=False,indent=2)+'\n'
    seed="""-- Generated from frozen v0.4 source. No historical definition is updated.
begin;
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
select 'founder-workstyle-pretest-8-5a-v3',item->>'assessment_version',item->>'item_key',item->>'item_version',position::integer,item
from jsonb_array_elements($workstyle$"""+json.dumps(registry['items'],ensure_ascii=False,indent=2)+"""$workstyle$::jsonb) with ordinality as items(item,position);
commit;
"""
    for path,text in [(TARGET,content),(SEED,seed)]:
        if args.check: assert path.read_text()==text,f'{path}: differs from frozen v0.4 source'
        else: path.write_text(text)
    print('v3 registry and seed match v0.4 source.' if args.check else str(TARGET.relative_to(ROOT)))
if __name__=='__main__':main()
