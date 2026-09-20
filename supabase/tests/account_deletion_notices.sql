\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- ---------------------------------------------------------------------------
-- Zwei Founder und eine begleitende Person
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000001','authenticated','authenticated','bleibt@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000002','authenticated','authenticated','geht@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','d1000000-0000-4000-8000-000000000003','authenticated','authenticated','advisor@example.com','',now(),'{}','{}',now(),now());

insert into public.relationships(id,user_a_id,user_b_id)
values ('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002');

insert into public.relationship_advisors(
  id, relationship_id, advisor_user_id, advisor_name, status,
  founder_a_approved, founder_b_approved, approved_at, linked_at
) values (
  'd3000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001',
  'd1000000-0000-4000-8000-000000000003',
  'Advisor', 'linked', true, true, now(), now()
);

-- ---------------------------------------------------------------------------
-- Ohne Kontoloeschung passiert nichts
-- ---------------------------------------------------------------------------
-- DAS IST DIE WICHTIGSTE ZUSAGE: Eine Beziehung kann aus anderen Gruenden
-- verschwinden. Wuerde dann ein Hinweis geschrieben, stuende dort die
-- Behauptung, jemand habe sein Konto geloescht - und niemand koennte sie
-- ueberpruefen.
savepoint ohne_loeschung;
delete from public.relationships where id = 'd2000000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::int from public.account_deletion_notices),
  0,
  'deleting a relationship on its own writes no notice'
);
rollback to savepoint ohne_loeschung;

-- ---------------------------------------------------------------------------
-- Ein Founder loescht sein Konto
-- ---------------------------------------------------------------------------
savepoint founder_geht;
select set_config('app.allow_account_cleanup', 'on', true);
delete from public.relationships where id = 'd2000000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::int from public.account_deletion_notices
   where recipient_user_id = 'd1000000-0000-4000-8000-000000000001'
     and context = 'founder_connection'),
  1,
  'the remaining co-founder is told'
);

select extensions.is(
  (select count(*)::int from public.account_deletion_notices
   where recipient_user_id = 'd1000000-0000-4000-8000-000000000003'
     and context = 'advisor_team'),
  1,
  'and the advisor, who loses the team with it'
);

-- Die Zeile fuer die gehende Person wird mitgeschrieben - sie verschwindet
-- gleich darauf mit dem Konto. Dadurch muss der Trigger nicht entscheiden, wer
-- von beiden geht.
select extensions.is(
  (select count(*)::int from public.account_deletion_notices
   where recipient_user_id = 'd1000000-0000-4000-8000-000000000002'),
  1,
  'the leaving person gets a row too - it goes with their account'
);

delete from auth.users where id = 'd1000000-0000-4000-8000-000000000002';

select extensions.is(
  (select count(*)::int from public.account_deletion_notices
   where recipient_user_id = 'd1000000-0000-4000-8000-000000000002'),
  0,
  'and it is gone once the account is'
);

-- UND KEIN ZWEITER HINWEIS: Die Advisor-Zeile verschwindet mit der Beziehung.
-- Ohne die Bedingung im zweiten Trigger stuende hier zusaetzlich "dein Advisor
-- hat sein Konto geloescht" - fuer ein Ereignis, das nicht stattgefunden hat.
select extensions.is(
  (select count(*)::int from public.account_deletion_notices
   where context = 'founder_advisor'),
  0,
  'the founders are not told their advisor left, because the advisor did not'
);
rollback to savepoint founder_geht;

-- ---------------------------------------------------------------------------
-- Die begleitende Person loescht ihr Konto
-- ---------------------------------------------------------------------------
savepoint advisor_geht;
select set_config('app.allow_account_cleanup', 'on', true);
delete from auth.users where id = 'd1000000-0000-4000-8000-000000000003';

select extensions.is(
  (select count(*)::int from public.account_deletion_notices where context = 'founder_advisor'),
  2,
  'both founders are told that the person accompanying them is gone'
);

select extensions.is(
  (select count(*)::int from public.account_deletion_notices where context = 'advisor_team'),
  0,
  'and nobody is told a team ended - it did not'
);
rollback to savepoint advisor_geht;

-- ---------------------------------------------------------------------------
-- Was im Hinweis steht - und was nicht
-- ---------------------------------------------------------------------------
select set_config('app.allow_account_cleanup', 'on', true);
delete from public.relationships where id = 'd2000000-0000-4000-8000-000000000001';

-- Kein Name, keine Adresse, keine Kennung der gegangenen Person. Die Spalten
-- der Tabelle sind die Zusage; waere hier eine mehr, muesste sie begruendet
-- werden.
select extensions.set_eq(
  $$select column_name::text from information_schema.columns
    where table_schema = 'public' and table_name = 'account_deletion_notices'$$,
  $$values ('id'), ('recipient_user_id'), ('context'), ('created_at')$$,
  'the notice holds nothing about the person who left'
);

-- Und jede Person sieht nur ihre eigenen.
set local role authenticated;
set local request.jwt.claims = '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.account_deletion_notices),
  1,
  'everyone sees only their own notice'
);

-- Weggeklickt heisst geloescht.
delete from public.account_deletion_notices;

select extensions.is(
  (select count(*)::int from public.account_deletion_notices),
  0,
  'dismissing removes the last trace'
);

select * from extensions.finish();
rollback;
