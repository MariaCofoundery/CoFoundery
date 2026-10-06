-- Phase 12C.1B: Team-, Organisations- und Einwilligungs-Lebenszyklus.
--
-- Feste Produktentscheidungen (siehe docs/research/phase-12/phase-12c1b-team-org-lifecycle-integrity.md):
--   A. Gerichtete Freigaben an Org-Advisors wirken nur, solange der Org-Weg
--      besteht, der schon beim Teilen galt - keine Wiederbelebung.
--   B. Ein Teamreview bleibt bestehen; sein Zugriff auf den konkreten
--      Teambericht endet beim ersten Rosterwechsel endgueltig.
--   C. Verlaesst die letzte Person ein Team, wird es archiviert, nicht geloescht.
-- Dazu: Organisation ohne Inhaberin wird ausgesetzt, requested_by besitzt
-- keine Org-Einwilligung mehr, Selbst-Austritt aus Organisationen,
-- Existenz-Orakel geschlossen, Setup-Leser nach aktuellem Roster,
-- Blockierung bei Teamreview-Anfragen.

-- ===========================================================================
-- B. Teamreview an einen Teamkontext binden
-- ===========================================================================
alter table public.advisor_team_reviews
  add column if not exists team_id uuid references public.founder_teams(id) on delete set null,
  add column if not exists team_bound_at timestamptz,
  add column if not exists team_access_ended_at timestamptz;

comment on column public.advisor_team_reviews.team_id is
  'Team, dessen Roster bei der Aktivierung exakt der zustimmenden Gruppe entsprach. Nur dieses Team und nur bis zum ersten Rosterwechsel (team_access_ended_at) oeffnet den Teambericht.';

alter table public.founder_teams add column if not exists archived_at timestamptz;
comment on column public.founder_teams.archived_at is
  'Gesetzt, wenn die letzte Person das Team verlassen hat. Archivierte Teams haben keine aktiven Freigaben, Einladungen oder Advisor-Zugriffe.';

create or replace function public.advisor_team_review_matching_team(p_review_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  with subjects as (
    select subject_user_id as user_id from public.advisor_team_review_members
    where review_id = p_review_id and decision = 'approved'
  ),
  candidates as (
    select member.team_id
    from public.founder_team_members member
    join public.founder_teams team on team.id = member.team_id and team.archived_at is null
    group by member.team_id
    having count(*) = (select count(*) from subjects)
       and count(*) = (select count(*) from public.advisor_team_review_members where review_id = p_review_id)
       and bool_and(member.user_id in (select user_id from subjects))
  )
  select case when (select count(*) from candidates) = 1 then (select team_id from candidates) end;
$$;
revoke all on function public.advisor_team_review_matching_team(uuid) from public, anon, authenticated;

-- Bestehende aktive Reviews: an das Team binden, dem sie heute exakt entsprechen.
-- Damit bleibt der heutige Zugriff gleich; jeder spaetere Rosterwechsel beendet ihn.
update public.advisor_team_reviews review
set team_id = public.advisor_team_review_matching_team(review.id),
    team_bound_at = pg_catalog.now()
where review.status = 'active' and review.team_id is null
  and public.advisor_team_review_matching_team(review.id) is not null;

create or replace function public.decide_advisor_team_review(
  p_review_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_open integer;
  v_team uuid;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.advisor_team_review_members
  set decision = case when p_approve then 'approved' else 'declined' end,
      decided_at = pg_catalog.now()
  where review_id = p_review_id
    and subject_user_id = v_user
    and decision = 'pending';

  if not found then
    raise exception 'team_review_not_open_for_you' using errcode = '42501';
  end if;

  if not p_approve then
    -- EIN NEIN BEENDET DAS GANZE. Die Auswertung ist die Zusammenstellung;
    -- ohne eine Seite gibt es sie nicht.
    update public.advisor_team_reviews
    set status = 'declined', closed_at = pg_catalog.now(), updated_at = pg_catalog.now()
    where id = p_review_id and status = 'requested';
    return;
  end if;

  select count(*) into v_open
  from public.advisor_team_review_members
  where review_id = p_review_id and decision = 'pending';

  if v_open = 0 then
    -- Phase 12C.1B: Bei der Aktivierung an genau das Team binden, dessen
    -- aktueller Roster exakt der zustimmenden Gruppe entspricht. Gibt es kein
    -- (oder mehr als ein) solches Team, bleibt es ein reiner Gruppenreview
    -- ohne Teambericht.
    v_team := public.advisor_team_review_matching_team(p_review_id);
    update public.advisor_team_reviews
    set status = 'active', activated_at = pg_catalog.now(), updated_at = pg_catalog.now(),
        team_id = v_team,
        team_bound_at = case when v_team is not null then pg_catalog.now() end
    where id = p_review_id and status = 'requested';
  end if;
end;
$$;

create or replace function public.can_read_workstyle_team(p_team_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 public.is_current_user_founder_team_member(p_team_id)
 or exists(select 1 from public.advisor_team_reviews r where r.team_id=p_team_id and r.team_access_ended_at is null and public.has_advisor_team_review_access(r.id,auth.uid())
 and not exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and not exists(select 1 from public.advisor_team_review_members rm where rm.review_id=r.id and rm.subject_user_id=m.user_id and rm.decision='approved'))
 and (select count(*) from public.advisor_team_review_members rm where rm.review_id=r.id)=(select count(*) from public.founder_team_members m where m.team_id=p_team_id))
 or ((select count(*) from public.founder_team_members where team_id=p_team_id)=2 and exists(
 select 1 from public.relationships r join public.relationship_advisors ra on ra.relationship_id=r.id
 where r.founder_team_id=p_team_id and ra.advisor_user_id=auth.uid() and ra.status='linked'
 and ra.revoked_at is null and ra.founder_a_approved and ra.founder_b_approved
 and exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and m.user_id=r.user_a_id)
 and exists(select 1 from public.founder_team_members m where m.team_id=p_team_id and m.user_id=r.user_b_id))))
$$;

-- Erster Rosterwechsel beendet den Teamberichts-Zugriff endgueltig.
create or replace function public.end_advisor_team_review_access_after_roster_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.advisor_team_reviews
  set team_access_ended_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where team_id = coalesce(new.team_id, old.team_id) and team_access_ended_at is null;
  return coalesce(new, old);
end $$;
revoke all on function public.end_advisor_team_review_access_after_roster_change() from public, anon, authenticated;
drop trigger if exists trg_end_advisor_team_review_access_after_roster_change on public.founder_team_members;
create trigger trg_end_advisor_team_review_access_after_roster_change
after insert or delete on public.founder_team_members
for each row execute function public.end_advisor_team_review_access_after_roster_change();

-- Blockierung bei neuen Review-Anfragen.
create or replace function public.request_advisor_team_review(
  p_subject_user_ids uuid[],
  p_org_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor uuid := auth.uid();
  v_id uuid;
  v_subject uuid;
  v_subjects uuid[];
begin
  if v_advisor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  -- Doppelte raus, und sich selbst kann niemand mitvergleichen.
  select array_agg(distinct s) into v_subjects
  from unnest(coalesce(p_subject_user_ids, '{}'::uuid[])) as s
  where s <> v_advisor;

  if v_subjects is null or array_length(v_subjects, 1) < 2 then
    raise exception 'team_review_needs_two' using errcode = '22023';
  end if;
  -- Acht ist keine technische Grenze, sondern eine fachliche: Was darueber
  -- hinausgeht, ist keine Aufstellung mehr, sondern eine Kohorte.
  if array_length(v_subjects, 1) > 8 then
    raise exception 'team_review_too_many' using errcode = '22023';
  end if;

  if p_org_id is not null then
    if not exists (
      select 1 from public.advisor_org_members member
      where member.org_id = p_org_id
        and member.user_id = v_advisor
        and member.status = 'active'
    ) then
      raise exception 'advisor_org_membership_required' using errcode = '42501';
    end if;
  end if;

  -- NUR UNTER MENSCHEN, DIE MAN SCHON BEGLEITET. Ohne diese Pruefung waere
  -- eine Anfrage ein Weg, Fremden mitzuteilen, wen man sonst noch begleitet -
  -- denn die Anfrage nennt allen Beteiligten die anderen Namen.
  foreach v_subject in array v_subjects loop
    if not exists (
      select 1 from public.advisor_person_grants grant_row
      where grant_row.subject_user_id = v_subject
        and grant_row.scope = 'base'
        and grant_row.status = 'active'
        and grant_row.revoked_at is null
        and (
          case when p_org_id is null
               then grant_row.advisor_user_id = v_advisor
               else grant_row.org_id = p_org_id
          end
        )
    ) then
      raise exception 'team_review_subject_not_accompanied' using errcode = '42501';
    end if;
    -- Phase 12C.1B: Blockierung wie bei der Personenanfrage. Dieselbe Antwort
    -- wie "nicht begleitet" - der Advisor erfaehrt den Grund nicht.
    if public.is_network_interaction_blocked(v_advisor, v_subject) then
      raise exception 'team_review_subject_not_accompanied' using errcode = '42501';
    end if;
  end loop;

  insert into public.advisor_team_reviews (
    advisor_user_id, org_id, requested_by_user_id, request_note
  )
  values (
    case when p_org_id is null then v_advisor end,
    p_org_id,
    v_advisor,
    left(nullif(btrim(coalesce(p_note, '')), ''), 400)
  )
  returning id into v_id;

  insert into public.advisor_team_review_members (review_id, subject_user_id)
  select v_id, s from unnest(v_subjects) as s;

  return v_id;
end;
$$;

-- ===========================================================================
-- A. Gerichtete Freigaben an Org-Advisors: kein Aufleben alter Freigaben
-- ===========================================================================
alter table public.advisor_org_members add column if not exists activated_at timestamptz;
update public.advisor_org_members set activated_at = created_at where activated_at is null;
alter table public.advisor_org_members alter column activated_at set default pg_catalog.now();
alter table public.advisor_org_members alter column activated_at set not null;
comment on column public.advisor_org_members.activated_at is
  'Beginn der aktuellen aktiven Mitgliedschaft. Wird bei jeder Wiederaufnahme neu gesetzt.';

create or replace function public.stamp_advisor_org_member_activation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    new.activated_at := pg_catalog.now();
  end if;
  return new;
end $$;
revoke all on function public.stamp_advisor_org_member_activation() from public, anon, authenticated;
drop trigger if exists trg_stamp_advisor_org_member_activation on public.advisor_org_members;
create trigger trg_stamp_advisor_org_member_activation
before update on public.advisor_org_members
for each row execute function public.stamp_advisor_org_member_activation();

create or replace function public.alignment_share_is_effective(
  p_assessment_id uuid,
  p_recipient_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alignment_shares share
    join public.assessments assessment on assessment.id = share.assessment_id
    where share.assessment_id = p_assessment_id
      and share.recipient_user_id = p_recipient_user_id
      and share.revoked_at is null
      and (
        -- Phase 11.7B: Founder untereinander - der Advisor-Status spielt keine Rolle.
        public.are_founder_peers(assessment.user_id, p_recipient_user_id)
        -- Persoenlicher Advisor-Weg (unveraendert).
        or exists (
          select 1 from public.advisor_person_grants grant_row
          where grant_row.subject_user_id = assessment.user_id
            and grant_row.advisor_user_id = p_recipient_user_id
            and grant_row.status = 'active'
        )
        -- Phase 12C.1B: Org-Weg. Zaehlt nur, wenn Org-Zugang UND Mitgliedschaft
        -- schon galten, als die Freigabe entstand, und seither nicht neu
        -- begonnen haben (approved_at / activated_at). Eine alte Freigabe lebt
        -- so nicht auf, wenn Zugang oder Mitgliedschaft spaeter neu entstehen.
        or exists (
          select 1 from public.advisor_person_grants grant_row
          join public.advisor_org_members member
            on member.org_id = grant_row.org_id and member.user_id = p_recipient_user_id
          join public.advisor_orgs org on org.id = grant_row.org_id
          where grant_row.subject_user_id = assessment.user_id
            and grant_row.org_id is not null
            and grant_row.status = 'active' and grant_row.revoked_at is null
            and grant_row.approved_at <= share.created_at
            and member.status = 'active' and member.activated_at <= share.created_at
            and org.status = 'active'
        )
        -- Kein Advisor-Kontext: weder persoenliche Zugaenge noch ein
        -- Org-Verhaeltnis, das beim Entstehen der Freigabe schon bestand
        -- (unveraendert fuer Freigaben ausserhalb des Advisor-Kontexts).
        or (
          not exists (
            select 1 from public.advisor_person_grants grant_row
            where grant_row.subject_user_id = assessment.user_id
              and grant_row.advisor_user_id = p_recipient_user_id
          )
          and not exists (
            select 1 from public.advisor_person_grants grant_row
            join public.advisor_org_members member
              on member.org_id = grant_row.org_id and member.user_id = p_recipient_user_id
            where grant_row.subject_user_id = assessment.user_id
              and grant_row.org_id is not null
              and grant_row.created_at <= share.created_at
              and member.created_at <= share.created_at
          )
        )
      )
  );
$$;

-- ===========================================================================
-- Organisation: letzte Inhaberin loescht ihr Konto
-- ===========================================================================
create or replace function public.suspend_advisor_org_without_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.status = 'active' and not exists (
    select 1 from public.advisor_org_members member
    where member.org_id = old.org_id and member.role = 'owner' and member.status = 'active'
  ) then
    -- Kontoloeschung wird nicht blockiert; die Organisation laeuft nur nicht
    -- unverwaltet weiter. Org-Zugaenge enden damit zur Lesezeit.
    update public.advisor_orgs set status = 'suspended' where id = old.org_id and status = 'active';
  end if;
  return old;
end $$;
revoke all on function public.suspend_advisor_org_without_owner() from public, anon, authenticated;
drop trigger if exists trg_suspend_advisor_org_without_owner on public.advisor_org_members;
create trigger trg_suspend_advisor_org_without_owner
after delete on public.advisor_org_members
for each row execute function public.suspend_advisor_org_without_owner();

-- ===========================================================================
-- requested_by ist Historie, nicht Eigentuemer
-- ===========================================================================
alter table public.advisor_person_grants alter column requested_by_user_id drop not null;
alter table public.advisor_person_grants drop constraint advisor_person_grants_requested_by_user_id_fkey;
alter table public.advisor_person_grants add constraint advisor_person_grants_requested_by_user_id_fkey
  foreign key (requested_by_user_id) references auth.users(id) on delete set null;
alter table public.advisor_team_reviews alter column requested_by_user_id drop not null;
alter table public.advisor_team_reviews drop constraint advisor_team_reviews_requested_by_user_id_fkey;
alter table public.advisor_team_reviews add constraint advisor_team_reviews_requested_by_user_id_fkey
  foreign key (requested_by_user_id) references auth.users(id) on delete set null;

-- ===========================================================================
-- Selbst-Austritt aus einer Organisation
-- ===========================================================================
create or replace function public.leave_advisor_org(p_org_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_member public.advisor_org_members;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  perform 1 from public.advisor_orgs where id = p_org_id for update;
  select * into v_member from public.advisor_org_members
  where org_id = p_org_id and user_id = v_user and status = 'active' for update;
  if not found then raise exception 'advisor_org_not_a_member' using errcode = '42501'; end if;
  if v_member.role = 'owner' and not exists (
    select 1 from public.advisor_org_members other
    where other.org_id = p_org_id and other.user_id <> v_user and other.role = 'owner' and other.status = 'active'
  ) then
    -- Erst Fuehrung uebertragen oder die Organisation schliessen.
    raise exception 'advisor_org_needs_an_owner' using errcode = '42501';
  end if;
  update public.advisor_org_members set status = 'revoked', revoked_at = pg_catalog.now()
  where org_id = p_org_id and user_id = v_user;
  return true;
end $$;
revoke all on function public.leave_advisor_org(uuid) from public, anon;
grant execute on function public.leave_advisor_org(uuid) to authenticated;

-- ===========================================================================
-- Existenz-Orakel schliessen
-- ===========================================================================
-- Die Hilfsfunktionen nehmen weiter eine Nutzer-ID an (RLS, interne Aufrufe),
-- beantworten sie fuer angemeldete Personen aber nur noch fuer sich selbst.
-- Ohne angemeldete Person (Service Role, Trigger) gilt der Parameter.
create or replace function public.has_advisor_person_access(
  p_subject_user_id uuid,
  p_scope text,
  p_advisor_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_person_grants grant_row
    left join public.advisor_org_members member
      on member.org_id = grant_row.org_id
     and member.user_id = p_advisor_user_id
     and member.status = 'active'
    left join public.advisor_orgs org on org.id = grant_row.org_id
    where grant_row.subject_user_id = p_subject_user_id
      and grant_row.scope = p_scope
      and grant_row.status = 'active'
      and grant_row.revoked_at is null
      and (grant_row.expires_at is null or grant_row.expires_at > pg_catalog.now())
      and (
        grant_row.advisor_user_id = p_advisor_user_id
        or (member.user_id is not null and org.status = 'active')
      )
      -- Phase 12C.1B: kein Orakel - fremde IDs nur ohne angemeldete Person (Server).
      and (p_advisor_user_id is not distinct from auth.uid() or auth.uid() is null)
  );
$$;

create or replace function public.has_advisor_team_review_access(
  p_review_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_team_reviews review
    left join public.advisor_org_members member
      on member.org_id = review.org_id
     and member.user_id = p_user_id
     and member.status = 'active'
    left join public.advisor_orgs org on org.id = review.org_id
    where review.id = p_review_id
      and review.status = 'active'
      and (
        review.advisor_user_id = p_user_id
        or (member.user_id is not null and org.status = 'active')
      )
      and (p_user_id is not distinct from auth.uid() or auth.uid() is null)
  );
$$;

create or replace function public.was_ever_advisor_for_team_review(
  p_review_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.advisor_team_reviews review
    left join public.advisor_org_members member
      on member.org_id = review.org_id
     and member.user_id = p_user_id
    where review.id = p_review_id
      -- Jeder Status. Auch eine widerrufene Auswertung hat stattgefunden.
      and (review.advisor_user_id = p_user_id or member.user_id is not null)
      and (p_user_id is not distinct from auth.uid() or auth.uid() is null)
  );
$$;

create or replace function public.is_advisor_org_member(
  p_org_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_org_members member
    where member.org_id = p_org_id
      and member.user_id = p_user_id
      and member.status = 'active'
      and (p_user_id is not distinct from auth.uid() or auth.uid() is null)
  );
$$;

create or replace function public.is_accompanied_by_advisor_org(
  p_org_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advisor_person_grants grant_row
    where grant_row.org_id = p_org_id
      and grant_row.subject_user_id = p_user_id
      and (p_user_id is not distinct from auth.uid() or auth.uid() is null)
  );
$$;

-- Interner Pruefweg fuer fremde IDs (Reviewer-Auswahl beim Intake).
create or replace function public.advisor_org_member_internal(p_org_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.advisor_org_members member
    where member.org_id = p_org_id and member.user_id = p_user_id and member.status = 'active');
$$;
revoke all on function public.advisor_org_member_internal(uuid, uuid) from public, anon, authenticated;

create or replace function public.create_team_intake(p_mode text, p_name text, p_emails text[], p_hashes text[], p_team uuid DEFAULT NULL::uuid, p_org uuid DEFAULT NULL::uuid, p_reviewers uuid[] DEFAULT NULL::uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_emails text[]; v_reviewers uuid[]; v_uid uuid:=auth.uid(); v_n integer; i integer;
begin
 if v_uid is null then raise exception 'intake_forbidden' using errcode='42501'; end if;
 select array_agg(lower(btrim(e)) order by ord) into v_emails from unnest(p_emails) with ordinality x(e,ord);
 v_n:=coalesce(cardinality(v_emails),0);
 if v_n not between 2 and 4 or cardinality(p_hashes) is distinct from v_n or p_mode is null or p_mode not in ('selection','development')
 or p_name is null or char_length(btrim(p_name)) not between 1 and 120
 or (select count(distinct e) from unnest(v_emails) e)<>v_n
 or exists(select 1 from unnest(v_emails) e where e is null or position('@' in e)<=1 or char_length(e)>254)
 or exists(select 1 from unnest(p_hashes) h where h is null or h!~'^[0-9a-f]{64}$')
 or (select count(distinct h) from unnest(p_hashes) h)<>v_n then
 raise exception 'intake_invalid' using errcode='22023'; end if;
 if p_org is null then v_reviewers:=array[v_uid];
 else
  select array_agg(distinct id) into v_reviewers from unnest(coalesce(p_reviewers,'{}')||array[v_uid]) id;
  if not exists(select 1 from public.advisor_orgs where id=p_org and status='active')
  or not public.is_advisor_org_member(p_org) or cardinality(v_reviewers)>10
  or exists(select 1 from unnest(v_reviewers) id where id is null or not public.advisor_org_member_internal(p_org,id)) then
   raise exception 'intake_forbidden' using errcode='42501'; end if;
 end if;
 if exists(select 1 from auth.users u where u.id=any(v_reviewers) and lower(btrim(u.email))=any(v_emails)) then
  raise exception 'intake_reviewer_is_founder' using errcode='22023'; end if;
 if p_team is not null then
  perform 1 from public.founder_teams where id=p_team for update;
  if not public.team_intake_existing_team_allowed(p_team) or
   (select count(*) from public.founder_team_members where team_id=p_team)<>v_n or
   exists(select 1 from public.founder_team_members m join auth.users u on u.id=m.user_id where m.team_id=p_team and not(lower(btrim(u.email))=any(v_emails))) then
   raise exception 'intake_team_mismatch' using errcode='42501'; end if;
 end if;
 -- Bounded use, without creating a generic notification/rate-limit platform.
 if (select count(*) from public.team_intake_rounds where created_by=v_uid and created_at>now()-interval '1 day')>=30 then
  raise exception 'intake_daily_limit' using errcode='54000'; end if;
 insert into public.team_intake_rounds(founder_team_id,team_name,mode,advisor_user_id,org_id,created_by)
 values(p_team,btrim(p_name),p_mode,case when p_org is null then v_uid end,p_org,v_uid) returning id into v_id;
 insert into public.team_intake_reviewers select v_id,id from unnest(v_reviewers) id;
 for i in 1..v_n loop
  insert into public.team_intake_participants(round_id,email,token_hash) values(v_id,v_emails[i],p_hashes[i]);
 end loop;
 return v_id;
end; $function$;

-- ===========================================================================
-- Setup-Leser nach aktuellem Roster
-- ===========================================================================
create or replace function public.get_advisor_confirmed_founder_setup(p_relationship_id uuid)
returns table (
  item_key text,
  resolution_status text,
  note text,
  documentation_reference text,
  confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    item.item_key,
    revision.resolution_status,
    revision.note,
    revision.documentation_reference,
    revision.confirmed_at
  from public.founder_team_advisor_setup_grants grant_row
  join public.relationship_advisors source_access
    on source_access.id = grant_row.source_relationship_advisor_id
  join public.relationships source_relationship
    on source_relationship.id = source_access.relationship_id
   and source_relationship.founder_team_id = grant_row.team_id
  join public.founder_team_setup_items item
    on item.team_id = grant_row.team_id
  join public.founder_team_setup_revisions revision
    on revision.id = item.current_confirmed_revision_id
   and revision.setup_item_id = item.id
  where auth.uid() is not null
    and grant_row.advisor_user_id = auth.uid()
    and grant_row.scope = 'confirmed_only'
    and grant_row.status = 'active'
    and grant_row.revoked_at is null
    and revision.confirmed_at is not null
    and revision.superseded_at is null
    -- Phase 12C.1B: nur Vereinbarungen, die JEDES aktuelle Mitglied bestaetigt
    -- hat (wie im Teambericht) - auch fuer die Legacy-Seiten. Kein archiviertes Team.
    and not exists (
      select 1 from public.founder_team_members current_member
      where current_member.team_id = grant_row.team_id
        and not exists (
          select 1 from public.founder_team_setup_confirmations confirmation
          where confirmation.revision_id = revision.id
            and confirmation.user_id = current_member.user_id))
    and not exists (select 1 from public.founder_teams archived where archived.id = grant_row.team_id and archived.archived_at is not null)
    and source_access.advisor_user_id = auth.uid()
    and source_access.status = 'linked'
    and source_access.founder_a_approved = true
    and source_access.founder_b_approved = true
    and source_access.revoked_at is null
    and exists (
      select 1
      from public.relationship_advisors request_access
      join public.relationships request_relationship
        on request_relationship.id = request_access.relationship_id
      where request_access.relationship_id = p_relationship_id
        and request_access.advisor_user_id = auth.uid()
        and request_access.status = 'linked'
        and request_access.founder_a_approved = true
        and request_access.founder_b_approved = true
        and request_access.revoked_at is null
        and request_relationship.founder_team_id = grant_row.team_id
    )
    and (select count(*) from public.founder_team_members member where member.team_id = grant_row.team_id) >= 2
    and not exists (
      select 1
      from public.founder_team_members missing_member
      where missing_member.team_id = grant_row.team_id
        and not exists (
          select 1
          from public.founder_team_advisor_setup_consents consent
          where consent.grant_id = grant_row.id
            and consent.founder_user_id = missing_member.user_id
        )
    )
  order by item.item_key;
$$;

-- ===========================================================================
-- C. Letzter Austritt archiviert statt loescht
-- ===========================================================================
create or replace function public.delete_empty_founder_team_after_member_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.founder_team_members m where m.team_id = old.team_id) then
    return old;
  end if;
  -- Kontoloeschung der letzten Person: bisheriges Verhalten (Loeschpflicht hat
  -- Vorrang) - ohne Einladungshistorie wird das Team geloescht.
  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    delete from public.founder_teams team
    where team.id = old.team_id
      and not exists (select 1 from public.invitations i where i.target_founder_team_id = old.team_id);
  end if;
  -- Sonst (Austritt, oder Einladungshistorie vorhanden): archivieren.
  update public.founder_teams set archived_at = coalesce(archived_at, pg_catalog.now()) where id = old.team_id;
  update public.invitations
  set status = 'revoked', revoked_at = coalesce(revoked_at, pg_catalog.now()), updated_at = pg_catalog.now()
  where target_founder_team_id = old.team_id and status::text in ('sent', 'opened');
  update public.team_shares set revoked_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where team_id = old.team_id and revoked_at is null;
  update public.founder_team_advisor_setup_grants
  set status = 'revoked', revoked_at = coalesce(revoked_at, pg_catalog.now())
  where team_id = old.team_id and status <> 'revoked';
  return old;
end $$;

create or replace function public.ensure_founder_team_for_relationship(
  p_relationship_id uuid,
  p_team_context text,
  p_founder_team_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_relationship public.relationships%rowtype;
  v_team public.founder_teams%rowtype;
  v_team_id uuid;
  v_resulting_member_count integer;
begin
  if p_team_context not in ('pre_founder', 'existing_team') then
    raise exception 'invalid_founder_team_context' using errcode = '22023';
  end if;

  select *
    into v_relationship
  from public.relationships relationship
  where relationship.id = p_relationship_id
  for update;

  if not found then
    raise exception 'relationship_not_found' using errcode = 'P0002';
  end if;

  if v_relationship.founder_team_id is not null then
    v_team_id := v_relationship.founder_team_id;
    perform 1 from public.founder_teams team where team.id = v_team_id for update;
    -- Phase 12C.1B: Wiederbeitritt (Vertrag aus 11.7B) in ein archiviertes
    -- Team hebt die Archivierung auf. Alte Zustimmungen leben dabei nicht auf:
    -- Teamfreigaben bleiben widerrufen, Review-Teamzugriffe beendet,
    -- Setup-Zugaenge widerrufen.
    update public.founder_teams set archived_at = null where id = v_team_id and archived_at is not null;
  elsif p_founder_team_id is null then
    insert into public.founder_teams (team_context)
    values (p_team_context)
    returning id into v_team_id;
  else
    select *
      into v_team
    from public.founder_teams team
    where team.id = p_founder_team_id
    for update;

    if not found then
      raise exception 'founder_team_not_found' using errcode = 'P0002';
    end if;
    if v_team.archived_at is not null then
      raise exception 'founder_team_archived' using errcode = '22023';
    end if;

    if v_team.team_context <> p_team_context then
      raise exception 'founder_team_context_mismatch' using errcode = '22023';
    end if;

    v_team_id := v_team.id;
  end if;

  select count(distinct member_user_id)
    into v_resulting_member_count
  from (
    select member.user_id as member_user_id
    from public.founder_team_members member
    where member.team_id = v_team_id
    union all
    select v_relationship.user_a_id
    union all
    select v_relationship.user_b_id
  ) resulting_members;

  if v_resulting_member_count > 4 then
    raise exception 'founder_team_member_limit_reached' using errcode = '23514';
  end if;

  insert into public.founder_team_members (team_id, user_id)
  values
    (v_team_id, v_relationship.user_a_id),
    (v_team_id, v_relationship.user_b_id)
  on conflict (team_id, user_id) do nothing;

  update public.relationships
  set founder_team_id = v_team_id
  where id = v_relationship.id
    and founder_team_id is null;

  return v_team_id;
end;
$$;
