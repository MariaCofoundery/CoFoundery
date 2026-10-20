begin;

-- ---------------------------------------------------------------------------
-- Die Bereitschaft verraet nicht, WER noch nichts beantwortet hat
-- ---------------------------------------------------------------------------
-- Gefunden bei der Pruefung fuer drei und vier Gruendende (21.10.2026). Jedes Mitglied bekam fuer jede
-- andere Person `has_current_workstyle` - also ob sie den Fragebogen ueberhaupt beantwortet hat. Das ist
-- etwas anderes als "hat noch nicht geteilt": Wer nicht geteilt hat, hat entschieden oder noch nicht
-- entschieden; wer nicht beantwortet hat, steht vor aller Augen als jemand, der nicht fertig wurde.
-- "Nicht geteilt" ist nicht "nicht beantwortet".
--
-- JETZT: Fuer die EIGENE Person bleibt der echte Wert (sie braucht ihn, um zu wissen, ob sie noch etwas
-- ausfuellen muss). Fuer alle anderen steht dort derselbe Wert wie bei "geteilt" - das Mitglied ist bereit
-- oder noch nicht, ohne den Grund zu nennen. Namen der noch nicht Teilenden bleiben sichtbar: Ein Team muss
-- sich abstimmen koennen.

create or replace function public.get_workstyle_team_share_readiness(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare members jsonb:='[]'; m record; has_profile boolean; shared boolean; team_share boolean; all_ready boolean:=true; member_count integer;
begin
 if auth.uid() is null or not public.is_current_user_founder_team_member(p_team_id) then return null; end if;
 select count(*) into member_count from public.founder_team_members where team_id=p_team_id;
 if member_count not between 2 and 4 then return jsonb_build_object('status','unavailable','members','[]'::jsonb,
  'viewer_team_share',public.team_share_active(p_team_id,auth.uid())); end if;
 for m in select tm.user_id,coalesce(nullif(p.display_name,''),'Founder') name from public.founder_team_members tm
  left join public.profiles p on p.user_id=tm.user_id where tm.team_id=p_team_id order by tm.created_at,tm.user_id loop
  has_profile:=public.workstyle_current_core_assessment(m.user_id) is not null;
  team_share:=public.team_share_active(p_team_id,m.user_id);
  shared:=public.team_member_shares_with_team(p_team_id,m.user_id);
  all_ready:=all_ready and shared;
  members:=members||jsonb_build_array(jsonb_build_object('person_id',m.user_id,'name',m.name,'is_viewer',m.user_id=auth.uid(),
   'has_current_workstyle',case when m.user_id=auth.uid() then has_profile else shared end,'team_share_active',team_share,'shared_with_team',shared,'shared_with_all_members',shared));
 end loop;
 return jsonb_build_object('status',case when all_ready then 'ready' else 'missing' end,'members',members,
  'viewer_team_share',public.team_share_active(p_team_id,auth.uid()));
end $$;

revoke all on function public.get_workstyle_team_share_readiness(uuid) from public, anon;
grant execute on function public.get_workstyle_team_share_readiness(uuid) to authenticated;

commit;
