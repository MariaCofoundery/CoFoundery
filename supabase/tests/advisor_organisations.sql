\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

-- ---------------------------------------------------------------------------
-- Eine Organisation, mehrere Advisor
-- ---------------------------------------------------------------------------
--
-- GEWUENSCHT AM 23.09.2026: "Es gibt einen Organisationszugang, und darunter
-- kann man dann auch Advisor-Konten anlegen."
--
-- GEPRUEFT WIRD DAS, WAS DIE ORGANISATION UEBERHAUPT RECHTFERTIGT: Ein Founder
-- stimmt dem PROGRAMM zu, nicht einer einzelnen Person. Faellt jemand dort
-- weg, bleibt die Zustimmung und SEIN Zugriff endet.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','chefin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','mueller@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000004','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';

create temp table org as select public.create_advisor_org('Beispiel Accelerator') as id;
grant select on org to authenticated;

select extensions.isnt((select id from org), null, 'an organisation can be created');

-- Wer sie anlegt, fuehrt sie - eine Organisation ohne Verantwortliche waere
-- eine Zeile, die niemand verwalten kann.
select extensions.is(
  (select role from public.advisor_org_members
   where org_id = (select id from org) and user_id = 'd1000000-0000-4000-8000-000000000001'),
  'owner',
  'whoever creates it leads it'
);

-- Herr Mueller kommt dazu.
set local role postgres;
insert into public.advisor_org_members(org_id, user_id, role)
values ((select id from org), 'd1000000-0000-4000-8000-000000000002', 'advisor');

-- Und die Organisation haelt einen Zugang, dem die Founderin zugestimmt hat.
insert into public.advisor_person_grants(
  subject_user_id, org_id, scope, status, requested_by_user_id, approved_at)
values ('d1000000-0000-4000-8000-000000000003', (select id from org), 'capability',
  'active', 'd1000000-0000-4000-8000-000000000001', now());
set local role authenticated;

-- ---------------------------------------------------------------------------
-- Jedes aktive Mitglied sieht, was die Organisation bekommen hat
-- ---------------------------------------------------------------------------
select extensions.ok(
  public.has_advisor_person_access(
    'd1000000-0000-4000-8000-000000000003', 'capability',
    'd1000000-0000-4000-8000-000000000002'
  ),
  'an active member sees what the organisation was granted'
);

-- Und ein Fremder nicht.
select extensions.ok(
  not public.has_advisor_person_access(
    'd1000000-0000-4000-8000-000000000003', 'capability',
    'd1000000-0000-4000-8000-000000000004'
  ),
  'somebody outside sees nothing'
);

-- ---------------------------------------------------------------------------
-- DAS IST DER GRUND FUER DIE ORGANISATION
-- ---------------------------------------------------------------------------
-- Herr Mueller hoert auf. Sein Zugriff endet im selben Moment - ohne dass die
-- Founderin gefragt werden muss. Und ihre Zustimmung bleibt bestehen, damit
-- die Nachfolgerin nicht neu fragen muss.
select extensions.ok(
  public.set_advisor_org_membership(
    (select id from org), 'd1000000-0000-4000-8000-000000000002', 'revoked'
  ),
  'a membership can be ended'
);

select extensions.ok(
  not public.has_advisor_person_access(
    'd1000000-0000-4000-8000-000000000003', 'capability',
    'd1000000-0000-4000-8000-000000000002'
  ),
  'and that access is gone at once'
);

select extensions.is(
  (select status from public.advisor_person_grants
   where subject_user_id = 'd1000000-0000-4000-8000-000000000003'),
  'active',
  'while the consent itself stays - the programme keeps it, not the person'
);

-- ---------------------------------------------------------------------------
-- Die begleitete Person sieht, WER dort Mitglied ist
-- ---------------------------------------------------------------------------
-- Zustimmung zu einer Organisation ist Zustimmung zu mehreren, wechselnden
-- Menschen. Ohne diese Liste waere die Einwilligung ein Blankoscheck.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.ok(
  (select count(*) from public.advisor_org_members where org_id = (select id from org)) >= 1,
  'the accompanied person can see who is a member there'
);

select extensions.is(
  (select count(*)::int from public.advisor_orgs),
  1,
  'and which organisation it is'
);

-- Ein Unbeteiligter sieht davon nichts.
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.advisor_orgs),
  0,
  'somebody uninvolved sees no organisation'
);

select * from extensions.finish();
rollback;
