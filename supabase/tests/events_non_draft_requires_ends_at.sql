\set ON_ERROR_STOP on

-- Nicht-Draft-Events brauchen ein Ende (Migration 20261125120000).

begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

select extensions.ok(
  (select convalidated and pg_get_constraintdef(oid) = 'CHECK (((status = ''draft''::text) OR (ends_at IS NOT NULL)))'
   from pg_constraint
   where conrelid = 'public.events'::regclass and conname = 'events_non_draft_requires_ends_at'),
  'Constraint existiert, ist validiert und prüft status = draft oder ends_at gesetzt'
);
select extensions.is(
  (select pg_get_constraintdef(oid) from pg_constraint
   where conrelid = 'public.events'::regclass and conname = 'events_status_check'),
  'CHECK ((status = ANY (ARRAY[''draft''::text, ''live''::text, ''closed''::text])))',
  'zulässige Status bleiben draft, live, closed'
);

-- Erlaubt
select extensions.lives_ok(
  $$insert into public.events (slug, name, status, ends_at) values ('retention-draft-open', 'Draft ohne Ende', 'draft', null)$$,
  'draft + ends_at NULL ist erlaubt'
);
select extensions.lives_ok(
  $$insert into public.events (slug, name, status, ends_at) values ('retention-draft-end', 'Draft mit Ende', 'draft', now() + interval '1 day')$$,
  'draft + ends_at gesetzt ist erlaubt'
);
select extensions.lives_ok(
  $$insert into public.events (slug, name, status, ends_at) values ('retention-live-end', 'Live mit Ende', 'live', now() + interval '1 day')$$,
  'live + ends_at gesetzt ist erlaubt'
);
select extensions.lives_ok(
  $$insert into public.events (slug, name, status, ends_at) values ('retention-closed-end', 'Closed mit Ende', 'closed', now() - interval '1 day')$$,
  'closed + ends_at gesetzt ist erlaubt'
);

-- Abgelehnt
select extensions.throws_ok(
  $$insert into public.events (slug, name, status, ends_at) values ('retention-live-open', 'Live ohne Ende', 'live', null)$$,
  '23514', null,
  'live + ends_at NULL wird abgelehnt'
);
select extensions.throws_ok(
  $$insert into public.events (slug, name, status, ends_at) values ('retention-closed-open', 'Closed ohne Ende', 'closed', null)$$,
  '23514', null,
  'closed + ends_at NULL wird abgelehnt'
);

-- Auch nachträgliche Änderungen können die Regel nicht umgehen
select extensions.throws_ok(
  $$update public.events set status = 'live' where slug = 'retention-draft-open'$$,
  '23514', null,
  'draft ohne Ende kann nicht auf live gesetzt werden'
);
select extensions.throws_ok(
  $$update public.events set ends_at = null where slug = 'retention-live-end'$$,
  '23514', null,
  'einem live-Event kann das Ende nicht entzogen werden'
);

-- Die Löschlogik bleibt unverändert und funktioniert mit der Regel
insert into public.events (slug, name, status, ends_at)
values ('retention-live-ended', 'Live, vorbei', 'live', now() - interval '2 days');
select extensions.lives_ok(
  $$select public.cleanup_expired_event_data()$$,
  'cleanup_expired_event_data läuft mit der Regel'
);
select extensions.is(
  (select status from public.events where slug = 'retention-live-ended'),
  'closed',
  'abgelaufene live-Events werden weiterhin geschlossen'
);

select * from extensions.finish();
rollback;
