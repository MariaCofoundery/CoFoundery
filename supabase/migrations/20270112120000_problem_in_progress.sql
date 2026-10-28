begin;

-- ---------------------------------------------------------------------------
-- "Wir arbeiten daran": ein Problem vom Brett nehmen, ohne es aufzugeben
-- ---------------------------------------------------------------------------
--
-- Wer mit anderen an einem Problem arbeitet, soll es fuer Fremde ausblenden
-- koennen, ohne es "zurueckzuziehen" oder als "geloest" zu markieren.
--
-- Der Zustand verhaelt sich wie "zurueckgezogen", ist aber ein eigener, damit
-- er auch so heisst und sich so anfuehlt - und damit der Weg zurueck aufs Brett
-- klar ist:
--   - Fremde sehen das Problem nicht mehr (Select-Regel verlangt 'active').
--   - Neue Meldungen und neue Ansaetze sind nicht mehr moeglich (die Regeln
--     verlangen 'active').
--   - Bestehende Gespraeche und private Arbeitsraeume bleiben.
--   - Die einstellende Person sieht es weiter und kann es jederzeit erneut
--     aufs Brett stellen (Aktion 'active'), als gelost markieren oder
--     zurueckziehen.
--   - Vorschlaege fuer dieses Problem werden beendet (gilt schon fuer alles,
--     was nicht 'active' ist).
-- ---------------------------------------------------------------------------

alter table public.network_problems
  drop constraint network_problems_status_check;

alter table public.network_problems
  add constraint network_problems_status_check
    check (status in ('draft', 'active', 'in_progress', 'withdrawn', 'resolved'));

CREATE OR REPLACE FUNCTION public.transition_connect_content(p_kind text, p_id uuid, p_action text, p_expected text, p_confirm boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.network_listings; p public.network_problems;
begin
 if p_confirm is distinct from true or not public.is_network_member() then raise exception 'lifecycle_forbidden' using errcode='42501'; end if;
 if p_kind='listing' then
  select * into l from public.network_listings where id=p_id and owner_user_id=auth.uid() for update;
  if not found or l.status is distinct from p_expected then raise exception 'lifecycle_conflict' using errcode='40001'; end if;
  if p_action='delete' then delete from public.network_listings where id=p_id;
  elsif p_action in ('pause','complete') and l.status='active' then update public.network_listings set status=case when p_action='pause' then 'paused' else 'completed' end where id=p_id;
  elsif p_action in ('publish','renew') then
   if char_length(btrim(l.title))<5 then raise exception 'listing_title_required' using errcode='23514'; end if;
   if char_length(btrim(l.summary))<20 then raise exception 'listing_summary_required' using errcode='23514'; end if;
   if not exists(select 1 from public.network_profiles where user_id=auth.uid() and status='active') then
    raise exception 'active_network_profile_required' using errcode='23514'; end if;
   update public.network_listings set status='active',published_at=now(),expires_at=now()+interval '60 days' where id=p_id;
  else raise exception 'lifecycle_invalid' using errcode='23514'; end if;
 elsif p_kind='problem' then
  select * into p from public.network_problems where id=p_id and author_user_id=auth.uid() for update;
  if not found or p.status is distinct from p_expected then raise exception 'lifecycle_conflict' using errcode='40001'; end if;
  if p_action='delete' then delete from public.network_problems where id=p_id;
  elsif p_action='active' and not p.moderation_blocked then update public.network_problems set status='active',published_at=coalesce(published_at,now()),resolved_at=null where id=p_id;
  elsif ((p_action='in_progress' and p.status='active') or (p_action in ('withdrawn','resolved') and p.status in ('active','in_progress'))) then update public.network_problems set status=p_action,resolved_at=case when p_action='resolved' then now() end where id=p_id;
  else raise exception 'lifecycle_forbidden' using errcode='42501'; end if;
 else raise exception 'lifecycle_invalid' using errcode='23514'; end if;
end $function$;

commit;
