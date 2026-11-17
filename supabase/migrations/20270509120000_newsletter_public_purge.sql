-- Newsletter ohne Konto: unbestaetigte Anmeldungen verlassen die Datenbank zuverlaessig im taeglichen Loeschlauf (17.11.2026).
-- Bisher geschah das nur nebenbei bei der naechsten Anmeldung; die Datenschutzerklaerung nennt aber eine feste Frist, also braucht es einen Lauf.
-- Rechte wie die anderen Loeschfunktionen: ausschliesslich service_role.
begin;

create or replace function public.purge_stale_newsletter_public(p_pending_days integer default 14)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_days integer := coalesce(p_pending_days, 14); v_deleted integer := 0;
begin
  if v_days < 7 or v_days > 60 then raise exception 'invalid_retention_days'; end if;
  delete from public.newsletter_public_subscribers where status = 'pending' and requested_at < pg_catalog.date_trunc('day', pg_catalog.now()) - pg_catalog.make_interval(days => v_days);
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('pendingDays', v_days, 'deletedPendingSignups', v_deleted);
end;
$$;
revoke all on function public.purge_stale_newsletter_public(integer) from public, anon, authenticated;
grant execute on function public.purge_stale_newsletter_public(integer) to service_role;

commit;
