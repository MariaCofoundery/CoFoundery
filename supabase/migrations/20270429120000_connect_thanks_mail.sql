-- Connect Stufe 1: auch eine Mail (und Push), wenn sich jemand bedankt hat.
--
-- Der Hinweis in der App entsteht schon per Trigger (20270424). Mail und Push kommen ueber denselben Anspruch wie alle Netzwerk-
-- Benachrichtigungen: hoechstens einmal je Dank, nur wer die Art nicht abbestellt hat, nur fuer aktive Mitglieder. Die Mail nennt den
-- Vornamen der dankenden Person und sonst nichts - nie die Worte des Danks.
begin;

alter table public.network_notification_claims drop constraint network_notification_claims_kind_check;
alter table public.network_notification_claims add constraint network_notification_claims_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'message',
  'discovery_intro_request', 'discovery_intro_accepted', 'connect_thanks'
));

alter table public.notification_opt_outs drop constraint notification_opt_outs_kind_check;
alter table public.notification_opt_outs add constraint notification_opt_outs_kind_check
  check (kind in (
    'contact_request', 'message', 'problem_interest', 'connect_saved_search', 'discovery_saved_search',
    'read_my_mind', 'founder_in_the_wild', 'discovery_intro_request', 'discovery_intro_accepted',
    'connect_suggestions', 'team_check_in', 'program_update', 'org_tasks', 'org_chat', 'connect_thanks'
  ));

-- Dienst: die Danks der letzten 7 Tage, zu denen noch keine Mail gestempelt ist. Stempelt, BEVOR gesendet wird (hoechstens einmal je Dank).
-- Wer die Art abbestellt hat oder nicht mehr aktiv ist, wird nicht gestempelt und nicht beliefert.
create or replace function public.prepare_thanks_notifications(p_limit integer default 20)
returns table (thanks_id uuid, recipient_user_id uuid, thanker_first_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  return query
    with candidates as (
      select t.id, t.helper_user_id, t.thanker_user_id
      from public.network_thanks t
      where t.created_at > pg_catalog.now() - interval '7 days'
        and not exists (select 1 from public.network_notification_claims c where c.kind = 'connect_thanks' and c.subject_id = t.id and c.recipient_user_id = t.helper_user_id)
        and public.wants_email_notification(t.helper_user_id, 'connect_thanks')
        and exists (select 1 from public.network_memberships m where m.user_id = t.helper_user_id and m.status = 'active')
      order by t.created_at
      limit greatest(least(p_limit, 100), 1)
    ), stamped as (
      insert into public.network_notification_claims (kind, subject_id, recipient_user_id)
      select 'connect_thanks', c.id, c.helper_user_id from candidates c
      on conflict do nothing
      returning subject_id, recipient_user_id
    )
    select s.subject_id, s.recipient_user_id,
           coalesce(nullif(pg_catalog.split_part(pg_catalog.btrim(p.display_name), ' ', 1), ''), '')
    from stamped s
    join candidates c on c.id = s.subject_id
    left join public.network_profiles p on p.user_id = c.thanker_user_id;
end;
$$;
revoke all on function public.prepare_thanks_notifications(integer) from public, anon, authenticated;
grant execute on function public.prepare_thanks_notifications(integer) to service_role;

commit;
