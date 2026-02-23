begin;

create or replace function public.accept_invitation(p_token text)
returns table (invitation_id uuid, relationship_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
  v_rel_id uuid;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- FIX: text -> bytea -> sha256
  v_hash := encode(
    digest(convert_to(p_token, 'utf8'), 'sha256'),
    'hex'
  );

  select * into v_inv
  from public.invitations
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  if v_inv.expires_at < now() then
    update public.invitations
      set status = 'expired', updated_at = now()
    where id = v_inv.id;
    raise exception 'expired';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'revoked';
  end if;

  insert into public.relationships(user_a_id, user_b_id)
  values (v_inv.inviter_user_id, v_uid)
  on conflict (user_low, user_high)
  do nothing
  returning id into v_rel_id;

  if v_rel_id is null then
    select id into v_rel_id
    from public.relationships
    where user_low = least(v_inv.inviter_user_id, v_uid)
      and user_high = greatest(v_inv.inviter_user_id, v_uid);
  end if;

  update public.invitations
    set status = 'accepted',
        invitee_user_id = v_uid,
        accepted_at = coalesce(accepted_at, now()),
        updated_at = now()
  where id = v_inv.id;

  return query select v_inv.id, v_rel_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

commit;