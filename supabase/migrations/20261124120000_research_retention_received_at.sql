-- Aufbewahrungsfrist von Research- und Produkt-Analyse-Ereignissen nach dem
-- vertrauenswürdigen Serverzeitpunkt `received_at`.
--
-- WARUM: Bisher löschte `purge_old_research_events` nach
--
--     coalesce(client_occurred_at, received_at) < cutoff
--
-- `client_occurred_at` kommt aus dem Browser (features/research/server.ts
-- übernimmt jeden parsebaren Zeitstempel). Ein Zeitstempel in der Zukunft -
-- falsche Geräteuhr oder Absicht - hielt eine Zeile entsprechend länger fest,
-- im Extremfall unbegrenzt. Eine Löschfrist darf nicht davon abhängen, was ein
-- Client behauptet.
--
-- JETZT: Für die Frist zählt ausschließlich `received_at` (NOT NULL, Default
-- now(), von keinem Codepfad gesetzt). `client_occurred_at` bleibt als
-- Analysewert erhalten, verlängert oder verkürzt die Frist aber nicht mehr.
--
-- UNVERÄNDERT: Signatur, Grenze (`date_trunc('day', now()) - Tage`, 1–60
-- Tage), Rückgabeformat, SECURITY DEFINER, search_path und die Rechte
-- (ausschließlich service_role).

begin;

create or replace function public.purge_old_research_events(p_retention_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retention_days integer := coalesce(p_retention_days, 30);
  v_deleted_research_count integer := 0;
  v_deleted_product_count integer := 0;
  v_cutoff timestamptz;
begin
  if v_retention_days < 1 or v_retention_days > 60 then
    raise exception 'invalid_retention_days';
  end if;

  v_cutoff := date_trunc('day', now()) - make_interval(days => v_retention_days);
  perform set_config('app.allow_account_cleanup', 'on', true);

  delete from public.research_events
  where received_at < v_cutoff;
  get diagnostics v_deleted_research_count = row_count;

  delete from public.product_analytics_events
  where received_at < v_cutoff;
  get diagnostics v_deleted_product_count = row_count;

  return jsonb_build_object(
    'retentionDays', v_retention_days,
    'cutoff', v_cutoff,
    'deletedResearchEvents', v_deleted_research_count,
    'deletedProductAnalyticsEvents', v_deleted_product_count
  );
end;
$$;

comment on function public.purge_old_research_events(integer) is
  'Löscht research_events und product_analytics_events mit received_at vor date_trunc(day, now()) - p_retention_days. client_occurred_at beeinflusst die Frist nicht.';

-- Rechte ausdrücklich erneut setzen: create or replace behält sie zwar, aber
-- die Zusage soll an dieser Stelle lesbar und unabhängig von der Vorgeschichte
-- sein (Supabase-Default-Privilegien, siehe 20260908100000).
revoke all on function public.purge_old_research_events(integer) from public, anon, authenticated;
grant execute on function public.purge_old_research_events(integer) to service_role;

commit;
