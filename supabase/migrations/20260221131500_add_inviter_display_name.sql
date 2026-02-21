-- Add inviter display name to invitations
alter table public.invitations
add column if not exists inviter_display_name text;

-- Optional fallback: store inviter email
alter table public.invitations
add column if not exists inviter_email text;

-- Backfill inviter_display_name from profiles if missing
update public.invitations i
set inviter_display_name = coalesce(nullif(p.display_name, ''), i.inviter_display_name)
from public.profiles p
where p.user_id = i.inviter_user_id
  and (i.inviter_display_name is null or i.inviter_display_name = '');
