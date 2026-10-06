\set ON_ERROR_STOP on
-- Phase 12C.0: Einladung ansehen und annehmen sind getrennt. Lesen veraendert
-- nichts; nur eine ausdrueckliche Wahl erzeugt Mitgliedschaft.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
create function pg_temp.check(ok boolean,label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'invitation_decision: %',label; end if; end $$;
create temp table ia_people(n integer,person uuid);
grant all on ia_people to authenticated;
-- 1-2 Team A, 3 und 4 Eingeladene ins Team A, 5 fremde Person, 6 abgelaufen,
-- 7 widerrufen, 8 Paar-Einladung per Token (Regression), 9 fuenfte Person.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000',('e8780000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','decide-'||n||'@example.test','',now(),'{}','{}',now(),now() from generate_series(1,9)n;
insert into ia_people select n,('e8780000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,9)n;
insert into public.profiles(user_id,display_name,roles) select person,'Decide '||n,array['founder'] from ia_people on conflict(user_id) do update set roles=excluded.roles;
insert into public.founder_teams(id,name,team_context) values ('e8781000-0000-4000-8000-000000000001','Decide team','existing_team');
insert into public.founder_team_members(team_id,user_id) select 'e8781000-0000-4000-8000-000000000001',person from ia_people where n<=2;
create function pg_temp.p(n integer) returns uuid language sql as $$ select person from ia_people where ia_people.n=p.n $$;
insert into public.invitations(id,inviter_user_id,invitee_email,status,token_hash,expires_at,team_context,target_founder_team_id,revoked_at) values
 ('e8784000-0000-4000-8000-000000000003',pg_temp.p(1),'decide-3@example.test','sent',encode(extensions.digest('ia-3','sha256'),'hex'),now()+interval '7 days','existing_team','e8781000-0000-4000-8000-000000000001',null),
 ('e8784000-0000-4000-8000-000000000004',pg_temp.p(2),'decide-4@example.test','sent',encode(extensions.digest('ia-4','sha256'),'hex'),now()+interval '7 days','existing_team','e8781000-0000-4000-8000-000000000001',null),
 ('e8784000-0000-4000-8000-000000000006',pg_temp.p(1),'decide-6@example.test','sent',encode(extensions.digest('ia-6','sha256'),'hex'),now()-interval '1 day','existing_team','e8781000-0000-4000-8000-000000000001',null),
 ('e8784000-0000-4000-8000-000000000007',pg_temp.p(1),'decide-7@example.test','revoked',encode(extensions.digest('ia-7','sha256'),'hex'),now()+interval '7 days','existing_team','e8781000-0000-4000-8000-000000000001',now()),
 ('e8784000-0000-4000-8000-000000000008',pg_temp.p(6),'decide-8@example.test','sent',encode(extensions.digest('ia-8','sha256'),'hex'),now()+interval '7 days','pre_founder',null,null);

create function pg_temp.as_user(n integer) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims',jsonb_build_object('sub',pg_temp.p(n),'email','decide-'||n||'@example.test','role','authenticated')::text,true); end $$;
create function pg_temp.state(n integer,inv uuid) returns text language plpgsql as $$
declare r text; begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 r:=public.get_invitation_decision_state(inv); execute 'reset role'; return r; end $$;
-- Gibt 'ok' oder die Fehlermeldung zurueck.
create function pg_temp.accept(n integer,inv uuid,share boolean) returns text language plpgsql as $$
begin perform pg_temp.as_user(n); execute 'set local role authenticated';
 perform * from public.accept_invitation_by_id_with_team_share(inv,share);
 execute 'reset role'; return 'ok';
exception when others then execute 'reset role'; return sqlerrm; end $$;
create function pg_temp.member(n integer) returns boolean language sql as $$
 select exists(select 1 from public.founder_team_members where team_id='e8781000-0000-4000-8000-000000000001' and user_id=pg_temp.p(n)) $$;
create function pg_temp.shared(n integer) returns boolean language sql as $$
 select exists(select 1 from public.team_shares where team_id='e8781000-0000-4000-8000-000000000001' and owner_user_id=pg_temp.p(n) and revoked_at is null) $$;
create function pg_temp.fingerprint() returns text language sql as $$
 select (select count(*) from public.founder_team_members)::text||'/'||(select count(*) from public.relationships)::text||'/'||
  (select count(*) from public.team_shares)::text||'/'||(select string_agg(id::text||status::text||coalesce(invitee_user_id::text,''),',' order by id) from public.invitations where id::text like 'e8784000%') $$;

-- A) Lesen veraendert nichts (Entscheidungsbildschirm, auch wiederholt).
select set_config('ia.before',pg_temp.fingerprint(),true);
select pg_temp.check(pg_temp.state(3,'e8784000-0000-4000-8000-000000000003')='pending','A: invitee sees pending');
select pg_temp.check(pg_temp.state(3,'e8784000-0000-4000-8000-000000000003')='pending','A: reopening is still pending');
select pg_temp.check(pg_temp.fingerprint()=current_setting('ia.before'),'A: reading the state writes nothing');
select pg_temp.check(not pg_temp.member(3) and not pg_temp.member(4),'A: no membership before a decision');
select pg_temp.check((select provolatile from pg_proc where proname='get_invitation_decision_state')='s','A: state function is declared read-only (stable)');

-- Ohne Wahl keine Annahme.
select pg_temp.check(pg_temp.accept(3,'e8784000-0000-4000-8000-000000000003',null) like '%share_choice_required%','D: no choice, no acceptance');
select pg_temp.check(not pg_temp.member(3),'D: still no membership without a choice');

-- E) "Erst beitreten, spaeter entscheiden": Mitglied, keine Teamfreigabe.
select pg_temp.check(pg_temp.accept(4,'e8784000-0000-4000-8000-000000000004',false)='ok','E: join later accepted');
select pg_temp.check(pg_temp.member(4) and not pg_temp.shared(4),'E: member without team share');
select pg_temp.check(not pg_temp.shared(2),'E: inviter share is not implied');

-- F) "Team beitreten und teilen": Mitglied und Teamfreigabe fuer genau dieses Team.
select pg_temp.check(pg_temp.accept(3,'e8784000-0000-4000-8000-000000000003',true)='ok','F: join and share accepted');
select pg_temp.check(pg_temp.member(3) and pg_temp.shared(3),'F: member with team share');
select pg_temp.check((select count(*) from public.team_shares where owner_user_id=pg_temp.p(3))=1,'F: exactly one team share');

-- I/J) Bereits angenommen, zweimal und erneut geoeffnet: idempotent, keine Dubletten.
select pg_temp.check(pg_temp.state(3,'e8784000-0000-4000-8000-000000000003')='accepted','I: accepted state for the invitee');
select set_config('ia.after',pg_temp.fingerprint(),true);
select pg_temp.check(pg_temp.accept(3,'e8784000-0000-4000-8000-000000000003',true)='ok','J: second acceptance is idempotent');
select pg_temp.check(pg_temp.fingerprint()=current_setting('ia.after'),'J: second acceptance changes nothing');
select pg_temp.check((select count(*) from public.founder_team_members where user_id=pg_temp.p(3))=1,'J: no duplicate membership');

-- H) Fremde Person: weder Zustand noch Annahme.
select pg_temp.check(pg_temp.state(5,'e8784000-0000-4000-8000-000000000003')='unavailable','H: accepted invitation is unavailable to others');
select pg_temp.check(pg_temp.state(5,'e8784000-0000-4000-8000-000000000008')='unavailable','H: foreign person sees nothing');
select pg_temp.check(pg_temp.accept(5,'e8784000-0000-4000-8000-000000000008',false) like '%invitation_email_mismatch%','H: foreign person cannot accept');
select pg_temp.check(pg_temp.accept(5,'e8784000-0000-4000-8000-000000000003',false) like '%invitation_email_mismatch%','H: foreign person cannot take an accepted invitation');
select pg_temp.check(not exists(select 1 from public.founder_team_members where user_id=pg_temp.p(5)),'H: no membership for the foreign person');

-- G) Abgelaufen, widerrufen, unbekannt.
select pg_temp.check(pg_temp.state(6,'e8784000-0000-4000-8000-000000000006')='expired','G: expired state');
select pg_temp.check(pg_temp.accept(6,'e8784000-0000-4000-8000-000000000006',false) like '%expired%','G: expired cannot be accepted');
select pg_temp.check(pg_temp.state(7,'e8784000-0000-4000-8000-000000000007')='revoked','G: revoked state');
select pg_temp.check(pg_temp.accept(7,'e8784000-0000-4000-8000-000000000007',true) like '%revoked%','G: revoked cannot be accepted');
select pg_temp.check(not pg_temp.member(6) and not pg_temp.member(7) and not pg_temp.shared(7),'G: no membership or share from invalid invitations');
select pg_temp.check(pg_temp.state(3,'e8784000-0000-4000-8000-0000000000ff')='unavailable','G: unknown invitation is unavailable');
select pg_temp.check(pg_temp.accept(3,'e8784000-0000-4000-8000-0000000000ff',false) like '%invalid_token%','G: unknown invitation cannot be accepted');

-- K) 3er-/4er-Team: Team A hat jetzt genau vier Mitglieder; eine fuenfte Einladung scheitert.
select pg_temp.check((select count(*) from public.founder_team_members where team_id='e8781000-0000-4000-8000-000000000001')=4,'K: team has four members');
do $$ begin
 perform pg_temp.as_user(1); execute 'set local role authenticated';
 begin
  perform public.create_founder_team_invitation('e8781000-0000-4000-8000-000000000001','decide-9@example.test','fifth','Decide 1','decide-1@example.test','existing_team','basis',encode(extensions.digest('ia-9','sha256'),'hex'),now()+interval '7 days');
  raise exception 'fifth invitation created';
 exception when check_violation then null; end;
 execute 'reset role';
end $$;

-- Regression: Token-Weg (E-Mail-Link) unveraendert; Paar-Einladung ohne Team.
select pg_temp.as_user(8);
set local role authenticated;
select pg_temp.check((select count(*) from public.accept_invitation_with_team_share('ia-8',false))=1,'R: token acceptance still works');
reset role;
select pg_temp.check((select status::text from public.invitations where id='e8784000-0000-4000-8000-000000000008')='accepted','R: token invitation accepted');
select pg_temp.as_user(8);
set local role authenticated;
select pg_temp.check((select count(*) from public.accept_invitation('ia-8'))=1,'R: accept_invitation stays idempotent for the invitee');
reset role;

-- Rechte: Kern nicht direkt aufrufbar, Annahme und Zustand nur angemeldet.
select pg_temp.check(not has_function_privilege('authenticated','public.accept_invitation_core(uuid)','execute')
 and not has_function_privilege('anon','public.accept_invitation_core(uuid)','execute')
 and not has_function_privilege('service_role','public.accept_invitation_core(uuid)','execute'),'core is internal');
select pg_temp.check(has_function_privilege('authenticated','public.accept_invitation_by_id_with_team_share(uuid,boolean)','execute')
 and not has_function_privilege('anon','public.accept_invitation_by_id_with_team_share(uuid,boolean)','execute')
 and not has_function_privilege('anon','public.get_invitation_decision_state(uuid)','execute'),'acceptance and state only for signed-in users');

select extensions.pass('invitation acceptance requires an explicit decision');
select * from extensions.finish();
rollback;
