\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','f4600000-0000-4000-8000-000000000001','authenticated','authenticated','ev-admin@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','f4600000-0000-4000-8000-000000000002','authenticated','authenticated','ev-user@example.com','',now(),'{}','{}',now(),now());
insert into public.platform_admins (user_id) values ('f4600000-0000-4000-8000-000000000001');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub":"f4600000-0000-4000-8000-000000000002","role":"authenticated"}';
select extensions.throws_ok($$select * from public.admin_list_events()$$, '42501', 'admin_required', 'members cannot list events');
select extensions.throws_ok($$select public.admin_save_event(null, 'abc', 'Name', 'draft', null, null)$$, '42501', 'admin_required', 'members cannot create events');

set local request.jwt.claims = '{"sub":"f4600000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into ids select 'e1', public.admin_save_event(null, ' Gruendungsabend-Leipzig ', 'Gründungsabend Leipzig', 'draft', null, null);
select extensions.is((select slug from public.admin_list_events() limit 1), 'gruendungsabend-leipzig', 'the slug is cleaned: trimmed and lower case');
select extensions.throws_ok($$select public.admin_save_event(null, 'Mit Leerzeichen', 'Name', 'draft', null, null)$$, '22023', 'event_slug_invalid', 'a slug has only letters, digits and hyphens');
select extensions.throws_ok($$select public.admin_save_event(null, 'gruendungsabend-leipzig', 'Anderer', 'draft', null, null)$$, '23505', 'event_slug_taken', 'a slug is unique');
select extensions.throws_ok($$select public.admin_save_event(null, 'live-ohne-ende', 'Name', 'live', null, null)$$, '23514', 'event_end_required', 'only drafts may have no end');
select extensions.throws_ok($$select public.admin_save_event(null, 'rueckwaerts', 'Name', 'draft', now(), now() - interval '1 day')$$, '22023', 'event_time_invalid', 'the end cannot be before the start');
select extensions.ok(public.admin_save_event((select v from ids where k = 'e1'), 'gruendungsabend-leipzig', 'Gründungsabend Leipzig', 'live', now(), now() + interval '3 hours') is not null, 'an event can be edited and set live with an end');

-- Oeffentlicher Name.
set local role anon;
select extensions.is(public.get_public_event_name('Gruendungsabend-Leipzig'), 'Gründungsabend Leipzig', 'anyone can read just the name, case-insensitive');
select extensions.is(public.get_public_event_name('gibt-es-nicht'), null, 'an unknown event gives nothing');

-- Loeschen nur ohne Teilnahmen.
reset role;
insert into public.event_participants(event_id, display_name, email, participant_token) values ((select v from ids where k = 'e1'), 'Mara', 'mara@example.com', 'tok-test-1');
set local role authenticated;
set local request.jwt.claims = '{"sub":"f4600000-0000-4000-8000-000000000001","role":"authenticated"}';
select extensions.throws_ok($$select public.admin_delete_event((select v from ids where k = 'e1'))$$, '23503', 'event_has_participants', 'an event with participants cannot be deleted');

select * from extensions.finish();
rollback;
