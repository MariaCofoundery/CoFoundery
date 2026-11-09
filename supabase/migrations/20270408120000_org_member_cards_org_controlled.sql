-- "Wer ist wer": die Organisation entscheidet, wer von den Startups kontaktiert werden darf - und welche Startups wen sehen.
--
-- Wunsch von Maria (09.11.2026): Die Organisation traegt die Leute ein, die kontaktiert werden duerfen, ggf. auch mit der
-- Einstellung, welche Teams wen sehen. Bisher konnte nur die Person selbst den Kontakt eintragen (die Inhaberin nur Kurzzeile,
-- Text und Sichtbarkeit). Jetzt:
--   - Die Inhaberin traegt Kurzzeile, Text, KONTAKT und Sichtbarkeit fuer jede Person ein. Die Person kann ihre eigene Karte
--     weiter selbst pflegen.
--   - Je Karte laesst sich festlegen, welche Startups (Programme) sie sehen: alle (Standard) oder nur ausgewaehlte.
--     Nur die Inhaberin bestimmt das. Ein Startup, das spaeter ins Programm kommt, sieht eine eingeschraenkte Karte erst,
--     wenn die Inhaberin es aufnimmt.
--   - Bleibt wie es war: Standard ist NICHT sichtbar, und wer sich selbst zurueckgenommen hat (self_hidden), kann von
--     der Inhaberin nicht wieder gezeigt werden - nur von der Person selbst. Jede Person behaelt damit das letzte Wort
--     ueber ihre eigene Sichtbarkeit.

begin;

alter table public.advisor_org_member_cards add column audience_program_ids uuid[];
alter table public.advisor_org_member_cards
  add constraint advisor_org_member_cards_audience_size check (audience_program_ids is null or cardinality(audience_program_ids) between 1 and 200);
comment on column public.advisor_org_member_cards.audience_program_ids is
  'Welche Programme (Startups) die Karte sehen. null = alle Programme der Organisation.';

drop function public.save_org_member_card(uuid, uuid, text, text, text, boolean);

create function public.save_org_member_card(
  p_org_id uuid, p_user_id uuid, p_headline text, p_about text, p_contact text, p_shown boolean,
  p_program_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_self boolean := p_user_id = auth.uid();
  v_owner boolean;
  v_old public.advisor_org_member_cards%rowtype;
  v_headline text := nullif(btrim(coalesce(p_headline, '')), '');
  v_about text := nullif(btrim(coalesce(p_about, '')), '');
  v_audience uuid[];
begin
  if auth.uid() is null or not public.can_work_in_org(p_org_id) then
    raise exception 'org_card_not_yours' using errcode = '42501';
  end if;
  v_owner := public.is_advisor_org_owner_of(p_org_id);
  if not exists (select 1 from public.advisor_org_members m where m.org_id = p_org_id and m.user_id = p_user_id and m.status = 'active') then
    raise exception 'org_card_not_member' using errcode = '22023';
  end if;
  if not v_self and not v_owner then
    raise exception 'org_card_not_yours' using errcode = '42501';
  end if;
  if char_length(coalesce(v_headline, '')) > 120 or char_length(coalesce(v_about, '')) > 600 or char_length(coalesce(p_contact, '')) > 200 then
    raise exception 'org_card_invalid' using errcode = '22023';
  end if;

  select * into v_old from public.advisor_org_member_cards c where c.org_id = p_org_id and c.user_id = p_user_id;
  if not v_self and coalesce(p_shown, false) and coalesce(v_old.self_hidden, false) then
    raise exception 'org_card_self_hidden' using errcode = '42501';
  end if;

  -- Wer die Startups sind, die die Karte sehen: nur die Inhaberin bestimmt das. null = unveraendert, leer = alle.
  if p_program_ids is not null then
    if not v_owner then
      raise exception 'org_card_not_yours' using errcode = '42501';
    end if;
    if exists (
      select 1 from unnest(p_program_ids) as ids(id)
      where not exists (select 1 from public.team_programs tp where tp.id = ids.id and tp.org_id = p_org_id)
    ) then
      raise exception 'org_card_audience_invalid' using errcode = '22023';
    end if;
    v_audience := case when cardinality(p_program_ids) = 0 then null else (select array_agg(distinct x) from unnest(p_program_ids) as x) end;
  else
    v_audience := v_old.audience_program_ids;
  end if;

  insert into public.advisor_org_member_cards (org_id, user_id, shown, self_hidden, headline, about, contact, audience_program_ids, updated_by_user_id, updated_at)
  values (
    p_org_id, p_user_id, coalesce(p_shown, false),
    v_self and not coalesce(p_shown, false) and (coalesce(v_old.shown, false) or coalesce(v_old.self_hidden, false)),
    v_headline, v_about,
    nullif(btrim(coalesce(p_contact, '')), ''),
    v_audience, auth.uid(), pg_catalog.now()
  )
  on conflict (org_id, user_id) do update
  set shown = excluded.shown,
      self_hidden = case
        when v_self then (not excluded.shown) and (public.advisor_org_member_cards.shown or public.advisor_org_member_cards.self_hidden)
        else public.advisor_org_member_cards.self_hidden
      end,
      headline = excluded.headline,
      about = excluded.about,
      -- Den Kontakt tragen die Person selbst und die Inhaberin ein; fehlt die Angabe (null), bleibt er, wie er war.
      contact = case when p_contact is null then public.advisor_org_member_cards.contact else excluded.contact end,
      audience_program_ids = excluded.audience_program_ids,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.save_org_member_card(uuid, uuid, text, text, text, boolean, uuid[]) from public, anon;
grant execute on function public.save_org_member_card(uuid, uuid, text, text, text, boolean, uuid[]) to authenticated;

-- Fuer die Startups: nur Karten, die fuer ihr Programm gelten.
create or replace function public.get_my_program_people()
returns table (
  program_id uuid,
  org_id uuid,
  org_name text,
  user_id uuid,
  display_name text,
  role text,
  team_role text,
  headline text,
  about text,
  contact text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, o.id, o.name, m.user_id,
         coalesce(nullif(btrim(core.display_name), ''), ''),
         m.role, nullif(btrim(pr.team_role), ''), c.headline, c.about, c.contact
  from public.team_programs p
  join public.advisor_orgs o on o.id = p.org_id and o.status = 'active'
  join public.advisor_org_members m on m.org_id = p.org_id and m.status = 'active'
  join public.advisor_org_member_cards c on c.org_id = m.org_id and c.user_id = m.user_id and c.shown
    and (c.audience_program_ids is null or p.id = any (c.audience_program_ids))
  left join public.person_core core on core.user_id = m.user_id
  left join public.advisor_org_member_presence pr on pr.org_id = m.org_id and pr.user_id = m.user_id
  where auth.uid() is not null
    and p.status <> 'ended'
    and public.team_program_is_active(p.id)
    and exists (select 1 from public.founder_team_members f where f.team_id = p.team_id and f.user_id = auth.uid())
  order by o.name, (m.role = 'owner') desc, core.display_name;
$$;

notify pgrst, 'reload schema';

commit;
