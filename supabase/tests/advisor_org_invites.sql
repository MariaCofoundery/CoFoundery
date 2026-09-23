\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

-- ---------------------------------------------------------------------------
-- Im Namen der Organisation
-- ---------------------------------------------------------------------------
--
-- Ohne diesen Weg waere die Organisation eine Liste von Namen ohne Wirkung:
-- Der Zugang gehoerte weiter der einzelnen Advisorin, und mit ihr ginge er.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000002','authenticated','authenticated','neue.advisorin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','e1000000-0000-4000-8000-000000000003','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temp table org as select public.create_advisor_org('Beispiel Accelerator') as id;
grant select on org to authenticated;

-- ---------------------------------------------------------------------------
-- Eine Advisorin aufnehmen
-- ---------------------------------------------------------------------------
select extensions.isnt(
  public.create_advisor_org_invite((select id from org), 'Neue.Advisorin@Example.com', repeat('a', 64)),
  null,
  'the owner can invite an advisor'
);

-- Wer sie nicht fuehrt, kann niemanden aufnehmen - eine Organisation, die
-- sich selbst vergroessert, waere keine.
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.throws_ok(
  $$select public.create_advisor_org_invite((select id from org), 'x@example.com', repeat('b', 64))$$,
  '42501', null,
  'somebody who does not lead it cannot take people in'
);

-- Annehmen macht zum Mitglied - hier entscheidet man ueber sich selbst.
set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  public.claim_advisor_org_invite(repeat('a', 64)),
  (select id from org),
  'claiming makes you a member'
);

select extensions.is(
  (select status from public.advisor_org_members
   where org_id = (select id from org) and user_id = 'e1000000-0000-4000-8000-000000000002'),
  'active',
  'and the membership is active'
);

-- ---------------------------------------------------------------------------
-- Eine Person im Namen der Organisation fragen
-- ---------------------------------------------------------------------------
select extensions.isnt(
  public.create_advisor_person_invite(
    'founderin@example.com', repeat('c', 64), array['capability']::text[],
    'Wir begleiten dich im Programm.', (select id from org)
  ),
  null,
  'a member can ask in the name of the organisation'
);

set local request.jwt.claims = '{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  public.claim_advisor_person_invite(repeat('c', 64)),
  1,
  'the person claims it'
);

-- DER ZUGANG GEHOERT DER ORGANISATION, nicht der Advisorin, die gefragt hat.
select extensions.is(
  (select org_id from public.advisor_person_grants
   where subject_user_id = 'e1000000-0000-4000-8000-000000000003'),
  (select id from org),
  'and the resulting request belongs to the organisation'
);

select extensions.is(
  (select advisor_user_id from public.advisor_person_grants
   where subject_user_id = 'e1000000-0000-4000-8000-000000000003'),
  null,
  'not to the person who asked - that is the whole point'
);

select * from extensions.finish();
rollback;
