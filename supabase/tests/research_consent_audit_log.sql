\set ON_ERROR_STOP on

-- Nachweis der Research-Einwilligung (Migration 20270129130000).

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(27);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000','ed111111-1111-4111-8111-111111111111','authenticated','authenticated','audit-a@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','ed222222-2222-4222-8222-222222222222','authenticated','authenticated','audit-b@example.com','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','ed333333-3333-4333-8333-333333333333','authenticated','authenticated','audit-legacy@example.com','',now(),'{}','{}',now(),now());

create function pg_temp.as_user(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Schema und Rechte
-- ---------------------------------------------------------------------------
select extensions.ok(to_regprocedure('public.set_my_research_consent(text)') is null,
  'die alte Signatur ohne Nachweis gibt es nicht mehr');
select extensions.ok(
  has_function_privilege('authenticated', 'public.set_my_research_consent(text, text, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.set_my_research_consent(text, text, text, text)', 'EXECUTE'),
  'angemeldete Personen dürfen entscheiden, anonyme nicht');
select extensions.ok(
  not has_table_privilege('authenticated', 'public.research_consent_audit_log', 'INSERT')
  and not has_table_privilege('authenticated', 'public.research_consent_audit_log', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.research_consent_audit_log', 'DELETE')
  and not has_table_privilege('anon', 'public.research_consent_audit_log', 'SELECT'),
  'den Nachweis schreibt nur die Funktion; anon liest nichts');
select extensions.ok(
  not has_table_privilege('authenticated', 'public.research_consent_copy_revisions', 'SELECT')
  and not has_table_privilege('authenticated', 'public.research_consent_copy_revisions', 'INSERT'),
  'die Referenztabelle der Textfassungen ist für Nutzer weder les- noch schreibbar');
select extensions.is(
  (select count(*)::integer from public.research_consent_copy_revisions where copy_revision = 'research_consent_copy_2026-10-14'),
  4,
  'Revision 2026-10-14 ist für DE/EN und Dialog/Einstellung registriert');

-- ---------------------------------------------------------------------------
-- Zustimmen, wiederholen, widerrufen, erneut zustimmen
-- ---------------------------------------------------------------------------
select pg_temp.as_user('ed111111-1111-4111-8111-111111111111');
set local role authenticated;
select * from public.set_my_research_consent('accepted', 'research_consent_copy_2026-10-14', 'de', 'notice');
reset role;

select extensions.is(
  (select row(action, semantic_consent_version, copy_revision, locale, surface)::text
   from public.research_consent_audit_log where user_id = 'ed111111-1111-4111-8111-111111111111'),
  row('accepted', 'research_consent_v1', 'research_consent_copy_2026-10-14', 'de', 'notice')::text,
  'Zustimmung erzeugt eine Audit-Zeile mit fachlicher Version, Textrevision, Sprache und Stelle');
select extensions.is(
  (select copy_sha256 from public.research_consent_audit_log where user_id = 'ed111111-1111-4111-8111-111111111111'),
  (select copy_sha256 from public.research_consent_copy_revisions
   where copy_revision = 'research_consent_copy_2026-10-14' and locale = 'de' and surface = 'notice'),
  'der Hash kommt aus der Referenztabelle');

-- Ein Forschungsereignis, das der Widerruf löschen muss
insert into public.research_events (event_name, subject_hash, research_consent_version)
select 'question_viewed', encode(extensions.digest(research_subject_id::text, 'sha256'), 'hex'), 'research_consent_v1'
from public.research_consent_preferences where user_id = 'ed111111-1111-4111-8111-111111111111';

select pg_temp.as_user('ed111111-1111-4111-8111-111111111111');
set local role authenticated;
select * from public.set_my_research_consent('accepted', 'research_consent_copy_2026-10-14', 'en', 'settings');
select * from public.set_my_research_consent('declined', 'research_consent_copy_2026-10-14', 'de', 'settings');
reset role;

select extensions.is(
  (select count(*)::integer from public.research_consent_audit_log where user_id = 'ed111111-1111-4111-8111-111111111111'),
  3,
  'wiederholte Entscheidungen bleiben als eigene Zeilen erhalten');
select extensions.ok(
  exists(select 1 from public.research_consent_audit_log
         where user_id = 'ed111111-1111-4111-8111-111111111111' and action = 'accepted' and locale = 'en' and surface = 'settings'),
  'die Sprache jeder Entscheidung wird einzeln gespeichert');
select extensions.ok(
  exists(select 1 from public.research_consent_audit_log
         where user_id = 'ed111111-1111-4111-8111-111111111111' and action = 'withdrawn'),
  'Ablehnen nach Zustimmung wird als Widerruf protokolliert');
select extensions.is(
  (select count(*)::integer from public.research_consent_preferences where user_id = 'ed111111-1111-4111-8111-111111111111'),
  1,
  'die Preference hält weiterhin nur den aktuellen Zustand');
select extensions.is(
  (select state from public.research_consent_preferences where user_id = 'ed111111-1111-4111-8111-111111111111'),
  'declined',
  'aktueller Zustand: abgelehnt');
select extensions.is(
  (select count(*)::integer from public.research_events re
   join public.research_consent_preferences p on re.subject_hash = encode(extensions.digest(p.research_subject_id::text, 'sha256'), 'hex')
   where p.user_id = 'ed111111-1111-4111-8111-111111111111'),
  0,
  'der Widerruf löscht die Forschungsereignisse wie bisher');

select pg_temp.as_user('ed111111-1111-4111-8111-111111111111');
set local role authenticated;
select * from public.set_my_research_consent('accepted', 'research_consent_copy_2026-10-14', 'de', 'notice');
reset role;
select extensions.is(
  (select count(*)::integer from public.research_consent_audit_log where user_id = 'ed111111-1111-4111-8111-111111111111'),
  4,
  'erneute Zustimmung nach Widerruf ergänzt die Historie');
select extensions.ok(
  (select bool_and(semantic_consent_version = 'research_consent_v1') from public.research_consent_audit_log),
  'die fachliche Version bleibt research_consent_v1');

-- Erstmalig ablehnen
select pg_temp.as_user('ed222222-2222-4222-8222-222222222222');
set local role authenticated;
select * from public.set_my_research_consent('declined', 'research_consent_copy_2026-10-14', 'en', 'notice');
reset role;
select extensions.is(
  (select action from public.research_consent_audit_log where user_id = 'ed222222-2222-4222-8222-222222222222'),
  'declined',
  'erstmaliges Ablehnen ist eine Ablehnung, kein Widerruf');

-- ---------------------------------------------------------------------------
-- Unbekannte Fassungen werden abgelehnt - ohne halben Zustand
-- ---------------------------------------------------------------------------
select pg_temp.as_user('ed222222-2222-4222-8222-222222222222');
set local role authenticated;
select extensions.throws_ok(
  $$select * from public.set_my_research_consent('accepted', 'research_consent_copy_1999-01-01', 'de', 'notice')$$,
  '22023', 'unknown_research_consent_copy', 'unbekannte Textrevision wird abgelehnt');
select extensions.throws_ok(
  $$select * from public.set_my_research_consent('accepted', 'research_consent_copy_2026-10-14', 'fr', 'notice')$$,
  '22023', 'unknown_research_consent_copy', 'unbekannte Sprache wird abgelehnt');
reset role;
select extensions.is(
  (select state from public.research_consent_preferences where user_id = 'ed222222-2222-4222-8222-222222222222'),
  'declined',
  'nach einem abgelehnten Aufruf bleibt der Zustand unverändert');

-- ---------------------------------------------------------------------------
-- Legacy: Entscheidung vor dem Nachweis
-- ---------------------------------------------------------------------------
insert into public.research_consent_preferences (user_id, state, accepted_at, updated_at)
values ('ed333333-3333-4333-8333-333333333333', 'accepted', now() - interval '20 days', now() - interval '20 days');
select extensions.lives_ok(
  $$insert into public.research_events (event_name, subject_hash, research_consent_version)
    select 'question_viewed', encode(extensions.digest(research_subject_id::text, 'sha256'), 'hex'), 'research_consent_v1'
    from public.research_consent_preferences where user_id = 'ed333333-3333-4333-8333-333333333333'$$,
  'eine alte Zustimmung ohne Nachweis bleibt funktionsfähig');
select extensions.is(
  (select count(*)::integer from public.research_consent_audit_log where user_id = 'ed333333-3333-4333-8333-333333333333'),
  0,
  'keine rückwirkende Zuordnung: alte Entscheidung hat keinen Audit-Eintrag');

-- ---------------------------------------------------------------------------
-- Nur anhängen, RLS
-- ---------------------------------------------------------------------------
select extensions.throws_ok(
  $$update public.research_consent_audit_log set locale = 'en' where user_id = 'ed111111-1111-4111-8111-111111111111'$$,
  '42501', 'research_consent_audit_log_is_append_only', 'Audit-Zeilen lassen sich nicht ändern');
select extensions.throws_ok(
  $$delete from public.research_consent_audit_log where user_id = 'ed111111-1111-4111-8111-111111111111'$$,
  '42501', 'research_consent_audit_log_is_append_only', 'Audit-Zeilen lassen sich nicht einzeln löschen');

select pg_temp.as_user('ed222222-2222-4222-8222-222222222222');
set local role authenticated;
select extensions.is(
  (select count(*)::integer from public.research_consent_audit_log),
  1,
  'jede Person sieht nur ihre eigenen Nachweise');
reset role;

-- ---------------------------------------------------------------------------
-- Kontolöschung
-- ---------------------------------------------------------------------------
delete from auth.users where id = 'ed111111-1111-4111-8111-111111111111';
select extensions.is(
  (select count(*)::integer from public.research_consent_audit_log where user_id = 'ed111111-1111-4111-8111-111111111111'),
  0,
  'mit dem Konto verschwinden auch die Nachweise');
select extensions.is(
  (select count(*)::integer from public.research_consent_preferences where user_id = 'ed111111-1111-4111-8111-111111111111'),
  0,
  'und der aktuelle Zustand');
select extensions.is(
  (select count(*)::integer from public.research_consent_audit_log where user_id = 'ed222222-2222-4222-8222-222222222222'),
  1,
  'Nachweise anderer Personen bleiben unberührt');

select * from extensions.finish();
rollback;
