\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

-- ---------------------------------------------------------------------------
-- Ein Team mit zwei Foundern, ein begleitender Advisor, ein Fremder
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ha000000-0000-4000-8000-000000000001','authenticated','authenticated','setup-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ha000000-0000-4000-8000-000000000002','authenticated','authenticated','setup-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ha000000-0000-4000-8000-000000000003','authenticated','authenticated','setup-advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ha000000-0000-4000-8000-000000000004','authenticated','authenticated','setup-stranger@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams(id, name) values ('hb000000-0000-4000-8000-000000000001','Team Setup');
insert into public.founder_team_members(team_id, user_id) values
('hb000000-0000-4000-8000-000000000001','ha000000-0000-4000-8000-000000000001'),
('hb000000-0000-4000-8000-000000000001','ha000000-0000-4000-8000-000000000002');

insert into public.relationships(id,user_a_id,user_b_id,founder_team_id)
values ('hc000000-0000-4000-8000-000000000001','ha000000-0000-4000-8000-000000000001','ha000000-0000-4000-8000-000000000002','hb000000-0000-4000-8000-000000000001');

insert into public.relationship_advisors(
  id, relationship_id, advisor_user_id, advisor_name, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'hd000000-0000-4000-8000-000000000001',
  'hc000000-0000-4000-8000-000000000001',
  'ha000000-0000-4000-8000-000000000003',
  'Advisor Ada', 'linked', true, true, now(), now()
);

-- ---------------------------------------------------------------------------
-- Ein Fremder kann nicht fragen
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"ha000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_founder_team_advisor_setup_grant('hc000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'somebody who is not the advisor of this relationship cannot ask'
);

-- Auch ein Founder des Teams nicht ueber DIESEN Weg - er hat seinen eigenen.
set local request.jwt.claims = '{"sub":"ha000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.request_founder_team_advisor_setup_grant('hc000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'a founder cannot use the advisor request path'
);

-- ---------------------------------------------------------------------------
-- Der Advisor fragt - und bekommt DADURCH keinen Zugriff
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"ha000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select active from public.request_founder_team_advisor_setup_grant('hc000000-0000-4000-8000-000000000001')),
  false,
  'asking does not grant access'
);

select extensions.is(
  (select consent_count from public.request_founder_team_advisor_setup_grant('hc000000-0000-4000-8000-000000000001')),
  0,
  'and it records no consent on anybody''s behalf'
);

-- Zweimal fragen legt keine zweite Zeile an.
reset role;
select extensions.is(
  (select count(*)::int from public.founder_team_advisor_setup_grants
   where team_id = 'hb000000-0000-4000-8000-000000000001'),
  1,
  'asking twice creates only one request'
);

select extensions.ok(
  (select requested_by_advisor_at is not null from public.founder_team_advisor_setup_grants
   where team_id = 'hb000000-0000-4000-8000-000000000001'),
  'the request is marked as coming from the advisor'
);

-- Und der Advisor sieht weiterhin keine Inhalte.
set local role authenticated;
set local request.jwt.claims = '{"sub":"ha000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is_empty(
  $$select item_key from public.get_advisor_confirmed_founder_setup('hc000000-0000-4000-8000-000000000001')$$,
  'a pending request shows the advisor nothing'
);

-- ---------------------------------------------------------------------------
-- Die Founder sehen, dass gefragt wurde
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"ha000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.ok(
  (select requested_by_advisor from public.get_founder_team_advisor_setup_access('hb000000-0000-4000-8000-000000000001')),
  'the founders see that the advisor asked'
);

-- ---------------------------------------------------------------------------
-- Erst beide Zustimmungen oeffnen den Zugriff
-- ---------------------------------------------------------------------------
select public.confirm_founder_team_advisor_setup_grant(
  (select id from public.founder_team_advisor_setup_grants
   where team_id = 'hb000000-0000-4000-8000-000000000001')
);
set local request.jwt.claims = '{"sub":"ha000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select active from public.confirm_founder_team_advisor_setup_grant(
    (select id from public.founder_team_advisor_setup_grants
     where team_id = 'hb000000-0000-4000-8000-000000000001'))),
  true,
  'only both consents open the access'
);

select * from extensions.finish(); rollback;
