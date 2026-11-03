-- Kontoexport: die eigenen Stempel der Check-in-Erinnerung (team_check_in_reminders).
--
-- Die Tabelle ist fuer normale Konten bewusst geschlossen (20270104120000, gepinnt
-- in supabase/tests/team_check_in_reminders.sql). Der Export las sie trotzdem
-- direkt und meldete sie deshalb unter "nichtEnthalten" mit "permission denied".
-- Wie Nachrichten und Programmdaten kommt sie jetzt ueber die schmale Funktion,
-- die nur Zeilen der aufrufenden Person liefert. Inhalt: nur Team, Faelligkeit und
-- Zeitpunkt der Erinnerung. Die Tabelle selbst bleibt geschlossen.
begin;

create or replace function public.export_my_restricted_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'network_messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at, m.id)
      from public.network_messages m where m.sender_user_id = uid), '[]'::jsonb),
    'network_blocks', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.created_at)
      from public.network_blocks b where b.blocker_user_id = uid), '[]'::jsonb),
    'workstyle_pretest_sessions', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.started_at)
      from public.workstyle_pretest_sessions s
      where s.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb),
    'workstyle_research_responses', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.answered_at, r.item_key)
      from public.workstyle_research_responses r
      where r.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb),
    'team_program_consents', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.approved_at)
      from public.team_program_consents c where c.founder_user_id = uid), '[]'::jsonb),
    'team_program_updates', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.submitted_at)
      from public.team_program_updates u where u.submitted_by_user_id = uid), '[]'::jsonb),
    'team_program_milestones', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at)
      from public.team_program_milestones m where m.created_by_user_id = uid), '[]'::jsonb),
    'team_program_profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.updated_at)
      from public.team_program_profiles p where p.updated_by_user_id = uid), '[]'::jsonb),
    'team_program_org_data', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.updated_at)
      from public.team_program_org_data d where d.updated_by_user_id = uid), '[]'::jsonb),
    -- Neu (20270305120000): die eigenen Stempel der Check-in-Erinnerung.
    'team_check_in_reminders', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.due_on, r.team_id)
      from public.team_check_in_reminders r where r.user_id = uid), '[]'::jsonb)
  );
end $$;

commit;
