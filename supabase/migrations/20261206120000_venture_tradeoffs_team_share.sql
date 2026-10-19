begin;

-- ---------------------------------------------------------------------------
-- Werte & Zielkonflikte: Freigabe und gemeinsamer Teamvergleich (Phase E)
-- ---------------------------------------------------------------------------
--
-- Siehe docs/architecture/phase-e-sharing-audit.md. Kurz:
--
--   FREIGABE AN DEN DURCHLAUF: Eine Freigabe bindet an EINEN abgegebenen
--   Assessment-Durchlauf (`assessment_id`), nicht an Person oder Modul. Ein neuer
--   Durchlauf ist nie automatisch freigegeben, und eine alte Freigabe springt nie
--   still auf ihn - aber sie bleibt auch gueltig: Der freigegebene Team-Stand
--   wird durch den AKTIVEN SHARE bestimmt, nicht durch den neuesten privaten Durchlauf.
--
--   KEIN BESTEHENDER VERTRAG WIRD ANGEFASST: `team_shares` (Arbeitsprofil und
--   Faehigkeiten, je Person und Team) und `alignment_shares` (gerichtet, je
--   Durchlauf und Empfaenger) bleiben, wie sie sind. `team_shares` bindet nicht an
--   einen Durchlauf; `alignment_shares` ist gerichtet und kennt keine
--   gemeinsame Bereitschaft. Beides passt nicht - siehe Audit.
--
--   KEINE VERSIONSTABELLE: Fuer den Piloten genuegt die exakte `instrument_id`.
--   Kompatibel ist `venture-tradeoffs-v1` nur mit sich selbst (Entscheidung A).
--
--   ALLES DURCH SCHMALE RPCs: Die Tabelle ist fuer Clients nicht beschreibbar,
--   und niemand ausser der eigenen Person liest sie. Ob der gemeinsame Vergleich
--   bereit ist, entscheidet allein die Datenbank (`tradeoffs_team_ready`).
--
--   ADVISOR UND FIND: nicht beruehrt. Die RPCs verlangen aktuelle Mitgliedschaft
--   im Team; ein Advisor-Grant gilt hier nicht. Eine gerichtete Freigabe
--   (`alignment_shares`) dieses Instruments wird ausdruecklich abgelehnt.
-- ---------------------------------------------------------------------------

create table public.assessment_team_shares(
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid not null references public.assessments(id) on delete cascade,
 team_id uuid not null references public.founder_teams(id) on delete cascade,
 owner_user_id uuid not null references auth.users(id) on delete cascade,
 instrument_id text not null references public.instruments(id),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 -- EINE Freigabe je Durchlauf; erneutes Freigeben setzt dieselbe Zeile zurueck.
 unique(assessment_id),
 -- Allowlist der Instrumente, die so geteilt werden duerfen. Ein weiteres Modul
 -- erweitert sie mit einer eigenen Migration - nie stillschweigend.
 check(instrument_id = 'venture-tradeoffs-v1'),
 check(revoked_at is null or revoked_at >= granted_at)
);
-- Hoechstens eine AKTIVE Freigabe je Person, Team UND INSTRUMENT (nicht je Person und Team insgesamt:
-- ein zweites optionales Modul darf parallel geteilt werden).
create unique index assessment_team_shares_one_active
 on public.assessment_team_shares(owner_user_id, team_id, instrument_id) where revoked_at is null;
create index assessment_team_shares_team_idx on public.assessment_team_shares(team_id) where revoked_at is null;

comment on table public.assessment_team_shares is
 'Phase E: Freigabe EINES abgegebenen Durchlaufs eines optionalen Moduls (heute nur venture-tradeoffs-v1) fuer den gemeinsamen Teamvergleich. Bindet an assessment_id, nie an Person oder Modul. Nur der Eigentuemer liest die Zeile; geschrieben wird ausschliesslich ueber set_tradeoffs_team_share. Kein Advisor, kein FIND.';

alter table public.assessment_team_shares enable row level security;
revoke all on public.assessment_team_shares from public, anon, authenticated;
grant select on public.assessment_team_shares to authenticated;
-- Nur die eigene Freigabe: Niemand sonst sieht, ob und wer geteilt oder zurueckgenommen hat.
create policy assessment_team_shares_select_owner on public.assessment_team_shares
 for select to authenticated using (owner_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Interne Bereitschaft (nicht fuer Clients aufrufbar)
-- ---------------------------------------------------------------------------

-- Der Durchlauf einer Person, der fuer den Teamvergleich zaehlt: der AKTIVE
-- Share-Grant dieser Person fuer dieses Team - und nur, wenn der Durchlauf ihr
-- gehoert, zu diesem Vorhaben gehoert, abgegeben ist, das Instrument erlaubt ist
-- und die Person aktuell Mitglied ist.
--
-- DER FREIGEGEBENE STAND BESTIMMT DER AKTIVE SHARE, NICHT DER NEUESTE PRIVATE
-- DURCHLAUF. Ein neuer Entwurf oder ein neu abgegebener, nicht freigegebener
-- Durchlauf aendert nichts: Run 1 bleibt der Team-Stand, bis Run 2 AUSDRUECKLICH
-- freigegeben (dann ersetzt Run 2 ihn) oder der aktive Share zurueckgenommen wird.
create function public.tradeoffs_shared_run(p_team_id uuid, p_user_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
 select s.assessment_id from public.assessment_team_shares s
 join public.assessments a on a.id = s.assessment_id
 where s.team_id = p_team_id and s.owner_user_id = p_user_id and s.revoked_at is null
   and s.instrument_id = 'venture-tradeoffs-v1'
   and a.user_id = p_user_id and a.venture_id = p_team_id and a.instrument_id = s.instrument_id
   and a.submitted_at is not null
   and exists (select 1 from public.founder_team_members m where m.team_id = p_team_id and m.user_id = p_user_id)
$$;
revoke all on function public.tradeoffs_shared_run(uuid, uuid) from public, anon, authenticated;

-- Bereit, wenn ALLE aktuellen Mitglieder (2-4) einen freigegebenen, aktuellen
-- Durchlauf haben und alle dasselbe Instrument benutzen.
create function public.tradeoffs_team_ready(p_team_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare member_count integer; ready_count integer; instrument_count integer;
begin
 select count(*) into member_count from public.founder_team_members where team_id = p_team_id;
 if member_count not between 2 and 4 then return false; end if;
 select count(*), count(distinct a.instrument_id) into ready_count, instrument_count
 from public.founder_team_members m
 join public.assessments a on a.id = public.tradeoffs_shared_run(m.team_id, m.user_id)
 where m.team_id = p_team_id;
 return ready_count = member_count and instrument_count = 1;
end $$;
revoke all on function public.tradeoffs_team_ready(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Freigeben / Zuruecknehmen
-- ---------------------------------------------------------------------------
create function public.set_tradeoffs_team_share(p_assessment_id uuid, p_shared boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.assessments;
begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
 if p_shared is null then raise exception 'share_choice_required' using errcode = '22023'; end if;
 select * into a from public.assessments where id = p_assessment_id;
 -- Fremd oder unbekannt: dieselbe Antwort, damit nichts ueber fremde Durchlaeufe verraten wird.
 if a.id is null or a.user_id <> auth.uid() then raise exception 'not_owner' using errcode = '42501'; end if;
 if a.instrument_id <> 'venture-tradeoffs-v1' or a.venture_id is null then
  raise exception 'share_not_supported' using errcode = '23514'; end if;
 -- Nur ein ABGEGEBENER Durchlauf: Ein Entwurf aendert sich noch, das Team haette etwas anderes gelesen.
 if a.submitted_at is null then raise exception 'share_requires_submission' using errcode = '23514'; end if;
 if not exists (select 1 from public.founder_team_members m where m.team_id = a.venture_id and m.user_id = auth.uid()) then
  raise exception 'not_team_member' using errcode = '42501'; end if;

 if p_shared then
  -- Eine aktive Freigabe je Person, Team und Instrument: Die fruehere endet, bevor die neue beginnt
  -- (nur dieselbe Sorte - ein anderes Instrument liefe parallel).
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
revoke all on function public.set_tradeoffs_team_share(uuid, boolean) from public, anon;
grant execute on function public.set_tradeoffs_team_share(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Bereitschaft: die eigene Lage und ein einziges Wort ueber den Rest
-- ---------------------------------------------------------------------------
--
-- Ueber andere Personen gibt es keine Angabe ausser dem Gesamtergebnis: kein Name,
-- keine Zahl, keine Version, kein Zwischenstand, keine Liste fehlender Personen.
create function public.get_tradeoffs_team_readiness(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare submitted_run uuid; has_draft boolean; own_state text; own_shared_run uuid;
begin
 if auth.uid() is null or not exists (
  select 1 from public.founder_team_members m where m.team_id = p_team_id and m.user_id = auth.uid()
 ) then return null; end if;

 select a.id into submitted_run from public.assessments a
  where a.user_id = auth.uid() and a.venture_id = p_team_id and a.instrument_id = 'venture-tradeoffs-v1' and a.submitted_at is not null
  order by a.submitted_at desc, a.created_at desc, a.id limit 1;
 select exists (select 1 from public.assessments a
  where a.user_id = auth.uid() and a.venture_id = p_team_id and a.instrument_id = 'venture-tradeoffs-v1') into has_draft;
 own_state := case when submitted_run is not null then 'completed' when has_draft then 'in_progress' else 'not_started' end;
 -- Aktiver Share = der Durchlauf, der im Team zaehlt - auch wenn es inzwischen einen neueren privaten gibt.
 own_shared_run := public.tradeoffs_shared_run(p_team_id, auth.uid());

 return jsonb_build_object(
  'status', case when public.tradeoffs_team_ready(p_team_id) then 'ready' else 'missing' end,
  'own', jsonb_build_object('state', own_state, 'shared', own_shared_run is not null,
   'assessment_id', submitted_run, 'shared_assessment_id', own_shared_run));
end $$;
revoke all on function public.get_tradeoffs_team_readiness(uuid) from public, anon;
grant execute on function public.get_tradeoffs_team_readiness(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Der gemeinsame Vergleich - nur bei Bereitschaft, sonst nichts
-- ---------------------------------------------------------------------------
--
-- Kein Teilergebnis, kein Fallback. Dieselbe Antwort fuer jedes aktuelle Mitglied.
-- Namen erscheinen erst hier, nach vollstaendiger Bereitschaft.
create function public.get_tradeoffs_team_comparison(p_team_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare people jsonb := '[]'; m record; run uuid; answers jsonb;
begin
 if auth.uid() is null or not exists (
  select 1 from public.founder_team_members x where x.team_id = p_team_id and x.user_id = auth.uid()
 ) then return null; end if;
 if not public.tradeoffs_team_ready(p_team_id) then return jsonb_build_object('status', 'not_ready'); end if;

 for m in select tm.user_id, coalesce(nullif(p.display_name, ''), 'Founder') as name
  from public.founder_team_members tm left join public.profiles p on p.user_id = tm.user_id
  where tm.team_id = p_team_id order by tm.created_at, tm.user_id loop
  run := public.tradeoffs_shared_run(p_team_id, m.user_id);
  select coalesce(jsonb_agg(jsonb_build_object('item_key', r.block_id, 'value', r.value, 'missing_reason', r.missing_code) order by r.block_id), '[]')
   into answers from public.alignment_answers r where r.assessment_id = run;
  people := people || jsonb_build_array(jsonb_build_object('person_id', m.user_id, 'name', m.name, 'is_viewer', m.user_id = auth.uid(), 'answers', answers));
 end loop;
 return jsonb_build_object('status', 'ready', 'instrument_id', 'venture-tradeoffs-v1', 'team_id', p_team_id, 'people', people);
end $$;
revoke all on function public.get_tradeoffs_team_comparison(uuid) from public, anon;
grant execute on function public.get_tradeoffs_team_comparison(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Austritt beendet die Freigabe - auch ein spaeterer Wiedereintritt teilt nichts
-- ---------------------------------------------------------------------------
create function public.end_tradeoffs_shares_on_member_removal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 update public.assessment_team_shares set revoked_at = now(), updated_at = now()
  where team_id = old.team_id and owner_user_id = old.user_id and revoked_at is null;
 return old;
end $$;
revoke all on function public.end_tradeoffs_shares_on_member_removal() from public, anon, authenticated;
create trigger end_tradeoffs_shares_on_member_removal
 after delete on public.founder_team_members
 for each row execute function public.end_tradeoffs_shares_on_member_removal();

-- ---------------------------------------------------------------------------
-- Keine gerichtete Freigabe dieses Instruments
-- ---------------------------------------------------------------------------
--
-- `alignment_shares` darf der Eigentuemer fuer jeden abgegebenen Durchlauf selbst
-- anlegen - und der Empfaenger (auch ein Advisor) saehe damit ueber die
-- bestehenden Lesepolicies die Antworten. Fuer "Werte & Zielkonflikte" gilt
-- ausschliesslich der Vertrag oben; ein Weg daran vorbei waere eine
-- Freigabe, die weder Bereitschaft noch Widerruf kennt.
create function public.forbid_directed_share_of_tradeoffs() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if exists (select 1 from public.assessments a where a.id = new.assessment_id and a.instrument_id = 'venture-tradeoffs-v1') then
  raise exception 'venture_tradeoffs_directed_share_forbidden' using errcode = '42501';
 end if;
 return new;
end $$;
revoke all on function public.forbid_directed_share_of_tradeoffs() from public, anon, authenticated;
create trigger forbid_directed_share_of_tradeoffs
 before insert or update of assessment_id on public.alignment_shares
 for each row execute function public.forbid_directed_share_of_tradeoffs();

-- ---------------------------------------------------------------------------
-- Korrektur am Waechter aus Phase D: ein Team darf geloescht werden
-- ---------------------------------------------------------------------------
--
-- `assessments.venture_id` verweist mit ON DELETE SET NULL auf `founder_teams`.
-- Der Waechter aus 20261205130000 behandelte jede Aenderung von `venture_id` als
-- Identitaetswechsel und verlangte fuer jede Zeile ein Vorhaben - damit haette ein
-- Durchlauf von „Werte & Zielkonflikte" das Loeschen seines Teams blockiert.
-- Jetzt gilt: Wird `venture_id` auf NULL gesetzt, weil das Team nicht mehr
-- existiert, und sonst nichts geaendert, geht die Aenderung durch (der Durchlauf
-- bleibt als eigene, nun vorhabenlose Zeile bestehen - wie die des Bestands).
-- Alles andere bleibt wie in Phase D.
create or replace function public.guard_venture_tradeoffs_assessment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.instrument_id is distinct from 'venture-tradeoffs-v1'
     and not (tg_op = 'UPDATE' and old.instrument_id = 'venture-tradeoffs-v1') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.venture_id is not null and new.venture_id is null
     and not exists (select 1 from public.founder_teams team where team.id = old.venture_id)
     and new.id = old.id and new.user_id = old.user_id and new.instrument_id = old.instrument_id
     and new.submitted_at is not distinct from old.submitted_at then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
       new.id <> old.id
    or new.user_id <> old.user_id
    or new.instrument_id <> old.instrument_id
    or new.venture_id is distinct from old.venture_id
  ) then
    raise exception 'venture_tradeoffs_identity_immutable' using errcode = '23514';
  end if;

  if new.module::text <> 'venture_alignment' or new.venture_id is null then
    raise exception 'venture_tradeoffs_venture_scope_required' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.founder_team_members member
    where member.team_id = new.venture_id and member.user_id = new.user_id
  ) then
    raise exception 'venture_tradeoffs_member_required' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.submitted_at is not null
     and new.submitted_at is distinct from old.submitted_at then
    raise exception 'venture_tradeoffs_submitted_immutable' using errcode = '23514';
  end if;

  if new.submitted_at is not null and (tg_op = 'INSERT' or old.submitted_at is null) then
    if (
      select count(distinct answer.block_id)
      from public.alignment_answers answer
      where answer.assessment_id = new.id
        and answer.block_id in ('W03', 'W04', 'W05', 'W06')
    ) <> 4 then
      raise exception 'venture_tradeoffs_incomplete' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

commit;
