\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(32);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select '00000000-0000-0000-0000-000000000000', ('f5500000-0000-4000-8000-00000000000' || n)::uuid, 'authenticated', 'authenticated', 'bl' || n || '@example.com', '', now(), '{}', '{}', now(), now() from generate_series(1, 2) n;
insert into public.platform_admins (user_id) values ('f5500000-0000-4000-8000-000000000001');
create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated, anon;

-- Nicht-Admin: nichts.
set local role authenticated;
set local request.jwt.claims = '{"sub":"f5500000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select * from public.admin_list_blog_posts()$$, '42501', 'admin_required', 'members cannot list posts');
select extensions.throws_ok($$select public.admin_save_blog_post(null, '{}'::jsonb)$$, '42501', 'admin_required', 'members cannot write posts');
select extensions.throws_ok($$select * from public.blog_posts$$, '42501', null, 'the table is closed to clients');

-- Admin legt an.
set local request.jwt.claims = '{"sub":"f5500000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids select 'p1', public.admin_save_blog_post(null, '{"slug":"drei-fragen","language":"de","translation_key":"three-questions","title":"Drei Fragen","excerpt":"Kurz.","author_name":"Maria","blocks":[{"type":"text","text":"# Hallo"},{"type":"image","path":"a.jpg","alt":""}]}'::jsonb);
select extensions.is((select status from public.admin_get_blog_post((select v from ids where k = 'p1'))), 'draft', 'a new post is a draft');
select extensions.throws_ok($$select public.admin_save_blog_post(null, '{"slug":"drei-fragen"}'::jsonb)$$, '23505', null, 'slugs are unique');
select extensions.throws_ok($$select public.admin_save_blog_post(null, '{"slug":"Gross Schreibung"}'::jsonb)$$, '23514', null, 'slugs must be clean');
select extensions.throws_ok($$select public.admin_save_blog_post(null, '{"slug":"abc-def","language":"fr"}'::jsonb)$$, '23514', null, 'only de and en');
select extensions.throws_ok($$select public.admin_set_blog_status((select v from ids where k = 'p1'), 'published')$$, '55000', 'blog_not_approved', 'nothing is published without approval');
select extensions.throws_ok($$select public.admin_set_blog_status((select v from ids where k = 'p1'), 'approved')$$, '23514', 'blog_alt', 'an image without alt text blocks the approval');
select extensions.ok(public.admin_save_blog_post((select v from ids where k = 'p1'), '{"blocks":[{"type":"text","text":"# Hallo"},{"type":"image","path":"a.jpg","alt":"Zwei Menschen am Tisch"},{"type":"button","label":"Zu Made2Found","href":"/"}]}'::jsonb) is not null, 'a draft can be changed');
select extensions.is(public.admin_set_blog_status((select v from ids where k = 'p1'), 'approved'), 'approved', 'a complete draft can be approved');
select extensions.throws_ok($$select public.admin_save_blog_post((select v from ids where k = 'p1'), '{"title":"Neu"}'::jsonb)$$, '55000', 'blog_locked', 'an approved post is locked');

-- Oeffentlich sieht man vor dem Veroeffentlichen nichts.
reset role;
set local role anon;
select extensions.is((select count(*)::int from public.public_list_blog_posts(null)), 0, 'an approved post is not public');
select extensions.is((select count(*)::int from public.public_get_blog_post('drei-fragen')), 0, 'and not readable by slug');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f5500000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.admin_set_blog_status((select v from ids where k = 'p1'), 'published'), 'published', 'an approved post can be published');
reset role;
set local role anon;
select extensions.is((select count(*)::int from public.public_list_blog_posts('de')), 1, 'a published post is listed for everybody');
select extensions.is((select count(*)::int from public.public_list_blog_posts('en')), 0, 'by language');
select extensions.is((select title from public.public_get_blog_post('drei-fragen')), 'Drei Fragen', 'and readable by slug');

-- Zwei Buttons: nicht erlaubt; Uebersetzung wird verlinkt, solange veroeffentlicht.
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f5500000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids select 'p2', public.admin_save_blog_post(null, '{"slug":"three-questions","language":"en","translation_key":"three-questions","title":"Three questions","excerpt":"Short.","author_name":"Maria","blocks":[{"type":"text","text":"Hi"},{"type":"button","label":"a","href":"/"},{"type":"button","label":"b","href":"/"}]}'::jsonb);
select extensions.throws_ok($$select public.admin_set_blog_status((select v from ids where k = 'p2'), 'approved')$$, '23514', 'blog_cta', 'only one call to action, at the end');
select extensions.is((select jsonb_array_length(translations) from public.public_get_blog_post('drei-fragen')), 0, 'an unpublished translation is not linked');
reset role;

-- Kategorien, Suchangaben, Newsletter-Hinweis.
set local role authenticated;
set local request.jwt.claims = '{"sub":"f5500000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is((select count(*)::int from public.admin_list_blog_categories()), 5, 'the five starter categories exist');
select extensions.throws_ok($$select public.admin_save_blog_post(null, '{"slug":"kategorie"}'::jsonb)$$, '23514', null, 'a post cannot take the category address');
select extensions.throws_ok($$select public.admin_save_blog_post(null, ('{"slug":"zu-lang-seo","seo_title":"' || repeat('x', 71) || '"}')::jsonb)$$, '23514', null, 'the search title is limited');
select extensions.ok(public.admin_save_blog_post((select v from ids where k = 'p2'), ('{"category_id":"' || (select id from public.admin_list_blog_categories() where slug = 'zu-zweit-gruenden') || '","blocks":[{"type":"text","text":"Hi"},{"type":"newsletter"},{"type":"newsletter"}]}')::jsonb) is not null, 'a draft takes a category');
select extensions.throws_ok($$select public.admin_set_blog_status((select v from ids where k = 'p2'), 'approved')$$, '23514', 'blog_newsletter', 'only one newsletter hint per post');
select extensions.throws_ok($$select public.admin_delete_blog_category((select id from public.admin_list_blog_categories() where slug = 'zu-zweit-gruenden'))$$, '55000', 'blog_category_in_use', 'a category in use cannot be deleted');
reset role;
update public.blog_posts set category_id = (select id from public.blog_categories where slug = 'erfahrungen') where slug = 'drei-fragen';
set local role anon;
select extensions.is((select string_agg(slug, ',') from public.public_list_blog_categories('de')), 'erfahrungen', 'only categories with a published post in the language show');
select extensions.is((select count(*)::int from public.public_list_blog_categories('en')), 0, 'and none in English without an English post');
reset role;

-- Das Herz zaehlt neue Newsletter-Anmeldungen bis zum Blick in den Newsletter-Admin.
insert into public.newsletter_subscriptions (user_id, status, source, confirmed_at) values ('f5500000-0000-4000-8000-000000000002', 'confirmed', 'settings', now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"f5500000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.is(public.admin_attention_count(), 1, 'a new newsletter signup lights the heart');
select extensions.ok(public.admin_mark_newsletter_seen(), 'looking at the newsletter admin marks it seen');
select extensions.is(public.admin_attention_count(), 0, 'and the heart goes out again');
select extensions.is((select confirmed_week from public.admin_newsletter_stats()), 1::bigint, 'the stats count this week');
reset role;

select * from extensions.finish();
rollback;
