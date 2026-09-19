\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

-- ---------------------------------------------------------------------------
-- Zwei Advisors und zwei Founder. Advisor A begleitet das Team, Advisor B nicht.
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','fa000000-0000-4000-8000-000000000001','authenticated','authenticated','founder-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','fa000000-0000-4000-8000-000000000002','authenticated','authenticated','founder-b@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','fb000000-0000-4000-8000-000000000001','authenticated','authenticated','advisor-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','fb000000-0000-4000-8000-000000000002','authenticated','authenticated','advisor-b@example.com','',now(),'{}','{}',now(),now());

insert into public.relationships(id,user_a_id,user_b_id)
values ('fc000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000002');

insert into public.relationship_advisors(
  id, relationship_id, advisor_user_id, advisor_name, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'fd000000-0000-4000-8000-000000000001',
  'fc000000-0000-4000-8000-000000000001',
  'fb000000-0000-4000-8000-000000000001',
  'Advisor A', 'linked', true, true, now(), now()
);

-- ---------------------------------------------------------------------------
-- Advisor A schreibt eine Notiz
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.advisor_private_notes(relationship_id, advisor_user_id, body)
values ('fc000000-0000-4000-8000-000000000001','fb000000-0000-4000-8000-000000000001','Beim naechsten Mal Vesting ansprechen.');

select extensions.is(
  (select body from public.advisor_private_notes),
  'Beim naechsten Mal Vesting ansprechen.',
  'the advisor reads back their own note'
);

-- Auf eine fremde Person zu schreiben, geht nicht - auch nicht fuer denselben
-- Menschen mit einer anderen advisor_user_id in der Zeile.
select extensions.throws_ok(
  $$insert into public.advisor_private_notes(relationship_id, advisor_user_id, body)
    values ('fc000000-0000-4000-8000-000000000001','fb000000-0000-4000-8000-000000000002','fremd')$$,
  '42501',
  null,
  'writing a note in somebody else''s name is refused'
);

-- ---------------------------------------------------------------------------
-- Der zweite Advisor sieht nichts
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"fb000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is_empty(
  $$select body from public.advisor_private_notes$$,
  'another advisor sees nothing'
);
select extensions.is(
  (select count(*)::int from public.advisor_private_notes
   where relationship_id = 'fc000000-0000-4000-8000-000000000001'),
  0,
  'not even with the relationship id in hand'
);

-- Und kann sie auch nicht aendern oder loeschen.
update public.advisor_private_notes set body = 'uebernommen';
select extensions.is(
  (select count(*)::int from public.advisor_private_notes),
  0,
  'an update by another advisor changes nothing it can see'
);

-- ---------------------------------------------------------------------------
-- Die Founder sehen sie auch nicht. Das ist die Zusage, die in der
-- Oberflaeche steht - hier wird sie geprueft.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"fa000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is_empty(
  $$select body from public.advisor_private_notes$$,
  'the founder the note is about cannot read it'
);

set local role anon;
select extensions.is_empty(
  $$select body from public.advisor_private_notes$$,
  'anonymous sees nothing'
);

-- ---------------------------------------------------------------------------
-- Ein Widerruf beendet den Zugang zu Founder-Inhalten, nicht zur Handakte
-- ---------------------------------------------------------------------------
reset role;
update public.relationship_advisors
set status = 'revoked', revoked_at = now()
where id = 'fd000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(
  (select body from public.advisor_private_notes),
  'Beim naechsten Mal Vesting ansprechen.',
  'a revoke does not take the advisor''s own notes away'
);

-- ---------------------------------------------------------------------------
-- Das Loeschen eines Kontos nimmt sie mit
-- ---------------------------------------------------------------------------
reset role;
delete from auth.users where id = 'fa000000-0000-4000-8000-000000000001';
select extensions.is(
  (select count(*)::int from public.advisor_private_notes),
  0,
  'deleting a founder account removes records written about them'
);

-- ---------------------------------------------------------------------------
-- Die Wiedervorlage folgt derselben Regel
-- ---------------------------------------------------------------------------
insert into public.relationships(id,user_a_id,user_b_id)
values ('fc000000-0000-4000-8000-000000000002','fa000000-0000-4000-8000-000000000002','fb000000-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims = '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into public.advisor_follow_ups(relationship_id, advisor_user_id, due_on, note)
values ('fc000000-0000-4000-8000-000000000002','fb000000-0000-4000-8000-000000000001', current_date + 28, 'nachfassen');

set local request.jwt.claims = '{"sub":"fb000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is_empty(
  $$select note from public.advisor_follow_ups$$,
  'a follow-up is private to the advisor who set it'
);

select * from extensions.finish(); rollback;
