begin;

-- ---------------------------------------------------------------------------
-- Der Vergleich zweier Menschen - ohne dass einer die Antworten des anderen sieht
-- ---------------------------------------------------------------------------
--
-- Die Suche sagt "ihr geht beim Abwaegen aehnlich vor". Dafuer braucht es
-- beide Antwortsaetze - und genau die darf niemand vom anderen lesen. Die
-- Freigabe von Antworten laeuft ueber `alignment_shares` und ist eine
-- ausdrueckliche Entscheidung der Person; eine Suche darf sie nicht umgehen.
--
-- Diese Funktion sieht beide Seiten und gibt JE THEMA drei Zahlen heraus:
-- wie viele Fragen vergleichbar waren, wie viele es gibt, und den mittleren
-- Abstand. Keine Antwort, keine Option, keine einzelne Frage.
--
-- WARUM DER MITTELWERT UND NICHT DIE EINZELNEN ABSTAENDE: Wer seine eigenen
-- Antworten kennt und je Frage den Abstand bekaeme, koennte die Antworten der
-- anderen Person ausrechnen. Ueber ein Thema gemittelt geht das nicht mehr -
-- ausser bei Themen mit genau einer Frage, und dort ist es unvermeidbar: Ein
-- Vergleich, der etwas aussagt, sagt immer auch etwas ueber beide.
--
-- ---------------------------------------------------------------------------
-- WAS HIER NICHT ENTSCHIEDEN WIRD
-- ---------------------------------------------------------------------------
--
-- Ob ein Abstand "passt", haengt davon ab, was die suchende Person will -
-- Aehnlichkeit oder Ergaenzung -, und wie das gewichtet wird. Diese Regeln
-- stehen in TypeScript (`discoveryMatch.ts`) und sind dort geprueft. Sie ein
-- zweites Mal in SQL zu schreiben, hiesse zwei Wahrheiten zu haben, die beim
-- naechsten Feinschliff auseinanderlaufen.

-- ---------------------------------------------------------------------------
-- Welche Frage zu welchem Thema gehoert
-- ---------------------------------------------------------------------------
--
-- Eine KOPIE der Zuordnung aus `discoveryThemes.ts`. Sie steht hier, weil die
-- Funktion sie nicht vom Aufrufer entgegennehmen darf: Wer die Gruppierung
-- bestimmen kann, fragt einfach je Frage ein eigenes "Thema" ab und bekommt
-- damit doch die einzelnen Abstaende.
--
-- Ein Test vergleicht diese Zeilen mit der Zuordnung im Code.
create table if not exists public.discovery_theme_items (
  instrument_id text not null,
  item_id text not null,
  theme_id text not null,
  -- Die Zahl der GEORDNETEN Stufen. Bei T01 sind es vier und nicht fuenf:
  -- "situationsabhaengig" ist eine Antwort neben der Reihe.
  steps smallint not null check (steps >= 2),
  outside_option_ids text[] not null default '{}',
  primary key (instrument_id, item_id)
);

insert into public.discovery_theme_items
  (instrument_id, item_id, theme_id, steps, outside_option_ids)
values
  ('founder-profile-v1','A01','decision_weighing',5,'{}'),
  ('founder-profile-v1','A02','decision_weighing',5,'{}'),
  ('founder-profile-v1','I01','experience_intuition',5,'{}'),
  ('founder-profile-v1','I02','experience_intuition',5,'{}'),
  ('founder-profile-v1','I03','experience_intuition',5,'{}'),
  ('founder-profile-v1','E01','experimentation',5,'{}'),
  ('founder-profile-v1','E02','experimentation',5,'{}'),
  ('founder-profile-v1','E03','experimentation',5,'{}'),
  ('founder-profile-v1','T01','raising_objections',4,'{T01_o5}'),
  ('founder-profile-v1','D02','voicing_disagreement',5,'{}'),
  ('founder-profile-v1','X01','open_questions',5,'{}'),
  ('founder-profile-v1','X02','open_questions',5,'{}'),
  ('founder-profile-v1','X03','open_questions',5,'{}'),
  ('founder-profile-v1','X04','open_questions',5,'{}')
on conflict (instrument_id, item_id) do update
  set theme_id = excluded.theme_id,
      steps = excluded.steps,
      outside_option_ids = excluded.outside_option_ids;

alter table public.discovery_theme_items enable row level security;

drop policy if exists discovery_theme_items_read on public.discovery_theme_items;
create policy discovery_theme_items_read
  on public.discovery_theme_items for select to authenticated using (true);

comment on table public.discovery_theme_items is
  'Kopie der Themenzuordnung aus discoveryThemes.ts. Steht hier, damit die '
  'Gruppierung nicht vom Aufrufer bestimmt werden kann.';

-- ---------------------------------------------------------------------------
-- Die Funktion
-- ---------------------------------------------------------------------------

create or replace function public.discovery_theme_distances(p_candidate_user_id uuid)
returns table (theme_id text, comparable integer, total integer, mean_distance numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_candidate_user_id = auth.uid() then
    raise exception 'discovery_self_match' using errcode = '22023';
  end if;

  -- DIESELBE HUERDE WIE DIE LISTE. Wer in der Suche niemanden sehen darf,
  -- erfaehrt auch ueber diesen Weg nichts - sonst waere die Funktion die
  -- Hintertuer um die Sichtbarkeitsregel herum.
  if not public.is_current_user_discovery_founder() then
    raise exception 'not_a_discovery_founder' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.founder_discovery_profiles p
    where p.user_id = p_candidate_user_id and p.status = 'active'
  ) then
    raise exception 'candidate_not_discoverable' using errcode = '42501';
  end if;

  return query
  with mapping as (
    select m.item_id, m.theme_id, m.steps, m.outside_option_ids
    from public.discovery_theme_items m
    where m.instrument_id = 'founder-profile-v1'
  ),
  answers as (
    select a.block_id, a.value ->> 'optionId' as option_id, s.user_id
    from public.alignment_answers a
    join public.assessments s on s.id = a.assessment_id
    where s.instrument_id = 'founder-profile-v1'
      and s.submitted_at is not null
      and s.user_id in (auth.uid(), p_candidate_user_id)
      -- Ein Auslassungsgrund ist eine Auskunft, aber keine Stufe.
      and a.missing_code is null
  ),
  steps_taken as (
    select
      mapping.item_id, mapping.theme_id, mapping.steps,
      answers.user_id,
      case
        when answers.option_id is null then null
        when answers.option_id = any (mapping.outside_option_ids) then null
        else nullif(substring(answers.option_id from '_o([0-9]+)$'), '')::int
      end as step
    from mapping
    left join answers on answers.block_id = mapping.item_id
  ),
  pairs as (
    select
      mapping.theme_id,
      mapping.item_id,
      case
        when mine.step is null or theirs.step is null then null
        -- d = |a - b| / (k - 1). Durch k-1 geteilt, damit Skalen
        -- verschiedener Laenge vergleichbar bleiben.
        else abs(mine.step - theirs.step)::numeric / (mapping.steps - 1)
      end as distance
    from mapping
    left join steps_taken mine
      on mine.item_id = mapping.item_id and mine.user_id = auth.uid()
    left join steps_taken theirs
      on theirs.item_id = mapping.item_id and theirs.user_id = p_candidate_user_id
  )
  select
    pairs.theme_id,
    count(pairs.distance)::integer,
    count(*)::integer,
    avg(pairs.distance)
  from pairs
  group by pairs.theme_id;
end;
$$;

comment on function public.discovery_theme_distances(uuid) is
  'Je Thema: wie viele Fragen vergleichbar waren, wie viele es gibt, und der '
  'mittlere Abstand. Gibt keine einzelne Antwort heraus - die Freigabe von '
  'Antworten laeuft ueber alignment_shares und wird hier nicht umgangen.';

revoke all on function public.discovery_theme_distances(uuid) from public, anon;
grant execute on function public.discovery_theme_distances(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Die Suche der anderen Person - fuer den Server, nicht fuer den Browser
-- ---------------------------------------------------------------------------
--
-- Abschnitt 16 der Spec: "Fuer euch beide ein starker Matchpunkt." Dieser Satz
-- setzt voraus, dass die eine Seite weiss, ob die andere dasselbe Thema
-- gewichtet hat und ob ihr Wunsch erfuellt ist. Beurteilt wird das in
-- TypeScript, mit denselben Regeln wie alles andere - also muessen die
-- Praeferenzen der anderen Person dorthin gelangen.
--
-- ENTSCHIEDEN VON MARIA AM 30.09.2026: Sie duerfen den Server erreichen und
-- nicht den Browser.
--
-- ---------------------------------------------------------------------------
-- WARUM DAS NICHT MIT `grant ... to authenticated` GEHT
-- ---------------------------------------------------------------------------
--
-- Eine Funktion, die die angemeldete Person aufrufen darf, darf ihr BROWSER
-- aufrufen: Dort liegt dieselbe Sitzung und derselbe oeffentliche Schluessel.
-- "Nur der Server" heisst deshalb: nur mit dem Dienstschluessel, und der
-- verlaesst den Server nie.
--
-- Damit gibt es kein `auth.uid()` mehr - der Dienstschluessel ist niemand.
-- Wer fragt, steht deshalb als Parameter da, und die Funktion prueft dieselben
-- Regeln wie die Liste. Der Server setzt dort die angemeldete Person ein.

create or replace function public.discovery_preferences_for_match(
  p_viewer uuid,
  p_candidate uuid
)
returns table (theme_id text, direction text, importance smallint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_viewer is null or p_candidate is null or p_viewer = p_candidate then
    raise exception 'discovery_self_match' using errcode = '22023';
  end if;

  -- Dieselben Huerden wie ueberall in der Suche: Wer fragt, muss suchen
  -- duerfen, und wer gefunden wird, muss sich gezeigt haben.
  if not exists (
    select 1 from public.profiles pr
    where pr.user_id = p_viewer and 'founder' = any (coalesce(pr.roles, '{}'::text[]))
  ) then
    raise exception 'not_a_discovery_founder' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.founder_discovery_profiles p
    where p.user_id = p_candidate and p.status = 'active'
  ) then
    raise exception 'candidate_not_discoverable' using errcode = '42501';
  end if;

  return query
  select pref.theme_id, pref.direction, pref.importance
  from public.discovery_theme_preferences pref
  join public.discovery_preference_sets s on s.id = pref.preference_set_id
  where s.user_id = p_candidate
    and s.founder_profile_instrument_id = 'founder-profile-v1';
end;
$$;

comment on function public.discovery_preferences_for_match(uuid, uuid) is
  'Die Suchpraeferenzen einer Person, damit der Server beurteilen kann, ob ein '
  'Thema fuer BEIDE ein Matchpunkt ist. Nur mit dem Dienstschluessel '
  'aufrufbar - der Browser bekommt sie nie zu sehen.';

-- KEIN ZUGRIFF FUER ANGEMELDETE. Das ist der Kern dieser Funktion.
revoke all on function public.discovery_preferences_for_match(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.discovery_preferences_for_match(uuid, uuid) to service_role;

commit;
