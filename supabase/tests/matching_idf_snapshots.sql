\set ON_ERROR_STOP on

-- CONNECT-IDF-Snapshots (20261129120000): Korpus-Zugang, Ablage, Prüfung,
-- Unveränderlichkeit, Zugriff.

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(30);

-- Personen: A aktiv, B Profil pausiert, C Mitgliedschaft gesperrt
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','1df00000-0000-4000-8000-00000000000a','authenticated','authenticated','idf-a@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1df00000-0000-4000-8000-00000000000b','authenticated','authenticated','idf-b@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1df00000-0000-4000-8000-00000000000c','authenticated','authenticated','idf-c@example.invalid','',now(),'{}','{}',now(),now());

insert into public.network_memberships(user_id, status) values
('1df00000-0000-4000-8000-00000000000a','active'),
('1df00000-0000-4000-8000-00000000000b','active'),
('1df00000-0000-4000-8000-00000000000c','active')
on conflict (user_id) do update set status = excluded.status;

insert into public.network_profiles(user_id, display_name, headline, bio, network_roles, status, published_at) values
('1df00000-0000-4000-8000-00000000000a','Idf A','Headline A','Eine ausreichend lange Biografie fuer das Netzwerk.',array['founder'],'active',now()),
('1df00000-0000-4000-8000-00000000000b','Idf B','Headline B','Eine ausreichend lange Biografie fuer das Netzwerk.',array['founder'],'active',now()),
('1df00000-0000-4000-8000-00000000000c','Idf C','Headline C','Eine ausreichend lange Biografie fuer das Netzwerk.',array['founder'],'active',now());

-- Jeder Eintrag trägt ein eigenes Markerwort, damit sichtbar wird, welcher im Korpus landet.
insert into public.network_listings(owner_user_id,direction,category,title,summary,topics,status,published_at,expires_at) values
('1df00000-0000-4000-8000-00000000000a','seeking','expertise','Markeraktivsuche gesucht','Eine ausreichend lange Beschreibung fuer den Test.',array['Vertrieb'],'active',now()-interval '1 day',now()+interval '30 days'),
('1df00000-0000-4000-8000-00000000000a','offering','expertise','Markeraktivangebot frei','Eine ausreichend lange Beschreibung fuer den Test.',array['Vertrieb'],'active',now()-interval '1 day',now()+interval '30 days'),
('1df00000-0000-4000-8000-00000000000a','offering','expertise','Markerablauf bald','Eine ausreichend lange Beschreibung fuer den Test.','{}','active',now()-interval '1 day',now()+interval '1 day'),
('1df00000-0000-4000-8000-00000000000a','offering','expertise','Markerentwurf offen','Eine ausreichend lange Beschreibung fuer den Test.','{}','draft',null,null),
('1df00000-0000-4000-8000-00000000000a','offering','expertise','Markerpausiert halt','Eine ausreichend lange Beschreibung fuer den Test.','{}','paused',now()-interval '1 day',now()+interval '30 days'),
('1df00000-0000-4000-8000-00000000000a','offering','expertise','Markererledigt fertig','Eine ausreichend lange Beschreibung fuer den Test.','{}','completed',now()-interval '1 day',now()+interval '30 days'),
('1df00000-0000-4000-8000-00000000000b','offering','expertise','Markerprofilpause aus','Eine ausreichend lange Beschreibung fuer den Test.','{}','active',now()-interval '1 day',now()+interval '30 days'),
('1df00000-0000-4000-8000-00000000000c','offering','expertise','Markergesperrt raus','Eine ausreichend lange Beschreibung fuer den Test.','{}','active',now()-interval '1 day',now()+interval '30 days');

-- Erst nach dem Veröffentlichen pausieren bzw. sperren: Vorher ließe sich nichts veröffentlichen.
update public.network_profiles set status = 'paused' where user_id = '1df00000-0000-4000-8000-00000000000b';
update public.network_memberships set status = 'suspended' where user_id = '1df00000-0000-4000-8000-00000000000c';

insert into public.network_problems(author_user_id,title,description,author_intent,status,published_at) values
('1df00000-0000-4000-8000-00000000000a','Markerproblem offen','Eine ausreichend lange Beschreibung eines Problems.','observation','active',now());

create function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end;
$$;

create function pg_temp.corpus_has(marker text, as_of timestamptz default now()) returns boolean language sql as $$
  select exists (select 1 from public.connect_idf_corpus_documents(as_of) d where d.title ilike marker || '%');
$$;

-- ===========================================================================
-- 1. Korpus: nur matching-erlaubte CONNECT-Einträge
-- ===========================================================================
set local role service_role;
select extensions.ok(pg_temp.corpus_has('Markeraktivsuche'), 'aktives Gesuch zählt');
select extensions.ok(pg_temp.corpus_has('Markeraktivangebot'), 'aktives Angebot zählt (beide Richtungen sind Dokumente)');
select extensions.ok(pg_temp.corpus_has('Markerablauf'), 'noch nicht abgelaufen zählt');
select extensions.ok(not pg_temp.corpus_has('Markerablauf', now() + interval '2 days'), 'abgelaufen zum Stichtag zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markeraktivsuche', now() - interval '2 days'), 'vor der Veröffentlichung zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markerentwurf'), 'Entwurf zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markerpausiert'), 'pausierter Eintrag zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markererledigt'), 'erledigter Eintrag zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markerprofilpause'), 'Eintrag eines pausierten Profils zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markergesperrt'), 'Eintrag einer gesperrten Mitgliedschaft zählt nicht');
select extensions.ok(not pg_temp.corpus_has('Markerproblem'), 'Probleme sind keine Korpus-Dokumente');
select extensions.is(
  (select count(*)::integer from public.connect_idf_corpus_documents(now())), 3, 'genau drei Dokumente');
select extensions.is(
  (select proargnames from pg_proc where proname = 'connect_idf_corpus_documents'),
  array['p_as_of','title','summary','topics'], 'zurück kommen nur Titel, Beschreibung, Themen - keine IDs');
reset role;

delete from public.network_listings where owner_user_id = '1df00000-0000-4000-8000-00000000000a' and title like 'Markeraktivsuche%';
select extensions.ok(not pg_temp.corpus_has('Markeraktivsuche'), 'gelöschter Eintrag zählt nicht');

-- ===========================================================================
-- 2. Zugriff: nur service_role
-- ===========================================================================
select pg_temp.as_user('1df00000-0000-4000-8000-00000000000a');
set local role authenticated;
select extensions.throws_ok($$select * from public.connect_idf_corpus_documents(now())$$, '42501', null, 'angemeldete Person kann den Korpus nicht abrufen');
select extensions.throws_ok($$select * from public.matching_idf_snapshots$$, '42501', null, 'angemeldete Person liest keine Snapshots');
reset role;
set local role anon;
select extensions.throws_ok($$select * from public.connect_idf_corpus_documents(now())$$, '42501', null, 'anon kann den Korpus nicht abrufen');
select extensions.throws_ok($$select * from public.matching_idf_snapshots$$, '42501', null, 'anon liest keine Snapshots');
reset role;

-- ===========================================================================
-- 3. Ablage: Hash und Version prüft die Datenbank selbst
-- ===========================================================================
-- Testvektor aus web/src/lib/matching/v01/idf.ts:
--   {"df":{"alpha":2,"beta1":1,"vertrieb":3},"n":3} -> 213bb182…
set local role service_role;
select extensions.lives_ok($$
  insert into public.matching_idf_snapshots(idf_corpus_version,scope,matching_version,normalization_version,corpus_as_of,document_count,document_frequencies,sha256)
  values ('connect-idf-matching-v0.1-20261014-213bb182','connect','matching-v0.1','matching-normalization-v0.1','2026-10-14T09:00:00Z',3,
          '{"vertrieb":3,"alpha":2,"beta1":1}','213bb18240fea64f68ebdbc837e5211dafb37daf3fe0f7e20d020e07dd927fe8')
$$, 'gültiger Snapshot: Hash wie in TypeScript, Schlüsselreihenfolge egal');
select extensions.lives_ok($$
  insert into public.matching_idf_snapshots(idf_corpus_version,scope,matching_version,normalization_version,corpus_as_of,document_count,document_frequencies,sha256)
  values ('connect-idf-matching-v0.1-20261014-619162dc','connect','matching-v0.1','matching-normalization-v0.1','2026-10-14T09:00:00Z',0,
          '{}','619162dcb218f35a16fc56d89434d155ec9a890ff94a5a61ecbf03ef8cab1fa4')
$$, 'leerer Korpus ist ein gültiger Snapshot');
select extensions.throws_ok($$
  insert into public.matching_idf_snapshots(idf_corpus_version,scope,matching_version,normalization_version,corpus_as_of,document_count,document_frequencies,sha256)
  values ('connect-idf-matching-v0.1-20261014-213bb182','connect','matching-v0.1','matching-normalization-v0.1','2026-10-14T09:00:00Z',4,
          '{"vertrieb":3,"alpha":2,"beta1":1}','213bb18240fea64f68ebdbc837e5211dafb37daf3fe0f7e20d020e07dd927fe8')
$$, '23514', 'matching_idf_snapshot_hash_mismatch', 'anderes N bei gleichem Hash wird abgelehnt');
select extensions.throws_ok($$
  insert into public.matching_idf_snapshots(idf_corpus_version,scope,matching_version,normalization_version,corpus_as_of,document_count,document_frequencies,sha256)
  values ('connect-idf-matching-v0.1-20261015-213bb182','connect','matching-v0.1','matching-normalization-v0.1','2026-10-14T09:00:00Z',3,
          '{"vertrieb":3,"alpha":2,"beta1":1}','213bb18240fea64f68ebdbc837e5211dafb37daf3fe0f7e20d020e07dd927fe8')
$$, '23514', 'matching_idf_snapshot_version_invalid', 'Version mit falschem Datum wird abgelehnt');
select extensions.throws_ok($$
  insert into public.matching_idf_snapshots(idf_corpus_version,scope,matching_version,normalization_version,corpus_as_of,document_count,document_frequencies,sha256)
  values ('connect-idf-matching-v0.1-20261014-xxxx','connect','matching-v0.1','matching-normalization-v0.1','2026-10-14T09:00:00Z',1,
          '{"Max Mustermann":1}','213bb18240fea64f68ebdbc837e5211dafb37daf3fe0f7e20d020e07dd927fe8')
$$, '23514', 'matching_idf_snapshot_df_invalid', 'Rohtext statt normalisiertem Token wird abgelehnt');
select extensions.throws_ok($$
  insert into public.matching_idf_snapshots(idf_corpus_version,scope,matching_version,normalization_version,corpus_as_of,document_count,document_frequencies,sha256)
  values ('connect-idf-matching-v0.1-20261014-xxxx','connect','matching-v0.1','matching-normalization-v0.1','2026-10-14T09:00:00Z',1,
          '{"alpha":2}','213bb18240fea64f68ebdbc837e5211dafb37daf3fe0f7e20d020e07dd927fe8')
$$, '23514', 'matching_idf_snapshot_df_invalid', 'df größer als N wird abgelehnt');

-- ===========================================================================
-- 4. Unveränderlich - auch für service_role und den Eigentümer
-- ===========================================================================
select extensions.throws_ok($$update public.matching_idf_snapshots set document_count = 9$$, '42501', null, 'service_role darf nicht ändern');
select extensions.throws_ok($$delete from public.matching_idf_snapshots$$, '42501', null, 'service_role darf nicht löschen');
reset role;
select extensions.throws_ok($$update public.matching_idf_snapshots set sha256 = repeat('0', 64)$$, '42501', 'matching_idf_snapshot_is_immutable', 'auch der Eigentümer ändert nichts');
select extensions.throws_ok($$delete from public.matching_idf_snapshots$$, '42501', 'matching_idf_snapshot_is_immutable', 'auch der Eigentümer löscht nichts');
select extensions.throws_ok($$truncate public.matching_idf_snapshots$$, '42501', 'matching_idf_snapshot_is_immutable', 'auch TRUNCATE ist gesperrt');
select extensions.is((select count(*)::integer from public.matching_idf_snapshots), 2, 'beide Snapshots unverändert vorhanden');

select * from extensions.finish();
rollback;
