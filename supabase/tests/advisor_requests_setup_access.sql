\set ON_ERROR_STOP on

-- KORRIGIERT AM 21.09.2026: Diese Suite ist nie gelaufen. Die Kennungen
-- begannen mit 'h', und 'h' ist keine Hexadezimalziffer - Postgres wies
-- schon die erste Einfuegung ab ("invalid input syntax for type uuid"), und
-- pgTAP meldete "planned N tests but ran 0". Weil `npm run ci:check` keine
-- Datenbanktests ausfuehrt, sah es niemand.
--
-- Wer Buchstaben als Praefix durchzaehlt, laeuft nach 'f' aus dem Zeichensatz.
-- Ersetzt durch '1'.

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Ein Team mit zwei Foundern, ein begleitender Advisor, ein Fremder
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','1a000000-0000-4000-8000-000000000001','authenticated','authenticated','setup-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1a000000-0000-4000-8000-000000000002','authenticated','authenticated','setup-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1a000000-0000-4000-8000-000000000003','authenticated','authenticated','setup-advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1a000000-0000-4000-8000-000000000004','authenticated','authenticated','setup-stranger@example.com','',now(),'{}','{}',now(),now());

-- `team_context` ist Pflicht ('pre_founder' oder 'existing_team').
insert into public.founder_teams(id, name, team_context)
values ('1b000000-0000-4000-8000-000000000001','Team Setup','pre_founder');
insert into public.founder_team_members(team_id, user_id) values
('1b000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000001'),
('1b000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000002');

insert into public.relationships(id,user_a_id,user_b_id,founder_team_id)
values ('1c000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000001','1a000000-0000-4000-8000-000000000002','1b000000-0000-4000-8000-000000000001');

insert into public.relationship_advisors(
  id, relationship_id, advisor_user_id, advisor_name, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  '1d000000-0000-4000-8000-000000000001',
  '1c000000-0000-4000-8000-000000000001',
  '1a000000-0000-4000-8000-000000000003',
  'Advisor Ada', 'linked', true, true, now(), now()
);

-- ---------------------------------------------------------------------------
-- Ein Fremder kann nicht fragen
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_founder_team_advisor_setup_grant('1c000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'somebody who is not the advisor of this relationship cannot ask'
);

-- Auch ein Founder des Teams nicht ueber DIESEN Weg - er hat seinen eigenen.
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_founder_team_advisor_setup_grant('1c000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'a founder cannot use the advisor request path'
);

-- ---------------------------------------------------------------------------
-- Der Advisor fragt - und bekommt DADURCH keinen Zugriff
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select active from public.request_founder_team_advisor_setup_grant('1c000000-0000-4000-8000-000000000001')),
  false,
  'asking does not grant access'
);

select extensions.is(
  (select consent_count from public.request_founder_team_advisor_setup_grant('1c000000-0000-4000-8000-000000000001')),
  0,
  'and it records no consent on anybody''s behalf'
);

-- Zweimal fragen legt keine zweite Zeile an.
reset role;
select extensions.is(
  (select count(*)::int from public.founder_team_advisor_setup_grants
   where team_id = '1b000000-0000-4000-8000-000000000001'),
  1,
  'asking twice creates only one request'
);

select extensions.ok(
  (select requested_by_advisor_at is not null from public.founder_team_advisor_setup_grants
   where team_id = '1b000000-0000-4000-8000-000000000001'),
  'the request is marked as coming from the advisor'
);

-- Und der Advisor sieht weiterhin keine Inhalte.
set local role authenticated;
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select item_key from public.get_advisor_confirmed_founder_setup('1c000000-0000-4000-8000-000000000001')$$,
  'a pending request shows the advisor nothing'
);

-- ---------------------------------------------------------------------------
-- Die Founder sehen, dass gefragt wurde
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(
  (select requested_by_advisor from public.get_founder_team_advisor_setup_access('1b000000-0000-4000-8000-000000000001')),
  'the founders see that the advisor asked'
);

-- ---------------------------------------------------------------------------
-- Erst beide Zustimmungen oeffnen den Zugriff
-- ---------------------------------------------------------------------------
--
-- DIE KENNUNG KOMMT AUS EINER TEMPORAEREN TABELLE, nicht aus einem Unterselect
-- auf die Tabelle: `founder_team_advisor_setup_grants` hat bewusst keine
-- Policy fuer Angemeldete - der Zugriff laeuft ausschliesslich ueber die RPCs.
-- Ein Unterselect darauf scheitert deshalb mit "permission denied", und zwar
-- an der Testmechanik und nicht an der Sache. Dasselbe Muster wie
-- `messaging_ids` in network_messaging_v01; temporaere Tabellen unterliegen
-- keiner Zeilensicherheit.
reset role;
create temporary table grant_ids as
select id from public.founder_team_advisor_setup_grants
where team_id = '1b000000-0000-4000-8000-000000000001';
-- Die temporaere Tabelle gehoert postgres; ohne dieses Recht sieht die
-- angemeldete Rolle sie nicht (so macht es auch `messaging_ids`).
grant select on grant_ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.confirm_founder_team_advisor_setup_grant((select id from grant_ids));
set local request.jwt.claims = '{"sub":"1a000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select active from public.confirm_founder_team_advisor_setup_grant(
    (select id from grant_ids))),
  true,
  'only both consents open the access'
);

select * from extensions.finish(); rollback;
