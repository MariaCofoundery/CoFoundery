begin;

-- ---------------------------------------------------------------------------
-- Datenexport: die vier Tabellen, die normale Konten nicht direkt lesen duerfen
-- ---------------------------------------------------------------------------
--
-- Der Export (Art. 15 und 20 DSGVO) liest mit den Rechten der angemeldeten Person.
-- Bei vier Tabellen gibt es dafuer keinen Direktzugriff - dort stand im Export
-- "permission denied" und die Daten fehlten:
--
--   network_messages              die EIGENEN gesendeten Nachrichten
--   network_blocks                die eigenen Sperren
--   workstyle_pretest_sessions    die eigenen Sitzungen der Arbeitsweise-Befragung
--   workstyle_research_responses  die eigenen Forschungsantworten
--
-- Diese Funktion liefert genau diese Zeilen, und nur die der aufrufenden Person.
-- Nachrichten anderer Menschen sind nicht dabei, auch nicht in gemeinsamen
-- Gespraechen. Keine neue Berechtigung auf den Tabellen selbst.
create function public.export_my_restricted_data() returns jsonb
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
      where r.assessment_id in (select a.id from public.assessments a where a.user_id = uid)), '[]'::jsonb)
  );
end $$;
revoke all on function public.export_my_restricted_data() from public, anon;
grant execute on function public.export_my_restricted_data() to authenticated;

notify pgrst, 'reload schema';
commit;
