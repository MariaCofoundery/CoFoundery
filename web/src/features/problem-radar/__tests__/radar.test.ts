import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
import { beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { safeRadarUrl, signalInput, pageNumber, filter, statuses } from '@/features/problem-radar/model';
type ResolveResult = {url:string;shortCircuit?:boolean};
const registerHooks=(nodeModule as unknown as {registerHooks(h:{resolve(s:string,c:unknown,n:(s:string,c:unknown)=>ResolveResult):ResolveResult}):{deregister():void}}).registerHooks;
const id='78000000-0000-4000-8000-000000000001';
const state={admin:true,signedIn:true,error:null as null|{code:string;message:string},duplicate:false,calls:[] as {name:string;args:unknown}[],paths:[] as string[]};
const client={rpc:async(name:string,args?:unknown)=>{state.calls.push({name,args});return name==='is_platform_admin'?{data:state.admin,error:null}:{data:name==='save_radar_source'?id:{id,duplicate:state.duplicate},error:state.error};}};
(globalThis as typeof globalThis & {__radarTest?:unknown}).__radarTest={state,client};
const modules:Record<string,string>={
 '@/lib/supabase/server':`export const createClient=async()=>globalThis.__radarTest.client; export const getRequestUser=async()=>({data:{user:globalThis.__radarTest.state.signedIn?{id:'session'}:null}});`,
 'next/navigation':`export function notFound(){throw new Error('NOT_FOUND')} export function redirect(url){throw new Error('REDIRECT:'+url)}`,
 'next/cache':`export function revalidatePath(path){globalThis.__radarTest.state.paths.push(path)}`
};
const hooks=registerHooks({resolve(s,c,n){return modules[s]?{shortCircuit:true,url:`data:text/javascript,${encodeURIComponent(modules[s])}`}:n(s,c);}});
const actions=await import('@/features/problem-radar/actions');
const {requirePlatformAdmin}=await import('@/features/moderation/access');
hooks.deregister();
beforeEach(()=>Object.assign(state,{admin:true,signedIn:true,error:null,duplicate:false,calls:[],paths:[]}));
function form(){const f=new FormData();Object.entries({source_id:id,source_url:'https://fixture.invalid/issues/1?view=full&utm_source=test',source_language:'de',summary_language:'en',summary:'Own summary',problem_observation:'Manual transfers cost time',affected_context:'Small software teams',tags:'workflow, tools',availability:'unchecked',minimized:'on',stable_public_item_id:'',source_date:''}).forEach(([k,v])=>f.set(k,v));return f;}
for(const denied of ['anonymous','normal','revoked'])test(`${denied} cannot read admin route or call actions`,async()=>{
 state.signedIn=denied!=='anonymous';state.admin=false;
 await assert.rejects(requirePlatformAdmin(),/NOT_FOUND/);
 for(const action of Object.values(actions))await assert.rejects(action(form()),/NOT_FOUND/);
 assert.ok(state.calls.every(c=>c.name==='is_platform_admin'));
});
test('manual action never calls fetch, HEAD, preview, robots or remote metadata',async(t)=>{
 const network=t.mock.method(globalThis,'fetch',async()=>{throw new Error('UNEXPECTED_NETWORK')});
 await assert.rejects(actions.saveRadarSignalAction(form()),/result=saved$/);
 assert.equal(network.mock.callCount(),0);assert.equal(state.calls[1].name,'save_radar_signal');
 const args=state.calls[1].args as {p_input:Record<string,unknown>};
 assert.equal(args.p_input.source_url,'https://fixture.invalid/issues/1?view=full&utm_source=test');
 assert.equal(args.p_input.source_date,null);assert.equal(args.p_input.summary_language,'en');
 assert.equal('created_by' in args.p_input,false);assert.equal('excerpt' in args.p_input,false);
});
test('duplicate navigates to existing record without reapproval',async()=>{state.duplicate=true;await assert.rejects(actions.saveRadarSignalAction(form()),/result=duplicate$/);assert.equal(state.calls.length,2)});
test('unsafe URL and missing minimization acknowledgment never reach mutation',async()=>{
 for(const url of ['javascript:alert(1)','https://user:pass@fixture.invalid','ftp://fixture.invalid','https://fixture.invalid\\evil','https://fixture.invalid:9000','https://fixture.invalid/a\nb']){const f=form();f.set('source_url',url);assert.equal(signalInput(f),null);}
 const f=form();f.delete('minimized');await assert.rejects(actions.saveRadarSignalAction(f),/result=invalid$/);assert.equal(state.calls.length,1);
});
test('pure URL validation does not look up hosts',async(t)=>{const network=t.mock.method(globalThis,'fetch',async()=>{throw new Error('NETWORK')});assert.equal(safeRadarUrl('https://nonexistent.invalid/path'),'https://nonexistent.invalid/path');assert.equal(network.mock.callCount(),0)});
test('RPC details and sensitive contents never appear in error redirect',async()=>{state.error={code:'23514',message:'SECRET_CONTENT'};await assert.rejects(actions.saveRadarSignalAction(form()),/^Error: REDIRECT:\/admin\/problem-radar\?result=invalid$/);assert.deepEqual(state.paths,[])});
test('concurrent review conflict is explained instead of claiming success',async()=>{state.error={code:'40001',message:'internal'};const f=form();f.set('id',id);f.set('revision','3');f.set('action','relevant');await assert.rejects(actions.reviewRadarSignalAction(f),/result=conflict$/);assert.deepEqual(state.calls[1].args,{p_id:id,p_revision:3,p_action:'relevant',p_reason:'manual_review'})});
test('unexpected client fields cannot assign reviewer or public content',()=>{const f=form();f.set('created_by','forged');f.set('excerpt','copied text');f.set('review_status','relevant');const result=signalInput(f)!;assert.equal('created_by' in result,false);assert.equal('excerpt' in result,false);assert.equal('review_status' in result,false)});
test('safe filters and pagination',()=>{assert.equal(pageNumber('-1'),0);assert.equal(pageNumber(['1']),0);assert.equal(pageNumber('2'),2);assert.equal(filter('relevant',statuses),'relevant');assert.equal(filter('https://fixture.invalid',statuses),null)});
test('DE and EN keys explain no retrieval and own wording',()=>{
 const de=JSON.parse(readFileSync(new URL('../../../../messages/de/radar.json',import.meta.url),'utf8'));
 const en=JSON.parse(readFileSync(new URL('../../../../messages/en/radar.json',import.meta.url),'utf8'));
 const keys=(o:Record<string,unknown>,p=''):string[]=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v as Record<string,unknown>,`${p}${k}.`):[`${p}${k}`]).sort();
 assert.deepEqual(keys(de),keys(en));assert.match(de.ownWords,/niemals/);assert.match(en.ownWords,/never retrieves/);assert.match(de.minimized,/personenbezogene/);
});
test('private metadata and no remote resource loaders',()=>{
 const root=new URL('../../../',import.meta.url);
 const layout=readFileSync(new URL('app/(product)/admin/problem-radar/layout.tsx',root),'utf8');
 assert.match(layout,/index: false, follow: false/);assert.match(layout,/no-referrer/);
 assert.match(readFileSync(new URL('app/robots.ts',root),'utf8'),/"\/admin\/problem-radar"/);
 for(const name of ['actions.ts','model.ts','forms.tsx'])assert.doesNotMatch(readFileSync(new URL('../'+name,import.meta.url),'utf8'),/fetch\s*\(|axios|https?\.request|service_role|SERVICE_ROLE|og:image|<img|next\/image/);
});
