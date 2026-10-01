\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

-- „Damit bin ich fuer jetzt durch." Eine Zeile, ein Zeitpunkt, und sonst
-- nichts. Dieser Test haelt genau das fest - und dass niemand die Notiz eines
-- anderen Menschen sieht oder setzt.

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','a9000000-0000-4000-8000-000000000001','authenticated','authenticated','mark-a@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','a9000000-0000-4000-8000-000000000002','authenticated','authenticated','mark-b@example.com','',now(),'{}','{}',now(),now());

-- ---------------------------------------------------------------------------
-- 1. Die Tabelle traegt keinen Status und keinen Fortschritt
-- ---------------------------------------------------------------------------
--
-- Alles andere ist aus den Fachtabellen ableitbar, und was ableitbar ist,
-- wird nicht gespeichert: Zwei Wahrheiten ueber denselben Zustand laufen
-- auseinander.
select extensions.set_eq(
  $$select column_name::text from information_schema.columns
      where table_schema='public' and table_name='person_section_marks'$$,
  $$values ('user_id'),('section'),('marked_at')$$,
  'die Tabelle hat genau drei Spalten - kein Status, kein Zaehlwert, kein updated_at'
);

select extensions.has_pk('public', 'person_section_marks',
  'eine Person kann einen Bereich nicht zweimal markieren');

-- ---------------------------------------------------------------------------
-- 2. Eigene Zeilen, und nur die eigenen
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.person_section_marks(user_id, section) values
('a9000000-0000-4000-8000-000000000001','staerken');

select extensions.is(
  (select count(*)::int from public.person_section_marks),
  1,
  'die eigene Markierung ist da'
);

-- Erneut setzen ist kein Fehler und kein zweiter Eintrag: Eine vorhandene
-- Zeile sagt bereits, was eine zweite sagen wuerde.
insert into public.person_section_marks(user_id, section) values
('a9000000-0000-4000-8000-000000000001','staerken')
on conflict (user_id, section) do nothing;

select extensions.is(
  (select count(*)::int from public.person_section_marks),
  1,
  'zweimal markieren ergibt eine Zeile'
);

-- Fuer einen anderen Menschen markieren: abgewiesen.
select extensions.throws_ok(
  $$insert into public.person_section_marks(user_id, section)
      values ('a9000000-0000-4000-8000-000000000002','staerken')$$,
  '42501',
  null,
  'niemand markiert fuer jemand anderen'
);

-- ---------------------------------------------------------------------------
-- 3. Die Notiz des anderen ist unsichtbar
-- ---------------------------------------------------------------------------
set local role postgres;
insert into public.person_section_marks(user_id, section) values
('a9000000-0000-4000-8000-000000000002','ressourcen');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select extensions.is(
  (select count(*)::int from public.person_section_marks),
  1,
  'die Markierung des anderen Menschen ist nicht zu sehen'
);

select extensions.is(
  (select count(*)::int from public.person_section_marks
     where user_id = 'a9000000-0000-4000-8000-000000000002'),
  0,
  'auch nicht, wenn man gezielt danach fragt'
);

-- Und sie laesst sich nicht loeschen.
delete from public.person_section_marks where user_id = 'a9000000-0000-4000-8000-000000000002';
set local role postgres;
select extensions.is(
  (select count(*)::int from public.person_section_marks
     where user_id = 'a9000000-0000-4000-8000-000000000002'),
  1,
  'die fremde Markierung steht noch'
);

-- ---------------------------------------------------------------------------
-- 4. Zuruecknehmen heisst loeschen
-- ---------------------------------------------------------------------------
--
-- Es gibt keinen „aufgehobenen" Zustand: Eine Zeile bedeutet genau eine
-- Sache, und wer sie nicht mehr meint, hat keine.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

delete from public.person_section_marks
  where user_id = 'a9000000-0000-4000-8000-000000000001' and section = 'staerken';

select extensions.is(
  (select count(*)::int from public.person_section_marks),
  0,
  'zurueckgenommen heisst weg'
);

-- ---------------------------------------------------------------------------
-- 5. Es gibt nichts zu aendern
-- ---------------------------------------------------------------------------
--
-- Kein UPDATE in der Zeilensicherheit, und das ist Absicht: Die Zeile hat
-- ausser ihrem Schluessel nur den Zeitpunkt. Eine Policy, die nichts
-- erlaubt, was gebraucht wird, waere eine offene Tuer ohne Zweck.
insert into public.person_section_marks(user_id, section) values
('a9000000-0000-4000-8000-000000000001','faehigkeiten');

update public.person_section_marks set marked_at = now() - interval '1 day'
  where user_id = 'a9000000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::int from public.person_section_marks
     where user_id = 'a9000000-0000-4000-8000-000000000001'
       and marked_at < now() - interval '1 hour'),
  0,
  'der Zeitpunkt laesst sich nicht nachtraeglich verschieben'
);

-- ---------------------------------------------------------------------------
-- 6. Die Person geht, die Notiz geht mit
-- ---------------------------------------------------------------------------
set local role postgres;
delete from auth.users where id = 'a9000000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::int from public.person_section_marks
     where user_id = 'a9000000-0000-4000-8000-000000000001'),
  0,
  'mit dem Konto verschwindet die Markierung'
);

select * from extensions.finish();
rollback;
