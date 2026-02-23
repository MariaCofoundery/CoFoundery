alter table public.invitations
  add column if not exists inviter_display_name text;

alter table public.invitations
  add column if not exists inviter_email text;

update public.invitations i
set
  inviter_email = coalesce(
    nullif(btrim(i.inviter_email), ''),
    nullif(lower(u.email), '')
  ),
  inviter_display_name = coalesce(
    nullif(btrim(i.inviter_display_name), ''),
    nullif(btrim(p.display_name), ''),
    nullif(lower(u.email), ''),
    'Co-Founder'
  ),
  updated_at = now()
from auth.users u
left join public.profiles p on p.user_id = u.id
where i.inviter_user_id = u.id
  and (
    i.inviter_display_name is null
    or btrim(i.inviter_display_name) = ''
    or i.inviter_email is null
    or btrim(i.inviter_email) = ''
  );
