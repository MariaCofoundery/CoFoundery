\set ON_ERROR_STOP on

begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

select extensions.has_column('public', 'connect_suggestions', 'seen_at', 'Vorschlaege tragen seen_at');
select extensions.col_is_null('public', 'connect_suggestions', 'seen_at', 'seen_at darf leer sein: leer heisst neu');
select extensions.col_hasnt_default('public', 'connect_suggestions', 'seen_at', 'neue Vorschlaege haben keinen Standardwert: sie sind neu');
select extensions.has_index('public', 'connect_suggestions', 'connect_suggestions_unseen_idx', 'ein Index fuer die Zahl in der Navigation');
select extensions.col_type_is('public', 'connect_suggestions', 'seen_at', 'timestamp with time zone', 'seen_at ist ein Zeitpunkt');

select extensions.has_function('public', 'mark_connect_suggestions_seen', array[]::text[], 'die Funktion zum Markieren existiert');
select extensions.ok(
  not has_function_privilege('anon', 'public.mark_connect_suggestions_seen()', 'execute'),
  'ohne Anmeldung kann niemand markieren'
);

select * from extensions.finish();
rollback;
