-- Hinweis im Tool bei Einladungen - fuer Menschen, die schon ein Konto haben.
--
-- Wunsch von Maria (06.11.2026): "Wenn ich eine Einladung bekomme und schon im Tool bin, egal in welche Richtung,
-- dann waere es super, dazu auch eine Nachricht im Tool zu bekommen."
--
-- Drei Einladungen bekommen einen Hinweis im Nachrichtensystem (in_app_notices), sobald es zu der Mail-Adresse der
-- Einladung ein Konto mit BESTAETIGTER Adresse gibt:
--   - advisor_org_invited:    Einladung in eine Organisation (Hinweis fuehrt auf /einladungen)
--   - advisor_person_invited: Bitte eines Advisors um Einblick (Hinweis fuehrt auf /einladungen)
--   - founder_invited:        Einladung von einer Mitgruenderin (Hinweis fuehrt auf /dashboard, dort steht sie schon)
-- Wer keins hat, bekommt wie bisher nur die Mail mit dem Link.
--
-- Die Zuordnung zur Adresse geschieht NUR in der Datenbank: Wer einlaedt, erfaehrt nicht, ob es ein Konto gibt.
-- Der Hinweis nennt nichts ausser der Art (der Text entsteht beim Anzeigen); Namen stehen auf /einladungen - und dort
-- nur, wenn die Adresse der Einladung zur bestaetigten Adresse der lesenden Person passt (list_my_invites).
-- Er verschwindet, sobald die Einladung angenommen, abgelehnt, zurueckgenommen oder abgelaufen ist.
--
-- Auf /einladungen laesst sich eine Einladung annehmen oder ablehnen, ohne den Link aus der Mail: claim_*_by_id loest
-- ueber die Kennung ein, prueft dieselbe Adresse wie beim Link und ruft dieselbe Funktion auf. Ablehnen setzt den
-- neuen Status 'declined' (die einladende Seite sieht "abgelehnt", nicht "zurueckgenommen").

begin;

alter table public.in_app_notices drop constraint in_app_notices_kind_check;
alter table public.in_app_notices add constraint in_app_notices_kind_check check (kind in (
  'contact_request', 'problem_interest', 'approach_interest', 'discovery_intro_request',
  'discovery_intro_accepted', 'read_my_mind_handoff', 'founder_in_the_wild_handoff',
  'collaboration_conversation_marker', 'program_update_due', 'program_invited',
  'program_review_requested', 'program_removed', 'program_reward_unlocked',
  'org_task_assigned', 'org_task_comment', 'org_task_due',
  'advisor_org_invited', 'advisor_person_invited', 'founder_invited'
));

alter table public.advisor_org_invites drop constraint advisor_org_invites_status_check;
alter table public.advisor_org_invites add constraint advisor_org_invites_status_check check (status in ('sent', 'claimed', 'revoked', 'declined'));
alter table public.advisor_person_invites drop constraint advisor_person_invites_status_check;
alter table public.advisor_person_invites add constraint advisor_person_invites_status_check check (status in ('sent', 'claimed', 'revoked', 'expired', 'declined'));

-- Ein Hinweis fuer die Person mit dieser (bestaetigten) Adresse.
create or replace function public.notify_invitee_by_email(p_email text, p_kind text, p_subject_id uuid, p_actor uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.in_app_notices (recipient_user_id, actor_user_id, kind, subject_id, path)
  select u.id, p_actor, p_kind, p_subject_id, p_path
  from auth.users u
  where lower(btrim(coalesce(u.email, ''))) = lower(btrim(p_email))
    and u.email_confirmed_at is not null
    and u.id is distinct from p_actor
  on conflict (recipient_user_id, kind, subject_id) do nothing;
end;
$$;
revoke all on function public.notify_invitee_by_email(text, text, uuid, uuid, text) from public, anon, authenticated;

create or replace function public.on_advisor_org_invite_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'sent' then
    perform public.notify_invitee_by_email(new.invitee_email, 'advisor_org_invited', new.id, new.invited_by_user_id, '/einladungen');
  end if;
  return new;
end;
$$;
revoke all on function public.on_advisor_org_invite_insert() from public, anon, authenticated;
create trigger on_advisor_org_invite_insert after insert on public.advisor_org_invites for each row execute function public.on_advisor_org_invite_insert();

create or replace function public.on_advisor_person_invite_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'sent' then
    perform public.notify_invitee_by_email(new.invitee_email, 'advisor_person_invited', new.id, new.advisor_user_id, '/einladungen');
  end if;
  return new;
end;
$$;
revoke all on function public.on_advisor_person_invite_insert() from public, anon, authenticated;
create trigger on_advisor_person_invite_insert after insert on public.advisor_person_invites for each row execute function public.on_advisor_person_invite_insert();

create or replace function public.on_founder_invitation_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'sent' then
    perform public.notify_invitee_by_email(new.invitee_email, 'founder_invited', new.id, new.inviter_user_id, '/dashboard');
  end if;
  return new;
end;
$$;
revoke all on function public.on_founder_invitation_insert() from public, anon, authenticated;
create trigger on_founder_invitation_insert after insert on public.invitations for each row execute function public.on_founder_invitation_insert();

-- Der Hinweis endet mit der Einladung.
create or replace function public.drop_invite_notices()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.in_app_notices where subject_id = old.id and kind in ('advisor_org_invited', 'advisor_person_invited', 'founder_invited');
  return null;
end;
$$;
revoke all on function public.drop_invite_notices() from public, anon, authenticated;
create trigger drop_org_invite_notices after update of status on public.advisor_org_invites
  for each row when (old.status = 'sent' and new.status <> 'sent') execute function public.drop_invite_notices();
create trigger drop_org_invite_notices_on_delete after delete on public.advisor_org_invites
  for each row when (old.status = 'sent') execute function public.drop_invite_notices();
create trigger drop_person_invite_notices after update of status on public.advisor_person_invites
  for each row when (old.status = 'sent' and new.status <> 'sent') execute function public.drop_invite_notices();
create trigger drop_person_invite_notices_on_delete after delete on public.advisor_person_invites
  for each row when (old.status = 'sent') execute function public.drop_invite_notices();
create trigger drop_founder_invite_notices after update of status on public.invitations
  for each row when (old.status in ('sent', 'opened') and new.status not in ('sent', 'opened')) execute function public.drop_invite_notices();
create trigger drop_founder_invite_notices_on_delete after delete on public.invitations
  for each row when (old.status in ('sent', 'opened')) execute function public.drop_invite_notices();

-- Die offenen Einladungen an mich (nach bestaetigter Adresse). Nur Organisation und Advisor-Bitte; die von
-- Mitgruenderinnen stehen auf dem Dashboard.
create or replace function public.list_my_invites()
returns table (
  invite_id uuid,
  kind text,
  org_name text,
  inviter_name text,
  role text,
  scopes text[],
  note text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select lower(btrim(coalesce(u.email, ''))) as email from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
  )
  select i.id, 'org'::text, o.name, nullif(btrim(core.display_name), ''), i.role, null::text[], null::text, i.created_at, i.expires_at
  from public.advisor_org_invites i
  join me on me.email = i.invitee_email
  join public.advisor_orgs o on o.id = i.org_id
  left join public.person_core core on core.user_id = i.invited_by_user_id
  where i.status = 'sent' and i.expires_at > pg_catalog.now()
  union all
  select i.id, 'person'::text, o.name, nullif(btrim(core.display_name), ''), null::text, i.scopes, i.note, i.created_at, i.expires_at
  from public.advisor_person_invites i
  join me on me.email = i.invitee_email
  left join public.advisor_orgs o on o.id = i.org_id
  left join public.person_core core on core.user_id = i.advisor_user_id
  where i.status = 'sent' and i.expires_at > pg_catalog.now()
  order by 8 desc;
$$;
revoke all on function public.list_my_invites() from public, anon;
grant execute on function public.list_my_invites() to authenticated;

-- Annehmen ohne den Link aus der Mail: dieselbe Adresse, dieselbe Funktion.
create or replace function public.claim_advisor_org_invite_by_id(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  select i.token_hash into v_hash from public.advisor_org_invites i
  where i.id = p_invite_id
    and i.invitee_email = (select lower(btrim(coalesce(u.email, ''))) from auth.users u where u.id = auth.uid());
  if v_hash is null then
    raise exception 'invite_unknown' using errcode = '42501';
  end if;
  return public.claim_advisor_org_invite(v_hash);
end;
$$;
revoke all on function public.claim_advisor_org_invite_by_id(uuid) from public, anon;
grant execute on function public.claim_advisor_org_invite_by_id(uuid) to authenticated;

create or replace function public.claim_advisor_person_invite_by_id(p_invite_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
begin
  select i.token_hash into v_hash from public.advisor_person_invites i
  where i.id = p_invite_id
    and i.invitee_email = (select lower(btrim(coalesce(u.email, ''))) from auth.users u where u.id = auth.uid());
  if v_hash is null then
    raise exception 'invite_unknown' using errcode = '42501';
  end if;
  return public.claim_advisor_person_invite(v_hash);
end;
$$;
revoke all on function public.claim_advisor_person_invite_by_id(uuid) from public, anon;
grant execute on function public.claim_advisor_person_invite_by_id(uuid) to authenticated;

-- Ablehnen: nur die eingeladene Adresse, nur solange die Einladung offen ist.
create or replace function public.decline_my_invite(p_kind text, p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := (select lower(btrim(coalesce(u.email, ''))) from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null);
  v_count integer;
begin
  if v_email is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_kind = 'org' then
    update public.advisor_org_invites set status = 'declined' where id = p_invite_id and invitee_email = v_email and status = 'sent';
  elsif p_kind = 'person' then
    update public.advisor_person_invites set status = 'declined' where id = p_invite_id and invitee_email = v_email and status = 'sent';
  else
    raise exception 'invite_unknown' using errcode = '22023';
  end if;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'invite_not_open' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.decline_my_invite(text, uuid) from public, anon;
grant execute on function public.decline_my_invite(text, uuid) to authenticated;

commit;
