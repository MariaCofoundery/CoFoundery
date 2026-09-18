begin;
select plan(4);

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

select * from finish();
rollback;
