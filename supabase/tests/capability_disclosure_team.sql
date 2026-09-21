\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

-- ---------------------------------------------------------------------------
-- Die Freigabeleiter im Team
-- ---------------------------------------------------------------------------
--
-- GEAENDERT AM 21.09.2026 fuer die Teamauswertung: Eine geteilte
-- Founder-Team-Mitgliedschaft gilt als angenommene Beziehung - in einem Team
-- landet niemand versehentlich.
--
-- WAS SICH NICHT AENDERT, und das ist der Kern dieser Faelle: die STUFE der
-- Freigabe. Wer `private` eingestellt hat, gibt weiterhin nichts heraus; wer
-- `areas` eingestellt hat, gibt Bereiche und KEINE Tiefe heraus - auch im
-- eigenen Team. Die Mitgliedschaft ersetzt die Beziehung, nicht die
-- Entscheidung.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000001','authenticated','authenticated','sieht@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000002','authenticated','authenticated','teilt-tief@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000003','authenticated','authenticated','teilt-flach@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000004','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

-- person_core entsteht per Trigger bei der Anmeldung - hier wird nur die
-- Freigabestufe gesetzt.
update public.person_core set capability_disclosure = 'areas_depth_on_contact'
where user_id in ('f1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000004');
update public.person_core set capability_disclosure = 'areas'
where user_id = 'f1000000-0000-4000-8000-000000000003';

insert into public.person_capability_entries(user_id, area_id, application_level, ownership_wish) values
('f1000000-0000-4000-8000-000000000002','fundraising',5,'own'),
('f1000000-0000-4000-8000-000000000003','public_speaking',4,'prefer_other'),
('f1000000-0000-4000-8000-000000000004','accounting_controlling',5,'own');

-- Ein Team mit den ersten drei. Die vierte Person ist nicht dabei.
insert into public.founder_teams(id, name, team_context)
values ('f2000000-0000-4000-8000-000000000001', 'Testteam', 'pre_founder');

insert into public.founder_team_members(team_id, user_id) values
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001'),
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002'),
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000003');

-- ---------------------------------------------------------------------------
-- Aus der Sicht des ersten Mitglieds
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- MIT VOLLER FREIGABE: Stufe und Wunsch kommen durch. Ohne das haette die
-- Teamauswertung fuer jeden Bereich "keine Grundlage".
select extensions.results_eq(
  $$select area_id, application_level, ownership_wish
    from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000002','team')$$,
  $$values ('fundraising', 5::smallint, 'own')$$,
  'a team mate who released depth is readable within the team'
);

-- MIT FREIGABESTUFE "areas": der Bereich ja, die Tiefe nicht. Die
-- Mitgliedschaft ersetzt die Beziehung, nicht die Entscheidung.
select extensions.results_eq(
  $$select area_id, application_level, ownership_wish
    from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000003','team')$$,
  $$values ('public_speaking', null::smallint, null::text)$$,
  'released areas without depth stay without depth - even in the team'
);

-- NICHT IM TEAM: nichts, obwohl diese Person die Tiefe freigegeben hat.
select extensions.is(
  (select count(*)::int from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000004','team')),
  0,
  'somebody outside the team is not readable through the team context'
);

-- ---------------------------------------------------------------------------
-- Die Stufe "private" bleibt privat
-- ---------------------------------------------------------------------------
set local role postgres;
update public.person_core set capability_disclosure = 'private'
where user_id = 'f1000000-0000-4000-8000-000000000002';

set local role authenticated;
select extensions.is(
  (select count(*)::int from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000002','team')),
  0,
  'whoever set private gives nothing away - not even to their own team'
);

-- ---------------------------------------------------------------------------
-- Wer das Team verlässt, ist wieder zu
-- ---------------------------------------------------------------------------
set local role postgres;
update public.person_core set capability_disclosure = 'areas_depth_on_contact'
where user_id = 'f1000000-0000-4000-8000-000000000002';

set local role authenticated;
select extensions.is(
  (select count(*)::int from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000002','team')),
  1,
  'and readable again after switching back'
);

set local role postgres;
delete from public.founder_team_members
where team_id = 'f2000000-0000-4000-8000-000000000001'
  and user_id = 'f1000000-0000-4000-8000-000000000002';

set local role authenticated;
select extensions.is(
  (select count(*)::int from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000002','team')),
  0,
  'leaving the team closes the view again'
);

-- ---------------------------------------------------------------------------
-- Die anderen Kontexte bleiben, wie sie waren
-- ---------------------------------------------------------------------------
-- Eine Teammitgliedschaft macht kein Connect-Profil. Ohne aktives
-- Kontextprofil gibt der Connect-Kontext nichts heraus - unveraendert aus
-- 20260908120000.
select extensions.is(
  (select count(*)::int from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000003','connect')),
  0,
  'a shared team does not create a connect profile'
);

-- Und ein erfundener Kontext trifft keine der Bedingungen.
select extensions.is(
  (select count(*)::int from public.get_disclosed_capability('f1000000-0000-4000-8000-000000000003','erfunden')),
  0,
  'an unknown context discloses nothing'
);

select * from extensions.finish();
rollback;
