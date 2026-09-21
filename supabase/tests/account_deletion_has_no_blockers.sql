begin;
select plan(8);

-- ---------------------------------------------------------------------------
-- Kein Verweis auf auth.users darf eine Loeschung verbieten
-- ---------------------------------------------------------------------------
--
-- Am 18.09.2026 schlug die Kontoloeschung fuer jeden fehl, der das Produkt
-- wirklich benutzt hatte. Nicht wegen eines Fehlers im Loeschcode, sondern
-- wegen acht Fremdschluesseln auf auth.users, die seit dem Schreiben der
-- Loeschung dazugekommen waren und ein Loeschen verbieten.
--
-- Diese Pruefung zaehlt deshalb NICHT die acht bekannten Faelle auf. Sie
-- verlangt, dass es gar keinen blockierenden Verweis gibt - sonst faengt sie
-- den naechsten nicht, und genau das ist hier die Fehlerart: Jede neue
-- Tabelle kann ihn zurueckbringen, ohne dass irgendwas auffaellt, bis jemand
-- loeschen will.
--
-- Erlaubt sind nur cascade (die Zeile geht mit) und set null (die Zeile bleibt
-- und verliert die Verknuepfung). 'a' = no action, 'r' = restrict - beide
-- blockieren. 'd' = set default waere ebenfalls keine bewusste Entscheidung.

select is(
  (select coalesce(string_agg(format('%s.%s (%s)', source_table.relname, source_column.attname,
     case constraint_row.confdeltype when 'a' then 'no action' when 'r' then 'restrict'
       when 'd' then 'set default' else constraint_row.confdeltype::text end), ', ' order by source_table.relname), '')
   from pg_constraint constraint_row
   join pg_class source_table on source_table.oid = constraint_row.conrelid
   join pg_namespace source_schema on source_schema.oid = source_table.relnamespace
   join pg_class target_table on target_table.oid = constraint_row.confrelid
   join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
   join pg_attribute source_column
     on source_column.attrelid = source_table.oid
    and source_column.attnum = constraint_row.conkey[1]
   where constraint_row.contype = 'f'
     and source_schema.nspname = 'public'
     and target_schema.nspname = 'auth'
     and target_table.relname = 'users'
     and constraint_row.confdeltype not in ('c', 'n')),
  '',
  'kein Verweis auf auth.users blockiert die Loeschung'
);

-- ---------------------------------------------------------------------------
-- Was bleibt, darf die Verknuepfung verlieren
-- ---------------------------------------------------------------------------
-- Ein "set null" auf einer not-null-Spalte waere ein Constraint-Fehler
-- mitten in der Loeschung - also derselbe Fehlschlag, nur an anderer Stelle.
select is(
  (select coalesce(string_agg(format('%s.%s', source_table.relname, source_column.attname), ', '), '')
   from pg_constraint constraint_row
   join pg_class source_table on source_table.oid = constraint_row.conrelid
   join pg_namespace source_schema on source_schema.oid = source_table.relnamespace
   join pg_class target_table on target_table.oid = constraint_row.confrelid
   join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
   join pg_attribute source_column
     on source_column.attrelid = source_table.oid
    and source_column.attnum = constraint_row.conkey[1]
   where constraint_row.contype = 'f'
     and source_schema.nspname = 'public'
     and target_schema.nspname = 'auth'
     and target_table.relname = 'users'
     and constraint_row.confdeltype = 'n'
     and source_column.attnotnull),
  '',
  'keine Spalte soll auf null gesetzt werden, die nicht null sein darf'
);

-- ---------------------------------------------------------------------------
-- Die Lab-Runden gehen mit
-- ---------------------------------------------------------------------------
select matches(
  (select routine_definition from information_schema.routines
   where routine_schema = 'public' and routine_name = 'delete_unlinked_personal_data_for_auth_user'),
  'delete from public.collaboration_experience_rounds',
  'eine gespielte Lab-Runde blockiert die Loeschung nicht mehr'
);

-- Der Trigger dazu muss VOR dem Loeschen laufen - danach gaebe es die Zeile
-- in auth.users nicht mehr, an der er haengt.
select is(
  (select action_timing from information_schema.triggers
   where event_object_schema = 'auth' and event_object_table = 'users'
     and trigger_name = 'trg_auth_users_delete_unlinked_personal_data'
   limit 1),
  'BEFORE',
  'er raeumt vor dem Loeschen auf, nicht danach'
);

-- ---------------------------------------------------------------------------
-- Und jetzt wirklich loeschen
-- ---------------------------------------------------------------------------
--
-- DAZUGEKOMMEN AM 21.09.2026. Die Faelle oben pruefen das SCHEMA - dass kein
-- Verweis blockieren KANN. Das ist die wichtigere Haelfte, weil sie den
-- naechsten Fremdschluessel faengt, den niemand bedacht hat.
--
-- Diese Haelfte prueft die andere Richtung: dass eine Loeschung mit echten
-- Verstrickungen tatsaechlich durchlaeuft. Dafuer wird eine Person gebaut, die
-- in allem drinsteckt, was am 21.09.2026 blockierte - eine Lab-Runde, die sie
-- angelegt hat, eine Teilnahme, eine Promptzuweisung auf sich, und ein
-- Workbook eines FREMDEN Teams, das sie zuletzt bearbeitet hat.
--
-- Der Grund fuer beide Haelften: Die Schema-Regel allein sagt nicht, dass der
-- Aufraeumcode noch stimmt; ein bestandener Loeschlauf allein sagt nicht, dass
-- die naechste Tabelle ihn nicht bricht.

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','ba000000-0000-4000-8000-00000000000a','authenticated','authenticated','geht@example.com','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','ba000000-0000-4000-8000-00000000000b','authenticated','authenticated','bleibt@example.com','',now(),'{}','{}',now(),now());

insert into public.founder_teams(id, name, team_context)
values ('bb000000-0000-4000-8000-00000000000a','Bleibt bestehen','pre_founder');
insert into public.founder_team_members(team_id, user_id) values
('bb000000-0000-4000-8000-00000000000a','ba000000-0000-4000-8000-00000000000a'),
('bb000000-0000-4000-8000-00000000000a','ba000000-0000-4000-8000-00000000000b');

-- Eine Runde, die die gehende Person angelegt hat, mit beiden als Teilnehmer.
insert into public.collaboration_experience_rounds(
  id, founder_team_id, experience_key, pack_key, pack_version,
  created_by_user_id, status, rotation_offset)
values ('bc000000-0000-4000-8000-00000000000a','bb000000-0000-4000-8000-00000000000a',
        'read_my_mind','easy_start',1,'ba000000-0000-4000-8000-00000000000a','forming',0);

insert into public.collaboration_experience_round_participants(round_id, founder_user_id, position) values
('bc000000-0000-4000-8000-00000000000a','ba000000-0000-4000-8000-00000000000a',1),
('bc000000-0000-4000-8000-00000000000a','ba000000-0000-4000-8000-00000000000b',2);

-- Ein Workbook eines fremden Teams: angelegt von der bleibenden Person,
-- zuletzt bearbeitet von der gehenden. Es darf die Loeschung ueberleben - die
-- Arbeit gehoert dem Team.
insert into public.invitations(id, inviter_user_id, invitee_email, token_hash, expires_at)
values ('bd000000-0000-4000-8000-00000000000a','ba000000-0000-4000-8000-00000000000b',
        'fremd@example.com','nur-fuer-diesen-test', now() + interval '30 days');

insert into public.founder_alignment_workbooks(invitation_id, team_context, payload, created_by, updated_by)
values ('bd000000-0000-4000-8000-00000000000a','pre_founder','{}'::jsonb,
        'ba000000-0000-4000-8000-00000000000b','ba000000-0000-4000-8000-00000000000a');

-- Eine Advisor-Einladung, die die gehende Person ausgesprochen hat.
insert into public.founder_alignment_workbook_advisors(invitation_id, advisor_name, requested_by)
values ('bd000000-0000-4000-8000-00000000000a','Eine Beratung','ba000000-0000-4000-8000-00000000000a');

select lives_ok(
  $$select public.delete_founder_account_data('ba000000-0000-4000-8000-00000000000a')$$,
  'eine Person mit Lab-Runde, Teilnahme und fremdem Workbook laesst sich loeschen'
);

select is(
  (select count(*)::int from auth.users where id = 'ba000000-0000-4000-8000-00000000000a'),
  0,
  'und sie ist danach wirklich weg'
);

-- Die Arbeit des Teams bleibt. Waere hier `cascade` gesetzt worden, waere das
-- Workbook der bleibenden Person mit verschwunden.
select is(
  (select count(*)::int from public.founder_alignment_workbooks
   where invitation_id = 'bd000000-0000-4000-8000-00000000000a'),
  1,
  'das Workbook des Teams ueberlebt die Loeschung eines Mitglieds'
);

-- Und die Runde ist mitgegangen, wie es die Produktentscheidung vom 28.08.2026
-- vorsieht.
select is(
  (select count(*)::int from public.collaboration_experience_rounds
   where id = 'bc000000-0000-4000-8000-00000000000a'),
  0,
  'die Lab-Runde der gehenden Person ist mitgegangen'
);

select * from finish();
rollback;
