begin;

-- ---------------------------------------------------------------------------
-- Venture Alignment v2 (Beta 1) und die Verallgemeinerung des Phase-E-Vertrags
-- ---------------------------------------------------------------------------
--
-- Siehe docs/architecture/phase-f-beta-audit.md. Kurz:
--
--   EIN ZWEITES INSTRUMENT BRAUCHT NICHT EINE ZWEITE KOPIE. Phase E kannte genau
--   `venture-tradeoffs-v1`: als CHECK an der Share-Tabelle und als Literal in
--   den Funktionen. Jetzt steht in EINER kleinen Tabelle, welche Instrumente
--   assessment-gebunden geteilt und verglichen werden duerfen - und was daran
--   erlaubt, Pflicht und team-sichtbar ist. Die Funktionen fragen diese Tabelle.
--
--   KEINE VERSIONSPLATTFORM: Die Tabelle enthaelt nur, was die DB
--   wirklich braucht (Instrument, Familie, Bloecke). Ihre Vergleichbarkeit ist
--   weiterhin die EXAKTE Instrument-ID - `venture-alignment-v2-beta1` ist nur mit
--   sich selbst vergleichbar, `venture-tradeoffs-v1` nur mit sich selbst.
--
--   PRIVATE FELDER: Der Team-Lesepfad liefert ausschliesslich Bloecke aus
--   `team_visible_block_ids` (Allowlist). Ein privater Block (GR01P/GR02P, hier
--   `M01p`/`M02p`) steht nie in dieser Liste und kommt deshalb nie durch den
--   Team-Lesepfad - es gibt keinen Fallback "alle Antworten".
--
--   ADDITIV: Nichts am Bestand wird veraendert ausser der Hilfsstruktur aus
--   Phase E (diese ist noch nicht ausgerollt). v1-Tabellen, -Policies und
--   -Funktionen bleiben unberuehrt; `venture-alignment-v1` bleibt Legacy
--   (sichtbar mit Abgabe).
-- ---------------------------------------------------------------------------

insert into public.instruments (id, label, status, introduced_at)
values ('venture-alignment-v2-beta1', 'Venture Alignment v2 (Beta 1)', 'draft', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Welche Instrumente assessment-gebunden geteilt werden duerfen
-- ---------------------------------------------------------------------------
create table public.assessment_share_instruments(
 instrument_id text primary key references public.instruments(id),
 share_family text not null,
 comparison_family text not null,
 -- `true`: der allgemeine Waechter unten gilt. `false`: das Instrument hat einen
 -- eigenen (venture-tradeoffs-v1 seit Phase D).
 generic_guard boolean not null,
 -- Diese Bloecke muessen fuer eine Abgabe beantwortet sein (Antwort oder Grund).
 required_block_ids text[] not null,
 -- Nur diese Bloecke darf ein Durchlauf enthalten.
 allowed_block_ids text[] not null,
 -- NUR diese Bloecke erreichen den Team-Lesepfad (Allowlist).
 team_visible_block_ids text[] not null,
 check (required_block_ids <@ allowed_block_ids),
 check (team_visible_block_ids <@ allowed_block_ids),
 -- Was Pflicht ist, wird auch geteilt: Ein Pflichtblock, der privat bliebe, liesse den Vergleich leer.
 check (required_block_ids <@ team_visible_block_ids)
);
alter table public.assessment_share_instruments enable row level security;
revoke all on public.assessment_share_instruments from public, anon, authenticated;
comment on table public.assessment_share_instruments is
 'Phase F: die kleine serverseitige Allowlist fuer assessment-gebundenes Teilen und Vergleichen. Enthaelt nur, was die DB braucht (Instrument, Familie, erlaubte/Pflicht-/team-sichtbare Bloecke). Keine Spiegelung der TypeScript-Registry, keine Versionsplattform. Vergleichbar ist immer nur die exakt gleiche Instrument-ID. Fuer Clients nicht lesbar.';

insert into public.assessment_share_instruments
 (instrument_id, share_family, comparison_family, generic_guard, required_block_ids, allowed_block_ids, team_visible_block_ids)
values
 ('venture-tradeoffs-v1', 'venture_deepening', 'tradeoffs', false,
  array['W03','W04','W05','W06'], array['W03','W04','W05','W06'], array['W03','W04','W05','W06']),
 -- Venture Alignment v2 (Beta 1): 19 Core-Bloecke. M01p und M02p sind die privaten Betraege
 -- (Einkommensbedarf, exakter Betrag): erlaubt und speicherbar, aber nie team-sichtbar.
 ('venture-alignment-v2-beta1', 'venture_core', 'venture_alignment_v2', true,
  array['Z01','Z02','Z03','F01','F02','O01','C01','C02','C03','C04','M01','M02','M03','T01','T02','E01','E02','E03','N01'],
  array['Z01','Z02','Z03','F01','F02','O01','C01','C02','C03','C04','M01','M02','M03','T01','T02','E01','E02','E03','N01','M01p','M02p'],
  array['Z01','Z02','Z03','F01','F02','O01','C01','C02','C03','C04','M01','M02','M03','T01','T02','E01','E02','E03','N01']);

-- Die Share-Tabelle kennt nicht mehr ein festes Instrument, sondern die Allowlist.
alter table public.assessment_team_shares drop constraint assessment_team_shares_instrument_id_check;
alter table public.assessment_team_shares
 add constraint assessment_team_shares_instrument_allowlist_fkey
 foreign key (instrument_id) references public.assessment_share_instruments(instrument_id);

-- ---------------------------------------------------------------------------
-- Bereitschaft, allgemein (nicht fuer Clients aufrufbar)
-- ---------------------------------------------------------------------------
-- Der zaehlende Durchlauf ist der AKTIVE Share - nicht der neueste private Durchlauf.
create or replace function public.assessment_shared_run(p_team_id uuid, p_user_id uuid, p_instrument_id text) returns uuid
language sql stable security definer set search_path = '' as $$
 select s.assessment_id from public.assessment_team_shares s
 join public.assessments a on a.id = s.assessment_id
 where s.team_id = p_team_id and s.owner_user_id = p_user_id and s.revoked_at is null
   and s.instrument_id = p_instrument_id
   and exists (select 1 from public.assessment_share_instruments c where c.instrument_id = s.instrument_id)
   and a.user_id = p_user_id and a.venture_id = p_team_id and a.instrument_id = s.instrument_id
   and a.submitted_at is not null
   and exists (select 1 from public.founder_team_members m where m.team_id = p_team_id and m.user_id = p_user_id)
$$;
revoke all on function public.assessment_shared_run(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.assessment_team_ready(p_team_id uuid, p_instrument_id text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare member_count integer; ready_count integer;
begin
 if not exists (select 1 from public.assessment_share_instruments c where c.instrument_id = p_instrument_id) then return false; end if;
 select count(*) into member_count from public.founder_team_members where team_id = p_team_id;
 if member_count not between 2 and 4 then return false; end if;
 select count(*) into ready_count
 from public.founder_team_members m
 where m.team_id = p_team_id and public.assessment_shared_run(m.team_id, m.user_id, p_instrument_id) is not null;
 return ready_count = member_count;
end $$;
revoke all on function public.assessment_team_ready(uuid, text) from public, anon, authenticated;

-- Die Phase-E-Namen bleiben - als schmale Huelle, damit es keine zweite Logik gibt.
create or replace function public.tradeoffs_shared_run(p_team_id uuid, p_user_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select public.assessment_shared_run(p_team_id, p_user_id, 'venture-tradeoffs-v1')
$$;
create or replace function public.tradeoffs_team_ready(p_team_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select public.assessment_team_ready(p_team_id, 'venture-tradeoffs-v1')
$$;

-- ---------------------------------------------------------------------------
-- Freigeben / Zuruecknehmen, allgemein
-- ---------------------------------------------------------------------------
create function public.set_assessment_team_share(p_assessment_id uuid, p_shared boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.assessments;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
 if p_shared is null then raise exception 'share_choice_required' using errcode = '22023'; end if;
 select * into a from public.assessments where id = p_assessment_id;
 -- Fremd oder unbekannt: dieselbe Antwort, damit nichts ueber fremde Durchlaeufe verraten wird.
 if a.id is null or a.user_id <> auth.uid() then raise exception 'not_owner' using errcode = '42501'; end if;
 if a.venture_id is null or not exists (select 1 from public.assessment_share_instruments c where c.instrument_id = a.instrument_id) then
  raise exception 'share_not_supported' using errcode = '23514'; end if;
 -- Nur ein ABGEGEBENER Durchlauf: Ein Entwurf aendert sich noch, das Team haette etwas anderes gelesen.
 if a.submitted_at is null then raise exception 'share_requires_submission' using errcode = '23514'; end if;
 if not exists (select 1 from public.founder_team_members m where m.team_id = a.venture_id and m.user_id = auth.uid()) then
  raise exception 'not_team_member' using errcode = '42501'; end if;

 if p_shared then
  -- Eine aktive Freigabe je Person, Team UND Instrument: Die fruehere endet, bevor die neue beginnt.
  update public.assessment_team_shares set revoked_at = now(), updated_at = now()
   where owner_user_id = auth.uid() and team_id = a.venture_id and instrument_id = a.instrument_id
     and revoked_at is null and assessment_id <> a.id;
  insert into public.assessment_team_shares(assessment_id, team_id, owner_user_id, instrument_id)
   values (a.id, a.venture_id, auth.uid(), a.instrument_id)
  on conflict (assessment_id) do update
   set revoked_at = null, granted_at = now(), updated_at = now()
   where public.assessment_team_shares.revoked_at is not null;
 else
  update public.assessment_team_shares set revoked_at = now(), updated_at = now()
   where assessment_id = a.id and revoked_at is null;
 end if;
 return jsonb_build_object('assessment_id', a.id, 'shared', p_shared);
end $$;
revoke all on function public.set_assessment_team_share(uuid, boolean) from public, anon;
grant execute on function public.set_assessment_team_share(uuid, boolean) to authenticated;

-- Phase-E-Name: nur fuer das Tradeoffs-Instrument, sonst dieselbe Antwort wie bisher.
create or replace function public.set_tradeoffs_team_share(p_assessment_id uuid, p_shared boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
 if exists (select 1 from public.assessments a where a.id = p_assessment_id and a.user_id = auth.uid()
  and a.instrument_id <> 'venture-tradeoffs-v1') then
  raise exception 'share_not_supported' using errcode = '23514'; end if;
 return public.set_assessment_team_share(p_assessment_id, p_shared);
end $$;

-- ---------------------------------------------------------------------------
-- Bereitschaft (nur die eigene Lage) und Vergleich (nur bei Bereitschaft), allgemein
-- ---------------------------------------------------------------------------
create function public.get_assessment_team_readiness(p_team_id uuid, p_instrument_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare submitted_run uuid; has_run boolean; own_state text; own_shared_run uuid;
begin
 if auth.uid() is null or not exists (
  select 1 from public.founder_team_members m where m.team_id = p_team_id and m.user_id = auth.uid()
 ) or not exists (select 1 from public.assessment_share_instruments c where c.instrument_id = p_instrument_id)
 then return null; end if;

 select a.id into submitted_run from public.assessments a
  where a.user_id = auth.uid() and a.venture_id = p_team_id and a.instrument_id = p_instrument_id and a.submitted_at is not null
  order by a.submitted_at desc, a.created_at desc, a.id limit 1;
 select exists (select 1 from public.assessments a
  where a.user_id = auth.uid() and a.venture_id = p_team_id and a.instrument_id = p_instrument_id) into has_run;
 own_state := case when submitted_run is not null then 'completed' when has_run then 'in_progress' else 'not_started' end;
 own_shared_run := public.assessment_shared_run(p_team_id, auth.uid(), p_instrument_id);

 return jsonb_build_object(
  'status', case when public.assessment_team_ready(p_team_id, p_instrument_id) then 'ready' else 'missing' end,
  'own', jsonb_build_object('state', own_state, 'shared', own_shared_run is not null,
   'assessment_id', submitted_run, 'shared_assessment_id', own_shared_run));
end $$;
revoke all on function public.get_assessment_team_readiness(uuid, text) from public, anon;
grant execute on function public.get_assessment_team_readiness(uuid, text) to authenticated;

-- Kein Teilergebnis, kein Fallback. Nur Bloecke der Allowlist; Namen erst nach Bereitschaft.
create function public.get_assessment_team_comparison(p_team_id uuid, p_instrument_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare people jsonb := '[]'; m record; run uuid; answers jsonb; visible text[];
begin
 if auth.uid() is null or not exists (
  select 1 from public.founder_team_members x where x.team_id = p_team_id and x.user_id = auth.uid()
 ) then return null; end if;
 select c.team_visible_block_ids into visible from public.assessment_share_instruments c where c.instrument_id = p_instrument_id;
 if visible is null then return null; end if;
 if not public.assessment_team_ready(p_team_id, p_instrument_id) then return jsonb_build_object('status', 'not_ready'); end if;

 for m in select tm.user_id, coalesce(nullif(p.display_name, ''), 'Founder') as name
  from public.founder_team_members tm left join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = p_team_id order by tm.created_at, tm.user_id loop
  run := public.assessment_shared_run(p_team_id, m.user_id, p_instrument_id);
  select coalesce(jsonb_agg(jsonb_build_object('item_key', r.block_id, 'value', r.value, 'missing_reason', r.missing_code) order by r.block_id), '[]')
   into answers from public.alignment_answers r where r.assessment_id = run and r.block_id = any (visible);
  people := people || jsonb_build_array(jsonb_build_object('person_id', m.user_id, 'name', m.name, 'is_viewer', m.user_id = auth.uid(), 'answers', answers));
 end loop;
 return jsonb_build_object('status', 'ready', 'instrument_id', p_instrument_id, 'team_id', p_team_id, 'people', people);
end $$;
revoke all on function public.get_assessment_team_comparison(uuid, text) from public, anon;
grant execute on function public.get_assessment_team_comparison(uuid, text) to authenticated;

-- Phase-E-Namen als Huelle (gleiche Form wie bisher).
create or replace function public.get_tradeoffs_team_readiness(p_team_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
 select public.get_assessment_team_readiness(p_team_id, 'venture-tradeoffs-v1')
$$;
create or replace function public.get_tradeoffs_team_comparison(p_team_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
 select public.get_assessment_team_comparison(p_team_id, 'venture-tradeoffs-v1')
$$;

-- ---------------------------------------------------------------------------
-- Keine gerichtete Freigabe eines Instruments aus der Allowlist
-- ---------------------------------------------------------------------------
create or replace function public.forbid_directed_share_of_tradeoffs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if exists (select 1 from public.assessments a
  join public.assessment_share_instruments c on c.instrument_id = a.instrument_id
  where a.id = new.assessment_id) then
  raise exception 'assessment_directed_share_forbidden' using errcode = '42501';
 end if;
 return new;
end $$;

-- ---------------------------------------------------------------------------
-- Allgemeiner Waechter fuer Instrumente mit `generic_guard`
-- ---------------------------------------------------------------------------
--
-- Dasselbe wie der Waechter aus Phase D, nur aus der Tabelle statt aus Literalen:
-- ein Vorhaben, Mitglied, Identitaet und Abgabe unveraenderlich, Abgabe nur
-- vollstaendig (alle Pflichtbloecke beantwortet - Antwort oder Grund), nur
-- erlaubte Bloecke. Ein Team darf geloescht werden (venture_id -> NULL).
create function public.guard_shareable_assessment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cfg public.assessment_share_instruments;
begin
 select c.* into cfg from public.assessment_share_instruments c
  where c.generic_guard and c.instrument_id = new.instrument_id;
 if cfg.instrument_id is null and tg_op = 'UPDATE' then
  select c.* into cfg from public.assessment_share_instruments c
   where c.generic_guard and c.instrument_id = old.instrument_id;
 end if;
 if cfg.instrument_id is null then return new; end if;

 if tg_op = 'UPDATE'
    and old.venture_id is not null and new.venture_id is null
    and not exists (select 1 from public.founder_teams team where team.id = old.venture_id)
    and new.id = old.id and new.user_id = old.user_id and new.instrument_id = old.instrument_id
    and new.submitted_at is not distinct from old.submitted_at then
  return new;
 end if;

 if tg_op = 'UPDATE' and (
      new.id <> old.id or new.user_id <> old.user_id or new.instrument_id <> old.instrument_id
   or new.venture_id is distinct from old.venture_id) then
  raise exception 'shareable_identity_immutable' using errcode = '23514';
 end if;

 if new.module::text <> 'venture_alignment' or new.venture_id is null then
  raise exception 'shareable_venture_scope_required' using errcode = '23514';
 end if;

 if not exists (select 1 from public.founder_team_members member
  where member.team_id = new.venture_id and member.user_id = new.user_id) then
  raise exception 'shareable_member_required' using errcode = '42501';
 end if;

 if tg_op = 'UPDATE' and old.submitted_at is not null and new.submitted_at is distinct from old.submitted_at then
  raise exception 'shareable_submitted_immutable' using errcode = '23514';
 end if;

 if new.submitted_at is not null and (tg_op = 'INSERT' or old.submitted_at is null) then
  if (select count(distinct answer.block_id) from public.alignment_answers answer
      where answer.assessment_id = new.id and answer.block_id = any (cfg.required_block_ids))
     <> cardinality(cfg.required_block_ids) then
   raise exception 'shareable_incomplete' using errcode = '23514';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_shareable_assessment() from public, anon, authenticated;
create trigger guard_shareable_assessment
 before insert or update on public.assessments
 for each row execute function public.guard_shareable_assessment();

create function public.guard_shareable_answer() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cfg public.assessment_share_instruments;
begin
 select c.* into cfg from public.assessment_share_instruments c
  join public.assessments a on a.instrument_id = c.instrument_id
  where c.generic_guard and a.id = new.assessment_id;
 if cfg.instrument_id is null then return new; end if;
 if not (new.block_id = any (cfg.allowed_block_ids)) then
  raise exception 'shareable_unknown_block' using errcode = '23514'; end if;
 return new;
end $$;
revoke all on function public.guard_shareable_answer() from public, anon, authenticated;
create trigger guard_shareable_answer
 before insert or update on public.alignment_answers
 for each row execute function public.guard_shareable_answer();

commit;
