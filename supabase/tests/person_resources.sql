\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

-- ---------------------------------------------------------------------------
-- Eine Person mit einer veroeffentlichten Anzeige, ein Arbeiter
-- ---------------------------------------------------------------------------
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000001','authenticated','authenticated','person@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f1000000-0000-4000-8000-000000000002','authenticated','authenticated','worker@example.com','',now(),'{}','{}',now(),now());

-- person_core entsteht per Trigger mit dem Konto; hier nur der Name.
insert into public.person_core(user_id, display_name) values
('f1000000-0000-4000-8000-000000000001', 'Person')
on conflict (user_id) do update set display_name = excluded.display_name;
insert into public.ai_workers(user_id, label) values
('f1000000-0000-4000-8000-000000000002', 'Laptop');

insert into public.network_memberships(user_id, status) values
('f1000000-0000-4000-8000-000000000001', 'active')
on conflict (user_id) do update set status = 'active';

-- Ein aktives Connect-Profil verlangt vollstaendige Angaben (Constraint aus
-- 20260903180000) - die Anzeige haengt daran.
insert into public.network_profiles(
  user_id, display_name, headline, bio, network_roles, status, published_at
) values (
  'f1000000-0000-4000-8000-000000000001', 'Person', 'Zugaenge im Klinikumfeld',
  'Arbeitet seit Jahren mit Kliniken und kennt die Einkaufsseite.',
  array['founder'], 'active', now()
)
on conflict (user_id) do update set status = 'active';

insert into public.network_listings(
  id, owner_user_id, direction, category, title, summary, status, published_at, expires_at
) values (
  'f2000000-0000-4000-8000-000000000001',
  'f1000000-0000-4000-8000-000000000001',
  'offering', 'expertise',
  'Zugang zu Kliniken',
  'Ich kenne Einkaufsleitungen in mehreren Universitätskliniken und kann dort vorstellen.',
  'active', now(), now() + interval '30 days'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select public.enqueue_ai_job('connect_resource_extraction', 'network_listings', 'f2000000-0000-4000-8000-000000000001');

-- Die Kennung der Aufgabe muss der Test festhalten, weil der Arbeiter sie
-- nicht abfragen kann - genauso wie im Betrieb, wo sie aus claim_ai_job kommt.
set local role postgres;
create temp table t_job as select id from public.ai_jobs limit 1;
grant select on t_job to authenticated;

-- Zurueck in die Rolle der Person: Als postgres wuerde die Zeilensicherheit
-- umgangen, und die folgenden Pruefungen wuerden das Gegenteil von dem zeigen,
-- was sie behaupten.
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- Niemand schreibt sich selbst einen Vorschlag
-- ---------------------------------------------------------------------------
-- Ein Eintrag mit origin='model' waere die Behauptung, ein Modell habe das
-- gesagt - und traeger der Beweislast waere niemand.
select extensions.throws_ok(
  $$insert into public.person_resources(user_id, kind, label, origin, status, evidence_quote, source_table, source_id)
    values ('f1000000-0000-4000-8000-000000000001','network','Investoren','model','confirmed','Ich kenne Einkaufsleitungen','network_listings','f2000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'nobody can write themselves a machine suggestion'
);

-- Selbst eintragen geht - und gilt sofort.
select extensions.lives_ok(
  $$insert into public.person_resources(user_id, kind, label)
    values ('f1000000-0000-4000-8000-000000000001','network','Kontakte in die Pharmaindustrie')$$,
  'entering something yourself works'
);

select extensions.is(
  (select status from public.person_resources where label = 'Kontakte in die Pharmaindustrie'),
  'confirmed',
  'and needs no confirmation - the person is the evidence'
);

-- Ein selbst eingetragener Eintrag braucht keinen Beleg, ein maschineller schon.
set local role postgres;
select extensions.throws_ok(
  $$insert into public.person_resources(user_id, kind, label, origin, status)
    values ('f1000000-0000-4000-8000-000000000001','network','Ohne Beleg','model','pending')$$,
  '23514',
  null,
  'a suggestion without evidence cannot exist'
);

-- ---------------------------------------------------------------------------
-- Der Arbeiter bekommt genau einen Text
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';

select extensions.is(
  (select count(*)::int from public.network_listings),
  0,
  'the worker has no access to the listings table'
);

select public.claim_ai_job();

select extensions.matches(
  public.get_ai_job_source_text((select id from t_job)),
  'Einkaufsleitungen',
  'but does get the one text its job is about'
);

-- ---------------------------------------------------------------------------
-- DIE WICHTIGSTE PRUEFUNG: die Datenbank prueft den Beleg
-- ---------------------------------------------------------------------------
-- Haelt auch dann, wenn der Prompt schlecht, das Modell schwach oder die
-- Anwendung fehlerhaft ist. Ein Modell, das etwas hinzudichtet, kann es nicht
-- belegen - und was es nicht belegen kann, kommt nicht hinein.
select extensions.is(
  public.insert_ai_resource_proposal(
    (select id from t_job),
    'network',
    'Investorennetzwerk im Deep-Tech-Bereich',
    'Ich kenne Investoren im Deep-Tech-Bereich und kann dort vorstellen.',
    'qwen3.5:4b', 1::smallint
  ),
  false,
  'an invented quote is refused by the database'
);

select extensions.is(
  public.insert_ai_resource_proposal(
    (select id from t_job),
    'network',
    'Einkaufsleitungen in Universitätskliniken',
    'Ich   kenne Einkaufsleitungen in mehreren
Universitätskliniken',
    'qwen3.5:4b', 1::smallint
  ),
  true,
  'a real quote is accepted, whitespace may differ'
);

select extensions.is(
  public.insert_ai_resource_proposal(
    (select id from t_job),
    'network', 'Zu kurz', 'Kliniken', 'qwen3.5:4b', 1::smallint
  ),
  false,
  'a single word is not evidence'
);

-- ---------------------------------------------------------------------------
-- Der Vorschlag gehoert der Person, deren Text gelesen wurde
-- ---------------------------------------------------------------------------
set local role postgres;
select extensions.is(
  (select user_id from public.person_resources where origin = 'model'),
  'f1000000-0000-4000-8000-000000000001'::uuid,
  'the worker cannot choose whom it attributes something to'
);

select extensions.is(
  (select status from public.person_resources where origin = 'model'),
  'pending',
  'and nothing counts before a person has agreed'
);

-- ---------------------------------------------------------------------------
-- Niemand sieht die Vorschlaege anderer
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  (select count(*)::int from public.person_resources),
  0,
  'not even the worker sees what it proposed'
);

-- ---------------------------------------------------------------------------
-- Zurueckgezogen heisst: wird nicht mehr ausgewertet
-- ---------------------------------------------------------------------------
set local role postgres;
update public.network_listings set status = 'draft' where id = 'f2000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.is(
  public.get_ai_job_source_text((select id from t_job)),
  null,
  'a withdrawn text is no longer handed out'
);

set local role postgres;
select extensions.is(
  (select count(*)::int from public.person_resources where user_id = 'f1000000-0000-4000-8000-000000000001'),
  2,
  'what was already proposed stays - it was published at the time'
);

select * from extensions.finish();
rollback;
