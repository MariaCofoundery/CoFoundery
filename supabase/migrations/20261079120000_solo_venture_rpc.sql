begin;

-- ---------------------------------------------------------------------------
-- Ein Vorhaben fuer die, die noch allein sind
-- ---------------------------------------------------------------------------
--
-- GEFUNDEN AM 29.09.2026 BEIM DURCHKLICKEN. `createVentureFor` in
-- ventureResolution.ts schrieb direkt in `founder_teams` - und konnte das
-- nie. Auf `founder_teams` und `founder_team_members` gibt es ausschliesslich
-- SELECT-Policies; angelegt werden Teams von Triggern beim Annehmen einer
-- Einladung oder beim Start eines Vergleichs, und die laufen als
-- SECURITY DEFINER.
--
-- Die Folge war nicht sichtbar: Der Einschub gab `null` zurueck, die Seite
-- zeigte "Fuer welches Vorhaben?" mit einer leeren Liste, und wer allein
-- anfaengt, kam an den Venture-Bogen ueberhaupt nicht heran.
--
-- ---------------------------------------------------------------------------
-- WARUM EINE FUNKTION UND KEINE INSERT-POLICY
-- ---------------------------------------------------------------------------
--
-- Eine INSERT-Policy auf `founder_teams` waere weiter: Sie erlaubte jedes
-- Team, mit jedem Kontext, in jeder Zahl. Hier geht es um genau einen Fall -
-- eine Person, die noch niemanden hat, braucht ein Zuhause fuer ihre Angaben.
-- Die Funktion kann diesen Fall pruefen, eine Policy nicht.
--
-- Sie ist ausserdem IDEMPOTENT: Wer schon allein in einem `pre_founder`-
-- Vorhaben steht, bekommt dieses zurueck. Sonst entstuende bei jedem
-- Seitenaufruf ein weiteres, und die Antworten verteilten sich auf lauter
-- Vorhaben, die niemand gemeint hat.

create or replace function public.create_solo_venture()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_existing uuid;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  -- Dieselbe Frage, die auch ueber die Antworten entscheidet. Ein Vorhaben
  -- fuer jemanden anzulegen, der gar keine Antworten speichern darf, waere
  -- eine leere Zeile mit Folgekosten.
  if not public.has_founder_assessment_access(v_user) then
    raise exception 'not_a_founder' using errcode = '42501';
  end if;

  select team.id into v_existing
  from public.founder_teams team
  join public.founder_team_members mine
    on mine.team_id = team.id and mine.user_id = v_user
  where team.team_context = 'pre_founder'
    and not exists (
      select 1 from public.founder_team_members other
      where other.team_id = team.id and other.user_id <> v_user
    )
  order by team.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  -- `pre_founder` und nicht `existing_team`: Wer allein anfaengt, ist per
  -- Definition noch nicht in einem bestehenden Team. Der Kontext muss
  -- ausserdem stimmen, damit die Uebernahme beim Annehmen der ersten
  -- Einladung greift (Migration 20261076120000) - ein falscher Wert hier
  -- verhinderte sie stillschweigend.
  insert into public.founder_teams (team_context) values ('pre_founder')
  returning id into v_id;

  insert into public.founder_team_members (team_id, user_id) values (v_id, v_user);

  return v_id;
end;
$$;

comment on function public.create_solo_venture() is
  'Legt fuer die aufrufende Person ein Vorhaben an, wenn sie noch allein ist - '
  'und gibt ein vorhandenes zurueck, statt ein zweites anzulegen. Existiert, '
  'weil auf founder_teams keine INSERT-Policy liegt: Teams entstehen sonst '
  'ausschliesslich durch Trigger.';

revoke all on function public.create_solo_venture() from public, anon;
grant execute on function public.create_solo_venture() to authenticated;

commit;
