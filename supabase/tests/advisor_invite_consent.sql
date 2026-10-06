\set ON_ERROR_STOP on
-- Phase 12C.0b: Advisor-Einladungen (Personenzugang, Organisation) erst
-- ansehen, dann ausdruecklich annehmen. Ansehen schreibt nichts; jede Annahme
-- verlangt die eingeladene, bestaetigte Adresse.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'advisor_invite_consent: %',label; end if; end $$;
-- 1 Advisorin und Inhaberin, 2 Founderin (eingeladen), 3 fremd, 4 unbestaetigt,
-- 5 neue Advisorin (Organisation).
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8790000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','consent-'||n||'@example.test','',
 case when n=4 then null else now() end,'{}','{}',now(),now() from generate_series(1,5)n;
create function pg_temp.p(n integer) returns uuid language sql as $$ select ('e8790000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
insert into public.person_core(user_id,display_name) values (pg_temp.p(1),'Ada Advisor') on conflict(user_id) do update set display_name=excluded.display_name;
insert into public.advisor_orgs(id,name) values ('e8791000-0000-4000-8000-000000000001','Consent Accelerator');
insert into public.advisor_org_members(org_id,user_id,role) values ('e8791000-0000-4000-8000-000000000001',pg_temp.p(1),'owner');
create function pg_temp.h(label text) returns text language sql as $$ select encode(extensions.digest(label,'sha256'),'hex') $$;
insert into public.advisor_person_invites(advisor_user_id,invitee_email,token_hash,scopes,note,status,expires_at) values
 (pg_temp.p(1),'consent-2@example.test',pg_temp.h('p-open'),array['base','capability'],'Hallo','sent',now()+interval '7 days'),
 (pg_temp.p(1),'consent-2@example.test',pg_temp.h('p-expired'),array['base'],null,'sent',now()-interval '1 day'),
 (pg_temp.p(1),'consent-2@example.test',pg_temp.h('p-revoked'),array['base'],null,'revoked',now()+interval '7 days'),
 (pg_temp.p(1),'consent-2@example.test',pg_temp.h('p-later'),array['strengths'],null,'sent',now()+interval '7 days'),
 (pg_temp.p(1),'consent-4@example.test',pg_temp.h('p-unverified'),array['base'],null,'sent',now()+interval '7 days');
insert into public.advisor_org_invites(org_id,invited_by_user_id,invitee_email,token_hash,role,status,expires_at) values
 ('e8791000-0000-4000-8000-000000000001',pg_temp.p(1),'consent-5@example.test',pg_temp.h('o-open'),'advisor','sent',now()+interval '7 days'),
 ('e8791000-0000-4000-8000-000000000001',pg_temp.p(1),'consent-5@example.test',pg_temp.h('o-expired'),'advisor','sent',now()-interval '1 day'),
 ('e8791000-0000-4000-8000-000000000001',pg_temp.p(1),'consent-5@example.test',pg_temp.h('o-revoked'),'advisor','revoked',now()+interval '7 days'),
 ('e8791000-0000-4000-8000-000000000001',pg_temp.p(1),'consent-1@example.test',pg_temp.h('o-owner'),'advisor','sent',now()+interval '7 days'),
 ('e8791000-0000-4000-8000-000000000001',pg_temp.p(1),'consent-4@example.test',pg_temp.h('o-unverified'),'advisor','sent',now()+interval '7 days');

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'email','consent-'||n||'@example.test','role','authenticated')::text,true); end $$;
create function pg_temp.person_preview(n integer,label text) returns jsonb language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 r:=public.get_advisor_person_invite_preview(pg_temp.h(label)); execute 'reset role'; return r; end $$;
create function pg_temp.org_preview(n integer,label text) returns jsonb language plpgsql as $$
declare r jsonb; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 r:=public.get_advisor_org_invite_preview(pg_temp.h(label)); execute 'reset role'; return r; end $$;
create function pg_temp.claim_person(n integer,label text) returns text language plpgsql as $$
begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 perform public.claim_advisor_person_invite(pg_temp.h(label)); execute 'reset role'; return 'ok';
exception when others then execute 'reset role'; return sqlerrm; end $$;
create function pg_temp.claim_org(n integer,label text) returns text language plpgsql as $$
begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 perform public.claim_advisor_org_invite(pg_temp.h(label)); execute 'reset role'; return 'ok';
exception when others then execute 'reset role'; return sqlerrm; end $$;
create function pg_temp.fingerprint() returns text language sql as $$
 select (select count(*) from public.advisor_person_grants where subject_user_id in (select pg_temp.p(n) from generate_series(1,5)n))::text||'/'||
  (select string_agg(user_id::text||role||status,',' order by user_id) from public.advisor_org_members where org_id='e8791000-0000-4000-8000-000000000001')||'/'||
  (select string_agg(status,',' order by token_hash) from public.advisor_person_invites where advisor_user_id=pg_temp.p(1))||'/'||
  (select string_agg(status,',' order by token_hash) from public.advisor_org_invites where org_id='e8791000-0000-4000-8000-000000000001') $$;

-- GET/HEAD: Ansehen schreibt nichts, auch wiederholt und durch Fremde.
select set_config('ac.before',pg_temp.fingerprint(),true);
select pg_temp.check(pg_temp.person_preview(2,'p-open')->>'state'='open','P: invitee sees the open request');
select pg_temp.check(pg_temp.person_preview(2,'p-open')->>'advisor_name'='Ada Advisor'
 and pg_temp.person_preview(2,'p-open')->'scopes'='["base","capability"]'::jsonb,'P: preview shows who asks for what');
select pg_temp.check(pg_temp.person_preview(3,'p-open')='{"state":"unavailable"}'::jsonb,'P: foreign person sees no details');
select pg_temp.check(pg_temp.org_preview(5,'o-open')->>'state'='open' and pg_temp.org_preview(5,'o-open')->>'org_name'='Consent Accelerator'
 and pg_temp.org_preview(5,'o-open')->>'role'='advisor','O: invitee sees organisation and role');
select pg_temp.check(pg_temp.org_preview(3,'o-open')='{"state":"unavailable"}'::jsonb,'O: foreign person sees no details');
select pg_temp.check(pg_temp.person_preview(2,'not-a-token')->>'state'='unavailable','unknown token is unavailable');
select pg_temp.check(pg_temp.fingerprint()=current_setting('ac.before'),'viewing writes nothing');
select pg_temp.check((select bool_and(provolatile='s') from pg_proc where proname in ('get_advisor_person_invite_preview','get_advisor_org_invite_preview')),'previews are declared read-only');

-- Fremde Person: abgewiesen.
select pg_temp.check(pg_temp.claim_person(3,'p-open') like '%invite_email_mismatch%','P: foreign person rejected');
select pg_temp.check(pg_temp.claim_org(3,'o-open') like '%invite_email_mismatch%','O: foreign person rejected');

-- Unbestaetigte Adresse: weder Personenzugang, Organisation noch Founder-Einladung.
select pg_temp.check(pg_temp.person_preview(4,'p-unverified')->>'state'='unverified','P: unverified state');
select pg_temp.check(pg_temp.claim_person(4,'p-unverified') like '%email_not_verified%','P: unverified cannot claim');
select pg_temp.check(pg_temp.org_preview(4,'o-unverified')->>'state'='unverified','O: unverified state');
select pg_temp.check(pg_temp.claim_org(4,'o-unverified') like '%email_not_verified%','O: unverified cannot join');
insert into public.invitations(id,inviter_user_id,invitee_email,status,token_hash,expires_at,team_context) values
 ('e8794000-0000-4000-8000-000000000004',pg_temp.p(2),'consent-4@example.test','sent',pg_temp.h('f-unverified'),now()+interval '7 days','pre_founder');
do $$ declare st text; begin
 perform pg_temp.as_user(4); execute 'set local role authenticated';
 st:=public.get_invitation_decision_state('e8794000-0000-4000-8000-000000000004');
 if st<>'unverified' then raise exception 'founder invitation state for unverified: %',st; end if;
 begin perform public.accept_invitation_by_id_with_team_share('e8794000-0000-4000-8000-000000000004',false); raise exception 'unverified founder accepted';
 exception when insufficient_privilege then if sqlerrm<>'email_not_verified' then raise; end if; end;
 begin perform public.accept_invitation('f-unverified'); raise exception 'unverified token accepted';
 exception when insufficient_privilege then if sqlerrm<>'email_not_verified' then raise; end if; end;
 execute 'reset role';
end $$;
select pg_temp.check((select status::text from public.invitations where id='e8794000-0000-4000-8000-000000000004')='sent','F: founder invitation untouched for unverified');

-- Abgelaufen, widerrufen.
select pg_temp.check(pg_temp.person_preview(2,'p-expired')->>'state'='expired' and pg_temp.claim_person(2,'p-expired') like '%invite_not_open%','P: expired');
select pg_temp.check(pg_temp.person_preview(2,'p-revoked')->>'state'='revoked' and pg_temp.claim_person(2,'p-revoked') like '%invite_not_open%','P: revoked');
select pg_temp.check(pg_temp.org_preview(5,'o-expired')->>'state'='expired' and pg_temp.claim_org(5,'o-expired') like '%invite_not_open%','O: expired');
select pg_temp.check(pg_temp.org_preview(5,'o-revoked')->>'state'='revoked' and pg_temp.claim_org(5,'o-revoked') like '%invite_not_open%','O: revoked');
select pg_temp.check(pg_temp.fingerprint()=current_setting('ac.before'),'rejected attempts write nothing');

-- Ausdrueckliche Annahme: Personenzugang erzeugt nur Anfragen.
select pg_temp.check(pg_temp.claim_person(2,'p-open')='ok','P: explicit claim works');
select pg_temp.check((select count(*) from public.advisor_person_grants where subject_user_id=pg_temp.p(2) and advisor_user_id=pg_temp.p(1) and status='requested')=2,'P: one request per scope, no access yet');
select pg_temp.check(not exists(select 1 from public.advisor_person_grants where subject_user_id=pg_temp.p(2) and status='active'),'P: nothing active after claiming');
select pg_temp.check(pg_temp.person_preview(2,'p-open')->>'state'='claimed','P: claimed state for the invitee');
select pg_temp.check(pg_temp.person_preview(3,'p-open')->>'state'='unavailable','P: claimed invite stays unavailable to others');
select set_config('ac.claimed',pg_temp.fingerprint(),true);
select pg_temp.check(pg_temp.claim_person(2,'p-open') like '%invite_not_open%','P: second claim is rejected');
select pg_temp.check(pg_temp.fingerprint()=current_setting('ac.claimed'),'P: second claim changes nothing');

-- Rechte nach Zustimmung, Widerruf unveraendert.
do $$ declare g uuid; begin
 select id into g from public.advisor_person_grants where subject_user_id=pg_temp.p(2) and scope='base';
 perform pg_temp.as_user(2); execute 'set local role authenticated';
 perform public.decide_advisor_person_access(g,'approve');
 execute 'reset role';
 if (select status from public.advisor_person_grants where id=g)<>'active' then raise exception 'approve failed'; end if;
 if (select status from public.advisor_person_grants where subject_user_id=pg_temp.p(2) and scope='capability')<>'requested' then raise exception 'approval spilled over'; end if;
 perform pg_temp.as_user(2); execute 'set local role authenticated';
 perform public.decide_advisor_person_access(g,'revoke');
 execute 'reset role';
 if (select status from public.advisor_person_grants where id=g)<>'revoked' then raise exception 'revoke failed'; end if;
end $$;
-- Eine geltende Zustimmung bleibt bei einer neuen Einladung unangetastet.
update public.advisor_person_grants set status='active',approved_at=now(),revoked_at=null where subject_user_id=pg_temp.p(2) and scope='capability';
update public.advisor_person_invites set scopes=array['capability'] where token_hash=pg_temp.h('p-later');
select pg_temp.check(pg_temp.claim_person(2,'p-later')='ok','P: later invitation can be claimed');
select pg_temp.check((select status from public.advisor_person_grants where subject_user_id=pg_temp.p(2) and scope='capability')='active','P: active access is not turned back into a request');
-- Einladung zurueckziehen funktioniert wie bisher.
insert into public.advisor_person_invites(advisor_user_id,invitee_email,token_hash,scopes,status,expires_at) values
 (pg_temp.p(1),'consent-2@example.test',pg_temp.h('p-withdraw'),array['direction'],'sent',now()+interval '7 days');
do $$ begin
 perform pg_temp.as_user(1); execute 'set local role authenticated';
 perform public.revoke_advisor_person_invite((select id from public.advisor_person_invites where token_hash=pg_temp.h('p-withdraw')));
 execute 'reset role';
end $$;
select pg_temp.check(pg_temp.person_preview(2,'p-withdraw')->>'state'='revoked' and pg_temp.claim_person(2,'p-withdraw') like '%invite_not_open%','P: withdrawn invitation cannot be claimed');

-- Ausdrueckliche Annahme: Organisation.
select pg_temp.check(pg_temp.claim_org(5,'o-open')='ok','O: explicit join works');
select pg_temp.check((select role||status from public.advisor_org_members where org_id='e8791000-0000-4000-8000-000000000001' and user_id=pg_temp.p(5))='advisoractive','O: member with the invited role');
select pg_temp.check(pg_temp.org_preview(5,'o-open')->>'state'='claimed','O: claimed state');
select set_config('ac.org',pg_temp.fingerprint(),true);
select pg_temp.check(pg_temp.claim_org(5,'o-open') like '%invite_not_open%','O: second join is rejected');
select pg_temp.check(pg_temp.fingerprint()=current_setting('ac.org'),'O: second join changes nothing');
-- Keine stille Herabstufung der Inhaberin.
select pg_temp.check((pg_temp.org_preview(1,'o-owner')->>'already_member')::boolean,'O: preview knows the existing membership');
select pg_temp.check(pg_temp.claim_org(1,'o-owner')='ok','O: owner can claim an advisor invitation');
select pg_temp.check((select role from public.advisor_org_members where org_id='e8791000-0000-4000-8000-000000000001' and user_id=pg_temp.p(1))='owner','O: owner is not downgraded');

-- Rechte.
select pg_temp.check(not has_function_privilege('anon','public.get_advisor_person_invite_preview(text)','execute')
 and not has_function_privilege('anon','public.get_advisor_org_invite_preview(text)','execute')
 and has_function_privilege('authenticated','public.get_advisor_org_invite_preview(text)','execute')
 and not has_function_privilege('authenticated','public.current_user_email_verified()','execute'),'previews only for signed-in users; helper internal');

select extensions.pass('advisor invitations require an explicit, verified decision');
select * from extensions.finish();
rollback;
