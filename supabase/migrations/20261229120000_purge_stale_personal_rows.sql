begin;

-- ---------------------------------------------------------------------------
-- Zwei Fristen fuer Personenbezug: Feedback und abgelaufene Einladungen
-- ---------------------------------------------------------------------------
--
--   product_feedback   Nach p_feedback_days (Vorgabe 60) wird die VERBINDUNG zur Person
--                      geloest: user_id und invitation_id werden leer. Der Text bleibt,
--                      weil er fuer die Produktarbeit gebraucht wird - ohne Personenbezug.
--
--   invitations        Eine Einladung, die nie angenommen wurde (accepted_at ist leer) und
--                      seit p_invitation_days (Vorgabe 60) abgelaufen ist, wird geloescht -
--                      mit der Mailadresse der eingeladenen Person. Angenommene Einladungen
--                      bleiben (sie gehoeren zu einer Beziehung). Hat eine Einladung noch
--                      Folgedaten (Module, Berichte, Arbeitsmappen, Eingaben), bleibt sie
--                      ebenfalls: Die Folgen wuerden mitgeloescht.
--
-- Die Fristen sind Vorgaben, keine Rechtsfristen. Rechte wie die anderen Loeschfunktionen:
-- ausschliesslich service_role.
create function public.purge_stale_personal_rows(
  p_feedback_days integer default 60,
  p_invitation_days integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback_days integer := coalesce(p_feedback_days, 60);
  v_invitation_days integer := coalesce(p_invitation_days, 60);
  v_feedback integer := 0;
  v_invitations integer := 0;
begin
  if v_feedback_days < 30 or v_feedback_days > 730 or v_invitation_days < 30 or v_invitation_days > 730 then
    raise exception 'invalid_retention_days';
  end if;

  update public.product_feedback
  set user_id = null, invitation_id = null
  where created_at < date_trunc('day', now()) - make_interval(days => v_feedback_days)
    and (user_id is not null or invitation_id is not null);
  get diagnostics v_feedback = row_count;

  delete from public.invitations i
  where i.accepted_at is null
    and i.status in ('sent', 'opened', 'expired', 'revoked')
    and i.expires_at < date_trunc('day', now()) - make_interval(days => v_invitation_days)
    and not exists (select 1 from public.invitation_modules x where x.invitation_id = i.id)
    and not exists (select 1 from public.report_runs x where x.invitation_id = i.id)
    and not exists (select 1 from public.founder_alignment_workbooks x where x.invitation_id = i.id)
    and not exists (select 1 from public.invitation_matching_inputs x where x.invitation_id = i.id);
  get diagnostics v_invitations = row_count;

  return jsonb_build_object(
    'feedbackDays', v_feedback_days,
    'invitationDays', v_invitation_days,
    'anonymizedFeedback', v_feedback,
    'deletedInvitations', v_invitations
  );
end;
$$;

comment on function public.purge_stale_personal_rows(integer, integer) is
  'Loest bei Feedback nach p_feedback_days (30-730) die Verbindung zur Person und loescht nie angenommene, abgelaufene Einladungen nach p_invitation_days (30-730). Nur service_role.';

revoke all on function public.purge_stale_personal_rows(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_stale_personal_rows(integer, integer) to service_role;

commit;
