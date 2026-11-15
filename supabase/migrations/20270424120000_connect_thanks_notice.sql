-- Connect Stufe 1: Hinweis, wenn sich jemand bedankt hat.
--
-- Entsteht in der Datenbank (wie bei den Programm-Aufgaben), nicht ueber die App: Wer Danke sagt, loest den Hinweis fuer die andere
-- Person aus, ohne dass die App daran denken muss. Der Hinweis enthaelt keinen Text, nur Art, Vorgang und Pfad - die Worte entstehen
-- beim Anzeigen in der Sprache der Leserin. Keine Mail: Das Danke wartet auf der Kontakte-Seite, ohne Druck.
begin;

alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'discovery_intro_request',
  'discovery_intro_accepted', 'read_my_mind_handoff', 'founder_in_the_wild_handoff',
  'collaboration_conversation_marker', 'program_update_due', 'program_invited',
  'program_review_requested', 'program_removed', 'program_reward_unlocked',
  'org_task_assigned', 'org_task_comment', 'org_task_due',
  'advisor_org_invited', 'advisor_person_invited', 'founder_invited',
  'program_task_assigned', 'program_task_comment', 'connect_thanks'
));

create or replace function public.on_network_thanks_notice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  values (new.helper_user_id, new.thanker_user_id, 'connect_thanks', new.id, '/connect/contacts')
  on conflict (recipient_user_id, kind, subject_id) do nothing;
  return null;
end;
$$;
revoke all on function public.on_network_thanks_notice() from public, anon, authenticated;
create trigger on_network_thanks_notice after insert on public.network_thanks
  for each row execute function public.on_network_thanks_notice();

-- Wird ein Dank mit der Anfrage geloescht, geht auch sein Hinweis.
create or replace function public.drop_network_thanks_notice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.in_app_notices where kind = 'connect_thanks' and subject_id = old.id;
  return old;
end;
$$;
revoke all on function public.drop_network_thanks_notice() from public, anon, authenticated;
create trigger drop_network_thanks_notice before delete on public.network_thanks
  for each row execute function public.drop_network_thanks_notice();

commit;
