-- Phase 12C.1A: Advisor-Zugriffe - Absicherung.

-- 4. Advisor-Team-Einladung: bestaetigte Adresse
--
-- Ergebnis der Pruefung (siehe docs/research/phase-12/phase-12c1a-advisor-access-integrity.md):
-- Die Lesewege fuer Advisors pruefen ihre Zustimmungen bereits zur Lesezeit
-- (Personenzugang je Bereich, gerichtete Freigabe, exakte Review-Gruppe,
-- aktive Org-Mitgliedschaft). Ein Datenleck wurde nicht gefunden.
--
-- Lokal reproduzierte Fehler, die diese Migration schliesst:
--   1. Legacy-Advisor-Bindung (founder_alignment_workbook_advisors): Ein
--      Advisor konnte beide Founder-Zustimmungen selbst setzen, eine Founderin
--      die der anderen - per UPDATE oder per INSERT einer fertig genehmigten
--      Zeile. Diese Flags schalten /advisor/snapshot und (ueber die Synchronisation
--      nach relationship_advisors) die Paar-Advisor-Wege frei.
--   2. decide_advisor_person_access: Einen Zugang, den eine Organisation haelt,
--      konnte jede angemeldete Person widerrufen (NULL-Vergleich).
--   3. get_advisor_team_reviews zeigte einer ausgesetzten Organisation ihre
--      Reviews weiter (has_advisor_team_review_access pruefte es schon).
--   4. claim_advisor_team_invite_founder verlangte keine bestaetigte Adresse
--      (Restpunkt aus 12C.0b).
-- Alles andere bleibt unveraendert; keine Daten werden geaendert.

create or replace function public.claim_advisor_team_invite_founder(
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_row public.advisor_team_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'advisor_team_invite_email_missing' using errcode = '42501';
  end if;
  -- Phase 12C.1A: wie jede Einladungsannahme nur mit bestaetigter Adresse
  -- (dieselbe Pruefung wie 12C.0b) - aus dem Slot entstehen Teammitgliedschaft
  -- und Paar-Advisor-Zugang.
  if not public.current_user_email_verified() then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'advisor_team_invite_token_invalid' using errcode = '22023';
  end if;

  select * into v_row
  from public.advisor_team_invites
  where founder_a_token_hash = p_token_hash
     or founder_b_token_hash = p_token_hash
  limit 1
  for update;

  if not found then
    return null;
  end if;

  if v_row.status not in ('pending', 'activating') then
    return null;
  end if;

  if exists (
    select 1
    from public.relationship_advisors ra
    where ra.advisor_user_id = v_row.advisor_user_id
      and (ra.status = 'revoked' or ra.revoked_at is not null)
      and (
        (v_row.relationship_id is not null and ra.relationship_id = v_row.relationship_id)
        or
        (v_row.invitation_id is not null and ra.source_invitation_id = v_row.invitation_id)
      )
  ) then
    update public.advisor_team_invites
    set status = 'revoked'
    where id = v_row.id
    returning * into v_row;
    return null;
  end if;

  if v_row.expires_at <= pg_catalog.now() then
    update public.advisor_team_invites
    set status = 'expired'
    where id = v_row.id
    returning * into v_row;
    return null;
  end if;

  if v_row.founder_a_token_hash = p_token_hash then
    if lower(btrim(v_row.founder_a_email)) <> v_email then
      raise exception 'advisor_team_invite_email_mismatch' using errcode = '42501';
    end if;
    if v_row.founder_a_user_id is not null and v_row.founder_a_user_id <> v_uid then
      raise exception 'advisor_team_invite_already_claimed' using errcode = '42501';
    end if;

    update public.advisor_team_invites
    set founder_a_user_id = coalesce(founder_a_user_id, v_uid),
        founder_a_claimed_at = coalesce(founder_a_claimed_at, pg_catalog.now()),
        founder_a_token_hash = null
    where id = v_row.id
    returning * into v_row;
  elsif v_row.founder_b_token_hash = p_token_hash then
    if lower(btrim(v_row.founder_b_email)) <> v_email then
      raise exception 'advisor_team_invite_email_mismatch' using errcode = '42501';
    end if;
    if v_row.founder_b_user_id is not null and v_row.founder_b_user_id <> v_uid then
      raise exception 'advisor_team_invite_already_claimed' using errcode = '42501';
    end if;

    update public.advisor_team_invites
    set founder_b_user_id = coalesce(founder_b_user_id, v_uid),
        founder_b_claimed_at = coalesce(founder_b_claimed_at, pg_catalog.now()),
        founder_b_token_hash = null
    where id = v_row.id
    returning * into v_row;
  else
    return null;
  end if;

  return v_row.id;
end;
$$;
revoke all on function public.claim_advisor_team_invite_founder(text) from public, anon;
grant execute on function public.claim_advisor_team_invite_founder(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. Legacy-Advisor-Bindung: Zustimmungen setzt nur der Server
-- ---------------------------------------------------------------------------
-- Alle legitimen Schreibwege laufen ueber den Service-Role-Client
-- (founderAlignmentWorkbookActions.ts). Angemeldete Clients duerfen hoechstens
-- eine leere Anfrage anlegen und den Anzeigenamen pflegen.
create or replace function public.guard_legacy_workbook_advisor_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.advisor_user_id is not null or new.founder_a_approved or new.founder_b_approved
       or new.approved_at is not null or new.claimed_at is not null or new.token_hash is not null then
      raise exception 'legacy_advisor_consent_is_server_managed' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.founder_a_approved is distinct from old.founder_a_approved
     or new.founder_b_approved is distinct from old.founder_b_approved
     or new.approved_at is distinct from old.approved_at
     or new.claimed_at is distinct from old.claimed_at
     or new.token_hash is distinct from old.token_hash
     or new.requested_by is distinct from old.requested_by
     or new.invitation_id is distinct from old.invitation_id then
    raise exception 'legacy_advisor_consent_is_server_managed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_legacy_workbook_advisor_consent() from public, anon, authenticated;

drop trigger if exists trg_guard_legacy_workbook_advisor_consent on public.founder_alignment_workbook_advisors;
create trigger trg_guard_legacy_workbook_advisor_consent
before insert or update on public.founder_alignment_workbook_advisors
for each row execute function public.guard_legacy_workbook_advisor_consent();

-- ---------------------------------------------------------------------------
-- 2. Widerruf eines Personenzugangs: null-sicher, Org-Zugaenge eingeschlossen
-- ---------------------------------------------------------------------------
create or replace function public.decide_advisor_person_access(
  p_grant_id uuid,
  p_decision text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_grant public.advisor_person_grants;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'decline', 'revoke') then
    return false;
  end if;

  select * into v_grant from public.advisor_person_grants
  where id = p_grant_id for update;
  if not found then return false; end if;

  -- WIDERRUFEN DARF AUCH DER ADVISOR: Eine Begleitung endet manchmal von
  -- seiner Seite, und dann soll er sie beenden koennen, ohne die Person zu
  -- bitten. Zustimmen kann nur die Person.
  if p_decision = 'revoke' then
    -- Phase 12C.1A: null-sicher. Bei einem Zugang, den eine Organisation haelt,
    -- ist advisor_user_id NULL - der alte Vergleich ergab NULL statt true, und
    -- JEDE angemeldete Person konnte so einen Zugang widerrufen. Erlaubt sind
    -- die Person selbst, der persoenliche Advisor oder ein aktives Mitglied der
    -- haltenden (aktiven) Organisation.
    if not (
      v_user = v_grant.subject_user_id
      or v_user is not distinct from v_grant.advisor_user_id and v_grant.advisor_user_id is not null
      or (v_grant.org_id is not null and exists (
        select 1 from public.advisor_org_members member
        join public.advisor_orgs org on org.id = member.org_id
        where member.org_id = v_grant.org_id and member.user_id = v_user
          and member.status = 'active' and org.status = 'active'))
    ) then
      raise exception 'advisor_grant_not_yours' using errcode = '42501';
    end if;
    update public.advisor_person_grants
    set status = 'revoked', revoked_at = pg_catalog.now(), approved_at = null
    where id = p_grant_id;
    return true;
  end if;

  if v_user <> v_grant.subject_user_id then
    raise exception 'advisor_grant_not_yours' using errcode = '42501';
  end if;
  if v_grant.status <> 'requested' then
    return false;
  end if;

  if p_decision = 'approve' then
    update public.advisor_person_grants
    set status = 'active', approved_at = pg_catalog.now(), revoked_at = null
    where id = p_grant_id;
  else
    update public.advisor_person_grants
    set status = 'declined', approved_at = null
    where id = p_grant_id;
  end if;

  return true;
end;
$$;
revoke all on function public.decide_advisor_person_access(uuid, text) from public, anon;
grant execute on function public.decide_advisor_person_access(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Review-Liste: ausgesetzte Organisation sieht nichts mehr
-- ---------------------------------------------------------------------------
create or replace function public.get_advisor_team_reviews()
returns table (
  review_id uuid,
  status text,
  org_id uuid,
  request_note text,
  created_at timestamptz,
  subject_user_ids uuid[],
  pending_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select review.id,
         review.status,
         review.org_id,
         review.request_note,
         review.created_at,
         (select array_agg(m.subject_user_id order by m.subject_user_id)
          from public.advisor_team_review_members m where m.review_id = review.id),
         (select count(*)::int
          from public.advisor_team_review_members m
          where m.review_id = review.id and m.decision = 'pending')
  from public.advisor_team_reviews review
  left join public.advisor_org_members member
    on member.org_id = review.org_id
   and member.user_id = auth.uid()
   and member.status = 'active'
  left join public.advisor_orgs org on org.id = review.org_id
  where review.status in ('requested', 'active')
    -- Phase 12C.1A: wie has_advisor_team_review_access - eine ausgesetzte
    -- Organisation sieht auch ihre Liste nicht mehr.
    and (review.advisor_user_id = auth.uid() or (member.user_id is not null and org.status = 'active'))
  order by review.created_at desc;
$$;
revoke all on function public.get_advisor_team_reviews() from public, anon;
grant execute on function public.get_advisor_team_reviews() to authenticated;
