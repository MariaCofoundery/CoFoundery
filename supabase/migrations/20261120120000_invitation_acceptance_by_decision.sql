-- Phase 12C.0: Einladung ansehen und Einladung annehmen sind zwei getrennte
-- Vorgaenge.
--
-- Bisher nahm GET /invite/[id]/resume (Link "Fortsetzen" auf Dashboard und
-- Verbindungen) eine Einladung serverseitig mit dem Service-Role-Key an - ohne
-- Beitrittsdialog und ohne Teilen-Entscheidung. Grund: Das Dashboard kennt den
-- Einladungs-Token nicht (gespeichert ist nur sein Hash), die vorhandenen
-- Annahme-RPCs verlangen aber den Token.
--
-- Dieser Schritt schafft den fehlenden, ausdruecklichen Weg ohne Token:
--   * accept_invitation_core(id)  - interner Kern, exakt die bisherigen Pruefungen
--                                   von accept_invitation (Login, Adresse,
--                                   widerrufen, abgelaufen, Status, schon
--                                   angenommen, Sperre gegen parallele Annahme).
--   * accept_invitation(token)    - unveraendertes Verhalten, nutzt den Kern.
--   * accept_invitation_by_id_with_team_share(id, share)
--                                 - fuer angemeldete Eingeladene ohne Token; nur mit
--                                   ausdruecklicher Wahl (share nicht null).
--   * get_invitation_decision_state(id)
--                                 - reine Lesefunktion fuer den Entscheidungsbildschirm.
--
-- Die Berechtigung bleibt dieselbe wie beim Token-Weg: Die angemeldete Adresse
-- muss die eingeladene sein (der Token hat die Einladung bisher nur gefunden,
-- nicht autorisiert). Kein Schreiben ueber den Service-Role-Key mehr noetig.

create or replace function public.accept_invitation_core(p_invitation_id uuid)
returns table (invitation_id uuid, relationship_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_inv public.invitations%rowtype;
  v_rel_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if v_user_email = '' then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  select * into v_inv
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'invalid_token';
  end if;

  if lower(btrim(v_inv.invitee_email)) <> v_user_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  if v_inv.status = 'accepted' then
    if v_inv.invitee_user_id is distinct from v_uid then
      raise exception 'invitation_already_accepted' using errcode = '42501';
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

    return query select v_inv.id, v_rel_id;
    return;
  end if;

  if v_inv.status = 'revoked' or v_inv.revoked_at is not null then
    raise exception 'revoked';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at < now() then
    raise exception 'expired';
  end if;

  if v_inv.status not in ('sent', 'opened') then
    raise exception 'invalid_invitation_status';
  end if;

  if v_inv.invitee_user_id is not null and v_inv.invitee_user_id is distinct from v_uid then
    raise exception 'invitation_already_accepted' using errcode = '42501';
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
  where id = v_inv.id
    and status in ('sent', 'opened')
    and (invitee_user_id is null or invitee_user_id = v_uid);

  if not found then
    raise exception 'invitation_acceptance_conflict' using errcode = '40001';
  end if;

  return query select v_inv.id, v_rel_id;
end;
$$;

-- Nur von den beiden oeffentlichen Annahme-Funktionen aufrufbar.
revoke all on function public.accept_invitation_core(uuid)
from public, anon, authenticated, service_role;

create or replace function public.accept_invitation(p_token text)
returns table (invitation_id uuid, relationship_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) = '' then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  select id into v_id
  from public.invitations
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'::text), 'hex');

  if v_id is null then
    raise exception 'invalid_token';
  end if;

  return query select * from public.accept_invitation_core(v_id);
end;
$$;

revoke all on function public.accept_invitation(text)
from public, anon, authenticated, service_role;
grant execute on function public.accept_invitation(text) to authenticated;

-- Beitritt aus dem Konto heraus (Dashboard, Verbindungen) - dieselbe
-- ausdrueckliche Wahl wie accept_invitation_with_team_share: p_share=false ist
-- "Erst beitreten, spaeter entscheiden", p_share=true setzt im selben Schritt
-- die Teamfreigabe fuer das Team der Einladung. Ohne Wahl keine Annahme.
create or replace function public.accept_invitation_by_id_with_team_share(
  p_invitation_id uuid,
  p_share boolean
)
returns table(invitation_id uuid, relationship_id uuid, team_id uuid)
language plpgsql security definer set search_path='' as $$
declare r record; t uuid;
begin
 if p_share is null then raise exception 'share_choice_required' using errcode='22023'; end if;
 select * into r from public.accept_invitation_core(p_invitation_id) limit 1;
 select founder_team_id into t from public.relationships where id=r.relationship_id;
 if p_share and t is not null and public.is_current_user_founder_team_member(t) then
  perform public.set_team_share(t,true);
 end if;
 return query select r.invitation_id,r.relationship_id,t;
end $$;
revoke all on function public.accept_invitation_by_id_with_team_share(uuid,boolean) from public,anon;
grant execute on function public.accept_invitation_by_id_with_team_share(uuid,boolean) to authenticated;

-- Reiner Lesezugriff fuer den Entscheidungsbildschirm. Verraet fremden
-- Personen nichts: Nicht gefunden und andere Adresse ergeben beide
-- 'unavailable'.
--   pending   - darf jetzt mit ausdruecklicher Wahl angenommen werden
--   accepted  - von dieser Person bereits angenommen
--   expired / revoked
--   unavailable
create or replace function public.get_invitation_decision_state(p_invitation_id uuid)
returns text
language plpgsql stable security definer set search_path='' as $$
declare v public.invitations%rowtype; mail text := lower(btrim(coalesce(auth.jwt() ->> 'email','')));
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
 select * into v from public.invitations where id=p_invitation_id;
 if not found then return 'unavailable'; end if;
 if v.status::text='accepted' then
  return case when v.invitee_user_id=auth.uid() then 'accepted' else 'unavailable' end;
 end if;
 if mail='' or lower(btrim(v.invitee_email))<>mail then return 'unavailable'; end if;
 if v.invitee_user_id is not null and v.invitee_user_id<>auth.uid() then return 'unavailable'; end if;
 if v.status::text='revoked' or v.revoked_at is not null then return 'revoked'; end if;
 if v.status::text='expired' or v.expires_at<now() then return 'expired'; end if;
 if v.status::text in ('sent','opened') then return 'pending'; end if;
 return 'unavailable';
end $$;
revoke all on function public.get_invitation_decision_state(uuid) from public,anon;
grant execute on function public.get_invitation_decision_state(uuid) to authenticated;
