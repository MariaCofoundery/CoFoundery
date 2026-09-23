\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

-- ---------------------------------------------------------------------------
-- Ein Advisor begleitet auch einzelne Menschen
-- ---------------------------------------------------------------------------
--
-- GEMELDET AM 23.09.2026: "Ein Accelerator haette das gerne so, dass man auch
-- mit den einzelnen Foundern sprechen kann - nicht nur mit Teams."
--
-- GEPRUEFT WIRD DIE ZUSAGE, auf der alles andere steht: Zugang entsteht durch
-- EINWILLIGUNG, nicht durch Anfrage - und er ist jederzeit widerrufbar.
-- ---------------------------------------------------------------------------

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000001','authenticated','authenticated','founderin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000002','authenticated','authenticated','advisor@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000003','authenticated','authenticated','fremd@example.com','',now(),'{}','{}',now(),now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Der Advisor fragt - und hat damit noch gar nichts
-- ---------------------------------------------------------------------------
create temp table asked as
select public.request_advisor_person_access(
  'b1000000-0000-4000-8000-000000000001', 'capability',
  'Ich begleite das Programm und wuerde gern mit dir arbeiten.'
) as id;
grant select on asked to authenticated;

select extensions.isnt((select id from asked), null, 'an advisor can ask');

select extensions.is(
  (select status from public.advisor_person_grants where id = (select id from asked)),
  'requested',
  'asking creates a request, never an access'
);

-- DAS IST DER KERN: Zwischen Anfrage und Sichtbarkeit steht ein Mensch.
-- Spaeter wird ein bezahlter Sitz an dieser Stelle nichts anderes tun.
select extensions.ok(
  not public.has_advisor_person_access(
    'b1000000-0000-4000-8000-000000000001', 'capability',
    'b1000000-0000-4000-8000-000000000002'
  ),
  'a request grants nothing until somebody agrees'
);

-- Und der Advisor kann sich nicht selbst zustimmen.
select extensions.throws_ok(
  $$select public.decide_advisor_person_access((select id from asked), 'approve')$$,
  '42501', null,
  'the advisor cannot approve their own request'
);

-- ---------------------------------------------------------------------------
-- Die Person entscheidet
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}';

select extensions.ok(
  public.decide_advisor_person_access((select id from asked), 'approve'),
  'the person can agree'
);

select extensions.ok(
  public.has_advisor_person_access(
    'b1000000-0000-4000-8000-000000000001', 'capability',
    'b1000000-0000-4000-8000-000000000002'
  ),
  'and then the advisor sees that scope'
);

-- NUR DIESEN UMFANG. Eine Zustimmung zu den Faehigkeiten ist keine zu allem
-- anderen - deshalb je Umfang eine eigene Zeile.
select extensions.ok(
  not public.has_advisor_person_access(
    'b1000000-0000-4000-8000-000000000001', 'direction',
    'b1000000-0000-4000-8000-000000000002'
  ),
  'agreeing to one scope is not agreeing to the next'
);

-- ---------------------------------------------------------------------------
-- Widerruf wirkt sofort
-- ---------------------------------------------------------------------------
select extensions.ok(
  public.decide_advisor_person_access((select id from asked), 'revoke'),
  'the person can take it back'
);

select extensions.ok(
  not public.has_advisor_person_access(
    'b1000000-0000-4000-8000-000000000001', 'capability',
    'b1000000-0000-4000-8000-000000000002'
  ),
  'and it is gone at once'
);

-- Der Widerruf bleibt nachvollziehbar - er loescht nicht.
select extensions.is(
  (select status from public.advisor_person_grants where id = (select id from asked)),
  'revoked',
  'a revocation stays readable, it does not delete the history'
);

-- Eine erneute Anfrage macht aus dem Widerruf keinen Zugang.
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.request_advisor_person_access('b1000000-0000-4000-8000-000000000001', 'capability', null);
select extensions.ok(
  not public.has_advisor_person_access(
    'b1000000-0000-4000-8000-000000000001', 'capability',
    'b1000000-0000-4000-8000-000000000002'
  ),
  'asking again after a revocation does not restore access'
);

-- ---------------------------------------------------------------------------
-- Und Fremde sehen nichts davon
-- ---------------------------------------------------------------------------
-- Beide Beteiligten sehen dieselbe Zeile: Die Person MUSS sehen koennen, wer
-- Zugang hat. Ein Dritter nicht.
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.advisor_person_grants),
  0,
  'nobody else sees who accompanies whom'
);

select * from extensions.finish();
rollback;
