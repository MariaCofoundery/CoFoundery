\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

-- ---------------------------------------------------------------------------
-- Die Fuehrung uebergeben
-- ---------------------------------------------------------------------------
--
-- Die letzte Inhaberin las "Uebertrage zuerst die Fuehrung", konnte es aber
-- nicht. `set_advisor_org_member_role` ist der Weg - mit denselben Regeln wie
-- das Entfernen: nur Inhaberinnen, und es bleibt immer eine.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e1100000-0000-4000-8000-000000000001','authenticated','authenticated','leitung@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1100000-0000-4000-8000-000000000002','authenticated','authenticated','kollegin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1100000-0000-4000-8000-000000000003','authenticated','authenticated','aussen@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1100000-0000-4000-8000-000000000001","role":"authenticated"}';
create temp table org as select public.create_advisor_org('Rollen Accelerator') as id;
grant select on org to authenticated;

reset role;
insert into public.advisor_org_members (org_id, user_id, role, status)
values ((select id from org), 'e1100000-0000-4000-8000-000000000002', 'advisor', 'active');
set local role authenticated;

-- Ein Advisor macht sich nicht selbst zur Inhaberin.
set local request.jwt.claims = '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000002', 'owner')$$,
  '42501', 'advisor_org_not_yours',
  'an advisor cannot promote themselves'
);

set local request.jwt.claims = '{"sub":"e1100000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000002', 'owner')$$,
  '42501', 'advisor_org_not_yours',
  'somebody outside cannot change roles'
);

-- Die einzige Inhaberin kann sich nicht herabstufen.
set local request.jwt.claims = '{"sub":"e1100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000001', 'advisor')$$,
  '42501', 'advisor_org_needs_an_owner',
  'the only owner cannot step down'
);

select extensions.is(
  public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000003', 'owner'),
  false,
  'somebody who is not a member cannot be promoted'
);

select extensions.is(
  public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000002', 'chefin'),
  false,
  'only owner and advisor are roles'
);

select extensions.is(
  public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000002', 'owner'),
  true,
  'the owner can take a member into the lead'
);

-- Uebergeben: jetzt darf sie selbst Advisor werden.
select extensions.is(
  public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000001', 'advisor'),
  true,
  'with a second owner she can step down'
);

reset role;
select extensions.results_eq(
  $$select user_id::text || ':' || role from public.advisor_org_members where org_id = (select id from org) order by user_id$$,
  $$values ('e1100000-0000-4000-8000-000000000001:advisor'), ('e1100000-0000-4000-8000-000000000002:owner')$$,
  'the lead has been handed over'
);
set local role authenticated;

set local request.jwt.claims = '{"sub":"e1100000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000001', 'owner')$$,
  '42501', 'advisor_org_not_yours',
  'after stepping down she cannot take it back herself'
);

set local request.jwt.claims = '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.set_advisor_org_member_role((select id from org), 'e1100000-0000-4000-8000-000000000002', 'advisor')$$,
  '42501', 'advisor_org_needs_an_owner',
  'the new only owner cannot step down either'
);

select * from extensions.finish();
rollback;
