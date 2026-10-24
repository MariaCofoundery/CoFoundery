begin;

-- ---------------------------------------------------------------------------
-- Admin: wie oft werden die Team-Checks genutzt?
-- ---------------------------------------------------------------------------
-- Nur Zaehler, kein Personenbezug: je Check, wie viele Runden begonnen, abgeschlossen und
-- abgebrochen wurden - insgesamt und in den letzten 30 Tagen. Dazu, wie viele Commitment Labs
-- begonnen wurden. Damit laesst sich entscheiden, ob Read My Mind und Founder in the Wild
-- ueberhaupt genutzt werden. Nur fuer Plattform-Admins.
create function public.admin_team_check_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_since timestamptz := now() - interval '30 days';
begin
  perform public.radar_require_admin();
  return jsonb_build_object(
    'read_my_mind', public.admin_team_check_counts('read_my_mind', v_since),
    'founder_in_the_wild', public.admin_team_check_counts('founder_in_the_wild', v_since),
    'commitment_lab', jsonb_build_object(
      'started_total', (select count(*) from public.commitment_labs),
      'started_30d', (select count(*) from public.commitment_labs where created_at >= v_since)));
end $$;

create function public.admin_team_check_counts(p_experience text, p_since timestamptz) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'started_total', count(*),
    'started_30d', count(*) filter (where created_at >= p_since),
    'completed_total', count(*) filter (where status = 'completed'),
    'abandoned_total', count(*) filter (where status = 'abandoned'))
  from public.collaboration_experience_rounds where experience_key = p_experience
$$;

revoke all on function public.admin_team_check_stats(), public.admin_team_check_counts(text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_team_check_stats() to authenticated;

notify pgrst, 'reload schema';
commit;
